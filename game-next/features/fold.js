/* ============================================================================
   SLAM the Game: features/fold.js
   PURPOSE     One list on Next Steps. The mission board and the older card "Ready to plan" showed the
               same steps. Now those steps are in the mission board, folded below "More steps from your
               path", without the step that is the story mission. Each row keeps its two buttons: pick a
               day, or do it now.
   INPUT       The game: G.demo. The taps of the player (the actions in OUTPUT).
   OUTPUT      4 functions. Parts of functions in other files: plReadyHidden, msBoardMore, planTabFold.
               Actions (ACT): fdmore.
   DEPENDS ON  core/report.js, screens/ui.js, screens/planner.js, features/missions.js.
   STATE       FDX.more (open or shut, for this visit only). FDX.hide (true while the plan is made).
   ========================================================================= */
var FDX = { hide: false, more: false };
/* Part of plReady() in planner.js. True while planTabFold() makes the plan with the mission board in it. */
function plReadyHidden() {
  return FDX.hide;
}
function fdRest(c, d) {
  let S = null;
  try {
    S = msStory(c, d);
  } catch (e) {
    report(e, "fold.js: fdRest");
  }
  return plReadyBase(c).filter(p => !(S && (p.t === S.t || (p.a === S.a && String(p.v) === String(S.v)))));
}
/* Part of msBoard() in missions.js. Adds the folded list "More steps from your path" at the bottom of the board. These are the steps that the card "Ready to plan" showed before. */
function msBoardMore(h, c, d) {
  const rest = G.demo || !c.led ? [] : fdRest(c, d);
  if (!rest.length) return h;
  const i = h.lastIndexOf("</div>");
  if (i < 0) return h;
  return (
    h.slice(0, i) +
    `<div class="tile stack fdmore" style="gap:6px"><button class="kwhead" data-a="fdmore" aria-expanded="${FDX.more}"><span style="flex:1;min-width:0;text-align:left"><b class="small">More steps from your path</b><span class="tiny muted" style="display:block">For when you want one. Pick a day, or do it now.</span></span><span class="caret">${FDX.more ? "⌃" : "<i class=chev aria-hidden=true></i>"}</span></button>${
      FDX.more
        ? rest
            .slice(0, 5)
            .map(p => plReadyRow(p, false))
            .join("")
        : ""
    }</div>` +
    h.slice(i)
  );
}

/* Part of planTab() in planner.js. Runs make() with the list "ready to plan" hidden, when the mission board shows the same steps. */
function planTabFold(make) {
  const c = C();
  FDX.hide = !G.demo && !!c.led && typeof msBoard === "function";
  try {
    return make();
  } finally {
    FDX.hide = false;
  }
}

Object.assign(ACT, {
  fdmore: () => {
    FDX.more = !FDX.more;
    render();
  },
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
