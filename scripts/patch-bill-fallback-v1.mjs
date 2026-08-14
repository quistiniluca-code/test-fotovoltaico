import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const marker = 'BILL FALLBACK V1 · optional bill + qualified estimate';

for (const dependency of [
  'LAUNCH UX POLISH V5 · final visual + journey',
  'WHATSAPP FINAL CTA · v1',
  'SURPRISE OFFER NOTE · v1',
  'ADDRESS FLOW V2 · OCR-first + manual fallback',
  'ECON COMMERCIAL ECONOMICS V3',
]) {
  if (!html.includes(dependency)) throw new Error(`Bill fallback V1 requires ${dependency}`);
}
if (html.includes(marker)) throw new Error('Bill fallback V1 already applied');

const helpers = String.raw`
const BILL_SPEND_BANDS=[
  {key:'lt60',label:'Meno di 60 € / mese',monthly:50},
  {key:'60-100',label:'60–100 € / mese',monthly:80},
  {key:'100-150',label:'100–150 € / mese',monthly:125},
  {key:'150-250',label:'150–250 € / mese',monthly:200},
  {key:'gt250',label:'Oltre 250 € / mese',monthly:300},
  {key:'unknown',label:'Non ne ho idea',monthly:null},
];
const BILL_HOUSEHOLDS=[['1','1 persona'],['2','2 persone'],['3','3 persone'],['4','4 persone'],['5+','5 o più persone']];
function clearBillEstimateMetadata(){
  for(const key of ['bill_data_mode','bill_estimate_spend_band','bill_estimate_household','bill_estimate_quality'])delete state.a[key];
}
function resetBillBaseline(){
  state.bill=null;
  state.billConfirmed=false;
  clearBillEstimateMetadata();
}
function buildEstimatedBill(spendKey,household){
  const band=BILL_SPEND_BANDS.find(x=>x.key===spendKey)||null;
  const annualSpend=band&&band.monthly?band.monthly*12:null;
  const predicted=+state.a.annual_kwh_prediction||0;
  const fields={coverage_months:{value:12,source:'PERIODO DI STIMA'}};
  if(annualSpend)fields.annual_spend={value:annualSpend,source:'STIMA DA FASCIA DI SPESA MENSILE'};
  if(predicted)fields.annual_kwh={value:predicted,source:'STIMA DICHIARATA DALL’UTENTE'};
  state.bill={supplier:null,parser_mode:'manual-estimate',fields};
  state.billConfirmed=true;
  state.a.bill_data_mode='estimate';
  state.a.bill_flow_mode='estimate';
  state.a.bill_estimate_spend_band=spendKey;
  state.a.bill_estimate_household=household;
  state.a.bill_estimate_quality=predicted&&annualSpend?'estimate-kwh-and-spend':predicted?'estimate-kwh-only':annualSpend?'estimate-spend-only':'profile-only';
  return{predicted,annualSpend,quality:state.a.bill_estimate_quality};
}
function billDataQualityNote(){
  if(state.a.bill_data_mode!=='estimate')return'';
  const hasKwh=Boolean(+billVal('annual_kwh'));
  const hasSpend=Boolean(+billVal('annual_spend'));
  let copy='Hai completato il test senza bolletta. Il risultato resta utile per qualificare il profilo, ma la parte economica richiede dati più solidi.';
  if(hasKwh&&hasSpend)copy='Valori indicativi costruiti dalla fascia di spesa mensile e dalla stima dei consumi che hai dichiarato. Non sono dati letti da una bolletta.';
  else if(hasKwh)copy='Useremo la tua stima dei consumi come riferimento. Senza una spesa verificata, la parte economica resta da affinare.';
  else if(hasSpend)copy='Abbiamo una fascia di spesa indicativa, ma non inventiamo un consumo in kWh che non hai dichiarato. La bolletta completerà la baseline.';
  return '<div class="bill-quality-note" role="note"><span class="bill-quality-badge">STIMA PRELIMINARE</span><span>'+esc(copy)+'</span></div>';
}
function billGatewayScreen(){
  const mode=state.a.bill_flow_mode||'choice';
  if(mode==='upload'){
    return frame('SFIDA FINALE · ORA ENTRANO I DATI','Carica la <span class="accent">bolletta</span>.','È il percorso più preciso: leggiamo il file localmente nel browser e ti chiediamo di confermare i dati prima di usarli.',
      '<div class="bill-mode-chip">DATI DA BOLLETTA</div><label class="upload bill-upload"><b>Carica PDF o foto</b><p class="small">Il file resta sul tuo dispositivo durante la lettura. Nessun OCR esterno.</p><input id="billFile" type="file" accept="application/pdf,image/*"></label><div id="uploadStatus" class="status"></div><div class="bill-flow-trust"><b>Prima i dati, poi il risultato.</b><span>Nessun preventivo automatico e nessuna chiamata commerciale in questa fase.</span></div><button id="billEstimateSwitch" class="bill-switch" type="button">Non ce l’ho con me · continua con una stima →</button>');
  }
  if(mode==='estimate'){
    const selectedSpend=state.a.bill_estimate_spend_band||'';
    const selectedHousehold=state.a.bill_estimate_household||'';
    const spendOptions=BILL_SPEND_BANDS.map(x=>'<option value="'+x.key+'" '+(selectedSpend===x.key?'selected':'')+'>'+x.label+'</option>').join('');
    const householdOptions=BILL_HOUSEHOLDS.map(x=>'<option value="'+x[0]+'" '+(selectedHousehold===x[0]?'selected':'')+'>'+x[1]+'</option>').join('');
    const prior=+state.a.annual_kwh_prediction||0;
    const priorCopy=prior?'Hai già indicato '+prior.toLocaleString('it-IT')+' kWh/anno: useremo quella tua stima come riferimento di consumo.':'Non hai indicato i kWh: non ne inventeremo uno. Se manca, la parte economica resterà da affinare con la bolletta.';
    return frame('SFIDA FINALE · STIMA PRELIMINARE','Non hai la bolletta con te? <span class="accent">Continua</span>.','Costruiamo una prima baseline con ciò che sai già. La distingueremo sempre dai dati reali e potrai aggiungere la bolletta in seguito.',
      '<div class="bill-estimate-card"><div class="bill-estimate-field"><label for="billSpendBand">Quanto spendi indicativamente al mese?</label><select id="billSpendBand" class="field"><option value="">Seleziona una fascia</option>'+spendOptions+'</select></div><div class="bill-estimate-field"><label for="billHousehold">Quante persone vivono abitualmente in casa?</label><select id="billHousehold" class="field"><option value="">Seleziona</option>'+householdOptions+'</select></div><div class="bill-estimate-note">'+esc(priorCopy)+'</div></div><div id="billEstimateStatus" class="status"></div><div class="actions"><button id="billEstimateContinue" class="btn">Continua con la stima preliminare →</button></div><button id="billUploadSwitch" class="bill-switch" type="button">Preferisco caricare la bolletta</button>');
  }
  return frame('SFIDA FINALE · ORA ENTRANO I DATI','Hai una bolletta a <span class="accent">portata di mano</span>?','Scegli il percorso più comodo. Il test continua in entrambi i casi: cambia soltanto la qualità della baseline.',
    '<div class="bill-path-grid"><button id="billHave" class="bill-path bill-path-primary" type="button"><span class="bill-path-badge">DATI REALI</span><b>Sì, ce l’ho con me</b><span>PDF o foto · lettura locale · conferma dei dati prima dell’uso.</span></button><button id="billEstimate" class="bill-path" type="button"><span class="bill-path-badge bill-path-badge-soft">STIMA PRELIMINARE</span><b>Non ce l’ho con me</b><span>Continua con ciò che sai già. Potrai aggiungerla dopo senza perdere il risultato.</span></button></div><div class="bill-flow-trust"><b>Nessun vicolo cieco.</b><span>La bolletta aumenta la precisione, ma non è obbligatoria per completare il test.</span></div>');
}
`;

if (!html.includes('function render(){')) throw new Error('Could not locate render function for bill fallback helpers');
html = html.replace('function render(){', `${helpers}\nfunction render(){`);

const renderStart=html.indexOf('else if(n===17)');
const renderEnd=html.indexOf('else if(n===18)',renderStart);
if(renderStart<0||renderEnd<0||renderEnd<=renderStart)throw new Error('Could not locate bill upload screen');
html=html.slice(0,renderStart)+"else if(n===17)h=billGatewayScreen();\n"+html.slice(renderEnd);

const bindStart=html.indexOf('function bind(){');
const bind17=html.indexOf('if(n===17)',bindStart);
const bind18=html.indexOf('if(n===18)',bind17);
if(bindStart<0||bind17<0||bind18<0||bind18<=bind17)throw new Error('Could not locate bill screen handler');
const billHandler=String.raw`if(n===17){
  const chooseMode=(mode)=>{resetBillBaseline();state.a.bill_flow_mode=mode;track('bill_path_selected',{mode});render()};
  if($('#billHave'))$('#billHave').onclick=()=>chooseMode('upload');
  if($('#billEstimate'))$('#billEstimate').onclick=()=>chooseMode('estimate');
  if($('#billEstimateSwitch'))$('#billEstimateSwitch').onclick=()=>chooseMode('estimate');
  if($('#billUploadSwitch'))$('#billUploadSwitch').onclick=()=>chooseMode('upload');
  if($('#billFile'))$('#billFile').onchange=e=>e.target.files?.[0]&&uploadBill(e.target.files[0]);
  if($('#billEstimateContinue'))$('#billEstimateContinue').onclick=()=>{
    const status=$('#billEstimateStatus'),spend=$('#billSpendBand').value,household=$('#billHousehold').value;
    if(!spend||!household){status.className='status error';status.textContent='Seleziona la fascia di spesa e il numero di persone in casa.';return}
    const estimate=buildEstimatedBill(spend,household);
    track('bill_estimate_completed',{spend_band:spend,household_size:household,has_kwh_prediction:Boolean(estimate.predicted),has_spend_estimate:Boolean(estimate.annualSpend),quality:estimate.quality});
    go(24);
  };
};`;
html=html.slice(0,bind17)+billHandler+html.slice(bind18);

const uploadSuccess="    state.bill=j;\n    state.billConfirmed=false;";
const uploadSuccessEnhanced="    clearBillEstimateMetadata();\n    state.bill=j;\n    state.a.bill_data_mode='bill';\n    state.a.bill_flow_mode='upload';\n    state.billConfirmed=false;";
if(!html.includes(uploadSuccess))throw new Error('Could not locate local bill parser success state');
html=html.replace(uploadSuccess,uploadSuccessEnhanced);

const oldJourney=String.raw`function journeyProgress(n){
  const exact=ECON_JOURNEY_STEPS.indexOf(n);
  if(exact>=0)return Math.round(exact/(ECON_JOURNEY_STEPS.length-1)*100);
  const completed=ECON_JOURNEY_STEPS.filter(step=>step<n).length;
  return Math.max(0,Math.min(100,Math.round(Math.max(0,completed-1)/(ECON_JOURNEY_STEPS.length-1)*100)));
}`;
const newJourney=String.raw`function activeJourneySteps(){
  return state.a.bill_flow_mode==='estimate'||state.a.bill_data_mode==='estimate'?ECON_JOURNEY_STEPS.filter(step=>step!==18):ECON_JOURNEY_STEPS;
}
function journeyProgress(n){
  const steps=activeJourneySteps();
  const exact=steps.indexOf(n);
  if(exact>=0)return Math.round(exact/(steps.length-1)*100);
  const completed=steps.filter(step=>step<n).length;
  return Math.max(0,Math.min(100,Math.round(Math.max(0,completed-1)/(steps.length-1)*100)));
}`;
if(!html.includes(oldJourney))throw new Error('Could not locate launch journey progress helper');
html=html.replace(oldJourney,newJourney);

const profileStart=html.indexOf('function profileResultBody(score,band){');
const profileEnd=html.indexOf('function leadUnlockBody(){',profileStart);
if(profileStart<0||profileEnd<0)throw new Error('Could not locate profile result renderer');
let profileFn=html.slice(profileStart,profileEnd);
const kwhDisplay="(kwh?kwh.toLocaleString('it-IT')+' kWh/anno':'Da definire')";
const kwhDisplayEstimated="(kwh?(state.a.bill_data_mode==='estimate'?'≈ ':'')+kwh.toLocaleString('it-IT')+' kWh/anno':'Da definire')";
if(!profileFn.includes(kwhDisplay))throw new Error('Could not locate profile consumption display');
profileFn=profileFn.replace(kwhDisplay,kwhDisplayEstimated);
const profileDefinition="'<p class=\"result-definition\">Il punteggio sintetizza quanto il tuo profilo rende utile approfondire il caso con ECON.</p>";
if(!profileFn.includes(profileDefinition))throw new Error('Could not locate profile result definition');
profileFn=profileFn.replace(profileDefinition,"billDataQualityNote()+"+profileDefinition);
html=html.slice(0,profileStart)+profileFn+html.slice(profileEnd);

const resultStart=html.indexOf('function economicResultBody(e,signal,surprise){');
const resultEnd=html.indexOf('\n}',resultStart);
if(resultStart<0||resultEnd<0)throw new Error('Could not locate economic result renderer');
let resultFn=html.slice(resultStart,resultEnd+2);
if(!resultFn.includes("  let metrics='';"))throw new Error('Could not locate economic metrics initializer');
resultFn=resultFn.replace("  let metrics='';","  const estimateMode=state.a.bill_data_mode==='estimate';\n  let metrics='';");
const benefitExact="Math.round(e.benefit).toLocaleString('it-IT')";
if(!resultFn.includes(benefitExact))throw new Error('Could not locate economic benefit display');
resultFn=resultFn.replace(benefitExact,"(estimateMode?Math.round(e.benefit/100)*100:Math.round(e.benefit)).toLocaleString('it-IT')");
const paybackExact="e.payback.toFixed(1)";
if(!resultFn.includes(paybackExact))throw new Error('Could not locate economic payback display');
resultFn=resultFn.replace(paybackExact,"(estimateMode?(Math.round(e.payback*2)/2).toFixed(1):e.payback.toFixed(1))");
const systemExact="'+e.kwp.toFixed(1)+' kWp + '";
if(!resultFn.includes(systemExact))throw new Error('Could not locate system-size display');
resultFn=resultFn.replace(systemExact,"'+(estimateMode?'≈ ':'')+e.kwp.toFixed(1)+' kWp + '");
const whatsappExact="  const whatsapp='<div class=\"actions whatsapp-final-wrap\"><a id=\"whatsappFinal\" class=\"btn whatsapp-final-cta\" href=\"https://wa.me/393783091137\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Scrivi a ECON su WhatsApp\">Scrivici su WhatsApp →</a></div>';";
if(!resultFn.includes(whatsappExact))throw new Error('Could not locate WhatsApp final CTA renderer');
const whatsappConditional="  const whatsappLabel=estimateMode?'Invia la bolletta su WhatsApp →':'Scrivici su WhatsApp →';\n  const whatsappAria=estimateMode?'Invia la bolletta a ECON su WhatsApp':'Scrivi a ECON su WhatsApp';\n  const whatsapp='<div class=\"actions whatsapp-final-wrap\"><a id=\"whatsappFinal\" class=\"btn whatsapp-final-cta\" href=\"https://wa.me/393783091137\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"'+esc(whatsappAria)+'\">'+esc(whatsappLabel)+'</a></div>';";
resultFn=resultFn.replace(whatsappExact,whatsappConditional);
const resultReturn="  return '<div class=\"sim-signal\">'+esc(signal.label)+'</div>'+metrics";
if(!resultFn.includes(resultReturn))throw new Error('Could not locate economic result return');
resultFn=resultFn.replace(resultReturn,"  return billDataQualityNote()+'<div class=\"sim-signal\">'+esc(signal.label)+'</div>'+metrics");
html=html.slice(0,resultStart)+resultFn+html.slice(resultEnd+2);

const oldFinal="else if(n===28){const e=commercialEconomic(economic()),signal=economicSignal(e),surprise=surpriseForProfile();state.a.surprise=surprise.title;h=frame('IL TUO POTENZIALE ECON','Il tuo scenario mostra un <span class=\"accent\">potenziale concreto</span>.','',economicResultBody(e,signal,surprise))}";
const newFinal="else if(n===28){const e=commercialEconomic(economic()),signal=economicSignal(e),surprise=surpriseForProfile(),estimated=state.a.bill_data_mode==='estimate';state.a.surprise=surprise.title;h=frame('IL TUO POTENZIALE ECON',estimated?'Il tuo scenario è una <span class=\"accent\">stima preliminare</span>.':'Il tuo scenario mostra un <span class=\"accent\">potenziale concreto</span>.','',economicResultBody(e,signal,surprise))}";
if(!html.includes(oldFinal))throw new Error('Could not locate final result screen');
html=html.replace(oldFinal,newFinal);

const css=String.raw`
/* ${marker} */
.bill-path-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}
.bill-path{min-width:0;min-height:132px;border:1px solid var(--line);border-radius:20px;background:#fff;padding:15px;text-align:left;color:var(--text);font:inherit;cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .15s ease}
.bill-path-primary{border:2px solid var(--d);background:var(--soft)}
.bill-path:hover{border-color:var(--d);background:var(--soft)}
.bill-path:active{transform:translateY(1px)}
.bill-path:focus-visible,.bill-switch:focus-visible{outline:3px solid var(--l);outline-offset:3px}
.bill-path-badge,.bill-mode-chip,.bill-quality-badge{display:inline-flex;align-items:center;min-height:22px;padding:4px 8px;border-radius:999px;background:var(--l);color:var(--d);font-size:9px;font-weight:700;line-height:1;letter-spacing:.075em;text-transform:uppercase}
.bill-path-badge-soft{background:var(--soft);border:1px solid var(--line)}
.bill-path b{display:block;margin:11px 0 5px;color:var(--d);font-size:17px;line-height:1.08;letter-spacing:-.018em}
.bill-path>span:last-child{display:block;color:var(--muted);font-size:11.5px;line-height:1.3}
.bill-flow-trust{display:grid;gap:2px;margin-top:11px;padding:10px 12px;border-left:4px solid var(--l);border-radius:0 13px 13px 0;background:var(--soft)}
.bill-flow-trust b{color:var(--d);font-size:11.5px}
.bill-flow-trust span{color:#31452e;font-size:10.5px;line-height:1.3}
.bill-mode-chip{width:max-content;margin:3px 0 10px}
.bill-upload{margin-top:0}
.bill-switch{display:block;width:100%;margin:9px 0 0;border:0;background:transparent;color:var(--d);padding:7px 4px;font:700 11.5px/1.25 Arimo,Arial,sans-serif;text-align:center;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.bill-estimate-card{margin-top:12px;padding:13px;border:1px solid var(--line);border-radius:18px;background:var(--soft)}
.bill-estimate-field+ .bill-estimate-field{margin-top:7px}
.bill-estimate-field label{display:block;margin:0 3px 2px;color:var(--d);font-size:10px;font-weight:700;line-height:1.2;letter-spacing:.055em;text-transform:uppercase}
.bill-estimate-card .field{margin:3px 0;background:#fff}
.bill-estimate-note{margin-top:8px;padding-top:8px;border-top:1px solid var(--line);color:#31452e;font-size:10.5px;line-height:1.3}
.bill-quality-note{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:8px;margin:7px 0 9px;padding:9px 10px;border:1px solid var(--line);border-radius:14px;background:var(--soft);color:#31452e;font-size:10.5px;line-height:1.28}
.bill-quality-badge{white-space:nowrap}
@media(max-width:520px){
  .bill-path-grid{grid-template-columns:1fr;gap:7px;margin-top:10px}
  .bill-path{min-height:82px;padding:10px 12px;border-radius:15px}
  .bill-path b{margin:7px 0 3px;font-size:15.5px}
  .bill-path>span:last-child{font-size:10.5px;line-height:1.2}
  .bill-path-badge,.bill-mode-chip,.bill-quality-badge{min-height:19px;padding:3px 6px;font-size:8px}
  .bill-flow-trust{margin-top:7px;padding:7px 9px}
  .bill-flow-trust b{font-size:10.5px}
  .bill-flow-trust span{font-size:9.5px;line-height:1.2}
  .bill-estimate-card{margin-top:7px;padding:9px 10px;border-radius:14px}
  .bill-estimate-field+ .bill-estimate-field{margin-top:4px}
  .bill-estimate-field label{font-size:9px}
  .bill-estimate-note{margin-top:5px;padding-top:6px;font-size:9.5px;line-height:1.2}
  .bill-switch{margin-top:5px;padding:5px 2px;font-size:10.5px}
  .bill-quality-note{gap:6px;margin:5px 0 6px;padding:7px 8px;border-radius:12px;font-size:9.5px;line-height:1.2}
}
@media(max-width:520px) and (max-height:700px){
  .bill-path{min-height:72px;padding:8px 10px}
  .bill-path b{margin:5px 0 2px;font-size:14.5px}
  .bill-path>span:last-child{font-size:9.5px}
  .bill-flow-trust{margin-top:5px;padding:6px 8px}
  .bill-estimate-card{margin-top:5px;padding:7px 8px}
  .bill-estimate-note{font-size:8.8px}
  .bill-quality-note{font-size:8.8px}
}
`;
if(!html.includes('</style>'))throw new Error('Could not locate style closing tag for bill fallback V1');
html=html.replace('</style>',`${css}\n</style>`);

for(const required of [
  marker,
  'function billGatewayScreen()',
  'function buildEstimatedBill(spendKey,household)',
  "parser_mode:'manual-estimate'",
  "state.a.bill_data_mode='estimate'",
  "state.a.bill_data_mode='bill'",
  'La bolletta aumenta la precisione, ma non è obbligatoria per completare il test.',
  'Continua con la stima preliminare →',
  "go(24)",
  'function billDataQualityNote()',
  'Invia la bolletta su WhatsApp →',
  'function activeJourneySteps()',
]){
  if(!html.includes(required))throw new Error(`Bill fallback V1 marker missing: ${required}`);
}

fs.writeFileSync(file,html);
console.log('Bill fallback V1: PASS · optional upload · qualified estimate · transparent result · WhatsApp continuation');
