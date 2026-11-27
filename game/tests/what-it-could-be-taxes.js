/* ============================================================================
   SLAM the Game, test: tests/what-it-could-be-taxes.js
   PURPOSE     Examine Batch B, phase 2a (Nov 27 2026), the way "Pay less tax on the way out" of What it
               is / What it could be: the tax lines of the game's tax engine are the lines of the dated
               reference data; the way is a step of the flow with the pattern of a strategy step (a plain
               headline, one line of why, the "i" with what has to go right and the backup, the drop,
               three buttons, a receipt, the chart, Show the math, Back and Next, the one advice line);
               the filing status and the state are two taps and have one home (c.x.taxv); the drop is the
               number of its own math function (lyTaxPlan); What it could be is above What it is only
               because the tax is counted, and the screen says so; a player with one kind of account
               sees why there is no drop; year by year, each year after work draws from the accounts in
               the order of the plan; taking the tax out on the chart takes the plan out.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/paylayers.js (lyTaxPlan, lyNumbers, lyYears, LY_TAX_REF),
               features/cbtax.js (cbTaxLines, cbTaxPlan, cbTaxFill, cbTaxYears, cbTaxDo, cbTaxView,
               cbTaxBookRows), features/couldbe.js (cbParams, cbCounted, cbNumbers, cbFiling, cbChart,
               cbWays, cbWayState, cbCount), features/retire.js (retireTax).
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    junk = h =>
      (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || [])
        .concat(text(h).match(/mistake|failed|\bbehind\b|off track/gi) || [])
        .join(","),
    go = v => X("cbgo", v),
    near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 0.01 : tol),
    fs = require("fs");

  /* ---- 1. the tax lines: the engine, the game's copy and the dated reference file agree ---- */
  const ref = JSON.parse(fs.readFileSync(GAME_DIR + "../data/reference-2026.json", "utf8")),
    D = RetireEngine.data,
    names = { single: "single", joint: "married_filing_jointly", head: "head_of_household" };
  chk(
    "the standard deduction of the tax engine is the dated reference data, for each filing status",
    Object.keys(names).every(
      k =>
        D.STANDARD_DEDUCTION[names[k]] === ref.tax.standardDeduction[k] &&
        LY_TAX_REF.standardDeduction[k] === ref.tax.standardDeduction[k]
    )
  );
  chk(
    "the federal brackets of the tax engine are the dated reference data, for each filing status",
    Object.keys(names).every(
      k =>
        JSON.stringify(D.FEDERAL_BRACKETS[names[k]].map(b => [b.threshold, b.rate])) ===
          JSON.stringify(ref.tax.brackets[k]) &&
        JSON.stringify(LY_TAX_REF.brackets[k]) === JSON.stringify(ref.tax.brackets[k])
    )
  );
  chk(
    "the 0% line for long-term gains of the tax engine is the dated reference data, for each filing status",
    Object.keys(names).every(
      k =>
        D.LTCG_BRACKETS[names[k]].find(b => b.rate > 0).threshold === ref.tax.capitalGains.zeroTo[k] &&
        LY_TAX_REF.zeroGainsTo[k] === ref.tax.capitalGains.zeroTo[k]
    )
  );
  chk(
    "the tax year is the year of the engine's tables, and each figure has a source and the day it was read",
    LY_TAX_REF.year === D.TAX_BASE_YEAR &&
      ref.tax.capitalGains.taxYear === D.TAX_BASE_YEAR &&
      Object.keys(LY_TAX_REF.sources).every(
        k => LY_TAX_REF.sources[k].source && /^2026-\d\d-\d\d$/.test(LY_TAX_REF.sources[k].date)
      )
  );
  chk(
    "the New York table of the tax engine is the table of the reference data (single and joint; for head of household the engine uses the single table: QUESTIONS.md)",
    ["single", "joint"].every(
      k =>
        JSON.stringify(D.STATE_TAX.NY.brackets[names[k]].map(b => [b.threshold, b.rate])) ===
          JSON.stringify(ref.tax.state.NY.brackets[k]) &&
        D.STATE_TAX.NY.standardDeduction[names[k]] === ref.tax.state.NY.standardDeduction[k]
    )
  );

  /* ---- 2. a new player (the four taps): the way is in the flow, and says why there is no drop ---- */
  G = clone(G0);
  G.demo = true;
  W = null;
  X("start");
  X("cbset", "", "", { q: "age", i: 1 });
  X("cbset", "", "", { q: "spend", i: 2 });
  X("cbset", "", "", { q: "inv", i: 3 });
  X("cbset", "", "", { q: "save", i: 3 });
  let c = C();
  chk(
    "the way is a step of the flow, after Social Security and before the last screen",
    CB_STEPS.map(s => s.id)
      .join()
      .indexOf("ss,taxplan") > 0 && CB_STEPS[CB_STEPS.length - 1].id === "end"
  );
  chk(
    "it is numbered with the other ways",
    cbWays().some(w => w.id === "taxplan" && w.title === "Pay less tax on the way out") &&
      /^Way \d+ of \d+$/.test(cbWayNo("taxplan"))
  );
  go("ss");
  go("next");
  chk(
    "Next from Social Security passes over the way while it cannot apply to this player (Batch B, phase 2e)",
    W.step !== "taxplan" && !cbStepInfo(c, "taxplan").applies
  );
  go("taxplan");
  let h = ov();
  chk(
    "the way opens from the list of what cannot apply yet",
    W.step === "taxplan" && text(h).includes("Pay less tax on the way out")
  );
  chk("the screen is clean: no undefined, no long dash, no verdict word", junk(h) === "", junk(h));
  chk(
    "the pattern of a strategy step: the two pinned numbers, one line of why, the i, the drop, Show the math, Next and Back, the one advice line",
    /data-fid="cb:top"/.test(h) &&
      /The 25 times rule counts no tax at all/.test(text(h)) &&
      /data-k="term:cbtaxplan"/.test(h) &&
      /data-fid="cb:drop"/.test(h) &&
      /Show the math/.test(h) &&
      /data-a="cbgo" data-v="next"/.test(h) &&
      /data-a="cbgo" data-v="prev"/.test(h) &&
      /data-fid="cb:trust"/.test(h) &&
      text(h).includes(TRUST_LINE)
  );
  chk(
    "the i has what has to go right and the backup if it doesn't",
    /What has to go right/.test(GLOSS.cbtaxplan[1]) && /Backup if it doesn't/.test(GLOSS.cbtaxplan[1])
  );
  chk(
    "each money term of the plan has its own explanation",
    ["cbfill", "cbconv", "cbzero", "filing"].every(k => GLOSS[k] && GLOSS[k][1].length > 40)
  );
  chk(
    "two taps: the filing status and the state, as chips, from the tax view's own lists",
    TAXV_FILING.every(f => new RegExp('data-k="taxv\\|filing" data-v="' + f[0] + '"').test(h)) &&
      /data-k="taxv\|state" data-v="NY"/.test(h) &&
      /data-k="taxv\|state" data-v=""/.test(h)
  );
  let P = cbTaxPlan(c);
  chk(
    "the four taps count the invested money as one traditional plan: no line beats the usual order",
    P.ok && !P.applies && P.why === "onekind" && P.best === null && cbTaxFill(c) === null
  );
  chk(
    "the screen says why in plain words, shows no drop, and has no button to count nothing",
    /No drop yet/.test(text(h)) &&
      /data-fid="cbtax:why"/.test(h) &&
      /counts as traditional/.test(text(h)) &&
      !/data-a="cbtaxdo"/.test(h) &&
      /data-a="cbrest"/.test(h)
  );
  chk(
    "it still shows what the tax adds the usual way, from the math function",
    P.cost.off < 0 && text(h).includes(cbReceiptWords(P.cost)),
    cbReceiptWords(P.cost)
  );
  const before0 = cbNumbers(c).could.target;
  cbTaxDo("count");
  chk(
    "an answer with no plan counts nothing and moves no number",
    !cbCountedRaw(c).taxplan && !cbCountedRaw(c).wtax && cbNumbers(c).could.target === before0
  );

  /* ---- 3. two taps, one home ---- */
  X("kitset", "single", "taxv|filing", { t: "s" });
  X("kitset", "NY", "taxv|state", { t: "s" });
  chk(
    "the two taps go to the tax view's own answers (c.x.taxv), and the flow reads them from there",
    c.x.taxv.filing.v === "single" &&
      c.x.taxv.state.v === "NY" &&
      taxvInputs(c).state.v === "NY" &&
      cbFiling(c).state === "NY" &&
      cbFiling(c).filing === "single" &&
      !("filing" in (c.x.cb || {})) &&
      !("state" in (c.x.cb || {}))
  );
  h = ov();
  chk(
    "after the tap the list of states folds to one row with a Change button",
    /data-fid="cbtax:state"/.test(h) &&
      /State: NY/.test(text(h)) &&
      /data-a="cbtaxst"/.test(h) &&
      !/data-k="taxv\|state" data-v="CA"/.test(h)
  );
  X("cbtaxst");
  chk("Change opens the list again", /data-k="taxv\|state" data-v="CA"/.test(ov()));
  const pNY = cbParams(c),
    withNY = pNY.tax(60000);
  X("kitset", "", "taxv|state", { t: "s" });
  const noSt = cbParams(c).tax(60000);
  chk(
    "the state's income tax is in the tax of a year, from the engine's table",
    near(withNY - noSt, retireTax(60000, 0, "single", "NY", c.age).state) && withNY > noSt,
    [withNY, noSt]
  );
  X("kitset", "joint", "taxv|filing", { t: "s" });
  chk(
    "the fill lines follow the filing status: the 0% space is the standard deduction of the reference data",
    cbTaxLines(c)[0].fill === ref.tax.standardDeduction.joint &&
      cbTaxLines(c)[2].fill === ref.tax.standardDeduction.joint + ref.tax.brackets.joint[2][0] &&
      cbTaxLines(c).length === 4
  );
  X("kitset", "single", "taxv|filing", { t: "s" });

  /* ---- 4. a mix of accounts: the drop is the math function's number ---- */
  c.invs = [
    { k: "Retirement plan at work", amt: 40000, s: true, tx: "pre" },
    { k: "Roth IRA", amt: 20000, s: true, tx: "roth" },
    { k: "Brokerage", amt: 15000, s: true, tx: "tax" },
  ];
  syncAll(c);
  save();
  go("taxplan");
  h = ov();
  P = cbTaxPlan(c);
  const raw = Object.assign({}, cbCountedRaw(c)),
    M = lyTaxPlan(cbParams(c), raw, cbTaxLines(c));
  chk(
    "with a mix of accounts a line beats the usual order",
    P.applies && P.best && cbTaxLines(c).some(l => l.id === P.best.id) && P.receipt.off > 0,
    JSON.stringify(P.receipt)
  );
  chk(
    "the drop is the number of its own math function (lyTaxPlan)",
    near(P.receipt.off, M.receipt.off) && P.receipt.months === M.receipt.months && P.best.id === M.best.id,
    [P.receipt.off, M.receipt.off]
  );
  chk(
    "the screen shows that drop in the words of a receipt",
    text(h).includes(cbReceiptWords(M.receipt)) && /The plan against the usual order/.test(text(h)),
    cbReceiptWords(M.receipt)
  );
  chk(
    "three buttons: Count this, Already doing it, Not for me",
    ["count", "did", "no"].every(v => new RegExp('data-a="cbtaxdo" data-v="' + v + '"').test(h))
  );
  chk(
    "the plan names its three moves, each with an i",
    /data-fid="cbtax:plan"/.test(h) &&
      ["cbfill", "cbconv", "cbzero"].every(k => new RegExp('data-k="term:' + k + '"').test(h)) &&
      text(h).includes(money(Math.round(P.best.fill)))
  );
  chk("the screen with a plan is clean", junk(h) === "", junk(h));
  const isT = cbNumbers(c).is.target,
    free = cbNumbers(c).could.target;
  X("cbtaxdo", "count");
  h = ov();
  let N = cbNumbers(c);
  chk(
    "Count this counts the plan and the tax itself",
    !!cbCountedRaw(c).taxplan &&
      !!cbCountedRaw(c).wtax &&
      cbWayState(c, "taxplan").how === "count" &&
      cbCounted(c).taxplan.fill === P.best.fill
  );
  chk(
    "the number is now the plan's number of the math function",
    near(N.could.target, M.with.could.target) && N.could.age === M.with.could.age,
    [N.could.target, M.with.could.target]
  );
  chk(
    "What it could be is above the number with no tax only because the tax is counted, and the screen says so",
    N.could.target > free &&
      N.above === N.could.target > isT + 0.5 &&
      N.raisedBy.join() === "wtax" &&
      (!N.above || /Above What it is, because you counted tax on traditional withdrawals/.test(text(h)))
  );
  chk(
    "the receipt: counted, the drop against the usual order, and that the tax is in the number",
    /data-fid="cb:receipt"/.test(h) && /Counted\./.test(text(h)) && /The tax itself is in your number now/.test(text(h))
  );
  chk("What it is does not move", cbNumbers(c).is.target === isT);
  const plainN = lyNumbers(cbParams(c), { wtax: {} });
  chk(
    "the plan never costs more than the usual order with the same tax counted",
    N.could.target <= plainN.could.target + 0.5 || N.could.age < plainN.could.age
  );
  X("cbtaxdo", "did");
  chk(
    "Already doing it counts it too",
    cbWayState(c, "taxplan").how === "did" && !!cbCountedRaw(c).taxplan && /Already yours, and counted/.test(text(ov()))
  );
  X("cbtaxdo", "no");
  chk(
    "Not for me takes the plan out, and the tax that this way brought in: the number goes back",
    !cbCountedRaw(c).taxplan &&
      !cbCountedRaw(c).wtax &&
      cbNumbers(c).could.target === free &&
      /Left out/.test(text(ov()))
  );
  /* the tax was counted on the chart first: the way leaves it in when the plan is taken out */
  cbCount("wtax", {});
  X("cbtaxdo", "count");
  X("cbtaxdo", "no");
  chk(
    "a tax the player counted on the chart stays counted when the plan is taken out",
    !!cbCountedRaw(c).wtax && !cbCountedRaw(c).taxplan && near(cbNumbers(c).could.target, plainN.could.target, 0.5)
  );
  X("cbtaxdo", "count");
  cbCount("wtax", false);
  chk(
    "taking the tax out of the number on the chart takes the plan out too",
    !cbCountedRaw(c).wtax &&
      !cbCountedRaw(c).taxplan &&
      !cbWayState(c, "taxplan").counted &&
      cbNumbers(c).could.target === free
  );

  /* ---- 5. year by year: which account each year draws from ---- */
  X("cbtaxdo", "count");
  const Y = cbTaxYears(c, P.best.fill),
    K = cbChart(c),
    late = K.rows.filter(r => !r.planWork);
  chk(
    "the chart of the flow follows the plan once it is counted, by the same year-by-year run",
    K.fill === P.best.fill &&
      late.length === Y.rows.length &&
      late.every((r, i) => near(r.pre, Y.rows[i].pre) && near(r.conv, Y.rows[i].conv))
  );
  chk(
    "each year after work: traditional money and what moves to Roth stay within the fill line, and the layers add up to the line",
    late.every(
      r =>
        (r.pre + r.conv <= P.best.fill + 0.01 ||
          r.tax + r.roth < 0.01 ||
          r.gap > 0 ||
          r.tax + r.roth + r.hsa + 0.01 >= r.line - r.ss - r.other - r.pre) &&
        near(r.work + r.tax + r.pre + r.roth + r.hsa + r.ss + r.other + r.gap, r.line, 0.05)
    )
  );
  chk(
    "the usual order drains the taxable account first; the plan takes traditional money in the first year after work",
    cbChart(c, null, { plan: null }).rows.find(r => !r.planWork).pre === 0 &&
      late[0].pre > 0 &&
      near(late[0].pre, Math.min(P.best.fill, late[0].line), 0.01)
  );
  chk(
    "the tax of each year is the engine's tax on that year's traditional money (taken out and moved)",
    Y.rows.every(r => near(r.wtax, cbParams(c).tax(r.ord), 0.01) && near(r.ord, r.pre + r.conv))
  );
  chk(
    "the room for 0% gains of a year is the engine's own figure",
    Y.rows.every(r => r.room0 === retireTax(r.ord, 0, "single", "", c.age).gainsRoom) &&
      Y.gains.line === ref.tax.capitalGains.zeroTo.single
  );
  go("taxplan");
  h = ov();
  chk(
    "the screen has the chart split by account and the year-by-year table, collapsed",
    /Which account pays each year, with the plan/.test(text(h)) &&
      ["Taxable", "Traditional", "Roth"].every(n => text(h).includes(n)) &&
      /<details class="math cbtaxy"/.test(h) &&
      !/<details class="math cbtaxy" open/.test(h) &&
      (h.match(/<tr>/g) || []).length === Y.bars.length + 1
  );
  chk(
    "Show the math names the tax year, the lines that were tried, what is not counted, and the dated sources",
    text(h).includes("Tax year " + LY_TAX_REF.year) &&
      /The lines that were tried/.test(text(h)) &&
      /Not counted: tax on Social Security, tax on gains/.test(text(h)) &&
      text(h).includes(LY_TAX_REF.sources.zeroGainsTo.date) &&
      text(h).includes(LY_TAX_REF.sources.standardDeduction.source)
  );

  /* ---- 6. the last screen and the spreadsheet ---- */
  go("reveal");
  h = ov();
  chk(
    "the reveal lists the way with where it stands, one tap away",
    /data-a="cbquick" data-k="taxplan"/.test(h) && /Pay less tax on the way out/.test(text(h)) && junk(h) === ""
  );
  const B = cbBook(c).rows,
    row = id => B.find(r => r.id === id);
  chk(
    "the spreadsheet of the plan has the usual order, the plan and the drop",
    row("cb_taxplain") &&
      row("cb_taxplan") &&
      near(row("cb_taxdrop").v, row("cb_taxplain").v - row("cb_taxplan").v) &&
      row("cb_taxfill").v === P.best.fill
  );

  /* ---- 7. a state changes the number through the same tax function ---- */
  const tNo = cbNumbers(c).could.target;
  X("kitset", "NY", "taxv|state", { t: "s" });
  chk(
    "with a state picked, the counted tax is higher or the same, never lower",
    cbNumbers(c).could.target >= tNo - 0.5,
    [cbNumbers(c).could.target, tNo]
  );
  go("taxplan");
  chk(
    "Show the math says the state tax is from the regular table and can be lower in real life",
    /State tax \(NY\)/.test(text(ov())) && /can be lower/.test(text(ov()))
  );

  G = clone(G0);
  W = null;
}
