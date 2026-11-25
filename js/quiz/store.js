// SPDX-License-Identifier: AGPL-3.0-only
// What the web app keeps for the quiz skins, and what leaves the device. Pure: no DOM.
// Kept under settings.start.lenses[skin id] = { ans, go, at, seen, ok, kept }, next to the Money Chart's own answers
// (settings.start.quiz). A result is private by default: seen is 'Me only', and js/privacy.js takes a Me only result
// out of every shared copy (the same rule as the letter from your calm self). settings.start.element is the element
// the person chose by a tap on a result card; with none, the element is the top of the Money Chart.
import { ME_ONLY } from '../exercises/calm-letter.js';
import { qzResult, qzCard, qzFeed, qzTaps, QZ_LEVELS } from '../math/quizcore.js';
import { snRead, snShared } from '../math/sins.js';
import { sinsDataOf } from './sinsdata.js';

export const SHOWN = 'Everyone';
export const lensOf = (start, id) => start?.lenses?.[id] || { ans: {} };
// The patch for api.remember: one skin's state with some keys changed.
export const lensPatch = (start, id, patch) => ({ lenses: { ...(start?.lenses || {}), [id]: { ...lensOf(start, id), ...patch } } });
// What goes out in a shared copy: every result the person chose to show.
// The money sins read is stricter (snShared): it goes only when its own "show" is on, and then without the check-ins,
// the push-backs and the defenses.
export function sharedLenses(all) {
  if (!all) return all;
  return Object.fromEntries(Object.entries(all).filter(([id, s]) => (id === 'sins' ? !!snShared(s) : (s?.seen ?? ME_ONLY) !== ME_ONLY)).map(([id, s]) => [id, id === 'sins' ? snShared(s) : s]));
}
// The money sins read in any view that is not the person's own (the coach's screens, a partner's view): the read is
// left out unless the person turned "Show my read" on. Returns the same object when nothing changes.
export function lensesForOthers(start) {
  const L = start?.lenses;
  if (!L?.sins || L.sins.sn?.show) return start;
  const { sins, ...rest } = L;
  return { ...start, lenses: rest };
}
// The read of the money sins for this household (js/math/sins.js on the one engine). today: 'YYYY-MM-DD'.
export const sinsReadNow = (def, start, doc, today) => snRead({ qzResult, QZ_LEVELS }, def, lensOf(start, def.id), sinsDataOf(doc), today);
// The element the person has now: their own tap first, else the top of the Money Chart (a name like 'Fire'), else none.
export const elementNow = (start, chartTop = null) => start?.element ?? chartTop ?? null;
// All a screen shows for one skin. The card shows when every question is answered.
export function lensNow(def, st, current = null) {
  const R = qzResult(def, st?.ans || {}, null, { confirmed: !!st?.ok }), card = R.done ? qzCard(def, R) : null;
  return { def, st: st || { ans: {} }, R, card, feed: card ? qzFeed(def, R, current) : null, taps: qzTaps(def), mineOnly: (st?.seen ?? ME_ONLY) === ME_ONLY };
}
