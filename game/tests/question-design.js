/* ============================================================================
   SLAM the Game, test: tests/question-design.js
   PURPOSE     Examine the questions inside the setup rounds (UX pass, phase 4): count first, then one at a
               time. The cards become one debt row each and a card paid in full is a card, not a debt; the
               rate chips; the ranges of each kind; "I know it" opens the box in the same spot; income each
               time it lands becomes money a month; the counts of roommates and kids stay on the profile;
               the lines of a spending group against the stock number; IRA and Roth IRA as two rows; an
               old saved game with "IRA or Roth IRA" loads as before.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/amounts.js, screens/smart.js, features/spiral.js,
               core/engine.js (applyTypical, hhSize, typSpend), features/look.js (lkRowRange).
   ========================================================================= */
{
  const G0 = clone(G);
  G.demo = true;
  const N = () => {
    if (W && W.sm) W.sm.adv = 0;
    X("wnext");
  };
  const A = (q, v, lab) => X("amset", String(v), undefined, { q, lab: lab || String(v) });
  const R = (q, rk, i) => X("amset", undefined, undefined, { q, rk, i: String(i) });
  const T = (q, n, pct) => {
    X("amknow", undefined, undefined, { q });
    W.o.amIn = String(n);
    X("amuse", undefined, undefined, { q, pct: pct ? "1" : "" });
  };
  const nxt = () => {
    for (let i = 0; i < 3 && W.sp; i++) X(W.sp.at === "reveal" ? "spnext" : "spgo");
  };
  openSetup("new");
  X("agedec", "20s", "ageDec");
  X("setn", "26", "age");
  /* run SLAM-ONBOARD-1: About you (work, home, people, how money feels) comes before the first letter */
  X("set", "Between jobs", "work");
  let h = ov();
  chk(
    "About you asks: What money comes in? with plain names",
    h.includes("What money comes in?") && h.includes(">Allowance or family help<") && h.includes(">Job<")
  );
  X("tog", "A main job", "incKinds");
  X("tog", "Help from family", "incKinds");
  X("smdone", null, "incKinds");
  X("set", "Changes month to month", "steady");
  X("set", "I rent", "homeQ");
  X("tog", "Roommates", "live");
  X("smdone", null, "live");
  chk("roommates: how many", ov().includes("How many roommates?") && ov().includes('data-v="4+"'));
  X("set", "2", "roommateQ");
  X("set", "Single by choice", "rel");
  X("set", "None", "deps");
  X("set", "No one", "share");
  X("smskip", null, "feel0");
  h = ov();
  chk(
    "D starts with the kinds of debt, the credit card balance too",
    W.step === 4 && h.includes('data-v="Credit card balance"'),
    W.step
  );
  X("tog", "Credit card balance", "debtKinds");
  X("tog", "Student loans", "debtKinds");
  N();
  h = ov();
  chk("then it counts the cards", W.step === 9 && h.includes("How many credit cards do you have?"), W.step);
  A("cards.n", 3, "3");
  h = ov();
  chk("then how many carry a balance", h.includes("How many carry a balance month to month?") && h.includes("All 3"));
  A("cards.carry", 2, "2");
  h = ov();
  chk(
    "the card count page moves on by itself to each card on its own screen: Card 1 of 2, the bank first",
    W.step === 10 && h.includes("Card 1 of 2") && h.includes("Which bank is it from?") && h.includes('data-v="Chase"'),
    W.step
  );
  A("card.1.iss", "Chase");
  h = ov();
  chk(
    "about how much is left, with its helper under the chips",
    h.includes("About how much is left to pay back?") &&
      h.indexOf("I know it") < h.indexOf("The whole amount left, not the monthly payment.") &&
      h.includes("$5k to $10k")
  );
  R("card.1.amt", "card", 1);
  R("card.1.amt", "card", 1);
  chk(
    "a second tap on the same chip does nothing (the rate is still next)",
    W.o.am["card.1.amt"].v === 1250 && ov().includes("What's the interest rate (APR)?")
  );
  h = ov();
  chk(
    "the rate chips: 8% or more, less than 8%, 0% promo, I don't know, I know it",
    ["8% or more", "Less than 8%", "0% promo", "I don't know", "I know it"].every(t => h.includes(t))
  );
  A("card.1.rate", "hi", "8% or more");
  chk("Card 2 of 2 comes next", ov().includes("Card 2 of 2"));
  A("card.2.iss", "Citi");
  X("amknow", undefined, undefined, { q: "card.2.amt" });
  h = ov();
  chk(
    "I know it opens the number box right under the chips",
    /I know it<\/button><\/div><div class="amknow/.test(h) && h.includes('id="amIn"')
  );
  W.o.amIn = "3,200";
  X("amuse", undefined, undefined, { q: "card.2.amt" });
  A("card.2.rate", "promo", "0% promo");
  h = ov();
  chk("a 0% promo asks when it ends, by month chips", h.includes("When does the 0% end?") && h.includes("Not sure"));
  const ym = cardAddMonths(todayISO(), 6);
  A("card.2.end", ym, cardMonthName(ym));
  h = ov();
  chk("the handoff between kinds", h.includes("Credit cards done ✓. Next: student loans"), h.slice(0, 300));
  chk(
    "student loans: one combined is fine",
    h.includes("How many student loans do you have?") && h.includes("One combined is fine")
  );
  A("d:studentloans.n", 1, "One combined is fine");
  h = ov();
  chk("student loan ranges are scaled for the kind", h.includes("$25k to $50k") && h.includes("$100k+"));
  R("d:studentloans.1.amt", "stu", 2);
  A("d:studentloans.1.rate", "lo", "Less than 8%");
  chk("D ends on its number when the last debt is in", W.sp && W.sp.at === "reveal" && W.sp.r === 1, W.sp);
  const P = spPreview(W),
    cards = P.c.debts.filter(x => x.k === CARD_K);
  chk("three cards, each its own row", cards.length === 3, cards.length);
  chk(
    "the paid-in-full card is a card with nothing owed",
    cards.filter(x => x.card.full === "Yes" && x.amt === 0).length === 1
  );
  chk(
    "card 1: Chase, $500 to $2k (Close), 8% or more",
    cards[0].card.iss === "Chase" &&
      cards[0].amt === 1250 &&
      cards[0].cf === 2 &&
      cards[0].high === true &&
      dbRate(cards[0]).v >= 15
  );
  chk(
    "card 2: typed $3,200 is Exact, at 0% until the month picked",
    cards[1].amt === 3200 && cards[1].cf === 3 && cards[1].rate === 0 && cards[1].card.promo.ym === ym
  );
  chk(
    "the student loan is one row of $37,500 under 8%",
    P.c.debts.filter(x => x.k === "Student loans").length === 1 &&
      P.c.debts.find(x => x.k === "Student loans").amt === 37500 &&
      dbRate(P.c.debts.find(x => x.k === "Student loans")).v < 8
  );
  chk(
    "the debt total of the round is the rows",
    spNumber("D", P.c, P.d).v === 1250 + 3200 + 37500,
    spNumber("D", P.c, P.d)
  );
  chk("the plan of the debts goes card by card", P.c.debts.filter(x => x.amt > 0).length === 3);
  nxt();
  /* A: accounts */
  chk(
    "A: the kinds page shows IRA and Roth IRA as two rows",
    W.step === 5 && ov().includes('data-a="amira" data-v="Roth IRA"'),
    W.step
  );
  X("tog", "Checking", "accts");
  X("tog", "Savings", "accts");
  X("amira", "Roth IRA");
  N();
  h = ov();
  chk(
    "each account under a breadcrumb",
    W.step === 11 && h.includes("What you own › Cash › Checking") && /<h2 class="amhead">Checking<\/h2>/.test(h),
    W.step
  );
  R("a:checking", "cash", 1);
  R("a:savings", "cash", 0);
  h = ov();
  chk(
    "the Roth IRA has its own screen and the tax line",
    h.includes("What you own › Investments › Roth IRA") && h.includes("Before taxes.")
  );
  chk("the cash total, in plain words", h.includes("💵 <b>Cash: $1,500</b>"));
  chk(
    "accounts you don't have, folded, with Rolled over for a 401(k)",
    /<details class="math amnot">/.test(h) && h.includes('data-n="401(k) or work plan" data-v="Rolled over"')
  );
  X("amhave", "Rolled over", undefined, { n: "401(k) or work plan" });
  R("a:rothira", "inv", 3);
  h = ov();
  chk("then where it went", h.includes("Where did your 401(k) or work plan go?"));
  A("roll:401korworkplan", "Roth IRA");
  chk("A moves on to the cushion", W.step === 7, W.step);
  W.step = 11;
  drawSheet();
  h = ov();
  chk("the rolled-over line shows, greyed", h.includes("401(k) (rolled over to Roth IRA)") && h.includes("amrolled"));
  W.step = 7;
  drawSheet();
  X("set", "No", "can1k");
  X("set", "Less than a month", "cover");
  X("set", "Sometimes", "invest");
  const P2 = spPreview(W);
  chk(
    "the Roth IRA is a row named Roth IRA, with its range $50k to $150k",
    P2.c.invs.length === 1 &&
      P2.c.invs[0].nick === "Roth IRA" &&
      P2.c.invs[0].amt === 100000 &&
      lkRowRange(P2.c.invs[0], "invs")[0] === 50000 &&
      lkRowRange(P2.c.invs[0], "invs")[1] === 150000
  );
  chk("what you have is a range", /about/.test(spNumber("A", P2.c, P2.d).big), spNumber("A", P2.c, P2.d).big);
  nxt();
  /* I: income (the work and the kinds of money were asked in About you) */
  h = ov();
  chk(
    "then each source: how often first",
    W.step === 12 && h.includes("How often does it come in?") && h.includes("Paid by the shift or gig"),
    W.step
  );
  A("i:amainjob:f", "Weekly");
  h = ov();
  chk("the amount ranges follow the rhythm", h.includes("About how much lands a week?") && h.includes("$2,500+"));
  T("i:amainjob:amt", 869);
  h = ov();
  chk(
    "the checklist: Job in, allowance still to come",
    h.includes("<b>Job (1 of 2):</b>") && /Still to come: .*Allowance/.test(h),
    h.slice(0, 900)
  );
  A("i:helpfromfamily:f", "Monthly");
  R("i:helpfromfamily:amt", "mo", 0);
  const P3 = spPreview(W),
    job = P3.c.incs.find(x => x.k === "A main job");
  chk(
    "$869 a week is $3,766 a month, Exact",
    job.amt === 3766 && job.cf === 3 && P3.c.x.incFreq["A main job"] === "Weekly",
    job
  );
  chk("weekly pay is the pay rhythm", P3.c.payFreq === "Weekly");
  chk(
    "amMonthly: every 2 weeks and twice a month",
    amMonthly(1000, "Every 2 weeks") === 2167 && amMonthly(1000, "Twice a month") === 2000
  );
  nxt();
  X("set", "About 15%", "taxQ");
  X("set", "Yes, some", "taxAcctQ");
  nxt();
  /* E: spending (the household was asked in About you) */
  h = ov();
  chk(
    "spending, one group per screen, with its icon and live total",
    W.step === 13 &&
      h.includes("🏠") &&
      h.includes("Home total") &&
      h.includes("Rent or mortgage") &&
      h.includes("Utilities"),
    W.step
  );
  const guess = typSpend(Object.assign({}, W.o, { home: "Renting" }), 0);
  R("s:home:0", "rent", 2);
  h = ov();
  chk(
    "with one line in, the total stays the stock number and the rest is not split up yet",
    guess > 750 && h.includes(money(guess)) && h.includes(money(guess - 750) + " not split up yet"),
    guess
  );
  R("s:home:1", "util", 1);
  chk("the group waits for its button", W.step === 13 && ov().includes("Done with Home"));
  X("amgrp", undefined, undefined, { q: "s:home" });
  chk("Food comes next", ov().includes("🍎") && ov().includes("Groceries"));
  R("s:food:0", "groc", 3);
  R("s:food:1", "s50", 4);
  X("amgrp", undefined, undefined, { q: "s:food" });
  const P4 = spPreview(W),
    home = P4.c.spends.find(x => x.k === "Home"),
    food = P4.c.spends.find(x => x.k === "Food");
  chk(
    "all lines in: the group is the lines ($900), Close",
    home.amt === 900 && home.s === true && home.parts.length === 2,
    home
  );
  const fg = typSpend(Object.assign({}, W.o, { home: "Renting" }), 1);
  chk("lines more than the stock number: the lines win", food.amt === 900 + 400 && food.amt > fg, food);
  chk(
    "amGroupTotal: part in keeps the guess, the rest shows",
    JSON.stringify(amGroupTotal([{ amt: 100 }, { amt: null }], 500, false)) ===
      JSON.stringify({ amt: 500, sum: 100, rest: 400, done: false })
  );
  for (let i = 2; i < 5; i++) X("amgrp", undefined, undefined, { q: "s:" + amSlug(AM_GROUPS[i][0]) });
  for (let i = 0; i < 4 && W.step === 13; i++) N();
  chk("E has its last page", W.step === 6, W.step);
  N();
  for (let i = 0; i < 4 && W.kind === "setup"; i++) {
    if (W.sp) X(W.sp.at === "reveal" ? "spnext" : "spgo");
    else N();
  }
  const c = C();
  chk("setup finished", W && W.kind !== "setup" && c && c.led, W && W.kind);
  chk("roommateCount stays on the profile, kidCount is empty", c.roommateCount === 2 && c.kidCount === null);
  chk("the work keys are gone", c.am === undefined && c.roommateQ === undefined && c.iraPick === undefined);
  chk("the household size counts the roommates", hhSize(c) === 3 && hhSize(c, true) === 1);
  chk(
    "the cards and the loan stay after setup",
    c.debts.filter(x => x.k === CARD_K).length === 3 && c.debts.some(x => x.k === "Student loans" && x.amt === 37500)
  );
  chk(
    "the Roth IRA stays a named row",
    c.invs.some(x => x.nick === "Roth IRA" && x.amt === 100000)
  );
  chk("the job stays $3,766 a month", c.incs.find(x => x.k === "A main job").amt === 3766);
  chk("the rolled-over 401(k) is remembered", c.x.rolled && c.x.rolled["401(k) or work plan"] === "Roth IRA");
  save();
  const back = JSON.parse(JSON.stringify(G)).chars[G.active];
  chk("the counts persist in the saved game", back.roommateCount === 2);
  G.chars[G.active].live = ["Kids"];
  G.chars[G.active].kidCount = 4;
  chk("4 kids means 4 or more, and they count", hhSize(G.chars[G.active]) === 5);
  render();
  chk(
    "the Me tab shows the household with its counts",
    typeof meTabHousehold === "function" && meTabHousehold("<div>x</div>").includes("How many kids?")
  );

  /* an old saved game: one "IRA or Roth IRA" row loads and stays one row */
  const old = clone(G.chars[G.active]);
  old.accts = ["Checking", "IRA or Roth IRA"];
  old.invs = [{ k: "IRA or Roth IRA", amt: 20000, s: true }];
  old.cashes = [{ k: "Checking", amt: 900, s: true }];
  applyTypical(old);
  chk("an old IRA row loads as before", old.invs.length === 1 && old.invs[0].amt === 20000 && !old.invs[0].nick);
  const two = clone(old);
  two.invs = [
    { k: "IRA or Roth IRA", amt: 5000, s: true, nick: "IRA" },
    { k: "IRA or Roth IRA", amt: 8000, s: true, nick: "Roth IRA" },
  ];
  applyTypical(two);
  chk(
    "an IRA and a Roth IRA stay two rows",
    two.invs.length === 2 && two.invs.map(x => x.nick).join() === "IRA,Roth IRA"
  );
  chk(
    "a range is used only for the amount it was for",
    lkRowRange({ amt: 900, s: true, cf: 2, rg: [500, 2000, 1250] }, "cashes")[0] !== 500
  );

  /* the same answers through amApply twice give the same rows (a tap sets, never adds) */
  const o = {
    am: { "cards.n": { v: 1 }, "cards.carry": { v: 1 }, "card.1.amt": { v: 7500, cf: 2, rg: [5000, 10000] } },
    debts: [],
    debtKinds: [],
    live: [],
  };
  amApply(o);
  amApply(o);
  chk("amApply twice: one card of $7,500", o.debts.length === 1 && o.debts[0].amt === 7500);
  chk("My Money: every number question has I know it in the chip row", numq.toString().includes("I know it"));

  G = G0;
  W = null;
}
{
  /* the spreadsheet rows of setup: what lands each time, times how often; the lines of a group */
  const b = clone(C() || newChar());
  b.incs = [{ k: "A main job", amt: 3766, each: 869, s: true, cf: 3 }];
  b.x = Object.assign({}, b.x, { incFreq: { "A main job": "Weekly" } });
  b.spends = [
    { k: "Home", amt: 1200, s: false, h: true, rest: 450, parts: [{ n: "Rent or mortgage", amt: 750, cf: 2 }] },
  ];
  const B = amountsBook(b),
    by = id => B.rows.find(r => r.id === id);
  chk(
    "the book: $869 a week times 52/12 is $3,766",
    by("am_i0").f === "=ROUND({am_i0e}*{am_i0m},0)" && Math.round(by("am_i0e").v * by("am_i0m").v) === by("am_i0").v
  );
  chk(
    "the book: a group with lines not all in is the larger of the two",
    by("am_s0").f === "=MAX({am_s0g},{am_s0l})" && by("am_s0").v === 1200
  );
}
