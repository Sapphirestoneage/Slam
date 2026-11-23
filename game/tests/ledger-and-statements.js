/* ============================================================================
   SLAM the Game, test: tests/ledger-and-statements.js
   PURPOSE     Examine the ledger and the three statements: each total is the number that derive(c) and
               the profile already have, cash set aside stays out of net worth, the logged months come
               from the money log, the investments follow the mix screen, the giant ledger has each
               row, the sheet and its tabs, the spreadsheet rows, the skill link and the built row.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/ledger.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    ym = todayISO().slice(0, 7),
    a = Object.assign(newChar(), {
      name: "Ledger",
      led: true,
      placed: true,
      age: 34,
      ret: 60,
      incs: [R0({ k: "A main job", amt: 5000 }), R0({ k: "Side gigs", amt: 1000 })],
      spends: [R0({ k: "Home", amt: 1800 }), R0({ k: "Food", amt: 900 }), { k: "Fun and everything else", amt: 800 }],
      cashes: [
        R0({ k: "Checking", amt: 4000 }),
        R0({ k: "Savings", amt: 6000 }),
        R0({ k: "Tax money", amt: 1500, hold: true }),
      ],
      invs: [R0({ k: "Retirement plan at work", amt: 30000 }), R0({ k: "IRA or Roth IRA", amt: 10000 })],
      debts: [
        R0({ k: "Credit card balance", amt: 2000, high: true, apr: "15% to 25%", rate: 20, pay: 100 }),
        R0({ k: "Car loan", amt: 9000, high: false }),
      ],
      moves: [
        { t: "in", d: ym + "-02", amt: 5000, src: "A main job" },
        { t: "out", d: ym + "-03", amt: 300, cat: "Food" },
        { t: "out", d: ym + "-04", amt: 200, cat: "Home" },
        { t: "pay", d: ym + "-05", amt: 100, k: "Credit card balance" },
      ],
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
    N = ledgWorth(c),
    F = ledgFlow(c),
    I = ledgInvest(c),
    A = ledgAll(c);
  chk("net worth is the number of derive()", N.nw === d.nw && N.nw === 10000 + 40000 - 11000, N.nw + " " + d.nw);
  chk(
    "cash you can reach is derive().cash, and cash set aside stays out",
    N.cash === d.cash && N.cash === 10000 && N.heldSum === 1500 && N.held.length === 1
  );
  chk("own, owe and the high-interest part", N.own === 50000 && N.owe === c.debt && N.owe === 11000 && N.high === 2000);
  chk(
    "money in and out are the profile's numbers",
    F.in === c.take && F.in === 6000 && F.out === c.spend && F.out === 3500 && F.left === 2500
  );
  chk("the share kept and the year are derive()'s", F.rate === d.rate && F.year === d.save);
  chk("the biggest source and its share", F.topName === "A main job" && Math.abs(F.topShare - 5 / 6) < 1e-9);
  chk(
    "the logged month comes from the money log",
    F.months.length === 1 &&
      F.months[0].in === 5000 &&
      F.months[0].out === 500 &&
      F.months[0].debt === 100 &&
      F.months[0].left === 4400 &&
      F.months[0].cats.Food === 300
  );
  chk(
    "investments: each account, and the total of the profile",
    I.rows.length === 2 && I.total === c.inv && I.rows.reduce((s, r) => s + r.amt, 0) === 40000
  );
  kitStore(c, "mix").in_0 = { v: "sp", cf: 2 };
  kitStore(c, "mix").fee_0 = { v: "0.5", cf: 2 };
  const I2 = ledgInvest(c),
    M = mixCalc(c);
  chk(
    "investments follow the mix screen: what is inside, the fee",
    I2.rows[0].kind === "sp" &&
      I2.rows[0].feePct === 0.5 &&
      Math.abs(I2.feeYear - M.feeYear) < 1e-9 &&
      Math.abs(I2.mix.stock - M.stock) < 1e-9
  );
  chk(
    "the giant ledger has each row, and counts the real ones",
    A.lines === 12 && A.real === 11 && A.parts.length === 5,
    A.lines + " " + A.real
  );
  chk(
    "each part of the giant ledger adds up to the profile",
    A.parts[0].total === d.cash &&
      A.parts[1].total === c.inv &&
      A.parts[2].total === c.debt &&
      A.parts[3].total === c.take &&
      A.parts[4].total === c.spend
  );
  X("ledger");
  chk(
    "the sheet opens on Own and owe",
    W.kind === "ledger" &&
      W.tab === "worth" &&
      ov().includes("Net worth") &&
      ov().includes(money(d.nw)) &&
      ov().includes("Cash set aside") &&
      clean(ov()),
    junk(ov())
  );
  chk(
    "lines open: details with the rows inside",
    (ov().match(/<details class="ledg"/g) || []).length >= 4 && ov().includes("Tax money") && ov().includes("Car loan")
  );
  chk(
    "each label has an i",
    ["lg_networth", "lg_reach", "lg_held", "lg_invest", "lg_owe", "lg_high"].every(
      k => ov().includes("term:" + k) && GLOSS[k]
    )
  );
  X("ledgtab", "flow");
  chk(
    "In and out: the plan, the source share, the logged month",
    ov().includes("Left over each month") &&
      ov().includes(money(2500)) &&
      ov().includes("83%") &&
      ov().includes(lgMonthName(ym)) &&
      clean(ov()),
    junk(ov())
  );
  X("ledgtab", "invest");
  chk(
    "Investments: accounts, mix, fees",
    ov().includes("Stock index fund") && ov().includes("Your mix") && ov().includes("Fund fee a year") && clean(ov()),
    junk(ov())
  );
  X("ledgtab", "all");
  chk(
    "Every line: 12 lines, 1 guess",
    ov().includes("12 lines") && ov().includes("1 are guesses") && ov().includes("· guess") && clean(ov()),
    junk(ov())
  );
  chk("no input on the screen: it only reads", !/data-a="kit(set|sure|pad)"/.test(ov()) && !ov().includes("<input"));
  chk("the screen has Back, Forward, Close and its i", !!NV_INFO.ledger && MENU.some(m => m[1] === "ledger"));
  X("close");
  /* a profile with no lines yet: one guess row for each part */
  const b = Object.assign(newChar(), { name: "Rough", take: 4000, spend: 3000, inv: 5000, debt: 2000, months: 2 });
  G.chars.push(b);
  const db = derive(b),
    Nb = ledgWorth(b);
  chk(
    "before real lines: the same net worth as derive(), shown as a guess",
    Nb.nw === db.nw && Nb.st === "Guess" && ledgAll(b).real === 0
  );
  G.chars.pop();
  /* the spreadsheet */
  const B = ledgBook(c),
    val = id => B.rows.find(r => r.id === id).v;
  chk(
    "the spreadsheet rows: net worth and left over",
    val("lg_nw") === d.nw &&
      val("lg_own") - val("lg_owe") === val("lg_nw") &&
      val("lg_left") === 2500 &&
      val("lg_year") === d.save
  );
  chk(
    "the spreadsheet of the plan has the section",
    bookSections(c).some(s => s.title === "Ledger and statements")
  );
  /* the link from a skill, and the built list */
  const L = cxLink("financial-ops-tooling", 0);
  chk("a real skill opens the ledger", L && L.a === "ledger", JSON.stringify(L));
  X(L.a, L.v, L.v);
  chk("the link opens the sheet", W && W.kind === "ledger" && W.tab === "worth");
  X("close");
  const row = btRows().find(r => r.n.startsWith("Giant ledger"));
  chk("the built list: built, with the action", row && row.st === "b" && row.a === "ledger");
  const src = require("fs").readFileSync(GAME_DIR + "features/ledger.js", "utf8");
  chk("style: no em dash, no red", !/\u2014/.test(src) && !/var\(--(bad|red)\)|#f00|color:\s*red/i.test(src));
  G.chars.length = n0;
  G.active = 0;
  save();
}
