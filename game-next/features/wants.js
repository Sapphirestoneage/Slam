/* ============================================================================
   SLAM the Game: features/wants.js
   PURPOSE     What you want (run SLAM-ONBOARD-1, Nov 27 2026): the first screen of a new player, before
               the four questions of What it is / What it could be. One screen, chips to tap, any number
               of them, no ranking. "Something else" opens the field "Add my own" of the card draft
               (features/goalrank.js). The picks become goals of the profile, so the card draft and the
               ranking work on them later. The picks show as small tags at the top of the flow, and a
               later screen can say "because you picked ...".
   INPUT       The open sheet (W.kind cb, W.step wants): W.wp (the ids that are picked), W.own (the names
               from "Add my own"; ACT.grown of goalrank.js writes it), W.wnOwn (the field is open),
               W.o.wants (the picks, kept until the profile is made). The profile: c.goals.
   OUTPUT      Data: WN_LIST. Math: wnPicked, wnGoals, wnMatch, wnTagData. Views: wnView (a part of
               cbSheet in couldbe.js), wnTags (a part of cbTop in couldbe.js), wnBack (a part of
               cbEntryView in couldbe.js). Actions (ACT): wnpick, wnown, wnnext, wnskip, wnback.
   DEPENDS ON  core/report.js, core/engine.js (GOAL_ONE), features/goalrank.js (grNew, grOrder,
               grOwnField, ACT.grown), features/couldbe.js (cbFoot, cbSheet, CB), screens/ui.js (head,
               esc, sheet, drawSheet).
   RULES       No new data model. A pick is a goal in c.goals with the shape of goalrank.js (grNew): its
               name (g.n) is the words of the chip, its kind (g.k) is a kind of the game's goals, and it
               waits on Someday (era null) until the player ranks. The amount of such a goal is the
               game's typical amount for its kind, a Guess. A pick is found again by its name: wnMatch
               reads c.goals. Nothing is typed unless the player opens "Something else".
   COMPAT      No new key on a profile. An old saved game has no such goals, and no tag shows for it.
   STATE       None.
   ========================================================================= */
/* The chips, in the order of the screen. k: the kind of goal (GOAL_K in engine.js). tags: what the want is about:
   a lever of the Strategy Engine (housing, income, interest, taxes, spending), a round of setup (D, A, I, T, E), or
   "fi" (any move that brings the FI date closer). Buy a home has no lever: the housing moves are for a home the
   player already has. */
const WN_LIST = [
  { id: "early", l: "Retire early", k: "Something else", tags: ["fi", "A"] },
  { id: "ontime", l: "Retire on time", k: "Something else", tags: ["fi", "A"] },
  { id: "debt", l: "Get out of debt", k: "Something else", tags: ["interest", "D"] },
  { id: "cushion", l: "Build a cushion", k: "Something else", tags: ["spending", "A"] },
  { id: "home", l: "Buy a home", k: "Home", tags: ["A"] },
  { id: "travel", l: "Travel more", k: "Trip", tags: ["spending", "E"] },
  { id: "kids", l: "Have or raise kids", k: "Something else", tags: ["E"] },
  { id: "career", l: "Change careers or quit my job", k: "Quit my job", tags: ["income", "I"] },
  { id: "business", l: "Start a business", k: "Something else", tags: ["income", "I"] },
  { id: "give", l: "Give more", k: "Something else", tags: ["taxes", "T"] },
  { id: "calm", l: "Just feel calm about money", k: "Something else", tags: [] },
];
/* How many tags the top of the flow shows before "+2 more". */
const WN_TAGS = 4;

/* ---------- THE MATH ---------- */
/* The picks of the open screen as a list for the profile: [{ k (the kind of goal), n (the name) }]. */
function wnPicked(w) {
  return WN_LIST.filter(x => (w.wp || []).includes(x.id))
    .map(x => ({ k: x.k, n: x.l }))
    .concat((w.own || []).map(n => ({ k: "Something else", n })));
}
/* The picks as goals, in the shape of goalrank.js. c: the profile, for the typical amount of a kind. A name that is
   already a goal of the profile is not made twice. */
function wnGoals(c, picks) {
  const have = (c.goals || []).map(g => g.n);
  return (picks || []).filter(p => !have.includes(p.n)).map(p => grNew(c, p.k, p.n));
}
/* The first want of the player that is about one of the tags, in the order of the tags: { id, l }, or null. A want
   is a goal of the profile that is not done and has the name of a chip. tags: for example ["interest", "fi"], or
   ["D"] for a round of setup. */
function wnMatch(c, tags) {
  const names = ((c && c.goals) || []).filter(g => !g.done).map(g => g.n);
  for (const t of tags || []) {
    const hit = WN_LIST.find(x => x.tags.includes(t) && names.includes(x.l));
    if (hit) return { id: hit.id, l: hit.l };
  }
  return null;
}
/* What the tags at the top of the flow show: the goals that are not done, in rank order. { show (names), more }. */
function wnTagData(c) {
  const all = (c && c.goals ? grOrder(c) : []).map(g => g.n);
  return { show: all.slice(0, WN_TAGS), more: Math.max(0, all.length - WN_TAGS) };
}

/* ---------- THE VIEWS ---------- */
/* Part of cbSheet() in couldbe.js. THE SCREEN: the chips, "Something else", Next and Skip. */
function wnView() {
  const w = W,
    wp = w.wp || [],
    own = w.own || [],
    n = wp.length + own.length;
  return (
    head("First", "What do you want?") +
    `<div class="small muted">Tap each one you want. You can change them later.</div>` +
    `<div class="chips wnchips" data-fid="wn:chips">${WN_LIST.map(x => `<button class="chip ${wp.includes(x.id) ? "on" : ""}" data-a="wnpick" data-v="${x.id}" aria-pressed="${wp.includes(x.id) ? "true" : "false"}">${esc(x.l)}</button>`).join("")}${own.map(o => `<button class="chip on" data-a="wnpick" data-k="own" data-v="${esc(o)}" aria-pressed="true">${esc(o)}</button>`).join("")}<button class="chip ${w.wnOwn ? "on" : ""}" data-a="wnown" aria-expanded="${w.wnOwn ? "true" : "false"}">Something else</button>${cbI("wants")}</div>` +
    (w.wnOwn ? grOwnField() : "") +
    `<button class="primary wide go cbnext" data-a="wnnext">Next: four quick taps</button>` +
    `<button class="ghost wide" data-a="wnskip">${NOT_SURE}</button>` +
    `<div class="tiny muted" data-fid="wn:tapone">${TAP_ONE}</div>` +
    (typeof sitRow === "function" ? sitRow() : "") /* starter.js: the way to the ten starting points */ +
    cbNav({ back: null }) /* cbguide.js: Back and Forward. This is the first screen, so Back says why it is off */ +
    `<div class="tiny muted" data-fid="wn:count" role="status">${n ? (n === 1 ? "1 picked." : n + " picked.") + " They stay on your list of goals." : "Nothing picked yet. Not sure is fine: you can pick later."}</div>` +
    cbFoot()
  );
}
/* Part of cbTop() in couldbe.js. The wants of the player as small tags. They are labels, not buttons. */
function wnTags(c) {
  try {
    const T = wnTagData(c);
    if (!T.show.length) return "";
    return `<div class="wntags" data-fid="wn:tags"><span class="tiny muted">You want:</span>${T.show.map(n => `<span class="pill wntag">${esc(n)}</span>`).join("")}${T.more ? `<span class="tiny muted">+${T.more} more</span>` : ""}</div>`;
  } catch (e) {
    report(e, "wants.js: wnTags");
    return "";
  }
}
/* Part of cbEntryView() in couldbe.js. The way back from the first question, for a player who is not made yet: the
   attributes of the Back button of the row Back and Forward (cbNav in cbguide.js), or "" when there is none. */
function wnBack(w) {
  return w && w.o && w.o.wants !== undefined ? `data-a="wnback"` : "";
}
/* Leave the screen for the four questions. keep: false for "I'm not sure" (no pick is kept). */
function wnLeave(keep) {
  if (!W || W.kind !== "cb" || W.step !== "wants") return;
  W.o = W.o || {};
  W.o.wants = keep ? wnPicked(W) : [];
  W.step = "entry";
  W.q = 0;
  W.wnOwn = false;
  CB.taps++;
  cbFwdDrop(); /* cbguide.js: the player moved on, so Forward has nothing to return to */
  sheet(cbSheet);
  /* erain.js: a visitor who comes from the demo Find your era already answered the four questions there. With all
     four the player is made here, with the picks of this screen as goals, and the flow goes on at What it is. */
  if (typeof erIn === "function") erIn();
}
Object.assign(ACT, {
  /* a chip: on or off. An own name (k own) is taken off the list. */
  wnpick: t => {
    if (!W || W.kind !== "cb" || W.step !== "wants") return;
    const v = t.dataset.v;
    if (t.dataset.k === "own") W.own = (W.own || []).filter(x => x !== v);
    else {
      W.wp = W.wp || [];
      const i = W.wp.indexOf(v);
      if (i >= 0) W.wp.splice(i, 1);
      else if (WN_LIST.some(x => x.id === v)) W.wp.push(v);
    }
    drawSheet();
  },
  /* Something else: open or close the field "Add my own" */
  wnown: () => {
    if (!W || W.kind !== "cb" || W.step !== "wants") return;
    W.wnOwn = !W.wnOwn;
    drawSheet();
  },
  wnnext: () => wnLeave(true),
  wnskip: () => wnLeave(false),
  /* from the first question back to this screen, with the picks as they were */
  wnback: () => {
    if (!W || W.kind !== "cb" || W.step !== "entry") return;
    cbFwdKeep(); /* cbguide.js: Forward returns to the first question */
    W.step = "wants";
    sheet(cbSheet);
  },
});
