import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __test as parserTest } from '../public/assets/bill-parser.js';

const parser=fs.readFileSync('public/assets/bill-parser.js','utf8');
const runtime=fs.readFileSync('public/vendor/tesseract/tesseract.min.js','utf8');

assert.ok(runtime.length>10000,'Vendored Tesseract browser runtime is unexpectedly small');
assert.ok(runtime.includes('createWorker'),'Vendored Tesseract runtime must expose createWorker');

for(const marker of [
  'BILL OCR RUNTIME RESILIENCE V2',
  'const MAX_FILE_MB = 4',
  "script.src = '/vendor/tesseract/tesseract.min.js'",
  'currentTesseractApi',
  "typeof api?.createWorker === 'function'",
  'ocr_engine_unavailable',
  'ocr_runtime_load_failed',
  'ocr_worker_init_failed',
  "parser_version: BILL_PARSER_VERSION",
  "engine: parserMode === 'ocr' ? 'tesseract.js' : 'pdfjs'",
]) assert.ok(parser.includes(marker),`Bill parser resilience marker missing: ${marker}`);

assert.ok(!parser.includes("import('/vendor/tesseract/tesseract.esm.min.js')"),'Fragile dynamic ESM Tesseract import must be absent');
assert.equal(parserTest.MAX_FILE_MB,4);
assert.equal(parserTest.BILL_PARSER_VERSION,'econ-bill-parser-v2.0');
assert.equal(parserTest.OCR_ENGINE_VERSION,'7.0.0');
assert.equal(parserTest.PDF_ENGINE_VERSION,'6.2.108');

console.log('Bill OCR runtime V2: PASS · local UMD runtime / explicit diagnostics / aligned 4 MB contract');
