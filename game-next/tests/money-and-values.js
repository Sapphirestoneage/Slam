/* ============================================================================
   SLAM the Game, test: tests/money-and-values.js
   PURPOSE     Examine "Is my money going where I want?": the three steps and the result.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. One sample profile
               that this file makes.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/values.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    fair0 = G.fair;
  G.demo = false;
  delete G.fair;
  const R3 = r => Object.assign({ s: true, cf: 3 }, r);
  G.chars.push(
    Object.assign(newChar(), {
      name: "Ana",
      led: true,
      placed: true,
      take: 5000,
      spend: 3000,
      incs: [R3({ k: "A main job", amt: 5000 })],
      spends: [
        R3({ k: "Home", amt: 1800 }),
        R3({ k: "Food", amt: 600 }),
        R3({ k: "Bills and subscriptions", amt: 200 }),
        R3({ k: "Fun and everything else", amt: 400 }),
      ],
      x: {},
    })
  );
  G.active = n0;
  save();
  go("home");
  go("me");
  chk("Me has the way in", app().includes("Is my money going where I want?") && MENU.some(m => m[1] === "values"));
  X("values");
  chk(
    "step 1: rank what matters, next is locked until one is ranked",
    W.kind === "values" && ov().includes("Tap them in order") && ov().includes("disabled") && clean(ov())
  );
  X("vltop", "Freedom and time");
  X("vltop", "Health");
  X("vltop", "Fun");
  X("vltop", "Family");
  chk("no cap: four ranked in tap order", vlGet(C()).rank.join() === "Freedom and time,Health,Fun,Family");
  chk("the top three are the first three", vlGet(C()).top.join() === "Freedom and time,Health,Fun");
  X("vlstep", "2");
  chk(
    "step 2: one place at a time, the values it serves, would you change this",
    ov().includes("Home") &&
      ov().includes("None") &&
      ov().includes("Would you change this?") &&
      ov().includes("Keep it") &&
      clean(ov()),
    junk(ov())
  );
  X("vlserve", "", "Home");
  X("vlmark", "keep", "Home");
  X("vlserve", "Health", "Food");
  X("vlmark", "more", "Food");
  X("vlserve", "", "Bills and subscriptions");
  X("vlmark", "less", "Bills and subscriptions");
  X("vlserve", "Fun", "Fun and everything else");
  X("vlmark", "keep", "Fun and everything else");
  const VR = vlResult(C());
  chk(
    "result by hand: 600 on health and 400 on fun out of 3,000",
    VR.complete &&
      VR.on === 1000 &&
      VR.pct === 33 &&
      VR.by.Health === 600 &&
      VR.by.Fun === 400 &&
      VR.change === 60 - 20 &&
      VR.less[0].k === "Bills and subscriptions" &&
      VR.more[0].k === "Food" &&
      VR.starved.join() === "Freedom and time",
    JSON.stringify([VR.on, VR.pct, VR.change, VR.starved])
  );
  X("vlstep", "3");
  chk(
    "step 3: the number, each value, where it matches and not, one idea",
    ov().includes("33%") &&
      ov().includes("Where it matches") &&
      ov().includes("Where it doesn't") &&
      ov().includes("Freedom and time") &&
      ov().includes("One idea:") &&
      clean(ov()),
    junk(ov())
  );
  chk("no grade words", !/bad|wasted|wrong|failing grade|should not/i.test(ov().replace(/<[^>]+>/g, " ")));
  X("vlrm", "Health");
  chk(
    "dropping a value asks again where it pointed",
    vlServes(vlGet(C()), "Food") === null && vlGet(C()).rank.length === 3
  );
  X("close");
  go("me");
  chk("Me shows a prompt until it is complete again", app().includes("Rank what matters"));
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  if (fair0) G.fair = fair0;
  else delete G.fair;
  save();
  go("home");
}
