// Open the books: the workbook is built from the registries only, every field and formula lands in it, and its
// formulas give the app's numbers. The ExcelJS and LibreOffice checks run when those are installed (npm install
// exceljs@4.4.0 --no-save; LibreOffice for the recalculation) and skip with a message when not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { householdFromInputs } from '../js/demo.js';
import { Store, newHousehold } from '../js/records.js';
import { AREAS, sheetFields } from '../js/registry/fields.js';
import { MATH, rowsOf } from '../js/registry/math.js';
import { ASSUMPTIONS } from '../js/registry/assumptions.js';
import { REPORTS } from '../js/registry/reports.js';
import { buildWorkbook, formulaCols, DATA_TAB, COACH_TAB, nameOk } from '../js/sheet/workbook.js';
import { SCREEN_TABS, tabOfArea, tabOfReport } from '../js/registry/tabs.js';
import { locate } from '../js/import-sheet.js';
import { tableIn, fieldIn } from './sheet-helpers.js';
import { everyField, richHousehold } from '../fixtures/households.js';
import { loadExcel, soffice as SOFFICE, missing as WB_MISSING } from '../tools/workbook-check.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const NOW = new Date('2026-11-03T12:00:00Z');
const demoDoc = () => householdFromInputs(demo.inputs, { now: NOW.toISOString() });

test('every registry field has its column or row, every math entry its row, every assumption its line', () => {
  const plan = buildWorkbook(everyField(), ref, { now: NOW, coach: true });
  const byName = Object.fromEntries(plan.sheets.map(s => [s.name, s]));
  for (const a of AREAS) {
    if (a.source === 'doc') { for (const f of sheetFields(a, { coach: true })) assert.ok(fieldIn(plan, f.id), `${f.id}: a row on its screen tab`); continue; }
    const t = tableIn(plan, a.id);
    assert.ok(t, `${a.id}: a table`);
    assert.equal(t.sheet.name, tabOfArea(a.id));
    for (const f of sheetFields(a, { coach: true })) assert.ok(t.head.includes(f.label), `${a.tab}: column ${f.label}`);
    for (const col of formulaCols().filter(x => x.area === a.id)) assert.ok(t.head.includes(col.label), `${a.tab}: formula column ${col.label}`);
  }
  const mathIds = byName.Math.rows.slice(3).map(r => r[0].v);
  for (const e of MATH) for (const row of rowsOf(e)) assert.ok(mathIds.includes(row.key ? `${e.id} · ${row.key}` : e.id), `Math row ${e.id} ${row.key ?? ''}`);
  const aLabels = byName.Assumptions.rows.map(r => r?.[0]?.v);
  for (const a of ASSUMPTIONS) assert.ok(aLabels.includes(a.label), `Assumption ${a.label}`);
  const order = plan.sheets.map(s => s.name);
  assert.deepEqual(order.slice(0, SCREEN_TABS.length + 1), ['Start here', ...SCREEN_TABS.map(t => t.name)], 'Start here, then the screens in nav order');
  assert.ok(order.indexOf('Math') > order.indexOf('Assumptions') && order.indexOf('Assumptions') > order.indexOf(SCREEN_TABS.at(-1).name), 'the engine room after the screens');
  for (const r of REPORTS) assert.ok(byName[tabOfReport(r.tab)], `${r.tab} tab`);
  assert.ok(byName[DATA_TAB].hidden, 'the SLAM data tab is hidden');
  for (const n of plan.names) assert.ok(nameOk(n.name), `${n.name}: a name Excel and Google Sheets accept`);
  const text = JSON.stringify(plan.sheets.map(s => s.rows));
  assert.ok(!text.includes('\u2014'), 'no em dash anywhere in the file');
});

test('each screen tab looks like the app: a line saying which screen it is, bands for sections, boxes for inputs, dropdowns for taps', () => {
  const plan = buildWorkbook(everyField(), ref, { now: NOW });
  for (const t of SCREEN_TABS) {
    const s = plan.sheets.find(x => x.name === t.name);
    assert.equal(s.rows[0][1].v, t.name);
    assert.match(s.rows[1][1].v, / in SLAM/);
    assert.ok(s.freeze?.rows >= 2, `${t.name}: frozen`);
    assert.deepEqual(s.hiddenCols.slice(0, 1), ['A']);
  }
  const budget = plan.sheets.find(x => x.name === 'Cash flow › Budget');
  const bands = budget.bands.map(r => budget.rows[r - 1][1].v);
  assert.deepEqual(bands.slice(0, 4), ['Your gut number', 'Accommodation', 'Food', 'Transportation']);
  assert.ok(bands.includes('Irregular and yearly costs') && bands.includes('Health and self-care'));
  const debt = plan.sheets.find(x => x.name === 'Net worth › Debt');
  assert.deepEqual(debt.bands.map(r => debt.rows[r - 1][1].v), ['Credit cards', 'Loans', 'Other']);
  const assets = plan.sheets.find(x => x.name === 'Net worth › Assets');
  assert.deepEqual(assets.bands.map(r => assets.rows[r - 1][1].v), ['Cash', 'Investments', 'Home or car']);
  // Dropdowns: the statuses as the app says them, each choice, Yes or No, owners, the categories.
  const t = tableIn(plan, 'spending');
  const letter = key => String.fromCharCode(65 + t.keys.indexOf(key));
  const rules = budget.validations;
  assert.ok(rules.some(v => v.col === letter('Status') && v.list.join() === 'Know it,Roughly,Guess,Will get it,Not now,Not for me'));
  assert.ok(rules.some(v => v.col === letter('whoPays') && v.list.includes('Covered by someone')));
  assert.ok(rules.some(v => v.list.includes('Groceries') && v.ref), 'the categories, from the hidden lists tab');
  const about = plan.sheets.find(x => x.name === 'Home › About you');
  assert.ok(about.validations.some(v => v.list.includes('Married merged')), 'Household mode is a pick');
  // Output-only tabs are locked; tabs with boxes are not (rows can be added and deleted).
  assert.equal(plan.sheets.find(x => x.name === 'Report › Overview').protect, true);
  assert.equal(budget.protect, false);
});

test('the client view leaves out coach notes, Report this notes and the timer; the coach copy can include them', () => {
  const doc = demoDoc();
  const s = new Store(doc, { now: () => NOW.toISOString() });
  s.update(s.find(r => r.kind === 'debt')[0].id, { privateNote: 'Coach only: talk about the card' });
  s.setIn('session', ['feedback'], [{ at: NOW.toISOString(), screen: '#/home/prep', title: 'Prep', note: 'A beta note' }]);
  s.setIn('session', ['timer'], { start: NOW.toISOString() });
  const text = plan => JSON.stringify(plan.sheets.filter(x => x.name !== DATA_TAB).map(x => x.rows));
  const client = buildWorkbook(doc, ref, { now: NOW });
  assert.ok(!text(client).includes('Coach only: talk about the card') && !text(client).includes('A beta note'));
  assert.ok(!client.sheets.some(x => x.name === COACH_TAB));
  assert.ok(!tableIn(client, 'debt').head.includes('Coach notes'));
  const coach = buildWorkbook(doc, ref, { now: NOW, coach: true });
  assert.ok(text(coach).includes('Coach only: talk about the card') && text(coach).includes('A beta note'));
});

test('a formula that names something the workbook does not have stops the build', () => {
  const e = MATH.find(x => x.id === 'M02');
  const was = e.sheet;
  e.sheet = 'RealReturn+NotAName';
  try { assert.throws(() => buildWorkbook(demoDoc(), ref, { now: NOW }), /NotAName/); } finally { e.sheet = was; }
});

test('builds for a new, empty household too', () => {
  const plan = buildWorkbook(newHousehold({ name: 'Empty', now: NOW.toISOString() }), ref, { now: NOW });
  assert.ok(plan.sheets.length > 10);
});

// ---------- With ExcelJS and LibreOffice ----------
let ExcelJS = null;
ExcelJS = loadExcel(); // here, or the main checkout's in a git worktree (tools/workbook-check.mjs)
const soffice = SOFFICE;

test('the workbook writes and reads back with ExcelJS', { skip: !ExcelJS && 'ExcelJS is not installed (npm install exceljs@4.4.0 --no-save)' }, async () => {
  const { workbookBuffer, readWorkbook } = await import('../js/sheet/excel.js');
  const plan = buildWorkbook(everyField(), ref, { now: NOW });
  const grid = await readWorkbook(ExcelJS, await workbookBuffer(ExcelJS, plan));
  for (const s of plan.sheets) assert.ok(grid[s.name], `${s.name} read back`);
  assert.equal(locate(grid).tables.debt.head[1], 'Name');
});

// Recalculate in LibreOffice with no cached values, then read every Check cell (on Math and every screen tab).
async function recalculated(doc) {
  const { workbookBuffer } = await import('../js/sheet/excel.js');
  const dir = mkdtempSync(join(tmpdir(), 'slam-sheet-'));
  const file = join(dir, 'book.xlsx');
  const plan = buildWorkbook(doc, ref, { now: NOW });
  writeFileSync(file, Buffer.from(await workbookBuffer(ExcelJS, plan, { cache: false })));
  execFileSync(soffice, [`-env:UserInstallation=file://${join(dir, 'lo-profile')}`, '--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'out'), file], { stdio: 'ignore', timeout: 120000 });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(dir, 'out', 'book.xlsx'));
  wb.plan = plan;
  return wb;
}
// Every Check cell of the plan that is not Matches (or From the app) once recalculated.
export function offChecks(wb, off = []) {
  for (const s of wb.plan.sheets) s.rows.forEach((row, ri) => (row || []).forEach((cell, ci) => {
    if (cell?.s !== 'check') return;
    const v = wb.getWorksheet(s.name).getCell(ri + 1, ci + 1).value;
    const shown = v && typeof v === 'object' ? v.result ?? v.error : v;
    if (shown != null && shown !== 'Matches' && shown !== 'From the app') off.push(`${s.name} row ${ri + 1} (${row[0]?.v} ${row[1]?.v}): ${JSON.stringify(shown)}`);
  }));
  return off;
}

for (const [label, make] of [['the Demo client', demoDoc], ['a household using most of the math', richHousehold]]) {
  test(`opened in a spreadsheet, every formula gives the app's number (${label})`, { skip: WB_MISSING, timeout: 180000 }, async () => {
    assert.deepEqual(offChecks(await recalculated(make())), []);
  });
}

test('opened in a spreadsheet, no formula errors with every field filled', { skip: WB_MISSING, timeout: 180000 }, async () => {
  const wb = await recalculated(everyField());
  const errors = [];
  wb.eachSheet(ws => ws.eachRow(row => row.eachCell(cell => {
    const v = cell.value;
    const e = v && typeof v === 'object' ? (v.error ?? (v.result && typeof v.result === 'object' ? v.result.error : null)) : null;
    if (e) errors.push(`${ws.name}!${cell.address}: ${e} in ${v.formula ?? ''}`);
  })));
  assert.deepEqual(errors.slice(0, 20), []);
});
