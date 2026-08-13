import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
const marker = 'ADDRESS FLOW V2 · OCR-first + manual fallback';
if (html.includes(marker)) throw new Error('Address Flow V2 already applied');

const css = String.raw`
/* ${marker} */
.address-source{margin:8px 0 11px;padding:10px 12px;border-left:4px solid var(--l);border-radius:0 14px 14px 0;background:var(--soft);font-size:12px;line-height:1.35;color:#31452e}
.address-source b{display:block;margin-bottom:2px;color:var(--d)}
.address-grid{display:grid;grid-template-columns:minmax(0,3fr) minmax(88px,1fr);gap:8px}
.address-locality{display:grid;grid-template-columns:minmax(0,2fr) minmax(88px,1fr);gap:8px}
.address-field{min-width:0}
.address-field label{display:block;margin:5px 3px 1px;color:var(--d);font-size:10px;font-weight:700;letter-spacing:.055em;text-transform:uppercase}
.address-field .field{margin:3px 0}
.address-status{min-height:15px;margin-top:5px}
@media(max-width:350px){.address-grid,.address-locality{grid-template-columns:1fr}.address-field label{margin-top:3px}}
`;
if (!html.includes('</style>')) throw new Error('Could not locate style closing tag');
html = html.replace('</style>', `${css}\n</style>`);

const helpers = String.raw`
function parseSupplyAddress(rawValue){
  const raw=String(rawValue||'').replace(/\s+/g,' ').replace(/\s*,\s*/g,', ').replace(/\s+ITALIA$/i,'').trim();
  const out={raw,street:'',civic:'',city:'',province:'',fromBill:Boolean(raw)};
  if(!raw)return out;
  const cleanStreetCivic=(value)=>{
    const v=String(value||'').replace(/[;,\s]+$/,'').trim();
    const m=v.match(/^(.*?)(?:,\s*|\s+)(\d+[A-Za-z]?(?:[\/-][A-Za-z0-9]+)?)$/);
    if(m){out.street=m[1].trim();out.civic=m[2].trim()}
  };
  const cleanLocality=(value)=>{
    const v=String(value||'').replace(/^[,;\s]+|[,;\s]+$/g,'').trim();
    if(!v)return;
    const p=v.match(/^(.*?)(?:\s+|,\s*)([A-Za-z]{2})$/);
    if(p&&p[1].trim().length>=2){out.city=p[1].trim();out.province=p[2].toUpperCase()}
    else out.city=v;
  };
  const cap=raw.match(/\b\d{5}\b/);
  if(cap){
    cleanStreetCivic(raw.slice(0,cap.index));
    cleanLocality(raw.slice(cap.index+cap[0].length));
    return out;
  }
  const comma=raw.indexOf(',');
  if(comma>0){
    cleanStreetCivic(raw.slice(0,comma));
    cleanLocality(raw.slice(comma+1));
    return out;
  }
  let m=raw.match(/^(.*)\s+(\d+[A-Za-z]?(?:[\/-][A-Za-z0-9]+)?)\s+(.+?)\s+([A-Za-z]{2})$/);
  if(m){out.street=m[1].trim();out.civic=m[2].trim();out.city=m[3].trim();out.province=m[4].toUpperCase();return out}
  m=raw.match(/^(.*)\s+(\d+[A-Za-z]?(?:[\/-][A-Za-z0-9]+)?)\s+(.+)$/);
  if(m){out.street=m[1].trim();out.civic=m[2].trim();out.city=m[3].trim()}
  return out;
}
function billAddressParts(){return parseSupplyAddress(billVal('supply_address'))}
`;
if (!html.includes('function render(){')) throw new Error('Could not locate render function');
html = html.replace('function render(){', `${helpers}\nfunction render(){`);

const renderStart = html.indexOf('else if(n===24){');
const renderEnd = html.indexOf('else if(n===26){', renderStart);
if (renderStart < 0 || renderEnd < 0 || renderEnd <= renderStart) throw new Error('Could not locate address screen');
const addressScreen = String.raw`else if(n===24){const a=billAddressParts(),hasBillAddress=Boolean(a.street||a.civic||a.city||a.province);h=frame('COLLEGA IL TUO IMMOBILE','Dove potrebbe nascere il tuo <span class="accent">fotovoltaico</span>?','Conferma l’indirizzo dell’immobile. Se è presente in bolletta lo precompiliamo automaticamente; altrimenti bastano quattro campi.',(hasBillAddress?'<div class="address-source"><b>Indirizzo precompilato dalla bolletta</b>Controlla i dati letti e completa o correggi solo ciò che serve.</div>':'<div class="address-source"><b>Indirizzo non rilevato dalla bolletta</b>Compila via, civico, comune e provincia.</div>')+'<div class="address-grid"><div class="address-field"><label for="street">Via / Piazza</label><input id="street" class="field" placeholder="Via / Piazza" autocomplete="street-address" aria-label="Via o piazza" value="'+esc(a.street)+'"></div><div class="address-field"><label for="civic">Civico</label><input id="civic" class="field" placeholder="Civico" autocomplete="address-line2" aria-label="Numero civico" value="'+esc(a.civic)+'"></div></div><div class="address-locality"><div class="address-field"><label for="city">Comune</label><input id="city" class="field" placeholder="Comune" autocomplete="address-level2" aria-label="Comune" value="'+esc(a.city)+'"></div><div class="address-field"><label for="province">Provincia</label><input id="province" class="field" placeholder="Es. BG" autocomplete="address-level1" aria-label="Provincia" value="'+esc(a.province)+'"></div></div><div id="addressStatus" class="status address-status"></div><p class="small">L’indirizzo serve ad associare il risultato all’immobile corretto. Non equivale a una verifica tecnica o a un sopralluogo.</p><div class="actions"><button id="addressOk" class="btn">Conferma questo immobile</button></div>')}
`;
html = html.slice(0, renderStart) + addressScreen + html.slice(renderEnd);

const bindStart = html.indexOf('function bind(){');
const bind24 = html.indexOf('if(n===24){', bindStart);
const bind26 = html.indexOf('if(n===26)', bind24);
if (bindStart < 0 || bind24 < 0 || bind26 < 0 || bind26 <= bind24) throw new Error('Could not locate address handler');
const addressHandler = "if(n===24){const initial=billAddressParts(),hasBillPrefill=Boolean(initial.street||initial.civic||initial.city||initial.province),source=hasBillPrefill?'bill_read_reviewed':'manual';$('#addressOk').onclick=()=>{const status=$('#addressStatus'),street=$('#street').value.trim(),civic=$('#civic').value.trim(),city=$('#city').value.trim(),province=$('#province').value.trim();const invalid=!street||street.length<3||!civic||!city||city.length<2||!province||province.length<2;if(invalid){status.className='status error address-status';status.textContent='Completa via, civico, comune e provincia.';const first=[['#street',street&&street.length>=3],['#civic',Boolean(civic)],['#city',city&&city.length>=2],['#province',province&&province.length>=2]].find(x=>!x[1]);if(first)$(first[0]).focus();return}const provinceNormalized=province.length<=3?province.toUpperCase():province;state.a.address=`${street} ${civic}, ${city} ${provinceNormalized}`;state.a.address_source=source;track('address_confirmed',{source});go(25)}}";
html = html.slice(0, bind24) + addressHandler + html.slice(bind26);

const fnStart = html.indexOf('async function addressSearch(q){');
const saveLeadStart = html.indexOf('async function saveLead(){', fnStart);
if (fnStart >= 0 && saveLeadStart > fnStart) html = html.slice(0, fnStart) + html.slice(saveLeadStart);

for (const forbidden of ['id="addressSearch"','id="postal"',"fetch('/api/address/suggest?q='"]) {
  if (html.includes(forbidden)) throw new Error(`Legacy address UI marker still present: ${forbidden}`);
}
for (const required of ['function parseSupplyAddress(rawValue)','id="street"','id="civic"','id="city"','id="province"','Indirizzo precompilato dalla bolletta','Indirizzo non rilevato dalla bolletta',"source=hasBillPrefill?'bill_read_reviewed':'manual'"]) {
  if (!html.includes(required)) throw new Error(`Address Flow V2 marker missing: ${required}`);
}

fs.writeFileSync(file, html);
console.log('Address Flow V2: PASS · bill-reader prefill · manual via/civico/comune/provincia · no duplicate search box');
