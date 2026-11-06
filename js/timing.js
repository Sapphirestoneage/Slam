// SPDX-License-Identifier: AGPL-3.0-only
// Batch 10 (item 5b): a spending line's timing as one sentence, "$1,000 · every month on the 1st", set by taps only.
// It reads and writes the fields the calendar already uses, so nothing migrates and the calendar math is unchanged:
//   every month  timing Fixed date, dueDay 1 to 31 (31 reads Last day: the calendar puts it on the month's last day)
//   every week   timing Weekly, weekday 0 (Sunday) to 6
//   every year   irregular (the yearly list), per year, monthDue 1 to 12, dueDay
//   it varies    timing Variable date, no day
// Pure: no DOM.
export const FREQS = [['month', 'Every month'], ['week', 'Every week'], ['year', 'Every year'], ['varies', 'It varies']];
export const DAY_CHIPS = [[1, '1st'], [15, '15th'], [31, 'Last day']];
export const WEEKDAY_CHIPS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
export const MONTH_CHIPS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => [i + 1, m]);
const WEEKDAY_WORDS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const ordinal = d => (d >= 31 ? 'last day' : `${d}${d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'}`);

// The sentence's parts from a line (record or flattened): { freq, day, weekday, month }.
export function timingOf(line) {
  const v = line.values ?? line;
  const per = line.per ?? v.per;
  if (v.irregular || per === 'year') return { freq: 'year', day: v.dueDay ?? null, weekday: null, month: v.monthDue != null ? Number(v.monthDue) : null };
  if (v.timing === 'Weekly') return { freq: 'week', day: null, weekday: v.weekday ?? null, month: null };
  if (v.timing === 'Variable date') return { freq: 'varies', day: null, weekday: null, month: null };
  return { freq: 'month', day: v.dueDay ?? null, weekday: null, month: null };
}
// The fields to write for a tap: { freq } or { day } or { weekday } or { month }, against the line as it is now.
export function timingPatch(line, pick) {
  const now = timingOf(line);
  const freq = pick.freq ?? now.freq;
  const changing = pick.freq && pick.freq !== now.freq;
  if (freq === 'month') return { ...(changing ? { timing: 'Fixed date', irregular: null, ...(now.freq === 'year' ? { per: 'month', monthDue: null } : {}) } : {}), ...(pick.day !== undefined ? { dueDay: pick.day } : {}) };
  if (freq === 'week') return { ...(changing ? { timing: 'Weekly', dueDay: null, irregular: null, ...(now.freq === 'year' ? { per: 'month', monthDue: null } : {}) } : {}), ...(pick.weekday !== undefined ? { weekday: pick.weekday } : {}) };
  if (freq === 'year') return { ...(changing ? { irregular: true, per: 'year', timing: 'Fixed date' } : {}), ...(pick.month !== undefined ? { monthDue: pick.month } : {}), ...(pick.day !== undefined ? { dueDay: pick.day } : {}) };
  return changing ? { timing: 'Variable date', dueDay: null, irregular: null, ...(now.freq === 'year' ? { per: 'month', monthDue: null } : {}) } : {};
}
// The words after the amount: "every month on the 1st", "every week on Thursday", "every year in March on the 15th", "it varies".
export function timingWords(line) {
  const t = timingOf(line);
  if (t.freq === 'varies') return 'it varies';
  if (t.freq === 'week') return `every week${t.weekday != null ? ` on ${WEEKDAY_WORDS[t.weekday]}` : ''}`;
  if (t.freq === 'year') return `every year${t.month ? ` in ${MONTH_CHIPS[t.month - 1][1]}` : ''}${t.day ? ` on the ${ordinal(t.day)}` : ''}`;
  return `every month${t.day ? ` on the ${ordinal(t.day)}` : ''}`;
}
