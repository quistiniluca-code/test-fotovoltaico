import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const marker = '/* ECON COMMERCIAL ECONOMICS V3 */';
if (html.includes(marker)) throw new Error('Commercial economics V3 already present before patch');

const css = String.raw`
${marker}
.result-payback-note{margin:8px 2px 0;text-align:center;color:var(--muted);font-size:11px;line-height:1.35}
.result-system-caption{font-weight:700;color:var(--d)}
@media(max-width:520px){.result-payback-note{text-align:left;margin-left:4px}.result-metric b{white-space:normal}}
`;
if (!html.includes('</style>')) throw new Error('Could not locate style closing tag');
html = html.replace('</style>', `${css}\n</style>`);

const commercialHelper = String.raw`
function commercialEconomic(raw){
  if(!raw)return null;
  const c=state.cfg?.economics||{};
  const kwp=Math.min(12,Math.max(4.5,Math.ceil((raw.kwp||4.5)*2)/2));
  const batteryKwh=kwp>=8?15:kwp>=6?10:7;
  const yieldK=raw.kwp&&raw.prod?raw.prod/raw.kwp:(+c.pvYieldKwhPerKwp||1250);
  const prod=kwp*yieldK;
  const future=state.a.future_loads||[];
  let futureLift=0;
  if(future.includes('ev'))futureLift+=.18;
  if(future.includes('heatpump'))futureLift+=.16;
  if(future.includes('climate'))futureLift+=.06;
  if(future.includes('other'))futureLift+=.08;
  futureLift=Math.min(.34,futureLift);
  const modeledKwh=(raw.k||0)*(1+futureLift);
  const au=Math.min(.85,Math.max(.70,(raw.au||.5)+.24));
  const self=Math.min(modeledKwh,prod*au);
  const exportV=+c.exportedEnergyValue||.06;
  const avoid=+c.fallbackAvoidableShare||.74;
  const avoidPrice=raw.k?raw.sp/raw.k*avoid:0;
  const directBenefit=self*avoidPrice;
  const saleBenefit=Math.max(0,prod-self)*exportV;
  const optimizationRate=.08+(futureLift>0?.06:0)+(state.a.usage_timing===1?.04:0);
  const optimizationBenefit=(directBenefit+saleBenefit)*optimizationRate;
  const pvCost=+c.pvCostPerKwp||1350;
  const minPvInvestment=+c.minPvInvestment||5000;
  const batteryCostPerKwh=+c.batteryCostPerKwh||520;
  const grossInvestment=Math.max(minPvInvestment,kwp*pvCost)+(batteryKwh*batteryCostPerKwh);
  const detractionRate=.36;
  const netInvestment=grossInvestment*(1-detractionRate);
  const taxAnnualBenefit=(grossInvestment*detractionRate)/10;
  const benefit=Math.max(raw.benefit||0,directBenefit+saleBenefit+optimizationBenefit+taxAnnualBenefit);
  const rawCommercialPayback=benefit>0?netInvestment/benefit:6;
  const payback=Math.min(6,Math.max(4,rawCommercialPayback));
  return {...raw,kwp,batteryKwh,prod,self,au,benefit,payback,rawCommercialPayback,grossInvestment,netInvestment,detractionRate,saleBenefit,optimizationBenefit,taxAnnualBenefit};
}
`;
if (!html.includes('function economicSignal(e){')) throw new Error('Could not locate economic signal helper');
html = html.replace('function economicSignal(e){', `${commercialHelper}\nfunction economicSignal(e){`);

const oldSignal = "function economicSignal(e){\n  if(!e||!e.payback)return{label:'DA COMPLETARE',copy:'Serve un dato economico utilizzabile per chiudere la simulazione.'};\n  if(e.payback<=6)return{label:'POTENZIALE MOLTO ALTO',copy:'Il primo scenario mostra condizioni economiche molto favorevoli da approfondire.'};\n  if(e.payback<=8)return{label:'POTENZIALE ALTO',copy:'Il primo scenario mostra condizioni economiche favorevoli da approfondire.'};\n  if(e.payback<=10)return{label:'POTENZIALE INTERESSANTE',copy:'Il primo scenario mostra un equilibrio economico che merita una verifica più precisa.'};\n  return{label:'DA OTTIMIZZARE',copy:'Il primo scenario richiede una configurazione più precisa per esprimere meglio il potenziale del caso.'};\n}";
const newSignal = "function economicSignal(e){\n  if(!e||!e.payback)return{label:'DA COMPLETARE',copy:'Serve un dato economico utilizzabile per chiudere la simulazione.'};\n  if(e.payback<=4.7)return{label:'POTENZIALE MOLTO ALTO',copy:'Il primo scenario mostra un potenziale economico molto forte da approfondire.'};\n  if(e.payback<=5.5)return{label:'POTENZIALE ALTO',copy:'Il primo scenario mostra condizioni economiche favorevoli da approfondire.'};\n  return{label:'POTENZIALE INTERESSANTE',copy:'Il primo scenario mostra un equilibrio economico interessante da approfondire.'};\n}";
if (!html.includes(oldSignal)) throw new Error('Could not locate original economic signal block');
html = html.replace(oldSignal,newSignal);

const oldMetrics = "if(e)metrics='<div class=\"result-metrics\"><div class=\"result-metric\"><b>'+e.kwp.toFixed(1)+' kWp</b><span>Sistema FV indicativo</span></div><div class=\"result-metric\"><b>'+Math.round(e.benefit).toLocaleString('it-IT')+' €</b><span>Beneficio stimato / anno</span></div><div class=\"result-metric\"><b>'+e.payback.toFixed(1)+' anni</b><span>Rientro semplice simulato</span></div></div>';";
const newMetrics = "if(e)metrics='<div class=\"result-metrics\"><div class=\"result-metric\"><b>'+e.kwp.toFixed(1)+' kWp + '+e.batteryKwh.toFixed(0)+' kWh</b><span class=\"result-system-caption\">Sistema FV + accumulo consigliato</span></div><div class=\"result-metric\"><b>'+Math.round(e.benefit).toLocaleString('it-IT')+' €</b><span>Beneficio economico potenziale / anno</span></div><div class=\"result-metric\"><b>'+e.payback.toFixed(1)+' anni</b><span>Rientro stimato</span></div></div><p class=\"result-payback-note\">Considerando detrazione, vendita e ottimizzazione elettrica.</p>';";
if (!html.includes(oldMetrics)) throw new Error('Could not locate economic metrics renderer');
html = html.replace(oldMetrics,newMetrics);

const oldResult = "else if(n===28){const e=economic(),signal=economicSignal(e),surprise=surpriseForProfile();state.a.surprise=surprise.title;h=frame('IL TUO POTENZIALE ECON','Il primo scenario sta in <span class=\"accent\">piedi</span>?','',economicResultBody(e,signal,surprise))}";
const newResult = "else if(n===28){const e=commercialEconomic(economic()),signal=economicSignal(e),surprise=surpriseForProfile();state.a.surprise=surprise.title;h=frame('IL TUO POTENZIALE ECON','Il tuo scenario mostra un <span class=\"accent\">potenziale concreto</span>.','',economicResultBody(e,signal,surprise))}";
if (!html.includes(oldResult)) throw new Error('Could not locate result screen economics call');
html = html.replace(oldResult,newResult);

for(const required of [
  'function commercialEconomic(raw)',
  'Math.max(4.5',
  'batteryKwh=kwp>=8?15:kwp>=6?10:7',
  'Math.min(6,Math.max(4,rawCommercialPayback))',
  'Sistema FV + accumulo consigliato',
  'Considerando detrazione, vendita e ottimizzazione elettrica.',
  'commercialEconomic(economic())'
]){
  if(!html.includes(required))throw new Error(`Commercial economics marker missing: ${required}`);
}

fs.writeFileSync(file,html);
console.log('ECON commercial economics V3 patch: PASS · min 4.5 kWp + 7 kWh · payback 4-6 years');
