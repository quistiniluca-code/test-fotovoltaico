import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const required = [
  'public/index.html',
  'public/assets/bill-parser.js',
  'public/vendor/pdfjs/pdf.mjs',
  'public/vendor/pdfjs/pdf.worker.mjs',
  'public/vendor/tesseract/tesseract.esm.min.js',
  'public/vendor/tesseract/worker.min.js',
  'public/vendor/tessdata/ita.traineddata.gz',
  'netlify.toml',
  'netlify/functions/config.js',
  'netlify/functions/leads.js',
  'netlify/functions/events.js',
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

const coreDir = 'public/vendor/tesseract-core';
if (!fs.existsSync(coreDir) || !fs.readdirSync(coreDir).some(n => /^tesseract-core.*\.wasm\.js$/.test(n))) {
  throw new Error('Missing local Tesseract core assets');
}

const html = fs.readFileSync('public/index.html', 'utf8');
for (const marker of [
  '/api/config', '/api/leads', '/api/events',
  "import('/assets/bill-parser.js')", 'browser-local', 'nessun servizio OCR esterno',
  'PENSAVI → EMERGE', 'IL PUNTO CIECO', 'DOPO IL PRIMO DATO', 'ULTIMO DATO SUL TUO CASO',
  'QUADRO AGGIORNATO', 'SORPRESA ECON SBLOCCATA', 'RIEPILOGO'
]) {
  if (!html.includes(marker)) throw new Error(`Frontend missing required marker: ${marker}`);
}
if (html.includes('/api/parser/ticket')) throw new Error('Legacy external-parser ticket still referenced by frontend');

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
if (!inlineScripts.length) throw new Error('No inline application script found');
for (const [index, source] of inlineScripts.entries()) {
  try {
    new Function(source);
  } catch (error) {
    throw new Error(`Inline JavaScript syntax error in script ${index + 1}: ${error.message}`);
  }
}
execFileSync(process.execPath, ['--check', 'public/assets/bill-parser.js'], { stdio: 'inherit' });

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return ['node_modules', '.git', '.netlify', 'vendor'].includes(entry.name) ? [] : walk(full);
    return [full];
  });
}

const textExt = new Set(['.js','.mjs','.json','.html','.md','.toml','.py','.txt','.yml','.yaml','.example','.gitignore']);
const podPattern = /IT001E\d{6,}/g;
for (const file of walk('.')) {
  const ext = path.extname(file);
  if (!textExt.has(ext) && path.basename(file) !== '.gitignore') continue;
  const content = fs.readFileSync(file, 'utf8');
  if (podPattern.test(content)) throw new Error(`Potential real POD found in repository: ${file}`);
  podPattern.lastIndex = 0;
}

console.log('Repository verification: PASS · V1.7 browser-local PDF/OCR + full funnel');
