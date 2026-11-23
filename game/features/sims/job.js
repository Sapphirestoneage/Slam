/* ============================================================================
   SLAM the Game: features/sims/job.js
   PURPOSE     Simulator 6: a new job or a raise, or staying. The pay, the commute, the benefits and the
               match. Flip point: the change in pay where the new job pulls ahead.
   INPUT       The profile (take-home share from the key numbers, the real hourly wage). The answers:
               c.x.sim_job.
   OUTPUT      One simulator (simAdd), with the function jobRun.
   DEPENDS ON  features/sim.js, core/metrics.js (knNet), core/engine.js (timeLedger), features/kit.js.
   RULES       A change in pay lands at the share of pay that the player takes home (knNet). Benefits are
               dollars a year the job pays for you. The match is a percent of pay before taxes, invested.
               The commute costs dollars a month. Its hours are shown, not counted as money.
   ========================================================================= */
function jobRun(c, x) {
  const months = Math.round(x.years * 12),
    N = knNet(c),
    gross = N.gross * 12,
    gain = (x.pay * N.f) / 12 + x.benefits / 12 - x.commuteCost,
    match = ((gross + x.pay) * x.match) / 100 / 12,
    rr = R / 12;
  const A = [0],
    B = [0];
  let v = 0;
  for (let m = 1; m <= months; m++) {
    v = v * (1 + rr) + gain + match;
    A.push(v);
    B.push(0);
  }
  return {
    years: x.years,
    options: [
      { id: "new", n: "The new job", delta: A, extra: -(gain + match), once: 0 },
      { id: "stay", n: "Stay", delta: B, extra: 0, once: 0 },
    ],
    ref: "stay",
    gain,
    match,
    f: N.f,
  };
}
simAdd({
  id: "job",
  n: "A new job or a raise",
  ask: "After the commute, the benefits and the match, does the new job leave you ahead?",
  links: ["job", "earn"],
  inputs: [
    {
      k: "pay",
      label: "Change in pay before taxes, a year",
      opts: [-10000, 0, 5000, 10000, 20000, 40000].map(v => [v, (v > 0 ? "+" : "") + money(v)]),
      def: 10000,
      typed: false,
      fmt: v => (v > 0 ? "+" : "") + money(Math.round(v)),
    },
    {
      k: "commuteCost",
      label: "Change in commute cost, a month",
      opts: [-200, 0, 100, 300].map(v => [v, (v > 0 ? "+" : "") + money(v)]),
      def: 0,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "hours",
      label: "Change in commute time, hours a week",
      opts: [-5, -2, 0, 2, 5].map(v => [v, (v > 0 ? "+" : "") + v + " hours"]),
      def: 0,
      fmt: v => v + " hours",
    },
    {
      k: "benefits",
      label: "Change in benefits, a year",
      opts: [-5000, -2000, 0, 2000, 5000].map(v => [v, (v > 0 ? "+" : "") + money(v)]),
      def: 0,
      help: "Health cover, dental, money for a plan: what the job pays for you.",
      fmt: v => money(Math.round(v)),
    },
    {
      k: "match",
      label: "Change in the match",
      opts: [-4, -2, 0, 2, 4].map(v => [v, (v > 0 ? "+" : "") + v + "% of pay"]),
      def: 0,
      term: "match",
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
  run: jobRun,
  flips: [
    {
      k: "pay",
      lo: -30000,
      hi: 60000,
      steps: 45,
      axis: "Across: the change in pay a year. Up: how far the new job is ahead.",
      say: (v, aAbove) =>
        (aAbove ? "The new job wins above a change in pay of " : "Staying wins above a change in pay of ") +
        money(Math.round(v / 100) * 100) +
        " a year.",
      none: () => "A change in pay between -$30,000 and +$60,000 does not flip the answer.",
    },
  ],
  math: (c, x, r) => [
    "Pay: " +
      money(x.pay) +
      " a year × " +
      Math.round(r.raw.f * 100) +
      "% that you take home ÷ 12 = " +
      money(Math.round((x.pay * r.raw.f) / 12)) +
      " a month.",
    "Benefits: " + money(x.benefits) + " a year ÷ 12. Commute: " + money(x.commuteCost) + " a month.",
    "Match: " + x.match + "% of pay before taxes, invested each month: " + money(Math.round(r.raw.match)) + ".",
    x.hours
      ? "Commute time: " +
        (x.hours > 0 ? "+" : "") +
        x.hours +
        " hours a week, about " +
        Math.round(Math.abs(x.hours) * 48) +
        " hours a year. The game shows it, and does not count it as money."
      : null,
    "The gain each month is invested at 7% a year after inflation.",
  ],
});
