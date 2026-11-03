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
  assert.equal(withholdingFlag({ lastYear: 'Refund', amount: 12000 }).kind, 'over'); assert.equal(withholdingFlag({ lastYear: 'Refund', amount: 2400 }), null); // large is over $10,000 (answer to 59)
  assert.equal(withholdingFlag({ lastYear: 'Refund', amount: 300 }), null);
  assert.equal(withholdingFlag({ lastYear: 'Owed', amount: 450 }).kind, 'under');
  assert.equal(withholdingFlag({ lastYear: "Don't know", amount: null }), null);
});

// ---------- Missed ideas M4, M5: the year and sinking funds ----------
import { yearItems, usualDates, sinkingOf, nextYm } from '../js/year.js';
test('M4.1: the year lists events, yearly costs and card fees by month; usual dates carry no cost', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const s = fresh();
  s.add('event', { name: 'Trip home', amount: 600, values: { month: '2026-12' } }, { type: 'Trip home' });
  s.add('bill', { name: 'Car registration', amount: 120, per: 'year', values: { irregular: true, monthDue: 3 } }, { type: 'Yearly cost' });
  s.add('debt', { name: 'Card', values: { annualFee: 95, opened: '2024-02' } }, { type: 'Credit card' });
  const y = yearItems(s.records, now);
  assert.deepEqual(y.months.filter(m => m.items.length).map(m => [m.ym, m.cost]), [['2026-12', 600], ['2027-02', 95], ['2027-03', 120]]);
  assert.equal(nextYm(4, now), '2027-04');
  const usual = usualDates({ renting: true }, now);
  assert.ok(usual.every(d => d.cost === undefined));
  assert.ok(usual.some(d => d.type === 'Lease renewal'));
});
test('M5: a sinking fund has monthly needed and % funded; a linked purpose tag supplies the dollars', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const s = fresh();
  const acct = s.add('account', { values: { group: 'cash', balance: 3000, tags: [{ name: 'Wedding', target: 1200, dollars: 300 }] } }, { type: 'Savings or HYSA' });
  const e = s.add('event', { name: 'Wedding', amount: 1200, values: { month: '2027-05', sinking: true, sinkingFund: acct.id, fundTag: 'Wedding' } }, { type: 'Wedding' });
  const item = yearItems(s.records, now).all.find(x => x.id === e.id);
  const f = sinkingOf(item, { records: s.records, now });
  assert.equal(f.saved, 300);
  assert.equal(f.monthly, 150); // 900 left over 6 months
  assert.equal(f.funded, 0.25);
});

// ---------- Missed ideas M7: taking over ----------
import { takingOver } from '../js/year.js';
test('M7.2: covered bills by takeover date, with the monthly total added on each date', () => {
  const s = fresh();
  s.add('bill', { name: 'Phone', amount: 60, values: { whoPays: 'Covered by someone', coveredBy: 'Parents', takeover: '2027-06' } }, { type: 'Bill' });
  s.add('bill', { name: 'Car insurance', amount: 1800, per: 'year', values: { whoPays: 'Covered by someone', coveredBy: 'Parents', takeover: '2027-06' } }, { type: 'Bill' });
  s.add('bill', { name: 'Health insurance', amount: 250, values: { whoPays: 'Covered by someone', coveredBy: 'Employer', takeover: '2028-01' } }, { type: 'Bill' });
  s.add('bill', { name: 'Streaming', amount: 15, values: { whoPays: 'Covered by someone', coveredBy: 'Partner' } }, { type: 'Bill' });
  const t = takingOver(s.records);
  assert.deepEqual(t.steps.map(x => [x.ym, x.added, x.total]), [['2027-06', 210, 210], ['2028-01', 250, 460]]);
  assert.equal(t.undated.length, 1);
});

// ---------- Missed ideas M8: life admin ----------
import { lifeAdminItems, lifeAdminPatch } from '../js/lifeadmin.js';
test('M8: beneficiaries come from each account; not yet lands on homework; renters insurance reads Protection', () => {
  const s = fresh();
  const ira = s.add('account', { name: 'Roth IRA', values: { group: 'investment', beneficiary: 'No' } }, { type: 'Roth IRA' });
  s.setDoc('profile', { lifeAdmin: { will: 'Not yet', proxy: 'Done' } });
  const items = lifeAdminItems(s.doc, s.records);
  assert.equal(items.find(x => x.accountId === ira.id).status, 'Not yet');
  const hw = homeworkList(s.doc, s.records).map(x => x.label);
  assert.ok(hw.includes('Beneficiary on Roth IRA') && hw.includes('Basic will') && !hw.includes('Healthcare proxy'));
  assert.deepEqual(lifeAdminPatch(items[0], 'Done', s.doc).account, { id: ira.id, beneficiary: 'Yes' });
  s.add('coverage', { values: { have: 'Have it' } }, { type: 'Renters or home' });
  assert.equal(lifeAdminItems(s.doc, s.records).find(x => x.key === 'renters').status, 'Done');
});

// ---------- Missed ideas M9: community presets ----------
import { communityLinesToAdd, maaserOf } from '../js/community.js';
test('M9: community lines are added once with blank amounts; maaser on gross or take-home, 10% by default', () => {
  const s = fresh();
  const add = communityLinesToAdd(s.records);
  assert.equal(add.length, 2);
  assert.ok(add.every(l => l.amount === undefined && l.values.irregular));
  for (const l of add) s.add('bill', l, { type: 'Yearly cost' });
  assert.equal(communityLinesToAdd(s.records).length, 0);
  assert.equal(maaserOf({ takeHome: 4000 }).value, 400);
  assert.equal(maaserOf({ basis: 'Gross', pct: 0.2, grossAnnual: 60000 }).value, 1000);
  assert.equal(maaserOf({ basis: 'Gross', grossAnnual: null }).value, null);
});

// ---------- Missed ideas M10: onboarding timer ----------
import { timerAfter } from '../js/timer.js';
test('M10: each mark is set once, with seconds from the first Profile answer', () => {
  const s = fresh();
  assert.equal(timerAfter(s.doc, { now: new Date('2026-11-03T10:00:00Z') }), null);
  s.setDoc('profile', { firstName: 'A' });
  s.doc.session.timer = timerAfter(s.doc, { now: new Date('2026-11-03T10:00:00Z') });
  s.doc.session.timer = timerAfter(s.doc, { metricShown: true, now: new Date('2026-11-03T10:01:30Z') });
  assert.equal(s.doc.session.timer.seconds.firstMetric, 90);
  assert.equal(timerAfter(s.doc, { metricShown: true, now: new Date('2026-11-03T10:05:00Z') }), null); // set once
  assert.equal(s.doc.session.timer.coreDone, undefined);
});

// ---------- B3.10: Income and the 401(k) fill each other in ----------
import { link401k } from '../js/math/portfolio.js';
test('B3.10: whichever side is blank borrows the other; own answers win; take-home math uses the borrowed %', () => {
  const s = fresh();
  const job = s.add('income', { name: 'Job', amount: 4000, values: { basis: 'Take-home', contributionPct: 0.06, matchPct: 1, matchCapPct: 0.04 } }, { type: 'Job' });
  const k = s.add('account', { values: { group: 'investment', balance: 5000 } }, { type: '401(k)' });
  let l = link401k(s.records);
  assert.equal(l.acctPct, 0.06); assert.equal(l.acctPctFrom, 'Income');
  assert.deepEqual(l.acctTiers, [{ rate: 1, upTo: 0.04 }]);
  s.update(k.id, { salaryPct: 0.1, matchTiers: [{ rate: 1, upTo: 0.03 }, { rate: 0.5, upTo: 0.01 }] });
  s.update(job.id, { contributionPct: null, matchPct: null, matchCapPct: null });
  l = link401k(s.records);
  assert.equal(l.incomePct, 0.1); assert.equal(l.incomePctFrom, '401(k)');
  assert.equal(l.incomeTiers.length, 2);
  const m = metrics(s.doc, ref, { now: new Date('2026-11-03') });
  const row = m.inputs.income[0];
  assert.ok(Math.abs(row.pretax - row.gross * 0.1) < 1); // the 401(k)'s 10% comes out before tax
});

// ---------- B3.8, B3.9: HSA progress, Roth IRA log ----------
import { hsaProgress, rothLog, paychecksLeft } from '../js/math/portfolio.js';
test('B3.8: HSA progress counts the employer; paychecks left gives what each needs to max', () => {
  const now = new Date(2026, 9, 1, 12); // Oct 1
  assert.equal(paychecksLeft('twice a month', now), 6);
  assert.equal(paychecksLeft('month', now), 3);
  const p = hsaProgress({ ytd: 2000, employer: 500, limit: 4400, payFrequency: 'twice a month', now });
  assert.equal(p.left, 1900);
  assert.ok(Math.abs(p.perPaycheckToMax - 1900 / 6) < 1e-9);
  assert.equal(hsaProgress({ ytd: 4400, limit: 4400, now }).maxed, true);
});
test('B3.9: Roth contributions by tax year; last year stays open until tax day; the log is the basis', () => {
  const log = [{ taxYear: 2026, date: '2026-02-01', amount: 3000 }, { taxYear: 2025, date: '2026-03-01', amount: 7500 }];
  const r = rothLog(log, { limit: 7500, now: new Date(2026, 2, 10) });
  assert.deepEqual(r.years.map(y => [y.taxYear, y.maxed, y.open]), [[2026, false, true], [2025, true, true]]);
  assert.equal(rothLog(log, { limit: 7500, now: new Date(2026, 5, 1) }).years.find(y => y.taxYear === 2025).open, false);
  assert.equal(r.basis, 10500);
  assert.equal(growthOf('Roth IRA', { rothLog: log }, 12000).rothEarnings, 1500);
});

// ---------- B5: NY and NYC tax ----------
import { stateTax, takeHomeFromGross, taxRates } from '../js/math/income.js';
test('B5.1: NY and NYC tax on NY taxable income; none outside NY; take-home and rates include them', () => {
  const st = stateTax({ gross: 70000, pretax: 0, filingStatus: 'Single', place: { state: 'NY', nyc: true } }, ref);
  // NY taxable 62,000: 8,500x3.9% + 3,200x4.4% + 2,200x5.15% + 48,100x5.4%
  assert.ok(Math.abs(st.state - (8500 * 0.039 + 3200 * 0.044 + 2200 * 0.0515 + 48100 * 0.054)) < 0.01);
  assert.ok(Math.abs(st.local - (12000 * 0.03078 + 13000 * 0.03762 + 25000 * 0.03819 + 12000 * 0.03876)) < 0.01);
  assert.equal(stateTax({ gross: 70000, place: null }, ref).state, 0);
  const ny = takeHomeFromGross({ gross: 70000, place: { state: 'NY', nyc: true } }, ref).value;
  const fed = takeHomeFromGross({ gross: 70000 }, ref).value;
  assert.ok(Math.abs(fed - ny - st.state - st.local) < 0.01);
  const r = taxRates({ gross: 70000, place: { state: 'NY', nyc: true } }, ref);
  assert.ok(Math.abs(r.marginal - (r.federalMarginal + 0.0765 + 0.054 + 0.03876)) < 1e-9);
  assert.equal(r.federalMarginal, 0.22);
});

// ---------- B6: spending ----------
import { monthlyFrom } from '../js/math/income.js';
import { instances as monthList } from '../js/month.js';
test('B6.3, B6.10: quarterly and yearly lines become the right monthly amount', () => {
  assert.equal(monthlyFrom(300, 'quarter').value, 100);
  assert.equal(monthlyFrom(1200, 'year').value, 100);
});
test('B6.9: 401(k) money is saving: the savings rate with it counts what left before payday', () => {
  const s = fresh();
  s.add('income', { name: 'Job', amount: 80000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', contributionPct: 0.05 } }, { type: 'Job' });
  s.add('spending', { amount: 3000, values: {} }, { type: 'All in' });
  const m = metrics(s.doc, ref, { now: new Date('2026-11-03') });
  assert.ok(Math.abs(m.savingsRate.pretaxSaving - 80000 * 0.05 / 12) < 0.01);
  assert.ok(m.savingsRate.value > m.savingsRate.ofTakeHome, 'the headline now counts it; surplus over take-home is the second line');
});
test('B6.10: the month list is built once per change, and rebuilt after one', () => {
  const s = fresh();
  s.add('income', { name: 'Job', amount: 4000, values: { payFrequency: 'month' } }, { type: 'Job' });
  const a = monthList(s.doc, ref, '2026-12'), b = monthList(s.doc, ref, '2026-12');
  assert.equal(a, b);
  s.add('bill', { name: 'Gym', amount: 50, values: { dueDay: 3 } }, { type: 'Bill' });
  assert.notEqual(monthList(s.doc, ref, '2026-12'), a);
});

// ---------- B7: payday card ----------
import { paydayOf } from '../js/payday.js';
test('B7: next paycheck, fixed bills per paycheck, and what is free, per period and per month', () => {
  const s = fresh();
  s.add('income', { name: 'Job', amount: 2000, per: 'paycheck', values: { basis: 'Take-home', payFrequency: 'twice a month', payDays: [7, 22] } }, { type: 'Job' });
  s.add('bill', { name: 'Rent', amount: 1600, values: { category: 'Rent or mortgage', amountType: 'Fixed', timing: 'Fixed date' } }, { type: 'Bill' });
  s.add('bill', { name: 'Groceries', amount: 400, values: { category: 'Groceries', amountType: 'Variable' } }, { type: 'Bill' });
  s.setDoc('spending', { source: 'lines' });
  const d = paydayOf(s.doc, ref, new Date('2026-11-10T12:00:00Z'));
  assert.equal(d.date, '2026-11-22');
  assert.equal(d.period.in, 2000);
  assert.equal(d.period.fixed, 800);
  assert.equal(d.period.free, 1200);
  assert.deepEqual([d.month.in, d.month.fixed, d.month.free], [4000, 1600, 2400]);
});

// ---------- B8: glossary ----------
import { termIn, GLOSSARY } from '../js/glossary.js';
test('B8: labels find their term (longest first); sentences and plain words do not', () => {
  assert.equal(termIn('Coast FI').term, 'Coast FI');
  assert.equal(termIn('Monthly surplus').term, 'Surplus');
  assert.equal(termIn('Card utilization, all cards').term, 'Utilization');
  assert.equal(termIn('First name'), null);
  assert.equal(termIn('FIRST'), null); // FI must be its own word
  for (const t of ['Pace', 'Coverage', 'Buffer', 'Surplus', 'Coast FI']) assert.ok(GLOSSARY[t]);
});

// ---------- 401(k) in two passes: Income per paycheck, the 401(k) in detail ----------
test('401(k) first pass on Income is dollars a paycheck; the 401(k) borrows it; the 401(k)\'s own answer wins there', () => {
  const s = fresh();
  const job = s.add('income', { name: 'Job', amount: 78000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', k401Paycheck: 150, hasMatch: 'Yes' } }, { type: 'Job' });
  const k = s.add('account', { values: { group: 'investment', balance: 4000 } }, { type: '401(k)' });
  let l = link401k(s.records);
  assert.equal(l.acctPerPaycheck, 150); assert.equal(l.acctPerPaycheckFrom, 'Income');
  assert.equal(l.incomePct, null);
  const m = metrics(s.doc, ref, { now: new Date('2026-11-03') });
  assert.ok(Math.abs(m.inputs.income[0].pretax - 150 * 26) < 1); // comes out before tax, 26 paychecks
  s.update(k.id, { contribution: 200, contributionPer: 'Paycheck', matchTiers: [{ rate: 1, upTo: 0.04 }] });
  s.update(job.id, { k401Paycheck: null });
  l = link401k(s.records);
  assert.equal(l.incomePerPaycheck, 200); assert.equal(l.incomePerPaycheckFrom, '401(k)');
  assert.equal(l.incomeTiersFrom, '401(k)');
  assert.equal(l.hasMatch, 'Yes');
});

// ---------- Nov 3 answers: cash flag, APR guess ----------
test('48: any cash in a retirement account or HSA is flagged unless the account turns it off; a blank card APR guesses 25%', () => {
  const a = allocationOf({ allocation: { us: 0.97, cash: 0.03 } }, 10000);
  assert.equal(uninvestedOf('Roth IRA', {}, 10000, a).cash, 300);
  assert.equal(uninvestedOf('HSA', { hsaCash: 200 }, 3000, null).cash, 200);
  assert.equal(uninvestedOf('HSA', { hsaCash: 2000, cashOk: true }, 3000, null), null);
  const s = fresh();
  s.add('debt', { values: { balance: 3000, payment: 150 } }, { type: 'Credit card' });
  const d = metrics(s.doc, ref, { now: new Date('2026-11-03') }).inputs.debts[0];
  assert.equal(d.apr, 0.25); assert.equal(d.aprGuess, true);
});
test('62: money going into a sinking fund comes out of the surplus', () => {
  const s = fresh();
  s.add('income', { name: 'Job', amount: 4000, values: { basis: 'Take-home' } }, { type: 'Job' });
  s.add('spending', { amount: 3000, values: {} }, { type: 'All in' });
  const before = metrics(s.doc, ref, { now: new Date('2026-11-10T12:00:00') }).surplus.value;
  s.add('event', { name: 'Wedding', amount: 1200, values: { month: '2027-05', sinking: true, saved: 300 } }, { type: 'Wedding' });
  const after = metrics(s.doc, ref, { now: new Date('2026-11-10T12:00:00') }).surplus;
  assert.equal(before - after.value, 150); // 900 left over 6 months
  assert.match(after.text, /sinking funds/);
});
