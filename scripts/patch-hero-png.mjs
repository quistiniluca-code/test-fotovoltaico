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
const expectedChunkHashes = new Map([
  ['econ-home-energy.b64.00', 'd20942bfdd7940bf'],
  ['econ-home-energy.b64.01', 'dd8cf05b2f43618b'],
  ['econ-home-energy.b64.020', 'dc005cf399cd7186'],
  ['econ-home-energy.b64.021', 'f9f3ee5114a8a094'],
  ['econ-home-energy.b64.03', '6ec85de968d34d96'],
  ['econ-home-energy.b64.04', 'ff7519bde02ae0a0'],
  ['econ-home-energy.b64.05', '88bbcad34e900620'],
  ['econ-home-energy.b64.060', '0a1a2c8bc88c0818'],
  ['econ-home-energy.b64.061', '3f3ae010b189c5cc'],
  ['econ-home-energy.b64.07', 'f514c20b16f73afd'],
  ['econ-home-energy.b64.08', 'd4af1e17e855f91b'],
  ['econ-home-energy.b64.09', '10a0d95da47f12bb'],
  ['econ-home-energy.b64.100', '8febe1d90cc407eb'],
  ['econ-home-energy.b64.101', '86b676ff928f6b08'],
  ['econ-home-energy.b64.11', '9941368b5bd6bb44'],
  ['econ-home-energy.b64.12', 'c07a82dc66395ff8'],
  ['econ-home-energy.b64.130', '85b5013631e22c65'],
  ['econ-home-energy.b64.131', '845646d16d4f43c2'],
  ['econ-home-energy.b64.14', 'ad0e915f5e78488d'],
  ['econ-home-energy.b64.15', 'dc6f259b3fcfb4a6'],
  ['econ-home-energy.b64.160', 'f4e1573db2a691cd'],
  ['econ-home-energy.b64.161', '74ce6b4d19b42e92'],
  ['econ-home-energy.b64.170', 'c09f8f751de7e71f'],
  ['econ-home-energy.b64.171', 'ddc1d9f0709666f4'],
]);

const chunks = fs.readdirSync(sourceDir)
  .filter((name) => /^econ-home-energy\.b64\.\d+$/.test(name))
  .sort();

if (!chunks.length) throw new Error('Supplied hero PNG chunks are missing');
if (chunks.length !== expectedChunkHashes.size) {
  throw new Error(`Supplied hero PNG chunk count mismatch: ${chunks.length}/${expectedChunkHashes.size}`);
}

const parts = chunks.map((name) => {
  const value = fs.readFileSync(path.join(sourceDir, name), 'utf8').trim();
  const expected = expectedChunkHashes.get(name);
  const actual = createHash('sha256').update(value).digest('hex').slice(0, 16);
  if (!expected) throw new Error(`Unexpected supplied hero PNG chunk: ${name}`);
  if (actual !== expected) throw new Error(`Supplied hero PNG chunk mismatch: ${name} ${actual} != ${expected}`);
  return { name, value };
});

const encoded = parts.map(({ value }) => value).join('');
if (encoded.length !== 187388) throw new Error(`Supplied hero PNG base64 length mismatch: ${encoded.length}`);
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
