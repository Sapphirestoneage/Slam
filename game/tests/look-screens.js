/* ============================================================================
   SLAM the Game, test: tests/look-screens.js
   PURPOSE     Examine the showcase screens of the dashboard look (features/look.js): the stat row of Home,
               the dashboard of My Money and the sort of its lists, the goal cards and the dial of one
               goal, the Debt plan with its stat row and dial, and the pay period of Next Steps.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/look.js, screens/dash.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen,
    R = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Look",
      led: true,
      placed: true,
      age: 33,
      ret: 60,
      take: 5600,
      spend: 4000,
      inv: 30000,
      work: "Established",
      incs: [R({ k: "A main job", amt: 5600 })],
      spends: [
        R({ k: "Home", amt: 2000 }),
        R({ k: "Food", amt: 900 }),
        R({ k: "Getting around", amt: 600 }),
        R({ k: "Fun and everything else", amt: 500 }),
      ],
      cashes: [R({ k: "Checking", amt: 3000 }), R({ k: "Savings", amt: 9000 })],
      invs: [R({ k: "Retirement plan at work", amt: 30000 })],
      debts: [
        R({ k: "Credit card balance", amt: 5000, high: true, apr: "15% to 25%", rate: 24, pay: 150 }),
        R({ k: "Car loan", amt: 12000, high: false, apr: "Under 8%", rate: 5, pay: 320 }),
      ],
      goals: [
        {
          id: "gtrip",
          k: "Trip",
          n: "Japan trip",
          cost: 6000,
          s: true,
          era: null,
          fund: 1500,
          blk: null,
          d: "2026-11-01",
        },
      ],
    });
  a.debtKinds = a.debts.map(x => x.k);
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C();
  go("home");
  let o = app();
  chk(
    "Home: the stat row with its four numbers, above the four boxes",
    o.includes("Free to spend") &&
      o.includes("Net worth") &&
      o.includes("Next goal") &&
      o.includes("Free of costly debt") &&
      o.indexOf("dkstats") < o.indexOf('class="quad"') &&
      clean(o),
    junk(o)
  );
  const s = lkHome(c, D);
  chk(
    "Home math: costly debt has a date, the next goal is the trip",
    s.hi.none === false && s.hi.months > 0 && s.goal && s.goal.n === "Japan trip"
  );

  go("money");
  o = app();
  chk(
    "My Money: stat row, what you have, where it goes, under the title",
    o.includes("What you have") &&
      o.includes("Where it goes") &&
      o.includes("dkdonut") &&
      o.indexOf("dkstats") < o.indexOf("Cash") &&
      clean(o),
    junk(o)
  );
  chk(
    "My Money: each list with two lines or more has sort chips",
    o.includes('data-a="ledsort" data-k="spends"') || o.includes('data-a="ledsort" data-k="cashes"')
  );
  X("ledsort", "big", "cashes");
  o = app();
  chk(
    "sort: biggest first puts Savings over Checking, and the lines keep their places",
    o.indexOf('data-k="cashes" data-v="1"') < o.indexOf('data-k="cashes" data-v="0"') && c.cashes[0].k === "Checking"
  );
  X("ledsort", "mine", "cashes");

  go("goals");
  o = app();
  chk(
    "My Goals: a goal card with the date, the progress and the strategy",
    o.includes("dkgoal") &&
      o.includes("Japan trip") &&
      o.includes("$1,500 of $6,000") &&
      o.includes("Strategy:") &&
      clean(o),
    junk(o)
  );
  goalSheet("gtrip");
  o = ov();
  chk(
    "one goal: the Time-Money dial",
    o.includes("Time and money") && o.includes('id="tmd-ggtrip"') && clean(o),
    junk(o)
  );
  X("tmdmark", "m:250", "ggtrip");
  chk(
    "the goal dial: +$250 a month brings it sooner",
    TMD.ggtrip.st.extra === 250 &&
      TMD.ggtrip.st.months < TMD.ggtrip.base.months &&
      tmdText("ggtrip").startsWith("Put $250 more a month toward it")
  );
  closeSheet();

  go("money");
  X("debtplan");
  o = ov();
  chk(
    "Debt plan: stat row, the order, the dial; the old extra chips are gone",
    o.includes("Total debt") &&
      o.includes("Debt-free") &&
      o.includes("Total interest") &&
      o.includes('id="tmd-debt"') &&
      !o.includes("Extra you can add each month") &&
      clean(o),
    junk(o)
  );
  X("tmdmark", "m:100", "debt");
  o = ov();
  chk(
    "a tap on +$100 sets the plan's extra and the stat row",
    W.extra === 100 && o.includes("+$100") && TMD.debt.st.extra === 100
  );
  X("dborder", "snowball");
  chk("the order toggle keeps the dial's extra", W.order === "snowball" && TMD.debt.st.extra === 100);
  closeSheet();

  go("plan");
  o = app();
  chk(
    "Next Steps: the pay period card with the day strip",
    o.includes("This pay period") && o.includes("dkdays") && o.includes("Bills left this period") && clean(o),
    junk(o)
  );

  G.chars.splice(n0);
  G.active = act0;
  G.demo = demo0;
  G.tourSeen = tour0;
  save();
}
