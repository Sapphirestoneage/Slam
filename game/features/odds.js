/* ============================================================================
   SLAM the Game: features/odds.js
   PURPOSE     Retirement odds. Two answers in plain words: "X out of 100 random markets work" (the Monte
               Carlo of the retirement engine of Zack Williams, through features/retire.js, seeded, 1,000
               runs) and "X of Y real start years work" (our own replay of each start year of US market
               history, through the same yearly cash flow). The worst start year. The one change (spend,
               stop age, invest more) that moves it most, found with his solver. The way to take money
               out is guardrails by default; his other ways are behind "Try another way to take money out".
   INPUT       The profile: c.inv, c.take, c.spend, c.age, c.ret, c.death, c.x.ss (the Social Security
               answer), c.x.odds (the answers). data/market.js. The open sheet (W.kind): odds.
   OUTPUT      Functions: oddsInputs, oddsYears, oddsRun, oddsCalc, oddsChanges, oddsRandom, oddsSolve,
               oddsPick, oddsTabs, oddsSheet, oddsBook. Actions (ACT): odds, oddstab. Menu: "Retirement odds".
   DEPENDS ON  data/market.js, core/engine.js, core/withdraw.js (the rules of "Compare the ways"),
               screens/ui.js, features/retire.js (the engine adapter),
               features/kit.js. USES LATER, behind a typeof test: features/mix.js.
   RULES       All amounts are in today's dollars: the returns in the history data are after inflation,
               and the adapter turns the engine's numbers into today's dollars. A run "works" when the
               invested money lasts to the age in c.death. The replay takes money out with the same
               method code as the engine (computeAnnualSpending), starting at the need of the player. The
               answer is a count of histories, never a percent chance. The past is not a forecast, and the
               screen says so.
   ========================================================================= */
const ODDS_STOCK = [
  [0.4, "40% stocks"],
  [0.6, "60% stocks"],
  [0.8, "80% stocks"],
  [1, "All stocks"],
];
const ODDS_TARGET = 0.9;
/* The numbers of the player that the odds use. over can change any of them (paths.js, the simulators). */
function oddsInputs(c, over) {
  over = over || {};
  const d = derive(c),
    p = passives(c),
    guide =
      typeof mixGuide === "function" ? mixGuide(c.age, c.ret).stock : Math.max(0.3, Math.min(0.9, (110 - c.age) / 100)),
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
    method: over.method || kitValue(c, "odds", "method", RETIRE_METHODS[0][0]).v,
    smile: !!over.smile,
  };
}
/* The real years of history: [year, stocks, bonds, inflation]. */
function oddsYears() {
  return MARKET_HISTORY.years;
}
/* ONE RUN. rets is a list of [stocks, bonds] for each year from now. Before the stop age, the monthly money
   goes in. From the stop age, the method of the engine sets the spending each year, and the money that
   Social Security, a pension and other income do not cover comes out. Returns if the money lasts.
   With P.way (a way of core/withdraw.js, for "Compare the ways"), the rule of that way sets the spending
   (waySpend), its timing says when the money comes out (wayPay: the first day, each month or the last
   day), and its way to hold money changes the return of the year (wayReturn). Each row of rets is then
   [stocks, bonds, inflation, CAPE, dividend yield, bond yield], and the result has paid: the spending of
   each year, what the way aimed to pay, and what was short. P.growth is the return of the plan. */
function oddsRun(P, rets) {
  let p = P.inv,
    retBal = null,
    prior = 0,
    last = 0,
    out = null,
    shortAge = null,
    strat = null;
  const H = P.death - P.age,
    way = P.way || null,
    mem = {},
    paid = way ? [] : null;
  for (let y = 0; y < H; y++) {
    const age = P.age + y,
      row = rets[y];
    let r = P.stock * row[0] + (1 - P.stock) * row[1];
    if (age < P.ret) p = p * (1 + r) + P.monthly * 12;
    else {
      if (retBal == null) {
        retBal = p;
        prior = P.spend;
        strat = retireStrategy(way ? "risk_based" : P.method, p > 0 ? P.spend / p : 0.04, false);
      }
      const income = P.now + (age >= 67 ? P.ss : 0) + (P.pen && age >= P.pen.age ? P.pen.amt : 0),
        st = {
          initialTotalBalance: P.inv,
          retirementBalance: retBal,
          priorYearSpending: prior,
          priorYearReturn: last,
          cumulativeInflation: 1,
          currentYearInflation: 0,
          yearsInRetirement: age - P.ret,
          currentAge: age,
          endAge: P.death,
          priorYearWithdrawalRate: p > 0 ? prior / p : 0,
          portfolioExpectedReturn: 0.05,
          portfolioVolatility: 0.12,
          portfolioEquityWeight: P.stock,
        };
      if (way) {
        const before = y ? last : null,
          start = p,
          rule = waySpend(
            way,
            {
              need: P.spend,
              start,
              k: age - P.ret,
              age,
              endAge: P.death - 1,
              last: before,
              infl: y ? rets[y - 1][2] : null,
              cape: row[3],
              stock: P.stock,
              growth: P.growth || 0,
              /* the one rule that the engine works out: keep the odds in a band */
              risk: () => (start > 0 ? retireSpending(start, st, strat) : prior),
            },
            mem
          ),
          /* a way marked gross sets what comes out of the money: income adds to the spending */
          w = way.gross ? rule.spend : Math.max(0, rule.spend - income),
          spent = way.gross ? rule.spend + income : rule.spend;
        if (way.hold)
          r = wayReturn(
            way,
            { r, s: row[0], b: row[1], dy: row[4], by: row[5] },
            { stock: P.stock, k: age - P.ret, last: before, start, w },
            mem
          );
        const step = wayPay(p, w, r, way.timing || "start");
        p = step.p;
        prior = rule.spend;
        paid.push({
          age,
          spend: step.short > 0.5 ? Math.max(0, spent - step.short) : spent,
          aim: rule.aim,
          short: step.short > 0.5 ? step.short : 0,
          share:
            way.gross && rule.aim > 0 ? Math.max(0, w - (step.short > 0.5 ? step.short : 0)) / rule.aim : undefined,
        });
        if (step.short > 0.5 && out == null) {
          out = age + 1;
          shortAge = age;
        }
      } else {
        /* with no money left, the need stays: what income does not cover cannot be paid */
        const spend = p > 0 ? retireSpending(p, st, strat) * (P.smile ? retireSmile(age, P.ret) : 1) : prior,
          w = Math.max(0, spend - income);
        prior = spend;
        p = (p - w) * (1 + r);
        if (p < 0 && out == null) out = age + 1;
      }
    }
    last = r;
    if (p < 0) p = 0;
  }
  return { ok: out == null, end: p, out, paid, shortAge };
}
/* THE REPLAY OF REAL HISTORY: each start year with enough years after it (the years wrap when the plan is
   longer than the data). */
function oddsCalc(c, over) {
  const P = oddsInputs(c, over),
    Y = oddsYears(),
    H = P.death - P.age,
    starts = [],
    full = Y.length - H + 1;
  for (let i = 0; i < (full >= 30 ? full : Y.length); i++) starts.push(i);
  const hist = starts.map(i => {
    const rets = [];
    for (let y = 0; y < H; y++) {
      const row = Y[(i + y) % Y.length];
      rets.push([row[1], row[2]]);
    }
    return Object.assign({ year: Y[i][0] }, oddsRun(P, rets));
  });
  const ok = hist.filter(h => h.ok).length,
    worst = hist
      .slice()
      .sort((a, b) => (a.out == null ? 999 : a.out) - (b.out == null ? 999 : b.out) || a.end - b.end)[0];
  return { P, hist, n: hist.length, ok, of100: Math.round((ok / hist.length) * 100), worst, wraps: full < 30 };
}
/* A quick look at three changes on the replay (spend 10% less, stop 2 years later, invest $250 more a
   month). The plan summary uses it: it is fast and needs no solver. */
function oddsChanges(c, over, base) {
  over = over || {};
  base = base || oddsCalc(c, over);
  const P = base.P,
    list = [
      ["spend", "Spend 10% less in retirement", Object.assign({}, over, { spend: P.spend * 0.9 })],
      ["stop", "Stop work 2 years later", Object.assign({}, over, { ret: Math.min(P.death - 1, P.ret + 2) })],
      ["invest", "Invest $250 more a month", Object.assign({}, over, { monthly: P.monthly + 250 })],
    ];
  const rows = list.map(x => {
    const r = oddsCalc(c, x[2]);
    return { id: x[0], n: x[1], of100: r.of100, gain: r.of100 - base.of100 };
  });
  const best = rows.slice().sort((a, b) => b.gain - a.gain)[0];
  return { rows, best: best && best.gain > 0 ? best : null };
}
/* THE RANDOM MARKETS: his Monte Carlo with the chosen way to take money out. Null until ready. */
function oddsRandom(c, over) {
  const P = oddsInputs(c, over),
    o = { ret: P.ret, spend: P.spend, monthly: P.monthly, method: P.method, smile: P.smile },
    plan = retireScenario(c, Object.assign({ plan: true }, o));
  /* the plan run: the export tabs and the starting rate of the method read it */
  const planRes = retireGet(retireKey("plan", plan), () => retireCall({ kind: "run", scenario: plan }));
  if (!planRes || planRes.error) return planRes ? { error: planRes.error } : null;
  const at = retireDeflate(planRes.medianPortfolioAtRetirement, plan.profile.retirementAge, plan),
    scn = retireScenario(c, Object.assign({ plan: false, rate: at > 0 ? P.spend / at : 0.04 }, o)),
    res = retireGet(retireKey("method", scn), () => retireCall({ kind: "run", scenario: scn }));
  if (!res || res.error) return res ? { error: res.error } : null;
  return Object.assign(retireSummary(res, scn), { plan: retireSummary(planRes, plan), scn });
}
/* THE ONE CHANGE, with his solver: to reach 90 out of 100, the stop age, the money to put in a year, and
   the spending a year. Null until ready. */
function oddsSolve(c) {
  const P = oddsInputs(c),
    scn = retireScenario(c, { plan: true, runs: 500 }),
    t = { retirementAge: P.ret, annualSpend: P.spend, successRate: ODDS_TARGET },
    q = k => retireGet(retireKey("solve-" + k, scn), () => retireCall(retireSolveJob(scn, k, t))),
    age = q("earliest_retirement_age"),
    save = age && q("required_savings"),
    spend = save && q("sustainable_spend");
  if (!age || !save || !spend) return null;
  return { age, save, spend, P };
}
/* Pick the one change: the smallest step next to its own lever (years left at work, take-home pay, spending). */
function oddsPick(c, S) {
  const P = S.P,
    nowSave = P.monthly * 12,
    rows = [
      {
        id: "stop",
        n: "Stop at " + Math.round(S.age.solvedValue),
        size: Math.max(0, S.age.solvedValue - P.ret) / Math.max(1, P.ret - c.age),
        ok: !!S.age.converged,
      },
      {
        id: "invest",
        n: "Invest " + money(Math.max(0, Math.round((S.save.solvedValue - nowSave) / 12))) + " more a month",
        size: Math.max(0, S.save.solvedValue - nowSave) / Math.max(1, (c.take || 0) * 12),
        ok: !!S.save.converged,
      },
      {
        id: "spend",
        n: "Spend " + money(Math.round(S.spend.solvedValue / 12)) + " a month in retirement",
        size: Math.max(0, P.spend - S.spend.solvedValue) / Math.max(1, P.spend),
        ok: !!S.spend.converged,
      },
    ];
  const need = rows.filter(r => r.ok && r.size > 0).sort((a, b) => a.size - b.size);
  return { rows, best: need[0] || null, room: S.spend.solvedValue > P.spend ? S.spend.solvedValue - P.spend : 0 };
}
/* His percentile table, cash flow table and withdrawal schedule, from the plan run of the random markets,
   each as its own tab of the spreadsheet (book.js). Null until the run is ready. */
function oddsTabs(c) {
  const Rr = oddsRandom(c);
  if (!Rr || Rr.error) return Rr ? [] : null;
  const S = Rr.plan;
  return [
    {
      title: "Percentiles of your money by age",
      cols: ["Age", "10th", "25th", "Median", "75th", "90th"],
      table: S.percentiles.map(r => [r.age, r.p10, r.p25, r.p50, r.p75, r.p90]),
    },
    {
      title: "Cash flow by age, the median market",
      cols: ["Age", "Income", "Spending", "Tax", "Social Security", "Withdrawals"],
      table: S.cashflow.map(r => [r.age, r.income, r.spending, r.tax, r.ss, r.withdrawals]),
    },
    {
      title: "Withdrawal schedule in retirement",
      cols: ["Age", "Low market (10th)", "Median", "High market (90th)"],
      table: Rr.schedule.map(r => [r.age, r.p10, r.p50, r.p90]),
    },
  ];
}
function oddsBook(c) {
  const O = oddsCalc(c),
    P = O.P;
  return {
    title: "Retirement odds",
    rows: [
      { id: "od_inv", label: "Invested now", v: P.inv, note: "Your number" },
      { id: "od_month", label: "Invested each month", v: P.monthly, note: "Take-home minus spending" },
      { id: "od_spend", label: "Spending a year in retirement", v: P.spend, note: "Today's dollars" },
      { id: "od_ss", label: "Social Security a year, from 67", v: P.ss, note: "Your Social Security answer" },
      ...oddsSsBook(c),
      { id: "od_stock", label: "Share in stocks", v: P.stock, note: "Your mix, or the age guide" },
      {
        id: "od_ok",
        label: "Real start years that work",
        v: O.ok,
        note: "Worked out by the game: a replay of " + O.n + " stretches of history. A spreadsheet cannot replay them.",
      },
      { id: "od_n", label: "Real start years in all", v: O.n },
      {
        id: "od_of100",
        label: "Real start years that work, out of 100",
        v: O.of100,
        f: "=ROUND({od_ok}/{od_n}*100,0)",
      },
      { id: "od_worst", label: "Worst start year", v: O.worst ? O.worst.year : "", note: "Worked out by the game" },
    ],
  };
}
/* Social Security next to your pay (run Finish everything partly built, Part 14). The ratio is raSsGame in
   features/ratios.js (the same line as Ratios on Key numbers). Part of oddsSheet() and oddsBook(). */
function oddsSsCard(c) {
  const r = typeof raSsGame === "function" ? raSsGame(c) : null;
  if (!r || r.value == null) return "";
  const ss = r.parts[0][1],
    pay = r.parts[1][1],
    sh = passives(c).sh;
  return dkCard(
    "Social Security next to your pay",
    dkStatRow([
      dkTile("Social Security", money(Math.round(ss / 12)), { sub: "a month from 67", guess: true }),
      dkTile("Replaces", Math.round(r.value * 100) + "%", { sub: "of your pay today", guess: true }),
    ]) +
      `<div class="small">At 67, Social Security could replace about ${Math.round(r.value * 100)}% of your pay before taxes. Savings and other income cover the other ${money(Math.round(r.gap / 12))} a month of today's pay${sh < 1 ? ", and your plan counts " + Math.round(sh * 100) + "% of the benefit, to be careful" : ""}.</div>` +
      mathBox([
        "Social Security a year, from 67: " +
          money(Math.round(ss)) +
          " (the game's estimate from your pay, the best 35 years, the 2026 bend points; a Guess).",
        "Pay before taxes a year: " + money(Math.round(pay)) + ".",
        money(Math.round(ss)) + " ÷ " + money(Math.round(pay)) + " = " + Math.round(r.value * 100) + "%.",
        "Your real number is on your statement at ssa.gov (my Social Security).",
      ]),
    { cap: "The share of today's pay it would replace" }
  );
}
function oddsSsBook(c) {
  const r = typeof raSsGame === "function" ? raSsGame(c) : null;
  if (!r || r.value == null) return [];
  return [
    {
      id: "od_ssfull",
      label: "Social Security a year from 67, before the share you count",
      v: r.parts[0][1],
      note: "The game's estimate (Guess)",
    },
    { id: "od_gross", label: "Pay before taxes a year", v: r.parts[1][1] },
    { id: "od_ssr", label: "Social Security replacement", v: r.value, f: "={od_ssfull}/{od_gross}" },
  ];
}
function oddsSheet() {
  const c = C(),
    tab = (W && W.tab) || "random",
    O = oddsCalc(c),
    P = O.P,
    I = { stock: kitValue(c, "odds", "stock", P.stock) },
    st = kitState([kitSharp(c, "inv"), kitSharp(c, "take"), kitSharp(c, "spend"), I.stock]),
    M = RETIRE_METHODS.find(m => m[0] === P.method) || RETIRE_METHODS[0],
    worst = O.worst;
  let h =
    head("Plan", "Retirement odds") +
    kitTabs("oddstab", tab, [
      ["random", "Random markets"],
      ["hist", "Real history"],
    ]);
  if (tab === "random") {
    const Rr = oddsRandom(c);
    h += Rr
      ? Rr.error
        ? `<div class="tile small">The retirement engine could not run this time. The real history tab still works.</div>`
        : `<div class="tile stack kitodds" style="gap:4px;text-align:center"><div class="tiny muted">1,000 random markets ${kitPill(st)}</div><div class="bignum ${st === "Guess" ? "guess" : ""}">${Rr.of100} out of 100</div><div class="small">random markets work: your money lasts to age ${P.death}, taking money out with ${esc(M[1].toLowerCase())}.</div></div><div class="small">With your full spending every year and no cuts: <b>${Rr.plan.of100} out of 100</b>.</div>` +
          (Rr.cutChance > 0
            ? `<div class="small">In ${Rr.cutChance} of 100 markets, spending gets cut at some point. In a bad one, the cut reaches about ${Rr.cutBad}%.</div>`
            : "") +
          `<div class="small">If these assumptions hold, the middle market has about <b>${money(Rr.atRet)}</b> at ${P.ret}, in today's dollars.</div>`
      : `<div class="tile small kitwait">Running 1,000 random markets…</div>`;
  } else
    h += `<div class="tile stack kitodds" style="gap:4px;text-align:center"><div class="tiny muted">Real stretches of US market history ${kitPill(st)}</div><div class="bignum ${st === "Guess" ? "guess" : ""}">${O.ok} of ${O.n}</div><div class="small">real start years work: your money lasts to age ${P.death}.</div></div>`;
  if (worst)
    h += `<div class="small">The worst start year in real history is <b>${worst.year}</b>. ${worst.out ? "Starting then, the money runs out at about age " + worst.out + "." : "Even then the money lasts, with " + money(Math.round(worst.end)) + " left."}</div>`;
  const S = oddsSolve(c);
  if (S) {
    const K = oddsPick(c, S);
    h += K.best
      ? `<div class="tile small"><b>The one change that moves it most: ${esc(K.best.n.toLowerCase())}.</b> With your full spending every year, that reaches ${Math.round(ODDS_TARGET * 100)} out of 100 random markets.</div>`
      : `<div class="tile small">With your full spending every year, your plan already reaches ${Math.round(ODDS_TARGET * 100)} out of 100 random markets.${K.room > 0 ? " You could spend about " + money(Math.round(K.room / 12)) + " more a month and still reach it." : ""}</div>`;
    h += igRows(K.rows.map(r => [esc(r.n), r.ok ? (r.size > 0 ? "reaches 90" : "already there") : "out of range"]));
  } else h += `<div class="tile small kitwait">Finding the one change…</div>`;
  h += kitChart({
    label: "What is left at the end, by start year",
    lines: [{ pts: O.hist.map(x => [x.year, Math.round(x.end)]), name: "Left at age " + P.death }],
    fx: v => String(Math.round(v)),
    fy: v => (Math.abs(v) >= 1e6 ? "$" + Math.round(v / 1e5) / 10 + "M" : money(v)),
    mark: worst ? { x: worst.year, y: worst.end, label: "Worst: " + worst.year } : null,
    caption: "Real history: each point is one start year. Higher is more left over.",
  });
  h += oddsSsCard(c);
  h += kitAsk(c, "odds", "stock", "How much of your money is in stocks?", ODDS_STOCK, P.stock, {
    term: "stockshare",
    help: "The rest is in bonds. The game uses your investment mix when you have filled it in.",
  });
  h += `<details class="math"><summary>Try another way to take money out</summary><div class="inner stack" style="gap:6px">${RETIRE_METHODS.map(m => `<button class="rowbtn ${m[0] === P.method ? "sel" : ""}" data-a="kitset" data-k="odds|method" data-v="${m[0]}" data-t="s"><span><b>${esc(m[1])}</b>${m[0] === RETIRE_METHODS[0][0] ? " (the default)" : ""}<div class="tiny muted">${esc(m[2])}</div></span><span class="caret">${m[0] === P.method ? "✓" : "<i class=chev aria-hidden=true></i>"}</span></button>`).join("")}</div></details>`;
  h += mathBox([
    "Now: " + money(P.inv) + " invested, plus " + money(P.monthly) + " a month until age " + P.ret + ".",
    "In retirement: " +
      money(P.spend) +
      " a year of spending, less " +
      money(P.ss) +
      " a year of Social Security from age 67 (your answer on Social Security).",
    "Way to take money out: " + M[1] + ". " + M[2] + " It starts at your need.",
    "Random markets: the Monte Carlo of the retirement engine, 1,000 runs with a fixed seed, his return and inflation assumptions, taxes by his 2026 tables. Inflation is fixed at " +
      kitPct(retireScenario(c).simulationConfig.fixedInflationRate) +
      ", so each number turns back into today's dollars exactly.",
    "Real history: " +
      O.n +
      " start years from " +
      MARKET_HISTORY.first +
      (O.wraps ? ", and the years wrap to the start when the plan is longer than the data" : "") +
      ". Each year: " +
      Math.round(P.stock * 100) +
      "% of the stock return and " +
      Math.round((1 - P.stock) * 100) +
      "% of the bond return, after inflation.",
    "The one change: his solver finds the stop age, the money to put in, and the spending that each reach 90 out of 100 random markets with your full spending every year (no cuts). The game picks the smallest step next to its own lever.",
    "Data: " + MARKET_HISTORY.source + ", fetched " + MARKET_HISTORY.fetched + ". The past is not a forecast.",
  ]);
  h += `<div class="tiny muted">${esc(RETIRE_CREDIT)}.</div><div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="paths">See the two paths</button><button class="ghost" style="flex:1" data-a="simopen" data-v="stop">Stop earlier or later</button></div>`;
  return h;
}
kitTerms({
  stockshare: [
    "Stock share",
    "How much of your invested money is in stocks. Stocks grow more over long stretches and fall harder in bad years.",
  ],
  odds: [
    "Market histories",
    "Your plan, run through each stretch of real US market years since 1871, and through 1,000 random markets. It counts how many your money lasts through.",
  ],
});
kitScreen(
  "odds",
  "Retirement odds",
  "Your plan through 1,000 random markets and each real start year.",
  "It counts how many of them your money lasts through."
);
Object.assign(ACT, {
  odds: () => {
    W = { kind: "odds", tab: "random", o: {} };
    sheet(oddsSheet);
  },
  oddstab: t => {
    if (!W || W.kind !== "odds") return;
    W.tab = t.dataset.v;
    drawSheet();
  },
});
kitMenu("Retirement odds", "odds", "Your plan through random markets and every real start year", "taxv");
