import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const offerCopy = 'La sorpresa indicata è offerta gratuitamente da ECON con l’installazione di un Sistema Energia ECON.';
const offerTerms = 'Tipologia, disponibilità e condizioni sono definite nell’offerta commerciale applicabile.';

for (const token of [
  'SURPRISE OFFER NOTE · v1',
  'reward-offer-note',
  'reward-offer-badge',
  'reward-offer-copy',
  'reward-offer-terms',
  'OMAGGIO ECON',
  offerCopy,
  offerTerms,
  'WHATSAPP FINAL CTA · v1',
  'https://wa.me/393783091137',
]) {
  if (!html.includes(token)) throw new Error(`Surprise offer note regression: missing ${token}`);
}

if ((html.match(/class="reward-offer-note"/g) || []).length !== 1) {
  throw new Error('Surprise offer note regression: offer note must render exactly once');
}
if ((html.match(/OMAGGIO ECON/g) || []).length !== 1) {
  throw new Error('Surprise offer note regression: offer badge must render exactly once');
}

const fnStart = html.indexOf('function economicResultBody(e,signal,surprise){');
const fnEnd = html.indexOf('\n}', fnStart);
if (fnStart < 0 || fnEnd < 0) throw new Error('Surprise offer note regression: final result renderer missing');
const fn = html.slice(fnStart, fnEnd + 2);
if (!fn.includes('reward-offer-note')) throw new Error('Surprise offer note regression: note escaped final surprise renderer');
if (!fn.includes("+request+whatsapp;")) throw new Error('Surprise offer note regression: final WhatsApp CTA composition changed');

for (const preserved of [
  'SORPRESA ECON SBLOCCATA',
  'function economic(',
  'id="leadSave" class="btn result-cta"',
  '/assets/hero/econ-home-energy-v3.jpeg',
]) {
  if (!html.includes(preserved)) throw new Error(`Surprise offer note regression: preserved behavior missing ${preserved}`);
}

console.log('Surprise offer note regression: PASS · compact conditional offer disclosure inside final reward card');
