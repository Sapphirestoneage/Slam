/* ============================================================================
   SLAM the Game, test: tests/what-each-debt-costs.js
   PURPOSE     Examine What each debt costs you: the interest, the same amount as months of living
               costs, and the Guess rule.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. One sample profile
               that this file makes (the same profile in the six files that came from one older file).
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/owed.js.
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
  X("owed");
  const O = owRows(c),
    card = O.rows.find(r => r.name === "Credit card balance"),
    car = O.rows.find(r => r.name === "Car loan"),
    pl = dbPlan(c, "avalanche", 0);
  chk(
    "each debt: interest from the plan, as months of life",
    O.rows.length === 2 &&
      Math.abs(card.interest - pl.debts.find(d => d.name === "Credit card balance").interest) < 1e-9 &&
      Math.abs(card.life - card.interest / 3000) < 1e-12 &&
      Math.abs(O.total - pl.interest) < 1e-6
  );
  chk(
    "costly debt gets a freedom number from the game, cheap debt does not",
    card.high && card.free != null && card.free >= 0 && !car.high && car.free === null
  );
  o = ov();
  chk(
    "screen: both prices, a plain line for cheap debt, the costliest named when nothing is a guess",
    W.kind === "owed" &&
      o.includes("Interest still to come") &&
      o.includes("of your life") &&
      o.includes("This is low-cost debt") &&
      !O.guess &&
      O.top &&
      o.includes("The most interest still to come is on this one") &&
      o.includes("gone by") &&
      clean(o),
    junk(o)
  );
  c.debts[1].apr = null;
  c.debts[1].rate = null;
  c.debts[1].pay = null;
  const O2 = owRows(c);
  X("owed");
  chk(
    "a guess anywhere: Guess shows and no debt is named the costliest",
    O2.guess &&
      !O2.top &&
      ov().includes("Guess") &&
      !ov().includes("The most interest still to come is on this one") &&
      ov().includes("Answer two questions to make this real")
  );
  X("debtplan");
  chk("the debt plan links to it", ov().includes('data-a="owed"'));
  X("close");
  chk(
    "weeks and months of life read right",
    owLife(0.243) === "about 1 week" &&
      owLife(0.47) === "about 2 weeks" &&
      owLife(0.1) === "less than a week" &&
      owLife(1.2) === "about 1 month" &&
      owLife(7.4) === "about 7 months"
  );
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  G.tourSeen = tour0;
  save();
  go("home");
}
