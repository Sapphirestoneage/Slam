/* ===== quick.js: Quick math. Three small what-ifs on a thing you are thinking about, each one rule the money world repeats, run on your own pay: does this car fit, how much home fits, and what a dollar becomes. Your real hourly wage and Safe to spend already have their own screens, so this sheet opens those instead of keeping a second answer. All taps, no typing. A rule of thumb is a line someone drew: the screen shows the line and your number next to it and gives no verdict. The same rules measured on what you have today live in Key numbers; this sheet links to them instead of repeating them. Math ported from the Slam repo's canon pack (js/solo.js there has the hand-checked tests). ===== */
const QM_CAR = { down: 0.2, months: 36, share: 0.08 },
  QM_HOME = { front: 0.28, back: 0.36, years: 30 };
const QM = {
  car: { n: "Does this car fit?", d: "The 20/3/8 rule on a price you pick", o: { price: 25000, apr: 7 } },
  home: { n: "How much home fits?", d: "The 28/36 rule on your pay", o: { apr: 6.5 } },
  dollar: {
    n: "What does a dollar become?",
    d: "Money left alone until you stop working",
    o: { amt: 100, how: "once" },
  },
};
function qmPay(loan, apr, n) {
  const r = apr / 1200;
  return r ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n;
}
function qmLoan(pay, apr, n) {
  const r = apr / 1200;
  return r ? (pay * (1 - Math.pow(1 + r, -n))) / r : pay * n;
}
function qmCar(gross, price, apr) {
  const loan = price * (1 - QM_CAR.down),
    pay = qmPay(loan, apr, QM_CAR.months),
    line = gross * QM_CAR.share;
  return {
    down: price * QM_CAR.down,
    loan,
    pay,
    line,
    share: gross > 0 ? pay / gross : null,
    fit: Math.floor(qmLoan(line, apr, QM_CAR.months) / (1 - QM_CAR.down) / 500) * 500,
  };
}
function qmHome(gross, debt, apr) {
  const front = gross * QM_HOME.front,
    back = gross * QM_HOME.back - debt,
    max = Math.max(0, Math.min(front, back));
  return {
    front,
    back,
    max,
    by: back < front ? "back" : "front",
    loan: Math.floor(qmLoan(max, apr, QM_HOME.years * 12) / 1000) * 1000,
  };
}
function qmDollar(amt, yrs, how) {
  if (how === "month") {
    let v = 0;
    for (let m = 0; m < yrs * 12; m++) v = v * (1 + R / 12) + amt;
    return { v, put: amt * 12 * yrs };
  }
  return { v: amt * Math.pow(1 + R, yrs), put: amt };
}
function qmChips(k, opts, cur, f) {
  return `<div class="chips">${opts.map(v => `<button class="chip sm ${cur === v ? "on" : ""}" data-a="qmset" data-k="${k}" data-v="${v}">${f(v)}</button>`).join("")}</div>`;
}
function qmGross(c) {
  const N = knNet(c);
  return {
    g: N.gross,
    known: N.known,
    line: N.known
      ? "Pay before taxes worked out from your tax rate."
      : "Pay before taxes is a guess: your take-home divided by 0.8. Add your tax rate in Key numbers to sharpen it.",
  };
}
function qmBig(label, val, sub) {
  return `<div class="tile stack" style="gap:4px;text-align:center"><div class="tiny muted">${label}</div><div class="bignum" data-fid="qm:big">${val}</div>${sub ? `<div class="small">${sub}</div>` : ""}</div>`;
}
function qmTwo(a, b) {
  return `<div class="cpgrid" style="grid-template-columns:1fr 1fr">${a}${b}</div>`;
}
function qmBody(c, id, o) {
  const take = c.take || 0,
    G0 = qmGross(c),
    guess = !G0.known ? ` <span class="pill">Guess</span>` : "";
  if (id === "car") {
    const r = qmCar(G0.g, o.price, o.apr);
    return (
      q(
        "The price of the car",
        qmChips("price", [10000, 15000, 25000, 35000, 50000], o.price, v => money(v))
      ) +
      q(
        "The loan's yearly rate",
        qmChips("apr", [4, 7, 10, 14], o.apr, v => v + "%")
      ) +
      qmTwo(
        cpCell(
          money(Math.round(r.pay)),
          "this car, a month" + (typeof unitTxt === "function" && unitTxt(c, r.pay) ? ", " + unitTxt(c, r.pay) : "")
        ),
        cpCell(money(Math.round(r.line)), "the rule's line for you")
      ) +
      qmBig(
        "A price that lands on the line",
        money(Math.max(0, r.fit)),
        "With " +
          money(Math.round(o.price * QM_CAR.down)) +
          " down on this one and three years to pay, the payment is " +
          (r.share == null ? "?" : knPct(r.share)) +
          " of your pay before taxes." +
          guess
      ) +
      mathBox([
        "The rule: 20% down, paid off in 3 years, and the payment no more than 8% of pay before taxes.",
        money(o.price) +
          " minus " +
          money(Math.round(r.down)) +
          " down leaves " +
          money(Math.round(r.loan)) +
          " borrowed at " +
          o.apr +
          "% for 36 months.",
        "8% of " + money(Math.round(G0.g)) + " a month is " + money(Math.round(r.line)) + ".",
        G0.line,
        "The 20/3/8 rule is The Money Guy Show's. It is strict on purpose, and plenty of people choose to sit outside it.",
      ])
    );
  }
  if (id === "home") {
    const dp = typeof knGot === "function" ? knGot(c, "debtPay") : null,
      debt = dp ? dp.v : 0,
      r = qmHome(G0.g, debt, o.apr);
    return (
      q(
        "The mortgage rate",
        qmChips("apr", [5.5, 6, 6.5, 7, 7.5], o.apr, v => v + "%")
      ) +
      qmBig(
        "A monthly home cost on the line",
        money(Math.round(r.max)),
        (r.by === "back"
          ? "Your other debt payments set this one: all debt together stays under 36% of pay."
          : "That is 28% of your pay before taxes.") + guess
      ) +
      qmTwo(
        cpCell(money(r.loan), "the loan that payment carries"),
        cpCell(money(Math.round(r.loan / 0.8 / 1000) * 1000), "a price with 20% down")
      ) +
      `<div class="small muted">The payment has to cover taxes and insurance too, so the real loan is smaller than this. A lender's number is a ceiling, not a plan.</div>` +
      mathBox([
        "The rule: home costs up to 28% of pay before taxes, and all debt payments together up to 36%.",
        "28% of " +
          money(Math.round(G0.g)) +
          " is " +
          money(Math.round(r.front)) +
          ". 36% minus " +
          money(Math.round(debt)) +
          " of other payments is " +
          money(Math.round(Math.max(0, r.back))) +
          ". The smaller one counts.",
        dp
          ? "Your other payments come from your debts in My Money."
          : "No other debt payments are on file, so none were taken off.",
        "The loan is 30 years at " + o.apr + "%, the payment going only to the loan.",
        G0.line,
        "The 28/36 rule is the one lenders have used for decades. It is on pay before taxes.",
      ])
    );
  }
  const yrs = Math.max(1, Math.round((c.ret || 65) - c.age)),
    r = qmDollar(o.amt, yrs, o.how);
  return (
    q(
      "How much",
      qmChips("amt", [5, 20, 100, 500, 1000], o.amt, v => money(v))
    ) +
    q(
      "How often",
      `<div class="seg" style="align-self:flex-start"><button class="${o.how === "once" ? "on" : ""}" data-a="qmset" data-k="how" data-v="once">One time</button><button class="${o.how === "month" ? "on" : ""}" data-a="qmset" data-k="how" data-v="month">Every month</button></div>`
    ) +
    qmBig(
      money(o.amt) + (o.how === "month" ? " a month" : "") + " becomes, by " + (c.ret || 65),
      money(Math.round(r.v)),
      "You put in " +
        money(Math.round(r.put)) +
        ". The other " +
        money(Math.round(r.v - r.put)) +
        " is growth, in today's dollars."
    ) +
    `<div class="small muted">It cuts both ways: this is what the money could become, and it is also the real price of spending it today. Neither one is wrong.</div>` +
    mathBox([
      yrs + " years from " + c.age + " to " + (c.ret || 65) + ", growing 7% a year after inflation.",
      o.how === "month" ? "Added every month, compounded monthly." : "Left alone, compounded once a year.",
      "A long-run average, not a promise.",
      "The Money Guy Show calls this the wealth multiplier. Your one-dollar version is in Key numbers.",
    ])
  );
}
function qmSheet() {
  const c = C(),
    w = W;
  if (!w.id)
    return (
      head("Menu", "Quick math") +
      `<div class="small muted">Thinking about something? Tap it and see the line the rule draws, on your own pay.</div><div class="stack" style="gap:6px">${Object.keys(
        QM
      )
        .map(
          id =>
            `<button class="rowbtn" data-a="qmopen" data-v="${id}"><span><b>${QM[id].n}</b><div class="tiny muted">${QM[id].d}</div></span><span class="caret">›</span></button>`
        )
        .join(
          ""
        )}<button class="rowbtn" data-a="hrs"><span><b>What do I really earn an hour?</b><div class="tiny muted">Your pay after the hours the job itself takes</div></span><span class="caret">›</span></button><button class="rowbtn" data-a="safe"><span><b>Can I afford it?</b><div class="tiny muted">Where the money would come from, never a flat no</div></span><span class="caret">›</span></button></div>
  <details class="math"><summary>The same rules on what you have today</summary><div class="inner stack" style="gap:6px">${[
    ["yearsfi", "Years to freedom"],
    ["coast", "Coast"],
    ["paw", "Wealth for your age and pay"],
    ["split", "Needs, fun, saving (50/30/20)"],
    ["carpay", "The car payment you have now"],
    ["home", "The home cost you have now"],
  ]
    .map(
      x =>
        `<button class="rowbtn" data-a="metric" data-v="${x[0]}"><span>${x[1]}</span><span class="caret">›</span></button>`
    )
    .join("")}</div></details>`
    );
  return (
    head("Quick math", QM[w.id].n) +
    qmBody(c, w.id, w.o) +
    `<button class="ghost wide slim" data-a="quick">All the quick math</button>`
  );
}
Object.assign(ACT, {
  quick: () => {
    W = { kind: "quick", id: null, o: {} };
    sheet(qmSheet);
  },
  qmopen: t => {
    const id = t.dataset.v;
    if (!QM[id]) return;
    W = { kind: "quick", id, o: Object.assign({}, QM[id].o) };
    sheet(qmSheet);
  },
  qmset: t => {
    if (!W || W.kind !== "quick") return;
    const k = t.dataset.k,
      v = t.dataset.v;
    W.o[k] = k === "how" ? v : +v;
    drawSheet();
  },
});
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "quick")) {
  const i = MENU.findIndex(m => m[1] === "moves");
  MENU.splice(i >= 0 ? i + 1 : MENU.length, 0, [
    "Quick math",
    "quick",
    "act",
    "A car, a home, an hour of your work: the rule's line on your pay",
  ]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
