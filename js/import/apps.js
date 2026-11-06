// SPDX-License-Identifier: AGPL-3.0-only
// Batch 22: a month of transactions from Rocket Money, Monarch or a bank, dropped in by the coach at month end. SLAM
// never syncs: the client keeps tracking in their app, and the export comes here. Pure: no DOM.
//
// The formats (data/reference-2026.json importFormats, with source links), recognized by the header row:
//   Rocket Money (Transactions, Export; the file comes by email): Date, Original Date, Account Type, Account Name,
//     Account Number, Institution Name, Name, Custom Name, Amount, Description, Category, Note, Ignored From,
//     Tax Deductible, Transaction Tags. Spending is a positive amount (checked against the file's Income rows).
//     https://help.rocketmoney.com/en/articles/10296106-exporting-transactions
//     https://github.com/weinfurtmatthew-rgb/Finance-tracker/pull/19 (Account Name, Account Number, Institution Name,
//     Name, Custom Name; "writes spending as positive amounts")
//   Monarch (Settings, Data, Download transactions): Date, Merchant, Category, Account, Original Statement, Notes,
//     Amount, Tags, then Owner on household plans. Money out negative; dates YYYY-MM-DD.
//     https://help.monarch.com/hc/en-us/articles/4409682789908
//     https://beancount.io/tools/csv-to-beancount/monarch
//     https://waypointbudget.com/blog/move-from-monarch-money-to-waypoint-budget
//   A bank CSV: date, description, and a signed amount or debit and credit columns (guessMap in csv.js).
//
// Matching, in order: 1 an exact rule the coach saved (merchant to line, settings.merchantRules); 2 the app's own
// category through the map (the client's own edits, settings.importCategoryMap, then importCategories in Reference
// data), with merchant words refining it inside the same spending group; 3 merchant words (merchantWords, and each
// Budget line's own name). Paychecks (answer 168, matchIncome) and transfers between the client's own accounts (the
// app's transfer categories, transfer words, or the same amount out of one account and into another within 3 days)
// stay out of spending. Each row says how sure: Matched, Guessed or Not matched.
import { parseCsv, guessMap, money, isoDate, hashOf, matchIncome } from './csv.js';
import { gatesOf, visible } from '../gates.js';
import { inputsOf } from '../math/metrics.js';
import { categoryKeyOf, categoryName } from '../math/spending.js';
import { instances, mark, monthName, ymOf } from '../month.js';

export const SURE = ['Matched', 'Guessed', 'Not matched'];
export const KINDS = { spend: 'Spending', income: 'Paycheck or money in', transfer: 'Transfer between your accounts', debt: 'Debt or card payment', ignore: 'Left out' };
const SPECIAL = { '@income': 'income', '@transfer': 'transfer', '@debt': 'debt', '@ignore': 'ignore' };
const low = s => String(s ?? '').trim().toLowerCase();
// Merchant names compare without case, punctuation or store numbers ("STARBUCKS #1234" is "starbucks").
export const merchantKey = s => low(s).replace(/[’`]/g, "'").replace(/#\s*\d+/g, ' ').replace(/[^a-z0-9&' ]+/g, ' ').replace(/\b\d{3,}\b/g, ' ').replace(/\s+/g, ' ').trim();
const textOf = t => merchantKey(`${t.merchant ?? ''} ${t.description ?? ''}`);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, w) => new RegExp(`(?:^|[^a-z0-9])${esc(merchantKey(w))}(?:'?s)?(?=$|[^a-z0-9])`).test(text);

// ---------- 1. The format, from the header row ----------
export function detectFormat(headers, ref) {
  const hs = headers.map(low);
  const at = name => hs.indexOf(low(name));
  for (const f of ref.importFormats.formats.filter(x => x.detect.length)) {
    if (!f.detect.every(d => at(d) >= 0)) continue;
    const col = r => { const list = [r].flat().filter(Boolean); return list.map(at).filter(i => i >= 0); };
    const map = Object.fromEntries(Object.entries(f.roles).map(([k, v]) => [k, k === 'merchant' ? col(v) : (col(v)[0] ?? null)]));
    return { id: f.id, name: f.name, map, sign: f.sign };
  }
  const g = guessMap(headers);
  if (g.date != null && (g.amount != null || g.debit != null || g.credit != null)) return { id: 'bank', name: 'Bank CSV', map: { ...g, merchant: g.description != null ? [g.description] : [] }, sign: 'out-negative' };
  return { id: null, name: null, map: g, sign: 'out-negative' };
}
export const formatWords = (fmt, n, ym = null) => (fmt?.id ? `Found a ${fmt.name} export: ${n} ${n === 1 ? 'transaction' : 'transactions'}${ym ? `, ${monthName(ym)}` : ''}.` : 'This CSV has no header SLAM knows. Pick which column is which once; it is kept for this kind of file.');
export const headerKey = headers => headers.map(low).join('|');

// ---------- 2. Rows to transactions ----------
// Money out is negative. The nth copy of the same date, amount and text in one file gets #n, so two $5 coffees on one
// day are two rows, and the same file brought in again matches row for row (and adds nothing).
export function readTransactions(rows, fmt, ref, { hasHeader = true } = {}) {
  const m = fmt.map;
  const body = hasHeader ? rows.slice(1) : rows;
  const cell = (r, i) => (i == null || i < 0 ? '' : String(r[i] ?? '').trim());
  let list = body.map((r, row) => {
    const date = m.date != null ? isoDate(cell(r, m.date)) : null;
    let amount = m.amount != null ? money(cell(r, m.amount)) : null;
    if (amount == null && (m.debit != null || m.credit != null)) { const d = money(cell(r, m.debit)), c = money(cell(r, m.credit)); amount = d != null && d !== 0 ? -Math.abs(d) : c != null ? Math.abs(c) : null; }
    const merchant = (m.merchant || []).map(i => cell(r, i)).find(Boolean) || cell(r, m.description);
    return { row, date, amount, merchant, description: cell(r, m.description), account: cell(r, m.account) || null, appCategory: cell(r, m.category) || null, ignored: !!cell(r, m.ignored) };
  }).filter(t => t.date && t.amount != null && t.amount !== 0);
  if (fmt.sign === 'out-positive') {
    // Rocket Money writes spending as positive. The Income rows say which way this file runs; with none, trust the format.
    const cats = ref.importCategories?.[fmt.id] || {};
    const inc = list.filter(t => cats[t.appCategory] === '@income');
    const flip = !inc.length || inc.filter(t => t.amount < 0).length >= inc.length / 2;
    if (flip) list = list.map(t => ({ ...t, amount: -t.amount }));
  }
  const seen = new Map();
  return list.map(t => {
    const base = hashOf({ date: t.date, amount: t.amount, description: [t.account, t.merchant, t.description].filter(Boolean).join(' ') });
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    return { ...t, amount: Math.round(t.amount * 100) / 100, hash: n === 1 ? base : `${base}#${n}` };
  });
}
export function readFile(text, ref, { doc = null } = {}) {
  const rows = parseCsv(text);
  if (!rows.length) return { problem: 'That file is empty.' };
  const headers = rows[0];
  let fmt = detectFormat(headers, ref);
  const saved = doc?.settings?.csvMaps?.[headerKey(headers)];
  if (!fmt.id && saved) fmt = { id: 'bank', name: 'Bank CSV', map: { ...saved, merchant: saved.description != null ? [saved.description] : [] }, sign: 'out-negative' };
  if (!fmt.id) return { fmt, headers, rows, transactions: [] };
  return { fmt, headers, rows, transactions: readTransactions(rows, fmt, ref) };
}
export const monthsIn = list => [...new Set(list.map(t => t.date.slice(0, 7)))].sort();
// The month to review: the one asked for when the file has it, else the month with the most rows (the latest on a tie).
export function pickMonth(list, want = null) {
  const counts = {};
  for (const t of list) counts[t.date.slice(0, 7)] = (counts[t.date.slice(0, 7)] ?? 0) + 1;
  if (want && counts[want]) return want;
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] ?? null;
}

// ---------- 3. Matching ----------
export function linesOf(doc, ref) {
  return visible(doc.records, gatesOf(doc.profile, doc.client), ref).filter(r => r.kind === 'bill' && r.status !== 'Not for me');
}
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
// Each Income row's take-home a paycheck and its schedule (answer 168).
export function incomesOf(doc, ref, now = new Date()) {
  return inputsOf(doc, ref, now).income.map(i => { const f = i.r.values?.payFrequency || 'month'; return { id: i.r.id, name: i.r.name || i.r.type, perPay: i.takeHome?.value != null ? i.takeHome.value * 12 / (PAYS[f] ?? 12) : null, payFrequency: f, nextPayday: i.r.values?.nextPayday ?? null }; });
}
const groupOfCategory = (ref, cat) => { const d = ref.categoryDefaults.find(c => low(c.category) === low(cat)); return d ? categoryKeyOf({ draftt: d.draftt }) : 'Other'; };
// The spending group a row lands in (the Budget's category rows: Accommodation, Food, ...).
export const groupOf = (ref, t, lines) => { const l = t.lineId ? lines.find(x => x.id === t.lineId) : null; return l ? categoryKeyOf(l) : t.newCategory ? groupOfCategory(ref, t.newCategory) : null; };
// A line category to one of this client's lines: the one line with it (sure), one of several (a line whose name is in the
// text, else one with an amount), a line whose category starts with the same word, else a new line on save.
export function lineFor(lines, cat, text = '') {
  const same = lines.filter(l => low(l.values?.category) === low(cat));
  if (same.length === 1) return { lineId: same[0].id, sure: true };
  if (same.length) { const byName = same.find(l => l.name && hasWord(text, l.name)); return { lineId: (byName ?? same.find(l => l.amount != null) ?? same[0]).id, sure: !!byName }; }
  const first = low(cat).split(/[ ,]+/)[0];
  const near = lines.find(l => low(l.values?.category).split(/[ ,]+/)[0] === first);
  if (near) return { lineId: near.id, sure: false };
  return { lineId: null, newCategory: cat, sure: false };
}
// Merchant words: a line's own name, then the Reference list; the longest word that fits wins.
export function wordsMatch(text, ref, lines = []) {
  let best = null;
  const take = (w, hit) => { const n = merchantKey(w).length; if (n >= 3 && hasWord(text, w) && (!best || n > best.n)) best = { ...hit, n, word: w }; };
  for (const l of lines) if (l.name) take(l.name, { lineId: l.id, category: l.values?.category ?? null });
  for (const e of ref.merchantWords?.words || []) for (const w of e.words) take(w, e.kind ? { kind: e.kind } : { category: e.category });
  return best;
}
const debtFor = (debts, text) => debts.find(d => d.name && hasWord(text, d.name)) ?? (debts.length === 1 ? debts[0] : null);
// One row: what it is and where it lands.
export function matchOne(t, { doc, ref, lines, incomes, debts, fmt }) {
  const text = textOf(t);
  const out = (kind, sure, why, extra = {}) => ({ ...t, kind, sure, why, lineId: null, newCategory: null, incomeId: null, debtId: null, ...extra });
  const asKind = (kind, sure, why) => {
    if (kind === 'income') { const inc = t.amount > 0 ? matchIncome(t, incomes) : null; return out('income', inc ? 'Matched' : sure, inc ? `${why}; within 5% of a paycheck` : why, inc ? { incomeId: inc.incomeId } : {}); }
    if (kind === 'debt') { const d = debtFor(debts, text); return out('debt', sure, why, { debtId: d?.id ?? null }); }
    return out(kind, sure, why);
  };
  const toLine = (lineId, sure, why) => out('spend', sure, why, { lineId });
  if (t.ignored) return out('ignore', 'Matched', `Ignored in ${fmt?.name ?? 'the app'}`);
  // 1. The coach's rule for this merchant.
  const rule = doc.settings?.merchantRules?.[merchantKey(t.merchant)];
  if (rule && SPECIAL[rule]) return asKind(SPECIAL[rule], 'Matched', 'Your rule for this merchant');
  if (rule && lines.some(l => l.id === rule)) return toLine(rule, 'Matched', 'Your rule for this merchant');
  // A paycheck by amount and payday (answer 168) is sure on its own.
  const pay = t.amount > 0 ? matchIncome(t, incomes) : null;
  // 2. The app's own category, through the client's map, then Reference data.
  if (t.appCategory && fmt?.id && ref.importCategories?.[fmt.id]) {
    const own = doc.settings?.importCategoryMap?.[fmt.id] || {};
    const has = Object.hasOwn(own, t.appCategory) || Object.hasOwn(ref.importCategories[fmt.id], t.appCategory);
    const target = Object.hasOwn(own, t.appCategory) ? own[t.appCategory] : ref.importCategories[fmt.id][t.appCategory];
    const why = `${fmt.name} says ${t.appCategory}`;
    if (has && SPECIAL[target]) return asKind(SPECIAL[target], 'Matched', why);
    if (has && target) {
      if (pay) return out('income', 'Matched', 'Within 5% of a paycheck, near payday', { incomeId: pay.incomeId });
      // Merchant words refine a broad category inside the same spending group (Bills & Utilities and RENT is Rent).
      const w = wordsMatch(text, ref, lines);
      const g = groupOfCategory(ref, target);
      if (w && !w.kind) { const wl = w.lineId ? { lineId: w.lineId, sure: true } : lineFor(lines, w.category, text); const wg = wl.lineId ? categoryKeyOf(lines.find(l => l.id === wl.lineId)) : groupOfCategory(ref, w.category);
        if (wg === g && low(w.category) !== low(target)) return out('spend', 'Guessed', `${why}; "${w.word}" is ${w.category}`, { lineId: wl.lineId ?? null, newCategory: wl.newCategory ?? null }); }
      const l = lineFor(lines, target, text);
      return out('spend', l.sure ? 'Matched' : 'Guessed', why, { lineId: l.lineId, newCategory: l.newCategory ?? null });
    }
  }
  if (pay) return out('income', 'Matched', 'Within 5% of a paycheck, near payday', { incomeId: pay.incomeId });
  // The older statement import's learned words (overnight J) count as a guess.
  const old = (doc.settings?.csvRules || []).filter(r => r.match && text.includes(merchantKey(r.match))).sort((a, b) => b.match.length - a.match.length)[0];
  if (old && lines.some(l => l.id === old.lineId)) return toLine(old.lineId, 'Guessed', `Like "${old.match}" before`);
  // 3. Merchant words.
  const w = wordsMatch(text, ref, lines);
  if (w?.kind === 'paycheck') return asKind('income', 'Guessed', `"${w.word}" reads as pay`);
  if (w?.kind) return asKind(w.kind, 'Guessed', `"${w.word}" reads as a ${w.kind === 'debt' ? 'card or loan payment' : 'transfer'}`);
  if (w) { const l = w.lineId ? { lineId: w.lineId } : lineFor(lines, w.category, text); return out('spend', 'Guessed', `"${w.word}" is ${w.category ?? 'this line'}`, { lineId: l.lineId ?? null, newCategory: l.newCategory ?? null }); }
  return out(t.amount > 0 ? 'income' : 'spend', 'Not matched', t.amount > 0 ? 'Money in, not a paycheck SLAM knows' : 'No rule, category or word fits');
}
// Every row of the month, duplicates (already imported) marked, transfers paired across accounts.
export function matchAll(list, { doc, ref, fmt, now = new Date() }) {
  const lines = linesOf(doc, ref);
  const incomes = incomesOf(doc, ref, now);
  const debts = inputsOf(doc, ref, now).debts.map(d => ({ id: d.id, name: d.name }));
  const have = new Set((doc.spending?.transactions || []).map(t => t.hash));
  const out = list.map(t => ({ ...matchOne(t, { doc, ref, lines, incomes, debts, fmt }), duplicate: have.has(t.hash) }));
  // The same amount out of one account and into another within 3 days: a transfer between the client's own accounts.
  const day = d => Date.parse(`${d}T12:00:00Z`) / 86400000;
  for (const a of out) {
    if (a.sure === 'Matched' || a.amount >= 0 || !a.account || a.pair) continue;
    const b = out.find(x => x !== a && !x.pair && x.amount === -a.amount && x.account && x.account !== a.account && Math.abs(day(x.date) - day(a.date)) <= 3 && x.sure !== 'Matched');
    if (!b) continue;
    for (const x of [a, b]) Object.assign(x, { kind: 'transfer', sure: 'Guessed', why: 'The same amount out of one account and into another', lineId: null, newCategory: null, incomeId: null, pair: true });
  }
  return out;
}
// Pick a line (or a kind) for one row by hand: it is Matched (the coach said so).
export function pickFor(t, target, lines) {
  if (SPECIAL[target]) return { ...t, kind: SPECIAL[target], lineId: null, newCategory: null, incomeId: target === '@income' ? t.incomeId : null, sure: 'Matched', why: 'You picked' };
  return lines.some(l => l.id === target) ? { ...t, kind: 'spend', lineId: target, newCategory: null, incomeId: null, debtId: null, sure: 'Matched', why: 'You picked' } : t;
}

// ---------- 4. The review: grouped by spending group, the unmatched first ----------
const ORDER = ['Accommodation', 'Food', 'Transportation', 'Therapy', 'Bills', 'Debt', 'Taxes', 'Retirement', 'Other'];
export function reviewOf(list, { ref, lines }) {
  const live = list.filter(t => !t.duplicate);
  const spentOf = rows => Math.round(rows.reduce((s, t) => s - t.amount, 0) * 100) / 100;
  const groups = [];
  // A row the coach placed by hand stays in this group while the review is open (keepFirst), so it does not jump away.
  const first = t => t.sure === 'Not matched' || t.keepFirst;
  const unmatched = live.filter(first);
  groups.push({ id: 'unmatched', title: 'Not matched', rows: unmatched, left: unmatched.filter(t => t.sure === 'Not matched').length, total: spentOf(unmatched.filter(t => t.amount < 0)) });
  const spend = live.filter(t => t.kind === 'spend' && !first(t));
  const byGroup = {};
  for (const t of spend) (byGroup[groupOf(ref, t, lines) ?? 'Other'] ??= []).push(t);
  for (const k of ORDER) if (byGroup[k]) groups.push({ id: `cat:${k}`, key: k, title: categoryName(k), rows: byGroup[k], total: spentOf(byGroup[k]) });
  for (const [kind, title] of [['income', 'Paychecks and money in'], ['transfer', 'Transfers between your accounts'], ['debt', 'Card and loan payments'], ['ignore', 'Left out']]) {
    const rows = live.filter(t => t.kind === kind && !first(t));
    if (rows.length) groups.push({ id: kind, title, rows, total: kind === 'income' ? Math.round(rows.reduce((s, t) => s + Math.max(0, t.amount), 0) * 100) / 100 : spentOf(rows.filter(t => t.amount < 0)), outside: true });
  }
  const dupes = list.filter(t => t.duplicate);
  if (dupes.length) groups.push({ id: 'dupes', title: 'Already imported', rows: dupes, total: null, outside: true });
  return { groups, spending: spentOf(spend), counts: Object.fromEntries(SURE.map(s => [s, live.filter(t => t.sure === s).length])), duplicates: dupes.length, newRows: live.length };
}
export const acceptAllMatched = list => list.map(t => (!t.duplicate && t.sure === 'Matched' ? { ...t, accepted: true } : t));

// ---------- 5. Save as the month's actuals (one undo step) ----------
// Accepted rows are kept (spending.transactions, dated, level Actual) and their money out adds to the line's actual for
// the month (a refund takes off); a new category makes its Budget line first. Paychecks land on their Income row
// (answer 168). The calendar marks Paid: a fixed-date bill's day, the paycheck nearest its date, a debt's payment.
// Rules ("Always put this merchant here") and category map edits are kept with the client. Rows already imported are
// never saved twice.
export function saveImport(store, ref, list, { ym, fmt, fileName = null, rules = {}, mapEdits = {}, bankMap = null, now = new Date() } = {}) {
  const have = new Set((store.doc.spending?.transactions || []).map(t => t.hash));
  const kept = list.filter(t => t.accepted && !t.duplicate && !have.has(t.hash) && t.date.slice(0, 7) === ym && !(t.kind === 'spend' && !t.lineId && !t.newCategory));
  if (!kept.length && !Object.keys(rules).length && !Object.keys(mapEdits).length) return { saved: 0, lines: 0, newLines: 0 };
  const at = (now instanceof Date ? now : new Date(now)).toISOString();
  const importId = `imp-${at.slice(0, 19).replace(/\D/g, '')}`;
  let newLines = 0;
  store.transaction(`Import ${kept.length} transactions from ${fmt?.name ?? 'a CSV'} (${monthName(ym)})`, () => {
    // New lines for categories this client has no line for yet.
    const made = {};
    for (const t of kept) if (t.kind === 'spend' && !t.lineId && t.newCategory) {
      if (!made[low(t.newCategory)]) {
        const d = ref.categoryDefaults.find(c => low(c.category) === low(t.newCategory)) || {};
        made[low(t.newCategory)] = store.add('bill', { name: t.newCategory, per: 'month', values: { category: t.newCategory, draftt: d.draftt ?? null, amountType: d.amount ?? 'Variable', timing: d.timing ?? 'Variable date' } }).id;
        newLines++;
      }
      t.lineId = made[low(t.newCategory)];
    }
    const before = instances(store.doc, ref, ym, { now });
    const existing = store.doc.spending?.transactions || [];
    store.setIn('spending', ['transactions'], [...existing, ...kept.map(t => ({ id: store.makeId(), date: t.date, description: t.description || t.merchant, merchant: t.merchant, amount: t.amount, account: t.account ?? null,
      bank: fmt?.name ?? null, format: fmt?.id ?? null, appCategory: t.appCategory ?? null, hash: t.hash, kind: t.kind, lineId: t.lineId ?? null, incomeId: t.incomeId ?? null, debtId: t.debtId ?? null,
      match: t.sure, importId, file: fileName, importedAt: at, level: 'Actual' }))], 'Transactions');
    // Line actuals for the month.
    const add = {};
    for (const t of kept) if (t.kind === 'spend' && t.lineId) add[t.lineId] = (add[t.lineId] ?? 0) - t.amount;
    for (const [lineId, v] of Object.entries(add)) {
      const cur = store.getIn('spending', ['months', ym, 'lines', lineId, 'actual']) ?? 0;
      store.setIn('spending', ['months', ym, 'lines', lineId, 'actual'], Math.round((cur + v) * 100) / 100, 'Actual from an import');
      store.setIn('spending', ['months', ym, 'lines', lineId, 'actualFrom'], 'csv');
    }
    // Paychecks: the latest on its Income row (answer 168).
    const latest = {};
    for (const t of kept) if (t.kind === 'income' && t.incomeId && t.amount > 0 && (!latest[t.incomeId] || t.date > latest[t.incomeId].date)) latest[t.incomeId] = t;
    for (const [id, t] of Object.entries(latest)) if (store.get(id)) store.update(id, { actualPay: t.amount, actualPayDate: t.date, locked: true });
    // The calendar: each row marks the nearest planned day of its line, paycheck or debt payment as Paid.
    const used = new Set();
    const nearest = (t, pick) => before.filter(i => pick(i) && i.status === 'Planned' && !used.has(i.key))
      .sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(t.date)) - Math.abs(Date.parse(b.date) - Date.parse(t.date)))[0];
    for (const t of kept) {
      const i = t.kind === 'spend' && t.lineId ? nearest(t, x => x.lineId === t.lineId && !x.spread)
        : t.kind === 'income' && t.incomeId ? nearest(t, x => x.kind === 'income' && x.recId === t.incomeId && Math.abs(Date.parse(x.date) - Date.parse(t.date)) <= 4 * 86400000)
          : t.kind === 'debt' && t.debtId ? nearest(t, x => x.kind === 'debt' && x.recId === t.debtId) : null;
      if (!i) continue;
      used.add(i.key);
      mark(store, i.key, { status: 'Paid', paid: t.amount, from: 'import' });
    }
    const s = store.doc.settings || {};
    const patch = {};
    if (Object.keys(rules).length) patch.merchantRules = { ...(s.merchantRules || {}), ...rules };
    if (Object.keys(mapEdits).length && fmt?.id) patch.importCategoryMap = { ...(s.importCategoryMap || {}), [fmt.id]: { ...(s.importCategoryMap?.[fmt.id] || {}), ...mapEdits } };
    if (bankMap) patch.csvMaps = { ...(s.csvMaps || {}), [bankMap.key]: bankMap.map };
    if (Object.keys(patch).length) store.setDoc('settings', patch);
  });
  return { saved: kept.length, lines: Object.keys(kept.filter(t => t.kind === 'spend').reduce((o, t) => ({ ...o, [t.lineId]: 1 }), {})).length, newLines };
}
// What one import put in, for the line under the button ("Last import: Rocket Money, November 2026, 38 rows").
export function lastImport(doc) {
  const list = (doc.spending?.transactions || []).filter(t => t.importId);
  if (!list.length) return null;
  const id = list[list.length - 1].importId;
  const rows = list.filter(t => t.importId === id);
  return { id, bank: rows[0].bank, ym: ymOf(new Date(`${rows[0].date}T12:00:00Z`)), count: rows.length, at: rows[0].importedAt };
}
