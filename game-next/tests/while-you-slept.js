/* ============================================================================
   SLAM the Game, test: tests/while-you-slept.js
   PURPOSE     Examine "While you slept": the earnings per hour, day, month and year, the crossover, the
               slim line on Home past $1,000, and the gentle debt line.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/slept.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Sleep",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 800,
      incs: [R0({ k: "A main job", amt: 4000 })],
      spends: [R0({ k: "Home", amt: 1500 }), R0({ k: "Food", amt: 1500 })],
      cashes: [R0({ k: "Checking", amt: 5000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 800 })],
      debts: [R0({ k: "Credit card balance", amt: 5000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  chk("no line on Home at $1,000 or less", !app().includes("sleptrow"));
  const c = C();
  c.invs[0].amt = 120000;
  syncAll(c);
  save();
  go("home");
  chk("past $1,000 the slim line shows", app().includes("sleptrow") && app().includes("while you slept"));
  const S = sleptCalc(c);
  chk(
    "per hour, day, month and year at the plan's return",
    Math.abs(S.year - 120000 * R) < 1e-9 &&
      Math.abs(S.day - S.year / 365) < 1e-9 &&
      Math.abs(S.hour - S.year / 8760) < 1e-9 &&
      Math.abs(S.month - S.year / 12) < 1e-9
  );
  kitStore(c, "paths").ret = { v: 0.05, cf: 2 };
  chk("the return follows the plan's choice in the two paths", Math.abs(sleptCalc(c).year - 120000 * 0.05) < 1e-9);
  chk(
    "high-interest debt shows its cost per day",
    Math.abs(S.debtDay - (5000 * debtRate(c.debts[0]).r) / 100 / 365) < 1e-9
  );
  X("slept");
  chk(
    "the sheet: four tiles, the wage next to it, the gentle debt line, the math",
    ov().includes("An hour") &&
      ov().includes("A year") &&
      ov().includes("real hourly wage") &&
      ov().includes("a day. Each extra payment") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  c.invs[0].amt = 5e7;
  syncAll(c);
  X("slept");
  chk("past the crossover, it is celebrated", sleptCalc(c).cross && ov().includes("Crossover"));
  G.chars.length = n0;
  G.active = 0;
  save();
}
