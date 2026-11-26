/* ============================================================================
   SLAM the Game: features/retire.js
   PURPOSE     The one adapter to the retirement engine of Zack Williams (vendor/retire-engine.js, MIT
               license). It turns a SLAM profile into his Scenario type, runs his Monte Carlo and his
               solver (in a Web Worker when the browser allows it), and turns his results back into SLAM
               numbers in today's dollars. Nothing else in the game calls the engine directly.
   INPUT       The profile (c.age, c.ret, c.death, c.take, c.spend, c.invs, c.match, c.x.taxv, c.x.mix,
               c.x.ss, c.x.paths). The global RetireEngine of the bundle.
   OUTPUT      Functions: retireReady, retireYear, retireFiling, retireAllocation, retireGlide,
               retireGlideStock, retireAccounts, retireScenario, retireStrategy, retireDeflate,
               retireSummary, retireRunNow, retireCall, retireKey, retireGet, retireSolveJob,
               retireMethodRate, retireSmileFactor, retireClaim, retireSafeSpend, retireTax, retireSpending, retireSmile.
   DEPENDS ON  vendor/retire-engine.js, core/engine.js, screens/ui.js, core/metrics.js, features/kit.js.
               USES LATER, behind a typeof test: features/taxview.js, features/mix.js, features/paths.js.
   RULES       The engine counts in future dollars. The adapter sets his fixed-inflation mode, so it can
               turn each number back into today's dollars exactly. The seed is fixed, so the same profile
               gives the same answer. With no Worker (Node.js, or a page opened from a file), the work runs
               on the page. The capital market assumptions are his own defaults, and the math boxes say so.
   ========================================================================= */
const RETIRE_SEED = 20261123;
const RETIRE_RUNS = 1000;
const RETIRE_CREDIT = "Retirement engine by Zack, MIT license";
/* The ways to take money out: [type, name, one plain line]. The first is the default. */
const RETIRE_METHODS = [
  [
    "guyton_klinger",
    "Guardrails",
    "Start at your need. Cut 10% when the rate you take drifts 20% too high; raise 10% when it drifts 20% too low.",
  ],
  [
    "fixed_real",
    "The same amount each year",
    "Take the same amount each year, raised for prices, whatever the market does (the 4% rule).",
  ],
  [
    "vanguard_dynamic",
    "Vanguard dynamic spending",
    "Follow the market, but move no more than 5% up or 2.5% down in one year.",
  ],
  [
    "vpw",
    "A share of what is left",
    "Take a set share of what is left each year, by your age. It never runs out, but the amount moves.",
  ],
  ["rmd_method", "The IRS table", "Take what the IRS table for required withdrawals says, each year."],
  ["arva", "Annuity math", "Spend what an annuity would pay on what is left, each year."],
  ["kitces_ratchet", "Ratchet up", "Start low, and raise spending 10% when the money grows past a line. Never cut."],
  ["risk_based", "Keep the odds in a band", "Move spending so the plan stays between 70 and 95 out of 100 working."],
];
/* The Vanguard Target Retirement glide path, as [years from the stop age, stock share]. */
const RETIRE_GLIDE = [
  [-25, 0.9],
  [0, 0.5],
  [7, 0.3],
];
const RETIRE_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];
const RETIRE = { cache: {}, wait: {}, worker: null, noWorker: false, seq: 0, cb: {} };
function retireReady() {
  return typeof RetireEngine !== "undefined" && !!RetireEngine.runSimulation;
}
function retireYear() {
  return +todayISO().slice(0, 4);
}
/* The filing status of his engine, from the tax view (or from the profile). */
function retireFiling(c) {
  const f = typeof taxvInputs === "function" ? taxvInputs(c).filing.v : c.rel === "Married" ? "joint" : "single";
  return f === "joint" ? "married_filing_jointly" : f === "head" ? "head_of_household" : "single";
}
/* His AssetAllocation from a stock, bond and cash share. Stocks split like his default mix. */
function retireAllocation(stock, bond, cash) {
  const s = Math.max(0, stock),
    b = Math.max(0, bond),
    k = Math.max(0, cash == null ? 1 - s - b : cash);
  return {
    usLargeCap: s * 0.7,
    usSmallCap: s * 0.15,
    intlDeveloped: s * 0.15,
    intlEmerging: 0,
    usBonds: b * 0.85,
    tips: b * 0.15,
    cash: k,
  };
}
/* The glide path points for a stop age, in his GlidePathPoint type. */
function retireGlide(ret) {
  return RETIRE_GLIDE.map(p => ({ age: ret + p[0], allocation: retireAllocation(p[1], 1 - p[1], 0) }));
}
/* The stock share of the glide path at an age: his interpolateGlidePath on the Vanguard points. */
function retireGlideStock(age, ret) {
  const g = retireGlide(ret || 65),
    a = retireReady() ? RetireEngine.interpolateGlidePath(age, g, g[0].allocation) : null;
  if (!a) return null;
  return a.usLargeCap + a.usSmallCap + a.intlDeveloped + a.intlEmerging;
}
/* The investment accounts in his Account type, with the mix of each (mix.js) and the money that goes in. */
function retireAccounts(c, ret, monthly) {
  const rows =
      typeof mixAccounts === "function"
        ? mixAccounts(c)
        : [{ i: 0, k: "Your investments", amt: c.inv || 0, kind: "unk" }],
    type = k =>
      /plan at work/i.test(k) ? "traditional_401k" : /ira/i.test(k) ? "roth_ira" : /hsa/i.test(k) ? "hsa" : "taxable",
    total = rows.reduce((s, r) => s + r.amt, 0),
    yearly = Math.max(0, monthly) * 12,
    matchGot = typeof knGot === "function" ? knGot(c, "matchAmt") : null,
    match = c.match === "yes" && matchGot && matchGot.v > 0 ? matchGot.v * 12 : 0;
  const list = rows.length ? rows : [{ i: 0, k: "Your investments", amt: 0, kind: "unk" }];
  return list.map((r, n) => {
    const t = type(r.k),
      glide = r.kind === "td" || r.kind === "unk",
      share = total > 0 ? r.amt / total : n === 0 ? 1 : 0,
      alloc =
        r.kind === "sp" || r.kind === "intl" || r.kind === "single" || r.kind === "crypto"
          ? retireAllocation(1, 0, 0)
          : r.kind === "bond"
            ? retireAllocation(0, 1, 0)
            : r.kind === "cash"
              ? retireAllocation(0, 0, 1)
              : retireAllocation(0.6, 0.4, 0);
    return {
      id: "slam-acct-" + n,
      owner: "self",
      label: r.k,
      type: t,
      balance: r.amt,
      costBasis: r.amt,
      annualContribution: yearly * share,
      employerMatch: t === "traditional_401k" ? match : 0,
      contributionEndAge: ret,
      allocation: alloc,
      useGlidePath: glide,
      glidePath: glide ? retireGlide(ret) : [],
      fixedAnnualReturn: null,
    };
  });
}
/* A withdrawal method in his type. rate is the starting rate (need ÷ money at the stop age). */
function retireStrategy(type, rate, smile) {
  const r = Math.max(0.01, Math.min(0.15, rate || 0.04)),
    P = {
      fixed_real: { withdrawalRate: r },
      guyton_klinger: { initialRate: r, ceilingMultiplier: 0.2, floorMultiplier: 0.2, adjustmentPercent: 0.1 },
      vanguard_dynamic: { initialRate: r, ceilingPercent: 0.05, floorPercent: 0.025 },
      vpw: {},
      rmd_method: { smoothingYears: 3 },
      arva: { realDiscountRate: 0.02 },
      kitces_ratchet: { initialRate: r, ratchetThreshold: 0.5, ratchetIncrease: 0.1 },
      risk_based: { targetSuccessLow: 0.7, targetSuccessHigh: 0.95, adjustmentStep: 0.05, initialRate: r },
    };
  return { type: P[type] ? type : "guyton_klinger", params: P[type] || P.guyton_klinger, useSpendingSmile: !!smile };
}
/* THE SCENARIO. o: { ret, spend (a year), monthly (invested), claim (Social Security age), method, rate,
   smile, runs, infl, plan (true: the spending is a listed expense, so it is the plan; false: the method drives) } */
function retireScenario(c, o) {
  o = o || {};
  const E = RetireEngine,
    D0 = E.defaults,
    d = derive(c),
    age = c.age,
    ret = Math.round(o.ret != null ? o.ret : Math.max(age, c.ret)),
    end = Math.max(ret + 1, c.death || 90),
    birth = retireYear() - age,
    gross = knNet(c).gross * 12,
    spend = o.spend != null ? o.spend : d.fiSpend,
    monthly = o.monthly != null ? o.monthly : Math.max(0, (c.take || 0) - (c.spend || 0)),
    p = passives(c),
    infl = o.infl != null ? o.infl : c.x && c.x.paths && c.x.paths.infl ? c.x.paths.infl.v : 0.025,
    state = typeof taxvInputs === "function" ? taxvInputs(c).state.v : "",
    incomes = [];
  if (WORKER(c) && age < ret && gross > 0)
    incomes.push({
      id: "slam-pay",
      owner: "self",
      label: "Pay",
      type: "salary",
      annualAmount: gross,
      startAge: age,
      endAge: ret,
      inflationAdjusted: true,
      growthRate: 0,
      taxable: true,
      endsAtRetirement: true,
    });
  if (p.now > 0)
    incomes.push({
      id: "slam-now",
      owner: "self",
      label: "Retirement income",
      type: "other",
      annualAmount: p.now * 12,
      startAge: age,
      endAge: null,
      inflationAdjusted: true,
      growthRate: 0,
      taxable: true,
      endsAtRetirement: false,
    });
  if (p.pen)
    incomes.push({
      id: "slam-pension",
      owner: "self",
      label: "Pension",
      type: "pension",
      annualAmount: p.pen.amt * 12,
      startAge: p.pen.age,
      endAge: null,
      inflationAdjusted: false,
      growthRate: 0,
      taxable: true,
      endsAtRetirement: false,
    });
  const ss = Math.round(p.full * p.sh),
    fra = D0.fraForBirthYear(birth);
  return {
    id: "slam-" + (c.name || "you"),
    name: "SLAM profile",
    description: "",
    color: "#3f6dff",
    parentId: null,
    isBaseline: true,
    profile: {
      id: "slam-profile",
      name: String(c.name || "You"),
      birthYear: birth,
      birthMonth: 1,
      sex: "female",
      retirementAge: ret,
      filingStatus: retireFiling(c),
      stateOfResidence: /^[A-Z]{2}$/.test(state) ? state : "",
      spouse: null,
      planningHorizonAge: end,
    },
    accounts: retireAccounts(c, ret, monthly),
    incomeSources: incomes,
    expenses:
      o.plan === false
        ? []
        : [
            {
              id: "slam-spend",
              label: "Spending in retirement",
              category: "essential",
              annualAmount: spend,
              startAge: ret,
              endAge: null,
              inflationRate: null,
            },
          ],
    lifeEvents: [],
    socialSecurity: Object.assign({}, D0.DEFAULT_SS_CONFIG, {
      self: { enabled: ss > 0, fraMonthlyBenefit: ss, claimingAge: o.claim || 67, fra },
      spouse: null,
    }),
    withdrawalStrategy: retireStrategy(o.method || "guyton_klinger", o.rate, o.smile),
    withdrawalOrder: Object.assign({}, D0.DEFAULT_WITHDRAWAL_ORDER),
    simulationConfig: Object.assign({}, D0.DEFAULT_SIMULATION_CONFIG, {
      iterations: o.runs || RETIRE_RUNS,
      seed: RETIRE_SEED,
      inflationMode: "fixed",
      fixedInflationRate: infl,
      longevityModel: "fixed_age",
      fixedEndAge: end,
    }),
    createdAt: "2026-11-23T00:00:00.000Z",
    updatedAt: "2026-11-23T00:00:00.000Z",
  };
}
/* A future-dollar amount at an age, in today's dollars. */
function retireDeflate(v, age, scn) {
  const now = retireYear() - scn.profile.birthYear;
  return v / Math.pow(1 + scn.simulationConfig.fixedInflationRate, Math.max(0, age - now));
}
/* HIS RESULT AS SLAM NUMBERS, in today's dollars. */
function retireSummary(res, scn) {
  const D = (v, a) => Math.round(retireDeflate(v, a, scn)),
    ret = scn.profile.retirementAge,
    by = (list, a) => (list || []).find(r => r.age === a) || null;
  return {
    of100: Math.round(res.successRate * 100),
    success: res.successRate,
    atRet: D(res.medianPortfolioAtRetirement, ret),
    endMedian: D(res.medianTerminalWealth, scn.profile.planningHorizonAge),
    cutChance: Math.round((res.adjustmentProbability || 0) * 100),
    cutMedian: Math.round((res.medianMaxCutPercent || 0) * 100),
    cutBad: Math.round((res.p90MaxCutPercent || 0) * 100),
    earliest: res.estimatedRetirementAge,
    confident: res.confidenceAge,
    percentiles: (res.wealthByYear || []).map(r => ({
      age: r.age,
      p10: D(r.p10, r.age),
      p25: D(r.p25, r.age),
      p50: D(r.p50, r.age),
      p75: D(r.p75, r.age),
      p90: D(r.p90, r.age),
    })),
    cashflow: (res.wealthByYear || []).map(r => {
      const g = (list, k) => (by(list, r.age) ? D(by(list, r.age).p50, r.age) : 0);
      return {
        age: r.age,
        income: g(res.incomeByYear),
        spending: g(res.spendingByYear),
        tax: g(res.taxByYear),
        ss: g(res.ssIncomeByYear),
        withdrawals: g(res.withdrawalsByYear),
      };
    }),
    schedule: (res.spendingByYear || [])
      .filter(r => r.age >= ret)
      .map(r => ({ age: r.age, p10: D(r.p10, r.age), p50: D(r.p50, r.age), p90: D(r.p90, r.age) })),
    warnings: res.warnings || [],
  };
}
/* Run his Monte Carlo now, on this thread. The tests and the fallback use it. */
function retireRunNow(scn) {
  return RetireEngine.runSimulation(scn);
}
/* A solver trial: the same scenario with the iterations and the seed of the trial (the same as the worker). */
function retireTrial(scn, o) {
  const x = JSON.parse(JSON.stringify(scn));
  x.simulationConfig.iterations = o.iterations;
  x.simulationConfig.seed = o.seed;
  return Promise.resolve(RetireEngine.runSimulation(x));
}
/* ONE JOB, as a promise: { kind: "run", scenario } or { kind: "solve", scenario, input, opts }.
   In a Web Worker when the browser allows it; else on this thread. */
function retireCall(job) {
  if (
    !RETIRE.noWorker &&
    !RETIRE.worker &&
    typeof Worker === "function" &&
    typeof location !== "undefined" &&
    /^https?:/.test(location.protocol)
  ) {
    try {
      RETIRE.worker = new Worker("vendor/retire-worker.js?v=1");
      RETIRE.worker.onmessage = e => {
        const m = e.data || {},
          cb = RETIRE.cb[m.id];
        delete RETIRE.cb[m.id];
        if (cb) cb(m);
      };
      RETIRE.worker.onerror = e => {
        report(e, "retire.js: retireCall (worker)");
        RETIRE.noWorker = true;
        RETIRE.worker = null;
      };
    } catch (e) {
      report(e, "retire.js: retireCall");
      RETIRE.noWorker = true;
    }
  }
  if (RETIRE.worker)
    return new Promise((ok, no) => {
      const id = ++RETIRE.seq;
      RETIRE.cb[id] = m => (m.error ? no(new Error(m.error)) : ok(m.result));
      RETIRE.worker.postMessage(Object.assign({ id }, job));
    });
  /* no Worker: start on the next turn, so the sheet draws its "working" line first */
  return new Promise((ok, no) =>
    setTimeout(() => {
      try {
        if (job.kind === "solve") RetireEngine.solve(job.scenario, job.input, retireTrial, job.opts || {}).then(ok, no);
        else ok(retireRunNow(job.scenario));
      } catch (e) {
        no(e);
      }
    }, 0)
  );
}
/* A short key for a cache entry. */
function retireKey(tag, obj) {
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return tag + ":" + h;
}
/* THE CACHE. retireGet(key, make) returns the answer when it is ready, else null, and starts make() one
   time (make returns a promise). When the answer comes, the open sheet draws again. */
function retireGet(key, make) {
  if (key in RETIRE.cache) return RETIRE.cache[key];
  if (!RETIRE.wait[key]) {
    RETIRE.wait[key] = true;
    let p;
    try {
      p = make();
    } catch (e) {
      report(e, "retire.js: retireGet");
      p = Promise.resolve({ error: String(e.message || e) });
    }
    p.then(
      v => {
        RETIRE.cache[key] = v;
        delete RETIRE.wait[key];
        if (typeof SH !== "undefined" && SH && typeof drawSheet === "function") drawSheet();
      },
      e => {
        report(e, "retire.js: retireGet (answer)");
        RETIRE.cache[key] = { error: String((e && e.message) || e) };
        delete RETIRE.wait[key];
      }
    );
  }
  return null;
}
/* A solver job: question is earliest_retirement_age, required_savings or sustainable_spend. */
function retireSolveJob(scn, question, targets) {
  return {
    kind: "solve",
    scenario: scn,
    input: { question, targets },
    opts: { searchIterations: 300, validationIterations: 500 },
  };
}
/* The starting rate of a method: the yearly need ÷ the median money at the stop age (his Monte Carlo, in
   today's dollars). Returns a promise. */
function retireMethodRate(c, o) {
  const scn = retireScenario(c, Object.assign({}, o, { runs: 300 }));
  return retireCall({ kind: "run", scenario: scn }).then(res => {
    const at = retireDeflate(res.medianPortfolioAtRetirement, scn.profile.retirementAge, scn),
      need = scn.expenses.length ? scn.expenses[0].annualAmount : 0;
    return at > 0 ? need / at : 0.04;
  });
}
/* The spending smile: the value of retirement spending with the smile, next to flat spending, from the
   stop age to the end age, at a real return r. His blanchettSpendingMultiplier gives each year. */
function retireSmileFactor(c, r, ret) {
  ret = ret || Math.max(c.age, c.ret);
  const end = Math.max(ret + 1, c.death || 90);
  let flat = 0,
    smile = 0;
  for (let a = ret; a < end; a++) {
    const v = 1 / Math.pow(1 + r, a - ret);
    flat += v;
    smile += v * RetireEngine.blanchettSpendingMultiplier(a, ret);
  }
  return flat > 0 ? smile / flat : 1;
}
/* Social Security at a claiming age, a month, with his claimingAdjustment. pia is the benefit at full age. */
function retireClaim(pia, claimAge, birthYear) {
  const fra = RetireEngine.defaults.fraForBirthYear(birthYear);
  return pia * RetireEngine.claimingAdjustment(claimAge, fra);
}
/* The safe yearly spend from invested money, by a way to take money out: the first year of that method at
   its own default starting rate (his defaults: guardrails 5%, the same amount 4%, Vanguard 4.5%). */
function retireSafeSpend(inv, method, age) {
  const rate = { guyton_klinger: 0.05, vanguard_dynamic: 0.045 }[method] || 0.04,
    strat = retireStrategy(method, rate, false),
    st = {
      initialTotalBalance: inv,
      retirementBalance: inv,
      priorYearSpending: 0,
      priorYearReturn: 0,
      cumulativeInflation: 1,
      currentYearInflation: 0,
      yearsInRetirement: 0,
      currentAge: age,
      endAge: 95,
      priorYearWithdrawalRate: 0,
      portfolioExpectedReturn: 0.05,
      portfolioVolatility: 0.12,
      portfolioEquityWeight: 0.6,
    };
  return { year: inv > 0 ? RetireEngine.computeAnnualSpending(inv, st, strat) : 0, rate };
}
/* TAXES FOR ONE YEAR, from his 2026 tables. filing is the game's word (single, joint, head). state is a
   two-letter code or "". Returns the federal and state tax (his computeFederalTax), the bracket, the room
   in it, the 0% gains room, and the payroll tax. */
function retireTax(gross, pre, filing, state, age) {
  const D = RetireEngine.data,
    fs = filing === "joint" ? "married_filing_jointly" : filing === "head" ? "head_of_household" : "single",
    agi = Math.max(0, gross - pre),
    T = RetireEngine.computeFederalTax({
      ordinaryIncome: agi,
      longTermCapGains: 0,
      ssIncome: 0,
      filingStatus: fs,
      selfAge: age || 40,
      spouseAge: null,
      year: D.TAX_BASE_YEAR,
      cumulativeInflation: 1,
      stateOfResidence: state || "",
    }),
    std = D.STANDARD_DEDUCTION[fs],
    taxable = Math.max(0, agi - std),
    B = D.FEDERAL_BRACKETS[fs];
  let k = 0;
  B.forEach((b, i) => {
    if (taxable > b.threshold) k = i;
  });
  const zero = (D.LTCG_BRACKETS[fs].find(b => b.rate > 0) || { threshold: 0 }).threshold,
    stc = state && D.STATE_TAX[state] ? D.STATE_TAX[state] : null,
    fica = Math.min(gross, D.SS_WAGE_BASE_2026) * D.OASDI_RATE + gross * D.MEDICARE_RATE;
  return {
    fs,
    agi,
    std,
    taxable,
    federal: T.federalTax,
    state: T.stateTax,
    top: B[k].rate,
    next: k + 1 < B.length ? B[k + 1].threshold : null,
    brackets: B.map(b => [b.threshold, b.rate]),
    zero,
    gainsRoom: Math.max(0, zero - taxable),
    fica,
    payroll: { oasdi: D.OASDI_RATE, base: D.SS_WAGE_BASE_2026, medicare: D.MEDICARE_RATE },
    stateCfg: stc
      ? { std: stc.standardDeduction[fs], brackets: stc.brackets[fs].map(b => [b.threshold, b.rate]) }
      : null,
    year: D.TAX_BASE_YEAR,
    info: RetireEngine.dataInfo,
  };
}
/* The spending of one year by a way to take money out: his computeAnnualSpending. odds.js uses it in the replay of history. */
function retireSpending(balance, state, strategy) {
  return RetireEngine.computeAnnualSpending(balance, state, strategy);
}
/* The spending smile at an age (Blanchett 2014): his blanchettSpendingMultiplier. */
function retireSmile(age, ret) {
  return RetireEngine.blanchettSpendingMultiplier(age, ret);
}
