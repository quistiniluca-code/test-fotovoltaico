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
const newBillSummary = "bill_summary:{supplier:state.bill?.supplier||null,parser_mode:state.bill?.parser_mode||null,annual_kwh:billVal('annual_kwh'),annual_spend:billVal('annual_spend'),coverage_months:billVal('coverage_months'),period_kwh:billVal('period_kwh'),bill_amount:billVal('bill_amount'),power_kw:billVal('power_kw'),f1_kwh:billVal('f1_kwh'),f2_kwh:billVal('f2_kwh'),f3_kwh:billVal('f3_kwh'),supply_address:billVal('supply_address')}";
if (!html.includes(oldBillSummary)) throw new Error('Could not locate lead bill_summary payload');
html = html.replace(oldBillSummary, newBillSummary);

const oldLeadSuccess = "state.a.commercial_request=commercial;track('lead_completed',{commercial_fv_request:commercial});go(28)";
const newLeadSuccess = "state.a.commercial_request=commercial;state.a.lead_id=j.lead_id||null;track('lead_completed',{commercial_fv_request:commercial,adapter:j.adapter||null,persisted:Boolean(j.persisted)});go(28)";
if (!html.includes(oldLeadSuccess)) throw new Error('Could not locate lead success handler');
html = html.replace(oldLeadSuccess, newLeadSuccess);

if (!html.includes("import('/assets/bill-parser.js')")) throw new Error('Local parser import missing after patch');
if (html.includes('/api/parser/ticket')) throw new Error('Legacy parser ticket still referenced by frontend');
if (!html.includes('nessun servizio OCR esterno')) throw new Error('Local-processing trust copy missing');
if (!html.includes("power_kw:billVal('power_kw')")) throw new Error('Expanded lead bill summary missing');
if (!html.includes('state.a.lead_id=j.lead_id')) throw new Error('Lead persistence acknowledgement missing');

fs.writeFileSync(file, html);
console.log('V1.8 frontend patch: PASS');
