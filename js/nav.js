// Where everything lives (Navigation tab): five tabs, their sub-tabs, and the gear's pages.

export const TABS = [
  { id: 'home', name: 'Home', job: 'This session: before, during, after', subs: [
    { id: 'prep', name: 'Prep' }, { id: 'live', name: 'Live' }, { id: 'wrap-up', name: 'Wrap-up' }] },
  { id: 'my-money', name: 'My Money', job: 'Facts about today', subs: [
    { id: 'profile', name: 'Profile', area: 'needs' }, { id: 'income', name: 'Income', area: 'income' },
    { id: 'debt', name: 'Debt', area: 'debt' }, { id: 'assets', name: 'Assets', area: 'assets' },
    { id: 'protection', name: 'Protection', area: 'goals' }, { id: 'taxes', name: 'Taxes', area: 'taxes' }] },
  { id: 'spending', name: 'Spending', job: 'This month: budget, calendar, close', subs: [
    { id: 'budget', name: 'Budget', area: 'needs' }, { id: 'calendar', name: 'Cash flow calendar', area: 'needs' },
    { id: 'close', name: 'Month-end close', area: 'needs' }] },
  { id: 'plan', name: 'Plan', job: 'The future: goals, timeline, events', subs: [
    { id: 'goals', name: 'Goals', area: 'goals' }, { id: 'timeline', name: 'Timeline', area: 'goals' },
    { id: 'debt-payoff', name: 'Debt payoff', area: 'debt' }, { id: 'next-12-months', name: 'Next 12 months', area: 'goals' },
    { id: 'scenarios', name: 'Scenarios', area: 'goals' }] },
  { id: 'report', name: 'Report', job: 'The report: net worth, metrics, one-pager', subs: [
    { id: 'overview', name: 'Overview' }, { id: 'one-pager', name: 'One-pager' }, { id: 'history', name: 'History' }] },
];
// Behind the gear, never a main tab (R076).
export const TOOLS = { id: 'tools', name: 'Coach tools', job: 'Lists, data and session', subs: [
  { id: 'lists', name: 'Lists' }, { id: 'data', name: 'Data' }, { id: 'session', name: 'Session' }] };

const ALL = [...TABS, TOOLS];

export function parseRoute(hash) {
  const [tabId, subId] = String(hash || '').replace(/^#\/?/, '').split(/[/?]/);
  const tab = ALL.find(t => t.id === tabId) || TABS[0];
  const sub = tab.subs.find(s => s.id === subId) || tab.subs[0];
  return { tab, sub, hash: `#/${tab.id}/${sub.id}` };
}
export const routeOf = (tabId, subId) => `#/${tabId}/${subId}`;

// 'My Money › Debt' (the Fields tab's 'Lives on') to a route.
export function routeForPlace(place) {
  const [tabName, subName] = String(place).split('›').map(s => s.trim());
  if (/coach tools/i.test(place)) return routeOf('tools', 'lists');
  const tab = ALL.find(t => t.name === tabName);
  if (!tab) return null;
  const sub = tab.subs.find(s => s.name === subName) || tab.subs[0];
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
  return ({ income: 'My Money › Income', benefit: 'My Money › Income', debt: 'My Money › Debt', account: 'My Money › Assets', asset: 'My Money › Assets',
    coverage: 'My Money › Protection', bill: 'Spending › Budget', spending: 'Spending › Budget' })[r.kind] || 'My Money › Profile';
}
