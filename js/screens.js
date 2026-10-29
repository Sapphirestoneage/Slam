// Every screen's first state, word for word from the Words and states tab. Later phases fill them in.
import { h, icon } from './ui/dom.js';
import * as S from './ui/staples.js';
import { debtList, spendingList, incomeList, assetList, debtCharts, debtRatios } from './ui/lists.js';
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

// Words: My Money tab, nothing entered.
function fastTrack() {
  return h('div.card', {}, h('div.empty', {},
    S.button('Start Fast Track', { kind: 'primary', size: 'big', disabled: true, why: 'Fast Track is built with My Money, the next build phase' }),
    h('span.muted', {}, 'about 5 minutes'),
    h('span.muted', {}, 'Fast Track is built with My Money (build phase 5).')));
}
const hasAny = (ctx, kinds) => ctx.store.records.some(r => kinds.includes(r.kind));

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
      prepCard('Parking lot notes', notes ? `${notes}` : 'None', null, () => app.openParking()))];
  },
  'home/live': (app, ctx) => app.hasClient
    ? [head('Home', 'Live: the session is on'), moneyInOneLine(app, ctx), center(h('span.title', {}, 'The agenda is built with Home (build phase 9).'),
      S.button('End session', { kind: 'primary', size: 'big', onClick: () => app.go('#/home/wrap-up') }))]
    : [head('Home'), noClient(app)],
  'home/wrap-up': (app, ctx) => app.hasClient
    ? [head('Home', 'Wrap-up'), center(h('span.title', {}, 'Save a snapshot so next session can show what changed.'),
      S.button('Save snapshot', { kind: 'primary', size: 'big', iconName: 'camera', onClick: () => app.snapshot('End of session') }))]
    : [head('Home'), noClient(app)],

  'my-money/profile': (app, ctx) => [head('Profile', 'Why now, what applies, about you'), hasAny(ctx, ['income', 'debt', 'account', 'asset']) ? center(h('span.title', {}, 'Profile questions are built with My Money (build phase 5).')) : fastTrack()],
  'my-money/income': (app, ctx) => [head('Income', 'Paychecks, benefits, variable income'), hasAny(ctx, ['income']) ? null : fastTrack(), S.recordList(ctx, incomeList(ctx.ref))],
  'my-money/debt': (app, ctx) => [head('Debt', 'Every debt and its payoff'), hasAny(ctx, ['debt']) ? null : fastTrack(),
    h('div.visuals', {}, S.recordList(ctx, debtList(ctx.ref)), S.visualsPanel(ctx, { charts: debtCharts, area: 'debt' }))],
  'my-money/assets': (app, ctx) => [head('Assets', 'Cash, investments, car, home'), hasAny(ctx, ['account', 'asset']) ? null : fastTrack(), S.recordList(ctx, assetList(ctx.ref))],
  'my-money/protection': (app, ctx) => [head('Protection', 'Insurance coverage and gaps'), fastTrack(), listEmpty('coverage', 'coverage rows', 'Protection is built with My Money (build phase 5)')],
  'my-money/taxes': (app, ctx) => {
    const m = ctx.metrics();
    return [head('Taxes', 'Filing status, last year, estimates'), fastTrack(),
      S.summaryStrip(ctx, [{ label: 'Take-home a month', result: { id: 'M12', value: m.inputs.takeHome, needs: m.inputs.takeHome === null ? ['take-home'] : [], unit: 'money', text: 'Your take-home pay, from Income.' } },
        { label: 'Effective tax rate', result: { id: 'M14', value: null, needs: ['gross pay', 'filing status'], unit: 'pct' } },
        { label: 'Marginal tax rate', result: { id: 'M14', value: null, needs: ['gross pay', 'filing status'], unit: 'pct' } },
        { label: 'Federal tax a year', result: { id: 'M10', value: null, needs: ['gross pay'] } }])];
  },

  'spending/budget': (app, ctx) => [head('Budget', 'Every spending line and the five passes'), S.recordList(ctx, spendingList(ctx.ref))],
  'spending/calendar': (app, ctx) => [head('Cash flow calendar', 'Day by day, with a running balance'),
    center(h('span.title', {}, 'Add your paychecks and bills to see your month'),
      h('div.row-line', {}, h('a', { href: '#/my-money/income' }, 'Add a paycheck'), h('a', { href: '#/spending/budget' }, 'Add a bill')))],
  'spending/close': (app, ctx) => [head('Month-end close', 'Actuals vs estimates'), listEmpty('closed month', 'closed months', 'Month-end close is built with Spending (build phase 6)')],

  'plan/goals': (app, ctx) => {
    const m = ctx.metrics();
    return [head('Goals', 'FI target, assumptions, milestones'), S.summaryStrip(ctx, [
      { label: 'FI number', result: m.fiNumber }, { label: 'FI date', result: m.monthsToFi, key: 'monthsToFi' },
      { label: 'Coast FI today', result: m.coastFi }, { label: 'Rule of 5 cushion', result: m.ruleOf5 }])];
  },
  'plan/timeline': (app, ctx) => {
    const m = ctx.metrics();
    return [head('Timeline', 'Invested balance rising to your FI number'), m.monthsToFi.value === null ? S.chartEmpty(ctx, m.monthsToFi.needs.length ? m.monthsToFi.needs : ['a plan that reaches FI']) : center(h('span.title', {}, `FI in ${m.monthsToFi.value} months. The timeline chart is built with Plan (build phase 7).`))];
  },
  'plan/debt-payoff': (app, ctx) => [head('Debt payoff', 'Each debt shrinking to zero'), h('div', { style: { maxWidth: '720px' } }, S.visualsPanel(ctx, { charts: [debtCharts[1]], area: 'debt' }))],
  'plan/next-12-months': () => [head('Next 12 months', 'Upcoming events'), listEmpty('event', 'events', 'Events are built with Plan (build phase 7)')],
  'plan/scenarios': () => [head('Scenarios', 'Life event blocks'), listEmpty('scenario', 'scenarios', 'Scenarios are a later phase')],

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
    S.button('Reset client', { kind: 'danger', iconName: 'reset', disabled: !app.hasClient, why: 'No client open', onClick: e => app.resetClient(e.currentTarget) })),
  h('p.muted', { style: { marginTop: '12px' } }, app.backupText()))],
  'tools/session': (app, ctx) => [head('Coach tools', 'Session and settings'), h('div.grid2', {},
    h('div.card', {}, h('h3', {}, 'Snapshot'), S.button('Save snapshot', { kind: 'primary', iconName: 'camera', disabled: !app.hasClient, why: 'No client open', onClick: () => app.snapshot('Snapshot') }),
      h('p.muted', { style: { marginTop: '12px' } }, ctx.store.lastSnapshot() ? `Last: ${ctx.store.lastSnapshot().label}, ${new Date(ctx.store.lastSnapshot().at).toLocaleString()}` : 'No snapshot yet.')),
    h('div.card', {}, h('h3', {}, 'Settings'), h('div.stack', { style: { gap: '12px' } },
      h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Theme'), S.toggle(['System', 'Light', 'Dark'], app.prefs.theme === 'light' ? 'Light' : app.prefs.theme === 'dark' ? 'Dark' : 'System', v => app.setPref('theme', v.toLowerCase()), { label: 'Theme' })),
      h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Density'), S.toggle(['Comfortable', 'Compact'], app.prefs.density === 'compact' ? 'Compact' : 'Comfortable', v => app.setPref('density', v.toLowerCase()), { label: 'Density' })),
      h('div.row-line', {}, h('span.label', { style: { width: '90px' } }, 'Font'), S.toggle([['inter', 'Inter'], ['plex', 'IBM Plex Sans'], ['source', 'Source Sans 3']], app.prefs.font || 'inter', v => app.setPref('font', v), { label: 'Font' })))))],
};

function prepCard(label, text, href = null, onClick = null) {
  const body = h('div.big', { style: { fontSize: text.length > 6 ? '1rem' : '2rem' } }, text);
  return h('div.metric', {}, h('span.label', {}, label), body,
    href ? h('a', { href }, 'Open the list') : onClick ? h('a', { href: '#', onclick: e => { e.preventDefault(); onClick(); } }, 'Open the parking lot') : null);
}

// Sub-tab progress (R162): a small count, or a check when core is done.
export function progressOf(ctx, tabId, subId) {
  const recs = ctx.store.records;
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
