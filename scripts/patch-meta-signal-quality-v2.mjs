import fs from 'node:fs';

const htmlFile = 'public/index.html';
const consentFile = 'public/assets/consent-manager.js';
let html = fs.readFileSync(htmlFile, 'utf8');
let consent = fs.readFileSync(consentFile, 'utf8');
const marker = 'META SIGNAL QUALITY V2 · enhanced CAPI matching + ServiceAreaQualified';

if (html.includes(marker)) throw new Error('Meta Signal Quality V2 already applied');
if (!html.includes('SERVICE AREA + META QUALITY V1')) throw new Error('Meta Signal Quality V2 requires Service Area V1');

const attributionOld = "out={landing_path:location.pathname.slice(0,300),locale:(navigator.language||'it-IT').slice(0,40)};";
const attributionNew = "out={landing_path:location.pathname.slice(0,300),locale:(navigator.language||'it-IT').slice(0,40),landing_timestamp_ms:Date.now()};";
if (!html.includes(attributionOld)) throw new Error('Data Layer V3 attribution marker not found');
html = html.replace(attributionOld, attributionNew);

const submitMarker = 'async function submitLeadPayload(payload){';
if (!html.includes(submitMarker)) throw new Error('Lead submit helper marker not found');
const signalHelper = String.raw`/* ${marker} */
async function signalServiceArea(property){
  const key=[property?.province||'',property?.city||'',property?.address||''].join('|').toLowerCase();
  if(state.a.service_area_signal_key===key)return;
  state.a.service_area_signal_key=key;
  const marketing=window.ECONTrackingConsent?.marketingAllowed?.()===true;
  const payload={
    schema:'econ.meta.service-area.v1',
    session_id:state.session,
    property:{address:property?.address||null,city:property?.city||null,province:property?.province||null},
    tracking_consent:{marketing},
    attribution,
  };
  try{
    const r=await fetch('/api/meta/service-area',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',keepalive:true});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.detail||'service_area_signal_failed');
    const status=String(j.service_area_status||'UNKNOWN');
    state.a.service_area_status=status;
    track('service_area_checked',{service_area_status:status,service_area_region:j.service_area_region||null,service_area_province_code:j.service_area_province_code||null,meta_eligible:Boolean(j.meta_eligible),meta_capi_status:j.meta_capi||null});
    if(status==='IN_AREA'){
      track('service_area_qualified',{meta_capi_status:j.meta_capi||null});
      if(j.event_id)window.ECONTrackingConsent?.fireServiceAreaQualified?.(j.event_id);
    }else if(status==='OUT_OF_AREA'){
      track('service_area_out_of_area',{service_area_region:j.service_area_region||null,service_area_province_code:j.service_area_province_code||null});
    }
  }catch(error){
    state.a.service_area_signal_key=null;
    track('service_area_signal_failed',{reason:error instanceof Error?error.message:'error'});
  }
}
`;
html = html.replace(submitMarker, signalHelper + '\n' + submitMarker);

const addressOld = "state.a.address_source=source;state.a.property_city=city;state.a.property_province=provinceNormalized;track('address_confirmed',{source,province:provinceNormalized});go(25)";
const addressNew = "state.a.address_source=source;state.a.property_city=city;state.a.property_province=provinceNormalized;track('address_confirmed',{source,province:provinceNormalized});void signalServiceArea({address:state.a.address,city,province:provinceNormalized});go(25)";
if (!html.includes(addressOld)) throw new Error('Service Area V1 address hook not found');
html = html.replace(addressOld, addressNew);

const consentBoundary = '\n\nfunction applyConsent(';
if (!consent.includes(consentBoundary)) throw new Error('Consent apply boundary not found');
const servicePixelFunction = `function fireServiceAreaQualified(rawEventId) {
  const eventId = String(rawEventId || '').trim();
  if (!eventId || currentConsent?.marketing !== true || !trackingConfig?.meta_pixel_id) {
    return { meta_pixel: false, reason: 'marketing_consent_required' };
  }
  loadMeta(currentConsent);
  if (typeof window.fbq !== 'function' || conversionAlreadySent('meta_pixel_service_area', eventId)) {
    return { meta_pixel: false, reason: 'already_sent_or_unavailable' };
  }
  window.fbq('trackCustom', 'ServiceAreaQualified', {}, { eventID: eventId });
  markConversionSent('meta_pixel_service_area', eventId);
  return { meta_pixel: true };
}`;
consent = consent.replace(consentBoundary, `\n\n${servicePixelFunction}${consentBoundary}`);

const exportMarker = 'fireLeadConversion: firePaidLeadConversion,';
if (!consent.includes(exportMarker)) throw new Error('Consent public API marker not found');
consent = consent.replace(exportMarker, `${exportMarker}\n    fireServiceAreaQualified,`);

for (const required of [
  marker,
  'landing_timestamp_ms:Date.now()',
  'async function signalServiceArea(property)',
  "fetch('/api/meta/service-area'",
  "track('service_area_qualified'",
  "track('service_area_out_of_area'",
  'fireServiceAreaQualified?.(j.event_id)',
  'void signalServiceArea({address:state.a.address,city,province:provinceNormalized})',
]) {
  if (!html.includes(required)) throw new Error(`Meta Signal V2 HTML marker missing: ${required}`);
}
for (const required of [
  'function fireServiceAreaQualified(rawEventId)',
  "window.fbq('trackCustom', 'ServiceAreaQualified'",
  "conversionAlreadySent('meta_pixel_service_area', eventId)",
  'fireServiceAreaQualified,',
]) {
  if (!consent.includes(required)) throw new Error(`Meta Signal V2 consent marker missing: ${required}`);
}

fs.writeFileSync(htmlFile, html);
fs.writeFileSync(consentFile, consent);
console.log('Meta Signal Quality V2: PASS · early server-verified service-area signal · Pixel/CAPI dedupe · attribution timestamp');
