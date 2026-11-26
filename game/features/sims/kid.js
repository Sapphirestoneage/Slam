/* ============================================================================
   SLAM the Game: features/sims/kid.js
   PURPOSE     Simulator 9: have a kid or add a dependent. The yearly cost by age, childcare in the first
               years, and a tuition goal. Flip point: the yearly cost that still reaches your number by
               your stop age.
   INPUT       The profile. The answers: c.x.sim_kid.
   OUTPUT      One simulator (simAdd), with the function kidRun.
   DEPENDS ON  features/sim.js (simReach), features/kit.js.
   RULES       The yearly cost runs for 18 years from the start. Childcare runs for the first 5 years.
               The tuition goal is saved month by month over the 18 years. The answer is in years to spare
               before the stop age; the cost is also shown in dollars.
   ========================================================================= */
function kidRun(c, x) {
  const H = 18 + x.when,
    months = Math.round(H * 12),
    rr = RM,
    A = [0],
    B = [0];
  let v = 0,
    sum = 0;
  for (let m = 1; m <= months; m++) {
    const k = m - x.when * 12,
      out = k > 0 ? x.cost / 12 + (k <= 60 ? x.care : 0) + x.tuition / 216 : 0;
    v = v * (1 + rr) + out;
    sum += out;
    A.push(-v);
    B.push(0);
  }
  const avg = sum / Math.max(1, months),
    spare = simReach(c, { monthly: avg });
  return {
    years: H,
    options: [
      { id: "kid", n: "With a child", delta: A, extra: avg, once: 0 },
      { id: "plan", n: "Plan as today", delta: B, extra: 0, once: 0 },
    ],
    ref: "plan",
    score: spare,
    spare,
    sum,
    avg,
  };
}
simAdd({
  id: "kid",
  n: "Have a kid or add a dependent",
  ask: "What does a child cost in your plan, and do you still reach your number by your stop age?",
  links: ["kids"],
  unit: "years to spare",
  inputs: [
    {
      k: "cost",
      label: "Yearly cost, not counting childcare",
      opts: [8000, 12000, 16000, 20000, 25000].map(v => [v, money(v)]),
      def: 16000,
      typed: true,
      help: "Food, clothes, health, activities. Many families spend $12,000 to $20,000 a year.",
      fmt: v => money(Math.round(v)),
    },
    {
      k: "care",
      label: "Childcare a month, first 5 years",
      opts: [0, 800, 1200, 1800, 2500].map(v => [v, money(v)]),
      def: 1200,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "tuition",
      label: "Tuition goal",
      opts: [0, 25000, 50000, 100000, 200000].map(v => [v, money(v)]),
      def: 50000,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "when",
      label: "When, from now",
      opts: [0, 1, 2, 3, 5].map(v => [v, v ? "In " + v + (v === 1 ? " year" : " years") : "Now"]),
      def: 1,
      fmt: v => v + " years",
    },
  ],
  run: kidRun,
  answer: (c, x, r) =>
    "If these assumptions hold, a child costs about " +
    money(Math.round(r.raw.sum)) +
    " over 18 years, " +
    money(Math.round(r.raw.avg)) +
    " a month on average. " +
    (r.raw.spare >= 0
      ? "You still reach your number about " + Math.round(r.raw.spare * 10) / 10 + " years before your stop age."
      : "Your number moves past your stop age by about " + Math.round(-r.raw.spare * 10) / 10 + " years."),
  flips: [
    {
      k: "cost",
      lo: 0,
      hi: 60000,
      steps: 40,
      axis: "Across: the yearly cost. Up: years to spare before your stop age.",
      say: v =>
        "Up to about " + money(Math.round(v / 500) * 500) + " a year, you still reach your number by your stop age.",
      none: (a, b, x) =>
        kidRun(C(), Object.assign({}, x, { cost: 60000 })).spare >= 0
          ? "Even $60,000 a year still reaches your number by your stop age."
          : "Your plan does not reach its number by your stop age, even at $0 a year.",
    },
  ],
  math: (c, x, r) => [
    "Yearly cost: " + money(x.cost) + " for 18 years. Childcare: " + money(x.care) + " a month for the first 5 years.",
    "Tuition: " + money(x.tuition) + " saved over 18 years, " + money(Math.round(x.tuition / 216)) + " a month.",
    "On average: " +
      money(Math.round(r.raw.avg)) +
      " a month more spending, run through the game's own plan for your freedom date.",
  ],
});
