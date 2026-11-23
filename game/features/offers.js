/* ============================================================================
   SLAM the Game: features/offers.js
   PURPOSE     Two job offers side by side. For each offer: the take-home pay from the tax tables, the
               match, the stock, less the health premiums and the commute. Then what one year is worth,
               what one hour is worth (the hours include the commute and leave out the days off), and
               the one part that makes the most difference between the two.
   INPUT       The profile: the tax view answers (filing status, state, pre-tax contributions, pay
               before taxes), c.age, c.x.offers (the answers, with the keys "a_..." and "b_..."). The
               open sheet (W.kind): offers.
   OUTPUT      Functions: offerInputs, offerPrice, offerCalc, offerBook, offerSheet. Actions (ACT):
               offers, offerstab. Menu: "Two job offers".
   DEPENDS ON  core/engine.js, screens/ui.js, features/taxview.js (taxvCalc, taxvInputs), features/kit.js.
   RULES       The math is the offer compare of the older tool (engines/offers.js). Offer A starts as
               the job of the player. The take-home pay of each offer comes from the same tax tables as
               the tax view, with the filing status and the state of the player. The match counts as
               money a year, on the assumption that the player puts in enough to get all of it. Stock is
               the careful guess of the player, in dollars a year. No offer is called better: the screen
               shows the gap and what makes it. All amounts are in today's dollars.
   ========================================================================= */
const OFFER_WEEKS = 52;
const OFFER_HOURS = 40;
const OFFER_DAYS = 5;
const OFFER_PARTS = [
  ["net", "take-home pay"],
  ["match", "the match"],
  ["stock", "the stock"],
  ["health", "the health premiums"],
  ["commute", "the cost of the commute"],
];
const OFFER_Q = [
  ["base", "Pay before taxes, a year", "offbase"],
  ["bonus", "Bonus, a year", "offbonus"],
  ["match", "The match, as a percent of pay", "offmatch"],
  ["stock", "Stock, a year (your careful guess)", "offstock"],
  ["health", "Health premium you pay, a month", "offhealth"],
  ["commute", "Commute cost, a month", "offcommute"],
  ["minutes", "Commute time, minutes a day", "offminutes"],
  ["remote", "Days a week from home", "offremote"],
  ["pto", "Paid days off, a year", "offpto"],
];
/* The answers for one offer ("a" or "b"). Offer A starts at the pay of the player, offer B 10% above it. */
function offerInputs(c, id) {
  const gross = taxvInputs(c).gross.v || 60000,
    base0 = id === "a" ? gross : Math.round((gross * 1.1) / 1000) * 1000,
    q = (k, fb) => kitValue(c, "offers", id + "_" + k, fb);
  return {
    base: q("base", base0),
    bonus: q("bonus", 0),
    match: q("match", id === "a" && (c.match === "yes" || c.match === "no") ? 3 : 0),
    stock: q("stock", 0),
    health: q("health", 150),
    commute: q("commute", 100),
    minutes: q("minutes", 40),
    remote: q("remote", 0),
    pto: q("pto", 15),
  };
}
/* ONE OFFER, priced for one year. */
function offerPrice(c, id) {
  const I = offerInputs(c, id),
    gross = I.base.v + I.bonus.v,
    T = taxvCalc(c, { gross }),
    match = (I.base.v * I.match.v) / 100,
    health = I.health.v * 12,
    commute = I.commute.v * 12,
    value = T.net + match + I.stock.v - health - commute,
    weeks = OFFER_WEEKS - I.pto.v / OFFER_DAYS,
    commuteHours = weeks * (I.minutes.v / 60) * (OFFER_DAYS - Math.min(OFFER_DAYS, I.remote.v)),
    hours = weeks * OFFER_HOURS + commuteHours;
  return {
    id,
    I,
    gross,
    net: T.net,
    rate: gross > 0 ? 1 - T.net / gross : 0,
    match,
    stock: I.stock.v,
    health,
    commute,
    value,
    hours,
    commuteHours,
    perHour: hours > 0 ? value / hours : 0,
    parts: { net: T.net, match, stock: I.stock.v, health: -health, commute: -commute },
    st: kitState(Object.keys(I).map(k => I[k])),
  };
}
/* THE TWO OFFERS: the gap a year, the gap an hour, and the part with the largest difference. */
function offerCalc(c) {
  const A = offerPrice(c, "a"),
    B = offerPrice(c, "b"),
    top = B.value > A.value ? B : A,
    low = top === A ? B : A;
  let decider = null;
  OFFER_PARTS.forEach(p => {
    const d = Math.abs(A.parts[p[0]] - B.parts[p[0]]);
    if (d > 0 && (!decider || d > decider.diff)) decider = { k: p[0], n: p[1], diff: d };
  });
  return {
    A,
    B,
    top: top.id,
    gap: top.value - low.value,
    gapHour: Math.abs(A.perHour - B.perHour),
    topHour: B.perHour > A.perHour ? "b" : "a",
    hoursGap: B.hours - A.hours,
    decider,
    st: kitState([
      { cf: A.st === "Guess" ? 1 : A.st === "Close" ? 2 : 3 },
      { cf: B.st === "Guess" ? 1 : B.st === "Close" ? 2 : 3 },
    ]),
  };
}
function offerBook(c) {
  const K = offerCalc(c),
    rows = [];
  [K.A, K.B].forEach(P => {
    const p = "of" + P.id + "_",
      n = "Offer " + P.id.toUpperCase() + ": ";
    rows.push(
      { id: p + "base", label: n + "pay before taxes", v: P.I.base.v, note: "Your answer" },
      { id: p + "bonus", label: n + "bonus", v: P.I.bonus.v, note: "Your answer" },
      { id: p + "net", label: n + "take-home pay", v: P.net, note: "Worked out by the game from the 2026 tax tables" },
      { id: p + "matchpct", label: n + "the match, percent of pay", v: P.I.match.v, note: "Your answer" },
      { id: p + "match", label: n + "the match, a year", v: P.match, f: "={" + p + "base}*{" + p + "matchpct}/100" },
      { id: p + "stock", label: n + "stock, a year", v: P.stock, note: "Your careful guess" },
      { id: p + "health", label: n + "health premium, a month", v: P.I.health.v, note: "Your answer" },
      { id: p + "commute", label: n + "commute cost, a month", v: P.I.commute.v, note: "Your answer" },
      {
        id: p + "value",
        label: n + "what a year is worth",
        v: P.value,
        f: "={" + p + "net}+{" + p + "match}+{" + p + "stock}-{" + p + "health}*12-{" + p + "commute}*12",
      },
      { id: p + "hours", label: n + "hours a year, with the commute", v: P.hours, note: "Worked out by the game" },
      { id: p + "hour", label: n + "what an hour is worth", v: P.perHour, f: "={" + p + "value}/{" + p + "hours}" }
    );
  });
  rows.push({
    id: "of_gap",
    label: "The gap between the offers, a year",
    v: K.B.value - K.A.value,
    f: "={ofb_value}-{ofa_value}",
  });
  return { title: "Two job offers", rows };
}
function offerSheet() {
  const c = C(),
    tab = (W && W.tab) || "a",
    K = offerCalc(c),
    name = id => "Offer " + id.toUpperCase(),
    col = P => ({
      title: name(P.id) + (P.id === "a" && !P.I.base.given ? " (your job now)" : ""),
      big: money(Math.round(P.value)),
      guess: P.st === "Guess",
      hot: K.gap > 0 && K.top === P.id,
      rows: [
        ["Take-home pay", money(Math.round(P.net))],
        [
          `The match<div class="tiny muted">Counted in full. It can vest over some years.</div>`,
          "+" + money(Math.round(P.match)),
        ],
        ["Stock", "+" + money(Math.round(P.stock))],
        ["Health premiums", "-" + money(Math.round(P.health))],
        ["Commute", "-" + money(Math.round(P.commute))],
        ["Hours a year", Math.round(P.hours).toLocaleString()],
        ["<b>One hour is worth</b>", "<b>" + cents(P.perHour) + "</b>"],
      ],
      foot: "A year, after tax. " + kitPct(P.rate, 0) + " of the pay goes to tax.",
    }),
    opts = {
      base: [40000, 60000, 80000, 100000, 130000, 170000, 220000].map(v => [v, money(v)]),
      bonus: [0, 2000, 5000, 10000, 20000].map(v => [v, money(v)]),
      match: [0, 3, 4, 5, 6].map(v => [v, v ? v + "%" : "No match"]),
      stock: [0, 5000, 10000, 25000, 50000].map(v => [v, money(v)]),
      health: [0, 100, 150, 300, 500, 800].map(v => [v, money(v)]),
      commute: [0, 50, 100, 200, 400].map(v => [v, money(v)]),
      minutes: [0, 20, 40, 60, 90, 120].map(v => [v, v ? v + " min" : "None"]),
      remote: [0, 1, 2, 3, 5].map(v => [v, v === 5 ? "All 5" : v + (v === 1 ? " day" : " days")]),
      pto: [10, 15, 20, 25, 30].map(v => [v, v + " days"]),
    },
    I = K[tab.toUpperCase()].I;
  let h =
    head("Plan", "Two job offers") +
    `<div class="row between small" style="gap:8px"><span>What one year of each offer is worth ${kitInfo("offvalue")}</span>${kitPill(K.st)}</div>` +
    kitColumns([col(K.A), col(K.B)]);
  h += `<div class="small offvest">The match counts in full here. A match often vests ${kitInfo("offvest")} over some years. If you leave before it vests, you keep less of it.</div>`;
  h +=
    K.gap >= 1
      ? `<div class="tile small">If these assumptions hold, ${name(K.top)} is ahead by <b>${money(Math.round(K.gap))}</b> a year.${K.decider ? " The largest difference is " + esc(K.decider.n) + ": " + money(Math.round(K.decider.diff)) + " a year." : ""} By the hour ${kitInfo("offhour")}, ${name(K.topHour)} is ahead by ${cents(K.gapHour)}${K.topHour !== K.top ? ", because it takes fewer hours" : ""}.</div>`
      : `<div class="tile small">The two offers are worth the same a year. Change the answers of offer B below.</div>`;
  if (Math.abs(K.hoursGap) >= 1)
    h += `<div class="small">Offer B takes ${Math.round(Math.abs(K.hoursGap)).toLocaleString()} ${K.hoursGap > 0 ? "more" : "fewer"} hours a year than offer A, with the commute and the days off.</div>`;
  h += kitTabs("offerstab", tab, [
    ["a", "Answers for offer A"],
    ["b", "Answers for offer B"],
  ]);
  OFFER_Q.forEach(q => {
    h += kitAsk(c, "offers", tab + "_" + q[0], q[1], opts[q[0]], I[q[0]].v, {
      term: q[2],
      typed: q[0] === "base" || q[0] === "bonus" || q[0] === "stock",
    });
  });
  h += mathBox([
    "Take-home pay: pay before taxes plus the bonus, less federal tax, payroll tax and state tax, from the 2026 tables of the tax view, with your filing status, your state and your pre-tax contributions.",
    "What a year is worth: take-home pay + the match + stock - 12 × the health premium - 12 × the commute cost.",
    "The match: the percent × pay before taxes. It counts in full, on the assumption that you put in enough to get all of it.",
    "Vesting: the match counts in full. A match often vests over some years. If you leave before it vests, you keep less of it. Check the vesting schedule of each offer.",
    "Hours a year: (52 weeks - days off ÷ 5) × (40 hours + the commute on the days you go in).",
    "What an hour is worth: what a year is worth ÷ the hours a year.",
    "Not counted: the deductible of the health plan, how sure the stock is, and how you would like the work. Those are yours to weigh.",
  ]);
  h += `<div class="row" style="gap:8px"><button class="ghost" style="flex:1" data-a="simopen" data-v="job">A new job over the years</button><button class="ghost" style="flex:1" data-a="taxv">Your tax view</button></div>`;
  return h;
}
kitTerms({
  offvalue: [
    "What a year is worth",
    "Take-home pay, plus the match and the stock, less the health premiums and the commute. It is one year of the offer in dollars you can use.",
  ],
  offhour: [
    "What an hour is worth",
    "What a year is worth, divided by the hours the job takes in a year, with the commute. An offer with more pay can be worth less an hour.",
  ],
  offbase: ["Pay before taxes", "The yearly salary in the offer letter, before tax and anything else comes out."],
  offbonus: ["Bonus", "Extra pay in a normal year. Count only what you would plan on."],
  offmatch: [
    "The match",
    "Money the job adds to your retirement plan when you put money in. 4% means the job adds up to 4% of your pay.",
  ],
  offvest: [
    "Vesting",
    "The wait before money your job gave you is fully yours. A match can vest a part each year, or all at one time after some years. Your own contributions are always yours.",
  ],
  offstock: [
    "Stock",
    "Shares or options the job gives you, as dollars a year. Use a careful guess: stock of a private company can be worth nothing.",
  ],
  offhealth: ["Health premium", "What comes out of your pay each month for health insurance."],
  offcommute: ["Commute cost", "Gas, parking, tolls or transit, each month."],
  offminutes: ["Commute time", "Minutes on the road each day you go in, both ways together."],
  offremote: ["Days from home", "Days a week with no commute."],
  offpto: ["Paid days off", "Vacation and personal days a year. More days off means fewer hours for the same pay."],
});
kitScreen(
  "offers",
  "Two job offers",
  "Two offers side by side: what a year and an hour of each are worth after tax.",
  "It adds the match and the stock, and takes off the health premiums and the commute."
);
Object.assign(ACT, {
  offers: () => {
    W = { kind: "offers", tab: "b", o: {} };
    sheet(offerSheet);
  },
  offerstab: t => {
    if (!W || W.kind !== "offers") return;
    W.tab = t.dataset.v === "a" ? "a" : "b";
    W.pad = null;
    drawSheet();
  },
});
kitMenu("Two job offers", "offers", "Take-home, match, stock, health and commute, side by side", "sims");
