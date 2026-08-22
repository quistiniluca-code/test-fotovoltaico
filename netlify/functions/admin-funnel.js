import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./_shared/env.js";
import { json } from "./_shared/http.js";
import { dataStore } from "./_shared/blob-store.js";
import { classifyLeadQuality } from "./_shared/service-area.js";
import { attributionPlatform, commercialQualityScore } from "./_shared/commercial-quality.js";
import { listEngagements } from "./_shared/engagement-store.js";

const LEAD_STORE = "econ-fv-leads-prelive";
const EVENT_STORE = "econ-fv-events-v1";
const ADMIN_TOKEN_SHA256_FALLBACK = "9485d055e7452983a9332b250fa1637bea7312ce5f0d1fbdde3e3fb9123ccde4";

function secureEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function sha256Hex(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function suppliedToken(request) {
  const auth = String(request.headers.get("authorization") || "");
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  return bearer ? bearer[1].trim() : String(request.headers.get("x-admin-token") || "").trim();
}

function authorized(request) {
  const supplied = suppliedToken(request);
  const expected = env("ECON_ADMIN_TOKEN");
  if (expected && expected.length >= 24) return secureEqual(supplied, expected);
  const digest = String(env("ECON_ADMIN_AUTH_DIGEST") || ADMIN_TOKEN_SHA256_FALLBACK).trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(digest) && Boolean(supplied) && secureEqual(sha256Hex(supplied), digest);
}

function percentage(part, total) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function csvCell(value) {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows, columns) {
  return [columns.join(","), ...rows.map(row => columns.map(key => csvCell(row[key])).join(","))].join("\n");
}

function normalizeLeadRecord(key, value, metadata) {
  if (/^econ\.lead\.record\.v[123]$/.test(String(value?.schema || "")) && value?.lead) return value;
  return {
    schema: "econ.lead.record.legacy",
    lead_id: String(key).split("/").pop() || "",
    server: {
      created_at: metadata?.metadata?.created_at || null,
      updated_at: metadata?.metadata?.updated_at || metadata?.metadata?.created_at || null,
    },
    lead: value,
  };
}

async function readLeads(cutoffMs) {
  const store = dataStore(LEAD_STORE, { consistency: "strong" });
  const { blobs } = await store.list({ prefix: "lead/" });
  const rows = [];
  for (const blob of blobs) {
    try {
      const [value, metadata] = await Promise.all([
        store.get(blob.key, { type: "json" }),
        store.getMetadata(blob.key),
      ]);
      if (!value) continue;
      const record = normalizeLeadRecord(blob.key, value, metadata);
      const time = Date.parse(record?.server?.created_at || record?.server?.updated_at || "");
      if (!Number.isFinite(time) || time >= cutoffMs) rows.push(record);
    } catch {
      // Keep dashboard available when an isolated lead record is malformed.
    }
  }
  return rows;
}

async function readEvents(cutoffMs) {
  const store = dataStore(EVENT_STORE, { consistency: "strong" });
  const { blobs } = await store.list();
  const cutoffDate = new Date(cutoffMs).toISOString().slice(0, 10);
  const selected = blobs.filter(item => String(item.key || "").slice(0, 10) >= cutoffDate).slice(-6000);
  const events = [];
  for (const item of selected) {
    try {
      const value = await store.get(item.key, { type: "json" });
      const time = Date.parse(value?.timestamp || "");
      if (value && (!Number.isFinite(time) || time >= cutoffMs)) events.push(value);
    } catch {
      // Keep the remaining telemetry available.
    }
  }
  return events;
}

function latestAreaStatus(rows = []) {
  const classified = rows
    .filter(event => event.event === "service_area_checked" && event.detail?.service_area_status)
    .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  return classified[0]?.detail?.service_area_status || null;
}

function platformFromRows(rows = []) {
  for (const event of rows) {
    const platform = String(event?.detail?.acquisition_platform || "").trim();
    if (platform) return platform;
  }
  return "direct";
}

function lastScreen(rows = []) {
  const screens = rows.filter(event => event.event === "screen_view" && Number.isInteger(event.step)).map(event => event.step);
  return screens.length ? Math.max(...screens) : null;
}

export default async (request) => {
  if (request.method !== "GET") return json({ detail: "method_not_allowed" }, 405);
  if (!authorized(request)) return json({ detail: "unauthorized" }, 401);

  try {
    const url = new URL(request.url);
    const days = Math.max(1, Math.min(180, Number(url.searchParams.get("days")) || 30));
    const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
    const format = String(url.searchParams.get("format") || "json").toLowerCase();
    const view = String(url.searchParams.get("view") || "summary").toLowerCase();

    const [events, leadRecords, allEngagements] = await Promise.all([
      readEvents(cutoffMs),
      readLeads(cutoffMs),
      listEngagements({ limit: 7500 }),
    ]);
    const engagements = allEngagements.filter(row => {
      const time = Date.parse(row?.occurred_at || "");
      return !Number.isFinite(time) || time >= cutoffMs;
    });
    const whatsapp = engagements.filter(row => row?.type === "whatsapp_intent");
    const whatsappLeadIds = new Set(whatsapp.map(row => row?.lead_id).filter(Boolean));
    const whatsappSessionIds = new Set(whatsapp.map(row => row?.session_id).filter(Boolean));

    const sessions = new Map();
    for (const event of events) {
      if (!event?.session_id) continue;
      const rows = sessions.get(event.session_id) || [];
      rows.push(event);
      sessions.set(event.session_id, rows);
    }
    for (const record of leadRecords) {
      const sessionId = record?.lead?.session_id;
      if (sessionId && !sessions.has(sessionId)) sessions.set(sessionId, []);
    }
    for (const row of whatsapp) {
      if (row?.session_id && !sessions.has(row.session_id)) sessions.set(row.session_id, []);
    }

    const leadBySession = new Map();
    const leadRows = leadRecords.map(record => {
      const lead = record?.lead || {};
      const hasWhatsappIntent = whatsappLeadIds.has(record?.lead_id) || whatsappSessionIds.has(lead?.session_id);
      const commercial = commercialQualityScore(lead, { has_whatsapp_intent: hasWhatsappIntent });
      const quality = classifyLeadQuality(lead);
      const attribution = attributionPlatform(lead?.attribution || {});
      const row = {
        lead_id: record?.lead_id || null,
        session_id: lead?.session_id || null,
        created_at: record?.server?.created_at || null,
        first_name: lead?.contact?.first_name || null,
        last_name: lead?.contact?.last_name || null,
        mobile: lead?.contact?.mobile || null,
        email: lead?.contact?.email || null,
        property_province: lead?.property?.province || quality.service_area.province_code || null,
        service_area_status: quality.service_area.status,
        service_area_region: quality.service_area.region,
        commercial_request: lead?.contact?.commercial_fv_request === true,
        qualified_lead: quality.qualified_lead_eligible,
        bill_uploaded: Boolean(lead?.bill_attachment?.attachment_id),
        decision_horizon: commercial.decision_horizon,
        technical_score: Number(lead?.test?.score) || 0,
        commercial_quality_score: commercial.score,
        commercial_quality_grade: commercial.grade,
        whatsapp_intent: hasWhatsappIntent,
        acquisition_platform: attribution.platform,
        utm_campaign: lead?.attribution?.utm_campaign || null,
        utm_content: lead?.attribution?.utm_content || null,
      };
      if (row.session_id) leadBySession.set(row.session_id, row);
      return row;
    }).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    const stageDefs = [
      ["PageView", rows => rows.some(e => e.event === "page_view" || (e.event === "screen_view" && e.step === 0))],
      ["TestStarted", rows => rows.some(e => e.event === "test_started" || (e.event === "screen_view" && Number(e.step) >= 1))],
      ["ServiceAreaQualified", (rows, sessionId) => rows.some(e => e.event === "service_area_qualified") || leadBySession.get(sessionId)?.service_area_status === "IN_AREA"],
      ["Lead", (rows, sessionId) => rows.some(e => e.event === "lead_completed") || leadBySession.has(sessionId)],
      ["QualifiedLead", (rows, sessionId) => leadBySession.get(sessionId)?.qualified_lead === true || rows.some(e => e.event === "qualified_lead")],
      ["WhatsAppIntent", (rows, sessionId) => whatsappSessionIds.has(sessionId) || Boolean(leadBySession.get(sessionId)?.whatsapp_intent)],
    ];
    const sessionCount = sessions.size;
    let previous = sessionCount;
    const funnel = stageDefs.map(([stage, predicate]) => {
      let count = 0;
      for (const [sessionId, rows] of sessions) if (predicate(rows, sessionId)) count++;
      const item = {
        stage,
        sessions: count,
        rate_from_start: percentage(count, sessionCount),
        rate_from_previous: percentage(count, previous),
      };
      previous = count || previous;
      return item;
    });

    const platformMap = new Map();
    const areaMap = new Map();
    const dropoff = {};
    for (const [sessionId, rows] of sessions) {
      const lead = leadBySession.get(sessionId);
      const platform = lead?.acquisition_platform || platformFromRows(rows);
      platformMap.set(platform, (platformMap.get(platform) || 0) + 1);
      const area = lead?.service_area_status || latestAreaStatus(rows) || "UNKNOWN";
      areaMap.set(area, (areaMap.get(area) || 0) + 1);
      const last = lastScreen(rows);
      if (last != null) dropoff[String(last)] = (dropoff[String(last)] || 0) + 1;
    }

    const qualityDistribution = {};
    for (const lead of leadRows) qualityDistribution[lead.commercial_quality_grade] = (qualityDistribution[lead.commercial_quality_grade] || 0) + 1;
    const avgQuality = leadRows.length ? Math.round(leadRows.reduce((sum, row) => sum + row.commercial_quality_score, 0) / leadRows.length * 10) / 10 : 0;

    const engagementRows = whatsapp.map(row => ({
      engagement_id: row.engagement_id,
      occurred_at: row.occurred_at,
      session_id: row.session_id,
      lead_id: row.lead_id,
      service_area_status: row.service_area_status,
      service_area_region: row.service_area_region,
      service_area_province_code: row.service_area_province_code,
      acquisition_platform: attributionPlatform(row.attribution || {}).platform,
      utm_campaign: row?.attribution?.utm_campaign || null,
      utm_content: row?.attribution?.utm_content || null,
      decision_horizon: row?.detail?.decision_horizon || null,
    }));

    if (format === "csv") {
      const rows = view === "engagements" ? engagementRows : leadRows;
      const columns = view === "engagements"
        ? ["engagement_id", "occurred_at", "session_id", "lead_id", "service_area_status", "service_area_region", "service_area_province_code", "acquisition_platform", "utm_campaign", "utm_content", "decision_horizon"]
        : ["lead_id", "session_id", "created_at", "first_name", "last_name", "mobile", "email", "property_province", "service_area_status", "service_area_region", "commercial_request", "qualified_lead", "bill_uploaded", "decision_horizon", "technical_score", "commercial_quality_score", "commercial_quality_grade", "whatsapp_intent", "acquisition_platform", "utm_campaign", "utm_content"];
      return new Response(csv(rows, columns), {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="econ-funnel-${view}-${new Date().toISOString().slice(0, 10)}.csv"`,
          "cache-control": "no-store",
        },
      });
    }

    return json({
      ok: true,
      version: "econ.funnel-dashboard.v1",
      generated_at: new Date().toISOString(),
      days,
      sessions: sessionCount,
      event_count: events.length,
      funnel,
      kpis: {
        leads: leadRows.length,
        in_area_leads: leadRows.filter(row => row.service_area_status === "IN_AREA").length,
        qualified_leads: leadRows.filter(row => row.qualified_lead).length,
        whatsapp_intents: engagementRows.length,
        whatsapp_in_area: engagementRows.filter(row => row.service_area_status === "IN_AREA").length,
        bill_upload_leads: leadRows.filter(row => row.bill_uploaded).length,
        avg_commercial_quality_score: avgQuality,
      },
      platform_breakdown: [...platformMap.entries()].map(([platform, sessions]) => ({ platform, sessions })).sort((a, b) => b.sessions - a.sessions),
      service_area_breakdown: [...areaMap.entries()].map(([status, sessions]) => ({ status, sessions })).sort((a, b) => b.sessions - a.sessions),
      quality_distribution: qualityDistribution,
      dropoff_last_screen: dropoff,
      leads: leadRows.slice(0, 250),
      engagements: engagementRows.slice(0, 250),
    });
  } catch (error) {
    return json({ detail: error instanceof Error ? error.message : "funnel_dashboard_failed" }, 500);
  }
};

export const config = {
  path: "/api/admin/funnel",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export const __test = { secureEqual, sha256Hex, authorized, percentage, csvCell, csv, latestAreaStatus, platformFromRows, lastScreen };
