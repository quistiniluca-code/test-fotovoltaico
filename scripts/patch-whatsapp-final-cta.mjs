import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const marker = 'WHATSAPP FINAL CTA · v1';
const whatsappUrl = 'https://wa.me/393783091137';

if (html.includes(marker)) throw new Error('WhatsApp final CTA patch already applied');
if (html.includes(whatsappUrl)) throw new Error('WhatsApp final CTA URL already present before patch');

const fnStart = html.indexOf('function economicResultBody(e,signal,surprise){');
if (fnStart < 0) throw new Error('Could not locate final economic result renderer');
const fnEnd = html.indexOf('\n}', fnStart);
if (fnEnd < 0) throw new Error('Could not locate final economic result renderer boundary');

let fn = html.slice(fnStart, fnEnd + 2);
const requestLine = "  const request=state.a.commercial_request?'<div class=\"notice\"><b>Approfondimento ECON richiesto ✓</b></div>':'';";
if (!fn.includes(requestLine)) throw new Error('Could not locate final result request notice');
if (!fn.includes('+request;')) throw new Error('Could not locate final result return tail');

const whatsappLine = `  const whatsapp='<div class="actions whatsapp-final-wrap"><a id="whatsappFinal" class="btn whatsapp-final-cta" href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" aria-label="Scrivi a ECON su WhatsApp">Scrivici su WhatsApp →</a></div>';`;
fn = fn.replace(requestLine, `${requestLine}\n${whatsappLine}`);
fn = fn.replace('+request;', '+request+whatsapp;');
html = html.slice(0, fnStart) + fn + html.slice(fnEnd + 2);

const css = String.raw`
/* ${marker} */
.whatsapp-final-wrap{margin-top:12px}
.whatsapp-final-cta{display:flex;align-items:center;justify-content:center;min-height:56px;text-decoration:none;background:var(--l);color:var(--d);border:1px solid var(--l);box-shadow:0 11px 26px rgba(4,61,0,.14)}
.whatsapp-final-cta:hover,.whatsapp-final-cta:focus-visible{background:var(--d);color:#fff;border-color:var(--d)}
@media(max-width:520px){.whatsapp-final-wrap{margin-top:8px}.whatsapp-final-cta{min-height:48px;font-size:14px}}
@media(max-width:520px) and (max-height:700px){.whatsapp-final-wrap{margin-top:6px}.whatsapp-final-cta{min-height:46px;font-size:13px}}
`;

if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for WhatsApp CTA');
html = html.replace('</style>', `${css}\n</style>`);

fs.writeFileSync(file, html);
console.log(`WhatsApp final CTA: PASS · ${whatsappUrl}`);
