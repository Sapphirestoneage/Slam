// SPDX-License-Identifier: AGPL-3.0-only
// The game's plan as an .xlsx workbook, and the way back. The game (game/features/book.js) is classic scripts, so its
// Export button loads this module with import() and hands it plain data; this module lays the data out as a workbook
// plan and writes it with the one export engine (js/sheet/excel.js, the same writer the web app's workbook uses).
// Nothing here knows the game's rules: the rows, the formulas and the FIRE sheet's input come from the game.
//
// data: { at: ISO date, fire: the input of js/sheet/fire.js,
//         rows: [{ section } | { label, v, f, words, note, carried }]   (book.js bookTable, a formula on cells C<row>)
//         tabs: [{ name, title, note, cols, table }] }                  (the retirement engine's tables, as values)
// The tab "My plan" keeps the CSV's five columns (section, name, value, how it is worked out, note), so the game reads
// an .xlsx back with the same reader as the CSV: planBookText() gives that tab back as tab-separated lines.
import { fireSheet } from './fire.js';
import { workbookBuffer, readWorkbook } from './excel.js';
import { loadExcelJS } from './load.js';

export const PLAN_TAB = 'My plan';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const tabName = s => String(s).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);

export function planBookPlan(data) {
  const fire = fireSheet(data.fire), sheets = [fire.sheet], names = [...fire.names];
  const R = [[{ v: 'Section', s: 'head' }, { v: 'Name', s: 'head' }, { v: 'Value', s: 'head' }, { v: 'How it is worked out', s: 'head' }, { v: 'Note', s: 'head' }]];
  for (const x of data.rows || []) {
    if (x.section !== undefined) { R.push([{ v: x.section, s: 'band' }, { v: null, s: 'band' }, { v: null, s: 'band' }, { v: null, s: 'band' }, { v: null, s: 'band' }]); continue; }
    const value = x.f ? { f: String(x.f).replace(/^=/, ''), s: 'formula', fmt: 'number', cached: typeof x.v === 'number' && Number.isFinite(x.v) ? x.v : undefined }
      : typeof x.v === 'number' ? { v: x.v, s: x.carried ? 'app' : 'input', fmt: 'number' } : { v: x.v ?? null, s: 'text' };
    R.push([{ v: null }, { v: x.label, s: 'label' }, value, { v: x.words ?? null, s: 'note' }, { v: x.note ?? null, s: 'note' }]);
  }
  sheets.push({ name: PLAN_TAB, kind: 'plan', rows: R, widths: [34, 46, 16, 60, 70], freeze: { rows: 1 } });
  for (const t of data.tabs || []) {
    sheets.push({ name: tabName(t.name || t.title), kind: 'table', widths: t.cols.map(() => 18), rows: [
      [{ v: t.title, s: 'section' }], [{ v: t.note ?? null, s: 'note' }], [],
      t.cols.map(c => ({ v: c, s: 'head' })),
      ...t.table.map(row => row.map((v, i) => ({ v, s: 'app', fmt: i === 0 ? 'day' : 'money' }))),
    ] });
  }
  return { at: data.at ? new Date(data.at) : new Date(), sheets, names, fire };
}

// The file, in the browser: ExcelJS is loaded the first time (js/sheet/load.js), then kept.
export async function planBookFile(data) {
  const ExcelJS = await loadExcelJS();
  return new Blob([await workbookBuffer(ExcelJS, planBookPlan(data))], { type: XLSX_TYPE });
}

// The way back. The tab "My plan" as the lines the game's reader takes: section, name, value. A cell that still holds
// a formula is left out (the game changes only plain values); a number comes back as typed.
export function planBookText(grid) {
  const rows = grid[PLAN_TAB];
  if (!rows) return '';
  const formulas = grid._formulas?.[PLAN_TAB] ?? new Set();
  const clean = v => (v === null || v === undefined ? '' : String(v).replace(/[\t\r\n]+/g, ' '));
  return rows.map((r, i) => [clean(r?.[0]), clean(r?.[1]), formulas.has(`${i}:2`) ? '' : clean(r?.[2])].join('\t')).join('\n');
}
export async function planBookRead(arrayBuffer) {
  const ExcelJS = await loadExcelJS();
  return planBookText(await readWorkbook(ExcelJS, arrayBuffer));
}
