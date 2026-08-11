import fs from 'node:fs';

const file = 'public/assets/bill-parser.js';
let source = fs.readFileSync(file, 'utf8');
const version = 'ios-stream-compat-1';

const replacements = [
  ["import('/vendor/pdfjs/pdf.mjs')", `import('/vendor/pdfjs/pdf.mjs?v=${version}')`],
  ["mod.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';", `mod.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs?v=${version}';`],
];

for (const [from, to] of replacements) {
  if (source.includes(to)) continue;
  if (!source.includes(from)) throw new Error(`Could not locate PDF.js asset reference: ${from}`);
  source = source.replace(from, to);
}

if (!source.includes(`pdf.mjs?v=${version}`) || !source.includes(`pdf.worker.mjs?v=${version}`)) {
  throw new Error('PDF.js Safari cache-bust markers missing');
}

fs.writeFileSync(file, source);
console.log(`Bill parser iOS cache-bust: PASS · ${version}`);
