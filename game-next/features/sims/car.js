/* ============================================================================
   SLAM the Game: features/sims/car.js
   PURPOSE     Simulator 4: the car. Keep the car you have, buy a used car, buy a new car, or lease.
               Flip points: the yearly repairs of the car you keep, and the years you look ahead.
   INPUT       The answers: c.x.sim_car.
   OUTPUT      One simulator (simAdd), with the function carRun.
   DEPENDS ON  features/sim.js, features/kit.js.
   RULES       Dollars are future dollars. Each option's costs would have been invested at the return,
               so its delta is minus what its costs would have grown to, plus the value of the car it
               has at the end, minus what is still owed on it. The car of today is sold for a new car,
               a used car or a lease. Value loss: 15% a year (20% the first year for a new car). The
               loans run 5 years. Repairs of a used car: $800 a year. Of a new car: $300 a year.
   ========================================================================= */
function carRun(c, x) {
  const H = x.years,
    months = Math.round(H * 12),
    rr = x.ret / 1200,
    dep = (v, y, first) => v * (first ? 0.8 * Math.pow(0.85, Math.max(0, y - 1)) : Math.pow(0.85, y)),
    opt = (id, n, price, repairs, lease, isNew) => {
      const loan = Math.max(0, price - x.now),
        pmt = loan > 0 ? simLoanPayment(loan, x.rate, 5) : 0;
      let fv = lease ? 2000 - x.now : 0,
        bal = loan,
        sum = 0;
      const delta = [];
      for (let m = 0; m <= months; m++) {
        if (m > 0) {
          let out = repairs / 12;
          if (lease) out += lease;
          if (bal > 0) {
            const i = (bal * x.rate) / 1200,
              p = Math.min(bal + i, pmt);
            bal = Math.max(0, bal + i - p);
            out += p;
          }
          fv = fv * (1 + rr) + out;
          sum += out;
        }
        const y = m / 12,
          value = lease ? 0 : price === 0 ? dep(x.now, y, false) : dep(price, y, isNew);
        delta.push(-fv + value - bal);
      }
      const extra = sum / Math.max(1, months) - x.repairs / 12;
      return { id, n, delta, extra, once: lease ? Math.max(0, 2000 - x.now) : 0, cash: lease ? 2000 : 0, pmt };
    };
  return {
    years: H,
    options: [
      opt("keep", "Keep your car", 0, x.repairs, 0, false),
      opt("used", "Buy used", x.used, 800, 0, false),
      opt("new", "Buy new", x.fresh, 300, 0, true),
      opt("lease", "Lease", 0, 0, x.lease, false),
    ],
    ref: "keep",
  };
}
simAdd({
  id: "car",
  n: "Keep, buy used, buy new, or lease",
  ask: "Which way of having a car leaves you with the most, over the years you look ahead?",
  links: ["car"],
  inputs: [
    {
      k: "now",
      label: "What your car is worth now",
      opts: [2000, 5000, 8000, 12000, 20000].map(v => [v, money(v)]),
      def: 8000,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "repairs",
      label: "Repairs a year to keep it",
      opts: [500, 1000, 2000, 3000, 4000].map(v => [v, money(v)]),
      def: 1500,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "used",
      label: "Price of a used car",
      opts: [12000, 18000, 25000, 35000].map(v => [v, money(v)]),
      def: 18000,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "fresh",
      label: "Price of a new car",
      opts: [25000, 35000, 45000, 60000].map(v => [v, money(v)]),
      def: 35000,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    { k: "rate", label: "Car loan rate", opts: [4, 6, 8, 10, 14].map(v => [v, v + "%"]), def: 7, fmt: v => v + "%" },
    {
      k: "lease",
      label: "Lease payment a month",
      opts: [250, 350, 450, 600].map(v => [v, money(v)]),
      def: 400,
      typed: true,
      fmt: v => money(Math.round(v)),
    },
    {
      k: "years",
      label: "Years to look ahead",
      opts: [3, 5, 7, 10].map(v => [v, v + " years"]),
      def: 5,
      fmt: v => Math.round(v * 10) / 10 + " years",
    },
    {
      k: "ret",
      label: "Investment return a year, before inflation",
      opts: [4, 5, 6, 7, 8].map(v => [v, v + "%"]),
      def: 7,
      fmt: v => v + "%",
    },
  ],
  run: carRun,
  flips: [
    {
      k: "repairs",
      a: "keep",
      b: "used",
      lo: 0,
      hi: 8000,
      steps: 40,
      axis: "Across: repairs a year on the car you keep. Up: how far keeping is ahead of buying used.",
      say: (v, aAbove) =>
        (aAbove ? "Buying used wins while repairs stay below " : "Keeping your car wins while repairs stay below ") +
        money(Math.round(v / 50) * 50) +
        " a year.",
      none: () => "Repairs between $0 and $8,000 a year do not flip keep and buy used.",
    },
    {
      k: "years",
      a: "new",
      b: "lease",
      lo: 1,
      hi: 12,
      steps: 44,
      axis: "Across: years you look ahead. Up: how far buying new is ahead of leasing.",
      say: (v, aAbove) =>
        (aAbove ? "Buying new wins over leasing if you keep it more than " : "Leasing wins over buying new past ") +
        Math.round(v * 10) / 10 +
        " years.",
      none: () => "Between 1 and 12 years, the order of buying new and leasing does not change.",
    },
  ],
  math: (c, x, r) => [
    "Keep: " + money(x.repairs) + " a year of repairs. The car loses 15% of its value a year.",
    "Used and new: the car of today (" +
      money(x.now) +
      ") goes toward the price, the rest is a 5-year loan at " +
      x.rate +
      "%. Repairs: $800 a year used, $300 new. A new car loses 20% the first year.",
    "Lease: " +
      money(x.lease) +
      " a month, $2,000 to drive off, and the car of today is sold. Nothing is owned at the end.",
    "Each option's costs would have grown at " +
      x.ret +
      "% a year. At the end: minus those costs, plus the car's value, minus any loan left.",
    "All dollars here are future dollars.",
  ],
});
