// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { spendMoreOf, feesOf, movesOf, MOVES, LIFE_SIDES, CHECKUP, checkupOf, HAPPENS, MEET, meetOf, packMeet, unpackMeet } from '../js/extras.js';

// A stand-in for the journey's what-if: months to FI rise 1 for each $10 more spent, from 100.
const fake = (doc, ref, priors, { spendLess = 0, earnMore = 0 } = {}) => { const after = 100 - spendLess / 10 - earnMore / 20; return { before: 100, after, moved: 100 - after, surplus: 2000, date: 'x' }; };

test('how much more could I spend: the most a month that still gets there by the age', () => {
  // Age 55, by 65: 120 months allowed. 100 months now, so 20 months of room, at $10 a month each: $200.
  const r = spendMoreOf({}, {}, {}, { age: 55, byAge: 65, run: fake });
  assert.ok(r.on && r.amount >= 190 && r.amount <= 200, String(r.amount));
  assert.deepEqual(spendMoreOf({}, {}, {}, { age: 60, byAge: 65, run: fake }), { amount: 0, byAge: 65, on: false }); // 60 months allowed, 100 needed
  assert.equal(spendMoreOf({}, {}, {}, { age: 30, byAge: 67, run: fake }).amount, 2000);                           // everything left over still fits
  assert.equal(spendMoreOf({}, {}, {}, { age: 70, byAge: 65, run: fake }), null);
});

test('what fees cost, by hand: $100,000 for 30 years at 5% and at 4%', () => {
  const f = feesOf({ balance: 100000, monthly: 0, years: 30, ret: 0.05, fee: 0.01, low: 0 });
  assert.ok(Math.abs(f.without - 432194.24) < 0.01); assert.ok(Math.abs(f.withFee - 324339.75) < 0.01); assert.ok(Math.abs(f.cost - 107854.49) < 0.01);
  const g = feesOf({ balance: 0, monthly: 100, years: 2, ret: 0, fee: 0, low: 0 }); assert.equal(g.without, 2400); assert.equal(g.cost, 0);
  assert.ok(feesOf({ balance: 50000, monthly: 500, years: 30, ret: 0.05, fee: 0.015 }).cost > feesOf({ balance: 50000, monthly: 500, years: 30, ret: 0.05, fee: 0.005 }).cost);
});

test('which move fits: sized from the household, sorted by what you care about', () => {
  const pl = { m: { inputs: { takeHome: 5000, spending: 4000 } } };
  const all = movesOf({}, {}, {}, pl, { run: fake });
  assert.equal(all.length, MOVES.length); assert.equal(all[0].id, 'move');               // 25% of $4,000 = $1,000 less: 100 months
  assert.equal(all.find(m => m.id === 'raise').amount, 500); assert.equal(all.find(m => m.id === 'hack').amount, 480);
  const care = movesOf({}, {}, {}, pl, { care: ['time'], run: fake });
  assert.ok(care.filter(m => m.fits).every(m => m.sides.time >= 0)); assert.ok(care.findIndex(m => !m.fits) > care.findIndex(m => m.fits));
  assert.deepEqual(care.find(m => m.id === 'side').costs, ['time']);
  assert.deepEqual(movesOf({}, {}, {}, { m: { inputs: {} } }, { run: fake }), []);
  for (const m of MOVES) assert.deepEqual(Object.keys(m.sides).sort(), LIFE_SIDES.map(s => s[0]).sort());
});

test('the checkup counts what is covered and lists what is not', () => {
  const c = checkupOf({ match: 'yes', term: 'na', will: 'no', freeze: 'unsure' });
  assert.equal(c.have, 1); assert.equal(c.of, CHECKUP.length - 1); assert.equal(c.answered, 4); assert.deepEqual(c.todo.map(t => t.id), ['will', 'freeze']);
});

test('a money meeting: answers travel in a link and sit side by side', () => {
  const a = { for: 'Safety', who: 'Me', free: '$100' }, b = { for: 'Freedom', who: 'You', free: '$100' };
  assert.deepEqual(unpackMeet(packMeet(a)), a); assert.equal(unpackMeet('not a link'), null); assert.deepEqual(unpackMeet(packMeet({ for: 'Yachts', who: 'Me' })), { who: 'Me' });
  const m = meetOf(a, b); assert.equal(m.done, false); assert.equal(m.same, 2); assert.deepEqual(m.differ.map(r => r.id), ['for']);
  const full = Object.fromEntries(MEET.map(q => [q.id, q.a[0]])); assert.equal(meetOf(full, full).done, true);
  assert.equal(meetOf({ who: 'Me' }, { who: 'Me' }).rows.find(r => r.id === 'who').same, false); // both said "me": that is a difference
});

test('the words: plain, no em dashes, no verdict words', () => {
  const words = [...CHECKUP.flatMap(c => [c.q, c.next]), ...HAPPENS.flatMap(h => [h.title, ...h.steps]), ...MEET.flatMap(m => [m.q, ...m.a]), ...MOVES.map(m => m.name)].join(' ');
  assert.doesNotMatch(words, new RegExp(String.fromCharCode(8212))); assert.doesNotMatch(words, /\b(should|must|bad|wrong|fail|warning|risky|danger)\b/i);
  assert.equal(HAPPENS.length, 3); for (const h of HAPPENS) assert.ok(h.steps.length >= 5 && /^What to do first/.test(h.steps.at(-1)));
});

import { nextDollarOf, NEXT_ASKS, climbOf, raiseOf, startedOf, creepOf, datesOf, PARENT_ASKS, RAISE_SCRIPT } from '../js/extras.js';
test('which account next: the order bends to five answers', () => {
  assert.equal(nextDollarOf({}).here, null);
  const a = nextDollarOf({ match: 'some', debt: 'yes', cushion: 'low', hsa: 'yes', over: 'no' }); assert.equal(a.here.id, 'starter');
  assert.equal(nextDollarOf({ match: 'some', debt: 'yes', cushion: 'some', hsa: 'yes', over: 'no' }).here.id, 'match');
  assert.equal(nextDollarOf({ match: 'all', debt: 'yes', cushion: 'some', hsa: 'yes', over: 'no' }).here.id, 'debt');
  assert.equal(nextDollarOf({ match: 'none', debt: 'no', cushion: 'some', hsa: 'no', over: 'no' }).here.id, 'cushion');
  const b = nextDollarOf({ match: 'none', debt: 'no', cushion: 'full', hsa: 'no', over: 'yes' });
  assert.equal(b.here.id, 'roth'); assert.match(b.here.name, /back door/); assert.ok(!b.steps.some(s => s.id === 'match' || s.id === 'hsa'));
  assert.equal(nextDollarOf({ match: 'all', debt: 'no', cushion: 'full', hsa: 'unsure', over: 'no' }).here.id, 'hsa');
  assert.equal(NEXT_ASKS.length, 5);
});

test('the climb, a raise, a habit, creep, and the money date, by hand', () => {
  const c = climbOf(-3700, 1100); assert.equal(c[0].months, 4); assert.equal(c[1].months, 13); assert.equal(c[2].months, 95); assert.equal(climbOf(12000, 0)[2].months, null); assert.ok(climbOf(12000, 500)[1].done);
  const r = raiseOf({}, {}, {}, { raise: 6000, run: fake }); // $6,000 a year, 70% kept: $350 a month; the stand-in moves 1 month per $20
  assert.equal(r.monthly, 350); assert.equal(r.moved, 17.5); assert.equal(r.daysPerThousand, Math.round(17.5 * 30.44 / 6));
  const s = startedOf({ monthly: 100, years: 2, ret: 0.05 }); assert.equal(s.put, 2400); assert.ok(Math.abs(s.value - 2460) < 1e-9); // 1,200 * 1.05 + 1,200
  assert.equal(startedOf({ monthly: 100, years: 2, ret: 0 }).value, 2400);
  assert.equal(creepOf(3000, 3100).up, false); assert.ok(creepOf(3000, 3200).up); assert.ok(Math.abs(creepOf(3000, 3300).change - 0.1) < 1e-12); assert.equal(creepOf(0, 100), null);
  const d = datesOf([{ at: '2026-11-12', calm: 4, joy: 3 }, { at: '2026-10-10', calm: 2, joy: 3 }]); assert.equal(d.count, 2); assert.equal(d.calm, 2); assert.equal(d.joy, 0); assert.equal(datesOf([]).last, null);
  const words = [...NEXT_ASKS.flatMap(q => [q.q, ...q.a.map(x => x[1])]), ...nextDollarOf({ over: 'yes' }).steps.flatMap(x => [x.name, x.why]), ...PARENT_ASKS.map(q => q.q), ...RAISE_SCRIPT].join(' ');
  assert.doesNotMatch(words, new RegExp(String.fromCharCode(8212))); assert.doesNotMatch(words, /\b(should|must|bad|wrong|fail|warning|risky|danger)\b/i);
});

import { flowTimeOf, designOf, receiptOf } from '../js/extras.js';
test('where the money goes over time: the plan\'s phases with their months and totals', () => {
  const pl = { steps: [{ id: '4', name: 'Build your job-loss fund' }, { id: '5', name: 'Max out tax-free accounts' }], milestones: [{ id: 'fi', months: 311 }],
    m: { fooFlow: { monthly: 1100, steps: [{ id: '3', from: 0, to: 0, monthly: 1100, left: null }, { id: '4', from: 0, to: 17, monthly: 1100, left: 18600 }, { id: '5', from: 17, to: 24, monthly: 1100, left: 7500 }, { id: 'rest', from: 24, to: null, monthly: 1100, left: null }] } } };
  const f = flowTimeOf(pl);
  assert.deepEqual(f.phases.map(p => [p.name, p.from, p.to, p.total]), [['Build your job-loss fund', 0, 17, 18700], ['Max out tax-free accounts', 17, 24, 7700], ['Invest for the day work is optional', 24, 311, 315700]]);
  assert.equal(f.end, 311); assert.equal(flowTimeOf({ m: {} }), null);
});

test('design the life, get the bill, by hand', () => {
  // Age 30, a life at 50 on $4,000 a month somewhere cheaper ($3,000), a few trips ($400), a little work ($1,500).
  // From money: $1,900 a month, $22,800 a year, at 4%: $570,000. Nothing invested, 5% a year for 20 years.
  const d = designOf({ age: 30, spending: 4000, invested: 0, surplus: 1000, ret: 0.05, rate: 0.04 }, { age: 50, place: 'less', work: 'some', travel: 'some' });
  assert.equal(d.cost, 3400); assert.equal(d.fromMoney, 1900); assert.equal(d.number, 570000);
  const yearly = 570000 * 0.05 / (1.05 ** 20 - 1); assert.ok(Math.abs(d.monthly - yearly / 12) < 1e-6); // about $1,436.50 a month
  assert.ok(Math.abs(d.gap - (yearly / 12 - 1000)) < 1e-6); assert.equal(d.on, false); assert.ok(d.ageOnPace > 50);
  const rich = designOf({ age: 30, spending: 4000, invested: 2000000, surplus: 0 }, { age: 40 }); assert.equal(rich.monthly, 0); assert.ok(rich.on); assert.equal(rich.ageOnPace, 31);
  assert.equal(designOf({ age: 30, spending: 4000 }, { age: 30 }), null); assert.equal(designOf({ age: 30, spending: 4000 }, {}), null);
});

test('a decision receipt: which choice is sooner, which is kinder, and when they pull apart', () => {
  const r = receiptOf({}, {}, {}, { name: 'Stay as I am' }, { name: 'A new job', pay: 1500, time: -1, calm: -1 }, { run: fake });
  assert.equal(r.a.months, 100); assert.equal(r.b.months, 25); assert.equal(r.sooner, 'b'); assert.equal(r.kinder, 'a'); assert.equal(r.split, true); assert.equal(r.gap, 75);
  const s = receiptOf({}, {}, {}, { cost: 500 }, { cost: 500 }, { run: fake }); assert.equal(s.sooner, 'same'); assert.equal(s.split, false); assert.equal(s.a.months, 150);
});

import { seriesOf, LINES, affordOnce, unevenOf, overlapOf } from '../js/extras.js';
test('your money, line by line: debt first, then cash, then investing, by hand at no growth', () => {
  const pl = { age: 30, milestones: [{ id: 'fi', months: 36 }], m: { inputs: { cash: 1000, invested: 5000, realReturn: 0, debts: [{ balance: 3000 }] }, fooFlow: { monthly: 1000, waitMonths: 6 } } };
  const s = seriesOf(pl); assert.equal(s.points.length, 4);
  // Year 1: three months clear the debt, three fill cash (+$3,000), six are invested (+$6,000).
  assert.deepEqual([s.points[1].debt, s.points[1].cash, s.points[1].invested, s.points[1].putIn, s.points[1].growth, s.points[1].netWorth], [0, 4000, 11000, 11000, 0, 15000]);
  assert.equal(s.points[3].invested, 35000); assert.equal(s.points[0].netWorth, 3000);
  const g = seriesOf({ ...pl, m: { ...pl.m, inputs: { ...pl.m.inputs, realReturn: 0.05 } } }); assert.ok(g.points[3].growth > 0); assert.ok(Math.abs(g.points[3].invested - g.points[3].putIn - g.points[3].growth) < 1e-6);
  for (const [k] of LINES) assert.ok(k in s.points[0]);
  // A loan with its own payment walks down on it: $12,000 at 0%, $500 a month, is gone in two years.
  const loan = seriesOf({ age: 30, milestones: [{ id: 'fi', months: 36 }], m: { inputs: { cash: 0, invested: 0, realReturn: 0, debts: [{ balance: 12000, apr: 0, payment: 500 }] }, fooFlow: { monthly: 0, waitMonths: 0 } } });
  assert.deepEqual(loan.points.map(p => p.debt), [12000, 6000, 0, 0]);
});

test('can I afford this, uneven pay, and overlapping subscriptions, by hand', () => {
  const a = affordOnce({ price: 2500, cash: 10000, spending: 3000, surplus: 1000, ret: 0.05, years: 20 });
  assert.equal(a.fromCash, true); assert.equal(a.monthsLeft, 2.5); assert.equal(a.monthsOfKeeping, 2.5); assert.ok(Math.abs(a.later - 2500 * 1.05 ** 20) < 1e-6);
  assert.equal(affordOnce({ price: 5000, cash: 1000 }).fromCash, false);
  const u = unevenOf({ low: 2000, usual: 4000, high: 8000, spending: 2800 }); // halfway between slow and usual: $3,000
  assert.equal(u.pay, 3000); assert.equal(u.buffer, 6000); assert.equal(u.shortInLow, 1000); assert.equal(u.lowMonthsCovered, 6); assert.equal(u.extraInHigh, 5000); assert.equal(u.covers, true);
  assert.equal(unevenOf({ low: 5000, usual: 4000, high: 8000 }), null);
  const o = overlapOf({ video: true, music: true }, 15, { doc: {}, run: fake }); assert.equal(o.monthly, 30); assert.equal(o.yearly, 360); assert.equal(o.moved, 3); assert.deepEqual(o.groups, ['Streaming video', 'Music']);
});

import { guideOf } from '../js/extras.js';
test('you are here: one next thing, in order, and what is already done', () => {
  const L = (states) => states.map((s, i) => ({ id: ['where', 'owe', 'work'][i], n: i + 2, title: `T${i}`, state: s }));
  const base = { hasAge: true, answered: 5, total: 5, levels: L(['open', 'open', 'open']), checkup: { answered: 0, of: 11 }, today: '2026-11-12' };
  assert.equal(guideOf({ hasAge: false, answered: 0, total: 5 }).next.stage, 'you');
  const q = guideOf({ ...base, answered: 2, nextQ: 'cash' }).next; assert.equal(q.stage, 'numbers'); assert.equal(q.q, 'cash'); assert.equal(q.here, 'Question 3 of 5');
  assert.equal(guideOf({ ...base, worry: { label: 'A baby is on the way', ticked: 0, steps: 4 } }).next.flash, 'worry');
  assert.equal(guideOf({ ...base, worry: { label: 'x', ticked: 1, steps: 4 } }).next.flash, 'statement');
  const lv = guideOf({ ...base, statement: true }).next; assert.equal(lv.flash, 'where'); assert.equal(lv.here, 'Level 2 of 4 is next');
  assert.equal(guideOf({ ...base, levels: L(['done', 'open', 'done']) }).next.flash, 'owe');
  const allDone = { ...base, levels: L(['done', 'done', 'done']) };
  assert.equal(guideOf(allDone).next.flash, 'checkup'); assert.equal(guideOf({ ...allDone, checkup: { answered: 11, of: 11 } }).next.stage, 'date');
  const end = guideOf({ ...allDone, checkup: { answered: 11, of: 11 }, lastDate: '2026-11-03', dates: 2, drills: 1, receipts: 1, statement: true });
  assert.ok(end.next.caughtUp); assert.equal(end.done.length, 8); assert.ok(end.done.includes('2 money dates'));
  assert.equal(guideOf({ ...allDone, checkup: { answered: 11, of: 11 }, lastDate: '2026-10-03' }).next.stage, 'date');
});
