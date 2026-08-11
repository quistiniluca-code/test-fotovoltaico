import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const oldUploadStart = 'async function uploadBill(file){';
const oldUploadEnd = 'async function addressSearch(q){';
const start = html.indexOf(oldUploadStart);
const end = html.indexOf(oldUploadEnd);
if (start < 0 || end < 0 || end <= start) throw new Error('Could not locate uploadBill block');

const replacement = `async function uploadBill(file){
  const st=$('#uploadStatus');
  st.className='status';
  st.textContent='Preparazione lettura locale…';
  track('bill_upload_started',{processing:'browser-local'});
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
    state.bill=j;
    state.billConfirmed=false;
    track('bill_parse_success',{supplier:j.supplier||null,parser_mode:j.parser_mode||null,processing:'browser-local'});
    go(18);
  }catch(e){
    st.className='status error';
    st.textContent='Lettura non riuscita: '+e.message;
    track('bill_parse_failed',{reason:String(e.message).slice(0,120),processing:'browser-local'});
  }
}
`;
html = html.slice(0, start) + replacement + html.slice(end);

html = html.replace(
  'Prima di usare i dati ti mostreremo cosa abbiamo rilevato.',
  'La lettura avviene direttamente nel tuo browser. Prima di usare i dati ti mostreremo cosa abbiamo rilevato.'
);
html = html.replace(
  'Nessuna richiesta di preventivo · nessuna chiamata commerciale in questa fase.',
  'Il file resta nel tuo dispositivo durante la lettura · nessun servizio OCR esterno · nessuna chiamata commerciale in questa fase.'
);

html = html.replace(
  "let timer;$('#addressSearch').oninput=()=>{",
  "let timer;if($('#addressSearch')&&state.cfg?.address_autocomplete)$('#addressSearch').oninput=()=>{"
);

html = html.replace("version:state.cfg?.privacy_version||'v1.6'", "version:state.cfg?.privacy_version||'v1.8'");
html = html.replace("version:state.cfg?.privacy_version||'v1.7'", "version:state.cfg?.privacy_version||'v1.8'");

const oldBillSummary = "bill_summary:{supplier:state.bill?.supplier||null,annual_kwh:billVal('annual_kwh'),annual_spend:billVal('annual_spend')}";
const newBillSummary = "bill_summary:{supplier:state.bill?.supplier||null,parser_mode:state.bill?.parser_mode||null,annual_kwh:billVal('annual_kwh'),annual_spend:billVal('annual_spend'),coverage_months:billVal('coverage_months'),period_kwh:billVal('period_kwh'),bill_amount:billVal('bill_amount'),power_kw:billVal('power_kw'),f1_kwh:billVal('f1_kwh'),f2_kwh:billVal('f2_kwh'),f3_kwh:billVal('f3_kwh')}";
if (!html.includes(oldBillSummary)) throw new Error('Could not locate lead bill_summary payload');
html = html.replace(oldBillSummary, newBillSummary);

const oldLeadSuccess = "state.a.commercial_request=commercial;track('lead_completed',{commercial_fv_request:commercial});go(28)";
const newLeadSuccess = "state.a.commercial_request=commercial;state.a.lead_id=j.lead_id||null;track('lead_completed',{commercial_fv_request:commercial,adapter:j.adapter||null,persisted:Boolean(j.persisted)});go(28)";
if (!html.includes(oldLeadSuccess)) throw new Error('Could not locate lead success handler');
html = html.replace(oldLeadSuccess, newLeadSuccess);

// PRE-LAUNCH HARDENING: the economic simulation must not improve because of the system the user merely imagines.
const oldEconomicAssumption = "let au=state.a.usage_timing===0?.56:state.a.usage_timing===1?.36:.46;const belief=state.a.initial_system_belief;if([1,2,4].includes(belief))au=Math.min(.72,au+.14);const kwp=";
const newEconomicAssumption = "let au=state.a.usage_timing===0?.62:state.a.usage_timing===1?.42:state.a.usage_timing===2?.54:.48;const cur=state.a.current_loads||[];if(cur.includes('ev'))au=Math.min(.68,au+.04);if(cur.includes('heatpump'))au=Math.min(.68,au+.03);const kwp=";
if (!html.includes(oldEconomicAssumption)) throw new Error('Could not locate economic autoconsumption assumptions');
html = html.replace(oldEconomicAssumption, newEconomicAssumption);

// Keep the diagnosis neutral: a bill does not automatically make the scenario attractive.
html = html.replace(
  'La bolletta apre uno scenario <span class=\"accent\">interessante</span>.',
  'Ora possiamo costruire un primo <span class=\"accent\">scenario</span>.'
);

// Use the approved non-absolute goal wording.
html = html.replace('Essere più indipendente dalla rete', 'Aumentare l’indipendenza dalla rete');

// First-party campaign attribution only; no ad-platform identifiers and no PII in analytics.
const stateMarker = "const state={step:0,history:[],session:crypto.randomUUID(),a:{},bill:null,billConfirmed:false,score:0,scoreAfter:0,cfg:null,addressGeo:null};";
if (!html.includes(stateMarker)) throw new Error('Could not locate state initializer');
html = html.replace(stateMarker, `${stateMarker}\nconst attribution=(()=>{const p=new URLSearchParams(location.search),out={landing_path:location.pathname};for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){const v=p.get(k);if(v)out[k]=v.slice(0,160)}try{if(document.referrer)out.referrer_host=new URL(document.referrer).host.slice(0,160)}catch{}return out})();`);

html = html.replace("test:{score:state.scoreAfter||score(),answers:state.a}", "test:{score:state.scoreAfter||score(),answers:{...state.a,address:undefined}}" );
html = html.replace("privacy:{acknowledged:true,version:state.cfg?.privacy_version||'v1.8'},test:", "privacy:{acknowledged:true,version:state.cfg?.privacy_version||'v1.8'},attribution,test:");

// Fail closed if the privacy notice is not configured in runtime config.
const privacyGuard = "if(!first||!last||!mobile||!email||!privacy){";
if (!html.includes(privacyGuard)) throw new Error('Could not locate lead form validation');
html = html.replace(privacyGuard, "if(!state.cfg?.privacy_url||!state.cfg?.privacy_version){status.className='status error';status.textContent='Informativa privacy non configurata. Riprova più tardi.';return}if(!first||!last||!mobile||!email||!privacy){");

// Minimum accessibility hardening for keyboard and form controls.
html = html.replace('.btn:disabled{opacity:.5;cursor:not-allowed}', '.btn:disabled{opacity:.5;cursor:not-allowed}.btn:focus-visible,.option:focus-visible,.back:focus-visible,.continue-pill:focus-visible,.suggestion:focus-visible,.upload:focus-within{outline:3px solid #8DC63F;outline-offset:3px}');
html = html.replace('<input id=\"pred\" class=\"field big-input\" type=\"number\" inputmode=\"numeric\" min=\"1\" placeholder=\"\">', '<input id=\"pred\" class=\"field big-input\" type=\"number\" inputmode=\"numeric\" min=\"1\" placeholder=\"\" aria-label=\"Stima del consumo annuo in kWh\">');
html = html.replace('<input id=\"conf\" type=\"range\" min=\"0\" max=\"100\" value=\"${c}\">', '<input id=\"conf\" type=\"range\" min=\"0\" max=\"100\" value=\"${c}\" aria-label=\"Sicurezza nella scelta prima dei dati\">');
html = html.replace('<input id=\"afterConf\" type=\"range\" min=\"0\" max=\"100\" value=\"${after}\">', '<input id=\"afterConf\" type=\"range\" min=\"0\" max=\"100\" value=\"${after}\" aria-label=\"Sicurezza nella scelta dopo il primo dato\">');
html = html.replace('<input id=\"first\" class=\"field\" placeholder=\"Nome\" autocomplete=\"given-name\">', '<input id=\"first\" class=\"field\" placeholder=\"Nome\" autocomplete=\"given-name\" aria-label=\"Nome\">');
html = html.replace('<input id=\"last\" class=\"field\" placeholder=\"Cognome\" autocomplete=\"family-name\">', '<input id=\"last\" class=\"field\" placeholder=\"Cognome\" autocomplete=\"family-name\" aria-label=\"Cognome\">');
html = html.replace('<input id=\"mobile\" class=\"field\" placeholder=\"Cellulare\" inputmode=\"tel\" autocomplete=\"tel\">', '<input id=\"mobile\" class=\"field\" type=\"tel\" placeholder=\"Cellulare\" inputmode=\"tel\" autocomplete=\"tel\" aria-label=\"Cellulare\">');
html = html.replace('<input id=\"email\" class=\"field\" placeholder=\"Email\" inputmode=\"email\" autocomplete=\"email\">', '<input id=\"email\" class=\"field\" type=\"email\" placeholder=\"Email\" inputmode=\"email\" autocomplete=\"email\" aria-label=\"Email\">');
html = html.replace('<input id=\"addressSearch\" class=\"field\" placeholder=\"Cerca via / piazza e numero civico\" autocomplete=\"off\">', '<input id=\"addressSearch\" class=\"field\" placeholder=\"Cerca via / piazza e numero civico\" autocomplete=\"off\" aria-label=\"Cerca indirizzo immobile\">');
html = html.replace('<input id=\"street\" class=\"field\" placeholder=\"Via / Piazza\">', '<input id=\"street\" class=\"field\" placeholder=\"Via / Piazza\" aria-label=\"Via o piazza\">');
html = html.replace('<input id=\"civic\" class=\"field\" placeholder=\"Civico\">', '<input id=\"civic\" class=\"field\" placeholder=\"Civico\" aria-label=\"Numero civico\">');
html = html.replace('<input id=\"postal\" class=\"field\" placeholder=\"CAP\" inputmode=\"numeric\">', '<input id=\"postal\" class=\"field\" placeholder=\"CAP\" inputmode=\"numeric\" aria-label=\"CAP\">');
html = html.replace('<input id=\"city\" class=\"field\" placeholder=\"Comune\">', '<input id=\"city\" class=\"field\" placeholder=\"Comune\" aria-label=\"Comune\">');

if (!html.includes("import('/assets/bill-parser.js')")) throw new Error('Local parser import missing after patch');
if (html.includes('/api/parser/ticket')) throw new Error('Legacy parser ticket still referenced by frontend');
if (!html.includes('nessun servizio OCR esterno')) throw new Error('Local-processing trust copy missing');
if (!html.includes("power_kw:billVal('power_kw')")) throw new Error('Expanded lead bill summary missing');
if (html.includes("supply_address:billVal('supply_address')")) throw new Error('Redundant supply address must not be stored in bill_summary');
if (!html.includes('state.a.lead_id=j.lead_id')) throw new Error('Lead persistence acknowledgement missing');
if (html.includes("const belief=state.a.initial_system_belief;if([1,2,4].includes(belief))")) throw new Error('Economic result must not depend on imagined system belief');
if (!html.includes('Aumentare l’indipendenza dalla rete')) throw new Error('Approved independence wording missing');
if (!html.includes('const attribution=(()=>')) throw new Error('Campaign attribution capture missing');

fs.writeFileSync(file, html);
console.log('V1.8 prelaunch hardening patch: PASS');
