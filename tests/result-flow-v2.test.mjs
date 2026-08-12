import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

const required = [
  'IL TUO PROFILO ECON',
  'Sblocca simulazione e sorpresa',
  'Scopri il tuo potenziale con ECON',
  'IL TUO POTENZIALE ECON',
  'SORPRESA ECON SBLOCCATA',
  'profileOpportunityScore()',
  "title:'WALLBOX'",
  "title:'PIANO A INDUZIONE'",
  "title:'TERMOSTATO SMART'",
  "title:'ENERGY MONITOR'",
  "title:'CHECK TECNICO PREMIUM'",
  "title:'UPGRADE GESTIONE ENERGIA'",
  "fetch('/api/leads'",
  "import('/assets/bill-parser.js')",
  "state.a.lead_id=j.lead_id",
  "let au=state.a.usage_timing===0?.62:state.a.usage_timing===1?.42:state.a.usage_timing===2?.54:.48",
];
for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`Missing result-flow marker: ${marker}`);
}

const removed = [
  'MINI DIAGNOSI DALLA BOLLETTA',
  'Confronta con la mia previsione',
  'Vediamo se cambia anche la tua idea',
  'DOPO IL PRIMO DATO',
  'Rivela il mio Punteggio FV',
  'PENSAVI → EMERGE',
  'IL PUNTO CIECO',
  'QUADRO AGGIORNATO',
  'Vedi il mio riepilogo',
];
for (const marker of removed) {
  if (html.includes(marker)) throw new Error(`Obsolete result-flow marker still present: ${marker}`);
}

if (!html.includes("if(n===18)$('#billConfirm').onclick=()=>")) throw new Error('Bill confirmation handler missing');
if (!html.includes("go(24)")) throw new Error('Bill confirmation no longer routes to property step');
if (!html.includes("if(n===26)$('#profileNext').onclick=()=>go(27)")) throw new Error('Profile unlock route missing');
if (!html.includes("if(n===27){track('lead_form_opened');$('#leadSave').onclick=saveLead}")) throw new Error('Lead gate handler missing');
if (html.includes("$('#summaryNext').onclick")) throw new Error('Legacy summary screen remains reachable');

console.log('Result Flow V2 regression: PASS · profile → contact → simulation + personalized reward');
