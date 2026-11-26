/* ============================================================================
   SLAM the Game: features/lifemap.js
   PURPOSE     The life tech tree (run Results-first Home, item 4). One horizontal map of the ten eras, from
               age 15 to FI. The player "launches in" at their own age and era (a later-era start): each era
               they already passed is a starting bonus, checked from the answers they gave, with its value,
               and money already invested shows its head start (what it grows to by the retirement age with
               nothing more added). Done eras are bright, the era being unlocked pulses, the one after it is
               normal and the rest are fogged. A tap on an era opens what it is, why it matters, its money and
               time, its steps and one Go do it button.
   INPUT       The profile c and the derived numbers d. The open sheet (W.kind ltnode, W.i).
   OUTPUT      Math (compositions of the engines, no formula of their own): ltMap, ltBonus, ltHeadStart,
               ltEra, ltBook. Views: ltMapHtml, ltSheet. Parts of functions in other files: mapTabTree
               (mapTab in ui.js). Actions (ACT): ltnode.
   DEPENDS ON  core/engine.js (ERAS, eraSteps, goalSim, grow, R, derive), screens/ui.js (freeAt, eraN, money,
               mathBox, head), features/kit.js (kitState, kitSharp, kitPill), features/results.js (rsNextWin),
               core/metrics.js (knN1), screens/dash.js (dkMonth, dkProgress, dkCaption).
   RULES       The eras, the gates and the steps are the game's own (ERAS, eraSteps); this file keeps no copy.
               The ages come from goalSim, the FI age from freeAt, the head start from grow(). No red, no
               verdict words. The map scrolls sideways inside its own box; the page never does.
   ========================================================================= */
const LT_START = 15;
/* The value of an era the player already passed: one line from their own numbers. */
function ltBonus(c, d, i) {
  const v = [
    null,
    money(d.cash) + " set aside: a surprise bill stays off a card",
    c.match === "no match offered" ? "No match to get at work" : "The full match from your job",
    "No debt at 8% or more",
    knN1(c.months) + " months of spending covered",
    "Tax-friendly accounts filled each year",
    "The bare minimum still gets you to FI",
    money(c.inv || 0) + " invested: enough to coast",
    money(c.inv || 0) + " invested: work is optional",
    "Building beyond yourself",
  ][i];
  return v ? { i, n: eraN(i), v } : null;
}
/* The head start of money already invested: what it grows to by the retirement age with nothing more added
   (grow() of the engine, at the plan's return R after inflation). */
function ltHeadStart(c, d) {
  const inv = c.inv || 0;
  if (!(inv > 0)) return null;
  const yrs = Math.max(0, Math.round((c.ret || 60) - c.age)),
    fv = grow(inv, yrs, 0);
  return {
    inv,
    yrs,
    age: c.age + yrs,
    fv,
    gain: fv - inv,
    st: kitState([kitSharp(c, "inv")]),
    math: [
      "Invested today: " + money(inv) + ".",
      "Grows " +
        Math.round(R * 100) +
        "% a year after inflation (the plan's return) for " +
        yrs +
        " years, to age " +
        (c.age + yrs) +
        ".",
      money(inv) + " × (1 + " + R + ")^" + yrs + " = " + money(fv) + ", with nothing more added.",
    ],
  };
}
/* The whole map: the ruler from 15 to FI, and one column for each era. */
function ltMap(c, d) {
  d = d || derive(c);
  let sim = { eraAt: {} },
    fiM = null;
  try {
    sim = goalSim(c);
    fiM = freeAt(c);
  } catch (e) {
    report(e, "lifemap.js: ltMap");
  }
  const age = c.age,
    nx = d.era + 1,
    fiAge = fiM == null ? null : fiM <= 0 ? age : Math.round(age + fiM / 12),
    end = Math.max(fiAge || 0, c.ret || 60, age + 1),
    eras = ERAS.map((e, i) => {
      const st = i < d.era ? "done" : i === d.era ? "here" : i === nx ? "current" : i === nx + 1 ? "next" : "later",
        at = i <= d.era ? 0 : sim.eraAt[i],
        steps = i >= 1 ? eraSteps(c, d, i) : [];
      return {
        i,
        n: eraN(i),
        p: e.p,
        gate: e.gate,
        one: e.one,
        st,
        months: at == null ? null : at,
        age: i <= d.era || at == null ? null : Math.round(age + at / 12),
        steps,
        done: steps.filter(x => x.done).length,
        bonus: i >= 1 && i <= d.era ? ltBonus(c, d, i) : null,
      };
    });
  return {
    start: LT_START,
    age,
    fiAge,
    end,
    youPct: Math.max(0, Math.min(100, ((age - LT_START) / Math.max(1, end - LT_START)) * 100)),
    here: d.era,
    nx,
    eras,
    bonuses: eras.filter(e => e.bonus).map(e => e.bonus),
    head: ltHeadStart(c, d),
  };
}
/* One era, for its sheet: the money and the time it takes, and the step to do first. */
function ltEra(c, d, i) {
  d = d || derive(c);
  const M = ltMap(c, d),
    e = M.eras[i],
    gap = [
      null,
      Math.max(0, 1000 - d.cash),
      null,
      null,
      Math.max(0, (d.target - (c.months || 0)) * (c.spend || 0)),
      null,
      null,
      Math.max(0, d.coastNum - (c.inv || 0)),
      Math.max(0, d.fi - (c.inv || 0)),
      null,
    ][i],
    first = e.steps.find(x => !x.done) || null,
    win = i === M.nx && !first ? rsNextWin(c, d) : null;
  return {
    e,
    gap: e.st === "done" || e.st === "here" ? null : gap,
    time:
      e.st === "done" || e.st === "here"
        ? "Reached"
        : e.months == null
          ? "Not on the calendar yet"
          : e.months <= 0
            ? "Ready when its steps are done"
            : "About " + rcSpan(e.months) + ", age " + e.age + " (" + dkMonth(e.months) + ")",
    go: first
      ? { a: "node", v: first.id, l: "Go do it: " + first.title.replace(/^★ /, "") }
      : win
        ? { a: win.a, v: win.v == null ? "" : String(win.v), l: "Go do it: " + win.t }
        : null,
    math: [
      e.gate + ".",
      e.months != null && e.months > 0
        ? "The date: your plan run month by month (the same run as the FI date), the first month this era's gate is met."
        : "",
      gap != null && gap > 0 && e.st !== "done" && e.st !== "here"
        ? "To go: the gate less what you have now, " + money(gap) + "."
        : "",
    ],
  };
}
/* The spreadsheet of the plan (book.js): the head start. */
function ltBook(c) {
  const H = ltHeadStart(c, derive(c));
  if (!H) return { title: "Your life map: the head start", rows: [] };
  return {
    title: "Your life map: the head start",
    rows: [
      { id: "lt_inv", label: "Invested today", v: H.inv },
      { id: "lt_r", label: "The plan's return a year, after inflation", v: R },
      { id: "lt_yrs", label: "Years to your retirement age", v: H.yrs },
      {
        id: "lt_fv",
        label: "What it grows to with nothing more added",
        v: H.fv,
        f: "={lt_inv}*(1+{lt_r})^{lt_yrs}",
      },
    ],
  };
}

/* ---------- THE VIEWS ---------- */
function ltColHtml(e) {
  const lab =
    e.st === "done"
      ? "Starting bonus"
      : e.st === "here"
        ? "You launch in here"
        : e.age != null
          ? "About age " + e.age
          : e.st === "current"
            ? "Unlocking now"
            : "Later";
  const pill =
    e.st === "done" || e.st === "here" ? "✓" : e.st === "current" ? "Now" : e.st === "next" ? "Next" : "Later";
  return `<button class="ltcol ${e.st}" data-a="ltnode" data-v="${e.i}" data-fid="lt:${e.i}"><span class="row between tiny"><span class="muted">Era ${e.i}</span><span class="pill">${pill}</span></span><b class="small">${esc(e.n)}</b><span class="tiny muted">${esc(lab)}</span>${e.steps.length ? `<span class="ltdots" aria-label="${e.done} of ${e.steps.length} steps">${e.steps.map(s => `<i class="${s.done ? "on" : ""}"></i>`).join("")}</span>` : ""}${e.bonus ? `<span class="tiny ltbon">${esc(e.bonus.v)}</span>` : ""}<span class="tiny ltview">View ›</span></button>`;
}
function ltMapHtml(c, d) {
  const M = ltMap(c, d),
    H = M.head,
    cur = M.eras[M.nx] || null;
  return (
    `<div class="card dkcard ltcard" data-fid="lt:map"><div class="row between dkhead"><span class="dklabel">Your life map</span><span class="tiny muted">Age ${M.start} to ${M.fiAge != null ? "FI at " + M.fiAge : M.end}</span></div>` +
    `<div class="tiny muted">You launch in at age ${esc(M.age)}, in ${esc(M.eras[M.here].n)}${M.bonuses.length ? ", with " + M.bonuses.length + " starting bonus" + (M.bonuses.length === 1 ? "" : "es") + " checked from your answers" : ""}.${cur ? " Unlocking now: " + esc(cur.n) + "." : ""}</div>` +
    `<div class="ltruler" aria-hidden="true"><i style="width:${M.youPct.toFixed(1)}%"></i><b style="left:${M.youPct.toFixed(1)}%"></b></div><div class="row between tiny muted"><span>Age ${M.start}</span><span>You, ${esc(M.age)}</span><span>${M.fiAge != null ? "FI, " + M.fiAge : "Age " + M.end}</span></div>` +
    `<div class="ltscroll" tabindex="0" aria-label="The eras, from the start to Legacy"><div class="ltrow">${M.eras.map(ltColHtml).join("")}</div></div>` +
    (H
      ? `<div class="tile ltgrow" data-fid="lt:head"><div class="row between"><span class="dklabel">Head start</span>${kitPill(H.st)}</div><b class="${H.st === "Guess" ? "guess" : ""}">${money(H.inv)} becomes ${money(H.fv)} by age ${H.age}</b><div class="tiny muted">With nothing more added. Starting early does that.</div>${mathBox(H.math)}</div>`
      : "") +
    `<button class="ghost wide slim" data-a="fline">Start at the finish line: work back from the end</button>` +
    `</div>`
  );
}
/* The sheet of one era. */
function ltSheet() {
  const c = C(),
    d = derive(c),
    X = ltEra(c, d, W.i),
    e = X.e;
  return (
    head("Your life map", esc(e.n)) +
    `<div class="row wrap" style="gap:6px"><span class="pill">${e.st === "done" || e.st === "here" ? "Reached" : e.st === "current" ? "Unlocking now" : e.st === "next" ? "Next" : "Later"}</span><span class="tiny muted">Era ${e.i} of 9</span></div>` +
    `<div class="tile stack" style="gap:6px"><div class="small"><span class="muted">What</span> ${esc(e.p)}: ${esc(e.gate)}.</div><div class="small"><span class="muted">Why</span> ${esc(e.one)}</div><div class="small"><span class="muted">Time</span> <b>${esc(X.time)}</b></div>${X.gap != null && X.gap > 0 ? `<div class="small"><span class="muted">Money</span> <b>${money(X.gap)}</b> to go</div>` : ""}${e.bonus ? `<div class="small"><span class="muted">Starting bonus</span> <b>${esc(e.bonus.v)}</b></div>` : ""}${mathBox(X.math)}</div>` +
    (e.steps.length
      ? `<div class="stack" style="gap:6px"><div class="tiny muted">${e.done} of ${e.steps.length} steps done</div>${e.steps.map(s => `<button class="rowbtn ${s.done ? "okrow" : ""}" data-a="node" data-v="${esc(s.id)}"><span>${esc(s.title)}</span><span class="tiny">${s.done ? "Done ✓" : "›"}</span></button>`).join("")}</div>`
      : "") +
    (X.go
      ? `<button class="primary go wide" data-a="${esc(X.go.a)}" data-v="${esc(X.go.v)}">${esc(X.go.l)}</button>`
      : typeof rcpNextRow === "function"
        ? rcpNextRow()
        : "")
  );
}
/* Part of mapTab() in ui.js: the life map at the top of the big picture. */
function mapTabTree(h) {
  try {
    if (typeof MP !== "undefined" && (MP.r || MP.t)) return h;
    const c = C();
    if (!c || (G.demo && !c.placed)) return h;
    return h.replace(
      '<div class="stack"><h1>Skills</h1>',
      '<div class="stack">' + ltMapHtml(c, derive(c)) + "<h1>Skills</h1>"
    );
  } catch (e) {
    report(e, "lifemap.js: mapTabTree");
    return h;
  }
}
Object.assign(ACT, {
  ltnode: t => {
    W = { kind: "ltnode", i: Math.max(0, Math.min(9, +t.dataset.v || 0)) };
    sheet(ltSheet);
  },
});
