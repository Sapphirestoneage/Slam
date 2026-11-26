/* ============================================================================
   SLAM the Game: features/nets.js
   PURPOSE     Safety nets (run Finish everything partly built, Part 15). Four life changes after the layoff
               in "Break in case of emergency": medical leave, a move, a breakup, a new baby. Each one shows
               how long the cash lasts, the lowest point, three tripwires with what the player would do,
               and Plan B. Also the card "How long at each level" (full life, DRAFTT, FAT, food and housing
               only) with the Rule of 5 beside it, on the Dip tab of the layoff.
   INPUT       The profile: c.x.nt_medical, c.x.nt_move, c.x.nt_breakup, c.x.nt_baby (the taps, as
               { v, cf }), c.x.ntTrip (the tripwire picks). The open sheet (W.kind transit, W.ev).
   OUTPUT      Functions: ntTapsOf, ntBase, ntCalc, ntKindRow, ntBody, ntLevelsOf, ntLevels, ntBook.
               Actions (ACT): ntkind, nttrip. Parts of functions in other files: trSheet (transit.js)
               calls ntKindRow, ntBody and ntLevels.
   DEPENDS ON  core/safetynet.js (the math: ntEvent, ntRun, ntTrips, ntPlanB, ntDegrade, NT_REF),
               features/drills.js (fdBase), features/kit.js (kitAsk, kitStore), screens/dash.js
               (dkCard, dkStatRow, dkTile, dkPill), screens/ui.js (esc, money, mathBox, save, drawSheet).
   RULES       The math is in core/safetynet.js, the same code as js/math/safetynet.js of the web app. A
               tap the player did not give is a Guess. No red. The words never blame the player.
   ========================================================================= */
const NT_EVS = [
  ["layoff", "Layoff"],
  ["medical", "Medical leave"],
  ["move", "A move"],
  ["breakup", "A breakup"],
  ["baby", "A new baby"],
];
/* The taps the player gave for one change. */
function ntTapsOf(c, kind) {
  const s = kitStore(c, "nt_" + kind),
    o = {};
  (NT_TAPS[kind] || []).forEach(d => {
    if (s[d[0]] && s[d[0]].v != null) o[d[0]] = s[d[0]].v;
  });
  return o;
}
/* What the change starts from: cash, spending, take-home, the biggest pay, housing, the basics. */
function ntBase(c, d) {
  const B = fdBase(c, d),
    rows = c.led ? c.spends || [] : [],
    home = rows.filter(r => r.k === "Home").reduce((a, r) => a + (r.amt || 0), 0),
    main = (c.incs || []).slice().sort((a, b) => (b.amt || 0) - (a.amt || 0))[0];
  return {
    cash: B.cash,
    burn: B.spend,
    income: B.take,
    pay: c.led && main ? main.amt || 0 : B.take,
    housing: rows.length ? home : null,
    basics: B.needs != null && B.needs > 0 ? B.needs : B.spend,
    real: B.real.cash && B.real.spend && B.real.take,
  };
}
/* THE MATH of one change, from the core. */
function ntCalc(c, kind) {
  const d = derive(c),
    b = ntBase(c, d),
    taps = ntTapsOf(c, kind),
    E = ntEvent(kind, taps, { pay: b.pay, housing: b.housing }, { dbl: NT_REF.leave.dbl, pfl: NT_REF.leave.pfl }),
    args = { cash: b.cash, burn: b.burn, income: b.income, flows: E.flows },
    run = ntRun(args),
    picks = ((c.x && c.x.ntTrip) || {})[kind] || {},
    trips = ntTrips(run, b.basics, [3, 2, 1], picks),
    planBurn = b.basics < b.burn ? b.basics : b.burn * 0.8,
    B = ntPlanB(args, planBurn),
    nets = NT_REF.nets[(NT_KINDS.find(k => k.id === kind) || {}).template] || { trips: [], planB: [], link: null };
  return {
    kind,
    b,
    E,
    run,
    trips,
    B,
    planBurn,
    byBasics: b.basics < b.burn,
    nets,
    st: b.real && !E.guess ? "Close" : "Guess",
  };
}
/* The tap row "What is happening" at the top of the sheet. */
function ntKindRow(ev) {
  return `<div class="chips" role="group" aria-label="What is happening" style="margin:6px 0">${NT_EVS.map(e => `<button class="chip ${e[0] === ev ? "on" : ""}" data-a="ntkind" data-v="${e[0]}">${esc(e[1])}</button>`).join("")}</div>`;
}
function ntMo(n) {
  return n == null ? "It carries you through" : n >= 24 ? (n / 12).toFixed(1) + " years" : n.toFixed(1) + " months";
}
/* The sheet for one change. */
function ntBody(c, kind) {
  const T = ntCalc(c, kind),
    M = v => money(Math.round(v)),
    gs = T.st === "Guess",
    R = T.run,
    name = (NT_KINDS.find(k => k.id === kind) || {}).short || kind;
  if (!R.ready)
    return dkCard(
      "Your answer",
      `<div class="small">Add your cash and spending in My Money and the answer shows here.</div>`
    );
  const tiles = dkStatRow([
    dkTile("Your cash lasts", R.lasts ? "Through it" : ntMo(R.runway), { sub: "with " + name, guess: gs }),
    dkTile("Lowest point", M(Math.max(0, R.lowest)), {
      sub: !R.lasts
        ? "the cash runs out in " + dkMonth(Math.floor(R.runway))
        : R.lowestK
          ? "in " + dkMonth(R.lowestK)
          : "today",
      guess: gs,
    }),
    dkTile("Plan B", T.B.lasts ? "Through it" : ntMo(T.B.run.runway), {
      sub: T.byBasics ? "at the basics" : "trim 20%",
      guess: gs,
    }),
    dkTile("One-time costs", M(T.E.once), { sub: "at the start", guess: gs }),
  ]);
  const asks = NT_TAPS[kind]
    .map(t =>
      kitAsk(
        c,
        "nt_" + kind,
        t[0],
        t[1],
        t[2].map(o => [o[0], o[1]]),
        t[3]
      )
    )
    .join("");
  const trips = T.trips
    .map(r => {
      const opts = ((T.nets.trips || []).find(x => x[0] === r.months) || [0, []])[1];
      return `<div class="tile stack" style="gap:6px"><div class="row between"><b class="small">${r.months} ${r.months === 1 ? "month" : "months"} of the basics left: ${M(r.level)}</b>${dkPill(r.now ? "You are there now" : r.k == null ? "Not reached" : "About " + dkMonth(r.k))}</div><div class="chips">${opts.map(o => `<button class="chip ${r.pick === o ? "on" : ""}" data-a="nttrip" data-k="${kind}|${r.months}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`;
    })
    .join("");
  const planB =
    `<div class="small">${T.byBasics ? "Spend only the basics (" + M(T.planBurn) + " a month) from the start" : "Trim 20% (" + M(T.b.burn - T.planBurn) + " a month) from the start"}: ${T.B.lasts ? "the cash carries you through." : "the cash lasts " + ntMo(T.B.run.runway) + (T.B.more != null && T.B.more > 0.05 ? ", " + ntMo(T.B.more) + " more." : ".")}</div>` +
    ((T.nets.planB || []).length
      ? `<div class="stack" style="gap:4px;margin-top:6px">${T.nets.planB.map(w => `<div class="tiny muted">${esc(w)}</div>`).join("")}</div>`
      : "") +
    (T.nets.link && T.nets.link.game
      ? `<button class="ghost slim" style="margin-top:8px" data-a="hard" data-v="${esc(T.nets.link.game)}">${esc(T.nets.link.label)}</button>`
      : "");
  const math = mathBox(
    ["Each month: " + M(T.b.income) + " coming in, " + M(T.b.burn) + " going out, then what changes."]
      .concat(
        T.E.flows.map(
          f =>
            f.label +
            ": " +
            (f.monthly > 0 ? "plus " : "minus ") +
            M(Math.abs(f.monthly)) +
            (f.toK - f.fromK === 1 && f.fromK === 0
              ? " once"
              : f.toK === Infinity
                ? " a month from here on"
                : " a month for " + ntMo(f.toK - f.fromK))
        )
      )
      .concat([
        "The cash at the end of each month: the cash before + what comes in - what goes out.",
        T.E.needs.indexOf("pay") >= 0 ? "Add your pay in My Money to count the leave." : null,
        T.E.needs.indexOf("housing") >= 0 ? "Add Home in My Money to count the deposit." : null,
      ])
      .filter(Boolean)
  );
  return (
    tiles +
    (gs ? `<div class="tiny muted">Some taps are starting guesses, so this is a Guess. Tap yours below.</div>` : "") +
    dkCard("What changes", asks) +
    dkCard("Tripwires", trips, {
      cap: "Decide now what you would do at each level. A choice made on a calm day is easier to keep.",
    }) +
    dkCard("Plan B", planB) +
    math
  );
}
/* THE MATH of the levels: the months at each level with what still comes in during the layoff. */
function ntLevelsOf(c, T) {
  const d = derive(c),
    rows = c.led ? c.spends || [] : [],
    g = k => rows.filter(r => r.k === k).reduce((a, r) => a + (r.amt || 0), 0),
    has = rows.length > 0,
    levels = [
      { id: "full", name: "Full life", burn: c.spend || 0 },
      {
        id: "draftt",
        name: "DRAFTT needs: home, food, getting around, bills",
        burn: has ? g("Home") + g("Food") + g("Getting around") + g("Bills and subscriptions") : null,
      },
      {
        id: "fat",
        name: "FAT: food, accommodation, transportation",
        burn: has ? g("Home") + g("Food") + g("Getting around") : null,
      },
      { id: "food", name: "Food and housing only", burn: has ? g("Home") + g("Food") : null },
    ];
  return { rows: ntDegrade({ cash: T.cash, income: T.other + T.inMo, levels }), r5: d.target, spend: c.spend || 0 };
}
/* Part of trSheet() in transit.js, on the Dip tab: How long at each level, with the Rule of 5 beside it. */
function ntLevels(c, T) {
  const L = ntLevelsOf(c, T),
    M = v => money(Math.round(v));
  const rows = L.rows
    .map(
      l =>
        `<div class="row between" style="gap:8px;padding:6px 0"><span class="small">${esc(l.name)}<div class="tiny muted">${l.burn == null ? "Fill in where your money goes in My Money" : M(l.burn) + " a month"}</div></span><b class="small">${l.burn == null ? "" : l.lasts || l.months == null ? "Through it" : ntMo(l.months)}</b></div>`
    )
    .join("");
  const five =
    L.r5 > 0
      ? `<div class="tile small"><b>The Rule of 5: ${L.r5.toFixed(1)} months</b> of spending in cash at your age (your age ÷ 5), ${M(L.r5 * L.spend)}.</div>`
      : "";
  return dkCard("How long at each level", rows + five, {
    cap: "With what still comes in. Each level gives up more, and buys more months.",
  });
}
/* The spreadsheet of the plan: the change the player looked at last, and its run. */
function ntBook(c) {
  const kind = (c.x && c.x.ntLast) || null;
  if (!kind) return null;
  const T = ntCalc(c, kind);
  if (!T.run.ready) return null;
  return {
    title: "Safety nets: " + (NT_KINDS.find(k => k.id === kind) || {}).name,
    rows: [
      { id: "nt_cash", label: "Cash", v: T.b.cash },
      { id: "nt_in", label: "Coming in a month", v: T.b.income },
      { id: "nt_out", label: "Going out a month", v: T.b.burn },
      { id: "nt_once", label: "One-time costs at the start", v: T.E.once },
      { id: "nt_low", label: "The lowest point (worked month by month in the game)", v: Math.max(0, T.run.lowest) },
    ],
  };
}
Object.assign(ACT, {
  ntkind: t => {
    if (!W) return;
    W.ev = t.dataset.v;
    const c = C();
    if (c && W.ev !== "layoff") {
      c.x = c.x || {};
      c.x.ntLast = W.ev;
      save();
    }
    drawSheet();
  },
  nttrip: t => {
    const c = C(),
      p = t.dataset.k.split("|");
    c.x = c.x || {};
    c.x.ntTrip = c.x.ntTrip || {};
    const m = (c.x.ntTrip[p[0]] = c.x.ntTrip[p[0]] || {});
    m[p[1]] = m[p[1]] === t.dataset.v ? null : t.dataset.v;
    save();
    drawSheet();
  },
});
