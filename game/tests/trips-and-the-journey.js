/* ============================================================================
   SLAM the Game, test: tests/trips-and-the-journey.js
   PURPOSE     Examine the screen "Trips and the journey" on the shared engine: the copy of the engine,
               a trip added up line by line with the card fee, a line not tapped that waits, points
               (cash or redeem) taken off the trip, a group split by share and by item that adds up,
               the journey with where the player is and how the trip moves them in days, a trip in
               another currency that stays out of the plan, and the rows of the spreadsheet.
   INPUT       The game scripts, loaded by harness.cjs. One fixed test profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/trip.js, features/trip.js, core/engine.js (goalSim).
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Trips",
      led: true,
      placed: true,
      age: 30,
      ret: 65,
      take: 5000,
      spend: 3500,
      inv: 30000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 1500 })],
      cashes: [R0({ k: "Checking", amt: 2000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 30000 })],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C(),
    cp = require("child_process").spawnSync(process.execPath, [GAME_DIR + "../tools/game_trip_build.mjs", "--check"], {
      encoding: "utf8",
    });
  chk("core/trip.js is the same code as js/math/trip.js of the main app", cp.status === 0, cp.stdout);
  /* the engine: one split engine with the web app */
  chk("the household split engine comes with it", typeof rowShare === "function" && typeof tpSplit === "function");
  const T0 = tpCost({ flights: 800, lodging: 100, days: 5, food: 40, fxPct: 3, visa: 0, insurance: 60, other: 200 });
  chk("a trip line by line: 800 + 400 + 200 + 0 + 60 + 200 + a 3% fee of 24", T0.total === 1684 && T0.complete, T0);
  chk("a line not tapped waits, it is not zero", tpCost({ flights: 500 }).open.length === 6);
  /* the screen */
  X("trips");
  let h = ov();
  chk(
    "the screen opens with a stat row and four tabs",
    /dkstats/.test(h) && /Group split/.test(h) && /Journey/.test(h),
    h.slice(0, 300)
  );
  chk("with nothing tapped it waits for taps", /Tap yours/.test(h) && clean(h), junk(h));
  X("tpset", "700", "trip|flights", { t: "n" });
  X("tpset", "5", "trip|days", { t: "n" });
  X("tpset", "100", "trip|lodging", { t: "n" });
  X("tpset", "40", "trip|food", { t: "n" });
  X("tpset", "3", "trip|fxPct", { t: "n" });
  h = ov();
  chk(
    "the trip shows its total so far and its math",
    /\$1,318/.test(h) && /so far/.test(h) && /Card fee: 3%/.test(h) && clean(h),
    junk(h)
  );
  chk("open lines keep it a Guess", /kitst">Guess/.test(h));
  chk("the taps say they are not prices", /taps to start from, not prices/.test(h));
  /* points */
  X("tptab", "points");
  X("tpset", "700", "trip|pCash", { t: "n" });
  X("tpset", "40000", "trip|pPoints", { t: "n" });
  X("tpset", "50", "trip|pFees", { t: "n" });
  X("tpset", "1.25", "trip|pCpp", { t: "n" });
  h = ov();
  chk("points: the cents a point next to your own value", /1\.63 cents a point/.test(h) && clean(h), junk(h));
  X("tpset", "yes", "trip|usePoints", { t: "s" });
  chk(
    "paying with points takes the cash it covers off the trip",
    tpgLines(C()).T.total === 1318 - 650,
    tpgLines(C()).T
  );
  X("tpset", "no", "trip|usePoints", { t: "s" });
  /* the group split */
  X("tptab", "group");
  X("tppadd");
  X("tppadd");
  X("tppadd");
  X("tppshare", "2", "0");
  h = ov();
  chk(
    "by share: the parts add up to the trip",
    /Each person/.test(h) && Math.abs(tpgSplit(C()).S.total - 1318) < 0.001 && tpgSplit(C()).S.parts[0].amount === 659,
    tpgSplit(C()).S
  );
  X("tpset", "item", "trip|how", { t: "s" });
  X("tpamong", "p3", "lodging");
  const S2 = tpgSplit(C()).S;
  chk(
    "by item: the lodging only among the people in on it",
    S2.rows.find(r => r.id === "lodging").parts[2] === 0 && Math.abs(S2.total - 1318) < 0.001,
    S2
  );
  h = ov();
  chk("the split shows in one currency", /One currency for everyone/.test(h) && clean(h), junk(h));
  /* the journey */
  X("tptab", "journey");
  h = ov();
  const Q = tpgJourney(C());
  chk(
    "the journey has the six stages",
    /Digging out/.test(h) && /First \$1k/.test(h) && /\$100k/.test(h) && /Coast/.test(h)
  );
  chk(
    "where you are: past debt free, at $100k",
    Q.J.here === 3,
    Q.J.stages.map(s => [s.id, s.done])
  );
  chk("the trip takes you back under the first $1k", Q.J.back.includes("First $1k"), Q.J.back);
  chk("the freedom date moves later by the trip, in days", Q.J.fiDays > 0 && /days later/.test(h), Q.J.fiDays);
  chk("the journey uses one visual from the kit", /dkdays/.test(h) && /dkprog/.test(h) && clean(h), junk(h));
  /* another currency stays out of the plan */
  X("tpset", "EUR", "trip|cur", { t: "s" });
  h = ov();
  chk(
    "a trip in euros stays out of the plan",
    tpgJourney(C()).J.trip === null && /no exchange rate is guessed/.test(h)
  );
  X("tpset", "USD", "trip|cur", { t: "s" });
  /* the spreadsheet */
  const B = tripBook(c);
  chk(
    "the spreadsheet has the lines and the total",
    B.rows.some(r => r.id === "tp_total" && r.f) && B.rows.find(r => r.id === "tp_total").v === 1318,
    B.rows.map(r => r.id)
  );
  chk(
    "What's built lists it",
    WB.some(r => r[5] === "trips")
  );
  X("close");
  G.chars.splice(n0, 1);
  G.active = 0;
  save();
}
