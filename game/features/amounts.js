/* ============================================================================
   SLAM the Game: features/amounts.js
   PURPOSE     The amounts inside the setup rounds (UX pass, phase 4). Count first, then one at a time.
               D: how many credit cards, how many carry a balance, then each card on its own screen ("Card 1
               of 2": the bank, about how much is left, the rate, the end of a 0% promo), then each other debt
               the same way. A: each account under a breadcrumb ("What you own › Investments › Roth IRA"),
               the cash total, and "Accounts you don't have" (Yes, No, Rolled over). I: each source of money,
               how often and about how much. E: how many roommates and kids, then spending group by group,
               each group with its lines and a live total.
               Every number question has range chips and "I know it", which opens the number box in the
               same spot, right under the chips.
   INPUT       The setup sheet (W.kind setup): W.o (the answers), W.o.am (the answers of this file, by
               question id), W.o.amIn (the typed number), W.amKnow (the question whose box is open).
   OUTPUT      Math: AM_RNG, amSteps, amApply, amGroupTotal, amMonthly, amRateSet, amHouseQs (the two count
               questions of page 2). Views: amBody, amAcctRow, amChecklist. Parts of functions in other files:
               finishSetupAm (finishSetup in ui.js), amApply (spPreview in spiral.js), amChecklist
               (spChecklist in spiral.js), amHouseQs (smQs in smart.js), amAcctRow (SETUP[5] in smart.js),
               meTabHousehold (meTab in ui.js). The pages 9 to 13 of SETUP. Actions (ACT): amset, amknow,
               amuse, amskip, amgrp, amira, amhh.
   DEPENDS ON  core/engine.js (DEBT_KINDS, CASH_K, INV_K, typSpend, clone), screens/ui.js (SETUP, money, esc,
               drawSheet), screens/smart.js (smState, smStepOn, pfSort), features/spiral.js (spOn, spBeatStart,
               spBeatOn, SP_BEAT_MS), features/mycards.js (CARD_K, CARD_ISS, cardSetRate, cardAddMonths,
               cardMonthName), features/kit.js (kitPill).
   RULES       A tap SETS an answer, it never adds. A range chip gives the middle of the range, Close, and the
               row keeps the range (x.rg = [low, high, amount]) so net worth shows a range. A typed number is
               Exact. "I don't know" keeps the stock number, a Guess (for a card rate, about 24%).
               Each card is its own row of c.debts. A card paid in full each month is a card (x.card.full
               "Yes", amount 0), not a debt. An IRA and a Roth IRA are two rows of the kind "IRA or Roth IRA",
               named by x.nick. A spending group keeps its lines in x.parts; while the lines are not all in,
               the total stays the stock number of the group and the rest is "not split up yet"; when the
               lines are more, the lines win.
   COMPAT      All new fields are optional: x.rg, x.parts and x.rest (spending), x.each (income each time it
               lands), x.nick on cash and investment rows, c.roommateCount,
               c.kidCount, c.x.rolled. An old saved game has none of them and loads as before. W.o.am and the
               other work keys are removed when setup finishes.
   ========================================================================= */
/* The ranges: [label, low, high]. The amount of a chip is the middle. */
const AM_RNG = {
  card: [
    ["Under $500", 0, 500],
    ["$500 to $2k", 500, 2000],
    ["$2k to $5k", 2000, 5000],
    ["$5k to $10k", 5000, 10000],
    ["$10k+", 10000, 20000],
  ],
  stu: [
    ["Under $10k", 0, 10000],
    ["$10k to $25k", 10000, 25000],
    ["$25k to $50k", 25000, 50000],
    ["$50k to $100k", 50000, 100000],
    ["$100k+", 100000, 200000],
  ],
  car: [
    ["Under $5k", 0, 5000],
    ["$5k to $15k", 5000, 15000],
    ["$15k to $30k", 15000, 30000],
    ["$30k+", 30000, 50000],
  ],
  mid: [
    ["Under $1k", 0, 1000],
    ["$1k to $5k", 1000, 5000],
    ["$5k to $15k", 5000, 15000],
    ["$15k+", 15000, 30000],
  ],
  small: [
    ["Under $500", 0, 500],
    ["$500 to $1k", 500, 1000],
    ["$1k to $3k", 1000, 3000],
    ["$3k+", 3000, 6000],
  ],
  cash: [
    ["Under $500", 0, 500],
    ["$500 to $2k", 500, 2000],
    ["$2k to $5k", 2000, 5000],
    ["$5k to $15k", 5000, 15000],
    ["$15k+", 15000, 30000],
  ],
  inv: [
    ["Under $5k", 0, 5000],
    ["$5k to $20k", 5000, 20000],
    ["$20k to $50k", 20000, 50000],
    ["$50k to $150k", 50000, 150000],
    ["$150k to $500k", 150000, 500000],
    ["$500k+", 500000, 1000000],
  ],
  /* money in, each time it lands */
  wk: [
    ["Under $250", 0, 250],
    ["$250 to $500", 250, 500],
    ["$500 to $750", 500, 750],
    ["$750 to $1,000", 750, 1000],
    ["$1,000 to $1,500", 1000, 1500],
    ["$1,500 to $2,500", 1500, 2500],
    ["$2,500+", 2500, 4000],
  ],
  two: [
    ["Under $500", 0, 500],
    ["$500 to $1,000", 500, 1000],
    ["$1,000 to $1,500", 1000, 1500],
    ["$1,500 to $2,500", 1500, 2500],
    ["$2,500 to $4,000", 2500, 4000],
    ["$4,000 to $6,000", 4000, 6000],
    ["$6,000+", 6000, 9000],
  ],
  mo: [
    ["Under $1,000", 0, 1000],
    ["$1,000 to $2,000", 1000, 2000],
    ["$2,000 to $3,500", 2000, 3500],
    ["$3,500 to $5,000", 3500, 5000],
    ["$5,000 to $8,000", 5000, 8000],
    ["$8,000 to $12,000", 8000, 12000],
    ["$12,000+", 12000, 18000],
  ],
  /* spending lines, a month */
  rent: [
    ["Nothing", 0, 0],
    ["Under $500", 0, 500],
    ["$500 to $1,000", 500, 1000],
    ["$1,000 to $1,500", 1000, 1500],
    ["$1,500 to $2,000", 1500, 2000],
    ["$2,000 to $3,000", 2000, 3000],
    ["$3,000+", 3000, 4500],
  ],
  util: [
    ["Under $100", 0, 100],
    ["$100 to $200", 100, 200],
    ["$200+", 200, 350],
  ],
  groc: [
    ["Under $200", 0, 200],
    ["$200 to $400", 200, 400],
    ["$400 to $700", 400, 700],
    ["$700+", 700, 1100],
  ],
  s50: [
    ["Nothing", 0, 0],
    ["Under $50", 0, 50],
    ["$50 to $150", 50, 150],
    ["$150 to $300", 150, 300],
    ["$300+", 300, 500],
  ],
  s100: [
    ["Nothing", 0, 0],
    ["Under $100", 0, 100],
    ["$100 to $200", 100, 200],
    ["$200+", 200, 350],
  ],
  s500: [
    ["Nothing", 0, 0],
    ["Under $300", 0, 300],
    ["$300 to $500", 300, 500],
    ["$500+", 500, 800],
  ],
  fun: [
    ["Under $100", 0, 100],
    ["$100 to $300", 100, 300],
    ["$300 to $600", 300, 600],
    ["$600+", 600, 1000],
  ],
};
const amMid = r => Math.round((r[1] + r[2]) / 2);
/* The range of a debt kind. */
const AM_DEBT_RK = {
  "Credit card balance": "card",
  "Student loans": "stu",
  "Car loan": "car",
  "Medical bills": "mid",
  "Personal loan": "mid",
  "Owed to family or friends": "mid",
  "Payday loan or cash advance": "small",
  "Buy now, pay later": "small",
};
/* "8% or more": the middle rate of the kind; a card is about 22%. */
const AM_HI_RATE = {
  "Credit card balance": 22,
  "Student loans": 9,
  "Car loan": 10,
  "Personal loan": 15,
  "Payday loan or cash advance": 30,
};
const AM_CARD_GUESS = 24;
/* The counts asked first. */
const AM_COUNT = {
  "Student loans": [
    ["One combined is fine", 1],
    ["2", 2],
    ["3", 3],
    ["4+", 4],
  ],
  "Car loan": [
    ["1", 1],
    ["2", 2],
    ["3+", 3],
  ],
};
const AM_ONE = { "Student loans": "Student loan", "Car loan": "Car loan" };
/* How often money comes in: [label, the rhythm of the game (PF_O), the range, the word for "each time"]. */
const AM_FREQ = [
  ["Weekly", "Weekly", "wk", "a week", 52 / 12],
  ["Every 2 weeks", "Every 2 weeks", "two", "every 2 weeks", 26 / 12],
  ["Twice a month", "Twice a month", "two", "twice a month, each time", 2],
  ["Monthly", "Monthly", "mo", "a month", 1],
  ["Paid by the shift or gig", "It varies", "mo", "in a usual month", 1],
];
/* The display name of an income kind (the stored kind stays). */
const AM_INC_LAB = {
  "A main job": "Job",
  "Unemployment or benefits": "Unemployment",
  "Help from family": "Allowance or family help",
  "Side gigs": "Side gig",
  "Other income": "Other",
};
/* The spending groups: [the kind of SPEND_K, icon, the line under the name, the lines: [name, range]]. */
const AM_GROUPS = [
  [
    "Home",
    "🏠",
    "Where you live",
    [
      ["Rent or mortgage", "rent"],
      ["Utilities", "util"],
    ],
  ],
  [
    "Food",
    "🍎",
    "What you eat",
    [
      ["Groceries", "groc"],
      ["Eating out", "s50"],
    ],
  ],
  [
    "Getting around",
    "🚗",
    "How you get places",
    [
      ["Car payment", "s500"],
      ["Gas", "s100"],
      ["Car insurance", "s100"],
      ["Transit and rides", "s50"],
    ],
  ],
  [
    "Bills and subscriptions",
    "📱",
    "What you pay every month",
    [
      ["Phone", "s100"],
      ["Internet", "s100"],
      ["Streaming and apps", "s50"],
    ],
  ],
  [
    "Fun and everything else",
    "🎉",
    "The rest",
    [
      ["Going out and hobbies", "fun"],
      ["Shopping", "fun"],
      ["Gifts and other", "s50"],
    ],
  ],
];
/* The accounts: [kind, the name on screen, the group of the breadcrumb]. IRA and Roth IRA share one kind. */
const AM_ACCTS = [
  ["Checking", "Checking", "Cash"],
  ["Savings", "Savings", "Cash"],
  ["Cash at home", "Cash at home", "Cash"],
  ["Retirement plan at work", "401(k) or work plan", "Investments"],
  ["IRA or Roth IRA", "IRA", "Investments"],
  ["IRA or Roth IRA", "Roth IRA", "Investments"],
  ["Other investments", "Other investments", "Investments"],
  ["HSA", "HSA", "Investments"],
];
const AM_IRA = "IRA or Roth IRA";
const AM_ROLL_FROM = ["401(k) or work plan", "IRA"];
const AM_ROLL_TO = ["Roth IRA", "IRA", "401(k) or work plan"];
const amSlug = s =>
  String(s)
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
const amA = (o, id) => ((o && o.am) || {})[id];

/* ---------- THE MATH ---------- */
/* Each income each time it lands, as money a month. */
function amMonthly(amt, freq) {
  const f = AM_FREQ.find(r => r[0] === freq || r[1] === freq) || AM_FREQ[3];
  return Math.round(amt * f[4]);
}
/* The names of the accounts this player has: the kinds of page 5, with IRA and Roth IRA apart. */
function amOwned(o) {
  const a = o.accts || [],
    ira = o.iraPick || (a.includes(AM_IRA) ? ["IRA"] : []);
  return AM_ACCTS.filter(r => (r[0] === AM_IRA ? ira.includes(r[1]) : a.includes(r[0])));
}
/* Each debt line to ask about: { key, k, n (its name), i, of }. */
function amDebtLines(o) {
  const out = [],
    n = amA(o, "cards.n"),
    carry = n && n.v > 0 ? amA(o, "cards.carry") : null,
    cn = carry ? carry.v : 0;
  for (let i = 1; i <= cn; i++)
    out.push({ key: "card." + i, k: CARD_K, n: "Card " + i, i, of: cn, grp: "Credit cards" });
  (o.debtKinds || [])
    .filter(k => k !== CARD_K)
    .forEach(k => {
      const cnt = AM_COUNT[k] ? amA(o, "d:" + amSlug(k) + ".n") : null,
        m = cnt ? cnt.v : 1,
        one = m === 1 && cnt && /combined/i.test(cnt.lab || "");
      for (let i = 1; i <= m; i++)
        out.push({
          key: "d:" + amSlug(k) + "." + i,
          k,
          n: m > 1 ? (AM_ONE[k] || k) + " " + i : one ? k + ", all together" : k,
          i,
          of: m,
          grp: k,
        });
    });
  return out;
}
/* The rate chips of a debt: [label, what it sets]. */
function amRateOpts(k) {
  const card = k === CARD_K;
  return [
    ["8% or more", "hi"],
    ["Less than 8%", "lo"],
  ]
    .concat(card ? [["0% promo", "promo"]] : [], /famil|friend|medical/i.test(k) ? [["No interest", "zero"]] : [])
    .concat([["I don't know", "dk"]]);
}
/* A rate answer on a debt row. */
function amRateSet(x, a) {
  if (!a) return;
  const card = x.k === CARD_K,
    v = a.v;
  if (card) {
    x.card = x.card || {};
    if (a.cf === 3) cardSetRate(x, bandOf(a.n), a.n, "typed");
    else if (v === "hi") cardSetRate(x, "15% to 25%", AM_HI_RATE[CARD_K], "band");
    else if (v === "lo") cardSetRate(x, "Under 8%", 5, "band");
    else if (v === "promo") cardSetRate(x, "No interest", 0, "band");
    else if (v === "dk") {
      cardSetRate(x, "15% to 25%", AM_CARD_GUESS, "band");
      x.rate = AM_CARD_GUESS;
      x.ratecf = 0;
      x.card.rt = "guess";
    }
    return;
  }
  delete x.ratecf;
  if (a.cf === 3) {
    x.rate = a.n;
    x.apr = bandOf(a.n);
    x.high = a.n >= 8;
  } else if (v === "hi") {
    x.apr = "8% to 15%";
    x.high = true;
  } else if (v === "lo") {
    x.apr = "Under 8%";
    x.high = false;
  } else if (v === "zero") {
    x.apr = "No interest";
    x.high = false;
  }
}
/* An amount answer: { amt, s, cf, rg }. */
function amAmt(a) {
  if (!a || a.v == null) return null;
  return { amt: a.v, s: true, cf: a.cf, rg: a.rg ? [a.rg[0], a.rg[1], a.v] : null };
}
const amPut = (x, a) => {
  const m = amAmt(a);
  if (!m) return x;
  x.amt = m.amt;
  x.s = true;
  x.cf = m.cf;
  if (m.rg) x.rg = m.rg;
  else delete x.rg;
  x.was = m.amt;
  return x;
};
/* The total of a spending group from its lines. guess: the stock number of the group. */
function amGroupTotal(lines, guess, all) {
  const got = lines.filter(l => l.amt != null),
    sum = got.reduce((t, l) => t + l.amt, 0);
  if (!got.length) return { amt: guess, sum: 0, rest: guess, done: false };
  if (all) return { amt: sum, sum, rest: 0, done: true };
  return { amt: Math.max(guess, sum), sum, rest: Math.max(0, guess - sum), done: false };
}
/* The lines of spending group g from the answers. */
function amGroupLines(o, g) {
  return g[3].map((L, j) => {
    const a = amA(o, "s:" + amSlug(g[0]) + ":" + j);
    return {
      n: L[0],
      amt: a && a.v != null ? a.v : null,
      cf: a ? a.cf : 0,
      rg: a && a.rg ? a.rg : null,
      skip: !!(a && a.skip),
    };
  });
}
/* THE ANSWERS BECOME ROWS. On a copy for the number of a round, and on the profile when setup finishes.
   Rows of a kind with no answer stay as they are, so applyTypical fills them. */
function amApply(o) {
  const am = o.am;
  if (!am) return o;
  o.x = o.x || {};
  /* D: the cards, then the other debts */
  const n = amA(o, "cards.n");
  if (n) {
    const cards = [],
      cn = n.v > 0 && amA(o, "cards.carry") ? amA(o, "cards.carry").v : 0,
      d0 = DEBT_KINDS.find(d => d[0] === CARD_K);
    for (let i = 1; i <= cn; i++) {
      const x = { k: CARD_K, amt: Math.round(d0[1] / cn / 50) * 50, high: true, s: false, card: { nm: "Card " + i } },
        iss = amA(o, "card." + i + ".iss"),
        end = amA(o, "card." + i + ".end");
      x.was = x.amt;
      if (iss && iss.v && iss.v !== "skip") x.card.iss = iss.v;
      amPut(x, amA(o, "card." + i + ".amt"));
      amRateSet(x, amA(o, "card." + i + ".rate"));
      if (end && x.card.promo) {
        if (end.v === "ns") x.card.promo.end = "ns";
        else x.card.promo.ym = end.v;
      }
      cards.push(x);
    }
    for (let i = cn + 1; i <= n.v; i++)
      cards.push({ k: CARD_K, amt: 0, s: true, cf: 3, high: false, was: 0, card: { nm: "Card " + i, full: "Yes" } });
    o.debts = (o.debts || []).filter(x => x.k !== CARD_K).concat(cards);
    o.debtKinds = (o.debtKinds || []).filter(k => k !== CARD_K).concat(n.v > 0 ? [CARD_K] : []);
  }
  const lines = amDebtLines(o).filter(L => L.k !== CARD_K);
  const kinds = [...new Set(lines.map(L => L.k))];
  kinds.forEach(k => {
    const mine = lines.filter(L => L.k === k),
      d = DEBT_KINDS.find(z => z[0] === k);
    if (!d || !mine.some(L => amA(o, L.key + ".amt") || amA(o, L.key + ".rate") || mine.length > 1)) return;
    const rows = mine.map(L => {
      const x = { k, amt: Math.round(d[1] / mine.length / 50) * 50, high: d[2], s: false };
      x.was = x.amt;
      if (mine.length > 1) x.nick = L.n;
      amPut(x, amA(o, L.key + ".amt"));
      amRateSet(x, amA(o, L.key + ".rate"));
      return x;
    });
    o.debts = (o.debts || []).filter(x => x.k !== k).concat(rows);
  });
  /* A: each account */
  const owned = amOwned(o);
  if (o.iraPick) o.accts = (o.accts || []).filter(a => a !== AM_IRA).concat(o.iraPick.length ? [AM_IRA] : []);
  owned.forEach(r => {
    const a = amA(o, "a:" + amSlug(r[1]));
    if (!a) return;
    const sec = r[2] === "Cash" ? "cashes" : "invs";
    o[sec] = o[sec] || [];
    let x = o[sec].find(z => z.k === r[0] && (r[0] !== AM_IRA || z.nick === r[1] || (!z.nick && !z.am)));
    if (!x) o[sec].push((x = { k: r[0] }));
    if (r[0] === AM_IRA) x.nick = r[1];
    x.am = 1;
    amPut(x, a);
  });
  (o.invs || []).forEach(x => delete x.am);
  (o.cashes || []).forEach(x => delete x.am);
  const rolled = {};
  AM_ROLL_FROM.forEach(f => {
    const a = amA(o, "roll:" + amSlug(f));
    if (a && a.v) rolled[f] = a.v;
  });
  if (Object.keys(rolled).length) o.x.rolled = rolled;
  /* I: each source of money */
  o.x.incFreq = o.x.incFreq || {};
  (o.incKinds || []).forEach(k => {
    const f = amA(o, "i:" + amSlug(k) + ":f"),
      a = amA(o, "i:" + amSlug(k) + ":amt");
    if (f) {
      const fr = AM_FREQ.find(r => r[0] === f.v);
      if (fr) o.x.incFreq[k] = fr[1];
      if (k === pfSort(o.incKinds)[0] && fr) {
        o.payFreq = fr[1];
        o.x.payGuess = false;
      }
    }
    if (!a || a.v == null) return;
    const fq = f ? f.v : "Monthly",
      x = { k, amt: amMonthly(a.v, fq), s: true, cf: a.cf };
    if (a.rg) x.rg = [amMonthly(a.rg[0], fq), amMonthly(a.rg[1], fq), x.amt];
    x.each = a.v;
    o.incs = (o.incs || []).filter(z => z.k !== k).concat(x);
  });
  /* E: the household and spending group by group */
  const cnt = v => (v == null || v === "Skip" ? null : v === "4+" ? 4 : +v);
  if ((o.live || []).includes("Roommates")) o.roommateCount = cnt(o.roommateQ);
  else o.roommateCount = null;
  if ((o.live || []).includes("Kids")) {
    o.kidCount = cnt(o.kidQ);
    if (o.kidCount != null) {
      o.x.kids = o.kidCount;
      o.x.done = o.x.done || {};
      o.x.done.kids = String(o.kidCount);
    }
  } else o.kidCount = null;
  const oh = Object.assign({}, o, { home: HOMEMAP[o.homeQ] || o.home });
  AM_GROUPS.forEach((g, i) => {
    const L = amGroupLines(o, g),
      st = amA(o, "s:" + amSlug(g[0]));
    if (!L.some(l => l.amt != null)) return;
    const all = L.every(l => l.amt != null || l.skip) || !!(st && st.all),
      T = amGroupTotal(L, typSpend(oh, i), all),
      cf = L.filter(l => l.amt != null).every(l => l.cf >= 3) ? 3 : 2,
      x = {
        k: g[0],
        amt: T.amt,
        s: T.done,
        cf,
        parts: L.filter(l => l.amt != null).map(l => ({ n: l.n, amt: l.amt, cf: l.cf })),
      };
    if (!T.done) {
      x.h = true;
      x.rest = T.rest;
    }
    o.spends = (o.spends || []).filter(z => z.k !== g[0]).concat(x);
  });
  return o;
}
/* Part of finishSetup() in ui.js. The answers become rows, then the work keys go. */
function finishSetupAm() {
  if (!W || !W.o) return;
  amApply(W.o);
  ["am", "amIn", "roommateQ", "kidQ", "iraPick"].forEach(k => delete W.o[k]);
}

/* ---------- THE STEPS OF A PAGE ----------
   Each step: { id, grp (for the handoff line), head ("Card 1 of 2"), crumb, l (the question), h (the line under
   the box), t ("rng" range chips, "ch" choice chips, "rate", "mon", "grp" a spending group), rk, opts, done, v (the
   answer in words) }. */
function amAnsWords(a) {
  if (!a) return null;
  if (a.skip) return "Skipped";
  return a.lab || (a.v != null ? money(a.v) : null);
}
function amSteps(w, p) {
  const o = w.o,
    S = [],
    add = st => S.push(Object.assign(st, { done: !!amA(o, st.id), v: amAnsWords(amA(o, st.id)) }));
  if (p === 9) {
    add({
      id: "cards.n",
      grp: "Credit cards",
      l: "How many credit cards do you have?",
      h: "Store cards count. Debit cards don't.",
      t: "ch",
      opts: [
        ["None", 0],
        ["1", 1],
        ["2", 2],
        ["3", 3],
        ["4", 4],
        ["5+", 5],
      ],
    });
    const n = amA(o, "cards.n");
    if (n && n.v > 0)
      add({
        id: "cards.carry",
        grp: "Credit cards",
        l: "How many carry a balance month to month?",
        h: "A card you pay in full each month doesn't count. It stays on your list of cards, not your debts.",
        t: "ch",
        opts: [["None", 0]].concat(
          Array.from({ length: n.v }, (_, i) => [n.v > 1 && i + 1 === n.v ? "All " + n.v : String(i + 1), i + 1])
        ),
      });
  }
  if (p === 10)
    amDebtLines(o).forEach(L => {
      const card = L.k === CARD_K,
        head = L.of > 1 ? (card ? "Card" : AM_ONE[L.k] || L.k) + " " + L.i + " of " + L.of : card ? "Your card" : L.n,
        slug = L.key;
      if (!card && L.i === 1 && AM_COUNT[L.k])
        add({
          id: "d:" + amSlug(L.k) + ".n",
          grp: L.grp,
          head: L.k,
          l: "How many " + L.k.toLowerCase() + " do you have?",
          h: L.k === "Student loans" ? "One combined is fine. You can split them later." : "",
          t: "ch",
          opts: AM_COUNT[L.k],
        });
      if (card)
        add({
          id: slug + ".iss",
          grp: L.grp,
          head,
          l: "Which bank is it from?",
          t: "ch",
          opts: CARD_ISS.map(b => [b, b]).concat([["Skip", "skip"]]),
        });
      add({
        id: slug + ".amt",
        grp: L.grp,
        head,
        l: "About how much is left to pay back?",
        h: "The whole amount left, not the monthly payment.",
        t: "rng",
        rk: AM_DEBT_RK[L.k] || "mid",
      });
      add({
        id: slug + ".rate",
        grp: L.grp,
        head,
        l: "What's the interest rate (APR)?",
        h: "Your app or statement shows the APR.",
        t: "rate",
        k: L.k,
      });
      const r = amA(o, slug + ".rate");
      if (card && r && r.v === "promo") {
        const t = todayISO(),
          months = Array.from({ length: 18 }, (_, i) => cardAddMonths(t, i + 1));
        add({
          id: slug + ".end",
          grp: L.grp,
          head,
          l: "When does the 0% end?",
          h: "After that month, the card takes its usual rate.",
          t: "ch",
          opts: months.map(m => [cardMonthName(m), m]).concat([["Not sure", "ns"]]),
        });
      }
    });
  if (p === 11) {
    amOwned(o).forEach(r =>
      add({
        id: "a:" + amSlug(r[1]),
        grp: r[2],
        head: r[1],
        crumb: ["What you own", r[2], r[1]],
        l: "About how much is in it today?",
        h:
          r[2] === "Investments" && r[0] !== "HSA"
            ? "Before taxes. Some of this goes to taxes when you take it out."
            : "",
        t: "rng",
        rk: r[2] === "Cash" ? "cash" : "inv",
      })
    );
    AM_ROLL_FROM.forEach(f => {
      const a = amA(o, "none:" + amSlug(f));
      if (a && a.v === "Rolled over")
        add({
          id: "roll:" + amSlug(f),
          grp: "Rolled over",
          head: f,
          l: "Where did your " + f + " go?",
          t: "ch",
          opts: AM_ROLL_TO.filter(x => x !== f).map(x => [x, x]),
        });
    });
  }
  if (p === 12)
    pfSort(o.incKinds || []).forEach((k, i, all) => {
      const nm = AM_INC_LAB[k] || k,
        f = amA(o, "i:" + amSlug(k) + ":f"),
        fr = AM_FREQ.find(r => f && r[0] === f.v),
        head = all.length > 1 ? nm + " (" + (i + 1) + " of " + all.length + ")" : nm;
      add({
        id: "i:" + amSlug(k) + ":f",
        grp: nm,
        head,
        l: "How often does it come in?",
        t: "ch",
        opts: AM_FREQ.map(r => [r[0], r[0]]),
      });
      add({
        id: "i:" + amSlug(k) + ":amt",
        grp: nm,
        head,
        l: "About how much lands " + (fr ? fr[3] : "each time") + "?",
        h: "What lands in your account, after taxes.",
        t: "rng",
        rk: fr ? fr[2] : "mo",
      });
    });
  if (p === 13) {
    /* fewer.js: the groups in the order of what their typical amount could move, the biggest first */
    const P = typeof fqSpendOrder === "function" ? fqSpendOrder(w) : null,
      at = g => (P ? P.order.indexOf("s:" + amSlug(g[0])) : -1);
    AM_GROUPS.slice()
      .sort((a, b) => (at(a) < 0 ? 99 : at(a)) - (at(b) < 0 ? 99 : at(b)))
      .forEach(g => {
        const id = "s:" + amSlug(g[0]),
          st = { id, grp: g[0], head: g[1] + " " + g[0], l: g[2], t: "grp", g };
        S.push(Object.assign(st, { done: !!amA(o, id), v: amA(o, id) ? amGroupWords(o, g) : null }));
      });
  }
  return S;
}
function amGroupWords(o, g) {
  const L = amGroupLines(o, g),
    a = amA(o, "s:" + amSlug(g[0]));
  if (!L.some(l => l.amt != null)) return a && a.few ? "Typical for now, a Guess" : "Skipped";
  const i = AM_GROUPS.indexOf(g),
    T = amGroupTotal(
      L,
      typSpend(Object.assign({}, o, { home: HOMEMAP[o.homeQ] || o.home }), i),
      L.every(l => l.amt != null || l.skip)
    );
  return money(T.amt) + " a month";
}

/* ---------- THE PAGES OF SETUP ---------- */
const amPageOn = (w, p) => typeof spOn === "function" && spOn(w) && !w.add;
SETUP[9] = {
  t: "Your credit cards",
  req: w => true,
  skip: w => !amPageOn(w, 9),
  b: w => amBody(w, 9),
};
SETUP[10] = {
  t: "Each debt, one at a time",
  req: w => true,
  skip: w => !amPageOn(w, 10) || !amSteps(w, 10).length,
  b: w => amBody(w, 10),
};
SETUP[11] = {
  t: "Each account",
  req: w => true,
  skip: w => !amPageOn(w, 11),
  b: w => amBody(w, 11),
};
SETUP[12] = {
  t: "Each source of money",
  req: w => true,
  skip: w => !amPageOn(w, 12) || !(w.o.incKinds || []).length,
  b: w => amBody(w, 12),
};
SETUP[13] = {
  t: "Spending, group by group",
  req: w => true,
  skip: w => !amPageOn(w, 13),
  b: w => amBody(w, 13),
};

/* ---------- THE VIEWS ---------- */
/* Range chips and "I know it", with the number box in the same spot right under the chips. */
function amChipsRng(w, id, rk, cur) {
  const open = w.amKnow === id,
    rs = AM_RNG[rk] || [];
  return (
    `<div class="chips">${rs.map((r, i) => `<button class="chip ${cur && cur.cf !== 3 && cur.lab === r[0] ? "on" : ""}" data-a="amset" data-q="${esc(id)}" data-rk="${rk}" data-i="${i}">${esc(r[0])}</button>`).join("")}<button class="chip know ${open || (cur && cur.cf === 3) ? "on" : ""}" data-a="amknow" data-q="${esc(id)}">I know it</button></div>` +
    amBox(w, id, cur)
  );
}
function amBox(w, id, cur, pct) {
  if (w.amKnow !== id) return "";
  const v = w.o.amIn != null ? w.o.amIn : cur && cur.cf === 3 ? String(cur.n != null ? cur.n : cur.v) : "";
  return `<div class="amknow row" style="gap:8px;align-items:flex-end"><div class="field" style="flex:1;margin:0"><label class="small" for="amIn">${pct ? "The rate, in %" : "The amount, in dollars"}</label><input type="text" id="amIn" inputmode="decimal" data-k="amIn" value="${esc(v)}" placeholder="${pct ? "e.g. 24.9" : "e.g. 869"}" autocomplete="off"></div><button class="primary" data-a="amuse" data-q="${esc(id)}" data-pct="${pct ? 1 : ""}">Use this</button></div>`;
}
function amStepHtml(w, st) {
  const o = w.o,
    cur = amA(o, st.id);
  if (st.t === "grp") return amGroupHtml(w, st);
  let inner = "";
  if (st.t === "rng") inner = amChipsRng(w, st.id, st.rk, cur);
  else if (st.t === "rate") {
    const open = w.amKnow === st.id;
    inner =
      `<div class="chips">${amRateOpts(st.k)
        .map(
          r =>
            `<button class="chip ${cur && cur.cf !== 3 && cur.v === r[1] ? "on" : ""}" data-a="amset" data-q="${esc(st.id)}" data-v="${r[1]}" data-lab="${esc(r[0])}">${esc(r[0])}</button>`
        )
        .join(
          ""
        )}<button class="chip know ${open || (cur && cur.cf === 3) ? "on" : ""}" data-a="amknow" data-q="${esc(st.id)}">I know it</button></div>` +
      amBox(w, st.id, cur, true);
  } else
    inner = `<div class="chips">${st.opts
      .map(
        r =>
          `<button class="chip ${cur && String(cur.v) === String(r[1]) ? "on" : ""}" data-a="amset" data-q="${esc(st.id)}" data-v="${esc(r[1])}" data-lab="${esc(r[0])}">${esc(r[0])}</button>`
      )
      .join("")}</div>`;
  const crumb = st.crumb ? `<div class="tiny muted amcrumb">${st.crumb.map(esc).join(" › ")}</div>` : "";
  return (
    `<div class="field smopen amstep">${crumb}${st.head ? `<h2 class="amhead">${esc(st.head)}</h2>` : ""}<div class="small"><b>${esc(st.l)}</b></div>${inner}${st.h ? `<div class="tiny muted">${esc(st.h)}</div>` : ""}` +
    (st.t === "rng" || st.t === "rate"
      ? `<button class="ghost slim" data-a="amskip" data-q="${esc(st.id)}">Skip, keep a guess</button>`
      : "") +
    `</div>`
  );
}
/* One spending group: the total that adds up live at the top, then each line with its chips. */
function amGroupHtml(w, st) {
  const o = w.o,
    g = st.g,
    i = AM_GROUPS.indexOf(g),
    L = amGroupLines(o, g),
    guess = typSpend(Object.assign({}, o, { home: HOMEMAP[o.homeQ] || o.home }), i),
    all = L.every(l => l.amt != null || l.skip),
    T = amGroupTotal(L, guess, all),
    /* fewer.js: when the lines left move little, say so and make "That's all" the main button */
    few = !all && typeof fqGroupFew === "function" ? fqGroupFew(g, L) : null;
  return (
    `<div class="field smopen amstep amgrp"><div class="tiny muted amcrumb">Money going out › ${esc(g[0])}</div><h2 class="amhead"><span aria-hidden="true">${g[1]}</span> ${esc(g[0])}</h2><div class="small muted">${esc(g[2])}</div>` +
    `<div class="tile amtotal" role="status"><span class="small">${esc(g[0])} total</span> <b class="amtot">${money(T.amt)}</b> <span class="tiny muted">a month</span>${T.rest > 0 && L.some(l => l.amt != null) ? `<div class="tiny muted">${money(T.rest)} not split up yet</div>` : !L.some(l => l.amt != null) ? `<div class="tiny muted">A typical amount for now. Tap your lines.</div>` : ""}</div>` +
    L.map((l, j) => {
      const id = "s:" + amSlug(g[0]) + ":" + j,
        cur = amA(o, id);
      return `<div class="amline"><div class="small"><b>${esc(l.n)}</b>${l.amt != null ? ` <span class="tiny muted">✓ ${money(l.amt)}</span>` : ""}</div>${amChipsRng(w, id, g[3][j][1], cur)}</div>`;
    }).join("") +
    (few ? few.html : "") +
    `<button class="${all || few ? "primary go" : "ghost"} wide slim" data-a="amgrp" data-q="${esc(st.id)}">${all ? "Done with " + esc(g[0]) : "That's all for " + esc(g[0])}</button></div>`
  );
}
/* The body of a page: the step that is open, or the first one with no answer. */
function amBody(w, p) {
  const S = amSteps(w, p),
    s = typeof smState === "function" ? smState(w) : { open: null },
    b =
      w.spBeat && typeof spBeatOn === "function" && spBeatOn(w) && String(w.spBeat.k).indexOf("am:") === 0
        ? w.spBeat.k.slice(3)
        : null;
  let st = b ? S.find(x => x.id === b) : null;
  const beat = !!st;
  if (!st && s.open) st = S.find(x => x.id === s.open);
  if (!st) st = S.find(x => !x.done);
  const at = st ? S.indexOf(st) : -1,
    prev = at > 0 ? S[at - 1] : null,
    hand =
      !beat && st && prev && prev.grp !== st.grp && prev.done
        ? `<div class="tile small amhand pop" role="status">${esc(amGrpDone(prev.grp))} done ✓. Next: ${esc(amGrpName(st.grp))}</div>`
        : "";
  /* fewer.js: on the spending page, when the group up next moves little, "You can stop here" */
  const stop = p === 13 && !beat && typeof fqSetupStop === "function" ? fqSetupStop(w, st) : "";
  let h = hand + stop + (st ? amStepHtml(w, st) : "");
  if (beat) h += `<div class="spbeat pop" role="status">✓ <b>${esc(st.head || st.l)}:</b> ${esc(st.v || "")}</div>`;
  if (!st)
    h += S.length
      ? `<div class="small muted">All in. Tap any line above to change it.</div>`
      : `<div class="small muted">${p === 11 ? "No accounts picked. If you have one, tap Yes below." : "Nothing to ask here."}</div>`;
  if (p === 11) h += amAcctSummary(w);
  return h;
}
const amGrpName = g => (g === "Credit cards" ? "credit cards" : String(g).toLowerCase());
const amGrpDone = g => String(g).charAt(0).toUpperCase() + String(g).slice(1);
/* The accounts page: the cash and investment totals, the rolled-over lines, and "Accounts you don't have". */
function amAcctSummary(w) {
  const o = w.o,
    P = amApply(clone(o)),
    rows = (sec, grp) =>
      amOwned(o)
        .filter(r => r[2] === grp)
        .map(r => amA(o, "a:" + amSlug(r[1])))
        .filter(Boolean),
    tot = rs => rs.reduce((t, a) => t + (a.v || 0), 0),
    st = rs => (!rs.length ? "Guess" : rs.every(a => a.cf >= 3) ? "Exact" : "Close"),
    cash = rows("cashes", "Cash"),
    inv = rows("invs", "Investments"),
    tag = s => (typeof kitPill === "function" ? kitPill(s) : `<span class="pill">${s}</span>`),
    owned = amOwned(o).map(r => r[1]),
    roll = (P.x && P.x.rolled) || {},
    notHave = AM_ACCTS.filter(r => !owned.includes(r[1]) && !roll[r[1]]);
  let h = `<div class="stack amsum" style="gap:6px">`;
  if (cash.length)
    h += `<div class="row between"><span>💵 <b>Cash: ${money(tot(cash))}</b></span>${tag(st(cash))}</div>`;
  if (inv.length)
    h += `<div class="row between"><span>📈 <b>Investments: ${money(tot(inv))}</b></span>${tag(st(inv))}</div>`;
  Object.keys(roll).forEach(
    f =>
      (h += `<div class="small muted amrolled">${esc(f === "401(k) or work plan" ? "401(k)" : f)} (rolled over to ${esc(roll[f])})</div>`)
  );
  if (notHave.length)
    h += `<details class="math amnot"${Object.keys(o.am || {}).some(k => k.indexOf("none:") === 0) ? " open" : ""}><summary>Accounts you don't have (${notHave.length})</summary><div class="stack" style="gap:8px;padding:8px 10px">${notHave
      .map(r => {
        const a = amA(o, "none:" + amSlug(r[1])),
          canRoll = AM_ROLL_FROM.includes(r[1]);
        return `<div><div class="small"><b>${esc(r[1])}</b>${a ? ` <span class="tiny muted">${esc(a.v)}</span>` : ""}</div><div class="chips">${[
          "Yes",
          "No",
        ]
          .concat(canRoll ? ["Rolled over"] : [])
          .map(
            v =>
              `<button class="chip ${a && a.v === v ? "on" : ""}" data-a="amhave" data-n="${esc(r[1])}" data-v="${v}">${v}</button>`
          )
          .join("")}</div></div>`;
      })
      .join("")}</div></details>`;
  return h + `</div>`;
}
/* Part of SETUP[5] in smart.js: IRA and Roth IRA are two rows in the rounds. Null for the other kinds. */
function amAcctRow(w, v) {
  if (v !== AM_IRA || !(typeof spOn === "function" && spOn(w))) return null;
  const pick = w.o.iraPick || ((w.o.accts || []).includes(AM_IRA) ? ["IRA"] : []);
  return ["IRA", "Roth IRA"]
    .map(n => {
      const on = pick.includes(n);
      return `<button class="rowbtn ${on ? "sel" : ""}" data-a="amira" data-v="${n}"><span>${n}${n === "Roth IRA" ? `<div class="tiny muted">You put in money already taxed. It grows, and comes out with no tax later.</div>` : `<div class="tiny muted">A retirement account of your own, not through work.</div>`}</span><b>${on ? "Yes" : ""}</b></button>`;
    })
    .join("");
}
/* Part of smQs() in smart.js: page 2 asks how many roommates and kids, when those were picked. */
function amHouseQs(w, base) {
  const o = w.o,
    live = o.live || [],
    out = base.slice();
  if (o.roommateQ == null && o.roommateCount != null)
    o.roommateQ = o.roommateCount >= 4 ? "4+" : String(o.roommateCount);
  if (o.kidQ == null && o.kidCount != null) o.kidQ = o.kidCount >= 4 ? "4+" : String(o.kidCount);
  const asked = smState(w).md.live;
  if (!live.includes("Roommates")) delete o.roommateQ;
  else if (asked)
    out.push({ k: "roommateQ", l: "How many roommates?", s: "Roommates", o: ["1", "2", "3", "4+", "Skip"] });
  if (!live.includes("Kids")) delete o.kidQ;
  else if (asked) out.push({ k: "kidQ", l: "How many kids?", s: "Kids", o: ["1", "2", "3", "4+", "Skip"] });
  return out;
}
/* Part of spChecklist() in spiral.js: what pages 9 to 13 have so far. Returns true for those pages. */
function amChecklist(w, p, out) {
  if (p < 9 || p > 13) return false;
  if (p === 9) {
    const n = amA(w.o, "cards.n"),
      c = amA(w.o, "cards.carry");
    out.push({
      s: "Credit cards",
      p,
      k: "cards.n",
      v: n
        ? n.v === 0
          ? "None"
          : n.v + (n.v === 1 ? " card" : " cards") + (c ? ", " + (c.v === 0 ? "none" : c.v) + " with a balance" : "")
        : null,
    });
    return true;
  }
  const S = amSteps(w, p),
    by = {};
  S.forEach(st => {
    const key = st.t === "grp" ? st.id : st.head || st.grp;
    (by[key] = by[key] || []).push(st);
  });
  Object.keys(by).forEach(key => {
    const L = by[key],
      got = L.filter(st => st.done && st.v && !/^\d{4}-\d\d$/.test(st.v)),
      first = L.find(st => !st.done) || L[0],
      nm = L[0].t === "grp" ? L[0].g[0] : key;
    out.push({ s: nm, p, k: first.id, v: L.every(st => st.done) ? got.map(st => st.v).join(", ") || "Skipped" : null });
  });
  return true;
}
/* Part of meTab() in ui.js: who lives with you, with the counts, and a way to change them. */
function meTabHousehold(h) {
  const c = C();
  if (!c || G.demo) return h;
  const live = c.live || [],
    ch = (k, v) =>
      ["1", "2", "3", "4+"]
        .map(
          n =>
            `<button class="chip ${v != null && (v >= 4 ? "4+" : String(v)) === n ? "on" : ""}" data-a="amhh" data-k="${k}" data-v="${n}">${n}</button>`
        )
        .join("");
  if (!live.includes("Roommates") && !live.includes("Kids")) return h;
  const card = `<div class="card stack amhh"><div class="tiny muted">Your household</div><div class="small">${esc(live.join(", "))} · ${hhSize(c)} ${hhSize(c) === 1 ? "person" : "people"} in all</div>${live.includes("Roommates") ? `<div class="small">How many roommates?</div><div class="chips">${ch("roommateCount", c.roommateCount)}</div>` : ""}${live.includes("Kids") ? `<div class="small">How many kids?</div><div class="chips">${ch("kidCount", c.kidCount)}</div>` : ""}</div>`;
  const at = h.lastIndexOf("</div>");
  return at > 0 ? h.slice(0, at) + card + h.slice(at) : h + card;
}

/* ---------- THE TAPS ---------- */
/* After an answer: the pick shows for a beat, then the next step comes. When the page is all in, it moves on. */
function amAfter(w, p, id, wasAll) {
  const s = smState(w);
  s.open = null;
  w.amKnow = null;
  delete w.o.amIn;
  const all = amSteps(w, p).every(x => x.done);
  if (typeof spBeatStart === "function") spBeatStart(w, "am:" + id);
  if (all && !wasAll) {
    const go = () => {
      if (W === w && w.step === p) {
        w.spBeat = null;
        smStepOn(w);
        drawSheet();
      }
    };
    if (w.spBeat && typeof setTimeout === "function") setTimeout(go, typeof SP_BEAT_MS === "number" ? SP_BEAT_MS : 650);
    else return go();
  }
  drawSheet();
}
const amBlock = w => !w || w.kind !== "setup" || (typeof spBeatOn === "function" && spBeatOn(w));
function amRecord(w, id, a) {
  w.o.am = w.o.am || {};
  const p = w.step,
    wasAll = amSteps(w, p).every(x => x.done);
  w.o.am[id] = a;
  /* a count that went down: the answers past the new count go */
  if (id === "cards.n" || id === "cards.carry" || /\.n$/.test(id)) amTrim(w.o);
  return { p, wasAll };
}
function amTrim(o) {
  const keep = new Set();
  [9, 10, 11, 12, 13].forEach(p => amSteps({ o, sm: { md: {} } }, p).forEach(st => keep.add(st.id)));
  Object.keys(o.am || {}).forEach(id => {
    if (/^(card\.|d:)/.test(id) && !keep.has(id)) delete o.am[id];
  });
}
Object.assign(ACT, {
  amset: t => {
    const w = W;
    if (amBlock(w)) return;
    const id = t.dataset.q;
    let a;
    if (t.dataset.rk) {
      const r = AM_RNG[t.dataset.rk][+t.dataset.i];
      a = { v: amMid(r), lab: r[0], cf: 2, rg: [r[1], r[2]] };
    } else {
      const raw = t.dataset.v,
        v = raw !== "" && isFinite(+raw) && !/^\d{4}-\d\d$/.test(raw) ? +raw : raw;
      a = { v, lab: t.dataset.lab || String(raw), cf: 2 };
      if (/\.rate$/.test(id) && raw === "dk") a.cf = 0;
    }
    const cur = (w.o.am || {})[id],
      s = smState(w);
    if (cur && cur.lab === a.lab && cur.cf === a.cf && !/^s:.*:\d+$/.test(id)) {
      /* the same chip again changes nothing. When it was opened to change it, the page goes back to its next step. */
      if (s.open === id) {
        s.open = null;
        drawSheet();
      }
      return;
    }
    const r = amRecord(w, id, a);
    if (/^s:.*:\d+$/.test(id)) {
      /* a line of a spending group: the total adds up live; the group moves on with its own button */
      w.amKnow = null;
      delete w.o.amIn;
      drawSheet();
      return;
    }
    amAfter(w, r.p, id, r.wasAll);
  },
  amknow: t => {
    const w = W;
    if (amBlock(w)) return;
    w.amKnow = w.amKnow === t.dataset.q ? null : t.dataset.q;
    delete w.o.amIn;
    drawSheet();
    if (typeof document !== "undefined" && document.getElementById)
      setTimeout(() => {
        const el = document.getElementById("amIn");
        if (el && el.focus) el.focus();
      }, 0);
  },
  amuse: t => {
    const w = W;
    if (amBlock(w)) return;
    const id = t.dataset.q,
      n = parseFloat(String(w.o.amIn || "").replace(/[$,%\s]/g, ""));
    if (!isFinite(n) || n < 0) {
      w.err = true;
      drawSheet();
      return;
    }
    const a = t.dataset.pct
      ? { v: "typed", n, lab: n + "%", cf: 3 }
      : { v: Math.round(n), lab: money(Math.round(n)), cf: 3 };
    const r = amRecord(w, id, a);
    if (/^s:.*:\d+$/.test(id)) {
      w.amKnow = null;
      delete w.o.amIn;
      drawSheet();
      return;
    }
    amAfter(w, r.p, id, r.wasAll);
  },
  amskip: t => {
    const w = W;
    if (amBlock(w)) return;
    const r = amRecord(w, t.dataset.q, { v: null, skip: true, lab: "Skipped", cf: 0 });
    amAfter(w, r.p, t.dataset.q, r.wasAll);
  },
  amgrp: t => {
    const w = W;
    if (amBlock(w)) return;
    const id = t.dataset.q,
      g = AM_GROUPS.find(x => "s:" + amSlug(x[0]) === id),
      L = g ? amGroupLines(w.o, g) : [];
    L.forEach((l, j) => {
      const lid = id + ":" + j;
      if (l.amt == null && !(w.o.am || {})[lid] && L.every(z => z.amt != null || z.skip))
        w.o.am[lid] = { v: null, skip: true, lab: "Skipped", cf: 0 };
    });
    const r = amRecord(w, id, { v: 1, lab: "Done", all: L.every(l => l.amt != null || l.skip) });
    amAfter(w, r.p, id, r.wasAll);
  },
  amira: t => {
    const w = W;
    if (amBlock(w)) return;
    const v = t.dataset.v;
    let p = w.o.iraPick || ((w.o.accts || []).includes(AM_IRA) ? ["IRA"] : []);
    p = p.includes(v) ? p.filter(x => x !== v) : p.concat(v);
    w.o.iraPick = p;
    w.o.accts = (w.o.accts || []).filter(a => a !== AM_IRA).concat(p.length ? [AM_IRA] : []);
    drawSheet();
  },
  amhave: t => {
    const w = W;
    if (amBlock(w)) return;
    const nm = t.dataset.n,
      v = t.dataset.v,
      r = AM_ACCTS.find(x => x[1] === nm);
    w.o.am = w.o.am || {};
    w.o.am["none:" + amSlug(nm)] = { v, lab: v, cf: 2 };
    if (v === "Yes" && r) {
      if (r[0] === AM_IRA) {
        const p = (w.o.iraPick || ((w.o.accts || []).includes(AM_IRA) ? ["IRA"] : [])).filter(x => x !== nm).concat(nm);
        w.o.iraPick = p;
        w.o.accts = (w.o.accts || []).filter(a => a !== AM_IRA).concat([AM_IRA]);
      } else if (!(w.o.accts || []).includes(r[0])) w.o.accts = (w.o.accts || []).concat(r[0]);
      delete w.o.am["none:" + amSlug(nm)];
    }
    if (v !== "Rolled over") delete w.o.am["roll:" + amSlug(nm)];
    drawSheet();
  },
  amhh: t => {
    const c = C(),
      k = t.dataset.k,
      v = t.dataset.v === "4+" ? 4 : +t.dataset.v;
    c[k] = c[k] === v ? null : v;
    if (k === "kidCount") {
      c.x = c.x || {};
      c.x.kids = c.kidCount || 0;
      c.x.done = c.x.done || {};
      if (c.kidCount != null) c.x.done.kids = String(c.kidCount);
    }
    save();
    render();
  },
});

/* ---------- THE SPREADSHEET OF THE PLAN (book.js) ---------- */
/* Each income from setup: what lands each time, times how often, is money a month. Each spending group with its
   lines: while the lines are not all in, the group is the larger of the stock number and the lines. */
function amountsBook(c) {
  const rows = [];
  (c.incs || []).forEach((x, i) => {
    if (x.each == null) return;
    const f = AM_FREQ.find(r => r[1] === ((c.x || {}).incFreq || {})[x.k]) || AM_FREQ[3],
      id = "am_i" + i;
    rows.push(
      { id: id + "e", label: (AM_INC_LAB[x.k] || x.k) + ", each time it lands", v: x.each },
      { id: id + "m", label: "Times it lands a month (" + f[0].toLowerCase() + ")", v: f[4] },
      { id, label: (AM_INC_LAB[x.k] || x.k) + ", a month", v: x.amt, f: "=ROUND({" + id + "e}*{" + id + "m},0)" }
    );
  });
  (c.spends || []).forEach((x, i) => {
    if (!x.parts || !x.parts.length) return;
    const id = "am_s" + i,
      ids = x.parts.map((p, j) => id + "p" + j);
    x.parts.forEach((p, j) => rows.push({ id: ids[j], label: x.k + ": " + p.n, v: p.amt }));
    rows.push({
      id: id + "l",
      label: x.k + ", the lines",
      v: x.parts.reduce((t, p) => t + p.amt, 0),
      f: "=" + ids.map(k => "{" + k + "}").join("+"),
    });
    if (x.rest > 0) {
      rows.push({ id: id + "g", label: x.k + ", the stock number", v: x.amt, note: "Until the lines are all in" });
      rows.push({ id, label: x.k + ", a month", v: x.amt, f: "=MAX({" + id + "g},{" + id + "l})" });
    } else rows.push({ id, label: x.k + ", a month", v: x.amt, f: "={" + id + "l}" });
  });
  if (c.roommateCount != null || c.kidCount != null)
    rows.push({
      id: "am_hh",
      label: "People in the household",
      v: hhSize(c),
      note: "You, a partner, the kids and the roommates",
    });
  return rows.length ? { title: "Setup: what lands each month, and the spending lines", rows } : null;
}
