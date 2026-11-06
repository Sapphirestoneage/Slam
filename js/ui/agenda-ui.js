// SPDX-License-Identifier: AGPL-3.0-only
// The Agenda (Phase 3, batch 3): one panel for a session. Must do is the session's checklist, ticking itself from the
// numbers wherever they change; Going over is what the coach adds; every item takes a quick note and can link to a
// page or field, a homework item, a parking-lot question or a Scorecard hole; Suggested for today adds with a +.
// Home shows it before the session (prep); the docked bar shows it on every tab while the session runs. Coach only.
import { h, icon } from './dom.js';
import { arrive } from './arrive.js';
import * as S from './staples.js';
import { agendaOf, addAgendaItem, removeAgendaItem, tickAgendaItem, setAgendaNote, addSuggestion, makeHomework } from '../program.js';
import { search } from '../nav.js';

export const AUI = { noteOpen: null, showDone: {} }; // which item's note box is open

// Follow an item's link: a page or field, a homework item, a parking-lot question, or a Scorecard hole.
export function follow(app, link, { fallback = null } = {}) {
  const from = location.hash;
  if (!link) { if (fallback) { app.trackerBack(from); arrive(app, fallback, { from }); } return; }
  app.trackerBack(from);
  if (link.kind === 'parking') { app.openParking(); return; }
  if (link.kind === 'record' && link.recId) { app.goFound({ kind: 'record', id: link.recId, route: link.route }); return; }
  if (link.route) arrive(app, link.route, { from }); // item 2: land, highlight the first field that needs work, the toast lists the rest
  if (link.focus) requestAnimationFrame(() => document.querySelector(`[data-focus="${link.focus}"]`)?.focus());
}
const linkWord = link => (!link ? null : { route: 'a page', record: 'a field', homework: 'homework', parking: 'a parking-lot question', hole: 'a Scorecard hole' }[link.kind] ?? 'a page');

// The panel. compact: the docked bar (shorter rows, no editing of the session itself).
export function agendaPanel(app, ctx, A, { compact = false } = {}) {
  const sid = A.sid;
  const showDone = !!AUI.showDone[sid];
  const noteBox = it => {
    const key = `${it.section}:${it.id}`;
    const open = AUI.noteOpen === key || !!it.note;
    if (!open) return S.button('Note', { size: 'small', iconName: 'note', onClick: () => { AUI.noteOpen = key; app.render(); } });
    const ta = h('input', { value: it.note || '', placeholder: 'A quick note', 'aria-label': `Note on ${it.label}`, 'data-focus': `agenda:note:${it.id}` });
    ta.onchange = () => setAgendaNote(ctx.store, sid, it.id, ta.value);
    return h('label.field', { style: { width: compact ? '220px' : '300px' } }, ta);
  };
  const itemRow = it => h(`div.check-item${it.done ? '.done' : ''}${compact ? '.compact' : ''}`, {},
    it.auto ? h('span.box', { 'aria-hidden': 'true' }, it.done ? icon('check') : null)
      : h('input', { type: 'checkbox', checked: it.done, 'aria-label': it.label, onchange: e => (it.section === 'must' ? ctx.store.setIn('program', ['checks', sid, it.id], e.target.checked || undefined, 'Checklist') : tickAgendaItem(ctx.store, sid, it.id, e.target.checked)) }),
    h('div', { style: { flex: 1, minWidth: 0 }, title: it.auto ? 'Ticks itself from the numbers' : null }, h('div.what', {}, it.label, it.key === 'day0' && !it.done ? h('span.muted', {}, ' · Saves a starting snapshot. Also happens when you end the session.') : it.detail ? h('span.muted', {}, ` · ${it.detail}`) : null, it.carried ? h('span.tag.plain', { style: { marginLeft: '6px' } }, 'carried over') : null),
      it.link && !it.done ? h('div.auto', {}, `Links to ${linkWord(it.link)}`) : null), // item 6: no From the numbers subtitle; the box carries it on hover
    it.done && !showDone ? null : noteBox(it),
    it.key === 'day0' && !it.done ? S.button('Save Day 0 now', { size: 'small', iconName: 'camera', onClick: () => { app.snapshot('Day 0', { day0: true, session: A.n }); } }) : null, // item 7
    (it.route || it.link) && !(it.done && !showDone) ? S.button('Open', { size: 'small', iconName: 'right', onClick: () => follow(app, it.link ?? { kind: 'route', route: it.route }) }) : null,
    it.section === 'going' ? S.iconButton('trash', `Remove ${it.label}`, () => removeAgendaItem(ctx.store, sid, it.id), { tiny: true }) : null);
  const add = h('input', { placeholder: 'Add something to go over', 'aria-label': 'Add something to go over' });
  const addIt = () => { const v = add.value.trim(); if (!v) return; addAgendaItem(ctx.store, sid, { label: v }); };
  add.onkeydown = e => { if (e.key === 'Enter') addIt(); };
  const setLink = (it, link) => ctx.store.setIn('program', ['agenda', sid, 'going'], (ctx.store.doc.program.agenda[sid].going || []).map(x => (x.id === it.id ? { ...x, link } : x)), 'Agenda');
  // The link menu: the Scorecard, the homework list, the parking lot, or Find (answer 142) for any screen, field or row.
  const linkPicker = (anchor, it) => {
    const q = h('input', { placeholder: 'Find a field, a row or a screen', 'aria-label': 'Find a field, a row or a screen' });
    const list = h('div.stack', { style: { gap: '4px' } });
    q.oninput = () => { const found = search(q.value, { fields: app.fields || [], records: ctx.store.records, controlHidden: !!ctx.store.doc.controlHidden }).slice(0, 6);
      list.replaceChildren(...found.map(r => h('button.btn.small', { type: 'button', onclick: () => { S.closePop(); setLink(it, r.kind === 'record' ? { kind: 'record', recId: r.id, route: r.route } : { kind: 'route', route: r.route }); } }, `${r.label} · ${r.where}`))); };
    S.popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, `Link ${it.label} to`),
      h('div.row-line', { style: { gap: '6px' } }, ...[['The Scorecard', { kind: 'hole', route: '#/plan/scorecard' }], ['The homework list', { kind: 'homework', route: '#/tools/lists' }], ['The parking lot', { kind: 'parking' }]]
        .map(([label, link]) => h('button.btn.small', { type: 'button', onclick: () => { S.closePop(); setLink(it, link); } }, label))),
      h('span.label', {}, 'Or an exact field'), h('label.field', { style: { width: '300px' } }, q), list), { width: 360 });
  };
  // Item 4: done Must do items collapse into one slim line; only what is left stays open.
  const mustDone = A.must.filter(i => i.done), mustOpen = A.must.filter(i => !i.done), allDone = A.must.length > 0 && !mustOpen.length;
  const doneLine = mustDone.length ? h('button.btn.small.done-line', { type: 'button', 'aria-expanded': String(!!showDone), onclick: () => { AUI.showDone[sid] = !showDone; app.render(); } }, icon('check'), ` ${mustDone.length} done`, h('span.muted', {}, showDone ? ' (hide)' : ' (show)')) : null;
  return h('div.agenda-panel', {},
    allDone ? h('div.agenda-head', {}, h('strong', {}, `Session ${A.n} complete ✓`), h('span.muted.small', {}, 'End the session to review and save')) : null,
    h('div.agenda-head', {}, h('strong', {}, 'Must do'), A.must.some(i => !i.done) ? h('button.btn.small.count-btn', { type: 'button', 'aria-label': 'Must do: see what is left', onclick: e => S.popover(e.currentTarget, h('div.stack', { style: { gap: '6px' } }, h('strong', {}, `${A.must.filter(i => !i.done).length} left`), ...A.must.filter(i => !i.done).map(i => h('div.row-line', { style: { gap: '8px' } }, h('span', { style: { flex: 1 } }, i.label), i.route || i.link ? S.button('Open', { size: 'small', iconName: 'right', onClick: () => { S.closePop(); follow(app, i.link ?? { kind: 'route', route: i.route }); } }) : null))), { width: 340 }) }, `${A.must.filter(i => i.done).length} of ${A.must.length}`) : h('span.muted.small', {}, `${A.must.filter(i => i.done).length} of ${A.must.length}`)), // item 3
    h('div.checklist', { style: { marginBottom: '8px' } }, doneLine, (showDone ? A.must : mustOpen).map(itemRow)),
    h('div.agenda-head', {}, h('strong', {}, 'Going over'), h('span.muted.small', {}, A.going.length ? `${A.going.filter(i => i.done).length} of ${A.going.length}` : 'Nothing added yet')),
    A.going.length ? h('div.checklist', { style: { marginBottom: '8px' } }, A.going.map(it => { const row = itemRow(it); if (!it.link && !it.auto) row.append(S.button('Link', { size: 'small', onClick: e => linkPicker(e.currentTarget, it) })); return row; })) : null,
    h('div.row-line', { style: { gap: '8px', marginBottom: '8px' } }, h('label.field', { style: { width: compact ? '220px' : '300px' } }, add), S.button('Add', { iconName: 'plus', onClick: addIt })),
    A.suggestions.length ? S.moreBlock(`agenda:suggest:${sid}${compact ? ':bar' : ''}`, () => h('div.suggest-list', {}, A.suggestions.map(sg => h('div.suggest-row', {},
      S.button('+', { size: 'small', onClick: () => { addSuggestion(ctx.store, sid, sg); S.toast(`Added: ${sg.label}`); } }),
      h('span', { style: { flex: 1 } }, sg.label, h('span.muted.small', {}, ` · ${sg.why}`)),
      sg.kind === 'parked' ? S.button('Make homework', { size: 'small', onClick: () => { makeHomework(ctx.store, sid, sg.label.replace(/^Back from parking: /, 'Fill the ') + ' hole', { link: sg.link }); S.toast('Homework made.', { undo: () => ctx.store.undo() }); } }) : null,
      h('span.tag.plain', {}, { carried: 'carried over', homework: 'homework', parking: 'parking lot', hole: 'top hole', stale: 'stale number', parked: 'back from parking', mode: 'household' }[sg.kind] ?? sg.kind)))),
    { label: `Suggested for today (${A.suggestions.length})` }) : null);
}
export { agendaOf };
