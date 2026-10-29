import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { addPresets } from '../js/presets.js';
import { householdFromInputs } from '../js/demo.js';
import { metrics } from '../js/math/metrics.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));

test('usual list: a new client gets every line, each a Guess', () => {
  const s = new Store(newHousehold({ name: 'New' }));
  const n = addPresets(s, ref);
  assert.equal(n, ref.spendingPresets.lines.length);
  assert.ok(n >= 40);
  assert.ok(s.find(r => r.kind === 'bill').every(r => r.status === 'Not sure' && r.amount > 0));
  assert.equal(s.doc.settings.presetsAdded, true);
});

test('usual list: skips lines the file already has, by name or category', () => {
  const doc = householdFromInputs({ age: 30, rent: 1000, utilities: 40, phoneCoveredByParents: 70 }, { name: 'X' });
  const s = new Store(doc);
  const n = addPresets(s, ref);
  assert.equal(n, ref.spendingPresets.lines.length - 4); // rent, utilities, phone, internet
  assert.equal(s.find(r => r.kind === 'bill' && r.values.category === 'Rent or mortgage').length, 1);
});

test('usual list: Not for me counts as zero in spending', () => {
  const s = new Store(newHousehold({ name: 'New' }));
  addPresets(s, ref);
  const before = metrics(s.doc, ref).inputs.spending;
  const groceries = s.find(r => r.name === 'Groceries')[0];
  s.update(groceries.id, { status: 'Not for me' });
  assert.equal(metrics(s.doc, ref).inputs.spending, before - groceries.amount);
});
