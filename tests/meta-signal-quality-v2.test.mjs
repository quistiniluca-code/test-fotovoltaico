import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __test as metaTest } from '../netlify/functions/_shared/meta-capi.js';
import { __test as signalEndpointTest } from '../netlify/functions/meta-service-area.js';

assert.equal(metaTest.normalizedText(' Lùca Q. '), 'lucaq');
assert.equal(metaTest.normalizedText("D'Angelo"), 'dangelo');

const request = new Request('https://test-fotovoltaico.econ-apex.com/api/leads', {
  headers: {
    cookie: '_fbp=fb.1.1234567890.browserid',
    'user-agent': 'ECON-Test-UA',
    referer: 'https://test-fotovoltaico.econ-apex.com/?fbclid=click123',
  },
});
const body = {
  contact: {
    email: 'Luca@example.com',
    mobile: '+39 333 123 4567',
    first_name: 'Lùca',
    last_name: "D'Angelo",
  },
  attribution: {
    fbclid: 'click123',
    landing_timestamp_ms: 1787390000123,
  },
};
const userData = metaTest.normalizedUserData(request, body, '0123456789abcdef01234567', '203.0.113.7');
assert.deepEqual(userData.em, [metaTest.sha256('luca@example.com')]);
assert.deepEqual(userData.ph, [metaTest.sha256('393331234567')]);
assert.deepEqual(userData.fn, [metaTest.sha256('luca')]);
assert.deepEqual(userData.ln, [metaTest.sha256('dangelo')]);
assert.deepEqual(userData.external_id, [metaTest.sha256('0123456789abcdef01234567')]);
assert.equal(userData.client_ip_address, '203.0.113.7');
assert.equal(userData.client_user_agent, 'ECON-Test-UA');
assert.equal(userData.fbp, 'fb.1.1234567890.browserid');
assert.equal(userData.fbc, 'fb.1.1787390000123.click123');

const cookieFbcRequest = new Request('https://example.test', {
  headers: { cookie: '_fbc=fb.1.111.cookieclick; _fbp=fb.1.222.browser' },
});
assert.equal(metaTest.normalizedUserData(cookieFbcRequest, body, 'abc').fbc, 'fb.1.111.cookieclick');
assert.equal(metaTest.clientIpFromRequest(new Request('https://example.test', { headers: { 'x-forwarded-for': '198.51.100.8, 10.0.0.1' } })), '198.51.100.8');
assert.equal(metaTest.fbcFromAttribution({ attribution: { fbclid: 'abc', landing_timestamp_ms: 1234 } }), 'fb.1.1234.abc');
assert.equal(metaTest.fbcFromAttribution({ attribution: { fbclid: 'bad click' } }), undefined);

assert.equal(signalEndpointTest.validSignal({ schema: 'econ.meta.service-area.v1', session_id: '12345678-1234-1234-1234-123456789012', property: { province: 'BG' } }), null);
assert.equal(signalEndpointTest.validSignal({ schema: 'wrong', session_id: '12345678-1234-1234-1234-123456789012', property: { province: 'BG' } }), 'invalid_schema');
assert.equal(signalEndpointTest.validSignal({ schema: 'econ.meta.service-area.v1', session_id: 'bad', property: { province: 'BG' } }), 'invalid_session_id');

const metaSource = fs.readFileSync('netlify/functions/_shared/meta-capi.js', 'utf8');
const endpointSource = fs.readFileSync('netlify/functions/meta-service-area.js', 'utf8');
const leadsSource = fs.readFileSync('netlify/functions/leads.js', 'utf8');
const html = fs.readFileSync('public/index.html', 'utf8');
const consent = fs.readFileSync('public/assets/consent-manager.js', 'utf8');
const config = fs.readFileSync('netlify/functions/config.js', 'utf8');
const health = fs.readFileSync('netlify/functions/health.js', 'utf8');

for (const marker of [
  'client_ip_address',
  'client_user_agent',
  'fn: firstName ? [sha256(firstName)]',
  'ln: lastName ? [sha256(lastName)]',
  'fbc: validBrowserId(cookies._fbc, "fb.1.") || fbcFromAttribution(body)',
  'eventName: "ServiceAreaQualified"',
  'sendMetaServiceAreaEvent',
]) assert.ok(metaSource.includes(marker), `Meta CAPI V2 missing marker: ${marker}`);

for (const marker of [
  'path: "/api/meta/service-area"',
  'classifyServiceArea(body.property || {})',
  'context?.ip || ""',
  'sendMetaServiceAreaEvent',
]) assert.ok(endpointSource.includes(marker), `Service-area endpoint missing marker: ${marker}`);

for (const marker of [
  'export default async (request, context)',
  'const clientIp = context?.ip || ""',
  'sendMetaLeadEvent({ request, body, leadId, clientIp })',
]) assert.ok(leadsSource.includes(marker), `Lead CAPI context IP wiring missing marker: ${marker}`);

for (const marker of [
  'META SIGNAL QUALITY V2',
  'landing_timestamp_ms:Date.now()',
  'async function signalServiceArea(property)',
  "fetch('/api/meta/service-area'",
  "track('service_area_qualified'",
  "track('service_area_out_of_area'",
  'fireServiceAreaQualified?.(j.event_id)',
]) assert.ok(html.includes(marker), `Built frontend missing Meta Signal V2 marker: ${marker}`);

for (const marker of [
  'function fireServiceAreaQualified(rawEventId)',
  "window.fbq('trackCustom', 'ServiceAreaQualified'",
  "conversionAlreadySent('meta_pixel_service_area', eventId)",
  'fireServiceAreaQualified,',
]) assert.ok(consent.includes(marker), `Consent bridge missing Meta Signal V2 marker: ${marker}`);

for (const marker of [
  'meta_signal_quality_version: "econ.meta-signal.v2"',
  'meta_service_area_event: "ServiceAreaQualified"',
  'meta_service_area_event_endpoint: "/api/meta/service-area"',
  'meta_service_area_event_mode: "diagnostic"',
  'meta_capi_enhanced_matching',
]) assert.ok(config.includes(marker), `Runtime config missing Meta Signal V2 marker: ${marker}`);

for (const marker of [
  'meta_signal_quality_version: "econ.meta-signal.v2"',
  'meta_capi_client_ip_from_netlify_context: true',
]) assert.ok(health.includes(marker), `Health endpoint missing Meta Signal V2 marker: ${marker}`);

console.log('Meta Signal Quality V2: PASS · enhanced matching · trusted IP · validated fbp/fbc + fbclid fallback · early ServiceAreaQualified Pixel/CAPI signal');
