/* ============================================================================
   SLAM the Game, test: tests/life-transitions.js
   PURPOSE     Examine "Break in case of emergency": the dip of a layoff worked out by hand, the
               tripwires, family help counted at its risk, quick income, the slots and the advantages.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/transit.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Jay",
      led: true,
      placed: true,
      take: 4000,
      spend: 3000,
      incs: [R0({ k: "A main job", amt: 4000 })],
      spends: [
        R0({ k: "Home", amt: 1500 }),
        R0({ k: "Food", amt: 500 }),
        R0({ k: "Fun and everything else", amt: 1000 }),
      ],
      cashes: [R0({ k: "Checking", amt: 3000 }), R0({ k: "Savings", amt: 9000 })],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C(),
    set = (k, v) => (kitStore(c, "tr")[k] = { v, cf: 2 });
  let T = trCalc(c);
  /* by hand: costs 3,000, no other income, nothing coming in. Gap 3,000. 6 months: dip 18,000. Cash 12,000: lasts 4 months, short 6,000. */
  chk("the gap is the costs when no money comes in", T.gap === 3000 && T.need === 3000, T.gap);
  chk("the dip: gap x months", T.dip === 18000);
  chk("the cash lasts cash / gap", Math.abs(T.runway - 4) < 1e-9 && T.short === 6000 && !T.covered);
  chk("unemployment pay has no typical value", T.ui === 0);
  set("ui", 1000);
  set("fam", 500);
  set("sure", "likely");
  set("quick", 250);
  set("months", 6);
  set("level", "full");
  T = trCalc(c);
  /* by hand: family 500 x 75% = 375. In: 1,000 + 375 + 250 = 1,625. Gap 1,375. Dip 8,250. Left 12,000 - 8,250 = 3,750. */
  chk("family help counts at the share for how sure it is", T.famCount === 375 && T.famAsset === 2250);
  chk(
    "the gap after the money in",
    T.gap === 1375 && T.dip === 8250 && T.left === 3750 && T.covered,
    JSON.stringify([T.gap, T.dip, T.left])
  );
  chk("with real numbers and tapped answers, the state is Close", T.st === "Close", T.st);
  set("level", "lean");
  T = trCalc(c);
  /* the basics here: Home 1,500 + Food 500 = 2,000 */
  chk("cut to the basics uses the basic costs", T.out === 2000 && T.basic === 2000, T.out);
  set("level", "full");
  T = trCalc(c);
  const R = trTrips(c, T);
  /* by hand: 3 months of basics = 6,000. (12,000 - 6,000) / 1,375 = 4.36 months. */
  chk(
    "a tripwire: the level in dollars and the month it is reached",
    R[0].level === 6000 && Math.abs(R[0].at - 6000 / 1375) < 1e-9,
    R[0].at
  );
  X("transit");
  chk(
    "the sheet opens on the dip, with two tiles and the math",
    ov().includes("Your cash lasts") && ov().includes("the dip costs") && ov().includes("Show the math") && clean(ov()),
    junk(ov())
  );
  X("trtab", "trip");
  X("trtrip", "Cut to the basics", "3");
  chk(
    "a tripwire choice is kept",
    c.x.trx.trip[3] === "Cut to the basics" && ov().includes("3 months of cash left") && clean(ov()),
    junk(ov())
  );
  X("trtab", "fam");
  chk(
    "the family part shows the share counted",
    ov().includes("75%") && ov().includes("$375") && clean(ov()),
    junk(ov())
  );
  X("trtab", "quick");
  X("trquick", "sell");
  chk(
    "quick income is in the order of the time to the first dollar",
    ov().indexOf("Sell things") < ov().indexOf("Rent out a room") && c.x.trx.quick.includes("sell")
  );
  X("trtab", "slots");
  chk("the slots use plain labels", ov().includes(">Money<") && !ov().includes("Economic"));
  X("trcard", "Basics-only spending", "money");
  X("tradv", "A partner with income");
  chk(
    "the plan card lists the card, the tripwire and the advantage",
    ov().includes("Running: Basics-only spending") &&
      ov().includes("Leaning on: A partner with income") &&
      ov().includes("Cut to the basics") &&
      clean(ov()),
    junk(ov())
  );
  G.gamer = true;
  X("trtab", "slots");
  chk(
    "with the gamer switch, each slot shows the game word next to the plain word",
    ["Economic / Money", "Military / Time", "Diplomatic / People", "Wildcard / Flex"].every(t => ov().includes(t))
  );
  G.gamer = false;
  X("close");
  go("goals");
  chk("My Goals has the row", app().includes("Break in case of emergency"));
  chk(
    "the spreadsheet section",
    trBook(c).rows.some(r => r.id === "tr_dip" && r.f === "={tr_gap}*{tr_months}")
  );
  chk(
    "built list",
    btRows().some(r => r.n.startsWith("Break in case of emergency") && r.st === "b") && btCount(btRows()).x === 0
  );
  G.chars.length = n0;
  G.active = 0;
  save();
}
