// SPDX-License-Identifier: AGPL-3.0-only
// Completion (R065): core is the Primary fields; full adds the detail that applies. Pure, so the counters, What's
// missing and arrive-and-highlight (batch 6) read one list: strings for the words, items for the jumps.
import { countsAsDone, statusOf } from './records.js';
import { LOAN_FOR } from './gates.js';
import { parseRoute } from './nav.js';

const done = (r, f) => countsAsDone(statusOf(r, f));
const FULL = {
  income: (r, g) => ['amount', 'payFrequency', 'incomeType', ...(g.employer ? [r.values.contributionPct != null ? 'contributionPct' : 'k401Paycheck'] : [])],
  debt: r => ['balance', 'apr', 'payment', ...(r.type === 'Credit card' ? ['limit', 'dueDay'] : r.type === 'Student loan' ? ['federal'] : []), 'stress'],
  account: r => [r.values.taxType === 'Both' ? 'pretaxBalance' : 'balance', 'institution', ...(r.values.group === 'investment' ? ['taxType', 'contribution'] : ['apy'])],
  asset: r => ['value', ...(LOAN_FOR[r.type] ? ['financed'] : [])],
  coverage: r => ['have', 'amount', r.type === 'Health' ? 'deductible' : r.type === 'Disability' ? 'benefitPct' : 'coverage'], // B4.2: health has no coverage amount
  benefit: () => ['amount', 'using'],
};
export function listCompletion(ctx, pred, core) {
  const g = ctx.gates();
  const recs = ctx.visible(pred);
  const c = { done: 0, of: 0 }, f = { done: 0, of: 0 };
  const WORDS = { amount: 'amount', balance: 'balance', apr: 'APR', value: 'value', have: 'have it?', payFrequency: 'pay frequency', incomeType: 'type', contributionPct: '401(k) %', k401Paycheck: '401(k) a paycheck',
    payment: 'payment', limit: 'limit', dueDay: 'due day', federal: 'federal or private', stress: 'stress', institution: 'institution', taxType: 'pretax or Roth', contribution: 'putting in',
    apy: 'APY', financed: 'paid off or financed', coverage: 'coverage amount', deductible: 'deductible', benefitPct: 'benefit %', using: 'using it?', pretaxBalance: 'balances' };
  c.missing = []; f.missing = []; c.items = []; f.items = []; // items: one per field, for arrive-and-highlight (batch 6)
  for (const r of recs) {
    const name = r.name || r.type || r.kind;
    const coreF = typeof core === 'function' ? core(r) : core;
    c.of += 1;
    const coreMiss = coreF.filter(x => !done(r, x));
    if (!coreMiss.length) c.done += 1; else { c.missing.push(`${name}: ${coreMiss.map(x => WORDS[x] ?? x).join(', ')}`); for (const x of coreMiss) c.items.push({ id: r.id, name: `${name}: ${WORDS[x] ?? x}`, field: x, word: r.status && r.status !== 'Know it' ? r.status : 'missing', level: 'Core', focus: `${r.id}:${x}` }); }
    const fullF = [...new Set([...coreF, ...(FULL[r.kind]?.(r, g) ?? [])])];
    const fullMiss = fullF.filter(x => !done(r, x));
    f.of += fullF.length; f.done += fullF.length - fullMiss.length;
    if (fullMiss.length) { f.missing.push(`${name}: ${fullMiss.map(x => WORDS[x] ?? x).join(', ')}`); for (const x of fullMiss) f.items.push({ id: r.id, name: `${name}: ${WORDS[x] ?? x}`, field: x, word: r.status && r.status !== 'Know it' ? r.status : 'missing', level: 'Full detail', focus: `${r.id}:${x}` }); }
  }
  return { core: c, full: f };
}


// What each screen counts as needing work: the same predicate and core fields its completion bars use.
export const MISSING = {
  'cash-flow/income': [r => r.kind === 'income' || r.kind === 'benefit', ['amount']],
  'net-worth/debt': [r => r.kind === 'debt', ['balance', 'apr']],
  'net-worth/credit-cards': [r => r.kind === 'debt' && r.type === 'Credit card', ['balance', 'apr']],
  'net-worth/assets': [r => r.kind === 'account' || r.kind === 'asset', r => [r.kind === 'asset' ? 'value' : 'balance']],
  'net-worth/protection': [r => r.kind === 'coverage', ['have']],
  'cash-flow/budget': [r => r.kind === 'bill', ['amount']],
};
export const routeKey = hash => { const { tab, sub } = parseRoute(hash); return `${tab.id}/${sub.id}`; };
// The fields that need work on a screen, core first: [{ id, name, field, word, level, focus, route }].
export function missingFor(ctx, hash) {
  const key = routeKey(hash), def = MISSING[key];
  if (!def) return [];
  const c = listCompletion(ctx, def[0], def[1]);
  const seen = new Set();
  return [...(c.core.items || []), ...(c.full.items || [])].filter(it => { const k = `${it.id}:${it.field}`; if (seen.has(k)) return false; seen.add(k); return true; }).map(it => ({ ...it, route: `#/${key}` }));
}
