/* ============================================================================
   SLAM the Game: features/ideas2.js
   PURPOSE     Famous money ideas 9 to 16. The same frame and rules as ideas.js.
   INPUT       The arguments of its functions.
   OUTPUT      2 functions.
   DEPENDS ON  core/engine.js, screens/ui.js, core/metrics.js, features/csp.js, features/ideas.js.
   ========================================================================= */
/* NO CALLER IN THIS REPOSITORY. Keep this function until the owner confirms that no add-on calls it. */
function igFree(c, d, extraSave, extraInv, goal) {
  const y = yearsTo((c.inv || 0) + (extraInv || 0), Math.max(0, d.save + (extraSave || 0)), goal || d.fi);
  return y;
}
function igYr(y) {
  return y == null ? "more than 80 years" : y === 0 ? "already there" : y + (y === 1 ? " year" : " years");
}
/* ---------- 9. White Coat Investor ---------- */
igAdd({
  id: "wci",
  grp: "earn",
  n: "Live like a resident",
  by: "Jim Dahle, The White Coat Investor",
  one: "When your income jumps, keep living on the old amount for 2 to 5 years and bank the whole raise.",
  what: "His advice to new doctors: after training ends and the pay jumps, keep the trainee lifestyle a few more years. The same move works after any big raise. It is the spark choice: a short stretch that changes the shape of the years after it.",
  fit: (c, d) => c.work !== "Retired" && d.era <= 6,
  body: x => {
    const up = x.v("up", 1000),
      n = x.v("yrs", 3),
      d = x.d,
      c = x.c,
      pile = grow(0, n, up * 12),
      base = d.yrs,
      after = (() => {
        const inv = grow(x.inv, n, d.save + up * 12),
          r = yearsTo(inv, d.save, d.fi);
        return r == null ? null : n + r;
      })(),
      debt = c.debt || 0,
      mo = debt > 0 ? Math.ceil(debt / up) : 0;
    return {
      big: igM(pile) + " in " + n + " years",
      cap: "From banking a " + igM(up) + " a month raise instead of spending it. " + igI("resident"),
      html: igRows([
        ["What those years buy", ""],
        debt > 0 ? ["Your " + igM(debt) + " of debt, gone in", "about " + mo + " months"] : null,
        ["Freedom date today", igYr(base)],
        ["Freedom date after " + n + " lean years", igYr(after)],
        base != null && after != null && base > after
          ? ["Years of work it takes off", "<b>" + (base - after) + "</b>"]
          : null,
      ]),
      ins: [
        [
          "up",
          "How big is the raise, in take-home pay?",
          "resident",
          [
            [500, "$500 a month"],
            [1000, "$1,000"],
            [2000, "$2,000"],
            [4000, "$4,000"],
          ],
          1000,
        ],
        [
          "yrs",
          "How long do you keep living on the old amount?",
          "resident",
          [
            [2, "2 years"],
            [3, "3 years"],
            [4, "4 years"],
            [5, "5 years"],
          ],
          3,
        ],
      ],
      math: [
        igM(up) + " × 12 = " + igM(up * 12) + " a year, invested at 7% a year for " + n + " years = " + igM(pile),
        "Today: you keep " + igM(d.save) + " a year, and your freedom number is " + igM(d.fi),
        "With the raise banked for " + n + " years, then back to keeping " + igM(d.save) + " a year: " + igYr(after),
        "After the lean years the raise is yours to spend, so the plan assumes you do",
      ],
      note:
        "The trade is " +
        n +
        " years of a lifestyle you already know how to live, for years of work you never have to do.",
      links: [["Try other shapes in What if", "moves", ""]],
    };
  },
  val: x => "A $1,000 raise banked for 3 years is " + igM(grow(0, 3, 12000)),
});
/* ---------- 10. Grant Sabatier ---------- */
igAdd({
  id: "sabatier",
  grp: "time",
  n: "Price it in days of freedom",
  by: "Grant Sabatier, Financial Freedom",
  one: "Every price is also an amount of time. See what a purchase costs in days you would not have to work.",
  what: "He teaches people to see money as time: every dollar saved buys a piece of freedom. This screen prices anything in days of your own life, next to the hours of work it takes to earn.",
  fit: () => true,
  body: x => {
    const p = x.v("price", 250),
      day = x.S / 365,
      days = day > 0 ? p / day : 0,
      tl = timeLedger(x.c, x.d),
      hrs = tl.wage > 0 ? p / tl.wage : null,
      y = x.d.yrs,
      fv = y != null ? p * Math.pow(1 + R, y) : null,
      n1 = v => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
    return {
      big: n1(days) + (n1(days) === 1 ? " day" : " days") + " of freedom",
      cap:
        igM(p) +
        " covers that many days of your life at what you spend. " +
        igI("freedays") +
        (hrs != null ? " It takes about " + n1(hrs) + " hours of work to earn." : ""),
      html: igRows([
        ["One day of your life costs", igM(day)],
        hrs != null ? ["Hours of work to earn it", n1(hrs) + " hours"] : null,
        fv != null && y > 0
          ? ["Invested until your freedom date (" + y + " years)", igM(fv) + ", or " + n1(fv / day) + " days"]
          : null,
      ]),
      ins: [
        [
          "price",
          "What does it cost?",
          "freedays",
          [
            [20, "$20"],
            [50, "$50"],
            [100, "$100"],
            [250, "$250"],
            [500, "$500"],
            [1000, "$1,000"],
            [2500, "$2,500"],
            [5000, "$5,000"],
          ],
          250,
        ],
      ],
      math: [
        "Your spending: " + igM(x.S) + " a year ÷ 365 = " + igM(day) + " a day",
        igM(p) + " ÷ " + igM(day) + " = " + n1(days) + " days",
        tl.wage > 0
          ? "Your real hourly wage: " + cents(tl.wage) + ". " + igM(p) + " ÷ that = " + n1(hrs) + " hours"
          : "Set your hours to see it in hours of work",
        fv != null && y > 0 ? igM(p) + " growing 7% a year for " + y + " years = " + igM(fv) : null,
      ],
      note: "This is not a reason to skip things. It is a second price tag, so you can tell which purchases are worth their days.",
      links: [
        ["Open your real hourly wage", "hrs", ""],
        ["Safe to spend?", "safe", ""],
      ],
    };
  },
  val: x => "A day of your life costs " + igM(x.S / 365),
});
/* ---------- 11. Kristy Shen and Bryce Leung ---------- */
igAdd({
  id: "shen",
  grp: "stop",
  n: "The yield shield, the cash cushion, and moving somewhere cheaper",
  by: "Kristy Shen and Bryce Leung, Quit Like a Millionaire",
  one: "Get through a downturn without selling low, and stretch your money by living where it goes further.",
  what: "Their plan for the risky first years: tilt toward investments that pay you (the yield shield), hold cash for the gap (the cash cushion), and use geographic arbitrage, which means earning in a strong currency and living somewhere cheaper.",
  tabs: [
    ["shield", "Shield and cushion"],
    ["geo", "Somewhere cheaper"],
  ],
  fit: (c, d) => IG_NEAR(c, d) || d.era >= 4,
  body: (x, tab) => {
    const P = x.P,
      S = x.S;
    if (tab === "shield") {
      const y = x.v("yield", 0.035),
        n = x.v("yrs", 5),
        inc = P * y,
        gap = Math.max(0, S - inc),
        cush = gap * n;
      return {
        big: igM(cush) + " cash cushion",
        cap:
          "Enough to cover " +
          n +
          " bad years without selling. Your investments pay about " +
          igM(inc) +
          " a year, and the cushion covers the other " +
          igM(gap) +
          ". " +
          igI("cushion5"),
        ins: [
          [
            "yield",
            "How much do your investments pay out each year?",
            "yshield",
            [
              [0.02, "2%"],
              [0.03, "3%"],
              [0.035, "3.5%"],
              [0.04, "4%"],
            ],
            0.035,
          ],
          [
            "yrs",
            "How many bad years do you want covered?",
            "cushion5",
            [
              [3, "3 years"],
              [5, "5 years"],
            ],
            5,
          ],
        ],
        math: [
          "Paid out: " + igM(P) + " × " + igP(y, 1) + " = " + igM(inc) + " a year",
          "Your spending: " + igM(S) + " a year",
          "Gap: " + igM(S) + " − " + igM(inc) + " = " + igM(gap),
          "Cushion: " + igM(gap) + " × " + n + " years = " + igM(cush),
        ],
        note: "Chasing a higher payout usually means owning riskier or less spread-out investments. They treat the shield as a temporary setup for the first few years, not a permanent one.",
      };
    }
    const pct = x.v("col", 0.6),
      fi2 = x.d.fi * pct,
      y1 = x.d.yrs,
      y2 = yearsTo(x.inv, x.d.save, fi2);
    return {
      big: igM(fi2) + " is enough there",
      cap:
        "Your freedom number if life costs " +
        igP(pct) +
        " of what it costs here. Today it is " +
        igM(x.d.fi) +
        ". " +
        igI("geoarb"),
      html: igRows([
        ["Years to freedom here", igYr(y1)],
        ["Years to freedom there", igYr(y2)],
        x.inv >= fi2 ? ["You already have enough to live there", "<b>Yes</b>"] : null,
      ]),
      ins: [
        [
          "col",
          "How much does life cost there, next to here?",
          "geoarb",
          [
            [0.4, "40%"],
            [0.5, "Half"],
            [0.6, "60%"],
            [0.75, "Three quarters"],
            [0.9, "90%"],
          ],
          0.6,
        ],
      ],
      math: [
        "Freedom number here: " + igM(x.d.fi),
        igM(x.d.fi) + " × " + igP(pct) + " = " + igM(fi2),
        "You have invested: " + igM(x.inv) + ", and keep " + igM(x.d.save) + " a year",
        "Years to reach " + igM(fi2) + ": " + igYr(y2),
      ],
      note: "This scales your whole freedom number by one percent figure. Real moves change some costs a lot (housing) and others barely (travel home, health care), and currencies move.",
    };
  },
  val: x => "At 60% of your costs, freedom takes " + igM(x.d.fi * 0.6),
});
/* ---------- 12. One more year ---------- */
igAdd({
  id: "omy",
  grp: "stop",
  n: "One more year",
  by: "A long-running idea in the FIRE community",
  one: "When you are close, ask what one more year of work actually buys.",
  what: "One more year syndrome is the habit of pushing your stop date back a year at a time, long after the numbers say you have enough. The check is simple: see what the extra year adds, then decide if that is worth a year of your life.",
  fit: (c, d) => c.work !== "Retired" && (d.pct >= 80 || d.g[7] || d.qq),
  body: x => {
    const P = x.inv,
      S = x.S,
      P1 = P * (1 + R) + x.d.save,
      w0 = P > 0 ? S / P : null,
      w1 = P1 > 0 ? S / P1 : null,
      room = ((P1 - P) * SWR) / 12,
      pct = Math.max(1, Math.round(x.d.pct)),
      ans = x.o.ans;
    return {
      big: w0 != null && w0 < 1 ? igP(w0, 1) + " → " + igP(w1, 1) : igM(room) + " a month more",
      cap:
        (w0 != null && w0 < 1
          ? "What you would take out each year, as a share of your money, today and after one more year of work. "
          : "") +
        "One more year adds about " +
        igM(P1 - P) +
        ", which is " +
        igM(room) +
        " a month of extra room for life. " +
        igI("omy"),
      html:
        (pct < 80
          ? `<div class="banner small">You are about ${pct}% of the way to your freedom number. This check matters most near the finish line, and it will be here when you get there.</div>`
          : "") +
        igRows([
          ["You have invested", igM(P)],
          ["After one more year", igM(P1)],
          ["What it costs", "One year, age " + x.age + " to " + (x.age + 1)],
        ]),
      ins: [
        [
          "ans",
          "Is one more year buying you something you want?",
          "omy",
          [
            ["yes", "Yes, and I can name it"],
            ["no", "No, I am close enough"],
            ["unsure", "Not sure yet"],
          ],
          null,
        ],
      ],
      after: ans
        ? `<div class="tile small">${ans === "yes" ? "Good. Name what it buys, so next year you can tell whether you got it." : ans === "no" ? "Then the question changes from money to what you are stopping for. Tanja Hester and Fritz Gilbert are on this list for that part." : "That is a fair answer. Look at the two numbers above again in a few months."}</div>`
        : "",
      math: [
        "Invested today: " + igM(P),
        "One more year: " + igM(P) + " × 1.07 + " + igM(x.d.save) + " kept = " + igM(P1),
        w0 != null ? "Withdrawal rate today: " + igM(S) + " ÷ " + igM(P) + " = " + igP(w0, 1) : null,
        w1 != null ? "After one more year: " + igM(S) + " ÷ " + igM(P1) + " = " + igP(w1, 1) : null,
        "Extra room at 4%: (" + igM(P1) + " − " + igM(P) + ") × 4% ÷ 12 = " + igM(room) + " a month",
      ],
      note: "There is no right answer here. The game only shows what the year adds and what it costs.",
    };
  },
  val: x => "One more year adds about " + igM(x.inv * R + x.d.save),
});
/* ---------- 13. Ben Felix ---------- */
igAdd({
  id: "felix",
  grp: "home",
  n: "The 5% rule for rent or buy, and lifecycle investing",
  by: "Ben Felix (the 5% rule). Lifecycle investing is from Ian Ayres and Barry Nalebuff, which he has explained.",
  one: "A fair way to compare renting with owning in three taps, and why some people borrow to invest while young.",
  what: "The 5% rule adds up the costs of owning that you never get back: property tax, upkeep, and the cost of the money tied up in the home. If you can rent a similar place for less than that, renting costs less.",
  tabs: [
    ["rent", "Rent or buy"],
    ["life", "Lifecycle investing"],
  ],
  fit: (c, d) => c.home === "Renting" || c.home === "With family" || (c.age < 35 && d.era >= 5),
  body: (x, tab) => {
    if (tab === "rent") {
      const home = typeof knRows === "function" ? knRows(x.c).home.reduce((t, r) => t + (+r.amt || 0), 0) : 0,
        price = x.v("price", 400000),
        tax = x.v("tax", 0.01),
        rate = tax + 0.01 + 0.03,
        be = (price * rate) / 12,
        rent = x.v("rent", home > 0 ? Math.round(home / 250) * 250 : 2000);
      return {
        big: igM(be) + " a month",
        cap:
          "What owning a " +
          igM(price) +
          " home costs that you never get back. A similar place rents for " +
          igM(rent) +
          ", which is " +
          igM(Math.abs(be - rent)) +
          " a month " +
          (rent < be ? "less" : "more") +
          ". " +
          igI("fivepct"),
        ins: [
          [
            "price",
            "What does the home cost?",
            "fivepct",
            [
              [200000, "$200k"],
              [300000, "$300k"],
              [400000, "$400k"],
              [600000, "$600k"],
              [800000, "$800k"],
              [1200000, "$1.2M"],
            ],
            400000,
          ],
          [
            "rent",
            "What does a similar place rent for, a month?",
            "fivepct",
            [
              [1000, "$1,000"],
              [1500, "$1,500"],
              [2000, "$2,000"],
              [2500, "$2,500"],
              [3000, "$3,000"],
              [4000, "$4,000"],
              [5000, "$5,000"],
            ],
            home > 0 ? Math.round(home / 250) * 250 : 2000,
          ],
          [
            "tax",
            "Property tax where you would buy",
            "fivepct",
            [
              [0.01, "About 1%"],
              [0.015, "1.5%"],
              [0.02, "2%"],
              [0.03, "3%"],
            ],
            0.01,
          ],
        ],
        math: [
          "Property tax: " + igP(tax, 1) + " of the price a year",
          "Upkeep: 1% of the price a year",
          "Cost of the money tied up in the home: 3% a year " +
            "(what it could have earned elsewhere, or mortgage interest)",
          "Together: " +
            igP(rate, 1) +
            " × " +
            igM(price) +
            " = " +
            igM(price * rate) +
            " a year, or " +
            igM(be) +
            " a month",
          "Rent for a similar place: " + igM(rent) + " a month",
        ],
        note: "His rule uses 1% for property tax. Parts of New York and New Jersey run well above that, which is why you can change it. It leaves out how long you stay and what buying and selling cost.",
      };
    }
    const I = x.inv,
      F = x.d.save * Math.max(0, x.ret - x.age),
      sh = I + F > 0 ? Math.max(0.01, I / (I + F)) : 0;
    return {
      big: igP(sh) + " of your lifetime investing",
      cap:
        "is in the market today. The other " + igP(1 - sh) + " is money you have not earned yet. " + igI("lifecycle"),
      html:
        `<div class="banner small"><b class="fkhot">Risky.</b> This is here so you understand the idea, not as a step to take. Borrowing to invest can lose more than you put in.</div>` +
        igRows([
          ["Invested today", igM(I)],
          ["Still to invest, from now to " + x.ret, igM(F)],
        ]) +
        `<div class="small"><b>The idea:</b> when you are young, almost all your future investing money is still in future paychecks, so your stock holding is tiny next to what it will be. Lifecycle investing says to hold more stock early, even with borrowed money, and less later, so your risk is spread across your whole life.</div><div class="small"><b>The risks:</b> losses are multiplied too. Borrowing costs interest every year. A loan can be called in at the worst moment. Most people sell at the bottom when they are leveraged. And it only works if your job is steady. ${igI("leverage")}</div>`,
      math: [
        "Invested today: " + igM(I),
        "Kept each year: " +
          igM(x.d.save) +
          " × " +
          Math.max(0, x.ret - x.age) +
          " years to age " +
          x.ret +
          " = " +
          igM(F),
        igM(I) + " ÷ (" + igM(I) + " + " + igM(F) + ") = " + igP(sh),
      ],
      note: "Most teachers on this list would tell you not to do this. The safer version of the same idea is simply holding more stock while young, with no borrowing.",
      links: [["Open the multipliers board", "mult", ""]],
    };
  },
  val: x => "A $400k home costs about " + igM((400000 * 0.05) / 12) + " a month you never get back",
});
/* ---------- 14. Sam Dogen ---------- */
const IG_DOGEN = [
  [25, 0.5],
  [30, 2],
  [35, 5],
  [40, 10],
  [50, 15],
  [60, 20],
];
const IG_SEV = [
  [
    "notice",
    "Read your offer letter and handbook for what you are owed",
    "Notice, unused vacation, bonus rules, stock that is about to vest.",
  ],
  [
    "years",
    "Add up your years there and your wins",
    "Reviews, awards, money you made or saved them. It is your case for more.",
  ],
  [
    "ask",
    "Decide what to ask for besides money",
    "Health coverage paid longer, a later end date, a good reference, keeping your laptop.",
  ],
  [
    "time",
    "Pick your timing",
    "Right after a bonus pays or stock vests, and before a busy season, is easier for everyone.",
  ],
  ["who", "Work out who can say yes", "Your manager, their manager, or HR. Start with the one who likes you most."],
  ["handoff", "Offer a smooth handoff", "Training your replacement is worth real money to them. Say so."],
  ["write", "Get the final offer in writing", "Read what you sign away. Take the days they give you to decide."],
  [
    "pro",
    "Pay for one hour with an employment lawyer before you sign",
    "This checklist is general. A lawyer knows your state.",
  ],
];
igAdd({
  id: "dogen",
  grp: "build",
  n: "Net worth by age, the 1/10th car rule, and a severance checklist",
  by: "Sam Dogen, Financial Samurai",
  one: "Targets that scale with your pay, a strict cap on car prices, and a plan for leaving a job with money in hand.",
  what: "Three of his best-known ideas: net worth targets counted in years of pay before taxes, spending no more than a tenth of a year's pay on a car, and negotiating severance instead of quitting.",
  tabs: [
    ["nw", "Net worth by age"],
    ["car", "1/10th car rule"],
    ["sev", "Severance checklist"],
  ],
  fit: (c, d) => true,
  body: (x, tab) => {
    const gy = knNet(x.c).gross * 12,
      nw = x.d.nw;
    if (tab === "nw") {
      const row =
          IG_DOGEN.slice()
            .reverse()
            .find(r => r[0] <= x.age) || IG_DOGEN[0],
        nxt = IG_DOGEN.find(r => r[0] > x.age);
      return {
        big: igM(gy * row[1]) + " by " + row[0],
        cap:
          "His target at " +
          row[0] +
          " is " +
          row[1] +
          " times a year of pay before taxes. Your net worth today is " +
          igM(nw) +
          ". " +
          igI("nwmult"),
        html: igRows(
          IG_DOGEN.map(r => [
            (r === row ? "<b>" : "") + "Age " + r[0] + ": " + r[1] + " times your pay" + (r === row ? "</b>" : ""),
            igM(gy * r[1]),
          ])
        ),
        math: [
          "A year of your pay before taxes: about " + igM(gy),
          "Target at " + row[0] + ": " + row[1] + " × " + igM(gy) + " = " + igM(gy * row[1]),
          nxt ? "Next: " + nxt[1] + " × by " + nxt[0] + " = " + igM(gy * nxt[1]) : null,
          "He counts 20 times your pay as financially free",
        ],
        note: "These are steep on purpose and they rise with your pay. Fidelity's marks on this list are gentler, and the 4% rule counts your spending instead of your pay. Pick the yardstick that fits how you live.",
        links: [["See Fidelity's marks", "metric", "invx"]],
      };
    }
    if (tab === "car") {
      const cap = gy / 10,
        price = x.v("car", 15000);
      return {
        big: igM(cap) + " at most",
        cap:
          "A tenth of a year of your pay before taxes. The car you have in mind is " +
          igM(price) +
          ", which is " +
          (price <= cap ? "inside it." : igM(price - cap) + " above it.") +
          " " +
          igI("tenthcar"),
        ins: [
          [
            "car",
            "What does the car cost?",
            "tenthcar",
            [
              [5000, "$5,000"],
              [10000, "$10,000"],
              [15000, "$15,000"],
              [25000, "$25,000"],
              [40000, "$40,000"],
              [60000, "$60,000"],
            ],
            15000,
          ],
        ],
        math: [
          "A year of your pay before taxes: about " + igM(gy),
          igM(gy) + " ÷ 10 = " + igM(cap),
          "To fit a " + igM(price) + " car inside the rule, pay would be " + igM(price * 10) + " a year",
        ],
        note: "It is one of the strictest car rules there is. The Money Guy Show's 20/3/8 rule on this list looks at the loan instead of the price.",
        links: [["See the 20/3/8 car rule", "metric", "carpay"]],
      };
    }
    return {
      big: null,
      html: `<div class="small">For when a job is ending, or you want it to. His point: people who quit leave with nothing, and people who negotiate often leave with months of pay. ${igI("severance")}</div>`,
      checks: IG_SEV,
      note: "General steps in the game's own words. It is not legal advice.",
    };
  },
  val: x => {
    const gy = knNet(x.c).gross * 12;
    return "A tenth of your yearly pay is " + igM(gy / 10);
  },
});
/* ---------- 15. Frugalwoods ---------- */
const IG_UFM = [
  "Write down why you are doing this month. One sentence is enough.",
  "Look at last month's spending and circle the three biggest things you could live without.",
  "Cancel one thing that charges you every month.",
  "Cook dinner from what is already in the house.",
  "Call or go online for one bill and ask for a lower price.",
  "A no-spend day. Nothing bought at all.",
  "Plan this week's meals before you shop.",
  "Pack lunch for tomorrow.",
  "Find one free thing to do this weekend and put it on the calendar.",
  "Unsubscribe from five store emails.",
  "A no-spend day.",
  "Check the library, a swap group or a friend before buying something you need.",
  "Make your coffee or tea at home today.",
  "Add up what you have not spent so far this month.",
  "Fix or mend one thing instead of replacing it.",
  "Wait 3 days on anything you want that is not food.",
  "A no-spend day.",
  "Eat down the freezer and the back of the pantry.",
  "Look at your phone and internet plans. Is there a cheaper one that does the job?",
  "Do one fun thing that costs nothing with someone you like.",
  "Sell or give away one thing you do not use.",
  "A no-spend day.",
  "Compare prices on the one thing you buy most often.",
  "Move what you saved this week to savings today.",
  "Walk, bike or share a ride for one trip.",
  "Check your insurance. When did you last compare prices?",
  "A no-spend day.",
  "Write down which cuts you did not even miss.",
  "Pick the two or three changes you will keep after this month.",
  "Add up the month. What did you keep, and what will you do with it?",
];
igAdd({
  id: "ufm",
  grp: "spend",
  n: "The Uber Frugal Month",
  by: "Liz Thames, Frugalwoods",
  one: "One month of spending as little as you can, to find out what you actually miss.",
  what: "Her challenge: for one month, cut every bit of spending you can. It is an experiment, not a way to live. At the end you keep the cuts you did not miss and bring back what you did. Here it is a 30-day side quest with one small task a day.",
  fit: (c, d) => c.work !== "Retired" && d.rate < 0.2,
  quest: { days: 30, tasks: IG_UFM, end: "Now pick what to keep." },
  body: x => {
    const q = IG.ufm.quest,
      z = igQs(x, q),
      fun = cspRows(x.c)
        .filter(r => /fun|everything else|food/i.test(r.k))
        .reduce((t, r) => t + (+r.amt || 0), 0),
      cut = x.v("cut", 0.25);
    return {
      big: z.on && !z.over ? "Day " + Math.min(30, z.day) + " of 30" : igM(fun * cut) + " this month",
      cap:
        z.on && !z.over
          ? "You have ticked " +
            Math.max(z.n ? 1 : 0, z.n) +
            " so far. A frugal month like this could keep about " +
            igM(fun * cut) +
            " in your pocket. " +
            igI("ufm")
          : "About what a frugal month could keep in your pocket, if food and fun come down by " +
            igP(cut) +
            ". " +
            igI("ufm"),
      quest: q,
      ins: [
        [
          "cut",
          "How far could food and fun come down for one month?",
          "ufm",
          [
            [0.1, "A tenth"],
            [0.25, "A quarter"],
            [0.5, "Half"],
          ],
          0.25,
        ],
      ],
      math: [
        "Food and fun in a normal month: " + igM(fun),
        igM(fun) + " × " + igP(cut) + " = " + igM(fun * cut),
        "Kept for a year, that would be " + igM(fun * cut * 12),
      ],
      note: "The tasks are the game's own. Her real challenge runs on her site each January and July.",
    };
  },
  val: x => {
    const z = igQs(x, { days: 30, tasks: IG_UFM });
    return z.on && !z.over ? "You are on day " + Math.min(30, z.day) + " of 30" : "";
  },
});
/* ---------- 16. Paula Pant ---------- */
const IG_WANTS = [
  ["trip", "A big trip every year", 250],
  ["car", "A newer car", 400],
  ["out", "Eating out more", 200],
  ["home", "A nicer place to live", 500],
  ["less", "Working one day less a week", 0],
  ["gift", "Giving more", 150],
  ["hobby", "A serious hobby", 150],
  ["help", "Help at home (cleaning, child care)", 400],
];
igAdd({
  id: "pant",
  grp: "spend",
  n: "You can afford anything, but not everything",
  by: "Paula Pant, Afford Anything",
  one: "Every yes is a no to something else. Pick what you want and see what each one trades against.",
  what: "Her core idea: money, time and energy are all limited, so every choice is a trade. The useful question is which things you want most.",
  fit: () => true,
  body: x => {
    const picks = (x.o.want || []).map(k => IG_WANTS.find(w => w[0] === k)).filter(Boolean),
      cost = w => (w[0] === "less" ? Math.round(x.take * 0.2) : w[2]),
      tot = picks.reduce((t, w) => t + cost(w), 0),
      free = x.kept,
      d = x.d,
      delay = w => {
        const a = d.yrs,
          b = yearsTo(x.inv, Math.max(0, d.save - cost(w) * 12), d.fi);
        return a == null || b == null ? null : b - a;
      };
    return {
      big: picks.length ? igM(tot) + " a month" : igM(free) + " a month to choose with",
      cap: picks.length
        ? "What your picks cost together. You keep " +
          igM(free) +
          " a month right now" +
          (tot <= free ? ", so they all fit." : ", so they do not all fit at once. Any one of the smaller ones does.") +
          " " +
          igI("tradeoff")
        : "That is what you keep each month. Pick the things you want and see what each one trades against. " +
          igI("tradeoff"),
      picks: ["want", "What do you want more of? Pick up to three.", "tradeoff", IG_WANTS.map(w => [w[0], w[1]]), 3],
      html: picks.length
        ? igRows(
            picks.map(w => {
              const dl = delay(w);
              return [
                esc(w[1]) + " · " + igM(cost(w)) + " a month",
                cost(w) > free
                  ? "More than you keep now"
                  : dl == null
                    ? ""
                    : dl <= 0
                      ? "No change to your freedom date"
                      : "Freedom " + dl + (dl === 1 ? " year" : " years") + " later",
              ];
            })
          )
        : "",
      math: ["You keep " + igM(free) + " a month (" + igM(x.take) + " in, " + igM(x.take - free) + " out)"]
        .concat(
          picks.map(
            w =>
              w[1] +
              ": about " +
              igM(cost(w)) +
              " a month" +
              (w[0] === "less" ? " (a fifth of your take-home pay)" : " (a typical figure)")
          )
        )
        .concat(
          picks.length
            ? [
                "Together: " + igM(tot) + " a month",
                "Freedom date: each pick is taken out of what you keep, then the years are counted again",
              ]
            : []
        ),
      note: "The prices are typical figures to get you started, not quotes. The trade is real either way.",
      links: [
        ["See what you said matters", "values", ""],
        ["Safe to spend?", "safe", ""],
      ],
    };
  },
  val: x => "You keep " + igM(x.kept) + " a month to choose with",
});
