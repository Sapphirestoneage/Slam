/* ============================================================================
   SLAM the Game: features/know.js
   PURPOSE     What you already know. Five letters, D.A.I.T.E. (Debts, Assets, Income, Taxes, Expenses).
               Each letter shows how much the player knows, the known facts first, and the next fact.
               The percent of this file is the number "Your picture" on all screens.
   INPUT       The game: G.demo. The profile: c.x.dplan, c.x.imp, c.x.none. The open sheet (W.kind):
               know. The taps of the player (the actions in OUTPUT).
   OUTPUT      10 functions. Parts of functions in other files: fogPctKnow, homeKnowStrip. Actions
               (ACT): know, kwopen, kwgo, fog, fogold.
   DEPENDS ON  core/engine.js, screens/ui.js, core/metrics.js, features/debts.js, features/reveal.js,
               features/gig.js.
   RULES       Guess counts 0. Close counts three quarters. Exact counts 1. An area with nothing in it
               can be 100%: "no debts" is a known fact. The Home tile "Your picture" and the list of
               persons use the same number.
   ========================================================================= */
const KW_AREAS = [
  ["D", "Debts", "What you owe"],
  ["A", "Assets", "What you have"],
  ["I", "Income", "What comes in"],
  ["T", "Taxes", "What comes off the top"],
  ["E", "Expenses", "What goes out"],
];
function kwRow(r) {
  return !r || !r.s ? 0 : (r.cf || 0) >= 3 ? 1 : 0.75;
}
function kwRows(rows) {
  return rows.length ? rows.reduce((a, r) => a + kwRow(r), 0) / rows.length : 0;
}
function kwWord(v) {
  return v >= 1 ? "Exact" : v > 0 ? "Close" : "Guess";
}
function kwFacts(c, d) {
  const F = { D: [], A: [], I: [], T: [], E: [] },
    add = (k, t, v, a, av, note) => F[k].push({ t, v: Math.max(0, Math.min(1, v)), a, av, note }),
    led = !!c.led,
    kn = k => (typeof knGot === "function" ? knGot(c, k) : null);
  const debts = (c.debts || []).filter(x => x.amt > 0);
  if (!led) add("D", "What you owe", 0, "sharp", "debt");
  else if (!debts.length) {
    const sure = c.placed || !!(c.x && c.x.none && c.x.none.debt);
    add(
      "D",
      sure ? "You owe nothing" : "Whether you owe anything",
      sure ? 1 : 0,
      "sharp",
      "debt",
      "A known fact counts, even when it is zero."
    );
  } else {
    add("D", "How much you owe on each", kwRows(debts), "sharp", "debt");
    if (typeof dbRate === "function") {
      add(
        "D",
        "The rate on each",
        debts.reduce((a, x) => a + (dbRate(x).cf >= 3 ? 1 : dbRate(x).cf > 0 ? 0.75 : 0), 0) / debts.length,
        "debtplan"
      );
      add(
        "D",
        "What you pay on each a month",
        debts.reduce((a, x) => a + (dbPay(x).cf >= 3 ? 1 : dbPay(x).cf > 0 ? 0.75 : 0), 0) / debts.length,
        "debtplan"
      );
    }
    add("D", "A plan for which one goes first", c.x && c.x.dplan ? 1 : 0, "debtplan");
  }
  add("A", "Cash you can reach", led ? kwRows(c.cashes || []) : 0, "sharp", "cash");
  if (led && (c.invs || []).length) {
    add("A", "What you have invested", kwRows(c.invs), "sharp", "inv");
    add("A", "What your investments cost a year", kn("fee") ? 1 : 0, "compare", "fee");
  } else
    add(
      "A",
      "Whether you have anything invested",
      led && (c.placed || !!(c.x && c.x.none && c.x.none.inv)) ? 1 : 0,
      "sharp",
      "inv",
      "Nothing invested yet is a known fact too."
    );
  add("I", "What comes in each month", led ? kwRows(c.incs || []) : 0, "sharp", "take");
  add("I", "Your lowest normal month", c.sharp && c.sharp.low ? 1 : 0, "sharp", "take");
  if (typeof isEmployee === "function" && isEmployee(c))
    add("I", "Whether your job adds to your savings", c.sharp && c.sharp.match ? 1 : 0, "sharp", "match");
  if (typeof gxOn === "function" && gxOn(c))
    add("I", "What one unit of your work really pays", gxUnit(c) ? 1 : 0, "gig", "pay");
  add("T", "Your tax rate", kn("tax") ? 1 : 0, "knask", "tax");
  if (led && (c.invs || []).length)
    add("T", "Which of your accounts are tax-friendly", c.sharp && c.sharp.tax ? 1 : 0, "sharp", "tax");
  if (typeof gxOn === "function" && gxOn(c))
    add("T", "How much to set aside from untaxed money", gxGet(c).pct != null ? 1 : 0, "gig", "tax");
  add("E", "Where your money goes each month", led ? kwRows(c.spends || []) : 0, "sharp", "spend");
  add("E", "Your spending checked against a real statement", c.x && c.x.imp ? 1 : 0, "import2");
  return F;
}
function kwAreas(c, d) {
  const F = kwFacts(c, d);
  return KW_AREAS.map(a => {
    const fs = F[a[0]],
      pct = fs.length ? Math.round((fs.reduce((s, f) => s + f.v, 0) / fs.length) * 100) : 0;
    return {
      k: a[0],
      n: a[1],
      what: a[2],
      facts: fs,
      pct,
      next: fs.find(f => f.v < 1) || null,
      known: fs.filter(f => f.v >= 1).length,
    };
  });
}
function kwAll(c, d) {
  const A = kwAreas(c, d),
    n = A.reduce((s, a) => s + a.facts.length, 0),
    got = A.reduce((s, a) => s + a.facts.reduce((t, f) => t + f.v, 0), 0),
    known = A.reduce((s, a) => s + a.known, 0),
    order = A.filter(a => a.next).sort((x, y) => x.pct - y.pct);
  return { A, pct: n ? Math.round((got / n) * 100) : 0, known, total: n, next: order.length ? order[0] : null };
}
function kwStrip(c, d) {
  const K = kwAll(c, d);
  return `<button class="rowbtn homerow kwstrip" data-a="know" aria-label="What you already know"><span style="min-width:0;flex:1"><b class="small">You already know ${K.known} of ${K.total} things</b><span class="kwrow">${K.A.map(a => `<span class="kwl ${a.pct >= 100 ? "done" : ""}"><b>${a.k}</b><i><u style="width:${Math.max(4, a.pct)}%"></u></i><em>${a.pct}%</em></span>`).join("")}</span></span><span class="caret">›</span></button>`;
}
function kwSheet() {
  const c = C(),
    d = D || derive(c),
    w = W,
    K = kwAll(c, d),
    open = w.open === undefined ? (K.next ? K.next.k : null) : w.open;
  return (
    head("Home", "What you already know") +
    `<div class="tile stack" style="gap:4px;text-align:center"><div class="tiny muted">Your picture</div><div class="bignum" data-fid="kw:pct">${K.pct}%</div><div class="small">${K.known} of ${K.total} things nailed down${K.next ? ". Next up: <b>" + esc(K.next.n) + "</b>." : ". Everything the game asks for, you know. ✓"}</div></div>
 <div class="stack" style="gap:6px">${K.A.map(a => {
   const on = open === a.k,
     done = a.pct >= 100;
   return `<div class="tile stack kwarea" style="gap:6px"><button class="kwhead" data-a="kwopen" data-v="${a.k}" aria-expanded="${on}"><span class="kwbadge ${done ? "done" : ""}">${a.k}</span><span style="min-width:0;flex:1;text-align:left"><b>${a.n}</b><span class="tiny muted" style="display:block">${done ? "All known" : a.next ? "Next: " + esc(a.next.t) : a.what}</span><i class="kwbar"><u style="width:${Math.max(3, a.pct)}%${done ? ";background:var(--good)" : ""}"></u></i></span><b class="${done ? "kwok" : ""}" style="flex:none">${done ? "✓ " : ""}${a.pct}%</b></button>
  ${
    on
      ? `<div class="stack" style="gap:4px">${a.facts
          .slice()
          .sort((x, y) => y.v - x.v)
          .map(f =>
            f.v >= 1
              ? `<div class="row between small kwfact" style="gap:8px"><span>✓ ${esc(f.t)}</span><span class="pill okp" style="flex:none">Exact</span></div>${f.note ? `<div class="tiny muted">${esc(f.note)}</div>` : ""}`
              : `<button class="rowbtn" data-a="kwgo" data-k="${f.a}" data-v="${f.av || ""}" style="gap:8px"><span style="min-width:0">○ ${esc(f.t)}</span><span class="pill ${f.v > 0 ? "warn" : ""}" style="flex:none">${kwWord(f.v)} ›</span></button>`
          )
          .join("")}</div>`
      : ""
  }</div>`;
 }).join("")}</div>
 ${K.next && K.next.next ? `<button class="primary wide go" data-a="kwgo" data-k="${K.next.next.a}" data-v="${K.next.next.av || ""}">Next: ${esc(K.next.next.t)}</button>` : ""}
 <button class="ghost wide slim" data-a="fogold">See it as a map</button>
 ${mathBox(["Each fact counts 0 while it is a guess, three quarters when it is close, and fully when it is exact.", "An area's percent is the average of its facts. The big number is the average of every fact.", "Zero is an answer: owing nothing, or having nothing invested yet, counts as known once you have said so."])}`
  );
}
Object.assign(ACT, {
  know: () => {
    W = { kind: "know" };
    sheet(kwSheet);
  },
  kwopen: t => {
    const k = t.dataset.v;
    W.open =
      W.open === k ||
      (W.open === undefined &&
        (() => {
          const K = kwAll(C(), D || derive(C()));
          return K.next && K.next.k === k;
        })())
        ? null
        : k;
    drawSheet();
  },
  kwgo: t => {
    const a = t.dataset.k,
      v = t.dataset.v;
    if (typeof ACT[a] !== "function") return;
    ACT[a]({ dataset: { a, v, k: v } });
  },
});
(() => {
  const _fog = ACT.fog;
  ACT.fog = function (t) {
    return ACT.know(t);
  };
  ACT.fogold = _fog;
})();
/* Part of fogPct() in engine2.js. One number on all screens: the Home tile and the list of people show this percent. */
function fogPctKnow(c, d) {
  return kwAll(c, d || derive(c)).pct;
}
/* Part of home() in ui.js. Adds the strip "What you already know" below the four tiles. */
function homeKnowStrip(h) {
  const c = C();
  if (G.demo || !c.led) return h;
  return typeof homeRowAdd === "function" ? homeRowAdd(h, kwStrip(c, D || derive(c))) : h;
}
Object.assign(GLOSS, {
  daite: [
    "D.A.I.T.E.",
    "The five things to know about your money: Debts, Assets, Income, Taxes, Expenses. Know these five and every plan gets easier.",
  ],
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
