/* ============================================================================
   SLAM the Game, test: tests/taxes-and-self-employed.js
   PURPOSE     Examine the run "Finish everything partly built", Part 14, in the game: the safe harbor
               card on Working for yourself > Taxes first (the Tax Command Center), the gig next to
               the floor on My floor (Pricing your power), the plan's spreadsheet rows, and Social
               Security replacement on Retirement odds and in Ratios on Key numbers.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/gig.js, core/gigcore.js, features/odds.js,
               features/ratios.js, core/ratios.js, features/book.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo;
  G.demo = false;
  const R3 = r => Object.assign({ s: true, cf: 3 }, r);
  const a = Object.assign(newChar(), {
    name: "Tess",
    led: true,
    placed: true,
    age: 34,
    ret: 60,
    take: 5000,
    spend: 3800,
    inv: 20000,
    incs: [R3({ k: "A main job", amt: 3000 }), R3({ k: "Side gigs", amt: 2000 })],
    spends: [
      R3({ k: "Home", amt: 1800 }),
      R3({ k: "Food", amt: 700 }),
      R3({ k: "Fun and everything else", amt: 1300 }),
    ],
    cashes: [R3({ k: "Checking", amt: 3000 })],
    invs: [],
    debts: [],
    moves: [],
    x: {},
  });
  G.chars.push(a);
  G.active = n0;
  save();
  go("money");
  const c = C();

  /* The rules come from the reference data, with their source. */
  chk(
    "the safe harbor rules are the dated IRS ones",
    GIG_SAFE_HARBOR.current === 0.9 &&
      GIG_SAFE_HARBOR.prior === 1 &&
      GIG_SAFE_HARBOR.priorHigh === 1.1 &&
      GIG_SAFE_HARBOR.owe === 1000 &&
      /Form 1040-ES/.test(GIG_SAFE_HARBOR.source) &&
      GIG_DUE.join() === "04-15,06-15,09-15,01-15"
  );

  /* By hand: 2,000 a month untaxed at 25% = 6,000 a year; no job withholding; no last year: 90% of 6,000 = 5,400. */
  let H = gxHarbor(c, "2026-11-26");
  chk(
    "this year's tax is the set-aside on a year like now",
    H.ready && H.gigYear === 6000 && H.thisYear === 6000,
    H.gigYear
  );
  chk("with no last year, 90% of this year", Math.abs(H.need - 5400) < 1e-6 && H.which === "current");
  chk(
    "the dates and what is owed by the next one",
    H.dates.map(d => d.date).join() === "2026-04-15,2026-06-15,2026-09-15,2027-01-15" &&
      H.passed === 3 &&
      Math.abs(H.toNext - 5400) < 1e-6 &&
      Math.abs(H.catchUp - 4050) < 1e-6
  );

  X("gig");
  let h = ov();
  chk(
    "Taxes first shows the safe harbor card",
    h.includes("Safe harbor") && h.includes('data-a="gxsh"') && clean(h),
    junk(h)
  );
  chk(
    "the card says Recalculating, not a verdict",
    /Recalculating/.test(h) && !/behind|failed|mistake|off track/i.test(h)
  );

  /* Last year's tax 4,000, AGI under the line: 100% of 4,000 = 4,000 is less than 5,400. */
  X("gxsh", "4000", "last");
  X("gxsh", "no", "agi");
  H = gxHarbor(C(), "2026-11-26");
  chk("last year's tax, AGI under the line: 100% of it", H.which === "prior" && H.need === 4000 && H.each === 1000);
  X("gxsh", "yes", "agi");
  H = gxHarbor(C(), "2026-11-26");
  chk("AGI over the line: 110%", Math.abs(H.need - 4400) < 1e-6);
  X("gxsh", "", "agi");
  chk("not sure keeps the higher share", Math.abs(gxHarbor(C(), "2026-11-26").need - 4400) < 1e-6);
  X("gxsh", "5000", "job");
  H = gxHarbor(C(), "2026-11-26");
  chk("a job's withholding counts first", H.withheld === 5000 && Math.abs(H.need - 0) < 1e-6 && H.thisYear === 11000);
  X("gxsh", "0", "job");
  X("gxsh", "0", "last");
  H = gxHarbor(C(), "2026-11-26");
  chk("no tax last year: no estimates needed", H.none === "zero" && H.need === 0);
  chk("the card says so", ov().includes("Last year had no tax") && clean(ov()));
  X("gxsh", "", "last");
  chk(
    "the taps are kept on the save, with the old fields",
    C().x.tax.sh && C().x.tax.sh.last === null && C().x.tax.paid.length === 0
  );

  /* The plan's spreadsheet: the formula gives the same number. */
  const B = gxBook(C()),
    by = id => B.rows.find(r => r.id === id);
  chk(
    "the spreadsheet rows hold the safe harbor",
    by("gx_gig") &&
      by("gx_cur") &&
      by("gx_need") &&
      Math.abs(by("gx_cur").v - 0.9 * (by("gx_gig").v + by("gx_job").v)) < 1e-6
  );

  /* Pricing your power: the gig next to the floor. */
  X("gxtab", "floor");
  chk("My floor asks what a gig pays an hour", ov().includes('data-k="gpay"'));
  X("gxset", "25", "gpay");
  const g = gxGig(C()),
    F = gxFloor(C(), g, gxPct(C())),
    V = gigVsFloorOf({ floor: F.hourly, pay: 25, month: F.month });
  chk("the gig pay is kept", g.gpay === 25);
  chk("the floor an hour is the floor's own", F.hourly > 0 && Math.abs(V.gap - (25 - F.hourly)) < 1e-9);
  h = ov();
  chk(
    "the card shows the gig next to the floor",
    h.includes("The gig next to your floor") && h.includes(money(25)) && clean(h),
    junk(h)
  );
  X("gxset", "50", "charge");
  chk("another tap keeps the gig pay", gxGig(C()).gpay === 25);
  X("close");

  /* Social Security replacement: Retirement odds and Ratios. */
  const r = raSsGame(C()),
    P = passives(C());
  chk(
    "Social Security replacement is the estimate over pay before taxes",
    r && r.value != null && Math.abs(r.value - (P.full * 12) / (knNet(C()).gross * 12)) < 1e-12 && r.level === "Guess"
  );
  const out = raGameRead(C()).out;
  chk("Ratios has the same line", out.ssreplace && out.ssreplace.value === r.value);
  chk(
    "the oddsBook rows hold it",
    oddsSsBook(C()).some(x => x.id === "od_ssr" && Math.abs(x.v - r.value) < 1e-12)
  );
  const card = oddsSsCard(C());
  chk(
    "Retirement odds shows Social Security next to your pay",
    card.includes("Social Security next to your pay") && card.includes(Math.round(r.value * 100) + "%") && clean(card),
    junk(card)
  );
  G.chars.push(
    Object.assign(newChar(), {
      name: "Ret",
      led: true,
      placed: true,
      age: 70,
      work: "Retired",
      take: 3000,
      spend: 2500,
      x: {},
    })
  );
  G.active = G.chars.length - 1;
  chk(
    "nothing estimated (retired): no line and no card",
    raSsGame(C()) === null && oddsSsCard(C()) === "" && !raGameRead(C()).out.ssreplace
  );

  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
