/* ============================================================================
   SLAM the Game: features/fewer.js
   PURPOSE     Asking fewer questions (run Finish everything partly built, Part 17). Each open blank (a
               Guess or a Close number) gets a dollar figure: the cost of not knowing, what it could move
               your money a year from now. The blanks are ranked by those dollars with the one ranking of
               both apps (core/askrank.js, a copy of js/math/askrank.js, the ranking of Ask me next), and
               the game stops asking once the blanks asked cover 80% of what could move (the stopping
               rule), and says so plainly. It also keeps the count of setup's taps (W.taps, counted by
               screens/planner.js) and shows it on the payoff reveal, as a plain fact, not a score.
   INPUT       The profile (its rows: c.incs, c.spends, c.cashes, c.debts, c.invs). The setup sheet (W.kind
               setup: W.o, W.taps). The open sheet of Make your numbers real (W.kind sharp).
   OUTPUT      Math: FQ_SECS, fqYearOn, fqBlanks, fqPlan, fqByKey, fqNice, fqSpendOrder, fqSharpOrder,
               fqRough, fqGroupLines, fewerBook. Views: fqDollars, fqRestWords, fqStopTile. Parts of
               functions in other files: finishSetupTaps (finishSetup in ui.js: keeps the count of
               planner.js, W.taps), fqSpendOrder (amSteps in amounts.js), fqSetupStop (amBody in
               amounts.js), fqGroupFew (amGroupHtml in amounts.js), fqSharpOrder, fqSharpLine and
               fqSharpStop (askSheet in ask.js), fqRough (roughSheet in games.js), fqByKey (spDepends in
               spiral.js), fqDependsRest and fqTapsNote (spPlanSheet in spiral.js), fewerBook (BOOK_PARTS
               in book.js). Actions (ACT): fqstop, fqaskstop.
   DEPENDS ON  core/askrank.js (arYearOn, arSwing, arRank, arStop, AR_RULES), core/engine.js (derive,
               syncAll, applyTypical), screens/ui.js (clone, money, esc), features/look.js (lkRowRange:
               the range of a row), features/spiral.js (spPreview), features/amounts.js (AM_GROUPS, amSlug,
               amSteps, amAfter, amBlock), features/mycards.js (debtName).
   RULES       Every dollar figure comes from the engine (derive) at the two ends of the blank's own range
               (lkRowRange: a range chip of setup keeps its range; a typical amount is half to one and a
               half times itself). An Exact number is not a blank. A blank that is left keeps its typical
               amount and stays a Guess; nothing is set to zero. No verdict words.
   COMPAT      New optional field c.x.setupTaps = { n, d } (the taps of setup and the day). An old saved
               game has none and loads as before.
   ========================================================================= */
/* The sections of rows: [rows, the key of Make your numbers real, the name, a month (true) or a balance]. */
const FQ_SECS = [
  ["incs", "take", "Money coming in", true],
  ["spends", "spend", "Money going out", true],
  ["cashes", "cash", "Cash you can reach", false],
  ["debts", "debt", "What you owe", false],
  ["invs", "inv", "What you have invested", false],
];
let FQ_MEMO = null;

/* THE MATH. Your money a year from now (M8Y): net worth + 12 x (money in a month - money out a month), from derive. */
function fqYearOn(c) {
  const d = derive(c);
  return arYearOn(d.nw, c.take, c.spend);
}
/* Each open blank with its two ends and the dollars it could move. Ranked by arRank, top first. */
function fqBlanks(c) {
  if (!c || !c.led) return [];
  const key = JSON.stringify([c.incs, c.spends, c.cashes, c.debts, c.invs, c.payFreq, c.home]);
  if (FQ_MEMO && FQ_MEMO.key === key) return FQ_MEMO.out;
  const out = [];
  let order = 0;
  FQ_SECS.forEach(([sec, k, secN, monthly]) => {
    (c[sec] || []).forEach((x, i) => {
      if (x.hold || typeof lkRowRange !== "function") return;
      const r = lkRowRange(x, sec),
        lo = r[0],
        hi = r[1];
      if (!(hi > lo)) return;
      const at = v => {
        const p = clone(c);
        p[sec][i].amt = v;
        syncAll(p);
        return fqYearOn(p);
      };
      const swing = arSwing(at(lo), at(hi));
      if (swing == null || swing < 1) return;
      out.push({
        sec,
        k,
        secN,
        monthly,
        i,
        n: sec === "debts" && typeof debtName === "function" ? debtName(x, c) : x.nick || x.k,
        lo,
        hi,
        st: x.s && Array.isArray(x.rg) ? "Close" : "Guess",
        value: Math.round(swing),
        seconds: 1,
        order: order++,
      });
    });
  });
  const ranked = arRank(out, { tie: AR_RULES.tie });
  FQ_MEMO = { key, out: ranked };
  return ranked;
}
/* The ranked blanks that pass the test f, split by the stopping rule (arStop): ask, rest, total, restValue. */
function fqPlan(c, f) {
  const ranked = fqBlanks(c).filter(f || (() => true)),
    S = arStop(ranked, AR_RULES.stopShare);
  return Object.assign({ ranked }, S);
}
/* The blanks summed by the key of Make your numbers real (for "It depends on" on the payoff reveal). */
function fqByKey(c) {
  const by = {};
  fqBlanks(c).forEach(b => {
    const g =
      by[b.k] ||
      (by[b.k] = { k: b.k, n: b.secN, value: 0, seconds: 1, order: FQ_SECS.findIndex(s => s[1] === b.k), rows: 0 });
    g.value += b.value;
    g.rows++;
  });
  const ranked = arRank(Object.values(by), { tie: AR_RULES.tie });
  return Object.assign({ ranked, by }, arStop(ranked, AR_RULES.stopShare));
}
/* A dollar figure to show: to $10 under $1,000, else to $100. */
function fqNice(v) {
  if (v == null) return null;
  return v < 1000 ? Math.max(10, Math.round(v / 10) * 10) : Math.round(v / 100) * 100;
}
/* Setup, page 13 (spending group by group): the groups ranked by what their typical amount could move, worked out on
   the answers with every spending answer taken out, so the order stays put while you answer. */
function fqSpendOrder(w) {
  if (!w || !w.o || typeof spPreview !== "function" || typeof AM_GROUPS === "undefined") return null;
  const o = clone(w.o);
  o.am = Object.fromEntries(Object.entries(o.am || {}).filter(([id]) => id.indexOf("s:") !== 0));
  const key = JSON.stringify(o);
  if (w.fqSp && w.fqSp.key === key) return w.fqSp.P;
  const c = spPreview({ o }).c,
    P = fqPlan(c, b => b.sec === "spends");
  const ids = b => "s:" + amSlug(b.n);
  P.order = P.ranked.map(ids);
  P.restIds = P.rest.map(ids);
  w.fqSp = { key, P };
  return P;
}
/* Make your numbers real (one small question at a time): the rows of key k, top first by dollars, then the rows with
   nothing open. Worked out once when the sheet opens (W.fq), on the profile as it was. */
function fqSharpOrder(w, c, k, n) {
  if (w.fq && w.fq.k === k && w.fq.n === n) return w.fq;
  const P = fqPlan(c, b => b.k === k && b.i < n),
    top = P.ranked.map(b => b.i),
    ord = top.concat([...Array(n).keys()].filter(i => !top.includes(i)));
  w.fq = {
    k,
    n,
    ord,
    val: Object.fromEntries(P.ranked.map(b => [b.i, b.value])),
    rest: P.rest.map(b => b.i),
    restValue: P.restValue,
    total: P.total,
  };
  return w.fq;
}
/* Close numbers: each one with what it could move, ranked, split by the stopping rule. rs: roughOnes(c). */
function fqRough(c, rs) {
  const map = { take: "incs", cash: "cashes", inv: "invs", debt: "debts" };
  const items = (rs || []).map((r, order) => {
    const at = v => {
      const p = clone(c),
        m = /^spend:(\d+)$/.exec(r.k);
      if (m && p.spends[+m[1]]) p.spends[+m[1]].amt = v;
      else if (map[r.k]) {
        const rows = (p[map[r.k]] || []).filter(x => !x.hold && !x.partner),
          was = rows.reduce((t, x) => t + (+x.amt || 0), 0);
        if (!rows.length) return null;
        rows.forEach(x => (x.amt = was > 0 ? ((+x.amt || 0) * v) / was : v / rows.length));
      } else return null;
      syncAll(p);
      return fqYearOn(p);
    };
    const s = arSwing(at(r.lo), at(r.hi));
    return Object.assign({}, r, { value: s == null ? 0 : Math.round(s), seconds: 1, order });
  });
  const ranked = arRank(items, { tie: AR_RULES.tie });
  return Object.assign({ ranked }, arStop(ranked, AR_RULES.stopShare));
}
/* The cost of not knowing in the spreadsheet of the plan (book.js): each blank's two ends and its swing. A month's row
   moves a year of what is left (12 x its width); a balance moves net worth by its width. */
function fewerBook(c) {
  const d = derive(c),
    rows = [
      { id: "fq_nw", label: "Net worth today", v: d.nw },
      { id: "fq_in", label: "Money coming in a month", v: c.take },
      { id: "fq_out", label: "Money going out a month", v: c.spend },
      {
        id: "fq_year",
        label: "Your money a year from now",
        v: arYearOn(d.nw, c.take, c.spend),
        f: "={fq_nw}+12*({fq_in}-{fq_out})",
      },
    ];
  fqBlanks(c)
    .slice(0, 8)
    .forEach((b, j) => {
      const id = "fq_b" + (j + 1);
      rows.push({ id: id + "lo", label: b.n + ": the low end", v: b.lo, note: b.st });
      rows.push({ id: id + "hi", label: b.n + ": the high end", v: b.hi });
      rows.push({
        id,
        label: b.n + ": what not knowing could move a year",
        v: b.value,
        f: b.monthly ? "=12*({" + id + "hi}-{" + id + "lo})" : "={" + id + "hi}-{" + id + "lo}",
      });
    });
  return { title: "Asking fewer questions: what each blank could move", rows };
}

/* THE VIEWS. */
function fqDollars(v) {
  return "about " + money(fqNice(v));
}
function fqRestWords(names) {
  const n = names.map(s => String(s).toLowerCase());
  return n.length > 1 ? n.slice(0, -1).join(", ") + " and " + n[n.length - 1] : n[0] || "";
}
/* The stopping rule, said plainly, with one button that stops. a: the action; v: its value. */
function fqStopTile(restNames, restValue, a, v, label, cls) {
  return `<div class="tile stack fqstop" role="status" style="gap:6px"><b>You can stop here</b><div class="small">The rest (${esc(fqRestWords(restNames))}) could move your money a year from now by ${esc(fqDollars(restValue))} in all. That is under a fifth of what was open, so the game keeps a typical amount for them, marked Guess.</div><button class="${cls || "primary go"} wide" data-a="${a}"${v != null ? ` data-v="${esc(v)}"` : ""}>${esc(label)}</button><div class="tiny muted">You can still answer them below, or later in Make your numbers real.</div></div>`;
}
/* Part of amBody() in amounts.js. Setup, page 13: when the group up next is one that moves little, the stop tile. */
function fqSetupStop(w, st) {
  if (!st || st.t !== "grp" || st.done) return "";
  const P = fqSpendOrder(w);
  if (!P || !P.restIds.includes(st.id)) return "";
  const left = amSteps(w, 13).filter(s => !s.done && P.restIds.includes(s.id));
  if (!left.length) return "";
  const val = P.rest.filter(b => left.some(s => s.id === "s:" + amSlug(b.n))).reduce((t, b) => t + b.value, 0);
  return fqStopTile(
    left.map(s => s.grp),
    val,
    "fqstop",
    null,
    "Stop here, keep typical amounts"
  );
}
/* Inside a spending group of setup: each line's blank is the span of its range chips (AM_RNG), a month's amount, so
   it moves 12 x its width a year. The lines ranked and split by the stopping rule. null until a line is in and every
   line left is one that moves little. g: the group of AM_GROUPS; L: amGroupLines. */
function fqGroupLines(g, L) {
  const items = g[3].map((line, j) => {
    const rs = (typeof AM_RNG !== "undefined" && AM_RNG[line[1]]) || [],
      lo = rs.length ? Math.min(...rs.map(r => r[1])) : null,
      hi = rs.length ? Math.max(...rs.map(r => r[2])) : null;
    return {
      j,
      n: line[0],
      lo,
      hi,
      value: arSwing(arYearOn(0, 0, lo), arYearOn(0, 0, hi)) || 0,
      seconds: 1,
      order: j,
      open: L[j] && L[j].amt == null && !L[j].skip,
    };
  });
  return arStop(arRank(items, { tie: AR_RULES.tie }), AR_RULES.stopShare);
}
/* Part of amGroupHtml() in amounts.js. The tile "You can stop here" for the lines left of a group, or null. */
function fqGroupFew(g, L) {
  if (!L.some(l => l.amt != null)) return null;
  const S = fqGroupLines(g, L),
    left = S.ask.concat(S.rest).filter(x => x.open);
  if (!left.length || !left.every(x => S.rest.includes(x))) return null;
  const val = left.reduce((t, x) => t + x.value, 0);
  return {
    names: left.map(x => x.n),
    value: val,
    html: `<div class="tile small fqfew" role="status"><b>You can stop here.</b> ${esc(fqRestWords(left.map(x => x.n)).replace(/^./, m => m.toUpperCase()))} could move your money a year from now by up to ${esc(money(fqNice(val)))}, under a fifth of this group. The game keeps a typical amount for ${left.length === 1 ? "it" : "them"}.</div>`,
  };
}
/* Part of askSheet() in ask.js. The line under a question: what this blank could move. */
function fqSharpLine(w, i) {
  const v = w.fq && w.fq.val ? w.fq.val[i] : null;
  return v
    ? `<div class="tiny muted fqline">Not knowing this could move your money a year from now by ${esc(fqDollars(v))}.</div>`
    : "";
}
/* Part of askSheet() in ask.js. Before a question that moves little, when every question left moves little too. */
function fqSharpStop(w, i, rows) {
  const F = w.fq;
  if (!F || !F.rest.includes(i)) return "";
  const pos = F.ord.indexOf(i),
    left = F.ord.slice(pos).filter(j => F.rest.includes(j));
  if (left.length !== F.ord.slice(pos).filter(j => F.val[j]).length) return "";
  const val = left.reduce((t, j) => t + (F.val[j] || 0), 0);
  return fqStopTile(
    left.map(j => rows[j].k),
    val,
    "fqaskstop",
    null,
    "Stop here, keep the rest as guesses",
    "ghost"
  );
}
/* Part of spPlanSheet() in spiral.js. Under "It depends on": the inputs left out by the stopping rule. */
function fqDependsRest(c) {
  const F = fqByKey(c);
  if (!F.stop || !F.ask.length) return "";
  return `<div class="tiny muted fqrest">${esc(fqRestWords(F.rest.map(g => g.n)).replace(/^./, m => m.toUpperCase()))} could move your money a year from now by ${esc(fqDollars(F.restValue))} in all. That is under a fifth of what is open, so there is no need to ask about ${F.rest.length === 1 ? "it" : "them"} now.</div>`;
}
/* Part of finishSetup() in ui.js. Keeps the count of setup's taps on the profile. */
function finishSetupTaps() {
  try {
    const w = W;
    if (!w || w.kind !== "setup" || w.mode === "edit" || !w.taps || !w.o) return;
    w.o.x = w.o.x || {};
    w.o.x.setupTaps = { n: w.taps, d: todayISO() };
  } catch (e) {
    report(e, "fewer.js: finishSetupTaps");
  }
}
/* Part of spPlanSheet() in spiral.js. The count of setup's taps, as a plain fact. */
function fqTapsNote(c) {
  const t = c && c.x && c.x.setupTaps;
  return t && t.n > 0
    ? `<div class="tiny muted fqtaps">You set this up in ${t.n} taps. The questions left are ranked by what they could move, so the few that matter come first.</div>`
    : "";
}
Object.assign(ACT, {
  /* Setup, page 13: every spending group left that moves little keeps its typical amount. */
  fqstop: () => {
    const w = W;
    if (typeof amBlock === "function" && amBlock(w)) return;
    const P = fqSpendOrder(w);
    if (!P) return;
    w.o.am = w.o.am || {};
    const wasAll = amSteps(w, 13).every(x => x.done);
    let last = null;
    amSteps(w, 13).forEach(s => {
      if (!s.done && P.restIds.includes(s.id)) {
        w.o.am[s.id] = { v: 1, lab: "Typical for now", all: false, few: true };
        last = s.id;
      }
    });
    if (last) amAfter(w, 13, last, wasAll);
  },
  /* Make your numbers real: the rows left keep their numbers as they are, and the sheet ends on its Done screen. */
  fqaskstop: () => {
    const w = W;
    if (!w || w.kind !== "sharp" || !w.fq) return;
    if (typeof askFinish === "function") askFinish();
  },
});
