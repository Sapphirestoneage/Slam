/* ============================================================================
   SLAM the Game: core/metrics.js
   PURPOSE     Key numbers. Each ratio that this game can calculate, in plain words: the value, the rule
               of thumb and its source, what moves the value, and if the player wants to work on it.
               Some ratios open after one answer. KN_LATER lists the ratios that the game cannot
               calculate yet.
   INPUT       The profile: c.x.kin, c.x.kn, c.x.taxPct. The open sheet (W.kind): keynums, metric. The
               taps of the player (the actions in OUTPUT).
   OUTPUT      26 functions. Parts of functions in other files: moneyTabKeyCard. Actions (ACT): keynums,
               kngroup, metric, knask, knans, knset, kncopy.
   DEPENDS ON  core/engine.js, screens/ui.js, screens/planner.js, screens/ux.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: features/debts.js, features/ask2.js.
   RULES       A rule of thumb is a guide, and its source is named. It is not a grade. A number from a
               guess shows as a guess and gets no verdict. A number with a missing input says what input
               is necessary, and does not show N/A. No red.
   SOURCE      The SPARKS ratio list (79 ratios, September 2026). Sources examined on 2026-11-19: 28/36
               on pay before taxes (lenders); 25% of pay before taxes, and 20/3/8 (The Money Guy Show);
               1x to 10x salary by age (Fidelity); 50/30/20 on take-home pay (Warren, All Your Worth);
               the savings-rate table at 5% real growth (Mr. Money Mustache); age x pay / 10 (The
               Millionaire Next Door); card use below 30%, best below 10% (Experian).
   ========================================================================= */
const KN_NET = 0.8; /* take-home is treated as about 80% of pay before taxes until the player answers the tax question */
const KN_FID = [
  [30, 1],
  [35, 2],
  [40, 3],
  [45, 4],
  [50, 6],
  [55, 7],
  [60, 8],
  [67, 10],
];
const KN_GROUPS = [
  ["main", "Main"],
  ["flow", "In and out"],
  ["earn", "Earning"],
  ["safe", "Safety"],
  ["debt", "Debt"],
  ["grow", "Wealth"],
  ["free", "Freedom"],
];
const KN_GNAME = {
  flow: "Money in and out",
  earn: "Earning",
  safe: "Safety",
  debt: "Debt and credit",
  grow: "Building wealth",
  free: "Freedom",
};
/* what the registry holds that the game can't work out yet, and what would unlock each */
const KN_LATER = [
  [
    "Tax bucket mix, Roth share, how full each account is this year",
    "needs each account's type and what went in this year",
  ],
  ["Stock share and employer stock share", "needs what is inside your investments"],
  ["Effective tax rate, withholding accuracy, 0% gains room", "needs a tax return or pay stub"],
  ["Home share of net worth, loan-to-value, price to income", "needs a home value and mortgage"],
  ["Rental numbers: cap rate, cash-on-cash, the 1% rule, DSCR", "needs a rental property"],
  ["Raise capture and lifestyle creep", "needs a year of the game tracking your spending"],
  ["Real hourly wage next to your stated wage", "lives in Your real hourly wage for now"],
  ["Bridge coverage, Social Security coverage, the barista gap", "needs a stop-working date and part-time income"],
];
const KN_ASK = {
  tax: {
    q: "About how much of your pay goes to taxes and anything else taken out before it lands?",
    help: "A pay stub shows pay before taxes at the top and what lands at the bottom. A guess is fine.",
    pct: true,
    opts: [10, 15, 20, 25, 30, 35, 40],
  },
  debtPay: {
    q: "All your debt payments in a month, added together",
    help: "Cards, loans, a car: everything you pay on, minimums plus extra.",
    opts: [0, 100, 250, 400, 600, 900, 1300, 2000],
  },
  limit: {
    q: "All your card limits, added together",
    help: "Each card's limit is in its app or on a statement.",
    opts: [1000, 2500, 5000, 10000, 20000, 40000, 75000],
  },
  pre: {
    q: "What goes into a retirement plan at work each month, before your pay lands",
    help: "It's on your pay stub. If you don't have a plan at work, it's $0.",
    opts: [0, 100, 250, 500, 750, 1000, 1500, 2000],
  },
  matchAmt: {
    q: "What your job adds to that plan each month",
    help: "The match. If there isn't one, it's $0.",
    opts: [0, 50, 100, 200, 300, 500],
  },
  pay1: {
    q: "What you brought home in a month, about a year ago",
    help: "Close is fine. From here on the game tracks it for you.",
    rel: [0.5, 0.7, 0.8, 0.9, 1, 1.1, 1.25],
  },
  fee: {
    q: "What your investments cost you a year",
    help: "Fund fees plus any advisor fee. Index funds are often near 0.05%. An advisor often adds about 1%.",
    pct: true,
    opts: [0.05, 0.2, 0.5, 1, 1.5, 2],
  },
  carPay: {
    q: "Your car payment each month",
    help: "Just the loan or lease payment. No car payment is $0.",
    opts: [0, 200, 350, 500, 700, 900],
  },
  give: {
    q: "What you give away each month",
    help: "Charity, tithing, supporting someone.",
    opts: [0, 25, 50, 100, 200, 400, 800],
  },
};
function knX(c) {
  c.x = c.x || {};
  c.x.kn = c.x.kn || {};
  return c.x.kn;
}
function knIn(c) {
  c.x = c.x || {};
  c.x.kin = c.x.kin || {};
  return c.x.kin;
}
function knGot(c, k) {
  if ((k === "debtPay" || k === "limit") && typeof dbSum === "function") {
    const s = dbSum(c, k === "debtPay" ? "pay" : "lim");
    if (s) return s;
  }
  if (k === "tax") return c.x && c.x.taxPct ? { v: c.x.taxPct, cf: (c.x.kin && c.x.kin.taxcf) || 2 } : null;
  const r = knIn(c)[k];
  return r && r.v != null ? r : null;
}
function knNet(c) {
  const t = c.x && c.x.taxPct ? 1 - Math.min(0.6, c.x.taxPct / 100) : KN_NET,
    known = !!(c.x && c.x.taxPct);
  return {
    f: t,
    known,
    gross: (c.take || 0) / t,
    row: known ? { s: true, cf: (c.x.kin && c.x.kin.taxcf) || 2 } : { s: false },
  };
}
function knSt() {
  const rows = [].concat.apply([], arguments).filter(Boolean);
  if (!rows.length || rows.some(r => !r.s)) return "Guess";
  return rows.every(r => (r.cf || 0) >= 3) ? "Exact" : "Close";
}
function knPct(n) {
  const a = Math.abs(n * 100);
  return (a < 10 && a > 0 ? (Math.round(n * 1000) / 10).toFixed(1) : String(Math.round(n * 100))) + "%";
}
function knN1(n) {
  return String(Math.round(n * 10) / 10);
}
function knRows(c) {
  const sp = c.spends || [],
    by = re => sp.filter(r => re.test(r.k));
  return {
    sp,
    home: by(/^home|rent|mortgage/i),
    move: by(/getting around|car\b|transit|transport/i),
    food: by(/food|grocer/i),
    bills: by(/bills|subscri/i),
    fun: by(/fun|everything else/i),
    needs: sp.filter(r => !/fun|everything else/i.test(r.k)),
  };
}
function knYearAgo(c, today) {
  today = today || todayISO();
  const cut = addDays(today, -300),
    h = (c.hist || []).filter(x => x.d <= cut && x.take > 0);
  if (h.length) return { v: h[h.length - 1].take, d: h[h.length - 1].d, row: { s: true, cf: 2 }, auto: true };
  const a = knGot(c, "pay1");
  return a && a.v > 0 ? { v: a.v, row: { s: true, cf: a.cf || 2 } } : null;
}
function knRate(x) {
  if (typeof dbRate === "function") {
    const r = dbRate(x);
    return r.cf > 0 ? r.v : null;
  }
  return x.rate != null && isFinite(+x.rate) ? +x.rate : null;
}
function knMetrics(c, d) {
  d = d || derive(c);
  const RW = knRows(c),
    sum = a => a.reduce((t, r) => t + (+r.amt || 0), 0),
    take = c.take || 0,
    spend = c.spend || 0,
    N = knNet(c),
    incs = c.incs || [],
    cashes = c.cashes || [],
    invs = c.invs || [],
    debts = c.debts || [],
    M = [],
    K = knX(c);
  const share = x => (take > 0 ? x / take : null),
    gy = N.gross * 12,
    kept = take - spend,
    own = d.cash + c.inv,
    ask = k => knGot(c, k),
    arow = k => {
      const a = ask(k);
      return a ? { s: true, cf: a.cf || 2 } : null;
    };
  const grossNote = N.known ? null : "Pay before taxes is a guess for now: your take-home pay ÷ " + KN_NET + ".",
    taxGo = ["Answer one question", "knask", "tax"];
  const add = m => {
    m.rule = (m.rule || []).filter(Boolean);
    m.math = (m.math || []).filter(Boolean);
    m.moves = (m.moves || []).filter(Boolean);
    m.need = (m.need || []).filter(k => !ask(k));
    if (m.need.length) {
      m.num = null;
      m.val = "?";
    }
    m.focus = K[m.id] === "work";
    m.fine = K[m.id] === "fine";
    m.guess = m.num != null && m.st === "Guess";
    M.push(m);
  };
  const mg = 0.25 / N.f,
    mgp = Math.round(mg * 100),
    hn = 0.28 / N.f,
    hp = Math.round(hn * 100);
  /* ---------- money in and out ---------- */
  {
    const r = take > 0 ? kept / take : null,
      top = RW.sp.slice().sort((a, b) => b.amt - a.amt)[0];
    add({
      id: "save",
      g: "flow",
      n: "Savings rate",
      what: "The share of your take-home pay you keep each month.",
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, RW.sp),
      zone:
        r == null
          ? null
          : r < 0
            ? ["More going out than coming in", "warn"]
            : r < 0.1
              ? ["Getting started", "ok"]
              : r < 0.2
                ? ["Building", "ok"]
                : r < mg
                  ? ["At the 50/30/20 mark", "good"]
                  : r < 0.5
                    ? ["At the Money Guy mark", "good"]
                    : ["FIRE pace", "good"],
      bar:
        r == null
          ? null
          : {
              p: (Math.max(0, r) / 0.6) * 100,
              marks: [
                [20 / 0.6, "20%"],
                [(mg * 100) / 0.6, mgp + "%"],
                [50 / 0.6, "50%"],
              ],
            },
      rule: [
        "50/30/20 rule (Elizabeth Warren, All Your Worth): keep 20% of take-home pay for saving and paying down debt.",
        "The Money Guy Show: work toward 25% of pay before taxes. That is about " + mgp + "% of take-home pay.",
        "Mr. Money Mustache's table (5% growth after inflation, starting from zero): keeping 10% means about 51 working years, 25% about 32, 50% about 17, 75% about 7.",
        "If money goes into a retirement plan at work before your pay lands, your real rate is higher than this shows. See Savings rate, all in.",
      ],
      math: [
        "Comes in each month: " + money(take),
        "Goes out each month: " + money(spend),
        "Kept: " + money(kept) + (take > 0 ? " = " + knPct(kept / take) + " of what comes in" : ""),
      ],
      moves:
        take > 0
          ? [
              top
                ? "Your biggest category is " +
                  top.k +
                  " at " +
                  money(top.amt) +
                  ". Trimming a tenth of it moves this to " +
                  knPct((kept + top.amt * 0.1) / take) +
                  "."
                : null,
              "Bringing in " +
                money(200) +
                " more a month and keeping it moves this to " +
                knPct((kept + 200) / (take + 200)) +
                ".",
            ]
          : [],
      go: ["See where it goes", "tab", "money"],
    });
  }
  {
    const pre = ask("pre"),
      ma = ask("matchAmt"),
      p = pre ? pre.v : 0,
      m = ma ? ma.v : 0,
      g = N.gross,
      r = g > 0 ? (Math.max(0, kept) + p + m) / (g + m) : null;
    add({
      id: "saveall",
      g: "flow",
      n: "Savings rate, all in",
      what: "Everything you save, including money taken out before your pay lands and what your job adds, as a share of pay before taxes.",
      need: ["pre", "tax"],
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, RW.sp, arow("pre"), N.row),
      zone:
        r == null
          ? null
          : r < 0.15
            ? ["Building", "ok"]
            : r < 0.25
              ? ["Past the classic 15%", "good"]
              : ["At the Money Guy mark", "good"],
      bar:
        r == null
          ? null
          : {
              p: (r / 0.5) * 100,
              marks: [
                [30, "15%"],
                [50, "25%"],
              ],
            },
      rule: [
        "This is the version to compare with any published number, because most of them count pay before taxes.",
        "The Money Guy Show: work toward 25% of pay before taxes. They count the job's match only for singles earning under $100,000 or couples under $200,000.",
        "Traditional advice is 15%.",
      ],
      math: [
        "Kept from take-home: " + money(Math.max(0, kept)),
        "Into a plan at work before pay lands: " + money(p),
        "Added by your job: " + money(m) + (ma ? "" : " (not answered, counted as $0)"),
        "Pay before taxes, plus the match: about " + money(g + m),
        g > 0
          ? "(" +
            money(Math.max(0, kept)) +
            " + " +
            money(p) +
            " + " +
            money(m) +
            ") ÷ " +
            money(g + m) +
            " = " +
            knPct(r || 0)
          : null,
      ],
      moves: ma ? [] : ["Tell the game what your job adds and this gets sharper."],
      go: ma ? ["See where it goes", "tab", "money"] : ["Add what your job adds", "knask", "matchAmt"],
    });
  }
  {
    const r = spend > 0 && take > 0 ? Math.max(0, kept) / spend : null;
    add({
      id: "freedom",
      g: "flow",
      n: "Freedom bought each month",
      what: "How many months of your spending one month of work puts away.",
      num: r,
      val: r == null ? "?" : knN1(r) + " mo",
      st: knSt(incs, RW.sp),
      zone:
        r == null
          ? null
          : r >= 1
            ? ["Every month worked buys a month off or more", "good"]
            : ["No rule: it's your savings rate, turned into time", "none"],
      bar: r == null ? null : { p: (Math.min(1.2, r) / 1.2) * 100, marks: [[100 / 1.2, "1"]] },
      rule: ["At a 50% savings rate this is 1.0: every month you work pays for a month you don't have to."],
      math: [
        "Kept each month: " + money(Math.max(0, kept)),
        "Goes out each month: " + money(spend),
        spend > 0 ? money(Math.max(0, kept)) + " ÷ " + money(spend) + " = " + knN1(r || 0) + " months" : null,
      ],
      go: ["See where it goes", "tab", "money"],
    });
  }
  {
    const h = sum(RW.home),
      r = RW.home.length ? share(h) : null,
      free = h === 0;
    add({
      id: "home",
      g: "flow",
      n: "Home cost",
      what: "The share of your take-home pay that goes to rent or mortgage and the home itself.",
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, RW.home),
      zone:
        r == null
          ? null
          : free
            ? ["Not paying for a home right now", "good"]
            : r <= hn
              ? ["Inside the rule of thumb", "good"]
              : r <= hn + 0.1
                ? ["A bit above the rule of thumb", "ok"]
                : ["Heavy", "warn"],
      bar: r == null ? null : { p: (r / 0.6) * 100, marks: [[(hn * 100) / 0.6, hp + "%"]] },
      rule: [
        "The 28/36 rule lenders use: home costs up to 28% of pay before taxes. That is about " +
          hp +
          "% of take-home pay.",
        "The 50/30/20 rule puts every need, home included, inside 50% of take-home pay.",
      ],
      math: [
        "Home: " + money(h) + " a month",
        "Comes in: " + money(take) + " a month",
        take > 0 ? money(h) + " ÷ " + money(take) + " = " + knPct(h / take) : null,
      ],
      moves: [
        c.home === "With family" && c.moveOut
          ? "When you move out, the game plans on about " +
            money(c.moveOut) +
            " a month. At today's pay that would be " +
            (take > 0 ? knPct(c.moveOut / take) : "?") +
            "."
          : "This one moves slowly: a roommate, a better deal at renewal, or more coming in.",
        take > 0 && r > hn
          ? "To sit at the rule of thumb with this home, take-home pay would be about " + money(h / hn) + " a month."
          : null,
      ],
      go: ["Open your spending", "sharp", "spend"],
    });
  }
  {
    const f = sum(RW.food),
      r = RW.food.length ? share(f) : null;
    add({
      id: "food",
      g: "flow",
      n: "Food",
      what: "The share of your take-home pay that goes to groceries and eating out.",
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, RW.food),
      zone: r == null ? null : ["No single rule", "none"],
      bar: r == null ? null : { p: (r / 0.6) * 100, marks: [] },
      rule: [
        "No widely agreed rule. Food is one of the big three with home and getting around, so it is worth knowing.",
      ],
      math: [
        "Food: " + money(f) + " a month",
        take > 0 ? money(f) + " ÷ " + money(take) + " = " + knPct(f / take) : null,
      ],
      go: ["Open your spending", "sharp", "spend"],
    });
  }
  {
    const m = sum(RW.move),
      r = RW.move.length ? share(m) : null;
    add({
      id: "move",
      g: "flow",
      n: "Getting around",
      what: "The share of your take-home pay that goes to the car, gas, insurance, transit and rides.",
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, RW.move),
      zone: r == null ? null : ["No single rule for the whole cost", "none"],
      bar: r == null ? null : { p: (r / 0.6) * 100, marks: [] },
      rule: [
        "There is no widely agreed rule for the whole cost of getting around.",
        "For a car loan, see Car payment: The Money Guy Show's 20/3/8 rule.",
      ],
      math: [
        "Getting around: " + money(m) + " a month",
        take > 0 ? money(m) + " ÷ " + money(take) + " = " + knPct(m / take) : null,
      ],
      go: ["Open your spending", "sharp", "spend"],
    });
  }
  {
    const b = sum(RW.home) + sum(RW.food) + sum(RW.move),
      ok = RW.home.length + RW.food.length + RW.move.length > 0,
      r = ok ? share(b) : null;
    add({
      id: "big3",
      g: "flow",
      n: "The big three",
      what: "Home, getting around and food together, as a share of your take-home pay.",
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, RW.home, RW.food, RW.move),
      zone: r == null ? null : ["Where the big decisions are", "none"],
      bar: r == null ? null : { p: (r / 0.9) * 100, marks: [] },
      rule: [
        "For most people these three are more than half of all spending, so one good decision here beats a hundred small ones.",
      ],
      math: [
        "Home " +
          money(sum(RW.home)) +
          " + getting around " +
          money(sum(RW.move)) +
          " + food " +
          money(sum(RW.food)) +
          " = " +
          money(b),
        take > 0 ? money(b) + " ÷ " + money(take) + " = " + knPct(b / take) : null,
        spend > 0 ? "That is " + knPct(b / spend) + " of everything you spend." : null,
      ],
      go: ["Open your spending", "sharp", "spend"],
    });
  }
  {
    const b = sum(RW.bills),
      r = RW.bills.length ? share(b) : null;
    add({
      id: "bills",
      g: "flow",
      n: "Bills and subscriptions",
      what: "The share of your take-home pay that goes out by itself every month.",
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, RW.bills),
      zone: r == null ? null : ["No single rule", "none"],
      bar: r == null ? null : { p: (r / 0.6) * 100, marks: [] },
      rule: [
        "No fixed rule. It is the first place to look for quick wins, because these keep charging whether you use them or not.",
      ],
      math: [
        "Bills and subscriptions: " + money(b) + " a month",
        take > 0 ? money(b) + " ÷ " + money(take) + " = " + knPct(b / take) : null,
      ],
      go: ["Hunt subscriptions", "games", ""],
    });
  }
  {
    const need = sum(RW.needs),
      fun = sum(RW.fun),
      k2 = Math.max(0, kept),
      ok = take > 0 && RW.sp.length > 0,
      a = ok ? need / take : null,
      b = ok ? fun / take : null,
      s = ok ? k2 / take : null;
    add({
      id: "split",
      g: "flow",
      n: "Needs, fun, saving",
      what: "How each dollar of take-home pay splits three ways.",
      num: a,
      val: ok ? Math.round(a * 100) + " / " + Math.round(b * 100) + " / " + Math.round(s * 100) : "?",
      st: knSt(incs, RW.sp),
      zone: !ok
        ? null
        : a <= 0.5
          ? ["Needs take half or less", "good"]
          : a <= 0.65
            ? ["Needs take a bit more than half", "ok"]
            : ["Needs take most of it", "warn"],
      tri: ok ? [a, b, s] : null,
      rule: [
        "50/30/20 rule (Elizabeth Warren, All Your Worth): 50% of take-home pay to needs, 30% to wants, 20% to saving and paying down debt.",
        "The game counts home, food, getting around and bills as needs, and fun as wants. Your real split may differ, since food and bills hold some of both.",
      ],
      math: [
        "Needs: " + money(need),
        "Fun: " + money(fun),
        "Kept: " + money(k2),
        "Each one divided by " + money(take) + " coming in",
      ],
      moves:
        ok && a > 0.5
          ? ["Needs above half usually trace back to home or getting around. Those are the two worth a look."]
          : [],
      go: ["See where it goes", "tab", "money"],
    });
  }
  {
    const dp = ask("debtPay"),
      v = dp ? dp.v : 0,
      r = take > 0 ? v / take : null;
    add({
      id: "debtpay",
      g: "flow",
      n: "Debt payments",
      what: "The share of your take-home pay that goes to debt payments.",
      need: ["debtPay"],
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, arow("debtPay")),
      zone: r == null ? null : v <= 0 ? ["No payments", "good"] : ["No single rule on take-home pay", "none"],
      bar: r == null ? null : { p: (r / 0.6) * 100, marks: [] },
      rule: ["Lenders measure this against pay before taxes instead. See Debt-to-income."],
      math: [
        "Debt payments: " + money(v) + " a month",
        take > 0 ? money(v) + " ÷ " + money(take) + " = " + knPct(v / take) : null,
      ],
      go: ["Open your debt plan", "debtplan", ""],
    });
  }
  {
    const dp = ask("debtPay"),
      h = sum(RW.home),
      v = (dp ? dp.v : 0) + h,
      g = N.gross,
      r = g > 0 ? v / g : null,
      f = g > 0 ? h / g : null;
    add({
      id: "dti",
      g: "flow",
      n: "Debt-to-income (DTI)",
      what: "Home cost plus every debt payment, as a share of pay before taxes. It is the number a lender looks at.",
      need: ["debtPay", "tax"],
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, RW.home, arow("debtPay"), N.row),
      zone: r == null ? null : r <= 0.36 ? ["Inside the 36% guideline", "good"] : ["Above the 36% guideline", "warn"],
      bar:
        r == null
          ? null
          : {
              p: (r / 0.6) * 100,
              marks: [
                [28 / 0.6, "28%"],
                [36 / 0.6, "36%"],
              ],
            },
      rule: [
        "The 28/36 rule: home costs at 28% or less of pay before taxes (the front end), and home plus all debt payments at 36% or less (the back end).",
        "Many lenders approve above 36%. It is a guideline, not a wall.",
      ],
      math: [
        "Home: " + money(h),
        "Debt payments: " + money(dp ? dp.v : 0),
        "Pay before taxes: about " + money(g),
        g > 0 ? "Front end: " + money(h) + " ÷ " + money(g) + " = " + knPct(f || 0) : null,
        g > 0 ? "Back end: " + money(v) + " ÷ " + money(g) + " = " + knPct(r || 0) : null,
      ],
      go: ["Open your debt plan", "debtplan", ""],
    });
  }
  if (RW.move.length) {
    const cp = ask("carPay"),
      v = cp ? cp.v : 0,
      g = N.gross,
      r = g > 0 ? v / g : null;
    add({
      id: "carpay",
      g: "flow",
      n: "Car payment",
      what: "Your car payment as a share of pay before taxes.",
      need: ["carPay", "tax"],
      num: r,
      val: r == null ? "?" : v <= 0 ? "$0" : knPct(r),
      st: knSt(incs, arow("carPay"), N.row),
      zone:
        r == null
          ? null
          : v <= 0
            ? ["No car payment", "good"]
            : r <= 0.08
              ? ["Inside the 8%", "good"]
              : ["Above the 8%", "ok"],
      bar: r == null ? null : { p: (r / 0.2) * 100, marks: [[40, "8%"]] },
      rule: [
        "The Money Guy Show's 20/3/8 rule for a car loan: 20% down, paid off in 3 years or less, payments at 8% or less of pay before taxes.",
      ],
      math: [
        "Car payment: " + money(v),
        "Pay before taxes: about " + money(g),
        g > 0 ? money(v) + " ÷ " + money(g) + " = " + knPct(r || 0) : null,
      ],
      go: ["Open your spending", "sharp", "spend"],
    });
  }
  {
    const gv = ask("give"),
      v = gv ? gv.v : 0,
      r = take > 0 ? v / take : null;
    add({
      id: "give",
      g: "flow",
      n: "Giving",
      what: "The share of your take-home pay you give away.",
      need: ["give"],
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(incs, arow("give")),
      zone: r == null ? null : ["You set the target", "none"],
      bar: r == null ? null : { p: (r / 0.25) * 100, marks: [[40, "10%"]] },
      rule: ["There is no rule here but your own. Tithing aims at 10%."],
      math: [
        "Giving: " + money(v) + " a month",
        take > 0 ? money(v) + " ÷ " + money(take) + " = " + knPct(v / take) : null,
      ],
      go: ["Open calendars and giving", "cals", ""],
    });
  }
  /* ---------- earning ---------- */
  {
    const y = knYearAgo(c),
      r = y && y.v > 0 && take > 0 ? (take - y.v) / y.v : null,
      since = (c.hist || [])[0];
    add({
      id: "growth",
      g: "earn",
      n: "Income growth",
      what: "How your take-home pay compares with a year ago.",
      need: y ? [] : ["pay1"],
      num: r,
      val: r == null ? "?" : (r > 0 ? "+" : "") + knPct(r),
      st: knSt(incs, y ? y.row : null),
      zone:
        r == null
          ? null
          : r > 0.005
            ? ["Up from a year ago", "good"]
            : r < -0.005
              ? ["Down from a year ago", "warn"]
              : ["About the same", "none"],
      bar: null,
      rule: [
        "No rule of thumb for the size. Growing what comes in is the lever with no ceiling, and cutting only goes so far.",
        "Common advice when pay goes up: keep at least half of the raise.",
        since ? "The game has saved what comes in since " + since.d + ", so from here this tracks itself." : null,
      ],
      math: y
        ? [
            "A year ago" + (y.d ? " (" + y.d + ")" : "") + ": " + money(y.v) + " a month",
            "Now: " + money(take) + " a month",
            "(" + money(take) + " − " + money(y.v) + ") ÷ " + money(y.v) + " = " + (r > 0 ? "+" : "") + knPct(r || 0),
          ]
        : [],
      moves:
        take > 0
          ? [
              "Every " +
                money(100) +
                " more a month that you keep adds " +
                knPct(100 / (take + 100)) +
                " to your savings rate.",
            ]
          : [],
      go: ["Open what comes in", "sharp", "take"],
    });
  }
  if (incs.length > 1) {
    const tot = sum(incs),
      side = sum(incs.filter(x => /side|own business|gig/i.test(x.k))),
      big = incs.slice().sort((a, b) => b.amt - a.amt)[0];
    add({
      id: "side",
      g: "earn",
      n: "Side income",
      what: "The share of what comes in that is from side gigs or your own business.",
      num: tot > 0 ? side / tot : null,
      val: tot > 0 ? knPct(side / tot) : "?",
      st: knSt(incs),
      zone: tot > 0 ? ["No rule: it shows how much you built yourself", "none"] : null,
      bar: tot > 0 ? { p: (side / tot) * 100, marks: [] } : null,
      rule: ["No rule. More sources usually means a smaller hit when one stops."],
      math: ["Side gigs and your own business: " + money(side), "Everything coming in: " + money(tot)],
      go: ["Open what comes in", "sharp", "take"],
    });
    add({
      id: "conc",
      g: "earn",
      n: "Biggest income source",
      what: "How much of what comes in depends on one source.",
      num: tot > 0 ? big.amt / tot : null,
      val: tot > 0 ? knPct(big.amt / tot) : "?",
      st: knSt(incs),
      zone: tot > 0 ? ["No rule: it shows how much rides on one source", "none"] : null,
      bar: tot > 0 ? { p: (big.amt / tot) * 100, marks: [] } : null,
      rule: ["When most of your pay comes from one place, the cushion is what protects you if it stops."],
      math: [big.k + ": " + money(big.amt), "Everything coming in: " + money(tot)],
      go: ["Open what comes in", "sharp", "take"],
    });
  }
  if (c.work !== "Retired") {
    const known = !!(c.sharp && c.sharp.match),
      v = c.match;
    add({
      id: "match",
      g: "earn",
      n: "Job match",
      what: "Whether you are getting all the money your job offers to add to your retirement plan.",
      num: known ? 1 : null,
      val: !known ? "?" : v === "yes" ? "Getting it" : v === "no" ? "Leaving some" : "None offered",
      st: known ? "Exact" : "Guess",
      zone: !known
        ? null
        : v === "yes"
          ? ["All of it", "good"]
          : v === "no"
            ? ["Free money on the table", "warn"]
            : ["Nothing to capture here", "none"],
      bar: null,
      rule: [
        "The Money Guy Show's order puts the match second, right after a starter cushion, because it is an instant return.",
        "Nearly every plan agrees: take all of it before paying extra on anything else.",
      ],
      math: [],
      go: ["Answer the match question", "sharp", "match"],
    });
    if (!known) {
      const m = M[M.length - 1];
      m.num = null;
      m.val = "?";
      m.need = [];
      m.lockgo = true;
    }
  }
  /* ---------- safety ---------- */
  {
    const cash = d.cash,
      mo = spend > 0 ? cash / spend : null;
    add({
      id: "cushion",
      g: "safe",
      n: "Cushion",
      what: "How many months of spending your cash could cover if money stopped coming in.",
      num: mo,
      val: mo == null ? "?" : knN1(mo) + " mo",
      st: knSt(cashes, RW.sp),
      zone:
        mo == null
          ? null
          : cash < 1000 && mo < 3
            ? ["Before your first $1,000", "warn"]
            : mo < 1
              ? ["Little e covered", "ok"]
              : mo < 3
                ? ["Building toward Big E", "ok"]
                : mo <= 6
                  ? ["In the 3 to 6 month range", "good"]
                  : ["Past 6 months", "good"],
      bar:
        mo == null
          ? null
          : {
              p: (mo / 8) * 100,
              marks: [
                [(3 / 8) * 100, "3"],
                [(6 / 8) * 100, "6"],
              ],
            },
      rule: [
        "Common rule of thumb: 3 to 6 months of spending in cash. Lean toward more if your income swings or one paycheck carries the household.",
        "First stop is $1,000 for a little e (a tire, a vet visit), so it never has to go on a card. The full cushion is for a Big E (a lost job, a medical emergency).",
      ],
      math: [
        "Cash you can reach: " + money(cash),
        "Goes out each month: " + money(spend),
        spend > 0 ? money(cash) + " ÷ " + money(spend) + " = " + knN1(mo) + " months" : null,
      ],
      moves:
        spend > 0
          ? [
              cash < 1000
                ? "You are " + money(1000 - cash) + " from your first $1,000."
                : mo < 3
                  ? "Three months of your spending is " +
                    money(spend * 3) +
                    ". You are " +
                    money(spend * 3 - cash) +
                    " away."
                  : mo < 6
                    ? "Six months of your spending is " + money(spend * 6) + "."
                    : "Past six months, extra cash usually does more invested or on a goal.",
            ]
          : [],
      go: ["Open your cash", "sharp", "cash"],
    });
  }
  {
    const tgt = d.target * spend,
      r = tgt > 0 ? d.cash / tgt : null;
    add({
      id: "bige",
      g: "safe",
      n: "Big E fund",
      what: "How full your cushion is against the game's own target for you.",
      num: r,
      val: r == null ? "?" : knPct(Math.min(r, 9.99)),
      st: knSt(cashes, RW.sp),
      zone: r == null ? null : r >= 1 ? ["Full", "good"] : ["Filling", "ok"],
      bar: r == null ? null : { p: Math.min(1, r) * 100, marks: [] },
      rule: [
        "The game's Rule of 5: your age ÷ 5 is the number of months of spending to hold. At " +
          c.age +
          " that is " +
          knN1(d.target) +
          " months.",
      ],
      math: [
        "Target: " + knN1(d.target) + " months × " + money(spend) + " = " + money(tgt),
        "Cash you can reach: " + money(d.cash),
        tgt > 0 ? money(d.cash) + " ÷ " + money(tgt) + " = " + knPct(r || 0) : null,
      ],
      moves: r != null && r < 1 ? ["You are " + money(tgt - d.cash) + " from full."] : [],
      go: ["Open your cash", "sharp", "cash"],
    });
  }
  if (d.varies) {
    const r = spend > 0 ? c.low / spend : null;
    add({
      id: "lean",
      g: "safe",
      n: "Lean month",
      what: "How much of your spending your lowest normal month covers by itself.",
      num: r,
      val: r == null ? "?" : knPct(r),
      st: c.sharp && c.sharp.low ? knSt(RW.sp) : "Guess",
      zone:
        r == null
          ? null
          : r >= 1
            ? ["Your lowest month covers it", "good"]
            : r >= 0.75
              ? ["Close to covering it", "ok"]
              : ["Leans on your cushion", "warn"],
      bar: r == null ? null : { p: (Math.min(1.2, r) / 1.2) * 100, marks: [[100 / 1.2, "100%"]] },
      rule: [
        "For income that swings, the usual advice: plan your spending from your lowest normal month, and let the better months fill the cushion.",
      ],
      math: [
        "Lowest normal month: " + money(c.low),
        "Goes out each month: " + money(spend),
        d.lowGap > 0 ? "Short in a lean month: " + money(d.lowGap) : null,
        d.lowCover != null ? "Your cash covers about " + Math.floor(d.lowCover) + " lean months in a row" : null,
      ],
      moves:
        d.lowGap > 0
          ? ["A lean month comes up " + money(d.lowGap) + " short. That is the first job of your cushion."]
          : [],
      go: ["Open what comes in", "sharp", "take"],
    });
  }
  /* ---------- debt and credit ---------- */
  {
    const hi = sum(debts.filter(x => x.high));
    add({
      id: "highdebt",
      g: "debt",
      n: "High-interest debt",
      what: "What you owe on cards and anything else charging about 8% or more.",
      num: hi,
      val: money(hi),
      st: debts.length ? knSt(debts) : c.led ? "Close" : "Guess",
      zone: hi <= 0 ? ["None", "good"] : ["Costs you every month", "warn"],
      bar: null,
      rule: [
        "Nearly every plan clears this early. The Money Guy Show's order puts it third, right after a starter cushion and any free job match.",
        "Paying it down is a sure return at whatever rate the debt charges.",
      ],
      math: debts
        .filter(x => x.high)
        .map(x => x.k + ": " + money(x.amt))
        .concat([
          "Total: " + money(hi),
          c.debt > 0 ? "That is " + knPct(hi / c.debt) + " of everything you owe." : null,
        ]),
      moves:
        hi > 0
          ? ["Every extra " + money(100) + " here stops charging you interest for good."]
          : ["Nothing to do here. Keeping it at zero is the win."],
      go: ["Open your debt plan", "debtplan", ""],
    });
  }
  {
    const mo = take > 0 ? c.debt / take : null;
    add({
      id: "debtload",
      g: "debt",
      n: "Debt next to pay",
      what: "Everything you owe, counted in months of take-home pay.",
      num: mo,
      val: mo == null ? "?" : c.debt <= 0 ? "0 mo" : knN1(mo) + " mo",
      st: debts.length ? knSt(incs, debts) : knSt(incs),
      zone: mo == null ? null : c.debt <= 0 ? ["Debt free", "good"] : ["No single rule for this one", "none"],
      bar: null,
      rule: ["Lenders look at monthly payments instead. See Debt-to-income."],
      math: [
        "Everything you owe: " + money(c.debt),
        "Comes in each month: " + money(take),
        take > 0 ? money(c.debt) + " ÷ " + money(take) + " = " + knN1(mo) + " months of pay" : null,
      ],
      go: ["Open what you owe", "sharp", "debt"],
    });
  }
  {
    const r = own > 0 ? c.debt / own : null;
    add({
      id: "debtassets",
      g: "debt",
      n: "Debt next to what you have",
      what: "What you owe for every dollar you have in cash and investments.",
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(cashes, invs, debts),
      zone:
        r == null
          ? null
          : c.debt <= 0
            ? ["Debt free", "good"]
            : r < 1
              ? ["You have more than you owe", "none"]
              : ["You owe more than you have", "none"],
      bar: r == null ? null : { p: (Math.min(1.5, r) / 1.5) * 100, marks: [[100 / 1.5, "100%"]] },
      rule: ["No named rule. Under 100% means your net worth is above zero, and lower is sturdier."],
      math: [
        "Owed: " + money(c.debt),
        "Cash and investments: " + money(own),
        own > 0 ? money(c.debt) + " ÷ " + money(own) + " = " + knPct(r) : null,
      ],
      go: ["Open My Money", "tab", "money"],
    });
  }
  {
    const cards = sum(debts.filter(x => /card/i.test(x.k))),
      hasCard = debts.some(x => /card/i.test(x.k)) || (c.debtKinds || []).some(k => /card/i.test(k)),
      lm = ask("limit"),
      r = lm && lm.v > 0 ? cards / lm.v : null;
    if (hasCard || lm)
      add({
        id: "util",
        g: "debt",
        n: "Card use",
        what: "How much of your card limits you are using. Lenders call it utilization.",
        need: ["limit"],
        num: r,
        val: r == null ? "?" : knPct(r),
        st: knSt(
          debts.filter(x => /card/i.test(x.k)),
          arow("limit")
        ),
        zone:
          r == null
            ? null
            : r < 0.1
              ? ["Single digits", "good"]
              : r < 0.3
                ? ["Under 30%", "good"]
                : ["Above 30%", "warn"],
        bar:
          r == null
            ? null
            : {
                p: Math.min(1, r) * 100,
                marks: [
                  [10, "10%"],
                  [30, "30%"],
                ],
              },
        rule: [
          "Experian: under 30% keeps it from pulling your credit score down, and people with the best scores are usually under 10%.",
          "It resets each month, so paying a balance down shows up fast.",
        ],
        math: [
          "Card balances: " + money(cards),
          "Card limits: " + money(lm ? lm.v : 0),
          lm && lm.v > 0 ? money(cards) + " ÷ " + money(lm.v) + " = " + knPct(r) : null,
        ],
        moves: r != null && r >= 0.3 ? ["Getting under 30% takes " + money(cards - 0.3 * lm.v) + " paid down."] : [],
        go: ["Open your debt plan", "debtplan", ""],
      });
  }
  {
    const st = sum(debts.filter(x => /student/i.test(x.k)));
    if (st > 0) {
      const r = gy > 0 ? st / gy : null;
      add({
        id: "student",
        g: "debt",
        n: "Student loans next to pay",
        what: "Your student loans, counted in years of pay before taxes.",
        num: r,
        val: r == null ? "?" : knN1(r) + "x",
        st: knSt(
          incs,
          debts.filter(x => /student/i.test(x.k)),
          N.row
        ),
        zone: r == null ? null : r <= 1 ? ["Under a year of pay", "good"] : ["More than a year of pay", "none"],
        bar: r == null ? null : { p: (Math.min(2, r) / 2) * 100, marks: [[50, "1x"]] },
        rule: ["Common rule of thumb: keep student loans at or under one year of pay."],
        math: ["Student loans: " + money(st), "A year of pay before taxes: about " + money(gy), grossNote],
        go: N.known ? ["Open what you owe", "sharp", "debt"] : taxGo,
      });
    }
  }
  {
    const rated = debts.filter(x => x.amt > 0 && knRate(x) != null),
      all = debts.filter(x => x.amt > 0);
    if (all.length) {
      const mo = rated.reduce((t, x) => t + (x.amt * knRate(x)) / 100 / 12, 0),
        full = rated.length === all.length;
      add({
        id: "interest",
        g: "debt",
        n: "Interest each month",
        what: "What your debts charge you every month just to exist.",
        num: rated.length ? mo : null,
        val: rated.length ? money(mo) : "?",
        st: rated.length ? (full && rated.every(x => x.rate != null) ? knSt(rated) : "Close") : "Guess",
        zone: rated.length ? (mo <= 0 ? ["Nothing", "good"] : ["Money that buys you nothing", "none"]) : null,
        bar: null,
        rule: ["No rule. Every dollar here is a dollar that buys nothing, so it is the cleanest number to shrink."],
        math: rated
          .map(
            x =>
              x.k +
              ": " +
              money(x.amt) +
              " at " +
              knRate(x) +
              "% = " +
              money((x.amt * knRate(x)) / 100 / 12) +
              " a month"
          )
          .concat([
            full ? null : "Some debts have no rate yet, so the real number is higher.",
            take > 0 && rated.length ? "That is " + knPct(mo / take) + " of your take-home pay." : null,
          ]),
        go: ["Add your rates", "debtplan", ""],
      });
      if (!rated.length) M[M.length - 1].lockgo = true;
    }
  }
  /* ---------- building wealth ---------- */
  {
    const h0 = c.base && c.base.nw != null ? c.base : c.hist && c.hist.length ? c.hist[0] : null,
      chg = h0 ? d.nw - h0.nw : null;
    add({
      id: "nw",
      g: "grow",
      n: "Net worth",
      what: "Everything you have minus everything you owe.",
      num: d.nw,
      val: money(d.nw),
      st: knSt(cashes, invs, debts),
      zone: d.nw < 0 ? ["Digging out", "none"] : ["Above zero", "good"],
      bar: null,
      rule: [
        "There is no rule of thumb for the number. The direction matters more: is it going up?",
        chg != null && h0.d ? "Since " + h0.d + ": " + (chg >= 0 ? "up " : "down ") + money(Math.abs(chg)) + "." : null,
      ],
      math: [
        "Cash: " + money(d.cash),
        "Invested: " + money(c.inv),
        "Owed: " + money(c.debt),
        money(d.cash) + " + " + money(c.inv) + " − " + money(c.debt) + " = " + money(d.nw),
      ],
      go: ["Open My Money", "tab", "money"],
    });
  }
  {
    const x = gy > 0 ? c.inv / gy : null,
      age = c.age || 0,
      nxt = KN_FID.find(m => m[0] >= age) || KN_FID[KN_FID.length - 1],
      prev = KN_FID.slice()
        .reverse()
        .find(m => m[0] <= age);
    add({
      id: "invx",
      g: "grow",
      n: "Invested next to a year of pay",
      what: "What you have invested, counted in years of pay before taxes.",
      num: x,
      val: x == null ? "?" : knN1(x) + "x",
      st: knSt(incs, invs, N.row),
      zone:
        x == null
          ? null
          : prev
            ? x >= prev[1]
              ? ["At Fidelity's mark for " + prev[0], "good"]
              : ["Fidelity's mark for " + prev[0] + " is " + prev[1] + "x", "ok"]
            : x >= 1
              ? ["Already past the mark for 30", "good"]
              : ["First mark: 1x by 30", "none"],
      bar: x == null ? null : { p: Math.min(1, x / Math.max(1, nxt[1])) * 100, marks: [] },
      rule: [
        "Fidelity's guideline: 1x your salary saved by 30, 3x by 40, 6x by 50, 8x by 60 and 10x by 67.",
        "It assumes working to 67, so treat it as a loose guide if you want out earlier.",
      ],
      math: [
        "Invested: " + money(c.inv),
        "A year of pay before taxes: about " + money(gy),
        gy > 0 ? money(c.inv) + " ÷ " + money(gy) + " = " + knN1(x) + "x" : null,
        grossNote,
      ],
      moves:
        x != null && x < nxt[1]
          ? ["The next mark is " + nxt[1] + "x by " + nxt[0] + ": about " + money(gy * nxt[1]) + " at today's pay."]
          : [],
      go: N.known ? ["Open what you have invested", "sharp", "inv"] : taxGo,
    });
  }
  {
    const exp = ((c.age || 0) * gy) / 10,
      r = exp > 0 ? d.nw / exp : null;
    add({
      id: "paw",
      g: "grow",
      n: "Wealth for your age and pay",
      what: "Your net worth next to what The Millionaire Next Door formula expects for your age and pay.",
      num: r,
      val: r == null ? "?" : knN1(r) + "x",
      st: knSt(incs, cashes, invs, debts, N.row),
      zone:
        r == null
          ? null
          : (c.age || 0) < 30
            ? ["Runs harsh under 30", "none"]
            : r >= 2
              ? ["Twice the expected mark", "good"]
              : r >= 0.5
                ? ["Around the expected mark", "none"]
                : ["Under the expected mark", "none"],
      bar:
        r == null
          ? null
          : {
              p: (Math.max(0, Math.min(2.5, r)) / 2.5) * 100,
              marks: [
                [40, "1x"],
                [80, "2x"],
              ],
            },
      rule: [
        "The Millionaire Next Door (Stanley and Danko): expected net worth = your age × a year of pay before taxes ÷ 10. Twice that makes you what the book calls a prodigious accumulator of wealth.",
        "It is known to run harsh on people in their 20s, who have had little time to build.",
      ],
      math: [
        "Age " + c.age + " × " + money(gy) + " ÷ 10 = " + money(exp) + " expected",
        "Net worth: " + money(d.nw),
        exp > 0 ? money(d.nw) + " ÷ " + money(exp) + " = " + knN1(r) + "x" : null,
        grossNote,
      ],
      go: N.known ? ["Open My Money", "tab", "money"] : taxGo,
    });
  }
  {
    const r = own > 0 ? c.inv / own : null;
    add({
      id: "invshare",
      g: "grow",
      n: "Share that is invested",
      what: "How much of your cash and investments is actually invested.",
      num: r,
      val: r == null ? "?" : knPct(r),
      st: knSt(cashes, invs),
      zone: r == null ? null : ["No single rule", "none"],
      bar: r == null ? null : { p: r * 100, marks: [] },
      rule: [
        "Cash keeps you safe and investments grow. Once the cushion is full, more of each new dollar usually does more invested.",
      ],
      math: ["Invested: " + money(c.inv), "Cash and investments: " + money(own)],
      go: ["Open My Money", "tab", "money"],
    });
  }
  {
    const lock = sum(invs.filter(x => /retirement|ira|hsa|401|403/i.test(x.k))),
      r = own > 0 && invs.length ? lock / own : null;
    if (c.inv > 0)
      add({
        id: "trap",
        g: "grow",
        n: "Locked share",
        what: "How much of what you have sits in retirement accounts you can't easily reach before 59½.",
        num: r,
        val: r == null ? "?" : knPct(r),
        st: knSt(cashes, invs),
        zone: r == null ? null : r > 0.8 ? ["Most of it is locked", "ok"] : ["Some of it is reachable", "none"],
        bar: r == null ? null : { p: r * 100, marks: [[80, "80%"]] },
        rule: [
          "BiggerPockets Money calls this the middle-class trap: plenty of wealth on paper, little of it reachable early.",
          "It only matters if you want to stop or slow down before 59½. Then reachable money is the bridge.",
        ],
        math: [
          "In retirement accounts and HSA: " + money(lock),
          "Cash and investments: " + money(own),
          "A home isn't in the game yet. Home equity would add to the locked side.",
        ],
        go: ["Open what you have invested", "sharp", "inv"],
      });
  }
  {
    const f = ask("fee"),
      yr = f ? (c.inv * f.v) / 100 : null;
    if (c.inv > 0)
      add({
        id: "fee",
        g: "grow",
        n: "Investment fees",
        what: "What your investments cost you each year.",
        need: ["fee"],
        num: yr,
        val: yr == null ? "?" : money(yr) + "/yr",
        st: knSt(invs, arow("fee")),
        zone:
          yr == null ? null : f.v <= 0.2 ? ["Low", "good"] : f.v <= 0.5 ? ["Middle", "none"] : ["Worth a look", "ok"],
        bar: null,
        rule: [
          "Broad index funds often cost around 0.05% to 0.2% a year. An advisor fee is often about 1% on top.",
          "A fee comes out every year whether the market is up or down, so it compounds against you.",
        ],
        math: f
          ? [
              "Invested: " + money(c.inv),
              "Cost: " + f.v + "% a year",
              money(c.inv) + " × " + f.v + "% = " + money(yr) + " a year",
              kept > 0 ? "That is " + knPct(yr / (kept * 12)) + " of what you save in a year." : null,
            ]
          : [],
        go: ["Open what you have invested", "sharp", "inv"],
      });
  }
  {
    const yrs = Math.max(0, 65 - (c.age || 0)),
      x = Math.pow(1 + R, yrs);
    add({
      id: "dollar",
      g: "grow",
      n: "A dollar today, at 65",
      what: "What one dollar invested today could be worth by 65, in today's money.",
      num: x,
      val: "$" + (x >= 10 ? Math.round(x) : knN1(x)),
      st: "Exact",
      zone: ["The younger you are, the bigger it is", "none"],
      bar: null,
      rule: [
        "The idea is The Money Guy Show's wealth multiplier. This uses the game's own " +
          Math.round(R * 100) +
          "% a year, not their table.",
      ],
      math: [
        yrs + " years to 65 at " + Math.round(R * 100) + "% a year",
        "$1 × " + (1 + R).toFixed(2) + " ^ " + yrs + " = $" + knN1(x),
      ],
      moves: ["So " + money(100) + " invested today is about " + money(100 * x) + " at 65."],
      go: ["Watch it grow", "grow", ""],
    });
  }
  /* ---------- freedom ---------- */
  {
    const p = d.fi > 0 ? d.pct / 100 : null,
      mult = Math.round(1 / SWR);
    add({
      id: "fi",
      g: "free",
      n: "Freedom number",
      what: "How far you are toward the amount that could cover your spending for good.",
      num: p,
      val: p == null ? "?" : Math.round(d.pct) + "%",
      st: knSt(RW.sp, invs, cashes, debts),
      zone:
        p == null
          ? null
          : p >= 1
            ? ["There", "good"]
            : d.yrs != null
              ? ["About " + Math.round(d.yrs) + " years at today's pace", "none"]
              : ["Not moving yet", "none"],
      bar: p == null ? null : { p: p * 100, marks: [] },
      rule: [
        "The 4% rule of thumb: about " + mult + " times a year of spending, invested, can cover that spending.",
        "It is a starting point. The real number shifts with when you stop, what you spend then, and Social Security.",
      ],
      math: [
        "Your freedom number in the game: " + money(d.fi),
        "Net worth today: " + money(d.nw),
        d.fi > 0 ? money(Math.max(0, d.nw)) + " ÷ " + money(d.fi) + " = " + Math.round(d.pct) + "%" : null,
      ],
      go: ["See the big picture", "tab", "map"],
    });
  }
  {
    const y = d.yrs;
    add({
      id: "yearsfi",
      g: "free",
      n: "Years to freedom",
      what: "How long until work is optional, at today's pace.",
      num: y,
      val: y == null ? "?" : Math.round(y) + " yrs",
      st: knSt(incs, RW.sp, invs),
      zone: y == null ? null : y <= 0 ? ["There", "good"] : ["Around age " + Math.round(d.etaAge), "none"],
      bar: null,
      rule: ["It depends almost entirely on your savings rate. See Savings rate."],
      math:
        y == null
          ? []
          : ["Invested: " + money(c.inv), "Added each year: " + money(d.save), "Freedom number: " + money(d.fi)],
      go: ["Take the chance test", "chance", ""],
    });
    if (y == null) {
      const m = M[M.length - 1];
      m.lockgo = true;
      m.locknote =
        "Nothing is left over each month yet, so there is no date. A move that opens a gap brings this to life.";
    }
  }
  {
    const r = d.coastNum > 0 ? c.inv / d.coastNum : null;
    add({
      id: "coast",
      g: "free",
      n: "Coast",
      what: "How close you are to having enough invested that it could grow to your freedom number without adding another dollar.",
      num: r,
      val: r == null ? "?" : knPct(Math.min(r, 9.99)),
      st: knSt(RW.sp, invs),
      zone:
        r == null
          ? null
          : r >= 1
            ? ["You could stop adding and still get there by " + c.ret, "good"]
            : ["On the way", "none"],
      bar: r == null ? null : { p: Math.min(1, r) * 100, marks: [] },
      rule: [
        "Coast FI: enough invested that growth alone reaches your freedom number by the age you set. After that you only have to cover today's bills.",
      ],
      math: [
        "Coast number for age " + c.ret + ": " + money(d.coastNum),
        "Invested: " + money(c.inv),
        d.coastNum > 0 ? money(c.inv) + " ÷ " + money(d.coastNum) + " = " + knPct(r) : null,
      ],
      go: ["See the big picture", "tab", "map"],
    });
  }
  {
    const wr = c.inv > 0 ? (spend * 12) / c.inv : null;
    add({
      id: "wr",
      g: "free",
      n: "Withdrawal rate today",
      what: "The share of your investments you would have to pull out each year if you stopped working today.",
      num: wr,
      val: wr == null ? "?" : wr > 1 ? "over 100%" : knPct(wr),
      st: knSt(RW.sp, invs),
      zone:
        wr == null
          ? null
          : wr <= SWR
            ? ["At or under " + Math.round(SWR * 100) + "%", "good"]
            : ["Counting down toward " + Math.round(SWR * 100) + "%", "none"],
      bar: wr == null ? null : { p: Math.min(1, SWR / wr) * 100, marks: [] },
      rule: [
        "When this falls to about 4%, you are at your freedom number. It is the same finish line, counted from the other side.",
        "Very long retirements usually call for a lower rate.",
      ],
      math: [
        "A year of spending: " + money(spend * 12),
        "Invested: " + money(c.inv),
        c.inv > 0 ? money(spend * 12) + " ÷ " + money(c.inv) + " = " + (wr > 1 ? "over 100%" : knPct(wr)) : null,
      ],
      go: ["See the big picture", "tab", "map"],
    });
    if (wr == null) {
      const m = M[M.length - 1];
      m.lockgo = true;
      m.locknote = "This starts once something is invested.";
    }
  }
  {
    const y = spend > 0 ? own / (spend * 12) : null,
      marks = [1, 5, 10, 25],
      nx = y == null ? null : marks.find(m => m > y);
    add({
      id: "years",
      g: "free",
      n: "Years of spending saved",
      what: "How many years your cash and investments would cover with nothing coming in.",
      num: y,
      val: y == null ? "?" : knN1(y) + " yrs",
      st: knSt(RW.sp, cashes, invs),
      zone:
        y == null
          ? null
          : nx
            ? ["Next mark: " + nx + (nx === 1 ? " year" : " years"), "none"]
            : ["Past 25 years", "good"],
      bar:
        y == null
          ? null
          : {
              p: (Math.min(25, y) / 25) * 100,
              marks: [
                [4, "1"],
                [20, "5"],
                [40, "10"],
              ],
            },
      rule: [
        "JL Collins calls the early version of this F-you money: enough saved to walk away from a bad situation.",
        "One year is real breathing room. Twenty-five is the freedom number.",
      ],
      math: [
        "Cash and investments: " + money(own),
        "A year of spending: " + money(spend * 12),
        spend > 0 ? money(own) + " ÷ " + money(spend * 12) + " = " + knN1(y) + " years" : null,
      ],
      go: ["Open My Money", "tab", "money"],
    });
  }
  {
    const need = sum(RW.needs),
      ln = (need * 12) / SWR,
      r = ln > 0 ? Math.max(0, d.nw) / ln : null;
    if (RW.needs.length)
      add({
        id: "leanfi",
        g: "free",
        n: "Lean freedom number",
        what: "How far you are toward covering just your needs for good.",
        num: r,
        val: r == null ? "?" : knPct(Math.min(r, 9.99)),
        st: knSt(RW.needs, cashes, invs, debts),
        zone: r == null ? null : r >= 1 ? ["Needs covered for good", "good"] : ["A nearer finish line", "none"],
        bar: r == null ? null : { p: Math.min(1, r) * 100, marks: [] },
        rule: ["Lean FI is the freedom number on a bare-bones budget: needs only, no fun money."],
        math: [
          "Needs: " + money(need) + " a month × 12 ÷ " + Math.round(SWR * 100) + "% = " + money(ln),
          "Net worth: " + money(d.nw),
        ],
        go: ["See the big picture", "tab", "map"],
      });
  }
  {
    const reach = d.cash + sum(invs.filter(x => !/retirement|ira|hsa|401|403/i.test(x.k))),
      y = spend > 0 ? reach / (spend * 12) : null;
    add({
      id: "bridge",
      g: "free",
      n: "Bridge years",
      what: "How many years the money you can reach without penalty would cover.",
      num: y,
      val: y == null ? "?" : knN1(y) + " yrs",
      st: knSt(RW.sp, cashes, invs),
      zone: y == null ? null : ["Matters if you stop before 59½", "none"],
      bar: null,
      rule: [
        "Stopping early means living on reachable money until retirement accounts open up at 59½. This is how long that bridge is today.",
      ],
      math: [
        "Cash plus investments outside retirement accounts: " + money(reach),
        "A year of spending: " + money(spend * 12),
        spend > 0 ? money(reach) + " ÷ " + money(spend * 12) + " = " + knN1(y) + " years" : null,
      ],
      go: ["Open what you have invested", "sharp", "inv"],
    });
  }
  return M;
}
const KN_BASE = ["save", "cushion", "growth", "home", "highdebt", "split", "nw", "fi"];
function knRank(m) {
  return (
    (m.focus ? 0 : m.zone && m.zone[1] === "warn" && !m.guess && !m.fine ? 1 : 2) * 100 +
    (KN_BASE.indexOf(m.id) < 0 ? 50 : KN_BASE.indexOf(m.id))
  );
}
function knTop(M, n) {
  return M.filter(m => m.num != null)
    .sort((a, b) => knRank(a) - knRank(b))
    .slice(0, n || 4);
}
function knTone(m) {
  return !m.zone || m.guess || m.num == null ? "none" : m.zone[1];
}
function knLockWord(m) {
  return m.need && m.need.length
    ? m.need.length === 1
      ? "Needs one answer"
      : "Needs " + m.need.length + " answers"
    : m.lockgo
      ? "Needs your numbers"
      : "Needs your numbers";
}
function knTile(m) {
  const t = knTone(m),
    lock = m.num == null;
  return `<button class="ktile t-${t} ${m.focus ? "focus" : ""} ${lock ? "lock" : ""}" data-a="metric" data-v="${m.id}"><span class="kn">${esc(m.n)}</span><span class="kv ${m.guess || lock ? "guess" : ""}">${esc(m.val)}</span><span class="kz">${lock ? knLockWord(m) : m.guess ? "A guess so far" : esc(m.zone[0])}</span>${m.focus ? `<span class="pill okp kf">Working on it</span>` : ""}</button>`;
}
function knCard(c, d) {
  const M = knMetrics(c, d),
    top = knTop(M, 4);
  if (!top.length) return "";
  return `<div class="card stack kncard" style="gap:8px"><div class="row between"><h3>Key numbers</h3><button class="ghost slim" data-a="keynums">See all ${M.length} ›</button></div><div class="kgrid">${top.map(knTile).join("")}</div></div>`;
}
function knSheet() {
  const c = C(),
    M = knMetrics(c, D),
    g = W.g || "main",
    allGuess = M.every(m => m.guess || m.num == null),
    have = M.filter(m => m.num != null).length;
  let list;
  if (g === "main") {
    const f = M.filter(m => m.focus);
    list = f.concat(
      knTop(
        M.filter(m => !m.focus),
        Math.max(4, 6 - f.length)
      )
    );
  } else list = M.filter(m => m.g === g).sort((a, b) => (a.num == null) - (b.num == null));
  return (
    head("My Money", "Key numbers") +
    `<div class="small muted">${have} of ${M.length} worked out. Tap one to see where you stand and what the rules of thumb say.</div>${allGuess ? `<div class="banner small">These run on guesses so far, so none of them gets a verdict yet. <button class="ghost slim" data-a="sharp" data-v="take">Make my numbers real</button></div>` : ""}` +
    `<div class="chips kgroups">${KN_GROUPS.map(x => `<button class="chip ${g === x[0] ? "on" : ""}" data-a="kngroup" data-v="${x[0]}">${x[1]}${x[0] === "main" ? "" : " " + M.filter(m => m.g === x[0]).length}</button>`).join("")}</div>` +
    (g === "main" ? "" : `<div class="eyebrow">${KN_GNAME[g]}</div>`) +
    `<div class="kgrid">${list.map(knTile).join("")}</div>` +
    (g === "main"
      ? `<div class="tiny muted">These are what you're working on, then what needs attention, then the classics. The rest are under each group above.</div>`
      : "") +
    `<button class="ghost wide slim" data-a="kncopy">${W.copied ? "Copied. Paste it anywhere ✓" : "Copy all my numbers"}</button><details class="math"><summary>What isn't here yet</summary><div class="inner tiny stack" style="gap:6px">${KN_LATER.map(x => `<div><b>${esc(x[0])}</b>: ${esc(x[1])}.</div>`).join("")}</div></details><div class="tiny muted">Rules of thumb are guides from the people named on each one. They are not grades.</div>`
  );
}
function knBar(m) {
  if (m.tri) {
    const t = m.tri,
      w = x => Math.max(0, Math.min(100, x * 100));
    return `<div class="ktri"><i class="n" style="width:${w(t[0])}%"></i><i class="f" style="width:${w(t[1])}%"></i><i class="s" style="width:${w(t[2])}%"></i></div><div class="row between tiny muted"><span>Needs ${Math.round(t[0] * 100)}%</span><span>Fun ${Math.round(t[1] * 100)}%</span><span>Kept ${Math.round(t[2] * 100)}%</span></div>`;
  }
  if (!m.bar) return "";
  const p = Math.max(0, Math.min(100, m.bar.p));
  return `<div class="kbar t-${knTone(m)}"><i style="width:${p}%"></i>${m.bar.marks.map(k => `<b style="left:${Math.min(100, k[0])}%"><u>${k[1]}</u></b>`).join("")}</div>`;
}
/* knAskBody(c, k) makes the question for one key number. knAskBodyBase() is the part from this file. */
function knAskBody(c, k) {
  /* ask2.js: one small question at a time */
  const ask = typeof knAskBodyAsk === "function" ? knAskBodyAsk(c, k) : null;
  return ask !== null ? ask : knAskBodyBase(c, k);
}
function knAskBodyBase(c, k) {
  const a = KN_ASK[k],
    cur = knGot(c, k),
    o = W.o || {},
    opts = a.rel
      ? a.rel.map(f => Math.round(((c.take || 0) * f) / 50) * 50).filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
      : a.opts,
    lab = v => (a.pct ? v + "%" : money(v));
  return `<div class="tile stack ask" style="gap:8px"><b class="small">${esc(a.q)}</b><div class="tiny muted">${esc(a.help)}</div><div class="chips">${opts.map(v => `<button class="chip ${cur && cur.v === v ? "on" : ""}" data-a="knans" data-k="${k}" data-v="${v}">${lab(v)}</button>`).join("")}</div>${a.pct ? "" : W.pad === "ask_" + k ? `<div class="val">${money(o["ask_" + k] || 0)}</div>${keypad("ask_" + k)}<button class="primary wide" data-a="knans" data-k="${k}" data-v="typed">Use ${money(o["ask_" + k] || 0)}</button>` : `<button class="ghost slim" data-a="padopen" data-k="ask_${k}">Type the exact number</button>`}${(k === "debtPay" || k === "limit") && typeof dbSheet === "function" && (c.debts || []).some(x => x.amt > 0) ? `<button class="ghost slim" data-a="debtplan">Or fill in each debt, one at a time</button>` : ""}</div>`;
}
/* knOne() makes the sheet for one key number. knOneBase() is the part from this file. */
function knOne() {
  let h = knOneBase();
  if (typeof knOneSaved === "function") h = knOneSaved(h); /* ask2.js: the line "Saved" after an answer */
  return h;
}
function knOneBase() {
  const c = C(),
    M = knMetrics(c, D),
    m = M.find(x => x.id === W.id) || M[0],
    g = KN_GNAME[m.g] || "Key numbers",
    lock = m.num == null,
    askK = W.ask || (m.need && m.need[0]) || null;
  let h = head(g, m.n) + `<div class="small muted">${esc(m.what)}</div>`;
  if (lock && askK)
    h +=
      knAskBody(c, askK) +
      (m.need.length > 1 ? `<div class="tiny muted">${m.need.length} quick answers unlock this one.</div>` : "");
  else if (W.ask) h += knAskBody(c, W.ask);
  if (lock && !askK)
    h += `<div class="tile stack" style="gap:8px;text-align:center"><div class="bignum guess">?</div><div class="small">${esc(m.locknote || "The game needs a little more from you to work this one out.")}</div></div><button class="primary wide" data-a="${m.go[1]}" data-v="${m.go[2]}">${esc(m.go[0])}</button>`;
  if (!lock)
    h +=
      `<div class="tile stack" style="gap:8px;text-align:center"><div class="bignum ${m.guess ? "guess" : ""}">${esc(m.val)}</div><div class="row" style="gap:6px;justify-content:center;flex-wrap:wrap">${m.guess ? "" : `<span class="pill ${m.zone[1] === "good" ? "okp" : m.zone[1] === "warn" ? "warn" : ""}">${esc(m.zone[0])}</span>`}<span class="pill">${m.st}</span></div>${knBar(m)}${m.guess ? `<div class="tiny muted">Built on a guess, so no verdict yet.</div>` : ""}</div>` +
      (m.guess && !W.ask
        ? `<button class="primary wide" data-a="${m.go[1]}" data-v="${m.go[2]}">Make this one real</button>`
        : "");
  h += `<div class="tile stack" style="gap:6px"><b class="small">What people say</b>${m.rule.map(r => `<div class="small mrow k-note">${esc(r)}</div>`).join("")}</div>`;
  if (!lock) {
    h +=
      (m.moves.length && !m.guess
        ? `<div class="tile stack" style="gap:6px"><b class="small">What would move it</b>${m.moves.map(r => `<div class="small mrow">${esc(r)}</div>`).join("")}</div>`
        : "") +
      (m.math.length ? mathBox(m.math) : "") +
      `<div class="stack" style="gap:6px"><b class="small">Is this one you want to work on?</b>${W.full ? `<div class="tiny muted">You're already working on three. Three at a time is plenty: drop one first.</div>` : ""}<div class="row" style="gap:6px"><button class="${m.focus ? "primary" : "ghost"} slim" style="flex:1" data-a="knset" data-v="work">${m.focus ? "Working on it ✓" : "Work on this"}</button><button class="${m.fine ? "primary" : "ghost"} slim" style="flex:1" data-a="knset" data-v="fine">${m.fine ? "Happy with it ✓" : "Happy with it"}</button></div>${m.focus ? `<div class="tiny muted">It's pinned to the top of Key numbers and added to Next Steps.</div>` : ""}</div>` +
      (m.guess
        ? ""
        : `<button class="ghost wide slim" data-a="${m.go[1]}" data-v="${m.go[2]}">${esc(m.go[0])}</button>`);
  }
  return h + `<button class="ghost wide slim" data-a="keynums">All key numbers</button>`;
}
function knPlan(c, m, on) {
  if (typeof plX !== "function") return;
  const x = plX(c);
  x.plan = x.plan.filter(p => !(p.kn === m.id && p.st !== "done"));
  if (on)
    x.plan.push({
      id: plId(),
      when: todayISO(),
      slot: "Any",
      st: "todo",
      made: todayISO(),
      t: "Pick one move for your " + m.n.toLowerCase(),
      s: "A 2-minute look at this number and what would move it.",
      a: "metric",
      v: m.id,
      mins: 2,
      kn: m.id,
    });
}
function knText(c, d) {
  const M = knMetrics(c, d),
    L = [(c.name || "Me") + ": key numbers, " + todayISO(), ""];
  Object.keys(KN_GNAME).forEach(g => {
    const ms = M.filter(m => m.g === g && m.num != null);
    if (!ms.length) return;
    L.push(KN_GNAME[g].toUpperCase());
    ms.forEach(m =>
      L.push(
        "- " +
          m.n +
          ": " +
          m.val +
          (m.guess ? " (guess)" : m.zone && m.zone[1] !== "none" ? " (" + m.zone[0].toLowerCase() + ")" : "") +
          (m.guess ? "" : " [" + m.st.toLowerCase() + "]")
      )
    );
    L.push("");
  });
  L.push("From SLAM the Game. Rules of thumb are guides, not grades.");
  return L.join("\n");
}
Object.assign(ACT, {
  keynums: () => {
    const g = W && W.kind === "metric" && W.fromG ? W.fromG : W && W.kind === "keynums" ? W.g : null;
    W = { kind: "keynums", g: g || "main" };
    sheet(knSheet);
  },
  kngroup: t => {
    if (W) {
      W.g = t.dataset.v;
      W.copied = false;
      drawSheet();
    }
  },
  metric: t => {
    const fromG = W && W.kind === "keynums" ? W.g : (W && W.fromG) || null;
    W = { kind: "metric", id: t.dataset.v, fromG, o: {} };
    sheet(knOne);
  },
  knask: t => {
    if (!W || W.kind !== "metric") {
      W = { kind: "metric", id: "save", o: {} };
      sheet(knOne);
    }
    W.ask = t.dataset.v;
    W.o = W.o || {};
    drawSheet();
  },
  knans: t => {
    const c = C(),
      k = t.dataset.k,
      a = KN_ASK[k];
    if (!a || !W) return;
    const typed = t.dataset.v === "typed",
      v = typed ? +((W.o || {})["ask_" + k] || 0) : +t.dataset.v;
    if (!isFinite(v)) return;
    const I = knIn(c);
    if (k === "tax") {
      c.x.taxPct = v;
      I.taxcf = 2;
    } else I[k] = { v, cf: typed ? 3 : 2, d: todayISO() };
    W.pad = null;
    W.ask = null;
    save();
    render();
    drawSheet();
  },
  knset: t => {
    const c = C(),
      K = knX(c),
      id = W.id,
      v = t.dataset.v,
      M = knMetrics(c, D),
      m = M.find(x => x.id === id);
    if (!m) return;
    W.full = false;
    if (K[id] === v) {
      delete K[id];
      knPlan(c, m, false);
    } else if (v === "work" && M.filter(x => x.focus).length >= 3) {
      W.full = true;
      drawSheet();
      return;
    } else {
      K[id] = v;
      knPlan(c, m, v === "work");
    }
    save();
    render();
    drawSheet();
  },
  kncopy: () => {
    const txt = knText(C(), D),
      done = () => {
        if (W && W.kind === "keynums") {
          W.copied = true;
          drawSheet();
        }
      };
    try {
      navigator.clipboard.writeText(txt).then(done, done);
    } catch (e) {
      done();
    }
  },
});
/* Part of moneyTab() in ui.js. Adds the card "Key numbers" below the tab title. */
function moneyTabKeyCard(h) {
  const card = knCard(C(), D);
  if (!card) return h;
  const th = typeof tabHead === "function" ? tabHead() : "";
  return th && h.indexOf(th) >= 0
    ? h.replace(th, () => th + card)
    : h.replace('<div class="stack">', () => '<div class="stack">' + card);
}

Object.assign(GLOSS, {
  keynums: [
    "Key numbers",
    "The ratios people in personal finance talk about most, like how much you keep and how many months your cash would last. Each one shows where you stand and what the common rules of thumb say.",
  ],
  takehome: ["Take-home pay", "What lands in your account after taxes and anything else your job takes out first."],
  beforetax: [
    "Pay before taxes",
    "Your full pay before taxes and deductions come out. Many rules of thumb use this number, so the game converts them to take-home pay for you.",
  ],
  dti: [
    "Debt-to-income (DTI)",
    "Your home cost plus every debt payment, divided by your pay before taxes. Lenders use it to decide how much they will lend you.",
  ],
  utilization2: [
    "Card use (utilization)",
    "Your card balances divided by your card limits. It is one of the biggest parts of a credit score.",
  ],
  coastfi: [
    "Coast",
    "Having enough invested that it can grow to your freedom number by itself, so you only need to cover today's bills.",
  ],
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
