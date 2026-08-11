import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'public', 'vendor');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const exists = (p) => fs.existsSync(path.join(root, p));
const copy = (src, dest) => {
  const a = path.join(root, src), b = path.join(root, dest);
  fs.mkdirSync(path.dirname(b), { recursive: true });
  fs.copyFileSync(a, b);
};
const findFile = (dir, predicate) => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return null;
  const stack = [abs];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (predicate(full, entry.name)) return full;
    }
  }
  return null;
};

const pdfBase = exists('node_modules/pdfjs-dist/legacy/build/pdf.mjs')
  ? 'node_modules/pdfjs-dist/legacy/build'
  : 'node_modules/pdfjs-dist/build';
copy(`${pdfBase}/pdf.mjs`, 'public/vendor/pdfjs/pdf.mjs');
copy(`${pdfBase}/pdf.worker.mjs`, 'public/vendor/pdfjs/pdf.worker.mjs');

const tessEsm = findFile('node_modules/tesseract.js/dist', (_, n) => n === 'tesseract.esm.min.js');
const tessWorker = findFile('node_modules/tesseract.js/dist', (_, n) => n === 'worker.min.js');
if (!tessEsm || !tessWorker) throw new Error('Tesseract browser bundles not found');
fs.mkdirSync(path.join(out, 'tesseract'), { recursive: true });
fs.copyFileSync(tessEsm, path.join(out, 'tesseract', 'tesseract.esm.min.js'));
fs.copyFileSync(tessWorker, path.join(out, 'tesseract', 'worker.min.js'));

const ita = findFile('node_modules/@tesseract.js-data/ita', (_, n) => n === 'ita.traineddata.gz');
if (!ita) throw new Error('Italian Tesseract traineddata not found');
fs.mkdirSync(path.join(out, 'tessdata'), { recursive: true });
fs.copyFileSync(ita, path.join(out, 'tessdata', 'ita.traineddata.gz'));

const coreRoot = path.join(root, 'node_modules', 'tesseract.js-core');
if (!fs.existsSync(coreRoot)) throw new Error('tesseract.js-core not installed');
const coreOut = path.join(out, 'tesseract-core');
fs.mkdirSync(coreOut, { recursive: true });
let copiedCore = 0;
const stack = [coreRoot];
while (stack.length) {
  const current = stack.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) stack.push(full);
    else if (/^tesseract-core.*\.(?:wasm|wasm\.js)$/.test(entry.name)) {
      fs.copyFileSync(full, path.join(coreOut, entry.name));
      copiedCore++;
    }
  }
}
if (!copiedCore) throw new Error('Tesseract core assets not found');

console.log(`Vendored PDF.js + Tesseract assets (${copiedCore} core files).`);
