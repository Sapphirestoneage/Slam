// SPDX-License-Identifier: AGPL-3.0-only
// Writes a workbook plan (js/sheet/workbook.js) with ExcelJS, and reads an .xlsx back into plain rows for the import.
// ExcelJS is passed in: the browser loads it from jsDelivr (js/sheet/load.js), Node tests import it when installed.
import { FMT } from './workbook.js';

export const EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';

const BLUE = 'FF1F4E9E', BLUE_FILL = 'FFEFF5FF', GREY = 'FF6B7280', INK = 'FF1F2937', HEAD_FILL = 'FFE5E7EB', BAND_FILL = 'FFF3F4F6', NA_FILL = 'FFFAFAFA', CALC_FILL = 'FFF7F7F8';
// Batch 59: the cells look like the app. A blue box with a border is yours to type in (unlocked); a grey cell is
// worked out (locked; a tab with nothing to type is protected); a bold band is a section of the screen.
const STYLE = {
  title: { font: { bold: true, size: 16, color: { argb: INK } } },
  section: { font: { bold: true, size: 13, color: { argb: INK } } },
  about: { font: { italic: true, color: { argb: GREY } } },
  head: { font: { bold: true, color: { argb: INK } }, fill: HEAD_FILL, border: true, wrap: true },
  band: { font: { bold: true, color: { argb: INK } }, fill: BAND_FILL, band: true },
  label: { font: { color: { argb: INK } }, wrap: true },
  input: { font: { color: { argb: BLUE } }, fill: BLUE_FILL, border: true, unlocked: true },
  na: { fill: NA_FILL },
  formula: { font: { color: { argb: INK } }, fill: CALC_FILL },
  total: { font: { bold: true, color: { argb: INK } }, fill: CALC_FILL },
  formulaValue: { font: { color: { argb: INK } }, fill: CALC_FILL },
  app: { font: { color: { argb: GREY } } },
  appText: { font: { color: { argb: GREY } }, wrap: true },
  check: { font: { color: { argb: GREY } } },
  note: { font: { italic: true, color: { argb: GREY } } },
  text: {},
  link: { font: { color: { argb: BLUE }, underline: true } },
  hidden: { font: { color: { argb: GREY }, size: 8 } },
  key: { font: { color: { argb: GREY }, size: 8 } },
};
const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = { style: 'thin', color: { argb: 'FF9CA3AF' } }; // visible input borders
const line = { style: 'thin', color: { argb: 'FFD1D5DB' } };
const NUMERIC = new Set(['money', 'cents', 'pct', 'months', 'number', 'years', 'day', 'date', 'month', 'days', 'count']);
const hasCents = v => typeof v === 'number' && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 && Math.round(v * 100) % 100 !== 0;

export async function writeWorkbook(ExcelJS, plan, { cache = true } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SLAM';
  wb.created = plan.at;
  wb.calcProperties = { fullCalcOnLoad: true }; // Excel works every formula out when the file opens
  for (const s of plan.sheets) {
    const ws = wb.addWorksheet(s.name, { state: s.hidden ? 'hidden' : 'visible', views: s.freeze ? [{ state: 'frozen', xSplit: s.freeze.cols ?? 0, ySplit: s.freeze.rows ?? 0, showGridLines: s.kind !== 'screen' }] : [{ showGridLines: s.kind !== 'screen' }] });
    (s.widths || []).forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    for (const letter of s.hiddenCols || []) ws.getColumn(letter).hidden = true;
    for (const letter of s.groups || []) { const col = ws.getColumn(letter); col.outlineLevel = 1; col.hidden = true; } // batch 63: the working, collapsed
    if (s.groups?.length) ws.properties.outlineProperties = { summaryRight: false };
    for (const r of s.hiddenRows || []) ws.getRow(r).hidden = true;
    s.rows.forEach((row, ri) => {
      (row || []).forEach((cell, ci) => {
        if (!cell) return;
        const c = ws.getCell(ri + 1, ci + 1);
        if (cell.f) c.value = cache && cell.cached !== undefined && cell.cached !== null && cell.cached !== 'Never' && typeof cell.cached !== 'object' ? { formula: cell.f, result: cell.cached } : { formula: cell.f };
        else if (cell.link) c.value = { text: cell.v, hyperlink: cell.link };
        else if (cell.v !== undefined && cell.v !== null) c.value = typeof cell.v === 'object' && !(cell.v instanceof Date) ? JSON.stringify(cell.v) : cell.v;
        const st = STYLE[cell.s] || {};
        if (st.font) c.font = st.font;
        if (st.fill) c.fill = fill(st.fill);
        if (st.border) c.border = { top: thin, left: thin, bottom: thin, right: thin };
        else if (st.band) c.border = { top: line, bottom: line };
        if (st.unlocked) c.protection = { locked: false };
        if (st.wrap) c.alignment = { wrapText: true, vertical: cell.s === 'head' ? 'middle' : 'top' };
        else if (NUMERIC.has(cell.fmt) || typeof cell.v === 'number') c.alignment = { horizontal: 'right' }; // numbers right-aligned
        const fmt = cell.fmt === 'number' && (cell.f || cell.s === 'app') ? ((cell.f ? cell.cached : cell.v) == null ? 'General' : Number.isInteger(cell.f ? cell.cached : cell.v) ? '#,##0' : '#,##0.0#') : FMT[cell.fmt === 'money' && hasCents(cell.v) ? 'cents' : cell.fmt]; // a worked-out number reads like the app (0.84, not 0.844907)
        if (fmt && fmt !== '@' && (cell.f || typeof cell.v === 'number' || cell.v instanceof Date || cell.s === 'input' || cell.s === 'app')) c.numFmt = fmt;
        if (cell.s === 'input' && (cell.fmt === 'date' || cell.fmt === 'month')) c.numFmt = FMT[cell.fmt];
      });
    });
    for (const r of s.headRows || []) ws.getRow(r).height = 46; // a header wraps to three lines
    for (const v of s.validations || []) {
      // A list in the rule (short, no commas) or a named range on the hidden _lists tab. Another word still goes in
      // (no error box): the import says when a word is not one of the choices.
      const rule = { type: 'list', allowBlank: true, showErrorMessage: false, formulae: [v.ref ?? `"${v.list.join(',')}"`] };
      for (let r = v.from; r <= v.to; r++) ws.getCell(`${v.col}${r}`).dataValidation = rule;
    }
  }
  for (const n of plan.names) wb.definedNames.add(n.ref, n.name);
  for (const s of plan.sheets.filter(x => x.protect)) await wb.getWorksheet(s.name).protect('', { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, formatRows: true });
  return wb;
}

export async function workbookBuffer(ExcelJS, plan, opts) {
  return (await writeWorkbook(ExcelJS, plan, opts)).xlsx.writeBuffer();
}

// An .xlsx back to { sheetName: rows of plain values } (a formula cell gives its result; a date stays a Date).
// grid._formulas[sheetName] holds 'row:col' (0-based) for every cell that is still a formula, so the import can tell
// a number typed over a formula.
export async function readWorkbook(ExcelJS, data) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const out = {};
  Object.defineProperty(out, '_formulas', { value: {}, enumerable: false });
  wb.eachSheet(ws => {
    const rows = [];
    const f = out._formulas[ws.name] = new Set();
    ws.eachRow({ includeEmpty: true }, (row, rn) => {
      const vals = [];
      row.eachCell({ includeEmpty: true }, (cell, cn) => {
        vals[cn - 1] = plain(cell.value);
        if (cell.value && typeof cell.value === 'object' && ('formula' in cell.value || 'sharedFormula' in cell.value)) f.add(`${rn - 1}:${cn - 1}`);
      });
      rows[rn - 1] = vals;
    });
    out[ws.name] = rows;
  });
  return out;
}
function plain(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if ('result' in v || 'formula' in v || 'sharedFormula' in v) return v.result === undefined ? null : plain(v.result);
    if ('richText' in v) return v.richText.map(t => t.text).join('');
    if ('text' in v) return v.text;
    if ('error' in v) return null;
  }
  return v;
}
