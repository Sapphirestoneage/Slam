/* ============================================================================
   SLAM the Game: features/sims/stop.js
   PURPOSE     Simulator 12: stop working earlier or later, by year, and when to claim Social Security
               (62, 67 or 70). For each stop age, what is left at the end of life at the average return, and
               the real-history odds (odds.js). Flip points: the earliest stop age where the money lasts,
               and the age you must live past for claiming at 70 to pay more than claiming at 62.
   INPUT       The profile. The answers: c.x.sim_stop.
   OUTPUT      One simulator (simAdd), with the functions stopClaim and stopRun.
   DEPENDS ON  features/sim.js, features/odds.js (oddsInputs, oddsCalc), features/retire.js (retireClaim:
               the claiming adjustment of the retirement engine), features/kit.js.
   RULES       Money grows 7% a year after inflation. Before the stop age, what you keep is invested.
               After it, spending minus Social Security (from the claiming age) comes out. The money lasts
               when it is above zero at the age you plan to. Social Security at each claiming age is the
               benefit at full retirement age times his claimingAdjustment, in today's dollars.
   ========================================================================= */
/* Social Security a year at a claiming age, in today's dollars, from the benefit the game expects at full age. */
function stopClaim(c, claim) {
  const p = passives(c),
    pia = p.full * p.sh;
  return pia > 0 ? retireClaim(pia, claim, retireYear() - c.age) * 12 : 0;
}
function stopRun(c, x) {
  const P = oddsInputs(c),
    end = Math.max(c.age + 1, Math.round(x.life)),
    ss = stopClaim(c, x.claim),
    one = age => {
      const out = [0];
      let p = P.inv;
      for (let a = P.age; a < end; a++) {
        if (a < age) p = p * (1 + R) + P.monthly * 12;
        else
          p =
            (p - Math.max(0, P.spend - P.now - (a >= x.claim ? ss : 0) - (P.pen && a >= P.pen.age ? P.pen.amt : 0))) *
            (1 + R);
        out.push(p);
      }
      return out;
    },
    A = one(x.age),
    B = one(P.ret),
    H = end - P.age,
    toMonths = arr => {
      const m = [];
      for (let k = 0; k <= H * 12; k++) m.push(arr[Math.min(arr.length - 1, Math.floor(k / 12))] - P.inv);
      return m;
    },
    low = Math.min.apply(null, A);
  return {
    years: H,
    options: [
      { id: "pick", n: "Stop at " + Math.round(x.age), delta: toMonths(A), extra: 0, once: 0 },
      { id: "plan", n: "Stop at " + P.ret + " (your plan)", delta: toMonths(B), extra: 0, once: 0 },
    ],
    score: low >= 0 ? 1 + A[A.length - 1] / 1e9 : low / 1e9 - 1,
    endPick: A[A.length - 1],
    lasts: low >= 0,
    ss,
    end,
    P,
  };
}
simAdd({
  id: "stop",
  n: "Stop working earlier or later",
  ask: "Pick a stop age and a Social Security age. Does the money last, and how do the odds change?",
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
    {
      k: "claim",
      label: "Claim Social Security at",
      opts: [62, 67, 70].map(v => [v, String(v)]),
      def: 67,
      term: "ssclaim",
      fmt: v => "age " + Math.round(v),
    },
    {
      k: "life",
      label: "Plan to live to",
      opts: [75, 80, 85, 90, 95, 100].map(v => [v, String(v)]),
      def: c => Math.min(100, Math.max(75, c.death || 90)),
      fmt: v => "age " + Math.round(v * 10) / 10,
    },
  ],
  run: stopRun,
  answer: (c, x, r) => {
    const o1 = oddsCalc(c, { ret: x.age }),
      o2 = oddsCalc(c);
    return (
      "If these assumptions hold, stopping at " +
      x.age +
      " and claiming at " +
      x.claim +
      (r.raw.lasts
        ? " leaves about " + money(Math.round(r.raw.endPick)) + " at age " + r.raw.end + "."
        : " runs the money out before age " + r.raw.end + " at a steady 7%.") +
      " In real market history, " +
      o1.ok +
      " of " +
      o1.n +
      " start years work, next to " +
      o2.ok +
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
    {
      k: "life",
      lo: 70,
      hi: 100,
      steps: 60,
      axis: "Across: the age you live to. Up: Social Security in all from claiming at 70, minus from claiming at 62.",
      /* the breakeven of claiming at 70 against 62, in today's dollars */
      score: (c, x) => stopClaim(c, 70) * Math.max(0, x.life - 70) - stopClaim(c, 62) * Math.max(0, x.life - 62),
      say: v => "Claiming at 70 pays more in all than claiming at 62 if you live past " + Math.round(v * 10) / 10 + ".",
      none: () => "The game has no Social Security amount for you yet, so the claiming ages tie.",
    },
  ],
  math: (c, x, r) => [
    "Before the stop age: " +
      money(r.raw.P.monthly) +
      " a month is invested. After it: " +
      money(Math.round(r.raw.P.spend)) +
      " a year of spending, less Social Security from age " +
      x.claim +
      ".",
    "Social Security at " +
      x.claim +
      ": " +
      money(Math.round(r.raw.ss)) +
      " a year, the benefit the game expects at full age times the claiming adjustment of the retirement engine (" +
      RETIRE_CREDIT +
      ").",
    "At 62: " +
      money(Math.round(stopClaim(c, 62))) +
      " a year. At 67: " +
      money(Math.round(stopClaim(c, 67))) +
      ". At 70: " +
      money(Math.round(stopClaim(c, 70))) +
      ".",
    "Money grows 7% a year after inflation, the same each year. The odds line uses the real years instead.",
  ],
});
kitTerms({
  ssclaim: [
    "Claiming age",
    "When you start Social Security. Claim at 62 and each check is smaller for life. Wait to 70 and each check is bigger for life.",
  ],
});
