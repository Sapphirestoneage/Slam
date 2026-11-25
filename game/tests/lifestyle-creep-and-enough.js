/* ============================================================================
   SLAM the Game, test: tests/lifestyle-creep-and-enough.js
   PURPOSE     Examine Lifestyle creep and enough (run Not built, groups 1 to 5, Part 3). A made-up
               player with two years of a money log: the copy of core/enough.js is current (with the
               CPI row); the read by category, income from the log, the lines faster than prices once
               a rate is tapped, the quiet card in Recalculating words; a part year with no income
               (a guess tapped); the Pareto of the spending lines; the enough number and the room for
               error; the spreadsheet rows and formulas; Rough numbers in money() and signed() with
               no stored number changed; the creep check of the Home conditions; the menu and the
               built list row; no undefined, NaN or null on the sheet.
   INPUT       The game scripts, loaded by harness.cjs. Made-up profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/enough.js, features/enough.js, core/engine.js
               (conditions), screens/ui.js (money, signed, the Me tab), features/book.js.
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto"),
    sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
  const src = fs.readFileSync(path.join(GAME_DIR, "..", "js", "math", "enough.js"), "utf8"),
    ref = JSON.parse(fs.readFileSync(path.join(GAME_DIR, "..", "data", "reference-2026.json"), "utf8")),
    cpi = { value: ref.cpi.value, period: ref.cpi.period, source: ref.cpi.source, date: ref.cpi.date },
    copy = fs.readFileSync(path.join(GAME_DIR, "core", "enough.js"), "utf8");
  chk(
    "the math of the game is a current copy of js/math/enough.js and the CPI row (node tools/game_enough_build.mjs)",
    copy.includes("SOURCE-HASH  " + sha(src + JSON.stringify(cpi))) && EN_CPI.value === ref.cpi.value
  );

  const n0 = G.chars.length,
    rough0 = G.rough,
    R0 = r => Object.assign({ s: true }, r),
    moves = [];
  /* 2025: 12 months, food 400, home 1500, fun 200, income 4000. 2026: 10 months, food 480, home 1530, fun 300, income 4100. */
  for (let m = 1; m <= 12; m++) {
    const ym = "2025-" + String(m).padStart(2, "0");
    moves.push({ d: ym + "-02", t: "in", amt: 4000 }, { d: ym + "-05", t: "out", amt: 400, cat: "Food" });
    moves.push({ d: ym + "-01", t: "out", amt: 1500, cat: "Home" }, { d: ym + "-09", t: "cost", amt: 200, cat: "Fun" });
  }
  for (let m = 1; m <= 10; m++) {
    const ym = "2026-" + String(m).padStart(2, "0");
    moves.push({ d: ym + "-02", t: "in", amt: 4100 }, { d: ym + "-05", t: "out", amt: 480, cat: "Food" });
    moves.push({ d: ym + "-01", t: "out", amt: 1530, cat: "Home" }, { d: ym + "-09", t: "out", amt: 300, cat: "Fun" });
  }
  const c = Object.assign(newChar(), {
    name: "Remy",
    led: true,
    placed: true,
    incs: [R0({ k: "A main job", amt: 4100 })],
    spends: [
      R0({ k: "Home", amt: 1530 }),
      R0({ k: "Food", amt: 480 }),
      R0({ k: "Fun", amt: 300 }),
      R0({ k: "Phone", amt: 60 }),
      R0({ k: "Bus", amt: 90 }),
    ],
    cashes: [R0({ k: "Checking", amt: 3000 })],
    invs: [],
    debts: [],
    debt: 0,
    take: 4100,
    spend: 2460,
    inv: 50000,
    moves,
  });
  G.chars.push(c);
  G.active = G.chars.length - 1;
  syncAll(c);
  G.demo = false;
  G.tourSeen = true;
  save();

  /* 1. the read: two years, income from the log */
  let R = enGameRead(c);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  chk(
    "two years are compared: 2025 and 2026",
    R.creep.ready && R.creep.prev.year === 2025 && R.creep.now.year === 2026
  );
  chk("the months of each year are the ones with spending", R.creep.prev.months === 12 && R.creep.now.months === 10);
  chk("spending growth: 2310 / 2100 - 1 = 10%", near(R.creep.spendGrowth, 2310 / 2100 - 1), R.creep.spendGrowth);
  chk(
    "income growth from the log: 4100 / 4000 - 1 = 2.5%",
    R.creep.income.from === "ledger" && near(R.creep.income.growth, 0.025),
    R.creep.income
  );
  chk("the alert is on: spending grew faster than income", R.creep.alert === true);
  chk("the gap a month: 2310 - 2100 x 1.025 = 157.50", near(R.creep.gap, 157.5), R.creep.gap);
  chk("the level is Close (10 months in the shorter year)", R.creep.level === "Close");
  chk("no rate tapped: no line is called faster than prices", R.creep.mutants.length === 0);
  chk(
    "the next turn with no rate: the line that grew most in dollars (Fun, +$100)",
    R.creep.turn.cat === "Fun" && R.creep.turn.back === 100
  );

  /* 2. a rate tapped: the CPI figure */
  X("enough");
  X("enpick", "cpi", "inflation");
  R = enGameRead(c);
  chk("the CPI tap is kept and read", c.x.enough.inflation === "cpi" && R.inflation === EN_CPI.value);
  const food = R.creep.cats.find(x => x.cat === "Food"),
    home = R.creep.cats.find(x => x.cat === "Home");
  chk("Food grew 20%, faster than prices", food.mutant === true && near(food.growth, 0.2));
  chk("Home grew 2%, slower than prices: not tagged", home.mutant === false);
  chk(
    "the next turn: the line most past prices (Fun: 300 - 200 x 1.027 = 94.60)",
    R.creep.turn.cat === "Fun" && near(R.creep.turn.back, 300 - 200 * (1 + EN_CPI.value))
  );
  let h = ov();
  chk(
    "the sheet shows Recalculating and the one next turn",
    /Recalculating/.test(h) && /Your next turn/.test(h) && /Hold Fun/.test(h)
  );
  chk("the sheet tags the lines faster than prices", (h.match(/Faster than prices/g) || []).length >= 2);
  chk("the sheet names the CPI figure and its period", h.includes(EN_CPI.period));
  chk("no blame words on the sheet", !/\b(mistake|failed|behind|off track|overspent|bad|warning)\b/i.test(h));
  chk("the sheet is clean", clean(h), junk(h));
  X("enpick", "cpi", "inflation");
  chk("a second tap clears the rate", enChoices(c).inflation == null);

  /* 3. no income in the log: a guess tapped */
  const c2 = Object.assign(clone(c), { name: "Ash", moves: c.moves.filter(m => m.t !== "in"), x: {} });
  G.chars.push(c2);
  G.active = G.chars.length - 1;
  R = enGameRead(c2);
  chk(
    "no income in the log: income growth is empty, not zero",
    R.creep.income.growth === null && R.creep.alert === false
  );
  X("enough");
  X("enpick", "0.03", "incomeGrowth");
  R = enGameRead(c2);
  chk(
    "a tapped guess is used and says so",
    R.creep.income.from === "tapped" && R.creep.incomeLevel === "Guess" && R.creep.alert === true
  );
  chk("the card words name the tapped raise", /the 3% raise you tapped/.test(enCreepWords(R.creep, money).line));
  G.active = G.chars.indexOf(c);

  /* 4. the few lines */
  R = enGameRead(c);
  chk(
    "Pareto: Home and Food make 80% of the five lines",
    R.pareto.ready && R.pareto.count === 2 && R.pareto.of === 5,
    R.pareto
  );
  chk("their total is 2010 of 2460", R.pareto.topTotal === 2010 && R.pareto.total === 2460);

  /* 5. enough and room for error */
  const d = derive(c);
  chk("enough at the life I have now is the FI number", near(R.enough.value, d.fiBase) && R.enough.sameAsFi);
  X("enpick", "0.9", "share");
  X("enpick", "0.2", "room");
  R = enGameRead(c);
  chk("enough at a bit less: FI x 90%", near(R.enough.value, Math.round(d.fiBase * 0.9 * 100) / 100));
  chk("room for error 20% on top", near(R.enough.withRoom, Math.round(R.enough.value * 1.2 * 100) / 100));
  chk("the years come from the game's own yearsTo", R.enough.yrs === yearsTo(c.inv, d.save, R.enough.value));
  h = ov();
  chk(
    "the enough card shows the number and the room",
    h.includes("Enough and room for error") && h.includes(money(R.enough.withRoom))
  );

  /* 6. the spreadsheet */
  const B = enBook(c),
    ids = B.rows.map(r => r.id);
  chk(
    "the book has the creep and the enough rows",
    ["en_prev", "en_now", "en_growth", "en_fi", "en_share", "en_enough", "en_room", "en_withroom"].every(i =>
      ids.includes(i)
    )
  );
  chk("growth formula", B.rows.find(r => r.id === "en_growth").f === "={en_now}/{en_prev}-1");
  chk("enBook is a part of the plan's spreadsheet", BOOK_PARTS.includes(enBook));

  /* 7. Rough numbers: display only */
  /* the money of each profile: every amount it keeps (time stamps of a save are not numbers of the plan) */
  const nums = () =>
    JSON.stringify(
      G.chars.map(p => [
        p.take,
        p.spend,
        p.inv,
        p.debt,
        p.months,
        p.incs,
        p.spends,
        p.cashes,
        p.invs,
        p.debts,
        p.moves,
        p.goals,
      ])
    );
  const before = nums(),
    exact = money(3450);
  X("roughset", "1");
  chk(
    "rough on: money shows a range",
    G.rough === true && money(3450) === "$3k to $4k" && money(12345) === "$10k to $20k"
  );
  chk("rough on: signed keeps the plus", signed(250) === "+$200 to $300");
  chk("rough on: a small amount", money(87) === "$0 to $100" && money(0) === "$0");
  chk("rough on: no stored number changed", nums() === before);
  chk("the switch shows on the Me tab", typeof meTabBase === "function" && /Rough numbers/.test(meTabBase()));
  X("roughset", "0");
  chk("rough off: exact again", money(3450) === exact && exact === "$3,450");

  /* 8. the Home condition uses the one creep check, in calm words */
  chk(
    "the creep check between two looks",
    enStepCreep({ spend: 2000, take: 4000 }, { spend: 2200, take: 4040 }) &&
      !enStepCreep({ spend: 2000, take: 4000 }, { spend: 2050, take: 4000 })
  );
  c.hist = [
    { spend: 2000, take: 4000 },
    { spend: 2200, take: 4040 },
  ];
  const cond = conditions(c, derive(c), todayISO()).find(x => /spending and income/.test(x.n));
  chk(
    "the Home note is calm (info, Recalculating) and opens the sheet",
    cond && cond.t === "info" && cond.fix.a === "enough",
    cond
  );

  /* 9. menu and built list */
  chk(
    "the menu has the row",
    MENU.some(m => m[1] === "enough")
  );
  const row = WB.find(r => /Lifestyle creep and enough/.test(r[1]));
  chk("the built list row is built and its probe passes", row && row[2] === "b" && row[3]());

  G.chars.splice(n0);
  G.active = 0;
  G.rough = rough0;
  W = null;
  save();
}
