/* ============================================================================
   SLAM the Game, test: tests/tax-view.js
   PURPOSE     Examine the tax view: the 2026 tables of the retirement engine (federal, payroll, state), the
               rates, the room, pre-tax or Roth, the 0% gains room, the state tap list, and the feed into the
               key numbers (no more 80% default).
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/taxview.js, features/retire.js (retireTax),
               core/metrics.js (knNet).
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Tess",
      led: true,
      placed: true,
      age: 35,
      ret: 60,
      take: 6000,
      spend: 4000,
      inv: 150000,
      rel: "Single, seeking",
      incs: [R0({ k: "A main job", amt: 6000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 15000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 150000 })],
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
  const X0 = retireTax(90000, 0, "single", "", 35);
  chk(
    "the engine's 2026 tables: the IRS source and date, the standard deduction",
    X0.year === 2026 &&
      /irs\.gov/.test(X0.info["federal-tax-2026"].source) &&
      X0.std === 16100 &&
      /taxfoundation/.test(X0.info["state-income-tax-2026"].source)
  );
  chk(
    "bracket math by hand: $90,000 single is $10,970 in the 22% bracket",
    Math.round(X0.federal) === 10970 && X0.top === 0.22 && X0.next === 105700 && X0.taxable === 73900
  );
  chk(
    "joint and head of household use their own lines",
    retireTax(124000, 0, "joint", "", 35).top === 0.12 && retireTax(124000, 0, "head", "", 35).top === 0.22
  );
  chk(
    "a state with income tax adds state tax, a state with none adds none",
    retireTax(90000, 0, "single", "CA", 35).state > 0 && retireTax(90000, 0, "single", "TX", 35).state === 0
  );
  const before = knNet(c);
  chk("before an answer the key numbers use the 80% default", before.f === KN_NET && !before.known);
  X("taxv");
  chk(
    "the screen: chips, Guess / Close / Exact, the state as one tap list, the sources, the credit, the math",
    W.kind === "taxv" &&
      ov().includes('data-a="kitset"') &&
      ov().includes(">Exact<") &&
      ov().includes('data-k="taxv|state" data-v="NY"') &&
      ov().includes("taxfoundation.org") &&
      ov().includes("Retirement engine by Zack, MIT license") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  X("kitset", "90000", "taxv|gross", { t: "n" });
  const T = taxvCalc(c);
  chk(
    "pay before taxes of $90,000: taxable, top, average, room",
    T.taxable === 73900 && T.top === 0.22 && Math.abs(T.avg - 10970 / 90000) < 1e-6 && T.room === 105700 - 73900
  );
  chk("0% gains room is the line minus taxable income", T.gainsRoom === Math.max(0, X0.zero - 73900));
  const after = knNet(c);
  chk(
    "the key numbers now use the tax view, not 80%",
    after.known && after.from === "taxview" && after.f !== KN_NET && Math.abs(after.f - T.netShare) < 1e-9
  );
  X("kitset", "CA", "taxv|state", { t: "s" });
  const Tc = taxvCalc(c);
  chk(
    "a state tap: the average rate is federal plus state",
    Tc.stateTax > 0 && Math.abs(Tc.avg - (Tc.federal + Tc.stateTax) / 90000) < 1e-9 && Tc.net < T.net
  );
  X("kitset", "1000", "taxv|pre", { t: "n" });
  const T2 = taxvCalc(c);
  chk("pre-tax money lowers taxable income", T2.taxable === 73900 - 12000 && T2.federal < Tc.federal);
  chk(
    "a low rate now leans Roth, a high one leans pre-tax (the same rule as the account line)",
    taxvCalc(c, { gross: 30000, pre: 0 }).lean === "Roth" && taxvCalc(c, { gross: 300000, pre: 0 }).lean === "Pre-tax"
  );
  X("kitpad", "", "taxv|gross");
  ["8", "0", "0", "0", "0"].forEach(k => X("key", k, "kttaxv_gross"));
  X("kittyped", "", "taxv|gross");
  chk("typing the exact number makes it Exact", c.x.taxv.gross.v === 80000 && c.x.taxv.gross.cf === 3);
  X("kitsure", "1", "taxv|gross");
  chk("the player can mark it a Guess again", c.x.taxv.gross.cf === 1 && taxvCalc(c).st === "Guess");
  chk(
    "the menu has it",
    MENU.some(m => m[1] === "taxv")
  );
  G.chars.length = n0;
  G.active = 0;
  save();
}
