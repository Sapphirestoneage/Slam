/* ===== sign.js: Before you sign. What a new loan really costs, asked one small question at a time (what it is for, how much, the rate, how many years) and then shown in the player's own terms: the monthly payment, the total paid back, the interest as months of living costs, what is left each month after the payment, and how far it moves the day work becomes optional. The freedom date comes from the game's own simulation (freeAt) run twice, once as things are and once with the payment added for as long as the loan lasts, so there is still only one freedom number in the game. Paying cash is shown next to it. Nothing is saved and nothing is a verdict: when a payment does not fit, the screen says what would have to give. All taps. ===== */
const SG_FOR = [
  ["car", "A car", 7, 5],
  ["school", "School or training", 6, 10],
  ["home", "A home repair or furniture", 10, 3],
  ["debt", "Paying off other debt", 12, 3],
  ["biz", "Starting or growing a business", 10, 5],
  ["other", "Something else", 12, 3],
];
function sgPay(P, apr, yrs) {
  const n = Math.round(yrs * 12),
    r = apr / 100 / 12;
  if (!(P > 0) || !(n > 0)) return 0;
  return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
}
function sgCost(c, o) {
  const d = derive(c),
    pay = sgPay(o.amt, o.apr, o.yrs),
    n = Math.round(o.yrs * 12),
    total = pay * n,
    interest = Math.max(0, total - o.amt),
    left = (c.take || 0) - (c.spend || 0),
    base = freeAt(c);
  let withLoan = null,
    cashFree = null;
  try {
    const k = mvClone(c);
    k.spend = (k.spend || 0) + pay;
    k.x = k.x || {};
    k.x.ends = (k.x.ends || []).concat([{ k: "New loan", amt: pay, yrs: o.yrs }]);
    withLoan = freeAt(k);
  } catch (e) {}
  const cash = d.cash || 0,
    canCash = cash >= o.amt;
  try {
    if (canCash) cashFree = freeAt(c, { once: o.amt });
  } catch (e) {}
  return {
    pay,
    n,
    total,
    interest,
    left,
    after: left - pay,
    life: c.spend > 0 ? interest / c.spend : null,
    base,
    withLoan,
    moved: base != null && withLoan != null ? withLoan - base : null,
    cash,
    canCash,
    cashLeft: cash - o.amt,
    cashMonths: c.spend > 0 ? (cash - o.amt) / c.spend : null,
    cashMoved: base != null && cashFree != null ? cashFree - base : null,
    saveMonths: pay > 0 ? Math.ceil(o.amt / pay) : null,
  };
}
function sgMonths(n) {
  const a = Math.abs(n);
  return a < 1 ? "less than a month" : a < 1.5 ? "about 1 month" : "about " + Math.round(a) + " months";
}
function sgChips(k, opts, cur, f) {
  return `<div class="chips">${opts.map(v => `<button class="chip ${cur === v ? "on" : ""}" data-a="sgset" data-k="${k}" data-v="${v}">${f(v)}</button>`).join("")}</div>`;
}
function sgSheet() {
  const c = C(),
    w = W,
    o = w.o,
    F = SG_FOR.find(x => x[0] === o.for),
    top = (n, t) =>
      head("Before you sign", "A new loan") +
      `<div class="tiny muted">Question ${n} of 4</div><div class="tile"><h2 style="margin:0">${t}</h2></div>`,
    back = w.st > 0 ? askBtn("sgback", "Back one", "ghost slim") : "";
  if (w.st === 0)
    return (
      top(1, "What would this loan pay for?") +
      askParts({
        what: null,
        body: `<div class="stack" style="gap:6px">${SG_FOR.map(x => `<button class="rowbtn ${o.for === x[0] ? "sel" : ""}" data-a="sgset" data-k="for" data-v="${x[0]}"><span>${x[1]}</span><span class="caret">›</span></button>`).join("")}</div>`,
        why: "Different loans come with different rates and lengths. Your answer sets a starting guess.",
        find: "Nowhere to look. You know this one.",
      })
    );
  if (w.st === 1)
    return (
      top(2, "How much would you borrow?") +
      askParts({
        what: "The amount you get from the lender, before any interest.",
        body:
          sgChips("amt", [1000, 5000, 10000, 20000, 35000, 50000], o.amt, money) +
          (w.pad === "sg_amt"
            ? `<div class="val">${money(o.sg_amt || 0)}</div>${keypad("sg_amt")}<button class="primary wide" data-a="sgset" data-k="amt" data-v="typed">Use ${money(o.sg_amt || 0)}</button>`
            : `<button class="ghost slim" data-a="padopen" data-k="sg_amt">Type the exact number</button>`) +
          back,
        why: "The more you borrow, the more interest you pay.",
        find: "The price, minus any money you would pay up front.",
      })
    );
  if (w.st === 2)
    return (
      top(3, "What yearly rate does the lender charge?") +
      askParts({
        what: "When you borrow money, you pay back extra. The extra is called interest. The yearly rate is a percent, and loan papers call it APR.",
        body:
          sgChips("apr", [3, 5, 7, 10, 15, 20, 25], o.aprG ? null : o.apr, v => v + "%") +
          askBtn("sgset", "I don't know yet", "ghost", "idk") +
          back,
        why: "The rate is the price of borrowing. A few points change the total by a lot.",
        find: "The loan offer. Look for the letters APR.",
      })
    );
  if (w.st === 3)
    return (
      top(4, "How many years would you take to pay it back?") +
      askParts({
        what: "Loan papers call this the term. It is often written in months. 60 months is 5 years.",
        body: sgChips("yrs", [1, 2, 3, 4, 5, 7, 10, 15, 30], o.yrs, v => v + (v === 1 ? " year" : " years")) + back,
        why: "More years means a smaller payment, and more interest in total.",
        find: "The loan offer. Look for Term.",
      })
    );
  const R0 = sgCost(c, o),
    gs = [];
  if (typeof isSharp === "function" && (!isSharp(c, "take") || !isSharp(c, "spend"))) gs.push("your pay or spending");
  if (o.aprG) gs.push("the rate");
  const fits = R0.after >= 0,
    free =
      R0.base == null
        ? "Your freedom date is not on the calendar yet, so the game cannot show what this moves."
        : R0.withLoan == null
          ? "With this payment, the day work becomes optional drops off the calendar on today's numbers."
          : R0.moved >= 1
            ? "The day work becomes optional moves " + sgMonths(R0.moved) + " later."
            : "It does not move the day work becomes optional by a full month.";
  return (
    head("Before you sign", F ? F[1] : "A new loan") +
    `<div class="tile stack" style="gap:4px;text-align:center"><div class="tiny muted">${money(o.amt)} at ${o.apr}% for ${o.yrs} ${o.yrs === 1 ? "year" : "years"}</div><div class="bignum">${money(Math.round(R0.pay))}</div><div class="small">a month, ${R0.n} times</div></div>` +
    `<div class="cpgrid" style="grid-template-columns:1fr 1fr">${cpCell(money(Math.round(R0.total)), "you pay back in all")}${cpCell(money(Math.round(R0.interest)), "of that is interest, the price of borrowing")}</div>` +
    `<div class="tile stack" style="gap:6px"><b>What it costs you, in your terms</b>${R0.life != null ? `<div class="small">The interest alone would pay for ${sgMonths(R0.life)} of your life.</div>` : ""}<div class="small">You have about ${money(Math.round(R0.left))} left each month after spending. This payment takes ${money(Math.round(R0.pay))} of it${fits ? ", leaving " + money(Math.round(R0.after)) + "." : "."}</div><div class="small">${free}</div></div>` +
    (fits
      ? ""
      : `<div class="banner small">This payment is bigger than what you have left each month. It fits only if about ${money(Math.round(-R0.after))} a month comes from somewhere else: less spending, more income, or a longer loan.</div>`) +
    `<div class="tile stack" style="gap:6px"><b>Or pay cash</b><div class="small">${R0.canCash ? "You have " + money(Math.round(R0.cash)) + " in cash. Paying cash costs no interest, so you keep " + money(Math.round(R0.interest)) + ". It leaves " + money(Math.round(R0.cashLeft)) + " in cash" + (R0.cashMonths != null ? ", which is " + sgMonths(R0.cashMonths) + " of cushion" : "") + "." + (R0.cashMoved != null && R0.cashMoved >= 1 ? " It moves the day work becomes optional " + sgMonths(R0.cashMoved) + " later." : "") : "You do not have this much in cash today. Saving the same " + money(Math.round(R0.pay)) + " a month first gets you there in " + sgMonths(R0.saveMonths) + ", with no interest."}</div></div>` +
    (o.for === "school" || o.for === "biz"
      ? `<div class="tile small">A loan for school or a business can pay you back if it lifts what you earn. <button class="term" data-a="lvopen" data-v="two">Compare investing with a skill</button></div>`
      : "") +
    (gs.length
      ? `<div class="tile small">Some of this rests on a guess (${gs.join(" and ")}), so read it as rough.</div>`
      : "") +
    q(
      "Try a different rate",
      sgChips("apr", [3, 5, 7, 10, 15, 20, 25], o.aprG ? null : o.apr, v => v + "%")
    ) +
    q(
      "Try a different length",
      sgChips("yrs", [1, 2, 3, 4, 5, 7, 10, 15, 30], o.yrs, v => v + (v === 1 ? " yr" : " yrs"))
    ) +
    mathBox([
      "Payment: the amount times the monthly rate, divided by 1 minus (1 plus the monthly rate) to the power of minus the number of payments.",
      "Total paid back is the payment times " + R0.n + ". Interest is the total minus " + money(o.amt) + ".",
      "Months of your life: the interest divided by what you spend in a month, " +
        money(Math.round(c.spend || 0)) +
        ".",
      "Freedom date: the game's own plan, run once as it is and once with this payment added for " +
        o.yrs +
        " " +
        (o.yrs === 1 ? "year" : "years") +
        ".",
    ]) +
    `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="sign">Start over</button><button class="ghost" style="flex:1" data-a="close">Done</button></div>`
  );
}
Object.assign(ACT, {
  sign: () => {
    W = { kind: "sign", st: 0, o: { for: null, amt: null, apr: null, yrs: null, aprG: false } };
    sheet(sgSheet);
  },
  sgback: () => {
    if (!W || W.kind !== "sign") return;
    W.pad = null;
    W.st = W.st === "res" ? 3 : Math.max(0, W.st - 1);
    drawSheet();
  },
  sgset: t => {
    const w = W;
    if (!w || w.kind !== "sign") return;
    const k = t.dataset.k,
      v = t.dataset.v,
      o = w.o,
      res = w.st === "res";
    if (k === "for") {
      const F = SG_FOR.find(x => x[0] === v);
      if (!F) return;
      o.for = v;
      if (o.apr == null || o.aprG) {
        o.apr = F[2];
        o.aprG = true;
      }
    } else if (k === "amt") {
      const n = v === "typed" ? +(o.sg_amt || 0) : +v;
      if (!(n > 0)) return;
      o.amt = n;
      w.pad = null;
    } else if (k === "apr" || (v === "idk" && w.st === 2)) {
      if (v === "idk") {
        const F = SG_FOR.find(x => x[0] === o.for) || SG_FOR[5];
        o.apr = F[2];
        o.aprG = true;
      } else {
        o.apr = +v;
        o.aprG = false;
      }
    } else if (k === "yrs") o.yrs = +v;
    else return;
    if (!res) w.st = w.st === 3 ? "res" : w.st + 1;
    drawSheet();
  },
});
Object.assign(GLOSS, {
  term: [
    "Term",
    "How long you have to pay a loan back. A longer term means a smaller payment each month and more interest in total.",
  ],
});
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "sign")) {
  const i = MENU.findIndex(m => m[1] === "quick");
  MENU.splice(i >= 0 ? i + 1 : MENU.length, 0, [
    "Before you sign a loan",
    "sign",
    "act",
    "Four questions, then what it really costs you",
  ]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
