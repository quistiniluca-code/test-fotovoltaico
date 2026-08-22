import fs from 'node:fs';

const htmlFile = 'public/index.html';
const consentFile = 'public/assets/consent-manager.js';
let html = fs.readFileSync(htmlFile, 'utf8');
let consent = fs.readFileSync(consentFile, 'utf8');
const marker = 'META FUNNEL + CRM V3 · PageView/TestStarted/WhatsAppIntent + enriched telemetry';

if (html.includes(marker)) throw new Error('Meta Funnel + CRM V3 already applied');
if (!html.includes('META SIGNAL QUALITY V2')) throw new Error('Meta Funnel + CRM V3 requires Meta Signal Quality V2');

const trackOld = "function track(event,detail={}){const clientEventId=crypto.randomUUID(),body=JSON.stringify({client_event_id:clientEventId,session_id:state.session,event,step:state.step,detail});const send=(attempt)=>fetch('/api/events',{method:'POST',headers:{'content-type':'application/json'},body,credentials:'same-origin',keepalive:true}).then(r=>{if(!r.ok&&attempt<1&&(r.status===429||r.status>=500))setTimeout(()=>send(attempt+1),300)}).catch(()=>{if(attempt<1)setTimeout(()=>send(attempt+1),300)});send(0)}";
if (!html.includes(trackOld)) throw new Error('Data Layer V3 track marker not found');
const trackNew = String.raw`/* ${marker} */
function acquisitionPlatform(){const src=String(attribution?.utm_source||'').toLowerCase(),ref=String(attribution?.referrer_host||'').toLowerCase();if(src.includes('instagram')||src==='ig'||ref.includes('instagram.'))return'instagram';if(src.includes('facebook')||src==='fb'||ref.includes('facebook.'))return'facebook';if(src.includes('meta')||attribution?.fbclid)return'meta';if(src.includes('google')||attribution?.gclid||ref.includes('google.'))return'google';if(src)return src.slice(0,40);return ref?'referral':'direct'}
function decisionHorizonLabel(){const i=Number(state.a.decision_horizon);return Number.isInteger(i)&&single[25]?.o?.[i]?.[0]?single[25].o[i][0]:null}
function telemetryContext(detail={}){return{...detail,acquisition_platform:acquisitionPlatform(),utm_source:attribution?.utm_source||null,utm_medium:attribution?.utm_medium||null,utm_campaign:attribution?.utm_campaign||null,utm_content:attribution?.utm_content||null,service_area_status:state.a.service_area_status||null,property_province:state.a.property_province||null,decision_horizon:decisionHorizonLabel(),bill_uploaded:Boolean(state.billAttachment?.attachment_id||state.billFile||state.bill),bill_parse_status:state.billProcessing?.parse_status||null,commercial_request:state.a.commercial_request===true,lead_id:state.a.lead_id||null,contact_id:state.a.contact_id||null}}
function track(event,detail={}){const clientEventId=crypto.randomUUID(),body=JSON.stringify({client_event_id:clientEventId,session_id:state.session,event,step:state.step,detail:telemetryContext(detail)});const send=(attempt)=>fetch('/api/events',{method:'POST',headers:{'content-type':'application/json'},body,credentials:'same-origin',keepalive:true}).then(r=>{if(!r.ok&&attempt<1&&(r.status===429||r.status>=500))setTimeout(()=>send(attempt+1),300)}).catch(()=>{if(attempt<1)setTimeout(()=>send(attempt+1),300)});send(0)}`;
html = html.replace(trackOld, trackNew);

const signalMarker = 'async function signalServiceArea(property){';
if (!html.includes(signalMarker)) throw new Error('Meta Signal V2 service-area helper not found');
const journeyHelper = String.raw`function journeyEventId(eventName,supplied){if(supplied)return String(supplied);state.a.meta_journey_ids=state.a.meta_journey_ids||{};if(!state.a.meta_journey_ids[eventName])state.a.meta_journey_ids[eventName]=crypto.randomUUID();return state.a.meta_journey_ids[eventName]}
async function signalMetaJourney(eventName,options={}){
  const marketing=window.ECONTrackingConsent?.marketingAllowed?.()===true;
  if(!marketing&&eventName!=='WhatsAppIntent')return{skipped:'marketing_consent_required'};
  const singleton=eventName!=='WhatsAppIntent';
  state.a.meta_journey_done=state.a.meta_journey_done||{};
  if(singleton&&state.a.meta_journey_done[eventName])return{skipped:'already_sent'};
  const eventId=journeyEventId(eventName,options.eventId);
  const payload={schema:'econ.meta.journey.v1',session_id:state.session,event_name:eventName,event_id:eventId,property:{address:state.a.address||null,city:state.a.property_city||null,province:state.a.property_province||null},contact:state.a.contact||null,tracking_consent:{marketing},attribution,detail:{acquisition_platform:acquisitionPlatform(),decision_horizon:decisionHorizonLabel(),service_area_status:state.a.service_area_status||null,...(options.detail||{})}};
  try{
    const r=await fetch('/api/meta/journey',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',keepalive:true});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.detail||'meta_journey_failed');
    if(singleton)state.a.meta_journey_done[eventName]=true;
    if(j.service_area_status)state.a.service_area_status=j.service_area_status;
    track('meta_journey_signal',{meta_event_name:eventName,meta_capi_status:j.meta_capi||null,meta_eligible:Boolean(j.meta_eligible),crm_engagement_persisted:Boolean(j.crm_engagement_persisted),crm_database_persisted:j.crm_database_persisted??null,match_key_count:j.meta_match_quality?.count??null});
    if(eventName==='WhatsAppIntent'&&j.crm_engagement_persisted)track('whatsapp_intent_crm_saved',{engagement_event_id:eventId,crm_database_persisted:j.crm_database_persisted??null});
    const pixelEligible=marketing&&(j.meta_eligible===true||j.meta_capi==='sent'||String(j.meta_capi||'').startsWith('eligible_'));
    if(pixelEligible)window.ECONTrackingConsent?.fireJourneyEvent?.(eventName,eventId);
    return j;
  }catch(error){
    track('meta_journey_failed',{meta_event_name:eventName,reason:error instanceof Error?error.message:'error'});
    const fallbackEligible=marketing&&(eventName==='PageView'||eventName==='TestStarted'||(eventName==='WhatsAppIntent'&&state.a.service_area_status==='IN_AREA'));
    if(fallbackEligible)window.ECONTrackingConsent?.fireJourneyEvent?.(eventName,eventId);
    return{error:true};
  }
}
function maybeSignalPageView(){if(window.ECONTrackingConsent?.marketingAllowed?.()===true)setTimeout(()=>void signalMetaJourney('PageView'),250)}
window.addEventListener('econ:marketing-ready',maybeSignalPageView);
setTimeout(maybeSignalPageView,650);
document.addEventListener('click',event=>{const link=event.target?.closest?.('#whatsappFinal');if(!link)return;state.a.whatsapp_intent=true;const eventId=crypto.randomUUID();track('whatsapp_intent',{destination:'whatsapp',service_area_status:state.a.service_area_status||null});void signalMetaJourney('WhatsAppIntent',{eventId,detail:{destination:'whatsapp',lead_present:Boolean(state.a.lead_id)}})},true);
window.addEventListener('pagehide',()=>track('session_exit',{last_step:state.step,lead_completed:Boolean(state.a.lead_id),whatsapp_intent:Boolean(state.a.whatsapp_intent)}),{once:true});
`;
html = html.replace(signalMarker, journeyHelper + '\n' + signalMarker);

const startOld = "if(n===0)$('#start').onclick=()=>go(1);";
const startNew = "if(n===0)$('#start').onclick=()=>{track('test_started');void signalMetaJourney('TestStarted');go(1)};";
if (!html.includes(startOld)) throw new Error('Start CTA handler marker not found');
html = html.replace(startOld, startNew);

const requestMarker = "if(!state.leadRequestId)state.leadRequestId=crypto.randomUUID();const payload={schema:'econ.lead.v1'";
const requestReplacement = "if(!state.leadRequestId)state.leadRequestId=crypto.randomUUID();state.a.contact={first_name:first,last_name:last,mobile,email};const payload={schema:'econ.lead.v1'";
if (!html.includes(requestMarker)) throw new Error('Lead request payload marker not found for contact journey context');
html = html.replace(requestMarker, requestReplacement);

const initialTelemetryOld = "render();track('screen_view',{screen:0});";
const initialTelemetryNew = "render();track('page_view',{screen:0});track('screen_view',{screen:0});";
if (!html.includes(initialTelemetryOld)) throw new Error('Initial telemetry marker not found');
html = html.replace(initialTelemetryOld, initialTelemetryNew);

const automaticPageView = "    fbq('track', 'PageView');\n";
if (!consent.includes(automaticPageView)) throw new Error('Default Meta PageView marker not found');
consent = consent.replace(automaticPageView, "    // PageView is fired by the deduplicated Pixel/CAPI journey bridge.\n");

const serviceAreaPixelMarker = 'function fireServiceAreaQualified(rawEventId) {';
if (!consent.includes(serviceAreaPixelMarker)) throw new Error('Meta Signal V2 service-area pixel function not found');
const journeyPixelFunction = `function fireJourneyEvent(eventName, rawEventId) {
  const name = String(eventName || '').trim();
  const eventId = String(rawEventId || '').trim();
  if (!['PageView', 'TestStarted', 'WhatsAppIntent'].includes(name) || !eventId || currentConsent?.marketing !== true || !trackingConfig?.meta_pixel_id) {
    return { meta_pixel: false, reason: 'marketing_consent_required_or_invalid_event' };
  }
  loadMeta(currentConsent);
  const provider = 'meta_pixel_journey_' + name.toLowerCase();
  if (typeof window.fbq !== 'function' || conversionAlreadySent(provider, eventId)) {
    return { meta_pixel: false, reason: 'already_sent_or_unavailable' };
  }
  if (name === 'PageView') window.fbq('track', 'PageView', {}, { eventID: eventId });
  else window.fbq('trackCustom', name, {}, { eventID: eventId });
  markConversionSent(provider, eventId);
  return { meta_pixel: true };
}

function notifyMarketingReady() {
  if (currentConsent?.marketing === true) window.dispatchEvent(new CustomEvent('econ:marketing-ready'));
}

`;
consent = consent.replace(serviceAreaPixelMarker, journeyPixelFunction + serviceAreaPixelMarker);

const persistConsentOld = "  applyConsent(consent);\n  return consent;";
const persistConsentNew = "  applyConsent(consent);\n  if (consent.marketing === true) queueMicrotask(notifyMarketingReady);\n  return consent;";
if (!consent.includes(persistConsentOld)) throw new Error('Consent persistence marker not found');
consent = consent.replace(persistConsentOld, persistConsentNew);

const exportMarker = '    fireServiceAreaQualified,';
if (!consent.includes(exportMarker)) throw new Error('Meta Signal V2 consent export marker not found');
consent = consent.replace(exportMarker, `${exportMarker}\n    fireJourneyEvent,`);

const publicApiEnd = "    openSettings: () => ui.settings.click(),\n  };";
if (!consent.includes(publicApiEnd)) throw new Error('Consent public API end marker not found');
consent = consent.replace(publicApiEnd, `${publicApiEnd}\n  notifyMarketingReady();`);

for (const required of [
  marker,
  'function acquisitionPlatform()',
  'function decisionHorizonLabel()',
  'async function signalMetaJourney(eventName,options={})',
  "fetch('/api/meta/journey'",
  "track('test_started')",
  "track('whatsapp_intent'",
  'state.a.whatsapp_intent=true',
  "track('session_exit'",
  "track('page_view',{screen:0})",
  'state.a.contact={first_name:first,last_name:last,mobile,email}',
]) {
  if (!html.includes(required)) throw new Error(`Meta Funnel V3 HTML marker missing: ${required}`);
}
for (const required of [
  'function fireJourneyEvent(eventName, rawEventId)',
  "window.fbq('track', 'PageView', {}, { eventID: eventId })",
  "window.fbq('trackCustom', name, {}, { eventID: eventId })",
  "new CustomEvent('econ:marketing-ready')",
  'fireJourneyEvent,',
  'notifyMarketingReady();',
]) {
  if (!consent.includes(required)) throw new Error(`Meta Funnel V3 consent marker missing: ${required}`);
}
if (consent.includes("fbq('track', 'PageView');")) throw new Error('Undeduplicated automatic Meta PageView still present');

fs.writeFileSync(htmlFile, html);
fs.writeFileSync(consentFile, consent);
console.log('Meta Funnel + CRM V3: PASS · PageView/TestStarted/WhatsAppIntent Pixel+CAPI · enriched first-party telemetry');
