// Home buying and renting (run of Nov 25 2026, Part 2): the bank's payment, the true cost of owning line by line, the
// true cost of renting, the breakeven year, the price-to-rent ratio and the 5% rule. One engine (js/math/homebuy.js)
// for home.html and for the game's simulator; the last tests hold the game's copy to it. Made-up numbers only; the
// arithmetic is in each comment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as HB from '../js/math/homebuy.js';
import { ASSUMPTIONS } from '../js/registry/assumptions.js';

const { hbPayment, hbRun, hbBreakeven, hbPriceToRent, hbFivePercent, hbLevel, hbMath, hbCompareMath, hbBreakevenWords, HB_RULES, HB_OPTS, HB_LINES, HB_ASSUME, HB_SOURCE } = HB;
const root = new URL('../', import.meta.url);
const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
// A home with every line picked: $400,000, 10% down, 6.5% over 30 years.
const FULL = { price: 400000, downPct: 10, ratePct: 6.5, years: 30, taxPct: 1.2, insYear: 1800, pmiPct: 0.5, hoa: 100, maintPct: 1.5, repairsYear: 2400, rent: 2600, rentIns: 15, rentGrowthPct: 3.5, homeGrowthPct: 3, closingPct: 3, sellingPct: 6, retPct: 6 };

test('the bank\'s payment is principal and interest only', () => {
  // $360,000 at 6.5% over 30 years: 360000 x 0.0054167 / (1 - 1.0054167^-360) = $2,275.44
  near(hbPayment(360000, 6.5, 30), 2275.44);
  // no interest: the loan over the months
  assert.equal(hbPayment(120000, 0, 10), 1000);
  assert.equal(hbPayment(null, 6.5, 30), null); assert.equal(hbPayment(360000, null, 30), null);
  // 15 years costs more a month than 30
  assert.ok(hbPayment(360000, 6.5, 15) > hbPayment(360000, 6.5, 30));
});

test('the true cost of owning, line by line, in the first month', () => {
  const r = hbRun({ ...FULL, stay: 7 }), f = r.first;
  assert.equal(r.loan, 360000); assert.equal(r.down, 40000);
  near(f.pi, 2275.44); assert.equal(f.pi, r.pmt, 'the first line is the bank\'s payment');
  assert.equal(f.tax, 400); // 400,000 x 1.2% / 12
  assert.equal(f.ins, 150); // 1,800 / 12
  assert.equal(f.pmi, 150); // 360,000 x 0.5% / 12
  assert.equal(f.hoa, 100);
  assert.equal(f.maint, 500); // 400,000 x 1.5% / 12
  assert.equal(f.repairs, 200); // 2,400 / 12
  near(f.total, 2275.44 + 400 + 150 + 150 + 100 + 500 + 200);
  assert.deepEqual(r.open, []);
  assert.equal(r.once, 40000 + 12000, 'the down payment and 3% to close');
});

test('PMI is only under 20% down, and it stops when the loan is 80% of the price', () => {
  const twenty = hbRun({ ...FULL, downPct: 20, stay: 30 });
  assert.equal(twenty.under20, false); assert.equal(twenty.first.pmi, 0); assert.equal(twenty.pmiMonths, 0);
  assert.ok(!twenty.open.includes('pmiPct'), 'with 20% down PMI is not asked for');
  const ten = hbRun({ ...FULL, stay: 30 });
  assert.equal(ten.under20, true); assert.ok(ten.pmiMonths > 0 && ten.pmiMonths < 360);
  // the loan the month after the last PMI month is at or under 80% of the price; the month before it was over
  const r = 6.5 / 1200, bal = n => 360000 * (1 + r) ** n - ten.pmt * ((1 + r) ** n - 1) / r;
  assert.ok(bal(ten.pmiMonths) <= 320000 && bal(ten.pmiMonths - 1) > 320000);
  assert.equal(ten.pmiYears, Math.ceil(ten.pmiMonths / 12));
});

test('empty is not zero: a line that is not picked is listed as open and adds nothing', () => {
  const r = hbRun({ price: 400000, downPct: 10, ratePct: 6.5 });
  assert.deepEqual(r.open, ['taxPct', 'insYear', 'pmiPct', 'hoa', 'maintPct', 'repairsYear']);
  assert.equal(r.first.total, r.first.pi); assert.equal(r.compare, false); assert.equal(r.firstRent, null); assert.equal(r.dRent, null);
  assert.equal(hbRun({ price: 400000, downPct: 10 }), null); assert.equal(hbRun({}), null);
  // a typed 0 is an answer
  assert.ok(!hbRun({ price: 400000, downPct: 10, ratePct: 6.5, hoa: 0 }).open.includes('hoa'));
  // renter's insurance is only asked for once there is a rent
  assert.ok(hbRun({ price: 400000, downPct: 20, ratePct: 6.5, rent: 2000 }).open.includes('rentIns'));
  assert.equal(hbLevel(r, 'bills'), 'Guess', 'open lines keep the answer a Guess');
});

test('the true cost of renting: rent and renter\'s insurance, growing each year', () => {
  const r = hbRun({ ...FULL, stay: 30 });
  assert.deepEqual(r.firstRent, { rent: 2600, ins: 15, total: 2615 });
  // after 10 years at 3.5% a year: 2,615 x 1.035^10 = $3,688.72
  near(r.byYear[9].rentMonth, 2615 * 1.035 ** 10, 0.01);
  // a year of rent paid: 12 months, each a little higher
  const g = 1.035 ** (1 / 12);
  near(r.byYear[0].rentOut, 2615 * (g ** 12 - 1) / (g - 1), 0.01);
});

test('the breakeven year: the first year selling leaves the owner ahead, or renting is cheaper the whole time', () => {
  const b = hbBreakeven(FULL), r = hbRun({ ...FULL, stay: 30 });
  assert.ok(b.year >= 2 && b.year <= 30, `a year, got ${b.year}`); assert.equal(b.never, false);
  assert.ok(r.byYear[b.year - 1].ahead >= 0 && r.byYear[b.year - 2].ahead < 0, 'ahead that year, not the year before');
  assert.equal(r.byYear[b.year - 1].ahead, r.dBuy[b.year * 12] - r.dRent[b.year * 12]);
  assert.match(hbBreakevenWords(b), new RegExp(`Owning comes out ahead from year ${b.year}\\.`));
  // a low rent next to the same home: renting stays ahead for all 30 years
  const never = hbBreakeven({ ...FULL, rent: 900 });
  assert.equal(never.never, true); assert.equal(never.year, null); assert.ok(never.aheadAtEnd < 0);
  assert.equal(hbBreakevenWords(never), 'Renting is cheaper the whole time, looking 30 years ahead.');
  // a higher rent moves the year sooner; a longer look never moves it
  assert.ok(hbBreakeven({ ...FULL, rent: 3400 }).year < b.year);
  // what is assumed about the years ahead must be picked first: no year from a missing number
  const open = hbBreakeven({ ...FULL, retPct: null, homeGrowthPct: null });
  assert.deepEqual(open.needs, ['homeGrowthPct', 'retPct']); assert.equal(open.year, null); assert.equal(open.never, false); assert.equal(hbBreakevenWords(open), null);
  assert.equal(hbBreakeven({ ...FULL, rent: null }), null, 'no rent, no comparison');
  assert.doesNotMatch(`${hbBreakevenWords(b)} ${hbBreakevenWords(never)}`, /should|wrong|bad|mistake/i);
});

test('the comparison, by hand for two months', () => {
  // $100,000, 20% down, 12% a year (1% a month), nothing else but 12% return (1% a month), no growth, rent $700
  const x = { price: 100000, downPct: 20, ratePct: 12, years: 30, taxPct: 0, insYear: 0, hoa: 0, maintPct: 0, repairsYear: 0, rent: 700, rentIns: 0, rentGrowthPct: 0, homeGrowthPct: 0, closingPct: 0, sellingPct: 0, retPct: 12, stay: 1 };
  const r = hbRun(x), p = r.pmt;
  near(p, 80000 * 0.01 / (1 - 1.01 ** -360), 1e-9);
  // month 1: interest 800, so the loan falls by p - 800; the owner's money out would have grown to 20,000 x 1.01 + p
  const bal1 = 80000 - (p - 800), fv1 = 20000 * 1.01 + p;
  near(r.dBuy[1], -fv1 + 100000 - bal1, 1e-6); near(r.dRent[1], -700, 1e-9);
  const bal2 = bal1 - (p - bal1 * 0.01), fv2 = fv1 * 1.01 + p;
  near(r.dBuy[2], -fv2 + 100000 - bal2, 1e-6); near(r.dRent[2], -(700 * 1.01 + 700), 1e-9);
  near(r.dBuy[0], -20000 + 100000 - 80000, 1e-9);
});

test('the two rules of thumb beside the answer', () => {
  // $400,000 over 12 x $2,600 = 12.8
  near(hbPriceToRent(400000, 2600), 12.82, 0.01);
  assert.equal(hbPriceToRent(400000, null), null); assert.equal(hbPriceToRent(400000, 0), null);
  // the 5% rule: 400,000 x 5% / 12 = $1,666.67 a month
  const f = hbFivePercent(400000, 2600);
  near(f.line, 1666.67); assert.equal(f.rentLess, false);
  assert.equal(hbFivePercent(400000, 1500).rentLess, true); assert.equal(hbFivePercent(400000, null).rentLess, null); assert.equal(hbFivePercent(null, 1500), null);
});

test('Guess, Close or Exact: from where the numbers come, and never Exact about the years ahead', () => {
  const r = hbRun({ ...FULL, stay: 30 });
  assert.equal(hbLevel(r, null), 'Guess'); assert.equal(hbLevel(r, 'guess'), 'Guess'); assert.equal(hbLevel(r, 'quote'), 'Close'); assert.equal(hbLevel(r, 'bills'), 'Exact');
  assert.equal(hbLevel(r, 'bills', { future: true }), 'Close'); assert.equal(hbLevel(null, 'bills'), null);
});

test('the math in words names every line that is counted', () => {
  const r = hbRun({ ...FULL, stay: 30 }), lines = hbMath(r, FULL).join(' ');
  for (const w of ['The loan', 'Principal and interest', 'Property tax', 'Home insurance', 'PMI', 'HOA', 'Maintenance', 'Big repairs']) assert.match(lines, new RegExp(w));
  assert.match(lines, /\$2,275 a month/); assert.doesNotMatch(lines, /undefined|NaN/);
  assert.equal(hbMath(hbRun({ price: 400000, downPct: 20, ratePct: 6 }), { price: 400000, downPct: 20, ratePct: 6 }).length, 3, 'only the lines counted');
  assert.doesNotMatch(hbCompareMath(FULL).join(' '), /undefined|NaN/);
});

test('the rules have a source and a date, and no line without one carries a typical number', () => {
  for (const name of ['HomePmiUntil', 'HomeFivePct', 'HomeMaintLow', 'HomeMaintHigh', 'HomeRentGrowthLow', 'HomeRentGrowthHigh']) {
    const a = ASSUMPTIONS.find(x => x.name === name); assert.ok(a, name); assert.ok(a.source && a.date === '2026-11-25');
  }
  assert.match(HB_SOURCE, /Nov 25 2026/);
  assert.equal(HB_RULES.fivePct, 0.05); assert.equal(HB_RULES.pmiUntil, 0.8); assert.deepEqual([HB_RULES.maintLow, HB_RULES.maintHigh, HB_RULES.rentGrowthLow, HB_RULES.rentGrowthHigh], [1, 2, 3, 4]);
  // the lines with no dated source are the person's own: no typical words on them
  for (const l of HB_LINES) assert.ok(l.own ? !l.typical : /1 to 2%/.test(l.typical), l.key);
  assert.deepEqual(HB_LINES.filter(l => l.own).map(l => l.key), ['taxPct', 'insYear', 'pmiPct', 'hoa', 'repairsYear', 'rentIns']);
  assert.match(HB_ASSUME.find(a => a.key === 'rentGrowthPct').typical, /3 to 4%/);
  // the maintenance chips are inside the typical range; every line has chips
  assert.ok(HB_OPTS.maintPct.every(v => v >= HB_RULES.maintLow && v <= HB_RULES.maintHigh));
  for (const l of HB_LINES) assert.ok(HB_OPTS[l.key].length >= 3, l.key);
});

test('home.html draws the cards from the same engine, and the view does no math of its own', () => {
  const view = readFileSync(new URL('js/solo/homecost.js', root), 'utf8'), canon = readFileSync(new URL('js/solo/canon.js', root), 'utf8');
  assert.match(view, /from '\.\.\/math\/homebuy\.js'/); assert.match(canon, /more: api => homeCostCards\(api\)/);
  assert.doesNotMatch(view, /Math\.pow|\*\* ?\(|\/ ?1200/, 'no loan or growth formula in the view');
  for (const w of ['What the bank shows', 'The true cost of owning', 'The true cost of renting', 'When owning comes out ahead', 'Price-to-rent ratio', 'The 5% rule', 'Show the math']) assert.ok(view.includes(w), w);
});

test('the game\'s copy is the same code (tools/game_homebuy_build.mjs), and gives the same answers', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('tools/game_homebuy_build.mjs', root)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
  const box = {}; vm.createContext(box);
  vm.runInContext(`${readFileSync(new URL('game/core/homebuy.js', root), 'utf8')}\nthis.out = { run: hbRun, even: hbBreakeven, pay: hbPayment };`, box);
  const mine = hbRun({ ...FULL, stay: 12 }), theirs = box.out.run({ ...FULL, stay: 12 });
  assert.equal(theirs.ahead, mine.ahead); assert.equal(theirs.first.total, mine.first.total);
  assert.equal(box.out.even(FULL).year, hbBreakeven(FULL).year); assert.equal(box.out.pay(360000, 6.5, 30), hbPayment(360000, 6.5, 30));
  const sim = readFileSync(new URL('game/features/sims/rentbuy.js', root), 'utf8');
  assert.match(sim, /hbRun\(rentbuyArgs\(x\)\)/); assert.doesNotMatch(sim, /Math\.pow|simLoanPayment/, 'the simulator has no loan math of its own');
});
