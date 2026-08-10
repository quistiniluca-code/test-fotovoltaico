import fs from 'node:fs';
import path from 'node:path';

const required = [
  'public/index.html',
  'netlify.toml',
  'netlify/functions/config.js',
  'netlify/functions/parser-ticket.js',
  'netlify/functions/leads.js',
  'netlify/functions/events.js',
  'parser-service/app.py',
  'parser-service/requirements.txt',
  'parser-service/Dockerfile',
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

const html = fs.readFileSync('public/index.html', 'utf8');
for (const marker of ['/api/config', '/api/parser/ticket', '/api/leads', '/api/events']) {
  if (!html.includes(marker)) throw new Error(`Frontend missing endpoint marker: ${marker}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return ['node_modules', '.git', '.netlify'].includes(entry.name) ? [] : walk(full);
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

console.log('Repository verification: PASS');
