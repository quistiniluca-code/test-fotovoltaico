import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

if (!html.includes('HERO CLEAN V1 · remove challenge score strip')) {
  throw new Error('Hero Clean V1 marker missing');
}

for (const forbidden of [
  '<div class="intro-challenge"',
  '>5 sfide<',
  '>100 punti<',
  '>+ una <span class="challenge-accent">sorpresa<',
]) {
  if (html.includes(forbidden)) throw new Error(`Homepage challenge strip still present: ${forbidden}`);
}

for (const required of [
  'id="start" class="intro-cta"',
  '<p class="intro-copy">',
  'TEST FOTOVOLTAICO ECON',
]) {
  if (!html.includes(required)) throw new Error(`Homepage regression after strip removal: ${required}`);
}

console.log('Hero Clean V1 regression: PASS · score/challenge strip absent · CTA and hero copy preserved');
