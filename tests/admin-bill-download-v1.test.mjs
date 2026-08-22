import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __test as adminBillTest } from '../netlify/functions/admin-bill.js';

const source = fs.readFileSync('netlify/functions/admin-bill.js', 'utf8');

for (const marker of [
  'path: "/api/admin/bill"',
  'BILL_FILE_STORE',
  'dataStore(BILL_FILE_STORE, { consistency: "strong" })',
  'lead/${leadId}/bill/manifest',
  'content-disposition',
  'cache-control',
  'x-content-type-options',
  'ECON_ADMIN_TOKEN',
  'ECON_ADMIN_AUTH_DIGEST',
]) assert.ok(source.includes(marker), `Admin bill download missing marker: ${marker}`);

assert.equal(adminBillTest.manifestKey('abc123'), 'lead/abc123/bill/manifest');
assert.equal(adminBillTest.safeFilename('fattura', 'application/pdf'), 'fattura.pdf');
assert.equal(adminBillTest.safeFilename('fattura.pdf', 'application/pdf'), 'fattura.pdf');
assert.equal(adminBillTest.safeFilename('a/b\n.pdf', 'application/pdf'), 'a_b_.pdf');
assert.equal(adminBillTest.LEAD_ID_RE.test('0123456789abcdef01234567'), true);
assert.equal(adminBillTest.LEAD_ID_RE.test('not-a-lead-id'), false);

console.log('Admin bill download V1: PASS · protected Blob retrieval + original filename/content type');
