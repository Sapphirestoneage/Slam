/* ============================================================================
   SLAM the Game, test: tests/what-you-want.js
   PURPOSE     Examine run SLAM-ONBOARD-1 (Nov 27 2026), the part of the first worker: the screen What you
               want (the picks become goals in c.goals, in the shape of the card draft), the chip "No idea,
               use typical" on three of the four questions (a sourced value for the age, a Guess, and "Make
               it mine" on the reveal), the slim strip of the two numbers from the first way screen on, and
               the first move on the last screen (the #1 move of Next Steps, with "Add to my steps").
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/wants.js (WN_LIST, wnPicked, wnGoals, wnMatch, wnTagData,
               wnView, wnTags), features/goalrank.js (grNew, grOwnField, grOrder, grApply), features/couldbe.js
               (cbOpen, cbTypical, cbTypUsed, cbTop, cbSlim, cbEndView, cbBook, openSetupCb),
               features/cbreveal.js (cbFirstMove, cbTopMoves, cbRevealView), core/paylayers.js (LY_TYP_REF).
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    junk = h =>
      (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || [])
        .concat(text(h).match(/mistake|failed|\bbehind\b|off track|should|wasteful|too much|bad\b/gi) || [])
        .join(","),
    fid = (h, id) => (h.split('data-fid="' + id + '"')[1] || "").split("data-fid=")[0],
    start = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      X("start");
    },
    four = () => {
      X("cbset", "", "", { q: "age", i: 2 });
      X("cbset", "", "", { q: "spend", i: 2 });
      X("cbset", "", "", { q: "inv", i: 2 });
      X("cbset", "", "", { q: "save", i: 3 });
    };

  /* ---- 1. the screen: one screen, chips, no typing ---- */
  start();
  let h = ov();
  chk(
    "Start opens What you want, before the four questions",
    W.kind === "cb" && W.step === "wants" && /What do you want\?/.test(h)
  );
  chk(
    "the eleven chips and Something else, in the order of the list",
    WN_LIST.length === 11 &&
      WN_LIST.map(x => x.l).join("|") ===
        "Retire early|Retire on time|Get out of debt|Build a cushion|Buy a home|Travel more|Have or raise kids|Change careers or quit my job|Start a business|Give more|Just feel calm about money" &&
      WN_LIST.every(x => h.includes(">" + esc(x.l) + "</button>")) &&
      /data-a="wnown"[^>]*>Something else</.test(h)
  );
  chk("no typing: no box until Something else is tapped", !/<input/.test(h));
  chk(
    "the two buttons: Next: four quick taps (the one primary) and I'm not sure (ghost)",
    /class="primary wide go cbnext" data-a="wnnext">Next: four quick taps</.test(h) &&
      /class="ghost wide" data-a="wnskip">I'm not sure</.test(h) &&
      (h.match(/class="primary/g) || []).length === 1
  );
  chk("no ranking on this screen", !/data-a="grup"|Rank them/.test(h));
  chk("the screen has no junk and no verdict word", junk(h) === "", junk(h));
  chk(
    "a tap on a range chip does nothing while this screen is open",
    (X("cbset", "", "", { q: "age", i: 2 }), W.step === "wants" && !(W.o.a && W.o.a.age))
  );

  /* ---- 2. picks, Something else, and the goals of the profile ---- */
  X("wnpick", "debt");
  X("wnpick", "home");
  X("wnpick", "travel");
  X("wnpick", "calm");
  X("wnpick", "calm");
  h = ov();
  chk(
    "a chip goes on and off",
    W.wp.join() === "debt,home,travel" &&
      /class="chip on" data-a="wnpick" data-v="debt" aria-pressed="true"/.test(h) &&
      /3 picked\./.test(h)
  );
  X("wnown");
  h = ov();
  chk(
    "Something else opens the field Add my own of the card draft",
    h.includes(grOwnField()) && /data-a="grown"/.test(h)
  );
  W.own = ["A year in Lisbon"]; /* what ACT.grown writes from the box */
  X("wnnext");
  chk(
    "Next goes to the first of the four questions, with a way back",
    W.step === "entry" && W.q === 0 && /Question 1 of 4/.test(ov()) && /data-a="wnback"/.test(ov())
  );
  X("wnback");
  chk(
    "Back shows the picks as they were",
    W.step === "wants" && /data-v="debt" aria-pressed="true"/.test(ov()) && /A year in Lisbon/.test(ov())
  );
  X("wnnext");
  four();
  let c = C();
  chk(
    "the four answers make the player, and the flow goes on at What it is",
    !G.demo && W.kind === "cb" && W.step === "is"
  );
  chk(
    "the picks are goals in c.goals, by name, in the order of the screen",
    c.goals.map(g => g.n).join("|") === "Get out of debt|Buy a home|Travel more|A year in Lisbon",
    c.goals.map(g => g.n)
  );
  const want = grNew(c, "Home", "Buy a home"),
    got = c.goals[1];
  chk(
    "each goal has the shape of the card draft (grNew): the same keys, a kind of the game, Someday, a Guess",
    c.goals.every(g => Object.keys(g).sort().join() === Object.keys(want).sort().join()) &&
      c.goals.every(g => GOAL_ONE[g.k] && g.era === null && g.s === false && g.fund === 0 && g.d === todayISO()) &&
      got.k === "Home" &&
      got.cost === goalTypical(c, "Home") &&
      c.goals[2].k === "Trip" &&
      c.goals[0].k === "Something else" &&
      c.goals[3].k === "Something else",
    c.goals
  );
  chk("no rank is written: the player ranks later", c.goals.every(g => g.rank == null) && !(c.x && c.x.grank));
  chk(
    "the ranking of the card draft works on them",
    (() => {
      const k = clone(c);
      grMove(k, 2, 0);
      grApply(k, derive(k));
      return (
        grOrder(k)[0].n === "Travel more" &&
        grOrder(k).length === 4 &&
        grOrder(k)
          .slice(0, 3)
          .every(g => g.era != null) &&
        grOrder(k)[3].era === null
      );
    })()
  );
  chk(
    "the goals show on My Goals with no junk",
    (() => {
      const g = text(goalsCard(C(), derive(C())));
      return /Get out of debt/.test(g) && /A year in Lisbon/.test(g) && junk(g) === "";
    })()
  );

  /* ---- 3. the tags at the top of the flow ---- */
  h = ov();
  chk(
    "What it is shows the picks as small tags (labels, not buttons)",
    /data-fid="wn:tags"/.test(h) &&
      /<span class="pill wntag">Get out of debt<\/span>/.test(h) &&
      /<span class="pill wntag">A year in Lisbon<\/span>/.test(h) &&
      !/<button[^>]*wntag/.test(h)
  );
  X("cbgo", "next");
  chk("the chart shows them too", /data-fid="wn:tags"/.test(ov()));
  chk(
    "more than four: the rest is a count",
    (() => {
      const k = clone(c);
      k.goals.push(grNew(k, "Car"), grNew(k, "Wedding"));
      const T = wnTagData(k);
      return T.show.length === 4 && T.more === 2 && /\+2 more/.test(wnTags(k));
    })()
  );
  chk("a player with no goal has no tag row", wnTags(Object.assign(clone(c), { goals: [] })) === "");

  /* ---- 4. wnMatch: a want by what it is about ---- */
  chk(
    "a want is found by a lever, then by the next tag",
    wnMatch(c, ["interest", "fi"]).l === "Get out of debt" &&
      wnMatch(c, ["housing"]) === null &&
      wnMatch(c, ["A"]).l === "Buy a home" &&
      wnMatch(c, ["taxes"]) === null
  );
  chk(
    "a want is found for a round of setup",
    wnMatch(c, ["D"]).id === "debt" && wnMatch(c, ["E"]).id === "travel" && wnMatch(c, ["T"]) === null
  );
  chk(
    "a goal that is done is no want",
    (() => {
      const k = clone(c);
      k.goals[0].done = true;
      return wnMatch(k, ["D"]) === null;
    })()
  );

  /* ---- 5. the rest of setup keeps the goals ---- */
  X("cbrest");
  chk(
    "the rest of setup starts with the goals of the player",
    W.kind === "setup" && W.o.goals.map(g => g.n).join("|") === c.goals.map(g => g.n).join("|")
  );
  SH = null;
  W = null;

  /* ---- 6. Skip for now ---- */
  start();
  X("wnpick", "early");
  X("wnskip");
  four();
  c = C();
  chk(
    "Skip keeps no pick, and the first number comes at the sixth tap (Start, Skip, four answers)",
    c.goals.length === 0 && cbTaps() === 6 && W.step === "is",
    [c.goals.length, cbTaps()]
  );
  chk("no tag row then", !/data-fid="wn:tags"/.test(ov()));

  /* ---- 7. No idea, use typical ---- */
  const T = LY_TYP_REF;
  chk(
    "the typical values have a named, dated source each",
    [T.spend, T.saveRate, T.inv].every(
      x => typeof x.source === "string" && x.source.length > 40 && /^\d{4}-\d\d-\d\d$/.test(x.date)
    ) &&
      /Bureau of Labor Statistics/.test(T.spend.source) &&
      /Bureau of Economic Analysis/.test(T.saveRate.source) &&
      /Survey of Consumer Finances 2025/.test(T.inv.source)
  );
  const sp = cbTypical("spend", 32),
    iv = cbTypical("inv", 32),
    sv = cbTypical("save", 32),
    row32 = T.spend.rows.find(r => r.band === "25 to 34");
  chk(
    "spend: the row of the age, a year over 12, to the nearest $10",
    sp.v === Math.round(row32.year / 12 / 10) * 10 && sp.band === "25 to 34",
    sp
  );
  chk(
    "invested: the median of the age band",
    iv.v === T.inv.rows[0].median &&
      cbTypical("inv", 40).v === T.inv.rows[1].median &&
      cbTypical("inv", 67).v === T.inv.rows[4].median
  );
  chk(
    "save: the typical spending of the age times rate / (1 - rate)",
    sv.v === Math.round(((row32.year / 12) * T.saveRate.share) / (1 - T.saveRate.share) / 10) * 10 && sv.v > 0,
    sv
  );
  chk(
    "no row for the age: no value, so no chip",
    cbTypical("inv", 80) === null && cbTypical("spend", 0) === null && cbTypical("age", 30) === null
  );
  start();
  X("wnskip");
  /* run 16, C8: every question has "I'm not sure". Age has no typical value: nothing is kept, the question waits. */
  chk("the age question has the chip too", /data-a="cbtyp" data-q="age"[^>]*>I'm not sure</.test(ov()));
  X("cbtyp", "", "", { q: "age" });
  chk(
    "on age it keeps nothing and says why the question waits",
    W.q === 0 && !(W.o.a && W.o.a.age) && /Your age is the one answer this number needs/.test(fid(ov(), "cb:unsure"))
  );
  X("cbset", "", "", { q: "age", i: 2 });
  h = ov();
  chk(
    "spend has the chip I'm not sure, with the typical value under the chips",
    /data-a="cbtyp" data-q="spend"[^>]*>I'm not sure</.test(h) &&
      fid(h, "cb:typhint").includes("the usual amount for ages 25 to 34: " + money(sp.v) + " a month")
  );
  X("cbtyp", "", "", { q: "spend" });
  chk(
    "one tap answers the question and goes on",
    W.q === 2 && W.o.a.spend.typ === true && W.o.a.spend.v === sp.v && W.o.a.spend.cf === 1
  );
  chk("invested has the chip", /data-a="cbtyp" data-q="inv"/.test(ov()));
  X("cbtyp", "", "", { q: "inv" });
  chk("save has the chip", /data-a="cbtyp" data-q="save"/.test(ov()));
  X("cbtyp", "", "", { q: "save" });
  c = C();
  chk("three typical answers make a player", !G.demo && W.step === "is" && c.spend === sp.v && c.inv === iv.v, [
    c.spend,
    c.inv,
  ]);
  chk(
    "the rows are a Guess (not sharp), and the number is a Guess",
    c.spends.every(r => !r.s) && c.invs.every(r => !r.s) && c.incs.every(r => !r.s) && cbState(c) === "Guess"
  );
  chk("the income is the spending and the saving", c.take === sp.v + sv.v, c.take);
  let U = cbTypUsed(c);
  chk(
    "cbTypUsed names the three answers",
    U.map(u => u.q).join() === "spend,inv,save" && U[0].v === sp.v && U[2].v === sv.v
  );
  const B = cbBook(c).rows,
    bv = id => (B.find(r => r.id === id) || {}).v;
  chk(
    "the spreadsheet has the typical values, and the saving with its formula",
    bv("cb_typ_spend") === sp.v &&
      bv("cb_typ_inv") === iv.v &&
      bv("cb_typ_save") === sv.v &&
      Math.round((bv("cb_typ_month") * bv("cb_typ_rate")) / (1 - bv("cb_typ_rate")) / 10) * 10 === sv.v &&
      /cb_typ_month/.test(B.find(r => r.id === "cb_typ_save").f)
  );
  X("cbgo", "next");
  X("cbgo", "stack");
  X("cbgo", "reveal");
  h = ov();
  const box = fid(h, "cb:typ");
  chk(
    "the reveal says which answers are typical values, greyed as a Guess",
    /3 answers are typical values/.test(box) &&
      /Guess/.test(box) &&
      (h.match(/data-fid="cb:typrow"/g) || []).length === 3 &&
      h.includes('<b class="guess">' + money(sp.v) + "</b>")
  );
  chk(
    "each has a one-tap Make it mine",
    ["spend", "inv", "save"].every(q => h.includes('data-a="cbmine" data-q="' + q + '">Make it mine<'))
  );
  chk(
    "the math of the reveal names the sources",
    /Bureau of Labor Statistics/.test(h) &&
      /Survey of Consumer Finances 2025/.test(h) &&
      /Bureau of Economic Analysis/.test(h)
  );
  chk("the reveal has no junk", junk(h) === "", junk(h));
  X("cbmine", "", "", { q: "spend" });
  h = ov();
  chk(
    "Make it mine opens that one question",
    W.step === "entry" &&
      W.q === 1 &&
      W.one === true &&
      /How much money do you spend in one month\?/.test(h) &&
      /One answer/.test(h)
  );
  X("cbset", "", "", { q: "spend", i: 1 });
  c = C();
  U = cbTypUsed(c);
  chk(
    "one tap, and the reveal is back with the answer made mine",
    W.step === "reveal" && c.spend === cbRng("spend", 1).v && U.map(u => u.q).join() === "inv,save",
    [W.step, c.spend]
  );
  chk("the reveal now names two", /2 answers are typical values/.test(fid(ov(), "cb:typ")));
  chk(
    "after the rest of setup nothing is named",
    (() => {
      const k = clone(c);
      k.x.cb.setup = true;
      return cbTypUsed(k).length === 0;
    })()
  );
  X("cbgo", "entry");
  X("cbset", "", "", { q: "age", i: 5 });
  chk(
    "a new age: the typical values follow the age",
    W.o.a.inv.v === cbTypical("inv", cbRng("age", 5).v).v && W.o.a.save.typ === true
  );

  /* ---- 8. the slim strip from the first way screen on ---- */
  start();
  X("wnpick", "debt");
  X("wnnext");
  four();
  c = C();
  c.debts = [{ k: "Credit card balance", amt: 9000, high: true, s: true, was: 9000 }];
  c.debtKinds = ["Credit card balance"];
  syncAll(c);
  save();
  chk(
    "the strip is for the screens from the first way on",
    !cbSlim("is") &&
      !cbSlim("chart") &&
      !cbSlim("layer") &&
      cbSlim("stack") &&
      cbSlim("ss") &&
      cbSlim("shape") &&
      cbSlim("reveal") &&
      cbSlim("end")
  );
  chk("What it is has the two big numbers", /class="cbtop " data-fid="cb:top"/.test(ov()) && !/cbstrip/.test(ov()));
  X("cbgo", "next");
  chk("the chart too", !/cbstrip/.test(ov()));
  X("cbgo", "stack");
  h = ov();
  const N0 = cbNumbers(c);
  chk(
    "the stack has one slim strip: What it is: $X next to What it could be: $Y",
    /class="cbtop cbstrip" data-fid="cb:top"/.test(h) &&
      text(fid(h, "cb:top")).includes("What it is: " + money(N0.is.shown)) &&
      text(fid(h, "cb:top")).includes("What it could be: " + money(N0.could.shown)) &&
      (h.match(/data-cbn="could"/g) || []).length === 1
  );
  chk(
    "the ages are on a line under it",
    /data-cba="is"/.test(fid(h, "cb:ages")) && /data-cba="could"/.test(fid(h, "cb:ages"))
  );
  chk(
    "the number that counts down carries its value (drawSheetCb reads it)",
    h.includes('data-cbn="could" data-to="' + N0.could.shown + '"')
  );
  X("cbgo", "ss");
  X("cbdo", "count", "ss");
  h = ov();
  const N1 = cbNumbers(c);
  chk(
    "Count this moves What it could be down in the strip",
    N1.could.shown < N0.could.shown &&
      h.includes('data-cbn="could" data-to="' + N1.could.shown + '"') &&
      /cbstrip/.test(h),
    [N0.could.shown, N1.could.shown]
  );
  chk(
    "the strip is in the CSS as a sticky row that wraps",
    (() => {
      const css = require("fs").readFileSync(require("path").join(GAME_DIR, "index.html"), "utf8");
      return /\.cbtop\{position:sticky/.test(css) && /\.cbtop\.cbstrip\{display:flex;flex-wrap:wrap/.test(css);
    })()
  );

  /* ---- 9. the last screen: the first move ---- */
  X("cbgo", "reveal");
  X("cbgo", "end");
  h = ov();
  const M = cbFirstMove(c),
    top = cbTopMoves(c);
  chk(
    "the first move is the #1 of the top moves of Next Steps",
    M && top.length > 0 && M.name === top[0].name,
    M && M.name
  );
  chk(
    "the tile is above the one button, Start my first move (run 16, A1)",
    h.indexOf('data-fid="cb:first"') > 0 && h.indexOf('data-fid="cb:first"') < h.indexOf('data-a="cbfirst"')
  );
  chk(
    "it says what to do and why",
    fid(h, "cb:firstname").includes(esc(M.name)) && fid(h, "cb:firstwhy").includes(esc(M.why)) && M.why.length > 10
  );
  chk(
    "the why is tied to a want when one matches",
    M.want === null ? !/Because you picked/.test(M.why) : M.why.indexOf("Because you picked " + M.want + ". ") === 0,
    M.why
  );
  chk(
    "about how long comes from the minutes of the move's own steps, or it is left off",
    M.src === "stg"
      ? M.time ===
          "About " +
            stgOf(M.key).quests.reduce((t, q) => t + (q.mins || 15), 0) +
            " min, in " +
            stgOf(M.key).quests.length +
            (stgOf(M.key).quests.length === 1 ? " step" : " steps")
      : M.time === null,
    M.time
  );
  chk(
    "a move with no steps has no time",
    (() => {
      const lv = cbTopMoves(c)
        .concat(cbMoves(c).shown)
        .find(r => r.src !== "stg");
      return !lv || lv.mins == null || lv.mins === undefined;
    })()
  );
  chk(
    "one button only: Start my first move (primary), and a small Back; the three old buttons are on the reveal",
    /class="primary wide go cbresgo cbnext" data-a="cbfirst">Start my first move</.test(h) &&
      (h.match(/class="primary/g) || []).length === 1 &&
      /class="ghost slim" data-a="cbgo" data-v="prev"/.test(h) &&
      !/data-a="cbsave"|data-a="cbshare"|data-a="cbaddstep"/.test(h)
  );
  /* the tap lands on Home: the first move is the top card, and its button puts the steps on Next Steps */
  X("cbfirst");
  const hm = app();
  chk(
    "Start my first move lands on Home, with that move as the one next-step card, its why and about how long",
    !SH &&
      tab === "home" &&
      C().x.cb.first === "cb" &&
      fid(hm, "cb:homefirstname").includes(esc(M.name)) &&
      fid(hm, "cb:homefirstwhy").includes(esc(M.why)) &&
      (M.time === null || hm.includes(esc(M.time))) &&
      !/data-fid="rs:win"/.test(hm)
  );
  X("cbfirstgo");
  if (M.canAdd)
    chk(
      "Start this move puts its steps on Next Steps, opens the move, and Home goes back to Your next win",
      stgAdded(C(), stgOf(M.key)) &&
        cbFirstMove(C()).added &&
        !C().x.cb.first &&
        !/data-fid="cb:homefirst"/.test(app()) &&
        /data-fid="rs:win"/.test(app())
    );
  else chk("a move with no steps of its own opens its card", !C().x.cb.first && !/data-fid="cb:homefirst"/.test(app()));
  closeSheet();
  X("cb");
  X("cbgo", "end");
  chk("the last screen has no junk", junk(ov()) === "", junk(ov()));
  chk(
    "with the want Get out of debt and a move about interest, the why names it",
    (() => {
      const f = cbTopMoves(c).find(r => r.lever === "interest");
      return !f || wnMatch(c, [f.lever, "fi"]).l === "Get out of debt";
    })()
  );

  G = clone(G0);
  W = null;
  SH = null;
}
