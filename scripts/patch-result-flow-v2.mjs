import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const marker = '/* RESULT FLOW V2 · profile → contact → simulation + reward */';
if (html.includes(marker)) throw new Error('Result Flow V2 already present before patch');

const css = String.raw`
${marker}
.result-score-wrap{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:8px 0 14px}
.result-score{font-size:clamp(78px,21vw,112px);font-weight:700;line-height:.82;letter-spacing:-.065em;color:var(--l)}
.result-score small{font-size:22px;letter-spacing:-.02em;color:var(--d)}
.result-band{max-width:210px;text-align:right;font-size:12px;font-weight:700;line-height:1.3;letter-spacing:.04em;text-transform:uppercase;color:var(--d)}
.profile-compact{display:grid;gap:0;margin:10px 0;border:1px solid var(--line);border-radius:20px;background:#fff;overflow:hidden}
.profile-compact .row{padding:11px 14px}
.profile-compact .row span{max-width:42%}
.profile-compact .row b{max-width:58%;font-size:14px}
.result-definition{margin:11px 0 0;font-size:12px;line-height:1.42;color:var(--muted)}
.unlock-card{margin-top:14px;padding:16px;border-radius:20px;background:linear-gradient(145deg,#f7fbea,#fff);border:1px solid var(--line)}
.unlock-label{display:block;margin:0 0 7px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--d)}
.result-mobile{min-height:62px;font-size:20px;font-weight:700;border:2px solid rgba(4,61,0,.22);box-shadow:0 8px 24px rgba(4,61,0,.05)}
.result-secondary{margin-top:8px}
.result-secondary .field{font-size:14px;padding:12px 13px}
.result-cta{min-height:60px;font-size:17px;box-shadow:0 13px 30px rgba(4,61,0,.17)}
.sim-signal{display:inline-flex;align-items:center;gap:7px;margin:3px 0 13px;padding:7px 10px;border-radius:999px;background:var(--soft);color:var(--d);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.sim-signal:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--l);box-shadow:0 0 0 4px rgba(141,198,63,.14)}
.result-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0 12px}
.result-metric{min-width:0;padding:12px 9px;border:1px solid var(--line);border-radius:16px;background:#fff;text-align:center}
.result-metric b{display:block;color:var(--d);font-size:clamp(19px,5vw,27px);line-height:1;letter-spacing:-.04em;white-space:nowrap}
.result-metric span{display:block;margin-top:6px;color:var(--muted);font-size:10px;line-height:1.25}
.result-diagnosis{margin:12px 0;padding:13px 14px;border-left:4px solid var(--l);border-radius:0 15px 15px 0;background:var(--soft)}
.result-diagnosis b{display:block;margin-bottom:4px;color:var(--d);font-size:12px;letter-spacing:.04em;text-transform:uppercase}
.result-diagnosis span{display:block;color:#31452e;font-size:13px;line-height:1.42}
.reward-v2{position:relative;overflow:hidden;margin:14px 0 0;padding:18px;border-radius:22px;background:var(--d);color:#fff;box-shadow:0 16px 38px rgba(4,61,0,.17)}
.reward-v2:after{content:"";position:absolute;right:-28px;top:-40px;width:130px;height:130px;border-radius:50%;background:rgba(141,198,63,.14)}
.reward-v2 small{position:relative;z-index:1;display:block;color:#cfe6c5;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.reward-v2 h3{position:relative;z-index:1;margin:6px 0 8px;color:var(--l);font-size:clamp(27px,7vw,38px);letter-spacing:-.045em}
.reward-v2 p{position:relative;z-index:1;margin:0;color:#e0eddb;font-size:13px;line-height:1.42;max-width:42ch}
@media(max-width:380px){.result-score-wrap{align-items:flex-start;flex-direction:column;gap:8px}.result-band{text-align:left;max-width:none}.result-metrics{gap:6px}.result-metric{padding:10px 6px}.result-metric b{font-size:18px}}
`;

if (!html.includes('</style>')) throw new Error('Could not locate style closing tag');
html = html.replace('</style>', `${css}\n</style>`);

const helpers = String.raw`
function profileOpportunityScore(){
  let n=22;
  const k=+billVal('annual_kwh')||0;
  if(k>=6000)n+=20;else if(k>=4000)n+=17;else if(k>=2500)n+=14;else if(k>=1500)n+=10;else if(k)n+=6;
  n+=({0:12,1:8,2:10,3:3}[state.a.usage_timing]||0);
  n+=({0:10,1:8,2:3,3:4,4:0}[state.a.property_type]||0);
  n+=({0:8,1:5,2:2,3:0}[state.a.roof_decision_authority]||0);
  n+=({0:6,1:4,2:5,3:0}[state.a.roof_type]||0);
  const cur=state.a.current_loads||[],fut=state.a.future_loads||[];
  let curPts=0;if(cur.includes('ev'))curPts+=5;if(cur.includes('heatpump'))curPts+=5;if(cur.includes('climate'))curPts+=2;if(cur.includes('induction'))curPts+=2;if(cur.includes('pool'))curPts+=2;n+=Math.min(10,curPts);
  let futPts=0;if(fut.includes('ev'))futPts+=6;if(fut.includes('heatpump'))futPts+=5;if(fut.includes('climate'))futPts+=3;if(fut.includes('other'))futPts+=4;n+=Math.min(12,futPts);
  n+=({0:6,1:8,2:8,3:8,4:10,5:4}[state.a.primary_goal]||0);
  n+=({0:8,1:6,2:4,3:2,4:1}[state.a.decision_horizon]||0);
  return Math.max(30,Math.min(96,n));
}
function profileOpportunityBand(v){
  if(v>=85)return{label:'OPPORTUNITÀ MOLTO ALTA',headline:'Il tuo caso merita priorità.'};
  if(v>=72)return{label:'ALTA OPPORTUNITÀ',headline:'Il tuo caso merita un approfondimento.'};
  if(v>=58)return{label:'DA APPROFONDIRE',headline:'Ci sono elementi concreti da verificare.'};
  return{label:'DA VALUTARE',headline:'Il tuo caso richiede ancora qualche verifica.'};
}
function profileInsight(){
  const cur=state.a.current_loads||[],fut=state.a.future_loads||[],g=state.a.primary_goal;
  if(fut.includes('ev'))return'La mobilità elettrica entrerà nei tuoi consumi: produzione e ricarica vanno lette come un unico sistema.';
  if(fut.includes('heatpump'))return'I consumi futuri possono crescere con la pompa di calore: il sistema va pensato anche sulla casa che avrai.';
  if(state.a.usage_timing===1&&[1,2].includes(g))return'Consumi soprattutto la sera e cerchi più autonomia: il rapporto tra autoconsumo e accumulo diventa centrale.';
  if(cur.filter(x=>!['none','unknown'].includes(x)).length+fut.filter(x=>!['none','unknown'].includes(x)).length>=3)return'Il tuo profilo integra più carichi elettrici: coordinare produzione, consumi e gestione può fare la differenza.';
  if(state.a.roof_decision_authority===0)return'Hai già controllo sulla decisione dell’immobile: il passo utile ora è verificare il potenziale tecnico ed economico del sistema.';
  return'Consumi, obiettivi e caratteristiche dell’immobile danno già una base concreta per capire quale Sistema Energia approfondire.';
}
function surpriseForProfile(){
  const cur=state.a.current_loads||[],fut=state.a.future_loads||[],g=state.a.primary_goal,b=state.a.initial_system_belief;
  if(fut.includes('ev'))return{title:'WALLBOX',reason:'Hai indicato un veicolo elettrico tra i consumi futuri: la sorpresa è dedicata alla ricarica di casa.'};
  if(fut.includes('heatpump'))return{title:'TERMOSTATO SMART',reason:'Hai indicato una pompa di calore tra gli upgrade futuri: la sorpresa è dedicata alla gestione intelligente del comfort.'};
  if((fut.includes('other')||g===3)&&!cur.includes('induction'))return{title:'PIANO A INDUZIONE',reason:'Hai indicato un’evoluzione dei consumi di casa: la sorpresa accompagna il prossimo passo verso l’elettrificazione.'};
  const complex=cur.filter(x=>!['none','unknown'].includes(x)).length+fut.filter(x=>!['none','unknown'].includes(x)).length>=3||b===4;
  if(complex)return{title:'UPGRADE GESTIONE ENERGIA',reason:'Il tuo profilo combina più carichi e tecnologie: la sorpresa è dedicata al coordinamento del Sistema Energia.'};
  if(state.a.usage_timing===1&&([1,2].includes(g)||[1,2,4].includes(b)))return{title:'ENERGY MONITOR',reason:'Consumi soprattutto la sera e punti all’autonomia: la sorpresa è dedicata alla lettura dei tuoi flussi energetici.'};
  return{title:'CHECK TECNICO PREMIUM',reason:'Il tuo profilo è già definito: la sorpresa è dedicata alla verifica del potenziale reale dell’immobile.'};
}
function economicSignal(e){
  if(!e||!e.payback)return{label:'DA COMPLETARE',copy:'Serve un dato economico utilizzabile per chiudere la simulazione.'};
  if(e.payback<=6)return{label:'POTENZIALE MOLTO ALTO',copy:'Il primo scenario mostra condizioni economiche molto favorevoli da approfondire.'};
  if(e.payback<=8)return{label:'POTENZIALE ALTO',copy:'Il primo scenario mostra condizioni economiche favorevoli da approfondire.'};
  if(e.payback<=10)return{label:'POTENZIALE INTERESSANTE',copy:'Il primo scenario mostra un equilibrio economico che merita una verifica più precisa.'};
  return{label:'DA OTTIMIZZARE',copy:'Il primo scenario richiede una configurazione più precisa per esprimere meglio il potenziale del caso.'};
}
function profileResultBody(score,band){
  const usage=single[6].o[state.a.usage_timing??3]?.[0]||'Da definire',goal=single[9].o[state.a.primary_goal??5]?.[0]||'Da definire',kwh=+billVal('annual_kwh')||0;
  return '<div class="result-score-wrap"><div class="result-score">'+score+'<small>/100</small></div><div class="result-band">'+esc(band.label)+'</div></div>'+
    '<div class="profile-compact"><div class="row"><span>CONSUMO ENERGETICO</span><b>'+(kwh?kwh.toLocaleString('it-IT')+' kWh/anno':'Da definire')+'</b></div><div class="row"><span>PROFILO DI UTILIZZO</span><b>'+esc(usage)+'</b></div><div class="row"><span>OBIETTIVO PRINCIPALE</span><b>'+esc(goal)+'</b></div></div>'+
    '<p class="result-definition">Il punteggio sintetizza quanto il tuo profilo rende utile approfondire il caso con ECON.</p><div class="actions"><button id="profileNext" class="btn result-cta">Sblocca simulazione e sorpresa →</button></div>';
}
function leadUnlockBody(){
  return '<div class="unlock-card"><label class="unlock-label" for="mobile">Numero di cellulare</label><input id="mobile" class="field result-mobile" type="tel" placeholder="Cellulare" inputmode="tel" autocomplete="tel" aria-label="Cellulare"><div class="result-secondary"><div class="two"><input id="first" class="field" placeholder="Nome" autocomplete="given-name" aria-label="Nome"><input id="last" class="field" placeholder="Cognome" autocomplete="family-name" aria-label="Cognome"></div><input id="email" class="field" type="email" placeholder="Email" inputmode="email" autocomplete="email" aria-label="Email"></div></div>'+
    '<label class="check"><input id="privacy" type="checkbox"> <span>Ho preso visione dell’<a id="privacyLink" class="legal-link" href="'+esc(state.cfg?.privacy_url||'#')+'" target="_blank" rel="noopener">informativa privacy</a>.</span></label>'+
    '<p class="micro"><b>Niente spam. Nessuna chiamata commerciale senza una tua richiesta.</b></p>'+
    '<label class="check"><input id="commercial" type="checkbox"> <span>Voglio approfondire con ECON la soluzione più adatta al mio caso.<br><small>Selezionando questa voce chiedi a ECON di contattarti per approfondire il profilo appena costruito.</small></span></label>'+
    '<div id="leadStatus" class="status"></div><div class="actions"><button id="leadSave" class="btn result-cta">Scopri il tuo potenziale con ECON →</button></div>';
}
function economicResultBody(e,signal,surprise){
  let metrics='';
  if(e)metrics='<div class="result-metrics"><div class="result-metric"><b>'+e.kwp.toFixed(1)+' kWp</b><span>Sistema FV indicativo</span></div><div class="result-metric"><b>'+Math.round(e.benefit).toLocaleString('it-IT')+' €</b><span>Beneficio stimato / anno</span></div><div class="result-metric"><b>'+e.payback.toFixed(1)+' anni</b><span>Rientro semplice simulato</span></div></div>';
  else metrics='<div class="notice"><b>Simulazione economica da completare.</b><br><span class="small">Manca un dato economico utilizzabile per chiudere il primo scenario.</span></div>';
  const diagnosis=(e?signal.copy+' ':'')+profileInsight();
  const request=state.a.commercial_request?'<div class="notice"><b>Approfondimento ECON richiesto ✓</b></div>':'';
  return '<div class="sim-signal">'+esc(signal.label)+'</div>'+metrics+'<div class="result-diagnosis"><b>LETTURA ECON</b><span>'+esc(diagnosis)+'</span></div><div class="reward-v2"><small>SORPRESA ECON SBLOCCATA</small><h3>'+esc(surprise.title)+'</h3><p>'+esc(surprise.reason)+'</p></div>'+request;
}
`;

if (!html.includes('function render(){')) throw new Error('Could not locate render function');
html = html.replace('function render(){', `${helpers}\nfunction render(){`);
if (!html.includes('Math.min(100,n/29*100)')) throw new Error('Could not locate progress denominator');
html = html.replace('Math.min(100,n/29*100)', 'Math.min(100,n/28*100)');

function replaceBetween(startMarker,endMarker,replacement,label){
  const start=html.indexOf(startMarker);
  const end=html.indexOf(endMarker,start+startMarker.length);
  if(start<0||end<0||end<=start)throw new Error(`Could not patch ${label}`);
  html=html.slice(0,start)+replacement+html.slice(end);
}

const billConfirmScreen = String.raw`else if(n===18){const f=[['annual_kwh','Consumo di riferimento','kWh'],['annual_spend','Spesa elettrica di riferimento','€'],['period_kwh','Consumo del periodo','kWh'],['bill_amount','Importo fattura','€'],['coverage_months','Copertura','mesi'],['pod','POD',''],['power_kw','Potenza','kW'],['supply_address','Indirizzo di fornitura','']];const rows=f.map(x=>'<div class="row"><span>'+x[1]+'<br><small>'+esc(billSource(x[0]))+'</small></span><b>'+esc(billVal(x[0])||'Non rilevato')+' '+x[2]+'</b></div>').join('');h=frame('DATI LETTI DALLA BOLLETTA','Prima del risultato, <span class="accent">conferma</span> i dati.','Ti mostriamo cosa abbiamo rilevato. Se qualcosa non torna, correggi i tre valori principali.','<div class="card white-card">'+rows+'</div><h3>Correzioni eventuali</h3><div class="two"><input id="cKwh" class="field" inputmode="decimal" placeholder="kWh annui" value="'+esc(billVal('annual_kwh'))+'"><input id="cSpend" class="field" inputmode="decimal" placeholder="Spesa annua €" value="'+esc(billVal('annual_spend'))+'"></div><input id="cMonths" class="field" inputmode="numeric" placeholder="Mesi coperti" value="'+esc(billVal('coverage_months'))+'"><p class="small">Una correzione viene classificata come dato confermato dall’utente.</p><div class="actions"><button id="billConfirm" class="btn">Conferma e continua</button></div>')}
`;
replaceBetween('else if(n===18){','else if(n===24){',billConfirmScreen,'bill confirmation and obsolete result screens');

const resultScreens = String.raw`else if(n===26){state.scoreAfter=profileOpportunityScore();const band=profileOpportunityBand(state.scoreAfter),surprise=surpriseForProfile();state.a.profile_score=state.scoreAfter;state.a.profile_band=band.label;state.a.surprise=surprise.title;h=frame('IL TUO PROFILO ECON',band.headline,'Le tue risposte e i dati disponibili indicano quanto vale la pena approfondire il tuo Sistema Energia con ECON.',profileResultBody(state.scoreAfter,band))}
else if(n===27)h=frame('IL TUO PROFILO È PRONTO','Scopri il tuo <span class="accent">potenziale</span> con ECON.','Collega il risultato a te per sbloccare la simulazione economica e la sorpresa dedicata al tuo profilo.',leadUnlockBody());
else if(n===28){const e=economic(),signal=economicSignal(e),surprise=surpriseForProfile();state.a.surprise=surprise.title;h=frame('IL TUO POTENZIALE ECON','Il primo scenario sta in <span class="accent">piedi</span>?','',economicResultBody(e,signal,surprise))}
`;
replaceBetween('else if(n===26){','\nv.innerHTML=h;bind();}',resultScreens,'three-screen result flow');

const bindStart=html.indexOf('function bind(){');
if(bindStart<0)throw new Error('Could not locate bind function');
const bind18=html.indexOf('if(n===18){',bindStart);
const bind24=html.indexOf('if(n===24){',bind18);
if(bind18<0||bind24<0)throw new Error('Could not locate old result handlers');
const newBillHandler="if(n===18)$('#billConfirm').onclick=()=>{const ck=+$('#cKwh').value,cs=+$('#cSpend').value,cm=+$('#cMonths').value;if(ck)state.bill.fields.annual_kwh={value:ck,source:'DATO CONFERMATO DALL’UTENTE'};if(cs)state.bill.fields.annual_spend={value:cs,source:'DATO CONFERMATO DALL’UTENTE'};if(cm)state.bill.fields.coverage_months={value:cm,source:'DATO CONFERMATO DALL’UTENTE'};state.billConfirmed=true;track('bill_data_confirmed');go(24)}";
html=html.slice(0,bind18)+newBillHandler+html.slice(bind24);

const bindStart2=html.indexOf('function bind(){');
const bind26=html.indexOf('if(n===26)',bindStart2);
const bindEnd=html.indexOf('}\nasync function uploadBill',bind26);
if(bind26<0||bindEnd<0)throw new Error('Could not locate final result handlers');
const newResultHandlers="if(n===26)$('#profileNext').onclick=()=>go(27);if(n===27){track('lead_form_opened');$('#leadSave').onclick=saveLead}";
html=html.slice(0,bind26)+newResultHandlers+html.slice(bindEnd);

for(const oldCopy of ['MINI DIAGNOSI DALLA BOLLETTA','Confronta con la mia previsione','Vediamo se cambia anche la tua idea','DOPO IL PRIMO DATO','Rivela il mio Punteggio FV','PENSAVI → EMERGE','IL PUNTO CIECO','QUADRO AGGIORNATO','Vedi il mio riepilogo']){
  if(html.includes(oldCopy))throw new Error(`Obsolete result copy still present: ${oldCopy}`);
}
for(const required of ['IL TUO PROFILO ECON','Sblocca simulazione e sorpresa','Scopri il tuo potenziale con ECON','SORPRESA ECON SBLOCCATA','WALLBOX','PIANO A INDUZIONE','TERMOSTATO SMART','ENERGY MONITOR','CHECK TECNICO PREMIUM','UPGRADE GESTIONE ENERGIA']){
  if(!html.includes(required))throw new Error(`Result Flow V2 marker missing: ${required}`);
}

fs.writeFileSync(file,html);
console.log('Result Flow V2 patch: PASS · profile → contact → simulation + personalized reward');
