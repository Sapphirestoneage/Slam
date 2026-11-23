/* ============================================================================
   SLAM the Game, test: tests/stress-test.js
   PURPOSE     Examine the stress test: the one result is the sum of the replay of real history and the
               1,000 random markets, the named hard stretches come from the same replay, the screen, the
               rows of the spreadsheet, the built row and the link from a skill.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call. One group of checks waits for the retirement engine.
   DEPENDS ON  tests/harness.cjs. Examines: features/stress.js on top of features/odds.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Stress",
      led: true,
      placed: true,
      age: 40,
      ret: 62,
      death: 92,
      take: 6000,
      spend: 4500,
      inv: 150000,
      incs: [R0({ k: "A main job", amt: 6000 })],
      spends: [R0({ k: "Home", amt: 2500 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 9000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 150000 })],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    O = oddsCalc(c),
    S0 = stressCalc(c);
  chk(
    "before the engine answers, the result is the replay of odds.js alone",
    S0.wait && S0.random === null && S0.ok === O.ok && S0.n === O.n && S0.real.of100 === O.of100
  );
  chk("the worst start year is the worst of the replay", S0.real.worst && S0.real.worst.year === O.worst.year);
  const H = O.P.death - O.P.age,
    Y = oddsYears(),
    hand = y => {
      const i = Y.findIndex(r => r[0] === y),
        rets = [];
      for (let k = 0; k < H; k++) rets.push([Y[(i + k) % Y.length][1], Y[(i + k) % Y.length][2]]);
      return oddsRun(O.P, rets);
    };
  chk(
    "five named stretches, each the same run as odds.js for that start year",
    S0.named.length === 5 &&
      S0.named.every(r => {
        const h = hand(r.year);
        return h.ok === r.ok && Math.abs(h.end - r.end) < 1e-6 && h.out === r.out;
      })
  );
  const in29 = O.hist.find(h => h.year === 1929),
    n29 = S0.named.find(r => r.year === 1929);
  chk(
    "1929 agrees with the row of the replay, and does not wrap",
    in29 && n29 && !n29.wraps && in29.ok === n29.ok && Math.abs(in29.end - n29.end) < 1e-6
  );
  chk(
    "a stretch that starts near the end of the data wraps, and says so",
    S0.named.find(r => r.year === 2008).wraps === true
  );
  chk("a year that is not in the data gives no row", stressStretch(O.P, 1700) === null);
  const hard = stressCalc(c, { spend: O.P.spend * 3 });
  chk("three times the spending: fewer histories work", hard.real.ok < S0.real.ok && hard.ok <= hard.n);
  X("stress");
  chk(
    "the screen before the engine: one count, both tests, the worst year, the hard stretches, the math",
    W.kind === "stress" &&
      ov().includes("market histories") &&
      ov().includes(S0.ok + " of " + S0.n) &&
      ov().includes("Running 1,000 random markets") &&
      ov().includes("The worst real start year") &&
      ov().includes("The Great Depression") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "each label has an i",
    ["stress", "realhist", "randmkt", "worstyear", "hardyears", "onechange"].every(
      k => GLOSS[k] && ov().includes("term:" + k)
    )
  );
  chk("Back, Forward, Close and the i of the screen", !!NV_INFO.stress && MENU.some(m => m[1] === "stress"));
  const B0 = stressBook(c);
  chk(
    "the spreadsheet: the sum rows are formulas on the rows of the two tests",
    B0.rows.find(r => r.id === "st_ok").f === "={st_realok}+{st_randok}" &&
      B0.rows.find(r => r.id === "st_ok").v === S0.ok &&
      B0.rows.find(r => r.id === "st_y1929").v === Math.round(n29.end) &&
      BOOK_PARTS.includes(stressBook)
  );
  const row = btRows().find(r => r.n.startsWith("Stress test"));
  chk("the built list has it as built, with its screen", row && row.st === "b" && row.a === "stress");
  const L = cxLink("storms-windfalls", 1);
  chk("a real skill (the market crash plan) opens it", L && L.a === "stress");
  const wait = (fn, done, n) => {
    const v = fn();
    if (v || (n || 0) > 400) done(v);
    else setTimeout(() => wait(fn, done, (n || 0) + 1), 25);
  };
  wait(
    () => oddsRandom(c),
    Rr => {
      const S = stressCalc(c);
      chk(
        "with the engine: the one result adds the 1,000 random markets to the real start years",
        Rr &&
          S.random &&
          S.random.n === 1000 &&
          S.random.ok === Math.round(Rr.success * 1000) &&
          S.n === O.n + 1000 &&
          S.ok === O.ok + S.random.ok &&
          S.of100 === Math.round((S.ok / S.n) * 100)
      );
      X("stress");
      chk(
        "the screen with the engine: the full count and the credit",
        ov().includes(S.ok.toLocaleString() + " of " + S.n.toLocaleString()) &&
          ov().includes("of 1,000") &&
          ov().includes("Retirement engine by Zack, MIT license") &&
          clean(ov()),
        junk(ov())
      );
      const H2 = stressHelp(c, S);
      chk("what helps most is one change, or none is needed", H2 === null || H2.n === null || typeof H2.n === "string");
      X("close");
      G.chars.length = n0;
      G.active = 0;
      save();
    }
  );
}
