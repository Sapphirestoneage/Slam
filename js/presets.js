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
        values: { category: l.category, draftt: l.draftt, amountType: l.amount, timing: l.timing, whoPays: 'Me', preset: true } });
    }
    store.setDoc('settings', { presetsAdded: true });
  });
  return missing.length;
}
