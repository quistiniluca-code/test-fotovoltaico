import fs from 'node:fs';

const file = 'public/index.html';
const consentFile = 'public/assets/consent-manager.css';
let html = fs.readFileSync(file, 'utf8');
let consentCss = fs.readFileSync(consentFile, 'utf8');

const marker = 'LAUNCH UX POLISH V5 · final visual + journey';

for (const dependency of [
  'MOBILE UI POLISH V4 · CTA label integrity',
  'SURPRISE OFFER NOTE · v1',
  'WHATSAPP FINAL CTA · v1',
  'ADDRESS FLOW V2 · OCR-first + manual fallback',
]) {
  if (!html.includes(dependency)) throw new Error(`Launch UX polish V5 requires ${dependency}`);
}
if (html.includes(marker)) throw new Error('Launch UX polish V5 already applied');

const oldPhase = "function phaseFor(n){if(n<=16)return['INTUISCI','1/4'];if(n<=20)return['VERIFICA','2/4'];if(n<=23)return['CAPISCI','3/4'];return['DECIDI','4/4']}";
const newJourney = String.raw`const ECON_JOURNEY_STEPS=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,16,17,18,24,25,26,27,28];
function journeyProgress(n){
  const exact=ECON_JOURNEY_STEPS.indexOf(n);
  if(exact>=0)return Math.round(exact/(ECON_JOURNEY_STEPS.length-1)*100);
  const completed=ECON_JOURNEY_STEPS.filter(step=>step<n).length;
  return Math.max(0,Math.min(100,Math.round(Math.max(0,completed-1)/(ECON_JOURNEY_STEPS.length-1)*100)));
}
function phaseFor(n){
  if(n===0)return['',''];
  if(n<=16)return['PROFILO','1/4'];
  if(n<=18)return['DATI','2/4'];
  if(n<=25)return['IMMOBILE','3/4'];
  return['RISULTATO','4/4'];
}`;
if (!html.includes(oldPhase)) throw new Error('Could not locate legacy phase map');
html = html.replace(oldPhase, newJourney);

const oldProgress = "$('#progress').style.width=Math.min(100,n/28*100)+'%'";
const newProgress = "$('#progress').style.width=journeyProgress(n)+'%'";
if (!html.includes(oldProgress)) throw new Error('Could not locate result-flow progress expression');
html = html.replace(oldProgress, newProgress);

const oldBack = "$('#back').hidden=!state.history.length;let h=''";
const newBack = "$('#back').hidden=!state.history.length||n===28;let h=''";
if (!html.includes(oldBack)) throw new Error('Could not locate back-button visibility rule');
html = html.replace(oldBack, newBack);

const css = String.raw`
/* ${marker} */
.option,.btn,.continue-pill,.back,.suggestion{touch-action:manipulation}
.option:focus-visible,.btn:focus-visible,.continue-pill:focus-visible,.back:focus-visible,.suggestion:focus-visible,.whatsapp-final-cta:focus-visible{outline:3px solid var(--l);outline-offset:2px}
.reward-offer-terms{display:block!important}

@media(max-width:520px){
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) p{font-size:16px;line-height:1.31}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .lead{font-size:16.5px;line-height:1.32}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) p{font-size:17px;line-height:1.32}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .lead{font-size:17.2px;line-height:1.33}
  .view.mobile-fit-v3-roomy:has(.intro-v2) .intro-copy{font-size:15.5px!important;line-height:1.32!important}
  .view.mobile-fit-v3-roomy-xl:has(.intro-v2) .intro-copy{font-size:16.2px!important;line-height:1.33!important}
  .reward-offer-terms{display:block!important;font-size:8.5px;line-height:1.2}
  .view:has(#whatsappFinal) .reward-v2{margin-top:8px}
  .view:has(#whatsappFinal) .whatsapp-final-wrap{margin-top:9px}
}

@media(max-width:520px) and (max-height:700px){
  .reward-offer-terms{display:block!important;font-size:8px;line-height:1.16;opacity:.76}
  .view:has(#whatsappFinal) .reward-offer-note{gap:3px 7px;margin-top:6px;padding:7px 8px}
  .view:has(#whatsappFinal) .whatsapp-final-wrap{margin-top:6px}
}
`;

if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for launch UX polish V5');
html = html.replace('</style>', `${css}\n</style>`);

const oldConsentChip = '.econ-consent-settings{bottom:max(72px,calc(72px + env(safe-area-inset-bottom)));left:8px}';
const newConsentChip = '.econ-consent-settings{bottom:max(68px,calc(68px + env(safe-area-inset-bottom)));left:8px;min-height:32px;padding:5px 9px;font-size:10px;box-shadow:none;opacity:.92}';
if (!consentCss.includes(oldConsentChip)) throw new Error('Could not locate mobile cookie-settings chip');
consentCss = consentCss.replace(oldConsentChip, newConsentChip);

for (const required of [
  'ECON_JOURNEY_STEPS=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,16,17,18,24,25,26,27,28]',
  'function journeyProgress(n)',
  "return['PROFILO','1/4']",
  "return['DATI','2/4']",
  "return['IMMOBILE','3/4']",
  "return['RISULTATO','4/4']",
  "$('#progress').style.width=journeyProgress(n)+'%'",
  "$('#back').hidden=!state.history.length||n===28",
  'reward-offer-terms{display:block!important',
]) {
  if (!html.includes(required)) throw new Error(`Launch UX polish V5 marker missing: ${required}`);
}
if (!consentCss.includes(newConsentChip)) throw new Error('Launch UX polish V5 cookie-settings polish missing');

fs.writeFileSync(file, html);
fs.writeFileSync(consentFile, consentCss);
console.log('Launch UX polish V5: PASS · truthful progress · live phases · terminal result · stronger typography · quieter cookie control');
