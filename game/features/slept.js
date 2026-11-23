/* ============================================================================
   SLAM the Game: features/slept.js
   PURPOSE     While you slept. What the invested money of the player earned per hour, per day, per month
               and per year, at the return of the plan, next to the real hourly wage of the player. The
               crossover (the money earns more in an hour than the job) gets a celebration. A slim line
               on Home, once invested assets pass $1,000. When high-interest debt exists, its cost per
               day shows next to it, gently.
   INPUT       The profile: c.inv, c.debts, c.hrs, c.x.paths.ret (the return of the plan, when the
               player picked one). The open sheet (W.kind): slept.
   OUTPUT      Functions: sleptRate, sleptCalc, homeSleptRow, sleptSheet, sleptBook. Actions (ACT):
               slept. Parts of functions in other files: homeSleptRow (home in ui.js).
   DEPENDS ON  core/engine.js (timeLedger), screens/ui.js, features/reveal.js (homeRowAdd),
               features/kit.js.
   RULES       The return is the return of the plan (7% a year after inflation unless the player chose
               another in the two paths). It is an average, not a promise, and the screen says so. Debt
               cost is a meter, not a verdict.
   ========================================================================= */
const SLEPT_MIN = 1000;
/* The yearly return of the plan: the choice in the two paths, or the game's 7%. */
function sleptRate(c) {
  const v = c.x && c.x.paths && c.x.paths.ret && c.x.paths.ret.v;
  return v > 0 ? v : R;
}
function sleptCalc(c) {
  const d = derive(c),
    tl = timeLedger(c, d),
    r = sleptRate(c),
    year = (c.inv || 0) * r,
    hiYear = c.led
      ? (c.debts || []).filter(x => x.high && x.amt > 0).reduce((a, x) => a + (x.amt * debtRate(x).r) / 100, 0)
      : c.high === "yes"
        ? c.debt * 0.22
        : 0;
  return {
    r,
    hour: year / 8760,
    day: year / 365,
    month: year / 12,
    year,
    wage: tl.wage,
    cross: tl.wage > 0 && year / 8760 >= tl.wage,
    crossInv: tl.wage > 0 ? (tl.wage * 8760) / r : null,
    debtDay: hiYear / 365,
    st: kitState([kitSharp(c, "inv")]),
    wageSt: tl.rw ? "Close" : "Guess",
  };
}
/* Part of home() in ui.js. One slim line under the top numbers, once invested money passes $1,000. */
function homeSleptRow(h) {
  try {
    const c = C();
    if (!c || !(c.placed || G.demo) || !((c.inv || 0) > SLEPT_MIN) || typeof homeRowAdd !== "function") return h;
    const S = sleptCalc(c);
    return homeRowAdd(
      h,
      `<button class="rowbtn bare homerow sleptrow" data-a="slept"><span class="small">Your money earned <b class="${S.st === "Guess" ? "guess" : ""}">${cents(S.day * (8 / 24))}</b> while you slept${S.cross ? " · crossover ✓" : ""}</span><span class="caret">›</span></button>`
    );
  } catch (e) {
    report(e, "slept.js: homeSleptRow");
    return h;
  }
}
function sleptBook(c) {
  const S = sleptCalc(c);
  return {
    title: "While you slept",
    rows: [
      { id: "sl_inv", label: "Invested", v: c.inv || 0 },
      { id: "sl_ret", label: "Return a year (the plan)", v: S.r },
      { id: "sl_year", label: "Earned a year", v: S.year, f: "={sl_inv}*{sl_ret}" },
      { id: "sl_month", label: "Earned a month", v: S.month, f: "={sl_year}/12" },
      { id: "sl_day", label: "Earned a day", v: S.day, f: "={sl_year}/365" },
      { id: "sl_hour", label: "Earned an hour", v: S.hour, f: "={sl_year}/8760" },
      { id: "sl_wage", label: "Your real hourly wage", v: S.wage, note: "From Your real hourly wage" },
      { id: "sl_cross", label: "Invested money for the crossover", v: S.crossInv || 0, f: "={sl_wage}*8760/{sl_ret}" },
    ],
  };
}
function sleptSheet() {
  const c = C(),
    S = sleptCalc(c),
    st = S.st;
  return (
    head("Plan", "While you slept") +
    `<div class="small muted">What your invested money earns at the plan's return of ${kitPct(S.r)} a year, while you work, rest and sleep.</div>` +
    `<div class="grid2">${kitTile("An hour", cents(S.hour), "", st)}${kitTile("A day", money(Math.round(S.day)), "", st)}${kitTile("A month", money(Math.round(S.month)), "", st)}${kitTile("A year", money(Math.round(S.year)), "", st)}</div>` +
    (S.wage > 0
      ? S.cross
        ? `<div class="levelup"><div class="eyebrow">Crossover</div><h2 class="glow" style="margin:6px 0">Your money out-earns your job</h2><div class="small">It earns ${cents(S.hour)} an hour. Your real hourly wage is ${cents(S.wage)}.</div></div>`
        : `<div class="tile small">Your real hourly wage is <b>${cents(S.wage)}</b> ${kitPill(S.wageSt)}. Your money earns <b>${cents(S.hour)}</b> an hour. The crossover comes at about <b>${money(Math.round(S.crossInv))}</b> invested.${bar(Math.min(100, (S.hour / S.wage) * 100))}</div>`
      : `<div class="tile small">You are not working for pay now, so there is no hourly wage to set it next to.</div>`) +
    (S.debtDay > 0.5
      ? `<div class="tile small muted">High-interest debt costs about <b>${money(Math.round(S.debtDay))}</b> a day. Each extra payment slows that meter down.</div>`
      : "") +
    mathBox([
      money(c.inv || 0) + " invested × " + kitPct(S.r) + " a year = " + money(Math.round(S.year)) + " a year.",
      "A month: ÷ 12. A day: ÷ 365. An hour: ÷ 8,760 (the hours in a year).",
      S.wage > 0 ? "The crossover: your real hourly wage × 8,760 ÷ " + kitPct(S.r) + "." : null,
      S.debtDay > 0 ? "Debt a day: each high-interest balance × its rate, added up, ÷ 365." : null,
      "The return is a long-run average after inflation, not a promise.",
    ]) +
    `<button class="ghost wide slim" data-a="hrs">Make my hourly wage real</button>`
  );
}
kitScreen(
  "slept",
  "While you slept",
  "What your invested money earns each hour, day, month and year.",
  "It sits next to your real hourly wage."
);
Object.assign(ACT, {
  slept: () => {
    W = { kind: "slept", o: {} };
    sheet(sleptSheet);
  },
});
