import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const replaceOnce = (from, to, label) => {
  if (html.includes(to)) return;
  if (!html.includes(from)) throw new Error(`Could not locate ${label}`);
  html = html.replace(from, to);
};

const oldUploadStart = 'async function uploadBill(file){';
const oldUploadEnd = 'async function addressSearch(q){';
const uploadStart = html.indexOf(oldUploadStart);
const uploadEnd = html.indexOf(oldUploadEnd);
if (uploadStart >= 0 && uploadEnd > uploadStart && !html.includes('function parseProgressMarkup(')) {
  const replacement = `function parseProgressMarkup(active,label){
  const stages=[['prepare','Preparazione'],['read','Lettura'],['ocr','Eventuale OCR'],['done','Dati trovati']];
  return '<div class="parse-state" role="status" aria-live="polite"><ol class="parse-flow">'+stages.map(([key,text])=>'<li class="'+(key===active?'active ':'')+(active==='done'?'complete ':'')+'"><span></span>'+text+'</li>').join('')+'</ol><p>'+label+'</p></div>';
}
async function uploadBill(file){
  const st=$('#uploadStatus');
  st.className='status parsing';
  st.innerHTML=parseProgressMarkup('prepare','Prepariamo il file sul tuo dispositivo…');
  st.setAttribute('aria-busy','true');
  track('bill_upload_started',{processing:'browser-local'});
  try{
    const {parseBillFile}=await import('/assets/bill-parser.js');
    const j=await parseBillFile(file,{onProgress:(p)=>{
      if(!st)return;
      if(p.stage==='pdf') st.innerHTML=parseProgressMarkup('read','Leggiamo il testo disponibile nel PDF…');
      else if(p.stage==='ocr-start') st.innerHTML=parseProgressMarkup('ocr','Il documento richiede una lettura visiva locale. Può servire qualche istante.');
      else if(p.stage==='ocr-page') st.innerHTML=parseProgressMarkup('ocr','Lettura locale della pagina '+p.page+' di '+p.pages+'…');
      else if(p.stage==='ocr') st.innerHTML=parseProgressMarkup('ocr','Lettura locale · pagina '+(p.page||1)+' di '+(p.pages||1)+' · '+p.progress+'%');
      else if(p.stage==='done') st.innerHTML=parseProgressMarkup('done','Dati trovati. Ora puoi verificarli.');
    }});
    if(!j.fields)j.fields={};
    state.bill=j;
    state.billConfirmed=false;
    st.setAttribute('aria-busy','false');
    track('bill_parse_success',{supplier:j.supplier||null,parser_mode:j.parser_mode||null,processing:'browser-local'});
    go(18);
  }catch(e){
    st.className='status error';
    st.setAttribute('aria-busy','false');
    st.innerHTML='<b>Non siamo riusciti a leggere questa bolletta.</b><br><span>Il file è rimasto sul tuo dispositivo. Prova di nuovo con un PDF o una foto più nitida.</span>';
    const input=$('#billFile');if(input)input.value='';
    track('bill_parse_failed',{stage:'local_parse',processing:'browser-local'});
  }
}
`;
  html = html.slice(0, uploadStart) + replacement + html.slice(uploadEnd);
}

replaceOnce(
  'Prima di usare i dati ti mostreremo cosa abbiamo rilevato.',
  'La lettura avviene direttamente nel tuo browser. Prima di usare i dati ti mostreremo cosa abbiamo rilevato.',
  'browser-local upload copy'
);
replaceOnce(
  'Nessuna richiesta di preventivo · nessuna chiamata commerciale in questa fase.',
  'Il file resta nel tuo dispositivo durante la lettura · nessun servizio OCR esterno · nessuna chiamata commerciale in questa fase.',
  'external OCR reassurance'
);
replaceOnce(
  "let timer;$('#addressSearch').oninput=()=>{",
  "let timer;if($('#addressSearch')&&state.cfg?.address_autocomplete)$('#addressSearch').oninput=()=>{",
  'address autocomplete guard'
);

html = html.replace("version:state.cfg?.privacy_version||'v1.6'", "version:state.cfg?.privacy_version||'v1.8'");
html = html.replace("version:state.cfg?.privacy_version||'v1.7'", "version:state.cfg?.privacy_version||'v1.8'");

replaceOnce(
  "bill_summary:{supplier:state.bill?.supplier||null,annual_kwh:billVal('annual_kwh'),annual_spend:billVal('annual_spend')}",
  "bill_summary:{supplier:state.bill?.supplier||null,parser_mode:state.bill?.parser_mode||null,annual_kwh:billVal('annual_kwh'),annual_spend:billVal('annual_spend'),coverage_months:billVal('coverage_months'),period_kwh:billVal('period_kwh'),bill_amount:billVal('bill_amount'),power_kw:billVal('power_kw'),f1_kwh:billVal('f1_kwh'),f2_kwh:billVal('f2_kwh'),f3_kwh:billVal('f3_kwh'),supply_address:billVal('supply_address')}",
  'expanded lead bill summary'
);
replaceOnce(
  "state.a.commercial_request=commercial;track('lead_completed',{commercial_fv_request:commercial});go(28)",
  "state.a.commercial_request=commercial;state.a.lead_id=j.lead_id||null;track('lead_completed',{commercial_fv_request:commercial,adapter:j.adapter||null,persisted:Boolean(j.persisted)});go(28)",
  'lead persistence acknowledgement'
);

html = html.replace(
  'Metti alla prova quello che pensi di sapere sul fotovoltaico. Scopri quanto sei pronto, dove puoi migliorare il tuo progetto e se la soluzione che immagini regge ai dati.',
  'Parti dalla tua idea, confrontala con la bolletta e scopri quanto il tuo caso è già definito.'
);
html = html.replace('Punteggio FV /100 · sorpresa ECON da sbloccare', 'La bolletta entra nel test · sorpresa ECON alla fine');
html = html.replaceAll("window.scrollTo({top:0,behavior:'smooth'})", "window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})");
html = html.replaceAll('PUNTEGGIO FV 🔒', 'PUNTEGGIO FV · DA SBLOCCARE');
html = html.replaceAll('SORPRESA 🔒', 'SORPRESA · ALLA FINE');
html = html.replaceAll('<b>🔒</b>', '<b>DA SBLOCCARE</b>');
html = html.replaceAll('<b>✓</b>', '<b>DEFINITO</b>');
html = html.replace('LA TUA PREVISIONE', 'PENSAVI');
html = html.replace('Quanto della tua idea regge ai dati?', 'Cosa pensavi. Cosa emerge dai dati.');
html = html.replace('<div class="score">${state.score}<small>/100</small></div>', '<div class="score" aria-label="Punteggio FV ${state.score} su 100"><span>${state.score}</span><small>/100</small></div>');

const v2Css = String.raw`<style id="econ-v2">
:root{--page:#edf4e9;--surface:#fff;--ink:#10240e;--muted-strong:#4b6047;--focus:#6da928;--shadow:0 22px 70px rgba(4,61,0,.12)}
html{scroll-behavior:smooth}
body{min-width:320px;background:var(--page);font-size:16px}
button,input,summary{font:inherit}
button{-webkit-tap-highlight-color:transparent}
button:focus-visible,input:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
.app{padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));align-items:start}
.shell{width:min(720px,100%);min-height:calc(100svh - 16px);border:1px solid rgba(4,61,0,.08);box-shadow:var(--shadow)}
.top{position:relative;grid-template-columns:48px 1fr 72px;padding:14px 18px 10px}
.brand{line-height:1.25;letter-spacing:.08em}.brand::first-line{font-size:15px;letter-spacing:.14em}
.phase{font-weight:700;color:var(--muted-strong)}
.back{min-width:44px;min-height:44px;transition:transform .16s ease,background .16s ease}.back:active{transform:scale(.95)}
.progress{height:6px;border-radius:999px;overflow:hidden;background:#e4ece0}.progress i{border-radius:inherit;box-shadow:none}
.view{padding:clamp(20px,5vw,38px) clamp(18px,5vw,42px) calc(24px + env(safe-area-inset-bottom));animation:screen-in .28s ease both}
.view>h1,.view>h2{max-width:15ch;text-wrap:balance}.view>p{max-width:58ch}
.kicker{display:inline-flex;align-self:flex-start;margin-bottom:14px;padding:7px 10px;border-radius:999px;background:var(--soft);font-size:11px;letter-spacing:.1em}
h1{font-size:clamp(43px,12vw,68px);line-height:.94}h2{font-size:clamp(32px,8.6vw,48px);line-height:1}h3{line-height:1.15}
p{color:#2f452c}.lead{font-size:clamp(18px,4.8vw,22px);line-height:1.3}.small{font-size:13px}.micro{font-size:13px;color:var(--muted-strong)}
.accent{color:#6aa51f}
.options{gap:10px;margin-top:20px}.option{position:relative;min-height:56px;padding:15px 48px 15px 16px;border-width:1.5px;transition:transform .14s ease,border-color .14s ease,background .14s ease,box-shadow .14s ease}.option::after{content:'';position:absolute;right:17px;top:50%;width:18px;height:18px;border:1.5px solid #a8baa2;border-radius:50%;transform:translateY(-50%)}.option.selected{border-color:var(--d);background:#f2f8ed;box-shadow:inset 5px 0 var(--l)}.option.selected::after{border:5px solid var(--d);background:var(--l)}.option:active{transform:scale(.992)}.option b{font-size:16px;line-height:1.25}.option span{margin-top:5px;font-size:13px;line-height:1.35}
.continue-pill{position:sticky;bottom:max(10px,env(safe-area-inset-bottom));z-index:5;width:100%;min-height:54px;padding:14px 18px;background:var(--d);box-shadow:0 12px 30px rgba(4,61,0,.22);text-align:center}
.actions{position:sticky;bottom:0;z-index:4;margin-top:auto;padding-top:18px;padding-bottom:max(2px,env(safe-area-inset-bottom));background:linear-gradient(to bottom,rgba(255,255,255,0),#fff 18px)}
.btn{min-height:56px;border-radius:16px;box-shadow:0 10px 24px rgba(4,61,0,.14);transition:transform .14s ease,background .14s ease}.btn:hover{background:#0b5105}.btn:active{transform:translateY(1px) scale(.995)}.btn.secondary{box-shadow:none}.btn.secondary:hover{background:var(--soft)}
.field-label{display:block;margin-top:11px;color:var(--d);font-size:13px;font-weight:700}.field-label .field{margin-top:6px}.field{min-height:52px;margin:6px 0 2px;border-radius:13px;border-color:#aebfa8}.field::placeholder{color:#687963}.field:focus{outline:none;box-shadow:0 0 0 3px rgba(141,198,63,.28);border-color:var(--d)}
.card{border-radius:18px;padding:17px}.white-card{box-shadow:0 12px 32px rgba(4,61,0,.06)}.dark-card{background:var(--d);box-shadow:0 18px 42px rgba(4,61,0,.2)}
.row{padding:12px 0}.row span{font-size:12px;line-height:1.35}.row b{max-width:58%;line-height:1.3}
.source-direct,.source-derived,.source-confirmed{display:inline-block;margin-top:5px;padding:4px 7px;border-radius:6px;font-size:10px!important;font-weight:700;letter-spacing:.04em}.source-direct{background:#e7f4db;color:var(--d)}.source-derived{background:#eef0e8;color:#4e5d48}.source-confirmed{background:var(--d);color:#fff}
.metric-main{font-size:clamp(48px,14vw,76px)}.metric-mini{background:#fff}.metric-mini b{font-size:clamp(26px,7vw,34px)}
.score{display:flex;align-items:flex-end;gap:5px;margin:20px 0 10px;color:var(--d)}.score span{font-size:clamp(94px,27vw,150px);letter-spacing:-.08em}.score small{padding-bottom:13px;font-size:24px}
.upload{position:relative;min-height:154px;padding:31px 20px;border-color:#8fac84;background:#f4faef;display:grid;place-content:center;gap:4px}.upload::before{content:'PDF · JPG · PNG';display:block;margin:0 auto 10px;padding:5px 8px;border-radius:6px;background:var(--d);color:#fff;font-size:10px;font-weight:700;letter-spacing:.08em}.upload b{font-size:20px;color:var(--d)}
.status{font-size:13px;line-height:1.45}.status.error{padding:14px;border:1px solid #e2b4aa;border-radius:12px;background:#fff5f2}.parse-state{padding:14px;border:1px solid var(--line);border-radius:16px;background:#fff}.parse-state p{margin:12px 0 0;font-size:13px}.parse-flow{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:0;padding:0;list-style:none}.parse-flow li{position:relative;padding-top:18px;color:#748170;font-size:10px;text-align:center}.parse-flow li span{position:absolute;top:0;left:50%;width:10px;height:10px;border:2px solid #b8c7b3;border-radius:50%;background:#fff;transform:translateX(-50%)}.parse-flow li:not(:last-child)::after{content:'';position:absolute;top:4px;left:58%;width:84%;height:2px;background:#dce5d8}.parse-flow li.active{color:var(--d);font-weight:700}.parse-flow li.active span,.parse-flow li.complete span{border-color:var(--d);background:var(--l)}
.trust{gap:8px}.trust div{padding:11px 13px;border-left:4px solid var(--l);font-size:13px;line-height:1.4}
.notice{border-left:4px solid var(--l);border-radius:12px;background:#f4faef}.component{border-radius:14px}.component header{gap:12px}.component header span:last-child{text-align:right}
details summary{min-height:44px;cursor:pointer;display:flex;align-items:center;color:var(--d)}
.check{min-height:48px;align-items:flex-start;padding:11px 0}.check input{width:22px;height:22px;flex:0 0 auto;accent-color:var(--d)}
.screen-0 .kicker{background:var(--d);color:#fff}.screen-0 h1{max-width:12ch}.screen-0 .lead{margin:18px 0 8px}.screen-0 .hero{margin:12px 0 5px;background:#f2f8ed;border-radius:16px}.screen-0 .hero svg{height:118px}.screen-0 .trust{margin-top:12px}.screen-0 .actions{padding-top:14px}
.screen-17 .card:first-of-type{display:grid;grid-template-columns:1fr 1fr;gap:10px}.screen-17 .card:first-of-type p{margin:5px 0 0}.screen-19 .card{padding:7px 18px}.screen-19 .row{display:grid;grid-template-columns:1fr}.screen-19 .row b{max-width:none;text-align:left;font-size:clamp(28px,8vw,42px)}.screen-19 .row:last-child b{color:var(--l);font-size:clamp(50px,14vw,72px)}
.screen-21{background:linear-gradient(180deg,#fff 0,#fff 62%,#f4faef 100%)}.screen-22 .card:first-of-type .row:first-child{display:grid}.screen-22 .card:first-of-type .row:first-child span{font-weight:700;color:var(--d)}.screen-22 .card:first-of-type .row:first-child b{max-width:none;text-align:left;font-size:22px}.screen-23 .dark-card{position:relative;overflow:hidden}.screen-23 .dark-card::after{content:'';position:absolute;right:-24px;bottom:-24px;width:104px;height:104px;border:18px solid rgba(141,198,63,.23);border-radius:50%}.screen-28 .dark-card{min-height:230px;display:grid;align-content:center}.screen-28 .metric-main{font-size:clamp(34px,10vw,54px)!important;max-width:13ch}
@media(max-width:520px){.app{padding:0}.shell{min-height:100svh;border:0;border-radius:0;box-shadow:none}.top{padding-top:max(12px,env(safe-area-inset-top))}.view{padding-top:18px}.screen-0{padding-top:14px}.screen-0>p:not(.lead){margin:9px 0;font-size:14px;line-height:1.4}.screen-0 .hero{display:none}.screen-0 .trust div:last-child{display:none}.screen-0 .actions{position:static}.two{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}.row b{font-size:14px}.screen-17 .card:first-of-type{font-size:13px}}
@media(min-width:860px){body{background:linear-gradient(90deg,#e8f1e4 0 18%,#f5f8f3 18% 82%,#e8f1e4 82%)}.app{padding:28px}.shell{min-height:min(900px,calc(100svh - 56px));border-radius:28px}.view{padding-left:56px;padding-right:56px}.screen-0 .hero{margin-top:20px}.screen-0 .trust{grid-template-columns:1fr 1fr}.options{grid-template-columns:1fr 1fr}.options .option:last-child:nth-child(odd){grid-column:1/-1}.screen-19 .card{display:grid;grid-template-columns:1fr 1fr;gap:0 28px}.screen-19 .row:last-child{grid-column:1/-1}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.view{animation:none}.progress i,.option,.btn,.back{transition:none}}
@keyframes screen-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
</style>`;

if (!html.includes('id="econ-v2"')) html = html.replace('</head>', `${v2Css}\n</head>`);

const enhancer = `function enhanceV2(n,v){
  document.body.dataset.step=String(n);v.className='view screen-'+n;
  const title=v.querySelector('h1,h2');if(title){title.id='screenTitle';v.setAttribute('aria-labelledby','screenTitle')}
  const progress=$('#progress');if(progress){progress.parentElement.setAttribute('role','progressbar');progress.parentElement.setAttribute('aria-label','Avanzamento del test');progress.parentElement.setAttribute('aria-valuemin','0');progress.parentElement.setAttribute('aria-valuemax','100');progress.parentElement.setAttribute('aria-valuenow',String(Math.round(n/29*100)))}
  v.querySelectorAll('button').forEach(button=>{button.type='button'});
  v.querySelectorAll('.option').forEach(option=>option.setAttribute('aria-pressed',String(option.classList.contains('selected'))));
  v.querySelectorAll('input.field').forEach(input=>{if(input.closest('label'))return;const text=input.placeholder||input.id;const label=document.createElement('label');label.className='field-label';label.htmlFor=input.id;input.before(label);label.textContent=text;label.append(input);input.setAttribute('aria-label',text)});
  v.querySelectorAll('input[type="range"]').forEach(input=>input.setAttribute('aria-label','Livello di sicurezza'));
  v.querySelectorAll('.row small').forEach(tag=>{const text=tag.textContent.trim();if(text==='DATO DA BOLLETTA')tag.classList.add('source-direct');else if(text==='CALCOLATO DA BOLLETTA')tag.classList.add('source-derived');else if(text==='DATO CONFERMATO DALL’UTENTE')tag.classList.add('source-confirmed')});
  const status=v.querySelector('.status');if(status){status.setAttribute('role','status');status.setAttribute('aria-live','polite')}
}`;
if (!html.includes('function enhanceV2(')) html = html.replace('function render(){', `${enhancer}\nfunction render(){`);
html = html.replace('v.innerHTML=h;bind();', 'v.innerHTML=h;enhanceV2(n,v);bind();');

if (!html.includes("const saveButton=$('#leadSave')")) {
  html = html.replace(
    "async function saveLead(){const status=$('#leadStatus'),first=",
    "async function saveLead(){const status=$('#leadStatus'),saveButton=$('#leadSave'),first="
  );
  html = html.replace(
    "status.className='status';status.textContent='Salvataggio…';try{",
    "status.className='status';status.textContent='Salvataggio sicuro del risultato…';saveButton.disabled=true;saveButton.setAttribute('aria-busy','true');try{"
  );
  html = html.replace(
    "status.className='status error';status.textContent='Non siamo riusciti a salvare il risultato. Riprova.';track('lead_save_failed'",
    "status.className='status error';status.textContent='Non siamo riusciti a salvare il risultato. I dati inseriti sono ancora qui: puoi riprovare.';saveButton.disabled=false;saveButton.setAttribute('aria-busy','false');track('lead_save_failed'"
  );
}

const requiredChecks = [
  ["import('/assets/bill-parser.js')", 'Local parser import missing'],
  ['nessun servizio OCR esterno', 'Local-processing trust copy missing'],
  ["power_kw:billVal('power_kw')", 'Expanded lead bill summary missing'],
  ['state.a.lead_id=j.lead_id', 'Lead persistence acknowledgement missing'],
  ['id="econ-v2"', 'V2 design layer missing'],
  ['function enhanceV2(', 'V2 accessibility enhancer missing'],
];
for (const [needle, message] of requiredChecks) if (!html.includes(needle)) throw new Error(message);
if (html.includes('/api/parser/ticket')) throw new Error('Legacy parser ticket still referenced by frontend');

fs.writeFileSync(file, html);
console.log('V2 conversion candidate frontend patch: PASS');
