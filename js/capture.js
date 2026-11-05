// SPDX-License-Identifier: AGPL-3.0-only
// Capture now for later (overnight F6): data kept in the client file for a later Wrapped or Kanban, with the least UI.
//   A dated joy rating (1 to 5) per spending category: doc.spending.categoryJoy[category] = [{ at, value, who }].
//   A Trip tag on spending lines (bill.trip, already a field) and calendar entries (entry.trip).
//   An income type on each income row (Salary, Side hustle, Windfall, Other): income.incomeKind, with a default from the row's type.
//   A change log on every edit: doc.history, each entry with field, old, new, who (Coach or Client) and the time (js/records.js _log).
// All of it exports and imports with the file, and the Captured tab of the workbook lists it.
export const INCOME_KINDS = ['Salary', 'Side hustle', 'Windfall', 'Other'];
const KIND_BY_TYPE = { Job: 'Salary', 'Partner job': 'Salary', 'Side hustle': 'Side hustle', 'Self-employed': 'Side hustle', Unemployment: 'Other', Benefits: 'Other', Rental: 'Other', 'Money from family': 'Windfall' };
export const incomeKindOf = r => r?.values?.incomeKind ?? KIND_BY_TYPE[r?.type] ?? 'Other';

export const JOY_SCALE = { min: 1, max: 5 };
export function rateCategoryJoy(store, category, value, { now = store.now() } = {}) {
  if (value != null && (value < JOY_SCALE.min || value > JOY_SCALE.max)) throw new Error(`A category joy rating is ${JOY_SCALE.min} to ${JOY_SCALE.max}`);
  const list = store.doc.spending?.categoryJoy?.[category] || [];
  store.setIn('spending', ['categoryJoy', category], value == null ? undefined : [...list, { at: now, value, who: store.who ?? 'Coach' }], 'Category joy');
}
// The latest rating per category, and every rating dated.
export function categoryJoyOf(doc) {
  const all = doc.spending?.categoryJoy || {};
  return Object.fromEntries(Object.entries(all).filter(([, list]) => list?.length).map(([cat, list]) => { const sorted = [...list].sort((a, b) => String(a.at).localeCompare(String(b.at))); return [cat, { value: sorted.at(-1).value, at: sorted.at(-1).at, history: sorted }]; }));
}
// The categories on the Budget (every line's category, in the order the lines come), so the ratings have something to rate.
export const categoriesOf = records => [...new Set(records.filter(r => r.kind === 'bill' && r.values?.category).map(r => r.values.category))];
// Everything tagged Trip: Budget lines and calendar entries.
export const tripsOf = records => records.filter(r => (r.kind === 'bill' || r.kind === 'entry') && r.values?.trip === true);

// The change log, newest first: what changed, from what to what, who and when. Settings changes are not logged (screen state).
const WORDS = { add: 'Added', set: 'Changed', status: 'Status', remove: 'Removed' };
// Coach-only fields (coach notes, Report this notes, the timer, private notes) stay out unless coach is true.
const COACH_ONLY = e => ['coachNote', 'privateNote'].includes(e.field) || (e.part === 'session' && /^(feedback|timer|privateNotes)/.test(e.field || ''));
export function changeLog(doc, { limit = 200, since = null, coach = true } = {}) {
  const name = id => { const r = doc.records.find(x => x.id === id); return r ? (r.name || r.type || r.kind) : id; };
  const show = v => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return [...(doc.history || [])].filter(e => (!since || e.at >= since) && (coach || !COACH_ONLY(e))).reverse().slice(0, limit).map(e => ({
    at: e.at, who: e.who ?? (e.source === 'import' ? 'Import' : 'Coach'), op: WORDS[e.op] ?? e.op,
    what: e.part ? `${e.part}` : e.id ? name(e.id) : '', field: e.field ?? (e.op === 'add' ? e.kind : e.op === 'remove' ? e.kind : ''),
    from: e.op === 'remove' ? '' : show(e.from), to: e.op === 'remove' ? '' : show(e.to), source: e.source ?? null,
  }));
}
