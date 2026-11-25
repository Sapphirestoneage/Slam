/* ============================================================================
   SLAM the Game, test: tests/dashboard-kit.js
   PURPOSE     Examine the dashboard kit (screens/dash.js) and the Time-Money dial: the reverse solver of
               the debt payoff, the goal math, both directions of the dial, the snap marks, the marks out
               of reach, and the sentence under the dial.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: screens/dash.js, features/debts.js (dbPlan, dbExtraFor).
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    demo0 = G.demo,
    R = r => Object.assign({ s: true }, r),
    a = Object.assign(newChar(), {
      name: "Dial",
      led: true,
      placed: true,
      age: 29,
      ret: 60,
      take: 5200,
      spend: 3800,
      inv: 8000,
      work: "Established",
      incs: [R({ k: "A main job", amt: 5200 })],
      spends: [R({ k: "Home", amt: 2200 }), R({ k: "Food", amt: 1600 })],
      cashes: [R({ k: "Checking", amt: 4000 })],
      invs: [R({ k: "Retirement plan at work", amt: 8000 })],
      debts: [
        R({ k: "Credit card balance", amt: 6000, high: true, apr: "15% to 25%", rate: 22, pay: 180 }),
        R({ k: "Car loan", amt: 9000, high: false, apr: "Under 8%", rate: 6, pay: 300 }),
      ],
    });
  a.debtKinds = a.debts.map(x => x.k);
  G.demo = false;
  G.chars.push(a);
  G.active = n0;
  syncAll(a);
  save();
  const c = C();

  /* the math */
  const base = dbPlan(c, "avalanche", 0);
  chk(
    "the payoff run keeps the balance month by month",
    base.series.length === base.months + 1 &&
      Math.abs(base.series[0] - 15000) < 1 &&
      base.series[base.series.length - 1] === 0
  );
  const want = Math.round(base.months / 2),
    r = dbExtraFor(c, "avalanche", want);
  chk(
    "reverse: the smallest whole-dollar extra that clears it by the date",
    r && dbPlan(c, "avalanche", r.extra).months <= want && dbPlan(c, "avalanche", r.extra - 1).months > want,
    r
  );
  chk("reverse: no extra needed at the current pace", dbExtraFor(c, "avalanche", base.months).extra === 0);
  chk(
    "goal forward and reverse agree",
    goalFwd(6000, 200, 300).months === 12 && goalExtraFor(6000, 200, 12).extra === 300
  );

  /* the dial */
  const free = 600;
  let h = timeMoneyDial(tmdDebtSpec(c, "avalanche", free, null));
  chk(
    "the dial draws two tracks, marks, the sentence and the chart, with no defect",
    h.includes("Done in") && h.includes("Extra each month") && h.includes("tmdmk") && h.includes("dkchart") && clean(h),
    junk(h)
  );
  chk(
    "at no extra, it says the current pace",
    tmdText("debt") === "At your current pace you're done in " + dkMonth(base.months) + "."
  );
  let st = tmdSet("debt", "m", 250);
  const f250 = dbPlan(c, "avalanche", 250);
  chk(
    "money moves time: +$250 gives the run's date and interest",
    st.months === f250.months && Math.abs(st.interest - f250.interest) < 1e-9
  );
  chk(
    "the sentence: pay more, done in, sooner, saving interest",
    tmdText("debt") ===
      `Pay $250 more a month and you're done in ${dkMonth(f250.months)}, ${base.months - f250.months} months sooner, saving ${money(base.interest - f250.interest)} in interest.`,
    tmdText("debt")
  );
  st = tmdSet("debt", "t", 12);
  chk(
    "time moves money: done in 12 months asks for the solver's extra",
    st.extra === dbExtraFor(c, "avalanche", 12).extra && st.months <= 12
  );
  chk(
    "over the free-to-spend: the trade-off is said, not a no",
    st.extra > free && tmdText("debt").includes("more than your free-to-spend")
  );
  const M = tmdMarks(TMD.debt);
  chk(
    "the time marks include the current pace and keep in order",
    M.T.some(m => m.l === "Current pace") && M.T.every((m, i) => !i || m.pos >= M.T[i - 1].pos)
  );
  const overlap = list =>
    list.some((m, i) =>
      list.some(
        (k, j) =>
          j !== i && k.row === m.row && !(tmdSpan(m)[1] + 8 <= tmdSpan(k)[0] || tmdSpan(k)[1] + 8 <= tmdSpan(m)[0])
      )
    );
  chk("no two mark labels overlap on the same row of a 300px track", !overlap(M.T) && !overlap(M.X));
  chk(
    "with two rows, the year marks and All free fit",
    M.T.some(m => m.l === "1 yr") && M.X.some(m => m.l === "All free"),
    [M.T.map(m => m.l), M.X.map(m => m.l)]
  );
  chk(
    "a mark out of reach is faded with its trade-off",
    timeMoneyDial(tmdDebtSpec(c, "avalanche", free, null)).includes("tmdmk") &&
      M.T.some(m => tmdMarkWhy(TMD.debt, m).startsWith("needs "))
  );
  X("tmdmark", "m:100", "debt");
  chk("a tap on a mark sets the dial", TMD.debt.st.extra === 100);
  chk(
    "the dial keeps its place when the screen draws again",
    (timeMoneyDial(tmdDebtSpec(c, "avalanche", free, null)), TMD.debt.st.extra === 100)
  );

  /* the other kit pieces */
  const k =
    dkStatRow([dkTile("Net worth", money(1000), { sub: "Close", spark: [1, 3, 2, 5] }), dkTile("Free", "$10")]) +
    dkBars(
      [
        { l: "Oct", v: [10, 8] },
        { l: "Nov", v: [12, 9] },
      ],
      ["In", "Out"]
    ) +
    dkDonut([
      { l: "Home", v: 2 },
      { l: "Food", v: 1 },
    ]) +
    dkProgress(40, { text: "$400 of $1,000" }) +
    dkDayStrip([
      { d: "Mon 3", on: true },
      { d: "Fri 7", mark: "Payday" },
    ]) +
    dkPill("Due Fri");
  chk("the kit pieces draw with no defect and no red", clean(k) && !/red|#f00|bad\)/i.test(k), junk(k));

  G.chars.splice(n0);
  G.active = act0;
  G.demo = demo0;
  save();
}
