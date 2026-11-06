// SPDX-License-Identifier: AGPL-3.0-only
// The library's first slice (batch 26, M9K): on each Plan › FOO step a "Learn and unlearn" fold (three skills to learn,
// one thing to unlearn, the done ones folded into a count), open on the step you are on and closed on the rest; on
// Home, one slim "Learn next" line in the next-step card. The views only show what js/math/library.js returns.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { skillLibrary, loadSkillLibrary } from '../library.js';
import { libraryOf, setSkillDone } from '../math/library.js';
import { PROOF_FACTS, WORDS } from '../registry/library.js';
import { stepHeadline } from '../registry/foo.js';
import { land } from './arrive.js';

// View state: which step folds are open (a step not in the map is open when it is the step you are on), and which
// done lists are showing. Never saved.
export const LUI = { open: {}, doneOpen: {} };

// The picks for this client, or null while the files load (the screen redraws once they are in).
export function libraryFor(app, ctx, { f = null } = {}) {
  const lib = skillLibrary();
  if (!lib) { loadSkillLibrary(() => app.render()); return null; }
  return libraryOf(ctx.store.doc, ctx.ref, lib, { now: ctx.now(), flags: app.flags || [], f });
}

const tipOf = x => {
  const s = x.skill;
  const proof = x.self ? `Ticks itself when SLAM sees ${PROOF_FACTS[x.field]?.words ?? x.field}.` : s.proof ? `Done when: ${s.proof.replace(/^leveled when /, '')}.` : null;
  return [s.does, s.fits, proof, s.treeName ? `${s.treeName}, level ${s.level}` : null].filter(Boolean).join(' · ');
};
const byWords = x => (x.by === 'data' ? 'ticked by the data' : x.by === 'client' ? 'ticked by you' : 'ticked by the coach');

function learnRow(ctx, x) {
  const s = x.skill;
  const act = x.self
    ? h('span.tag.plain.learn-act', { title: `Ticks itself when SLAM sees ${PROOF_FACTS[x.field]?.words ?? x.field}` }, WORDS.selfTick)
    : h('button.btn.small.learn-act', { type: 'button', 'data-focus': `learn:done:${s.id}`, title: s.proof ? `Done when: ${s.proof}` : 'Mark it done', onclick: () => { setSkillDone(ctx.store, s.id, true, { now: ctx.now() }); S.toast(`${s.name}: done.`, { undo: () => ctx.store.undo() }); } }, icon('check'), WORDS.done);
  return h('div.learn-row', { 'data-skill': s.id },
    h('span.learn-words', { title: tipOf(x) }, h('strong', {}, s.name), s.description ? h('span.muted.small', {}, ` ${s.description}`) : null), act);
}
function unlearnRow(u) {
  const when = u.status === 'notYet' ? `${WORDS.notYet}: step ${u.fitsAt}` : u.status === 'past' ? WORDS.past : null;
  return h('div.unlearn-row', {},
    h('div.learn-words', { title: `${u.from ? `Usually heard from ${u.from}. ` : ''}It fits at ${u.rightWords}.` }, h('span.label', {}, WORDS.unlearn), ' ', h('strong', {}, `"${u.advice}"`), when ? h('span.tag.plain.unlearn-when', {}, when) : null),
    h('p.muted.small.unlearn-line', {}, u.line));
}
function doneList(ctx, B) {
  if (!B.done.length) return null;
  const id = B.step, on = !!LUI.doneOpen[id];
  const btn = h('button.caret.learn-done-btn', { type: 'button', 'aria-expanded': String(on), 'data-focus': `learn:donelist:${id}`, onclick: () => { LUI.doneOpen[id] = !on; document.dispatchEvent(new CustomEvent('slam:rerender')); } },
    icon('check'), ` ${B.done.length} done`, icon(on ? 'down' : 'right'));
  return h('div.learn-done', {}, btn, on ? h('div.learn-done-list', {}, B.done.map(x => h('div.learn-row.done', {},
    h('span.learn-words', { title: tipOf(x) }, h('strong', {}, x.skill.name), h('span.muted.small', {}, ` ${byWords(x)}`)),
    x.by === 'data' ? h('span.learn-act') : h('button.btn.small.learn-act', { type: 'button', onclick: () => setSkillDone(ctx.store, x.skill.id, false, { now: ctx.now() }) }, WORDS.undo)))) : null);
}

// The fold on one FOO step. Open on the step you are on until someone closes it.
export function learnBlock(app, ctx, L, step) {
  const B = L?.steps?.[step];
  if (!B || (!B.total && !B.unlearn)) return null;
  const open = LUI.open[step] ?? (L.here === step);
  const count = [B.learn.length ? `${B.learn.length} to learn` : null, B.unlearn ? '1 to unlearn' : null, B.done.length ? `${B.done.length} done` : null].filter(Boolean).join(' · ');
  const btn = h('button.caret.learn-caret', { type: 'button', 'aria-expanded': String(open), 'data-focus': `learn:foo:${step}`, title: `${count}. ${WORDS.credit}`, 'aria-label': `${WORDS.block}: ${count}`, onclick: () => { LUI.open[step] = !open; app.render(); } },
    WORDS.block, h('span.muted.small.learn-count', {}, ` (${B.learn.length})`), icon(open ? 'down' : 'right'));
  const body = open ? h('div.learn-body', {},
    B.learn.length ? h('div.learn-list', { 'aria-label': `Skills to learn at ${stepHeadline(step)}` }, B.learn.map(x => learnRow(ctx, x))) : h('p.muted.small', { style: { margin: 0 } }, WORDS.empty),
    B.unlearn ? unlearnRow(B.unlearn) : null,
    doneList(ctx, B)) : null;
  return h(`div.learn-wrap${open ? '.open' : ''}`, { 'data-learn': step }, btn, body);
}

// Home: one slim line in the next-step card, "Learn next: <skill>", that opens the step's fold on Plan › FOO.
export function openLearn(app, step) { LUI.open[step] = true; land(app, '#/plan/foo', { focus: `learn:foo:${step}` }); }
export function learnNextLine(app, ctx) {
  const L = libraryFor(app, ctx);
  const n = L?.next;
  if (!n) return null;
  return h('p.small.learn-next', {}, h('span.muted', {}, `${WORDS.home}: `),
    h('button.link-btn', { type: 'button', 'data-focus': 'learn:home', title: `${tipOf(n)} Opens Learn and unlearn on Plan › FOO, step ${L.here}.`, onclick: () => openLearn(app, L.here) }, n.skill.name, ' ›'));
}
export const learnNextName = (app, ctx) => libraryFor(app, ctx)?.next?.skill.name ?? null;
