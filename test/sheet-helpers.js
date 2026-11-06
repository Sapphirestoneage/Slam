// Batch 59: find an area's table in a workbook plan (its tab follows the screens). Used by the workbook tests.
import { KEY } from '../js/sheet/workbook.js';

// { sheet, headAt, head: the header labels, keys: the column keys, rows: the plan rows of its records (with an id) }
export function tableIn(plan, area) {
  for (const sheet of plan.sheets) {
    const headAt = sheet.rows.findIndex(r => r?.[0]?.v === `${KEY.head}${area}`);
    if (headAt < 0) continue;
    const end = sheet.rows.findIndex((r, i) => i > headAt && r?.[0]?.v === `${KEY.end}${area}`);
    const body = sheet.rows.slice(headAt + 1, end);
    return { sheet, headAt, head: sheet.rows[headAt].map(c => c?.v ?? null), keys: sheet.rows[headAt - 1].map(c => c?.v ?? null),
      rows: body.filter(r => r?.[0]?.v && !String(r[0].v).startsWith('#')) };
  }
  return null;
}
// A doc field's value cell on its screen tab: { sheet, ri, cell }.
export function fieldIn(plan, id) {
  for (const sheet of plan.sheets) {
    const ri = sheet.rows.findIndex(r => r?.[0]?.v === `${KEY.field}${id}`);
    if (ri >= 0) return { sheet, ri, cell: sheet.rows[ri][2] };
  }
  return null;
}
