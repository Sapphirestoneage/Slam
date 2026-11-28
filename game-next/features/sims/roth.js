/* ============================================================================
   SLAM the Game: features/sims/roth.js
   PURPOSE     Simulator 5: pre-tax or Roth for this year's money. It uses the tax view (taxview.js)
               for the rate now and the rate later. Flip points: the rate when you take the money out,
               and the rate now.
   INPUT       The profile and the tax view. The answers: c.x.sim_roth.
   OUTPUT      One simulator (simAdd), with the function rothRun.
   DEPENDS ON  features/sim.js, features/taxview.js (taxvCalc), features/kit.js.
   RULES       Both options cost the same money out of pocket this year. Roth: the full amount goes in
               after tax and comes out free of tax. Pre-tax: the same amount goes in before tax, comes
               out taxed at the later rate, and the tax saved now is invested in a regular account, where
               the gains pay 15% tax at the end. The delta is the value after tax.
   ========================================================================= */
function rothRun(c, x) {
  const months = Math.round(x.years * 12),
    r = x.ret / 100,
    tN = x.now / 100,
    tL = x.later / 100,
    A = [],
    B = [];
  for (let m = 0; m <= months; m++) {
    const g = Math.pow(1 + r, m / 12);
    A.push(x.amt * g * (1 - tL) + x.amt * tN * (g - 0.15 * (g - 1)));
    B.push(x.amt * g);
  }
  return {
    years: x.years,
    options: [
      { id: "pre", n: "Pre-tax", delta: A, extra: 0, once: 0 },
      { id: "roth", n: "Roth", delta: B, extra: 0, once: 0 },
    ],
    ref: "roth",
  };
}
simAdd({
  id: "roth",
  n: "Pre-tax or Roth this year",
  ask: "For this year's money, does pre-tax or Roth leave you more after tax?",
  links: ["tax"],
  inputs: [
    {
      k: "amt",
      label: "Money to put in this year",
      opts: [1000, 3000, 6000, 7500, 15000, 24500].map(v => [v, money(v)]),
      def: 6000,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "now",
      label: "Your top tax rate now",
      opts: [10, 12, 22, 24, 32, 35].map(v => [v, v + "%"]),
      def: c => Math.round(taxvCalc(c).top * 100),
      term: "bracket",
      help: "From your tax view.",
      fmt: v => Math.round(v * 10) / 10 + "%",
    },
    {
      k: "later",
      label: "Your top tax rate when you take it out",
      opts: [10, 12, 22, 24, 32].map(v => [v, v + "%"]),
      def: c => Math.round(taxvCalc(c).later * 100),
      help: "The tax view's guess from your spending in retirement.",
      fmt: v => Math.round(v * 10) / 10 + "%",
    },
    {
      k: "years",
      label: "Years until you take it out",
      opts: [10, 20, 30, 40].map(v => [v, v + " years"]),
      def: c => Math.max(5, Math.min(40, Math.round((c.ret || 60) - c.age))),
      fmt: v => Math.round(v) + " years",
    },
    {
      k: "ret",
      label: "Investment return a year",
      opts: [4, 5, 6, 7, 8].map(v => [v, v + "%"]),
      def: 7,
      fmt: v => v + "%",
    },
  ],
  run: rothRun,
  flips: [
    {
      k: "later",
      lo: 0,
      hi: 45,
      steps: 45,
      axis: "Across: your rate when you take it out. Up: how far pre-tax is ahead.",
      say: (v, aAbove) =>
        (aAbove ? "Pre-tax wins if your rate later is above " : "Roth wins if your rate later is above ") +
        Math.round(v * 10) / 10 +
        "%.",
      none: () => "Your later rate does not flip the answer between 0% and 45%.",
    },
    {
      k: "now",
      lo: 0,
      hi: 45,
      steps: 45,
      axis: "Across: your rate now. Up: how far pre-tax is ahead.",
      say: (v, aAbove) =>
        (aAbove ? "Pre-tax wins if your rate now is above " : "Roth wins if your rate now is above ") +
        Math.round(v * 10) / 10 +
        "%.",
      none: () => "Your rate now does not flip the answer between 0% and 45%.",
    },
  ],
  math: (c, x) => [
    "Roth: " + money(x.amt) + " grows at " + x.ret + "% a year for " + x.years + " years and comes out free of tax.",
    "Pre-tax: the same " +
      money(x.amt) +
      " grows, then pays " +
      x.later +
      "% when it comes out. The " +
      money(Math.round((x.amt * x.now) / 100)) +
      " of tax saved now is invested too, and its gains pay 15% at the end.",
    "When the rate now and the rate later are the same, the two are close. The regular account's tax on gains tips it a little toward Roth.",
  ],
});
