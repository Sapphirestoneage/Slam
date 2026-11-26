// SPDX-License-Identifier: AGPL-3.0-only
// Safety nets (run Finish everything partly built, Part 15; M8U): each life change worked by hand, the run of the
// cash, the tripwires, Plan B, the levels, the days, the rule ends, the web app's dip with the change, and the
// game's copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as N from '../js/math/safetynet.js';
import { lifeEventOf, ruleEndsOf, ntRulesOf } from '../js/math/safetyplan.js';
import { Store, newHousehold } from '../js/records.js';
import { answer } from '../js/journey.js';
import { runwayOf } from '../js/solo.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url), 'utf8'));
const R = ntRulesOf(ref);
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const now = new Date('2026-11-26T12:00:00Z');

test('the dated leave rules are read from the reference file', () => {
  assert.equal(R.dbl.rate, 0.5); assert.equal(R.dbl.weeklyMax, 170); assert.equal(R.dbl.weeks, 26); assert.equal(R.dbl.waitWeeks, 1);
  assert.equal(R.pfl.rate, 0.67); assert.equal(R.pfl.weeklyMax, 1228.53); assert.equal(R.pfl.weeks, 12);
  for (const k of N.NT_KINDS) assert.ok((ref.transitions.templates || []).find(t => t.id === k.template)?.nets, `words for ${k.id}`);
});

test('medical leave, by hand: 12 weeks with no pay off $4,000 take-home', () => {
  const E = N.ntEvent('medical', { weeks: 12, paid: 'none', once: 0 }, { pay: 4000 }, R);
  assert.equal(E.flows.length, 1); near(E.flows[0].toK, 12 * 12 / 52); assert.equal(E.flows[0].monthly, -4000);
  // cash 10,000, burn 3,000, income 4,000: month 0 and 1 lose 3,000 each (all pay gone), month 2 is 0.769 of a month off
  const run = N.ntRun({ cash: 10000, burn: 3000, income: 4000, flows: E.flows, max: 12 });
  near(run.path[1].left, 7000); near(run.path[2].left, 4000); near(run.path[3].left, 4000 + 1000 - 4000 * (12 * 12 / 52 - 2), 1e-6);
  assert.equal(run.lasts, true); assert.equal(run.lowestK, 3);
});

test('NY state disability: half the weekly wage, up to $170, from the second week', () => {
  assert.equal(N.ntLeaveWeekly(R.dbl, 300), 150); assert.equal(N.ntLeaveWeekly(R.dbl, 1000), 170); assert.equal(N.ntLeaveWeekly(R.dbl, null), null);
  const E = N.ntEvent('medical', { weeks: 6, paid: 'ny' }, { pay: 4000, weekly: 1000 }, R), paid = E.flows.find(f => f.id === 'paid');
  near(paid.monthly, 170 * 52 / 12); near(paid.fromK, 12 / 52); near(paid.toK, 6 * 12 / 52);
  // without a gross weekly wage, the take-home a week stands in
  const T = N.ntEvent('medical', { weeks: 6, paid: 'ny' }, { pay: 260 }, R);
  near(T.flows.find(f => f.id === 'paid').monthly, 0.5 * 260 * 12 / 52 * 52 / 12); assert.equal(T.weekly, 'take-home');
});

test('a new baby: NY Paid Family Leave at 67% up to $1,228.53 a week for 12 weeks, and the new costs from the start', () => {
  const E = N.ntEvent('baby', { weeks: 12, paid: 'ny', monthly: 1000, once: 2500 }, { pay: 6000, weekly: 2400 }, R);
  const paid = E.flows.find(f => f.id === 'paid'), more = E.flows.find(f => f.id === 'monthly');
  near(paid.monthly, 1228.53 * 52 / 12); assert.equal(paid.fromK, 0); near(paid.toK, 12 * 12 / 52);
  assert.equal(more.toK, Infinity); assert.equal(E.once, 2500);
  assert.equal(N.ntLeaveWeekly(R.pfl, 1000), 670);
});

test('a move and a breakup: one-time costs at the start and a new monthly cost', () => {
  const M = N.ntEvent('move', { housing: 250, moving: 1500, deposit: 1, overlap: 1 }, { housing: 1500 }, R);
  assert.deepEqual(M.flows.map(f => [f.id, f.monthly, f.fromK, f.toK]), [['housing', -250, 1, Infinity], ['moving', -1500, 0, 1], ['deposit', -1750, 0, 1], ['overlap', -1750, 0, 1]]);
  assert.equal(M.once, 5000);
  const noRent = N.ntEvent('move', { deposit: 1 }, {}, R); assert.deepEqual(noRent.needs, ['housing']);
  const B = N.ntEvent('breakup', { lost: 1000, housing: 500, once: 3000 }, {}, R);
  const run = N.ntRun({ cash: 6000, burn: 3000, income: 3500, flows: B.flows });
  // month 0: 500 - 1500 - 3000 = -4000 -> 2000; then -1000 a month: two more months
  near(run.path[1].left, 2000); near(run.runway, 3); assert.equal(run.steady, -1000);
});

test('a start pick is a guess until the person taps one', () => {
  assert.equal(N.ntPicks('move', {}).guess, true);
  assert.equal(N.ntPicks('move', { housing: 0, moving: 0, deposit: 0, overlap: 0 }).guess, false);
  assert.equal(N.ntPicks('baby', {}).v.weeks, 12);
});

test('tripwires, Plan B and the levels', () => {
  const args = { cash: 9000, burn: 3000, income: 0, flows: [] };
  const run = N.ntRun(args); near(run.runway, 3);
  const T = N.ntTrips(run, 2000, [3, 2, 1], { 2: 'Get a roommate' });
  assert.deepEqual(T.map(t => [t.months, t.level, t.k, t.now]), [[3, 6000, 1, false], [2, 4000, 2, false], [1, 2000, 3, false]]);
  assert.equal(T[1].pick, 'Get a roommate');
  const B = N.ntPlanB(args, 2000); near(B.run.runway, 4.5); near(B.more, 1.5);
  const L = N.ntDegrade({ cash: 9000, income: 500, levels: [{ id: 'full', burn: 3000 }, { id: 'draftt', burn: 3500 }, { id: 'fat', burn: null }, { id: 'food', burn: 400 }] });
  near(L[0].months, 3.6); assert.equal(L[1].burn, 3000, 'a level is never above the one before'); assert.equal(L[2].months, null); assert.equal(L[2].needs, 'what it costs'); assert.equal(L[3].lasts, true);
});

test('the days of the playful card: a month is 30.44 days', () => {
  assert.equal(N.ntDays(3), 91); assert.equal(N.ntDays(null), null);
  assert.equal(runwayOf({ cash: 6000, spending: 2000 }).days, 91);
});

test('rule ends: only rules leaned on and still ahead, nearest first', () => {
  const L = N.ntRuleEnds([{ id: 'a', ends: '2028-12-31', uses: true, yearly: 1200 }, { id: 'b', ends: '2028-06-30', uses: true, yearly: null }, { id: 'c', ends: '2027-01-01', uses: false }, { id: 'd', ends: '2025-12-31', uses: true }], '2026-11');
  assert.deepEqual(L.map(r => [r.id, r.months]), [['b', 19], ['a', 25]]); assert.equal(L[1].monthly, 100);
});

const plan = () => { const s = new Store(newHousehold({ name: 'Demo' })); answer(s, 'income', { takeHome: 4000 }); answer(s, 'spending', { gut: 3000 }); answer(s, 'cash', { checking: 2000, savings: 7000 }); return s; };

test('the web app runs each change on the one ladder (dipOf) and agrees with the plain run on cash', () => {
  const s = plan();
  for (const kind of ['medical', 'move', 'breakup', 'baby']) {
    const W = lifeEventOf(s.doc, ref, { kind, now });
    assert.equal(W.ready, true);
    const E = W.event, plain = N.ntRun({ cash: 9000, burn: 3000, income: 4000, flows: E.flows });
    if (plain.lasts) assert.equal(W.lasts, true, kind); else near(W.runway, plain.runway, 1e-6);
  }
  const B = lifeEventOf(s.doc, ref, { kind: 'baby', taps: { weeks: 12, paid: 'none', monthly: 1500, once: 5000 }, now });
  assert.equal(B.lasts, false); assert.equal(B.planB.by, 'trim'); assert.ok(B.planB.runway > B.runway);
  assert.equal(B.trips.length, 3); assert.ok(B.trips[0].opts.length > 0);
  assert.equal(B.link.web, 'family.html');
  assert.equal(lifeEventOf(new Store(newHousehold({ name: 'x' })).doc, ref, { kind: 'move', now }).ready, false);
});

test('rule-change tripwires on the household: PAYE or ICR on a student loan', () => {
  const s = plan();
  assert.deepEqual(ruleEndsOf(s.doc, ref, { now }), []);
  s.add('debt', { name: 'Federal loans', values: { balance: 20000, apr: 0.05, plan: 'PAYE' } }, { type: 'Student loan' });
  const L = ruleEndsOf(s.doc, ref, { now });
  assert.equal(L.length, 1); assert.equal(L[0].id, 'legacyIdr'); assert.equal(L[0].ends, '2028-06-30'); assert.deepEqual(L[0].loans, ['Federal loans']);
  assert.doesNotMatch(L[0].then + L[0].name, /mistake|failed|behind|off track|warning/i);
});

test('the game\'s copy of js/math/safetynet.js is current', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/game_safety_build.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
