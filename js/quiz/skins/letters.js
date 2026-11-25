// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the Money Letters (the "four-letter money code" lens). The words are Eli's own (js/registry/identity.js: the
// axes, the 12 statements, the 16 names); this file only puts them in the shape of the one quiz engine
// (js/math/quizcore.js). The letters on Coach tools > Discovery are scored by this same definition (js/math/identity.js).
//
// HOW IT MAPS TO THE FIVE ELEMENTS (each letter of the code counts one time):
//   E Earner    -> Fire 1      K Keeper   -> Earth 1.5
//   P Paper     -> Air 2       O Operator -> Water 2
//   G Guardian  -> Earth 1.5   V Venturer -> Fire 1
//   X Exiter    -> Fire 1      S Savorer  -> Spirit 2
// Fire can come from three letters and Earth from two, so each of those counts less. Two elements level: no lean.
// ON THE CHARACTER SHEET: one line, "Money letters", with the code and its name.
import { AXES, STATEMENTS, ANSWERS, TYPES, TREES } from '../../registry/identity.js';

const treeName = id => TREES.find(t => t[0] === id)[1];
const pole = id => AXES.flatMap(a => a.poles).find(p => p.id === id);
// A level axis leans the way js/math/identity.js always leaned with nothing else to go on.
const TIE = { ek: 'K', po: 'P', gv: 'G', xs: 'S' };

export const LETTERS = {
  id: 'letters', name: 'Money Letters', blurb: 'Twelve taps. A four-letter money code of your own.',
  note: 'A game lens, not a test and not a diagnosis. The letters only change which skills lead.',
  intro: ['Twelve short statements. Tap Agree, Neutral or Disagree.', 'You end on four letters: how you earn or keep, plan or do, guard or venture, and what the money is for.'],
  scoring: 'sum', scale: ANSWERS,
  traits: AXES.flatMap(a => a.poles.map(p => ({ id: p.id, name: p.word, group: a.id }))),
  questions: STATEMENTS.map(s => ({ id: s.id, text: s.text, axis: s.axis, toward: s.toward, away: AXES.find(a => a.id === s.axis).poles.find(p => p.id !== s.toward).id })),
  result: { by: 'axes', axes: AXES.map(a => ({ id: a.id, name: a.name, poles: a.poles.map(p => p.id), tie: TIE[a.id], min: 2 })) },
  cards: Object.fromEntries(Object.entries(TYPES).map(([code, t]) => [code, {
    title: `${code}: ${t.name}`,
    lines: [`${[...code].map(l => pole(l).word).join(', ')}: ${[...code].map(l => pole(l).means).join(', ')}.`, `What it can cost: ${t.shadow}`],
    light: t.superpower, next: { label: `Open the ${treeName(t.trees[0])} skills`, tree: t.trees[0] }, trees: t.trees,
  }])),
  core: {
    elements: { E: { Fire: 1 }, K: { Earth: 1.5 }, P: { Air: 2 }, O: { Water: 2 }, G: { Earth: 1.5 }, V: { Fire: 1 }, X: { Fire: 1 }, S: { Spirit: 2 } },
    sheet: 'Money letters', how: 'Each letter of the code leans to one element: Earner, Venturer and Exiter to Fire, Keeper and Guardian to Earth, Paper to Air, Operator to Water, Savorer to Spirit.',
  },
};
