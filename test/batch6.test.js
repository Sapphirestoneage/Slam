// Batch 6: usability. The pure parts: what a screen counts as left (counters, What's missing, arrive-and-highlight).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { createCtx } from '../js/ui/staples.js';
import { listCompletion, missingFor, routeKey, MISSING } from '../js/completion.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const demoCtx = () => { const store = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() }); return createCtx({ store, ref, now: () => now }); };

test('items 2 and 3: a screen\'s missing fields come as items with a focus key, core first, one per field; nothing left means an empty list', () => {
  const ctx = demoCtx();
  assert.deepEqual(Object.keys(MISSING), ['cash-flow/income', 'net-worth/debt', 'net-worth/credit-cards', 'net-worth/assets', 'net-worth/protection', 'cash-flow/budget']);
  assert.equal(routeKey('#/net-worth/debt'), 'net-worth/debt');
  const before = missingFor(ctx, '#/net-worth/debt').filter(i => i.level === 'Core');
  assert.equal(before.length, 0, 'the Demo client has every debt balance and APR');
  const car = ctx.store.find(r => r.kind === 'debt' && r.type === 'Car loan')[0];
  ctx.store.update(car.id, { apr: null });
  const items = missingFor(ctx, '#/net-worth/debt');
  const core = items.filter(i => i.level === 'Core');
  assert.equal(core.length, 1);
  assert.deepEqual([core[0].id, core[0].field, core[0].focus, core[0].route, core[0].name], [car.id, 'apr', `${car.id}:apr`, '#/net-worth/debt', 'Car loan: APR']);
  assert.ok(core[0].word, 'a word for the status (missing, Roughly, Not sure)');
  const c = listCompletion(ctx, r => r.kind === 'debt', ['balance', 'apr']);
  assert.equal(c.core.done, c.core.of - 1);
  assert.equal(c.core.items.length, 1); assert.ok(c.full.items.length >= 1, 'full detail lists more');
  assert.equal(c.core.missing[0], 'Car loan: APR', 'the words stay for What\'s missing');
  assert.equal(missingFor(ctx, '#/home/session').length, 0, 'a screen with no completion has nothing to light up');
});
