/* ===== ideas4.js: Part 2. Spending (34 to 40), Deals (41, 42), Real estate (43 to 45). Same frame and rules as ideas.js. ===== */
function igPmt(loan, rate, yrs) {
  const r = rate / 12,
    n = yrs * 12;
  return loan <= 0 ? 0 : (loan * r) / (1 - Math.pow(1 + r, -n));
}
function igAddDays(iso, n) {
  const d = new Date(Date.parse(iso) + n * 864e5);
  return d.toISOString().slice(0, 10);
}
/* ---------- 34. David Bach ---------- */
igAdd({
  id: "bach",
  grp: "spend",
  n: "The latte factor, and pay yourself first",
  by: "David Bach, The Automatic Millionaire",
  one: "Small daily spending adds up to a large sum over decades, and saving works best when it happens before you see the money.",
  what: "Two of his ideas. The latte factor: a few dollars a day, invested instead, grows into real money. Pay yourself first: have savings leave your paycheck automatically, so there is nothing to decide each month.",
  fit: (c, d) => c.work !== "Retired" && d.era <= 5,
  body: x => {
    const day = x.v("day", 5),
      wk = x.v("wk", 5),
      yr = day * wk * 52,
      yrs = Math.max(1, x.ret - x.age),
      fv = grow(0, yrs, yr),
      auto = x.o.auto;
    return {
      big: igM(fv) + " by " + x.ret,
      cap:
        igM(day) +
        " a day, " +
        wk +
        " days a week, is " +
        igM(yr) +
        " a year. Invested instead, that is what it grows to. " +
        igI("latte"),
      ins: [
        [
          "day",
          "How much is the small daily thing?",
          "latte",
          [
            [3, "$3"],
            [5, "$5"],
            [8, "$8"],
            [12, "$12"],
            [20, "$20"],
          ],
          5,
        ],
        [
          "wk",
          "How many days a week?",
          "latte",
          [
            [3, "3"],
            [5, "5"],
            [7, "7"],
          ],
          5,
        ],
        [
          "auto",
          "Does your saving happen by itself?",
          "payfirst",
          [
            ["all", "Yes, all of it"],
            ["some", "Some of it"],
            ["no", "No, I move it by hand"],
          ],
          null,
        ],
      ],
      after: auto
        ? `<div class="tile small">${auto === "all" ? "Then the hard part is done. The only job left is raising the amount when your pay goes up." : "One step: set up a transfer for the day after payday, even a small one. What leaves before you see it does not get spent."}</div>`
        : "",
      math: [
        igM(day) + " × " + wk + " days × 52 weeks = " + igM(yr) + " a year",
        igM(yr) + " a year for " + yrs + " years at 7% a year = " + igM(fv),
      ],
      note: "Ramit Sethi, also on this list, argues the opposite: skip the latte guilt and fix the big things, like housing and pay. Both can be true. This just shows the size of it.",
    };
  },
  val: x => "$5 a day becomes " + igM(grow(0, Math.max(1, x.ret - x.age), 1300)) + " by " + x.ret,
});
/* ---------- 35. Amy Dacyczyn ---------- */
const IG_STAPLES = [
  ["soap", "Laundry detergent"],
  ["tp", "Toilet paper"],
  ["coffee", "Coffee"],
  ["rice", "Rice or pasta"],
  ["eggs", "Eggs"],
  ["milk", "Milk"],
  ["dish", "Dish soap"],
  ["paste", "Toothpaste"],
  ["diaper", "Diapers"],
  ["pet", "Pet food"],
];
igAdd({
  id: "pricebook",
  grp: "spend",
  n: "The price book",
  by: "Amy Dacyczyn, The Tightwad Gazette",
  one: "Write down what your staples cost and how long they last, so you know a good price when you see one and never run out.",
  what: "Her price book is a running list of the things you buy over and over: the best price you have seen, and where. This version also tracks how long each one lasts, so the game can tell you when you are about to run out.",
  fit: (c, d) => d.era <= 4,
  body: x => {
    const picks = (x.o.st || []).map(k => IG_STAPLES.find(s => s[0] === k)).filter(Boolean),
      buys = x.o.buys || {},
      t = todayISO(),
      rows = picks.map(s => {
        const b = buys[s[0]] || [],
          gap = b.length >= 2 ? Math.max(1, igDays(b[b.length - 2], b[b.length - 1])) : null,
          out = gap && b.length ? igAddDays(b[b.length - 1], gap) : null,
          p = x.o["p_" + s[0]];
        return { s, b, gap, out, p, soon: out && igDays(t, out) <= 5 };
      });
    return {
      big: picks.length ? picks.length + (picks.length === 1 ? " staple" : " staples") + " tracked" : null,
      cap: picks.length
        ? "Tap Bought today each time you buy one. After two buys the game knows how long it lasts. " +
          igI("ig_pricebook")
        : "",
      picks: ["st", "Which staples do you buy over and over? Pick up to six.", "ig_pricebook", IG_STAPLES, 6],
      after: rows
        .map(
          r =>
            `<div class="tile stack" style="gap:6px"><div class="row between"><b>${esc(r.s[1])}</b><span class="tiny ${r.soon ? "fkhot" : "muted"}">${r.out ? (r.soon ? "Running low: " : "Runs out about ") + esc(r.out) : r.b.length ? "Bought " + esc(r.b[r.b.length - 1]) + ". One more buy and the game knows how long it lasts" : "Not bought yet"}</span></div>${r.gap ? `<div class="tiny muted">Lasts about ${r.gap} days${r.p ? ". Best price: " + igM(r.p) : ""}</div>` : ""}<div class="row" style="gap:6px"><button class="primary slim" style="flex:1" data-a="igbuy" data-v="${r.s[0]}">Bought today</button>${r.b.length ? `<button class="ghost slim" data-a="igunbuy" data-v="${r.s[0]}">Undo</button>` : ""}</div><div class="tiny muted">Best price you have seen</div><div class="chips">${[3, 5, 8, 12, 16, 20, 30].map(p => `<button class="chip ${r.p === p ? "on" : ""}" data-a="igset" data-k="p_${r.s[0]}" data-v="${p}">$${p}${r.p === p ? " ✕" : ""}</button>`).join("")}</div></div>`
        )
        .join(""),
      math: picks.length
        ? [
            "How long it lasts: the days between your last two buys",
            "Runs out: your last buy plus that many days",
            "Running low shows 5 days before",
          ]
        : null,
      note: "Prices are rounded to the nearest chip so there is nothing to type. Her original was a paper notebook.",
    };
  },
  val: x => ((x.o.st || []).length ? (x.o.st || []).length + " staples tracked" : ""),
});
Object.assign(ACT, {
  igbuy: t => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id),
      k = t.dataset.v,
      d = todayISO();
    o.buys = o.buys || {};
    const a = o.buys[k] || [];
    if (a[a.length - 1] !== d) a.push(d);
    o.buys[k] = a.slice(-4);
    save();
    render();
    drawSheet();
  },
  igunbuy: t => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id),
      k = t.dataset.v;
    if (o.buys && o.buys[k]) {
      o.buys[k].pop();
      save();
      drawSheet();
    }
  },
});
/* ---------- 36. Cait Flanders ---------- */
const IG_BAN = [
  "Write your rules: what you can buy, and what is off the list for 30 days.",
  "Unsubscribe from the stores that email you most.",
  "Delete one shopping app from your phone.",
  "Count something you own a lot of. Write the number down.",
  "When you want something today, add it to a list instead of a cart.",
  "Use up something you already have before opening a new one.",
  "Leave your card at home for one errand.",
  "Look at your list from day 5. Do you still want all of it?",
  "Give away or sell three things you do not use.",
  "Tell one person what you are doing, so someone is cheering.",
  "Notice what you reach for when you are bored. Do one other thing instead.",
  "Borrow something instead of buying it.",
  "Fix or clean something so it feels new.",
  "Add up what you did not spend this week.",
  "Go somewhere you usually shop, and only look.",
  "Plan one thing to look forward to that costs nothing.",
  "Cross one thing off your wish list for good.",
  "Find the thing you bought last year that you never used. What was the pull?",
  "Do a clear-out of one drawer or shelf.",
  "Move this week's unspent money to savings.",
  "Skip one sale on purpose.",
  "Write down what you have not missed at all.",
  "Write down the one thing you truly did miss.",
  "Spend an hour on a hobby that needs nothing new.",
  "Check your wish list again and cross off what faded.",
  "Thank someone instead of buying them something.",
  "Add up the month so far.",
  "Decide what goes back on the approved list for good.",
  "Pick one rule to keep after the ban ends.",
  "Done. What did 30 days change?",
];
igAdd({
  id: "flanders",
  grp: "spend",
  n: "The shopping ban",
  by: "Cait Flanders, The Year of Less",
  one: "Stop buying anything that is not a need for a set time, and notice what you reach for.",
  what: "She spent a year buying only what she needed and wrote about what it taught her. Here it is a 30-day side quest: you set your own approved list, and each day has one small task.",
  fit: (c, d) => c.work !== "Retired" && d.rate < 0.25,
  quest: { days: 30, tasks: IG_BAN, end: "Keep the one rule that helped most." },
  body: x => {
    const q = IG.flanders.quest,
      z = igQs(x, q),
      fun = cspRows(x.c)
        .filter(r => /fun|everything else/i.test(r.k))
        .reduce((t, r) => t + (+r.amt || 0), 0),
      sh = x.v("share", 0.3);
    return {
      big: z.on && !z.over ? "Day " + Math.min(30, z.day) + " of 30" : igM(fun * sh) + " this month",
      cap:
        (z.on && !z.over ? "Ticked so far: " + z.n + ". " : "") +
        "About what a month without shopping keeps, if shopping is " +
        igP(sh) +
        " of your fun money. " +
        igI("ig_flanders"),
      quest: q,
      ins: [
        [
          "share",
          "How much of your fun money goes to shopping?",
          "ig_flanders",
          [
            [0.15, "A little"],
            [0.3, "About a third"],
            [0.5, "Half"],
          ],
          0.3,
        ],
      ],
      math: ["Fun and everything else: " + igM(fun) + " a month", igM(fun) + " × " + igP(sh) + " = " + igM(fun * sh)],
      note: "The 30 tasks are the game's own.",
    };
  },
  val: x => {
    const z = igQs(x, IG.flanders.quest);
    return z.on && !z.over ? "You are on day " + Math.min(30, z.day) + " of 30" : "";
  },
});
/* ---------- 37. Kakeibo ---------- */
igAdd({
  id: "kakeibo",
  grp: "spend",
  n: "Kakeibo",
  by: "A Japanese household money journal, first published by Hani Motoko in 1904",
  one: "Four questions at the start of each month, answered by hand.",
  what: "Kakeibo means household account book. At its heart are four questions: how much do you have, how much do you want to save, how much are you spending, and how can you improve. Here the game fills in the two it knows and you tap the other two.",
  fit: (c, d) => d.era <= 5,
  body: x => {
    const m = todayISO().slice(0, 7),
      sv = x.o["s_" + m],
      how = x.o["h_" + m],
      opts = [
        ["food", "Cook more at home"],
        ["subs", "Cancel something"],
        ["wait", "Wait a day before buying"],
        ["cash", "Use cash for fun money"],
        ["plan", "Plan the week ahead"],
        ["none", "Keep doing what works"],
      ],
      lab = k => (opts.find(o => o[0] === k) || ["", ""])[1];
    return {
      big: sv != null ? igM(sv) + " to save this month" : igM(x.cash) + " on hand",
      cap:
        (sv != null
          ? "Your answer for " + m + "." + (how ? " Your one change: " + lab(how).toLowerCase() + "." : "")
          : "Question 1 is answered: that is your cash today.") +
        " " +
        igI("ig_kakeibo"),
      html: igRows([
        ["1. How much do you have?", igM(x.cash)],
        ["2. How much do you want to save?", sv != null ? igM(sv) : "Tap below"],
        ["3. How much are you spending?", igM(x.c.spend) + " a month"],
        ["4. How can you improve?", how ? esc(lab(how)) : "Tap below"],
      ]),
      ins: [
        [
          "s_" + m,
          "2. How much do you want to save this month?",
          "ig_kakeibo",
          [50, 100, 200, 400, 600, 1000].map(v => [v, "$" + v.toLocaleString()]),
          null,
        ],
        ["h_" + m, "4. How can you improve this month?", "ig_kakeibo", opts, null],
      ],
      math: [
        "Cash: from My Money",
        "Spending: your monthly total from My Money",
        sv != null
          ? "Saving " + igM(sv) + " would be " + igP(x.take > 0 ? sv / x.take : 0) + " of your take-home pay"
          : "Tap an amount to see it as a share of your pay",
      ],
      note: "A fresh set of answers each month. Last month's stay saved. The original is done with pen and paper, which is part of why it works.",
    };
  },
  val: x => {
    const m = todayISO().slice(0, 7);
    return x.o["s_" + m] != null ? "This month's goal: " + igM(x.o["s_" + m]) : "";
  },
});
/* ---------- 38. Jacob Lund Fisker ---------- */
const IG_RUNGS = [
  "Spending more than comes in",
  "Getting by, with nothing left over",
  "Tracking where the money goes",
  "Cutting the easy things and saving a little",
  "Saving a real share of every paycheck",
  "Saving half or more, and investing it",
  "Needing less because you can make, fix and trade for more of what you need",
  "Your skills, people and money back each other up, so losing one does not sink you",
  "Work, home and community designed as one system",
  "Helping others build the same thing",
];
igAdd({
  id: "ere",
  grp: "spend",
  n: "The ladder of levels",
  by: "The idea of levels comes from Jacob Lund Fisker's Wheaton scale (Early Retirement Extreme). These ten rungs are SLAM's own short version, not his table.",
  one: "People sit on different rungs of the money ladder, and advice only lands from one rung up.",
  what: "His Wheaton scale describes stages people pass through on the way to financial independence and beyond. Its key point: advice from far above your rung sounds crazy, and advice from one rung up sounds useful. This ladder is a simplified version in the game's own words.",
  fit: (c, d) => true,
  body: x => {
    const r = x.d.rate,
      kept = x.take - (x.c.spend || 0),
      auto = kept < 0 ? 1 : r < 0.02 ? 2 : r < 0.08 ? 3 : r < 0.15 ? 4 : r < 0.5 ? 5 : 6,
      me = x.v("rung", auto);
    return {
      big: "Rung " + me + " of 10",
      cap:
        esc(IG_RUNGS[me - 1]) +
        "." +
        (me < 10 ? " One rung up: " + esc(IG_RUNGS[me].toLowerCase()) + "." : "") +
        " " +
        igI("ig_ere"),
      html: `<div class="stack" style="gap:3px">${IG_RUNGS.map((t, i) => `<div class="row small" style="gap:8px;${i + 1 === me ? "font-weight:700" : ""}"><span class="${i + 1 === me ? "" : "muted"}" style="min-width:22px">${i + 1}</span><span class="${i + 1 === me ? "" : i === me ? "" : "muted"}">${esc(t)}${i + 1 === me ? " · you" : i === me ? " · next" : ""}</span></div>`).join("")}</div>`,
      ins: [
        ["rung", "Which rung sounds most like you?", "ig_ere", IG_RUNGS.map((t, i) => [i + 1, String(i + 1)]), auto],
      ],
      math: [
        "The game's guess comes from your savings rate: " + igP(Math.max(0, r)),
        "Spending more than comes in: rung 1. Under 2% kept: 2. Under 8%: 3. Under 15%: 4. Under 50%: 5. Half or more: 6",
        "Rungs 7 to 10 are about how you live, not a number, so only you can pick them",
      ],
      note: "His real table is longer and more precise, and it is on the Early Retirement Extreme forum.",
    };
  },
  val: x => "The game's guess from your savings rate",
});
/* ---------- 39. The Richest Man in Babylon ---------- */
igAdd({
  id: "babylon",
  grp: "spend",
  n: "Keep a tenth of all you earn",
  by: "George S. Clason, The Richest Man in Babylon (1926)",
  one: "Before anything else, keep one coin of every ten.",
  what: "The book's first rule: a part of all you earn is yours to keep. Set aside at least a tenth of every paycheck before you spend any of it. It is the simplest starter rule there is.",
  fit: (c, d) => d.rate < 0.1 && c.work !== "Retired",
  body: x => {
    const tenth = x.take * 0.1,
      kept = x.take - (x.c.spend || 0),
      gap = Math.max(0, tenth - kept),
      fv = grow(0, 10, tenth * 12),
      pct = x.take > 0 ? kept / x.take : 0;
    return {
      big: igM(tenth) + " a month",
      cap:
        "A tenth of your take-home pay. " +
        (gap <= 0
          ? "You already keep that much or more."
          : "You keep " + igM(Math.max(0, kept)) + " now, so the gap is " + igM(gap) + " a month.") +
        " Kept and invested for 10 years, a tenth becomes " +
        igM(fv) +
        ". " +
        igI("ig_babylon"),
      html: `<span class="cpbar"><i class="band" style="left:${(10 / 30) * 100}%;width:1.5%"></i><i class="fill" style="width:${Math.max(1, Math.min(100, (Math.max(0, pct) / 0.3) * 100))}%"></i></span><div class="row between tiny muted"><span>You keep ${igP(Math.max(0, pct))}</span><span>The mark is 10%</span></div>`,
      math: [
        "Take-home pay: " + igM(x.take) + " a month",
        igM(x.take) + " × 10% = " + igM(tenth),
        "You keep now: " + igM(x.take) + " − " + igM(x.c.spend || 0) + " = " + igM(kept),
        igM(tenth) + " × 12 a year for 10 years at 7% = " + igM(fv),
      ],
      note: "A tenth is a floor to start from. The Money Guy Show on this list aims for 25%.",
      links: [["See your savings rate", "metric", "save"]],
    };
  },
  val: x => "A tenth of your pay is " + igM(x.take * 0.1) + " a month",
});
/* ---------- 40. Laura Vanderkam ---------- */
igAdd({
  id: "hours168",
  grp: "time",
  n: "168 hours",
  by: "Laura Vanderkam, 168 Hours",
  one: "Everyone gets 168 hours a week. Count where yours go before you say you have no time.",
  what: "She asks people to log a whole week, all 168 hours. Most find more free time than they thought, in pieces they were not using on purpose. This is the two-minute tap version.",
  fit: (c, d) => true,
  body: x => {
    const h = hoursOf(x.c),
      sl = x.v("sleep", 7),
      ch = x.v("chores", 14),
      sc = x.v("screens", 14),
      work = h.w + h.cm,
      used = sl * 7 + work + ch + sc,
      free = 168 - used;
    return {
      big: Math.max(1, free) + " hours left each week",
      cap:
        "After sleep, work, chores and screens. That is about " +
        Math.max(1, Math.round((free / 7) * 10) / 10) +
        " hours a day that are yours to place. " +
        igI("ig_hours168"),
      html: igRows([
        ["Sleep", sl * 7 + " hours"],
        ["Work and getting there", work + " hours"],
        ["Chores, errands, caring for people", ch + " hours"],
        ["Screens for fun", sc + " hours"],
        ["Everything else", `<b>${free} hours</b>`],
      ]),
      ins: [
        [
          "sleep",
          "How much do you sleep a night?",
          "ig_hours168",
          [
            [6, "6 hours"],
            [7, "7"],
            [8, "8"],
            [9, "9"],
          ],
          7,
        ],
        [
          "chores",
          "Chores, errands and caring for people, a week",
          "ig_hours168",
          [
            [7, "7 hours"],
            [14, "14"],
            [21, "21"],
            [35, "35"],
          ],
          14,
        ],
        [
          "screens",
          "Screens for fun, a week",
          "ig_hours168",
          [
            [7, "7 hours"],
            [14, "14"],
            [21, "21"],
            [28, "28"],
          ],
          14,
        ],
      ],
      math: [
        "A week: 24 × 7 = 168 hours",
        "Sleep: " + sl + " × 7 = " + sl * 7,
        "Work: " + h.w + " hours plus " + h.cm + " getting there, from your hours",
        "168 − " + used + " = " + free,
      ],
      note: "Her method is a real log of a real week. This is the estimate. If the answer surprises you, log one week and see.",
      links: [["Set your work hours", "hrs", ""]],
    };
  },
  val: x => {
    const h = hoursOf(x.c);
    return "Work takes " + (h.w + h.cm) + " of your 168 hours";
  },
});
/* ---------- 41. Frequent Miler ---------- */
const IG_RRV = [
  ["ur", 1.5, "Chase Ultimate Rewards"],
  ["mr", 1.5, "Amex Membership Rewards"],
  ["aa", 1.4, "American AAdvantage miles"],
  ["air", 1.3, "Most other airline miles"],
  ["avios", 1.1, "British Airways Avios"],
  ["cash", 1, "Cash back points"],
];
igAdd({
  id: "rrv",
  grp: "deals",
  n: "What your points are really worth",
  by: "Greg the Frequent Miler and his team (Reasonable Redemption Values)",
  one: "A point is worth what you can reasonably get for it, not the best case someone once found.",
  what: "Their Reasonable Redemption Values are estimates of what a point is worth when you use it in an ordinary, achievable way. Use them to decide whether a redemption is a good use of points or whether paying cash is smarter.",
  fit: (c, d) => d.era >= 3,
  body: x => {
    const pk = x.v("prog", "ur"),
      pr = IG_RRV.find(r => r[0] === pk) || IG_RRV[0],
      pts = x.v("pts", 50000),
      worth = (pts * pr[1]) / 100,
      price = x.v("price", null),
      need = x.v("need", null),
      cpp = price && need ? (price / need) * 100 : null;
    return {
      big: igM(worth),
      cap:
        pts.toLocaleString() +
        " " +
        pr[2] +
        " points at " +
        pr[1] +
        " cents each. " +
        igI("rrv") +
        (cpp != null
          ? " The trip you are looking at gives " +
            Math.round(cpp * 100) / 100 +
            " cents a point, which is " +
            (cpp >= pr[1] ? "at or above" : "below") +
            " that mark."
          : ""),
      ins: [
        ["prog", "Which points?", "rrv", IG_RRV.map(r => [r[0], r[2]]), "ur"],
        [
          "pts",
          "How many?",
          "rrv",
          [
            [10000, "10,000"],
            [25000, "25,000"],
            [50000, "50,000"],
            [100000, "100,000"],
            [200000, "200,000"],
          ],
          50000,
        ],
        [
          "price",
          "Checking a trip? What does it cost in cash?",
          "cpp",
          [
            [200, "$200"],
            [400, "$400"],
            [700, "$700"],
            [1200, "$1,200"],
            [2500, "$2,500"],
          ],
          null,
        ],
        [
          "need",
          "How many points does it ask for?",
          "cpp",
          [
            [10000, "10,000"],
            [25000, "25,000"],
            [40000, "40,000"],
            [60000, "60,000"],
            [100000, "100,000"],
          ],
          null,
        ],
      ],
      math: [
        pts.toLocaleString() + " × " + pr[1] + " cents = " + igM(worth),
        cpp != null
          ? "This trip: " +
            igM(price) +
            " ÷ " +
            need.toLocaleString() +
            " points = " +
            Math.round(cpp * 100) / 100 +
            " cents a point"
          : "Tap a cash price and a points price to check a trip",
        "Values as listed by Frequent Miler when checked in Nov 2026",
      ],
      note: "They change these as programs change, so check their page before a big redemption. Points only count as value if you would have paid cash for the trip.",
    };
  },
  val: x => "50,000 Chase points are worth about $750",
});
/* ---------- 42. Doctor of Credit ---------- */
const IG_BANKCK = [
  [
    "terms",
    "Read the offer's fine print before you open anything",
    "What counts as a direct deposit, the deadline, and who cannot get it.",
  ],
  ["one", "Run one bonus at a time", "Two at once is how deposits get missed."],
  ["note", "Write down the date you opened it and the date the bonus is due", ""],
  ["keep", "Keep the account open as long as the terms say", "Closing early can cost you the bonus or a fee."],
  ["tax", "Set aside tax on it", "A bank bonus counts as interest, and the bank reports it."],
  ["home", "Send the money home to your Big E fund when it is done", ""],
];
igAdd({
  id: "doc",
  grp: "deals",
  n: "The bank bonus queue",
  by: "Doctor of Credit",
  one: "Banks pay hundreds of dollars to try their accounts. Line them up one after another while your savings sits there anyway.",
  what: "Their site tracks bank account bonuses and the exact terms for each. The idea here: while you are building your Big E fund, that money can earn bonuses on the way, one account at a time.",
  fit: (c, d) => d.era >= 1 && d.era <= 5,
  body: x => {
    const b = x.v("bonus", 300),
      mo = x.v("mo", 4),
      n = Math.floor(12 / mo),
      yr = n * b,
      tax = x.v("tax", 0.22),
      net = yr * (1 - tax),
      t = todayISO();
    return {
      big: igM(net) + " a year after tax",
      cap:
        n +
        " bonuses of " +
        igM(b) +
        ", one every " +
        mo +
        " months. " +
        igI("bankbonus") +
        " On " +
        igM(x.cash) +
        " of cash, that is like earning " +
        (x.cash > 0 ? igP(Math.min(9.99, net / x.cash), 1) : "extra") +
        " on top of interest.",
      html: igRows(
        Array.from({ length: Math.min(n, 4) }, (_, i) => [
          "Bonus " + (i + 1) + ": open about " + igAddDays(t, i * mo * 30),
          "Paid by about " + igAddDays(t, (i + 1) * mo * 30),
        ])
      ),
      checks: IG_BANKCK,
      ins: [
        [
          "bonus",
          "How big is a typical bonus?",
          "bankbonus",
          [
            [200, "$200"],
            [300, "$300"],
            [400, "$400"],
            [500, "$500"],
          ],
          300,
        ],
        [
          "mo",
          "How long does each one take?",
          "bankbonus",
          [
            [3, "3 months"],
            [4, "4 months"],
            [6, "6 months"],
          ],
          4,
        ],
        [
          "tax",
          "Your top tax rate",
          "taxrate",
          [
            [0.12, "12%"],
            [0.22, "22%"],
            [0.24, "24%"],
            [0.32, "32%"],
          ],
          0.22,
        ],
      ],
      math: [
        "12 months ÷ " + mo + " = " + n + " bonuses a year",
        n + " × " + igM(b) + " = " + igM(yr),
        "Tax at " + igP(tax) + ": " + igM(yr * tax),
        "Left: " + igM(net),
      ],
      note: "The game does not list live offers. Their site does, with the terms for each. The checklist is the game's own.",
    };
  },
  val: x => "Three $300 bonuses a year is about $700 after tax",
});
/* ---------- 43. Brandon Turner ---------- */
const IG_BRRRR = [
  ["buy", "Buy: find a place that needs work, priced below what it will be worth fixed up", ""],
  ["rehab", "Rehab: fix what adds value, with a budget and a cushion", "Roofs and kitchens, not gold taps."],
  ["rent", "Rent: get a tenant in at a market rent", ""],
  ["refi", "Refinance: get a new loan on the fixed-up value and take your cash back out", ""],
  ["repeat", "Repeat: use that cash for the next one", ""],
];
igAdd({
  id: "brrrr",
  grp: "home",
  n: "BRRRR",
  by: "Brandon Turner and BiggerPockets",
  one: "Buy, rehab, rent, refinance, repeat: fix up a rental, then borrow against its new value to fund the next.",
  what: "A way to build a rental portfolio with the same cash more than once. You buy a property that needs work, fix it, rent it, then refinance at the higher value and pull your money back out.",
  fit: (c, d) => d.era >= 6 && c.work !== "Retired",
  body: x => {
    const price = x.v("price", 150000),
      rehab = x.v("rehab", 40000),
      arv = x.v("arv", 250000),
      loan = arv * 0.75,
      inn = price + rehab,
      back = Math.min(inn, loan),
      left = inn - loan,
      rent = x.v("rent", 2000),
      pay = igPmt(loan, 0.07, 30),
      flow = rent * 0.5 - pay;
    return {
      big: left <= 0 ? "All your cash comes back" : igM(left) + " stays in the deal",
      cap:
        "You put in " +
        igM(inn) +
        ". A new loan at 75% of the fixed-up value is " +
        igM(loan) +
        ". After that the rental leaves about " +
        igM(flow) +
        " a month. " +
        igI("arv"),
      checks: IG_BRRRR,
      ins: [
        [
          "price",
          "What do you buy it for?",
          "ig_brrrr",
          [
            [80000, "$80k"],
            [150000, "$150k"],
            [250000, "$250k"],
            [400000, "$400k"],
          ],
          150000,
        ],
        [
          "rehab",
          "What does the fix-up cost?",
          "ig_brrrr",
          [
            [15000, "$15k"],
            [40000, "$40k"],
            [75000, "$75k"],
          ],
          40000,
        ],
        [
          "arv",
          "What is it worth fixed up?",
          "arv",
          [
            [150000, "$150k"],
            [250000, "$250k"],
            [350000, "$350k"],
            [550000, "$550k"],
          ],
          250000,
        ],
        [
          "rent",
          "What does it rent for a month?",
          "ig_brrrr",
          [
            [1200, "$1,200"],
            [2000, "$2,000"],
            [2800, "$2,800"],
            [4000, "$4,000"],
          ],
          2000,
        ],
      ],
      math: [
        "Cash in: " + igM(price) + " + " + igM(rehab) + " = " + igM(inn),
        "New loan: 75% × " + igM(arv) + " = " + igM(loan),
        "Cash still in the deal: " + igM(inn) + " − " + igM(loan) + " = " + igM(left),
        "Loan payment at 7% over 30 years: " + igM(pay) + " a month",
        "Rent " +
          igM(rent) +
          " × 50% for costs = " +
          igM(rent * 0.5) +
          ", minus the payment = " +
          igM(flow) +
          " a month",
      ],
      note: `<span class="fkhot">Advanced.</span> This assumes you paid cash or a short loan up front, that the appraisal comes in where you hoped, and that rates hold. Any one of those can leave your money stuck in the house.`,
    };
  },
  val: x => "A step-by-step rental quest, with the numbers",
});
/* ---------- 44. Craig Curelop ---------- */
igAdd({
  id: "hack",
  grp: "home",
  n: "The house hack",
  by: "Craig Curelop, The House Hacking Strategy",
  one: "Buy a place with extra units or rooms, live in one, and let the rent from the rest pay for your housing.",
  what: "House hacking: you buy a home with a low down payment loan, live in part of it and rent out the rest. Your housing cost drops, sometimes to nothing, while you own the building.",
  fit: (c, d) => d.era >= 3 && c.work !== "Retired" && (c.home === "Renting" || c.home === "With family"),
  body: x => {
    const price = x.v("price", 450000),
      down = x.v("down", 0.05),
      rent = x.v("rent", 2000),
      loan = price * (1 - down),
      pi = igPmt(loan, 0.07, 30),
      tx = (price * 0.02) / 12,
      all = pi + tx,
      net = all - rent * 0.9,
      home = knRows(x.c).home.reduce((t, r) => t + (+r.amt || 0), 0);
    return {
      big: net <= 0 ? "You live for free, plus " + igM(-net) : igM(net) + " a month to live there",
      cap:
        "After the other units or rooms pay " +
        igM(rent) +
        ". You pay " +
        igM(home) +
        " a month for your home now. You need " +
        igM(price * down) +
        " down. " +
        igI("ig_hack"),
      ins: [
        [
          "price",
          "What does the building cost?",
          "ig_hack",
          [
            [250000, "$250k"],
            [350000, "$350k"],
            [450000, "$450k"],
            [650000, "$650k"],
            [900000, "$900k"],
          ],
          450000,
        ],
        [
          "down",
          "How much down?",
          "ig_hack",
          [
            [0.035, "3.5%"],
            [0.05, "5%"],
            [0.2, "20%"],
          ],
          0.05,
        ],
        [
          "rent",
          "What would the rest rent for, a month?",
          "ig_hack",
          [
            [800, "$800"],
            [1400, "$1,400"],
            [2000, "$2,000"],
            [3000, "$3,000"],
            [4500, "$4,500"],
          ],
          2000,
        ],
      ],
      math: [
        "Loan: " + igM(price) + " − " + igP(down, 1) + " down = " + igM(loan),
        "Payment at 7% over 30 years: " + igM(pi) + " a month",
        "Property tax and insurance, about 2% of the price a year: " + igM(tx) + " a month",
        "Rent, with a tenth held back for empty months and repairs: " + igM(rent * 0.9),
        igM(all) + " − " + igM(rent * 0.9) + " = " + igM(net),
      ],
      note: "Low down payment loans add mortgage insurance, which is not counted here. Being a landlord to the people you live next to is a job. Most low down payment loans require you to live there for a year.",
    };
  },
  val: x => "See if rent from the rest could cover your housing",
});
/* ---------- 45. Investor rules of thumb ---------- */
igAdd({
  id: "onepct",
  grp: "home",
  n: "The 1% rule and the 50% rule",
  by: "Rules of thumb used across the real estate investing world",
  one: "Two ten-second checks that tell you whether a rental is worth a closer look.",
  what: "The 1% rule: monthly rent should be about 1% of the price or more. The 50% rule: plan on half the rent going to costs other than the loan. Neither replaces doing the real math. They tell you which deals deserve it.",
  fit: (c, d) => d.era >= 5 && c.work !== "Retired",
  body: x => {
    const price = x.v("price", 250000),
      rent = x.v("rent", 2000),
      r = rent / price,
      pay = igPmt(price * 0.75, 0.07, 30),
      flow = rent * 0.5 - pay;
    return {
      big: igP(r, 1) + " of the price",
      cap:
        "Rent of " +
        igM(rent) +
        " on a " +
        igM(price) +
        " property. The 1% mark would be " +
        igM(price * 0.01) +
        ". By the 50% rule it leaves " +
        igM(flow) +
        " a month after the loan. " +
        igI("onepct"),
      ins: [
        [
          "price",
          "What does it cost?",
          "onepct",
          [
            [100000, "$100k"],
            [175000, "$175k"],
            [250000, "$250k"],
            [400000, "$400k"],
            [600000, "$600k"],
          ],
          250000,
        ],
        [
          "rent",
          "What does it rent for a month?",
          "onepct",
          [
            [1000, "$1,000"],
            [1500, "$1,500"],
            [2000, "$2,000"],
            [2800, "$2,800"],
            [4000, "$4,000"],
          ],
          2000,
        ],
      ],
      math: [
        "1% rule: " + igM(rent) + " ÷ " + igM(price) + " = " + igP(r, 1),
        "50% rule: half the rent, " +
          igM(rent * 0.5) +
          ", goes to taxes, insurance, repairs, empty months and management",
        "Loan on 75% of the price at 7% over 30 years: " + igM(pay) + " a month",
        igM(rent * 0.5) + " − " + igM(pay) + " = " + igM(flow) + " a month",
      ],
      note: "In high-priced areas like New York almost nothing meets the 1% rule, and investors there lean on rising values instead. That is a different bet.",
    };
  },
  val: x => "Two quick checks for any rental",
});
Object.assign(GLOSS, {
  latte: [
    "Latte factor",
    "The idea that small daily spending, added up over decades and invested instead, is a lot of money.",
  ],
  payfirst: [
    "Pay yourself first",
    "Moving money to savings the moment you are paid, automatically, before any of it can be spent.",
  ],
  rrv: [
    "Reasonable Redemption Value",
    "An estimate of what a rewards point is worth when you use it in a normal, achievable way.",
  ],
  cpp: [
    "Cents per point",
    "The cash price of a trip divided by the points it costs. It tells you what each point bought you.",
  ],
  bankbonus: [
    "Bank bonus",
    "Cash a bank pays you for opening an account and meeting its terms, usually a direct deposit within a set time.",
  ],
  arv: [
    "Fixed-up value",
    "What a property will be worth once the repairs are done. Investors call it the after-repair value, or ARV.",
  ],
  onepct: [
    "The 1% and 50% rules",
    "Two quick rental checks. Rent should be about 1% of the price a month, and about half the rent goes to running costs.",
  ],
});
