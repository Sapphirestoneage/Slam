// SPDX-License-Identifier: AGPL-3.0-only
// The usual list: about 40 spending lines everyone might have, each starting at a high Guess.
// You eliminate (Not for me or Delete) and bring numbers down, instead of adding from nothing.
const norm = s => String(s ?? '').trim().toLowerCase();

export function addPresets(store, ref) {
  const lines = ref.spendingPresets?.lines ?? [];
  const bills = store.find(r => r.kind === 'bill');
  const taken = new Set(bills.flatMap(b => [norm(b.name), norm(b.values.category)]));
  // An older combined line (Internet, phone) already covers both halves.
  if (taken.has('internet, phone')) { taken.add('internet'); taken.add('phone'); }
  const missing = lines.filter(l => !taken.has(norm(l.name)) && !taken.has(norm(l.category)));
  store.transaction('Add the usual list', () => {
    for (const l of missing) {
      store.add('bill', { name: l.name, amount: l.guess, per: 'month', status: 'Not sure', source: 'Usual list',
        values: { category: l.category, draftt: l.draftt, amountType: l.amount, timing: l.timing, preset: true } });
    }
    store.setDoc('settings', { presetsAdded: true });
  });
  return missing.length;
}

// Batch 8 (A): one row per category on the Budget. The rows are records (kind spending, type the category key) so
// they carry a status, Will get it, the row menu and the bulk bar like any row. Made the first time the Budget opens.
import { CATEGORIES, categoryName, isCategoryRecord } from './math/spending.js';
export function ensureCategories(store) {
  const have = new Set(store.find(isCategoryRecord).map(r => r.type));
  const missing = CATEGORIES.filter(k => !have.has(k));
  if (!missing.length) return 0;
  store.transaction('Budget categories', () => { for (const k of missing) store.add('spending', { name: categoryName(k), per: 'month', values: {} }, { type: k }); });
  return missing.length;
}
