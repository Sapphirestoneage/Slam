/* ============================================================================
   SLAM the Game, test: tests/giving.js
   PURPOSE     Examine Giving (run Finish everything partly built, Part 16): the copy of the engine,
               the menu row, the giving rate on each base with the key number "What you give away
               each month", the maaser share, one gift in hours and days from freeAt, bunching on
               the 2026 rows (worked by hand), envelopes in one account with Undo, the maaser
               credit with and without giving ahead, the spreadsheet rows, and calm words.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/giving.js, core/giving.js, core/metrics.js (the
               key number's link).
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), {
      name: "Giver",
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
  const gb = require("child_process").spawnSync(
    process.execPath,
    [GAME_DIR + "../tools/game_giving_build.mjs", "--check"],
    {
      encoding: "utf8",
    }
  );
  chk("core/giving.js is the same code as js/math/giving.js of the main app", gb.status === 0, gb.stdout);
  chk(
    "the menu has Giving, in My money",
    MENU.some(m => m[1] === "giving") && MENU_GROUPS.find(g => g[0] === "money")[3].includes("giving")
  );
  chk(
    "the 2026 rows are in the copy",
    GV_TAX.std.single === 16100 && GV_TAX.charity.nonItemizer.joint === 2000 && GV_TAX.charity.floor === 0.005
  );
  X("giving");
  chk(
    "the screen: the stat row and the five cards, no junk",
    W.kind === "giving" &&
      ov().includes("Your giving rate") &&
      ov().includes("One gift, in time") &&
      ov().includes("Bunching") &&
      ov().includes("Envelopes in one account") &&
      ov().includes("Maaser credit") &&
      clean(ov()),
    junk(ov())
  );
  chk("before a tap: what is missing, not a number", ov().includes("tap what you give") && !gvRead(C()).rate.ready);
  X("gvgiven", "250");
  chk("what you give is the key number of Key numbers", C().x.kin.give.v === 250 && knGot(C(), "give").v === 250);
  let g = gvRead(C());
  chk("giving rate: $250 of $5,000 take-home is 5%", g.rate.ready && g.rate.rate === 0.05 && ov().includes("5%"));
  chk(
    "the share: 10% until tapped, $500 a month",
    g.target.value === 500 && g.target.own === false && ov().includes(money(500))
  );
  X("gvset", "after", null, { f: "base" });
  chk("after work costs needs the costs, said so", !gvRead(C()).rate.ready && ov().includes("work costs a month"));
  X("gvset", "1000", null, { f: "costs" });
  g = gvRead(C());
  chk("after work costs: $4,000 base, 6.3%", g.rate.of === 4000 && g.rate.rate === 0.0625);
  X("gvset", "0.2", null, { f: "pct" });
  chk("your own share: 20% of $4,000 is $800", gvRead(C()).target.value === 800 && gvRead(C()).target.own);
  X("gvset", "1000", null, { f: "gift" });
  g = gvRead(C());
  const base = freeAt(C()),
    once = freeAt(C(), { once: 1000 });
  chk(
    "one gift: hours at the real wage, days from the game's own path",
    g.gift.ready && g.gift.hours === 1000 / g.wage && g.gift.days === Math.round(enDays(once, base)),
    g.gift
  );
  X("gvset", "month", null, { f: "every" });
  chk(
    "every month: hours a month and the free date with it going out",
    gvRead(C()).gift.monthly && ov().includes("a month")
  );
  X("gvset", "5000", null, { f: "other" });
  g = gvRead(C());
  const K = gvBunch({ give: 3000, agi: g.agi, other: 5000, filing: "single", years: 2, cash: true }, GV_TAX);
  chk(
    "bunching: the same function, the year's giving from what you give",
    g.bunch.ready && g.bunch.saved === K.saved && g.give === 3000
  );
  const H = gvBunch({ give: 6000, agi: 100000, other: 8000, filing: "single", years: 2, cash: true }, GV_TAX);
  chk("bunching, by hand: $308 kept over two years", Math.round(H.saved) === 308 && H.bunched[0].deduction === 19500);
  X("gvenvset", "300", "maaser", { f: "put" });
  X("gvenvset", "100", "maaser", { f: "used" });
  g = gvRead(C());
  chk(
    "an envelope: $200 of $300 left, a bar",
    g.env.rows[0].left === 200 && ov().includes(money(200) + " of " + money(300) + " left")
  );
  X("gvenvadd", "Gifts");
  chk("add an envelope", gvRead(C()).list.length === 3);
  X("gvenvdel", "", "fun");
  chk("remove one, with Put it back", gvRead(C()).list.length === 2 && ov().includes("Put Fun money back"));
  X("gvenvback");
  chk(
    "Put it back",
    gvRead(C()).list.some(e => e.name === "Fun money")
  );
  const ms = gvgMonths();
  X("gvlog", "1600", ms[3]);
  g = gvRead(C());
  chk(
    "maaser credit: $800 given ahead counts toward the next month",
    g.credit.rows[0].after === 800 && g.credit.rows[1].fromCredit === 800
  );
  X("gvset", "no", null, { f: "ahead" });
  chk("your own rule: giving ahead does not carry", gvRead(C()).credit.rows[0].after === 0);
  const B = givingBook(C());
  chk(
    "the spreadsheet: the rate, the share and bunching, with formulas",
    B.rows.some(r => r.id === "gv_rate" && r.f) &&
      B.rows.some(r => r.id === "gv_target" && r.f) &&
      B.rows.some(r => r.id === "gv_kept" && r.f)
  );
  const tone = h => !/mistake|failed|behind|off track|\bbad\b|\bwrong\b|—/i.test(h);
  chk("calm words: no verdict, no em dash", tone(ov()) && clean(ov()), junk(ov()));
  X("close");
  G.chars.length = n0;
  G.active = act0;
  save();
  go("home");
}
