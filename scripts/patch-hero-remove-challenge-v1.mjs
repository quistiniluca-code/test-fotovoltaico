import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
const marker = 'HERO CLEAN V1 · remove challenge score strip';

if (html.includes(marker)) throw new Error('Hero Clean V1 already applied');
if (!html.includes('HERO V2 · premium + challenge · mobile first')) throw new Error('Hero Clean V1 requires Hero V2');

const start = '<div class="intro-challenge" aria-label="Struttura del test">';
const end = '<p class="intro-copy">';
const startIndex = html.indexOf(start);
const endIndex = html.indexOf(end, startIndex);
if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) throw new Error('Hero challenge strip not found');

html = html.slice(0, startIndex) + `<!-- ${marker} -->\n  ` + html.slice(endIndex);

for (const forbidden of ['<div class="intro-challenge"', '>5 sfide<', '>100 punti<', '>+ una <span class="challenge-accent">sorpresa<']) {
  if (html.includes(forbidden)) throw new Error(`Hero Clean V1 failed to remove: ${forbidden}`);
}

fs.writeFileSync(file, html);
console.log('Hero Clean V1: PASS · challenge score strip removed from homepage');
