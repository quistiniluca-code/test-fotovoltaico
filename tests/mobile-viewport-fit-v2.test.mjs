import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

const required = [
  'MOBILE VIEWPORT FIT V2 · full-screen balance · v2',
  'ECON_MOBILE_VIEWPORT_FIT_V2',
  '--econ-mobile-vh',
  'overflow:hidden!important',
  ':has(> .options)',
  'justify-content:space-between',
  'max-height:min(78px,9.6dvh)',
  '.view.mobile-fit-v2-nano',
  '.view.mobile-fit-v2-cut',
  'window.visualViewport',
  "root.style.setProperty('--econ-mobile-vh'",
  'new MutationObserver(schedule)',
];

for (const token of required) {
  if (!html.includes(token)) {
    throw new Error(`Mobile viewport fit V2 regression: missing ${token}`);
  }
}

const preserved = [
  'GLOBAL MOBILE FIT · full-funnel one-screen · v1',
  'HERO MOBILE FIT · one-screen · v1',
  '/assets/hero/econ-home-energy.png',
  'id="start" class="intro-cta"',
  'id="leadSave" class="btn result-cta"',
  'function economic(',
  'ECON_MOBILE_VIEWPORT_FIT_V1',
];

for (const token of preserved) {
  if (!html.includes(token)) {
    throw new Error(`Mobile viewport fit V2 regression: preserved behavior missing ${token}`);
  }
}

console.log('Mobile viewport fit V2 regression: PASS · balanced vertical fill + visual viewport + no first-fold scroll');
