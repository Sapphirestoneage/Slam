// Batch 22: a month of transactions from Rocket Money, Monarch or a bank (js/import/apps.js). Made-up CSVs only
// (fixtures/import/*.csv): formats by header, matching in order (rule, the app's category, merchant words), paychecks
// and transfers kept out of spending, duplicates, the rule save, and Maya's November brought in end to end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, importFile } from '../js/records.js';
import { readFile, detectFormat, matchAll, matchOne, reviewOf, acceptAllMatched, pickFor, saveImport, linesOf, incomesOf, pickMonth, monthsIn, merchantKey, formatWords, lastImport } from '../js/import/apps.js';
import { parseCsv } from '../js/import/csv.js';
import { monthView, byCategory, instances } from '../js/month.js';
import { statements } from '../js/math/statements.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const csv = name => readFileSync(new URL(`../fixtures/import/${name}.csv`, import.meta.url), 'utf8');
const now = new Date('2026-11-28T12:00:00Z');
const maya = () => new Store(importFile(readFileSync(new URL('../fixtures/personas/maya.json', import.meta.url), 'utf8')), { now: () => now.toISOString() });
const lineNamed = (s, name) => s.doc.records.find(r => r.kind === 'bill' && r.name === name);
const matched = (s, name) => { const r = readFile(csv(name), ref, { doc: s.doc }); return { r, list: matchAll(r.transactions.filter(t => t.date.startsWith('2026-11')), { doc: s.doc, ref, fmt: r.fmt, now }) }; };
const by = (list, merchant) => list.filter(t => t.merchant === merchant);

test('formats: Rocket Money, Monarch and a bank CSV are told apart by the header row; an unknown header asks for columns', () => {
  const s = maya();
  const rm = readFile(csv('rocket-money-nov'), ref, { doc: s.doc });
  assert.equal(rm.fmt.id, 'rocket'); assert.equal(rm.transactions.length, 23);
  assert.match(formatWords(rm.fmt, rm.transactions.length), /^Found a Rocket Money export: 23 transactions\.$/);
  assert.equal(readFile(csv('monarch-nov'), ref).fmt.id, 'monarch');
  const bank = readFile(csv('bank-nov'), ref);
  assert.equal(bank.fmt.id, 'bank'); assert.deepEqual(bank.transactions.map(t => t.amount), [-1750, -48.1, 2400, -6.25, -60, 2400]);
  const unknown = readFile(csv('unknown-nov'), ref);
  assert.equal(unknown.fmt.id, null); assert.equal(unknown.transactions.length, 0);
  // Headers in any order and case still count; every format in Reference data lists its columns and its sources.
  assert.equal(detectFormat(['amount', 'ORIGINAL STATEMENT', 'Account', 'Merchant', 'Category', 'Date', 'Notes'], ref).id, 'monarch');
  for (const f of ref.importFormats.formats) assert.ok(f.sources.length && f.roles.date, `${f.id}: columns and sources`);
});

test('signs: Rocket Money spending is positive in the file and money out in SLAM; Monarch keeps its sign; dates and months', () => {
  const rm = readFile(csv('rocket-money-nov'), ref).transactions;
  const rent = rm.find(t => /Rent/.test(t.merchant));
  assert.equal(rent.amount, -1750); assert.equal(rent.date, '2026-11-01');
  assert.equal(rm.find(t => /Payroll/.test(t.merchant)).amount, 2400);
  // A Rocket Money file that already writes spending as minus (its Income rows positive) is left as it is.
  const flipped = csv('rocket-money-nov').split('\n').map((l, i) => (i ? l.replace(/,(-?)(\d+\.\d\d),/, (m, neg, n) => `,${neg ? '' : '-'}${n},`) : l)).join('\n');
  assert.equal(readFile(flipped, ref).transactions.find(t => /Rent/.test(t.merchant)).amount, -1750);
  assert.equal(readFile(csv('monarch-nov'), ref).transactions.find(t => t.merchant === 'Uniqlo' && t.amount > 0).amount, 25, 'a return stays money in');
  assert.deepEqual(monthsIn(rm), ['2026-10', '2026-11']);
  assert.equal(pickMonth(rm), '2026-11'); assert.equal(pickMonth(rm, '2026-10'), '2026-10'); assert.equal(pickMonth(rm, '2026-09'), '2026-11');
});

test('matching: the app\'s category, refined by merchant words in the same group; merchant words alone are a guess; nothing fits is Not matched', () => {
  const s = maya();
  const { list } = matched(s, 'rocket-money-nov');
  const tj = by(list, "Trader Joe's")[0];
  assert.equal(tj.lineId, lineNamed(s, 'Groceries').id); assert.equal(tj.sure, 'Matched');
  const rent = by(list, 'Parkside Rent')[0]; // Bills & Utilities, but RENT is the Rent line (same group)
  assert.equal(rent.lineId, lineNamed(s, 'Rent').id); assert.equal(rent.sure, 'Guessed');
  assert.equal(by(list, 'Starbucks')[0].lineId, lineNamed(s, 'Coffee and snacks').id);
  assert.equal(by(list, 'Blue Door Studio')[0].sure, 'Not matched');
  assert.equal(by(list, 'Amazon')[0].kind, 'ignore', 'Ignored From in Rocket Money stays out');
  const { list: bank } = matched(s, 'bank-nov');
  assert.equal(bank.find(t => /TRADER/.test(t.merchant)).sure, 'Guessed');
  assert.equal(bank.find(t => /TRADER/.test(t.merchant)).lineId, lineNamed(s, 'Groceries').id);
  assert.equal(bank.find(t => /ATM/.test(t.merchant)).sure, 'Not matched');
  assert.equal(merchantKey('STARBUCKS #1234 '), 'starbucks');
});

test('a rule the coach saved comes first, before the app\'s category; a client\'s map edit beats Reference data', () => {
  const s = maya();
  const dining = lineNamed(s, 'Dining out and takeout').id;
  s.setDoc('settings', { merchantRules: { [merchantKey('Starbucks')]: dining } });
  const { list } = matched(s, 'rocket-money-nov');
  assert.equal(by(list, 'Starbucks')[0].lineId, dining); assert.equal(by(list, 'Starbucks')[0].sure, 'Matched');
  s.setDoc('settings', { importCategoryMap: { rocket: { Shopping: 'Clothes', Uncategorized: '@ignore' } } });
  const again = matched(s, 'rocket-money-nov').list;
  assert.equal(by(again, 'Blue Door Studio')[0].kind, 'ignore');
});

test('paychecks and transfers stay out of spending: by category, by amount near payday, and the same amount across two accounts', () => {
  const s = maya();
  const { list } = matched(s, 'rocket-money-nov');
  const pay = list.filter(t => t.kind === 'income');
  assert.equal(pay.length, 2); assert.ok(pay.every(t => t.incomeId === 'maya-001' && t.sure === 'Matched'));
  assert.equal(list.filter(t => t.kind === 'transfer').length, 2);
  const card = by(list, 'Card Payment')[0];
  assert.equal(card.kind, 'debt'); assert.equal(card.debtId, 'maya-006');
  // A bank file has no categories: the paycheck is matched by amount (answer 168), a transfer pair by its two accounts.
  const pair = 'Date,Description,Amount,Account\n2026-11-10,MOVE MONEY,-300,Checking\n2026-11-11,MOVE MONEY IN,300,Savings\n2026-11-12,LUNCH SPOT,-12,Checking\n';
  const r = readFile(pair, ref);
  r.fmt.map.account = 3;
  const tx = matchAll(r.fmt.id === 'bank' ? r.transactions.map((t, i) => ({ ...t, account: ['Checking', 'Savings', 'Checking'][i] })) : [], { doc: s.doc, ref, fmt: r.fmt, now });
  assert.deepEqual(tx.map(t => t.kind), ['transfer', 'transfer', 'spend']);
  const rv = reviewOf(list, { ref, lines: linesOf(s.doc, ref) });
  assert.equal(rv.groups[0].id, 'unmatched', 'the unmatched come first');
  assert.ok(!rv.groups.filter(g => g.key).some(g => g.rows.some(t => t.kind !== 'spend')), 'spending groups hold spending only');
  assert.ok(Math.abs(rv.spending - 2186.4) < 0.01, `spending ${rv.spending}`);
  assert.equal(incomesOf(s.doc, ref, now)[0].perPay, 2400);
});

test('Maya\'s November from Rocket Money: review, accept, pick, a rule, save as actuals; Month end by category; calendar Paid; the same file again adds nothing; undo', () => {
  const s = maya();
  const { r, list } = matched(s, 'rocket-money-nov');
  const blue = by(list, 'Blue Door Studio')[0];
  const hobbies = lineNamed(s, 'Hobbies').id;
  let rows = acceptAllMatched(list).map(t => (t === blue ? t : t));
  rows = rows.map(t => (t.hash === blue.hash ? { ...pickFor(t, hobbies, linesOf(s.doc, ref)), accepted: true } : t.sure === 'Guessed' ? { ...t, accepted: true } : t));
  const res = saveImport(s, ref, rows, { ym: '2026-11', fmt: r.fmt, fileName: 'rocket-money-nov.csv', rules: { [merchantKey('Blue Door Studio')]: hobbies }, now });
  assert.equal(res.saved, 21, 'every row of November but the unmatched Venmo');
  const doc = s.doc;
  assert.equal(doc.spending.transactions.length, 21);
  assert.ok(doc.spending.transactions.every(t => t.level === 'Actual' && t.date.startsWith('2026-11')));
  const v = monthView(doc, ref, '2026-11', { now });
  const actual = name => v.rows.find(x => x.line.name === name).actual;
  assert.equal(actual('Rent'), 1750);
  assert.equal(actual('Groceries'), Math.round((64.18 + 41.37 + 58.92) * 100) / 100);
  assert.equal(actual('Coffee and snacks'), 11.5, 'two coffees on one day are two rows');
  assert.equal(actual('Hobbies'), 48);
  assert.equal(doc.spending.months['2026-11'].lines[lineNamed(s, 'Rent').id].actualFrom, 'csv');
  assert.equal(s.get('maya-001').values.actualPay ?? s.get('maya-001').actualPay, 2400);
  // Month end: plan vs actual per Budget category (Accommodation holds Rent's plan of $1,750).
  const cats = byCategory(v);
  const acc = cats.find(c => c.key === 'Accommodation');
  assert.equal(acc.plan, 1750); assert.equal(acc.actual, 1838.4); assert.equal(acc.diff, 88.4);
  assert.ok(cats.find(c => c.key === 'Food').actual > 0);
  // The calendar: Rent's day and both paychecks read Paid; the card payment too.
  const marks = doc.spending.calendar.marks;
  const rentKey = instances(doc, ref, '2026-11', { now }).find(i => i.lineId === lineNamed(s, 'Rent').id).key;
  assert.equal(marks[rentKey].status, 'Paid'); assert.equal(marks[rentKey].paid, -1750);
  assert.equal(Object.values(marks).filter(m => m.status === 'Paid' && m.paid === 2400).length, 2);
  assert.ok(Object.entries(marks).some(([k, m]) => k.startsWith('maya-006@') && m.paid === -200));
  // The rule is kept; the statements read the month's actuals.
  assert.equal(doc.settings.merchantRules[merchantKey('Blue Door Studio')], hobbies);
  const st = statements(doc, ref, { kind: 'month', ym: '2026-11' }, { now });
  assert.ok(st.income, 'the statements build from the imported month');
  assert.equal(lastImport(doc).count, 21);
  // The same file again: every row already imported, nothing to save.
  const again = matched(s, 'rocket-money-nov').list;
  assert.equal(again.filter(t => !t.duplicate).length, 1, 'only the Venmo row left, never accepted');
  assert.equal(saveImport(s, ref, acceptAllMatched(again), { ym: '2026-11', fmt: r.fmt, now }).saved, 0);
  assert.equal(s.doc.spending.transactions.length, 21);
  // Next month the rule matches on its own.
  assert.equal(matchOne({ date: '2026-12-02', amount: -30, merchant: 'Blue Door Studio', description: '' }, { doc: s.doc, ref, lines: linesOf(s.doc, ref), incomes: [], debts: [], fmt: r.fmt }).sure, 'Matched');
  // Undo takes the whole import back.
  s.undo();
  assert.equal((s.doc.spending.transactions || []).length, 0);
  assert.equal(monthView(s.doc, ref, '2026-11', { now }).rows.find(x => x.line.name === 'Rent').actual, null);
  assert.equal(s.doc.settings.merchantRules?.[merchantKey('Blue Door Studio')], undefined);
});

test('Maya\'s November from Monarch: saved as actuals, a return takes off its line, a new category makes its line, again adds nothing', () => {
  const s = maya();
  const { r, list } = matched(s, 'monarch-nov');
  const res = saveImport(s, ref, acceptAllMatched(list), { ym: '2026-11', fmt: r.fmt, now });
  assert.equal(res.saved, 16, 'all but the unmatched Corner Shop');
  const v = monthView(s.doc, ref, '2026-11', { now });
  assert.equal(v.rows.find(x => x.line.name === 'Clothes and shoes').actual, 24.9, 'a $25 return nets against $49.90');
  assert.equal(v.rows.find(x => x.line.name === 'Internet').actual, 65);
  assert.equal(byCategory(v).find(c => c.key === 'Accommodation').actual, 1750 + 92.15 + 65);
  assert.equal(matched(s, 'monarch-nov').list.filter(t => !t.duplicate).length, 1);
  // A category with no line yet: the save makes the line.
  const bare = maya();
  for (const l of bare.find(x => x.kind === 'bill' && x.values.category === 'Groceries')) bare.remove(l.id);
  const m2 = matched(bare, 'monarch-nov');
  const tj = m2.list.find(t => t.merchant === "Trader Joe's");
  assert.equal(tj.newCategory, 'Groceries'); assert.equal(tj.sure, 'Guessed');
  const r2 = saveImport(bare, ref, m2.list.map(t => ({ ...t, accepted: t === tj })), { ym: '2026-11', fmt: m2.r.fmt, now });
  assert.equal(r2.newLines, 1);
  assert.equal(monthView(bare.doc, ref, '2026-11', { now }).rows.find(x => x.line.values.category === 'Groceries').actual, 71.04);
});

test('rows of another month are not saved into this one; a bank CSV with debit and credit columns imports', () => {
  const s = maya();
  const r = readFile(csv('rocket-money-nov'), ref, { doc: s.doc });
  const oct = matchAll(r.transactions, { doc: s.doc, ref, fmt: r.fmt, now }).map(t => ({ ...t, accepted: true }));
  assert.equal(saveImport(s, ref, oct, { ym: '2026-11', fmt: r.fmt, now }).saved, 20, 'the 22 November rows less the two with no line');
  assert.ok(!s.doc.spending.transactions.some(t => t.date.startsWith('2026-10')));
  const b = maya();
  const bank = matched(b, 'bank-nov');
  assert.equal(saveImport(b, ref, bank.list.map(t => ({ ...t, accepted: t.sure !== 'Not matched' })), { ym: '2026-11', fmt: bank.r.fmt, bankMap: { key: 'x', map: { date: 0 } }, now }).saved, 5);
  assert.equal(monthView(b.doc, ref, '2026-11', { now }).rows.find(x => x.line.name === 'Rent').actual, 1750);
  assert.equal(parseCsv(csv('bank-nov')).length, 7);
});
