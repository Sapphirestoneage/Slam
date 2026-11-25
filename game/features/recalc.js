/* ============================================================================
   SLAM the Game: features/recalc.js
   PURPOSE     Recalculating. When the real numbers move a date of the plan, one calm card shows the old
               date, the new date and the one next turn. With it: the order to pay in when the bills
               are more than the pay, the refill of the cushion after it was used, a safe-to-fail line
               for fun, the letter from the calm self in a hard month, and "Done for this month".
   INPUT       The profile: c.x.rc = { base, safe }. base = { at, df, fi, cash } is the plan as it was
               last kept: the months to debt-free and to financial independence on that day, and the
               cash. The open sheet (W.kind): rc. The taps of the player (the actions in OUTPUT).
   OUTPUT      Functions: rcgStore, rcgNow, rcgBase, rcgBills, rcgCalc, rcgCard, rcgRow, rcgScripts,
               rcSheet, rcBook.
               Parts of functions in other files: homeRcRow (home in ui.js), moneyTabRcRow (moneyTab in
               ui.js), dbSheetRc (dbSheet in debts.js). Actions (ACT): rc, rckeep, rcwin, rchold,
               rcspent, rcsafeoff. Menu: "Recalculating: month check".
   DEPENDS ON  core/report.js, core/engine.js, core/recalc.js (the math, a copy of js/math/recalc.js of
               the main app), screens/ui.js, features/kit.js, features/debts.js (dbPlan, dbLive, dbPay),
               features/reveal.js (homeRowAdd), features/exletter.js, core/soon.js (soonPart).
   RULES       The words never blame the player. The game does not say that the player did something
               wrong, or that the player is late. It says "Recalculating", and it shows the new date.
               The new date starts from the numbers of today, not from where the old plan said the
               player would be. No red. The card is sapphire. This file does not calculate: core/recalc.js
               does, on numbers from derive() and dbPlan().
   ========================================================================= */
const RCG_CLS = {
  Home: "housing",
  "Bills and subscriptions": "utilities",
  Food: "food",
  "Getting around": "transport",
  "Fun and everything else": "rest",
};
const RCG_CAPS = [25, 50, 100, 150, 200, 300];
function rcgStore(c) {
  c.x = c.x || {};
  c.x.rc = c.x.rc || {};
  return c.x.rc;
}
/* The numbers of today: months to debt-free (the debt plan of the player), months to FI, and cash. */
function rcgNow(c, d) {
  const P = (c.x && c.x.dplan) || {},
    L = typeof dbLive === "function" ? dbLive(c) : [],
    order = P.order || "avalanche",
    extra = P.extra || 0,
    plan = L.length ? dbPlan(c, order, extra) : null;
  return {
    df: plan ? plan.months : null,
    open: L.length > 0,
    fi: d.yrs === null || d.yrs === undefined ? null : Math.round(d.yrs * 12),
    cash: d.cash,
    order,
    extra,
  };
}
/* The kept plan. The first time, the numbers of today become the kept plan. */
function rcgBase(c, d) {
  const S = rcgStore(c);
  if (!S.base) {
    const n = rcgNow(c, d);
    S.base = { at: todayISO(), df: n.df, fi: n.fi, cash: n.cash };
  }
  return S.base;
}
/* The bills of one month for the triage. The five parts of the spending, and the debt payments. The debt payments
   are inside "Fun and everything else" in the profile, thus this function takes them out of that part.
   Health insurance and medicine, and childcare that lets the player keep working, are in the must-pay tier (the
   owner, 2026-11-25). The profile has no part for them. The player gives the two amounts by taps (c.x.rct). The
   function takes health out of "Bills and subscriptions" and childcare out of "Fun and everything else". */
function rcgBills(c) {
  const sp = (c.spends || []).filter(x => x.amt > 0);
  if (!sp.length) return [{ name: "Everything you spend", cls: "rest", amount: c.spend }];
  const pay = typeof dbLive === "function" ? dbLive(c).reduce((t, o) => t + dbPay(o.x).v, 0) : 0,
    fun = sp.find(x => x.k === "Fun and everything else"),
    carve = fun ? Math.min(pay, fun.amt) : 0,
    bills = sp.find(x => x.k === "Bills and subscriptions"),
    hv = kitValue(c, "rct", "health", 0),
    cv = kitValue(c, "rct", "care", 0),
    health = bills && hv.given ? Math.min(hv.v, bills.amt) : 0,
    care = fun && cv.given ? Math.min(cv.v, fun.amt - carve) : 0,
    rows = sp.map(x => ({
      name: x.k,
      cls: RCG_CLS[x.k] || "rest",
      amount: x === fun ? x.amt - carve - care : x === bills ? x.amt - health : x.amt,
    }));
  if (carve > 0) rows.push({ name: "Debt payments", cls: "minimums", amount: carve });
  if (health > 0) rows.push({ name: "Health insurance and medicine", cls: "health", amount: health });
  if (care > 0) rows.push({ name: "Childcare", cls: "childcare", amount: care });
  return rows.filter(r => r.amount > 0);
}
/* All of Recalculating for one profile: the routes, the words, the triage, the refill, the safe line, the month. */
function rcgCalc(c, d) {
  const S = rcgStore(c),
    base = rcgBase(c, d),
    n = rcgNow(c, d),
    t = todayISO(),
    debt = rcRoute({ planAt: base.at, planMonths: base.df, nowAt: t, months: n.df, open: n.open }),
    fi = rcRoute({ planAt: base.at, planMonths: base.fi, nowAt: t, months: n.fi, open: true }),
    T = rcTriage({ income: c.take, bills: rcgBills(c) }),
    triage = T && T.short > 0.5 ? T : null;
  let hold = null;
  if (!triage && debt && debt.moved && debt.later && !debt.noDate)
    hold = rcHoldExtra(x => dbPlan(c, n.order, n.extra + x).months, rcMonthsBetween(rcYm(t), debt.oldYm));
  const left = c.take - c.spend,
    R0 =
      base.cash != null && base.cash - n.cash > 1
        ? rcRefill({ target: base.cash, balance: n.cash, monthly: left > 0 ? left : null, nowAt: t })
        : null,
    refill = R0 && !R0.full ? R0 : null,
    ns = typeof nextStep === "function" ? nextStep(c, d) : null,
    turn = triage
      ? "Start with the order below: home first. The dates settle when the month is covered."
      : hold !== null
        ? null
        : ns && ns.t
          ? ns.t + "."
          : null,
    cards = [];
  if (debt && debt.moved)
    cards.push({ id: "debt", route: debt, words: rcWords(debt, { what: "Debt free", hold, turn }) });
  if (fi && fi.moved) cards.push({ id: "fi", route: fi, words: rcWords(fi, { what: "Work optional", turn }) });
  const cap = kitValue(c, "rcs", "cap", 0),
    ym = t.slice(0, 7),
    spent = S.safe && S.safe.ym === ym ? S.safe.spent : null,
    safe = cap.given ? rcSafeLine({ cap: cap.v, spent }) : null,
    state = rcMonthState({ routes: [debt, fi], triage, refill, open: 0 });
  return { base, now: n, debt, fi, hold, cards, triage, refill, safe, state, step: ns, letter: exLetterGet(c) };
}
/* The one calm card, as HTML. full is true on the sheet (with the buttons) and false in a row. */
function rcgCard(X) {
  if (!X.cards.length) return "";
  const lead = X.cards.find(k => !k.words.win) || X.cards[0],
    wins = X.cards.every(k => k.words.win);
  return (
    `<div class="tile stack rccard${wins ? " rcwin" : ""}" style="gap:8px;border-left:4px solid var(--sapphire, #4a78d6)"><div class="eyebrow">${wins ? "New route" : "Recalculating"}</div>${wins ? `<h2 class="glow" style="margin:0">${esc(X.cards[0].words.head.replace(/^New route: /, ""))}</h2>` : ""}` +
    X.cards
      .map(
        k =>
          `<div class="row between" style="gap:8px"><div><div class="tiny muted">${k.id === "debt" ? "Debt free was" : "Work optional was"}</div><div class="muted"><b>${esc(k.words.was)}</b></div></div><div class="muted" aria-hidden="true">→</div><div style="text-align:right"><div class="tiny muted">Now</div><div class="big">${esc(k.words.is || "No date yet")}</div></div></div><div class="small">${esc(k.words.line)}</div>`
      )
      .join("") +
    `<div class="small"><span class="tiny muted">Your next turn</span><br><b>${esc(lead.words.next)}</b></div>` +
    (wins ? `<button class="primary wide" data-a="rcwin">Celebrate it, and keep the new date</button>` : "") +
    (X.hold !== null
      ? `<button class="primary wide" data-a="rchold" data-v="${X.hold}">Add ${money(X.hold)} a month to my debt plan</button>`
      : !X.triage && X.step && X.step.a
        ? `<button class="primary wide" data-a="${X.step.a}" data-v="${X.step.v == null ? "" : esc(String(X.step.v))}">${esc(X.step.l || "Go")}</button>`
        : "") +
    (wins ? "" : `<button class="ghost wide slim" data-a="rckeep">Keep the new date as my plan</button>`) +
    `</div>`
  );
}
/* One slim row for Home, the Money tab and the debt plan. It shows only when something moved or the month is short. */
function rcgRow(c, d) {
  const X = rcgCalc(c, d);
  if (!X.cards.length && !X.triage && !X.refill) return "";
  const k = X.cards[0],
    say = k
      ? (k.id === "debt" ? "Debt free" : "Work optional") +
        " is now " +
        (k.words.is || "open") +
        " (was " +
        k.words.was +
        ")"
      : X.triage
        ? "This month is " + money(X.triage.short) + " short. See the order to pay in"
        : "Cushion refill: " + money(X.refill.gap) + " to put back";
  return `<button class="rowbtn bare homerow rcrow" data-a="rc"><span class="small"><b>${k && k.words.win ? esc(k.words.head) : "Recalculating"}</b> · ${esc(say)}</span><span class="caret">›</span></button>`;
}
/* Part of home() in ui.js. One calm row under the top numbers. */
function homeRcRow(h) {
  try {
    const c = C();
    if (!c || !(c.placed || G.demo) || typeof homeRowAdd !== "function") return h;
    const row = rcgRow(c, D || derive(c));
    return row ? homeRowAdd(h, row) : h;
  } catch (e) {
    report(e, "recalc.js: homeRcRow");
    return h;
  }
}
/* Part of moneyTab() in ui.js. The same row, at the top of the Money tab (the budget and the debts). */
function moneyTabRcRow(h) {
  try {
    const c = C();
    if (!c || !(c.placed || G.demo)) return h;
    const row = rcgRow(c, D || derive(c));
    if (!row) return h;
    return /<\/h1>/.test(h) ? h.replace(/<\/h1>/, m => m + row) : row + h;
  } catch (e) {
    report(e, "recalc.js: moneyTabRcRow");
    return h;
  }
}
/* Part of dbSheet() in debts.js. The same row, at the top of the debt plan. */
function dbSheetRc(h) {
  try {
    const c = C(),
      row = rcgRow(c, D || derive(c));
    if (!row) return h;
    return /<\/h2>/.test(h) ? h.replace(/<\/h2>/, m => m + row) : h + row;
  } catch (e) {
    report(e, "recalc.js: dbSheetRc");
    return h;
  }
}
function rcBook(c) {
  const d = derive(c),
    X = rcgCalc(c, d),
    rows = [
      { id: "rc_take", label: "Pay a month", v: c.take },
      { id: "rc_spend", label: "Spending a month", v: c.spend },
      {
        id: "rc_short",
        label: "Short this month",
        v: Math.max(0, c.spend - c.take),
        f: "=MAX(0,{rc_spend}-{rc_take})",
      },
    ];
  if (X.base.cash != null) {
    rows.push({ id: "rc_was", label: "Cash when the plan was kept", v: X.base.cash, note: "Kept " + X.base.at });
    rows.push({ id: "rc_cash", label: "Cash today", v: X.now.cash });
    rows.push({
      id: "rc_gap",
      label: "Cushion to put back",
      v: Math.max(0, X.base.cash - X.now.cash),
      f: "=MAX(0,{rc_was}-{rc_cash})",
    });
  }
  return { title: "Recalculating", rows };
}
/* The phone scripts of the triage. While RC_SCRIPTS_REVIEWED is false (core/recalc.js), rcScriptsFor() returns null
   and the player sees the shared "Coming soon" part (soonPart in core/soon.js). No script text is in the HTML. */
function rcgScripts(T) {
  const L = rcScriptsFor(T);
  if (!L)
    return soonPart(
      "What to say on the phone",
      "Word-for-word scripts for each call are on the way. Until then: call before the due date, say what you can pay, and ask for a payment plan."
    );
  return `<details class="math"><summary>What to say on the phone</summary><div class="inner small stack" style="gap:8px">${L.map(g => `<div><b>${esc(g.label)}: ${esc(g.script.who)}</b>${g.script.say.map(l => `<div>"${esc(l)}"</div>`).join("")}<div class="tiny muted">${esc(g.script.note)}</div></div>`).join("")}</div></details>`;
}
function rcSheet() {
  const c = C(),
    d = D || derive(c),
    X = rcgCalc(c, d),
    T = X.triage,
    F = X.refill,
    S = X.safe,
    mine = exLetterMine();
  let h =
    head("Plan", "Recalculating: month check") +
    `<div class="small muted">The plan starts again from where you are today. Nothing here is a grade.</div>`;
  h += rcgCard(X);
  if (T)
    h +=
      `<div class="tile stack rctriage" style="gap:6px"><div class="eyebrow">When it won't all get paid</div><div class="small"><b>${money(T.income)} comes in and ${money(T.total)} goes out: ${money(T.short)} more than the month has.</b></div><div class="tiny muted">Pay in this order. A roof, the lights, food, health cover and medicine, and childcare if it lets you keep working come first. Then the way to work, then lenders.</div>` +
      T.groups
        .map(
          (g, i) =>
            `<div class="row between small" style="gap:8px"><span>${i + 1}. <b>${esc(g.label)}</b> <span class="muted">${money(g.amount)}</span></span><span>${g.unpaid > 0.5 ? (g.paid > 0.5 ? money(g.paid) + " now, " : "") + money(g.unpaid) + " to arrange" : "paid in full"}</span></div>`
        )
        .join("") +
      rcgScripts(T) +
      `<details class="math rctcare"><summary>Health cover, medicine and childcare</summary><div class="inner stack" style="gap:8px"><div class="small muted">These are paid right after home, bills and food. Give the amounts and they move up the order.</div>` +
      kitAsk(
        c,
        "rct",
        "health",
        "Health insurance and medicine a month",
        [0, 100, 200, 400, 600, 900].map(v => [v, money(v)]),
        0,
        { typed: true, help: "It comes out of Bills and subscriptions." }
      ) +
      kitAsk(
        c,
        "rct",
        "care",
        "Childcare a month, if it lets you keep working",
        [0, 200, 500, 800, 1200, 1800].map(v => [v, money(v)]),
        0,
        { typed: true, help: "It comes out of Fun and everything else." }
      ) +
      `</div></details></div>`;
  if (F)
    h += `<div class="tile stack rcrefill" style="gap:6px"><div class="eyebrow">Cushion refill</div><div class="small"><b>${F.months !== null ? "Whole again by " + rcMonthName(F.ym) : money(F.gap) + " to put back"}</b></div><div class="small">Your cash was ${money(F.target)} and is ${money(F.balance)} today. It was used. That is what it is for.${F.months !== null ? " At " + money(F.monthly) + " left over a month: " + F.months + (F.months === 1 ? " month." : " months.") : " Nothing is left over to put back yet. The date shows when something is."}</div><button class="ghost wide slim" data-a="rckeep">It is back, or this is my plan now</button></div>`;
  if (X.state.hard && X.letter && mine)
    h += `<div class="tile stack rcletter" style="gap:6px"><div class="eyebrow">From you, ${esc(X.letter.at)}</div><div class="small"><i>${esc(X.letter.text)}</i></div><button class="ghost slim" data-a="exletter">Change the letter</button></div>`;
  if (X.state.done)
    h += `<div class="tile stack rcdone" style="gap:6px"><div><b>Done for this month.</b></div><div class="small muted">Nothing needs you. Close the game and enjoy the month.</div>${mine ? `<div class="row between" style="gap:8px"><span class="tiny muted">${X.letter ? "Your letter for a harder month is kept." : "While it is calm: a few lines to yourself for a harder month."}</span><button class="ghost slim" data-a="exletter">${X.letter ? "Read the letter" : "Write the letter"}</button></div>` : ""}</div>`;
  h +=
    `<details class="math rcsafe"${S ? " open" : ""}><summary>Safe-to-fail line${S ? ": " + (S.ranOut ? "used up, and the plan is the same" : money(S.left) + " left of " + money(S.cap)) : ""}</summary><div class="inner stack" style="gap:8px"><div class="small muted">One line for fun or an experiment. It can run out with no effect on the plan: it is part of "Fun and everything else", and the plan counts it used or not.</div>` +
    kitAsk(
      c,
      "rcs",
      "cap",
      "How much a month is yours to play with?",
      RCG_CAPS.map(v => [v, money(v)]),
      0,
      { typed: true, help: "A try that does not work costs this and no more." }
    ) +
    (S
      ? `<div class="small">${S.over > 0.5 ? money(S.cap) + " is used up, and " + money(S.over) + " went past it. The part past it is ordinary spending." : S.ranOut ? money(S.cap) + " is used up for this month. Nothing in the plan moves. It fills again next month." : money(S.left) + " left of " + money(S.cap) + " this month. Use it or not: the plan is the same."}</div><div class="row wrap" style="gap:6px"><span class="tiny muted">I used</span>${[5, 10, 20, 50].map(v => `<button class="chip" data-a="rcspent" data-v="${v}">+${money(v)}</button>`).join("")}<button class="ghost slim" data-a="rcspent" data-v="0">Start the month again</button></div><button class="ghost slim" data-a="rcsafeoff">Remove this line</button>`
      : "") +
    `</div></details>`;
  h += mathBox([
    "The old date is the date the plan gave on " + X.base.at + ", the day it was last kept.",
    "The new date starts from the balances, payments and spending of today.",
    X.now.df !== null ? "Debt free: " + X.now.df + " months from today, by your debt plan." : null,
    X.now.fi !== null
      ? "Work optional: " + X.now.fi + " months from today, by the same math as the top of Home."
      : null,
    X.hold !== null
      ? money(X.hold) +
        " is the smallest extra amount a month, in steps of $25, that makes the debt plan end on the old date."
      : null,
    T
      ? "The order: home, utilities and bills, food, health insurance and medicine, childcare if it lets you keep working, getting around, debt payments, then the rest. Each gets what is left."
      : null,
    T && (c.spends || []).length
      ? "Your debt payments are counted inside Fun and everything else, so they are taken out of it and paid before the rest."
      : null,
    F ? "Refill: the cash when the plan was kept, minus the cash today, divided by what is left over a month." : null,
  ]);
  return h;
}
kitScreen(
  "rc",
  "Recalculating: month check",
  "When your real numbers move a date, this shows the old date, the new date and your next turn.",
  "Also: the order to pay in when a month is short, the cushion refill, and a line for fun that can run out."
);
kitMenu("Recalculating: month check", "rc", "The new date from where you are today, and the one next turn", "safe");
Object.assign(ACT, {
  rc: () => {
    W = { kind: "rc", o: {} };
    sheet(rcSheet);
  },
  /* The numbers of today become the kept plan. The card goes away. */
  rckeep: () => {
    const c = C(),
      n = rcgNow(c, derive(c));
    rcgStore(c).base = { at: todayISO(), df: n.df, fi: n.fi, cash: n.cash };
    save();
    if (W && W.kind === "rc") drawSheet();
    else render();
  },
  /* A date moved sooner. This is a win: the game celebrates it (celebrate() in ui.js, the same screen as each other
     win), and the new date becomes the kept plan. */
  rcwin: () => {
    const c = C(),
      d = derive(c),
      X = rcgCalc(c, d),
      w = X.cards.filter(k => k.words.win);
    if (!w.length) return;
    const n = rcgNow(c, d);
    rcgStore(c).base = { at: todayISO(), df: n.df, fi: n.fi, cash: n.cash };
    save();
    celebrate(
      w[0].words.head,
      w.map(k => (k.id === "debt" ? "Debt free" : "Work optional") + ": " + k.words.is + " (was " + k.words.was + ")"),
      "From where you are today. This date is your plan now."
    );
  },
  /* Add the extra amount to the debt plan. The old date comes back. */
  rchold: t => {
    const c = C(),
      P = (c.x && c.x.dplan) || {};
    c.x = c.x || {};
    c.x.dplan = { order: P.order || "avalanche", extra: (P.extra || 0) + (+t.dataset.v || 0), d: todayISO() };
    save();
    if (W && W.kind === "rc") drawSheet();
    else render();
  },
  rcspent: t => {
    const c = C(),
      S = rcgStore(c),
      ym = todayISO().slice(0, 7),
      v = +t.dataset.v || 0,
      was = S.safe && S.safe.ym === ym ? S.safe.spent || 0 : 0;
    S.safe = { ym, spent: v === 0 ? null : was + v };
    save();
    drawSheet();
  },
  rcsafeoff: () => {
    const c = C();
    if (c.x && c.x.rcs) delete c.x.rcs.cap;
    rcgStore(c).safe = null;
    save();
    drawSheet();
  },
});
