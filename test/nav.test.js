import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABS, parseRoute, routeForPlace, search, tabRoute } from '../js/nav.js';

const fields = JSON.parse(readFileSync(new URL('../data/fields.json', import.meta.url)));

test('five tabs, same order, named as decided (R148)', () => {
  assert.deepEqual(TABS.map(t => t.name), ['Home', 'Net worth', 'Cash flow', 'Plan', 'Report']);
  assert.deepEqual(TABS[0].subs.filter(s => !s.hidden).map(s => s.name), ['Home', 'About you'], 'Phase 3: Home is one screen; Start session switches its mode (Review is the gate, not a sub-tab)');
  assert.deepEqual(TABS[1].subs.map(s => s.name), ['Assets', 'Debt', 'Credit cards', 'Protection', 'Fire drill']); // Credit cards: answer to 56; batch 44: Fire drill, a Phase 4 preview
  assert.deepEqual(TABS[2].subs.map(s => s.name), ['Income', 'Taxes', 'Budget', 'Calendar', 'Month end'], 'waterfall order');
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
  assert.equal(routeForPlace('Cash flow › Month-end close'), '#/cash-flow/close', 'a renamed sub-tab still lands');
  assert.equal(parseRoute('#/home').sub.name, 'Home');
  assert.equal(tabRoute(TABS[0]), '#/home/session');
  for (const old of ['#/home/prep', '#/home/live', '#/home/wrap-up']) assert.equal(parseRoute(old).hash, '#/home/session', `${old} lands on the one Home`);
  assert.equal(tabRoute(TABS[2]), '#/cash-flow/income');
});
test('no field lives on an old tab', () => {
  for (const f of fields) assert.doesNotMatch(f.livesOn, /My Money|Spending ›/, f.id);
});
test('every link in the code points at a live screen, not an old home (Guide me, Next 3, Open where it lives)', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const files = [];
  const walk = d => { for (const f of readdirSync(d)) { const p = `${d}/${f}`; statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } };
  walk(new URL('../js', import.meta.url).pathname);
  const bad = [];
  for (const f of files) {
    if (f.endsWith('/nav.js')) continue; // the redirect table itself
    for (const [, route] of readFileSync(f, 'utf8').matchAll(/['"`](#\/[a-z0-9-]+\/[a-z0-9-]+)/g)) {
      if (parseRoute(route).hash !== route) bad.push(`${f.split('/js/')[1]}: ${route}`);
    }
  }
  assert.deepEqual(bad, []);
});
test('a card opens Credit cards; any other debt opens Debt (answer to 56)', async () => {
  const { debtRoute } = await import('../js/nav.js');
  assert.equal(debtRoute({ type: 'Credit card' }), '#/net-worth/credit-cards');
  assert.equal(debtRoute({ type: 'Student loan' }), '#/net-worth/debt');
  assert.equal(parseRoute('#/net-worth/credit-cards').sub.name, 'Credit cards');
});
