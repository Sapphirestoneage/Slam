/* ============================================================================
   SLAM the Game, test: tests/people-like-you.js
   PURPOSE     Examine You and people like you (run Finish everything partly built, Part 9): the copy of
               the engine, the menu row, net worth at your age from derive, the savings rate next to the
               country's, the pay tap next to the middle household's, the next milestone from the
               journey, the people like you lines with their sources, the spreadsheet rows, and Quest
               mode's rank on the same function.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/peers.js, core/peers.js, core/quest.js (qsRank),
               features/quest.js (the link from Where you rank).
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), {
      name: "Peers",
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
  const pb = require("child_process").spawnSync(
    process.execPath,
    [GAME_DIR + "../tools/game_peers_build.mjs", "--check"],
    { encoding: "utf8" }
  );
  chk("core/peers.js is the same code as js/math/peers.js of the main app", pb.status === 0, pb.stdout);
  chk(
    "the menu has You and people like you, in My money",
    MENU.some(m => m[1] === "peers") && MENU_GROUPS.find(g => g[0] === "money")[3].includes("peers")
  );
  chk(
    "the rows are in the copy, with their sources",
    PE_PRIORS.rows.some(r => r.field === "netWorth" && r.median === 33000) &&
      PE_PRIORS.rows.some(r => r.field === "savingRate" && r.share === 0.038) &&
      PE_PRIORS.rows.some(r => r.field === "income" && r.median === 87460) &&
      !!PE_PRIORS.sources.bea202609.released
  );
  X("peers");
  const N = peNetWorth({ nw: d.nw, age: c.age, rows: PE_PRIORS.rows });
  chk(
    "net worth: under 35, the middle $33,000, from derive",
    W.kind === "peers" && N.ready && N.median === 33000 && N.where === peWhere(d.nw, 33000)
  );
  chk(
    "the screen: the stat row, the four cards, the sources, no junk",
    ov().includes("Net worth at your age") &&
      ov().includes("Savings rate") &&
      ov().includes("Household pay") &&
      ov().includes("People like you") &&
      ov().includes("Survey of Consumer Finances") &&
      ov().includes("Bureau of Economic Analysis") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "savings rate: 20% of take-home, next to the country's 3.8%, and not yet by age",
    ov().includes("You keep 20%") && ov().includes("3.8%") && ov().includes("not yet")
  );
  chk(
    "pay: the middle household before a tap",
    ov().includes(money(87460)) && peIncome({ data: PE_PRIORS }).ready === false
  );
  X("kitset", "100000", "pe|gross", { t: "n" });
  const I = peIncome({ gross: pgNums(C()).gross, data: PE_PRIORS });
  chk(
    "pay: a tap places it (above the middle)",
    I.ready && I.where === "above" && ov().includes("above the middle"),
    I
  );
  const J = tpgJourney(c).J,
    Nx = peNext(J);
  chk(
    "next milestone: the journey's next stage",
    Nx.ready && J.stages[J.here].name === Nx.name && ov().includes(Nx.name)
  );
  const P = pePatterns({ age: c.age, data: PE_PRIORS });
  chk(
    "people like you: the age group's SHED shares, the SCF middles, each with a source",
    P.some(p => p.id === "cover400" && p.byAge && p.text.includes("57%")) && P.every(p => p.source && p.source.name)
  );
  const tone = h => !/mistake|failed|behind|off track|\bbad\b|\bwrong\b|\u2014/i.test(h);
  chk("calm words: no verdict, no em dash", tone(ov()));
  chk(
    "Quest mode's rank is the same function",
    qsRank({ nw: d.nw, age: c.age, rows: QS_PRIORS.rows }).median === N.median &&
      qsRank({ nw: d.nw, age: c.age, rows: QS_PRIORS.rows }).where === N.where
  );
  chk(
    "who sees this: off by default, with the switch",
    ov().includes("Let my coach see this") && !(C().x.pe && C().x.pe.coach)
  );
  X("pecoach", "1");
  chk("who sees this: the switch turns it on for a coach", C().x.pe.coach === true && pgShown(C()));
  X("pecoach", "0");
  X("qmode", "rank");
  X("qxset", "below", "rank");
  chk("Where you rank links here", ov().includes('data-a="peers"'));
  const B = peBook(C());
  chk(
    "the spreadsheet: net worth and pay of the middle, with formulas",
    B.rows.some(r => r.id === "pe_ratio" && r.f) && B.rows.some(r => r.id === "pe_incratio" && r.f)
  );
  X("close");
  G.chars.length = n0;
  G.active = act0;
  save();
  go("home");
}
