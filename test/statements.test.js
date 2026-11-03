// Phase 3.5 section 2: the three statements tie out (M62 to M67).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { instances, mark, closeMonth } from '../js/month.js';
import { statements, netWorthStatement, valueAt, ASSET_ORDER } from '../js/math/statements.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const privatePath = new URL('../fixtures/eli.local.json', import.meta.url);
const YM = '2026-10';

// A household made in September, a month lived on the calendar in October, balances typed on November 1.
function closedMonth(inputs, { missing = 0 } = {}) {
  let clock = '2026-09-15T12:00:00.000Z';
  const doc = householdFromInputs(inputs, { name: 'Close test', now: clock });
  const s = new Store(doc, { now: () => clock });
  const nowSep = new Date(clock);
  const before = statements(s.doc, ref, { kind: 'month', ym: YM }, { now: nowSep });
  clock = '2026-10-31T18:00:00.000Z';
  for (const i of instances(s.doc, ref, YM, { now: new Date(clock) }).filter(x => x.kind !== 'win' && !x.onCard)) mark(s, i.key, { status: 'Paid', paid: i.planned });
  const lived = statements(s.doc, ref, { kind: 'month', ym: YM }, { now: new Date(clock) });
  // November 1: the statements say where cash, debts and investments should be; type exactly that (minus anything missing).
  clock = '2026-11-01T09:00:00.000Z';
  const cash = s.find(r => r.kind === 'account' && r.values.group === 'cash');
  s.transaction('Balances on Nov 1', () => {
    const shift = lived.cash.end - lived.netWorthStart.cash - missing;
    if (cash.length) s.update(cash[0].id, { balance: (cash[0].values.balance ?? 0) + shift });
    for (const d of lived.cash.debt.concat(lived.cash.everyday).filter(i => i.principal)) {
      const r = s.get(d.recId);
      s.update(r.id, { balance: Math.round(((r.values.balance ?? 0) - d.principal) * 100) / 100 });
    }
  });
  closeMonth(s, ref, YM, { now: new Date(clock) });
  return { s, st: statements(s.doc, ref, { kind: 'month', ym: YM }, { now: new Date('2026-11-02T12:00:00Z') }), before };
}

test('history: a balance as of a date is the last change before it', () => {
  const doc = { history: [{ op: 'add', id: 'a', at: '2026-01-01' }, { op: 'set', id: 'a', field: 'balance', from: null, to: 100, at: '2026-01-01' }, { op: 'set', id: 'a', field: 'balance', from: 100, to: 250, at: '2026-03-01' }] };
  const r = { id: 'a', values: { balance: 250 } };
  assert.equal(valueAt(doc, r, 'balance', '2026-02-01').value, 100);
  assert.equal(valueAt(doc, r, 'balance', '2026-04-01').value, 250);
  assert.equal(valueAt(doc, r, 'balance', '2025-12-01').exists, false, 'not added yet');
});

test('M62 net worth statement: liquidity order, totals match net worth, unvested below the line', () => {
  const doc = householdFromInputs(demo.inputs, { name: 'Demo', now: '2026-09-15T12:00:00.000Z' });
  doc.records.push({ id: 'k', kind: 'account', type: '401(k)', name: '401(k)', values: { group: 'investment', balance: 5000, unvested: 1000 }, fieldStatus: {} });
  const nw = netWorthStatement(doc);
  const order = nw.assets.map(g => g.name);
  assert.deepEqual(order, ASSET_ORDER.filter(n => order.includes(n)), 'cash first, real assets last');
  assert.equal(nw.netWorth, nw.totalAssets - nw.totalDebts);
  assert.equal(nw.unvested[0].value, 1000);
  assert.equal(nw.totalAssets, 6000 + 22000 + 9500 + 5000 - 1000, 'unvested match is not counted');
});

test('Demo client: one closed month ties out within $1, with $0 unexplained', () => {
  const { st } = closedMonth(demo.inputs);
  assert.ok(Math.abs(st.tie.unexplainedCash) < 1, `cash: ${st.tie.unexplainedCash}`);
  assert.ok(Math.abs(st.cash.end - st.netWorth.cash) < 1);
  assert.ok(Math.abs(st.tie.bridge.unexplained) < 1, `net worth bridge: ${st.tie.bridge.unexplained}`);
  const lines = st.tie.accrualVsCash.lines.reduce((t, l) => t + l.value, 0);
  assert.ok(Math.abs(lines - st.tie.accrualVsCash.difference) < 0.01, 'accrual vs cash: every dollar of the gap is on a line');
  // M63: gross + match - taxes - saved = take-home; take-home - fixed - variable = surplus.
  const i = st.income;
  assert.ok(Math.abs(i.gross + i.match - i.taxes - i.saved - i.takeHome) < 0.01);
  assert.ok(Math.abs(i.takeHome - i.fixedTotal - i.variableTotal - i.surplus) < 0.01);
});

test('Test client (private): one closed month ties out within $1', { skip: !existsSync(privatePath) && 'fixtures/eli.local.json is missing. Put SLAM Test Client (private).xlsx in fixtures/ and run python3 tools/fixtures.py private.' }, () => {
  const { st } = closedMonth(JSON.parse(readFileSync(privatePath)).inputs);
  assert.ok(Math.abs(st.tie.unexplainedCash) < 1);
  assert.ok(Math.abs(st.tie.bridge.unexplained) < 1);
});

test('a missing entry shows as unexplained cash, and Find it lists the unmarked days', () => {
  const { st } = closedMonth(demo.inputs, { missing: 85 });
  assert.equal(Math.round(st.tie.unexplainedCash), -85, 'cash is $85 lower than the statement says');
  // Leave one item unmarked in a fresh month: it is listed for Find it.
  const doc = householdFromInputs(demo.inputs, { name: 'Demo', now: '2026-09-15T12:00:00.000Z' });
  const nov = statements(doc, ref, { kind: 'month', ym: '2026-11' }, { now: new Date('2026-11-20T12:00:00Z') });
  assert.ok(nov.cash.unmarked.length > 0);
  assert.ok(nov.cash.unmarked.every(u => u.date.startsWith('2026-11')));
});

test('a year statement adds up its months', () => {
  const doc = householdFromInputs(demo.inputs, { name: 'Demo', now: '2026-01-02T12:00:00.000Z' });
  const yr = statements(doc, ref, { kind: 'year', year: 2026 }, { now: new Date('2026-11-20T12:00:00Z') });
  const mo = statements(doc, ref, { kind: 'month', ym: '2026-03' }, { now: new Date('2026-11-20T12:00:00Z') });
  assert.ok(Math.abs(yr.income.takeHome - 12 * mo.income.takeHome) < 0.01);
});
