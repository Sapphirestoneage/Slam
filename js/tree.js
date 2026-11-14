// SPDX-License-Identifier: AGPL-3.0-only
// The FI Skill Tree as a self-check (Eli's 625: 25 trees of 25 levels, data/skill-tree.json). Each tree asks about its
// milestone skills (levels 5, 10, 15, 20, 25) and stops at the first "not yet", so a tree takes one to five taps.
// Within a tree each level builds on the one before, so the highest "yes" is the level. Pure, no DOM.
export const MILESTONES = [5, 10, 15, 20, 25];
const BAND_OF = n => Math.min(4, Math.floor((n - 1) / 5));
// levels: { treeId: 0..25 } for trees already placed. asked: { treeId: true } once a tree has been answered at all.
export function treeOf(data, levels = {}, asked = {}) {
  const trees = data.trees.map(t => { const lv = Math.max(0, Math.min(25, levels[t.id] ?? 0)), next = t.skills.find(s => s.n === lv + 1) ?? null, placed = !!asked[t.id] || lv > 0;
    return { id: t.id, name: t.name, level: lv, placed, band: lv ? data.bands[BAND_OF(lv)] : null, next, milestone: placed ? null : t.skills.find(s => s.n === MILESTONES[0]) }; });
  const total = trees.reduce((s, t) => s + t.level, 0), placed = trees.filter(t => t.placed).length;
  const ranked = [...trees].filter(t => t.placed).sort((a, b) => b.level - a.level);
  // one unlock a quarter: the next skill on the main path first, then the lowest placed foundation tree
  const main = trees.find(t => t.id === 'main-path'), behind = [...trees].filter(t => t.placed && t.next && asked[t.id] !== 'skip').sort((a, b) => a.level - b.level); // a tree set aside as "not for me" is never the next unlock
  const unlock = (main?.placed && main.next && main.level < 10 ? main : behind[0]) ?? null;
  return { trees, total, of: data.trees.length * 25, placed, done: placed === trees.length, nextTree: trees.find(t => !t.placed) ?? null, strongest: ranked.slice(0, 3), unlock: unlock ? { tree: unlock.name, treeId: unlock.id, ...unlock.next } : null,
    bands: data.bands.map((b, i) => ({ name: b, count: trees.filter(t => t.level > i * 5).length })) };
}
// One step of placing a tree: the milestone to ask about next, given the answers so far (true = "I have done this").
// answers: [true, true, false] for levels 5, 10, 15. Returns { ask: skill } or { level } when the tree is placed.
export function placeOf(tree, answers = []) {
  for (let i = 0; i < MILESTONES.length; i++) { if (answers[i] === undefined) return { ask: tree.skills.find(s => s.n === MILESTONES[i]), step: i + 1, of: MILESTONES.length }; if (!answers[i]) return { level: i === 0 ? 0 : MILESTONES[i - 1] }; }
  return { level: 25 };
}
