// Batch 34 (Rocket Surgery on the screens Batch 20 did not score): the statements say the same surplus as Home and
// Overview, and a month before the file began has nothing on file instead of a row of $0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { statements, statementRows, previous, fileBegan } from '../js/math/statements.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-06T12:00:00Z');
const persona = id => importFile(JSON.parse(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url))));
const nov = { kind: 'month', ym: '2026-11' };

test('a gut-only client: the income statement surplus is the monthly surplus (the gut spending money counts)', () => {
  for (const id of ['maya', 'alexis', 'deficit', 'tom']) {
    const doc = persona(id);
    const st = statements(doc, ref, nov, { now });
    const m = metrics(doc, ref, { now });
    assert.ok(Math.abs(st.income.surplus - m.surplus.value) < 1, `${id}: statement ${st.income.surplus}, surplus ${m.surplus.value}`);
  }
  const maya = statements(persona('maya'), ref, nov, { now });
  assert.equal(Math.round(maya.income.surplus), 1500, '$5,200 take-home minus the $3,500 gut minus the $200 card payment');
  assert.ok(maya.income.variable.some(l => l.gut), 'the part no line covers is a variable line');
});

test('sinking funds are spoken for: their own line, out of the surplus, back in the net worth bridge', () => {
  const doc = persona('multimillionaire');
  const st = statements(doc, ref, nov, { now });
  const m = metrics(doc, ref, { now });
  assert.ok(st.income.sinking > 0);
  assert.ok(Math.abs(st.income.surplus - m.surplus.value) < 1);
  assert.equal(st.tie.bridge.sinking, st.income.sinking);
  const rows = statementRows(st, statements(doc, ref, previous(nov), { now })).income;
  assert.ok(rows.some(r => r.label === 'Into sinking funds'));
});

test('a file that began this month: last month has nothing on file and the tie-out waits for next month', () => {
  const doc = persona('maya');
  assert.equal(fileBegan(doc), '2026-11-05T12:00:00.000Z');
  const cur = statements(doc, ref, nov, { now }), last = statements(doc, ref, previous(nov), { now });
  assert.equal(last.onFile, false);
  assert.equal(cur.startKnown, false);
  assert.equal(cur.tie.startKnown, false);
  const rows = statementRows(cur, last);
  assert.ok(rows.netWorth.every(r => r.last === null && r.change === null), 'October shows – , not $0 and a +$14,200 change');
  assert.equal(rows.cash.find(r => r.label === 'Starting cash').now, null, 'no starting balance on file');
  const dec = statements(doc, ref, { kind: 'month', ym: '2026-12' }, { now });
  assert.equal(dec.startKnown, true, 'December starts with balances on file');
});
