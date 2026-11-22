/* ============================================================================
   SLAM the Game, test: tests/sheet-navigation.js
   PURPOSE     Examine Back, Forward, Close and the "i" on each sheet.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: screens/nav.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    R = r => Object.assign({ s: false }, r),
    a = Object.assign(newChar(), {
      name: "Nia",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 5000,
      incs: [R({ k: "A main job", amt: 4000 })],
      spends: [R({ k: "Home", amt: 1800 }), R({ k: "Food", amt: 1200 })],
      cashes: [R({ k: "Checking", amt: 900 })],
      invs: [R({ k: "Retirement plan at work", amt: 5000 })],
      debts: [R({ k: "Credit card balance", amt: 2500, high: true }), R({ k: "Car loan", amt: 9000, high: false })],
    });
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  X("lever");
  let o = ov();
  chk(
    "every sheet header has Back, an i, and an X",
    o.includes('data-a="navback"') &&
      o.includes("‹ Back") &&
      o.includes('data-a="navclose"') &&
      o.includes('data-k="gloss:scr_lever"') &&
      !o.includes('data-a="navfwd"') &&
      !/<button class="ghost slim" data-a="close">Close<\/button>/.test(o)
  );
  X("lvopen", "spend");
  chk("a second screen is remembered", NVX.st.length === 2 && W.v === "spend");
  X("navback");
  chk(
    "Back goes back one screen, not out",
    !!SH &&
      W.kind === "lever" &&
      W.v == null &&
      NVX.st.length === 1 &&
      NVX.fw.length === 1 &&
      ov().includes("Six ways to move your money forward") &&
      ov().includes('data-a="navfwd"')
  );
  X("navfwd");
  chk(
    "Forward returns to where you were",
    W.kind === "lever" && W.v === "spend" && NVX.fw.length === 0 && ov().includes("to set up")
  );
  X("navback");
  X("navback");
  chk("Back on the first screen closes", !SH && NVX.st.length === 0);
  X("lever");
  X("mult");
  X("muopen", "card");
  chk("three screens deep across two tools", NVX.st.length === 3);
  X("navback");
  chk("back to the board", W.kind === "mult" && W.v == null);
  X("navback");
  chk("back across tools to the levers", W.kind === "lever");
  X("lvopen", "two");
  chk("a new tap after Back clears Forward", NVX.fw.length === 0);
  X("navclose");
  chk("X closes from anywhere", !SH && NVX.st.length === 0);
  X("sharp", "debt");
  X("askyes");
  X("askrate", "1");
  chk("inside a flow each question is a screen", W.i === 1 && NVX.st.length === 3);
  X("navback");
  chk(
    "Back inside a flow moves one question and keeps the answer",
    W.kind === "sharp" && W.i === 0 && W.st === "rate" && W.o.debts[0].s === true
  );
  X("navback");
  chk("and one more", W.i === 0 && W.st === "amt" && ov().includes("Yes, about $2,500"));
  X("navfwd");
  X("navfwd");
  chk("Forward walks back up", W.i === 1 && ov().includes("Car loan"));
  X("navclose");
  X("lever");
  X("info", null, "gloss:scr_lever");
  chk(
    "the i says what the screen is and what it is for",
    ov().includes("Which lever matters most") &&
      ov().includes("each in dollars a year") &&
      ov().includes("worth the most to you")
  );
  chk(
    "Got it on an explanation goes back, it does not close everything",
    ov().includes('data-a="navback"') && ov().includes("Got it, go back")
  );
  X("navback");
  chk(
    "Back from the explanation returns to the screen",
    !!SH && W && W.kind === "lever" && ov().includes("Six ways to move your money forward")
  );
  X("navclose");
  chk(
    "every explanation is two short plain sentences",
    Object.keys(NV_INFO).every(k => {
      const x = NV_INFO[k];
      return (
        x.length === 3 &&
        x[1].length <= 110 &&
        x[2].length <= 110 &&
        !/[\u2014–]/.test(x.join("")) &&
        !!GLOSS["scr_" + k]
      );
    })
  );
  const kinds = [
    ...new Set(
      [
        "ui",
        "ux",
        "games",
        "games2",
        "year",
        "chart",
        "profiles",
        "smart",
        "planner",
        "cloud",
        "metrics",
        "debts",
        "import",
        "compare",
        "quick",
        "reveal",
        "moneylog",
        "drills",
        "gig",
        "know",
        "fair",
        "values",
        "missions",
        "connect",
        "house",
        "back",
        "lever",
        "mult",
        "ask",
        "ask2",
        "sign",
        "owed",
        "study",
        "together",
        "people",
      ].length
        ? Object.keys(NV_INFO)
        : []
    ),
  ];
  chk(
    "the registry covers the screens the audit found",
    [
      "sharp",
      "dbone",
      "metric",
      "lever",
      "mult",
      "sign",
      "owed",
      "study",
      "together",
      "party",
      "know",
      "since",
      "fair",
      "house",
      "values",
      "gig",
      "quick",
      "compare",
      "moves",
      "keynums",
      "dbplan",
      "flow",
      "setup",
      "l1",
      "pay",
      "month",
    ].every(k => !!NV_INFO[k])
  );
  chk(
    "a bare Done or Close gets words",
    nvText(
      '<button class="primary wide" data-a="close">Done</button><button class="ghost" data-a="close">Close</button>'
    ) ===
      '<button class="primary wide" data-a="close">Done, close this</button><button class="ghost" data-a="close">Close this</button>'
  );
  X("fair");
  chk("one primary button at most on the fair-split screen", (ov().match(/class="primary[^"]*"/g) || []).length <= 1);
  X("navclose");
  X("gear");
  chk("gear says what its button does", ov().includes("Save my gear"));
  X("navclose");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  save();
  go("home");
}
