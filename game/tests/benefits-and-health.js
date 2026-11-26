/* ============================================================================
   SLAM the Game, test: tests/benefits-and-health.js
   PURPOSE     Examine Benefits and health (run Finish everything partly built, Part 10). A made-up player:
               the four benefits by taps (the HSA within its limit, invested, with receipts; the dependent
               care FSA and the daycare years; the ESPP and its cap; commuter), each against the engine;
               an employer tap fills the ESPP discount and the vesting of Career and education; the
               coverage chain in New York and in Texas; a raise across the Essential Plan line; plans side
               by side with the credit; the spreadsheet rows; the menu and the built list row; no
               undefined, NaN or null on any tab.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/benefitsplan.js, features/benefits.js, features/kit.js,
               features/book.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r);
  const c = Object.assign(newChar(), {
    name: "Rio",
    age: 34,
    led: true,
    placed: true,
    incs: [R0({ k: "A main job", amt: 4800 })],
    spends: [R0({ k: "Home", amt: 1800 }), R0({ k: "Food", amt: 500 })],
    cashes: [R0({ k: "Checking", amt: 4000 })],
    invs: [],
    debts: [],
    debt: 0,
    take: 4800,
    spend: 2300,
    inv: 20000,
  });
  G.chars.push(c);
  G.active = G.chars.length - 1;
  syncAll(c);
  G.demo = false;
  G.tourSeen = true;
  save();
  const Rr = bpRules(BP_REF),
    near = (a, b, e) => Math.abs(a - b) < (e || 1e-6),
    tap = (k, v) => X("bhset", String(v), "ben|" + k, { t: typeof v === "number" ? "n" : "s" });

  X("benefits");
  let h = ov();
  chk("the sheet opens on Worth it", h.includes("Benefits and health") && h.includes("HSA as a retirement account"));
  chk("the sheet is clean before any tap", clean(h), junk(h));
  let B = bhRead(c);
  chk("no tap: the HSA waits for the cover", !B.hsa.ready && B.hsa.needs.includes("self or family cover"));
  chk("no tap: nothing is added up", !B.sum.ready && B.sum.yearly === 0);

  /* 1. the four benefits */
  tap("rate", 30);
  tap("hsaCover", "self");
  tap("hsaYou", 4500);
  tap("hsaEmp", 500);
  tap("hsaYears", 20);
  tap("receipts", 500);
  B = bhRead(c);
  const H = bpHsa(
    { cover: "self", age: 34, you: 4500, employer: 500, rate: 0.3, years: 20, growth: R, receipts: 500 },
    Rr
  );
  chk("the HSA: the limit less the employer's part", B.hsa.ready && B.hsa.put === 4000 && B.hsa.over === 500);
  chk("the HSA: tax saved plus the employer", near(B.hsa.yearly, 4000 * 0.3 + 500) && near(B.hsa.yearly, H.yearly));
  chk("the HSA: invested 20 years", near(B.hsa.grows, 4500 * ((Math.pow(1 + R, 20) - 1) / R), 0.01));
  chk("the HSA: receipts kept", B.hsa.receiptsBank === 10000);
  tap("care", 10000);
  tap("youngest", 3);
  tap("esppPut", 21250);
  tap("esppDisc", 15);
  tap("commute", 150);
  B = bhRead(c);
  chk("the dependent care FSA: the limit", B.dcfsa.ready && B.dcfsa.put === 7500 && near(B.dcfsa.yearly, 2250));
  chk("the dependent care FSA: 10 years until 13", B.dcfsa.years === 10 && near(B.dcfsa.total, 22500));
  const fica = BP_REF.tax.socialSecurityRate + BP_REF.tax.medicareRate;
  chk("the ESPP: the gain of 15% off at the cap", B.espp.ready && near(B.espp.gain, 3750) && B.espp.stock === 25000);
  chk("the ESPP: taxed as pay with no FICA", near(B.espp.yearly, 3750 * (1 - (0.3 - fica))));
  chk("commuter: 12 months before tax", B.commuter.ready && near(B.commuter.yearly, 1800 * 0.3));
  chk(
    "the four together",
    B.sum.of === 4 && near(B.sum.yearly, B.hsa.yearly + B.dcfsa.yearly + B.espp.yearly + B.commuter.yearly)
  );
  h = ov();
  chk("Worth it shows the dollars", h.includes(money(B.hsa.yearly) + " a year") && clean(h), junk(h));

  /* 2. the employer */
  X("bhtab", "employer");
  h = ov();
  chk("the employer tab lists the library", bpEmployers(Rr).every(e => h.includes(esc(e.name))) && clean(h), junk(h));
  X("bhemp", "microsoft");
  B = bhRead(c);
  chk(
    "Microsoft fills the ESPP discount (10%)",
    bhVal(c, "esppDisc", null).v === 10 && near(B.espp.gain, (B.espp.put * 0.1) / 0.9)
  );
  chk(
    "and the vesting of Career and education",
    c.x.career && c.x.career.vSchedule && c.x.career.vSchedule.v === "now"
  );
  X("bhemp", "jpmorgan");
  h = ov();
  chk("an empty field is said, never guessed", h.includes("left for you") && c.x.career.vSchedule.v === "now");
  chk(
    "each source shows on the sheet",
    bpEmployer("jpmorgan", Rr).sources.every(s => h.includes(esc(s.source)))
  );

  /* 3. coverage and the health cliff */
  X("bhtab", "cover");
  tap("state", "NY");
  tap("size", 1);
  tap("adults", 1);
  tap("magi", 30000);
  B = bhRead(c);
  chk("New York at $30,000 for one: the Essential Plan", B.cover.ready && B.cover.now.on === "essential");
  chk(
    "the lines for one: 138%, 200%, 400% of the 2026 line",
    B.cover.lines.map(l => Math.round(l.upTo)).join() === [1.38, 2, 4].map(m => Math.round(15960 * m)).join()
  );
  tap("raise", 2500);
  B = bhRead(c);
  chk(
    "a $2,500 raise moves to the marketplace",
    B.cliff.ready && B.cliff.from === "essential" && B.cliff.to === "aca" && B.cliff.extra > 0
  );
  h = ov();
  chk("the coverage tab is clean", h.includes("What a raise does") && clean(h), junk(h));
  tap("state", "TX");
  tap("magi", 20000);
  B = bhRead(c);
  chk(
    "Texas did not expand Medicaid: no Medicaid line",
    B.cover.now.on === "aca" && !B.cover.lines.some(l => l.id === "medicaid")
  );
  tap("state", "NY");

  /* 4. plans */
  X("bhtab", "plans");
  tap("magi", 45000);
  ["premium|450", "deductible|1500", "oop|9000", "market|1"].forEach(s =>
    X("bhplanset", s.split("|")[1], "0|" + s.split("|")[0])
  );
  ["premium|300", "deductible|5000", "oop|10600", "market|1"].forEach(s =>
    X("bhplanset", s.split("|")[1], "1|" + s.split("|")[0])
  );
  B = bhRead(c);
  const P = bpPlans(c.x.benplans, { help: B.cover.now.on === "aca" ? B.cover.now.help : null });
  chk(
    "two plans side by side",
    B.plans.ready && B.plans.rows.length === 2 && near(B.plans.rows[0].heavy, P.rows[0].heavy)
  );
  chk(
    "the credit never past the premium",
    B.plans.rows.every(r => r.year >= 0 && r.credit <= r.full)
  );
  X("bhplanadd");
  chk("a third plan", c.x.benplans.length === 3);
  X("bhplandel", "2");
  chk("and taken away", c.x.benplans.length === 2);
  h = ov();
  chk("the plans tab is clean", h.includes("Plans side by side") && clean(h), junk(h));

  /* 5. spreadsheet, menu, built list */
  const bk = benefitsBook(c);
  chk("the spreadsheet rows", bk.rows.some(r => r.id === "bh_hsa") && bk.rows.every(r => r.v != null && isFinite(r.v)));
  chk(
    "the menu row",
    MENU.some(m => m[1] === "benefits")
  );
  chk(
    "the game's copy carries BP_REF",
    BP_REF.benefits.planYear === 2027 && Object.keys(BP_REF.employers.rows).length >= 5
  );
  X("close");
  G.chars.length = n0;
  G.active = 0;
  save();
}
