// ---------- sharing costs fairly, and values ----------
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    fair0 = G.fair;
  G.demo = false;
  delete G.fair;
  const R3 = r => Object.assign({ s: true, cf: 3 }, r);
  const P = [
      { n: "A", inc: 6000, hrs: 5, nights: 7 },
      { n: "B", inc: 3000, hrs: 25, nights: 7 },
      { n: "C", inc: 1000, hrs: 10, nights: 2 },
    ],
    T = 3000,
    F = frCalc(P, T, 20),
    sum = a => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100;
  chk(
    "every method splits the whole amount, nobody below zero",
    ["equal", "income", "labor", "left", "use"].every(k => Math.abs(sum(F[k]) - T) < 0.01 && F[k].every(v => v >= 0)),
    JSON.stringify(F)
  );
  chk(
    "equal by hand",
    F.equal.every(v => v === 1000)
  );
  chk(
    "by income by hand: 60, 30 and 10 percent",
    Math.abs(F.income[0] - 1800) < 1e-9 && Math.abs(F.income[1] - 900) < 1e-9 && Math.abs(F.income[2] - 300) < 1e-9
  );
  chk("by use by hand: 7, 7 and 2 nights", Math.abs(F.use[0] - 1312.5) < 1e-9 && Math.abs(F.use[2] - 375) < 1e-9);
  const val = [5, 25, 10].map(h => ((h * 52) / 12) * 20),
    pot = (T + val[0] + val[1] + val[2]) / 3;
  chk(
    "labor counts by hand: 25 hours a week is worth more than an equal share here, so B pays zero and A and C cover it, still a home-work gap apart",
    pot - val[1] < 0 &&
      F.labor[1] === 0 &&
      Math.abs(F.labor[0] - F.labor[2] - (val[2] - val[0])) < 1e-6 &&
      Math.abs(F.val[1] - val[1]) < 1e-9,
    JSON.stringify(F.labor)
  );
  const F2 = frCalc(P, 6000, 20),
    pot2 = (6000 + val[0] + val[1] + val[2]) / 3;
  chk(
    "labor counts with no floor needed: pot split equally, work taken off",
    Math.abs(F2.labor[0] - (pot2 - val[0])) < 1e-6 &&
      Math.abs(F2.labor[1] - (pot2 - val[1])) < 1e-6 &&
      F2.labor[1] < F2.labor[0]
  );
  chk(
    "same left over by hand: (10,000 minus 3,000) over 3 each; the one who cannot pays zero and the rest cover it",
    F.left[2] === 0 && Math.abs(F.left[0] - F.left[1] - 3000) < 1e-6 && Math.abs(F.left[0] + F.left[1] - 3000) < 1e-6,
    JSON.stringify(F.left)
  );
  const two = frCalc(
    [
      { n: "x", inc: 4000, hrs: 0, nights: 7 },
      { n: "y", inc: 2000, hrs: 0, nights: 7 },
    ],
    3000,
    20
  );
  chk(
    "two people: left over ends equal at 1,500 each",
    Math.abs(two.left[0] - 2500) < 1e-6 && Math.abs(two.left[1] - 500) < 1e-6 && Math.abs(two.labor[0] - 1500) < 1e-6
  );
  chk(
    "heavy home work can bring a share to zero, never below",
    frCalc(
      [
        { n: "x", inc: 5000, hrs: 0, nights: 7 },
        { n: "y", inc: 0, hrs: 40, nights: 7 },
      ],
      1000,
      35
    ).labor.join() === "1000,0"
  );
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
  chk(
    "the menu and the people sheet both lead here",
    MENU.some(m => m[1] === "fair") &&
      (() => {
        X("people");
        const ok = ov().includes('data-a="fair"');
        X("close");
        return ok;
      })()
  );
  X("fair");
  const PP = frPpl();
  chk(
    "starts with the people in the game, padded to two, incomes from their profiles",
    W.kind === "fair" &&
      PP.length >= 2 &&
      PP.some(p => p.n === "Ana" && p.linked && p.inc === 5000) &&
      ov().includes("Five ways to split") &&
      FR_METHODS.every(m => ov().includes(m[1])) &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "the shared amount starts from home, food and bills",
    frDefaultTotal() === 2600 && ov().includes("(home, food, bills now)")
  );
  X("fradd");
  const n1 = frPpl().length;
  chk(
    "add a person by tap, and their three numbers by chips",
    n1 === PP.length + 1 &&
      W.ed === n1 - 1 &&
      ov().includes("Unpaid work at home") &&
      ov().includes("Nights a week here")
  );
  X("frset", n1 - 1 + ":25", "hrs");
  X("frset", n1 - 1 + ":1500", "inc");
  chk("chips set them", frPpl()[n1 - 1].hrs === 25 && frPpl()[n1 - 1].inc === 1500);
  X("frtotal", "3000");
  X("frrate", "25");
  X("frpick", "labor");
  chk(
    "picking a method shows who sends what",
    frState().pick === "labor" &&
      frState().total === 3000 &&
      frState().rate === 25 &&
      ov().includes("Who sends what") &&
      ov().includes("Ours ✓") &&
      clean(ov()),
    junk(ov())
  );
  X("frpayer", "1");
  chk("the payer can be anyone", frState().payer === 1 && ov().includes(" sends " + esc(frPpl()[1].n)));
  const tx = frText();
  chk("copies as plain words, one line each", tx.includes("Labor counts") && tx.split("\n").length === n1 + 1, tx);
  X("frcopy");
  chk("copy confirms", W.copied);
  chk("no method is called best or right", !/best|recommended|should pay/i.test(ov().replace(/<[^>]+>/g, " ")));
  X("frdel", String(n1 - 1));
  chk("a guest can be taken out, never below two", frPpl().length === n1 - 1);
  X("close");
  // values
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
  chk(
    "the checklist rows exist and every probe passes",
    btRows().some(r => r.n.startsWith("Sharing costs fairly") && r.st === "b") &&
      btRows().some(r => r.n.startsWith("Is my money going where I want") && r.st === "b") &&
      btCount(btRows()).x === 0
  );
  chk("no client names in the menu", !MENU.some(m => /Jacob|Brandon/.test(m.join(" "))));
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  if (fair0) G.fair = fair0;
  else delete G.fair;
  save();
  go("home");
}
