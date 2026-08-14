import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const url = 'https://wa.me/393783091137';

const required = [
  'WHATSAPP FINAL CTA · v1',
  'id="whatsappFinal"',
  `href="${url}"`,
  'target="_blank"',
  'rel="noopener noreferrer"',
  "const whatsappAria=estimateMode?'Invia la bolletta a ECON su WhatsApp':'Scrivi a ECON su WhatsApp';",
  'aria-label="\'+esc(whatsappAria)+\'"',
  'Scrivici su WhatsApp →',
  '.whatsapp-final-cta{display:flex',
  'background:var(--l)',
  'color:var(--d)',
  'function economicResultBody(e,signal,surprise){',
  'SORPRESA ECON SBLOCCATA',
];

for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`WhatsApp final CTA regression: missing ${marker}`);
}

if ((html.match(/https:\/\/wa\.me\/393783091137/g) || []).length !== 1) {
  throw new Error('WhatsApp final CTA regression: URL must appear exactly once');
}
if ((html.match(/id="whatsappFinal"/g) || []).length !== 1) {
  throw new Error('WhatsApp final CTA regression: button must appear exactly once');
}
if (html.indexOf('id="whatsappFinal"') < html.indexOf('function economicResultBody(e,signal,surprise){')) {
  throw new Error('WhatsApp final CTA regression: CTA is not scoped to the final result renderer');
}
if (!html.includes('+request+whatsapp;')) {
  throw new Error('WhatsApp final CTA regression: CTA is not appended after the final result content');
}
if (!html.includes('function economic(') || !html.includes('state.a.lead_id=j.lead_id')) {
  throw new Error('WhatsApp final CTA regression: core funnel/economic behavior changed unexpectedly');
}

console.log('WhatsApp final CTA regression: PASS · final result only · exact wa.me link · contextual label');
