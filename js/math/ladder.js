// SPDX-License-Identifier: AGPL-3.0-only
// M75: the ladder. Steps (actions in FOO order: little e, the match, heavy debt by quarters, big e) with how far along
// each is and its projected month; markers (net worth positive, consumer debt free, $100k, Quiet Quitting FI, Coast
// FI, Lean FI, FI, Fat FI) reached or projected by date; the rungs merged, with markers slotted between the steps by
// date; the next step, the next marker, and Day 0. Pure: never the DOM. Copy frames progress as a win.
import { metrics } from './metrics.js';
import { foo } from './foo.js';
import { layersOf } from './layers.js';
import { payoffPlan } from './debt.js';
import { fiDate } from './fi.js';
import { fiTargets, monthsTo } from '../plan.js';
import { addMonths, ymOf } from '../month.js';
import { STEPS, MARKERS, LADDER } from '../registry/ladder.js';
import { LISTS, RULES } from '../registry/assumptions.js';
import { gatesOf } from '../gates.js';

const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const CONSUMER = new Set(LISTS.consumerDebt);
const isHeavy = d => (d.balance ?? 0) > 0 && (new Set(LISTS.heavyDebt).has(d.type) || (d.apr ?? 0) >= RULES.heavyApr);

// Where a payoff path crosses down to a share of the start: the first month the heavy total is at or under it.
const monthsToShare = (path, start, share) => { const goal = start * (1 - share); const i = path.findIndex(row => sum(row, v => v) <= goal + 0.005); return i < 0 ? null : i; };

export function ladderOf(doc, ref, { now = new Date(), flags = [] } = {}) {
  const m = metrics(doc, ref, { now }), x = m.inputs;
  const gates = gatesOf(doc.profile, doc.client);
  const hasNw = (doc.records || []).some(r => ['account', 'debt', 'asset'].includes(r.kind)); // empty is not zero: no net worth marker until something is typed
  let F = null, L = null;
  try { F = foo(doc, ref, { now, flags }); } catch { F = null; }
  try { L = layersOf(doc, ref, now); } catch { L = null; }
  const step = id => F?.steps.find(s => s.id === id) ?? null;
  const surplusIn = Math.max(0, m.investing?.monthly ?? m.surplus.value ?? 0); // what grows net worth a month
  const day0 = (doc.snapshots || []).find(s => s.day0) ?? null;
  // Heavy debt: the start is Day 0's heavy total when there is one, else today's.
  const heavyNow = x.debts.filter(isHeavy);
  const day0Heavy = day0 ? (day0.records || []).filter(r => r.kind === 'debt' && isHeavy({ balance: r.values?.balance, type: r.type, apr: r.values?.apr })) : null;
  const heavyStart = day0Heavy ? sum(day0Heavy, r => r.values.balance) : sum(heavyNow, d => d.balance);
  const heavyLeft = sum(heavyNow, d => d.balance);
  const heavyPlan = heavyNow.length ? payoffPlan(heavyNow.filter(d => !d.inFull && d.apr != null && d.payment != null), { order: x.debtOrder }) : null;
  const facts = { matchOffered: (x.link.incomeTiers || []).length > 0, heavyDebt: heavyStart > 0 };
  const months = v => (v == null ? null : Math.max(0, Math.ceil(v)));
  const at = n => (n == null ? null : addMonths(ymOf(now), n));
  const steps = STEPS.filter(s => !s.applies || facts[s.applies]).map(s => {
    let done = false, pct = 0, mo = null;
    if (s.id === 'littleE') { const l = L?.layers.find(l => l.id === 'little-e'); done = !!l?.full; pct = l?.target ? Math.min(1, (l.filled ?? 0) / l.target) : 0; mo = done ? 0 : surplusIn && l ? months(l.left / surplusIn) : null; }
    else if (s.id === 'match') { const st = step('2'); done = !!st?.done; pct = done ? 1 : (st?.started ? 0.5 : 0); mo = done ? 0 : null; }
    else if (s.share != null) { const paid = heavyStart ? (heavyStart - heavyLeft) / heavyStart : 0; done = paid >= s.share - 1e-9; pct = Math.min(1, paid / s.share); mo = done ? 0 : heavyPlan?.path ? monthsToShare(heavyPlan.path, heavyStart, s.share) : null; if (mo == null && !done && heavyPlan?.months != null && s.share === 1) mo = heavyPlan.months; }
    else if (s.id === 'bigE') { const ls = L?.layers.filter(l => l.id.startsWith('big-e')) ?? []; const target = sum(ls, l => l.target), filled = sum(ls, l => l.filled); done = target > 0 && ls.every(l => l.full); pct = target ? Math.min(1, filled / target) : 0; mo = done ? 0 : surplusIn && target ? months((target - filled) / surplusIn) : (step('4')?.months ?? null); } // no spending known: nothing to fill, nothing done
    return { ...s, kind: 'step', done, pct, months: mo, date: at(mo) };
  });
  // Markers.
  const T = fiTargets(m, doc);
  const nw = m.netWorth.value;
  const consumer = x.debts.filter(d => CONSUMER.has(d.type) && (d.balance ?? 0) > 0);
  const consumerPlan = consumer.length ? payoffPlan(consumer.filter(d => !d.inFull && d.apr != null && d.payment != null), { order: x.debtOrder }) : null;
  const qq = F?.qq?.value ?? null, coast = F?.coast ?? m.coastFi.value ?? null;
  const targetOf = { qq, coast, lean: T['Lean FI']?.value ?? null, fi: m.fiNumber.value, fat: m.fiNumber.value == null ? null : m.fiNumber.value * RULES.fatFactor };
  const markers = MARKERS.map(k => {
    let reached = false, mo = null, target = null, value = null;
    if (k.kind === 'netWorth') { target = k.target; value = nw; reached = hasNw && nw != null && nw >= k.target; mo = reached ? 0 : nw == null ? null : surplusIn ? months((k.target - nw) / surplusIn) : null; }
    else if (k.kind === 'consumerFree') { reached = x.debts.length > 0 && !consumer.length; mo = reached ? 0 : consumerPlan?.months ?? null; }
    else { target = targetOf[k.target]; value = x.invested; if (target != null && x.invested != null) { reached = x.invested >= target; mo = reached ? 0 : monthsTo(m, target, { now }).value; } }
    const name = k.editable && doc.program?.ladder?.fatLabel ? doc.program.ladder.fatLabel : k.name;
    return { ...k, name, kind: 'marker', reached, months: mo, date: at(mo), target, value, applies: !(k.kind === 'consumerFree' && !x.debts.length && gates.areas.debt === false) }; // never had consumer debt: the marker is left out
  }).filter(k => k.applies);
  // The rungs: steps in order, markers slotted in by date (reached ones first, unknown dates last).
  const when = r => (r.done || r.reached ? -1 : r.months == null ? Infinity : r.months);
  const rungs = [];
  const sortedMarkers = [...markers].sort((a, b) => when(a) - when(b));
  let mi = 0;
  for (const s of steps) { while (mi < sortedMarkers.length && when(sortedMarkers[mi]) <= when(s) && when(sortedMarkers[mi]) !== Infinity) rungs.push(sortedMarkers[mi++]); rungs.push(s); }
  while (mi < sortedMarkers.length) rungs.push(sortedMarkers[mi++]);
  const lastDone = [...steps].reverse().find(s => s.done) ?? null;
  const next = steps.find(s => !s.done) ?? null;
  const nextMarker = sortedMarkers.find(k => !k.reached) ?? null;
  const wins = steps.filter(s => s.done).length + markers.filter(k => k.reached).length;
  return { steps, markers: sortedMarkers, rungs, lastDone, next, nextMarker, wins, day0: day0 ? { at: day0.at, netWorth: day0.metrics?.netWorth ?? null } : null, heavy: { start: heavyStart, left: heavyLeft } };
}
