/* ============================================================================
   SLAM the Game, test: tests/student-loan-plans.js
   PURPOSE     Examine Student loan plans: the math, the questions, and the result with the federal
               plans.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. One sample profile
               that this file makes (the same profile in the six files that came from one older file).
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/study.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen,
    R = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Kai",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 20000,
      match: "yes",
      tax: "no",
      work: "First job",
      incs: [R({ k: "A main job", amt: 4000 })],
      spends: [R({ k: "Home", amt: 1800 }), R({ k: "Food", amt: 1200 })],
      cashes: [R({ k: "Checking", amt: 12000 })],
      invs: [R({ k: "Retirement plan at work", amt: 20000 })],
      debts: [
        R({ k: "Credit card balance", amt: 3000, high: true, apr: "15% to 25%", rate: 20, pay: 150 }),
        R({ k: "Car loan", amt: 9000, high: false, apr: "Under 8%", rate: 5, pay: 250 }),
      ],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  let o;
  chk(
    "student loan math by hand",
    Math.abs(slLevel(30000, 0.06, 120) - (30000 * 0.005) / (1 - Math.pow(1.005, -120))) < 1e-9 &&
      slPoverty(1) === 15960 &&
      slPoverty(3) === 27320 &&
      Math.abs(slIbr(60000, 1, false, null) - (0.1 * (60000 - 1.5 * 15960)) / 12) < 1e-9 &&
      slRapRate(60000) === 0.05 &&
      slRapRate(60001) === 0.06 &&
      Math.abs(slRap(60000, 2) - ((60000 * 0.05) / 12 - 100)) < 1e-9 &&
      slRap(5000, 0) === 10
  );
  const rp = slRepay(30000, 0.06, slLevel(30000, 0.06, 120), 120, false);
  chk("a level payment clears the loan with nothing forgiven", rp.paidOff && rp.forgiven === 0 && rp.months === 120);
  const r1 = slRepay(30000, 0.06, 100, 1, true),
    rr = slRepay(30000, 0.06, 100, 360, true),
    r2 = slRepay(30000, 0.06, 100, 1, false);
  chk(
    "RAP small payment: the balance drops by $50 and unpaid interest is waived; off RAP it would grow",
    Math.abs(r1.forgiven - 29950) < 1e-6 &&
      Math.abs(r2.forgiven - 30050) < 1e-6 &&
      rr.months === 360 &&
      rr.forgiven > 0 &&
      rr.forgiven < 30000 - 360 * 50 + 1e-6
  );
  X("study");
  chk(
    "student loans: first question is who the loan is from",
    W.kind === "study" && ov().includes("Who are your student loans from?") && ov().includes("Question 1 of")
  );
  X("slset", "idk", "who");
  chk("not sure: three numbered steps to find out", ov().includes("studentaid.gov") && ov().includes("<b>3.</b>"));
  X("slset", null, null, { v: "private" });
  chk(
    "private: no plans, three things you can do",
    ov().includes("do not have income-based plans") &&
      ov().includes("refinancing") &&
      ov().includes('data-a="debtplan"')
  );
  X("slback");
  X("slset", "federal", "who");
  chk("no student debt on file: asks how much", ov().includes("How much do you still owe on them, all together?"));
  X("slset", "30000", "bal");
  X("slset", "6", "apr");
  X("slset", "July 2014 to June 2026", "first");
  X("slset", "0", "mar");
  X("slset", "0", "dep");
  chk(
    "public service is explained",
    ov().includes("full time for the government or a nonprofit") && ov().includes("public service")
  );
  X("slset", "no", "pslf");
  o = ov();
  const PL = slPlans({
    bal: 30000,
    apr: 6,
    agi: 60000,
    first: SL_FIRST[1],
    mar: false,
    dep: 0,
    pslf: "no",
    made: null,
  });
  chk(
    "result: three plans, each with payment, length, total and what is forgiven",
    PL.rows.map(r => r.id).join() === "standard,ibr,rap" &&
      o.includes("Standard, 10 years") &&
      o.includes(">IBR<") &&
      o.includes(">RAP<") &&
      o.includes("Paid in all") &&
      o.includes(money(Math.round(PL.rows[0].pay))) &&
      o.includes(money(Math.round(PL.rows[2].pay))) &&
      clean(o),
    junk(o)
  );
  chk(
    "it does not pick a winner, names the tax, and says how fresh the rules are",
    o.includes("does not pick one for you") &&
      o.includes("taxed as income") &&
      o.includes("checked on Nov 6, 2026") &&
      o.includes("has not been confirmed") &&
      !o.includes("cpcell best")
  );
  chk("pay is a guess here, so payments are marked", o.includes("Guess") && o.includes("your pay before taxes"));
  chk("answers are kept", c.x.sl.who === "federal" && c.x.sl.bal === 30000 && c.x.sl.pslf === "no");
  X("slback");
  X("slset", "yes", "pslf");
  chk("public service: asks payments made", ov().includes("How many payments have you made while working there?"));
  X("slset", "48", "made");
  chk(
    "public service rows appear with 72 left",
    ov().includes("IBR with public service forgiveness") &&
      ov().includes("72 more payments") &&
      slPlans({ bal: 30000, apr: 6, agi: 60000, first: SL_FIRST[1], mar: false, dep: 0, pslf: "yes", made: 48 })
        .left === 72
  );
  const PN = slPlans({ bal: 60000, apr: 6, agi: 60000, first: SL_FIRST[2], mar: true, dep: 1, pslf: "no", made: null });
  chk(
    "new borrowers: tiered standard, no IBR, household counted",
    PN.rows.map(r => r.id).join() === "standard,rap" && PN.rows[0].name === "Standard, 20 years" && PN.size === 3
  );
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  G.tourSeen = tour0;
  save();
  go("home");
}
