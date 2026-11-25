/* ============================================================================
   SLAM the Game: features/audit.js
   PURPOSE     The Mistake audit. It is optional. It is the only screen of the game that looks back at
               mistakes. The player lists money events of the past and tags each one "mistake" or
               "unavoidable". The screen shows the cost then, the cost over time, the days of saving
               (FI days), the hours of work, the events that repeat, and the mistake tax.
   INPUT       The profile: c.x.rc.audit = { on, events: [{ id, kind, amt, ago, d, tag }] }. The draft
               of a new event: c.x.rca (kit answers). The open sheet (W.kind): rcaudit. The taps of the
               player (the actions in OUTPUT).
   OUTPUT      Functions: mauStore, mauCalc, mauSheet, mauBook. Parts of functions in other files:
               reviewSheetAudit (reviewSheet in year.js). Actions (ACT): rcaudit, mauon, mauoff, maukind,
               mauadd, mautag, maudel. Menu: "Mistake audit (opt-in)".
   DEPENDS ON  core/report.js, core/engine.js (timeLedger), core/recalc.js (rcAudit, RC_KINDS),
               screens/ui.js, features/kit.js, features/slept.js (sleptRate, the return of the plan).
   RULES       The game does not open this screen for the player. The player opens it from the Yearly
               Review or from the menu. No other screen shows its words or its numbers. The player
               makes each tag. An event with no tag is in neither total. No red.
   ========================================================================= */
const MAU_AMTS = [25, 50, 100, 250, 500, 1000, 2500, 5000],
  MAU_WHEN = [
    [0.5, "This year"],
    [1.5, "Last year"],
    [3, "2 to 4 years ago"],
    [6, "Longer ago"],
  ];
kitTerms({
  mau_fidays: [
    "FI days",
    "The days of saving that an event took: its cost divided by what you put away in one day. Work becomes optional about that many days later.",
  ],
  mau_tax: [
    "Mistake tax",
    "The events of the last 12 months that you tagged as a mistake, as a share of one year of take-home pay.",
  ],
});
function mauStore(c) {
  const S = rcgStore(c);
  S.audit = S.audit || { on: false, events: [] };
  if (!Array.isArray(S.audit.events)) S.audit.events = [];
  return S.audit;
}
/* The numbers of the audit, from core/recalc.js. */
function mauCalc(c) {
  const d = D || derive(c),
    A = mauStore(c),
    t = todayISO(),
    left = c.take - c.spend,
    wage = typeof timeLedger === "function" ? timeLedger(c, d).wage : 0,
    r = typeof sleptRate === "function" ? sleptRate(c) : R,
    events = A.events.map(e => ({
      id: e.id,
      what: e.kind,
      kind: e.kind,
      amount: e.amt == null ? null : e.amt,
      tag: e.tag || null,
      yearsAgo: (e.ago || 0) + Math.max(0, daysBetween(e.d || t, t)) / 365,
    }));
  const X = rcAudit({
    events,
    realReturn: r,
    years: d.yrs === null || d.yrs === undefined ? null : d.yrs,
    perDay: left > 0 ? (left * 12) / 365 : null,
    hourly: wage > 0 ? wage : null,
    yearIncome: c.take > 0 ? c.take * 12 : null,
  });
  X.r = r;
  X.years = d.yrs === null || d.yrs === undefined ? null : d.yrs;
  X.left = left;
  return X;
}
function mauBook(c) {
  const A = mauStore(c);
  if (!A.on) return null;
  const X = mauCalc(c);
  return {
    title: "Mistake audit (opt-in)",
    rows: [
      { id: "au_mis", label: "Tagged mistake, cost then", v: X.mistake.cost },
      { id: "au_una", label: "Tagged unavoidable, cost then", v: X.unavoidable.cost },
      { id: "au_all", label: "Both, cost then", v: X.mistake.cost + X.unavoidable.cost, f: "={au_mis}+{au_una}" },
    ],
  };
}
const mauNum = v => (v < 10 ? v.toFixed(1) : String(Math.round(v)));
function mauSheet() {
  const c = C(),
    A = mauStore(c);
  if (!A.on)
    return (
      head("Plan", "Mistake audit (opt-in)") +
      `<div class="small">Everywhere else, the game only looks forward: a date moves and the route recalculates. This one screen looks back, and only if you want it to.</div><div class="small muted">You list money events of the past and tag each one yourself. Nothing here changes your plan. Nothing here shows on any other screen.</div><button class="primary wide" data-a="mauon">Turn the audit on</button>`
    );
  const X = mauCalc(c),
    kind = W.o.kind || null,
    line = r =>
      [
        r.later !== null ? money(Math.round(r.later)) + " over time" : null,
        X.measure === "fiDays" && r.fiDays !== null ? mauNum(r.fiDays) + " FI days" : null,
        X.measure === "hours" && r.hours !== null ? mauNum(r.hours) + " hours of work" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    tile = (label, T, extra) =>
      `<div class="tile stack" style="gap:4px"><div class="tiny muted">${label}</div><div class="big">${money(T.cost)}</div><div class="tiny muted">${T.count} ${T.count === 1 ? "event" : "events"}${line(T) ? " · " + line(T) : ""}</div>${extra || ""}</div>`;
  let h =
    head("Plan", "Mistake audit (opt-in)") +
    `<div class="small muted">Tag each one yourself. Unavoidable is a real answer: a transmission is not a choice.</div>`;
  h +=
    `<div class="tile stack" style="gap:8px"><b class="small">Add a money event</b><div class="tiny muted">What it was</div><div class="chips">${RC_KINDS.map((k, i) => `<button class="chip ${kind === k ? "on" : ""}" data-a="maukind" data-v="${i}">${esc(k)}</button>`).join("")}</div>` +
    kitAsk(
      c,
      "rca",
      "amt",
      "What it cost",
      MAU_AMTS.map(v => [v, money(v)]),
      0,
      { typed: true }
    ) +
    kitAsk(c, "rca", "ago", "When", MAU_WHEN, 0.5, {}) +
    `<button class="primary wide" data-a="mauadd">Add it</button>${W.o.msg ? `<div class="tiny muted">${esc(W.o.msg)}</div>` : ""}</div>`;
  h += X.rows.length
    ? X.rows
        .map(
          r =>
            `<div class="tile stack maurow" style="gap:6px"><div class="row between" style="gap:8px"><b class="small">${esc(r.what)}</b><b>${money(r.amount)}</b></div><div class="seg" role="group" aria-label="Your tag"><button class="${r.tag === "mistake" ? "on" : ""}" data-a="mautag" data-k="${esc(r.id)}" data-v="mistake">Mistake</button><button class="${r.tag === "unavoidable" ? "on" : ""}" data-a="mautag" data-k="${esc(r.id)}" data-v="unavoidable">Unavoidable</button></div><div class="row between" style="gap:8px"><span class="tiny muted">${line(r) || "The cost over time shows when your plan has a date."}</span><button class="ghost slim" data-a="maudel" data-k="${esc(r.id)}">Remove</button></div></div>`
        )
        .join("")
    : `<div class="small muted">Nothing listed yet.</div>`;
  if (X.rows.length) {
    h += `<div class="grid2">${tile("Tagged mistake", X.mistake, X.tax !== null ? `<div class="tiny muted">Mistake tax ${kitInfo("mau_tax")}: ${(X.tax * 100).toFixed(1)}% of a year of take-home pay</div>` : "")}${tile("Tagged unavoidable", X.unavoidable, `<div class="tiny muted">What a cushion is for</div>`)}</div>`;
    if (X.repeats.length)
      h += `<div class="tile stack" style="gap:4px"><b class="small">Repeats</b>${X.repeats.map(k => `<div class="small">${esc(k.kind)}: ${k.count} times, ${money(k.cost)}. One fix here pays more than one time.</div>`).join("")}</div>`;
    if (X.untagged) h += `<div class="tiny muted">${X.untagged} with no tag. They are in neither total.</div>`;
  }
  if (X.rows.length) {
    const perDay = X.left > 0 ? (X.left * 12) / 365 : 0,
      box = (label, lines) =>
        `<details class="math"><summary>${label}</summary><div class="inner tiny stack" style="gap:4px">${lines
          .filter(Boolean)
          .map(l => `<div>${esc(l)}</div>`)
          .join("")}</div></details>`;
    h += box(
      X.measure === "hours" ? "Show the math: hours of work" : "Show the math: FI days",
      X.measure === "fiDays"
        ? [
            "FI days = the cost ÷ what you put away in a day.",
            "A day of saving: " + money(X.left) + " left over a month × 12 ÷ 365 = " + cents(perDay) + ".",
            "Tagged mistake: " +
              money(X.mistake.cost) +
              " ÷ " +
              cents(perDay) +
              " = " +
              mauNum(X.mistake.fiDays) +
              " FI days.",
            "It is the days of saving that the events took. It is not a new date.",
          ]
        : X.measure === "hours"
          ? [
              "Nothing is left over to put away this month, so a day of saving is zero and FI days cannot be worked out.",
              "Hours of work = the cost ÷ your real hourly wage.",
              "Tagged mistake: " + money(X.mistake.cost) + " = " + mauNum(X.mistake.hours) + " hours of work.",
            ]
          : [
              "FI days = the cost ÷ what you put away in a day.",
              "Nothing is left over this month and you have no hourly wage now, so the screen shows dollars only.",
            ]
    );
    h += box("Show the math: mistake tax", [
      "Mistake tax = the events of the last 12 months that you tagged mistake ÷ one year of take-home pay.",
      X.tax !== null
        ? money(X.lastYear) + " ÷ " + money(c.take * 12) + " = " + (X.tax * 100).toFixed(1) + "%."
        : "It shows when your pay is known.",
      "Older events, and events tagged unavoidable, are not in it.",
    ]);
  }
  h += mathBox([
    "Cost then: the amount you gave.",
    X.years !== null
      ? "Over time: the amount grown at " +
        (X.r * 100).toFixed(1) +
        "% a year (the return of your plan, after inflation), from when it happened until work becomes optional (" +
        X.years +
        " years from today)."
      : "Over time: the amount grown at the return of your plan until work becomes optional. It shows when your plan has that date.",
    "Repeats: the same kind tagged mistake two times or more.",
  ]);
  h += `<div class="tiny muted">FI days ${kitInfo("mau_fidays")}</div><button class="ghost wide slim" data-a="mauoff">Turn the audit off</button>`;
  return h;
}
/* Part of reviewSheet() in year.js. One quiet button at the end of the Yearly Review. The game does not open the audit. */
function reviewSheetAudit(h) {
  return h + `<button class="ghost wide slim" data-a="rcaudit">Mistake audit (opt-in)</button>`;
}
kitScreen(
  "rcaudit",
  "Mistake audit (opt-in)",
  "A look back at money events of the past, by your own tags.",
  "It is optional. No other screen shows it."
);
kitMenu("Mistake audit (opt-in)", "rcaudit", "Optional: a look back at past money events, by your own tags", "review");
Object.assign(ACT, {
  rcaudit: () => {
    W = { kind: "rcaudit", o: { kind: null, msg: "" } };
    sheet(mauSheet);
  },
  mauon: () => {
    mauStore(C()).on = true;
    save();
    drawSheet();
  },
  mauoff: () => {
    mauStore(C()).on = false;
    save();
    drawSheet();
  },
  maukind: t => {
    W.o.kind = RC_KINDS[+t.dataset.v] || null;
    W.o.msg = "";
    drawSheet();
  },
  mauadd: () => {
    const c = C(),
      A = mauStore(c),
      amt = kitValue(c, "rca", "amt", 0),
      ago = kitValue(c, "rca", "ago", 0.5);
    if (!W.o.kind || !amt.given) {
      W.o.msg = "Pick what it was and what it cost first.";
      drawSheet();
      return;
    }
    A.events.push({
      id: "au" + Date.now().toString(36) + A.events.length,
      kind: W.o.kind,
      amt: amt.v,
      ago: ago.v,
      d: todayISO(),
      tag: null,
    });
    delete c.x.rca;
    W.o = { kind: null, msg: "" };
    save();
    drawSheet();
  },
  mautag: t => {
    const e = mauStore(C()).events.find(x => x.id === t.dataset.k);
    if (e) e.tag = e.tag === t.dataset.v ? null : t.dataset.v;
    save();
    drawSheet();
  },
  maudel: t => {
    const A = mauStore(C());
    A.events = A.events.filter(x => x.id !== t.dataset.k);
    save();
    drawSheet();
  },
});
