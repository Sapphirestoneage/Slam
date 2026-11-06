// SPDX-License-Identifier: AGPL-3.0-only
// Batch 15: household tax once, couples keeping money apart, quarterly estimates, materiality at the real wage, the
// promo payoff, known changes ahead, the FI range cap, Quiet Quitting FI said plainly (and only on real numbers), the
// Bills list, community presets on About you, the irregular income plan, the outsourcing check and unemployment
// benefits. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, newHousehold } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { setHouseholdMode } from '../js/couples.js';
import { householdTax, quarterlySetAside, irregularPlan, benefitWeeksThisYear } from '../js/math/income.js';
import { promoPayoffOf } from '../js/math/debt.js';
import { changeWords } from '../js/math/changes.js';
import { materialityOf, outsourceCheck } from '../js/math/time.js';
import { fiWordsOf } from '../js/math/picture.js';
import { foo } from '../js/math/foo.js';
import { ladderOf } from '../js/math/ladder.js';
import { next3 } from '../js/plan.js';
import { agendaOf } from '../js/program.js';
import { instances, recurringBills } from '../js/month.js';
import { paydayOf } from '../js/payday.js';
import { search } from '../js/nav.js';
import { COMMUNITIES, setCommunityOn } from '../js/community.js';
import { ownPlanPerson } from '../js/registry/couples.js';
import { RULES } from '../js/registry/assumptions.js';
import { buildWorkbook } from '../js/sheet/workbook.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const fresh = () => new Store(newHousehold({ name: 'Batch 15', now: now.toISOString() }), { now: () => now.toISOString() });
const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
const jobs = (rows, profile = {}) => {
  const s = fresh();
  s.transaction('x', () => { s.setDoc('profile', profile); for (const [gross, type, extra] of rows) s.add('income', { name: `${type} ${gross}`, amount: gross, per: 'year', ...(extra?.top || {}), values: { basis: 'Gross', ...(extra?.values || {}) } }, { type }); });
  return s;
};

// ---------- 1. Household tax once ----------
test('item 1: two W-2 jobs of $60,000 and $40,000 for one single filer pay the same tax as one $100,000 job', () => {
  for (const place of [{}, { state: 'NY' }, { state: 'NY', nyc: true }]) {
    const two = metrics(jobs([[60000, 'Job'], [40000, 'Job']], place).doc, ref, { now }), one = metrics(jobs([[100000, 'Job']], place).doc, ref, { now });
    const a = two.inputs.householdTax.total, b = one.inputs.householdTax.total;
    for (const k of ['federal', 'state', 'local', 'fica']) assert.ok(near(a[k], b[k], 0.01), `${JSON.stringify(place)} ${k}: ${a[k]} vs ${b[k]}`);
    assert.ok(near(two.inputs.takeHome, one.inputs.takeHome, 0.01), 'and the same take-home');
    const rows = two.inputs.income.map(i => i.tax.total);
    assert.ok(near(rows[0] + rows[1], a.all, 0.01), 'the rows add up to the return');
    assert.ok(rows[1] / 40000 > rows[0] / 60000 - 1e-9, 'the second job shows the rate it really pays (stacked on top)');
  }
});

test('item 1: Social Security stops at the wage base per person; a joint return is one, apart it is one each', () => {
  const big = jobs([[150000, 'Job'], [100000, 'Job']]);
  const t = metrics(big.doc, ref, { now }).inputs.householdTax;
  const ss = Object.values(t.rows).reduce((s2, r) => s2 + r.socialSecurity, 0);
  assert.ok(near(ss, ref.tax.socialSecurityWageBase * ref.tax.socialSecurityRate, 0.01), 'one person: Social Security on the wage base only');
  // Two people, each $150,000: each pays to the wage base.
  const rows = [{ id: 'a', person: 'Me', gross: 150000, pretax: 0, taxType: 'W-2' }, { id: 'b', person: 'Partner', gross: 150000, pretax: 0, taxType: 'W-2' }];
  const joint = householdTax(rows, { filingStatus: 'Married jointly' }, ref), apart = householdTax(rows, { filingStatus: 'Single' }, ref);
  assert.ok(near(joint.rows.a.socialSecurity, 150000 * 0.062, 0.01) && near(joint.rows.b.socialSecurity, 150000 * 0.062, 0.01));
  assert.equal(Object.keys(joint.units).length, 1);
  assert.equal(Object.keys(apart.units).length, 2);
  assert.ok(near(apart.rows.a.federal, apart.rows.b.federal, 0.01), 'two single returns, the same tax each');
});

test('item 1: a job typed as take-home keeps what was typed; the gap between its share and what it holds back shows', () => {
  const s = fresh();
  s.add('income', { name: 'Main job', amount: 4200, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  s.add('income', { name: 'Weekend job', amount: 1500, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  const x = metrics(s.doc, ref, { now }).inputs;
  assert.equal(x.takeHome, 5700);
  assert.ok(x.income[0].due < 1, 'the first job holds back its own tax');
  assert.ok(x.income[1].due > 100, `the second job is under-held: ${x.income[1].due}`);
});

// ---------- 2. Couples, separate money ----------
function apart(mode = 'Living together') {
  const s = fresh();
  s.transaction('x', () => {
    s.setDoc('profile', { firstName: 'Ada', partnerName: 'Bo', age: 31, splitMethod: '50/50' });
    s.add('income', { name: 'Ada job', amount: 5000, per: 'month', owner: 'Me', values: {} }, { type: 'Job' });
    s.add('income', { name: 'Bo job', amount: 4000, per: 'month', values: {} }, { type: 'Partner job' });
    s.add('bill', { name: 'Rent', amount: 2400, owner: 'Joint', values: { category: 'Rent or mortgage', amountType: 'Fixed', draftt: 'Accommodation' } });
    s.add('bill', { name: 'Ada food', amount: 600, owner: 'Me', values: { category: 'Groceries', draftt: 'Food' } });
    s.add('bill', { name: 'Bo food', amount: 500, owner: 'Partner', values: { category: 'Groceries', draftt: 'Food' } });
    s.add('account', { name: 'Ada checking', owner: 'Me', values: { group: 'cash', balance: 2000 } }, { type: 'Checking' });
    s.add('account', { name: 'Bo checking', owner: 'Partner', values: { group: 'cash', balance: 1500 } }, { type: 'Checking' });
  });
  setHouseholdMode(s, mode);
  s.setDoc('spending', { source: 'lines' });
  return s;
}
test('item 2: money kept apart with one shared rent: each person has their own numbers, the household adds up with no double count', () => {
  for (const mode of ['Dating', 'Living together', 'Married separate']) {
    const s = apart(mode);
    const all = metrics(s.doc, ref, { now }), me = metrics(s.doc, ref, { now, person: 'Me' }), bo = metrics(s.doc, ref, { now, person: 'Partner' });
    assert.equal(all.inputs.spending, 3500, `${mode}: household spending, rent once`);
    assert.equal(me.inputs.spending, 1200 + 600);
    assert.equal(bo.inputs.spending, 1200 + 500);
    assert.equal(me.surplus.value + bo.surplus.value, all.surplus.value, `${mode}: the two surpluses add up to the household`);
    assert.equal(me.netWorth.value + bo.netWorth.value, all.netWorth.value);
  }
  // A rent typed on one person's row as Split works the same way.
  const s = apart('Living together');
  const rent = s.find(r => r.name === 'Rent')[0];
  s.update(rent.id, { whoPays: 'Split', amountIs: 'The whole bill' });
  s.doc.records.find(r => r.id === rent.id).owner = 'Me';
  assert.equal(metrics(s.doc, ref, { now }).inputs.spending, 3500);
  assert.equal(metrics(s.doc, ref, { now, person: 'Partner' }).inputs.spending, 1700, 'Bo pays his half though the row is Ada\'s');
});
test('item 2: a payment to the partner and money from the partner stay in each view and leave the household view', () => {
  const s = apart('Living together');
  s.add('bill', { name: 'My half of the internet to Bo', amount: 40, owner: 'Me', values: { category: 'Internet', toPartner: 'Yes', amountType: 'Fixed' } });
  s.add('income', { name: 'From Ada', amount: 40, per: 'month', owner: 'Partner', values: {} }, { type: 'From partner' });
  const all = metrics(s.doc, ref, { now }), me = metrics(s.doc, ref, { now, person: 'Me' }), bo = metrics(s.doc, ref, { now, person: 'Partner' });
  assert.equal(all.inputs.takeHome, 9000, 'no transfer in household income');
  assert.equal(all.inputs.spending, 3500, 'no transfer in household spending');
  assert.equal(me.inputs.spending, 1840);
  assert.equal(bo.inputs.takeHome, 4040);
  assert.equal(me.surplus.value + bo.surplus.value, all.surplus.value);
});
test('item 2 (F-GUT, question 212): two gut numbers add up, and Dating or Living together defaults to this client\'s own plan', () => {
  const s = apart('Living together');
  s.setDoc('spending', { source: 'gut' });
  s.add('spending', { name: 'Ada gut', amount: 3200, owner: 'Me', values: {} }, { type: 'All in' });
  s.add('spending', { name: 'Bo gut', amount: 2100, owner: 'Partner', values: {} }, { type: 'All in' });
  assert.equal(metrics(s.doc, ref, { now }).inputs.spending, 5300, 'both gut numbers, not the first one');
  assert.equal(metrics(s.doc, ref, { now, person: 'Me' }).inputs.spending, 3200);
  assert.equal(ownPlanPerson(s.doc), 'Me');
  s.setDoc('settings', { person: 'Partner' });
  assert.equal(ownPlanPerson(s.doc), 'Partner', 'the partner\'s plan is a switch');
  setHouseholdMode(s, 'Married separate');
  assert.equal(ownPlanPerson(s.doc), null, 'a mode with household totals shows the household');
});

// ---------- 3. Quarterly estimates ----------
test('item 3: quarterly set-aside from the real rates with SE tax in, and the four due dates on the calendar', () => {
  const s = jobs([[70000, 'Job'], [30000, 'Side hustle']], { state: 'NY' });
  const x = metrics(s.doc, ref, { now }).inputs;
  const q = quarterlySetAside(x.householdTax, ref, { year: 2026 });
  const se = 30000 * 0.9235 * 0.153;
  assert.ok(q.yearly > se, 'income tax on top of the SE tax');
  assert.ok(q.rate > 0.3 && q.rate < 0.45, `a real rate, not 25%: ${q.rate}`);
  assert.deepEqual(q.due, ['2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15']);
  const jan = instances(s.doc, ref, '2027-01', { now }).filter(i => i.kind === 'tax');
  assert.equal(jan.length, 1);
  assert.equal(jan[0].date, '2027-01-15');
  assert.ok(near(-jan[0].planned, q.quarterly, 0.01));
  assert.equal(instances(s.doc, ref, '2027-02', { now }).filter(i => i.kind === 'tax').length, 0);
});

// ---------- 4. Materiality ----------
test('item 4: a task is worth doing when its dollars beat the hours at the real hourly wage, never under $100', () => {
  assert.equal(materialityOf({ value: 20 }).value, RULES.materialFloor);
  assert.equal(materialityOf({ value: 90 }).value, 90 * RULES.materialHours);
  assert.equal(materialityOf(null).value, 100);
  const s = fresh();
  s.transaction('x', () => {
    s.add('income', { name: 'Job', amount: 30000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
    s.add('bill', { name: 'Stamps', amount: 12, per: 'month', status: 'Not sure', values: { category: 'Other' } }); // $144 a year
  });
  const n = next3(s.doc, ref, { now });
  assert.ok(n.material.value > 144, `$30,000 a month: two hours is worth ${n.material.value}`);
  assert.ok(n.small.some(c => /Stamps/.test(c.label)), 'so the $144 line is a small win');
});

// ---------- 5. Promo payoff ----------
test('item 5: a 0% promo with an end date says what clears it in time, on the card and as a suggestion', () => {
  const s = fresh();
  const card = s.add('debt', { name: 'Promo card', values: { balance: 2400, apr: 0.27, promoApr: 0, promoEnd: '2027-05', payChoice: 'Custom', payment: 100 } }, { type: 'Credit card' });
  const p = promoPayoffOf(card, now);
  assert.equal(p.monthly, 400);
  assert.equal(p.text, 'Pay $400 a month to clear it before the promo ends (May 2027)');
  assert.ok(agendaOf(s.doc, ref, { now }).suggestions.some(x => x.kind === 'promo' && /\$400 a month/.test(x.label)));
  s.update(card.id, { promoApr: 0.05 });
  assert.equal(promoPayoffOf(s.get(card.id), now), null, 'not a 0% promo');
});

// ---------- 6. Known changes ahead ----------
function base() {
  const s = fresh();
  s.transaction('x', () => {
    s.setDoc('profile', { age: 30 });
    s.add('income', { name: 'Job', amount: 5000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
    s.add('bill', { name: 'Rent', amount: 1500, values: { category: 'Rent or mortgage', amountType: 'Fixed', dueDay: 1 } });
    s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 20000 } }, { type: 'Brokerage' });
  });
  s.setDoc('spending', { source: 'lines' });
  return s;
}
test('item 6: a phone the parents pay until a date adds to spending from then in the FI date, the ladder and the calendar', () => {
  const s = base();
  const before = metrics(s.doc, ref, { now });
  s.add('bill', { name: 'Phone', amount: 90, values: { category: 'Phone', amountType: 'Fixed', dueDay: 20, whoPays: 'Covered by someone', coveredBy: 'Parents', takeover: '2027-03' } });
  const m = metrics(s.doc, ref, { now });
  assert.equal(m.inputs.spending, before.inputs.spending, 'today\'s spending is the same');
  assert.equal(m.inputs.changes.length, 1);
  assert.equal(m.inputs.changes[0].at, 4);
  assert.ok(m.fiNumber.value > before.fiNumber.value, 'the phone stays in retirement spending');
  assert.ok(m.monthsToFi.value > before.monthsToFi.value, 'the FI date moves later');
  assert.equal(changeWords(m.inputs.changes[0]), 'Phone becomes yours Mar 2027: your month changes by -$90');
  assert.ok(!instances(s.doc, ref, '2027-02', { now }).some(i => i.name === 'Phone'), 'not on the calendar before');
  assert.ok(instances(s.doc, ref, '2027-03', { now }).some(i => i.name === 'Phone' && i.planned === -90), 'on it from then');
  const fiMarker = ladderOf(s.doc, ref, { now }).markers.find(k => k.id === 'fi');
  assert.equal(fiMarker.months, m.monthsToFi.value, 'the ladder reads the same date');
});
test('item 6: a known future cost (Starts in) is a registered field, out of today\'s spending and in every projection', async () => {
  const { AREAS } = await import('../js/registry/fields.js');
  assert.ok(AREAS.find(a => a.id === 'spending').fields.some(f => f.key === 'startsIn' && f.sheet === true));
  const s = base();
  const before = metrics(s.doc, ref, { now });
  s.add('bill', { name: 'Health insurance', amount: 800, values: { category: 'Health insurance', amountType: 'Fixed', dueDay: 1, startsIn: '2027-07' } });
  const m = metrics(s.doc, ref, { now });
  assert.equal(m.inputs.spending, before.inputs.spending);
  assert.equal(m.inputs.laterSpending, 800);
  assert.ok(m.monthsToFi.value > before.monthsToFi.value);
  assert.ok(instances(s.doc, ref, '2027-07', { now }).some(i => i.name === 'Health insurance'));
  assert.ok(!instances(s.doc, ref, '2027-06', { now }).some(i => i.name === 'Health insurance'));
});

// ---------- 7. FI range cap ----------
test('item 7: a range wider than the cap shows the one step that narrows it; the math is unchanged', () => {
  const s = base();
  const m = metrics(s.doc, ref, { now });
  const w = fiWordsOf(m, { word: 'Low', range: 0.6, weak: ['Take-home pay', 'Monthly spending'] }, { now });
  assert.equal(w.kind, 'wide');
  assert.equal(w.text, 'Add take-home pay and monthly spending to see a date');
  assert.ok(w.low < m.monthsToFi.value, 'the range is still worked out');
  const narrow = fiWordsOf(m, { word: 'Medium', range: 0.01, weak: [] }, { now });
  assert.notEqual(narrow.kind, 'wide');
});

// ---------- 8. Quiet Quitting FI ----------
test('item 8: past Quiet Quitting FI is said plainly; blank balances and blank debts never count as wins', () => {
  const s = base();
  s.update(s.find(r => r.name === 'Brokerage')[0].id, { balance: 600000 });
  const f = foo(s.doc, ref, { now });
  assert.equal(f.qq.reached, true);
  assert.equal(f.qq.reachedText, "You've already reached Quiet Quitting FI: just the Roth IRA each year gets you there.");
  // A real household's shape: every invested balance blank, a $625 a month Roth, a blank student loan.
  const b = fresh();
  b.transaction('x', () => {
    b.setDoc('profile', { age: 30, areas: { debt: true, investments: true } });
    b.add('income', { name: 'Job', amount: 5000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
    b.add('spending', { name: 'Gut', amount: 3000, values: {} }, { type: 'All in' });
    b.add('account', { name: 'Roth IRA', values: { group: 'investment', balance: null, contribution: 625, contributionPer: 'Month' } }, { type: 'Roth IRA' });
    b.add('account', { name: '401(k)', values: { group: 'investment', balance: null } }, { type: '401(k)' });
    b.add('debt', { name: 'Student loan', values: { balance: null, apr: 0.05, payment: 200 } }, { type: 'Student loan' });
  });
  const L = ladderOf(b.doc, ref, { now });
  assert.ok(!L.markers.find(k => k.id === 'qq')?.reached, 'Quiet Quitting FI is not known yet');
  assert.ok(!L.markers.find(k => k.kind === 'consumerFree')?.reached, 'consumer debt free is not known yet');
  assert.ok(!foo(b.doc, ref, { now }).qq.reached);
});

// ---------- 9. The Bills list ----------
test('item 9: one list of repeating charges by next date, with how often, paid with and Keep or Try to cut; Find reaches it', () => {
  const s = fresh();
  s.transaction('x', () => {
    const chk = s.add('account', { name: 'Chase checking', values: { group: 'cash', balance: 1000 } }, { type: 'Checking' });
    s.add('bill', { name: 'Netflix', amount: 15.49, paidWith: chk.id, values: { category: 'Subscriptions', draftt: 'Bills', amountType: 'Fixed', dueDay: 9 } });
    s.add('bill', { name: 'Rent', amount: 1500, values: { category: 'Rent or mortgage', amountType: 'Fixed', dueDay: 1 } });
    s.add('bill', { name: 'Groceries', amount: 500, values: { category: 'Groceries', amountType: 'Variable' } });
    s.add('bill', { name: 'Car registration', amount: 120, per: 'year', values: { irregular: true, monthDue: 3, dueDay: 2, amountType: 'Fixed' } });
    s.add('debt', { name: 'Car loan', values: { balance: 9000, apr: 0.07, payment: 300, dueDay: 20 } }, { type: 'Car loan' });
    s.add('coverage', { name: 'Renters', amount: 18, per: 'month', values: { have: 'Have it', paidFrom: 'Budget', dueDay: 12 } }, { type: 'Renters or home' });
  });
  const b = recurringBills(s.doc, ref, now);
  assert.deepEqual(b.items.map(i => i.name), ['Netflix', 'Renters premium', 'Car loan payment', 'Rent', 'Car registration']);
  assert.deepEqual(b.items.map(i => i.next), ['2026-11-09', '2026-11-12', '2026-11-20', '2026-12-01', '2027-03-02']);
  assert.equal(b.items[0].paidWith, 'Chase checking');
  assert.equal(b.items[4].often, 'Yearly');
  assert.equal(b.items.find(i => i.kind === 'debt').cut, false, 'a debt payment is owed, not cut');
  s.update(b.items[0].id, { decision: 'Cancel' });
  assert.ok(near(recurringBills(s.doc, ref, now).toCut, 15.49, 0.001));
  for (const q of ['bills', 'subscriptions', 'recurring']) assert.equal(search(q)[0]?.route, '#/cash-flow/calendar?view=bills', q);
});

// ---------- 10. Community presets ----------
test('item 10: the community presets are one switch shared by About you and Coach tools, with room for more', () => {
  assert.ok(COMMUNITIES.length >= 1 && COMMUNITIES.every(c => c.id && c.label && c.key && c.adds.length));
  const s = fresh();
  setCommunityOn(s, true);
  assert.equal(s.doc.session.community, true);
  assert.equal(s.find(r => r.kind === 'bill' && r.values.community).length, 2, 'yom tov and Pesach, blank amounts');
  setCommunityOn(s, true);
  assert.equal(s.find(r => r.kind === 'bill' && r.values.community).length, 2, 'never twice');
  setCommunityOn(s, false);
  assert.equal(s.doc.session.community, false);
});

// ---------- 11. Irregular income ----------
test('item 11: base month, good month, where the extra goes, and a lean-season fund sized from the swing', () => {
  const p = irregularPlan({ lowestMonth: 2000, typicalMonth: 4000, setAside: 0.25 }, ref);
  assert.equal(p.base, 1500);
  assert.equal(p.good, 3000);
  assert.equal(p.extra, 1500);
  assert.equal(p.fund, 1500 * RULES.leanSeasonMonths);
  const months = [4000, 4000, 2000, 3000, 4000, 5000, 4000, 4000, 2500, 4000, 4000, 4000];
  const q = irregularPlan({ lowestMonth: 2000, typicalMonth: 4000, months, setAside: 0.25 }, ref);
  assert.equal(q.fund, (2000 + 1000 + 1500) * 0.75, 'twelve months typed: the shortfalls added up');
});

// ---------- 12. Outsourcing ----------
test('item 12: a service against the hours it saves at the real hourly wage', () => {
  const r = outsourceCheck({ cost: 160, hoursSaved: 6 }, { value: 40 });
  assert.equal(r.value, 80);
  assert.equal(r.worth, 240);
  assert.equal(outsourceCheck({ cost: 160, hoursSaved: 6 }, { value: 20 }).value, -40);
  assert.ok(outsourceCheck({ cost: null, hoursSaved: 6 }, { value: 20 }).needs.length);
});

// ---------- 13. Unemployment benefits ----------
function benefits() {
  const s = fresh();
  s.transaction('x', () => {
    s.setDoc('profile', { age: 34, state: 'NY' });
    s.add('income', { name: 'NY unemployment', amount: ref.limits.unemployment.NY.maxWeekly, per: 'week', values: { payFrequency: 'week', benefitStart: '2026-10-01', benefitEnd: '2026-12-31' } }, { type: 'Unemployment' });
    s.add('spending', { name: 'Gut', amount: 2500, values: {} }, { type: 'All in' });
    s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 40000 } }, { type: 'Brokerage' });
    s.add('account', { name: 'Checking', values: { group: 'cash', balance: 3000 } }, { type: 'Checking' });
  });
  return s;
}
test('item 13: $869 a week ending in 8 weeks: the monthly take-home now, taxed with no FICA, the drop on the calendar and in the FI date', () => {
  assert.equal(ref.limits.unemployment.NY.maxWeekly, 869);
  const s = benefits();
  const m = metrics(s.doc, ref, { now });
  const i = m.inputs.income[0];
  assert.ok(near(m.inputs.takeHome, 869 * 52 / 12, 0.01), `take-home ${m.inputs.takeHome}`);
  assert.equal(i.tax.fica, 0, 'no FICA');
  assert.ok(i.tax.state > 0 && i.tax.federal >= 0, 'NY income tax (13 weeks this year sit under the federal standard deduction)');
  assert.equal(i.withheld, 0, 'nothing withheld unless chosen');
  assert.ok(near(i.due, i.tax.total, 0.01), 'due when you file');
  assert.equal(benefitWeeksThisYear({ start: '2026-10-01', end: '2026-12-31', now }), 13);
  // The 10% withholding when chosen.
  s.update(i.r.id, { withhold: 'Yes' });
  assert.ok(near(metrics(s.doc, ref, { now }).inputs.takeHome, 869 * 52 / 12 * 0.9, 0.01));
  s.update(i.r.id, { withhold: 'No' });
  // Calendar: weekly in December, none in January.
  const dec = instances(s.doc, ref, '2026-12', { now }).filter(x => x.kind === 'income');
  assert.ok(dec.length >= 4 && dec.every(x => near(x.planned, 869, 0.01)), 'weekly, $869 each');
  assert.equal(instances(s.doc, ref, '2027-01', { now }).filter(x => x.kind === 'income').length, 0, 'gone after the end date');
  // Projections: the change and its one line.
  const c = m.inputs.changes.find(x => x.kind === 'benefitEnd');
  assert.equal(c.ym, '2027-01');
  assert.equal(changeWords(c), `Benefits end Jan 2027: your month changes by -$${Math.round(869 * 52 / 12).toLocaleString()}`);
  const without = benefits();
  without.update(without.find(r => r.kind === 'income')[0].id, { benefitEnd: null });
  const m2 = metrics(without.doc, ref, { now });
  assert.ok(m.monthsToFi.never || m.monthsToFi.value > m2.monthsToFi.value, 'the FI date drops once the benefits end');
});

// ---------- Persona follow-ups ----------
test('question 214 (F-529): a 529 or a Goal account stays in net worth and out of the FI path', () => {
  const s = base();
  const before = metrics(s.doc, ref, { now });
  s.add('account', { name: 'Baby 529', values: { group: 'investment', balance: 8000, contribution: 200, contributionPer: 'Month' } }, { type: '529' });
  const m = metrics(s.doc, ref, { now });
  assert.equal(m.netWorth.value, before.netWorth.value + 8000);
  assert.equal(m.inputs.invested, before.inputs.invested, 'not FI money');
  assert.equal(m.investing.monthly, before.investing.monthly - 200, 'its $200 a month is not retirement money');
});
test('the Home paycheck line uses the household\'s pay when there are several paychecks', () => {
  const s = base();
  s.add('income', { name: 'Partner part-time', amount: 1200, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks', nextPayday: '2026-11-13' } }, { type: 'Partner job' });
  s.update(s.find(r => r.name === 'Job')[0].id, { payFrequency: 'twice a month', payDays: [15, 30] });
  const d = paydayOf(s.doc, ref, now);
  assert.ok(d.several);
  assert.ok(near(d.period.in, 6200 / 2, 0.01), `the household's $6,200 over two paychecks a month: ${d.period.in}`);
  assert.ok(near(d.period.fixed, 1500 / 2, 0.01));
});

// ---------- The workbook: the household's tax in formulas ----------
// Every Check cell under the Math header that is not Matches (or From the app); the same reading as workbook.test.js.
function offChecks(ws, off = []) {
  let col = null;
  ws.eachRow((row, n) => {
    const vals = row.values;
    if (vals.includes('Check')) { col = vals.indexOf('Check'); return; }
    if (!col) return;
    const v = row.getCell(col).value;
    const shown = v && typeof v === 'object' ? v.result ?? v.error : v;
    if (shown != null && shown !== 'Matches' && shown !== 'From the app') off.push(`${ws.name} row ${n} (${row.getCell(1).value}): ${JSON.stringify(shown)} sheet ${JSON.stringify(row.getCell(3).value?.result ?? row.getCell(3).value)} app ${JSON.stringify(row.getCell(4).value)}`);
  });
  return off;
}
let ExcelJS = null;
try { ExcelJS = (await import('exceljs')).default; } catch { /* not installed */ }
const soffice = ['/usr/bin/soffice', '/usr/local/bin/soffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice'].find(p => existsSync(p));
test('item 1 and 13: opened in a spreadsheet, the household tax formulas give the app\'s numbers (two jobs, a 1099, unemployment, NY and NYC, a couple)', { skip: (!ExcelJS || !soffice) && 'needs ExcelJS and LibreOffice', timeout: 180000 }, async () => {
  const { workbookBuffer } = await import('../js/sheet/excel.js');
  for (const filing of [null, 'Married jointly']) {
    const s = fresh();
    s.transaction('x', () => {
      s.setDoc('profile', { firstName: 'Ada', partnerName: 'Bo', age: 40, state: 'NY', nyc: true, filingStatus: filing });
      s.add('income', { name: 'Ada main', amount: 150000, per: 'year', owner: 'Me', values: { basis: 'Gross', payFrequency: '2 weeks' } }, { type: 'Job' });
      s.add('income', { name: 'Ada second', amount: 60000, per: 'year', owner: 'Me', values: { basis: 'Gross', payFrequency: 'month' } }, { type: 'Job' });
      s.add('income', { name: 'Ada side', amount: 30000, per: 'year', owner: 'Me', values: { basis: 'Gross', payFrequency: 'month' } }, { type: 'Side hustle' });
      s.add('income', { name: 'Bo job', amount: 4000, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks' } }, { type: 'Partner job' });
      s.add('income', { name: 'Bo unemployment', amount: 600, per: 'week', owner: 'Partner', values: { payFrequency: 'week', benefitEnd: '2026-12-31' } }, { type: 'Unemployment' });
      s.add('spending', { name: 'Gut', amount: 9000, values: {} }, { type: 'All in' });
      s.add('bill', { name: 'Rent', amount: 3000, owner: 'Joint', values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', dueDay: 1 } });
      s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 50000 } }, { type: 'Brokerage' });
    });
    setHouseholdMode(s, 'Married separate');
    const dir = mkdtempSync(join(tmpdir(), 'slam-b15-'));
    const file = join(dir, 'book.xlsx');
    writeFileSync(file, Buffer.from(await workbookBuffer(ExcelJS, buildWorkbook(s.doc, ref, { now }), { cache: false })));
    execFileSync(soffice, ['--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'out'), file], { stdio: 'ignore', timeout: 120000 });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(dir, 'out', 'book.xlsx'));
    const off = offChecks(wb.getWorksheet('Math'));
    assert.deepEqual(off, [], `filing ${filing ?? 'blank'}`);
  }
});

// Found on a real household (Nov 6): an Unemployment row with Tax type "Benefits" picked fell back to a paycheck,
// grossed up with FICA. Benefits is the same benefit.
import { isBenefitRow as isBenefitQ } from '../js/math/income.js';
test('an Unemployment row tagged Benefits is still a benefit; tagged W-2 it is not', () => {
  const row = values => ({ kind: 'income', type: 'Unemployment', values });
  assert.equal(isBenefitQ(row({})), true);
  assert.equal(isBenefitQ(row({ incomeType: 'Benefits' })), true);
  assert.equal(isBenefitQ(row({ incomeType: 'W-2' })), false);
});

// Eli, Nov 6: "customizable like materiality": each client can set the hours and the floor.
import { materialityOf as matQ } from '../js/math/time.js';
test('materiality: the client\'s own hours and floor win over the defaults', () => {
  const wage = { value: 40 };
  assert.equal(matQ(wage).value, 80 > 100 ? 80 : 100, 'default: 2 hours at $40 is $80, under the $100 floor');
  assert.equal(matQ(wage, { materialHours: 8 }).value, 320);
  assert.equal(matQ(wage, { materialHours: 1, materialFloor: 50 }).value, 50);
  assert.equal(matQ({ value: null }, { materialFloor: 250 }).value, 250);
});
