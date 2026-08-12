import { getDatabase } from "@netlify/database";

let databaseInstance = null;

function database() {
  if (!databaseInstance) databaseInstance = getDatabase();
  return databaseInstance;
}

function finiteNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function jsonValue(value, fallback = {}) {
  return JSON.stringify(value ?? fallback);
}

export async function databaseStatus() {
  const db = database();
  const [row] = await db.sql`
    SELECT
      to_regclass('public.econ_fv_leads')::text AS leads_table,
      to_regclass('public.econ_fv_events')::text AS events_table
  `;
  return {
    ready: Boolean(row?.leads_table && row?.events_table),
    leads_table: Boolean(row?.leads_table),
    events_table: Boolean(row?.events_table),
  };
}

export async function upsertLeadToDatabase(payload, leadId) {
  const db = database();
  const answers = payload?.test?.answers ?? {};
  const bill = payload?.bill_summary ?? {};
  const attribution = payload?.attribution ?? {};
  const score = finiteNumberOrNull(payload?.test?.score);
  const annualKwh = finiteNumberOrNull(bill?.annual_kwh);
  const annualSpend = finiteNumberOrNull(bill?.annual_spend);
  const profileBand = String(answers?.profile_band ?? payload?.test?.profile_band ?? "").trim() || null;
  const surprise = String(answers?.surprise ?? payload?.test?.surprise ?? "").trim() || null;

  const [row] = await db.sql`
    INSERT INTO econ_fv_leads (
      lead_id, session_id, first_name, last_name, mobile, email,
      commercial_fv_request, property_address, score, profile_band, surprise,
      supplier, annual_kwh, annual_spend, privacy_version, source,
      attribution, answers, bill_summary, payload, updated_at
    ) VALUES (
      ${leadId},
      ${payload.session_id},
      ${payload.contact.first_name},
      ${payload.contact.last_name},
      ${payload.contact.mobile},
      ${payload.contact.email},
      ${Boolean(payload.contact.commercial_fv_request)},
      ${payload.property.address},
      ${score},
      ${profileBand},
      ${surprise},
      ${String(bill?.supplier ?? "").trim() || null},
      ${annualKwh},
      ${annualSpend},
      ${payload.privacy.version},
      ${"econ-fv-test"},
      ${jsonValue(attribution)}::jsonb,
      ${jsonValue(answers)}::jsonb,
      ${jsonValue(bill)}::jsonb,
      ${jsonValue(payload)}::jsonb,
      NOW()
    )
    ON CONFLICT (lead_id) DO UPDATE SET
      session_id = EXCLUDED.session_id,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      mobile = EXCLUDED.mobile,
      email = EXCLUDED.email,
      commercial_fv_request = EXCLUDED.commercial_fv_request,
      property_address = EXCLUDED.property_address,
      score = EXCLUDED.score,
      profile_band = EXCLUDED.profile_band,
      surprise = EXCLUDED.surprise,
      supplier = EXCLUDED.supplier,
      annual_kwh = EXCLUDED.annual_kwh,
      annual_spend = EXCLUDED.annual_spend,
      privacy_version = EXCLUDED.privacy_version,
      attribution = EXCLUDED.attribution,
      answers = EXCLUDED.answers,
      bill_summary = EXCLUDED.bill_summary,
      payload = EXCLUDED.payload,
      updated_at = NOW()
    RETURNING created_at, updated_at
  `;

  return {
    created_at: row?.created_at ? new Date(row.created_at).toISOString() : null,
    updated_at: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export async function insertEventToDatabase(payload, eventId) {
  const db = database();
  await db.sql`
    INSERT INTO econ_fv_events (event_id, session_id, event, step, detail, occurred_at)
    VALUES (
      ${eventId},
      ${payload.session_id},
      ${payload.event},
      ${payload.step},
      ${jsonValue(payload.detail)}::jsonb,
      ${payload.timestamp}
    )
    ON CONFLICT (event_id) DO NOTHING
  `;
  return { event_id: eventId };
}

export const __test = { finiteNumberOrNull, jsonValue };
