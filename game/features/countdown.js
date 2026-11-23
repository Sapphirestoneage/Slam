/* ============================================================================
   SLAM the Game: features/countdown.js
   PURPOSE     Countdowns. One countdown type for each goal on My Goals: a target amount, what is saved
               for it, and a monthly amount or a date. The result is "X months to go at $Y a month" and
               "$Y a month to make the date". Four kinds use the same function: any goal, a wedding, a
               down payment (the amount down, the closing costs and two months of payments) and a quit
               fund (months of spending plus health cover).
   INPUT       The profile: c.goals (the name, the price and the money saved of each goal), c.take,
               c.spend, c.x.countdown (the answers, with the key "<goal id>:<question>"). The open sheet
               (W.kind): cdn.
   OUTPUT      Functions: cdnMonthsTo, cdnMonthlyNeeded, cdnKind, cdnInputs, cdnTarget, cdnCalc, cdnLine,
               cdnList, cdnSheet, cdnBook, goalViewCountdown, goalsTabCountdown. Actions (ACT): cdn. Parts of functions in
               other files: goalViewCountdown (goalView in ui.js), goalsTabCountdown (goalsTab in ux.js). Menu: "Countdowns".
   DEPENDS ON  core/engine.js, screens/ui.js, features/sim.js (simLoanPayment), features/kit.js.
   RULES       The math is the one countdown of the older tool (engines/countdown.js): the money grows
               each month at the twelfth root of the yearly rate, then the monthly amount goes in. Cash
               for a goal earns 0% unless the player picks a rate. All amounts are in today's dollars.
               The countdown does not change the goal: the price and the money saved stay in c.goals.
               The words are "If these assumptions hold". No date is promised.
   ========================================================================= */
const CDN_MAX = 600;
const CDN_KINDS = [
  ["goal", "Any goal"],
  ["home", "Down payment"],
  ["quit", "Quit fund"],
  ["wedding", "Wedding"],
];
/* The down payment rules of the older tool (data/down_payment.json, data/housing_conventions.json). */
const CDN_HOME = { closing: 0.03, tax: 0.011, ins: 0.005, pmi: 0.0075, fha: 0.0055, reserves: 2, years: 30 };
const CDN_DOWN = [
  [0.035, "3.5% (FHA)"],
  [0.05, "5%"],
  [0.1, "10%"],
  [0.2, "20%"],
];
/* Months until the pot reaches the target. Null when it does not get there in 50 years. */
function cdnMonthsTo(target, saved, monthly, rate) {
  let pot = saved || 0;
  const f = Math.pow(1 + (rate || 0), 1 / 12);
  if (pot >= target) return 0;
  if (!(monthly > 0) && !(rate > 0)) return null;
  for (let m = 1; m <= CDN_MAX; m++) {
    pot = pot * f + (monthly || 0);
    if (pot >= target - 0.005) return m;
  }
  return null;
}
/* The monthly amount that reaches the target in this number of months. */
function cdnMonthlyNeeded(target, saved, rate, months) {
  if (!(months > 0)) return null;
  const f = Math.pow(1 + (rate || 0), 1 / 12),
    grown = (saved || 0) * Math.pow(f, months);
  if (grown >= target) return 0;
  const r = f - 1,
    ann = r === 0 ? months : (Math.pow(f, months) - 1) / r;
  return Math.ceil((target - grown) / ann);
}
/* The kind of countdown that fits a goal, from its name. The player can change it. */
function cdnKind(g) {
  const k = ((g && g.k) || "") + " " + ((g && g.n) || "");
  return /home|house|down payment/i.test(k)
    ? "home"
    : /quit|sabbatical|break|time off/i.test(k)
      ? "quit"
      : /wedding/i.test(k)
        ? "wedding"
        : "goal";
}
/* The answers for one goal. Each is { v, cf, given }. */
function cdnInputs(c, g) {
  const q = (k, fb) => kitValue(c, "countdown", g.id + ":" + k, fb),
    kept = Math.max(0, (c.take || 0) - (c.spend || 0)),
    price0 = Math.max(100000, Math.round(((g.cost || 0) * 5) / 25000) * 25000);
  return {
    kind: q("kind", cdnKind(g)),
    monthly: q("monthly", Math.max(50, Math.round((kept * 0.5) / 50) * 50)),
    months: q("months", 0),
    rate: q("rate", 0),
    price: q("price", price0),
    down: q("down", 0.2),
    apr: q("apr", 6.5),
    off: q("off", 6),
    cover: q("cover", 0),
  };
}
/* THE TARGET of one countdown, with its lines. */
function cdnTarget(c, g, I) {
  const kind = I.kind.v;
  if (kind === "home") {
    const H = CDN_HOME,
      price = I.price.v,
      down = price * I.down.v,
      loan = price - down,
      mi = (loan * (I.down.v < 0.05 ? H.fha : I.down.v < 0.2 ? H.pmi : 0)) / 12,
      pay = simLoanPayment(loan, I.apr.v, H.years) + (price * H.tax) / 12 + (price * H.ins) / 12 + mi,
      closing = price * H.closing,
      reserves = pay * H.reserves;
    return {
      target: Math.round(down + closing + reserves),
      lines: [
        ["Down: " + kitPct(I.down.v) + " of " + money(price), down],
        ["Closing costs, about 3% of the price", closing],
        ["Two months of payments in reserve", reserves],
      ],
      pay,
      list: [I.price, I.down, I.apr],
    };
  }
  if (kind === "quit") {
    const month = (c.spend || 0) + I.cover.v;
    return {
      target: Math.round(month * I.off.v),
      lines: [
        ["Your spending, " + I.off.v + " months", (c.spend || 0) * I.off.v],
        ["Health cover, " + I.off.v + " months", I.cover.v * I.off.v],
      ],
      month,
      list: [kitSharp(c, "spend"), I.off, I.cover],
    };
  }
  return {
    target: Math.round(g.cost || 0),
    lines: [["The price of the goal", g.cost || 0]],
    list: [{ cf: g.s ? 2 : 1 }],
  };
}
/* ONE COUNTDOWN: months to go at the monthly amount, and the monthly amount that makes the date. */
function cdnCalc(c, g) {
  const I = cdnInputs(c, g),
    T = cdnTarget(c, g, I),
    saved = g.fund || 0,
    left = Math.max(0, T.target - saved),
    months = cdnMonthsTo(T.target, saved, I.monthly.v, I.rate.v),
    need = I.months.v > 0 ? cdnMonthlyNeeded(T.target, saved, I.rate.v, I.months.v) : null,
    kept = Math.max(0, (c.take || 0) - (c.spend || 0));
  return {
    I,
    T,
    kind: I.kind.v,
    target: T.target,
    saved,
    left,
    monthly: I.monthly.v,
    months,
    at: months == null ? null : whenMonth(months),
    need,
    kept,
    fits: need == null ? null : need <= kept,
    pct: T.target > 0 ? Math.min(100, Math.round((saved / T.target) * 100)) : 100,
    st: kitState(T.list.concat([I.monthly, kitSharp(c, "take"), kitSharp(c, "spend")])),
  };
}
/* "14 months to go at $500 a month" */
function cdnLine(K) {
  if (K.months === 0) return "You are there";
  if (K.months == null) return "Not in 50 years at " + money(K.monthly) + " a month";
  return K.months + (K.months === 1 ? " month" : " months") + " to go at " + money(K.monthly) + " a month";
}
/* The open goals, each with its countdown. */
function cdnList(c) {
  return (c.goals || []).filter(g => !g.done).map(g => ({ g, K: cdnCalc(c, g) }));
}
function cdnBook(c) {
  const rows = [];
  cdnList(c).forEach((x, i) => {
    const p = "cd" + i + "_",
      K = x.K;
    rows.push(
      { id: p + "target", label: x.g.n + ": the target", v: K.target, note: "Your goal, or worked out by the game" },
      { id: p + "saved", label: x.g.n + ": saved for it", v: K.saved, note: "Your number" },
      { id: p + "left", label: x.g.n + ": still to save", v: K.left, f: "=MAX(0,{" + p + "target}-{" + p + "saved})" },
      { id: p + "monthly", label: x.g.n + ": saved each month", v: K.monthly, note: "Your answer" },
      {
        id: p + "months",
        label: x.g.n + ": months to go",
        v: K.months == null ? "" : K.months,
        note: "Worked out by the game, month by month",
      }
    );
  });
  return { title: "Countdowns", rows };
}
function cdnSheet() {
  const c = C(),
    g = (c.goals || []).find(x => x.id === (W && W.id));
  if (!g) {
    const L = cdnList(c);
    return (
      head("My Goals", "Countdowns") +
      `<div class="small muted">Each goal can be a countdown ${kitInfo("countdown")}: a target, what is saved, and a monthly amount or a date. Tap a goal.</div>` +
      (L.length
        ? `<div class="stack" style="gap:6px">${L.map(x => `<button class="rowbtn" data-a="cdn" data-v="${x.g.id}"><span style="min-width:0"><b class="small">${esc(x.g.n)}</b><div class="tiny muted">${esc(cdnLine(x.K))} · ${money(x.K.saved)} of ${money(x.K.target)}</div></span><span class="caret">›</span></button>`).join("")}</div>`
        : `<div class="tile small">No goals yet. Add a goal first: a down payment, a quit fund, a wedding, or anything you want.</div>`) +
      `<button class="${L.length ? "ghost" : "primary"} wide" data-a="gadd">Add a goal</button>`
    );
  }
  const K = cdnCalc(c, g),
    I = K.I,
    A = (k, label, opts, o) => kitAsk(c, "countdown", g.id + ":" + k, label, opts, I[k].v, o),
    $ = list => list.map(v => [v, money(v)]);
  let h =
    head("My Goals", "Countdown: " + esc(g.n)) +
    kitTile(
      "If these assumptions hold",
      esc(cdnLine(K)),
      (K.at && K.months > 0 ? "Around " + esc(K.at) + ". " : "") +
        money(K.saved) +
        " of " +
        money(K.target) +
        " saved (" +
        K.pct +
        "%).",
      K.st,
      "countdown"
    ) +
    bar(K.pct);
  if (K.need != null)
    h += kitTile(
      "To make the date",
      money(K.need) + " a month",
      "For " +
        I.months.v +
        " months. " +
        (K.fits
          ? "That fits in the " + money(K.kept) + " a month you keep."
          : "You keep " + money(K.kept) + " a month now, so the date or the target would need to move."),
      K.st,
      "cdnneed"
    );
  h += igRows(
    K.T.lines
      .map(l => [esc(l[0]), money(Math.round(l[1]))])
      .concat([["<b>The target</b>", "<b>" + money(K.target) + "</b>"]])
  );
  h += A("kind", "What kind of countdown is this?", CDN_KINDS, { term: "cdnkind" });
  if (K.kind === "home") {
    h += A("price", "The price of the home", $([200000, 300000, 400000, 500000, 650000, 800000]), {
      term: "cdnprice",
      typed: true,
    });
    h += A("down", "How much down", CDN_DOWN, {
      term: "cdndown",
      help: "Under 20% down, the loan has mortgage insurance each month.",
    });
    h += A(
      "apr",
      "The mortgage rate",
      [5.5, 6, 6.5, 7, 7.5].map(v => [v, v + "%"]),
      { term: "cdnapr" }
    );
    h += `<div class="small">The payment would be about <b>${money(Math.round(K.T.pay))}</b> a month, with property tax and insurance.</div>`;
  } else if (K.kind === "quit") {
    h += A(
      "off",
      "Months you want covered",
      [3, 6, 9, 12, 18, 24].map(v => [v, v + " months"]),
      { term: "cdnoff" }
    );
    h += A(
      "cover",
      "Health cover a month while you are away from work",
      [
        [0, "Covered already"],
        [475, "$475 (a marketplace plan)"],
        [760, "$760 (COBRA, one person)"],
        [2175, "$2,175 (COBRA, a family)"],
      ],
      {
        term: "cdncover",
        typed: true,
        help: "Your spending comes from your numbers: " + money(c.spend || 0) + " a month.",
      }
    );
  } else
    h += `<div class="row between small"><span>The price comes from the goal ${kitInfo("cdntarget")}</span><button class="ghost slim" data-a="goal" data-v="${g.id}">Open the goal</button></div>`;
  h += A("monthly", "What you save for it each month", $([50, 100, 250, 500, 750, 1000, 1500, 2000]), {
    term: "cdnmonthly",
    typed: true,
  });
  h += A(
    "months",
    "Do you have a date?",
    [
      [0, "No date"],
      [6, "6 months"],
      [12, "1 year"],
      [24, "2 years"],
      [36, "3 years"],
      [60, "5 years"],
    ],
    { term: "cdnneed" }
  );
  h += A(
    "rate",
    "What the money earns while it waits",
    [
      [0, "0% (cash)"],
      [0.02, "2%"],
      [0.04, "4% (high-yield savings)"],
    ],
    { term: "cdnrate", help: "After inflation, cash earns about 0%. That is the careful choice." }
  );
  h += mathBox([
    "Target: " +
      money(K.target) +
      ". Saved for it: " +
      money(K.saved) +
      " (from the goal). Still to save: " +
      money(K.left) +
      ".",
    "Each month: the pot grows at the twelfth root of " +
      kitPct(I.rate.v) +
      " a year, then " +
      money(K.monthly) +
      " goes in. The game counts the months until the pot reaches the target.",
    K.need != null
      ? "To make the date: (target minus the grown pot) divided by the months, or by the growth of the months when the rate is above 0%. Rounded up to a whole dollar."
      : null,
    K.kind === "home"
      ? "Down payment: the amount down, plus closing costs of 3% of the price, plus 2 months of payments. The payment is a 30-year loan, property tax of 1.1% and insurance of 0.5% of the price a year, and mortgage insurance of 0.75% of the loan a year under 20% down (0.55% for FHA)."
      : null,
    K.kind === "quit" ? "Quit fund: (your spending + health cover) × the months you want covered." : null,
    "All amounts are in today's dollars. A date is an estimate, not a promise.",
  ]);
  h += `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="cdn" data-v="">All countdowns</button><button class="ghost" style="flex:1" data-a="goal" data-v="${g.id}">Open the goal</button></div>`;
  return h;
}
/* Part of goalsTab() in ux.js. With one goal or more, adds the button "Countdowns" at the end of the tab. */
function goalsTabCountdown(h) {
  const c = C();
  if (!c || !(c.goals || []).some(g => !g.done)) return h;
  return h.replace(
    /<\/div>\s*$/,
    `<button class="ghost wide cdnbtn" data-a="cdn" data-v="">Countdowns: how long to each goal ›</button></div>`
  );
}
/* Part of goalView() in ui.js. Adds one button with the countdown of this goal. */
function goalViewCountdown(h) {
  try {
    const c = C(),
      g = W && W.kind === "goal" && (c.goals || []).find(x => x.id === W.id);
    if (!g || g.done) return h;
    return (
      h +
      `<button class="rowbtn cdnrow" data-a="cdn" data-v="${g.id}"><span style="min-width:0"><b class="small">Countdown</b><div class="tiny muted">${esc(cdnLine(cdnCalc(c, g)))}</div></span><span class="caret">›</span></button>`
    );
  } catch (e) {
    report(e, "countdown.js: goalViewCountdown");
    return h;
  }
}
kitTerms({
  countdown: [
    "Countdown",
    "How many months until a goal has its money: the target, less what is saved, at the amount you save each month. It is an estimate.",
  ],
  cdnneed: [
    "A date for the goal",
    "With a date, the game works out the monthly amount that reaches the target by then.",
  ],
  cdnkind: [
    "Kind of countdown",
    "Any goal and a wedding count down to the price of the goal. A down payment and a quit fund work out their own target.",
  ],
  cdntarget: ["The target", "The amount the countdown counts to. For a plain goal it is the price of the goal."],
  cdnprice: ["Home price", "The price of the home you have in mind. The target is a share of it, not the full price."],
  cdndown: [
    "Down payment",
    "The part of the price you pay yourself on day one. The rest is the loan. With 20% down there is no mortgage insurance.",
  ],
  cdnapr: ["Mortgage rate", "The yearly interest rate of the home loan. It sets the monthly payment."],
  cdnoff: ["Months covered", "How many months you want to live on this fund with no pay."],
  cdncover: [
    "Health cover",
    "What health insurance costs you each month with no job. COBRA keeps the plan of your job at full price. A marketplace plan is bought on your own.",
  ],
  cdnmonthly: ["Saved each month", "The amount you put toward this goal each month."],
  cdnrate: [
    "What the money earns",
    "The yearly growth of the money while it waits, after inflation. Money for a goal in the next few years belongs in cash.",
  ],
});
kitScreen(
  "cdn",
  "Countdowns",
  "One goal as a countdown: the target, what is saved, and a monthly amount or a date.",
  "It shows the months to go, and the monthly amount that makes a date."
);
Object.assign(ACT, {
  cdn: t => {
    const c = C(),
      v = t && t.dataset ? t.dataset.v : "",
      g = (c.goals || []).find(x => x.id === v);
    W = { kind: "cdn", id: g ? g.id : null, o: {} };
    sheet(cdnSheet);
  },
});
kitMenu("Countdowns", "cdn", "A down payment, a quit fund, a wedding, or any goal: months to go", "sims");
