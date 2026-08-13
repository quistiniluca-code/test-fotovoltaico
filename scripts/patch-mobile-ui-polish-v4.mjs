import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
const marker = 'MOBILE UI POLISH V4 · CTA label integrity';

if (!html.includes('MOBILE VIEWPORT FIT V3 · typographic balance · v3')) {
  throw new Error('Mobile UI polish V4 requires mobile typography V3 first');
}
if (!html.includes('GLOBAL MOBILE FIT · full-funnel one-screen · v1')) {
  throw new Error('Mobile UI polish V4 requires global mobile fit V1 first');
}
if (html.includes(marker)) throw new Error('Mobile UI polish V4 already applied');

const replacements = [
  [
    ".view:not(:has(.intro-v2)) .btn,.view:not(:has(.intro-v2)) .continue-pill.show{min-height:48px;font-size:15px}",
    ".view:not(:has(.intro-v2)) .btn{min-height:48px;font-size:15px}.view:not(:has(.intro-v2)) .continue-pill.show{min-height:48px;font-size:0}",
  ],
  [
    ".view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .btn,.view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .continue-pill.show{font-size:15.5px;min-height:50px}",
    ".view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .btn{font-size:15.5px;min-height:50px}.view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .continue-pill.show{font-size:0;min-height:50px}.view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .continue-pill.show::after{font-size:15.5px}",
  ],
  [
    ".view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .btn,.view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .continue-pill.show{font-size:16px;min-height:52px}",
    ".view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .btn{font-size:16px;min-height:52px}.view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .continue-pill.show{font-size:0;min-height:52px}.view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .continue-pill.show::after{font-size:16px}",
  ],
];

for (const [before, after] of replacements) {
  if (!html.includes(before)) throw new Error(`Mobile UI polish V4 could not locate expected selector: ${before}`);
  html = html.replace(before, after);
}

const legacyContinue = ".continue-pill.show::after{content:'Continua  →';";
const normalizedContinue = ".continue-pill.show::after{content:'Continua →';";
if (html.includes(legacyContinue)) html = html.replace(legacyContinue, normalizedContinue);
if (!html.includes(normalizedContinue)) throw new Error('Canonical Continue label pseudo-element missing');

const css = String.raw`
/* ${marker} */
@media(max-width:520px){
  .view:not(:has(.intro-v2)) .continue-pill.show{font-size:0!important;line-height:1!important;white-space:nowrap;max-width:100%}
  .view:not(:has(.intro-v2)) .continue-pill.show::after{font-size:15px;line-height:1;white-space:nowrap}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .continue-pill.show::after{font-size:15.5px}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .continue-pill.show::after{font-size:16px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .continue-pill.show::after{font-size:14px}
  .view.mobile-fit-v3-cut:not(:has(.intro-v2)) .continue-pill.show::after{font-size:13.5px}
  .view:not(:has(.intro-v2)) .btn{max-width:100%;overflow-wrap:anywhere;text-wrap:balance}
  .view:not(:has(.intro-v2)) .option{max-width:100%}
}
`;

if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for mobile UI polish V4');
html = html.replace('</style>', `${css}\n</style>`);

const duplicatePseudoLabels = html.match(/\.continue-pill\.show::after\{content:'Continua\s+→'/g) || [];
if (duplicatePseudoLabels.length !== 1) {
  throw new Error(`Continue label must have exactly one generated text source, found ${duplicatePseudoLabels.length}`);
}
if (html.includes("content:'Continua  →'")) throw new Error('Double-space Continue label regression remains');

fs.writeFileSync(file, html);
console.log('Mobile UI polish V4: PASS · single Continue label · CTA typography isolated · no pseudo-text duplication');
