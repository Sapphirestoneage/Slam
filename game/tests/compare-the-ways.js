/* ============================================================================
   SLAM the Game, test: tests/compare-the-ways.js
   PURPOSE     Examine "Compare the ways": the copy of the rules is the same code as the main app, the
               run of odds.js with a way agrees with a calculation by hand, each row has each number,
               the ways that are switched off give the reason and no number, the sort, the filter and
               the pins, the custom way, the chart, the tab, the spreadsheet rows and the built row.
   INPUT       The game scripts, loaded by harness.cjs. One sample profile.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/ways.js, core/withdraw.js, features/odds.js (oddsRun
               with a way), features/takeout.js (the tab), features/book.js, features/built.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1e-6 : t),
    a = Object.assign(newChar(), {
      name: "Ways",
      led: true,
      placed: true,
      age: 45,
      ret: 55,
      take: 8000,
      spend: 5500,
      inv: 700000,
      incs: [R0({ k: "A main job", amt: 8000 })],
      spends: [R0({ k: "Home", amt: 3000 }), R0({ k: "Food", amt: 2500 })],
      cashes: [R0({ k: "Checking", amt: 20000 })],
      invs: [
        R0({ k: "Retirement plan at work", amt: 500000 }),
        R0({ k: "IRA or Roth IRA", amt: 100000 }),
        R0({ k: "Other investments", amt: 100000 }),
      ],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");

  /* 1. The copy of the rules is the same code as js/math/withdraw.js of the main app. */
  const fs = require("fs"),
    path = require("path"),
    src = fs
      .readFileSync(path.join(GAME_DIR, "..", "js", "math", "withdraw.js"), "utf8")
      .split("\n")
      .filter(l => !l.startsWith("// SPDX-License-Identifier"))
      .join("\n")
      .replace(/^export /gm, ""),
    copy = fs.readFileSync(path.join(GAME_DIR, "core", "withdraw.js"), "utf8");
  chk("the copy of the rules ends with the code of the main app, word for word", copy.endsWith(src));
  chk(
    "the copy has the header of a game file",
    /SLAM the Game: core\/withdraw\.js/.test(copy) && /GENERATED FILE/.test(copy)
  );
  chk("the list has the 8 families and more than 30 ways", WAY_FAMILIES.length === 8 && WAYS.length === 34);
  chk(
    "each family has a default row",
    WAY_FAMILIES.every(f => WAYS.some(w => w.family === f.id))
  );

  /* 2. One run of odds.js with a way, against a calculation by hand. */
  const P = cmpInputs(a),
    flat = (g, n) => Array.from({ length: n }, () => [g, g, 0, null, null, null]);
  chk(
    "the inputs are the inputs of the retirement odds, with the return of the plan",
    P.inv === 700000 && P.ret === 55 && P.growth > 0 && P.spend === oddsInputs(a).spend
  );
  {
    /* steady 4%, a smooth market at 5%, no other income: the same amount each year */
    const Q = Object.assign({}, P, {
        age: 55,
        ret: 55,
        death: 58,
        inv: 1000000,
        ss: 0,
        now: 0,
        pen: null,
        growth: 0.05,
        way: wayById("steady-4"),
      }),
      r = oddsRun(Q, flat(0.05, 3));
    let p = 1000000;
    for (let i = 0; i < 3; i++) p = (p - 40000) * 1.05;
    chk(
      "steady 4%: each year pays 40,000",
      r.paid.length === 3 && r.paid.every(y => near(y.spend, 40000) && near(y.aim, 40000))
    );
    chk("steady 4%: the money at the end is the hand calculation", near(r.end, p, 1e-4), r.end + " " + p);
    /* the same way, paid each month and at the end of the year */
    const m = oddsRun(Object.assign({}, Q, { way: wayById("steady-monthly") }), flat(0.05, 3)),
      e = oddsRun(Object.assign({}, Q, { way: wayById("steady-end") }), flat(0.05, 3)),
      g = Math.pow(1.05, 1 / 12);
    let pm = 1000000,
      pe = 1000000;
    for (let i = 0; i < 3; i++) {
      pm = pm * 1.05 - ((40000 / 12) * g * (Math.pow(g, 12) - 1)) / (g - 1);
      pe = pe * 1.05 - 40000;
    }
    chk("paid each month: twelve steps give the annuity formula", near(m.end, pm, 1e-3), m.end + " " + pm);
    chk("paid at the end of the year", near(e.end, pe, 1e-4));
    chk("the month sits between the first day and the last day", r.end < m.end && m.end < e.end);
    /* guardrails: a fall of 40% in year one brings a cut of 10% in year two */
    const G2 = Object.assign({}, Q, { spend: 50000, way: wayById("guard") }),
      rg = oddsRun(G2, [[-0.4, -0.4, 0, null, null, null]].concat(flat(0.05, 2)));
    chk(
      "guardrails: year one pays the need, year two pays 10% less",
      near(rg.paid[0].spend, 50000) && near(rg.paid[1].spend, 45000),
      JSON.stringify(rg.paid)
    );
    /* other income pays first */
    const S2 = Object.assign({}, Q, { now: 10000, death: 56 }),
      rs = oddsRun(S2, flat(0.05, 1));
    chk("other income pays first, and the rest comes out of the money", near(rs.end, (1000000 - 30000) * 1.05, 1e-4));
    /* Die With Zero: what comes out uses the money up, and income adds to the spending */
    const D2 = Object.assign({}, Q, { now: 10000, way: wayById("age-dwz") }),
      rd = oddsRun(D2, flat(0.05, 3));
    chk("Die With Zero: the money ends at zero on the smooth market", near(rd.end, 0, 1e-3), rd.end);
    chk(
      "Die With Zero: income adds to the spending",
      rd.paid[0].spend > 10000 && near(rd.paid[0].spend - 10000, spendDownPayment(1000000, 0, 3, 0.05), 1e-4)
    );
    /* the money runs out: the year is short, and the run says the age */
    const big = oddsRun(
      Object.assign({}, Q, { way: wayCustom({ kind: "steady", rate: 0.1 }), death: 75 }),
      flat(-0.05, 20)
    );
    chk(
      "a run that ends early has the age and the short years",
      !big.ok && big.shortAge > 55 && big.paid.some(y => y.short > 0)
    );
    /* the old run of the odds did not change */
    const old = oddsRun(
      Object.assign({}, P),
      flat(0.05, P.death - P.age).map(x => [x[0], x[1]])
    );
    chk(
      "the run of the retirement odds has no way and no list of years",
      old.paid === null && typeof old.ok === "boolean"
    );
  }

  /* 3. Each row. */
  const ways = cmpWays(a),
    rows = ways.map(w => cmpRow(a, w)),
    live = rows.filter(r => !r.off),
    row = id => rows.find(r => r.id === id);
  chk("each way has a row", rows.length === WAYS.length);
  chk(
    "each live row has each number",
    live.every(r =>
      ["first", "random", "real", "ok", "n", "worstYear", "drop", "cuts", "end", "years", "atStop", "need"].every(
        k => typeof r[k] === "number" && isFinite(r[k])
      )
    ),
    live.filter(r => !isFinite(r.first)).map(r => r.id)
  );
  chk(
    "the random markets are 1,000",
    live.every(r => r.randomRuns === 1000 && r.randomOk >= 0 && r.randomOk <= 1000)
  );
  chk(
    "the 4% rule pays 4% of the money at the stop age",
    near(row("steady-4").first, 0.04 * row("steady-4").atStop, 1e-6)
  );
  chk("guardrails start at the need", near(row("guard").first, P.spend, 1e-6));
  chk("the 4% rule never cuts", row("steady-4").deepest === 1 || row("steady-4").deepest == null);
  chk(
    "guardrails cut, and never below 70%",
    row("guard").deepest < 1 && row("guard").deepest >= 0.7 - 1e-9 && row("guard").cuts > 0
  );
  chk(
    "5% holds in fewer start years than 3%",
    row("steady-5").ok / row("steady-5").n <= row("steady-3").ok / row("steady-3").n
  );
  chk(
    "a way with 50 years counts 50 years, and fewer start years",
    row("steady-50").years === 50 && row("steady-50").n < row("steady-30").n
  );
  chk(
    "the CAPE rule starts in 1881",
    row("market-cape").from === 1881 && MARKET_HISTORY.years[10][4] === 18.47 && MARKET_HISTORY.years[0][4] === null
  );
  chk(
    "the odds in a band come from the engine and give numbers here",
    !row("guard-risk").off && row("guard-risk").first > 0
  );
  chk(
    "VPW is switched off, with the reason and no number",
    /Switched off/.test(row("age-vpw").off) && row("age-vpw").first === undefined
  );
  chk("the RMD method is switched off for a stop before 73", /starts at 73/.test(row("age-rmd").off));
  chk(
    "the age work can stop: 3% needs more years than 4%",
    row("steady-3").stopAge >= row("steady-4").stopAge && row("steady-4").stopAge >= a.age
  );
  chk("the row is kept: the second call gives the same object", cmpRow(a, ways[0]) === rows[0]);
  {
    const H = wayHistory(cmpReal(cmpPlan(P, wayById("steady-4"), P.ret)), 0.999);
    chk("the row has the counts of the replay", H.ok === row("steady-4").ok && H.n === row("steady-4").n);
    const math = wayMath(row("guard"), money, "the source");
    chk(
      "the math of a row has a line for each number",
      math.length >= 8 && math.every(l => !/undefined|NaN|null/.test(l)),
      math.join(" | ")
    );
  }

  /* 4. The chart: the start year 1966, one line for each row. */
  {
    const Ch = cmpChart(a, ["steady-4", "guard", "age-vpw"]);
    chk("the chart starts in 1966", Ch.year === 1966);
    chk("a way that is switched off has no line", Ch.lines.length === 2 && Ch.lines[0].id === "steady-4");
    chk(
      "each line has one point for each year",
      Ch.lines.every(l => l.pts.length === P.death - P.ret && l.pts[0][0] === P.ret)
    );
  }

  /* 5. The tab: the default rows, the variants, the filter, the sort, the pins, the custom way. */
  X("takeout", "compare");
  let h = ov();
  chk("the tab shows", /Compare the ways/.test(h) && /The 4% rule/.test(h) && /Guardrails, 20% bands/.test(h));
  chk("the tab has no defect", clean(h), junk(h));
  chk("the default row of each family shows", (h.match(/class="tile stack cmprow/g) || []).length === 8);
  chk("each family has an i, and each row has an i", /term:wayf_steady/.test(h) && /term:way_steady-4"/.test(h));
  chk(
    "the i has plain words and the name of its author",
    /William Bengen/.test(GLOSS["way_steady-4"][1]) && /Guyton/.test(GLOSS.wayf_guardrails[1])
  );
  chk("each row has its math, closed", (h.match(/<details class="math"/g) || []).length >= 8);
  chk(
    "the line of plain words has no verdict",
    /What this means for you/.test(h) &&
      !/should|best|worse|better|mistake|fail|behind|off track/i.test(wayMeaning(rows, [], money))
  );
  /* where the card of one row starts in the sheet, or -1 */
  const card = name => ov().indexOf('<b class="small" style="min-width:0">' + name + "</b>");
  chk("the variants are closed first", /Show variants \(11\)/.test(h) && !/Steady at 3%/.test(h));
  X("cmpopen", "steady");
  h = ov();
  chk(
    "a tap opens the variants of one family",
    /Steady at 3%/.test(h) && /4%, paid monthly/.test(h) && /Hide variants/.test(h) && clean(h),
    junk(h)
  );
  X("cmpfilter", "nocut");
  h = ov();
  chk("the filter keeps the rows that never cut", card("The 4% rule") >= 0 && card("Guardrails, 20% bands") < 0);
  X("cmpfilter", "first");
  chk(
    "the highest year one comes first",
    card("Steady at 5%") >= 0 &&
      card("Steady at 5%") < card("The 4% rule") &&
      card("The 4% rule") < card("Steady at 3%")
  );
  X("cmpfilter", "all");
  X("cmpsort", "cuts");
  chk("a sort by a column shows the direction", /Years with a cut ↓/.test(ov()));
  X("cmpsort", "cuts");
  chk("a second tap turns the order round", /Years with a cut ↑/.test(ov()));
  X("cmpsort", "");
  X("cmppin", "steady-4");
  X("cmppin", "guard");
  X("cmppin", "floor");
  X("cmppin", "share-4");
  chk("at most 3 pins, the oldest goes", cmpPicks(a).pins.join(",") === "guard,floor,share-4");
  h = ov();
  chk("the pinned rows show at the top", /Pinned \(3 of 3\)/.test(h) && /class="cmppins"/.test(h) && /Unpin/.test(h));
  X("cmppin", "guard");
  chk("a second tap removes the pin", cmpPicks(a).pins.join(",") === "floor,share-4");
  X("cmpset", "share", "kind");
  X("cmpset", "0.05", "rate");
  X("cmpset", "monthly", "timing");
  X("cmpset", "40", "horizon");
  {
    const c = cmpWays(a).find(w => w.custom),
      r = cmpRow(a, c);
    chk(
      "the custom way takes the family, the rate, the timing and the years",
      c.rule === "percent" && c.rate === 0.05 && c.timing === "monthly" && c.horizon === 40 && r.years === 40
    );
    chk("the custom row has numbers", r.first > 0 && near(r.first, 0.05 * r.atStop, 1e-6));
  }
  ACT.cmprate({ dataset: { v: "4.25" } });
  chk("the slider keeps the rate when the player lets go", cmpPicks(a).rate === 0.0425);
  ACT.cmprate({ dataset: { v: "55" } });
  chk("a typed rate stays between 1% and 10%", cmpPicks(a).rate === 0.1);
  h = ov();
  chk(
    "the custom way has a slider, chips and a box to type in",
    /type="range"/.test(h) && /type="number"/.test(h) && /Build your own/.test(h) && clean(h),
    junk(h)
  );
  chk(
    "the sheet is still clean with all families open",
    (() => {
      WAY_FAMILIES.forEach(f => {
        if (!W.cmp.open[f.id]) X("cmpopen", f.id);
      });
      const t = ov();
      return clean(t) && /Switched off/.test(t) && (t.match(/class="tile stack cmprow/g) || []).length >= WAYS.length;
    })()
  );

  /* 6. The spreadsheet, the built row, the menu. */
  {
    const B = cmpBook(a),
      id = k => B.rows.find(r => r.id === k);
    chk("the spreadsheet has the section", BOOK_PARTS.indexOf(cmpBook) >= 0 && B.rows.length > 40);
    chk(
      "the 4% row is a formula of the money and the share",
      id("cw_steady_first").f === "={cw_at}*{cw_steady_rate}" &&
        near(id("cw_at").v * id("cw_steady_rate").v, id("cw_steady_first").v, 1)
    );
    chk("a month is the year divided by 12", id("cw_guardrails_month").f === "={cw_guardrails_first}/12");
    chk(
      "no row of the section has a defect",
      B.rows.every(r => r.v !== undefined && !(typeof r.v === "number" && isNaN(r.v)))
    );
    const built = WB.find(r => /Compare the ways/.test(r[1]));
    chk("the built row is there and its probe is true", !!built && built[3]() === true);
    chk(
      "the tab is in the list of tabs",
      TKO_TABS.some(t => t[0] === "compare")
    );
  }
  G.chars.splice(n0, 1);
  G.active = 0;
  save();
}
