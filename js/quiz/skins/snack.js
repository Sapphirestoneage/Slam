// SPDX-License-Identifier: AGPL-3.0-only
// Skin: Build a Snack Plate (the playful "pick things, get a result" style). Seven picture taps that have nothing to
// do with money, then one fun result that does. All names and words are SLAM's own, written for this quiz.
// The questions use the question style 'cards' (a grid of picture tiles; js/quiz/page.js, game/features/quizzes.js).
//
// HOW IT MAPS TO THE FIVE ELEMENTS (each point counts as below; the highest total is the lean):
//   The Slow Cooker      (steady, patient)      -> Earth 1
//   The Hot Sauce        (bold, fast)           -> Fire 1
//   The Bento Box        (sorted, exact)        -> Air 1
//   The Big Pot of Soup  (shared, warm)         -> Spirit 0.6, Water 0.4
// ON THE CHARACTER SHEET: one line, "Money snack", with the snack.
const o = (id, icon, label, t) => ({ id, icon, label, add: { [t]: 2 } });
const q = (id, ask, a, b, c, d) => ({ id, ask, style: 'cards', options: [o('a', a[0], a[1], 'steady'), o('b', b[0], b[1], 'spark'), o('c', c[0], c[1], 'sorted'), o('d', d[0], d[1], 'shared')] });
export const SNACK = {
  id: 'snack', name: 'Build a Snack Plate', blurb: 'Seven picture taps. We guess your money superpower from your snacks.', playful: true,
  note: 'Playful: for fun. A game lens, not a test. Your snacks say nothing real about you, and your result is still worth a smile.',
  intro: ['Just for fun: seven quick picks, none of them about money.', 'At the end, the snack plate you built names your money superpower.'],
  scoring: 'sum',
  traits: [{ id: 'steady', name: 'The Slow Cooker' }, { id: 'spark', name: 'The Hot Sauce' }, { id: 'sorted', name: 'The Bento Box' }, { id: 'shared', name: 'The Big Pot of Soup' }],
  questions: [
    q('s1', 'Pick a snack.', ['🥜', 'Trail mix'], ['🌶️', 'Spicy chips'], ['🍱', 'A neat little bento'], ['🍕', 'A pizza for the table']),
    q('s2', 'Pick a seat.', ['🛋️', 'The comfy couch'], ['🎢', 'The front car of a ride'], ['📚', 'A quiet library corner'], ['🏕️', 'A spot by the campfire']),
    q('s3', 'Pick a Saturday.', ['🧺', 'Laundry, soup, early night'], ['✈️', 'A last-minute trip'], ['🗂️', 'Sorting a closet, finally'], ['🎉', 'A party at my place']),
    q('s4', 'Pick a pet.', ['🐢', 'A turtle'], ['🐆', 'A cheetah'], ['🦉', 'An owl'], ['🐕', 'A big friendly dog']),
    q('s5', 'Pick a drink.', ['🍵', 'A pot of tea'], ['⚡', 'Something fizzy and loud'], ['💧', 'Water, exactly two liters'], ['🧃', 'A pitcher to share']),
    q('s6', 'Pick a song.', ['🎻', 'Slow and steady'], ['🥁', 'Fast and loud'], ['🎹', 'Something with a clever pattern'], ['🎤', 'One everybody sings along to']),
    q('s7', 'Pick a superpower.', ['🛡️', 'A force field'], ['🚀', 'Super speed'], ['🔭', 'Seeing what comes next'], ['🤝', 'Making anyone feel at home']),
  ],
  cards: {
    steady: { title: 'You are The Slow Cooker', lines: ['You set it, leave it, and it turns out great.', 'Your money gets better with time, like a good stew.'],
      light: 'Patience is one of the strongest money tools there is, and you have plenty.', next: { label: 'Set up a payday transfer and let it simmer', skill: 'main-path-automate-payday-contributions' },
      skills: ['cash-safety-net-move-to-high-yield'], readings: ['save-a-thousand-first'] },
    spark: { title: 'You are The Hot Sauce', lines: ['You bring the heat and you move fast.', 'Big ideas, quick starts, never boring.'],
      light: 'You start the things other people only talk about.', next: { label: 'Wait 24 hours before a big buy', skill: 'deals-smart-buying-wait-24-hours' },
      skills: ['side-hustles-earn-a-first-outside-dollar'], readings: ['invest-every-spare-dollar'] },
    sorted: { title: 'You are The Bento Box', lines: ['Everything in its own little box.', 'You like knowing exactly where it all goes.'],
      light: 'Your system catches what other people miss.', next: { label: 'Write your allocation on one page', skill: 'portfolio-design-write-your-allocation' },
      skills: ['money-psychology-fast-from-optimizing-for-30-days'], readings: ['max-the-401k-first'] },
    shared: { title: 'You are The Big Pot of Soup', lines: ['There is always room for one more at your table.', 'Money, to you, is for sharing.'],
      light: 'People feel at home around you.', next: { label: 'Give on purpose, with a plan', skill: 'social-capital-give-first-systematically' },
      skills: ['family-generational-wealth-hold-the-money-date'], readings: ['give-when-rich'] },
  },
  core: {
    elements: { steady: { Earth: 1 }, spark: { Fire: 1 }, sorted: { Air: 1 }, shared: { Spirit: 0.6, Water: 0.4 } },
    sheet: 'Money snack', how: 'The Slow Cooker leans to Earth, The Hot Sauce to Fire, The Bento Box to Air, and The Big Pot of Soup mostly to Spirit with some Water.',
  },
};
