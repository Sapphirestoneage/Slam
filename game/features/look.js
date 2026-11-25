/* ============================================================================
   SLAM the Game: features/look.js
   PURPOSE     The showcase screens of the dashboard look (DESIGN.md, "Reference: Tally"), built from the
               kit in screens/dash.js: the stat row of Home; the stat row, the order and the Time-Money
               dial of the Debt plan; the dashboard of My Money (net worth over time, the mix, where it
               goes, in and out by month) and the sort of its lists; the goal cards of My Goals and the
               dial of one goal; the pay period of Next Steps (a day strip, the bills left, the money
               coming in).
   INPUT       The profile c and the derived numbers d. The calendar (calOf, games2.js). The open sheet.
   OUTPUT      Math: lkHome, lkMoney, lkPeriod, lkGoal, lkOrder. Parts of functions in other files:
               homeStatRow (Home, ux.js), dbSheetLook (dbSheet, debts.js), moneyTabLook (moneyTab, ui.js),
               ledOrder and ledSortChips (moneyTabBase, ui.js), goalCardLook (goalsCard, ui.js),
               goalViewLook (goalView, ui.js), planTabPeriod (planTab, planner.js).
               Actions (ACT): ledsort. A listener for the end of a drag on a dial (change).
   DEPENDS ON  screens/dash.js, screens/ui.js, core/engine.js (freeToSpend, derive), features/debts.js,
               features/games2.js (calOf).
   RULES       The math functions (lk...) return numbers; the parts only show them. No red.
   ========================================================================= */

/* ---------- math ---------- */
/* The four numbers of the Home stat row. */
function lkHome(c, d) {
  const f = freeToSpend(c, d),
    plan = c.led && typeof dbPlan === "function" ? dbPlan(c, "avalanche", 0) : null,
    hi = plan ? plan.debts.filter(x => x.apr >= 0.08 && x.bal > 0) : [],
    gs = (c.goals || []).filter(g => !g.done);
  let goal = null;
  if (gs.length && typeof goalSim === "function") {
    const sim = goalSim(c),
      all = goalSim(c, { all: true });
    gs.forEach(g => {
      const gi = goalInfo(c, d, g, sim, all);
      if (gi.fit && (goal === null || gi.at < goal.at)) goal = { n: g.n, at: gi.at, real: gi.real };
    });
  }
  return {
    free: { v: Math.max(0, f.free), real: !!f.real },
    nw: { v: d.nw, real: sharpPct(c) >= 100 },
    goal,
    hi: !c.led
      ? { none: c.high !== "yes", months: null, guess: true }
      : !hi.length
        ? { none: true }
        : {
            none: false,
            months: hi.some(x => x.off == null) ? null : Math.max(...hi.map(x => x.off)),
            guess: dbStatus(c) === "Guess",
          },
  };
}
/* The dashboard of My Money. */
function lkMoney(c, d, today) {
  today = today || todayISO();
  const hist = (c.hist || []).filter(h => h && typeof h.nw === "number").slice(-12),
    mix = (c.cashes || [])
      .filter(x => !x.hold && x.amt > 0)
      .map(x => ({ l: lkName(x, "cashes"), v: x.amt }))
      .concat((c.invs || []).filter(x => x.amt > 0).map(x => ({ l: lkName(x, "invs"), v: x.amt })))
      .sort((a, b) => b.v - a.v),
    where = (c.spends || [])
      .filter(x => x.amt > 0)
      .map(x => ({ l: lkName(x, "spends"), v: x.amt }))
      .sort((a, b) => b.v - a.v),
    months = [];
  const t = parseISO(today);
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(t.getFullYear(), t.getMonth() - i, 1),
      ym = iso(dt).slice(0, 7),
      f = typeof monthFlow === "function" ? monthFlow(c, ym) : { inn: 0, out: 0, n: 0 };
    months.push({ l: DK_MON[dt.getMonth()], ym, inn: f.inn, out: f.out + (f.debt || 0), n: f.n });
  }
  return {
    nw: d.nw,
    cash: rsum((c.cashes || []).filter(x => !x.hold)),
    inv: c.inv || 0,
    debt: c.debt || 0,
    real: sharpPct(c) >= 100,
    hist: hist.map(h => h.nw).concat(hist.length ? [d.nw] : []),
    histFrom: hist.length ? hist[0].d : null,
    mix: lkTop(mix, 5),
    where: lkTop(where, 5),
    logged: months.some(m => m.n > 0) ? months : null,
    take: c.take || 0,
    spend: c.spend || 0,
  };
}
/* The biggest parts, and the rest as "Everything else". */
function lkTop(parts, n) {
  if (parts.length <= n) return parts;
  const rest = parts.slice(n - 1).reduce((t, p) => t + p.v, 0);
  return parts.slice(0, n - 1).concat([{ l: "Everything else", v: rest }]);
}
function lkName(x, sec) {
  return typeof rowName === "function" ? rowName(x, sec) : x.k;
}
/* The pay period: the next 14 days, the bills before the next payday, the money coming in. */
function lkPeriod(c, d, today) {
  today = today || todayISO();
  const k = typeof calOf === "function" ? calOf(c) : { pay: [], rent: [], bills: [], debt: [], s: false, src: [] },
    t = parseISO(today),
    row = n => ((c.spends || []).find(r => r.k === n) || { amt: 0 }).amt,
    mins = (c.debts || []).reduce((a, x) => a + (x.amt > 0 ? (typeof dbPay === "function" ? dbPay(x).v : 0) : 0), 0),
    days = [],
    bills = [],
    income = [];
  let next = null;
  for (let i = 0; i < 31; i++) {
    const dt = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i),
      dm = dt.getDate(),
      lab = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()] + " " + dm,
      when = DK_MON[dt.getMonth()] + " " + dm,
      pay = k.pay.includes(dm) || (c.payNext && iso(dt) === c.payNext);
    if (pay && i > 0 && next === null) next = i;
    const due = [];
    if (k.rent.includes(dm)) due.push({ n: "Rent", amt: row("Home") / Math.max(1, k.rent.length) });
    if (k.bills.includes(dm))
      due.push({ n: "Bills", amt: row("Bills and subscriptions") / Math.max(1, k.bills.length) });
    if (k.debt.includes(dm)) due.push({ n: "Debt payments", amt: mins / Math.max(1, k.debt.length) });
    if (i < 14) days.push({ d: lab, on: i === 0, mark: pay ? "Payday" : due.length ? "Bill" : "" });
    if (next === null) due.forEach(b => bills.push(Object.assign({ when, in: i }, b)));
    if (pay && i > 0 && income.length < 3) {
      const src = (k.src || []).filter(s => !s.vary && s.days && s.days.includes(dm));
      src.forEach(s => income.push({ n: s.k || s.n || "Pay", when, amt: s.amt / Math.max(1, s.days.length) }));
      /* the next payday the player told the game, when the calendar has no amount for that day */
      if (!src.length) income.push({ n: "Payday", when, amt: null });
    }
  }
  return { days, bills, income, next, known: !!(k.s || k.pay.length || k.rent.length || k.bills.length) };
}
/* One goal for its card and its dial: what is left, the pace a month now, the months, the percent. */
function lkGoal(c, d, g, sim, all) {
  const gi = goalInfo(c, d, g, sim, all),
    need = Math.max(0, (g.cost || 0) - (g.fund || 0)),
    at = gi.fit ? gi.at : null;
  return {
    gi,
    need,
    at,
    pace: at > 0 ? need / at : 0,
    pct: Math.min(100, ((g.fund || 0) / Math.max(1, g.cost || 1)) * 100),
  };
}
/* The order of a money list on the screen. The rows keep their places in the profile. */
function lkOrder(rows, sk, sec) {
  const L = rows.map((x, i) => ({ x, i }));
  if (sk === "big") L.sort((a, b) => (b.x.amt || 0) - (a.x.amt || 0));
  else if (sk === "small") L.sort((a, b) => (a.x.amt || 0) - (b.x.amt || 0));
  else if (sk === "name") L.sort((a, b) => lkName(a.x, sec).localeCompare(lkName(b.x, sec)));
  else if (sk === "rate" && sec === "debts")
    L.sort((a, b) => (typeof dbRate === "function" ? dbRate(b.x).v - dbRate(a.x).v : 0));
  return L;
}

/* ---------- Home ---------- */
/* Part of the Home screen (ux.js): the stat row above the four boxes. */
function homeStatRow(c, d) {
  if (!c.placed && !G.demo) return "";
  const s = lkHome(c, d);
  return dkStatRow([
    dkTile("Free to spend", money(s.free.v), {
      sub: "this month · " + (s.free.real ? "Close" : "Guess"),
      guess: !s.free.real,
      act: "safe",
    }),
    dkTile("Net worth", money(s.nw.v), {
      sub: s.nw.real ? "own minus owe" : "own minus owe · Guess",
      guess: !s.nw.real,
      act: "tab",
      v: "money",
    }),
    dkTile("Next goal", s.goal ? (s.goal.at <= 0 ? "Ready" : esc(fmtDur(s.goal.at))) : "None yet", {
      sub: s.goal ? s.goal.n : "add one on My Goals",
      guess: s.goal && !s.goal.real,
      act: "tab",
      v: "goals",
    }),
    dkTile("Free of costly debt", s.hi.none ? "Now" : s.hi.months == null ? "No end yet" : dkMonth(s.hi.months), {
      sub: s.hi.none ? "nothing at 8% or more" : "debt at 8% or more" + (s.hi.guess ? " · Guess" : ""),
      guess: !s.hi.none && s.hi.guess,
      act: "debtplan",
    }),
  ]);
}

/* ---------- Debt plan ---------- */
/* Part of dbSheet() in debts.js: the stat row, the order, and the Time-Money dial in place of the extra chips. */
function dbSheetLook(h) {
  const c = C(),
    w = W,
    L = dbLive(c);
  if (!L.length) return h;
  const P = (c.x && c.x.dplan) || {},
    order = w.order || P.order || "avalanche",
    extra = w.extra != null ? w.extra : P.extra || 0,
    ft = freeToSpend(c, D),
    cur = dbPlan(c, order, extra),
    spec = tmdDebtSpec(c, order, Math.max(0, ft.free));
  spec.start = w.tmdWant ? { t: w.tmdWant } : { m: extra };
  const top =
    dkStatRow([
      dkTile("Total debt", money(L.reduce((t, o) => t + o.x.amt, 0))),
      dkTile("Debt-free", cur.months != null ? dkMonth(cur.months) : "No end yet", { guess: dbStatus(c) === "Guess" }),
      dkTile("Total interest", money(cur.interest), { guess: dbStatus(c) === "Guess" }),
      dkTile("Extra a month", "+" + money(extra)),
    ]) +
    dkCard(
      "Try it",
      `<div class="chips">${DB_ORD.map(o => `<button class="chip ${order === o[0] ? "on" : ""}" data-a="dborder" data-v="${o[0]}">${esc(o[1])}</button>`).join("")}</div>` +
        timeMoneyDial(spec),
      { cap: "Drag either line, or tap a mark. The other one follows." }
    );
  /* the old chips "Extra you can add each month" give way to the dial */
  return h
    .replace(/<div class="small muted">Fill in each debt[^<]*<\/div>/, m => m + top)
    .replace(
      /<div class="field"><div class="small">Extra you can add each month<\/div><div class="chips">[\s\S]*?<\/div>(<div class="tiny muted">[^<]*<\/div>)?<\/div>/,
      ""
    );
}

/* ---------- My Money ---------- */
/* Part of moneyTab() in ui.js: the stat row and the charts above the lists. */
function moneyTabLook(h) {
  const c = C(),
    m = lkMoney(c, D),
    g = !m.real;
  const look =
    dkStatRow([
      dkTile("Net worth", money(m.nw), { guess: g, spark: m.hist.length > 2 ? m.hist : null }),
      dkTile("Cash", money(m.cash), { guess: g }),
      dkTile("Invested", money(m.inv), { guess: g }),
      dkTile("You owe", money(m.debt), { guess: g, act: m.debt > 0 ? "debtplan" : "" }),
    ]) +
    `<div class="dkgrid">` +
    (m.hist.length > 2
      ? dkCard(
          "Net worth over time",
          dkArea(m.hist, { labels: [nice(m.histFrom), "Today"], label: "Net worth over time" })
        )
      : dkCard("In and out each month", dkBars([{ l: "Planned", v: [m.take, m.spend] }], ["Comes in", "Goes out"]), {
          cap: "From your monthly numbers. Log money moves to see real months.",
        })) +
    (m.mix.length ? dkCard("What you have", dkDonut(m.mix, { label: "Cash and investments" })) : "") +
    (m.where.length ? dkCard("Where it goes", dkDonut(m.where, { label: "Money going out each month" })) : "") +
    (m.logged
      ? dkCard(
          "In and out by month",
          dkBars(
            m.logged.map(x => ({ l: x.l, v: [x.inn, x.out] })),
            ["Came in", "Went out"]
          ),
          { cap: "From what you logged" }
        )
      : "") +
    `</div>`;
  const i = h.indexOf('<div class="tabdesc">'),
    j = i >= 0 ? h.indexOf("</div>", h.indexOf("</div>", i) + 6) : -1;
  return j > 0
    ? h.slice(0, j + 6) + look + h.slice(j + 6)
    : h.replace('<div class="card next">', look + '<div class="card next">');
}
/* Part of moneyTabBase() in ui.js: the order of one list. */
function ledOrder(c, key, rows) {
  const sk = ((c.x || {}).ledSort || {})[key] || "mine";
  return lkOrder(rows, sk, key);
}
/* Part of moneyTabBase() in ui.js: the sort chips of one list, when it has two lines or more. */
function ledSortChips(c, key, rows) {
  if (!rows || rows.length < 2) return "";
  const sk = ((c.x || {}).ledSort || {})[key] || "mine",
    O = [
      ["mine", "My order"],
      ["big", "Biggest"],
      ["small", "Smallest"],
      ["name", "Name"],
    ].concat(key === "debts" ? [["rate", "Highest rate"]] : []);
  return `<div class="chips ledsort" role="group" aria-label="Sort this list">${O.map(o => `<button class="chip slim ${sk === o[0] ? "on" : ""}" data-a="ledsort" data-k="${key}" data-v="${o[0]}">${o[1]}</button>`).join("")}</div>`;
}

/* ---------- My Goals ---------- */
/* Part of goalsCard() in ui.js: one goal as a card (My Goals). */
function goalCardLook(c, d, g, sim, all) {
  const L = lkGoal(c, d, g, sim, all),
    gi = L.gi;
  const date = gi.fit ? (gi.at <= 0 ? "Ready now" : dkMonth(gi.at)) : "Roadblock: " + BLOCKS[gi.blk][0];
  return `<button class="card dkcard dkgoal" data-a="goal" data-v="${g.id}"><div class="row between"><span class="dkgicon" aria-hidden="true">${esc((g.n || "?").trim().charAt(0).toUpperCase())}</span><span class="dklabel">${gi.fit && gi.at > 0 ? "Target" : ""}</span></div><b class="dkgname">${esc(g.n)}</b><div class="small ${gi.real ? "" : "guess"}">${esc(date)}</div>${dkProgress(L.pct, { text: money(g.fund || 0) + " of " + money(g.cost) })}${L.pace > 0 ? `<div class="tiny muted">Strategy: ${money(Math.ceil(L.pace))} a month</div>` : ""}</button>`;
}
/* Part of goalView() in ui.js: the Time-Money dial of one goal. */
function goalViewLook(h) {
  const c = C(),
    g = (c.goals || []).find(x => W && x.id === W.id);
  if (!g) return h;
  const L = lkGoal(c, D, g, goalSim(c), goalSim(c, { all: true }));
  if (!L.need || !L.gi.fit) return h;
  const ft = freeToSpend(c, D),
    dial = dkCard("Time and money", timeMoneyDial(tmdGoalSpec(g.id, L.need, L.pace, Math.max(0, ft.free), null)), {
      cap: "Drag either line, or tap a mark. The other one follows.",
    });
  const end = lkBlockEnd(h, h.indexOf('<div class="levelup"'));
  return end > 0 ? h.slice(0, end) + dial + h.slice(end) : h + dial;
}

/* The place just after the div that starts at `start` (its own closing tag), or -1. */
function lkBlockEnd(h, start) {
  if (start < 0) return -1;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 0,
    m;
  while ((m = re.exec(h))) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return m.index + 6;
  }
  return -1;
}
/* ---------- Next Steps ---------- */
/* Part of planTab() in planner.js: the pay period above the plan. */
function planTabPeriod(h) {
  const c = C();
  if (!c.placed && !G.demo) return h;
  const p = lkPeriod(c, D);
  const bills = p.bills.length
    ? p.bills
        .map(
          b =>
            `<div class="row between small"><span>${esc(b.n)} ${dkPill(b.in === 0 ? "Today" : "Due " + b.when)}</span><b>${money(b.amt)}</b></div>`
        )
        .join("")
    : `<div class="small muted">${p.known ? "No bills before your next payday." : "Tap your bill days to see them here."}</div>`;
  const inc = p.income.length
    ? p.income
        .map(
          x =>
            `<div class="row between small"><span>${esc(x.n)} ${dkPill(x.when)}</span><b>${x.amt == null ? "Your paycheck" : money(x.amt)}</b></div>`
        )
        .join("")
    : `<div class="small muted">${p.known ? "No fixed paydays in the next month." : "Tap your paydays to see them here."}</div>`;
  const card = dkCard(
    "This pay period",
    dkDayStrip(p.days) +
      `<div class="dkgrid" style="margin-top:8px"><div class="stack" style="gap:6px"><span class="dklabel">Bills left this period</span>${bills}</div><div class="stack" style="gap:6px"><span class="dklabel">Money coming in</span>${inc}</div></div>` +
      (p.known ? "" : `<button class="ghost wide" data-a="cal">Set my paydays and bill days</button>`),
    { cls: "dkperiod" }
  );
  const i = h.indexOf('<div class="tabdesc">');
  const j = i >= 0 ? h.indexOf("</div>", h.indexOf("</div>", i) + 6) : -1;
  return j > 0 ? h.slice(0, j + 6) + card + h.slice(j + 6) : card + h;
}

Object.assign(ACT, {
  ledsort: t => {
    const c = C();
    c.x = c.x || {};
    c.x.ledSort = Object.assign({}, c.x.ledSort, { [t.dataset.k]: t.dataset.v });
    save();
    render();
  },
});
/* The end of a drag on the debt dial: the plan takes the new extra, and the whole sheet draws again. */
if (typeof document !== "undefined" && document.addEventListener)
  document.addEventListener("change", e => {
    const el = e.target;
    if (!el || !el.classList || !el.classList.contains("tmdr") || el.dataset.d !== "debt" || !W) return;
    try {
      const st = TMD.debt && TMD.debt.st;
      if (st && st.reach) {
        W.extra = st.extra;
        W.tmdWant = null;
      } else if (st) W.tmdWant = st.want;
      drawSheet();
    } catch (x) {
      report(x, "look.js: dial change");
    }
  });
