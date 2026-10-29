// Staples: pieces built once and used everywhere (Staples tab, R103 to R114, R156 to R174, R182 to R185).
import { h, clear, icon } from './dom.js';
import { STATUSES, statusOf, changeSince, countsAsDone } from '../records.js';
import { metrics, keyNumbers } from '../math/metrics.js';
import { inView, timeChip } from '../math/time.js';
import { money, pct, number, EMPTY, duration } from '../format.js';
import { joinWords } from '../math/result.js';
import { parseQuickAdd } from '../quickadd.js';

// ---------- Context: the store, the time view, the numbers, toasts ----------
export function createCtx({ store, ref, now = () => new Date() }) {
  let cache = null;
  const listeners = new Set();
  const ctx = {
    store, ref, now,
    get timeMode() { return store.doc.settings.timeView || '$'; },
    setTimeMode(mode) { store.doc.settings.timeView = mode; cache = null; ctx.refresh(); store._emit({ type: 'settings' }); },
    get couple() { return !!store.doc.client.couple; },
    metrics() { return (cache ??= metrics(store.doc, ref, { now: now() })); },
    onRefresh(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    refresh() { cache = null; for (const fn of listeners) fn(); },
    goTo: () => {}, // the shell replaces this; the staples page stays put
  };
  store.subscribe(() => ctx.refresh());
  return ctx;
}

// ---------- Buttons ----------
export function button(label, { kind = 'secondary', iconName = null, onClick, size = null, tip = null, disabled = false, why = null } = {}) {
  return h(`button.btn${kind === 'primary' ? '.primary' : kind === 'danger' ? '.danger' : ''}${size ? `.${size}` : ''}`,
    { type: 'button', onclick: onClick, disabled, title: disabled && why ? why : null, 'data-tip': tip },
    iconName ? icon(iconName) : null, label, disabled && why ? h('span.sr', {}, ` (${why})`) : null);
}
export function iconButton(name, label, onClick, { tiny = false, disabled = false } = {}) {
  return h(`button.icon-btn${tiny ? '.tiny' : ''}`, { type: 'button', 'aria-label': label, 'data-tip': label, onclick: onClick, disabled }, icon(name));
}
// Add button: '+ Add [thing]', outlined, bottom left of every section (R103).
export function addButton(thing, onClick) {
  return h('button.btn', { type: 'button', onclick: onClick, 'data-add': thing }, icon('plus'), `Add ${thing}`);
}

// Segmented toggle (Fixed | Variable, $ | Hours | FI days, Side | Below ...)
export function toggle(options, value, onChange, { label = null } = {}) {
  return h('div.seg', { role: 'group', 'aria-label': label },
    options.map(o => {
      const [v, text] = Array.isArray(o) ? o : [o, o];
      return h('button', { type: 'button', 'aria-pressed': String(v === value), onclick: () => onChange(v) }, text);
    }));
}

// ---------- Popovers ----------
let openPop = null;
export function closePop() { openPop?.remove(); openPop = null; }
export function popover(anchor, content, { width = null } = {}) {
  closePop();
  const r = anchor.getBoundingClientRect();
  const pop = h('div.pop', { role: 'dialog', style: { top: `${r.bottom + window.scrollY + 6}px`, left: `${Math.max(8, r.left + window.scrollX)}px`, ...(width ? { width: `${width}px` } : {}) } }, content);
  document.body.append(pop);
  const over = pop.getBoundingClientRect().right - window.innerWidth + 12;
  if (over > 0) pop.style.left = `${Math.max(8, parseFloat(pop.style.left) - over)}px`;
  openPop = pop;
  setTimeout(() => {
    const away = e => { if (!pop.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) { closePop(); document.removeEventListener('mousedown', away); } };
    document.addEventListener('mousedown', away);
  });
  pop.querySelector('input, button')?.focus();
  return pop;
}
document.addEventListener?.('keydown', e => { if (e.key === 'Escape') closePop(); });

// ---------- Toasts: 'Deleted. Undo' for 10 seconds ----------
let toastEl = null, toastTimer = null;
export function toast(text, { undo = null, action = null } = {}) {
  toastEl?.remove(); clearTimeout(toastTimer);
  toastEl = h('div.toast', { role: 'status' }, h('span', {}, text),
    undo ? h('button.btn', { type: 'button', onclick: () => { undo(); toastEl?.remove(); } }, icon('undo'), 'Undo') : null,
    action ? h('button.btn', { type: 'button', onclick: () => { action.run(); toastEl?.remove(); } }, action.label) : null);
  document.body.append(toastEl);
  toastTimer = setTimeout(() => toastEl?.remove(), 10000);
}

// ---------- Saved moment (R164) ----------
export function savedNote() { return h('span.saved-note', { 'aria-live': 'polite' }, icon('check'), 'Saved'); }
export function flashSaved(rowEl) {
  rowEl?.classList.remove('flash'); void rowEl?.offsetWidth; rowEl?.classList.add('flash');
  document.querySelectorAll('.saved-note').forEach(n => { n.classList.add('on'); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('on'), 1500); });
}

// ---------- Status tag (R053, R160): a symbol as well as a color ----------
const TAG = {
  'Roughly': ['roughly', '≈ Roughly'], 'Not sure': ['guess', '? Guess'], 'Will email': ['plain', 'Will email'],
  'Not now': ['plain', 'Not now'], 'Not for me': ['plain', 'Not for me'], 'Computed': ['plain', 'Computed'], 'Know it': ['plain', 'Know it'],
};
export function statusTag(status) {
  if (!status) return null;
  const [cls, text] = TAG[status] || ['plain', status];
  return h(`span.tag.${cls}`, {}, text);
}
export function warnTag(text) { return h('span.tag.warn', {}, '⚠ ', text); }
export const guessTag = () => h('span.tag.guess', {}, '? Guess');

// Shows only when the number is not 'Know it' (DMMT: reduce noise); click to pick.
export function statusPicker(current, onPick, { label = 'Status' } = {}) {
  const b = h('button.status-btn', { type: 'button', 'aria-label': `${label}: ${current || 'not set'}` },
    current && current !== 'Know it' ? statusTag(current) : 'Know it', icon('down'));
  b.onclick = () => popover(b, h('div.stack', {}, h('h3', {}, 'How sure is this?'),
    STATUSES.map(s => h('button.btn.small', { type: 'button', onclick: () => { closePop(); onPick(s); } }, statusTag(s))),
    h('button.btn.small', { type: 'button', onclick: () => { closePop(); onPick(null); } }, 'Clear')));
  return b;
}

// ---------- Money in the current time view, with chip and Show the math ----------
export function amount(ctx, value, { result = null, chip = true, cents = false } = {}) {
  const m = ctx.metrics();
  const v = result ? result.value : value;
  let text;
  if (v === null || v === undefined) text = EMPTY;
  else if (ctx.timeMode === '$') text = money(v, { cents });
  else text = inView(v, ctx.timeMode, { rate: m.hourly, annualSpending: m.annualSpending }).text;
  const body = result ? mathButton(result, text) : h('span', {}, text);
  const c = chip && ctx.timeMode === '$' ? timeChip(v, { rate: m.hourly }) : null;
  return h('span.amount', {}, body, c ? h('span.time-chip', { title: m.hourly.text }, c) : null);
}
export function value(result, ctx = null) {
  if (result.value === null || result.value === undefined) return EMPTY;
  if (result.unit === 'pct') return pct(result.value);
  if (result.unit === 'months') return ctx ? duration(result.value, ctx.now()) : `${Math.ceil(result.value)} months`;
  if (result.unit === 'money' && ctx && ctx.timeMode !== '$') {
    const m = ctx.metrics();
    return inView(result.value, ctx.timeMode, { rate: m.hourly, annualSpending: m.annualSpending }).text;
  }
  return money(result.value);
}
// R166: click any computed number for its formula in plain words.
export function mathButton(result, text) {
  const b = h('button.math', { type: 'button', 'aria-label': `${text}. Show the math` }, text);
  b.onclick = () => showMath(b, result);
  return b;
}
export function showMath(anchor, result) {
  popover(anchor, h('div.math-pop', {},
    h('div.head', {}, h('strong', {}, 'Show the math'), iconButton('x', 'Close', closePop, { tiny: true })),
    h('p', {}, result.text),
    result.guess ? h('p', {}, guessTag(), ' Uses a typical value, not your own number.') : null,
    h('p.muted', { style: { margin: 0, fontSize: '.8125rem' } }, `Formula ${result.id}`)), { width: 420 });
}

// ---------- Locked metric and empty states (Words and states) ----------
export function needLinks(ctx, list) {
  return joinWordsEl(list.map(n => h('a', { href: '#', onclick: e => { e.preventDefault(); ctx.goTo(n); } }, n)));
}
function joinWordsEl(items) {
  const out = [];
  items.forEach((el, i) => { if (i) out.push(i === items.length - 1 ? ' and ' : ', '); out.push(el); });
  return out;
}
export function metricCard(ctx, label, result, { key = null, render = null } = {}) {
  const locked = result.value === null || result.value === undefined;
  const snap = ctx.store.lastSnapshot();
  const change = key && !locked ? changeSince(keyNumbers(ctx.metrics()), snap, key) : null;
  return h(`div.metric${locked ? '.locked' : ''}`, {},
    h('span.label', {}, label),
    locked
      ? h('div.big', {}, result.never ? warnTag('Not on this path') : [icon('lock'), ` Locked: needs ${result.needs.length} ${result.needs.length === 1 ? 'number' : 'numbers'}`])
      : h('div.big', {}, mathButton(result, render ? render(result) : result.unit === 'months' ? `${Math.ceil(result.value)} months` : value(result, ctx)),
        result.unit === 'months' && !render ? h('span.when', {}, ` ${value(result, ctx).replace(/^.*\(/, '(')}`) : null),
    locked && !result.never ? h('span.change', {}, needLinks(ctx, result.needs)) : null,
    result.guess ? h('span', {}, guessTag()) : null,
    change && change.direction !== 'same' ? h(`span.change.${change.direction}`, {}, `${formatDiff(change.diff, key)} since last session`) : null);
}
function formatDiff(d, key) {
  if (key === 'savingsRate') return pct(Math.abs(d)).replace('%', ' pts');
  if (key === 'monthsToFi') return `${Math.abs(d)} months`;
  return money(Math.abs(d));
}
export function summaryStrip(ctx, items) {
  return h('div.strip', {}, items.map(i => metricCard(ctx, i.label, i.result, i)));
}
export function emptyList(thing, onAdd) {
  return h('div.empty', {}, h('span.title', {}, `No ${thing.plural} yet`), addButton(thing.one, onAdd));
}
export function chartEmpty(ctx, needs) {
  return h('div.chart-empty', {}, h('div', {},
    ghostChart(), h('div', {}, h('strong', {}, `Needs ${joinWords(needs)}`)), h('div', {}, needLinks(ctx, needs))));
}
function ghostChart() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 160 90'); s.setAttribute('class', 'ghost'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path d="M8 82h144M8 82V8"/><rect x="24" y="44" width="18" height="38" rx="2"/><rect x="56" y="28" width="18" height="54" rx="2"/><rect x="88" y="54" width="18" height="28" rx="2"/><rect x="120" y="18" width="18" height="64" rx="2"/>';
  return s;
}

// ---------- Inputs ----------
// Amount box: $ value with a 'per' picker (R043). Empty: strong border and a hint (R163).
export function moneyInput(value, onChange, { hint = 'Add amount', cents = true, key = null } = {}) {
  const input = h('input', { inputmode: 'decimal', placeholder: hint, 'aria-label': hint.replace(/^Add /, ''), value: value ?? '', 'data-focus': key });
  input.onchange = () => onChange(parseNum(input.value));
  return h(`label.field.money${value !== null && value !== undefined ? '.filled' : ''}`, { style: { width: '128px' } }, h('span.pre', {}, '$'), input);
}
export function pctInput(value, onChange, { hint = 'Add APR', key = null } = {}) {
  const shown = value === null || value === undefined ? '' : +(value * 100).toFixed(3);
  const input = h('input', { inputmode: 'decimal', placeholder: hint, 'aria-label': hint.replace(/^Add /, ''), value: shown, 'data-focus': key });
  input.onchange = () => { const n = parseNum(input.value); onChange(n === null ? null : n / 100); };
  return h(`label.field.pct${value !== null && value !== undefined ? '.filled' : ''}`, { style: { width: '104px' } }, input, h('span.post', {}, '%'));
}
export function textInput(value, onChange, { hint = 'Add name', width = 180, key = null } = {}) {
  const input = h('input', { placeholder: hint, 'aria-label': hint.replace(/^Add /, ''), value: value ?? '', 'data-focus': key });
  input.onchange = () => onChange(input.value.trim() || null);
  return h(`label.field${value ? '.filled' : ''}`, { style: { width: `${width}px` } }, input);
}
export function perPicker(value, onChange, { key = null } = {}) {
  const s = h('select', { 'aria-label': 'per', 'data-focus': key }, ['paycheck', 'week', 'month', 'year'].map(p => h('option', { value: p, selected: p === value }, `per ${p}`)));
  s.onchange = () => onChange(s.value);
  return h('label.field.filled', { style: { width: '130px' } }, s);
}
export function parseNum(s) {
  const t = String(s ?? '').replace(/[$,%\s]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
export function stepper(value, onChange, { min = 0, max = 20, label = 'Count' } = {}) {
  const v = value ?? null;
  return h('span.row-line', { style: { gap: '6px' } },
    iconButton('down', `Fewer: ${label}`, () => onChange(Math.max(min, (v ?? min) - 1)), { tiny: true }),
    h('span.computed', { style: { minWidth: '40px', justifyContent: 'center' }, 'aria-label': label }, v ?? EMPTY),
    iconButton('plus', `More: ${label}`, () => onChange(Math.min(max, (v ?? min - 1) + 1)), { tiny: true }));
}

// Who pays (every Needs line).
export const WHO_PAYS = ['Me', 'Split', 'Included in rent', 'Covered by someone', 'N/A', 'My share'];
export function whoPays(rec, update) {
  const v = rec.values.whoPays ?? 'Me';
  return h('div.stack', {}, h('span.label', {}, 'Who pays'),
    toggle(WHO_PAYS, v, x => update({ whoPays: x }), { label: 'Who pays' }),
    v === 'Split' ? h('span.row-line', {}, h('span.label', {}, 'Split by'), stepper(rec.values.splitBy ?? null, n => update({ splitBy: n }), { min: 1, label: 'Split by' })) : null,
    v === 'Covered by someone' ? textInput(rec.values.coveredBy, x => update({ coveredBy: x }), { hint: 'Add who covers it' }) : null,
    v === 'My share' ? moneyInput(rec.values.myShare, x => update({ myShare: x }), { hint: 'Add my share' }) : null);
}
// Paid with: checking, savings, or a card. Card buttons if 4 or fewer, a picker with search if more (R112).
export function paidWith(ctx, rec, onPick) {
  const cards = ctx.store.find(r => r.kind === 'debt' && r.type === 'Credit card');
  const opts = [['checking', 'Checking'], ['savings', 'Savings'], ...cards.map(c => [c.id, c.name || 'Credit card'])];
  if (opts.length <= 6) return h('div.stack', {}, h('span.label', {}, 'Paid with'), toggle(opts, rec.paidWith, onPick, { label: 'Paid with' }));
  return h('div.stack', {}, h('span.label', {}, 'Paid with'), cardSearch(cards, rec.paidWith, onPick));
}
function cardSearch(cards, current, onPick) {
  const list = h('div.picker-other');
  const input = h('input', { placeholder: 'Search cards', 'aria-label': 'Search cards' });
  const draw = () => clear(list, cards.filter(c => (c.name || '').toLowerCase().includes(input.value.toLowerCase()))
    .map(c => h('button.btn.small', { type: 'button', 'aria-pressed': String(c.id === current), onclick: () => onPick(c.id) }, c.name || 'Credit card')));
  input.oninput = draw; draw();
  return h('div.stack', {}, h('label.field', {}, icon('search'), input), list);
}

// ---------- Add picker: top 4 big buttons, Other with search, Name your own (R104) ----------
export function openAddPicker(anchor, { thing, top, other = [], onPick }) {
  const list = h('div.picker-other');
  const search = h('input', { placeholder: `Search ${thing}s`, 'aria-label': `Search ${thing}s` });
  const own = h('input', { placeholder: 'Name your own', 'aria-label': 'Name your own' });
  const otherBox = h('div', { hidden: true },
    h('label.field', { style: { width: '100%' } }, icon('search'), search), list,
    h('div.row-line', { style: { marginTop: '12px' } }, h('label.field', { style: { flex: 1 } }, own),
      h('button.btn.small', { type: 'button', onclick: () => { if (own.value.trim()) { closePop(); onPick(null, own.value.trim()); } } }, 'Add')));
  own.onkeydown = e => { if (e.key === 'Enter' && own.value.trim()) { closePop(); onPick(null, own.value.trim()); } };
  const draw = () => clear(list, other.filter(o => o.toLowerCase().includes(search.value.toLowerCase()))
    .map(o => h('button.btn.small', { type: 'button', onclick: () => { closePop(); onPick(o); } }, o)));
  search.oninput = draw;
  search.onkeydown = e => { if (e.key === 'Enter') list.querySelector('button')?.click(); }; // R045: Enter picks the top match
  draw();
  popover(anchor, h('div', {}, h('h3', {}, `Add ${thing}`),
    h('div.picker-top', {}, top.map(t => h('button.btn', { type: 'button', onclick: () => { closePop(); onPick(t); } }, t))),
    h('button.btn.small', { type: 'button', onclick: e => { otherBox.hidden = !otherBox.hidden; e.currentTarget.setAttribute('aria-expanded', String(!otherBox.hidden)); if (!otherBox.hidden) search.focus(); } }, 'Other', icon('down')),
    otherBox), { width: 380 });
}

// ---------- Payoff bar (R159) ----------
export function payoffCell(ctx, d, longest) {
  const p = d.payoff;
  if (p.never) return h('div.payoff', {}, mathButton(p, `Needs ${money(p.paymentNeeded)}/mo`), h('div.bar', {}, h('span', { style: { width: '0' } })));
  if (p.value === null) return h('div.payoff', {}, h('span.muted', {}, `Needs ${joinWords(p.needs)}`), h('div.bar', {}));
  const width = longest ? Math.max(4, (p.value / longest) * 100) : 0;
  return h('div.payoff', {},
    h('span', {}, mathButton(p, duration(p.value, ctx.now())), d.interest.value !== null ? h('span.muted', {}, ' · ', mathButton(d.interest, `${value(d.interest, ctx)} interest`)) : null),
    h('div.bar', { role: 'img', 'aria-label': `${p.value} months` }, h('span', { style: { width: `${width}%` } })));
}

// ---------- Section footer: total, count, completion bar (R108) ----------
export function sectionFooter(ctx, { add, total, count, done, of }) {
  const pctDone = of ? done / of : 0;
  return h('div.footer', {}, add, h('span.spacer'),
    total !== undefined ? h('span', {}, h('span.label', {}, 'Total '), total) : null,
    h('span.label', {}, `${count} ${count === 1 ? 'item' : 'items'}`),
    h('span.row-line', { style: { gap: '8px' } }, h('div.progress', { role: 'progressbar', 'aria-valuenow': Math.round(pctDone * 100), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Complete' }, h('span', { style: { width: `${pctDone * 100}%` } })),
      h('span.label', {}, `${done} of ${of} done`)));
}
export function keyboardHint() { // R168
  return h('div.hint-line', {}, h('kbd', {}, 'Tab'), ' next box · ', h('kbd', {}, 'Enter'), ' new row below · ',
    h('kbd', {}, 'Ctrl'), '+', h('kbd', {}, 'Z'), ' undo · ', h('kbd', {}, 'Ctrl'), '+', h('kbd', {}, 'Shift'), '+', h('kbd', {}, 'Z'), ' redo · ', h('kbd', {}, '/'), ' Find');
}
// Hidden-area link: '+ Add [area]' linked to the gates hub.
export function hiddenAreaLink(ctx, area) {
  return h('a', { href: '#/my-money/profile', 'data-gate': area }, `+ Add ${area}`);
}

// ---------- Confirm dialogs (Words and states) ----------
export function confirmBox(anchor, { text, yes, no, onYes, extra = null }) {
  popover(anchor, h('div.stack', { style: { gap: '12px' } }, h('strong', {}, text),
    h('div.row-line', {}, h('button.btn.danger', { type: 'button', onclick: () => { closePop(); onYes(); } }, yes),
      extra ? h('button.btn.danger', { type: 'button', onclick: () => { closePop(); extra.run(); } }, extra.label) : null,
      h('button.btn', { type: 'button', onclick: closePop }, no))), { width: 380 });
}

// ---------- Quick add box (R106) ----------
export function quickAdd(ctx, { onAdded = () => {} } = {}) {
  const input = h('input', { placeholder: 'Add anything', 'aria-label': 'Add anything: type a name, amount and how often', 'data-quick-add': '' });
  const wrap = h('label.field', { style: { width: '220px' } }, icon('plus'), input);
  input.onkeydown = e => {
    if (e.key !== 'Enter') return;
    const p = parseQuickAdd(input.value);
    if (!p) return;
    popover(wrap, h('div.stack', { style: { gap: '12px' } }, h('strong', {}, 'Add this?'), h('span', {}, p.summary),
      h('span.muted', {}, `Goes to ${p.section}`),
      h('div.row-line', {},
        h('button.btn.primary', { type: 'button', onclick: () => {
          closePop();
          const { kind, type, section, summary, ...fields } = p;
          const r = ctx.store.add(kind, fields, { type });
          input.value = '';
          toast(`Added to ${section}.`, { undo: () => ctx.store.undo() });
          onAdded(r, p);
        } }, 'Add it'),
        h('button.btn', { type: 'button', onclick: closePop }, 'Cancel'))), { width: 360 });
  };
  return wrap;
}

// ---------- Time toggle (R154) ----------
export function timeToggle(ctx) {
  return toggle([['$', '$'], ['Hours', 'Hours'], ['FI days', 'FI days']], ctx.timeMode, m => ctx.setTimeMode(m), { label: 'Show amounts as' });
}

// ---------- Record list: rows, groups, bulk select, totals (R105, R109 to R114, R165, R171, R172) ----------
export function recordList(ctx, cfg) {
  const root = h('div.list-wrap');
  const state = { selected: new Set(), folded: new Set(), open: new Set() };
  const draw = () => {
    // Keep the box being typed in (R165: never lose your place).
    const focus = document.activeElement?.dataset?.focus;
    clear(root, render());
    if (focus) root.querySelector(`[data-focus="${CSS.escape(focus)}"]`)?.focus();
  };
  const update = (rec, patch) => { ctx.store.update(rec.id, patch); flashSaved(root.querySelector(`tr[data-id="${rec.id}"]`)); };
  const addNew = (type, name = null, after = null) => {
    const r = ctx.store.add(cfg.kind, { name: name ?? null, ...(cfg.newValues?.(type) || {}) }, { type: type ?? cfg.defaultType ?? null, after });
    requestAnimationFrame(() => root.querySelector(`tr[data-id="${r.id}"] input`)?.focus());
    return r;
  };
  const remove = (ids, anchor) => {
    const list = [...ids];
    const linked = list.length === 1 ? ctx.store.linked(list[0]) : [];
    const go = withLinked => {
      const n = ctx.store.remove(list, { withLinked });
      state.selected.clear();
      toast(n > 1 ? `Deleted ${n}.` : 'Deleted.', { undo: () => ctx.store.undo() });
    };
    if (linked.length) {
      confirmBox(anchor, { text: `Delete the ${cfg.thing.one} only, or the ${linked[0].name || linked[0].type} too?`, yes: `Delete the ${cfg.thing.one} only`, no: 'Keep it', onYes: () => go(false),
        extra: { label: 'Delete both', run: () => go(true) } });
    } else go(false);
  };
  const reset = ids => { const n = ids.length; ctx.store.reset(ids); toast(n > 1 ? `Reset ${n}.` : 'Reset.', { undo: () => ctx.store.undo() }); };

  function render() {
    const m = ctx.metrics();
    const recs = ctx.store.find(cfg.filter);
    const head = h('div.section-title', {}, h('h2', {}, cfg.title), h('span.spacer'), cfg.headerExtra?.(ctx) ?? null,
      recs.length ? iconButton('reset', `Clear all ${cfg.thing.plural}`, e => confirmBox(e.currentTarget, {
        text: `Clear all ${recs.length} ${recs.length === 1 ? cfg.thing.one : cfg.thing.plural}? You can undo this.`,
        yes: `Clear ${cfg.thing.plural}`, no: 'Keep them', onYes: () => { ctx.store.resetSection(cfg.filter); toast('Cleared.', { undo: () => ctx.store.undo() }); } })) : null);
    const addBtn = addButton(cfg.thing.one, e => cfg.picker ? openAddPicker(e.currentTarget, { thing: cfg.thing.one, ...cfg.picker, onPick: (t, own) => addNew(t, own) }) : addNew(null));
    if (!recs.length) return h(`div.section.area-${cfg.area}`, {}, head, h('div.list', {}, emptyList(cfg.thing, e => addBtn.click())));

    const sel = [...state.selected].filter(id => recs.some(r => r.id === id));
    const bulk = sel.length ? bulkBar(ctx, sel, {
      all: recs.length, onClear: () => { state.selected.clear(); draw(); },
      onDuplicate: () => { ctx.store.duplicate(sel); toast(`Duplicated ${sel.length}.`, { undo: () => ctx.store.undo() }); },
      onDelete: e => remove(sel, e.currentTarget), onReset: () => reset(sel),
      onStatus: s => { ctx.store.setStatus(sel, s); toast(`Set ${sel.length} to ${s}.`, { undo: () => ctx.store.undo() }); },
      onLink: id => { ctx.store.transaction('Link to card', () => sel.forEach(x => ctx.store.update(x, { paidWith: id }))); toast(`Linked ${sel.length}.`, { undo: () => ctx.store.undo() }); },
    }) : null;
    const allBox = h('input', { type: 'checkbox', 'aria-label': 'Select all', checked: sel.length === recs.length });
    allBox.indeterminate = sel.length > 0 && sel.length < recs.length;
    allBox.onchange = () => { if (allBox.checked) recs.forEach(r => state.selected.add(r.id)); else state.selected.clear(); draw(); };
    const cols = cfg.columns.filter(c => !c.couple || ctx.couple);
    const thead = h('thead', {}, h('tr', {}, h('th.check-cell', {}, allBox), cols.map(c => h(`th${c.num ? '.num' : ''}`, {}, c.label)), h('th', {}, 'Status'), h('th', {}, h('span.sr', {}, 'Actions'))));
    const groups = new Map();
    for (const r of recs) { const g = cfg.groupBy?.(r) ?? ''; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r); }
    const body = h('tbody');
    const multi = groups.size > 1; // R171: group headers when more than one type
    for (const [g, rows] of groups) {
      if (multi) {
        const folded = state.folded.has(g);
        body.append(h('tr.group', { onclick: () => { folded ? state.folded.delete(g) : state.folded.add(g); draw(); } },
          h('td', { colspan: cols.length + 3 }, h('span.fold', {}, icon(folded ? 'right' : 'down'), `${g} (${rows.length})`,
            cfg.subtotal ? h('span.muted', {}, ' · ', cfg.subtotal(ctx, rows, m)) : null))));
        if (folded) continue;
      }
      for (const r of rows) {
        const box = h('input', { type: 'checkbox', 'aria-label': `Select ${r.name || r.type || cfg.thing.one}`, checked: state.selected.has(r.id) });
        box.onchange = () => { box.checked ? state.selected.add(r.id) : state.selected.delete(r.id); draw(); };
        const open = state.open.has(r.id);
        const tr = h(`tr.row${state.selected.has(r.id) ? '.selected' : ''}`, { 'data-id': r.id },
          h('td.check-cell', {}, box),
          cols.map(c => h(`td${c.num ? '.num' : ''}`, {}, c.render(ctx, r, m, p => update(r, p)))),
          h('td', {}, statusPicker(r.status, s => update(r, { status: s }))),
          h('td', {}, h('span.actions', {},
            iconButton('copy', 'Duplicate', () => { ctx.store.duplicate(r.id); toast('Duplicated.', { undo: () => ctx.store.undo() }); }),
            iconButton('reset', 'Reset', () => reset([r.id])),
            iconButton('trash', 'Delete', e => remove([r.id], e.currentTarget)),
            h('button.caret', { type: 'button', 'aria-expanded': String(open), onclick: () => { open ? state.open.delete(r.id) : state.open.add(r.id); draw(); } },
              open ? 'Less' : 'More', icon(open ? 'down' : 'right')))));
        // Enter in a row = new row below (R168).
        tr.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.target.dispatchEvent(new Event('change')); addNew(r.type, null, r.id); } });
        body.append(tr);
        if (open) body.append(h('tr.more', {}, h('td', { colspan: cols.length + 3 }, moreLayers(ctx, r, cfg, p => update(r, p)))));
      }
    }
    const tfoot = cfg.totals ? h('tfoot', {}, h('tr', {}, h('td', {}), cfg.totals(ctx, recs, m, cols))) : null;
    const done = recs.filter(r => (cfg.coreFields || ['amount']).every(f => countsAsDone(statusOf(r, f)))).length;
    return h(`div.section.area-${cfg.area}`, {}, head,
      cfg.strip ? cfg.strip(ctx, m) : null,
      h('div.list', {}, bulk, h('div.list-scroll', {}, h('table.rows', {}, thead, body, tfoot)),
        sectionFooter(ctx, { add: addBtn, total: cfg.footerTotal?.(ctx, recs, m), count: recs.length, done, of: recs.length }),
        keyboardHint()));
  }
  ctx.onRefresh(draw);
  draw();
  return root;
}

// Secondary then Tertiary behind the caret. Paid with sits at the top (Mockup).
function moreLayers(ctx, r, cfg, update) {
  return h('div', {},
    cfg.paidWith ? h('div.layer', {}, paidWith(ctx, r, id => update({ paidWith: id }))) : null,
    cfg.secondary ? h('div.layer', {}, cfg.secondary(ctx, r, update)) : null,
    cfg.tertiary ? h('div.layer', {}, cfg.tertiary(ctx, r, update)) : null,
    h('div.layer', {}, h('span.label', {}, 'Where it came from: '), h('span.tag.plain', {}, r.source)));
}

function bulkBar(ctx, sel, a) {
  const cards = ctx.store.find(r => r.kind === 'debt' && r.type === 'Credit card');
  const statusBtn = h('button.btn.small', { type: 'button' }, icon('tag'), 'Set status', icon('down'));
  statusBtn.onclick = () => popover(statusBtn, h('div.stack', {}, STATUSES.map(s => h('button.btn.small', { type: 'button', onclick: () => { closePop(); a.onStatus(s); } }, statusTag(s)))));
  const linkBtn = h('button.btn.small', { type: 'button', disabled: !cards.length, title: cards.length ? null : 'Add a credit card first' }, icon('link'), 'Link to card', icon('down'));
  linkBtn.onclick = () => popover(linkBtn, cards.length <= 4
    ? h('div.stack', {}, h('h3', {}, 'Paid with'), cards.map(c => h('button.btn', { type: 'button', onclick: () => { closePop(); a.onLink(c.id); } }, c.name || 'Credit card')))
    : cardSearch(cards, null, id => { closePop(); a.onLink(id); }));
  return h('div.bulk-bar', {}, h('span.count', {}, `${sel.length} selected`),
    iconButton('copy', 'Duplicate', a.onDuplicate), iconButton('reset', 'Reset', a.onReset), iconButton('trash', 'Delete', a.onDelete),
    statusBtn, linkBtn, h('span', { style: { flex: 1 } }), iconButton('x', 'Clear selection', a.onClear));
}

// ---------- Visuals panel (ECharts, area hues) ----------
export function visualsPanel(ctx, { charts, area }) {
  // DMMT 'Watch': Side on wide screens, Below on narrow ones; Hide is one click.
  const state = { pick: charts[0].name, place: window.innerWidth >= 1400 ? 'Side' : 'Below' };
  const wrap = h('div.vis-panel.card');
  queueMicrotask(() => wrap.closest('.visuals')?.classList.toggle('below', state.place === 'Below'));
  let chart = null;
  const draw = () => {
    const c = charts.find(x => x.name === state.pick);
    const pick = h('select.plain', { 'aria-label': 'Chart' }, charts.map(x => h('option', { selected: x.name === state.pick }, x.name)));
    pick.onchange = () => { state.pick = pick.value; draw(); };
    const host = h('div.chart');
    clear(wrap, h('div.bar-top', {}, h('span.dot', { class: `area-${area}` }), h('strong', {}, 'Chart'), pick, h('span', { style: { flex: 1 } }),
      toggle(['Hide', 'Side', 'Below'], state.place, p => { state.place = p; wrap.closest('.visuals')?.classList.toggle('below', p === 'Below'); wrap.closest('.visuals')?.classList.toggle('hidden', p === 'Hide'); draw(); }, { label: 'Where the chart sits' })),
    state.place === 'Hide' ? null : host);
    if (state.place === 'Hide') return;
    const data = c.data(ctx);
    if (data.needs) { clear(host, chartEmpty(ctx, data.needs)); host.style.height = 'auto'; return; }
    if (!window.echarts) { clear(host, h('div.chart-empty', {}, 'The chart library did not load. Check the connection.')); return; }
    chart?.dispose();
    chart = window.echarts.init(host, null, { renderer: 'svg' });
    chart.setOption(c.option(data, chartTheme(area)));
    new ResizeObserver(() => chart?.resize()).observe(host);
  };
  ctx.onRefresh(draw);
  queueMicrotask(draw);
  return wrap;
}
export function chartTheme(area) {
  const css = getComputedStyle(document.documentElement);
  const v = n => css.getPropertyValue(n).trim();
  return { area: v(`--${area}`), text: v('--text'), text2: v('--text-2'), line: v('--border-row'), card: v('--card'), font: v('--font') };
}
