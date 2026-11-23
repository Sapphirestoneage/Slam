/* ============================================================================
   SLAM the Game: features/sims/stop.js
   PURPOSE     Simulator 12: stop working earlier or later, by year. For each stop age, what is left at
               the end of life at the average return, and the market-history odds (odds.js). Flip point:
               the earliest stop age where the money lasts.
   INPUT       The profile. The answers: c.x.sim_stop.
   OUTPUT      One simulator (simAdd), with the function stopRun.
   DEPENDS ON  features/sim.js, features/odds.js (oddsInputs, oddsCalc), features/kit.js.
   RULES       Money grows 7% a year after inflation. Before the stop age, what you keep is invested.
               After it, spending minus Social Security (from 67) comes out. The money lasts when it is
               above zero at the age in c.death.
   ========================================================================= */
function stopRun(c, x) {
  const P = oddsInputs(c),
    one = age => {
      const out = [0];
      let p = P.inv;
      for (let a = P.age; a < P.death; a++) {
        if (a < age) p = p * (1 + R) + P.monthly * 12;
        else
          p =
            (p - Math.max(0, P.spend - P.now - (a >= 67 ? P.ss : 0) - (P.pen && a >= P.pen.age ? P.pen.amt : 0))) *
            (1 + R);
        out.push(p);
      }
      return out;
    },
    A = one(x.age),
    B = one(P.ret),
    H = P.death - P.age,
    toMonths = arr => {
      const m = [];
      for (let k = 0; k <= H * 12; k++) m.push(arr[Math.min(arr.length - 1, Math.floor(k / 12))] - P.inv);
      return m;
    };
  return {
    years: H,
    options: [
      { id: "pick", n: "Stop at " + x.age, delta: toMonths(A), extra: 0, once: 0 },
      { id: "plan", n: "Stop at " + P.ret + " (your plan)", delta: toMonths(B), extra: 0, once: 0 },
    ],
    score: Math.min.apply(null, A) >= 0 ? 1 + A[A.length - 1] / 1e9 : Math.min.apply(null, A) / 1e9 - 1,
    endPick: A[A.length - 1],
    lasts: Math.min.apply(null, A) >= 0,
    P,
  };
}
simAdd({
  id: "stop",
  n: "Stop working earlier or later",
  ask: "Pick a stop age. Does the money last, and how do the market-history odds change?",
  links: ["retire", "odds"],
  unit: "",
  inputs: [
    {
      k: "age",
      label: "Stop working at",
      opts: [45, 50, 55, 58, 60, 62, 65, 67, 70].map(v => [v, String(v)]),
      def: c => Math.max(c.age + 1, c.ret || 60),
      fmt: v => "age " + Math.round(v),
    },
  ],
  run: stopRun,
  answer: (c, x, r) => {
    const o1 = oddsCalc(c, { ret: x.age }, { runs: 0 }).of100,
      o2 = oddsCalc(c, null, { runs: 0 }).of100;
    return (
      "If these assumptions hold, stopping at " +
      x.age +
      (r.raw.lasts
        ? " leaves about " + money(Math.round(r.raw.endPick)) + " at age " + r.raw.P.death + "."
        : " runs the money out before age " + r.raw.P.death + " at a steady 7%.") +
      " In real market history, " +
      o1 +
      " out of 100 histories work, next to " +
      o2 +
      " for your plan's stop age of " +
      r.raw.P.ret +
      "."
    );
  },
  flips: [
    {
      k: "age",
      lo: 40,
      hi: 75,
      steps: 35,
      axis: "Across: the stop age. Up: above the line, the money lasts.",
      say: v => "Stopping at " + Math.ceil(v) + " or later, the money lasts at a steady 7%.",
      none: (a, b, x) =>
        stopRun(C(), Object.assign({}, x, { age: 75 })).lasts
          ? "The money lasts for every stop age from 40 to 75."
          : "The money does not last for any stop age up to 75 at a steady 7%.",
    },
  ],
  math: (c, x, r) => [
    "Before the stop age: " +
      money(r.raw.P.monthly) +
      " a month is invested. After it: " +
      money(Math.round(r.raw.P.spend)) +
      " a year of spending, less Social Security from 67.",
    "Money grows 7% a year after inflation, the same each year. The odds line uses the real years instead.",
  ],
});
