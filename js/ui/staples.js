// SPDX-License-Identifier: AGPL-3.0-only
// Staples: pieces built once and used everywhere (Staples tab, R103 to R114, R156 to R174, R182 to R185).
import { h, clear, icon } from './dom.js';
import { STATUSES, SURE, sureOf, statusOf, changeSince, countsAsDone, SOURCE_WORDS } from '../records.js';
import { metrics, keyNumbers } from '../math/metrics.js';
import { inView, timeChip } from '../math/time.js';
import { money, pct, number, EMPTY, duration } from '../format.js';
import { joinWords } from '../math/result.js';
import { myShare, wholeBill, splitOf, withHome, isFaded, typicalOf } from '../math/spending.js';
import { nextCheck } from '../checks.js';
import { parseQuickAdd } from '../quickadd.js';
import { canQuickFill, quickFill } from './quickfill.js';
import { addMonths, ymOf, monthName } from '../month.js';
import { gatesOf, gatedOut } from '../gates.js';
import { keepPlace } from './place.js';
import { opened, install as installDismiss } from './dismiss.js';
import { PERSONS, personLabels, onePerson, ownerOf, modeOf, ownPlanPerson } from '../registry/couples.js';
import { isBlankRow } from '../completion.js';
export { keepPlace };
import { secWrap, sectionOpen, caretButton } from './sections.js';
export { sec, secWrap, secCard, openAround, sectionOpen } from './sections.js'; // batch 13: the caret header on every section

// A core field is handled when it is done, or on the Homework list (batch 7, item 4), or the institution comes from the
// Institutions list (item 3). The same rule as js/completion.js, so a row's amber marker agrees with the counters.
export const handled = (r, f) => countsAsDone(statusOf(r, f)) || statusOf(r, f) === 'Will email' || (f === 'institution' && !!r.values?.institutionId);

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
    // Batch 15 (question 212): a couple with no combined totals (Dating, Living together) sees one person's own plan
    // everywhere, this client's unless the person switch says the partner's.
    metrics() { return (cache ??= metrics(store.doc, ref, { now: now(), person: ownPlanPerson(store.doc) })); },
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
  return h('button.btn', { type: 'button', onclick: onClick, 'data-add': thing, 'data-focus': `add:${thing}` }, icon('plus'), `Add ${thing}`); // batch 14: Find lands here when there is nothing yet
}

// Segmented toggle (Fixed | Variable, $ | Hours | FI days, Side | Below ...). The pick colors at once,
// even where nothing redraws (a box that only keeps the answer until Save).
// clearable: clicking the picked one again takes the answer back (an answer, not a setting).
// The Owner tag (F2): Person A, Person B or Joint, with the names once typed. A retirement or health account is one person's.
// Batch 13: in a table row it is one slim chip with the name (like the /mo chip); a tap opens the choices, so the
// Owner column never pushes the table past the window.
export function ownerToggle(ctx, r, up) {
  const names = personLabels(ctx.store.doc);
  const options = (onePerson(r) ? PERSONS.filter(p => p !== 'Joint') : PERSONS).map(p => [p, names[p]]);
  const cur = ownerOf(r, modeOf(ctx.store.doc.profile));
  const label = names[cur] ?? cur;
  const b = h('button.per-chip.owner-chip', { type: 'button', 'aria-label': `Owner: ${label}. Change`, title: `Owner: ${label}. Click to change`, 'data-focus': `${r.id}:owner` }, label, icon('down'));
  b.onclick = () => popover(b, h('div.stack', { style: { gap: '6px' } }, h('h3', {}, 'Whose is it'),
    toggle(options, cur, v => { closePop(); up({ owner: v }); }, { label: 'Owner' })), { width: 300 });
  return b;
}
export function toggle(options, value, onChange, { label = null, clearable = false, key = null } = {}) {
  return h('div.seg', { role: 'group', 'aria-label': label, 'data-focus': key }, // key: the row field's handle for Show me (batch 7, item 3)
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
  'Roughly': ['roughly', '≈ Roughly'], 'Not sure': ['guess', '? Guess'], 'Will email': ['getting', 'Will get it'], // batch 8 (B5): the old "I'll find it later"
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
  if (status === 'Will email') return h('span.tag.getting', { title: 'Will get it: on the homework list, with where to look' }, icon('clock'), 'Getting it'); // batch 8 (B5): the clock badge
  const face = sureOf(status, hasValue);
  const [cls, text] = FACE[face];
  return h(`span.tag.${cls}`, { title: status && face !== status ? `${face}: ${TAG[status]?.[1].replace(/^[?≈] /, '') ?? status}` : null }, text);
}
// The menu: Know it; Rough (Roughly, Guess); Missing (Not now, I'll find it later); then Not for me, which hides it.
// lock: { on, set } adds Lock it (confirmed) for the coach: the number counts as Actual in the Picture % (Phase 3).
export function statusMenu(onPick, current = null, { lock = null } = {}) {
  const pickBtn = (s, text) => h('button.btn.small', { type: 'button', 'aria-pressed': String(s === current), onclick: () => { closePop(); onPick(s); } }, text);
  const group = (name, list) => h('div.sure-group', {}, h('span.label', {}, name), h('div.row-line', { style: { gap: '6px' } }, list.map(s => pickBtn(s, TAG[s][1].replace(/^[?≈] /, '')))));
  return h('div.stack.sure-menu', { style: { gap: '10px' } }, h('h3', {}, 'How sure is this?'),
    h('div.sure-group', {}, h('div.row-line', { style: { gap: '6px' } }, pickBtn('Know it', 'Know it'), // Lock it lives in the row's menu now (batch 6, item 11)
      null && lock ? h('button.btn.small', { type: 'button', 'aria-pressed': String(!!lock.on), title: 'Confirmed from a statement or checked by you: counts as Actual in the picture', onclick: () => { closePop(); lock.set(!lock.on); } }, icon('lock'), lock.on ? 'Locked (unlock)' : 'Lock it (confirmed)') : null)),
    group('Rough', SURE.Rough), group('Missing', SURE.Missing),
    h('hr'), h('div.row-line', { style: { gap: '6px' } }, pickBtn('Not for me', 'Not for me (hide it)'),
      h('button.btn.small', { type: 'button', onclick: () => { closePop(); onPick(null); } }, 'Clear')));
}
export function statusPicker(current, onPick, { label = 'Status', hasValue = true, lock = null } = {}) {
  const face = sureOf(current, hasValue);
  const lockedFace = lock?.on && face === 'Know it';
  const b = h(`button.status-btn${face === 'Know it' && !lockedFace ? '.quiet' : ''}`, { type: 'button', 'aria-label': `${label}: ${lockedFace ? 'Locked' : face}${current && current !== face ? `, ${TAG[current]?.[1] ?? current}` : ''}`, 'data-focus': `status:${label}` },
    lockedFace ? h('span.tag.good', {}, icon('lock'), 'Locked') : face === 'Know it' ? 'Know it' : sureTag(current, hasValue), icon('down'));
  b.onclick = () => popover(b, statusMenu(onPick, current, { lock }));
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
// lock: the program keeps this number locked until its inputs qualify (Phase 3), with the plain reason and where to
// go. confidence: once unlocked, how sure the inputs are (shown instead of the Guess tag).
export function metricCard(ctx, label, result, { key = null, render = null, lowerIsGood = false, note = null, home = null, so = null, lock = null, confidence = null, tip = null } = {}) {
  // Batch 13 (item 6): tip keeps the term (DRAFTT, Rule of 5) in a hover tip while the label says it plainly.
  const labelEl = home ? h(`a.label.metric-home${tip ? '.has-tip' : ''}`, { href: home, title: tip ? `${label}: ${tip}` : `Open where ${label.toLowerCase()} comes from` }, label) : h(`span.label${tip ? '.has-tip' : ''}`, { title: tip ? `${label}: ${tip}` : null }, label);
  if (lock) {
    return h('div.metric.locked', {}, labelEl, h('div.big', {}, icon('lock'), ' Locked'),
      h('span.change.lock-why', {}, lock.reason, lock.route ? [' ', h('a', { href: lock.route }, 'Open ›')] : null));
  }
  const locked = result.value === null || result.value === undefined;
  const snap = ctx.store.lastSnapshot();
  const change = key && !locked ? changeSince(keyNumbers(ctx.metrics()), snap, key) : null;
  const good = change && (change.direction === 'down') === lowerIsGood;
  return h(`div.metric${locked ? '.locked' : ''}`, { 'data-focus': key ? `metric:${key}` : null }, // batch 14: Find lands on a headline number
    labelEl, // every number links to its home
    locked
      ? h('div.big', {}, result.never ? warnTag('Not on this path') : [icon('lock'), ` Locked: needs ${result.needs.length} ${result.needs.length === 1 ? 'number' : 'numbers'}`])
      : h('div.big', {}, mathButton(result, render ? render(result) : result.unit === 'months' ? `${Math.ceil(result.value)} months` : value(result, ctx)),
        result.unit === 'months' && !render ? h('span.when', {}, ` ${value(result, ctx).replace(/^.*\(/, '(')}`) : null),
    locked && !result.never ? h('span.change', {}, needLinks(ctx, result.needs)) : null,
    result.guess && !confidence ? h('span', {}, guessTag()) : null,
    confidence && !locked ? h('span.coach-only', {}, h('span.tag.plain.confidence', { title: confidence.text }, confidence.label)) : null, // a coach's cue (hidden in Client view)
    change && change.direction !== 'same' ? h(`span.change.${change.direction}${good ? '.good' : ''}`, {}, `${formatDiff(change.diff, key)} since last session`) : null,
    change && change.direction === 'same' ? h('span.change', {}, 'Same as last session') : null,
    note && !locked ? h('span.change', {}, note) : null,
    // So what (polish item 6): one plain sentence, and a link when something is off.
    so && !locked ? h('span.so', {}, so.text, so.action ? [' ', h('a', { href: so.action.href }, `${so.action.label} ›`)] : null) : null);
}
function formatDiff(d, key) {
  if (key === 'savingsRate') return pct(Math.abs(d)).replace('%', ' pts');
  if (key === 'monthsToFi' || key === 'debtFreeMonths') return `${Math.abs(d)} months`;
  return money(Math.abs(d));
}
// Batch 13 (item 2): a strip of numbers as one slim line (Monarch's summary): the few that matter, each a Show the math
// button; the caret opens every number (the full strip or waterfall) under it. Remembered like any section.
export function slimStrip(ctx, id, title, items, full, { open = false, tip = 'Show every number' } = {}) {
  const isOpen = sectionOpen(id, open);
  const item = i => h('span.slim-item', {}, i.home ? h('a.label.metric-home', { href: i.home }, i.label) : h('span.label', {}, i.label),
    i.result.value === null || i.result.value === undefined ? h('span.muted', {}, EMPTY) : h('strong.slim-num', {}, mathButton(i.result, i.text ?? value(i.result, ctx))));
  return h(`div.slim-strip.card.sec${isOpen ? '' : '.sec-closed'}`, { 'data-sec': id },
    h('div.slim-line.sec-head', {}, caretButton(title, isOpen, tip), h('span.slim-nums', {}, items.filter(Boolean).map(item))),
    h('div.slim-full', {}, full));
}
export function summaryStrip(ctx, items) {
  return h('div.strip', {}, items.map(i => metricCard(ctx, i.label, i.result, i)));
}
export function emptyList(thing, onAdd) {
  return h('div.empty', {}, h('span.title', {}, thing.empty ?? `No ${thing.plural} yet`), addButton(thing.one, onAdd));
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
export function moneyInput(value, onChange, { hint = 'Add amount', cents = true, key = null, width = 128 } = {}) {
  const input = h('input', { inputmode: 'decimal', placeholder: hint, 'aria-label': hint.replace(/^Add /, ''), value: moneyText(value), 'data-focus': key });
  input.onchange = () => { const n = parseNum(input.value); input.value = moneyText(n); onChange?.(n); };
  return h(`label.field.money${value !== null && value !== undefined ? '.filled' : ''}`, { style: { width: `${width}px` } }, h('span.pre', {}, '$'), input);
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
// Batch 8 (B7): the period folded into the amount: a small "/mo" chip after the money box; click to change.
const PER_SHORT = { paycheck: 'paycheck', week: 'wk', '2 weeks': '2 wks', 'twice a month': '2x/mo', month: 'mo', quarter: 'qtr', year: 'yr' };
export function perChip(value, onChange, { key = null, label = 'Per' } = {}) {
  const v = value ?? 'month';
  const b = h('button.per-chip', { type: 'button', 'aria-label': `${label}: per ${v}. Change`, title: `Per ${v}. Click to change`, 'data-focus': key }, `/${PER_SHORT[v] ?? v}`);
  b.onclick = () => popover(b, h('div.stack', { style: { gap: '6px' } }, h('h3', {}, 'Per'), h('div.row-line', { style: { gap: '6px', flexWrap: 'wrap' } },
    ['paycheck', 'week', '2 weeks', 'twice a month', 'month', 'quarter', 'year'].map(p => h('button.btn.small', { type: 'button', 'aria-pressed': String(p === v), onclick: () => { closePop(); onChange(p); } }, p)))), { width: 320 });
  return b;
}
// Batch 8 (B11): a name that wraps instead of truncating (a one-line box that grows as the words do).
export function nameInput(value, onChange, { hint = 'Add name', width = 180, key = null, tip = null } = {}) {
  const ta = h('textarea.name-box', { placeholder: hint, 'aria-label': hint.replace(/^Add /, ''), rows: 1, 'data-focus': key }, value ?? '');
  const fit = () => { ta.style.height = 'auto'; ta.style.height = `${Math.max(0, ta.scrollHeight)}px`; };
  ta.oninput = fit;
  ta.onchange = () => onChange(ta.value.trim() || null);
  ta.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ta.blur(); } };
  requestAnimationFrame(fit);
  return h(`label.field.name-field${value ? '.filled' : ''}`, { style: { width: `${width}px` }, title: tip }, ta);
}
export function perPicker(value, onChange, { key = null } = {}) {
  const s = h('select', { 'aria-label': 'per', 'data-focus': key }, ['paycheck', 'week', 'month', 'quarter', 'year'].map(p => h('option', { value: p, selected: p === value }, p))); // batch 13: under a Per header the word itself, so it shows in full
  s.onchange = () => onChange(s.value);
  return h('label.field.filled', { style: { width: '124px' } }, s);
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
// Batch 13 (item 5): a short list (6 or fewer) is a row of tap chips, not a dropdown. Unanswered shows none picked;
// tapping the picked one again takes the answer back (like the About you toggles). Wraps on a narrow screen.
export function tapPick(options, value, onChange, { label = null, key = null, clearable = true } = {}) {
  return h('div.picks.tap-pick', { role: 'group', 'aria-label': label, 'data-focus': key },
    options.map(o => {
      const [v, text] = Array.isArray(o) ? o : [o, o];
      return h('button.pick', { type: 'button', 'aria-pressed': String(v === value), onclick: e => {
        const off = clearable && e.currentTarget.getAttribute('aria-pressed') === 'true';
        for (const b of e.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(!off && b === e.currentTarget));
        onChange(off ? null : v);
      } }, text);
    }));
}
export function checkbox(label, checked, onChange, { key = null } = {}) {
  const box = h('input', { type: 'checkbox', checked: !!checked, 'data-focus': key });
  box.onchange = () => onChange(box.checked);
  return h('label.check', {}, box, h('span', {}, label));
}
// A labelled box: the label above, the input under it (affordance rule 3).
// later: { on, set } adds "I'll find it later" under the box (Brandon B1.2): it parks the field on the Homework list.
// none: { on, set } adds "I don't have this" (counts as answered, as Not for me).
// Batch 7, item 3: a box that can be parked knows its row and field (park() gives the key), so every such box gets a
// handle Show me can find, with no list of names to keep: the first input, select or toggle inside it that has none.
export const labelled = (label, input, { note = null, later = null, none = null, tip = null } = {}) => {
  const key = later?.key ?? none?.key ?? null;
  if (key && input?.querySelector) { const el = input.matches?.('.seg, .picks') ? input : input.querySelector('input:not([data-focus]), select:not([data-focus]), .seg, .picks'); if (el && !el.dataset.focus) el.dataset.focus = key; } // batch 13: a row of tap chips gets the handle too
  return h(`div.stack${later?.on || none?.on ? '.parked' : ''}`, {}, h(`span.label${tip ? '.has-tip' : ''}`, tip ? { title: `${label}: ${tip}` } : {}, label), input,
    note ? h('span.muted.small', {}, note) : null, later || none ? parkButtons({ later, none }, label) : null);
};
export function parkButtons({ later = null, none = null }, label = 'this') {
  const undo = (text, opt, what, cls = 'plain') => h('span.row-line.later-on', { style: { gap: '6px', flexWrap: 'nowrap' } }, h(`span.tag.${cls}`, {}, cls === 'getting' ? icon('clock') : null, text),
    h('button.btn.small.later-btn', { type: 'button', 'aria-label': `${what}: ${label}`, onclick: () => opt.set(false) }, 'Undo'));
  if (later?.on) return undo('Getting it', later, 'Take off the homework list', 'getting'); // batch 8 (B5): the clock badge
  if (none?.on) return undo("Don't have this", none, 'Undo');
  return h('span.row-line.park-btns', { style: { gap: '4px', flexWrap: 'wrap' } },
    none ? h('button.btn.small.later-btn', { type: 'button', 'aria-label': `I don't have ${label}`, onclick: () => none.set(true) }, "I don't have this") : null,
    later ? h('button.btn.small.later-btn', { type: 'button', 'aria-label': `Will get ${label}`, 'data-park-key': later.parkKey ?? null, title: 'Marks it Getting it and puts "Find: this" on the homework list, with where to look',
      onclick: () => { later.set(true); toast(`Find: ${label} is on the homework list, with where to look.`); } }, icon('clock'), 'Will get it') : null);
}
export const laterButton = (later, label) => parkButtons({ later }, label);
// Both choices for one field of a row: its own status (Will email = later, Not for me = don't have).
export function park(ctx, r, field) {
  const st = r.fieldStatus?.[field];
  const set = s => on => ctx.store.setFieldStatus(r.id, field, on ? s : null);
  const key = `${r.id}:${field}`;
  return { later: { on: st === 'Will email', set: set('Will email'), key }, none: { on: st === 'Not for me', set: set('Not for me'), key } };
}
// One pair of park buttons for a group of fields (batch 7, item 10): on when every field in the group is parked;
// set parks or unparks them all in one undo step. The handle points at the first field.
export function parkGroup(ctx, r, fields) {
  const st = s => fields.every(f => r.fieldStatus?.[f] === s);
  const set = s => on => ctx.store.transaction(on ? 'Park fields' : 'Unpark fields', () => { for (const f of fields) ctx.store.setFieldStatus(r.id, f, on ? s : null); });
  const key = `${r.id}:${fields[0]}`;
  return { later: { on: st('Will email'), set: set('Will email'), key }, none: { on: st('Not for me'), set: set('Not for me'), key } };
}
// The same for a Profile-level answer (doc.profile.later and doc.profile.none).
export function parkProfile(store, key) {
  const p = store.doc.profile;
  const flip = (bag, on) => store.setDoc('profile', { [bag]: { ...(p[bag] || {}), [key]: on || undefined } });
  return { later: { on: !!p.later?.[key], set: on => flip('later', on) }, none: { on: !!p.none?.[key], set: on => flip('none', on) } };
}
// More / Less: Secondary and Tertiary fields stay behind a caret, closed until asked (R023). Remembers which are open.
const OPEN = new Set();
export const openBlock = id => OPEN.add(id); // open a named block before the next render (batch 6)
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
// Batch 11 (item 7): a slider that runs below and above zero shows its fill from a marked zero point to the thumb, so
// +$0 sits on the zero mark with nothing filled (the browser's own fill starts at the left end and reads as an amount).
export function zeroSlider({ min, max, step, value, label, key = null }) {
  const input = h('input.zero-slider', { type: 'range', min, max, step, 'aria-label': label, 'data-focus': key });
  input.value = String(value);
  const zero = ((0 - min) / (max - min)) * 100;
  const paint = () => { const v = ((Number(input.value) - min) / (max - min)) * 100; input.style.setProperty('--zero', `${zero}%`); input.style.setProperty('--lo', `${Math.min(zero, v)}%`); input.style.setProperty('--hi', `${Math.max(zero, v)}%`); };
  input.addEventListener('input', paint);
  paint();
  return input;
}
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
// Who covers it (answer to 74): four answers, each opening only its own details.
//   I'm covering it · We're splitting it (evenly, or my share of the bill) · Someone else (who, and when it becomes mine) · Not for me.
// Older answers read into these: Included in rent is someone else (the landlord), N/A is not for me, Need it is mine.
export const WHO = [['Me', "I'm covering it"], ['Split', "We're splitting it"], ['Someone else', 'Someone else is'], ['Not for me', 'Not for me']];
export function whoOf(rec) {
  const v = rec.values?.whoPays ?? 'Me';
  if (rec.status === 'Not for me' || v === 'N/A') return 'Not for me';
  if (v === 'Covered by someone' || v === 'Included in rent') return 'Someone else';
  if (v === 'Split' || v === 'My share') return 'Split';
  return 'Me';
}
export function whoPays(rec, update, { roommates = 0, profile = null, detailOnly = false } = {}) {
  // A blank answer follows About you › Home and shared bills (a shared bill is split, given as your share or the whole).
  const eff = withHome({ ...rec, ...rec.values }, profile || {});
  const inherited = rec.values.whoPays == null && eff.whoPays === 'Split';
  const v = rec.values.whoPays ?? eff.whoPays ?? 'Me';
  const top = whoOf({ ...rec, values: { ...rec.values, whoPays: v } });
  const keepStatus = rec.status === 'Not for me' ? null : rec.status;
  const pick = x => update(x === 'Not for me' ? { status: 'Not for me' }
    : { status: keepStatus, whoPays: x === 'Someone else' ? (v === 'Included in rent' ? v : 'Covered by someone') : x === 'Split' ? (v === 'My share' ? 'My share' : 'Split') : 'Me' });
  const total = rec.amount == null ? 'Add the amount above' : `${money(rec.amount)} per ${rec.per}`;
  return h('div.stack', {}, detailOnly ? null : h('span.label', {}, 'Who covers it'), // batch 10 (5c): the side panel draws the one row itself
    detailOnly ? null : toggle(WHO, top, x => pick(x ?? 'Me'), { label: 'Who covers it' }),
    top === 'Split' ? toggle([['Split', 'Evenly'], ['My share', 'My share of the bill']], v === 'My share' ? 'My share' : 'Split', x => update({ whoPays: x }), { label: 'How it is split' }) : null,
    top === 'Split' && v !== 'My share' ? h('span.row-line', {}, h('span.label', {}, 'Split by'), stepper(rec.values.splitBy ?? null, n => update({ splitBy: n }), { min: 1, label: 'Split by' }), h('span.muted.small', {}, 'Blank: you plus each roommate')) : null,
    // People give their rent either way ("my rent is $1,500" is often their share): ask which, and show the other.
    top === 'Split' && v !== 'My share' ? (() => {
      const line = { ...eff, amount: rec.amount };
      const split = line.sharePct ? null : splitOf(line, roommates);
      const mine = (rec.values.amountIs ?? eff.amountIs ?? 'The whole bill') === 'Your share';
      const other = mine ? wholeBill(line, { roommates }) : myShare(line, { roommates });
      return h('span.row-line', { style: { gap: '8px' } }, h('span.label', {}, 'The amount above is'),
        toggle([['Your share', 'My share'], ['The whole bill', 'The whole bill']], mine ? 'Your share' : 'The whole bill', x => update({ amountIs: x }), { label: 'The amount above is' }),
        other.value == null ? null : h('span.computed', { title: other.text }, mine ? `${money(rec.amount)} your share (whole bill about ${money(other.value)} a month)` : `${money(rec.amount)} whole bill, ${money(other.value)} your share a month (${split ? `${split} ways` : `your ${pct(line.sharePct)}`})`),
        inherited ? h('span.muted.small', {}, 'From About you: a bill you split') : null);
    })() : null,
    top === 'Split' && v === 'My share' ? h('span.row-line', { style: { gap: '8px' } }, h('span.label', {}, 'Total bill'), h('span.computed', {}, total),
      h('span.label', {}, 'My share a month'), moneyInput(rec.values.myShare, x => update({ myShare: x }), { hint: 'Add my share' })) : null,
    top === 'Someone else' ? h('span.row-line', { style: { gap: '8px' } }, // M7.1: who, and when it becomes yours
      tapPick(['Parents', 'Partner', 'Employer', 'Landlord (in rent)', 'Other'], v === 'Included in rent' ? 'Landlord (in rent)' : rec.values.coveredBy ?? null,
        x => update(x === 'Landlord (in rent)' ? { whoPays: 'Included in rent', coveredBy: x } : { whoPays: 'Covered by someone', coveredBy: x }), { label: 'Who covers it', clearable: false }), // batch 13: 5 choices are taps
      takeoverBox(rec, update)) : null,
    // Part of a bill (F089): they cover all of it, or an amount of it, in the same period as the bill.
    top === 'Someone else' && v === 'Covered by someone' ? (() => {
      const part = rec.values.coveredAmount != null;
      const mine = rec.amount == null ? null : myShare({ ...eff, amount: rec.amount }, { roommates });
      return h('span.row-line', { style: { gap: '8px' } }, h('span.label', {}, 'They cover'),
        toggle([['all', 'All of it'], ['part', 'Part of it']], part ? 'part' : 'all', x => update({ coveredAmount: x === 'part' ? (rec.values.coveredAmount ?? null) ?? 0 : null }), { label: 'They cover' }),
        part ? moneyInput(rec.values.coveredAmount, x => update({ coveredAmount: x }), { hint: `Their part, per ${rec.per}` }) : null,
        part && mine?.value != null ? h('span.computed', { title: mine.text }, `Yours: ${money(mine.value)} a month`) : null);
    })() : null,
    // Money that comes back to you for this line (F093): it comes off your share.
    top !== 'Not for me' && !detailOnly ? h('span.row-line', { style: { gap: '8px' } }, h('span.label', {}, 'Reimbursed to you'),
      moneyInput(rec.values.reimbursed ?? null, x => update({ reimbursed: x }), { hint: `Per ${rec.per}` }),
      h('span.muted.small', {}, 'By an employer, an HSA or FSA, or someone who pays you back. It comes off your share.')) : null);
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
  if (!d) return h('span.muted', {}, EMPTY); // batch 13: a row the plan does not hold (another person's, in a couple) shows a dash, not an error
  // Batch 11 (item 1): one payoff date per debt, from the one plan (the surplus on heavy debt first); when a debt's
  // own payment alone gives a different date, one line says so.
  if (d.planMonths != null) {
    const ym = monthName(addMonths(ymOf(ctx.now()), d.planMonths), 'short');
    const plan = ctx.metrics().debtPlan;
    const width = longest ? Math.max(4, (d.planMonths / longest) * 100) : 0;
    const alone = d.minimumMonths != null && d.minimumMonths !== d.planMonths ? monthName(addMonths(ymOf(ctx.now()), d.minimumMonths), 'short') : d.minimumMonths == null && d.payoff?.never ? 'never' : null;
    return h('div.payoff', {},
      h('span.computed', {}, mathButton({ id: 'M34', value: d.planMonths, needs: [], unit: 'months', text: plan?.text ?? '' }, `${ym} · ${d.planMonths} ${d.planMonths === 1 ? 'month' : 'months'}`)),
      h('div.bar', { role: 'img', 'aria-label': `${d.planMonths} months` }, h('span', { style: { width: `${width}%` } })),
      alone ? h('span.muted.small.payoff-alone', {}, `If only the ${money(d.payment)} ${d.paymentIsMinimum ? 'minimum' : 'payment'} is paid: ${alone}`) : null);
  }
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
export function sectionFooter(ctx, { add, total, count, done, of, left = [], onlyLeft = null, bulk = null }) {
  const pctDone = of ? done / of : 0;
  return h('div.footer', {}, add, onlyLeft, bulk, h('span.spacer'),
    total !== undefined ? h('span', {}, h('span.label', {}, 'Total '), total) : null,
    h('span.label', {}, `${count} ${count === 1 ? 'item' : 'items'}`),
    h('span.row-line', { style: { gap: '8px' } }, h('div.progress', { role: 'progressbar', 'aria-valuenow': Math.round(pctDone * 100), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Complete' }, h('span', { style: { width: `${pctDone * 100}%` } })),
      left.length ? h('button.btn.small.count-btn', { type: 'button', 'aria-label': `${done} of ${of} done; see what is left`, onclick: e => leftPopoverRef?.(e.currentTarget, left) }, `${done} of ${of} done`) : h('span.label', {}, `${done} of ${of} done`))); // item 3
}
// The counter popover lives in arrive.js, which imports this file; the app hands it over once at start.
let leftPopoverRef = null;
export function setLeftPopover(fn) { leftPopoverRef = fn; }
export function keyboardHint() { // R168; item 21: a small Shortcuts link that expands
  const line = h('span', {}, h('kbd', {}, 'Tab'), ' next box · ', h('kbd', {}, 'Enter'), ' new row below · ',
    h('kbd', {}, 'Ctrl'), '+', h('kbd', {}, 'Z'), ' undo · ', h('kbd', {}, 'Ctrl'), '+', h('kbd', {}, 'Shift'), '+', h('kbd', {}, 'Z'), ' redo · ', h('kbd', {}, '/'), ' Find');
  line.hidden = !keyboardHint.open;
  const link = h('a.shortcuts-link', { href: '#', onclick: e => { e.preventDefault(); keyboardHint.open = !keyboardHint.open; line.hidden = !keyboardHint.open; } }, 'Shortcuts');
  return h('div.hint-line', {}, link, ' ', line);
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
// Session-1 focus mode (polish item 4): while Guide me is on in a session, lists show their core columns only and
// the rest sits under one "More detail" per row or section.
export const focusOn = ctx => { const s = ctx.store.doc.session || {}; return !!s.guide && !s.allFields && !!s.startedAt && !(s.endedAt && s.endedAt >= s.startedAt); }; // Show all fields on Live turns it off (answer 90)
export function focusMore(ctx, id, kids) {
  if (!focusOn(ctx)) return kids;
  return moreBlock(`focus:${id}`, () => h('div.stack', { style: { gap: '16px' } }, ...[kids].flat()), { label: 'More fields' }); // item 19
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
  const state = { selected: new Set(), open: null, last: null }; // last: the row last clicked, for shift-click ranges (batch 8, B8)
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
  // Batch 8 (B8): Delete never asks first; the toast undoes it. A linked row (a car and its loan) deletes this row only.
  const remove = ids => {
    const list = [...ids];
    list.forEach(id => state.selected.delete(id));
    const n = ctx.store.remove(list, { withLinked: false });
    toast(n > 1 ? `Deleted ${n}.` : 'Deleted.', { undo: () => ctx.store.undo() });
  };
  // Batch 8 (B9): a row left with no name and nothing typed disappears on its own, without a toast.
  const dropIfBlank = id => { const r = ctx.store.get(id); if (!r || cfg.fixed || !isBlankRow(r, coreOf(r))) return; if (state.open === id) state.open = null; ctx.store.remove([id], { withLinked: false, quiet: true }); };
  const reset = ids => { const n = ids.length; ctx.store.reset(ids); toast(n > 1 ? `Reset ${n}.` : 'Reset.', { undo: () => ctx.store.undo() }); };

  // ---------- in-place updates ----------
  const selectedNow = () => [...state.selected].filter(id => view?.recs.some(r => r.id === id));
  function refreshSelection() {
    if (!view) return;
    const sel = selectedNow();
    for (const [id, tr] of view.rows) { tr.classList.toggle('selected', state.selected.has(id)); const b = tr.querySelector('td.check-cell input'); if (b) b.checked = state.selected.has(id); }
    view.allBox.checked = sel.length > 0 && sel.length === view.recs.length;
    view.allBox.indeterminate = sel.length > 0 && sel.length < view.recs.length;
    for (const [g, head] of view.groups) { const ids = view.groupIds.get(g) || []; const b = head.querySelector('input[type="checkbox"]'); if (!b) continue; const n = ids.filter(id => state.selected.has(id)).length; b.checked = n > 0 && n === ids.length; b.indeterminate = n > 0 && n < ids.length; }
    // The bulk bar sticks to the bottom of the list (batch 8, B8), so nothing above it moves.
    clear(view.bulkHost, sel.length ? bulkBar(ctx, sel, view.actions(sel), cfg) : null);
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
    if (cfg.panel) { // batch 10 (5a): details open in the side panel; the row stays one slim line
      const r = view.recs.find(x => x.id === id);
      if (!r) return;
      state.open = null;
      const tr = view.rows.get(id);
      sidePanel(ctx, { title: cfg.panel.title?.(ctx, r) ?? (r.name || r.type || cfg.thing.one), key: `row:${id}`, anchor: tr, build: () => { const now = ctx.store.get(id); return now ? cfg.panel.build(ctx, now, p => update(now, p)) : h('p.muted', {}, 'This line is gone.'); } });
      return;
    }
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
    if (c) { c.setAttribute('aria-expanded', String(open)); clear(c, open ? 'Less' : view?.moreLabel ?? 'Details', icon(open ? 'down' : 'right')); }
  };
  const moreRow = (r, g) => h('tr.more', { 'data-for': r.id, 'data-group': g }, h('td', { colspan: view.span }, moreLayers(ctx, r, cfg, p => update(r, p), view.extra, ctx.metrics())));

  const coreOf = r => (typeof cfg.coreFields === 'function' ? cfg.coreFields(r) : cfg.coreFields || ['amount']);
  // A blank core number reads Missing on its face.
  const hasCore = r => (cfg.hasValue ? cfg.hasValue(ctx, r) : coreOf(r).every(f => { const v = f in r && f !== 'values' ? r[f] : r.values?.[f]; return v !== null && v !== undefined && v !== ''; }));
  // Batch 11 (item 5b): a blank core number marked Not sure is filled by a typical value (a Guess), so the row's one
  // status reads Rough (Guess), agreeing with the footer that counts it handled, never Missing.
  const blankF = (r, f) => { const v = f in r && f !== 'values' ? r[f] : r.values?.[f]; return v === null || v === undefined || v === ''; };
  const guessCore = r => !r.status && coreOf(r).some(f => blankF(r, f) && r.fieldStatus?.[f] === 'Not sure') && coreOf(r).every(f => !blankF(r, f) || r.fieldStatus?.[f] === 'Not sure');
  // Batch 8 (B5, B6): a row is unconfirmed while its face is not Know it (blank, Rough or a Guess) and it is not already Getting it.
  const unconfirmed = r => !['Not for me', 'Will email', 'Computed'].includes(r.status) && sureOf(r.status, hasCore(r)) !== 'Know it' && !(r.values?.locked === true);
  const willGet = ids => { ctx.store.setStatus(ids, 'Will email'); toast(`${ids.length === 1 ? 'Find: it is' : `Find: ${ids.length} are`} on the homework list, with where to look.`, { undo: () => ctx.store.undo() }); };
  const useEstimates = ids => {
    const list = ids.filter(id => ctx.store.get(id)?.status === 'Not sure');
    const faded = ids.filter(id => isFaded(ctx.store.get(id))); // batch 10: a faded typical becomes the amount, marked Roughly
    if (!list.length && !faded.length) return;
    ctx.store.transaction('Use estimates', () => { if (list.length) ctx.store.setStatus(list, null); for (const id of faded) { const r = ctx.store.get(id); ctx.store.update(id, { amount: typicalOf(r), status: 'Roughly', usedTypical: true }); } });
    const n = list.length + faded.length;
    toast(`${n} starter ${n === 1 ? 'estimate' : 'estimates'} used as the number (Roughly).`, { undo: () => ctx.store.undo() });
  };
  // One "..." per row: Reset, Duplicate, Not for me (or Bring back), then Delete on its own (R105).
  const rowMenuButton = r => {
    const name = r.name || r.type || cfg.thing.one;
    const btn = h('button.icon-btn.menu-btn', { type: 'button', 'aria-label': `Actions for ${name}`, 'aria-haspopup': 'menu', 'data-tip': 'Actions', 'data-focus': 'menu' }, icon('dots'));
    const item = (label, iconName, run, { danger = false } = {}) => h(`button.menu-item${danger ? '.danger' : ''}`, { type: 'button', role: 'menuitem', onclick: () => { closePop(); run(); } }, icon(iconName), label);
    btn.onclick = () => popover(btn, h('div.row-menu', { role: 'menu', 'aria-label': `Actions for ${name}` },
      ['income', 'debt', 'account', 'asset', 'bill'].includes(r.kind) ? item(r.values.locked === true ? 'Unlock (back to as typed)' : 'Lock it (confirmed)', 'lock', () => update(r, { locked: r.values.locked !== true })) : null, // item 11: a guess becomes confirmed here, never as a nag
      item(state.open === r.id ? 'Hide details' : 'Details', 'right', () => setOpen(r.id)), // item 17: the detail is in the menu too
      item('Reset', 'reset', () => reset([r.id])),
      ...(cfg.menuExtra?.(ctx, r, p => update(r, p)) ?? []).map(x => item(x.label, x.icon ?? 'right', x.run)), // batch 10: Move up / Move down
      cfg.fixed ? null : item('Duplicate', 'copy', () => { ctx.store.duplicate(r.id); toast('Duplicated.', { undo: () => ctx.store.undo() }); }),
      cfg.notForMe ? (r.status === 'Not for me'
        ? item('Bring back', 'undo', () => update(r, { status: null }))
        : item('Not for me', 'x', () => { update(r, { status: 'Not for me' }); toast('Moved to Not for me. It counts as $0.', { undo: () => ctx.store.undo() }); })) : null,
      cfg.fixed ? null : h('hr'),
      cfg.fixed ? null : item('Delete', 'trash', () => remove([r.id]), { danger: true })), { width: 200 });
    return btn;
  };

  function render() {
    const m = ctx.metrics();
    const recs = cfg.order ? [...ctx.visible(cfg.filter)].sort(cfg.order) : ctx.visible(cfg.filter);
    const head = h('div.section-title', {}, h('h2', {}, cfg.title), h('span.spacer'), cfg.headerExtra?.(ctx) ?? null,
      recs.length && !cfg.fixed ? iconButton('eraser', `Clear all ${cfg.thing.plural}`, e => confirmBox(e.currentTarget, {
        text: `Clear all ${recs.length} ${recs.length === 1 ? cfg.thing.one : cfg.thing.plural}? You can undo this.`,
        yes: `Clear ${cfg.thing.plural}`, no: 'Keep them', onYes: () => { ctx.store.resetSection(cfg.filter); toast('Cleared.', { undo: () => ctx.store.undo() }); } })) : null);
    const picker = typeof cfg.picker === 'function' ? cfg.picker(ctx) : cfg.picker;
    const addBtn = cfg.noAdd ? null : addButton(cfg.thing.one, e => picker ? openAddPicker(e.currentTarget, { thing: cfg.thing.one, ...picker, onPick: (t, own) => addNew(t, own) }) : addNew(null));
    const autos = cfg.autoRows?.(ctx, m) ?? []; // entered elsewhere, shown here (From Debt): no input, no menu
    const lead = cfg.lead?.(ctx, m) ?? null; // batch 11: a row that lives elsewhere but counts here (the cards on Debt)
    // Batch 13 (item 1): the list's header is a caret; closed, it says what is in it in one line.
    const secOf = (el, sum) => cfg.caret === false ? el : secWrap(el, `list:${listKey}`, { open: cfg.open ?? true, summary: cfg.summary?.(ctx, recs, m) ?? sum });
    if (!recs.length && !autos.length) { view = null; return secOf(h(`div.section.area-${cfg.area}`, {}, head, cfg.strip && cfg.stripWhenEmpty ? cfg.strip(ctx, m) : null, lead, h('div.list', {}, emptyList(cfg.emptyThing?.(ctx) ?? cfg.thing, e => addBtn?.click()))), cfg.emptyThing?.(ctx)?.empty ?? cfg.thing.empty ?? `No ${cfg.thing.plural} yet`); }

    const allBox = h('input', { type: 'checkbox', 'aria-label': 'Select all', 'data-focus': 'select-all', title: 'Select all' });
    allBox.onchange = () => { if (allBox.checked) recs.forEach(r => state.selected.add(r.id)); else state.selected.clear(); refreshSelection(); };
    const focus = focusOn(ctx) && cfg.focus ? cfg.focus : null;
    const shown = cfg.columns.filter(c => c && (!c.couple || ctx.couple) && (!c.focusOnly || focus));
    const cols = focus ? shown.filter(c => focus.includes(c.label)) : shown;
    const extraCols = focus ? shown.filter(c => !focus.includes(c.label)) : [];
    const span = cols.length + 3;
    const thead = h('thead', {}, h('tr', {}, h('th.check-cell', {}, allBox), cols.map(c => h(`th${c.num ? '.num' : ''}`, {}, c.label)), h('th', {}, 'Status'), h('th', {}, h('span.sr', {}, 'Actions'))));
    const groups = new Map();
    for (const r of [...recs, ...autos]) { const g = cfg.groupBy?.(r) ?? ''; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r); }
    for (const g of cfg.lastGroups || []) if (groups.has(g)) { const rows = groups.get(g); groups.delete(g); groups.set(g, rows); } // e.g. Not for me sits at the bottom
    const body = h('tbody');
    const rowEls = new Map(), groupEls = new Map();
    const order = []; // the rows in the order shown, for shift-click ranges
    const groupIds = new Map();
    view = { recs, rows: rowEls, groups: groupEls, groupIds, body, span, allBox, extra: extraCols, moreLabel: cfg.moreLabel ?? 'Details', bulkHost: h('div.bulk-host'), actions: sel => ({
      all: recs.length, onClear: () => { state.selected.clear(); refreshSelection(); },
      onDelete: () => remove(sel), onReset: () => reset(sel),
      onStatus: s => { ctx.store.setStatus(sel, s); toast(`Set ${sel.length} to ${s}.`, { undo: () => ctx.store.undo() }); },
      onWillGet: () => willGet(sel), onUse: () => useEstimates(sel),
      onMove: key => { ctx.store.transaction('Move to section', () => sel.forEach(x => cfg.moveTo.apply(ctx, x, key))); toast(`Moved ${sel.length}.`, { undo: () => ctx.store.undo() }); },
    }) };
    const multi = groups.size > 1; // R171: group headers when more than one type
    for (const [g, rows] of groups) {
      const folded = multi && isFolded(g);
      groupIds.set(g, rows.filter(r => !r.auto).map(r => r.id));
      if (multi) {
        const gBox = h('input', { type: 'checkbox', 'aria-label': `Select all in ${cfg.groupLabel?.(g) ?? g}`, title: 'Select this section' });
        gBox.onchange = () => { for (const id of groupIds.get(g)) gBox.checked ? state.selected.add(id) : state.selected.delete(id); refreshSelection(); };
        const tr = h('tr.group', { 'data-group': g },
          h('td.check-cell', {}, gBox),
          h('td', { colspan: span - 1 }, h('span.row-line.group-line', { style: { gap: '10px', flexWrap: 'nowrap' } },
            h('button.fold', { type: 'button', 'aria-expanded': String(!folded), 'data-focus': `fold:${g}`, onclick: () => setFold(g, !isFolded(g)) },
              icon(folded ? 'right' : 'down'), `${cfg.groupLabel?.(g) ?? g} (${rows.length})`, cfg.subtotal ? h('span.muted', {}, ' · ', cfg.subtotal(ctx, rows, m)) : null),
            cfg.groupExtra ? cfg.groupExtra(ctx, g, rows, m) : null, // batch 10: e.g. what the typical amounts would add up to
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
        const box = h('input', { type: 'checkbox', 'aria-label': `Select ${r.name || r.type || cfg.thing.one}`, checked: state.selected.has(r.id), 'data-focus': 'sel', title: 'Select (shift-click for a range)' });
        const idx = order.push(r.id) - 1;
        box.onclick = e => { // batch 8 (B8): shift-click selects the range from the row last clicked
          if (e.shiftKey && state.last != null && state.last !== idx) { const [a, b] = [Math.min(state.last, idx), Math.max(state.last, idx)]; for (let i = a; i <= b; i++) box.checked ? state.selected.add(order[i]) : state.selected.delete(order[i]); }
          box.checked ? state.selected.add(r.id) : state.selected.delete(r.id);
          state.last = idx; refreshSelection();
        };
        const open = state.open === r.id;
        const unfinished = !(cfg.coreFields ? (typeof cfg.coreFields === 'function' ? cfg.coreFields(r) : cfg.coreFields) : ['amount']).every(f => handled(r, f));
        if (state.onlyLeft && !unfinished) continue; // item 3: Show only what's left
        const tr = h(`tr.row${state.selected.has(r.id) ? '.selected' : ''}${unfinished ? '.left' : ''}`, { 'data-id': r.id, 'data-group': g, hidden: folded },
          h('td.check-cell', {}, box),
          cols.map((c, i) => h(`td.col-${slug(c.label)}${i === 0 ? '.col-first' : ''}${c.num ? '.num' : ''}`, {}, c.render(ctx, r, m, p => update(r, p), { remove: e => remove([r.id], e.currentTarget) }))),
          h('td.col-status', {}, h('span.row-line.status-cell', { style: { gap: '6px', flexWrap: 'nowrap' } }, statusPicker(guessCore(r) ? 'Not sure' : r.status, s => update(r, { status: s }), { hasValue: hasCore(r) || guessCore(r), lock: ['income', 'debt', 'account', 'asset', 'bill'].includes(r.kind) ? { on: r.values.locked === true, set: v => update(r, { locked: v }) } : null }),
            unconfirmed(r) && !isBlankRow(r, coreOf(r)) ? h('button.btn.small.will-get', { type: 'button', title: 'Will get it: marks it Getting it and puts "Find: this" on the homework list, with where to look', 'aria-label': `Will get ${r.name || r.type || cfg.thing.one}`, onclick: () => willGet([r.id]) }, icon('clock'), h('span.will-get-text', {}, 'Will get it')) : null)), // batch 8 (B5)
          h('td.col-actions', {}, h('span.actions', {},
            h('button.caret', { type: 'button', 'aria-expanded': String(open), 'data-focus': 'more', onclick: () => setOpen(r.id) },
              open ? 'Less' : view.moreLabel, icon(open ? 'down' : 'right')),
            rowMenuButton(r))));
        // Enter in a row = new row below (R168).
        tr.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.target.dispatchEvent(new Event('change')); addNew(r.type, null, r.id); } });
        tr.addEventListener('focusout', () => setTimeout(() => { if (!tr.isConnected || tr.contains(document.activeElement)) return; dropIfBlank(r.id); }, 120)); // batch 8 (B9): left empty, it goes
        rowEls.set(r.id, tr);
        body.append(tr);
        const note = cfg.rowNote?.(ctx, r, m); // e.g. "Looks like the same payment: keep one"
        if (note) body.append(h('tr.row-note', { 'data-for': r.id, 'data-group': g, hidden: folded }, h('td', { colspan: span }, note)));
        if (open) { const more = moreRow(r, g); more.hidden = folded; body.append(more); track(tr, more); }
      }
    }
    if (state.open && !rowEls.has(state.open)) state.open = null;
    const tfoot = cfg.totals ? h('tfoot', {}, h('tr', {}, h('td.check-cell', {}), cfg.totals(ctx, recs, m, cols))) : null;
    const counted = recs.filter(r => !isBlankRow(r, coreOf(r)) && (!cfg.counts || cfg.counts(r))); // batch 8 (B9): a blank row counts nowhere; batch 10: a list can leave rows out (Everything else, faded)
    const leftRows = counted.filter(r => !coreOf(r).every(f => handled(r, f)));
    const done = counted.length - leftRows.length;
    // Batch 8 (B5, B6): one button for the whole section: every unconfirmed row to Getting it; every starter estimate kept.
    const toGet = counted.filter(unconfirmed), toUse = recs.filter(r => r.status === 'Not sure' || isFaded(r));
    const bulk = [toUse.length ? h('button.btn.small', { type: 'button', title: 'Keep every starter estimate as the number', onclick: () => useEstimates(toUse.map(r => r.id)) }, icon('check'), `Use all starter estimates (${toUse.length})`) : null,
      toGet.length ? h('button.btn.small', { type: 'button', title: 'Every unconfirmed row goes on the homework list as Find: …, marked Getting it', onclick: () => willGet(toGet.map(r => r.id)) }, icon('clock'), `Will get all of these (${toGet.length})`) : null];
    const leftItems = leftRows.map(r => { const f = coreOf(r).find(x => !handled(r, x)); return { id: r.id, name: r.name || r.type || cfg.thing.one, word: r.status && r.status !== 'Know it' ? r.status : 'missing', field: f, focus: cfg.focusOf?.(r, f) ?? `${r.id}:${f}`, parent: cfg.parentOf?.(ctx, r) ?? undefined, route: location.hash }; }); // batch 13: a list whose boxes have their own handles names them
    const onlyLeft = recs.length > 8 && leftRows.length ? h('label.check-inline.only-left', {}, (() => { const b = h('input', { type: 'checkbox', checked: state.onlyLeft ? 'checked' : null }); b.onchange = () => { state.onlyLeft = b.checked; ctx.refresh(); }; return b; })(), ` Show only what's left (${leftRows.length})`) : null;
    const out = h(`div.section.area-${cfg.area}`, {}, head,
      cfg.strip ? (focus ? moreBlock(`focus:strip:${listKey}`, () => cfg.strip(ctx, ctx.metrics()), { label: 'Totals and chart' }) : cfg.strip(ctx, m)) : null, // item 19
      lead,
      h('div.list', {}, h('div.list-scroll', { 'data-scroll-key': listKey }, h('table.rows', {}, thead, body, tfoot)), view.bulkHost,
        sectionFooter(ctx, { add: addBtn, total: cfg.footerTotal?.(ctx, recs, m), count: counted.length, done, of: counted.length, left: leftItems, onlyLeft, bulk }),
        keyboardHint()));
    refreshSelection();
    const totalEl = cfg.footerTotal?.(ctx, recs, m);
    const totalText = totalEl ? (() => { const c = totalEl.cloneNode(true); c.querySelectorAll('.time-chip').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); })() : '';
    return secOf(out, [`${counted.length} ${counted.length === 1 ? cfg.thing.one : cfg.thing.plural}`, totalText && totalText !== EMPTY ? totalText : null, counted.length ? `${done} of ${counted.length} done` : null].filter(Boolean).join(' · '));
  }
  ctx.onRefresh(draw);
  draw();
  return root;
}

// Secondary then Tertiary behind the caret. Paid with sits at the top (Mockup).
function moreLayers(ctx, r, cfg, update, extra = [], m = null) {
  return h('div', {},
    extra.length ? h('div.layer', {}, extra.map(c => labelled(c.label, c.render(ctx, r, m, update, {})))) : null, // focus mode: the other columns
    cfg.paidWith ? h('div.layer', {}, paidWith(ctx, r, id => update({ paidWith: id }))) : null,
    cfg.secondary ? h('div.layer', {}, cfg.secondary(ctx, r, update)) : null,
    cfg.tertiary ? h('div.layer', {}, cfg.tertiary(ctx, r, update)) : null,
    cfg.fixed ? null : h('div.layer', {}, h('span.label', {}, 'Where it came from: '), h('span.tag.plain', {}, SOURCE_WORDS[r.source] ?? r.source), checkLayer(r, update))); // a category row carries no source line
}
// The next check date (F244): when this number is due to be looked at again, and a date to set instead.
function checkLayer(r, update) {
  const c = nextCheck(r);
  if (!c) return null;
  const d = h('input', { type: 'date', value: r.values.checkOn || '', 'aria-label': 'Check again on' });
  d.onchange = () => update({ checkOn: d.value || null });
  const when = new Date(`${c.next}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return h('span.row-line', { style: { gap: '8px', marginLeft: '16px' } }, h('span.label', {}, 'Next check'),
    h('span.computed', { title: c.why }, when), h(`label.field${r.values.checkOn ? '.filled' : ''}`, { style: { width: '170px' } }, d),
    h('span.muted.small', {}, r.values.checkOn ? 'The date you set' : 'Set a date to check it sooner or later'));
}

// Batch 8 (B8): the sticky bottom bar: N selected · Delete · Use estimates · Will get it · Move to section · Set status · Clear.
function bulkBar(ctx, sel, a, cfg = {}) {
  const statusBtn = h('button.btn.small', { type: 'button' }, icon('tag'), 'Set status', icon('down'));
  statusBtn.onclick = () => popover(statusBtn, statusMenu(s => s && a.onStatus(s)));
  const moveBtn = cfg.moveTo ? h('button.btn.small', { type: 'button' }, icon('right'), cfg.moveTo.label ?? 'Move to section', icon('down')) : null;
  if (moveBtn) moveBtn.onclick = () => popover(moveBtn, h('div.stack', { style: { gap: '6px' } }, h('h3', {}, cfg.moveTo.label ?? 'Move to'), h('div.row-line', { style: { gap: '6px', flexWrap: 'wrap' } },
    cfg.moveTo.options(ctx).map(([k, label]) => h('button.btn.small', { type: 'button', onclick: () => { closePop(); a.onMove(k); } }, label)))), { width: 360 });
  return h('div.bulk-bar', { role: 'toolbar', 'aria-label': 'Selected rows' }, h('span.count', {}, `${sel.length} selected`),
    cfg.fixed ? null : h('button.btn.small', { type: 'button', onclick: a.onDelete }, icon('trash'), 'Delete'),
    h('button.btn.small', { type: 'button', title: 'Keep the starter estimates as the numbers', onclick: a.onUse }, icon('check'), 'Use estimates'),
    h('button.btn.small', { type: 'button', title: 'Mark them Getting it and put each on the homework list', onclick: a.onWillGet }, icon('clock'), 'Will get it'),
    moveBtn, statusBtn,
    h('span', { style: { flex: 1 } }), h('button.btn.small', { type: 'button', onclick: a.onClear }, icon('x'), 'Clear'));
}

// ---------- Visuals panel (ECharts, area hues) ----------
export function visualsPanel(ctx, { charts, area }) {
  // DMMT 'Watch': Side on wide screens (1600px and up, so a full row still fits), Below otherwise.
  // Batch 13 (item 1): the chart is a caret section like every other, closed by default; closed, it is one slim line
  // naming the chart (Hide is the caret now).
  const id = `chart:${area}`;
  const state = { pick: charts[0].name, place: window.innerWidth >= 1600 ? 'Side' : 'Below', open: sectionOpen(id, false) };
  const wrap = h(`div.vis-panel.card.sec${state.open ? '' : '.sec-closed'}`, { 'data-sec': id });
  // Where it sits starts from CSS (by screen width), so the first paint never shifts the page; a pick sets a class.
  const place = () => { const v = wrap.closest('.visuals'); for (const [c, p] of [['below', 'Below'], ['side', 'Side']]) v?.classList.toggle(c, state.open && state.place === p); v?.classList.toggle('hidden', !state.open); };
  let chart = null, host = null;
  const paint = () => {
    const c = charts.find(x => x.name === state.pick);
    if (!state.open || !host) return;
    const data = c.data(ctx);
    chart?.dispose(); chart = null;
    if (data.needs) { clear(host, chartEmpty(ctx, data.needs)); host.style.height = 'auto'; return; }
    host.style.height = '';
    if (!window.echarts) { clear(host, h('div.chart-empty', {}, 'The chart library did not load. Check the connection.')); return; }
    clear(host);
    chart = window.echarts.init(host, null, { renderer: 'svg' });
    chart.setOption(c.option(data, chartTheme(area)));
  };
  wrap._secOnToggle = open => { state.open = open; place(); if (host) host.hidden = !open; if (open) requestAnimationFrame(paint); else { chart?.dispose(); chart = null; } };
  const build = () => {
    const pick = h('select.plain', { 'aria-label': 'Chart', 'data-focus': `chart:${area}` }, charts.map(x => h('option', { selected: x.name === state.pick }, x.name)));
    pick.onchange = () => { state.pick = pick.value; paint(); };
    host = h('div.chart', { hidden: !state.open });
    new ResizeObserver(() => chart?.resize()).observe(host);
    // Side and Below only move the panel: no redraw.
    clear(wrap, h('div.bar-top.sec-head', {}, h('span.dot', { class: `area-${area}` }), h('h3', {}, caretButton('Chart', state.open)), h('span.sec-sum', {}, state.pick), pick, h('span', { style: { flex: 1 } }),
      toggle(['Side', 'Below'], state.place, p => { state.place = p; place(); chart?.resize(); }, { label: 'Where the chart sits' })),
    host);
  };
  ctx.onRefresh(() => keepPlace(() => { build(); paint(); }));
  build();
  queueMicrotask(() => { place(); paint(); }); // the chart needs the panel on the page to measure
  return wrap;
}
export function chartTheme(area) {
  const css = getComputedStyle(document.documentElement);
  const v = n => css.getPropertyValue(n).trim();
  return { area: v(`--${area}`), text: v('--text'), text2: v('--text-2'), line: v('--border-row'), card: v('--card'), font: v('--font') };
}

// ---------- Batch 10 (item 5a): the side panel ----------
// The table is for scanning, the panel is for editing: one panel at a time, on the right (a bottom sheet at 760px
// and below). Escape, the X or a click outside closes it. build() draws the content and is called again after each
// change, so the panel follows the row. Returns { close }.
let sideEl = null, sideOff = null, sideStop = null;
export function closeSidePanel() { const el = sideEl; sideEl = null; sideOff?.(); sideOff = null; sideStop?.(); sideStop = null; el?.remove(); document.body.classList.remove('side-open'); }
export const sidePanelOpen = () => !!sideEl;
export function sidePanel(ctx, { title, build, anchor = null, key = null }) {
  closeSidePanel();
  const body = h('div.side-body');
  const head = h('div.side-head', {}, h('h2', {}, title), h('button.icon-btn', { type: 'button', 'aria-label': 'Close', 'data-tip': 'Close', onclick: closeSidePanel }, icon('x')));
  const el = h('aside.side-panel', { role: 'dialog', 'aria-label': title, 'data-panel': key }, head, body);
  const draw = () => { if (sideEl !== el) return; const t = typeof title === 'function' ? title() : title; keepPlace(() => clear(body, build())); };
  sideEl = el;
  // An inspector beside the table (YNAB): on wide screens the page makes room and the panel starts under the sticky
  // bars, so it covers nothing; at 760px and below it is a bottom sheet over the page (a modal sheet).
  // Batch 13 (item 3): the layout follows the window. Wider than 760px the page reflows beside the panel (body.side-open
  // pads the page, the bars and the bottom bars), so nothing it does not own sits under it; at 760px and below it is a
  // bottom sheet (modal). A resize across 760px switches between the two.
  const mq = window.matchMedia?.('(max-width: 760px)');
  const fit = () => {
    const phone = !!mq?.matches;
    if (phone) { el.setAttribute('aria-modal', 'true'); el.style.top = ''; document.body.classList.remove('side-open'); return; }
    el.removeAttribute('aria-modal');
    const bars = [document.getElementById('subtabs'), document.getElementById('topbar')].find(b => b && !b.hidden && b.getBoundingClientRect().height);
    el.style.top = `${Math.round(bars ? bars.getBoundingClientRect().bottom : 60)}px`; document.body.classList.add('side-open');
  };
  fit();
  mq?.addEventListener?.('change', fit);
  const stopFit = () => mq?.removeEventListener?.('change', fit);
  document.body.append(el);
  draw();
  const off = ctx.onRefresh(draw);
  sideStop = () => { off(); stopFit(); };
  sideOff = opened({ el, anchor, close: () => { if (sideEl === el) { sideOff = null; closeSidePanel(); } } });
  requestAnimationFrame(() => el.querySelector('button:not(.icon-btn), input')?.focus({ preventScroll: true }));
  return { close: closeSidePanel, el };
}
