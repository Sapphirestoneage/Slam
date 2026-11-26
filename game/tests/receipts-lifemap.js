/* ============================================================================
   SLAM the Game, test: tests/receipts-lifemap.js
   PURPOSE     Examine items 3 and 4 of the run Results-first Home. (3) The one receipt after a finished move or
               a logged transaction: the net worth change, the days closer, a key number that changed, the
               "Recalculating route" words when a date moves later, the next unlock and the next action with its
               tap count; the finish screens that end on the next action. (4) The life map from age 15: ten eras
               with done / here / current / next / later, the starting bonuses from the answers, the head start
               from grow(), the sheet of one era with what, why, the time and Go do it.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/receipt.js, features/lifemap.js, screens/ui.js
               (celebrateBase, mapTab), features/import.js, features/games.js, features/jobs.js,
               features/goalwire.js, features/careq.js.
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<details[\s\S]*?<\/details>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    VERDICT = /\b(good|bad|great|poor|terrible|fail|failed|behind|mistake|off track|should have)\b/i,
    fs = require("fs"),
    src = f => fs.readFileSync(GAME_DIR + f, "utf8");
  const PL = {
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
      home: "I own",
      live: "A partner",
      rel: "Married",
      share: "A partner",
    },
  };
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
          X("set", "I don't know", "taxQ");
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
    closeSheet();
  };

  /* ---------- 3. THE RECEIPT ---------- */
  play(PL.neg);
  {
    const c = C();
    chk("a player below zero to start from", derive(c).nw < 0);
    /* a logged transaction: $500 came in, to cash */
    rcpMark();
    X("flow", "in");
    if (!W.o.to) W.o.to = flowOpts(c, ["cash"])[0][0];
    W.o.amt = 500;
    X("fsave");
    const h = ov(),
      R = rcpData();
    chk("logging ends on the Done screen with the receipt", h.includes('data-fid="rcp:card"'), text(h).slice(0, 200));
    chk("the receipt shows the net worth change", h.includes('data-fid="rcp:nw"') && /Net worth \+\$500/.test(h));
    chk(
      "money in does not move the payoff run: no days line, only what moved",
      !R.lines.some(x => x.k === "days") && R.lines.some(x => x.k === "cushion"),
      R.lines
    );
    chk("each line of the receipt has Show the math", /rcplines[\s\S]*<summary>Show the math<\/summary>/.test(h));
    chk(
      "then the next unlock: steps done of all, to unlock the next era",
      /\d+ of \d+ to unlock |Next to unlock: /.test(text(h)) && h.includes('data-fid="rcp:teaser"')
    );
    const w = rsNextWin(c, derive(c));
    chk(
      "then the next action with its tap count, the same as Your next win on Home",
      new RegExp('data-fid="rcp:next"[\\s\\S]*1 tap[\\s\\S]*data-a="' + w.a + '"').test(h)
    );
    chk(
      "the next action is the one primary button; Keep going is outlined",
      (h.match(/class="primary/g) || []).length === 1 && /class="ghost wide" data-a="close"/.test(h)
    );
    chk("the receipt is clean, no em dash", clean(h) && !h.includes(String.fromCharCode(8212)), junk(h));
    chk("no verdict words on the receipt", !VERDICT.test(text(h)), text(h).match(VERDICT));
    /* the button of the next action works from the receipt */
    X(w.a, w.v == null ? "" : String(w.v));
    chk("the next action opens from the receipt", SH !== null && !ov().includes('data-fid="rcp:card"'));
    closeSheet();
  }
  /* a payment on a debt: net worth stays, the debt-free date comes closer */
  {
    const c = C();
    closeSheet();
    /* the payments are known (a typical payment follows the balance, so it would not move the date) */
    dbLive(c).forEach(o => {
      o.x.pay = 400;
      o.x.paycf = 2;
    });
    rcpMark();
    X("flow", "pay");
    if (!W.o.from) W.o.from = flowOpts(c, ["cash"])[0][0];
    if (!W.o.to) W.o.to = flowOpts(c, ["debt"]).filter(x => flowRow(c, x[0]).amt > 0)[0][0];
    W.o.amt = 300;
    X("fsave");
    const h = ov(),
      R = rcpData();
    chk("a payment: net worth stays, so no net worth line", !R.lines.some(x => x.k === "nw"), R.lines);
    chk(
      "a payment: the days closer to debt-free, from the payoff run",
      R.lines.some(x => x.k === "days" && /days? closer to debt-free$/.test(x.txt)) &&
        h.includes('data-fid="rcp:days"'),
      R.lines
    );
    closeSheet();
  }
  /* Krug self-test: the next win starts in two taps (Start this win, Add to my steps) and then the next win moves on */
  {
    const c = C(),
      w = rsNextWin(c, derive(c));
    if (w.kind === "move") {
      X(w.a, w.v);
      const h = ov();
      chk(
        "the move opens with Add to my steps at the top, before the fit check",
        h.indexOf('data-a="stgadd"') > 0 &&
          h.indexOf('data-a="stgadd"') < h.indexOf("1. Fit check") &&
          (h.match(/class="primary/g) || []).length === 1,
        text(h).slice(0, 300)
      );
      X("stgadd");
      chk(
        "after it: on your steps, and the next action (no dead end)",
        /On your Next Steps/.test(ov()) && ov().includes('data-fid="rcp:next"')
      );
      const w2 = rsNextWin(c, derive(c));
      chk("a started move is not the next win again", w2.v !== w.v, [w.v, w2.v]);
      closeSheet();
    } else chk("the next win is a step that comes first", !!w.a);
  }
  /* the words of a date that moves: sooner is days closer, later is Recalculating route */
  {
    const a = { nw: 1000, era: 1, fi: 240, df: 0, met: { dti: { num: 0.3, val: "30%" }, save: null, cushion: null } },
      b = { nw: 1200, era: 2, fi: 230, df: 0, met: { dti: { num: 0.27, val: "27%" }, save: null, cushion: null } },
      L = rcpDiff(a, b, true),
      Lr = rcpDiff(b, a, true);
    chk(
      "sooner: days closer to FI from the months",
      L.find(x => x.k === "days").txt === kitDays(10) + " days closer to FI"
    );
    chk(
      "a key number that moved: Debt-to-income 30% to 27%",
      L.some(x => x.txt === "Debt-to-income 30% to 27%")
    );
    chk(
      "a new era",
      L.some(x => x.txt === "New era: " + ERAS[2].n)
    );
    chk(
      "later: Recalculating route with the new date, no blame",
      /^Recalculating route: FI now [A-Z][a-z]{2} \d{4}$/.test(Lr.find(x => x.k === "days").txt) &&
        Lr.every(x => !/mistake|failed|behind|off.track/i.test(x.txt + " " + x.math))
    );
    chk("no change: no lines", rcpDiff(a, a, true).length === 0);
  }
  /* the finish screens that had only Done or Close now end on the next action */
  {
    chk(
      "the money wins of jobs, goalwire and careq carry the receipt",
      ["features/jobs.js", "features/goalwire.js", "features/careq.js", "features/import.js"].every(f =>
        src(f).includes("rcpInline()")
      )
    );
    if (!lifeQs(C()).length) {
      X("life");
      chk("Make it exact, all caught up: the next action", ov().includes('data-fid="rcp:next"'), text(ov()));
      closeSheet();
    }
    W = { kind: "rough" };
    sheet(roughSheet);
    const rs = roughOnes(C());
    chk(
      "Close numbers: the next action when nothing is left, else Done is the primary",
      rs.length ? /class="primary wide" data-a="close"/.test(ov()) : ov().includes('data-fid="rcp:next"')
    );
    closeSheet();
  }
  chk(
    "the click handler keeps the numbers before a move, when no sheet is open",
    /rcpTapStart\(\)/.test(src("screens/ui.js")) &&
      /if \(typeof SH !== "undefined" && SH\) return;/.test(String(rcpTapStart))
  );

  /* ---------- 4. THE LIFE MAP ---------- */
  ["neg", "fire"].forEach(k => {
    play(PL[k]);
    const c = C(),
      d = derive(c),
      M = ltMap(c, d);
    X("tab", "map");
    const a = app();
    chk(
      k + ": the big picture opens on the life map",
      a.indexOf('data-fid="lt:map"') >= 0 && a.indexOf('data-fid="lt:map"') < a.indexOf("<h1>Skills</h1>")
    );
    chk(k + ": the old era list is gone (one map)", !a.includes("Your path through the 10 eras"));
    chk(
      k + ": ten eras, from the game's own ERAS",
      M.eras.length === ERAS.length && M.eras.every((e, i) => e.p === ERAS[i].p)
    );
    chk(k + ": the ruler starts at age 15", M.start === 15 && /Age 15/.test(a));
    chk(
      k + ": the player launches in at their age and era",
      M.eras[d.era].st === "here" && a.includes("You launch in at age " + c.age)
    );
    const st = M.eras.map(e => e.st);
    chk(
      k + ": done before, then here, the one being unlocked, the next, the rest fogged",
      st.every((s, i) =>
        i < d.era
          ? s === "done"
          : i === d.era
            ? s === "here"
            : i === d.era + 1
              ? s === "current"
              : i === d.era + 2
                ? s === "next"
                : s === "later"
      ),
      st
    );
    chk(
      k + ": the era being unlocked pulses (its class), later eras are fogged",
      /class="ltcol current"/.test(a) && /class="ltcol later"/.test(a)
    );
    chk(
      k + ": the steps are the game's own (eraSteps)",
      M.eras.every(e => e.i === 0 || JSON.stringify(e.steps) === JSON.stringify(eraSteps(c, d, e.i)))
    );
    chk(
      k + ": a future era has its age from goalSim",
      M.eras
        .filter(e => e.st !== "done" && e.st !== "here" && e.months != null)
        .every(e => e.age === Math.round(c.age + e.months / 12))
    );
    chk(k + ": the map scrolls inside its own box", a.includes('class="ltscroll"'));
    chk(
      k + ": clean, no em dash, no verdict",
      clean(a) && !a.includes(String.fromCharCode(8212)) && !VERDICT.test(text(a.split("<h1>Skills</h1>")[0])),
      junk(a)
    );
    /* the sheet of the era being unlocked */
    X("ltnode", String(d.era + 1));
    const h = ov();
    chk(
      k + ": tap an era: what, why, the time",
      /What<\/span>/.test(h) && /Why<\/span>/.test(h) && /Time<\/span>/.test(h)
    );
    chk(
      k + ": and one Go do it button",
      /class="primary go wide"[^>]*>Go do it: /.test(h) || h.includes('data-fid="rcp:next"'),
      text(h)
    );
    chk(
      k + ": the era sheet has Show the math and Home",
      h.includes("<summary>Show the math</summary>") && h.includes('data-a="gohome"')
    );
    chk(k + ": the era sheet is clean", clean(h) && !h.includes(String.fromCharCode(8212)), junk(h));
    closeSheet();
    if (k === "fire") {
      const H = ltHeadStart(c, d);
      chk("fire: a starting bonus for each era passed", M.bonuses.length === d.era && d.era >= 1, [M.bonuses, d.era]);
      chk(
        "fire: the head start is grow() to the retirement age",
        H && H.fv === grow(c.inv, H.yrs, 0) && a.includes('data-fid="lt:head"')
      );
      const B = ltBook(c);
      chk(
        "fire: the head start is in the spreadsheet of the plan",
        B.rows.some(r => r.f === "={lt_inv}*(1+{lt_r})^{lt_yrs}") && BOOK_PARTS.includes(ltBook)
      );
      X("ltnode", "1");
      chk("fire: a done era shows its starting bonus", /Starting bonus<\/span>/.test(ov()));
      closeSheet();
    } else chk("neg: nothing invested, no head start card", !ltHeadStart(c, d) && !a.includes('data-fid="lt:head"'));
  });
  chk("Home's You are here opens the life map", /data-a="tab" data-v="map"/.test(rsRouteCard(C(), derive(C()))));

  G = G0;
  W = null;
  closeSheet();
}
