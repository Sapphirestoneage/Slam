/* ============================================================================
   SLAM the Game: features/windfall.js
   PURPOSE     The windfall. What to do with a bonus, a gift, a tax refund or other extra money. The
               amount goes down the same order as the two paths, step by step: tax on it (when no tax
               came out), the small cushion, the job's match, high-interest debt, the full cushion, the
               Roth IRA, the HSA, the plan at work, then a regular investing account. Each step takes
               what it needs, and the rest moves on. The screen shows the dollars for each step, the
               interest that stops, and what the invested part can become by the stop age.
   INPUT       The profile, through pathsBase() of features/paths.js (cash, the cushion targets, the
               match, high-interest debt, the account limits) and taxvCalc() of features/taxview.js (the
               tax rate). The answers: c.x.wind (amt, taxed). The open sheet (W.kind): windfall.
   OUTPUT      Functions: windMonthsLeft, windRate, windOxygen, windIras, windCalc, windBook, windSheet. Actions (ACT):
               windfall. Menu: "Got extra money?".
   DEPENDS ON  core/engine.js, screens/ui.js, data/limits2026.js, features/taxview.js, features/paths.js
               (pathsAssume, pathsBase, PATHS_LINE), features/kit.js.
   RULES       The order is the order of paths.js (the Financial Order of Operations, with the oxygen mask
               steps first). This file does not make a second order. A step that needs nothing shows $0
               with the reason. The match and the plan at work take money through the paycheck: the
               screen says to raise the contribution and live on the windfall. The game does not know
               what the player already put in each account this year, so the room is the full 2026 limit
               and the result says Guess for those steps. All amounts are in today's dollars. The words
               are "If these assumptions hold". No verdict words. A fun share (0% unless the player picks
               one) comes out after tax and before the order, and only when the oxygen mask rule of
               paths.js holds. A household that files jointly has two IRAs.
   ========================================================================= */
const WIND_AMT = [500, 1000, 2500, 5000, 10000, 25000, 50000];
const WIND_TAXED = [
  ["yes", "Tax already came out, or none is owed"],
  ["no", "No tax came out yet"],
];
const WIND_FUN = [
  [0, "None"],
  [5, "5%"],
  [10, "10%"],
  [20, "20%"],
];
const WIND_STEPS = ["tax", "fun", "cushion1", "match", "debt", "cushion2", "roth", "hsa", "k401", "taxable"];
/* The months left in this year, with this month. */
function windMonthsLeft(today) {
  return 13 - +String(today || todayISO()).slice(5, 7);
}
/* The share of untaxed extra money to hold back for tax: the top federal rate plus the average state rate
   of the tax view. Falls back to the tax rate of Key numbers, then to 22%. */
function windRate(c) {
  try {
    const T = taxvCalc(c);
    if (T && T.top > 0) return { v: T.top + (T.gross > 0 ? T.stateTax / T.gross : 0), cf: T.given ? 2 : 1 };
  } catch (e) {
    report(e, "windfall.js: windRate");
  }
  return c.x && c.x.taxPct ? { v: c.x.taxPct / 100, cf: 2 } : { v: 0.22, cf: 1 };
}
/* The oxygen mask rule of paths.js: the full cushion is in place and no high-interest debt is left. Fun
   money waits for it. */
function windOxygen(B) {
  return B.d.cash >= B.target - 0.5 && B.hi <= 0;
}
/* Two IRAs for a married household: the same test as retireFiling() in retire.js (the filing status of
   the tax view). */
function windIras(c) {
  return retireFiling(c) === "married_filing_jointly" ? 2 : 1;
}
/* THE SPLIT. over: { amt, taxed, fun, today }. Returns the steps { id, label, need, amt, why } and the totals. */
function windCalc(c, over) {
  over = over || {};
  const I = {
      amt: kitValue(c, "wind", "amt", 5000),
      taxed: kitValue(c, "wind", "taxed", "yes"),
      fun: kitValue(c, "wind", "fun", 0),
    },
    amount = over.amt != null ? over.amt : I.amt.v,
    taxed = (over.taxed || I.taxed.v) !== "no",
    A = pathsAssume(c),
    B = pathsBase(c, A),
    cash = B.d.cash,
    left12 = windMonthsLeft(over.today),
    rate = windRate(c),
    two = retireFiling(c) === "married_filing_jointly" /* one test of "married" for the HSA and the IRAs */,
    oxy = windOxygen(B),
    funAsk = over.fun != null ? over.fun : I.fun.v,
    funShare = oxy ? funAsk / 100 : 0,
    iras = windIras(c),
    got = {},
    steps = [];
  let rest = amount;
  const need = {
      tax: () => (taxed ? 0 : amount * rate.v),
      fun: () => (amount - (got.tax || 0)) * funShare,
      cushion1: () => B.starter - cash,
      match: () => B.matchNeed * left12,
      debt: () => B.hi,
      cushion2: () => B.target - cash - (got.cushion1 || 0),
      roth: () => LIMITS_2026.ira * iras,
      hsa: () => B.hsa * 12,
      k401: () => B.k401 * left12,
      taxable: () => rest,
    },
    why = {
      tax: n =>
        taxed
          ? "Tax already came out, or none is owed, so nothing is held back."
          : "No tax came out of it. Hold back " +
            kitPct(rate.v) +
            " (your top federal rate plus your average state rate) until you file.",
      cushion1: n =>
        n > 0
          ? "Cash is " + money(cash) + ". The small cushion is " + money(B.starter) + ", for one deductible."
          : "Your cash already covers the small cushion of " + money(B.starter) + ".",
      match: n =>
        n > 0
          ? "You leave about " +
            money(B.matchNeed) +
            " a month of match on the table. Raise your contribution by that much for the " +
            left12 +
            " months left this year, and live on this money. Your job adds the same amount."
          : "No job match is left on the table.",
      fun: n =>
        funAsk > 0 && !oxy
          ? "The fun share waits for now. Your plan puts the full cushion and high-interest debt first, and this opens when both are done."
          : n > 0
            ? funAsk + "% of what is yours, to enjoy. No strings."
            : "You picked no fun share.",
      debt: n =>
        n > 0
          ? "High-interest debt of " + money(B.hi) + " at about " + Math.round(B.hiRate) + "% a year."
          : "No high-interest debt.",
      cushion2: n =>
        n > 0
          ? "The full cushion is " + money(Math.round(B.target)) + " (" + B.d.target + " months of spending)."
          : "Your cash already covers the full cushion.",
      roth: n =>
        "The 2026 limit is " +
        money(LIMITS_2026.ira) +
        (iras === 2 ? " for each of you, " + money(LIMITS_2026.ira * 2) + " for two." : ".") +
        " The game does not know what you put in this year.",
      hsa: n =>
        n > 0
          ? "The 2026 limit is " + money(two ? LIMITS_2026.hsaFamily : LIMITS_2026.hsaOne) + " for your health plan."
          : "The game shows no HSA for you. Skip this step unless your health plan allows one.",
      k401: n =>
        n > 0
          ? "Room for about " +
            money(Math.round(B.k401)) +
            " more a month up to the 2026 limit. Raise your contribution for the " +
            left12 +
            " months left, and live on this money."
          : "No room left in the plan at work this year.",
      taxable: n => (n > 0 ? "The rest, in a regular investing account or toward a goal." : "Nothing is left over."),
    };
  WIND_STEPS.forEach(id => {
    const n = Math.max(0, Math.round(need[id]())),
      a = Math.min(n, Math.max(0, rest));
    got[id] = a;
    rest -= a;
    steps.push({
      id,
      label: id === "tax" ? "Tax on this money" : id === "fun" ? "Fun money" : PATHS_LINE[id][0],
      need: n,
      amt: a,
      why: why[id](n),
    });
  });
  const invested = got.match + got.roth + got.hsa + got.k401 + got.taxable,
    years = Math.max(0, Math.max(c.age, c.ret) - c.age);
  return {
    amount,
    taxed,
    rate: rate.v,
    left12,
    steps,
    got,
    toTax: got.tax,
    toFun: got.fun,
    funAsk,
    funShare,
    oxy,
    iras,
    toCash: got.cushion1 + got.cushion2,
    toDebt: got.debt,
    invested,
    matchAdds: got.match,
    saved: (got.debt * B.hiRate) / 100,
    ret: A.ret.v,
    years,
    grows: Math.round((invested + got.match) * Math.pow(1 + A.ret.v, years)),
    first: steps.find(s => s.amt > 0) || null,
    st: kitState([
      I.amt,
      kitSharp(c, "spend"),
      kitSharp(c, "cash"),
      taxed ? null : rate,
      got.roth + got.hsa + got.k401 > 0 ? { cf: 1 } : null,
    ]),
    I,
    B,
  };
}
function windBook(c) {
  const S = windCalc(c),
    rows = [
      { id: "wd_amt", label: "The extra money", v: S.amount, note: "Your answer" },
      { id: "wd_rate", label: "Share held back for tax", v: S.taxed ? 0 : S.rate, note: "From your tax view" },
      {
        id: "wd_funshare",
        label: "Fun share",
        v: S.funShare,
        note: S.funAsk > 0 && !S.oxy ? "Waits for the full cushion and no high-interest debt" : "Your answer",
      },
    ];
  S.steps.forEach(s =>
    rows.push({
      id: "wd_" + s.id,
      label: s.label,
      v: s.amt,
      f:
        s.id === "tax"
          ? "=ROUND({wd_amt}*{wd_rate},0)"
          : s.id === "fun"
            ? "=ROUND(({wd_amt}-{wd_tax})*{wd_funshare},0)"
            : undefined,
      note:
        s.id === "tax"
          ? ""
          : s.id === "fun"
            ? "After tax, before the order starts"
            : s.id === "roth" && S.iras === 2
              ? "Two IRAs: a married household"
              : "The order of the two paths: each step takes what it needs",
    })
  );
  rows.push(
    {
      id: "wd_inv",
      label: "Invested from this money",
      v: S.invested,
      f: "={wd_match}+{wd_roth}+{wd_hsa}+{wd_k401}+{wd_taxable}",
    },
    { id: "wd_ret", label: "Return a year after inflation", v: S.ret, note: "From the two paths" },
    { id: "wd_yrs", label: "Years to your stop age", v: S.years },
    {
      id: "wd_grows",
      label: "What the invested part and the match can become",
      v: S.grows,
      f: "=ROUND(({wd_inv}+{wd_match})*(1+{wd_ret})^{wd_yrs},0)",
    }
  );
  return { title: "The windfall", rows };
}
function windSheet() {
  const c = C(),
    S = windCalc(c),
    used = S.steps.filter(s => s.amt > 0),
    skipped = S.steps.filter(s => !s.amt);
  let h =
    head("Plan", "Got extra money?") +
    `<div class="small muted">A bonus, a gift, a refund. It goes down the same order as your plan ${kitInfo("wd_order")}, one step at a time.</div>` +
    kitAsk(
      c,
      "wind",
      "amt",
      "How much is it?",
      WIND_AMT.map(v => [v, money(v)]),
      5000,
      {
        typed: true,
        term: "wd_windfall",
      }
    ) +
    kitAsk(c, "wind", "taxed", "Did tax come out of it?", WIND_TAXED, "yes", {
      term: "wd_taxed",
      help: "A bonus on a paycheck: tax came out. A gift: none is owed by you. Freelance pay or a sale: no tax came out yet.",
    }) +
    kitAsk(c, "wind", "fun", "A share for fun, before the order starts?", WIND_FUN, 0, {
      term: "wd_fun",
      help:
        S.funAsk > 0 && !S.oxy
          ? "The fun share waits for now: your plan puts the full cushion and high-interest debt first. It opens when both are done."
          : "A share to enjoy makes the rest of the plan easier to keep.",
    }) +
    kitTile(
      "Start here",
      S.first ? money(S.first.amt) : money(0),
      S.first ? esc(S.first.label) + ". " + esc(S.first.why) : "",
      S.st,
      "wd_order"
    ) +
    `<div class="row between" style="gap:6px"><b class="small">Where the ${money(S.amount)} goes</b>${kitInfo("wd_split")}</div><div class="stack" style="gap:6px">${used
      .map(
        s =>
          `<div class="tile stack windstep" style="gap:2px"><div class="row between" style="gap:8px"><b class="small">${esc(s.label)} ${kitInfo("wd_" + s.id)}</b><b class="small" style="white-space:nowrap">${money(s.amt)}</b></div><div class="tiny muted">${esc(s.why)}${s.amt < s.need ? " This money covers " + money(s.amt) + " of the " + money(s.need) + "." : ""}</div></div>`
      )
      .join("")}</div>`;
  if (skipped.length)
    h += `<details><summary>Steps that take nothing (${skipped.length})</summary><div class="inner stack" style="gap:6px">${skipped.map(s => `<div class="small"><b>${esc(s.label)}</b> ${kitInfo("wd_" + s.id)}<div class="tiny muted">${esc(s.amt < s.need ? "The money ran out before this step. It needs " + money(s.need) + "." : s.why)}</div></div>`).join("")}</div></details>`;
  h += kitColumns([
    {
      title: "To cash and debt",
      big: money(S.toCash + S.toDebt),
      guess: S.st === "Guess",
      rows: [
        ["Cash cushion " + kitInfo("wd_cushion1"), money(S.toCash)],
        ["High-interest debt " + kitInfo("wd_debt"), money(S.toDebt)],
        ["Interest that stops " + kitInfo("wd_saved"), money(Math.round(S.saved)) + " a year"],
      ],
    },
    {
      title: "Invested",
      big: money(S.invested),
      guess: S.st === "Guess",
      rows: [
        ["Your job adds " + kitInfo("wd_match"), money(S.matchAdds)],
        ["By your stop age " + kitInfo("wd_grows"), money(S.grows)],
        ["Held for tax " + kitInfo("wd_tax"), money(S.toTax)],
      ],
      foot:
        "If these assumptions hold: " +
        kitPct(S.ret) +
        " a year after inflation, for " +
        S.years +
        (S.years === 1 ? " year." : " years."),
    },
  ]);
  h += mathBox([
    "The order: " +
      S.steps.map(s => s.label.toLowerCase()).join(", then ") +
      ". It is the order of your two paths (the Financial Order of Operations).",
    "Each step takes the smaller of what it needs and what is left. The rest moves to the next step.",
    S.taxed
      ? "Tax: nothing held back."
      : "Tax: " + money(S.amount) + " times " + kitPct(S.rate) + " = " + money(S.toTax) + ".",
    "Months left this year: " + S.left12 + ". The match and the plan at work count only those months.",
    "Account limits: " +
      LIMITS_2026.source +
      ", tax year " +
      LIMITS_2026.year +
      ". The game does not know what you already put in this year, so the room is the full limit.",
    S.iras === 2
      ? "Roth IRA: two IRAs, one for each of you, because your tax view says married filing jointly. " +
        money(LIMITS_2026.ira) +
        " times 2 = " +
        money(LIMITS_2026.ira * 2) +
        "."
      : "Roth IRA: one IRA. A married household that files jointly gets two.",
    "Fun money: " +
      (S.funAsk > 0 && !S.oxy
        ? "it waits. The oxygen mask rule of your two paths comes first: the full cushion and no high-interest debt."
        : Math.round(S.funShare * 100) + "% of the money after tax = " + money(S.toFun) + ", before the order starts."),
    "By your stop age: (" +
      money(S.invested) +
      " invested + " +
      money(S.matchAdds) +
      " from your job) grown at " +
      kitPct(S.ret) +
      " a year for " +
      S.years +
      " years = " +
      money(S.grows) +
      ", in today's dollars.",
    "Interest that stops: the debt paid, times its rate.",
  ]);
  h += `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="paths">See the two paths</button><button class="ghost" style="flex:1" data-a="simopen" data-v="spend">Or spend it: run it</button></div>`;
  return h;
}
kitTerms({
  wd_windfall: ["Windfall", "Money outside your normal pay: a bonus, a gift, a tax refund, an inheritance, a sale."],
  wd_fun: [
    "Fun money",
    "A share of extra money to enjoy with no strings. It comes out after tax and before the order starts. It opens when your full cushion is in place and no high-interest debt is left.",
  ],
  wd_taxed: [
    "Tax on extra money",
    "A bonus on a paycheck already had tax taken out. A gift is not taxed to the person who gets it. Freelance pay and most sales have no tax taken out, so part of the money is not yours yet.",
  ],
  wd_order: [
    "The order",
    "The same steps as your plan: a small cushion, the free money from your job, expensive debt, the full cushion, then the tax-favored accounts, then a regular account.",
  ],
  wd_split: [
    "Where it goes",
    "Each step takes what it needs, and the rest moves on. A big amount reaches more steps. A small amount stops early.",
  ],
  wd_tax: ["Held for tax", "Money to keep in savings until you file your taxes, so the tax bill is not a surprise."],
  wd_cushion1: [
    "The small cushion",
    "Cash for one insurance deductible, at least $1,000. It keeps a surprise bill off the credit card.",
  ],
  wd_match: [
    "Your job's match",
    "Money your employer adds when you put money in the plan at work. It goes in through your paycheck, so you raise your contribution and live on the windfall.",
  ],
  wd_debt: ["High-interest debt", "Debt that charges 8% a year or more. Paying it is a sure return at that rate."],
  wd_cushion2: [
    "The full cushion",
    "Cash for the months of spending that fit your situation. It lets you ride out a job loss.",
  ],
  wd_roth: [
    "Roth IRA",
    "A retirement account. You put in money that was already taxed, and the growth is never taxed.",
  ],
  wd_hsa: [
    "HSA",
    "A health savings account. It needs a high-deductible health plan. No tax going in, growing, or coming out for medical costs.",
  ],
  wd_k401: [
    "The plan at work",
    "A 401(k) or a similar plan. Money goes in through your paycheck, up to the yearly limit.",
  ],
  wd_taxable: [
    "A regular investing account",
    "An account with no special tax rules and no limit. You can take the money out at any time.",
  ],
  wd_saved: ["Interest that stops", "What the debt you pay with this money would have charged in a year."],
  wd_grows: [
    "By your stop age",
    "What the invested part can become when it grows at the return of your plan until the age you plan to stop work. It is an average, not a promise.",
  ],
});
kitScreen(
  "windfall",
  "Got extra money?",
  "A bonus, a gift or a refund, split in the same order as your plan.",
  "It shows the dollars for each step and what the invested part can become."
);
Object.assign(ACT, {
  windfall: () => {
    W = { kind: "windfall", o: {} };
    sheet(windSheet);
  },
});
kitMenu("Got extra money?", "windfall", "A bonus, a gift or a refund: where each dollar goes first", "paths");
