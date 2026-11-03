// Phase 3.5 section 6: Shockingly Simple Math (M72) and Pay yourself first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yearsAtRate, simpleMath, payYourselfFirst } from '../js/math/simple.js';
import { householdFromInputs } from '../js/demo.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));

test('M72: the Shockingly Simple Math table (5% real, 4% WR): 50% is about 17 years, 10% about 51', () => {
  const at = s => yearsAtRate(s, { realReturn: 0.05, withdrawalRate: 0.04 });
  assert.ok(Math.abs(at(0.5) - 17) < 0.6, String(at(0.5)));
  assert.ok(Math.abs(at(0.1) - 51) < 1.5, String(at(0.1)));
  assert.ok(at(0.75) < at(0.5) && at(0.5) < at(0.25), 'a higher rate is always sooner');
  assert.equal(at(0), null);
});

test('M72: the dot and the next 5% step', () => {
  const r = simpleMath({ savingsRate: 0.23, realReturn: 0.05, withdrawalRate: 0.04 });
  assert.equal(r.next.rate, 0.25);
  assert.ok(r.gain > 0);
  assert.equal(r.curve.length, 19);
  assert.equal(simpleMath({ savingsRate: 0.25, realReturn: 0.05, withdrawalRate: 0.04 }).next.rate, 0.3);
});

test('Pay yourself first: a month and a paycheck', () => {
  const doc = householdFromInputs(demo.inputs, { name: 'Demo', now: '2026-11-01T12:00:00.000Z' });
  const p = payYourselfFirst(doc, ref, { now: new Date('2026-11-01T12:00:00Z') });
  assert.ok(Math.abs(p.perPaycheck * p.paysPerMonth - p.monthly) < 0.01);
  assert.ok(p.text.length > 0);
});
