/* ============================================================================
   SLAM the Game: features/mix.js
   PURPOSE     Investment mix and fees, by taps for each investment account: what is inside, and a fee
               preset, plus an advisor fee. The result: the stock / bond / cash mix next to an age guide,
               the fees a year in dollars, the fees over 30 years in dollars and in days of freedom, and
               "your path" next to "the low-fee path". This is the first piece of the fee and product
               X-ray. The stock share is also a live key number.
   INPUT       The profile: c.invs (or c.inv), c.age, c.ret, c.take, c.spend, c.x.mix (the answers). The
               open sheet (W.kind): mix. The taps of the player.
   OUTPUT      Functions: mixGuide, mixAccounts, mixCalc, mixYearsTo, knMetricsMix, mixSheet, mixBook.
               Actions (ACT): mix. Parts of functions in other files: knMetricsMix (knMetrics in
               metrics.js). Menu: "Investment mix and fees".
   DEPENDS ON  core/engine.js, screens/ui.js, core/metrics.js, features/compare.js (cpFv),
               features/kit.js, features/retire.js (retireGlideStock: the glide-path code of the retirement
               engine). Each account's mix goes into the engine through retireAccounts in retire.js.
   RULES       The age guide is the glide path of the Vanguard Target Retirement funds, as Vanguard
               publishes it: 90% stocks until 25 years before the stop age, then less each year to 50% at
               the stop age, and 30% seven years after. Growth is 7% a year after inflation, minus the
               fees, compounded once a year (the same sum as the Fee X-ray). "I don't know" is a Guess.
   ========================================================================= */
const MIX_INSIDE = [
  ["td", "Target-date fund"],
  ["sp", "S&P 500 or total market"],
  ["bond", "Bonds"],
  ["cash", "Cash"],
  ["single", "Single stocks"],
  ["crypto", "Crypto"],
  ["unk", "I don't know"],
];
const MIX_FEES = [
  ["0.05", "0.05%"],
  ["0.2", "0.2%"],
  ["0.5", "0.5%"],
  ["1", "1%"],
  ["1.5", "1.5% or more"],
  ["unk", "I don't know"],
];
const MIX_ADVISOR = [
  ["0", "No advisor fee"],
  ["0.5", "0.5%"],
  ["1", "1%"],
  ["1.5", "1.5%"],
];
/* the fee the game assumes for "I don't know", by what is inside */
const MIX_FEE_GUESS = { td: 0.12, sp: 0.05, bond: 0.05, cash: 0, single: 0, crypto: 1, unk: 0.5 };
const MIX_LOW = 0.05;
const MIX_YEARS = 30;
/* THE AGE GUIDE: the Vanguard Target Retirement glide path, set to the stop age of the player. */
function mixGuide(age, ret) {
  ret = ret || 65;
  /* retire.js: the glide-path code of the retirement engine, on the Vanguard points */
  const g = typeof retireGlideStock === "function" ? retireGlideStock(age, ret) : null,
    lead = ret - age,
    stock =
      g != null
        ? g
        : lead >= 25
          ? 0.9
          : lead >= 0
            ? 0.5 + 0.4 * (lead / 25)
            : Math.max(0.3, 0.5 - 0.2 * Math.min(1, -lead / 7));
  return { stock, bond: 1 - stock, source: "Vanguard Target Retirement glide path" };
}
/* The investment accounts, each with its answers. */
function mixAccounts(c) {
  const rows = c.led && (c.invs || []).length ? c.invs : [{ k: "Your investments", amt: c.inv || 0 }];
  return rows.map((r, i) => {
    const inside = kitValue(c, "mix", "in_" + i, "unk"),
      fee = kitValue(c, "mix", "fee_" + i, "unk"),
      kind = inside.v,
      feePct = fee.v === "unk" ? MIX_FEE_GUESS[kind] : +fee.v;
    return {
      i,
      k: r.k,
      amt: +r.amt || 0,
      inside,
      fee,
      kind,
      feePct,
      st: kitState([inside.v === "unk" ? { cf: 1 } : inside, fee.v === "unk" ? { cf: 1 } : fee]),
    };
  });
}
/* Years until the money reaches the goal, at a yearly rate. Null after 100 years. */
function mixYearsTo(inv, add, goal, rate) {
  if (inv >= goal) return 0;
  let v = inv;
  for (let y = 1; y <= 100; y++) {
    const nv = v * (1 + rate) + add * 12;
    if (nv >= goal) return y - 1 + (goal - v) / Math.max(1e-9, nv - v);
    v = nv;
  }
  return null;
}
function mixCalc(c) {
  const A = mixAccounts(c),
    adv = kitValue(c, "mix", "adv", "0"),
    advPct = +adv.v,
    total = A.reduce((s, a) => s + a.amt, 0),
    g = mixGuide(c.age, c.ret),
    share = { stock: 0, bond: 0, cash: 0, other: 0 };
  A.forEach(a => {
    const w = total > 0 ? a.amt / total : 0,
      tg = mixGuide(c.age, c.ret);
    if (a.kind === "td" || a.kind === "unk") {
      share.stock += w * tg.stock;
      share.bond += w * tg.bond;
    } else if (a.kind === "sp" || a.kind === "single") share.stock += w;
    else if (a.kind === "bond") share.bond += w;
    else if (a.kind === "cash") share.cash += w;
    else share.other += w;
  });
  const feeYear = A.reduce((s, a) => s + (a.amt * (a.feePct + advPct)) / 100, 0),
    avg = total > 0 ? (feeYear / total) * 100 : MIX_FEE_GUESS.unk + advPct,
    add = Math.max(0, (c.take || 0) - (c.spend || 0)),
    yours = cpFv(total, add, MIX_YEARS, R - avg / 100),
    low = cpFv(total, add, MIX_YEARS, R - MIX_LOW / 100),
    d = derive(c),
    yFee = mixYearsTo(total, add, d.fi, R - avg / 100),
    yLow = mixYearsTo(total, add, d.fi, R - MIX_LOW / 100),
    days = yFee == null || yLow == null ? null : Math.round((yFee - yLow) * 365);
  return {
    A,
    adv,
    advPct,
    total,
    guide: g,
    stock: share.stock,
    bond: share.bond,
    cash: share.cash,
    other: share.other,
    single: A.filter(a => a.kind === "single").reduce((s, a) => s + a.amt, 0) / Math.max(1, total),
    feeYear,
    avg,
    add,
    yours,
    low,
    lost: Math.max(0, low - yours),
    days,
    fi: d.fi,
    st: kitState(
      A.map(a => (a.st === "Guess" ? { cf: 1 } : { cf: a.st === "Exact" ? 3 : 2 })).concat([adv, kitSharp(c, "inv")])
    ),
  };
}
/* Part of knMetrics() in metrics.js. The stock share as a live key number. */
function knMetricsMix(c, add) {
  try {
    const M = mixCalc(c);
    if (!(M.total > 0)) return;
    const gap = M.stock - M.guide.stock;
    add({
      id: "stockshare",
      g: "grow",
      n: "Stock share",
      what: "How much of your invested money is in stocks, next to an age guide.",
      num: M.stock,
      val: knPct(M.stock),
      st: M.st,
      zone:
        Math.abs(gap) <= 0.1
          ? ["Near the age guide", "good"]
          : gap > 0
            ? ["More in stocks than the age guide", "ok"]
            : ["Less in stocks than the age guide", "ok"],
      bar: { p: M.stock * 100, marks: [[M.guide.stock * 100, "Guide " + Math.round(M.guide.stock * 100) + "%"]] },
      rule: [
        "The " +
          M.guide.source +
          ": 90% stocks until 25 years before you stop, then less each year to 50% when you stop, and 30% seven years after.",
        "A guide, not a grade. Your own comfort with ups and downs counts too.",
      ],
      math: [
        "Stocks: " + knPct(M.stock) + " of " + money(M.total),
        "The age guide for " + c.age + " with a stop age of " + c.ret + ": " + knPct(M.guide.stock),
      ],
      moves: [],
      go: ["Open my investment mix", "mix", ""],
    });
  } catch (e) {
    report(e, "mix.js: knMetricsMix");
  }
}
function mixBook(c) {
  const M = mixCalc(c),
    rows = [];
  M.A.forEach(a => {
    rows.push({ id: "mx_amt" + a.i, label: a.k + ": amount", v: a.amt });
    rows.push({
      id: "mx_fee" + a.i,
      label: a.k + ": fee (percent)",
      v: a.feePct,
      note: a.fee.v === "unk" ? "Guess" : "Your answer",
    });
  });
  rows.push({ id: "mx_adv", label: "Advisor fee (percent)", v: M.advPct });
  rows.push({
    id: "mx_total",
    label: "Invested, all accounts",
    v: M.total,
    f: "=" + M.A.map(a => "{mx_amt" + a.i + "}").join("+"),
  });
  rows.push({
    id: "mx_feeyear",
    label: "Fees a year, in dollars",
    v: M.feeYear,
    f: "=(" + M.A.map(a => "{mx_amt" + a.i + "}*({mx_fee" + a.i + "}+{mx_adv})").join("+") + ")/100",
  });
  rows.push({ id: "mx_avg", label: "Average fee (percent)", v: M.avg, f: "={mx_feeyear}/{mx_total}*100" });
  rows.push({ id: "mx_add", label: "Invested each month", v: M.add });
  rows.push({ id: "mx_ret", label: "Growth a year after inflation", v: R });
  rows.push({
    id: "mx_yours",
    label: "Your path after 30 years",
    v: M.yours,
    f: "=FV({mx_ret}-{mx_avg}/100,30,-{mx_add}*12,-{mx_total})",
  });
  rows.push({
    id: "mx_low",
    label: "Low-fee path after 30 years (0.05%)",
    v: M.low,
    f: "=FV({mx_ret}-0.0005,30,-{mx_add}*12,-{mx_total})",
  });
  rows.push({ id: "mx_lost", label: "What the fees take over 30 years", v: M.lost, f: "=MAX(0,{mx_low}-{mx_yours})" });
  rows.push({ id: "mx_stock", label: "Stock share", v: M.stock, note: "From what is inside each account" });
  rows.push({ id: "mx_guide", label: "Age guide stock share", v: M.guide.stock, note: M.guide.source });
  return { title: "Investment mix and fees", rows };
}
function mixSheet() {
  const c = C(),
    M = mixCalc(c),
    P = v => Math.round(v * 100) + "%";
  const acct = a =>
    `<div class="tile stack" style="gap:6px"><div class="row between"><b>${esc(a.k)}</b><span class="small">${money(a.amt)} ${kitPill(a.st)}</span></div>` +
    kitAsk(c, "mix", "in_" + a.i, "What is inside?", MIX_INSIDE, a.inside.v, { term: "mx_" + a.kind }) +
    kitAsk(c, "mix", "fee_" + a.i, "Its fee a year", MIX_FEES, a.fee.v, {
      term: "expense",
      help:
        a.fee.v === "unk"
          ? "The game uses " + a.feePct + "% for now. The fee is on the fund page as the expense ratio."
          : "",
    }) +
    `</div>`;
  return (
    head("Plan", "Investment mix and fees") +
    `<div class="small muted">Tap what is inside each account and what it costs. "I don't know" is fine. It shows as a guess.</div>` +
    M.A.map(acct).join("") +
    kitAsk(c, "mix", "adv", "An advisor fee on top, a year", MIX_ADVISOR, M.adv.v, { term: "advfee" }) +
    `<div class="grid2">${kitTile("Stocks", P(M.stock), "the age guide is " + P(M.guide.stock), M.st, "stockshare")}${kitTile("Bonds and cash", P(M.bond) + " · " + P(M.cash), M.other > 0 ? P(M.other) + " in crypto" : "the rest", M.st)}${kitTile("Fees a year", money(Math.round(M.feeYear)), "about " + Math.round(M.avg * 100) / 100 + "% of " + money(M.total), M.st, "expense")}${kitTile("Fees over 30 years", money(Math.round(M.lost)), M.days != null && M.days > 0 ? "about " + M.days.toLocaleString() + " days later to freedom" : "no change to your freedom date", M.st)}</div>` +
    `<div class="tiny muted">Age guide: the ${esc(M.guide.source)}, set to your stop age of ${c.ret}.</div>` +
    kitColumns([
      {
        title: "Your path, " + Math.round(M.avg * 100) / 100 + "% a year",
        big: money(Math.round(M.yours)),
        guess: M.st === "Guess",
        foot: "after 30 years, in today's dollars",
      },
      {
        title: "The low-fee path, " + MIX_LOW + "% a year",
        big: money(Math.round(M.low)),
        hot: true,
        foot: "the same money in a low-cost index fund",
      },
    ]) +
    (M.single > 0.1
      ? `<div class="tile small">About ${P(M.single)} of your money is in single stocks. One company can fall a long way on its own.</div>`
      : "") +
    mathBox([
      "Mix: each account's share of " +
        money(M.total) +
        ', split by what is inside. A target-date fund and "I don\'t know" use the age guide.',
      "Fees a year: each account × (its fee + the advisor fee of " +
        M.advPct +
        "%) = " +
        money(Math.round(M.feeYear)) +
        ".",
      "30 years: start with " +
        money(M.total) +
        ", add " +
        money(M.add) +
        " a month, grow 7% minus the fee each year. The same sum as the Fee X-ray.",
      "Days of freedom: the years until you reach " +
        money(Math.round(M.fi)) +
        " at your fee, minus the years at " +
        MIX_LOW +
        "%, × 365.",
      "Growth of 7% a year after inflation is a long-run average, not a promise.",
    ]) +
    `<button class="ghost wide slim" data-a="compare" data-v="fee">Open the Fee X-ray</button>`
  );
}
kitTerms({
  expense: [
    "Fund fee (expense ratio)",
    "What a fund charges each year, as a percent of what you have in it. It comes out quietly, so you never see a bill.",
  ],
  advfee: [
    "Advisor fee",
    "What an advisor charges each year, often about 1% of what they manage, on top of the fund fees.",
  ],
  mx_td: ["Target-date fund", "One fund that holds stocks and bonds and moves toward bonds as its year gets close."],
  mx_sp: ["S&P 500 or total market fund", "One fund that holds the biggest US companies, or all of them. All stocks."],
  mx_bond: ["Bond fund", "Loans to governments and companies. Steadier than stocks, and lower growth."],
  mx_cash: ["Cash", "Money market or cash inside the account. Safe, and it grows slowly."],
  mx_single: ["Single stocks", "Shares of one company at a time. One company can rise or fall a long way."],
  mx_crypto: ["Crypto", "Digital coins such as bitcoin. Prices can swing a long way in a short time."],
  mx_unk: [
    "Not sure what is inside",
    "The account's app or statement lists its holdings. Until then the game uses the age guide.",
  ],
});
kitScreen(
  "mix",
  "Investment mix and fees",
  "What is inside each account, and what it costs you a year.",
  "It puts your path next to the low-fee path."
);
Object.assign(ACT, {
  mix: () => {
    W = { kind: "mix", o: {} };
    sheet(mixSheet);
  },
});
kitMenu("Investment mix and fees", "mix", "Your stock share and what your fees cost, in dollars and days", "cover");
