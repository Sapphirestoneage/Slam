// SPDX-License-Identifier: AGPL-3.0-only
// The FIRE statuses (run FIRE statuses and the life timeline, Nov 27 2026, Part 1). Eli: the FIRE types are not goals.
// They are statuses on the one FOO timeline. Reaching one changes what is possible, not where the next dollar goes.
// Pure, and with no import on purpose: tools/game_statuses_build.mjs copies this file to game/core/statuses.js with
// the draft option words of data/library/status-options.json, so the web app and the game read one list.
// No number is worked out here. Each app hands over its own engine's numbers (the web app: fiTargets, monthsTo and
// rcCoast through statusesOf in js/math/destinations.js; the game: derive, freeAt, yearsTo and rcCoast through stGame
// in game/features/coast.js). This file decides what is reached, puts the list in date order, and holds the words.

// The six statuses, in the order of a typical path. full is the name on a card; what is one plain line.
export const ST_KEYS = ['Coast', 'Lean', 'Barista', 'FI', 'Chubby', 'Fat'];
export const ST_WORDS = {
  Coast: { name: 'Coast', full: 'Coast FI', what: 'Growth alone gets you to your FI number by the age you set.' },
  Lean: { name: 'Lean', full: 'Lean FI', what: 'Your investments can pay for needs for good: food, housing and transportation.' },
  Barista: { name: 'Barista', full: 'Barista FI', what: 'Part-time work you like, plus your investments, pays for today\'s life.' },
  FI: { name: 'FI', full: 'FI', what: 'Your investments can pay for the life you live today. Work is optional.' },
  Chubby: { name: 'Chubby', full: 'Chubby FI', what: 'Today\'s life with some room: halfway between FI and Fat.' },
  Fat: { name: 'Fat', full: 'Fat FI', what: 'Today\'s life plus your list of extras, with room to spare.' },
};
export const ST_LEVELS = ['Guess', 'Close', 'Exact'];
// The one line on every reached card (Eli, Nov 27 2026): the next dollar and the next win do not move by themselves.
export const ST_STAY = 'Your next step stays the same. These are options.';
export const ST_HEADING = 'Options this opens';

const stHas = v => typeof v === 'number' && Number.isFinite(v);
const stMoney = v => `$${Math.round(v).toLocaleString('en-US')}`;
const ST_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// 'YYYY-MM' plus n months, and its words ('Mar 2031', the short month of the Recalculating lines).
export function stYmAdd(ym, n) {
  if (!ym || !stHas(n)) return null;
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + Math.round(n);
  return `${y + Math.floor(m / 12)}-${String((((m % 12) + 12) % 12) + 1).padStart(2, '0')}`;
}
export const stYmName = ym => (ym ? `${ST_MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}` : null);

// The list of statuses for one person.
// x: { invested (what is invested today), known (false when that balance is a guess), level ('Guess', 'Close' or
//   'Exact': how sure the numbers behind the dates are), nowYm ('YYYY-MM'), seen ({ key: the day its card was
//   closed }), options (the statuses of data/library/status-options.json), money (the app's money formatter),
//   items: [{ key, value (the status number, from the app's engine), months (months from now at today's pace, from
//   the app's engine; null when it has no date), never (true when today's numbers give no date), needs (what is
//   missing, in words), math (the lines of Show the math), note (one line under the number) }] }.
// Each status comes back with: its number, reached (invested is at or over the number), the date at today's pace,
// the level, its math and its options. A status with no number stays in the list with what it needs.
export function stList(x = {}) {
  const inv = stHas(x.invested) ? x.invested : null, level = ST_LEVELS.includes(x.level) ? x.level : 'Guess';
  const money = typeof x.money === 'function' ? x.money : stMoney, seen = x.seen || {}, opts = x.options || {};
  const by = new Map((x.items || []).map(i => [i.key, i]));
  return ST_KEYS.map(key => {
    const i = by.get(key) || {}, W = ST_WORDS[key], value = stHas(i.value) && i.value > 0 ? i.value : null;
    const reached = value != null && inv != null && inv >= value;
    const months = value == null ? null : reached ? 0 : stHas(i.months) ? Math.max(0, Math.round(i.months)) : null;
    const ym = months == null ? null : stYmAdd(x.nowYm, months);
    const when = value == null ? null : reached ? 'Reached' : ym ? stYmName(ym) : 'Not on this path yet';
    const gap = value != null && inv != null && !reached ? value - inv : null;
    const math = [...(i.math || [])];
    if (value != null && inv != null) math.push(reached ? `${money(inv)} invested is at or over ${money(value)}: reached.` : `${money(value)} less ${money(inv)} invested = ${money(gap)} to go.`);
    if (value != null && !reached) math.push(months != null ? `At today's pace that is ${months} ${months === 1 ? 'month' : 'months'}: ${stYmName(ym)}.` : 'Today\'s numbers give no date for it yet.');
    return { key, name: W.name, full: W.full, what: W.what, value, reached, months, ym, when, never: value != null && !reached && months == null, gap,
      level, sure: !!x.known && level !== 'Guess', needs: value == null ? (i.needs || []) : [], note: i.note || null, math,
      options: (opts[key]?.options || []).slice(0, 4), title: opts[key]?.title || `You reached ${W.full}`, changed: opts[key]?.changed || W.what, seen: seen[key] || null };
  });
}

// The markers for a timeline: every status that has a number and a place in time (reached, or dated), in date
// order. Reached ones come first, in the order of the list. skip: keys the timeline already shows as a step.
export function stMarkers(list = [], { skip = [] } = {}) {
  return list.filter(s => s.value != null && s.months != null && !skip.includes(s.key))
    .map((s, i) => ({ key: s.key, name: s.name, full: s.full, label: `${s.full} status`, value: s.value, months: s.months, ym: s.ym, when: s.when, reached: s.reached, level: s.level, i }))
    .sort((a, b) => a.months - b.months || a.i - b.i).map(({ i, ...m }) => m);
}

// Markers between the steps of a timeline, in date order, without changing any step. steps: the timeline's own
// list, in its own order. at(step): 'done' for a finished step, the months from now for a dated step, 0 for the step
// in progress, or null when the step has no date (it keeps its place and no marker is measured against it).
// A marker goes right before the first step that comes after it in time; a reached marker goes after the finished
// steps and before the step in progress. Returns [{ step }] and [{ status }] rows; the steps are the same objects.
export function stWeave(steps = [], markers = [], at = () => null) {
  const T = steps.map(s => { const v = at(s); return v === 'done' ? -1 : stHas(v) ? v : null; });
  const slot = markers.map(m => {
    const k = m.reached ? -0.5 : m.months;
    let last = -1; // the last step that is at or before the marker in time
    T.forEach((t, i) => { if (t != null && t <= k) last = i; });
    const next = T.findIndex((t, i) => i > last && t != null && t > k);
    return next < 0 ? steps.length : next;
  });
  const out = [];
  steps.forEach((s, i) => { markers.forEach((m, j) => { if (slot[j] === i) out.push({ status: m }); }); out.push({ step: s }); });
  markers.forEach((m, j) => { if (slot[j] === steps.length) out.push({ status: m }); });
  return out;
}

// The one-time card of a status that was just reached: the first reached status whose card was not closed yet.
// Never on a guess (a guessed balance or a Guess level gets no card). The next step does not change: stay says so.
export function stCard(list = []) {
  const s = list.find(v => v.reached && !v.seen && v.sure);
  if (!s) return null;
  return { key: s.key, name: s.name, full: s.full, title: s.title, changed: s.changed, heading: ST_HEADING, options: s.options, stay: ST_STAY, value: s.value, level: s.level, math: s.math };
}

// Back under a status after its card was closed: one quiet Recalculating line (Eli, Nov 25 2026: "Below Coast by $X.
// New Coast date: ___."). Never a warning. hidden: { key: 'YYYY-MM' } is the month each line was closed for.
export function stBelow(list = [], { hidden = {}, month = null, money = stMoney } = {}) {
  const s = list.find(v => v.seen && !v.reached && v.value != null && v.gap != null && v.sure && hidden[v.key] !== month);
  if (!s) return null;
  return { key: s.key, name: s.name, by: s.gap, ym: s.ym, month, title: 'Recalculating', level: s.level, math: s.math,
    line: `Below ${s.name} by ${money(s.gap)}. New ${s.name} date: ${s.ym ? stYmName(s.ym) : 'none yet on today\'s numbers'}.`,
    next: s.ym ? 'Nothing to change. What you already put in each month brings it back.' : 'Any amount you put in each month sets a new date.' };
}

// One line for a strip: the statuses reached, and the next one with its date.
export function stLine(list = [], { money = stMoney } = {}) {
  const M = stMarkers(list), done = M.filter(m => m.reached), next = M.find(m => !m.reached) || null;
  if (!M.length) return null;
  return [done.length ? `Reached: ${done.map(m => m.name).join(', ')}.` : null, next ? `Next status: ${next.name}, ${money(next.value)}, ${next.when}.` : null].filter(Boolean).join(' ');
}
