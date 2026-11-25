/* ============================================================================
   SLAM the Game: features/ways.js
   PURPOSE     Compare the ways. The same plan (the money, the spending, the stop age, Social Security)
               through each way to take money out: the 4% rule and its settings, guardrails, floor and
               ceiling, a share of the portfolio, spend by age, the ways to hold the money, the CAPE
               rule, and one way that the player builds. Each way is one row: spending in year one, the
               count of 1,000 random markets and of the real start years that work, the hardest real
               start year, the deepest cut, the years with a cut, the money left, and the age work can
               stop. The player sorts, filters, pins 3 rows, and sees one chart of the spending from the
               start year 1966.
   INPUT       The profile, through oddsInputs() of features/odds.js. c.x.cmp (the pins and the picks of
               the custom way, as { v, cf }). data/market.js. The open sheet (W.kind): takeout, with
               W.tab "compare" and W.cmp (the open families, the sort and the filter).
   OUTPUT      Functions: cmpInputs, cmpPicks, cmpWays, cmpPlan, cmpLead, cmpSmooth, cmpReal, cmpRandom,
               cmpStopAge, cmpRow, cmpRows, cmpChart, cmpBook, cmpCard, cmpCustom, cmpTab. Actions (ACT):
               cmpopen, cmppin, cmpfilter, cmpsort, cmpset, cmprate. A tab of "Taking money out".
   DEPENDS ON  core/withdraw.js (each rule, the list of ways, the summary of the histories),
               features/odds.js (oddsInputs, oddsRun, oddsYears, ODDS_TARGET), features/retire.js (only
               through oddsRun), features/slept.js (sleptRate), features/kit.js, features/takeout.js
               (tkoSheet calls cmpTab), screens/ui.js.
   RULES       This file has no engine of its own. Each run is oddsRun() of odds.js with a way of
               core/withdraw.js. A real start year is the year work stops: the years before it grow at
               the return of the plan. A random market is the real years in a random order (a fixed
               seed). A start year "works" when the money lasts and no year pays less than the share
               that the way tolerates. All amounts are in today's dollars. No verdict words: a row is
               a set of counts. The past is not a forecast.
   ========================================================================= */
const CMP_RUNS = 1000;
const CMP_SEED = 7;
const CMP_YEAR = 1966;
const CMP_UNTIL = 80;
const CMP_RATES = [0.03, 0.035, 0.04, 0.045, 0.05];
const CMP_LEFT = [0, 100000, 250000, 500000];
const CMP_LINES = [
  { color: "var(--sap)", dashes: "" },
  { color: "#fff", dashes: "6 4" },
  { color: "var(--a3)", dashes: "2 3" },
];
const CMP = { key: "", rows: {}, lists: {} };
/* The numbers of the plan that each way gets: the inputs of the retirement odds, and the return of the plan. */
function cmpInputs(c) {
  const P = oddsInputs(c);
  P.growth = typeof sleptRate === "function" ? sleptRate(c) : R;
  return P;
}
/* The picks of the player: the pinned rows, the custom way, and the Die With Zero target. */
function cmpPicks(c) {
  const g = (k, d) => kitValue(c, "cmp", k, d).v,
    pins = g("pins", "");
  return {
    pins: String(pins || "")
      .split(",")
      .filter(id => id && (id === "custom" || wayById(id))),
    kind: g("kind", WAY_CUSTOM_DEFAULT.kind),
    rate: g("rate", WAY_CUSTOM_DEFAULT.rate),
    timing: g("timing", WAY_CUSTOM_DEFAULT.timing),
    horizon: g("horizon", 0) || null,
    left: g("left", 0),
    leftAge: g("leftAge", 0) || null,
  };
}
/* Each way, with the picks of the player in the custom way and in the Die With Zero way. */
function cmpWays(c) {
  const K = cmpPicks(c);
  return WAYS.map(w =>
    w.custom ? wayCustom(K) : w.rule === "dwz" ? Object.assign({}, w, { target: K.left, targetAge: K.leftAge }) : w
  );
}
/* The plan for one way and one stop age. A way with its own count of years ends that many years after the stop. */
function cmpPlan(P, way, ret) {
  return Object.assign({}, P, { ret, way, death: way.horizon ? ret + way.horizon : Math.max(ret + 1, P.death) });
}
/* The years before the stop age: each one grows at the return of the plan. */
function cmpLead(Q) {
  const rows = [];
  for (let a = Q.age; a < Q.ret; a++) rows.push([Q.growth, Q.growth, 0, null, null, null]);
  return rows;
}
/* The last CAPE in the data: the smooth market uses it for the CAPE rule. */
function cmpCape() {
  const Y = oddsYears();
  for (let i = Y.length - 1; i >= 0; i--) if (Y[i][4] != null) return Y[i][4];
  return null;
}
/* A SMOOTH MARKET: each year grows at the return of the plan. It gives the spending of year one. */
function cmpSmooth(Q) {
  const rets = cmpLead(Q),
    cape = cmpCape();
  for (let a = Q.ret; a < Q.death; a++) rets.push([Q.growth, Q.growth, 0, cape, null, null]);
  return oddsRun(Q, rets);
}
/* The real years that a way can read: all of them, or the years with a CAPE for a way that needs it. */
function cmpPool(way) {
  return oddsYears().filter(y => (way.needs === "cape" ? y[4] != null : true));
}
/* EACH REAL START YEAR: work stops in that year, and the real years follow in order. */
function cmpReal(Q, year) {
  const Y = oddsYears(),
    L = Q.death - Q.ret,
    lead = cmpLead(Q),
    out = [];
  for (let i = 0; i + L <= Y.length; i++) {
    if (year != null && Y[i][0] !== year) continue;
    const span = Y.slice(i, i + L);
    if (Q.way.needs === "cape" && span.some(y => y[4] == null)) continue;
    const run = oddsRun(Q, lead.concat(span.map(y => y.slice(1))));
    out.push(
      Object.assign(
        { start: Y[i][0], lasted: run.ok, ranOutAge: run.shortAge, end: run.end, paid: run.paid },
        wayCycle(run.paid)
      )
    );
  }
  return out;
}
/* THE RANDOM MARKETS: the real years in a random order, 1,000 times. Returns the count that works. */
function cmpRandom(Q) {
  const pool = cmpPool(Q.way),
    L = Q.death - Q.ret,
    key = pool.length + "|" + L,
    lists = (CMP.lists[key] = CMP.lists[key] || wayShuffle(pool.length, L, CMP_RUNS, CMP_SEED)),
    lead = cmpLead(Q),
    tol = wayTolerance(Q.way);
  let ok = 0;
  lists.forEach(list => {
    const run = oddsRun(Q, lead.concat(list.map(i => pool[i].slice(1))));
    if (run.ok && wayCycle(run.paid).lowest >= tol) ok++;
  });
  return { ok, runs: lists.length };
}
/* THE AGE WORK CAN STOP on one way: the first age where a smooth market works, year one pays the need,
   and the real start years reach the target of the retirement odds. Null when no age to 80 does. */
function cmpStopAge(P, way) {
  const tol = wayTolerance(way);
  for (let a = P.age; a <= CMP_UNTIL; a++) {
    if (way.rule === "rmd" && a < (way.fromAge || 73)) continue;
    const Q = cmpPlan(P, way, a),
      S = cmpSmooth(Q),
      one = wayCycle(S.paid);
    if (!S.ok || one.lowest < tol || !(one.first >= P.spend * 0.999)) continue;
    const H = wayHistory(cmpReal(Q), tol);
    if (H.n && H.share >= ODDS_TARGET) return a;
  }
  return null;
}
/* ONE ROW of the table for one way. The answers are kept until a number of the plan changes. */
function cmpRow(c, way) {
  const P = cmpInputs(c),
    key = JSON.stringify([P, cmpPicks(c)]);
  if (CMP.key !== key) {
    CMP.key = key;
    CMP.rows = {};
  }
  if (CMP.rows[way.id]) return CMP.rows[way.id];
  const off = wayOff(way, { where: "game", stopAge: P.ret, hasCape: cmpCape() != null, hasYield: true });
  let row;
  if (off) row = wayRow(way, { off });
  else {
    const Q = cmpPlan(P, way, P.ret),
      S = cmpSmooth(Q),
      Rn = cmpRandom(Q),
      at = S.paid.length ? cmpAtStop(Q) : 0;
    row = wayRow(way, {
      first: S.paid.length ? S.paid[0].spend : 0,
      need: P.spend,
      atStop: at,
      stopAt: P.ret,
      target: ODDS_TARGET,
      cycles: cmpReal(Q),
      randomOk: Rn.ok,
      randomRuns: Rn.runs,
      years: Q.death - Q.ret,
      stopAge: cmpStopAge(P, way),
    });
  }
  CMP.rows[way.id] = row;
  return row;
}
/* The money on the day work stops, on a smooth market: the same run, stopped one day before the first withdrawal. */
function cmpAtStop(Q) {
  let p = Q.inv;
  for (let a = Q.age; a < Q.ret; a++) p = p * (1 + Q.growth) + Q.monthly * 12;
  return p;
}
/* The rows on the screen: the default row of each family, the variants of each open family, in the order
   of the sort and the filter. */
function cmpRows(c, V) {
  const ways = cmpWays(c),
    shown = ways.filter((w, i) => ways.findIndex(x => x.family === w.family) === i || V.open[w.family]),
    rows = shown.map(w => cmpRow(c, w)),
    kept = wayFilter(rows, V.filter);
  return V.sort ? waySort(kept, V.sort, V.dir) : kept;
}
/* THE CHART: the spending of each year from the start year 1966, one line for each row. When the plan is
   longer than the years after 1966, the chart uses the hardest start year of the first row. */
function cmpChart(c, ids) {
  const P = cmpInputs(c),
    ways = cmpWays(c).filter(w => ids.indexOf(w.id) >= 0 && !cmpRow(c, w).off),
    last = oddsYears()[oddsYears().length - 1][0],
    span = ways.reduce((m, w) => Math.max(m, cmpPlan(P, w, P.ret).death - P.ret), 0),
    year = CMP_YEAR + span - 1 <= last ? CMP_YEAR : ways.length ? cmpRow(c, ways[0]).worstYear : CMP_YEAR,
    lines = ways
      .map(w => {
        const run = cmpReal(cmpPlan(P, w, P.ret), year)[0];
        return run ? { id: w.id, name: w.name, pts: run.paid.map(y => [y.age, Math.round(y.spend / 12)]) } : null;
      })
      .filter(Boolean);
  return { year, lines };
}
/* The rows of the plan spreadsheet: the default way of each family. */
function cmpBook(c) {
  const P = cmpInputs(c),
    ways = cmpWays(c),
    rows = [
      {
        id: "cw_at",
        label: "Invested on the day work stops",
        v: Math.round(cmpAtStop(P)),
        note: "Worked out by the game: your money grown at the return of your plan, plus what you invest each month",
      },
      { id: "cw_need", label: "Spending a year in retirement", v: P.spend, note: "Today's dollars" },
    ];
  WAY_FAMILIES.forEach(f => {
    const w = ways.find(x => x.family === f.id),
      r = cmpRow(c, w),
      k = "cw_" + f.id;
    if (r.off) return;
    const made =
      "Worked out by the game: " + f.name + ", " + w.name + ". A spreadsheet cannot replay the market years.";
    rows.push(
      w.rule === "fixed" && w.anchor === "rate"
        ? { id: k + "_rate", label: w.name + ": the share taken in year one", v: w.rate }
        : null,
      Object.assign(
        { id: k + "_first", label: w.name + ": spending in year one, a year", v: r.first },
        w.rule === "fixed" && w.anchor === "rate" ? { f: "={cw_at}*{" + k + "_rate}" } : { note: made }
      ),
      {
        id: k + "_month",
        label: w.name + ": spending in year one, a month",
        v: r.first / 12,
        f: "={" + k + "_first}/12",
      },
      { id: k + "_ok", label: w.name + ": real start years that work", v: r.ok, note: made },
      { id: k + "_n", label: w.name + ": real start years in all", v: r.n },
      {
        id: k + "_of100",
        label: w.name + ": real start years that work, out of 100",
        v: Math.round((r.ok / r.n) * 100),
        f: "=ROUND({" + k + "_ok}/{" + k + "_n}*100,0)",
      },
      { id: k + "_rand", label: w.name + ": random markets that work, of " + r.randomRuns, v: r.randomOk, note: made },
      { id: k + "_worst", label: w.name + ": hardest real start year", v: r.worstYear, note: made },
      { id: k + "_low", label: w.name + ": lowest share paid in that start year", v: r.drop, note: made },
      {
        id: k + "_deep",
        label: w.name + ": lowest share paid in any start year where the money lasted",
        v: r.deepest == null ? "" : r.deepest,
        note: made,
      },
      { id: k + "_cuts", label: w.name + ": years with a cut in the hardest start year", v: r.cuts, note: made },
      {
        id: k + "_end",
        label: w.name + ": money left at the end, the middle start year",
        v: Math.round(r.end),
        note: made,
      },
      { id: k + "_age", label: w.name + ": the age work can stop", v: r.stopAge == null ? "" : r.stopAge, note: made }
    );
  });
  return { title: "Compare the ways to take money out", rows: rows.filter(Boolean) };
}
/* The words of the numbers of one row. */
function cmpWords(r) {
  const pct = v => Math.round(v * 100) + "%",
    cut = r.deepest == null ? null : Math.round((1 - r.deepest) * 100);
  return {
    first: money(r.first / 12) + " a month",
    firstSub: money(r.first) + " a year",
    random: r.randomOk.toLocaleString() + " of " + r.randomRuns.toLocaleString(),
    real: r.ok + " of " + r.n,
    worst:
      r.worstYear == null
        ? "No start year fits"
        : r.worstYear +
          ": " +
          (r.worstRanOut != null
            ? "money short at " + r.worstRanOut
            : r.drop >= WAY_CUT_LINE
              ? "no cut"
              : "lowest year pays " + pct(r.drop)),
    deepest: cut == null ? "No start year lasted" : cut < 1 ? "No cut" : cut + "% down",
    cuts: r.cuts + " of " + r.years,
    end: money(Math.round(r.end)),
    stop: r.stopAge == null ? "No age to " + CMP_UNTIL : "Age " + r.stopAge,
  };
}
/* ONE ROW as a card. st is Guess, Close or Exact. pinned: the row is one of the pinned rows. */
function cmpCard(r, st, pinned, full) {
  const top = `<div class="row between" style="gap:8px"><b class="small" style="min-width:0">${esc(r.name)}</b><span class="row" style="gap:6px;flex:none">${r.off ? "" : kitPill(st)}${kitInfo("way_" + r.id)}</span></div>${full ? `<div class="tiny muted">${esc(r.familyName)}</div>` : ""}`;
  if (r.off)
    return `<div class="tile stack cmprow cmpoff" style="gap:6px">${top}<div class="small">${esc(r.off)}</div></div>`;
  const w = cmpWords(r),
    g = st === "Guess" ? " guess" : "",
    cell = (label, big, sub) =>
      `<div class="cmpcell"><div class="tiny muted">${label}</div><div class="cmpnum${g}">${esc(big)}</div>${sub ? `<div class="tiny muted">${esc(sub)}</div>` : ""}</div>`;
  return `<div class="tile stack cmprow ${pinned ? "kithot" : ""}" style="gap:8px">${top}<div class="cmpgrid">${
    cell("Year one", w.first, w.firstSub) +
    cell("Work can stop", w.stop, "") +
    cell("Random markets that work", w.random, "") +
    cell("Real start years that work", w.real, "") +
    cell("Hardest start year", w.worst, "") +
    cell("Deepest cut", w.deepest, "") +
    cell("Years with a cut", w.cuts, "in the hardest start") +
    cell("Left at the end", w.end, "the middle start year")
  }</div><div class="row" style="gap:8px"><button class="${pinned ? "primary" : "ghost"} slim" data-a="cmppin" data-v="${esc(r.id)}">${pinned ? "Unpin" : "Pin to compare"}</button></div>${mathBox(wayMath(r, money, MARKET_HISTORY.source + ", fetched " + MARKET_HISTORY.fetched))}</div>`;
}
/* The picks of the custom way: the family, the rate (a slider, chips, or a typed number), when the money
   comes out, and the count of years. */
function cmpCustom(c) {
  const K = cmpPicks(c),
    way = wayCustom(K),
    chips = (key, list, cur) =>
      `<div class="chips">${list.map(x => `<button class="chip ${x[0] === cur ? "on" : ""}" data-a="cmpset" data-k="${key}" data-v="${esc(String(x[0]))}">${esc(x[1])}</button>`).join("")}</div>`,
    pct = Math.round(K.rate * 10000) / 100;
  return (
    `<div class="tile stack cmpcustom" style="gap:10px"><b class="small">Build your own</b>` +
    `<div class="field"><span class="small">The family</span>${chips(
      "kind",
      WAY_CUSTOM_KINDS.map(k => [k[0], k[1]]),
      K.kind
    )}</div>` +
    (way.usesRate
      ? `<div class="field"><label class="small" for="cmprate">The share in year one: <b id="cmprateval">${pct}%</b></label><input type="range" id="cmprate" class="cmpslide" min="2" max="7" step="0.05" value="${pct}" data-k="cmprate" aria-label="The share in year one, in percent">${chips(
          "rate",
          CMP_RATES.map(v => [v, kitPct(v)]),
          K.rate
        )}<div class="row" style="gap:8px;align-items:center"><input type="number" class="cmptype" inputmode="decimal" min="1" max="10" step="0.05" value="${pct}" data-k="cmpratetyped" aria-label="Type the share, in percent"><button class="ghost slim" data-a="cmprate">Use this number</button></div><div class="tiny muted">Slide, tap a chip, or type a percent from 1 to 10.</div></div>`
      : `<div class="tiny muted">This family starts at what your life costs, so there is no rate to pick.</div>`) +
    `<div class="field"><span class="small">When the money comes out</span>${chips(
      "timing",
      WAY_TIMINGS.map(t => [t.id, t.name]),
      K.timing
    )}</div>` +
    `<div class="field"><span class="small">For how many years</span>${chips(
      "horizon",
      [[0, "To the end of your plan"]].concat(WAY_HORIZONS.map(v => [v, v + " years"])),
      K.horizon || 0
    )}</div></div>`
  );
}
/* THE TAB "Compare the ways" of the sheet "Taking money out". Part of tkoSheet() in takeout.js. */
function cmpTab(c) {
  const P = cmpInputs(c);
  if (!(P.inv > 0) && !(P.monthly > 0))
    return `<div class="tile small">Add your investments, and each way to take money out shows here with your numbers.</div><button class="ghost wide" data-a="tab" data-v="money">Open My Money</button>`;
  W.cmp = W.cmp || { open: {}, sort: "", dir: "best", filter: "all" };
  const V = W.cmp,
    K = cmpPicks(c),
    ways = cmpWays(c),
    st = kitState([
      kitSharp(c, "inv"),
      kitSharp(c, "take"),
      kitSharp(c, "spend"),
      kitValue(c, "odds", "stock", P.stock),
    ]),
    rows = cmpRows(c, V),
    pins = K.pins.map(id => ways.find(w => w.id === id)).filter(Boolean),
    chartIds = pins.length ? pins.map(w => w.id) : ["steady-4", "guard"],
    Ch = cmpChart(c, chartIds),
    flat = !!V.sort || V.filter !== "all",
    count = f => ways.filter(w => w.family === f).length - 1,
    all = ways.map(w => CMP.rows[w.id]).filter(Boolean),
    mean = wayMeaning(all.length ? all : rows, K.pins, v => money(Math.round(v)));
  let h = `<div class="small">Your plan, the same each time: <b>${money(Math.round(cmpAtStop(P)))}</b> invested when work stops at ${P.ret}, <b>${money(P.spend)}</b> a year of spending, to age ${P.death}. Only the way to take the money out changes.</div>`;
  /* the pinned rows, at the top */
  h += pins.length
    ? `<div class="small"><b>Pinned (${pins.length} of 3)</b></div><div class="cmppins">${pins.map(w => cmpCard(cmpRow(c, w), st, true, true)).join("")}</div>`
    : `<div class="tiny muted">Pin up to 3 ways. They move here, side by side, and the chart draws one line for each.</div>`;
  h += Ch.lines.length
    ? kitChart({
        label: "Spending each month, if work had stopped in " + Ch.year,
        lines: Ch.lines.map((l, i) => Object.assign({}, l, CMP_LINES[i % CMP_LINES.length])),
        fx: v => "Age " + Math.round(v),
        fy: v => money(v),
        caption: "",
      }) +
      `<div class="tiny muted">Spending each month if work had stopped in ${Ch.year}, the hardest stretch on record for steady spending. ${pins.length ? "One line for each pinned row." : "Two rows to start with: the 4% rule and guardrails. Pin rows to change the lines."} Today's dollars.</div>`
    : "";
  /* the filter and the sort */
  h += `<div class="field"><span class="small">Show</span><div class="chips">${WAY_FILTERS.map(f => `<button class="chip ${V.filter === f.id ? "on" : ""}" data-a="cmpfilter" data-v="${f.id}">${esc(f.name)}</button>`).join("")}</div></div>`;
  h += `<details class="math" ${V.sort ? "open" : ""}><summary>Sort by a column${V.sort ? ": " + esc((WAY_COLUMNS.find(x => x.id === V.sort) || {}).name || "") : ""}</summary><div class="inner stack" style="gap:8px"><div class="chips"><button class="chip ${V.sort ? "" : "on"}" data-a="cmpsort" data-v="">By family</button>${WAY_COLUMNS.map(x => `<button class="chip ${V.sort === x.id ? "on" : ""}" data-a="cmpsort" data-v="${x.id}">${esc(x.name)}${V.sort === x.id ? (V.dir === "best" ? " ↓" : " ↑") : ""}</button>`).join("")}</div><div class="tiny muted">Tap a column again to turn the order round.</div></div></details>`;
  /* the rows */
  if (!rows.length)
    h += `<div class="tile small">No way on the screen fits this filter. Tap "All", or open the variants of a family.</div>`;
  rows.forEach(r => {
    const first = !flat && ways.findIndex(w => w.family === r.family) === ways.findIndex(w => w.id === r.id);
    if (first)
      h += `<div class="row between cmpfam" style="gap:8px"><b>${esc(r.familyName)} ${kitInfo("wayf_" + r.family)}</b></div>`;
    h += cmpCard(r, st, K.pins.indexOf(r.id) >= 0, flat);
    if (r.id === "custom") h += cmpCustom(c);
    if (r.id === "age-dwz")
      h += `<details class="math"><summary>Die With Zero: change the amount and the age</summary><div class="inner stack" style="gap:10px">${kitAsk(
        c,
        "cmp",
        "left",
        "How much should be left?",
        CMP_LEFT.map(v => [v, money(v)]),
        0,
        { typed: true, help: "Today's dollars." }
      )}${kitAsk(
        c,
        "cmp",
        "leftAge",
        "At what age?",
        [[0, "The end of your plan (" + P.death + ")"]].concat(
          [80, 85, 90].filter(a => a > P.ret && a < P.death).map(a => [a, "Age " + a])
        ),
        0,
        { help: "After that age, this way spends the growth and keeps the amount." }
      )}</div></details>`;
    if (first && count(r.family) > 0)
      h += `<button class="ghost wide" data-a="cmpopen" data-v="${r.family}">${V.open[r.family] ? "Hide variants" : "Show variants (" + count(r.family) + ")"}</button>`;
  });
  if (flat)
    h += `<div class="tiny muted">The list shows the rows on the screen. To add more, tap "All" and "By family", then "Show variants".</div>`;
  if (mean) h += `<div class="tile small"><b>What this means for you.</b> ${esc(mean)}</div>`;
  h += kitAsk(c, "odds", "stock", "How much of your money is in stocks?", ODDS_STOCK, P.stock, {
    term: "stockshare",
    help: "The rest is in bonds. The same answer as on Retirement odds.",
  });
  h += mathBox([
    "Each row is the same plan: " +
      money(P.inv) +
      " invested now, plus " +
      money(P.monthly) +
      " a month until age " +
      P.ret +
      ", growing at " +
      kitPct(P.growth) +
      " a year after inflation (the return of your plan). Spending: " +
      money(P.spend) +
      " a year. Social Security: " +
      money(P.ss) +
      " a year from 67. Income pays first, and the rest comes out of the money.",
    "Year one: what the way pays in the first year, on a smooth market.",
    "Real start years: work stops in that year and the real years follow, " +
      Math.round(P.stock * 100) +
      "% stocks and " +
      Math.round((1 - P.stock) * 100) +
      "% bonds, after inflation. Only start years with enough years after them count.",
    "Random markets: the real years in a random order, " +
      CMP_RUNS.toLocaleString() +
      " times, with a fixed seed. Each drawn year keeps its own stocks, bonds, inflation, CAPE and yields together. This is not the Monte Carlo of Retirement odds: that engine does not have each way.",
    "A year counts as a cut when it pays less than " + kitPct(WAY_CUT_LINE) + " of what the way aims to pay.",
    "Taxes: this replay has one pile of money and no tax. The spending is what your life costs. Retirement odds and the order tab count taxes.",
    "Cash in the bucket ways earns " + kitPct(WAY_CASH_REAL, 0) + " after inflation: it keeps pace with prices.",
    "Data: " +
      MARKET_HISTORY.source +
      ", fetched " +
      MARKET_HISTORY.fetched +
      " (the CAPE and the yields: " +
      MARKET_HISTORY.extraFetched +
      "). The past is not a forecast.",
  ]);
  return h;
}
/* The "i" of each family and of each way: a plain description, and who it is named after. */
(() => {
  const T = {
    cmp: [
      "Compare the ways",
      "The same plan through each way to take money out. Each row is a set of counts from the same market years, so you can weigh the trade: how much you start with, how often it holds, and how deep the cuts go.",
    ],
  };
  WAY_FAMILIES.forEach(f => (T["wayf_" + f.id] = [f.name, f.plain + " From: " + f.by + "."]));
  WAYS.forEach(w => (T["way_" + w.id] = [w.name, w.plain + " From: " + w.by + "."]));
  kitTerms(T);
})();
/* Keep one pick of the player as an exact answer. */
function cmpKeep(key, v) {
  kitStore(C(), "cmp")[key] = { v, cf: 3 };
}
Object.assign(ACT, {
  cmpopen: t => {
    if (!W || !W.cmp) return;
    W.cmp.open[t.dataset.v] = !W.cmp.open[t.dataset.v];
    drawSheet();
  },
  cmppin: t => {
    cmpKeep("pins", wayPin(cmpPicks(C()).pins, t.dataset.v).join(","));
    kitRedraw();
  },
  cmpfilter: t => {
    if (!W || !W.cmp) return;
    W.cmp.filter = t.dataset.v;
    drawSheet();
  },
  cmpsort: t => {
    if (!W || !W.cmp) return;
    const v = t.dataset.v;
    W.cmp.dir = v && W.cmp.sort === v && W.cmp.dir === "best" ? "other" : "best";
    W.cmp.sort = v;
    drawSheet();
  },
  /* a pick of the custom way: the family, the rate, the timing, the count of years */
  cmpset: t => {
    const k = t.dataset.k,
      v = t.dataset.v;
    cmpKeep(k, k === "rate" || k === "horizon" ? +v : v);
    kitRedraw();
  },
  /* the typed rate, or the rate of the slider (in percent) */
  cmprate: t => {
    const raw = t && t.dataset && t.dataset.v != null ? t.dataset.v : W && W.o ? W.o.cmpratetyped : null,
      v = +raw;
    if (raw == null || raw === "" || !isFinite(v)) return;
    cmpKeep("rate", Math.round(Math.min(10, Math.max(1, v)) * 100) / 10000);
    kitRedraw();
  },
});
/* The slider: its number shows while it moves, and the rate is kept when the player lets go. */
(() => {
  if (typeof document === "undefined" || !document.addEventListener) return;
  document.addEventListener("input", e => {
    const el = e.target;
    if (!el || el.id !== "cmprate") return;
    const out = document.getElementById("cmprateval");
    if (out) out.textContent = (+el.value).toFixed(2).replace(/\.?0+$/, "") + "%";
  });
  document.addEventListener("change", e => {
    const el = e.target;
    if (el && el.id === "cmprate") ACT.cmprate({ dataset: { v: el.value } });
  });
})();
