import fs from 'node:fs';

const html=fs.readFileSync('public/index.html','utf8');

const required=[
  'BILL FALLBACK V1 · optional bill + qualified estimate',
  'Hai una bolletta a <span class="accent">portata di mano</span>?',
  'Sì, ce l’ho con me',
  'Non ce l’ho con me',
  'Continua con la stima preliminare →',
  'id="billSpendBand"',
  'id="billHousehold"',
  'id="billEstimateContinue"',
  'id="billEstimateSwitch"',
  'id="billUploadSwitch"',
  "parser_mode:'manual-estimate'",
  "state.a.bill_data_mode='estimate'",
  "state.a.bill_data_mode='bill'",
  "state.a.bill_flow_mode='estimate'",
  "track('bill_estimate_completed'",
  "track('bill_path_selected'",
  'function billDataQualityNote()',
  'STIMA PRELIMINARE',
  'Non sono dati letti da una bolletta.',
  'Invia la bolletta su WhatsApp →',
  'https://wa.me/393783091137',
  'function activeJourneySteps()',
  "ECON_JOURNEY_STEPS.filter(step=>step!==18)",
  "if(n===18)$('#billConfirm').onclick=()=>",
  "go(24)",
  "state.a.bill_estimate_household=household",
  "source:'STIMA DA FASCIA DI SPESA MENSILE'",
  "source:'STIMA DICHIARATA DALL’UTENTE'",
];
for(const token of required){
  if(!html.includes(token))throw new Error(`Bill fallback regression: missing ${token}`);
}

if((html.match(/https:\/\/wa\.me\/393783091137/g)||[]).length!==1){
  throw new Error('Bill fallback regression: WhatsApp destination must remain unique');
}
if(!html.includes("if($('#billFile'))$('#billFile').onchange")){
  throw new Error('Bill fallback regression: real-bill upload handler missing');
}
if(!html.includes("if(!spend||!household)")){
  throw new Error('Bill fallback regression: estimate qualification validation missing');
}
if(!html.includes("estimated?'Il tuo scenario è una <span class=\"accent\">stima preliminare</span>.'")){
  throw new Error('Bill fallback regression: final result must disclose estimate mode');
}
if(!html.includes("estimateMode?Math.round(e.benefit/100)*100")){
  throw new Error('Bill fallback regression: estimated economic benefit must reduce false precision');
}
if(!html.includes("estimateMode?(Math.round(e.payback*2)/2).toFixed(1)")){
  throw new Error('Bill fallback regression: estimated payback must reduce false precision');
}
if(html.includes('La bolletta è obbligatoria')){
  throw new Error('Bill fallback regression: bill must not be framed as mandatory');
}

console.log('Bill fallback V1 regression: PASS · optional bill · qualified estimate · transparent economics · conditional WhatsApp CTA');
