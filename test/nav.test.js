import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABS, parseRoute, routeForPlace, search } from '../js/nav.js';

const fields = JSON.parse(readFileSync(new URL('../data/fields.json', import.meta.url)));

test('five tabs, same order, named as decided (R148)', () => {
  assert.deepEqual(TABS.map(t => t.name), ['Home', 'My Money', 'Spending', 'Plan', 'Report']);
  assert.deepEqual(TABS[1].subs.map(s => s.name), ['Profile', 'Income', 'Debt', 'Assets', 'Protection', 'Taxes']);
});
test('routes: unknown falls back to the first sub-tab', () => {
  assert.equal(parseRoute('#/my-money/debt').sub.name, 'Debt');
  assert.equal(parseRoute('#/plan/nope').sub.name, 'Goals');
  assert.equal(parseRoute('').tab.name, 'Home');
  assert.equal(parseRoute('#/tools/data').tab.name, 'Coach tools');
});
test('every field lives on a screen that exists', () => {
  for (const f of fields) assert.ok(routeForPlace(f.livesOn), `${f.id} ${f.livesOn}`);
});
test('Find: HSA in one go', () => {
  const r = search('HSA', { fields });
  assert.ok(r.length);
  assert.match(r[0].label, /HSA/);
  assert.equal(search('debt', { fields })[0].kind, 'screen');
  assert.deepEqual(search('  ', { fields }), []);
  assert.equal(search('netf', { records: [{ id: 'a', kind: 'bill', name: 'Netflix' }] })[0].route, '#/spending/budget');
});
