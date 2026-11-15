// SPDX-License-Identifier: AGPL-3.0-only
// Reads the other money papers from the text of their PDFs: a W-2, a pay stub, and a state resident return
// (New York, New Jersey or Connecticut). Same input as js/import/tax1040.js: pages of pieces { str, x, y, w }. readPaper works out which paper it is.
// Pure: tested with pieces laid out like each paper.
import { rowsOf, amountOf, amountOn, read1040 } from './tax1040.js';

const CENTS = /^\(?-?\$?(\d{1,3}(,\d{3})+|\d+)\.\d{2}\)?$/; // a W-2 or a stub prints cents, which tells an amount from a box number
const esc = re => re.source;

// ---- W-2. A box's amount is either right after its label on the same row, or just under the label in the same column.
export const W2_BOXES = [
  { id: 'wages', label: 'Box 1: wages', re: /Wages, tips, other comp(ensation)?/i }, { id: 'fedTax', label: 'Box 2: federal tax withheld', re: /Federal income tax withheld/i },
  { id: 'ssWages', label: 'Box 3: Social Security wages', re: /Social security wages/i }, { id: 'ssTax', label: 'Box 4: Social Security tax', re: /Social security tax withheld/i },
  { id: 'medWages', label: 'Box 5: Medicare wages', re: /Medicare wages( and tips)?/i }, { id: 'medTax', label: 'Box 6: Medicare tax', re: /Medicare tax withheld/i },
  { id: 'stateWages', label: 'Box 16: state wages', re: /State wages, tips, etc\.?/i }, { id: 'stateTax', label: 'Box 17: state tax', re: /State income tax/i }, { id: 'localTax', label: 'Box 19: local tax', re: /Local income tax/i },
];
export const W2_CODES = { D: 'k401', E: 'k401', AA: 'roth401', BB: 'roth401', W: 'hsa', DD: 'healthCost' }; // box 12
function near(items, rows, re) {
  const inline = new RegExp(`${esc(re)}[\\s:]*\\$?\\s*((?:\\d{1,3}(?:,\\d{3})+|\\d+)\\.\\d{2})`, 'i');
  for (const r of rows) { const m = inline.exec(r.text); if (m) return amountOf(m.at(-1)); } // the amount is the last group: a label's own pattern may hold groups
  const p = items.find(i => re.test(String(i.str ?? ''))); if (!p) return null;
  const under = rows.flatMap(r => r.words.filter(w => CENTS.test(w.str)).map(w => ({ ...w, y: r.y }))).filter(w => w.y < p.y - 1 && p.y - w.y <= 45 && w.x >= p.x - 15 && w.x <= p.x + Math.max(p.w ?? 0, 150));
  under.sort((a, b) => b.y - a.y || Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
  return under.length ? amountOf(under[0].str) : null;
}
export function readW2(pages) {
  const items = pages[0] || [], rows = rowsOf(items), all = rows.map(r => r.text).join('\n'), lines = {};
  for (const B of W2_BOXES) { const v = near(items, rows, B.re); if (v != null) lines[B.id] = v; }
  for (const m of all.matchAll(/(?:^|\s)(DD|AA|BB|D|E|W)\s+\$?((?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})(?=\s|$)/gm)) { const k = W2_CODES[m[1]]; lines[k] = (lines[k] ?? 0) + amountOf(m[2]); }
  const year = Number((/(?:W-2|Wage and Tax Statement)\D{0,40}(20[1-4]\d)/i.exec(all) || /(20[1-4]\d)\D{0,40}(?:W-2|Wage and Tax Statement)/i.exec(all) || [])[1]) || null;
  return { kind: 'w2', ok: /W-2|Wage and Tax Statement/i.test(all) && lines.wages != null, year, lines, found: Object.keys(lines).length };
}

// ---- A pay stub. No two payroll companies lay one out alike, so each line is found by its words, and the row's
// amounts are read as this pay period then the year so far (when there are two or more and the last is the larger).
export const STUB_LINES = [
  { id: 'gross', label: 'Gross pay', re: /gross (pay|earnings|wages)|total gross|total earnings|^gross\b/i }, { id: 'net', label: 'Net pay', re: /net (pay|check|amount|earnings)|take.?home|direct deposit( total| amount)?|amount deposited/i },
  { id: 'fedTax', label: 'Federal income tax', re: /fed(eral)?\.? ?(income )?(tax|withholding|w\/h|wh)\b|\bFIT\b|\bFITW\b|fed withh?old/i }, { id: 'ssTax', label: 'Social Security', re: /social security|OASDI|FICA.?(SS|OASDI)|\bSS (tax|ee)\b|soc\.? sec/i },
  { id: 'medTax', label: 'Medicare', re: /medicare|FICA.?MED|\bmed(icare)? ee\b/i }, { id: 'stateTax', label: 'State income tax', re: /state (income )?(tax|withholding|w\/h)|\bSIT\b|\b[A-Z]{2} (state )?(income tax|withholding)/i },
  { id: 'k401', label: 'Retirement plan', re: /40[13] ?\(?[kb]\)?|retirement/i, sum: true }, { id: 'health', label: 'Health, dental, vision', re: /medical|health ins|dental|vision/i, sum: true }, { id: 'hsa', label: 'HSA or FSA', re: /\bHSA\b|\bFSA\b/i, sum: true },
];
const pair = row => { const a = row.words.filter(w => CENTS.test(w.str)).map(w => amountOf(w.str)); if (!a.length) return null; if (a.length === 1) return { now: a[0], ytd: null }; const last = a.at(-1), prev = a.at(-2); return last >= prev ? { now: prev, ytd: last } : { now: last, ytd: null }; };
export function readStub(pages) {
  const rows = pages.flatMap(p => rowsOf(p)), all = rows.map(r => r.text).join('\n'), lines = {}, ytd = {};
  for (const L of STUB_LINES) { const hits = rows.filter(r => L.re.test(r.text) && !(L.id === 'medTax' && /medical/i.test(r.text))).map(pair).filter(Boolean); if (!hits.length) continue;
    const use = L.sum ? hits : hits.slice(0, 1); lines[L.id] = use.reduce((t, h) => t + h.now, 0); const y = use.reduce((t, h) => t + (h.ytd ?? 0), 0); if (y > 0) ytd[L.id] = y; }
  return { kind: 'stub', ok: lines.gross != null && lines.net != null && lines.net <= lines.gross, lines, ytd, found: Object.keys(lines).length, looksLike: /pay (period|date|stub)|earnings statement|net pay|pay ?check/i.test(all) };
}

// ---- A state resident return: New York (IT-201), New Jersey (NJ-1040) or Connecticut (CT-1040). Each line is found by
// the words on that state's form, the amount at the right edge of the row. The line ids are the same across states.
export const STATE_LINES = [
  { id: 'agi', label: 'State income' }, { id: 'taxable', label: 'State taxable income' }, { id: 'stateTax', label: 'State income tax' }, { id: 'cityTax', label: 'City resident tax' },
  { id: 'total', label: 'Total state taxes' }, { id: 'withheld', label: 'State tax withheld' }, { id: 'refund', label: 'Refund' }, { id: 'owe', label: 'Amount owed' },
];
export const STATE_FORMS = [
  { state: 'NY', name: 'New York', form: /IT-201/i, lines: { agi: /New York adjusted gross income/i, taxable: /Taxable income \(subtract line|New York taxable income/i, stateTax: /NYS tax on line|New York State tax on line/i, cityTax: /New York City resident tax|NYC resident tax on line/i,
    total: /Total New York State, New York City, Yonkers/i, withheld: /Total New York State tax withheld/i, refund: /Amount of line \d+ (to be|that you want) refunded|Amount overpaid/i, owe: /Amount you owe/i } },
  { state: 'NJ', name: 'New Jersey', form: /NJ-1040/i, lines: { agi: /New Jersey Gross Income/i, taxable: /New Jersey Taxable Income|Taxable Income \(Subtract line/i, stateTax: /Tax on amount on line|Tax \(From Tax Table|Balance of Tax\b/i,
    total: /Total Tax Due|Total Tax and Penalty|Total Tax, Use Tax/i, withheld: /Total New Jersey Income Tax Withheld|New Jersey Income Tax Withheld/i, refund: /Refund amount|Amount of.{0,30}to be refunded/i, owe: /Amount you owe|Balance due|Total amount due/i } },
  { state: 'CT', name: 'Connecticut', form: /CT-1040/i, lines: { agi: /Connecticut adjusted gross income/i, taxable: /Connecticut taxable income/i, stateTax: /Connecticut income tax\b|Income tax from tax (tables|calculation)/i,
    total: /Total (Connecticut )?tax\b(?! withheld)|Balance of Connecticut income tax/i, withheld: /Connecticut (income )?tax withheld|Total Connecticut tax withheld/i, refund: /want refunded|Balance of overpayment|Amount of.{0,30}refunded/i, owe: /Amount you owe|Total amount due|Balance due/i } },
];
export function readState(pages) {
  const rows = pages.flatMap(p => rowsOf(p)), all = rows.map(r => r.text).join('\n'), F = STATE_FORMS.find(f => f.form.test(all)), lines = {};
  if (!F) return { kind: 'state', ok: false, state: null, lines, found: 0 };
  for (const [id, re] of Object.entries(F.lines)) { const hit = rows.filter(r => re.test(r.text)).map(amountOn).find(v => v != null); if (hit != null) lines[id] = hit; }
  const src = F.form.source, year = Number((new RegExp(`${src}\\D{0,60}(20[1-4]\\d)`, 'i').exec(all) || new RegExp(`(20[1-4]\\d)\\D{0,60}${src}`, 'i').exec(all) || [])[1]) || null;
  return { kind: 'state', ok: Object.keys(lines).length >= 2, state: F.state, name: F.name, year, lines, found: Object.keys(lines).length };
}

// Which paper is this? The form's own name decides; a stub has no name, so it is whatever has gross and net pay.
export function readPaper(pages) {
  const all = pages.flatMap(p => p.map(i => String(i.str ?? ''))).join(' ');
  if (/Wage and Tax Statement|\bW-2\b/i.test(all)) { const r = readW2(pages); if (r.ok) return r; }
  if (STATE_FORMS.some(f => f.form.test(all))) { const r = readState(pages); if (r.ok) return r; } // before the federal form: "NJ-1040" and "CT-1040" hold "1040" too
  if (/\b1040\b/.test(all)) { const r = read1040(pages); if (r.found) return { kind: 'return', ok: r.is1040, year: r.year, lines: r.lines, found: r.found }; }
  const s = readStub(pages); if (s.ok) return s;
  return { kind: null, ok: false, lines: {}, found: 0 };
}
