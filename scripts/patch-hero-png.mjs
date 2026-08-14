import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const htmlFile = path.join(root, 'public', 'index.html');
const assetFile = path.join(root, 'public', 'assets', 'hero', 'econ-home-energy-v3.jpeg');
const expectedSha256 = '3b071cbd8a690ef1bd10637cd3522fd26c926502b759d89b1463155c2bd45d7e';
const expectedBytes = 214020;
// Keep the historical marker because the downstream mobile-fit patch uses it as an ordering guard.
const marker = 'HERO PNG · supplied asset · v1';

if (!fs.existsSync(assetFile)) {
  throw new Error('Supplied hero JPEG is missing from public/assets/hero');
}

const image = fs.readFileSync(assetFile);
const digest = createHash('sha256').update(image).digest('hex');
if (image.length !== expectedBytes) {
  throw new Error(`Supplied hero JPEG byte length mismatch: ${image.length}/${expectedBytes}`);
}
if (digest !== expectedSha256) {
  throw new Error(`Supplied hero JPEG checksum mismatch: ${digest}`);
}
if (image.length < 3 || image.subarray(0, 3).toString('hex') !== 'ffd8ff') {
  throw new Error('Supplied hero asset is not a valid JPEG');
}

let html = fs.readFileSync(htmlFile, 'utf8');
if (html.includes(marker)) throw new Error('Supplied hero patch already applied');

const figurePattern = /<figure class="intro-visual" aria-label="Sistema energia domestico con impianto fotovoltaico">[\s\S]*?<\/figure>/;
if (!figurePattern.test(html)) throw new Error('Could not locate the current coded hero visual');

const replacement = `<figure class="intro-visual intro-visual-png" aria-label="Sistema Energia domestico con fotovoltaico"><img src="/assets/hero/econ-home-energy-v3.jpeg" width="1536" height="768" alt="Casa con impianto fotovoltaico e sole" decoding="async" fetchpriority="high"></figure>`;
html = html.replace(figurePattern, replacement);

const css = `\n/* ${marker} */\n.intro-visual-png{background:#fff}\n.intro-visual-png img{display:block;width:100%;height:auto;object-fit:contain;object-position:center}\n`;
if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for supplied hero integration');
html = html.replace('</style>', `${css}</style>`);

fs.writeFileSync(htmlFile, html);
console.log(`Hero supplied JPEG integration: PASS · ${image.length} bytes · sha256 ${digest.slice(0, 12)}…`);
