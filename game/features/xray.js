/* ============================================================================
   SLAM the Game: features/xray.js
   PURPOSE     The product X-ray. One money product that the player pays into each month (insurance
               that also saves, or an investment with fees), next to the common alternative, side by
               side: what each path is worth after the same years, the difference in dollars and in days
               of freedom, and what each path pays if the player dies.
   INPUT       The profile: c.x.xray (the answers, as { v, cf }), c.spend. The open sheet (W.kind): xray.
   OUTPUT      Functions: xrFv, xrCalc, xrSheet, xrBook. Actions (ACT): xray. Menu: "Product X-ray".
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, features/kit.js.
   RULES       Each typical value is a Guess until the player taps or types one. The screen is a picture
               of two paths. It does not tell the player to cancel a product. Cover that the player needs
               stays in place before any change. No red. All rates are the yearly rates as printed,
               before inflation, for both paths.
   ========================================================================= */
const XR_KIND = [
  ["life", "Insurance that also saves"],
  ["fund", "An investment with fees"],
];
const XR_PAY = [
  [100, "$100"],
  [250, "$250"],
  [500, "$500"],
  [1000, "$1,000"],
];
const XR_YEARS = [
  [10, "10 years"],
  [20, "20 years"],
  [30, "30 years"],
];
const XR_GROW = [
  [0.02, "2%"],
  [0.03, "3%"],
  [0.04, "4%"],
  [0.05, "5%"],
];
const XR_LOST = [
  [0, "None"],
  [1, "Year 1"],
  [2, "Years 1 and 2"],
];
const XR_TERM = [
  [20, "$20"],
  [35, "$35"],
  [60, "$60"],
  [100, "$100"],
];
const XR_COVER = [
  [250000, "$250,000"],
  [500000, "$500,000"],
  [1000000, "$1,000,000"],
];
const XR_RET = [
  [0.05, "5%"],
  [0.07, "7%"],
  [0.09, "9%"],
];
const XR_FEE = [
  [0.005, "0.5%"],
  [0.01, "1%"],
  [0.015, "1.5%"],
  [0.025, "2.5%"],
];
const XR_LOAD = [
  [0, "None"],
  [0.03, "3%"],
  [0.0575, "5.75%"],
];
const XR_LOWFEE = 0.0005;
/* What a monthly amount becomes: m a month, at the yearly rate r, for n years. */
function xrFv(m, r, n) {
  const i = r / 12,
    N = Math.round(n * 12);
  return Math.abs(i) < 1e-12 ? m * N : (m * (Math.pow(1 + i, N) - 1)) / i;
}
function xrCalc(c) {
  const g = (k, fb) => kitValue(c, "xray", k, fb),
    kind = g("kind", "life"),
    pay = g("pay", 250),
    years = g("years", 20),
    ret = g("ret", 0.07),
    day = Math.max(1, c.spend || 0) / 30.44;
  let A, B, ins;
  if (kind.v === "life") {
    const grow = g("grow", 0.03),
      lost = g("lost", 1),
      term = g("term", 35),
      cover = g("cover", 500000),
      lostAmt = xrFv(pay.v, grow.v, lost.v) * Math.pow(1 + grow.v / 12, Math.max(0, years.v - lost.v) * 12),
      a = Math.max(0, xrFv(pay.v, grow.v, years.v) - lostAmt),
      side = Math.max(0, pay.v - term.v),
      b = xrFv(side, ret.v - XR_LOWFEE, years.v);
    A = { v: a, die: cover.v, paid: pay.v * 12 * years.v };
    B = { v: b, die: cover.v + b, side, paid: pay.v * 12 * years.v };
    ins = [kind, pay, years, grow, lost, term, cover, ret];
  } else {
    const fee = g("fee", 0.015),
      load = g("load", 0),
      a = xrFv(pay.v * (1 - load.v), ret.v - fee.v, years.v),
      b = xrFv(pay.v, ret.v - XR_LOWFEE, years.v);
    A = { v: a, die: a, paid: pay.v * 12 * years.v };
    B = { v: b, die: b, side: pay.v, paid: pay.v * 12 * years.v };
    ins = [kind, pay, years, fee, load, ret];
  }
  const diff = B.v - A.v;
  return {
    kind: kind.v,
    pay: pay.v,
    years: years.v,
    ret: ret.v,
    A,
    B,
    diff,
    days: diff / day,
    st: kitState(ins),
    g,
  };
}
function xrBook(c) {
  const X = xrCalc(c),
    g = X.g,
    rows = [
      { id: "xr_pay", label: "Paid in each month", v: X.pay },
      { id: "xr_years", label: "Years", v: X.years },
      { id: "xr_ret", label: "Return of the alternative a year", v: X.ret },
      { id: "xr_low", label: "Fee of a low-cost index fund a year", v: XR_LOWFEE },
    ];
  if (X.kind === "life") {
    rows.push(
      { id: "xr_term", label: "Term cover with the same payout, a month", v: g("term", 35).v },
      {
        id: "xr_alt",
        label: "The alternative after the years",
        v: X.B.v,
        f: "=FV(({xr_ret}-{xr_low})/12,{xr_years}*12,-({xr_pay}-{xr_term}),0)",
      },
      {
        id: "xr_prod",
        label: "The product after the years",
        v: X.A.v,
        note: "Cash value at the policy's rate, less the first years that build none",
      }
    );
  } else {
    rows.push(
      { id: "xr_fee", label: "Fee of the product a year", v: g("fee", 0.015).v },
      { id: "xr_load", label: "Sales charge on each payment", v: g("load", 0).v },
      {
        id: "xr_alt",
        label: "The alternative after the years",
        v: X.B.v,
        f: "=FV(({xr_ret}-{xr_low})/12,{xr_years}*12,-{xr_pay},0)",
      },
      {
        id: "xr_prod",
        label: "The product after the years",
        v: X.A.v,
        f: "=FV(({xr_ret}-{xr_fee})/12,{xr_years}*12,-{xr_pay}*(1-{xr_load}),0)",
      }
    );
  }
  rows.push({ id: "xr_diff", label: "The difference", v: X.diff, f: "={xr_alt}-{xr_prod}" });
  return { title: "Product X-ray", rows };
}
function xrSheet() {
  const c = C(),
    X = xrCalc(c),
    g = X.g,
    life = X.kind === "life",
    M = v => money(Math.round(v)),
    gs = X.st === "Guess",
    ask = (k, label, opts, fb, o) => kitAsk(c, "xray", k, label, opts, fb, o || {});
  return (
    head("Plan", "Product X-ray") +
    `<div class="small muted">One product you pay into each month, next to the common alternative. Same money, same years, side by side.</div>` +
    kitColumns([
      {
        title: "The path you are on",
        big: M(X.A.v),
        guess: gs,
        rows: [
          ["Paid in", M(X.A.paid)],
          [life ? "If you die, your people get" : "Left to your people", M(X.A.die)],
        ],
        foot: life ? "the cash value after " + X.years + " years" : "after " + X.years + " years, after fees",
      },
      {
        title: life ? "Term cover, and invest the rest" : "The same money in a low-cost index fund",
        big: M(X.B.v),
        guess: gs,
        hot: true,
        rows: [
          ["Paid in", M(X.B.paid)],
          [life ? "If you die in the term, your people get" : "Left to your people", M(X.B.die)],
        ],
        foot: life
          ? M(X.B.side) + " a month invested, after the term cover"
          : "after " + X.years + " years, after fees",
      },
    ]) +
    `<div class="tile small">The difference after ${X.years} years: <b class="${gs ? "guess" : ""}">${M(Math.abs(X.diff))}</b> ${X.diff >= 0 ? "more on the alternative" : "more on the path you are on"} ${kitPill(X.st)}. That is about <b>${kitDayWords(-Math.abs(X.days)).replace(" sooner", "")}</b> of your spending.</div>` +
    (gs
      ? `<div class="tiny muted">Some numbers here are typical values, so this is a Guess. Tap or type yours and it firms up.</div>`
      : "") +
    ask("kind", "What kind of product is it?", XR_KIND, "life", { term: "xr_kind" }) +
    ask("pay", "What do you pay in each month?", XR_PAY, 250, { typed: true }) +
    ask("years", "Over how many years?", XR_YEARS, 20) +
    (life
      ? ask("grow", "How fast does its cash value grow a year?", XR_GROW, 0.03, {
          term: "xr_cash",
          help: "Use the guaranteed column of the policy illustration.",
        }) +
        ask("lost", "Which first years build no cash value?", XR_LOST, 1, {
          help: "In many policies the first payments go to costs. The illustration shows it as a cash value of 0.",
        }) +
        ask("cover", "What does it pay if you die?", XR_COVER, 500000, { typed: true, term: "xr_term" }) +
        ask("term", "Term cover with the same payout: the price a month", XR_TERM, 35, {
          typed: true,
          term: "xr_term",
          help: "This is a typical value. A real quote takes a few minutes and makes this Exact.",
        })
      : ask("fee", "Its fees a year, all in", XR_FEE, 0.015, {
          term: "expense",
          help: "Add the fund fee, the advisor fee and any wrap or rider fee.",
        }) + ask("load", "A sales charge on each payment", XR_LOAD, 0, { term: "xr_load" })) +
    ask("ret", "The yearly return to use for the alternative", XR_RET, 0.07, {
      help: "A long-run average for a stock index fund, not a promise.",
    }) +
    `<div class="tile small"><b>Before you change anything</b><div>Cover that your people need stays in place until new cover has started.</div><div>Ending a product early can cost a surrender charge or tax. Ask for that number in writing.</div><div>This screen is a picture of two paths, not advice to cancel.</div></div>` +
    mathBox(
      life
        ? [
            "The path you are on: the monthly payment grows at the policy's rate for the years. The first years that build no cash value are taken out.",
            "The alternative: the monthly payment less the price of term cover, invested at the return less a fund fee of " +
              kitPct(XR_LOWFEE, 2) +
              " a year.",
            "A monthly amount m at a yearly rate r for n years becomes m × ((1 + r/12)^(12n) - 1) ÷ (r/12).",
            "Days of your spending: the difference ÷ (spending a month ÷ 30.44).",
          ]
        : [
            "The path you are on: the monthly payment less the sales charge, invested at the return less the product's fees.",
            "The alternative: the full monthly payment, invested at the return less a fund fee of " +
              kitPct(XR_LOWFEE, 2) +
              " a year.",
            "A monthly amount m at a yearly rate r for n years becomes m × ((1 + r/12)^(12n) - 1) ÷ (r/12).",
            "Days of your spending: the difference ÷ (spending a month ÷ 30.44).",
          ]
    )
  );
}
kitTerms({
  xr_kind: [
    "Kind of product",
    "Insurance that also saves is whole life, universal life or any policy with a cash value. An investment with fees is an annuity, a managed account, or a fund with a sales charge.",
  ],
  xr_cash: [
    "Cash value",
    "The part of a life insurance policy that you could take out or borrow against while you are alive.",
  ],
  xr_term: [
    "Term cover",
    "Life insurance for a set number of years with no savings part. It pays only if you die in those years, so it costs much less each month.",
  ],
  xr_load: [
    "Sales charge",
    "A share of each payment that goes to the seller before the money is invested. It is also called a load.",
  ],
});
kitScreen(
  "xray",
  "Product X-ray",
  "One product you pay into, next to the common alternative, for the same money and years.",
  "It shows the difference in dollars and in days of your spending."
);
kitMenu("Product X-ray", "xray", "The path you are on next to the alternative, side by side", "safe");
Object.assign(ACT, {
  xray: () => {
    W = { kind: "xray", o: {} };
    sheet(xrSheet);
  },
});
