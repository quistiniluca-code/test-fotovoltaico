import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

const required = [
  '/* ECON COMMERCIAL ECONOMICS V3 */',
  'function commercialEconomic(raw)',
  'Math.max(4.5',
  'batteryKwh=kwp>=8?15:kwp>=6?10:7',
  'Math.min(6,Math.max(4,rawCommercialPayback))',
  'Sistema FV + accumulo consigliato',
  'Beneficio economico potenziale / anno',
  'Rientro stimato',
  'Considerando detrazione, vendita e ottimizzazione elettrica.',
  'commercialEconomic(economic())',
  'POTENZIALE INTERESSANTE',
];

for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`Missing commercial economics marker: ${marker}`);
}

const preservedTechnicalMarkers = [
  "import('/assets/bill-parser.js')",
  "fetch('/api/leads'",
  "state.a.lead_id=j.lead_id",
  "let au=state.a.usage_timing===0?.62:state.a.usage_timing===1?.42:state.a.usage_timing===2?.54:.48",
];
for (const marker of preservedTechnicalMarkers) {
  if (!html.includes(marker)) throw new Error(`Preserved technical marker missing: ${marker}`);
}

if (html.includes("<b>'+e.kwp.toFixed(1)+' kWp</b><span>Sistema FV indicativo</span>")) {
  throw new Error('Legacy PV-only result metric is still active');
}
if (html.includes("return{label:'DA OTTIMIZZARE'")) {
  throw new Error('Legacy negative commercial signal is still active');
}

console.log('Commercial economics V3 regression: PASS · 4.5+7 minimum · payback 4-6 · technical engine preserved');
