import fs from 'node:fs';

const html=fs.readFileSync('public/index.html','utf8');

const required=[
  'BILL REVISIT V2 · reversible choice + deferred real bill',
  'function billRouteBack()',
  "state.step===17&&state.a.bill_flow_mode&&state.a.bill_flow_mode!=='choice'",
  'id="billChoiceBack"',
  '← Torna alla scelta',
  '← Torna al test',
  'function openDeferredBill(step)',
  'function billDeferredUploadPrompt()',
  'BOLLETTA RECUPERATA?',
  'Aggiungi la bolletta ora →',
  'Ho recuperato la bolletta · aggiungila ora →',
  "state.a.bill_resume_step=step",
  "track('bill_deferred_upload_opened'",
  "track('bill_deferred_upload_cancelled'",
  "track('bill_deferred_upload_completed'",
  "go(resume,false)",
  "billDeferredUploadPrompt()+(hasBillAddress?",
  "if($('#billAddLater'))$('#billAddLater').onclick=()=>openDeferredBill(state.step)",
  'https://wa.me/393783091137',
  'Invia la bolletta su WhatsApp →',
  'retained_failed_document:Boolean(retainFailed)',
];
for(const token of required){
  if(!html.includes(token))throw new Error(`Bill revisit V2 regression: missing ${token}`);
}

if(html.includes("const chooseMode=(mode)=>{resetBillBaseline();state.a.bill_flow_mode=mode;")){
  throw new Error('Bill revisit V2 regression: choosing a subflow must not destructively reset retained failed-bill state');
}
if(!html.includes("const chooseMode=(mode)=>{const retainFailed=mode==='estimate'&&state.billFile&&state.billProcessing?.parse_status==='parse_failed'")){
  throw new Error('Bill revisit V2 regression: resilient reversible path chooser missing');
}
if(!html.includes("const resume=+state.a.bill_resume_step||0;if(resume){delete state.a.bill_resume_step")){
  throw new Error('Bill revisit V2 regression: confirmed real bill must resume the interrupted step');
}
if((html.match(/https:\/\/wa\.me\/393783091137/g)||[]).length!==1){
  throw new Error('Bill revisit V2 regression: WhatsApp destination must remain unique');
}
if(!html.includes("if(n===18)$('#billConfirm').onclick=()=>")){
  throw new Error('Bill revisit V2 regression: real-bill confirmation flow missing');
}
if(!html.includes("state.a.bill_data_mode='estimate'")){
  throw new Error('Bill revisit V2 regression: estimate mode must remain available');
}
if(!html.includes("state.a.bill_data_mode='bill'")){
  throw new Error('Bill revisit V2 regression: real-bill mode must remain available');
}

console.log('Bill revisit V2 regression: PASS · reversible branch / deferred upload / failed-document retention / exact-step resume');
