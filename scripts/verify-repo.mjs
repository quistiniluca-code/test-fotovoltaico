import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const required = [
  'public/index.html',
  'public/assets/bill-parser.js',
  'public/vendor/pdfjs/pdf.mjs',
  'public/vendor/pdfjs/pdf.worker.mjs',
  'public/vendor/tesseract/tesseract.min.js',
  'public/vendor/tesseract/worker.min.js',
  'public/vendor/tessdata/ita.traineddata.gz',
  'netlify.toml',
  'netlify/functions/config.js',
  'netlify/functions/health.js',
  'netlify/functions/leads.js',
  'netlify/functions/bill-attachments.js',
  'netlify/functions/document-retention.js',
  'netlify/functions/admin-leads.js',
  'netlify/functions/analytics-summary.js',
  'netlify/functions/events.js',
  'netlify/functions/_shared/lead-identity.js',
  'netlify/functions/_shared/blob-store.js',
  'netlify/functions/_shared/bill-processing.js',
  'netlify/database/migrations/20260814201500_create-lead-attachments/migration.sql',
  'netlify/database/migrations/20260815112500_add-bill-processing-trace/migration.sql',
  'netlify/database/migrations/20260815150000_data-layer-v3/migration.sql',
  'scripts/patch-bill-runtime-resilience-v2.mjs',
  'scripts/patch-remove-confidence.mjs',
  'scripts/patch-address-flow-v2.mjs',
  'scripts/patch-professional-archive-v1.mjs',
  'scripts/patch-data-layer-v3.mjs',
  'tests/lead-storage-v18.test.mjs',
  'tests/bill-ocr-runtime-v2.test.mjs',
  'tests/professional-lead-bill-archive-v1.test.mjs',
  'tests/data-layer-v3.test.mjs',
  'tests/result-flow-v2.test.mjs',
  'tests/scoped-flow-regression.test.mjs',
  'tests/address-flow-v2.test.mjs',
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
  '/api/config', '/api/leads', '/api/events', '/api/bill-attachments',
  "import('/assets/bill-parser.js')", 'browser-local',
  "power_kw:billVal('power_kw')", 'state.a.lead_id=j.lead_id',
  'Aumentare l’indipendenza dalla rete', 'const attribution=(()=>', 'Informativa privacy non configurata',
  'ULTIMO DATO SUL TUO CASO', 'IL TUO PROFILO ECON', 'Sblocca simulazione e sorpresa',
  'Scopri il tuo potenziale con ECON', 'IL TUO POTENZIALE ECON', 'SORPRESA ECON SBLOCCATA',
  'WALLBOX', 'PIANO A INDUZIONE', 'TERMOSTATO SMART', 'ENERGY MONITOR',
  "$('#pill')?.addEventListener('click',()=>go(n===14?16:n+1))",
  'ADDRESS FLOW V2 · OCR-first + manual fallback', 'function parseSupplyAddress(rawValue)',
  'id="street"', 'id="civic"', 'id="city"', 'id="province"',
  'Indirizzo precompilato dalla bolletta', 'Indirizzo non rilevato dalla bolletta',
  'PROFESSIONAL LEAD + BILL ARCHIVE V2', 'bill_attachment:state.billAttachment||undefined',
  'bill_processing:state.billProcessing||undefined', 'privacy_acknowledged', 'state.leadSaving=true',
  'file_retained:true', 'j.created!==false',
  'DATA LAYER V3 · idempotent requests + resilient telemetry + richer attribution',
  'request_id:state.leadRequestId', 'client_event_id:clientEventId', 'submitLeadPayload(payload)',
]) {
  if (!html.includes(marker)) throw new Error(`Frontend missing required marker: ${marker}`);
}
if (html.includes('/api/parser/ticket')) throw new Error('Legacy external-parser ticket still referenced by frontend');
if (html.includes("const belief=state.a.initial_system_belief;if([1,2,4].includes(belief))")) {
  throw new Error('Economic simulation still depends on imagined battery/system choice');
}
if (html.includes("supply_address:billVal('supply_address')")) {
  throw new Error('Redundant bill supply address is still persisted in bill_summary');
}
if (html.includes('state.billAttachment=await archiveBillFile(file)')) {
  throw new Error('Bill file must not be archived before privacy acknowledgement');
}
if (html.includes("if(state.a.bill_data_mode==='bill'&&!state.billAttachment)")) {
  throw new Error('Bill archival must not depend on successful parsing');
}
for (const marker of [
  'Quanto sei sicuro della tua <span class="accent">scelta</span>?',
  'confidence_before_data',
  'confidence_after_first_data',
]) {
  if (html.includes(marker)) throw new Error(`Removed confidence flow marker still present: ${marker}`);
}
if (/\botp\b/i.test(html) || /one[- ]time password/i.test(html) || /\/api\/otp/i.test(html)) {
  throw new Error('OTP flow must remain absent from frontend');
}
for (const marker of ['id="addressSearch"', 'id="postal"', "fetch('/api/address/suggest?q='", 'Cerca via / piazza e numero civico']) {
  if (html.includes(marker)) throw new Error(`Legacy address flow marker still present: ${marker}`);
}

const billParser = fs.readFileSync('public/assets/bill-parser.js', 'utf8');
for (const marker of [
  'BILL OCR RUNTIME RESILIENCE V2',
  'const MAX_FILE_MB = 4',
  "script.src = '/vendor/tesseract/tesseract.min.js'",
  'currentTesseractApi', 'ocr_engine_unavailable', 'ocr_runtime_load_failed',
  "parser_version: BILL_PARSER_VERSION",
]) {
  if (!billParser.includes(marker)) throw new Error(`Bill parser resilience marker missing: ${marker}`);
}
if (billParser.includes("import('/vendor/tesseract/tesseract.esm.min.js')")) {
  throw new Error('Fragile Tesseract ESM import still referenced by bill parser');
}

const leadFn = fs.readFileSync('netlify/functions/leads.js', 'utf8');
for (const marker of [
  'econ-fv-leads-prelive', 'econ.lead.record.v3', 'persisted: true', 'server: {',
  'privacy_not_configured', 'privacy_version_mismatch', 'MAX_LEAD_JSON_CHARS',
  'verifiedBillAttachment', 'duplicate_suppressed', 'upsertLeadBundleToDatabase',
  'dataStore(LEAD_STORE', 'skipped_existing_lead', 'bill_processing: processing',
  'request_replayed', 'contact_id', 'document_id',
]) {
  if (!leadFn.includes(marker)) throw new Error(`Lead storage function missing marker: ${marker}`);
}

const attachmentFn = fs.readFileSync('netlify/functions/bill-attachments.js', 'utf8');
for (const marker of [
  'econ-fv-bill-files-v1', 'privacy_ack_required', 'privacy_version_mismatch',
  'createHash("sha256")', 'consistency: "strong"', '/api/bill-attachments',
  'processingFromForm', 'normalizeBillProcessing', 'dataStore(BILL_FILE_STORE',
  'detectContentType', 'bill_file_signature_mismatch', 'superseded_blob_preserved',
]) {
  if (!attachmentFn.includes(marker)) throw new Error(`Bill attachment function missing marker: ${marker}`);
}

const databaseFn = fs.readFileSync('netlify/functions/_shared/database.js', 'utf8');
for (const marker of [
  'attachmentProcessingValues', 'parse_status', 'parser_version', 'processing = EXCLUDED.processing',
  'pg_advisory_xact_lock', 'econ_fv_contacts', 'econ_fv_lead_requests', 'econ_fv_documents',
  'ON CONFLICT (mobile_normalized) DO UPDATE', 'request_id_conflict',
]) {
  if (!databaseFn.includes(marker)) throw new Error(`Database V3 marker missing: ${marker}`);
}

const retentionFn = fs.readFileSync('netlify/functions/document-retention.js', 'utf8');
for (const marker of ['econ_fv_documents', "status = 'deleted'", 'econ_fv_lead_attachments', 'schedule: "0 2 * * 0"']) {
  if (!retentionFn.includes(marker)) throw new Error(`Document retention marker missing: ${marker}`);
}

const blobStoreFn = fs.readFileSync('netlify/functions/_shared/blob-store.js', 'utf8');
for (const marker of ['getDeployStore', 'getStore', 'deploymentContext() === "production"']) {
  if (!blobStoreFn.includes(marker)) throw new Error(`Blob scope helper missing marker: ${marker}`);
}

const configFn = fs.readFileSync('netlify/functions/config.js', 'utf8');
for (const marker of [
  'privacy_ready', 'ECON_PRIVACY_URL', 'ECON_PRIVACY_VERSION', 'bill_file_stored: true',
  'bill_attachment_endpoint', 'bill_archive_on_parse_failure: true', 'bill_max_file_bytes',
  'bill_parser_version: "econ-bill-parser-v2.0"', 'nonproduction_blob_scope: "deploy"',
  'data_layer_version: "data-layer-v3"', 'document_history: true', 'request_idempotency: true',
]) {
  if (!configFn.includes(marker)) throw new Error(`Runtime config missing archive marker: ${marker}`);
}

const healthFn = fs.readFileSync('netlify/functions/health.js', 'utf8');
for (const marker of [
  '1.8-data-layer-v3', 'lead-bill-archive-v2', 'data-layer-v3', 'browser-local', 'privacy_ready',
  'admin_auth_configured', 'attachments', 'duplicate_conversion_suppression: true',
  'contacts', 'requests', 'documents', 'document_retention_days: 180',
]) {
  if (!healthFn.includes(marker)) throw new Error(`Health function missing archive marker: ${marker}`);
}
if (healthFn.includes('ECON_PARSER_API_URL')) throw new Error('Health endpoint still references legacy external parser');

const adminFn = fs.readFileSync('netlify/functions/admin-leads.js', 'utf8');
for (const marker of [
  'ECON_ADMIN_TOKEN', 'ADMIN_TOKEN_SHA256_FALLBACK', 'ECON_ADMIN_AUTH_DIGEST', 'sha256Hex',
  '/api/admin/leads', 'format === "csv"', 'bill_attachment_id', 'bill_sha256',
  'bill_parse_status', 'bill_parser_version', 'bill_data_mode', 'bill_parse_error_code',
  'contact_id', 'request_id', 'document_id', 'econ\\.lead\\.record\\.v[123]',
]) {
  if (!adminFn.includes(marker)) throw new Error(`Admin lead inspector missing marker: ${marker}`);
}

const analyticsFn = fs.readFileSync('netlify/functions/analytics-summary.js', 'utf8');
for (const marker of [
  'ECON_ADMIN_TOKEN', 'ECON_ADMIN_AUTH_DIGEST', 'ADMIN_TOKEN_SHA256_FALLBACK', 'unauthorized',
  '/api/analytics/summary', 'rateLimit', 'bill_pipeline', 'archive_success_rate', 'dataStore("econ-fv-events-v1")',
]) {
  if (!analyticsFn.includes(marker)) throw new Error(`Analytics summary marker missing: ${marker}`);
}

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

console.log('Repository verification: PASS · data layer v3 / resilient OCR / document history / request-event idempotency / scoped Blobs');
