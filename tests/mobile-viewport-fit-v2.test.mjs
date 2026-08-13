import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

const required = [
  'MOBILE VIEWPORT FIT V3 · typographic balance · v3',
  'ECON_MOBILE_VIEWPORT_FIT_V3',
  '--econ-mobile-vh',
  'flex:0 0 auto',
  '.view.mobile-fit-v3-roomy',
  '.view.mobile-fit-v3-roomy-xl',
  '.view.mobile-fit-v3-nano',
  '.view.mobile-fit-v3-cut',
  'window.visualViewport',
  "root.style.setProperty('--econ-mobile-vh'",
  'new MutationObserver(schedule)',
];

for (const token of required) {
  if (!html.includes(token)) throw new Error(`Mobile viewport fit V3 regression: missing ${token}`);
}

for (const token of ['GLOBAL MOBILE FIT · full-funnel one-screen · v1','HERO MOBILE FIT · one-screen · v1','/assets/hero/econ-home-energy.png','id="start" class="intro-cta"','id="leadSave" class="btn result-cta"','function economic(']) {
  if (!html.includes(token)) throw new Error(`Mobile viewport fit V3 regression: preserved behavior missing ${token}`);
}

console.log('Mobile viewport fit V3 regression: PASS');
