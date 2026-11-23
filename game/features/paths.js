/* ============================================================================
   SLAM the Game: features/paths.js
   PURPOSE     Two paths. Two full plans from the same profile, side by side, and a third that blends
               them. "Most money": the most net worth at the stop age, with exact monthly dollars to each
               place in the order of the Financial Order of Operations, with Eli's oxygen mask rule
               first. "Best life": in the style of Die With Zero, aim for just enough at the stop age
               (the freedom number plus a margin) and move the rest into memories by life season, with
               the bucket list items placed in each season. "Both": a split, or the bucket list items
               the player keeps, and what that costs in retirement dollars and in days of freedom.
   INPUT       The profile: c.take, c.spend, c.inv, c.debts, c.goals (the bucket list), c.match, c.age,
               c.ret, c.x.paths (the answers and the pick). The open sheet (W.kind): paths.
   OUTPUT      Functions: pathsAssume, pathsBase, pathsSim, pathsLife, pathsAll, pathsLines, pathsPlan,
               pathsSheet, pathsBook, planTabPath. Actions (ACT): paths, pathstab, pathskeep, pathspick.
               Parts of functions in other files: planTabPath (planTab in planner.js). Menu: "Two paths".
   DEPENDS ON  core/engine.js, screens/ui.js, screens/planner.js, core/metrics.js, data/tax2026.js,
               data/market.js, features/odds.js, features/cover.js, features/eras.js, features/kit.js.
   RULES       The order (the Money Guy Show's Financial Order of Operations): the deductibles (the small
               cushion), the full match at work, high-interest debt, the full cushion, Roth and HSA, the
               plan at work up to its limit, then a regular account. The oxygen mask rule (Eli) comes
               before any money goes to memories: the basics are covered, no high-interest debt, and
               retirement is on track. All amounts are in today's dollars. The words are "If these
               assumptions hold, you reach $X". No outcome is promised.
   ========================================================================= */
const PATHS_RET = [0.04, 0.05, 0.06, 0.07];
const PATHS_INFL = [0.02, 0.025, 0.03, 0.035];
const PATHS_SWR = [0.03, 0.035, 0.04, 0.045];
const PATHS_MARGIN = [0, 0.1, 0.25, 0.5];
const PATHS_SPLIT = [25, 50, 75];
const PATHS_NAMES = { money: "Most money", life: "Best life", both: "Both" };
/* The assumptions box: each one a preset the player can change. */
function pathsAssume(c) {
  return {
    ret: kitValue(c, "paths", "ret", R),
    infl: kitValue(c, "paths", "infl", 0.025),
    swr: kitValue(c, "paths", "swr", SWR),
    margin: kitValue(c, "paths", "margin", 0.1),
    split: kitValue(c, "paths", "split", 50),
    blend: kitValue(c, "paths", "blend", "split"),
  };
}
/* The fixed numbers of the profile that each path starts from. */
function pathsBase(c, A) {
  const d = derive(c),
    N = knNet(c),
    grossM = N.gross,
    two = c.rel === "Married",
    matchGot = typeof knGot === "function" ? knGot(c, "matchAmt") : null,
    preGot = typeof knGot === "function" ? knGot(c, "pre") : null,
    es = c.x && c.x.es && c.x.es.a,
    hsa = !!(es && es.hsa === "yes"),
    lim = TAX_2026.limits;
  let ded = 1000;
  try {
    if (typeof coverCalc === "function") ded = Math.max(1000, coverCalc(c).ded);
  } catch (e) {
    report(e, "paths.js: pathsBase");
  }
  const matchNeed = c.match === "no" ? Math.round(matchGot && matchGot.v > 0 ? matchGot.v : grossM * 0.03) : 0,
    pre = preGot && preGot.v > 0 ? preGot.v : 0;
  return {
    d,
    kept: Math.max(0, (c.take || 0) - (c.spend || 0)),
    months: Math.max(1, Math.round((Math.max(c.age + 1, c.ret) - c.age) * 12)),
    starter: ded,
    target: Math.max(ded, d.target * (c.spend || 0)),
    hi: hiDebt(c),
    hiRate: hiRate(c),
    matchNeed,
    hsa: hsa ? (two ? lim.hsaFamily : lim.hsaOne) / 12 : 0,
    roth: lim.ira / 12,
    k401: Math.max(0, lim.k401 / 12 - pre - matchNeed),
    need: fiNeed(c, Math.max(c.age, c.ret)) * (SWR / A.swr.v),
  };
}
/* ONE PATH, MONTH BY MONTH. o.cap: the most to invest each month after the oxygen mask steps (null is no
   limit). o.split: the share of the rest that goes to memories (1 is all of it). o.keep: the bucket list
   items to fund (null is all of them, in order). Returns the plan, the number at the stop age, the goals. */
function pathsSim(c, A, B, o) {
  o = o || {};
  const rr = A.ret.v / 12,
    hr = B.hiRate / 1200,
    goals = (c.goals || [])
      .filter(g => !g.done && (!o.keep || o.keep[g.id]))
      .map((g, i) => ({
        id: g.id,
        n: g.n,
        k: g.k,
        need: Math.max(0, (g.cost || 0) - (g.fund || 0)),
        era: g.era == null ? 99 : g.era,
        i,
      }))
      .sort((a, b) => a.era - b.era || a.i - b.i);
  let cash = B.d.cash,
    hi = B.hi,
    inv = c.inv || 0,
    pot = 0,
    first = null,
    steady = null,
    fiAt = inv >= B.need ? 0 : null,
    memTotal = 0,
    gi = 0,
    oxyAt = null,
    last = null;
  const done = [],
    phases = {};
  for (let m = 1; m <= B.months; m++) {
    const L = {};
    let s = B.kept;
    const put = (k, v) => {
      const u = Math.max(0, Math.min(s, v));
      if (u > 0) L[k] = (L[k] || 0) + u;
      s -= u;
      return u;
    };
    if (hi > 0) hi *= 1 + hr;
    cash += put("cushion1", B.starter - cash);
    if (B.matchNeed > 0) inv += 2 * put("match", B.matchNeed); /* the job adds the same amount */
    hi -= put("debt", hi);
    if (hi < 0.5) hi = 0;
    cash += put("cushion2", B.target - cash);
    const oxy = cash >= B.target - 0.5 && hi <= 0;
    if (oxy && oxyAt == null) oxyAt = m;
    if (oxy) {
      const room = o.cap == null ? s : Math.max(0, Math.min(s, o.cap - (L.match || 0)));
      let left = room;
      const take = (k, v) => {
        const u = Math.max(0, Math.min(left, v));
        if (u > 0) L[k] = (L[k] || 0) + u;
        left -= u;
        inv += u;
        s -= u;
      };
      take("roth", B.roth);
      take("hsa", B.hsa);
      take("k401", B.k401);
      take("taxable", left);
      if (s > 0) {
        const mem = s * (o.split == null ? 1 : o.split);
        L.memories = mem;
        pot += mem;
        memTotal += mem;
        const rest = s - mem;
        if (rest > 0) {
          L.taxable = (L.taxable || 0) + rest;
          inv += rest;
        }
        s = 0;
      }
    }
    inv = inv * (1 + rr);
    while (gi < goals.length && pot >= goals[gi].need) {
      pot -= goals[gi].need;
      done.push({ id: goals[gi].id, n: goals[gi].n, cost: goals[gi].need, age: c.age + m / 12 });
      gi++;
    }
    if (fiAt == null && inv >= B.need) fiAt = m;
    Object.keys(L).forEach(k => {
      if (phases[k] == null) phases[k] = m;
    });
    if (m === 1) first = L;
    if (oxy) last = L;
    if (oxy && steady == null && !L.cushion1 && !L.cushion2 && !L.debt) steady = L;
  }
  if (steady == null) steady = last;
  return { first: first || {}, steady, inv, fiAt, done, memTotal, oxyAt, goals, unfunded: goals.slice(gi), phases };
}
/* Best life: the least to invest each month that still reaches the freedom number plus the margin. */
function pathsLife(c, A, B, extra) {
  const goal = B.need * (1 + A.margin.v),
    full = pathsSim(c, A, B, Object.assign({}, extra));
  if (full.inv < goal)
    return Object.assign(pathsSim(c, A, B, Object.assign({ cap: null, split: 0 }, extra)), {
      goal,
      cap: null,
      short: true,
    });
  let lo = 0,
    hi = B.kept;
  for (let k = 0; k < 32; k++) {
    const mid = (lo + hi) / 2;
    if (pathsSim(c, A, B, Object.assign({ cap: mid }, extra)).inv >= goal) hi = mid;
    else lo = mid;
  }
  return Object.assign(pathsSim(c, A, B, Object.assign({ cap: hi }, extra)), { goal, cap: hi, short: false });
}
/* ALL THREE PATHS, with the odds of each from market history. */
function pathsAll(c, o) {
  o = o || {};
  const A = pathsAssume(c),
    B = pathsBase(c, A),
    money0 = pathsSim(c, A, B, { split: 0 }),
    life = pathsLife(c, A, B, {}),
    keep = c.x && c.x.paths && c.x.paths.keep,
    both =
      A.blend.v === "keep" && keep && Object.keys(keep).some(k => keep[k])
        ? pathsLife(c, A, B, { keep })
        : life.cap == null
          ? life
          : pathsSim(c, A, B, { cap: life.cap, split: A.split.v / 100 });
  const yrs = B.months / 12,
    list = { money: money0, life, both };
  Object.keys(list).forEach(k => {
    const p = list[k];
    p.id = k;
    p.n = PATHS_NAMES[k];
    p.nominal = p.inv * Math.pow(1 + A.infl.v, yrs);
    p.monthlyInvest = Math.max(
      0,
      (p.inv - (c.inv || 0) * Math.pow(1 + A.ret.v / 12, B.months)) / Math.max(1, B.months)
    );
    p.count = p.done.length;
    p.lastAge = p.done.length ? p.done[p.done.length - 1].age : null;
    if (!o.fast) {
      try {
        p.odds = oddsCalc(
          c,
          { monthly: Math.min(B.kept, p.monthlyInvest), ret: Math.max(c.age, c.ret) },
          { runs: 0 }
        ).of100;
      } catch (e) {
        report(e, "paths.js: pathsAll");
        p.odds = null;
      }
    }
  });
  both.cost = Math.max(0, money0.inv - both.inv);
  both.days = money0.fiAt != null && both.fiAt != null ? kitDays(both.fiAt - money0.fiAt) : null;
  life.cost = Math.max(0, money0.inv - life.inv);
  life.days = money0.fiAt != null && life.fiAt != null ? kitDays(life.fiAt - money0.fiAt) : null;
  const st = kitState([
    kitSharp(c, "take"),
    kitSharp(c, "spend"),
    kitSharp(c, "inv"),
    kitSharp(c, "debt"),
    A.ret,
    A.swr,
  ]);
  return { A, B, list, st, yrs };
}
const PATHS_LINE = {
  cushion1: ["The small cushion (your deductibles)", "cushion1"],
  match: ["Your job's full match", "match"],
  debt: ["High-interest debt", "debt"],
  cushion2: ["The full cushion", "cushion2"],
  roth: ["Your Roth IRA", "roth"],
  hsa: ["Your HSA", "hsa"],
  k401: ["Your plan at work (401k)", "k401"],
  taxable: ["A regular investing account", "taxable"],
  memories: ["Memories: your bucket list", "memories"],
};
/* The monthly plan as rows: [place, dollars a month]. */
function pathsLines(L) {
  return Object.keys(PATHS_LINE)
    .filter(k => (L || {})[k] > 0.5)
    .map(k => [PATHS_LINE[k][0], money(Math.round(L[k])) + " a month", k]);
}
/* Seasons of life: the bucket list items placed in each decade of age. */
function pathsSeasons(p, c) {
  const S = {};
  p.done.forEach(g => {
    const dec = Math.floor(g.age / 10) * 10;
    (S[dec] = S[dec] || []).push(g);
  });
  return Object.keys(S)
    .sort((a, b) => a - b)
    .map(k => ({ n: "Your " + k + "s", items: S[k] }));
}
/* Pick a path: the plan of that path becomes the tasks on Next Steps. */
function pathsPlan(c, id) {
  const P = pathsAll(c, { fast: true }),
    p = P.list[id],
    x = plX(c),
    L = p.steady || p.first;
  x.plan = x.plan.filter(t => !(String(t.v || "").indexOf("path:") === 0 && plOpen(t)));
  pathsLines(L).forEach(r => {
    x.plan.push({
      id: plId(),
      t: "Put " + r[1] + " toward " + r[0].charAt(0).toLowerCase() + r[0].slice(1),
      s: "From your " + p.n + " path",
      a: "paths",
      v: "path:" + r[2],
      mins: 15,
      when: todayISO(),
      slot: "Any",
      st: "todo",
      made: todayISO(),
    });
  });
  c.x.paths = c.x.paths || {};
  c.x.paths.pick = id;
  c.x.paths.picked = todayISO();
  return x.plan.length;
}
function pathsBook(c) {
  const P = pathsAll(c, { fast: true }),
    A = P.A,
    B = P.B,
    rows = [
      { id: "pa_kept", label: "Kept each month", v: B.kept, note: "Take-home minus spending" },
      {
        id: "pa_ret",
        label: "Return a year after inflation",
        v: A.ret.v,
        note: A.ret.given ? "Your choice" : "The game's 7%",
      },
      { id: "pa_infl", label: "Inflation a year", v: A.infl.v },
      { id: "pa_swr", label: "Withdrawal rate", v: A.swr.v },
      { id: "pa_margin", label: "Best life margin", v: A.margin.v },
      {
        id: "pa_need",
        label: "Freedom number",
        v: B.need,
        note: "Worked out by the game (fiNeed): spending, Social Security and the bridge years",
      },
      {
        id: "pa_goal",
        label: "Best life aim at the stop age",
        v: B.need * (1 + A.margin.v),
        f: "={pa_need}*(1+{pa_margin})",
      },
      { id: "pa_years", label: "Years to the stop age", v: P.yrs },
    ];
  Object.keys(P.list).forEach(k => {
    const p = P.list[k];
    rows.push({
      id: "pa_" + k + "_inv",
      label: p.n + ": invested at the stop age, today's dollars",
      v: p.inv,
      note: "Worked out by the game: a month-by-month run",
    });
    rows.push({
      id: "pa_" + k + "_nom",
      label: p.n + ": the same, in future dollars",
      v: p.nominal,
      f: "={pa_" + k + "_inv}*(1+{pa_infl})^{pa_years}",
    });
    rows.push({ id: "pa_" + k + "_count", label: p.n + ": bucket list items done", v: p.count });
    pathsLines(p.steady || p.first).forEach(r =>
      rows.push({
        id: "pa_" + k + "_" + r[2],
        label: p.n + ": " + r[0] + ", a month",
        v: Math.round(((p.steady || p.first)[r[2]] || 0) * 100) / 100,
      })
    );
  });
  return { title: "Two paths", rows };
}
function pathsCol(c, P, k) {
  const p = P.list[k],
    L = p.steady || p.first,
    lines = pathsLines(L),
    firstLines = pathsLines(p.first),
    differs = p.steady && JSON.stringify(firstLines) !== JSON.stringify(lines),
    seasons = pathsSeasons(p, c);
  return {
    title: p.n + (c.x && c.x.paths && c.x.paths.pick === k ? " · your pick" : ""),
    big: money(Math.round(p.inv)),
    guess: P.st === "Guess",
    hot: c.x && c.x.paths && c.x.paths.pick === k,
    html:
      `<div class="tiny">If these assumptions hold, you reach <b>${money(Math.round(p.inv))}</b> by ${Math.max(c.age, c.ret)} (${money(Math.round(p.nominal))} in future dollars).</div>` +
      (differs
        ? `<div class="tiny muted">This month:</div>` +
          igRows(firstLines.map(r => [esc(r[0]), r[1]])) +
          `<div class="tiny muted">Then, once the cushion and debt steps are done:</div>`
        : `<div class="tiny muted">Each month:</div>`) +
      igRows(lines.map(r => [esc(r[0]), r[1]])) +
      igRows([
        ["Market histories that work", p.odds == null ? "Not worked out" : p.odds + " out of 100"],
        ["Bucket list items done", p.count + (p.lastAge ? " by age " + Math.ceil(p.lastAge) : "")],
        k === "money"
          ? null
          : [
              "Cost next to Most money",
              money(Math.round(p.cost || 0)) + (p.days != null ? ", " + kitDayWords(p.days) : ""),
            ],
      ]) +
      (seasons.length
        ? `<div class="tiny muted">By life season:</div>` +
          igRows(
            seasons.map(s => [
              esc(s.n),
              s.items.map(g => esc(g.n) + " " + money(Math.round(g.cost)) + " at " + Math.floor(g.age)).join(", "),
            ])
          )
        : "") +
      `<button class="${c.x && c.x.paths && c.x.paths.pick === k ? "ghost" : "primary"} slim wide" data-a="pathspick" data-v="${k}">${c.x && c.x.paths && c.x.paths.pick === k ? "Picked. Set Next Steps again" : "Pick this path"}</button>`,
  };
}
function pathsSheet() {
  const c = C(),
    P = pathsAll(c),
    A = P.A,
    tab = (W && W.tab) || "side",
    keep = (c.x && c.x.paths && c.x.paths.keep) || {},
    goals = (c.goals || []).filter(g => !g.done);
  let h =
    head("Plan", "Two paths") +
    `<div class="small muted">Two full plans from your same numbers. One builds the most money. One aims for just enough and spends the rest on the life you want. Then a blend of the two. ${kitInfo("twopaths")}</div>` +
    kitTabs("pathstab", tab, [
      ["side", "Side by side"],
      ["both", "Blend them"],
      ["assume", "Assumptions"],
    ]);
  if (tab === "assume")
    h +=
      kitAsk(
        c,
        "paths",
        "ret",
        "Investment return a year, after inflation",
        PATHS_RET.map(v => [v, kitPct(v)]),
        A.ret.v,
        { term: "realret" }
      ) +
      kitAsk(
        c,
        "paths",
        "infl",
        "Inflation a year",
        PATHS_INFL.map(v => [v, kitPct(v)]),
        A.infl.v,
        { help: "Only used to show the number in future dollars." }
      ) +
      kitAsk(
        c,
        "paths",
        "swr",
        "Withdrawal rate in retirement",
        PATHS_SWR.map(v => [v, kitPct(v)]),
        A.swr.v,
        { term: "swr" }
      ) +
      kitAsk(
        c,
        "paths",
        "margin",
        "Best life: the margin above your freedom number",
        PATHS_MARGIN.map(v => [v, v ? "+" + Math.round(v * 100) + "%" : "No margin"]),
        A.margin.v,
        { term: "margin" }
      ) +
      `<div class="tile tiny stack" style="gap:3px"><div>Tax year: ${TAX_2026.year}, from ${esc(TAX_2026.source)}.</div><div>Market history: ${MARKET_HISTORY.first} to ${MARKET_HISTORY.last}, ${esc(MARKET_HISTORY.source)}, fetched ${MARKET_HISTORY.fetched}.</div><div>All amounts are in today's dollars unless they say future dollars.</div></div>`;
  else if (tab === "both")
    h +=
      kitAsk(
        c,
        "paths",
        "blend",
        "How do you want to blend them?",
        [
          ["split", "A split of the memory money"],
          ["keep", "Pick bucket list items to keep"],
        ],
        A.blend.v
      ) +
      (A.blend.v === "keep"
        ? goals.length
          ? `<div class="chips">${goals.map(g => `<button class="chip ${keep[g.id] ? "on" : ""}" data-a="pathskeep" data-v="${esc(g.id)}">${esc(g.n)} · ${money(Math.max(0, (g.cost || 0) - (g.fund || 0)))}</button>`).join("")}</div>`
          : `<div class="small muted">Your bucket list is empty. Add items in My Goals.</div><button class="ghost slim" data-a="tab" data-v="goals">Open My Goals</button>`
        : kitAsk(
            c,
            "paths",
            "split",
            "How much of the memory money do you keep for memories?",
            PATHS_SPLIT.map(v => [v, v + "%"]),
            A.split.v
          )) +
      kitColumns([pathsCol(c, P, "both")]) +
      `<div class="tile small">The blend costs <b>${money(Math.round(P.list.both.cost || 0))}</b> of retirement money next to Most money${P.list.both.days != null ? ", and moves your freedom date " + kitDayWords(P.list.both.days) : ""}. It does ${P.list.both.count} bucket list ${P.list.both.count === 1 ? "item" : "items"}. ${kitPill(P.st)}</div>`;
  else
    h +=
      `<div class="tile small">If these assumptions hold, Most money reaches <b>${money(Math.round(P.list.money.inv))}</b> and Best life reaches <b>${money(Math.round(P.list.life.inv))}</b> by ${Math.max(c.age, c.ret)}. ${kitPill(P.st)}</div>` +
      (P.list.life.short
        ? `<div class="tile small">Your plan does not reach your freedom number plus the margin by your stop age yet, so Best life invests the same as Most money for now.</div>`
        : "") +
      kitColumns([pathsCol(c, P, "money"), pathsCol(c, P, "life")]);
  h += mathBox([
    "Each month, what you keep (" +
      money(P.B.kept) +
      ") goes down the list in order: the small cushion of " +
      money(P.B.starter) +
      ", your job's full match, high-interest debt, the full cushion of " +
      money(Math.round(P.B.target)) +
      ", Roth IRA (" +
      money(Math.round(P.B.roth)) +
      " a month), HSA, the plan at work, then a regular account.",
    "The oxygen mask rule: no money goes to memories until the cushion is full and high-interest debt is gone.",
    "Most money invests all of it. Best life invests just enough to reach your freedom number of " +
      money(Math.round(P.B.need)) +
      " plus a margin of " +
      Math.round(A.margin.v * 100) +
      "%, and the rest goes to your bucket list in order.",
    "Growth: " +
      kitPct(A.ret.v) +
      " a year after inflation. Future dollars: × (1 + " +
      kitPct(A.infl.v) +
      ") for each year to " +
      Math.max(c.age, c.ret) +
      ".",
    "Market histories: each path's monthly investing, run through each real stretch of US market history (Retirement odds).",
    "The order of the list is the Money Guy Show's Financial Order of Operations. The idea of memory money by life season is from Bill Perkins, Die With Zero.",
  ]);
  return h;
}
/* Part of planTab() in planner.js. The chosen path, as one row at the top of Next Steps. */
function planTabPath(h) {
  try {
    const c = C(),
      id = c && c.x && c.x.paths && c.x.paths.pick;
    if (!id || !PATHS_NAMES[id]) return h;
    const row = `<button class="rowbtn pathrowpick" data-a="paths"><span><b>Your path: ${esc(PATHS_NAMES[id])}</b><div class="tiny muted">Picked ${nice(c.x.paths.picked || todayISO())}. Tap to see it next to the others.</div></span><span class="caret">›</span></button>`;
    return /<div class="seg plseg">[\s\S]*?<\/div>/.test(h)
      ? h.replace(/(<div class="seg plseg">[\s\S]*?<\/div>)/, m => m + row)
      : h.replace('<div class="stack">', () => '<div class="stack">' + row);
  } catch (e) {
    report(e, "paths.js: planTabPath");
    return h;
  }
}
kitTerms({
  twopaths: [
    "Two paths",
    "Most money builds the biggest pile by your stop age. Best life aims for just enough and spends the rest on experiences while you can enjoy them most.",
  ],
  realret: [
    "Return after inflation",
    "How much investments grow each year once rising prices are taken out. 7% is a long-run average for stocks, not a promise.",
  ],
  swr: [
    "Withdrawal rate",
    "The share of your invested money you take out each year in retirement. 4% comes from studies of 30-year retirements in US history.",
  ],
  margin: [
    "Margin",
    "A cushion on top of your freedom number in Best life, in case the years ahead are worse than the average.",
  ],
});
kitScreen(
  "paths",
  "Two paths",
  "Two full plans from your numbers: the most money, and the best life.",
  "A blend shows what each bucket list item costs in retirement."
);
Object.assign(ACT, {
  paths: () => {
    W = { kind: "paths", tab: "side", o: {} };
    const c = C();
    c.x = c.x || {};
    c.x.paths = c.x.paths || {};
    c.x.paths.seen = todayISO();
    sheet(pathsSheet);
  },
  pathstab: t => {
    if (!W || W.kind !== "paths") return;
    W.tab = t.dataset.v;
    drawSheet();
  },
  pathskeep: t => {
    const c = C(),
      S = kitStore(c, "paths");
    c.x.paths.keep = c.x.paths.keep || {};
    const k = c.x.paths.keep;
    k[t.dataset.v] = !k[t.dataset.v];
    if (!S.blend) S.blend = { v: "keep", cf: 2 };
    kitRedraw();
  },
  pathspick: t => {
    const c = C(),
      id = t.dataset.v;
    if (!PATHS_NAMES[id]) return;
    pathsPlan(c, id);
    kitRedraw();
  },
});
kitMenu("Two paths", "paths", "Most money, best life, or a blend: your full plan, month by month", "taxv");
