// SPDX-License-Identifier: AGPL-3.0-only
// Batch 31: typical at your age (data/priors-2026.json), loaded once on first use and kept for the session. The math
// (js/math/priors.js) takes the data as an argument; this file is the one place that fetches it (like js/cardlib.js).
let DATA = null, loading = null;
export const priorsData = () => DATA;
export const setPriorsData = d => { DATA = d; return DATA; }; // tests and the sheet in Node
export function loadPriors(onReady) {
  if (DATA) return Promise.resolve(DATA);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  loading ??= fetch('data/priors-2026.json').then(r => r.json()).then(setPriorsData).catch(() => { loading = null; return null; });
  return loading.then(d => { if (d) onReady?.(d); return d; });
}
