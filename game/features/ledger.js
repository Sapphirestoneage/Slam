/* ============================================================================
   SLAM the Game: features/ledger.js
   PURPOSE     The giant ledger and the three statements. One sheet with four tabs, and it only reads:
               (1) What you own and owe (the net worth statement), (2) Money in and out (the cash flow
               statement: the plan of one month, and each logged month from the money log), (3) Your
               investments (each account, what is inside it, its fee), (4) Every line (the giant
               ledger: each row of the profile in one list). Each group is a line that opens.
   INPUT       The profile: c.cashes, c.invs, c.debts, c.incs, c.spends, c.moves (the money log),
               c.take, c.spend, c.inv, c.debt. derive(c). The open sheet (W.kind): ledger.
   OUTPUT      Functions: ledgRows, ledgWorth, ledgFlow, ledgInvest, ledgAll, ledgBook, ledgGroup,
               ledgSheet. Actions (ACT): ledger, ledgtab. Menu: "Ledger and statements".
   DEPENDS ON  core/engine.js (derive, rsum, isSharp, debtRate, monthSpent), screens/ui.js,
               features/moneylog.js (lgMonths, lgSum, lgMonthName), features/kit.js.
               USES LATER, behind a typeof test: features/mix.js (mixCalc).
   RULES       This screen asks nothing. A total is the same number that derive(c) and the Money tab
               show: net worth is the cash you can reach plus investments minus what you owe. Cash that
               is set aside shows on its own line and is not in the total, the same as on Home. A line
               from a guess shows as a guess. No verdict words. To change a number, the player goes to
               the Money tab.
   ========================================================================= */
const LEDG_TABS = [
  ["worth", "Own and owe"],
  ["flow", "In and out"],
  ["invest", "Investments"],
  ["all", "Every line"],
];
/* The rows of one part of the profile. Before the player has real lines, one row holds the guess. */
function ledgRows(c, key) {
  const d = derive(c),
    one = (k, amt) => (amt > 0 ? [{ k, amt, s: false }] : []);
  if (c.led && (key === "debts" || (c[key] || []).length)) return (c[key] || []).map(r => Object.assign({}, r));
  return key === "cashes"
    ? one("Cash you can reach", d.cash)
    : key === "invs"
      ? one("Your investments", c.inv || 0)
      : key === "debts"
        ? one("What you owe", c.debt || 0)
        : key === "incs"
          ? one("Money coming in", c.take || 0)
          : one("Money going out", c.spend || 0);
}
/* STATEMENT 1: what you own and owe. nw is the same number as derive(c).nw. */
function ledgWorth(c) {
  const d = derive(c),
    cash = ledgRows(c, "cashes"),
    reach = cash.filter(r => !r.hold),
    held = cash.filter(r => r.hold),
    invs = ledgRows(c, "invs"),
    debts = ledgRows(c, "debts"),
    cashSum = d.cash,
    heldSum = rsum(held),
    inv = c.inv || 0,
    owe = c.debt || 0;
  return {
    reach,
    held,
    invs,
    debts,
    cash: cashSum,
    heldSum,
    inv,
    own: cashSum + inv,
    owe,
    nw: cashSum + inv - owe,
    high: rsum(debts.filter(r => r.high && r.amt > 0)),
    st: kitState([kitSharp(c, "cash"), kitSharp(c, "inv"), kitSharp(c, "debt")]),
  };
}
/* STATEMENT 2: money in and out. The plan of one month, and each month of the money log. */
function ledgFlow(c) {
  const d = derive(c),
    incs = ledgRows(c, "incs"),
    spends = ledgRows(c, "spends"),
    inn = c.take || 0,
    out = c.spend || 0,
    months = lgMonths(c)
      .map(ym => Object.assign({ ym, name: lgMonthName(ym) }, lgSum(c, ym)))
      .filter(m => m.n > 0),
    top = incs.slice().sort((a, b) => b.amt - a.amt)[0];
  return {
    incs,
    spends,
    in: inn,
    out,
    left: inn - out,
    rate: d.rate,
    year: d.save,
    months,
    /* the share of the biggest source in all money coming in */
    topName: top ? top.k : null,
    topShare: top && inn > 0 ? top.amt / inn : null,
    st: kitState([kitSharp(c, "take"), kitSharp(c, "spend")]),
  };
}
/* STATEMENT 3: the investments. With the mix screen, each account has what is inside and its fee. */
function ledgInvest(c) {
  const M = typeof mixCalc === "function" ? mixCalc(c) : null,
    rows = M
      ? M.A.map(a => ({
          k: a.k,
          amt: a.amt,
          kind: a.kind,
          feePct: a.feePct,
          feeYear: (a.amt * (a.feePct + M.advPct)) / 100,
          st: a.st,
        }))
      : ledgRows(c, "invs").map(r => ({ k: r.k, amt: r.amt, kind: "unk", feePct: null, feeYear: null, st: "Guess" })),
    total = c.inv || 0;
  return {
    rows,
    total,
    mix: M && M.total > 0 ? { stock: M.stock, bond: M.bond, cash: M.cash, other: M.other } : null,
    feeYear: M ? M.feeYear : null,
    avg: M ? M.avg : null,
    st: kitState([kitSharp(c, "inv")].concat(rows.map(r => ({ cf: r.st === "Guess" ? 1 : r.st === "Exact" ? 3 : 2 })))),
  };
}
/* THE GIANT LEDGER: each row of the profile in one list. sign is +1 (you have it, or it comes in) or -1. */
function ledgAll(c) {
  const part = (key, title, sign, per) => {
    const rows = ledgRows(c, key);
    return { key, title, sign, per, rows, total: rsum(rows.filter(r => !(key === "cashes" && r.hold))) };
  };
  const parts = [
    part("cashes", "Cash", 1, ""),
    part("invs", "Investments", 1, ""),
    part("debts", "What you owe", -1, ""),
    part("incs", "Money coming in", 1, " a month"),
    part("spends", "Money going out", -1, " a month"),
  ];
  return {
    parts,
    lines: parts.reduce((a, p) => a + p.rows.length, 0),
    real: parts.reduce((a, p) => a + p.rows.filter(r => r.s).length, 0),
  };
}
function ledgBook(c) {
  const N = ledgWorth(c),
    F = ledgFlow(c);
  return {
    title: "Ledger and statements",
    rows: [
      { id: "lg_cash", label: "Cash you can reach", v: N.cash, note: "Your number" },
      { id: "lg_inv", label: "Investments", v: N.inv, note: "Your number" },
      { id: "lg_own", label: "What you own", v: N.own, f: "={lg_cash}+{lg_inv}" },
      { id: "lg_owe", label: "What you owe", v: N.owe, note: "Your number" },
      { id: "lg_nw", label: "Net worth", v: N.nw, f: "={lg_own}-{lg_owe}" },
      { id: "lg_in", label: "Money in a month", v: F.in, note: "Your number" },
      { id: "lg_out", label: "Money out a month", v: F.out, note: "Your number" },
      { id: "lg_left", label: "Left over a month", v: F.left, f: "={lg_in}-{lg_out}" },
      { id: "lg_year", label: "Left over a year", v: F.year, f: "=MAX(0,{lg_left}*12)" },
    ],
  };
}
/* A line that opens: a title, a total, and the rows inside. rows: [[label, value, isGuess]]. */
function ledgGroup(title, total, rows, term, open, guess) {
  return `<details class="ledg" ${open ? "open" : ""}><summary><span class="row between" style="gap:8px;width:100%"><span>${esc(title)} <span class="tiny muted">(${rows.length})</span></span><b class="${guess ? "guess" : ""}">${total}</b></span></summary><div class="inner stack" style="gap:4px">${term ? `<div class="row between tiny muted"><span>What this line means</span>${kitInfo(term)}</div>` : ""}${
    rows.length
      ? igRows(rows.map(r => [esc(r[0]) + (r[2] ? ` <span class="tiny muted">· guess</span>` : ""), r[1]]))
      : `<div class="small muted">Nothing here yet.</div>`
  }</div></details>`;
}
const LEDG_KIND = {
  td: "Target-date fund",
  sp: "Stock index fund",
  single: "Single stocks",
  bond: "Bonds",
  cash: "Cash",
  unk: "Not answered yet",
};
function ledgSheet() {
  const c = C(),
    tab = (W && W.tab) || "worth",
    row = r => [r.k, money(r.amt), !r.s];
  let h =
    head("Money", "Ledger and statements") +
    `<div class="small muted">Everything the game knows about your money, in one place. This screen only reads. To change a number, use the Money tab.</div>` +
    kitTabs("ledgtab", tab, LEDG_TABS);
  if (tab === "worth") {
    const N = ledgWorth(c);
    h +=
      kitTile(
        "Net worth",
        money(N.nw),
        money(N.own) + " you own, minus " + money(N.owe) + " you owe",
        N.st,
        "lg_networth"
      ) +
      ledgGroup("Cash you can reach", money(N.cash), N.reach.map(row), "lg_reach", true, N.st === "Guess") +
      (N.held.length
        ? ledgGroup("Cash set aside", money(N.heldSum), N.held.map(row), "lg_held", false, false)
        : "") +
      ledgGroup("Investments", money(N.inv), N.invs.map(row), "lg_invest", false, !isSharp(c, "inv")) +
      ledgGroup(
        "What you owe",
        money(N.owe),
        N.debts.map(r => [r.k + " (" + debtRate(r).r + "% a year)", money(r.amt), !r.s]),
        "lg_owe",
        false,
        !isSharp(c, "debt")
      ) +
      (N.high > 0
        ? `<div class="small">Of what you owe, <b>${money(N.high)}</b> is high-interest debt ${kitInfo("lg_high")}.</div>`
        : "") +
      mathBox([
        "Net worth = cash you can reach + investments - what you owe.",
        money(N.cash) + " + " + money(N.inv) + " - " + money(N.owe) + " = " + money(N.nw) + ".",
        N.held.length ? "Cash set aside (" + money(N.heldSum) + ") is not in the total, the same as on Home." : "",
        "A home, a car and other things are not in this game's net worth.",
      ]);
  } else if (tab === "flow") {
    const F = ledgFlow(c);
    h +=
      kitTile(
        "Left over each month",
        money(F.left),
        money(F.in) + " in, minus " + money(F.out) + " out. You keep " + kitPct(F.rate, 0) + ".",
        F.st,
        "lg_left"
      ) +
      ledgGroup("Money coming in", money(F.in) + " a month", F.incs.map(row), "lg_in", true, !isSharp(c, "take")) +
      ledgGroup("Money going out", money(F.out) + " a month", F.spends.map(row), "lg_out", false, !isSharp(c, "spend")) +
      (F.topShare != null && F.incs.length > 1
        ? `<div class="small">Your biggest source, ${esc(F.topName)}, is <b>${kitPct(F.topShare, 0)}</b> of the money coming in ${kitInfo("lg_conc")}.</div>`
        : "") +
      `<div class="row between small" style="margin-top:4px"><b>What you logged, by month</b>${kitInfo("lg_logged")}</div>` +
      (F.months.length
        ? F.months
            .map(m =>
              ledgGroup(
                m.name,
                money(m.left) + " left",
                [
                  ["Came in", money(m.in)],
                  ["Went out", money(m.out)],
                ]
                  .concat(Object.keys(m.cats).map(k => ["  " + k, money(m.cats[k])]))
                  .concat([
                    ["Paid on debt", money(m.debt)],
                    ["Moved between accounts", money(m.moved)],
                  ]),
                "",
                false,
                false
              )
            )
            .join("")
        : `<div class="tile small muted">Nothing logged yet. Each entry in the money log shows here, month by month.</div>`) +
      `<button class="ghost wide slim" data-a="mlog">Open the money log</button>` +
      mathBox([
        "Left over = money in - money out, from your plan of one month.",
        money(F.in) + " - " + money(F.out) + " = " + money(F.left) + " a month, or " + money(F.year) + " a year.",
        "A logged month: left = came in - went out - paid on debt. Money moved between your own accounts is not in or out.",
      ]);
  } else if (tab === "invest") {
    const I = ledgInvest(c);
    h +=
      kitTile(
        "Invested",
        money(I.total),
        I.feeYear != null ? "Fees of about " + money(I.feeYear) + " a year (" + kitPct(I.avg / 100, 2) + ")" : "",
        I.st,
        "lg_invest"
      ) +
      I.rows
        .map(r =>
          ledgGroup(
            r.k,
            money(r.amt),
            [
              ["What is inside", LEDG_KIND[r.kind] || "Other"],
              r.feePct != null ? ["Fund fee a year", r.feePct + "%"] : null,
              r.feeYear != null ? ["Fees in dollars a year", money(r.feeYear)] : null,
              ["Share of your investments", I.total > 0 ? kitPct(r.amt / I.total, 0) : "0%"],
            ].filter(Boolean),
            "",
            false,
            r.st === "Guess"
          )
        )
        .join("") +
      (I.rows.length ? "" : `<div class="tile small muted">No investments yet.</div>`) +
      (I.mix
        ? `<div class="row between small"><b>Your mix</b>${kitInfo("stockshare")}</div>` +
          igRows([
            ["Stocks", kitPct(I.mix.stock, 0)],
            ["Bonds", kitPct(I.mix.bond, 0)],
            ["Cash", kitPct(I.mix.cash, 0)],
            I.mix.other > 0 ? ["Other", kitPct(I.mix.other, 0)] : null,
          ])
        : "") +
      (typeof ACT.mix === "function"
        ? `<button class="ghost wide slim" data-a="mix">Open investment mix and fees</button>`
        : "");
  } else {
    const A = ledgAll(c);
    h +=
      `<div class="tile small">${A.lines} lines. ${A.real} of them are real numbers, and ${A.lines - A.real} are guesses ${kitInfo("lg_guess")}.</div>` +
      A.parts
        .map(p =>
          ledgGroup(
            p.title,
            (p.sign < 0 && p.total > 0 ? "-" : "") + money(p.total) + p.per,
            p.rows.map(r => [r.k + (r.hold ? " (set aside)" : ""), money(r.amt) + p.per, !r.s]),
            "",
            false,
            p.rows.some(r => !r.s)
          )
        )
        .join("") +
      `<button class="ghost wide slim" data-a="tab" data-v="money">Change a number on the Money tab</button>`;
  }
  return h;
}
kitTerms({
  lg_networth: [
    "Net worth",
    "What you own minus what you owe. In this game: the cash you can reach plus your investments, minus your debts.",
  ],
  lg_reach: ["Cash you can reach", "Money in checking, savings or at home that you could spend this week."],
  lg_held: [
    "Cash set aside",
    "Cash you hold for a known bill, for example tax money. It is yours, and the game does not count it as free cash.",
  ],
  lg_invest: [
    "Investments",
    "Money in accounts that own funds, stocks or bonds: a plan at work, an IRA, an HSA, or a regular investing account.",
  ],
  lg_owe: ["What you owe", "Each balance you must pay back, with the yearly rate the game uses for it."],
  lg_high: ["High-interest debt", "Debt with a rate of about 8% a year or more. It grows faster than most investments."],
  lg_left: [
    "Left over",
    "The money coming in each month minus the money going out. It is what you can save, invest or put on debt.",
  ],
  lg_in: ["Money coming in", "Your take-home pay and each other source, for one usual month."],
  lg_out: ["Money going out", "Your spending for one usual month, by area."],
  lg_conc: [
    "Biggest source",
    "The share of your income that comes from one place. A high share means one event can change the whole month.",
  ],
  lg_logged: [
    "Logged months",
    "The entries you made in the money log, added up for each month. The plan above is what you expect. This is what you recorded.",
  ],
  lg_guess: [
    "Guess",
    "A number that the game filled in for you, or that you did not make real yet. It shows faded until you confirm it on the Money tab.",
  ],
});
kitScreen(
  "ledger",
  "Ledger and statements",
  "Each number the game knows about your money: what you own and owe, the money in and out, and your investments.",
  "It only reads. Open a line to see what is inside it."
);
Object.assign(ACT, {
  ledger: t => {
    const v = t && t.dataset && t.dataset.v;
    W = { kind: "ledger", tab: LEDG_TABS.some(x => x[0] === v) ? v : "worth", o: {} };
    sheet(ledgSheet);
  },
  ledgtab: t => {
    if (!W || W.kind !== "ledger") return;
    W.tab = t.dataset.v;
    drawSheet();
  },
});
kitMenu("Ledger and statements", "ledger", "What you own and owe, money in and out, investments, every line", "mlog");
