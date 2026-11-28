/* ============================================================================
   SLAM the Game, test: tests/before-you-sign.js
   PURPOSE     Examine Before you sign: the questions about a new loan, the payment math, and the
               result.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. One sample profile
               that this file makes (the same profile in the six files that came from one older file).
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/sign.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    tour0 = G.tourSeen,
    R = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Kai",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 4000,
      spend: 3000,
      inv: 20000,
      match: "yes",
      tax: "no",
      work: "First job",
      incs: [R({ k: "A main job", amt: 4000 })],
      spends: [R({ k: "Home", amt: 1800 }), R({ k: "Food", amt: 1200 })],
      cashes: [R({ k: "Checking", amt: 12000 })],
      invs: [R({ k: "Retirement plan at work", amt: 20000 })],
      debts: [
        R({ k: "Credit card balance", amt: 3000, high: true, apr: "15% to 25%", rate: 20, pay: 150 }),
        R({ k: "Car loan", amt: 9000, high: false, apr: "Under 8%", rate: 5, pay: 250 }),
      ],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C();
  let o;
  chk(
    "menu has the three new tools",
    ["sign", "owed", "study"].every(k => MENU.some(m => m[1] === k))
  );
  X("sign");
  chk(
    "loan: question 1 of 4, one question",
    W.kind === "sign" &&
      W.st === 0 &&
      ov().includes("Question 1 of 4") &&
      ov().includes("What would this loan pay for?") &&
      ov().includes("Why we ask")
  );
  X("sgset", "car", "for");
  chk("amount next", W.st === 1 && ov().includes("How much would you borrow?"));
  X("sgset", "20000", "amt");
  chk(
    "rate explains interest and APR",
    W.st === 2 && ov().includes("The extra is called interest") && ov().includes("APR")
  );
  X("sgback");
  chk("back one", W.st === 1);
  X("sgset", "20000", "amt");
  X("sgset", "7", "apr");
  chk("term explained", W.st === 3 && ov().includes("60 months is 5 years"));
  X("sgset", "5", "yrs");
  const pay = (20000 * (0.07 / 12)) / (1 - Math.pow(1 + 0.07 / 12, -60)),
    S0 = sgCost(c, W.o);
  chk(
    "payment by hand",
    Math.abs(sgPay(20000, 7, 5) - pay) < 1e-9 &&
      Math.round(pay) === 396 &&
      Math.abs(S0.total - pay * 60) < 1e-6 &&
      Math.abs(S0.interest - (pay * 60 - 20000)) < 1e-6 &&
      Math.abs(S0.life - (pay * 60 - 20000) / 3000) < 1e-9 &&
      sgPay(1200, 0, 1) === 100
  );
  chk(
    "freedom date comes from the game, run twice",
    S0.base === freeAt(c) && S0.withLoan != null && S0.withLoan >= S0.base && S0.moved === S0.withLoan - S0.base
  );
  o = ov();
  chk(
    "result: payment, total, interest, your terms, pay cash, math",
    W.st === "res" &&
      o.includes("$396") &&
      o.includes("you pay back in all") &&
      o.includes("the price of borrowing") &&
      o.includes("would pay for about 1 month of your life") &&
      o.includes("left each month after spending") &&
      o.includes("Or pay cash") &&
      o.includes("Try a different rate") &&
      clean(o),
    junk(o)
  );
  chk(
    "not enough cash: says how long saving would take, no interest",
    !S0.canCash && o.includes("You do not have this much in cash today") && o.includes("with no interest")
  );
  X("sgset", "10", "yrs");
  chk(
    "a different length redraws the result in place",
    W.st === "res" && W.o.yrs === 10 && ov().includes(money(Math.round(sgPay(20000, 7, 10))))
  );
  X("sign");
  X("sgset", "other", "for");
  X("sgset", "50000", "amt");
  X("sgset", null, null, { v: "idk" });
  X("sgset", "1", "yrs");
  o = ov();
  chk(
    "a payment that does not fit names what would have to give, never a flat no",
    o.includes("It fits only if about") &&
      o.includes("comes from somewhere else") &&
      o.includes("Some of this rests on a guess (the rate)") &&
      !/can't afford|cannot afford|too expensive|^no\b/i.test(o) &&
      !o.includes("var(--bad)")
  );
  X("sign");
  X("sgset", "home", "for");
  X("sgset", "5000", "amt");
  X("sgset", "10", "apr");
  X("sgset", "3", "yrs");
  chk(
    "enough cash: paying cash is priced too",
    sgCost(c, W.o).canCash && ov().includes("Paying cash costs no interest") && ov().includes("of cushion")
  );
  X("close");
  G.chars.length = n0;
  G.active = act0;
  G.demo = demo0;
  G.tourSeen = tour0;
  save();
  go("home");
}
