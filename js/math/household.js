// SPDX-License-Identifier: AGPL-3.0-only
// Households of any size (batch 49, M9N): one adult's part of a shared row. H is the household as js/registry/couples.js
// householdOf reads it: { ids: the adults in the plan, many: more than two, method: Equal or By income (About you),
// weights: each adult's take-home a month }. A row shared among the adults (owner Joint, or a bill split with them)
// can be split equally, by percent or by income, among any of them (values.splitAmong; blank is everyone).
// The split methods a shared row can take (values.splitHow); blank follows About you (By income, else equal).
export const SPLIT_HOWS = ['Equal', 'Percent', 'By income'];
export const SPLIT_HOW_WORDS = { Equal: 'Equally', Percent: 'By percent', 'By income': 'By income' };
export const amongList = r => (Array.isArray(r?.values?.splitAmong) ? r.values.splitAmong : typeof r?.values?.splitAmong === 'string' && r.values.splitAmong ? r.values.splitAmong.split(',').map(x => x.trim()) : []);
// Does this row take the split math? Every shared row once there are more than two adults; in a couple, only a row with a split typed.
export const splitTyped = r => r?.values?.splitHow != null || amongList(r).length > 0 || (r?.values?.splitPcts && Object.keys(r.values.splitPcts).length > 0);
export const generalRow = (r, H) => !!H && (H.many || splitTyped(r));
// The adults a shared row is split among: the ones ticked (still in the plan), else every adult.
export const amongOf = (r, H) => { const t = amongList(r).filter(id => H.ids.includes(id)); return t.length ? H.ids.filter(id => t.includes(id)) : H.ids; };
export const howOf = (r, H) => (SPLIT_HOWS.includes(r?.values?.splitHow) ? r.values.splitHow : r?.values?.sharePct != null && H.many ? 'Percent' : H.method);
// One adult's part of a shared row (0 to 1). Equal: one part each. Percent: the percent typed for them; the people with
// none typed share what is left equally (a bill's own My share % reads as this client's percent). By income: their
// take-home over the take-home of everyone the row is split among (equal while nobody's is known).
export function rowShare(r, person, H) {
  const among = amongOf(r, H);
  if (!among.includes(person)) return 0;
  const how = howOf(r, H);
  if (how === 'Percent') {
    const pcts = { ...(r.values?.sharePct != null ? { Me: r.values.sharePct } : {}), ...(r.values?.splitPcts || {}) };
    const typed = among.filter(id => typeof pcts[id] === 'number');
    if (typeof pcts[person] === 'number') return Math.max(0, pcts[person]);
    const rest = Math.max(0, 1 - typed.reduce((s, id) => s + pcts[id], 0));
    return among.length > typed.length ? rest / (among.length - typed.length) : 0;
  }
  if (how === 'By income') {
    const w = id => Math.max(0, H.weights[id] ?? 0), total = among.reduce((s, id) => s + w(id), 0);
    if (total > 0) return w(person) / total;
  }
  return 1 / among.length;
}
// The split in words, for a row's chip and its Show the math: "Ana 40%, Ben 40%, Cam 20%".
export function splitWords(r, H, names) {
  const among = amongOf(r, H);
  return among.map(id => `${names[id] ?? id} ${Math.round(rowShare(r, id, H) * 1000) / 10}%`).join(', ');
}
