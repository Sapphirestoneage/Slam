// SPDX-License-Identifier: AGPL-3.0-only
// Skin: Quantum collapse, for the game (where: 'game'; the web app asks it on its own first screen, js/solo/first.js).
// The questions, their order, the rules and the first moves are js/collapse.js itself (COLLAPSE_QUIZ and MOVES): this
// file adds only what a skin needs on top, the card words and the routes. The meter of the game's sheet is the
// engine's qzPaths (the same numbers collapseOf shows on the web app).
// `measured` is the order of the five numbers that narrow an FI date the most, measured by tools/collapse/measure.mjs
// (docs/COLLAPSE.md, Nov 15 2026) and used by js/journey.js QUESTIONS. test/quizcore.test.js holds this list to that order.
//
// HOW IT MAPS: to no element (a first move is not a temperament). ON THE CHARACTER SHEET: one line, "First move".
import { COLLAPSE_QUIZ, MOVES } from '../../collapse.js';

const card = (id, more, light, next, skills = [], readings = []) => ({ title: MOVES[id].title, lines: [MOVES[id].why, more], light, next, skills, readings });
export const COLLAPSE_SKIN = {
  ...JSON.parse(JSON.stringify(COLLAPSE_QUIZ)), where: 'game',
  name: 'Quantum Collapse', blurb: 'Two to five taps. Each one cuts the plans that are still possible, until one first move is left.',
  note: 'A game lens, not a test and not a forecast. Every question here changes the path; nothing is asked only for context.',
  intro: ['The fewest questions, each one path-changing. Watch the plans still possible shrink with every tap.', 'It ends on the one first move that matters most for you now.'],
  cards: {
    stabilize: card('stabilize', 'One call to the biggest bill, today, is a real step.', 'You are looking at it, and that is where every turn starts.', { label: 'Build the first small shield', skill: 'cash-safety-net-build-the-1k-shield' }, ['deals-smart-buying-renegotiate-the-bills-yearly'], ['save-a-thousand-first']),
    bridge: card('bridge', 'Every month the money covers is a month to find the next thing.', 'A bridge with a known length is calmer than one without.', { label: 'Get one month ahead', skill: 'cash-safety-net-get-one-month-ahead' }, ['income-career-change-jobs-strategically'], ['six-months-first']),
    debt: card('debt', 'Each payment that clears a card is a return nothing else beats.', 'A date for the last payment turns a weight into a countdown.', { label: 'Build the first small shield, then go after the card', skill: 'cash-safety-net-build-the-1k-shield' }, ['deals-smart-buying-renegotiate-the-bills-yearly'], ['no-investing-until-debt-free']),
    cushion: card('cushion', 'Automating a small transfer each payday builds it without a decision.', 'A cushion turns the next surprise into an errand.', { label: 'Build the first small shield', skill: 'cash-safety-net-build-the-1k-shield' }, ['cash-safety-net-move-to-high-yield'], ['one-thousand-is-enough']),
    match: card('match', 'One form at work, once, and it keeps paying every payday.', 'Free money from work is the easiest win there is.', { label: 'Capture the full 401(k) match', skill: 'main-path-capture-the-full-401-k-match' }, ['main-path-automate-payday-contributions'], ['max-the-401k-first']),
    finish: card('finish', 'The next numbers to give are the five below, in the order that narrows the date fastest.', 'The basics are working, so the rest is steering.', { label: 'Work out your real number', skill: 'withdrawal-decumulation-compute-your-real-number' }, ['main-path-automate-payday-contributions'], ['stay-until-the-number']),
  },
  measured: [
    { key: 'spending', label: 'What you spend in a month' }, { key: 'income', label: 'What lands in your account each month' },
    { key: 'card', label: 'What you owe' }, { key: 'cash', label: 'Cash in checking and savings' }, { key: 'invested', label: 'What you have invested' },
  ],
  core: { sheet: 'First move', how: 'A first move leans on no element: it is where to start, not a temperament. It shows as a line on the character sheet.' },
};
