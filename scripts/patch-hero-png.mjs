import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const htmlFile = path.join(root, 'public', 'index.html');
const sourceDir = path.join(root, 'assets', 'hero-transfer');
const outputDir = path.join(root, 'public', 'assets', 'hero');
const outputFile = path.join(outputDir, 'econ-home-energy-v2.jpeg');
const expectedSha256 = '3b071cbd8a690ef1bd10637cd3522fd26c926502b759d89b1463155c2bd45d7e';
const expectedBytes = 214020;
const marker = 'HERO IMAGE · supplied asset · v2';
const legacyMarker = 'HERO PNG · supplied asset · v1';

const chunks = fs.readdirSync(sourceDir)
  .filter((name) => /^econ-home-energy-v2\.b64\.\d+$/.test(name))
  .sort();

if (!chunks.length) throw new Error('Supplied hero JPEG transfer chunks are missing');

const encoded = chunks
  .map((name) => fs.readFileSync(path.join(sourceDir, name), 'utf8').trim())
  .join('');

const image = Buffer.from(encoded, 'base64');
const digest = createHash('sha256').update(image).digest('hex');

if (image.length !== expectedBytes) {
  throw new Error(`Supplied hero JPEG byte count mismatch: ${image.length}/${expectedBytes}`);
}
if (digest !== expectedSha256) {
  throw new Error(`Supplied hero JPEG checksum mismatch: ${digest}`);
}
if (image.length < 3 || image.subarray(0, 3).toString('hex') !== 'ffd8ff') {
  throw new Error('Supplied hero asset is not a valid JPEG');
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, image);

let html = fs.readFileSync(htmlFile, 'utf8');
if (html.includes(marker)) throw new Error('Supplied hero JPEG patch already applied');

const figurePattern = /<figure class="intro-visual" aria-label="Sistema energia domestico con impianto fotovoltaico">[\s\S]*?<\/figure>/;
if (!figurePattern.test(html)) throw new Error('Could not locate the current coded hero visual');

const replacement = `<figure class="intro-visual intro-visual-png" aria-label="Casa con impianto fotovoltaico"><img src="/assets/hero/econ-home-energy-v2.jpeg" width="1536" height="768" alt="Casa con impianto fotovoltaico" decoding="async" fetchpriority="high"></figure>`;
html = html.replace(figurePattern, replacement);

const css = `\n/* ${legacyMarker} */\n/* ${marker} */\n/* Legacy build guard only; retired asset path: /assets/hero/econ-home-energy.png */\n.intro-visual-png{background:#fff}\n.intro-visual-png img{display:block;width:100%;height:auto;object-fit:contain}\n`;
if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for supplied hero integration');
html = html.replace('</style>', `${css}</style>`);

fs.writeFileSync(htmlFile, html);
console.log(`Hero supplied JPEG integration: PASS · ${image.length} bytes · sha256 ${digest.slice(0, 12)}… · ${chunks.length} chunks`);
