// SPDX-License-Identifier: AGPL-3.0-only
// Asking fewer questions (run Finish everything partly built, Part 17, M8Y): the cost of not knowing in dollars, one
// ranking of the open questions for both apps, and the stopping rule. The game's copy is current.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { arYearOn, arSwing, arScore, arRank, arStop, AR_RULES } from '../js/math/askrank.js';
import { RULES, ASSUMPTIONS } from '../js/registry/assumptions.js';
import { enoughWords } from '../js/ui/ask-ui.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('your money a year from now: net worth plus a year of what is left; a missing number gives null, never 0', () => {
  assert.equal(arYearOn(10000, 4000, 3500), 16000);
  assert.equal(arYearOn(-2000, 3000, 3200), -4400);
  assert.equal(arYearOn(null, 4000, 3500), null);
  assert.equal(arYearOn(10000, null, 3500), null);
  assert.equal(arSwing(16000, 22000), 6000);
  assert.equal(arSwing(22000, 16000), 6000);
  assert.equal(arSwing(null, 1), null);
});

test('the ranking: dollars over seconds, a near tie goes to the preferred kind, then the order', () => {
  assert.equal(arScore({ value: 600, seconds: 60 }), 10);
  assert.equal(arScore({ value: 600 }), 600);
  assert.equal(arScore({ score: 3, value: 600 }), 3);
  const R = arRank([{ id: 'a', value: 1000, order: 0 }, { id: 'b', value: 9000, order: 1 }, { id: 'c', value: 4000, order: 2 }]);
  assert.deepEqual(R.map(q => q.id), ['b', 'c', 'a']);
  // within 2%: the preferred kind first, else the order
  const T = [{ id: 'x', value: 1000, order: 0 }, { id: 'y', value: 1010, order: 1, spending: true }];
  assert.deepEqual(arRank(T, { first: q => q.spending }).map(q => q.id), ['y', 'x']);
  assert.deepEqual(arRank(T).map(q => q.id), ['x', 'y']);
  assert.equal(AR_RULES.tie, 0.02);
});

test('the stopping rule: ask until the questions asked cover 80% of what could move; the rest can wait', () => {
  const R = arRank([{ id: 'home', value: 18000 }, { id: 'food', value: 6000 }, { id: 'car', value: 4800 }, { id: 'fun', value: 3600 }, { id: 'bills', value: 1800 }]);
  const S = arStop(R);
  assert.deepEqual(S.ask.map(q => q.id), ['home', 'food', 'car']);
  assert.deepEqual(S.rest.map(q => q.id), ['fun', 'bills']);
  assert.equal(S.total, 34200);
  assert.equal(S.restValue, 5400);
  assert.equal(S.stop, true);
  assert.ok(S.cover >= 0.8);
  // one question with no number yet is always asked; nothing open: nothing to stop
  const M = arStop([{ id: 'age', value: Infinity }, { id: 'x', value: 0 }]);
  assert.deepEqual(M.ask.map(q => q.id), ['age']);
  assert.equal(arStop([]).stop, false);
  assert.equal(RULES.askStopShare, AR_RULES.stopShare);
  const row = ASSUMPTIONS.find(a => a.id === 'rules.askStopShare');
  assert.ok(row && /Pareto/.test(row.source) && row.date === '2026-11-26');
});

test('Ask me next says when the rest of the questions can wait, in plain words', () => {
  assert.equal(enoughWords({ ask: 2, rest: 3, cover: 0.85 }), '2 questions cover most of what could still narrow the plan. The other 3 questions move it little, so they can wait.');
  assert.equal(enoughWords({ ask: 2, rest: 0 }), null);
  assert.equal(enoughWords(null), null);
  assert.match(read('js/math/nextbest.js'), /arRank\(out/);
});

test('the game\'s copy is made from this file and is current (node tools/game_askrank_build.mjs)', () => {
  const hash = createHash('sha256').update(read('js/math/askrank.js')).digest('hex').slice(0, 16);
  assert.match(read('game/core/askrank.js'), new RegExp(`SOURCE-HASH  ${hash}`), 'js/math/askrank.js changed: run node tools/game_askrank_build.mjs, then the game steps (stamp, code map)');
  assert.match(read('game/index.html'), /<script src="core\/askrank\.js\?v=[0-9a-f]+"><\/script>/);
  assert.match(read('game/index.html'), /<script src="features\/fewer\.js\?v=[0-9a-f]+"><\/script>/);
});
