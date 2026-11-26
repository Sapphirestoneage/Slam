// Run "Finish everything partly built", Part 5 (Nov 25 2026): student loans. PSLF in one card, a private refinance
// rate next to the federal plans (M8S), the stepladder of school-year loans (M8L) and the household size the plans use,
// against hand-worked numbers. Dana is the PSLF teacher persona.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile } from '../js/records.js';
import { studentLoanPlans, pslfOf, refiOf, stepladderOf, ladderRate, repay, levelPayment, familyOf, povertyLine } from '../js/math/studentloan.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00.000Z');
const load = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));
const VERDICT = /\b(should|best|worst|too much|risky|at risk|danger|bad|good idea|strong|weak|fail|pay (it )?off fast|mistake|behind|off track)\b/i;
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);

test('PSLF card: Dana has 48 counted, 72 to go (6 years), and the RAP with PSLF row forgives $42,789 tax-free', () => {
  const R = studentLoanPlans(load('teacher'), ref, { now });
  const P = pslfOf(R);
  assert.equal(P.employer, 'Yes'); assert.equal(P.counted, 48); assert.equal(P.left, 72); near(P.years, 6);
  // The PSLF row that pays least in all: RAP with PSLF, 72 x $231.25 = $16,650 against IBR's 72 x $263.
  assert.equal(P.row.id, 'rap-pslf'); near(P.paid, 72 * 231.25);
  const r = 0.055 / 12, f72 = (1 + r) ** 72;
  near(P.forgiven, 48000 * f72 - 281.25 * (f72 - 1) / r);
  assert.match(P.text, /48 qualifying payments counted of 120: 72 to go, about 6 years/);
  assert.doesNotMatch(P.text, VERDICT);
});

test('PSLF card: No and not answered give no forgiven amount, never a made-up one', () => {
  const doc = load('teacher');
  for (const d of doc.records.filter(x => x.type === 'Student loan')) d.values.pslf = 'No';
  const P = pslfOf(studentLoanPlans(doc, ref, { now }));
  assert.equal(P.employer, 'No'); assert.equal(P.forgiven, null); assert.equal(P.left, null);
  for (const d of doc.records.filter(x => x.type === 'Student loan')) delete d.values.pslf;
  const Q = pslfOf(studentLoanPlans(doc, ref, { now }));
  assert.equal(Q.forgiven, null); assert.deepEqual(Q.needs, ['whether your employer counts for PSLF']);
});

test('household size: the tapped size wins, else you, a spouse and dependents; IBR moves with it', () => {
  assert.equal(familyOf({}, true, 2), 4); assert.equal(familyOf({ loanFamilySize: 3 }, false, 0), 3);
  const doc = load('teacher');
  const a = studentLoanPlans(doc, ref, { now });
  doc.profile.loanFamilySize = 3;
  const b = studentLoanPlans(doc, ref, { now });
  assert.equal(b.s.familySize, 3); assert.equal(b.s.familyTyped, true);
  // IBR: 10% x ($55,500 - 1.5 x the line for 3) / 12.
  near(b.ibr, 0.1 * (55500 - 1.5 * povertyLine(3, ref)) / 12);
  assert.ok(b.ibr < a.ibr);
});

test('refinance (M8S): the person\'s own rate, a level payment, against the federal plan that pays least, with what is given up', () => {
  const R = studentLoanPlans(load('teacher'), ref, { now });
  assert.deepEqual(refiOf(R, {}, ref).needs, ['the rate a private lender offers you', 'how many years']);
  const F = refiOf(R, { rate: 0.045, years: 10 }, ref);
  const pay = levelPayment(48000, 0.045, 120); // $497.47
  near(F.payment, 48000 * (0.045 / 12) / (1 - (1 + 0.045 / 12) ** -120)); near(F.paid, pay * 120, 0.05);
  near(F.interest, pay * 120 - 48000, 0.05);
  const fed = R.rows.find(r => r.id === R.lowestTotal);
  near(F.diff, F.paid - (fed.paid + fed.tax));
  assert.ok(F.diff > 0, 'on PSLF the private loan pays more in all');
  assert.equal(F.pslfRow.id, 'rap-pslf');
  assert.match(F.gives[0], /PSLF: on it, \$42,789 would be forgiven tax-free after 72 more payments/);
  assert.match(F.gives.join(' '), /cannot be undone/);
  assert.doesNotMatch(`${F.text} ${F.gives.join(' ')}`, VERDICT);
});

test('stepladder rates: the table by school year, graduate +1.55% and PLUS +2.55%, matching the printed rates', () => {
  assert.equal(ladderRate('2024-25', 'ug', ref), 0.0653); assert.equal(ladderRate('2024-25', 'grad', ref), 0.0808); assert.equal(ladderRate('2024-25', 'plus', ref), 0.0908);
  assert.equal(ladderRate('2025-26', 'grad', ref), 0.0794); assert.equal(ladderRate('2026-27', 'grad', ref), 0.0807); assert.equal(ladderRate('2026-27', 'plus', ref), 0.0907);
  assert.equal(ladderRate('2022-23', 'plus', ref), 0.0754);
  assert.equal(ladderRate('2010-11', 'ug', ref), null, 'a year not in the table has no rate: the person types theirs');
});

test('stepladder (M8L): each year at its own rate, the interest before payments start, then 10 years each', () => {
  const L = stepladderOf([
    { year: '2021-22', level: 'ug', amount: 5500, subsidized: true },
    { year: '2022-23', level: 'ug', amount: 6500 },
    { year: '2023-24', level: 'ug', amount: 7500 },
    { year: '2024-25', level: 'ug', amount: 7500, rate: 0.06 },
  ], {}, ref);
  // Payments start 6 months after May 2025: Nov 2025. Sep 2022 to Nov 2025 is 38 months: 6,500 x 4.99% x 38 / 12.
  assert.equal(L.startYm, '2025-11');
  const [a, b, c, d] = L.rungs;
  assert.equal(a.before, 0, 'subsidized: no interest while in school'); assert.equal(b.months, 38);
  near(b.before, 6500 * 0.0499 * 38 / 12); near(c.before, 7500 * 0.055 * 26 / 12); near(d.before, 7500 * 0.06 * 14 / 12);
  assert.equal(d.own, true);
  near(L.before, b.before + c.before + d.before); near(L.owed, 27000 + L.before);
  near(L.blended, (5500 * 0.0373 + 6500 * 0.0499 + 7500 * 0.055 + 7500 * 0.06) / 27000, 1e-12);
  // Each rung: a level payment on what it owes over 120 months; its waiting interest is paid first, without interest on it.
  near(b.payment, levelPayment(6500 + b.before, 0.0499, 120));
  const run = repay({ balance: 6500, apr: 0.0499, payment: b.payment, months: 120, accrued: b.before }, ref);
  near(b.paid, run.paid); assert.ok(run.paidOff);
  near(L.payment, a.payment + b.payment + c.payment + d.payment);
  assert.doesNotMatch(L.text, VERDICT);
  assert.deepEqual(stepladderOf([{ year: '2010-11', amount: 5000 }], {}, ref).needs, ['the rate for 2010-11']);
  assert.equal(stepladderOf([{ year: '2024-25', amount: 5000 }], { gap: 0 }, ref).startYm, '2025-05');
});

test('repay with interest waiting: it is paid first and earns no interest itself', () => {
  // $1,000 at 12% (1% a month) with $50 waiting, paying $100: month 1 interest $10, the $60 waiting goes first, $40 off the principal.
  const r = repay({ balance: 1000, apr: 0.12, payment: 100, months: 1, accrued: 50 }, ref);
  near(r.forgiven, 960); near(r.paid, 100);
});
