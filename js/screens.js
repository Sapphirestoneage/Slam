// SPDX-License-Identifier: AGPL-3.0-only
// Every screen's first state, word for word from the Words and states tab. Later phases fill them in.
import { cardsGiveSection, doubledNotes } from './ui/cards-ui.js';
import { h, icon } from './ui/dom.js';
import { budgetCompletion, itemRoute } from './completion.js';
import { paycheckSection } from './ui/paycheck-ui.js';
import * as S from './ui/staples.js';
import { importButton } from './ui/import-ui.js';
import { sheetButtons, exportChoice } from './ui/sheet-ui.js';
import { creditCard, cardsLink, debtList, spendingList, debtCharts, debtRatios } from './ui/lists.js';
import { incomeList, benefitList, variableBlock, assetList, protectionList, taxesScreen, lifeAdminScreen, listCompletion, incomeCharts, assetCharts } from './ui/money-lists.js';
import { profileScreen, profileCompletion } from './ui/profile.js';
import { startFastTrack, fastTrackLabel } from './ui/fasttrack-ui.js';
import { fastTrackDone } from './fasttrack.js';
import { budgetScreen, calendarScreen, closeScreen } from './ui/spending-ui.js';
import { homeScreen } from './ui/home-ui.js';
import { listsScreen, sessionScreen, discoveryScreen } from './ui/tools-ui.js';
import { overviewScreen, onePagerScreen, historyScreen } from './ui/report-ui.js';
import { statementsScreen } from './ui/statements-ui.js';
import { layersCard } from './ui/layers-ui.js';
import { layersOf } from './math/layers.js';
import { arrive, leftPopover, missingFor } from './ui/arrive.js';
import { fillCounter } from './ui/counts-ui.js';
import { taxesCompletion, protectionCompletion } from './completion.js';
import { institutionsCard } from './ui/institutions-ui.js';
import { metrics as metricsOf } from './math/metrics.js';
import { personLabels, modeOf, MODES, viewsOf, bothScreen, offersBoth, bothPreviewOn, bothLabel, validPerson, multiAdult, manyAdults, adultsOf } from './registry/couples.js';
import { fooScreen } from './ui/foo-ui.js';
import { scorecardScreen } from './ui/scorecard-ui.js';
import { reviewScreen } from './ui/review-ui.js';
import { goalsScreen, timelineScreen, payoffScreen, nextYearScreen, scenariosScreen } from './ui/plan-ui.js';
import { transitionsScreen } from './ui/transitions-ui.js';
import { lenderScreen } from './ui/lender-ui.js';
import { cliffScreen } from './ui/cliff-ui.js';
import { fireDrillScreen } from './ui/firedrill-ui.js';
import { AREAS, recordFor } from './gates.js';
import { keyNumbers } from './math/metrics.js';
import { statusOf, countsAsDone } from './records.js';
import { money } from './format.js';
import { needs } from './math/result.js';
import { flowOf } from './math/metrics.js';
import { setAsideOf } from './payday.js';
import { taxTypeOf } from './math/income.js';

const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const center = (...kids) => h('div.card', {}, h('div.empty.center', {}, ...kids));
const listEmpty = (one, plural, why) => h('div.list', {}, h('div.empty', {}, h('span.title', {}, `No ${plural} yet`),
  S.button(`Add ${one}`, { iconName: 'plus', disabled: true, why })));

// Words: Home (no client).
export function noClient(app) {
  return center(h('span.title', {}, 'Start with a new client'),
    S.button('New client', { kind: 'primary', size: 'big', iconName: 'plus', onClick: e => app.newClient(e.currentTarget) }),
    tryDemo(app)); // batch 8: hidden while the New client box is open, so the box never covers it
}
function tryDemo(app) { const b = S.button('Try with example numbers', { onClick: () => app.loadDemo() }); b.classList.add('try-demo'); return b;
}

// Words: Net worth or Cash flow, nothing entered. Fast Track is the one main button.
function fastTrack(app, ctx) {
  if (fastTrackDone(ctx.store.doc)) return h('div.card.ft-slim', {}, h('div.row-line', { style: { gap: '10px' } }, // batch 8: one line once finished
    S.button(fastTrackLabel(ctx), { size: 'small', iconName: 'right', onClick: () => startFastTrack(app, ctx) }), h('span.muted.small.ft-slim-note', {}, 'Done once; run it again any time')));
  return h('div.card', {}, h('div.empty', {},
    S.button(fastTrackLabel(ctx), { kind: 'primary', size: 'big', onClick: () => startFastTrack(app, ctx) }),
    h('span.muted', {}, 'about 5 minutes')));
}
const hasAny = (ctx, kinds) => ctx.store.records.some(r => kinds.includes(r.kind));

// ---------- The sections (build phase 5), now under Home, Net worth and Cash flow ----------
// Two bars per section: core (Primary fields) and full detail (everything that applies) (R065).
function completion(app, c) {
  const route = location.hash;
  const items = x => (x.items || []).map(it => ({ ...it, route: itemRoute(app.ctx, route, it) })); // batch 13: a card's field lands on Credit cards
  const bar = (label, x) => h('span.row-line', { style: { gap: '8px', flexWrap: 'nowrap' } }, h('span.label', {}, label),
    h('div.progress', { role: 'progressbar', 'aria-valuenow': x.of ? Math.round(x.done / x.of * 100) : 0, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': label }, h('span', { style: { width: `${x.of ? x.done / x.of * 100 : 0}%` } })),
    x.of && x.done < x.of ? h('button.btn.small.count-btn', { type: 'button', 'aria-label': `${label}: ${x.done} of ${x.of}, see what is left`, onclick: e => leftPopover(app, e.currentTarget, items(x), { title: `${label}: ${x.of - x.done} left` }) }, `${x.done} of ${x.of}`) : h('span.label', {}, `${x.done} of ${x.of}`), // item 3: a counter lists what is left
    x.parked ? h('span.muted.small', { title: 'On the Homework list: handled for this session, not yet a number' }, `${x.parked} on homework`) : null); // batch 7, item 4: deferring shows as progress, and says so
  if (!c.core.of && !c.full.of) return null;
  // What is still missing, in words, behind a caret so the page stays calm.
  // Batch 8 (C12): every line is a link to its exact field (arrive highlights it and the toast says where to look); one heading per level.
  const coreItems = items(c.core), fullItems = items(c.full).filter(i => !coreItems.some(x => x.id === i.id && x.field === i.field));
  const left = coreItems.length + fullItems.length;
  const link = it => h('li', {}, h('a.missing-link', { href: it.route, onclick: e => { e.preventDefault(); arrive(app, it.route, { only: it }); } }, it.name), it.where ? h('span.muted.small', {}, ` · look on ${it.where}`) : null);
  return h('div.completion-wrap', {}, h('div.completion', {}, bar('Core', c.core), bar('Full detail', c.full)),
    left ? S.moreBlock(`missing:${location.hash}`, () => h('div.missing-groups', {},
      coreItems.length ? [h('h3.missing-head', {}, `Core (${coreItems.length})`), h('ul.missing', {}, coreItems.map(link))] : null,
      fullItems.length ? [h('h3.missing-head', {}, `Full detail (${fullItems.length})`), h('ul.missing', {}, fullItems.map(link))] : null), { label: `What's missing (${left})` }) : null);
}
// R015: an area turned off on the Profile leaves a slim way back. Batch 11 (item 5d): + Add one asks which (two or
// three taps, e.g. Home or Car), turns the area on and adds that row in one undoable step; no toast.
const AREA_PICKS = { real: ['Home', 'Car'], cash: ['Checking', 'Savings or HYSA'], investments: ['401(k)', 'Roth IRA', 'Brokerage'] };
const addArea = (app, ctx, k, label) => h('a.add-area', { href: '#', onclick: e => {
  e.preventDefault();
  const turnOn = (extra = {}) => { const p = ctx.store.doc.profile; ctx.store.setDoc('profile', { areas: { ...(p.areas || {}), [k]: true }, noneOfThese: false, ...extra }); };
  const picks = AREA_PICKS[k];
  if (!picks) { turnOn(); return; }
  const btn = e.currentTarget;
  S.popover(btn, h('div.stack', { style: { gap: '8px' } }, h('h3', {}, `Add ${label.toLowerCase()}`),
    h('div.row-line', { style: { gap: '8px' } }, picks.map(t => h('button.btn', { type: 'button', onclick: () => {
      S.closePop();
      const spec = recordFor(t, ctx.ref);
      let id = null;
      ctx.store.transaction(`Add ${t}`, () => { turnOn(t === 'Car' ? { hasCar: true } : {}); id = ctx.store.add(spec.kind, { name: t === 'Savings or HYSA' ? 'Savings' : t, values: { ...spec.values } }, { type: t }).id; });
      requestAnimationFrame(() => document.querySelector(`tr[data-id="${id}"] input:not([type="checkbox"])`)?.focus());
    } }, t)))), { width: 280 });
} }, '+ Add one');
const offAreas = (app, ctx, keys) => {
  const g = ctx.gates();
  const off = AREAS.filter(([k]) => keys.includes(k) && g.areas[k] === false);
  return off.length ? h('div.row-line.off-areas', {}, off.map(([k, label]) => [h('span.muted', {}, `No ${label.toLowerCase()} yet.`), addArea(app, ctx, k, label)])) : null; // item 26
};
// A list with its chart; in session-1 focus mode the chart waits under More detail (polish item 4).
const withChart = (ctx, list, charts, area) => (S.focusOn(ctx)
  ? [S.recordList(ctx, list), S.focusMore(ctx, `chart:${area}`, S.visualsPanel(ctx, { charts, area }))]
  : h('div.visuals', {}, S.recordList(ctx, list), S.visualsPanel(ctx, { charts, area })));
const MM = {
  profile: { title: 'About you', sub: 'Why now, what applies, about you', body: (app, ctx) => [completion(app, profileCompletion(ctx.store.doc)), ...profileScreen(app, ctx)] },
  income: { title: 'Income', sub: 'Paychecks, benefits, variable income', body: (app, ctx) => {
    const g = ctx.gates();
    return [completion(app, listCompletion(ctx, r => r.kind === 'income' || r.kind === 'benefit', ['amount'])), hasAny(ctx, ['income']) ? null : fastTrack(app, ctx),
      g.betweenJobs && !ctx.store.find(r => r.kind === 'income' && r.type === 'Unemployment').length
        ? h('div.banner-inline', {}, 'Between jobs: add unemployment benefits so the runway counts them.', S.button('Add unemployment', { iconName: 'plus', onClick: () => ctx.store.add('income', { name: 'Unemployment benefits', per: 'week' }, { type: 'Unemployment' }) })) : null,
      withChart(ctx, incomeList(), incomeCharts, 'income'),
      S.live(ctx, () => { const p = paycheckSection(ctx); return p ? S.secWrap(p, 'income:paycheck', { summary: 'Taxes, 401(k), HSA and premiums taken before payday' }) : null; }), // answer to 58: everything the paycheck pays first, in one place; batch 13: closed by default
      S.focusMore(ctx, 'income:extra', [g.variable || ['Varies', 'Unpredictable'].includes(ctx.store.doc.profile.incomeStability) || ctx.store.find(r => r.kind === 'income' && taxTypeOf(r) === '1099').length ? S.secWrap(variableBlock(ctx), 'income:variable', { summary: 'Months with more or less pay' }) : null, S.recordList(ctx, { ...benefitList(), open: false })].filter(Boolean))];
  } },
  debt: { title: 'Debt', sub: 'Every debt and its payoff', body: (app, ctx) => (ctx.gates().areas.debt === false
    ? [h('div.card', {}, h('div.empty', {}, h('span.title', {}, 'No debt, per About you'), addArea(app, ctx, 'debt', 'Debt')))]
    : [completion(app, listCompletion(ctx, r => r.kind === 'debt', ['balance', 'apr'])), hasAny(ctx, ['debt']) ? null : fastTrack(app, ctx),
      withChart(ctx, debtList(ctx.ref, { cards: 'none' }), debtCharts, 'debt'), S.live(ctx, () => (ctx.visible(r => r.kind === 'debt' && r.type === 'Credit card').length ? null : cardsLink(ctx)))]) }, // batch 11 (5a): with cards, they are a row in the list (lead)
  // Answer to 56: credit cards are standard debt with a sub-tab of their own: the cards, utilization, the score.
  'credit-cards': { title: 'Credit cards', sub: 'Every card, how much of the limits you use, your score', body: (app, ctx) => (ctx.gates().areas.debt === false
    ? [h('div.card', {}, h('div.empty', {}, h('span.title', {}, 'No debt, per About you'), addArea(app, ctx, 'debt', 'Debt')))]
    : [completion(app, listCompletion(ctx, r => r.kind === 'debt' && r.type === 'Credit card', ['balance', 'apr'])),
      S.recordList(ctx, debtList(ctx.ref, { cards: 'only' })), S.live(ctx, () => doubledNotes(ctx) ?? h('span')), S.live(ctx, () => cardsGiveSection(ctx) ?? h('span')), S.live(ctx, () => creditCard(ctx))]) }, // batch 30: the card library, doubled-up benefits, Your credit
  assets: { title: 'Assets', sub: 'Cash, investments, car, home', body: (app, ctx) => [
    completion(app, listCompletion(ctx, r => r.kind === 'account' || r.kind === 'asset', r => [r.kind === 'asset' ? 'value' : 'balance'])),
    hasAny(ctx, ['account', 'asset']) ? null : fastTrack(app, ctx), offAreas(app, ctx, ['cash', 'investments', 'real']),
    withChart(ctx, assetList(ctx.ref), assetCharts, 'assets'),
    S.sec('assets:layers', { title: 'Cash layers', summary: layersSummary(ctx), tip: 'little e, income gaps, big e, backups of the backups' }, () => S.live(ctx, () => layersCard(ctx))), // batch 13: caret sections, closed by default
    S.sec('assets:institutions', { title: 'Institutions', summary: `${(ctx.store.doc.profile.institutions || []).length} saved` }, () => S.live(ctx, () => institutionsCard(app, ctx)))] }, // item 13
  protection: { title: 'Protection', sub: 'Insurance coverage, gaps and life admin', body: (app, ctx) => [completion(app, listCompletion(ctx, r => r.kind === 'coverage', ['have'])) ?? h('div.fill-line', {}, S.live(ctx, () => fillCounter(app, protectionCompletion(ctx)) ?? h('span'))), S.recordList(ctx, protectionList()), S.live(ctx, () => S.secWrap(lifeAdminScreen(ctx), 'protection:life-admin'))] }, // batch 14: with no rows yet, X of Y filled counts Add the usual list; batch 13: Life admin is a caret section, closed
  taxes: { title: 'Taxes', sub: 'Filing status, last year, estimates', body: (app, ctx) => [h('div.fill-line', {}, S.live(ctx, () => fillCounter(app, taxesCompletion(ctx)) ?? h('span'))), h('div.visuals', {}, S.secWrap(taxesScreen(ctx), 'taxes:filing', { open: true }), // batch 14: X of Y filled above
     S.visualsPanel(ctx, { charts: [incomeCharts[0]], area: 'taxes' }))] },
};
// Batch 13: Cash layers in one line while closed: how many of the layers are full.
const layersSummary = ctx => { try { const L = layersOf(ctx.store.doc, ctx.ref, ctx.now()); return `${L.layers.filter(l => l.full).length} of ${L.layers.length} layers full`; } catch { return null; } };
// Headline strips (reorganize pass). Net worth: what you own and owe. Cash flow: the waterfall, top to bottom.
const sumOf = (list, f) => list.reduce((t, x) => t + (f(x) ?? 0), 0);
const okMoney = (id, value, text) => ({ id, value, needs: [], unit: 'money', text });
// F2: the person filter. All, or one person (their rows and the Joint ones). The mode sets the default; the pick is kept in settings.person.
export function personOf(ctx) { const p = ctx.store.doc.settings?.person; const mode = modeOf(ctx.store.doc.profile); const v = p ?? (mode ? MODES[mode].view : 'all'); return v === 'all' && mode && !MODES[mode].together && !bothPreviewOn(ctx.store.doc) ? 'Me' : validPerson(ctx.store.doc, v); } // batch 49: any adult in the plan; no combined totals in Dating or Living together (batch 33: Living together's Both preview, where offered)
export function personMetrics(ctx) { const p = personOf(ctx); return p === 'all' ? ctx.metrics() : metricsOf(ctx.store.doc, ctx.ref, { now: ctx.now(), person: p }); }
export function personBar(ctx) {
  const doc = ctx.store.doc;
  if (!ctx.couple && !multiAdult(doc)) return null; // batch 49: any household with more than one adult in the plan
  const names = personLabels(doc), many = manyAdults(doc);
  const mode = modeOf(doc.profile), cfg = MODES[mode] || MODES['Married merged'];
  // Batch 33 (QUESTIONS 287): Living together adds Both (preview) where the screen offers it, read-only.
  // Batch 49: past two adults the switch lists each adult, and Both is Everyone.
  const both = bothScreen() && offersBoth(doc);
  const views = [...viewsOf(mode || (ctx.couple ? 'Married merged' : 'Solo'), names, many ? adultsOf(doc) : null), ...(both ? [['all', bothLabel(doc)]] : [])];
  const p = personOf(ctx);
  const together = many ? 'Everyone' : `${names.Me} and ${names.Partner}`;
  return h('div.row-line.person-bar', { style: { gap: '10px', marginBottom: '8px' } }, h('span.muted.small', {}, 'Show'),
    S.toggle(views, p, v => ctx.store.setDoc('settings', { person: v }), { label: 'Whose numbers' }),
    p !== 'all' ? h('span.muted.small', {}, `${names[p]}'s rows and ${many ? 'their part of the shared ones' : 'the Joint ones'}`)
      : both ? h('span.muted.small.both-note', { title: 'Nothing is merged and nothing can be changed here. Each keeps their own plan.' }, `${together} together, a preview: pick a name to change a number`)
        : cfg.combined === 'preview' ? h('span.muted.small', {}, `A preview of ${many ? 'everyone' : 'the two'} together; nothing is merged`) : null);
}
export function netWorthStrip(ctx) {
  const m = personMetrics(ctx), x = m.inputs;
  const owned = [...x.accounts, ...x.things].filter(a => a.value != null);
  const owed = x.debts.filter(d => d.balance != null);
  const list = (rows, f) => rows.map(r => `${r.name} ${money(f(r))}`).join(' + ');
  const assets = owned.length ? okMoney('M40', sumOf(owned, a => a.value), `${list(owned, a => a.value)} = ${money(sumOf(owned, a => a.value))}.`)
    : x.none ? okMoney('M40', 0, 'None of these: no assets.') : needs('M40', ['an asset balance'], { unit: 'money' });
  const debt = owed.length ? okMoney('M30', sumOf(owed, d => d.balance), `${list(owed, d => d.balance)} = ${money(sumOf(owed, d => d.balance))}.`)
    : x.none || x.gates.areas.debt === false ? okMoney('M30', 0, 'No debt, per About you.') : needs('M30', ['a debt balance'], { unit: 'money' });
  const items = [
    { label: 'Total net worth', result: m.netWorth, key: 'netWorth' },
    { label: 'Liquid net worth', result: m.liquidNetWorth, key: 'liquidNetWorth' },
    { label: 'Total assets', result: assets, home: '#/net-worth/assets' },
    { label: 'Total debt', result: debt, key: 'debtTotal', lowerIsGood: true, home: '#/net-worth/debt' }];
  // Batch 13 (item 2): one slim line with all four; the caret opens the cards (change since last session, notes).
  return h('div', {}, personBar(ctx), S.slimStrip(ctx, 'strip:net-worth', 'Net worth', [
    { ...items[0], label: 'Total' }, { ...items[1], label: 'Liquid' }, { ...items[2], label: 'Assets' }, { ...items[3], label: 'Debt' }], S.summaryStrip(ctx, items), { tip: 'Open the cards: change since last session for each' }));
}
// Every step is a Show the math button; take-home and free are the totals.
export function cashFlowStrip(ctx) {
  const m = personMetrics(ctx);
  const f = flowOf(m.inputs, { pretaxSaving: m.pretaxSaving, setAside: setAsideOf(ctx.store.doc, ctx.ref, ctx.now()).total }); // goals and sinking funds are savings
  const step = (label, v, text, { sign = '', total = false, home = null } = {}) => h(`div.wf-step${total ? '.total' : ''}`, {},
    home ? h('a.label.metric-home', { href: home }, label) : h('span.label', {}, label),
    h('div.wf-num', {}, v === null ? h('span.muted', {}, '–') : [sign ? h('span.wf-sign', { 'aria-hidden': 'true' }, sign) : null, S.mathButton({ id: 'Cash flow', value: v, needs: [], text }, money(v))]));
  const gut = f.source !== 'lines';
  // Batch 13 (item 2): one slim line (Take-home, Spending, Free); the caret opens the whole waterfall, the same on
  // Income, Taxes, Budget, Calendar and Month end.
  const r = (label, v, text, home = null) => ({ label, home, result: { id: 'Cash flow', value: v, needs: [], unit: 'money', text } });
  const slim = [r('Take-home', f.takeHome, 'What lands in checking each month.', '#/cash-flow/income'), r('Spending', f.spending, gut ? 'The gut number, a month.' : 'Every line, your share, plus debt payments, a month.', '#/cash-flow/budget'),
    f.savings ? r('Savings', f.savings, 'Retirement lines, after-tax contributions, savings goals and sinking funds, a month.') : null, r('Free', f.free, 'Take-home minus spending minus savings.')];
  return h('div', {}, personBar(ctx), S.slimStrip(ctx, 'strip:cash-flow', 'Cash flow', slim, h('div.card.waterfall', { role: 'group', 'aria-label': 'Cash flow, top to bottom' },
    step('Gross, all income', f.gross, 'Every paycheck before tax, plus benefits before any withholding and money that is not taxed, a month.', { home: '#/cash-flow/income' }),
    step(f.premiums ? 'Taxes and premiums' : 'Taxes', f.taxes, `Gross minus what is saved from the paycheck minus take-home${f.premiums ? `, including ${money(f.premiums)} of premiums from the paycheck` : ''}.`, { sign: '−', home: '#/cash-flow/taxes' }),
    step('Saved from paycheck', f.beforeTax, '401(k) (traditional or Roth) and HSA money taken from the paycheck, a month. A Roth 401(k) is taxed first, so it does not lower your tax.', { sign: '−' }),
    step('Take-home', f.takeHome, 'What lands in checking each month.', { sign: '=', total: true, home: '#/cash-flow/income' }),
    gut ? step('Spending', f.spending, 'The gut number (switch to the lines under Settings for this budget).', { sign: '−', home: '#/cash-flow/budget' })
      : [step('Fixed', f.fixed, 'Lines marked Fixed, your share, plus debt payments.', { sign: '−', home: '#/cash-flow/budget' }),
        step('Variable', f.variable, 'Every other line, your share.', { sign: '−', home: '#/cash-flow/budget' })],
    step('Savings', f.savings, 'Retirement lines, after-tax contributions, savings goals and sinking funds, a month.', { sign: '−' }),
    step('Free', f.free, 'Take-home minus spending minus savings.', { sign: '=', total: true })), { tip: 'Open the whole waterfall: gross (all income), taxes, saved from the paycheck, take-home, spending, savings, free' }));
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
  'home/review': (app, ctx) => (app.hasClient ? reviewScreen(app, ctx) : [head('Review'), noClient(app)]),

  // About you is the first stop: its answers decide what shows everywhere.
  'home/profile': (app, ctx) => (app.hasClient ? [head('About you', MM.profile.sub), ...MM.profile.body(app, ctx)] : [head('About you'), noClient(app)]),

  'net-worth/assets': tabPage('net-worth', 'assets'),
  'net-worth/debt': tabPage('net-worth', 'debt'),
  'net-worth/credit-cards': tabPage('net-worth', 'credit-cards'),
  'net-worth/protection': tabPage('net-worth', 'protection'),
  'net-worth/fire-drill': (app, ctx) => (app.hasClient ? fireDrillScreen(app, ctx) : [head('Bank fire drill'), noClient(app)]), // batch 44

  'cash-flow/income': tabPage('cash-flow', 'income'),
  'cash-flow/taxes': tabPage('cash-flow', 'taxes'),
  'cash-flow/budget': tabPage('cash-flow', 'budget'),
  'cash-flow/calendar': tabPage('cash-flow', 'calendar'),
  'cash-flow/close': tabPage('cash-flow', 'close'),

  'plan/goals': (app, ctx) => (app.hasClient ? goalsScreen(app, ctx) : [head('Goals'), noClient(app)]),
  'plan/foo': (app, ctx) => (app.hasClient ? fooScreen(app, ctx, { flags: app.flags }) : [head('FOO'), noClient(app)]),
  'plan/scorecard': (app, ctx) => (app.hasClient ? scorecardScreen(app, ctx) : [head('Scorecard'), noClient(app)]),
  'plan/timeline': (app, ctx) => (app.hasClient ? timelineScreen(app, ctx) : [head('Timeline'), noClient(app)]),
  'plan/debt-payoff': (app, ctx) => (app.hasClient ? payoffScreen(app, ctx) : [head('Debt payoff'), noClient(app)]),
  'plan/next-12-months': (app, ctx) => (app.hasClient ? nextYearScreen(app, ctx) : [head('Next 12 months'), noClient(app)]),
  'plan/scenarios': (app, ctx) => (app.hasClient ? scenariosScreen(app, ctx) : [head('Current vs Proposed'), noClient(app)]),
  'plan/transitions': (app, ctx) => (app.hasClient ? transitionsScreen(app, ctx) : [head('Life Transitions'), noClient(app)]), // batch 21
  'plan/cliff': (app, ctx) => (app.hasClient ? cliffScreen(app, ctx) : [head('What a raise does to your benefits'), noClient(app)]), // batch 47: the benefits cliff

  'report/overview': (app, ctx) => (app.hasClient ? overviewScreen(app, ctx) : [head('Overview'), noClient(app)]),
  'report/statements': (app, ctx) => (app.hasClient ? statementsScreen(app, ctx) : [head('Statements'), noClient(app)]),
  'report/one-pager': (app, ctx) => (app.hasClient ? onePagerScreen(app, ctx) : [head('One-pager'), noClient(app)]),
  'report/history': (app, ctx) => (app.hasClient ? historyScreen(app, ctx) : [head('History'), noClient(app)]),
  'report/lender': (app, ctx) => (app.hasClient ? lenderScreen(app, ctx) : [head('What a lender sees'), noClient(app)]), // batch 42

  'tools/lists': (app, ctx) => (app.hasClient ? listsScreen(app, ctx) : [head('Coach tools'), noClient(app)]),
  'tools/discovery': app => discoveryScreen(app),
  'tools/data': (app, ctx) => [head('Coach tools', 'Export, import and reset'), h('div.card', {}, h('div.row-line', {},
    S.button('Export a backup', { kind: 'primary', iconName: 'download', onClick: () => app.exportNow() }), // batch 34: "Export" beside the spreadsheet read as the spreadsheet
    S.button('Import', { iconName: 'upload', onClick: () => app.importFile() }),
    S.button('Reset client', { kind: 'danger', iconName: 'eraser', disabled: !app.hasClient, why: 'No client open', onClick: e => app.resetClient(e.currentTarget) }),
    h('span', { style: { flex: 1 } }),
    S.button('Delete client', { kind: 'danger', iconName: 'trash', disabled: !app.hasClient, why: 'No client open', onClick: e => app.deleteClient(e.currentTarget) })),
  h('p.muted', { style: { marginTop: '12px' } }, app.backupText()),
  exportChoice(app), // batch 28: Everything, or Without private rows, for the Export above and the spreadsheet below
  h('h3', { style: { marginTop: '20px' } }, 'Spreadsheet'), sheetButtons(app, { choice: false }),
  h('h3', { style: { marginTop: '20px' } }, 'Transactions'), h('div.sheet-actions', {}, importButton(app)), // batch 22: Rocket Money, Monarch or a bank CSV
  h('h3', { style: { marginTop: '20px' } }, 'Usage log'), h('div.row-line', {}, S.button('Export the usage log (CSV)', { iconName: 'download', disabled: !app.hasClient, why: 'No client open', onClick: () => app.exportUsage() }),
    h('span.muted.small', {}, 'Time and clicks per screen, back presses, undos, Find words that found nothing, Show me dead ends and the ease answers. No dollar amounts.')))],
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
    return { done: rows.filter(r => fields.every(f => S.handled(r, f))).length, of: rows.length }; // batch 7, item 4: a parked field is handled
  };
  if (tabId === 'home' && subId === 'profile') { const c = profileCompletion(ctx.store.doc).core; return c.of ? { done: c.done, of: c.of } : null; }
  if (tabId === 'cash-flow' && subId === 'income') return core(['income'], ['amount']);
  if (tabId === 'net-worth') {
    if (subId === 'debt') return core(['debt'], ['balance', 'apr']);
    if (subId === 'assets') {
      const rows = recs.filter(r => r.kind === 'account' || r.kind === 'asset');
      if (!rows.length) return null;
      return { done: rows.filter(r => S.handled(r, r.kind === 'asset' ? 'value' : 'balance')).length, of: rows.length };
    }
  }
  if (tabId === 'cash-flow' && subId === 'budget') { const b = budgetCompletion(ctx).core; return { done: b.done, of: b.of }; } // batch 7 (A3): categories, not lines
  return null;
}
export { keyNumbers, icon };
