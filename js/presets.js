// SPDX-License-Identifier: AGPL-3.0-only
// The usual list: about 40 spending lines everyone might have. Batch 10: each holds its typical amount apart
// (values.typical), shown faded, and counts nowhere until the client uses it (Use) or types the real number.
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
      store.add('bill', { name: l.name, amount: null, per: 'month', source: 'Usual list',
        values: { category: l.category, draftt: l.draftt, amountType: l.amount, timing: l.timing, preset: true, typical: l.guess, level: l.level ?? 2 } });
    }
    store.setDoc('settings', { presetsAdded: true });
  });
  return missing.length;
}

// Batch 8 (A): one row per category on the Budget. The rows are records (kind spending, type the category key) so
// they carry a status, Will get it, the row menu and the bulk bar like any row. Made the first time the Budget opens.
import { CATEGORIES, categoryName, isCategoryRecord, isFaded, typicalOf, BILLS_CATEGORIES } from './math/spending.js';
export function ensureCategories(store) {
  const have = new Set(store.find(isCategoryRecord).map(r => r.type));
  const missing = CATEGORIES.filter(k => !have.has(k));
  if (!missing.length) return 0;
  store.transaction('Budget categories', () => { for (const k of missing) store.add('spending', { name: categoryName(k), per: 'month', values: {} }, { type: k }); });
  return missing.length;
}

// Batch 10: Use a faded typical amount. It becomes the line's amount, marked Roughly (so it shows in Defaults in use
// and comes up to be confirmed later), with usedTypical so the list can say where it came from.
export function useTypical(store, ids) {
  const list = [ids].flat().map(id => store.get(id)).filter(r => r && isFaded(r));
  if (!list.length) return 0;
  store.transaction('Use the typical amount', () => { for (const r of list) store.update(r.id, { amount: typicalOf(r), status: 'Roughly', usedTypical: true }); });
  return list.length;
}

// Batch 10, run once per file when it opens (doc.settings.migrated10). Starter lines nobody changed (the starter
// guess, still Not sure, the amount never typed over: one amount entry in the history, from the add) become faded
// typicals; every line edited or typed keeps its amount exactly. Lines in Bills and subscriptions move to that group
// (Phone out of Accommodation, the subscriptions out of Other). Starter lines get their level from Reference data.
// Returns how many lines turned faded (the Budget shows a one-time note when it is more than none).
export function migrateBatch10(doc, ref) {
  if (!doc || doc.settings?.migrated10) return 0;
  const presets = new Map((ref?.spendingPresets?.lines ?? []).map(l => [String(l.name).toLowerCase(), l]));
  const bills = new Set(BILLS_CATEGORIES);
  const amountSets = new Map();
  for (const e of doc.history || []) if (e.op === 'set' && e.field === 'amount' && e.id) amountSets.set(e.id, (amountSets.get(e.id) ?? 0) + 1);
  let faded = 0;
  for (const r of doc.records || []) {
    if (r.kind !== 'bill') continue;
    r.values ??= {};
    const p = presets.get(String(r.name ?? '').toLowerCase());
    if (p && r.values.level == null && p.level !== 2) r.values.level = p.level; // a line named like a starter line takes its level (a typed Rent is the big one)
    if (bills.has(r.values.category) && (r.values.draftt === 'Accommodation' || r.values.draftt === 'Other' || r.values.draftt == null)) r.values.draftt = 'Bills';
    const untouched = r.values.preset && r.status === 'Not sure' && r.source === 'Usual list' && r.amount != null && !r.values.typical
      && (amountSets.get(r.id) ?? 0) <= 1 && (!p || Number(p.guess) === Number(r.amount));
    if (untouched) { r.values.typical = r.amount; r.amount = null; r.status = null; faded += 1; }
  }
  doc.settings ??= {};
  doc.settings.migrated10 = true;
  if (faded) doc.settings.fadedNote = faded;
  return faded;
}
