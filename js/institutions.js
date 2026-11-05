// SPDX-License-Identifier: AGPL-3.0-only
// Institutions (batch 6, items 13 to 15): one list per client (doc.profile.institutions) of the banks, credit unions,
// brokerages, workplace plans, lenders and insurers the household uses: name, kind, website, notes, whose. NEVER a
// login or a password. Every account, card, loan and policy points at one (institutionId); an older file's typed
// institution text becomes a row here, deduped by name. Rows read "[Institution] · [Kind]" or "· [Nickname]".
export const INSTITUTION_KINDS = ['Bank', 'Credit union', 'Brokerage', 'Workplace plan', 'Lender', 'Insurer', 'Other'];
const KIND_BY_RECORD = { coverage: 'Insurer', debt: 'Lender' };
const norm = s => String(s ?? '').trim().toLowerCase();

export const institutionsOf = doc => doc.profile?.institutions || [];
export const institutionById = (doc, id) => institutionsOf(doc).find(i => i.id === id) ?? null;
export function addInstitution(store, { name, kind = null, website = null, notes = null, owner = null } = {}) {
  const clean = String(name ?? '').trim();
  if (!clean) throw new Error('An institution needs a name');
  const have = institutionsOf(store.doc).find(i => norm(i.name) === norm(clean));
  if (have) return have;
  const row = { id: store.makeId(), name: clean, kind: kind ?? null, website: website ?? null, notes: notes ?? null, owner: owner ?? null };
  store.setDoc('profile', { institutions: [...institutionsOf(store.doc), row] });
  return row;
}
export function updateInstitution(store, id, patch) { store.setDoc('profile', { institutions: institutionsOf(store.doc).map(i => (i.id === id ? { ...i, ...patch } : i)) }); }
export function removeInstitution(store, id) {
  store.transaction('Remove institution', () => {
    store.setDoc('profile', { institutions: institutionsOf(store.doc).filter(i => i.id !== id) });
    for (const r of store.doc.records.filter(r => r.values?.institutionId === id)) store.update(r.id, { institutionId: null });
  });
}
// The institution a row points at (by id, else by its older typed name).
export function institutionOf(doc, r) {
  if (!r) return null;
  if (r.values?.institutionId) return institutionById(doc, r.values.institutionId);
  const text = r.values?.institution;
  return text ? institutionsOf(doc).find(i => norm(i.name) === norm(text)) ?? null : null;
}
// What a row is called: "[Institution] · [Nickname]" with a nickname, else "[Institution] · [Kind]", else the nickname or the kind.
export function rowLabel(doc, r) {
  const inst = institutionOf(doc, r);
  const kind = r.type || r.kind;
  if (inst) return `${inst.name} · ${r.name || kind}`;
  return r.name || kind || '';
}
// Everything at one institution, with a total (what is owned minus what is owed).
export function atInstitution(doc, id) {
  const rows = doc.records.filter(r => institutionOf(doc, r)?.id === id && r.status !== 'Not for me');
  const accounts = rows.filter(r => r.kind === 'account'), debts = rows.filter(r => r.kind === 'debt'), coverage = rows.filter(r => r.kind === 'coverage');
  const owned = accounts.reduce((s, r) => s + (r.values.balance ?? 0), 0), owed = debts.reduce((s, r) => s + (r.values.balance ?? 0), 0);
  return { rows, accounts, debts, coverage, owned, owed, total: owned - owed };
}
// Older files: the typed institution text on accounts, cards and loans becomes a row on the list (deduped by name,
// case blind) and the row points at it. Idempotent.
export function migrateInstitutions(doc) {
  if (!doc.profile) return doc;
  const list = [...(doc.profile.institutions || [])];
  let n = 0;
  for (const r of doc.records || []) {
    if (!['account', 'debt', 'coverage'].includes(r.kind) || r.values?.institutionId) continue;
    const text = String(r.values?.institution ?? '').trim();
    if (!text) continue;
    let row = list.find(i => norm(i.name) === norm(text));
    if (!row) { row = { id: `inst${Date.now().toString(36)}${(n++).toString(36)}`, name: text, kind: KIND_BY_RECORD[r.kind] ?? (r.values?.group === 'investment' ? 'Brokerage' : 'Bank'), website: null, notes: null, owner: null }; list.push(row); }
    r.values.institutionId = row.id;
  }
  if (list.length || doc.profile.institutions) doc.profile.institutions = list;
  return doc;
}
