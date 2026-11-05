// Batch 5: the Rule of 5 restored (age / 5), answers 148 to 171, the safer FI line. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { metrics } from '../js/math/metrics.js';
import { layersOf } from '../js/math/layers.js';
import { ladderOf } from '../js/math/ladder.js';
import { foo } from '../js/math/foo.js';
import { scorecardOf } from '../js/math/scorecard.js';
import { saferFi } from '../js/math/fi.js';
import { bigEMonthsOf, bigEMultiplierOf, RULES } from '../js/registry/assumptions.js';
import { defaultFilingStatus } from '../js/math/income.js';
import { checksOf } from '../js/checks.js';
import { PREREQS } from '../js/registry/foo.js';
import { overrideStep } from '../js/program.js';
import { matchIncome, nearPayday, importTransactions, dedupe, toTransactions, parseCsv, guessMap } from '../js/import/csv.js';
import { halfOf, forPerson } from '../js/registry/couples.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const flags = JSON.parse(readFileSync(new URL('../data/flags.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const fresh = () => new Store(newHousehold({ name: 'Synthetic', now: now.toISOString() }), { now: () => now.toISOString() });
const demoStore = () => new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });
function brandon(age = 24) {
  const s = fresh();
  s.setDoc('profile', { age, state: 'NY', household: 'Solo', areas: { cash: true, investments: true, real: true, debt: false } });
  s.add('income', { name: 'Job', amount: 3170.35, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks', nextPayday: '2026-11-13' } }, { type: 'Job' });
  s.add('spending', { name: 'All in', amount: 1737.35, values: { includesDebtPayments: true } }, { type: 'All in' });
  s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 43000 } }, { type: 'Brokerage' });
  s.add('account', { name: 'Checking', values: { group: 'cash', balance: 8745 } }, { type: 'Checking' });
  s.add('asset', { name: 'Car', values: { value: 20000 } }, { type: 'Car' });
  return s;
}

test('A: the Rule of 5 is age / 5 everywhere; Brandon at 24 holds 4.8 months; no age locks big e', () => {
  assert.deepEqual([bigEMonthsOf(25), bigEMonthsOf(30), bigEMonthsOf(40), bigEMonthsOf(24), bigEMonthsOf(null)], [5, 6, 8, 4.8, null]);
  assert.equal(RULES.bigEMonths, undefined, 'no fixed number remains');
  const s = brandon();
  const m = metrics(s.doc, ref, { now });
  assert.ok(Math.abs(m.ruleOf5.months - 4.8) < 1e-9 && Math.abs(m.ruleOf5.value - 4.8 * 1737.35) < 0.01, `Brandon: 4.8 months, ${m.ruleOf5.value}`);
  assert.match(m.ruleOf5.text, /Age 24 divided by 5 = 4\.8 months/);
  const L = layersOf(s.doc, ref, now);
  assert.ok(Math.abs(L.layers.find(l => l.id === 'big-e:full').total - 4.8 * 1737.35) < 0.01);
  assert.ok(!L.bigFull, 'with $8,745 of cash the Buffer ($802) and little e fill, big e ($8,339) does not: $6,943 in');
  assert.ok(Math.abs(L.layers.find(l => l.id === 'big-e:full').filled - (8745 - L.layers[0].target - 1000)) < 0.01);
  assert.equal(foo(s.doc, ref, { now, flags }).steps.find(x => x.id === '4').status, 'In progress');
  assert.equal(scorecardOf(s.doc, ref, { now, flags }).areas.find(a => a.id === 'emergency').rating, 'OK');
  const bigStep = ladderOf(s.doc, ref, { now, flags }).steps.find(x => x.id === 'bigE');
  assert.ok(!bigStep.done && bigStep.pct > 0.8 && bigStep.pct < 0.9, `83% there: ${bigStep.pct}`);
  s.update(s.find(r => r.name === 'Checking')[0].id, { balance: 10200 });
  assert.ok(layersOf(s.doc, ref, now).bigFull && scorecardOf(s.doc, ref, { now, flags }).areas.find(a => a.id === 'emergency').rating === 'Strong', 'with $10,200 big e is full and the fund is Strong');
  // No age: locked, with the plain reason, everywhere.
  s.setDoc('profile', { age: null });
  const L0 = layersOf(s.doc, ref, now);
  assert.ok(L0.needsAge && !L0.bigFull);
  const F = foo(s.doc, ref, { now, flags });
  assert.equal(F.steps.find(x => x.id === '4').status, 'Locked');
  assert.match(F.steps.find(x => x.id === '4').prereq.text, /Add your age to set big e/);
  assert.notEqual(F.here, '4', 'a locked step is never where you are');
  assert.equal(scorecardOf(s.doc, ref, { now, flags }).areas.find(a => a.id === 'emergency').rating, 'OK');
  const lad = ladderOf(s.doc, ref, { now, flags });
  assert.ok(!lad.steps.find(x => x.id === 'bigE').done && lad.steps.find(x => x.id === 'bigE').date == null);
  assert.equal(metrics(s.doc, ref, { now }).ruleOf5.value, null);
});

test('150 and 175: the Roth is never locked behind the match but carries the cost line; SPARKS before Coast FI shows its cost when unlocked anyway', () => {
  assert.equal(PREREQS['5'], undefined, 'answer 175: no lock');
  const s = fresh();
  s.setDoc('profile', { age: 30, household: 'Solo', areas: { cash: true, investments: true, real: false, debt: false } });
  s.add('income', { name: 'Job', amount: 90000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', contributionPct: 0.02, matchPct: 1, matchCapPct: 0.05 } }, { type: 'Job' });
  s.add('spending', { name: 'All in', amount: 3000, values: { includesDebtPayments: true } }, { type: 'All in' });
  s.add('account', { name: 'Checking', values: { group: 'cash', balance: 30000 } }, { type: 'Checking' });
  s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 5000 } }, { type: 'Brokerage' });
  let F = foo(s.doc, ref, { now, flags });
  assert.ok(F.steps.find(x => x.id === '2').left > 0, 'match left on the table');
  const roth = F.steps.find(x => x.id === '5');
  assert.notEqual(roth.status, 'Locked');
  assert.ok(roth.skipCost && roth.skipCost.fiDays > 0); assert.match(roth.skipCost.text, /^Skipping \$[\d,]+ of match a year/);
  assert.ok(Math.abs(roth.skipCost.dollars - F.steps.find(x => x.id === '2').left) < 0.01, 'the match left a year');
  assert.equal(F.steps.find(x => x.id === '7').status, 'Locked');
  overrideStep(s, '7', 'Launching now');
  F = foo(s.doc, ref, { now, flags });
  const sparks = F.steps.find(x => x.id === '7');
  assert.ok(sparks.cost && sparks.cost.fiDays > 0); assert.match(sparks.cost.text, /before Coast FI/);
});

test('172: big e months = age / 5 x the income stability multiplier, or the coach\'s number; the how line says so; Brandon (Steady) stays at 4.8', () => {
  assert.deepEqual([bigEMultiplierOf({ incomeStability: 'Steady' }), bigEMultiplierOf({ incomeStability: 'Varies' }), bigEMultiplierOf({ incomeStability: 'Unpredictable' }), bigEMultiplierOf({}), bigEMultiplierOf({ incomeStability: 'Varies', bigEMultiplier: 2 })], [1, 1.25, 1.5, 1, 2]);
  assert.equal(bigEMonthsOf(30, 1.25), 7.5);
  const s = brandon();
  assert.ok(Math.abs(metrics(s.doc, ref, { now }).ruleOf5.months - 4.8) < 1e-9, 'Steady: 4.8 months');
  s.setDoc('profile', { incomeStability: 'Varies' });
  let m = metrics(s.doc, ref, { now });
  assert.ok(Math.abs(m.ruleOf5.months - 6) < 1e-9 && Math.abs(m.ruleOf5.value - 6 * 1737.35) < 0.01);
  assert.match(m.ruleOf5.text, /Age 24 divided by 5 = 4\.8 months x 1\.25 \(income varies\) = 6 months/);
  assert.ok(Math.abs(layersOf(s.doc, ref, now).months - 6) < 1e-9, 'the layers use the same months');
  s.setDoc('profile', { bigEMultiplier: 2 });
  m = metrics(s.doc, ref, { now });
  assert.ok(Math.abs(m.ruleOf5.months - 9.6) < 1e-9, 'the coach\'s number wins');
  assert.match(m.ruleOf5.text, /x 2 \(the multiplier set for this client\)/);
});

test('174: the filing fallback is Single, or Married jointly once the stage is Married, a Guess until typed', () => {
  assert.equal(defaultFilingStatus({ mode: 'Dating' }), 'Single');
  assert.equal(defaultFilingStatus({ mode: 'Married separate' }), 'Married jointly');
  assert.equal(defaultFilingStatus({ household: 'Couple' }), 'Married jointly', 'an older file: Couple reads as Married merged');
  assert.equal(defaultFilingStatus({}), 'Single');
});

test('176: a split bill whose roommate count and Splitting with disagree lands on the revisit list', () => {
  const s = brandon();
  s.setDoc('profile', { roommates: 1, splitWays: 3, shared: { rent: true }, sharedAs: { rent: 'The whole bill' }, household: 'Solo' });
  s.add('bill', { name: 'Rent', amount: 2000, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', whoPays: 'Split', amountIs: 'The whole bill' } });
  const c = checksOf(s.doc, ref, { now }).find(x => x.split);
  assert.ok(c && c.due); assert.match(c.label, /Rent: check how many ways this splits/); assert.match(c.why, /The roommate count says 2 ways, Split N ways says 3/);
  assert.equal(metrics(s.doc, ref, { now }).inputs.lines.find(l => l.name === 'Rent').splitBy, 2, 'the roommate count wins: two ways');
  s.setDoc('profile', { splitWays: 2 });
  assert.ok(!checksOf(s.doc, ref, { now }).some(x => x.split), 'they agree');
});

test('157: a Joint row counts at half in one person\'s view; a one-person account never', () => {
  const j = { kind: 'account', type: 'Savings', owner: 'Joint', amount: null, values: { balance: 3000, group: 'cash' } };
  assert.equal(halfOf(j).values.balance, 1500);
  assert.equal(forPerson(j, 'Me').values.balance, 1500); assert.equal(forPerson(j, 'all').values.balance, 3000);
  const k = { kind: 'account', type: '401(k)', owner: 'Joint', values: { balance: 9000, group: 'investment' } };
  assert.equal(forPerson(k, 'Me').values.balance, 9000, 'reads as this client\'s, not halved');
  assert.equal(forPerson(k, 'Partner').values?.balance, 9000);
});

test('168: money in within 5% of a paycheck and near the pay schedule matches the Income row; the import marks it Actual', () => {
  const s = brandon();
  const job = s.find(r => r.kind === 'income')[0];
  const incomes = [{ id: job.id, name: 'Job', perPay: 3170.35 * 12 / 26, payFrequency: '2 weeks', nextPayday: '2026-11-13' }];
  assert.ok(nearPayday('2026-11-27', incomes[0]) && nearPayday('2026-10-30', incomes[0]) && !nearPayday('2026-11-20', incomes[0]));
  assert.equal(matchIncome({ amount: 1463.24, date: '2026-11-27' }, incomes)?.incomeId, job.id);
  assert.equal(matchIncome({ amount: 1463.24, date: '2026-11-20' }, incomes), null, 'not near a payday');
  assert.equal(matchIncome({ amount: 1600, date: '2026-11-27' }, incomes), null, 'more than 5% off');
  assert.equal(matchIncome({ amount: -84, date: '2026-11-27' }, incomes), null, 'money out never');
  const tx = dedupe(toTransactions(parseCsv('Date,Description,Amount\n2026-11-27,PAYROLL ACME,1463.24\n2026-11-28,COFFEE,-4.50\n'), guessMap(['Date', 'Description', 'Amount'])));
  const list = tx.map(t => ({ ...t, ...(matchIncome(t, incomes) || {}), skip: false }));
  importTransactions(s, list, { bank: 'Big Bank' });
  const after = s.doc.records.find(r => r.id === job.id);
  assert.deepEqual([after.values.actualPay, after.values.actualPayDate, after.values.locked ?? after.locked], [1463.24, '2026-11-27', true]);
  assert.equal(s.doc.spending.transactions.find(t => t.amount > 0).incomeId, job.id);
  assert.equal(s.doc.spending.transactions.find(t => t.amount < 0).incomeId, null, 'an unmatched row stays a transaction for review');
});

test('C: under 45, a second FI line at a safer 3.5%; at 45 or over, none; Brandon (FI at 38) gets one', () => {
  const s = brandon();
  const m = metrics(s.doc, ref, { now });
  const sf = saferFi(m, { from: now });
  assert.ok(sf && sf.fiAge < 45 && sf.rate === 0.035);
  assert.ok(sf.months > m.monthsToFi.value, 'a bigger number takes longer');
  assert.ok(Math.abs(sf.target - 1737.35 * 12 / 0.035) < 0.01);
  assert.match(sf.text, /^At a safer 3\.5% for a longer retirement: FI [A-Z][a-z]{2} \d{4}$/);
  const old = brandon(44); old.setDoc('profile', { age: 44 });
  assert.equal(saferFi(metrics(old.doc, ref, { now }), { from: now }), null, 'FI at 58: no second line');
  assert.equal(saferFi(metrics(demoStore().doc, ref, { now }), { from: now }), null, 'the Demo client reaches FI past 45');
});
