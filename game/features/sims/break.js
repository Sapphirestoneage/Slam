/* ============================================================================
   SLAM the Game: features/sims/break.js
   PURPOSE     Simulator 7: take a break (a sabbatical or a mini-retirement). Months off, the cost, and
               the pay when you go back. Flip point: the most months off that still reach your number
               by your stop age.
   INPUT       The profile. The answers: c.x.sim_break.
   OUTPUT      One simulator (simAdd), with the function breakRun.
   DEPENDS ON  features/sim.js (simReach), features/kit.js.
   RULES       During the break no pay comes in and spending goes on. After it, pay is the chosen share of
               today's pay. The better option is the one that still reaches the freedom number by the
               stop age; when both do, the break is the better life choice, and the game says the cost.
   ========================================================================= */
function breakRun(c, x) {
  const H = Math.max(1, Math.round((Math.max(c.age + 1, c.ret) - c.age) * 10) / 10),
    months = Math.round(H * 12),
    lost = (c.take || 0) * x.months + x.cost,
    after = ((c.take || 0) * (100 - x.back)) / 100,
    rr = RM,
    A = [0],
    B = [0];
  let v = 0;
  for (let m = 1; m <= months; m++) {
    const out = m <= x.months ? c.take + (m === 1 ? x.cost : 0) : after;
    v = v * (1 + rr) + out;
    A.push(-v);
    B.push(0);
  }
  const opt = { once: lost, monthly: after },
    spare = simReach(c, opt);
  return {
    years: H,
    options: [
      { id: "break", n: "Take the break", delta: A, extra: after, once: lost, cash: Math.min(lost, x.cost) },
      { id: "work", n: "Keep working", delta: B, extra: 0, once: 0 },
    ],
    ref: "work",
    score: spare,
    spare,
    lost,
  };
}
simAdd({
  id: "break",
  n: "Take a break",
  ask: "Can you take months off and still reach your number by your stop age?",
  links: ["break", "sabbatical", "trip"],
  unit: "years to spare",
  inputs: [
    {
      k: "months",
      label: "Months off",
      opts: [1, 3, 6, 12, 24].map(v => [v, v + (v === 1 ? " month" : " months")]),
      def: 6,
      fmt: v => Math.round(v * 10) / 10 + " months",
    },
    {
      k: "cost",
      label: "Extra cost of the break (travel, a course)",
      opts: [0, 2000, 5000, 10000, 20000].map(v => [v, money(v)]),
      def: 5000,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "back",
      label: "Pay when you go back, next to today",
      opts: [80, 90, 100, 110].map(v => [v, v + "%"]),
      def: 100,
      fmt: v => v + "%",
    },
  ],
  run: breakRun,
  answer: (c, x, r) =>
    r.raw.spare >= 0
      ? "If these assumptions hold, you can take the break and still reach your number about " +
        Math.round(r.raw.spare * 10) / 10 +
        " years before your stop age. It costs about " +
        money(Math.round(r.raw.lost)) +
        " now."
      : "If these assumptions hold, the break moves your number past your stop age by about " +
        Math.round(-r.raw.spare * 10) / 10 +
        " years.",
  flips: [
    {
      k: "months",
      lo: 0,
      hi: 60,
      steps: 60,
      axis: "Across: months off. Up: years to spare before your stop age.",
      say: (v, aAbove) =>
        aAbove
          ? "More than " + Math.round(v) + " months off still reaches your number."
          : "Up to " + Math.round(v * 10) / 10 + " months off still reaches your number by your stop age.",
      none: (a, b, x) =>
        breakRun(C(), Object.assign({}, x, { months: 60 })).spare >= 0
          ? "Even 5 years off still reaches your number by your stop age."
          : "Your plan does not reach its number by your stop age, even with no break.",
    },
  ],
  math: (c, x, r) => [
    "Pay you go without: " +
      money(c.take) +
      " a month × " +
      x.months +
      " months, plus " +
      money(x.cost) +
      " of extra cost = " +
      money(Math.round(r.raw.lost)) +
      ".",
    x.back < 100
      ? "After the break: " +
        (100 - x.back) +
        "% less pay, " +
        money(Math.round(((c.take || 0) * (100 - x.back)) / 100)) +
        " a month, until your stop age."
      : "After the break: the same pay as today.",
    "Years to spare: your stop age minus the age the game's plan reaches your number, with the break in it.",
  ],
});
