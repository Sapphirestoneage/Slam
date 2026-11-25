/* ============================================================================
   SLAM the Game: features/enough.js
   PURPOSE     Lifestyle creep and enough (run Not built, groups 1 to 5, Part 3). One sheet in the new
               look: (1) Spending over the years: each category of the money log, last year next to
               this year, next to income, the lines that grow faster than prices, and one quiet
               Recalculating card when spending grows faster than income. (2) The few lines that make
               most of it (the Pareto of the spending lines). (3) Enough and room for error (Housel).
               Also the Rough numbers switch: one tap shows ranges in place of every exact amount.
   INPUT       The profile: c.moves (the money log: d, t, amt, cat), c.spends, c.led, c.inv,
               c.x.enough (the taps). derive(c): fiBase, save. G.rough. The open sheet (W.kind): enough.
   OUTPUT      Math: enRows, enGameRead, enBook. Views: enoughSheet, enCreepCard, enYearsCard,
               enParetoCard, enEnoughCard, roughRow. Actions (ACT): enough, enpick, roughset.
               Menu: "Lifestyle creep and enough".
   DEPENDS ON  core/enough.js (the math, a copy of js/math/enough.js, and EN_CPI), core/engine.js
               (derive, yearsTo, todayISO), screens/ui.js (money, esc, head, mathBox, ib, save),
               screens/dash.js (dkCaption, dkStatRow, dkTile, dkCard, dkBars, dkProgress, dkPill),
               features/kit.js (kitMenu, kitScreen, kitTerms).
   RULES       The math is in core/enough.js. The views show what it returns. A month with nothing
               logged is left out, never a $0 month. No red, no verdict words: the card says
               Recalculating and shows the one next turn. Rough numbers changes only how money shows:
               no stored number changes.
   STORED      c.x.enough = { inflation: "cpi" | 0.02 | ..., incomeGrowth: 0.03, share: 1, room: 0.2 }.
               G.rough = true | false.
   ========================================================================= */
/* The money log as the rows the engine reads. Money in: "in" and "extra". Money out: "out" and "cost". */
function enRows(c) {
  const kind = { in: "in", extra: "in", out: "out", cost: "out" };
  return (c.moves || [])
    .filter(m => m && m.d && kind[m.t] && typeof m.amt === "number")
    .map(m => ({ d: m.d, amt: m.amt, cat: m.cat || "Not sorted", kind: kind[m.t] }));
}
function enChoices(c) {
  return (c.x && c.x.enough) || {};
}
/* Everything the sheet shows, from the one engine. */
function enGameRead(c) {
  const ch = enChoices(c),
    d = derive(c),
    inflation = ch.inflation === "cpi" ? EN_CPI.value : typeof ch.inflation === "number" ? ch.inflation : null,
    creep = enCreep(enRows(c), {
      inflation,
      incomeGrowth: typeof ch.incomeGrowth === "number" ? ch.incomeGrowth : null,
    }),
    lines = c.led ? (c.spends || []).map(r => ({ name: r.k, amt: r.amt })) : [],
    pareto = enPareto(lines),
    E = enEnough({
      fi: d.fiBase,
      share: typeof ch.share === "number" ? ch.share : 1,
      room: typeof ch.room === "number" ? ch.room : null,
      have: c.inv || 0,
    }),
    yrs = t => (t == null ? null : yearsTo(c.inv || 0, d.save, t));
  return {
    ch,
    inflation,
    creep,
    pareto,
    paretoGuess: !(c.spends || []).every(r => r.s),
    enough: Object.assign({}, E, { yrs: yrs(E.value), yrsRoom: E.withRoom == null ? null : yrs(E.withRoom) }),
  };
}
const enPctW = v => (v == null ? "new" : (v >= 0 ? "+" : "") + Math.round(v * 1000) / 10 + "%");
const enYrsW = n =>
  n == null ? "Not on this path yet" : n === 0 ? "Already there" : "In about " + n + (n === 1 ? " year" : " years");
/* The spreadsheet of the plan: the creep and the enough number, each with its formula. */
function enBook(c) {
  const R = enGameRead(c),
    C = R.creep,
    N = R.enough,
    rows = [];
  if (C.ready) {
    rows.push({
      id: "en_prev",
      label: "Spending a month, " + C.prev.year,
      v: C.prev.avgOut,
      note: C.prev.months + " months in the money log",
    });
    rows.push({
      id: "en_now",
      label: "Spending a month, " + C.now.year,
      v: C.now.avgOut,
      note: C.now.months + " months in the money log",
    });
    rows.push({
      id: "en_growth",
      label: "Spending growth",
      v: C.spendGrowth,
      f: "={en_now}/{en_prev}-1",
      note: C.level,
    });
  }
  if (N.value != null) {
    rows.push({
      id: "en_fi",
      label: "FI number (spending a year / " + Math.round(SWR * 1000) / 10 + "%)",
      v: derive(c).fiBase,
    });
    rows.push({ id: "en_share", label: "Enough is (a share of today's life)", v: N.share });
    rows.push({ id: "en_enough", label: "Your enough number", v: N.value, f: "={en_fi}*{en_share}" });
    if (N.withRoom != null) {
      rows.push({ id: "en_room", label: "Room for error", v: N.room });
      rows.push({
        id: "en_withroom",
        label: "Enough with room for error",
        v: N.withRoom,
        f: "={en_enough}*(1+{en_room})",
      });
    }
  }
  return { title: "Lifestyle creep and enough", rows };
}

/* ---------- views ---------- */
kitTerms({
  creep: [
    "Lifestyle creep",
    "Spending that grows a little each year, often after a raise. Here each category of this year sits next to last year, and next to your income.",
  ],
  mutant: [
    "Faster than prices",
    "A line that grew more than prices did. The rate of prices is the one you tap: the official CPI figure, or your own.",
  ],
  enoughnum: [
    "Your enough number",
    "The money that pays for the life you call enough, for good. It is your FI number scaled to that life. Past it, more is a choice.",
  ],
  roomerr: [
    "Room for error",
    "A margin on top of enough, for the years that go differently. From Morgan Housel, The Psychology of Money.",
  ],
  pareto: [
    "The few lines",
    "The biggest lines that together make 80% of your spending. A change to one of them moves more.",
  ],
  roughnum: [
    "Rough numbers",
    "Shows a range in place of every exact amount, like $3k to $4k. Your numbers stay as they are.",
  ],
});
kitScreen(
  "enough",
  "Lifestyle creep and enough",
  "Spending next to income over the years, the few lines that make most of it, and your enough number.",
  "Nothing here changes your plan. Each tap can be changed again."
);
const enChip = (k, v, label, on) =>
  `<button class="chip ${on ? "on" : ""}" data-a="enpick" data-k="${k}" data-v="${esc(String(v))}">${esc(label)}</button>`;
/* The quiet card: only when spending grows faster than income. */
function enCreepCard(R) {
  const W = enCreepWords(R.creep, money);
  if (!W) return "";
  return dkCard(
    W.head,
    `<div class="small" data-fid="en:line">${esc(W.line)}</div><div class="tiny muted" style="margin-top:6px">Your next turn</div><b class="small">${esc(W.next)}</b>`,
    { cls: "rc-quiet" }
  );
}
function enYearsCard(R) {
  const C = R.creep,
    ch = R.ch,
    prices =
      `<div class="tiny muted" style="margin-top:8px">Prices grew ${ib("term:mutant")}</div><div class="chips">` +
      enChip("inflation", "cpi", Math.round(EN_CPI.value * 1000) / 10 + "% (CPI)", ch.inflation === "cpi") +
      [0.02, 0.03, 0.04].map(v => enChip("inflation", v, Math.round(v * 100) + "%", ch.inflation === v)).join("") +
      `</div><div class="tiny muted">${ch.inflation === "cpi" ? esc(EN_CPI.period + ", U.S. Bureau of Labor Statistics") : ch.inflation == null ? "Tap one to see the lines that grow faster than prices." : "A rate you tapped."}</div>`;
  if (!C.ready)
    return dkCard(
      "Spending over the years",
      `<div class="small muted">This compares a year with the one before it. It needs ${esc(C.need)}. Log your spending in the Money tab and it fills in.</div>` +
        prices,
      { right: ib("term:creep") }
    );
  const both = C.series.every(s => s.in != null),
    bars = dkBars(
      C.series.map(s => ({ l: String(s.year), v: both ? [s.out, s.in] : [s.out] })),
      both ? ["Spending a month", "Income a month"] : ["Spending a month"]
    ),
    income =
      C.income.from === "ledger"
        ? ""
        : `<div class="tiny muted" style="margin-top:8px">Income grew (a guess until the log has income in both years)</div><div class="chips">${EN_INCOME_GUESS.map(v => enChip("incomeGrowth", v, v === 0 ? "No raise" : Math.round(v * 100) + "%", ch.incomeGrowth === v)).join("")}</div>`,
    rows = C.cats
      .map(
        c =>
          `<div class="row between small" data-cat="${esc(c.cat)}"><span>${esc(c.cat)}${c.mutant ? " " + dkPill("Faster than prices") : ""}</span><span class="tiny muted">${money(c.was)} → <b>${money(c.is)}</b> ${esc(enPctW(c.growth))}</span></div>`
      )
      .join("");
  return dkCard(
    "Spending over the years",
    bars +
      `<div class="stack" style="gap:4px;margin-top:8px">${rows}</div>` +
      prices +
      income +
      mathBox([
        "Each year: what the money log holds for it, by category, divided by the months that have any spending. A month with nothing logged is left out.",
        "Change: this year's month ÷ last year's month − 1. Spending " +
          money(C.now.avgOut) +
          " ÷ " +
          money(C.prev.avgOut) +
          " − 1 = " +
          enPctW(C.spendGrowth) +
          ".",
        C.inflation != null
          ? "Faster than prices: a line that grew more than " +
            Math.round(C.inflation * 1000) / 10 +
            "% and at least " +
            EN_RULES.mutantMin +
            " dollars a month more than prices alone would take it."
          : null,
        "Guess under 6 months in the shorter year, Close from 6, Exact at 12. This one: " + C.level + ".",
      ]),
    { right: ib("term:creep"), cap: C.prev.year + " next to " + C.now.year + ", a month" }
  );
}
function enParetoCard(R) {
  const P = R.pareto;
  if (!P.ready)
    return dkCard(
      "The few lines that make most of it",
      `<div class="small muted">This needs ${esc(P.need)}. Add your spending lines in the Money tab and it fills in.</div>`,
      { right: ib("term:pareto") }
    );
  return dkCard(
    "The few lines that make most of it",
    `<div class="small"><b>${P.count} of ${P.of} lines</b> make ${Math.round(P.topShare * 100)}% of your spending: ${money(P.topTotal)} of ${money(P.total)} a month.</div>` +
      P.rows
        .filter(r => r.top)
        .map(
          r =>
            `<div class="small" style="margin-top:6px">${esc(r.name)} · ${money(r.amt)}</div>${dkProgress(r.share * 100)}`
        )
        .join("") +
      mathBox([
        "Each spending line's month, biggest first. The few lines are the biggest ones that, added up, reach 80% of the total.",
        EN_SOURCES.pareto + ".",
      ]),
    { right: ib("term:pareto"), cap: R.paretoGuess ? "Some lines are still guesses" : null }
  );
}
function enEnoughCard(c, R) {
  const N = R.enough,
    ch = R.ch,
    share = typeof ch.share === "number" ? ch.share : 1,
    picks =
      `<div class="tiny muted">Enough is</div><div class="chips">${EN_ENOUGH.map(([v, l]) => enChip("share", v, l, share === v)).join("")}</div>` +
      `<div class="tiny muted" style="margin-top:6px">Room for error ${ib("term:roomerr")}</div><div class="chips">${EN_ROOM.map(([v, l]) => enChip("room", v, l, ch.room === v)).join("")}</div>`;
  if (N.value == null)
    return dkCard("Enough and room for error", picks + `<div class="small muted">Needs your spending first.</div>`, {
      right: ib("term:enoughnum"),
    });
  return dkCard(
    "Enough and room for error",
    picks +
      `<div class="small" style="margin-top:8px">${N.past ? "You have " + money(N.margin) + " past enough. Past it, more is a choice." : "You have " + Math.round((N.pct || 0) * 100) + "% of enough today: " + money(N.left) + " to go" + (N.withRoom != null ? ", with the room" : "") + "."}</div>` +
      dkProgress((N.pctRoom != null ? N.pctRoom : N.pct || 0) * 100, {
        text: N.withRoom != null ? "Enough with room" : "Enough",
      }) +
      `<div class="small" style="margin-top:6px">Enough: ${esc(enYrsW(N.yrs))}${N.withRoom != null ? " · with the room: " + esc(enYrsW(N.yrsRoom)) : ""}</div>` +
      mathBox([
        "Your enough number: your FI number " +
          money(derive(c).fiBase) +
          " × " +
          Math.round(N.share * 100) +
          "% = " +
          money(N.value) +
          ". The FI number is spending a year ÷ " +
          Math.round(SWR * 1000) / 10 +
          "%, so this is the same as working it out on the life you call enough.",
        N.withRoom != null
          ? "Room for error: " +
            money(N.value) +
            " × " +
            (100 + Math.round(N.room * 100)) +
            "% = " +
            money(N.withRoom) +
            "."
          : null,
        "The years: what you invest now, growing at the game's return, until it reaches each number.",
        EN_SOURCES.housel + ".",
      ]),
    { right: ib("term:enoughnum") }
  );
}
function enoughSheet() {
  const c = C(),
    R = enGameRead(c),
    Cr = R.creep,
    N = R.enough,
    P = R.pareto;
  return (
    head("Money", "Lifestyle creep and enough") +
    dkCaption("Spending next to income over the years, and the number that is enough.") +
    dkStatRow([
      dkTile("Spending growth", Cr.ready ? enPctW(Cr.spendGrowth) : "–", {
        sub: Cr.ready ? Cr.prev.year + " to " + Cr.now.year + " · " + Cr.level : "needs two years",
        guess: Cr.ready && Cr.level === "Guess",
      }),
      dkTile("Income growth", Cr.ready && Cr.income.growth != null ? enPctW(Cr.income.growth) : "–", {
        sub: Cr.ready && Cr.income.from === "tapped" ? "a guess you tapped" : "from the money log",
        guess: Cr.ready && Cr.income.from === "tapped",
      }),
      dkTile("Enough", N.value != null ? money(N.value) : "–", {
        sub: N.withRoom != null ? "with room " + money(N.withRoom) : "your number",
      }),
      dkTile("The few lines", P.ready ? P.count + " of " + P.of : "–", {
        sub: P.ready ? "make " + Math.round(P.topShare * 100) + "%" : "needs 3 lines",
        guess: P.ready && R.paretoGuess,
      }),
    ]) +
    enCreepCard(R) +
    enYearsCard(R) +
    enParetoCard(R) +
    enEnoughCard(c, R)
  );
}
/* Part of the settings in ui.js (the card above Game words): the one Rough numbers switch. */
function roughRow() {
  return `<div class="card"><div class="row between"><div><b>Rough numbers</b> ${ib("term:roughnum")}<div class="tiny muted">Show ranges, like $3k to $4k, in place of exact amounts. For a screen someone else can see.</div></div><div class="seg"><button class="${G.rough ? "" : "on"}" data-a="roughset" data-v="0">Off</button><button class="${G.rough ? "on" : ""}" data-a="roughset" data-v="1">On</button></div></div></div>`;
}
Object.assign(ACT, {
  enough: () => {
    W = { kind: "enough" };
    sheet(enoughSheet);
  },
  enpick: t => {
    const c = C(),
      k = t.dataset.k,
      raw = t.dataset.v,
      v = raw === "cpi" ? "cpi" : Number(raw);
    if (!["inflation", "incomeGrowth", "share", "room"].includes(k) || (raw !== "cpi" && !Number.isFinite(v))) return;
    c.x = c.x || {};
    const ch = Object.assign({}, c.x.enough || {});
    ch[k] = ch[k] === v && k !== "share" ? null : v; /* a second tap clears it (enough itself stays) */
    c.x.enough = ch;
    save();
    drawSheet();
  },
  roughset: t => {
    G.rough = t.dataset.v === "1";
    save();
    render();
  },
});
kitMenu(
  "Lifestyle creep and enough",
  "enough",
  "Spending next to income over the years, and your enough number",
  "jobs"
);
