/* ============================================================================
   SLAM the Game, test: tests/windfall.js
   PURPOSE     Examine the windfall: the extra money goes down the order of the two paths, each step
               takes what it needs, tax is held back when none came out, the screen, the rows of the
               spreadsheet, the built row and the link from a skill.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/windfall.js on top of features/paths.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Windfall",
      led: true,
      placed: true,
      age: 35,
      ret: 65,
      take: 5000,
      spend: 4000,
      inv: 20000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 400 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 20000 })],
      debts: [R0({ k: "Credit card balance", amt: 3000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    B = pathsBase(c, pathsAssume(c)),
    cash = B.d.cash,
    T = "2026-10-15";
  chk(
    "October leaves 3 months, January 12, December 1",
    windMonthsLeft(T) === 3 && windMonthsLeft("2026-01-02") === 12 && windMonthsLeft("2026-12-31") === 1
  );
  const S = windCalc(c, { amt: 2000, taxed: "yes", today: T }),
    g = S.got,
    s1 = Math.max(0, Math.round(B.starter - cash));
  chk(
    "the steps are the order of the two paths, with tax first",
    S.steps.map(s => s.id).join() === "tax,cushion1,match,debt,cushion2,roth,hsa,k401,taxable" &&
      S.steps.slice(1).every(s => s.label === PATHS_LINE[s.id][0])
  );
  chk("each dollar has one place", S.steps.reduce((x, s) => x + s.amt, 0) === 2000);
  chk(
    "$2,000 with tax taken out: the small cushion first, then the match, then the debt",
    g.tax === 0 &&
      g.cushion1 === Math.min(2000, s1) &&
      g.match === Math.min(2000 - g.cushion1, Math.round(B.matchNeed * 3)) &&
      g.debt === Math.min(2000 - g.cushion1 - g.match, 3000) &&
      S.first.id === (s1 > 0 ? "cushion1" : "match")
  );
  const big = windCalc(c, { amt: 100000, taxed: "yes", today: T }),
    bg = big.got;
  chk(
    "a large amount reaches each step: the debt in full, the cushion to its target, the limits of 2026",
    bg.debt === 3000 &&
      bg.cushion1 + bg.cushion2 === Math.round(B.target - cash) &&
      bg.roth === LIMITS_2026.ira &&
      bg.k401 === Math.round(B.k401 * 3) &&
      bg.taxable === 100000 - bg.cushion1 - bg.match - bg.debt - bg.cushion2 - bg.roth - bg.hsa - bg.k401 &&
      bg.taxable > 0
  );
  chk(
    "the totals: cash, debt, invested, the interest that stops",
    big.toCash === bg.cushion1 + bg.cushion2 &&
      big.toDebt === 3000 &&
      big.invested === bg.match + bg.roth + bg.hsa + bg.k401 + bg.taxable &&
      Math.abs(big.saved - (3000 * B.hiRate) / 100) < 1e-9
  );
  chk(
    "by the stop age: the invested part and the match, grown at the return of the plan for 30 years",
    big.years === 30 &&
      big.grows === Math.round((big.invested + bg.match) * Math.pow(1 + big.ret, 30)) &&
      big.ret === pathsAssume(c).ret.v
  );
  const raw = windCalc(c, { amt: 10000, taxed: "no", today: T }),
    rate = windRate(c).v;
  chk(
    "with no tax taken out, the tax share is held back first",
    rate > 0.05 &&
      rate < 0.6 &&
      raw.got.tax === Math.round(10000 * rate) &&
      raw.first.id === "tax" &&
      raw.steps.reduce((x, s) => x + s.amt, 0) === 10000
  );
  chk("a result on full account limits is a Guess", big.st === "Guess");
  X("windfall");
  chk(
    "the screen: two questions by taps, the first step, where it goes, the math",
    W.kind === "windfall" &&
      ov().includes("How much is it?") &&
      ov().includes("Did tax come out of it?") &&
      ov().includes("Start here") &&
      ov().includes("Where the $5,000 goes") &&
      ov().includes("If these assumptions hold") &&
      ov().includes("Show the math") &&
      ov().includes("Type the exact number") &&
      clean(ov()),
    junk(ov())
  );
  X("kitset", "25000", "wind|amt", { t: "n" });
  X("kitset", "no", "wind|taxed", { t: "s" });
  const now = windCalc(c);
  chk(
    "the taps are kept, and the screen follows",
    now.amount === 25000 &&
      now.taxed === false &&
      ov().includes("Where the $25,000 goes") &&
      ov().includes("Tax on this money") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "each label has an i",
    ["wd_windfall", "wd_taxed", "wd_order", "wd_split", "wd_saved", "wd_grows", "wd_match"]
      .concat(now.steps.map(s => "wd_" + s.id))
      .every(k => GLOSS[k] && ov().includes("term:" + k))
  );
  const Bk = windBook(c),
    val = id => Bk.rows.find(r => r.id === id).v;
  chk(
    "the spreadsheet: the tax and the invested part are formulas that agree with the game",
    val("wd_tax") === Math.round(val("wd_amt") * val("wd_rate")) &&
      val("wd_inv") === val("wd_match") + val("wd_roth") + val("wd_hsa") + val("wd_k401") + val("wd_taxable") &&
      val("wd_grows") === Math.round((val("wd_inv") + val("wd_match")) * Math.pow(1 + val("wd_ret"), val("wd_yrs"))) &&
      BOOK_PARTS.includes(windBook)
  );
  chk("the i of the screen, and the menu", !!NV_INFO.windfall && MENU.some(m => m[1] === "windfall"));
  const row = btRows().find(r => r.n.startsWith("Windfall"));
  chk("the built list has it as built, with its screen", row && row.st === "b" && row.a === "windfall");
  const L = cxLink("entrepreneurship", 18),
    L2 = cxLink("storms-windfalls", 12);
  chk(
    "real skills (plan a windfall, an insurance payout) open it",
    L && L.a === "windfall" && L2 && L2.a === "windfall"
  );
  X("close");
  G.chars.length = n0;
  G.active = 0;
  save();
}
