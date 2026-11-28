/* ============================================================================
   SLAM the Game: features/lifeline.js
   PURPOSE     Your life timeline (run FIRE statuses and the life timeline, Part 2, Eli, 2026-11-27): "a life
               simulator timeline with different important milestones". One line of the person's life, by
               age and year. It puts on one line the dated things that the game already works out on other
               screens: today, the end of the debt plan, the cushion, each goal, the FIRE statuses, the age
               the player chose to stop, Medicare, Social Security, a pension, a loan that ends, the two
               ages spending eases, and the age the plan pays to. The player adds their own milestones (a
               baby, a home, a career break, a big spend, something else) and can move one to try a what-if.
   INPUT       The profile c. The player's own milestones: c.x.life.own = [{ id, k, n, age }]. The open
               sheet (W.kind lifeline): W.step (line, add, when), W.id (the open marker), W.wi (the what-if:
               { ret, own: { id: true } }), W.kept (the last kept move, for Undo), W.gone (the last
               milestone taken off, for Undo).
   OUTPUT      Math (compositions of the engines, no formula of their own): llOwnEffect, llOpt, llMarks,
               llCalc. Views: llSheet. Parts of functions in other files: ltLineLink (ltMapHtml in
               lifemap.js). Actions (ACT): lifeline, llopen, lladd, llkind, llwhen, llline, llmove, llret,
               llcount, llplan, llkeep, llundo, llgone, llputback, llname. Menu: "Your life timeline".
   DEPENDS ON  core/engine.js (derive, goalSim, passives, endsOf), screens/ui.js (freeAt, money, mathBox, head,
               ib), features/coast.js (stGame), features/debts.js (dbLive, dbPlan, dbStatus),
               features/sim.js (SIMS, simInputs, simRaw), features/couldbe.js (cbCounted),
               core/paylayers.js (LY_SHAPE_REF, LY_MEDICARE), features/assume.js (asVal),
               features/kit.js, screens/dash.js (dkMonth, dkTile, dkStatRow, dkCaption), core/recalc.js (rcSpan).
   RULES       ONE WAY TO A NUMBER. This file has no formula. Each date comes from the engine that owns it
               on its own screen, and the card of a marker says which one.
               A WHAT-IF IS NOT THE PLAN. A moved or counted milestone lives in W.wi, on this sheet only.
               The saved plan changes with one tap, "Keep it", and only for the age the player chose to
               stop (c.ret, the field every engine already reads). Undo puts the old age back.
               NO INVENTED COST. A milestone of the player moves the dates only through a simulator the
               game already has, and only after the player gave that simulator its own main number. Else
               it is a marker with no effect on the numbers, and the card says so.
               EMPTY IS NOT ZERO. A milestone with a missing input has no place on the line. It shows
               under "Not on the line yet" with the one thing to answer.
               Tone: "Recalculating", the new date and the next turn. No red, no verdict words.
   COMPAT      New key c.x.life. An old saved game has none: the line shows the game's own milestones.
   ========================================================================= */
/* The kinds of marker: [name of the "i", what it is, what it is for]. */
const LL_INFO = {
  today: ["Today", "Where you are now, with the numbers you gave.", "Every other date is counted from here."],
  debt: [
    "Debt-free",
    "The month your debt plan pays off the last debt.",
    "From then on, the money of the payments is yours again.",
  ],
  cushion: [
    "Cushion filled",
    "The month your emergency fund reaches its target.",
    "A surprise bill or a gap in pay stays off a card.",
  ],
  goal: ["A goal", "The month your plan has paid for this goal.", "It shows what your saving is for, and when."],
  status: [
    "A FIRE status",
    "A marker on your path: the month your invested money reaches this number.",
    "Reaching one opens options. Your next step stays the same.",
  ],
  stop: [
    "The age you chose",
    "The age you said you would like paid work to be a choice.",
    "The plan aims at it. Move it here to see what changes.",
  ],
  medicare: ["Medicare", "The age Medicare starts.", "A health plan of your own is needed only until then."],
  ss: [
    "Social Security",
    "The age the plan starts to count Social Security.",
    "It pays part of your spending, so less has to come from your own money.",
  ],
  pension: ["Pension", "The age your pension starts to pay.", "It pays part of your spending from then on."],
  ends: ["A payment that ends", "The year a loan payment ends.", "Your spending is lower from then on."],
  phase: [
    "Spending eases",
    "An age when spending usually goes down, from survey data.",
    "It can lower the number you need, when you count it.",
  ],
  end: ["The age your plan pays to", "The last age your plan pays for.", "A longer life needs more saved."],
  own: [
    "Your own milestone",
    "A life event you put on the line.",
    "It shows where it lands next to the dates of your plan.",
  ],
};
/* The kinds a player can add. sim: the simulator that holds its numbers. key: the answer the player must give
   there before it counts. when: the answer of that simulator that takes the years from now. */
const LL_KINDS = [
  {
    k: "baby",
    n: "A baby",
    one: "A child joins the family",
    sim: "kid",
    key: "cost",
    ask: "the yearly cost",
    when: "when",
  },
  { k: "home", n: "Buy a home", one: "The year you would like to buy", sim: "rentbuy", link: true },
  { k: "break", n: "A career break", one: "Months off work", sim: "break", key: "months", ask: "the months off" },
  {
    k: "spend",
    n: "A big one-time spend",
    one: "A wedding, a trip, a gift",
    sim: "spend",
    key: "cost",
    ask: "the cost",
  },
  { k: "other", n: "Something else", one: "Any life event. A marker with your name on it" },
];
const LL_WHEN = [1, 2, 3, 5, 10, 15];
const llKind = k => LL_KINDS.find(x => x.k === k) || LL_KINDS[LL_KINDS.length - 1];
function llStore(c) {
  const S = kitStore(c, "life");
  if (!Array.isArray(S.own)) S.own = [];
  return S;
}
/* The own milestones of the player, with no write to the profile. */
function llOwn(c) {
  const S = c && c.x && c.x.life;
  return S && Array.isArray(S.own) ? S.own : [];
}
const llYearNow = () => +todayISO().slice(0, 4);
/* The effect of one own milestone on the plan run. state: "ok" (opt is the what-if of goalSim, from the
   simulator's own answer), "need" (the simulator waits for the player's number), "none" (a marker only). */
function llOwnEffect(c, m) {
  const K = llKind(m.k),
    def = K.sim && !K.link && typeof SIMS !== "undefined" ? SIMS[K.sim] : null;
  if (!def)
    return {
      state: "none",
      sim: K.link ? K.sim : null,
      why: K.link
        ? "This is a marker. It does not move your numbers: the game has no sourced cost for it. The simulator runs it on your own numbers."
        : "This is a marker. It does not move your numbers.",
    };
  const yrs = Math.max(0, Math.round(m.age - c.age)),
    x = simInputs(c, def, K.when ? { [K.when]: yrs } : null);
  if (!x._st[K.key].given)
    return {
      state: "need",
      sim: K.sim,
      why:
        "Not counted yet. The game has no sourced cost for this. Answer " +
        K.ask +
        " in the simulator, and this milestone can move your dates.",
    };
  const r = simRaw(c, def, x),
    op = r.options.find(o => o.id !== r.ref) || r.options[0],
    opt = { monthly: op.extra || 0, once: op.once || 0 };
  return {
    state: "ok",
    sim: K.sim,
    opt,
    timed: !!K.when,
    math: [
      "From your answers in the simulator “" + def.n + "”.",
      opt.monthly ? "More spending a month, on average: " + money(Math.round(opt.monthly)) + "." : "",
      opt.once ? "Paid one time: " + money(Math.round(opt.once)) + "." : "",
      "These two go through the plan run of the game, the same run as your FI date.",
      K.when
        ? "The simulator counts the cost from the year of the milestone."
        : "The simulator counts the cost from today. The year only places the marker on the line.",
    ],
  };
}
/* The what-if of the plan run for the own milestones that are counted: the sum of their effects. */
function llOpt(c, ids) {
  const opt = { monthly: 0, once: 0 };
  let n = 0;
  llOwn(c).forEach(m => {
    if (!ids || !ids[m.id]) return;
    const E = llOwnEffect(c, m);
    if (E.state !== "ok") return;
    opt.monthly += E.opt.monthly;
    opt.once += E.opt.once;
    n++;
  });
  return n ? opt : null;
}
/* THE MARKERS of one run. w: null for the saved plan, or the what-if { ret, own }.
   One marker: { id, kind, n, sub, state (done, dated, need), months (from today), age, year, when, st (Guess, Close,
   Exact, or null), tag (the words in place of a level), value, math, need, go: { a, v, l }, fromPlanRun }. */
function llMarks(c, w) {
  w = w || {};
  const c2 = w.ret != null && w.ret !== c.ret ? Object.assign(clone(c), { ret: w.ret }) : c,
    opt = llOpt(c, w.own),
    d = derive(c2),
    age = c2.age,
    out = [],
    yr = llYearNow();
  let sim = { eraAt: {}, goalAt: {} },
    K = { st: "Guess", list: [] };
  try {
    sim = goalSim(c2, opt || {});
    K = stGame(c2, d, opt || undefined);
  } catch (e) {
    report(e, "lifeline.js: llMarks");
  }
  const run = "The date is your plan run month by month, the same run as your FI date.",
    add = m => out.push(m),
    /* a marker at a number of months from today */
    atMonths = (m, months) =>
      Object.assign(m, {
        state: months <= 0 ? "done" : "dated",
        months: Math.max(0, months),
        age: age + Math.max(0, months) / 12,
        when: months <= 0 ? "Reached" : dkMonth(months),
        year: months <= 0 ? null : +dkMonth(months).slice(-4),
      }),
    /* a marker at an age */
    atAge = (m, a) =>
      Object.assign(m, {
        state: "dated",
        months: Math.round((a - age) * 12),
        age: a,
        when: String(yr + Math.round(a - age)),
        year: yr + Math.round(a - age),
      }),
    need = (m, t, go) => Object.assign(m, { state: "need", months: null, age: null, when: null, need: t, go });
  add({
    id: "today",
    kind: "today",
    n: "Today",
    sub: "Age " + age,
    state: "today",
    months: 0,
    age,
    year: yr,
    when: String(yr),
  });
  /* the end of the debt plan (debts.js): the player's own order and extra */
  const L = typeof dbLive === "function" ? dbLive(c2) : [];
  if (L.length) {
    const P = (c2.x && c2.x.dplan) || {},
      plan = dbPlan(c2, P.order || "avalanche", P.extra || 0),
      m = {
        id: "debt",
        kind: "debt",
        n: "Debt-free",
        sub: "The last payment of your debt plan",
        st: dbStatus(c2),
        fixed: !!opt,
        go: { a: "debtplan", v: "", l: "Open the debt plan" },
        math: [
          "Your debt plan, with the order and the extra you chose there" +
            (P.extra ? " (" + money(P.extra) + " extra a month)" : "") +
            ".",
          plan.months != null ? "It pays the last debt in " + plan.months + " months." : "",
        ],
      };
    add(
      plan.months != null
        ? atMonths(m, plan.months)
        : need(m, "Today's payments give no end date. The debt plan shows the payment that does.", m.go)
    );
  }
  /* the cushion (era 4 of the plan run) */
  if (d.era >= 4)
    add(atMonths({ id: "cushion", kind: "cushion", n: "Cushion filled", sub: "Your emergency fund", st: K.st }, 0));
  else {
    const at = sim.eraAt[4],
      m = {
        id: "cushion",
        kind: "cushion",
        n: "Cushion filled",
        sub: knN1(d.target) + " months of spending set aside",
        st: K.st,
        math: ["Target: " + knN1(d.target) + " months of spending.", run],
      };
    add(
      at != null
        ? atMonths(m, at)
        : need(m, "Not on the calendar yet. A gap between what comes in and what goes out puts it there.", {
            a: "tab",
            v: "money",
            l: "See what comes in and goes out",
          })
    );
  }
  /* the goals (the plan run pays a placed goal from the share for goals) */
  (c2.goals || [])
    .filter(g => !g.done)
    .forEach(g => {
      const at = sim.goalAt[g.id],
        go = { a: "goal", v: g.id, l: "Open this goal" },
        m = {
          id: "goal:" + g.id,
          kind: "goal",
          n: g.n || g.k,
          sub: "Goal: " + money(g.cost || 0),
          st: K.st,
          go,
          math: ["The price: " + money(g.cost || 0) + ". Saved for it: " + money(g.fund || 0) + ".", run],
        };
      if (g.era == null) add(need(m, "No date yet. Place this goal on your path, and the plan gives it a date.", go));
      else if (at == null)
        add(need(m, "Not on the calendar yet. A gap between what comes in and what goes out puts it there.", go));
      else add(atMonths(m, at));
    });
  /* the FIRE statuses with a number (coast.js, stGame) */
  K.list
    .filter(s => s.value != null)
    .forEach(s => {
      const m = {
        id: "st:" + s.key,
        kind: "status",
        n: s.key === "FI" ? "FI: work is optional" : s.full,
        sub: money(Math.round(s.value)) + " invested",
        st: K.st,
        value: s.value,
        fixed: !!opt && s.key === "Coast",
        go: { a: "ltstatus", v: s.key, l: "See what this status opens" },
        math: s.math,
      };
      if (s.reached) add(atMonths(m, 0));
      else if (s.months != null) add(atMonths(m, s.months));
      else
        add(
          need(m, "Today's numbers give no date for it yet. A gap between what comes in and what goes out does.", {
            a: "tab",
            v: "money",
            l: "See what comes in and goes out",
          })
        );
    });
  /* the age the player chose (c.ret, the same field as Assumptions and Me) */
  if (c2.ret != null && c2.ret > age)
    add(
      atAge(
        {
          id: "stop",
          kind: "stop",
          n: "The age you chose",
          sub: "Age " + c2.ret + ", for work to be a choice",
          tag: "Your choice",
          movable: true,
          math: [
            "Your answer: age " + c2.ret + ". The same answer is in Assumptions and on Me.",
            "Your Coast number and the later steps of your path are counted for this age.",
          ],
        },
        c2.ret
      )
    );
  /* Medicare, Social Security, a pension, a payment that ends: the ages the engines already use */
  if (typeof LY_MEDICARE !== "undefined" && age < LY_MEDICARE)
    add(
      atAge(
        {
          id: "medicare",
          kind: "medicare",
          n: "Medicare starts",
          sub: "A health plan of your own until then",
          tag: "A rule",
          math: [
            "Medicare starts at " +
              LY_MEDICARE +
              ". The chart of your number counts a health plan of your own until then.",
          ],
        },
        LY_MEDICARE
      )
    );
  const P = passives(c2);
  if (P.full > 0 && age < 67)
    add(
      atAge(
        {
          id: "ss",
          kind: "ss",
          n: "Social Security starts",
          sub: P.ss > 0 ? money(Math.round(P.ss)) + " a month counted" : "Not counted in your plan",
          st: K.st,
          go: { a: "simopen", v: "stop", l: "Compare claiming at 62, 67 or 70" },
          math: [
            "The plan counts Social Security from age 67.",
            "The game's estimate at that age, from your pay: " + money(Math.round(P.full)) + " a month.",
            "Your plan counts " + Math.round(P.sh * 100) + "% of it: " + money(Math.round(P.ss)) + " a month.",
          ],
        },
        67
      )
    );
  if (P.pen && P.pen.age > age)
    add(
      atAge(
        {
          id: "pension",
          kind: "pension",
          n: "Your pension starts",
          sub: money(Math.round(P.pen.amt)) + " a month",
          tag: "Your answer",
          math: ["Your answer: " + money(Math.round(P.pen.amt)) + " a month from age " + P.pen.age + "."],
        },
        P.pen.age
      )
    );
  endsOf(c2).forEach((e, i) =>
    add(
      atAge(
        {
          id: "ends:" + i,
          kind: "ends",
          n: e.k + " paid off",
          sub: money(Math.round(e.amt)) + " a month less to pay",
          tag: "Your answer",
          math: ["Your answer: " + money(Math.round(e.amt)) + " a month, for " + e.yrs + " more years."],
        },
        age + e.yrs
      )
    )
  );
  /* the two ages spending eases (reference data, the same as the opening) */
  if (typeof LY_SHAPE_REF !== "undefined") {
    const cnt = typeof cbCounted === "function" ? !!cbCounted(c2).shape : false;
    [
      ["slow", LY_SHAPE_REF.slowGoAge, LY_SHAPE_REF.slowGo],
      ["no", LY_SHAPE_REF.noGoAge, LY_SHAPE_REF.noGo],
    ].forEach(r => {
      if (!(r[1] > age)) return;
      add(
        atAge(
          {
            id: "phase:" + r[0],
            kind: "phase",
            n: "Spending eases to about " + Math.round(r[2] * 100) + "%",
            sub: cnt ? "Counted in your number" : "A marker. Not counted in your number",
            tag: "Survey data",
            math: [
              "From age " + r[1] + ", spending is about " + Math.round(r[2] * 100) + "% of the spending before.",
              LY_SHAPE_REF.source ? "Source: " + LY_SHAPE_REF.source : "",
              cnt
                ? "You counted “Spending eases as you age”, so your number uses it."
                : "Your number does not use it until you count “Spending eases as you age”.",
            ],
          },
          r[1]
        )
      );
    });
  }
  /* the age the plan pays to (c.death, Assumptions) */
  const end = typeof asVal === "function" ? asVal(c2, "death") : c2.death,
    endM = {
      id: "end",
      kind: "end",
      n: "Your plan pays to this age",
      sub: "The age your money lasts to",
      tag: "Your choice",
      go: { a: "assume", v: "", l: "Open Assumptions" },
      math: ["Your answer in Assumptions: the age your money lasts to."],
    };
  if (end != null && Number.isFinite(+end) && +end > age) add(atAge(endM, +end));
  else if (end == null) add(need(endM, "Not set yet. One tap in Assumptions places it.", endM.go));
  /* the player's own milestones */
  llOwn(c).forEach(o => {
    const KD = llKind(o.k),
      E = llOwnEffect(c2, o),
      on = !!(w.own && w.own[o.id] && E.state === "ok");
    add(
      atAge(
        {
          id: "own:" + o.id,
          kind: "own",
          own: o,
          n: o.n || KD.n,
          sub: on
            ? "Counted in this what-if"
            : E.state === "ok"
              ? "Your milestone. Tap to see what it does"
              : "Your milestone. A marker",
          tag: "Yours",
          effect: E,
          counted: on,
          math: E.math || [E.why],
        },
        Math.max(age, o.age)
      )
    );
  });
  return { marks: out, st: K.st, age, opt, ret: c2.ret };
}
/* THE LINE: the saved plan, and, with a what-if, each marker next to its date in the plan.
   rows: the markers on the line in the order of time. wait: the ones with no place yet. moved: what the what-if
   moved. Each row has was (the months in the plan) and shift (months, above 0 is later). */
function llCalc(c, w) {
  const on = !!(w && (w.ret != null || (w.own && Object.keys(w.own).some(k => w.own[k])))),
    P = llMarks(c, null),
    N = on ? llMarks(c, w) : P,
    by = {};
  P.marks.forEach(m => (by[m.id] = m));
  const all = N.marks.map(m => {
    const p = by[m.id] || null,
      both = on && p && p.months != null && m.months != null,
      shift = both ? m.months - p.months : null;
    return Object.assign({}, m, {
      was: on && p ? p : null,
      shift,
      /* the plan had a date and the what-if has none, or the other way */
      lost: on && p && p.months != null && m.months == null,
      found: on && p && p.months == null && m.months != null,
    });
  });
  const rows = all
      .filter(m => m.months != null)
      .map((m, i) => Object.assign(m, { i }))
      .sort(
        (a, b) => a.months - b.months || (a.state === "today" ? 1 : 0) - (b.state === "today" ? 1 : 0) || a.i - b.i
      ),
    wait = all.filter(m => m.months == null),
    moved = all.filter(m => (m.shift != null && m.shift !== 0) || m.lost || m.found),
    own = llOwn(c).filter(o => w && w.own && w.own[o.id]);
  /* the what-if in words */
  const parts = [];
  if (on && w.ret != null && w.ret !== c.ret) parts.push("you choose age " + w.ret + " in place of " + c.ret);
  own.forEach(o => parts.push((o.n || llKind(o.k).n).toLowerCase() + " at age " + o.age + " is counted"));
  return {
    on,
    rows,
    wait,
    moved,
    st: N.st,
    age: c.age,
    ret: c.ret,
    wiRet: on && w.ret != null && w.ret !== c.ret ? w.ret : null,
    words: parts.join(", and "),
    fi: all.find(m => m.id === "st:FI") || null,
    end: all.find(m => m.id === "end") || null,
    has: llOwn(c).length,
  };
}
/* "2 years sooner" or "8 months later" for a shift of months. */
function llShiftWords(n) {
  return rcSpan(n) + (n < 0 ? " sooner" : " later");
}

/* ---------- THE VIEWS ---------- */
function llLevel(m) {
  return m.st ? kitPill(m.st) : m.tag ? `<span class="pill lltag">${esc(m.tag)}</span>` : "";
}
/* The date column of one row: the year (or the month), and the age. */
function llDate(m) {
  if (m.state === "done") return `<b class="small">Reached</b><span class="tiny muted">✓</span>`;
  const g = m.st === "Guess" ? " guess" : "";
  return `<b class="small${g}" data-fid="ll:${esc(m.id)}">${esc(m.when)}</b><span class="tiny muted">Age ${Math.round(m.age)}</span>`;
}
/* The card of the open marker. */
function llCard(c, m, X) {
  const I = LL_INFO[m.kind] || LL_INFO.own,
    rows = [];
  rows.push(`<div class="small"><span class="muted">What</span> ${esc(I[1])}</div>`);
  rows.push(`<div class="small"><span class="muted">What for</span> ${esc(I[2])}</div>`);
  if (m.state === "need") rows.push(`<div class="small llneed" data-ll="need"><b>${esc(m.need)}</b></div>`);
  else if (m.state === "done") rows.push(`<div class="small"><span class="muted">When</span> <b>Reached</b></div>`);
  else if (m.state !== "today")
    rows.push(
      `<div class="small"><span class="muted">When</span> <b class="${m.st === "Guess" ? "guess" : ""}">${esc(m.when)}, age ${Math.round(m.age)}</b>${m.st === "Guess" ? ` <span class="tiny muted">From a guess. Your own numbers sharpen it.</span>` : ""}</div>`
    );
  if (X.on && m.kind !== "own" && m.state !== "today") {
    if (m.shift)
      rows.push(
        `<div class="small llshift" data-ll="shift">Recalculating. In this what-if: <b>${esc(m.when)}</b>, ${esc(llShiftWords(m.shift))}. In your plan: ${esc(m.was.when)}.</div>`
      );
    else if (m.lost)
      rows.push(
        `<div class="small llshift">Recalculating. This what-if gives it no date. In your plan: ${esc(m.was.when)}.</div>`
      );
    else if (m.fixed)
      rows.push(
        `<div class="tiny muted">This what-if does not reach this date. It comes from its own run, so it stays.</div>`
      );
    else if (m.kind !== "stop") rows.push(`<div class="tiny muted">The same date as in your plan.</div>`);
  }
  let btn = "";
  if (m.kind === "stop") {
    const r = X.wiRet != null ? X.wiRet : c.ret;
    rows.push(
      `<div class="tiny muted">Move it to try a what-if. Your saved plan stays as it is until you tap Keep it.</div>`
    );
    btn += `<div class="row wrap llbtns"><button class="ghost slim" data-a="llret" data-v="-1"${r - 1 <= c.age ? " disabled" : ""}><i class=chevl aria-hidden=true></i> 1 year sooner</button><button class="ghost slim" data-a="llret" data-v="1"${r + 1 > 80 ? " disabled" : ""}>1 year later <i class=chev aria-hidden=true></i></button></div>`;
  }
  if (m.kind === "own") {
    const E = m.effect,
      o = m.own,
      sim = E.sim && typeof SIMS !== "undefined" && SIMS[E.sim] ? SIMS[E.sim] : null;
    if (E.state !== "ok") rows.push(`<div class="small llnone" data-ll="noeffect">${esc(E.why)}</div>`);
    else
      rows.push(
        `<div class="small" data-ll="effect">${m.counted ? "Counted in this what-if. The dates on the line show what it moves." : "It can move your dates, from your answers in the simulator. Nothing changes in your saved plan."}${E.timed ? "" : " The simulator counts the cost from today. The year only places the marker."}</div>`
      );
    btn += `<div class="row wrap llbtns"><button class="ghost slim" data-a="llmove" data-v="-1"${o.age - 1 < c.age ? " disabled" : ""}><i class=chevl aria-hidden=true></i> 1 year sooner</button><button class="ghost slim" data-a="llmove" data-v="1"${o.age + 1 > 100 ? " disabled" : ""}>1 year later <i class=chev aria-hidden=true></i></button></div>`;
    if (E.state === "ok")
      btn += `<button class="${m.counted ? "ghost" : "primary"} wide slim" data-a="llcount" data-v="${esc(o.id)}">${m.counted ? "Stop counting it" : "See what it does to my dates"}</button>`;
    if (sim)
      btn += `<button class="ghost wide slim" data-a="simopen" data-v="${esc(E.sim)}">${E.state === "need" ? "Answer it in the simulator" : "Open the simulator"}: ${esc(sim.n)} <i class=chev aria-hidden=true></i></button>`;
    btn += `<details class="math llnamebox"><summary>Give it a name. You can skip this</summary><div class="stack" style="gap:8px;padding:8px 10px"><div class="field"><label class="small" for="llname">A name for this milestone</label><input type="text" id="llname" data-k="name" maxlength="24" value="${esc((W.o && W.o.name) || o.n || "")}"><div class="tiny muted">Up to 24 letters.</div></div><button class="ghost slim" data-a="llname" data-v="${esc(o.id)}">Save the name</button></div></details>`;
    btn += `<button class="ghost wide slim" data-a="llgone" data-v="${esc(o.id)}">Take it off my line</button>`;
  } else if (m.go)
    btn += `<button class="ghost wide slim" data-a="${esc(m.go.a)}" data-v="${esc(m.go.v)}" data-ll="go">${esc(m.go.l)} <i class=chev aria-hidden=true></i></button>`;
  return `<div class="tile stack llcard" data-ll="card" style="gap:6px"><div class="row between" style="gap:8px"><span class="row wrap" style="gap:6px">${llLevel(m)}</span>${ib("term:ll_" + m.kind)}</div>${rows.join("")}${btn}${mathBox((m.math || []).filter(Boolean))}</div>`;
}
/* One row of the line. gap: the years since the row before, for the room above it. */
function llRow(c, m, X, gap) {
  const open = W && W.id === m.id,
    pad = Math.max(0, Math.min(28, Math.round((gap || 0) * 2))),
    sub =
      X.on && m.shift && m.kind !== "own"
        ? llShiftWords(m.shift) + " than your plan (" + m.was.when + ")"
        : X.on && m.kind === "stop" && m.was && m.was.age !== m.age
          ? "What if. Your plan says age " + m.was.age
          : m.sub || "";
  return (
    `<div class="llitem ${m.state}${m.kind === "own" ? " own" : ""}${X.on && (m.shift || m.counted) ? " moved" : ""}" style="padding-top:${pad}px">` +
    `<button class="llrow" data-a="llopen" data-v="${esc(m.id)}" data-ll="${esc(m.id)}" aria-expanded="${open ? "true" : "false"}"><span class="lldate">${llDate(m)}</span><span class="lldot" aria-hidden="true"><i></i></span><span class="llname"><b class="small">${esc(m.n)}</b><span class="tiny muted">${esc(sub)}</span></span><span class="tiny llview">${open ? "Close" : "View"} <i class=chev aria-hidden=true></i></span></button>` +
    (open ? llCard(c, m, X) : "") +
    `</div>`
  );
}
/* The band of a what-if: what moved, the new date, and the next turn. */
function llBand(c, X) {
  if (!X.on) return "";
  const mv = X.moved.filter(m => m.kind !== "own" && m.kind !== "stop"),
    first = mv
      .slice(0, 3)
      .map(m =>
        m.lost ? m.n + ": no date in this what-if" : m.n + ": " + m.when + " (" + llShiftWords(m.shift) + ")"
      );
  return (
    `<div class="card stack llband" data-ll="band" style="gap:8px"><div class="row between"><b>What if</b><span class="pill">Not your plan yet</span></div>` +
    `<div class="small">What if ${esc(X.words)}.</div>` +
    `<div class="small"><b>Recalculating.</b> ${mv.length ? esc(first.join(". ")) + "." + (mv.length > 3 ? " And " + (mv.length - 3) + " more on the line." : "") : "No other date on the line moves."}</div>` +
    `<div class="tiny muted">Next turn: ${X.wiRet != null ? "keep it, or go back to your plan." : "a milestone of your own stays a what-if. It never changes your saved plan."}</div>` +
    `<div class="row wrap llbtns">${X.wiRet != null ? `<button class="primary slim" data-a="llkeep">Keep it: my age is ${X.wiRet}</button>` : ""}<button class="ghost slim" data-a="llplan">Back to my plan</button></div></div>`
  );
}
/* The rows of Undo: a kept move, and a milestone that was taken off. */
function llUndoRows() {
  let h = "";
  if (W.kept)
    h += `<div class="tile row between llundo" data-ll="kept" style="gap:8px;flex-wrap:wrap"><span class="small">Kept. Your plan now aims at age ${W.kept.to}, on every screen. It was ${W.kept.was}.</span><button class="ghost slim" data-a="llundo">Undo</button></div>`;
  if (W.gone)
    h += `<div class="tile row between llundo" data-ll="gone" style="gap:8px;flex-wrap:wrap"><span class="small">Taken off your line: ${esc(W.gone.n || llKind(W.gone.k).n)}.</span><button class="ghost slim" data-a="llputback">Put it back</button></div>`;
  return h;
}
function llAddView(c) {
  return (
    head("Your life timeline", "Add a milestone") +
    dkCaption("Pick the kind. Then pick the year. No typing.") +
    `<div class="stack" style="gap:6px">${LL_KINDS.map(K => `<button class="rowbtn" data-a="llkind" data-v="${K.k}"><span><b>${esc(K.n)}</b><div class="tiny muted">${esc(K.one)}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`).join("")}</div>` +
    `<button class="ghost wide slim backbtn" data-a="llline"><i class=chevl aria-hidden=true></i> Back to the line</button>`
  );
}
function llWhenView(c) {
  const K = llKind(W.k),
    yr = llYearNow();
  return (
    head("Your life timeline", esc(K.n) + ": when?") +
    dkCaption("One tap puts it on your line. You can move it by a year after.") +
    `<div class="chips llwhen">${LL_WHEN.map(n => `<button class="chip" data-a="llwhen" data-v="${n}">${yr + n}, age ${c.age + n}</button>`).join("")}</div>` +
    `<button class="ghost wide slim backbtn" data-a="lladd"><i class=chevl aria-hidden=true></i> Back to the kinds</button>`
  );
}
/* THE SHEET. */
function llSheet() {
  const c = C();
  W.o = W.o || {};
  if (W.step === "add") return llAddView(c);
  if (W.step === "when") return llWhenView(c);
  const X = llCalc(c, W.wi),
    fi = X.fi,
    tiles = [
      dkTile("Today", "Age " + esc(X.age)),
      dkTile(
        "Work is optional",
        fi ? (fi.state === "done" ? "Reached" : fi.state === "need" ? "No date yet" : esc(fi.when)) : "No date yet",
        {
          guess: X.st === "Guess",
          sub: fi && fi.state === "dated" ? "Age " + Math.round(fi.age) + (X.on && fi.shift ? ", what if" : "") : "",
        }
      ),
      dkTile("Your plan pays to", X.end && X.end.age ? "Age " + X.end.age : "Not set"),
    ];
  let prev = null;
  const line = X.rows
    .map(m => {
      const gap = prev == null || m.state === "done" || m.state === "today" ? 0 : Math.max(0, m.age - prev);
      prev = m.age;
      return llRow(c, m, X, gap);
    })
    .join("");
  return (
    head("Your future", "Your life timeline") +
    dkCaption(
      "The dated things of your plan on one line, by age and year. Tap one to open it. Move one to try a what-if."
    ) +
    dkStatRow(tiles) +
    `<div class="row wrap" style="gap:6px">${kitPill(X.st)}<span class="tiny muted">${X.st === "Guess" ? "Dates from guesses are greyed. Your own numbers sharpen them." : "From your own numbers."}</span></div>` +
    llUndoRows() +
    llBand(c, X) +
    `<div class="llline" data-ll="line">${line}</div>` +
    (X.wait.length
      ? `<div class="dklabel">Not on the line yet</div><div class="tiny muted">Each one needs one answer to get a place.</div><div class="llwait" data-ll="wait">${X.wait.map(m => llRow(c, m, X, 0)).join("")}</div>`
      : "") +
    `<button class="${X.wiRet != null ? "ghost" : "primary"} wide" data-a="lladd" data-ll="add">Add a milestone of your own</button>` +
    `<div class="tiny muted">A milestone you add is a marker. It moves a date only as a what-if, and only from your own answers.</div>`
  );
}
/* Part of ltMapHtml() in lifemap.js: the way from the life map to the timeline. */
function ltLineLink() {
  return `<button class="ghost wide slim" data-a="lifeline" data-fid="lt:line">See your life as one timeline, by age and year <i class=chev aria-hidden=true></i></button>`;
}
const llFind = id => llOwn(C()).find(o => o.id === id) || null;
const llOpenOwn = () => (W && W.id && W.id.indexOf("own:") === 0 ? llFind(W.id.slice(4)) : null);
function llRedraw(plan) {
  save();
  if (plan) render();
  drawSheet();
}
Object.assign(ACT, {
  lifeline: () => {
    W = { kind: "lifeline", step: "line", id: null, wi: { ret: null, own: {} }, o: {} };
    sheet(llSheet);
  },
  llopen: t => {
    W.id = W.id === t.dataset.v ? null : t.dataset.v;
    W.o = {};
    drawSheet();
  },
  lladd: () => {
    W.step = "add";
    drawSheet();
  },
  llline: () => {
    W.step = "line";
    drawSheet();
  },
  llkind: t => {
    W.k = llKind(t.dataset.v).k;
    W.step = "when";
    drawSheet();
  },
  /* put a new milestone on the line: a marker, not a change of the plan */
  llwhen: t => {
    const c = C(),
      S = llStore(c),
      n = Math.max(1, Math.min(70, +t.dataset.v || 1)),
      K = llKind(W.k);
    S.seq = (S.seq || 0) + 1;
    const o = { id: "m" + S.seq, k: K.k, n: K.n, age: c.age + n };
    S.own.push(o);
    W.step = "line";
    W.id = "own:" + o.id;
    W.gone = null;
    llRedraw();
  },
  /* move a milestone of your own by a year */
  llmove: t => {
    const c = C(),
      o = llOpenOwn();
    if (!o) return;
    o.age = Math.max(c.age, Math.min(100, o.age + (+t.dataset.v < 0 ? -1 : 1)));
    llRedraw();
  },
  /* what if the age you chose moves by a year: nothing is saved */
  llret: t => {
    const c = C(),
      cur = W.wi.ret != null ? W.wi.ret : c.ret,
      to = Math.max(c.age + 1, Math.min(80, cur + (+t.dataset.v < 0 ? -1 : 1)));
    W.wi.ret = to === c.ret ? null : to;
    W.kept = null;
    drawSheet();
  },
  llcount: t => {
    const id = t.dataset.v;
    if (!llFind(id)) return;
    W.wi.own = Object.assign({}, W.wi.own, { [id]: !W.wi.own[id] });
    drawSheet();
  },
  llplan: () => {
    W.wi = { ret: null, own: {} };
    drawSheet();
  },
  /* THE ONE TAP THAT CHANGES THE PLAN: the age the player chose (c.ret). */
  llkeep: () => {
    const c = C(),
      to = W.wi.ret;
    if (to == null || to === c.ret) return;
    W.kept = { was: c.ret, to };
    c.ret = to;
    W.wi.ret = null;
    llRedraw(true);
  },
  llundo: () => {
    const c = C();
    if (!W.kept) return;
    c.ret = W.kept.was;
    W.kept = null;
    llRedraw(true);
  },
  llgone: t => {
    const c = C(),
      S = llStore(c),
      i = S.own.findIndex(o => o.id === t.dataset.v);
    if (i < 0) return;
    W.gone = Object.assign({ at: i }, S.own[i]);
    S.own.splice(i, 1);
    if (W.wi.own[t.dataset.v]) delete W.wi.own[t.dataset.v];
    W.id = null;
    llRedraw();
  },
  llputback: () => {
    const c = C(),
      S = llStore(c),
      g = W.gone;
    if (!g) return;
    S.own.splice(Math.min(g.at, S.own.length), 0, { id: g.id, k: g.k, n: g.n, age: g.age });
    W.id = "own:" + g.id;
    W.gone = null;
    llRedraw();
  },
  llname: t => {
    const o = llFind(t.dataset.v);
    if (!o) return;
    const n = String((W.o && W.o.name) || "")
      .trim()
      .slice(0, 24);
    o.n = n || llKind(o.k).n;
    W.o = {};
    llRedraw();
  },
});
kitTerms(
  Object.keys(LL_INFO).reduce((o, k) => {
    o["ll_" + k] = [LL_INFO[k][0], LL_INFO[k][1] + " " + LL_INFO[k][2]];
    return o;
  }, {})
);
kitScreen(
  "lifeline",
  "Your life timeline",
  "The dated things of your plan on one line, by age and year.",
  "It is for seeing your whole life at once, and for trying a what-if before you change anything."
);
kitMenu(
  "Your life timeline",
  "lifeline",
  "Your milestones on one line, by age and year. Move one to try a what-if",
  "moves"
);
if (typeof MENU_GROUPS !== "undefined") {
  const g = MENU_GROUPS.find(x => x[0] === "plans");
  if (g && !g[3].includes("lifeline")) g[3].splice(1, 0, "lifeline");
}
