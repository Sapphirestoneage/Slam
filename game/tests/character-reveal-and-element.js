/* ============================================================================
   SLAM the Game, test: tests/character-reveal-and-element.js
   PURPOSE     Examine the character reveal after setup: strengths and weak spots as literal numbers,
               the money element with its strong and weak sides, "Does this feel accurate?", and
               "Which do you want to improve most?".
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/element.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Elle",
      led: true,
      placed: true,
      age: 30,
      take: 4000,
      spend: 3000,
      inv: 18000,
      debt: 8000,
      incs: [R0({ k: "A main job", amt: 4000 })],
      spends: [R0({ k: "Home", amt: 1500 }), R0({ k: "Food", amt: 1500 })],
      cashes: [R0({ k: "Checking", amt: 6000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 18000 })],
      debts: [R0({ k: "Credit card balance", amt: 8000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    d = derive(c),
    S = elStats(c, d),
    by = id => S.find(x => x.id === id);
  /* by hand: cash 6,000 / spend 3,000 = 2 months. 4,000 - 3,000 = 1,000 left. 8,000 / 4,000 = 2 months of pay owed.
     18,000 / (3,000 * 12) = 0.5 years invested. */
  chk("months of cushion: cash / spending a month", Math.abs(by("cushion").v - 2) < 1e-9, by("cushion").v);
  chk("left each month: pay less spending", by("left").v === 1000 && by("left").txt.includes("$1,000"));
  chk("months of pay owed: debt / pay", Math.abs(by("owed").v - 2) < 1e-9);
  chk("years of spending invested", Math.abs(by("invested").v - 0.5) < 1e-9);
  chk("the stats are literal numbers in words", by("cushion").txt === "2 months of cushion");
  const sd = elSides(c, d);
  chk(
    "two strengths and two with the most room, with no overlap",
    sd.strong.length === 2 && sd.weak.length === 2 && !sd.strong.some(x => sd.weak.includes(x))
  );
  chk("with no quiz and no pick, the element is a Guess", elOf(c).st === "Guess" && !!EL_SIDES[elOf(c).el]);
  chk(
    "each of the five elements has strong and weak sides",
    Object.keys(ELEMENTS).every(e => EL_SIDES[e] && EL_SIDES[e].strong.length && EL_SIDES[e].weak.length)
  );
  X("elem");
  chk(
    "screen 1: strengths and the numbers with the most room",
    ov().includes("where you are strong") &&
      ov().includes("most room") &&
      ov().includes("Show the math") &&
      clean(ov()),
    junk(ov())
  );
  X("elnext");
  chk(
    "screen 2: the element, strong against and weak to",
    ov().includes("Your money element") && ov().includes("Strong against") && ov().includes("Weak to") && clean(ov()),
    junk(ov())
  );
  X("elpick", "Air");
  chk("a pick replaces the guess", elOf(c).el === "Air" && elOf(c).st === "Close");
  X("elnext");
  chk("screen 3: Does this feel accurate?", ov().includes("Does this feel accurate?") && ov().includes("disabled"));
  X("elacc", "Not really");
  chk(
    "Not really offers to make the numbers real",
    ov().includes("Make my numbers real") && c.x.el.acc === "Not really"
  );
  X("elacc", "Mostly");
  chk("screen 4: Which do you want to improve most?", ov().includes("Which do you want to improve most?") && W.i === 3);
  X("elfocus", "cushion");
  chk(
    "the focus is kept, and the sheet offers to work on it",
    c.x.el.focus === "cushion" && ov().includes("Work on cushion") && ov().includes("your focus") && clean(ov()),
    junk(ov())
  );
  X("close");
  X("elem");
  chk("opening again goes to the summary", W.i === 4);
  X("reveal");
  X("rvagain");
  for (let i = 0; i < 6; i++) X("rvnext");
  chk("the character sheet has the row", ov().includes("Strengths and your element"));
  const g = Object.assign(newChar(), { name: "Gus", led: false });
  chk(
    "before the numbers are real, each stat is a Guess",
    elStats(g, derive(g))
      .filter(x => x.id !== "protect")
      .every(x => x.st === "Guess")
  );
  chk(
    "a new profile opens the reveal in place of the old card",
    finishSetupReveal(g) === true && W.kind === "elem" && ov().includes("1 of 4")
  );
  X("close");
  const B = elBook(c);
  chk(
    "the spreadsheet has the section",
    B.rows.some(r => r.id === "el_cushion" && r.f === "={el_cash}/{el_spend}")
  );
  chk(
    "built list",
    btRows().some(r => r.n.startsWith("Your money type as an element") && r.st === "b") && btCount(btRows()).x === 0
  );
  G.chars.length = n0;
  G.active = 0;
  G.demo = true;
  save();
}
