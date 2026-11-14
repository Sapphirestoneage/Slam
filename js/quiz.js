// SPDX-License-Identifier: AGPL-3.0-only
// The money personality quick ten (Eli's five-element model: Water, Earth, Air, Fire, Spirit). Elements are muscles built
// by life, not fixed types: the result is where you sit on each scale, never a label you are stuck with. Pure, no DOM.
// The ten statements here are a first draft written for the self-serve app; Eli's own question bank replaces them.
export const ELEMENTS = [
  { id: 'water', name: 'Water', word: 'Feeling', strong: 'You notice how money feels, for you and for the people around you.', thin: 'Money decisions can run on numbers alone and skip how they will feel to live with.', mirror: 'enjoy', tool: ['tune', 'values', 'What you love spending on'] },
  { id: 'earth', name: 'Earth', word: 'Security', strong: 'You build cushions and sleep better for them.', thin: 'A surprise bill lands harder than it has to.', mirror: 'safe', tool: ['drills', null, 'Practice a hard month'] },
  { id: 'air', name: 'Air', word: 'Analysis', strong: 'You like to see the numbers and compare the options.', thin: 'Choices get made without the numbers on the table.', mirror: 'date', tool: ['all', null, 'All your numbers'] },
  { id: 'fire', name: 'Fire', word: 'Drive', strong: 'You set a target and move on it.', thin: 'Plans stay plans a little too long.', mirror: 'guide', tool: ['plan', null, 'Your next step'] },
  { id: 'spirit', name: 'Spirit', word: 'Purpose', strong: 'You know what the money is for.', thin: 'The money grows without a clear answer to "for what?"', mirror: 'enjoy', tool: ['design', null, 'Design my life'] },
];
// Two statements an element: one about what you do, one about how it feels. 1 = not me at all, 5 = that is me.
export const ITEMS = [
  { id: 'w1', el: 'water', text: 'After a big purchase, I check in on how I feel about it.' },
  { id: 'w2', el: 'water', text: 'I can tell when someone close to me is stressed about money before they say so.' },
  { id: 'e1', el: 'earth', text: 'I keep money set aside that I do not touch.' },
  { id: 'e2', el: 'earth', text: 'I know roughly how many months I could go without a paycheck.' },
  { id: 'a1', el: 'air', text: 'Before a big money choice, I run the numbers.' },
  { id: 'a2', el: 'air', text: 'I know what I spent last month, within about a hundred dollars.' },
  { id: 'f1', el: 'fire', text: 'When I decide on a money goal, I start that same week.' },
  { id: 'f2', el: 'fire', text: 'I have asked for a raise, or raised my prices, in the last two years.' },
  { id: 's1', el: 'spirit', text: 'I could tell you in one sentence what my money is for.' },
  { id: 's2', el: 'spirit', text: 'I have changed how I spend because of what matters most to me.' },
];
export const SCALE = [[1, 'Not me'], [2, 'Rarely'], [3, 'Sometimes'], [4, 'Often'], [5, 'That is me']];

// answers: { itemId: 1..5 }. Each element scores 0 to 100 from its answered statements; unanswered ones are left out.
export function quizOf(answers = {}) {
  const scores = ELEMENTS.map(e => { const got = ITEMS.filter(i => i.el === e.id && answers[i.id] >= 1 && answers[i.id] <= 5).map(i => answers[i.id]); return { ...e, answered: got.length, score: got.length ? Math.round((got.reduce((s, v) => s + v, 0) / got.length - 1) / 4 * 100) : null }; });
  const done = ITEMS.filter(i => answers[i.id] >= 1 && answers[i.id] <= 5).length, ready = scores.every(s => s.answered > 0);
  if (!ready) return { ready: false, done, of: ITEMS.length, next: ITEMS.find(i => !(answers[i.id] >= 1))?.id ?? null, scores };
  const ranked = [...scores].sort((a, b) => b.score - a.score), top = ranked[0], low = ranked.at(-1), even = top.score - low.score < 15;
  return { ready: true, done, of: ITEMS.length, next: ITEMS.find(i => !(answers[i.id] >= 1))?.id ?? null, scores, top, low, even,
    // what the plan shows first follows the strongest muscle; the thinnest one names a place to practice
    mirror: top.mirror, practice: even ? null : { element: low.name, why: low.thin, stage: low.tool[0], flash: low.tool[1], label: low.tool[2] },
    words: even ? 'Your five are close to even: no one muscle is carrying the rest.' : `${top.name} (${top.word.toLowerCase()}) is your strongest muscle right now, and ${low.name} (${low.word.toLowerCase()}) has had the least practice.` };
}
// Two people side by side: where they match and where they differ most. Differences are not problems: they are cover.
export function pairOf(a, b) {
  const A = quizOf(a), B = quizOf(b); if (!A.ready || !B.ready) return null;
  const rows = ELEMENTS.map(e => { const x = A.scores.find(s => s.id === e.id).score, y = B.scores.find(s => s.id === e.id).score; return { id: e.id, name: e.name, word: e.word, mine: x, theirs: y, gap: Math.abs(x - y) }; });
  const widest = [...rows].sort((p, q) => q.gap - p.gap)[0], closest = [...rows].sort((p, q) => p.gap - q.gap)[0];
  return { rows, widest, closest, covered: rows.filter(r => Math.max(r.mine, r.theirs) >= 60).map(r => r.name), open: rows.filter(r => Math.max(r.mine, r.theirs) < 40).map(r => r.name) };
}
