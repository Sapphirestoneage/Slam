/* ============================================================================
   SLAM the Game, test: tests/fi-ratio-and-coast-card.js
   PURPOSE     Examine the FI ratio on Key numbers (investment income divided by spending) and the card
               "You can stop sprinting" on Home: it shows the day the Coast number is reached, not on a
               Guess, and one time only.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/coast.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Coaster",
      led: true,
      placed: true,
      age: 35,
      ret: 65,
      take: 5000,
      spend: 3000,
      inv: 30000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 1500 }), R0({ k: "Food", amt: 1500 })],
      cashes: [R0({ k: "Checking", amt: 9000 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 30000 })],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C();
  /* the FI ratio: 30,000 x 4% / 12 = 100 a month; 100 / 3,000 = 3.33% */
  const F = firCalc(c);
  chk("investment income a month is invested x 4% / 12", Math.abs(F.income - 100) < 1e-9, F.income);
  chk("the FI ratio is that income / spending", Math.abs(F.ratio - 100 / 3000) < 1e-9, F.ratio);
  const M = knMetrics(c, derive(c)),
    m = M.find(x => x.id === "firatio");
  chk("the FI ratio is a key number in the group Freedom", !!m && m.g === "free" && m.n === "FI ratio");
  chk(
    "it shows its math: the income, the spending, the division",
    m.math.length === 4 && /÷/.test(m.math[3]) && /4%/.test(m.math[1])
  );
  chk("a ratio under 100% gets no verdict word", m.zone[1] === "none" && !/bad|poor|behind|fail/i.test(m.zone[0]));
  chk("the value is a percent", m.val === knPct(100 / 3000), m.val);
  X("keynums");
  X("kngroup", "free");
  chk("the sheet Key numbers shows the FI ratio", ov().includes("FI ratio"));
  X("close");
  /* at 100%: the same finish line as the freedom number */
  const at = Object.assign({}, c, { inv: (3000 * 12) / SWR });
  chk("at the freedom number the FI ratio is 100%", Math.abs(firCalc(at).ratio - 1) < 1e-9);
  chk("no spending: no ratio, and the tile says ?", firCalc(Object.assign({}, c, { spend: 0 })).ratio === null);
  /* the Coast card */
  const d0 = derive(c),
    K0 = cstCalc(c, d0);
  chk("under the Coast number: not reached, no card", !K0.reached && !K0.show && d0.coastNum > c.inv, d0.coastNum);
  go("home");
  chk("Home has no card under the Coast number", !app().includes("coastcard"));
  c.invs[0].amt = Math.ceil(d0.coastNum) + 1000;
  syncAll(c);
  save();
  const K1 = cstCalc(c);
  chk("at the Coast number: reached, and the card shows", K1.reached && K1.show && K1.inv >= K1.coast);
  go("home");
  chk(
    "Home shows the calm card with its math and one button",
    app().includes("coastcard") &&
      app().includes("You can stop sprinting") &&
      app().includes("Show the math") &&
      app().includes('data-a="coastok"')
  );
  chk(
    "the card has no red and no verdict word",
    !/class="[^"]*(red|bad)[^"]*"/.test(app().split("coastcard")[1].split("</button>")[0])
  );
  chk("the card says the level of its numbers", /coastcard[\s\S]{0,200}kitst/.test(app()));
  X("coastok");
  chk("one tap closes it, with the day", C().x.coast.seen === todayISO());
  go("home");
  chk("the card shows one time only", !app().includes("coastcard") && cstCalc(C()).reached && !cstCalc(C()).show);
  /* the "i" of the FI ratio: how it differs from While you slept */
  X("keynums");
  X("kngroup", "free");
  X("metric", "firatio");
  chk(
    "the sheet of the FI ratio has an i for the difference from While you slept",
    ov().includes('data-k="gloss:firslept"') && ov().includes("While you slept")
  );
  chk(
    "the i says the 4% draw and the return of the plan",
    /4% draw/.test(GLOSS.firslept[1]) && /return of your plan/.test(GLOSS.firslept[1])
  );
  X("close");
  /* back under Coast after the card was closed: one quiet Recalculating card */
  const top = C().invs[0].amt;
  C().invs[0].amt = Math.round(derive(C()).coastNum) - 5000;
  syncAll(C());
  save();
  const KB = cstCalc(C());
  chk(
    "under Coast again: not reached, the first card stays closed, the below card shows",
    !KB.reached && !KB.show && !!KB.below && KB.below.show
  );
  chk(
    "the gap is the Coast number less the invested money",
    Math.abs(KB.below.by - (KB.coast - KB.inv)) < 1e-6,
    KB.below.by
  );
  /* 2,000 a month goes in (5,000 - 3,000). The saving, counted back to today, covers the gap in month 3. */
  const gB = Math.pow(1 + R, 1 / 12),
    cover = n => (2000 * (1 - Math.pow(gB, -n))) / (gB - 1);
  chk(
    "the new Coast date is the month the saving closes the gap",
    KB.below.months === 3 && cover(2) < KB.below.by && cover(3) >= KB.below.by,
    KB.below.months
  );
  go("home");
  const belowHtml = app().split("coastbelow")[1] || "";
  chk(
    "Home shows Recalculating with Eli's words",
    app().includes("coastbelow") &&
      belowHtml.includes("Recalculating") &&
      /Below Coast by \$[\d,]+\. New Coast date: [A-Z][a-z]{2} \d{4}\./.test(belowHtml)
  );
  chk(
    "it is never a warning: no amber, no red, no blame word",
    !/class="[^"]*(red|bad|warn)[^"]*"/.test(belowHtml.split("coastbelowok")[0]) &&
      !/warning|behind|off track|mistake|fail/i.test(belowHtml.split("coastbelowok")[0])
  );
  X("coastbelowok");
  go("home");
  chk("one tap closes it for this month", !app().includes("coastbelow") && cstCalc(C()).below.show === false);
  chk("the spreadsheet has the months back to Coast", cstBook(C()).rows.find(r => r.id === "fr_back").v === 3);
  delete C().x.coast.below;
  C().invs[0].s = false;
  syncAll(C());
  chk("a guessed balance gets no below card", cstCalc(C()).below === null);
  C().invs[0].s = true;
  C().invs[0].amt = top;
  syncAll(C());
  chk("back at Coast: the below card is gone", cstCalc(C()).below === null && cstCalc(C()).reached);
  /* a Guess gets no card */
  delete C().x.coast;
  C().invs[0].s = false;
  syncAll(C());
  chk("a guessed invested number gets no card", cstCalc(C()).st === "Guess" && !cstCalc(C()).show);
  C().invs[0].s = true;
  syncAll(C());
  /* at or past the stop age the Coast number is the freedom number: the card is not for that day */
  const old = Object.assign({}, C(), { age: 66, ret: 65 });
  chk("past the stop age: no Coast card", !cstCalc(old).show);
  /* the spreadsheet of the plan */
  const B = cstBook(C()),
    row = id => B.rows.find(r => r.id === id);
  chk(
    "the spreadsheet rows: income = invested x rate / 12, ratio = income / spending",
    Math.abs(row("fr_income").v - (row("fr_inv").v * row("fr_rate").v) / 12) < 1e-9 &&
      Math.abs(row("fr_ratio").v - row("fr_income").v / row("fr_spend").v) < 1e-9 &&
      Math.abs(row("fr_coast").v - derive(C()).coastNum) < 1e-9
  );
  chk(
    "the spreadsheet of the plan has the section",
    bookTable(C()).S.some(s => s.title === "FI ratio and Coast")
  );
  const src = require("fs").readFileSync(GAME_DIR + "features/coast.js", "utf8");
  chk("no em dash and no en dash in the file", !/[\u2014\u2013]/.test(src));
  G.chars.splice(n0, 1);
  G.active = 0;
  save();
}
