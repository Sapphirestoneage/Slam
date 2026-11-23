/* ============================================================================
   SLAM the Game, test: tests/taking-money-out.js
   PURPOSE     Examine "Taking money out": the order by the cost of one dollar, the guardrails, the four
               paths before 59 and a half (with the Roth ladder and the 72(t) payment), the cost of health
               cover until 65 under both rules, the sheet, the spreadsheet rows, the built row and the
               links from the skills.
   INPUT       The game scripts, loaded by harness.cjs. Two sample profiles.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/takeout.js, data/takeout2026.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    R0 = r => Object.assign({ s: true }, r),
    near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1e-6 : t),
    a = Object.assign(newChar(), {
      name: "Tko",
      led: true,
      placed: true,
      age: 45,
      ret: 50,
      take: 8000,
      spend: 4000,
      inv: 900000,
      incs: [R0({ k: "A main job", amt: 8000 })],
      spends: [R0({ k: "Home", amt: 2000 }), R0({ k: "Food", amt: 2000 })],
      cashes: [R0({ k: "Checking", amt: 20000 })],
      invs: [
        R0({ k: "Retirement plan at work", amt: 700000 }),
        R0({ k: "IRA or Roth IRA", amt: 100000 }),
        R0({ k: "Other investments", amt: 100000 }),
      ],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  go("home");
  const c = C(),
    P = tkoInputs(c);
  /* ---------- the numbers come from the profile ---------- */
  chk(
    "the piles come from the accounts: cash, regular (60% basis), Roth split in half as a Guess, pre-tax",
    P.piles.cash === 20000 &&
      P.piles.tax === 100000 &&
      P.piles.taxBasis === 60000 &&
      P.piles.rothBasis === 50000 &&
      P.piles.rothEarn === 50000 &&
      P.piles.pre === 700000 &&
      P.spend === 48000 &&
      P.save === 48000 &&
      P.stop === 50 &&
      P.st === "Guess",
    JSON.stringify(P.piles)
  );
  /* ---------- the order ---------- */
  const O = tkoOrder(c, P.spend),
    T = retireTax(P.gross, P.pre, P.filing, P.state, c.age),
    preRate = T.top + 0.1;
  chk(
    "the order is the cheapest dollar first",
    O.tiers.map(t => t.id).join() === "cash,rothBasis,taxable,pretax,rothEarn" &&
      O.tiers[0].rate === 0 &&
      O.tiers[1].rate === 0 &&
      near(O.tiers[2].rate, 0.4 * 0.15) &&
      near(O.tiers[3].rate, preRate) &&
      near(O.tiers[4].rate, preRate),
    JSON.stringify(O.tiers.map(t => [t.id, t.rate]))
  );
  chk(
    "reachable after tax: all of it less each pile at its rate",
    near(O.reach, 920000) && near(O.net, 920000 - 100000 * 0.06 - 750000 * preRate, 1e-3),
    O.net
  );
  chk(
    "one year of spending comes from cash, then Roth deposits, at no tax",
    O.pulls.length === 2 && O.pulls[0].amt === 20000 && O.pulls[1].amt === 28000 && O.pullCost === 0 && O.short === 0
  );
  const big = tkoOrder(c, 300000);
  chk(
    "a larger amount reaches into taxed money and adds up its cost",
    big.pulls.length === 4 && near(big.pullCost, 100000 * 0.06 + 130000 * preRate, 1e-3) && big.short === 0,
    big.pullCost
  );
  c.age = 60;
  chk(
    "from 59 and a half, Roth growth is free and the 10% is gone",
    (() => {
      const o = tkoOrder(c, 1000),
        e = o.tiers.find(t => t.id === "rothEarn"),
        p = o.tiers.find(t => t.id === "pretax");
      return e.rate === 0 && !o.under && near(p.rate, o.top);
    })()
  );
  c.age = 45;
  /* ---------- the growth to the stop age, and the guardrails ---------- */
  const at = tkoGrow(P, 50);
  let tx = 100000;
  for (let i = 0; i < 5; i++) tx = tx * 1.07 + 48000;
  chk(
    "to the stop age: invested piles grow, savings go to a regular account, cash and Roth deposits stay",
    near(at.pre, 700000 * Math.pow(1.07, 5), 1e-3) &&
      near(at.tax, tx, 1e-3) &&
      near(at.taxBasis, 60000 + 5 * 48000) &&
      at.cash === 20000 &&
      at.rothBasis === 50000
  );
  const g = tkoGuard(c),
    bal = at.tax + at.rothBasis + at.rothEarn + at.pre;
  chk(
    "guardrails: the rate, the two lines and the two steps of 10%",
    near(g.bal, bal, 1e-3) &&
      near(g.rate, 48000 / bal) &&
      near(g.cutAt, bal / 1.2, 1e-3) &&
      near(g.raiseAt, bal / 0.8, 1e-3) &&
      near(g.cutTo, 43200) &&
      near(g.raiseTo, 52800) &&
      near(g.safe, bal * 0.05, 1)
  );
  /* ---------- before 59 and a half ---------- */
  const B = tkoBridge(c),
    path = id => B.paths.find(p => p.id === id);
  chk(
    "the years to cover and what is reachable at the stop age",
    B.yrs === 9.5 && B.need === 9.5 * 48000 && near(B.have, 20000 + tx + 50000, 1e-3) && B.gap === 0 && B.needed
  );
  chk(
    "four paths, 10 rows each, and the Rule of 55 does not fit a stop at 50",
    B.paths.length === 4 &&
      path("bridge").rows.length === 10 &&
      !path("rule55").ok &&
      path("rule55").why.includes("55") &&
      path("bridge").state === "covers" &&
      path("bridge").short === 0
  );
  const lad = path("ladder");
  chk(
    "the Roth ladder converts one year of spending each year and pays income tax on it (and gains tax on what it sells)",
    lad.ok &&
      lad.rows.every(r => r.conv === 48000) &&
      near(lad.rows[0].tax, tkoOrdTax(P, 48000).tax) &&
      lad.rows[0].tax > 0 &&
      lad.tax >= 10 * lad.rows[0].tax &&
      lad.preLeft < at.pre * Math.pow(1.07, 10),
    lad.tax
  );
  const m = 0.05 / 12,
    N = Math.round(36.2 * 12),
    sepp = ((100000 * m) / (1 - Math.pow(1 + m, -N))) * 12;
  chk(
    "the 72(t) payment: a level payment at 5% over the IRS life expectancy at 50",
    near(tkoSepp(100000, 50), sepp) && sepp > 5900 && sepp < 6100,
    sepp
  );
  chk(
    "the 72(t) path pays that amount from the pre-tax money each year",
    near(path("sepp").sepp, tkoSepp(at.pre, 50)) && path("sepp").rows[0].fromPre > 0
  );
  chk("the best path covers each year at the least tax", B.best && B.best.id === "bridge" && B.best.tax === 0);
  /* a player with almost all money in the plan at work, who stops at 56 */
  const b = Object.assign(newChar(), {
    name: "Trap",
    led: true,
    placed: true,
    age: 56,
    ret: 56,
    take: 5000,
    spend: 5000,
    inv: 1500000,
    incs: [R0({ k: "A main job", amt: 5000 })],
    spends: [R0({ k: "Home", amt: 5000 })],
    cashes: [R0({ k: "Checking", amt: 30000 })],
    invs: [R0({ k: "Retirement plan at work", amt: 1500000 })],
    debts: [],
  });
  G.chars.push(b);
  syncAll(b);
  const B2 = tkoBridge(b),
    p2 = id => B2.paths.find(p => p.id === id);
  chk(
    "with the money in the plan at work: bridge accounts are short, and the 10% to fill it early shows",
    p2("bridge").state === "short" &&
      near(p2("bridge").short, 4 * 60000 - 30000, 1e-3) &&
      near(p2("bridge").penalty, p2("bridge").short * 0.1) &&
      p2("bridge").shortAges[0] === 56 &&
      near(B2.gap, 3.5 * 60000 - 30000)
  );
  chk(
    "the ladder is short too (5 years of wait), the Rule of 55 pays each year with tax, and the 72(t) payment covers",
    p2("ladder").state === "short" &&
      p2("rule55").ok &&
      p2("rule55").state !== "short" &&
      p2("rule55").tax > 0 &&
      p2("sepp").state === "covers" &&
      B2.best.id === "sepp",
    B2.paths.map(p => p.id + ":" + p.state).join()
  );
  chk(
    "a stop age of 60 or later needs no bridge",
    (() => {
      b.ret = 62;
      b.age = 58;
      const z = tkoBridge(b);
      b.age = 56;
      b.ret = 56;
      return !z.needed && z.yrs === 0 && z.need === 0;
    })()
  );
  /* ---------- health cover until 65 ---------- */
  const one = tkoPremium(30000, 1, 7200, true);
  chk(
    "the premium after the credit: a share of income below the line",
    near(one.fpl, 15650) && near(one.line, 62600) && near(one.pay, 30000 * 0.0493) && !one.over && near(one.room, 32600)
  );
  chk(
    "above the line: the full price with the rule, 8.5% of income without it, never more than the full price",
    tkoPremium(70000, 1, 7200, true).pay === 7200 &&
      near(tkoPremium(70000, 1, 7200, false).pay, 5950) &&
      tkoPremium(200000, 1, 7200, false).pay === 7200 &&
      near(tkoPremium(70000, 2, 7200, true).fpl, 21150)
  );
  kitStore(c, "tko").conv = { v: 40000, cf: 2 };
  kitStore(c, "tko").other = { v: 40000, cf: 2 };
  const A = tkoAca(c),
    t80 = tkoOrdTax(P, 80000).tax,
    t40 = tkoOrdTax(P, 40000).tax;
  chk(
    "15 years from 50 to 65: tax and premiums with a conversion, next to none, under both rules",
    A.years === 15 &&
      A.w.rows[0].magi === 80000 &&
      A.w.rows[0].over &&
      near(A.w.tax, 15 * t80, 1e-3) &&
      near(A.w.on, 15 * 7200) &&
      near(A.w.off, 15 * 80000 * 0.085) &&
      near(A.base.on, 15 * 40000 * 0.0824, 1e-3) &&
      near(A.extraOn, 15 * (t80 - t40) + 15 * 7200 - 15 * 40000 * 0.0824, 1e-2) &&
      A.low === Math.min(A.w.totalOn, A.w.totalOff) &&
      A.high === Math.max(A.w.totalOn, A.w.totalOff) &&
      A.overYears === 15 &&
      near(A.room, 22600),
    JSON.stringify([A.w.tax, A.w.on, A.w.off, A.extraOn])
  );
  /* ---------- the sheet ---------- */
  const tabs = {
    order: "Cheapest dollar first",
    guard: "Lower guardrail",
    bridge: "Four ways to cover those years",
    aca: "If the credit stops at the line",
  };
  Object.keys(tabs).forEach(t => {
    X("takeout", t);
    chk(
      "the tab " + t + " opens, is clean, and has no typing field",
      W.kind === "takeout" &&
        W.tab === t &&
        ov().includes(tabs[t]) &&
        clean(ov()) &&
        !/<input|<textarea|<select/.test(ov()) &&
        ov().includes("Show the math"),
      junk(ov())
    );
    chk(
      "the tab " + t + " has an i on its labels and no em dash",
      (ov().match(/data-k="term:tko_/g) || []).length >= 2 && !ov().includes("\u2014")
    );
  });
  chk(
    "Back, Forward, Close and the i of the screen",
    NV_INFO.takeout && NV_INFO.takeout[0] === "Taking money out" && ov().includes("navback")
  );
  X("tkotab", "bridge");
  X("kitset", "1", "tko|roth", { t: "n" });
  chk(
    "one tap on a chip changes the Roth deposits, as Close",
    tkoInputs(c).piles.rothBasis === 100000 &&
      tkoInputs(c).piles.rothEarn === 0 &&
      c.x.tko.roth.cf === 2 &&
      W.tab === "bridge"
  );
  X("kitsure", "3", "tko|roth", { t: "n", f: "0.5" });
  chk("Guess, Close, Exact is kept", c.x.tko.roth.cf === 3);
  X("ages");
  chk("the bridge tab links to the two ages", W.kind === "ages");
  /* ---------- the spreadsheet, the built list, the skills ---------- */
  const rows = tkoBook(c).rows,
    v = id => rows.find(r => r.id === id).v;
  chk(
    "the spreadsheet rows agree with the game",
    near(v("tk_rate"), v("tk_need") / v("tk_bal")) &&
      near(v("tk_cut"), v("tk_bal") / 1.2) &&
      v("tk_yrs") === 9.5 &&
      v("tk_bneed") === 456000 &&
      v("tk_gap") === 0 &&
      v("tk_fpl") === 15650 &&
      v("tk_line") === 62600 &&
      BOOK_PARTS.includes(tkoBook)
  );
  const row = btRows().find(r => r.n.startsWith("Taking money out"));
  chk("the built list: built, with the action", row && row.st === "b" && row.a === "takeout");
  const links = [];
  ["withdrawal-decumulation", "pre-retirement-design"].forEach(t =>
    SKILLS[t].skills.forEach((s, i) => {
      const L = cxLink(t, i);
      if (L && L.a === "takeout") links.push(t + ":" + i + ">" + L.v);
    })
  );
  chk(
    "real skills link to each tab of the sheet",
    ["order", "guard", "bridge", "aca"].every(k => links.some(l => l.endsWith(">" + k))) &&
      links.includes("withdrawal-decumulation:11>bridge"),
    links.join()
  );
  X("skill", "withdrawal-decumulation:11");
  X("cxdo", "bridge", "takeout");
  chk(
    "the link on the skill opens the Roth ladder tab",
    W.kind === "takeout" && (W.tab === "bridge" || ov().includes("Four ways")),
    W && W.kind + " " + W.tab
  );
  chk(
    "the menu has it",
    MENU.some(x => x[1] === "takeout")
  );
  chk("no error was recorded", ERRLOG.length === 0, JSON.stringify(ERRLOG.slice(-1)));
  X("close");
  G.chars.length = n0;
  G.active = 0;
  save();
}
