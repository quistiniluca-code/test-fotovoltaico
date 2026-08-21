import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const manager = fs.readFileSync('public/assets/consent-manager.js', 'utf8');
const config = fs.readFileSync('netlify/functions/config.js', 'utf8');
const leads = fs.readFileSync('netlify/functions/leads.js', 'utf8');
const meta = fs.readFileSync('netlify/functions/_shared/meta-capi.js', 'utf8');

for (const marker of [
  'tracking_consent:{analytics:',
  'fireLeadConversion?.(state.a.lead_id,{metaLeadEligible,qualifiedLeadEligible})',
  'j.ok&&j.persisted&&j.created!==false&&state.a.lead_id',
  'duplicate_suppressed:Boolean(j.duplicate_suppressed)',
]) {
  if (!html.includes(marker)) throw new Error(`Built lead flow missing paid conversion marker: ${marker}`);
}

for (const marker of [
  'fireLeadConversion: firePaidLeadConversion',
  "window.gtag('event', 'conversion'",
  'google_ads_conversion_label',
  'transaction_id: leadId',
  "window.fbq('track', 'Lead', {}, { eventID: leadId })",
  "window.fbq('trackCustom', 'QualifiedLead', {}, { eventID: qualifiedEventId })",
  "currentConsent?.marketing !== true",
]) {
  if (!manager.includes(marker)) throw new Error(`Consent-gated conversion bridge missing marker: ${marker}`);
}

for (const marker of ['ECON_GOOGLE_ADS_CONVERSION_LABEL', 'google_ads_conversion_label: googleAdsConversionLabel']) {
  if (!config.includes(marker)) throw new Error(`Runtime conversion config missing marker: ${marker}`);
}

for (const marker of [
  'sendMetaLeadEvent',
  'meta_capi: meta.status',
  'payload.created === false',
  'skipped_existing_lead',
]) {
  if (!leads.includes(marker)) throw new Error(`Lead endpoint missing Meta CAPI dedupe marker: ${marker}`);
}

for (const marker of [
  'ECON_META_CAPI_ACCESS_TOKEN',
  'classifyLeadQuality(body)',
  'body?.tracking_consent?.marketing !== true',
  'eventName: "Lead"',
  'eventName: "QualifiedLead"',
  'eventId: leadId',
  'eventId: `${leadId}:qualified`',
  'action_source: "website"',
  'sha256(email)',
  'sha256(phone)',
  'ECON_META_TEST_EVENT_CODE',
  'skipped_out_of_area',
]) {
  if (!meta.includes(marker)) throw new Error(`Meta CAPI helper missing marker: ${marker}`);
}

if (manager.includes('ECON_META_CAPI_ACCESS_TOKEN') || html.includes('ECON_META_CAPI_ACCESS_TOKEN')) {
  throw new Error('Meta CAPI access token must never be exposed to the browser');
}

console.log('Paid conversions V1 regression: PASS · new lead only / consent gate / Google unchanged / service-area Meta Lead / QualifiedLead Pixel+CAPI dedupe');
