import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const manager = fs.readFileSync('public/assets/consent-manager.js', 'utf8');
const config = fs.readFileSync('netlify/functions/config.js', 'utf8');
const leads = fs.readFileSync('netlify/functions/leads.js', 'utf8');
const meta = fs.readFileSync('netlify/functions/_shared/meta-capi.js', 'utf8');

for (const marker of [
  'tracking_consent:{analytics:',
  'fireLeadConversion?.(state.a.lead_id)',
  'j.ok&&j.persisted&&state.a.lead_id',
]) {
  if (!html.includes(marker)) throw new Error(`Built lead flow missing paid conversion marker: ${marker}`);
}

for (const marker of [
  'fireLeadConversion: firePaidLeadConversion',
  "window.gtag('event', 'conversion'",
  'google_ads_conversion_label',
  'transaction_id: leadId',
  "window.fbq('track', 'Lead', {}, { eventID: leadId })",
  "currentConsent?.marketing !== true",
]) {
  if (!manager.includes(marker)) throw new Error(`Consent-gated conversion bridge missing marker: ${marker}`);
}

for (const marker of ['ECON_GOOGLE_ADS_CONVERSION_LABEL', 'google_ads_conversion_label: googleAdsConversionLabel']) {
  if (!config.includes(marker)) throw new Error(`Runtime conversion config missing marker: ${marker}`);
}

for (const marker of ['sendMetaLeadEvent', 'meta_capi: meta.status']) {
  if (!leads.includes(marker)) throw new Error(`Lead endpoint missing Meta CAPI marker: ${marker}`);
}

for (const marker of [
  'ECON_META_CAPI_ACCESS_TOKEN',
  'body?.tracking_consent?.marketing !== true',
  'event_name: "Lead"',
  'event_id: leadId',
  'action_source: "website"',
  'sha256(email)',
  'sha256(phone)',
  'ECON_META_TEST_EVENT_CODE',
]) {
  if (!meta.includes(marker)) throw new Error(`Meta CAPI helper missing marker: ${marker}`);
}

if (manager.includes('ECON_META_CAPI_ACCESS_TOKEN') || html.includes('ECON_META_CAPI_ACCESS_TOKEN')) {
  throw new Error('Meta CAPI access token must never be exposed to the browser');
}

console.log('Paid conversions V1 regression: PASS · persisted lead · consent gate · Google transaction ID · Meta Pixel/CAPI event ID');
