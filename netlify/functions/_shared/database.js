import { getDatabase } from "@netlify/database";
import { normalizeBillProcessing } from "./bill-processing.js";

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

function leadValues(payload, leadId) {
  const answers = payload?.test?.answers ?? {};
  const bill = payload?.bill_summary ?? {};
  return {
    leadId,
    sessionId: payload.session_id,
    firstName: payload.contact.first_name,
    lastName: payload.contact.last_name,
    mobile: payload.contact.mobile,
    email: payload.contact.email,
    commercial: Boolean(payload.contact.commercial_fv_request),
    address: payload.property.address,
    score: finiteNumberOrNull(payload?.test?.score),
    profileBand: String(answers?.profile_band ?? payload?.test?.profile_band ?? "").trim() || null,
    surprise: String(answers?.surprise ?? payload?.test?.surprise ?? "").trim() || null,
    supplier: String(bill?.supplier ?? "").trim() || null,
    annualKwh: finiteNumberOrNull(bill?.annual_kwh),
    annualSpend: finiteNumberOrNull(bill?.annual_spend),
    privacyVersion: payload.privacy.version,
    attribution: jsonValue(payload?.attribution ?? {}),
    answers: jsonValue(answers),
    bill: jsonValue(bill),
    payload: jsonValue(payload),
  };
}

function attachmentProcessingValues(payload, attachment) {
  const processing = normalizeBillProcessing(attachment?.processing ?? payload?.bill_processing);
  return {
    processing,
    parseStatus: processing.parse_status,
    parserMode: processing.parser_mode,
    parserVersion: processing.parser_version,
    dataMode: processing.data_mode,
    dataConfirmed: processing.data_confirmed,
    parseErrorCode: processing.error_code,
  };
}

export async function databaseStatus() {
  const db = database();
  const [row] = await db.sql`
    SELECT
      to_regclass('public.econ_fv_leads')::text AS leads_table,
      to_regclass('public.econ_fv_events')::text AS events_table,
      to_regclass('public.econ_fv_lead_attachments')::text AS attachments_table
  `;
  return {
    ready: Boolean(row?.leads_table && row?.events_table && row?.attachments_table),
    leads_table: Boolean(row?.leads_table),
    events_table: Boolean(row?.events_table),
    attachments_table: Boolean(row?.attachments_table),
  };
}

export async function upsertLeadBundleToDatabase(payload, leadId, attachment = null) {
  const db = database();
  const client = await db.pool.connect();
  const v = leadValues(payload, leadId);
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [leadId]);
    const existingResult = await client.query("SELECT lead_id FROM econ_fv_leads WHERE lead_id = $1", [leadId]);
    const created = existingResult.rowCount === 0;

    const leadResult = await client.query(`
      INSERT INTO econ_fv_leads (
        lead_id, session_id, first_name, last_name, mobile, email,
        commercial_fv_request, property_address, score, profile_band, surprise,
        supplier, annual_kwh, annual_spend, privacy_version, source,
        attribution, answers, bill_summary, payload, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        $17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,NOW()
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
    `, [
      v.leadId, v.sessionId, v.firstName, v.lastName, v.mobile, v.email,
      v.commercial, v.address, v.score, v.profileBand, v.surprise,
      v.supplier, v.annualKwh, v.annualSpend, v.privacyVersion, "econ-fv-test",
      v.attribution, v.answers, v.bill, v.payload,
    ]);

    if (attachment) {
      const p = attachmentProcessingValues(payload, attachment);
      await client.query(`
        INSERT INTO econ_fv_lead_attachments (
          attachment_id, lead_id, attachment_type, blob_store, blob_key,
          original_filename, content_type, size_bytes, sha256, uploaded_at, linked_at,
          parse_status, parser_mode, parser_version, data_mode, data_confirmed,
          parse_error_code, processing, metadata
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),
          $11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb
        )
        ON CONFLICT (lead_id, attachment_type) DO UPDATE SET
          attachment_id = EXCLUDED.attachment_id,
          blob_store = EXCLUDED.blob_store,
          blob_key = EXCLUDED.blob_key,
          original_filename = EXCLUDED.original_filename,
          content_type = EXCLUDED.content_type,
          size_bytes = EXCLUDED.size_bytes,
          sha256 = EXCLUDED.sha256,
          uploaded_at = EXCLUDED.uploaded_at,
          linked_at = NOW(),
          parse_status = EXCLUDED.parse_status,
          parser_mode = EXCLUDED.parser_mode,
          parser_version = EXCLUDED.parser_version,
          data_mode = EXCLUDED.data_mode,
          data_confirmed = EXCLUDED.data_confirmed,
          parse_error_code = EXCLUDED.parse_error_code,
          processing = EXCLUDED.processing,
          metadata = EXCLUDED.metadata
      `, [
        attachment.attachment_id,
        leadId,
        attachment.attachment_type,
        attachment.blob_store,
        attachment.blob_key,
        attachment.original_filename,
        attachment.content_type,
        attachment.size_bytes,
        attachment.sha256,
        attachment.uploaded_at,
        p.parseStatus,
        p.parserMode,
        p.parserVersion,
        p.dataMode,
        p.dataConfirmed,
        p.parseErrorCode,
        jsonValue(p.processing),
        jsonValue({
          schema: attachment.schema || "econ.bill.attachment.v1",
          privacy_version: attachment.privacy_version || payload?.privacy?.version || null,
        }),
      ]);
    }

    await client.query("COMMIT");
    const row = leadResult.rows?.[0];
    return {
      created,
      created_at: row?.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
      attachment_linked: Boolean(attachment),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertLeadToDatabase(payload, leadId) {
  return upsertLeadBundleToDatabase(payload, leadId, null);
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

export const __test = { finiteNumberOrNull, jsonValue, leadValues, attachmentProcessingValues };
