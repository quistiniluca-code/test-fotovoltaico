import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const marker = 'SURPRISE OFFER NOTE · v1';
const offerCopy = 'La sorpresa indicata è offerta gratuitamente da ECON con l’installazione di un Sistema Energia ECON.';
const offerTerms = 'Tipologia, disponibilità e condizioni sono definite nell’offerta commerciale applicabile.';

if (html.includes(marker)) throw new Error('Surprise offer note patch already applied');
if (html.includes(offerCopy)) throw new Error('Surprise offer note copy already present before patch');
if (!html.includes('WHATSAPP FINAL CTA · v1')) throw new Error('Surprise offer note requires final WhatsApp CTA patch first');

const fnStart = html.indexOf('function economicResultBody(e,signal,surprise){');
if (fnStart < 0) throw new Error('Could not locate final economic result renderer');
const fnEnd = html.indexOf('\n}', fnStart);
if (fnEnd < 0) throw new Error('Could not locate final economic result renderer boundary');

let fn = html.slice(fnStart, fnEnd + 2);
const reward = "<div class=\"reward-v2\"><small>SORPRESA ECON SBLOCCATA</small><h3>'+esc(surprise.title)+'</h3><p>'+esc(surprise.reason)+'</p></div>";
if (!fn.includes(reward)) throw new Error('Could not locate final surprise card markup');

const offerNote = '<div class="reward-offer-note" role="note"><span class="reward-offer-badge">OMAGGIO ECON</span><span class="reward-offer-copy">'+offerCopy+'</span><span class="reward-offer-terms">'+offerTerms+'</span></div>';
fn = fn.replace(reward, reward.replace(/<\/div>$/, offerNote + '</div>'));
html = html.slice(0, fnStart) + fn + html.slice(fnEnd + 2);

const css = String.raw`
/* ${marker} */
.reward-offer-note{position:relative;z-index:1;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:4px 10px;margin-top:14px;padding:12px 13px;border:1px solid #fff;border-radius:16px;background:#fff;color:var(--d);box-shadow:0 8px 22px rgba(4,61,0,.12)}
.reward-offer-badge{display:inline-flex;align-items:center;justify-content:center;min-height:22px;padding:4px 8px;border-radius:999px;background:var(--l);color:var(--d);font-size:9px;font-weight:700;line-height:1;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.reward-offer-copy{font-size:12.5px;font-weight:700;line-height:1.34;letter-spacing:-.01em}
.reward-offer-terms{grid-column:2;color:var(--d);font-size:9.5px;line-height:1.32;opacity:.72}
@media(max-width:520px){.reward-offer-note{gap:3px 8px;margin-top:10px;padding:9px 10px;border-radius:13px}.reward-offer-badge{min-height:19px;padding:3px 6px;font-size:8px}.reward-offer-copy{font-size:10.5px;line-height:1.25}.reward-offer-terms{font-size:8.5px;line-height:1.2}}
@media(max-width:520px) and (max-height:700px){.reward-offer-note{margin-top:7px;padding:7px 8px}.reward-offer-copy{font-size:10px}.reward-offer-terms{display:none}}
`;

if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for surprise offer note');
html = html.replace('</style>', `${css}\n</style>`);

fs.writeFileSync(file, html);
console.log('Surprise offer note: PASS · conditional ECON complimentary offer disclosed');
