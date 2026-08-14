import fs from 'node:fs';

const file='public/index.html';
let html=fs.readFileSync(file,'utf8');
const marker='BILL REVISIT V2 · reversible choice + deferred real bill';

for(const dependency of [
  'BILL FALLBACK V1 · optional bill + qualified estimate',
  'LAUNCH UX POLISH V5 · final visual + journey',
  'ADDRESS FLOW V2 · OCR-first + manual fallback',
]){
  if(!html.includes(dependency))throw new Error(`Bill revisit V2 requires ${dependency}`);
}
if(html.includes(marker))throw new Error('Bill revisit V2 already applied');

const oldBack="function back(){if(!state.history.length)return;state.step=state.history.pop();render();window.scrollTo({top:0})}";
const newBack=String.raw`function billRouteBack(){
  const resume=+state.a.bill_resume_step||0;
  if(resume){
    delete state.a.bill_resume_step;
    state.a.bill_flow_mode='estimate';
    if(state.history[state.history.length-1]===resume)state.history.pop();
    state.step=resume;
    render();
    track('bill_deferred_upload_cancelled',{resume_step:resume});
    window.scrollTo({top:0});
    return;
  }
  state.a.bill_flow_mode='choice';
  render();
  track('bill_path_reopened',{from:'bill_subflow'});
  window.scrollTo({top:0});
}
function back(){
  if(state.step===17&&state.a.bill_flow_mode&&state.a.bill_flow_mode!=='choice'){billRouteBack();return}
  if(!state.history.length)return;
  state.step=state.history.pop();
  render();
  window.scrollTo({top:0});
}`;
if(!html.includes(oldBack))throw new Error('Could not locate global back handler');
html=html.replace(oldBack,newBack);

const gatewayStart="function billGatewayScreen(){\n  const mode=state.a.bill_flow_mode||'choice';";
const gatewayStartNew="function billGatewayScreen(){\n  const mode=state.a.bill_flow_mode||'choice';\n  const localBackLabel=state.a.bill_resume_step?'← Torna al test':'← Torna alla scelta';";
if(!html.includes(gatewayStart))throw new Error('Could not locate bill gateway header');
html=html.replace(gatewayStart,gatewayStartNew);

const uploadStart="'<div class=\"bill-mode-chip\">DATI DA BOLLETTA</div>";
const uploadStartNew="'<button id=\"billChoiceBack\" class=\"bill-local-back\" type=\"button\">'+esc(localBackLabel)+'</button><div class=\"bill-mode-chip\">DATI DA BOLLETTA</div>";
if(!html.includes(uploadStart))throw new Error('Could not locate upload subflow body');
html=html.replace(uploadStart,uploadStartNew);

const estimateStart="'<div class=\"bill-estimate-card\">";
const estimateStartNew="'<button id=\"billChoiceBack\" class=\"bill-local-back\" type=\"button\">'+esc(localBackLabel)+'</button><div class=\"bill-estimate-card\">";
if(!html.includes(estimateStart))throw new Error('Could not locate estimate subflow body');
html=html.replace(estimateStart,estimateStartNew);

const oldChoose="const chooseMode=(mode)=>{resetBillBaseline();state.a.bill_flow_mode=mode;track('bill_path_selected',{mode});render()};";
const newChoose="const chooseMode=(mode)=>{state.a.bill_flow_mode=mode;track('bill_path_selected',{mode});render()};";
if(!html.includes(oldChoose))throw new Error('Could not locate bill path chooser');
html=html.replace(oldChoose,newChoose);

const helperInsert=String.raw`
function openDeferredBill(step){
  if(state.a.bill_data_mode!=='estimate')return;
  state.a.bill_resume_step=step;
  state.a.bill_flow_mode='upload';
  track('bill_deferred_upload_opened',{from_step:step});
  go(17);
}
function billDeferredUploadPrompt(){
  if(state.a.bill_data_mode!=='estimate')return'';
  return '<div class="bill-later-prompt"><div><span class="bill-later-kicker">BOLLETTA RECUPERATA?</span><b>Puoi sostituire la stima con i dati reali.</b><span>La aggiungiamo senza ricominciare il test e poi torni esattamente qui.</span></div><button id="billAddLater" class="bill-later-action" type="button">Aggiungi la bolletta ora →</button></div>';
}
`;
if(!html.includes('function billGatewayScreen(){'))throw new Error('Could not locate bill gateway for deferred helper insertion');
html=html.replace('function billGatewayScreen(){',`${helperInsert}\nfunction billGatewayScreen(){`);

const qualityReturn="  return '<div class=\"bill-quality-note\" role=\"note\"><span class=\"bill-quality-badge\">STIMA PRELIMINARE</span><span>'+esc(copy)+'</span></div>';";
const qualityReturnNew="  const addReal=state.step===26?'<button id=\"billAddLater\" class=\"bill-quality-action\" type=\"button\">Ho recuperato la bolletta · aggiungila ora →</button>':'';\n  return '<div class=\"bill-quality-note\" role=\"note\"><span class=\"bill-quality-badge\">STIMA PRELIMINARE</span><span>'+esc(copy)+'</span></div>'+addReal;";
if(!html.includes(qualityReturn))throw new Error('Could not locate preliminary quality note');
html=html.replace(qualityReturn,qualityReturnNew);

const addressBody="'Conferma l’indirizzo dell’immobile. Se è presente in bolletta lo precompiliamo automaticamente; altrimenti bastano quattro campi.',(hasBillAddress?";
const addressBodyNew="'Conferma l’indirizzo dell’immobile. Se è presente in bolletta lo precompiliamo automaticamente; altrimenti bastano quattro campi.',billDeferredUploadPrompt()+(hasBillAddress?";
if(!html.includes(addressBody))throw new Error('Could not locate address body for deferred bill prompt');
html=html.replace(addressBody,addressBodyNew);

const bindToken='function bind(){';
const bindNew="function bind(){if($('#billChoiceBack'))$('#billChoiceBack').onclick=billRouteBack;if($('#billAddLater'))$('#billAddLater').onclick=()=>openDeferredBill(state.step);";
if(!html.includes(bindToken))throw new Error('Could not locate bind function for revisit handlers');
html=html.replace(bindToken,bindNew);

const confirmTail="track('bill_data_confirmed');go(24)";
const confirmTailNew="track('bill_data_confirmed');const resume=+state.a.bill_resume_step||0;if(resume){delete state.a.bill_resume_step;if(state.history[state.history.length-1]===17)state.history.pop();if(state.history[state.history.length-1]===resume)state.history.pop();go(resume,false);track('bill_deferred_upload_completed',{resume_step:resume})}else go(24)";
if(!html.includes(confirmTail))throw new Error('Could not locate bill confirmation route');
html=html.replace(confirmTail,confirmTailNew);

const css=String.raw`
/* ${marker} */
.bill-local-back{display:inline-flex;align-items:center;width:max-content;max-width:100%;margin:0 0 9px;padding:5px 0;border:0;background:transparent;color:var(--d);font:700 11.5px/1.2 Arimo,Arial,sans-serif;cursor:pointer;text-decoration:none}
.bill-local-back:hover{text-decoration:underline;text-underline-offset:3px}
.bill-local-back:focus-visible,.bill-later-action:focus-visible,.bill-quality-action:focus-visible{outline:3px solid var(--l);outline-offset:3px}
.bill-later-prompt{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;margin:0 0 11px;padding:11px 12px;border:1px solid var(--line);border-radius:15px;background:#fff;box-shadow:0 7px 18px rgba(4,61,0,.04)}
.bill-later-prompt>div{display:grid;gap:2px;min-width:0}
.bill-later-kicker{color:var(--d);font-size:8.5px;font-weight:700;letter-spacing:.075em;text-transform:uppercase}
.bill-later-prompt b{color:var(--d);font-size:11.5px;line-height:1.2}
.bill-later-prompt>div>span:last-child{color:var(--muted);font-size:9.5px;line-height:1.25}
.bill-later-action,.bill-quality-action{border:1px solid var(--d);border-radius:999px;background:#fff;color:var(--d);font:700 10.5px/1.2 Arimo,Arial,sans-serif;cursor:pointer}
.bill-later-action{padding:9px 11px;white-space:nowrap}
.bill-quality-action{display:block;width:100%;margin:5px 0 8px;padding:8px 10px}
.bill-later-action:hover,.bill-quality-action:hover{background:var(--soft)}
@media(max-width:520px){
  .bill-local-back{margin-bottom:6px;font-size:10.5px}
  .bill-later-prompt{grid-template-columns:1fr;gap:7px;margin-bottom:8px;padding:9px 10px;border-radius:13px}
  .bill-later-action{width:100%;padding:8px 10px;white-space:normal}
  .bill-quality-action{margin:4px 0 6px;padding:7px 9px;font-size:10px}
}
@media(max-width:520px) and (max-height:700px){
  .bill-local-back{margin-bottom:4px;padding:3px 0;font-size:10px}
  .bill-later-prompt{gap:5px;margin-bottom:5px;padding:7px 8px}
  .bill-later-prompt>div>span:last-child{font-size:8.7px}
  .bill-later-action{padding:6px 8px;font-size:9.5px}
}
`;
if(!html.includes('</style>'))throw new Error('Could not locate style closing tag for bill revisit V2');
html=html.replace('</style>',`${css}\n</style>`);

for(const required of [
  marker,
  'function billRouteBack()',
  "state.step===17&&state.a.bill_flow_mode&&state.a.bill_flow_mode!=='choice'",
  'id="billChoiceBack"',
  '← Torna alla scelta',
  'function openDeferredBill(step)',
  'function billDeferredUploadPrompt()',
  'Aggiungi la bolletta ora →',
  "state.a.bill_resume_step=step",
  "go(resume,false)",
  "track('bill_deferred_upload_completed'",
  "if($('#billAddLater'))$('#billAddLater').onclick=()=>openDeferredBill(state.step)",
]){
  if(!html.includes(required))throw new Error(`Bill revisit V2 marker missing: ${required}`);
}
if(html.includes(oldChoose))throw new Error('Bill path chooser still destroys reversible state');

fs.writeFileSync(file,html);
console.log('Bill revisit V2: PASS · reversible gateway · back behavior · deferred real-bill insertion · resume in place');
