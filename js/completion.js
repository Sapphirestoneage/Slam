// SPDX-License-Identifier: AGPL-3.0-only
// Completion (R065): core is the Primary fields; full adds the detail that applies. Pure, so the counters, What's
// missing and arrive-and-highlight (batch 6) read one list: strings for the words, items for the jumps.
// Batch 7: a field on the Homework list ("I'll find it later") counts as handled, not missing (item 4); the
// Institutions picker counts as the institution (item 3); a card paid in full each month needs no APR (item 11);
// a Brokerage, Crypto or IRA is never asked Pretax or Roth (item 5); names come from the same label as the screen.
import { countsAsDone, statusOf } from './records.js';
import { LOAN_FOR } from './gates.js';
import { parseRoute } from './nav.js';
import { LATER, fieldLabel, whereToFind } from './homework.js';
import { rowLabel } from './institutions.js';
import { asksTaxType } from './math/portfolio.js';
import { categoryTotals, isCategoryRecord, CATEGORIES, categoryKeyOf } from './math/spending.js';
import { profileCompletion } from './profile-completion.js';

// A field is done when its status counts as done; the institution is done once the row points at an Institutions row.
const isDone = (r, f) => (f === 'institution' && !!r.values?.institutionId) || countsAsDone(statusOf(r, f));
const isParked = (r, f) => !isDone(r, f) && statusOf(r, f) === LATER;
export const paidInFull = r => r.kind === 'debt' && r.type === 'Credit card' && r.values?.payChoice === 'In full';
const FULL = {
  income: (r, g) => ['amount', 'payFrequency', 'incomeType', ...(g.employer ? [r.values.contributionPct != null ? 'contributionPct' : 'k401Paycheck'] : [])],
  debt: r => (paidInFull(r) ? ['balance', 'limit', 'dueDay'] : ['balance', 'apr', 'payment', ...(r.type === 'Credit card' ? ['limit', 'dueDay'] : r.type === 'Student loan' ? ['federal'] : []), 'stress']),
  account: r => [r.values.taxType === 'Both' ? 'pretaxBalance' : 'balance', 'institution', ...(r.values.group === 'investment' ? [...(asksTaxType(r.type) ? ['taxType'] : []), 'contribution'] : ['apy'])],
  asset: r => ['value', ...(LOAN_FOR[r.type] ? ['financed'] : [])],
  coverage: r => ['have', 'amount', r.type === 'Health' ? 'deductible' : r.type === 'Disability' ? 'benefitPct' : 'coverage'], // B4.2: health has no coverage amount
  benefit: () => ['amount', 'using'],
};
// The word for a field: the same label the screen and the Homework list use (item 3: one name everywhere).
const WORDS = { pretaxBalance: 'balances', limit: 'credit limit', dueDay: 'due day', federal: 'federal or private', stress: 'stress', payment: 'payment', financed: 'paid off or financed', have: 'have it?' };
export const wordFor = f => WORDS[f] ?? fieldLabel(f);
// Batch 7 (B9): a row with no name, no status and nothing in its core fields is blank: it counts nowhere and the
// list drops it once it is left empty.
export const isBlankRow = (r, core = ['amount']) => !r.name && !r.status && !r.values?.institutionId && core.every(f => { const v = f in r && f !== 'values' ? r[f] : r.values?.[f]; return v === null || v === undefined || v === ''; });
// Batch 7 (A3): the Budget counts categories, not lines. A category is done with a typed amount, or lines that add
// up (an existing file keeps its lines); parked when its row says Will get it; the three FAT categories always count,
// the rest once they hold something. Items point at the category row's amount box (cat:<key>:amount).
export function budgetCompletion(ctx) {
  const recs = ctx.visible(r => r.kind === 'bill' || isCategoryRecord(r));
  const cats = categoryTotals(recs.filter(isCategoryRecord), recs.filter(r => r.kind === 'bill' && !r.values.irregular && !isBlankRow(r)), l => l.amount ?? 0).filter(c => c.counts);
  const c = { done: 0, of: 0, parked: 0, missing: [], items: [] };
  for (const x of cats) {
    c.of += 1;
    const parked = x.rec?.status === LATER && x.amount == null;
    if (x.amount != null) c.done += 1;
    else if (parked) c.parked += 1;
    else { c.missing.push(`${x.name}: amount`); c.items.push({ id: x.rec?.id ?? `cat:${x.key}`, name: `${x.name}: amount`, field: 'amount', word: x.rec?.status ?? 'missing', level: 'Core', focus: `cat:${x.key}:amount`, where: 'Your bank or card app: last month, by category' }); }
  }
  // Answer 180: a fixed line with no due day sits on the 1st with a ? badge; the day is asked for, as full detail, never a block.
  const f = { done: c.done, of: c.of, parked: c.parked, missing: [], items: [] };
  for (const r of recs.filter(r => r.kind === 'bill' && !r.values.irregular && r.values.amountType === 'Fixed' && r.amount != null && r.status !== 'Not for me' && !r.values.dueDay)) {
    const name = r.name || r.values.category || 'Line';
    f.of += 1; f.missing.push(`Set due day for ${name}`);
    const parent = recs.find(c => isCategoryRecord(c) && c.type === categoryKeyOf(r))?.id ?? null; // batch 10 (5b): Show me opens the category, then the line's side panel
    f.items.push({ id: r.id, parent, name: `Set due day for ${name}`, field: 'dueDay', word: 'no day', level: 'Full detail', focus: `${r.id}:dueDay`, where: 'The bill or the bank statement: the day it leaves' });
  }
  return { core: c, full: f };
}
// Batch 8 (C14): how many rows a screen has at all, so "all set" is never said about an empty screen.
export function rowsOn(ctx, hash) {
  const key = routeKey(hash), def = MISSING[key];
  if (!def) return null;
  if (def === 'budget') return budgetCompletion(ctx).core.of;
  return ctx.visible(def[0]).length;
}
export function listCompletion(ctx, pred, core) {
  const g = ctx.gates();
  const doc = ctx.store.doc;
  const recs = ctx.visible(pred).filter(r => !isBlankRow(r, typeof core === 'function' ? core(r) : core));
  const c = { done: 0, of: 0, parked: 0 }, f = { done: 0, of: 0, parked: 0 };
  c.missing = []; f.missing = []; c.items = []; f.items = []; // items: one per field, for arrive-and-highlight (batch 6)
  // focus: the box's handle on the screen. The institution's box is the row's Institutions picker (institutionId).
  const item = (r, name, x, level) => ({ id: r.id, name: `${name}: ${wordFor(x)}`, field: x, word: r.status && r.status !== 'Know it' ? r.status : 'missing', level, focus: `${r.id}:${x === 'institution' ? 'institutionId' : x}`, where: whereToFind(x, r.type) });
  for (const r of recs) {
    const name = rowLabel(doc, r) || r.name || r.type || r.kind; // two accounts at one bank read "Tikva · 401(k)" and "Tikva · HSA" (item 8)
    const coreF = typeof core === 'function' ? core(r) : core;
    c.of += 1;
    const coreMiss = coreF.filter(x => !isDone(r, x) && !isParked(r, x));
    if (coreF.some(x => isParked(r, x))) c.parked += 1;
    if (!coreMiss.length) c.done += 1; else { c.missing.push(`${name}: ${coreMiss.map(wordFor).join(', ')}`); for (const x of coreMiss) c.items.push(item(r, name, x, 'Core')); }
    const fullF = [...new Set([...coreF, ...(FULL[r.kind]?.(r, g) ?? [])])];
    const fullMiss = fullF.filter(x => !isDone(r, x) && !isParked(r, x));
    f.of += fullF.length; f.done += fullF.length - fullMiss.length; f.parked += fullF.filter(x => isParked(r, x)).length;
    if (fullMiss.length) { f.missing.push(`${name}: ${fullMiss.map(wordFor).join(', ')}`); for (const x of fullMiss) f.items.push(item(r, name, x, 'Full detail')); }
  }
  return { core: c, full: f };
}


// What each screen counts as needing work: the same predicate and core fields its completion bars use.
export const MISSING = {
  'cash-flow/income': [r => r.kind === 'income' || r.kind === 'benefit', ['amount']],
  'net-worth/debt': [r => r.kind === 'debt', r => (paidInFull(r) ? ['balance'] : ['balance', 'apr'])],
  'net-worth/credit-cards': [r => r.kind === 'debt' && r.type === 'Credit card', r => (paidInFull(r) ? ['balance'] : ['balance', 'apr'])],
  'net-worth/assets': [r => r.kind === 'account' || r.kind === 'asset', r => [r.kind === 'asset' ? 'value' : 'balance']],
  'net-worth/protection': [r => r.kind === 'coverage', ['have']],
  'cash-flow/budget': 'budget', // batch 7 (A): the categories
};
export const routeKey = hash => { const { tab, sub } = parseRoute(hash); return `${tab.id}/${sub.id}`; };
// The fields that need work on a screen, core first: [{ id, name, field, word, level, focus, where, route }].
export function missingFor(ctx, hash) {
  const key = routeKey(hash), def = MISSING[key];
  if (!def) return [];
  const c = def === 'budget' ? budgetCompletion(ctx) : listCompletion(ctx, def[0], def[1]);
  const seen = new Set();
  return [...(c.core.items || []), ...(c.full.items || [])].filter(it => { const k = `${it.id}:${it.field}`; if (seen.has(k)) return false; seen.add(k); return true; }).map(it => ({ ...it, route: `#/${key}` }));
}

// ---------- Batch 14 (item 8): X of Y filled on Budget, Taxes, Protection and Goals, and every screen's counts ----------
// A profile answer is handled when it has a value, or is parked (Will get it) or marked I don't have this.
const answeredP = (p, k) => (p[k] !== null && p[k] !== undefined && p[k] !== '') || !!p.later?.[k] || !!p.none?.[k];
const countOf = list => ({ done: list.filter(x => x.done).length, of: list.length, items: list.filter(x => !x.done).map(x => x.item) });
// Taxes: core is the filing status picked (a guess until then); full adds last year's result and the W-4 basics.
export function taxesCompletion(ctx) {
  const p = ctx.store.doc.profile || {};
  const it = (name, focus, level) => ({ id: null, name, field: focus, word: 'missing', level, focus, route: '#/cash-flow/taxes' });
  const core = [{ done: answeredP(p, 'filingStatus'), item: it('Filing status', 'tax:filing', 'Core') }];
  const full = [...core,
    { done: answeredP(p, 'lastYearTax'), item: it('Last year: refund or owed', 'seg:Refund or owed:Refund', 'Full detail') },
    ...(p.lastYearTax === 'Refund' || p.lastYearTax === 'Owed' ? [{ done: answeredP(p, 'lastYearAmount'), item: it('Last year: how much', 'tax:lastYear', 'Full detail') }] : []),
    { done: answeredP(p, 'w4Status'), item: it('W-4 filing status', 'tax:w4', 'Full detail') },
    { done: answeredP(p, 'w4Extra'), item: it('Extra withheld a paycheck', 'tax:w4extra', 'Full detail') }];
  return { core: countOf(core), full: countOf(full) };
}
// Goals: core is the FI age; full adds spending in retirement and at least one goal named.
export function goalsCompletion(ctx) {
  const doc = ctx.store.doc, a = doc.assumptions || {};
  const it = (name, focus, level) => ({ id: null, name, field: focus, word: 'missing', level, focus, route: '#/plan/goals' });
  const core = [{ done: a.fiAge != null || !!doc.profile?.later?.fiAge, item: it('FI age', 'g:fiAge', 'Core') }];
  const full = [...core,
    { done: a.retirementSpending != null, item: it('Spending in retirement', 'g:retSpend', 'Full detail') },
    { done: ctx.visible(r => r.kind === 'milestone').length > 0, item: it('A goal, named', 'add:milestone', 'Full detail') }];
  return { core: countOf(core), full: countOf(full) };
}
// Protection: each coverage row's Have it? (core) and its details; with no rows yet, the one box is Add the usual list.
export function protectionCompletion(ctx) {
  const c = listCompletion(ctx, r => r.kind === 'coverage', ['have']);
  const rows = ctx.visible(r => r.kind === 'coverage');
  // The usual list's rows are blank until Have it? is answered; each still asks that one box.
  const blank = rows.filter(r => isBlankRow(r, ['have']) && !isParked(r, 'have'));
  const ask = blank.map(r => ({ id: r.id, name: `${r.type}: have it?`, field: 'have', word: 'missing', level: 'Core', focus: `${r.id}:have`, where: whereToFind('have', r.type), route: '#/net-worth/protection' }));
  if (rows.length) return { core: { ...c.core, of: c.core.of + blank.length, items: [...c.core.items, ...ask] }, full: { ...c.full, of: c.full.of + blank.length, items: [...c.full.items, ...ask] } };
  const item = { id: null, name: 'Insurance: add the usual list', field: 'add', word: 'missing', level: 'Core', focus: 'add:usual-coverage', route: '#/net-worth/protection' };
  return { core: { done: 0, of: 1, parked: 0, missing: [item.name], items: [item] }, full: { done: 0, of: 1, parked: 0, missing: [item.name], items: [item] } };
}
// Every screen's core and full counts in one list (the effort scoreboard reads it; 99% means every full count is met).
export function fillCounts(ctx) {
  const pc = profileCompletion(ctx.store.doc);
  const debtCore = r => (paidInFull(r) ? ['balance'] : ['balance', 'apr']);
  const pair = c => ({ core: { done: c.core.done, of: c.core.of }, full: { done: c.full.done, of: c.full.of } });
  return [
    { screen: 'About you', ...pair(pc) },
    { screen: 'Income', ...pair(listCompletion(ctx, r => r.kind === 'income' || r.kind === 'benefit', ['amount'])) },
    { screen: 'Budget', ...pair(budgetCompletion(ctx)) },
    { screen: 'Taxes', ...pair(taxesCompletion(ctx)) },
    { screen: 'Assets', ...pair(listCompletion(ctx, r => r.kind === 'account' || r.kind === 'asset', r => [r.kind === 'asset' ? 'value' : 'balance'])) },
    { screen: 'Debt', ...pair(listCompletion(ctx, r => r.kind === 'debt' && r.type !== 'Credit card', debtCore)) },
    { screen: 'Credit cards', ...pair(listCompletion(ctx, r => r.kind === 'debt' && r.type === 'Credit card', debtCore)) },
    { screen: 'Protection', ...pair(protectionCompletion(ctx)) },
    { screen: 'Goals', ...pair(goalsCompletion(ctx)) },
  ];
}
