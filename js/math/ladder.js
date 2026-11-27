// SPDX-License-Identifier: AGPL-3.0-only
// M75: the ladder. Steps (actions in FOO order: little e, the match, heavy debt by quarters, big e) with how far along
// each is and its projected month; markers (net worth positive, consumer debt free, $100k, Quiet Quitting FI, Coast
// FI, Lean FI, FI, Fat FI) reached or projected by date; the rungs merged, with markers slotted between the steps by
// date; the next step, the next marker, and Day 0. Pure: never the DOM. Copy frames progress as a win.
import { metrics } from './metrics.js';
import { foo } from './foo.js';
import { layersOf } from './layers.js';
import { isHeavyDebt } from './debt.js';
import { fiDate, fiMoveOf } from './fi.js';
import { fiTargets, monthsTo } from '../plan.js';
import { addMonths, ymOf } from '../month.js';
import { STEPS, MARKERS, LADDER } from '../registry/ladder.js';
import { LISTS, RULES } from '../registry/assumptions.js';
import { gatesOf } from '../gates.js';
import { ownPlanPerson } from '../registry/couples.js';
import { statusesOf } from './destinations.js';
import { stMarkers, stWeave } from './statuses.js';

const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const CONSUMER = new Set(LISTS.consumerDebt);
const isHeavy = isHeavyDebt;

// Where a payoff path crosses down to a share of the start: the first month the heavy total is at or under it.
const monthsToShare = (path, start, share) => { const goal = start * (1 - share); const i = path.findIndex(row => sum(row, v => v) <= goal + 0.005); return i < 0 ? null : i; };

export function ladderOf(doc, ref, { now = new Date(), flags = [] } = {}) {
  const m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }), x = m.inputs; // batch 20: one person's plan for a couple with no combined totals, as on Plan
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
  // Batch 11: the one debt plan (the surplus to heavy debt first). The heavy rows of its path, for the quarter marks.
  const P = m.debtPlan, hIdx = (P?.debts || []).map((d, i) => (d.heavy ? i : -1)).filter(i => i >= 0);
  const heavyPlan = heavyNow.length && hIdx.length ? { months: P.heavyMonths, path: P.path.map(row => hIdx.map(i => row[i])) } : null;
  const facts = { matchOffered: (x.link.incomeTiers || []).length > 0, heavyDebt: heavyStart > 0 };
  const months = v => (v == null ? null : Math.max(0, Math.ceil(v)));
  const at = n => (n == null ? null : addMonths(ymOf(now), n));
  // Each step carries its dollars beside its share (batch 7, item 7): have, target and left, in whole dollars; null
  // where the step has no dollars (the match) or no target yet (big e without an age).
  const steps = STEPS.filter(s => !s.applies || facts[s.applies]).map(s => {
    let done = false, pct = 0, mo = null, have = null, target = null;
    if (s.id === 'littleE') { const l = L?.layers.find(l => l.id === 'little-e'); done = !!l?.full; pct = l?.target ? Math.min(1, (l.filled ?? 0) / l.target) : 0; mo = done ? 0 : surplusIn && l ? months(l.left / surplusIn) : null; if (l?.target) { have = Math.min(l.filled ?? 0, l.target); target = l.target; } }
    else if (s.id === 'match') { const st = step('2'); done = !!st?.done; pct = done ? 1 : (st?.started ? 0.5 : 0); mo = done ? 0 : null; }
    else if (s.share != null) { const paid = heavyStart ? (heavyStart - heavyLeft) / heavyStart : 0; done = paid >= s.share - 1e-9; pct = Math.min(1, paid / s.share); mo = done ? 0 : heavyPlan?.path ? monthsToShare(heavyPlan.path, heavyStart, s.share) : null; if (mo == null && !done && heavyPlan?.months != null && s.share === 1) mo = heavyPlan.months; if (heavyStart) { target = heavyStart * s.share; have = Math.min(heavyStart - heavyLeft, target); } }
    else if (s.id === 'bigE') { const ls = L?.layers.filter(l => l.id.startsWith('big-e')) ?? []; const t = L?.needsAge ? 0 : sum(ls, l => l.target), filled = sum(ls, l => l.filled); done = t > 0 && ls.every(l => l.full); pct = t ? Math.min(1, filled / t) : 0; mo = done ? 0 : (m.debtRule?.on || m.fooFlow) && step('4')?.months != null ? step('4').months : surplusIn && t ? months((t - filled) / surplusIn) : (step('4')?.months ?? null); if (t) { target = t; have = Math.min(filled, t); } if (L?.needsAge) s = { ...s, what: 'Add your age to set big e (the Rule of 5)' }; } // no spending or no age: nothing to fill, nothing done
    const round = v => (v == null ? null : Math.round(v));
    return { ...s, kind: 'step', done, pct, months: mo, date: at(mo), have: round(have), target: round(target), left: target == null ? null : Math.max(0, round(target) - round(have)) };
  });
  // Markers.
  const T = fiTargets(m, doc);
  const nw = m.netWorth.value;
  const consumer = x.debts.filter(d => CONSUMER.has(d.type) && (d.balance ?? 0) > 0);
  const consumerPlan = consumer.length ? (() => { const ms = consumer.map(d => d.planMonths); return { months: ms.every(v => v != null) ? Math.max(...ms) : null }; })() : null; // each debt's month on the one plan
  const qq = F?.qq?.value ?? null, coast = F?.coast ?? m.coastFi.value ?? null;
  const targetOf = { qq, coast, lean: T['Lean FI']?.value ?? null, fi: m.fiNumber.value, fat: T['Fat FI']?.value ?? null };
  const markers = MARKERS.map(k => {
    let reached = false, mo = null, target = null, value = null;
    if (k.kind === 'netWorth') { target = k.target; value = nw; reached = hasNw && nw != null && nw >= k.target; mo = reached ? 0 : nw == null ? null : surplusIn ? months((k.target - nw) / surplusIn) : null; }
    else if (k.kind === 'consumerFree') { reached = x.debts.length > 0 && !consumer.length && x.debts.every(d => d.inFull || d.balance != null); mo = reached ? 0 : consumerPlan?.months ?? null; }
    else { target = targetOf[k.target]; value = x.invested; if (target != null && x.invested != null) { reached = !!x.investedKnown && x.invested >= target; mo = reached ? 0 : monthsTo(m, target, { now }).value; } }
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
  return { steps, markers: sortedMarkers, rungs, lastDone, next, nextMarker, wins, day0: day0 ? { at: day0.at, netWorth: day0.metrics?.netWorth ?? null } : null, heavy: { start: heavyStart, left: heavyLeft, months: heavyPlan?.months ?? null, date: at(heavyPlan?.months ?? null) } };
}

// M8T (run of Nov 25 2026, Part 4): what the FIRE journey map (tpJourney of js/math/trip.js) reads from the plan: cash,
// the costly debt left (consumer debt: cards, personal, BNPL, payday, medical and family loans), what is invested, the
// Coast and FI numbers, what goes in a month (as the ladder counts it), and the months of the ladder's own markers for
// debt free, Coast and FI. With a trip, the FI date is run again with its cost off what is invested (fiMoveOf, M9Z).
// debtKnown: the debt question was answered (no debt rows is then $0; unanswered is null: empty is not zero).
export function journeyInputs(doc, ref, { now = new Date(), debtKnown = false, trip = null } = {}) {
  let m = null, L = null;
  try { m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }); } catch { m = null; }
  if (!m) return {};
  try { L = ladderOf(doc, ref, { now }); } catch { L = null; }
  const x = m.inputs, mk = id => L?.markers.find(k => k.id === id) ?? null;
  const consumer = x.debts.filter(d => CONSUMER.has(d.type));
  const debt = consumer.some(d => d.balance == null) ? null : consumer.length ? sum(consumer, d => d.balance) : debtKnown || x.debts.length ? 0 : null;
  const surplus = m.investing?.monthly ?? m.surplus.value ?? null;
  const F = trip > 0 ? fiMoveOf(m, { once: trip }, { from: now }) : null;
  return {
    cash: x.cash ?? null, debt, invested: x.investedKnown ? x.invested : null, coast: mk('coast')?.target ?? m.coastFi.value ?? null, fi: m.fiNumber.value ?? null,
    monthly: surplus == null ? null : Math.max(0, surplus), trip: trip > 0 ? trip : null,
    when: { debt: mk('consumerFree')?.months ?? null, coast: mk('coast')?.months ?? null, fi: mk('fi')?.months ?? null },
    whenAfter: F?.after != null ? { fi: F.after } : {}, fiDays: F?.days ?? null,
  };
}

// The stages of the journey map with the FIRE statuses between them, in date order (run FIRE statuses and the life
// timeline, Nov 27 2026). Coast and FI are stages of the journey already, so they get no second marker; Lean,
// Barista, Chubby and Fat do. No stage moves or changes. J is tpJourney's result. A date shows only on a balance the
// person knows (level Close); on a guess only a reached status shows.
export function journeyStatusRows(J, doc, ref, { now = new Date() } = {}) {
  let marks = [];
  try {
    const m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }), known = !!m.inputs.investedKnown;
    marks = stMarkers(statusesOf(m, doc, { now, level: known ? 'Close' : 'Guess' }).list, { skip: ['Coast', 'FI'] }).filter(k => k.reached || known);
  } catch { marks = []; }
  return stWeave(J.stages, marks, s => (s.done ? 'done' : s.months != null ? s.months : J.stages.indexOf(s) === J.here ? 0 : null));
}
