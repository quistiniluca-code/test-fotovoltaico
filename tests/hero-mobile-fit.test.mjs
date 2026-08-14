import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const mustInclude = [
  'HERO MOBILE FIT · one-screen · v1',
  '@media(max-width:520px)',
  '.view:has(.intro-v2)',
  '.intro-visual-png{height:clamp(122px,20.5svh,156px)',
  '.intro-visual-png img{width:100%;height:100%;object-fit:contain;object-position:center;background:#fff}',
  '.intro-benefits{grid-template-columns:repeat(3,minmax(0,1fr))',
  '.intro-benefit span{display:none}',
  '.intro-privacy span{display:none}',
  '.intro-cta{min-height:52px',
  '@media(max-width:520px) and (max-height:700px)',
];

for (const token of mustInclude) {
  if (!html.includes(token)) throw new Error(`Mobile hero fit regression: missing ${token}`);
}

if (!html.includes('id="start" class="intro-cta"')) {
  throw new Error('Mobile hero fit regression: primary CTA missing');
}
if (!html.includes('/assets/hero/econ-home-energy-v3.jpeg')) {
  throw new Error('Mobile hero fit regression: supplied JPEG missing');
}
if (html.includes('/assets/hero/econ-home-energy.png')) {
  throw new Error('Mobile hero fit regression: stale hero asset still referenced');
}
if (/\.intro-cta\s*\{[^}]*display\s*:\s*none/.test(html)) {
  throw new Error('Mobile hero fit regression: CTA hidden by CSS');
}

console.log('Hero mobile one-screen regression: PASS');
