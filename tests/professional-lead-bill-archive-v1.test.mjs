import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __test as attachmentTest } from '../netlify/functions/bill-attachments.js';
import {
  BILL_ATTACHMENT_TYPE,
  BILL_FILE_STORE,
  billAttachmentIdForLead,
  billBlobKey,
  leadIdForSession,
} from '../netlify/functions/_shared/lead-identity.js';
import { normalizeBillProcessing } from '../netlify/functions/_shared/bill-processing.js';

const migration=fs.readFileSync('netlify/database/migrations/20260814201500_create-lead-attachments/migration.sql','utf8');
const traceMigration=fs.readFileSync('netlify/database/migrations/20260815112500_add-bill-processing-trace/migration.sql','utf8');
const leads=fs.readFileSync('netlify/functions/leads.js','utf8');
const database=fs.readFileSync('netlify/functions/_shared/database.js','utf8');
const config=fs.readFileSync('netlify/functions/config.js','utf8');
const health=fs.readFileSync('netlify/functions/health.js','utf8');
const events=fs.readFileSync('netlify/functions/events.js','utf8');
const admin=fs.readFileSync('netlify/functions/admin-leads.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');

const session='session-professional-archive-123';
const leadId=leadIdForSession(session);
assert.equal(leadId,leadIdForSession(session));
assert.equal(leadId.length,24);
assert.equal(BILL_ATTACHMENT_TYPE,'electricity_bill');
assert.equal(BILL_FILE_STORE,'econ-fv-bill-files-v1');
assert.equal(billAttachmentIdForLead(leadId),`bill-${leadId}`);
assert.equal(billBlobKey(leadId,'a'.repeat(64)),`lead/${leadId}/bill/${'a'.repeat(64)}`);

assert.equal(attachmentTest.MAX_FILE_BYTES,4*1024*1024);
assert.equal(attachmentTest.cleanFilename('../bolletta.pdf'),'.._bolletta.pdf');
assert.equal(attachmentTest.inferredType('bill.pdf',''),'application/pdf');
assert.equal(attachmentTest.inferredType('bill.jpg',''),'image/jpeg');
assert.equal(attachmentTest.inferredType('bill.exe',''),'');
assert.equal(attachmentTest.manifestKey(leadId),`lead/${leadId}/bill/manifest`);
assert.equal(attachmentTest.sameDescriptor({attachment_id:'a',sha256:'b',blob_key:'c'},{attachment_id:'a',sha256:'b',blob_key:'c'}),true);
const failedProcessing=normalizeBillProcessing({parse_status:'parse_failed',data_mode:'estimate',error_code:'ocr_engine_unavailable',data_confirmed:false});
assert.equal(failedProcessing.parse_status,'parse_failed');
assert.equal(failedProcessing.data_mode,'estimate');
assert.equal(failedProcessing.error_code,'ocr_engine_unavailable');

for(const marker of [
  'CREATE TABLE IF NOT EXISTS econ_fv_lead_attachments',
  'REFERENCES econ_fv_leads(lead_id) ON DELETE CASCADE',
  'UNIQUE (lead_id, attachment_type)',
  'UNIQUE (blob_store, blob_key)',
  'sha256 TEXT NOT NULL',
]) assert.ok(migration.includes(marker),`Attachment migration missing ${marker}`);

for(const marker of [
  'parse_status TEXT NOT NULL',
  'parser_mode TEXT',
  'parser_version TEXT',
  'data_mode TEXT',
  'data_confirmed BOOLEAN',
  'parse_error_code TEXT',
  'processing JSONB NOT NULL',
]) assert.ok(traceMigration.includes(marker),`Trace migration missing ${marker}`);

for(const marker of [
  'verifiedBillAttachment',
  'bill_attachment_required',
  'bill_attachment_integrity_mismatch',
  'upsertLeadBundleToDatabase(canonicalBody, leadId, attachment)',
  'duplicate_suppressed',
  'dataStore(LEAD_STORE, { consistency: "strong" })',
  'skipped_existing_lead',
]) assert.ok(leads.includes(marker),`Lead archive missing ${marker}`);

for(const marker of [
  'pg_advisory_xact_lock',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'ON CONFLICT (lead_id, attachment_type) DO UPDATE',
  'parse_status = EXCLUDED.parse_status',
  'processing = EXCLUDED.processing',
  'attachments_table',
]) assert.ok(database.includes(marker),`Database archive missing ${marker}`);

for(const marker of [
  'bill_file_stored: true',
  'bill_attachment_endpoint: "/api/bill-attachments"',
  'bill_archive_on_parse_failure: true',
  'bill_max_file_bytes: 4 * 1024 * 1024',
  'netlify_blobs+netlify_database',
]) assert.ok(config.includes(marker),`Config missing ${marker}`);

for(const marker of ['lead-bill-archive-v2','attachments: status.attachments_table','bill_file_stored: true','duplicate_conversion_suppression: true']) {
  assert.ok(health.includes(marker),`Health missing ${marker}`);
}
for(const marker of ['bill_archive_success','bill_archive_failed']) assert.ok(events.includes(marker));
for(const marker of ['bill_parse_status','bill_parser_version','bill_data_mode','bill_parse_error_code']) assert.ok(admin.includes(marker));

for(const marker of [
  'PROFESSIONAL LEAD + BILL ARCHIVE V2',
  'BILL_ARCHIVE_MAX_BYTES=4*1024*1024',
  'billFile:null',
  'billAttachment:null',
  'billProcessing:null',
  'archiveBillFile(state.billFile,state.cfg?.privacy_version||\'\')',
  'privacy_acknowledged',
  'bill_attachment:state.billAttachment||undefined',
  'bill_processing:state.billProcessing||undefined',
  'state.leadSaving=true',
  "track('bill_archive_success'",
  "track('bill_archive_failed'",
  'file_retained:true',
  "parse_status:'parse_failed'",
]) assert.ok(html.includes(marker),`Built funnel missing ${marker}`);

assert.ok(html.includes('if(state.billFile&&!state.billAttachment)'), 'Any selected bill must be archived even when parsing failed');
assert.ok(!html.includes("if(state.a.bill_data_mode==='bill'&&!state.billAttachment)"), 'Archival must not depend on successful bill parsing');
assert.ok(!html.includes('state.billAttachment=await archiveBillFile(file)'), 'Bill must not be archived before privacy acknowledgement');

console.log('Professional lead + bill archive V2: PASS · OCR-failure retention / canonical Blob / DB trace / idempotency / conversion dedupe');
