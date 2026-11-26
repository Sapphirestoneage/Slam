/* ============================================================================
   SLAM the Game, test: tests/joy-and-enough.js
   PURPOSE     Examine Joy and enough (run Finish everything partly built, Part 8). A made-up player
               with five spending lines and three subscriptions: joy taps on the lines (share of joy,
               joy per $100, hours of work at the real hourly wage, a second tap clears); the lines on
               the fulfillment curve, the Enough meter and the one tap that sets enough; the rich-life
               list (add from a pick and from the box, price, joy, kind, regret, done, remove and put
               back, memory dividends, the regret view, the days on the free date); the subscriptions as
               days from the game's own free date; the spreadsheet rows; the Home line; the menu, the
               built list row and the route from a reading; no undefined, NaN or null on the sheet.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/enough.js, features/joy.js, features/games2.js
               (subsOf), screens/ui.js (freeAt), core/engine.js (timeLedger), features/book.js,
               features/connect.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r);
  const c = Object.assign(newChar(), {
    name: "Juno",
    age: 32,
    led: true,
    placed: true,
    incs: [R0({ k: "A main job", amt: 5200 })],
    spends: [
      R0({ k: "Home", amt: 1700 }),
      R0({ k: "Food", amt: 550 }),
      R0({ k: "Fun", amt: 300 }),
      R0({ k: "Bills and subscriptions", amt: 160 }),
      R0({ k: "Getting around", amt: 200 }),
    ],
    cashes: [R0({ k: "Checking", amt: 6000 })],
    invs: [],
    debts: [],
    debt: 0,
    take: 5200,
    spend: 2910,
    inv: 60000,
  });
  G.chars.push(c);
  G.active = G.chars.length - 1;
  syncAll(c);
  G.demo = false;
  G.tourSeen = true;
  c.x = c.x || {};
  c.x.subs = [
    { n: "Netflix", amt: 18, s: true },
    { n: "Spotify", amt: 12, s: true },
    { n: "Gym", amt: 40, s: true },
  ];
  save();

  X("joy");
  let h = ov();
  chk(
    "the sheet opens with its four cards",
    ["Joy per dollar", "The fulfillment curve", "Rich-life list", "Subscriptions in days"].every(t => h.includes(t))
  );
  chk("the sheet is clean before any tap", clean(h), junk(h));
  let R = jyRead(c);
  chk("no tap: joy per dollar waits, never counts a line as no joy", !R.joy.ready && R.joy.of === 5);

  /* 1. joy per dollar */
  X("jyrate", "5", "Fun");
  X("jyrate", "2", "Home");
  X("jyrate", "4", "Food");
  R = jyRead(c);
  const near = (a, b) => Math.abs(a - b) < 1e-9,
    fun = R.joy.rows.find(r => r.name === "Fun"),
    wage = timeLedger(c, derive(c)).wage;
  chk("three lines tapped", R.joy.ready && R.joy.rated === 3);
  chk("share of joy: 5 of 11", near(fun.joyShare, 5 / 11));
  chk("joy per $100: 5 / 3", near(fun.per100, 5 / 3));
  chk(
    "hours of work at the real hourly wage",
    wage > 0 && near(fun.hours, 300 / wage) && near(fun.perHour, 5 / (300 / wage))
  );
  chk("a dollar's joy: weighted by the month", near(R.joy.dollarJoy, (5 * 300 + 2 * 1700 + 4 * 550) / 2550));
  chk("most joy per dollar is Fun", R.joy.most.name === "Fun");
  X("jyrate", "4", "Food");
  chk("a second tap clears it", jyRead(c).joy.rated === 2 && c.x.joy.Food == null);
  X("jyrate", "9", "Food");
  X("jyrate", "3", "Not a line");
  chk("a joy out of range or on no line is ignored", jyRead(c).joy.rated === 2);
  X("jyrate", "4", "Food");

  /* 2. the curve and the Enough meter */
  X("jycurve", "survival", "Home");
  X("jycurve", "comforts", "Food");
  X("jycurve", "past", "Fun");
  R = jyRead(c);
  chk("the curve: three placed, 300 past enough", R.curve.ready && R.curve.placed === 3 && R.curve.past === 300);
  chk("the Enough meter: 2,250 of 2,550 still adds", near(R.curve.meter, 2250 / 2550));
  chk("the curve's enough: 1 - 300 / 2,910", R.curve.share === Math.round((1 - 300 / 2910) * 100) / 100);
  h = ov();
  chk("the button to use it shows", h.includes('data-a="jyshare"'));
  X("jyshare", String(R.curve.share));
  chk(
    "one tap sets the life called enough",
    c.x.enough.share === R.curve.share && enGameRead(c).enough.share === R.curve.share
  );
  chk("and it says so", ov().includes("Used for your enough number"));
  X("jycurve", "past", "Fun");
  chk("a second tap takes a line off the curve", jyRead(c).curve.placed === 2);
  X("jycurve", "past", "Fun");

  /* 3. the rich-life list */
  X("jyadd", "A trip");
  const id = c.x.rich[0].id;
  X("jyset", "2500", id, { f: "price" });
  X("jyset", "5", id, { f: "joy" });
  X("jyset", "experience", id, { f: "kind" });
  X("jyset", "alot", id, { f: "regret" });
  X("jyadd", "A good chair");
  const id2 = c.x.rich[1].id;
  X("jyset", "500", id2, { f: "price" });
  X("jyset", "3", id2, { f: "joy" });
  X("jyset", "thing", id2, { f: "kind" });
  X("jyset", "little", id2, { f: "regret" });
  X("jyset", "yes", id2, { f: "done" });
  R = jyRead(c);
  const trip = R.rich.items.find(i => i.id === id);
  chk(
    "the trip: memory dividends to the age the game plans to",
    trip.memYears === c.death - c.age && trip.dividend === 5 * (c.death - c.age)
  );
  chk("the trip, 10 years later", trip.laterYears === Math.max(0, c.death - c.age - 10));
  chk(
    "the trip's days come from the game's free date",
    trip.days === Math.round(enDays(freeAt(c, { once: 2500 }), freeAt(c))) && trip.days > 0,
    [trip.days, freeAt(c, { once: 2500 }), freeAt(c)]
  );
  chk(
    "the chair is done: no days, no memory dividends",
    R.rich.items.find(i => i.id === id2).days === null && R.rich.items.find(i => i.id === id2).memYears === null
  );
  chk("the regret view: the trip first", R.rich.regret[0].id === id && R.rich.alot === 1 && R.rich.alotTotal === 2500);
  chk("to do and done", R.rich.plannedTotal === 2500 && R.rich.doneTotal === 500);
  X("jyset", "2500", id, { f: "price" });
  chk("a second tap on the price clears it", c.x.rich[0].price === null);
  X("jyset", "2500", id, { f: "price" });
  X("jydel", null, id2);
  chk("remove", c.x.rich.length === 1 && ov().includes("Put A good chair back"));
  X("jyback");
  chk("put it back, in its place", c.x.rich.length === 2 && c.x.rich[1].id === id2);
  h = ov();
  chk("the regret view shows", h.includes("The regret view") && h.includes("You would regret missing 1 a lot"));

  /* 4. the subscriptions in days */
  R = jyRead(c);
  const base = freeAt(c),
    all = enDays(base, freeAt(c, { monthly: -70 }));
  chk(
    "all three: the days from the game's own free date",
    R.subs.ready && R.subs.days === Math.round(all) && R.subs.days > 0
  );
  chk("each one by its share", R.subs.rows[0].name === "Gym" && R.subs.rows[0].days === Math.round((all * 40) / 70));
  chk("the card says it in days", ov().includes(R.subs.days.toLocaleString("en-US") + " days"));

  /* 5. the spreadsheet, Home, the menu, the route, the built list */
  const B = joyBook(c),
    ids = B.rows.map(r => r.id);
  chk(
    "the book has the joy and the meter",
    ["jy_rated", "jy_weighted", "jy_dollar", "jy_placed", "jy_past", "jy_meter"].every(i => ids.includes(i))
  );
  chk("joyBook is a part of the plan's spreadsheet", BOOK_PARTS.includes(joyBook));
  chk("the Home line, for later", /days to the day work becomes optional/.test(joyHomeLine(c)));
  chk(
    "the menu has the row",
    MENU.some(m => m[1] === "joy")
  );
  chk("the enough sheet links here", (X("enough"), ov().includes('data-a="joy"')));
  const row = WB.find(r => /^Joy and enough/.test(r[1]));
  chk("the built list row is built and its probe passes", row && row[2] === "b" && row[3]());
  X("joy");
  h = ov();
  chk("no undefined, NaN or null on the sheet", clean(h), junk(h));
  chk("no verdict words", !/\b(waste|wasted|should|mistake|failed|behind)\b/i.test(h.replace(/<[^>]+>/g, " ")));

  G.chars.splice(n0);
  G.active = 0;
  W = null;
  save();
}
