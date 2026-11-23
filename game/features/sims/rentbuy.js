/* ============================================================================
   SLAM the Game: features/sims/rentbuy.js
   PURPOSE     Simulator 1: rent or buy. The price, the rate, the down payment, the stay, the rent and
               its growth, the home growth, the upkeep, the closing and selling costs, and the money that
               the cheaper option invests. Flip points: the stay length and the mortgage rate.
   INPUT       The profile (the home line of spending for the rent). The answers: c.x.sim_rentbuy.
   OUTPUT      One simulator (simAdd), with the functions rentbuyRun and rentbuyDefaultRent.
   DEPENDS ON  features/sim.js, features/kit.js.
   RULES       Dollars are future dollars. Each month, the option that costs less invests the difference
               at the investment return (the delta is minus what its own costs would have grown to). The
               home is worth its value minus the loan and minus the selling cost, as if it were sold at
               the end of the stay.
   ========================================================================= */
function rentbuyDefaultRent(c) {
  const r = (c.spends || []).find(x => /^home|rent/i.test(x.k));
  const v = r ? r.amt : (c.spend || 3000) * 0.35;
  return [1000, 1500, 2000, 2500, 3000, 4000].reduce((b, k) => (Math.abs(k - v) < Math.abs(b - v) ? k : b), 1000);
}
function rentbuyRun(c, x) {
  const T = Math.max(0.5, x.stay),
    months = Math.round(T * 12),
    down = (x.price * x.down) / 100,
    loan = x.price - down,
    pmt = simLoanPayment(loan, x.rate, 30),
    rr = x.ret / 1200,
    lr = x.rate / 1200,
    hg = Math.pow(1 + x.homeGrowth / 100, 1 / 12) - 1,
    rg = Math.pow(1 + x.rentGrowth / 100, 1 / 12) - 1;
  let fvBuy = down + (x.price * x.closing) / 100,
    fvRent = 0,
    bal = loan,
    value = x.price,
    rent = x.rent,
    sumBuy = 0;
  const dBuy = [-fvBuy + value * (1 - x.selling / 100) - bal],
    dRent = [0];
  for (let m = 1; m <= months; m++) {
    const interest = bal * lr,
      upkeep = (value * x.upkeep) / 1200,
      out = pmt + upkeep;
    bal = Math.max(0, bal - (pmt - interest));
    value *= 1 + hg;
    fvBuy = fvBuy * (1 + rr) + out;
    fvRent = fvRent * (1 + rr) + rent;
    sumBuy += out - rent;
    rent *= 1 + rg;
    dBuy.push(-fvBuy + value * (1 - x.selling / 100) - bal);
    dRent.push(-fvRent);
  }
  const once = down + (x.price * x.closing) / 100;
  return {
    years: T,
    options: [
      { id: "buy", n: "Buy", delta: dBuy, extra: sumBuy / Math.max(1, months), once, cash: once },
      { id: "rent", n: "Rent", delta: dRent, extra: 0, once: 0, cash: 0 },
    ],
    ref: "rent",
    pmt,
    once,
  };
}
const RB_$ = v => money(Math.round(v));
simAdd({
  id: "rentbuy",
  n: "Rent or buy",
  ask: "Does buying a home leave you ahead of renting, for the time you plan to stay?",
  links: ["housing", "home"],
  inputs: [
    {
      k: "price",
      label: "Home price",
      opts: [200000, 300000, 400000, 500000, 650000, 800000].map(v => [v, RB_$(v)]),
      def: 400000,
      typed: true,
      fmt: RB_$,
    },
    {
      k: "rate",
      label: "Mortgage rate",
      opts: [4, 5, 5.5, 6, 6.5, 7, 7.5, 8].map(v => [v, v + "%"]),
      def: 6.5,
      term: "mortgagerate",
      fmt: v => Math.round(v * 10) / 10 + "%",
    },
    {
      k: "down",
      label: "Down payment",
      opts: [3, 5, 10, 20].map(v => [v, v + "%"]),
      def: 10,
      fmt: v => Math.round(v) + "%",
    },
    {
      k: "stay",
      label: "How long you would stay",
      opts: [2, 3, 5, 7, 10, 15, 20].map(v => [v, v + " years"]),
      def: 7,
      fmt: v => Math.round(v * 10) / 10 + " years",
    },
    {
      k: "rent",
      label: "Rent for a place like it, a month",
      opts: [1000, 1500, 2000, 2500, 3000, 4000].map(v => [v, RB_$(v)]),
      def: rentbuyDefaultRent,
      typed: true,
      fmt: RB_$,
    },
    {
      k: "rentGrowth",
      label: "Rent growth a year",
      opts: [1, 2, 3, 4, 5].map(v => [v, v + "%"]),
      def: 3,
      fmt: v => v + "%",
    },
    {
      k: "homeGrowth",
      label: "Home price growth a year",
      opts: [0, 1, 2, 3, 4, 5].map(v => [v, v + "%"]),
      def: 3,
      fmt: v => v + "%",
    },
    {
      k: "upkeep",
      label: "Taxes, insurance and repairs a year",
      opts: [1, 1.5, 2, 2.5, 3].map(v => [v, v + "% of the price"]),
      def: 2,
      term: "upkeep",
      fmt: v => v + "%",
    },
    {
      k: "closing",
      label: "Closing costs to buy",
      opts: [2, 3, 4, 5].map(v => [v, v + "%"]),
      def: 3,
      fmt: v => v + "%",
    },
    { k: "selling", label: "Costs to sell", opts: [5, 6, 7, 8].map(v => [v, v + "%"]), def: 6, fmt: v => v + "%" },
    {
      k: "ret",
      label: "Investment return a year, before inflation",
      opts: [4, 5, 6, 7, 8].map(v => [v, v + "%"]),
      def: 7,
      fmt: v => v + "%",
    },
  ],
  run: rentbuyRun,
  flips: [
    {
      k: "stay",
      lo: 1,
      hi: 30,
      steps: 58,
      axis: "Across: years you stay. Up: how far buying is ahead of renting.",
      say: (v, aAbove) =>
        (aAbove ? "Buying wins if you stay more than " : "Renting wins if you stay more than ") +
        Math.round(v * 10) / 10 +
        " years.",
      none: (a, b, x) =>
        rentbuyRun(C(), Object.assign({}, x, { stay: 30 })).options[0].delta.slice(-1)[0] >
        rentbuyRun(C(), Object.assign({}, x, { stay: 30 })).options[1].delta.slice(-1)[0]
          ? "Buying wins for every stay from 1 to 30 years."
          : "Renting wins for every stay from 1 to 30 years.",
    },
    {
      k: "rate",
      lo: 2,
      hi: 12,
      steps: 50,
      axis: "Across: the mortgage rate. Up: how far buying is ahead of renting.",
      say: (v, aAbove) => (aAbove ? "Above " : "Below ") + Math.round(v * 10) / 10 + "%, buying wins.",
      none: () => "The rate does not flip the answer between 2% and 12%.",
    },
  ],
  math: (c, x, r) => [
    "Loan: " +
      RB_$(x.price) +
      " − " +
      x.down +
      "% down = " +
      RB_$(x.price * (1 - x.down / 100)) +
      " over 30 years at " +
      x.rate +
      "%: " +
      RB_$(r.raw.pmt) +
      " a month.",
    "Buy: down payment and closing costs now (" +
      RB_$(r.raw.once) +
      "), then the payment plus " +
      x.upkeep +
      "% of the home value a year for upkeep.",
    "Rent: " + RB_$(x.rent) + " a month, up " + x.rentGrowth + "% a year.",
    "Each month the cheaper option invests the difference at " + x.ret + "% a year.",
    "At the end: the home value minus the loan and " + x.selling + "% to sell, next to what renting invested.",
    "All dollars here are future dollars.",
  ],
});
