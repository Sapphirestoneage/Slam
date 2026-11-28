/* ============================================================================
   SLAM the Game, test: tests/your-people.js
   PURPOSE     Examine Your people: round 1 (who is in the money life of the player), round 2 (one
               question on each screen for each person), and "Back one" between the games of layer 1.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. One sample profile
               that this file makes (the same profile in the six files that came from one older file).
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/people.js.
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
  X("party");
  let o = ov();
  chk(
    "people: round one has no attributes yet",
    W.kind === "party" &&
      o.includes("Round 1 of 2") &&
      o.includes("It's just me") &&
      !o.includes("How does money move") &&
      o.includes("Why we ask") &&
      clean(o),
    junk(o)
  );
  X("ppadd", "Roommate");
  X("ppadd", "Kid");
  X("ppadd", "Roommate");
  chk(
    "added people are numbered when two are the same kind",
    ppName(c, 0) === "Roommate 1" &&
      ppName(c, 2) === "Roommate 2" &&
      ppName(c, 1) === "Kid" &&
      (ov().match(/data-a="pprm"/g) || []).length === 3
  );
  X("pprm", "2");
  chk("remove takes one person off right there", c.party.length === 2 && !ov().includes("Roommate 2"));
  X("ppgo");
  X("pplink", null, "split");
  chk(
    "a tapped way shows as picked and can be taken off",
    ov().includes("✓ We split bills") && c.party[0].links.join() === "split"
  );
  X("pplink", null, "split");
  chk("tap again removes it", c.party[0].links.length === 0 && ov().includes("Skip Roommate for now"));
  X("pplink", null, "split");
  X("pplink", null, "theypay");
  X("ppnext");
  chk("amount is its own screen", W.pp.q === 1 && ov().includes("About how much do they cover each month?"));
  X("ppback");
  chk("back one returns to the ways", W.pp.q === 0 && ov().includes("How does money move"));
  X("ppnext");
  X("ppamt", "250", "theypay");
  chk(
    "then which costs are split",
    ppSteps(c.party[0])[W.pp.q] === "split" && ov().includes("Which costs do you split with Roommate?")
  );
  X("ppsplit", null, "Home");
  X("ppnext");
  chk(
    "a kid gets one question about cost",
    W.pp.i === 1 &&
      ov().includes("About how much does Kid cost each month?") &&
      ov().includes("already inside your spending")
  );
  X("ppback");
  chk("back one crosses to the person before", W.pp.i === 0);
  X("ppnext");
  X("ppamt", "500", "cost");
  o = ov();
  chk(
    "last screen: what you did and what changed",
    W.pp.r === 3 &&
      o.includes("What you just did") &&
      o.includes("Roommate") &&
      o.includes("Covers some of yours $250 a month") &&
      o.includes("Costs about $500 a month") &&
      o.includes("What that changed") &&
      c.x.help === 250 &&
      clean(o),
    junk(o)
  );
  X("ppedit");
  chk("change someone goes back to round one", W.pp.r === 1);
  X("pprm", "0");
  X("pprm", "0");
  X("ppgo");
  chk(
    "nobody left: it is just you is a real answer",
    W.pp.r === 3 && c.party.length === 0 && ov().includes("It is just you")
  );
  X("ppdone");
  X("l1");
  W.step = "gear";
  drawSheet();
  chk("the first game has Back one", ov().includes('data-a="l1back"'));
  X("l1back");
  chk("back one from gear is the intro", W.step === "intro");
  W.step = "party";
  W.pp = null;
  drawSheet();
  X("l1back");
  chk("back one from people is gear", W.step === "gear");
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  G.tourSeen = tour0;
  save();
  go("home");
}
