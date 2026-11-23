/* ============================================================================
   SLAM the Game: features/nextacct.js
   PURPOSE     Which account next, up to each limit. The steps and the accounts in order, each with its
               2026 limit, what goes in now, and the room that is left. One line says where the next
               dollar goes. The player can add extra dollars a month and see where they land.
   INPUT       The profile: c.take, c.spend, c.match, the cash, the high-interest debt, the pre-tax
               contributions (the key numbers), the HSA answer (c.x.es.a.hsa), c.x.nextacct (the extra
               dollars). data/limits2026.js. The open sheet (W.kind): nxa.
   OUTPUT      Functions: nxaRows, nxaCalc, nxaBook, nxaSheet. Actions (ACT): nxa. Menu: "Which account
               next".
   DEPENDS ON  data/limits2026.js, core/engine.js, screens/ui.js, core/metrics.js, features/eras.js
               (acRec: Roth or traditional first), features/paths.js (pathsBase: the steps before the
               accounts and their amounts), features/kit.js.
   RULES       The order is the order of the two paths and of "Which account first": the small cushion,
               the full match, high-interest debt, the full cushion, then the tax-favored accounts (an
               HSA when the plan allows it, then the Roth IRA and the plan at work in the order of
               acRec), then a regular account, which has no limit. The limits are for one person under
               50, for 2026. The money is what the player keeps each month (take-home minus spending).
               Pre-tax contributions that come out of the paycheck count as already in the plan at work.
               This is a rule of thumb, not tax advice, and the screen says so.
   ========================================================================= */
const NXA_EXTRA = [0, 100, 250, 500, 1000, 2000];
/* THE ROWS, in order, before any money is placed. need: dollars to finish a step. cap: dollars a month
   that an account can still take this year. limit: the 2026 limit a year. already: dollars a month that
   go in from the paycheck. */
function nxaRows(c) {
  const B = pathsBase(c, pathsAssume(c)),
    Rc = acRec(c, B.d),
    lim = LIMITS_2026,
    two = c.rel === "Married",
    cash = B.d.cash || 0,
    preGot = knGot(c, "pre"),
    pre = preGot && preGot.v > 0 ? preGot.v : 0,
    rows = [
      {
        k: "cushion1",
        n: "The small cushion (your deductibles)",
        term: "nxacush",
        need: Math.max(0, B.starter - cash),
      },
      {
        k: "match",
        n: "Your job's full match",
        term: "nxamatch",
        limit: B.matchNeed * 12,
        cap: B.matchNeed,
        off: c.match === "no" ? null : c.match === "yes" ? "You get all of it" : "No match to get",
      },
      { k: "debt", n: "High-interest debt", term: "nxadebt", need: B.hi },
      {
        k: "cushion2",
        n: "The full cushion",
        term: "nxacush",
        need: Math.max(0, B.target - Math.max(cash, B.starter)),
      },
    ],
    hsa = {
      k: "hsa",
      n: "Your HSA",
      term: "nxahsa",
      limit: B.hsa > 0 ? (two ? lim.hsaFamily : lim.hsaOne) : 0,
      cap: B.hsa,
      off: B.hsa > 0 ? null : "Only with a health plan that allows it",
    },
    ira = { k: "roth", n: "Your Roth IRA", term: "nxaira", limit: lim.ira, cap: lim.ira / 12 },
    plan = {
      k: "k401",
      n: "Your plan at work (401k)" + (Rc.roth ? "" : ", as traditional"),
      term: "nxak401",
      limit: lim.k401,
      cap: B.k401,
      already: pre,
    };
  rows.push(hsa);
  if (Rc.roth) rows.push(ira, plan);
  else rows.push(plan, ira);
  rows.push({ k: "taxable", n: "A regular investing account", term: "nxatax", limit: null, cap: Infinity });
  return { rows, B, Rc, pre };
}
/* PLACE THE MONEY. Each row gets dollars in order, up to its need or its room. The next dollar goes to
   the first row that still has room. over.extra adds dollars a month. */
function nxaCalc(c, over) {
  over = over || {};
  const X = nxaRows(c),
    extra = over.extra != null ? { v: over.extra, cf: 2 } : kitValue(c, "nextacct", "extra", 0),
    kept = X.B.kept,
    money0 = kept + extra.v;
  let left = money0,
    matchIn = 0;
  const rows = X.rows.map(r => {
    const step = r.need != null,
      /* the match goes into the plan at work, so it uses room of that plan */
      already = r.k === "k401" ? (r.already || 0) + matchIn : 0,
      room = step ? r.need : r.cap,
      put = Math.max(0, Math.min(left, room));
    left -= put;
    if (r.k === "match") matchIn = put;
    const nowY = step ? null : (already + put) * 12,
      roomY = step ? Math.max(0, r.need - put) : r.limit == null ? null : Math.max(0, r.limit - nowY);
    return Object.assign({}, r, {
      step,
      put,
      nowY,
      roomY: r.k === "match" ? Math.max(0, r.limit - put * 12) : roomY,
      full: r.off
        ? true
        : step
          ? r.need - put <= 0.5
          : r.limit != null && (r.k === "match" ? r.limit - put * 12 : r.limit - nowY) <= 0.5,
    });
  });
  const next = rows.find(r => !r.full) || rows[rows.length - 1];
  return {
    rows,
    next,
    kept,
    extra: extra.v,
    money: money0,
    pre: X.pre,
    Rc: X.Rc,
    line: X.Rc.line,
    st: kitState([
      kitSharp(c, "take"),
      kitSharp(c, "spend"),
      { cf: X.Rc.st === "Guess" ? 1 : X.Rc.st === "Close" ? 2 : 3 },
    ]),
  };
}
function nxaBook(c) {
  const K = nxaCalc(c),
    rows = [
      { id: "nx_kept", label: "What you keep each month", v: K.kept, note: "Take-home minus spending" },
      { id: "nx_extra", label: "Extra dollars a month you try", v: K.extra, note: "Your answer" },
      { id: "nx_money", label: "Money to place each month", v: K.money, f: "={nx_kept}+{nx_extra}" },
    ];
  K.rows
    .filter(r => !r.step && r.limit != null && !r.off && r.k !== "match")
    .forEach(r => {
      const p = "nx_" + r.k + "_";
      rows.push(
        { id: p + "lim", label: r.n + ": the 2026 limit", v: r.limit, note: LIMITS_2026.source },
        {
          id: p + "now",
          label: r.n + ": going in, a year",
          v: r.nowY,
          note: "Worked out by the game, in the order of the accounts",
        },
        { id: p + "room", label: r.n + ": room left this year", v: r.roomY, f: "=MAX(0,{" + p + "lim}-{" + p + "now})" }
      );
    });
  rows.push({ id: "nx_next", label: "Where the next dollar goes", v: K.next.n, note: "The first row with room" });
  return { title: "Which account next", rows };
}
function nxaSheet() {
  const c = C(),
    K = nxaCalc(c),
    row = r => {
      const isNext = r === K.next,
        right = r.off
          ? esc(r.off)
          : r.step
            ? r.need <= 0.5
              ? "Done"
              : money(Math.round(r.put)) + " this month · " + money(Math.round(r.roomY)) + " to go"
            : r.limit == null
              ? money(Math.round(r.put)) + " a month · no limit"
              : money(Math.round(r.k === "match" ? r.put * 12 : r.nowY)) + " of " + money(r.limit) + " a year";
      return `<div class="tile stack nxarow ${isNext ? "kithot" : ""}" style="gap:2px"><div class="row between" style="gap:8px"><b class="small">${esc(r.n)} ${kitInfo(r.term)}</b>${isNext ? `<span class="pill kitst">Next dollar</span>` : r.full ? `<span class="tiny muted">Full ✓</span>` : ""}</div><div class="small">${right}</div>${!r.step && r.limit != null && !r.off ? `<div class="tiny muted">Room left this year: ${money(Math.round(r.roomY))}${r.put > 0 ? " · " + money(Math.round(r.put)) + " a month from what you keep" : ""}</div>` : ""}</div>`;
    };
  let h =
    head("Plan", "Which account next") +
    kitTile(
      "Where your next dollar goes",
      esc(K.next.n),
      "You place " +
        money(Math.round(K.money)) +
        " a month" +
        (K.extra ? " (" + money(K.kept) + " you keep, plus " + money(K.extra) + " extra)" : "") +
        ". Each row fills up to its limit, then the money moves to the next row.",
      K.st,
      "nxanext"
    ) +
    `<div class="small">${esc(K.line)} <button class="linkish" data-a="acwhy">Why this order</button></div>` +
    `<div class="row between small"><b>In order, up to each limit ${kitInfo("nxalimit")}</b></div><div class="stack" style="gap:6px">${K.rows.map(row).join("")}</div>`;
  h += kitAsk(
    c,
    "nextacct",
    "extra",
    "Try extra dollars a month",
    NXA_EXTRA.map(v => [v, v ? "+" + money(v) : "None"]),
    0,
    {
      term: "nxaextra",
      typed: true,
      help: "See where a raise or a cut in spending would land.",
    }
  );
  h += mathBox([
    "Money to place: " +
      money(K.kept) +
      " a month you keep (take-home minus spending)" +
      (K.extra ? " + " + money(K.extra) + " extra" : "") +
      ".",
    "2026 limits for one person under 50: plan at work " +
      money(LIMITS_2026.k401) +
      ", IRA " +
      money(LIMITS_2026.ira) +
      ", HSA " +
      money(LIMITS_2026.hsaOne) +
      " (one person) or " +
      money(LIMITS_2026.hsaFamily) +
      " (a family). Source: " +
      LIMITS_2026.source +
      ".",
    "Going in a year = 12 × (what comes out of your paycheck before tax" +
      (K.pre > 0 ? ", " + money(Math.round(K.pre)) + " a month," : "") +
      " + what is placed here). Room left = the limit minus that.",
    "The match is the amount you must put in to get all of it. It goes into the plan at work, so it uses room of that plan.",
    "Roth or traditional first: " +
      (K.Rc.roth
        ? "Roth first, because your tax rate today is low or no higher than later."
        : "traditional first, because your tax rate today is higher than later.") +
      ' The screen "Which account first" shows the reason.',
    "Not counted: the extra room from age 50, a second IRA for a spouse, and the income limits on a Roth IRA. This is a rule of thumb, not tax advice.",
  ]);
  h += `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="paths">See the two paths</button><button class="ghost" style="flex:1" data-a="taxv">Your tax view</button></div>`;
  return h;
}
kitTerms({
  nxanext: [
    "The next dollar",
    "The first step or account in the order that still has room. One more dollar a month goes there.",
  ],
  nxalimit: [
    "Limit",
    "The most the law lets one person put into an account in one year. The game uses the 2026 limits.",
  ],
  nxacush: [
    "Cushion",
    "Cash for a surprise. First a small one (about your insurance deductibles), later a full one (months of spending).",
  ],
  nxamatch: [
    "The match",
    "Money your job adds to your retirement plan when you put money in. Getting all of it comes before almost everything else.",
  ],
  nxadebt: ["High-interest debt", "Debt that charges 8% a year or more. Paying it off is a sure return."],
  nxahsa: [
    "HSA",
    "A health savings account. No tax going in, growing, or coming out for medical costs. Only some health plans allow one.",
  ],
  nxaira: ["Roth IRA", "A retirement account you open yourself. You pay tax now, and the growth is never taxed."],
  nxak401: [
    "Plan at work (401k)",
    "The retirement plan of your job. Money goes in from your paycheck. Traditional: no tax now, tax later. Roth: tax now, none later.",
  ],
  nxatax: [
    "Regular investing account",
    "An investing account with no tax break and no limit. You can take the money out at any age.",
  ],
  nxaextra: ["Extra dollars", "A what-if amount on top of what you keep now. It changes nothing in your numbers."],
});
kitScreen(
  "nxa",
  "Which account next",
  "Your steps and accounts in order, each with its 2026 limit, what goes in now, and the room left.",
  "One line shows where your next dollar goes."
);
Object.assign(ACT, {
  nxa: () => {
    W = { kind: "nxa", o: {} };
    sheet(nxaSheet);
  },
});
kitMenu("Which account next", "nxa", "Each account up to its 2026 limit, and where the next dollar goes", "acwhy");
