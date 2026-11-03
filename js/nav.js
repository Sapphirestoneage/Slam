// Where everything lives (Navigation tab): five tabs, their sub-tabs, and the gear's pages.

// The DATING spine: Debt + Assets = Net worth; Taxes + Income + Needs = Cash flow; Goals = Plan.
// Cash flow sub-tabs read in waterfall order: Income, Taxes, then Budget, Calendar and Close.
export const TABS = [
  // Home opens Prep (or Live while a session is on, see homeRoute); About you is first in the row, not the landing page.
  { id: 'home', name: 'Home', job: 'This session: who they are, before, during, after', landing: 'prep', subs: [
    { id: 'profile', name: 'About you', area: 'needs' }, { id: 'prep', name: 'Prep' }, { id: 'live', name: 'Live' }, { id: 'wrap-up', name: 'Wrap-up' }] },
  { id: 'net-worth', name: 'Net worth', job: 'What you own and owe', subs: [
    { id: 'assets', name: 'Assets', area: 'assets' }, { id: 'debt', name: 'Debt', area: 'debt' }, { id: 'protection', name: 'Protection', area: 'goals' }] },
  { id: 'cash-flow', name: 'Cash flow', job: 'Money in and out: income, taxes, budget, calendar, close', subs: [
    { id: 'income', name: 'Income', area: 'income' }, { id: 'taxes', name: 'Taxes', area: 'taxes' }, { id: 'budget', name: 'Budget', area: 'needs' },
    { id: 'calendar', name: 'Calendar', area: 'needs' }, { id: 'close', name: 'Month end', area: 'needs' }] },
  { id: 'plan', name: 'Plan', job: 'The future: goals, timeline, events', subs: [
    { id: 'goals', name: 'Goals', area: 'goals' }, { id: 'foo', name: 'FOO', area: 'goals' }, { id: 'timeline', name: 'Timeline', area: 'goals' },
    { id: 'debt-payoff', name: 'Debt payoff', area: 'debt' }, { id: 'next-12-months', name: 'Next 12 months', area: 'goals' },
    { id: 'scenarios', name: 'Scenarios', area: 'goals' }] },
  { id: 'report', name: 'Report', job: 'The report: net worth, metrics, one-pager', subs: [
    { id: 'overview', name: 'Overview' }, { id: 'statements', name: 'Statements' }, { id: 'one-pager', name: 'One-pager' }, { id: 'history', name: 'History' }] },
];
// Old homes (My Money and Spending) still open: bookmarks, saved links and old Lives on text land on the new home.
export const MOVED = {
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

export function parseRoute(hash) {
  let [tabId, subId] = String(hash || '').replace(/^#\/?/, '').split(/[/?]/);
  const moved = MOVED[`${tabId}/${subId}`] ?? MOVED[tabId];
  if (moved) [tabId, subId] = moved.split('/');
  const tab = ALL.find(t => t.id === tabId) || TABS[0];
  const sub = tab.subs.find(s => s.id === subId) || tab.subs.find(s => s.id === tab.landing) || tab.subs[0];
  return { tab, sub, hash: `#/${tab.id}/${sub.id}` };
}
export const routeOf = (tabId, subId) => `#/${tabId}/${subId}`;
// Where a tab's own button goes: its landing page; Home goes to Live while a session is on.
export const tabRoute = (t, { inSession = false } = {}) => (t.id === 'home' ? (inSession ? '#/home/live' : '#/home/prep') : routeOf(t.id, t.landing ?? t.subs[0].id));

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

// Find (R168 '/'): fields, screens and the client's own records, best match first.
export function search(query, { fields = [], records = [] } = {}) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = text => {
    const t = text.toLowerCase();
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    if (t.split(/[\s(/,]+/).some(w => w.startsWith(q))) return 2;
    return t.includes(q) ? 3 : null;
  };
  const out = [];
  for (const t of ALL) for (const s of t.subs) {
    const sc = score(s.name);
    if (sc !== null) out.push({ kind: 'screen', label: s.name, where: `${t.name} › ${s.name}`, route: routeOf(t.id, s.id), score: sc });
  }
  for (const r of records) {
    const sc = score(r.name || '') ?? score(r.type || '');
    if (sc !== null) out.push({ kind: 'record', id: r.id, label: r.name || r.type, where: placeOfRecord(r), route: routeForPlace(placeOfRecord(r)), score: sc });
  }
  for (const f of fields) {
    const sc = score(f.field) ?? (score(f.group || '') !== null ? 4 : null);
    if (sc !== null) out.push({ kind: 'field', id: f.id, label: f.field, where: f.livesOn, route: routeForPlace(f.livesOn), score: sc });
  }
  return out.sort((a, b) => a.score - b.score || a.label.length - b.label.length).slice(0, 12);
}

export function placeOfRecord(r) {
  return ({ income: 'Cash flow › Income', benefit: 'Cash flow › Income', debt: 'Net worth › Debt', account: 'Net worth › Assets', asset: 'Net worth › Assets',
    coverage: 'Net worth › Protection', bill: 'Cash flow › Budget', spending: 'Cash flow › Budget' })[r.kind] || 'Home › About you';
}
