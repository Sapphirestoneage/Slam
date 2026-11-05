// SPDX-License-Identifier: AGPL-3.0-only
// Statement upload, CSV only (overnight J). Pure: parse a bank's CSV, guess which column is which, keep the map per
// bank, turn rows into transactions, leave out the ones already imported, suggest a Budget line from saved rules,
// and import: each transaction is kept (doc.spending.transactions) and its amount lands on its line's month as an
// actual, so the line counts as Actual. A PDF statement is a stub (parsePdf) until that phase.
import { ymOf } from '../month.js';

// RFC-ish CSV: quotes, escaped quotes, commas and newlines inside quotes, CRLF.
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  const s = String(text ?? '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}
export const COLUMN_ROLES = ['date', 'description', 'amount', 'debit', 'credit'];
// A guess at the map from the header names (the coach confirms it once per bank).
export function guessMap(headers) {
  const find = (...words) => headers.findIndex(h => words.some(w => h.toLowerCase().includes(w)));
  const map = { date: find('date', 'posted'), description: find('description', 'memo', 'payee', 'details', 'name'), amount: find('amount'), debit: find('debit', 'withdraw', 'money out'), credit: find('credit', 'deposit', 'money in') };
  if (map.amount >= 0 && (map.debit === map.amount || map.credit === map.amount)) { map.debit = -1; map.credit = -1; }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v >= 0 ? v : null]));
}
export const money = s => { const t = String(s ?? '').replace(/[$,\s]/g, ''); if (!t) return null; const neg = /^\(.*\)$/.test(t) || t.startsWith('-'); const n = Number(t.replace(/[()\-+]/g, '')); return Number.isFinite(n) ? (neg ? -n : n) : null; };
export function isoDate(s) {
  const t = String(s ?? '').trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; }
  const d = new Date(t); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
// Rows to transactions. amount: money out is negative, money in positive (a debit column makes it negative).
export function toTransactions(rows, map, { hasHeader = true, bank = null } = {}) {
  const body = hasHeader ? rows.slice(1) : rows;
  return body.map(r => {
    const date = map.date != null ? isoDate(r[map.date]) : null;
    const description = map.description != null ? String(r[map.description] ?? '').trim() : '';
    let amount = map.amount != null ? money(r[map.amount]) : null;
    if (amount == null && (map.debit != null || map.credit != null)) { const d = map.debit != null ? money(r[map.debit]) : null, c = map.credit != null ? money(r[map.credit]) : null; amount = d != null && d !== 0 ? -Math.abs(d) : c != null ? Math.abs(c) : null; }
    return { date, description, amount, bank, hash: hashOf({ date, description, amount }) };
  }).filter(t => t.date && t.amount != null);
}
// Answer 168: money in is matched to an Income row when the amount is within 5% of that row's take-home a paycheck and
// the date sits near the pay schedule (within 4 days of a payday worked forward or back from Next payday; any date
// when the row has none). incomes: [{ id, name, perPay, payFrequency, nextPayday }]. The closest amount wins.
const PERIOD_DAYS = { week: 7, '2 weeks': 14, 'twice a month': 15.2, month: 30.4 };
export const INCOME_TOLERANCE = 0.05;
export function nearPayday(date, { nextPayday, payFrequency }, { days = 4 } = {}) {
  if (!nextPayday || !PERIOD_DAYS[payFrequency]) return true;
  const diff = (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${String(nextPayday).slice(0, 10)}T12:00:00Z`)) / 86400000;
  const period = PERIOD_DAYS[payFrequency];
  const off = Math.abs(diff - Math.round(diff / period) * period);
  return off <= days;
}
export function matchIncome(t, incomes = []) {
  if (!(t.amount > 0)) return null;
  const hits = incomes.filter(i => i.perPay > 0 && Math.abs(t.amount - i.perPay) <= INCOME_TOLERANCE * i.perPay && nearPayday(t.date, i)).sort((a, b) => Math.abs(t.amount - a.perPay) - Math.abs(t.amount - b.perPay));
  return hits[0] ? { incomeId: hits[0].id, incomeName: hits[0].name } : null;
}
export const hashOf = t => `${t.date}|${(t.amount ?? 0).toFixed(2)}|${String(t.description ?? '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
// Dedupe against what the file already holds (and inside the upload).
export function dedupe(incoming, existing = []) {
  const seen = new Set(existing.map(t => t.hash));
  return incoming.map(t => { const dup = seen.has(t.hash); seen.add(t.hash); return { ...t, duplicate: dup }; });
}
// A Budget line from the saved rules (a word in the description, case-insensitive; the longest match wins), else from an earlier transaction with the same description.
export function suggestLine(description, { rules = [], transactions = [] } = {}) {
  const d = String(description ?? '').toLowerCase();
  const hits = rules.filter(r => r.match && d.includes(String(r.match).toLowerCase())).sort((a, b) => String(b.match).length - String(a.match).length);
  if (hits.length) return { lineId: hits[0].lineId, why: `rule: ${hits[0].match}` };
  const prior = [...transactions].reverse().find(t => t.lineId && String(t.description ?? '').toLowerCase() === d);
  return prior ? { lineId: prior.lineId, why: 'the same description before' } : { lineId: null, why: null };
}
// Import: keep each transaction with its line, add money out to the line's month actual (so the line is Actual),
// and learn a rule from each assignment (the description's first word or two). Skipped rows are kept with no line.
export function importTransactions(store, list, { bank = null, now = store.now() } = {}) {
  const kept = list.filter(t => !t.duplicate && !t.skip);
  if (!kept.length) return { imported: 0, skipped: list.length }; // nothing to keep: no change, nothing to undo
  store.transaction(`Import ${kept.length} transactions${bank ? ` from ${bank}` : ''}`, () => {
    const existing = store.doc.spending?.transactions || [];
    const rules = [...(store.doc.settings?.csvRules || [])];
    const months = {};
    for (const t of kept) {
      const ym = t.date.slice(0, 7);
      if (t.lineId && t.amount < 0) { months[ym] ??= {}; months[ym][t.lineId] = (months[ym][t.lineId] ?? 0) + Math.abs(t.amount); }
      if (t.lineId && t.description) { const key = t.description.split(/\s+/).slice(0, 2).join(' '); if (!rules.some(r => r.match.toLowerCase() === key.toLowerCase())) rules.push({ match: key, lineId: t.lineId }); }
    }
    store.setIn('spending', ['transactions'], [...existing, ...kept.map(t => ({ id: store.makeId(), date: t.date, description: t.description, amount: t.amount, bank, hash: t.hash, lineId: t.lineId ?? null, incomeId: t.incomeId ?? null, trip: t.trip ?? null, importedAt: now, level: 'Actual' }))], 'Transactions');
    // Answer 168: a matched paycheck lands on its Income row as the last actual pay, and the row counts as Actual (locked).
    const latest = {};
    for (const t of kept) if (t.incomeId && t.amount > 0 && (!latest[t.incomeId] || t.date > latest[t.incomeId].date)) latest[t.incomeId] = t;
    for (const [id, t] of Object.entries(latest)) if (store.get(id)) store.update(id, { actualPay: t.amount, actualPayDate: t.date, locked: true });
    for (const [ym, lines] of Object.entries(months)) for (const [lineId, add] of Object.entries(lines)) {
      const cur = store.getIn('spending', ['months', ym, 'lines', lineId, 'actual']) ?? 0;
      store.setIn('spending', ['months', ym, 'lines', lineId, 'actual'], Math.round((cur + add) * 100) / 100, 'Actual from a statement');
      store.setIn('spending', ['months', ym, 'lines', lineId, 'actualFrom'], 'csv');
    }
    store.setDoc('settings', { csvRules: rules });
  });
  return { imported: kept.length, skipped: list.length - kept.length };
}
export function saveBankMap(store, bank, map, { hasHeader = true } = {}) { store.setDoc('settings', { csvMaps: { ...(store.doc.settings?.csvMaps || {}), [bank]: { ...map, hasHeader } } }); }
export const bankMapOf = (doc, bank) => doc.settings?.csvMaps?.[bank] ?? null;
// PDF statements: not built. The stub says so in one place; the screen shows the button disabled with this reason.
export const PDF_WHY = 'PDF statements come in a later phase; export a CSV from the bank for now.';
export function parsePdf() { throw new Error(PDF_WHY); }
