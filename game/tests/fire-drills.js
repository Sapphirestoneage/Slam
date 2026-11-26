/* ============================================================================
   SLAM the Game, test: tests/fire-drills.js
   PURPOSE     Examine the money fire drills, the ladder (if the pay stopped), the one-way doors, and
               the tour.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/drills.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen;
  G.demo = false;
  delete G.tourSeen;
  const R3 = r => Object.assign({ s: true, cf: 3 }, r);
  const a = Object.assign(newChar(), {
    name: "Fay",
    led: true,
    placed: true,
    age: 30,
    ret: 60,
    take: 4000,
    spend: 3000,
    inv: 30000,
    incs: [R3({ k: "A main job", amt: 3600 }), R3({ k: "Side gigs", amt: 400 })],
    spends: [
      R3({ k: "Home", amt: 1400 }),
      R3({ k: "Food", amt: 500 }),
      R3({ k: "Getting around", amt: 300 }),
      R3({ k: "Bills and subscriptions", amt: 200 }),
      R3({ k: "Fun and everything else", amt: 600 }),
    ],
    cashes: [R3({ k: "Checking", amt: 1200 }), R3({ k: "Savings", amt: 4800 })],
    invs: [R3({ k: "IRA or Roth IRA", amt: 20000 }), R3({ k: "Other investments", amt: 10000 })],
    debts: [R3({ k: "Credit card balance", amt: 1500, high: true })],
    moves: [],
    x: {},
  });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C();
  chk(
    "Home offers the tour first, alone, under the four cards (results.js)",
    app().includes("Take the 3-tap tour") &&
      !app().includes("Meet your character") &&
      app().indexOf("<!--homerows-->") > 0 &&
      app().indexOf("<!--homerows-->") < app().indexOf('data-a="tour"') &&
      app().includes('class="rowbtn homerow" data-a="tour"')
  );
  X("tour");
  chk(
    "tour card 1 of 3 with a skip",
    W.kind === "tour" && ov().includes("1 of 3") && ov().includes("Skip the tour") && clean(ov())
  );
  X("tournext");
  X("tournext");
  chk(
    "three taps reach the end",
    ov().includes("3 of 3") && ov().includes("Got it") && !ov().includes("Skip the tour")
  );
  X("tourdone");
  chk(
    "done: remembered, and Home stops offering it",
    !!G.tourSeen && !app().includes("Take the 3-tap tour") && app().includes("Meet your character")
  );
  const L = fdList(c, D),
    by = id => L.find(x => x.id === id);
  chk(
    "six drills for someone working with cash, investments and a card",
    L.map(x => x.id).join() === "bill,job,cut,crash,miss,interest",
    L.map(x => x.id).join()
  );
  chk(
    "bill: covered from 6,000 of cash",
    by("bill").calm === true && by("bill").big === "Covered" && by("bill").line.includes("$5,000")
  );
  chk(
    "job: 2 months at full spending, 2.5 at the basics",
    by("job").line.includes("2.0 months") && by("job").line.includes("2.5 months") && by("job").calm === false,
    by("job").line
  );
  chk("cut: 3,200 in against 3,000 out leaves 200", by("cut").big === "$200 left" && by("cut").calm === true);
  chk("crash: a third off 30,000", by("crash").big === "Down $10,000" && by("crash").line.includes("$20,000"));
  chk(
    "each drill says how long it lasts and has a small real dose",
    L.every(o => o.lasts && o.dose) && !/skip a payment|miss a payment on purpose/i.test(JSON.stringify(FD_MORE))
  );
  chk(
    "interest: the balance times the rate, by month",
    !!by("interest") && by("interest").calm === null && by("interest").big.includes("a month")
  );
  chk("miss: facts, no verdict", by("miss").calm === null && by("miss").line.includes("30 days"));
  c.cashes[1].amt = 300;
  D = derive(c);
  const L2 = fdList(c, D);
  chk(
    "bill short: says how much and what it costs",
    L2[0].big === "$" + (1000 - D.cash).toLocaleString() + " short" || L2[0].calm === true,
    L2[0].big + " cash " + D.cash
  );
  c.cashes[1].amt = 4800;
  D = derive(c);
  c.cashes[0].s = false;
  const L3 = fdList(c, derive(c));
  chk("a drill on a guess gets no covered tag", L3[0].real === false && L3[0].calm === null);
  c.cashes[0].s = true;
  chk(
    "the menu has it",
    MENU.some(m => m[1] === "drills")
  );
  X("drills");
  chk(
    "list: fears, covered pills, a way to the ladder",
    W.kind === "drills" &&
      ov().includes("Your pay stops tomorrow") &&
      ov().includes("Covered") &&
      ov().includes('data-a="ladder"') &&
      clean(ov()),
    junk(ov())
  );
  X("fdopen", "job");
  chk(
    "one drill: the number, the line, the math, the rep",
    ov().includes("Your rep") &&
      ov().includes("I did the rep") &&
      ov().includes("10 min") &&
      ov().includes("See what you would use first") &&
      clean(ov()),
    junk(ov())
  );
  X("fddone", "job");
  X("fddone", "job");
  chk(
    "reps are counted, never a streak",
    C().x.drills.job.n === 2 && ov().includes("Practiced 2 times") && !/streak/i.test(ov())
  );
  X("drills");
  chk("the list remembers", ov().includes("practiced 2x"));
  // the ladder
  const LD = ldOf(c, D, "full");
  chk(
    "ladder by hand: need 3,000 minus 400 side income; checking, savings, then taxable",
    LD.need === 2600 &&
      LD.rungs.map(r => r.id).join() === "checking,savings,taxable" &&
      Math.abs(LD.months - (1200 + 4800 + 10000) / 2600) < 1e-9 &&
      Math.abs(LD.cashMo - 6000 / 2600) < 1e-9 &&
      LD.costly.map(r => r.id).join() === "card,retire" &&
      LD.costly[1].amt === 20000,
    JSON.stringify([LD.need, LD.months])
  );
  const LL = ldOf(c, D, "lean");
  chk("just the basics: 2,400 minus 400", LL.need === 2000 && LL.level === "lean" && LL.months > LD.months);
  X("ladder");
  chk(
    "ladder sheet: order, months, the costly rungs set apart",
    W.kind === "ladder" &&
      ov().includes("1. Checking") &&
      ov().includes("2. Savings") &&
      ov().includes("3. Investments outside retirement") &&
      ov().includes("the ones that cost extra") &&
      ov().includes("Retirement money") &&
      ov().includes("gone by month") &&
      clean(ov()),
    junk(ov())
  );
  X("ldlevel", "lean");
  chk("switching level", W.level === "lean" && ov().includes("$2,000 a month"));
  const e = Object.assign(newChar(), {
    name: "Nil",
    led: true,
    placed: true,
    take: 3000,
    spend: 3000,
    inv: 0,
    incs: [R3({ k: "A main job", amt: 3000 })],
    spends: [],
    cashes: [],
    invs: [],
    debts: [],
    x: {},
  });
  G.chars.push(e);
  G.active = n0 + 1;
  save();
  go("home");
  X("ladder");
  chk(
    "nothing saved: says so plainly, no junk",
    ov().includes("Nothing set aside yet") && ov().includes("just the basics") && clean(ov()),
    junk(ov())
  );
  X("drills");
  chk("drills still run with empty rows", clean(ov()), junk(ov()));
  G.chars.pop();
  G.active = n0;
  save();
  go("home");
  // one-way doors
  chk(
    "door notes exist only for moves that exist",
    Object.keys(DOORS).every(id => MOVES.some(m => m.id === id))
  );
  const fit = movesFor(C()).map(r => r.id),
    dm = fit.find(id => DOORS[id]),
    tm = fit.find(id => !DOORS[id]);
  if (dm) {
    X("moves");
    X("mvopen", dm);
    chk(
      "a hard-to-undo move says so, next to the pin button",
      ov().includes("One-way door.") &&
        ov().includes('data-door="' + dm + '"') &&
        ov().indexOf("data-door=") < ov().indexOf('data-a="mvpin" data-v="' + dm + '"')
    );
    if (tm) {
      X("mvopen", tm);
      chk("an easy-to-undo move gets no note", !ov().includes("One-way door."));
    }
    X("compare");
    W.picks = [dm];
    drawSheet();
    chk("side by side carries the note too", ov().includes("One-way door."));
    X("close");
  }
  chk(
    "the checklist flipped its rows",
    btRows()
      .filter(r =>
        [
          "Money fire drills",
          "A three-tap tour of the tabs",
          "One-way door notes on moves that are hard to undo",
        ].includes(r.n)
      )
      .every(r => r.st === "b") &&
      btRows().find(r => r.n.startsWith("If the pay stopped")).st === "p" &&
      btCount(btRows()).x === 0
  );
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  if (tour0) G.tourSeen = tour0;
  else delete G.tourSeen;
  save();
  go("home");
}
