import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const renderStart = html.indexOf('else if(n===15){');
const renderEnd = html.indexOf('else if(n===16)', renderStart);
if (renderStart < 0 || renderEnd < 0 || renderEnd <= renderStart) {
  throw new Error('Could not locate confidence screen');
}
html = html.slice(0, renderStart) + html.slice(renderEnd);

const securityCard = '<div class="lock-card"><small>Sicurezza</small><b>${state.a.confidence_before_data??60}%</b></div>';
if (!html.includes(securityCard)) throw new Error('Could not locate confidence summary card');
html = html.replace(securityCard, '');

const bindStart = html.indexOf('function bind(){');
const bind15 = html.indexOf('if(n===15){', bindStart);
const bind16 = html.indexOf('if(n===16)', bind15);
if (bindStart < 0 || bind15 < 0 || bind16 < 0 || bind16 <= bind15) {
  throw new Error('Could not locate confidence screen handler');
}
html = html.slice(0, bind15) + html.slice(bind16);

const defaultSingleRoute = "$('#pill')?.addEventListener('click',()=>go(n+1))";
const skipConfidenceRoute = "$('#pill')?.addEventListener('click',()=>go(n===14?16:n+1))";
if (!html.includes(defaultSingleRoute)) throw new Error('Could not locate single-screen route');
html = html.replace(defaultSingleRoute, skipConfidenceRoute);

for (const forbidden of [
  'Quanto sei sicuro della tua <span class="accent">scelta</span>?',
  'confidence_before_data',
  'confidence_after_first_data',
]) {
  if (html.includes(forbidden)) throw new Error(`Confidence flow marker still present: ${forbidden}`);
}
if (!html.includes(skipConfidenceRoute)) throw new Error('System-choice screen does not skip confidence step');
if (!html.includes("else if(n===16)")) throw new Error('Prediction summary screen missing after confidence removal');

fs.writeFileSync(file, html);
console.log('Confidence step removal: PASS · system choice routes directly to prediction summary');
