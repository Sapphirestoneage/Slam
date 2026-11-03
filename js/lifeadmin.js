// SPDX-License-Identifier: AGPL-3.0-only
// Life admin checklist (missed ideas M8): done / not yet / not for me. Pure: no DOM.
// Beneficiaries read and write each account's own "Beneficiary named" answer (one source). Renters insurance
// counts as done when Protection has it. Everything else lives in doc.profile.lifeAdmin[key].

export const LIFE_STATES = ['Done', 'Not yet', 'Not for me'];
const FIXED = [
  { key: 'will', label: 'Basic will', where: 'An online will service or a lawyer; many employers offer one free through legal benefits' },
  { key: 'proxy', label: 'Healthcare proxy', where: 'Your state\'s free health care proxy form (search your state health department)' },
  { key: 'freezeEquifax', label: 'Credit freeze: Equifax', where: 'equifax.com, free' },
  { key: 'freezeExperian', label: 'Credit freeze: Experian', where: 'experian.com, free' },
  { key: 'freezeTransUnion', label: 'Credit freeze: TransUnion', where: 'transunion.com, free' },
];
const BENEF = { Yes: 'Done', No: 'Not yet' };

export function lifeAdminItems(doc, records) {
  const la = doc.profile?.lifeAdmin || {};
  const out = [];
  for (const a of records.filter(r => r.kind === 'account' && r.values?.group === 'investment')) {
    const key = `beneficiary:${a.id}`;
    out.push({ key, accountId: a.id, label: `Beneficiary on ${a.name || a.type}`, where: `${a.name || a.type}: settings, beneficiaries`,
      status: la[key] === 'Not for me' ? 'Not for me' : BENEF[a.values.beneficiary] ?? null });
  }
  for (const f of FIXED) out.push({ ...f, status: la[f.key] ?? null });
  const own = doc.profile?.housing === 'Own';
  const cov = records.find(r => r.kind === 'coverage' && r.type === 'Renters or home' && r.values?.have === 'Have it');
  out.push({ key: 'renters', label: own ? 'Home insurance' : 'Renters insurance', where: own ? 'Your mortgage servicer or insurer' : 'Your lease, or a renters insurance quote (often under $20 a month)',
    status: cov ? 'Done' : la.renters ?? null, fromProtection: !!cov });
  return out;
}

// Turn a pick into the doc change: a beneficiary writes the account; the rest write profile.lifeAdmin.
export function lifeAdminPatch(item, status, doc) {
  const la = { ...(doc.profile?.lifeAdmin || {}) };
  if (item.accountId && status !== 'Not for me') {
    delete la[item.key];
    return { account: { id: item.accountId, beneficiary: status === 'Done' ? 'Yes' : status === 'Not yet' ? 'No' : null }, lifeAdmin: la };
  }
  if (status === null) delete la[item.key]; else la[item.key] = status;
  return { lifeAdmin: la };
}
