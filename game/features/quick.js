/* ============================================================================
   SLAM the Game: features/quick.js
   PURPOSE     Quick math. Small what-if questions: does this car fit, how much home fits, what one
               dollar becomes, and (run Not built, Part 2) a HYSA switch, all at once or a little each
               month, cost per use, worth the hassle, what waiting costs, and a warranty.
   INPUT       The open sheet (W.kind): quick. The taps of the player (the actions in OUTPUT).
   OUTPUT      12 functions. Actions (ACT): quick, qmopen, qmset. Menu: "Quick math".
   DEPENDS ON  core/quick.js (qcHysa, qcDca, qcPerUse, qcHassle, qcStart, qcWarranty, qcNominal: the same
               code as the web app's small pages), screens/dash.js (dkCard, dkStatRow, dkTile), core/engine.js, screens/ui.js, screens/planner.js, core/metrics.js, features/compare.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: features/gig.js, features/sim.js.
   RULES       Taps only. A rule of thumb shows next to the number of the player. No verdict. The real
               hourly wage and Safe to spend have their own screens, thus this sheet opens those
               screens. The same rules on the numbers of today are in Key numbers, and this sheet links
               to them.
   SOURCE      The math is from the main app (the canon pack; js/solo.js has the tests).
   ========================================================================= */
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
  hysa: {
    n: "A high-yield savings account?",
    d: "The same savings at another rate",
    o: { bal: 10000, from: 0.01, to: 4 },
  },
  dca: {
    n: "All at once, or a little each month?",
    d: "A lump of money to invest",
    o: { amt: 25000, mo: 12, cash: 4 },
  },
  peruse: {
    n: "What does each use cost?",
    d: "The price less the resale, over the uses",
    o: { price: 400, back: 0, uses: 50 },
  },
  hassle: { n: "Is it worth the hassle?", d: "What an hour of a money task pays", o: { saved: 100, hrs: 2 } },
  wait: {
    n: "What does waiting to start cost?",
    d: "A year or a few, by the time you stop working",
    o: { amt: 250, wait: 1 },
  },
  warranty: {
    n: "Is this warranty worth it?",
    d: "Its price next to your own odds",
    o: { price: 150, repair: 600, odds: 20 },
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
/* The cards of run Not built, Part 2: each number from core/quick.js, shown in the dashboard kit. */
const QC_GAME = ["hysa", "dca", "peruse", "hassle", "wait", "warranty"],
  QC_INFL = 0.02; /* the web app's inflation preset (data/reference-2026.json, presets.inflation.default) */
function qcGameBody(c, id, o) {
  if (id === "hysa") {
    const r = qcHysa({ balance: o.bal, fromRate: o.from / 100, toRate: o.to / 100 });
    return (
      q(
        "What is in savings",
        qmChips("bal", [1000, 5000, 10000, 25000, 50000], o.bal, v => money(v))
      ) +
      q(
        "The rate it earns now",
        qmChips("from", [0.01, 0.1, 0.5, 1, 2], o.from, v => v + "%")
      ) +
      q(
        "The other account's rate",
        qmChips("to", [3, 3.5, 4, 4.5, 5], o.to, v => v + "%"),
        "Rates move. Check the day you switch."
      ) +
      dkStatRow([
        dkTile("More in a year", money(Math.round(r.yearGain))),
        dkTile("More in 5 years", money(Math.round(r.gain))),
        dkTile("A month", money(Math.round(r.monthGain))),
      ]) +
      dkCard(
        "Before you move it",
        `<div class="small">FDIC or NCUA insured, no monthly fee, and this month's money stays in checking. Interest is taxed as income.</div>`
      ) +
      mathBox([
        money(o.bal) + " at " + o.to + "% a year, added monthly, next to " + o.from + "%.",
        "A year: " + money(Math.round(r.yearTo)) + " of interest next to " + money(Math.round(r.yearFrom)) + ".",
      ])
    );
  }
  if (id === "dca") {
    const r = qcDca({ amount: o.amt, months: o.mo, ret: qcNominal(R, QC_INFL), cashRate: o.cash / 100 });
    return (
      q(
        "The amount",
        qmChips("amt", [5000, 10000, 25000, 50000, 100000], o.amt, v => money(v))
      ) +
      q(
        "Spread over",
        qmChips("mo", [3, 6, 12, 24], o.mo, v => v + " months")
      ) +
      q(
        "What the waiting money earns",
        qmChips("cash", [0, 2, 3, 4, 5], o.cash, v => v + "%")
      ) +
      dkStatRow([
        dkTile("All at once", money(Math.round(r.lump))),
        dkTile("Spread out", money(Math.round(r.spread))),
        dkTile("Waiting, on average", money(Math.round(r.averageWaiting))),
      ]) +
      dkCard(
        "What spreading it costs, and buys",
        `<div class="small">All at once is expected to end ${money(Math.round(r.gap))} ahead. Spreading it keeps money on the side, so a drop right after you start hits less of it. If spreading it is what gets you to invest, it is doing its job.</div>`
      ) +
      mathBox([
        "Both grow at " + Math.round(R * 100) + "% a year after inflation, with 2% inflation added back.",
        "Vanguard's 2012 study: all at once came out ahead about two times in three.",
      ])
    );
  }
  if (id === "peruse") {
    const r = qcPerUse({ price: o.price, resale: o.back, uses: o.uses });
    return (
      q(
        "The price",
        qmChips("price", [50, 150, 400, 1000, 2500], o.price, v => money(v))
      ) +
      q(
        "The times you will really use it",
        qmChips("uses", [5, 10, 25, 50, 100, 365], o.uses, v => String(v))
      ) +
      q(
        "What it sells for after",
        qmChips("back", [0, 25, 100, 300], o.back, v => money(v))
      ) +
      dkStatRow([dkTile("A use", cents(r.perUse)), dkTile("What it really costs", money(Math.round(r.kept)))]) +
      mathBox([money(o.price) + " less " + money(r.resale) + " back, over " + o.uses + " uses."])
    );
  }
  if (id === "hassle") {
    const tl = timeLedger(c, D),
      r = qcHassle({ saved: o.saved, hours: o.hrs, wage: tl.wage });
    return (
      q(
        "What it saves you",
        qmChips("saved", [20, 50, 100, 300, 600], o.saved, v => money(v))
      ) +
      q(
        "The hours it takes",
        qmChips("hrs", [0.5, 1, 2, 4, 8], o.hrs, v => v + (v === 1 ? " hour" : " hours"))
      ) +
      dkStatRow([
        dkTile("This task, an hour", cents(r.perHour)),
        dkTile("Your work, an hour", r.wage ? cents(r.wage) : "?", { guess: !tl.rw }),
      ]) +
      `<div class="small">${r.times == null ? "Add your hours of work to see the two side by side." : "This task pays " + r.times.toFixed(1) + " times an hour of your work. How much you mind the task is the other half, and only you know it."}</div>` +
      mathBox([
        money(o.saved) + " over " + o.hrs + " hours.",
        tl.rw ? "Your real hourly wage from your numbers." : "Your hourly wage is a guess until your hours are in.",
      ])
    );
  }
  if (id === "wait") {
    const age = c.age || 30,
      r = qcStart({ monthly: o.amt, ageA: age, ageB: age + o.wait, to: c.ret || 65, ret: R });
    if (!r.ready) return `<div class="small muted">This needs an age under the age you stop working.</div>`;
    return (
      q(
        "A month, invested",
        qmChips("amt", [50, 100, 250, 500, 1000], o.amt, v => money(v))
      ) +
      q(
        "Waiting",
        qmChips("wait", [1, 2, 3, 5, 10], o.wait, v => v + (v === 1 ? " year" : " years"))
      ) +
      dkStatRow([
        dkTile("What the wait costs", money(Math.round(r.gap))),
        dkTile("Starting now", money(Math.round(r.a))),
        dkTile("To catch up later", money(Math.round(r.catchUp)) + " a month"),
      ]) +
      mathBox([
        money(o.amt) +
          " a month from " +
          r.early +
          " and from " +
          r.late +
          " to " +
          r.to +
          ", at " +
          Math.round(R * 100) +
          "% after inflation.",
        "The best day to start is the one in front of you.",
      ])
    );
  }
  const r = qcWarranty({ price: o.price, repair: o.repair, chance: o.odds / 100 });
  return (
    q(
      "What the warranty costs",
      qmChips("price", [50, 100, 150, 300, 600], o.price, v => money(v))
    ) +
    q(
      "What the repair would cost",
      qmChips("repair", [200, 600, 1000, 2000], o.repair, v => money(v))
    ) +
    q(
      "Your guess: the chance it breaks while covered",
      qmChips("odds", [5, 10, 20, 30, 50], o.odds, v => v + "%")
    ) +
    dkStatRow([
      dkTile("The repair, on your odds", money(Math.round(r.expected))),
      dkTile("Where they meet", Math.round(r.evenChance * 100) + "%"),
    ]) +
    `<div class="small">${r.pays ? "Your guess is above the line where the two meet." : "Put the price in savings instead and it stays yours if nothing breaks."}</div>` +
    mathBox([o.odds + "% of " + money(o.repair) + " next to a price of " + money(o.price) + "."])
  );
}
function qmBody(c, id, o) {
  if (QC_GAME.includes(id)) return qcGameBody(c, id, o);
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
/* qmSheet() makes the full sheet "Quick math". qmSheetBase() is the part from this file. */
function qmSheet() {
  let h = qmSheetBase();
  if (typeof qmSheetSim === "function") h = qmSheetSim(h); /* sim.js: rent or buy, and the car */
  return h;
}
function qmSheetBase() {
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
