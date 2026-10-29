// Every screen's first state, word for word from the Words and states tab. Later phases fill them in.
import { h, icon } from './ui/dom.js';
import * as S from './ui/staples.js';
import { debtList, spendingList, debtCharts, debtRatios } from './ui/lists.js';
import { incomeList, benefitList, variableBlock, assetList, protectionList, taxesScreen, listCompletion, incomeCharts, assetCharts } from './ui/money-lists.js';
import { profileScreen, profileCompletion } from './ui/profile.js';
import { startFastTrack } from './ui/fasttrack-ui.js';
import { budgetScreen, calendarScreen, closeScreen } from './ui/spending-ui.js';
import { goalsScreen, timelineScreen, payoffScreen, nextYearScreen, scenariosScreen } from './ui/plan-ui.js';
import { AREAS } from './gates.js';
import { keyNumbers } from './math/metrics.js';
import { statusOf, countsAsDone } from './records.js';
import { money } from './format.js';

const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const center = (...kids) => h('div.card', {}, h('div.empty.center', {}, ...kids));
const listEmpty = (one, plural, why) => h('div.list', {}, h('div.empty', {}, h('span.title', {}, `No ${plural} yet`),
  S.button(`Add ${one}`, { iconName: 'plus', disabled: true, why })));

// Words: Home (no client).
export function noClient(app) {
  return center(h('span.title', {}, 'Start with a new client'),
    S.button('New client', { kind: 'primary', size: 'big', iconName: 'plus', onClick: e => app.newClient(e.currentTarget) }),
    S.button('Try with example numbers', { onClick: () => app.loadDemo() }));
}

// Words: My Money tab, nothing entered. Fast Track is the one main button.
function fastTrack(app, ctx) {
  return h('div.card', {}, h('div.empty', {},
    S.button('Start Fast Track', { kind: 'primary', size: 'big', onClick: () => startFastTrack(app, ctx) }),
    h('span.muted', {}, 'about 5 minutes')));
}
const hasAny = (ctx, kinds) => ctx.store.records.some(r => kinds.includes(r.kind));

// ---------- My Money (build phase 5) ----------
// Two bars per section: core (Primary fields) and full detail (everything that applies) (R065).
function completion(c) {
  const bar = (label, x) => h('span.row-line', { style: { gap: '8px', flexWrap: 'nowrap' } }, h('span.label', {}, label),
    h('div.progress', { role: 'progressbar', 'aria-valuenow': x.of ? Math.round(x.done / x.of * 100) : 0, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': label }, h('span', { style: { width: `${x.of ? x.done / x.of * 100 : 0}%` } })),
    h('span.label', {}, `${x.done} of ${x.of}`));
  if (!c.core.of && !c.full.of) return null;
  // What is still missing, in words, behind a caret so the page stays calm.
  const left = [...(c.core.missing || []).map(x => ['Core', x]), ...(c.full.missing || []).filter(x => !(c.core.missing || []).includes(x)).map(x => ['Full detail', x])];
  return h('div.completion-wrap', {}, h('div.completion', {}, bar('Core', c.core), bar('Full detail', c.full)),
    left.length ? S.moreBlock(`missing:${location.hash}`, () => h('ul.missing', {}, left.map(([k, x]) => h('li', {}, h('span.tag.plain', {}, k), ' ', x))), { label: `What's missing (${left.length})` }) : null);
}
// R015: an area turned off on the Profile leaves a slim way back.
const addArea = (app, ctx, k, label) => h('a.add-area', { href: '#', onclick: e => {
  e.preventDefault();
  const p = ctx.store.doc.profile;
  ctx.store.setDoc('profile', { areas: { ...(p.areas || {}), [k]: true }, noneOfThese: false });
  S.toast(`${label} is back.`, { undo: () => ctx.store.undo() });
} }, `+ Add ${label.toLowerCase()}`);
const offAreas = (app, ctx, keys) => {
  const g = ctx.gates();
  const off = AREAS.filter(([k]) => keys.includes(k) && g.areas[k] === false);
  return off.length ? h('div.row-line.off-areas', {}, h('span.muted', {}, 'Turned off on the Profile:'), off.map(([k, label]) => addArea(app, ctx, k, label))) : null;
};
const MM = {
  profile: { title: 'Profile', sub: 'Why now, what applies, about you', body: (app, ctx) => [completion(profileCompletion(ctx.store.doc)), ...profileScreen(app, ctx)] },
  income: { title: 'Income', sub: 'Paychecks, benefits, variable income', body: (app, ctx) => {
    const g = ctx.gates();
    return [completion(listCompletion(ctx, r => r.kind === 'income' || r.kind === 'benefit', ['amount'])), hasAny(ctx, ['income']) ? null : fastTrack(app, ctx),
      g.betweenJobs && !ctx.store.find(r => r.kind === 'income' && r.type === 'Unemployment').length
        ? h('div.banner-inline', {}, 'Between jobs: add unemployment benefits so the runway counts them.', S.button('Add unemployment', { iconName: 'plus', onClick: () => ctx.store.add('income', { name: 'Unemployment benefits', per: 'week' }, { type: 'Unemployment' }) })) : null,
      h('div.visuals', {}, S.recordList(ctx, incomeList()), S.visualsPanel(ctx, { charts: incomeCharts, area: 'income' })),
      g.variable ? variableBlock(ctx) : null,
      S.recordList(ctx, benefitList())];
  } },
  debt: { title: 'Debt', sub: 'Every debt and its payoff', body: (app, ctx) => (ctx.gates().areas.debt === false
    ? [h('div.card', {}, h('div.empty', {}, h('span.title', {}, 'No debt, per the Profile'), addArea(app, ctx, 'debt', 'Debt')))]
    : [completion(listCompletion(ctx, r => r.kind === 'debt', ['balance', 'apr'])), hasAny(ctx, ['debt']) ? null : fastTrack(app, ctx),
      h('div.visuals', {}, S.recordList(ctx, debtList(ctx.ref)), S.visualsPanel(ctx, { charts: debtCharts, area: 'debt' }))]) },
  assets: { title: 'Assets', sub: 'Cash, investments, car, home', body: (app, ctx) => [
    completion(listCompletion(ctx, r => r.kind === 'account' || r.kind === 'asset', r => [r.kind === 'asset' ? 'value' : 'balance'])),
    hasAny(ctx, ['account', 'asset']) ? null : fastTrack(app, ctx), offAreas(app, ctx, ['cash', 'investments', 'real']),
    h('div.visuals', {}, S.recordList(ctx, assetList(ctx.ref)), S.visualsPanel(ctx, { charts: assetCharts, area: 'assets' }))] },
  protection: { title: 'Protection', sub: 'Insurance coverage and gaps', body: (app, ctx) => [completion(listCompletion(ctx, r => r.kind === 'coverage', ['have'])), S.recordList(ctx, protectionList())] },
  taxes: { title: 'Taxes', sub: 'Filing status, last year, estimates', body: (app, ctx) => [h('div.visuals', {}, taxesScreen(ctx), S.visualsPanel(ctx, { charts: [incomeCharts[0]], area: 'taxes' }))] },
};
// One page (X013): every My Money section on one page, each under its own heading.
function myMoney(id) {
  return (app, ctx) => {
    if (!app.hasClient) return [head('My Money'), noClient(app)];
    if (!app.prefs.onePage) { const s = MM[id]; return [head(s.title, s.sub), ...s.body(app, ctx)]; }
    const g = ctx.gates();
    return [head('My Money', 'One page: every question, top to bottom'),
      ...Object.entries(MM).filter(([k]) => k !== 'debt' || g.areas.debt !== false).map(([k, s]) => h('div.one-page-part', { id: `mm-${k}` }, h('h1.part-title', {}, s.title), ...s.body(app, ctx)))];
  };
}

function moneyInOneLine(app, ctx) { // Mockup: exactly four numbers
  const m = ctx.metrics();
  const sentence = m.surplus.value !== null && m.monthsToFi.value !== null
    ? `You keep ${money(m.surplus.value)} a month and are on track for FI${m.inputs.age !== null ? ` at ${Math.floor(m.inputs.age + m.monthsToFi.value / 12)}` : ` in ${m.monthsToFi.value} months`}.` : null;
  return h('section.section', {}, h('div.section-title', {}, h('h2', {}, 'Money in one line')),
    sentence ? h('p', { style: { fontSize: '1.125rem', fontWeight: 600 } }, sentence) : null,
    S.summaryStrip(ctx, [
      { label: 'Net worth', result: m.netWorth, key: 'netWorth' },
      { label: 'Monthly surplus', result: m.surplus, key: 'surplus' },
      { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate' },
      { label: 'FI date', result: m.monthsToFi, key: 'monthsToFi' }]));
}

export const SCREENS = {
  'home/prep': (app, ctx) => {
    if (!app.hasClient) return [head('Home', 'This session: before, during, after'), noClient(app)];
    const recs = ctx.store.records;
    const homework = recs.filter(r => r.status === 'Will email' || Object.values(r.fieldStatus).includes('Will email')).length;
    const due = app.dueForCheck().length;
    const notes = ctx.store.doc.parking.filter(n => !n.filedTo).length;
    return [head('Home', `Prep for ${ctx.store.doc.client.name}`,
      S.button('Start session', { kind: 'primary', size: 'big', onClick: () => app.go('#/home/live') })),
    moneyInOneLine(app, ctx),
    h('div.strip', {},
      prepCard('What changed since last time', ctx.store.lastSnapshot() ? 'See the arrows under Money in one line' : 'Nothing yet: no snapshot to compare with'),
      prepCard('Open homework', homework ? `${homework}` : 'None', '#/tools/lists'),
      prepCard('Due for a check', due ? `${due}` : 'None', '#/tools/lists'),
      prepCard('Parking lot notes', notes ? `${notes}` : 'None', null, () => app.openParking())),
    ctx.gates().betweenJobs ? S.summaryStrip(ctx, [{ label: 'Runway (between jobs)', result: ctx.metrics().runwayMonths, render: r => `${r.value.toFixed(1)} months` }]) : null]; // R006
  },
  'home/live': (app, ctx) => app.hasClient
    ? [head('Home', 'Live: the session is on'), moneyInOneLine(app, ctx), center(h('span.title', {}, 'The agenda is built with Home (build phase 9).'),
      S.button('End session', { kind: 'primary', size: 'big', onClick: () => app.go('#/home/wrap-up') }))]
    : [head('Home'), noClient(app)],
  'home/wrap-up': (app, ctx) => app.hasClient
    ? [head('Home', 'Wrap-up'), center(h('span.title', {}, 'Save a snapshot so next session can show what changed.'),
      S.button('Save snapshot', { kind: 'primary', size: 'big', iconName: 'camera', onClick: () => app.snapshot('End of session') }))]
    : [head('Home'), noClient(app)],

  'my-money/profile': myMoney('profile'),
  'my-money/income': myMoney('income'),
  'my-money/debt': myMoney('debt'),
  'my-money/assets': myMoney('assets'),
  'my-money/protection': myMoney('protection'),
  'my-money/taxes': myMoney('taxes'),

  'spending/budget': (app, ctx) => (app.hasClient ? budgetScreen(app, ctx) : [head('Budget'), noClient(app)]),
  'spending/calendar': (app, ctx) => (app.hasClient ? calendarScreen(app, ctx) : [head('Cash flow calendar'), noClient(app)]),
  'spending/close': (app, ctx) => (app.hasClient ? closeScreen(app, ctx) : [head('Month-end close'), noClient(app)]),

  'plan/goals': (app, ctx) => (app.hasClient ? goalsScreen(app, ctx) : [head('Goals'), noClient(app)]),
  'plan/timeline': (app, ctx) => (app.hasClient ? timelineScreen(app, ctx) : [head('Timeline'), noClient(app)]),
  'plan/debt-payoff': (app, ctx) => (app.hasClient ? payoffScreen(app, ctx) : [head('Debt payoff'), noClient(app)]),
  'plan/next-12-months': (app, ctx) => (app.hasClient ? nextYearScreen(app, ctx) : [head('Next 12 months'), noClient(app)]),
  'plan/scenarios': () => scenariosScreen(),

  'report/overview': (app, ctx) => {
    const m = ctx.metrics();
    return [head('Overview', 'Read only. Every number links to its home'), S.summaryStrip(ctx, [
      { label: 'Net worth', result: m.netWorth, key: 'netWorth' }, { label: 'Liquid net worth', result: m.liquidNetWorth },
      { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate' }, { label: 'Runway', result: m.runwayMonths, render: r => `${r.value.toFixed(1)} months` }]),
    (() => { const r = debtRatios(ctx, m); return S.summaryStrip(ctx, [{ label: 'Debt-to-income', result: r.dti }, { label: 'Utilization', result: r.util }]); })(),
    m.surplus.value === null ? S.chartEmpty(ctx, m.surplus.needs) : center(h('span.title', {}, 'The cash flow chart is built with Report (build phase 8).'))];
  },
  'report/one-pager': (app, ctx) => [head('One-pager', 'Session summary'), moneyInOneLine(app, ctx)],
  'report/history': (app, ctx) => {
    const snaps = ctx.store.doc.snapshots;
    return [head('History', 'Snapshots over time'), snaps.length
      ? h('div.card', {}, h('table.rows', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Snapshot'), h('th', {}, 'When'), h('th.num', {}, 'Net worth'))),
        h('tbody', {}, snaps.map(s => h('tr', {}, h('td', {}, s.label), h('td', {}, new Date(s.at).toLocaleString()), h('td.num', {}, money(s.metrics?.netWorth)))))))
      : h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'No snapshots yet'), S.button('Save snapshot', { iconName: 'camera', onClick: () => app.snapshot('Snapshot') })))];
  },

  'tools/lists': (app, ctx) => {
    const revisit = app.dueForCheck();
    const homework = ctx.store.records.filter(r => r.status === 'Will email');
    return [head('Coach tools', 'Lists'), h('div.grid2', {},
      h('div.section', {}, h('div.section-title', {}, h('h2', {}, 'Revisit list')), revisit.length
        ? h('div.card', {}, revisit.map(r => h('div.row-line', {}, h('span', {}, r.label), S.statusTag(r.status), h('a', { href: r.route }, 'Fix now'))))
        : h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'Nothing to revisit yet')))),
      h('div.section', {}, h('div.section-title', {}, h('h2', {}, 'Homework list')), homework.length
        ? h('div.card', {}, homework.map(r => h('div', {}, r.name || r.type)))
        : h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'No homework yet')))))];
  },
  'tools/data': (app, ctx) => [head('Coach tools', 'Export, import and reset'), h('div.card', {}, h('div.row-line', {},
    S.button('Export', { kind: 'primary', iconName: 'download', onClick: () => app.exportNow() }),
    S.button('Import', { iconName: 'upload', onClick: () => app.importFile() }),
    S.button('Reset client', { kind: 'danger', iconName: 'reset', disabled: !app.hasClient, why: 'No client open', onClick: e => app.resetClient(e.currentTarget) }),
    S.button('Delete client', { kind: 'danger', iconName: 'trash', disabled: !app.hasClient, why: 'No client open', onClick: e => app.deleteClient(e.currentTarget) })),
  h('p.muted', { style: { marginTop: '12px' } }, app.backupText()))],
  'tools/session': (app, ctx) => [head('Coach tools', 'Session and settings'), h('div.grid2', {},
    h('div.card', {}, h('h3', {}, 'Snapshot'), S.button('Save snapshot', { kind: 'primary', iconName: 'camera', disabled: !app.hasClient, why: 'No client open', onClick: () => app.snapshot('Snapshot') }),
      h('p.muted', { style: { marginTop: '12px' } }, ctx.store.lastSnapshot() ? `Last: ${ctx.store.lastSnapshot().label}, ${new Date(ctx.store.lastSnapshot().at).toLocaleString()}` : 'No snapshot yet.')),
    fastTrackGap(ctx),
    h('div.card', {}, h('h3', {}, 'Settings'), h('div.stack', { style: { gap: '12px' } },
      h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Theme'), S.toggle(['System', 'Light', 'Dark'], app.prefs.theme === 'light' ? 'Light' : app.prefs.theme === 'dark' ? 'Dark' : 'System', v => app.setPref('theme', v.toLowerCase()), { label: 'Theme' })),
      h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Density'), S.toggle(['Comfortable', 'Compact'], app.prefs.density === 'compact' ? 'Compact' : 'Comfortable', v => app.setPref('density', v.toLowerCase()), { label: 'Density' })),
      h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Font'), S.toggle([['inter', 'Inter'], ['plex', 'IBM Plex Sans'], ['source', 'Source Sans 3']], app.prefs.font || 'inter', v => app.setPref('font', v), { label: 'Font' })))))],
};

// R069: Fast Track should land within $100 a month of the full answer. Its numbers are kept; this shows the gap.
function fastTrackGap(ctx) {
  const ft = ctx.store.doc.settings.fastTrack;
  if (!ft?.result) return h('div.card', {}, h('h3', {}, 'Fast Track accuracy'), h('p.muted', {}, 'No Fast Track run yet.'));
  const now = keyNumbers(ctx.metrics());
  const gap = ft.result.surplus === null || now.surplus === null ? null : now.surplus - ft.result.surplus;
  return h('div.card', {}, h('h3', {}, 'Fast Track accuracy'),
    h('p', {}, `Fast Track (${new Date(ft.at).toLocaleDateString()}${ft.seconds ? `, ${Math.round(ft.seconds / 60)} min` : ''}) said ${money(ft.result.surplus)} a month surplus; now ${money(now.surplus)}.`),
    gap === null ? h('p.muted', {}, 'Needs a surplus on both sides to compare.')
      : h('p', {}, Math.abs(gap) <= 100 ? S.statusTag('Know it') : S.warnTag('Over $100'), ` Gap: ${money(Math.abs(gap))} a month (target: within $100).`));
}

function prepCard(label, text, href = null, onClick = null) {
  const body = h('div.big', { style: { fontSize: text.length > 6 ? '1rem' : '2rem' } }, text);
  return h('div.metric', {}, h('span.label', {}, label), body,
    href ? h('a', { href }, 'Open the list') : onClick ? h('a', { href: '#', onclick: e => { e.preventDefault(); onClick(); } }, 'Open the parking lot') : null);
}

// Sub-tab progress (R162): a small count, or a check when core is done.
export function progressOf(ctx, tabId, subId) {
  const recs = ctx.visible(() => true);
  const core = (kinds, fields) => {
    const rows = recs.filter(r => kinds.includes(r.kind));
    if (!rows.length) return null;
    return { done: rows.filter(r => fields.every(f => countsAsDone(statusOf(r, f)))).length, of: rows.length };
  };
  if (tabId === 'my-money') {
    if (subId === 'income') return core(['income'], ['amount']);
    if (subId === 'debt') return core(['debt'], ['balance', 'apr']);
    if (subId === 'assets') {
      const rows = recs.filter(r => r.kind === 'account' || r.kind === 'asset');
      if (!rows.length) return null;
      return { done: rows.filter(r => countsAsDone(statusOf(r, r.kind === 'asset' ? 'value' : 'balance'))).length, of: rows.length };
    }
  }
  if (tabId === 'spending' && subId === 'budget') return core(['bill', 'spending'], ['amount']);
  return null;
}
export { keyNumbers, icon };
