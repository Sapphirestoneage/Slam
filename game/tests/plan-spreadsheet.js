/* ============================================================================
   SLAM the Game, test: tests/plan-spreadsheet.js
   PURPOSE     Examine the spreadsheet of the plan: each feature of the Plan batch has a section, each
               formula points at real cells, and each formula, worked out the way a spreadsheet does,
               gives the same number as the game. The copy and the key numbers button. The style rules
               of the new files (no em dash, no red, no "probability").
   INPUT       The game scripts, loaded by harness.cjs. One sample profile with each feature answered.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/book.js, and the rows of each feature.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Book",
      led: true,
      placed: true,
      age: 38,
      ret: 60,
      take: 6500,
      spend: 4500,
      inv: 120000,
      deps: "Kids",
      rel: "Married",
      incs: [R0({ k: "A main job", amt: 6500 })],
      spends: [R0({ k: "Home", amt: 2500 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 12000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 80000 }), R0({ k: "Other investments", amt: 40000 })],
      debts: [R0({ k: "Credit card balance", amt: 3000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })],
      goals: [{ id: "g1", k: "Trip", n: "Trip", cost: 5000, era: 4, fund: 0 }],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  kitStore(c, "taxv").gross = { v: 100000, cf: 2 };
  kitStore(c, "mix").fee_0 = { v: "0.5", cf: 2 };
  kitStore(c, "mix").adv = { v: "1", cf: 2 };
  kitStore(c, "cover").years = { v: 15, cf: 2 };
  const B = bookTable(c),
    titles = B.S.map(s => s.title);
  chk(
    "each feature of the batch has a section",
    [
      "Tax view",
      "Retirement odds",
      "Insurance needs",
      "Investment mix and fees",
      "While you slept",
      "Two paths",
      "Simulators",
      "Ask",
      "Savings rate",
      "My plan on one page",
    ].every(t => titles.some(x => x.indexOf(t) === 0)),
    titles
  );
  /* work out each formula the way a spreadsheet does */
  const cellVal = {};
  B.T.forEach((row, i) => {
    if (i > 0) cellVal["C" + (i + 1)] = row[2];
  });
  const FV = (r, n, pmt, pv) => -(pv * Math.pow(1 + r, n) + (r === 0 ? pmt * n : (pmt * (Math.pow(1 + r, n) - 1)) / r));
  const evalF = f => {
    const js = f
      .slice(1)
      .replace(/C(\d+)/g, (m, n) => "(" + Number(evalCell("C" + n)) + ")")
      .replace(/\^/g, "**")
      .replace(/\bMIN\(/g, "Math.min(")
      .replace(/\bMAX\(/g, "Math.max(")
      .replace(/\bROUND\(/g, "RND(")
      .replace(/\bFV\(/g, "FV(");
    return Function(
      "FV",
      "RND",
      "return " + js
    )(FV, (v, d) => Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0));
  };
  const evalCell = k => {
    const v = cellVal[k];
    return typeof v === "string" && v[0] === "=" ? evalF(v) : v;
  };
  let n = 0,
    bad = [];
  B.T.forEach((row, i) => {
    if (i === 0 || typeof row[2] !== "string" || row[2][0] !== "=") return;
    n++;
    const got = evalF(row[2]),
      id = Object.keys(B.pos).find(k => B.pos[k] === i + 1),
      want = B.val[id];
    if (!(Math.abs(got - want) <= Math.max(0.02, Math.abs(want) * 1e-6))) bad.push(row[1] + ": " + got + " vs " + want);
  });
  chk("every formula gives the same number as the game (" + n + " formulas)", n >= 25 && !bad.length, bad.slice(0, 5));
  chk(
    "a formula points at cells of column C, not at numbers typed in",
    B.T.filter(r => typeof r[2] === "string" && r[2][0] === "=").every(r => /C\d+/.test(r[2]))
  );
  chk(
    "an input row says it can be changed, a game-only row says why",
    B.T.some(r => r[4] === "A value you can change") && B.T.some(r => /Worked out by the game/.test(r[4]))
  );
  const csv = bookText(c, true),
    tsv = bookText(c, false);
  chk(
    "the copy has tabs, the file is CSV, both keep the formulas",
    tsv.split("\n")[0].split("\t").length === 5 &&
      csv.split("\n").length === B.T.length &&
      /=MAX\(0,C\d+-C\d+-C\d+\)/.test(tsv)
  );
  X("keynums");
  chk(
    "Key numbers has the spreadsheet buttons next to Copy all my numbers",
    ov().includes('data-a="kncopy"') && ov().includes('data-a="bookcopy"')
  );
  X("book");
  chk(
    "the spreadsheet screen lists each section",
    ov().includes("My plan as a spreadsheet") && ov().includes("Tax view") && clean(ov()),
    junk(ov())
  );
  /* the style rules of the new files */
  const fs = require("fs"),
    files = [
      "features/kit.js",
      "features/taxview.js",
      "features/odds.js",
      "features/cover.js",
      "features/mix.js",
      "features/slept.js",
      "features/sim.js",
      "features/paths.js",
      "features/plan.js",
      "features/ask3.js",
      "features/quota.js",
      "features/book.js",
      "data/market.js",
      "data/limits2026.js",
      "features/retire.js",
    ].concat(fs.readdirSync(GAME_DIR + "features/sims").map(f => "features/sims/" + f)),
    texts = files.map(f => fs.readFileSync(GAME_DIR + f, "utf8"));
  chk(
    "no em dash and no en dash in the new files",
    texts.every(t => !/[\u2014\u2013]/.test(t))
  );
  chk(
    "no red and no word probability in the new files",
    texts.every(t => !/#ff4d6a|var\(--bad\)|probabilit/i.test(t.replace(/adjustmentProbability/g, "")))
  );
  const waitTabs = (n, done) => {
    const t = oddsTabs(c);
    if (t || n > 400) done(t);
    else setTimeout(() => waitTabs(n + 1, done), 25);
  };
  waitTabs(0, T => {
    chk(
      "the engine's percentile table, cash flow table and withdrawal schedule are their own tabs",
      T && T.length === 3 && T.every(t => t.table.length > 0 && t.cols.length === t.table[0].length)
    );
    const tsv = bookTabText(c, 0, false),
      csv = bookTabText(c, 2, true);
    chk(
      "each tab copies as its own table",
      tsv.split("\n")[0].split("\t")[0] === "Age" &&
        tsv.split("\n").length === T[0].table.length + 1 &&
        csv.split("\n")[0].indexOf("Age,") === 0
    );
    X("book");
    chk(
      "the spreadsheet screen offers each tab with its own copy and file",
      ov().includes('data-a="bookcopy" data-v="0"') && ov().includes('data-a="bookfile" data-v="2"') && clean(ov()),
      junk(ov())
    );
    G.chars.length = n0;
    G.active = 0;
    save();
  });
}
