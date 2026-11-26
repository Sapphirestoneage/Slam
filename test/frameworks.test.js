// Eli's frameworks and the canon (run "Not built, groups 1 to 5", Part 4): the math of js/math/frameworks.js with
// made-up numbers worked out by hand, the web app's readers, the five pages, and the game's copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as F from '../js/math/frameworks.js';
import { fwFooNext, fwZeroLines, fwFilingKey, fwBabyInputs } from '../js/math/frameworks-plan.js';
import { spendDownPayment } from '../js/math/withdraw.js';
import { TP_RULES } from '../js/math/trip.js';
import { ORDER } from '../js/registry/foo.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url), 'utf8'));
const unlearn = JSON.parse(readFileSync(new URL('../data/library/unlearn.json', import.meta.url), 'utf8')).entries;
const near = (a, b, d = 0.01) => assert.ok(Math.abs(a - b) <= d, `${a} is not ${b}`);

test('the SWAN number: months of what you must spend, plus the bill you worry about; empty is not zero', () => {
  const S = F.fwSwan({ monthly: 3000, months: 3, worry: 1000, cash: 5000 });
  assert.equal(S.number, 10000); assert.equal(S.gap, 5000); assert.equal(S.share, 0.5); near(S.monthsHave, 4000 / 3000);
  assert.equal(F.fwSwan({ monthly: 3000, months: 3 }).have, null, 'no cash typed: no gap, only the number');
  assert.equal(F.fwSwan({ monthly: null, months: 3 }).ready, false);
  assert.equal(F.fwSwan({ monthly: 2000, months: 6, cash: 20000 }).gap, 0);
});

test('the Second Mouse: a tick list, the next step, all done', () => {
  assert.equal(F.FW_MOUSE.length, 9);
  const T = F.fwTicks(F.FW_MOUSE, { reports: '2026-11-25', terms: '2026-11-25' });
  assert.deepEqual([T.done, T.total, T.all, T.next], [2, 9, false, 'credit']);
  assert.equal(F.fwTicks(F.FW_MOUSE, Object.fromEntries(F.FW_MOUSE.map(r => [r[0], 1]))).all, true);
});

test('the Trust Framework: three taps, the open questions and what to ask, no verdict words', () => {
  const T = F.fwTrust({ done: 'yes', gain: 'paid', fit: 'unsure' });
  assert.deepEqual([T.ready, T.ok, T.open], [true, 1, ['gain', 'fit']]);
  assert.match(F.fwTrustWords(T), /1 of 3 check out\. Before you follow it, ask: How are you paid/);
  assert.match(F.fwTrustWords(F.fwTrust({ done: 'yes' })), /1 of 3 answered/);
  for (const t of F.FW_TRUST) assert.doesNotMatch(`${t.q} ${t.opts.map(o => o[1]).join(' ')}`, /\b(bad|wrong|scam|never)\b/i);
});

test('the Advice translator reads the one unlearn list at a FOO step', () => {
  const T = F.fwTranslate('3', unlearn, ORDER);
  assert.ok(T.ready);
  const at = ORDER.indexOf('3'), all = [...T.now, ...T.before, ...T.later];
  for (const e of T.now) assert.ok(e.rightAt.includes('3'));
  for (const e of T.before) assert.ok(e.rightAt.every(s => ORDER.indexOf(s) < at));
  assert.equal(all.length, unlearn.filter(e => (e.rightAt || []).some(s => ORDER.includes(s))).length, 'every entry lands in one group');
  assert.equal(T.unlearn?.id ?? null, unlearn.find(e => (e.showAt || []).includes('3'))?.id ?? null);
  assert.equal(F.fwTranslate('nope', unlearn, ORDER).ready, false);
  assert.deepEqual(Object.values(F.FW_NEXT_STEP).filter(s => !ORDER.includes(s)), [], 'every row of the game maps to a FOO step');
});

test('the Baby Steps: the first step not done; a step with no number waits; no kids skips college', () => {
  const B = F.fwBabySteps({ cash: 5000, debt: 0, monthly: 1500, retireShare: 0.1, kids: false, mortgage: 0 });
  assert.deepEqual(B.steps.slice(0, 6).map(s => s.done), [true, true, true, false, true, true]);
  assert.equal(B.here, 3, 'Baby Step 4: 10% is under 15%');
  assert.equal(B.steps[4].skip, true);
  assert.equal(F.fwBabySteps({ cash: 500, debt: 2000, monthly: 1500 }).here, 0);
  assert.equal(F.fwBabySteps({ cash: 5000, debt: null, monthly: 1500 }).here, null, 'the debt is not known: no place yet');
  assert.equal(F.fwBabySteps({ cash: 9000, debt: 0, monthly: 2000, retireShare: 0.15, kids: false, mortgage: 0 }).here, 6, 'every step behind: step 7');
  for (const b of F.FW_BABY) assert.ok(ORDER.includes(b.foo), `${b.n} names a SLAM step`);
});

test('the wealth stages use the journey\'s own $100k line', () => {
  const W = F.fwWealthStage({ worth: 40000, monthly: 1000 });
  assert.deepEqual([W.i, W.to, W.left, W.months], [1, TP_RULES.k100, 60000, 60]);
  assert.equal(F.fwWealthStage({ worth: 10000, monthly: 1000 }).to, F.FW_K25);
  assert.equal(F.fwWealthStage({ worth: 250000 }).to, null);
  assert.equal(F.fwWealthStage({}).ready, false);
});

test('Die With Zero: buckets by decade with the person\'s own costs, and the designed week', () => {
  const B = F.fwBuckets({ age: 34, endAge: 90, items: [{ b: 30, k: 'trip', cost: 5000 }, { b: 40, k: 'adventure', cost: null }] });
  assert.equal(B.buckets[0].from, 34); assert.equal(B.buckets[0].to, 39); assert.equal(B.buckets.at(-1).to, 89);
  assert.equal(B.total, 5000); assert.equal(B.buckets[1].unpriced, 1); assert.equal(B.full, 2);
  const Wk = F.fwWeek({ have: { sleep: 49, work: 44 }, want: { sleep: 56, work: 40, people: 20 } });
  assert.deepEqual([Wk.wanted, Wk.left, Wk.fits], [116, 52, true]);
  assert.deepEqual(Wk.moves.map(m => [m.id, m.by]), [['sleep', 7], ['work', -4]]);
});

test('the net worth peak: the first age the spend-down payment covers a year of life', () => {
  const P = F.fwPeak({ age: 40, worth: 300000, saveYear: 30000, growth: 0.04, spendYear: 50000, endAge: 90 });
  assert.equal(P.peakAge, 53);
  assert.ok(spendDownPayment(P.peak, 0, 90 - 53, 0.04) >= 50000);
  const before = P.path.find(p => p.age === 52);
  assert.ok(spendDownPayment(before.worth, 0, 90 - 52, 0.04) < 50000, 'a year earlier it does not cover it');
  assert.equal(F.fwPeak({ age: 60, worth: 2000000, saveYear: 0, growth: 0.04, spendYear: 50000 }).now, true);
  assert.equal(F.fwPeak({ age: 40, worth: 0, saveYear: 0, growth: 0.04, spendYear: 50000 }).peakAge, null);
  assert.equal(F.fwPeak({ age: 40 }).ready, false);
});

test('0% tax: the standard deduction, then gains inside the 0% band; the plan\'s own 2026 tables', () => {
  const L = fwZeroLines(ref, 'joint');
  assert.deepEqual(L, { std: 32200, gainTop: 98900 });
  const Z = F.fwZeroTax({ ...L, ordinary: 20000, gainShare: 0.5, spend: 90000 });
  assert.equal(Z.gainRoom, 98900 + 32200 - 20000); assert.equal(Z.saleCash, Z.gainRoom / 0.5); assert.equal(Z.reach, 20000 + Z.saleCash); assert.equal(Z.fits, true);
  const over = F.fwZeroTax({ std: 16100, gainTop: 49450, ordinary: 26100 });
  assert.deepEqual([over.over, over.gainRoom], [10000, 39450]);
  assert.equal(F.fwZeroTax({ std: 16100, gainTop: 49450 }).incomeAtZero, 65550);
  assert.equal(F.fwZeroTax({}).ready, false);
  assert.equal(fwFilingKey({ profile: { filingStatus: 'Married jointly' } }), 'joint');
});

test('Your Money or Your Life: the nine steps in order, and the steps built here', () => {
  assert.deepEqual(F.FW_YMOYL.map(s => s.id), ['1a', '1b', '2', '3', '4', '5', '6', '7', '8', '9']);
  const P = F.fwYmoylPath({ '1a': true }, { '3': false });
  assert.equal(P.next, '1b'); assert.equal(F.fwYmoylPath({ '1a': 1, '1b': 1, '2': 1 }, { '3': false }).next, '4', 'a step not built yet is passed over');
  const L = F.fwLifetime([{ years: 10, pay: 50000, hours: 40 }]);
  assert.deepEqual([L.total, L.hours], [500000, 20800]); near(L.perHour, 500000 / 20800);
  assert.equal(F.fwLifetime([{ years: 10, pay: 50000 }]).hours, null);
  const T = F.fwThreeQ([{ k: 'Food', amt: 600, a: ['+', '-', '0'] }, { k: 'Fun', amt: 300, a: ['+', '+'] }], 20);
  assert.deepEqual([T.marked, T.minus, T.minusAmt, T.rows[0].hours], [1, ['Food'], 600, 30]);
  const Wl = F.fwWall([{ d: '2026-09-02', take: 4000, spend: 3800 }, { d: '2026-09-28', take: 4000, spend: 3600 }, { d: '2026-10-28', take: 4200, spend: 3500 }]);
  assert.deepEqual(Wl.months.map(m => [m.m, m.kept]), [['2026-09', 400], ['2026-10', 700]]);
  assert.equal(F.fwLowerKind('Food'), 'food'); assert.equal(F.fwLowerKind('Bills and subscriptions'), 'bills'); assert.equal(F.fwLowerKind('Pets'), 'other');
  assert.deepEqual(F.fwFreed(100, 25), { month: 100, year: 1200, hours: 4 });
  assert.deepEqual(F.fwRaise({ wage: 20, hoursMonth: 180, up: 5 }), { ready: true, wage: 20, newWage: 25, month: 900, year: 10800 });
  const S9 = F.fwStep9({ invested: 300000, cash: 20000, monthly: 3000, rate: 0.04 });
  assert.deepEqual([S9.income, S9.cushion, S9.cushionLeft, S9.cache], [1000, 18000, 0, 2000]);
});

test('the one line of the next dollar names the match whenever it is not the step', () => {
  const m = v => `$${Math.round(v).toLocaleString('en-US')}`;
  assert.equal(F.fwNextDollar({ kind: 'debt', left: 4000, matchLeft: 1200, money: m }), 'Your next dollar: high-interest debt, $4,000 to go. Then the full match: $1,200 a year is still free.');
  assert.equal(F.fwNextDollar({ kind: 'match', left: 150, perMonth: true, matchLeft: 1800, money: m }), 'Your next dollar: the full match at work, room for $150 a month.');
  assert.equal(F.fwNextDollar({ kind: 'nope' }), null);
  const f = { here: '1', steps: [{ id: '1', left: 800 }, { id: '2', done: false, left: 2400 }] };
  assert.equal(fwFooNext(f, m), 'Your next dollar: the small cushion, $800 to go. Then the full match: $2,400 a year is still free.');
  assert.equal(fwFooNext({ here: '1', steps: [{ id: '1', gap: 300 }] }, m), 'Your next dollar: closing the short month, $300 a month.');
  assert.equal(fwFooNext({ here: null, steps: [] }, m), null);
  for (const id of ORDER) assert.ok(F.FW_FOO_KIND[id] || id === '0b', `step ${id} has words`);
});

test('quick wins stack only the amounts the person tapped', () => {
  const T = F.fwWins({ phone: { done: 1, save: 25 }, subs: { done: 1, save: 10 }, sell: { done: 1, save: null } }, 36500);
  assert.deepEqual([T.done, T.unpriced, T.month, T.year], [3, 1, 35, 420]);
  near(T.fiDays, 420 / 100);
  assert.equal(F.fwWins({}, null).fiDays, null);
});

test('the Baby Steps reader: no plan numbers, nothing made up', () => {
  const X = fwBabyInputs({ profile: {}, records: [], settings: {}, assumptions: {} }, ref);
  for (const k of ['cash', 'monthly']) assert.ok(X[k] === null || typeof X[k] === 'number');
});

test('the five pages exist, load the canon renderer and are on the layout check', () => {
  const layout = readFileSync(new URL('../tools/e2e/layout.cjs', import.meta.url), 'utf8');
  for (const id of ['swan', 'trust', 'peak', 'zerotax', 'earned']) {
    const page = readFileSync(new URL(`../${id}.html`, import.meta.url), 'utf8');
    assert.match(page, new RegExp(`data-tool="${id}"`)); assert.match(page, /js\/solo\/canon\.js/);
    assert.match(layout, new RegExp(`'${id}'`));
  }
});

test('the game\'s copy is made from this file and is current (node tools/game_frameworks_build.mjs)', () => {
  execFileSync(process.execPath, [new URL('../tools/game_frameworks_build.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
});

test('results first: the lead number, the DTI date and the month-end line', () => {
  assert.equal(F.fwLead({ worth: -100, fire: true }), 'debtfree');
  assert.equal(F.fwLead({ worth: 5000, fire: true }), 'fi');
  assert.equal(F.fwLead({ worth: 5000 }), 'next');
  assert.equal(F.fwLead({ worth: null, fire: false }), 'next');
  assert.equal(F.fwDtiMonths({ home: 1000, gross: 5000, debts: [] }), 0);
  // 1000 + 600 + 300 = 1900 of 5000 is 38%; the 300 ends in month 4: 1600 / 5000 = 32%
  assert.equal(F.fwDtiMonths({ home: 1000, gross: 5000, debts: [{ pay: 600, off: 20 }, { pay: 300, off: 4 }] }), 4);
  assert.equal(F.fwDtiMonths({ home: 2000, gross: 5000, debts: [{ pay: 500, off: null }] }), null);
  assert.equal(F.fwDtiMonths({ home: 1000, gross: null }), null);
  const E = F.fwMonthEnd({ worth: 1000, days: [{ day: 28, net: -200 }, { day: 30, net: 500 }, { day: 10, net: 9 }], today: 26, last: 30, extra: 40 });
  assert.deepEqual(E.days, [26, 27, 28, 29, 30]);
  assert.equal(E.endAsIs, 1300);
  assert.equal(E.endPlanned, 1340);
  assert.equal(E.planned[1], 1010);
  assert.equal(F.fwMonthEnd({ worth: null }), null);
});
