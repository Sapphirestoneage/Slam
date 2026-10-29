// Build phase 6, done when: a full month can be planned, logged and closed for the test client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { addPresets } from '../js/presets.js';
import { instances, balances, monthView, closeMonth, mark, carry, closedMonths, addMonths, daysIn, dateOf, bonusPaycheck } from '../js/month.js';
import { gutAccuracy } from '../js/math/spending.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const privatePath = new URL('../fixtures/eli.local.json', import.meta.url);
const now = new Date('2026-11-05T12:00:00Z');
const YM = '2026-11';

function client(inputs) {
  const s = new Store(householdFromInputs(inputs, { name: 'Test' }));
  addPresets(s, ref);
  return s;
}

test('dates: month lengths, clamping and stepping', () => {
  assert.equal(daysIn('2026-02'), 28);
  assert.equal(dateOf('2026-02', 31), '2026-02-28');
  assert.equal(addMonths('2026-12', 1), '2027-01');
});

test('calendar: paychecks every 2 weeks, bills on their day, variable lines spread by week, debt on due day', () => {
  const s = client(demo.inputs);
  const inc = s.find(r => r.kind === 'income')[0];
  s.update(inc.id, { per: 'month', payFrequency: '2 weeks', nextPayday: '2026-11-06' });
  const rent = s.find(r => r.name === 'Rent')[0];
  s.update(rent.id, { dueDay: 1 });
  const card = s.find(r => r.type === 'Credit card')[0];
  s.update(card.id, { dueDay: 20 });
  const list = instances(s.doc, ref, YM, { now });
  const pays = list.filter(i => i.kind === 'income');
  assert.deepEqual(pays.map(p => p.date), ['2026-11-06', '2026-11-20']);
  assert.ok(Math.abs(pays[0].planned - 4800 * 12 / 26) < 0.01);
  assert.equal(list.find(i => i.recId === rent.id).date, '2026-11-01');
  assert.equal(list.find(i => i.recId === card.id).date, '2026-11-20');
  const groceries = list.filter(i => i.name === 'Groceries');
  assert.equal(groceries.length, 5); // Nov 1, 8, 15, 22, 29
  // Every-2-weeks pay lands three times in some months (R098): Jan 2027 has 1, 15, 29.
  assert.equal(bonusPaycheck(instances(s.doc, ref, '2027-01', { now })), true);
});

test('calendar: a bill paid with a card shows on the card, not in the checking balance (R101)', () => {
  const s = client(demo.inputs);
  const card = s.find(r => r.type === 'Credit card')[0];
  const stream = s.find(r => r.name === 'Streaming')[0];
  s.update(stream.id, { paidWith: card.id });
  const i = instances(s.doc, ref, YM, { now }).find(x => x.recId === stream.id);
  assert.equal(i.onCard, card.name || 'Credit card');
  s.setIn('spending', ['calendar', 'start'], 5000);
  const b = balances(s.doc, ref, YM, 1, { now });
  const withCard = b.rows.at(-1).balance;
  s.update(stream.id, { paidWith: null });
  assert.ok(balances(s.doc, ref, YM, 1, { now }).rows.at(-1).balance < withCard);
});

test('calendar: maybe money stays out of the balance until counted; marks change the balance (R090 to R094)', () => {
  const s = client(demo.inputs);
  s.setIn('spending', ['calendar', 'start'], 2000);
  s.add('entry', { name: 'Client payment', amount: 400, values: { date: '2026-11-15', direction: 'Maybe' } });
  const end = () => balances(s.doc, ref, YM, 1, { now }).rows.at(-1).balance;
  const base = end();
  s.setIn('spending', ['calendar', 'countMaybe'], true);
  assert.equal(Math.round(end() - base), 400);
  s.setIn('spending', ['calendar', 'countMaybe'], false);
  const rent = instances(s.doc, ref, YM, { now }).find(i => i.name === 'Rent');
  mark(s, rent.key, { status: "Didn't happen" });
  assert.equal(Math.round(end() - base), 1650);
  mark(s, rent.key, { status: 'Paid', paid: -1600 });
  assert.equal(Math.round(end() - base), 50);
  mark(s, rent.key, { status: 'Moved', date: '2026-12-01' });
  assert.equal(instances(s.doc, ref, YM, { now }).find(i => i.key === rent.key).date, '2026-12-01');
});

test('calendar: low balance day is found (R096)', () => {
  const s = client(demo.inputs);
  s.setIn('spending', ['calendar', 'start'], 100);
  s.setIn('spending', ['calendar', 'low'], 500);
  const b = balances(s.doc, ref, YM, 1, { now });
  assert.ok(b.firstLow);
  assert.ok(b.firstLow.balance < 500);
});

function planLogClose(s) {
  // Plan: Estimate starts from Rough (R136); confirm one, change one.
  let v = monthView(s.doc, ref, YM, { now });
  const groceries = v.rows.find(r => r.line.name === 'Groceries');
  assert.equal(groceries.fromRough, true);
  s.setIn('spending', ['months', YM, 'lines', groceries.line.id, 'estimate'], 450);
  s.setIn('spending', ['months', YM, 'gut'], 6000);
  // Log: mark every calendar entry of every bill Paid at plan, groceries ran over.
  for (const i of instances(s.doc, ref, YM, { now }).filter(x => x.lineId)) {
    const over = i.lineId === groceries.line.id ? 1.2 : 1;
    mark(s, i.key, { status: 'Paid', paid: i.planned * over });
  }
  v = monthView(s.doc, ref, YM, { now });
  assert.equal(v.gaps.length, 0);
  const g = v.rows.find(r => r.line.id === groceries.line.id);
  assert.ok(Math.abs(g.actual - groceries.rough * 1.2) < 0.01);
  assert.equal(v.misses[0].line.id, groceries.line.id); // a variable miss is listed first (R145)
  // Close: locked, summary kept, the variable miss carried to next month.
  closeMonth(s, ref, YM, { now });
  v = monthView(s.doc, ref, YM, { now });
  assert.equal(v.closed, true);
  const next = s.getIn('spending', ['months', addMonths(YM, 1), 'lines', groceries.line.id, 'estimate']);
  assert.equal(next, Math.round(groceries.rough * 1.2));
  const acc = gutAccuracy(closedMonths(s.doc));
  assert.ok(acc.value !== null);
  return v;
}

test('month: plan, log and close with the demo client', () => { planLogClose(client(demo.inputs)); });

test('month: plan, log and close with the private test client', { skip: !existsSync(privatePath) && 'private test client file not present' }, () => {
  const eli = JSON.parse(readFileSync(privatePath));
  const v = planLogClose(client({ ...eli.inputs, takeHome: eli.inputs.takeHome ?? 4000 }));
  assert.ok(v.totals.actual > 0);
});

test('month: undo puts a mark and a close back', () => {
  const s = client(demo.inputs);
  const rent = instances(s.doc, ref, YM, { now }).find(i => i.name === 'Rent');
  mark(s, rent.key, { status: 'Paid' });
  s.undo();
  assert.equal(instances(s.doc, ref, YM, { now }).find(i => i.key === rent.key).status, 'Planned');
  carry(s, YM, rent.lineId, 1700);
  assert.equal(s.getIn('spending', ['months', '2026-12', 'lines', rent.lineId, 'estimate']), 1700);
});
