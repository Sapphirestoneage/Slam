// SPDX-License-Identifier: AGPL-3.0-only
// The game, first half (run Not built, groups 1 to 5, Part 10a; M8Z): each function of js/math/quest.js checked by hand
// on made-up numbers, the game's copy current, and the SCF rows read from data/priors-2026.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as Q from '../js/math/quest.js';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const PRI = JSON.parse(read('data/priors-2026.json'));
const M = v => `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
const real = { take: true, spend: true, cash: true, debt: true, inv: true };

test('the character sheet: health, armor and six stats from real numbers, null when a number is missing', () => {
  const S = Q.qsStats({ take: 5000, spend: 4000, cash: 6000, hiDebt: 6000, inv: 20000, nw: 20000, fi: 1200000, coast: 100000, target: 6, protDone: 1, protMax: 4, sharp: 3, sharpOf: 5, streak: 6, real }, M);
  assert.equal(S.health.value, 1.5); assert.equal(S.health.score, 25); assert.equal(S.armor.score, 25);
  const by = Object.fromEntries(S.stats.map(s => [s.id, s]));
  assert.equal(by.margin.score, 40, '20% kept, full at 50%'); assert.equal(by.reach.score, 2); assert.equal(by.light.score, 90);
  assert.equal(by.coast.score, 20); assert.equal(by.clarity.score, 60); assert.equal(by.rhythm.score, 50);
  assert.equal(S.best, 'light'); assert.equal(S.train, 'reach'); assert.equal(by.margin.level, 'Close');
  assert.equal(Q.qsStats({ take: 5000, spend: 4000, real: { take: false, spend: true } }, M).stats[0].level, 'Guess');
  const E = Q.qsStats({}, M);
  assert.equal(E.ready, false); assert.equal(E.health.score, null, 'empty is not zero');
});

test('capacity: the margin sets the steps, the cushion and the plate hold it, a challenge moves it one step', () => {
  assert.equal(Q.qsCapacity({}).ready, false);
  assert.equal(Q.qsCapacity({ take: 5000, spend: 5100 }).slots, 0);
  assert.equal(Q.qsCapacity({ take: 5000, spend: 4900 }).slots, 1, '2% margin');
  assert.equal(Q.qsCapacity({ take: 5000, spend: 4500 }).slots, 2, '10% margin');
  assert.equal(Q.qsCapacity({ take: 5000, spend: 4000, cushionMonths: 3 }).slots, 3);
  assert.equal(Q.qsCapacity({ take: 5000, spend: 4000, cushionMonths: 0.5 }).slots, 1, 'the cushion first');
  assert.equal(Q.qsCapacity({ take: 5000, spend: 4000, cushionMonths: 3, plate: 'full' }).slots, 2);
  assert.equal(Q.qsCapacity({ take: 5000, spend: 4000, cushionMonths: 0.5, felt: 'more' }).slots, 2);
  assert.equal(Q.qsCapacity({ take: 5000, spend: 5100, felt: 'more' }).slots, 0, 'no free money: more room does not add a step');
  assert.equal(Q.qsCapacity({ take: 5000, spend: 4000, cushionMonths: 3 }).perStep, 1000 / 3);
});

test('how this plan fails: the weak spots closest first, and three moves', () => {
  const F = Q.qsFails({ take: 5000, spend: 4000, cash: 2000, hiDebt: 6000, interest: 110, incomes: 1, protDone: 0, protMax: 4, protNext: 'Renters insurance', lowGap: 0 }, M);
  assert.deepEqual(F.spots.map(s => s.id), ['paycheck', 'cover', 'debt']);
  assert.equal(F.moves.length, 3); assert.equal(F.moves[0].t, 'Build the cushion to 3 months: $10,000 more.');
  assert.deepEqual(F.steady, ['Prices go up']);
  const thin = Q.qsFails({ take: 5000, spend: 4800, cash: 30000 }, M);
  assert.deepEqual(thin.spots.map(s => s.id), ['margin']); assert.equal(thin.moves[0].t, 'Free $300 a month for a 10% margin.');
  assert.equal(Q.qsFails({ take: 5000, spend: 3000, cash: 30000 }).moves.length, 0, 'steady: nothing to stop');
  assert.equal(Q.qsFails({ take: 5000 }).ready, false);
});

test('hidden costs: interest, cash drag and time, a year, a month and in days of spending', () => {
  assert.equal(Q.qsInterest([{ amt: 6000, apr: 22 }, { amt: 1000, apr: null }]), 1320);
  assert.equal(Q.qsInterest([]), null);
  assert.ok(Math.abs(Q.qsCashDrag(30000, 24000, 0.027, 0.01) - 102) < 1e-9);
  assert.equal(Q.qsCashDrag(10000, 24000, 0.027), 0);
  assert.equal(Q.qsTimeCost(120, 30), 720); assert.equal(Q.qsTimeCost(120, null), null);
  const H = Q.qsHidden([{ id: 'a', name: 'A', year: 1320 }, { id: 'b', name: 'B', year: null }, { id: 'c', name: 'C', year: 720 }], 4000);
  assert.deepEqual(H.rows.map(r => r.id), ['a', 'c']); assert.equal(H.total, 2040); assert.equal(H.open.length, 1);
  assert.ok(Math.abs(H.days - 2040 / (48000 / 365)) < 1e-9); assert.equal(H.rows[0].month, 110);
});

test('where you rank: the SCF 2025 row for your age, your guess next to it', () => {
  const rows = PRI.rows;
  const R = Q.qsRank({ guess: 'above', nw: 20000, age: 30, rows }, M);
  assert.equal(R.median, 33000); assert.equal(R.where, 'below'); assert.equal(R.match, false); assert.equal(R.quarter, 1);
  assert.equal(Q.qsRank({ guess: 'near', nw: 34000, age: 30, rows }).where, 'near');
  assert.equal(Q.qsRank({ nw: 900000, age: 50, rows }).quarter, 4);
  assert.equal(Q.qsRank({ nw: 1000, rows }).ready, false, 'no age, no row');
});

test('opponents: a choice against your values, the cost in days and months', () => {
  const up = Q.QS_OPPONENTS.find(o => o.id === 'upgrade');
  assert.equal(Q.qsDuel(up, 'no', ['Freedom and time']).beaten, true);
  assert.equal(Q.qsDuel(up, 'yes', ['Freedom and time']).beaten, false);
  assert.equal(Q.qsDuel(up, 'yes', ['Fun']).beaten, true);
  assert.equal(Q.qsDuel(up, 'yes', ['Fun', 'Freedom and time']).kind, 'tie');
  assert.equal(Q.qsDuel(up, 'maybe', []), null);
  const C = Q.qsCost(600, 4000, 1000);
  assert.ok(Math.abs(C.days - 600 / (48000 / 365)) < 1e-9); assert.equal(C.months, 0.6);
  assert.equal(new Set(Q.QS_OPPONENTS.map(o => o.id)).size, Q.QS_OPPONENTS.length);
});

test('the judge: the record of each call, a challenge, and the money read\'s push-backs', () => {
  let log = [];
  const call = { id: 'capacity', label: 'x', said: 'Room for one new step this month.', evidence: [] };
  log = Q.qsJudgeAdd(log, call, 'not', 'more', '2026-11-26T10:00:00Z');
  assert.equal(Q.qsJudgeAdd(log, call, 'maybe', null, 'x'), log, 'only fits or not');
  const [J] = Q.qsJudge([{ ...call, said: 'Room for 2 new steps this month.' }], log);
  assert.equal(J.entries.length, 1); assert.equal(J.changed, true); assert.equal(J.challenged, true); assert.equal(J.first, call.said);
  const P = Q.qsFromPush([{ at: 'a', d: 'a', trait: 'envy', name: 'Envy', said: 'other', to: 'pride', toName: 'Pride' }]);
  assert.deepEqual(P, [{ id: 'read', at: 'a', said: 'Envy', tap: 'not', why: 'You said Pride fits better than Envy' }]);
  for (let i = 0; i < 70; i++) log = Q.qsJudgeAdd(log, call, 'fits', null, String(i));
  assert.equal(log.length, Q.QS_RULES.judgeKeep);
});

test('ask the game: answers from the plan, and the library by topic', () => {
  assert.deepEqual(Q.qsAsk('last', { cash: 6000, spend: 4000 }, M).lines, ['About 1.5 months with no pay coming in.', '$6,000 in cash / $4,000 a month.']);
  assert.equal(Q.qsAsk('when', { freeMonths: 240, age: 30 }).lines[0], 'In about 20 years, at about 50.');
  assert.match(Q.qsAsk('when', { freeMonths: null }).lines[0], /no date/);
  assert.equal(Q.qsAsk('next', { moves: [{ t: 'One.' }, { t: 'Two.' }] }).lines[1], 'Then: Two.');
  assert.equal(Q.qsAsk('nope', {}), null);
  const skills = [{ id: 'a', name: 'Pay off the card', text: 'interest' }, { id: 'b', name: 'Invest', text: 'fund' }, { id: 'c', name: 'Debt list', text: 'every debt' }];
  assert.deepEqual(Q.qsLearn('debt', skills).map(s => s.id), ['a', 'c'], 'a tie keeps the library order');
  assert.deepEqual(Q.qsLearn('nope', skills), []);
});

test('path packs: progress, the next step, and the pack that fits now', () => {
  const P = Q.QS_PACKS[0], R = Q.qsPack(P, [P.steps[0], P.steps[2]]);
  assert.equal(R.done, 2); assert.equal(R.next, P.steps[1]); assert.equal(R.finished, false);
  assert.equal(Q.qsPackFit({ cushionMonths: 0.5, hiDebt: 100 }), 'cushion');
  assert.equal(Q.qsPackFit({ cushionMonths: 2, hiDebt: 100 }), 'debt');
  assert.equal(Q.qsPackFit({ cushionMonths: 2 }), 'cushion');
  assert.equal(Q.qsPackFit({ cushionMonths: 4, protDone: 1, protMax: 3 }), 'protect');
  assert.equal(Q.qsPackFit({ cushionMonths: 4 }), 'invest');
  // every step is a skill of the game's library
  const src = read('game/data/skills.js'), win = {};
  new Function('window', src)(win);
  for (const p of Q.QS_PACKS) for (const id of p.steps) { const [t, i] = id.split(':'); assert.ok(win.SKILLS[t]?.skills[+i], id); }
});

test('graduating and the story: the finish line, the dates from the snapshots, the read only when shown', () => {
  const st = [{ id: 'debt', name: 'Debt free', done: true, pct: 1, left: 0 }, { id: 'fi', name: 'FI', done: false, pct: 0.25, left: 900000 }];
  assert.equal(Q.qsGraduate(st, 'debt').done, true); assert.equal(Q.qsGraduate(st).pct, 25); assert.equal(Q.qsGraduate(st, 'x').finish, 'fi');
  const stages = [{ id: 'k1', name: 'First $1k', what: '$1,000 set aside', measure: 'cash', target: 1000 }, { id: 'debt', name: 'Debt free', what: 'No debt', measure: 'debt', target: 0 }, { id: 'fi', name: 'FI', what: 'Work is optional', measure: 'invested', target: 'fi' }];
  const hist = [{ d: '2026-01-05', nw: -3000, cash: 800, debt: 6000, inv: 2000 }, { d: '2026-03-05', nw: 1000, cash: 1200, debt: 3000, inv: 3000 }, { d: '2026-06-05', nw: 6000, cash: 1500, debt: 0, inv: 4500 }];
  const S = Q.qsStory(hist, stages, { targets: { fi: 1e6 }, read: ['You started as X.'] }, M);
  assert.deepEqual(S.chapters.map(c => c.t), ['You started in Jan 2026 with -$3,000 of net worth.', 'Mar 2026: First $1k. $1,000 set aside.', 'Jun 2026: Debt free. No debt.', 'Jun 2026: $6,000 of net worth, $9,000 more than at the start.']);
  assert.deepEqual(S.read, []); assert.equal(S.readHidden, true);
  assert.deepEqual(Q.qsStory(hist, stages, { read: ['R'], showRead: true }).read, ['R']);
  assert.deepEqual(Q.qsStory([], stages).chapters, []);
});

test('the game\'s copy is made from this file and the SCF rows, and is current (node tools/game_quest_build.mjs)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('tools/game_quest_build.mjs', root)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
  assert.match(read('game/core/quest.js'), /const QS_PRIORS = /);
});
