import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const admin = fs.readFileSync('netlify/functions/admin-funnel.js', 'utf8');
const dashboard = fs.readFileSync('public/admin/funnel.html', 'utf8');
const eventsFunction = fs.readFileSync('netlify/functions/events.js', 'utf8');

for (const marker of [
  'BERGAMO GEO QUALIFIER V4',
  'function collectEarlyPropertyArea()',
  'Dove si trova l’immobile?',
  'Ci bastano Comune e Provincia.',
  "track('property_area_checked'",
  "track('priority_area_bergamo'",
  "await signalServiceArea({city:c,province:p})",
  "if(n===0)$('#start').onclick=async()=>",
  'bill_file_uploaded:Boolean(state.billAttachment?.attachment_id)',
  'energy_data_available:Boolean(state.bill)',
  'state.a.whatsapp_click_count=(state.a.whatsapp_click_count||0)+1',
  'a.city||state.a.property_city',
  'a.province||state.a.property_province',
]) assert.ok(html.includes(marker), `Built frontend missing V4 marker: ${marker}`);

assert.ok(!html.includes('bill_uploaded:Boolean(state.billAttachment?.attachment_id||state.billFile||state.bill)'), 'Legacy ambiguous bill_uploaded telemetry remains');

for (const marker of [
  'whatsapp_clicks: engagementRows.length',
  'whatsapp_unique_intents: whatsappSessionIds.size',
  'whatsapp_unique_in_area: whatsappInAreaSessionIds.size',
  'property_area_checks: propertyAreaChecks',
  'property_area_in_area_rate: propertyAreaInAreaRate',
  'propertyAreaChecks >= 30 && propertyAreaInAreaRate >= 40',
  'propertyAreaChecks >= 30 && propertyAreaInAreaRate >= 50',
  'service_area_performance_signal: serviceAreaPerformanceSignalStrong ? "strong_candidate"',
]) assert.ok(admin.includes(marker), `Admin funnel missing V4 marker: ${marker}`);

for (const eventName of ['property_area_checked', 'priority_area_bergamo', 'property_area_corrected']) {
  assert.ok(eventsFunction.includes(`"${eventName}"`), `Events endpoint must accept ${eventName}`);
}

assert.ok(dashboard.includes('WhatsApp Intent unici'), 'Dashboard must show unique WhatsApp intents');
assert.ok(dashboard.includes('Geo check:'), 'Dashboard must show property geo-check rate and Meta signal recommendation');

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(Boolean);
for (const source of inlineScripts) new Function(source);

console.log('Bergamo Geo Qualifier V4: PASS · early Comune/Provincia · immediate service area · clean bill and unique WhatsApp KPIs · geo telemetry allowlist');
