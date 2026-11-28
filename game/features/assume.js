/* ============================================================================
   SLAM the Game: features/assume.js
   PURPOSE     Assumptions (run CC-1, item 14, Nov 27 2026). The rates and ages behind the numbers are not on
               the main screens. Each "Show the math" ends with one small line that names the two rates
               and one button, Assumptions. The button opens one sheet: each assumption with its value,
               an "i", and the mark Usual or Yours. An assumption the engines can take from the player is
               changed there by a tap, with "Back to the usual value". An assumption the engines cannot
               take from the player yet is shown, and the sheet says so.
   INPUT       The profile: c.age, c.ret (the age work is optional), c.death (the age the money lasts to),
               c.x.ss (the share of Social Security the plan counts). The constants of the engines: R,
               SWR (core/engine.js), LY_END (core/paylayers.js). The open sheet (W.kind assume, W.msg).
   OUTPUT      Data: AS_LIST. Functions: asUsual, asVal, asMine, asRows, asSet, asSheet. Part of a function
               in a different file: asMathRow (mathBox in ui.js). Actions (ACT): assume, asset, asusual, asdone.
   DEPENDS ON  core/report.js, core/engine.js (R, SWR), core/paylayers.js (LY_END), screens/ui.js (ACT, C,
               esc, ib, head, save, render, sheet, drawSheet, GLOSS), features/kit.js (kitPill, kitTerms).
   RULES       ONE PLACE. This file holds no value of its own. A value the player can change is a field
               of the profile that the engines already read (c.ret, c.death, c.x.ss): the sheet writes
               that field, and every engine reads it as before. So there is no second way to work out a
               number. "Yours" means: the field differs from the usual value. A fixed assumption is read
               from the constant of the engine (R, SWR, LY_END): the engines and the words of the game
               use these constants in many places, so the player cannot change them yet (QUESTIONS 663).
               No new math. The same three fields are also on Me, Your timeline, and in setup: the same
               keys, so the two places always agree.
   COMPAT      No new key. An old saved game shows its values as they are.
   STATE       None.
   ========================================================================= */
/* The assumptions. id. n: the name in plain words. term: the "i" (GLOSS). unit: pct, age or share.
   fixed: () => the constant of the engine (the player cannot change it yet). Else: get(c), usual(c), set(c, v),
   opts(c): the values to tap. */
const AS_LIST = [
  { id: "grow", n: "Growth of invested money, a year", term: "asgrow", unit: "pct", fixed: () => R },
  { id: "take", n: "Taken out of invested money, a year", term: "astake", unit: "pct", fixed: () => SWR },
  {
    id: "ret",
    n: "The age work is optional",
    term: "asret",
    unit: "age",
    get: c => c.ret,
    usual: c => Math.max(60, (c.age || 0) + 5),
    set: (c, v) => (c.ret = v),
    opts: c => [45, 50, 55, 60, 65, 70].filter(x => x > (c.age || 0)),
  },
  {
    id: "death",
    n: "The age your money lasts to",
    term: "asdeath",
    unit: "age",
    get: c => c.death,
    usual: () => 90,
    set: (c, v) => (c.death = v),
    opts: () => [85, 90, 95, 100],
  },
  {
    id: "ss",
    n: "Social Security your plan counts",
    term: "asss",
    unit: "share",
    get: c => (c.x && c.x.ss != null ? c.x.ss : 1),
    usual: () => 1,
    set: (c, v) => {
      c.x = c.x || {};
      c.x.ss = v;
    },
    opts: () => [1, 0.75, 0.5, 0],
  },
  { id: "end", n: "The last age on the chart of your number", term: "asend", unit: "age", fixed: () => LY_END },
];
const asGet = id => AS_LIST.find(A => A.id === id) || null;
/* The words of one value. */
function asWords(A, v) {
  if (v == null || !Number.isFinite(+v)) return "Not set";
  if (A.unit === "pct") return Math.round(v * 1000) / 10 + "%";
  if (A.unit === "share") return v === 1 ? "All of it" : v === 0 ? "None" : Math.round(v * 100) + "%";
  return "Age " + v;
}
/* The usual value of an assumption for this profile. */
function asUsual(c, id) {
  const A = asGet(id);
  return !A ? null : A.fixed ? A.fixed() : A.usual(c);
}
/* The value in use: the field of the profile, or the constant of the engine. */
function asVal(c, id) {
  const A = asGet(id);
  return !A ? null : A.fixed ? A.fixed() : A.get(c);
}
/* True when the player has their own value. */
function asMine(c, id) {
  const A = asGet(id);
  return !!A && !A.fixed && A.get(c) != null && A.get(c) !== A.usual(c);
}
/* The rows of the sheet: [{ id, n, term, v, words, usual, usualWords, mine, can, opts: [{ v, words, on }] }]. */
function asRows(c) {
  return AS_LIST.map(A => {
    const v = asVal(c, A.id),
      u = asUsual(c, A.id);
    return {
      id: A.id,
      n: A.n,
      term: A.term,
      v,
      words: asWords(A, v),
      usual: u,
      usualWords: asWords(A, u),
      mine: asMine(c, A.id),
      can: !A.fixed,
      opts: A.fixed
        ? []
        : [...new Set(A.opts(c).concat(u))]
            .sort((a, b) => (A.unit === "share" ? b - a : a - b))
            .map(x => ({ v: x, words: asWords(A, x), on: x === v })),
    };
  });
}
/* Set one assumption (v: a value of its list), or go back to the usual value (v: null). Returns true when the
   profile changed. The engines read the same field, so the next draw recalculates. */
function asSet(c, id, v) {
  const A = asGet(id);
  if (!A || A.fixed || !c) return false;
  const to = v == null ? A.usual(c) : +v;
  if (!Number.isFinite(to) || !A.opts(c).concat(A.usual(c)).includes(to) || A.get(c) === to) return false;
  A.set(c, to);
  return true;
}
/* Part of mathBox() in ui.js. The last line of each "Show the math": the two rates, and the way to the sheet.
   Inside the opening (the flow What it is / What it could be) the line has no button: a new player has no game
   yet, and the flow keeps its one way forward. The button is on every other "Show the math". */
function asMathRow() {
  try {
    const flow = typeof W !== "undefined" && W && W.kind === "cb";
    return `<div class="row between asrow" style="gap:8px;flex-wrap:wrap"><span>Assumes ${asWords(asGet("grow"), R)} growth a year and ${asWords(asGet("take"), SWR)} taken out a year.</span>${flow ? "" : `<button class="ghost slim" style="min-height:44px" data-a="assume">Assumptions</button>`}</div>`;
  } catch (e) {
    report(e, "assume.js: asMathRow");
    return "";
  }
}
/* THE SHEET. */
function asSheet() {
  const c = C(),
    rows = asRows(c);
  return (
    `<div class="stack" style="gap:10px"><div><div class="tiny muted">Show the math</div><h2 style="margin:4px 0 0">Assumptions</h2></div>` +
    `<div class="small muted">The rates and ages behind your numbers. The usual values fit most plans. A change here is yours, and the game recalculates.</div>` +
    (W && W.msg ? `<div class="tile small" role="status" data-fid="as:msg">${esc(W.msg)}</div>` : "") +
    rows
      .map(
        r =>
          `<div class="tile stack asitem" style="gap:6px" data-as="${r.id}"><div class="row between" style="gap:8px"><span class="small">${esc(r.n)}</span><span class="row" style="gap:6px">${kitPill(r.mine ? "Yours" : "Usual")}${ib("term:" + r.term)}</span></div><b>${esc(r.words)}</b>${
            r.can
              ? `<div class="chips">${r.opts.map(o => `<button class="chip ${o.on ? "on" : ""}" data-a="asset" data-k="${r.id}" data-v="${o.v}">${esc(o.words)}</button>`).join("")}</div>` +
                (r.mine
                  ? `<button class="ghost slim" style="min-height:44px;align-self:flex-start" data-a="asusual" data-k="${r.id}">Back to the usual value (${esc(r.usualWords)})</button>`
                  : "")
              : `<div class="tiny muted">Set by the game. Your own value is not possible here yet.</div>`
          }</div>`
      )
      .join("") +
    `<button class="ghost wide" data-a="asdone">${W && W.from ? "Back to where you were" : "Done"}</button></div>`
  );
}
Object.assign(ACT, {
  /* the button Assumptions of a "Show the math" */
  assume: () => {
    /* from: the sheet the button was on, with its state, so that Back and Done return to it */
    const from = W && W.kind === "assume" ? W.from : SH ? { sh: SH, w: W } : null;
    W = { kind: "assume", msg: "", from };
    sheet(asSheet);
  },
  /* Back, Close or Done: the sheet the player came from is drawn again, with the new numbers */
  asdone: () => {
    const from = W && W.kind === "assume" ? W.from : null;
    if (!from) return closeSheet();
    W = from.w;
    sheet(from.sh);
  },
  /* one tap on a value */
  asset: t => {
    if (!W || W.kind !== "assume") return;
    const c = C(),
      ok = asSet(c, t.dataset.k, t.dataset.v);
    if (ok) {
      save();
      render();
      W.msg =
        "Recalculating. Your numbers now use " +
        asGet(t.dataset.k).n.toLowerCase() +
        ": " +
        asRows(c).find(r => r.id === t.dataset.k).words +
        ".";
    }
    drawSheet();
  },
  /* Back to the usual value */
  asusual: t => {
    if (!W || W.kind !== "assume") return;
    const c = C();
    if (asSet(c, t.dataset.k, null)) {
      save();
      render();
      W.msg = "Recalculating. Back to the usual value.";
    }
    drawSheet();
  },
});
kitTerms({
  asgrow: [
    "Growth of invested money",
    "How much invested money grows in a year, after inflation. The game uses 7% a year: about what a broad mix of stocks has grown over long periods, after prices rise. No year is promised. Some years are far above it and some far below. What has to go right: you stay invested for many years. Backup if it doesn't: the game recalculates from your real balances each time you update them.",
  ],
  astake: [
    "Taken out of invested money",
    "The share of your invested money you take out each year to live on once work is optional. The game uses 4%. That is why your FI number is 25 times a year of spending: 100 divided by 4 is 25. Taking out money: guardrails shows what a flexible rate does.",
  ],
  asret: [
    "The age work is optional",
    "The age you would like paid work to be a choice. The usual value is 60, or 5 years from now if that is later. An earlier age needs more saved before it. The same answer is on Me, under Your timeline.",
  ],
  asdeath: [
    "The age your money lasts to",
    "The age your plan pays for. The usual value is 90. A long life is the expensive kind, so 90 or more is the safe side. The same answer is on Me, under Your timeline.",
  ],
  asss: [
    "Social Security your plan counts",
    "Social Security is money the government pays you each month when you are older. Your plan can count all of it, a part, or none. Counting less is the careful side. The same answer is in setup and in My number.",
  ],
  asend: ["The last age on the chart", "The chart of What it is and What it could be shows each year up to this age."],
});
