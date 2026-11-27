/* ============================================================================
   SLAM the Game: features/results.js
   PURPOSE     Results first (run Results-first Home, items 1 and 2, from Eli's playtest: "I'm giving a ton
               of data but getting nothing back"). (1) The payoff reveal at the end of setup, "Here's where
               you stand": the lead number (the debt-free date while net worth is below zero, the FI date for
               a player who builds toward FI, else the next stop of the route), then five result cards
               (Debt-to-income, Months of cushion, Savings rate, Net worth, FI progress), each with its value,
               its target, the time to the target at today's pace and what reaching it unlocks, then one
               button, "Start my first win". (2) Home as four cards in a priority grid: Your next win (the
               biggest: "Your goal now", the step the player is on, then "Get there faster", the one move
               with one pulsing button; Eli, Nov 26 2026), By the end of this month (net worth to the last day of the
               month, solid if the planned moves happen, dotted if not), You are here (the route strip of the
               eras), and four metric tiles with See all metrics.
   INPUT       The profile c and the derived numbers d. The open sheet (W.kind firstplan, from spiral.js).
   OUTPUT      Math (compositions of the engines, no formula of their own): rsFire, rsLead, rsCards, rsCard,
               rsNextWin, rsGoal, rsMonthEnd, rsRoute, rsTiles, rsBook. Views: rsRevealBody (the reveal inside
               spPlanSheet of spiral.js), homeResults (the one next-step card) and homeResultsMore (the cards below
               it), both called by homeQuadTop in ux.js,
               rsWinCard, rsMonthCard, rsRouteCard, rsTilesCard (worker 2 of the run can call each one).
               Parts of functions in other files: topbarHome (topbarHTML in planner.js), nvRowHome (nvRowBase
               in nav.js). Actions (ACT): rsfirst, gohome.
   DEPENDS ON  core/metrics.js (knMetrics, knNet, knRows, knPct, knN1, knSt), core/frameworks.js (fwLead,
               fwDtiMonths, fwMonthEnd, fwWealthStage, FW_WEALTH), core/engine.js (derive, freeAt, ERAS),
               features/debts.js (dbPlan, dbLive, dbPay, dbStatus), features/strat.js (stgRank),
               features/spiral.js (spRoute, spDest, spWhen), features/look.js (lkNwText, lkK),
               features/games2.js (cashCal, calOf), features/kit.js (kitPill, kitDays, whereFromText),
               features/canon.js (fwNextDollarLine, fwStepOf), core/frameworks.js (FW_STEP_HEAD), screens/dash.js (dkTile, dkArea, dkMonth, goalFwd).
   RULES       Every number comes from an existing engine. A number from typical amounts is a Guess: it is
               greyed, labeled "typical", and has Put in yours. Net worth is a range while any piece is a
               Guess. No red, no verdict words, about 15 words of text a card, the details collapsed.
   ========================================================================= */
/* The steps of nextStep() that come before any money move: payday, a crossroads, a pending era, a schedule that is
   due, a heavy day (forks), and the gentle start. */
const RS_MUST = ["payday", "cross", "month", "rdo", "fkopen", "gwin"];
/* The answers that feed each card, in the order to put them in (the keys of sharpList in engine.js). */
const RS_KEYS = {
  dti: ["debt", "take"],
  cushion: ["cash", "spend"],
  save: ["take", "spend"],
  nw: ["debt", "cash", "inv"],
  fi: ["inv", "spend", "take"],
};
const rsSum = rows => (rows || []).reduce((t, r) => t + (+r.amt || 0), 0);
/* A player who builds toward FI, by their own answers: they invest every month, or turned on the freedom date. */
function rsFire(c) {
  return !!((typeof G !== "undefined" && G.fire) || c.invest === "Every month");
}
const rsMetric = (M, id) => M.find(m => m.id === id) || null;
/* The first answer of a card that is still a Guess: the key for Put in yours. */
function rsPutKey(c, id) {
  const sl = typeof sharpList === "function" ? sharpList(c) : [];
  return (RS_KEYS[id] || []).find(k => sl.includes(k) && !isSharp(c, k)) || null;
}
/* Months to the end of every debt at today's payments (dbPlan with no extra). 0 with no debt. */
function rsDebtFree(c, extra) {
  if (!dbLive(c).length) return { months: 0, plan: null };
  const p = dbPlan(c, "avalanche", extra || 0);
  return { months: p.months, plan: p };
}

/* ---------- THE LEAD NUMBER ---------- */
function rsLead(c, d) {
  d = d || derive(c);
  const kind = fwLead({ worth: d.nw, fire: rsFire(c) });
  if (kind === "debtfree") {
    const m = rsDebtFree(c, 0).months;
    return {
      kind,
      label: "Debt-free date",
      big: m == null ? "No end yet" : m <= 0 ? "Now" : dkMonth(m),
      sub: m == null ? "Payments cover the interest only" : m <= 0 ? "Nothing owed" : "at today's payments",
      months: m,
      st: dbStatus(c),
      act: "debtplan",
      v: "",
      math: [
        "Each debt at its payment each month, the highest rate first, with interest added each month.",
        "The month the last one reaches $0 is the date.",
      ],
    };
  }
  if (kind === "fi") {
    const m = freeAt(c),
      M = knMetrics(c, d),
      y = rsMetric(M, "yearsfi");
    return {
      kind,
      label: "FI date",
      big: m == null ? "No date yet" : m <= 0 ? "Now" : "Age " + Math.round(c.age + m / 12),
      sub: m == null ? "Needs money left each month" : m <= 0 ? "Work is optional" : dkMonth(m),
      months: m,
      st: y ? y.st : "Guess",
      act: "metric",
      v: "yearsfi",
      math: (y ? y.math : []).concat([
        "Month by month: what you invest grows and the money left each month goes in, until it reaches your freedom number (" +
          money(d.fi) +
          ").",
      ]),
    };
  }
  const rt = spRoute(c, d),
    dest = spDest(rt);
  return {
    kind,
    label: "Your next stop",
    big: dest ? dest.n : "Past every stop",
    sub: dest ? spWhen(dest.m) : "",
    months: dest ? dest.m : 0,
    st: knSt(
      c.incs || [],
      c.spends || [],
      c.cashes || [],
      (c.debts || []).filter(x => x.amt > 0)
    ),
    act: "tab",
    v: "map",
    math: [
      "The money left each month (take-home pay less spending) goes to one stop at a time, in the order of the route.",
    ],
  };
}

/* ---------- THE FIVE RESULT CARDS ---------- */
function rsCard(c, d, id, M) {
  d = d || derive(c);
  M = M || knMetrics(c, d);
  const left = Math.round((c.take || 0) - (c.spend || 0)),
    put = rsPutKey(c, id),
    out = { id, put, typ: false };
  if (id === "dti") {
    let m = rsMetric(M, "dti"),
      typ = m.st === "Guess";
    if (m.num == null) {
      /* the payments or the tax share are not answered yet: the same metric, with each debt at its typical payment
         and the typical tax share (KN_NET), shown as typical */
      const p = clone(c);
      (p.debts || []).forEach(x => {
        if (x.amt > 0 && x.pay == null) {
          x.pay = dbPay(x).v;
          x.paycf = 1;
        }
      });
      p.x = p.x || {};
      if (!p.x.taxPct) p.x.taxPct = Math.round((1 - KN_NET) * 100);
      m = rsMetric(knMetrics(p, derive(p)), "dti");
      typ = true;
    }
    const N = knNet(c),
      plan = rsDebtFree(c, 0).plan,
      mo = fwDtiMonths({
        home: rsSum(knRows(c).home),
        gross: N.gross,
        debts: plan ? plan.debts.map(x => ({ pay: x.pay, off: x.off })) : [],
        target: 0.36,
      });
    return Object.assign(out, {
      label: "Debt-to-income",
      val: m.num == null ? "?" : knPct(m.num),
      st: typ ? "Guess" : m.st,
      typ,
      target: "36% or less",
      time: mo == null ? "No date at today's payments" : mo <= 0 ? "There now" : "about " + rcSpan(mo),
      unlock: "Inside the 28/36 guideline lenders use",
      act: "metric",
      v: "dti",
      math: (m.math || []).concat([
        "Time: the payoff run at today's payments, month by month, until home plus the payments still open fit 36%.",
      ]),
    });
  }
  if (id === "cushion") {
    const m = rsMetric(M, "cushion"),
      rt = spRoute(c, d),
      s = rt.stops.find(x => x.i === 4),
      mo = s ? s.m : 0;
    return Object.assign(out, {
      label: "Months of cushion",
      val: m.val,
      st: m.st,
      typ: m.st === "Guess",
      target: knN1(d.target) + " months",
      time: mo == null ? "No date yet" : mo <= 0 ? "There now" : "about " + rcSpan(mo),
      unlock: ERAS[4].n + ": a job loss is covered",
      act: "metric",
      v: "cushion",
      math: (m.math || []).concat([
        "Target: your age ÷ 5 months of spending.",
        "Time: what is missing ÷ the money left each month, after the stops before it on your route.",
      ]),
    });
  }
  if (id === "save") {
    const m = rsMetric(M, "save"),
      take = c.take || 0,
      r = m.num,
      N = knNet(c),
      mg = 0.25 / N.f,
      tg = r == null || r < 0.2 ? 0.2 : r < mg ? mg : 0.5,
      gap = Math.max(0, Math.round(tg * take - left));
    return Object.assign(out, {
      label: "Savings rate",
      val: m.val,
      st: m.st,
      typ: m.st === "Guess",
      target: knPct(tg) + (tg === 0.2 ? " (50/30/20)" : tg === mg ? " (Money Guy mark)" : " (FIRE pace)"),
      time: r != null && r >= tg ? "There now" : "Keep " + money(gap) + " more a month",
      unlock: tg === 0.5 ? "FIRE pace: about 17 working years" : "A FI date years sooner",
      act: "metric",
      v: "save",
      math: (m.math || []).concat([
        "Gap: the target share × " + money(take) + " take-home pay, less the " + money(left) + " kept now.",
      ]),
    });
  }
  if (id === "nw") {
    const R = lkNwText(c, d),
      nw = d.nw,
      st = nw < 0 ? null : fwWealthStage({ worth: nw, monthly: left }),
      mo = nw < 0 ? goalFwd(-nw, left, 0).months : st && st.to ? st.months : 0,
      nxt = st && st.to ? FW_WEALTH[st.i + 1] : null;
    return Object.assign(out, {
      label: "Net worth",
      val: R.txt,
      st: R.st,
      typ: R.st === "Guess",
      target: nw < 0 ? "$0" : st && st.to ? money(st.to) : "Past $100,000",
      time: mo == null ? "No date yet" : mo <= 0 ? "There now" : "about " + rcSpan(mo),
      unlock: nw < 0 ? "Above zero: you own more than you owe" : nxt ? nxt.name : "Your money adds more than a raise",
      act: "lkbrk",
      v: "nw",
      math: [
        "Cash " + money(d.cash) + " + invested " + money(c.inv || 0) + " − owed " + money(c.debt || 0) + ".",
        R.range
          ? "A range while any piece is a Guess: each typical amount counts from its low to its high."
          : "Every piece is your own number.",
        "Time: what is missing ÷ the " + money(left) + " left each month.",
      ],
    });
  }
  /* fi */
  const m = rsMetric(M, "fi"),
    mo = freeAt(c);
  return Object.assign(out, {
    label: "FI progress",
    val: m.num == null ? "?" : Math.round(d.pct) + "%",
    sub: mo == null ? "No FI date yet" : mo <= 0 ? "Work is optional" : "FI at age " + Math.round(c.age + mo / 12),
    st: m.st,
    typ: m.st === "Guess",
    target: "100%: " + lkK(d.fi) + " invested",
    time: mo == null ? "Needs money left each month" : mo <= 0 ? "There now" : dkMonth(mo) + ", " + rcSpan(mo),
    unlock: "Work optional",
    act: "metric",
    v: "fi",
    math: (m.math || []).concat([
      "FI date: month by month, what you invest grows and the money left each month goes in.",
    ]),
  });
}
function rsCards(c, d) {
  d = d || derive(c);
  const M = knMetrics(c, d);
  return ["dti", "cushion", "save", "nw", "fi"].map(id => rsCard(c, d, id, M));
}

/* ---------- YOUR NEXT WIN ---------- */
/* One move: the step that comes before any money move, else the best move of the Strategy Engine that fits
   (an easy one first), with its money a month, the days it brings FI (or the debt-free date) closer, and the stop
   it brings closer. */
function rsNextWin(c, d) {
  d = d || derive(c);
  const lead = fwLead({ worth: d.nw, fire: rsFire(c) }),
    ns = nextStep(c, d),
    dest = spDest(spRoute(c, d)),
    step = () => ({
      kind: "step",
      t: ns.t,
      s: ns.s,
      a: ns.a,
      v: ns.v == null ? "" : ns.v,
      l: ns.l || "Start",
      amt: null,
      days: null,
      daysOf: null,
      unlock: dest ? dest.n : "",
      math: [],
    });
  if (RS_MUST.includes(ns.a) || c.gentle || typeof stgRank !== "function") return step();
  /* the money a month a move frees for the debts: what it saves plus what it adds, less what it costs from the
     paycheck. The match goes into a retirement account, not to cash, so it frees nothing for the debts. */
  const cashOf = x => (x.S.id === "match" ? 0 : Math.round(x.F.save + x.F.take - (x.F.cost || 0)));
  /* a move already on your steps is started: the next win is the next move (Krug self-test, item 5) */
  let fits = stgRank(c).filter(
    x => x.V.v === "fits" && x.days > 0 && !(typeof stgAdded === "function" && stgAdded(c, x.S))
  );
  /* below zero the lead is the debt-free date: a move that frees cash for the debts comes first */
  if (lead === "debtfree" && fits.some(x => cashOf(x) > 0)) fits = fits.filter(x => cashOf(x) > 0);
  const r = fits.find(x => (x.S.effort || 3) <= 2) || fits[0];
  if (!r) return step();
  const amt = Math.round(r.F.save + r.F.take + r.F.once / 12),
    cash = cashOf(r);
  let days = r.imp.fi != null ? kitDays(r.imp.fi) : null,
    daysOf = "FI";
  if (lead === "debtfree" && cash > 0) {
    const a = rsDebtFree(c, 0).months,
      b = rsDebtFree(c, cash).months;
    if (a != null && b != null) {
      days = kitDays(a - b);
      daysOf = "debt-free";
    }
  }
  const g = r.imp.goal;
  return {
    kind: "move",
    id: r.S.id,
    t: r.S.name,
    s: r.S.one || "",
    a: "strat",
    v: r.S.id,
    l: "Start this win",
    amt,
    days: days != null && days > 0 ? days : null,
    daysOf,
    pending: !!r.V.pending,
    unlock: g && g.days >= 1 ? g.n + ", " + Math.round(g.days).toLocaleString() + " days sooner" : dest ? dest.n : "",
    math: [
      "The move's money a month: " + money(amt) + " (what it saves plus what it adds).",
      daysOf === "FI"
        ? "Days closer to FI: your plan run month by month with the move, next to the plan without it."
        : "Days closer to debt-free: the payoff run with " + money(cash) + " more a month, next to today's payments.",
      "Picked from the Moves library: it fits your answers, and an easy one comes first.",
    ],
  };
}

/* ---------- YOUR GOAL NOW ---------- */
/* The goal that Your next win works toward: the step the player is on. Below zero it is the debt-free step, with
   its date at today's payments (rsLead). Else it is the FOO step of the next dollar (fwStepOf, on nxaCalc), with
   the next-dollar line and its amount to go. A FIRE type (Lean, Coast and so on) is a status on that timeline, thus
   it is never the goal here. No formula of its own. */
function rsGoal(c, d) {
  d = d || derive(c);
  if (fwLead({ worth: d.nw, fire: rsFire(c) }) === "debtfree") {
    const L = rsLead(c, d);
    return {
      kind: "debtfree",
      t: "Be debt-free",
      s: L.months == null ? L.sub : L.months <= 0 ? L.sub : L.big + ", " + L.sub,
      a: L.act,
      v: L.v,
      go: "See the plan",
    };
  }
  const S = typeof fwStepOf === "function" ? fwStepOf(c) : { step: null },
    line = S.step && typeof fwNextDollarLine === "function" ? fwNextDollarLine(c) : null;
  if (S.step && FW_STEP_HEAD[S.step])
    return { kind: "foo", step: S.step, t: FW_STEP_HEAD[S.step], s: line || "", a: "nxa", v: "", go: "See the order" };
  const dest = spDest(spRoute(c, d));
  return {
    kind: "stop",
    t: dest ? dest.n : "Past every stop",
    s: dest ? spWhen(dest.m) : "",
    a: "tab",
    v: "map",
    go: "See the map",
  };
}

/* ---------- BY THE END OF THIS MONTH ---------- */
/* Net worth to the last day of the month from the cash calendar (cashCal): each day's money in less money out, with
   the debt payments put back (they move money from cash to a debt, so net worth stays). Planned: with the next win's
   money a month, for the days left. */
function rsMonthEnd(c, d, today) {
  d = d || derive(c);
  today = today || todayISO();
  const t = parseISO(today),
    day = t.getDate(),
    last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(),
    cc = cashCal(c, d),
    k = calOf(c),
    days = cc.days.map(x => ({
      day: x.d,
      net: x.inn - x.out + (k.debt.includes(x.d) ? cc.mins / k.debt.length : 0),
    })),
    win = rsNextWin(c, d),
    extra = win.amt > 0 ? (win.amt * Math.max(0, last - day)) / last : 0,
    E = fwMonthEnd({ worth: d.nw, days, today: day, last, extra }),
    R = lkNwText(c, d),
    move = v => v - d.nw;
  return Object.assign(E, {
    win,
    st: R.st,
    range: R.range,
    lo: R.lo + move(E.endPlanned),
    hi: R.hi + move(E.endPlanned),
    txt: R.range
      ? "about " + lkK(R.lo + move(E.endPlanned)) + " to " + lkK(R.hi + move(E.endPlanned))
      : money(E.endPlanned),
    gap: E.endPlanned - E.endAsIs,
    first: DK_MON[t.getMonth()] + " " + day,
    lastLabel: DK_MON[t.getMonth()] + " " + last,
  });
}

/* ---------- YOU ARE HERE ---------- */
/* The eras as a strip: done, here (pulsing), locked. */
function rsRoute(c, d) {
  d = d || derive(c);
  const rt = spRoute(c, d),
    dest = spDest(rt),
    era = rt.era;
  return {
    era,
    here: ERAS[era].n,
    dest,
    nodes: ERAS.slice(0, 9).map((e, i) => ({ i, n: e.n, s: i < era ? "done" : i === era ? "here" : "locked" })),
  };
}

/* ---------- THE METRIC TILES ---------- */
function rsTiles(c, d) {
  d = d || derive(c);
  const L = rsLead(c, d),
    M = knMetrics(c, d);
  return [{ id: "lead", label: L.label, val: L.big, st: L.st, typ: L.st === "Guess", act: L.act, v: L.v }].concat(
    /* how close to FI is always one look away: FI progress, or the savings rate when the lead is the FI date */
    [L.kind === "fi" ? "save" : "fi", "nw", "cushion"].map(id => rsCard(c, d, id, M))
  );
}

/* The spreadsheet of the plan (book.js): the month-end line and the next win. */
function rsBook(c) {
  const d = derive(c),
    E = rsMonthEnd(c, d),
    w = E.win;
  return {
    title: "Results first: the end of this month and your next win",
    rows: [
      { id: "rs_nw", label: "Net worth today", v: d.nw },
      { id: "rs_rest", label: "Money in less money out, the rest of the month", v: E.endAsIs - d.nw },
      {
        id: "rs_end0",
        label: "Net worth at the end of the month, if nothing changes",
        v: E.endAsIs,
        f: "={rs_nw}+{rs_rest}",
      },
      { id: "rs_win", label: "The next win's money, for the days left", v: E.gap, note: w.t },
      {
        id: "rs_end1",
        label: "Net worth at the end of the month, with the win",
        v: E.endPlanned,
        f: "={rs_end0}+{rs_win}",
      },
    ],
  };
}

/* ---------- THE VIEWS ---------- */
const rsTag = x => kitPill(x.st) + (x.typ ? `<span class="pill rstyp">typical</span>` : "");
function rsPutBtn(x) {
  if (!x.typ) return "";
  return x.put
    ? `<button class="ghost slim" data-a="sharp" data-v="${esc(x.put)}">Put in yours</button>`
    : x.id === "dti"
      ? `<button class="ghost slim" data-a="knask" data-v="debtPay">Put in yours</button>`
      : "";
}
function rsCardHtml(x) {
  return `<div class="tile rscard" data-fid="rs:${x.id}"><div class="row between"><span class="dklabel">${esc(x.label)}</span><span class="row" style="gap:4px">${rsTag(x)}</span></div><b class="rsval ${x.typ ? "guess" : ""}">${esc(x.val)}</b>${x.sub ? `<div class="tiny">${esc(x.sub)}</div>` : ""}<div class="rsmeta tiny"><div><span class="muted">Target</span> ${esc(x.target)}</div><div><span class="muted">At today's pace</span> ${esc(x.time)}</div><div><span class="muted">Unlocks</span> ${esc(x.unlock)}</div></div><div class="row wrap" style="gap:6px">${rsPutBtn(x)}</div>${mathBox(x.math)}</div>`;
}
/* The payoff reveal: the lead number, the five cards, the route behind a tap, one button. Part of spPlanSheet()
   in spiral.js, which keeps its route under "Your route, stop by stop". */
function rsRevealBody(c, route) {
  const d = derive(c),
    L = rsLead(c, d),
    cards = rsCards(c, d),
    guest = typeof doorGuest === "function" && doorGuest(),
    typ = cards.some(x => x.typ);
  return (
    `<div class="spnum pop rslead" data-fid="rs:lead"><div class="eyebrow">${esc(L.label)}</div><div class="spbig ${L.st === "Guess" ? "guess" : ""}">${esc(L.big)}</div><div class="small">${esc(L.sub)}</div>${kitPill(L.st)}${mathBox(L.math)}</div>` +
    (typ
      ? `<div class="tiny muted">Greyed numbers are typical for people like you. Put in yours to make them real.</div>`
      : "") +
    `<div class="rscards">${cards.map(rsCardHtml).join("")}</div>` +
    (route
      ? `<details class="math"><summary>Your route, stop by stop</summary><div class="inner stack">${route}</div></details>`
      : "") +
    (guest ? `<button class="ghost wide" data-a="doorsave">Keep this game: make a free account</button>` : "") +
    `<button class="primary wide go" data-a="rsfirst">Start my first win</button>`
  );
}
/* Home, the four cards. Worker 2 of the run can call each card by name. */
function rsWinCard(c, d) {
  const w = rsNextWin(c, d),
    g = rsGoal(c, d);
  /* the goal is a row to tap (a caret and its own words), not a second primary button */
  const goal = `<button class="rowbtn rsgoal" data-a="${esc(g.a)}" data-v="${esc(g.v)}" data-fid="rs:goal"><span class="rsgoalt"><span class="dklabel">Your goal now</span><b>${esc(g.t)}</b>${g.s ? `<span class="tiny">${esc(g.s)}</span>` : ""}</span><span class="fkgo">${esc(g.go)} ›</span></button>`;
  return `<div class="card dkcard rsq rswin" data-fid="rs:win"><div class="row between dkhead"><span class="dklabel">Your next win</span>${w.pending ? `<span class="pill">Check the fit</span>` : ""}</div>${goal}<div class="dklabel rsfast">Get there faster</div><b class="rswint">${esc(w.t)}</b><div class="rsnums">${w.amt > 0 ? `<span><b>${money(w.amt)}</b><i class="tiny muted">a month</i></span>` : ""}${w.days ? `<span><b>${w.days.toLocaleString()} days</b><i class="tiny muted">closer to ${esc(w.daysOf)}</i></span>` : ""}</div><button class="primary go wide" data-a="${esc(w.a)}" data-v="${esc(w.v)}">${esc(w.l)}</button>${w.unlock ? `<div class="tiny"><span class="muted">Unlocks</span> ${esc(w.unlock)}</div>` : ""}<details class="math"><summary>Why this one</summary><div class="inner tiny stack" style="gap:4px">${w.s ? `<div>${esc(w.s)}</div>` : ""}${w.math.map(l => `<div>${esc(l)}</div>`).join("")}<div>The goal is the step you are on. The move is the fastest easy way toward it.</div><button class="ghost slim" data-a="stratlib">See all moves</button></div></details></div>`;
}
function rsMonthCard(c, d) {
  const E = rsMonthEnd(c, d);
  return `<div class="card dkcard rsq rsmonth" data-fid="rs:month"><div class="row between dkhead"><span class="dklabel">By the end of this month</span>${kitPill(E.st)}</div><b class="rsval ${E.st === "Guess" ? "guess" : ""}">${esc(E.txt)}</b><div class="tiny muted">net worth on ${esc(E.lastLabel)}</div>${dkArea(E.planned, { faint: E.asIs, dots: true, fit: true, labels: [E.first, E.lastLabel], label: "Net worth to the end of the month" })}<div class="tiny muted rskey"><span><i class="rsk"></i>Planned moves happen</span><span><i class="rsk dot"></i>They don't</span></div>${mathBox(
    [
      "Start: net worth today, " + money(E.asIs[0]) + ".",
      "Each day: the money in less the money out of your money calendar. Debt payments move cash to a debt, so they stay in.",
      "Dotted: nothing changes, " +
        money(E.endAsIs) +
        ". Solid: your next win's " +
        money(E.win.amt || 0) +
        " a month for the days left, " +
        money(E.endPlanned) +
        ".",
      E.range ? "A range while any piece is a Guess." : "",
    ]
  )}<button class="ghost slim" data-a="months">Open the money calendar</button></div>`;
}
function rsRouteCard(c, d) {
  const R = rsRoute(c, d);
  return `<button class="card dkcard rsq rsroute" data-a="tab" data-v="map" data-fid="rs:route"><span class="row between dkhead"><span class="dklabel">You are here</span><span class="caret">›</span></span><span class="rsstrip" aria-hidden="true">${R.nodes.map(n => `<i class="${n.s}"></i>`).join("")}</span><b class="small">${esc(R.here)}</b><span class="tiny muted">${R.dest ? "Next: " + esc(R.dest.n) + ", " + esc(spWhen(R.dest.m)) : "Past every stop"}</span>${typeof rsRouteStatus === "function" ? rsRouteStatus(c, d) /* coast.js: the FIRE statuses reached, and the next one */ : ""}<span class="tiny rsgo">See the full map</span></button>`;
}
function rsTilesCard(c, d) {
  const T = rsTiles(c, d);
  return `<div class="card dkcard rsq rstiles" data-fid="rs:tiles"><div class="row between dkhead"><span class="dklabel">Your numbers</span></div><div class="rstgrid">${T.map(x => dkTile(x.label, esc(x.val), { sub: (x.sub ? x.sub + " · " : "") + x.st + (x.typ ? " · typical" : ""), guess: x.typ, act: x.act, v: x.v })).join("")}</div><button class="ghost slim wide" data-a="keynums">See all metrics</button></div>`;
}
/* Part of homeQuadTop() in ux.js: the ONE next-step card of Home, Your next win (run 16, B6). null for the sample
   game. The first move of a result can take its place (homeFirstCard in cbreveal.js). */
function homeResults(c, d) {
  try {
    if (!c || (!c.placed && G.demo)) return null;
    return rsWinCard(c, d || derive(c));
  } catch (e) {
    report(e, "results.js: homeResults");
    return null;
  }
}
/* Part of homeQuadTop() in ux.js: the cards below the next-step card: the end of this month, You are here, and
   Your numbers (on a phone the numbers come before the chart: the order of the styles). */
function homeResultsMore(c, d) {
  try {
    if (!c || (!c.placed && G.demo)) return "";
    d = d || derive(c);
    return `<div class="rsgrid">${rsMonthCard(c, d)}${rsRouteCard(c, d)}${rsTilesCard(c, d)}</div>`;
  } catch (e) {
    report(e, "results.js: homeResultsMore");
    return "";
  }
}
/* Part of topbarHTML() in planner.js: the Home button, always in view. */
function topbarHome() {
  return `<button class="ghost slim rshome" data-a="gohome" aria-label="Home" title="Home">⌂<span class="rshw"> Home</span></button>`;
}
/* Part of nvRowBase() in nav.js: Home on the top row of each sheet, next to Back. */
function nvRowHome() {
  return `<button class="ghost slim rshome" data-a="gohome" aria-label="Home" title="Home">⌂<span class="rshw"> Home</span></button>`;
}
kitTerms({
  dti: ["Debt-to-income", "Home cost plus every debt payment, as a share of pay before taxes. Lenders look at it."],
});
Object.assign(ACT, {
  gohome: () => {
    if (typeof closeSheet === "function") closeSheet();
    go("home");
    if (typeof scrollTo === "function") scrollTo(0, 0);
  },
  rsfirst: () => {
    const c = C();
    if (typeof elStore === "function") elStore(c).planSeen = todayISO();
    save();
    const w = rsNextWin(c, derive(c));
    closeSheet();
    go("home");
    if (w.a && ACT[w.a]) ACT[w.a]({ dataset: { v: w.v == null ? "" : String(w.v) } });
  },
});
/* The money calendar left Home (the four cards replaced the line "Today's plan" and the tile "Next steps"). It stays
   on Next Steps and here in the Menu, in My money. */
kitMenu("Money calendar", "months", "The next few months: paydays, bills and what is due", "safe");
if (typeof MENU_GROUPS !== "undefined") {
  const g = MENU_GROUPS.find(x => x[0] === "money");
  if (g && !g[3].includes("months")) g[3].splice(1, 0, "months");
}
