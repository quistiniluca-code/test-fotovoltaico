import fs from 'node:fs';
import { createHash } from 'node:crypto';

const file = 'public/assets/hero/econ-home-energy-v3.jpeg';
const expectedSha256 = '3b071cbd8a690ef1bd10637cd3522fd26c926502b759d89b1463155c2bd45d7e';
const expectedBytes = 214020;

if (!fs.existsSync(file)) throw new Error('Hero V3 asset missing');
const image = fs.readFileSync(file);
if (image.length !== expectedBytes) throw new Error(`Hero V3 byte length mismatch: ${image.length}/${expectedBytes}`);
const digest = createHash('sha256').update(image).digest('hex');
if (digest !== expectedSha256) throw new Error(`Hero V3 checksum mismatch: ${digest}`);
if (image.subarray(0, 3).toString('hex') !== 'ffd8ff') throw new Error('Hero V3 is not a JPEG');

console.log('Hero V3 asset integrity: PASS');
