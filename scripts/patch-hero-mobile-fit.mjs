import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
const marker = 'HERO MOBILE FIT · one-screen · v1';

if (!html.includes('HERO PNG · supplied asset · v1')) {
  throw new Error('Mobile hero fit requires the supplied hero integration first');
}
if (!html.includes('class="intro-v2"')) {
  throw new Error('Mobile hero fit could not locate Hero V2');
}
if (html.includes(marker)) {
  throw new Error('Mobile hero fit already applied');
}

const css = String.raw`
/* ${marker} */
@media(max-width:520px){
  .shell:has(.intro-v2){min-height:100svh;min-height:100dvh}
  .shell:has(.intro-v2) .top{grid-template-columns:1fr;padding:7px 14px 5px;min-height:28px}
  .shell:has(.intro-v2) .top .back,.shell:has(.intro-v2) .top .phase{display:none}
  .shell:has(.intro-v2) .brand{font-size:10px;line-height:1.15;letter-spacing:.095em;white-space:nowrap}
  .shell:has(.intro-v2) .progress{display:none}
  .view:has(.intro-v2){padding:8px 14px max(8px,env(safe-area-inset-bottom));overflow:visible}

  .intro-v2{width:100%;gap:0}
  .intro-v2:before{inset:-10px -14px auto;height:220px;opacity:.72}
  .intro-v2:after{display:none}
  .intro-meta{margin-bottom:6px;gap:6px;flex-wrap:nowrap}
  .intro-kicker,.intro-free{min-height:25px;padding:5px 8px;font-size:9px;line-height:1;letter-spacing:.055em;white-space:nowrap}
  .intro-kicker svg,.intro-free svg{width:13px;height:13px}
  .intro-title{max-width:none;font-size:clamp(34px,9.6vw,40px);line-height:.92;letter-spacing:-.047em;text-wrap:balance}
  .intro-challenge{gap:4px 6px;margin-top:7px;font-size:12px;line-height:1.1;justify-content:flex-start}
  .intro-challenge .challenge-item{gap:3px}
  .intro-challenge svg{width:14px;height:14px}
  .intro-copy{max-width:none;margin:7px 0 0;font-size:12.5px;line-height:1.28;color:#40523b;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}

  .intro-visual{margin-top:8px;border-radius:20px;box-shadow:0 10px 28px rgba(4,61,0,.065)}
  .intro-visual-png{height:clamp(122px,20.5svh,156px);min-height:122px;background:#fff;overflow:hidden}
  .intro-visual-png img{width:100%;height:100%;object-fit:contain;object-position:center;background:#fff}

  .intro-benefits{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:7px}
  .intro-benefit{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;min-height:52px;padding:6px 4px;border-radius:13px;text-align:center;box-shadow:none;background:#fff}
  .intro-benefit-icon{width:24px;height:24px;min-width:24px;margin:0;border-radius:8px}
  .intro-benefit-icon svg{width:15px;height:15px}
  .intro-benefit b{margin:0;font-size:10.5px;line-height:1.05}
  .intro-benefit span{display:none}

  .intro-privacy{grid-template-columns:24px 1fr;gap:7px;margin-top:7px;padding:5px 9px;border-radius:12px;min-height:32px}
  .intro-privacy-icon{width:22px;height:22px;border-radius:7px}
  .intro-privacy-icon svg{width:14px;height:14px}
  .intro-privacy b{margin:0;font-size:10.5px;line-height:1.12}
  .intro-privacy span{display:none}

  .intro-actions{margin-top:8px}
  .intro-cta{min-height:52px;padding:6px 7px 6px 17px;grid-template-columns:1fr 38px;gap:8px;box-shadow:0 10px 24px rgba(4,61,0,.18)}
  .intro-cta-copy b{font-size:16px;line-height:1.05}
  .intro-cta-copy span{margin-top:2px;font-size:9.5px;line-height:1.1}
  .intro-cta-arrow{width:36px;height:36px}
  .intro-cta-arrow svg{width:18px;height:18px}
  .intro-foot{display:none}
}

@media(max-width:520px) and (max-height:700px){
  .shell:has(.intro-v2) .top{padding-top:5px;padding-bottom:3px;min-height:23px}
  .view:has(.intro-v2){padding-top:5px;padding-left:12px;padding-right:12px}
  .intro-meta{margin-bottom:4px}
  .intro-kicker,.intro-free{min-height:22px;padding:4px 7px;font-size:8.5px}
  .intro-title{font-size:clamp(32px,9.1vw,36px);line-height:.91}
  .intro-challenge{margin-top:5px;font-size:11px}
  .intro-copy{margin-top:5px;font-size:11.5px;line-height:1.2}
  .intro-visual{margin-top:6px}
  .intro-visual-png{height:clamp(108px,18.5svh,132px);min-height:108px}
  .intro-benefits{margin-top:6px;gap:5px}
  .intro-benefit{min-height:46px;padding:4px 3px}
  .intro-benefit-icon{width:21px;height:21px;min-width:21px}
  .intro-benefit-icon svg{width:13px;height:13px}
  .intro-benefit b{font-size:9.5px}
  .intro-privacy{margin-top:6px;min-height:29px;padding:4px 8px}
  .intro-actions{margin-top:6px}
  .intro-cta{min-height:48px;padding-top:5px;padding-bottom:5px}
  .intro-cta-copy b{font-size:15px}
  .intro-cta-arrow{width:34px;height:34px}
}

@media(max-width:360px){
  .intro-meta{gap:4px}
  .intro-kicker,.intro-free{padding-left:6px;padding-right:6px;font-size:8px}
  .intro-title{font-size:32px}
  .intro-challenge{font-size:10.5px;gap:3px 5px}
  .intro-visual-png{height:116px}
  .intro-benefit b{font-size:9px}
}
`;

if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for mobile hero fit');
html = html.replace('</style>', `${css}\n</style>`);
fs.writeFileSync(file, html);
console.log('Hero mobile one-screen fit: PASS');
