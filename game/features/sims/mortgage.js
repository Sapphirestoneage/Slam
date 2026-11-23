/* ============================================================================
   SLAM the Game: features/sims/mortgage.js
   PURPOSE     Simulator 2: pay off the mortgage early, or invest the same money. Flip points: the
               mortgage rate and the investment return. The function payoffRun is shared with
               simulator 3 (features/sims/debt.js).
   INPUT       The profile (c.x.home, when the player gave a mortgage). The answers: c.x.sim_mortgage.
   OUTPUT      One simulator (simAdd), with the functions payoffRun and mortgageRun.
   DEPENDS ON  features/sim.js, features/kit.js.
   RULES       Both options pay the same money each month: the payment plus the extra. Option 1 puts the
               extra on the loan, and after the loan is gone it invests the whole amount. Option 2 pays
               the normal payment and invests the extra. Net worth is what is invested minus what is
               still owed. Taxes on gains and the mortgage interest deduction are left out.
   ========================================================================= */
/* Pay extra on a loan, or invest the extra. Returns the delta of each option by month. */
function payoffRun(bal, ratePct, pmt, extra, retPct, months) {
  const lr = ratePct / 1200,
    rr = retPct / 1200;
  let bA = bal,
    bB = bal,
    iA = 0,
    iB = 0,
    offA = null;
  const dA = [-bal],
    dB = [-bal];
  for (let m = 1; m <= months; m++) {
    const intA = bA * lr,
      payA = Math.min(bA + intA, pmt + extra);
    bA = Math.max(0, bA + intA - payA);
    iA = iA * (1 + rr) + (pmt + extra - payA);
    if (bA <= 0 && offA == null) offA = m;
    const intB = bB * lr,
      payB = Math.min(bB + intB, pmt);
    bB = Math.max(0, bB + intB - payB);
    iB = iB * (1 + rr) + (pmt - payB) + extra;
    dA.push(iA - bA);
    dB.push(iB - bB);
  }
  return { dA, dB, offA };
}
function mortgageRun(c, x) {
  const months = Math.round(x.years * 12),
    pmt = simLoanPayment(x.bal, x.rate, x.years),
    P = payoffRun(x.bal, x.rate, pmt, x.extra, x.ret, months);
  return {
    years: x.years,
    options: [
      { id: "pay", n: "Pay extra on the mortgage", delta: P.dA, extra: 0, once: 0 },
      { id: "invest", n: "Invest the extra", delta: P.dB, extra: 0, once: 0 },
    ],
    ref: "invest",
    pmt,
    off: P.offA,
  };
}
simAdd({
  id: "mortgage",
  n: "Pay off the mortgage early or invest",
  ask: "Does extra money do more on your mortgage or invested?",
  links: ["housing", "mortgage", "debt"],
  inputs: [
    {
      k: "bal",
      label: "What you owe on the mortgage",
      opts: [100000, 200000, 300000, 400000, 600000].map(v => [v, money(v)]),
      def: c => (c.x && c.x.home && c.x.home.bal) || 300000,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "rate",
      label: "Mortgage rate",
      opts: [3, 4, 5, 6, 7, 8].map(v => [v, v + "%"]),
      def: 6,
      term: "mortgagerate",
      fmt: v => Math.round(v * 10) / 10 + "%",
    },
    {
      k: "years",
      label: "Years left on the loan",
      opts: [10, 15, 20, 25, 30].map(v => [v, v + " years"]),
      def: 25,
      fmt: v => Math.round(v) + " years",
    },
    {
      k: "extra",
      label: "Extra money a month",
      opts: [100, 250, 500, 1000].map(v => [v, money(v)]),
      def: 250,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "ret",
      label: "Investment return a year, before inflation",
      opts: [4, 5, 6, 7, 8].map(v => [v, v + "%"]),
      def: 7,
      fmt: v => Math.round(v * 10) / 10 + "%",
    },
  ],
  run: mortgageRun,
  flips: [
    {
      k: "rate",
      lo: 1,
      hi: 12,
      steps: 44,
      axis: "Across: the mortgage rate. Up: how far paying extra is ahead.",
      say: (v, aAbove) =>
        (aAbove ? "Above a " : "Below a ") +
        Math.round(v * 10) / 10 +
        "% mortgage rate, paying it off early wins. " +
        (aAbove ? "Below it, investing wins." : ""),
      none: () => "The mortgage rate does not flip the answer between 1% and 12%.",
    },
    {
      k: "ret",
      lo: 1,
      hi: 12,
      steps: 44,
      axis: "Across: the investment return. Up: how far paying extra is ahead.",
      say: (v, aAbove) =>
        (aAbove ? "Above a " : "Below a ") + Math.round(v * 10) / 10 + "% return, paying it off early wins.",
      none: () => "The investment return does not flip the answer between 1% and 12%.",
    },
  ],
  math: (c, x, r) => [
    "Payment: " +
      money(Math.round(r.raw.pmt)) +
      " a month on " +
      money(x.bal) +
      " at " +
      x.rate +
      "% over " +
      x.years +
      " years.",
    "Paying extra: the loan is gone in about " +
      (r.raw.off ? fmtDur(r.raw.off) : "the full term") +
      ", then the whole payment is invested.",
    "Investing: " + money(x.extra) + " a month grows at " + x.ret + "% a year.",
    "Net worth here: what is invested minus what is still owed. Taxes on gains and the interest deduction are left out.",
  ],
});
