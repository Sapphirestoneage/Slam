// SPDX-License-Identifier: AGPL-3.0-only
// What the web app keeps for the quiz skins, and what leaves the device. Pure: no DOM.
// Kept under settings.start.lenses[skin id] = { ans, go, at, seen, ok, kept }, next to the Money Chart's own answers
// (settings.start.quiz). A result is private by default: seen is 'Me only', and js/privacy.js takes a Me only result
// out of every shared copy (the same rule as the letter from your calm self). settings.start.element is the element
// the person chose by a tap on a result card; with none, the element is the top of the Money Chart.
import { ME_ONLY } from '../exercises/calm-letter.js';
import { qzResult, qzCard, qzFeed, qzTaps, qzBars, qzSpectrums, QZ_LEVELS } from '../math/quizcore.js';
import { snRead, snShared } from '../math/sins.js';
import { sinsDataOf } from './sinsdata.js';

export const SHOWN = 'Everyone';
export const lensOf = (start, id) => start?.lenses?.[id] || { ans: {} };
// The patch for api.remember: one skin's state with some keys changed.
export const lensPatch = (start, id, patch) => ({ lenses: { ...(start?.lenses || {}), [id]: { ...lensOf(start, id), ...patch } } });
// What goes out in a shared copy: every result the person chose to show.
// The money sins read is stricter (snShared): it goes only when its own "show" is on, and then without the check-ins,
// the push-backs and the defenses.
// Part 2 (couples): in a household of two, each adult has a read of their own. The client's is kept under 'sins' (as
// in Part 1), the partner's under 'sinsPartner' (new; a file without it reads as before). SN_KEYS: every key of a read.
export const SN_KEYS = { Me: 'sins', Partner: 'sinsPartner' };
const isRead = id => Object.values(SN_KEYS).includes(id);
export const sinsKeyOf = person => (person === 'Partner' ? SN_KEYS.Partner : SN_KEYS.Me);
export function sharedLenses(all) {
  if (!all) return all;
  return Object.fromEntries(Object.entries(all).filter(([id, s]) => (isRead(id) ? !!snShared(s) : (s?.seen ?? ME_ONLY) !== ME_ONLY)).map(([id, s]) => [id, isRead(id) ? snShared(s) : s]));
}
// The money sins reads in any view that is not the person's own (the coach's screens, a partner's view): a read is
// left out unless its person turned "Show my read" on. own: the key of the read of the person looking (their own read
// stays), or null. Returns the same object when nothing changes. Sharing with a partner (sn.mate) is not "show": the
// couple part only reads the two names, and only on the quiz page of the household, when both turned it on.
export function lensesForOthers(start, own = null) {
  const L = start?.lenses;
  if (!L) return start;
  const drop = Object.keys(SN_KEYS).map(k => SN_KEYS[k]).filter(id => id !== own && L[id] && !L[id].sn?.show);
  if (!drop.length) return start;
  const rest = { ...L };
  for (const id of drop) delete rest[id];
  return { ...start, lenses: rest };
}
// The read of the money sins for this household (js/math/sins.js on the one engine). today: 'YYYY-MM-DD'. key: whose
// read ('sins' for the client, 'sinsPartner' for a partner).
// The read of one kept state (a state not saved yet, such as the answers of the last tap).
export const sinsReadOf = (def, st, doc, today) => snRead({ qzResult, QZ_LEVELS }, def, st || { ans: {} }, sinsDataOf(doc), today);
export const sinsReadNow = (def, start, doc, today, key = 'sins') => snRead({ qzResult, QZ_LEVELS }, def, lensOf(start, key), sinsDataOf(doc), today);
// The element the person has now: their own tap first, else the top of the Money Chart (a name like 'Fire'), else none.
export const elementNow = (start, chartTop = null) => start?.element ?? chartTop ?? null;
// All a screen shows for one skin. The card shows when every question is answered.
export function lensNow(def, st, current = null) {
  const R = qzResult(def, st?.ans || {}, null, { confirmed: !!st?.ok }), card = R.done ? qzCard(def, R) : null;
  // bars: a percent for each trait (of one group, when def.bars names it), highest first; spectrums: where the person
  // sits on each preference spectrum. Both only on a skin that asks for them, and only with the card.
  const ans = st?.ans || {}, bars = card && def.bars ? qzBars(def, ans, def.bars === true ? null : def.bars).sort((a, b) => b.pct - a.pct) : null;
  return { def, st: st || { ans: {} }, R, card, feed: card ? qzFeed(def, R, current) : null, taps: qzTaps(def), mineOnly: (st?.seen ?? ME_ONLY) === ME_ONLY,
    bars, spectrums: card && def.spectrums ? qzSpectrums(def, ans) : null };
}
