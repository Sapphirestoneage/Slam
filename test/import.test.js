// Bring a spreadsheet back: every change is listed for approval and nothing is saved until it is ticked; an
// untouched file has no changes; edits, new rows, removed rows, the client's assumptions and bad values each show.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { householdFromInputs } from '../js/demo.js';
import { Store } from '../js/records.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { changesFrom, applyChanges, fromCell } from '../js/sheet/import.js';
import { everyField } from '../fixtures/households.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const NOW = new Date('2026-11-03T12:00:00Z');
const fresh = () => new Store(householdFromInputs(demo.inputs, { now: NOW.toISOString() }), { now: () => NOW.toISOString() });

// The workbook as a spreadsheet hands it back: plain values (a formula gives its value; here, nothing).
const gridOf = plan => Object.fromEntries(plan.sheets.map(s => [s.name, s.rows.map(r => (r || []).map(c => (c?.f ? null : c?.v ?? null)))]));
const at = (grid, tab, label, match) => {
  const rows = grid[tab];
  const col = rows[0].indexOf(label);
  const row = rows.findIndex((r, i) => i > 0 && match(r, rows[0]));
  assert.ok(col >= 0 && row > 0, `${tab} ${label}`);
  return { set: v => { rows[row][col] = v; }, row, col };
};
const byName = name => (r, head) => r[head.indexOf('Name')] === name;

test('a file brought back untouched has no changes', () => {
  for (const doc of [fresh().doc, everyField()]) {
    const { changes, warnings } = changesFrom(gridOf(buildWorkbook(doc, ref, { now: NOW })), doc);
    assert.deepEqual(changes.map(c => `${c.tab} ${c.name} ${c.label}: ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`), []);
    assert.deepEqual(warnings, []);
  }
});

test('an edited balance is one change, saved only when approved, in one undo step with a snapshot first', () => {
  const s = fresh();
  const grid = gridOf(buildWorkbook(s.doc, ref, { now: NOW }));
  at(grid, 'Debt', 'Balance', byName('Credit card')).set(3900);
  const { changes } = changesFrom(grid, s.doc);
  assert.equal(changes.length, 1);
  const [c] = changes;
  assert.deepEqual([c.tab, c.name, c.label, c.from, c.to, c.ok], ['Debt', 'Credit card', 'Balance', 4200, 3900, true]);
  const card = () => s.find(r => r.name === 'Credit card')[0];
  assert.equal(applyChanges(s, changes.map(x => ({ ...x, ok: false }))), 0, 'nothing ticked, nothing saved');
  assert.equal(card().values.balance, 4200);
  const snaps = s.doc.snapshots.length;
  assert.equal(applyChanges(s, changes), 1);
  assert.equal(card().values.balance, 3900);
  assert.equal(s.doc.snapshots.length, snaps + 1, 'a snapshot first');
  s.undo();
  assert.equal(card().values.balance, 4200, 'one undo puts it back');
});

test('new rows in the blank blue rows are added; a row taken out is offered as a removal, not ticked', () => {
  const s = fresh();
  const plan = buildWorkbook(s.doc, ref, { now: NOW });
  const grid = gridOf(plan);
  const debt = grid.Debt, head = debt[0];
  const blank = debt.findIndex((r, i) => i > 0 && !r[0]);
  debt[blank][head.indexOf('Type')] = 'Medical';
  debt[blank][head.indexOf('Name')] = 'Hospital bill';
  debt[blank][head.indexOf('Balance')] = 1250;
  debt[blank][head.indexOf('APR')] = 0;
  debt[blank][head.indexOf('Status')] = 'Guess';
  const student = debt.findIndex(r => r[head.indexOf('Name')] === 'Student loan');
  debt.splice(student, 1);
  const { changes } = changesFrom(grid, s.doc);
  const add = changes.find(c => c.op === 'add'), rm = changes.find(c => c.op === 'remove');
  assert.equal(add.name, 'Hospital bill');
  assert.equal(add.ok, true);
  assert.equal(rm.name, 'Student loan');
  assert.equal(rm.ok, false, 'removals wait for a tick');
  applyChanges(s, changes);
  const h = s.find(r => r.name === 'Hospital bill')[0];
  assert.deepEqual([h.kind, h.type, h.values.balance, h.values.apr, h.status], ['debt', 'Medical', 1250, 0, 'Not sure']);
  assert.ok(s.find(r => r.name === 'Student loan').length, 'not removed without a tick');
});

test('Profile, nested Profile fields, Taxes and the client\'s own assumptions come back too', () => {
  const s = fresh();
  const grid = gridOf(buildWorkbook(s.doc, ref, { now: NOW }));
  at(grid, 'Profile', 'Age', () => true).set(31);
  at(grid, 'Profile', 'Variable income: lowest month', () => true).set(2500);
  at(grid, 'Profile', 'Live in New York City', () => true).set('Yes');
  at(grid, 'Taxes', 'Filing status', () => true).set('Head of household');
  const a = grid.Assumptions.find(r => r[0] === 'Return a year, after inflation');
  a[2] = 6; // typed as 6 into a % cell
  const { changes } = changesFrom(grid, s.doc);
  assert.deepEqual(changes.map(c => [c.label, c.to]).sort(), [['Age', 31], ['Filing status', 'Head of household'], ['Live in New York City', true], ['Return a year, after inflation', 0.06], ['Variable income: lowest month', 2500]].sort());
  applyChanges(s, changes);
  assert.equal(s.doc.profile.age, 31);
  assert.equal(s.doc.profile.variable.lowest, 2500);
  assert.equal(s.doc.profile.nyc, true);
  assert.equal(s.doc.profile.filingStatus, 'Head of household');
  assert.equal(s.doc.assumptions.realReturn, 0.06);
});

test('a value changed in SLAM after the export is flagged and not ticked; a bad value is never saved', () => {
  const s = fresh();
  const grid = gridOf(buildWorkbook(s.doc, ref, { now: NOW }));
  s.update(s.find(r => r.name === 'Car loan')[0].id, { balance: 6800 }); // changed in SLAM after the file was made
  at(grid, 'Debt', 'Balance', byName('Car loan')).set(6900);
  at(grid, 'Debt', 'APR', byName('Student loan')).set('lots');
  at(grid, 'Debt', 'Card: pay', byName('Credit card')).set('in full');
  const { changes } = changesFrom(grid, s.doc);
  const car = changes.find(c => c.name === 'Car loan'), apr = changes.find(c => c.label === 'APR'), pay = changes.find(c => c.label === 'Card: pay');
  assert.deepEqual([car.from, car.to, car.changedInSlam, car.ok], [6800, 6900, true, false]);
  assert.ok(apr.bad && !apr.ok);
  assert.equal(pay.to, 'In full', 'a choice matches its option whatever the case');
  applyChanges(s, changes.map(c => ({ ...c, ok: true })));
  assert.equal(s.find(r => r.name === 'Student loan')[0].values.apr, 0.055);
});

test('a file from somewhere else (no _meta tab) is compared with what SLAM has now, and says so', () => {
  const s = fresh();
  const grid = gridOf(buildWorkbook(s.doc, ref, { now: NOW }));
  delete grid['_meta'];
  at(grid, 'Assets', 'Balance', byName('Savings')).set(6500);
  const { changes, warnings } = changesFrom(grid, s.doc);
  assert.equal(changes.length, 1);
  assert.match(warnings[0], /no _meta tab/);
});

test('cells read back the way people type them', () => {
  assert.deepEqual(fromCell('money', '$1,250.50'), { value: 1250.5 });
  assert.deepEqual(fromCell('pct', '6%'), { value: 0.06 });
  assert.equal(fromCell('pct', 0.06).value, 0.06);
  assert.equal(fromCell('date', new Date(Date.UTC(2026, 11, 15))).value, '2026-12-15');
  assert.equal(fromCell('date', '12/15/2026').value, '2026-12-15');
  assert.equal(fromCell('month', '2027-03').value, '2027-03');
  assert.equal(fromCell('yesno', 'yes').value, true);
  assert.deepEqual(fromCell('list', 'a, b').value, ['a', 'b']);
  assert.ok(fromCell('day', 40).bad);
  assert.equal(fromCell('money', '').value, null);
});

let ExcelJS = null;
try { ExcelJS = (await import('exceljs')).default; } catch { /* not installed */ }
test('through a real .xlsx (ExcelJS): untouched has no changes; one typed cell is one change', { skip: !ExcelJS && 'ExcelJS is not installed (npm install exceljs@4.4.0 --no-save)' }, async () => {
  const { workbookBuffer, readWorkbook } = await import('../js/sheet/excel.js');
  const s = new Store(everyField(), { now: () => NOW.toISOString() });
  const buf = await workbookBuffer(ExcelJS, buildWorkbook(s.doc, ref, { now: NOW }));
  assert.deepEqual(changesFrom(await readWorkbook(ExcelJS, buf), s.doc).changes.map(c => `${c.tab} ${c.label}`), []);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('Assets');
  const col = ws.getRow(1).values.indexOf('Balance');
  ws.getRow(2).getCell(col).value = 777;
  const { changes } = changesFrom(await readWorkbook(ExcelJS, await wb.xlsx.writeBuffer()), s.doc);
  assert.deepEqual(changes.map(c => [c.label, c.to]), [['Balance', 777]]);
});
