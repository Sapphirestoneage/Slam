/* ============================================================================
   SLAM the Game, test: tests/retirement-odds.js
   PURPOSE     Examine the retirement odds: the replay of real market history through the method code of
               the engine, the random markets of the engine (through the adapter), the worst start year, the
               one change from his solver, the other ways to take money out, and the plain words.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call. Some checks wait for the engine (a promise).
   DEPENDS ON  tests/harness.cjs. Examines: features/odds.js, data/market.js, features/retire.js.
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
  const O = oddsCalc(c),
    H = a.death - a.age;
  chk(
    "each start year with enough years after it is one real history",
    O.n === 152 - H + 1 && O.hist[0].year === 1871 && O.ok <= O.n
  );
  chk(
    "the default way to take money out is guardrails (his Guyton-Klinger)",
    O.P.method === "guyton_klinger" && RETIRE_METHODS[0][0] === "guyton_klinger"
  );
  const P0 = Object.assign({}, O.P, {
    inv: 0,
    monthly: 0,
    ret: a.age,
    spend: 50000,
    ss: 0,
    now: 0,
    pen: null,
    method: "fixed_real",
  });
  chk(
    "a run with nothing invested and the same amount each year runs out",
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
    "the worst start year is a real year with the earliest end",
    O.worst && O.hist.every(h2 => (h2.out == null ? 999 : h2.out) >= (O.worst.out == null ? 999 : O.worst.out))
  );
  const more = oddsCalc(c, { spend: O.P.spend * 1.6 }),
    less = oddsCalc(c, { spend: O.P.spend * 0.5 });
  chk("spending more never gives more real start years that work", more.ok <= O.ok && less.ok >= O.ok);
  const fixed = oddsCalc(c, { method: "fixed_real", spend: O.P.spend * 1.6 }),
    gk = oddsCalc(c, { method: "guyton_klinger", spend: O.P.spend * 1.6 });
  chk("guardrails cut in bad years, so they last in at least as many years as the same amount", gk.ok >= fixed.ok);
  chk(
    "each way to take money out has a plain one-line explanation",
    RETIRE_METHODS.length === 8 && RETIRE_METHODS.every(m => m[2].length > 20 && m[2].length < 130)
  );
  X("odds");
  chk(
    "before the engine answers, the screen says it is running",
    ov().includes("Running 1,000 random markets") && ov().includes("Finding the one change") && clean(ov()),
    junk(ov())
  );
  const wait = (fn, done, n) => {
    const v = fn();
    if (v || (n || 0) > 400) done(v);
    else setTimeout(() => wait(fn, done, (n || 0) + 1), 25);
  };
  wait(
    () => oddsRandom(c),
    Rr => {
      chk(
        "the random markets: X out of 100, from the engine's 1,000 seeded runs",
        Rr &&
          Rr.of100 >= 0 &&
          Rr.of100 <= 100 &&
          Rr.scn.simulationConfig.iterations === 1000 &&
          Rr.scn.simulationConfig.seed === RETIRE_SEED
      );
      wait(
        () => oddsSolve(c),
        S => {
          chk(
            "his solver answers the three questions",
            S && S.age && S.save && S.spend && typeof S.age.solvedValue === "number"
          );
          const K = oddsPick(c, S);
          chk(
            "the one change is the smallest step next to its lever",
            !K.best || K.rows.filter(r => r.ok && r.size > 0).every(r => r.size >= K.best.size)
          );
          X("odds");
          const o = ov();
          chk(
            "the screen: random markets and real years in plain words, the worst year, the one change, the credit, the math",
            o.includes("out of 100") &&
              o.includes("random markets work") &&
              o.includes("The worst start year") &&
              (o.includes("The one change that moves it most") || o.includes("already reaches")) &&
              o.includes("Retirement engine by Zack, MIT license") &&
              o.includes("Show the math") &&
              clean(o),
            junk(o)
          );
          chk("never the word probability", !/probabilit/i.test(o));
          chk(
            "the other ways to take money out sit behind one row",
            o.includes("Try another way to take money out") && RETIRE_METHODS.every(m => o.includes(esc(m[1])))
          );
          X("oddstab", "hist");
          chk(
            "the real history tab says X of Y real start years work",
            ov().includes(O.ok + " of " + O.n) && ov().includes("real start years work") && clean(ov())
          );
          X("kitset", "fixed_real", "odds|method", { t: "s" });
          chk("another way to take money out is kept and used", oddsInputs(c).method === "fixed_real");
          G.chars.length = n0;
          G.active = 0;
          save();
        }
      );
    }
  );
}
