import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const htmlFile = path.join(root, 'public', 'index.html');
const sourceDir = path.join(root, 'assets', 'hero');
const outputDir = path.join(root, 'public', 'assets', 'hero');
const outputFile = path.join(outputDir, 'econ-home-energy.png');
// Palette-optimized PNG derived from the supplied visual, preserving dimensions and composition.
const expectedSha256 = '2e99c3fbc6ffca2f4cc818c920cb85154da8d1df59c9b39ee4877d70763c5c89';
const marker = 'HERO PNG · supplied asset · v1';

const chunks = fs.readdirSync(sourceDir)
  .filter((name) => /^econ-home-energy\.b64\.\d+$/.test(name))
  .sort();

if (!chunks.length) throw new Error('Supplied hero PNG chunks are missing');

const parts = chunks.map((name) => ({
  name,
  value: fs.readFileSync(path.join(sourceDir, name), 'utf8').trim(),
}));
console.log(`Hero PNG chunks: ${parts.map(({ name, value }) => `${name}:${value.length}`).join(', ')}`);

const encoded = parts.map(({ value }) => value).join('');
console.log(`Hero PNG base64 length: ${encoded.length}`);
const image = Buffer.from(encoded, 'base64');
const digest = createHash('sha256').update(image).digest('hex');

if (digest !== expectedSha256) {
  throw new Error(`Supplied hero PNG checksum mismatch: ${digest}`);
}
if (image.length < 8 || image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
  throw new Error('Supplied hero asset is not a valid PNG');
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, image);

let html = fs.readFileSync(htmlFile, 'utf8');
if (html.includes(marker)) throw new Error('Supplied hero PNG patch already applied');

const figurePattern = /<figure class="intro-visual" aria-label="Sistema energia domestico con impianto fotovoltaico">[\s\S]*?<\/figure>/;
if (!figurePattern.test(html)) throw new Error('Could not locate the current coded hero visual');

const replacement = `<figure class="intro-visual intro-visual-png" aria-label="Sistema Energia domestico con fotovoltaico e accumulo"><img src="/assets/hero/econ-home-energy.png" width="764" height="386" alt="Illustrazione ECON di una casa con impianto fotovoltaico, accumulo e rete energetica" decoding="async" fetchpriority="high"></figure>`;
html = html.replace(figurePattern, replacement);

const css = `\n/* ${marker} */\n.intro-visual-png{background:#f7faef}\n.intro-visual-png img{display:block;width:100%;height:auto;object-fit:contain}\n`;
if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for PNG hero integration');
html = html.replace('</style>', `${css}</style>`);

fs.writeFileSync(htmlFile, html);
console.log(`Hero supplied PNG integration: PASS · ${image.length} bytes · sha256 ${digest.slice(0, 12)}…`);
