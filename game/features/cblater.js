/* ============================================================================
   SLAM the Game: features/cblater.js
   PURPOSE     What it is / What it could be, Batch B phase 2c (Nov 27 2026): the way "Money that shows up
               later". Two things the 25 times rule leaves out: steady income that starts later (a pension,
               retirement income) and a payment that ends (a home loan that is paid off). The first pays
               part of each year from the age it starts. The second makes each year cost less from the age
               it ends. Three taps ask for them when the profile has none.
   INPUT       The profile, through features/couldbe.js (cbParams: other, ends) and core/engine.js (passives,
               endsOf, the questions pension, homepmt and homeyrs of LIFE: their one home is c.x.pen and
               c.x.home). The open sheet (W.kind cb, W.step later).
   OUTPUT      Math: cbLaterPlan (the parts, the receipt, the questions and their answers), cbLaterDo (the
               answer of the player), cbLaterSet (one tap on a question), cbLaterInfo (what the stack reads),
               cbLaterBookRows (part of cbBook in couldbe.js).
               View: cbLaterView. Actions (ACT): cblaterdo, cblaterset. A step of the flow, added with
               cbStepAdd("later", ...).
   DEPENDS ON  core/report.js, core/engine.js (derive, passives, LIFE, lifeSet), core/paylayers.js (lyReceipt,
               LY_END), features/couldbe.js (cbParams, cbCounted, cbLy, cbState, cbStore, cbChart, cbTop, cbFoot,
               cbWayNo, cbWayState, cbReceiptWords, cbChartCard, cbStepAdd, cbM, cbWhyRow, cbWayNav),
               features/kit.js (kitPill, kitTerms), screens/ui.js (head, mathBox, esc).
   RULES       No second copy of a number: a pension is c.x.pen, a home loan payment and its years are
               c.x.home (pmt, yrs), written by the game's own questions (lifeSet). The payment is already in
               today's spending, so only its end is counted. A view shows what the math functions return.
   COMPAT      Optional keys in c.x.cb.count: later {} (the answer of this way), other {} and ends {} (what the
               math reads), and c.x.cb.how.later (count, did, no). An old saved game has none.
   STATE       None.
   ========================================================================= */
/* The questions of this way, by their id in LIFE (core/engine.js). */
const CBL_ASKS = ["pension", "homepmt", "homeyrs"];
/* THE PLAN for this player: parts ([{ id, name, year, from, kind: income or ends }]), applies (there is at least
   one part), the two numbers without the way and with it, the receipt, and the questions with their answers:
   asks ([{ id, q, h, opts: [{ i, label, on }] }]). */
function cbLaterPlan(c) {
  const d = derive(c),
    p = cbParams(c, d),
    P = passives(c),
    cnt = Object.assign({}, cbCounted(c)),
    X = c.x || {},
    done = X.done || {},
    parts = []
      .concat(
        P.now > 0
          ? [{ id: "now", kind: "income", name: "Retirement income you already get", year: P.now * 12, from: c.age }]
          : [],
        P.pen ? [{ id: "pen", kind: "income", name: "A pension", year: P.pen.amt * 12, from: P.pen.age }] : []
      )
      .concat(
        p.ends.map((e, i) => ({
          id: "end" + i,
          kind: "ends",
          name: e.k === "Mortgage" ? "Your home loan is paid off" : e.k + " ends",
          year: e.year,
          from: e.from,
        }))
      ),
    hasPay = !!(X.home && X.home.pmt > 0),
    asks = CBL_ASKS.filter(id => id !== "homeyrs" || hasPay).map(id => {
      const Q = LIFE.find(q => q.id === id),
        opts = Q.o.map((o, i) => ({ i, label: o[0], on: done[id] === o[0] }));
      if (id === "homepmt") opts.unshift({ i: -1, label: "No home loan", on: done[id] === "No home loan" });
      return { id, q: Q.q, h: Q.h || "", opts };
    });
  delete cnt.later;
  delete cnt.other;
  delete cnt.ends;
  const before = cbLy(p, cnt),
    add = Object.assign({}, cnt, p.other.length ? { other: {} } : {}, p.ends.length ? { ends: {} } : {}),
    after = parts.length ? cbLy(p, add) : before;
  return {
    applies: parts.length > 0,
    why: parts.length ? "" : "none",
    parts,
    asks,
    hasIncome: p.other.length > 0,
    hasEnds: p.ends.length > 0,
    before,
    after,
    receipt: lyReceipt(before.could, after.could),
    st: cbState(c),
  };
}
/* The reason the way is not offered, in the player's words. */
function cbLaterWhy() {
  return "Your numbers have no pension and no payment with an end date yet. Three taps on this screen add them.";
}
/* The answer of the player. how: count (Count this), did (Already doing it: counted too), no (Not for me). The math
   reads other (steady income) and ends (payments that end): each is counted when the profile has one. */
function cbLaterDo(how) {
  const c = C(),
    s = cbStore(c),
    P = cbLaterPlan(c);
  s.how = s.how || {};
  delete s.count.other;
  delete s.count.ends;
  if (how === "no" || !P.applies) {
    delete s.count.later;
    s.how.later = "no";
  } else {
    s.count.later = {};
    if (P.hasIncome) s.count.other = {};
    if (P.hasEnds) s.count.ends = {};
    s.how.later = how === "did" ? "did" : "count";
  }
  save();
  return cbLaterPlan(c);
}
/* One tap on a question. id: pension, homepmt, homeyrs. i: the option of the game's own question (-1: no home
   loan). The answer goes to the home of that question (lifeSet). A way that is counted follows the new answer. */
function cbLaterSet(id, i) {
  const c = C(),
    s = cbStore(c);
  if (!CBL_ASKS.includes(id)) return;
  c.x = c.x || {};
  if (id !== "pension") c.x.home = Object.assign({ val: 0, bal: 0, pmt: 0, yrs: 0 }, c.x.home);
  if (id === "homepmt" && i < 0) {
    c.x.done = c.x.done || {};
    c.x.home.pmt = 0;
    c.x.home.yrs = 0;
    c.x.done.homepmt = "No home loan";
    delete c.x.done.homeyrs;
  } else lifeSet(c, id, i);
  if (s.count.later) cbLaterDo((s.how || {}).later || "count");
  save();
}
/* Part of cbBook() in couldbe.js. The spreadsheet of the plan: the income that starts later and the payments that end. */
function cbLaterBookRows(c) {
  try {
    const P = cbLaterPlan(c),
      sum = k => P.parts.filter(x => x.kind === k).reduce((t, x) => t + x.year, 0);
    if (!P.applies) return [];
    return [
      {
        id: "cb_laterinc",
        label: "Steady income that starts later, a year (a pension, retirement income)",
        v: sum("income"),
      },
      { id: "cb_laterend", label: "Payments that end, a year (a home loan that is paid off)", v: sum("ends") },
    ];
  } catch (e) {
    report(e, "cblater.js: cbLaterBookRows");
    return [];
  }
}
/* What this way gives the stack (cbstack.js). The backup has no number to read, so the player ticks it. */
function cbLaterInfo(c) {
  const P = cbLaterPlan(c);
  return {
    applies: P.applies,
    why: P.applies ? "" : cbLaterWhy(),
    receipt: P.receipt,
    st: P.st,
    backup: {
      words: "You have it in writing: a pension estimate, or the payoff date on a loan statement.",
      auto: null,
    },
  };
}
/* THE SCREEN of the way. */
function cbLaterView() {
  const c = C(),
    P = cbLaterPlan(c),
    St = cbWayState(c, "later"),
    K = cbChart(c),
    btn = (v, label) =>
      `<button class="${!St.how && v === "count" ? "primary go" : "ghost"} wide ${St.how === v ? "on" : ""}" data-a="cblaterdo" data-v="${v}" aria-pressed="${St.how === v ? "true" : "false"}">${label}${St.how === v ? " ✓" : ""}</button>`,
    said =
      St.how === "no"
        ? `<div class="banner small" data-fid="cb:receipt"><b>Left out.</b> What it could be does not count this. One tap on Count this puts it in.</div>`
        : St.counted
          ? `<div class="banner small cbrec" data-fid="cb:receipt"><b>${St.how === "did" ? "Already yours, and counted." : "Counted."}</b> ${esc(cbReceiptWords(P.receipt))}.</div>`
          : "",
    asks = P.asks
      .map(
        a =>
          `<div class="field"><span class="small">${esc(a.q)}</span><div class="chips">${a.opts.map(o => `<button class="chip ${o.on ? "on" : ""}" data-a="cblaterset" data-k="${a.id}" data-i="${o.i}" aria-pressed="${o.on ? "true" : "false"}">${esc(o.label)}</button>`).join("")}</div>${a.h ? `<div class="tiny muted">${esc(a.h)}</div>` : ""}</div>`
      )
      .join("");
  return (
    head(cbWayNo("later"), "Money that shows up later") +
    cbTop(c) +
    `<div class="small">A pension pays part of each year from the day it starts. A home loan that is paid off makes each year cost less. The 25 times rule counts neither.</div>` +
    cbWhyRow("later", "cblater") +
    `<div class="stack" style="gap:8px" data-fid="cblater:asks"><b class="small">Up to three taps</b>${asks}</div>` +
    (P.applies
      ? `<div class="tile small" data-fid="cblater:parts"><b>What shows up, and when</b>${P.parts.map(x => `<div>${esc(x.name)}: ${x.kind === "ends" ? cbM(x.year) + " a year less to pay for, from age " + x.from : cbM(x.year) + " a year, from age " + x.from}.</div>`).join("")}</div>` +
        `<div class="tile cbdrop" data-fid="cb:drop"><div class="row between"><span class="dklabel">The drop for you</span>${kitPill(P.st)}</div><b class="cbdropn">${esc(cbReceiptWords(P.receipt))}</b><div class="tiny muted">${St.counted ? "With these counted, against not counting them." : "If you count it."}</div></div>` +
        `<div class="stack cbways" style="gap:8px">${btn("count", "Count this")}<div class="cbtwo">${btn("did", "Already doing it")}${btn("no", "Not for me")}</div></div>` +
        said
      : `<div class="tile cbdrop" data-fid="cb:drop"><div class="row between"><span class="dklabel">The drop for you</span>${kitPill(P.st)}</div><b class="cbdropn">No drop yet</b><div class="small" data-fid="cblater:why">${esc(cbLaterWhy())}</div></div>`) +
    cbChartCard(
      K,
      "The chart now",
      "A pension is in the layer Other. When a payment ends and is counted, the line across the top steps down."
    ) +
    mathBox(
      P.parts
        .map(x =>
          x.kind === "ends"
            ? x.name +
              ": " +
              cbM(x.year) +
              " a year is in your spending today. From age " +
              x.from +
              " the year's cost is lower by that much, needs first."
            : x.name + ": " + cbM(x.year) + " a year from age " + x.from + ". It pays your needs first, then wants."
        )
        .concat([
          "A pension starts at 65 here, until the rest of setup has your own age for it.",
          "What it could be: what must be invested the day work stops, so that it pays each year's cost less the steady income you counted, to " +
            LY_END +
            " and beyond.",
          "Not counted: property tax, insurance and repairs (they stay in your spending), and money from selling the home or moving to a smaller one.",
          P.st === "Guess" ? "This is a Guess: it stands on ranges you tapped." : "",
        ])
    ) +
    cbWayNav(!!St.how || !P.applies) +
    cbFoot()
  );
}
Object.assign(ACT, {
  /* Count this, Already doing it, Not for me */
  cblaterdo: t => {
    if (!W || W.kind !== "cb") return;
    cbLaterDo(t.dataset.v);
    drawSheet();
  },
  /* one tap on a question of this way */
  cblaterset: t => {
    if (!W || W.kind !== "cb") return;
    cbLaterSet(t.dataset.k, +t.dataset.i);
    drawSheet();
  },
});
kitTerms({
  cblater: [
    "Money that shows up later",
    "What has to go right: the pension is paid as promised, from the age the plan says. The home loan is paid on schedule, and you stay in the home or move to one that costs no more. Property tax, insurance and repairs do not end with the loan: only the loan payment comes off. Backup if it doesn't: get the pension estimate in writing and check the payoff date on a loan statement. Or take this out again with one tap. What it is does not count on it.",
  ],
});
cbStepAdd("later", () => cbLaterView(), {
  title: "Money that shows up later",
  info: cbLaterInfo,
  set: cbLaterDo,
});
