import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
const marker = 'GLOBAL MOBILE FIT · full-funnel one-screen · v1';
const runtimeMarker = 'ECON_MOBILE_VIEWPORT_FIT_V1';

if (!html.includes('HERO MOBILE FIT · one-screen · v1')) {
  throw new Error('Global mobile fit requires the hero mobile fit patch first');
}
if (!html.includes('RESULT FLOW V2 · profile')) {
  throw new Error('Global mobile fit requires Result Flow V2 first');
}
if (html.includes(marker) || html.includes(runtimeMarker)) {
  throw new Error('Global mobile fit already applied');
}

const css = String.raw`
/* ${marker} */
@media(max-width:520px){
  html,body{overscroll-behavior:none}
  body{min-height:100vh;min-height:100svh}
  .app{min-height:0;height:100vh;height:100svh;padding:0;overflow:hidden}
  .shell:not(:has(.intro-v2)){width:100%;height:100vh;height:100svh;min-height:0;max-height:100svh;border-radius:0;overflow:hidden;box-shadow:none}

  .shell:not(:has(.intro-v2)) .top{grid-template-columns:38px minmax(0,1fr) 54px;align-items:center;gap:6px;min-height:49px;padding:7px 12px 5px;flex:0 0 auto}
  .shell:not(:has(.intro-v2)) .back{width:36px;height:36px;font-size:20px}
  .shell:not(:has(.intro-v2)) .brand{font-size:clamp(9px,2.55vw,10.5px);line-height:1.12;letter-spacing:.095em;text-wrap:balance}
  .shell:not(:has(.intro-v2)) .phase{font-size:9.5px;line-height:1.15}
  .shell:not(:has(.intro-v2)) .progress{height:3px;margin:0 12px;flex:0 0 auto}

  .view:not(:has(.intro-v2)){position:relative;min-height:0;padding:12px 14px max(9px,env(safe-area-inset-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior:contain}
  .view:not(:has(.intro-v2))::-webkit-scrollbar{display:none}
  .view:not(:has(.intro-v2)) .kicker{margin-bottom:6px;font-size:10.5px;line-height:1.1;letter-spacing:.08em}
  .view:not(:has(.intro-v2)) h1,.view:not(:has(.intro-v2)) h2{font-size:clamp(26px,min(8.25vw,4.45dvh),35px);line-height:.96;letter-spacing:-.038em;text-wrap:balance}
  .view:not(:has(.intro-v2)) h3{font-size:18px;line-height:1}
  .view:not(:has(.intro-v2)) p{margin:7px 0;font-size:13px;line-height:1.3}
  .view:not(:has(.intro-v2)) .lead{font-size:14px;line-height:1.32}
  .view:not(:has(.intro-v2)) .small{font-size:10.5px;line-height:1.25}
  .view:not(:has(.intro-v2)) .micro{font-size:9.5px;line-height:1.22}

  .view:not(:has(.intro-v2)) .options{gap:6px;margin-top:9px}
  .view:not(:has(.intro-v2)) .option{display:flex;flex-direction:column;justify-content:center;min-height:clamp(48px,6.8dvh,59px);padding:8px 11px;border-radius:14px;line-height:1.08;overflow:hidden;box-shadow:none}
  .view:not(:has(.intro-v2)) .option b{margin-bottom:2px;font-size:15.5px;line-height:1.06;letter-spacing:-.012em}
  .view:not(:has(.intro-v2)) .option span{font-size:11px;line-height:1.14;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
  .view:not(:has(.intro-v2)) .options:has(.option:nth-child(5)) .option{min-height:clamp(45px,6.25dvh,54px);padding-top:7px;padding-bottom:7px}
  .view:not(:has(.intro-v2)) .options:has(.option:nth-child(6)) .option{min-height:clamp(42px,5.8dvh,50px);padding-top:6px;padding-bottom:6px}
  .view:not(:has(.intro-v2)) .option.selected{box-shadow:inset 4px 0 var(--l);border-color:var(--d)}

  .view:not(:has(.intro-v2)) .continue-pill.show{display:flex!important;align-items:center;justify-content:center;flex:0 0 auto;position:sticky;z-index:12;bottom:max(1px,env(safe-area-inset-bottom));width:100%;min-height:46px;margin-top:auto;padding:9px 14px;border-radius:999px;font-size:0;text-align:center;box-shadow:0 9px 24px rgba(4,61,0,.17)}
  .view:not(:has(.intro-v2)) .continue-pill.show::after{content:'Continua  →';font:700 15px/1 Arimo,Arial,sans-serif;letter-spacing:.005em;color:#fff}
  .view:not(:has(.intro-v2)) .actions{position:sticky;z-index:10;bottom:0;flex:0 0 auto;margin-top:auto;padding-top:7px;padding-bottom:1px;background:linear-gradient(180deg,rgba(255,255,255,0),#fff 28%)}
  .view:not(:has(.intro-v2)) .btn{min-height:46px;padding:9px 14px;font-size:14.5px;line-height:1.05;box-shadow:none}
  .view:not(:has(.intro-v2)) .btn.secondary{margin-top:5px}

  .view:not(:has(.intro-v2)) .field{min-height:44px;margin:3px 0;padding:10px 12px;border-radius:13px;font-size:16px;line-height:1.1}
  .view:not(:has(.intro-v2)) .big-input{min-height:54px;padding:12px;font-size:27px}
  .view:not(:has(.intro-v2)) .two,.view:not(:has(.intro-v2)) .metrics,.view:not(:has(.intro-v2)) .locked{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}

  .view:not(:has(.intro-v2)) .card{margin:6px 0;padding:10px;border-radius:14px}
  .view:not(:has(.intro-v2)) .row{gap:8px;padding:6px 0}
  .view:not(:has(.intro-v2)) .row span{font-size:10px;line-height:1.15}
  .view:not(:has(.intro-v2)) .row b{font-size:12.5px;line-height:1.15}
  .view:not(:has(.intro-v2)) .metric-mini{padding:9px;border-radius:14px}
  .view:not(:has(.intro-v2)) .metric-mini b{font-size:22px}
  .view:not(:has(.intro-v2)) .score{font-size:clamp(54px,15vw,72px)}
  .view:not(:has(.intro-v2)) .score small{font-size:16px}
  .view:not(:has(.intro-v2)) .confidence{font-size:52px}
  .view:not(:has(.intro-v2)) .delta{font-size:24px}

  .view:not(:has(.intro-v2)) .upload{padding:14px 12px;border-radius:16px}
  .view:not(:has(.intro-v2)) .status{margin-top:6px;font-size:10.5px;line-height:1.2}
  .view:not(:has(.intro-v2)) .trust{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}
  .view:not(:has(.intro-v2)) .trust div{padding:6px 7px;border-radius:11px;font-size:9.5px;line-height:1.16}
  .view:not(:has(.intro-v2)) .lock-card{padding:9px;border-radius:13px}
  .view:not(:has(.intro-v2)) .component{margin:5px 0;padding:9px;border-radius:13px}
  .view:not(:has(.intro-v2)) .component header{gap:7px;font-size:12px}
  .view:not(:has(.intro-v2)) .component p{margin-top:5px;font-size:11px;line-height:1.2;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  .view:not(:has(.intro-v2)) .tag{padding:4px 7px;font-size:9px}
  .view:not(:has(.intro-v2)) .suggestions{gap:5px;margin-top:5px}
  .view:not(:has(.intro-v2)) .suggestion{padding:8px;border-radius:12px}
  .view:not(:has(.intro-v2)) .suggestion span{font-size:10px;margin-top:2px}
  .view:not(:has(.intro-v2)) .notice{margin:6px 0;padding:8px 10px;border-radius:0 12px 12px 0;font-size:11px;line-height:1.22}
  .view:not(:has(.intro-v2)) .divider{margin:7px 0}
  .view:not(:has(.intro-v2)) .check{gap:7px;margin:7px 0;font-size:11px;line-height:1.24}
  .view:not(:has(.intro-v2)) .check input{margin-top:1px}

  .view:not(:has(.intro-v2)) .result-score-wrap{gap:10px;margin:3px 0 7px}
  .view:not(:has(.intro-v2)) .result-score{font-size:clamp(58px,17vw,78px)}
  .view:not(:has(.intro-v2)) .result-score small{font-size:16px}
  .view:not(:has(.intro-v2)) .result-band{max-width:155px;font-size:9.5px;line-height:1.15}
  .view:not(:has(.intro-v2)) .profile-compact{margin:6px 0;border-radius:15px}
  .view:not(:has(.intro-v2)) .profile-compact .row{padding:7px 10px}
  .view:not(:has(.intro-v2)) .profile-compact .row b{font-size:11.5px}
  .view:not(:has(.intro-v2)) .result-definition{margin-top:5px;font-size:9.5px;line-height:1.2}
  .view:not(:has(.intro-v2)) .unlock-card{margin-top:6px;padding:10px;border-radius:15px}
  .view:not(:has(.intro-v2)) .unlock-label{margin-bottom:4px;font-size:9.5px}
  .view:not(:has(.intro-v2)) .result-mobile{min-height:48px;font-size:18px}
  .view:not(:has(.intro-v2)) .result-secondary{margin-top:4px}
  .view:not(:has(.intro-v2)) .result-secondary .field{padding:9px 10px;font-size:16px}
  .view:not(:has(.intro-v2)) .result-cta{min-height:48px;font-size:14.5px;box-shadow:0 8px 20px rgba(4,61,0,.13)}
  .view:not(:has(.intro-v2)) .sim-signal{gap:5px;margin:2px 0 6px;padding:5px 8px;font-size:9px}
  .view:not(:has(.intro-v2)) .result-metrics{gap:5px;margin:5px 0 6px}
  .view:not(:has(.intro-v2)) .result-metric{padding:8px 5px;border-radius:13px}
  .view:not(:has(.intro-v2)) .result-metric b{font-size:clamp(17px,5vw,22px)}
  .view:not(:has(.intro-v2)) .result-metric span{margin-top:4px;font-size:8.5px;line-height:1.12}
  .view:not(:has(.intro-v2)) .result-diagnosis{margin:6px 0;padding:8px 10px;border-radius:0 12px 12px 0}
  .view:not(:has(.intro-v2)) .result-diagnosis b{margin-bottom:2px;font-size:9.5px}
  .view:not(:has(.intro-v2)) .result-diagnosis span{font-size:11px;line-height:1.24;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
  .view:not(:has(.intro-v2)) .reward-v2{margin-top:7px;padding:12px 13px;border-radius:16px;box-shadow:0 9px 24px rgba(4,61,0,.13)}
  .view:not(:has(.intro-v2)) .reward-v2:after{width:88px;height:88px;right:-18px;top:-28px}
  .view:not(:has(.intro-v2)) .reward-v2 small{font-size:8.5px}
  .view:not(:has(.intro-v2)) .reward-v2 h3{margin:4px 0 5px;font-size:clamp(22px,6.7vw,28px)}
  .view:not(:has(.intro-v2)) .reward-v2 p{font-size:10.5px;line-height:1.2;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
}

@media(max-width:520px) and (max-height:760px){
  .shell:not(:has(.intro-v2)) .top{min-height:45px;padding-top:5px;padding-bottom:4px}
  .shell:not(:has(.intro-v2)) .back{width:33px;height:33px;font-size:18px}
  .view:not(:has(.intro-v2)){padding-top:9px;padding-left:12px;padding-right:12px}
  .view:not(:has(.intro-v2)) .kicker{margin-bottom:4px;font-size:9.5px}
  .view:not(:has(.intro-v2)) h1,.view:not(:has(.intro-v2)) h2{font-size:clamp(24px,min(7.7vw,4.1dvh),31px);line-height:.94}
  .view:not(:has(.intro-v2)) p{margin:5px 0;font-size:12px;line-height:1.22}
  .view:not(:has(.intro-v2)) .lead{font-size:12.5px;line-height:1.24}
  .view:not(:has(.intro-v2)) .options{gap:5px;margin-top:7px}
  .view:not(:has(.intro-v2)) .option{min-height:45px;padding:6px 9px}
  .view:not(:has(.intro-v2)) .option b{font-size:14px}
  .view:not(:has(.intro-v2)) .option span{font-size:10px}
  .view:not(:has(.intro-v2)) .options:has(.option:nth-child(6)) .option{min-height:42px}
  .view:not(:has(.intro-v2)) .continue-pill.show,.view:not(:has(.intro-v2)) .btn{min-height:44px}
  .view:not(:has(.intro-v2)) .field{min-height:42px;padding-top:8px;padding-bottom:8px}
  .view:not(:has(.intro-v2)) .card{padding:8px;margin:5px 0}
  .view:not(:has(.intro-v2)) .row{padding:5px 0}
  .view:not(:has(.intro-v2)) .upload{padding:11px}
  .view:not(:has(.intro-v2)) .check{margin:5px 0;font-size:10.5px}
  .view:not(:has(.intro-v2)) .reward-v2{padding:10px 12px}
}

@media(max-width:520px) and (max-height:700px){
  .shell:not(:has(.intro-v2)) .top{min-height:41px;padding:4px 10px 3px;grid-template-columns:34px minmax(0,1fr) 48px}
  .shell:not(:has(.intro-v2)) .back{width:31px;height:31px}
  .shell:not(:has(.intro-v2)) .brand{font-size:8.7px}
  .shell:not(:has(.intro-v2)) .phase{font-size:8.5px}
  .shell:not(:has(.intro-v2)) .progress{height:2px;margin:0 10px}
  .view:not(:has(.intro-v2)){padding:7px 10px max(7px,env(safe-area-inset-bottom))}
  .view:not(:has(.intro-v2)) .kicker{font-size:9px}
  .view:not(:has(.intro-v2)) h1,.view:not(:has(.intro-v2)) h2{font-size:clamp(22px,min(7.2vw,3.9dvh),28px)}
  .view:not(:has(.intro-v2)) p:not(.micro):not(.small){font-size:11.5px;line-height:1.18;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  .view:not(:has(.intro-v2)) .options{gap:4px;margin-top:6px}
  .view:not(:has(.intro-v2)) .option,.view:not(:has(.intro-v2)) .options:has(.option:nth-child(5)) .option,.view:not(:has(.intro-v2)) .options:has(.option:nth-child(6)) .option{min-height:41px;padding:5px 8px}
  .view:not(:has(.intro-v2)) .option b{font-size:13.2px;line-height:1.03;margin:0}
  .view:not(:has(.intro-v2)) .option span{display:none}
  .view:not(:has(.intro-v2)) .continue-pill.show{min-height:42px}
  .view:not(:has(.intro-v2)) .actions{padding-top:5px}
  .view:not(:has(.intro-v2)) .btn{min-height:42px;font-size:13.5px}
  .view:not(:has(.intro-v2)) .trust{margin-top:5px}
  .view:not(:has(.intro-v2)) .trust div{padding:5px;font-size:8.8px}
  .view:not(:has(.intro-v2)) .result-definition{display:none}
  .view:not(:has(.intro-v2)) .result-diagnosis span{-webkit-line-clamp:2}
}

@media(max-width:520px){
  .view.mobile-fit-tight:not(:has(.intro-v2)){padding-top:8px;padding-bottom:max(7px,env(safe-area-inset-bottom))}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .kicker{margin-bottom:4px;font-size:9px}
  .view.mobile-fit-tight:not(:has(.intro-v2)) h1,.view.mobile-fit-tight:not(:has(.intro-v2)) h2{font-size:clamp(23px,min(7.4vw,4dvh),30px);line-height:.94}
  .view.mobile-fit-tight:not(:has(.intro-v2)) p:not(.micro):not(.small){margin:5px 0;font-size:11.5px;line-height:1.18;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .options{gap:4px;margin-top:6px}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .option{min-height:42px;padding:5px 8px}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .option b{font-size:13.5px;line-height:1.03}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .option span{font-size:9.5px;line-height:1.05}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .actions{padding-top:5px}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .card,.view.mobile-fit-tight:not(:has(.intro-v2)) .component{margin:4px 0;padding:7px}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .row{padding:4px 0}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .notice{margin:4px 0;padding:6px 8px}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .unlock-card{margin-top:4px;padding:8px}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .result-diagnosis{margin:4px 0;padding:7px 9px}
  .view.mobile-fit-tight:not(:has(.intro-v2)) .reward-v2{margin-top:5px;padding:10px 11px}

  .view.mobile-fit-ultra:not(:has(.intro-v2)){padding-top:6px;padding-left:9px;padding-right:9px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .kicker{font-size:8.5px;margin-bottom:3px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) h1,.view.mobile-fit-ultra:not(:has(.intro-v2)) h2{font-size:clamp(21px,min(6.9vw,3.65dvh),27px);line-height:.92}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) p:not(.micro):not(.small){margin:4px 0;font-size:10.5px;line-height:1.12;-webkit-line-clamp:1}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .small{font-size:9px;line-height:1.1;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .options{gap:3px;margin-top:5px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .option,.view.mobile-fit-ultra:not(:has(.intro-v2)) .options:has(.option:nth-child(5)) .option,.view.mobile-fit-ultra:not(:has(.intro-v2)) .options:has(.option:nth-child(6)) .option{min-height:39px;padding:4px 7px;border-radius:12px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .option b{font-size:12.5px;margin:0}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .option span{display:none}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .continue-pill.show,.view.mobile-fit-ultra:not(:has(.intro-v2)) .btn{min-height:40px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .field{min-height:39px;padding:7px 9px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .check{margin:4px 0;font-size:9.5px;line-height:1.15}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .check small{display:none}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .trust div{font-size:8px;padding:4px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .result-score{font-size:54px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .result-score-wrap{margin:1px 0 4px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .profile-compact .row{padding:5px 8px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .result-definition{display:none}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .result-metric{padding:6px 4px}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .result-metric span{display:none}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .result-diagnosis span{-webkit-line-clamp:1}
  .view.mobile-fit-ultra:not(:has(.intro-v2)) .reward-v2 p{-webkit-line-clamp:1}
}
`;

if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for global mobile fit');
html = html.replace('</style>', `${css}\n</style>`);

const runtime = String.raw`
<script>
(()=>{
  const marker='${runtimeMarker}';
  window[marker]=true;
  const view=document.getElementById('view');
  if(!view)return;
  const mobile=()=>window.matchMedia('(max-width:520px)').matches;
  let raf=0;
  const overflow=()=>view.scrollHeight>view.clientHeight+2;
  const fit=()=>{
    raf=0;
    view.classList.remove('mobile-fit-tight','mobile-fit-ultra');
    if(!mobile()||view.querySelector('.intro-v2'))return;
    if(overflow())view.classList.add('mobile-fit-tight');
    requestAnimationFrame(()=>{
      if(overflow())view.classList.add('mobile-fit-ultra');
    });
  };
  const schedule=()=>{
    if(raf)cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>requestAnimationFrame(fit));
  };
  new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
  view.addEventListener('click',schedule,true);
  view.addEventListener('change',schedule,true);
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',schedule,{passive:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule).catch(()=>{});
  schedule();
})();
</script>`;

if (!html.includes('</body>')) throw new Error('Could not locate body closing tag for mobile fit runtime');
html = html.replace('</body>', `${runtime}\n</body>`);

fs.writeFileSync(file, html);
console.log('Global mobile full-funnel one-screen fit: PASS');
