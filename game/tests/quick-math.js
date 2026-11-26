/* ============================================================================
   SLAM the Game, test: tests/quick-math.js
   PURPOSE     Examine Quick math.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/quick.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), {
      name: "Qi",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 10000,
    });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C();
  chk(
    "the menu has it, next to What if",
    MENU.some(m => m[1] === "quick")
  );
  X("quick");
  chk(
    "list: three what-ifs, safe to spend, and links to the key numbers",
    W.kind === "quick" &&
      ov().includes("What do I really earn an hour?") &&
      ov().includes("Does this car fit?") &&
      ov().includes("How much home fits?") &&
      ov().includes("What does a dollar become?") &&
      ov().includes("Can I afford it?") &&
      ov().includes('data-a="metric" data-v="coast"') &&
      clean(ov()),
    junk(ov())
  );
  X("qmopen", "wage");
  chk("there is no second wage calculator", W.id === null && ov().includes('data-a="hrs"'));
  const car = qmCar(5000, 25000, 7),
    pay = (20000 * (0.07 / 12)) / (1 - Math.pow(1 + 0.07 / 12, -36));
  chk(
    "car by hand: 20% down, 36 months, 8% of gross",
    Math.abs(car.pay - pay) < 1e-6 &&
      car.line === 400 &&
      car.down === 5000 &&
      Math.abs(qmPay(car.fit * 0.8, 7, 36) - 400) < 15 &&
      qmPay(car.fit * 0.8, 7, 36) <= 400
  );
  X("qmopen", "car");
  chk(
    "car screen: this car next to the line, no verdict words",
    ov().includes(money(Math.round(car.pay))) &&
      ov().includes(money(400)) &&
      ov().includes("A price that lands on the line") &&
      ov().includes("Guess") &&
      !/too much|can.t afford|bad idea|should not/i.test(ov()) &&
      clean(ov()),
    junk(ov())
  );
  const hm = qmHome(5000, 0, 6.5),
    hm2 = qmHome(5000, 900, 6.5);
  chk(
    "home by hand: 28% front, 36% minus debts back, the smaller counts",
    Math.abs(hm.max - 1400) < 1e-6 &&
      hm.by === "front" &&
      Math.abs(hm2.max - 900) < 1e-6 &&
      hm2.by === "back" &&
      Math.abs(qmPay(hm.loan, 6.5, 360) - 1400) < 8
  );
  X("qmopen", "home");
  chk(
    "home screen",
    ov().includes(money(1400)) &&
      ov().includes("28% of your pay") &&
      ov().includes("a price with 20% down") &&
      clean(ov()),
    junk(ov())
  );
  const d1 = qmDollar(100, 30, "once"),
    d2 = qmDollar(100, 30, "month");
  chk("a dollar later by hand", Math.abs(d1.v - 100 * Math.pow(1.07, 30)) < 1e-6 && d2.put === 36000 && d2.v > d2.put);
  X("qmopen", "dollar");
  chk("dollar screen", ov().includes(money(Math.round(d1.v))) && ov().includes("by 60"));
  X("qmset", "month", "how");
  chk("every month", W.o.how === "month" && ov().includes(money(Math.round(d2.v))) && clean(ov()), junk(ov()));
  C().x = C().x || {};
  C().x.taxPct = 25;
  X("qmopen", "car");
  chk(
    "a known tax rate drops the Guess tag",
    !ov().includes(">Guess<") && ov().includes("worked out from your tax rate")
  );
  /* run Not built, Part 2: six more cards, each number from core/quick.js (the web app's js/math/quick.js) */
  const qcp = require("child_process").spawnSync(
    process.execPath,
    [GAME_DIR + "../tools/game_quick_build.mjs", "--check"],
    {
      encoding: "utf8",
    }
  );
  chk("core/quick.js is the same code as js/math/quick.js of the main app", qcp.status === 0, qcp.stdout);
  X("quick");
  chk(
    "the list has the six new cards, and cut it or invest it",
    [
      "A high-yield savings account?",
      "All at once, or a little each month?",
      "What does each use cost?",
      "Is it worth the hassle?",
      "What does waiting to start cost?",
      "Cut it, or invest it?",
      "Is this warranty worth it?",
    ].every(t => ov().includes(t))
  );
  const hy = qcHysa({ balance: 10000, fromRate: 0.0001, toRate: 0.04 });
  X("qmopen", "hysa");
  chk(
    "HYSA: a year and five years more, in the stat row",
    ov().includes(money(Math.round(hy.yearGain))) &&
      ov().includes(money(Math.round(hy.gain))) &&
      ov().includes("dkstats") &&
      clean(ov()),
    junk(ov())
  );
  X("qmset", "50000", "bal");
  chk(
    "HYSA: a tap redraws",
    ov().includes(money(Math.round(qcHysa({ balance: 50000, fromRate: 0.0001, toRate: 0.04 }).yearGain)))
  );
  const dc = qcDca({ amount: 25000, months: 12, ret: qcNominal(0.07, 0.02), cashRate: 0.04 });
  X("qmopen", "dca");
  chk(
    "all at once or spread",
    ov().includes(money(Math.round(dc.lump))) && ov().includes(money(Math.round(dc.spread))) && clean(ov()),
    junk(ov())
  );
  X("qmopen", "peruse");
  chk("cost per use: $400 over 50 uses is $8.00", ov().includes("$8.00") && clean(ov()), junk(ov()));
  X("qmopen", "hassle");
  chk(
    "the hassle: $100 over 2 hours is $50.00 an hour, next to the hourly wage",
    ov().includes("$50.00") && ov().includes("Your work, an hour") && clean(ov()),
    junk(ov())
  );
  const wt = qcStart({ monthly: 250, ageA: 30, ageB: 31, to: 60, ret: 0.07 });
  X("qmopen", "wait");
  chk(
    "waiting a year, to the age you stop",
    ov().includes(money(Math.round(wt.gap))) && ov().includes("to 60") && clean(ov()),
    junk(ov())
  );
  /* Eli's round rule (Nov 26 2026): the headline is round, the exact figures are in Show the math */
  const ct = qcCutInvest({ monthly: 100, years: 30, ret: 0.07 });
  X("qmopen", "cut");
  chk(
    "cut or invest: the headline is the round rule, about $30k and about $90k for $100 a month",
    ov().includes("about $30k") && ov().includes("about $90k") && ov().includes("the round rule") && clean(ov()),
    junk(ov())
  );
  chk(
    "cut or invest: the ratio line, about 1/3 and about 3 times",
    ct.oneIn === 3 &&
      ct.times === 3 &&
      ov().includes("Cutting it is about 1/3 of investing it") &&
      ov().includes("about 3 times as much")
  );
  chk(
    "cut or invest: the exact figures in Show the math are the engine's ($36,000 and about $117,000)",
    Math.round(ct.kept) === 36000 &&
      Math.abs(ct.invested - (100 * (Math.pow(1.07, 30) - 1)) / RM) < 1e-6 &&
      /Show the math[\s\S]*The exact figures/.test(ov()) &&
      ov().includes(money(36000) + " kept") &&
      ov().includes(money(Math.round(ct.invested))) &&
      ov().includes("Exact ratio: " + ct.ratio.toFixed(2) + " times")
  );
  X("qmset", "250", "amt");
  chk("cut or invest: the rule scales with the amount", ov().includes("about $75k") && ov().includes("about $230k"));
  X("qmset", "10", "yrs");
  const ct2 = qcCutInvest({ monthly: 250, years: 10, ret: 0.07 });
  chk(
    "cut or invest: at other years the headline is the worked figure, rounded, and says so",
    !ct2.atRule &&
      ov().includes("about " + lkK(ct2.roundKept)) &&
      ov().includes("about " + lkK(ct2.roundInvested)) &&
      ov().includes("rounded") &&
      !ov().includes("about $75k")
  );
  {
    const c = C(),
      imp = stgImpact(c, { save: 250, take: 0, equity: 0, once: 0, value: 0 }, "full");
    chk(
      "cut or invest: the days closer to FI are the Strategy Engine's own",
      imp.fi != null && imp.fi > 0
        ? ov().includes("Days closer to FI") && ov().includes(kitDays(imp.fi).toLocaleString())
        : !ov().includes("Days closer to FI"),
      imp.fi
    );
  }
  X("qmopen", "warranty");
  chk(
    "warranty: 20% of $600 is $120, they meet at 25%",
    ov().includes(money(120)) && ov().includes("25%") && clean(ov()),
    junk(ov())
  );
  chk("no verdict words on the new cards", !/\b(bad|wrong|mistake|failed|behind)\b/i.test(ov()));
  X("close");
  G.chars.length = n0;
  G.active = act0;
  save();
  go("home");
}
