// Batch 29: the true cost of debt (M9T, M9L, js/math/truecost.js) and the student loan decision (M9S,
// js/math/studentloan.js), against hand-worked numbers on Maya, Tom and Dana (the PSLF teacher persona).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { debtFirstPlan } from '../js/math/debt.js';
import { trueCostOf, loanOffers, boughtOf, loanPayment } from '../js/math/truecost.js';
import { studentLoanPlans, ibrPayment, rapPayment, repay, interestDeduction, povertyLine } from '../js/math/studentloan.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00.000Z'); // the personas' moment (tools/personas/build.mjs)
const load = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));
const VERDICT = /\b(should|best|worst|too much|risky|at risk|danger|bad|good idea|strong|weak|fail|pay (it )?off fast)\b/i;
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const g = 1.07 ** (1 / 12); // 7% real a year, monthly

test('Maya: the card costs $300 of interest, $299 in today\'s dollars, and 4 months of FI', () => {
  const t = trueCostOf(load('maya'), ref, { now });
  const c = t.lines[0];
  // $6,000 at a guessed 25%, $200 + $1,500 of surplus = $1,700 a month: interest 125 + 92.19 + 58.69 + 24.50.
  let b = 6000, i = 0, real = 0;
  for (let k = 1; k <= 4; k++) { const x = b * 0.25 / 12; i += x; real += x / 1.02 ** (k / 12); b = b + x - Math.min(1700, b + x); }
  near(c.interest, i); near(c.interestToday, real); // 300.38 and 299.42
  assert.equal(c.endsYm, '2027-03');
  // FI as it is: 273 (the persona). Without the card: $1,700 a month from today fills the $18,415 of big e left
  // ($21,000 less the $2,585 the buffer and little e leave) in 11 months, then is invested at 7% real:
  // 11 + ln((1,050,000 (g-1) + 1,700) / (15,000 g^11 (g-1) + 1,700)) / ln g = 268.3, so 269.
  const without = 11 + Math.log((1050000 * (g - 1) + 1700) / (15000 * g ** 11 * (g - 1) + 1700)) / Math.log(g);
  assert.equal(c.fi.with, 273);
  assert.equal(c.fi.without, Math.ceil(without));
  assert.equal(c.fi.cost, 4);
  assert.match(c.text, /\$300 of interest still to pay \(\$299 in today's dollars\), gone Mar 2027\. Its payments push FI back 4 months/);
  assert.equal(c.afterTax, null, 'card interest is not deductible');
  assert.doesNotMatch(c.text, VERDICT);
});

test('Tom: the after-tax rate on the mortgage (no itemizing) and the rental loan (a rental cost), and the FI number they carry', () => {
  const t = trueCostOf(load('tom'), ref, { now });
  const by = n => t.lines.find(l => l.name === n);
  // $380,000 x 3.25% = $12,350 of interest, NJ has no table here so $0 of state tax: under the $16,100 standard deduction.
  assert.equal(by('Mortgage').afterTax.rate, 0.0325);
  assert.match(by('Mortgage').afterTax.text, /\$12,350 of home loan interest a year plus \$0 of state and local tax is under the \$16,100 standard deduction/);
  // The rental loan's interest comes off the rental's income at the 24% bracket: 6.5% x 0.76 = 4.94%.
  near(by('Rental loan').afterTax.rate, 0.0494, 1e-9);
  // Tom's spending includes his payments and the mortgage outlives FI: $1,950 x 12 / 4% = $585,000 of the FI number.
  assert.equal(by('Mortgage').fiAdd, 585000);
  assert.equal(by('Car loan').fiAdd, null, 'the car loan is gone before FI');
  assert.ok(t.lines.every(l => l.fi.cost > 0));
});

test('Tom: two car loan offers and paying cash, side by side', () => {
  const doc = load('tom');
  const r = loanOffers(doc, ref, { kind: 'car', amount: 25000, offers: [{ rate: 0.059, years: 5 }, { rate: 0.049, years: 6 }] }, { now });
  const [a, b] = r.offers;
  // P = A r / (1 - (1 + r)^-n).
  near(a.payment, 25000 * (0.059 / 12) / (1 - (1 + 0.059 / 12) ** -60)); // $482.17
  near(b.payment, 25000 * (0.049 / 12) / (1 - (1 + 0.049 / 12) ** -72)); // $401.46
  near(a.total, a.payment * 60, 0.02); near(b.total, b.payment * 72, 0.02);
  assert.equal(r.lowestTotal, 1); assert.equal(r.lowestPayment, 1);
  // A loan under 8% keeps its own payment and gives it back when it ends: the debt-free month stays Jan 2048 (254).
  assert.equal(a.debtFree.before, 254); assert.equal(a.debtFree.after, 254);
  assert.ok(a.fi.moved > 0 && b.fi.moved > 0);
  // Free money: $3,075 now, less each payment (his spending includes his payments).
  near(r.free - a.free.after, a.payment, 0.01);
  // Paying cash: $25,000 out of the $30,000 HYSA: big e $34,000 to $9,000, the surplus refills it first.
  assert.equal(r.cash.bigE.before, 34000); assert.equal(r.cash.bigE.after, 9000);
  assert.ok(r.cash.fi.moved > 0);
  assert.doesNotMatch(`${r.text} ${r.cash.text}`, VERDICT);
  assert.equal(doc.records.some(x => x.id === 'truecost-loan'), false, 'the file itself is never changed');
});

test('Dana (PSLF teacher): IBR and RAP payments, and PSLF against Standard, match the hand calculation', () => {
  const doc = load('teacher');
  const sl = studentLoanPlans(doc, ref, { now });
  const s = sl.s;
  // Interest $48,000 x 5.5% = $2,640, so the full $2,500 deduction (MAGI $58,000 is under $85,000): AGI $55,500.
  assert.equal(s.deduction, 2500); assert.equal(s.agi, 55500); assert.equal(s.familySize, 1); assert.equal(s.made, 48);
  // IBR (first borrowed after July 2014): 10% x ($55,500 - 1.5 x $15,960) / 12 = $263.00.
  near(sl.ibr, 0.1 * (55500 - 1.5 * 15960) / 12);
  // RAP: $55,500 is in the 5% band: 5% x $55,500 / 12 = $231.25.
  near(sl.rap, 231.25);
  // Standard 10 years: $48,000 at 5.5% over 120 months = $520.93.
  const r = 0.055 / 12;
  near(sl.standard, 48000 * r / (1 - (1 + r) ** -120));
  const row = id => sl.rows.find(x => x.id === id);
  // IBR with PSLF: 72 payments of $263 (each covers the $220 of interest), so B72 = 48,000 (1+r)^72 - 263 ((1+r)^72 - 1) / r.
  const f72 = (1 + r) ** 72;
  near(row('ibr-pslf').forgiven, 48000 * f72 - 263 * (f72 - 1) / r); // $44,341.84
  near(row('ibr-pslf').paid, 72 * 263);
  assert.equal(row('ibr-pslf').tax, 0);
  // RAP with PSLF: each $231.25 takes less than $50 off the principal, so the principal goes down by $50 more:
  // B(t+1) = B(t) (1+r) - 281.25, so B72 = 48,000 (1+r)^72 - 281.25 ((1+r)^72 - 1) / r.
  near(row('rap-pslf').forgiven, 48000 * f72 - 281.25 * (f72 - 1) / r); // $42,789.25
  near(row('rap-pslf').paid, 72 * 231.25);
  // Standard pays it all: $520.93 x 120, nothing forgiven.
  near(row('standard').paid, sl.standard * 120, 0.05); assert.equal(row('standard').forgiven, 0);
  // IBR without PSLF: 240 - 48 = 192 payments, then the rest is taxed as income. In today's dollars it is
  // $34,808.63 / 1.02^16 = $25,356; on top of $41,900 of taxable income: (50,400 - 41,900) x 12% + the rest x 22%.
  const f192 = (1 + r) ** 192, left = 48000 * f192 - 263 * (f192 - 1) / r;
  near(row('ibr').forgiven, left);
  const today = left / 1.02 ** 16;
  near(row('ibr').tax, (50400 - 41900) * 0.12 + (41900 + today - 50400) * 0.22, 0.05);
  assert.match(sl.words, /Paying more than the plan asks does not shorten it/);
  assert.doesNotMatch(sl.words, VERDICT);
});

test('Dana: the FOO and the one debt plan never push a PSLF loan to be paid off fast', () => {
  const doc = load('teacher');
  const m = metrics(doc, ref, { now });
  const f = foo(doc, ref, { now });
  assert.equal(f.steps.find(s => s.id === '3').done, true, 'a PSLF loan is not heavy debt');
  assert.ok(!f.steps.find(s => s.id === '9').parts.some(p => p.name === 'Federal student loans'), 'and not low-rate debt to pay down');
  // The plan ends the loan at its forgiveness month, with what is left forgiven.
  const p = m.debtPlan.debts[0];
  assert.equal(m.debtPlan.months, 72); assert.equal(p.paidOffMonth, 72);
  near(p.forgivenAmount, 44341.84, 0.01);
  // A what-if extra a month never goes to it: the loan still runs its 72 payments.
  const withExtra = debtFirstPlan(m.inputs.debts, { extra: 500 });
  assert.equal(withExtra.debts[0].paidOffMonth, 72);
  near(withExtra.debts[0].forgivenAmount, p.forgivenAmount);
  const t = trueCostOf(doc, ref, { now }).lines[0];
  assert.match(t.text, /\$18,936 still to pay over 72 payments to forgiveness \(PSLF, Nov 2032\), then \$44,342 is forgiven, tax-free\. Paying more than the plan asks does not shorten it\./);
  // The student loan interest deduction: $2,500 x 12% = $300 a year, so 5.5% - 300 / 48,000 = 4.875% after tax.
  near(t.afterTax.rate, 0.04875, 1e-9);
});

test('What it bought: $25,000 for school at 6.4% over 10 years, paid back by 2031 at $10,000 a year more', () => {
  const doc = load('teacher');
  const b = boughtOf(doc, ref, { ask: { kind: 'school', amount: 25000, offers: [{ rate: 0.064, years: 10 }] }, extra: 10000, startYears: 0 }, { now });
  const pay = loanPayment(25000, 0.064, 120); // $282.60
  near(b.total, pay * 120, 0.02); // $33,912
  // $10,000 x (1 - 12% federal - 7.65% FICA) = $8,035 a year; 33,912 / 8,035 = 4.2, so year 5: 2031.
  near(b.takeHome, 10000 * (1 - 0.12 - 0.0765), 0.01);
  assert.equal(b.years, 5); assert.equal(b.year, 2031);
  assert.ok(b.fi.loan > b.fi.before && b.fi.both < b.fi.loan);
  assert.doesNotMatch(b.text, VERDICT);
});

test('the student loan rules: poverty line, IBR, RAP floor and dependents, the RAP interest waiver, the deduction phase-out', () => {
  assert.equal(povertyLine(1, ref), 15960); assert.equal(povertyLine(3, ref), 15960 + 2 * 5680);
  assert.equal(ibrPayment({ agi: 20000, familySize: 1 }, ref), 0); // under 150% of the line
  near(ibrPayment({ agi: 55500, old: true }, ref), 0.15 * (55500 - 23940) / 12);
  assert.equal(rapPayment({ agi: 9000 }, ref), 10);
  near(rapPayment({ agi: 45000, dependents: 2 }, ref), 45000 * 0.04 / 12 - 100); // $50
  assert.equal(rapPayment({ agi: 25000, dependents: 3 }, ref), 10); // never under $10
  // $10 against $300 of interest: the $290 left is waived and the principal goes down $10 (the lesser of $50 and $10).
  const w = repay({ balance: 60000, apr: 0.06, payment: 10, months: 1, rap: true }, ref);
  near(w.forgiven, 60000 - 10);
  // Outside RAP the unpaid interest waits beside the principal: $60,000 + $300 - $10.
  near(repay({ balance: 60000, apr: 0.06, payment: 10, months: 1 }, ref).forgiven, 60290);
  assert.equal(interestDeduction({ interest: 3000, magi: 92500 }, ref), 1250); // half way through $85,000 to $100,000
  assert.equal(interestDeduction({ interest: 3000, magi: 60000, filingStatus: 'Married separately' }, ref), 0);
});
