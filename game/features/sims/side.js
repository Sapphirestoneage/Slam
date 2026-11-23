/* ============================================================================
   SLAM the Game: features/sims/side.js
   PURPOSE     Simulator 8: side income. Hours a week, the rate, and the tax to set aside (the same
               set-aside idea as "Work for yourself", gig.js). Flip point: the rate an hour where the side
               work pays more for an hour than your job does.
   INPUT       The profile (the real hourly wage). The answers: c.x.sim_side.
   OUTPUT      One simulator (simAdd), with the functions sideWage and sideRun.
   DEPENDS ON  features/sim.js, core/engine.js (timeLedger), features/kit.js.
   RULES       The net of an hour is the rate minus the tax set aside. A month has 4.33 weeks. The better
               option for an hour of your time is the one that pays more for it: the side work, or the
               real hourly wage of your job.
   ========================================================================= */
function sideWage(c) {
  try {
    const w = timeLedger(c, derive(c)).wage;
    return w > 0 ? Math.round(w * 100) / 100 : 20;
  } catch (e) {
    report(e, "side.js: sideWage");
    return 20;
  }
}
function sideRun(c, x) {
  const months = Math.round(x.years * 12),
    net = x.hours * 4.33 * x.rate * (1 - x.tax / 100),
    rr = R / 12,
    A = [-x.start],
    B = [0];
  let v = -x.start;
  for (let m = 1; m <= months; m++) {
    v = v * (1 + rr) + net;
    A.push(v);
    B.push(0);
  }
  const wage = sideWage(c);
  return {
    years: x.years,
    options: [
      { id: "side", n: "Side income", delta: A, extra: -net, once: x.start, cash: x.start },
      { id: "none", n: "Keep the time", delta: B, extra: 0, once: 0 },
    ],
    ref: "none",
    score: x.rate * (1 - x.tax / 100) - wage,
    net,
    wage,
  };
}
simAdd({
  id: "side",
  n: "Side income",
  ask: "Is an hour of side work worth more than an hour of your job, and what does it add up to?",
  links: ["gig", "earn"],
  unit: "an hour",
  inputs: [
    {
      k: "hours",
      label: "Hours a week",
      opts: [2, 5, 10, 15, 20].map(v => [v, v + " hours"]),
      def: 5,
      fmt: v => v + " hours",
    },
    {
      k: "rate",
      label: "What it pays an hour",
      opts: [15, 25, 40, 60, 100].map(v => [v, money(v)]),
      def: 25,
      fmt: v => "$" + Math.round(v * 10) / 10,
    },
    {
      k: "tax",
      label: "Tax to set aside from it",
      opts: [20, 25, 30, 35].map(v => [v, v + "%"]),
      def: 25,
      term: "setaside",
      fmt: v => v + "%",
    },
    {
      k: "start",
      label: "Cost to start",
      opts: [0, 200, 1000, 3000].map(v => [v, money(v)]),
      def: 200,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "years",
      label: "Years to look ahead",
      opts: [1, 2, 5].map(v => [v, v + (v === 1 ? " year" : " years")]),
      def: 2,
      fmt: v => v + " years",
    },
  ],
  run: sideRun,
  answer: (c, x, r) =>
    "If these assumptions hold, the side work nets " +
    money(Math.round(r.raw.net)) +
    " a month after tax, " +
    (r.raw.score >= 0
      ? "more for an hour than your job pays."
      : "less for an hour than your job pays (" + cents(r.raw.wage) + ")."),
  flips: [
    {
      k: "rate",
      lo: 5,
      hi: 150,
      steps: 58,
      axis: "Across: what it pays an hour. Up: its hour, after tax, next to your job's hour.",
      say: v =>
        "Above " + money(Math.round(v)) + " an hour before tax, the side work pays more for an hour than your job.",
      none: () => "Between $5 and $150 an hour, the answer does not flip.",
    },
  ],
  math: (c, x, r) => [
    "A month: " +
      x.hours +
      " hours × 4.33 weeks × " +
      money(x.rate) +
      " × (1 − " +
      x.tax +
      "% set aside) = " +
      money(Math.round(r.raw.net)) +
      ".",
    "Your job's hour: your real hourly wage, " + cents(r.raw.wage) + " (take-home pay over every hour the job takes).",
    "The net each month is invested at 7% a year after inflation, after the cost to start.",
  ],
});
