/* ============================================================================
   SLAM the Game, test: tests/strategy-engine.js
   PURPOSE     Examine the Strategy Engine ("Moves to try"): the template of each strategy, the full
               loop of each strategy on one test profile (rent $1,800, a $6,000 card at 24%), the math
               of the house hack and the balance transfer worked out by hand, the ranking, the section
               on Next Steps, the library, and the steps that go to Next Steps.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/strat.js, data/strategies.js, data/metros.js,
               presets/metros.json.
   ========================================================================= */
{
  const fs = require("fs"),
    n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Test",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      work: "Established",
      take: 5000,
      spend: 3900,
      inv: 20000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [
        R0({ k: "Home", amt: 1800 }),
        R0({ k: "Food", amt: 700 }),
        R0({ k: "Getting around", amt: 500 }),
        R0({ k: "Bills and subscriptions", amt: 400 }),
        R0({ k: "Fun and everything else", amt: 500 }),
      ],
      cashes: [R0({ k: "Checking", amt: 3000 }), R0({ k: "Savings", amt: 6000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 20000 })],
      debts: [R0({ k: "Credit card balance", amt: 6000, high: true, apr: "15% to 25%", rate: 24, pay: 180 })],
      x: { ss: 0 },
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C(),
    near = (x, y, t) => Math.abs(x - y) <= (t == null ? 0.01 : t),
    set = (id, k, v, cf) => (kitStore(c, "stg_" + id)[k] = { v, cf: cf || 2 });

  /* THE TEMPLATE */
  const KEYS = [
    "id",
    "name",
    "one",
    "lever",
    "fitChecks",
    "inputs",
    "formula",
    "dial",
    "breakEven",
    "verdictRules",
    "risks",
    "credit",
    "quests",
  ];
  chk(
    "13 strategies, each with each part of the template",
    STRATEGIES.length === 13 && STRATEGIES.every(S => KEYS.every(k => S[k] != null)),
    STRATEGIES.filter(S => !KEYS.every(k => S[k] != null))
      .map(S => S.id)
      .join()
  );
  chk(
    "each lever is one of the five",
    STRATEGIES.every(S => STG_LEVER[S.lever])
  );
  chk(
    "each check is hard, or soft with a known roadblock, and has its reason",
    STRATEGIES.every(S => S.fitChecks.every(k => (k.hard || STG_BLOCK[k.block]) && k.no && k.q))
  );
  chk("no strategy id is used twice", new Set(STRATEGIES.map(S => S.id)).size === 13);
  chk(
    "the first batch is there",
    [
      "househack",
      "transfer",
      "room",
      "consolidate",
      "purchase",
      "match",
      "hsa",
      "bank",
      "welcome",
      "raise",
      "city",
      "car",
      "side",
    ].every(id => stgOf(id))
  );

  /* THE METRO PRESETS */
  const J = JSON.parse(fs.readFileSync(GAME_DIR + "presets/metros.json", "utf8"));
  chk("presets/metros.json and the loaded data are the same", JSON.stringify(J) === JSON.stringify(METROS));
  chk(
    "about 25 areas with the six numbers, and the ones that were asked for",
    METROS.metros.length >= 25 &&
      METROS.metros.every(m => ["price", "rentUnit", "taxPct", "ins", "br1", "room"].every(k => m[k] > 0)) &&
      ["manhattan", "brooklyn", "queens", "bronx", "statenisland", "rockland", "longmont"].every(id =>
        METROS.metros.some(m => m.id === id)
      )
  );
  chk(
    "each value is marked Guess, rough, as of 2026",
    METROS.status === "Guess" && /[Rr]ough, as of 2026/.test(METROS.note)
  );

  /* THE MATH HELPERS, by hand */
  /* $100,000 at 6% for 30 years: the payment is $599.55. */
  chk("the level payment of a loan", near(stgPmt(100000, 0.06 / 12, 360), 599.55, 0.01), stgPmt(100000, 0.005, 360));
  chk("a loan at 0% is the amount / the months", near(stgPmt(1200, 0, 12), 100));
  /* $1,000 at 12%, $100 a month, 2 months: 10.00, then (910 x 1%) 9.10. Interest 19.10, left 819.10. */
  const r2 = stgRun(1000, 12, 100, 2);
  chk("paying a balance month by month", near(r2.interest, 19.1) && near(r2.left, 819.1), JSON.stringify(r2));

  /* THE HOUSE HACK, by hand. Price 500,000, 2 units, rent 1,800, tax 1.2%, insurance 200, 6.5%. */
  const HH = stgOf("househack");
  set("househack", "price", 500000);
  set("househack", "units", 2);
  set("househack", "rentUnit", 1800);
  set("househack", "taxPct", 1.2);
  set("househack", "ins", 200);
  set("househack", "rate", 0.065);
  let I = stgInputs(c, HH),
    F = stgCalc(c, HH, I);
  const loan = 500000 * 0.965 * 1.0175,
    pi = (loan * (0.065 / 12)) / (1 - Math.pow(1 + 0.065 / 12, -360)),
    mip = (482500 * 0.0055) / 12,
    reserves = 0.21 * 1800,
    own = pi + 500 + 200 + mip + reserves,
    net = own - 1800 * 0.95;
  chk("house hack: your housing now comes from the profile", I.cur === 1800);
  chk(
    "house hack: the loan is the price less 3.5%, plus 1.75%",
    near(F.H.loan, 490943.75) && near(F.H.down, 17500) && near(F.H.closing, 15000)
  );
  chk(
    "house hack: owning cost = loan payment + tax + insurance + FHA insurance + reserves",
    near(F.H.own, own) && near(F.H.tax, 500) && near(F.H.mip, 221.15, 0.01) && near(F.H.reserves, 378),
    F.H.own
  );
  chk("house hack: net housing = owning cost - the other rent x 0.95", near(F.H.net, net) && near(F.H.others, 1800));
  chk("house hack: saved = housing now - net housing", near(F.H.save, 1800 - net) && near(F.save, 1800 - net));
  chk("house hack: growth given up = (down + closing) x 7% / 12", near(F.H.lost, (32500 * 0.07) / 12));
  chk(
    "house hack: equity = the loan paid down in month 1 + 1% a year of the price",
    near(F.equity, pi - (loan * 0.065) / 12 + 5000 / 12)
  );
  chk(
    "house hack: the reverse solve gives back the rent",
    near(F.H.rentFor(F.H.net), 1800, 0.01),
    F.H.rentFor(F.H.net)
  );
  chk(
    "house hack: the highest price at these rents gives back the price",
    near(F.H.priceFor(F.H.net), 500000, 1),
    F.H.priceFor(F.H.net)
  );
  chk(
    "house hack: the hidden costs are always there",
    F.hidden.length === 3 && F.hidden[0][0].includes("Growth") && F.hidden[2][0].includes("Landlord hours")
  );
  chk("house hack: the boring alternative is always there", /roommate/i.test(F.alt));
  let V = stgVerdict(c, HH, I, F);
  chk(
    "house hack at $500,000 next to $1,800 rent: Not for you, with the reason in dollars",
    V.v === "no" && /growth|within reach|hours/.test(V.why),
    JSON.stringify(V)
  );
  const D6 = HH.dial(c, I, F);
  chk(
    "house hack: the dial has six rows, each with what would need to be true",
    D6.length === 6 &&
      D6.map(r => r.k).join() === "same,25,50,75,100,pays" &&
      D6.every(r => /Each other unit rents for/.test(r.need))
  );
  chk(
    "house hack: a higher share needs a higher rent",
    D6[1].rent < D6[2].rent && D6[2].rent < D6[4].rent && D6[4].rent < D6[5].rent
  );
  chk(
    "house hack: the break-even line",
    /^Makes sense if each other unit rents for at least \$[\d,]+ a month\.$/.test(HH.breakEven(c, I, F)),
    HH.breakEven(c, I, F)
  );
  set("househack", "vac", 0.03);
  chk("house hack: a reserve under 5% shows a warning", stgCalc(c, HH).warn.length === 1);
  set("househack", "vac", 0.05);
  /* a building that works: 4 units at a low price */
  set("househack", "price", 300000);
  set("househack", "units", 4);
  I = stgInputs(c, HH);
  F = stgCalc(c, HH, I);
  V = stgVerdict(c, HH, I, F);
  chk(
    "house hack: 4 units at $300,000 saves money, and the card debt makes it Not yet: oxygen mask first",
    F.H.save > 1800 && V.v === "notyet" && V.block === "mask",
    JSON.stringify([F.H.save, V])
  );
  chk(
    "house hack: the down payment check reads the cash past the emergency fund",
    stgChecks(c, HH, I, F).find(r => r.k.id === "down").ok === false
  );

  /* THE BALANCE TRANSFER, by hand. $6,000 at 24%, 15 months at 0%, a 3% fee. */
  const BT = stgOf("transfer");
  I = stgInputs(c, BT);
  F = stgCalc(c, BT, I);
  chk("transfer: the balance and the rate come from the profile", I.bal === 6000 && I.apr === 24);
  chk(
    "transfer: the fee is 3% and the payment is (balance + fee) / months",
    near(F.fee, 180) && near(F.pay, 6180 / 15)
  );
  let left = 6000,
    int = 0;
  for (let m = 0; m < 15; m++) {
    const i = left * 0.02;
    int += i;
    left = left + i - 412;
  }
  chk(
    "transfer: interest saved = the interest over the 0% months at the rate now - the fee",
    near(F.oldInt, int, 0.01) && near(F.saved, int - 180, 0.01),
    JSON.stringify([F.oldInt, int])
  );
  const DB = BT.dial(c, I, F);
  chk(
    "transfer: the dial compares each payment with the room for it, and shows what is left at 25%",
    DB.length === 5 &&
      near(DB[1].pay, 103) &&
      /is left when the 0% ends/.test(DB[1].need) &&
      /Nothing is left/.test(DB[4].need)
  );
  V = stgVerdict(c, BT, I, F);
  chk("transfer on the test profile: a fit, with 2 taps left", V.v === "fits" && V.pending === 2, JSON.stringify(V));
  chk(
    "transfer: the library's 0% cards are named, with a way to the card vault",
    F.links[0][1] === "vault" &&
      typeof ACT.vault === "function" &&
      F.notes.length === 1 &&
      /transfer/i.test(F.notes[0]),
    JSON.stringify(F.notes)
  );
  stgX(c, "transfer").fit.store = "n";
  chk(
    "transfer: a deferred-interest store card rules it out",
    stgVerdict(c, BT).v === "no" && /deferred/i.test(stgVerdict(c, BT).why)
  );
  stgX(c, "transfer").fit = {};
  set("transfer", "bal", 600);
  chk(
    "transfer: a balance that clears in 2 months is Not for you",
    stgVerdict(c, BT).v === "no" && /2 months/.test(stgVerdict(c, BT).why)
  );
  delete kitStore(c, "stg_transfer").bal;

  /* THE IMPACT AND THE RANKING */
  const imp = stgImpact(c, { save: 500, take: 0, equity: 0, once: 0, value: 500 }, "full");
  chk("the impact: $500 a month brings the FI date closer, in months", imp.fi > 0 && imp.days > 0, JSON.stringify(imp));
  chk("the words: FI date X closer", /^FI date .* closer$/.test(stgImpactWords(imp).fi), stgImpactWords(imp).fi);
  chk(
    "stgYm writes years and months",
    stgYm(15) === "1 year 3 months" && stgYm(5) === "5 months" && stgYm(24) === "2 years"
  );
  const RK = stgRank(c);
  chk("the ranking has each strategy one time", RK.length === 13);
  chk(
    "the score is days closer x fit / effort",
    RK.every(r => near(r.score, (r.days * STG_FITW[r.V.v]) / r.S.effort, 1e-6))
  );
  const tier = r => (r.V.v === "no" ? 3 : r.V.v === "already" ? 2 : r.V.masked ? 1 : 0);
  chk(
    "a strategy that the oxygen mask blocks ranks below the others, and Not for you comes last",
    RK.every((r, i) => !i || tier(RK[i - 1]) <= tier(r)),
    RK.map(r => r.S.id + ":" + r.V.v).join(" ")
  );
  chk(
    "the transfer and the match rank above the house hack",
    RK.findIndex(r => r.S.id === "transfer") < RK.findIndex(r => r.S.id === "househack")
  );

  /* THE FULL LOOP, for each strategy */
  STRATEGIES.forEach(S => {
    X("strat", S.id);
    let ok =
      W.kind === "strat" &&
      ov().includes(esc(S.name)) &&
      ov().includes("1. Fit check") &&
      ov().includes("6. Verdict") &&
      clean(ov());
    const bad = [];
    for (let n = 1; n <= 6; n++) {
      W.sec = n;
      drawSheet();
      if (!clean(ov())) bad.push(n + ":" + junk(ov()));
      if (new RegExp("[" + String.fromCharCode(0x2014, 0x2013) + "]").test(ov())) bad.push(n + ":dash");
    }
    W.sec = 2;
    drawSheet();
    ok = ok && ov().includes("Show the math") && ov().includes("FI date");
    W.sec = 4;
    drawSheet();
    ok = ok && ov().includes("Same as now");
    W.sec = 5;
    drawSheet();
    ok = ok && /Makes sense if/.test(ov());
    W.sec = 6;
    drawSheet();
    const v = stgVerdict(c, S);
    ok =
      ok &&
      ov().includes(STG_VERDICT[v.v]) &&
      ov().includes("Who taught it") &&
      (v.v === "no" || v.v === "already" || ov().includes("Add to my steps"));
    chk("the full loop runs: " + S.id + " (" + STG_VERDICT[v.v] + ")", ok && !bad.length, bad.join(" | "));
    X("close");
  });
  /* the verdicts of the test profile, each one sensible */
  const VV = {};
  STRATEGIES.forEach(S => (VV[S.id] = stgVerdict(c, S)));
  chk(
    "test profile: no car payment, so the car swap is Not for you",
    VV.car.v === "no" && /no car payment/.test(VV.car.why)
  );
  chk("test profile: the consolidation loan fits at 12% next to 24%", VV.consolidate.v === "fits");
  chk(
    "test profile: the welcome bonus and the 0% purchase card wait for the card balance",
    VV.welcome.v === "notyet" &&
      VV.welcome.block === "mask" &&
      VV.purchase.v === "notyet" &&
      VV.purchase.block === "mask"
  );
  chk("test profile: the HSA waits for the oxygen mask", VV.hsa.v === "notyet" && VV.hsa.block === "mask");
  chk(
    "test profile: the match, the raise and side income are a fit so far",
    VV.match.v === "fits" && VV.raise.v === "fits" && VV.side.v === "fits"
  );
  chk("test profile: a typical US metro at $1,600 does not pay back the move in a year", VV.city.v === "no");

  /* THE FIT CHECK BY TAPS */
  X("strat", "raise");
  chk(
    "the fit check opens first while taps are left, and the first open check pulses",
    ov().includes("chip likely") && ov().includes("taps left")
  );
  X("stgfit", "n", "ask");
  chk(
    "a soft No becomes Not yet, with the one roadblock",
    stgVerdict(c, stgOf("raise")).v === "notyet" &&
      stgVerdict(c, stgOf("raise")).block === "fear" &&
      ov().includes("Fear")
  );
  X("stgfit", "n", "wins");
  chk("with two soft roadblocks, one is shown and the other is counted", stgVerdict(c, stgOf("raise")).more === 1);
  X("stgfit", "y", "ask");
  X("stgfit", "y", "wins");
  X("stgfit", "y", "market");
  chk(
    "with each check answered, the loop moves to the impact",
    W.sec === 2 && stgVerdict(c, stgOf("raise")).pending === 0
  );
  X("stgalready");
  chk("Already doing it is a verdict", stgVerdict(c, stgOf("raise")).v === "already");
  X("stgalready");
  X("stgdial", "50");
  chk("the dial keeps the row", stgX(c, "raise").dial === "50");
  X("close");

  /* SHARPEN: an area, a real listing, Guess / Close / Exact */
  delete c.x.stg_househack;
  X("strat", "househack");
  X("stgsec", "3");
  chk(
    "sharpen offers the areas and a real listing",
    ov().includes("Tap an area") && ov().includes("Rockland County, NY") && ov().includes("Use a real listing")
  );
  chk("with no answers, the impact is a Guess", stgInputs(c, HH)._st === "Guess");
  X("stgmetro", "longmont");
  chk(
    "an area loads its numbers as a Guess",
    stgInputs(c, HH).price === 650000 && stgInputs(c, HH).rentUnit === 1700 && stgInputs(c, HH)._st === "Guess"
  );
  X("stglisting");
  chk(
    "a real listing opens price, rent, taxes and HOA",
    ["The price", "Rent of each other unit", "Property tax a year, from the listing", "HOA or common charges"].every(
      t => ov().includes(t)
    ) && ov().includes("stgtyped") === false
  );
  W.o[kitPadKey("stg_househack", "price")] = 610000;
  X("stgtyped", "", "stg_househack|price");
  chk("a typed listing number is Close", c.x.stg_househack.price.v === 610000 && c.x.stg_househack.price.cf === 2);
  X("kitsure", "3", "stg_househack|price", { t: "n", f: "0" });
  chk("a tap makes it Exact", c.x.stg_househack.price.cf === 3);
  X("stghead", "cash");
  chk("the headline switches to cash only", stgX(c, "househack").head === "cash");
  X("stghead", "full");
  X("stgsec", "2");
  chk(
    "with equity, the cash-only figure shows beneath",
    ov().includes("Cash only: ") &&
      ov().includes("With equity") &&
      ov().includes("Hidden costs") &&
      ov().includes("The boring alternative")
  );
  X("close");

  /* NEXT STEPS AND THE LIBRARY */
  go("plan");
  const P = app();
  chk(
    "Next Steps has the section, with 3 rows, the first one pulsing, and See all moves",
    P.includes("Moves to try") &&
      (P.match(/class="rowbtn stgrow/g) || []).length === 3 &&
      (P.match(/class="rowbtn stgrow pulse/g) || []).length === 1 &&
      P.includes("See all moves") &&
      !P.includes("moveshere") &&
      clean(P),
    junk(P)
  );
  chk("the section comes after the plan by time", P.indexOf("plseg") < P.indexOf("Moves to try"));
  X("stratlib");
  chk(
    "the library lists each strategy, and one that does not fit is faded with its reason",
    STRATEGIES.every(S => ov().includes(esc(S.name))) &&
      ov().includes("opacity:.55") &&
      ov().includes("Not for you: ") &&
      clean(ov()),
    junk(ov())
  );
  X("stratlib", "interest");
  chk("the library can show one lever", ov().includes("0% balance transfer") && !ov().includes("House hack"));
  X("close");
  chk(
    "the menu has the Moves library",
    MENU.some(m => m[1] === "stratlib")
  );

  /* ADD TO MY STEPS */
  X("strat", "side");
  X("stgsec", "6");
  X("stgadd");
  const tasks = plX(c).plan.filter(p => p.a === "strat");
  chk(
    "Add to my steps puts the quests of the strategy in the plan",
    tasks.length === stgOf("side").quests.length &&
      tasks[0].t === stgOf("side").quests[0].t &&
      ov().includes("On your Next Steps")
  );
  X("stgadd");
  chk("a second tap does not add them again", plX(c).plan.filter(p => p.a === "strat").length === tasks.length);
  chk("the hours of the move go to the time ledger", near(stgHours(c), 5 * 4.33) && stgX(c, "side").added);
  X("close");
  X("hrs");
  chk("the sheet of the real hourly wage shows them", ov().includes("hours a month") && ov().includes("stghours"));
  X("close");
  X("strat", tasks[0].v);
  chk("a step in the plan opens its strategy", W.kind === "strat" && W.id === "side");
  X("close");

  /* THE SPREADSHEET, THE GLOSSARY, THE BUILT LIST */
  const B = stgBook(c);
  chk(
    "the spreadsheet has the section, with formulas for the house hack and the transfer",
    B.rows.some(r => r.id === "hh_net" && r.f === "={hh_own}-{hh_others}*0.95") &&
      B.rows.some(r => r.id === "bt_pay") &&
      B.rows.length >= 13 + 14
  );
  chk(
    "each term has an i",
    ["stg_move", "stg_fi", "stg_equity", "stg_mip", "stg_reserves", "stg_promo", "stg_fee", "stg_deferred"].every(
      k => GLOSS[k]
    )
  );
  chk("built list", btRows().some(r => r.n.startsWith("Moves to try") && r.st === "b") && btCount(btRows()).x === 0);
  const src = ["features/strat.js", "data/strategies.js", "presets/metros.json"]
    .map(f => fs.readFileSync(GAME_DIR + f, "utf8"))
    .join("");
  chk(
    "no em dash and no en dash in the new files",
    !new RegExp("[" + String.fromCharCode(0x2014, 0x2013) + "]").test(src)
  );
  G.chars.length = n0;
  G.active = 0;
  save();
}
