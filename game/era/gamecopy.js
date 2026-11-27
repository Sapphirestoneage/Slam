/* ============================================================================
   SLAM the Game: era/gamecopy.js
   PURPOSE     The parts of the game that the demo "Find your era" (era/index.html) shows and that cannot
               load alone: the range chips of the entry and their labels, and the money words.
   INPUT       Nothing.
   OUTPUT      roughOn, money, esc, lkK, CB_RNG, CB_QS, cbRng, cbRows, cbLab, and G (empty: the demo has no saved game).
   DEPENDS ON  core/engine.js (SPEND_K, SPLIT).
   RULES       GENERATED FILE. Do not edit it. Each part is a word-for-word copy of a declaration in
               screens/ui.js, features/look.js, features/couldbe.js.
               tools/game_era_build.mjs makes it. Change the source, then run the tool.
               The game does not load this file. Prettier does not format it (.prettierignore).
   SOURCE-HASH  389928f6dc07da04
   ========================================================================= */
/* The demo has no saved game. The money words read G for the switch "Rough numbers". */
const G = null;

/* ---------- from screens/ui.js ---------- */
/* Rough numbers (features/enough.js, the one switch G.rough): a range in place of every exact amount. Display only. */
const roughOn = () => !!(G && G.rough && typeof enRough === "function");
const money = n =>
  roughOn() ? enRough(n) || "$0" : (n < 0 ? "-" : "") + "$" + Math.round(Math.abs(n)).toLocaleString();
const esc = s =>
  String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);

/* ---------- from features/look.js ---------- */
/* Short money: $10k, $1.2M. */
function lkK(v) {
  if (typeof roughOn === "function" && roughOn()) return money(v); /* Rough numbers: the range of money() */
  const a = Math.abs(v),
    sg = v < 0 ? "-" : "";
  if (a >= 1e6) return sg + "$" + Math.round(a / 1e5) / 10 + "M";
  if (a >= 1e4) return sg + "$" + Math.round(a / 1e3) + "k";
  if (a >= 1e3) return sg + "$" + Math.round(a / 100) / 10 + "k";
  return money(v);
}

/* ---------- from features/couldbe.js ---------- */
/* The range chips of the four questions: [low, high]. The amount of a chip is the middle. A last chip with no
   high end counts as its low end times 1.5. */
const CB_RNG = {
  age: [
    [18, 24],
    [25, 29],
    [30, 34],
    [35, 39],
    [40, 44],
    [45, 49],
    [50, 54],
    [55, 59],
    [60, 64],
    [65, 69],
  ],
  spend: [
    [1000, 2000],
    [2000, 3000],
    [3000, 4000],
    [4000, 5000],
    [5000, 7000],
    [7000, 10000],
    [10000, null],
  ],
  inv: [
    [0, 0],
    [0, 10000],
    [10000, 50000],
    [50000, 100000],
    [100000, 250000],
    [250000, 500000],
    [500000, 1000000],
    [1000000, null],
  ],
  save: [
    [0, 0],
    [0, 250],
    [250, 500],
    [500, 1000],
    [1000, 2000],
    [2000, 4000],
    [4000, null],
  ],
  /* health insurance of your own, a month */
  health: [
    [0, 300],
    [300, 600],
    [600, 900],
    [900, 1300],
    [1300, null],
  ],
};
const CB_QS = [
  { id: "age", l: "How old are you?", h: "A range is fine.", zero: "" },
  {
    id: "spend",
    l: "About how much do you spend in a month?",
    h: "Everything that goes out: rent, food, bills, fun. A rough range is fine.",
    zero: "",
  },
  {
    id: "inv",
    l: "About how much do you have invested?",
    h: "Retirement accounts and other investments together. Not your checking or savings.",
    zero: "Nothing yet",
  },
  {
    id: "save",
    l: "About how much do you save or invest in a month?",
    h: "What is left after spending and goes into savings or investments.",
    zero: "Nothing right now",
  },
];
/* One range chip: { lo, hi, v (the amount it counts as), zero }. */
function cbRng(q, i) {
  const r = (CB_RNG[q] || [])[i];
  if (!r) return null;
  const hi = r[1] == null ? Math.round(r[0] * 2) : r[1];
  return {
    lo: r[0],
    hi,
    open: r[1] == null,
    zero: r[0] === 0 && r[1] === 0,
    v: r[1] == null ? r[0] * 1.5 : Math.round((r[0] + hi) / 2),
  };
}
/* The rows that setup writes, from the four answers. A chip is a Guess (s false); a typed amount is known. The one
   spending total is spread over the five groups by the stock split of the game, so the split stays a guess. */
function cbRows(a) {
  const ex = k => !!a[k] && a[k].cf === 3,
    spend = Math.max(1, Math.round(a.spend.v)),
    both = ex("spend") && ex("save");
  let left = spend;
  return {
    incs: [Object.assign({ k: "A main job", amt: spend + Math.round(a.save.v), s: both }, both ? { cf: 3 } : {})],
    spends: SPEND_K.map((k, i) => {
      const amt = i === SPEND_K.length - 1 ? left : Math.round((spend * SPLIT[i]) / 10) * 10;
      left -= amt;
      return Object.assign({ k, amt, s: ex("spend"), h: true }, ex("spend") ? { cf: 2 } : {});
    }),
    invs:
      a.inv.v > 0
        ? [
            Object.assign(
              { k: "Retirement plan at work", amt: Math.round(a.inv.v), s: ex("inv") },
              ex("inv") ? { cf: 3 } : {}
            ),
          ]
        : [],
  };
}
/* The label of a range chip, from the one money formatter. */
function cbLab(q, i) {
  const r = cbRng(q, i),
    f = q === "age" ? String : lkK;
  if (r.zero) return (CB_QS.find(x => x.id === q) || {}).zero || "Nothing";
  if (q === "age") return i === 0 ? "Under " + (r.hi + 1) : r.lo + " to " + r.hi;
  if (r.open) return f(r.lo) + " or more";
  return r.lo === 0 || (i === 0 && q === "spend") ? "Under " + f(r.hi) : f(r.lo) + " to " + f(r.hi);
}
