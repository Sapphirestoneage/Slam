/* ============================================================================
   SLAM the Game, test: tests/retirement-engine.js
   PURPOSE     Examine the retirement engine of Zack Williams (vendor/retire-engine.js) and its one adapter
               (features/retire.js): the bundle and its license, the profile turned into his Scenario, the
               adapter matches his engine on a fixed scenario (same seed, same result), the numbers in
               today's dollars, the solver, the spending smile, the claiming ages, and that no other file
               calls the engine.
   INPUT       The game scripts, loaded by harness.cjs. One fixed sample profile.
   OUTPUT      One result for each chk() call. Some checks wait for a promise.
   DEPENDS ON  tests/harness.cjs. Examines: vendor/retire-engine.js, vendor/retire-worker.js, features/retire.js.
   ========================================================================= */
{
  const fs = require("fs"),
    n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Eng",
      led: true,
      placed: true,
      age: 40,
      ret: 62,
      death: 92,
      take: 7000,
      spend: 5000,
      inv: 400000,
      rel: "Married",
      incs: [R0({ k: "A main job", amt: 7000 })],
      spends: [R0({ k: "Home", amt: 2500 }), R0({ k: "Food", amt: 2500 })],
      cashes: [R0({ k: "Checking", amt: 20000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 300000 }), R0({ k: "Other investments", amt: 100000 })],
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
    bundle = fs.readFileSync(GAME_DIR + "vendor/retire-engine.js", "utf8"),
    lic = fs.readFileSync(GAME_DIR + "vendor/RETIRE-ENGINE-LICENSE.txt", "utf8"),
    worker = fs.readFileSync(GAME_DIR + "vendor/retire-worker.js", "utf8");
  chk(
    "the bundle is loaded, with one global and its source",
    retireReady() &&
      /boatbomber\/RetirementPlanner/.test(RetireEngine.source.repo) &&
      /^[0-9a-f]{40}$/.test(RetireEngine.source.commit)
  );
  chk(
    "the MIT license and the copyright line are at the top of the bundle and in their own file",
    /^\/\* Retirement engine by Zack Williams/.test(bundle) &&
      bundle.slice(0, 2000).includes("Copyright (c) 2026, Zack Williams") &&
      /MIT License/.test(lic) &&
      lic.includes("Copyright (c) 2026, Zack Williams")
  );
  chk(
    "the worker loads the bundle and runs a simulation or the solver",
    /importScripts\("retire-engine\.js"\)/.test(worker) && /RetireEngine\.solve/.test(worker)
  );
  chk(
    "the tax data of the engine is JSON in game/data/",
    ["federal-tax-2026", "state-income-tax-2026", "payroll-tax-2026"].every(f =>
      fs.existsSync(GAME_DIR + "data/retire-" + f + ".json")
    )
  );
  /* the profile as his Scenario */
  kitStore(c, "mix").in_0 = { v: "td", cf: 2 };
  kitStore(c, "mix").in_1 = { v: "bond", cf: 2 };
  kitStore(c, "taxv").state = { v: "NY", cf: 2 };
  const scn = retireScenario(c, {}),
    p = passives(c);
  chk(
    "the profile turns into his Scenario",
    scn.profile.retirementAge === 62 &&
      scn.profile.planningHorizonAge === 92 &&
      scn.profile.filingStatus === "married_filing_jointly" &&
      scn.profile.stateOfResidence === "NY" &&
      scn.accounts.length === 2 &&
      scn.accounts[0].type === "traditional_401k" &&
      scn.accounts[0].useGlidePath &&
      scn.accounts[1].type === "taxable" &&
      scn.accounts[1].allocation.usBonds > 0.8 &&
      Math.abs(scn.accounts.reduce((s, x) => s + x.annualContribution, 0) - 24000) < 1e-6 &&
      scn.expenses[0].annualAmount === derive(c).fiSpend &&
      scn.socialSecurity.self.fraMonthlyBenefit === Math.round(p.full * p.sh) &&
      scn.simulationConfig.inflationMode === "fixed" &&
      scn.simulationConfig.seed === RETIRE_SEED &&
      scn.simulationConfig.iterations === 1000
  );
  chk(
    "the glide path of the guide comes from his interpolateGlidePath",
    Math.abs(retireGlideStock(37, 62) - 0.9) < 1e-9 &&
      Math.abs(retireGlideStock(62, 62) - 0.5) < 1e-9 &&
      Math.abs(mixGuide(50, 62).stock - retireGlideStock(50, 62)) < 1e-12
  );
  /* the adapter matches his engine: same seed, same result */
  const own = RetireEngine.runSimulation(JSON.parse(JSON.stringify(scn))),
    again = retireRunNow(retireScenario(c, {}));
  chk(
    "same seed, same result: two runs match to the dollar",
    own.successRate === again.successRate &&
      own.medianPortfolioAtRetirement === again.medianPortfolioAtRetirement &&
      own.medianTerminalWealth === again.medianTerminalWealth
  );
  const S = retireSummary(own, scn);
  chk(
    "his result in today's dollars: the fixed inflation taken out exactly",
    S.of100 === Math.round(own.successRate * 100) &&
      S.atRet ===
        Math.round(own.medianPortfolioAtRetirement / Math.pow(1 + scn.simulationConfig.fixedInflationRate, 22))
  );
  chk(
    "the percentile, cash flow and withdrawal tables come out by age",
    S.percentiles.length === own.wealthByYear.length &&
      S.percentiles[0].p10 <= S.percentiles[0].p90 &&
      S.cashflow.length > 0 &&
      S.schedule.every(r => r.age >= 62)
  );
  chk(
    "the spending smile: 1 at 65, lower by 85, and a factor under 1",
    Math.abs(retireSmile(65, 62) - 1) < 0.05 &&
      retireSmile(85, 62) < retireSmile(66, 62) &&
      retireSmileFactor(c, 0.05) < 1
  );
  const pia = 2000;
  chk(
    "claiming ages: less at 62, the full amount at 67, more at 70",
    retireClaim(pia, 62, 1986) < pia &&
      Math.abs(retireClaim(pia, 67, 1986) - pia) < 1e-9 &&
      retireClaim(pia, 70, 1986) > pia
  );
  chk(
    "the safe yearly spend of a method is its starting rate on the money",
    Math.abs(retireSafeSpend(1000000, "fixed_real", 65).year - 40000) < 1 &&
      Math.abs(retireSafeSpend(1000000, "guyton_klinger", 65).year - 50000) < 1
  );
  /* nothing else calls the engine */
  const files = fs
    .readdirSync(GAME_DIR + "features")
    .filter(f => /\.js$/.test(f) && f !== "retire.js")
    .map(f => "features/" + f)
    .concat(
      fs.readdirSync(GAME_DIR + "features/sims").map(f => "features/sims/" + f),
      ["screens/ui.js", "core/engine.js", "core/metrics.js"]
    );
  chk(
    "only features/retire.js calls the engine",
    files.every(f => !/RetireEngine\./.test(fs.readFileSync(GAME_DIR + f, "utf8")))
  );
  /* the adapter's promise and the solver */
  retireCall({ kind: "run", scenario: retireScenario(c, {}) }).then(r => {
    chk(
      "the adapter's job gives the same result as his engine",
      r.successRate === own.successRate && r.medianPortfolioAtRetirement === own.medianPortfolioAtRetirement
    );
    const s2 = retireScenario(c, { runs: 500 });
    retireCall(
      retireSolveJob(s2, "earliest_retirement_age", {
        retirementAge: 62,
        annualSpend: derive(c).fiSpend,
        successRate: 0.9,
      })
    ).then(x => {
      chk(
        "his solver answers when the player can stop at 90 out of 100",
        x.question === "earliest_retirement_age" && x.solvedValue >= c.age && x.solvedValue <= 87
      );
      G.chars.length = n0;
      G.active = 0;
      save();
    });
  });
}
