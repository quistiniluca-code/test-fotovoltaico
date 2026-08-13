import fs from 'node:fs';

const file = 'public/index.html';
let html = fs.readFileSync(file, 'utf8');
const marker = 'MOBILE VIEWPORT FIT V3 · typographic balance · v3';
const runtimeMarker = 'ECON_MOBILE_VIEWPORT_FIT_V3';

if (!html.includes('GLOBAL MOBILE FIT · full-funnel one-screen · v1')) {
  throw new Error('Mobile viewport fit V3 requires the global mobile fit V1 patch first');
}
if (!html.includes('HERO MOBILE FIT · one-screen · v1')) {
  throw new Error('Mobile viewport fit V3 requires the hero mobile fit patch first');
}
if (html.includes(marker) || html.includes(runtimeMarker)) {
  throw new Error('Mobile viewport fit V3 already applied');
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
    padding:14px 16px max(12px,env(safe-area-inset-bottom));
  }

  /* Editorial hierarchy first: larger type, disciplined rhythm, no artificial vertical spreading. */
  .view:not(:has(.intro-v2)) .kicker{margin-bottom:7px;font-size:11px;line-height:1.08;letter-spacing:.085em}
  .view:not(:has(.intro-v2)) h1,
  .view:not(:has(.intro-v2)) h2{font-size:clamp(31px,min(8.7vw,4.8dvh),38px);line-height:.95;letter-spacing:-.041em;text-wrap:balance}
  .view:not(:has(.intro-v2)) h3{font-size:19px;line-height:1.02}
  .view:not(:has(.intro-v2)) p{margin:8px 0;font-size:14px;line-height:1.28}
  .view:not(:has(.intro-v2)) .lead{font-size:14.8px;line-height:1.3}
  .view:not(:has(.intro-v2)) .small{font-size:11px;line-height:1.25}
  .view:not(:has(.intro-v2)) .micro{font-size:10px;line-height:1.2}

  /* Choice screens stay visually compact as one group. Space is used by typography and card scale, not space-between. */
  .view:not(:has(.intro-v2)):has(> .options){display:flex;flex-direction:column;justify-content:flex-start}
  .view:not(:has(.intro-v2)):has(> .options) > .options{
    flex:0 0 auto;
    min-height:0;
    display:grid;
    grid-template-columns:1fr;
    align-content:start;
    gap:clamp(8px,1.05dvh,11px);
    margin-top:clamp(12px,1.55dvh,16px);
    padding-bottom:0;
  }
  .view:not(:has(.intro-v2)):has(> .options) > .options > .option{
    min-height:clamp(55px,7.15dvh,68px);
    max-height:none;
    padding:10px 14px;
    border-radius:16px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    box-shadow:none;
  }
  .view:not(:has(.intro-v2)):has(> .options) > .options > .option b{font-size:16.5px;line-height:1.06;letter-spacing:-.014em;margin:0 0 2px}
  .view:not(:has(.intro-v2)):has(> .options) > .options > .option span{font-size:11.5px;line-height:1.16}
  .view:not(:has(.intro-v2)):has(> .options) > .options:has(.option:nth-child(5)) > .option{min-height:clamp(53px,6.85dvh,65px)}
  .view:not(:has(.intro-v2)):has(> .options) > .options:has(.option:nth-child(6)) > .option{min-height:clamp(47px,6.05dvh,57px);padding-top:8px;padding-bottom:8px}

  /* Forms, cards and results inherit the same stronger mobile reading scale. */
  .view:not(:has(.intro-v2)) .field{min-height:46px;padding:10px 12px;font-size:16px;line-height:1.12}
  .view:not(:has(.intro-v2)) .big-input{min-height:56px;font-size:29px}
  .view:not(:has(.intro-v2)) .btn,.view:not(:has(.intro-v2)) .continue-pill.show{min-height:48px;font-size:15px}
  .view:not(:has(.intro-v2)) .card{margin:7px 0;padding:11px;border-radius:15px}
  .view:not(:has(.intro-v2)) .row{padding:7px 0;gap:9px}
  .view:not(:has(.intro-v2)) .row span{font-size:10.8px;line-height:1.16}
  .view:not(:has(.intro-v2)) .row b{font-size:13px;line-height:1.16}
  .view:not(:has(.intro-v2)) .component{margin:6px 0;padding:10px;border-radius:14px}
  .view:not(:has(.intro-v2)) .component header{font-size:12.5px}
  .view:not(:has(.intro-v2)) .component p{font-size:11.5px;line-height:1.22}
  .view:not(:has(.intro-v2)) .notice{font-size:11.5px;line-height:1.23}
  .view:not(:has(.intro-v2)) .check{font-size:11.5px;line-height:1.24}
  .view:not(:has(.intro-v2)) .result-band{font-size:10px;line-height:1.16}
  .view:not(:has(.intro-v2)) .result-definition{font-size:10px;line-height:1.2}
  .view:not(:has(.intro-v2)) .result-diagnosis span{font-size:11.5px;line-height:1.24}
  .view:not(:has(.intro-v2)) .reward-v2 p{font-size:11px;line-height:1.22}
  .view:not(:has(.intro-v2)) > .actions{flex:0 0 auto}

  /* Roomy screens: spend the extra pixels on legibility and hierarchy. */
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)){padding-top:16px;padding-left:17px;padding-right:17px}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .kicker{font-size:11.5px;margin-bottom:8px}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) h1,
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) h2{font-size:clamp(35px,min(9.6vw,5.35dvh),43px);line-height:.94}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) p{margin:9px 0;font-size:15px;line-height:1.3}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .lead{font-size:15.8px;line-height:1.31}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)):has(> .options) > .options{gap:10px;margin-top:15px}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)):has(> .options) > .options > .option{min-height:62px;padding:11px 15px}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)):has(> .options) > .options > .option b{font-size:18px;line-height:1.05}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)):has(> .options) > .options > .option span{font-size:12px;line-height:1.16}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)):has(> .options) > .options:has(.option:nth-child(5)) > .option{min-height:59px}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)):has(> .options) > .options:has(.option:nth-child(6)) > .option{min-height:53px}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .field{font-size:16.5px;min-height:48px}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .btn,.view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .continue-pill.show{font-size:15.5px;min-height:50px}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .row span{font-size:11px}
  .view.mobile-fit-v3-roomy:not(:has(.intro-v2)) .row b{font-size:13.5px}

  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)){padding-top:18px;padding-left:18px;padding-right:18px}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .kicker{font-size:12px;margin-bottom:9px}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) h1,
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) h2{font-size:clamp(38px,min(10.35vw,5.7dvh),46px);line-height:.93}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) p{margin:10px 0;font-size:16px;line-height:1.31}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .lead{font-size:16.5px;line-height:1.32}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)):has(> .options) > .options{gap:11px;margin-top:17px}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)):has(> .options) > .options > .option{min-height:68px;padding:12px 16px;border-radius:17px}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)):has(> .options) > .options > .option b{font-size:19px;line-height:1.04}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)):has(> .options) > .options > .option span{font-size:12.5px;line-height:1.16}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)):has(> .options) > .options:has(.option:nth-child(5)) > .option{min-height:64px}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)):has(> .options) > .options:has(.option:nth-child(6)) > .option{min-height:57px}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .field{font-size:17px;min-height:50px}
  .view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .btn,.view.mobile-fit-v3-roomy-xl:not(:has(.intro-v2)) .continue-pill.show{font-size:16px;min-height:52px}

  /* Intro: same ECON hierarchy, with extra space assigned to title/copy before the image. */
  .view:has(.intro-v2){height:100%;min-height:0;overflow:hidden!important;padding-left:14px;padding-right:14px}
  .intro-v2{min-height:100%;display:flex;flex-direction:column}
  .intro-title{font-size:clamp(38px,10.3vw,44px)!important;line-height:.91!important;letter-spacing:-.049em!important}
  .intro-copy{font-size:13.5px!important;line-height:1.3!important;-webkit-line-clamp:3!important}
  .intro-challenge{font-size:12.5px!important}
  .intro-visual{flex:0 1 auto!important;min-height:0!important;max-height:none!important;margin-top:9px!important}
  .intro-visual-png{height:clamp(138px,19dvh,162px)!important;min-height:0!important}
  .intro-benefit b{font-size:11px!important;line-height:1.08!important}
  .intro-privacy b{font-size:11px!important}
  .intro-cta-copy b{font-size:17px!important}
  .intro-cta-copy span{font-size:10px!important}

  .view.mobile-fit-v3-roomy:has(.intro-v2) .intro-title{font-size:clamp(42px,11vw,48px)!important}
  .view.mobile-fit-v3-roomy:has(.intro-v2) .intro-copy{font-size:14.5px!important;line-height:1.31!important}
  .view.mobile-fit-v3-roomy:has(.intro-v2) .intro-challenge{font-size:13px!important}
  .view.mobile-fit-v3-roomy:has(.intro-v2) .intro-visual-png{height:clamp(148px,19.5dvh,174px)!important}
  .view.mobile-fit-v3-roomy:has(.intro-v2) .intro-benefit b{font-size:11.5px!important}
  .view.mobile-fit-v3-roomy:has(.intro-v2) .intro-cta-copy b{font-size:17.5px!important}

  .view.mobile-fit-v3-roomy-xl:has(.intro-v2) .intro-title{font-size:clamp(46px,11.8vw,52px)!important}
  .view.mobile-fit-v3-roomy-xl:has(.intro-v2) .intro-copy{font-size:15.2px!important;line-height:1.32!important}
  .view.mobile-fit-v3-roomy-xl:has(.intro-v2) .intro-challenge{font-size:13.5px!important}
  .view.mobile-fit-v3-roomy-xl:has(.intro-v2) .intro-visual-png{height:clamp(158px,20dvh,184px)!important}
  .view.mobile-fit-v3-roomy-xl:has(.intro-v2) .intro-benefit b{font-size:12px!important}
  .view.mobile-fit-v3-roomy-xl:has(.intro-v2) .intro-privacy b{font-size:11.5px!important}
  .view.mobile-fit-v3-roomy-xl:has(.intro-v2) .intro-cta-copy b{font-size:18px!important}

  /* Short-screen fallback: only compress after the stronger typography has been tested against the real viewport. */
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)){padding-top:6px;padding-left:10px;padding-right:10px;padding-bottom:7px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .kicker{font-size:8.5px;margin-bottom:3px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) h1,
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) h2{font-size:clamp(21px,min(6.8vw,3.55dvh),27px);line-height:.92}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) p:not(.micro):not(.small){margin:4px 0;font-size:10.5px;line-height:1.1;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .small{font-size:9px;line-height:1.1}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .micro{font-size:8.5px;line-height:1.08}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .options{gap:4px;margin-top:5px;padding-bottom:0}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .option,
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .options:has(.option:nth-child(5)) .option,
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .options:has(.option:nth-child(6)) .option{min-height:37px;max-height:43px;padding:4px 8px;border-radius:11px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .option b{font-size:12px;line-height:1;margin:0}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .option span{display:none}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .continue-pill.show,
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .btn{min-height:39px;padding:7px 10px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .field{min-height:38px;padding:7px 9px;font-size:15px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .big-input{min-height:44px;font-size:23px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .card{margin:3px 0;padding:7px;border-radius:11px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .row{padding:4px 0;gap:5px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .upload{padding:8px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .trust{gap:3px;margin-top:4px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .trust div{padding:4px 5px;font-size:8px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .check{margin:4px 0;font-size:9.5px;line-height:1.1}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .notice{margin:3px 0;padding:5px 7px;font-size:9.5px;line-height:1.1}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .component{margin:3px 0;padding:6px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .component p{display:none}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .reward-v2{margin-top:3px;padding:7px 8px}
  .view.mobile-fit-v3-nano:not(:has(.intro-v2)) .reward-v2 p{display:none}

  .view.mobile-fit-v3-cut:not(:has(.intro-v2)) .small,
  .view.mobile-fit-v3-cut:not(:has(.intro-v2)) .micro,
  .view.mobile-fit-v3-cut:not(:has(.intro-v2)) .result-definition{display:none}
  .view.mobile-fit-v3-cut:not(:has(.intro-v2)) .option{min-height:33px!important;max-height:37px!important}
  .view.mobile-fit-v3-cut:not(:has(.intro-v2)) .result-diagnosis span,
  .view.mobile-fit-v3-cut:not(:has(.intro-v2)) .component p,
  .view.mobile-fit-v3-cut:not(:has(.intro-v2)) .reward-v2 p{display:none}
}
`;

if (!html.includes('</style>')) throw new Error('Could not locate style closing tag for mobile viewport fit V3');
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
      return 0;
    }
    const h=visibleHeight();
    if(h>320)root.style.setProperty('--econ-mobile-vh',h+'px');
    return h;
  };
  const overflow=()=>view.scrollHeight>view.clientHeight+2;
  const fit=()=>{
    raf=0;
    const h=setViewportHeight();
    view.classList.remove('mobile-fit-v3-roomy','mobile-fit-v3-roomy-xl','mobile-fit-v3-nano','mobile-fit-v3-cut');
    if(!mobile())return;
    if(h>=690)view.classList.add('mobile-fit-v3-roomy');
    if(h>=790)view.classList.add('mobile-fit-v3-roomy-xl');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(overflow()&&view.classList.contains('mobile-fit-v3-roomy-xl'))view.classList.remove('mobile-fit-v3-roomy-xl');
      requestAnimationFrame(()=>{
        if(overflow()&&view.classList.contains('mobile-fit-v3-roomy'))view.classList.remove('mobile-fit-v3-roomy');
        requestAnimationFrame(()=>{
          if(overflow()&&!view.querySelector('.intro-v2'))view.classList.add('mobile-fit-v3-nano');
          requestAnimationFrame(()=>{
            if(overflow()&&!view.querySelector('.intro-v2'))view.classList.add('mobile-fit-v3-cut');
          });
        });
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

if (!html.includes('</body>')) throw new Error('Could not locate body closing tag for mobile viewport fit V3');
html = html.replace('</body>', `${runtime}\n</body>`);

fs.writeFileSync(file, html);
console.log('Mobile viewport fit V3: PASS · larger typography + compact editorial rhythm + first-fold safety');
