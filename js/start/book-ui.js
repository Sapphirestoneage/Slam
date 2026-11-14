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
// Each row is one line of small boxes, like a sheet: the name, then what the plan needs. The amounts to tap show under
// the box being filled, one strip at a time. Everything else sits behind More.
export function bookUI({ store, book, front = null, only = null, pulse = false, onState = () => {}, btn, chip }) {
  const root = h('div.st-book');
  const isFront = f => !front || front.includes(f.id) || f.top;
  const needOf = (sec, row) => [...(sec.nameFirst && !row.name ? [{ id: 'name' }] : []), ...sec.front.filter(isFront).filter(f => row.todo.includes(f.id))];
  let active = open[book.id] ? { row: open[book.id], f: null, scroll: true } : null; // the box being filled: its tap amounts show
  const shownOf = (f, v) => (v == null ? '' : f.type === 'pct' ? String(+(v * 100).toFixed(2)) : Number(v).toLocaleString('en-US'));
  const blank = (sec, row) => row.main == null && !sec.front.some(f => f.id !== 'type' && fieldValue(row.rec, f) != null) && !(row.rec.fieldStatus && Object.keys(row.rec.fieldStatus).length) && row.extras === 0;
  const paint = () => {
    const B = bookOf(store.doc, book);
    // More: the fuller fields, with amounts to tap, as before
    const field = (sec, row, f) => {
      const r = row.rec, v = fieldValue(r, f), unsure = f.unsure && r.fieldStatus?.[f.id] === 'Not sure';
      const put = val => { setField(store, r.id, f, val); paint(); };
      const label = f.labelOf ? f.labelOf(r) : f.label;
      if (f.type === 'pick') return h('div.st-field', { 'data-f': f.id }, h('div.st-flabel', {}, label), h('div.st-chips', {}, f.options.map(([val, l]) => chip(l, v === val, () => put(val)))));
      const pct = f.type === 'pct';
      const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', 'aria-label': `${row.name || sec.one}: ${label}`, value: shownOf(f, v),
        onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); setField(store, r.id, f, n === '' ? null : pct ? Number(n) / 100 : Number(n)); soft(); },
        onKeydown: e => { if (e.key === 'Enter') { e.target.blur(); paint(); } } });
      const picks = pct ? f.options.map(o => [o, `${+(o * 100).toFixed(1)}%`]) : (f.picks || []).map(o => [o, money(o)]);
      return h('div.st-field', { 'data-f': f.id }, h('div.st-flabel', {}, label),
        h('div.st-box.narrow', {}, h('div.in', {}, pct ? null : h('span', {}, '$'), input, pct ? h('span', {}, '%') : null)),
        picks.length || f.unsure ? h('div.st-chips', { style: { marginTop: '8px' } }, picks.map(([val, l]) => chip(l, v === val, () => put(val))), f.unsure ? chip('Not sure', unsure, () => { setUnsure(store, r.id, f); paint(); }) : null) : null);
    };
    const rowEl = (sec, row) => {
      const r = row.rec, need = needOf(sec, row), mk = `${book.id}:${row.id}`, isMore = moreOpen.has(mk);
      const fronts = sec.front.filter(f => !f.when || f.when(r)), up = fronts.filter(isFront), later = [...fronts.filter(f => !isFront(f)), ...sec.more.filter(f => !f.when || f.when(r))];
      const strip = h('div.st-bkpicks', { hidden: true });
      // the tap amounts for one box: shown under the row while that box is the one being filled
      const showPicks = (f, input) => {
        active = { row: row.id, f: f.id };
        root.querySelectorAll('.st-bkpicks').forEach(e => { e.hidden = true; e.replaceChildren(); }); root.querySelectorAll('.st-bkcell.on').forEach(e => e.classList.remove('on'));
        input.closest('.st-bkcell').classList.add('on');
        const pct = f.type === 'pct', picks = pct ? f.options.map(o => [o, `${+(o * 100).toFixed(1)}%`]) : (f.picks || []).map(o => [o, money(o)]);
        if (!picks.length && !f.unsure) return;
        const tap = (label, on, act) => h(`button.st-chip.st-bkpick${on ? '.on' : ''}`, { type: 'button', 'aria-pressed': on ? 'true' : 'false', onMousedown: e => e.preventDefault(), onClick: act }, label);
        const cur = fieldValue(store.doc.records.find(x => x.id === row.id), f);
        strip.replaceChildren(h('span.st-small.st-soft', {}, 'Tap one:'), ...picks.map(([val, l]) => tap(l, cur === val, () => { setField(store, row.id, f, val); input.value = shownOf(f, val); input.placeholder = '0'; soft(); showPicks(f, input); })),
          f.unsure ? tap('Not sure', r.fieldStatus?.[f.id] === 'Not sure' && cur == null, () => { setUnsure(store, row.id, f); input.value = ''; input.placeholder = 'typical'; soft(); showPicks(f, input); }) : '');
        strip.hidden = false;
      };
      const cell = f => {
        const v = fieldValue(r, f), label = f.short ?? (f.labelOf ? f.labelOf(r) : f.label), full = f.labelOf ? f.labelOf(r) : f.label;
        if (f.type === 'pick') return h('label.st-bkcell', { 'data-f': f.id }, h('span.st-bklabel', {}, label), h('select.st-bksel', { 'aria-label': `${row.name || sec.one}: ${full}`, onChange: e => { const o = f.options[Number(e.target.value)]; if (o) { setField(store, row.id, f, o[0]); paint(); } } },
          v == null ? h('option', { value: '', selected: '' }, 'Pick') : null, f.options.map(([val, l], k) => h('option', { value: String(k), selected: v === val ? '' : null }, l))));
        const pct = f.type === 'pct', unsure = f.unsure && r.fieldStatus?.[f.id] === 'Not sure';
        const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: unsure ? 'typical' : '0', 'aria-label': `${row.name || sec.one}: ${full}`, value: shownOf(f, v),
          onFocus: e => showPicks(f, e.target), onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); setField(store, row.id, f, n === '' ? null : pct ? Number(n) / 100 : Number(n)); soft(); },
          onKeydown: e => { if (e.key === 'Enter') e.target.blur(); } });
        return h('label.st-bkcell', { 'data-f': f.id }, h('span.st-bklabel', {}, label), h('span.in', {}, pct ? null : h('span', {}, '$'), input, pct ? h('span', {}, '%') : null));
      };
      const known = sec.names?.find(n => row.name === n || row.name?.startsWith(`${n} `)) ?? null;
      const nameEl = sec.names?.length
        ? h('select.st-bksel.st-bkname', { 'data-f': 'name', 'aria-label': `${sec.one}: which one`, onChange: e => { const n = e.target.value; if (n) { renameRow(store, row.id, sec.plainNames || book.kind !== 'debt' ? n : sec.id === 'cards' ? `${n} card` : `${n} loan`); paint(); } } },
          known ? null : h('option', { value: '', selected: '' }, row.name || 'Pick which one'), sec.names.map(n => h('option', { value: n, selected: known === n ? '' : null }, n)))
        : h('strong.st-bookname', {}, row.name || sec.one);
      const body = isMore ? h('div.st-bookbody', {},
        later.map(f => field(sec, row, f)),
        row.main != null ? h('div.st-field', {}, h('div.st-flabel', {}, 'How sure is this number?'), h('div.st-chips', {}, SURE.map(([val, label]) => chip(label, (sureOf(r) ?? 'Know it') === val, () => { setSure(store, row.id, val); paint(); })))) : null,
        h('div.st-row', { style: { marginTop: '10px' } }, btn('Take it off', () => { removeRow(store, row.id); moreOpen.delete(mk); paint(); }, 'slim'))) : null;
      return h(`div.st-bookitem${isMore ? '.open' : ''}`, { 'data-row': row.id },
        h('div.st-bkline', {}, nameEl, h(`span.st-booktag${need.length ? '' : '.ok'}`, {}, need.length ? `${need.length} to go` : '✓'),
          h('button.st-btn.slim.st-bkmore', { type: 'button', 'aria-expanded': isMore ? 'true' : 'false', onClick: () => { if (isMore) moreOpen.delete(mk); else moreOpen.add(mk); paint(); } }, isMore ? 'Less ▴' : 'More ▾')),
        h(`div.st-bkcells.n${Math.min(3, up.length)}`, {}, up.map(cell)), strip, body);
    };
    root.replaceChildren(...B.sections.filter(sec => !only || only.includes(sec.id)).map(sec => {
      const empties = sec.rows.filter(r => blank(sec, r));
      return h('section.st-booksec', { 'data-sec': sec.id },
        h('div.st-bookhead', {}, h('h3', {}, sec.title), sec.rows.length ? h('span.st-small.st-soft', {}, sec.total > 0 ? `${money(sec.total)}${sec.rows.length > 1 ? ` across ${sec.rows.length}` : ''}` : `${sec.rows.length} on file`) : h('span.st-small.st-soft', {}, 'None'),
          btn(`+ ${sec.add}`, () => { const made = addRow(store, book, sec.id); active = { row: made.id, f: null, scroll: true }; paint(); }, 'slim')),
        sec.rows.map(r => rowEl(sec, r)),
        empties.length > 1 ? h('div.st-row', { style: { marginTop: '8px' } }, btn(`Remove the ${empties.length} empty ones`, () => { for (const e of empties) removeRow(store, e.id); paint(); }, 'slim')) : null);
    }));
    // the row just added, or one opened from elsewhere, shows its first box's tap amounts without calling up the keyboard
    if (active?.row) { const el = root.querySelector(`[data-row="${active.row}"]`), inp = el?.querySelector(active.f ? `[data-f="${active.f}"] input` : '.st-bkcell input');
      if (inp) { const cellEl = inp.closest('.st-bkcell'); const sec = B.sections.find(x => x.rows.some(r => r.id === active.row)), f = sec?.front.find(x => x.id === cellEl.dataset.f); if (f) inp.dispatchEvent(new FocusEvent('focus')); }
      if (active.scroll && el) { active.scroll = false; open[book.id] = null; requestAnimationFrame(() => el.scrollIntoView({ block: 'center' })); } }
    soft(B);
  };
  // After typing: the totals, tags and the pulse move without redrawing the box being typed in.
  const soft = (B = bookOf(store.doc, book)) => {
    const rows = B.sections.filter(sec => !only || only.includes(sec.id)).flatMap(sec => sec.rows.map(row => ({ sec, row, need: needOf(sec, row) })));
    for (const { sec, row, need } of rows) {
      const el = root.querySelector(`[data-row="${row.id}"] .st-booktag`); if (el) { el.textContent = need.length ? `${need.length} to go` : '✓'; el.classList.toggle('ok', !need.length); }
      const head = root.querySelector(`[data-sec="${sec.id}"] .st-bookhead > span`), S = B.sections.find(x => x.id === sec.id);
      if (head) head.textContent = S.total > 0 ? `${money(S.total)}${S.rows.length > 1 ? ` across ${S.rows.length}` : ''}` : `${S.rows.length} on file`;
    }
    root.querySelectorAll('.st-pulse').forEach(e => e.classList.remove('st-pulse'));
    const left = rows.filter(x => x.need.length);
    if (pulse && left.length) { const x = left[0], at = root.querySelector(`[data-row="${x.row.id}"] [data-f="${x.need[0].id}"]`), box = at?.matches('select') ? at : at?.querySelector('.in, select'); if (box && !at.contains(document.activeElement)) box.classList.add('st-pulse'); }
    onState({ todo: left.length, count: rows.length, total: rows.reduce((t, x) => t + (x.row.main ?? 0), 0), open: false });
  };
  paint();
  return root;
}
