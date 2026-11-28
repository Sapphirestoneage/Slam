/* ============================================================================
   SLAM the Game: features/sims/rentbuy.js
   PURPOSE     Simulator 1: rent or buy. The bank's payment first (principal and interest). Then the true
               cost of owning line by line: property tax, home insurance, PMI under 20% down, HOA,
               maintenance, big repairs spread out. The true cost of renting: rent, renter's insurance,
               rent growth. The year owning comes out ahead, the price-to-rent ratio and the 5% rule.
               Flip points: the stay length and the mortgage rate.
   INPUT       The profile (the home line of spending for the rent). The answers: c.x.sim_rentbuy.
   OUTPUT      One simulator (simAdd), with the functions rentbuyDefaultRent, rentbuyArgs, rentbuyRun,
               rentbuyExtra, rentbuyBook.
   DEPENDS ON  core/homebuy.js (hbRun, hbBreakeven, hbPriceToRent, hbFivePercent, hbBreakevenWords,
               hbMath, hbCompareMath, HB_OPTS, HB_LINES), features/sim.js, features/kit.js.
   RULES       No math in this file. core/homebuy.js works out each number. It is a copy of
               js/math/homebuy.js of the main app, and home.html of the web app uses the same functions.
               Property tax, home insurance, PMI, HOA, big repairs and renter's insurance have no
               typical number: no dated source exists for one. They count as nothing until the player
               taps their own number, and the screen says which lines are not counted yet.
               Dollars are future dollars. No option is called wrong.
   ========================================================================= */
function rentbuyDefaultRent(c) {
  const r = (c.spends || []).find(x => /^home|rent/i.test(x.k));
  const v = r ? r.amt : (c.spend || 3000) * 0.35;
  return HB_OPTS.rent.reduce((b, k) => (Math.abs(k - v) < Math.abs(b - v) ? k : b), HB_OPTS.rent[0]);
}
/* The answers of the simulator as the input of hbRun. A line with no typical number is null until the
   player taps it (x._st says which answers the player gave). */
function rentbuyArgs(x) {
  const st = x._st || {},
    own = k => (!x._st || (st[k] && st[k].given) ? x[k] : null);
  return {
    price: x.price,
    downPct: x.down,
    ratePct: x.rate,
    years: 30,
    stay: x.stay,
    taxPct: own("tax"),
    insYear: own("ins"),
    pmiPct: own("pmi"),
    hoa: own("hoa"),
    maintPct: x.maint,
    repairsYear: own("repairs"),
    rent: x.rent,
    rentIns: own("rentIns"),
    rentGrowthPct: x.rentGrowth,
    homeGrowthPct: x.homeGrowth,
    closingPct: x.closing,
    sellingPct: x.selling,
    retPct: x.ret,
  };
}
function rentbuyRun(c, x) {
  const H = hbRun(rentbuyArgs(x));
  return {
    years: H.stay,
    options: [
      { id: "buy", n: "Buy", delta: H.dBuy, extra: H.more, once: H.once, cash: H.once },
      { id: "rent", n: "Rent", delta: H.dRent, extra: 0, once: 0, cash: 0 },
    ],
    ref: "rent",
    pmt: H.pmt,
    once: H.once,
    home: H,
  };
}
const RB_$ = v => money(Math.round(v));
const RB_NAME = {
  taxPct: "tax",
  insYear: "ins",
  pmiPct: "pmi",
  hoa: "hoa",
  repairsYear: "repairs",
  rentIns: "rentIns",
};
/* Part of simSheet() in sim.js (the "extra" of this simulator). The bank's payment, the true cost of
   owning and of renting in the first month, the breakeven year, and the two rules of thumb. */
function rentbuyExtra(c, x, R1, st) {
  const A = rentbuyArgs(x),
    H = R1.raw.home,
    B = hbBreakeven(A),
    F = hbFivePercent(A.price, A.rent),
    P = hbPriceToRent(A.price, A.rent),
    f = H.first,
    open = H.open.map(k => (HB_LINES.find(l => l.key === k) || {}).name).filter(Boolean),
    g = st === "Guess" ? " guess" : "",
    val = (k, v) => (H.open.indexOf(k) >= 0 ? "Tap yours" : RB_$(v)),
    row = (l, v, note) =>
      `<div class="row between small" style="gap:8px"><span>${esc(l)}${note ? ` <span class="tiny muted">${esc(note)}</span>` : ""}</span><b class="${g.trim()}">${v}</b></div>`,
    not = k => (H.open.indexOf(k) >= 0 ? "not counted yet" : "");
  return (
    `<div class="tile stack rbcost" style="gap:6px"><div class="row between"><b class="small">What the bank shows</b>${kitPill(st)}</div>` +
    row("Principal and interest", RB_$(f.pi) + " a month") +
    `<div class="tiny muted">This is the number of a bank's payment calculator. Owning costs more than this.</div></div>` +
    `<div class="tile stack rbcost" style="gap:6px"><div class="row between"><b class="small">The true cost of owning, month 1</b>${kitPill(st)}</div>` +
    row("Principal and interest", RB_$(f.pi)) +
    row("Property tax", val("taxPct", f.tax), not("taxPct")) +
    row("Home insurance", val("insYear", f.ins), not("insYear")) +
    (H.under20
      ? row(
          "PMI",
          val("pmiPct", f.pmi),
          not("pmiPct") ||
            (H.pmiMonths >= H.months
              ? "paid for the whole stay"
              : H.pmiMonths
                ? "ends after " + fmtDur(H.pmiMonths)
                : "")
        )
      : "") +
    row("HOA", val("hoa", f.hoa), not("hoa")) +
    row("Maintenance", RB_$(f.maint)) +
    row("Big repairs, spread out", val("repairsYear", f.repairs), not("repairsYear")) +
    row("All of it", RB_$(f.total) + " a month") +
    (open.length
      ? `<div class="tiny muted">Not counted yet: ${esc(open.join(", "))}. These are your own numbers. Tap them above and they count.</div>`
      : "") +
    `</div>` +
    `<div class="tile stack rbcost" style="gap:6px"><b class="small">The true cost of renting, month 1</b>` +
    row("Rent", RB_$(H.firstRent.rent)) +
    row("Renter's insurance", val("rentIns", H.firstRent.ins), not("rentIns")) +
    row("All of it", RB_$(H.firstRent.total) + " a month") +
    `<div class="tiny muted">Rent and renter's insurance go up ${esc(String(A.rentGrowthPct))}% a year here.</div></div>` +
    `<div class="tile stack rbeven" style="gap:6px"><div class="row between"><b class="small">The breakeven year</b>${kitPill(st)}</div><div class="small">${esc(hbBreakevenWords(B))}</div>` +
    row("Price-to-rent ratio", P == null ? "?" : String(Math.round(P * 10) / 10)) +
    `<div class="row between small" style="gap:8px"><span>The 5% rule ${kitInfo("fivepct")}</span><b>${RB_$(F.line)} a month</b></div>` +
    `<div class="tiny muted">${F.rentLess ? "The rent is under that line. By this rule, renting costs less." : "The rent is at or over that line. By this rule, owning costs less."} A rule of thumb, next to your own numbers above. ${kitInfo("pricetorent")}</div></div>`
  );
}
/* Rows for the spreadsheet of the plan (simBook in sim.js adds them). */
function rentbuyBook(c, x) {
  const A = rentbuyArgs(x),
    H = hbRun(A),
    B = hbBreakeven(A),
    F = hbFivePercent(A.price, A.rent),
    P = hbPriceToRent(A.price, A.rent),
    n = "Worked out by the game: a month-by-month run";
  return [
    { id: "rb_loan", label: "Rent or buy: the loan", v: H.loan, f: "={sm_rentbuy_price}*(1-{sm_rentbuy_down}/100)" },
    {
      id: "rb_pi",
      label: "Rent or buy: principal and interest a month",
      v: H.pmt,
      f: "=PMT({sm_rentbuy_rate}/1200,360,-{rb_loan})",
    },
    { id: "rb_own1", label: "Rent or buy: the true cost of owning, month 1", v: H.first.total, note: n },
    { id: "rb_rent1", label: "Rent or buy: the true cost of renting, month 1", v: H.firstRent.total, note: n },
    {
      id: "rb_even",
      label: "Rent or buy: the year owning comes out ahead",
      v: B.never ? "" : B.year,
      note: B.never ? "Renting is cheaper the whole time, looking 30 years ahead" : n,
    },
    {
      id: "rb_ptr",
      label: "Rent or buy: price-to-rent ratio",
      v: P,
      f: "={sm_rentbuy_price}/({sm_rentbuy_rent}*12)",
    },
    {
      id: "rb_five",
      label: "Rent or buy: the 5% rule, a month",
      v: F.line,
      f: "={sm_rentbuy_price}*0.05/12",
    },
  ];
}
const RB_OWN = "Your own number. It counts as nothing until you tap it.";
simAdd({
  id: "rentbuy",
  n: "Rent or buy",
  ask: "Does buying a home leave you ahead of renting, for the time you plan to stay?",
  links: ["housing", "home"],
  inputs: [
    {
      k: "price",
      label: "Home price",
      opts: HB_OPTS.price.map(v => [v, RB_$(v)]),
      def: 400000,
      typed: true,
      fmt: RB_$,
    },
    {
      k: "rate",
      label: "Mortgage rate",
      opts: HB_OPTS.ratePct.map(v => [v, v + "%"]),
      def: 6.5,
      term: "mortgagerate",
      fmt: v => Math.round(v * 10) / 10 + "%",
    },
    {
      k: "down",
      label: "Down payment",
      opts: HB_OPTS.downPct.map(v => [v, v + "%"]),
      def: 10,
      fmt: v => Math.round(v) + "%",
    },
    {
      k: "stay",
      label: "How long you would stay",
      opts: HB_OPTS.stay.map(v => [v, v + " years"]),
      def: 7,
      fmt: v => Math.round(v * 10) / 10 + " years",
    },
    {
      k: "rent",
      label: "Rent for a place like it, a month",
      opts: HB_OPTS.rent.map(v => [v, RB_$(v)]),
      def: rentbuyDefaultRent,
      typed: true,
      fmt: RB_$,
    },
    {
      k: "tax",
      label: "Property tax a year",
      opts: HB_OPTS.taxPct.map(v => [v, v + "% of the value"]),
      def: 0,
      term: "proptax",
      help: RB_OWN + " Your county's site or a listing shows it.",
      fmt: v => v + "%",
      more: true,
    },
    {
      k: "ins",
      label: "Home insurance a year",
      opts: HB_OPTS.insYear.map(v => [v, RB_$(v)]),
      def: 0,
      typed: true,
      help: RB_OWN + " A quote from an insurer shows it.",
      fmt: RB_$,
      more: true,
    },
    {
      k: "pmi",
      label: "PMI a year, when the down payment is under 20%",
      opts: HB_OPTS.pmiPct.map(v => [v, v + "% of the loan"]),
      def: 0,
      term: "pmi",
      help: RB_OWN + " The lender's loan estimate shows it.",
      fmt: v => v + "%",
      more: true,
    },
    {
      k: "hoa",
      label: "HOA a month",
      opts: HB_OPTS.hoa.map(v => [v, RB_$(v)]),
      def: 0,
      typed: true,
      term: "hoa",
      help: RB_OWN + " The listing shows it. $0 when there is none.",
      fmt: RB_$,
      more: true,
    },
    {
      k: "maint",
      label: "Maintenance a year",
      opts: HB_OPTS.maintPct.map(v => [v, v + "% of the value"]),
      def: 1.5,
      term: "upkeep",
      help: "Typical: 1 to 2% of the home's value a year.",
      fmt: v => v + "%",
      more: true,
    },
    {
      k: "repairs",
      label: "Big repairs, set aside a year",
      opts: HB_OPTS.repairsYear.map(v => [v, RB_$(v)]),
      def: 0,
      typed: true,
      help: RB_OWN + " A roof, a furnace, windows: the cost divided by the years it lasts.",
      fmt: RB_$,
      more: true,
    },
    {
      k: "rentIns",
      label: "Renter's insurance a month",
      opts: HB_OPTS.rentIns.map(v => [v, RB_$(v)]),
      def: 0,
      help: RB_OWN,
      fmt: RB_$,
      more: true,
    },
    {
      k: "rentGrowth",
      label: "Rent growth a year",
      opts: HB_OPTS.rentGrowthPct.map(v => [v, v + "%"]),
      def: 3.5,
      help: "Typical: 3 to 4% a year.",
      fmt: v => v + "%",
      more: true,
    },
    {
      k: "homeGrowth",
      label: "Home price growth a year",
      opts: HB_OPTS.homeGrowthPct.map(v => [v, v + "%"]),
      def: 3,
      fmt: v => v + "%",
      more: true,
    },
    {
      k: "closing",
      label: "Closing costs to buy",
      opts: HB_OPTS.closingPct.map(v => [v, v + "%"]),
      def: 3,
      fmt: v => v + "%",
      more: true,
    },
    {
      k: "selling",
      label: "Costs to sell",
      opts: HB_OPTS.sellingPct.map(v => [v, v + "%"]),
      def: 6,
      fmt: v => v + "%",
      more: true,
    },
    {
      k: "ret",
      label: "Investment return a year, before inflation",
      opts: HB_OPTS.retPct.map(v => [v, v + "%"]),
      def: 7,
      fmt: v => v + "%",
      more: true,
    },
  ],
  moreLabel: "The other costs of owning and renting, and what you assume",
  run: rentbuyRun,
  extra: rentbuyExtra,
  book: rentbuyBook,
  flips: [
    {
      k: "stay",
      lo: 1,
      hi: 30,
      steps: 58,
      axis: "Across: years you stay. Up: how far buying is ahead of renting.",
      say: (v, aAbove) =>
        (aAbove ? "Buying wins if you stay more than " : "Renting wins if you stay more than ") +
        Math.round(v * 10) / 10 +
        " years.",
      none: (a, b, x) =>
        rentbuyRun(C(), Object.assign({}, x, { stay: 30 })).options[0].delta.slice(-1)[0] >
        rentbuyRun(C(), Object.assign({}, x, { stay: 30 })).options[1].delta.slice(-1)[0]
          ? "Buying wins for every stay from 1 to 30 years."
          : "Renting wins for every stay from 1 to 30 years.",
    },
    {
      k: "rate",
      lo: 2,
      hi: 12,
      steps: 50,
      axis: "Across: the mortgage rate. Up: how far buying is ahead of renting.",
      say: (v, aAbove) => (aAbove ? "Above " : "Below ") + Math.round(v * 10) / 10 + "%, buying wins.",
      none: () => "The rate does not flip the answer between 2% and 12%.",
    },
  ],
  math: (c, x, r) => {
    const A = rentbuyArgs(x);
    return hbMath(r.raw.home, A).concat(
      [
        "Property tax and maintenance follow the home's value. Insurance, HOA and big repairs go up with it too.",
        "PMI is paid while the loan is over 80% of the price you paid, when the down payment is under 20%.",
      ],
      hbCompareMath(A),
      [
        "Price-to-rent ratio: the price divided by 12 months of rent. The 5% rule: 5% of the price a year, divided by 12.",
      ]
    );
  },
});
kitTerms({
  mortgagerate: [
    "Mortgage rate",
    "The interest the bank charges on the home loan each year. A lender's quote shows yours. A higher rate makes the same home cost more each month.",
  ],
  upkeep: [
    "Maintenance",
    "What it takes each year to keep a home in the same shape: small fixes, paint, the yard, things that wear out. A common range is 1 to 2% of the home's value a year.",
  ],
  proptax: [
    "Property tax",
    "A tax the town or county charges each year on the value of the home. It differs a lot from place to place, so the game has no typical number. A listing or the county's site shows it.",
  ],
  pmi: [
    "PMI",
    "Private mortgage insurance. A lender adds it when the down payment is under 20% of the price. It protects the lender, not you. Here it stops when the loan falls to 80% of the price you paid.",
  ],
  hoa: [
    "HOA",
    "Homeowners association dues. Some homes, mostly condos and planned neighborhoods, charge a fee each month for shared costs.",
  ],
  fivepct: [
    "The 5% rule",
    "A rule of thumb taught by Ben Felix. The costs of owning that never come back (property tax, maintenance, and the cost of the money tied up in the home) are about 5% of the home's value a year. Divide that by 12. If you can rent a place like it for less, renting costs less by this rule.",
  ],
  pricetorent: [
    "Price-to-rent ratio",
    "The price of a home divided by one year of rent for a place like it. A higher number means buying costs more next to renting in that place. Use it to compare places. It is not a verdict.",
  ],
});
