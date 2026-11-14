// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: the FI Skill Tree self-check. One tree at a time, one milestone at a time: "have you done this?" The
// first "not yet" places the tree. The result is a character level out of 625 and the one skill to unlock next.
import { boot, h, btn, stepLine, carryCard, foot } from './shell.js';
import { treeOf, placeOf, MILESTONES } from '../tree.js';

const $ = id => document.getElementById(id);
const data = await fetch('data/skill-tree.json').then(r => r.json());
function draw(api) {
  stepLine(api); foot();
  const m = api.mine(), levels = m.tree || {}, asked = m.treeAsked || {}, T = treeOf(data, levels, asked);
  const at = m.treeAt && data.trees.some(t => t.id === m.treeAt) ? data.trees.find(t => t.id === m.treeAt) : null, cur = at ?? (T.nextTree ? data.trees.find(t => t.id === T.nextTree.id) : null);
  const run = m.treeRun || [], P = cur ? placeOf(cur, run) : null;
  const place = (tree, level, skip = false) => api.remember({ tree: { ...levels, [tree.id]: level }, treeAsked: { ...asked, [tree.id]: skip ? 'skip' : true }, treeRun: [], treeAt: null });
  if (cur && P && P.level !== undefined) { place(cur, P.level); return api.render(); }
  const n = cur ? data.trees.findIndex(t => t.id === cur.id) : -1;
  const ask = () => h('div.st-card', {}, h('div.st-eyebrow', {}, `Tree ${n + 1} of ${data.trees.length}: ${cur.name}`), h('div.st-pips', { 'aria-hidden': 'true' }, data.trees.map(t => h(`i${asked[t.id] ? '.on' : ''}${t.id === cur.id ? '.now' : ''}`))),
    h('div.st-small.st-soft', { style: { marginTop: '8px' } }, `Level ${P.ask.n} of 25`), h('h2.st-quizq', {}, P.ask.name), h('p', { style: { margin: '0 0 4px' } }, P.ask.what), P.ask.check ? h('p.st-small', {}, h('strong', {}, 'You have it when: '), P.ask.check) : null,
    h('div.st-row.st-pulse', { style: { borderRadius: '14px', marginTop: '10px' }, role: 'group', 'aria-label': 'Have you done this?' }, btn('Yes, done', () => { api.remember({ treeRun: [...run, true] }); api.render(); }, 'primary big'), btn('Not yet', () => { api.remember({ treeRun: [...run, false] }); api.render(); }, 'big')),
    h('div.st-row', { style: { marginTop: '12px' } }, btn('Not for me: skip this tree', () => { place(cur, 0, true); api.render(); }, 'slim'), T.placed ? btn('See where I am so far', () => { api.remember({ treeAt: null, treeRun: [], treePause: true }); api.render(); }, 'slim') : null));
  const paused = m.treePause && !at;
  const result = () => h('div.st-card.hero', { id: 'answer' }, h('div.st-eyebrow', {}, 'Your character sheet'), h('div.st-soft', {}, 'Character level'), h('div.st-big', {}, `${T.total} of ${T.of}`),
    h('p', { style: { fontWeight: 700 } }, T.done ? 'Nobody finishes every tree. The 25s are there so you can see the whole map, not so you clear it.' : `${T.placed} of ${data.trees.length} trees placed so far.`),
    T.unlock ? h('div.st-readout', { role: 'status' }, h('strong', {}, `Your next unlock: ${T.unlock.name}`), h('div', {}, `${T.unlock.tree}, level ${T.unlock.n}. ${T.unlock.what}`), T.unlock.check ? h('div.st-small', {}, `You have it when: ${T.unlock.check}`) : null, h('div.st-small', { style: { marginTop: '4px' } }, 'One unlock a quarter moves faster than twelve at once.')) : null,
    h('div.st-quizbars', {}, T.trees.filter(t => t.placed).sort((a, b) => b.level - a.level).map(t => h('button.st-quizbar.st-treebar', { type: 'button', 'aria-label': `${t.name}: level ${t.level} of 25. Place it again`, onClick: () => { api.remember({ treeAt: t.id, treeRun: [], treePause: false }); api.render(); } },
      h('span.st-quizname', {}, h('strong', {}, t.name), h('small', {}, t.band ?? 'Not started')), h('span.st-quiztrack', {}, h('b', { style: { width: `${Math.max(2, t.level / 25 * 100)}%` } })), h('span.st-quiznum', {}, String(t.level))))),
    h('p.st-small.st-soft', {}, 'Tap a tree to place it again. Levels come in fives here; the full tree fills in the steps between.'),
    T.done ? null : h('div.st-row', {}, btn('Keep going', () => { api.remember({ treePause: false }); api.render(); }, 'primary')));
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, api.me.title), h('p', { style: { marginBottom: 0 } }, `625 skills, 25 trees. For each tree you get up to ${MILESTONES.length} quick "have you done this?" checks, and the first "not yet" places you. Stop any time: what you have placed is kept.`)),
    cur && !paused ? ask() : null, (T.placed && (paused || !cur)) ? result() : null,
    carryCard(api, { ready: true, pulse: !cur || paused }));
}
boot('skills', draw);
