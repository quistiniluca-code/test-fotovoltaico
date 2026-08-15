import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __test as databaseTest } from '../netlify/functions/_shared/database.js';

const migration = fs.readFileSync('netlify/database/migrations/20260812173000_create_econ_fv_data/migration.sql', 'utf8');
const traceMigration = fs.readFileSync('netlify/database/migrations/20260815112500_add-bill-processing-trace/migration.sql', 'utf8');
const v3Migration = fs.readFileSync('netlify/database/migrations/20260815150000_data-layer-v3/migration.sql', 'utf8');
const leads = fs.readFileSync('netlify/functions/leads.js', 'utf8');
const events = fs.readFileSync('netlify/functions/events.js', 'utf8');
const health = fs.readFileSync('netlify/functions/health.js', 'utf8');
const database = fs.readFileSync('netlify/functions/_shared/database.js', 'utf8');
const blobStore = fs.readFileSync('netlify/functions/_shared/blob-store.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.equal(pkg.dependencies['@netlify/database'], '1.1.0');

for (const marker of [
  'CREATE TABLE IF NOT EXISTS econ_fv_leads',
  'CREATE TABLE IF NOT EXISTS econ_fv_events',
  'payload JSONB NOT NULL',
  'answers JSONB NOT NULL',
  'bill_summary JSONB NOT NULL',
  'commercial_fv_request BOOLEAN',
  'econ_fv_events_session_idx',
]) assert.ok(migration.includes(marker), `Migration missing marker: ${marker}`);

for (const marker of [
  'parse_status TEXT NOT NULL',
  'parser_mode TEXT',
  'parser_version TEXT',
  'data_mode TEXT',
  'data_confirmed BOOLEAN',
  'parse_error_code TEXT',
  'processing JSONB NOT NULL',
]) assert.ok(traceMigration.includes(marker), `Bill trace migration missing marker: ${marker}`);

for (const marker of [
  'econ_fv_contacts',
  'econ_fv_lead_requests',
  'econ_fv_documents',
  'client_event_id',
]) assert.ok(v3Migration.includes(marker), `V3 migration missing marker: ${marker}`);

for (const marker of [
  'getDatabase',
  'upsertLeadBundleToDatabase',
  'upsertLeadToDatabase',
  'insertEventToDatabase',
  'pg_advisory_xact_lock',
  'ON CONFLICT (lead_id) DO UPDATE',
  'ON CONFLICT (lead_id, attachment_type) DO UPDATE',
  "to_regclass('public.econ_fv_lead_attachments')",
  "to_regclass('public.econ_fv_contacts')",
  "to_regclass('public.econ_fv_documents')",
  'attachmentProcessingValues',
  'parse_status',
  'processing = EXCLUDED.processing',
]) assert.ok(database.includes(marker), `Database adapter missing marker: ${marker}`);

for (const marker of [
  'mode === "dual"',
  'netlify_blobs+netlify_database',
  'database_persisted: true',
  'upsertLeadBundleToDatabase(canonicalBody, leadId, attachment, requestId)',
  'persistLeadBlob(linkedBody, leadId)',
  'duplicate_suppressed',
  'request_replayed',
  'verifiedBillAttachment',
  'skipped_existing_lead',
]) assert.ok(leads.includes(marker), `Lead persistence missing marker: ${marker}`);

assert.ok(events.includes('insertEventToDatabase(payload, eventId, clientEventId)'));
assert.ok(events.includes('dataStore("econ-fv-events-v1")'));
assert.ok(blobStore.includes('getDeployStore'));
assert.ok(blobStore.includes('deploymentContext() === "production"'));
assert.ok(health.includes('lead-bill-archive-v2'));
assert.ok(health.includes('data-layer-v3'));
assert.ok(health.includes('database_ready'));
assert.ok(health.includes('attachments: status.attachments_table'));
assert.ok(health.includes('contacts: status.contacts_table'));
assert.ok(health.includes('documents: status.documents_table'));
assert.ok(health.includes('netlify_blobs+netlify_database'));
assert.ok(health.includes('duplicate_conversion_suppression: true'));

assert.equal(databaseTest.finiteNumberOrNull('4200'), 4200);
assert.equal(databaseTest.finiteNumberOrNull('not-a-number'), null);
assert.equal(databaseTest.jsonValue({ a: 1 }), '{"a":1}');
assert.equal(databaseTest.normalizePhoneKey('+39 333 1234567'), '3331234567');

console.log('Netlify Database dual-write regression: PASS · strict transaction / processing trace / idempotency / scoped Blobs');
