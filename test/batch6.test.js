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

import { institutionsOf, addInstitution, institutionOf, rowLabel, atInstitution, migrateInstitutions, removeInstitution, INSTITUTION_KINDS } from '../js/institutions.js';
import { exportFile, importInto, newHousehold } from '../js/records.js';

test('items 13 to 15: institutions are one list; rows point at one and read Institution · Kind or · Nickname; an old file\'s typed names migrate, deduped', () => {
  const ctx = demoCtx(); const s = ctx.store;
  assert.deepEqual(INSTITUTION_KINDS, ['Bank', 'Credit union', 'Brokerage', 'Workplace plan', 'Lender', 'Insurer', 'Other']);
  const chase = addInstitution(s, { name: 'Chase', kind: 'Bank' });
  assert.equal(addInstitution(s, { name: ' chase ' }).id, chase.id, 'deduped by name, case blind');
  const checking = s.find(r => r.kind === 'account' && r.values.group === 'cash')[0];
  s.update(checking.id, { institutionId: chase.id, name: null });
  assert.equal(rowLabel(s.doc, s.get(checking.id)), `Chase · ${checking.type}`);
  s.update(checking.id, { name: 'Everyday' });
  assert.equal(rowLabel(s.doc, s.get(checking.id)), 'Chase · Everyday');
  const card = s.find(r => r.kind === 'debt' && r.type === 'Credit card')[0];
  s.update(card.id, { institutionId: chase.id });
  const at = atInstitution(s.doc, chase.id);
  assert.equal(at.rows.length, 2); assert.equal(at.total, (checking.values.balance ?? 0) - (card.values.balance ?? 0));
  // An older file with typed names: rows appear, deduped, and the records point at them.
  const old = JSON.parse(JSON.stringify(exportFile(s.doc)));
  delete old.household.profile.institutions;
  for (const r of old.household.records) { delete r.values.institutionId; }
  const a = old.household.records.filter(r => r.kind === 'account');
  a[0].values.institution = 'Ally'; a[1].values.institution = 'ALLY '; old.household.records.filter(r => r.kind === 'debt')[0].values.institution = 'Nelnet';
  const t = new Store(newHousehold({ name: 'T', now: now.toISOString() }));
  importInto(t, old);
  const names = institutionsOf(t.doc).map(i => i.name).sort();
  assert.deepEqual(names, ['Ally', 'Nelnet']);
  assert.equal(institutionOf(t.doc, t.doc.records.find(r => r.id === a[1].id)).name, 'Ally');
  assert.equal(institutionsOf(t.doc).find(i => i.name === 'Nelnet').kind, 'Lender');
  assert.equal(migrateInstitutions(t.doc).profile.institutions.length, 2, 'idempotent');
  removeInstitution(s, chase.id);
  assert.equal(s.get(checking.id).values.institutionId, null, 'its rows keep their nicknames and lose the pointer');
  s.undo(); assert.equal(institutionsOf(s.doc).length, 1, 'undoable');
});
