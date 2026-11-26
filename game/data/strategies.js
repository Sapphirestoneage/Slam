/* ============================================================================
   SLAM the Game: data/strategies.js
   PURPOSE     The strategies of "Moves to try" (features/strat.js). Each strategy uses one template:
               id, name, one (a plain one-liner), lever (housing, income, interest, taxes, spending),
               effort (1 to 5), fitChecks, inputs, formula, dial, breakEven, verdictRules, risks,
               credit (who taught it), quests.
   INPUT       None at load time. The functions of a strategy get the profile (c), the inputs (I), the
               result of the formula (F), and derive(c) (d).
   OUTPUT      STRATEGIES: the list. STG_FACTS: the facts about you, one question each. STG_HH: the
               constants of the house hack.
   DEPENDS ON  Nothing at load time. The functions call core/engine.js and features/strat.js.
   RULES       A fit check: { id, q, hard or block, auto or fact and test, no }. hard rules the strategy out. A check
               with a block is soft: it becomes a "Not yet" roadblock of that kind. auto returns true,
               false, or null (the player taps). An input: { k, l, opts, def, typed, term, help,
               listing, opt }. The formula returns { save (spending lower a month), take (pay higher a
               month), equity (wealth a month that is not cash), once (a one-time gain, or a cost when
               negative), toDebt (the gain lowers costly debt), hours (a month), tiles, hidden, warn, alt, math, links }.
               A typical value is a Guess. No strategy tells the player to do it: it gives a verdict
               on the numbers and names the risks.
   ========================================================================= */
/* The house hack: an FHA loan on a building with 2 to 4 units. */
const STG_HH = {
  down: 0.035, // the lowest FHA down payment
  closing: 0.03, // closing costs, as a share of the price
  ufmip: 0.0175, // FHA mortgage insurance at the start, added to the loan
  mip: 0.0055, // FHA mortgage insurance a year, on the loan
  growth: 0.07, // what the cash would have earned a year
  apprec: 0.01, // the home's gain a year, after inflation
  collect: 0.95, // the share of the rent that is collected
  rentCount: 0.75, // the share of the rent that a lender counts as income
  grossUp: 0.78, // take-home pay as a share of pay before taxes, when the game does not know it
};
const STG_PCT = list => list.map(v => [v, Math.round(v * 1000) / 10 + "%"]);
const STG_USD = list => list.map(v => [v, "$" + v.toLocaleString()]);
const STG_MO = list => list.map(v => [v, v + " months"]);
/* The rows of a dial from a function of the share: f(share, row) returns { need, ok }. */
function stgDialRows(keys, f) {
  return STG_DIAL.filter(r => keys.includes(r[0])).map(r => Object.assign({ k: r[0], label: r[1], share: r[2] }, f(r[2], r[0])));
}
const STG_SHARES = ["same", "25", "50", "75", "100"];
function stgFree(c, d) {
  return freeToSpend(c, d || derive(c)).free;
}
/* True when the player lives on their own (setup), so there is no one else to ask. */
function stgAlone(c) {
  const l = c.live || [];
  return l.length > 0 && l.every(k => k === "On my own");
}
function stgWage(c) {
  return timeLedger(c, derive(c)).wage || 0;
}
/* THE FACTS ABOUT YOU. Each fact is one question, asked once for all the moves. A fit check with
   fact: reads the answer here (stgFact in strat.js), so one tap answers each move that asks the same
   thing. A fact: { q (the question), short (its name), opts ([value, label]), help, get (where the
   profile keeps it already), set, legacy (old answers inside one move: [move id, check id]), profile
   (setup owns it: asked only when setup has no answer), readOnly (from your numbers, never asked),
   to (the words of a lever: what would change), path (the steps of a lever, for Next Steps) }.
   The value "unsure" is a soft roadblock of the kind knowledge, never a No. */
const STG_YN = [
  ["yes", "Yes"],
  ["no", "No"],
];
const STG_BAND_OF_VAULT = { none: "Under 580", fair: "580 to 669", good: "670 to 739", excellent: "740 to 799" };
const STG_FACTS = {
  score: {
    q: "About what is your credit score?",
    short: "Credit score",
    opts: [
      ["Under 580", "Under 580"],
      ["580 to 669", "580 to 669"],
      ["670 to 739", "670 to 739"],
      ["740 to 799", "740 to 799"],
      ["800 or more", "800 or more"],
      ["unsure", "I don't know it"],
    ],
    help: "A rough band is enough. Most bank and card apps show it for free. The card vault reads the same answer.",
    unsure: "Find your score first. Most bank and card apps show it for free.",
    /* the card vault's answer, then the answer of setup, then "I don't know it" */
    get: c => {
      const v = c.x && c.x.vault && c.x.vault.score && c.x.vault.score.v;
      if (v && STG_BAND_OF_VAULT[v]) return STG_BAND_OF_VAULT[v];
      if (c.caught && c.caught.score) return c.caught.score;
      return (c.x && c.x.about && c.x.about.score) || null;
    },
    set: (c, v) => {
      c.caught = c.caught || {};
      c.x.about = c.x.about || {};
      if (c.x.vault) delete c.x.vault.score;
      if (v === "unsure" || v == null) {
        delete c.caught.score;
        if (v) c.x.about.score = v;
        else delete c.x.about.score;
      } else {
        c.caught.score = v;
        delete c.x.about.score;
      }
    },
    /* Before this, each move asked "about 670 or more" on its own. Those taps still say something. */
    legacy: c => {
      const f = id => c.x && c.x.stg && c.x.stg[id] && c.x.stg[id].fit && c.x.stg[id].fit.credit;
      const hi = ["transfer", "consolidate", "purchase", "welcome"].map(f).filter(Boolean),
        lo = f("househack");
      if (hi.includes("y")) return "670 to 739";
      if (hi.includes("n")) return lo === "y" ? "580 to 669" : lo === "n" ? "Under 580" : null;
      return lo === "n" ? "Under 580" : null;
    },
    to: v => "A score of " + STG_SCORE[v] + " or more",
    path: [
      { t: "Set autopay for the minimum on every card and loan, so no payment is late", mins: 15 },
      { t: "Bring each card under 30% of its limit, then under 10%", mins: 10 },
      { t: "Get your free reports at annualcreditreport.com and dispute any error", mins: 30 },
      { t: "Keep your oldest card open, even with no balance", mins: 5 },
      { t: "Check your score again in 60 days and tap the new band in Moves library", mins: 5 },
    ],
    pathUnsure: [{ t: "Look up your credit score in your bank or card app and tap its band in Moves library", mins: 5 }],
  },
  home: {
    q: "Where do you live now?",
    short: "Home",
    profile: true,
    opts: [
      ["Renting", "I rent"],
      ["Owning", "I own"],
      ["With family", "With family"],
    ],
    get: c => c.home || null,
    set: (c, v) => (c.home = v),
    to: (v, label) =>
      v === "Owning" ? "If you owned your place" : v === "Renting" ? "If you rented your own place" : "If you lived with family",
  },
  spare: {
    q: "Do you have a spare room you could rent out?",
    short: "Spare room",
    opts: STG_YN,
    legacy: [["room", "spare"]],
    to: v => (v === "yes" ? "If you had a spare room" : "Without a spare room"),
  },
  payfull: {
    q: "Do you pay each card in full each month?",
    short: "Cards paid in full",
    opts: STG_YN,
    legacy: [["welcome", "full"]],
    to: v => (v === "yes" ? "Pay each card in full each month" : "Carry a card balance"),
    path: [
      { t: "Turn on autopay for the full statement balance of each card", mins: 10 },
      { t: "Use the card only for what is already in your spending plan", mins: 5 },
    ],
  },
  hdhp: {
    q: "Is your health plan a high-deductible plan that allows an HSA?",
    short: "HSA health plan",
    opts: [
      ["yes", "Yes"],
      ["no", "No"],
      ["unsure", "I don't know"],
    ],
    help: "Your benefits portal says it. Look for \"HSA-eligible\" or \"high-deductible\".",
    unsure: "Look it up in your benefits portal first.",
    legacy: [["hsa", "plan"]],
    to: v => (v === "yes" ? "A health plan that allows an HSA" : "A plan with no HSA"),
    path: [{ t: "At open enrollment, compare the high-deductible plan with an HSA against your plan now", mins: 30 }],
    pathUnsure: [{ t: "Find out in your benefits portal if your health plan allows an HSA", mins: 10 }],
  },
  debt8: {
    q: "Debt at 8% or more",
    short: "Costly debt",
    readOnly: true,
    opts: [
      ["clear", "None"],
      ["carry", "Some"],
    ],
    get: c => (hiDebt(c) > 0 ? "carry" : "clear"),
    to: v => (v === "clear" ? "Clear the debt at 8% or more" : "Carry debt at 8% or more"),
    path: [
      { t: "List each debt at 8% or more with its rate, the highest first", mins: 10 },
      { t: "Put every extra dollar on the debt with the highest rate until it is gone", mins: 10 },
    ],
  },
};
/* Checks that more than one strategy uses. */
const STG_CK = {
  mask: {
    id: "mask",
    q: "No debt at 8% or more",
    block: "mask",
    fact: "debt8",
    test: v => v === "clear",
    no: "Debt at 8% or more costs more each month than this move earns. Clear it first.",
  },
  credit: min => ({
    id: "credit",
    q: "A credit score of about " + min + " or more",
    block: "credit",
    fact: "score",
    test: v => STG_SCORE[v] >= min,
    no: "Lenders want a score of about " + min + " for this. On-time payments and lower card balances raise it.",
  }),
};
/* THE MATH OF THE HOUSE HACK. */
function stgHouse(c, I) {
  const H = STG_HH,
    r = I.rate / 12,
    down = I.price * H.down,
    closing = I.price * H.closing,
    base = I.price - down,
    loan = base * (1 + H.ufmip),
    pi = stgPmt(loan, r, 360),
    tax = I.taxYear > 0 ? I.taxYear / 12 : (I.price * I.taxPct) / 100 / 12,
    mip = (base * H.mip) / 12,
    others = (I.units - 1) * I.rentUnit,
    resPct = I.vac + I.rep + I.capex,
    reserves = resPct * others,
    own = pi + tax + I.ins + mip + I.hoa + reserves,
    net = own - others * H.collect,
    save = I.cur - net,
    lost = ((down + closing) * H.growth) / 12,
    principal = pi - loan * r,
    apprec = (I.price * H.apprec) / 12,
    /* owning cost = k x price + fixed, to solve for the price */
    k = (1 - H.down) * (1 + H.ufmip) * stgPmt(1, r, 360) + (I.taxYear > 0 ? 0 : I.taxPct / 1200) + ((1 - H.down) * H.mip) / 12,
    fixed = I.ins + I.hoa + reserves + (I.taxYear > 0 ? I.taxYear / 12 : 0),
    rentFor = target => (own - target) / (I.units - 1) / H.collect,
    priceFor = target => (target + others * H.collect - fixed) / k,
    gross = (c.take || 0) / H.grossUp,
    debtPay = c.led ? (c.debts || []).reduce((a, x) => a + (x.amt > 0 ? x.pay || 0 : 0), 0) : 0,
    dti = (pi + tax + I.ins + mip + I.hoa + debtPay) / Math.max(1, gross + others * H.rentCount);
  return { down, closing, base, loan, pi, tax, mip, others, resPct, reserves, own, net, save, lost, principal, apprec, rentFor, priceFor, dti, gross, debtPay };
}
const STRATEGIES = [
  {
    id: "househack",
    name: "House hack",
    one: "Buy a building with 2 to 4 units, live in one, and let the other rents pay most of your housing.",
    lever: "housing",
    effort: 5,
    risky: true,
    metro: true,
    credit: "Scott Trench, Set for Life, and the BiggerPockets community",
    fitChecks: [
      { id: "tenants", q: "I am fine living next to my tenants", hard: true, no: "A house hack means your tenants are your neighbors. That is the whole trade." },
      { id: "year", q: "I can live there for at least 12 months", hard: true, no: "An FHA loan needs you to live in the building for the first 12 months." },
      {
        id: "down",
        q: "The down payment and closing costs, without touching my emergency fund",
        block: "money",
        auto: (c, I, F, d) => d.cash - d.target * (c.spend || 0) >= F.H.down + F.H.closing,
        no: "The 3.5% down and the closing costs are not saved yet, on top of your full emergency fund.",
      },
      Object.assign({}, STG_CK.credit(580), { no: "An FHA loan at 3.5% down needs a score of 580 or more." }),
      { id: "history", q: "Two years of steady income to show a lender", block: "rules", no: "Lenders ask for two years of income history. Time fixes this one." },
      STG_CK.mask,
      {
        id: "dti",
        q: "Debt payments with the new loan stay under 45% of pay",
        block: "money",
        auto: (c, I, F) => F.H.dti < 0.45,
        no: "With this loan, your debt payments would be over 45% of your pay. A lower price or less debt fixes it.",
      },
    ],
    inputs: [
      { k: "cur", l: "Your housing cost now, a month", opts: STG_USD([1200, 1800, 2400, 3000]), def: c => stgHome(c), typed: true },
      {
        k: "units",
        l: "Units in the building",
        opts: [
          [2, "2"],
          [3, "3"],
          [4, "4"],
        ],
        def: () => 2,
      },
      { k: "price", l: "The price", opts: STG_USD([300000, 500000, 750000, 1000000]), def: (c, P) => P.price, typed: true, listing: true },
      { k: "rentUnit", l: "Rent of each other unit, a month", opts: STG_USD([1200, 1800, 2400, 3000]), def: (c, P) => P.rentUnit, typed: true, listing: true },
      { k: "taxYear", l: "Property tax a year, from the listing", opts: STG_USD([0, 4000, 8000, 12000]), def: () => 0, typed: true, listing: true, opt: true, help: "$0 uses the area's percent." },
      { k: "hoa", l: "HOA or common charges a month", opts: STG_USD([0, 100, 250, 400]), def: () => 0, typed: true, listing: true, opt: true },
      { k: "taxPct", l: "Property tax a year, as a percent of the price", opts: [0.6, 1, 1.5, 2, 2.4].map(v => [v, v + "%"]), def: (c, P) => P.taxPct },
      { k: "ins", l: "Home insurance a month", opts: STG_USD([150, 230, 300, 450]), def: (c, P) => P.ins, typed: true },
      { k: "rate", l: "The mortgage rate", opts: STG_PCT([0.06, 0.065, 0.07, 0.075]), def: () => 0.065, term: "stg_pi" },
      { k: "vac", l: "Reserve for an empty unit", opts: STG_PCT([0, 0.03, 0.05, 0.08]), def: () => 0.05, term: "stg_reserves" },
      { k: "rep", l: "Reserve for repairs", opts: STG_PCT([0.03, 0.05, 0.08, 0.1]), def: () => 0.08, term: "stg_reserves" },
      { k: "capex", l: "Reserve for big items, like a roof", opts: STG_PCT([0.03, 0.05, 0.08, 0.1]), def: () => 0.08, term: "stg_reserves" },
      {
        k: "hours",
        l: "Landlord hours a month",
        opts: [
          [2, "2"],
          [5, "5"],
          [10, "10"],
          [20, "20"],
        ],
        def: () => 5,
      },
    ],
    formula: (c, I) => {
      const H = stgHouse(c, I),
        wage = stgWage(c),
        room = I._metro.room,
        low = [I.vac, I.rep, I.capex].some(v => v < 0.05);
      return {
        H,
        save: H.save,
        equity: H.principal + H.apprec,
        once: -H.closing,
        hours: I.hours,
        tiles: [
          ["Owning cost a month", stgM(H.own), "the loan, tax, insurance, FHA insurance, reserves", "stg_pi"],
          ["Your net housing", stgM(H.net), "after " + stgM(H.others * STG_HH.collect) + " of rent"],
          ["Saved a month", stgM(H.save), "next to " + stgM(I.cur) + " now"],
          ["Down payment and closing", stgM(H.down + H.closing), "cash needed at the start"],
        ],
        hidden: [
          ["Growth your cash gives up", stgM(H.lost) + " a month"],
          ["Closing costs, one time", stgM(H.closing)],
          ["Landlord hours", I.hours + " a month" + (wage > 0 ? ", " + stgM(I.hours * wage) + " of your time" : "")],
        ],
        warn: low ? ["A reserve under 5% is thin. One empty month or one repair can use a year of it."] : [],
        alt: H.save > 0 ? "Cheaper rent or a roommate gets you about " + Math.min(100, Math.round(((room * STG_HH.collect) / H.save) * 100)) + "% of this, with no loan. A room here rents for about " + stgM(room) + "." : "A roommate at about " + stgM(room) + " a month saves more than this building does at these numbers.",
        math: [
          "Loan: the price less 3.5% down, plus 1.75% FHA insurance: " + stgM(H.loan) + ".",
          "Loan payment (30 years at " + kitPct(I.rate, 2) + "): " + stgM(H.pi) + ". Property tax: " + stgM(H.tax) + ". Insurance: " + stgM(I.ins) + ". FHA insurance: " + stgM(H.mip) + (I.hoa ? ". HOA: " + stgM(I.hoa) : "") + ".",
          "Reserves: " + kitPct(H.resPct, 0) + " of the other units' rent (" + stgM(H.others) + "): " + stgM(H.reserves) + ".",
          "Owning cost: " + stgM(H.own) + " a month.",
          "Your net housing: " + stgM(H.own) + " - " + stgM(H.others) + " × 0.95 = " + stgM(H.net) + ".",
          "Saved: " + stgM(I.cur) + " - " + stgM(H.net) + " = " + stgM(H.save) + " a month.",
          "With equity: add the loan paid down (" + stgM(H.principal) + " in month 1) and the home's gain at 1% a year (" + stgM(H.apprec) + ").",
          "Growth given up: (down payment + closing) × 7% ÷ 12 = " + stgM(H.lost) + " a month.",
        ],
      };
    },
    dialAsk: "How much of your housing cost should the rent cover? Each row says what would need to be true.",
    dial: (c, I, F) =>
      STG_DIAL.map(r => {
        const target = r[0] === "pays" ? -0.1 * I.cur : I.cur * (1 - r[2]),
          rent = F.H.rentFor(target),
          price = F.H.priceFor(target);
        return {
          k: r[0],
          label: r[1],
          share: r[2],
          rent,
          ok: rent <= I.rentUnit + 0.5,
          need:
            (r[0] === "pays" ? "The building pays you " + stgM(0.1 * I.cur) + " a month. " : r[0] === "same" ? "Your housing costs the same as now. " : "Your housing costs " + stgM(target) + " a month. ") +
            "Each other unit rents for " +
            stgM(Math.max(0, rent)) +
            " or more (typical here: " +
            stgM(I.rentUnit) +
            ")" +
            (price > 0 ? ", or the price is " + stgM(price) + " or less at typical rents." : "."),
        };
      }),
    breakEven: (c, I, F) => "Makes sense if each other unit rents for at least " + stgM(Math.max(0, F.H.rentFor(I.cur - F.H.lost - I.hours * stgWage(c)))) + " a month.",
    breakMath: (c, I, F) => [
      "The rent where the saving covers the hidden costs: the growth your cash gives up (" + stgM(F.H.lost) + ") and your landlord hours (" + stgM(I.hours * stgWage(c)) + ").",
      "Rent needed for each other unit = (owning cost - target net housing) ÷ (units - 1) ÷ 0.95.",
    ],
    verdictRules: (c, I, F, P) => {
      const wage = stgWage(c);
      if (F.H.save < F.H.lost) return "At these numbers it saves " + stgM(F.H.save) + " a month, less than the " + stgM(F.H.lost) + " of growth your down payment gives up.";
      if (I.hours * wage > F.H.save) return "Your landlord hours (" + stgM(I.hours * wage) + " a month at your hourly wage) cost more than the " + stgM(F.H.save) + " it saves.";
      if (!P.pick) return "No row of the dial is within reach at the rents of this area.";
      if (P.chosen && !P.pick.ok) return "The row you set needs " + stgM(P.pick.rent) + " for each other unit. The typical rent here is " + stgM(I.rentUnit) + ".";
      return null;
    },
    risks: [
      "An empty unit or a tenant who does not pay: you still owe the full loan payment.",
      "A big repair in year one, before the reserves have built up.",
      "FHA mortgage insurance stays for the life of the loan unless you refinance.",
      "Rent is taxable income, and a landlord has legal duties that differ in each state and city.",
    ],
    book: (c, I, F) => [
      { id: "hh_price", label: "House hack: the price", v: I.price },
      { id: "hh_rate", label: "House hack: mortgage rate a year", v: I.rate },
      { id: "hh_loan", label: "House hack: the loan", v: F.H.loan, f: "={hh_price}*(1-0.035)*(1+0.0175)" },
      { id: "hh_pi", label: "House hack: loan payment a month", v: F.H.pi, f: "={hh_loan}*({hh_rate}/12)/(1-(1+{hh_rate}/12)^(-360))" },
      { id: "hh_own", label: "House hack: owning cost a month", v: F.H.own, note: "Loan payment + property tax + insurance + FHA insurance + HOA + reserves" },
      { id: "hh_others", label: "House hack: rent of the other units", v: F.H.others },
      { id: "hh_net", label: "House hack: your net housing a month", v: F.H.net, f: "={hh_own}-{hh_others}*0.95" },
      { id: "hh_cur", label: "House hack: your housing now", v: I.cur },
      { id: "hh_save", label: "House hack: saved a month", v: F.H.save, f: "={hh_cur}-{hh_net}" },
    ],
    quests: [
      { t: "Ask one lender what you could borrow with an FHA loan", mins: 30 },
      { t: "Look up 3 listings with 2 to 4 units and type one into the game", mins: 30 },
      { t: "Read your state's basic landlord and tenant rules", mins: 45 },
      { t: "Talk to one person who owns a small rental", mins: 30 },
    ],
  },
  {
    id: "transfer",
    name: "0% balance transfer",
    one: "Move a card balance to a new card that charges 0% for a year or more, and pay it off in that time.",
    lever: "interest",
    effort: 2,
    credit: "Ramit Sethi, I Will Teach You to Be Rich",
    fitChecks: [
      { id: "bal", q: "A card balance at 8% or more", hard: true, auto: (c, I) => I.bal > 0, no: "There is no card balance at 8% or more to move." },
      STG_CK.credit(670),
      { id: "store", q: "The new card is a true 0% card, not a store card with deferred interest", hard: true, no: "A deferred-interest store card charges all the interest from day one if any balance is left. That is not this move." },
    ],
    inputs: [
      { k: "bal", l: "The balance to move", opts: STG_USD([1000, 3000, 6000, 10000]), def: c => stgCards(c).bal, typed: true },
      { k: "apr", l: "Its rate now, a year", opts: [18, 22, 24, 28].map(v => [v, v + "%"]), def: c => Math.round(stgCards(c).apr * 100) / 100 || 24, typed: true },
      { k: "months", l: "Months at 0%", opts: STG_MO([12, 15, 18, 21]), def: () => 15, term: "stg_promo" },
      { k: "fee", l: "The transfer fee", opts: STG_PCT([0.03, 0.04, 0.05]), def: () => 0.03, term: "stg_fee" },
    ],
    formula: (c, I, d) => {
      const fee = I.bal * I.fee,
        pay = (I.bal + fee) / I.months,
        old = stgRun(I.bal, I.apr, pay, I.months),
        saved = old.interest - fee,
        cards = stgCards(c),
        room = stgFree(c, d) + cards.pay;
      let offers = [];
      try {
        offers = vaultLib()
          .offers.map(o => ({ n: (o.bank ? o.bank + " " : "") + (o.n || o.id), w: ((o.hasWords || {}).intro0 || "") + "" }))
          .filter(o => /transfer/i.test(o.w))
          .slice(0, 3);
      } catch (e) {
        report(e, "strategies.js: transfer");
      }
      return {
        fee,
        pay,
        saved,
        oldInt: old.interest,
        room,
        once: saved,
        toDebt: true,
        tiles: [
          ["Interest saved", stgM(saved), "over the " + I.months + " months, after the fee", "stg_promo"],
          ["Payment needed", stgM(pay) + " a month", "to finish before the 0% ends"],
        ],
        hidden: [["The transfer fee, added to the balance", stgM(fee)]],
        notes: offers.length ? ["In the card library with 0% on transfers: " + offers.map(o => o.n + " (" + o.w + ")").join("; ") + "."] : [],
        links: [["Open the card vault", "vault"]],
        math: [
          "The fee: " + stgM(I.bal) + " × " + kitPct(I.fee, 0) + " = " + stgM(fee) + ".",
          "Payment needed: (" + stgM(I.bal) + " + " + stgM(fee) + ") ÷ " + I.months + " = " + stgM(pay) + " a month.",
          "Interest at " + I.apr + "% if the same payment went to the card you have, for " + I.months + " months: " + stgM(old.interest) + ".",
          "Saved: " + stgM(old.interest) + " - " + stgM(fee) + " = " + stgM(saved) + ".",
          "Room for the payment: free-to-spend plus what you pay the card now = " + stgM(room) + " a month.",
        ],
      };
    },
    dialAsk: "How much of it will be gone when the 0% ends? Each row shows the payment.",
    dial: (c, I, F) =>
      stgDialRows(STG_SHARES, (s, k) => {
        const pay = s * F.pay,
          left = (I.bal + F.fee) * (1 - s);
        return k === "same"
          ? { ok: true, pay: 0, need: "No transfer. The card you have charges about " + stgM(F.oldInt) + " in interest over the same " + I.months + " months." }
          : {
              ok: pay <= F.room + 0.5,
              pay,
              left,
              need: "Pay " + stgM(pay) + " a month (you have room for " + stgM(F.room) + ")." + (left > 0.5 ? " " + stgM(left) + " is left when the 0% ends, and costs about " + stgM((left * 0.25) / 12) + " a month at 25%." : " Nothing is left when the 0% ends."),
            };
      }),
    breakEven: (c, I, F) => "Makes sense if the interest you would pay in " + I.months + " months is at least " + stgM(F.fee) + ", the fee. Yours is about " + stgM(F.oldInt) + ".",
    verdictRules: (c, I, F, P) => {
      const cards = stgCards(c);
      if (I.bal > 0 && I.bal / Math.max(1, F.room) <= 2) return "You can clear this balance in 2 months or less as it is. A new card is not worth the fee.";
      if (F.saved <= 0) return "The fee is more than the interest it saves.";
      const reach = P.rows.filter(r => r.ok && r.k !== "same").pop();
      if (!reach) return "Even a quarter of the payment (" + stgM(F.pay * 0.25) + " a month) is more than your room of " + stgM(F.room) + ". With no plan, about " + stgM(I.bal + F.fee) + " would be left at 25% when the 0% ends.";
      return null;
    },
    risks: [
      "What is left when the 0% ends goes to the card's normal rate, often 25% or more.",
      "New spending on the old card brings the balance back. Then there are two.",
      "One late payment can end the 0% early.",
    ],
    book: (c, I, F) => [
      { id: "bt_bal", label: "Balance transfer: the balance", v: I.bal },
      { id: "bt_feep", label: "Balance transfer: the fee, as a share", v: I.fee },
      { id: "bt_months", label: "Balance transfer: months at 0%", v: I.months },
      { id: "bt_fee", label: "Balance transfer: the fee", v: F.fee, f: "={bt_bal}*{bt_feep}" },
      { id: "bt_pay", label: "Balance transfer: payment needed a month", v: F.pay, f: "=({bt_bal}+{bt_fee})/{bt_months}" },
      { id: "bt_old", label: "Balance transfer: interest on the card you have", v: F.oldInt, note: "Month by month at the rate now, with the same payment" },
      { id: "bt_saved", label: "Balance transfer: interest saved", v: F.saved, f: "={bt_old}-{bt_fee}" },
    ],
    quests: [
      { t: "Find your card's rate and balance on the last statement", mins: 5 },
      { t: "Pick one true 0% transfer card in the card vault", mins: 15 },
      { t: "Set an automatic payment for the amount the dial shows", mins: 10 },
      { t: "Put the old card away for the 0% months", mins: 5 },
    ],
  },
  {
    id: "room",
    name: "Rent out a room",
    one: "Rent a spare room in the home you have now, by the month.",
    lever: "housing",
    effort: 3,
    metro: true,
    credit: "Scott Trench, Set for Life",
    fitChecks: [
      {
        id: "home",
        q: "I rent or own my place",
        hard: true,
        fact: "home",
        test: v => v !== "With family",
        no: "The room is not yours to rent out while you live with family. If you get your own place, this move opens.",
      },
      { id: "spare", q: "I have a room I could rent out", hard: true, fact: "spare", test: v => v === "yes", no: "This move needs a spare room." },
      { id: "share", q: "I am fine sharing my home", hard: true, no: "A roommate shares your kitchen and your quiet. That is the trade." },
      { id: "lease", q: "My lease, landlord or HOA allows it", block: "rules", no: "Check the lease or the HOA rules first. Many allow it with a written yes." },
      { id: "house", q: "The people I live with agree", block: "people", auto: c => (stgAlone(c) ? true : null), no: "Everyone at home has to say yes first." },
    ],
    inputs: [
      { k: "cur", l: "Your housing cost now, a month", opts: STG_USD([1200, 1800, 2400, 3000]), def: c => stgHome(c), typed: true },
      { k: "rent", l: "What the room rents for, a month", opts: STG_USD([600, 800, 1000, 1500]), def: (c, P) => P.room, typed: true },
      {
        k: "full",
        l: "Months a year it is rented",
        opts: [
          [6, "6"],
          [9, "9"],
          [12, "12"],
        ],
        def: () => 12,
      },
      { k: "extra", l: "Extra bills from one more person, a month", opts: STG_USD([0, 50, 100]), def: () => 50 },
    ],
    formula: (c, I) => {
      const got = (I.rent * 0.95 * I.full) / 12,
        save = got - I.extra;
      return {
        got,
        save,
        hours: 2,
        tiles: [
          ["Saved a month", stgM(save), "after empty weeks and extra bills"],
          ["Share of your housing it covers", Math.round((save / Math.max(1, I.cur)) * 100) + "%", "of " + stgM(I.cur)],
        ],
        hidden: [
          ["Your time: finding and living with a roommate", "about 2 hours a month"],
          ["Tax", "room rent is income, less the room's share of your costs"],
        ],
        math: ["Rent collected: " + stgM(I.rent) + " × 0.95 × " + I.full + " ÷ 12 = " + stgM(got) + " a month.", "Saved: " + stgM(got) + " - " + stgM(I.extra) + " of extra bills = " + stgM(save) + "."],
      };
    },
    dialAsk: "How much of your housing cost should the room cover?",
    dial: (c, I, F) =>
      STG_DIAL.map(r => {
        const target = r[0] === "pays" ? 1.1 * I.cur : r[2] * I.cur,
          rent = ((target + (r[0] === "same" ? 0 : I.extra)) * 12) / I.full / 0.95;
        return {
          k: r[0],
          label: r[1],
          ok: r[0] === "same" || rent <= I.rent + 0.5,
          need: r[0] === "same" ? "No roommate. Your housing stays at " + stgM(I.cur) + "." : "The room rents for " + stgM(rent) + " or more (typical here: " + stgM(I._metro.room) + ").",
        };
      }),
    breakEven: (c, I) => "Makes sense if the room rents for at least " + stgM(((I.extra + 2 * stgWage(c)) * 12) / I.full / 0.95) + " a month.",
    breakMath: (c, I) => ["The rent that covers the extra bills (" + stgM(I.extra) + ") and about 2 hours a month of your time (" + stgM(2 * stgWage(c)) + ")."],
    verdictRules: (c, I, F) => (F.save <= 0 ? "At this rent the room does not cover its own extra bills." : null),
    risks: ["A roommate who pays late or leaves early.", "Your renter's insurance may not cover their things, or a claim they cause.", "Less privacy at home."],
    quests: [
      { t: "Read your lease or HOA rules about roommates", mins: 15 },
      { t: "Look up 3 room listings near you for the going rent", mins: 15 },
      { t: "Write a one-page room agreement: rent, date due, notice", mins: 30 },
    ],
  },
  {
    id: "consolidate",
    name: "Debt consolidation loan",
    one: "Replace costly card debt with one personal loan at a lower fixed rate and a set end date.",
    lever: "interest",
    effort: 2,
    risky: true,
    credit: "The Consumer Financial Protection Bureau's guide to consolidation",
    fitChecks: [
      { id: "bal", q: "Debt at 8% or more", hard: true, auto: (c, I) => I.bal > 0, no: "There is no debt at 8% or more to replace." },
      STG_CK.credit(670),
      { id: "stop", q: "The cards stay at zero after the loan pays them", hard: true, no: "A loan plus cards that fill up again is two debts in place of one. Fix the spending gap first." },
    ],
    inputs: [
      { k: "bal", l: "The debt to replace", opts: STG_USD([3000, 6000, 10000, 20000]), def: c => stgCards(c, true).bal, typed: true },
      { k: "apr", l: "Its rate now, a year", opts: [18, 22, 24, 28].map(v => [v, v + "%"]), def: c => Math.round(stgCards(c, true).apr * 100) / 100 || 24, typed: true },
      { k: "newApr", l: "The loan's rate, a year", opts: [9, 12, 15, 18].map(v => [v, v + "%"]), def: () => 12, typed: true },
      { k: "term", l: "The loan's length", opts: STG_MO([24, 36, 48, 60]), def: () => 36 },
      { k: "orig", l: "The loan's fee at the start", opts: STG_PCT([0, 0.03, 0.05, 0.08]), def: () => 0.03, term: "stg_orig" },
    ],
    formula: (c, I) => {
      const loan = I.bal / (1 - I.orig),
        fee = loan - I.bal,
        pay = stgPmt(loan, I.newApr / 1200, I.term),
        newInt = pay * I.term - loan,
        old = stgRun(I.bal, I.apr, pay, 1200),
        saved = old.interest - newInt - fee;
      return {
        loan,
        fee,
        pay,
        newInt,
        oldInt: old.interest,
        oldMonths: old.months,
        saved,
        once: saved,
        toDebt: true,
        tiles: [
          ["Saved in total", stgM(saved), "interest, after the fee"],
          ["The loan payment", stgM(pay) + " a month", "for " + I.term + " months, then done"],
        ],
        hidden: [["The fee at the start", stgM(fee)]],
        math: [
          "The loan: " + stgM(I.bal) + " ÷ (1 - " + kitPct(I.orig, 0) + ") = " + stgM(loan) + ", so the fee is " + stgM(fee) + ".",
          "Payment at " + I.newApr + "% for " + I.term + " months: " + stgM(pay) + ". Interest on the loan: " + stgM(newInt) + ".",
          "The same payment on the debt you have, at " + I.apr + "%: " + stgM(old.interest) + " of interest over " + old.months + " months.",
          "Saved: " + stgM(old.interest) + " - " + stgM(newInt) + " - " + stgM(fee) + " = " + stgM(saved) + ".",
        ],
      };
    },
    dialAsk: "How much of the debt moves to the loan?",
    dial: (c, I, F) =>
      stgDialRows(STG_SHARES, (s, k) =>
        k === "same" ? { ok: true, need: "No loan. The debt you have costs about " + stgM(F.oldInt) + " in interest at this payment." } : { ok: F.saved > 0, need: "A loan of " + stgM(F.loan * s) + " at " + I.newApr + "% or less. It saves about " + stgM(F.saved * s) + "." }
      ),
    breakEven: (c, I, F) => {
      let lo = 0,
        hi = I.apr;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2,
          p = stgPmt(F.loan, mid / 1200, I.term),
          s = stgRun(I.bal, I.apr, p, 1200).interest - (p * I.term - F.loan) - F.fee;
        if (s > 0) lo = mid;
        else hi = mid;
      }
      return "Makes sense if the loan's rate is at most " + Math.floor(lo * 10) / 10 + "% a year, with this fee.";
    },
    breakMath: () => ["The game tries loan rates until the interest saved is equal to the fee. A lower rate than that saves money."],
    verdictRules: (c, I, F) => (I.newApr >= I.apr ? "The loan's rate is not lower than the rate you pay now." : F.saved <= 0 ? "With this fee and rate, the loan costs more than it saves." : null),
    risks: ["Cards that fill up again after the loan pays them.", "A fee at the start that eats the saving.", "A longer loan can cost more in total, even at a lower rate."],
    quests: [
      { t: "List each debt at 8% or more with its rate", mins: 10 },
      { t: "Check your rate with 2 lenders that use a soft credit check", mins: 20 },
      { t: "Set the loan payment to pay itself each month", mins: 10 },
    ],
  },
  {
    id: "purchase",
    name: "0% purchase card",
    one: "Put one big planned purchase on a new card with 0% for a year or more, and pay it off in that time.",
    lever: "interest",
    effort: 1,
    credit: "Doctor of Credit",
    fitChecks: [
      { id: "plan", q: "A big purchase I would make anyway", hard: true, no: "This move is for a purchase that is already in your plan. It is not a reason to buy." },
      STG_CK.credit(670),
      Object.assign({}, STG_CK.mask, { q: "No card balance carried now" }),
      { id: "pay", q: "The monthly payment fits in my free-to-spend", block: "money", auto: (c, I, F, d) => F.pay <= stgFree(c, d), no: "The payment to finish in time is more than your free-to-spend." },
      { id: "store", q: "A true 0% card, not deferred interest", hard: true, no: "A deferred-interest offer charges all the interest from day one if any balance is left." },
    ],
    inputs: [
      { k: "amt", l: "The purchase", opts: STG_USD([1000, 2500, 5000, 10000]), def: () => 2500, typed: true },
      { k: "months", l: "Months at 0%", opts: STG_MO([12, 15, 18, 21]), def: () => 15, term: "stg_promo" },
      {
        k: "other",
        l: "How would you pay with no 0% card?",
        opts: [
          ["cash", "From savings"],
          ["card", "On a card at 25%"],
        ],
        def: () => "cash",
      },
    ],
    formula: (c, I) => {
      const pay = I.amt / I.months,
        gain = I.other === "card" ? stgRun(I.amt, 25, pay, I.months).interest : (I.amt * 0.07 * I.months) / 12 / 2;
      return {
        pay,
        gain,
        once: gain,
        tiles: [
          ["Worth", stgM(gain), I.other === "card" ? "interest you do not pay" : "growth while your cash stays invested"],
          ["Payment needed", stgM(pay) + " a month", "to finish before the 0% ends"],
        ],
        math:
          I.other === "card"
            ? ["Interest at 25% on " + stgM(I.amt) + ", paid down by " + stgM(pay) + " a month for " + I.months + " months: " + stgM(gain) + "."]
            : ["Your cash stays invested while you pay over " + I.months + " months. On average half of it is still there: " + stgM(I.amt) + " × 7% × " + I.months + " ÷ 12 ÷ 2 = " + stgM(gain) + "."],
      };
    },
    dialAsk: "How much is paid when the 0% ends?",
    dial: (c, I, F) =>
      stgDialRows(STG_SHARES, (s, k) =>
        k === "same"
          ? { ok: true, need: I.other === "card" ? "The purchase goes on a card at 25%." : "You pay from savings on day one." }
          : { ok: F.pay * s <= stgFree(c) + 0.5, need: "Pay " + stgM(F.pay * s) + " a month." + (s < 1 ? " " + stgM(I.amt * (1 - s)) + " is left at the card's normal rate." : " Nothing is left.") }
      ),
    breakEven: (c, I) => "Makes sense if the purchase is at least " + stgM(I.other === "card" ? 300 : (25 * 24) / 0.07 / I.months) + ", so the move is worth $25 or more.",
    breakMath: () => ["Under about $25 of benefit, a new account is not worth the time."],
    verdictRules: (c, I, F) => (F.gain < 25 ? "It is worth " + stgM(F.gain) + ". That is not enough for a new account." : null),
    risks: ["What is left when the 0% ends goes to the card's normal rate.", "A 0% card can make a purchase feel smaller than it is."],
    quests: [
      { t: "Write down the purchase and its price", mins: 5 },
      { t: "Pick one 0% purchase card in the card vault", mins: 15 },
      { t: "Set an automatic payment for the purchase ÷ the 0% months", mins: 10 },
    ],
  },
  {
    id: "match",
    name: "Get the full job match",
    one: "Put enough into your retirement plan at work to get all the money your job adds.",
    lever: "income",
    effort: 1,
    credit: "The Money Guy Show, the Financial Order of Operations",
    alreadyWhy: "You put in enough to get the full match.",
    already: (c, I) => I.cur >= I.match,
    fitChecks: [
      { id: "offer", q: "My job matches what I put in", hard: true, auto: c => (c.match === "no match offered" ? false : null), no: "Your job does not offer a match, or you do not work for an employer now." },
      { id: "room", q: "Room in my free-to-spend for my part", block: "money", auto: (c, I, F, d) => F.cost <= stgFree(c, d), no: "Your part is more than your free-to-spend now. Start with 1% and raise it with each raise." },
    ],
    inputs: [
      { k: "gross", l: "Your pay a year, before taxes", opts: STG_USD([40000, 60000, 80000, 120000]), def: c => Math.round(((c.take || 0) * 12) / STG_HH.grossUp / 1000) * 1000, typed: true },
      { k: "match", l: "The most your job matches, as a percent of pay", opts: [3, 4, 5, 6].map(v => [v, v + "%"]), def: () => 4, term: "stg_match" },
      { k: "cur", l: "What you put in now", opts: [0, 1, 2, 3, 4, 5, 6].map(v => [v, v + "%"]), def: () => 0 },
    ],
    formula: (c, I) => {
      const gap = Math.max(0, I.match - I.cur) / 100,
        free = (I.gross * gap) / 12,
        cost = free * STG_HH.grossUp;
      return {
        free,
        cost,
        take: free,
        tiles: [
          ["Free money you miss now", stgM(free) + " a month", stgM(free * 12) + " a year", "stg_match"],
          ["What it takes from your paycheck", stgM(cost) + " a month", "your part, after the tax break"],
        ],
        math: [
          "The gap: " + I.match + "% - " + I.cur + "% of " + stgM(I.gross) + " = " + stgM(free * 12) + " a year that your job would add.",
          "Your part is the same amount before tax. After the tax break it takes about " + stgM(cost) + " a month from your paycheck.",
        ],
      };
    },
    dialAsk: "How much of the match do you get?",
    dial: (c, I, F) => stgDialRows(STG_SHARES, (s, k) => (k === "same" ? { ok: true, need: "You stay at " + I.cur + "%." } : { ok: F.cost * s <= stgFree(c) + 0.5, need: "Put in " + Math.round((I.cur + (I.match - I.cur) * s) * 10) / 10 + "% of pay. It takes about " + stgM(F.cost * s) + " a month from your paycheck and adds " + stgM(F.free * s) + " from your job." })),
    breakEven: () => "Makes sense if your job matches at least $1 for your $1, which is a 100% return on day one. Even 50 cents on the dollar is.",
    verdictRules: (c, I, F) => (F.free <= 0 ? "There is no match left to get." : null),
    risks: ["Some jobs take the match back if you leave before a set date (vesting). Ask for the schedule."],
    quests: [
      { t: "Find the match rule in your benefits page or ask HR", mins: 10 },
      { t: "Raise your contribution to the match percent", mins: 10 },
    ],
  },
  {
    id: "hsa",
    name: "Use an HSA",
    one: "With a high-deductible health plan, put health money in an HSA so it is never taxed.",
    lever: "taxes",
    effort: 2,
    credit: "The Mad Fientist, on the HSA as a retirement account",
    fitChecks: [
      { id: "plan", q: "My health plan is a high-deductible plan that allows an HSA", hard: true, fact: "hdhp", test: v => v === "yes", no: "Only a high-deductible health plan allows an HSA. Check at the next open enrollment." },
      STG_CK.mask,
      { id: "room", q: "Room in my free-to-spend for it", block: "money", auto: (c, I, F, d) => F.cost <= stgFree(c, d), no: "The amount is more than your free-to-spend now. A smaller amount still counts." },
    ],
    inputs: [
      {
        k: "cover",
        l: "Who the plan covers",
        opts: [
          ["one", "Me"],
          ["family", "A family"],
        ],
        def: c => (c.deps === "Kids" || c.rel === "Married" ? "family" : "one"),
      },
      { k: "put", l: "What you put in a year", opts: STG_USD([1000, 2000, 4400, 8750]), def: () => 2000, typed: true, term: "stg_hsa" },
      { k: "rate", l: "Your top tax rate", opts: [12, 22, 24, 32].map(v => [v, v + "%"]), def: () => 22 },
      {
        k: "payroll",
        l: "Does it come out of your paycheck?",
        opts: [
          ["yes", "Yes"],
          ["no", "No, I send it myself"],
        ],
        def: () => "yes",
      },
    ],
    formula: (c, I) => {
      const cap = I.cover === "family" ? LIMITS_2026.hsaFamily : LIMITS_2026.hsaOne,
        put = Math.min(I.put, cap),
        rate = I.rate / 100 + (I.payroll === "yes" ? 0.0765 : 0),
        saved = (put * rate) / 12;
      return {
        put,
        saved,
        cost: (put / 12) * (1 - rate),
        take: saved,
        tiles: [
          ["Tax saved", stgM(saved) + " a month", stgM(saved * 12) + " a year"],
          ["The 2026 limit", stgM(cap), I.cover === "family" ? "for a family" : "for one person"],
        ],
        warn: I.put > cap ? ["The amount is over the 2026 limit, so the game uses " + stgM(cap) + "."] : [],
        math: [
          "Tax saved: " + stgM(put) + " × (" + I.rate + "%" + (I.payroll === "yes" ? " + 7.65% payroll tax" : "") + ") = " + stgM(saved * 12) + " a year.",
          "The 2026 limits: " + stgM(LIMITS_2026.hsaOne) + " for one person, " + stgM(LIMITS_2026.hsaFamily) + " for a family (" + LIMITS_2026.source + ").",
        ],
      };
    },
    dialAsk: "How much of the limit do you use?",
    dial: (c, I, F) => {
      const cap = I.cover === "family" ? LIMITS_2026.hsaFamily : LIMITS_2026.hsaOne,
        rate = F.put > 0 ? (F.saved * 12) / F.put : 0;
      return stgDialRows(STG_SHARES, (s, k) => (k === "same" ? { ok: true, need: "No HSA money this year." } : { ok: ((cap * s) / 12) * (1 - rate) <= stgFree(c) + 0.5, need: "Put in " + stgM(cap * s) + " a year (" + stgM((cap * s) / 12) + " a month). It saves " + stgM(cap * s * rate) + " of tax." }));
    },
    breakEven: () => "Makes sense if you can leave at least $1 in it: each dollar skips tax on the way in and on the way out for health costs.",
    verdictRules: (c, I, F) => (F.saved <= 0 ? "At these numbers no tax is saved." : null),
    risks: ["Money taken out for other things before 65 is taxed and has a 20% penalty.", "A high-deductible plan means bigger bills before the plan pays. Keep the deductible in cash."],
    quests: [
      { t: "Check if your health plan allows an HSA", mins: 10 },
      { t: "Set a paycheck amount for the HSA", mins: 10 },
      { t: "Save one health receipt this month", mins: 5 },
    ],
  },
  {
    id: "bank",
    name: "Bank bonus loop",
    one: "Open a new bank account when it pays a cash bonus, meet its rule, and repeat a few times a year.",
    lever: "income",
    effort: 2,
    credit: "Doctor of Credit",
    fitChecks: [
      { id: "dd", q: "I can send part of my paycheck to a new account", block: "rules", no: "Most bonuses need a direct deposit. Ask payroll if your pay can be split." },
      { id: "cash", q: "The cash to park, on top of my bills", block: "money", auto: (c, I, F, d) => d.cash >= I.park, no: "The cash to park is more than you have free now. Pick bonuses that need a direct deposit only." },
      { id: "track", q: "I am fine tracking a few dates", block: "energy", no: "Each bonus has a date to meet and a date when the account can close with no fee." },
    ],
    inputs: [
      { k: "bonus", l: "A typical bonus", opts: STG_USD([200, 300, 400, 500]), def: () => 300 },
      {
        k: "n",
        l: "How many a year",
        opts: [
          [1, "1"],
          [2, "2"],
          [4, "4"],
          [6, "6"],
        ],
        def: () => 2,
      },
      { k: "park", l: "Cash it needs you to park", opts: STG_USD([0, 1000, 5000, 15000]), def: () => 0 },
      { k: "tax", l: "Your top tax rate", opts: [12, 22, 24, 32].map(v => [v, v + "%"]), def: () => 22 },
    ],
    formula: (c, I) => {
      const year = I.bonus * I.n * (1 - I.tax / 100),
        hours = (I.n * 1.5) / 12;
      return {
        year,
        take: year / 12,
        hours,
        tiles: [
          ["Kept a year", stgM(year), "after tax"],
          ["Your time", Math.round(I.n * 1.5 * 10) / 10 + " hours a year", "about 1.5 hours for each bonus"],
        ],
        hidden: [["Tax", "a bank bonus is taxed as interest"]],
        math: ["Kept: " + stgM(I.bonus) + " × " + I.n + " × (1 - " + I.tax + "%) = " + stgM(year) + " a year.", "Time: about 1.5 hours for each bonus, the game's own estimate."],
      };
    },
    dialAsk: "How many of them do you do?",
    dial: (c, I, F) => stgDialRows(STG_SHARES, (s, k) => (k === "same" ? { ok: true, need: "No new accounts." } : { ok: true, need: "About " + Math.max(1, Math.round(I.n * s)) + " a year: " + stgM(F.year * s) + " kept." })),
    breakEven: (c, I) => "Makes sense if a bonus is at least " + stgM((1.5 * stgWage(c)) / (1 - I.tax / 100)) + ", which pays your 1.5 hours at your own hourly wage.",
    verdictRules: (c, I, F) => (F.hours * 12 * stgWage(c) > F.year ? "Your time for it is worth more than the bonuses pay." : null),
    risks: ["A monthly fee when the balance falls under the account's minimum.", "A fee for closing the account too early.", "A missed rule means no bonus."],
    quests: [
      { t: "Ask payroll if your direct deposit can be split", mins: 10 },
      { t: "Pick one bank bonus and write down its rule and dates", mins: 20 },
    ],
  },
  {
    id: "welcome",
    name: "Card welcome bonus",
    one: "Open one new card when its welcome offer is high, and reach the spending it asks for with spending you already do.",
    lever: "income",
    effort: 2,
    credit: "Doctor of Credit, and the game's card vault",
    fitChecks: [
      Object.assign({}, STG_CK.mask, { q: "No card balance carried now", no: "A carried balance costs more than a welcome offer pays. Clear it first." }),
      STG_CK.credit(670),
      {
        id: "spend",
        q: "My normal card spending reaches the minimum in time",
        block: "money",
        auto: (c, I) => {
          try {
            return vaultSpend(c).v * I.months >= I.need;
          } catch (e) {
            report(e, "strategies.js: welcome");
            return null;
          }
        },
        no: "Your normal spending does not reach the minimum in time. Spending more to get a bonus loses money.",
      },
      { id: "full", q: "I pay each card in full each month", hard: true, fact: "payfull", test: v => v === "yes", no: "A welcome offer only pays when no interest is charged. Pay in full first, for a few months." },
    ],
    inputs: [
      {
        k: "value",
        l: "What the offer is worth, as cash",
        opts: STG_USD([200, 500, 750, 1000]),
        def: c => {
          try {
            const m = vaultMoves(c, todayISO())[0];
            return m ? Math.round(m.net) : 500;
          } catch (e) {
            return 500;
          }
        },
        typed: true,
      },
      { k: "need", l: "Spending it asks for", opts: STG_USD([500, 1000, 3000, 4000, 6000]), def: () => 3000, typed: true },
      {
        k: "months",
        l: "In how many months",
        opts: [
          [3, "3"],
          [6, "6"],
        ],
        def: () => 3,
      },
    ],
    formula: (c, I) => ({
      once: I.value,
      tiles: [
        ["The offer", stgM(I.value), "as cash, one time"],
        ["Spending needed", stgM(I.need / I.months) + " a month", "for " + I.months + " months"],
      ],
      links: [["Open the card vault", "vault"]],
      math: ["The offer at its cash value: " + stgM(I.value) + ".", "Spending needed: " + stgM(I.need) + " ÷ " + I.months + " = " + stgM(I.need / I.months) + " a month, from spending you already do."],
    }),
    dialAsk: "How much of the minimum does your normal spending reach?",
    dial: (c, I) => stgDialRows(STG_SHARES, (s, k) => (k === "same" ? { ok: true, need: "No new card." } : { ok: s >= 1, need: s < 1 ? "At " + Math.round(s * 100) + "% of the minimum, the offer pays nothing. It is all or nothing." : "All " + stgM(I.need) + " in " + I.months + " months: " + stgM(I.value) + "." })),
    breakEven: (c, I) => "Makes sense if your normal card spending is at least " + stgM(I.need / I.months) + " a month.",
    verdictRules: () => null,
    risks: ["Spending more than normal to reach the minimum.", "A yearly fee in year two. Set a date to keep, change or close the card.", "A new card lowers your score a little for a few months."],
    quests: [
      { t: "Open the card vault and add the cards you hold", mins: 10 },
      { t: "Pick one offer that your normal spending reaches", mins: 15 },
      { t: "Set the new card to pay itself in full", mins: 10 },
    ],
  },
  {
    id: "raise",
    name: "A raise or a job hop",
    one: "Ask for more pay where you are, or take the same work somewhere that pays more.",
    lever: "income",
    effort: 3,
    credit: "Ramit Sethi, I Will Teach You to Be Rich",
    fitChecks: [
      { id: "job", q: "I work for an employer", hard: true, auto: c => isEmployee(c), no: "This move is for a job with an employer. Side income is the other income move." },
      { id: "wins", q: "I can name 2 results from the last year", block: "skill", no: "Write down two results first. They are what a raise is paid for." },
      { id: "market", q: "I know what my work pays elsewhere", block: "knowledge", no: "Look up 3 job posts with a pay range for your work." },
      { id: "ask", q: "I am ready to ask, or to interview", block: "fear", no: "The ask is the hard part. A script and one practice run make it smaller." },
    ],
    inputs: [{ k: "pct", l: "How much more pay", opts: [3, 5, 10, 15, 20].map(v => [v, v + "%"]), def: () => 10, help: "The career atlas is not in the game yet, so this is your own tap." }],
    formula: (c, I) => {
      const more = ((c.take || 0) * I.pct) / 100;
      return {
        more,
        take: more,
        tiles: [
          ["More take-home", stgM(more) + " a month", stgM(more * 12) + " a year"],
          ["Your hourly wage", cents(stgWage(c) * (1 + I.pct / 100)), "from " + cents(stgWage(c))],
        ],
        math: ["More take-home: " + stgM(c.take || 0) + " × " + I.pct + "% = " + stgM(more) + " a month. This uses the same tax share as now, so the real number is a little lower."],
      };
    },
    dialAsk: "How much of it do you get?",
    dial: (c, I, F) => stgDialRows(STG_SHARES, (s, k) => (k === "same" ? { ok: true, need: "Your pay stays as it is." } : { ok: true, need: "A raise of " + Math.round(I.pct * s * 10) / 10 + "%: about " + stgM(F.more * s) + " more take-home a month." })),
    breakEven: c => "Makes sense if the raise is at least " + stgM(10 * stgWage(c)) + " a year, which pays back about 10 hours of preparation.",
    verdictRules: () => null,
    risks: ["A no. It costs nothing but the ask, and it tells you where you stand.", "A new job is a new boss, a new commute and a new probation period."],
    quests: [
      { t: "Write down 2 results from the last year, with numbers", mins: 20 },
      { t: "Find 3 job posts for your work that show a pay range", mins: 20 },
      { t: "Ask your manager for a pay talk, with a date", mins: 10 },
    ],
  },
  {
    id: "city",
    name: "Move to a cheaper city",
    one: "Live where the same home costs less, and keep the difference.",
    lever: "housing",
    effort: 5,
    risky: true,
    metro: true,
    credit: "Tim Ferriss named it geoarbitrage. Mr. Money Mustache made it a habit.",
    fitChecks: [
      { id: "work", q: "My work can move with me, or I can get work there", hard: true, no: "The move only pays if the income comes with you." },
      { id: "people", q: "The people I live with are in", block: "people", auto: c => (stgAlone(c) ? true : null), no: "A move is a household decision. Start with one talk." },
      { id: "know", q: "I have spent time in that area", block: "knowledge", no: "Visit for a week first. Rent is one number. Daily life is the rest." },
      { id: "ready", q: "I am ready to leave here", block: "fear", no: "Leaving people and places is a real cost. Name what you would miss." },
    ],
    inputs: [
      { k: "cur", l: "Your housing cost now, a month", opts: STG_USD([1200, 1800, 2400, 3000]), def: c => stgHome(c), typed: true },
      { k: "rent", l: "Rent for the same home there", opts: STG_USD([1000, 1400, 1800, 2400]), def: (c, P) => P.br1, typed: true },
      { k: "pay", l: "Change in your pay", opts: [0, -5, -10, -20].map(v => [v, v + "%"]), def: () => 0 },
      { k: "move", l: "The cost of the move", opts: STG_USD([1500, 3000, 6000, 10000]), def: () => 3000, typed: true },
    ],
    formula: (c, I) => {
      const save = I.cur - I.rent,
        pay = ((c.take || 0) * I.pay) / 100;
      return {
        save,
        take: pay,
        once: -I.move,
        net: save + pay,
        tiles: [
          ["Better off a month", stgM(save + pay), "housing " + stgM(save) + (pay ? ", pay " + stgM(pay) : "")],
          ["The move pays back in", save + pay > 0 ? Math.ceil(I.move / (save + pay)) + " months" : "never", stgM(I.move) + " to move"],
        ],
        hidden: [["The move, one time", stgM(I.move)]],
        math: ["Housing: " + stgM(I.cur) + " - " + stgM(I.rent) + " = " + stgM(save) + " a month.", "Pay: " + stgM(c.take || 0) + " × " + I.pay + "% = " + stgM(pay) + " a month.", "Only housing is compared. Food, a car and taxes also change. The city atlas is not in the game yet."],
      };
    },
    dialAsk: "How much of the housing saving do you keep?",
    dial: (c, I, F) => stgDialRows(STG_SHARES, (s, k) => (k === "same" ? { ok: true, need: "You stay where you are." } : { ok: F.save > 0, need: "Rent there is " + stgM(I.cur - F.save * s) + " or less. The rest of the saving goes to a nicer place." })),
    breakEven: (c, I) => "Makes sense if you are better off by at least " + stgM(I.move / 12) + " a month, so the move pays back in a year.",
    verdictRules: (c, I, F) => (F.save <= 0 ? "That area is not cheaper than your home now." : F.net * 12 < I.move ? "The move costs more than a year of what it saves." : null),
    risks: ["Pay often falls with the cost of living.", "A new city has no friends in it on day one.", "Moving back costs the same again."],
    quests: [
      { t: "Tap an area and compare the rent to yours", mins: 10 },
      { t: "Ask if your job can be done from there", mins: 15 },
      { t: "Plan one week there before you decide", mins: 30 },
    ],
  },
  {
    id: "car",
    name: "Car swap",
    one: "Trade a car with a payment for a cheaper one that you own.",
    lever: "spending",
    effort: 3,
    credit: "Mr. Money Mustache",
    fitChecks: [
      { id: "pay", q: "A car payment now", hard: true, auto: (c, I) => I.now > 0, no: "There is no car payment to cut." },
      { id: "fits", q: "A cheaper car fits my life", hard: true, no: "If the car you have is the one your work or family needs, this is not the lever." },
      { id: "equity", q: "The car is worth at least what I owe on it", block: "money", no: "You owe more than the car is worth. A few more months of payments fix that." },
      { id: "time", q: "A weekend or two to sell and buy", block: "time", no: "Selling and buying a car takes a few weekends." },
    ],
    inputs: [
      {
        k: "now",
        l: "Your car payment now, a month",
        opts: STG_USD([0, 300, 450, 600, 800]),
        def: c => {
          const r = c.led ? (c.debts || []).find(x => /\bcar\b/i.test(x.k) && x.amt > 0) : null;
          return r ? r.pay || 0 : 0;
        },
        typed: true,
      },
      { k: "after", l: "The payment after the swap", opts: STG_USD([0, 150, 300]), def: () => 0 },
      { k: "ins", l: "Insurance saved a month", opts: STG_USD([0, 25, 50, 100]), def: () => 25 },
      { k: "cash", l: "Cash you add for the swap", opts: STG_USD([0, 2000, 5000]), def: () => 0 },
    ],
    formula: (c, I) => {
      const save = I.now - I.after + I.ins;
      return {
        save,
        once: -I.cash,
        hours: 0,
        tiles: [
          ["Saved a month", stgM(save), stgM(save * 12) + " a year"],
          ["Cash added", stgM(I.cash), "one time"],
        ],
        math: ["Saved: " + stgM(I.now) + " - " + stgM(I.after) + " + " + stgM(I.ins) + " of insurance = " + stgM(save) + " a month."],
      };
    },
    dialAsk: "How much of the payment goes away?",
    dial: (c, I, F) => stgDialRows(STG_SHARES, (s, k) => (k === "same" ? { ok: true, need: "You keep the car and the payment." } : { ok: true, need: "The payment falls to " + stgM(I.now * (1 - s)) + " a month." })),
    breakEven: (c, I) => "Makes sense if it saves at least " + stgM(I.cash / 12) + " a month, so the cash you add comes back in a year.",
    verdictRules: (c, I, F) => (F.save <= 0 ? "At these numbers the swap saves nothing." : null),
    risks: ["An older car can need a repair sooner.", "Selling a car with a loan on it takes a call to the lender for the payoff amount."],
    quests: [
      { t: "Look up what your car is worth and what you owe on it", mins: 15 },
      { t: "Find 3 listings for a car you could own outright", mins: 20 },
    ],
  },
  {
    id: "side",
    name: "Side income",
    one: "Sell a few hours a week of something people already pay for.",
    lever: "income",
    effort: 4,
    credit: "Nick Loper, Side Hustle Nation",
    fitChecks: [
      { id: "time", q: "A few free hours each week", block: "time", no: "The hours have to come from somewhere. Find them first." },
      { id: "energy", q: "Energy left after my main work", block: "energy", no: "On empty, side work costs more than it pays. Rest comes first." },
      { id: "skill", q: "Something people pay for now", block: "skill", no: "Start with one thing a stranger has paid for before: a task, a trade, a class." },
      { id: "rules", q: "My job allows side work", block: "rules", no: "Read your job's rule on outside work." },
    ],
    inputs: [
      {
        k: "hrs",
        l: "Hours a week",
        opts: [
          [2, "2"],
          [5, "5"],
          [10, "10"],
          [15, "15"],
        ],
        def: () => 5,
      },
      { k: "rate", l: "Pay for an hour", opts: STG_USD([15, 25, 40, 60]), def: () => 25, typed: true },
      { k: "tax", l: "Set aside for tax", opts: STG_PCT([0.15, 0.25, 0.3]), def: () => 0.25 },
    ],
    formula: (c, I) => {
      const hours = I.hrs * 4.33,
        keep = hours * I.rate * (1 - I.tax);
      return {
        keep,
        take: keep,
        hours,
        tiles: [
          ["Kept a month", stgM(keep), "after the tax set-aside"],
          ["Kept for an hour", cents(I.rate * (1 - I.tax)), "your job: " + cents(stgWage(c))],
        ],
        hidden: [["Your time", Math.round(hours) + " hours a month"]],
        math: ["Hours a month: " + I.hrs + " × 4.33 = " + Math.round(hours) + ".", "Kept: " + Math.round(hours) + " × " + stgM(I.rate) + " × (1 - " + kitPct(I.tax, 0) + ") = " + stgM(keep) + "."],
      };
    },
    dialAsk: "How many of those hours do you work?",
    dial: (c, I, F) => stgDialRows(STG_SHARES, (s, k) => (k === "same" ? { ok: true, need: "No side work." } : { ok: true, need: Math.round(I.hrs * s * 10) / 10 + " hours a week: " + stgM(F.keep * s) + " kept a month." })),
    breakEven: (c, I) => "Makes sense if an hour pays at least " + cents((stgWage(c) * 0.5) / (1 - I.tax)) + ", half of your job's real hourly wage after the tax set-aside.",
    verdictRules: (c, I) => (stgWage(c) > 0 && I.rate * (1 - I.tax) < stgWage(c) * 0.5 ? "An hour of it keeps under half of what an hour of your job pays. A raise is the stronger lever." : null),
    risks: ["Tax is not taken out. Set it aside each time you are paid.", "Tired weeks. Plan a way to pause."],
    quests: [
      { t: "Write down 3 things someone has paid you for, or would", mins: 15 },
      { t: "Get one paying customer for one hour", mins: 60 },
      { t: "Open Working for yourself and set your tax set-aside", mins: 10 },
    ],
  },
];
