/* ============================================================================
   SLAM the Game: features/stress.js
   PURPOSE     The stress test. One result from two tests of the same plan: the replay of each real start
               year of US market history, and the 1,000 random markets of the retirement engine. The
               headline is one count: "your plan holds in X of N market histories". Under it: the two
               counts, the worst real start year, the hard stretches that people name (1929, 1966, 1973,
               2000, 2008) as rows from the same replay, and the one change that helps most.
   INPUT       The profile, through oddsInputs() of features/odds.js. data/market.js. The open sheet
               (W.kind): stress.
   OUTPUT      Functions: stressStretch, stressNamed, stressCalc, stressHelp, stressBook, stressSheet.
               Actions (ACT): stress, stressview. Menu: "Stress test". The headline has two views, kept
               in c.x.stress.view: "All together" (the sum) and "The harder test" (the lower of the two).
   DEPENDS ON  data/market.js, core/engine.js, screens/ui.js, features/retire.js, features/odds.js
               (oddsCalc, oddsRun, oddsRandom, oddsChanges, oddsSolve, oddsPick), features/kit.js.
   RULES       This file has no engine of its own. Each number comes from the functions of odds.js. A
               hard stretch that starts near the end of the data wraps to the first year of the data, and
               the row says so. The result is a count of histories. It is not a chance, and the past is
               not a forecast. All amounts are in today's dollars. No verdict words.
   ========================================================================= */
const STRESS_VIEWS = [
  ["all", "All together"],
  ["hard", "The harder test"],
];
const STRESS_NAMED = [
  [1929, "The Great Depression"],
  [1966, "The long inflation after 1966"],
  [1973, "The oil shock"],
  [2000, "The dot-com fall"],
  [2008, "The financial crisis"],
];
/* ONE STRETCH of real history that starts in a given year, through the run of odds.js. wraps is true
   when the plan is longer than the years after the start year. Null when the year is not in the data. */
function stressStretch(P, year) {
  const Y = oddsYears(),
    i = Y.findIndex(r => r[0] === year),
    H = P.death - P.age,
    rets = [];
  if (i < 0) return null;
  for (let y = 0; y < H; y++) {
    const row = Y[(i + y) % Y.length];
    rets.push([row[1], row[2]]);
  }
  return Object.assign({ year, wraps: i + H > Y.length }, oddsRun(P, rets));
}
/* The hard stretches that people name, each as one row. */
function stressNamed(P) {
  return STRESS_NAMED.map(s => {
    const r = stressStretch(P, s[0]);
    return r ? Object.assign({ n: s[1] }, r) : null;
  }).filter(Boolean);
}
/* THE ONE RESULT. real: the replay. random: the 1,000 random markets (null until the engine answers, or
   { error }). ok and n are the sum of both tests when both are ready, else the replay only. */
function stressCalc(c, over) {
  const O = oddsCalc(c, over),
    Rr = oddsRandom(c, over),
    ready = !!(Rr && !Rr.error),
    runs = ready ? Rr.scn.simulationConfig.iterations : 0,
    rok = ready ? Math.round(Rr.success * runs) : 0,
    n = O.n + runs,
    ok = O.ok + rok,
    view = kitValue(c, "stress", "view", "all").v === "hard" ? "hard" : "all",
    /* the harder test: the lower of the two counts out of 100 (real history until the engine answers) */
    hardIs = ready && Rr.of100 < O.of100 ? "random" : "real";
  return {
    view,
    hard: {
      which: hardIs,
      name: hardIs === "random" ? "1,000 random markets" : "real history",
      of100: hardIs === "random" ? Rr.of100 : O.of100,
    },
    P: O.P,
    real: { ok: O.ok, n: O.n, of100: O.of100, worst: O.worst, wraps: O.wraps },
    random: ready ? { ok: rok, n: runs, of100: Rr.of100, cutChance: Rr.cutChance, cutBad: Rr.cutBad } : null,
    wait: !Rr,
    error: !!(Rr && Rr.error),
    ok,
    n,
    of100: Math.round((ok / n) * 100),
    named: stressNamed(O.P),
    O,
  };
}
/* The one change that helps most: the solver of the engine when it is ready, else the quick look of the
   replay (odds.js). Returns { n, by } or null when no change is needed or none helps. */
function stressHelp(c, S) {
  const sol = oddsSolve(c);
  if (sol) {
    const K = oddsPick(c, sol);
    return K.best
      ? { n: K.best.n, by: "solver" }
      : { n: null, by: "solver", room: K.room > 0 ? Math.round(K.room / 12) : 0 };
  }
  const Q = oddsChanges(c, null, S.O);
  return Q.best ? { n: Q.best.n, by: "replay", gain: Q.best.gain } : null;
}
function stressBook(c) {
  const S = stressCalc(c),
    rows = [
      { id: "st_realok", label: "Real start years that work", v: S.real.ok, note: "The replay of odds.js" },
      { id: "st_realn", label: "Real start years in all", v: S.real.n },
      {
        id: "st_randok",
        label: "Random markets that work",
        v: S.random ? S.random.ok : 0,
        note: S.random ? "The 1,000 random markets of the retirement engine" : "The engine did not answer yet",
      },
      { id: "st_randn", label: "Random markets in all", v: S.random ? S.random.n : 0 },
      { id: "st_ok", label: "Histories that work, both tests", v: S.ok, f: "={st_realok}+{st_randok}" },
      { id: "st_n", label: "Histories in all, both tests", v: S.n, f: "={st_realn}+{st_randn}" },
      { id: "st_of100", label: "Histories that work, out of 100", v: S.of100, f: "=ROUND({st_ok}/{st_n}*100,0)" },
      {
        id: "st_realof100",
        label: "Real start years that work, out of 100",
        v: S.real.of100,
        f: "=ROUND({st_realok}/{st_realn}*100,0)",
      },
      {
        id: "st_randof100",
        label: "Random markets that work, out of 100",
        v: S.random ? S.random.of100 : S.real.of100,
        note: S.random
          ? "From the retirement engine"
          : "The engine did not answer yet: the real history number stands in",
      },
      {
        id: "st_hard",
        label: "The harder test, out of 100",
        v: S.hard.of100,
        f: "=MIN({st_realof100},{st_randof100})",
        note: "The lower of the two tests: " + S.hard.name,
      },
      { id: "st_view", label: "The headline you picked", v: S.view === "hard" ? "The harder test" : "All together" },
    ];
  S.named.forEach(r =>
    rows.push({
      id: "st_y" + r.year,
      label: "Start in " + r.year + ": money left at the end",
      v: Math.round(r.end),
      note: "Worked out by the game: a replay of real years. A spreadsheet cannot replay them.",
    })
  );
  return { title: "Stress test", rows };
}
function stressSheet() {
  const c = C(),
    S = stressCalc(c),
    P = S.P,
    st = kitState([
      kitSharp(c, "inv"),
      kitSharp(c, "take"),
      kitSharp(c, "spend"),
      kitValue(c, "odds", "stock", P.stock),
    ]),
    worst = S.real.worst,
    H = stressHelp(c, S);
  let h =
    head("Plan", "Stress test") +
    `<div class="row between" style="gap:8px">${kitTabs("stressview", S.view, STRESS_VIEWS)}${kitInfo("stressview")}</div>` +
    `<div class="tile stack kitodds" style="gap:4px;text-align:center"><div class="row between" style="gap:6px"><span class="tiny muted">One result from two tests</span><span class="row" style="gap:6px">${kitPill(st)}${kitInfo("stress")}</span></div>${
      S.view === "hard"
        ? `<div class="bignum ${st === "Guess" ? "guess" : ""}">${S.hard.of100} out of 100</div><div class="small">in the harder of the two tests, ${esc(S.hard.name)}: your money lasts to age ${P.death}.${S.wait ? " The random markets are still running." : ""}</div>`
        : `<div class="bignum ${st === "Guess" ? "guess" : ""}">${S.ok.toLocaleString()} of ${S.n.toLocaleString()}</div><div class="small">market histories: your money lasts to age ${P.death}. That is ${S.of100} out of 100.</div>`
    }</div>`;
  h += kitColumns([
    {
      title: "Real history",
      big: S.real.ok + " of " + S.real.n,
      guess: st === "Guess",
      foot: "Each real start year since " + MARKET_HISTORY.first + " " + kitInfo("realhist"),
    },
    {
      title: "Random markets",
      big: S.random ? S.random.ok.toLocaleString() + " of " + S.random.n.toLocaleString() : S.wait ? "…" : "No answer",
      guess: st === "Guess",
      foot:
        (S.random
          ? "1,000 markets that never happened"
          : S.wait
            ? "Running 1,000 random markets…"
            : "The engine could not run this time. The result uses real history only.") +
        " " +
        kitInfo("randmkt"),
    },
  ]);
  if (worst)
    h += `<div class="small">The worst real start year ${kitInfo("worstyear")} is <b>${worst.year}</b>. ${worst.out ? "Starting then, the money runs out at about age " + worst.out + "." : "Even then the money lasts, with " + money(Math.round(worst.end)) + " left."}</div>`;
  if (S.random && S.random.cutChance > 0)
    h += `<div class="small">In ${S.random.cutChance} of 100 random markets, spending gets cut at some point ${kitInfo("guardcut")}. In a hard one, the cut reaches about ${S.random.cutBad}%.</div>`;
  h +=
    `<div class="row between" style="gap:6px"><b class="small">The hard stretches people name</b>${kitInfo("hardyears")}</div>` +
    igRows(
      S.named.map(r => [
        esc(r.year + ": " + r.n) + (r.wraps ? " *" : ""),
        r.ok ? "lasts, " + money(Math.round(r.end)) + " left" : "runs out at about " + r.out,
      ])
    ) +
    (S.named.some(r => r.wraps)
      ? `<div class="tiny muted">* Your plan is longer than the years after this start. After ${MARKET_HISTORY.last}, the replay goes on with the years from ${MARKET_HISTORY.first}.</div>`
      : "");
  h += H
    ? H.n
      ? `<div class="tile small"><b>What helps most ${kitInfo("onechange")}: ${esc(H.n.toLowerCase())}.</b> ${H.by === "solver" ? "With your full spending every year, that reaches " + Math.round(ODDS_TARGET * 100) + " out of 100 random markets." : "In the replay of real history, that adds " + H.gain + " out of 100."}</div>`
      : `<div class="tile small">With your full spending every year, your plan already reaches ${Math.round(ODDS_TARGET * 100)} out of 100 random markets ${kitInfo("onechange")}.${H.room > 0 ? " You could spend about " + money(H.room) + " more a month and still reach it." : ""}</div>`
    : `<div class="tile small">None of the three quick changes (spend 10% less, stop 2 years later, invest $250 more a month) moves the replay ${kitInfo("onechange")}.</div>`;
  h += mathBox([
    "Your plan: " +
      money(P.inv) +
      " invested, plus " +
      money(P.monthly) +
      " a month until age " +
      P.ret +
      ". Then " +
      money(P.spend) +
      " a year of spending, with " +
      Math.round(P.stock * 100) +
      "% in stocks.",
    "Real history: " +
      S.real.n +
      " start years from " +
      MARKET_HISTORY.first +
      ", each run through the same yearly cash flow as the retirement odds.",
    "Random markets: the Monte Carlo of the retirement engine, 1,000 runs with a fixed seed.",
    "The one result: the histories that work in both tests, added, out of all histories in both tests. It is a count, not a chance.",
    "The hard stretches: the same replay, started in that year.",
    "Data: " + MARKET_HISTORY.source + ", fetched " + MARKET_HISTORY.fetched + ". The past is not a forecast.",
  ]);
  h += `<div class="tiny muted">${esc(RETIRE_CREDIT)}.</div><div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="odds">Open the retirement odds</button><button class="ghost" style="flex:1" data-a="simopen" data-v="stop">Stop earlier or later</button></div>`;
  return h;
}
kitTerms({
  stressview: [
    "Two ways to read it",
    "All together adds the histories of both tests into one count. The harder test shows only the test where fewer histories work, so the headline is the more careful of the two.",
  ],
  stress: [
    "Stress test",
    "Your plan, run through hard markets to see if the money lasts. This screen adds two tests into one count: each real start year of US history, and 1,000 random markets.",
  ],
  realhist: [
    "Real history",
    "Your plan starts in a real year, for example 1929, and lives through the real market years that came after it.",
  ],
  randmkt: [
    "Random markets",
    "Markets that never happened, made by the retirement engine from typical returns and swings. They test the plan against more than the one past we had.",
  ],
  worstyear: [
    "Worst start year",
    "The real year that was the hardest to start a plan in. A plan that lasts through it lasted through each stretch of history we have.",
  ],
  guardcut: [
    "Spending cut",
    "With guardrails, the plan spends a little less after a bad market and more after a good one. A cut is one of those lower years.",
  ],
  hardyears: [
    "Hard stretches",
    "Start years that people remember: a crash or high inflation came soon after. The first years of a plan matter most.",
  ],
  onechange: [
    "The one change",
    "Of spending less, stopping work later and investing more, the one that needs the smallest step to make the plan last.",
  ],
});
kitScreen(
  "stress",
  "Stress test",
  "One result from real market history and 1,000 random markets.",
  "It counts the histories that your money lasts through, and names the one change that helps most."
);
Object.assign(ACT, {
  stress: () => {
    W = { kind: "stress", o: {} };
    sheet(stressSheet);
  },
  stressview: t => {
    kitStore(C(), "stress").view = { v: t.dataset.v === "hard" ? "hard" : "all", cf: 3 };
    kitRedraw();
  },
});
kitMenu("Stress test", "stress", "Real market history and 1,000 random markets, as one result", "odds");
