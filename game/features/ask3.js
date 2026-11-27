/* ============================================================================
   SLAM the Game: features/ask3.js
   PURPOSE     The Ask front door. One row on Home under the top numbers with four big buttons. Each one
               opens one sheet: (1) "Is it safe to spend this?": yes, yes but, or wait until a date, from
               cash minus the bills due before the next payday minus a buffer, and the months of cushion
               left. (2) "How much can I spend?": free to spend today, this week, this month and this
               year, the guilt-free number, and the safe yearly spend near or in retirement. (3) "What
               should I be doing?": the top gap of the plan summary and links to the next 2. (4) "How
               does this change my goals?": each goal so many days closer or later, the hours of work at
               the real hourly wage, the change to the freedom date, and the closest simulator.
   INPUT       The profile: c.payNext, c.payKnown, c.spends, c.goals. The open sheet (W.kind): front.
   OUTPUT      Functions: frontSafeCalc, frontSpendCalc, frontGoalsCalc, homeFrontRow, frontSheet,
               frontBook. Actions (ACT): front, frontamt, frontfor, frontmode. Parts of functions in other
               files: homeFrontRow (home in ui.js).
   DEPENDS ON  core/engine.js (safeSpend, freeToSpend, goalSim, timeLedger), screens/ui.js (freeAt),
               features/csp.js (cspCalc), features/plan.js (summaryGaps), features/sim.js, features/kit.js.
   RULES       The answer is always a trade-off, never a flat no. The permission meter (safeSpend) gives
               the trade-off lines. The light is green or yellow only. The buffer is one week of spending.
               With no payday on file, the next payday is a guess of 14 days.
   ========================================================================= */
const FRONT_AMT = [20, 50, 100, 250, 500, 1000, 2500];
const FRONT_FOR = [
  ["fun", "Fun"],
  ["food", "Food"],
  ["gift", "A gift"],
  ["trip", "A trip"],
  ["home", "Home"],
  ["car", "A car"],
  ["health", "Health"],
  ["other", "Something else"],
];
/* the closest simulator for each kind of spend */
const FRONT_SIM = {
  trip: "spend",
  gift: "spend",
  fun: "spend",
  food: "spend",
  home: "rentbuy",
  car: "car",
  health: "spend",
  other: "spend",
};
const FRONT_BTN = [
  ["safe", "Is it safe to spend this?"],
  ["spend", "How much can I spend?"],
  ["do", "What should I be doing?"],
  ["goals", "How does this change my goals?"],
];
/* (1) IS IT SAFE TO SPEND THIS? yes, yes but, or wait until the next payday. */
function frontSafeCalc(c, amt, today) {
  today = today || todayISO();
  const d = derive(c),
    known = !!(c.payKnown && c.payNext && c.payNext >= today),
    pay = known ? c.payNext : addDays(today, 14),
    days = Math.max(0, daysBetween(today, pay)),
    bills = (spendParts(c).fixed * days) / 30.44,
    buffer = (c.spend || 0) / 4.345,
    room = d.cash - bills - buffer,
    left = room - amt,
    free = (freeToSpend(c, d).free * days) / 30.44,
    sp = Math.max(1, c.spend || 0),
    ans = left < 0 ? "wait" : amt <= Math.max(free, 0) ? "yes" : "yesbut";
  return {
    ans,
    light: ans === "yes" ? "green" : "yellow",
    pay,
    days,
    known,
    cash: d.cash,
    bills,
    buffer,
    room,
    left,
    free,
    months: Math.max(0, (d.cash - amt) / sp),
    st: kitState([kitSharp(c, "cash"), kitSharp(c, "spend"), { cf: known ? 2 : 1 }]),
  };
}
/* (2) HOW MUCH CAN I SPEND? */
function frontSpendCalc(c) {
  const d = derive(c),
    f = freeToSpend(c, d);
  let guilt = null;
  try {
    const S = typeof cspCalc === "function" ? cspCalc(c) : null,
      fun = S && S.B.find(b => b.id === "fun");
    guilt = fun ? fun.amt : null;
  } catch (e) {
    report(e, "ask3.js: frontSpendCalc");
  }
  const near = c.work === "Retired" || (c.age || 0) >= 55 || Math.max(c.age, c.ret) - c.age <= 10,
    swr = typeof pathsAssume === "function" ? pathsAssume(c).swr.v : SWR,
    ss = passives(c).ss * 12;
  return {
    today: f.free / 30.44,
    week: f.week,
    month: f.free,
    year: f.free * 12,
    guilt,
    near,
    swr,
    method: typeof oddsInputs === "function" ? oddsInputs(c).method : "guyton_klinger",
    safe: retireSafeSpend(
      c.inv || 0,
      typeof oddsInputs === "function" ? oddsInputs(c).method : "guyton_klinger",
      c.age
    ),
    ss: c.age >= 67 ? ss : 0,
    st: f.real ? "Close" : "Guess",
  };
}
/* (4) HOW DOES THIS CHANGE MY GOALS? monthly is true for an amount each month. */
function frontGoalsCalc(c, amt, monthly) {
  const d = derive(c),
    opt = monthly ? { monthly: amt } : { once: amt },
    a = goalSim(c).goalAt,
    b = goalSim(c, opt).goalAt,
    wage = timeLedger(c, d).wage,
    f0 = freeAt(c),
    f1 = freeAt(c, opt);
  const goals = (c.goals || [])
    .filter(g => !g.done && g.era != null)
    .map(g => ({
      id: g.id,
      n: g.n,
      k: g.k,
      was: a[g.id],
      now: b[g.id],
      days: a[g.id] != null && b[g.id] != null ? kitDays(b[g.id] - a[g.id]) : null,
    }));
  return {
    goals,
    hours: wage > 0 ? amt / wage : null,
    wage,
    fiDays: f0 != null && f1 != null ? kitDays(f1 - f0) : null,
    fi0: f0,
    fi1: f1,
    st: kitState([kitSharp(c, "take"), kitSharp(c, "spend")]),
  };
}
/* Part of home() in ui.js. One row under the top numbers: the four questions. */
function homeFrontRow(h) {
  try {
    const c = C();
    if (!c || !(c.placed || G.demo) || typeof homeRowAdd !== "function") return h;
    /* ui.js: hidden by default since the Quest Log; Rearrange Home can show it again */
    if (typeof dashOff === "function" && dashOff("ask")) return h;
    return homeRowAdd(
      h,
      `<div class="homerow frontrow"><div class="eyebrow" style="margin-bottom:6px">Ask</div><div class="grid2 frontgrid">${FRONT_BTN.map(b => `<button class="frontbtn" data-a="front" data-v="${b[0]}">${esc(b[1])}</button>`).join("")}</div></div>`
    );
  } catch (e) {
    report(e, "ask3.js: homeFrontRow");
    return h;
  }
}
function frontAmtChips(o) {
  return `<div class="chips">${FRONT_AMT.map(v => `<button class="chip ${o.amt === v && W.pad !== "amt" ? "on" : ""}" data-a="frontamt" data-v="${v}">${money(v)}</button>`).join("")}<button class="chip ${W.pad === "amt" ? "on" : ""}" data-a="padopen" data-k="amt">Type an amount</button></div>${W.pad === "amt" ? `<div class="val">${money(o.amt || 0)}</div>` + keypad("amt") + `<button class="ghost slim" data-a="padclose">Done typing</button>` : ""}`;
}
function frontForChips(o) {
  return `<div class="chips">${FRONT_FOR.map(x => `<button class="chip ${o.for === x[0] ? "on" : ""}" data-a="frontfor" data-v="${x[0]}">${esc(x[1])}</button>`).join("")}</div>`;
}
function frontSafeBody(c) {
  const o = W.o;
  let h = qBase("How much?", frontAmtChips(o)) + qBase("What is it for?", frontForChips(o));
  if (!(o.amt > 0))
    return (
      h + `<div class="small muted">Tap an amount. The answer is never just no. It shows what the spend moves.</div>`
    );
  const S = frontSafeCalc(c, o.amt),
    M = safeSpend(c, derive(c), o.amt, false, todayISO()),
    when = nice(S.pay),
    head1 = S.ans === "yes" ? "Yes" : S.ans === "yesbut" ? "Yes, but it comes from your cushion" : "Wait until " + when;
  h += `<div class="verdict ${S.light} pop"><div class="row"><span class="lamp ${S.light}"></span><b class="tiny">${S.ans === "wait" ? "Wait a little" : S.ans === "yes" ? "Go" : "Go, with a trade"}</b>${kitPill(S.st)}</div><h2 style="margin:6px 0">${esc(head1)}</h2><div class="small">After it, you have about <b>${Math.round(S.months * 10) / 10} months</b> of cushion.</div>${S.ans === "wait" ? `<div class="small">By ${when} your pay is in, and the bills before it are covered.</div>` : S.ans === "yesbut" ? `<div class="small">It is more than your free to spend before ${when} (${money(Math.round(S.free))}).</div>` : ""}${(
    M.lines || []
  )
    .slice(0, 2)
    .map(l => `<div class="small" style="margin-top:4px">${esc(l)}</div>`)
    .join("")}</div>`;
  h += mathBox([
    "Cash you can reach: " + money(Math.round(S.cash)) + ".",
    "Bills before your next payday (" +
      when +
      (S.known ? "" : ", a guess of 14 days") +
      "): " +
      money(Math.round(S.bills)) +
      ".",
    "Buffer: one week of spending, " + money(Math.round(S.buffer)) + ".",
    "Room: " +
      money(Math.round(S.cash)) +
      " − " +
      money(Math.round(S.bills)) +
      " − " +
      money(Math.round(S.buffer)) +
      " = " +
      money(Math.round(S.room)) +
      ".",
    "Months of cushion after: (cash − the spend) ÷ spending a month.",
  ]);
  if (FRONT_SIM[o.for] && typeof SIMS !== "undefined" && SIMS[FRONT_SIM[o.for]])
    h += `<button class="ghost wide slim" data-a="simopen" data-v="${FRONT_SIM[o.for]}">${esc(SIMS[FRONT_SIM[o.for]].n)}: run the simulator</button>`;
  return h;
}
function frontSpendBody(c) {
  const S = frontSpendCalc(c),
    st = S.st;
  return (
    `<div class="grid2">${kitTile("Today", money(Math.round(S.today)), "", st, "free")}${kitTile("This week", money(Math.round(S.week)), "", st)}${kitTile("This month", money(Math.round(S.month)), "", st)}${kitTile("This year", money(Math.round(S.year)), "", st)}</div>` +
    (S.guilt != null
      ? `<div class="tile small">Your guilt-free number in the Conscious Spending Plan: <b>${money(Math.round(S.guilt))} a month</b>. ${kitPill(st)} ${kitInfo("guiltfree")}</div>`
      : "") +
    (S.near
      ? `<div class="tile small">Near or in retirement, a safe yearly spend from your investments is about <b>${money(Math.round(S.safe.year + S.ss))} a year</b>: ${esc((RETIRE_METHODS.find(m => m[0] === S.method) || RETIRE_METHODS[0])[1].toLowerCase())} starts at ${kitPct(S.safe.rate)} of ${money(c.inv || 0)}${S.ss ? ", plus Social Security" : ""}, the way your retirement odds take money out.</div>`
      : "") +
    mathBox([
      "Free to spend: what comes in, minus bills, minus what goes to your goals, " +
        money(Math.round(S.month)) +
        " a month.",
      "Today: ÷ 30.44. A week: × 12 ÷ 52. A year: × 12.",
      S.guilt != null ? "The guilt-free number is the fun part of the Conscious Spending Plan (Ramit Sethi)." : null,
      S.near
        ? "Safe yearly spend: the first year of your way to take money out (Retirement odds), from the method code of the retirement engine. " +
          RETIRE_CREDIT +
          "."
        : null,
    ]) +
    `<button class="ghost wide slim" data-a="csp">Open the Conscious Spending Plan</button>`
  );
}
function frontDoBody(c) {
  let G2 = [];
  try {
    G2 = summaryGaps(c);
  } catch (e) {
    report(e, "ask3.js: frontDoBody");
  }
  if (!G2.length)
    return `<div class="tile small">The game sees no gap right now. Your next step on Home is the one thing to do.</div><button class="primary wide" data-a="summary">See my plan on one page</button>`;
  const g = G2[0];
  return (
    `<div class="card next stack" style="gap:6px"><div class="eyebrow">${esc(g.area)}</div><h2 class="glow">${esc(g.n)}</h2><div class="small">${esc(g.impact)}. ${esc(g.why)}</div><button class="primary" data-a="${g.go[1]}" data-v="${esc(g.go[2])}">${esc(g.go[0])}</button></div>` +
    (G2.length > 1
      ? `<div class="tiny muted">Then:</div>` +
        G2.slice(1, 3)
          .map(
            x =>
              `<button class="rowbtn" data-a="${x.go[1]}" data-v="${esc(x.go[2])}"><span><b>${esc(x.n)}</b><div class="tiny muted">${esc(x.impact)}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`
          )
          .join("")
      : "") +
    `<button class="ghost wide slim" data-a="summary">See my plan on one page</button>`
  );
}
function frontGoalsBody(c) {
  const o = W.o,
    mode = o.mode || "once";
  let h =
    qBase("How much?", frontAmtChips(o)) +
    `<div class="seg" style="align-self:flex-start"><button class="${mode === "once" ? "on" : ""}" data-a="frontmode" data-v="once">One time</button><button class="${mode === "month" ? "on" : ""}" data-a="frontmode" data-v="month">Every month</button></div>` +
    qBase("What is it for?", frontForChips(o));
  if (!(o.amt > 0)) return h + `<div class="small muted">Tap an amount to see each goal move.</div>`;
  const S = frontGoalsCalc(c, o.amt, mode === "month");
  h += `<div class="tile stack" style="gap:4px"><div class="row between"><span class="tiny muted">${money(o.amt)}${mode === "month" ? " a month" : ""}</span>${kitPill(S.st)}</div>${igRows(
    [
      ["Freedom date", S.fiDays == null ? "No date yet" : kitDayWords(S.fiDays)],
      S.hours != null
        ? [
            "Hours of work at your real hourly wage",
            Math.round(S.hours * 10) / 10 + (mode === "month" ? " a month" : ""),
          ]
        : null,
    ].concat(
      S.goals.map(g => [
        esc(g.n),
        g.days == null ? (g.now == null ? "Off the calendar" : "No date before") : kitDayWords(g.days),
      ])
    )
  )}</div>`;
  h += mathBox([
    "Each date comes from the game's own month-by-month plan (goalSim), run once as it is and once with this " +
      (mode === "month" ? "monthly spend" : "spend") +
      ".",
    S.hours != null ? "Hours of work: " + money(o.amt) + " ÷ your real hourly wage of " + cents(S.wage) + "." : null,
  ]);
  const sid = FRONT_SIM[o.for] || "spend";
  if (typeof SIMS !== "undefined" && SIMS[sid])
    h += `<button class="ghost wide slim" data-a="simopen" data-v="${sid}">${esc(SIMS[sid].n)}: run the simulator</button>`;
  return h;
}
function frontSheet() {
  const c = C(),
    v = W.v,
    t = FRONT_BTN.find(b => b[0] === v) || FRONT_BTN[0];
  const body =
    v === "spend"
      ? frontSpendBody(c)
      : v === "do"
        ? frontDoBody(c)
        : v === "goals"
          ? frontGoalsBody(c)
          : frontSafeBody(c);
  return head("Ask", esc(t[1])) + body;
}
function frontBook(c) {
  const S = frontSpendCalc(c);
  return {
    title: "Ask",
    rows: [
      { id: "fr_month", label: "Free to spend a month", v: S.month, note: "From the game: in minus bills minus goals" },
      { id: "fr_today", label: "Free to spend today", v: S.today, f: "={fr_month}/30.44" },
      { id: "fr_year", label: "Free to spend a year", v: S.year, f: "={fr_month}*12" },
      { id: "fr_swr", label: "Starting rate of your way to take money out", v: S.safe.rate },
      { id: "fr_inv", label: "Invested", v: c.inv || 0 },
      {
        id: "fr_safe",
        label: "Safe yearly spend from investments, the first year",
        v: S.safe.year,
        f: "={fr_inv}*{fr_swr}",
      },
    ],
  };
}
kitTerms({
  guiltfree: [
    "Guilt-free spending",
    "The money in your plan that is for fun, with no guilt, because the bills and the saving are already done. The idea is Ramit Sethi's.",
  ],
});
kitScreen(
  "front",
  "Ask",
  "Four plain questions about your money.",
  "Each answer is a trade-off on your own numbers, never a flat no."
);
Object.assign(ACT, {
  front: t => {
    W = { kind: "front", v: t.dataset.v || "safe", o: { amt: 0, for: "fun", mode: "once" } };
    sheet(frontSheet);
  },
  frontamt: t => {
    if (!W || W.kind !== "front") return;
    W.o.amt = +t.dataset.v;
    W.pad = null;
    drawSheet();
  },
  frontfor: t => {
    if (!W || W.kind !== "front") return;
    W.o.for = t.dataset.v;
    drawSheet();
  },
  frontmode: t => {
    if (!W || W.kind !== "front") return;
    W.o.mode = t.dataset.v;
    drawSheet();
  },
});
