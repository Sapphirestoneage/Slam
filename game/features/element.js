/* ============================================================================
   SLAM the Game: features/element.js
   PURPOSE     The character reveal after setup, in place of the card "Your character is ready". Four
               short screens: (1) strengths and weak spots as literal numbers (months of cushion, dollars
               left each month, months of pay owed, years of spending invested, protections in place),
               (2) the money element of the player, with the problems it is strong against and the
               problems it is weak to, (3) "Does this feel accurate?", (4) "Which do you want to improve
               most?". The answer to (4) is kept as the focus of the player.
   INPUT       The profile: c.take, c.spend, c.debt, c.inv, c.age, c.led, c.x.mc (the Money Chart),
               c.x.el (the answers of this feature: pick, acc, focus, seen). The open sheet (W.kind):
               elem. The taps of the player (the actions in OUTPUT).
   OUTPUT      Functions: elStats, elSides, elOf, elSheet, elBook. Actions (ACT): elem, elnext, elpick,
               elacc, elfocus. Parts of functions in other files: finishSetupReveal (finishSetup in
               ui.js), rvSheetElement (rvSheet in reveal.js). Menu: "Strengths and your element".
   DEPENDS ON  core/report.js, core/engine.js (derive, ELEMENTS), screens/ui.js, features/chart.js
               (mcOf), features/kit.js.
   RULES       Each stat is a literal number, never a score. Before the player makes the numbers real,
               each stat is a Guess, and the screen says so. A weak spot is "the number with the most
               room", never a grade. No red.
   ========================================================================= */
/* The five elements: the problems each one is strong against, and the problems each one is weak to. */
const EL_SIDES = {
  Earth: {
    strong: ["Impulse buys", "A long, slow payoff", "A surprise bill"],
    weak: ["A sudden change of plans", "A good chance that needs a quick yes"],
    tip: "Decide ahead of time what a quick yes would need. Then a quick yes is still your plan.",
  },
  Water: {
    strong: ["A slow month", "A change of plans", "Money talks with other people"],
    weak: ["Drift: months with no plan", "Saying no to people you care about"],
    tip: "One fixed move on payday, before anything else, keeps the drift small.",
  },
  Fire: {
    strong: ["Getting started", "A big debt", "Asking for more pay"],
    weak: ["Burnout on a long plan", "A risky shortcut"],
    tip: "Break the long plan into short stages, each with its own finish line.",
  },
  Air: {
    strong: ["Fine print", "Comparing options", "Spotting a bad deal"],
    weak: ["Too many options and no choice", "Follow-through after the fun part"],
    tip: "Set a date to choose by. Good enough, chosen, beats perfect, pending.",
  },
  Spirit: {
    strong: ["Keeping up with other people", "Spending on things that do not matter to you"],
    weak: ["Dull paperwork", "Giving or undercharging past what you can afford"],
    tip: "Put your own cushion on the list of things you care for. It is what lets you keep giving.",
  },
};
const EL_ACC = ["Yes", "Mostly", "Not really"];
function elStore(c) {
  c.x = c.x || {};
  return (c.x.el = c.x.el || {});
}
/* THE MATH. Each stat: { id, n, v (the number), txt (the number in words), score (0 to 1, only to
   put the stats in order), st (Guess or Close), act (the action that improves it) }. */
function elStats(c, d) {
  d = d || derive(c);
  const st = c.led ? "Close" : "Guess",
    spend = Math.max(1, c.spend || 0),
    take = Math.max(1, c.take || 0),
    cushion = d.cash / spend,
    left = (c.take || 0) - (c.spend || 0),
    owed = (c.debt || 0) / take,
    yrs = (c.inv || 0) / (spend * 12),
    yrsAim = Math.max(0.5, (c.age - 25) / 5),
    one = (n, w) => (Math.round(n * 10) / 10).toLocaleString() + " " + w;
  return [
    {
      id: "cushion",
      n: "Cushion",
      v: cushion,
      txt: one(cushion, "months of cushion"),
      score: Math.min(1, cushion / 6),
      st,
      act: "sharp",
      av: "cash",
    },
    {
      id: "left",
      n: "Left each month",
      v: left,
      txt: money(left) + " left each month",
      score: Math.max(0, Math.min(1, left / take / 0.2)),
      st,
      act: "csp",
    },
    {
      id: "owed",
      n: "What you owe",
      v: owed,
      txt: c.debt > 0 ? one(owed, "months of pay owed") : "Nothing owed",
      score: 1 - Math.min(1, owed / 12),
      st,
      act: "debtplan",
    },
    {
      id: "invested",
      n: "Invested",
      v: yrs,
      txt: one(yrs, "years of spending invested"),
      score: Math.min(1, yrs / yrsAim),
      st,
      act: "nxa",
    },
    {
      id: "protect",
      n: "Protections",
      v: d.acDone,
      txt: d.acDone + " of " + d.acMax + " protections in place",
      score: d.acMax ? d.acDone / d.acMax : 1,
      st,
      act: "cover",
    },
  ];
}
/* The two strongest stats and the two with the most room. */
function elSides(c, d) {
  const S = elStats(c, d)
    .slice()
    .sort((a, b) => b.score - a.score);
  return { strong: S.slice(0, 2), weak: S.slice(-2).reverse(), all: S };
}
/* The element of the player: a switch that the player tapped on a quiz card, then the Money Chart when it is
   ready, then the pick of the player, then a Guess from the setup taps. */
function elOf(c) {
  /* quizzes.js: the player tapped "Switch" on a quiz card. That tap is the newest word of the player, thus it
     comes first. c.x.el.over is the id of the quiz. */
  const ov = c.x && c.x.el && c.x.el.over && c.x.el.pick;
  if (ov && EL_SIDES[ov]) return { el: ov, st: "Close", from: "Your pick" };
  try {
    const ans = c.x && c.x.mc && c.x.mc.ans;
    if (ans && typeof mcOf === "function") {
      const r = mcOf(ans);
      if (r.ready && r.top && EL_SIDES[r.top.name]) return { el: r.top.name, st: "Close", from: "Your Money Chart" };
    }
  } catch (e) {
    report(e, "element.js: elOf");
  }
  const pick = c.x && c.x.el && c.x.el.pick;
  if (pick && EL_SIDES[pick]) return { el: pick, st: "Close", from: "Your pick" };
  let el = "Earth";
  if (c.deps === "Supporting a parent" || c.give === "Giver") el = "Spirit";
  else if (c.steady !== "Steady" || c.work === "Between jobs") el = "Water";
  else if (c.work === "Student") el = "Air";
  else if (c.work === "First job" || c.work === "Self-employed") el = "Fire";
  return { el, st: "Guess", from: "A guess from your setup taps" };
}
function elBook(c) {
  const d = derive(c),
    S = elStats(c, d),
    by = id => S.find(x => x.id === id);
  return {
    title: "Strengths and weak spots",
    rows: [
      { id: "el_cash", label: "Cash", v: d.cash },
      { id: "el_spend", label: "Spending a month", v: Math.max(1, c.spend || 0) },
      { id: "el_take", label: "Take-home pay a month", v: Math.max(1, c.take || 0) },
      { id: "el_debt", label: "Owed", v: c.debt || 0 },
      { id: "el_inv", label: "Invested", v: c.inv || 0 },
      { id: "el_cushion", label: "Months of cushion", v: by("cushion").v, f: "={el_cash}/{el_spend}" },
      { id: "el_left", label: "Left each month", v: (c.take || 0) - (c.spend || 0), note: "Pay less spending" },
      { id: "el_owed", label: "Months of pay owed", v: by("owed").v, f: "={el_debt}/{el_take}" },
      { id: "el_yrs", label: "Years of spending invested", v: by("invested").v, f: "={el_inv}/({el_spend}*12)" },
    ],
  };
}
function elStatRow(s, tag) {
  return `<div class="tile row between" style="gap:8px"><span style="min-width:0"><span class="tiny muted">${esc(s.n)}${tag ? " · " + tag : ""}</span><div><b class="${s.st === "Guess" ? "guess" : ""}">${esc(s.txt)}</b></div></span>${kitPill(s.st)}</div>`;
}
function elSheet() {
  const c = C(),
    d = D || derive(c),
    w = W,
    X = elStore(c),
    S = elSides(c, d),
    E = elOf(c),
    N = 4,
    i = Math.min(w.i || 0, N),
    dots = `<div class="row" style="justify-content:center;gap:6px;margin:4px 0">${Array.from({ length: N }, (_, k) => `<span class="rvdot ${k <= i ? "on" : ""}"></span>`).join("")}</div>`,
    next = (l, off) =>
      `<button class="primary wide go" data-a="elnext" ${off ? "disabled" : ""}>${l || "Next"}</button>`,
    guess = !c.led
      ? `<div class="tiny muted">These come from your setup taps, so each one is a Guess. They sharpen as you make your numbers real.</div>`
      : "";
  if (i === 0)
    return (
      head("Meet your character", "1 of " + N) +
      `<h2 data-fid="el:big">${esc(String(c.name || "You"))}: where you are strong</h2>` +
      S.strong.map(s => elStatRow(s, "strong")).join("") +
      `<b class="small">The numbers with the most room</b>` +
      S.weak.map(s => elStatRow(s, "room to grow")).join("") +
      guess +
      mathBox([
        "Months of cushion: cash ÷ spending a month.",
        "Left each month: take-home pay less spending.",
        "Months of pay owed: what you owe ÷ take-home pay a month.",
        "Years of spending invested: invested money ÷ (spending a month × 12).",
        "The order comes from how far each number is from a common rule of thumb: 6 months of cushion, 20% of pay left over, a year of pay owed, and a year of spending invested for each 5 years past age 25.",
      ]) +
      dots +
      next()
    );
  if (i === 1) {
    const sd = EL_SIDES[E.el];
    return (
      head("Meet your character", "2 of " + N) +
      `<div class="levelup pop" style="padding:8px 0"><div class="eyebrow">Your money element</div><h2 style="margin:8px 0" class="${E.st === "Guess" ? "guess" : ""}" data-fid="el:big">${esc(E.el)}</h2><div class="small">${esc(ELEMENTS[E.el])}</div><div class="row" style="justify-content:center;gap:6px;margin-top:6px">${kitPill(E.st)}${ib("term:mchart")}</div><div class="tiny muted">${esc(E.from)}</div></div>` +
      `<div class="grid2"><div class="tile stack" style="gap:4px"><b class="small">Strong against</b>${sd.strong.map(x => `<div class="small">${esc(x)}</div>`).join("")}</div><div class="tile stack" style="gap:4px"><b class="small">Weak to</b>${sd.weak.map(x => `<div class="small">${esc(x)}</div>`).join("")}</div></div>` +
      `<div class="tile small">${esc(sd.tip)}</div>` +
      (E.from !== "Your Money Chart"
        ? `<details class="math"><summary>Not you? Pick one, or take the quiz</summary><div class="inner stack" style="gap:8px"><div class="chips">${Object.keys(
            EL_SIDES
          )
            .map(
              e =>
                `<button class="chip ${E.el === e && E.st !== "Guess" ? "on" : ""}" data-a="elpick" data-v="${e}">${e}</button>`
            )
            .join(
              ""
            )}</div><button class="ghost wide slim" data-a="chart">Take the 10-statement quiz</button></div></details>`
        : "") +
      dots +
      next()
    );
  }
  if (i === 2)
    return (
      head("Meet your character", "3 of " + N) +
      `<h2 data-fid="el:big">Does this feel accurate?</h2><div class="small muted">One tap. There is no wrong answer, and you can change it later.</div>` +
      `<div class="stack" style="gap:8px">${EL_ACC.map((a, k) => `<button class="rowbtn ${X.acc === a ? "sel" : !X.acc && k === 0 ? "pulse" : ""}" data-a="elacc" data-v="${a}"><b>${a}</b><span class="caret">›</span></button>`).join("")}</div>` +
      (X.acc === "Not really"
        ? `<div class="tile small">That is useful to know. The picture is built from guesses for people like you. A few taps on your real numbers fix it.<button class="ghost wide slim" style="margin-top:8px" data-a="best">Make my numbers real</button></div>`
        : "") +
      dots +
      next("Next", !X.acc)
    );
  if (i === 3)
    return (
      head("Meet your character", "4 of " + N) +
      `<h2 data-fid="el:big">Which do you want to improve most?</h2><div class="small muted">Pick one. The game keeps it as your focus.</div>` +
      `<div class="stack" style="gap:8px">${S.all
        .slice()
        .reverse()
        .map(
          (s, k) =>
            `<button class="rowbtn ${X.focus === s.id ? "sel" : !X.focus && k === 0 ? "pulse" : ""}" data-a="elfocus" data-v="${s.id}"><span><b>${esc(s.n)}</b><div class="tiny muted ${s.st === "Guess" ? "guess" : ""}">${esc(s.txt)}</div></span><span class="caret">›</span></button>`
        )
        .join("")}</div>` +
      dots
    );
  const f = S.all.find(s => s.id === X.focus);
  return (
    head("Me", "Strengths and your element") +
    `<div class="tile stack" style="gap:6px"><div class="row between"><b>${esc(E.el)}</b>${kitPill(E.st)}</div><div class="small">${esc(ELEMENTS[E.el])}</div><div class="tiny muted">Strong against: ${esc(EL_SIDES[E.el].strong.join(", "))}. Weak to: ${esc(EL_SIDES[E.el].weak.join(", "))}.</div></div>` +
    S.all.map(s => elStatRow(s, s.id === X.focus ? "your focus" : "")).join("") +
    (w.first ? `<button class="primary wide go" data-a="close">See my first plan</button>` : "") +
    (f
      ? `<button class="${w.first ? "ghost wide slim" : "primary wide go"}" data-a="${f.act}" ${f.av ? `data-v="${f.av}"` : ""}>Work on ${esc(f.n.toLowerCase())}</button>`
      : "") +
    `<button class="ghost wide slim" data-a="elem" data-v="again">Go through it again</button>${w.first ? "" : `<button class="ghost wide slim" data-a="close">Done</button>`}`
  );
}
/* Part of finishSetup() in ui.js. For a new profile, opens the reveal in place of the card "Your
   character is ready". Returns true when it opened. */
function finishSetupReveal(c) {
  try {
    W = { kind: "elem", i: 0, first: true };
    sheet(elSheet);
    return true;
  } catch (e) {
    report(e, "element.js: finishSetupReveal");
    return false;
  }
}
/* Part of rvSheet() in reveal.js. Adds one row to the character sheet. */
function rvSheetElement(h) {
  const row = `<button class="rowbtn" data-a="elem"><span><b>Strengths and your element</b><div class="tiny muted">Your numbers in plain words, and what your element is strong against</div></span><span class="caret">›</span></button>`;
  return h.replace(
    '<div class="tiny muted">No dollar amounts on this sheet',
    () => row + '<div class="tiny muted">No dollar amounts on this sheet'
  );
}
kitScreen(
  "elem",
  "Strengths and your element",
  "Your strongest numbers and the ones with the most room, as plain numbers.",
  "Your money element shows which problems you handle well and which ones to plan for."
);
kitMenu("Strengths and your element", "elem", "Your numbers in plain words, and your money element", "quest");
Object.assign(ACT, {
  elem: t => {
    const c = C(),
      X = elStore(c);
    W = { kind: "elem", i: X.seen && !(t && t.dataset && t.dataset.v === "again") ? 4 : 0 };
    sheet(elSheet);
  },
  elnext: () => {
    if (!W || W.kind !== "elem") return;
    W.i = (W.i || 0) + 1;
    drawSheet();
  },
  elpick: t => {
    elStore(C()).pick = t.dataset.v;
    save();
    drawSheet();
  },
  elacc: t => {
    elStore(C()).acc = t.dataset.v;
    save();
    if (W && t.dataset.v !== "Not really") W.i = 3;
    drawSheet();
  },
  elfocus: t => {
    const X = elStore(C());
    X.focus = t.dataset.v;
    X.seen = todayISO();
    save();
    if (W) W.i = 4;
    render();
    drawSheet();
  },
});
