/* ============================================================================
   SLAM the Game: features/couldbe.js
   PURPOSE     What it is / What it could be (run A, Nov 27 2026): the one opening of a new player.
               Four answers by taps (age, spending a month, invested, saved a month), then one number:
               the FI number the standard way ("What it is": 25 times a year of spending, and the age
               the investments reach it at today's pace). Two numbers stay pinned at the top of the
               flow: "What it is" and "What it could be". They start equal. The layer chart shows, for
               each age from today to 95, what the year costs and which layer pays for it: Work,
               Investments (or the four kinds of account), Social Security, Other. What no layer
               reaches is hatched: "Not covered yet". A player switches layers off, counts a cost or
               an income in the number, and sees the top number move.
   INPUT       The profile (c.age, c.take, c.spend, c.spends, c.invs, c.x.cb) and the numbers of
               derive(). The open sheet (W.kind cb): W.step (entry, is, chart, layer, a step that a
               later file adds, end), W.q (the question of the entry), W.id (the layer of the layer
               sheet), W.n (the first age of the 5 years that are open as single years), W.o (the
               answers of the entry before the profile exists, and the typed number).
   OUTPUT      Math: cbRng, cbRows, cbHas, cbState, cbHealth, cbParams, cbCounted, cbNumbers, cbChart,
               cbLayerInfo, cbCount, cbToggle, cbReceipt, cbTaps, cbBook. Views: cbTop, cbFoot, cbSheet,
               cbStepAdd (a later file adds a step), cbChartHtml. Parts of functions in other files:
               cbStart (doorBegin in door.js, ACT.start in ui.js, clFirstGame in cloud.js),
               finishSetupCb (finishSetupBase in ui.js), openSetupCb (openSetup in ui.js),
               drawSheetCb (drawSheetOnce in ui.js), planTabCb (planTab in planner.js). Actions (ACT):
               cb, cbset, cbknow, cbuse, cbgo, cbtog, cbsplit, cbzoom, cblayer, cbcount, cbrest, cbsteps.
   DEPENDS ON  core/report.js, core/paylayers.js (lyNumbers, lyYears, lyBars, lyNeedsAge, lyLayerSum,
               lyCoverage, lyReceipt, LY_LAYERS, LY_ACCOUNTS, LY_SPENDING, LY_END, LY_MEDICARE),
               core/engine.js (derive, newChar, passives, txSplit, syncAll, R, SWR, SPEND_K, SPLIT),
               core/benefitsplan.js (BP_REF, bpRules, bpBenchmark), core/metrics.js (knSt),
               account/trust.js (TRUST_LINE), screens/ui.js, screens/dash.js (dkBars, dkCard),
               features/kit.js (kitPill, kitInfo, kitTerms, kitMenu, kitScreen, kitValue),
               features/retire.js (retireTax, retireReady), features/look.js (lkK).
   RULES       A view shows what the math functions return. The four answers go to the rows that setup
               writes (c.incs, c.spends, c.invs) as a Guess; a typed amount is Exact. No verdict on a
               guess. The line of account/trust.js is on each screen of the flow, from cbFoot() only.
               "What it could be" changes only by what the player counted (c.x.cb.count); with nothing
               counted it equals "What it is". A cost that is counted can raise it, and the screen then
               says which cost. The rest of setup (the spiral rounds and the payoff reveal) stays, and
               the last screen and Next Steps open it.
   COMPAT      One new optional key on a profile: c.x.cb { a (the four answers), count, off, split,
               health, setup (true when the rest of setup is done) }. An old saved game has none.
   STATE       CB (the numbers that the header showed last, for the short animation; the flag of the
               rest of setup), CB_STEPS (the steps after the entry).
   ========================================================================= */
const CB = { last: null, rest: false, taps: 0 };
/* The steps after the entry, in order. A later file adds a step before "end" with cbStepAdd(). */
const CB_STEPS = [
  { id: "is", view: () => cbIsView() },
  { id: "chart", view: () => cbChartView() },
  { id: "end", view: () => cbEndView() },
];
/* The range chips of the four questions: [low, high]. The amount of a chip is the middle. A last chip with no
   high end counts as its low end times 1.5. */
const CB_RNG = {
  age: [
    [18, 24],
    [25, 29],
    [30, 34],
    [35, 39],
    [40, 44],
    [45, 49],
    [50, 54],
    [55, 59],
    [60, 64],
    [65, 69],
  ],
  spend: [
    [1000, 2000],
    [2000, 3000],
    [3000, 4000],
    [4000, 5000],
    [5000, 7000],
    [7000, 10000],
    [10000, null],
  ],
  inv: [
    [0, 0],
    [0, 10000],
    [10000, 50000],
    [50000, 100000],
    [100000, 250000],
    [250000, 500000],
    [500000, 1000000],
    [1000000, null],
  ],
  save: [
    [0, 0],
    [0, 250],
    [250, 500],
    [500, 1000],
    [1000, 2000],
    [2000, 4000],
    [4000, null],
  ],
  /* health insurance of your own, a month */
  health: [
    [0, 300],
    [300, 600],
    [600, 900],
    [900, 1300],
    [1300, null],
  ],
};
const CB_QS = [
  { id: "age", l: "How old are you?", h: "A range is fine.", zero: "" },
  {
    id: "spend",
    l: "About how much do you spend in a month?",
    h: "Everything that goes out: rent, food, bills, fun. A rough range is fine.",
    zero: "",
  },
  {
    id: "inv",
    l: "About how much do you have invested?",
    h: "Retirement accounts and other investments together. Not your checking or savings.",
    zero: "Nothing yet",
  },
  {
    id: "save",
    l: "About how much do you save or invest in a month?",
    h: "What is left after spending and goes into savings or investments.",
    zero: "Nothing right now",
  },
];
/* The colors of the layers and of the parts of the line (DESIGN.md tokens; a name goes with each color). */
const CB_COL = {
  work: "var(--muted)",
  inv: "var(--sap)",
  tax: "var(--sap)",
  pre: "var(--a3)",
  roth: "var(--gold)",
  hsa: "var(--a1)",
  ss: "var(--good)",
  other: "var(--n1)",
  needs: "var(--muted)",
  wants: "var(--line)",
  health: "var(--warn)",
  wtax: "var(--a3)",
};

/* ---------- THE MATH ---------- */
/* One range chip: { lo, hi, v (the amount it counts as), zero }. */
function cbRng(q, i) {
  const r = (CB_RNG[q] || [])[i];
  if (!r) return null;
  const hi = r[1] == null ? Math.round(r[0] * 2) : r[1];
  return {
    lo: r[0],
    hi,
    open: r[1] == null,
    zero: r[0] === 0 && r[1] === 0,
    v: r[1] == null ? r[0] * 1.5 : Math.round((r[0] + hi) / 2),
  };
}
/* The rows that setup writes, from the four answers. A chip is a Guess (s false); a typed amount is known. The one
   spending total is spread over the five groups by the stock split of the game, so the split stays a guess. */
function cbRows(a) {
  const ex = k => !!a[k] && a[k].cf === 3,
    spend = Math.max(1, Math.round(a.spend.v)),
    both = ex("spend") && ex("save");
  let left = spend;
  return {
    incs: [Object.assign({ k: "A main job", amt: spend + Math.round(a.save.v), s: both }, both ? { cf: 3 } : {})],
    spends: SPEND_K.map((k, i) => {
      const amt = i === SPEND_K.length - 1 ? left : Math.round((spend * SPLIT[i]) / 10) * 10;
      left -= amt;
      return Object.assign({ k, amt, s: ex("spend"), h: true }, ex("spend") ? { cf: 2 } : {});
    }),
    invs:
      a.inv.v > 0
        ? [
            Object.assign(
              { k: "Retirement plan at work", amt: Math.round(a.inv.v), s: ex("inv") },
              ex("inv") ? { cf: 3 } : {}
            ),
          ]
        : [],
  };
}
/* True when the profile has what the two numbers need, so the entry is passed over. */
function cbHas(c) {
  return !!(c && !G.demo && c.age > 0 && c.spend > 0 && c.take != null && c.inv != null);
}
/* The flow's own notes on the profile. */
function cbStore(c) {
  c.x = c.x || {};
  c.x.cb = c.x.cb || {};
  const s = c.x.cb;
  s.count = s.count || {};
  s.off = s.off || {};
  return s;
}
/* Guess, Close or Exact: from the rows the numbers stand on. */
function cbState(c) {
  return knSt(
    c.incs || [],
    c.spends || [],
    (c.invs || []).length ? c.invs : [{ s: !!(c.x && c.x.cb && c.x.cb.a && c.x.cb.a.inv.cf === 3), cf: 3 }]
  );
}
/* Health insurance of your own before 65, a year: the player's tap, or the typical plan as a Guess. The typical
   plan is the benchmark silver plan of the marketplace for a 40-year-old (KFF, plan year 2027), before any help
   with the price. */
function cbHealth(c) {
  const own = c.x && c.x.cb && c.x.cb.health,
    st = typeof kitValue === "function" ? kitValue(c, "taxv", "state", "").v : "",
    adults = c.rel === "Married" ? 2 : 1,
    typ =
      typeof bpBenchmark === "function" && typeof BP_REF !== "undefined"
        ? bpBenchmark({ state: st, adults }, bpRules(BP_REF))
        : null;
  return {
    year: own && own.v != null ? own.v * 12 : typ,
    typ: !(own && own.v != null),
    st: own && own.v != null ? (own.cf === 3 ? "Exact" : "Close") : "Guess",
    typical: typ,
    adults,
    until: LY_MEDICARE,
    source:
      "KFF, Marketplace Average Monthly Benchmark Premiums, plan year " +
      (typeof BP_REF !== "undefined" ? BP_REF.cliff.aca.planYear : "") +
      " (the second-lowest silver plan for a 40-year-old, before any help with the price), read Nov 6 2026",
  };
}
/* The profile as the plain numbers of core/paylayers.js. */
function cbParams(c, d) {
  d = d || derive(c);
  const s = (c.x && c.x.cb) || {},
    split = txSplit(c),
    sum = split.tax + split.pre + split.roth + split.hsa,
    bal = sum > 0 && Math.abs(sum - c.inv) < 1 ? split : { tax: 0, pre: Math.max(0, c.inv || 0), roth: 0, hsa: 0 },
    tot = bal.tax + bal.pre + bal.roth + bal.hsa,
    P = passives(c),
    rows = c.led ? c.spends || [] : [],
    g = k => rows.filter(r => r.k === k).reduce((t, r) => t + (r.amt || 0), 0),
    all = rows.reduce((t, r) => t + (r.amt || 0), 0),
    H = cbHealth(c),
    filing = c.rel === "Married" ? "joint" : "single",
    off = s.off || {};
  return {
    age: c.age,
    end: LY_END,
    spend: d.fiSpend,
    /* the FAT split: food, accommodation, transportation are the needs */
    needsShare: all > 0 ? (g("Home") + g("Food") + g("Getting around")) / all : SPLIT[0] + SPLIT[1] + SPLIT[2],
    workPay: (c.take || 0) * 12,
    save: d.save,
    bal,
    saveTo: tot > 0 ? { tax: bal.tax / tot, pre: bal.pre / tot, roth: bal.roth / tot, hsa: bal.hsa / tot } : { pre: 1 },
    preShare: tot > 0 ? bal.pre / tot : 1,
    grow: R,
    draw: SWR,
    ss: P.full > 0 ? { year: P.full * 12 * (c.x && c.x.ss != null ? c.x.ss : 1), age: 67, full: P.full * 12 } : null,
    other: [].concat(
      P.now > 0 ? [{ year: P.now * 12, from: c.age }] : [],
      P.pen ? [{ year: P.pen.amt * 12, from: P.pen.age }] : []
    ),
    health: H.year > 0 ? { year: H.year, until: H.until } : null,
    tax: typeof retireReady === "function" && retireReady() ? w => cbTaxOn(w, filing, c.age) : null,
    off: {
      work: !!off.work,
      tax: !!off.tax,
      pre: !!off.pre,
      roth: !!off.roth,
      hsa: !!off.hsa,
      ss: !!off.ss,
      other: !!off.other,
    },
  };
}
/* The income tax of a year on money taken out of traditional accounts: the game's tax engine (retireTax), federal
   and state, with nothing else in the year's income. */
function cbTaxOn(w, filing, age) {
  if (!(w > 0)) return 0;
  const T = retireTax(w, 0, filing, "", age);
  return (T.federal || 0) + (T.state || 0);
}
/* What the player counted in "What it could be". */
function cbCounted(c) {
  return (c.x && c.x.cb && c.x.cb.count) || {};
}
/* THE TWO NUMBERS: { is, could, counted, raisedBy, st, same, above }. Targets also as round thousands (shown). */
function cbNumbers(c, d) {
  const N = lyNumbers(cbParams(c, d), cbCounted(c)),
    k = v => (v == null ? null : Math.round(v / 1000) * 1000);
  N.is.shown = k(N.is.target);
  N.could.shown = k(N.could.target);
  N.st = cbState(c);
  N.same = N.is.shown === N.could.shown && N.is.age === N.could.age;
  N.above = N.could.target > N.is.target + 0.5;
  return N;
}
/* THE CHART: the two numbers, the year-by-year rows, the bars, the single years of an open bar, what each layer
   and each part of the line does, the first age the needs are met by steady income, and the gaps. */
function cbChart(c, zoom) {
  const d = derive(c),
    p = cbParams(c, d),
    cnt = cbCounted(c),
    N = cbNumbers(c, d),
    s = (c.x && c.x.cb) || {};
  p.stop = N.could.age != null ? N.could.age : N.is.age;
  if (cnt.shape && cnt.shape.bands) p.shape = cnt.shape.bands;
  if (cnt.ss && cnt.ss.share != null && p.ss) p.ss = Object.assign({}, p.ss, { year: p.ss.full * cnt.ss.share });
  const rows = lyYears(p),
    bars = lyBars(rows, 5),
    ids = ["work", "tax", "pre", "roth", "hsa", "inv", "ss", "other", "needs", "wants", "health", "wtax"],
    sums = {};
  ids.forEach(id => {
    const S = lyLayerSum(rows, id);
    S.avg = S.years ? S.total / S.years : 0;
    sums[id] = S;
  });
  /* the gaps, as runs of years: [{ from, to, avg }] */
  const gaps = [];
  rows.forEach(r => {
    const last = gaps[gaps.length - 1];
    if (!(r.gap > 0)) return;
    if (last && last.to === r.age - 1) {
      last.to = r.age;
      last.total += r.gap;
    } else gaps.push({ from: r.age, to: r.age, total: r.gap });
  });
  gaps.forEach(g2 => {
    g2.avg = g2.total / (g2.to - g2.from + 1);
  });
  const layers = (s.split ? ["work", "tax", "pre", "roth", "hsa", "ss", "other"] : ["work", "inv", "ss", "other"]).map(
    id => {
      const def = LY_LAYERS.find(l => l.id === id) || LY_ACCOUNTS.find(l => l.id === id),
        isOff = id === "inv" ? p.off.tax && p.off.pre && p.off.roth && p.off.hsa : !!p.off[id];
      return { id, name: def.name, what: def.what, off: isOff, sum: sums[id], color: CB_COL[id] };
    }
  );
  return {
    p,
    N,
    rows,
    bars,
    layers,
    sums,
    gaps,
    split: !!s.split,
    needsAge: lyNeedsAge(rows),
    cover: lyCoverage(rows),
    max: Math.max.apply(
      null,
      rows.map(r => r.line)
    ),
    zoom: zoom != null ? rows.filter(r => r.age >= zoom && r.age < zoom + 5) : null,
    health: cbHealth(c),
  };
}
/* One layer or one part of the line, for its sheet: the name, what it is, the years it pays for, which expenses
   it covers, and the lines of Show the math. */
function cbLayerInfo(c, id) {
  const K = cbChart(c),
    def = LY_LAYERS.concat(LY_ACCOUNTS, LY_SPENDING).find(l => l.id === id),
    S = K.sums[id],
    p = K.p,
    M = v => money(Math.round(v)),
    needsYear = K.rows.length ? K.rows[0].needs : 0;
  let covers = "",
    math = [];
  if (id === "work") {
    covers = "Everything you spend, while you work.";
    math = [
      "Take-home pay from work: " + M(p.workPay) + " a year.",
      "It pays the year's spending first. What is left is what you save: " +
        M(p.save) +
        " a year goes into your investments.",
      p.stop != null
        ? "The chart stops work at " + p.stop + ", the age of What it could be."
        : "At this pace the investments do not reach the number yet, so work stays on the chart.",
    ];
  } else if (id === "ss") {
    covers = "Needs first: food, a place to live, getting around. What is left after the needs goes to wants.";
    math = [
      p.ss
        ? "The estimate: " +
          M(p.ss.year / 12) +
          " a month from age " +
          p.ss.age +
          ", from your pay today and the years you work (the game's own estimate, the bend points of " +
          SS_YEAR +
          ")."
        : "No estimate yet: it needs your pay from work.",
      "Your needs: " + M(needsYear) + " a year. Social Security is matched to them first.",
      "This is a Guess until you put in the figure from your own Social Security statement.",
    ];
  } else if (id === "other") {
    covers = "Needs first, like Social Security. What is left goes to wants.";
    math = p.other.length
      ? p.other.map(o => M(o.year) + " a year from age " + o.from + ".")
      : [
          "Nothing here yet. A pension, rent you collect or retirement income you already get shows here once you add it.",
        ];
  } else if (id === "inv" || ["tax", "pre", "roth", "hsa"].includes(id)) {
    covers =
      id === "hsa"
        ? "Health insurance before 65 first. Then whatever the other accounts do not reach."
        : "What steady income does not reach: your wants, and your needs in the years before Social Security starts.";
    math = [
      "Today: " + M(id === "inv" ? p.bal.tax + p.bal.pre + p.bal.roth + p.bal.hsa : p.bal[id]) + ".",
      "While you work it grows " +
        Math.round(p.grow * 100) +
        "% a year and your saving goes in. After work stops, what is left grows " +
        Math.round(p.draw * 100) +
        "% a year after prices, the same rate as the 25 times rule.",
      "The order money comes out: taxable, then traditional, then Roth. The HSA pays health insurance first.",
      "Until you list your accounts, the game counts all of it as a traditional plan at work.",
    ];
  } else if (id === "health") {
    covers = "A plan of your own, from the year work stops until Medicare starts at " + LY_MEDICARE + ".";
    math = [
      K.health.year != null
        ? M(K.health.year / 12) +
          " a month, " +
          M(K.health.year) +
          " a year" +
          (K.health.typ ? " (typical, a Guess)." : " (your number).")
        : "Needs your number.",
      "Source of the typical price: " + K.health.source + ".",
      "Your own price can be lower with help from the marketplace, and it rises with age.",
      "The 25 times rule does not have this cost. Counting it can raise the number.",
    ];
  } else if (id === "wtax") {
    covers = "Income tax on the money you take out of a traditional 401(k) or IRA.";
    math = [
      "Each year: the federal tax on the traditional money taken out that year, with the " +
        (c.rel === "Married" ? "joint" : "single") +
        " standard deduction (the game's tax engine, 2026 tables).",
      "No state tax, no tax on Social Security and no early-withdrawal charge are counted here.",
      "The 25 times rule does not have this cost. Counting it can raise the number.",
    ];
  } else if (id === "needs") {
    covers = "Food, a place to live, getting around.";
    math = [
      "Home, food and getting around are " +
        Math.round(p.needsShare * 100) +
        "% of your spending: " +
        M(needsYear) +
        " a year.",
    ];
  } else {
    covers = "Everything else you spend on.";
    math = ["Spending less the needs: " + M(K.rows.length ? K.rows[0].wants : 0) + " a year."];
  }
  return { id, name: def.name, what: def.what, cost: !!def.cost, steady: !!def.steady, sum: S, covers, math, K };
}
/* The receipt of a change of the two numbers: { off (dollars off the target), months (sooner) }. */
function cbReceipt(before, after) {
  return lyReceipt(before.could, after.could);
}
/* COUNT one thing in "What it could be", or take it out again. id: ss, other, shape, health, wtax (a later file can
   count more: core/paylayers.js lyCounted reads the keys). opts: what the count holds ({ share } for ss, { bands } for
   shape); false takes it out. Returns { before, after, receipt }. */
function cbCount(id, opts) {
  const c = C(),
    s = cbStore(c),
    before = cbNumbers(c);
  if (opts === false) delete s.count[id];
  else s.count[id] = opts && typeof opts === "object" ? opts : {};
  save();
  const after = cbNumbers(c);
  return { before, after, receipt: cbReceipt(before, after) };
}
/* Switch a layer off or on. A layer that is off is not counted in the number. id: work, inv (the four accounts),
   tax, pre, roth, hsa, ss, other. */
function cbToggle(id) {
  const c = C(),
    s = cbStore(c),
    ids = id === "inv" ? ["tax", "pre", "roth", "hsa"] : [id],
    on = ids.some(k => !s.off[k]);
  ids.forEach(k => {
    if (on) s.off[k] = true;
    else delete s.off[k];
  });
  save();
  return !on;
}
/* The taps of the entry so far, with the tap on Start (for the count "5 taps or fewer to the first number"). */
function cbTaps() {
  return CB.taps;
}
/* The spreadsheet of the plan (book.js): the standard number. */
function cbBook(c) {
  const d = derive(c),
    N = lyNumbers(cbParams(c, d), {});
  return {
    title: "What it is: the FI number the standard way",
    rows: [
      { id: "cb_spend", label: "Spending a year", v: d.fiSpend },
      { id: "cb_rate", label: "The withdrawal rate", v: SWR },
      {
        id: "cb_is",
        label: "What it is: spending a year divided by the rate (25 times)",
        v: N.is.target,
        f: "={cb_spend}/{cb_rate}",
      },
    ],
  };
}

/* ---------- THE VIEWS ---------- */
const cbM = v => money(Math.round(v));
/* The label of a range chip, from the one money formatter. */
function cbLab(q, i) {
  const r = cbRng(q, i),
    f = q === "age" ? String : lkK;
  if (r.zero) return (CB_QS.find(x => x.id === q) || {}).zero || "Nothing";
  if (q === "age") return i === 0 ? "Under " + (r.hi + 1) : r.lo + " to " + r.hi;
  if (r.open) return f(r.lo) + " or more";
  return r.lo === 0 || (i === 0 && q === "spend") ? "Under " + f(r.hi) : f(r.lo) + " to " + f(r.hi);
}
/* The one line of account/trust.js, for each screen of the flow. */
function cbFoot() {
  return `<div class="tiny muted cbfoot" data-fid="cb:trust">${esc(typeof TRUST_LINE === "string" ? TRUST_LINE : "")}</div>`;
}
/* The two numbers, pinned at the top of each screen of the flow. */
function cbTop(c) {
  const N = cbNumbers(c),
    age = x => (x.age == null ? "not at this pace yet" : x.years === 0 ? "now" : "at age " + x.age),
    cell = (k, label, x) =>
      `<div class="cbnum ${k}"><span class="dklabel">${label}</span><b class="dknum" data-cbn="${k}" data-to="${x.shown == null ? "" : x.shown}">${x.shown == null ? "No number yet" : cbM(x.shown)}</b><span class="tiny" data-cba="${k}">${esc(age(x))}</span></div>`;
  return (
    `<div class="cbtop" data-fid="cb:top">${cell("is", "What it is", N.is)}${cell("could", "What it could be", N.could)}</div>` +
    `<div class="row between cbtopsub"><span class="tiny muted">${N.same ? "The two are equal until you count something." : N.above ? "Above What it is, because you counted " + N.raisedBy.map(k => LY_SPENDING.find(s => s.id === k).name.toLowerCase()).join(" and ") + "." : "What you counted moved it."}</span>${kitPill(N.st)}</div>`
  );
}
/* Part of drawSheetOnce() in ui.js. After the sheet is drawn: the short animation of a top number that changed.
   No animation when the player asked for less motion. */
function drawSheetCb() {
  try {
    if (!W || W.kind !== "cb" || typeof document === "undefined" || !document.querySelectorAll) return;
    const els = document.querySelectorAll("#ov [data-cbn]"),
      now = {},
      was = CB.last || {};
    if (!els || !els.length) return;
    const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    Array.prototype.forEach.call(els, el => {
      const k = el.dataset.cbn,
        to = +el.dataset.to;
      now[k] = to;
      if (calm || !el.dataset.to || was[k] == null || was[k] === to || typeof requestAnimationFrame !== "function")
        return;
      const t0 = Date.now(),
        from = was[k];
      el.classList.add("cbmove");
      const step = () => {
        const u = Math.min(1, (Date.now() - t0) / 600);
        el.textContent = cbM(Math.round((from + (to - from) * u) / 1000) * 1000);
        if (u < 1) requestAnimationFrame(step);
        else el.classList.remove("cbmove");
      };
      requestAnimationFrame(step);
    });
    CB.last = now;
  } catch (e) {
    report(e, "couldbe.js: drawSheetCb");
  }
}
/* The chips of one question, with "I know it" and its number box in the same spot. */
function cbChips(w, q, cur) {
  const open = w.know === q;
  return (
    `<div class="chips">${CB_RNG[q].map((r, i) => `<button class="chip ${cur && cur.cf !== 3 && cur.i === i ? "on" : ""}" data-a="cbset" data-q="${q}" data-i="${i}">${esc(cbLab(q, i))}</button>`).join("")}<button class="chip know ${open || (cur && cur.cf === 3) ? "on" : ""}" data-a="cbknow" data-q="${q}">I know it</button></div>` +
    (open
      ? `<div class="amknow row" style="gap:8px;align-items:flex-end"><div class="field" style="flex:1;margin:0"><label class="small" for="cbIn">${q === "age" ? "Your age" : "The amount, in dollars"}</label><input type="text" id="cbIn" inputmode="decimal" data-k="cbIn" value="${esc(w.o.cbIn != null ? w.o.cbIn : cur && cur.cf === 3 ? String(cur.v) : "")}" autocomplete="off"></div><button class="primary" data-a="cbuse" data-q="${q}">Use this</button></div>${w.err ? `<div class="tiny cbwarn">That needs a number, 0 or more.</div>` : ""}`
      : "")
  );
}
/* THE ENTRY: one question at a time, four in all. */
function cbEntryView() {
  const w = W,
    i = Math.max(0, Math.min(CB_QS.length - 1, w.q || 0)),
    Q = CB_QS[i],
    a = (w.o.a = w.o.a || {});
  return (
    head("Question " + (i + 1) + " of " + CB_QS.length, "Your FI number") +
    `<div class="small muted">Four taps, then your number. No typing needed.</div>` +
    `<div class="cbdots" aria-hidden="true">${CB_QS.map((x, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("")}</div>` +
    `<div class="stack cbq" style="gap:8px"><b class="cbql" data-fid="cb:q">${esc(Q.l)}</b>${cbChips(w, Q.id, a[Q.id])}<div class="tiny muted">${esc(Q.h)}</div></div>` +
    (i > 0
      ? `<div class="row"><button class="ghost" data-a="cbgo" data-v="qback">Back one question</button></div>`
      : "") +
    cbFoot()
  );
}
/* "WHAT IT IS": the standard number and its age. */
function cbIsView() {
  const c = C(),
    d = derive(c),
    N = cbNumbers(c, d),
    made = !!(c.x && c.x.cb && c.x.cb.a && !c.x.cb.setup);
  return (
    head("Your number", "What it is") +
    cbTop(c) +
    `<div class="small">This is your FI number the standard way: enough invested that work is optional. It is 25 times what you spend in a year. ${kitInfo("cbfi")}</div>` +
    `<div class="tile small"><b>${N.is.age == null ? "At today's pace the date is still open" : N.is.years === 0 ? "You are there now" : "At today's pace: age " + N.is.age}</b><div class="tiny muted">${N.is.age == null ? "The saving each month does not reach it yet. The next screens show what can move it." : "What you have invested grows, and what you save each month goes in."}</div></div>` +
    mathBox([
      "Spending: " + cbM(d.fiSpend / 12) + " a month, " + cbM(d.fiSpend) + " a year.",
      "What it is: " +
        cbM(d.fiSpend) +
        " x 25 = " +
        cbM(N.is.target) +
        " (the 4% rule: a year of spending divided by 0.04).",
      "The age: " +
        cbM(c.inv || 0) +
        " invested today grows " +
        Math.round(R * 100) +
        "% a year and " +
        cbM(d.save) +
        " a year goes in, until it reaches the number.",
      N.st === "Guess"
        ? "This is a Guess: it stands on the ranges you tapped. Each real number you add recalculates it."
        : "",
    ]) +
    `<button class="primary wide go" data-a="cbgo" data-v="next">See what it could be</button>` +
    (made ? `<button class="ghost wide" data-a="cbgo" data-v="entry">Change my four answers</button>` : "") +
    cbFoot()
  );
}
/* The chart of the layers, from the kit (dkBars with the stacked option). K: cbChart(). */
function cbChartHtml(K) {
  const on = K.layers.filter(l => !l.off),
    ids = on.map(l => (l.id === "inv" ? "inv" : l.id)),
    val = (r, id) =>
      id === "inv" ? ["tax", "pre", "roth", "hsa"].filter(k => !K.p.off[k]).reduce((t, k) => t + r[k], 0) : r[id],
    zoom = K.zoom,
    src = zoom || K.bars,
    top = Math.max.apply(
      null,
      src.map(r => r.gap)
    ),
    /* 5 years a bar: the bars are narrow, so only the widest gap has its dollars on the chart (the line under the
       chart has them all). Single years: each gap has its dollars. */
    topAt = src.findIndex(r => r.gap > 0 && r.gap === top),
    groups = src.map(r => ({
      l: zoom ? String(r.age) : String(r.from),
      v: ids.map(id => val(r, id)),
      acts: ids,
      gap: r.gap,
      gapL: r.gap > 0 && (zoom || src.indexOf(r) === topAt) ? lkK(r.gap) : "",
      line: r.line,
      mark: r.needs + r.health,
      side: [r.needs, r.wants, r.health, r.wtax],
      act: zoom ? null : "cbzoom",
      av: zoom ? null : r.from,
      al: zoom ? null : "Ages " + r.from + " to " + r.to + ": open the single years",
    }));
  return dkBars(
    groups,
    on.map(l => l.name),
    {
      stack: true,
      colors: on.map(l => l.color),
      sideColors: [CB_COL.needs, CB_COL.wants, CB_COL.health, CB_COL.wtax],
      partAct: zoom ? "cblayer" : null,
      h: 190,
      top: "Up to " + lkK(K.max) + " a year",
      label: "What pays for each year, from age " + K.p.age + " to " + LY_END,
    }
  );
}
/* THE LAYER CHART. */
function cbChartView() {
  const c = C(),
    K = cbChart(c, W.n != null ? +W.n : null),
    zoom = K.zoom,
    cnt = cbCounted(c),
    sq = col => `<i class="cbsq" style="background:${col}"></i>`,
    chips = K.layers
      .map(
        l =>
          `<div class="cblay"><button class="chip cbchip ${l.off ? "" : "on"}" data-a="cbtog" data-v="${l.id}" aria-pressed="${l.off ? "false" : "true"}">${sq(l.color)}<span>${esc(l.name)}</span><span class="tiny cbonoff">${l.off ? "Off" : "On"}</span></button><button class="ghost slim cbview" data-a="cblayer" data-v="${l.id}" aria-label="${esc(l.name)}: what it is">View ›</button></div>`
      )
      .join(""),
    gapLine = K.gaps.length
      ? `<div class="banner small cbgaps" data-fid="cb:gaps"><b>Not covered yet</b> ${K.gaps
          .slice(0, 3)
          .map(
            g =>
              (g.from === g.to ? "age " + g.from : "ages " + g.from + " to " + g.to) +
              ": about " +
              cbM(g.avg) +
              " a year"
          )
          .join(
            "; "
          )}${K.gaps.length > 3 ? "; and later years" : ""}. Switch a layer back on, or see what the next steps can cover.</div>`
      : `<div class="tiny muted" data-fid="cb:gaps">Every year to ${LY_END} is covered with these layers.</div>`,
    needsLine =
      K.needsAge != null
        ? `<div class="banner small cbneeds" data-fid="cb:needs">From ${K.needsAge}, your needs are covered without touching investments.</div>`
        : "",
    costRow = (id, S, extra) =>
      `<div class="cbcost"><button class="rowbtn" data-a="cblayer" data-v="${id}"><span>${sq(CB_COL[id])}<b>${esc(LY_SPENDING.find(x => x.id === id).name)}</b><div class="tiny muted">${extra}</div></span><span class="caret">›</span></button>${
        LY_SPENDING.find(x => x.id === id).cost
          ? `<button class="${cnt[id] ? "chip on" : "chip"} cbcnt" data-a="cbcount" data-v="${id}" aria-pressed="${cnt[id] ? "true" : "false"}">${cnt[id] ? "Counted in the number" : "Count this in the number"}</button>`
          : ""
      }</div>`,
    span = S => (S.years ? (S.from === S.to ? "age " + S.from : "ages " + S.from + " to " + S.to) : "");
  return (
    head("The chart", "What pays for each year") +
    cbTop(c) +
    dkCard(
      zoom
        ? "Ages " + zoom[0].age + " to " + zoom[zoom.length - 1].age + ", year by year"
        : "From " + K.p.age + " to " + LY_END + ", 5 years a bar",
      (zoom
        ? `<div class="row between cbzrow"><button class="ghost" data-a="cbzoom" data-v="">‹ Back to all years</button><span class="row" style="gap:6px"><button class="ghost slim" data-a="cbzoom" data-v="${zoom[0].age - 5}" ${zoom[0].age - 5 < K.p.age ? "disabled" : ""} aria-label="The 5 years before">‹ Earlier</button><button class="ghost slim" data-a="cbzoom" data-v="${zoom[0].age + 5}" ${zoom[0].age + 5 > LY_END ? "disabled" : ""} aria-label="The 5 years after">Later ›</button></span></div>`
        : "") +
        cbChartHtml(K) +
        `<div class="cbkey tiny muted"><span><i class="cbln"></i>The line: what the year costs</span><span><i class="cbln dash"></i>Needs</span><span><i class="cbsq hatch"></i>Not covered yet</span></div>` +
        `<div class="cbkey tiny muted">The thin strip beside each bar is what the year costs, from the bottom: ${["needs", "wants", "health", "wtax"].map(id => `<span>${sq(CB_COL[id])}${esc(LY_SPENDING.find(x => x.id === id).name)}</span>`).join("")}</div>` +
        (zoom
          ? `<div class="tiny muted">Tap a color in a bar to see that layer.</div>`
          : `<button class="ghost wide" data-a="cbzoom" data-v="${K.N.could.age != null ? K.bars.find(b => b.to >= K.N.could.age).from : K.p.age}">See single years</button><div class="tiny muted">Or tap a bar to open its 5 years.</div>`),
      { cap: "Each bar is one stretch of your life. The colors are what pays for it." }
    ) +
    gapLine +
    needsLine +
    `<div class="stack" style="gap:6px"><b class="small">The layers: tap one to switch it off or on</b><div class="cblays">${chips}</div><button class="ghost wide" data-a="cbsplit" aria-pressed="${K.split ? "true" : "false"}">${K.split ? "Show Investments as one layer" : "Split by account"}</button></div>` +
    dkCard(
      "What a year costs",
      `<div class="stack" style="gap:6px">${costRow("needs", K.sums.needs, cbM(K.rows[0].needs) + " a year: food, a place to live, getting around")}${costRow("wants", K.sums.wants, cbM(K.rows[0].wants) + " a year: everything else")}${costRow(
        "health",
        K.sums.health,
        K.sums.health.years
          ? cbM(K.sums.health.avg) + " a year, " + span(K.sums.health) + (K.health.typ ? ". Typical, a Guess" : "")
          : K.p.stop != null && K.p.stop >= LY_MEDICARE
            ? "None on this chart: work goes on to " + LY_MEDICARE + " or later"
            : "Not on the chart yet"
      )}${costRow("wtax", K.sums.wtax, K.sums.wtax.years ? "About " + cbM(K.sums.wtax.avg) + " a year, " + span(K.sums.wtax) : K.p.tax ? "None on this chart" : "Not worked out here")}<div class="tiny muted">The 25 times rule leaves the last two out. They are on the chart. Count one and the number can go up.</div></div>`
    ) +
    mathBox([
      "Each year: steady income (Social Security, other) pays first and is matched to your needs. Then work. Then your investments.",
      "What it could be: what must be invested the day work stops, so that it pays each year's cost less the steady income you counted, to " +
        LY_END +
        " and beyond. With nothing counted it is the 25 times number.",
      "Investments grow " +
        Math.round(K.p.grow * 100) +
        "% a year while you work and " +
        Math.round(K.p.draw * 100) +
        "% a year after prices once you draw on them.",
      "All amounts are in today's dollars.",
    ]) +
    `<button class="primary wide go" data-a="cbgo" data-v="next">Next</button>` +
    cbFoot()
  );
}
/* ONE LAYER, or one part of the line: what it is, the years it pays for, which expenses it covers, Show the math. */
function cbLayerView() {
  const c = C(),
    L = cbLayerInfo(c, W.id),
    S = L.sum,
    cnt = cbCounted(c),
    s = (c.x && c.x.cb) || {},
    off = L.id === "inv" ? ["tax", "pre", "roth", "hsa"].every(k => (s.off || {})[k]) : !!(s.off || {})[L.id],
    isLayer = !["needs", "wants", "health", "wtax"].includes(L.id),
    canCount = L.id === "ss" || L.id === "other" || L.cost,
    cur = s.health ? { cf: s.health.cf, i: s.health.i, v: s.health.v } : null;
  return (
    head(isLayer ? "A layer" : "A part of what a year costs", esc(L.name)) +
    cbTop(c) +
    `<div class="tile small"><b>What it is</b><div>${esc(L.what)}</div></div>` +
    `<div class="tile small"><b>${isLayer ? "The years it pays for" : "The years it is there"}</b><div data-fid="cb:years">${
      S && S.years
        ? (S.from === S.to ? "Age " + S.from : "Ages " + S.from + " to " + S.to) +
          ": " +
          S.years +
          (S.years === 1 ? " year" : " years") +
          ", about " +
          cbM(S.avg) +
          " a year"
        : off
          ? "It is switched off."
          : "None on this chart yet."
    }</div></div>` +
    `<div class="tile small"><b>${isLayer ? "Which expenses it covers" : "What it is for"}</b><div>${esc(L.covers)}</div></div>` +
    (L.id === "health"
      ? `<div class="stack" style="gap:6px"><b class="small">What would a plan of your own cost a month?</b>${cbChips(W, "health", cur)}<div class="tiny muted">${L.K.health.typ && L.K.health.typical != null ? "Until you tap, the chart uses " + cbM(L.K.health.typical / 12) + " a month: typical, a Guess." : "Your number is on the chart."}</div></div>`
      : "") +
    mathBox(L.math) +
    (canCount
      ? `<button class="${cnt[L.id] ? "ghost" : "primary go"} wide" data-a="cbcount" data-v="${L.id}">${cnt[L.id] ? "Take it out of What it could be" : "Count this in What it could be"}</button>`
      : "") +
    (isLayer
      ? `<button class="ghost wide" data-a="cbtog" data-v="${L.id}">${off ? "Switch this layer on" : "Switch this layer off"}</button>`
      : "") +
    `<button class="${canCount && !cnt[L.id] ? "ghost" : "primary"} wide" data-a="cbgo" data-v="chart">Back to the chart</button>` +
    cbFoot()
  );
}
/* THE LAST SCREEN: both numbers, and the ways on. No dead end. */
function cbEndView() {
  const c = C(),
    done = !!(c.x && c.x.cb && c.x.cb.setup) || !(c.x && c.x.cb && c.x.cb.a);
  return (
    head("Where this leaves you", "Your two numbers") +
    cbTop(c) +
    `<div class="small">More ways to shrink it are coming.</div>` +
    `<button class="ghost wide" data-a="cbgo" data-v="chart">See the chart again</button>` +
    (done
      ? ""
      : `<button class="primary wide go" data-a="cbrest">Finish setup: five short rounds</button><div class="tiny muted">Debts, what you have, income, taxes, spending. It turns the guesses into your real picture.</div>`) +
    `<button class="${done ? "primary go" : "ghost"} wide" data-a="cbsteps">Go to Next Steps</button>` +
    `<button class="ghost wide" data-a="gohome">Home</button>` +
    cbFoot()
  );
}
/* THE SHEET of the flow. */
function cbSheet() {
  const w = W;
  if (w.step === "entry") return cbEntryView();
  if (w.step === "layer") return cbLayerView();
  const st = CB_STEPS.find(s => s.id === w.step) || CB_STEPS[0];
  return st.view();
}
/* A later file adds a step of the flow: cbStepAdd("shape", view) puts it before the last screen. view() returns
   the HTML of the sheet; it starts with head() and cbTop(C()) and ends with cbFoot(). */
function cbStepAdd(id, view) {
  if (CB_STEPS.some(s => s.id === id)) return;
  CB_STEPS.splice(CB_STEPS.length - 1, 0, { id, view });
}
/* Open the flow: the entry for a new player, else "What it is". */
function cbOpen(step) {
  const has = cbHas(C());
  W = { kind: "cb", step: has ? step || "is" : "entry", q: 0, o: {} };
  if (!has) CB.taps = 0;
  CB.last = null;
  sheet(cbSheet);
}
/* Part of doorBegin() in door.js, of ACT.start in ui.js and of clFirstGame() in cloud.js. A new player (the
   sample game) starts with this flow in place of the setup rounds. Returns true when it opened. */
function cbStart() {
  try {
    if (!G.demo) return false;
    cbOpen();
    CB.taps = 1; /* the tap on Start */
    return true;
  } catch (e) {
    report(e, "couldbe.js: cbStart");
    return false;
  }
}
/* The four answers are in: make the profile the way setup makes it (finishSetup), or change the rows of a profile
   that this flow made. */
function cbMake(a) {
  const rows = cbRows(a);
  if (cbHas(C())) {
    const c = C(),
      s = cbStore(c);
    s.a = a;
    c.age = Math.round(a.age.v);
    Object.assign(c, rows);
    c.accts = (c.accts || [])
      .filter(k => k !== "Retirement plan at work")
      .concat(rows.invs.length ? ["Retirement plan at work"] : []);
    syncAll(c);
    save();
    render();
    return;
  }
  const base = newChar(
    Object.assign(
      {
        age: Math.round(a.age.v),
        incKinds: ["A main job"],
        accts: ["Checking"].concat(rows.invs.length ? ["Retirement plan at work"] : []),
        invest: a.save.v > 0 ? "Every month" : "No",
      },
      rows
    )
  );
  base.x = { cb: { a, count: {}, off: {} } };
  W = { kind: "setup", mode: "new", step: 0, o: base, cbMade: true };
  finishSetup();
}
/* Part of finishSetupBase() in ui.js, for a new profile. A profile that this flow made goes on in the flow, at
   "What it is", in place of the payoff reveal. After the rest of setup, it notes that setup is done. */
function finishSetupCb(w, o) {
  try {
    if (w && w.cbRest && o && o.x && o.x.cb) {
      o.x.cb.setup = true;
      save();
    }
    if (!w || !w.cbMade) return false;
    if (typeof doorKept === "function") doorKept(); /* door.js: the visitor now has a game on this device */
    W = { kind: "cb", step: "is", o: {} };
    CB.last = null;
    sheet(cbSheet);
    return true;
  } catch (e) {
    report(e, "couldbe.js: finishSetupCb");
    return false;
  }
}
/* Part of openSetup() in ui.js. The rest of setup, opened from this flow, keeps the four answers: the age, the
   rows and the notes of the flow go into the new answers. */
function openSetupCb(base, mode) {
  try {
    if (!CB.rest || mode !== "new" || G.demo) return;
    CB.rest = false;
    const c = C();
    base.age = c.age;
    base.ageDec = Object.keys(DECADES).find(k => c.age >= DECADES[k][0] && c.age <= DECADES[k][1]) || "70s and up";
    base.incs = clone(c.incs || []);
    base.spends = clone(c.spends || []);
    base.invs = clone(c.invs || []);
    base.accts = (c.invs || []).map(r => r.k).filter((k, i, a) => a.indexOf(k) === i);
    base.invest = c.invest;
    base.x = clone(c.x || {});
  } catch (e) {
    report(e, "couldbe.js: openSetupCb");
  }
}
/* Part of planTab() in planner.js. Next Steps has the way back to the two numbers, and to the rest of setup while
   it is not done. */
function planTabCb(h) {
  try {
    const c = C();
    if (G.demo || !c.x || !c.x.cb || !c.x.cb.a) return h;
    const row =
      `<div class="stack cbplan" style="gap:6px">` +
      (c.x.cb.setup
        ? ""
        : `<button class="rowbtn" data-a="cbrest"><span><b>Finish setup: five short rounds</b><div class="tiny muted">Debts, what you have, income, taxes, spending. It turns the guesses into your real picture.</div></span><span class="caret">›</span></button>`) +
      `<button class="rowbtn" data-a="cb"><span><b>What it is / What it could be</b><div class="tiny muted">Your FI number, and the chart of what pays for each year.</div></span><span class="caret">›</span></button></div>`;
    return h.indexOf("<!--moveshere-->") >= 0 ? h.replace("<!--moveshere-->", () => row + "<!--moveshere-->") : h;
  } catch (e) {
    report(e, "couldbe.js: planTabCb");
    return h;
  }
}
/* One answer of the entry (or the health price of the layer sheet) is in. */
function cbAnswer(q, ans) {
  const w = W;
  w.know = null;
  w.err = false;
  delete w.o.cbIn;
  if (q === "health") {
    const c = C();
    cbStore(c).health = ans;
    save();
    drawSheet();
    return;
  }
  w.o.a = w.o.a || {};
  w.o.a[q] = ans;
  CB.taps++;
  const i = CB_QS.findIndex(x => x.id === q);
  if (i < CB_QS.length - 1) {
    w.q = i + 1;
    drawSheet();
    return;
  }
  if (CB_QS.some(x => !w.o.a[x.id])) {
    w.q = CB_QS.findIndex(x => !w.o.a[x.id]);
    drawSheet();
    return;
  }
  const a = w.o.a,
    had = cbHas(C());
  cbMake(a);
  if (had) {
    W = { kind: "cb", step: "is", o: {} };
    sheet(cbSheet);
  }
}
Object.assign(ACT, {
  cb: () => cbOpen(),
  cbset: t => {
    const q = t.dataset.q,
      i = +t.dataset.i,
      r = cbRng(q, i);
    if (!W || W.kind !== "cb" || !r) return;
    cbAnswer(q, { v: r.v, i, cf: 1, rg: [r.lo, r.hi] });
  },
  cbknow: t => {
    if (!W || W.kind !== "cb") return;
    W.know = W.know === t.dataset.q ? null : t.dataset.q;
    W.err = false;
    delete W.o.cbIn;
    drawSheet();
    if (typeof document !== "undefined" && document.getElementById)
      setTimeout(() => {
        const el = document.getElementById("cbIn");
        if (el && el.focus) el.focus();
      }, 0);
  },
  cbuse: t => {
    if (!W || W.kind !== "cb") return;
    const q = t.dataset.q,
      n = parseFloat(String(W.o.cbIn == null ? "" : W.o.cbIn).replace(/[$,\s]/g, ""));
    if (!isFinite(n) || n < 0 || (q === "age" && (n < 16 || n > 90)) || (q === "spend" && n < 1)) {
      W.err = true;
      drawSheet();
      return;
    }
    cbAnswer(q, { v: Math.round(n), cf: 3 });
  },
  /* move in the flow: next, prev, qback (the question before), or the id of a step */
  cbgo: t => {
    if (!W || W.kind !== "cb") return;
    const v = t.dataset.v,
      at = CB_STEPS.findIndex(s => s.id === W.step);
    if (v === "qback") W.q = Math.max(0, (W.q || 0) - 1);
    else if (v === "entry") {
      const c = C();
      W = { kind: "cb", step: "entry", q: 0, o: { a: clone((c.x && c.x.cb && c.x.cb.a) || {}) } };
    } else {
      const id =
        v === "next"
          ? CB_STEPS[Math.min(CB_STEPS.length - 1, at + 1)].id
          : v === "prev"
            ? CB_STEPS[Math.max(0, at - 1)].id
            : v;
      W = { kind: "cb", step: id, o: {} };
    }
    sheet(cbSheet);
    if (typeof spUpSoon === "function") spUpSoon(); /* spiral.js: a new screen starts at its top */
  },
  cbtog: t => {
    if (!W || W.kind !== "cb") return;
    cbToggle(t.dataset.v);
    drawSheet();
  },
  cbsplit: () => {
    if (!W || W.kind !== "cb") return;
    const s = cbStore(C());
    s.split = !s.split;
    save();
    drawSheet();
  },
  /* open the single years of a bar (v: its first age), or go back to all years (v empty) */
  cbzoom: t => {
    if (!W || W.kind !== "cb") return;
    const v = t.dataset.v;
    W = { kind: "cb", step: "chart", o: {} };
    if (v !== "" && v != null) {
      const c = C(),
        a = +v;
      W.n = c.age + Math.floor((Math.max(c.age, Math.min(LY_END, a)) - c.age) / 5) * 5;
    }
    sheet(cbSheet);
  },
  cblayer: t => {
    if (!W || W.kind !== "cb") return;
    W = { kind: "cb", step: "layer", id: t.dataset.v, o: {} };
    sheet(cbSheet);
    if (typeof spUpSoon === "function") spUpSoon();
  },
  /* count a cost or a steady income in the number, or take it out again */
  cbcount: t => {
    if (!W || W.kind !== "cb") return;
    const id = t.dataset.v;
    cbCount(id, cbCounted(C())[id] ? false : {});
    drawSheet();
  },
  /* the rest of setup: the five rounds, then the payoff reveal */
  cbrest: () => {
    CB.rest = true;
    if (SH) closeSheet();
    openSetup("new");
    if (W && W.kind === "setup") {
      W.cbRest = true;
      if (typeof doorGuest === "function" && doorGuest()) W.door = true;
      drawSheet();
    }
    CB.rest = false;
  },
  cbsteps: () => {
    if (SH) closeSheet();
    ACT.tab({ dataset: { a: "tab", v: "plan" } });
  },
});
kitTerms({
  cbfi: [
    "FI number",
    "FI means financial independence: enough invested that work is optional. The standard way to find the number is 25 times what you spend in a year. It comes from the 4% rule: take out 4% of the money in the first year, and it has lasted 30 years in most of market history.",
  ],
});
kitMenu("What it is / What it could be", "cb", "Your FI number, and the chart of what pays for each year", "okay");
kitScreen(
  "cb",
  "What it is / What it could be",
  "Your FI number the standard way, and the same number after what you choose to count.",
  "The chart shows which layer pays for each year to 95. A guess gets no grade."
);
