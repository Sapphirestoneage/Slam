// SPDX-License-Identifier: AGPL-3.0-only
// One exercise: Letter from your calm self (Nov 25 2026). A few lines written in a calm month and shown again in a
// hard one (js/recalc.js decides which month is hard). Pure: no DOM.
// Made to be listed on the Exercises screen with no rewrite. An exercise is:
//   a spec    { id, title, minutes, when, prompt, starts, seen }   (CALM_LETTER)
//   a read    exerciseOf(doc, id) -> what was kept, or null
//   a write   keepExercise(store, id, answer, now)
//   a screen  js/ui/exercise-letter-ui.js: calmLetterExercise(ctx) returns the whole exercise as one element
// Every exercise keeps its answer under settings.exercises[id], so the Exercises screen can read them all in one
// place. Private by default: seen is 'Me only', and js/privacy.js takes a Me only answer out of anything shared.
export const ME_ONLY = 'Me only';
export const CALM_LETTER = {
  id: 'calm-letter', title: 'Letter from your calm self', minutes: 3, when: 'In a month that feels steady',
  prompt: 'A harder month will come: a lean paycheck, a repair, a bill you did not see. What do you want to hear from yourself then?',
  starts: ['You have had hard months before and you got through them.', 'One month does not change where you are going.', 'The plan bends. That is what it is for.', 'Do the next small thing, then rest.', 'You are still the person who started this.'],
  seen: ME_ONLY,
};
export const exerciseOf = (doc, id) => doc?.settings?.exercises?.[id] ?? null;
// answer: { text, own } or null to clear. text is the whole letter; own is the part in the person's own words.
export function keepExercise(store, id, answer, now = new Date()) {
  const all = { ...(store.doc.settings?.exercises || {}) };
  if (answer && answer.text) all[id] = { text: answer.text, own: answer.own ?? null, at: now.toISOString(), seen: answer.seen ?? ME_ONLY };
  else delete all[id];
  return store.setDoc('settings', { exercises: all });
}
// The letter from the lines tapped and the person's own words.
export const letterText = (picked, own) => [...CALM_LETTER.starts.filter(s => picked.includes(s)), String(own ?? '').trim()].filter(Boolean).join(' ');
// What goes out in a shared copy: every answer that is not Me only.
export function sharedExercises(all) {
  if (!all) return all;
  return Object.fromEntries(Object.entries(all).filter(([, a]) => (a?.seen ?? ME_ONLY) !== ME_ONLY));
}
