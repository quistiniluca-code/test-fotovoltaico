import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const manager = fs.readFileSync('public/assets/consent-manager.js', 'utf8');
const css = fs.readFileSync('public/assets/consent-manager.css', 'utf8');
const config = fs.readFileSync('netlify/functions/config.js', 'utf8');
const netlify = fs.readFileSync('netlify.toml', 'utf8');

for (const marker of [
  '<link rel="stylesheet" href="/assets/consent-manager.css">',
  '<script type="module" src="/assets/consent-manager.js"></script>',
]) {
  if (!html.includes(marker)) throw new Error(`Consent asset missing from built HTML: ${marker}`);
}

for (const marker of [
  "ad_storage: 'denied'",
  "analytics_storage: 'denied'",
  "ad_user_data: 'denied'",
  "ad_personalization: 'denied'",
  "window.gtag('consent', 'default'",
  "window.gtag('consent', 'update'",
  'Rifiuta non necessari',
  'Personalizza',
  'Accetta tutti',
  'Scelte cookie',
  'Google Analytics',
  'Google Ads',
  'Meta Pixel',
  'SIX_MONTHS_MS',
  'trackingConfig?.configured',
]) {
  if (!manager.includes(marker)) throw new Error(`Consent manager missing marker: ${marker}`);
}

if (/checked[^>]*id="econConsent(Analytics|Marketing)"/i.test(manager)) {
  throw new Error('Optional consent categories must be denied by default');
}
if (/<script[^>]+(?:googletagmanager|facebook\.net)/i.test(html)) {
  throw new Error('Third-party tracking must not be statically embedded in HTML');
}
if (!manager.includes("script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`")) {
  throw new Error('Google tag must be dynamically loaded only after consent');
}
if (!manager.includes("script.src = 'https://connect.facebook.net/en_US/fbevents.js'")) {
  throw new Error('Meta Pixel loader missing');
}

for (const marker of [
  'ECON_GOOGLE_ANALYTICS_ID',
  'ECON_GOOGLE_ADS_ID',
  'ECON_META_PIXEL_ID',
  'consent_mode: "basic"',
  'consent_version: "2026-08-13"',
]) {
  if (!config.includes(marker)) throw new Error(`Runtime tracking config missing marker: ${marker}`);
}

for (const host of [
  'https://www.googletagmanager.com',
  'https://connect.facebook.net',
  'https://www.google-analytics.com',
  'https://www.googleadservices.com',
  'https://www.facebook.com',
]) {
  if (!netlify.includes(host)) throw new Error(`CSP missing consent-gated provider host: ${host}`);
}

if (!css.includes('.econ-consent-actions') || !css.includes('.econ-consent-settings')) {
  throw new Error('Consent UI styles incomplete');
}

console.log('Consent mode V1 regression: PASS · opt-in defaults · Google Consent Mode v2 · Meta gated');
