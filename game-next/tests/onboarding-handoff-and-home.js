/* ============================================================================
   SLAM the Game, test: tests/onboarding-handoff-and-home.js
   PURPOSE     Examine run 16 (SLAM audit fixes, batch 1, Nov 27 2026), sections A and B.
               A. The hand-off from the opening to the game: both endings (the last screen of What it is /
               What it could be, and the demo Find your era) are one result with one primary button, "Start
               my first move", and a small Back; the answers arrive on the profile as a Guess and the rest
               of setup does not ask them again; the button lands on Home with the first move as the top
               card; the line about no account shows only to a player who is signed out.
               B. Home: one row of the four top numbers (free to spend this month, the next goal, net worth,
               free of costly debt), each with its "i", one Show the math, then ONE next-step card; the
               rest is below. A top number that changed moves for a moment, and not when the player asked
               for less motion.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players: one with
               nothing owed, one with costly debt (a card balance), in each flow.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/couldbe.js (cbEndView, ACT.cbfirst, openSetupCb,
               cbNumsMove), features/cbreveal.js (cbResult, cbFirstPick, cbHomeFirst, homeFirstCard,
               cbRevealView, ACT.cbfirstgo), features/erain.js (erIn, erBase, erSigned), features/amounts.js
               (amCarryInv, amGroupGuess), features/look.js (lkHome, homeStatRow, homeNumsMove),
               features/results.js (homeResults, homeResultsMore), screens/ux.js (homeQuadTop),
               screens/dash.js (dkTile), account/door.js (doorFromDemo).
   ========================================================================= */
{
  const G0 = clone(G),
    fs = require("fs"),
    path = require("path"),
    css = fs.readFileSync(path.join(GAME_DIR, "index.html"), "utf8"),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    bad = h =>
      (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || [])
        .concat(text(h).match(/mistake|failed|\bbehind\b|off track|should|wasteful|too much|bad\b/gi) || [])
        .join(","),
    fid = (h, id) => (h.split('data-fid="' + id + '"')[1] || "").split("data-fid=")[0],
    /* a stand-in for the device storage that keeps what it gets */
    box = {},
    store = {
      getItem: k => (k in box ? box[k] : null),
      setItem: (k, v) => (box[k] = String(v)),
      removeItem: k => delete box[k],
      key: i => Object.keys(box)[i],
      get length() {
        return Object.keys(box).length;
      },
    },
    ls0 = localStorage,
    fresh = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      HOME_MORE = false;
    },
    /* a new player of the flow: Start, Skip, four taps */
    flow = () => {
      fresh();
      X("start");
      X("wnskip");
      X("cbset", "", "", { q: "age", i: 2 });
      X("cbset", "", "", { q: "spend", i: 2 });
      X("cbset", "", "", { q: "inv", i: 2 });
      X("cbset", "", "", { q: "save", i: 3 });
      return C();
    },
    /* the same player with costly debt: a card balance, as setup writes it */
    owe = c => {
      c.debts = [{ k: "Credit card balance", amt: 9000, high: true, s: false, was: 9000 }];
      c.debtKinds = ["Credit card balance"];
      c.high = "yes";
      save();
      render();
    },
    /* a visitor of the demo with these answers, who tapped "Start my first move" there */
    demo = A => {
      fresh();
      box[ER_KEY] = erPack(A);
      X("start");
      return C();
    },
    DEBT = { age: 2, spend: 2, inv: 2, save: 3, cush: "1 to 3 months", debts: ["Credit card balance"], tax: "some" },
    FREE = { age: 2, spend: 2, inv: 0, save: 0, cush: "no1k", debts: [] };
  localStorage = store;

  /* ================= A. THE HAND-OFF ================= */
  /* ---- A1. the result of the flow: one primary button and a Back ---- */
  [
    ["nothing owed", () => {}],
    ["costly debt", owe],
  ].forEach(([name, more]) => {
    const c = flow();
    more(c);
    X("cbgo", "reveal");
    let h = ov();
    chk(
      name + ": the reveal holds Keep my plan, Share my card and Tell Eli what broke, and they are not the main button",
      /data-a="cbsave">Keep my plan/.test(fid(h, "cb:end3")) &&
        /data-a="cbshare">Share my card</.test(fid(h, "cb:end3")) &&
        /data-a="flag">Tell Eli what broke</.test(fid(h, "cb:end3")) &&
        !/class="primary/.test(fid(h, "cb:end3")) &&
        (h.match(/class="primary/g) || []).length === 1
    );
    X("cbgo", "end");
    h = ov();
    const R = cbResult(c),
      body = h.slice(h.indexOf("<h2>"));
    chk(
      name + ": the result has exactly one primary button, Start my first move",
      W.step === "end" &&
        (h.match(/class="primary/g) || []).length === 1 &&
        /class="primary wide go cbresgo cbnext" data-a="cbfirst">Start my first move</.test(h)
    );
    chk(
      name + ": the only other button of the screen is a small Back, to the reveal",
      (body.match(/<button/g) || []).filter(Boolean).length -
        (body.split("rp-sheetrow")[1] ? (body.split("rp-sheetrow")[1].match(/<button/g) || []).length : 0) ===
        2 && /class="ghost slim" data-a="cbgo" data-v="prev"/.test(body),
      (body.match(/<button[^>]*>/g) || []).join(" ")
    );
    chk(
      name + ": the frame of the sheet is put away on this screen (Home, Menu, i, Close, Report, Look up a word)",
      /\.sheet:has\(\.cbresgo\) \.nvhead button,\.sheet:has\(\.cbresgo\) \.rp-sheetrow,\.sheet:has\(\.cbresgo\) \.lookup\{display:none\}/.test(
        css
      )
    );
    chk(
      name + ": it shows the name of the era and one plain sentence on why, the game's own",
      R.era === eraName(derive(c)) &&
        R.why === eraOne(derive(c)) &&
        fid(h, "cb:resera").includes(esc(R.era)) &&
        fid(h, "cb:reswhy").includes(esc(R.why)) &&
        R.why.split(/[.!?] /).length <= 2,
      R.era + ": " + R.why
    );
    chk(
      name + ": it shows the one first move, with its why",
      !!R.move &&
        fid(h, "cb:firstname").includes(esc(R.move.name)) &&
        fid(h, "cb:firstwhy").includes(esc(R.move.why)) &&
        (h.match(/data-fid="cb:first"/g) || []).length === 1,
      R.move && R.move.name
    );
    chk(name + ": the era of a guess says Guess, with no verdict", R.st === "Guess" && /kitst">Guess</.test(h));
    chk(name + ": the result has no junk and no blame word", bad(h) === "", bad(h));
    X("cbgo", "prev");
    chk(name + ": Back goes to the reveal", W.kind === "cb" && W.step === "reveal", W.step);
    X("cbgo", "end");

    /* ---- A3. the button lands on Home ---- */
    X("cbfirst");
    h = app();
    const F = cbHomeFirst(C(), derive(C()));
    chk(
      name + ": Start my first move closes the flow and lands on Home",
      !SH && !W && tab === "home" && C().x.cb.first === "cb"
    );
    chk(
      name + ": the first move of the result is the top card of Home, with one line of why under it",
      !!F &&
        F.name === R.move.name &&
        fid(h, "cb:homefirstname").includes(esc(F.name)) &&
        fid(h, "cb:homefirstwhy").includes(esc(F.why)) &&
        h.indexOf('data-fid="cb:homefirst"') > h.indexOf('class="dkstats"') &&
        h.indexOf('data-fid="cb:homefirst"') < h.indexOf('data-fid="cb:home"')
    );
    chk(
      name + ": that card pulses and holds the one primary button of Home; Your next win waits",
      /class="card dkcard rsq rswin hqfirst pulse" data-fid="cb:homefirst"/.test(h) &&
        (h.split("<!--homerows-->")[0].match(/class="primary/g) || []).length === 1 &&
        !/data-fid="rs:win"/.test(h)
    );
    chk(name + ": Home has no junk and no blame word", bad(h) === "", bad(h));
    X("cbfirstgo");
    chk(
      name + ": Start this move opens the move, and Home goes back to Your next win",
      !C().x.cb.first && !/data-fid="cb:homefirst"/.test(app()) && /data-fid="rs:win"/.test(app())
    );
    closeSheet();
  });
  chk(
    "the pulse of Home is the next-step card only: every other pulse of the page is stilled",
    /\.hq\.rs \.rsmore \.pulse,\.hq\.rs \.rsmore button\.go,\.hq\.rs \.rsmore \.rsstrip i\.here,\.hq\.rs>\.rstop~\.pulse,\.hq\.rs>\.rstop~\* \.pulse,\.hq\.rs>\.rstop~\* button\.go,\.hq\.rs>\.rstop~button\.go\{animation:none\}/.test(
      css
    )
  );
  /* a move that is on the steps already is started: the card gives way */
  {
    const c = flow();
    X("cbgo", "reveal");
    X("cbgo", "end");
    X("cbfirst");
    const M = cbFirstMove(c);
    if (M && M.canAdd) {
      X("cbaddstep", "", M.key);
      chk(
        "a first move that was added on Next Steps is started: Home shows Your next win",
        cbHomeFirst(c, derive(c)) === null && /data-fid="rs:win"/.test(app())
      );
    } else chk("the first move of this player has no steps to add", !!M);
  }

  /* ---- A4. signed in or signed out ---- */
  {
    const c = flow(),
      uid0 = SUPA.uid,
      g0 = DOOR.guest,
      OUT = "No account. Nothing is sent. Your answers stay on this device.";
    X("cbgo", "reveal");
    X("cbgo", "end");
    SUPA.uid = null;
    DOOR.guest = true;
    drawSheet();
    chk(
      "signed out: the result says No account. Nothing is sent. Your answers stay on this device.",
      cbResult(c).signed === false && fid(ov(), "cb:kept").includes(OUT) && !/Saved to your account/.test(ov())
    );
    DOOR.guest = false;
    SUPA.uid = "11111111-2222-4333-8444-555555555555";
    drawSheet();
    chk(
      "signed in: the result says Saved to your account., and not the line about no account",
      cbResult(c).signed === true &&
        fid(ov(), "cb:kept").includes("Saved to your account.") &&
        !/No account/.test(text(ov()))
    );
    /* the plan goes to the account by the one save path of the game: save(), which cloud.js and supa.js follow */
    chk(
      "the tap saves through save(): no second way to the account",
      /cbfirst: \(\) => \{[\s\S]{0,200}save\(\);/.test(
        fs.readFileSync(path.join(GAME_DIR, "features/couldbe.js"), "utf8")
      ) &&
        !/SUPA\.sb|\.from\(|rpc\(/.test(
          fs.readFileSync(path.join(GAME_DIR, "features/cbreveal.js"), "utf8") +
            fs.readFileSync(path.join(GAME_DIR, "features/erain.js"), "utf8")
        )
    );
    SUPA.uid = uid0;
    DOOR.guest = g0;
    closeSheet();
  }

  /* ---- A2 and A3, the demo Find your era: the answers arrive as a Guess, and nothing is asked twice ---- */
  [
    ["demo, costly debt", DEBT],
    ["demo, nothing owed", FREE],
  ].forEach(([name, A]) => {
    const R = erResult(A),
      c = demo(A),
      d = derive(c);
    let h = app();
    chk(name + ": one tap on Start, and Home is open with no sheet", !G.demo && !SH && !W && tab === "home");
    chk(
      name + ": the era on Home's profile is the era the demo showed",
      d.era === R.era && erName(d) === R.name,
      d.era + " " + R.era
    );
    chk(
      name + ": the first move of the demo is the top card of Home, with its why",
      c.x.cb.first === "era" &&
        fid(h, "cb:homefirstname").includes(esc(R.next.t)) &&
        fid(h, "cb:homefirstwhy").includes(esc(R.next.why)) &&
        !/data-fid="rs:win"/.test(h)
    );
    chk(
      name + ": the four answers are rows of the profile, each a Guess (not entered, greyed)",
      CB_QS.every(Q => c.x.cb.a[Q.id].cf === 1) &&
        c.incs.every(x => !x.s) &&
        c.spends.every(x => !x.s) &&
        c.invs.every(x => !x.s) &&
        cbState(c) === "Guess"
    );
    chk(
      name + ": the cushion and the kinds of debt are on the profile",
      c.can1k === (A.cush === "no1k" ? "No" : "Yes") &&
        (A.cush === "no1k" || c.cover === A.cush) &&
        c.debtKinds.join() === A.debts.join(),
      [c.can1k, c.cover, c.debtKinds].join("|")
    );
    chk(name + ": Home has no junk and no blame word", bad(h) === "", bad(h));
    /* the rest of setup */
    X("cbrest");
    chk(name + ": the rest of setup starts after the age, which shows filled", W.kind === "setup" && W.step === 1);
    chk(
      name + ": the cushion answers come filled",
      W.o.can1k === c.can1k && (A.cush === "no1k" ? !W.o.cover : W.o.cover === A.cush) && W.o.invest === c.invest
    );
    chk(name + ": the kinds of debt come filled", W.o.debtKinds.join() === A.debts.join());
    W.step = 4;
    drawSheet();
    h = ov();
    chk(
      name + ": the debts page shows them as answered, one tap from a change, and is full",
      smFull(W) && (A.debts.length === 0 || /Kinds of debt: Credit card balance/.test(text(h))),
      text(h).slice(0, 200)
    );
    W.step = 7;
    drawSheet();
    h = ov();
    if (A.cush !== "no1k")
      chk(
        name + ": the cushion page asks nothing: every answer is filled, each with a tap to change it",
        smFull(W) &&
          /A \$1,000 surprise: Yes/.test(text(h)) &&
          /Could cover bills for: 1 to 3 months/.test(text(h)) &&
          !/Could you pay it without borrowing\?/.test(text(h)),
        text(h).slice(0, 300)
      );
    else
      chk(
        name + ": the surprise answer is filled, and only what the demo did not ask is open",
        /A \$1,000 surprise: No/.test(text(h)) && !/Could you pay it without borrowing\?/.test(text(h)),
        text(h).slice(0, 300)
      );
    if (A.tax) {
      W.step = 8;
      drawSheet();
      h = ov();
      chk(
        name + ": the tax-friendly answer is filled, and its question is not asked again",
        W.o.taxAcctQ === "Yes, some" &&
          /Tax-friendly saving: Yes, some/.test(text(h)) &&
          !/Do you put money into a tax-friendly account/.test(text(h)),
        text(h).slice(0, 300)
      );
    }
    if (c.invs.length) {
      W.step = 11;
      drawSheet();
      h = ov();
      const a = W.o.am["a:401korworkplan"];
      chk(
        name + ": the amount invested is not asked again: its account comes filled, as a Guess",
        a &&
          a.kept === true &&
          a.v === null &&
          a.guess === c.invs[0].amt &&
          !/About how much is in it today\?/.test(text(h)) &&
          text(h).includes("About " + money(c.invs[0].amt) + ", from your quick answers") &&
          /Investments: [^<]*<\/b><\/span><span class="pill kitst">Guess</.test(h),
        text(h).slice(0, 400)
      );
      const P = amApply(clone(W.o));
      chk(
        name + ": the filled answer leaves the row as it is: the same amount, still a Guess",
        P.invs.length === 1 && P.invs[0].amt === c.invs[0].amt && !P.invs[0].s
      );
    }
    W.step = 13;
    drawSheet();
    h = ov();
    const g0 = AM_GROUPS[AM_GROUPS.findIndex(g => text(h).includes(g[0] + " total"))],
      row = c.spends.find(x => x.k === g0[0]);
    chk(
      name + ": spending opens with the share of the player's own quick answer, not a stock number",
      !!row &&
        text(h).includes(g0[0] + " total " + money(row.amt)) &&
        /From your quick answer, a Guess\./.test(text(h)),
      text(h).slice(0, 300)
    );
    closeSheet();
  });
  /* a flow player (no demo): the stock answers of a new profile are not shown as the player's own */
  {
    const c = flow();
    X("cbgo", "reveal");
    X("gohome");
    X("cbrest");
    chk(
      "a player who was never asked about the cushion or debts gets those questions: no stock answer is filled in",
      W.o.can1k === null && W.o.cover === null && W.o.debtKinds.length === 0 && !W.o.taxAcctQ
    );
    chk("the age and the amount invested still come filled", W.o.age === c.age && !!W.o.am["a:401korworkplan"]);
    closeSheet();
  }
  /* the landing does not ask a visitor of the demo to tap Start a second time */
  box[ER_KEY] = erPack(DEBT);
  chk("a visitor with the answers of the demo passes the landing", doorFromDemo() === true);
  box[ER_KEY] = erPack(DEBT, addDays(todayISO(), -5));
  chk("answers that are too old do not: the landing shows", doorFromDemo() === false);
  delete box[ER_KEY];

  /* ================= B. HOME ================= */
  [
    ["nothing owed", () => {}],
    ["costly debt", owe],
  ].forEach(([name, more]) => {
    const c = flow();
    more(c);
    X("cbgo", "reveal");
    X("gohome");
    const h = app(),
      top = h.slice(h.indexOf('<div class="rstop'), h.indexOf('<div class="rsmore">')),
      rest = h.slice(h.indexOf('<div class="rsmore">'), h.indexOf("<!--homerows-->")),
      s = lkHome(c, D),
      stat = top.slice(top.indexOf('class="dkstats"'), top.indexOf("</div></div>", top.indexOf('class="dkstats"')));
    /* ---- B6 ---- */
    chk(
      name + ": Home has one row of four tiles: free to spend, next goal, net worth, free of costly debt",
      (h.match(/class="dkstats"/g) || []).length === 1 &&
        (stat.match(/class="dktile dkti"/g) || []).length === 4 &&
        ["Free to spend", "Next goal", "Net worth", "Free of costly debt"]
          .map(t => stat.indexOf(">" + t + "<"))
          .every((p, i, A) => p > 0 && (!i || A[i - 1] < p)),
      (stat.match(/class="dklabel">[^<]*/g) || []).join("|")
    );
    chk(
      name + ": then ONE next-step card above the rest",
      (top.match(/class="card dkcard rsq/g) || []).length === 1 &&
        /data-fid="rs:win"/.test(top) &&
        (top.match(/class="primary/g) || []).length === 1
    );
    chk(
      name + ": everything else is below it: the two numbers, the end of the month, You are here, Your numbers",
      ["cb:home", "rs:month", "rs:route", "rs:tiles"].every(f => rest.includes('data-fid="' + f + '"')) &&
        !/class="primary/.test(rest)
    );
    chk(
      name + ": free to spend is this month, the engine's own number, and no week is on Home",
      stat.includes(">" + money(Math.max(0, freeToSpend(c, D).free)) + "<") &&
        /this month · (Guess|Close)/.test(stat) &&
        !/a week/.test(text(top)) &&
        !/data-fid="v:freewk"/.test(h)
    );
    chk(
      name + ": net worth is own minus owe, from the one net worth of the game",
      stat.includes(">" + lkNwText(c, D).txt + "<") && /own minus owe · /.test(stat)
    );
    chk(
      name + ": a number that stands on a guess is greyed and says Guess",
      /class="dknum guess" data-cbn="hqfree"/.test(stat) && /class="dknum guess" data-cbn="hqnw"/.test(stat)
    );
    chk(
      name + ": each tile has its own i, and its number is a button with a caret",
      ["free", "hqgoal", "hqnw", "hqdebt"].every(k => stat.includes('data-a="info" data-k="term:' + k + '"')) &&
        ["free", "hqgoal", "hqnw", "hqdebt"].every(k => GLOSS[k] && GLOSS[k][1].length > 20) &&
        (stat.match(/<button class="dktigo" data-a="(safe|tab|lkbrk|debtplan)"/g) || []).length === 4 &&
        (stat.match(/class="caret"/g) || []).length === 4
    );
    chk(
      name + ": Show the math is under the row, with a line for each number",
      /<\/div><\/div><details class="math">/.test(top) &&
        ["Free to spend this month:", "Next goal:", "Net worth:", "Free of costly debt:"].every(t =>
          fid(h + 'data-fid="', "").length >= 0 ? top.includes(t) : false
        )
    );
    chk(
      name + ": the tile of costly debt shows what the debt plan gives, or its open state: never a made-up date",
      s.hi.none
        ? /* nobody asked this player about debts yet: "nothing owed" is a Guess, greyed */
          s.hi.guess === true &&
            /class="dknum guess" data-cbn="hqdebt"[^>]*>Now</.test(stat) &&
            /none at 8% or more · Guess/.test(stat)
        : s.hi.months == null
          ? stat.includes(">No end yet<")
          : stat.includes(">" + dkMonth(s.hi.months) + "<") && />at 8% or more · Guess</.test(stat),
      JSON.stringify(s.hi)
    );
    chk(name + ": Home has no junk and no blame word", bad(h) === "", bad(h));
  });
  /* the date with no costly debt is the debt plan's own: the highest rate first, at today's payments */
  {
    const c = flow();
    owe(c);
    const hi = dbPlan(c, "avalanche", 0).debts.filter(x => x.apr >= 0.08 && x.bal > 0),
      s = lkHome(c, D);
    chk(
      "costly debt: the months on the tile are the months of the debt plan (dbPlan), a Guess while the debt is one",
      hi.length === 1 && s.hi.none === false && s.hi.months === hi[0].off && s.hi.guess === true,
      JSON.stringify(s.hi)
    );
    c.goals = [];
    chk(
      "no goal: the tile says so, with the way to add one",
      /None yet/.test(homeStatRow(c, D)) && lkHome(c, D).goal === null
    );
  }
  /* one unit for free to spend: the month leads everywhere; the week is the same number in a smaller piece */
  {
    const c = flow(),
      f = freeToSpend(c, D);
    X("cbgo", "reveal");
    X("gohome");
    HOME_MORE = true;
    render();
    chk(
      "the card Free to spend lower on Home leads with the month too, with the week as a smaller piece",
      fid(app(), "v:free").includes(money(f.free) + " this month") &&
        app().includes("about " + money(f.week) + " a week") &&
        !new RegExp(">\\" + money(f.week) + " a week<").test(app())
    );
    HOME_MORE = false;
    X("safe");
    chk(
      "the sheet Safe to spend says the same month first",
      text(ov()).includes("Free to spend this month: " + money(f.free) + " (about " + money(f.week) + " a week)"),
      text(ov()).slice(0, 200)
    );
    closeSheet();
  }
  chk(
    "the sample game keeps its own top: the welcome screen, with no stat row of a made-up player",
    (fresh(), render(), !/class="dkstats"/.test(app()) || G.demo)
  );
  chk(
    "at 390 wide the tiles are two by two, at 640 and wider four in a row; the first card puts its button beside the words when wide",
    /\.dkstats\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css) &&
      /@container \(min-width:640px\)\{\.dkstats\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}\}/.test(css) &&
      /@media \(min-width:900px\)\{\.hqfirstin\{flex-direction:row/.test(css)
  );

  /* ---- B7. a number that changed moves for a moment ---- */
  {
    const el = (k, to, txt) => ({
        dataset: Object.assign({ cbn: k, to: to == null ? "" : String(to) }, txt ? { txt: "1" } : {}),
        textContent: txt || "",
        cls: [],
        classList: {
          add(c) {
            el.cls = (el.cls || []).concat(c);
          },
          remove() {},
        },
      }),
      mm0 = global.matchMedia,
      raf0 = global.requestAnimationFrame,
      st0 = global.setTimeout,
      frames = [];
    global.requestAnimationFrame = f => frames.push(f);
    global.setTimeout = () => 0;
    global.matchMedia = () => ({ matches: false });
    let moved = [];
    const mk = (k, to, txt) => {
      const e = el(k, to, txt);
      e.classList = { add: c => moved.push(k + ":" + c), remove: () => {} };
      return e;
    };
    let now = cbNumsMove([mk("hqfree", 1200), mk("hqgoal", null, "2 years")], {}, v => money(Math.round(v)));
    chk(
      "the first draw moves nothing, and keeps the values",
      moved.length === 0 && frames.length === 0 && now.hqfree === 1200 && now.hqgoal === "2 years"
    );
    const a = mk("hqfree", 1500),
      b = mk("hqgoal", null, "1 year"),
      same = mk("hqnw", 900);
    now = cbNumsMove([a, b, same], Object.assign({ hqnw: 900 }, now), v => money(Math.round(v)));
    chk(
      "a number that changed counts from the old value to the new one; words that changed light up; the rest stays still",
      moved.join() === "hqfree:cbmove,hqgoal:cbmove" && frames.length === 1 && now.hqfree === 1500
    );
    frames[0]();
    chk(
      "while it counts it shows a value between the two, as money",
      /^\$1,[2-5]\d\d$/.test(a.textContent),
      a.textContent
    );
    moved = [];
    frames.length = 0;
    global.matchMedia = () => ({ matches: true });
    cbNumsMove([mk("hqfree", 1800)], now, v => money(Math.round(v)));
    chk("with less motion asked for, nothing moves", moved.length === 0 && frames.length === 0);
    global.matchMedia = mm0;
    global.requestAnimationFrame = raf0;
    global.setTimeout = st0;
    chk(
      "Home marks each top number for that one animation, and draws it after each draw of the screen",
      ["hqfree", "hqgoal", "hqnw", "hqdebt"].every(k => homeStatRow(flow(), D).includes('data-cbn="' + k + '"')) &&
        /if \(typeof homeNumsMove === "function"\) homeNumsMove\(\);/.test(
          fs.readFileSync(path.join(GAME_DIR, "screens/ux.js"), "utf8")
        ) &&
        /\.dknum\.cbmove\{color:var\(--good\)\}/.test(css)
    );
    chk(
      "the flow and Home share the one animation: drawSheetCb calls it too",
      /function drawSheetCb\(\) \{[\s\S]{0,400}cbNumsMove\(/.test(
        fs.readFileSync(path.join(GAME_DIR, "features/couldbe.js"), "utf8")
      )
    );
  }

  localStorage = ls0;
  G = clone(G0);
  W = null;
  SH = null;
}
