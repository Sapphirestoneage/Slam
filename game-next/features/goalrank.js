/* ============================================================================
   SLAM the Game: features/goalrank.js
   PURPOSE     Goals you keep, then rank (UX pass, item 29). The card draft keeps any number of goals, a
               Keep button flips to "✓ Kept", and "Add my own" names one. Then the player ranks the goals.
               The top 3 are "Working on now": the money and the dates go to them. The rest wait on the
               Someday list, dimmed below, and the next one moves up when a top goal is done.
   INPUT       The profile: c.goals (g.rank, g.era, g.eraWas), c.x.grank, c.x.noGoals. The open sheet
               (W.kind): draft. The taps of the player (the actions in OUTPUT).
   OUTPUT      Math: grOrder, grApply, grMove, grPromote, grNew. Views: draftSheet (the card draft and its
               ranking), grOwnField (the field "Add my own"; features/wants.js shows it too), grRows (part
               of goalsCard in ui.js). Actions (ACT): grkeep, grown, grnext, grup, grdown,
               grdone, grnone. Also rkMove and the drag listener used by the ranking of values.js.
   DEPENDS ON  core/engine.js (GOAL_K, GOAL_ONE, goalTypical, derive), screens/ui.js (gid, goalsCard),
               features/games2.js (draftDeal, G2B, g2done, GX).
   RULES       A goal is never deleted by ranking. "Someday" is era null, as everywhere in the game; a goal
               that moves down keeps the era it had (g.eraWas) and gets it back when it moves up.
   ========================================================================= */
const GR_NOW = 3;
/* The goals not done, in rank order. A goal with no rank keeps its place in the list, after the ranked ones. */
function grOrder(c) {
  return (c.goals || [])
    .map((g, i) => ({ g, i }))
    .filter(o => !o.g.done)
    .sort((a, b) => (a.g.rank == null ? 1e6 + a.i : a.g.rank) - (b.g.rank == null ? 1e6 + b.i : b.g.rank))
    .map(o => o.g);
}
/* Write the ranks 1, 2, 3... The top 3 get an era (the one they had, or now); the rest go to Someday. */
function grApply(c, d) {
  d = d || derive(c);
  c.x = c.x || {};
  c.x.grank = true;
  grOrder(c).forEach((g, i) => {
    g.rank = i + 1;
    if (i < GR_NOW) {
      if (g.era == null) g.era = g.eraWas != null ? g.eraWas : d.era;
      delete g.eraWas;
    } else if (g.era != null) {
      g.eraWas = g.era;
      g.era = null;
    }
  });
  return grOrder(c);
}
/* Move the goal at rank place a to place b (0 is the top). */
function grMove(c, a, b) {
  const L = grOrder(c);
  if (a < 0 || a >= L.length || b < 0 || b >= L.length || a === b) return L;
  const g = L.splice(a, 1)[0];
  L.splice(b, 0, g);
  L.forEach((x, i) => (x.rank = i + 1));
  return L;
}
/* A top goal is done or removed: the next one moves up. Only after the player ranked once. */
function grPromote(c) {
  if (c && c.x && c.x.grank) grApply(c);
}
/* Move one item of a list from place a to place b (the ranking of values uses it too). */
function rkMove(list, a, b) {
  const L = list.slice();
  if (a < 0 || a >= L.length || b < 0 || b >= L.length) return L;
  L.splice(b, 0, L.splice(a, 1)[0]);
  return L;
}

/* ---------- views ---------- */
/* One row of a ranking: the place, the name, up and down. o: { up, down, dim, list, i, sub } */
function rkRow(n, label, o) {
  return `<div class="rkrow ${o.dim ? "dim" : ""}" draggable="true" data-rkl="${o.list}" data-rki="${o.i}"><span class="rkn">${n}</span><span class="rkt"><b>${esc(label)}</b>${o.sub ? `<div class="tiny muted">${o.sub}</div>` : ""}</span><button class="ghost rkb" data-a="${o.up}" data-v="${o.i}" ${o.i === 0 ? "disabled" : ""} aria-label="Move up">↑</button><button class="ghost rkb" data-a="${o.down}" data-v="${o.i}" ${o.last ? "disabled" : ""} aria-label="Move down">↓</button>${o.rm ? `<button class="ghost rkb" data-a="${o.rm}" data-v="${esc(label)}" aria-label="Take it out">✕</button>` : ""}</div>`;
}
/* The card draft: keep any number, add your own, then rank. */
function draftSheet() {
  const c = C(),
    w = W;
  if (w.step === "rank") {
    const L = grOrder(c);
    return (
      head("Your goals", "Rank them") +
      `<div class="small muted">Tap ↑ and ↓, or drag. Your top ${GR_NOW} get the money and the dates first. The rest wait on Someday and move up when one is done.</div><div class="rklist">${L.map(
        (g, i) =>
          (i === 0
            ? `<div class="rkhead">Working on now</div>`
            : i === GR_NOW
              ? `<div class="rkhead muted">Someday</div>`
              : "") +
          rkRow(i + 1, g.n, {
            up: "grup",
            down: "grdown",
            i,
            last: i === L.length - 1,
            list: "goals",
            dim: i >= GR_NOW,
            sub: money(g.cost) + (g.s ? "" : " guess"),
          })
      ).join("")}</div>` +
      G2B("grdone", "Done: use this order")
    );
  }
  const cards = draftDeal(c, w.deal),
    pick = w.pick,
    own = w.own || [];
  const card = k =>
    `<div class="rowbtn ${pick.includes(k) ? "on" : ""}"><span><b>${esc(k)}</b><div class="tiny muted">${GOAL_ONE[k] || ""} Guess: ${money(goalTypical(c, k))}</div></span><button class="${pick.includes(k) ? "primary" : "ghost"} slim" data-a="grkeep" data-v="${esc(k)}" aria-pressed="${pick.includes(k)}">${pick.includes(k) ? "✓ Kept" : "Keep"}</button></div>`;
  const ownRows = own
    .map(
      n =>
        `<div class="rowbtn on"><span><b>${esc(n)}</b><div class="tiny muted">Your own. Guess: ${money(goalTypical(c, "Something else"))}</div></span><button class="primary slim" data-a="grkeep" data-v="${esc(n)}" data-k="own">✓ Kept</button></div>`
    )
    .join("");
  return (
    head("Card draft", "Which of these are yours?") +
    `<div class="small muted">Keep as many as you like. Next you put them in order.</div><div class="stack" style="gap:6px">${cards.map(card).join("")}${ownRows}</div>${cards.length ? "" : `<div class="tile small">You already have all of these on your list.</div>`}<button class="ghost wide slim" data-a="draftdeal">Deal me different ones</button>
 ${grOwnField()}` +
    `<button class="primary wide" data-a="grnext" ${pick.length || own.length || grOrder(c).length ? "" : `disabled title="Keep one first"`}>Next: rank them</button>${pick.length || own.length ? "" : `<div class="tiny muted">Keep one first, then rank.</div>`}<button class="linkish" data-a="grnone">None of these, for now</button>`
  );
}
/* The field "Add my own": one box and the button Add (ACT.grown puts the name on W.own). The card draft shows it,
   and "Something else" of What you want (features/wants.js) opens the same one. */
function grOwnField() {
  return `<div class="field"><label class="small" for="grown">Add my own</label><div class="row" style="gap:8px"><input id="grown" class="mnfind" type="text" maxlength="40" placeholder="A goal in a few words" style="flex:1;min-height:44px"><button class="ghost slim" data-a="grown">Add</button></div><div class="tiny muted">Optional. Typing is never needed.</div></div>`;
}
/* Part of goalsCard() in ui.js: the goals in rank order, the top 3 under "Working on now", the rest dimmed. */
function grRows(c, gs, row) {
  if (!(c.x && c.x.grank) || !gs.length) return gs.map(row).join("");
  return (
    `<div class="rkhead">Working on now</div>` +
    gs.slice(0, GR_NOW).map(row).join("") +
    (gs.length > GR_NOW
      ? `<div class="rkhead muted">Someday</div><div class="stack" style="opacity:.6;gap:6px">${gs.slice(GR_NOW).map(row).join("")}</div>`
      : "") +
    `<button class="ghost wide slim" data-a="grrank">Change the order</button>`
  );
}
/* A new goal. k: its kind, which is also its name. n: a name of its own (What you want: features/wants.js). */
const grNew = (c, k, n) => ({
  id: gid(),
  k: GOAL_ONE[k] ? k : "Something else",
  n: n || k,
  cost: goalTypical(c, GOAL_ONE[k] ? k : "Something else"),
  s: false,
  era: null,
  fund: 0,
  blk: null,
  d: todayISO(),
});
Object.assign(ACT, {
  grkeep: t => {
    const k = t.dataset.v;
    if (t.dataset.k === "own") W.own = (W.own || []).filter(x => x !== k);
    else {
      const i = W.pick.indexOf(k);
      if (i >= 0) W.pick.splice(i, 1);
      else W.pick.push(k);
    }
    drawSheet();
  },
  grown: () => {
    const el = typeof document !== "undefined" && document.getElementById ? document.getElementById("grown") : null,
      v = String((el && el.value) || "")
        .trim()
        .slice(0, 40);
    if (v && !(W.own || []).includes(v)) W.own = (W.own || []).concat([v]);
    drawSheet();
  },
  grnext: () => {
    const c = C();
    W.pick.concat(W.own || []).forEach(k => {
      if (!c.goals.some(g => g.n === k)) c.goals.push(grNew(c, k));
    });
    if (c.x) delete c.x.noGoals;
    W.pick = [];
    W.own = [];
    W.step = "rank";
    save();
    drawSheet();
  },
  grup: t => {
    const i = +t.dataset.v;
    grMove(C(), i, i - 1);
    drawSheet();
  },
  grdown: t => {
    const i = +t.dataset.v;
    grMove(C(), i, i + 1);
    drawSheet();
  },
  grdone: () => {
    const c = C(),
      X = GX(c);
    grApply(c, D);
    X.l2.draft = true;
    g2done();
  },
  grnone: () => {
    const c = C(),
      X = GX(c);
    c.x = c.x || {};
    if (!(c.goals || []).some(g => !g.done)) c.x.noGoals = true;
    X.l2.draft = true;
    g2done();
  },
  grrank: () => {
    W = { kind: "draft", deal: 0, pick: [], step: "rank" };
    sheet(draftSheet);
  },
});
/* Drag to rank: a row with data-rkl (the list) and data-rki (its place) can be dropped on another row. */
let RK_DRAG = null;
if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("dragstart", e => {
    const r = e.target && e.target.closest ? e.target.closest("[data-rkl]") : null;
    RK_DRAG = r ? { l: r.dataset.rkl, i: +r.dataset.rki } : null;
  });
  document.addEventListener("dragover", e => {
    if (RK_DRAG && e.target && e.target.closest && e.target.closest("[data-rkl]")) e.preventDefault();
  });
  document.addEventListener("drop", e => {
    const r = e.target && e.target.closest ? e.target.closest("[data-rkl]") : null;
    if (!RK_DRAG || !r || r.dataset.rkl !== RK_DRAG.l) return;
    e.preventDefault();
    try {
      const to = +r.dataset.rki;
      if (RK_DRAG.l === "goals") grMove(C(), RK_DRAG.i, to);
      else if (RK_DRAG.l === "values" && typeof vlRankMove === "function") vlRankMove(C(), RK_DRAG.i, to);
      save();
      drawSheet();
    } catch (err) {
      report(err, "goalrank.js: drop");
    }
    RK_DRAG = null;
  });
}
