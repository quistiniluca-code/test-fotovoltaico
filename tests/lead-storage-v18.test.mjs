import assert from 'node:assert/strict';
import { __test as leadTest } from '../netlify/functions/leads.js';
import { __test as adminTest } from '../netlify/functions/admin-leads.js';
import { sameOriginRequest } from '../netlify/functions/_shared/http.js';

const valid = {
  schema: 'econ.lead.v1',
  session_id: 'session-test-123456',
  contact: {
    first_name: 'Mario',
    last_name: 'Rossi',
    mobile: '+39 333 1234567',
    email: 'mario.rossi@example.test',
    commercial_fv_request: false,
  },
  property: { address: 'Via Test 10, 24100 Bergamo' },
  privacy: { acknowledged: true, version: 'v1.8-prelive' },
  test: { score: 82, answers: {} },
  bill_summary: { supplier: 'TEST', annual_kwh: 4200, annual_spend: 1100 },
};

assert.equal(leadTest.validateLead(valid), null);
assert.equal(leadTest.validateLead(valid, 'v1.8-prelive'), null);
assert.equal(leadTest.validateLead(valid, 'v1.9'), 'privacy_version_mismatch');
assert.equal(leadTest.validateLead({ ...valid, request_id: 'x' }), 'invalid_request_id');
assert.equal(leadTest.validateLead({ ...valid, privacy: { acknowledged: false } }), 'privacy_ack_required');
assert.equal(leadTest.validateLead({ ...valid, contact: { ...valid.contact, mobile: '123' } }), 'invalid_mobile');
assert.equal(leadTest.validateLead({ ...valid, property: { address: '' } }), 'property_address_required');
assert.equal(leadTest.MAX_LEAD_JSON_CHARS, 50000);

const id1 = leadTest.leadIdForSession(valid.session_id);
const id2 = leadTest.leadIdForSession(valid.session_id);
assert.equal(id1, id2);
assert.equal(id1.length, 24);
assert.equal(leadTest.LEAD_STORE, 'econ-fv-leads-prelive');

const record = {
  schema: 'econ.lead.record.v3',
  lead_id: id1,
  server: {
    created_at: '2026-08-11T07:00:00.000Z',
    updated_at: '2026-08-11T07:01:00.000Z',
    storage: 'netlify_blobs',
    store: 'econ-fv-leads-prelive',
  },
  lead: {
    ...valid,
    request_id: 'request-test-123456',
    data_linkage: { contact_id: 'contact-test', request_id: 'request-test-123456', document_id: 'doc-test' },
  },
};

const normalized = adminTest.normalizeRecord(`lead/${id1}`, record, {});
assert.equal(normalized.schema, 'econ.lead.record.v3');
const row = adminTest.summary(record);
assert.equal(row.lead_id, id1);
assert.equal(row.contact_id, 'contact-test');
assert.equal(row.request_id, 'request-test-123456');
assert.equal(row.document_id, 'doc-test');
assert.equal(row.first_name, 'Mario');
assert.equal(row.email, 'mario.rossi@example.test');
assert.equal(row.address, 'Via Test 10, 24100 Bergamo');
assert.equal(row.score, 82);
assert.equal(row.annual_kwh, 4200);

const csv = adminTest.toCsv([row]);
assert.match(csv, /lead_id,contact_id,request_id,document_id,created_at,updated_at/);
assert.match(csv, /mario\.rossi@example\.test/);
assert.match(csv, /4200/);

assert.equal(adminTest.secureEqual('abcdefghijklmnopqrstuvwxyz123456', 'abcdefghijklmnopqrstuvwxyz123456'), true);
assert.equal(adminTest.secureEqual('abcdefghijklmnopqrstuvwxyz123456', 'different-token-1234567890123456'), false);
const dummyDigest = adminTest.sha256Hex('test-admin-token-not-production');
assert.match(dummyDigest, /^[a-f0-9]{64}$/);
assert.match(adminTest.ADMIN_TOKEN_SHA256_FALLBACK, /^[a-f0-9]{64}$/);
assert.notEqual(dummyDigest, adminTest.ADMIN_TOKEN_SHA256_FALLBACK);

process.env.ECON_ALLOWED_ORIGINS = 'https://verifica.econ-apex.com';
assert.equal(sameOriginRequest(new Request('https://test-fotovoltaico.netlify.app/api/leads', { headers: { origin: 'https://test-fotovoltaico.netlify.app' } })), true);
assert.equal(sameOriginRequest(new Request('https://test-fotovoltaico.netlify.app/api/leads', { headers: { origin: 'https://verifica.econ-apex.com' } })), true);
assert.equal(sameOriginRequest(new Request('https://test-fotovoltaico.netlify.app/api/leads', { headers: { origin: 'https://evil.example' } })), false);
delete process.env.ECON_ALLOWED_ORIGINS;

console.log('Lead storage contract: PASS · privacy/version/payload/admin-auth/origin guards');
