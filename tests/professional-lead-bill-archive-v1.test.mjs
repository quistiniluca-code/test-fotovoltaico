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

const migration=fs.readFileSync('netlify/database/migrations/20260814201500_create-lead-attachments/migration.sql','utf8');
const leads=fs.readFileSync('netlify/functions/leads.js','utf8');
const database=fs.readFileSync('netlify/functions/_shared/database.js','utf8');
const config=fs.readFileSync('netlify/functions/config.js','utf8');
const health=fs.readFileSync('netlify/functions/health.js','utf8');
const events=fs.readFileSync('netlify/functions/events.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');

const session='session-professional-archive-123';
const leadId=leadIdForSession(session);
assert.equal(leadId,leadIdForSession(session));
assert.equal(leadId.length,24);
assert.equal(BILL_ATTACHMENT_TYPE,'electricity_bill');
assert.equal(BILL_FILE_STORE,'econ-fv-bill-files-v1');
assert.equal(billAttachmentIdForLead(leadId),`bill-${leadId}`);
assert.equal(billBlobKey(leadId,'a'.repeat(64)),`lead/${leadId}/bill/${'a'.repeat(64)}`);

assert.equal(attachmentTest.MAX_FILE_BYTES,20*1024*1024);
assert.equal(attachmentTest.cleanFilename('../bolletta.pdf'),'.._bolletta.pdf');
assert.equal(attachmentTest.inferredType('bill.pdf',''),'application/pdf');
assert.equal(attachmentTest.inferredType('bill.jpg',''),'image/jpeg');
assert.equal(attachmentTest.inferredType('bill.exe',''),'');
assert.equal(attachmentTest.manifestKey(leadId),`lead/${leadId}/bill/manifest`);
assert.equal(attachmentTest.sameDescriptor({attachment_id:'a',sha256:'b',blob_key:'c'},{attachment_id:'a',sha256:'b',blob_key:'c'}),true);

for(const marker of [
  'CREATE TABLE IF NOT EXISTS econ_fv_lead_attachments',
  'REFERENCES econ_fv_leads(lead_id) ON DELETE CASCADE',
  'UNIQUE (lead_id, attachment_type)',
  'UNIQUE (blob_store, blob_key)',
  'sha256 TEXT NOT NULL',
]) assert.ok(migration.includes(marker),`Attachment migration missing ${marker}`);

for(const marker of [
  'verifiedBillAttachment',
  'bill_attachment_required',
  'bill_attachment_integrity_mismatch',
  'upsertLeadBundleToDatabase(canonicalBody, leadId, attachment)',
  'duplicate_suppressed',
  'getStore(LEAD_STORE, { consistency: "strong" })',
]) assert.ok(leads.includes(marker),`Lead archive missing ${marker}`);

for(const marker of [
  'pg_advisory_xact_lock',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'ON CONFLICT (lead_id, attachment_type) DO UPDATE',
  'attachments_table',
]) assert.ok(database.includes(marker),`Database archive missing ${marker}`);

for(const marker of [
  'bill_file_stored: true',
  'bill_attachment_endpoint: "/api/bill-attachments"',
  'netlify_blobs+netlify_database',
]) assert.ok(config.includes(marker),`Config missing ${marker}`);

for(const marker of ['lead-bill-archive-v1','attachments: status.attachments_table','bill_file_stored: true']) {
  assert.ok(health.includes(marker),`Health missing ${marker}`);
}
for(const marker of ['bill_archive_success','bill_archive_failed']) assert.ok(events.includes(marker));

for(const marker of [
  'PROFESSIONAL LEAD + BILL ARCHIVE V1',
  'billFile:null',
  'billAttachment:null',
  "archiveBillFile(state.billFile,state.cfg?.privacy_version||'')",
  'privacy_acknowledged',
  'bill_attachment:state.billAttachment||undefined',
  'state.leadSaving=true',
  "track('bill_archive_success'",
  "track('bill_archive_failed'",
]) assert.ok(html.includes(marker),`Built funnel missing ${marker}`);

assert.ok(!html.includes('state.billAttachment=await archiveBillFile(file)'), 'Bill must not be archived before privacy acknowledgement');

console.log('Professional lead + bill archive V1: PASS · privacy gate / canonical Blob / DB trace / idempotency / double-submit guard');
