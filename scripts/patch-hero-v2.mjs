import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');

const css = String.raw`
/* HERO V2 · premium + challenge · mobile first */
.intro-v2{position:relative;isolation:isolate;display:flex;flex-direction:column;gap:0;animation:introRise .38s ease-out both}
.intro-v2:before{content:"";position:absolute;z-index:-1;inset:-24px -22px auto;height:360px;background:radial-gradient(circle at 92% 18%,rgba(141,198,63,.14),transparent 34%),radial-gradient(circle at 10% 4%,rgba(141,198,63,.08),transparent 30%);pointer-events:none}
.intro-v2:after{content:"";position:absolute;z-index:-1;right:-14px;top:86px;width:126px;height:126px;opacity:.28;background-image:radial-gradient(circle,#8DC63F 1.1px,transparent 1.2px);background-size:12px 12px;mask-image:linear-gradient(135deg,#000,transparent 72%);pointer-events:none}
.intro-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:15px}
.intro-kicker,.intro-free{display:inline-flex;align-items:center;gap:7px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--d)}
.intro-kicker{padding:9px 12px;background:linear-gradient(90deg,rgba(141,198,63,.17),rgba(141,198,63,.07));border:1px solid rgba(141,198,63,.22)}
.intro-free{padding:8px 11px;background:#fff;border:1px solid var(--line);letter-spacing:.03em}
.intro-kicker svg,.intro-free svg{width:16px;height:16px;flex:0 0 auto}
.intro-title{max-width:620px;font-size:clamp(42px,9.8vw,62px);line-height:.94;letter-spacing:-.052em;text-wrap:balance}
.intro-challenge{display:flex;align-items:center;flex-wrap:wrap;gap:7px 10px;margin:17px 0 0;font-size:16px;font-weight:700;color:#243b21}
.intro-challenge .challenge-item{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.intro-challenge svg{width:18px;height:18px;color:var(--l)}
.intro-challenge .challenge-accent{color:#659d25}
.intro-copy{max-width:39ch;margin:18px 0 0;font-size:17px;line-height:1.52;color:#3f513a}
.intro-visual{position:relative;margin:23px 0 0;border:1px solid rgba(4,61,0,.12);border-radius:26px;background:linear-gradient(145deg,#fbfdf9,#eef7e5);overflow:hidden;box-shadow:0 18px 48px rgba(4,61,0,.07)}
.intro-visual svg{display:block;width:100%;height:auto}
.intro-benefits{display:grid;grid-template-columns:1fr;gap:9px;margin-top:14px}
.intro-benefit{display:grid;grid-template-columns:48px 1fr;align-items:center;gap:12px;min-height:88px;padding:13px 14px;border:1px solid rgba(4,61,0,.12);border-radius:18px;background:rgba(255,255,255,.92);box-shadow:0 7px 22px rgba(4,61,0,.035)}
.intro-benefit-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:linear-gradient(145deg,#f6faef,#e9f5dc);color:var(--d)}
.intro-benefit-icon svg{width:24px;height:24px}
.intro-benefit b{display:block;color:var(--d);font-size:15px;line-height:1.15;margin-bottom:4px}
.intro-benefit span{display:block;color:#50604b;font-size:12px;line-height:1.34}
.intro-privacy{display:grid;grid-template-columns:42px 1fr;align-items:center;gap:11px;margin-top:13px;padding:12px 14px;border-radius:17px;background:linear-gradient(90deg,#f8fbf3,#fff);border:1px solid var(--line)}
.intro-privacy-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--soft);color:var(--d)}
.intro-privacy-icon svg{width:22px;height:22px}
.intro-privacy b{display:block;color:var(--d);font-size:13px;margin-bottom:2px}
.intro-privacy span{display:block;color:#53634f;font-size:11px;line-height:1.35}
.intro-actions{margin-top:15px}
.intro-cta{width:100%;border:0;border-radius:999px;min-height:66px;padding:9px 10px 9px 21px;display:grid;grid-template-columns:1fr 48px;align-items:center;gap:12px;text-align:left;background:var(--d);color:#fff;font-family:Arimo,Arial,sans-serif;cursor:pointer;box-shadow:0 14px 34px rgba(4,61,0,.20);transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
.intro-cta:hover{background:#075401;box-shadow:0 17px 38px rgba(4,61,0,.24)}
.intro-cta:active{transform:translateY(1px) scale(.995)}
.intro-cta:focus-visible{outline:3px solid var(--l);outline-offset:3px}
.intro-cta-copy b{display:block;font-size:18px;line-height:1.12}
.intro-cta-copy span{display:block;margin-top:3px;color:#d8ead1;font-size:11px;line-height:1.25}
.intro-cta-arrow{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--l);color:var(--d);justify-self:end}
.intro-cta-arrow svg{width:22px;height:22px}
.intro-foot{margin:9px 0 0;text-align:center;color:#5c6b57;font-size:10px;line-height:1.3}
@keyframes introRise{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
@media(min-width:620px){.intro-benefits{grid-template-columns:repeat(3,1fr)}.intro-benefit{grid-template-columns:1fr;align-content:start;min-height:154px;padding:15px}.intro-benefit-icon{margin-bottom:2px}.intro-copy{font-size:18px}.intro-cta-copy b{font-size:20px}}
@media(max-width:380px){.intro-title{font-size:39px}.intro-challenge{font-size:15px}.intro-copy{font-size:16px}.intro-benefit{grid-template-columns:44px 1fr;padding:11px 12px}.intro-benefit-icon{width:42px;height:42px}.intro-cta-copy b{font-size:17px}}
@media(prefers-reduced-motion:reduce){.intro-v2{animation:none}.intro-cta{transition:none}}
`;

if (html.includes('/* HERO V2 · premium + challenge · mobile first */')) {
  throw new Error('Hero V2 CSS already present before patch');
}
if (!html.includes('</style>')) throw new Error('Could not locate style closing tag');
html = html.replace('</style>', `${css}\n</style>`);

const heroHtml = String.raw`<div class="intro-v2">
  <div class="intro-meta">
    <div class="intro-kicker"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3a5 5 0 0 1-10 0V4Zm-3 1h3v3a4 4 0 0 1-3-3Zm16 0h-3v3a4 4 0 0 0 3-3ZM12 12v4m-4 3h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>TEST FOTOVOLTAICO ECON</div>
    <div class="intro-free"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.5 8.2-8 10-4.5-1.8-8-5-8-10V6l8-3Zm-3 8 2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Test gratuito</div>
  </div>
  <h1 class="intro-title">Quanto sei pronto per il <span class="accent">fotovoltaico</span>?</h1>
  <div class="intro-challenge" aria-label="Struttura del test">
    <span class="challenge-item"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="m8 12 2.4 2.4L16 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>5 sfide</span></span>
    <span aria-hidden="true">·</span>
    <span class="challenge-item"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v3m9 6h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="challenge-accent">100 punti</span></span>
    <span aria-hidden="true">·</span>
    <span class="challenge-item"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v10H4V10Zm-1-4h18v4H3V6Zm9 0v14M12 6c-3 0-5-1-5-3 2.7-.5 4.3.6 5 3Zm0 0c3 0 5-1 5-3-2.7-.5-4.3.6-5 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span>+ una <span class="challenge-accent">sorpresa</span></span></span>
  </div>
  <p class="intro-copy">Metti alla prova quello che pensi di sapere sul fotovoltaico. Scopri quanto il tuo caso è già definito e quali dati servono per leggerlo davvero.</p>
  <figure class="intro-visual" aria-label="Sistema energia domestico con impianto fotovoltaico">
    <svg viewBox="0 0 620 330" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="bgv2" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#FBFDF8"/><stop offset="1" stop-color="#EAF5DE"/></linearGradient>
        <linearGradient id="roofv2" x1="0" x2="1"><stop stop-color="#043D00"/><stop offset="1" stop-color="#0B5B05"/></linearGradient>
        <linearGradient id="limev2" x1="0" x2="1"><stop stop-color="#8DC63F"/><stop offset="1" stop-color="#A9D85F"/></linearGradient>
        <filter id="glowv2"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <rect width="620" height="330" rx="25" fill="url(#bgv2)"/>
      <g opacity=".22" stroke="#8DC63F" stroke-width="1"><path d="M28 265 132 205 226 242 330 176 436 212 592 128"/><path d="M50 82 165 42 257 83 374 40 542 78"/><path d="M75 118v142M165 42v164M257 83v159M374 40v141M542 78v84"/></g>
      <g fill="#8DC63F" opacity=".32"><circle cx="50" cy="82" r="3"/><circle cx="165" cy="42" r="3"/><circle cx="257" cy="83" r="3"/><circle cx="374" cy="40" r="3"/><circle cx="542" cy="78" r="3"/><circle cx="592" cy="128" r="3"/></g>
      <circle cx="500" cy="68" r="33" fill="#8DC63F" opacity=".16" filter="url(#glowv2)"/><circle cx="500" cy="68" r="20" fill="#8DC63F"/><g stroke="#8DC63F" stroke-width="4" stroke-linecap="round"><path d="M500 32V20M500 116v-12M464 68h-12M548 68h-12M474 42l-9-9M535 103l-9-9M526 42l9-9"/></g>
      <path d="M96 260 261 166l188 87-163 52Z" fill="#D8EBC8"/>
      <path d="M187 174 310 110l109 55-126 71Z" fill="#fff" stroke="#C8DDBD" stroke-width="2"/>
      <path d="M293 236 419 165v79l-126 67Z" fill="#F0F6EA" stroke="#C8DDBD" stroke-width="2"/>
      <path d="m161 171 142-86 145 72-29 17-116-58-116 70Z" fill="url(#roofv2)"/>
      <g transform="translate(250 105) skewY(26)"><rect width="56" height="31" rx="2" fill="#15351A" stroke="#F5F9F0" stroke-width="2"/><rect x="59" width="56" height="31" rx="2" fill="#15351A" stroke="#F5F9F0" stroke-width="2"/><rect y="34" width="56" height="31" rx="2" fill="#15351A" stroke="#F5F9F0" stroke-width="2"/><rect x="59" y="34" width="56" height="31" rx="2" fill="#15351A" stroke="#F5F9F0" stroke-width="2"/><g stroke="#8DC63F" opacity=".45"><path d="M18 0v65M37 0v65M77 0v65M96 0v65M0 15h115M0 49h115"/></g></g>
      <rect x="331" y="224" width="29" height="57" rx="5" fill="#043D00"/><path d="m346 235-7 15h8l-5 16 13-19h-8l5-12Z" fill="#8DC63F"/>
      <g transform="translate(116 178)"><rect x="34" y="49" width="8" height="42" rx="3" fill="#4C6A37"/><path d="M38 2 4 60h68Z" fill="#6FAE2F"/><path d="M38 2 23 60h49Z" fill="#8DC63F"/><path d="M38 2 4 60h25Z" fill="#4F8D1D"/></g>
      <g transform="translate(441 178)"><rect width="135" height="105" rx="16" fill="#FFFFFF" fill-opacity=".88" stroke="#D7E5CF"/><text x="17" y="27" font-family="Arimo,Arial,sans-serif" font-size="13" font-weight="700" fill="#043D00">SISTEMA ENERGIA</text><path d="M17 40h42" stroke="#8DC63F" stroke-width="3"/><text x="17" y="60" font-family="Arimo,Arial,sans-serif" font-size="12" fill="#43543E">Produci.</text><text x="17" y="76" font-family="Arimo,Arial,sans-serif" font-size="12" fill="#43543E">Accumula.</text><text x="17" y="92" font-family="Arimo,Arial,sans-serif" font-size="12" fill="#43543E">Ricarica. Gestisci.</text><path d="M87 84 99 72l9 7 13-22" fill="none" stroke="#8DC63F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
    </svg>
  </figure>
  <div class="intro-benefits">
    <div class="intro-benefit"><div class="intro-benefit-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6V3Zm3 4h6M9 17l2-3 2 1 3-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><b>Risultato preliminare</b><span>Capisci quanto il tuo caso è già definito per una valutazione fotovoltaica.</span></div></div>
    <div class="intro-benefit"><div class="intro-benefit-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m14 10 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div><div><b>Punteggio FV /100</b><span>Scopri quali informazioni sono già solide e quali restano da verificare.</span></div></div>
    <div class="intro-benefit"><div class="intro-benefit-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v10H4V10Zm-1-4h18v4H3V6Zm9 0v14M12 6c-3 0-5-1-5-3 2.7-.5 4.3.6 5 3Zm0 0c3 0 5-1 5-3-2.7-.5-4.3.6-5 3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></div><div><b>Sorpresa ECON da sbloccare</b><span>Completa il test e scopri la sorpresa riservata al tuo percorso.</span></div></div>
  </div>
  <div class="intro-privacy"><div class="intro-privacy-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.5 8.2-8 10-4.5-1.8-8-5-8-10V6l8-3Zm-3 9 2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><b>La bolletta resta sul tuo dispositivo.</b><span>La lettura avviene nel browser · nessun servizio OCR esterno.</span></div></div>
  <div class="intro-actions"><button id="start" class="intro-cta"><span class="intro-cta-copy"><b>Verifica la tua energia</b><span>Inizia il test e scopri il tuo Punteggio FV</span></span><span class="intro-cta-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button></div>
  <p class="intro-foot">Test gratuito · risultato preliminare · nessun impegno</p>
</div>`;

const heroPattern = /if\(n===0\)h=`[\s\S]*?`;\nelse if\(single\[n\]\)h=singleScreen\(n\);/;
if (!heroPattern.test(html)) throw new Error('Could not locate current step-0 hero block');
html = html.replace(heroPattern, `if(n===0)h=\`${heroHtml}\`;\nelse if(single[n])h=singleScreen(n);`);

const heroStart = html.indexOf('<div class="intro-v2">');
const heroEnd = html.indexOf('else if(single[n])', heroStart);
if (heroStart < 0 || heroEnd < 0) throw new Error('Hero V2 output marker missing');
const heroOutput = html.slice(heroStart, heroEnd).toLowerCase();
if (heroOutput.includes('nessun preventivo') || heroOutput.includes('nessuna richiesta di preventivo')) {
  throw new Error('Removed preventivo copy unexpectedly present in Hero V2');
}
for (const marker of ['Risultato preliminare','Punteggio FV /100','Sorpresa ECON da sbloccare','La bolletta resta sul tuo dispositivo.','Verifica la tua energia']) {
  if (!html.includes(marker)) throw new Error(`Hero V2 missing marker: ${marker}`);
}

fs.writeFileSync(file, html);
console.log('Hero V2 mobile-first patch: PASS');
