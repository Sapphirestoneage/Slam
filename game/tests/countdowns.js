/* ============================================================================
   SLAM the Game, test: tests/countdowns.js
   PURPOSE     Examine the countdowns on My Goals: the months to go, the monthly amount that makes a date,
               the target of a down payment and of a quit fund, the row on the goal, the sheets, the
               spreadsheet rows, the skill link and the row in "What's built".
   INPUT       The game scripts, loaded by harness.cjs. One sample profile with two goals.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/countdown.js and its part in ui.js (goalView).
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Count",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 5000,
      spend: 4000,
      inv: 20000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 30000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 20000 })],
      debts: [],
      goals: [
        { id: "g1", n: "A wedding", k: "Wedding", cost: 20000, fund: 2000, s: true },
        { id: "g2", n: "A home", k: "Home", cost: 60000, fund: 0, s: false },
        { id: "g3", n: "Quit my job", k: "Sabbatical", cost: 10000, fund: 0, s: false },
      ],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    S = kitStore(c, "countdown"),
    g = i => c.goals[i];
  /* ---------- the one countdown ---------- */
  chk("months to go: $18,000 at $500 a month is 36 months", cdnMonthsTo(20000, 2000, 500, 0) === 36);
  chk(
    "already there is 0 months, and no money in at 0% is never",
    cdnMonthsTo(100, 100, 0, 0) === 0 && cdnMonthsTo(100, 0, 0, 0) === null
  );
  chk("a rate makes it sooner", cdnMonthsTo(20000, 2000, 500, 0.04) < 36);
  chk("the monthly amount for a date: $18,000 in 12 months is $1,500", cdnMonthlyNeeded(20000, 2000, 0, 12) === 1500);
  chk(
    "the monthly amount at 4% reaches the target in exactly that many months",
    (() => {
      const m = cdnMonthlyNeeded(20000, 2000, 0.04, 24);
      return m < 750 && cdnMonthsTo(20000, 2000, m, 0.04) === 24 && cdnMonthsTo(20000, 2000, m - 5, 0.04) > 24;
    })()
  );
  /* ---------- a goal as a countdown ---------- */
  const K1 = cdnCalc(c, g(0));
  chk(
    "a wedding counts down to the price of the goal, with the money saved from the goal",
    K1.kind === "wedding" &&
      K1.target === 20000 &&
      K1.saved === 2000 &&
      K1.left === 18000 &&
      K1.monthly === 500 &&
      K1.months === 36,
    JSON.stringify([K1.kind, K1.target, K1.saved, K1.monthly, K1.months])
  );
  chk("with no answers the result is a Guess", K1.st === "Guess" && K1.need === null);
  S["g1:months"] = { v: 12, cf: 2 };
  S["g1:monthly"] = { v: 750, cf: 2 };
  const K1b = cdnCalc(c, g(0));
  chk(
    "with a date: $1,500 a month, which is more than the $1,000 kept",
    K1b.need === 1500 && K1b.fits === false && K1b.months === 24
  );
  chk("the countdown does not change the goal", g(0).cost === 20000 && g(0).fund === 2000);
  /* ---------- the down payment ---------- */
  S["g2:price"] = { v: 300000, cf: 2 };
  const K2 = cdnCalc(c, g(1)),
    pay = simLoanPayment(240000, 6.5, 30) + (300000 * 0.011) / 12 + (300000 * 0.005) / 12;
  chk("a goal named Home starts as a down payment", K2.kind === "home");
  chk(
    "the down payment target: 20% down, 3% closing, 2 months of payments",
    K2.target === Math.round(60000 + 9000 + 2 * pay) && Math.abs(K2.T.pay - pay) < 1e-6,
    K2.target
  );
  S["g2:down"] = { v: 0.05, cf: 2 };
  const K2b = cdnCalc(c, g(1)),
    pay5 = simLoanPayment(285000, 6.5, 30) + 275 + 125 + (285000 * 0.0075) / 12;
  chk(
    "under 20% down the payment has mortgage insurance",
    K2b.target === Math.round(15000 + 9000 + 2 * pay5),
    K2b.target
  );
  /* ---------- the quit fund ---------- */
  S["g3:cover"] = { v: 475, cf: 2 };
  const K3 = cdnCalc(c, g(2));
  chk(
    "a quit fund: (spending + health cover) x 6 months",
    K3.kind === "quit" && K3.target === (4000 + 475) * 6,
    K3.target
  );
  S["g3:kind"] = { v: "goal", cf: 2 };
  chk("the player can change the kind", cdnCalc(c, g(2)).target === 10000);
  /* ---------- health cover from data/health2026.js ---------- */
  const HC = cdnCover();
  chk(
    "health cover: the 2026 marketplace benchmark, and COBRA as the premium at work plus 2%",
    HC.market === HEALTH_2026.marketplace40Month &&
      HC.one === Math.round((HEALTH_2026.employerSingleYear * 1.02) / 12) &&
      HC.family === Math.round((HEALTH_2026.employerFamilyYear * 1.02) / 12) &&
      HEALTH_2026.year === 2026 &&
      /KFF/.test(HEALTH_2026.source),
    JSON.stringify(HC)
  );
  X("cdn", "g3");
  S["g3:kind"] = { v: "quit", cf: 2 };
  X("cdn", "g3");
  chk(
    "the quit fund sheet offers those numbers and names the source and the year",
    ov().includes('data-v="' + HC.market + '"') &&
      ov().includes('data-v="' + HC.one + '"') &&
      ov().includes('data-v="' + HC.family + '"') &&
      ov().includes("National averages for 2026") &&
      ov().includes("KFF 2026 Employer Health Benefits Survey") &&
      !ov().includes("$475") &&
      clean(ov()),
    junk(ov())
  );
  S["g3:kind"] = { v: "goal", cf: 2 };
  /* ---------- the screens ---------- */
  X("goal", "g1");
  chk(
    "the goal has one countdown row",
    (ov().match(/cdnrow/g) || []).length === 1 && ov().includes("24 months to go at $750 a month")
  );
  X("cdn", "g1");
  chk(
    "the sheet of one countdown: the result, the date line, the questions, the math",
    W.kind === "cdn" &&
      ov().includes("24 months to go at $750 a month") &&
      ov().includes("$1,500 a month") &&
      ov().includes("Do you have a date?") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "each question has an i",
    (ov().match(/class="field kitask"/g) || []).every(() => true) &&
      ov()
        .split('class="field kitask"')
        .slice(1)
        .every(p => p.slice(0, 600).includes("term:"))
  );
  X("kitset", "36", "countdown|g1:months", { t: "n" });
  chk(
    "a tap on a chip keeps the answer as Close",
    S["g1:months"].v === 36 && S["g1:months"].cf === 2 && cdnCalc(c, g(0)).need === 500
  );
  X("cdn", "g2");
  chk(
    "the down payment sheet asks the price, the amount down and the rate",
    ov().includes("The price of the home") &&
      ov().includes("How much down") &&
      ov().includes("The mortgage rate") &&
      clean(ov()),
    junk(ov())
  );
  X("cdn", "g3");
  chk("the sheet is clean for each kind", clean(ov()), junk(ov()));
  X("cdn", "");
  chk(
    "the list has each open goal",
    W.kind === "cdn" && W.id === null && (ov().match(/data-a="cdn" data-v="g/g) || []).length === 3 && clean(ov()),
    junk(ov())
  );
  c.goals[2].done = true;
  chk("a finished goal has no countdown", cdnList(c).length === 2);
  /* ---------- the spreadsheet, the skill link, the built list ---------- */
  const B = cdnBook(c);
  chk(
    "the spreadsheet rows: 5 for each goal, and still to save is a formula",
    B.rows.length === 10 && B.rows[2].f.includes("MAX(0,{cd0_target}-{cd0_saved})") && B.rows[2].v === 18000
  );
  chk(
    "the spreadsheet of the plan has the section",
    bookSections(c).some(s => s.title === "Countdowns")
  );
  const L = cxLink("cash-safety-net", 14);
  chk("a real skill opens the countdowns", L && L.a === "cdn" && typeof ACT.cdn === "function", JSON.stringify(L));
  const row = btRows().find(r => r.n.startsWith("Countdowns"));
  chk("the row in What's built is built and opens the sheet", row && row.st === "b" && row.a === "cdn");
  chk("the menu and the screen i have it", MENU.some(m => m[1] === "cdn") && !!NV_INFO.cdn && !!GLOSS.countdown);
  const empty = Object.assign(newChar(), { name: "None" });
  G.chars.push(empty);
  G.active = G.chars.length - 1;
  X("cdn", "");
  chk(
    "with no goals the list says so and offers to add one",
    ov().includes("No goals yet") && ov().includes('data-a="gadd"') && clean(ov()),
    junk(ov())
  );
  X("close");
  G.chars.length = n0;
  G.active = 0;
  save();
}
{
  /* The door on My Goals: the tab has the button when a goal is open. */
  const n0 = G.chars.length,
    a = Object.assign(newChar(), { name: "Door", led: true, placed: true, take: 4000, spend: 3000 });
  a.goals = [{ id: "g_door", n: "A trip", cost: 3000, saved: 500 }];
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("goals");
  chk(
    "My Goals has the button Countdowns when a goal is open",
    app().includes('class="ghost wide cdnbtn" data-a="cdn"')
  );
  C().goals = [];
  go("goals");
  chk("with no goal, My Goals has no such button", !app().includes("cdnbtn"));
  G.chars.length = n0;
  G.active = 0;
  save();
}
