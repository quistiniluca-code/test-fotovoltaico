import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
const marker = 'MOBILE VIEWPORT FIT V2 · full-screen balance · v2';
const runtimeMarker = 'ECON_MOBILE_VIEWPORT_FIT_V2';

if (!html.includes('GLOBAL MOBILE FIT · full-funnel one-screen · v1')) {
  throw new Error('Mobile viewport fit V2 requires the global mobile fit V1 patch first');
}
if (!html.includes('HERO MOBILE FIT · one-screen · v1')) {
  throw new Error('Mobile viewport fit V2 requires the hero mobile fit patch first');
}
if (html.includes(marker) || html.includes(runtimeMarker)) {
  throw new Error('Mobile viewport fit V2 already applied');
}

const css = String.raw`
/* ${marker} */
@media(max-width:520px){
  :root{--econ-mobile-vh:100svh}
  html,body{height:var(--econ-mobile-vh);min-height:var(--econ-mobile-vh);max-height:var(--econ-mobile-vh);overflow:hidden}
  .app{height:var(--econ-mobile-vh)!important;min-height:var(--econ-mobile-vh)!important;max-height:var(--econ-mobile-vh)!important;overflow:hidden}
  .shell{height:var(--econ-mobile-vh)!important;min-height:0!important;max-height:var(--econ-mobile-vh)!important}

  .view:not(:has(.intro-v2)){
    height:100%;
    min-height:0;
    overflow:hidden!important;
    padding-bottom:max(12px,env(safe-area-inset-bottom));
  }

  /* Choice screens: use the complete visible height instead of leaving a large blank area. */
  .view:not(:has(.intro-v2)):has(> .options){display:flex;flex-direction:column}
  .view:not(:has(.intro-v2)):has(> .options) > .options{
    flex:1 1 0;
    min-height:0;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    gap:clamp(6px,1.05dvh,10px);
    margin-top:clamp(8px,1.25dvh,13px);
    padding-bottom:clamp(10px,2.1dvh,18px);
  }
  .view:not(:has(.intro-v2)):has(> .options) > .options > .option{
    flex:1 1 0;
    min-height:clamp(48px,6.4dvh,62px);
    max-height:min(78px,9.6dvh);
    display:flex;
    flex-direction:column;
    justify-content:center;
  }
  .view:not(:has(.intro-v2)):has(> .options) > .options:has(.option:nth-child(5)) > .option{
    min-height:clamp(46px,6.05dvh,59px);
    max-height:min(74px,9dvh);
  }
  .view:not(:has(.intro-v2)):has(> .options) > .options:has(.option:nth-child(6)) > .option{
    min-height:clamp(42px,5.55dvh,53px);
    max-height:min(66px,8.1dvh);
  }

  /* Keep forms/results anchored inside the first fold. Existing .actions already uses margin-top:auto. */
  .view:not(:has(.intro-v2)) > .actions{flex:0 0 auto}
  .view:not(:has(.intro-v2)) > .trust,
  .view:not(:has(.intro-v2)) > .metrics,
  .view:not(:has(.intro-v2)) > .locked,
  .view:not(:has(.intro-v2)) > .suggestions{flex:0 1 auto;min-height:0}

  /* Intro: consume extra room primarily with the visual, not oversized typography. */
  .view:has(.intro-v2){height:100%;min-height:0;overflow:hidden!important}
  .intro-v2{min-height:100%;display:flex;flex-direction:column}
  .intro-visual{flex:1 1 auto;min-height:120px;max-height:220px;display:flex}
  .intro-visual-png{flex:1 1 auto;height:100%!important;min-height:0!important}

  /* Safari / short viewport safety net, applied only if V1 tight+ultra still overflows. */
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)){padding-top:5px;padding-left:9px;padding-right:9px;padding-bottom:7px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .kicker{font-size:8px;margin-bottom:2px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) h1,
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) h2{font-size:clamp(20px,min(6.5vw,3.4dvh),25px);line-height:.91}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) p:not(.micro):not(.small){margin:3px 0;font-size:10px;line-height:1.08;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .small{font-size:8.5px;line-height:1.08}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .micro{font-size:8px;line-height:1.06}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .options{gap:3px;margin-top:4px;padding-bottom:4px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .option,
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .options:has(.option:nth-child(5)) .option,
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .options:has(.option:nth-child(6)) .option{min-height:35px;max-height:42px;padding:3px 7px;border-radius:11px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .option b{font-size:11.5px;line-height:1;margin:0}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .option span{display:none}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .continue-pill.show,
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .btn{min-height:37px;padding:6px 10px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .field{min-height:36px;padding:6px 8px;font-size:15px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .big-input{min-height:42px;font-size:22px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .card{margin:3px 0;padding:6px;border-radius:11px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .row{padding:3px 0;gap:5px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .upload{padding:7px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .trust{gap:3px;margin-top:3px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .trust div{padding:3px 4px;font-size:7.5px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .check{margin:3px 0;font-size:9px;line-height:1.08}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .notice{margin:3px 0;padding:5px 7px;font-size:9px;line-height:1.1}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .component{margin:3px 0;padding:6px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .component p{display:none}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .reward-v2{margin-top:3px;padding:7px 8px}
  .view.mobile-fit-v2-nano:not(:has(.intro-v2)) .reward-v2 p{display:none}

  .view.mobile-fit-v2-cut:not(:has(.intro-v2)) .small,
  .view.mobile-fit-v2-cut:not(:has(.intro-v2)) .micro,
  .view.mobile-fit-v2-cut:not(:has(.intro-v2)) .result-definition{display:none}
  .view.mobile-fit-v2-cut:not(:has(.intro-v2)) .option{min-height:32px!important;max-height:36px!important}
  .view.mobile-fit-v2-cut:not(:has(.intro-v2)) .result-diagnosis span,
  .view.mobile-fit-v2-cut:not(:has(.intro-v2)) .component p,
  .view.mobile-fit-v2-cut:not(:has(.intro-v2)) .reward-v2 p{display:none}
}

@media(max-width:520px) and (min-height:760px){
  .view:not(:has(.intro-v2)):has(> .options) > .options{gap:clamp(7px,1.15dvh,12px)}
  .view:not(:has(.intro-v2)):has(> .options) > .options > .option{padding-top:9px;padding-bottom:9px}
}
`;

if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for mobile viewport fit V2');
html = html.replace('</style>', `${css}\n</style>`);

const runtime = String.raw`
<script>
(()=>{
  const marker='${runtimeMarker}';
  window[marker]=true;
  const root=document.documentElement;
  const view=document.getElementById('view');
  if(!view)return;
  const mobile=()=>window.matchMedia('(max-width:520px)').matches;
  let raf=0;
  const visibleHeight=()=>{
    const vv=window.visualViewport;
    if(vv&&Math.abs((vv.scale||1)-1)<.02&&vv.height>320)return Math.round(vv.height);
    return Math.round(window.innerHeight||document.documentElement.clientHeight||0);
  };
  const setViewportHeight=()=>{
    if(!mobile()){
      root.style.removeProperty('--econ-mobile-vh');
      return;
    }
    const h=visibleHeight();
    if(h>320)root.style.setProperty('--econ-mobile-vh',h+'px');
  };
  const overflow=()=>view.scrollHeight>view.clientHeight+2;
  const fit=()=>{
    raf=0;
    setViewportHeight();
    view.classList.remove('mobile-fit-v2-nano','mobile-fit-v2-cut');
    if(!mobile()||view.querySelector('.intro-v2'))return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(overflow())view.classList.add('mobile-fit-v2-nano');
      requestAnimationFrame(()=>{
        if(overflow())view.classList.add('mobile-fit-v2-cut');
      });
    }));
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
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',schedule,{passive:true});
    window.visualViewport.addEventListener('scroll',schedule,{passive:true});
  }
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule).catch(()=>{});
  schedule();
})();
</script>`;

if (!html.includes('</body>')) throw new Error('Could not locate body closing tag for mobile viewport fit V2');
html = html.replace('</body>', `${runtime}\n</body>`);

fs.writeFileSync(file, html);
console.log('Mobile viewport fit V2: PASS · visual viewport height + balanced full-screen cards + no first-fold scroll');
