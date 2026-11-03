// Staples: pieces built once and used everywhere (Staples tab, R103 to R114, R156 to R174, R182 to R185).
import { h, clear, icon } from './dom.js';
import { STATUSES, SURE, sureOf, statusOf, changeSince, countsAsDone } from '../records.js';
import { metrics, keyNumbers } from '../math/metrics.js';
import { inView, timeChip } from '../math/time.js';
import { money, pct, number, EMPTY, duration } from '../format.js';
import { joinWords } from '../math/result.js';
import { parseQuickAdd } from '../quickadd.js';
import { canQuickFill, quickFill } from './quickfill.js';
import { gatesOf, gatedOut } from '../gates.js';
import { keepPlace } from './place.js';
import { opened, install as installDismiss } from './dismiss.js';
export { keepPlace };

// ---------- Context: the store, the time view, the numbers, toasts ----------
export function createCtx({ store, ref, now = () => new Date() }) {
  let cache = null;
  const listeners = new Set();
  const ctx = {
    store, ref, now,
    get timeMode() { return store.doc.settings.timeView || '$'; },
    setTimeMode(mode) { store.doc.settings.timeView = mode; cache = null; ctx.refresh(); store._emit({ type: 'settings' }); },
    get couple() { return ctx.gates().couple; },
    gates() { return gatesOf(store.doc.profile, store.doc.client); },
    // Rows that apply to this household: a gate that says no takes them off every list (R001).
    visible(pred) { const g = ctx.gates(); return store.find(r => pred(r) && !gatedOut(r, g, ref)); },
    metrics() { return (cache ??= metrics(store.doc, ref, { now: now() })); },
    // Screens register here; the shell clears them when it leaves the screen (keep: shell-level).
    onRefresh(fn, { keep = false } = {}) { fn.keep = keep; listeners.add(fn); return () => listeners.delete(fn); },
    clearScreen() { for (const fn of listeners) if (!fn.keep) listeners.delete(fn); },
    refresh() { cache = null; for (const fn of [...listeners]) fn(); },
    goTo: () => {}, // the shell replaces this; the staples page stays put
  };
  store.subscribe(() => ctx.refresh());
  return ctx;
}

// ---------- Buttons ----------
export function button(label, { kind = 'secondary', iconName = null, onClick, size = null, tip = null, disabled = false, why = null } = {}) {
  return h(`button.btn${kind === 'primary' ? '.primary' : kind === 'danger' ? '.danger' : ''}${size ? `.${size}` : ''}`,
    { type: 'button', onclick: onClick, disabled, title: disabled && why ? why : null, 'data-tip': tip, 'data-focus': typeof label === 'string' ? `btn:${label}` : null },
    iconName ? icon(iconName) : null, label, disabled && why ? h('span.sr', {}, ` (${why})`) : null);
}
export function iconButton(name, label, onClick, { tiny = false, disabled = false } = {}) {
  return h(`button.icon-btn${tiny ? '.tiny' : ''}`, { type: 'button', 'aria-label': label, 'data-tip': label, 'data-focus': `icon:${label}`, onclick: onClick, disabled }, icon(name));
}
// Add button: '+ Add [thing]', outlined, bottom left of every section (R103).
export function addButton(thing, onClick) {
  return h('button.btn', { type: 'button', onclick: onClick, 'data-add': thing }, icon('plus'), `Add ${thing}`);
}

// Segmented toggle (Fixed | Variable, $ | Hours | FI days, Side | Below ...). The pick colors at once,
// even where nothing redraws (a box that only keeps the answer until Save).
// clearable: clicking the picked one again takes the answer back (an answer, not a setting).
export function toggle(options, value, onChange, { label = null, clearable = false } = {}) {
  return h('div.seg', { role: 'group', 'aria-label': label },
    options.map(o => {
      const [v, text] = Array.isArray(o) ? o : [o, o];
      return h('button', { type: 'button', 'aria-pressed': String(v === value), 'data-focus': label ? `seg:${label}:${v}` : null, title: clearable && v === value ? 'Click again to clear' : null, onclick: e => {
        const off = clearable && e.currentTarget.getAttribute('aria-pressed') === 'true';
        for (const b of e.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(!off && b === e.currentTarget));
        onChange(off ? null : v);
      } }, text);
    }));
}

// ---------- Popovers ----------
let openPop = null, popAnchor = null, forgetPop = null;
// Click outside or Escape closes it (one shared mechanism, js/ui/dismiss.js). A box opened from inside another box
// (New client from the client menu) replaces it. Focus goes back to the button that opened the box.
export function closePop() {
  const back = openPop?.contains(document.activeElement) && popAnchor?.isConnected ? popAnchor : null;
  openPop?.remove(); openPop = null; popAnchor = null;
  forgetPop?.(); forgetPop = null;
  back?.focus({ preventScroll: true });
}
export function popover(anchor, content, { width = null } = {}) {
  closePop();
  const r = anchor.getBoundingClientRect();
  const pop = h('div.pop', { role: 'dialog', style: { top: `${r.bottom + window.scrollY + 6}px`, left: `${Math.max(8, r.left + window.scrollX)}px`, ...(width ? { width: `${width}px` } : {}) } }, content);
  document.body.append(pop);
  const over = pop.getBoundingClientRect().right - window.innerWidth + 12;
  if (over > 0) pop.style.left = `${Math.max(8, parseFloat(pop.style.left) - over)}px`;
  openPop = pop; popAnchor = anchor;
  forgetPop = opened({ el: pop, anchor, pop: true, close: () => { if (openPop === pop) closePop(); } });
  setTimeout(() => pop.querySelector('input, button')?.focus());
  return pop;
}
if (typeof document !== 'undefined') installDismiss(document, window);

// ---------- Toasts: bottom left; 5 seconds, or 10 with Undo ----------
let toastEl = null, toastTimer = null;
export function toast(text, { undo = null, action = null } = {}) {
  toastEl?.remove(); clearTimeout(toastTimer);
  toastEl = h('div.toast', { role: 'status' }, h('span', {}, text),
    undo ? h('button.btn', { type: 'button', onclick: () => { undo(); toastEl?.remove(); } }, icon('undo'), 'Undo') : null,
    action ? h('button.btn', { type: 'button', onclick: () => { action.run(); toastEl?.remove(); } }, action.label) : null);
  document.body.append(toastEl);
  toastTimer = setTimeout(() => toastEl?.remove(), undo ? 10000 : 5000); // 10 seconds when it can be undone
}

// ---------- Saved moment (R164) ----------
export function savedNote() { return h('span.saved-note', { 'aria-live': 'polite' }, icon('check'), 'Saved'); }
export function flashSaved(rowEl) {
  rowEl?.classList.remove('flash'); void rowEl?.offsetWidth; rowEl?.classList.add('flash');
  document.querySelectorAll('.saved-note').forEach(n => { n.classList.add('on'); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('on'), 1500); });
}

// ---------- Status tag (R053, R160): a symbol as well as a color ----------
const TAG = {
  'Roughly': ['roughly', '≈ Roughly'], 'Not sure': ['guess', '? Guess'], 'Will email': ['plain', "I'll find it later"],
  'Not now': ['plain', 'Not now'], 'Not for me': ['plain', 'Not for me'], 'Computed': ['plain', 'Computed'], 'Know it': ['plain', 'Know it'],
};
export function statusTag(status) {
  if (!status) return null;
  const [cls, text] = TAG[status] || ['plain', status];
  return h(`span.tag.${cls}`, {}, text);
}
export function warnTag(text) { return h('span.tag.warn', {}, '⚠ ', text); }
export const guessTag = () => h('span.tag.guess', {}, '? Guess');

// One sureness system: the face says Know it, Rough or Missing; the finer status is picked inside (polish item 1).
const FACE = { 'Know it': ['plain', 'Know it'], Rough: ['roughly', '≈ Rough'], Missing: ['missing', 'Missing'], 'Not for me': ['plain', 'Not for me'] };
export function sureTag(status, hasValue = true) {
  const face = sureOf(status, hasValue);
  const [cls, text] = FACE[face];
  return h(`span.tag.${cls}`, { title: status && face !== status ? `${face}: ${TAG[status]?.[1].replace(/^[?≈] /, '') ?? status}` : null }, text);
}
// The menu: Know it; Rough (Roughly, Guess); Missing (Not now, I'll find it later); then Not for me, which hides it.
export function statusMenu(onPick, current = null) {
  const pickBtn = (s, text) => h('button.btn.small', { type: 'button', 'aria-pressed': String(s === current), onclick: () => { closePop(); onPick(s); } }, text);
  const group = (name, list) => h('div.sure-group', {}, h('span.label', {}, name), h('div.row-line', { style: { gap: '6px' } }, list.map(s => pickBtn(s, TAG[s][1].replace(/^[?≈] /, '')))));
  return h('div.stack.sure-menu', { style: { gap: '10px' } }, h('h3', {}, 'How sure is this?'),
    h('div.sure-group', {}, pickBtn('Know it', 'Know it')),
    group('Rough', SURE.Rough), group('Missing', SURE.Missing),
    h('hr'), h('div.row-line', { style: { gap: '6px' } }, pickBtn('Not for me', 'Not for me (hide it)'),
      h('button.btn.small', { type: 'button', onclick: () => { closePop(); onPick(null); } }, 'Clear')));
}
export function statusPicker(current, onPick, { label = 'Status', hasValue = true } = {}) {
  const face = sureOf(current, hasValue);
  const b = h(`button.status-btn${face === 'Know it' ? '.quiet' : ''}`, { type: 'button', 'aria-label': `${label}: ${face}${current && current !== face ? `, ${TAG[current]?.[1] ?? current}` : ''}`, 'data-focus': `status:${label}` },
    face === 'Know it' ? 'Know it' : sureTag(current, hasValue), icon('down'));
  b.onclick = () => popover(b, statusMenu(onPick, current));
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
// The grey hours chip on its own, for amounts typed in a box (R155: over $50).
export function hoursChip(ctx, v) {
  if (ctx.timeMode !== '$' || v === null || v === undefined) return null;
  const m = ctx.metrics();
  const c = timeChip(v, { rate: m.hourly });
  return c ? h('span.time-chip', { title: m.hourly.text }, c) : null;
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
  // Numbers that can be typed right here open a box in place; the rest go to where they live.
  return joinWordsEl(list.map(n => canQuickFill(n)
    ? h('button.btn.small.need', { type: 'button', onclick: e => quickFill(ctx, e.currentTarget, n) }, icon('plus'), `Add ${n}`)
    : h('a', { href: '#', onclick: e => { e.preventDefault(); ctx.goTo(n); } }, n)));
}
function joinWordsEl(items) {
  const out = [];
  items.forEach((el, i) => { if (i) out.push(i === items.length - 1 ? ' and ' : ', '); out.push(el); });
  return out;
}
export function metricCard(ctx, label, result, { key = null, render = null, lowerIsGood = false, note = null, home = null } = {}) {
  const locked = result.value === null || result.value === undefined;
  const snap = ctx.store.lastSnapshot();
  const change = key && !locked ? changeSince(keyNumbers(ctx.metrics()), snap, key) : null;
  const good = change && (change.direction === 'down') === lowerIsGood;
  return h(`div.metric${locked ? '.locked' : ''}`, {},
    home ? h('a.label.metric-home', { href: home, title: `Open where ${label.toLowerCase()} comes from` }, label) : h('span.label', {}, label), // every number links to its home
    locked
      ? h('div.big', {}, result.never ? warnTag('Not on this path') : [icon('lock'), ` Locked: needs ${result.needs.length} ${result.needs.length === 1 ? 'number' : 'numbers'}`])
      : h('div.big', {}, mathButton(result, render ? render(result) : result.unit === 'months' ? `${Math.ceil(result.value)} months` : value(result, ctx)),
        result.unit === 'months' && !render ? h('span.when', {}, ` ${value(result, ctx).replace(/^.*\(/, '(')}`) : null),
    locked && !result.never ? h('span.change', {}, needLinks(ctx, result.needs)) : null,
    result.guess ? h('span', {}, guessTag()) : null,
    change && change.direction !== 'same' ? h(`span.change.${change.direction}${good ? '.good' : ''}`, {}, `${formatDiff(change.diff, key)} since last session`) : null,
    change && change.direction === 'same' ? h('span.change', {}, 'Same as last session') : null,
    note && !locked ? h('span.change', {}, note) : null);
}
function formatDiff(d, key) {
  if (key === 'savingsRate') return pct(Math.abs(d)).replace('%', ' pts');
  if (key === 'monthsToFi' || key === 'debtFreeMonths') return `${Math.abs(d)} months`;
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
// Shown with commas ($4,200; $15.99); typing accepts commas, $ or plain digits.
export const moneyText = v => (v === null || v === undefined ? '' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }));
export function moneyInput(value, onChange, { hint = 'Add amount', cents = true, key = null } = {}) {
  const input = h('input', { inputmode: 'decimal', placeholder: hint, 'aria-label': hint.replace(/^Add /, ''), value: moneyText(value), 'data-focus': key });
  input.onchange = () => { const n = parseNum(input.value); input.value = moneyText(n); onChange?.(n); };
  return h(`label.field.money${value !== null && value !== undefined ? '.filled' : ''}`, { style: { width: '128px' } }, h('span.pre', {}, '$'), input);
}
export function pctInput(value, onChange, { hint = 'Add APR', key = null } = {}) {
  const shown = value === null || value === undefined ? '' : +(value * 100).toFixed(3);
  const input = h('input', { inputmode: 'decimal', placeholder: hint, 'aria-label': hint.replace(/^Add /, ''), value: shown, 'data-focus': key });
  input.onchange = () => { const n = parseNum(input.value); onChange(n === null ? null : n / 100); };
  return h(`label.field.pct${value !== null && value !== undefined ? '.filled' : ''}`, { style: { width: '104px' } }, input, h('span.post', {}, '%'));
}
export function textInput(value, onChange, { hint = 'Add name', width = 180, key = null, tip = null } = {}) {
  const input = h('input', { placeholder: hint, 'aria-label': hint.replace(/^Add /, ''), value: value ?? '', 'data-focus': key });
  input.onchange = () => onChange(input.value.trim() || null);
  return h(`label.field${value ? '.filled' : ''}`, { style: { width: `${width}px` }, title: tip }, input);
}
export function perPicker(value, onChange, { key = null } = {}) {
  const s = h('select', { 'aria-label': 'per', 'data-focus': key }, ['paycheck', 'week', 'month', 'quarter', 'year'].map(p => h('option', { value: p, selected: p === value }, `per ${p}`)));
  s.onchange = () => onChange(s.value);
  return h('label.field.filled', { style: { width: '130px' } }, s);
}
// Dropdown: one from a short list (Mockup 'Dropdown'). Unanswered shows the hint, never a made-up pick.
export function select(options, value, onChange, { label, hint = 'Pick one', width = 200, key = null } = {}) {
  const s = h('select', { 'aria-label': label, 'data-focus': key },
    h('option', { value: '', selected: value === null || value === undefined || value === '' }, hint),
    options.map(o => { const [v, text] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: v === value }, text); }),
    value && !options.some(o => (Array.isArray(o) ? o[0] : o) === value) ? h('option', { value, selected: true }, value) : null); // the current value always shows
  s.onchange = () => onChange(s.value === '' ? null : s.value);
  return h(`label.field${value ? '.filled' : ''}`, { style: { width: `${width}px` } }, s);
}
export function checkbox(label, checked, onChange, { key = null } = {}) {
  const box = h('input', { type: 'checkbox', checked: !!checked, 'data-focus': key });
  box.onchange = () => onChange(box.checked);
  return h('label.check', {}, box, h('span', {}, label));
}
// A labelled box: the label above, the input under it (affordance rule 3).
// later: { on, set } adds "I'll find it later" under the box (Brandon B1.2): it parks the field on the Homework list.
// none: { on, set } adds "I don't have this" (counts as answered, as Not for me).
export const labelled = (label, input, { note = null, later = null, none = null } = {}) => h(`div.stack${later?.on || none?.on ? '.parked' : ''}`, {}, h('span.label', {}, label), input,
  note ? h('span.muted.small', {}, note) : null, later || none ? parkButtons({ later, none }, label) : null);
export function parkButtons({ later = null, none = null }, label = 'this') {
  const undo = (text, opt, what) => h('span.row-line.later-on', { style: { gap: '6px', flexWrap: 'nowrap' } }, h('span.tag.plain', {}, text),
    h('button.btn.small.later-btn', { type: 'button', 'aria-label': `${what}: ${label}`, onclick: () => opt.set(false) }, 'Undo'));
  if (later?.on) return undo('On your homework', later, 'Take off the homework list');
  if (none?.on) return undo("Don't have this", none, 'Undo');
  return h('span.row-line', { style: { gap: '4px', flexWrap: 'wrap' } },
    none ? h('button.btn.small.later-btn', { type: 'button', 'aria-label': `I don't have ${label}`, onclick: () => none.set(true) }, "I don't have this") : null,
    later ? h('button.btn.small.later-btn', { type: 'button', 'aria-label': `I'll find ${label} later`, onclick: () => { later.set(true); toast(`${label} is on your homework list, with where to find it.`); } }, "I'll find it later") : null);
}
export const laterButton = (later, label) => parkButtons({ later }, label);
// Both choices for one field of a row: its own status (Will email = later, Not for me = don't have).
export function park(ctx, r, field) {
  const st = r.fieldStatus?.[field];
  const set = s => on => ctx.store.setFieldStatus(r.id, field, on ? s : null);
  return { later: { on: st === 'Will email', set: set('Will email') }, none: { on: st === 'Not for me', set: set('Not for me') } };
}
// The same for a Profile-level answer (doc.profile.later and doc.profile.none).
export function parkProfile(store, key) {
  const p = store.doc.profile;
  const flip = (bag, on) => store.setDoc('profile', { [bag]: { ...(p[bag] || {}), [key]: on || undefined } });
  return { later: { on: !!p.later?.[key], set: on => flip('later', on) }, none: { on: !!p.none?.[key], set: on => flip('none', on) } };
}
// More / Less: Secondary and Tertiary fields stay behind a caret, closed until asked (R023). Remembers which are open.
const OPEN = new Set();
export function moreBlock(id, content, { label = 'More' } = {}) {
  const body = h('div.more-body', { hidden: true });
  const named = label !== 'More'; // a named block keeps its name when open
  const btn = h('button.caret', { type: 'button', 'data-focus': `more:${id}` });
  const wrap = h('div.more-wrap', {}, btn, body);
  let forget = null;
  const set = now => {
    const had = !now && body.contains(document.activeElement);
    now ? OPEN.add(id) : OPEN.delete(id);
    btn.setAttribute('aria-expanded', String(now)); clear(btn, now && !named ? 'Less' : label, icon(now ? 'down' : 'right'));
    body.hidden = !now; clear(body, now ? content() : null);
    forget?.(); forget = now ? opened({ el: wrap, close: () => { forget = null; set(false); } }) : null; // click away or Escape closes it
    if (had) btn.focus({ preventScroll: true });
  };
  btn.onclick = () => set(!OPEN.has(id));
  set(OPEN.has(id));
  return wrap;
}
export function parseNum(s) {
  const t = String(s ?? '').replace(/[$,%\s]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
// Minus, a box you can type in, plus. The first + from blank is 1 (or the minimum, if higher).
export function stepper(value, onChange, { min = 0, max = 20, label = 'Count', key = null } = {}) {
  const v = value ?? null;
  const clamp = n => Math.min(max, Math.max(min, n));
  const less = iconButton('minus', `Fewer: ${label}`, () => onChange(clamp((v ?? min) - 1)), { tiny: true, disabled: v === null || v <= min });
  const more = iconButton('plus', `More: ${label}`, () => onChange(clamp(v === null ? Math.max(min, 1) : v + 1)), { tiny: true, disabled: v !== null && v >= max });
  const box = h('input', { inputmode: 'numeric', 'aria-label': label, placeholder: EMPTY, value: v ?? '', 'data-focus': key ? `${key}:n` : null });
  box.onchange = () => { const n = parseNum(box.value); onChange(n === null ? null : clamp(Math.round(n))); };
  box.onkeydown = e => { if (e.key === 'ArrowUp') { e.preventDefault(); more.click(); } if (e.key === 'ArrowDown') { e.preventDefault(); less.click(); } };
  if (key) { less.dataset.focus = `${key}:less`; more.dataset.focus = `${key}:more`; }
  return h('span.row-line.stepper', { style: { gap: '6px', flexWrap: 'nowrap' } }, less,
    h(`label.field.num-box${v !== null ? '.filled' : ''}`, { style: { width: '56px' } }, box), more);
}

// The month you start paying a covered bill yourself. Optional.
function takeoverBox(rec, update) {
  const d = h('input', { type: 'month', value: rec.values.takeover || '', 'aria-label': 'You take it over in' });
  d.onchange = () => update({ takeover: d.value || null });
  return h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, h('span.label', {}, 'Becomes mine in'), h(`label.field${rec.values.takeover ? '.filled' : ''}`, { style: { width: '170px' } }, d));
}
// Who pays (every Needs line).
export const WHO_PAYS = ['Me', 'Split', 'Included in rent', 'Covered by someone', 'N/A', 'My share', "Need it, don't have yet"];
// Who covers it (B6.1): covered by me, by someone else (with an optional date it becomes mine), or not for me.
// "Me" then asks how: all mine, split with roommates, or my share of a bigger bill (B6.5). Rarer answers sit behind Other.
const MINE = [['Me', 'All mine'], ['Split', 'Split evenly'], ['My share', 'My share of the bill']];
const OTHER_WHO = ['Included in rent', 'N/A', "Need it, don't have yet"];
export function whoPays(rec, update) {
  const v = rec.values.whoPays ?? 'Me';
  const top = rec.status === 'Not for me' ? 'Not for me' : v === 'Covered by someone' ? 'Someone else' : OTHER_WHO.includes(v) ? 'Other' : 'Me';
  const pickTop = x => update(x === 'Not for me' ? { status: 'Not for me' } : { status: rec.status === 'Not for me' ? null : rec.status,
    whoPays: x === 'Someone else' ? 'Covered by someone' : x === 'Other' ? (OTHER_WHO.includes(v) ? v : OTHER_WHO[0]) : (MINE.some(([k]) => k === v) ? v : 'Me') });
  const total = rec.amount == null ? 'Add the amount above' : `${money(rec.amount)} per ${rec.per}`;
  return h('div.stack', {}, h('span.label', {}, 'Who covers it'),
    // A dropdown, not a row of buttons (fix pass item 3).
    select([['Me', 'Covered by me'], ['Someone else', 'Covered by someone else'], ['Not for me', 'Not for me'], ['Other', 'Other']], top, x => pickTop(x ?? 'Me'), { label: 'Who covers it', hint: 'Covered by me', width: 230 }),
    top === 'Me' ? toggle(MINE, MINE.some(([k]) => k === v) ? v : 'Me', x => update({ whoPays: x }), { label: 'How it is paid' }) : null,
    top === 'Me' && v === 'Split' ? h('span.row-line', {}, h('span.label', {}, 'Split by'), stepper(rec.values.splitBy ?? null, n => update({ splitBy: n }), { min: 1, label: 'Split by' }), h('span.muted.small', {}, 'Blank: you plus each roommate')) : null,
    top === 'Me' && v === 'My share' ? h('span.row-line', { style: { gap: '8px' } }, h('span.label', {}, 'Total bill'), h('span.computed', {}, total),
      h('span.label', {}, 'My share a month'), moneyInput(rec.values.myShare, x => update({ myShare: x }), { hint: 'Add my share' })) : null,
    top === 'Someone else' ? h('span.row-line', { style: { gap: '8px' } }, // M7.1: who, and when it becomes yours
      select(['Parents', 'Partner', 'Employer', 'Other'], rec.values.coveredBy ?? null, x => update({ coveredBy: x }), { label: 'Who covers it', hint: 'Who covers it', width: 150 }),
      takeoverBox(rec, update)) : null,
    top === 'Other' ? select(OTHER_WHO, v, x => update({ whoPays: x }), { label: 'Other', width: 200 }) : null);
}
// Paid with: checking or a credit card; no bill comes from savings. With one checking account or one card it is
// picked for you; with more, 'Which checking' or 'Which card' asks (buttons up to 6 cards, a search after, R112).
export function paidWith(ctx, rec, onPick) {
  const cards = ctx.store.find(r => r.kind === 'debt' && r.type === 'Credit card');
  const checking = ctx.store.find(r => r.kind === 'account' && r.type === 'Checking');
  const p = rec.paidWith;
  const way = p === 'card' || cards.some(c => c.id === p) ? 'card' : p === 'checking' || checking.some(c => c.id === p) ? 'checking' : null;
  const pickWay = w => { if (w === way) return; const list = w === 'card' ? cards : checking; onPick(list.length === 1 ? list[0].id : w); };
  const which = (label, list, name) => h('div.stack', {}, h('span.label', {}, label),
    list.length <= 6 ? toggle(list.map((c, i) => [c.id, c.name || `${name} ${i + 1}`]), p, onPick, { label }) : cardSearch(list, p, onPick));
  return h('div.stack', {}, h('span.label', {}, 'Paid with'),
    toggle([['checking', 'Checking'], ['card', 'Credit card']], way, pickWay, { label: 'Paid with' }),
    way === 'checking' && checking.length > 1 ? which('Which checking', checking, 'Checking') : null,
    way === 'card' && cards.length > 1 ? which('Which card', cards, 'Card') : null,
    way === 'card' && !cards.length ? h('span.muted', {}, 'No cards yet. Add them under Debt.') : null);
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
  // Grey computed box (cannot be typed in); its math includes the interest along the way (look preview).
  const shown = d.interest.value !== null ? { ...p, text: `${p.text} Interest along the way: ${value(d.interest, ctx)}.` } : p;
  return h('div.payoff', {},
    h('span.computed', {}, mathButton(shown, duration(p.value, ctx.now()).replace(' (', ' · ').replace(/\)$/, ''))),
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
  return h('a', { href: '#/home/profile', 'data-gate': area }, `+ Add ${area}`);
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
    e.preventDefault(); // otherwise this same Enter would press 'Add it' once it has focus
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
// Entered once elsewhere: the number is a button that opens its home, so it is never edited twice.
export function openSource(route, id) {
  location.hash = route;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row?.hidden) document.querySelector(`tr.group[data-group="${CSS.escape(row.dataset.group)}"] button.fold`)?.click();
    row?.classList.add('highlight');
    row?.querySelector('input:not([type="checkbox"])')?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'center' });
  }));
}
export function fromButton(label, route, id, { tag = false, value = null } = {}) {
  return h(tag ? 'button.tag.plain.from-tag' : 'button.btn.small.from-btn', { type: 'button', 'data-focus': `from:${id}`, title: 'Entered there; open it to change it', onclick: () => openSource(route, id) },
    value, value ? ' · ' : null, label, ' ›');
}
const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// A block that redraws itself on every change, keeping your place (for cards beside a list).
export function live(ctx, render) {
  const root = h('div.live');
  const draw = () => keepPlace(() => clear(root, render()));
  ctx.onRefresh(draw); draw();
  return root;
}
// Which groups are folded, per list, kept for the session (this browser tab). Unset groups use the list's default.
const FOLDS = (() => { try { return JSON.parse(sessionStorage.getItem('slam.folds') || '{}'); } catch { return {}; } })();
const saveFolds = () => { try { sessionStorage.setItem('slam.folds', JSON.stringify(FOLDS)); } catch { /* storage blocked: kept until reload */ } };
export function recordList(ctx, cfg) {
  const root = h('div.list-wrap');
  const listKey = cfg.key ?? slug(cfg.title);
  const folds = (FOLDS[listKey] ??= {});
  const state = { selected: new Set(), open: null, selecting: false };
  const isFolded = g => folds[g] ?? (cfg.startFolded === true || (cfg.foldedGroups || []).includes(g));
  // Looks-only changes (select, More, fold) update in place; anything else redraws inside keepPlace (R165).
  const draw = () => keepPlace(() => clear(root, render()));
  let view = null; // the parts of the last render that in-place updates touch
  const update = (rec, patch) => {
    ctx.store.transaction('Edit', () => {
      ctx.store.update(rec.id, patch);
      // A number typed in comes off the homework list (Brandon B1.2).
      for (const [f, v] of Object.entries(patch)) if (v !== null && v !== undefined && rec.fieldStatus?.[f] === 'Will email') ctx.store.setFieldStatus(rec.id, f, null);
    });
    flashSaved(root.querySelector(`tr[data-id="${rec.id}"]`));
  };
  const addNew = (type, name = null, after = null) => {
    const r = ctx.store.add(cfg.kindOf?.(type) ?? cfg.kind, { name: name ?? null, ...(cfg.newValues?.(type) || {}) }, { type: type ?? cfg.defaultType ?? null, after });
    requestAnimationFrame(() => {
      const tr = root.querySelector(`tr[data-id="${r.id}"]`);
      if (tr?.hidden) setFold(tr.dataset.group, false); // a new line opens its group
      tr?.querySelector('input:not([type="checkbox"])')?.focus();
    });
    return r;
  };
  const remove = (ids, anchor) => {
    const list = [...ids];
    const linked = list.length === 1 ? ctx.store.linked(list[0]) : [];
    const go = withLinked => {
      list.forEach(id => state.selected.delete(id));
      const n = ctx.store.remove(list, { withLinked });
      toast(n > 1 ? `Deleted ${n}.` : 'Deleted.', { undo: () => ctx.store.undo() });
    };
    if (linked.length) {
      confirmBox(anchor, { text: `Delete the ${cfg.thing.one} only, or the ${linked[0].name || linked[0].type} too?`, yes: `Delete the ${cfg.thing.one} only`, no: 'Keep it', onYes: () => go(false),
        extra: { label: 'Delete both', run: () => go(true) } });
    } else go(false);
  };
  const reset = ids => { const n = ids.length; ctx.store.reset(ids); toast(n > 1 ? `Reset ${n}.` : 'Reset.', { undo: () => ctx.store.undo() }); };

  // ---------- in-place updates ----------
  const selectedNow = () => [...state.selected].filter(id => view?.recs.some(r => r.id === id));
  function refreshSelection() {
    if (!view) return;
    const sel = selectedNow();
    for (const [id, tr] of view.rows) { tr.classList.toggle('selected', state.selected.has(id)); const b = tr.querySelector('td.check-cell input'); if (b) b.checked = state.selected.has(id); }
    view.allBox.checked = sel.length > 0 && sel.length === view.recs.length;
    view.allBox.indeterminate = sel.length > 0 && sel.length < view.recs.length;
    // The bulk bar lies over the header row, so nothing below it moves.
    clear(view.bulkHost, sel.length ? bulkBar(ctx, sel, view.actions(sel)) : null);
  }
  function setSelecting(on) {
    state.selecting = on;
    if (!on) state.selected.clear();
    root.classList.toggle('selecting', on);
    const b = root.querySelector('button.select-btn');
    if (b) { b.setAttribute('aria-pressed', String(on)); b.lastChild.textContent = on ? 'Done selecting' : 'Select'; }
    refreshSelection();
  }
  function setFold(g, folded) {
    folds[g] = folded; saveFolds();
    const head = view?.groups.get(g);
    if (!head) return;
    for (const tr of view.body.querySelectorAll('tr')) if (tr.dataset.group === g && tr !== head) tr.hidden = folded;
    const btn = head.querySelector('button.fold');
    btn.setAttribute('aria-expanded', String(!folded));
    btn.querySelector('svg').replaceWith(icon(folded ? 'right' : 'down'));
  }
  function setOpen(id) {
    if (!view) return;
    const was = state.open;
    if (was && id !== was) { forgetMore?.(); forgetMore = null; }
    // Closing the other open row (one at a time) must not move the row you clicked.
    const tr0 = view.rows.get(id), scroller = tr0?.closest('.list-scroll'), top0 = tr0?.getBoundingClientRect().top;
    state.open = id === was ? null : id;
    if (was) { view.body.querySelector(`tr.more[data-for="${was}"]`)?.remove(); caretState(view.rows.get(was), false); if (!state.open) { forgetMore?.(); forgetMore = null; } }
    if (state.open) {
      const tr = view.rows.get(state.open);
      const r = view.recs.find(x => x.id === state.open);
      if (!tr || !r) { state.open = null; return; }
      const more = moreRow(r, tr.dataset.group);
      tr.after(more);
      caretState(tr, true);
      track(tr, more);
    }
    if (scroller && top0 !== undefined) scroller.scrollTop += tr0.getBoundingClientRect().top - top0;
  }
  // Click away or Escape closes the open More (one per list); a click in its own row keeps it.
  let forgetMore = null;
  const track = (tr, more) => {
    forgetMore?.();
    const id = tr.dataset.id;
    forgetMore = opened({ el: more, anchor: tr, group: `more:${listKey}`, close: () => {
      forgetMore = null;
      if (state.open !== id) return;
      const had = more.contains(document.activeElement);
      setOpen(null);
      if (had) view?.rows.get(id)?.querySelector('button.caret')?.focus({ preventScroll: true });
    } });
  };
  const caretState = (tr, open) => {
    const c = tr?.querySelector('button.caret');
    if (c) { c.setAttribute('aria-expanded', String(open)); clear(c, open ? 'Less' : 'More', icon(open ? 'down' : 'right')); }
  };
  const moreRow = (r, g) => h('tr.more', { 'data-for': r.id, 'data-group': g }, h('td', { colspan: view.span }, moreLayers(ctx, r, cfg, p => update(r, p))));

  // A blank core number reads Missing on its face.
  const hasCore = r => (typeof cfg.coreFields === 'function' ? cfg.coreFields(r) : cfg.coreFields || ['amount'])
    .every(f => { const v = f in r && f !== 'values' ? r[f] : r.values?.[f]; return v !== null && v !== undefined && v !== ''; });
  // One "..." per row: Reset, Duplicate, Not for me (or Bring back), then Delete on its own (R105).
  const rowMenuButton = r => {
    const name = r.name || r.type || cfg.thing.one;
    const btn = h('button.icon-btn.menu-btn', { type: 'button', 'aria-label': `Actions for ${name}`, 'aria-haspopup': 'menu', 'data-tip': 'Actions', 'data-focus': 'menu' }, icon('dots'));
    const item = (label, iconName, run, { danger = false } = {}) => h(`button.menu-item${danger ? '.danger' : ''}`, { type: 'button', role: 'menuitem', onclick: () => { closePop(); run(); } }, icon(iconName), label);
    btn.onclick = () => popover(btn, h('div.row-menu', { role: 'menu', 'aria-label': `Actions for ${name}` },
      item('Reset', 'reset', () => reset([r.id])),
      item('Duplicate', 'copy', () => { ctx.store.duplicate(r.id); toast('Duplicated.', { undo: () => ctx.store.undo() }); }),
      cfg.notForMe ? (r.status === 'Not for me'
        ? item('Bring back', 'undo', () => update(r, { status: null }))
        : item('Not for me', 'x', () => { update(r, { status: 'Not for me' }); toast('Moved to Not for me. It counts as $0.', { undo: () => ctx.store.undo() }); })) : null,
      h('hr'),
      item('Delete', 'trash', () => remove([r.id], btn), { danger: true })), { width: 200 });
    return btn;
  };

  function render() {
    const m = ctx.metrics();
    const recs = ctx.visible(cfg.filter);
    root.classList.toggle('selecting', state.selecting);
    const selectBtn = h('button.btn.small.select-btn', { type: 'button', 'aria-pressed': String(state.selecting), 'data-focus': 'select-mode', onclick: () => setSelecting(!state.selecting) },
      icon('check'), h('span', {}, state.selecting ? 'Done selecting' : 'Select'));
    const head = h('div.section-title', {}, h('h2', {}, cfg.title), h('span.spacer'), cfg.headerExtra?.(ctx) ?? null, recs.length ? selectBtn : null,
      recs.length ? iconButton('eraser', `Clear all ${cfg.thing.plural}`, e => confirmBox(e.currentTarget, {
        text: `Clear all ${recs.length} ${recs.length === 1 ? cfg.thing.one : cfg.thing.plural}? You can undo this.`,
        yes: `Clear ${cfg.thing.plural}`, no: 'Keep them', onYes: () => { ctx.store.resetSection(cfg.filter); toast('Cleared.', { undo: () => ctx.store.undo() }); } })) : null);
    const picker = typeof cfg.picker === 'function' ? cfg.picker(ctx) : cfg.picker;
    const addBtn = addButton(cfg.thing.one, e => picker ? openAddPicker(e.currentTarget, { thing: cfg.thing.one, ...picker, onPick: (t, own) => addNew(t, own) }) : addNew(null));
    const autos = cfg.autoRows?.(ctx, m) ?? []; // entered elsewhere, shown here (From Debt): no input, no menu
    if (!recs.length && !autos.length) { view = null; return h(`div.section.area-${cfg.area}`, {}, head, cfg.strip && cfg.stripWhenEmpty ? cfg.strip(ctx, m) : null, h('div.list', {}, emptyList(cfg.thing, e => addBtn.click()))); }

    const allBox = h('input', { type: 'checkbox', 'aria-label': 'Select all', 'data-focus': 'select-all' });
    allBox.onchange = () => { if (allBox.checked) recs.forEach(r => state.selected.add(r.id)); else state.selected.clear(); refreshSelection(); };
    const cols = cfg.columns.filter(c => c && (!c.couple || ctx.couple));
    const span = cols.length + 3;
    const thead = h('thead', {}, h('tr', {}, h('th.check-cell', {}, allBox), cols.map(c => h(`th${c.num ? '.num' : ''}`, {}, c.label)), h('th', {}, 'Status'), h('th', {}, h('span.sr', {}, 'Actions'))));
    const groups = new Map();
    for (const r of [...recs, ...autos]) { const g = cfg.groupBy?.(r) ?? ''; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r); }
    for (const g of cfg.lastGroups || []) if (groups.has(g)) { const rows = groups.get(g); groups.delete(g); groups.set(g, rows); } // e.g. Not for me sits at the bottom
    const body = h('tbody');
    const rowEls = new Map(), groupEls = new Map();
    view = { recs, rows: rowEls, groups: groupEls, body, span, allBox, bulkHost: h('div.bulk-host'), actions: sel => ({
      all: recs.length, onClear: () => { state.selected.clear(); refreshSelection(); },
      onDuplicate: () => { ctx.store.duplicate(sel); toast(`Duplicated ${sel.length}.`, { undo: () => ctx.store.undo() }); },
      onDelete: e => remove(sel, e.currentTarget), onReset: () => reset(sel),
      onStatus: s => { ctx.store.setStatus(sel, s); toast(`Set ${sel.length} to ${s}.`, { undo: () => ctx.store.undo() }); },
      onLink: id => { ctx.store.transaction('Link to card', () => sel.forEach(x => ctx.store.update(x, { paidWith: id }))); toast(`Linked ${sel.length}.`, { undo: () => ctx.store.undo() }); },
    }) };
    const multi = groups.size > 1; // R171: group headers when more than one type
    for (const [g, rows] of groups) {
      const folded = multi && isFolded(g);
      if (multi) {
        const tr = h('tr.group', { 'data-group': g },
          h('td', { colspan: span }, h('span.row-line.group-line', { style: { gap: '10px', flexWrap: 'nowrap' } },
            h('button.fold', { type: 'button', 'aria-expanded': String(!folded), 'data-focus': `fold:${g}`, onclick: () => setFold(g, !isFolded(g)) },
              icon(folded ? 'right' : 'down'), `${cfg.groupLabel?.(g) ?? g} (${rows.length})`, cfg.subtotal ? h('span.muted', {}, ' · ', cfg.subtotal(ctx, rows, m)) : null),
            // B6.6: add a line right in this section.
            cfg.groupAdd && cfg.groupAdd(g) ? h('button.btn.small.group-add', { type: 'button', 'data-focus': `group-add:${g}`, onclick: () => {
              const r = ctx.store.add(cfg.kind, cfg.groupAdd(g), { type: null });
              setFold(g, false);
              requestAnimationFrame(() => { const t = root.querySelector(`tr[data-id="${r.id}"]`); if (t?.hidden) setFold(t.dataset.group, false); t?.querySelector('input:not([type="checkbox"])')?.focus(); });
            } }, icon('plus'), 'Add a line') : null)));
        groupEls.set(g, tr);
        body.append(tr);
      }
      for (const r of rows) {
        if (r.auto) {
          body.append(h('tr.row.auto', { 'data-id': r.id, 'data-group': g, hidden: folded }, h('td.check-cell'),
            cols.map((c, i) => h(`td.col-${slug(c.label)}${i === 0 ? '.col-first' : ''}${c.num ? '.num' : ''}`, {}, cfg.autoCell?.(ctx, r, c, m) ?? null)),
            h('td.col-status', {}, h('span.tag.plain', {}, `From ${r.auto.from}`)), h('td.col-actions')));
          continue;
        }
        const box = h('input', { type: 'checkbox', 'aria-label': `Select ${r.name || r.type || cfg.thing.one}`, checked: state.selected.has(r.id), 'data-focus': 'sel' });
        box.onchange = () => { box.checked ? state.selected.add(r.id) : state.selected.delete(r.id); refreshSelection(); };
        const open = state.open === r.id;
        const tr = h(`tr.row${state.selected.has(r.id) ? '.selected' : ''}`, { 'data-id': r.id, 'data-group': g, hidden: folded },
          h('td.check-cell', {}, box),
          cols.map((c, i) => h(`td.col-${slug(c.label)}${i === 0 ? '.col-first' : ''}${c.num ? '.num' : ''}`, {}, c.render(ctx, r, m, p => update(r, p), { remove: e => remove([r.id], e.currentTarget) }))),
          h('td.col-status', {}, statusPicker(r.status, s => update(r, { status: s }), { hasValue: hasCore(r) })),
          h('td.col-actions', {}, h('span.actions', {},
            h('button.caret', { type: 'button', 'aria-expanded': String(open), 'data-focus': 'more', onclick: () => setOpen(r.id) },
              open ? 'Less' : 'More', icon(open ? 'down' : 'right')),
            rowMenuButton(r))));
        // Enter in a row = new row below (R168).
        tr.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.target.dispatchEvent(new Event('change')); addNew(r.type, null, r.id); } });
        rowEls.set(r.id, tr);
        body.append(tr);
        const note = cfg.rowNote?.(ctx, r, m); // e.g. "Looks like the same payment: keep one"
        if (note) body.append(h('tr.row-note', { 'data-for': r.id, 'data-group': g, hidden: folded }, h('td', { colspan: span }, note)));
        if (open) { const more = moreRow(r, g); more.hidden = folded; body.append(more); track(tr, more); }
      }
    }
    if (state.open && !rowEls.has(state.open)) state.open = null;
    const tfoot = cfg.totals ? h('tfoot', {}, h('tr', {}, h('td.check-cell', {}), cfg.totals(ctx, recs, m, cols))) : null;
    const done = recs.filter(r => (cfg.coreFields || ['amount']).every(f => countsAsDone(statusOf(r, f)))).length;
    const out = h(`div.section.area-${cfg.area}`, {}, head,
      cfg.strip ? cfg.strip(ctx, m) : null,
      h('div.list', {}, view.bulkHost, h('div.list-scroll', { 'data-scroll-key': listKey }, h('table.rows', {}, thead, body, tfoot)),
        sectionFooter(ctx, { add: addBtn, total: cfg.footerTotal?.(ctx, recs, m), count: recs.length, done, of: recs.length }),
        keyboardHint()));
    refreshSelection();
    return out;
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
  statusBtn.onclick = () => popover(statusBtn, statusMenu(s => s && a.onStatus(s)));
  const linkBtn = h('button.btn.small', { type: 'button', disabled: !cards.length, title: cards.length ? null : 'Add a credit card first' }, icon('link'), 'Link to card', icon('down'));
  linkBtn.onclick = () => popover(linkBtn, cards.length <= 4
    ? h('div.stack', {}, h('h3', {}, 'Paid with'), cards.map(c => h('button.btn', { type: 'button', onclick: () => { closePop(); a.onLink(c.id); } }, c.name || 'Credit card')))
    : cardSearch(cards, null, id => { closePop(); a.onLink(id); }));
  return h('div.bulk-bar', {}, h('span.count', {}, `${sel.length} selected`),
    statusBtn, linkBtn, iconButton('copy', 'Duplicate', a.onDuplicate), iconButton('reset', 'Reset', a.onReset),
    h('span', { style: { flex: 1 } }), iconButton('trash', 'Delete', a.onDelete), iconButton('x', 'Clear selection', a.onClear)); // Reset never sits next to Delete
}

// ---------- Visuals panel (ECharts, area hues) ----------
export function visualsPanel(ctx, { charts, area }) {
  // DMMT 'Watch': Side on wide screens (1600px and up, so a full row still fits), Below otherwise; Hide is one click.
  const state = { pick: charts[0].name, place: window.innerWidth >= 1600 ? 'Side' : 'Below' };
  const wrap = h('div.vis-panel.card');
  // Where it sits starts from CSS (by screen width), so the first paint never shifts the page; a pick sets a class.
  const place = () => { const v = wrap.closest('.visuals'); for (const [c, p] of [['below', 'Below'], ['side', 'Side'], ['hidden', 'Hide']]) v?.classList.toggle(c, state.place === p); };
  let chart = null, host = null;
  const paint = () => {
    const c = charts.find(x => x.name === state.pick);
    if (state.place === 'Hide' || !host) return;
    const data = c.data(ctx);
    chart?.dispose(); chart = null;
    if (data.needs) { clear(host, chartEmpty(ctx, data.needs)); host.style.height = 'auto'; return; }
    host.style.height = '';
    if (!window.echarts) { clear(host, h('div.chart-empty', {}, 'The chart library did not load. Check the connection.')); return; }
    clear(host);
    chart = window.echarts.init(host, null, { renderer: 'svg' });
    chart.setOption(c.option(data, chartTheme(area)));
  };
  const build = () => {
    const pick = h('select.plain', { 'aria-label': 'Chart', 'data-focus': `chart:${area}` }, charts.map(x => h('option', { selected: x.name === state.pick }, x.name)));
    pick.onchange = () => { state.pick = pick.value; paint(); };
    host = h('div.chart', { hidden: state.place === 'Hide' });
    new ResizeObserver(() => chart?.resize()).observe(host);
    // Hide, Side and Below only move the panel: no redraw.
    clear(wrap, h('div.bar-top', {}, h('span.dot', { class: `area-${area}` }), h('strong', {}, 'Chart'), pick, h('span', { style: { flex: 1 } }),
      toggle(['Hide', 'Side', 'Below'], state.place, p => { const was = state.place; state.place = p; place(); host.hidden = p === 'Hide'; if (was === 'Hide') paint(); else chart?.resize(); }, { label: 'Where the chart sits' })),
    host);
  };
  ctx.onRefresh(() => keepPlace(() => { build(); paint(); }));
  build();
  queueMicrotask(paint); // the chart needs the panel on the page to measure
  return wrap;
}
export function chartTheme(area) {
  const css = getComputedStyle(document.documentElement);
  const v = n => css.getPropertyValue(n).trim();
  return { area: v(`--${area}`), text: v('--text'), text2: v('--text-2'), line: v('--border-row'), card: v('--card'), font: v('--font') };
}
