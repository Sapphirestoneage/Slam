// Batch 41 (Phase 4, Track 1): ranges on the key outputs (M9R, js/math/ranges.js, docs/engines/ranges.md). Likely is
// today's number exactly; each input moves by its level; the swings combine as the root of the sum of their squares.
// Hand checks for an all Know it household, a mostly gut one (Alexis) and a mixed one (Maya), plus Tom.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { addPresets, ensureCategories } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers } from '../js/fasttrack.js';
import { metrics } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { rangesOf, fooRangeOf, rangeWordsOf, combine, widthOf, knobsOf, materialOf } from '../js/math/ranges.js';
import { LEVELS } from '../js/registry/program.js';
import { RULES } from '../js/registry/assumptions.js';
import { sheetContext } from '../js/sheet/context.js';
import { mathById } from '../js/registry/math.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-06T15:00:00Z');
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const client = (name, patch, debts = {}) => {
  const s = new Store(newHousehold({ name }));
  addPresets(s, ref); ensureCategories(s);
  const a = fastTrackAnswers(s.doc);
  Object.assign(a, { hasKids: false, hasPets: false, workSituation: 'Employed (W-2)', hsaEligible: false, fsa: false, equityPay: false, state: 'NY', household: 'Solo', chips: { whyNow: ['Just want to get organized'], worry: ['Debt'], goalWords: ['Debt free'] } }, patch);
  Object.assign(a.debts, debts);
  applyFastTrack(s, a, { finished: true, now: now.toISOString() });
  return s;
};
const alexis = () => client('Alexis Gillmore', { birthYear: 1998, takeHome: 1200, takePer: 'paycheck', payFrequency: '2 weeks', gut: 2800, gutIncludesDebt: false, checking: 400, savings: 0, invested: 0, housing: 'Rent', hasCar: false }, { 'Credit card': { balance: 4200, payment: 120, rows: 0 } });
const maya = (gut = 3500) => client('Maya', { birthYear: 1996, takeHome: 2400, takePer: 'paycheck', payFrequency: '2 weeks', gut, gutIncludesDebt: false, checking: 1200, savings: 4000, invested: 15000, housing: 'Rent', hasCar: false }, { 'Credit card': { balance: 6000, payment: 200, rows: 0 } });
const tom = () => client('Tom Hutchinson', { birthYear: 1988, takeHome: 9800, takePer: 'month', gut: 6500, gutIncludesDebt: true, gutFrom: 'Statements', checking: 8000, savings: 30000, invested: 410000, housing: 'Own', hasCar: true, homeValue: 650000, carValue: 22000, fiAge: 50 });
// Every number typed and Know it: a paycheck, two Budget lines (the lines drive the math), checking and an index fund.
function exact() {
  const s = new Store(newHousehold({ name: 'All known' }));
  s.setDoc('profile', { birthYear: 1990, state: 'TX', areas: { debt: false, cash: true, investments: true } });
  s.add('income', { name: 'Paycheck', amount: 6000, per: 'month', values: { basis: 'Take-home', payFrequency: 'month', incomeType: 'W-2' } }, { type: 'Job' });
  s.add('bill', { name: 'Rent', amount: 2000, per: 'month', values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed' } });
  s.add('bill', { name: 'Groceries', amount: 800, per: 'month', values: { category: 'Groceries', draftt: 'Food', amountType: 'Variable' } });
  s.add('account', { name: 'Checking', values: { group: 'cash', balance: 10000 } }, { type: 'Checking' });
  s.add('account', { name: 'Index fund', values: { group: 'investment', balance: 100000 } }, { type: 'Brokerage' });
  s.setDoc('spending', { source: 'lines' });
  return s.doc;
}

test('the widths by level: Know it barely moves a balance and leaves a paycheck, a bill and a rate alone', () => {
  assert.equal(widthOf('balance', LEVELS.Actual), 0.02);
  assert.equal(widthOf('balance', LEVELS.Rough), RULES.roughBalanceShare);
  assert.equal(widthOf('income', LEVELS.Actual), 0);
  assert.equal(widthOf('spending', LEVELS.Actual), 0);
  assert.equal(widthOf('apr', LEVELS.Actual), 0);
  assert.equal(widthOf('apr', LEVELS.Gut), RULES.aprGuessSwing);
  for (const k of ['balance', 'spending', 'income', 'variable', 'apr']) assert.ok(widthOf(k, LEVELS.Gut) >= widthOf(k, LEVELS.Rough) && widthOf(k, LEVELS.Rough) >= widthOf(k, LEVELS.Actual), `${k}: a guess moves at least as far as a rough number, and that at least as far as Know it`);
});

test('the corner method by hand: the root of the sum of the squares, one side at a time, never past "or later"', () => {
  const r = combine(100, [{ id: 'a', low: 97, high: 104 }, { id: 'b', low: 104, high: 96 }]);
  // Down: 3 and 4 -> 5. Up: 4 and 4 -> 5.657. Shares: (7^2) / (7^2 + 8^2) and (8^2) / ...
  near(r.low, 95); near(r.high, 100 + Math.sqrt(32));
  assert.equal(r.drivers[0].id, 'b'); near(r.drivers[0].share, 64 / 113, 1e-9);
  const d = combine(60, [{ id: 'apr', low: 50, high: Infinity }, { id: 's', low: 55, high: 66 }], { date: true, floor: 0 });
  assert.equal(d.high, null, 'an end that never comes reads or later');
  assert.equal(d.never, true);
  assert.equal(d.low, Math.round(60 - Math.sqrt(100 + 25)));
  assert.equal(d.drivers[0].id, 'apr');
  assert.equal(combine(null, []), null, 'no likely value, no range');
});

test('all Know it: likely is today\'s numbers, only the balances move (2%), and no range line shows anywhere', () => {
  const doc = exact();
  const m = metrics(doc, ref, { now });
  const R = rangesOf(doc, ref, { now, m });
  assert.deepEqual(R.knobs.map(k => k.kind).sort(), ['balance', 'balance'], 'the paycheck and the typed lines do not move');
  assert.equal(R.netWorth.likely, m.netWorth.value);
  assert.equal(R.netWorth.likely, 110000);
  // By hand: $10,000 and $100,000 each 2% either way: sqrt(200^2 + 2,000^2) = 2,009.98.
  near(R.netWorth.low, 110000 - Math.sqrt(200 ** 2 + 2000 ** 2));
  near(R.netWorth.high, 110000 + Math.sqrt(200 ** 2 + 2000 ** 2));
  assert.equal(R.surplus.likely, 3200); assert.equal(R.surplus.low, 3200); assert.equal(R.surplus.high, 3200);
  assert.equal(R.fi.likely, m.monthsToFi.value);
  for (const k of ['fi', 'debtFree', 'efMonths', 'surplus', 'netWorth']) assert.equal(rangeWordsOf(k, R[k], { now }), null, `${k}: nothing below Know it, so no line`);
  assert.equal(fooRangeOf(doc, ref, { now }).moves, false);
});

test('Alexis (mostly gut): the surplus crosses nothing, the debt-free date by hand, the two inputs that widen it', () => {
  const s = alexis();
  const m = metrics(s.doc, ref, { now });
  const R = rangesOf(s.doc, ref, { now, m });
  // Surplus by hand: $1,200 x 26 / 12 = $2,600 take-home, less $2,800 gut spending, less the $120 card payment = -$320.
  // The gut number is the only input that moves it: 15% either way is $420.
  assert.equal(R.surplus.likely, -320);
  near(R.surplus.low, -740); near(R.surplus.high, 100);
  assert.equal(rangeWordsOf('surplus', R.surplus, { now }).line, 'Could be $740 short to $100 a month');
  // Debt free: likely is the one plan's month; each input alone, run by hand on its own copy of the file.
  assert.equal(R.debtFree.likely, m.debtPlan.months);
  const card = s.doc.records.find(r => r.kind === 'debt');
  const gut = s.doc.records.find(r => r.kind === 'spending' && r.type === 'All in');
  const run = recs => metrics({ ...s.doc, records: s.doc.records.map(r => recs[r.id] ?? r) }, ref, { now }).debtPlan.months ?? Infinity;
  const typical = ref.typicalRates['Credit card'];
  const apr = [run({ [card.id]: { ...card, values: { ...card.values, apr: typical - 0.05 } } }), run({ [card.id]: { ...card, values: { ...card.values, apr: typical + 0.05 } } })];
  const spend = [run({ [gut.id]: { ...gut, amount: 2800 * 0.85 } }), run({ [gut.id]: { ...gut, amount: 2800 * 1.15 } })];
  const bal = [run({ [card.id]: { ...card, values: { ...card.values, balance: 4200 * 0.98 } } }), run({ [card.id]: { ...card, values: { ...card.values, balance: 4200 * 1.02 } } })];
  const b = m.debtPlan.months, lo = x => Math.min(b, ...x), hi = x => Math.max(b, ...x);
  assert.equal(R.debtFree.low, Math.round(b - Math.sqrt((b - lo(apr)) ** 2 + (b - lo(spend)) ** 2 + (b - lo(bal)) ** 2)));
  assert.equal(R.debtFree.high, Math.round(b + Math.sqrt((hi(apr) - b) ** 2 + (hi(spend) - b) ** 2 + (hi(bal) - b) ** 2)));
  const w = rangeWordsOf('debtFree', R.debtFree, { now });
  assert.match(w.line, /^Could be [A-Z][a-z]{2} \d{4} to [A-Z][a-z]{2} \d{4}$/);
  assert.deepEqual(w.drivers.map(d => d.id).sort(), [`${card.id}:apr`, 'spending'].sort(), 'the guessed APR and the gut number widen it most');
  assert.match(w.drivers.find(d => d.id === 'spending').words, /Gut spending number \(a guess\)/);
  assert.equal(w.drivers.find(d => d.field === 'apr').route, '#/net-worth/credit-cards', 'the tap opens the card\'s own box');
  assert.equal(rangeWordsOf('netWorth', R.netWorth, { now }), null, 'her balances are typed: net worth carries no line');
});

test('Maya (mixed): surplus, emergency fund months and net worth by hand; likely is the screen\'s number', () => {
  const s = maya();
  const m = metrics(s.doc, ref, { now });
  const R = rangesOf(s.doc, ref, { now, m });
  // Surplus: $2,400 x 26 / 12 = $5,200, less $3,500 gut, less the $200 card payment = $1,500; the gut 15% = $525.
  assert.equal(R.surplus.likely, 1500); near(R.surplus.low, 975); near(R.surplus.high, 2025);
  assert.equal(rangeWordsOf('surplus', R.surplus, { now }).line, 'Could be $1,000 to $2,000 a month');
  // Net worth: $1,200 + $4,000 + $15,000 - $6,000 = $14,200. Checking and savings typed (2%: $24, $80), the invested
  // total rough (10%: $1,500), the card typed (2%: $120): sqrt(24^2 + 80^2 + 1,500^2 + 120^2) = 1,507.1.
  const sw = Math.sqrt(24 ** 2 + 80 ** 2 + 1500 ** 2 + 120 ** 2);
  assert.equal(R.netWorth.likely, 14200); near(R.netWorth.low, 14200 - sw); near(R.netWorth.high, 14200 + sw);
  assert.equal(rangeWordsOf('netWorth', R.netWorth, { now }).line, 'Could be $12,700 to $15,700');
  // Emergency fund months: $5,200 cash over $3,500 = 1.486. The gut number moves it to 5,200 / 2,975 and 5,200 / 4,025;
  // checking and savings at 2% add $104 between them, one at a time.
  const e = 5200 / 3500;
  const down = Math.sqrt((e - 5200 / 4025) ** 2 + (24 / 3500) ** 2 + (80 / 3500) ** 2), up = Math.sqrt((5200 / 2975 - e) ** 2 + (24 / 3500) ** 2 + (80 / 3500) ** 2);
  near(R.efMonths.likely, e, 1e-9); near(R.efMonths.low, e - down, 1e-9); near(R.efMonths.high, e + up, 1e-9);
  assert.equal(rangeWordsOf('efMonths', R.efMonths, { now }), null, 'under a month wide: no line (RangeMinEfMonths)');
  assert.equal(R.fi.likely, m.monthsToFi.value);
  assert.ok(R.fi.low < R.fi.likely && R.fi.high > R.fi.likely);
});

test('a surplus that could be nothing some months says so plainly, no red words', () => {
  const s = maya(4800); // $5,200 - $4,800 - $200 = $200; the gut 15% is $720
  const R = rangesOf(s.doc, ref, { now });
  assert.equal(R.surplus.likely, 200);
  assert.equal(rangeWordsOf('surplus', R.surplus, { now }).line, 'Could be anywhere from nothing to $900 a month', 'the ends round to a step that fits a $1,440 width');
});

test('Tom: a statements total and a rough invested total widen the FI date; likely is his FI month', () => {
  const s = tom();
  const m = metrics(s.doc, ref, { now });
  const R = rangesOf(s.doc, ref, { now, m });
  assert.equal(R.fi.likely, m.monthsToFi.value);
  assert.equal(R.knobs.find(k => k.id === 'spending').factor.low, 1 - RULES.rangeSpendEstimate, 'from statements: Estimate, 5%');
  const w = rangeWordsOf('fi', R.fi, { now });
  assert.ok(w, 'a range line on his FI date');
  assert.equal(w.drivers.length, 2);
  assert.equal(w.drivers[0].id, 'spending');
  assert.equal(R.debtFree, null, 'no debts on file, so no debt-free range');
});

test('the FOO step: likely is the step you are on, and the materiality rules read the client\'s own setting', () => {
  for (const s of [alexis(), maya(), tom()]) {
    const F = fooRangeOf(s.doc, ref, { now });
    assert.equal(F.likely, foo(s.doc, ref, { now }).here);
    assert.ok(typeof F.low === 'string' && typeof F.high === 'string');
  }
  const r = { width: 3, likely: 10, low: 8, high: 11 };
  assert.equal(materialOf('fi', r, { material: 100, spending: 3000 }), true);
  assert.equal(materialOf('fi', { ...r, width: 1 }, { material: 100, spending: 3000 }), false, 'under RangeMinMonths');
  assert.equal(materialOf('surplus', { width: 5 }, { material: 100 }), false, '$5 a month is $60 a year, under $100');
  assert.equal(materialOf('surplus', { width: 10 }, { material: 100 }), true);
  assert.equal(materialOf('netWorth', { width: 80 }, { material: 100 }), false);
});

test('the workbook: M9R and the debt-free range rows read the same ranges as the screens', () => {
  const s = alexis();
  const c = sheetContext(s.doc, ref, { now });
  const e = mathById('M9R');
  const part = k => e.parts.find(p => p.key === k).app(c);
  const R = rangesOf(s.doc, ref, { now });
  assert.equal(part('surplusLikely'), R.surplus.likely);
  assert.equal(part('debtFreeLow'), R.debtFree.low);
  assert.equal(part('debtFreeHigh'), R.debtFree.high);
  const m34 = mathById('M34');
  assert.equal(m34.parts.find(p => p.key === 'rangeLow').app(c), R.debtFree.low);
  assert.equal(m34.parts.find(p => p.key === 'rangeHigh').app(c), R.debtFree.high);
  assert.ok(e.app(c) >= 2, 'surplus and debt free are wide enough to show');
  assert.equal(knobsOf(s.doc, ref).filter(k => k.prior).length, 1, 'the blank card APR is the one prior');
});
