import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

const required = [
  'GLOBAL MOBILE FIT · full-funnel one-screen · v1',
  'ECON_MOBILE_VIEWPORT_FIT_V1',
  '.shell:not(:has(.intro-v2))',
  'height:100vh;height:100svh',
  '.view:not(:has(.intro-v2))',
  '.options:has(.option:nth-child(6))',
  ".continue-pill.show::after{content:'Continua  →'",
  '.actions{position:sticky',
  '.field{min-height:44px',
  '.result-score-wrap',
  '.result-metrics',
  '.reward-v2',
  '.view.mobile-fit-tight',
  '.view.mobile-fit-ultra',
  'new MutationObserver(schedule)',
  'window.visualViewport.addEventListener',
];

for (const token of required) {
  if (!html.includes(token)) {
    throw new Error(`Global mobile fit regression: missing ${token}`);
  }
}

if (!html.includes('HERO MOBILE FIT · one-screen · v1')) {
  throw new Error('Global mobile fit regression: hero-specific mobile fit was lost');
}
if (!html.includes('/assets/hero/econ-home-energy.png')) {
  throw new Error('Global mobile fit regression: supplied hero PNG was lost');
}
if (!html.includes('id="start" class="intro-cta"')) {
  throw new Error('Global mobile fit regression: hero CTA was lost');
}
if (!html.includes('id="leadSave" class="btn result-cta"')) {
  throw new Error('Global mobile fit regression: result lead CTA was lost');
}
if (!html.includes('function economic(')) {
  throw new Error('Global mobile fit regression: economic engine missing');
}

console.log('Global mobile full-funnel regression: PASS · adaptive tight/ultra fit + Safari small viewport');
