/* ============================================================================
   SLAM the Game: features/taxview.js
   PURPOSE     The tax view. From pay before taxes, the filing status, the state and the pre-tax
               contributions: the top federal bracket, the average rate (federal plus state), the room left
               in the bracket, whether pre-tax or Roth leans better this year, and the room for 0%
               long-term capital gains. The taxes come from the 2026 federal, payroll and state tables of
               the retirement engine (through features/retire.js). The result feeds the key numbers, so
               take-home pay stops using the 80% default.
   INPUT       The profile: c.take, c.rel, c.deps, c.age, c.x.taxv (the answers), c.x.taxPct, c.x.kin.pre.
               The open sheet (W.kind): taxv. The taps of the player.
   OUTPUT      Functions: taxvInputs, taxvCalc, taxvNetShare, taxvFormula, taxvBook, taxvSheet. Actions
               (ACT): taxv. Parts of functions in other files: taxvNetShare (knNet in metrics.js). Menu:
               "Your tax view".
   DEPENDS ON  core/engine.js, screens/ui.js, core/metrics.js, features/retire.js (retireTax, RETIRE_STATES),
               features/kit.js.
   RULES       Pre-tax or Roth uses the same rule as the account line (acRec in eras.js): Roth at a top rate
               of 12% or below, or when the rate now is below the rate later. The state is one tap list;
               a state with no income tax, or "Not sure", counts no state tax and says so. Payroll tax is
               Social Security up to the wage base and Medicare, from the engine's payroll table. A result
               from a guess shows Guess. No verdict words.
   ========================================================================= */
const TAXV_FILING = [
  ["single", "Single"],
  ["joint", "Married, filing together"],
  ["head", "Head of household"],
];
const TAXV_PAY = [30000, 45000, 60000, 80000, 100000, 130000, 170000, 220000, 300000];
const TAXV_PRE = [0, 100, 250, 500, 750, 1000, 1500, 2000];
function taxvInputs(c) {
  const filing0 = c.rel === "Married" ? "joint" : c.deps === "Kids" ? "head" : "single",
    tp = c.x && c.x.taxPct,
    gross0 = Math.round(((c.take || 0) * 12) / (tp ? 1 - Math.min(0.6, tp / 100) : KN_NET) / 1000) * 1000,
    kin = (c.x && c.x.kin) || {},
    pre0 = kin.pre && kin.pre.v != null ? kin.pre.v : 0;
  return {
    filing: kitValue(c, "taxv", "filing", filing0),
    gross: kitValue(c, "taxv", "gross", gross0),
    pre: kitValue(c, "taxv", "pre", pre0),
    state: kitValue(c, "taxv", "state", ""),
  };
}
function taxvCalc(c, over) {
  over = over || {};
  const I = taxvInputs(c),
    filing = over.filing || I.filing.v,
    gross = over.gross != null ? over.gross : I.gross.v,
    pre = (over.pre != null ? over.pre : I.pre.v) * 12,
    state = over.state != null ? over.state : I.state.v,
    X = retireTax(gross, pre, filing, state, c.age),
    net = Math.max(0, gross - pre - X.federal - X.fica - X.state),
    d = derive(c);
  let later = 0.12,
    laterTaxable = 0;
  try {
    const ss = passives(c).full * 12;
    laterTaxable = Math.max(0, d.fiSpend - ss - X.std);
    later = laterTaxable > 0 ? retireTax(d.fiSpend - ss, 0, filing, "", Math.max(c.age, c.ret)).top : 0.1;
  } catch (e) {
    report(e, "taxview.js: taxvCalc");
  }
  /* the same rule as the account line (acRec in eras.js) */
  const lean = X.top <= 0.12 || X.top < later ? "Roth" : X.top > later ? "Pre-tax" : "Either";
  return {
    filing,
    gross,
    pre,
    state,
    std: X.std,
    agi: X.agi,
    taxable: X.taxable,
    federal: X.federal,
    stateTax: X.state,
    top: X.top,
    room: X.next == null ? null : X.next - X.taxable,
    avg: gross > 0 ? (X.federal + X.state) / gross : 0,
    fedAvg: gross > 0 ? X.federal / gross : 0,
    fica: X.fica,
    net,
    netShare: gross > 0 ? (net + pre) / gross : KN_NET,
    later,
    laterTaxable,
    lean,
    gainsRoom: X.gainsRoom,
    X,
    st: kitState([I.filing, I.gross, I.pre, I.state.given ? I.state : { cf: 1 }]),
    given: I.gross.given,
    I,
  };
}
/* Part of knNet() in metrics.js. When the player gave pay before taxes here, the share of pay that lands
   comes from the tax tables, not from the 80% default. Pre-tax contributions count as kept pay. */
function taxvNetShare(c) {
  try {
    const I = taxvInputs(c);
    if (!I.gross.given || !(I.gross.v > 0)) return null;
    const T = taxvCalc(c);
    return { f: Math.max(0.3, Math.min(0.98, T.netShare)), cf: Math.min(I.gross.cf, I.filing.given ? I.filing.cf : 2) };
  } catch (e) {
    report(e, "taxview.js: taxvNetShare");
    return null;
  }
}
/* A bracket table as one spreadsheet formula on the cell of taxable income. B is a list of [start, rate]. */
function taxvFormula(B, cell) {
  return (
    "=" +
    B.map((b, k) =>
      k + 1 < B.length
        ? b[1] + "*MAX(0,MIN(" + cell + "," + B[k + 1][0] + ")-" + b[0] + ")"
        : b[1] + "*MAX(0," + cell + "-" + b[0] + ")"
    ).join("+")
  );
}
/* Rows for the spreadsheet (book.js). */
function taxvBook(c) {
  const T = taxvCalc(c),
    X = T.X,
    rows = [
      {
        id: "tx_gross",
        label: "Pay before taxes, a year",
        v: T.gross,
        note: T.I.gross.given ? "Your answer" : "Guess",
      },
      { id: "tx_pre", label: "Pre-tax contributions, a year", v: T.pre, note: "Your answer" },
      {
        id: "tx_std",
        label: "Standard deduction (" + X.fs + ")",
        v: T.std,
        note: "IRS, from the engine's federal table, updated " + X.info["federal-tax-2026"].updated,
      },
      { id: "tx_taxable", label: "Taxable income", v: T.taxable, f: "=MAX(0,{tx_gross}-{tx_pre}-{tx_std})" },
      { id: "tx_fed", label: "Federal income tax", v: T.federal, f: taxvFormula(X.brackets, "{tx_taxable}") },
    ];
  if (X.stateCfg) {
    rows.push({
      id: "tx_sstd",
      label: "State deduction (" + T.state + ")",
      v: X.stateCfg.std,
      note: "Tax Foundation, from the engine's state table",
    });
    rows.push({
      id: "tx_sincome",
      label: "State taxable income",
      v: Math.max(0, T.agi - X.stateCfg.std),
      f: "=MAX(0,{tx_gross}-{tx_pre}-{tx_sstd})",
    });
    rows.push({
      id: "tx_state",
      label: "State income tax",
      v: T.stateTax,
      f: taxvFormula(X.stateCfg.brackets, "{tx_sincome}"),
    });
  } else
    rows.push({
      id: "tx_state",
      label: "State income tax",
      v: 0,
      note: T.state ? "No state income tax on pay" : "No state picked",
    });
  rows.push(
    { id: "tx_avg", label: "Average rate, federal plus state", v: T.avg, f: "=({tx_fed}+{tx_state})/{tx_gross}" },
    {
      id: "tx_fica",
      label: "Social Security and Medicare",
      v: T.fica,
      f: "=MIN({tx_gross}," + X.payroll.base + ")*" + X.payroll.oasdi + "+{tx_gross}*" + X.payroll.medicare,
    },
    {
      id: "tx_net",
      label: "Take-home pay, a year",
      v: T.net,
      f: "=MAX(0,{tx_gross}-{tx_pre}-{tx_fed}-{tx_fica}-{tx_state})",
    },
    { id: "tx_gains", label: "Room for 0% long-term gains", v: T.gainsRoom, f: "=MAX(0," + X.zero + "-{tx_taxable})" }
  );
  return { title: "Tax view, " + X.year, rows };
}
function taxvSheet() {
  const c = C(),
    T = taxvCalc(c),
    I = T.I,
    P = v => kitPct(v, 1),
    info = T.X.info;
  const lean =
    T.lean === "Roth"
      ? "Roth leans better this year. Your top rate now, " +
        P(T.top) +
        (T.top <= 0.12
          ? ", is one of the two lowest brackets."
          : ", is below the " + P(T.later) + " the game expects when you draw the money.")
      : T.lean === "Pre-tax"
        ? "Pre-tax leans better this year. Your top rate now, " +
          P(T.top) +
          ", is above the " +
          P(T.later) +
          " the game expects when you draw the money."
        : "Both are close this year. Your top rate now and later are both about " +
          P(T.top) +
          ", so a split of the two is a fair choice.";
  return (
    head("Plan", "Your tax view") +
    `<div class="small muted">Federal and state tax for ${T.X.year}, from the tax tables of the retirement engine. Tap what fits. A guess is fine.</div>` +
    kitAsk(c, "taxv", "filing", "How do you file?", TAXV_FILING, I.filing.v, { term: "filing" }) +
    kitAsk(
      c,
      "taxv",
      "gross",
      "Pay before taxes, a year",
      TAXV_PAY.map(v => [v, money(v)]),
      I.gross.v,
      { typed: true, term: "gross", help: "The top line of a pay stub, times the paychecks in a year." }
    ) +
    kitAsk(
      c,
      "taxv",
      "pre",
      "Pre-tax contributions, a month",
      TAXV_PRE.map(v => [v, money(v)]),
      I.pre.v,
      { typed: true, term: "pretax", help: "What goes into a plan at work before your pay lands." }
    ) +
    kitAsk(
      c,
      "taxv",
      "state",
      "Which state do you live in?",
      [["", "Not sure"]].concat(RETIRE_STATES.map(s => [s, s])),
      I.state.v,
      { help: "Nine states tax no pay. Not sure counts no state tax." }
    ) +
    `<div class="grid2">${kitTile("Top federal bracket", P(T.top), "the rate on your last dollar", T.st, "bracket")}${kitTile("Average rate", P(T.avg), "federal plus state, of all your pay", T.st, "avgrate")}${kitTile("Room left in this bracket", T.room == null ? "Top bracket" : money(T.room), T.room == null ? "no higher bracket" : "before the rate goes up", T.st)}${kitTile("Room for 0% long-term gains", money(T.gainsRoom), "of taxable income", T.st, "gains0")}</div>` +
    `<div class="tile small kitlean"><b>${esc(lean)}</b> ${kitPill(T.st)}</div>` +
    `<div class="tile small">Take-home from these numbers: <b>${money(Math.round(T.net / 12))} a month</b>. ${T.state ? (T.stateTax > 0 ? "State tax in it: " + money(Math.round(T.stateTax)) + " a year." : T.state + " has no state income tax on pay.") : "No state picked, so no state tax is in it."} ${kitPill(T.st)}</div>` +
    (T.given
      ? `<div class="tiny muted">Your key numbers now use this view for pay before taxes, not the 80% default.</div>`
      : `<div class="tiny muted">Tap your pay before taxes and your key numbers use this view in place of the 80% default.</div>`) +
    mathBox([
      "Taxable income: " +
        money(T.gross) +
        " pay − " +
        money(T.pre) +
        " pre-tax − " +
        money(T.std) +
        " standard deduction = " +
        money(T.taxable) +
        ".",
      "Federal tax: each slice of taxable income times the rate of its bracket = " + money(Math.round(T.federal)) + ".",
      T.state
        ? "State tax (" +
          T.state +
          "): " +
          money(Math.round(T.stateTax)) +
          ", from the state's own brackets and deduction."
        : "State tax: none counted.",
      "Average rate: (" +
        money(Math.round(T.federal)) +
        " + " +
        money(Math.round(T.stateTax)) +
        ") ÷ " +
        money(T.gross) +
        " = " +
        P(T.avg) +
        ".",
      "Social Security and Medicare: " +
        kitPct(T.X.payroll.oasdi) +
        " of pay up to " +
        money(T.X.payroll.base) +
        ", plus " +
        kitPct(T.X.payroll.medicare, 2) +
        " = " +
        money(Math.round(T.fica)) +
        ".",
      "Later rate: your spending a year, " +
        money(derive(c).fiSpend) +
        ", minus the Social Security the game expects, minus the standard deduction, lands in the " +
        P(T.later) +
        " bracket.",
      "0% gains room: " + money(T.X.zero) + " − " + money(T.taxable) + ".",
      "Sources: federal " +
        info["federal-tax-2026"].source +
        " (updated " +
        info["federal-tax-2026"].updated +
        "); state " +
        info["state-income-tax-2026"].source +
        " (updated " +
        info["state-income-tax-2026"].updated +
        "); payroll " +
        info["payroll-tax-2026"].source +
        ".",
    ]) +
    `<div class="tiny muted">${esc(RETIRE_CREDIT)}.</div><button class="ghost wide slim" data-a="simopen" data-v="roth">Pre-tax or Roth: run the simulator</button>`
  );
}
kitTerms({
  filing: [
    "Filing status",
    "How you file your tax return: single, married filing together, or head of household (single with a dependent at home).",
  ],
  gross: ["Pay before taxes", "What you earn before tax and anything else comes out of your paycheck."],
  pretax: [
    "Pre-tax contributions",
    "Money that goes into a plan at work before tax is taken. It lowers your tax this year. You pay tax when you take it out.",
  ],
  bracket: ["Tax bracket", "A slice of income with one rate. Only the dollars inside a slice pay that slice's rate."],
  avgrate: [
    "Average tax rate",
    "Your federal and state tax divided by all your pay. It is lower than your top bracket.",
  ],
  gains0: [
    "0% long-term gains",
    "Gains on investments held more than a year pay no federal tax while your taxable income stays under a set line.",
  ],
});
kitScreen(
  "taxv",
  "Your tax view",
  "Your federal bracket and your rates for this year, from the 2026 tax tables.",
  "It shows if pre-tax or Roth leans better for you now."
);
Object.assign(ACT, {
  taxv: () => {
    W = { kind: "taxv", o: {} };
    sheet(taxvSheet);
  },
});
kitMenu("Your tax view", "taxv", "Your bracket, your rate, and pre-tax or Roth this year", "owed");
