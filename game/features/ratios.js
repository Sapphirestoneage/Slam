/* ============================================================================
   SLAM the Game: features/ratios.js
   PURPOSE     Ratios on Key numbers (run Not built, groups 1 to 5, Part 9). A card "Ratios" at the
               end of the sheet Key numbers: the ratios in groups, each group closed, one line for each
               ratio with its value (or what it needs, never a 0), Guess / Close / Exact, one plain
               sentence, and Show the math. Financial confidence: the player rates it with one tap,
               and the game shows it next to what the key numbers say.
   INPUT       The profile: c.cashes, c.invs, c.debts, c.incs, c.spends, c.take, c.inv, c.age, c.ret,
               c.death, c.moves (the money log), c.x.conf (the rating). derive(c): cash, nw, target,
               fiSpend. knMetrics(c, d) (the income growth, the zones), knNet(c) (pay before taxes),
               spendParts(c) (fixed and variable), dbRate/dbPay (each debt's rate and payment),
               windCalc(c) (the windfall steps), enRows(c) (the money log as rows).
   OUTPUT      Math: raGameRead, raSsGame, raBook. Views: knSheetRatios, raLineHtml, raShow. Actions (ACT):
               raconf. Parts of functions in other files: knSheetRatios (knSheet in core/metrics.js).
   DEPENDS ON  core/ratios.js (the math, a copy of js/math/ratios.js), core/engine.js (derive, R, SWR,
               spendParts, todayISO), core/metrics.js (knMetrics, knNet, knSt, knPct), screens/ui.js
               (money, esc, save, drawSheet), screens/dash.js (dkCard, dkPill), features/debts.js,
               features/windfall.js, features/enough.js.
   RULES       The math is in core/ratios.js. This file only hands it the numbers the game already
               has. A ratio whose inputs the game does not have is left out (RA_GAME_OUT says why).
               No red, no verdict words. A rule of thumb shows only where a widely used one exists,
               with its source and date.
   STORED      c.x.conf = { v: 1 to 10, d: "YYYY-MM-DD" }.
   ========================================================================= */
const RA_GAME_OUT = {
  health: "needs your health plan's out-of-pocket max",
  equity: "needs a home value and mortgage",
  ltv: "needs a home value and mortgage",
  priceinc: "needs a home value",
  realestate: "needs a home value",
};
const RA_CONF_MAX = 10;
/* Where a missing input is filled in, so a "Needs" line always has a box to fill (DESIGN.md, rule 5). */
const RA_GAME_GO = {
  windfall: ["Open Got extra money?", "windfall", ""],
  realwage: ["Answer one question", "metric", "growth"],
  totalcomp: ["Answer one question", "knask", "matchAmt"],
  volatility: ["Open the money log", "mlog", ""],
  intprin: ["Fill in each debt", "debtplan", ""],
};
/* Social Security replacement (run Finish everything partly built, Part 14): the game's own estimate at 67
   (passives in core/engine.js, the whole household, before the share the player counts) over the pay before
   taxes (knNet). Null when nothing is estimated (retired, or 67 and older): the line is left out then.
   The Ratios card and the sheet Retirement odds (odds.js) both read it. */
function raSsGame(c) {
  const P = passives(c),
    N = knNet(c);
  if (!(P.full > 0)) return null;
  return raSsReplace({
    ssYear: P.full * 12,
    grossYear: N.gross * 12,
    claimAge: 67,
    levels: ["Guess", knSt(c.incs || [], N.row)],
  });
}
/* Every ratio the game can work out, from the numbers it already has. */
function raGameRead(c, d) {
  d = d || derive(c);
  const M = typeof knMetrics === "function" ? knMetrics(c, d) : [],
    byId = id => M.find(m => m.id === id) || null,
    N = knNet(c),
    gy = N.gross * 12,
    debts = (c.debts || []).filter(x => x && x.amt > 0),
    sum = (a, f) => a.reduce((t, r) => t + (+f(r) || 0), 0),
    incs = c.incs || [],
    sp = spendParts(c),
    stCash = knSt(c.cashes || []),
    stDebt = knSt(c.debts || []),
    stInv = knSt(c.invs || []),
    stInc = knSt(incs, N.row),
    stSpend = knSt(c.spends || []),
    growth = byId("growth"),
    matchAsk = knGot(c, "matchAmt"),
    match = matchAsk ? matchAsk.v * 12 : c.match === "yes" || c.match === "no" ? null : 0,
    rates = debts.map(x => ({ x, r: dbRate(x), p: dbPay(x) })),
    stRates = knSt(rates.map(o => ({ s: o.r.cf > 0 && o.p.cf > 0, cf: Math.min(o.r.cf, o.p.cf) }))),
    lit = M.filter(m => m.num != null && !m.guess && m.zone && (m.zone[1] === "good" || m.zone[1] === "warn")),
    conf = c.x && c.x.conf ? c.x.conf.v : null;
  const out = {
    current: raCurrent({
      cash: d.cash,
      shortDebt: sum(
        debts.filter(x => raIsShort(x.k)),
        x => x.amt
      ),
      levels: [stCash, stDebt],
    }),
    selfins: raSelfInsure({ cash: d.cash, target: c.spend * d.target, levels: [stCash, stSpend] }),
    solvency: raSolvency({ netWorth: d.nw, assets: d.cash + c.inv, levels: [stCash, stInv, stDebt] }),
    revolving: raRevolving({
      revolving: sum(
        debts.filter(x => raIsRevolving(x.k)),
        x => x.amt
      ),
      total: sum(debts, x => x.amt),
      levels: [stDebt],
    }),
    mix: raCreditMix({ kinds: debts.map(x => x.k), levels: [stDebt] }),
    intprin: raInterestPrincipal({
      debts: rates.map(o => ({ balance: o.x.amt, apr: o.r.v / 100, payment: o.p.v })),
      levels: [stDebt, stRates],
    }),
    discretionary: raDiscretionary({ takeHome: c.take, fixed: sp.fixed, levels: [stInc, stSpend] }),
    fixedvar: raFixedShare({ fixed: sp.fixed, variable: sp.flex, levels: [stSpend] }),
    volatility: raVolatility({ rows: typeof enRows === "function" ? enRows(c) : [] }),
    side: raSideShare({
      side: sum(
        incs.filter(x => /side|own business|gig/i.test(x.k)),
        x => x.amt
      ),
      total: sum(incs, x => x.amt),
      levels: [knSt(incs)],
    }),
    totalcomp: raTotalComp({
      base: gy > 0 ? gy : null,
      match,
      levels: [stInc, matchAsk ? (matchAsk.cf >= 3 ? "Exact" : matchAsk.cf >= 2 ? "Close" : "Guess") : null],
    }),
    realwage: raRealWage({
      growth: growth && growth.num != null ? growth.num : null,
      inflation: EN_CPI.value,
      levels: growth ? [growth.st] : [],
    }),
    replace: raReplacement({ spendYear: d.fiSpend, grossYear: gy, levels: [stSpend, stInc] }),
    investnw: raInvestNw({ invested: c.inv, netWorth: d.nw, levels: [stCash, stInv, stDebt] }),
    nwincome: raNwIncome({ netWorth: d.nw, grossYear: gy, levels: [stCash, stInv, stDebt, stInc] }),
    human: raHumanCapital({
      grossYear: gy,
      age: c.age || null,
      retireAge: c.ret,
      realReturn: R,
      financial: d.cash + c.inv,
      levels: [stInc, stCash, stInv],
    }),
    shelter: raTaxShelter({
      advantaged: sum(
        (c.invs || []).filter(x => /retirement|ira|hsa|401|403|457|529/i.test(x.k)),
        x => x.amt
      ),
      invested: c.inv,
      levels: [stInv],
    }),
    longevity: raLongevity({
      invested: c.inv,
      spendYear: d.fiSpend,
      age: c.age || null,
      retireAge: c.ret,
      planAge: Math.max((c.ret || 0) + 1, c.death || 90) /* the same plan-to age as features/retire.js */,
      levels: [stInv, stSpend],
    }),
    ssreplace: raSsGame(c),
    confidence: raConfidence({
      rating: conf,
      min: 1,
      max: RA_CONF_MAX,
      good: lit.filter(m => m.zone[1] === "good").length,
      of: lit.length,
    }),
  };
  if (!out.ssreplace) delete out.ssreplace;
  if (typeof windCalc === "function" && c.x && c.x.wind) {
    const w = windCalc(c);
    out.windfall = raWindfall({
      amount: w.amount,
      toTax: w.toTax,
      toFun: w.toFun,
      toCash: w.toCash,
      toDebt: w.toDebt,
      invested: w.invested,
      levels: [w.st],
    });
  } else out.windfall = raWindfall({ amount: null });
  const groups = RA_GROUPS.map(g => ({
    g: g[0],
    name: g[1],
    lines: RA_LINES.filter(l => l.g === g[0] && out[l.id]).map(l => Object.assign({}, l, { r: out[l.id] })),
  })).filter(G => G.lines.length);
  return {
    groups,
    out,
    lit: Object.values(out).filter(r => r.value != null).length,
    of: Object.keys(out).length,
    later: RA_LATER.concat(Object.keys(RA_GAME_OUT).map(id => [RA_LINES.find(l => l.id === id).n, RA_GAME_OUT[id]])),
  };
}
/* A number of Show the math, in the unit it has. */
function raShow(v, unit) {
  if (v == null) return "";
  if (unit === "money") return money(Math.round(v));
  if (unit === "pct") return knPct(v);
  if (unit === "x") return Math.round(v * 100) / 100 + "x";
  if (unit === "years") return Math.round(v * 10) / 10 + " years";
  if (unit === "yesno") return v ? "Yes" : "No";
  return String(Math.round(v * 100) / 100);
}
function raValue(l) {
  const r = l.r;
  if (r.value == null) return r.needs.length ? "Needs " + r.needs.join(" and ") : r.none;
  if (l.id === "mix") return r.value + " of 3 kinds";
  if (l.id === "selfins" && r.value < 0) return money(Math.round(-r.value)) + " to fill your fund first";
  if (l.id === "discretionary" && r.share != null) return money(Math.round(r.value)) + " a month";
  if (l.id === "confidence")
    return (
      "You: " +
      r.parts[0][1] +
      " of " +
      r.parts[1][1] +
      (r.numbers != null ? " · numbers: " + r.parts[2][1] + " of " + r.parts[3][1] : "")
    );
  return raShow(r.value, r.unit);
}
function raLineHtml(l) {
  const r = l.r,
    lit = r.value != null,
    say = l.id === "confidence" && lit ? RA_CONF_WORDS[r.read] : l.s,
    cur = l.id === "confidence" && lit ? r.parts[0][1] : null,
    taps =
      l.id === "confidence"
        ? `<div class="tiny muted">How sure do you feel about your money? 1 afraid, 10 confident.</div><div class="chips">${Array.from(
            { length: RA_CONF_MAX },
            (_, i) => i + 1
          )
            .map(v => `<button class="chip ${cur === v ? "on" : ""}" data-a="raconf" data-v="${v}">${v}</button>`)
            .join("")}</div>`
        : "",
    math = [esc("Formula: " + l.f)]
      .concat(r.parts.map(p => esc(p[0] + ": " + raShow(p[1], p[2]))))
      .concat(lit && l.id !== "confidence" && l.id !== "mix" ? [esc("= " + raShow(r.value, r.unit))] : [])
      .concat([
        l.rule
          ? esc("A common rule of thumb: " + l.rule.text + " Source: " + l.rule.source + ", read " + l.rule.date + ".")
          : "No target here: it shows where you are.",
      ]);
  return `<div class="stack raline" style="gap:4px" data-ratio="${l.id}"><div class="row between" style="gap:8px;flex-wrap:wrap"><b class="small">${esc(l.n)}</b><span class="row" style="gap:6px;flex-wrap:wrap"><span class="small ${lit ? "" : "muted"}">${esc(raValue(l))}</span>${lit && l.id !== "confidence" ? dkPill(r.level, r.level === "Guess" ? "" : "okp") : ""}</span></div><div class="tiny muted">${esc(say)}</div>${taps}${!lit && r.needs.length && RA_GAME_GO[l.id] ? `<button class="ghost slim" data-a="${RA_GAME_GO[l.id][1]}" data-v="${RA_GAME_GO[l.id][2]}">${esc(RA_GAME_GO[l.id][0])}</button>` : ""}<details class="math"><summary>Show the math</summary><div class="inner tiny stack" style="gap:4px">${math.map(x => `<div>${x}</div>`).join("")}</div></details></div>`;
}
/* Part of knSheet() in core/metrics.js. Adds the card "Ratios" at the end of Key numbers. */
function knSheetRatios(h) {
  const A = raGameRead(C(), D);
  const body =
    A.groups
      .map(
        G =>
          `<details class="ragroup"><summary><b class="small">${esc(G.name)}</b> <span class="tiny muted">${G.lines.filter(l => l.r.value != null).length} of ${G.lines.length} worked out</span></summary><div class="stack" style="gap:12px;margin-top:8px">${G.lines.map(raLineHtml).join("")}</div></details>`
      )
      .join("") +
    `<details class="math"><summary>What isn't here yet</summary><div class="inner tiny stack" style="gap:4px">${A.later.map(x => `<div><b>${esc(x[0])}</b>: ${esc(x[1])}.</div>`).join("")}</div></details>`;
  return (
    h +
    dkCard("Ratios", `<div class="stack" style="gap:8px">${body}</div>`, {
      cls: "racard",
      cap: "One line each, in groups. A ratio waits for its numbers and never shows a 0 in their place.",
      right: `<span class="tiny muted">${A.lit} of ${A.of} worked out</span>`,
    })
  );
}
/* The plan's spreadsheet: the inputs and the formula of each simple ratio that is worked out. */
function raBook(c) {
  const A = raGameRead(c),
    rows = [],
    two = (id, label, r, a, b, f) => {
      if (!r || r.value == null) return;
      rows.push({ id: id + "_a", label: r.parts[a][0], v: r.parts[a][1] });
      rows.push({ id: id + "_b", label: r.parts[b][0], v: r.parts[b][1] });
      rows.push({
        id,
        label,
        v: r.value,
        f: f.replace(/A/g, "{" + id + "_a}").replace(/B/g, "{" + id + "_b}"),
        note: r.level,
      });
    };
  two("ra_current", "Current ratio", A.out.current, 0, 1, "=A/B");
  two("ra_selfins", "Self-insurance threshold", A.out.selfins, 0, 1, "=A-B");
  two("ra_solvency", "Solvency", A.out.solvency, 0, 1, "=A/B");
  two("ra_investnw", "Investment to net worth", A.out.investnw, 0, 1, "=A/B");
  two("ra_nwincome", "Net worth to income", A.out.nwincome, 0, 1, "=A/B");
  two("ra_discretionary", "Discretionary income", A.out.discretionary, 0, 1, "=A-B");
  two("ra_side", "Side income share", A.out.side, 0, 1, "=A/B");
  two("ra_replace", "Income replacement", A.out.replace, 0, 1, "=A/B");
  two("ra_ssreplace", "Social Security replacement", A.out.ssreplace, 0, 1, "=A/B");
  two("ra_shelter", "Tax efficiency", A.out.shelter, 0, 1, "=A/B");
  two("ra_realwage", "Real wage growth", A.out.realwage, 0, 1, "=(1+A)/(1+B)-1");
  return { title: "Ratios on Key numbers", rows };
}
Object.assign(ACT, {
  raconf: t => {
    const c = C(),
      v = Number(t.dataset.v);
    if (!Number.isInteger(v) || v < 1 || v > RA_CONF_MAX) return;
    c.x = c.x || {};
    c.x.conf = c.x.conf && c.x.conf.v === v ? null : { v, d: todayISO() }; /* a second tap clears it */
    if (typeof cjFromRating === "function") cjFromRating(c); /* cjcheck.js: the same tap is today's confidence check */
    save();
    drawSheet();
  },
});
