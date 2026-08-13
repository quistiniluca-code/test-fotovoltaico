import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

const required = [
  'MOBILE VIEWPORT FIT V3 · typographic balance · v3',
  'ECON_MOBILE_VIEWPORT_FIT_V3',
  'MOBILE UI POLISH V4 · CTA label integrity',
  '--econ-mobile-vh',
  '.view.mobile-fit-v3-roomy',
  '.view.mobile-fit-v3-roomy-xl',
  '.view.mobile-fit-v3-nano',
  '.view.mobile-fit-v3-cut',
  'window.visualViewport',
  "root.style.setProperty('--econ-mobile-vh'",
  'new MutationObserver(schedule)',
  "content:'Continua →'",
  'font-size:0!important',
];

for (const token of required) {
  if (!html.includes(token)) throw new Error(`Mobile UI regression missing: ${token}`);
}

for (const token of ['GLOBAL MOBILE FIT · full-funnel one-screen · v1','HERO MOBILE FIT · one-screen · v1','/assets/hero/econ-home-energy.png','id="start" class="intro-cta"','id="leadSave" class="btn result-cta"','function economic(']) {
  if (!html.includes(token)) throw new Error(`Preserved behavior missing: ${token}`);
}

if (html.includes("content:'Continua  →'")) throw new Error('Legacy Continue spacing remains');
if ((html.match(/content:'Continua →'/g) || []).length !== 1) throw new Error('Continue label must have exactly one generated text source');

console.log('Mobile viewport/UI regression: PASS · typography V3 + single CTA label');
