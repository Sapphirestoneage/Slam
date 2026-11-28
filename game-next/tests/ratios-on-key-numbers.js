/* ============================================================================
   SLAM the Game, test: tests/ratios-on-key-numbers.js
   PURPOSE     Examine Ratios on Key numbers (run Not built, groups 1 to 5, Part 9). A made-up player
               with cash, a card, a car loan, two incomes and a retirement account: the copy of
               core/ratios.js is current; each ratio the game can work out, from the numbers it
               already has (cash, the debts with their rates and payments, the incomes, fixed and
               variable, net worth); a missing input says what it needs and never shows a 0; the
               levels from the answers; the side income share of Key numbers is the same function;
               the confidence taps and the kind read; the card on Key numbers (groups closed, Show
               the math, the rules of thumb with their source); the spreadsheet rows; the built list
               row; no undefined, NaN or null on the sheet.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/ratios.js, features/ratios.js, core/metrics.js,
               features/book.js.
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto"),
    sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
  const src = fs.readFileSync(path.join(GAME_DIR, "..", "js", "math", "ratios.js"), "utf8"),
    copy = fs.readFileSync(path.join(GAME_DIR, "core", "ratios.js"), "utf8");
  chk(
    "the math of the game is a current copy of js/math/ratios.js (node tools/game_ratios_build.mjs)",
    copy.includes("SOURCE-HASH  " + sha(src))
  );

  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true, cf: 3 }, r);
  const c = Object.assign(newChar(), {
    name: "Ari",
    led: true,
    placed: true,
    age: 35,
    ret: 65,
    incs: [R0({ k: "A main job", amt: 4000 }), R0({ k: "Side gig", amt: 1000 })],
    spends: [
      R0({ k: "Home", amt: 1500 }),
      R0({ k: "Getting around", amt: 300 }),
      R0({ k: "Bills and subscriptions", amt: 200 }),
      R0({ k: "Food", amt: 600 }),
      R0({ k: "Fun and everything else", amt: 400 }),
    ],
    cashes: [R0({ k: "Checking", amt: 6000 })],
    invs: [R0({ k: "Retirement plan at work", amt: 30000 }), R0({ k: "Brokerage", amt: 10000 })],
    debts: [
      R0({ k: "Credit card", amt: 2000, rate: 24, pay: 200 }),
      R0({ k: "Car loan", amt: 8000, rate: 6, pay: 300 }),
    ],
    debt: 10000,
    take: 5000,
    spend: 3000,
    inv: 40000,
  });
  G.chars.push(c);
  G.active = G.chars.length - 1;
  syncAll(c);
  G.demo = false;
  G.tourSeen = true;
  save();
  const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
  let A = raGameRead(c);
  const d = derive(c),
    O = A.out;
  chk("current ratio: cash / the card", near(O.current.value, d.cash / 2000), O.current);
  chk("solvency: net worth / cash and investments", near(O.solvency.value, d.nw / (d.cash + 40000)), O.solvency);
  chk("revolving vs installment: 2000 / 10000 = 20%", near(O.revolving.value, 0.2), O.revolving);
  chk("credit mix: 2 of 3 kinds (revolving, installment)", O.mix.value === 2 && O.mix.kinds.mortgage === false);
  const intr = (2000 * 0.24) / 12 + (8000 * 0.06) / 12;
  chk(
    "interest to principal: this month's interest / what pays the balance down",
    near(O.intprin.value, intr / (500 - intr)),
    O.intprin
  );
  const sp = spendParts(c);
  chk(
    "fixed vs variable: from spendParts, 2000 / 3000",
    sp.fixed === 2000 && near(O.fixedvar.value, 2000 / 3000),
    O.fixedvar
  );
  chk("discretionary income: take-home - fixed = 3000", O.discretionary.value === 3000);
  chk("side income share: 1000 / 5000 = 20%", near(O.side.value, 0.2));
  const side = knMetrics(c, d).find(m => m.id === "side");
  chk("Key numbers' side income is the same function (one number)", side && near(side.num, O.side.value));
  chk("investment to net worth: 40000 / net worth", near(O.investnw.value, 40000 / d.nw));
  chk("tax efficiency: the plan at work, 30000 / 40000 = 75%", near(O.shelter.value, 0.75));
  chk("human capital: the future pay over cash and investments, above 1", O.human.value > 1 && O.human.future > 0);
  chk(
    "longevity cover: years covered / years to plan for",
    near(O.longevity.value, 40000 / d.fiSpend / (90 - 65)),
    O.longevity
  );
  chk(
    "every answer exact: the level is Exact",
    O.current.level === "Exact" && O.solvency.level === "Exact",
    O.current.level
  );
  chk(
    "the game leaves out what it has no inputs for (home, health) and says why",
    !O.ltv && !O.health && A.later.some(x => x[0] === "Loan to value (LTV)")
  );
  chk(
    "tax drag waits, with what it needs",
    A.later.some(x => x[0] === "Tax drag")
  );

  /* missing inputs: a need, never a 0 */
  chk(
    "no year-ago pay: real wage growth needs how much your pay grew",
    O.realwage.value === null && O.realwage.needs.length === 1
  );
  chk(
    "no windfall typed: the windfall line needs an amount",
    O.windfall.value === null && O.windfall.needs.length === 1
  );
  chk(
    "no money log: spending volatility needs three months",
    O.volatility.value === null && /3 months/.test(O.volatility.needs[0])
  );
  chk("no match answered: total comp to base needs it", O.totalcomp.value === null && O.totalcomp.needs.length === 1);

  /* a guess lowers the level */
  c.cashes[0].s = false;
  A = raGameRead(c);
  chk("a guessed cash balance makes the current ratio a Guess", A.out.current.level === "Guess");
  c.cashes[0].s = true;

  /* confidence */
  chk("no rating yet: it needs one tap", A.out.confidence.value === null);
  X("keynums");
  X("raconf", "4");
  A = raGameRead(c);
  chk("the tap is kept", c.x.conf && c.x.conf.v === 4 && A.out.confidence.parts[0][1] === 4);
  chk("the read is one of the kind sentences", RA_CONF_WORDS[A.out.confidence.read] != null, A.out.confidence);

  /* the card on Key numbers */
  const h = ov();
  chk("Key numbers has the card Ratios", /Ratios/.test(h) && /class="ragroup"/.test(h));
  chk("the groups are closed", !/<details class="ragroup" open/.test(h));
  chk("each line has Show the math", (h.match(/Show the math/g) || []).length >= 20);
  chk("a rule of thumb names its source and date", /myFICO/.test(h) && /2026-11-26/.test(h));
  chk("a missing input says Needs", /Needs how much your pay grew/.test(h));
  chk(
    "a Needs line has a button to fill it in",
    /data-a="windfall"/.test(h) && /data-a="knask" data-v="matchAmt"/.test(h)
  );
  chk("the confidence taps are on the card", /data-a="raconf"/.test(h));
  chk("no verdict or blame words", !/\b(mistake|failed|behind|off track|bad|good job|poor|warning)\b/i.test(h));
  chk("the sheet is clean", clean(h), junk(h));
  X("raconf", "4");
  chk("a second tap clears the rating", !c.x.conf);

  /* the spreadsheet */
  const B = raBook(c);
  chk(
    "the spreadsheet has the ratios with formulas",
    B.rows.some(r => r.id === "ra_current" && r.f === "={ra_current_a}/{ra_current_b}")
  );
  chk("raBook is a part of the book", BOOK_PARTS.includes(raBook));
  const row = WB.find(r => /Ratios on Key numbers/.test(r[1]));
  chk("the built list row is built and its probe passes", row && row[2] === "b" && row[3]());

  G.chars.splice(n0);
  G.active = 0;
  W = null;
  save();
}
