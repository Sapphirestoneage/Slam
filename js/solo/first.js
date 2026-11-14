// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: "What is my first move?" (quantum collapse). One question at a time, each one ruling plans out, until one
// move is left. The move names the page to open next, and the answers ride along.
import { boot, h, btn, chip, stepLine, copyLink, foot } from './shell.js';
import { pack } from '../start/link.js';
import { COLLAPSE, collapseOf } from '../collapse.js';
import { carryUrl } from '../solo.js';

const $ = id => document.getElementById(id);
function draw(api) {
  stepLine(api); foot();
  const m = api.mine(), a = m.collapse || {}, C = collapseOf(a);
  const set = (id, v) => { const next = { ...a, [id]: v }; for (const q of COLLAPSE) if (q.when && !q.when(next)) delete next[q.id]; const c = collapseOf(next); api.remember({ collapse: next, ...(c.done && c.mirror && !m.mirrorPicked ? { mirror: c.mirror } : {}) }); api.render(); };
  const meter = h('div.st-card', {}, h('div.st-collapse', { role: 'img', 'aria-label': `${C.left.toLocaleString('en-US')} of ${C.total.toLocaleString('en-US')} plans still possible` }, h('b', { style: { width: `${Math.max(2, (1 - C.share) * 100)}%` } })),
    h('div.st-row', { style: { justifyContent: 'space-between', marginTop: '6px' } }, h('strong', {}, C.done ? '1 plan left: yours' : `${C.left.toLocaleString('en-US')} plans still possible`), h('span.st-small.st-soft', {}, C.shortened ? 'Shortened: your answers already settled it' : `of ${C.total.toLocaleString('en-US')}`)));
  const ask = q => h('div.st-card', {}, h('div.st-eyebrow', {}, `Question ${C.answered + 1} of ${C.asked}`), h('h2.st-quizq', {}, q.ask),
    h('div.st-ticks.st-pulse', { role: 'group', 'aria-label': q.ask, style: { borderRadius: '14px' } }, q.options.map(([v, l]) => h('button.st-btn.st-collapseopt', { type: 'button', onClick: () => set(q.id, v) }, l))),
    C.answered > 0 ? h('div.st-row', { style: { marginTop: '12px' } }, btn('‹ Back one', () => { const ids = COLLAPSE.filter(x => a[x.id] != null).map(x => x.id), last = ids.at(-1), next = { ...a }; delete next[last]; api.remember({ collapse: next }); api.render(); }, 'slim')) : null);
  const go = btn(C.done ? `Do it: ${C.move.label} ›` : '', async () => { location.href = carryUrl(C.move.page, await pack(api.store.doc)); }, 'primary big st-pulse');
  const result = () => h('div.st-card.hero', { id: 'answer' }, h('div.st-eyebrow', {}, 'Your first move'), h('h2', { style: { margin: '0 0 6px', fontSize: '1.6rem' } }, C.move.title), h('p', { style: { fontWeight: 700 } }, C.move.why),
    C.notes.length ? h('ul.st-steps', {}, C.notes.map(t => h('li', {}, t))) : null,
    h('div.st-row', { style: { marginTop: '10px' } }, go), h('div.st-row', { style: { marginTop: '10px' } }, btn('Change my answers', () => { api.remember({ collapse: {} }); api.render(); }, 'slim'), copyLink(api), h('a.st-btn.slim', { href: 'one.html' }, 'All the steps')));
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, api.me.title), h('p', { style: { marginBottom: 0 } }, 'There are thousands of money plans. A few taps rule out all but yours. No numbers needed yet.')),
    meter, C.done ? result() : ask(C.next));
}
boot('first', draw);
