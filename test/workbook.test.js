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
import { buildWorkbook, formulaCols, BLANK_ROWS, DATA_TAB, COACH_TAB, nameOk } from '../js/sheet/workbook.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const NOW = new Date('2026-11-03T12:00:00Z');
const demoDoc = () => householdFromInputs(demo.inputs, { now: NOW.toISOString() });

// A household with a row of every kind and a value in every field the registry declares.
export function everyField() {
  const s = new Store(newHousehold({ name: 'Every field', now: NOW.toISOString() }), { now: () => NOW.toISOString() });
  const sample = (f, i = 0) => ({ money: 100 + i, pct: 0.05, date: '2026-12-15', month: '2027-03', day: 15, number: 2, text: `Text ${i}`, choice: f.options?.[0], yesno: true, list: ['a', 'b'] })[f.type];
  s.transaction('Every field', () => {
    for (const a of AREAS) {
      if (a.source === 'records') {
        for (const kind of Object.keys(a.kinds)) {
          const top = {}, values = {};
          a.fields.filter(f => f.sheet === true && (!f.kinds || f.kinds.includes(kind))).forEach((f, i) => { (f.where === 'top' ? top : values)[f.key] = sample(f, i); });
          s.add(kind, { ...top, values }, { type: a.types?.[kind]?.[0] ?? null });
        }
      } else if (a.source === 'doc') {
        for (const f of a.fields.filter(x => x.sheet === true)) {
          const part = f.part ?? a.part ?? 'profile';
          const path = f.key.split('.');
          const obj = JSON.parse(JSON.stringify(s.doc[part] || {}));
          let o = obj; for (const k of path.slice(0, -1)) o = (o[k] ??= {});
          o[path.at(-1)] = sample(f);
          s.setDoc(part, obj);
        }
      } else if (a.source === 'list') {
        s.setDoc(a.part, { [a.path]: [Object.fromEntries(a.fields.map((f, i) => [f.key, sample(f, i)]))].map(x => ({ id: 'g1', ...x })) });
      }
    }
    const bill = s.find(r => r.kind === 'bill')[0];
    s.setIn('spending', ['months', '2026-11', 'lines', bill.id], { estimate: 90, actual: 120 });
  });
  return s.doc;
}

// A household that uses most of the math: gross pay with a 401(k) and match, NY and NYC tax, a couple, lines
// instead of the gut, a split rent, a covered bill, a yearly cost, cards on the minimum and in full, a 0% promo.
export function richHousehold() {
  const s = new Store(newHousehold({ name: 'Rich example', now: NOW.toISOString() }), { now: () => NOW.toISOString() });
  s.transaction('x', () => {
    s.setDoc('profile', { age: 34, household: 'Couple', state: 'NY', nyc: true, roommates: 1, incomeStability: 'Varies', variable: { lowest: 3000, typical: 4500 }, keepJobAfterLaunch: 'Yes' });
    s.setDoc('client', { couple: true });
    s.setDoc('assumptions', { realReturn: 0.06, fiAge: 55 });
    s.setDoc('spending', { source: 'lines' });
    s.add('income', { name: 'Job', amount: 120000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', contributionPct: 0.06, matchPct: 0.5, matchCapPct: 0.06, otherPretax: 20 } }, { type: 'Job' });
    s.add('income', { name: 'Side', amount: 800, per: 'month', values: {} }, { type: 'Side hustle' });
    s.add('income', { name: 'Partner', amount: 3100, per: '2 weeks', values: { payFrequency: '2 weeks' } }, { type: 'Partner job' });
    s.add('spending', { name: 'Gut', amount: 5000, values: { includesDebtPayments: false } }, { type: 'All in' });
    s.add('bill', { name: 'Rent', amount: 3200, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', whoPays: 'Split' } });
    s.add('bill', { name: 'Electric', amount: 120, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable' } });
    s.add('bill', { name: 'Groceries', amount: 200, per: 'week', values: { category: 'Groceries, dining out, coffee', draftt: 'Food', amountType: 'Variable' } });
    s.add('bill', { name: 'Phone', amount: 80, values: { category: 'Internet, phone', draftt: 'Accommodation', amountType: 'Fixed', whoPays: 'Covered by someone' } });
    s.add('bill', { name: 'Insurance', amount: 1200, per: 'year', values: { draftt: 'Transportation', amountType: 'Fixed', irregular: true } });
    s.add('bill', { name: 'IRA', amount: 300, values: { draftt: 'Retirement', amountType: 'Fixed' } });
    s.add('account', { name: 'Checking', values: { group: 'cash', balance: 9000 } }, { type: 'Checking' });
    s.add('account', { name: '401k', values: { group: 'investment', balance: 60000, unvested: 4000 } }, { type: '401(k)' });
    s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 15000 } }, { type: 'Brokerage' });
    s.add('account', { name: 'Roth', values: { group: 'investment', balance: 12000 } }, { type: 'Roth IRA' });
    s.add('asset', { name: 'Car', values: { value: 14000 } }, { type: 'Car' });
    s.add('debt', { name: 'Visa', values: { balance: 3000, apr: 0.24, limit: 10000 } }, { type: 'Credit card' });
    s.add('debt', { name: 'Amex', values: { balance: 1500, apr: 0.2, payChoice: 'In full', limit: 5000 } }, { type: 'Credit card' });
    s.add('debt', { name: 'Student', values: { balance: 22000, apr: 0.045, payment: 250 } }, { type: 'Student loan' });
    s.add('debt', { name: 'Promo', values: { balance: 2400, apr: 0, payment: 100, promoEnd: '2027-09' } }, { type: 'Personal loan' });
    s.add('coverage', { name: 'Health', amount: 120, per: 'month', values: { have: 'Have it', deductible: 1500, paidFrom: 'Budget' } }, { type: 'Health' });
    s.setIn('spending', ['months', '2026-10', 'lines', s.find(r => r.name === 'Groceries')[0].id], { estimate: 800, actual: 950 });
  });
  return s.doc;
}

test('every registry field has its column, every math entry its row, every assumption its line', () => {
  const plan = buildWorkbook(everyField(), ref, { now: NOW, coach: true });
  const byName = Object.fromEntries(plan.sheets.map(s => [s.name, s]));
  for (const a of AREAS) {
    const sheet = byName[a.tab];
    assert.ok(sheet, `${a.tab} tab`);
    const heads = sheet.rows[0].map(c => c.v);
    for (const f of sheetFields(a, { coach: true })) assert.ok(heads.includes(f.label), `${a.tab}: column ${f.label}`);
    for (const col of formulaCols().filter(x => x.area === a.id)) assert.ok(heads.includes(col.label), `${a.tab}: formula column ${col.label}`);
    if (a.source !== 'doc') assert.ok(sheet.rows.length - 1 >= BLANK_ROWS, `${a.tab}: ${BLANK_ROWS} blank rows`);
  }
  const mathIds = byName.Math.rows.slice(3).map(r => r[0].v);
  for (const e of MATH) for (const row of rowsOf(e)) assert.ok(mathIds.includes(row.key ? `${e.id} · ${row.key}` : e.id), `Math row ${e.id} ${row.key ?? ''}`);
  const aLabels = byName.Assumptions.rows.map(r => r?.[0]?.v);
  for (const a of ASSUMPTIONS) assert.ok(aLabels.includes(a.label), `Assumption ${a.label}`);
  assert.deepEqual(plan.sheets.map(s => s.name).slice(0, 2), ['Start here', 'Assumptions']);
  const order = plan.sheets.map(s => s.name);
  assert.ok(order.indexOf('Math') > order.indexOf(AREAS.at(-1).tab) && order.indexOf('Statements') > order.indexOf('Math'), 'tabs in order');
  for (const r of REPORTS) assert.ok(byName[r.tab], `${r.tab} tab`);
  assert.ok(byName[DATA_TAB].hidden, 'the SLAM data tab is hidden');
  for (const n of plan.names) assert.ok(nameOk(n.name), `${n.name}: a name Excel and Google Sheets accept`);
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
  assert.ok(!client.sheets.find(x => x.name === 'Debt').rows[0].some(c => c.v === 'Coach notes'));
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
try { ExcelJS = (await import('exceljs')).default; } catch { /* not installed */ }
const soffice = ['/usr/bin/soffice', '/usr/local/bin/soffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice'].find(p => existsSync(p));

test('the workbook writes and reads back with ExcelJS', { skip: !ExcelJS && 'ExcelJS is not installed (npm install exceljs@4.4.0 --no-save)' }, async () => {
  const { workbookBuffer, readWorkbook } = await import('../js/sheet/excel.js');
  const plan = buildWorkbook(everyField(), ref, { now: NOW });
  const grid = await readWorkbook(ExcelJS, await workbookBuffer(ExcelJS, plan));
  for (const s of plan.sheets) assert.ok(grid[s.name], `${s.name} read back`);
  assert.equal(grid.Debt[0][5], 'Name');
});

// Recalculate in LibreOffice with no cached values, then read every Check cell.
async function recalculated(doc) {
  const { workbookBuffer, readWorkbook } = await import('../js/sheet/excel.js');
  const dir = mkdtempSync(join(tmpdir(), 'slam-sheet-'));
  const file = join(dir, 'book.xlsx');
  writeFileSync(file, Buffer.from(await workbookBuffer(ExcelJS, buildWorkbook(doc, ref, { now: NOW }), { cache: false })));
  execFileSync(soffice, ['--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'out'), file], { stdio: 'ignore', timeout: 120000 });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(dir, 'out', 'book.xlsx'));
  return wb;
}
const CHECK_TABS = ['Math', 'Statements', 'FOO', 'Projections'];

for (const [label, make] of [['the Demo client', demoDoc], ['a household using most of the math', richHousehold]]) {
  test(`opened in a spreadsheet, every formula gives the app's number (${label})`, { skip: (!ExcelJS || !soffice) && 'needs ExcelJS and LibreOffice', timeout: 180000 }, async () => {
    const wb = await recalculated(make());
    const off = [];
    for (const tab of CHECK_TABS) {
      const ws = wb.getWorksheet(tab);
      const col = ws.getRow(3).values.indexOf('Check');
      ws.eachRow((row, n) => {
        if (n <= 3) return;
        const v = row.getCell(col).value;
        const shown = v && typeof v === 'object' ? v.result ?? v.error : v;
        if (shown != null && shown !== 'Matches' && shown !== 'From the app') off.push(`${tab} row ${n} (${row.getCell(1).value} ${row.getCell(2).value}): ${JSON.stringify(shown)}`);
      });
    }
    assert.deepEqual(off, []);
  });
}

test('opened in a spreadsheet, no formula errors with every field filled', { skip: (!ExcelJS || !soffice) && 'needs ExcelJS and LibreOffice', timeout: 180000 }, async () => {
  const wb = await recalculated(everyField());
  const errors = [];
  wb.eachSheet(ws => ws.eachRow(row => row.eachCell(cell => {
    const v = cell.value;
    const e = v && typeof v === 'object' ? (v.error ?? (v.result && typeof v.result === 'object' ? v.result.error : null)) : null;
    if (e) errors.push(`${ws.name}!${cell.address}: ${e} in ${v.formula ?? ''}`);
  })));
  assert.deepEqual(errors.slice(0, 20), []);
});
