/* ============================================================================
   SLAM the Game, test: tests/game-feel.js
   PURPOSE     Examine Game feel (run Finish everything partly built, Part 20): the copy of the engine,
               the menu rows, Start at the finish line on the same function as the web app (each step,
               a Guess until you tap, a new way to say it clears the need), the bottleneck finder (the
               eight kinds, your numbers and your taps, Is this really it?, the judge's record), the
               rival race (past you from saved check-ins, a typical path on the country's saving rate),
               the made-up stories labeled on screen, the strip of what an answer moved, the before and
               after bars of a receipt, the rows of What's built, and calm words.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/feel.js, core/feel.js, features/receipt.js,
               features/quest.js (the judge), screens/ui.js (rivalCard, the People tab, the sheet parts).
   ========================================================================= */
{
  const n0 = G.chars.length,
    a = Object.assign(newChar(), {
      name: "Feel",
      placed: true,
      age: 34,
      ret: 65,
      take: 5000,
      spend: 3800,
      inv: 30000,
      months: 3,
      debt: 0,
    });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const fb = require("child_process").spawnSync(
    process.execPath,
    [GAME_DIR + "../tools/game_feel_build.mjs", "--check"],
    {
      encoding: "utf8",
    }
  );
  chk("core/feel.js is the same code as js/math/feel.js of the main app", fb.status === 0, fb.stdout);
  chk(
    "the menu has Start at the finish line and What's in the way",
    MENU.some(m => m[1] === "fline") && MENU.some(m => m[1] === "bneck")
  );
  const noDash = h => h.indexOf(String.fromCharCode(0x2014)) < 0;
  const calm = h => !/\b(mistake|failed|behind|off track)\b/i.test(h);

  /* ---- Start at the finish line ---- */
  X("fline");
  let h = ov();
  chk("the finish line opens, clean", h.includes("Start at the finish line") && clean(h), junk(h));
  let E = gflEnd(C());
  chk("until you tap, the need is what you spend today, as a Guess", E.need.v === 3800 && E.st.need === "Guess");
  chk("and 15 years, as a Guess", E.yrs.v === 15 && E.st.years === "Guess" && h.includes("guess"));
  X("kitset", "4000", "gfend|need", { t: "n" });
  X("kitset", "20", "gfend|years", { t: "n" });
  E = gflEnd(C());
  const want = gfBackwards({
    need: 4000,
    per: "month",
    years: 20,
    have: 30000,
    takeHome: 5000,
    spending: 3800,
    wr: GF_PRESETS.withdrawalRate,
    r: GF_PRESETS.realReturn,
  });
  h = ov();
  chk("a tap is Close, and all five steps are answered", E.st.need === "Close" && E.B.step === 5);
  chk(
    "the same function and the reference presets",
    Math.abs(E.B.needed - want.needed) < 1e-9 && want.total === 1200000
  );
  chk("the sheet shows the month to put in", h.includes(money(want.needed) + " a month"), money(want.needed));
  chk(
    "a gap shows two ways to close it and the bonus hunt",
    !want.onTrack && h.includes("Close it by spending") && h.includes('data-a="hunt"')
  );
  chk("the math is collapsed, calm, no em dash", h.includes("mathbox") || h.includes("<details"), "");
  chk("calm words on the finish line", calm(h) && noDash(h));
  X("gfper", "year", "gfend|per", { t: "s" });
  E = gflEnd(C());
  chk("a new way to say it clears the need", E.per === "year" && !E.need.given && E.B.step === 1);
  chk("a year: the need asks a year", ov().includes("What you need a year") && clean(ov()), junk(ov()));
  X("gfper", "month", "gfend|per", { t: "s" });
  X("kitset", "4000", "gfend|need", { t: "n" });
  closeSheet();

  /* ---- the bottleneck finder ---- */
  X("bneck");
  h = ov();
  const R0 = bnRead(C());
  chk(
    "the eight kinds, each with its check",
    GF_KINDS.every(k => h.includes(esc(GF_CHECKS[k]))) && GF_KINDS.length === 8
  );
  chk(
    "the eight kinds are the same as the roadblock of a goal",
    JSON.stringify(GF_KINDS) === JSON.stringify(Object.keys(BLOCKS))
  );
  chk("your numbers: less left over than the finish line needs makes Money the call", R0.top === "money", R0);
  chk("Money as the call offers the bonus hunt", h.includes('data-a="hunt"') && clean(h), junk(h));
  X("bntap", "yes", "fear");
  X("bntap", "yes", "people");
  let R1 = bnRead(C());
  chk(
    "your taps rank too: Fear Yes ties Money and the list order breaks the tie",
    R1.top === "money" && R1.asked === 2
  );
  X("bntap", "no", "money");
  R1 = bnRead(C());
  const mo = R1.ranked.find(x => x.id === "money");
  chk(
    "a No takes a point away from your numbers",
    mo.score === GF_RULES.bn.short - 1 && R1.top !== "money",
    R1.ranked.slice(0, 3)
  );
  const top = R1.top;
  chk(
    "the ranking is the one function on your numbers and taps",
    top === gfBottleneck({ facts: bnFacts(C()), taps: gflX(C()).taps }).top
  );
  X("bntap", "no", "money");
  chk("the same tap again clears it", gflX(C()).taps.money === undefined);
  X("bntap", "no", "money");
  chk(
    "the call is on the judge's list",
    qgCalls(C()).some(x => x.id === "bottleneck" && x.said === BLOCKS[top][0])
  );
  h = ov();
  chk(
    "Is this really it? with the test of the call",
    h.includes("Is this really it?") && h.includes(esc(GF_REAL[top]))
  );
  X("bnreal", "yes");
  let log = qgSt(C()).log.filter(x => x.id === "bottleneck");
  chk("Yes is kept by the judge as fits", log.length === 1 && log[0].tap === "fits" && log[0].said === BLOCKS[top][0]);
  X("bnreal", "no");
  h = ov();
  chk(
    "No opens the other seven",
    GF_KINDS.filter(k => k !== top).every(k => h.includes('data-a="bnpick" data-v="' + k + '"'))
  );
  X("bnpick", "knowledge");
  R1 = bnRead(C());
  log = qgSt(C()).log.filter(x => x.id === "bottleneck");
  chk("your pick wins over the ranking", R1.top === "knowledge" && R1.picked);
  chk(
    "the judge keeps the challenge, with why",
    log.length === 2 && log[1].tap === "not" && log[1].why === "You said Knowledge fits better than " + BLOCKS[top][0],
    log
  );
  chk("the judge's call follows your pick", qgJudge(C()).find(x => x.id === "bottleneck").said === "Knowledge");
  h = ov();
  chk(
    "the made-up story of your bottleneck is labeled",
    h.includes("Made-up story") && h.includes(esc(GF_STORY_LABEL))
  );
  chk("its first move", h.includes(esc(BLOCK_STEP.knowledge)));
  chk("the finder is clean and calm", clean(h) && calm(h) && noDash(h), junk(h));
  X("bnauto");
  chk("Let the game decide again", bnRead(C()).picked === false);
  closeSheet();

  /* ---- the rival race ---- */
  chk("a typical path: the country's saving rate, not a person", RIVALS.typical && RIVALS.typical.r === 0.038);
  C().hist = [];
  let rp = rivalPastPart(C(), derive(C()));
  chk("past you joins once the check-ins cover two stretches", rp.includes("Past you joins the race in 180 days"), rp);
  const t = todayISO(),
    nw = derive(C()).nw;
  C().hist = [
    { d: addDays(t, -200), nw: nw - 3000 },
    { d: addDays(t, -100), nw: nw - 1000 },
  ];
  const P = gfPastSelf(C().hist, t, nw);
  chk(
    "the pace now and before, worked by hand",
    P.ready && Math.abs(P.now.pace - (1000 / 100) * 30.4) < 1e-9 && Math.abs(P.then.pace - (2000 / 100) * 30.4) < 1e-9,
    P
  );
  rp = rivalPastPart(C(), derive(C()));
  chk(
    "a slower stretch says Recalculating",
    P.lead === "then" && rp.includes("Recalculating") && calm(rp) && clean(rp),
    rp
  );
  go("me");
  chk(
    "Me shows past you and the typical path",
    app().includes("Past you") && app().includes("A typical path") && clean(app()),
    junk(app())
  );
  chk("Rivals left the Coming soon list", !SOON.some(s => s[0] === "Rivals"));

  /* ---- made-up stories in What if ---- */
  X("moves");
  X("mvtab", "mentors");
  h = ov();
  chk(
    "What if, People: the made-up stories come first, labeled",
    h.indexOf("Made-up stories") >= 0 && h.indexOf("Made-up stories") < h.indexOf("Real people")
  );
  chk(
    "eight stories, one for each kind",
    GF_STORIES.length === 8 && GF_KINDS.every(k => GF_STORIES.some(s => s.kind === k))
  );
  chk(
    "stories write no money by hand",
    GF_STORIES.every(s => !/\$|\d/.test(s.story + s.title + s.move))
  );
  closeSheet();

  /* ---- every answer shows what it unlocked ---- */
  X("fline");
  chk("no strip before an answer moves a number", !ov().includes("gf:rip"));
  C().inv += 50000;
  drawSheet();
  h = ov();
  chk(
    "an answer that moved net worth puts the strip at the top",
    h.includes("What this answer moved") && h.indexOf("gf:rip") < h.indexOf("Start at the finish line")
  );
  chk(
    "the strip is the one receipt: lines with before and after bars",
    h.includes("rcp:nw") && h.includes("rcpbar") && h.includes("Before " + money(derive(C()).nw - 50000))
  );
  chk("and Replay what changed", h.includes('data-a="rcpreplay"') && clean(h), junk(h));
  X("rcpreplay");
  chk("Replay draws it again", ov().includes("rcpbar"));
  closeSheet();
  const L = rcpDiff(rcpNums(Object.assign({}, C(), { inv: C().inv - 10000 })), rcpNums(C()), false);
  const ln = L.find(x => x.k === "nw");
  chk("the bar moves from before to after", ln && ln.w1 === 100 && ln.w0 < 100 && ln.w0 > 0, ln);

  /* ---- What's built ---- */
  [
    "A rival to race",
    "People who did it",
    "Motion that shows what changed",
    "Every answer shows what it unlocked",
    "Start at the finish line: design the end, work backwards",
    "Bottleneck finder: money, time, energy, skill, knowledge, people, fear or rules, each with Is this really it?",
  ].forEach(n => {
    const r = WB.find(x => x[1] === n);
    chk("What's built: " + n + " is built and its probe passes", r && r[2] === "b" && r[3](), r && r[2]);
  });

  G.chars.splice(n0, 1);
  G.active = 0;
  save();
}
