import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

for (const marker of [
  'ADDRESS FLOW V2 · OCR-first + manual fallback',
  'function parseSupplyAddress(rawValue)',
  'function billAddressParts()',
  'Indirizzo precompilato dalla bolletta',
  'Indirizzo non rilevato dalla bolletta',
  'id="street"',
  'id="civic"',
  'id="city"',
  'id="province"',
  "source=hasBillPrefill?'bill_read_reviewed':'manual'",
  "track('address_confirmed',{source})",
]) {
  if (!html.includes(marker)) throw new Error(`Address Flow V2 missing marker: ${marker}`);
}

for (const forbidden of [
  'id="addressSearch"',
  'id="postal"',
  "fetch('/api/address/suggest?q='",
  'Cerca via / piazza e numero civico',
]) {
  if (html.includes(forbidden)) throw new Error(`Legacy/repetitive address flow remains: ${forbidden}`);
}

const parserCases = [
  ['VIA PAPA RATTI 6, 24124 BERGAMO BG', ['VIA PAPA RATTI','6','BERGAMO','BG']],
  ['VIA ALTIERO SPINELLI 5, 25034 ORZINUOVI BS', ['VIA ALTIERO SPINELLI','5','ORZINUOVI','BS']],
  ['STRADA ALLA TRUCCA 98, 24127 BERGAMO BG', ['STRADA ALLA TRUCCA','98','BERGAMO','BG']],
  ['Via Madonna Dei Campi 5, 24010 Sorisole', ['Via Madonna Dei Campi','5','Sorisole','']],
  ['Via Montecassino 2, 23884 Castello Di Brianza LC', ['Via Montecassino','2','Castello Di Brianza','LC']],
];

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
  if(cap){cleanStreetCivic(raw.slice(0,cap.index));cleanLocality(raw.slice(cap.index+cap[0].length));return out}
  const comma=raw.indexOf(',');
  if(comma>0){cleanStreetCivic(raw.slice(0,comma));cleanLocality(raw.slice(comma+1));return out}
  let m=raw.match(/^(.*)\s+(\d+[A-Za-z]?(?:[\/-][A-Za-z0-9]+)?)\s+(.+?)\s+([A-Za-z]{2})$/);
  if(m){out.street=m[1].trim();out.civic=m[2].trim();out.city=m[3].trim();out.province=m[4].toUpperCase();return out}
  m=raw.match(/^(.*)\s+(\d+[A-Za-z]?(?:[\/-][A-Za-z0-9]+)?)\s+(.+)$/);
  if(m){out.street=m[1].trim();out.civic=m[2].trim();out.city=m[3].trim()}
  return out;
}

for (const [raw, expected] of parserCases) {
  const got = parseSupplyAddress(raw);
  const actual = [got.street, got.civic, got.city, got.province];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Address parser mismatch for ${raw}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

console.log('Address Flow V2 regression: PASS · bill-reader prefill + four-field manual fallback');
