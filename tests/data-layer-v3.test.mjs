import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __test as attachmentTest } from '../netlify/functions/bill-attachments.js';
import {
  normalizePhoneKey,
  normalizeEmailKey,
  contactIdForPhone,
  documentIdForAttachment,
} from '../netlify/functions/_shared/database.js';

const migration=fs.readFileSync('netlify/database/migrations/20260815150000_data-layer-v3/migration.sql','utf8');
const leads=fs.readFileSync('netlify/functions/leads.js','utf8');
const events=fs.readFileSync('netlify/functions/events.js','utf8');
const database=fs.readFileSync('netlify/functions/_shared/database.js','utf8');
const retention=fs.readFileSync('netlify/functions/document-retention.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');

assert.equal(normalizePhoneKey('+39 333 123 4567'),'3331234567');
assert.equal(normalizePhoneKey('0039 333 123 4567'),'3331234567');
assert.equal(normalizePhoneKey('3331234567'),'3331234567');
assert.equal(normalizeEmailKey('  Test@Example.COM '),'test@example.com');
assert.equal(contactIdForPhone('+39 3331234567'),contactIdForPhone('3331234567'));
assert.equal(contactIdForPhone('3331234567').startsWith('contact-'),true);
const attachment={attachment_type:'electricity_bill',sha256:'a'.repeat(64)};
assert.equal(documentIdForAttachment('lead-1',attachment),documentIdForAttachment('lead-1',attachment));
assert.notEqual(documentIdForAttachment('lead-1',attachment),documentIdForAttachment('lead-2',attachment));

assert.equal(attachmentTest.detectContentType(Buffer.from('%PDF-1.7\n')),'application/pdf');
assert.equal(attachmentTest.detectContentType(Buffer.from([0xff,0xd8,0xff,0xe0])),'image/jpeg');
assert.equal(attachmentTest.detectContentType(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])),'image/png');
assert.equal(attachmentTest.detectContentType(Buffer.from('not-a-document')),'');

for(const marker of [
  'CREATE TABLE IF NOT EXISTS econ_fv_contacts',
  'mobile_normalized TEXT NOT NULL UNIQUE',
  'CREATE TABLE IF NOT EXISTS econ_fv_lead_requests',
  'ADD COLUMN IF NOT EXISTS client_event_id TEXT',
  'CREATE TABLE IF NOT EXISTS econ_fv_documents',
  'UNIQUE (lead_id, attachment_type, sha256)',
  'retention_until TIMESTAMPTZ',
]) assert.ok(migration.includes(marker),`V3 migration missing ${marker}`);

for(const marker of [
  'safeRequestId(body.request_id)',
  'upsertLeadBundleToDatabase(canonicalBody, leadId, attachment, requestId)',
  'request_replayed',
  'contact_id: databaseStored.contact_id',
  'document_id: databaseStored.document_id',
  'econ.lead.record.v3',
]) assert.ok(leads.includes(marker),`Lead V3 missing ${marker}`);

for(const marker of [
  'econ_fv_contacts',
  'econ_fv_lead_requests',
  'econ_fv_documents',
  'pg_advisory_xact_lock',
  'ON CONFLICT (mobile_normalized) DO UPDATE',
  'status = CASE WHEN status = \'received\' THEN \'superseded\'',
  'request_id_conflict',
]) assert.ok(database.includes(marker),`Database V3 missing ${marker}`);

for(const marker of [
  'client_event_id',
  'safeRequestId(body.client_event_id)',
  'insertEventToDatabase(payload, eventId, clientEventId)',
]) assert.ok(events.includes(marker),`Event V3 missing ${marker}`);

for(const marker of [
  'econ_fv_documents',
  "status = 'deleted'",
  'econ_fv_lead_attachments',
  'schedule: "0 2 * * 0"',
]) assert.ok(retention.includes(marker),`Retention V3 missing ${marker}`);

for(const marker of [
  'DATA LAYER V3 · idempotent requests + resilient telemetry + richer attribution',
  'leadRequestId:null',
  'client_event_id:clientEventId',
  'submitLeadPayload(payload)',
  'request_id:state.leadRequestId',
  "'gclid'",
  "'fbclid'",
  'request_replayed:Boolean(j.request_replayed)',
]) assert.ok(html.includes(marker),`Built funnel V3 missing ${marker}`);

console.log('Data Layer V3: PASS · contact/case separation · request/event idempotency · document history · signature validation · retention');
