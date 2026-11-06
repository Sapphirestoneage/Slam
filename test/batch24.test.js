// Batch 24: Gross is every income (QUESTIONS 228), the debt-free date as a range and rough balances in the FI range
// (244, 245), the home loan in one tap in Fast Track (248), and the tax rate from unemployment alone on Overview.
// The Roth IRA contributions (252) are in test/transitions.test.js; the app skills (207) in test/library.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Store, newHousehold, importFile } from '../js/records.js';
import { addPresets, ensureCategories } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers } from '../js/fasttrack.js';
import { metrics, debtRangeOf } from '../js/math/metrics.js';
import { debtWordsOf, fiWordsOf, pictureOf, confidenceOf } from '../js/math/picture.js';
import { fiRangeOf } from '../js/math/fi.js';
import { householdRates } from '../js/math/income.js';
import { statements, statementRows } from '../js/math/statements.js';
import { RULES } from '../js/registry/assumptions.js';
import { OUT_DIR } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-06T15:00:00Z');
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
const tom = (patch = {}) => client('Tom Hutchinson', { birthYear: 1988, takeHome: 9800, takePer: 'month', gut: 6500, gutIncludesDebt: true, gutFrom: 'Statements', checking: 8000, savings: 30000, invested: 410000, housing: 'Own', hasCar: true, homeValue: 650000, carValue: 22000, fiAge: 50, ...patch });
const riley = () => importFile(readFileSync(join(OUT_DIR, 'job-loss.json'), 'utf8'));

test('Gross is every income: unemployment alone reads its weekly amount, never below take-home', () => {
  const m = metrics(riley(), ref, { now });
  // $600 a week x 52 / 12 = $2,600 a month before any withholding (none chosen), the same as take-home: taxes $0.
  assert.equal(m.flow.gross, 2600);
  assert.equal(m.flow.takeHome, 2600);
  assert.equal(m.flow.taxes, 0);
  assert.equal(m.inputs.grossAnnual, null, 'jobs only stays for the tax rates and the match');
  // A job plus untaxed family help: the help counts in Gross as it lands, so Taxes is the job's alone.
  const s = new Store(newHousehold({ name: 'Mixed' }));
  s.setDoc('profile', { state: 'TX', birthYear: 1990 });
  s.add('income', { name: 'Job', amount: 60000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', incomeType: 'W-2' } }, { type: 'Job' });
  s.add('income', { name: 'Help from parents', amount: 500, per: 'month', values: {} }, { type: 'Family help' });
  const f = metrics(s.doc, ref, { now }).flow;
  assert.equal(Math.round(f.gross), 5500, '$60,000 / 12 + $500');
  assert.ok(f.gross >= f.takeHome);
  const job = metrics(s.doc, ref, { now }).inputs.income.find(i => i.r.name === 'Job');
  assert.ok(Math.abs(f.taxes - (5000 - job.takeHome.value)) < 0.5, 'taxes are the job\'s: $5,000 less its take-home');
  // The Statements' income statement reads the same Gross, under its new name.
  const doc = riley();
  const rows = statementRows(statements(doc, ref, { kind: 'month', ym: '2026-11' }, { now }), null);
  const row = rows.income.find(r => r.label === 'Gross, all income');
  assert.ok(row, 'the row is Gross, all income');
  assert.equal(row.now, 2600);
});

test('Overview: a household whose only income is unemployment gets its tax rate from the benefit', () => {
  const m = metrics(riley(), ref, { now });
  const r = householdRates(m.inputs.householdTax, ref);
  // Benefits this year: Oct 19 to Dec 31 is 10.4 weeks, rounded by the week count (benefitWeeksThisYear); $600 each,
  // under the $16,100 standard deduction and NY's $8,000: no tax, a rate of 0%, not a lock.
  assert.notEqual(r.value, null);
  assert.equal(r.value, 0);
});

test('the debt-free date is a range when the APR is a guess and spending a gut number (Alexis)', () => {
  const m = metrics(alexis().doc, ref, { now });
  const r = debtRangeOf(m);
  // Likely 64 months. The guessed card APR (22.15% typical, 5 points either way) alone: 53 to 85 months. The gut
  // spending (15% of $2,800 = $420 more or less a month to the card) alone: 39 to 64 (at 15% more the card gets no
  // surplus, so the minimum plan, 64). Together: down sqrt(11^2 + 25^2) = 27.3, up sqrt(21^2 + 0) = 21: 37 to 85.
  assert.equal(r.base, 64);
  assert.deepEqual(r.drivers.map(d => [d.input, d.low, d.high]), [['apr', 53, 85], ['spending', 39, 64]]);
  assert.equal(r.low, 37); assert.equal(r.high, 85);
  const w = debtWordsOf(m, { now });
  assert.equal(w.text, '2029 to 2033', 'Dec 2029 to Dec 2033, four years: under the 5-year cap');
  assert.equal(w.likely, 'Mar 2032');
  assert.match(w.narrow, /the card APR and monthly spending/);
});

test('the debt-free range: known numbers give one month; a short range names months; wider than 5 years says what narrows it', () => {
  const s = alexis();
  const card = s.doc.records.find(r => r.kind === 'debt');
  s.update(card.id, { apr: 0.25 }); s.setFieldStatus(card.id, 'apr', 'Know it');
  const gut = s.doc.records.find(r => r.kind === 'spending' && r.type === 'All in');
  s.update(gut.id, { pass: 'Statements' });
  let m = metrics(s.doc, ref, { now });
  // APR typed; spending from statements moves 5% ($140), not enough to turn her $320 short month into a surplus
  // for the card: nothing moves the date, so it is one month.
  assert.equal(debtRangeOf(m), null);
  assert.equal(debtWordsOf(m, { now }).kind, 'month');
  // A rough balance alone, on a short plan: the months.
  const t = new Store(newHousehold({ name: 'Short' }));
  t.setDoc('profile', { state: 'TX', birthYear: 1990 });
  t.add('income', { name: 'Job', amount: 4000, per: 'month', values: { payFrequency: 'month', incomeType: 'W-2' } }, { type: 'Job' });
  t.add('spending', { name: 'All in', amount: 3000, values: { includesDebtPayments: true } }, { type: 'All in' });
  const d = t.add('debt', { name: 'Card', values: { balance: 3000, apr: 0.2, payment: 100, payChoice: 'Custom' } }, { type: 'Credit card' });
  t.setFieldStatus(d.id, 'balance', 'Roughly');
  t.setDoc('spending', { source: 'lines' }); // no lines: the gut stays the number
  m = metrics(t.doc, ref, { now });
  const w = debtWordsOf(m, { now });
  assert.ok(w.kind === 'months' || w.kind === 'month', `a short plan reads in months (${w.kind}: ${w.text})`);
  assert.ok(/[A-Z][a-z]{2}/.test(w.text));
  // Nothing rough at all: one month, no range.
  t.setFieldStatus(d.id, 'balance', 'Know it');
  const g = t.doc.records.find(r => r.kind === 'spending');
  t.update(g.id, { pass: 'Statements' });
  t.setDoc('spending', { source: 'gut' });
  const q = metrics(t.doc, ref, { now });
  assert.equal(debtRangeOf({ ...q, inputs: { ...q.inputs, spendingShare: 0 } }), null, 'nothing rough: no range');
  assert.equal(debtWordsOf({ ...q, inputs: { ...q.inputs, spendingShare: 0 } }, { now }).kind, 'month');
  assert.equal(debtWordsOf(q, { now, range: { base: q.debtPlan.months, low: 0, high: 120, drivers: [{ label: 'monthly spending' }] } }).wide, true, 'a range over 5 years is the step that narrows it');
  assert.ok(RULES.fiRangeMaxYears === 5 && RULES.aprGuessSwing === 0.05 && RULES.roughBalanceShare === 0.1);
});

test('rough invested balances widen the FI range (Tom)', () => {
  const s = tom();
  const m = metrics(s.doc, ref, { now });
  const conf = confidenceOf('fi', pictureOf(s.doc, ref, { now }), { now });
  assert.equal(m.inputs.investedRough, 410000, 'Fast Track\'s invested total is Roughly');
  const r = fiRangeOf(m, conf.range, { from: now });
  // Spending alone (5%) and the invested total alone (10%, $41,000) each move it; together it is wider than either.
  const spendOnly = fiRangeOf({ ...m, inputs: { ...m.inputs, investedRough: 0 } }, conf.range, { from: now });
  assert.ok(r.low <= spendOnly.low && r.high >= spendOnly.high && r.high - r.low > spendOnly.high - spendOnly.low);
  const w = fiWordsOf(m, conf, { now });
  assert.ok(w.kind === 'range' || w.kind === 'year');
});

test('Fast Track: an owned home asks Mortgage or Paid off; Mortgage adds the loan row for the walk', () => {
  const s = tom({ homeLoan: 'Mortgage' });
  const home = s.doc.records.find(r => r.kind === 'asset' && r.type === 'Home');
  const loan = s.doc.records.filter(r => r.kind === 'debt' && r.linkedTo === home.id);
  assert.equal(loan.length, 1);
  assert.equal(loan[0].type, 'Mortgage');
  assert.equal(loan[0].values.balance ?? null, null, 'blank: the walk asks it');
  assert.equal(home.values.financed, 'Financed');
  assert.equal(s.doc.profile.areas.debt, true);
  assert.equal(fastTrackAnswers(s.doc).homeLoan, 'Mortgage', 'running it again starts from the answer');
  // Run again with Paid off: the empty loan row goes, the home is paid off.
  const a = fastTrackAnswers(s.doc); a.homeLoan = 'Paid off';
  applyFastTrack(s, a, { finished: true, now: now.toISOString() });
  assert.equal(s.doc.records.filter(r => r.kind === 'debt' && r.linkedTo === home.id).length, 0);
  assert.equal(s.doc.records.find(r => r.id === home.id).values.financed, 'Paid off');
  assert.equal(fastTrackAnswers(s.doc).homeLoan, 'Paid off');
  // A typed mortgage balance keeps one loan row (no second one from the tap).
  const t = tom({ homeLoan: 'Mortgage', mortgageBalance: 380000, mortgagePayment: 2400 });
  assert.equal(t.doc.records.filter(r => r.kind === 'debt' && r.type === 'Mortgage').length, 1);
  // Renting never asks.
  assert.equal(alexis().doc.records.some(r => r.type === 'Mortgage'), false);
});
