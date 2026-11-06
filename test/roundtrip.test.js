// Batch 59: the round trip covers every editable tab. For every persona, the Demo and Fast Track Alexis and Tom, the
// file goes through ExcelJS as the coach would: untouched, it brings back no changes; with one cell changed on each tab
// that has something to type (or a row added where the tab has no rows yet), exactly those changes show, and saving
// them puts exactly those numbers in SLAM. A copy made Without private rows comes back without exposing, renaming or
// deleting its private rows; typing over a formula is listed and never saved; an old file (a tab per area) still reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, importFile } from '../js/records.js';
import { AREAS } from '../js/registry/fields.js';
import { buildWorkbook, KEY, rowsForArea } from '../js/sheet/workbook.js';
import { decodeDefaults } from '../js/registry/tabs.js';
import { compare, applyChanges, linesOf, gridFromPlan, locate } from '../js/import-sheet.js';
import { sharedBackup } from '../js/privacy.js';
import { HOUSEHOLDS, NOW, ExcelJS } from '../tools/workbook-check.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const skip = !ExcelJS && 'ExcelJS is not installed (npm install)';
const persona = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));

// Every table of a plan's sheet: { area, keys, head (row index), rows: [{ ri, key, sec }] }.
function tablesOf(sheet) {
  const out = [];
  sheet.rows.forEach((row, ri) => {
    const k = row?.[0]?.v;
    if (typeof k !== 'string' || !k.startsWith(KEY.keys)) return;
    const t = { area: k.slice(KEY.keys.length), keys: row.map(c => c?.v), rows: [] };
    let sec = {};
    for (let r = ri + 2; r < sheet.rows.length; r++) {
      const key = String(sheet.rows[r]?.[0]?.v ?? '');
      if (key.startsWith(KEY.end)) break;
      if (key.startsWith(KEY.sec)) { sec = decodeDefaults(key.slice(KEY.sec.length)); continue; }
      t.rows.push({ ri: r, key, sec });
    }
    out.push(t);
  });
  return out;
}

// One edit for each block of a tab that has boxes: a typed cell of a real row of each table (else a new row in one of its
// blank rows), and one answer of each form. Returns [{ cells: [{ r, c, v }] (1-based), what SLAM should hold }].
function editsFor(sheet, doc) {
  const input = cell => cell?.s === 'input';
  const out = [];
  for (const t of tablesOf(sheet)) {
    const area = AREAS.find(a => a.id === t.area);
    let done = false;
    for (const row of t.rows.filter(x => x.key && !x.key.startsWith('#'))) {
      const ci = t.keys.findIndex((k, i) => i > 0 && input(sheet.rows[row.ri][i]) && sheet.rows[row.ri][i].fmt === 'money');
      if (ci < 0) continue;
      const was = sheet.rows[row.ri][ci].v;
      const v = typeof was === 'number' ? was + 1 : 123;
      out.push({ cells: [{ r: row.ri + 1, c: ci + 1, v }], kind: 'edit', area: area.id, id: row.key, field: t.keys[ci], v });
      done = true; break;
    }
    if (done) continue;
    const row = t.rows.find(x => x.key === KEY.blank); // no rows yet: fill a blank one
    if (!row) continue;
    const at = key => t.keys.indexOf(key) + 1;
    const cells = [];
    const name = `Round trip ${area.id}`;
    if (area.source === 'months') {
      const line = doc.records.find(r => r.kind === 'bill' && r.name);
      if (!line) continue;
      cells.push({ r: row.ri + 1, c: at('line'), v: line.name }, { r: row.ri + 1, c: at('estimate'), v: 99 });
      if (!row.sec.month) cells.push({ r: row.ri + 1, c: at('month'), v: '2026-11' });
      out.push({ cells, kind: 'add', area: area.id, name: `${line.name}, ${row.sec.month ?? '2026-11'}` });
      continue;
    }
    if (at('name')) cells.push({ r: row.ri + 1, c: at('name'), v: name });
    else if (area.id === 'backups') { const slot = t.rows.find(x => x.key.startsWith(`${KEY.blank}:`)); if (!slot) continue; cells.push({ r: slot.ri + 1, c: at('amount'), v: 50 }); out.push({ cells, kind: 'add', area: area.id, name: decodeDefaults(slot.key.slice(KEY.blank.length + 1)).kind, by: 'kind' }); continue; }
    const kind = row.sec.kind ?? Object.keys(area.kinds || {})[0];
    const type = row.sec.type ?? area.types?.[kind]?.[0];
    if (at('Type') && type) cells.push({ r: row.ri + 1, c: at('Type'), v: type });
    const money = t.keys.findIndex((k, i) => i > 0 && input(sheet.rows[row.ri][i]) && sheet.rows[row.ri][i].fmt === 'money');
    if (money > 0) cells.push({ r: row.ri + 1, c: money + 1, v: 50 });
    if (at('date')) cells.push({ r: row.ri + 1, c: at('date'), v: new Date(Date.UTC(2026, 10, 20)) });
    out.push({ cells, kind: 'add', area: area.id, name });
  }
  let block = null, used = null;
  for (const [ri, row] of sheet.rows.entries()) {
    const k = String(row?.[0]?.v ?? '');
    if (k.startsWith(KEY.block)) { block = k; continue; }
    if (!k.startsWith(KEY.field) || !input(row[2]) || used === block) continue;
    const fmt = row[2].fmt, was = row[2].v, id = k.slice(KEY.field.length);
    if (fmt === 'money' || fmt === 'number') { const v = typeof was === 'number' ? was + 1 : 7; out.push({ cells: [{ r: ri + 1, c: 3, v }], kind: 'field', id, v }); used = block; }
    else if (fmt === 'yesno') { out.push({ cells: [{ r: ri + 1, c: 3, v: was === 'Yes' ? 'No' : 'Yes' }], kind: 'field', id, v: was !== 'Yes' }); used = block; }
  }
  return out;
}

async function fileOf(plan) {
  const { workbookBuffer } = await import('../js/sheet/excel.js');
  return workbookBuffer(ExcelJS, plan);
}
async function gridOf(buf) {
  const { readWorkbook } = await import('../js/sheet/excel.js');
  return readWorkbook(ExcelJS, buf);
}

for (const [label, make] of HOUSEHOLDS) {
  test(`${label}: untouched brings back nothing; one cell in each table and form of every input tab brings back exactly those changes`, { skip, timeout: 120000 }, async () => {
    const store = new Store(make(), { now: () => NOW.toISOString() });
    const plan = buildWorkbook(store.doc, ref, { now: NOW });
    const buf = await fileOf(plan);
    const clean = compare(await gridOf(buf), store.doc, { ref });
    assert.deepEqual([linesOf(clean).map(l => `${l.tab} ${l.name} ${l.label}`), clean.unknown, clean.typedOver, clean.bad, clean.leftAlone, clean.wrongClient],
      [[], [], [], [], [], false], 'an untouched file');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const edits = [];
    const tabs = plan.sheets.filter(s => s.kind === 'screen' && s.rows.some(r => r?.some(c => c?.s === 'input')));
    for (const sheet of tabs) {
      const list = editsFor(sheet, store.doc);
      assert.ok(list.length, `${sheet.name}: something to change`);
      for (const e of list) {
        for (const c of e.cells) wb.getWorksheet(sheet.name).getCell(c.r, c.c).value = c.v;
        edits.push({ ...e, tab: sheet.name });
      }
    }
    assert.deepEqual(tabs.map(t => t.name), ['You', 'Money in', 'Money out', 'Own and owe', 'The plan', 'The future'], 'every input tab');
    const aRow = plan.sheets.find(s => s.name === 'Assumptions').rows.findIndex(r => r?.[0]?.v === 'Return a year, after inflation');
    wb.getWorksheet('Assumptions').getCell(aRow + 1, 3).value = 0.055;
    const grid = await gridOf(await wb.xlsx.writeBuffer());
    const res = compare(grid, store.doc, { ref });
    const lines = linesOf(res);
    const got = lines.map(l => l.tab).sort();
    assert.deepEqual(got, [...edits.map(e => e.tab), 'Assumptions'].sort(), `one change per edited tab: ${lines.map(l => `${l.tab} ${l.op} ${l.name} ${l.label}`).join('; ')} | unknown ${res.unknown.map(u => u.note).join('; ')}`);
    assert.deepEqual([res.unknown, res.typedOver, res.bad], [[], [], []]);
    for (const l of lines) l.decision = 'keep';
    assert.equal(applyChanges(store, res), edits.length + 1);
    for (const e of edits) {
      if (e.kind === 'edit') {
        const area = AREAS.find(a => a.id === e.area);
        const fld = area.fields.find(f => f.key === e.field);
        if (area.source === 'records') { const r = store.get(e.id); assert.equal(fld.where === 'top' ? r[e.field] : r.values[e.field], e.v, `${e.tab}: ${e.field}`); }
        else { const list = area.path.split('.').reduce((o, k) => o?.[k], store.doc[area.part]); const it = list.find(x => String(area.keyField ? x[area.keyField] : x.id) === e.id); assert.equal(it[e.field], e.v, `${e.tab}: ${e.field}`); }
      } else if (e.kind === 'field') {
        const area = AREAS.find(a => a.source === 'doc' && e.id.startsWith(`${a.id}.`));
        const fld = area.fields.find(f => f.id === e.id);
        assert.deepEqual(rowsForArea(area, store.doc)[0].get(fld), e.v, `${e.tab}: ${e.id}`);
      } else if (e.area === 'months') {
        assert.ok(Object.values(store.doc.spending.months || {}).some(m => Object.values(m.lines || {}).some(x => x.estimate === 99)), `${e.tab}: the new month line`);
      } else {
        const area = AREAS.find(a => a.id === e.area);
        const hit = area.source === 'records' ? store.doc.records.some(r => r.name === e.name) : (area.path.split('.').reduce((o, k) => o?.[k], store.doc[area.part]) || []).some(x => x[e.by ?? 'name'] === e.name);
        assert.ok(hit, `${e.tab}: the new row ${e.name}`);
      }
    }
    assert.equal(store.doc.assumptions.realReturn, 0.055);
    const again = compare(grid, store.doc, { ref }); // the same file after saving: only the added rows (they have no id yet) are new again
    assert.deepEqual(linesOf(again).filter(l => l.op !== 'add').map(l => `${l.tab} ${l.name} ${l.label}`), []);
  });
}

test('the Demo: a new row in a section takes that section (a card under Credit cards, a line under Food); a deleted row is offered for deletion', () => {
  const store = new Store(HOUSEHOLDS.find(([l]) => l === 'demo')[1](), { now: () => NOW.toISOString() });
  const plan = buildWorkbook(store.doc, ref, { now: NOW });
  const grid = gridFromPlan(plan);
  const where = locate(grid);
  const fill = (area, title, values) => {
    const t = where.tables[area];
    const rows = grid[t.tab];
    let inSec = false;
    for (const ri of t.data) {
      const k = String(rows[ri][0] ?? '');
      if (k.startsWith(KEY.sec)) { inSec = rows[ri][1] === title; continue; }
      if (inSec && k === KEY.blank) { for (const [key, v] of Object.entries(values)) rows[ri][t.keys.indexOf(key)] = v; return; }
    }
    assert.fail(`no blank row under ${title}`);
  };
  fill('debt', 'Credit cards', { name: 'Store card', balance: 300 });
  fill('spending', 'Food', { name: 'Farmers market', amount: 60, category: 'Groceries' });
  fill('assets', 'Investments', { name: 'Brokerage', balance: 1000 }); // no Type: asked
  const debt = where.tables.debt;
  const loanRow = debt.data.find(ri => grid[debt.tab][ri][debt.keys.indexOf('name')] === 'Student loan');
  grid[debt.tab].splice(loanRow, 1);
  const res = compare(grid, store.doc, { ref });
  const added = res.areas.flatMap(g => g.added);
  const card = added.find(l => l.name === 'Store card');
  assert.deepEqual([card.kind, card.type, card.tab], ['debt', 'Credit card', 'Own and owe']);
  const food = added.find(l => l.name === 'Farmers market');
  assert.equal(food.defaults.draftt, 'Food');
  const ask = res.unknown.find(u => u.name === 'Brokerage');
  assert.ok(ask?.needsType?.includes('Brokerage'), 'an investment row with no type is asked about, with the investment types');
  assert.ok(res.areas.flatMap(g => g.removed).some(l => l.name === 'Student loan' && l.decision === 'skip'));
  for (const l of linesOf(res)) if (l.op !== 'remove') l.decision = 'keep';
  ask.type = 'Brokerage'; ask.decision = 'keep';
  applyChanges(store, res);
  assert.equal(store.find(r => r.name === 'Store card')[0].type, 'Credit card');
  assert.deepEqual([store.find(r => r.name === 'Farmers market')[0].values.draftt, store.find(r => r.name === 'Farmers market')[0].values.category], ['Food', 'Groceries']);
  assert.equal(store.find(r => r.name === 'Brokerage')[0].values.group, 'investment', 'the section says investment');
  assert.equal(store.find(r => r.name === 'Student loan').length, 1, 'kept: the removal was a No');
});

test('typing over a formula on a screen tab is listed and never saved', () => {
  const store = new Store(HOUSEHOLDS.find(([l]) => l === 'demo')[1](), { now: () => NOW.toISOString() });
  const grid = gridFromPlan(buildWorkbook(store.doc, ref, { now: NOW }));
  const tab = 'One-pager';
  const ri = grid[tab].findIndex(r => r[0] === `${KEY.math}M27`);
  grid[tab][ri][2] = 5000;
  grid._formulas[tab].delete(`${ri}:2`);
  const debt = locate(grid).tables.debt;
  const card = debt.data.find(r => grid[debt.tab][r][debt.keys.indexOf('name')] === 'Credit card');
  const ci = debt.keys.indexOf('@M31');
  grid[debt.tab][card][ci] = 12;
  grid._formulas[debt.tab].delete(`${card}:${ci}`);
  const before = JSON.stringify(store.doc.records);
  const res = compare(grid, store.doc, { ref });
  assert.equal(res.typedOver.length, 2);
  assert.ok(res.typedOver.some(t => /Credit card: Payoff months \(M31\)/.test(t.text)));
  assert.deepEqual(linesOf(res), []);
  applyChanges(store, res);
  assert.equal(JSON.stringify(store.doc.records), before);
});

test('a copy made Without private rows comes back cleanly: no private row is read, renamed, deleted or named', () => {
  const doc = persona('discreet-couple');
  const store = new Store(doc, { now: () => NOW.toISOString() });
  const shared = sharedBackup(doc, ref);
  const folded = shared.records.filter(r => r.folded);
  assert.ok(folded.length > 0, 'the persona has private rows');
  const plan = buildWorkbook(shared, ref, { now: NOW, shared: true });
  const grid = gridFromPlan(plan);
  const clean = compare(grid, store.doc, { ref });
  assert.deepEqual([clean.wrongClient, linesOf(clean).length, clean.unknown.length, clean.leftAlone.length], [false, 0, 0, 0], 'untouched: nothing');
  const where = locate(grid);
  // Change a private row's amount, delete another private row, and change one everyday row.
  const priv = folded[0];
  const area = AREAS.find(a => a.source === 'records' && a.kinds[priv.kind]);
  const t = where.tables[area.id];
  const rows = grid[t.tab];
  const at = rows.findIndex(r => r[0] === priv.id);
  const amountKey = ['amount', 'balance', 'value'].find(k => t.keys.includes(k) && typeof rows[at][t.keys.indexOf(k)] === 'number') ?? 'amount';
  rows[at][t.keys.indexOf(amountKey)] = 1;
  const other = folded.find(r => r.id !== priv.id && AREAS.find(a => a.source === 'records' && a.kinds[r.kind]));
  if (other) { const ot = where.tables[AREAS.find(a => a.source === 'records' && a.kinds[other.kind]).id]; grid[ot.tab].splice(grid[ot.tab].findIndex(r => r[0] === other.id), 1); }
  const plain = store.doc.records.find(r => r.kind === 'debt' && !folded.some(f => f.id === r.id)) ?? store.doc.records.find(r => r.kind === 'account' && !folded.some(f => f.id === r.id));
  const pa = AREAS.find(a => a.source === 'records' && a.kinds[plain.kind]), pt = where.tables[pa.id];
  const pr = grid[pt.tab].findIndex(r => r[0] === plain.id);
  grid[pt.tab][pr][pt.keys.indexOf('balance')] = 4321;
  const res = compare(grid, store.doc, { ref });
  assert.deepEqual(linesOf(res).map(l => `${l.op} ${l.recId} ${l.label}`), [`edit ${plain.id} Balance`], 'only the everyday row');
  const text = JSON.stringify(res);
  for (const r of store.doc.records.filter(x => folded.some(f => f.id === x.id))) if (r.name && !folded.some(f => f.name === r.name)) assert.ok(!text.includes(r.name), `the review never names ${r.name}`);
  assert.ok(res.leftAlone.some(x => /kept private/.test(x)));
  for (const l of linesOf(res)) l.decision = 'keep';
  const before = JSON.stringify(store.doc.records.filter(x => folded.some(f => f.id === x.id)));
  applyChanges(store, res);
  assert.equal(JSON.stringify(store.doc.records.filter(x => folded.some(f => f.id === x.id))), before, 'private rows untouched, none deleted');
  assert.equal(store.get(plain.id).values.balance, 4321);
});

test('a file of format 47 (a tab per area) still comes back by its old tabs, with a clear note', () => {
  // The old layout as those files have it: the header on the first row, the rows under it, the Profile on row 2.
  const store = new Store(HOUSEHOLDS.find(([l]) => l === 'demo')[1](), { now: () => NOW.toISOString() });
  const plan = buildWorkbook(store.doc, ref, { now: NOW });
  const grid = gridFromPlan(plan);
  const where = locate(grid);
  const old = {};
  Object.defineProperty(old, '_formulas', { value: {}, enumerable: false });
  old._meta = grid._meta.map(r => [...r]);
  old._meta.find(r => r[0] === 'Export format version')[1] = 47;
  for (const area of AREAS.filter(a => a.source !== 'doc')) {
    const t = where.tables[area.id];
    old[area.tab] = [t.head.map((h, i) => (i === 0 ? 'SLAM id (leave as is)' : h)), ...t.data.map(ri => grid[t.tab][ri]).filter(r => r[0] && !String(r[0]).startsWith('#')).map(r => [...r])];
    old._formulas[area.tab] = new Set();
  }
  const fields = AREAS.find(a => a.id === 'profile').fields.filter(f => where.fields.has(f.id));
  old.Profile = [fields.map(f => f.label), fields.map(f => where.fields.get(f.id).v)];
  const debt = old.Debt, nameAt = debt[0].indexOf('Name'), balAt = debt[0].indexOf('Balance');
  debt.find(r => r[nameAt] === 'Car loan')[balAt] = 6500;
  const res = compare(old, store.doc, { ref });
  assert.equal(res.layout, 'areas');
  assert.equal(res.olderFormat, true);
  assert.deepEqual(linesOf(res).map(l => `${l.tab} ${l.name} ${l.label}`), ['Debt Car loan Balance']);
});

test('a shift row\'s kinds of night are rows under it: a changed night, a new one and a deleted one come back (QUESTIONS 448)', () => {
  const store = new Store(persona('dancer'), { now: () => NOW.toISOString() });
  const row = store.doc.records.find(r => r.values?.nights?.length > 1);
  assert.ok(row, 'the dancer has kinds of night');
  const plan = buildWorkbook(store.doc, ref, { now: NOW });
  const grid = gridFromPlan(plan);
  const t = locate(grid).tables.income;
  const rows = grid[t.tab];
  const at = key => t.keys.indexOf(key);
  // The row's shift boxes are formulas over the nights (their cached values are the app's roll-up).
  const parent = plan.sheets.find(s => s.name === t.tab).rows.find(r => r[0]?.v === row.id);
  for (const k of ['shiftsWeek', 'payShift', 'houseFee']) assert.ok(parent[at(k)].f, `${k} is a formula`);
  assert.equal(parent[at('shiftsWeek')].cached, row.values.shiftsWeek);
  const [first, second] = row.values.nights;
  rows[rows.findIndex(r => r[0] === `${KEY.night}${row.id}:${first.id}`)][at('payShift')] = 700;
  const blank = rows.findIndex(r => r[0] === `${KEY.night}${row.id}:new`);
  Object.assign(rows[blank], { [at('name')]: 'Sunday', [at('shiftsWeek')]: 1, [at('payShift')]: 300 });
  rows.splice(rows.findIndex(r => r[0] === `${KEY.night}${row.id}:${second.id}`), 1);
  const res = compare(grid, store.doc, { ref });
  assert.deepEqual(linesOf(res).map(l => `${l.how} ${l.label}`), [`edit ${first.name}: Pay a shift (before tax)`, 'add New night: Sunday', `remove ${second.name}: taken out of your spreadsheet`]);
  assert.equal(linesOf(res).find(l => l.how === 'remove').decision, 'skip', 'a deleted night is a No until you say Yes');
  for (const l of linesOf(res)) l.decision = 'keep';
  applyChanges(store, res);
  const v = store.get(row.id).values;
  assert.deepEqual(v.nights.map(n => [n.name, n.shiftsWeek, n.payShift]), [[first.name, first.shiftsWeek, 700], ['Sunday', 1, 300]]);
  assert.equal(v.shiftsWeek, first.shiftsWeek + 1, 'the row adds its nights up again');
  assert.ok(Math.abs(v.payShift - (700 * first.shiftsWeek + 300) / (first.shiftsWeek + 1)) < 0.01);
  // Typing over the row's own Shifts a week is listed and never saved.
  const g2 = gridFromPlan(buildWorkbook(store.doc, ref, { now: NOW }));
  const t2 = locate(g2).tables.income, ri = g2[t2.tab].findIndex(r => r[0] === row.id);
  g2[t2.tab][ri][t2.keys.indexOf('shiftsWeek')] = 9;
  g2._formulas[t2.tab].delete(`${ri}:${t2.keys.indexOf('shiftsWeek')}`);
  const r2 = compare(g2, store.doc, { ref });
  assert.deepEqual([linesOf(r2).length, r2.typedOver.length], [0, 1]);
});
