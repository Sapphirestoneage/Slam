/* ============================================================================
   SLAM the Game: features/odds.js
   PURPOSE     Retirement odds. The plan of the player runs through each real stretch of US market
               history (stocks, bonds and inflation by year), and through 1,000 random runs made from
               the same years. The answer is in plain words: "X out of 100 market histories work", the
               worst start year, and the one change that moves the answer most.
   INPUT       The profile: c.inv, c.take, c.spend, c.age, c.ret, c.death, c.x.ss (the Social Security
               answer), c.x.odds (the answers). data/market.js. The open sheet (W.kind): odds.
   OUTPUT      Functions: oddsInputs, oddsYears, oddsRun, oddsCalc, oddsChanges, oddsSheet, oddsBook.
               Actions (ACT): odds, oddstab. Menu: "Retirement odds".
   DEPENDS ON  data/market.js, core/engine.js, screens/ui.js, features/year.js (rng32),
               features/ideas.js (igGuardStep, the guardrails rule), features/kit.js.
   RULES       All amounts are in today's dollars: the returns in the data are after inflation. A run
               "works" when the invested money lasts to the age in c.death. The random runs use a fixed
               seed, so the same numbers give the same answer each time. The answer is a count of
               histories, never a percent chance. The past is not a forecast, and the screen says so.
   ========================================================================= */
const ODDS_RUNS = 1000;
const ODDS_SEED = 20261123;
const ODDS_STOCK = [
  [0.4, "40% stocks"],
  [0.6, "60% stocks"],
  [0.8, "80% stocks"],
  [1, "All stocks"],
];
/* The numbers of the player that the odds use. over can change any of them (paths.js, the simulators). */
function oddsInputs(c, over) {
  over = over || {};
  const d = derive(c),
    p = passives(c),
    guide = typeof mixGuide === "function" ? mixGuide(c.age).stock : Math.max(0.3, Math.min(0.9, (110 - c.age) / 100)),
    mixed = typeof mixCalc === "function" ? mixCalc(c) : null,
    stock0 = mixed && mixed.total > 0 ? mixed.stock : guide;
  return {
    inv: over.inv != null ? over.inv : c.inv || 0,
    monthly: over.monthly != null ? over.monthly : Math.max(0, (c.take || 0) - (c.spend || 0)),
    age: c.age,
    ret: over.ret != null ? over.ret : Math.max(c.age, c.ret),
    death: Math.max(c.age + 1, c.death || 90),
    spend: over.spend != null ? over.spend : d.fiSpend,
    ss: (p.ss || 0) * 12,
    pen: p.pen ? { amt: p.pen.amt * 12, age: p.pen.age } : null,
    now: (p.now || 0) * 12,
    stock: over.stock != null ? over.stock : kitValue(c, "odds", "stock", stock0).v,
    guard: over.guard != null ? over.guard : kitValue(c, "odds", "guard", "no").v === "yes",
  };
}
/* The real years of history, as [stocks, bonds] rows, with the first year of each. */
function oddsYears() {
  return MARKET_HISTORY.years;
}
/* ONE RUN. rets is a list of [stocks, bonds] for each year from now. Returns if the money lasts. */
function oddsRun(P, rets) {
  let p = P.inv,
    w0 = null,
    rate = null,
    spend = null,
    last = 0,
    out = null;
  const H = P.death - P.age;
  for (let y = 0; y < H; y++) {
    const age = P.age + y,
      r = P.stock * rets[y][0] + (1 - P.stock) * rets[y][1];
    if (age < P.ret) {
      p = p * (1 + r) + P.monthly * 12;
    } else {
      if (spend == null) spend = P.spend;
      const income = P.now + (age >= 67 ? P.ss : 0) + (P.pen && age >= P.pen.age ? P.pen.amt : 0);
      let w = Math.max(0, spend - income);
      if (P.guard && p > 0) {
        if (w0 == null) {
          w0 = w;
          rate = p > 0 ? w0 / p : 0;
        } else if (rate > 0 && w > 0) {
          const g = igGuardStep(w, p, rate, last);
          spend = Math.max(income, spend + (g.w - w));
          w = g.w;
        }
      }
      p = (p - w) * (1 + r);
      if (p < 0 && out == null) out = age + 1;
    }
    last = r;
    if (p < 0) p = 0;
  }
  return { ok: out == null, end: p, out };
}
/* THE ODDS: the replay of history and the random runs. o.runs changes the number of random runs. */
function oddsCalc(c, over, o) {
  o = o || {};
  const P = oddsInputs(c, over),
    Y = oddsYears(),
    H = P.death - P.age,
    starts = [];
  /* each start year with enough years after it; when the plan is longer than the data, the years wrap */
  const full = Y.length - H + 1;
  for (let i = 0; i < (full >= 30 ? full : Y.length); i++) starts.push(i);
  const hist = starts.map(i => {
    const rets = [];
    for (let y = 0; y < H; y++) {
      const row = Y[(i + y) % Y.length];
      rets.push([row[1], row[2]]);
    }
    return Object.assign({ year: Y[i][0] }, oddsRun(P, rets));
  });
  const okH = hist.filter(h => h.ok).length,
    worst = hist
      .slice()
      .sort((a, b) => (a.out == null ? 999 : a.out) - (b.out == null ? 999 : b.out) || a.end - b.end)[0];
  let okR = null,
    runs = o.runs == null ? ODDS_RUNS : o.runs;
  if (runs > 0) {
    const rnd = rng32(ODDS_SEED);
    okR = 0;
    for (let k = 0; k < runs; k++) {
      const rets = [];
      for (let y = 0; y < H; y++) {
        const row = Y[Math.floor(rnd() * Y.length)];
        rets.push([row[1], row[2]]);
      }
      if (oddsRun(P, rets).ok) okR++;
    }
  }
  return {
    P,
    hist,
    n: hist.length,
    ok: okH,
    of100: Math.round((okH / hist.length) * 100),
    worst,
    runs,
    okRandom: okR,
    of100Random: okR == null ? null : Math.round((okR / runs) * 100),
    wraps: full < 30,
  };
}
/* THE ONE CHANGE that moves the answer most: spend 10% less, stop 2 years later, or invest $250 more a month. */
function oddsChanges(c, over, base) {
  over = over || {};
  base = base || oddsCalc(c, over, { runs: 0 });
  const P = base.P,
    list = [
      ["spend", "Spend 10% less in retirement", Object.assign({}, over, { spend: P.spend * 0.9 })],
      ["stop", "Stop work 2 years later", Object.assign({}, over, { ret: Math.min(P.death - 1, P.ret + 2) })],
      ["invest", "Invest $250 more a month", Object.assign({}, over, { monthly: P.monthly + 250 })],
    ];
  const rows = list.map(x => {
    const r = oddsCalc(c, x[2], { runs: 0 });
    return { id: x[0], n: x[1], of100: r.of100, gain: r.of100 - base.of100 };
  });
  const best = rows.slice().sort((a, b) => b.gain - a.gain)[0];
  return { rows, best: best && best.gain > 0 ? best : null };
}
function oddsBook(c) {
  const O = oddsCalc(c, null, { runs: 200 }),
    P = O.P;
  return {
    title: "Retirement odds",
    rows: [
      { id: "od_inv", label: "Invested now", v: P.inv, note: "Your number" },
      { id: "od_month", label: "Invested each month", v: P.monthly, note: "Take-home minus spending" },
      { id: "od_spend", label: "Spending a year in retirement", v: P.spend, note: "Today's dollars" },
      { id: "od_ss", label: "Social Security a year, from 67", v: P.ss, note: "Your Social Security answer" },
      { id: "od_stock", label: "Share in stocks", v: P.stock, note: "Your mix, or the age guide" },
      {
        id: "od_hist",
        label: "Market histories that work, out of 100",
        v: O.of100,
        note: "Worked out by the game: a replay of " + O.n + " stretches of history. A spreadsheet cannot replay them.",
      },
      { id: "od_worst", label: "Worst start year", v: O.worst ? O.worst.year : "", note: "Worked out by the game" },
    ],
  };
}
function oddsSheet() {
  const c = C(),
    tab = (W && W.tab) || "hist",
    O = oddsCalc(c, null, { runs: tab === "random" ? ODDS_RUNS : 0 }),
    P = O.P,
    I = { stock: kitValue(c, "odds", "stock", P.stock), guard: kitValue(c, "odds", "guard", "no") },
    st = kitState([kitSharp(c, "inv"), kitSharp(c, "take"), kitSharp(c, "spend"), I.stock]),
    ch = oddsChanges(c, null, O),
    big = tab === "random" ? O.of100Random : O.of100,
    worst = O.worst;
  const chart = kitChart({
    label: "What is left at the end, by start year",
    lines: [{ pts: O.hist.map(h => [h.year, Math.round(h.end)]), name: "Left at age " + P.death }],
    fx: v => String(Math.round(v)),
    fy: v => (Math.abs(v) >= 1e6 ? "$" + Math.round(v / 1e5) / 10 + "M" : money(v)),
    mark: worst ? { x: worst.year, y: worst.end, label: "Worst: " + worst.year } : null,
    caption: "Each point is one start year in history. Higher is more left over.",
  });
  return (
    head("Plan", "Retirement odds") +
    kitTabs("oddstab", tab, [
      ["hist", "Real history"],
      ["random", "1,000 random runs"],
    ]) +
    `<div class="tile stack kitodds" style="gap:4px;text-align:center"><div class="tiny muted">${tab === "random" ? "Random runs made from real years" : "Real stretches of US market history"} ${kitPill(st)}</div><div class="bignum ${st === "Guess" ? "guess" : ""}">${big} out of 100</div><div class="small">${tab === "random" ? "random market histories work" : "market histories work"}: your money lasts to age ${P.death}.</div></div>` +
    (worst
      ? `<div class="small">The worst start year is <b>${worst.year}</b>. ${worst.out ? "Starting then, the money runs out at about age " + worst.out + "." : "Even then the money lasts, with " + money(Math.round(worst.end)) + " left."}</div>`
      : "") +
    (ch.best
      ? `<div class="tile small"><b>The one change that moves it most: ${esc(ch.best.n.toLowerCase())}.</b> It takes this to ${ch.best.of100} out of 100.</div>`
      : `<div class="tile small">None of the three changes moves this. ${O.of100 >= 100 ? "Every history works already." : ""}</div>`) +
    igRows(ch.rows.map(r => [esc(r.n), r.of100 + " out of 100"])) +
    chart +
    kitAsk(c, "odds", "stock", "How much of your money is in stocks?", ODDS_STOCK, P.stock, {
      term: "stockshare",
      help: "The rest is in bonds. The game uses your investment mix when you have filled it in.",
    }) +
    kitAsk(
      c,
      "odds",
      "guard",
      "In retirement, cut spending 10% in bad years?",
      [
        ["no", "No, keep it the same"],
        ["yes", "Yes, use guardrails"],
      ],
      "no",
      { term: "guardrails" }
    ) +
    mathBox([
      "Now: " + money(P.inv) + " invested, plus " + money(P.monthly) + " a month until age " + P.ret + ".",
      "In retirement: " +
        money(P.spend) +
        " a year of spending, less " +
        money(P.ss) +
        " a year of Social Security from age 67 (your answer on Social Security).",
      "Each year the money grows by " +
        Math.round(P.stock * 100) +
        "% of the stock return and " +
        Math.round((1 - P.stock) * 100) +
        "% of the bond return of that year, after inflation.",
      P.guard
        ? "Guardrails: the same rule as the Guardrails idea. When the rate you take out drifts 20% above where it started, spending drops 10%."
        : "No guardrails: spending stays the same each year.",
      "Real history: " +
        O.n +
        " start years from " +
        MARKET_HISTORY.first +
        (O.wraps ? ", and the years wrap to the start when the plan is longer than the data" : "") +
        ". A history works when the money lasts to age " +
        P.death +
        ".",
      "Random runs: 1,000 runs, each year drawn at random from the real years, with a fixed seed so the answer repeats.",
      "Data: " + MARKET_HISTORY.source + ", fetched " + MARKET_HISTORY.fetched + ". The past is not a forecast.",
    ]) +
    `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="paths">See the two paths</button><button class="ghost" style="flex:1" data-a="simopen" data-v="stop">Stop earlier or later</button></div>`
  );
}
kitTerms({
  stockshare: [
    "Stock share",
    "How much of your invested money is in stocks. Stocks grow more over long stretches and fall harder in bad years.",
  ],
  odds: [
    "Market histories",
    "Your plan, run through each stretch of real US market years since 1871. It counts how many of them your money lasts through.",
  ],
});
kitScreen(
  "odds",
  "Retirement odds",
  "Your plan, run through each real stretch of US market history.",
  "It counts how many of them your money lasts through."
);
Object.assign(ACT, {
  odds: () => {
    W = { kind: "odds", tab: "hist", o: {} };
    sheet(oddsSheet);
  },
  oddstab: t => {
    if (!W || W.kind !== "odds") return;
    W.tab = t.dataset.v;
    drawSheet();
  },
});
kitMenu("Retirement odds", "odds", "Your plan through every stretch of real market history", "taxv");
