import { getDatabase } from "@netlify/database";
import { env } from "./env.js";
import { dataStore } from "./blob-store.js";

export const ENGAGEMENT_STORE = "econ-fv-engagements-v1";
export const ENGAGEMENT_SCHEMA = "econ.engagement.v1";

let databaseInstance = null;
function database() {
  if (!databaseInstance) databaseInstance = getDatabase();
  return databaseInstance;
}

function safeEventId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9._:-]{8,180}$/.test(id) ? id : "";
}

export async function persistEngagement({
  eventId,
  sessionId,
  leadId,
  type,
  serviceArea = {},
  attribution = {},
  detail = {},
  occurredAt = new Date().toISOString(),
}) {
  const normalizedEventId = safeEventId(eventId);
  if (!normalizedEventId) throw new Error("invalid_engagement_id");
  const record = {
    schema: ENGAGEMENT_SCHEMA,
    engagement_id: normalizedEventId,
    session_id: sessionId,
    lead_id: leadId || null,
    type,
    service_area_status: serviceArea?.status || "UNKNOWN",
    service_area_region: serviceArea?.region || null,
    service_area_province_code: serviceArea?.province_code || null,
    attribution: attribution || {},
    detail: detail || {},
    occurred_at: occurredAt,
    stored_at: new Date().toISOString(),
  };

  const store = dataStore(ENGAGEMENT_STORE, { consistency: "strong" });
  const key = `engagement/${normalizedEventId}`;
  await store.setJSON(key, record, {
    metadata: {
      engagement_id: normalizedEventId,
      session_id: String(sessionId || ""),
      lead_id: String(leadId || ""),
      type: String(type || ""),
      service_area_status: String(record.service_area_status || "UNKNOWN"),
      occurred_at: occurredAt,
    },
  });

  let databasePersisted = null;
  const mode = env("ECON_CRM_MODE", "blobs").toLowerCase();
  if (mode === "dual" || mode === "database") {
    try {
      const db = database();
      await db.sql`
        INSERT INTO econ_fv_engagements (
          engagement_id, session_id, lead_id, engagement_type,
          service_area_status, service_area_region, service_area_province_code,
          attribution, detail, occurred_at, updated_at
        ) VALUES (
          ${record.engagement_id}, ${record.session_id}, ${record.lead_id}, ${record.type},
          ${record.service_area_status}, ${record.service_area_region}, ${record.service_area_province_code},
          ${JSON.stringify(record.attribution)}::jsonb, ${JSON.stringify(record.detail)}::jsonb,
          ${record.occurred_at}, NOW()
        )
        ON CONFLICT (engagement_id) DO UPDATE SET
          lead_id = COALESCE(EXCLUDED.lead_id, econ_fv_engagements.lead_id),
          service_area_status = EXCLUDED.service_area_status,
          service_area_region = EXCLUDED.service_area_region,
          service_area_province_code = EXCLUDED.service_area_province_code,
          attribution = EXCLUDED.attribution,
          detail = EXCLUDED.detail,
          occurred_at = EXCLUDED.occurred_at,
          updated_at = NOW()
      `;
      databasePersisted = true;
    } catch (error) {
      databasePersisted = false;
      console.error("ECON engagement database write failed", error instanceof Error ? error.message : error);
    }
  }

  return {
    record,
    key,
    blob_persisted: true,
    database_persisted: databasePersisted,
  };
}

export async function engagementDatabaseStatus() {
  const db = database();
  const [row] = await db.sql`SELECT to_regclass('public.econ_fv_engagements')::text AS engagements_table`;
  return { ready: Boolean(row?.engagements_table), engagements_table: Boolean(row?.engagements_table) };
}

export async function listEngagements({ limit = 5000 } = {}) {
  const store = dataStore(ENGAGEMENT_STORE, { consistency: "strong" });
  const { blobs } = await store.list({ prefix: "engagement/" });
  const selected = blobs.slice(-Math.max(1, Math.min(10000, Number(limit) || 5000)));
  const rows = [];
  for (const item of selected) {
    try {
      const value = await store.get(item.key, { type: "json" });
      if (value) rows.push(value);
    } catch {
      // One malformed engagement must not hide the remaining CRM activity.
    }
  }
  rows.sort((a, b) => String(b?.occurred_at || "").localeCompare(String(a?.occurred_at || "")));
  return rows;
}

export const __test = { safeEventId };
