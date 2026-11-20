/* ===== fold.js: one list on Next Steps. The mission board and the older "Ready to plan" card both listed steps from your path, so the same step could show twice. The card is gone. Its steps now live inside the mission board, folded shut under "More steps from your path", minus the one that is already the story mission. Each row keeps its two buttons: pick a day, or do it now. State: FDX.more (open or shut, for this visit only). ===== */
const FD_READY=plReady;
var FDX={hide:false,more:false};
plReady=function(c){return FDX.hide?[]:FD_READY(c)};
function fdRest(c,d){let S=null;try{S=msStory(c,d)}catch(e){}return FD_READY(c).filter(p=>!(S&&(p.t===S.t||(p.a===S.a&&String(p.v)===String(S.v)))))}
(()=>{const _pt=planTab;planTab=function(){const c=C();FDX.hide=!G.demo&&!!c.led&&typeof msBoard==="function";try{return _pt()}finally{FDX.hide=false}};
 const _mb=msBoard;msBoard=function(c,d){const h=_mb(c,d),rest=G.demo||!c.led?[]:fdRest(c,d);if(!rest.length)return h;const i=h.lastIndexOf("</div>");if(i<0)return h;
  return h.slice(0,i)+`<div class="tile stack fdmore" style="gap:6px"><button class="kwhead" data-a="fdmore" aria-expanded="${FDX.more}"><span style="flex:1;min-width:0;text-align:left"><b class="small">More steps from your path</b><span class="tiny muted" style="display:block">For when you want one. Pick a day, or do it now.</span></span><span class="caret">${FDX.more?"⌃":"›"}</span></button>${FDX.more?rest.slice(0,5).map(p=>plReadyRow(p,false)).join(""):""}</div>`+h.slice(i)}})();
Object.assign(ACT,{fdmore:()=>{FDX.more=!FDX.more;render()}});
if(typeof document!=="undefined"&&document.getElementById&&document.getElementById("app"))render();
