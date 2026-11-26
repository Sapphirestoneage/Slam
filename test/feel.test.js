// SPDX-License-Identifier: AGPL-3.0-only
// Game feel (run Finish everything partly built, Part 20; M8R): each function of js/math/feel.js checked by hand on
// made-up numbers, the web page's backwardsOf on the same function, and the game's copy current.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as F from '../js/math/feel.js';
import { backwardsOf, NEED_MONTH, WHEN_YEARS } from '../js/solo.js';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const now = new Date(2026, 10, 26);

test('the finish line: each answer opens the next step, and empty is not zero', () => {
  const o = { wr: 0.04, r: 0.07, now };
  assert.equal(F.gfBackwards({ ...o }).step, 1);
  assert.equal(F.gfBackwards({ ...o, need: 0 }).step, 1, 'a need of 0 asks again');
  const s2 = F.gfBackwards({ ...o, need: 4000 });
  assert.equal(s2.step, 2); assert.equal(s2.total, 1200000); assert.equal(s2.aMonth, 4000);
  assert.equal(F.gfBackwards({ ...o, need: 48000, per: 'year' }).total, 1200000);
  assert.equal(F.gfBackwards({ ...o, need: 900000, per: 'total' }).aYear, 36000);
  const s3 = F.gfBackwards({ ...o, need: 4000, years: 20 });
  assert.equal(s3.step, 3); assert.equal(s3.byYear, 2046);
  const s4 = F.gfBackwards({ ...o, need: 4000, years: 20, have: 0 });
  assert.equal(s4.step, 4, 'a typed 0 invested is an answer');
  const i = 1.07 ** (1 / 12) - 1, n = 240;
  assert.ok(Math.abs(s4.needed - 1200000 * i / ((1 + i) ** n - 1)) < 1e-6);
  const s5 = F.gfBackwards({ ...o, need: 4000, years: 20, have: 30000, takeHome: 5000, spending: 3800 });
  assert.equal(s5.step, 5); assert.equal(s5.left, 1200);
  assert.ok(Math.abs(s5.gap - (s5.needed - 1200)) < 1e-9); assert.equal(s5.onTrack, false);
  assert.equal(s5.earnToClose, 5000 + s5.gap); assert.equal(s5.spendToClose, 3800 - s5.gap);
  // the months at today's pace: have(1+i)^m + left((1+i)^m - 1)/i reaches the total
  const m = s5.months, at = 30000 * (1 + i) ** m + 1200 * ((1 + i) ** m - 1) / i;
  assert.ok(Math.abs(at - 1200000) < 1e-3, `${at}`);
  assert.equal(F.gfBackwards({ ...o, need: 1000, years: 10, have: 400000 }).alreadyThere, true);
  assert.equal(F.gfBackwards({ ...o, need: 1000, years: 30, have: 50000 }).growsThere, true);
});

test('the web page and the game call the same function, with the reference presets', () => {
  const a = backwardsOf({ need: 4000, years: 20, have: 30000, takeHome: 5000, spending: 3800, ref, now });
  const b = F.gfBackwards({ need: 4000, years: 20, have: 30000, takeHome: 5000, spending: 3800, now, wr: ref.presets.withdrawalRate.default, r: ref.presets.realReturn.default });
  assert.deepEqual(a, b);
  assert.deepEqual(NEED_MONTH, F.GF_NEED_MONTH); assert.deepEqual(WHEN_YEARS, F.GF_WHEN_YEARS);
});

test('your past self: two stretches of your own snapshots, a pace a month each', () => {
  assert.equal(F.gfPastSelf([], '2026-11-26', 5000).ready, false);
  assert.equal(F.gfPastSelf([], '2026-11-26', 5000).daysToGo, 180);
  assert.equal(F.gfPastSelf([{ d: '2026-10-27', nw: 1000 }], '2026-11-26', 5000).daysToGo, 150);
  assert.equal(F.gfPastSelf([{ d: '2026-01-01', nw: 1 }], '2026-11-26', null).ready, false, 'no net worth, no race');
  const h = [{ d: '2026-05-10', nw: 1000 }, { d: '2026-06-01', nw: 1500 }, { d: '2026-08-18', nw: 3000 }, { d: '2026-12-01', nw: 99 }];
  const P = F.gfPastSelf(h, '2026-11-26', 4000);
  // now: from 2026-08-18 (the last at least 90 days old), 100 days, +1000; before: from 2026-05-10 (at least 90 days
  // before Aug 18), 100 days, +2000. A snapshot after today is left out.
  assert.equal(P.ready, true); assert.equal(P.now.from, '2026-08-18'); assert.equal(P.now.days, 100); assert.equal(P.then.from, '2026-05-10'); assert.equal(P.then.days, 100);
  assert.ok(Math.abs(P.now.pace - 304) < 1e-9); assert.ok(Math.abs(P.then.pace - 608) < 1e-9);
  assert.equal(P.lead, 'then');
  assert.equal(F.gfPastSelf(h, '2026-11-26', 5000.0).lead, 'tie');
  assert.equal(F.gfPastSelf(h, '2026-11-26', 6000).lead, 'now');
});

test('the bottleneck: eight kinds, your numbers and your taps, and your pick wins', () => {
  assert.equal(F.GF_KINDS.length, 8);
  for (const k of F.GF_KINDS) { assert.ok(F.GF_CHECKS[k]); assert.ok(F.GF_REAL[k]); }
  const none = F.gfBottleneck({});
  assert.equal(none.ready, false); assert.equal(none.top, null); assert.equal(none.asked, 0);
  assert.equal(F.gfBottleneck({ facts: { left: 0 } }).top, 'money');
  assert.equal(F.gfBottleneck({ facts: { left: 500, need: 400 } }).ready, false, 'enough left over is no call');
  assert.equal(F.gfBottleneck({ facts: { left: 300, need: 400 } }).ranked[0].score, 2);
  assert.equal(F.gfBottleneck({ facts: { late: true, rules: true } }).top, 'time', 'a tie goes to the kind higher on the list');
  const R = F.gfBottleneck({ facts: { left: 300, need: 400 }, taps: { money: 'no', fear: 'yes', energy: 'some' } });
  assert.equal(R.top, 'fear'); assert.equal(R.second, 'money'); assert.equal(R.asked, 3);
  assert.equal(R.ranked.find(x => x.id === 'money').score, 1);
  assert.equal(F.gfBottleneck({ taps: { skill: 'no' } }).ranked.find(x => x.id === 'skill').score, 0, 'never below zero');
  const P = F.gfBottleneck({ facts: { left: 0 }, pick: 'people' });
  assert.equal(P.top, 'people'); assert.equal(P.picked, true);
  assert.equal(F.gfBottleneck({ facts: { left: 0 }, pick: 'nonsense' }).top, 'money');
});

test('the stories are made up, one for each kind, and say so', () => {
  assert.match(F.GF_STORY_LABEL, /made-up/i); assert.match(F.GF_STORY_LABEL, /Not a real person/);
  for (const k of F.GF_KINDS) assert.equal(F.GF_STORIES.filter(s => s.kind === k).length, 1, k);
  assert.equal(F.gfStories('fear', 3)[0].kind, 'fear'); assert.equal(F.gfStories('fear', 3).length, 3);
  assert.equal(F.gfStories(null, 2)[0].id, F.GF_STORIES[0].id);
  for (const s of F.GF_STORIES) assert.doesNotMatch(s.story + s.title + s.move, /\b(mistake|failed|behind|off track)\b/i);
});

test('the game\'s copy is current', () => {
  execFileSync(process.execPath, [new URL('tools/game_feel_build.mjs', root).pathname, '--check'], { encoding: 'utf8' });
  assert.match(read('game/core/feel.js'), /GF_PRESETS = \{"withdrawalRate":0\.04,"realReturn":0\.07\}/);
});
