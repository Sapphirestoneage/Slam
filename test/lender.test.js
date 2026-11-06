// Batch 42: the lender's-eye view (js/math/lender.js, M9W). Every number here is worked by hand in the comment beside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { returnsOf, lenderRows, lenderDebts, loanFromPayment, maxHomePayment, dtiPlace, lenderKind, lastReturnYear, lenderOf, lenderOn } from '../js/math/lender.js';
import { RULES } from '../js/registry/assumptions.js';
import { Store, newHousehold, importFile } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { loadDefs, OUT_DIR, NOW } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(NOW);
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const self = values => ({ id: 's', kind: 'income', type: 'Self-employed', values: { incomeType: '1099', ...values } });

test('the last return filed: tax year 2025 in Nov 2026, still 2024 in March 2026', () => {
  assert.equal(lastReturnYear(new Date('2026-11-05T12:00:00Z')), 2025);
  assert.equal(lastReturnYear(new Date('2026-03-10T12:00:00Z')), 2024);
});

test('two returns rising are averaged; falling, the latest lower year is used; a 20% drop gets a closer look', () => {
  const up = returnsOf(self({ returnsFiled: '2 or more', returnLast: 52000, returnBefore: 41000 }), 74100, { now });
  assert.equal(up.mortgage, 46500); // (41,000 + 52,000) / 2
  assert.equal(up.landlord, 52000); // a landlord reads the latest
  assert.equal(up.bigDrop, false);
  const down = returnsOf(self({ returnsFiled: '2 or more', returnLast: 40000, returnBefore: 52000 }), 45000, { now });
  assert.equal(down.mortgage, 40000); // never averaged over a decline: the current, lower year
  near(down.drop, 12000 / 52000);
  assert.equal(down.bigDrop, true); // 23% >= 20%
  assert.match(down.rule, /lower, latest year: \$40,000/);
});

test('one return: a mortgage lender waits for the second, a landlord reads it; none: nothing counts', () => {
  const one = returnsOf(self({ returnsFiled: '1', returnLast: 14500 }), 28200, { now });
  assert.equal(one.mortgage, 0);
  assert.equal(one.landlord, 14500);
  const none = returnsOf(self({ returnsFiled: 'None' }), 28200, { now });
  assert.equal(none.mortgage, 0);
  assert.equal(none.landlord, 0);
});

test('blank returns are a Guess at this year\'s pace; amounts typed with no count say how many', () => {
  const blank = returnsOf(self({}), 30000, { now });
  assert.equal(blank.guessed, true);
  assert.equal(blank.mortgage, 30000);
  const typed = returnsOf(self({ returnLast: 20000 }), 30000, { now });
  assert.equal(typed.filed, '1');
  assert.equal(typed.mortgage, 0);
  const zero = returnsOf(self({ returnsFiled: '2 or more', returnLast: 0, returnBefore: 0 }), 30000, { now });
  assert.equal(zero.mortgage, 0); // a typed 0 is an answer
  assert.equal(zero.amountGuess, false);
});

test('each income type to a lender', () => {
  assert.equal(lenderKind({ type: 'Job', values: { incomeType: 'W-2' } }), 'paycheck');
  assert.equal(lenderKind({ type: 'Platform', values: {} }), 'self');
  assert.equal(lenderKind({ type: 'Side hustle', values: {} }), 'self');
  assert.equal(lenderKind({ type: 'Self-employed', values: { incomeType: 'Business' } }), 'self');
  assert.equal(lenderKind({ type: 'Unemployment', values: {} }), 'unemployment');
  assert.equal(lenderKind({ type: 'Benefits', values: {} }), 'benefit');
  assert.equal(lenderKind({ type: 'Rental', values: {} }), 'rental');
  assert.equal(lenderKind({ type: 'Money from family', values: {} }), 'gift');
});

test('a paycheck: unreported cash tips are earned but not shown; reported, they are on the W-2', () => {
  const row = reported => ({ r: { id: 'j', kind: 'income', type: 'Job', name: 'Bar', values: { incomeType: 'W-2' } }, gross: 26460, grossExtra: 17160, takeHome: { value: 3380 }, work: { any: true, reported }, cash: { mode: 'paycheck' } });
  const [no] = lenderRows([row('No')], { now });
  assert.equal(no.earned, 43620); // 26,460 + 17,160
  assert.equal(no.mortgage, 26460);
  assert.equal(no.tipsHidden, 17160);
  const [yes] = lenderRows([row('Yes')], { now });
  assert.equal(yes.mortgage, 43620);
  assert.equal(yes.hidden, 0);
});

test('benefits run long enough or not; unemployment never counts for a mortgage; gifts are in neither column', () => {
  const rows = lenderRows([
    { r: { id: 'b', type: 'Benefits', values: { benefitEnd: '2027-06-30' } }, takeHome: { value: 900 } },
    { r: { id: 'c', type: 'Benefits', values: {} }, takeHome: { value: 500 } },
    { r: { id: 'u', type: 'Unemployment', values: { benefitEnd: '2027-04-18' } }, takeHome: { value: 2600 }, benefit: { monthly: 2600, end: '2027-04-18' } },
    { r: { id: 'g', type: 'Money from family', values: {} }, takeHome: { value: 300 } },
  ], { now });
  assert.deepEqual(rows.map(r => [r.mortgage, r.landlord]), [[0, 0], [6000, 6000], [0, 0], [0, 0]]); // Jun 2027 is 7 months off: under both the 3 years and the 12-month lease
  assert.equal(rows[3].earned, 0);
});

test('debts as a lender counts them: a card at its minimum, no family loan, a student loan with no payment at 1%, a rental loan netted', () => {
  const recs = [{ id: 'home', kind: 'asset', type: 'Home' }, { id: 'rent', kind: 'asset', type: 'Other property' }, { id: 'c', kind: 'debt', type: 'Credit card', values: {} }];
  const D = lenderDebts([
    { id: 'c', name: 'Card', type: 'Credit card', balance: 1800, apr: 0.27, payment: 90 }, // max(25, 18 + 40.50) = 58.50
    { id: 'f', name: 'Mom', type: 'Family or friend', balance: 2000, payment: 100 },
    { id: 's', name: 'Loans', type: 'Student loan', balance: 30000, payment: null }, // 1% = 300
    { id: 'm', name: 'Home', type: 'Mortgage', balance: 300000, payment: 2000, linkedTo: 'home' },
    { id: 'r', name: 'Rental', type: 'Mortgage', balance: 200000, payment: 1500, linkedTo: 'rent' },
  ], { records: recs, hasRental: true });
  near(D.other, 358.5);
  assert.equal(D.housing, 2000);
  assert.deepEqual(D.left.map(d => d.id), ['f', 'r']);
});

test('the home loan a payment carries, and the most payment the usual lines allow', () => {
  // $1,000 less 25% taxes and insurance = $750 at 7.18% / 12 for 360 months: 750 x (1 - 1.0059833^-360) / 0.0059833 = 110,712.
  near(loanFromPayment(1000), 110712, 5);
  assert.equal(loanFromPayment(0), 0);
  near(maxHomePayment(5000, 0), 1400); // 28% binds before 36%
  near(maxHomePayment(5000, 600), 1200); // 36% x 5,000 - 600
  assert.equal(maxHomePayment(1000, 900), 0);
});

test('DTI against the lines, in words with no verdict', () => {
  assert.match(dtiPlace(0.2), /At or under 36%, the usual conventional line and the lowest/);
  assert.match(dtiPlace(0.4), /Over 36%.*at or under 43%, FHA/);
  assert.match(dtiPlace(0.48), /at or under 50%/);
  assert.match(dtiPlace(0.6), /Over 50%/);
  assert.equal(dtiPlace(null), null);
  for (const t of [0.2, 0.4, 0.44, 0.48, 0.6].map(dtiPlace)) assert.doesNotMatch(t, /strong DTI|at risk|bad|good|\u2014/i);
});

test('the card issuer read: utilization and what to pay before the statement closes', () => {
  const s = new Store(newHousehold({ name: 'Card test', now: NOW }));
  s.add('income', { name: 'Job', amount: 4000, per: 'month', values: { basis: 'Both', gross: 60000, incomeType: 'W-2', payFrequency: 'month' } }, { type: 'Job' });
  s.add('debt', { name: 'Blue', values: { balance: 3000, apr: 0.24, payment: 100, limit: 5000, statementDay: 21 } }, { type: 'Credit card' });
  s.add('debt', { name: 'Gold', values: { balance: 500, apr: 0.2, payment: 50, limit: 5000 } }, { type: 'Credit card' });
  const m = metrics(s.doc, ref, { now });
  const L = lenderOf(s.doc, ref, { now, m });
  near(L.card.util, 0.35); // 3,500 / 10,000
  assert.equal(L.card.moves[0].pay, 500); // 3,500 - 30% x 10,000
  assert.equal(L.card.moves[1].pay, 2500); // 3,500 - 10% x 10,000
  assert.match(L.card.moves[0].text, /closes on the 21st, starting with Blue \(60\.0% used\)/);
  // Mortgage: the cards at their minimums, 3,000 x 1% + 60 = 90 and 5 + 8.33 = 25 (the floor): 115 / 5,000 = 2.3%.
  near(L.mortgage.dti, 115 / 5000, 1e-6);
  assert.equal(L.gap.month, 0);
});

test('the Phase 4 switch, and a household with no income', () => {
  const s = new Store(newHousehold({ name: 'Empty', now: NOW }));
  assert.equal(lenderOn(s.doc), true);
  const L = lenderOf(s.doc, ref, { now, m: metrics(s.doc, ref, { now }) });
  assert.equal(L.has, false);
  assert.equal(L.mortgage.dti, null);
  assert.equal(L.mortgage.text, 'No income a mortgage lender can count yet.');
});

test('the rules are on the Assumptions list with a source and a date', async () => {
  const { ASSUMPTIONS } = await import('../js/registry/assumptions.js');
  for (const k of Object.keys(RULES).filter(k => k.startsWith('lender'))) {
    const a = ASSUMPTIONS.find(x => x.id === `rules.${k}`);
    assert.ok(a && a.source && a.date, `${k} needs an Assumptions row`);
  }
});

// The persona defs say what the screen should say (lender: { ... }).
const defs = (await loadDefs()).filter(d => d.lender);
test('the four personas the screen is written for have a lender read in their def', () => {
  for (const id of ['dancer', 'bartender', 'creator', 'teacher']) assert.ok(defs.some(d => d.id === id), `${id} needs lender in its def`);
});
for (const def of defs) {
  test(`persona ${def.id}: the lender's-eye view reads as the def says`, () => {
    const doc = importFile(readFileSync(join(OUT_DIR, `${def.id}.json`), 'utf8'));
    const L = lenderOf(doc, ref, { now, m: metrics(doc, ref, { now }) });
    const got = { earned: L.earned, mortgageIncome: L.mortgageIncome, landlordIncome: L.landlordIncome, dti: L.mortgage.dti, gap: L.gap.month, loan: L.mortgage.loan };
    for (const [k, e] of Object.entries(def.lender)) {
      if (k === 'says') continue;
      near(got[k], e.value, e.tol ?? 0.01);
    }
    const words = [L.mortgage.text, L.mortgage.place, L.landlord.text, L.landlord.place, L.card.text, L.card.place, L.gap.text, ...L.mortgage.moves, ...L.landlord.moves, ...L.card.moves, ...L.rows.map(r => ({ text: r.why }))]
      .map(x => (typeof x === 'string' ? x : x?.text ?? '')).join(' | ');
    for (const s of def.lender.says || []) assert.ok(words.includes(s), `${def.id}: the screen should say "${s}"`);
    assert.doesNotMatch(words, /\u2014|NaN|undefined|\bat risk\b|\bstrong DTI\b/);
  });
}
