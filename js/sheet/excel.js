// Writes a workbook plan (js/sheet/workbook.js) with ExcelJS, and reads an .xlsx back into plain rows for the import.
// ExcelJS is passed in: the browser loads it from jsDelivr (js/sheet/load.js), Node tests import it when installed.
import { FMT } from './workbook.js';

export const EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';

const BLUE = 'FF1F4E9E', BLUE_FILL = 'FFE8F0FC', GREY = 'FF6B7280', HEAD_FILL = 'FFF3F4F6', NA_FILL = 'FFF9FAFB';
const STYLE = {
  title: { font: { bold: true, size: 16 } },
  section: { font: { bold: true, size: 12 } },
  about: { font: { italic: true, color: { argb: GREY } } },
  head: { font: { bold: true }, fill: HEAD_FILL, border: true, wrap: true },
  input: { font: { color: { argb: BLUE } }, fill: BLUE_FILL, border: true },
  na: { fill: NA_FILL },
  formula: { font: { color: { argb: 'FF000000' } } },
  total: { font: { bold: true } },
  formulaValue: { font: { color: { argb: 'FF000000' } } },
  app: { font: { color: { argb: GREY } } },
  check: { font: { color: { argb: GREY } } },
  note: { font: { italic: true, color: { argb: GREY } } },
  text: {},
  link: { font: { color: { argb: BLUE }, underline: true } },
  hidden: { font: { color: { argb: GREY }, size: 8 } },
};
const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = { style: 'thin', color: { argb: 'FFD1D5DB' } };

export function writeWorkbook(ExcelJS, plan, { cache = true } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SLAM';
  wb.created = plan.at;
  wb.calcProperties = { fullCalcOnLoad: true }; // Excel works every formula out when the file opens
  for (const s of plan.sheets) {
    const ws = wb.addWorksheet(s.name, { state: s.hidden ? 'hidden' : 'visible', views: s.freeze ? [{ state: 'frozen', xSplit: s.freeze.cols ?? 0, ySplit: s.freeze.rows ?? 0 }] : [] });
    (s.widths || []).forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    for (const letter of s.hiddenCols || []) ws.getColumn(letter).hidden = true;
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
        if (st.wrap) c.alignment = { wrapText: true, vertical: 'top' };
        const fmt = FMT[cell.fmt];
        if (fmt && fmt !== '@' && (cell.f || typeof cell.v === 'number' || cell.v instanceof Date || cell.s === 'input')) c.numFmt = fmt;
        if (cell.s === 'input' && (cell.fmt === 'date' || cell.fmt === 'month')) c.numFmt = FMT[cell.fmt];
      });
    });
    for (const v of s.validations || []) {
      for (let r = v.from; r <= v.to; r++) ws.getCell(`${v.col}${r}`).dataValidation = { type: 'list', allowBlank: true, showErrorMessage: false, formulae: [`"${v.list.join(',')}"`] };
    }
  }
  for (const n of plan.names) wb.definedNames.add(n.ref, n.name);
  return wb;
}

export async function workbookBuffer(ExcelJS, plan, opts) {
  return writeWorkbook(ExcelJS, plan, opts).xlsx.writeBuffer();
}

// An .xlsx back to { sheetName: rows of plain values } (a formula cell gives its result; a date stays a Date).
export async function readWorkbook(ExcelJS, data) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const out = {};
  wb.eachSheet(ws => {
    const rows = [];
    ws.eachRow({ includeEmpty: true }, (row, rn) => {
      const vals = [];
      row.eachCell({ includeEmpty: true }, (cell, cn) => { vals[cn - 1] = plain(cell.value); });
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
