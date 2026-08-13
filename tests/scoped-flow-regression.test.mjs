import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');

for (const marker of [
  'Quanto sei sicuro della tua <span class="accent">scelta</span>?',
  'confidence_before_data',
  'confidence_after_first_data',
  'if(n===15){',
]) {
  if (html.includes(marker)) throw new Error(`Removed confidence flow marker still present: ${marker}`);
}

if (!html.includes("$('#pill')?.addEventListener('click',()=>go(n===14?16:n+1))")) {
  throw new Error('System-choice screen must route directly to prediction summary');
}

const otpPatterns = [
  /\botp\b/i,
  /one[- ]time password/i,
  /send[-_/]?otp/i,
  /verify[-_/]?otp/i,
  /\/api\/otp/i,
];
for (const pattern of otpPatterns) {
  if (pattern.test(html)) throw new Error(`OTP flow must remain absent from frontend: ${pattern}`);
}

console.log('Scoped flow regression: PASS · confidence screen removed · OTP absent');
