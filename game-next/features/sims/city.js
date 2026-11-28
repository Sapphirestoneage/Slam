/* ============================================================================
   SLAM the Game: features/sims/city.js
   PURPOSE     Simulator 10: move to a cheaper or a pricier city. The change in the cost of living and
               in pay, the change in state income tax (from the tax view), and the cost to move. Flip point:
               the change in pay where moving pulls ahead.
   INPUT       The profile (take-home pay and spending). The answers: c.x.sim_city.
   OUTPUT      One simulator (simAdd), with the functions cityRun and cityStateTax.
   DEPENDS ON  features/sim.js, features/taxview.js (taxvCalc), features/retire.js (RETIRE_STATES), features/kit.js.
   RULES       The change in the cost of living applies to all spending. The change in pay applies to
               take-home pay. The game has no city data yet ("Career and city atlases" is not built), so
               the changes are the guesses of the player.
   ========================================================================= */
function cityRun(c, x) {
  const months = Math.round(x.years * 12),
    T = cityStateTax(c, x.state),
    gain = ((c.take || 0) * x.pay) / 100 - ((c.spend || 0) * x.col) / 100 + T.change / 12,
    rr = RM,
    A = [-x.move],
    B = [0];
  let v = -x.move;
  for (let m = 1; m <= months; m++) {
    v = v * (1 + rr) + gain;
    A.push(v);
    B.push(0);
  }
  return {
    years: x.years,
    options: [
      { id: "move", n: "Move", delta: A, extra: -gain, once: x.move, cash: x.move },
      { id: "stay", n: "Stay", delta: B, extra: 0, once: 0 },
    ],
    ref: "stay",
    gain,
    T,
  };
}
/* The state income tax a year now and in the new state, from the tax view (taxview.js, the engine's tables). */
function cityStateTax(c, to) {
  const now = taxvCalc(c),
    there = to && to !== now.state ? taxvCalc(c, { state: to }) : now;
  return { now: now.stateTax, there: there.stateTax, change: now.stateTax - there.stateTax, from: now.state };
}
simAdd({
  id: "city",
  n: "Move to a cheaper or pricier city",
  ask: "With the new cost of living and the new pay, does moving leave you ahead?",
  links: ["city", "housing"],
  inputs: [
    {
      k: "col",
      label: "Change in the cost of living",
      opts: [-30, -20, -10, 0, 10, 20, 30].map(v => [v, (v > 0 ? "+" : "") + v + "%"]),
      def: -10,
      fmt: v => Math.round(v * 10) / 10 + "%",
    },
    {
      k: "pay",
      label: "Change in take-home pay",
      opts: [-20, -10, 0, 10, 20, 30].map(v => [v, (v > 0 ? "+" : "") + v + "%"]),
      def: 0,
      fmt: v => Math.round(v * 10) / 10 + "%",
    },
    {
      k: "state",
      label: "The state you would move to",
      opts: [["", "The same state"]].concat(RETIRE_STATES.map(st => [st, st])),
      def: c => taxvInputs(c).state.v,
      help: "State income tax comes from your tax view and the 2026 state tables.",
    },
    {
      k: "move",
      label: "Cost to move",
      opts: [2000, 5000, 10000, 20000].map(v => [v, money(v)]),
      def: 5000,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "years",
      label: "Years to look ahead",
      opts: [3, 5, 10].map(v => [v, v + " years"]),
      def: 5,
      fmt: v => v + " years",
    },
  ],
  run: cityRun,
  flips: [
    {
      k: "pay",
      lo: -50,
      hi: 50,
      steps: 50,
      axis: "Across: the change in take-home pay. Up: how far moving is ahead.",
      say: (v, aAbove) =>
        (aAbove ? "Moving wins if your pay changes by more than " : "Staying wins if your pay changes by more than ") +
        Math.round(v * 10) / 10 +
        "%.",
      none: () => "A change in pay between -50% and +50% does not flip the answer.",
    },
  ],
  math: (c, x, r) => [
    "Each month: take-home of " +
      money(c.take) +
      " × " +
      x.pay +
      "%, minus spending of " +
      money(c.spend) +
      " × " +
      x.col +
      "%, plus the change in state income tax ÷ 12 = " +
      money(Math.round(r.raw.gain)) +
      ".",
    "State income tax: " +
      money(Math.round(r.raw.T.now)) +
      " a year now" +
      (r.raw.T.from ? " (" + r.raw.T.from + ")" : " (no state picked in your tax view)") +
      ", " +
      money(Math.round(r.raw.T.there)) +
      " a year " +
      (x.state ? "in " + x.state : "after the move") +
      ".",
    "The cost to move, " +
      money(x.move) +
      ", comes first. The monthly change is invested at 7% a year after inflation.",
    "The game has no city data yet, so both changes are your guesses.",
  ],
});
