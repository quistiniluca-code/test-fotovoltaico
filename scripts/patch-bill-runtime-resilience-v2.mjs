import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const parserPath = path.join(root, 'public', 'assets', 'bill-parser.js');
const marker = 'BILL OCR RUNTIME RESILIENCE V2';

function findFile(dir, predicate) {
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
}

const tesseractUmd = findFile('node_modules/tesseract.js/dist', (_, name) => name === 'tesseract.min.js');
if (!tesseractUmd) throw new Error('Tesseract browser UMD runtime not found');
const tesseractOut = path.join(root, 'public', 'vendor', 'tesseract', 'tesseract.min.js');
fs.mkdirSync(path.dirname(tesseractOut), { recursive: true });
fs.copyFileSync(tesseractUmd, tesseractOut);

let js = fs.readFileSync(parserPath, 'utf8');
if (js.includes(marker)) throw new Error('Bill OCR resilience patch already applied');

const constantsOld = "const MAX_FILE_MB = 20;\nconst MAX_OCR_PAGES = 5;";
const constantsNew = `/* ${marker} */\nconst MAX_FILE_MB = 4;\nconst MAX_OCR_PAGES = 5;\nconst BILL_PARSER_VERSION = 'econ-bill-parser-v2.0';\nconst OCR_ENGINE_VERSION = '7.0.0';\nconst PDF_ENGINE_VERSION = '6.2.108';`;
if (!js.includes(constantsOld)) throw new Error('Bill parser size constants not found');
js = js.replace(constantsOld, constantsNew);

const metaOld = `    meta: {\n      text_chars: joined.length,\n      bill_file_stored: false,\n      processing: 'browser-local',\n    },`;
const metaNew = `    meta: {\n      text_chars: joined.length,\n      bill_file_stored: false,\n      processing: 'browser-local',\n      parser_version: BILL_PARSER_VERSION,\n      engine: parserMode === 'ocr' ? 'tesseract.js' : 'pdfjs',\n      engine_version: parserMode === 'ocr' ? OCR_ENGINE_VERSION : PDF_ENGINE_VERSION,\n    },`;
if (!js.includes(metaOld)) throw new Error('Bill parser metadata block not found');
js = js.replace(metaOld, metaNew);

const workerStart = js.indexOf('async function createOcrWorker(onProgress, context = {}) {');
const workerEnd = js.indexOf('\nasync function pdfTextPages(pdf) {', workerStart);
if (workerStart < 0 || workerEnd < 0) throw new Error('Tesseract worker block not found');
const workerReplacement = String.raw`function ocrRuntimeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function currentTesseractApi() {
  const api = globalThis.Tesseract;
  return typeof api?.createWorker === 'function' ? api : null;
}

async function loadTesseractRuntime() {
  const ready = currentTesseractApi();
  if (ready) return ready;
  if (!tesseractPromise) {
    tesseractPromise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(value);
      };
      const validate = () => {
        const api = currentTesseractApi();
        if (api) finish(resolve, api);
        else finish(reject, ocrRuntimeError('ocr_engine_unavailable', 'Motore OCR locale non disponibile.'));
      };
      const fail = () => finish(reject, ocrRuntimeError('ocr_runtime_load_failed', 'Caricamento del motore OCR locale non riuscito.'));
      const timer = setTimeout(() => fail(), 15000);
      let script = document.querySelector('script[data-econ-tesseract-runtime]');
      if (script) {
        if (script.dataset.loaded === '1') validate();
        else {
          script.addEventListener('load', validate, { once: true });
          script.addEventListener('error', fail, { once: true });
        }
        return;
      }
      script = document.createElement('script');
      script.src = '/vendor/tesseract/tesseract.min.js';
      script.async = true;
      script.dataset.econTesseractRuntime = '1';
      script.addEventListener('load', () => {
        script.dataset.loaded = '1';
        validate();
      }, { once: true });
      script.addEventListener('error', fail, { once: true });
      document.head.appendChild(script);
    }).catch(error => {
      tesseractPromise = null;
      throw error;
    });
  }
  return tesseractPromise;
}

async function createOcrWorker(onProgress, context = {}) {
  const tesseract = await loadTesseractRuntime();
  const createWorker = tesseract?.createWorker;
  if (typeof createWorker !== 'function') throw ocrRuntimeError('ocr_engine_unavailable', 'Motore OCR locale non disponibile.');
  const origin = window.location.origin;
  try {
    return await createWorker('ita', 1, {
      workerPath: `${origin}/vendor/tesseract/worker.min.js`,
      langPath: `${origin}/vendor/tessdata`,
      corePath: `${origin}/vendor/tesseract-core`,
      logger: m => {
        if (m?.status === 'recognizing text') {
          const pct = Math.max(0, Math.min(100, Math.round((m.progress || 0) * 100)));
          onProgress?.({ stage: 'ocr', progress: pct, ...context });
        }
      },
    });
  } catch (cause) {
    const error = ocrRuntimeError(String(cause?.code || 'ocr_worker_init_failed'), 'Inizializzazione del motore OCR locale non riuscita.');
    error.cause = cause;
    throw error;
  }
}
`;
js = js.slice(0, workerStart) + workerReplacement + js.slice(workerEnd);

const sizeOld = "  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Il file supera ${MAX_FILE_MB} MB.`);";
const sizeNew = "  if (file.size > MAX_FILE_MB * 1024 * 1024) { const error = new Error(`Il file supera ${MAX_FILE_MB} MB.`); error.code = 'bill_file_too_large'; throw error; }";
if (!js.includes(sizeOld)) throw new Error('Bill parser size validation not found');
js = js.replace(sizeOld, sizeNew);

const exportOld = 'export const __test = { num, supplier, extract };';
const exportNew = 'export const __test = { num, supplier, extract, MAX_FILE_MB, BILL_PARSER_VERSION, OCR_ENGINE_VERSION, PDF_ENGINE_VERSION };';
if (!js.includes(exportOld)) throw new Error('Bill parser test export not found');
js = js.replace(exportOld, exportNew);

for (const required of [
  marker,
  "const MAX_FILE_MB = 4",
  "script.src = '/vendor/tesseract/tesseract.min.js'",
  'currentTesseractApi',
  'ocr_engine_unavailable',
  "parser_version: BILL_PARSER_VERSION",
]) {
  if (!js.includes(required)) throw new Error(`Bill OCR resilience marker missing: ${required}`);
}
if (js.includes("import('/vendor/tesseract/tesseract.esm.min.js')")) throw new Error('Fragile Tesseract ESM import still present');

fs.writeFileSync(parserPath, js);
console.log('Bill OCR runtime resilience V2: PASS · UMD runtime + explicit diagnostics + 4 MB contract');
