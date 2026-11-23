/* ============================================================================
   SLAM the Game: features/sims/debt.js
   PURPOSE     Simulator 3: pay extra on a debt, or invest the extra, by the rate of the debt. Flip
               point: the rate of the debt.
   INPUT       The profile (the high-interest debt and its rate). The answers: c.x.sim_debt.
   OUTPUT      One simulator (simAdd), with the function debtSimRun.
   DEPENDS ON  features/sim.js, features/sims/mortgage.js (payoffRun), features/kit.js.
   RULES       The same rules as the mortgage simulator: both options pay the same money each month.
   ========================================================================= */
function debtSimRun(c, x) {
  const months = Math.round(x.years * 12),
    P = payoffRun(x.bal, x.rate, x.pay, x.extra, x.ret, months);
  return {
    years: x.years,
    options: [
      { id: "pay", n: "Pay extra on the debt", delta: P.dA, extra: 0, once: 0 },
      { id: "invest", n: "Invest the extra", delta: P.dB, extra: 0, once: 0 },
    ],
    ref: "invest",
    off: P.offA,
  };
}
simAdd({
  id: "debt",
  n: "Pay extra on debt or invest",
  ask: "At the rate of your debt, does extra money do more on the debt or invested?",
  links: ["debt"],
  inputs: [
    {
      k: "bal",
      label: "What you owe",
      opts: [2000, 5000, 10000, 20000, 40000].map(v => [v, money(v)]),
      def: c => Math.max(1000, Math.round((hiDebt(c) || c.debt || 5000) / 1000) * 1000),
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "rate",
      label: "Its rate a year",
      opts: [4, 6, 8, 12, 18, 24, 29].map(v => [v, v + "%"]),
      def: c => (hiDebt(c) > 0 ? Math.round(hiRate(c)) : 18),
      term: "apr",
      fmt: v => Math.round(v * 10) / 10 + "%",
    },
    {
      k: "pay",
      label: "The normal payment a month",
      opts: [50, 100, 200, 400, 800].map(v => [v, money(v)]),
      def: 200,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "extra",
      label: "Extra money a month",
      opts: [50, 100, 250, 500].map(v => [v, money(v)]),
      def: 100,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "ret",
      label: "Investment return a year, before inflation",
      opts: [4, 5, 6, 7, 8].map(v => [v, v + "%"]),
      def: 7,
      fmt: v => v + "%",
    },
    {
      k: "years",
      label: "Years to look ahead",
      opts: [3, 5, 10].map(v => [v, v + " years"]),
      def: 5,
      fmt: v => v + " years",
    },
  ],
  run: debtSimRun,
  flips: [
    {
      k: "rate",
      lo: 0.5,
      hi: 30,
      steps: 59,
      axis: "Across: the rate of the debt. Up: how far paying extra is ahead.",
      say: (v, aAbove) =>
        (aAbove ? "Above " : "Below ") +
        Math.round(v * 10) / 10 +
        "%, paying the debt wins. " +
        (aAbove ? "Below " + Math.round(v * 10) / 10 + "%, investing wins." : ""),
      none: () => "The rate does not flip the answer between 0.5% and 30%.",
    },
  ],
  math: (c, x, r) => [
    "Both options pay " + money(x.pay + x.extra) + " a month in all.",
    "Paying extra: the debt is gone in about " +
      (r.raw.off ? fmtDur(r.raw.off) : "more than " + x.years + " years") +
      ", then all of it is invested.",
    "Investing: the normal payment of " +
      money(x.pay) +
      ", and " +
      money(x.extra) +
      " a month invested at " +
      x.ret +
      "% a year.",
    "A debt payment is a sure return at the rate of the debt. An investment return is an average, not a promise.",
  ],
});
