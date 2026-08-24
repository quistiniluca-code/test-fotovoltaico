import fs from 'node:fs';

const file = 'public/index.html';
const adminFile = 'netlify/functions/admin-funnel.js';
const dashboardFile = 'public/admin/funnel.html';
let html = fs.readFileSync(file, 'utf8');
let admin = fs.readFileSync(adminFile, 'utf8');
let dashboard = fs.readFileSync(dashboardFile, 'utf8');
const marker = 'BERGAMO GEO QUALIFIER V4 · early Comune/Provincia + clean funnel metrics';

if (html.includes(marker)) throw new Error('Bergamo Geo Qualifier V4 already applied');
if (!html.includes('META FUNNEL + CRM V3')) throw new Error('Bergamo Geo Qualifier V4 requires Meta Funnel + CRM V3');

const css = String.raw`
/* ${marker} */
.geo-gate{position:fixed;inset:0;z-index:9998;display:grid;place-items:center;padding:18px;background:rgba(4,61,0,.54);backdrop-filter:blur(7px)}
.geo-gate-card{width:min(100%,430px);padding:22px;border-radius:24px;background:#fff;box-shadow:0 24px 80px rgba(4,61,0,.28)}
.geo-gate-kicker{margin-bottom:8px;color:#5f8f24;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.geo-gate h2{margin:0;color:var(--d);font-size:27px;line-height:1.05;letter-spacing:-.03em}
.geo-gate p{margin:10px 0 14px;color:#50604b;font-size:14px;line-height:1.42}
.geo-gate-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(92px,1fr);gap:8px}
.geo-gate .field{margin:0}
.geo-gate-note{margin-top:9px!important;font-size:11px!important;color:#6c7768!important}
.geo-gate-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:14px}
.geo-gate .btn.secondary{background:#fff;color:var(--d);border:1px solid var(--line);box-shadow:none}
.geo-gate-status{min-height:17px;margin-top:8px;font-size:12px}
@media(max-width:360px){.geo-gate-grid{grid-template-columns:1fr}.geo-gate-card{padding:18px}.geo-gate h2{font-size:24px}}
`;
if (!html.includes('</style>')) throw new Error('Could not locate style closing tag');
html = html.replace('</style>', `${css}\n</style>`);

const telemetryOld = "bill_uploaded:Boolean(state.billAttachment?.attachment_id||state.billFile||state.bill),bill_parse_status:";
const telemetryNew = "bill_file_uploaded:Boolean(state.billAttachment?.attachment_id),energy_data_available:Boolean(state.bill),bill_parse_status:";
if (!html.includes(telemetryOld)) throw new Error('Meta Funnel V3 bill telemetry marker not found');
html = html.replace(telemetryOld, telemetryNew);

const signalMarker = 'async function signalServiceArea(property){';
if (!html.includes(signalMarker)) throw new Error('Service area function marker not found');
const earlyGeo = String.raw`function acquisitionCluster(province){return String(province||'').trim().toUpperCase()==='BG'?'BERGAMO':'OTHER'}
function collectEarlyPropertyArea(){return new Promise(resolve=>{
  const existing=document.querySelector('#econGeoGate');if(existing)existing.remove();
  const layer=document.createElement('div');layer.id='econGeoGate';layer.className='geo-gate';layer.innerHTML='<div class="geo-gate-card" role="dialog" aria-modal="true" aria-labelledby="geoGateTitle"><div class="geo-gate-kicker">PRIMA DI INIZIARE</div><h2 id="geoGateTitle">Dove si trova l’immobile?</h2><p>Ci bastano Comune e Provincia. L’indirizzo completo verrà richiesto più avanti.</p><div class="geo-gate-grid"><input id="geoCity" class="field" placeholder="Comune" autocomplete="address-level2" aria-label="Comune" value="'+esc(state.a.property_city||'')+'"><input id="geoProvince" class="field" placeholder="Es. BG" autocomplete="address-level1" aria-label="Provincia" maxlength="3" value="'+esc(state.a.property_province||'')+'"></div><div id="geoGateStatus" class="status geo-gate-status"></div><p class="geo-gate-note">Serve a verificare subito se l’immobile rientra nell’area operativa ECON.</p><div class="geo-gate-actions"><button id="geoContinue" class="btn">Continua il test</button><button id="geoBack" class="btn secondary">Torna indietro</button></div></div>';
  document.body.appendChild(layer);
  const city=layer.querySelector('#geoCity'),province=layer.querySelector('#geoProvince'),status=layer.querySelector('#geoGateStatus');
  province.addEventListener('input',()=>{province.value=province.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,2)});
  layer.querySelector('#geoBack').onclick=()=>{layer.remove();resolve(false)};
  layer.querySelector('#geoContinue').onclick=async()=>{
    const c=city.value.trim(),p=province.value.trim().toUpperCase();
    if(c.length<2||!/^[A-Z]{2}$/.test(p)){status.className='status error geo-gate-status';status.textContent='Inserisci Comune e sigla Provincia.';(c.length<2?city:province).focus();return}
    state.a.property_city=c;state.a.property_province=p;state.a.acquisition_cluster=acquisitionCluster(p);track('property_area_checked',{city:c,province:p,acquisition_cluster:state.a.acquisition_cluster,check_stage:'early'});
    if(state.a.acquisition_cluster==='BERGAMO')track('priority_area_bergamo',{city:c,province:p});
    await signalServiceArea({city:c,province:p});
    layer.remove();resolve(true);
  };
  setTimeout(()=>city.focus(),30);
})}
`;
html = html.replace(signalMarker, `${earlyGeo}\n${signalMarker}`);

const startOld = "if(n===0)$('#start').onclick=()=>{track('test_started');void signalMetaJourney('TestStarted');go(1)};";
const startNew = "if(n===0)$('#start').onclick=async()=>{track('test_started');void signalMetaJourney('TestStarted');const geoOk=await collectEarlyPropertyArea();if(geoOk)go(1)};";
if (!html.includes(startOld)) throw new Error('V3 start handler marker not found');
html = html.replace(startOld, startNew);

const cityValueOld = "value=\"'+esc(a.city)+'\"";
const cityValueNew = "value=\"'+esc(a.city||state.a.property_city||'')+'\"";
const provinceValueOld = "value=\"'+esc(a.province)+'\"";
const provinceValueNew = "value=\"'+esc(a.province||state.a.property_province||'')+'\"";
if (!html.includes(cityValueOld) || !html.includes(provinceValueOld)) throw new Error('Final address prefill markers not found');
html = html.replace(cityValueOld, cityValueNew).replace(provinceValueOld, provinceValueNew);

const addressOld = "state.a.address_source=source;state.a.property_city=city;state.a.property_province=provinceNormalized;track('address_confirmed',{source,province:provinceNormalized});void signalServiceArea({address:state.a.address,city,province:provinceNormalized});go(25)";
const addressNew = "state.a.address_source=source;const earlyProvince=state.a.property_province||null;state.a.property_city=city;state.a.property_province=provinceNormalized;state.a.acquisition_cluster=acquisitionCluster(provinceNormalized);track('address_confirmed',{source,province:provinceNormalized,early_province:earlyProvince,province_changed:Boolean(earlyProvince&&earlyProvince!==provinceNormalized),acquisition_cluster:state.a.acquisition_cluster});if(earlyProvince&&earlyProvince!==provinceNormalized)track('property_area_corrected',{from_province:earlyProvince,to_province:provinceNormalized});void signalServiceArea({address:state.a.address,city,province:provinceNormalized});go(25)";
if (!html.includes(addressOld)) throw new Error('Final address confirmation marker not found');
html = html.replace(addressOld, addressNew);

const whatsappOld = "state.a.whatsapp_intent=true;const eventId=crypto.randomUUID();track('whatsapp_intent',{destination:'whatsapp',service_area_status:state.a.service_area_status||null});";
const whatsappNew = "state.a.whatsapp_intent=true;state.a.whatsapp_click_count=(state.a.whatsapp_click_count||0)+1;const eventId=crypto.randomUUID();track('whatsapp_intent',{destination:'whatsapp',service_area_status:state.a.service_area_status||null,click_index:state.a.whatsapp_click_count});";
if (!html.includes(whatsappOld)) throw new Error('WhatsApp intent marker not found');
html = html.replace(whatsappOld, whatsappNew);

const waSetsOld = 'const whatsappSessionIds = new Set(whatsapp.map(row => row?.session_id).filter(Boolean));';
const waSetsNew = `${waSetsOld}\n    const whatsappInAreaSessionIds = new Set(whatsapp.filter(row => row?.service_area_status === "IN_AREA").map(row => row?.session_id).filter(Boolean));`;
if (!admin.includes(waSetsOld)) throw new Error('Admin WhatsApp set marker not found');
admin = admin.replace(waSetsOld, waSetsNew);

const metricsMarker = '    if (format === "csv") {';
if (!admin.includes(metricsMarker)) throw new Error('Admin format marker not found');
const metrics = `    const propertyCheckSessionIds = new Set(events.filter(event => event?.event === "property_area_checked").map(event => event?.session_id).filter(Boolean));\n    const qualifiedSessionIds = new Set(events.filter(event => event?.event === "service_area_qualified").map(event => event?.session_id).filter(Boolean));\n    const inAreaPropertyCheckSessionIds = new Set([...propertyCheckSessionIds].filter(sessionId => qualifiedSessionIds.has(sessionId)));\n    const propertyAreaChecks = propertyCheckSessionIds.size;\n    const propertyAreaInAreaRate = percentage(inAreaPropertyCheckSessionIds.size, propertyAreaChecks);\n    const serviceAreaPerformanceSignalCandidate = propertyAreaChecks >= 30 && propertyAreaInAreaRate >= 40;\n    const serviceAreaPerformanceSignalStrong = propertyAreaChecks >= 30 && propertyAreaInAreaRate >= 50;\n\n`;
admin = admin.replace(metricsMarker, metrics + metricsMarker);

const kpiOld = '        whatsapp_intents: engagementRows.length,\n        whatsapp_in_area: engagementRows.filter(row => row.service_area_status === "IN_AREA").length,';
const kpiNew = '        whatsapp_clicks: engagementRows.length,\n        whatsapp_intents: whatsappSessionIds.size,\n        whatsapp_unique_intents: whatsappSessionIds.size,\n        whatsapp_unique_in_area: whatsappInAreaSessionIds.size,\n        property_area_checks: propertyAreaChecks,\n        property_area_in_area_rate: propertyAreaInAreaRate,\n        service_area_performance_signal_candidate: serviceAreaPerformanceSignalCandidate,\n        service_area_performance_signal_strong: serviceAreaPerformanceSignalStrong,';
if (!admin.includes(kpiOld)) throw new Error('Admin KPI marker not found');
admin = admin.replace(kpiOld, kpiNew);

const breakdownMarker = '      platform_breakdown:';
if (!admin.includes(breakdownMarker)) throw new Error('Admin response breakdown marker not found');
admin = admin.replace(breakdownMarker, `      recommendations: {\n        service_area_performance_signal: serviceAreaPerformanceSignalStrong ? "strong_candidate" : serviceAreaPerformanceSignalCandidate ? "candidate" : "keep_diagnostic",\n        minimum_property_checks: 30,\n        candidate_in_area_rate_pct: 40,\n        strong_in_area_rate_pct: 50,\n      },\n      ${breakdownMarker.trim()}`);

const cardOld = "['WhatsApp Intent',d.kpis?.whatsapp_intents||0]";
const cardNew = "['WhatsApp Intent unici',d.kpis?.whatsapp_unique_intents??d.kpis?.whatsapp_intents??0]";
if (!dashboard.includes(cardOld)) throw new Error('Dashboard WhatsApp card marker not found');
dashboard = dashboard.replace(cardOld, cardNew);
const qualityOld = "<p class=\"muted\">A ${q.A||0} · B ${q.B||0} · C ${q.C||0} · D ${q.D||0} · Fuori area ${q.OUT_OF_AREA||0}</p>";
const qualityNew = "<p class=\"muted\">A ${q.A||0} · B ${q.B||0} · C ${q.C||0} · D ${q.D||0} · Fuori area ${q.OUT_OF_AREA||0}</p><p class=\"muted\"><b>Geo check:</b> ${d.kpis?.property_area_checks||0} · IN_AREA ${d.kpis?.property_area_in_area_rate||0}% · Segnale Meta: ${esc(d.recommendations?.service_area_performance_signal||'keep_diagnostic')}</p>";
if (!dashboard.includes(qualityOld)) throw new Error('Dashboard quality marker not found');
dashboard = dashboard.replace(qualityOld, qualityNew);

for (const required of [
  marker,
  'function collectEarlyPropertyArea()',
  "track('property_area_checked'",
  "track('priority_area_bergamo'",
  "await signalServiceArea({city:c,province:p})",
  'bill_file_uploaded:Boolean(state.billAttachment?.attachment_id)',
  'energy_data_available:Boolean(state.bill)',
  'acquisition_cluster=acquisitionCluster(provinceNormalized)',
  'state.a.whatsapp_click_count=(state.a.whatsapp_click_count||0)+1',
]) if (!html.includes(required)) throw new Error(`Geo Qualifier V4 marker missing: ${required}`);
for (const required of ['whatsapp_unique_intents', 'property_area_in_area_rate', 'service_area_performance_signal_candidate', 'strong_candidate', 'event?.event === "property_area_checked"', 'inAreaPropertyCheckSessionIds']) {
  if (!admin.includes(required)) throw new Error(`Admin V4 marker missing: ${required}`);
}
if (!dashboard.includes('WhatsApp Intent unici') || !dashboard.includes('Geo check:')) throw new Error('Dashboard V4 markers missing');

fs.writeFileSync(file, html);
fs.writeFileSync(adminFile, admin);
fs.writeFileSync(dashboardFile, dashboard);
console.log('Bergamo Geo Qualifier V4: PASS · early property geo · immediate service-area signal · clean bill/WhatsApp metrics · performance-signal gate');
