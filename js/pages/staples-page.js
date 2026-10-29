// The staples demo page: every staple and every Polish rule, on the made-up Demo client.
import { h, clear, icon } from '../ui/dom.js';
import { Store, newHousehold, STATUSES } from '../records.js';
import { householdFromInputs } from '../demo.js';
import { keyNumbers } from '../math/metrics.js';
import * as S from '../ui/staples.js';
import { debtList, spendingList, debtCharts } from '../ui/lists.js';
import { money } from '../format.js';
import { payoffMonths } from '../math/debt.js';

const [ref, demo] = await Promise.all([
  fetch('data/reference-2026.json').then(r => r.json()),
  fetch('fixtures/demo.json').then(r => r.json()),
]);
const store = new Store(householdFromInputs(demo.inputs));
const ctx = S.createCtx({ store, ref });
const emptyStore = new Store(newHousehold({ name: 'Empty' }));
const emptyCtx = S.createCtx({ store: emptyStore, ref });

// Theme, density and client view, remembered in this browser only.
const prefs = (() => { try { return JSON.parse(localStorage.getItem('slam.staples') || '{}'); } catch { return {}; } })();
const savePrefs = () => { try { localStorage.setItem('slam.staples', JSON.stringify(prefs)); } catch { /* private window */ } };
const root = document.documentElement;
const apply = () => {
  if (prefs.theme && prefs.theme !== 'System') root.dataset.theme = prefs.theme.toLowerCase(); else delete root.dataset.theme;
  root.dataset.density = prefs.density === 'Compact' ? 'compact' : 'comfortable';
  root.dataset.clientView = prefs.clientView ? 'on' : 'off';
};
apply();

document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    const label = e.shiftKey ? store.redo() : store.undo();
    if (label) S.toast(`${e.shiftKey ? 'Redone' : 'Undone'}: ${label}`);
  }
});

function section(title, area, ...kids) {
  return h(`section.section.area-${area}`, {}, h('div.section-title', {}, h('h2', {}, title)), ...kids);
}
const card = (...kids) => h('div.card', {}, ...kids);
const demoLabel = text => h('h3', {}, text);

function controls() {
  const box = h('div.row-line');
  const draw = () => clear(box,
    h('span.label', {}, 'Theme'), S.toggle(['System', 'Light', 'Dark'], prefs.theme || 'System', v => { prefs.theme = v; savePrefs(); apply(); ctx.refresh(); draw(); }, { label: 'Theme' }),
    h('span.label', {}, 'Density'), S.toggle(['Comfortable', 'Compact'], prefs.density || 'Comfortable', v => { prefs.density = v; savePrefs(); apply(); draw(); }, { label: 'Density' }),
    h('span.label', {}, 'Client view'), S.toggle(['Off', 'On'], prefs.clientView ? 'On' : 'Off', v => { prefs.clientView = v === 'On'; savePrefs(); apply(); draw(); }, { label: 'Client view' }),
    h('span.label', {}, 'Amounts'), S.timeToggle(ctx));
  ctx.onRefresh(draw);
  draw();
  return box;
}

function buttonsCard() {
  return card(
    demoLabel('Buttons: one main per area, secondary outlined, destructive in a calm outline'),
    h('div.row-line', {},
      S.button('Save snapshot', { kind: 'primary', iconName: 'camera', onClick: () => { store.snapshot('Demo session', keyNumbers(ctx.metrics())); S.toast('Snapshot saved. Change a number to see the arrows.'); ctx.refresh(); } }),
      S.button('Back up now', { iconName: 'download' }),
      S.button('Clear debts', { kind: 'danger', iconName: 'reset' }),
      S.button('Send summary', { disabled: true, why: 'Save a snapshot first' }),
      S.savedNote()),
    h('div.row-line', { style: { marginTop: '16px' } },
      demoLabel('Icon buttons (hover for the name):'),
      ['copy', 'reset', 'trash', 'undo', 'redo', 'search', 'note', 'monitor', 'gear', 'plus', 'x'].map(n => S.iconButton(n, { copy: 'Duplicate', reset: 'Reset', trash: 'Delete', undo: 'Undo', redo: 'Redo', search: 'Find', note: 'Parking lot', monitor: 'Client view', gear: 'Coach tools', plus: 'Add', x: 'Close' }[n], () => {}))),
    h('div.row-line', { style: { marginTop: '16px' } },
      demoLabel('Caret:'), h('button.caret', { type: 'button' }, 'More', icon('right')), h('button.caret', { type: 'button', 'aria-expanded': 'true' }, 'Less', icon('down')),
      demoLabel('Link:'), h('a', { href: '#' }, 'Open the gates hub'),
      demoLabel('Hidden area:'), S.hiddenAreaLink(ctx, 'Protection')));
}

function tagsCard() {
  return card(
    demoLabel('Status tags: a symbol as well as a color'),
    h('div.row-line', {}, STATUSES.map(s => S.statusTag(s)), S.warnTag('Promo ends in 60 days'), h('span.tag.good', {}, icon('check'), ' Paid off')),
    h('div.row-line', { style: { marginTop: '16px' } }, demoLabel('Status picker:'), S.statusPicker('Roughly', s => S.toast(`Status: ${s ?? 'cleared'}`)), S.statusPicker(null, s => S.toast(`Status: ${s ?? 'cleared'}`))));
}

function inputsCard() {
  let sample = { a: null, b: 15.99, apr: null, per: 'month' };
  const box = h('div');
  const draw = () => clear(box,
    demoLabel('Amount box with a per picker. Empty boxes stand out with a hint; filled ones go softer'),
    h('div.row-line', {},
      h('div.stack', {}, h('span.label', {}, 'Empty'), S.moneyInput(sample.a, v => { sample.a = v; draw(); })),
      h('div.stack', {}, h('span.label', {}, 'Filled'), h('span.row-line', { style: { gap: '8px', flexWrap: 'nowrap' } }, S.moneyInput(sample.b, v => { sample.b = v; draw(); }), S.perPicker(sample.per, v => { sample.per = v; draw(); }))),
      h('div.stack', {}, h('span.label', {}, 'APR'), S.pctInput(sample.apr, v => { sample.apr = v; draw(); })),
      h('div.stack', {}, h('span.label', {}, 'Computed (cannot be typed in)'), h('span.computed', {}, money(ctx.metrics().debts[2]?.payment ?? null))),
      h('div.stack', {}, h('span.label', {}, 'Amount is'), S.toggle(['Fixed', 'Variable'], 'Fixed', () => {})),
      h('div.stack', {}, h('span.label', {}, 'Date is'), S.toggle(['Fixed date', 'Variable date'], 'Variable date', () => {})),
      h('div.stack', {}, h('span.label', {}, 'Stepper'), S.stepper(1, () => {}, { label: 'Roommates' }))));
  draw();
  return card(box);
}

function moneyCard() {
  const box = h('div');
  const draw = () => {
    const m = ctx.metrics();
    clear(box, demoLabel('Show the math: click any computed number. Change since last session shows after a snapshot'),
      S.summaryStrip(ctx, [
        { label: 'Net worth', result: m.netWorth, key: 'netWorth' },
        { label: 'Monthly surplus', result: m.surplus, key: 'surplus' },
        { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate' },
        { label: 'FI date', result: m.monthsToFi, key: 'monthsToFi' },
      ]),
      h('div.row-line', {}, demoLabel('Money as time:'),
        store.find(r => r.kind === 'bill').map(r => [h('span', {}, `${r.name} `), S.amount(ctx, r.amount), ' ']),
        h('span.muted', {}, ` · ${m.hourly.guess ? 'Hours use take-home / 173 until real work hours are entered.' : ''}`)));
  };
  ctx.onRefresh(draw);
  draw();
  return card(box);
}

function emptiesCard() {
  const m = emptyCtx.metrics();
  return card(
    demoLabel('Empty states, word for word from the Words and states tab'),
    h('div.grid2', {},
      h('div.list', {}, S.emptyList({ one: 'credit card', plural: 'credit cards' }, () => {})),
      S.chartEmpty(emptyCtx, ['rent', 'take-home'])),
    h('div', { style: { marginTop: '16px' } }, S.summaryStrip(emptyCtx, [
      { label: 'Monthly surplus', result: m.surplus }, { label: 'Housing %', result: m.housingPct },
      { label: 'Net worth', result: m.netWorth }, { label: 'FI date', result: m.monthsToFi }])),
    tooSmall());
}
function tooSmall() {
  // The Demo card with only its interest covered never pays off.
  const d = ctx.metrics().inputs.debts.find(x => x.type === 'Credit card');
  const pay = Math.floor(d.balance * d.apr / 12);
  const r = payoffMonths({ balance: d.balance, apr: d.apr, payment: pay });
  return h('div.row-line', {}, h('span.muted', {}, `Payment too small (${money(pay)} a month on the card): `),
    S.mathButton(r, `Needs ${money(r.paymentNeeded)}/mo`), S.warnTag('This payment never pays it off'));
}

function visualsCard() {
  const v = h('div.visuals', {}, S.recordList(ctx, debtList(ref)), S.visualsPanel(ctx, { charts: debtCharts, area: 'debt' }));
  return v;
}

clear(document.getElementById('page'),
  h('div.row-line', { style: { justifyContent: 'space-between', marginBottom: '16px' } },
    h('div', {}, h('h1', { style: { margin: 0 } }, 'Staples'), h('p.muted', { style: { margin: 0 } }, 'Every piece built once and used everywhere, on the made-up Demo client. Nothing here is saved.')),
    h('div.row-line', {}, S.quickAdd(ctx), h('a.btn', { href: './', style: { textDecoration: 'none' } }, 'Open the app'))),
  card(controls()),
  h('div', { style: { height: '24px' } }),
  section('Buttons, icons and links', 'needs', buttonsCard()),
  section('Status', 'assets', tagsCard()),
  section('Inputs', 'income', inputsCard()),
  section('Summary strip and money', 'goals', moneyCard()),
  visualsCard(),
  S.recordList(ctx, spendingList(ref)),
  section('When nothing is entered yet', 'taxes', emptiesCard()));
