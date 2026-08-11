import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { env } from "./_shared/env.js";
import { json, readJson, sameOriginRequest } from "./_shared/http.js";
import { safeSessionId } from "./_shared/sanitize.js";

const LEAD_STORE = "econ-fv-leads-prelive";
const MAX_LEAD_JSON_CHARS = 50000;

function requiredString(value, min = 1, max = 240) {
  const s = String(value ?? "").trim();
  return s.length >= min && s.length <= max ? s : "";
}

function validateLead(body, expectedPrivacyVersion = "") {
  if (body?.schema !== "econ.lead.v1") return "invalid_schema";
  if (!safeSessionId(body?.session_id)) return "invalid_session_id";
  if (body?.privacy?.acknowledged !== true) return "privacy_ack_required";
  if (expectedPrivacyVersion && body?.privacy?.version !== expectedPrivacyVersion) return "privacy_version_mismatch";
  if (!requiredString(body?.contact?.first_name, 1, 80)) return "first_name_required";
  if (!requiredString(body?.contact?.last_name, 1, 80)) return "last_name_required";
  const email = requiredString(body?.contact?.email, 5, 180);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "invalid_email";
  const digits = String(body?.contact?.mobile ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 16) return "invalid_mobile";
  if (!requiredString(body?.property?.address, 5, 260)) return "property_address_required";
  return null;
}

function leadIdForSession(sessionId) {
  return createHash("sha256").update(`econ-fv-v1:${sessionId}`).digest("hex").slice(0, 24);
}

async function sendWebhook(payload, leadId) {
  const url = env("ECON_CRM_WEBHOOK_URL");
  if (!url) throw new Error("crm_webhook_not_configured");
  const token = env("ECON_CRM_WEBHOOK_TOKEN");
  let lastError = "crm_error";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": leadId,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) return;
      lastError = `crm_http_${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "crm_network_error";
    }
    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw new Error(lastError);
}

async function persistLead(payload, leadId) {
  const store = getStore(LEAD_STORE);
  const key = `lead/${leadId}`;
  const now = new Date().toISOString();

  let previous = null;
  try {
    previous = await store.get(key, { type: "json" });
  } catch {
    previous = null;
  }

  const createdAt = previous?.server?.created_at || previous?.created_at || now;
  const record = {
    schema: "econ.lead.record.v1",
    lead_id: leadId,
    server: {
      created_at: createdAt,
      updated_at: now,
      storage: "netlify_blobs",
      store: LEAD_STORE,
    },
    lead: payload,
  };

  await store.setJSON(key, record, {
    metadata: {
      created_at: createdAt,
      updated_at: now,
      commercial_request: Boolean(payload?.contact?.commercial_fv_request),
      score: Number(payload?.test?.score) || 0,
      source: "econ-fv-test",
    },
  });

  return { key, created_at: createdAt, updated_at: now };
}

export default async (request) => {
  if (request.method !== "POST") return json({ detail: "method_not_allowed" }, 405);
  if (!sameOriginRequest(request)) return json({ detail: "origin_not_allowed" }, 403);

  const privacyUrl = env("ECON_PRIVACY_URL");
  const privacyVersion = env("ECON_PRIVACY_VERSION");
  if (!privacyUrl || !/^https:\/\//i.test(privacyUrl) || !privacyVersion) {
    return json({ detail: "privacy_not_configured" }, 503);
  }

  try {
    const body = await readJson(request);
    if (JSON.stringify(body).length > MAX_LEAD_JSON_CHARS) return json({ detail: "lead_payload_too_large" }, 413);

    const problem = validateLead(body, privacyVersion);
    if (problem) return json({ detail: problem }, 400);
    const sessionId = safeSessionId(body.session_id);
    const leadId = leadIdForSession(sessionId);
    const mode = env("ECON_CRM_MODE", "blobs").toLowerCase();

    if (mode === "webhook") {
      await sendWebhook(body, leadId);
      return json({ ok: true, lead_id: leadId, adapter: "crm_webhook" }, 201);
    }

    if (mode === "blobs") {
      const stored = await persistLead(body, leadId);
      return json({
        ok: true,
        lead_id: leadId,
        adapter: "netlify_blobs",
        persisted: true,
        stored_at: stored.updated_at,
      }, 201);
    }

    return json({ detail: "crm_disabled" }, 503);
  } catch (error) {
    return json({ detail: error instanceof Error ? error.message : "lead_failed" }, 500);
  }
};

export const config = {
  path: "/api/leads",
  rateLimit: { windowLimit: 8, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = { validateLead, leadIdForSession, LEAD_STORE, MAX_LEAD_JSON_CHARS };
