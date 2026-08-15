import fs from 'node:fs';

const file='public/index.html';
let html=fs.readFileSync(file,'utf8');
const marker='DATA LAYER V3 · idempotent requests + resilient telemetry + richer attribution';
if(html.includes(marker))throw new Error('Data Layer V3 patch already applied');
if(!html.includes('PROFESSIONAL LEAD + BILL ARCHIVE V2'))throw new Error('Data Layer V3 requires Professional Archive V2');

const stateOld="const state={step:0,history:[],session:crypto.randomUUID(),a:{},bill:null,billFile:null,billAttachment:null,billProcessing:null,billConfirmed:false,leadSaving:false,score:0,scoreAfter:0,cfg:null,addressGeo:null};";
const stateNew="const state={step:0,history:[],session:crypto.randomUUID(),a:{},bill:null,billFile:null,billAttachment:null,billProcessing:null,billConfirmed:false,leadSaving:false,leadRequestId:null,score:0,scoreAfter:0,cfg:null,addressGeo:null};";
if(!html.includes(stateOld))throw new Error('Professional state initializer not found');
html=html.replace(stateOld,stateNew);

const attributionOld="const attribution=(()=>{const p=new URLSearchParams(location.search),out={landing_path:location.pathname};for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){const v=p.get(k);if(v)out[k]=v.slice(0,160)}try{if(document.referrer)out.referrer_host=new URL(document.referrer).host.slice(0,160)}catch{}return out})();";
const attributionNew="const attribution=(()=>{const p=new URLSearchParams(location.search),out={landing_path:location.pathname.slice(0,300),locale:(navigator.language||'it-IT').slice(0,40)};for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid']){const v=p.get(k);if(v)out[k]=v.slice(0,240)}try{if(document.referrer)out.referrer_host=new URL(document.referrer).host.slice(0,160)}catch{}return out})();";
if(!html.includes(attributionOld))throw new Error('Attribution initializer not found');
html=html.replace(attributionOld,attributionNew);

const trackOld="function track(event,detail={}){fetch('/api/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session_id:state.session,event,step:state.step,detail}),keepalive:true}).catch(()=>{})}";
const trackNew=`/* ${marker} */\nfunction track(event,detail={}){const clientEventId=crypto.randomUUID(),body=JSON.stringify({client_event_id:clientEventId,session_id:state.session,event,step:state.step,detail});const send=(attempt)=>fetch('/api/events',{method:'POST',headers:{'content-type':'application/json'},body,credentials:'same-origin',keepalive:true}).then(r=>{if(!r.ok&&attempt<1&&(r.status===429||r.status>=500))setTimeout(()=>send(attempt+1),300)}).catch(()=>{if(attempt<1)setTimeout(()=>send(attempt+1),300)});send(0)}`;
if(!html.includes(trackOld))throw new Error('Telemetry track function not found');
html=html.replace(trackOld,trackNew);

const saveLeadMarker='async function saveLead(){if(state.leadSaving)return;';
const submitHelper=String.raw`async function submitLeadPayload(payload){
  let lastResponse=null,lastBody=null,lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const r=await fetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',keepalive:true});
      const j=await r.json().catch(()=>({}));
      if(r.ok||(r.status<500&&r.status!==429))return{r,j};
      lastResponse=r;lastBody=j;
    }catch(e){lastError=e}
    if(attempt===0)await new Promise(resolve=>setTimeout(resolve,350));
  }
  if(lastResponse)return{r:lastResponse,j:lastBody||{}};
  throw lastError||new Error('lead_network_failed');
}
`;
if(!html.includes(saveLeadMarker))throw new Error('saveLead marker not found');
html=html.replace(saveLeadMarker,submitHelper+'\n'+saveLeadMarker);

const payloadOld="const payload={schema:'econ.lead.v1',session_id:state.session,contact:";
const payloadNew="if(!state.leadRequestId)state.leadRequestId=crypto.randomUUID();const payload={schema:'econ.lead.v1',request_id:state.leadRequestId,session_id:state.session,contact:";
if(!html.includes(payloadOld))throw new Error('Lead payload marker not found');
html=html.replace(payloadOld,payloadNew);

const postOld="const r=await fetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),j=await r.json();if(!r.ok)throw Error(j.detail||'lead_failed');";
const postNew="const {r,j}=await submitLeadPayload(payload);if(!r.ok)throw Error(j.detail||'lead_failed');";
if(!html.includes(postOld))throw new Error('Lead POST marker not found');
html=html.replace(postOld,postNew);

const linkageOld="state.a.commercial_request=commercial;state.a.lead_id=j.lead_id||null;track('lead_completed',{commercial_fv_request:commercial,adapter:j.adapter||null,persisted:Boolean(j.persisted),created:j.created!==false,duplicate_suppressed:Boolean(j.duplicate_suppressed)});";
const linkageNew="state.a.commercial_request=commercial;state.a.lead_id=j.lead_id||null;state.a.contact_id=j.contact_id||null;state.a.document_id=j.document_id||null;track('lead_completed',{commercial_fv_request:commercial,adapter:j.adapter||null,persisted:Boolean(j.persisted),created:j.created!==false,duplicate_suppressed:Boolean(j.duplicate_suppressed),request_replayed:Boolean(j.request_replayed),contact_linked:Boolean(j.contact_id),document_linked:Boolean(j.document_id)});";
if(!html.includes(linkageOld))throw new Error('Lead success telemetry marker not found');
html=html.replace(linkageOld,linkageNew);

for(const required of [
  marker,'leadRequestId:null','client_event_id:clientEventId','submitLeadPayload(payload)',
  "request_id:state.leadRequestId",'gclid','fbclid','request_replayed:Boolean(j.request_replayed)',
]){
  if(!html.includes(required))throw new Error(`Data Layer V3 marker missing: ${required}`);
}

fs.writeFileSync(file,html);
console.log('Data Layer V3: PASS · request idempotency · retry-safe events · click-id attribution · resilient lead submit');
