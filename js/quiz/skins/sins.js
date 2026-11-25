// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the money sins. A PLACEHOLDER. The run "Money sins system and the Rings theme" builds the real quiz here, on
// the one quiz engine (js/math/quizcore.js), with its own rules. `soon: true` keeps it in the list as "Coming soon",
// with no questions and no card.
// What the engine already gives that quiz (docs/QUIZ-ENGINE.md, "For the sins quiz"):
//   the top TWO of a result (topTwo, and byGroup for two families of traits), never one hard label;
//   a confidence level in the words Early read / Close read / Confirmed by you (def.confidence sets the bar);
//   scores from outside as an input of qzResult(def, answers, outside), with no side effect.
export const SINS = {
  id: 'sins', name: 'The money sins', blurb: 'Your main pull, and its light side.', soon: true,
  note: 'A game lens, not a test and not a diagnosis.',
  traits: [], questions: [], cards: {},
  core: { sheet: 'Main pull', how: 'Not set yet. The sins quiz says how it maps when it is built.' },
};
