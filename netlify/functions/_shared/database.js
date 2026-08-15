import { createHash } from "node:crypto";
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

export function normalizePhoneKey(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0039") && digits.length > 10) digits = digits.slice(4);
  else if (digits.startsWith("39") && digits.length > 10) digits = digits.slice(2);
  return digits.slice(0, 20);
}

export function normalizeEmailKey(value) {
  const email = String(value ?? "").trim().toLowerCase();
  return email || null;
}

export function contactIdForPhone(value) {
  const key = normalizePhoneKey(value);
  if (!key) return null;
  return `contact-${createHash("sha256").update(`econ-contact-v1:${key}`).digest("hex").slice(0, 24)}`;
}

export function documentIdForAttachment(leadId, attachment) {
  const seed = `${leadId}:${attachment?.attachment_type || "document"}:${attachment?.sha256 || ""}`;
  return `doc-${createHash("sha256").update(seed).digest("hex").slice(0, 28)}`;
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
    mobileNormalized: normalizePhoneKey(payload.contact.mobile),
    email: payload.contact.email,
    emailNormalized: normalizeEmailKey(payload.contact.email),
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
    engine: processing.engine,
    engineVersion: processing.engine_version,
    dataMode: processing.data_mode,
    dataConfirmed: processing.data_confirmed,
    parseErrorCode: processing.error_code,
  };
}

async function upsertContact(client, values) {
  const contactId = contactIdForPhone(values.mobile);
  if (!contactId || !values.mobileNormalized) throw new Error("contact_identity_invalid");
  const result = await client.query(`
    INSERT INTO econ_fv_contacts (
      contact_id, mobile_normalized, email_normalized, first_name, last_name, updated_at
    ) VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (mobile_normalized) DO UPDATE SET
      email_normalized = COALESCE(EXCLUDED.email_normalized, econ_fv_contacts.email_normalized),
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = NOW()
    RETURNING contact_id
  `, [contactId, values.mobileNormalized, values.emailNormalized, values.firstName, values.lastName]);
  return result.rows?.[0]?.contact_id || contactId;
}

async function replayedRequest(client, requestId, leadId) {
  if (!requestId) return null;
  const request = await client.query(
    "SELECT lead_id FROM econ_fv_lead_requests WHERE request_id = $1 LIMIT 1",
    [requestId]
  );
  if (!request.rows?.[0]) return null;
  if (request.rows[0].lead_id !== leadId) throw new Error("request_id_conflict");
  const lead = await client.query(
    "SELECT created_at, updated_at, contact_id FROM econ_fv_leads WHERE lead_id = $1 LIMIT 1",
    [leadId]
  );
  const currentDocument = await client.query(
    "SELECT document_id FROM econ_fv_documents WHERE lead_id = $1 AND is_current = TRUE AND deleted_at IS NULL ORDER BY linked_at DESC LIMIT 1",
    [leadId]
  );
  return {
    created: false,
    request_replayed: true,
    created_at: lead.rows?.[0]?.created_at ? new Date(lead.rows[0].created_at).toISOString() : null,
    updated_at: lead.rows?.[0]?.updated_at ? new Date(lead.rows[0].updated_at).toISOString() : null,
    contact_id: lead.rows?.[0]?.contact_id || null,
    document_id: currentDocument.rows?.[0]?.document_id || null,
    attachment_linked: Boolean(currentDocument.rows?.[0]),
  };
}

async function upsertDocumentHistory(client, payload, leadId, attachment) {
  if (!attachment) return null;
  const p = attachmentProcessingValues(payload, attachment);
  const documentId = documentIdForAttachment(leadId, attachment);

  await client.query(`
    UPDATE econ_fv_documents
       SET is_current = FALSE,
           status = CASE WHEN status = 'received' THEN 'superseded' ELSE status END,
           superseded_at = COALESCE(superseded_at, NOW())
     WHERE lead_id = $1
       AND attachment_type = $2
       AND sha256 <> $3
       AND is_current = TRUE
       AND deleted_at IS NULL
  `, [leadId, attachment.attachment_type, attachment.sha256]);

  await client.query(`
    INSERT INTO econ_fv_documents (
      document_id, lead_id, attachment_type, blob_store, blob_key,
      original_filename, content_type, size_bytes, sha256, source,
      status, is_current, uploaded_at, linked_at, retention_until,
      processing, metadata, deleted_at, superseded_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,'lead_save',
      'received',TRUE,$10,NOW(),NOW() + INTERVAL '180 days',
      $11::jsonb,$12::jsonb,NULL,NULL
    )
    ON CONFLICT (lead_id, attachment_type, sha256) DO UPDATE SET
      blob_store = EXCLUDED.blob_store,
      blob_key = EXCLUDED.blob_key,
      original_filename = EXCLUDED.original_filename,
      content_type = EXCLUDED.content_type,
      size_bytes = EXCLUDED.size_bytes,
      status = 'received',
      is_current = TRUE,
      uploaded_at = EXCLUDED.uploaded_at,
      linked_at = NOW(),
      retention_until = NOW() + INTERVAL '180 days',
      processing = EXCLUDED.processing,
      metadata = EXCLUDED.metadata,
      deleted_at = NULL,
      superseded_at = NULL
  `, [
    documentId,
    leadId,
    attachment.attachment_type,
    attachment.blob_store,
    attachment.blob_key,
    attachment.original_filename,
    attachment.content_type,
    attachment.size_bytes,
    attachment.sha256,
    attachment.uploaded_at,
    jsonValue(p.processing),
    jsonValue({
      schema: attachment.schema || "econ.bill.attachment.v1",
      privacy_version: attachment.privacy_version || payload?.privacy?.version || null,
      attachment_id: attachment.attachment_id || null,
    }),
  ]);

  return { documentId, processing: p };
}

export async function databaseStatus() {
  const db = database();
  const [row] = await db.sql`
    SELECT
      to_regclass('public.econ_fv_leads')::text AS leads_table,
      to_regclass('public.econ_fv_events')::text AS events_table,
      to_regclass('public.econ_fv_lead_attachments')::text AS attachments_table,
      to_regclass('public.econ_fv_contacts')::text AS contacts_table,
      to_regclass('public.econ_fv_lead_requests')::text AS requests_table,
      to_regclass('public.econ_fv_documents')::text AS documents_table
  `;
  return {
    ready: Boolean(row?.leads_table && row?.events_table && row?.attachments_table && row?.contacts_table && row?.requests_table && row?.documents_table),
    leads_table: Boolean(row?.leads_table),
    events_table: Boolean(row?.events_table),
    attachments_table: Boolean(row?.attachments_table),
    contacts_table: Boolean(row?.contacts_table),
    requests_table: Boolean(row?.requests_table),
    documents_table: Boolean(row?.documents_table),
  };
}

export async function upsertLeadBundleToDatabase(payload, leadId, attachment = null, requestId = "") {
  const db = database();
  const client = await db.pool.connect();
  const v = leadValues(payload, leadId);
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [leadId]);

    const replay = await replayedRequest(client, requestId, leadId);
    if (replay) {
      await client.query("COMMIT");
      return replay;
    }

    const contactId = await upsertContact(client, v);
    const existingResult = await client.query("SELECT lead_id FROM econ_fv_leads WHERE lead_id = $1", [leadId]);
    const created = existingResult.rowCount === 0;

    const leadResult = await client.query(`
      INSERT INTO econ_fv_leads (
        lead_id, session_id, contact_id, first_name, last_name, mobile, email,
        commercial_fv_request, property_address, score, profile_band, surprise,
        supplier, annual_kwh, annual_spend, privacy_version, source,
        attribution, answers, bill_summary, payload, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        $18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,NOW()
      )
      ON CONFLICT (lead_id) DO UPDATE SET
        session_id = EXCLUDED.session_id,
        contact_id = EXCLUDED.contact_id,
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
      v.leadId, v.sessionId, contactId, v.firstName, v.lastName, v.mobile, v.email,
      v.commercial, v.address, v.score, v.profileBand, v.surprise,
      v.supplier, v.annualKwh, v.annualSpend, v.privacyVersion, "econ-fv-test",
      v.attribution, v.answers, v.bill, v.payload,
    ]);

    let documentId = null;
    if (attachment) {
      const history = await upsertDocumentHistory(client, payload, leadId, attachment);
      documentId = history?.documentId || null;
      const p = history?.processing || attachmentProcessingValues(payload, attachment);
      await client.query(`
        INSERT INTO econ_fv_lead_attachments (
          attachment_id, lead_id, attachment_type, blob_store, blob_key,
          original_filename, content_type, size_bytes, sha256, uploaded_at, linked_at,
          parse_status, parser_mode, parser_version, engine, engine_version,
          data_mode, data_confirmed, parse_error_code, processing, metadata
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),
          $11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20::jsonb
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
          engine = EXCLUDED.engine,
          engine_version = EXCLUDED.engine_version,
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
        p.engine,
        p.engineVersion,
        p.dataMode,
        p.dataConfirmed,
        p.parseErrorCode,
        jsonValue(p.processing),
        jsonValue({
          schema: attachment.schema || "econ.bill.attachment.v1",
          privacy_version: attachment.privacy_version || payload?.privacy?.version || null,
          document_id: documentId,
        }),
      ]);
    }

    if (requestId) {
      await client.query(
        "INSERT INTO econ_fv_lead_requests (request_id, lead_id, created_at) VALUES ($1,$2,NOW()) ON CONFLICT (request_id) DO NOTHING",
        [requestId, leadId]
      );
    }

    await client.query("COMMIT");
    const row = leadResult.rows?.[0];
    return {
      created,
      request_replayed: false,
      created_at: row?.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
      contact_id: contactId,
      document_id: documentId,
      attachment_linked: Boolean(attachment),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertLeadToDatabase(payload, leadId, requestId = "") {
  return upsertLeadBundleToDatabase(payload, leadId, null, requestId);
}

export async function insertEventToDatabase(payload, eventId, clientEventId = null) {
  const db = database();
  await db.sql`
    INSERT INTO econ_fv_events (event_id, client_event_id, session_id, event, step, detail, occurred_at)
    VALUES (
      ${eventId},
      ${clientEventId},
      ${payload.session_id},
      ${payload.event},
      ${payload.step},
      ${jsonValue(payload.detail)}::jsonb,
      ${payload.timestamp}
    )
    ON CONFLICT DO NOTHING
  `;
  return { event_id: eventId, client_event_id: clientEventId };
}

export const __test = {
  finiteNumberOrNull,
  jsonValue,
  normalizePhoneKey,
  normalizeEmailKey,
  contactIdForPhone,
  documentIdForAttachment,
  leadValues,
  attachmentProcessingValues,
};
