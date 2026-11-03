// Phase 3.5 section 3: cash layers (M68).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cashLayers, littleE, gapStep, backupRunway } from '../js/math/layers.js';

const now = new Date('2026-11-03T12:00:00Z');
const lines = [
  { draftt: 'Accommodation', amount: 1500, per: 'month' }, { draftt: 'Food', amount: 500, per: 'month' }, { draftt: 'Transportation', amount: 200, per: 'month' },
  { draftt: 'Therapy', amount: 300, per: 'month' }, { draftt: 'Wants', amount: 500, per: 'month' },
];
const x = (cash, extra = {}) => ({ lines, spending: 3000, age: 30, cash, roommates: 0, ...extra });

test('little e: the smaller of $1,000 and the highest deductible; a Guess until one exists', () => {
  assert.deepEqual([littleE([]).target, littleE([]).guess], [1000, true]);
  assert.equal(littleE([600, 400]).target, 600);
  const big = littleE([2500]);
  assert.equal(big.target, 1000);
  assert.match(big.note, /big e covers the rest/);
});

test('layers fill in order: little e, income gaps, big e as FAT, then DRAFTT, then full', () => {
  const gaps = [{ id: 'g', name: 'Summer off', start: '2027-06', months: 2 }];
  const out = cashLayers(x(20000), { gaps, now });
  assert.deepEqual(out.layers.map(l => l.id), ['little-e', 'gap:g', 'big-e:fat', 'big-e:draftt', 'big-e:full']);
  const [e, gap, fat, draftt, full] = out.layers;
  assert.equal(e.filled, 1000);
  assert.equal(gap.target, 6000); assert.equal(gap.filled, 6000);
  // Rule of 5 at 30: 6 months. FAT $2,200 a month, DRAFTT $2,500 (adds Therapy), full $3,000.
  assert.equal(fat.total, 2200 * 6); assert.equal(fat.filled, 13000, 'what is left after little e and the gap');
  assert.equal(draftt.target, 300 * 6, 'DRAFTT adds only what FAT did not cover');
  assert.equal(draftt.filled, 0); assert.equal(full.filled, 0);
  assert.equal(full.target, 500 * 6);
});

test('an income gap sits in FOO step 8 until its date comes within 12 months, then step 1', () => {
  const gap = { id: 'g', start: '2028-03', months: 3 };
  assert.equal(gapStep(gap, now), 8);
  assert.equal(gapStep(gap, new Date('2027-03-15T12:00:00Z')), 1, 'twelve months out');
  assert.equal(gapStep(gap, new Date('2027-02-15T12:00:00Z')), 8);
});

test('income stability adds months; one account per layer reads each account', () => {
  assert.equal(cashLayers(x(0), { stability: 'Unpredictable', now }).months, 9);
  const out = cashLayers(x(0), { mode: 'accounts', accounts: [{ id: 'a', name: 'Little e savings', value: 800 }], layerAccounts: { 'little-e': 'a' }, now });
  assert.equal(out.layers[0].filled, 800); assert.equal(out.layers[0].account, 'Little e savings');
});

test('backups of the backups add runway months and are never a fund', () => {
  const r = backupRunway([{ kind: 'Available credit', amount: 3000 }, { kind: 'Family help', amount: 1500 }], 3000);
  assert.equal(r.months, 1.5);
  const out = cashLayers(x(5000), { now });
  assert.ok(!out.layers.some(l => /backup/i.test(l.name)));
});
