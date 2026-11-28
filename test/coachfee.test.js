// SPDX-License-Identifier: AGPL-3.0-only
// The coaching fee math (run CC-1, items 21 and 22): each function of js/math/coachfee.js checked by hand on made-up
// numbers, and the game's copy current.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as C from '../js/math/coachfee.js';

const root = new URL('../', import.meta.url);
const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);

test('fees above a low-cost line: by hand, never under zero, and empty is not zero', () => {
  assert.equal(C.coFeesAbove({ year: 1200, total: 200000, low: 0.0005 }), 1100);
  assert.equal(C.coFeesAbove({ year: 50, total: 200000, low: 0.0005 }), 0);
  assert.equal(C.coFeesAbove({ year: null, total: 200000, low: 0.0005 }), null);
  assert.equal(C.coFeesAbove({ year: 300 }), null);
});

test('pays for itself: the parts that were found add up, a missing part is named and not counted as $0', () => {
  const parts = [{ id: 'fees', name: 'Fees found', amount: 1100 }, { id: 'bonus', name: 'Bonuses', amount: 900 }, { id: 'interest', name: 'Interest saved', amount: null }];
  const r = C.coPaysForItself({ parts, fee: 1000 });
  assert.equal(r.total, 2000); assert.deepEqual(r.missing, ['Interest saved']); assert.equal(r.complete, false);
  assert.equal(r.ready, true); assert.equal(r.net, 1000); assert.equal(r.times, 2); assert.equal(r.covers, true);
  assert.equal(r.rows[2].amount, null, 'a part that was not found has no amount');
  const all = C.coPaysForItself({ parts: parts.map(p => ({ ...p, amount: p.amount ?? 250 })), fee: 4500 });
  assert.equal(all.complete, true); assert.equal(all.total, 2250); assert.equal(all.net, -2250); assert.equal(all.times, 0.5); assert.equal(all.covers, false);
});

test('pays for itself: no headline number until the fee is set, and none when nothing was found', () => {
  const parts = [{ id: 'fees', name: 'Fees found', amount: 1100 }];
  for (const fee of [null, undefined, '', 0]) {
    const r = C.coPaysForItself({ parts, fee });
    assert.equal(r.ready, false); assert.equal(r.net, null); assert.equal(r.times, null); assert.equal(r.total, 1100);
    assert.deepEqual(r.needs, ['the coaching fee']);
  }
  const none = C.coPaysForItself({ parts: [{ id: 'fees', name: 'Fees found', amount: null }], fee: 1000 });
  assert.equal(none.total, null, 'nothing found is not a total of $0'); assert.equal(none.ready, false);
  assert.deepEqual(none.needs, ['at least one part found']);
  assert.equal(C.coPaysForItself({ parts: [{ id: 'a', name: 'A', amount: 0 }], fee: 100 }).total, 0, 'a part found at $0 is a real zero');
});

test('flat fee next to a yearly fee on the assets: one year and two years by hand', () => {
  const r = C.coFlatVsAum({ start: 100000, add: 10000, years: 2, growth: 0.07, aum: 0.01, flat: 3000 });
  assert.equal(r.ready, true); assert.equal(r.rows.length, 3);
  near(r.rows[1].none, 117000); near(r.rows[1].flat, 97000 * 1.07 + 10000); near(r.rows[1].aum, 117000 * 0.99); near(r.rows[1].aumFees, 1170);
  const a2 = (117000 * 0.99 * 1.07 + 10000) * 0.99;
  near(r.end.aum, a2); near(r.end.none, 117000 * 1.07 + 10000); near(r.aumFees, 1170 + (117000 * 0.99 * 1.07 + 10000) * 0.01);
  near(r.aumCost, r.end.none - a2); near(r.flatCost, 3000 * 1.07 * 1.07); near(r.gap, r.end.flat - r.end.aum);
});

test('flat fee next to a yearly fee: the defaults are the registered rules, and no flat line until a price is set', () => {
  const r = C.coFlatVsAum({ start: 250000, add: 12000 });
  assert.equal(r.years, 30); assert.equal(r.growth, 0.07); assert.equal(r.aumRate, 0.01); assert.equal(r.rows.length, 31);
  assert.equal(r.hasFlat, false); assert.equal(r.end.flat, null); assert.equal(r.gap, null); assert.equal(r.flatCost, null);
  assert.ok(r.end.aum < r.end.none && r.aumFees > 0);
  near(C.coFlatVsAum({ start: 1000, add: 0, years: 30, aum: 0 }).end.aum, 1000 * Math.pow(1.07, 30), 0.001);
  const empty = C.coFlatVsAum({});
  assert.equal(empty.ready, false); assert.deepEqual(empty.rows, []); assert.match(empty.needs.join(' '), /starting portfolio/);
  assert.equal(C.coFlatVsAum({ start: 5000, flat: 9000, years: 1 }).rows[0].flat, 0, 'a fee over the portfolio leaves $0, never under');
});

test('the game\'s copy is current', () => {
  execFileSync(process.execPath, [new URL('tools/game_coachfee_build.mjs', root).pathname, '--check'], { encoding: 'utf8' });
});
