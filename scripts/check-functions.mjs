import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk('netlify/functions').filter((file) => file.endsWith('.js'));
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
console.log(`Function syntax check: PASS (${files.length} files)`);
