import fs from 'node:fs';

const file='public/index.html';
let html=fs.readFileSync(file,'utf8');
const marker='PROFESSIONAL LEAD + BILL ARCHIVE V1';
if(html.includes(marker))throw new Error('Professional archive patch already applied');
for(const dependency of [
  'BILL REVISIT V2 · reversible choice + deferred real bill',
  'BILL FALLBACK V1 · optional bill + qualified estimate',
]){
  if(!html.includes(dependency))throw new Error(`Professional archive requires ${dependency}`);
}

const stateOld="const state={step:0,history:[],session:crypto.randomUUID(),a:{},bill:null,billConfirmed:false,score:0,scoreAfter:0,cfg:null,addressGeo:null};";
const stateNew="const state={step:0,history:[],session:crypto.randomUUID(),a:{},bill:null,billFile:null,billAttachment:null,billConfirmed:false,leadSaving:false,score:0,scoreAfter:0,cfg:null,addressGeo:null};";
if(!html.includes(stateOld))throw new Error('State initializer not found');
html=html.replace(stateOld,stateNew);

const uploadMarker='async function uploadBill(file){';
if(!html.includes(uploadMarker))throw new Error('uploadBill function not found');
const helper=String.raw`
/* ${marker} */
async function archiveBillFile(file,privacyVersion){
  const fd=new FormData();
  fd.append('session_id',state.session);
  fd.append('privacy_acknowledged','true');
  fd.append('privacy_version',privacyVersion||'');
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
html=html.replace(uploadMarker,helper+'\n'+uploadMarker);

const parseSuccess="    if(!j.fields)j.fields={};\n    clearBillEstimateMetadata();";
const keepFile="    if(!j.fields)j.fields={};\n    state.billFile=file;\n    state.billAttachment=null;\n    clearBillEstimateMetadata();";
if(!html.includes(parseSuccess))throw new Error('Local bill parser success marker not found');
html=html.replace(parseSuccess,keepFile);

const saveStart="async function saveLead(){const status=$('#leadStatus'),first=";
const saveGuard="async function saveLead(){if(state.leadSaving)return;const status=$('#leadStatus'),first=";
if(!html.includes(saveStart))throw new Error('saveLead start marker not found');
html=html.replace(saveStart,saveGuard);

const validationTail="status.textContent='Completa i dati e conferma la presa visione privacy.';return}const payload={";
const archiveBeforePayload=String.raw`status.textContent='Completa i dati e conferma la presa visione privacy.';return}
state.leadSaving=true;const saveButton=$('#leadSave');if(saveButton)saveButton.disabled=true;
if(state.a.bill_data_mode==='bill'&&!state.billAttachment){
  if(!state.billFile){state.leadSaving=false;if(saveButton)saveButton.disabled=false;status.className='status error';status.textContent='La bolletta letta non è più disponibile. Ricaricala prima di salvare.';return}
  status.className='status';status.textContent='Archiviazione sicura della bolletta…';
  try{
    state.billAttachment=await archiveBillFile(state.billFile,state.cfg?.privacy_version||'');
    track('bill_archive_success',{content_type:state.billAttachment.content_type,size_bytes:state.billAttachment.size_bytes,deduplicated:Boolean(state.billAttachment.deduplicated)});
  }catch(e){
    state.leadSaving=false;if(saveButton)saveButton.disabled=false;status.className='status error';status.textContent='Non siamo riusciti ad archiviare la bolletta. Riprova.';track('bill_archive_failed',{reason:String(e.message).slice(0,120)});return
  }
}
const payload={`;
if(!html.includes(validationTail))throw new Error('Lead validation/payload boundary not found');
html=html.replace(validationTail,archiveBeforePayload);

const payloadMarker="property:{address:state.a.address,geo:state.addressGeo},privacy:";
const payloadWithAttachment="property:{address:state.a.address,geo:state.addressGeo},bill_attachment:state.billAttachment||undefined,privacy:";
if(!html.includes(payloadMarker))throw new Error('Lead payload property marker not found');
html=html.replace(payloadMarker,payloadWithAttachment);

const savingMarker="status.className='status';status.textContent='Salvataggio…';try{";
const savingNew="status.className='status';status.textContent='Salvataggio lead e collegamento allegato…';try{";
if(!html.includes(savingMarker))throw new Error('Lead saving marker not found');
html=html.replace(savingMarker,savingNew);

const catchMarker="}catch(e){status.className='status error';status.textContent='Non siamo riusciti a salvare il risultato. Riprova.';track('lead_save_failed',{reason:String(e.message).slice(0,80)})}}";
const catchNew="}catch(e){state.leadSaving=false;if(saveButton)saveButton.disabled=false;status.className='status error';status.textContent='Non siamo riusciti a salvare il risultato. Riprova.';track('lead_save_failed',{reason:String(e.message).slice(0,80)})}}";
if(!html.includes(catchMarker))throw new Error('Lead save catch marker not found');
html=html.replace(catchMarker,catchNew);

html=html.replace(
  'Il file resta sul tuo dispositivo durante la lettura. Nessun OCR esterno.',
  'La lettura avviene localmente nel browser. Se completi il test, il file originale viene archiviato in modo sicuro solo dopo la presa visione dell’informativa privacy.'
);
html=html.replace(
  'Il file resta nel tuo dispositivo durante la lettura · nessun servizio OCR esterno · nessuna chiamata commerciale in questa fase.',
  'Lettura locale nel browser · archivio del file originale solo al salvataggio della lead e dopo la presa visione privacy · nessun OCR esterno.'
);

for(const required of [marker,'billFile:null','billAttachment:null','/api/bill-attachments','privacy_acknowledged','bill_attachment:state.billAttachment||undefined','state.leadSaving=true','bill_archive_success','bill_archive_failed']){
  if(!html.includes(required))throw new Error(`Professional archive marker missing: ${required}`);
}

fs.writeFileSync(file,html);
console.log('Professional archive V1: PASS · privacy-gated bill archive + canonical attachment + double-submit guard');
