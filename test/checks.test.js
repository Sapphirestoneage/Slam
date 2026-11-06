// Section 6 checks: the workbook for the Demo client and the private Test client, recalculated in LibreOffice, every
// Math row within $1 or 1 month of the app; and one input changed in the file (rent +$100) moves surplus, savings
// rate and the FI date the way the app does. Without LibreOffice (and ExcelJS) these skip and say so; the rows are
// then only checked by reading (test/workbook.test.js and test/coverage.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { householdFromInputs } from '../js/demo.js';
import { Store } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { richHousehold } from '../fixtures/households.js';
import { loadExcel, soffice as SOFFICE } from '../tools/workbook-check.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const privatePath = new URL('../fixtures/eli.local.json', import.meta.url);
const NOW = new Date('2026-11-03T12:00:00Z');
let ExcelJS = null;
ExcelJS = loadExcel(); // here, or the main checkout's in a git worktree (tools/workbook-check.mjs)
const soffice = SOFFICE;
const NEED = (!ExcelJS || !soffice) && `needs ExcelJS (npm install) and LibreOffice: without them the Math rows are only checked by reading`;

async function recalc(doc, edit = null) {
  const { workbookBuffer } = await import('../js/sheet/excel.js');
  const dir = mkdtempSync(join(tmpdir(), 'slam-check-'));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await workbookBuffer(ExcelJS, buildWorkbook(doc, ref, { now: NOW }), { cache: false }));
  if (edit) edit(wb);
  await wb.xlsx.writeFile(join(dir, 'book.xlsx'));
  execFileSync(soffice, ['--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'out'), join(dir, 'book.xlsx')], { stdio: 'ignore', timeout: 120000 });
  const out = new ExcelJS.Workbook();
  await out.xlsx.readFile(join(dir, 'out', 'book.xlsx'));
  return out;
}
const value = v => (v && typeof v === 'object' ? v.result ?? v.error ?? null : v);
// Every Math row: its formula result against the app's value, within $1 or 1 month.
function mathRows(wb) {
  const ws = wb.getWorksheet('Math');
  const rows = {};
  ws.eachRow((row, n) => { if (n > 3) rows[row.getCell(1).value] = { f: value(row.getCell(3).value), app: value(row.getCell(4).value), check: value(row.getCell(5).value) }; });
  return rows;
}

for (const [label, make, skip] of [
  ['the Demo client', () => householdFromInputs(demo.inputs, { now: NOW.toISOString() }), false],
  ['the private Test client', () => householdFromInputs(JSON.parse(readFileSync(privatePath)).inputs, { name: 'Test client', now: NOW.toISOString() }), !existsSync(privatePath) && 'fixtures/eli.local.json is missing. Put SLAM Test Client (private).xlsx in fixtures/ and run python3 tools/fixtures.py private.'],
]) {
  test(`every Math row matches the app within $1 or 1 month (${label})`, { skip: skip || NEED, timeout: 180000 }, async () => {
    const rows = mathRows(await recalc(make()));
    const off = Object.entries(rows).filter(([, r]) => r.check !== 'Matches' && r.check !== 'From the app').map(([id, r]) => `${id}: sheet ${r.f}, app ${r.app}`);
    assert.deepEqual(off, []);
    assert.ok(Object.values(rows).filter(r => r.check === 'Matches').length > 50, 'most rows are formulas');
  });
}

test('rent +$100 in the file moves surplus, savings rate and the FI date the way the app does', { skip: NEED, timeout: 180000 }, async () => {
  for (const make of [richHousehold, () => householdFromInputs(demo.inputs, { now: NOW.toISOString() })]) {
    const doc = make();
    const before = mathRows(await recalc(doc));
    const after = mathRows(await recalc(doc, wb => {
      const ws = wb.getWorksheet('Spending lines');
      const head = ws.getRow(1).values;
      ws.eachRow((row, n) => { if (n > 1 && row.getCell(head.indexOf('Name')).value === 'Rent') { const c = row.getCell(head.indexOf('Amount')); c.value = c.value + 100; } });
    }));
    const s = new Store(JSON.parse(JSON.stringify(doc)));
    const rent = s.find(r => r.name === 'Rent')[0];
    s.update(rent.id, { amount: rent.amount + 100 });
    const m0 = metrics(doc, ref, { now: NOW }), m1 = metrics(s.doc, ref, { now: NOW });
    for (const [id, app0, app1, tol] of [['M27', m0.surplus.value, m1.surplus.value, 1], ['M28', m0.savingsRate.value, m1.savingsRate.value, 0.0005], ['M53', m0.monthsToFi.value, m1.monthsToFi.value, 1]]) {
      assert.ok(Math.abs(before[id].f - app0) <= tol, `${id} before: sheet ${before[id].f}, app ${app0}`);
      assert.ok(Math.abs(after[id].f - app1) <= tol, `${id} after rent +$100: sheet ${after[id].f}, app ${app1}`);
      assert.equal(Math.sign(Math.round((after[id].f - before[id].f) * 1e6)), Math.sign(Math.round((app1 - app0) * 1e6)), `${id} moves the same way`);
    }
  }
});
