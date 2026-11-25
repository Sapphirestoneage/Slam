// SPDX-License-Identifier: AGPL-3.0-only
// What the web app keeps for the quiz skins, and what leaves the device. Pure: no DOM.
// Kept under settings.start.lenses[skin id] = { ans, go, at, seen, ok, kept }, next to the Money Chart's own answers
// (settings.start.quiz). A result is private by default: seen is 'Me only', and js/privacy.js takes a Me only result
// out of every shared copy (the same rule as the letter from your calm self). settings.start.element is the element
// the person chose by a tap on a result card; with none, the element is the top of the Money Chart.
import { ME_ONLY } from '../exercises/calm-letter.js';
import { qzResult, qzCard, qzFeed, qzTaps } from '../math/quizcore.js';

export const SHOWN = 'Everyone';
export const lensOf = (start, id) => start?.lenses?.[id] || { ans: {} };
// The patch for api.remember: one skin's state with some keys changed.
export const lensPatch = (start, id, patch) => ({ lenses: { ...(start?.lenses || {}), [id]: { ...lensOf(start, id), ...patch } } });
// What goes out in a shared copy: every result the person chose to show.
export function sharedLenses(all) {
  if (!all) return all;
  return Object.fromEntries(Object.entries(all).filter(([, s]) => (s?.seen ?? ME_ONLY) !== ME_ONLY));
}
// The element the person has now: their own tap first, else the top of the Money Chart (a name like 'Fire'), else none.
export const elementNow = (start, chartTop = null) => start?.element ?? chartTop ?? null;
// All a screen shows for one skin. The card shows when every question is answered.
export function lensNow(def, st, current = null) {
  const R = qzResult(def, st?.ans || {}, null, { confirmed: !!st?.ok }), card = R.done ? qzCard(def, R) : null;
  return { def, st: st || { ans: {} }, R, card, feed: card ? qzFeed(def, R, current) : null, taps: qzTaps(def), mineOnly: (st?.seen ?? ME_ONLY) === ME_ONLY };
}
