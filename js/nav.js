// SPDX-License-Identifier: AGPL-3.0-only
// Where everything lives (Navigation tab): five tabs, their sub-tabs, and the gear's pages.
import { norm, wordHits } from './find.js';

// The DATING spine: Debt + Assets = Net worth; Taxes + Income + Needs = Cash flow; Goals = Plan.
// Cash flow sub-tabs read in waterfall order: Income, Taxes, then Budget, Calendar and Close.
export const TABS = [
  // Home is one screen (Phase 3): the program, the picture, the next small things. Start session switches it to the
  // session mode; About you stays a page of its own under it.
  { id: 'home', name: 'Home', job: 'This session: the program, the picture, the next small things', subs: [
    { id: 'session', name: 'Home' }, { id: 'profile', name: 'About you', area: 'needs' }, { id: 'review', name: 'Review', hidden: true }] }, // Review: the gate before a session ends (no sub-tab of its own)
  { id: 'net-worth', name: 'Net worth', job: 'What you own and owe', subs: [
    { id: 'assets', name: 'Assets', area: 'assets' }, { id: 'debt', name: 'Debt', area: 'debt' }, { id: 'credit-cards', name: 'Credit cards', area: 'debt' }, { id: 'protection', name: 'Protection', area: 'goals' }] },
  { id: 'cash-flow', name: 'Cash flow', job: 'Money in and out: income, taxes, budget, calendar, close', subs: [
    { id: 'income', name: 'Income', area: 'income' }, { id: 'taxes', name: 'Taxes', area: 'taxes' }, { id: 'budget', name: 'Budget', area: 'needs' },
    { id: 'calendar', name: 'Calendar', area: 'needs' }, { id: 'close', name: 'Month end', area: 'needs' }] },
  { id: 'plan', name: 'Plan', job: 'The future: goals, timeline, events', subs: [
    { id: 'goals', name: 'Goals', area: 'goals' }, { id: 'foo', name: 'FOO', area: 'goals' }, { id: 'scorecard', name: 'Scorecard', area: 'goals' }, { id: 'timeline', name: 'Timeline', area: 'goals' },
    { id: 'debt-payoff', name: 'Debt payoff', area: 'debt' }, { id: 'next-12-months', name: 'Next 12 months', area: 'goals' },
    { id: 'scenarios', name: 'Current vs Proposed', area: 'goals' },
    { id: 'transitions', name: 'Transitions', area: 'goals', phase4: true }] }, // K: the tab keeps its id; batch 21: Life Transitions, shown when Phase 4 previews are on (Coach tools)
  { id: 'report', name: 'Report', job: 'The report: net worth, metrics, one-pager', subs: [
    { id: 'overview', name: 'Overview' }, { id: 'statements', name: 'Statements' }, { id: 'one-pager', name: 'One-pager' }, { id: 'history', name: 'History' }] },
];
// Old homes (My Money and Spending) still open: bookmarks, saved links and old Lives on text land on the new home.
export const MOVED = {
  'home/prep': 'home/session', 'home/live': 'home/session', 'home/wrap-up': 'home/session', // the old Home modes (Phase 3: one screen)
  'my-money': 'home/profile', 'my-money/profile': 'home/profile', 'my-money/income': 'cash-flow/income', 'my-money/taxes': 'cash-flow/taxes',
  'my-money/debt': 'net-worth/debt', 'my-money/assets': 'net-worth/assets', 'my-money/protection': 'net-worth/protection',
  spending: 'cash-flow/budget', 'spending/budget': 'cash-flow/budget', 'spending/calendar': 'cash-flow/calendar', 'spending/close': 'cash-flow/close',
};
const MOVED_PLACES = { 'My Money': 'my-money', Spending: 'spending' };
const OLD_SUBS = { Profile: 'profile', Income: 'income', Taxes: 'taxes', Debt: 'debt', Assets: 'assets', Protection: 'protection',
  Budget: 'budget', 'Cash flow calendar': 'calendar', 'Month-end close': 'close' };
// Sub-tabs renamed in place: an old name still finds its page.
const RENAMED_SUBS = { 'Month-end close': 'Month end' };
// Behind the gear, never a main tab (R076).
export const TOOLS = { id: 'tools', name: 'Coach tools', job: 'Lists, data and session', subs: [
  { id: 'lists', name: 'Lists' }, { id: 'session', name: 'Session' }, { id: 'data', name: 'Data' }, { id: 'discovery', name: 'Discovery' }] };

const ALL = [...TABS, TOOLS];

// Cards live on their own sub-tab; every other debt on Debt.
export const debtRoute = r => (r?.type === 'Credit card' ? '#/net-worth/credit-cards' : '#/net-worth/debt');
export function parseRoute(hash) {
  let [tabId, subId] = String(hash || '').replace(/^#\/?/, '').split(/[/?]/);
  const moved = MOVED[`${tabId}/${subId}`] ?? MOVED[tabId];
  if (moved) [tabId, subId] = moved.split('/');
  const tab = ALL.find(t => t.id === tabId) || TABS[0];
  const sub = tab.subs.find(s => s.id === subId) || tab.subs.find(s => s.id === tab.landing) || tab.subs[0];
  return { tab, sub, hash: `#/${tab.id}/${sub.id}` };
}
export const routeOf = (tabId, subId) => `#/${tabId}/${subId}`;
// Where a tab's own button goes: its landing page (its first sub-tab).
export const tabRoute = t => routeOf(t.id, t.landing ?? t.subs[0].id);

// 'My Money › Debt' (the Fields tab's 'Lives on') to a route.
export function routeForPlace(place) {
  const [tabName, subName] = String(place).split('›').map(s => s.trim());
  if (/coach tools/i.test(place)) return routeOf('tools', 'lists');
  if (MOVED_PLACES[tabName]) return parseRoute(`#/${MOVED_PLACES[tabName]}/${OLD_SUBS[subName] ?? ''}`).hash; // an old Lives on
  const tab = ALL.find(t => t.name === tabName);
  if (!tab) return null;
  const sub = tab.subs.find(s => s.name === (RENAMED_SUBS[subName] ?? subName)) || tab.subs[0];
  return routeOf(tab.id, sub.id);
}

export const VIEWS = [{ label: 'Bills list', where: 'Cash flow › Calendar › Bills list', route: '#/cash-flow/calendar?view=bills', words: ['bills', 'subscriptions', 'recurring', 'repeating charges'] }];
// Find (R168 '/'): the everyday words first (batch 14: js/find.js, the table in data/reference-2026.json), then
// fields, screens and the client's own records. Punctuation and spacing do not count ("401k" finds "401(k)").
// Identical results show once; two fields with the same name say which group each is in.
export function search(query, { fields = [], records = [], doc = null, ref = null } = {}) {
  const q = norm(query);
  if (!q) return [];
  const score = text => {
    const t = norm(text);
    if (!t) return null;
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    if (t.split(' ').some(w => w.startsWith(q))) return 2;
    return t.includes(q) ? 3 : null;
  };
  const words = wordHits(query, { doc: doc ?? (records.length ? { records, profile: {}, client: {} } : null), ref });
  const out = [...words];
  for (const t of ALL) for (const s of t.subs) {
    const sc = score(s.name);
    if (sc !== null) out.push({ kind: 'screen', label: s.name, where: `${t.name} › ${s.name}`, route: routeOf(t.id, s.id), score: sc });
  }
  // Batch 15: views inside a screen, found by their everyday words (the Bills list: bills, subscriptions, recurring).
  for (const v of VIEWS) {
    const sc = [v.label, ...v.words].map(score).filter(x => x !== null).sort((a, b) => a - b)[0] ?? null;
    if (sc !== null) out.push({ kind: 'screen', label: v.label, where: v.where, route: v.route, score: sc });
  }
  const pointed = new Set(words.map(w => w.id).filter(Boolean));
  for (const r of records) {
    if (pointed.has(r.id)) continue; // the word result already lands on this row's box
    const sc = score(r.name || '') ?? score(r.type || '');
    if (sc !== null) out.push({ kind: 'record', id: r.id, label: r.name || r.type, where: placeOfRecord(r), route: routeForPlace(placeOfRecord(r)), score: sc });
  }
  const fieldHits = [];
  for (const f of fields) {
    const sc = score(f.field) ?? (score(f.group || '') !== null ? 4 : null);
    if (sc !== null) fieldHits.push({ kind: 'field', id: f.id, label: f.field, group: f.group, where: f.livesOn, route: routeForPlace(f.livesOn), score: sc });
  }
  // A field name used by several groups (Interest rate (APR) on every debt type) says its group.
  const byLabel = new Map();
  for (const f of fieldHits) byLabel.set(f.label, [...(byLabel.get(f.label) || []), f]);
  for (const list of byLabel.values()) if (list.length > 1) for (const f of list) if (f.group && !f.label.includes(f.group)) f.label = `${f.label} · ${f.group}`;
  out.push(...fieldHits);
  const seen = new Set();
  return out.sort((a, b) => a.score - b.score || (a.kind === 'word' ? 0 : a.label.length - b.label.length))
    .filter(r => { const k = `${r.label}|${r.where}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map(({ score, group, ...r }) => r).slice(0, 12);
}

export function placeOfRecord(r) {
  return ({ income: 'Cash flow › Income', benefit: 'Cash flow › Income', debt: 'Net worth › Debt', account: 'Net worth › Assets', asset: 'Net worth › Assets',
    coverage: 'Net worth › Protection', bill: 'Cash flow › Budget', spending: 'Cash flow › Budget' })[r.kind] || 'Home › About you';
}
