import fs from 'node:fs';

const htmlFile='public/index.html';
const consentFile='public/assets/consent-manager.js';
let html=fs.readFileSync(htmlFile,'utf8');
let consent=fs.readFileSync(consentFile,'utf8');
const marker='SERVICE AREA + META QUALITY V1 · server-verified Lead + QualifiedLead';
if(html.includes(marker))throw new Error('Service Area + Meta Quality V1 already applied');
if(!html.includes('DATA LAYER V3 · idempotent requests + resilient telemetry + richer attribution'))throw new Error('Service Area + Meta Quality V1 requires Data Layer V3');

const addressOld="const provinceNormalized=province.length<=3?province.toUpperCase():province;state.a.address=`${street} ${civic}, ${city} ${provinceNormalized}`;state.a.address_source=source;track('address_confirmed',{source});go(25)";
const addressNew="const provinceNormalized=province.length<=3?province.toUpperCase():province;state.a.address=`${street} ${civic}, ${city} ${provinceNormalized}`;state.a.address_source=source;state.a.property_city=city;state.a.property_province=provinceNormalized;track('address_confirmed',{source,province:provinceNormalized});go(25)";
if(!html.includes(addressOld))throw new Error('Address confirmation marker not found');
html=html.replace(addressOld,addressNew);

const propertyOld="property:{address:state.a.address,geo:state.addressGeo},bill_attachment:";
const propertyNew="property:{address:state.a.address,geo:state.addressGeo,city:state.a.property_city||null,province:state.a.property_province||null},bill_attachment:";
if(!html.includes(propertyOld))throw new Error('Lead property payload marker not found');
html=html.replace(propertyOld,propertyNew);

const conversionOld="if(j.ok&&j.persisted&&j.created!==false&&state.a.lead_id)window.ECONTrackingConsent?.fireLeadConversion?.(state.a.lead_id);go(28)";
const conversionNew="if(j.ok&&j.persisted&&j.created!==false&&state.a.lead_id){const metaStatus=String(j.meta_capi||'');const metaLeadEligible=metaStatus==='sent'||metaStatus.startsWith('sent_')||metaStatus.startsWith('eligible_');const qualifiedLeadEligible=metaLeadEligible&&metaStatus.includes('qualified');const serviceAreaStatus=metaStatus.includes('out_of_area')?'OUT_OF_AREA':metaStatus.includes('unknown_area')?'UNKNOWN':metaLeadEligible?'IN_AREA':'UNKNOWN';state.a.service_area_status=serviceAreaStatus;state.a.meta_lead_eligible=metaLeadEligible;state.a.qualified_lead_eligible=qualifiedLeadEligible;window.ECONTrackingConsent?.fireLeadConversion?.(state.a.lead_id,{metaLeadEligible,qualifiedLeadEligible});track('lead_quality_classified',{service_area_status:serviceAreaStatus,meta_lead_eligible:metaLeadEligible,qualified_lead_eligible:qualifiedLeadEligible,meta_capi_status:metaStatus});if(qualifiedLeadEligible)track('qualified_lead',{service_area_status:serviceAreaStatus});else if(serviceAreaStatus==='OUT_OF_AREA')track('lead_out_of_area',{meta_capi_status:metaStatus})}go(28)";
if(!html.includes(conversionOld))throw new Error('Paid conversion call marker not found');
html=html.replace(conversionOld,conversionNew);
const dataLayerComment='/* DATA LAYER V3 · idempotent requests + resilient telemetry + richer attribution */';
if(!html.includes(dataLayerComment))throw new Error('Data Layer V3 comment boundary not found');
html=html.replace(dataLayerComment,`${dataLayerComment}\n/* ${marker} */`);

const consentStart=consent.indexOf('function firePaidLeadConversion(rawLeadId) {');
const consentEnd=consent.indexOf('\n\nfunction applyConsent(',consentStart);
if(consentStart<0||consentEnd<0)throw new Error('Consent conversion bridge marker not found');
const consentNew=`function firePaidLeadConversion(rawLeadId, options = {}) {
  const leadId = String(rawLeadId || '').trim();
  const metaLeadEligible = options?.metaLeadEligible !== false;
  const qualifiedLeadEligible = options?.qualifiedLeadEligible === true;
  if (!leadId || currentConsent?.marketing !== true || !trackingConfig) {
    return { google_ads: false, meta_pixel: false, meta_qualified: false, reason: 'marketing_consent_required' };
  }

  loadGoogle(currentConsent);
  loadMeta(currentConsent);

  let googleAds = false;
  let metaPixel = false;
  let metaQualified = false;
  const adsId = trackingConfig.google_ads_id;
  const adsLabel = trackingConfig.google_ads_conversion_label;

  if (adsId && adsLabel && typeof window.gtag === 'function' && !conversionAlreadySent('google_ads', leadId)) {
    window.gtag('event', 'conversion', {
      send_to: adsId + '/' + adsLabel,
      transaction_id: leadId,
    });
    markConversionSent('google_ads', leadId);
    googleAds = true;
  }

  if (metaLeadEligible && trackingConfig.meta_pixel_id && typeof window.fbq === 'function' && !conversionAlreadySent('meta_pixel', leadId)) {
    window.fbq('track', 'Lead', {}, { eventID: leadId });
    markConversionSent('meta_pixel', leadId);
    metaPixel = true;
  }

  const qualifiedEventId = leadId + ':qualified';
  if (qualifiedLeadEligible && trackingConfig.meta_pixel_id && typeof window.fbq === 'function' && !conversionAlreadySent('meta_pixel_qualified', leadId)) {
    window.fbq('trackCustom', 'QualifiedLead', {}, { eventID: qualifiedEventId });
    markConversionSent('meta_pixel_qualified', leadId);
    metaQualified = true;
  }

  return { google_ads: googleAds, meta_pixel: metaPixel, meta_qualified: metaQualified };
}`;
consent=consent.slice(0,consentStart)+consentNew+consent.slice(consentEnd);

for(const required of [
  marker,'property_province=provinceNormalized','province:state.a.property_province||null','lead_quality_classified',
  "metaLeadEligible=metaStatus==='sent'",'qualifiedLeadEligible=metaLeadEligible','lead_out_of_area',
]){if(!html.includes(required))throw new Error(`Service Area frontend marker missing: ${required}`)}
for(const required of [
  'function firePaidLeadConversion(rawLeadId, options = {})','metaLeadEligible = options?.metaLeadEligible !== false',
  "window.fbq('trackCustom', 'QualifiedLead'",'meta_pixel_qualified','meta_qualified: metaQualified',
]){if(!consent.includes(required))throw new Error(`Service Area consent marker missing: ${required}`)}

fs.writeFileSync(htmlFile,html);
fs.writeFileSync(consentFile,consent);
console.log('Service Area + Meta Quality V1: PASS · province capture · server status gate · Meta Lead filter · QualifiedLead Pixel');
