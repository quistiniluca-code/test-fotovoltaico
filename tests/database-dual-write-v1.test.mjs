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
]) {
  assert.ok(migration.includes(marker), `Migration missing marker: ${marker}`);
}

for (const marker of [
  'getDatabase',
  'upsertLeadToDatabase',
  'insertEventToDatabase',
  "ON CONFLICT (lead_id) DO UPDATE",
  "ON CONFLICT (event_id) DO NOTHING",
  "to_regclass('public.econ_fv_leads')",
]) {
  assert.ok(database.includes(marker), `Database adapter missing marker: ${marker}`);
}

for (const marker of [
  'mode === "dual"',
  'netlify_blobs+netlify_database',
  'database_persisted',
  'persistLead(body, leadId)',
  'persistDatabaseSafely(body, leadId)',
]) {
  assert.ok(leads.includes(marker), `Lead dual-write missing marker: ${marker}`);
}

assert.ok(events.includes('insertEventToDatabase(payload, eventId)'));
assert.ok(events.includes('getStore("econ-fv-events-v1")'));
assert.ok(health.includes('database-dual-write-v1'));
assert.ok(health.includes('database_ready'));
assert.ok(health.includes('netlify_blobs+netlify_database'));

assert.equal(databaseTest.finiteNumberOrNull('4200'), 4200);
assert.equal(databaseTest.finiteNumberOrNull('not-a-number'), null);
assert.equal(databaseTest.jsonValue({ a: 1 }), '{"a":1}');

console.log('Netlify Database dual-write regression: PASS · schema/adapter/fallback/health');
