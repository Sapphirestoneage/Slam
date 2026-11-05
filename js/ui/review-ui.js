// SPDX-License-Identifier: AGPL-3.0-only
// The review gate (Phase 3, batch 3): before a session ends (End session, Move to next session) and at the start of
// the Revisit session. The agenda's open items each carry over or become homework; the stage's key numbers show
// their value and level with Looks right (locks to Actual) and Edit; homework the client says is done gets Confirm or
// Back to To do; Move on anyway takes an optional note kept on the session record; the snapshot is saved after.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { reviewOf, confirmRow, endSession, markRescored, sessionOf, inSession, graduated, setHomeworkStatus, homeworkAll } from '../program.js';
import { follow } from './agenda-ui.js';

const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const isoDay = d => d.toISOString().slice(0, 10);
const LEVEL_TAG = { Missing: 'warn', Gut: 'guess', Rough: 'roughly', Estimate: 'plain', Actual: 'good' };
export const RVW = { confirmed: [], decisions: {}, revisitDone: false }; // the rows confirmed and the carry-or-homework picks in this review

// Ends the session (or moves on to the next without one) with the review's picks and note; a backup file follows (R151).
export function finishSession(app, ctx, { note = null } = {}) {
  const hw = homeworkAll(ctx.store.doc, ctx.visible(() => true)).filter(x => x.status !== 'Confirmed');
  const s = sessionOf(ctx.store.doc);
  const r = endSession(ctx.store, ctx.ref, { homework: hw.map(x => x.label), next: s.next || isoDay(new Date(Date.now() + 14 * 86400000)), now: ctx.now(), flags: app.flags, note, confirmed: RVW.confirmed, decisions: RVW.decisions });
  RVW.confirmed = []; RVW.decisions = {}; RVW.revisitDone = false;
  app.saveNow();
  try { app.exportNow({ quiet: true }); } catch { /* downloads can be blocked; the reminder stays */ }
  S.toast(r.first ? 'Session 1 saved, with the Day 0 snapshot.' : r.graduation ? 'Graduation saved, with the final snapshot.' : `Session ${r.n} saved. Snapshot taken.${r.carried.length ? ` ${r.carried.length} carried over.` : ''}${r.homework.length ? ` ${r.homework.length} made homework.` : ''}`);
  app.go('#/home/session');
}

export function reviewScreen(app, ctx) {
  if (app.prefs.clientView) { app.go('#/home/session'); return []; } // coach only
  const doc = ctx.store.doc;
  const R = reviewOf(doc, ctx.ref, { now: ctx.now(), flags: app.flags });
  const live = inSession(doc);
  const revisit = R.sid === 'S9' && live && !doc.scorecard?.reviewedAt?.startsWith?.(ctx.now().toISOString().slice(0, 10)) && !RVW.revisitDone; // the Revisit session opens the gate at its start
  const mode = revisit ? 'revisit' : live ? 'end' : 'move';
  const open = R.unfinished;
  const note = h('textarea.notes-box', { placeholder: 'Optional: why we moved on, what to pick up next time', 'aria-label': 'Review note', 'data-focus': 'review:note' });
  const jump = r => { if (r.recId) { app.trackerBack('#/home/review'); app.goFound({ kind: 'record', id: r.recId, route: r.route }); } else follow(app, { kind: 'route', route: r.route, focus: r.focus }); };
  const row = r => h('div.review-row', {},
    h('div.review-what', {}, h('strong', {}, r.label), h('span.muted.small', {}, r.value)),
    h(`span.tag.${LEVEL_TAG[r.word] || 'plain'}`, {}, r.word),
    h('div.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
      r.locked ? h('span.tag.good', {}, icon('lock'), 'Actual') : S.button('Looks right', { size: 'small', iconName: 'check', disabled: !r.canLock, why: r.level === 0 ? 'Nothing entered yet' : 'Nothing to lock', onClick: () => { confirmRow(ctx.store, r); RVW.confirmed = [...new Set([...RVW.confirmed, r.id])]; S.toast(`${r.label}: locked as Actual.`, { undo: () => ctx.store.undo() }); } }),
      S.button('Edit', { size: 'small', iconName: 'right', disabled: !r.route, onClick: () => jump(r) })));
  const decide = it => { const pick = RVW.decisions[it.id] ?? 'carry'; return h('div.review-row', {}, h('div.review-what', {}, h('strong', {}, it.label), h('span.muted.small', {}, it.section === 'must' ? 'Must do' : 'Going over', it.note ? ` · ${it.note}` : '')),
    h('div.decide', {}, S.toggle([['carry', 'Carry over'], ['homework', 'Make homework']], pick, v => { RVW.decisions[it.id] = v || 'carry'; }, { label: `${it.label}: carry over or make homework` }))); };
  const hwRow = x => h('div.review-row', {}, h('div.review-what', {}, h('strong', {}, x.label), h('span.muted.small', {}, `Client says done${x.statusBy ? ` (${x.statusBy})` : ''}${x.where ? ` · ${x.where}` : ''}`)),
    h('div.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
      S.button('Confirm', { size: 'small', iconName: 'check', onClick: () => { setHomeworkStatus(ctx.store, x.key, 'Confirmed'); S.toast(`${x.label}: confirmed.`, { undo: () => ctx.store.undo() }); } }),
      S.button('Back to To do', { size: 'small', onClick: () => setHomeworkStatus(ctx.store, x.key, 'To do') })));
  const groups = [...new Set(R.rows.map(r => r.group))];
  const NAMES = { income: 'Income', spending: 'Spending', debt: 'Debt', account: 'Accounts', thing: 'Things', age: 'About you', areas: 'About you' };
  const primary = mode === 'revisit' ? S.button('Done re-scoring', { kind: 'primary', size: 'big', iconName: 'check', onClick: () => { markRescored(ctx.store, { now: ctx.now() }); RVW.revisitDone = true; S.toast('Re-scored and re-ranked from the numbers as they stand.'); app.go('#/home/session'); } })
    : S.button(open.length ? 'Move on anyway' : mode === 'end' ? 'End session' : 'Move to the next session', { kind: 'primary', size: 'big', iconName: 'check', onClick: () => finishSession(app, ctx, { note: note.value.trim() || null }) });
  return [head('Review key numbers', `Session ${R.n} · ${R.name}${mode === 'revisit' ? ': re-score at the start of Revisit' : mode === 'end' ? ': before it ends' : ': before moving on'}`, S.button('Back to Home', { iconName: 'left', onClick: () => app.go('#/home/session') })),
    mode === 'revisit' ? null : h('div.card', { style: { marginBottom: '12px' } }, h('h3', { style: { margin: '0 0 8px' } }, open.length ? `Still open: ${open.length} ${open.length === 1 ? 'item' : 'items'}` : 'The agenda'),
      open.length ? h('div.review-list', {}, open.map(decide)) : h('p.muted', { style: { margin: 0 } }, 'Every item is done.'),
      open.length ? h('p.muted.small', { style: { margin: '8px 0 0' } }, `Carried over items are suggested for ${R.nextName ? `session ${R.n + 1} (${R.nextName})` : 'the next session'}; homework goes to the Homework list.`) : null),
    h('p.muted', {}, 'Each number this stage leans on, with how sure it is. Looks right locks it as Actual; Edit opens where it lives.'),
    groups.map(g => h('div.card', { style: { marginBottom: '12px' } }, h('h3', { style: { margin: '0 0 8px' } }, NAMES[g] ?? g), h('div.review-list', {}, R.rows.filter(r => r.group === g).map(row)))),
    !R.rows.length ? h('div.card', {}, h('p.muted', { style: { margin: 0 } }, 'No numbers to review yet.')) : null,
    R.saidDone.length ? h('div.card', { style: { marginBottom: '12px' } }, h('h3', { style: { margin: '0 0 8px' } }, 'Homework the client says is done'), h('div.review-list', {}, R.saidDone.map(hwRow))) : null,
    mode === 'revisit' ? null : h('div.card', { style: { marginBottom: '12px' } }, h('div.stack', { style: { gap: '6px' } }, h('span.label', {}, 'Note (optional, kept on the session record)'), note)),
    h('div.row-line', { style: { gap: '10px' } }, primary, h('span.muted.small', {}, mode === 'revisit' ? 'Then the session runs as usual; End session reviews again.' : 'Saves the snapshot, the homework and a backup file, then shows Send summary.'),
      graduated(doc) ? h('span.muted.small', {}, 'The program is complete.') : null)];
}
