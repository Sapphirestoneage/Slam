// SPDX-License-Identifier: AGPL-3.0-only
// Net worth › Institutions (batch 6, items 13 to 15): the list, slim and collapsed; the picker every row uses; what
// is held at each one with a total; the CSV column map saved per institution.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { INSTITUTION_KINDS, institutionsOf, addInstitution, updateInstitution, removeInstitution, atInstitution, rowLabel } from '../institutions.js';
import { personLabels } from '../registry/couples.js';
import { money } from '../format.js';

export const IUI = { open: null };
// The dropdown on an account, card, loan or policy, with + New institution inline.
export function institutionPicker(ctx, r, up, { width = 170 } = {}) {
  const list = institutionsOf(ctx.store.doc);
  const sel = S.select([...list.map(i => [i.id, i.name]), ['__new', '+ New institution']], r.values.institutionId ?? null, v => {
    if (v === '__new') { newInstitution(ctx, sel, row => up({ institutionId: row.id })); return; }
    up({ institutionId: v });
  }, { label: `Institution for ${r.name || r.type || r.kind}`, hint: 'Institution', width, key: `${r.id}:institutionId` });
  return sel;
}
// Batch 11 (item 5f, the Monarch pattern): in a row, the institution is a small "Add bank" link; once picked it reads
// as a label (click it to change). A popover holds the list and + New institution, so a row has one box, not two.
export function institutionLink(ctx, r, up, { word = 'Add bank' } = {}) {
  const list = institutionsOf(ctx.store.doc);
  const cur = list.find(i => i.id === r.values.institutionId) ?? null;
  const b = h(`button.inst-link${cur ? '.set' : ''}`, { type: 'button', 'aria-label': cur ? `Institution: ${cur.name}. Change` : `${word} for ${r.name || r.type || r.kind}`, 'data-focus': `${r.id}:institutionId`, title: cur ? 'Change the institution' : null },
    cur ? cur.name : [icon('plus'), ` ${word}`]);
  b.onclick = () => S.popover(b, h('div.stack', { style: { gap: '6px' } }, h('h3', {}, 'Institution'),
    list.length ? h('div.row-line', { style: { gap: '6px', flexWrap: 'wrap' } }, list.map(i => h('button.btn.small', { type: 'button', 'aria-pressed': String(i.id === cur?.id), onclick: () => { S.closePop(); up({ institutionId: i.id }); } }, i.name))) : h('span.muted.small', {}, 'None yet.'),
    h('div.row-line', { style: { gap: '6px' } }, h('button.btn.small', { type: 'button', onclick: () => { S.closePop(); newInstitution(ctx, b, row => up({ institutionId: row.id })); } }, icon('plus'), 'New institution'),
      cur ? h('button.btn.small', { type: 'button', onclick: () => { S.closePop(); up({ institutionId: null }); } }, 'Clear') : null)), { width: 300 });
  return b;
}
function newInstitution(ctx, anchor, onMade) {
  const name = h('input', { placeholder: 'Name (e.g. Chase)', 'aria-label': 'Institution name' });
  let kind = null;
  S.popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, 'New institution'), h('label.field', { style: { width: '240px' } }, name),
    S.select(INSTITUTION_KINDS, kind, v => { kind = v; }, { label: 'Kind', hint: 'Kind', width: 170 }),
    h('span.muted.small', {}, 'Name, kind, website and notes only. Never a login or a password.'),
    h('div.row-line', {}, S.button('Add it', { kind: 'primary', onClick: () => { const v = name.value.trim(); if (!v) { S.toast('Give it a name.'); name.focus(); return; } S.closePop(); const row = addInstitution(ctx.store, { name: v, kind }); onMade?.(row); S.toast(`${row.name} added.`, { undo: () => ctx.store.undo() }); } }), S.button('Cancel', { onClick: S.closePop }))), { width: 300 });
  setTimeout(() => name.focus());
}
export function institutionsCard(app, ctx) {
  const doc = ctx.store.doc, list = institutionsOf(doc), names = personLabels(doc);
  const row = i => {
    const at = atInstitution(doc, i.id), open = IUI.open === i.id, csv = doc.settings?.csvMaps?.[i.name];
    return h('div.inst-row', {},
      h('div.row-line', { style: { gap: '8px', flexWrap: 'wrap' } },
        h('button.btn.small.inst-name', { type: 'button', 'aria-expanded': String(open), onclick: () => { IUI.open = open ? null : i.id; app.render(); } }, icon(open ? 'down' : 'right'), ` ${i.name}`, h('span.muted', {}, ` · ${at.rows.length} ${at.rows.length === 1 ? 'item' : 'items'}`)),
        S.select(INSTITUTION_KINDS, i.kind ?? null, v => updateInstitution(ctx.store, i.id, { kind: v }), { label: `${i.name} kind`, hint: 'Kind', width: 150 }),
        S.textInput(i.website, v => updateInstitution(ctx.store, i.id, { website: v }), { hint: 'Website (optional)', width: 190, key: `inst:${i.id}:web` }),
        i.website ? h('a', { href: /^https?:/.test(i.website) ? i.website : `https://${i.website}`, target: '_blank', rel: 'noopener' }, 'Open site ›') : null,
        ctx.couple ? S.toggle([['Me', names.Me], ['Partner', names.Partner], ['Joint', 'Joint']], i.owner ?? null, v => updateInstitution(ctx.store, i.id, { owner: v }), { label: `${i.name} whose`, clearable: true }) : null,
        csv ? h('span.tag.plain', { title: 'A bank CSV column map is saved for this institution' }, 'CSV map saved') : null,
        h('span.spacer'), S.iconButton('trash', `Remove ${i.name}`, () => { removeInstitution(ctx.store, i.id); S.toast(`${i.name} removed; its rows keep their nicknames.`, { undo: () => ctx.store.undo() }); }, { tiny: true })),
      h('div.row-line', { style: { gap: '8px', marginTop: '4px' } }, S.textInput(i.notes, v => updateInstitution(ctx.store, i.id, { notes: v }), { hint: 'Notes (never a login or password)', width: 420, key: `inst:${i.id}:notes` })),
      open ? h('div.inst-here', {}, at.rows.length ? [h('div.stack', { style: { gap: '4px' } }, at.rows.map(r => h('div.row-line', { style: { gap: '8px' } }, h('span', {}, rowLabel(doc, r)), h('span.muted.small', {}, r.kind === 'account' ? 'account' : r.kind === 'debt' ? 'debt' : 'coverage'), h('span.spacer'), h('span.num', {}, r.kind === 'coverage' ? (r.amount != null ? `${money(r.amount)} premium` : '') : money(r.values.balance ?? 0))))),
        h('div.row-line', { style: { gap: '8px', marginTop: '6px', fontWeight: 700 } }, h('span', {}, 'Total here'), h('span.spacer'), h('span.num', {}, `${money(at.total)}`), at.owed ? h('span.muted.small', {}, `(${money(at.owned)} owned, ${money(at.owed)} owed)`) : null)]
        : h('span.muted.small', {}, 'Nothing points here yet. Pick it on an account, card, loan or policy.')) : null);
  };
  return h('div.card.institutions-card', {},
    h('p.muted.small', { style: { margin: '0 0 8px' } }, 'Where the money sits: name, kind, website and notes. Never a login or a password. Every account, card, loan and policy picks one.'),
    list.length ? h('div.stack', { style: { gap: '8px' } }, list.map(row)) : h('p.muted', { style: { margin: 0 } }, 'No institutions yet.'),
    h('div.row-line', { style: { marginTop: '8px' } }, S.button('Add institution', { iconName: 'plus', onClick: e => newInstitution(ctx, e.currentTarget) })));
}
