// SPDX-License-Identifier: AGPL-3.0-only
// Find understands people (batch 14). The words people say ("401k", "emergency fund", "payday") point at the screen
// and the box where that thing lives, from the table in data/reference-2026.json (findWords, registered in
// js/registry/assumptions.js). Matching ignores punctuation and spacing ("401(k)" is "401k"). Each word's targets are
// tried in order against this client's rows, so "rent" lands on the Rent line's amount when there is one and on the
// Accommodation category when there is not. Add goes where the thing belongs, never a Budget line for a word that is
// not spending; when unsure it offers a note for later. Pure: no DOM.
import { gatesOf, visible } from './gates.js';
import { parseQuickAdd } from './quickadd.js';
import { categoryKeyOf, isCategoryRecord } from './math/spending.js';

// Lowercase, parentheses and apostrophes dropped ("401(k)" is "401k", "kids'" is "kids"), other punctuation a space.
export const norm = s => String(s ?? '').toLowerCase().replace(/[()'’`]/g, '').replace(/[^a-z0-9$%]+/g, ' ').replace(/\s+/g, ' ').trim();

const SCREEN_OF = { income: '#/cash-flow/income', benefit: '#/cash-flow/income', bill: '#/cash-flow/budget', spending: '#/cash-flow/budget', account: '#/net-worth/assets',
  asset: '#/net-worth/assets', coverage: '#/net-worth/protection', milestone: '#/plan/goals' };
const PLACE_OF = { '#/cash-flow/income': 'Cash flow › Income', '#/cash-flow/budget': 'Cash flow › Budget', '#/cash-flow/taxes': 'Cash flow › Taxes', '#/net-worth/assets': 'Net worth › Assets',
  '#/net-worth/debt': 'Net worth › Debt', '#/net-worth/credit-cards': 'Net worth › Credit cards', '#/net-worth/protection': 'Net worth › Protection', '#/plan/goals': 'Plan › Goals',
  '#/plan/foo': 'Plan › FOO', '#/home/profile': 'Home › About you', '#/home/session': 'Home', '#/plan/transitions': 'Plan › Transitions',
  '#/plan/scorecard': 'Plan › Scorecard', '#/plan/timeline': 'Plan › Timeline', '#/report/overview': 'Report › Overview', '#/report/statements': 'Report › Statements', '#/report/history': 'Report › History', // batch 34
  '#/tools/lists': 'Coach tools › Lists', '#/tools/session': 'Coach tools › Session', '#/tools/data': 'Coach tools › Data', '#/tools/discovery': 'Coach tools › Discovery' };
export const placeOf = route => PLACE_OF[route] ?? route;
export const routeOfRecord = r => (r.kind === 'debt' ? (r.type === 'Credit card' ? '#/net-worth/credit-cards' : '#/net-worth/debt') : SCREEN_OF[r.kind] ?? null);
const nameOf = r => r.name || r.values?.category || r.type || r.kind;

// One target, written kind[types]{categories}(fixed).field>box^block with * for one result per row; cat:Key;
// focus:key@route; add:thing@route. {categories} matches a row's category, name, platform or purpose (batch 35:
// {Uber} is a Platform row on Uber, {Taxes} an account set aside for taxes). ^block names a closed More block on the
// row to open first, {id} standing for the row's id (batch 35: ^income:work:{id} is the row's Tips and shifts).
// Returns the hits for this client: [{ route, focus, id, field, parentCat, rec, open }] or [].
const TARGET = /^(\w+)(\*)?(?:\[([^\]]+)\])?(?:\{([^}]+)\})?(?:\((\w+)\))?\.(\w+)(?:>(@?[^^]+))?(?:\^(.+))?$/;
export function resolveTarget(t, recs) {
  if (t.startsWith('focus:') || t.startsWith('add:')) { // focus:key@route^block: ^ names a closed More block to open first
    const [key, rest] = t.split('@');
    const [route, open] = rest.split('^');
    return [{ route, focus: key.startsWith('add:') ? key : key.slice(6), add: key.startsWith('add:'), open: open ?? null }];
  }
  if (t.startsWith('cat:')) return [{ route: '#/cash-flow/budget', focus: `${t}:amount`, field: 'amount', id: recs.find(r => isCategoryRecord(r) && r.type === t.slice(4))?.id ?? null }];
  const m = t.match(TARGET);
  if (!m) return [];
  const [, kind, each, types, cats, flag, field, box, block] = m;
  const typeList = types ? types.split('|') : null, catList = cats ? cats.split('|') : null;
  const rows = recs.filter(r => r.kind === kind && (!typeList || typeList.includes(r.type)) && (!catList || [r.values?.category, r.name, r.values?.platform, r.values?.purpose].some(v => v != null && catList.includes(v)))
    && (flag !== 'fixed' || (r.values?.amountType === 'Fixed' && !r.values?.irregular)) && r.status !== 'Not for me');
  return (each ? rows : rows.slice(0, 1)).map(r => ({
    route: routeOfRecord(r), id: r.id, field, rec: r,
    focus: box?.startsWith('@') ? box.slice(1) : `${r.id}:${box ?? field}`,
    parentCat: kind === 'bill' ? categoryKeyOf(r) : null,
    open: block ? block.replace('{id}', r.id) : null,
  }));
}

// The table's words, normalized once.
export function wordsOf(ref) {
  return (ref?.findWords?.words || []).map(w => ({ ...w, norms: w.terms.map(norm), labelNorm: norm(w.label) }));
}
// How well a query matches a word: exact term best, then a term starting with it, then a term inside the query.
function wordScore(w, q) {
  if (w.norms.includes(q) || w.labelNorm === q) return -30;
  if (q.length >= 3 && w.norms.some(t => t.startsWith(q))) return -20;
  if (w.norms.some(t => t.length >= 3 && ` ${q} `.includes(` ${t} `))) return -10;
  return null;
}
// The rows a household shows (gates applied); with no household, none.
export const liveRecords = (doc, ref) => (doc ? visible((doc.records || []).filter(r => !r.folded), gatesOf(doc.profile, doc.client), ref) : []); // batch 28: a row this viewer does not see is not found

// Every word that matches, each turned into results for this client: one per row for a * target, else the first
// target that resolves. A result says whose it is ("APR · Chase card") when it points at a row.
export function wordHits(query, { doc = null, ref = null, words = wordsOf(ref) } = {}) {
  const q = norm(query);
  if (!q) return [];
  const recs = liveRecords(doc, ref);
  const out = [];
  words.forEach((w, order) => {
    const sc = wordScore(w, q);
    if (sc === null) return;
    let hits = [];
    for (const t of w.go) { hits = resolveTarget(t, recs); if (hits.length) break; }
    hits.forEach((x, i) => {
      const whose = x.rec ? nameOf(x.rec) : null;
      const label = x.add ? `${w.label}: add one` : whose && !norm(whose).includes(norm(w.label)) && !norm(w.label).includes(norm(whose)) ? `${w.label} · ${whose}` : w.label;
      out.push({ kind: 'word', word: w.terms[0], label, where: placeOf(x.route), route: x.route, focus: x.focus, id: x.id ?? null, field: x.field ?? null, parentCat: x.parentCat ?? null, open: x.open ?? null, add: !!x.add, score: sc + order / 1000 + i / 100000 });
    });
  });
  return out;
}

// What Add makes from the words (item 2): an account type adds an account on Assets, a loan a debt, insurance a
// coverage row, an income word income, a spending word (or a name with an amount) a Budget line. A known word that
// is not spending (home value, FI age) offers no Add; anything else unsure becomes a note for later.
const ADD_ROUTE = { account: 'Net worth › Assets', debt: 'Net worth › Debt', coverage: 'Net worth › Protection', income: 'Cash flow › Income', bill: 'Cash flow › Budget' };
export function addChoice(text, { ref = null, words = wordsOf(ref) } = {}) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const p = parseQuickAdd(raw);
  const q = norm(raw);
  const known = words.map(w => ({ w, sc: wordScore(w, q.replace(/\$?\d[\d,.]*\s*%?/g, ' ').replace(/\s+/g, ' ').trim()) })).filter(x => x.sc !== null).sort((a, b) => a.sc - b.sc)[0]?.w ?? null;
  const spendingWord = isSpendingWord(q, ref);
  const hasAmount = p?.amount != null || p?.values?.balance != null;
  const note = () => ({ kind: 'note', name: raw, section: 'the parking lot', summary: `A note for later: ${raw}` });
  if (known) {
    const [kind, type] = String(known.add || 'none').split(':');
    if (kind === 'none') return hasAmount && p.kind !== 'bill' ? p : null; // "home value" or "FI age": Find, no Add
    if (kind === 'bill') return { ...p, kind: 'bill', type: null, section: ADD_ROUTE.bill };
    if (kind === 'income') return { ...p, kind: 'income', type: type || p.type || 'Job', amount: p.amount ?? null, per: p.per || 'month', section: ADD_ROUTE.income, summary: `Income "${p.name || known.label}"` };
    if (kind === 'account') return { kind: 'account', type: type || p.type, name: p.name, values: { group: (ref?.lists?.cashTypes || ['Checking', 'Savings']).includes(type) ? 'cash' : 'investment', balance: p.amount ?? p.values?.balance ?? null }, section: ADD_ROUTE.account, summary: `${type} account` };
    if (kind === 'debt') return { kind: 'debt', type: type || p.type || 'Personal loan', name: p.name, values: { balance: p.values?.balance ?? p.amount ?? null, apr: p.values?.apr ?? null }, section: type === 'Credit card' ? 'Net worth › Credit cards' : ADD_ROUTE.debt, summary: `${type} "${p.name}"` };
    if (kind === 'coverage') return { kind: 'coverage', type: type || 'Health', name: null, values: {}, section: ADD_ROUTE.coverage, summary: `${type || 'Coverage'} coverage row` };
  }
  if (p.kind !== 'bill') return { ...p, section: p.kind === 'debt' && p.type === 'Credit card' ? 'Net worth › Credit cards' : p.section };
  if (spendingWord || (p.amount != null && p.name)) return p; // a spending word, or "Netflix 15 a month"
  return note();
}
// A Budget word: a starter line or category name, so "coffee" or "gym" is spending even with no amount.
export function isSpendingWord(q, ref) {
  const names = [...(ref?.spendingPresets?.lines || []).map(l => l.name ?? l.line ?? l.category), ...(ref?.categoryDefaults || []).map(c => c.category)].filter(Boolean).map(norm);
  const words = new Set(names.flatMap(n => n.split(' ')).filter(x => x.length >= 4 && !['and', 'with', 'other', 'your', 'home', 'fees'].includes(x)));
  return norm(q).split(' ').some(x => words.has(x)) || names.includes(norm(q));
}
