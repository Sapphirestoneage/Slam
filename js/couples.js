// SPDX-License-Identifier: AGPL-3.0-only
// The household mode on the file (overnight F2). One place sets it, from About you or a test: the mode, Solo or
// couple (for every older reader of profile.household and client.couple), and the default person view. Nothing
// else changes: every row and every Owner tag stays, so switching Dating to Engaged to Married merged loses nothing.
import { MODES } from './registry/couples.js';

export function setHouseholdMode(store, mode) {
  if (mode != null && !MODES[mode]) throw new Error(`Unknown household mode ${mode}`);
  store.transaction('Household mode', () => {
    store.setDoc('profile', { mode, household: mode == null ? null : MODES[mode].couple ? 'Couple' : 'Solo' });
    store.setDoc('client', { couple: mode != null && MODES[mode].couple });
    store.setDoc('settings', { person: mode == null ? undefined : MODES[mode].view });
  });
}

// ---------- Batch 49: households of any size (About you › People) ----------
// More adults (P3 to P7) and dependents (D1 ...) live in profile.people. Adding a dependent the first time brings the
// Dependents count already typed into the list (Child 1, Child 2 with their ages), so nothing typed is lost; after
// that the count and the kids' ages follow the list, for every older reader (the benefits lines, the scorecard).
import { EXTRA_IDS, MAX_ADULTS, adultsOf, dependentsOf, personLabels } from './registry/couples.js';

const peopleOf = doc => (Array.isArray(doc.profile.people) ? doc.profile.people.map(x => ({ ...x })) : []);
const syncKids = list => {
  const deps = list.filter(x => x.kind === 'Dependent');
  return { people: list, dependents: deps.length, kidAges: deps.filter(x => (x.role ?? 'Child') === 'Child').map(x => (x.age == null ? null : x.age)) };
};
export function addPerson(store, kind = 'Adult') {
  const doc = store.doc;
  let list = peopleOf(doc);
  if (kind === 'Adult') {
    if (adultsOf(doc).length >= MAX_ADULTS) return null;
    const id = EXTRA_IDS.find(x => !list.some(y => y.id === x));
    if (!id) return null;
    list.push({ id, kind: 'Adult', name: null, role: null });
    store.setDoc('profile', { people: list });
    return id;
  }
  if (!dependentsOf(doc).length && (Number(doc.profile.dependents) || 0) > 0) { // the count typed before the list
    const ages = Array.isArray(doc.profile.kidAges) ? doc.profile.kidAges : [];
    for (let i = 0; i < Number(doc.profile.dependents); i++) list.push({ id: `D${i + 1}`, kind: 'Dependent', name: null, role: 'Child', age: ages[i] ?? null });
  }
  let n = 1; while (list.some(y => y.id === `D${n}`)) n++;
  const id = `D${n}`;
  list.push({ id, kind: 'Dependent', name: null, role: null, age: null });
  store.setDoc('profile', syncKids(list));
  return id;
}
export function setPerson(store, id, patch) {
  const list = peopleOf(store.doc).map(x => (x.id === id ? { ...x, ...patch } : x));
  store.setDoc('profile', list.some(x => x.kind === 'Dependent') || dependentsOf(store.doc).length ? syncKids(list) : { people: list });
}
// Taking an adult out of the plan: their rows become this client's (Undo puts them back), and a view on them goes back to this client.
export function removePerson(store, id) {
  const doc = store.doc;
  const x = (doc.profile.people || []).find(y => y.id === id);
  if (!x) return 0;
  let moved = 0;
  store.transaction(`Removed ${personLabels(doc)[id] ?? 'a person'}`, () => {
    const list = peopleOf(store.doc).filter(y => y.id !== id);
    store.setDoc('profile', x.kind === 'Dependent' ? syncKids(list) : { people: list });
    if (x.kind !== 'Dependent') {
      for (const r of store.doc.records.filter(r => r.owner === id)) { store.update(r.id, { owner: 'Me' }); moved++; }
      for (const r of store.doc.records.filter(r => (Array.isArray(r.values?.splitAmong) && r.values.splitAmong.includes(id)) || r.values?.splitPcts?.[id] != null)) {
        const left = (r.values.splitAmong || []).filter(y => y !== id);
        const pcts = r.values.splitPcts ? Object.fromEntries(Object.entries(r.values.splitPcts).filter(([k]) => k !== id)) : null;
        store.update(r.id, { ...(Array.isArray(r.values.splitAmong) ? { splitAmong: left.length ? left : null } : {}), ...(pcts ? { splitPcts: Object.keys(pcts).length ? pcts : null } : {}) });
      }
      if (store.doc.settings?.person === id) store.setDoc('settings', { person: 'Me' });
    }
  });
  return moved;
}
