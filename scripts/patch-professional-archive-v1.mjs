import fs from 'node:fs';

const file='public/index.html';
let html=fs.readFileSync(file,'utf8');
const marker='PROFESSIONAL LEAD + BILL ARCHIVE V2';
if(html.includes(marker))throw new Error('Professional archive V2 patch already applied');
for(const dependency of [
  'BILL REVISIT V2 · reversible choice + deferred real bill',
  'BILL FALLBACK V1 · optional bill + qualified estimate',
]){
  if(!html.includes(dependency))throw new Error(`Professional archive V2 requires ${dependency}`);
}

const stateOld="const state={step:0,history:[],session:crypto.randomUUID(),a:{},bill:null,billConfirmed:false,score:0,scoreAfter:0,cfg:null,addressGeo:null};";
const stateNew="const state={step:0,history:[],session:crypto.randomUUID(),a:{},bill:null,billFile:null,billAttachment:null,billProcessing:null,billConfirmed:false,leadSaving:false,score:0,scoreAfter:0,cfg:null,addressGeo:null};";
if(!html.includes(stateOld))throw new Error('State initializer not found');
html=html.replace(stateOld,stateNew);

const uploadMarker='async function uploadBill(file){';
const uploadEndMarker='async function addressSearch(q){';
const uploadStart=html.indexOf(uploadMarker);
const uploadEnd=html.indexOf(uploadEndMarker,uploadStart);
if(uploadStart<0||uploadEnd<0||uploadEnd<=uploadStart)throw new Error('Local uploadBill block not found');

const helper=String.raw`
/* ${marker} */
const BILL_ARCHIVE_MAX_BYTES=4*1024*1024;
function billProcessingSnapshot(){
  const current=state.billProcessing||{};
  const mode=state.a.bill_data_mode==='bill'||state.a.bill_flow_mode==='upload'?'bill':state.a.bill_data_mode==='estimate'||state.a.bill_flow_mode==='estimate'?'estimate':'unknown';
  return{
    schema:'econ.bill.processing.v1',
    parse_status:current.parse_status||'not_attempted',
    parser_mode:current.parser_mode||null,
    parser_version:current.parser_version||null,
    engine:current.engine||null,
    engine_version:current.engine_version||null,
    error_code:current.error_code||null,
    error_detail:current.error_detail||null,
    data_mode:mode,
    data_confirmed:current.data_confirmed===true,
  };
}
async function archiveBillFile(file,privacyVersion){
  const processing=billProcessingSnapshot();
  const fd=new FormData();
  fd.append('session_id',state.session);
  fd.append('privacy_acknowledged','true');
  fd.append('privacy_version',privacyVersion||'');
  fd.append('processing',JSON.stringify(processing));
  fd.append('file',file,file.name||'bolletta');
  const r=await fetch('/api/bill-attachments',{method:'POST',body:fd,credentials:'same-origin'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j?.attachment){
    const e=new Error(j.detail||'Archiviazione della bolletta non riuscita.');
    e.code='bill_archive_failed';
    throw e;
  }
  return {...j.attachment,deduplicated:Boolean(j.deduplicated)};
}
`;

const resilientUpload=String.raw`async function uploadBill(file){
  const st=$('#uploadStatus');
  st.className='status';
  if(file.size>BILL_ARCHIVE_MAX_BYTES){
    st.className='status error';
    st.textContent='Il file supera 4 MB. Usa un PDF, JPG, PNG o WebP fino a 4 MB.';
    track('bill_parse_failed',{reason:'bill_file_too_large',code:'bill_file_too_large',processing:'browser-local',file_retained:false});
    return;
  }
  state.billFile=file;
  state.billAttachment=null;
  state.bill=null;
  state.billConfirmed=false;
  state.billProcessing={schema:'econ.bill.processing.v1',parse_status:'processing',parser_mode:null,parser_version:'econ-bill-parser-v2.0',engine:null,engine_version:null,error_code:null,error_detail:null,data_mode:'bill',data_confirmed:false};
  state.a.bill_document_selected=true;
  st.textContent='Preparazione lettura locale…';
  track('bill_upload_started',{processing:'browser-local',size_bytes:file.size,content_type:file.type||null});
  try{
    const {parseBillFile}=await import('/assets/bill-parser.js');
    const j=await parseBillFile(file,{onProgress:(p)=>{
      if(!st)return;
      if(p.stage==='pdf') st.textContent='Lettura del PDF nel browser…';
      else if(p.stage==='ocr-start') st.textContent='Documento scansionato: avvio OCR locale…';
      else if(p.stage==='ocr-page') st.textContent='OCR locale · pagina '+p.page+' di '+p.pages+'…';
      else if(p.stage==='ocr') st.textContent='OCR locale · pagina '+(p.page||1)+'/'+(p.pages||1)+' · '+p.progress+'%';
      else if(p.stage==='done') st.textContent='Lettura completata.';
    }});
    if(!j.fields)j.fields={};
    state.billProcessing={
      schema:'econ.bill.processing.v1',
      parse_status:'parsed',
      parser_mode:j.parser_mode||null,
      parser_version:j.meta?.parser_version||'econ-bill-parser-v2.0',
      engine:j.meta?.engine||null,
      engine_version:j.meta?.engine_version||null,
      error_code:null,
      error_detail:null,
      data_mode:'bill',
      data_confirmed:false,
    };
    clearBillEstimateMetadata();
    state.bill=j;
    state.a.bill_data_mode='bill';
    state.a.bill_flow_mode='upload';
    delete state.a.bill_parse_status;
    state.billConfirmed=false;
    track('bill_parse_success',{supplier:j.supplier||null,parser_mode:j.parser_mode||null,parser_version:j.meta?.parser_version||null,engine:j.meta?.engine||null,processing:'browser-local'});
    go(18);
  }catch(e){
    const reason=String(e?.message||'lettura non riuscita').slice(0,180);
    const code=String(e?.code||'bill_parse_failed').slice(0,80);
    state.bill=null;
    state.billConfirmed=false;
    state.billProcessing={
      schema:'econ.bill.processing.v1',
      parse_status:'parse_failed',
      parser_mode:null,
      parser_version:'econ-bill-parser-v2.0',
      engine:code.startsWith('ocr_')?'tesseract.js':null,
      engine_version:code.startsWith('ocr_')?'7.0.0':null,
      error_code:code,
      error_detail:reason,
      data_mode:'unknown',
      data_confirmed:false,
    };
    state.a.bill_parse_status='parse_failed';
    st.className='status error';
    st.textContent='La lettura automatica non è riuscita. Puoi riprovare con un altro file oppure continuare con una stima: se completi il test, conserveremo comunque questo documento e lo collegheremo alla lead.';
    track('bill_parse_failed',{reason,code,processing:'browser-local',file_retained:true});
  }
}
`;
html=html.slice(0,uploadStart)+helper+'\n'+resilientUpload+'\n'+html.slice(uploadEnd);

const chooseOld="const chooseMode=(mode)=>{resetBillBaseline();state.a.bill_flow_mode=mode;track('bill_path_selected',{mode});render()};";
const chooseNew="const chooseMode=(mode)=>{const retainFailed=mode==='estimate'&&state.billFile&&state.billProcessing?.parse_status==='parse_failed';const retainedFile=retainFailed?state.billFile:null,retainedProcessing=retainFailed?state.billProcessing:null;resetBillBaseline();state.billFile=retainedFile;state.billAttachment=null;state.billProcessing=retainedProcessing;if(!retainFailed){delete state.a.bill_document_selected;delete state.a.bill_parse_status}state.a.bill_flow_mode=mode;track('bill_path_selected',{mode,retained_failed_document:Boolean(retainFailed)});render()};";
if(!html.includes(chooseOld))throw new Error('Bill path mode handler not found');
html=html.replace(chooseOld,chooseNew);

const confirmationOld="state.billConfirmed=true;track('bill_data_confirmed');render()";
const confirmationNew="state.billConfirmed=true;if(state.billProcessing)state.billProcessing={...state.billProcessing,data_confirmed:true};track('bill_data_confirmed',{parser_mode:state.billProcessing?.parser_mode||null});render()";
if(!html.includes(confirmationOld))throw new Error('Bill confirmation handler not found');
html=html.replace(confirmationOld,confirmationNew);

html=html.replace(/accept=\"application\/pdf,image\/\*\"/g,'accept="application/pdf,image/jpeg,image/png,image/webp"');

const saveStart="async function saveLead(){const status=$('#leadStatus'),first=";
const saveGuard="async function saveLead(){if(state.leadSaving)return;const status=$('#leadStatus'),first=";
if(!html.includes(saveStart))throw new Error('saveLead start marker not found');
html=html.replace(saveStart,saveGuard);

const validationTail="status.textContent='Completa i dati e conferma la presa visione privacy.';return}const payload={";
const archiveBeforePayload=String.raw`status.textContent='Completa i dati e conferma la presa visione privacy.';return}
state.leadSaving=true;const saveButton=$('#leadSave');if(saveButton)saveButton.disabled=true;
if(state.a.bill_data_mode==='bill'&&!state.billFile){state.leadSaving=false;if(saveButton)saveButton.disabled=false;status.className='status error';status.textContent='La bolletta selezionata non è più disponibile. Ricaricala oppure torna indietro e scegli la stima.';return}
state.billProcessing=state.billFile?billProcessingSnapshot():{schema:'econ.bill.processing.v1',parse_status:'not_attempted',parser_mode:null,parser_version:null,engine:null,engine_version:null,error_code:null,error_detail:null,data_mode:state.a.bill_data_mode==='estimate'?'estimate':'unknown',data_confirmed:false};
if(state.billFile&&!state.billAttachment){
  status.className='status';status.textContent=state.billProcessing.parse_status==='parse_failed'?'Archiviazione del documento e salvataggio della lead…':'Archiviazione sicura della bolletta…';
  try{
    state.billAttachment=await archiveBillFile(state.billFile,state.cfg?.privacy_version||'');
    if(state.billAttachment?.processing)state.billProcessing=state.billAttachment.processing;
    track('bill_archive_success',{content_type:state.billAttachment.content_type,size_bytes:state.billAttachment.size_bytes,deduplicated:Boolean(state.billAttachment.deduplicated),parse_status:state.billProcessing?.parse_status||null,data_mode:state.billProcessing?.data_mode||null});
  }catch(e){
    state.leadSaving=false;if(saveButton)saveButton.disabled=false;status.className='status error';status.textContent='Non siamo riusciti ad archiviare il documento. La lead non è stata salvata: riprova senza perdere i dati inseriti.';track('bill_archive_failed',{reason:String(e.message).slice(0,120),parse_status:state.billProcessing?.parse_status||null});return
  }
}
const payload={`;
if(!html.includes(validationTail))throw new Error('Lead validation/payload boundary not found');
html=html.replace(validationTail,archiveBeforePayload);

const payloadMarker="property:{address:state.a.address,geo:state.addressGeo},privacy:";
const payloadWithAttachment="property:{address:state.a.address,geo:state.addressGeo},bill_attachment:state.billAttachment||undefined,bill_processing:state.billProcessing||undefined,privacy:";
if(!html.includes(payloadMarker))throw new Error('Lead payload property marker not found');
html=html.replace(payloadMarker,payloadWithAttachment);

const savingMarker="status.className='status';status.textContent='Salvataggio…';try{";
const savingNew="status.className='status';status.textContent='Salvataggio lead e verifica integrità…';try{";
if(!html.includes(savingMarker))throw new Error('Lead saving marker not found');
html=html.replace(savingMarker,savingNew);

const catchMarker="}catch(e){status.className='status error';status.textContent='Non siamo riusciti a salvare il risultato. Riprova.';track('lead_save_failed',{reason:String(e.message).slice(0,80)})}}";
const catchNew="}catch(e){state.leadSaving=false;if(saveButton)saveButton.disabled=false;status.className='status error';status.textContent='Non siamo riusciti a salvare il risultato. Riprova.';track('lead_save_failed',{reason:String(e.message).slice(0,80)})}}";
if(!html.includes(catchMarker))throw new Error('Lead save catch marker not found');
html=html.replace(catchMarker,catchNew);

html=html.replace(
  'Il file resta sul tuo dispositivo durante la lettura. Nessun OCR esterno.',
  'La lettura avviene localmente nel browser. Il documento viene archiviato solo quando salvi la lead e dopo la presa visione dell’informativa privacy; se la lettura automatica fallisce, il file può comunque essere conservato.'
);
html=html.replace(
  'Il file resta nel tuo dispositivo durante la lettura · nessun servizio OCR esterno · nessuna chiamata commerciale in questa fase.',
  'Lettura locale nel browser · archivio del documento al salvataggio della lead dopo la privacy · il file non viene perso se l’OCR fallisce.'
);

for(const required of [
  marker,'BILL_ARCHIVE_MAX_BYTES','billFile:null','billAttachment:null','billProcessing:null',
  '/api/bill-attachments','privacy_acknowledged','processing',
  'bill_attachment:state.billAttachment||undefined','bill_processing:state.billProcessing||undefined',
  'state.leadSaving=true','bill_archive_success','bill_archive_failed','file_retained:true',
  "parse_status:'parse_failed'","parse_status:'not_attempted'",
]){
  if(!html.includes(required))throw new Error(`Professional archive V2 marker missing: ${required}`);
}

fs.writeFileSync(file,html);
console.log('Professional archive V2: PASS · OCR-failure retention + privacy-gated Blob + DB processing trace + double-submit guard');
