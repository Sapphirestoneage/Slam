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
export function listCompletion(ctx, pred, core) {
  const g = ctx.gates();
  const doc = ctx.store.doc;
  const recs = ctx.visible(pred);
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
  'cash-flow/budget': [r => r.kind === 'bill', ['amount']],
};
export const routeKey = hash => { const { tab, sub } = parseRoute(hash); return `${tab.id}/${sub.id}`; };
// The fields that need work on a screen, core first: [{ id, name, field, word, level, focus, where, route }].
export function missingFor(ctx, hash) {
  const key = routeKey(hash), def = MISSING[key];
  if (!def) return [];
  const c = listCompletion(ctx, def[0], def[1]);
  const seen = new Set();
  return [...(c.core.items || []), ...(c.full.items || [])].filter(it => { const k = `${it.id}:${it.field}`; if (seen.has(k)) return false; seen.add(k); return true; }).map(it => ({ ...it, route: `#/${key}` }));
}
