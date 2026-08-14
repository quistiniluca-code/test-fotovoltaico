import fs from 'node:fs';

const patch = fs.readFileSync('scripts/patch-hero-png.mjs', 'utf8');
const source = fs.readFileSync('public/index.html', 'utf8');

if (!patch.includes('/assets/hero/econ-home-energy-v3.jpeg')) throw new Error('Hero V3 patch path missing');
if (!patch.includes('3b071cbd8a690ef1bd10637cd3522fd26c926502b759d89b1463155c2bd45d7e')) throw new Error('Hero V3 checksum guard missing');
if (!patch.includes('expectedBytes = 214020')) throw new Error('Hero V3 byte-length guard missing');
if (!source.includes('Sistema energia domestico con impianto fotovoltaico')) throw new Error('Expected pre-patch hero source missing');

console.log('Hero V3 build source regression: PASS');
