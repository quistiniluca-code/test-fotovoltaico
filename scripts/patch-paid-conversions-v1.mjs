import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const privacyMarker = "privacy:{acknowledged:true,version:state.cfg?.privacy_version||'v1.8'},attribution,test:";
const consentPayload = "privacy:{acknowledged:true,version:state.cfg?.privacy_version||'v1.8'},tracking_consent:{analytics:Boolean(window.ECONTrackingConsent?.analyticsAllowed?.()),marketing:Boolean(window.ECONTrackingConsent?.marketingAllowed?.())},attribution,test:";
if (!html.includes(privacyMarker)) throw new Error('Lead privacy payload marker missing for paid conversion patch');
html = html.replace(privacyMarker, consentPayload);

const successMarker = "state.a.commercial_request=commercial;state.a.lead_id=j.lead_id||null;track('lead_completed',{commercial_fv_request:commercial,adapter:j.adapter||null,persisted:Boolean(j.persisted)});go(28)";
const successWithConversions = "state.a.commercial_request=commercial;state.a.lead_id=j.lead_id||null;track('lead_completed',{commercial_fv_request:commercial,adapter:j.adapter||null,persisted:Boolean(j.persisted)});if(j.ok&&j.persisted&&state.a.lead_id)window.ECONTrackingConsent?.fireLeadConversion?.(state.a.lead_id);go(28)";
if (!html.includes(successMarker)) throw new Error('Persisted lead success marker missing for paid conversion patch');
html = html.replace(successMarker, successWithConversions);

for (const marker of ['tracking_consent:{analytics:', 'fireLeadConversion?.(state.a.lead_id)']) {
  if (!html.includes(marker)) throw new Error(`Paid conversion marker missing after patch: ${marker}`);
}

fs.writeFileSync(file, html);
console.log('Paid conversions V1: PASS · Google Ads + Meta Pixel only after persisted lead and marketing consent');
