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

test('layers fill in order: Buffer, little e, income gaps, big e as FAT, then DRAFTT, then full (the refill order)', () => {
  const gaps = [{ id: 'g', name: 'Summer off', start: '2027-06', months: 2 }];
  const out = cashLayers(x(20000), { gaps, now });
  assert.deepEqual(out.layers.map(l => l.id), ['buffer', 'little-e', 'gap:g', 'big-e:fat', 'big-e:draftt', 'big-e:full']);
  const [buf, e, gap, fat, draftt, full] = out.layers;
  assert.ok(Math.abs(buf.target - 3000 * 2 * 12 / 52) < 0.01, 'two weeks of spending'); assert.ok(buf.full);
  assert.equal(e.filled, 1000);
  assert.equal(gap.target, 6000); assert.equal(gap.filled, 6000);
  // The Rule of 5: five months, one definition. FAT $2,200 a month, DRAFTT $2,500 (adds Therapy), full $3,000.
  assert.equal(out.months, 5);
  assert.equal(fat.total, 2200 * 5); assert.equal(fat.filled, 2200 * 5, 'FAT fills (what is left after the Buffer, little e and the gap covers it)');
  assert.equal(draftt.target, 300 * 5, 'DRAFTT adds only what FAT did not cover');
  assert.ok(Math.abs(draftt.filled - (20000 - buf.target - 1000 - 6000 - 11000)) < 0.01, 'what is left goes into DRAFTT'); assert.equal(full.filled, 0);
  assert.equal(full.target, 500 * 5);
  assert.equal(out.bufferFull && out.littleFull && !out.bigFull, true);
});

test('a dip takes from the Buffer first, then little e, then big e last; refilling runs the other way', async () => {
  const { dipFrom } = await import('../js/math/layers.js');
  const out = cashLayers(x(20000), { now });
  const d = dipFrom(out.layers, 2500);
  assert.deepEqual(d.from.map(f => [f.layer, Math.round(f.amount)]), [['buffer', 1385], ['little-e', 1000], ['big-e:fat', 115]]);
  assert.equal(d.uncovered, 0);
  const after = cashLayers(x(20000 - 2500), { now });
  assert.ok(after.bufferFull && after.littleFull, 'what is left refills the Buffer and little e first');
  assert.equal(dipFrom(cashLayers(x(500), { now }).layers, 2000).uncovered, 1500);
});

test('an income gap sits in FOO step 8 until its date comes within 12 months, then step 1', () => {
  const gap = { id: 'g', start: '2028-03', months: 3 };
  assert.equal(gapStep(gap, now), 8);
  assert.equal(gapStep(gap, new Date('2027-03-15T12:00:00Z')), 1, 'twelve months out');
  assert.equal(gapStep(gap, new Date('2027-02-15T12:00:00Z')), 8);
});

test('big e is one definition (five months) whatever the income stability; one account per layer reads each account', () => {
  assert.equal(cashLayers(x(0), { stability: 'Unpredictable', now }).months, 5);
  const out = cashLayers(x(0), { mode: 'accounts', accounts: [{ id: 'a', name: 'Little e savings', value: 800 }], layerAccounts: { 'little-e': 'a' }, now });
  assert.equal(out.layers[1].filled, 800); assert.equal(out.layers[1].account, 'Little e savings');
});

test('backups of the backups add runway months and are never a fund', () => {
  const r = backupRunway([{ kind: 'Available credit', amount: 3000 }, { kind: 'Family help', amount: 1500 }], 3000);
  assert.equal(r.months, 1.5);
  const out = cashLayers(x(5000), { now });
  assert.ok(!out.layers.some(l => /backup/i.test(l.name)));
});
