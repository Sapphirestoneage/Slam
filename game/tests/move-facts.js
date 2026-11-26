/* ============================================================================
   SLAM the Game, test: tests/move-facts.js
   PURPOSE     Examine the facts about you of "Moves to try": one question for each fact, asked once
               for every move (the credit score sorts five moves with one tap), the one question
               first on Next Steps and in the library, the old answers inside one move, the card
               vault and the moves reading the same score, and the levers ("What would open the
               most"): the smallest change of one fact, the moves it opens, and its steps.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile (rent $1,800, a $6,000
               card at 24%).
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/strat.js, data/strategies.js, features/vault.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Facts",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      work: "Established",
      home: "Renting",
      live: ["On my own"],
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
    V = id => stgVerdict(c, stgOf(id));

  /* ONE QUESTION FOR EACH FACT */
  chk(
    "each fact check names a known fact and has a test",
    STRATEGIES.every(S => S.fitChecks.every(k => !k.fact || (STG_FACTS[k.fact] && typeof k.test === "function")))
  );
  chk(
    "the credit score is one fact for the five moves that need it",
    stgFactMoves("score")
      .map(S => S.id)
      .sort()
      .join() === "consolidate,househack,purchase,transfer,welcome"
  );
  const open = stgOpenFacts(c);
  chk(
    "the first question is the score, the one that sorts the most moves",
    open[0].id === "score" && open[0].moves.length >= 4,
    open.map(r => r.id + ":" + r.moves.length).join()
  );
  chk("setup knows the home, so the game does not ask it", !open.some(r => r.id === "home"));
  chk("from the numbers, never asked: the costly debt", !open.some(r => r.id === "debt8"));

  /* Next Steps shows the one question */
  go("plan");
  chk(
    "Next Steps asks the one question first, with its answers as taps",
    app().includes("One question first") && app().includes('data-a="stgfact" data-k="score"')
  );

  /* ONE TAP ANSWERS EACH MOVE */
  X("stgfact", "580 to 669", "score");
  chk("the answer lives on the profile, where the rest of the game reads it", c.caught.score === "580 to 669");
  chk(
    "one tap: the four moves that need 670 wait on credit, and the house hack passes 580",
    ["transfer", "consolidate"].every(id => V(id).v === "notyet" && V(id).block === "credit") &&
      ["purchase", "welcome"].every(id => V(id).v === "notyet") &&
      !stgChecks(c, stgOf("househack"), stgInputs(c, stgOf("househack")), stgCalc(c, stgOf("househack"))).find(
        r => r.k.id === "credit"
      ).ok === false
  );
  chk("the score is not asked again", !stgOpenFacts(c).some(r => r.id === "score"));
  chk("the card vault reads the same score", vaultScore(c).v === "fair");

  /* THE LEVERS */
  const sc = stgLevers(c).find(l => l.id === "score");
  chk(
    "the lever of the score: the smallest band that opens the most, and the moves it opens",
    sc &&
      sc.v === "670 to 739" &&
      sc.to === "A score of 670 or more" &&
      sc.now === "580 to 669" &&
      sc.opens.some(S => S.id === "transfer") &&
      sc.opens.some(S => S.id === "consolidate"),
    JSON.stringify(sc && { v: sc.v, opens: sc.opens.map(S => S.id) })
  );
  chk(
    "a move that also waits on the costly debt does not count as opened by the score alone",
    !sc.opens.some(S => S.id === "welcome")
  );
  X("stgfact", "yes", "hdhp");
  chk(
    "the lever of the costly debt opens the HSA",
    stgLevers(c)
      .find(l => l.id === "debt8")
      .opens.some(S => S.id === "hsa")
  );
  chk(
    "a what-if leaves the profile as it was",
    c.caught.score === "580 to 669" && STGF.sim === null && V("transfer").v === "notyet"
  );

  /* The library shows the levers and the answers */
  X("stratlib");
  chk(
    "the library shows what would open the most, how to get there, and the answers to change",
    ov().includes("What would open the most") &&
      ov().includes("A score of 670 or more") &&
      ov().includes("How to get there") &&
      ov().includes("Your answers")
  );
  X("stglever", "", "score");
  const steps = plX(c).plan.filter(p => p.v === "lever:score");
  chk(
    "the steps of the score go to Next Steps once",
    steps.length === STG_FACTS.score.path.length &&
      (X("stglever", "", "score"), plX(c).plan.filter(p => p.v === "lever:score").length === steps.length)
  );
  chk("the lever card says the steps are on Next Steps", ov().includes("On your Next Steps"));
  X("close");

  /* "I DON'T KNOW IT" */
  X("stgfact", "unsure", "score");
  chk(
    "I don't know it: a soft roadblock to find out, never a No",
    V("transfer").v === "notyet" && V("transfer").block === "knowledge" && /bank and card apps/.test(V("transfer").why)
  );
  chk(
    "I don't know it: the score lever starts with the one step to look it up",
    stgLevers(c).find(l => l.id === "score").path === STG_FACTS.score.pathUnsure
  );

  /* A FACT CHECK INSIDE ONE MOVE answers the others */
  X("strat", "consolidate");
  chk(
    "inside a move, the fact shows its bands and says it answers every move",
    ov().includes("One answer for every move that asks this") && ov().includes('data-v="670 to 739"')
  );
  X("stgfact", "670 to 739", "score");
  chk(
    "a band tapped inside one move answers the others",
    V("transfer").block !== "credit" && V("transfer").v === "fits" && c.caught.score === "670 to 739"
  );
  X("close");

  /* THE HOME AND THE PEOPLE: from setup */
  chk(
    "living on my own answers 'the people I live with agree'",
    stgChecks(c, stgOf("room"), stgInputs(c, stgOf("room")), stgCalc(c, stgOf("room"))).find(r => r.k.id === "house")
      .ok === true
  );
  c.home = "With family";
  chk(
    "with family: the room move is not for you, and the lever is a place of your own",
    V("room").v === "no" &&
      /your own place/.test(V("room").why) &&
      stgLevers(c).some(l => l.id === "home" && l.opens.some(S => S.id === "room"))
  );
  c.home = "Renting";

  /* OLD ANSWERS INSIDE ONE MOVE still count */
  const b = Object.assign(newChar(), {
    name: "Old",
    x: { stg: { transfer: { fit: { credit: "y" } }, room: { fit: { spare: "n" } } } },
  });
  chk("an old Yes to 670 inside one move reads as the band 670 to 739", stgFact(b, "score") === "670 to 739");
  chk("an old No to the spare room reads as No", stgFact(b, "spare") === "no");
  const b2 = Object.assign(newChar(), {
    name: "Old2",
    x: { stg: { welcome: { fit: { credit: "n" } }, househack: { fit: { credit: "y" } } } },
  });
  chk("an old No to 670 and Yes to 580 reads as 580 to 669", stgFact(b2, "score") === "580 to 669");

  chk("the term has an i", !!GLOSS.stg_lever);
  G.chars.length = n0;
  G.active = 0;
  save();
}
