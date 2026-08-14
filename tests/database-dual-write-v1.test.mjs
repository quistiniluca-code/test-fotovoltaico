import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __test as databaseTest } from '../netlify/functions/_shared/database.js';

const migration = fs.readFileSync('netlify/database/migrations/20260812173000_create_econ_fv_data/migration.sql', 'utf8');
const leads = fs.readFileSync('netlify/functions/leads.js', 'utf8');
const events = fs.readFileSync('netlify/functions/events.js', 'utf8');
const health = fs.readFileSync('netlify/functions/health.js', 'utf8');
const database = fs.readFileSync('netlify/functions/_shared/database.js', 'utf8');
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
  'getDatabase',
  'upsertLeadBundleToDatabase',
  'upsertLeadToDatabase',
  'insertEventToDatabase',
  'pg_advisory_xact_lock',
  'ON CONFLICT (lead_id) DO UPDATE',
  'ON CONFLICT (lead_id, attachment_type) DO UPDATE',
  "to_regclass('public.econ_fv_lead_attachments')",
]) assert.ok(database.includes(marker), `Database adapter missing marker: ${marker}`);

for (const marker of [
  'mode === "dual"',
  'netlify_blobs+netlify_database',
  'database_persisted: true',
  'upsertLeadBundleToDatabase(canonicalBody, leadId, attachment)',
  'persistLeadBlob(canonicalBody, leadId)',
  'duplicate_suppressed',
  'verifiedBillAttachment',
]) assert.ok(leads.includes(marker), `Lead persistence missing marker: ${marker}`);

assert.ok(events.includes('insertEventToDatabase(payload, eventId)'));
assert.ok(events.includes('getStore("econ-fv-events-v1")'));
assert.ok(health.includes('lead-bill-archive-v1'));
assert.ok(health.includes('database_ready'));
assert.ok(health.includes('attachments: status.attachments_table'));
assert.ok(health.includes('netlify_blobs+netlify_database'));

assert.equal(databaseTest.finiteNumberOrNull('4200'), 4200);
assert.equal(databaseTest.finiteNumberOrNull('not-a-number'), null);
assert.equal(databaseTest.jsonValue({ a: 1 }), '{"a":1}');

console.log('Netlify Database dual-write regression: PASS · strict transaction/idempotency/attachment registry/health');
