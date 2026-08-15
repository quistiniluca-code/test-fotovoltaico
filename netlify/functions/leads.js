import { env } from "./_shared/env.js";
import { json, readJson, sameOriginRequest } from "./_shared/http.js";
import { safeRequestId, safeSessionId } from "./_shared/sanitize.js";
import { dataStore } from "./_shared/blob-store.js";
import { normalizeBillProcessing } from "./_shared/bill-processing.js";
import { upsertLeadBundleToDatabase } from "./_shared/database.js";
import { sendMetaLeadEvent } from "./_shared/meta-capi.js";
import {
  BILL_ATTACHMENT_TYPE,
  BILL_FILE_STORE,
  billAttachmentIdForLead,
  leadIdForSession,
} from "./_shared/lead-identity.js";

const LEAD_STORE = "econ-fv-leads-prelive";
const MAX_LEAD_JSON_CHARS = 50000;

function requiredString(value, min = 1, max = 240) {
  const s = String(value ?? "").trim();
  return s.length >= min && s.length <= max ? s : "";
}

function validateLead(body, expectedPrivacyVersion = "") {
  if (body?.schema !== "econ.lead.v1") return "invalid_schema";
  if (!safeSessionId(body?.session_id)) return "invalid_session_id";
  if (body?.request_id && !safeRequestId(body.request_id)) return "invalid_request_id";
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

function actualBillMode(body) {
  return body?.test?.answers?.bill_data_mode === "bill" || body?.test?.answers?.bill_flow_mode === "upload";
}

async function verifiedBillAttachment(body, leadId) {
  const supplied = body?.bill_attachment || null;
  if (!supplied && !actualBillMode(body)) return null;
  if (!supplied) throw new Error("bill_attachment_required");

  const store = dataStore(BILL_FILE_STORE, { consistency: "strong" });
  const manifest = await store.get(`lead/${leadId}/bill/manifest`, { type: "json" });
  if (!manifest) throw new Error("bill_attachment_manifest_missing");

  const expectedId = billAttachmentIdForLead(leadId);
  const supportedSchema = manifest.schema === "econ.bill.attachment.v1" || manifest.schema === "econ.bill.attachment.v2";
  const fieldsMatch =
    supportedSchema &&
    manifest.attachment_id === expectedId &&
    manifest.lead_id === leadId &&
    manifest.attachment_type === BILL_ATTACHMENT_TYPE &&
    manifest.blob_store === BILL_FILE_STORE &&
    manifest.privacy_version === body?.privacy?.version &&
    supplied.attachment_id === manifest.attachment_id &&
    supplied.sha256 === manifest.sha256 &&
    supplied.blob_key === manifest.blob_key;
  if (!fieldsMatch) throw new Error("bill_attachment_mismatch");

  const metadata = await store.getMetadata(manifest.blob_key);
  if (!metadata) throw new Error("bill_attachment_blob_missing");
  const m = metadata.metadata || {};
  if (
    m.sha256 !== manifest.sha256 ||
    m.lead_id !== leadId ||
    m.attachment_id !== expectedId ||
    m.content_type !== manifest.content_type ||
    Number(m.size_bytes) !== Number(manifest.size_bytes)
  ) {
    throw new Error("bill_attachment_integrity_mismatch");
  }
  return { ...manifest, processing: normalizeBillProcessing(manifest.processing) };
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

async function persistLeadBlob(payload, leadId) {
  const store = dataStore(LEAD_STORE, { consistency: "strong" });
  const key = `lead/${leadId}`;
  const now = new Date().toISOString();
  let previous = null;
  try {
    previous = await store.get(key, { type: "json" });
  } catch {
    previous = null;
  }

  const createdAt = previous?.server?.created_at || previous?.created_at || now;
  const processing = normalizeBillProcessing(payload?.bill_processing);
  const record = {
    schema: "econ.lead.record.v3",
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
      contact_id: payload?.data_linkage?.contact_id || "",
      request_id: payload?.data_linkage?.request_id || payload?.request_id || "",
      document_id: payload?.data_linkage?.document_id || "",
      has_bill_attachment: Boolean(payload?.bill_attachment),
      bill_attachment_id: payload?.bill_attachment?.attachment_id || "",
      bill_parse_status: processing.parse_status,
      bill_data_mode: processing.data_mode,
    },
  });
  return { key, created_at: createdAt, updated_at: now, created: !previous };
}

async function leadResponseWithMeta(request, body, leadId, payload) {
  const meta = payload.created === false
    ? { status: "skipped_existing_lead" }
    : await sendMetaLeadEvent({ request, body, leadId });
  return json({ ...payload, meta_capi: meta.status }, payload.created === false ? 200 : 201);
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
    const requestId = safeRequestId(body.request_id) || "";
    const leadId = leadIdForSession(sessionId);
    const attachment = await verifiedBillAttachment(body, leadId);
    const processing = attachment?.processing
      ? normalizeBillProcessing(attachment.processing)
      : normalizeBillProcessing(body?.bill_processing);
    const canonicalBody = {
      ...body,
      request_id: requestId || undefined,
      bill_attachment: attachment || undefined,
      bill_processing: processing,
    };
    const mode = env("ECON_CRM_MODE", "blobs").toLowerCase();

    if (mode === "webhook") {
      await sendWebhook(canonicalBody, leadId);
      return leadResponseWithMeta(request, canonicalBody, leadId, {
        ok: true, lead_id: leadId, adapter: "crm_webhook", persisted: true, created: true,
      });
    }

    if (mode === "blobs") {
      const stored = await persistLeadBlob(canonicalBody, leadId);
      return leadResponseWithMeta(request, canonicalBody, leadId, {
        ok: true,
        lead_id: leadId,
        adapter: "netlify_blobs",
        persisted: true,
        created: stored.created,
        duplicate_suppressed: !stored.created,
        request_replayed: false,
        stored_at: stored.updated_at,
        attachment_linked: Boolean(attachment),
      });
    }

    if (mode === "dual") {
      const databaseStored = await upsertLeadBundleToDatabase(canonicalBody, leadId, attachment, requestId);
      if (databaseStored.request_replayed) {
        return leadResponseWithMeta(request, canonicalBody, leadId, {
          ok: true,
          lead_id: leadId,
          adapter: "netlify_blobs+netlify_database",
          persisted: true,
          created: false,
          duplicate_suppressed: true,
          request_replayed: true,
          blob_persisted: true,
          database_persisted: true,
          contact_id: databaseStored.contact_id,
          document_id: databaseStored.document_id,
          attachment_linked: databaseStored.attachment_linked,
          stored_at: databaseStored.updated_at,
        });
      }
      const linkedBody = {
        ...canonicalBody,
        data_linkage: {
          contact_id: databaseStored.contact_id || null,
          document_id: databaseStored.document_id || null,
          request_id: requestId || null,
        },
      };
      const blobStored = await persistLeadBlob(linkedBody, leadId);
      return leadResponseWithMeta(request, linkedBody, leadId, {
        ok: true,
        lead_id: leadId,
        adapter: "netlify_blobs+netlify_database",
        persisted: true,
        created: databaseStored.created,
        duplicate_suppressed: !databaseStored.created,
        request_replayed: false,
        blob_persisted: true,
        database_persisted: true,
        contact_id: databaseStored.contact_id,
        document_id: databaseStored.document_id,
        attachment_linked: databaseStored.attachment_linked,
        stored_at: databaseStored.updated_at || blobStored.updated_at,
      });
    }

    if (mode === "database") {
      const databaseStored = await upsertLeadBundleToDatabase(canonicalBody, leadId, attachment, requestId);
      return leadResponseWithMeta(request, canonicalBody, leadId, {
        ok: true,
        lead_id: leadId,
        adapter: "netlify_database",
        persisted: true,
        created: databaseStored.created,
        duplicate_suppressed: !databaseStored.created,
        request_replayed: Boolean(databaseStored.request_replayed),
        database_persisted: true,
        contact_id: databaseStored.contact_id,
        document_id: databaseStored.document_id,
        attachment_linked: databaseStored.attachment_linked,
        stored_at: databaseStored.updated_at,
      });
    }

    return json({ detail: "crm_disabled" }, 503);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "lead_failed";
    console.error("ECON lead persistence failed", detail);
    const clientError = detail.startsWith("bill_attachment_") || detail === "request_id_conflict";
    return json({ detail }, clientError ? 409 : 500);
  }
};

export const config = {
  path: "/api/leads",
  rateLimit: { windowLimit: 8, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = { validateLead, actualBillMode, verifiedBillAttachment, leadIdForSession, LEAD_STORE, MAX_LEAD_JSON_CHARS };
