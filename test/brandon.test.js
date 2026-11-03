// Brandon beta batch (Nov 2 2026). Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { homeworkList, homeworkText } from '../js/homework.js';
import { profileCompletion } from '../js/profile-completion.js';
import { incomeRow } from '../js/math/income.js';
import { instances } from '../js/month.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const fresh = () => new Store(newHousehold({ name: 'Synthetic', now: '2026-11-01T09:00:00.000Z' }));

test('B1.2, B1.3: parked fields land on the homework list with where to find them', () => {
  const s = fresh();
  s.setDoc('profile', { later: { healthCoverage: true } });
  const r = s.add('income', { name: 'Job', amount: 3000 }, { type: 'Job' });
  s.setFieldStatus(r.id, 'payFrequency', 'Will email');
  const hw = homeworkList(s.doc, s.records);
  assert.equal(hw.length, 2);
  assert.match(hw[0].where, /insurance card/i);
  assert.match(hw[1].label, /Job: pay frequency/);
  assert.match(hw[1].where, /pay stub/i);
  assert.match(homeworkText('Sam', hw), /look on: Pay stub/);
});

test('B1.1: Next is ready once every core answer is in or parked', () => {
  const s = fresh();
  assert.equal(profileCompletion(s.doc).core.ready, false);
  s.setDoc('profile', { whyNow: 'x', worry: 'x', goalWords: 'x', firstName: 'A', lastName: 'B', state: 'NY', household: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: false, hasPets: false, areas: { cash: true } });
  assert.equal(profileCompletion(s.doc).core.ready, false); // birth year still open
  s.setDoc('profile', { later: { birthYear: true } });
  assert.equal(profileCompletion(s.doc).core.ready, true);
});

test('B1.6: Both keeps both numbers; Both with one missing solves the other', () => {
  const both = incomeRow({ type: 'Job', amount: 4000, per: 'month', values: { basis: 'Both', gross: 70000 } }, { ref });
  assert.equal(both.computed, null);
  assert.equal(both.gross, 70000);
  const onlyTake = incomeRow({ type: 'Job', amount: 4000, per: 'month', values: { basis: 'Both' } }, { ref });
  assert.equal(onlyTake.computed, 'gross');
});

test('B1.4, B1.5: twice a month on the 7th and 22nd is 24 paychecks, on those days', () => {
  const s = fresh();
  s.add('income', { name: 'Job', amount: 4800, per: 'month', values: { basis: 'Take-home', payFrequency: 'twice a month', payDays: [7, 22] } }, { type: 'Job' });
  const pays = instances(s.doc, ref, '2026-12').filter(i => i.kind === 'income');
  assert.deepEqual(pays.map(p => p.date), ['2026-12-07', '2026-12-22']);
  assert.equal(pays[0].planned, 2400);
});

// ---------- Section 2: accounts ----------
import { allocationOf, driftOf, holdingsOf, tagsOf, growthOf, feesOf, staleOf, uninvestedOf, netWorthCheck, yearlyContribution, accessRule } from '../js/math/portfolio.js';
import { metrics } from '../js/math/metrics.js';

test('B2.1: allocation flags until it totals 100%, and only then fills dollars', () => {
  const half = allocationOf({ allocation: { us: 0.6, bonds: 0.2 } }, 10000);
  assert.equal(half.ok, false);
  assert.equal(half.dollars, null); // no total built on a half-typed mix
  const whole = allocationOf({ allocation: { us: 0.6, bonds: 0.3, cash: 0.1 } }, 10000);
  assert.equal(whole.ok, true);
  assert.equal(whole.dollars.us, 6000);
  assert.equal(whole.stocks, 0.6);
});

test('B2.2: drift over 5 points is flagged; 5 exactly is not', () => {
  const a = allocationOf({ allocation: { us: 0.7, bonds: 0.3 } }, 1000);
  assert.deepEqual(driftOf(a.pcts, { us: 0.6, bonds: 0.4 }).flagged.map(d => d.k), ['us', 'bonds']);
  assert.equal(driftOf(a.pcts, { us: 0.65, bonds: 0.35 }).flagged.length, 0);
});

test('B2.3 to B2.5: holdings feed the allocation; overlap and concentration are flagged', () => {
  const positions = [{ ticker: 'AAA', shares: 10, price: 100, tracks: 'S&P 500', assetClass: 'us', expenseRatio: 0.001 },
    { ticker: 'BBB', value: 1000, tracks: 'NASDAQ-100', assetClass: 'us', expenseRatio: 0.002 }, { ticker: 'CCC', value: 2000, tracks: 'US bonds', assetClass: 'bonds' }];
  const a = allocationOf({ positions, allocation: { us: 1 } }, 4000);
  assert.equal(a.source, 'holdings');
  assert.equal(a.pcts.bonds, 0.5);
  const hs = holdingsOf(positions, 4000);
  assert.deepEqual(hs.overlap, ['AAA', 'BBB']);
  assert.equal(hs.concentrated.map(x => x.ticker).join(), 'CCC'); // 50% of the account
  assert.ok(Math.abs(hs.weightedEr - 0.0015) < 1e-9);
});

test('B2.6, B2.7: a goal has % funded and monthly needed; under 5 years in stocks is flagged', () => {
  const t = tagsOf([{ name: 'Car', target: 12000, date: '2027-11', dollars: 6000 }], { balance: 10000, stocks: 0.9, now: new Date('2026-11-15') });
  assert.equal(t.rows[0].funded, 0.5);
  assert.equal(t.rows[0].monthly, 500);
  assert.equal(t.rows[0].stockRisk, true);
  assert.equal(t.untagged, 4000);
  assert.equal(tagsOf([{ name: 'Car', target: 12000, date: '2027-11', dollars: 6000 }], { stocks: 0, now: new Date('2026-11-15') }).rows[0].stockRisk, false);
});

test('B2.8 to B2.10: gain from basis; Roth earnings apart from contributions; taxable short vs long', () => {
  const g = growthOf('Brokerage', { costBasis: 8000, shortTerm: 300, longTerm: 1700 }, 10000);
  assert.equal(g.unrealized, 2000);
  assert.equal(g.unrealizedPct, 0.25);
  assert.equal(g.longTerm, 1700);
  assert.equal(growthOf('Roth IRA', { rothBasis: 6000 }, 7500).rothEarnings, 1500);
});

test('B2.11 to B2.16: access rule, fees in dollars, real paychecks a year, stale after 30 days', () => {
  assert.match(accessRule('Roth IRA'), /Contributions any time/);
  assert.equal(feesOf({ accountFee: 20, expenseRatio: 0.001, balance: 10000 }).total, 30);
  assert.equal(yearlyContribution({ contribution: 100, contributionPer: 'Paycheck' }, 'twice a month'), 2400);
  assert.equal(staleOf('2026-10-01', new Date('2026-11-03T12:00:00')).stale, true);
  assert.equal(staleOf('2026-10-10', new Date('2026-11-03T12:00:00')).stale, false);
});

test('B2.19: retirement money sitting in cash is flagged; a brokerage is not', () => {
  const a = allocationOf({ allocation: { us: 0.7, cash: 0.3 } }, 10000);
  assert.equal(uninvestedOf('Roth IRA', {}, 10000, a).cash, 3000);
  assert.equal(uninvestedOf('Brokerage', {}, 10000, a), null);
  assert.equal(uninvestedOf('HSA', { hsaCash: 2500 }, 3000, null).cash, 2500);
});

test('B2.20: net worth equals entered balances minus unvested minus debts', () => {
  const s = fresh();
  s.add('account', { values: { group: 'cash', balance: 5000 } }, { type: 'Checking' });
  s.add('account', { values: { group: 'investment', balance: 12000, unvested: 2000 } }, { type: '401(k)' });
  s.add('debt', { values: { balance: 3000 } }, { type: 'Credit card' });
  const m = metrics(s.doc, ref, { now: new Date('2026-11-03') });
  const c = netWorthCheck(m.netWorth.value, m.inputs);
  assert.equal(c.expected, 12000);
  assert.equal(c.ok, true);
  assert.equal(netWorthCheck(m.netWorth.value + 10, m.inputs).ok, false);
});

// ---------- Section 3: 401(k) and HSA ----------
import { matchFromTiers, contributionSplit, vestedOf, hsaFeeCompare } from '../js/math/portfolio.js';

test('B3.3: 100% of the first 3% plus 50% of the next 1%', () => {
  const tiers = [{ rate: 1, upTo: 0.03 }, { rate: 0.5, upTo: 0.01 }];
  const full = matchFromTiers({ contributionPct: 0.06, tiers, gross: 60000 });
  assert.ok(Math.abs(full.pctOfPay - 0.035) < 1e-9);
  assert.equal(Math.round(full.dollars), 2100);
  assert.equal(full.leftOnTable, false);
  const low = matchFromTiers({ contributionPct: 0.02, tiers, gross: 60000 });
  assert.equal(Math.round(low.dollars), 1200);
  assert.equal(low.leftOnTable, true);
});

test('B3.2: per paycheck and % of salary work each other out', () => {
  assert.equal(contributionSplit({ perPaycheck: 250, gross: 65000, payFrequency: '2 weeks' }).pct, 0.1);
  assert.equal(contributionSplit({ pct: 0.06, gross: 52000, payFrequency: 'week' }).perPaycheck, 60);
  assert.equal(contributionSplit({ pct: 0.06, gross: null, payFrequency: 'week' }).computed, null);
});

test('B3.4, B3.6: vested apart from unvested; HSA managed vs self-directed fees', () => {
  assert.deepEqual(vestedOf(10000, 2500), { vested: 7500, unvested: 2500 });
  const c = hsaFeeCompare({ invested: 5000, managedPct: 0.005, selfPct: 0.0005 });
  assert.equal(Math.round(c.saves), 23);
});

// ---------- Missed ideas M2: employer benefits ----------
import { benefitYearly, commuterSavings } from '../js/benefits.js';

test('M2.2, M2.3: a yes benefit has dollars a year by the real paychecks; a no has none', () => {
  assert.equal(benefitYearly({ have: 'Yes', amount: 50, per: 'Paycheck' }, 'twice a month'), 1200);
  assert.equal(benefitYearly({ have: 'Yes', amount: 1000, per: 'Year' }), 1000);
  assert.equal(benefitYearly({ have: 'No', amount: 1000, per: 'Year' }), null);
});

test('M2.4: commuter nudge is transit a year (capped) x the marginal rate, and only without the benefit', () => {
  const s = commuterSavings({ have: "Don't know", transitMonthly: 132, marginal: 0.2965, limitMonthly: 340 });
  assert.equal(Math.round(s.yearly), Math.round(132 * 12 * 0.2965));
  assert.equal(commuterSavings({ have: 'No', transitMonthly: 500, marginal: 0.3, limitMonthly: 340 }).covered, 340 * 12);
  assert.equal(commuterSavings({ have: 'Yes', transitMonthly: 132, marginal: 0.3, limitMonthly: 340 }), null);
  assert.equal(commuterSavings({ have: 'No', transitMonthly: 0, marginal: 0.3, limitMonthly: 340 }), null);
});

// ---------- Missed ideas M3: withholding flag ----------
import { withholdingFlag } from '../js/benefits.js';
test('M3.2: a large refund flags over-withholding; owing flags check withholding; small or unknown says nothing', () => {
  assert.equal(withholdingFlag({ lastYear: 'Refund', amount: 2400 }).kind, 'over');
  assert.equal(withholdingFlag({ lastYear: 'Refund', amount: 300 }), null);
  assert.equal(withholdingFlag({ lastYear: 'Owed', amount: 450 }).kind, 'under');
  assert.equal(withholdingFlag({ lastYear: "Don't know", amount: null }), null);
});
