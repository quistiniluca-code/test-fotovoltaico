import fs from 'node:fs';
import { classifyLeadQuality, classifyServiceArea, provinceCodeFromValue, serviceAreaConfigSummary } from '../netlify/functions/_shared/service-area.js';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const [value, code] of [
  ['BG','BG'], ['Bergamo','BG'], ['Provincia di Salerno','SA'], ['Monza e Brianza','MB'], ['Treviso','TV'],
]) {
  assert(provinceCodeFromValue(value) === code, `Province normalization failed for ${value}`);
}

for (const province of ['BG','BS','MI','MB','TO','CN','BO','GE','UD','TN','AO']) {
  assert(classifyServiceArea({ province }).status === 'IN_AREA', `${province} should be in service area`);
}
for (const province of ['SA','PA','PO','RM','PU','RC','TV']) {
  assert(classifyServiceArea({ province }).status === 'OUT_OF_AREA', `${province} should be outside current service area`);
}
assert(classifyServiceArea({ address: 'Via Roma 1, Credaro BG' }).status === 'IN_AREA', 'Address fallback should resolve BG');
assert(classifyServiceArea({ address: 'Via Roma 1, Monreale PA' }).status === 'OUT_OF_AREA', 'Address fallback should resolve PA');
assert(classifyServiceArea({ address: 'Via Roma 1, Comune' }).status === 'UNKNOWN', 'Unresolved province must stay UNKNOWN');
assert(classifyLeadQuality({ property: { province: 'BG' }, contact: { commercial_fv_request: true } }).qualified_lead_eligible === true, 'In-area commercial lead should qualify');
assert(classifyLeadQuality({ property: { province: 'SA' }, contact: { commercial_fv_request: true } }).qualified_lead_eligible === false, 'Out-of-area commercial lead must not qualify');

const summary = serviceAreaConfigSummary();
assert(summary.mode === 'region', 'Default service area should use region mode');
assert(summary.regions.includes('lombardia'), 'Default service area should include Lombardia');
assert(!summary.regions.includes('veneto'), 'Current approved service area should not silently include Veneto');

const html = fs.readFileSync('public/index.html', 'utf8');
const consent = fs.readFileSync('public/assets/consent-manager.js', 'utf8');
const meta = fs.readFileSync('netlify/functions/_shared/meta-capi.js', 'utf8');
const admin = fs.readFileSync('netlify/functions/admin-leads.js', 'utf8');
const config = fs.readFileSync('netlify/functions/config.js', 'utf8');

for (const marker of [
  'SERVICE AREA + META QUALITY V1',
  'property_province=provinceNormalized',
  'province:state.a.property_province||null',
  'lead_quality_classified',
  'qualified_lead',
  'lead_out_of_area',
  "metaStatus.startsWith('eligible_')",
  'fireLeadConversion?.(state.a.lead_id,{metaLeadEligible,qualifiedLeadEligible})',
]) assert(html.includes(marker), `Built frontend missing marker: ${marker}`);

for (const marker of [
  'function firePaidLeadConversion(rawLeadId, options = {})',
  'metaLeadEligible = options?.metaLeadEligible !== false',
  "window.fbq('track', 'Lead'",
  "window.fbq('trackCustom', 'QualifiedLead'",
  'meta_pixel_qualified',
  "transaction_id: leadId",
]) assert(consent.includes(marker), `Consent bridge missing marker: ${marker}`);

for (const marker of [
  'classifyLeadQuality',
  'skipped_out_of_area',
  'skipped_unknown_area',
  'eventName: "Lead"',
  'eventName: "QualifiedLead"',
  'eventId: `${leadId}:qualified`',
  'eligible_failed_network',
]) assert(meta.includes(marker), `Meta CAPI missing marker: ${marker}`);

for (const marker of [
  'classifyLeadQuality(lead)',
  'service_area_status',
  'service_area_region',
  'meta_lead_eligible',
  'qualified_lead_eligible',
]) assert(admin.includes(marker), `Admin export missing marker: ${marker}`);

for (const marker of [
  'version: "1.8-data-layer-v3"',
  'data_layer_version: "data-layer-v3"',
  'service_area_version: "econ.service-area.v1"',
  'service_area: serviceAreaConfigSummary()',
  'meta_lead_service_area_filter: true',
  'meta_qualified_lead_event: "QualifiedLead"',
]) assert(config.includes(marker), `Runtime config missing marker: ${marker}`);

console.log('Service Area + Meta Quality V1: PASS · target regions · server CAPI filter · Pixel gate · QualifiedLead · admin quality export');
