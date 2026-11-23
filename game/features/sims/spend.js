/* ============================================================================
   SLAM the Game: features/sims/spend.js
   PURPOSE     Simulator 11: a big one-time spend (a wedding, a trip, a gift). Its cost in days of
               freedom and in bucket list items. Flip point: the most it can cost and still reach your
               number by your stop age.
   INPUT       The profile and its goals (the bucket list). The answers: c.x.sim_spend.
   OUTPUT      One simulator (simAdd), with the functions spendRun and spendGoalsMoved.
   DEPENDS ON  features/sim.js (simReach), core/engine.js (goalSim), features/kit.js.
   RULES       The spend is paid one time now. The money would have been invested at 7% a year after
               inflation. A bucket list item moves when the game's plan gives it a later date.
   ========================================================================= */
function spendGoalsMoved(c, once) {
  const a = goalSim(c).goalAt,
    b = goalSim(c, { once }).goalAt;
  return (c.goals || []).filter(
    g => !g.done && g.era != null && a[g.id] != null && (b[g.id] == null || b[g.id] - a[g.id] >= 1)
  ).length;
}
function spendRun(c, x) {
  const H = Math.max(1, Math.round(Math.max(1, Math.max(c.age + 1, c.ret) - c.age))),
    months = H * 12,
    A = [-x.cost],
    B = [0];
  for (let m = 1; m <= months; m++) {
    A.push(-x.cost * Math.pow(1 + R / 12, m));
    B.push(0);
  }
  const spare = simReach(c, { once: x.cost });
  return {
    years: H,
    options: [
      { id: "spend", n: "Spend it", delta: A, extra: 0, once: x.cost, cash: x.cost },
      { id: "keep", n: "Keep it invested", delta: B, extra: 0, once: 0 },
    ],
    ref: "keep",
    score: spare,
    spare,
  };
}
simAdd({
  id: "spend",
  n: "A big one-time spend",
  ask: "What does a wedding, a trip or a gift cost in days of freedom and in bucket list items?",
  links: ["trip", "wedding", "gift"],
  unit: "years to spare",
  inputs: [
    {
      k: "cost",
      label: "What it costs",
      opts: [1000, 5000, 10000, 20000, 35000, 60000].map(v => [v, money(v)]),
      def: 10000,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "what",
      label: "What it is for",
      opts: [
        ["wedding", "A wedding"],
        ["trip", "A trip"],
        ["gift", "A gift"],
        ["other", "Something else"],
      ],
      def: "trip",
    },
  ],
  run: spendRun,
  answer: (c, x, r) => {
    const days = r.opts[0].fiShift != null ? kitDays(r.opts[0].fiShift) : null,
      moved = spendGoalsMoved(c, x.cost);
    return (
      "If these assumptions hold, " +
      money(x.cost) +
      " now moves your freedom date " +
      (days == null ? "by an amount the game cannot date yet" : kitDayWords(days)) +
      ", and " +
      (moved
        ? moved + (moved === 1 ? " bucket list item moves" : " bucket list items move") + " later."
        : "no bucket list item moves.")
    );
  },
  flips: [
    {
      k: "cost",
      lo: 0,
      hi: 200000,
      steps: 40,
      axis: "Across: what it costs. Up: years to spare before your stop age.",
      say: v => "Up to about " + money(Math.round(v / 500) * 500) + ", you still reach your number by your stop age.",
      none: (a, b, x) =>
        spendRun(C(), Object.assign({}, x, { cost: 200000 })).spare >= 0
          ? "Even $200,000 still reaches your number by your stop age."
          : "Your plan does not reach its number by your stop age, even with no spend.",
    },
  ],
  math: (c, x) => [
    "The spend: " + money(x.cost) + " now. Kept invested, it would grow at 7% a year after inflation.",
    "Days of freedom: the game's own plan for your freedom date, run with and without the spend.",
    "Bucket list items: each item on your Someday list with a date that moves 1 month or more.",
  ],
});
