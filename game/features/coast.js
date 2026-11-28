/* ============================================================================
   SLAM the Game: features/coast.js
   PURPOSE     Two things about freedom. (1) The FI ratio on Key numbers: what the investments can pay
               each month, next to what the player spends each month. (2) "You can stop sprinting": a
               calm card on Home, one time, on the day the invested money reaches the Coast number.
   INPUT       The profile: c.inv, c.spend, c.age, c.ret, c.spends, c.invs, c.x.coast (seen: the day the
               player closed the card). derive(c): d.coastNum, d.g[7], d.toRet.
               (3) Back under Coast: when the invested money falls under the Coast number after the
               card was closed, one quiet card "Recalculating" with the gap and the new Coast date.
               (4) The FIRE statuses (Eli, 2026-11-27): Coast, Lean, Barista, FI, Chubby and Fat are
               statuses on the one path, not goals. stGame gives the list for every screen. The card
               of a status that was just reached shows one time on Home ("You can stop sprinting" is
               the Coast case), with "Options this opens". The next step does not change.
   OUTPUT      Functions: firCalc, knMetricsFir, knOneFir, cstCalc, stGame, stCardHtml, stBelowHtml,
               homeCoastCard, rsRouteStatus, stSheet, cstBook. Actions (ACT): coastok, coastbelowok,
               stok, stbelowok, ltstatus. Parts of functions in other files: knMetricsFir (knMetrics in
               metrics.js), knOneFir (knOne in metrics.js), homeCoastCard (home in ui.js),
               rsRouteStatus (rsRouteCard in results.js).
   DEPENDS ON  core/engine.js (derive, fiNeed, SWR, R, todayISO), core/metrics.js (knRows, knSt,
               knPct), core/recalc.js (rcCoast, rcCoastWords, rcYm), core/statuses.js (stList,
               stMarkers, stCard, stBelow, stLine, ST_OPTIONS), screens/ui.js (freeAt, money, mathBox,
               head), features/kit.js, features/reveal.js (homeRowAdd).
   RULES       No new math for the Coast number: derive() works it out (d.coastNum), and d.g[7] says if
               it is reached. The investment income is the invested money times the withdrawal rate of
               the game (SWR), the same rate as the freedom number, so 100% is the same finish line.
               The card does not show on a Guess: a number that is a guess gets no verdict. The card
               shows one time. The player closes it with one tap.
               Back under Coast is never a warning (Eli, 2026-11-25). The card says "Recalculating",
               the gap and the new Coast date. core/recalc.js works them out (rcCoast), the same
               function as the web app. The player closes it for the month with one tap.
               A status keeps no formula of its own. The Coast number and the freedom number come from
               derive(). The Lean number is the freedom number of the engine with only the needs to pay
               (fiNeed with the fun lines taken off), so it is never over the freedom number. The Coast
               date is from rcCoast. The Lean date and the FI date are from freeAt. The game does not work out Barista, Chubby and Fat:
               they show with no number. The words of each card are ST_OPTIONS, a draft for Eli.
   ========================================================================= */
/* The FI ratio: the investment income of a month divided by the spending of a month. */
function firCalc(c) {
  const inv = c.inv || 0,
    spend = c.spend || 0,
    income = (inv * SWR) / 12;
  return {
    inv,
    spend,
    income,
    ratio: spend > 0 ? income / spend : null,
    st: knSt(knRows(c).sp, c.invs || []),
  };
}
/* The "i" of the FI ratio: how it differs from "While you slept" (Eli, 2026-11-25). */
kitTerms({
  firslept: [
    "FI ratio and While you slept",
    "Two different questions. The FI ratio asks: how much of my monthly spending could my investments pay for, for good? It uses the 4% draw, the definition the FIRE community uses for the freedom number, so 100% is the day work is optional. While you slept asks: what did my money earn? It uses the return of your plan (7% a year after inflation unless you chose another). Earnings are higher than the draw, because part of what the money earns must stay invested so that it lasts.",
  ],
});
/* Part of knOne() in metrics.js. On the sheet of the FI ratio, adds one line with the "i". */
function knOneFir(h) {
  try {
    if (W.id !== "firatio") return h;
    return (
      h +
      `<div class="tile row between firinfo" style="gap:8px"><span class="small">How is this different from While you slept?</span><button class="term" data-a="info" data-k="gloss:firslept" aria-label="FI ratio and While you slept: what is the difference?">i</button></div>`
    );
  } catch (e) {
    report(e, "coast.js: knOneFir");
    return h;
  }
}
/* Part of knMetrics() in metrics.js. Adds the FI ratio to the group "Freedom". */
function knMetricsFir(c, add) {
  try {
    const F = firCalc(c),
      r = F.ratio;
    add({
      id: "firatio",
      g: "free",
      n: "FI ratio",
      what: "How much of your monthly spending your investments could pay for, if you started to draw on them today.",
      num: r,
      val: r == null ? "?" : knPct(Math.min(r, 9.99)),
      st: F.st,
      zone:
        r == null
          ? null
          : r >= 1
            ? ["Your investments could pay for all of it", "good"]
            : ["Part of each month is already paid for", "none"],
      bar: r == null ? null : { p: Math.min(1, r) * 100, marks: [] },
      rule: [
        "Investment income here is what your investments can pay each year at " +
          Math.round(SWR * 100) +
          "%, the same rate as your freedom number. At 100% work is optional.",
      ],
      math: [
        "Invested: " + money(F.inv),
        money(F.inv) + " × " + Math.round(SWR * 100) + "% ÷ 12 = " + money(Math.round(F.income)) + " a month",
        "Spending: " + money(F.spend) + " a month",
        r == null ? null : money(Math.round(F.income)) + " ÷ " + money(F.spend) + " = " + knPct(r),
      ],
      go: ["See the big picture", "tab", "map"],
    });
  } catch (e) {
    report(e, "coast.js: knMetricsFir");
  }
}
/* The Coast card: is the Coast number reached, is the number real, and did the player close the card. */
function cstCalc(c, d) {
  d = d || derive(c);
  const st = knSt(knRows(c).sp, c.invs || []),
    seen = (c.x && c.x.coast && c.x.coast.seen) || null,
    reached = d.coastNum > 0 && d.toRet > 0 && !!d.g[7];
  /* Back under Coast, after the card was closed. Not on a Guess. Closed for one month at a time. */
  const open = !!seen && !reached && d.coastNum > 0 && d.toRet > 0 && st !== "Guess",
    K = open
      ? rcCoast({
          invested: c.inv || 0,
          coast: d.coastNum,
          monthly: d.save / 12,
          realReturn: R,
          nowAt: todayISO(),
          maxMonths: Math.round(d.toRet * 12),
        })
      : null,
    month = rcYm(todayISO());
  return {
    coast: d.coastNum,
    inv: c.inv || 0,
    ret: c.ret,
    st,
    reached,
    seen,
    show: reached && !seen && st !== "Guess",
    below:
      K && K.below
        ? Object.assign({}, K, {
            words: rcCoastWords(K),
            month,
            monthly: d.save / 12,
            show: !(c.x && c.x.coast && c.x.coast.below === month),
          })
        : null,
  };
}
/* The FIRE statuses of the player: one list for Home, the route card, the life map and the journey.
   opt (the life timeline, lifeline.js): a what-if of the plan run (goalSim: monthly, once). It moves the dates
   that come from the plan run (Lean, FI). The Coast date is counted from today's saving, so it stays. */
function stGame(c, d, opt) {
  d = d || derive(c);
  const inv = c.inv || 0,
    RW = knRows(c),
    st = knSt(RW.sp, c.invs || []),
    need = rsum(RW.needs),
    wants = Math.max(0, (c.spend || 0) - need),
    lean = RW.needs.length && need > 0 && wants > 0 ? fiNeed(c, c.age, { passive: wants }) : null,
    X = (c.x && c.x.coast) || {},
    pct = Math.round(SWR * 100) + "%",
    coastOn = d.coastNum > 0 && d.toRet > 0;
  let fiM = null,
    leanM = null;
  try {
    fiM = freeAt(c, opt);
    leanM = lean == null ? null : freeAt(c, Object.assign({}, opt, { passive: wants }));
  } catch (e) {
    report(e, "coast.js: stGame");
  }
  const K = coastOn
      ? rcCoast({
          invested: inv,
          coast: d.coastNum,
          monthly: d.save / 12,
          realReturn: R,
          nowAt: todayISO(),
          maxMonths: Math.round(d.toRet * 12),
        })
      : null,
    off = ["The game does not work this number out yet"],
    items = [
      {
        key: "Coast",
        value: coastOn ? d.coastNum : null,
        months: K ? K.months : null,
        needs: ["Your age and the age you stop"],
        math: [
          "Your Coast number for age " + c.ret + ": " + money(Math.round(d.coastNum)) + ".",
          "It is your freedom number at that age, brought back to today at the return of your plan.",
        ],
      },
      {
        key: "Lean",
        value: lean,
        months: leanM,
        needs: ["Your spending lines, with needs and fun apart"],
        math:
          lean == null
            ? []
            : [
                "Needs: " +
                  money(need) +
                  " a month of the " +
                  money(c.spend || 0) +
                  " you spend. Fun and everything else: " +
                  money(wants) +
                  ".",
                "Your freedom number with only the needs to pay: " +
                  money(Math.round(lean)) +
                  ". The date is your plan run month by month.",
              ],
      },
      { key: "Barista", value: null, needs: off },
      {
        key: "FI",
        value: d.fi > 0 ? d.fi : null,
        months: fiM,
        needs: ["Your spending"],
        math: ["Your freedom number: " + money(Math.round(d.fi)) + ". The date is your plan run month by month."],
      },
      { key: "Chubby", value: null, needs: off },
      { key: "Fat", value: null, needs: off },
    ],
    list = stList({
      invested: inv,
      known: st !== "Guess",
      level: st,
      nowYm: rcYm(todayISO()),
      items,
      options: ST_OPTIONS.statuses,
      money: v => money(Math.round(v)),
      seen: Object.assign({}, X.st || {}, X.seen ? { Coast: X.seen } : {}),
    }),
    month = rcYm(todayISO());
  return {
    st,
    list,
    markers: stMarkers(list),
    card: stCard(list),
    below: stBelow(list, {
      hidden: Object.assign({}, X.stb || {}, X.below ? { Coast: X.below } : {}),
      month,
      money: v => money(Math.round(v)),
    }),
    line: stLine(list, { money: v => money(Math.round(v)) }),
    month,
  };
}
/* The options of one status: each one is a button to a tool of the game. */
function stOptionsHtml(opts) {
  return (opts || [])
    .map(
      o =>
        `<button class="rowbtn stopt" data-a="${esc(o.game)}" data-fid="st:${esc(o.id)}"><span class="stack" style="gap:2px;text-align:left"><b class="small">${esc(o.t)}</b><span class="tiny muted">${esc(o.why)}</span></span><span class="tiny">View <i class=chev aria-hidden=true></i></span></button>`
    )
    .join("");
}
/* The card of a status that was just reached. One time. The next step does not change. */
function stCardHtml(K, c) {
  const coast = c.key === "Coast";
  return `<div class="card stack homerow rskeep stcard${coast ? " coastcard" : ""}" data-st="${esc(c.key)}" style="gap:8px"><div class="row between"><b>${esc(c.title)}</b>${kitPill(K.st)}</div><div class="small">${esc(c.changed)}</div>${mathBox(c.math)}<div class="dklabel">${esc(c.heading)}</div>${stOptionsHtml(c.options)}<div class="small"><b>${esc(c.stay)}</b></div><button class="ghost slim" data-a="${coast ? "coastok" : "stok"}" data-v="${esc(c.key)}">Got it</button></div>`;
}
/* Back under a status after its card was closed: the quiet line "Recalculating". Not a warning. */
function stBelowHtml(K, b) {
  const coast = b.key === "Coast";
  return `<div class="card stack homerow rskeep stbelow${coast ? " coastbelow" : ""}" data-st="${esc(b.key)}" style="gap:8px"><div class="row between"><b>${esc(b.title)}</b>${kitPill(K.st)}</div><div class="small">${esc(b.line)}</div><div class="tiny muted">${esc(b.next)}</div>${mathBox(b.math)}<button class="ghost slim" data-a="${coast ? "coastbelowok" : "stbelowok"}" data-v="${esc(b.key)}">Got it</button></div>`;
}
/* Part of home() in ui.js. One calm card under the top numbers: a status that was just reached ("You can
   stop sprinting" is the Coast case), or the quiet line when the invested money is under a status again. */
function homeCoastCard(h) {
  try {
    const c = C();
    if (!c || !(c.placed || G.demo) || typeof homeRowAdd !== "function") return h;
    const K = stGame(c);
    if (K.below) return homeRowAdd(h, stBelowHtml(K, K.below));
    if (!K.card) return h;
    return homeRowAdd(h, stCardHtml(K, K.card));
  } catch (e) {
    report(e, "coast.js: homeCoastCard");
    return h;
  }
}
/* Part of rsRouteCard() in results.js. One line on the card "You are here": the statuses reached, and the next. */
function rsRouteStatus(c, d) {
  try {
    const K = stGame(c, d),
      M = K.st === "Guess" ? K.markers.filter(m => m.reached) : K.markers;
    if (!M.length) return "";
    const next = M.find(m => !m.reached),
      done = M.filter(m => m.reached);
    return `<span class="tiny muted rsst" data-fid="rs:status">${done.length ? "Status reached: " + esc(done.map(m => m.name).join(", ")) + ". " : ""}${next ? "Next status: " + esc(next.name) + ", " + esc(next.when) + "." : ""}</span>`;
  } catch (e) {
    report(e, "coast.js: rsRouteStatus");
    return "";
  }
}
/* The sheet of one status: its number, its date, the level, the math, and the options it opens. */
function stSheet() {
  const c = C(),
    K = stGame(c),
    s = K.list.find(x => x.key === W.k) || K.list[0];
  return (
    head("FIRE status", esc(s.full)) +
    `<div class="row wrap" style="gap:6px"><span class="pill">${s.value == null ? "No number yet" : s.reached ? "Reached" : "On the way"}</span>${kitPill(K.st)}</div>` +
    `<div class="tile stack" style="gap:6px"><div class="small"><span class="muted">What</span> ${esc(s.what)}</div>` +
    (s.value == null
      ? `<div class="small muted">${esc(s.needs.join(". "))}.</div>`
      : `<div class="small"><span class="muted">The number</span> <b class="${K.st === "Guess" ? "guess" : ""}">${money(Math.round(s.value))}</b></div><div class="small"><span class="muted">The date</span> <b>${esc(K.st === "Guess" && !s.reached ? "After your own numbers are in" : s.when)}</b></div>${mathBox(s.math)}`) +
    `</div>` +
    `<div class="dklabel">${esc(ST_HEADING)}</div><div class="tiny muted">${s.reached ? esc(ST_STAY) : "These open when you reach this status. You can look now. Your next step stays the same."}</div>` +
    `<div class="stack" style="gap:6px">${stOptionsHtml(s.options)}</div>` +
    (typeof rcpNextRow === "function" ? rcpNextRow() : "")
  );
}
/* The rows for the spreadsheet of the plan. */
function cstBook(c) {
  const F = firCalc(c),
    d = derive(c),
    K = cstCalc(c, d),
    L = stGame(c, d).list.find(x => x.key === "Lean");
  return {
    title: "FI ratio and Coast",
    rows: [
      { id: "fr_inv", label: "Invested", v: F.inv, note: "Your number" },
      { id: "fr_rate", label: "Withdrawal rate of the game", v: SWR, note: "The same rate as the freedom number" },
      { id: "fr_income", label: "Investment income a month", v: F.income, f: "={fr_inv}*{fr_rate}/12" },
      { id: "fr_spend", label: "Spending a month", v: F.spend, note: "Your number" },
      {
        id: "fr_ratio",
        label: "FI ratio",
        v: F.ratio == null ? "" : F.ratio,
        f: F.ratio == null ? "" : "={fr_income}/{fr_spend}",
      },
      {
        id: "fr_coast",
        label: "Coast number",
        v: d.coastNum,
        note: "From the game: the freedom number at your stop age, brought back to today",
      },
      { id: "fr_over", label: "Invested less the Coast number", v: F.inv - d.coastNum, f: "={fr_inv}-{fr_coast}" },
      {
        id: "fr_back",
        label: "Months back to the Coast number",
        v: K.below ? (K.below.months == null ? "" : K.below.months) : "",
        note: "Only when the invested money fell under the Coast number after you reached it. From the game: counted month by month",
      },
      {
        id: "fr_need",
        label: "Needs a month (every spending line but fun)",
        v: rsum(knRows(c).needs),
        note: "Your numbers",
      },
      {
        id: "fr_lean",
        label: "Lean status number",
        v: L && L.value != null ? L.value : "",
        note: "From the game: the freedom number with only the needs to pay",
      },
      {
        id: "fr_leanover",
        label: "Invested less the Lean number",
        v: L && L.value != null ? F.inv - L.value : "",
        f: L && L.value != null ? "={fr_inv}-{fr_lean}" : "",
      },
    ],
  };
}
Object.assign(ACT, {
  ltstatus: t => {
    W = { kind: "ststatus", k: ST_KEYS.includes(t.dataset.v) ? t.dataset.v : "Coast" };
    sheet(stSheet);
  },
  stok: t => {
    const c = C(),
      S = kitStore(c, "coast");
    if (!ST_KEYS.includes(t.dataset.v)) return;
    S.st = Object.assign({}, S.st || {}, { [t.dataset.v]: todayISO() });
    save();
    render();
  },
  stbelowok: t => {
    const c = C(),
      S = kitStore(c, "coast");
    if (!ST_KEYS.includes(t.dataset.v)) return;
    S.stb = Object.assign({}, S.stb || {}, { [t.dataset.v]: rcYm(todayISO()) });
    save();
    render();
  },
  coastok: () => {
    const c = C();
    kitStore(c, "coast").seen = todayISO();
    save();
    render();
  },
  coastbelowok: () => {
    const c = C();
    kitStore(c, "coast").below = rcYm(todayISO());
    save();
    render();
  },
});
