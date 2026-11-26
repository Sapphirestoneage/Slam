/* ============================================================================
   SLAM the Game, test: tests/canon-meters.js
   PURPOSE     Examine the canon rows finished in Part 21 (features/meters.js on core/canonmath.js): the
               F-You money meter, the noodle budget, pay yourself first, Shockingly Simple Math, the hand-off
               check, the Money Guy's nine, and Your Money or Your Life steps 1b and 3, each worked by hand;
               each sheet opens clean; the path opens steps 1b and 3; the spreadsheet rows; the built list;
               the core copy is current.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/meters.js, core/canonmath.js, features/canon.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Mo",
      led: true,
      placed: true,
      take: 4000,
      spend: 3000,
      payFreq: "Every 2 weeks",
      incs: [R0({ k: "A main job", amt: 4000 })],
      spends: [
        R0({ k: "Rent", amt: 1500 }),
        R0({ k: "Groceries", amt: 500 }),
        R0({ k: "Dining out", amt: 300 }),
        R0({ k: "Fun and everything else", amt: 700 }),
      ],
      cashes: [R0({ k: "Checking", amt: 3000 }), R0({ k: "Savings", amt: 6000 })],
      invs: [R0({ k: "Brokerage", amt: 4000 }), R0({ k: "401(k)", amt: 20000 })],
      debts: [R0({ k: "Credit card", amt: 2000, apr: 24 })],
      moves: [
        { d: "2026-10-02", t: "in", amt: 4000 },
        { d: "2026-10-03", t: "out", amt: 1500, cat: "Home" },
        { d: "2026-10-09", t: "out", amt: 500, cat: "Food" },
      ],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C(),
    clean = h => !/undefined|NaN|\[object/.test(h);
  /* the noodle budget by hand: Rent and Groceries are kept, 2,000 a month; cash 9,000 / 2,000 = 4.5 months */
  const Nd = mtNoodleOf(c);
  chk(
    "noodle: the usual keeps, by hand",
    Nd.ready && Nd.noodle === 2000 && Math.abs(Nd.months - 4.5) < 1e-9,
    JSON.stringify([Nd.noodle, Nd.months])
  );
  X("noodle");
  chk(
    "the noodle sheet opens clean",
    ov().includes("noodle budget") && ov().includes(money(2000)) && clean(ov()),
    junk(ov())
  );
  X("mtkeep", "2");
  chk("a tap keeps Dining out too", mtNoodleOf(c).noodle === 2300);
  X("mtkeep", "2");
  X("close");
  /* F-You money by hand: cash 9,000 + taxable 4,000 = 13,000; 3,000 - 250 + 600 = 3,350 a month: 3.88 months */
  X("fyou");
  X("mtset", "tax", "fy.inv");
  X("mtset", "250", "fy.work");
  X("mtset", "600", "fy.health");
  let F = mtFyouOf(c);
  chk(
    "F-You money: the months, by hand",
    F.ready && F.reach === 13000 && F.walk === 3350 && Math.abs(F.months - 13000 / 3350) < 1e-9,
    JSON.stringify([F.reach, F.walk, F.months])
  );
  chk("F-You money reads the noodle month", Math.abs(F.onFloor - 6.5) < 1e-9, F.onFloor);
  chk("F-You money is Exact with real numbers and every tap", F.st === "Exact", F.st);
  chk(
    "the F-You sheet opens clean",
    ov().includes("F-You money") && ov().includes(money(13000)) && clean(ov()),
    junk(ov())
  );
  X("mtset", "600", "fy.health");
  chk(
    "the same tap again clears it, and the state is Close",
    mtFyouOf(c).st === "Close" && mtFyouOf(c).counted.health === false
  );
  X("close");
  /* pay yourself first: $500 before the pay lands, 26 paychecks a year: 500 / (26 / 12) = 230.77 a paycheck */
  X("mtpay");
  X("mtset", "500", "pf.pre");
  const P = mtPayOf(c);
  chk(
    "pay yourself first: a paycheck, by hand",
    Math.abs(P.perPaycheck - 500 / (26 / 12)) < 1e-9 && P.left === 4000,
    JSON.stringify([P.perPaycheck, P.left])
  );
  chk("the pay sheet opens clean", ov().includes("Pay yourself first") && clean(ov()), junk(ov()));
  X("close");
  /* Shockingly Simple Math: 25% kept; the next step is 30%, and it is sooner */
  X("simplemath");
  const S = mtSimpleOf(c);
  chk(
    "Shockingly Simple Math: your rate and the next step",
    Math.abs(S.you.rate - 0.25) < 1e-9 && Math.abs(S.next.rate - 0.3) < 1e-9 && S.gain > 0,
    JSON.stringify([S.you, S.next])
  );
  chk(
    "the same loop as the web app's M72",
    S.you.years === cmYearsAtRate(0.25, { realReturn: R, withdrawalRate: SWR })
  );
  chk("the simple math sheet opens clean", ov().includes("Shockingly Simple Math") && clean(ov()), junk(ov()));
  X("close");
  /* the hand-off check: $100 a month for 4 hours, against your hour */
  X("mthand");
  X("mtset", "100", "hv.cost");
  X("mtset", "4", "hv.hours");
  const H = mtHandOf(c);
  chk(
    "the hand-off check, by hand",
    H.ready && Math.abs(H.perHour - 25) < 1e-9 && Math.abs(H.worth - 4 * H.wage) < 1e-9,
    JSON.stringify([H.perHour, H.wage])
  );
  chk("the hand-off sheet opens clean", ov().includes("hour of your time") && clean(ov()), junk(ov()));
  X("close");
  /* the Money Guy's nine */
  X("foonine");
  const Nn = mtNineOf(c);
  chk(
    "the nine: a step is placed",
    Nn.ready && Nn.n >= 1 && Nn.n <= 9 && ov().includes("Step " + Nn.n + " of 9") && clean(ov()),
    junk(ov())
  );
  X("close");
  /* step 1b from the path: the balance sheet is the net worth the game counts */
  X("ymoyl");
  X("ymstep", "1b");
  const B = mtSheetOf(c);
  chk(
    "step 1b: the balance sheet equals the game's net worth",
    B.S.ready && Math.abs(B.S.net - derive(c).nw) < 1e-9,
    JSON.stringify([B.S.net, derive(c).nw])
  );
  chk("step 1b opens from the path, clean", ov().includes("Step 1b") && clean(ov()), junk(ov()));
  X("mtset", "8000", "b1.car");
  chk(
    "a car tapped is kept apart from net worth",
    mtSheetOf(c).All.net === B.S.net + 8000 && mtSheetOf(c).S.net === B.S.net
  );
  /* step 3 from the path: October in hours of life */
  X("ymstep", "3");
  const T = mtTabOf(c);
  chk(
    "step 3: October by hand",
    T.ready && T.last.m === "2026-10" && T.last.out === 2000 && T.last.cats[0].cat === "Home",
    JSON.stringify(T.last)
  );
  chk(
    "step 3 opens from the path, clean, and is no longer Soon",
    ov().includes("Step 3") && clean(ov()) && fwPathOf(c).steps.find(s => s.id === "3").built,
    junk(ov())
  );
  X("close");
  /* the spreadsheet section and the Famous money ideas rows */
  const bk = mtBook(c);
  chk("the spreadsheet section", bk.rows.some(r => r.id === "mt_months") && bk.rows.some(r => r.id === "mt_pfpay"));
  chk(
    "the rows on Famous money ideas",
    ["fyou", "noodle", "mtpay", "simplemath", "mthand", "foonine"].every(k => RF_LIST.some(r => r.a === k))
  );
  chk(
    "built list",
    btRows().some(r => r.n.startsWith("The canon rows finished") && r.st === "b") && btCount(btRows()).x === 0
  );
  {
    const r = require("child_process").spawnSync(
      process.execPath,
      [GAME_DIR + "../tools/game_canonmath_build.mjs", "--check"],
      {
        encoding: "utf8",
      }
    );
    chk("core/canonmath.js is current", r.status === 0, r.stdout + r.stderr);
  }
  G.chars.length = n0;
  G.active = 0;
  save();
}
