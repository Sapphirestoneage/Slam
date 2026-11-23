/* ============================================================================
   SLAM the Game, test: tests/retirement-odds.js
   PURPOSE     Examine the retirement odds: the replay of real market history, the 1,000 seeded random
               runs, the worst start year, the one change, and the plain words.
   INPUT       The game scripts, loaded by harness.cjs. Two sample profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/odds.js, data/market.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Ode",
      led: true,
      placed: true,
      age: 45,
      ret: 60,
      take: 7000,
      spend: 5000,
      inv: 300000,
      incs: [R0({ k: "A main job", amt: 7000 })],
      spends: [R0({ k: "Home", amt: 2500 }), R0({ k: "Food", amt: 2500 })],
      cashes: [R0({ k: "Checking", amt: 20000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 300000 })],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  chk(
    "the data file has its source and date, and 152 years",
    /Shiller/.test(MARKET_HISTORY.source) &&
      MARKET_HISTORY.fetched === "2026-11-12" &&
      MARKET_HISTORY.years.length === 152 &&
      MARKET_HISTORY.years[0][0] === 1871
  );
  const O = oddsCalc(c);
  const H = a.death - a.age;
  chk("each start year with enough years after it is one history", O.n === 152 - H + 1 && O.hist[0].year === 1871);
  chk(
    "the count is out of 100 and the random runs use 1,000 runs",
    O.of100 >= 0 && O.of100 <= 100 && O.runs === 1000 && O.of100Random >= 0 && O.of100Random <= 100
  );
  chk("the random runs repeat: the same seed gives the same answer", oddsCalc(c).okRandom === O.okRandom);
  /* one history by hand: no money, no saving, any spending runs out in the first year of retirement */
  const P0 = Object.assign({}, O.P, { inv: 0, monthly: 0, ret: a.age, spend: 50000, ss: 0, now: 0, pen: null });
  chk(
    "a run with nothing invested runs out at once",
    oddsRun(
      P0,
      MARKET_HISTORY.years.map(y => [y[1], y[2]])
    ).ok === false
  );
  const rich = Object.assign({}, O.P, { inv: 1e8 });
  chk(
    "a very large pile works in the worst years",
    oddsRun(
      rich,
      MARKET_HISTORY.years.map(y => [y[1], y[2]])
    ).ok === true
  );
  chk(
    "the worst start year is a real year with the least left",
    O.worst && O.hist.every(h2 => (h2.out == null ? 999 : h2.out) >= (O.worst.out == null ? 999 : O.worst.out))
  );
  const more = oddsCalc(c, { spend: O.P.spend * 1.6 }, { runs: 0 }),
    less = oddsCalc(c, { spend: O.P.spend * 0.5 }, { runs: 0 });
  chk("spending more never gives more histories that work", more.of100 <= O.of100 && less.of100 >= O.of100);
  const ch = oddsChanges(c, { spend: O.P.spend * 1.6 });
  chk("the one change is the one with the largest gain", !ch.best || ch.rows.every(r => r.gain <= ch.best.gain));
  chk(
    "guardrails use the same rule as the Guardrails idea",
    typeof igGuardStep === "function" && igGuardStep(100, 1000, 0.05, 0.1).w === 90
  );
  X("odds");
  chk(
    "the screen says it in plain words, with the worst year, the math and the data source",
    ov().includes("out of 100") &&
      ov().includes("market histories work") &&
      ov().includes("worst start year") &&
      ov().includes("Show the math") &&
      ov().includes("Shiller") &&
      clean(ov()),
    junk(ov())
  );
  chk("never the word probability", !/probabilit/i.test(ov()));
  X("oddstab", "random");
  chk("the random tab says random market histories", ov().includes("random market histories work") && clean(ov()));
  G.chars.length = n0;
  G.active = 0;
  save();
}
