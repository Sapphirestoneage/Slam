// SPDX-License-Identifier: AGPL-3.0-only
// A book on the screen (start.html): sections by kind, each with its own Add button, each row slim until tapped. It
// only shows what js/book.js returns and writes through it. Tap first: every number has amounts to tap, and a box.
import { h } from '../ui/dom.js';
import { fmt } from '../math/result.js';
import { bookOf, addRow, setField, setUnsure, renameRow, removeRow, fieldValue, SURE, sureOf, setSure } from '../book.js';

const money = v => fmt.money(v);
const open = {}; // which row is unfolded, by book: kept across a redraw
const moreOpen = new Set();
// Open one row from outside (a link from the whole picture lands on the line it is about).
export const openRow = (bookId, rowId) => { open[bookId] = rowId; };

// opts: { store, book, front (field ids asked up front; the rest of a section's front fields join More), pulse (bool),
// onState({ todo, count, total }) after every change, btn, chip }
export function bookUI({ store, book, front = null, only = null, pulse = false, onState = () => {}, btn, chip }) {
  const root = h('div.st-book');
  const isFront = f => !front || front.includes(f.id) || f.top;
  const needOf = (sec, row) => [...(sec.nameFirst && !row.name ? [{ id: 'name' }] : []), ...sec.front.filter(isFront).filter(f => row.todo.includes(f.id))];
  const paint = () => {
    const B = bookOf(store.doc, book);
    if (open[book.id] && !B.sections.some(s => s.rows.some(r => r.id === open[book.id]))) open[book.id] = null;
    const todoOf = (sec, row) => needOf(sec, row);
    const field = (sec, row, f) => {
      const r = row.rec, v = fieldValue(r, f), unsure = f.unsure && r.fieldStatus?.[f.id] === 'Not sure';
      const put = val => { setField(store, r.id, f, val); paint(); };
      const label = f.labelOf ? f.labelOf(r) : f.label;
      if (f.type === 'pick') return h('div.st-field', { 'data-f': f.id }, h('div.st-flabel', {}, label), h('div.st-chips', {}, f.options.map(([val, l]) => chip(l, v === val, () => put(val)))));
      const pct = f.type === 'pct', shownV = v == null ? '' : pct ? String(+(v * 100).toFixed(2)) : Number(v).toLocaleString('en-US');
      const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', 'aria-label': `${row.name || sec.one}: ${label}`, value: shownV,
        onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); setField(store, r.id, f, n === '' ? null : pct ? Number(n) / 100 : Number(n)); soft(); },
        onKeydown: e => { if (e.key === 'Enter') { e.target.blur(); paint(); } } });
      const picks = pct ? f.options.map(o => [o, `${+(o * 100).toFixed(1)}%`]) : (f.picks || []).map(o => [o, money(o)]);
      return h('div.st-field', { 'data-f': f.id }, h('div.st-flabel', {}, label),
        h('div.st-box.narrow', {}, h('div.in', {}, pct ? null : h('span', {}, '$'), input, pct ? h('span', {}, '%') : null)),
        picks.length || f.unsure ? h('div.st-chips', { style: { marginTop: '8px' } }, picks.map(([val, label]) => chip(label, v === val, () => put(val))), f.unsure ? chip('Not sure', unsure, () => { setUnsure(store, r.id, f); paint(); }) : null) : null,
        unsure ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'A typical rate stands in until you know it.') : null);
    };
    const rowEl = (sec, row) => {
      const isOpen = open[book.id] === row.id, need = todoOf(sec, row);
      const head = h(`button.st-bookrow${isOpen ? '.open' : ''}`, { type: 'button', 'aria-expanded': isOpen ? 'true' : 'false', 'data-row': row.id, onClick: () => { open[book.id] = isOpen ? null : row.id; paint(); } },
        h('span.st-bookname', {}, row.name || 'Pick which one'), h('strong', {}, row.main == null ? (row.words ?? book.noAmount ?? 'Add the amount') : `${money(row.main)}${row.per && row.per !== 'a month' ? ` ${row.per}` : ''}`),
        h(`span.st-booktag${need.length ? '' : '.ok'}`, {}, need.length ? `${need.length} to go` : '✓'), h('span.st-bookchev', { 'aria-hidden': 'true' }, isOpen ? '▾' : '▸'));
      if (!isOpen) return h('div.st-bookitem', {}, head);
      const fronts = sec.front.filter(f => !f.when || f.when(row.rec)), up = fronts.filter(isFront), later = [...fronts.filter(f => !isFront(f)), ...sec.more.filter(f => !f.when || f.when(row.rec))];
      const mk = `${book.id}:${row.id}`;
      const names = sec.names?.length ? h('div.st-field', { 'data-f': 'name' }, h('div.st-flabel', {}, 'Which one'), h('div.st-chips', {}, sec.names.map(n => chip(n, row.name === n || row.name?.startsWith(`${n} `), () => { renameRow(store, row.id, sec.plainNames || book.kind !== 'debt' ? n : sec.id === 'cards' ? `${n} card` : `${n} loan`); paint(); })))) : null;
      return h('div.st-bookitem.open', {}, head, h('div.st-bookbody', {},
        sec.nameFirst ? names : null, up.map(f => field(sec, row, f)), sec.nameFirst ? null : names,
        later.length ? h('details.st-fold', { open: moreOpen.has(mk) ? '' : null, onToggle: e => (e.target.open ? moreOpen.add(mk) : moreOpen.delete(mk)) }, h('summary', {}, `More about this one (${later.filter(f => fieldValue(row.rec, f) != null).length} of ${later.length})`), h('div', {}, later.map(f => field(sec, row, f)))) : null,
        row.main != null ? h('div.st-field', {}, h('div.st-flabel', {}, 'How sure is this number?'), h('div.st-chips', {}, SURE.map(([val, label]) => chip(label, (sureOf(row.rec) ?? 'Know it') === val, () => { setSure(store, row.id, val); paint(); })))) : null,
        h('div.st-row', { style: { marginTop: '8px' } }, btn('Done with this one', () => { open[book.id] = null; paint(); }, 'slim primary'), btn('Take it off', () => { removeRow(store, row.id); open[book.id] = null; paint(); }, 'slim text'))));
    };
    root.replaceChildren(...B.sections.filter(sec => !only || only.includes(sec.id)).map(sec => h('section.st-booksec', { 'data-sec': sec.id },
      h('div.st-bookhead', {}, h('h3', {}, sec.title), sec.rows.length ? h('span.st-small.st-soft', {}, sec.total > 0 ? `${money(sec.total)}${sec.rows.length > 1 ? ` across ${sec.rows.length}` : ''}` : `${sec.rows.length} on file`) : h('span.st-small.st-soft', {}, 'None'),
        btn(`+ ${sec.add}`, () => { const made = addRow(store, book, sec.id); open[book.id] = made.id; paint(); root.querySelector(`[data-row="${made.id}"]`)?.scrollIntoView({ block: 'center' }); }, 'slim')),
      sec.rows.map(r => rowEl(sec, r)))));
    soft(B);
  };
  // After typing: the totals, tags and the pulse move without redrawing the box being typed in.
  const soft = (B = bookOf(store.doc, book)) => {
    for (const sec of B.sections) for (const row of sec.rows) {
      const el = root.querySelector(`[data-row="${row.id}"]`); if (!el) continue;
      const need = needOf(sec, row);
      el.children[1].textContent = row.main == null ? (row.words ?? book.noAmount ?? 'Add the amount') : `${money(row.main)}${row.per && row.per !== 'a month' ? ` ${row.per}` : ''}`;
      el.children[2].textContent = need.length ? `${need.length} to go` : '✓'; el.children[2].classList.toggle('ok', !need.length);
    }
    root.querySelectorAll('.st-pulse').forEach(e => e.classList.remove('st-pulse'));
    const rows = B.sections.filter(sec => !only || only.includes(sec.id)).flatMap(sec => sec.rows.map(row => ({ sec, row, need: needOf(sec, row) })));
    const left = rows.filter(x => x.need.length);
    if (pulse) {
      const cur = rows.find(x => x.row.id === open[book.id]);
      if (cur?.need.length) { const el = root.querySelector(`.st-bookitem.open [data-f="${cur.need[0].id}"]`), at = el?.querySelector('.st-box .in, .st-chips'); if (!el?.contains(document.activeElement)) at?.classList.add('st-pulse'); }
      else if (cur) root.querySelector('.st-bookitem.open .st-btn.primary')?.classList.add('st-pulse');
      else if (left.length) root.querySelector(`[data-row="${left[0].row.id}"]`)?.classList.add('st-pulse');
    }
    onState({ todo: left.length, count: rows.length, total: rows.reduce((t, x) => t + (x.row.main ?? 0), 0), open: !!open[book.id] });
  };
  paint();
  return root;
}
