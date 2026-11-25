/* ============================================================================
   SLAM the Game: features/coast.js
   PURPOSE     Two things about freedom. (1) The FI ratio on Key numbers: what the investments can pay
               each month, next to what the player spends each month. (2) "You can stop sprinting": a
               calm card on Home, one time, on the day the invested money reaches the Coast number.
   INPUT       The profile: c.inv, c.spend, c.age, c.ret, c.spends, c.invs, c.x.coast (seen: the day the
               player closed the card). derive(c): d.coastNum, d.g[7], d.toRet.
   OUTPUT      Functions: firCalc, knMetricsFir, cstCalc, homeCoastCard, cstBook. Actions (ACT): coastok.
               Parts of functions in other files: knMetricsFir (knMetrics in metrics.js), homeCoastCard
               (home in ui.js).
   DEPENDS ON  core/engine.js (derive, SWR, todayISO), core/metrics.js (knRows, knSt, knPct),
               screens/ui.js, features/kit.js, features/reveal.js (homeRowAdd).
   RULES       No new math for the Coast number: derive() works it out (d.coastNum), and d.g[7] says if
               it is reached. The investment income is the invested money times the withdrawal rate of
               the game (SWR), the same rate as the freedom number, so 100% is the same finish line.
               The card does not show on a Guess: a number that is a guess gets no verdict. The card
               shows one time. The player closes it with one tap.
   ========================================================================= */
/* The FI ratio: the investment income of a month divided by the spending of a month. */
function firCalc(c) {
  const inv = c.inv || 0,
    spend = c.spend || 0,
    income = (inv * SWR) / 12;
  return {
    inv,
    spend,
    income,
    ratio: spend > 0 ? income / spend : null,
    st: knSt(knRows(c).sp, c.invs || []),
  };
}
/* Part of knMetrics() in metrics.js. Adds the FI ratio to the group "Freedom". */
function knMetricsFir(c, add) {
  try {
    const F = firCalc(c),
      r = F.ratio;
    add({
      id: "firatio",
      g: "free",
      n: "FI ratio",
      what: "How much of your monthly spending your investments could pay for, if you started to draw on them today.",
      num: r,
      val: r == null ? "?" : knPct(Math.min(r, 9.99)),
      st: F.st,
      zone:
        r == null
          ? null
          : r >= 1
            ? ["Your investments could pay for all of it", "good"]
            : ["Part of each month is already paid for", "none"],
      bar: r == null ? null : { p: Math.min(1, r) * 100, marks: [] },
      rule: [
        "Investment income here is what your investments can pay each year at " +
          Math.round(SWR * 100) +
          "%, the same rate as your freedom number. At 100% work is optional.",
      ],
      math: [
        "Invested: " + money(F.inv),
        money(F.inv) + " × " + Math.round(SWR * 100) + "% ÷ 12 = " + money(Math.round(F.income)) + " a month",
        "Spending: " + money(F.spend) + " a month",
        r == null ? null : money(Math.round(F.income)) + " ÷ " + money(F.spend) + " = " + knPct(r),
      ],
      go: ["See the big picture", "tab", "map"],
    });
  } catch (e) {
    report(e, "coast.js: knMetricsFir");
  }
}
/* The Coast card: is the Coast number reached, is the number real, and did the player close the card. */
function cstCalc(c, d) {
  d = d || derive(c);
  const st = knSt(knRows(c).sp, c.invs || []),
    seen = (c.x && c.x.coast && c.x.coast.seen) || null,
    reached = d.coastNum > 0 && d.toRet > 0 && !!d.g[7];
  return {
    coast: d.coastNum,
    inv: c.inv || 0,
    ret: c.ret,
    st,
    reached,
    seen,
    show: reached && !seen && st !== "Guess",
  };
}
/* Part of home() in ui.js. The calm card "You can stop sprinting", one time, under the top numbers. */
function homeCoastCard(h) {
  try {
    const c = C();
    if (!c || !(c.placed || G.demo) || typeof homeRowAdd !== "function") return h;
    const K = cstCalc(c);
    if (!K.show) return h;
    return homeRowAdd(
      h,
      `<div class="card stack coastcard" style="gap:8px"><div class="row between"><b>You can stop sprinting</b>${kitPill(K.st)}</div><div class="small">What you have invested can grow to your freedom number by age ${esc(String(K.ret))} with nothing more added. From here, saving is a choice about how soon, not a race.</div><details class="math"><summary>Show the math</summary><div class="inner tiny stack" style="gap:4px"><div>Invested: ${money(K.inv)}</div><div>Your Coast number for age ${esc(String(K.ret))}: ${money(Math.round(K.coast))}</div><div>${money(K.inv)} is at or over ${money(Math.round(K.coast))}.</div><div>This holds while your invested money stays at or over the Coast number.</div></div></details><button class="primary slim" data-a="coastok">Got it</button></div>`
    );
  } catch (e) {
    report(e, "coast.js: homeCoastCard");
    return h;
  }
}
/* The rows for the spreadsheet of the plan. */
function cstBook(c) {
  const F = firCalc(c),
    d = derive(c);
  return {
    title: "FI ratio and Coast",
    rows: [
      { id: "fr_inv", label: "Invested", v: F.inv, note: "Your number" },
      { id: "fr_rate", label: "Withdrawal rate of the game", v: SWR, note: "The same rate as the freedom number" },
      { id: "fr_income", label: "Investment income a month", v: F.income, f: "={fr_inv}*{fr_rate}/12" },
      { id: "fr_spend", label: "Spending a month", v: F.spend, note: "Your number" },
      { id: "fr_ratio", label: "FI ratio", v: F.ratio == null ? "" : F.ratio, f: F.ratio == null ? "" : "={fr_income}/{fr_spend}" },
      { id: "fr_coast", label: "Coast number", v: d.coastNum, note: "From the game: the freedom number at your stop age, brought back to today" },
      { id: "fr_over", label: "Invested less the Coast number", v: F.inv - d.coastNum, f: "={fr_inv}-{fr_coast}" },
    ],
  };
}
Object.assign(ACT, {
  coastok: () => {
    const c = C();
    kitStore(c, "coast").seen = todayISO();
    save();
    render();
  },
});
