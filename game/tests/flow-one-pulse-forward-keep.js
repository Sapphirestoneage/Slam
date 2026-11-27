/* ============================================================================
   SLAM the Game, test: tests/flow-one-pulse-forward-keep.js
   PURPOSE     Examine run 14 (Nov 27 2026), items 1, 3 and 5 of the usability pass on What it is / What it
               could be. Item 1: each screen of the flow has exactly one control that pulses (the class
               cbnext), the style sheet stills each other pulse and makes each other control a little
               paler, and a paler control still works. Item 3: each screen has one row with Back and
               Forward; Forward is off, with the reason, until the player taps Back; then it returns to the
               screen the player left. The result has one main button and a small Back, and no Forward
               (the newer prompt of run 16). Item 5: "Keep my plan: make a free account", "Keep my plan"
               for a signed-in player, and no button of the flow that reads like a save by hand.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Two made-up players: one
               who owes nothing, one with costly debt (a card balance).
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/cbguide.js (cbOne, cbNav, cbFwdKeep, cbFwdDrop, ACT.cbfwd,
               cbFold, CB_GUIDE), features/couldbe.js (cbSheet, cbChips, ACT.cbgo), features/wants.js,
               features/cbstack.js, features/cbmoves.js, features/cbyesbut.js, features/cbreveal.js,
               features/cbtax.js, features/cbflex.js, features/cblater.js, index.html (the style lines).
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    G0 = clone(G),
    css = fs.readFileSync(path.join(GAME_DIR, "index.html"), "utf8"),
    pulses = h => (h.match(/class="[^"]*\bcbnext\b[^"]*"/g) || []).length,
    /* the words of each button of a screen */
    labels = h => (h.match(/<button[^>]*>[\s\S]*?<\/button>/g) || []).map(b => b.replace(/<[^>]+>/g, " ").trim()),
    nav = h => (h.split('data-fid="cb:nav"')[1] || "").split("</div>")[0],
    seen = [],
    /* examine the screen that is open: one pulse, the row Back and Forward, no save by hand */
    look = name => {
      const h = ov();
      seen.push([name, h]);
      chk(name + ": exactly one control pulses", pulses(h) === 1, pulses(h));
      if (W.step !== "end")
        chk(
          name + ": one row with Back and Forward, drawn chevrons, and an i",
          (h.match(/data-fid="cb:nav"/g) || []).length === 1 &&
            /class="ghost slim cbbk[^"]*"[^>]*><i class=chevl aria-hidden=true><\/i> Back<\/button>/.test(nav(h)) &&
            /class="ghost slim cbfw" data-a="cbfwd"[^>]*>Forward <i class=chev aria-hidden=true><\/i><\/button>/.test(
              nav(h)
            ) &&
            /data-a="cbi" data-k="nav"/.test(nav(h)),
          nav(h).slice(0, 300)
        );
      return h;
    },
    fwdOff = h => /data-a="cbfwd" disabled/.test(h) && /Forward works after you tap Back\./.test(h),
    start = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      X("start");
    },
    owe = c => {
      c.debts = [{ k: "Credit card balance", amt: 9000, high: true, s: false, was: 9000 }];
      c.debtKinds = ["Credit card balance"];
      c.high = "yes";
      save();
      render();
    };

  /* ---- the style lines: the pulse of the game, one at a time, the rest a little paler ---- */
  chk(
    "the one pulse uses the pulse of the game",
    /\.cbnext\{animation:pulse 1\.6s ease-in-out infinite\}/.test(css) && /button\.go\{animation:pulse 1\.6s/.test(css)
  );
  chk(
    "on a screen of the flow each other pulse is still",
    css.includes(
      ".sheet:has(.cbfoot) button.go:not(.cbnext),.sheet:has(.cbfoot) .pulse:not(.cbnext),.sheet:has(.cbfoot) .chip.likely:not(.cbnext){animation:none}"
    )
  );
  const pale = (css.match(/\.sheet:has\(\.cbfoot\) button:not\(\.cbnext\)\{opacity:([.\d]+)\}/) || [])[1],
    dim = (css.match(/\.sheet:has\(\.cbfoot\) \.chip\.dim:not\(\.cbnext\)\{opacity:([.\d]+)\}/) || [])[1];
  chk(
    "each other control is a little paler, and still easy to read (not under 0.7)",
    +pale >= 0.7 && +pale < 1 && +dim >= 0.7 && +dim < 1,
    [pale, dim]
  );
  chk(
    "a paler control is not switched off: the style takes no taps away",
    !/\.sheet:has\(\.cbfoot\)[^{]*\{[^}]*pointer-events/.test(css)
  );
  chk(
    "cbOne keeps the first of two marks, and marks the main button when a screen has none",
    pulses(cbOne('<button class="primary go cbnext">A</button><button class="ghost go cbnext">B</button>')) === 1 &&
      /class="ghost">B/.test(
        cbOne('<button class="primary go cbnext">A</button><button class="ghost go cbnext">B</button>')
      ) &&
      /class="primary wide cbnext">A/.test(
        cbOne('<button class="ghost">B</button><button class="primary wide">A</button>')
      )
  );

  [
    ["nothing owed", null],
    ["costly debt", owe],
  ].forEach(([who, change]) => {
    const T = s => who + ", " + s;
    /* ---- What you want, the first screen: Back is off and says why ---- */
    start();
    let h = look(T("What you want"));
    chk(
      T("the first screen: Back and Forward are off, and one line says why"),
      /class="ghost slim cbbk" disabled/.test(h) &&
        fwdOff(h) &&
        /Back: this is the first screen\. Forward works after you tap Back\./.test(h)
    );
    /* a paler control still works */
    X("wnpick", "debt");
    chk(T("a paler chip still takes the tap"), (W.wp || []).includes("debt") && pulses(ov()) === 1);
    X("wnnext");

    /* ---- the four questions ---- */
    h = look(T("question 1"));
    chk(T("question 1: Forward is off until Back"), fwdOff(h) && /data-a="wnback" data-b="1"/.test(nav(h)));
    chk(
      T("question 1 (the age): no chip is called most likely, so the group of chips is the one pulse"),
      /class="chips cbnext" data-fid="cb:chips"/.test(h) && !/class="chip [^"]*likely/.test(h)
    );
    X("wnback");
    h = look(T("What you want, after Back"));
    chk(T("after Back, Forward is on"), !/data-a="cbfwd" disabled/.test(h) && !/Forward works after/.test(h));
    X("cbfwd");
    chk(T("Forward returns to question 1"), W.step === "entry" && W.q === 0 && /Question 1 of 4/.test(ov()));
    chk(T("and then Forward is off again"), fwdOff(ov()));
    X("cbset", "", "", { q: "age", i: 2 });
    h = look(T("question 2"));
    chk(
      T("question 2: the most likely chip is first, it is the one pulse, and the other ranges are pale"),
      (() => {
        const first = (h.match(/<button class="chip[^"]*"[^>]*data-a="cbset"[^>]*>/) || [""])[0],
          i = cbLikely("spend", W.o.a.age.v);
        return (
          i >= 0 &&
          first.includes('data-i="' + i + '"') &&
          /likely cbnext/.test(first) &&
          (h.match(/class="chip [^"]*dim[^"]*" data-a="cbset"/g) || []).length === CB_RNG.spend.length - 1
        );
      })()
    );
    chk(
      T("I'm not sure stays the last choice"),
      /data-a="cbtyp"[^>]*>I'm not sure<\/button><button class="i cbi"/.test(h) && /Tap one to keep going\./.test(h)
    );
    chk(
      T("one line says what the tapped choice means"),
      /data-fid="cb:said"/.test(h) && h.includes(cbOptWords("age", W.o.a.age)) && /the game counts you as 32\./.test(h)
    );
    X("cbset", "", "", { q: "spend", i: 2 });
    look(T("question 3"));
    X("cbgo", "qback");
    h = look(T("question 2, after Back"));
    chk(
      T("back on question 2 the answer so far is the one pulse"),
      /class="chip on[^"]*cbnext"[^>]*data-i="2"/.test(h)
    );
    X("cbfwd");
    chk(T("Forward returns to question 3"), W.step === "entry" && W.q === 2);
    X("cbknow", "", "", { q: "inv" });
    h = look(T("question 3, I know it"));
    chk(T("with the number box open, Use this is the one pulse"), /class="primary cbnext" data-a="cbuse"/.test(h));
    X("cbknow", "", "", { q: "inv" });
    X("cbset", "", "", { q: "inv", i: 2 });
    look(T("question 4"));
    X("cbset", "", "", { q: "save", i: 3 });
    const c = C();
    if (change) change(c);
    cbOpen("is");

    /* ---- What it is, the chart, a layer ---- */
    h = look(T("What it is"));
    chk(
      T("What it is: See what it could be is the pulse"),
      /cbnext" data-a="cbgo" data-v="next">See what it could be</.test(h)
    );
    X("cbgo", "next");
    h = look(T("the chart"));
    chk(T("the chart: Forward is off"), fwdOff(h));
    X("cbgo", "prev");
    look(T("What it is, after Back"));
    X("cbfwd");
    chk(T("Forward returns to the chart"), W.step === "chart");
    X("cblayer", "health");
    h = look(T("a layer"));
    X("cbgo", "chart", "", { b: "1" });
    chk(
      T("Back from a layer is the chart, and Forward then opens the layer again"),
      W.step === "chart" && !fwdOff(ov())
    );
    X("cbfwd");
    chk(T("Forward returns to the same layer"), W.step === "layer" && W.id === "health");
    X("cbgo", "chart", "", { b: "1" });

    /* ---- the stack, each way, a move, the Yes, but card ---- */
    X("cbgo", "stack");
    h = look(T("the stack"));
    chk(T("a move to another screen empties Forward"), fwdOff(h));
    cbWays().forEach(w => {
      X("cbgo", w.id);
      h = look(T("the way " + w.id));
      const St = cbStepInfo(c, w.id);
      if (St.applies && typeof CB_STEPS.find(s => s.id === w.id).set === "function") {
        CB_STEPS.find(s => s.id === w.id).set("count");
        drawSheet();
        h = look(T("the way " + w.id + ", counted"));
        chk(
          T(w.id + ": after the answer, Next is the one pulse"),
          /cbnext[^"]*" data-a="cbgo" data-v="next">Next[^<]*</.test(h)
        );
        CB_STEPS.find(s => s.id === w.id).set("no");
      }
      X("cbgo", "stack");
    });
    const mv = cbMoves(c).shown[0];
    if (mv) {
      X("cbgo", "move", mv.id);
      look(T("a move"));
      X("cbgo", "prev");
      chk(T("Back from a move is the stack"), W.step === "stack" && !fwdOff(ov()));
      X("cbfwd");
      chk(T("Forward returns to the same move"), W.step === "move" && W.id === mv.id);
      X("cbgo", "stack");
    }
    X("cbgo", "yesbut");
    look(T("Yes, but"));
    X("cbgo", "stack");

    /* ---- the reveal and the result ---- */
    X("cbgo", "reveal");
    h = look(T("the reveal"));
    chk(T("the reveal: Next: my result is the pulse"), /cbnext" data-a="cbgo" data-v="end">Next: my result</.test(h));
    X("cbgo", "end");
    h = look(T("the result"));
    chk(
      T("the result: one main button and a small Back, no Forward (the newer prompt)"),
      !/data-a="cbfwd"/.test(h) &&
        !/data-fid="cb:nav"/.test(h) &&
        /class="ghost slim" data-a="cbgo" data-v="prev"/.test(h) &&
        /cbresgo cbnext" data-a="cbfirst">Start my first move</.test(h)
    );
    X("cbgo", "prev");
    chk(T("Back from the result is the reveal, with Forward on"), W.step === "reveal" && !fwdOff(ov()));
    X("cbfwd");
    chk(T("Forward returns to the result"), W.step === "end");
    X("cbgo", "prev");

    /* ---- item 5: Keep my plan, and nothing that reads like a save by hand ---- */
    const uid0 = SUPA.uid,
      g0 = DOOR.guest;
    SUPA.uid = null;
    DOOR.guest = true;
    drawSheet();
    chk(
      T("a visitor with no account: Keep my plan: make a free account"),
      /data-a="cbsave">Keep my plan: make a free account</.test(ov())
    );
    DOOR.guest = false;
    SUPA.uid = "11111111-2222-4333-8444-555555555555";
    drawSheet();
    chk(
      T("a signed-in player: Keep my plan, with no word about an account to make"),
      /data-a="cbsave">Keep my plan</.test(ov()) && !/make a free account/.test(ov())
    );
    X("cbsave");
    chk(
      T("the tap says where the plan is kept, and does not say Saved"),
      /Kept\. Your plan is in your account\./.test(ov()),
      W.msg
    );
    SUPA.uid = uid0;
    DOOR.guest = g0;
    closeSheet();
  });

  /* every screen that was walked: no button reads like a save by hand */
  const bad = [];
  seen.forEach(([name, h]) =>
    labels(h).forEach(l => {
      if (/\bsave\b|\bsaved\b|save my plan/i.test(l)) bad.push(name + ": " + l);
    })
  );
  chk("no button on any screen of the flow says Save", seen.length > 40 && !bad.length, bad.slice(0, 5).join(" | "));
  chk(
    "no file of the flow has a button that says Save",
    ["couldbe", "cbguide", "wants", "cbstack", "cbmoves", "cbyesbut", "cbreveal", "cbtax", "cbflex", "cblater"].every(
      f => !/<button[^>`]*>\s*Save\b/.test(fs.readFileSync(path.join(GAME_DIR, "features/" + f + ".js"), "utf8"))
    )
  );
  chk(
    "no file of the flow sends a new screen to the top (item 4)",
    ["couldbe", "cbguide", "wants", "cbstack", "cbmoves", "cbyesbut", "cbreveal", "cbtax", "cbflex", "cblater"].every(
      f => !/spUp|scrollTop = 0|scrollTo\(0/.test(fs.readFileSync(path.join(GAME_DIR, "features/" + f + ".js"), "utf8"))
    )
  );
  chk(
    "each i of the flow has two lines: what it is, what it is for",
    Object.keys(CB_GUIDE).every(k => CB_GUIDE[k][1] && CB_GUIDE[k][2]) &&
      /What it is\./.test(cbGuideHtml("top")) &&
      /What it is for\./.test(cbGuideHtml("top"))
  );
  G = clone(G0);
  W = null;
  SH = null;
}
