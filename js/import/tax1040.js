// SPDX-License-Identifier: AGPL-3.0-only
// Reads the main lines of a Form 1040 from the text of its PDF. Input: pages, each a list of text pieces
// { str, x, y, w } (x from the left, y from the bottom, as a PDF gives them; filled-in form fields count as pieces at
// their own spot). A line is found by the words printed on the form, not by its number, since numbers shift from year to
// year. The amount is the last thing on that row, at the right edge. Pure: no PDF library here, so it is tested with rows.
export const LINES = [
  { id: 'wages', label: 'Wages', re: /Add lines 1a through 1h|Total amount from Form\(s\) W-2|Wages, salaries, tips/i },
  { id: 'interest', label: 'Taxable interest', re: /Taxable interest/i },
  { id: 'dividends', label: 'Ordinary dividends', re: /Ordinary dividends/i },
  { id: 'ira', label: 'IRA money taken out (taxable part)', re: /IRA distributions/i },
  { id: 'pensions', label: 'Pensions and annuities (taxable part)', re: /Pensions and annuities/i },
  { id: 'ss', label: 'Social Security (taxable part)', re: /Social security benefits/i },
  { id: 'gains', label: 'Capital gain or loss', re: /Capital gain or \(loss\)/i },
  { id: 'total', label: 'Total income', re: /your total income/i },
  { id: 'agi', label: 'Adjusted gross income', re: /your adjusted gross income/i },
  { id: 'deduction', label: 'Standard or itemized deduction', re: /Standard deduction or itemized deductions/i },
  { id: 'taxable', label: 'Taxable income', re: /your taxable income|Taxable income\. Subtract/i },
  { id: 'tax', label: 'Tax', re: /\bTax \(see instructions\)/i },
  { id: 'totalTax', label: 'Total tax', re: /your total tax/i },
  { id: 'withheld', label: 'Tax withheld', re: /Add lines 25a through 25c/i },
  { id: 'refund', label: 'Refund', re: /amount you overpaid/i },
  { id: 'owe', label: 'Amount owed', re: /Amount you owe/i },
];
const AMOUNT = /^\(?-?\$?(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?\.?\)?$/;
// A piece of text as a number, or null. "(1,200)" and "-1,200" are negative; "-0-" is zero.
export function amountOf(s) {
  const t = String(s ?? '').trim(); if (t === '-0-') return 0; if (!AMOUNT.test(t)) return null;
  const v = Number(t.replace(/[()$,]/g, '').replace(/\.$/, '')); return Number.isFinite(v) ? (/^\(/.test(t) ? -Math.abs(v) : v) : null;
}
// Pieces into rows: same height (within tol) is one row, read left to right, each piece split into words.
export function rowsOf(items, tol = 3) {
  const rows = [];
  for (const it of [...items].filter(i => String(i.str ?? '').trim()).sort((a, b) => b.y - a.y || a.x - b.x)) {
    let row = rows.find(r => Math.abs(r.y - it.y) <= tol); if (!row) rows.push(row = { y: it.y, words: [] });
    const parts = String(it.str).trim().split(/\s+/), step = (it.w ?? 0) / parts.length; parts.forEach((p, i) => row.words.push({ str: p, x: it.x + i * step }));
  }
  for (const r of rows) { r.words.sort((a, b) => a.x - b.x); r.text = r.words.map(w => w.str).join(' '); }
  return rows;
}
// The amount on a row: its last word, when that is a number. A bare one or two digit number there is the form's own
// line number (the box at the right edge of an empty line), so it reads as blank; so does anything under $100 without cents.
export function amountOn(row) { const last = row.words.at(-1)?.str ?? ''; if (/^\d{1,2}$/.test(last)) return null; return amountOf(last); }
export function read1040(pages) {
  const rows = pages.flatMap(p => rowsOf(p)), all = rows.map(r => r.text).join('\n'), lines = {};
  for (const L of LINES) { const hit = rows.filter(r => L.re.test(r.text)).map(amountOn).find(v => v != null); if (hit != null) lines[L.id] = hit; }
  const year = Number((/(?:Income Tax Return|Form\s+1040(?:-SR)?)\D{0,40}(20[1-4]\d)/i.exec(all) || /(20[1-4]\d)\D{0,40}Form\s+1040/i.exec(all) || [])[1]) || null;
  const found = Object.keys(lines).length;
  return { is1040: /1040/.test(all) && found >= 3, year, lines, found, of: LINES.length };
}
