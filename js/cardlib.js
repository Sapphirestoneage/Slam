// SPDX-License-Identifier: AGPL-3.0-only
// Batch 30: the card library (data/library/cards.json), loaded once on first use and kept for the session. The math
// (js/math/cards.js) takes the cards as an argument; this file is the one place that fetches them.
let LIB = null, loading = null;
export const cardLibrary = () => LIB;
export const setCardLibrary = lib => { LIB = lib; return LIB; }; // tests and the sheet in Node
export function loadCardLibrary(onReady) {
  if (LIB) return Promise.resolve(LIB);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  loading ??= fetch('data/library/cards.json').then(r => r.json()).then(setCardLibrary).catch(() => { loading = null; return null; });
  return loading.then(lib => { if (lib) onReady?.(lib); return lib; });
}
// A held card's library entry, read from the debt row (values.cardId).
export const libraryCardOf = r => (LIB && r?.values?.cardId ? LIB.cards.find(c => c.id === r.values.cardId) ?? null : null);
