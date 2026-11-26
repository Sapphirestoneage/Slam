/* ============================================================================
   SLAM the Game: features/invest.js
   PURPOSE     Investing, two sheets (run Finish everything partly built, Part 13). "Invest or pay debt":
               one small grid of debt rate x return, in dollars on $1,000 for five years, with the
               player's own debts and return marked. "Roth or traditional, by account": for each
               account with a choice, the marginal rate now (federal + state + city) next to an
               estimated rate in retirement, and what each way leaves to invest.
   INPUT       The profile: the debts (features/debts.js, dbLive and dbRate), the return of the plan
               (features/paths.js, pathsAssume), the accounts and their tax kind (features/mix.js,
               mixAccounts), the tax view (features/taxview.js, taxvCalc; features/retire.js, retireTax),
               c.x.ivr (the answers of the Roth sheet, as { v, cf }). The open sheet (W.kind): ivheat,
               ivroth.
   OUTPUT      Math of the feature: ivgStateRate, ivgRates, ivgHeat, ivgRoth, ivBook. Views: ivHeatSheet,
               ivRothSheet. Actions (ACT): ivheat, ivroth. Menu: "Invest or pay debt", "Roth or
               traditional, by account".
   DEPENDS ON  core/invest.js (ivHeat, ivRoth, ivTaxKind: the one engine with invest.html of the web app),
               core/career.js (crRothTrad, through ivRoth), screens/dash.js (dkCard, dkStatRow, dkTile,
               dkCaption, dkPill), screens/ui.js (money, esc, head, mathBox, sheet), features/kit.js,
               features/debts.js, features/paths.js, features/mix.js, features/taxview.js,
               features/retire.js, core/engine.js (derive, passives).
   RULES       The math is in core/invest.js. A paid debt's saving is sure; a return is not, and the
               sheet says so. No red: the grid uses mint for the debt side and teal for the investing
               side. The game has no city income tax yet, so the city part of the rate is 0 here and the
               sheet says so (the web app's Taxes counts New York City). No verdict words. A rule of
               thumb, not tax advice.
   ========================================================================= */
const IVR_LIVE = [
  ["same", "The same state"],
  ["none", "A state with no income tax"],
];
const IVR_INCOME = [
  ["plan", "From my plan"],
  ["30000", "$30k"],
  ["50000", "$50k"],
  ["75000", "$75k"],
  ["100000", "$100k"],
  ["150000", "$150k"],
];
/* The state's top rate on one result of retireTax: the bracket of the state's taxable income. */
function ivgStateRate(X) {
  if (!X || !X.stateCfg) return 0;
  const taxable = Math.max(0, X.agi - X.stateCfg.std);
  let r = 0;
  X.stateCfg.brackets.forEach(b => {
    if (taxable > b[0] || (b[0] === 0 && taxable > 0)) r = b[1];
  });
  return r;
}
/* The rates now and later, from the game's tax view (the 2026 tables of the retirement engine). */
function ivgRates(c) {
  const T = taxvCalc(c),
    d = derive(c),
    live = kitValue(c, "ivr", "live", "same"),
    inc = kitValue(c, "ivr", "income", "plan");
  let ss = 0;
  try {
    ss = passives(c).full * 12;
  } catch (e) {
    report(e, "invest.js: ivgRates");
  }
  const planIncome = Math.max(0, Math.round((d.fiSpend || 0) - ss)),
    income = inc.v === "plan" ? planIncome : +inc.v,
    state = live.v === "none" ? "" : T.state,
    L = retireTax(income, 0, T.filing, state, Math.max(c.age, c.ret || 65)),
    now = { fed: T.top, state: ivgStateRate(T.X), local: 0 },
    later = { fed: L.taxable > 0 ? L.top : 0, state: state ? ivgStateRate(L) : 0, local: 0 };
  return {
    T,
    now,
    later,
    income,
    planIncome,
    live,
    inc,
    st: kitState([T.st === "Guess" ? { cf: 1 } : { cf: 2 }, inc.given ? inc : { cf: 1 }]),
  };
}
/* Invest or pay debt: the grid on the player's debts and return (core/invest.js, ivHeat). */
function ivgHeat(c) {
  const debts = dbLive(c).map(o => ({
      name: typeof debtName === "function" ? debtName(o.x, c) : o.x.k,
      apr: dbRate(o.x).v / 100,
      cf: dbRate(o.x).cf,
    })),
    A = pathsAssume(c),
    ret = A.ret.v;
  return {
    H: ivHeat({ debts, ret, money }),
    debts,
    ret,
    st: kitState(debts.map(d => ({ cf: d.cf === 0 ? 1 : d.cf })).concat([A.ret])),
  };
}
/* Roth or traditional, account by account (core/invest.js, ivRoth), on the game's rates. */
function ivgRoth(c) {
  const Rt = ivgRates(c),
    A = typeof mixAccounts === "function" ? mixAccounts(c) : [];
  return {
    Rt,
    A,
    R: ivRoth(
      A.map(a => ({ name: a.k, type: a.tax.v, now: Rt.now })),
      { later: Rt.later, money }
    ),
  };
}
/* The grid as a table: each square is investing minus paying, on $1,000 for five years. */
function ivHeatGrid(H) {
  const head = `<tr><th class="tiny muted" style="text-align:left">Debt rate</th>${H.returns.map(r => `<th class="tiny muted">${Math.round(r * 100)}%${H.grid[0] && H.grid[0].cells.find(x => x.ret === r).mine ? " ★" : ""}</th>`).join("")}</tr>`,
    cell = x => {
      const a = Math.min(1, Math.abs(x.gap) / H.max),
        col = x.side === "debt" ? "var(--good)" : "var(--teal)",
        bg = x.side === "even" ? "transparent" : `color-mix(in srgb, ${col} ${Math.round(12 + 50 * a)}%, transparent)`;
      return `<td class="tiny" style="text-align:center;padding:6px 2px;border-radius:6px;background:${bg};${x.mine ? "font-weight:800;" : ""}" title="${esc((x.side === "debt" ? "Paying the debt: " : x.side === "invest" ? "Investing: " : "About even: ") + money(Math.round(Math.abs(x.gap))) + " more")}">${x.side === "even" ? "even" : (x.side === "debt" ? "D " : "I ") + money(Math.round(Math.abs(x.gap)))}</td>`;
    };
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:separate;border-spacing:3px;font-variant-numeric:tabular-nums"><thead>${head}</thead><tbody>${H.grid.map(g => `<tr><th class="tiny" style="text-align:left;white-space:nowrap">${(Math.round(g.apr * 1000) / 10).toString()}%${g.mine ? " ★" : ""}</th>${g.cells.map(cell).join("")}</tr>`).join("")}</tbody></table></div><div class="row wrap tiny muted" style="gap:10px;margin-top:4px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--good)"></i> D: paying the debt saves more</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--teal)"></i> I: investing grows more</span><span>★ yours, in bold</span></div>`;
}
function ivHeatSheet() {
  const c = C(),
    X = ivgHeat(c),
    H = X.H,
    top = X.debts.filter(d => d.apr > 0).sort((a, b) => b.apr - a.apr)[0];
  return (
    head("Plan", "Invest or pay debt") +
    dkCaption("Each square: $1,000 for five years, investing it next to paying a debt with it.") +
    dkStatRow([
      dkTile("Your return", Math.round(X.ret * 100) + "%", {
        sub: "a year, the plan's guess",
        guess: X.st === "Guess",
      }),
      top
        ? dkTile("Your top debt rate", Math.round(top.apr * 1000) / 10 + "%", {
            sub: top.name,
            guess: X.st === "Guess",
          })
        : dkTile("Debts", "None on file", { sub: "the grid still shows each rate" }),
    ]) +
    `<div class="stack" style="gap:10px">` +
    dkCard("Rate x return", ivHeatGrid(H), {
      cap: "Down the side, what a debt charges a year. Across the top, what investing might return a year.",
      right: dkPill(X.st),
    }) +
    (H.lines.length
      ? dkCard("Your debts on the grid", H.lines.map(t => `<div class="small">${esc(t)}</div>`).join(""), {
          cap: "A paid debt's saving is sure. A return is a long-run average, not a promise.",
        })
      : "") +
    `<div class="tiny muted">A match at work is extra money on top, and the grid leaves it out. Taxes on the gain are left out too.</div>` +
    `<div class="row wrap" style="gap:8px"><button class="ghost slim" data-a="debts">My debts</button><button class="ghost slim" data-a="nxa">Which account next</button></div>` +
    mathBox(H.math.concat([IV_SOURCES.heat + "."])) +
    `</div>`
  );
}
function ivRothSheet() {
  const c = C(),
    X = ivgRoth(c),
    Rt = X.Rt,
    P = v => (Math.round(v * 1000) / 10).toString() + "%",
    rows = X.R.rows,
    choice = rows.filter(r => r.ready);
  const rate = r => r.fed + r.state + r.local;
  const card = (r, i) =>
    dkCard(
      r.name,
      `<div class="tiny muted">${esc(r.words)}</div>` +
        (r.ready
          ? `<div class="small" style="margin-top:6px">${esc(r.line)}</div>` + mathBox(r.math)
          : `<div class="small muted" style="margin-top:6px">${r.choice ? "Put in your pay before taxes on the tax view to see this." : "No Roth or traditional choice here."}</div>`) +
        `<button class="ghost slim" data-a="mix">Change its tax kind</button>`,
      r.ready ? { right: dkPill(Rt.st) } : {}
    );
  return (
    head("Plan", "Roth or traditional, by account") +
    dkCaption("Your tax rate now next to an estimate for retirement, account by account.") +
    dkStatRow([
      dkTile("Your rate now", P(rate(Rt.now)), {
        sub: "federal " + P(Rt.now.fed) + " + state " + P(Rt.now.state),
        guess: Rt.st === "Guess",
      }),
      dkTile("In retirement, about", P(rate(Rt.later)), {
        sub: "on " + money(Rt.income) + " a year",
        guess: Rt.st === "Guess",
      }),
      dkTile("Accounts with a choice", String(choice.length), { sub: "of " + rows.length }),
    ]) +
    `<div class="stack" style="gap:10px">` +
    dkCard(
      "The estimate for retirement",
      kitAsk(c, "ivr", "income", "Income in retirement a year, before taxes", IVR_INCOME, Rt.inc.v, {
        help:
          "From your plan: what you would spend at freedom (" +
          money(Rt.planIncome) +
          " a year, after the Social Security estimate). Tap your own guess if you have one.",
      }) +
        kitAsk(c, "ivr", "live", "Where you might live then", IVR_LIVE, Rt.live.v) +
        `<div class="tiny muted">The rates are the top rate on the next dollar: federal, then state, from the 2026 tables of the retirement engine. City tax: the game counts none yet (the web app's Taxes counts New York City). Payroll tax is the same either way, so it is not in the rate.</div>`,
      { cap: "A rule of thumb, not tax advice. Laws and brackets change." }
    ) +
    rows.map(card).join("") +
    `<div class="row wrap" style="gap:8px"><button class="ghost slim" data-a="taxv">Your tax view</button><button class="ghost slim" data-a="nxa">Which account next</button><button class="ghost slim" data-a="mix">Investment mix and fees</button></div>` +
    `</div>`
  );
}
/* The plan's spreadsheet (book.js): the Roth rule on each account with a choice, and the grid's own squares. */
function ivBook(c) {
  const rows = [],
    X = ivgRoth(c),
    Hh = ivgHeat(c);
  rows.push({
    id: "iv_now",
    label: "Top tax rate now, federal + state + city",
    v: X.Rt.now.fed + X.Rt.now.state + X.Rt.now.local,
  });
  rows.push({
    id: "iv_later",
    label: "Top tax rate in retirement, estimated",
    v: X.Rt.later.fed + X.Rt.later.state + X.Rt.later.local,
  });
  X.R.rows
    .filter(r => r.ready)
    .forEach((r, i) =>
      rows.push({
        id: "iv_gap" + i,
        label: r.name + ": traditional minus Roth, a year on $1,000",
        v: r.yearGap,
        f: "=1000*({iv_now}-{iv_later})",
      })
    );
  rows.push({ id: "iv_ret", label: "Return a year (invest or pay debt)", v: Hh.ret });
  Hh.H.yours.forEach((y, i) => {
    rows.push({ id: "iv_apr" + i, label: y.name + ": rate a year", v: y.apr });
    rows.push({
      id: "iv_heat" + i,
      label: y.name + ": investing $1,000 minus paying it, 5 years",
      v: y.gap,
      f: "=1000*((1+{iv_ret})^5-1)-1000*((1+{iv_apr" + i + "}/12)^60-1)",
    });
  });
  return { title: "Investing: Roth or traditional, invest or pay debt", rows };
}
kitScreen(
  "ivheat",
  "Invest or pay debt",
  "One small grid: what a debt charges next to what investing might return, in dollars.",
  "Your own debts and return are marked. A paid debt's saving is sure; a return is not."
);
kitScreen(
  "ivroth",
  "Roth or traditional, by account",
  "Your tax rate now next to an estimate for retirement, for each account with a choice.",
  "Federal and state from the 2026 tables. A rule of thumb, not tax advice."
);
Object.assign(ACT, {
  ivheat: () => {
    W = { kind: "ivheat", o: {} };
    sheet(ivHeatSheet);
  },
  ivroth: () => {
    W = { kind: "ivroth", o: {} };
    sheet(ivRothSheet);
  },
});
kitMenu("Invest or pay debt", "ivheat", "Debt rate next to return, in dollars on one grid", "mix");
kitMenu("Roth or traditional, by account", "ivroth", "Your rate now next to an estimate for retirement", "ivheat");
