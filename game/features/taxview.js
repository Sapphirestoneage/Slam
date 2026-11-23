/* ============================================================================
   SLAM the Game: features/taxview.js
   PURPOSE     The tax view. From pay before taxes, the filing status and the pre-tax contributions, it
               shows the top federal bracket, the average rate, the room left in the bracket, whether
               pre-tax or Roth leans better this year, and the room for 0% long-term capital gains. State
               tax is the guess of the player, as a percent. The result feeds the key numbers, so
               take-home pay stops using the 80% default.
   INPUT       The profile: c.take, c.rel, c.deps, c.x.taxv (the answers), c.x.taxPct, c.x.kin.pre. The
               open sheet (W.kind): taxv. The taps of the player.
   OUTPUT      Functions: taxvInputs, taxvBracket, taxvCalc, taxvNetShare, taxvSheet, taxvBook,
               taxvFormula. Actions (ACT): taxv. Menu: "Your tax view".
   DEPENDS ON  data/tax2026.js, core/engine.js, screens/ui.js, core/metrics.js, features/kit.js.
   RULES       Pre-tax or Roth uses the same rule as the account line (acRec in eras.js): Roth at a top rate
               of 12% or below, or when the rate now is below the rate later.
               Federal tax only, from the 2026 IRS numbers. State tax is the guess of the player, and the
               screen says so. Payroll tax is Social Security (6.2% up to the wage base) and Medicare
               (1.45%). A result from a guess shows Guess. No verdict words.
   ========================================================================= */
const TAXV_FILING = [
  ["single", "Single"],
  ["joint", "Married, filing together"],
  ["head", "Head of household"],
];
const TAXV_PAY = [30000, 45000, 60000, 80000, 100000, 130000, 170000, 220000, 300000];
const TAXV_PRE = [0, 100, 250, 500, 750, 1000, 1500, 2000];
const TAXV_STATE = [0, 2, 3, 4, 5, 6, 7, 9];
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
    state: kitValue(c, "taxv", "state", 4),
  };
}
/* Federal tax on taxable income, with the bracket it ends in. */
function taxvBracket(taxable, filing) {
  const B = TAX_2026.brackets[filing] || TAX_2026.brackets.single;
  let tax = 0,
    i = 0;
  for (let k = 0; k < B.length; k++) {
    const start = B[k][0],
      end = k + 1 < B.length ? B[k + 1][0] : Infinity;
    if (taxable > start) {
      tax += (Math.min(taxable, end) - start) * B[k][1];
      i = k;
    }
  }
  return { tax, top: B[i][1], start: B[i][0], next: i + 1 < B.length ? B[i + 1][0] : null };
}
function taxvCalc(c, over) {
  over = over || {};
  const I = taxvInputs(c),
    filing = over.filing || I.filing.v,
    gross = over.gross != null ? over.gross : I.gross.v,
    pre = (over.pre != null ? over.pre : I.pre.v) * 12,
    statePct = I.state.v,
    std = TAX_2026.standard[filing] || TAX_2026.standard.single,
    agi = Math.max(0, gross - pre),
    taxable = Math.max(0, agi - std),
    br = taxvBracket(taxable, filing),
    P = TAX_2026.payroll,
    fica = Math.min(gross, P.ssBase) * P.ss + gross * P.medicare,
    state = (agi * statePct) / 100,
    net = Math.max(0, gross - pre - br.tax - fica - state),
    d = derive(c);
  let later = 0.12,
    laterTaxable = 0;
  try {
    const ss = passives(c).full * 12;
    laterTaxable = Math.max(0, d.fiSpend - ss - std);
    later = laterTaxable > 0 ? taxvBracket(laterTaxable, filing).top : 0.1;
  } catch (e) {
    report(e, "taxview.js: taxvCalc");
  }
  /* the same rule as the account line (acRec in eras.js): Roth at 12% or below, or when the rate now is below the rate later */
  const lean = br.top <= 0.12 || br.top < later ? "Roth" : br.top > later ? "Pre-tax" : "Either";
  return {
    filing,
    gross,
    pre,
    statePct,
    std,
    agi,
    taxable,
    federal: br.tax,
    top: br.top,
    room: br.next == null ? null : br.next - taxable,
    avg: gross > 0 ? br.tax / gross : 0,
    fica,
    state,
    net,
    netShare: gross > 0 ? (net + pre) / gross : KN_NET,
    later,
    laterTaxable,
    lean,
    gainsRoom: Math.max(0, (TAX_2026.gainsZero[filing] || 0) - taxable),
    st: kitState([I.filing, I.gross, I.pre]),
    given: I.gross.given,
    I,
  };
}
/* Part of knNet() in metrics.js. When the player gave pay before taxes here, the share of pay that lands
   comes from the brackets, not from the 80% default. Pre-tax contributions count as kept pay. */
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
/* The federal tax as one spreadsheet formula on the cell of taxable income. */
function taxvFormula(filing, cell) {
  const B = TAX_2026.brackets[filing] || TAX_2026.brackets.single;
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
  const T = taxvCalc(c);
  return {
    title: "Tax view, " + TAX_2026.year,
    rows: [
      {
        id: "tx_gross",
        label: "Pay before taxes, a year",
        v: T.gross,
        note: T.I.gross.given ? "Your answer" : "Guess",
      },
      { id: "tx_pre", label: "Pre-tax contributions, a year", v: T.pre, note: "Your answer" },
      { id: "tx_std", label: "Standard deduction (" + T.filing + ")", v: T.std, note: TAX_2026.source },
      { id: "tx_taxable", label: "Taxable income", v: T.taxable, f: "=MAX(0,{tx_gross}-{tx_pre}-{tx_std})" },
      { id: "tx_fed", label: "Federal income tax", v: T.federal, f: taxvFormula(T.filing, "{tx_taxable}") },
      { id: "tx_avg", label: "Average federal rate", v: T.avg, f: "={tx_fed}/{tx_gross}" },
      {
        id: "tx_fica",
        label: "Social Security and Medicare",
        v: T.fica,
        f:
          "=MIN({tx_gross}," +
          TAX_2026.payroll.ssBase +
          ")*" +
          TAX_2026.payroll.ss +
          "+{tx_gross}*" +
          TAX_2026.payroll.medicare,
      },
      { id: "tx_statepct", label: "State tax, your guess (percent)", v: T.statePct, note: "Guess" },
      { id: "tx_state", label: "State tax", v: T.state, f: "=({tx_gross}-{tx_pre})*{tx_statepct}/100" },
      {
        id: "tx_net",
        label: "Take-home pay, a year",
        v: T.net,
        f: "=MAX(0,{tx_gross}-{tx_pre}-{tx_fed}-{tx_fica}-{tx_state})",
      },
      {
        id: "tx_gains",
        label: "Room for 0% long-term gains",
        v: T.gainsRoom,
        f: "=MAX(0," + TAX_2026.gainsZero[T.filing] + "-{tx_taxable})",
      },
    ],
  };
}
function taxvSheet() {
  const c = C(),
    T = taxvCalc(c),
    I = T.I,
    P = v => kitPct(v, 1);
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
    `<div class="small muted">Federal tax for ${TAX_2026.year}, from the IRS numbers. Tap what fits. A guess is fine.</div>` +
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
      "State and city income tax, your guess",
      TAXV_STATE.map(v => [v, v + "%"]),
      I.state.v,
      { help: "The game does not work out state tax. This percent is your own guess." }
    ) +
    `<div class="grid2">${kitTile("Top federal bracket", P(T.top), "the rate on your last dollar", T.st, "bracket")}${kitTile("Average federal rate", P(T.avg), "of all your pay", T.st, "avgrate")}${kitTile("Room left in this bracket", T.room == null ? "Top bracket" : money(T.room), T.room == null ? "no higher bracket" : "before the rate goes up", T.st)}${kitTile("Room for 0% long-term gains", money(T.gainsRoom), "of taxable income", T.st, "gains0")}</div>` +
    `<div class="tile small kitlean"><b>${esc(lean)}</b> ${kitPill(T.st)}</div>` +
    `<div class="tile small">Take-home from these numbers: <b>${money(Math.round(T.net / 12))} a month</b>. State tax in it is your guess of ${T.statePct}%. ${kitPill("Guess")}</div>` +
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
      "Federal tax: each slice of taxable income times the rate of its bracket = " + money(T.federal) + ".",
      "Average rate: " + money(T.federal) + " ÷ " + money(T.gross) + " = " + P(T.avg) + ".",
      "Social Security and Medicare: 6.2% of pay up to " +
        money(TAX_2026.payroll.ssBase) +
        ", plus 1.45% = " +
        money(T.fica) +
        ".",
      "Later rate: your spending a year, " +
        money(derive(c).fiSpend) +
        ", minus the Social Security the game expects, minus the standard deduction, lands in the " +
        P(T.later) +
        " bracket.",
      "0% gains room: " + money(TAX_2026.gainsZero[T.filing]) + " − " + money(T.taxable) + ".",
      "Source: " + TAX_2026.source + ", tax year " + TAX_2026.year + ".",
    ]) +
    `<button class="ghost wide slim" data-a="simopen" data-v="roth">Pre-tax or Roth: run the simulator</button>`
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
  avgrate: ["Average tax rate", "Your federal tax divided by all your pay. It is lower than your top bracket."],
  gains0: [
    "0% long-term gains",
    "Gains on investments held more than a year pay no federal tax while your taxable income stays under a set line.",
  ],
});
kitScreen(
  "taxv",
  "Your tax view",
  "Your federal bracket and rates for this year, from the IRS numbers.",
  "It shows if pre-tax or Roth leans better for you now."
);
Object.assign(ACT, {
  taxv: () => {
    W = { kind: "taxv", o: {} };
    sheet(taxvSheet);
  },
});
kitMenu("Your tax view", "taxv", "Your bracket, your rate, and pre-tax or Roth this year", "owed");
