/* ============================================================================
   SLAM the Game, test: tests/results-first.js
   PURPOSE     Examine results first (run Results-first Home, items 1 and 2): the payoff reveal at the end of
               the rest of setup (setup comes after What it is / What it could be since run A) (the lead number picked by the answers, five result cards with a value, a target, the time
               at today's pace and what it unlocks, typical values greyed with Put in yours, one button "Start
               my first win") and Home as four cards (Your next win with one pulsing button, By the end of this
               month with a solid and a dotted line, You are here, the metric tiles), the Home button on every
               screen, and the money calendar in the Menu.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/results.js, features/spiral.js (spPlanSheet),
               screens/ux.js (homeQuadTop), core/frameworks.js (fwLead, fwDtiMonths, fwMonthEnd).
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<details[\s\S]*?<\/details>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    VERDICT = /\b(good|bad|great|poor|terrible|fail|failed|behind|mistake|off track|should have)\b/i;
  /* Three made-up players, answered by taps as a person would. */
  const PL = {
    speed: {
      dec: "20s",
      age: "27",
      cards: "1",
      debts: [],
      accts: ["Checking"],
      can1k: "No",
      cover: "Less than a month",
      invest: "No",
      work: "Established",
      inc: ["A main job"],
      tax: "I don't know",
      home: "I rent",
      live: "On my own",
      rel: "Single by choice",
      share: "No one",
    },
    neg: {
      dec: "20s",
      age: "25",
      cards: "2",
      debts: ["Student loans"],
      accts: ["Checking"],
      can1k: "No",
      cover: "Less than a month",
      invest: "No",
      work: "First job",
      inc: ["A main job"],
      tax: "I don't know",
      home: "I rent",
      live: "Roommates",
      rel: "Single, seeking",
      share: "No one",
    },
    fire: {
      dec: "30s",
      age: "34",
      cards: "0",
      debts: [],
      accts: ["Checking", "IRA or Roth IRA"],
      can1k: "Yes",
      cover: "Longer than 6 months",
      invest: "Every month",
      work: "Established",
      inc: ["A main job"],
      tax: "About 15%",
      home: "I own",
      live: "A partner",
      rel: "Married",
      share: "A partner",
    },
  };
  /* Run A (Nov 27 2026): a player with only the four answers of What it is / What it could be (couldbe.js).
     Home is still results first, and the values that stand on a tapped range are greyed and labeled. */
  {
    G = clone(G0);
    G.demo = true;
    W = null;
    X("start");
    X("wnskip"); /* What you want (run SLAM-ONBOARD-1): Skip for now */
    [
      ["age", 1],
      ["spend", 2],
      ["inv", 3],
      ["save", 3],
    ].forEach(([q, i]) => X("cbset", "", "", { q, i }));
    chk(
      "four answers: the flow goes on at What it is, not at the reveal",
      W && W.kind === "cb" && W.step === "is",
      W && W.kind
    );
    closeSheet();
    const hm = app();
    chk(
      "four answers: Home is results first",
      /class="rstop cbq"/.test(hm) && /Your next win/i.test(text(hm)),
      text(hm).slice(0, 200)
    );
    chk(
      "four answers: the values are a Guess, greyed and labeled typical",
      /typical/.test(text(hm)) && /Guess/.test(hm) && /class="dknum guess"/.test(hm)
    );
    chk("four answers: Home shows no undefined and no NaN", clean(hm), junk(hm));
    X("tab", "plan");
    chk(
      "four answers: Next Steps opens the rest of setup and the two numbers",
      /data-a="cbrest"/.test(app()) && /data-a="cb"/.test(app())
    );
    X("tab", "home");
  }
  const play = o => {
    G = clone(G0);
    G.demo = true;
    W = null;
    openSetup("new");
    X("agedec", o.dec, "ageDec");
    X("setn", o.age, "age");
    const did = {};
    for (let i = 0; i < 120 && W && W.kind === "setup"; i++) {
      if (W.sp) {
        X(W.sp.at === "level" ? "spgo" : "spnext");
        continue;
      }
      const s = W.step;
      if (!did[s]) {
        did[s] = 1;
        if (s === 9) X("amset", o.cards);
        if (s === 4) o.debts.forEach(k => X("tog", k, "debtKinds"));
        if (s === 5) o.accts.forEach(k => X("tog", k, "accts"));
        if (s === 7) {
          X("set", o.can1k, "can1k");
          X("set", o.cover, "cover");
          X("set", o.invest, "invest");
        }
        if (s === 1) {
          X("set", o.work, "work");
          o.inc.forEach(k => X("tog", k, "incKinds"));
          X("smdone", null, "incKinds");
          X("set", "Steady", "steady");
        }
        if (s === 8) {
          X("set", o.tax, "taxQ");
          if (W.step === 8 && !W.sp) X("set", "I don't know", "matchQ");
          if (W.step === 8 && !W.sp) X("set", "No", "taxAcctQ");
        }
        if (s === 2) {
          X("set", o.home, "homeQ");
          X("tog", o.live, "live");
          X("smdone", null, "live");
          if (/How many roommates/.test(ov())) X("set", "2", "roommateQ");
        }
        if (s === 3) {
          X("set", o.rel, "rel");
          X("set", "None", "deps");
          X("set", o.share, "share");
        }
        continue;
      }
      if (W.sm) W.sm.adv = 0;
      X("wnext");
    }
  };

  /* 1. THE PAYOFF REVEAL */
  const lead = { speed: "Your next stop", neg: "Debt-free date", fire: "FI date" };
  Object.keys(PL).forEach(k => {
    play(PL[k]);
    const h = ov(),
      c = C(),
      d = derive(c);
    chk(k + ": setup ends on the one reveal", W && W.kind === "firstplan" && h.includes("Here's where you stand"), W);
    chk(k + ": no second reveal beside it (Your first plan is inside it)", !h.includes("Next: two quick taps"));
    chk(
      k + ": the lead number is picked by the answers (" + lead[k] + ")",
      new RegExp('rs:lead"><div class="eyebrow">' + lead[k]).test(h),
      text(h).slice(0, 200)
    );
    chk(k + ": the lead kind matches fwLead", rsLead(c, d).kind === fwLead({ worth: d.nw, fire: rsFire(c) }));
    const ids = ["dti", "cushion", "save", "nw", "fi"];
    chk(
      k + ": five result cards, in order",
      ids.every(id => h.includes('data-fid="rs:' + id + '"')) &&
        ids.map(id => h.indexOf('data-fid="rs:' + id + '"')).every((p, i, a) => !i || a[i - 1] < p)
    );
    const cards = h.split('class="tile rscard"').slice(1);
    chk(
      k + ": each card has its value, target, time at today's pace, unlock and a level",
      cards.length === 5 &&
        cards.every(
          x =>
            x.includes("Target") &&
            x.includes("At today's pace") &&
            x.includes("Unlocks") &&
            /class="pill kitst">(Guess|Close|Exact)</.test(x)
        )
    );
    chk(
      k + ": every card has Show the math",
      cards.every(x => x.includes("<summary>Show the math</summary>"))
    );
    chk(
      k + ": typical values are greyed, labeled typical, with Put in yours",
      cards.every(
        x =>
          !/>Guess</.test(x) ||
          (x.includes('class="rsval guess"') && x.includes(">typical<") && x.includes(">Put in yours<"))
      ) && cards.some(x => x.includes(">typical<"))
    );
    chk(
      k + ": one button at the end: Start my first win",
      (h.match(/class="primary/g) || []).length === 1 && /data-a="rsfirst">Start my first win</.test(h)
    );
    chk(k + ": the route is behind a tap", h.includes("<summary>Your route, stop by stop</summary>"));
    chk(k + ": net worth is a range while a piece is a Guess", /rs:nw"[\s\S]*?about -?\$[\d.,]+k? to -?\$/.test(h));
    chk(k + ": no verdict words", !VERDICT.test(text(h)), text(h).match(VERDICT));
    chk(k + ": clean, no em dash", clean(h) && !h.includes(String.fromCharCode(8212)), junk(h));
    chk(k + ": the Home button is on the sheet", h.includes('data-a="gohome"'));
    if (k === "neg") {
      chk("neg: net worth below zero", d.nw < 0);
      const m = rsDebtFree(c, 0).months;
      chk(
        "neg: the debt-free date is the payoff run at today's payments",
        rsLead(c, d).big === (m == null ? "No end yet" : dkMonth(m))
      );
    }
    if (k === "fire") {
      const m = freeAt(c);
      chk("fire: the FI age comes from freeAt", rsLead(c, d).big === "Age " + Math.round(c.age + m / 12), m);
    }

    /* Start my first win: closes the reveal, goes Home and opens the next win */
    const w = rsNextWin(c, d);
    X("rsfirst");
    chk(k + ": Start my first win opens the next win", W && (W.kind === w.a || W.id === w.v || SH !== null), [
      W && W.kind,
      w.a,
    ]);
    closeSheet();
    HOME_MORE = false; /* a new visit: the rest of Home is folded */
    render();

    /* 2. HOME */
    const a = app(),
      top = a.slice(a.indexOf('<div class="rstop">'), a.indexOf("<!--homerows-->"));
    chk(
      k + ": Home is the four cards, results first",
      a.includes('class="stack hq rs') && top.includes('class="rsgrid"')
    );
    chk(
      k + ": the priority order: next win, end of month, you are here, tiles",
      ["rs:win", "rs:month", "rs:route", "rs:tiles"]
        .map(f => top.indexOf(f))
        .every((p, i, A) => p > 0 && (!i || A[i - 1] < p))
    );
    chk(
      k + ": one primary button on Home, the pulsing next win",
      (top.match(/class="primary/g) || []).length === 1 && /rswin[\s\S]*class="primary go wide"/.test(top)
    );
    chk(
      k + ": the next win shows the move and, for a money move, its money and days",
      w.kind === "step" ||
        (top.includes(esc(w.t)) && top.includes("a month") && (w.days == null || top.includes("days</b>")))
    );
    /* Eli, Nov 26 2026: both the goal and how to get there faster, in this order */
    const g = rsGoal(c, d),
      win = top.slice(top.indexOf("rs:win"), top.indexOf("rs:month")),
      iGoal = win.indexOf("Your goal now"),
      iFast = win.indexOf("Get there faster"),
      iBtn = win.indexOf('class="primary go wide"'),
      iWhy = win.indexOf("Why this one");
    chk(
      k + ": the card shows the goal, then how to get there faster, then the one button, then Why this one",
      iGoal > 0 && iGoal < iFast && iFast < win.indexOf(esc(w.t), iFast) && iFast < iBtn && iBtn < iWhy,
      [iGoal, iFast, iBtn, iWhy]
    );
    chk(
      k + ": the goal is a row to tap with its own words, not a second primary button",
      new RegExp('<button class="rowbtn rsgoal" data-a="' + g.a + '"[^>]*data-fid="rs:goal">').test(win) &&
        win.includes("<b>" + esc(g.t) + "</b>") &&
        win.includes(esc(g.go)) &&
        typeof ACT[g.a] === "function"
    );
    chk(
      k + ": the goal is a step of the one order, never a FIRE type",
      ["debtfree", "foo", "stop"].includes(g.kind) && !/Lean|Coast|Barista|Chubby|Fat/.test(g.t + " " + g.s),
      g
    );
    if (k === "neg")
      chk(
        "neg: below zero the goal is the debt-free step, with the date of the payoff run",
        g.kind === "debtfree" &&
          g.a === "debtplan" &&
          (rsLead(c, d).months > 0 ? g.s.includes(rsLead(c, d).big) : true),
        g
      );
    if (k === "fire")
      chk(
        "fire: the goal is the FOO step of the next dollar",
        g.kind === "foo" && g.t === FW_STEP_HEAD[fwStepOf(c).step] && g.s === (fwNextDollarLine(c) || ""),
        g
      );
    chk(
      k + ": no line of the goal or the move is long (about 15 words)",
      [g.t, w.t].every(x => x.split(/\s+/).length <= 15) && g.s.split(/\. /).every(x => x.split(/\s+/).length <= 16),
      g.s
    );
    chk(
      k + ": the chart is solid and dotted",
      /rs:month[\s\S]*stroke-dasharray:0.5 5[\s\S]*stroke:var\(--sap\);stroke-width:2.5/.test(top) &&
        top.includes("Planned moves happen") &&
        top.includes("They don't")
    );
    chk(
      k + ": the route strip: done, here, locked, tap for the map",
      /rs:route/.test(top) &&
        /<i class="here"><\/i>/.test(top) &&
        /<i class="locked"><\/i>/.test(top) &&
        /class="card dkcard rsq rsroute" data-a="tab" data-v="map"/.test(top)
    );
    chk(
      k + ": four metric tiles and See all metrics",
      (top.split("rs:tiles")[1].match(/class="dktile"/g) || []).length === 4 &&
        top.includes('data-a="keynums">See all metrics')
    );
    chk(k + ": the text calendar is off Home", !top.includes("Today's plan") && !top.includes("plhomeline"));
    const words = top
      .split(/class="card dkcard rsq/)
      .slice(1)
      .map(x => text('<div class="' + x).split(" ").length);
    chk(
      k + ": few words: each card is short (details collapsed)",
      words.every(n => n <= 60),
      words
    );
    chk(k + ": no coach or admin feature on Home", !/data-a="(hat|coach|admin|session|built|testkit)"/.test(top));
    chk(k + ": Home is clean", clean(top) && !top.includes(String.fromCharCode(8212)), junk(top));
    chk(k + ": no verdict words on Home", !VERDICT.test(text(top)), text(top).match(VERDICT));
    chk(k + ": the rest of Home is behind See all of Home", a.includes('data-a="homemore">See all of Home'));
  });

  /* 3. The math: the month-end line is fwMonthEnd on the cash calendar */
  {
    const c = C(),
      d = derive(c),
      E = rsMonthEnd(c, d, "2026-11-26");
    chk("the month-end line runs from today to the last day", E.days[0] === 26 && E.days[E.days.length - 1] === 30);
    chk("the line starts at net worth today", E.asIs[0] === d.nw && E.planned[0] === d.nw);
    chk(
      "planned minus as is = the win's money for the days left",
      Math.abs(E.gap - (E.win.amt > 0 ? (E.win.amt * 4) / 30 : 0)) < 0.01,
      [E.gap, E.win.amt]
    );
    const R = rsRoute(c, d);
    chk("the route has nine stops, one here", R.nodes.length === 9 && R.nodes.filter(n => n.s === "here").length === 1);
    const b = rsBook(c);
    chk(
      "the spreadsheet has the month end and the win",
      b.rows.some(r => r.id === "rs_end1" && r.f === "={rs_end0}+{rs_win}")
    );
    chk("rsBook is in the spreadsheet of the plan", BOOK_PARTS.includes(rsBook));
  }

  /* 4. Real numbers are not typical */
  {
    const c = C();
    ["incs", "spends", "cashes", "debts", "invs"].forEach(k => (c[k] || []).forEach(x => ((x.s = true), (x.cf = 3))));
    syncAll(c);
    const x = rsCard(c, derive(c), "cushion");
    chk("an Exact cushion is not greyed and has no Put in yours", !x.typ && x.st === "Exact" && !rsPutBtn(x), x);
  }

  /* 5. Home on every screen, Back stays */
  {
    chk("the top bar has Home", /data-a="gohome"/.test(topbarHTML()) && /data-a="navback"/.test(topbarHTML()));
    X("keynums");
    const h = ov();
    chk(
      "a sheet has Back and Home on its top row",
      /data-a="navback"><i class=chevl aria-hidden=true><\/i> Back<\/button><button class="ghost slim rshome" data-a="gohome"/.test(
        h
      )
    );
    X("gohome");
    chk("Home closes the sheet and goes Home", SH === null && tab === "home");
    chk(
      "the money calendar is in the Menu, in My money",
      MENU.some(m => m[1] === "months") && MENU_GROUPS.find(g => g[0] === "money")[3].includes("months")
    );
  }

  /* 6. The front door ends on the same reveal, with the offer to keep the game */
  chk(
    "okay.js opens the reveal, not a second answer",
    /rsRevealBody[\s\S]*spPlanOpen\(C\(\)\)/.test(String(finishSetupOkay))
  );

  G = G0;
  W = null;
}
