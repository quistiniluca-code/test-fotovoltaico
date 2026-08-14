import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const consentCss = fs.readFileSync('public/assets/consent-manager.css', 'utf8');

const required = [
  'LAUNCH UX POLISH V5 · final visual + journey',
  'ECON_JOURNEY_STEPS=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,16,17,18,24,25,26,27,28]',
  'function journeyProgress(n)',
  "return['PROFILO','1/4']",
  "return['DATI','2/4']",
  "return['IMMOBILE','3/4']",
  "return['RISULTATO','4/4']",
  "$('#progress').style.width=journeyProgress(n)+'%'",
  "$('#back').hidden=!state.history.length||n===28",
  'reward-offer-terms{display:block!important',
  'https://wa.me/393783091137',
  'Scrivici su WhatsApp →',
  'La sorpresa indicata è offerta gratuitamente da ECON con l’installazione di un Sistema Energia ECON.',
  '/assets/hero/econ-home-energy-v3.jpeg',
  'function commercialEconomic(raw)',
  'commercialEconomic(economic())',
  'id="street"',
  'id="civic"',
  'id="city"',
  'id="province"',
];

for (const token of required) {
  if (!html.includes(token)) throw new Error(`Launch UX V5 regression: missing ${token}`);
}

for (const legacy of [
  "return['INTUISCI','1/4']",
  "return['VERIFICA','2/4']",
  "return['CAPISCI','3/4']",
  "return['DECIDI','4/4']",
  "Math.min(100,n/28*100)",
  'id="postal"',
  'id="addressSearch"',
  'Quanto sei sicuro della tua <span class="accent">scelta</span>?',
]) {
  if (html.includes(legacy)) throw new Error(`Launch UX V5 regression: legacy marker remains ${legacy}`);
}

if ((html.match(/https:\/\/wa\.me\/393783091137/g) || []).length !== 1) {
  throw new Error('Launch UX V5 regression: WhatsApp destination must exist exactly once');
}

const consentChip = '.econ-consent-settings{bottom:max(68px,calc(68px + env(safe-area-inset-bottom)));left:8px;min-height:32px;padding:5px 9px;font-size:10px;box-shadow:none;opacity:.92}';
if (!consentCss.includes(consentChip)) {
  throw new Error('Launch UX V5 regression: compact cookie settings control missing');
}
if (consentCss.includes('.econ-consent-settings{bottom:max(72px,calc(72px + env(safe-area-inset-bottom)));left:8px}')) {
  throw new Error('Launch UX V5 regression: oversized mobile cookie settings control remains');
}

console.log('Launch UX polish V5 regression: PASS · journey, hierarchy, final action, disclosures and cookie control preserved');
