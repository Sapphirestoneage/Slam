/* ============================================================================
   SLAM the Game, test: tests/investing.js
   PURPOSE     Examine Investing (run Finish everything partly built, Part 13): the copy of the engine,
               the household mix of every account (the stock share next to a target, the three-fund
               check, employer stock and any one company), the fee and product X-ray (funds one by one,
               a fund with no fee, a sales charge, an account fee, the advisor fee), invest or pay debt
               (the grid and the player's own debts), Roth or traditional account by account, the menu
               rows and the spreadsheet rows.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/invest.js, features/mix.js, features/invest.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Invest",
      led: true,
      placed: true,
      age: 35,
      ret: 65,
      take: 6000,
      spend: 4500,
      inv: 100000,
      incs: [R0({ k: "A main job", amt: 6000 })],
      spends: [R0({ k: "Home", amt: 2500 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 9000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 60000 }), R0({ k: "Brokerage", amt: 40000 })],
      debts: [R0({ k: "Credit card", amt: 5000, rate: 24 })],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  const pb = require("child_process").spawnSync(
    process.execPath,
    [GAME_DIR + "../tools/game_invest_build.mjs", "--check"],
    { encoding: "utf8" }
  );
  chk("core/invest.js is the same code as js/math/invest.js of the main app", pb.status === 0, pb.stdout);
  chk(
    "the menu has the three investing rows in Tools",
    ["mix", "ivheat", "ivroth"].every(
      k => MENU.some(m => m[1] === k) && MENU_GROUPS.find(g => g[0] === "tools")[3].includes(k)
    )
  );
  /* the household mix */
  X("mix");
  X("kitset", "sp", "mix|in_0", { t: "s" });
  X("kitset", "0.05", "mix|fee_0", { t: "s" });
  X("kitset", "single", "mix|in_1", { t: "s" });
  X("kitset", "0", "mix|fee_1", { t: "s" });
  X("kitset", "0.25", "mix|emp_0", { t: "n" });
  X("kitset", "0.5", "mix|big_1", { t: "n" });
  let M = mixCalc(C());
  chk(
    "all accounts: 100% stocks, 60% US, 40% single companies",
    Math.abs(M.stock - 1) < 1e-9 && Math.abs(M.H.shares.us - 0.6) < 1e-9 && Math.abs(M.single - 0.4) < 1e-9,
    M.H.shares
  );
  chk(
    "next to the age guide when no target is tapped",
    M.H.aim.source === "the age guide" && Math.abs(M.H.aim.stock - mixGuide(35, 65).stock) < 1e-9
  );
  X("kitset", "0.8", "mix|target", { t: "s" });
  M = mixCalc(C());
  chk(
    "your own target: 80%, drift 20 points, past the 5 point line",
    M.H.aim.stock === 0.8 && Math.abs(M.H.drift - 0.2) < 1e-9 && M.H.drifted
  );
  chk(
    "three-fund check: 60% inside the three, single stocks outside, no bonds yet",
    Math.abs(M.H.inside - 0.6) < 1e-9 &&
      M.H.outside.some(o => o.k === "single") &&
      M.H.three.find(t => t.k === "bonds").held === false
  );
  chk(
    "one company: employer stock 15% of everything, one company 20%, both past 10%",
    Math.abs(M.H.conc.employerShare - 0.15) < 1e-9 &&
      Math.abs(M.H.conc.biggest.share - 0.2) < 1e-9 &&
      M.H.conc.over.length === 2
  );
  chk(
    "the screen: the stat row, the mix, the three-fund check, one company, the sources",
    ov().includes("Your mix, all accounts") &&
      ov().includes("Three-fund check") &&
      ov().includes("One company") &&
      ov().includes("FINRA") &&
      ov().includes("Bogleheads") &&
      ov().includes("Not advice") &&
      clean(ov()),
    junk(ov())
  );
  /* the fee and product X-ray: funds one by one */
  X("mixfadd", "0");
  X("kitset", "intl", "mix|f0_0_in", { t: "s" });
  X("kitset", "0.25", "mix|f0_0_sh", { t: "n" });
  X("kitset", "0.5", "mix|f0_0_er", { t: "s" });
  X("kitset", "5.75", "mix|f0_0_ld", { t: "s" });
  X("mixfadd", "0");
  X("kitset", "bond", "mix|f0_1_in", { t: "s" });
  X("kitset", "0.25", "mix|f0_1_sh", { t: "n" });
  X("kitset", "50", "mix|afee_1", { t: "n" });
  X("kitset", "1", "mix|adv", { t: "s" });
  M = mixCalc(C());
  const A0 = M.A[0];
  chk(
    "two funds in the plan at work, the rest at its own fee",
    A0.funds.length === 2 && Math.abs(A0.rest - 0.5) < 1e-9
  );
  chk(
    "fees a year: each fund x its fee, a fund with no fee counts none, plus the account fee and the advisor",
    Math.abs(M.feeYear - (15000 * 0.005 + 30000 * 0.0005 + 60000 * 0.01 + 50 + 40000 * 0.01)) < 1e-6,
    M.feeYear
  );
  chk(
    "a fund with no fee yet is named, never made up",
    M.F.missing.some(n => /Fund 2/.test(n))
  );
  chk(
    "the sales charge: $57.50 of each $1,000",
    M.F.loads.length === 1 && Math.abs(M.F.loads[0].per1000 - 57.5) < 1e-9
  );
  chk(
    "international and bonds now held: the three-fund check sees all three",
    M.H.three.every(t => t.held)
  );
  chk(
    "the X-ray on the screen, with the Product X-ray for insurance",
    ov().includes("Every fund and fee") &&
      ov().includes("no fee yet") &&
      ov().includes("sales charge") &&
      ov().includes('data-a="xray"') &&
      clean(ov()),
    junk(ov())
  );
  X("mixfdel", "0");
  chk("remove the last fund", mixAccounts(C())[0].funds.length === 1);
  /* invest or pay debt */
  X("ivheat");
  const Hh = ivgHeat(C());
  const cell = ivHeatCell(0.24, Hh.ret);
  chk(
    "the grid: the card's 24% row and the plan's return column are on it",
    W.kind === "ivheat" && Hh.H.grid.some(g => g.mine && Math.abs(g.apr - 0.24) < 1e-9) && Hh.H.returns.includes(Hh.ret)
  );
  chk(
    "one square: $1,000 for five years, the debt at 24% monthly, the return yearly",
    Math.abs(cell.debt - 1000 * (Math.pow(1.02, 60) - 1)) < 1e-6 &&
      Math.abs(cell.invest - 1000 * (Math.pow(1 + Hh.ret, 5) - 1)) < 1e-6 &&
      cell.side === "debt"
  );
  chk(
    "the screen: the grid, your debt's line, the sure saving, no red",
    ov().includes("Rate x return") && ov().includes("is sure") && !/var\(--(bad|red)/.test(ov()) && clean(ov()),
    junk(ov())
  );
  /* Roth or traditional, by account */
  X("ivroth");
  let Rr = ivgRoth(C());
  chk(
    "each account named, the plan at work has a choice, the brokerage does not",
    Rr.R.rows.length === 2 && Rr.R.rows[0].choice === "plan" && Rr.R.rows[1].choice === null
  );
  X("kitset", "100000", "taxv|gross", { t: "n" });
  X("ivroth");
  Rr = ivgRoth(C());
  const r0 = Rr.R.rows[0];
  chk(
    "the rate now is federal + state, from the tax view",
    r0.ready && Math.abs(r0.nowRate - (taxvCalc(C()).top + ivgStateRate(taxvCalc(C()).X))) < 1e-9,
    r0
  );
  chk(
    "the same rule as the launch window: $1,000 x (now - later)",
    Math.abs(r0.yearGap - 1000 * (r0.nowRate - r0.laterRate)) < 1e-6 &&
      Math.abs(
        r0.M.monthly - crRothTrad({ yearly: 1000, nowPct: r0.nowRate * 100, laterPct: r0.laterRate * 100 }).monthly
      ) < 1e-9
  );
  X("kitset", "150000", "ivr|income", { t: "s" });
  chk("a higher income in retirement raises the estimate", ivgRoth(C()).R.rows[0].laterRate >= r0.laterRate);
  X("ivroth");
  chk(
    "the screen: rates now and later, city tax said plainly, no verdict",
    ov().includes("Your rate now") && ov().includes("In retirement, about") && ov().includes("City tax") && clean(ov()),
    junk(ov())
  );
  const tone = h => !/mistake|failed|behind|off track|\bbad\b|\bwrong\b|\u2014/i.test(h);
  chk("calm words: no verdict, no em dash", tone(ov()));
  const B = ivBook(C());
  chk(
    "the spreadsheet: the Roth rule and the grid square, with formulas",
    B.rows.some(r => /^iv_gap/.test(r.id) && r.f) && B.rows.some(r => /^iv_heat/.test(r.id) && r.f)
  );
  X("close");
  G.chars.length = n0;
  G.active = act0;
  save();
  go("home");
}
