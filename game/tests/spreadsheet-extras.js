/* ============================================================================
   SLAM the Game, test: tests/spreadsheet-extras.js
   PURPOSE     Examine the extras for spreadsheet lovers: the savings rate by month and its streak in the
               Yearly Review, the monthly quotas on the check-in, and next year's budget from the money log.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile with a money log.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/quota.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Quo",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 5000,
      spend: 4000,
      inv: 30000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 3000 })],
      invs: [],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  const today = "2026-11-20";
  a.moves = [
    { d: "2026-09-02", t: "in", amt: 5000 },
    { d: "2026-09-10", t: "out", amt: 4000, cat: "Food" },
    { d: "2026-10-02", t: "in", amt: 5000 },
    { d: "2026-10-10", t: "out", amt: 4500, cat: "Food" },
    { d: "2026-11-02", t: "in", amt: 5000 },
    { d: "2026-11-03", t: "in", amt: 400, cat: "Side gigs" },
    { d: "2026-11-10", t: "out", amt: 3000, cat: "Home" },
    { d: "2026-11-12", t: "pay", amt: 300 },
  ];
  save();
  go("home");
  const c = C(),
    R2 = quotaRates(c, today);
  chk("12 months, the last one is this month", R2.length === 12 && R2[11].ym === "2026-11");
  chk(
    "a month with log entries: (in − out) ÷ in",
    Math.abs(R2[11].rate - (5400 - 3000) / 5400) < 1e-9 && R2[11].from === "log" && Math.abs(R2[9].rate - 0.2) < 1e-9
  );
  chk("the streak counts the months in a row above 0", quotaStreak(R2) >= 3);
  chk(
    "the streak stops at a month below 0",
    quotaStreak([{ rate: 0.1 }, { rate: -0.1 }, { rate: 0.2 }, { rate: 0.3 }]) === 2
  );
  X("quota");
  X("quotaadd", "500", "save");
  X("quotaadd", "300", "side");
  X("quotaadd", "200", "debt");
  X("quotaadd", "100", "save");
  chk("1 to 3 quotas from presets, no more than 3", c.x.quota.list.length === 3);
  const P = quotaProgress(c, today);
  chk(
    "the quotas track themselves from the money log",
    P[0].got === 5400 - 3000 - 300 && P[1].got === 400 && P[2].got === 300 && P[2].pct === 1
  );
  go("play");
  chk("the check-in shows the quotas", app().includes("This month's quotas") && clean(app()));
  const B = quotaBudget(c, today);
  chk(
    "next year's budget: the logged average a month of each category",
    B.months === 3 &&
      B.lines.find(l => l.k === "Food").month === Math.round(8500 / 3 / 10) * 10 &&
      B.lines.find(l => l.k === "Home").month === 1000
  );
  X("review");
  W.step = 1;
  drawSheet();
  chk(
    "the Yearly Review shows the savings rate by month and the streak",
    ov().includes("Savings rate by month") && ov().includes("Streak:")
  );
  W.step = 5;
  drawSheet();
  chk("the Yearly Review shows next year's budget", ov().includes("Next year's budget") && clean(ov()));
  G.chars.length = n0;
  G.active = 0;
  save();
}
