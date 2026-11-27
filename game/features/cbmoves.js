/* ============================================================================
   SLAM the Game: features/cbmoves.js
   PURPOSE     What it is / What it could be, Batch B phase 2d (Nov 27 2026): the accumulation stack, the
               ways to get to the number sooner. It has no cards of its own. It lists the moves of the
               Strategy Engine (features/strat.js: the job match, an HSA, bank and card bonuses, a house
               hack, a raise, side income and the rest), and the levers and multipliers that no move
               covers (trim spending, fees and idle cash, card rewards, buying ahead, a tax-favored
               account). Each one shows months sooner, and the same three buttons as the other ways.
   INPUT       The profile. stgRank() of features/strat.js (each move with its verdict and its impact),
               lvLevers() of features/lever.js, muAll() of features/mult.js. c.x.cb.how["stg:match"] (the
               answer of the player for each move). The open sheet (W.kind cb, W.step move, W.id).
   OUTPUT      Math: cbMoves (the list, sorted, with what cannot apply and why, and the months of the moves
               that are counted, together), cbMoveDo (the answer of the player). View: cbMoveView.
               Actions (ACT): cbmovedo.
   DEPENDS ON  core/report.js, core/engine.js (derive), features/strat.js (stgRank, stgImpact, stgYm, stgX,
               STG_BLOCK), data/strategies.js (STRATEGIES), features/lever.js (lvLevers), features/mult.js
               (muAll, muStart, muPut), features/couldbe.js (cbStore, cbTop, cbFoot, cbState, cbM),
               features/kit.js (kitPill, kitTerms), screens/ui.js (head, mathBox, esc).
   RULES       Months sooner has one engine here: stgImpact() of strat.js (the game's month-by-month goal
               run, goalSim). This file works out no date by itself. A lever or a multiplier gives its own
               dollars a year, and stgImpact turns them into months. The two pinned numbers of the flow
               come from a different function (core/paylayers.js), so a counted move does not change them:
               the stack shows the months of the counted moves beside them, and says so. "Already doing
               it" for a move is the move's own answer (c.x.stg[id].already), its one home. A multiplier
               that is counted is switched on on the multipliers board (c.x.mu.on), its one home.
   COMPAT      New optional keys in c.x.cb.how: "stg:<id>", "lv:<id>", "mu:<id>" (count, did, no).
   STATE       None.
   ========================================================================= */
/* The levers and multipliers that no move of the Strategy Engine covers: [kind, key, the part of the impact]. */
const CBM_MORE = [
  ["lv", "spend", "save"],
  ["lv", "grow", "take"],
  ["mu", "card", "take"],
  ["mu", "ahead", "take"],
  ["mu", "acct", "take"],
];
/* The words of months sooner, from the impact of stgImpact(): { fi (months), fiNew }. */
function cbMoveWords(imp) {
  if (!imp) return "No number yet";
  if (imp.fi == null)
    return imp.fiNew != null ? "It puts an FI date on the calendar" : "No FI date yet at today's pace";
  const m = Math.round(imp.fi);
  if (Math.abs(imp.fi) < 1 / 30.44) return "No change to the date";
  if (Math.abs(imp.fi) < 1) return stgYm(imp.fi) + (imp.fi > 0 ? " sooner" : " later");
  return Math.abs(m) + (Math.abs(m) === 1 ? " month " : " months ") + (m > 0 ? "sooner" : "later");
}
/* THE LIST. Each row: { id, src (stg, lv, mu), name, one, applies, why (when it cannot apply), already, notyet (a
   soft roadblock: { block, why }), imp, months, days, words, month (dollars a month it is worth), st, risks, math,
   tiles, open ({ a, v }: the full card), how, stacked }. Returns { shown (what can apply, the biggest effect first),
   hidden (what cannot, with why), stacked, sum (the counted moves together: { n, words, imp }) }. */
function cbMoves(c) {
  const d = derive(c),
    how = (c.x && c.x.cb && c.x.cb.how) || {},
    rows = [],
    stOf = cf => (cf >= 3 ? "Exact" : cf >= 2 ? "Close" : "Guess"),
    F0 = (k, v) => ({ save: k === "save" ? v : 0, take: k === "take" ? v : 0, equity: 0, once: 0, hours: 0, value: v });
  stgRank(c).forEach(r => {
    const S = r.S,
      V = r.V;
    rows.push({
      id: "stg:" + S.id,
      src: "stg",
      key: S.id,
      name: S.name,
      one: S.one,
      applies: V.v !== "no",
      why: V.v === "no" ? V.why : "",
      already: V.v === "already",
      notyet: V.v === "notyet" ? { block: STG_BLOCK[V.block] ? STG_BLOCK[V.block][0] : "", why: V.why } : null,
      F: r.F,
      imp: r.imp,
      month: r.F.value + r.F.equity,
      st: r.I._st,
      risks: S.risks || [],
      math: r.F.math || [],
      tiles: r.F.tiles || [],
      open: { a: "strat", v: S.id, l: "Open the full card" },
    });
  });
  const L = typeof lvLevers === "function" ? lvLevers(c, d) : [],
    M = typeof muAll === "function" ? muAll(c, d) : { P: [] };
  CBM_MORE.forEach(([src, key, part]) => {
    const x = src === "lv" ? L.find(l => l.k === key) : M.P.find(p => p.k === key);
    if (!x) return;
    const F = F0(part, (x.yr || 0) / 12),
      on = src === "mu" ? !!x.on : !!x.done;
    rows.push({
      id: src + ":" + key,
      src,
      key,
      name: src === "lv" ? x.what : x.n,
      one: src === "lv" ? x.math[0] : x.one,
      applies: on || (x.yr > 0 && !x.lock),
      why: x.lock || x.note || "It adds nothing on your numbers yet.",
      already: on,
      notyet: null,
      F,
      imp: x.yr > 0 ? stgImpact(c, F, "full") : { fi: 0, days: 0 },
      month: F.value,
      st: stOf(x.cf || 0),
      /* a multiplier that is locked (costly debt) has no worst case and no math of its own: its lock is the risk */
      risks: [x.worst || x.note || (x.math || []).slice(-1)[0] || x.lock || ""],
      math: x.math || [],
      tiles: [],
      open:
        src === "lv"
          ? { a: "lever", v: "", l: "Open Which lever matters most" }
          : { a: "mult", v: "", l: "Open the multipliers board" },
    });
  });
  rows.forEach(r => {
    r.how = r.already && how[r.id] !== "no" ? "did" : how[r.id] || null;
    r.stacked = r.how === "count" || r.how === "did";
    r.months = r.imp.fi == null ? null : r.imp.fi;
    r.days = Math.max(0, r.imp.days || 0);
    r.words = r.already ? "Already in your date" : cbMoveWords(r.imp);
    r.term = "cbmv_" + r.src + "_" + r.key;
    /* the "i" of the move: what has to go right is that its named risks stay away; the backup is the same for each */
    kitTerms({
      [r.term]: [
        r.name,
        "What has to go right: none of these gets in the way. " +
          r.risks.join(" ") +
          " Backup if it doesn't: your date at today's pace does not count on this move. If it stops, the game recalculates the date, and What it is stays the same.",
      ],
    });
  });
  const shown = rows
      .filter(r => r.applies || r.stacked)
      .sort((a, b) => (a.already ? 1 : 0) - (b.already ? 1 : 0) || b.days - a.days),
    hidden = rows.filter(r => !r.applies && !r.stacked),
    cnt = shown.filter(r => r.how === "count" && !r.F.toDebt),
    Fs = cnt.reduce(
      (t, r) => {
        t.save += r.F.save;
        t.take += r.F.take;
        t.equity += r.F.equity;
        t.once += r.F.once;
        return t;
      },
      { save: 0, take: 0, equity: 0, once: 0, hours: 0 }
    );
  Fs.value = Fs.save + Fs.take + Fs.once / 12;
  const sumImp = cnt.length ? stgImpact(c, Fs, "full") : null;
  return {
    shown,
    hidden,
    stacked: shown.filter(r => r.stacked).length,
    sum: { n: cnt.length, imp: sumImp, words: sumImp ? cbMoveWords(sumImp) : "", month: Fs.value + Fs.equity },
  };
}
/* The answer of the player for one move. how: count (Count this), did (Already doing it), no (Not for me). */
function cbMoveDo(id, how) {
  const c = C(),
    s = cbStore(c),
    r = cbMoves(c)
      .shown.concat(cbMoves(c).hidden)
      .find(x => x.id === id);
  if (!r) return null;
  s.how = s.how || {};
  s.how[id] = how === "no" ? "no" : how === "did" ? "did" : "count";
  /* the one home of "I already do this" for a move, and of a multiplier that is in use */
  if (r.src === "stg") {
    const X = stgX(c, r.key);
    if (how === "did") X.already = true;
    else if (X.already) X.already = false;
  } else if (r.src === "mu") {
    const m = muStart(c);
    if (how === "no") delete m.on[r.key];
    else m.on[r.key] = 1;
    muPut(c, m);
  }
  save();
  return cbMoves(c);
}
/* ONE MOVE, with the pattern of a way: a headline, one line, the "i", the drop, three buttons, the receipt. */
function cbMoveView() {
  const c = C(),
    M = cbMoves(c),
    r = M.shown.concat(M.hidden).find(x => x.id === W.id);
  if (!r)
    return (
      head("The stack", "A move") +
      cbTop(c) +
      `<button class="primary wide cbnext" data-a="cbgo" data-v="stack">All the ways</button>` +
      cbNav({ back: `data-a="cbgo" data-v="prev"` }) +
      cbFoot()
    );
  const btn = (v, label) =>
      `<button class="${!r.how && v === "count" ? "primary go cbnext" : "ghost"} wide ${r.how === v ? "on" : ""}" data-a="cbmovedo" data-k="${r.id}" data-v="${v}" aria-pressed="${r.how === v ? "true" : "false"}">${label}${r.how === v ? " ✓" : ""}</button>`,
    no = (c.x && c.x.cb && c.x.cb.how && c.x.cb.how[r.id]) === "no",
    said = no
      ? `<div class="banner small" data-fid="cb:receipt"><b>Left out.</b> One tap on Count this puts it in the stack.</div>`
      : r.stacked
        ? `<div class="banner small cbrec" data-fid="cb:receipt"><b>${r.how === "did" ? "Already yours, and in the stack." : "In the stack."}</b> ${esc(r.words)}${r.how === "did" ? "" : ". " + esc(cbM(0)) + " off the target: this one moves the date"}. ${cbI("receipt")}</div>`
        : "";
  return (
    head("Before FI: get there sooner", esc(r.name)) +
    cbTop(c) +
    `<div class="small">${esc(r.one)}</div>` +
    /* cbguide.js: behind one tap (run 14, item 2) */
    cbFold(
      "backup",
      "What has to go right, and the backup",
      `<button class="rowbtn cbwhy" data-a="info" data-k="term:${r.term}"><span><b>What has to go right</b><div class="tiny muted">And the backup if it doesn't.</div></span><span class="i" aria-hidden="true">i</span></button>`
    ) +
    (r.applies
      ? ""
      : `<div class="banner small" data-fid="cbmove:why"><b>This cannot apply yet.</b> ${esc(r.why)}</div>`) +
    (r.notyet
      ? `<div class="banner small" data-fid="cbmove:notyet"><b>Not yet${r.notyet.block ? ": " + esc(r.notyet.block.toLowerCase()) : ""}.</b> ${esc(r.notyet.why)}</div>`
      : "") +
    `<div class="tile cbdrop" data-fid="cb:drop"><div class="row between"><span class="dklabel">The drop for you ${cbI("drop")}</span>${kitPill(r.st)}</div><b class="cbdropn">${esc(r.words)}</b><div class="tiny muted">${r.month > 0 ? "Worth about " + cbM(r.month) + " a month on your numbers. " : ""}This moves the date. The two numbers on top are about the target, so they stay.</div></div>` +
    (r.tiles.length
      ? `<div class="tile small" data-fid="cbmove:tiles"><div class="row between" style="gap:8px"><b>The numbers of this move</b>${cbI("movenums")}</div>${r.tiles
          .slice(0, 3)
          .map(
            t =>
              `<div class="row between" style="gap:8px"><span>${esc(t[0])}</span><b>${esc(t[1])}</b></div>${t[2] ? `<div class="tiny muted">${esc(t[2])}</div>` : ""}`
          )
          .join("")}</div>`
      : "") +
    `<div class="stack cbways" style="gap:8px">${btn("count", "Count this")}<div class="cbtwo">${btn("did", "Already doing it")}${btn("no", "Not for me")}</div></div>` +
    cbWayUnsure() +
    said +
    mathBox(
      r.math.concat([
        "Months sooner: the game runs your plan month by month, with this move and without it, and compares the month each one reaches your FI number. It is the same number as on Moves to try.",
        r.st === "Guess"
          ? "This is a Guess: it stands on typical values until you put in your own on the full card."
          : "",
      ])
    ) +
    `<button class="ghost wide" data-a="${r.open.a}" data-v="${r.open.v}">${esc(r.open.l)}</button>` +
    `<button class="${r.how ? "primary go cbnext" : "ghost"} wide" data-a="cbgo" data-v="stack">All the ways</button>` +
    cbNav({ back: `data-a="cbgo" data-v="prev"` }) /* cbguide.js: Back (the stack) and Forward */ +
    cbFoot()
  );
}
Object.assign(ACT, {
  /* Count this, Already doing it, Not for me, for one move */
  cbmovedo: t => {
    if (!W || W.kind !== "cb") return;
    cbMoveDo(t.dataset.k, t.dataset.v);
    drawSheet();
  },
});
