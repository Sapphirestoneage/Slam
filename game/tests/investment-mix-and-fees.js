/* ============================================================================
   SLAM the Game, test: tests/investment-mix-and-fees.js
   PURPOSE     Examine the investment mix and fees: the mix by what is inside, the age guide and its
               source, the fees a year in dollars, the fees over 30 years in dollars and days, the two
               paths side by side, and the live key number "Stock share".
   INPUT       The game scripts, loaded by harness.cjs. One sample profile with two accounts.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/mix.js, core/metrics.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Mix",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 5000,
      spend: 4000,
      inv: 100000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 9000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 60000 }), R0({ k: "Other investments", amt: 40000 })],
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
    "the age guide: 90% stocks 25 years out, 50% at the stop age, 30% seven years after",
    mixGuide(30, 60).stock === 0.9 &&
      Math.abs(mixGuide(60, 60).stock - 0.5) < 1e-9 &&
      Math.abs(mixGuide(67, 60).stock - 0.3) < 1e-9 &&
      /Vanguard/.test(mixGuide(30).source)
  );
  X("mix");
  X("kitset", "sp", "mix|in_0", { t: "s" });
  X("kitset", "0.05", "mix|fee_0", { t: "s" });
  X("kitset", "bond", "mix|in_1", { t: "s" });
  X("kitset", "1", "mix|fee_1", { t: "s" });
  X("kitset", "1", "mix|adv", { t: "s" });
  const M = mixCalc(c);
  chk(
    "the mix by what is inside: 60% stocks, 40% bonds",
    Math.abs(M.stock - 0.6) < 1e-9 && Math.abs(M.bond - 0.4) < 1e-9
  );
  chk(
    "fees a year in dollars: 60,000 × 1.05% + 40,000 × 2%",
    Math.abs(M.feeYear - (60000 * 0.0105 + 40000 * 0.02)) < 1e-6
  );
  const yours = cpFv(100000, 1000, 30, R - M.avg / 100),
    low = cpFv(100000, 1000, 30, R - 0.0005);
  chk(
    "30 years: the same sum as the Fee X-ray, at your fee and at 0.05%",
    Math.abs(M.yours - yours) < 1e-6 && Math.abs(M.low - low) < 1e-6 && Math.abs(M.lost - (low - yours)) < 1e-6
  );
  chk("fees cost days of freedom", M.days > 0);
  chk("I don't know is a guess, an answer is not", mixAccounts(c)[0].st !== "Guess");
  const ss = knMetrics(c, derive(c)).find(m => m.id === "stockshare");
  chk(
    "Stock share is a live key number now",
    ss && ss.num === M.stock && ss.val === "60%" && !KN_LATER.some(x => /^Stock share/.test(x[0]))
  );
  X("mix");
  chk(
    "the screen: your path and the low-fee path side by side, the guide named, the math",
    ov().includes("Your path") &&
      ov().includes("The low-fee path") &&
      ov().includes("Vanguard Target Retirement") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  G.chars.length = n0;
  G.active = 0;
  save();
}
