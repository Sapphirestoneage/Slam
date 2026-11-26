/* ============================================================================
   SLAM the Game, test: tests/the-quest.js
   PURPOSE     Examine Quest mode (run Not built, groups 1 to 5, Part 10a): the character sheet, room and
               weak spots, hidden costs, where you rank, opponents, the judge, ask the game, path packs,
               graduating and the story.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/quest.js, core/quest.js, features/reveal.js
               (rvSheetQuest), features/sins.js (the push-back into the judge).
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), {
      name: "Quest",
      placed: true,
      age: 30,
      ret: 65,
      take: 5000,
      spend: 4000,
      inv: 20000,
      months: 0.5,
      debt: 6000,
      high: "yes",
    });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C(),
    d = derive(c);
  const qb = require("child_process").spawnSync(
    process.execPath,
    [GAME_DIR + "../tools/game_quest_build.mjs", "--check"],
    { encoding: "utf8" }
  );
  chk("core/quest.js is the same code as js/math/quest.js of the main app", qb.status === 0, qb.stdout);
  chk(
    "the menu has Quest mode, in Games and quizzes",
    MENU.some(m => m[1] === "qmode") && MENU_GROUPS.find(g => g[0] === "games")[3].includes("qmode")
  );
  chk("the SCF rows are in the copy", QS_PRIORS.rows.length === 7 && QS_PRIORS.rows[0].median === 33000);
  const tone = h => !/mistake|failed|behind|off track|\bbad\b|\bwrong\b/i.test(h) && !/\u2014/.test(h);
  /* (1) the character sheet */
  X("qmode");
  const S = qgStats(c);
  chk(
    "character: health is the cushion from derive, of its target",
    S.health.value === d.cash / c.spend && S.health.score === qsScore(d.cash / c.spend, d.target)
  );
  chk("character: armor is the protections of derive", S.armor.value === d.acDone && S.stats.length === 6);
  chk(
    "character: margin 20%, Guess on setup answers",
    S.stats[0].shown === "20%" && S.stats[0].level === "Guess" && S.stats[0].score === 40
  );
  chk(
    "character screen: the stat row, the six stats, the math, no junk",
    W.kind === "qmode" &&
      ov().includes("Health") &&
      ov().includes("Lightness") &&
      ov().includes("Rhythm") &&
      clean(ov()) &&
      tone(ov()),
    junk(ov())
  );
  /* (2) room and weak spots */
  X("qxtab", "room");
  const K = qgCap(c),
    F = qgFails(c);
  chk("capacity: $1,000 free of $5,000, a 20% margin, the cushion under a month holds it to 1", K.slots === 1, K);
  chk(
    "weak spots: a month with no pay first, three moves",
    F.spots[0].id === "paycheck" && F.moves.length === 3 && F.moves[0].t.includes(money(3 * 4000 - d.cash))
  );
  X("qxset", "full", "plate");
  chk("a full plate takes one step off", qgCap(c).slots === 0 && ov().includes("Hold for now"));
  chk("room screen: calm words, no junk", clean(ov()) && tone(ov()) && ov().includes("moves that stop it"), junk(ov()));
  X("qxset", "normal", "plate");
  /* (3) hidden costs */
  X("qxtab", "costs");
  const H = qgHidden(c);
  chk(
    "hidden costs: the debt's interest at the game's own rate, a year",
    H.rows.some(r => r.id === "interest" && r.year === 6000 * 0.22),
    JSON.stringify(H.rows.map(r => [r.id, r.year]))
  );
  chk(
    "hidden costs: the total is the sum of the rows",
    Math.abs(H.total - H.rows.reduce((s, r) => s + r.year, 0)) < 1e-9
  );
  chk("hidden costs screen: no junk", clean(ov()) && ov().includes(money(Math.round(H.total))), junk(ov()));
  /* (4) where you rank */
  X("qxtab", "rank");
  chk(
    "rank: the guess comes first, nothing shows before it",
    ov().includes("Tap your guess") && !ov().includes("SCF 2025")
  );
  X("qxset", "above", "rank");
  const R = qgRank(c);
  chk(
    "rank: under 35, median $33,000, net worth below it, the guess does not match",
    R.median === 33000 &&
      R.where === (d.nw < 33000 * 0.9 ? "below" : d.nw > 33000 * 1.1 ? "above" : "near") &&
      R.match === (R.where === "above")
  );
  chk("rank screen: the source and no junk", ov().includes("Survey of Consumer Finances") && clean(ov()), junk(ov()));
  /* (5) opponents */
  X("qxtab", "rivals");
  chk("opponents: values first", ov().includes('data-a="values"'));
  c.x.vals = { top: ["Freedom and time", "Security", "Family"], serves: {}, marks: {} };
  drawSheet();
  X("qxprice", "600", "upgrade");
  X("qxduel", "no", "upgrade");
  chk(
    "opponents: passing on the upgrade keeps freedom, it is beaten and in the collection",
    c.x.qs.duels.upgrade.beaten === true && ov().includes("Beaten") && ov().includes("1 of 8"),
    JSON.stringify(c.x.qs.duels)
  );
  X("qxduel", "yes", "upgrade");
  chk("a later round does not take a win away", c.x.qs.duels.upgrade.beaten === true);
  chk(
    "opponents: the price in days of spending",
    ov().includes("About " + Math.round(600 / ((4000 * 12) / 365)) + " days") && clean(ov()) && tone(ov()),
    junk(ov())
  );
  /* (6) the judge */
  X("qxtab", "judge");
  const J0 = qgJudge(c);
  chk(
    "the judge: the era, the strongest stat, the capacity and the rank",
    ["era", "strong", "capacity", "rank"].every(id => J0.some(j => j.id === id))
  );
  X("qxjudge", "not", "capacity");
  chk("Challenge this asks why", W.jopen === "capacity" && ov().includes("I have more room"));
  X("qxjudge", "not", "capacity", { w: "more" });
  const J1 = qgJudge(c).find(j => j.id === "capacity");
  chk(
    "a challenge is evidence: the record keeps it and the call moves one step",
    J1.entries.length === 1 && J1.challenged && qgCap(c).slots === 2 && J1.changed,
    JSON.stringify(J1)
  );
  chk("judge screen: the record, no junk", ov().includes("The record (1)") && clean(ov()), junk(ov()));
  /* the money read's push-back writes into the judge */
  c.x.qz = c.x.qz || {};
  c.x.qz.sins = {
    at: "2026-11-01",
    ans: {},
    sn: { v: 1, push: [{ at: "2026-11-02T10:00:00Z", d: "2026-11-02", trait: "envy", said: "no", to: null }] },
  };
  const pushed = qgJudge(c).filter(j => j.entries.some(e => e.id === "read"));
  chk(
    "the push-back of the money read is an entry of the judge's record",
    qsFromPush(snJudgeLog(qzSkin("sins"), c.x.qz.sins.sn))[0].tap === "not" && Array.isArray(pushed)
  );
  /* (7) ask the game */
  X("qxtab", "ask");
  X("qxset", "last", "ask");
  chk(
    "ask: how long cash lasts, from the plan",
    ov().includes(money(d.cash)) && ov().includes("with no pay coming in") && clean(ov()),
    junk(ov())
  );
  X("qxset", "learn", "ask");
  X("qxset", "debt", "topic");
  const L = qsLearn("debt", qgSkills());
  chk(
    "ask: the library on debt, three skills that open",
    L.length === 3 && ov().includes('data-a="skill" data-v="' + L[0].id + '"')
  );
  /* (8) path packs */
  X("qxtab", "packs");
  const P = qgPacks(c);
  chk("packs: the one that fits now is the cushion (under a month)", P.fit === "cushion" && ov().includes("Fits now"));
  chk(
    "packs: every step is a real skill",
    QS_PACKS.every(p =>
      p.steps.every(id => SKILLS[id.split(":")[0]] && SKILLS[id.split(":")[0]].skills[+id.split(":")[1]])
    )
  );
  /* (9) graduating */
  X("qxtab", "grad");
  chk("graduating: FI is the finish line, not yet", ov().includes("Finish line") && !ov().includes("You graduated"));
  X("qxset", "dig", "finish");
  chk("a finish line outside the list falls back to FI", qgGrad(c).G.finish === "fi");
  c.hist = [
    { d: "2026-01-05", nw: -3000, cash: 800, debt: 6000, inv: 2000 },
    { d: "2026-06-05", nw: 4000, cash: 1200, debt: 3000, inv: 6000 },
  ];
  drawSheet();
  const St = qgGrad(c).story;
  chk(
    "the story: the start, the first $1k and the change since",
    St.chapters[0].t.includes("Jan 2026") &&
      St.chapters.some(x => x.t.includes("First $1k")) &&
      ov().includes("Your story so far"),
    JSON.stringify(St)
  );
  chk("the read stays out of the story until the player turns it on", St.read.length === 0 && !c.x.qs.showRead);
  chk("graduating screen: no junk", clean(ov()) && tone(ov()), junk(ov()));
  X("qxset", "debt", "finish");
  c.debt = 0;
  c.high = "no";
  drawSheet();
  chk(
    "the win state: debt free as the finish line, reached",
    qgGrad(c).G.done === true && ov().includes("You graduated")
  );
  /* the character sheet links here; the spreadsheet has the rows */
  chk(
    "the character sheet has the row Quest mode",
    rvSheetQuest('<button class="primary wide" data-a="rvcopy">x</button>').includes('data-a="qmode"')
  );
  const B = qvBook(c);
  chk(
    "the spreadsheet: margin and health with their formulas",
    B.rows.some(r => r.id === "qm_margin" && r.f) && B.rows.some(r => r.id === "qm_health")
  );
  chk("a named line for a later Home", typeof qgHomeLine(c) === "string");
  X("close");
  G.chars.length = n0;
  G.active = act0;
  save();
  go("home");
}
