// Overnight J: statement upload, CSV only. Synthetic rows only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { parseCsv, guessMap, toTransactions, dedupe, suggestLine, importTransactions, saveBankMap, bankMapOf, parsePdf, PDF_WHY, isoDate, money } from '../js/import/csv.js';
import { monthView } from '../js/month.js';
import { pictureOf } from '../js/math/picture.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const demoStore = () => new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });
const CSV = 'Date,Description,Amount\r\n11/02/2026,"TRADER JOE\'S, SEATTLE",-84.20\r\n11/03/2026,PAYROLL ACME,2100.00\r\n11/04/2026,"Rent ""Nov""",-1200\r\n';
const CSV2 = 'Posted Date,Details,Debit,Credit\n2026-11-02,TRADER JOE\'S SEATTLE,84.20,\n2026-11-05,Deposit,,50.00\n';

test('parse: quotes, escaped quotes, commas inside quotes, CRLF; dates and money in bank shapes', () => {
  const rows = parseCsv(CSV);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[1], ['11/02/2026', "TRADER JOE'S, SEATTLE", '-84.20']);
  assert.equal(rows[3][1], 'Rent "Nov"');
  assert.equal(isoDate('11/02/2026'), '2026-11-02'); assert.equal(isoDate('2026-11-2'), '2026-11-02');
  assert.equal(money('($1,200.50)'), -1200.5); assert.equal(money('2,100.00'), 2100);
});

test('the map is guessed from the headers and kept per bank; debit and credit columns make one signed amount', () => {
  const m1 = guessMap(parseCsv(CSV)[0]);
  assert.deepEqual(m1, { date: 0, description: 1, amount: 2, debit: null, credit: null });
  const m2 = guessMap(parseCsv(CSV2)[0]);
  assert.deepEqual(m2, { date: 0, description: 1, amount: null, debit: 2, credit: 3 });
  const tx = toTransactions(parseCsv(CSV2), m2, { bank: 'Big Bank' });
  assert.deepEqual(tx.map(t => t.amount), [-84.2, 50]);
  const d = demoStore();
  saveBankMap(d, 'Big Bank', m2);
  assert.deepEqual(bankMapOf(d.doc, 'Big Bank'), { ...m2, hasHeader: true });
});

test('dedupe leaves out what was imported before; rules suggest the line; the import lands as actuals and the line counts as Actual', () => {
  const d = demoStore();
  const lines = d.find(r => r.kind === 'bill');
  const groceries = lines.find(l => /grocer/i.test(`${l.name} ${l.values.category}`)) ?? lines[0];
  const tx = dedupe(toTransactions(parseCsv(CSV), guessMap(parseCsv(CSV)[0]), { bank: 'Big Bank' }));
  assert.equal(tx.length, 3);
  assert.ok(tx.every(t => !t.duplicate));
  const list = tx.map(t => ({ ...t, ...suggestLine(t.description, { rules: [{ match: 'trader joe', lineId: groceries.id }] }), skip: false }));
  assert.equal(list[0].lineId, groceries.id);
  assert.equal(list[1].lineId, null, 'a paycheck has no line');
  const before = monthView(d.doc, ref, '2026-11', { now }).rows.find(r => r.line.id === groceries.id)?.actual ?? 0;
  const r = importTransactions(d, list, { bank: 'Big Bank' });
  assert.equal(r.imported, 3);
  assert.equal(d.doc.spending.transactions.length, 3);
  assert.ok(d.doc.spending.transactions.every(t => t.level === 'Actual'));
  const after = monthView(d.doc, ref, '2026-11', { now }).rows.find(r => r.line.id === groceries.id).actual;
  assert.ok(Math.abs(after - (before + 84.2)) < 0.01, `actual ${before} + 84.20 = ${after}`);
  assert.equal(d.doc.spending.months['2026-11'].lines[groceries.id].actualFrom, 'csv');
  assert.ok(d.doc.settings.csvRules.some(x => x.lineId === groceries.id), 'a rule learned');
  const item = pictureOf(d.doc, ref, { now }).items.find(i => i.lines?.some(l => l.id === groceries.id) || i.recId === groceries.id);
  assert.ok(item && item.level >= 75, `the line reads Estimate or Actual now: ${item?.level}`);
  // The same file again: every row is a duplicate.
  const again = dedupe(toTransactions(parseCsv(CSV), guessMap(parseCsv(CSV)[0]), { bank: 'Big Bank' }), d.doc.spending.transactions);
  assert.ok(again.every(t => t.duplicate));
  assert.equal(importTransactions(d, again.map(t => ({ ...t, skip: t.duplicate })), { bank: 'Big Bank' }).imported, 0);
  d.undo();
  assert.equal((d.doc.spending.transactions || []).length, 0, 'undoable');
  assert.throws(parsePdf, new RegExp(PDF_WHY.slice(0, 14)));
});
