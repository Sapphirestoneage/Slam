import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABS, parseRoute, routeForPlace, search } from '../js/nav.js';

const fields = JSON.parse(readFileSync(new URL('../data/fields.json', import.meta.url)));

test('five tabs, same order, named as decided (R148)', () => {
  assert.deepEqual(TABS.map(t => t.name), ['Home', 'Net worth', 'Cash flow', 'Plan', 'Report']);
  assert.deepEqual(TABS[0].subs.map(s => s.name), ['About you', 'Prep', 'Live', 'Wrap-up']);
  assert.deepEqual(TABS[1].subs.map(s => s.name), ['Assets', 'Debt', 'Protection']);
  assert.deepEqual(TABS[2].subs.map(s => s.name), ['Income', 'Taxes', 'Budget', 'Calendar', 'Month-end close'], 'waterfall order');
});
test('routes: unknown falls back to the first sub-tab', () => {
  assert.equal(parseRoute('#/net-worth/debt').sub.name, 'Debt');
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
  assert.equal(search('netf', { records: [{ id: 'a', kind: 'bill', name: 'Netflix' }] })[0].route, '#/cash-flow/budget');
});

test('old routes redirect to the new homes (bookmarks, Find, every number links to its home)', () => {
  const moved = { '#/my-money/profile': '#/home/profile', '#/my-money/income': '#/cash-flow/income', '#/my-money/taxes': '#/cash-flow/taxes',
    '#/my-money/debt': '#/net-worth/debt', '#/my-money/assets': '#/net-worth/assets', '#/my-money/protection': '#/net-worth/protection',
    '#/spending/budget': '#/cash-flow/budget', '#/spending/calendar': '#/cash-flow/calendar', '#/spending/close': '#/cash-flow/close',
    '#/my-money': '#/home/profile', '#/spending': '#/cash-flow/budget', '#/my-money/nope': '#/home/profile' };
  for (const [from, to] of Object.entries(moved)) assert.equal(parseRoute(from).hash, to, from);
  assert.equal(routeForPlace('My Money › Debt'), '#/net-worth/debt', 'an old Lives on still lands');
  assert.equal(routeForPlace('Spending › Cash flow calendar'), '#/cash-flow/calendar');
  assert.equal(routeForPlace('Cash flow › Taxes'), '#/cash-flow/taxes');
  assert.equal(routeForPlace('Home › About you'), '#/home/profile');
  assert.equal(parseRoute('#/home').sub.name, 'About you', 'About you is the first stop in Home');
});
test('no field lives on an old tab', () => {
  for (const f of fields) assert.doesNotMatch(f.livesOn, /My Money|Spending ›/, f.id);
});
