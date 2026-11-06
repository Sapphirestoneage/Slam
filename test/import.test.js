// Bring a spreadsheet back (js/import-sheet.js): every change is listed for a Keep or Skip, nothing is saved until
// Save these changes, and the round trips in the brief behave: no edits shows nothing; four edits show exactly four;
// a record changed in SLAM too is a conflict; a typed-over formula is one line; the wrong client asks first; an older
// file still imports; Undo puts everything back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { householdFromInputs } from '../js/demo.js';
import { Store, newHousehold } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { compare, applyChanges, linesOf, unpicked, fromCell, gridFromPlan } from '../js/import-sheet.js';
import { everyField } from '../fixtures/households.js';
import { loadExcel } from '../tools/workbook-check.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const NOW = new Date('2026-11-03T12:00:00Z');
const fresh = () => new Store(householdFromInputs(demo.inputs, { now: NOW.toISOString() }), { now: () => NOW.toISOString() });
const exported = s => gridFromPlan(buildWorkbook(s.doc, ref, { now: NOW }));
const col = (grid, tab, label) => grid[tab][0].indexOf(label);
const rowOf = (grid, tab, name) => (name === null ? 1 : grid[tab].findIndex((r, i) => i > 0 && r[col(grid, tab, 'Name')] === name));
const set = (grid, tab, name, label, v) => { const r = rowOf(grid, tab, name), c = col(grid, tab, label); assert.ok(r > 0 && c >= 0, `${tab} ${name} ${label}`); grid[tab][r][c] = v; };
const blankRow = (grid, tab) => grid[tab].findIndex((r, i) => i > 0 && !r[0]);
const words = res => linesOf(res).map(l => `${l.tab}: ${l.op} ${l.name}${l.op !== 'add' && l.op !== 'remove' ? ` ${l.label}` : ''}`);
const state = d => JSON.stringify({ records: d.records, profile: d.profile, assumptions: d.assumptions, spending: d.spending, client: d.client });

test('export then import with no edits shows zero changes', () => {
  for (const doc of [fresh().doc, everyField()]) {
    const res = compare(gridFromPlan(buildWorkbook(doc, ref, { now: NOW })), doc);
    assert.deepEqual(words(res), []);
    assert.deepEqual([res.unknown, res.typedOver, res.bad, res.wrongClient, res.noMeta], [[], [], [], false, false]);
  }
});

test('a balance, a new spending line, a deleted debt row and the return: exactly those four, and keeping them updates the app', () => {
  const edit = s => {
    const grid = exported(s);
    set(grid, 'Debt', 'Credit card', 'Balance', 3900);
    const b = blankRow(grid, 'Spending lines');
    grid['Spending lines'][b][col(grid, 'Spending lines', 'Name')] = 'Gym';
    grid['Spending lines'][b][col(grid, 'Spending lines', 'Amount')] = 45;
    grid.Debt.splice(rowOf(grid, 'Debt', 'Student loan'), 1);
    grid.Assumptions.find(r => r[0] === 'Return a year, after inflation')[2] = 0.06;
    return compare(grid, s.doc);
  };
  const s = fresh();
  const res = edit(s);
  assert.deepEqual(words(res).sort(), ['Assumptions: edit Assumptions Return a year, after inflation', 'Debt: edit Credit card Balance', 'Debt: remove Student loan', 'Spending lines: add Gym'].sort());
  assert.equal(linesOf(res).find(l => l.op === 'remove').decision, 'skip', 'a removed row is never deleted unless kept');
  applyChanges(s, res);
  assert.equal(s.find(r => r.name === 'Student loan').length, 1, 'still there: the removal was not kept');
  const s2 = fresh(), res2 = edit(s2);
  for (const l of linesOf(res2)) l.decision = 'keep';
  assert.equal(applyChanges(s2, res2), 4);
  assert.equal(s2.find(r => r.name === 'Credit card')[0].values.balance, 3900);
  assert.equal(s2.find(r => r.name === 'Student loan').length, 0);
  assert.equal(s2.find(r => r.name === 'Gym')[0].amount, 45);
  assert.equal(metrics(s2.doc, ref, { now: NOW }).inputs.realReturn, 0.06);
});

test('kept changes go into history with source spreadsheet, and the record says From your spreadsheet', () => {
  const s = fresh();
  const grid = exported(s);
  set(grid, 'Debt', 'Car loan', 'APR', 0.065);
  applyChanges(s, compare(grid, s.doc));
  const car = s.find(r => r.name === 'Car loan')[0];
  const h = s.doc.history.filter(x => x.id === car.id && x.field === 'apr').at(-1);
  assert.deepEqual([h.from, h.to, h.source], [0.0714, 0.065, 'spreadsheet']);
  assert.equal(car.source, 'spreadsheet');
});

test('a record changed in SLAM after the export is a conflict that needs a pick', () => {
  const s = fresh();
  const grid = exported(s);
  s.update(s.find(r => r.name === 'Car loan')[0].id, { balance: 6800 });
  set(grid, 'Debt', 'Car loan', 'Balance', 6900);
  const res = compare(grid, s.doc);
  const c = linesOf(res).find(l => l.name === 'Car loan');
  assert.deepEqual([c.conflict, c.decision, c.from, c.to], [true, null, 6800, 6900]);
  assert.equal(unpicked(res).length, 1, 'Save waits for a pick');
  assert.equal(c.was, 7000, 'what it was when the file was made, for What changed');
  c.decision = 'skip';
  applyChanges(s, res);
  assert.equal(s.find(r => r.name === 'Car loan')[0].values.balance, 6800, 'No: SLAM keeps its number');
  c.decision = 'keep';
  applyChanges(s, res);
  assert.equal(s.find(r => r.name === 'Car loan')[0].values.balance, 6900, "Yes: the spreadsheet's number");
});

test('only the same number changed on both sides is a conflict; another field on that record is a plain change', () => {
  const s = fresh();
  const grid = exported(s);
  s.update(s.find(r => r.name === 'Car loan')[0].id, { balance: 6800 }); // SLAM changed the balance
  set(grid, 'Debt', 'Car loan', 'APR', 0.065); // the spreadsheet changed the APR
  const [c] = linesOf(compare(grid, s.doc));
  assert.deepEqual([c.label, c.conflict, c.decision], ['APR', false, 'keep']);
});

test('a new Budget line needs its category; picking one brings in its letter, amount and date', () => {
  const s = fresh();
  const grid = exported(s);
  const b = blankRow(grid, 'Spending lines'), c = l => col(grid, 'Spending lines', l);
  grid['Spending lines'][b][c('Name')] = 'Gym';
  grid['Spending lines'][b][c('Amount')] = 45;
  const res = compare(grid, s.doc, { ref });
  const u = res.unknown.find(x => x.name === 'Gym');
  assert.ok(u.needsCategory.includes('Gym or fitness') && u.decision === 'skip');
  u.values.category = 'Gym or fitness'; u.decision = 'keep';
  applyChanges(s, res);
  const gym = s.find(r => r.name === 'Gym')[0];
  assert.deepEqual([gym.values.category, gym.values.draftt, gym.values.amountType], ['Gym or fitness', 'Therapy', 'Fixed']);
});

test('typing over a formula is one line and changes nothing', () => {
  const s = fresh();
  const grid = exported(s);
  const r = rowOf(grid, 'Debt', 'Credit card'), c = col(grid, 'Debt', 'Payoff months (M31)');
  grid.Debt[r][c] = 12;
  grid._formulas.Debt.delete(`${r}:${c}`);
  const before = state(s.doc);
  const res = compare(grid, s.doc);
  assert.deepEqual(res.typedOver.map(t => t.text), ['You typed over Credit card: Payoff months (M31). SLAM keeps its math; your number was 12.']);
  assert.deepEqual(words(res), []);
  applyChanges(s, res);
  assert.equal(state(s.doc), before);
});

test('the wrong client\'s file asks first; it can start a new client', () => {
  const other = fresh();
  const grid = exported(other);
  const mine = new Store(newHousehold({ name: 'Someone else', now: NOW.toISOString() }), { now: () => NOW.toISOString() });
  const res = compare(grid, mine.doc);
  assert.equal(res.wrongClient, true);
  assert.equal(res.meta.client, 'Demo client');
  const blank = new Store(newHousehold({ name: 'Demo client', now: NOW.toISOString() }), { now: () => NOW.toISOString() });
  applyChanges(blank, compare(grid, blank.doc, { asNew: true }));
  assert.equal(metrics(blank.doc, ref, { now: NOW }).netWorth.value, metrics(other.doc, ref, { now: NOW }).netWorth.value, 'the new client has the same net worth');
  assert.equal(metrics(blank.doc, ref, { now: NOW }).surplus.value, metrics(other.doc, ref, { now: NOW }).surplus.value, 'and the same surplus');
});

test('an older file still imports: missing columns are left alone, unknown ones are listed', () => {
  const s = fresh();
  const grid = exported(s);
  grid._meta.find(r => r[0] === 'Export format version')[1] = 0;
  const c = col(grid, 'Debt', 'Promo ends');
  for (const r of grid.Debt) r.splice(c, 1); // a column added after this file was made
  grid.Debt[0].push('Nickname');
  set(grid, 'Debt', 'Credit card', 'Balance', 4000);
  const res = compare(grid, s.doc);
  assert.equal(res.olderFormat, true);
  assert.deepEqual(words(res), ['Debt: edit Credit card Balance']);
  assert.ok(res.leftAlone.some(x => /Promo ends/.test(x)));
  assert.ok(res.unknown.some(u => /Nickname/.test(u.name)), "the new column is under Couldn't tell what this is");
  applyChanges(s, res);
  assert.equal(s.find(r => r.name === 'Credit card')[0].values.balance, 4000);
});

test('Undo after an import restores the snapshot exactly', () => {
  const s = fresh();
  const before = state(s.doc);
  const grid = exported(s);
  set(grid, 'Debt', 'Credit card', 'Balance', 3900);
  set(grid, 'Profile', null, 'Age', 31);
  const res = compare(grid, s.doc);
  for (const l of linesOf(res)) l.decision = 'keep';
  applyChanges(s, res);
  assert.notEqual(state(s.doc), before);
  assert.equal(s.doc.snapshots.at(-1).label, 'Before spreadsheet import');
  s.undo();
  assert.equal(state(s.doc), before);
});

test('a row with no ID and no type is asked about; with a type picked it comes in', () => {
  const s = fresh();
  const grid = exported(s);
  const b = blankRow(grid, 'Debt');
  grid.Debt[b][col(grid, 'Debt', 'Name')] = 'Mystery';
  grid.Debt[b][col(grid, 'Debt', 'Balance')] = 500;
  const res = compare(grid, s.doc);
  const u = res.unknown.find(x => x.name === 'Mystery');
  assert.ok(u.needsType.includes('Medical') && u.decision === 'skip');
  u.type = 'Medical'; u.decision = 'keep';
  applyChanges(s, res);
  assert.equal(s.find(r => r.name === 'Mystery')[0].type, 'Medical');
});

test('bad values are listed with their cell and skipped', () => {
  const s = fresh();
  const grid = exported(s);
  set(grid, 'Debt', 'Student loan', 'APR', 'lots');
  set(grid, 'Debt', 'Credit card', 'Bonus: spend by', 'someday');
  const res = compare(grid, s.doc);
  assert.equal(res.bad.length, 2);
  assert.match(res.bad[0].text, /^Debt![A-Z]+\d+ \(Student loan, APR\): lots is not a number\. Skipped\.$/);
  assert.deepEqual(words(res), []);
});

test('a new Calendar entries row comes in logged on its date, so its month can be closed', () => {
  const s = fresh();
  const grid = exported(s);
  const b = blankRow(grid, 'Calendar entries'), c = l => col(grid, 'Calendar entries', l);
  Object.assign(grid['Calendar entries'][b], { [c('Type')]: 'Money out', [c('Name')]: 'Concert', [c('Amount')]: 80, [c('Date')]: new Date(Date.UTC(2026, 9, 12)) });
  applyChanges(s, compare(grid, s.doc));
  const rec = s.find(r => r.name === 'Concert')[0];
  assert.deepEqual([rec.kind, rec.values.date, rec.values.direction], ['entry', '2026-10-12', 'Out']);
  assert.deepEqual(s.doc.spending.calendar.marks[`${rec.id}@2026-10-12`], { status: 'Got it / Paid', paid: 80 });
});

test('a sheet with no _meta tab is matched by its tab and column headers', () => {
  const s = fresh();
  const grid = exported(s);
  delete grid._meta;
  set(grid, 'Assets', 'Savings', 'Balance', 6500);
  const res = compare(grid, s.doc);
  assert.equal(res.noMeta, true);
  assert.deepEqual(words(res), ['Assets: edit Savings Balance']);
});

test('cells read back the way people type them', () => {
  assert.deepEqual(fromCell('money', '$1,250.50'), { value: 1250.5 });
  assert.deepEqual(fromCell('pct', '6%'), { value: 0.06 });
  assert.equal(fromCell('pct', 6).value, 0.06);
  assert.equal(fromCell('date', new Date(Date.UTC(2026, 11, 15))).value, '2026-12-15');
  assert.equal(fromCell('date', '12/15/2026').value, '2026-12-15');
  assert.ok(fromCell('date', 'someday').bad);
  assert.equal(fromCell('month', '2027-03').value, '2027-03');
  assert.equal(fromCell('yesno', 'yes').value, true);
  assert.ok(fromCell('day', 40).bad);
});

let ExcelJS = null;
ExcelJS = loadExcel(); // here, or the main checkout's in a git worktree (tools/workbook-check.mjs)
test('through a real .xlsx (ExcelJS): untouched shows nothing; one typed cell is one change; a typed-over formula is seen', { skip: !ExcelJS && 'ExcelJS is not installed (npm install)' }, async () => {
  const { workbookBuffer, readWorkbook } = await import('../js/sheet/excel.js');
  const s = new Store(everyField(), { now: () => NOW.toISOString() });
  const buf = await workbookBuffer(ExcelJS, buildWorkbook(s.doc, ref, { now: NOW }));
  const res0 = compare(await readWorkbook(ExcelJS, buf), s.doc);
  assert.deepEqual([words(res0), res0.typedOver, res0.bad], [[], [], []]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('Assets');
  const head = ws.getRow(1).values;
  ws.getRow(2).getCell(head.indexOf('Balance')).value = 777;
  ws.getRow(2).getCell(head.indexOf('Value used')).value = 5;
  const res = compare(await readWorkbook(ExcelJS, await wb.xlsx.writeBuffer()), s.doc);
  assert.deepEqual(linesOf(res).map(l => [l.label, l.to]), [['Balance', 777]]);
  assert.equal(res.typedOver.length, 1);
});
