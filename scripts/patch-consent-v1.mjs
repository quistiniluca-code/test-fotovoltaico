import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
const cssMarker = '<link rel="stylesheet" href="/assets/consent-manager.css">';
const jsMarker = '<script type="module" src="/assets/consent-manager.js"></script>';

if (!html.includes(cssMarker)) {
  if (!html.includes('</head>')) throw new Error('Could not locate </head> for consent stylesheet');
  html = html.replace('</head>', `${cssMarker}\n</head>`);
}
if (!html.includes(jsMarker)) {
  if (!html.includes('</body>')) throw new Error('Could not locate </body> for consent manager');
  html = html.replace('</body>', `${jsMarker}\n</body>`);
}

if (!html.includes(cssMarker) || !html.includes(jsMarker)) {
  throw new Error('Consent manager assets not wired');
}

const privacyMarker = "privacy:{acknowledged:true,version:state.cfg?.privacy_version||'v1.8'},attribution,test:";
const consentPayload = "privacy:{acknowledged:true,version:state.cfg?.privacy_version||'v1.8'},tracking_consent:{analytics:Boolean(window.ECONTrackingConsent?.analyticsAllowed?.()),marketing:Boolean(window.ECONTrackingConsent?.marketingAllowed?.())},attribution,test:";
if (!html.includes(privacyMarker)) throw new Error('Lead privacy payload marker missing for conversion consent');
html = html.replace(privacyMarker, consentPayload);

const successMarker = "state.a.commercial_request=commercial;state.a.lead_id=j.lead_id||null;track('lead_completed',{commercial_fv_request:commercial,adapter:j.adapter||null,persisted:Boolean(j.persisted)});go(28)";
const successWithConversions = "state.a.commercial_request=commercial;state.a.lead_id=j.lead_id||null;track('lead_completed',{commercial_fv_request:commercial,adapter:j.adapter||null,persisted:Boolean(j.persisted)});if(j.ok&&j.persisted&&state.a.lead_id)window.ECONTrackingConsent?.fireLeadConversion?.(state.a.lead_id);go(28)";
if (!html.includes(successMarker)) throw new Error('Persisted lead success marker missing for paid conversions');
html = html.replace(successMarker, successWithConversions);

for (const marker of ['tracking_consent:{analytics:', 'fireLeadConversion?.(state.a.lead_id)']) {
  if (!html.includes(marker)) throw new Error(`Paid conversion marker missing after consent patch: ${marker}`);
}

fs.writeFileSync(file, html);
console.log('Consent manager V1: PASS · basic consent mode · paid Lead fires only after persisted lead + marketing opt-in');
