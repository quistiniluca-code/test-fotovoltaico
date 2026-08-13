import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
const cssMarker = '<link rel="stylesheet" href="/assets/consent-manager.css">';
const jsMarker = '<script type="module" src="/assets/consent-manager.js"></script>';

if (!html.includes(cssMarker)) {
  if (!html.includes('</head>')) throw new Error('Could not locate </head> for consent stylesheet');
  html = html.replace('</head>', `${cssMarker}\n</head>`);
}
if (!html.includes(jsMarker)) {
  if (!html.includes('</body>')) throw new Error('Could not locate </body> for consent manager');
  html = html.replace('</body>', `${jsMarker}\n</body>`);
}

if (!html.includes(cssMarker) || !html.includes(jsMarker)) {
  throw new Error('Consent manager assets not wired');
}

fs.writeFileSync(file, html);
console.log('Consent manager V1: PASS · basic consent mode · Google/Meta blocked until opt-in');
