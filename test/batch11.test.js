// SPDX-License-Identifier: AGPL-3.0-only
// Batch 11: the debt rule (one payoff date everywhere), Debt payoff unlock, the debt-free card, FOO names, credit
// health, a typed 0 is an answer, and the bring-back date in any time zone. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { applyFastTrack } from '../js/fasttrack.js';
import { metrics, debtHeroOf, debtRuleOf } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { scorecardOf } from '../js/math/scorecard.js';
import { ladderOf } from '../js/math/ladder.js';
import { compareOf } from '../js/math/proposed.js';
import { pictureOf, unlockOf } from '../js/math/picture.js';
import { debtFirstPlan, isHeavyDebt, creditHealth, debtFreeCard } from '../js/math/debt.js';
import { fiDate } from '../js/math/fi.js';
import { STEP_NAMES, STEP_CARDS, ORDER, stepHeadline, stepSub } from '../js/registry/foo.js';
import { RULES } from '../js/registry/assumptions.js';
import { parkedBack } from '../js/program.js';
import { soWhat } from '../js/sowhat.js';
import { addMonths, ymOf } from '../js/month.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
// Maya: $2,400 every 2 weeks, gut spending $3,500, $1,200 checking, $4,000 savings, $15,000 invested, $6,000 on cards
// paying $200 a month (APR a 25% guess), rents, no car, born 1996.
function maya(over = {}) {
  const s = new Store(newHousehold({ name: 'Maya Test', now: now.toISOString() }), { now: () => now.toISOString() });
  applyFastTrack(s, { firstName: 'Maya', birthMonth: 6, birthYear: 1996, household: 'Solo', takeHome: 2400, takePer: 'paycheck', payFrequency: '2 weeks', gut: 3500, gutIncludesDebt: true,
    checking: 1200, savings: 4000, invested: 15000, housing: 'Rent', hasCar: false, debts: { 'Credit card': { balance: 6000, payment: 200 } }, ...over }, { finished: true });
  return s;
}
const at = mo => addMonths(ymOf(now), mo);

test('item 1: one debt-free date for Maya on FOO, the debt row, Current vs Proposed, the ladder and the Debt free milestone', () => {
  const s = maya();
  const m = metrics(s.doc, ref, { now });
  assert.equal(m.inputs.surplus ?? m.surplus.value, 1700);
  assert.ok(m.debtRule.on && m.debtRule.toDebt === 1700, 'the surplus goes to heavy debt first by default');
  const months = m.debtPlan.months;
  assert.equal(months, 4, '$6,000 at 25% with $200 + $1,700 a month: 4 months');
  assert.equal(m.debtPlan.heavyMonths, 4);
  const F = foo(s.doc, ref, { now });
  assert.equal(F.steps.find(x => x.id === '3').date, at(months), 'FOO step 3');
  assert.equal(m.inputs.debts[0].planMonths, months, 'the card row');
  assert.equal(m.debts[0].planMonths, months, 'the card row (metrics debts)');
  const C = compareOf(s.doc, ref, { now });
  const row = C.rows.find(r => r.key === 'debtFree');
  assert.equal(row.current, at(months), 'Current vs Proposed');
  const L = ladderOf(s.doc, ref, { now });
  assert.equal(L.steps.find(x => x.id === 'heavyFree').date, at(months), 'the ladder');
  assert.equal(L.heavy.date, at(months));
  assert.equal(debtHeroOf(s.doc, m).months, months, 'Home');
  // The one-line note: at the $200 payment alone it is Nov 2030 (48 months).
  assert.equal(m.debtPlanMinimum.months, 48);
  assert.equal(m.debts[0].minimumMonths, 48);
});

test('item 1: the Scorecard ranks Debt above Retirement accounts while heavy debt takes the surplus', () => {
  const sc = scorecardOf(maya().doc, ref, { now });
  const ids = sc.holes.map(x => x.id);
  assert.ok(ids.indexOf('debt') < ids.indexOf('retirement'), ids.join());
  assert.ok(sc.holes.find(x => x.id === 'retirement').waits);
});

test('item 1: the FI date pays heavy debt first, then invests the surplus and the freed payments; the toggle and the copy follow it', () => {
  const s = maya();
  let m = metrics(s.doc, ref, { now });
  // Batch 12 (M79): freed money follows the FOO, so the 4 debt months are followed by 10 months filling big e.
  assert.deepEqual(m.investing.before, { months: 14, monthly: 0, heavyMonths: 4 });
  assert.equal(m.investing.monthly, 1900, '$1,700 surplus + the $200 freed card payment');
  const direct = fiDate({ invested: 15000, monthlyInvesting: 1900, realReturn: m.inputs.realReturn, target: m.fiNumber.value }, { before: { months: 14, monthly: 0 } });
  assert.equal(m.monthsToFi.value, direct.value);
  assert.match(m.monthsToFi.text, /14 months the surplus pays heavy debt first \(4\) and then fills big e \(10\)/);
  assert.match(soWhat('surplus', m).text, /goes to your heavy debt first/);
  assert.doesNotMatch(soWhat('savingsRate', m).text, /strong/);
  // Turned off: the surplus is invested from today and the debt keeps its own payment.
  s.setDoc('assumptions', { debtFirst: 0 });
  m = metrics(s.doc, ref, { now });
  assert.equal(m.debtRule.on, false);
  assert.equal(m.debtPlan.months, 48);
  assert.equal(m.investing.before, null);
  // No heavy debt: the rule is off by itself and Invest my surplus takes over.
  const t = maya({ debts: {} });
  const r = debtRuleOf(t.doc, metrics(t.doc, ref, { now }).inputs.debts);
  assert.equal(r.on, false); assert.equal(r.heavy, false);
  assert.equal(RULES.debtFirst, 1);
});

test('item 1: low-rate debt keeps its own payment after the heavy debt; the freed heavy payment is invested', () => {
  const plan = debtFirstPlan([
    { id: 'c', name: 'Card', type: 'Credit card', balance: 2000, apr: 0.25, payment: 100 },
    { id: 's', name: 'Student', type: 'Student loan', balance: 10000, apr: 0.05, payment: 200 },
  ], { surplus: 1000 });
  assert.equal(plan.debts.find(d => d.id === 'c').paidOffMonth, 2);
  assert.equal(plan.heavyMonths, 2);
  const student = plan.debts.find(d => d.id === 's');
  const alone = debtFirstPlan([{ id: 's', name: 'Student', type: 'Student loan', balance: 10000, apr: 0.05, payment: 200 }]);
  assert.equal(student.paidOffMonth, alone.debts[0].paidOffMonth, 'the surplus does not go to low-rate debt');
  assert.ok(isHeavyDebt({ type: 'Student loan', balance: 1, apr: 0.09 }) && !isHeavyDebt({ type: 'Student loan', balance: 1, apr: 0.05 }) && !isHeavyDebt({ type: 'Credit card', balance: 0, apr: 0.25 }));
});

test('item 2: Debt payoff unlocks with a balance and a payment, a guessed APR included', () => {
  const s = maya();
  assert.equal(unlockOf('payoff', pictureOf(s.doc, ref, { now })).unlocked, true);
  const e = new Store(newHousehold({ name: 'E', now: now.toISOString() }), { now: () => now.toISOString() });
  e.setDoc('profile', { areas: { debt: true } });
  assert.equal(unlockOf('payoff', pictureOf(e.doc, ref, { now })).unlocked, false);
});

test('item 3: the debt-free card: one date, what goes to debt, what-ifs that move it, milestones with dollars left', () => {
  const s = maya();
  const m = metrics(s.doc, ref, { now });
  const c = debtHeroOf(s.doc, m);
  assert.equal(c.months, 4); assert.equal(c.monthly, 1900);
  assert.deepEqual(c.marks.map(k => k.id), ['quarter', 'half', 'free'], 'one debt: no first-debt mark');
  assert.equal(c.next.id, 'quarter'); assert.equal(c.next.left, 1500);
  const w = Object.fromEntries(c.whatIf.map(x => [x.extra, x]));
  // Batch 12 (item 4): a 4-month plan gets +5% / +10% / +25% of the $1,900 (rounded to $10).
  assert.deepEqual(c.whatIf.map(x => x.extra), [100, 190, 480]);
  assert.ok(w[480].months < c.months, '+$480 is a month sooner');
  assert.ok(w[100].interestSaved > 0 && w[100].lastPayment < c.lastPayment, '+$100 lands in the same month with less interest and a smaller last payment');
  assert.equal(s.doc.settings.debtExtra, undefined, 'a what-if saves nothing');
  // A longer plan: +$100 is an earlier month.
  const slow = maya({ takeHome: 1700 });
  const ms = metrics(slow.doc, ref, { now });
  const cs = debtHeroOf(slow.doc, ms);
  assert.ok(cs.whatIf.find(x => x.extra === 100).months < cs.months, `+$100: ${cs.whatIf.find(x => x.extra === 100).months} vs ${cs.months}`);
  // Two debts: the first paid off is a milestone.
  const two = debtFreeCard(debtFirstPlan([{ id: 'a', name: 'A', type: 'Credit card', balance: 1000, apr: 0.2, payment: 50 }, { id: 'b', name: 'B', type: 'Credit card', balance: 3000, apr: 0.25, payment: 90 }], { surplus: 500 }));
  assert.deepEqual(two.marks.map(k => k.id), ['quarter', 'half', 'first', 'free']);
  // Made the plan: the extra counts everywhere.
  s.setDoc('settings', { debtExtra: 480 });
  assert.equal(metrics(s.doc, ref, { now }).debtPlan.months, w[480].months);
});

test('item 4: every FOO step has one name, said three ways, and the old names are gone from the code', () => {
  assert.deepEqual(Object.keys(STEP_NAMES).sort(), [...ORDER].sort());
  const F = foo(maya().doc, ref, { now });
  for (const st of F.steps) { assert.equal(st.name, stepHeadline(st.id)); assert.equal(STEP_CARDS[st.id].short, st.name); assert.equal(STEP_CARDS[st.id].full, stepSub(st.id)); }
  assert.equal(stepSub('1'), 'Stop the Bleeding · Spend less than you make; little e = $1,000 or your highest deductible, whichever is smaller');
  assert.equal(STEP_NAMES['3'].get, 'That interest stops, and those payments become yours');
  const walk = dir => readdirSync(new URL(`../${dir}`, import.meta.url)).flatMap(f => (statSync(new URL(`../${dir}/${f}`, import.meta.url)).isDirectory() ? walk(`${dir}/${f}`) : f.endsWith('.js') ? [`${dir}/${f}`] : []));
  const old = [/Kill Heavy Debt/, /Clear the heavy debt/, /Bedazzle your basic life/, /Roth and HSA/, /short: 'Joy Basics'/, /short: 'Tax-Free Growth'/];
  for (const f of walk('js')) { const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'); for (const re of old) assert.doesNotMatch(src, re, `${f} still says ${re}`); }
  assert.match(readFileSync(new URL('../js/registry/foo.js', import.meta.url), 'utf8'), /Oxygen mask on you first/);
});

test('item 5c: a Fast Track card total typed with a payment carries a balance', () => {
  const card = maya().doc.records.find(r => r.type === 'Credit card');
  assert.equal(card.values.payChoice, 'Custom');
  const paid = maya({ debts: { 'Credit card': { balance: 900, payment: null } } }).doc.records.find(r => r.type === 'Credit card');
  assert.equal(paid.values.payChoice, undefined, 'no payment typed: still asked');
});

test('item 6: credit health: utilization per card and overall, oldest and average age, inquiries, the freeze', () => {
  const H = creditHealth([{ id: 'a', name: 'A', balance: 500, limit: 2000, opened: '2016-11' }, { id: 'b', name: 'B', balance: 1500, limit: 3000, opened: '2022-11' }, { id: 'c', name: 'C', balance: 0 }],
    { now, inquiries: 2, freeze: { Equifax: true, Experian: false } });
  assert.deepEqual(H.per.map(p => p.util), [0.25, 0.5, null]);
  assert.equal(H.overall, 2000 / 5000);
  assert.equal(H.oldestMonths, 120); assert.equal(H.averageMonths, 84);
  assert.equal(H.inquiries, 2); assert.deepEqual(H.frozen, ['Equifax']); assert.deepEqual(H.thawed, ['Experian']);
});

test('item 9: a typed 0 is an answer: invested, cash or debts at 0 still give an FI date; only blank locks it', () => {
  for (const over of [{ invested: 0 }, { invested: 0, checking: 0, savings: 0 }, { invested: 0, debts: {} }]) {
    const s = maya(over);
    const m = metrics(s.doc, ref, { now });
    assert.equal(m.inputs.invested, 0, JSON.stringify(over));
    assert.ok(m.monthsToFi.value != null, `${JSON.stringify(over)}: FI date ${m.monthsToFi.text}`);
    assert.equal(unlockOf('fi', pictureOf(s.doc, ref, { now })).unlocked, true);
    assert.notEqual(s.doc.profile.areas.investments, false, 'the area stays on');
  }
  assert.equal(metrics(maya({ invested: 0, checking: 0, savings: 0 }).doc, ref, { now }).inputs.cash, 0);
  // With heavy debt the FI date is the debt-first one.
  const m = metrics(maya({ invested: 0 }).doc, ref, { now });
  assert.equal(m.investing.before.heavyMonths, 4);
  // An area answered "none" on About you is a real $0 too.
  const s = new Store(newHousehold({ name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });
  s.setDoc('profile', { birthYear: 1996, areas: { investments: false, cash: false, debt: false } });
  s.add('income', { name: 'Pay', amount: 4000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  s.add('spending', { name: 'All in', amount: 3000 }, { type: 'All in' });
  const z = metrics(s.doc, ref, { now });
  assert.equal(z.inputs.invested, 0); assert.equal(z.inputs.cash, 0); assert.ok(z.monthsToFi.value != null);
  // Blank stays missing.
  const b = maya({ invested: null });
  assert.equal(metrics(b.doc, ref, { now }).inputs.invested, null);
});

test('item 8: a bring-back date is the same day in every time zone', () => {
  const p = { back: { kind: 'date', date: '2027-01-15' }, atSession: 1 };
  assert.equal(parkedBack(p, { n: 1, now: new Date('2027-01-15T11:59:00Z') }).due, false);
  assert.equal(parkedBack(p, { n: 1, now: new Date('2027-01-15T12:00:00Z') }).due, true);
  assert.equal(parkedBack(p, { n: 1, now }).when, 'Jan 15, 2027');
});
