// SPDX-License-Identifier: AGPL-3.0-only
// Every screen's first state, word for word from the Words and states tab. Later phases fill them in.
import { h, icon } from './ui/dom.js';
import { paycheckSection } from './ui/paycheck-ui.js';
import * as S from './ui/staples.js';
import { sheetButtons } from './ui/sheet-ui.js';
import { creditCard, cardsLink, debtList, spendingList, debtCharts, debtRatios } from './ui/lists.js';
import { incomeList, benefitList, variableBlock, assetList, protectionList, taxesScreen, lifeAdminScreen, listCompletion, incomeCharts, assetCharts } from './ui/money-lists.js';
import { profileScreen, profileCompletion } from './ui/profile.js';
import { startFastTrack } from './ui/fasttrack-ui.js';
import { budgetScreen, calendarScreen, closeScreen } from './ui/spending-ui.js';
import { homeScreen } from './ui/home-ui.js';
import { listsScreen, sessionScreen, discoveryScreen } from './ui/tools-ui.js';
import { overviewScreen, onePagerScreen, historyScreen } from './ui/report-ui.js';
import { statementsScreen } from './ui/statements-ui.js';
import { layersCard } from './ui/layers-ui.js';
import { fooScreen } from './ui/foo-ui.js';
import { goalsScreen, timelineScreen, payoffScreen, nextYearScreen, scenariosScreen } from './ui/plan-ui.js';
import { AREAS } from './gates.js';
import { keyNumbers } from './math/metrics.js';
import { statusOf, countsAsDone } from './records.js';
import { money } from './format.js';
import { needs } from './math/result.js';
import { flowOf } from './math/metrics.js';
import { setAsideOf } from './payday.js';

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

// Words: Net worth or Cash flow, nothing entered. Fast Track is the one main button.
function fastTrack(app, ctx) {
  return h('div.card', {}, h('div.empty', {},
    S.button('Start Fast Track', { kind: 'primary', size: 'big', onClick: () => startFastTrack(app, ctx) }),
    h('span.muted', {}, 'about 5 minutes')));
}
const hasAny = (ctx, kinds) => ctx.store.records.some(r => kinds.includes(r.kind));

// ---------- The sections (build phase 5), now under Home, Net worth and Cash flow ----------
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
  return off.length ? h('div.row-line.off-areas', {}, h('span.muted', {}, 'Turned off in About you:'), off.map(([k, label]) => addArea(app, ctx, k, label))) : null;
};
// A list with its chart; in session-1 focus mode the chart waits under More detail (polish item 4).
const withChart = (ctx, list, charts, area) => (S.focusOn(ctx)
  ? [S.recordList(ctx, list), S.focusMore(ctx, `chart:${area}`, S.visualsPanel(ctx, { charts, area }))]
  : h('div.visuals', {}, S.recordList(ctx, list), S.visualsPanel(ctx, { charts, area })));
const MM = {
  profile: { title: 'About you', sub: 'Why now, what applies, about you', body: (app, ctx) => [completion(profileCompletion(ctx.store.doc)), ...profileScreen(app, ctx)] },
  income: { title: 'Income', sub: 'Paychecks, benefits, variable income', body: (app, ctx) => {
    const g = ctx.gates();
    return [completion(listCompletion(ctx, r => r.kind === 'income' || r.kind === 'benefit', ['amount'])), hasAny(ctx, ['income']) ? null : fastTrack(app, ctx),
      g.betweenJobs && !ctx.store.find(r => r.kind === 'income' && r.type === 'Unemployment').length
        ? h('div.banner-inline', {}, 'Between jobs: add unemployment benefits so the runway counts them.', S.button('Add unemployment', { iconName: 'plus', onClick: () => ctx.store.add('income', { name: 'Unemployment benefits', per: 'week' }, { type: 'Unemployment' }) })) : null,
      withChart(ctx, incomeList(), incomeCharts, 'income'),
      S.live(ctx, () => paycheckSection(ctx)), // answer to 58: everything the paycheck pays first, in one place
      S.focusMore(ctx, 'income:extra', [g.variable ? variableBlock(ctx) : null, S.recordList(ctx, benefitList())].filter(Boolean))];
  } },
  debt: { title: 'Debt', sub: 'Every debt and its payoff', body: (app, ctx) => (ctx.gates().areas.debt === false
    ? [h('div.card', {}, h('div.empty', {}, h('span.title', {}, 'No debt, per About you'), addArea(app, ctx, 'debt', 'Debt')))]
    : [completion(listCompletion(ctx, r => r.kind === 'debt', ['balance', 'apr'])), hasAny(ctx, ['debt']) ? null : fastTrack(app, ctx),
      withChart(ctx, debtList(ctx.ref, { cards: 'none' }), debtCharts, 'debt'), S.live(ctx, () => cardsLink(ctx))]) },
  // Answer to 56: credit cards are standard debt with a sub-tab of their own: the cards, utilization, the score.
  'credit-cards': { title: 'Credit cards', sub: 'Every card, how much of the limits you use, your score', body: (app, ctx) => (ctx.gates().areas.debt === false
    ? [h('div.card', {}, h('div.empty', {}, h('span.title', {}, 'No debt, per About you'), addArea(app, ctx, 'debt', 'Debt')))]
    : [completion(listCompletion(ctx, r => r.kind === 'debt' && r.type === 'Credit card', ['balance', 'apr'])),
      S.recordList(ctx, debtList(ctx.ref, { cards: 'only' })), S.live(ctx, () => creditCard(ctx))]) },
  assets: { title: 'Assets', sub: 'Cash, investments, car, home', body: (app, ctx) => [
    completion(listCompletion(ctx, r => r.kind === 'account' || r.kind === 'asset', r => [r.kind === 'asset' ? 'value' : 'balance'])),
    hasAny(ctx, ['account', 'asset']) ? null : fastTrack(app, ctx), offAreas(app, ctx, ['cash', 'investments', 'real']),
    withChart(ctx, assetList(ctx.ref), assetCharts, 'assets'),
    S.moreBlock('assets:layers', () => S.live(ctx, () => layersCard(ctx)), { label: 'Cash layers: little e, gaps, big e' })] },
  protection: { title: 'Protection', sub: 'Insurance coverage, gaps and life admin', body: (app, ctx) => [completion(listCompletion(ctx, r => r.kind === 'coverage', ['have'])), S.recordList(ctx, protectionList()), S.moreBlock('protection:life-admin', () => S.live(ctx, () => lifeAdminScreen(ctx)), { label: 'Life admin' })] },
  taxes: { title: 'Taxes', sub: 'Filing status, last year, estimates', body: (app, ctx) => [h('div.visuals', {}, taxesScreen(ctx), S.visualsPanel(ctx, { charts: [incomeCharts[0]], area: 'taxes' }))] },
};
// Headline strips (reorganize pass). Net worth: what you own and owe. Cash flow: the waterfall, top to bottom.
const sumOf = (list, f) => list.reduce((t, x) => t + (f(x) ?? 0), 0);
const okMoney = (id, value, text) => ({ id, value, needs: [], unit: 'money', text });
export function netWorthStrip(ctx) {
  const m = ctx.metrics(), x = m.inputs;
  const owned = [...x.accounts, ...x.things].filter(a => a.value != null);
  const owed = x.debts.filter(d => d.balance != null);
  const list = (rows, f) => rows.map(r => `${r.name} ${money(f(r))}`).join(' + ');
  const assets = owned.length ? okMoney('M40', sumOf(owned, a => a.value), `${list(owned, a => a.value)} = ${money(sumOf(owned, a => a.value))}.`)
    : x.none ? okMoney('M40', 0, 'None of these: no assets.') : needs('M40', ['an asset balance'], { unit: 'money' });
  const debt = owed.length ? okMoney('M30', sumOf(owed, d => d.balance), `${list(owed, d => d.balance)} = ${money(sumOf(owed, d => d.balance))}.`)
    : x.none || x.gates.areas.debt === false ? okMoney('M30', 0, 'No debt, per About you.') : needs('M30', ['a debt balance'], { unit: 'money' });
  return S.summaryStrip(ctx, [
    { label: 'Total net worth', result: m.netWorth, key: 'netWorth' },
    { label: 'Liquid net worth', result: m.liquidNetWorth, key: 'liquidNetWorth' },
    { label: 'Total assets', result: assets, home: '#/net-worth/assets' },
    { label: 'Total debt', result: debt, key: 'debtTotal', lowerIsGood: true, home: '#/net-worth/debt' }]);
}
// Every step is a Show the math button; take-home and free are the totals.
export function cashFlowStrip(ctx) {
  const m = ctx.metrics();
  const f = flowOf(m.inputs, { pretaxSaving: m.pretaxSaving, setAside: setAsideOf(ctx.store.doc, ctx.ref, ctx.now()).total }); // goals and sinking funds are savings
  const step = (label, v, text, { sign = '', total = false, home = null } = {}) => h(`div.wf-step${total ? '.total' : ''}`, {},
    home ? h('a.label.metric-home', { href: home }, label) : h('span.label', {}, label),
    h('div.wf-num', {}, v === null ? h('span.muted', {}, '–') : [sign ? h('span.wf-sign', { 'aria-hidden': 'true' }, sign) : null, S.mathButton({ id: 'Cash flow', value: v, needs: [], text }, money(v))]));
  const gut = f.source !== 'lines';
  return h('div.card.waterfall', { role: 'group', 'aria-label': 'Cash flow, top to bottom' },
    step('Gross', f.gross, 'Every paycheck before tax, a month.', { home: '#/cash-flow/income' }),
    step(f.premiums ? 'Taxes and premiums' : 'Taxes', f.taxes, `Gross minus what is saved from the paycheck minus take-home${f.premiums ? `, including ${money(f.premiums)} of premiums from the paycheck` : ''}.`, { sign: '−', home: '#/cash-flow/taxes' }),
    step('Saved from paycheck', f.beforeTax, '401(k) (traditional or Roth) and HSA money taken from the paycheck, a month. A Roth 401(k) is taxed first, so it does not lower your tax.', { sign: '−' }),
    step('Take-home', f.takeHome, 'What lands in checking each month.', { sign: '=', total: true, home: '#/cash-flow/income' }),
    gut ? step('Spending', f.spending, 'The gut number (switch to the lines under Settings for this budget).', { sign: '−', home: '#/cash-flow/budget' })
      : [step('Fixed', f.fixed, 'Lines marked Fixed, your share, plus debt payments.', { sign: '−', home: '#/cash-flow/budget' }),
        step('Variable', f.variable, 'Every other line, your share.', { sign: '−', home: '#/cash-flow/budget' })],
    step('Savings', f.savings, 'Retirement lines, after-tax contributions, savings goals and sinking funds, a month.', { sign: '−' }),
    step('Free', f.free, 'Take-home minus spending minus savings.', { sign: '=', total: true }));
}

const NET_WORTH = { assets: MM.assets, debt: MM.debt, 'credit-cards': MM['credit-cards'], protection: MM.protection };
const own = (title, fn) => ({ title, ownHead: true, body: (app, ctx) => [fn(app, ctx)].flat() });
const CASH_FLOW = { income: MM.income, taxes: MM.taxes, budget: own('Budget', budgetScreen), calendar: own('Calendar', calendarScreen), close: own('Month end', closeScreen) };
const TAB_PARTS = { 'net-worth': [NET_WORTH, netWorthStrip, 'Net worth'], 'cash-flow': [CASH_FLOW, cashFlowStrip, 'Cash flow'] };
// One page (X013): every part of a tab top to bottom, each under its own heading. Net worth and Cash flow each have one.
function tabPage(tabId, id) {
  return (app, ctx) => {
    const [parts, strip, name] = TAB_PARTS[tabId];
    if (!app.hasClient) return [head(parts[id].title), noClient(app)];
    const top = S.live(ctx, () => strip(ctx));
    if (!app.prefs[`onePage-${tabId}`]) { const s = parts[id]; return [s.ownHead ? null : head(s.title, s.sub), top, ...s.body(app, ctx)]; }
    const g = ctx.gates();
    return [head(name, 'One page: every part, top to bottom'), top,
      ...Object.entries(parts).filter(([k]) => (k !== 'debt' && k !== 'credit-cards') || g.areas.debt !== false).map(([k, s]) => h('div.one-page-part', { id: `part-${k}` }, h('h1.part-title', {}, s.title), ...s.body(app, ctx)))];
  };
}

export const SCREENS = {
  'home/session': (app, ctx) => (app.hasClient ? homeScreen(app, ctx) : [head('Home', 'The program: where this client is, what we are doing today, the next small thing'), noClient(app)]),

  // About you is the first stop: its answers decide what shows everywhere.
  'home/profile': (app, ctx) => (app.hasClient ? [head('About you', MM.profile.sub), ...MM.profile.body(app, ctx)] : [head('About you'), noClient(app)]),

  'net-worth/assets': tabPage('net-worth', 'assets'),
  'net-worth/debt': tabPage('net-worth', 'debt'),
  'net-worth/credit-cards': tabPage('net-worth', 'credit-cards'),
  'net-worth/protection': tabPage('net-worth', 'protection'),

  'cash-flow/income': tabPage('cash-flow', 'income'),
  'cash-flow/taxes': tabPage('cash-flow', 'taxes'),
  'cash-flow/budget': tabPage('cash-flow', 'budget'),
  'cash-flow/calendar': tabPage('cash-flow', 'calendar'),
  'cash-flow/close': tabPage('cash-flow', 'close'),

  'plan/goals': (app, ctx) => (app.hasClient ? goalsScreen(app, ctx) : [head('Goals'), noClient(app)]),
  'plan/foo': (app, ctx) => (app.hasClient ? fooScreen(app, ctx, { flags: app.flags }) : [head('FOO'), noClient(app)]),
  'plan/timeline': (app, ctx) => (app.hasClient ? timelineScreen(app, ctx) : [head('Timeline'), noClient(app)]),
  'plan/debt-payoff': (app, ctx) => (app.hasClient ? payoffScreen(app, ctx) : [head('Debt payoff'), noClient(app)]),
  'plan/next-12-months': (app, ctx) => (app.hasClient ? nextYearScreen(app, ctx) : [head('Next 12 months'), noClient(app)]),
  'plan/scenarios': () => scenariosScreen(),

  'report/overview': (app, ctx) => (app.hasClient ? overviewScreen(app, ctx) : [head('Overview'), noClient(app)]),
  'report/statements': (app, ctx) => (app.hasClient ? statementsScreen(app, ctx) : [head('Statements'), noClient(app)]),
  'report/one-pager': (app, ctx) => (app.hasClient ? onePagerScreen(app, ctx) : [head('One-pager'), noClient(app)]),
  'report/history': (app, ctx) => (app.hasClient ? historyScreen(app, ctx) : [head('History'), noClient(app)]),

  'tools/lists': (app, ctx) => (app.hasClient ? listsScreen(app, ctx) : [head('Coach tools'), noClient(app)]),
  'tools/discovery': app => discoveryScreen(app),
  'tools/data': (app, ctx) => [head('Coach tools', 'Export, import and reset'), h('div.card', {}, h('div.row-line', {},
    S.button('Export', { kind: 'primary', iconName: 'download', onClick: () => app.exportNow() }),
    S.button('Import', { iconName: 'upload', onClick: () => app.importFile() }),
    S.button('Reset client', { kind: 'danger', iconName: 'eraser', disabled: !app.hasClient, why: 'No client open', onClick: e => app.resetClient(e.currentTarget) }),
    h('span', { style: { flex: 1 } }),
    S.button('Delete client', { kind: 'danger', iconName: 'trash', disabled: !app.hasClient, why: 'No client open', onClick: e => app.deleteClient(e.currentTarget) })),
  h('p.muted', { style: { marginTop: '12px' } }, app.backupText()),
  h('h3', { style: { marginTop: '20px' } }, 'Spreadsheet'), sheetButtons(app))],
  'tools/session': (app, ctx) => sessionScreen(app, ctx, { fastTrackGap }),
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

// Sub-tab progress (R162): a small count, or a check when core is done.
export function progressOf(ctx, tabId, subId) {
  const recs = ctx.visible(() => true);
  const core = (kinds, fields) => {
    const rows = recs.filter(r => kinds.includes(r.kind));
    if (!rows.length) return null;
    return { done: rows.filter(r => fields.every(f => countsAsDone(statusOf(r, f)))).length, of: rows.length };
  };
  if (tabId === 'home' && subId === 'profile') { const c = profileCompletion(ctx.store.doc).core; return c.of ? { done: c.done, of: c.of } : null; }
  if (tabId === 'cash-flow' && subId === 'income') return core(['income'], ['amount']);
  if (tabId === 'net-worth') {
    if (subId === 'debt') return core(['debt'], ['balance', 'apr']);
    if (subId === 'assets') {
      const rows = recs.filter(r => r.kind === 'account' || r.kind === 'asset');
      if (!rows.length) return null;
      return { done: rows.filter(r => countsAsDone(statusOf(r, r.kind === 'asset' ? 'value' : 'balance'))).length, of: rows.length };
    }
  }
  if (tabId === 'cash-flow' && subId === 'budget') return core(['bill', 'spending'], ['amount']);
  return null;
}
export { keyNumbers, icon };
