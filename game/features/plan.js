/* ============================================================================
   SLAM the Game: features/plan.js
   PURPOSE     The plan summary. One screen with the 7 steps of the CFP Board's financial planning
               process as rows (your situation, your goals, where you are headed, recommendations, the
               plan, doing it, checking in), each done, partial or missing for this player. A ranked top 5
               of the gaps across all areas, each with its dollar or day impact and one next step. The
               path the player picked (paths.js) at the top. A list of what is still a guess. A page that
               prints well, and the spreadsheet (book.js).
   INPUT       The profile, and the results of the other plan features. c.x.summary (the estate
               checklist, the date the summary was seen). The open sheet (W.kind): summary.
   OUTPUT      Functions: summarySteps, summaryGaps, summaryGuesses, summarySheet, summaryBook. Actions
               (ACT): summary, summaryestate, summaryprint. Menu: "My plan on one page".
   DEPENDS ON  core/engine.js, screens/ui.js, core/metrics.js, features/year.js, features/kit.js,
               features/taxview.js, features/odds.js, features/cover.js, features/mix.js,
               features/paths.js. USES LATER: features/book.js (bookButtons), behind a typeof test.
   RULES       A step is done, partial or missing. No grades. The ranking of the gaps uses a yearly dollar
               figure for each gap (the math box shows each weight). A gap from a guess shows Guess.
   ========================================================================= */
const SUMMARY_ESTATE = [
  ["will", "A will"],
  ["benef", "Beneficiaries named on each account"],
  ["poa", "A power of attorney and a health care directive"],
];
function summaryX(c) {
  c.x = c.x || {};
  c.x.summary = c.x.summary || { estate: {} };
  c.x.summary.estate = c.x.summary.estate || {};
  return c.x.summary;
}
/* THE 7 STEPS of the CFP Board's process, each done, partial or missing. */
function summarySteps(c, today) {
  today = today || todayISO();
  const X = c.x || {},
    P = X.paths || {},
    sp = sharpPct(c),
    gs = (c.goals || []).filter(g => !g.done),
    placed = gs.filter(g => g.era != null).length,
    plan = (X.plan || []).filter(t => String(t.v || "").indexOf("path:") === 0),
    did = plan.filter(t => t.st === "done").length,
    ans = ["taxv", "cover", "mix"].filter(k => X[k] && Object.keys(X[k]).length).length,
    yr = today.slice(0, 4),
    rev = typeof YX === "function" && Object.keys(YX(c).rev.done || {}).some(k => String(k).indexOf(yr) === 0),
    recent = c.lastDaily && daysBetween(c.lastDaily, today) <= 7;
  const S = (n, st, why, go) => ({ n, st, why, go });
  return [
    S("Your situation", sp >= 100 ? "done" : sp > 0 ? "partial" : "missing", sp + "% of your numbers are real.", [
      "Make my numbers real",
      "sharp",
      sharpNext(c, today) || "take",
    ]),
    S(
      "Your goals",
      placed ? "done" : gs.length ? "partial" : "missing",
      placed
        ? placed + " bucket list " + (placed === 1 ? "item has" : "items have") + " a season."
        : gs.length
          ? "Your bucket list has items with no season yet."
          : "No bucket list yet.",
      ["Open My Goals", "tab", "goals"]
    ),
    S(
      "Where you are headed",
      P.seen ? "done" : c.ret ? "partial" : "missing",
      P.seen
        ? "You have seen your two paths and their odds."
        : "Your stop age is set. The two paths show where it leads.",
      ["See the two paths", "paths", ""]
    ),
    S(
      "Recommendations",
      ans >= 3 ? "done" : ans ? "partial" : "missing",
      ans + " of 3 checks answered: taxes, insurance, investments.",
      ["Open the tax view", "taxv", ""]
    ),
    S(
      "The plan",
      P.pick ? "done" : P.seen ? "partial" : "missing",
      P.pick ? "You picked " + PATHS_NAMES[P.pick] + "." : "No path picked yet.",
      ["Pick a path", "paths", ""]
    ),
    S(
      "Doing it",
      plan.length && did * 2 >= plan.length ? "done" : did ? "partial" : "missing",
      plan.length
        ? did + " of " + plan.length + " steps of your path done."
        : "The steps show up on Next Steps once you pick a path.",
      ["Open Next Steps", "tab", "plan"]
    ),
    S(
      "Checking in",
      recent && rev ? "done" : recent || rev ? "partial" : "missing",
      (recent ? "A check-in in the last 7 days." : "No check-in this week.") +
        (rev ? " The yearly review is done." : " The yearly review is still open."),
      ["Check in", "tab", "play"]
    ),
  ];
}
/* THE GAPS across all areas, ranked by a yearly dollar figure. Each: { area, n, impact, score, st, why, go }. */
function summaryGaps(c) {
  const d = derive(c),
    G2 = [],
    add = g => G2.push(g),
    sp = Math.max(1, c.spend || 0),
    kept = (c.take || 0) - (c.spend || 0),
    real = kitState([kitSharp(c, "take"), kitSharp(c, "spend")]);
  if (kept < 0)
    add({
      area: "Cash flow",
      n: "More goes out than comes in",
      impact: money(-kept) + " a month",
      score: -kept * 12,
      st: real,
      why: "Each month about " + money(-kept) + " comes from your cushion or a card.",
      go: ["Open your spending plan", "csp", ""],
    });
  try {
    const hi = sleptCalc(c).debtDay * 365;
    if (hi > 0)
      add({
        area: "Debt",
        n: "High-interest debt",
        impact: money(Math.round(hi)) + " a year of interest",
        score: hi,
        st: kitState([kitSharp(c, "debt")]),
        why: "Interest on " + money(Math.round(hiDebt(c))) + " of high-rate debt.",
        go: ["Open my debt plan", "debtplan", ""],
      });
  } catch (e) {
    report(e, "plan.js: summaryGaps (debt)");
  }
  const cushGap = Math.max(0, d.target * sp - d.cash);
  if (cushGap > 1)
    add({
      area: "Cushion",
      n: "The cushion is not full",
      impact: money(Math.round(cushGap)) + " to go",
      score: cushGap * 0.5,
      st: kitState([kitSharp(c, "cash"), kitSharp(c, "spend")]),
      why:
        "Your target is " +
        Math.round(d.target * 10) / 10 +
        " months of spending, " +
        money(Math.round(d.target * sp)) +
        ".",
      go: ["Build the cushion", "node", "sf_bige"],
    });
  try {
    coverCalc(c)
      .rows.filter(r => r.gap > 0 || r.missing)
      .forEach(r => {
        const yearly = r.per ? r.gap * 12 : r.gap;
        add({
          area: "Insurance",
          n: r.n + " cover",
          impact: r.missing ? "No policy yet" : money(Math.round(r.gap)) + (r.per ? " " + r.per : "") + " gap",
          score: r.missing ? 600 : r.id === "disab" ? yearly * 0.25 : yearly * 0.02,
          st: r.st,
          why: r.why,
          go: ["Open insurance needs", "cover", ""],
        });
      });
  } catch (e) {
    report(e, "plan.js: summaryGaps (cover)");
  }
  try {
    const M = mixCalc(c),
      low = M.total * (MIX_LOW / 100),
      extra = M.feeYear - low;
    if (M.total > 0 && extra > 50)
      add({
        area: "Investments",
        n: "Fees above a low-cost fund",
        impact: money(Math.round(extra)) + " a year" + (M.days ? ", " + M.days + " days of freedom" : ""),
        score: extra,
        st: M.st,
        why: "Over 30 years the fees take about " + money(Math.round(M.lost)) + ".",
        go: ["Open investment mix and fees", "mix", ""],
      });
  } catch (e) {
    report(e, "plan.js: summaryGaps (mix)");
  }
  if (c.match === "no") {
    const need = pathsBase(c, pathsAssume(c)).matchNeed;
    add({
      area: "Taxes",
      n: "Part of the match is left on the table",
      impact: money(need * 12) + " a year",
      score: need * 12,
      st: kitState([kitSharp(c, "match")]),
      why: "Your job adds money when you put money in. Part of it is not reaching you yet.",
      go: ["Open the tax view", "taxv", ""],
    });
  }
  try {
    const O = oddsCalc(c, null, { runs: 0 });
    if (O.of100 < 80) {
      const ch = oddsChanges(c, null, O);
      add({
        area: "Retirement odds",
        n: O.of100 + " out of 100 market histories work",
        impact: ch.best ? ch.best.n + ": " + ch.best.of100 + " out of 100" : "No single change moves it",
        score: (80 - O.of100) * 200,
        st: "Guess",
        why: "The worst start year is " + (O.worst ? O.worst.year : "not known") + ".",
        go: ["Open retirement odds", "odds", ""],
      });
    }
  } catch (e) {
    report(e, "plan.js: summaryGaps (odds)");
  }
  const E = summaryX(c).estate,
    miss = SUMMARY_ESTATE.filter(x => !E[x[0]]);
  if (miss.length)
    add({
      area: "Estate checklist",
      n: miss.length + " of 3 estate items open",
      impact: "Protects " + money(Math.max(0, Math.round(d.nw))),
      score: Math.max(0, d.nw) * 0.01 + 100 * miss.length,
      st: "Close",
      why: miss.map(x => x[1]).join(", ") + ".",
      go: ["Open the checklist", "summary", ""],
    });
  if (c.deps === "Kids") {
    const tu = (c.goals || []).filter(g => !g.done && /tuition|college|school/i.test((g.k || "") + " " + (g.n || ""))),
      left = tu.reduce((a, g) => a + Math.max(0, (g.cost || 0) - (g.fund || 0)), 0);
    if (!tu.length || left > 0)
      add({
        area: "Education",
        n: tu.length ? "Tuition still to fund" : "No tuition goal yet",
        impact: tu.length ? money(left) + " to go" : "No goal yet",
        score: tu.length ? left * 0.05 : 500,
        st: "Guess",
        why: "You have kids. A tuition goal, even a small one, gives it a date.",
        go: ["Open My Goals", "tab", "goals"],
      });
  }
  return G2.sort((a, b) => b.score - a.score);
}
/* WHAT IS STILL A GUESS: each number the plan uses that the player has not made real. */
function summaryGuesses(c) {
  const out = [];
  sharpList(c).forEach(k => {
    if (!isSharp(c, k)) out.push([SHARP_Q[k], "sharp", k]);
  });
  try {
    if (!taxvInputs(c).gross.given) out.push(["Pay before taxes (the tax view uses 80% for now)", "taxv", ""]);
    const I = coverInputs(c);
    if (!I.disab.given) out.push(["Your disability cover", "cover", ""]);
    mixAccounts(c).forEach(a => {
      if (a.st === "Guess") out.push([a.k + ": what is inside and its fee", "mix", ""]);
    });
    if (!pathsAssume(c).ret.given) out.push(["The return of your plan (7% for now)", "paths", ""]);
  } catch (e) {
    report(e, "plan.js: summaryGuesses");
  }
  return out;
}
function summaryBook(c) {
  const S = summarySteps(c),
    G2 = summaryGaps(c).slice(0, 5);
  return {
    title: "My plan on one page",
    rows: S.map((s, i) => ({ id: "ps_step" + i, label: "Step " + (i + 1) + ": " + s.n, v: s.st, note: s.why })).concat(
      G2.map((g, i) => ({
        id: "ps_gap" + i,
        label: "Gap " + (i + 1) + ": " + g.area + ", " + g.n,
        v: Math.round(g.score),
        note: g.impact + ". Ranked by a yearly dollar figure.",
      }))
    ),
  };
}
const SUMMARY_ST = { done: "Done ✓", partial: "Partial", missing: "Not yet" };
function summarySheet() {
  const c = C(),
    S = summarySteps(c),
    G2 = summaryGaps(c),
    top = G2.slice(0, 5),
    guesses = summaryGuesses(c),
    E = summaryX(c).estate,
    P = (c.x && c.x.paths) || {};
  let pathLine = "";
  if (P.pick && PATHS_NAMES[P.pick]) {
    try {
      const A = pathsAll(c, { fast: true }).list[P.pick];
      pathLine = `<div class="card next"><div class="eyebrow">Your path</div><h2 class="glow" style="margin:6px 0">${esc(PATHS_NAMES[P.pick])}</h2><div class="small">If these assumptions hold, you reach ${money(Math.round(A.inv))} by ${Math.max(c.age, c.ret)}, with ${A.count} bucket list ${A.count === 1 ? "item" : "items"} done.</div><button class="ghost slim" data-a="paths">See the two paths</button></div>`;
    } catch (e) {
      report(e, "plan.js: summarySheet");
    }
  } else
    pathLine = `<div class="card"><div class="small">No path picked yet. The two paths show your full plan, month by month.</div><button class="primary slim" data-a="paths">See the two paths</button></div>`;
  return (
    `<div class="summarypage">` +
    head("Plan", "My plan on one page") +
    pathLine +
    `<div class="card stack" style="gap:6px"><div class="row between"><h3>The 7 steps of a plan</h3>${kitInfo("cfp7")}</div>${S.map((s, i) => `<div class="row between small summarystep" style="gap:8px;align-items:flex-start"><span style="min-width:0"><b>${i + 1}. ${esc(s.n)}</b><div class="tiny muted">${esc(s.why)}</div></span><span class="row" style="gap:6px;flex:none"><span class="pill ${s.st === "done" ? "okp" : s.st === "partial" ? "info" : "warn"}">${SUMMARY_ST[s.st]}</span>${s.st === "done" ? "" : `<button class="ghost slim" data-a="${s.go[1]}" data-v="${esc(s.go[2])}">${esc(s.go[0])}</button>`}</span></div>`).join("")}</div>` +
    `<div class="card stack" style="gap:8px"><h3>Your top ${top.length || ""} gaps</h3>${top.length ? top.map((g, i) => `<div class="tile stack summarygap" style="gap:4px"><div class="row between" style="gap:8px"><span class="tiny muted">${i + 1}. ${esc(g.area)}</span>${kitPill(g.st)}</div><b>${esc(g.n)}</b><div class="small">${esc(g.impact)}. ${esc(g.why)}</div><button class="ghost slim" data-a="${g.go[1]}" data-v="${esc(g.go[2])}">${esc(g.go[0])}</button></div>`).join("") : `<div class="small">No gaps the game can see right now.</div>`}</div>` +
    `<div class="card stack" style="gap:6px"><h3>Estate checklist</h3>${SUMMARY_ESTATE.map(x => `<button class="rowbtn ${E[x[0]] ? "okrow" : ""}" data-a="summaryestate" data-v="${x[0]}"><span>${esc(x[1])}</span><b class="tiny">${E[x[0]] ? "Done ✓" : "Tap when done"}</b></button>`).join("")}</div>` +
    `<details class="math"><summary>What is still a guess (${guesses.length})</summary><div class="inner stack" style="gap:4px">${guesses.length ? guesses.map(g => `<button class="linkish small" data-a="${g[1]}" data-v="${esc(g[2])}">${esc(g[0])}</button>`).join("") : `<div class="small">Nothing. Every number is real.</div>`}</div></details>` +
    mathBox([
      "The 7 steps are the CFP Board's financial planning process: understand the situation, set goals, look at where the current course leads, make recommendations, present the plan, put it in place, and check in.",
      "The gaps are ranked by a yearly dollar figure: money short a year, interest a year, half of the cushion gap, a quarter of a disability gap a year, 2% of a life cover gap, fees above a low-cost fund, the match left a year, and a fixed weight for the odds, the estate items and tuition.",
    ]) +
    `<div class="row wrap" style="gap:8px">${typeof bookButtons === "function" ? bookButtons() : ""}<button class="ghost slim" data-a="summaryprint">Print this page</button></div>` +
    `</div>`
  );
}
kitTerms({
  cfp7: [
    "The 7 steps of a plan",
    "The CFP Board's financial planning process: your situation, your goals, where you are headed, recommendations, the plan, doing it, and checking in.",
  ],
});
kitScreen(
  "summary",
  "My plan on one page",
  "The 7 steps of a plan, your top gaps, and your picked path.",
  "Each gap has one next step that opens the right screen."
);
Object.assign(ACT, {
  summary: () => {
    W = { kind: "summary", o: {} };
    summaryX(C()).seen = todayISO();
    sheet(summarySheet);
  },
  summaryestate: t => {
    const E = summaryX(C()).estate,
      k = t.dataset.v;
    E[k] = E[k] ? null : todayISO();
    kitRedraw();
  },
  summaryprint: () => {
    try {
      if (typeof window !== "undefined" && typeof window.print === "function") window.print();
    } catch (e) {
      report(e, "plan.js: summaryprint");
    }
  },
});
kitMenu("My plan on one page", "summary", "The 7 steps, your top 5 gaps, and what is still a guess", "people");
