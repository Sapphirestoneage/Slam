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
    "step 1: pick what matters, next is locked until one is picked",
    W.kind === "values" && ov().includes("Pick up to three") && ov().includes("disabled") && clean(ov())
  );
  X("vltop", "Freedom and time");
  X("vltop", "Health");
  X("vltop", "Family");
  X("vltop", "Fun");
  chk("three at most", vlGet(C()).top.length === 3 && !vlGet(C()).top.includes("Fun"));
  X("vltop", "Family");
  X("vltop", "Fun");
  chk("tap one to swap it out", vlGet(C()).top.join() === "Freedom and time,Health,Fun");
  X("vlstep", "2");
  chk(
    "step 2: every place the money goes, two taps each",
    ov().includes("Home") &&
      ov().includes("None of these") &&
      ov().includes("Want less") &&
      ov().includes("Feels right") &&
      clean(ov()),
    junk(ov())
  );
  X("vlserve", "", "Home");
  X("vlmark", "ok", "Home");
  X("vlserve", "Health", "Food");
  X("vlmark", "more", "Food");
  X("vlserve", "", "Bills and subscriptions");
  X("vlmark", "less", "Bills and subscriptions");
  X("vlserve", "Fun", "Fun and everything else");
  X("vlmark", "ok", "Fun and everything else");
  const VR = vlResult(C());
  chk(
    "result by hand: 600 on health and 400 on fun out of 3,000",
    VR.complete &&
      VR.on === 1000 &&
      VR.pct === 33 &&
      VR.by.Health === 600 &&
      VR.by.Fun === 400 &&
      VR.okPct === 73 &&
      VR.less[0].k === "Bills and subscriptions" &&
      VR.more[0].k === "Food" &&
      VR.starved.join() === "Freedom and time",
    JSON.stringify([VR.on, VR.pct, VR.okPct, VR.starved])
  );
  X("vlstep", "3");
  chk(
    "step 3: the number, each value, less, more, and what gets nothing yet",
    ov().includes("33%") &&
      ov().includes("You want less of: Bills and subscriptions") &&
      ov().includes("You want more of: Food") &&
      ov().includes("Freedom and time") &&
      ov().includes("none of your spending serves it yet") &&
      clean(ov()),
    junk(ov())
  );
  chk("no grade words", !/bad|wasted|wrong|failing grade|should not/i.test(ov().replace(/<[^>]+>/g, " ")));
  X("vltop", "Health");
  chk(
    "dropping a value clears what pointed at it",
    vlGet(C()).serves.Food === undefined && vlGet(C()).top.length === 2
  );
  X("close");
  go("me");
  chk("Me shows a prompt until it is complete again", app().includes("Three things that matter"));
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  if (fair0) G.fair = fair0;
  else delete G.fair;
  save();
  go("home");
}
