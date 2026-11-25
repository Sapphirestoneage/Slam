/* ============================================================================
   SLAM the Game: core/homebuy.js
   PURPOSE     Home buying and renting: the bank's payment (principal and interest), the true cost of
               owning line by line, the true cost of renting, the year owning comes out ahead, the
               price-to-rent ratio and the 5% rule. The simulator "Rent or buy"
               (features/sims/rentbuy.js) uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: HB_RULES, HB_SOURCE, HB_OPTS, HB_LINES. Functions: hbPayment, hbRun,
               hbBreakeven, hbPriceToRent, hbFivePercent, hbBreakevenWords.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/homebuy.js of the main SLAM app,
               so home.html of the web app and the game have one copy of each rule. To change a rule,
               change the source, then run: node tools/game_homebuy_build.mjs. The tests fail when this
               copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
// Home buying and renting (run of Nov 25 2026, Part 2). One engine: home.html of the web app and the game's
// simulator "Rent or buy" both call these functions, so the two can never give two answers.
// Pure, and with no import on purpose: tools/game_homebuy_build.mjs copies this file word for word into
// game/core/homebuy.js. Every name starts with hb or HB_ because the game has one global scope.
// Empty is not zero: a cost line that is not picked yet is null. It counts as nothing, and its key is listed in
// `open`, so the screen can say "not counted yet" and the answer stays a Guess.
// Dollars are future dollars. Rates come in as percents (6.5 is 6.5%), the way the chips show them.

// ---------- the rules, each with where it comes from ----------
// pmiUntil: PMI is paid while the loan is over this share of the price paid. This is Eli's line "PMI under 20%
//   down", said as a share of the price: under 20% of the home is yours.
// fivePct: the 5% rule. Eli's prompt of Nov 25 2026 names it. It is taught by Ben Felix: the costs of owning that
//   never come back (property tax, upkeep, the cost of the money tied up) are about 5% of the home's value a year.
// maintLow, maintHigh: "maintenance 1 to 2% a year" (Eli's prompt, Nov 25 2026).
// rentGrowthLow, rentGrowthHigh: "rent growing 3 to 4% a year" (Eli's prompt, Nov 25 2026).
// maxYears: how far the breakeven looks.
// Property tax, home insurance, PMI, HOA, big repairs and renter's insurance have no typical number here: no dated
// source is in the repository. The person taps their own, and the screen says the number is theirs.
const HB_RULES = { pmiUntil: 0.8, fivePct: 0.05, maintLow: 1, maintHigh: 2, rentGrowthLow: 3, rentGrowthHigh: 4, maxYears: 30 };
const HB_SOURCE = 'Eli\'s prompt for the run "Finish everything partly built", Nov 25 2026';

// The amounts to tap, the same in the web app and in the game. Choices, not typical amounts.
const HB_OPTS = {
  price: [200000, 300000, 400000, 500000, 650000, 800000],
  downPct: [3, 5, 10, 20, 25],
  ratePct: [4, 5, 5.5, 6, 6.5, 7, 7.5, 8],
  years: [15, 20, 30],
  taxPct: [0.5, 1, 1.5, 2, 2.5, 3],
  insYear: [600, 1200, 1800, 2400, 3600, 5000],
  pmiPct: [0.3, 0.5, 0.75, 1, 1.5],
  hoa: [0, 100, 250, 400, 600, 900],
  maintPct: [1, 1.5, 2],
  repairsYear: [0, 1000, 2000, 4000, 6000],
  rent: [1000, 1500, 2000, 2500, 3000, 4000],
  rentIns: [0, 10, 15, 20, 30],
  rentGrowthPct: [2, 3, 3.5, 4, 5],
  homeGrowthPct: [0, 1, 2, 3, 4, 5],
  closingPct: [2, 3, 4, 5],
  sellingPct: [5, 6, 7, 8],
  retPct: [4, 5, 6, 7, 8],
  stay: [2, 3, 5, 7, 10, 15, 20],
};
// The cost lines of owning and of renting, in the order the screen shows them. `own`: the person's own number, with
// no typical range. `typical`: the range from HB_RULES, in words.
const HB_LINES = [
  { key: 'taxPct', side: 'own', name: 'Property tax', unit: '% of the home\'s value a year', own: true },
  { key: 'insYear', side: 'own', name: 'Home insurance', unit: 'a year', own: true },
  { key: 'pmiPct', side: 'own', name: 'PMI', unit: '% of the loan a year', own: true, onlyUnder20: true },
  { key: 'hoa', side: 'own', name: 'HOA', unit: 'a month', own: true },
  { key: 'maintPct', side: 'own', name: 'Maintenance', unit: '% of the home\'s value a year', typical: 'Typical: 1 to 2% a year' },
  { key: 'repairsYear', side: 'own', name: 'Big repairs, spread out', unit: 'a year', own: true },
  { key: 'rentIns', side: 'rent', name: 'Renter\'s insurance', unit: 'a month', own: true },
];

// What the comparison assumes about the years ahead. Each one is the person's own pick; the breakeven year waits
// until all five are picked (empty is not zero).
const HB_ASSUME = [
  { key: 'rentGrowthPct', name: 'Rent growth a year', typical: 'Typical: 3 to 4% a year' },
  { key: 'homeGrowthPct', name: 'Home price growth a year' },
  { key: 'closingPct', name: 'Closing costs to buy, % of the price' },
  { key: 'sellingPct', name: 'Costs to sell, % of the price' },
  { key: 'retPct', name: 'Investment return a year, before inflation' },
];
// Where the numbers come from, for the level of the answer: Guess, Close or Exact.
const HB_SOURCES = [['guess', 'My best guess'], ['quote', 'A listing or a quote'], ['bills', 'My own bills']];

const hbN = v => (v == null || Number.isNaN(v) ? 0 : v);

// ---------- the bank's payment ----------
// Principal and interest only: what a bank's calculator shows. null when the loan, the rate or the years is missing.
function hbPayment(loan, ratePct, years = 30) {
  if (loan == null || ratePct == null || years == null) return null;
  const r = ratePct / 1200, n = Math.max(1, Math.round(years * 12));
  return r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
}

// ---------- owning and renting, month by month ----------
// x: { price, downPct, ratePct, years, stay, taxPct, insYear, pmiPct, hoa, maintPct, repairsYear, rent, rentIns,
//      rentGrowthPct, homeGrowthPct, closingPct, sellingPct, retPct }.
// Each month the owner pays principal and interest, property tax and maintenance on the home's value that month,
// insurance, HOA and the big repairs set aside (these three rise with the home's value), and PMI while the loan is
// over 80% of the price paid. The renter pays rent and renter's insurance, both rising with rent growth.
// The comparison: each side's money out is counted as if it had been invested at retPct instead (so the side that
// pays less each month is credited with investing the difference), and the owner has the home's value less the
// loan and the cost to sell. dBuy[m] and dRent[m] are each side's net position after month m; buying is ahead in
// the months where dBuy is at or over dRent.
// Returns null when the price, the down payment or the rate is missing. Without a rent there is no comparison
// (compare: false) and dRent is null.
function hbRun(x = {}) {
  if (x.price == null || x.downPct == null || x.ratePct == null) return null;
  const years = x.years == null ? 30 : x.years, stay = Math.max(0.5, x.stay == null ? HB_RULES.maxYears : x.stay), months = Math.round(stay * 12);
  const down = (x.price * x.downPct) / 100, loan = x.price - down, pmt = hbPayment(loan, x.ratePct, years);
  const under20 = x.downPct < (1 - HB_RULES.pmiUntil) * 100;
  const open = HB_LINES.filter(l => x[l.key] == null && !(l.onlyUnder20 && !under20) && !(l.side === 'rent' && x.rent == null)).map(l => l.key);
  const rr = hbN(x.retPct) / 1200, lr = x.ratePct / 1200;
  const hg = Math.pow(1 + hbN(x.homeGrowthPct) / 100, 1 / 12) - 1, rg = Math.pow(1 + hbN(x.rentGrowthPct) / 100, 1 / 12) - 1;
  const compare = x.rent != null, once = down + (x.price * hbN(x.closingPct)) / 100, sell = 1 - hbN(x.sellingPct) / 100;
  let fvBuy = once, fvRent = 0, bal = loan, value = x.price, rent = hbN(x.rent), rentIns = hbN(x.rentIns), up = 1, sumMore = 0, pmiMonths = 0, ownSum = 0, rentSum = 0;
  let first = null, firstRent = null;
  const dBuy = [-fvBuy + value * sell - bal], dRent = compare ? [0] : null, byYear = [];
  for (let m = 1; m <= months; m++) {
    const pi = bal > 0 ? Math.min(pmt, bal * (1 + lr)) : 0, interest = bal * lr;
    const pmi = under20 && bal > HB_RULES.pmiUntil * x.price ? (loan * hbN(x.pmiPct)) / 1200 : 0;
    const line = { pi, tax: (value * hbN(x.taxPct)) / 1200, ins: (hbN(x.insYear) / 12) * up, pmi, hoa: hbN(x.hoa) * up, maint: (value * hbN(x.maintPct)) / 1200, repairs: (hbN(x.repairsYear) / 12) * up };
    line.total = line.pi + line.tax + line.ins + line.pmi + line.hoa + line.maint + line.repairs;
    const rentOut = rent + rentIns;
    if (m === 1) { first = line; firstRent = compare ? { rent, ins: rentIns, total: rentOut } : null; }
    if (pmi > 0) pmiMonths += 1;
    bal = Math.max(0, bal - (pi - interest));
    value *= 1 + hg; up *= 1 + hg;
    fvBuy = fvBuy * (1 + rr) + line.total;
    fvRent = fvRent * (1 + rr) + rentOut;
    sumMore += line.total - rentOut; ownSum += line.total; rentSum += rentOut;
    rent *= 1 + rg; rentIns *= 1 + rg;
    dBuy.push(-fvBuy + value * sell - bal);
    if (compare) dRent.push(-fvRent);
    if (m % 12 === 0) byYear.push({ year: m / 12, ownOut: ownSum, rentOut: compare ? rentSum : null, rentMonth: compare ? rent + rentIns : null, value, bal, equity: value * sell - bal, ahead: compare ? dBuy[m] - dRent[m] : null });
  }
  return { ready: true, compare, price: x.price, down, loan, pmt, once, under20, pmiMonths, pmiYears: Math.ceil(pmiMonths / 12), open, months, stay, first, firstRent, dBuy, dRent, more: sumMore / Math.max(1, months), byYear,
    ahead: compare ? dBuy[months] - dRent[months] : null };
}

// ---------- the breakeven year ----------
// The first whole year where selling the home at the end of that year leaves the owner ahead of the renter, looking
// up to maxYears. year is null and never is true when renting is cheaper the whole time. null when there is no
// comparison (no rent, or a missing price, down payment or rate).
function hbBreakeven(x = {}, maxYears = HB_RULES.maxYears) {
  const r = hbRun({ ...x, stay: maxYears });
  if (!r || !r.compare) return null;
  const needs = HB_ASSUME.filter(a => x[a.key] == null).map(a => a.key);
  if (needs.length) return { year: null, never: false, needs, maxYears, open: r.open, aheadAtEnd: null };
  const hit = r.byYear.find(y => y.ahead >= 0);
  return { year: hit ? hit.year : null, never: !hit, needs: [], maxYears, open: r.open, aheadAtEnd: r.byYear[r.byYear.length - 1].ahead };
}

// ---------- two rules of thumb, shown beside the answer ----------
// Price-to-rent ratio: the price over a year of rent. No line is drawn on it here: it is a number to compare places.
function hbPriceToRent(price, rent) {
  return price == null || rent == null || !(rent > 0) ? null : price / (rent * 12);
}
// The 5% rule: 5% of the price a year, as a month. Rent under that line: by this rule, renting costs less.
function hbFivePercent(price, rent) {
  if (price == null) return null;
  const line = (price * HB_RULES.fivePct) / 12;
  return { line, rent: rent == null ? null : rent, rentLess: rent == null ? null : rent < line };
}

// ---------- the level of an answer ----------
// Guess while a cost line is not counted yet or the numbers are a best guess; Close from a listing or a quote;
// Exact from the person's own bills. An answer about the years ahead (future: true) is never more than Close.
/* NO CALLER IN THIS REPOSITORY. The game does not call it: home.html of the web app does (js/solo/homecost.js). The game takes the level from the Guess, Close or Exact of each answer (kitState). */
function hbLevel(run, source, { future = false } = {}) {
  if (!run) return null;
  if (run.open.length || source == null || source === 'guess') return 'Guess';
  return source === 'bills' && !future ? 'Exact' : 'Close';
}

// ---------- the math, in words ----------
const hb$ = v => `$${Math.round(v).toLocaleString('en-US')}`;
function hbMath(run, x = {}) {
  if (!run) return [];
  const f = run.first, out = [];
  out.push(`The loan: ${hb$(run.price)} less ${hb$(run.down)} down (${x.downPct}%) = ${hb$(run.loan)}.`);
  out.push(`Principal and interest: ${hb$(run.loan)} over ${x.years == null ? 30 : x.years} years at ${x.ratePct}% = ${hb$(run.pmt)} a month.`);
  if (x.taxPct != null) out.push(`Property tax: ${hb$(run.price)} x ${x.taxPct}% / 12 = ${hb$(f.tax)} a month.`);
  if (x.insYear != null) out.push(`Home insurance: ${hb$(x.insYear)} a year / 12 = ${hb$(f.ins)} a month.`);
  if (run.under20 && x.pmiPct != null) out.push(`PMI: ${hb$(run.loan)} x ${x.pmiPct}% / 12 = ${hb$(f.pmi)} a month, while the loan is over 80% of the price.`);
  if (x.hoa != null) out.push(`HOA: ${hb$(f.hoa)} a month.`);
  if (x.maintPct != null) out.push(`Maintenance: ${hb$(run.price)} x ${x.maintPct}% / 12 = ${hb$(f.maint)} a month.`);
  if (x.repairsYear != null) out.push(`Big repairs: ${hb$(x.repairsYear)} a year / 12 = ${hb$(f.repairs)} a month.`);
  out.push(`All the lines counted: ${hb$(f.total)} a month in the first month.`);
  return out;
}
function hbCompareMath(x = {}) {
  return [
    `Each side's money out is counted month by month. The side that pays less is credited with investing the difference at ${x.retPct}% a year.`,
    `The owner starts by paying the down payment and ${x.closingPct}% of the price to close. The home's value grows ${x.homeGrowthPct}% a year. Property tax, maintenance, insurance, HOA and big repairs grow with it.`,
    `The renter's rent and insurance grow ${x.rentGrowthPct}% a year.`,
    `For each year: the home's value, less ${x.sellingPct}% to sell and less the loan that is left, next to what the renter's money grew to. The breakeven year is the first year the owner is ahead.`,
    'All dollars are future dollars.',
  ];
}

// ---------- the words ----------
function hbBreakevenWords(b) {
  if (!b) return null;
  if (b.needs && b.needs.length) return null;
  if (b.never) return `Renting is cheaper the whole time, looking ${b.maxYears} years ahead.`;
  return b.year === 1 ? 'Owning comes out ahead from year 1.' : `Owning comes out ahead from year ${b.year}. Before that, renting is cheaper.`;
}
