const DIRECT = 'DATO DA BOLLETTA';
const CALC = 'CALCOLATO DA BOLLETTA';
const MAX_FILE_MB = 20;
const MAX_OCR_PAGES = 5;

let pdfjsPromise;
let tesseractPromise;

const cleanText = (s = '') => String(s).replace(/\r/g, '\n').replace(/[\t\f\v]+/g, ' ').replace(/\u00a0/g, ' ');
const flat = (s = '') => cleanText(s).replace(/\s+/g, ' ').trim();

function num(v) {
  if (v == null) return null;
  let s = String(v).replace(/\u00a0/g, ' ').replace(/€/g, '').replace(/kWh/gi, '').replace(/kW/gi, '').trim();
  s = s.replace(/[^0-9,.-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function field(value, source = DIRECT, page = null, confidence = 0.9) {
  return { value, source, page, confidence };
}

function supplier(text) {
  const u = text.toUpperCase();
  if (u.includes('HERA COMM') || u.includes('GRUPPOHERA')) return 'HERA';
  if (u.includes('DOLOMITI ENERGIA')) return 'Dolomiti Energia';
  if (u.includes('OCTOPUS ENERGY')) return 'Octopus Energy';
  if (u.includes('PLENITUDE')) return 'Plenitude';
  if (u.includes('E.ON') || u.includes('EON ENERGIA')) return 'E.ON';
  return 'Fornitore non riconosciuto';
}

function findOnPages(pages, patterns) {
  for (let i = 0; i < pages.length; i++) {
    const t = flat(pages[i]);
    for (const pattern of patterns) {
      const m = t.match(pattern);
      if (m) return { match: m, page: i + 1 };
    }
  }
  return null;
}

function parseDate(value) {
  const m = String(value || '').match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthsBetween(a, b) {
  const da = parseDate(a), db = parseDate(b);
  if (!da || !db || db < da) return null;
  return Math.max(1, Math.round((db - da) / 86400000 / 30.44));
}

function daysBetweenInclusive(a, b) {
  const da = parseDate(a), db = parseDate(b);
  if (!da || !db || db < da) return null;
  return Math.max(1, Math.round((db - da) / 86400000) + 1);
}

function extract(pages, parserMode = 'text') {
  const joined = flat(pages.join('\n'));
  const fields = {};

  let h = findOnPages(pages, [
    /consumo annuo(?: aggiornato[^:]{0,90})?[: ]+([\d.]+(?:,\d+)?)\s*kWh/i,
    /in un anno hai consumato\s*([\d.]+(?:,\d+)?)\s*kWh/i,
    /totale consumo annuo[^:]{0,80}:\s*([\d.]+(?:,\d+)?)\s*kWh/i,
    /CONSUMO ANNUO[^0-9]{0,50}([\d.]+(?:,\d+)?)\s*kWh/i,
    /consumo annuo\s*\(kWh\)[: ]+([\d.]+(?:,\d+)?)/i,
    /([\d.]+(?:,\d+)?)\s*kWh\s*\/\s*anno/i,
  ]);
  if (h) fields.annual_kwh = field(num(h.match[1]), DIRECT, h.page, parserMode === 'ocr' ? 0.82 : 0.96);

  h = findOnPages(pages, [
    /(?:totale )?spesa annua(?: sostenuta)?[^:]{0,110}:\s*([\d.]+,\d{2})\s*€/i,
    /SPESA ANNUA[^0-9]{0,90}([\d.]+,\d{2})\s*€/i,
  ]);
  if (h) fields.annual_spend = field(num(h.match[1]), DIRECT, h.page, parserMode === 'ocr' ? 0.78 : 0.94);

  h = findOnPages(pages, [
    /consumo totale fatturato(?: del periodo)?[: ]+([\d.]+(?:,\d+)?)\s*kWh/i,
    /CONSUMO FATTURATO[: ]+([\d.]+(?:,\d+)?)\s*kWh/i,
    /QUOTA PER CONSUMI\s+([\d.]+(?:,\d+)?)\s*kWh/i,
  ]);
  if (h) fields.period_kwh = field(num(h.match[1]), DIRECT, h.page, parserMode === 'ocr' ? 0.8 : 0.94);

  h = findOnPages(pages, [
    /TOTALE BOLLETTA\s+([\d.]+,\d{2})\s*€/i,
    /Totale bolletta\s+([\d.]+,\d{2})\s*€/i,
    /Totale da pagare(?: entro[^0-9]{0,30})?[: ]+([\d.]+,\d{2})\s*€/i,
    /Questo mese dovrai pagare\s+([\d.]+,\d{2})\s*€/i,
  ]);
  if (h) fields.bill_amount = field(num(h.match[1]), DIRECT, h.page, parserMode === 'ocr' ? 0.78 : 0.94);

  h = findOnPages(pages, [/(?:Codice\s+|Punto di prelievo\s*\()?POD\)?[: ]+\s*(IT\d{3}E\d{6,})/i]);
  if (h) fields.pod = field(h.match[1].trim(), DIRECT, h.page, parserMode === 'ocr' ? 0.82 : 0.98);

  h = findOnPages(pages, [/Potenza impegnata[: ]+\s*([\d,.]+)\s*kW/i]);
  if (h) fields.power_kw = field(num(h.match[1]), DIRECT, h.page, parserMode === 'ocr' ? 0.82 : 0.96);

  h = findOnPages(pages, [
    /(?:Indirizzo di fornitura|Servizio fornito in)[: ]+(.{5,115}?)(?=\s+(?:Codice POD|POD|Punto di prelievo|Potenza|Scontrino|Quota|$))/i,
  ]);
  if (h) fields.supply_address = field(h.match[1].trim().replace(/[.;]+$/, ''), DIRECT, h.page, parserMode === 'ocr' ? 0.72 : 0.9);

  h = findOnPages(pages, [
    /F1\s+F2\s+F3\s+TOTALE[^0-9]{0,60}([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i,
    /CONSUMO ANNUO\s*kWh\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i,
  ]);
  if (h) {
    const values = [num(h.match[1]), num(h.match[2]), num(h.match[3])];
    if (values.every(v => v != null)) {
      fields.f1_kwh = field(values[0], DIRECT, h.page, parserMode === 'ocr' ? 0.7 : 0.9);
      fields.f2_kwh = field(values[1], DIRECT, h.page, parserMode === 'ocr' ? 0.7 : 0.9);
      fields.f3_kwh = field(values[2], DIRECT, h.page, parserMode === 'ocr' ? 0.7 : 0.9);
    }
  }

  h = findOnPages(pages, [
    /consumo annuo.{0,170}?(\d{1,2}[/.]\d{1,2}[/.]\d{4}).{0,30}?(?:-|al|a)\s*(\d{1,2}[/.]\d{1,2}[/.]\d{4})/i,
    /(\d{1,2}[/.]\d{1,2}[/.]\d{4}).{0,30}?(?:-|al|a)?\s*(\d{1,2}[/.]\d{1,2}[/.]\d{4}).{0,90}?consumo annuo/i,
  ]);
  if (h) {
    const months = monthsBetween(h.match[1], h.match[2]);
    if (months) fields.coverage_months = field(months, CALC, h.page, 0.95);
  }

  if (!fields.coverage_months) {
    h = findOnPages(pages, [
      /Periodo di riferimento considerato da\s*(\d{1,2}[/.]\d{1,2}[/.]\d{4})\s*(?:al|a|-)\s*(\d{1,2}[/.]\d{1,2}[/.]\d{4})/i,
      /consumo annuo[^\d]{0,80}(\d{1,2}[/.]\d{1,2}[/.]\d{4})\s*(?:-|al|a)\s*(\d{1,2}[/.]\d{1,2}[/.]\d{4})/i,
    ]);
    if (h) {
      const months = monthsBetween(h.match[1], h.match[2]);
      if (months) fields.coverage_months = field(months, CALC, h.page, 0.9);
    }
  }

  if (!fields.annual_kwh && fields.period_kwh) {
    h = findOnPages(pages, [
      /Periodo (?:oggetto di )?fatturazione[: ]+(?:dal )?(\d{1,2}[/.]\d{1,2}[/.]\d{4}).{0,16}?(?:al|-)\s*(\d{1,2}[/.]\d{1,2}[/.]\d{4})/i,
      /PERIODO DI RIFERIMENTO[: ]+(?:dal )?(\d{1,2}[/.]\d{1,2}[/.]\d{4}).{0,16}?(?:al|-)\s*(\d{1,2}[/.]\d{1,2}[/.]\d{4})/i,
    ]);
    if (h) {
      const days = daysBetweenInclusive(h.match[1], h.match[2]);
      if (days) {
        fields.annual_kwh = field(Math.round(fields.period_kwh.value * 365 / days), CALC, h.page, 0.64);
        fields.coverage_months ||= field(Math.max(1, Math.round(days / 30.44)), CALC, h.page, 0.9);
      }
    }
  }

  if (!fields.annual_spend && fields.bill_amount && fields.period_kwh && fields.annual_kwh && fields.period_kwh.value) {
    const ratio = fields.annual_kwh.value / fields.period_kwh.value;
    if (ratio > 0 && ratio < 30) fields.annual_spend = field(Math.round(fields.bill_amount.value * ratio * 100) / 100, CALC, fields.bill_amount.page, 0.52);
  }

  return {
    schema: 'econ.bill.v1',
    supplier: supplier(joined),
    parser_mode: parserMode,
    fields,
    meta: {
      text_chars: joined.length,
      bill_file_stored: false,
      processing: 'browser-local',
    },
  };
}

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('/vendor/pdfjs/pdf.mjs').then(mod => {
      mod.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';
      return mod;
    });
  }
  return pdfjsPromise;
}

async function createOcrWorker(onProgress, context = {}) {
  if (!tesseractPromise) tesseractPromise = import('/vendor/tesseract/tesseract.esm.min.js');
  const { createWorker } = await tesseractPromise;
  const origin = window.location.origin;
  return createWorker('ita', 1, {
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
}

async function pdfTextPages(pdf) {
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items || []) {
      text += String(item.str || '') + (item.hasEOL ? '\n' : ' ');
    }
    pages.push(text);
    page.cleanup?.();
  }
  return pages;
}

async function renderPdfPage(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const targetWidth = Math.min(1700, Math.max(1100, base.width * 1.8));
  const scale = targetWidth / base.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup?.();
  return canvas;
}

async function ocrPdf(pdf, existingPages, onProgress) {
  const worker = await createOcrWorker(onProgress);
  const pages = [...existingPages];
  const limit = Math.min(pdf.numPages, MAX_OCR_PAGES);
  try {
    for (let i = 1; i <= limit; i++) {
      onProgress?.({ stage: 'ocr-page', page: i, pages: limit, progress: 0 });
      const canvas = await renderPdfPage(pdf, i);
      const { data } = await worker.recognize(canvas);
      pages[i - 1] = `${pages[i - 1] || ''}\n${data?.text || ''}`;
      const parsed = extract(pages, 'ocr');
      const f = parsed.fields;
      const enough = f.annual_kwh && (f.bill_amount || f.period_kwh || f.pod) && i >= 2;
      if (enough) break;
    }
  } finally {
    await worker.terminate();
  }
  return pages;
}

async function parsePdf(file, onProgress) {
  onProgress?.({ stage: 'pdf', progress: 5 });
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true });
  const pdf = await task.promise;
  onProgress?.({ stage: 'pdf', progress: 20, pages: pdf.numPages });
  let pages = await pdfTextPages(pdf);
  let parsed = extract(pages, 'text');
  const textChars = flat(pages.join('\n')).length;
  if (textChars < 300 || !parsed.fields.annual_kwh) {
    onProgress?.({ stage: 'ocr-start', progress: 0, pages: Math.min(pdf.numPages, MAX_OCR_PAGES) });
    pages = await ocrPdf(pdf, pages, onProgress);
    parsed = extract(pages, 'ocr');
  }
  await task.destroy?.();
  return parsed;
}

async function parseImage(file, onProgress) {
  const worker = await createOcrWorker(onProgress, { page: 1, pages: 1 });
  try {
    onProgress?.({ stage: 'ocr-start', page: 1, pages: 1, progress: 0 });
    const { data } = await worker.recognize(file);
    return extract([data?.text || ''], 'ocr');
  } finally {
    await worker.terminate();
  }
}

export async function parseBillFile(file, { onProgress } = {}) {
  if (!(file instanceof File)) throw new Error('Seleziona una bolletta valida.');
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Il file supera ${MAX_FILE_MB} MB.`);
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  let parsed;
  if (type.includes('pdf') || name.endsWith('.pdf')) parsed = await parsePdf(file, onProgress);
  else if (type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(name)) parsed = await parseImage(file, onProgress);
  else throw new Error('Formato non supportato. Usa PDF, JPG, PNG o WebP.');

  if (!parsed.fields?.annual_kwh?.value) {
    const error = new Error('Non siamo riusciti a identificare con sufficiente affidabilità il consumo di riferimento. Prova con una bolletta più nitida o un PDF originale.');
    error.code = 'annual_consumption_not_found';
    throw error;
  }
  onProgress?.({ stage: 'done', progress: 100 });
  return parsed;
}

export const __test = { num, supplier, extract };
