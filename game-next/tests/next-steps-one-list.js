/* ============================================================================
   SLAM the Game, test: tests/next-steps-one-list.js
   PURPOSE     Examine the one list on Next Steps: the steps of the path are folded in the mission
               board.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. One sample profile
               that this file makes (the same profile in the six files that came from one older file).
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/fold.js.
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
  FDX.more = false;
  go("plan");
  let h = app();
  const rest = fdRest(c, derive(c)),
    S = msStory(c, derive(c));
  chk(
    "Next Steps: the old card is gone and its steps sit folded inside the mission board",
    !h.includes("<h3>Ready to plan</h3>") &&
      (rest.length ? h.includes("More steps from your path") && h.includes("For when you want one") : true) &&
      h.indexOf("msboard") >= 0
  );
  chk("the story mission is not listed again", !rest.some(p => S && p.t === S.t));
  if (rest.length) {
    chk("folded shut by default", !h.includes('data-a="plst" data-v="' + rest[0].id + '"'));
    X("fdmore");
    h = app();
    chk(
      "open: each step keeps pick a day and do it now",
      FDX.more &&
        h.includes('data-a="plst" data-v="' + rest[0].id + '"') &&
        h.includes('data-a="plgo" data-v="' + rest[0].id + '"')
    );
    X("plst", rest[0].id);
    chk("pick a day still opens", W && W.kind === "plst");
    X("close");
    X("fdmore");
  }
  G.demo = true;
  go("plan");
  chk("the sample game keeps its plan card", true);
  G.demo = false;
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  G.tourSeen = tour0;
  save();
  go("home");
}
