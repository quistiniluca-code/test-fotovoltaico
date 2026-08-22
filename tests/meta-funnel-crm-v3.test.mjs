import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __test as metaTest } from '../netlify/functions/_shared/meta-capi.js';
import { commercialQualityScore, attributionPlatform } from '../netlify/functions/_shared/commercial-quality.js';
import { __test as journeyTest } from '../netlify/functions/meta-journey.js';
import { __test as engagementTest } from '../netlify/functions/_shared/engagement-store.js';
import { __test as eventTest } from '../netlify/functions/events.js';

assert.equal(metaTest.normalizedPhone('333 123 4567'), '393331234567');
assert.equal(metaTest.normalizedPhone('+39 333 123 4567'), '393331234567');
assert.equal(metaTest.normalizedPhone('0039 333 123 4567'), '393331234567');
assert.equal(metaTest.JOURNEY_EVENTS.PageView.area_gate, false);
assert.equal(metaTest.JOURNEY_EVENTS.WhatsAppIntent.area_gate, true);

const sessionId = '12345678-1234-1234-1234-123456789012';
assert.equal(journeyTest.validSignal({ schema: 'econ.meta.journey.v1', session_id: sessionId, event_name: 'PageView', event_id: 'pageview-12345678' }), null);
assert.equal(journeyTest.validSignal({ schema: 'econ.meta.journey.v1', session_id: sessionId, event_name: 'WhatsAppIntent', event_id: 'whatsapp-12345678' }), null);
assert.equal(journeyTest.validSignal({ schema: 'econ.meta.journey.v1', session_id: sessionId, event_name: 'Sale', event_id: 'sale-12345678' }), 'invalid_event_name');
assert.equal(engagementTest.safeEventId('whatsapp-12345678'), 'whatsapp-12345678');
assert.equal(engagementTest.safeEventId('bad id'), '');

for (const name of ['page_view', 'test_started', 'session_exit', 'service_area_checked', 'service_area_qualified', 'lead_quality_classified', 'qualified_lead', 'whatsapp_intent', 'whatsapp_intent_crm_saved']) {
  assert.equal(eventTest.ALLOWED_EVENTS.has(name), true, `Telemetry event should be allowed: ${name}`);
}

const inAreaLead = {
  property: { province: 'BG' },
  contact: { commercial_fv_request: true },
  test: { answers: { decision_horizon: 0 } },
  bill_attachment: { attachment_id: 'bill-1' },
};
const strong = commercialQualityScore(inAreaLead, { has_whatsapp_intent: true });
assert.equal(strong.score, 100);
assert.equal(strong.grade, 'A');
assert.equal(strong.decision_horizon, 'Entro 3 mesi');
const outArea = commercialQualityScore({ ...inAreaLead, property: { province: 'SA' } });
assert.equal(outArea.grade, 'OUT_OF_AREA');
assert.equal(outArea.eligible_service_area, false);
assert.equal(attributionPlatform({ fbclid: 'abc' }).platform, 'meta');
assert.equal(attributionPlatform({ utm_source: 'instagram', utm_medium: 'paid_social' }).platform, 'instagram');

const metaSource = fs.readFileSync('netlify/functions/_shared/meta-capi.js', 'utf8');
const journeySource = fs.readFileSync('netlify/functions/meta-journey.js', 'utf8');
const engagementSource = fs.readFileSync('netlify/functions/_shared/engagement-store.js', 'utf8');
const adminSource = fs.readFileSync('netlify/functions/admin-funnel.js', 'utf8');
const adminLeads = fs.readFileSync('netlify/functions/admin-leads.js', 'utf8');
const config = fs.readFileSync('netlify/functions/config.js', 'utf8');
const health = fs.readFileSync('netlify/functions/health.js', 'utf8');
const html = fs.readFileSync('public/index.html', 'utf8');
const consent = fs.readFileSync('public/assets/consent-manager.js', 'utf8');
const migration = fs.readFileSync('netlify/database/migrations/20260822152500_meta-funnel-crm-v3/migration.sql', 'utf8');
const dashboard = fs.readFileSync('public/admin/funnel.html', 'utf8');

for (const marker of [
  'sendMetaJourneyEvent',
  'PageView: { area_gate: false',
  'TestStarted: { area_gate: false',
  'WhatsAppIntent: { area_gate: true',
  'client_ip_address',
  'client_user_agent',
  'fbc: validBrowserId(cookies._fbc',
  'fbp: validBrowserId(cookies._fbp',
  'strong_contact_match',
  'event_semantics',
]) assert.ok(metaSource.includes(marker), `Meta CAPI V3 missing marker: ${marker}`);

for (const marker of [
  'path: "/api/meta/journey"',
  'persistEngagement',
  'eventName === "WhatsAppIntent"',
  'sendMetaJourneyEvent',
  'context?.ip || ""',
  'crm_engagement_persisted',
]) assert.ok(journeySource.includes(marker), `Meta journey endpoint missing marker: ${marker}`);

for (const marker of [
  'econ-fv-engagements-v1',
  'INSERT INTO econ_fv_engagements',
  'engagementDatabaseStatus',
  'blob_persisted: true',
]) assert.ok(engagementSource.includes(marker), `Engagement store missing marker: ${marker}`);

for (const marker of [
  'META FUNNEL + CRM V3',
  'function acquisitionPlatform()',
  'function decisionHorizonLabel()',
  "track('page_view',{screen:0})",
  "track('test_started')",
  "track('session_exit'",
  "track('whatsapp_intent'",
  "fetch('/api/meta/journey'",
  'state.a.contact={first_name:first,last_name:last,mobile,email}',
]) assert.ok(html.includes(marker), `Built frontend missing Meta Funnel V3 marker: ${marker}`);

for (const marker of [
  'function fireJourneyEvent(eventName, rawEventId)',
  "window.fbq('track', 'PageView', {}, { eventID: eventId })",
  "window.fbq('trackCustom', name, {}, { eventID: eventId })",
  "new CustomEvent('econ:marketing-ready')",
  'fireJourneyEvent,',
]) assert.ok(consent.includes(marker), `Consent bridge missing Meta Funnel V3 marker: ${marker}`);
assert.equal(consent.includes("fbq('track', 'PageView');"), false, 'Undeduplicated automatic PageView must be removed');

for (const marker of [
  'version: "econ.funnel-dashboard.v1"',
  'PageView', 'TestStarted', 'ServiceAreaQualified', 'QualifiedLead', 'WhatsAppIntent',
  'commercial_quality_score',
  'platform_breakdown',
  'service_area_breakdown',
  'dropoff_last_screen',
]) assert.ok(adminSource.includes(marker), `Admin funnel missing marker: ${marker}`);

for (const marker of [
  'commercial_quality_score',
  'commercial_quality_grade',
  'decision_horizon',
  'whatsapp_intent',
  'attribution_platform',
]) assert.ok(adminLeads.includes(marker), `Admin lead export missing marker: ${marker}`);

for (const marker of [
  'meta_funnel_version: "econ.meta-funnel.v3"',
  'commercial_quality_version: "econ.commercial-quality.v1"',
  'meta_pageview_capi_coverage: true',
  'meta_pageview_pixel_capi_dedup: true',
  'crm_whatsapp_intent_capture: true',
  'admin_funnel_endpoint: "/api/admin/funnel"',
]) assert.ok(config.includes(marker), `Config missing Meta Funnel V3 marker: ${marker}`);
for (const marker of ['meta_funnel_version: "econ.meta-funnel.v3"', 'engagements: engagementStatus.engagements_table', 'database_ready: databaseReady']) {
  assert.ok(health.includes(marker), `Health missing Meta Funnel V3 marker: ${marker}`);
}
for (const marker of ['CREATE TABLE IF NOT EXISTS econ_fv_engagements', 'engagement_id TEXT PRIMARY KEY', 'econ_fv_engagements_lead_idx']) {
  assert.ok(migration.includes(marker), `Engagement migration missing marker: ${marker}`);
}
for (const marker of ['ECON · ACQUISITION INTELLIGENCE', '/api/admin/funnel?days=', 'CSV lead', 'WhatsApp Intent recenti']) {
  assert.ok(dashboard.includes(marker), `Admin dashboard UI missing marker: ${marker}`);
}

console.log('Meta Funnel + CRM V3: PASS · PageView coverage + journey dedupe + enriched telemetry + WhatsApp CRM + commercial quality + admin dashboard');
