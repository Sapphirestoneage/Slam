/* ============================================================================
   SLAM the Game: features/transit.js
   PURPOSE     Life Transitions: "Break in case of emergency", on My Goals. It turns panic into a number.
               The first transition is a layoff, from the last paycheck to the next job. Five parts:
               (1) the dip: what the months with no pay cost, and how long the cash lasts, (2) tripwires:
               the cash levels that set off plan B, decided now, (3) help from family, counted as an
               asset at its risk, (4) quick income, sorted by the time to the first dollar, (5) slots
               and cards: the few things to run at one time, then the advantages the player has.
   INPUT       The profile: c.x.tr (the answers, as { v, cf }), c.x.trx (the taps: tripwires, cards,
               quick income, advantages). The open sheet (W.kind): transit, with W.tab and W.ev (what
               is happening: layoff, or a change of features/nets.js).
   OUTPUT      Functions: trCalc, trTrips, trSheet, trBook. Actions (ACT): transit, trtab, trtrip,
               trcard, trquick, tradv. Parts of functions in other files: goalsTabTransit (goalsTab in
               ux.js). Menu: "Break in case of emergency".
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, features/drills.js (ldOf, fdBase),
               features/kit.js.
   USES LATER  features/hard.js (trHardRow: the row Other hard moments), features/nets.js (ntKindRow,
               ntBody, ntLevels: the other life changes and the levels), behind a typeof test.
   RULES       The player sees plain labels. With the gamer switch, each slot shows its game word next
               to the plain word (Economic / Money, Military / Time, Diplomatic / People, Wildcard /
               Flex). Unemployment pay has no typical value: the amount is different in each state, so
               it stays at $0 until the player gives one. Help from family counts at a share that
               follows how sure it is. No red, and no verdict on a guess.
   ========================================================================= */
const TR_MONTHS = [
  [3, "3 months"],
  [6, "6 months"],
  [9, "9 months"],
  [12, "12 months"],
];
const TR_LEVEL = [
  ["full", "As I spend now"],
  ["lean", "Cut to the basics"],
];
const TR_UI = [
  [0, "None"],
  [1000, "$1,000"],
  [1500, "$1,500"],
  [2000, "$2,000"],
];
const TR_SEV = [
  [0, "None"],
  [2000, "$2,000"],
  [5000, "$5,000"],
  [10000, "$10,000"],
];
const TR_FAM = [
  [0, "None"],
  [250, "$250"],
  [500, "$500"],
  [1000, "$1,000"],
];
/* How sure the help is, and the share of it that the plan counts. */
const TR_SURE = [
  ["sure", "They have said yes", 1],
  ["likely", "They likely would", 0.75],
  ["maybe", "Maybe", 0.5],
];
const TR_STRINGS = [
  ["none", "No strings"],
  ["some", "Some strings"],
  ["lot", "It would cost the relationship"],
];
const TR_QAMT = [
  [0, "None"],
  [250, "$250"],
  [500, "$500"],
  [1000, "$1,000"],
  [2000, "$2,000"],
];
/* Quick income, in the order of the time to the first dollar. */
const TR_QUICK = [
  ["sell", "Sell things you do not use", "Days"],
  ["gig", "Delivery or driving on an app", "Days"],
  ["temp", "Temp or shift work", "1 to 2 weeks"],
  ["trade", "Freelance the work you already do", "2 to 4 weeks"],
  ["teach", "Tutoring or coaching", "2 to 4 weeks"],
  ["room", "Rent out a room or a parking spot", "About a month"],
];
/* The tripwires: a cash level in months of basic costs, and the plan B choices for it. */
const TR_TRIP = [
  [3, "3 months of cash left", ["Cut to the basics", "Start quick income", "Widen the job search"]],
  [2, "2 months of cash left", ["Take a bridge job", "Ask family for the help", "Call lenders for hardship plans"]],
  [1, "1 month of cash left", ["Share housing or move", "Take any job", "Sell one big thing"]],
];
/* The four slots: [id, plain word, game word, the cards]. One card runs in each slot. */
const TR_SLOTS = [
  [
    "money",
    "Money",
    "Economic",
    ["Basics-only spending", "Minimum payments only on debts", "Pause investing until pay is back"],
  ],
  ["time", "Time", "Military", ["Job search first, 20 hours a week", "Quick income first", "Retrain for 3 months"]],
  ["people", "People", "Diplomatic", ["Tell family the number", "Ask 5 people for an introduction", "Share housing"]],
  ["flex", "Flex", "Wildcard", ["Take a bridge job", "Sell one big thing", "Move somewhere cheaper"]],
];
const TR_ADV = [
  "A partner with income",
  "Low rent, or family housing",
  "A trade, a license or a degree",
  "People who would vouch for me",
  "Health cover not tied to the job",
  "Nobody relies on me for money",
  "A place I could stay for free",
];
function trX(c) {
  c.x = c.x || {};
  return (c.x.trx = c.x.trx || { trip: {}, card: {}, quick: [], adv: [] });
}
function trSlotName(s) {
  return typeof G !== "undefined" && G && G.gamer ? s[2] + " / " + s[1] : s[1];
}
/* THE MATH of the dip. */
function trCalc(c) {
  const d = derive(c),
    g = (k, fb) => kitValue(c, "tr", k, fb),
    months = g("months", 6),
    level = g("level", "full"),
    ui = g("ui", 0),
    sev = g("sev", 0),
    fam = g("fam", 0),
    sure = g("sure", "maybe"),
    quick = g("quick", 0),
    B = fdBase(c, d),
    L = ldOf(c, d, level.v),
    Lb = ldOf(c, d, "lean"),
    share = (TR_SURE.find(s => s[0] === sure.v) || TR_SURE[2])[2],
    famCount = fam.v * share,
    cash = B.cash + sev.v,
    inMo = ui.v + famCount + quick.v,
    gap = Math.max(0, L.need - inMo),
    dip = gap * months.v,
    runway = gap > 0 ? cash / gap : null,
    left = cash - dip,
    real = B.real.cash && B.real.spend;
  return {
    months: months.v,
    level: L.level,
    out: L.out,
    other: L.other,
    need: L.need,
    basic: Lb.need,
    ui: ui.v,
    sev: sev.v,
    fam: fam.v,
    share,
    famCount,
    famAsset: famCount * months.v,
    quick: quick.v,
    cash,
    inMo,
    gap,
    dip,
    runway,
    left,
    short: Math.max(0, -left),
    covered: gap <= 0 || left >= 0,
    st: !real ? "Guess" : kitState([months, level, ui, fam, quick]),
    g,
  };
}
/* The tripwires: the cash level in dollars, and the month of the layoff when the cash gets there. */
function trTrips(c, T) {
  T = T || trCalc(c);
  return TR_TRIP.map(t => {
    const level = t[0] * T.basic,
      at = T.gap > 0 ? (T.cash - level) / T.gap : null;
    return { k: t[0], n: t[1], opts: t[2], level, at, now: T.cash <= level, pick: trX(c).trip[t[0]] || null };
  });
}
function trBook(c) {
  const T = trCalc(c);
  return {
    title: "Break in case of emergency: a layoff",
    rows: [
      { id: "tr_need", label: "Costs a month, after other income", v: T.need },
      { id: "tr_ui", label: "Unemployment pay a month", v: T.ui },
      { id: "tr_fam", label: "Help from family a month", v: T.fam },
      { id: "tr_share", label: "The share of that help the plan counts", v: T.share },
      { id: "tr_quick", label: "Quick income a month", v: T.quick },
      { id: "tr_months", label: "Months until the next job", v: T.months },
      { id: "tr_cash", label: "Cash, with any severance", v: T.cash },
      {
        id: "tr_gap",
        label: "The gap a month",
        v: T.gap,
        f: "=MAX(0,{tr_need}-{tr_ui}-{tr_fam}*{tr_share}-{tr_quick})",
      },
      { id: "tr_dip", label: "The dip: what the months cost", v: T.dip, f: "={tr_gap}*{tr_months}" },
      { id: "tr_left", label: "Cash left at the end", v: T.left, f: "={tr_cash}-{tr_dip}" },
    ],
  };
}
function trMo(n) {
  return n == null
    ? "no end"
    : n >= 24
      ? (n / 12).toFixed(1) + " years"
      : (n < 10 ? n.toFixed(1) : Math.round(n)) + " months";
}
function trSheet() {
  const c = C(),
    T = trCalc(c),
    X = trX(c),
    w = W,
    tab = w.tab || "dip",
    gs = T.st === "Guess",
    M = v => money(Math.round(v)),
    ask = (k, label, opts, fb, o) => kitAsk(c, "tr", k, label, opts, fb, o || {});
  const ev = w.ev || "layoff",
    kinds =
      typeof ntKindRow === "function" ? ntKindRow(ev) : ""; /* nets.js: medical leave, a move, a breakup, a new baby */
  if (ev !== "layoff" && typeof ntBody === "function")
    return (
      head("My Goals", "Break in case of emergency") +
      `<div class="small muted">A life change as a number: how long the cash lasts, the tripwires, Plan B.</div>` +
      kinds +
      ntBody(c, ev)
    );
  const top =
    head("My Goals", "Break in case of emergency") +
    `<div class="small muted">A layoff, from the last paycheck to the next job. This turns the fear into a number.</div>` +
    kinds +
    `<div class="grid2">${kitTile("Your cash lasts", T.runway == null ? "The whole time" : trMo(T.runway), T.runway == null ? "money in covers the costs" : "at a gap of " + M(T.gap) + " a month", T.st, "tr_gap")}${kitTile(T.covered ? "Left after " + T.months + " months" : "Short after " + T.months + " months", M(T.covered ? Math.max(0, T.left) : T.short), "the dip costs " + M(T.dip), T.st, "tr_dip")}</div>` +
    (gs ? `<div class="tiny muted">Some numbers are typical values, so this is a Guess. Tap yours below.</div>` : "") +
    kitTabs("trtab", tab, [
      ["dip", "Dip"],
      ["trip", "Tripwires"],
      ["fam", "Family"],
      ["quick", "Income"],
      ["slots", "Plan"],
    ]);
  let body = "";
  if (tab === "dip")
    body =
      ask("months", "How long until the next job?", TR_MONTHS, 6, {
        help: "Not sure? Pick a long one. A plan that covers 9 months also covers 4.",
      }) +
      ask("level", "How would you spend?", TR_LEVEL, "full", { term: "tr_basic" }) +
      ask("ui", "Unemployment pay a month", TR_UI, 0, {
        typed: true,
        term: "tr_ui",
        help: "The amount is different in each state. Your state's unemployment site has a calculator.",
      }) +
      ask("sev", "Severance or a last payout", TR_SEV, 0, { typed: true }) +
      mathBox([
        "Costs a month" +
          (T.level === "lean" ? " (the basics)" : "") +
          ": " +
          M(T.out) +
          ". Other income that keeps coming: " +
          M(T.other) +
          ".",
        "Money in each month: unemployment pay " +
          M(T.ui) +
          " + family help counted " +
          M(T.famCount) +
          " + quick income " +
          M(T.quick) +
          " = " +
          M(T.inMo) +
          ".",
        "The gap a month: " + M(T.need) + " - " + M(T.inMo) + " = " + M(T.gap) + ".",
        "The dip: " + M(T.gap) + " × " + T.months + " months = " + M(T.dip) + ".",
        "Cash: " +
          M(T.cash) +
          " (with severance). " +
          (T.gap > 0
            ? "It lasts " + M(T.cash) + " ÷ " + M(T.gap) + " = " + trMo(T.runway) + "."
            : "The gap is $0, so the cash is not used."),
      ]) +
      (typeof ntLevels === "function" ? ntLevels(c, T) : "");
  /* nets.js: How long at each level, the Rule of 5 */ else if (tab === "trip") {
    const R = trTrips(c, T);
    body =
      `<div class="small muted">Decide now what you will do at each cash level. A choice made on a calm day is easier to keep on a hard one.</div>` +
      R.map(
        r =>
          `<div class="tile stack" style="gap:6px"><div class="row between"><b class="small">${esc(r.n)}: ${M(r.level)}</b><span class="tiny muted">${r.now ? "You are there now" : r.at == null ? "Not reached" : r.at > T.months ? "After the " + T.months + " months" : "About month " + Math.max(1, Math.ceil(r.at))}</span></div><div class="chips">${r.opts.map(o => `<button class="chip ${r.pick === o ? "on" : ""}" data-a="trtrip" data-k="${r.k}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`
      ).join("") +
      mathBox([
        "A cash level: the months × your basic costs a month (" + M(T.basic) + ").",
        "When: (cash - the level) ÷ the gap a month.",
      ]);
  } else if (tab === "fam")
    body =
      `<div class="small muted">Help from family is a real asset. It also has a risk, so the plan counts a share of it.</div>` +
      ask("fam", "What could they give each month?", TR_FAM, 0, { typed: true }) +
      ask(
        "sure",
        "How sure is it?",
        TR_SURE.map(s => [s[0], s[1]]),
        "maybe"
      ) +
      ask("strings", "What would it cost you?", TR_STRINGS, "none") +
      `<div class="tile small">The plan counts <b>${Math.round(T.share * 100)}%</b> of it: <b>${M(T.famCount)}</b> a month, or <b>${M(T.famAsset)}</b> over the ${T.months} months.${T.g("strings", "none").v === "lot" ? " You said it would cost the relationship. It is fine to leave it out: tap None above." : ""}</div>` +
      mathBox([
        "Counted: the monthly help × the share for how sure it is (said yes 100%, likely 75%, maybe 50%).",
        "The shares are the game's own rule of thumb, not a statistic.",
      ]);
  else if (tab === "quick")
    body =
      `<div class="small muted">Ways to bring in money fast, in the order of the time to the first dollar. Tap the ones you would do.</div>` +
      `<div class="stack" style="gap:6px">${TR_QUICK.map(q => `<button class="rowbtn ${X.quick.includes(q[0]) ? "sel" : ""}" data-a="trquick" data-v="${q[0]}"><span><b>${q[1]}</b><div class="tiny muted">First dollar: ${q[2]}</div></span><b>${X.quick.includes(q[0]) ? "✓" : ""}</b></button>`).join("")}</div>` +
      ask("quick", "Together, about how much a month?", TR_QAMT, 0, {
        typed: true,
        help: "Your own guess. The game has no typical value for this.",
      });
  else {
    body =
      `<div class="small muted">A hard stretch has room for a few things at one time. Pick one card for each slot.</div>` +
      TR_SLOTS.map(
        s =>
          `<div class="tile stack" style="gap:6px"><b class="small">${esc(trSlotName(s))}</b><div class="chips">${s[3].map(k => `<button class="chip ${X.card[s[0]] === k ? "on" : ""}" data-a="trcard" data-k="${s[0]}" data-v="${esc(k)}">${esc(k)}</button>`).join("")}</div></div>`
      ).join("") +
      `<b class="small">What you have going for you</b><div class="tiny muted">Tap all that fit. These are your unfair advantages, and the plan should lean on them.</div><div class="chips">${TR_ADV.map(a => `<button class="chip ${X.adv.includes(a) ? "on" : ""}" data-a="tradv" data-v="${esc(a)}">${esc(a)}</button>`).join("")}</div>` +
      (() => {
        const cards = TR_SLOTS.filter(s => X.card[s[0]]).map(s => X.card[s[0]]),
          trips = trTrips(c, T).filter(r => r.pick);
        return cards.length || trips.length || X.adv.length
          ? `<div class="tile stack small" style="gap:4px"><b>Your plan on one card</b><div>${T.runway == null ? "Money in covers the costs." : "Cash lasts " + trMo(T.runway) + "."} The dip costs ${M(T.dip)}.</div>${cards.map(k => `<div>Running: ${esc(k)}</div>`).join("")}${trips.map(r => `<div>At ${esc(r.n.toLowerCase())}: ${esc(r.pick)}</div>`).join("")}${X.adv.length ? `<div>Leaning on: ${esc(X.adv.join(", "))}</div>` : ""}</div>`
          : "";
      })();
  }
  if (typeof trHardRow === "function") body += trHardRow(); /* hard.js: the other hard moments */
  return top + body;
}
/* Part of goalsTab() in ux.js. Adds the row "Break in case of emergency" at the end of My Goals. */
function goalsTabTransit(h) {
  const c = C();
  if (!c || G.demo || !c.placed) return h;
  return h.replace(
    /<\/div>\s*$/,
    `<button class="rowbtn trrow" data-a="transit"><span><b>Break in case of emergency</b><div class="tiny muted">If the pay stopped: the number, the tripwires, the plan</div></span><span class="caret">›</span></button></div>`
  );
}
kitTerms({
  tr_gap: [
    "The gap",
    "What your costs are each month, less the money that still comes in. It is what your cash has to cover.",
  ],
  tr_dip: ["The dip", "The total that the months with no paycheck cost: the gap a month, times the months."],
  tr_basic: ["The basics", "Home, food, getting around, and bills. The costs that stay when all else is cut."],
  tr_ui: [
    "Unemployment pay",
    "Money from your state while you look for work, when you lost a job through no fault of your own. Each state sets its own amount and its own number of weeks.",
  ],
});
kitScreen(
  "transit",
  "Break in case of emergency",
  "A layoff as a number: what the months cost and how long your cash lasts.",
  "Then the tripwires, family help, quick income, and a short plan."
);
kitMenu("Break in case of emergency", "transit", "If the pay stopped: the number, the tripwires, the plan", "safe");
Object.assign(ACT, {
  transit: () => {
    W = { kind: "transit", tab: "dip", o: {} };
    sheet(trSheet);
  },
  trtab: t => {
    if (!W) return;
    W.tab = t.dataset.v;
    W.pad = null;
    drawSheet();
  },
  trtrip: t => {
    const X = trX(C());
    X.trip[t.dataset.k] = X.trip[t.dataset.k] === t.dataset.v ? null : t.dataset.v;
    save();
    drawSheet();
  },
  trcard: t => {
    const X = trX(C());
    X.card[t.dataset.k] = X.card[t.dataset.k] === t.dataset.v ? null : t.dataset.v;
    save();
    drawSheet();
  },
  trquick: t => {
    const X = trX(C()),
      i = X.quick.indexOf(t.dataset.v);
    if (i >= 0) X.quick.splice(i, 1);
    else X.quick.push(t.dataset.v);
    save();
    drawSheet();
  },
  tradv: t => {
    const X = trX(C()),
      i = X.adv.indexOf(t.dataset.v);
    if (i >= 0) X.adv.splice(i, 1);
    else X.adv.push(t.dataset.v);
    save();
    drawSheet();
  },
});
