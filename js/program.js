// SPDX-License-Identifier: AGPL-3.0-only
// The program (Phase 3): twelve sessions, each with a checklist that ticks itself from the data where it can, the
// current session, the Picture % and its pace, Day 0 and the end of a session. Pure: reads a household and its
// metrics, never the DOM. The sessions, levels, weights and pace are in js/registry/program.js.
import { metrics, keyNumbers } from './math/metrics.js';
import { pictureOf, paceOf, nextSmallThings } from './math/picture.js';
import { foo } from './math/foo.js';
import { gatesOf, visible } from './gates.js';
import { SESSIONS, PACE, LEVELS } from './registry/program.js';
import { scorecardOf, ratingOf } from './math/scorecard.js';
import { THRESHOLDS } from './registry/scorecard.js';

export const sessionOf = doc => doc.session || {};
export const inSession = doc => { const s = sessionOf(doc); return !!s.startedAt && !(s.endedAt > s.startedAt); };
// The session being prepared or run: one past the sessions ended, up to the last.
export const sessionNo = doc => Math.min(SESSIONS.length, (sessionOf(doc).count || 0) + 1);
export const graduated = doc => (sessionOf(doc).count || 0) >= SESSIONS.length;
// Day 0: the first end-of-session snapshot (marked when it is saved).
export const day0Of = doc => (doc.snapshots || []).find(s => s.day0) || null;

const FILLED = new Set(['OK', 'Strong']);
// The hole a session works on: the top hole when it started (doc.program.targets), else the top hole now.
export const targetOf = (doc, sid, sc) => doc.program?.targets?.[sid] ?? sc.holes[0]?.id ?? null;

// What the data says about each auto item. holeFilled takes the session id.
export function autoChecks(doc, ref, { now = new Date(), flags = [], picture = pictureOf(doc, ref, { now }), m = metrics(doc, ref, { now }), sc = scorecardOf(doc, ref, { now, flags }) } = {}) {
  const p = doc.profile || {};
  const g = gatesOf(p, doc.client);
  const live = visible(doc.records, g, ref);
  const has = (kind, f = () => true) => live.some(r => r.kind === kind && f(r));
  const areasAnswered = p.noneOfThese === true || Object.values(p.areas || {}).some(v => v === true || v === false);
  const areaOk = (k, test) => g.areas[k] !== true || test; // an area they said they have needs at least one row
  const cats = picture.items.filter(it => it.kind === 'category' && it.id !== 'draftt:Other');
  const months = Object.values(doc.spending?.months || {});
  const lines = live.filter(r => r.kind === 'bill' && r.status !== 'Not for me');
  const monthOfActuals = months.some(mo => mo.closed) || (lines.length > 0 && months.some(mo => lines.filter(l => mo.lines?.[l.id]?.actual != null).length * 2 >= lines.length));
  const key = picture.items.filter(it => it.group === 'income' || it.group === 'account');
  let here = null;
  try { here = foo(doc, ref, { now, flags }).here ?? null; } catch { here = null; }
  return {
    accountsSetUp: areasAnswered && areaOk('cash', has('account', r => r.values.group === 'cash')) && areaOk('investments', has('account', r => r.values.group === 'investment')) && areaOk('real', has('asset')) && areaOk('debt', has('debt')),
    topLine: m.inputs.takeHome !== null && m.inputs.spending !== null && m.netWorth.value !== null,
    moneyInOneLine: [m.netWorth, m.surplus, m.savingsRate].every(r => r.value !== null),
    day0: !!day0Of(doc),
    bigCategories: cats.length > 0 && cats.every(it => it.level >= LEVELS.Estimate),
    goalsNamed: has('milestone') || !!p.goalWords,
    fooStep: here !== null,
    monthOfActuals,
    keyNumbersLocked: key.length > 0 && key.some(it => it.group === 'income') && key.every(it => it.level >= LEVELS.Actual),
    picture90: picture.pct * 100 >= PACE.expected[3] - PACE.margin,
    // Sessions 4 to 12 (batch 2): goals, the full analysis, the holes, the revisit, the next chapter, the game plan.
    shortGoals: sc.facts.goals.short >= THRESHOLDS.goals.count,
    longGoals: sc.facts.goals.long >= THRESHOLDS.goals.count,
    allRated: sc.rated === sc.of,
    holesRanked: sc.holes.every(h => h.payoff && h.effort > 0),
    fooConfirmed: sc.here != null && doc.program?.fooConfirmed === sc.here,
    top3Chosen: sc.chosen.length >= Math.min(3, sc.holes.length),
    holeFilled: sid => { const t = targetOf(doc, sid, sc); return t ? FILLED.has(ratingOf(sc, t)) : sc.holes.length === 0; },
    day0Compared: !!day0Of(doc) && doc.snapshots.length >= 2,
    rescored: !!doc.scorecard?.reviewedAt && doc.scorecard.reviewedAt >= (doc.snapshots.filter(s => s.session === 8).at(-1)?.at ?? ''),
    nextChapter: !!(doc.scorecard?.nextChapter?.text && doc.scorecard.nextChapter.amount != null && doc.scorecard.nextChapter.date),
    planNotes: !!doc.program?.plan?.notes,
    reviewDate: !!doc.program?.plan?.reviewDate,
    moneyDate: !!doc.program?.plan?.moneyDate,
  };
}

// The twelve sessions with their names, checklists and where each stands. doc.program holds the coach's own ticks
// (checks[session][item]) and any renamed placeholder session or edited checklist (sessions[session]).
export function sessionsOf(doc, ref, opts = {}) {
  const sc = opts.sc ?? scorecardOf(doc, ref, { now: opts.now, flags: opts.flags });
  const auto = autoChecks(doc, ref, { ...opts, sc });
  const prog = doc.program || {};
  const count = sessionOf(doc).count || 0;
  const n = sessionNo(doc);
  const clear = sc.rated === sc.of && sc.holes.length === 0; // every area rated, no hole left: the next chapter
  return SESSIONS.map((s, i) => {
    const over = prog.sessions?.[s.id] || {};
    const base = s.itemsWhenClear && clear ? s.itemsWhenClear : s.items;
    const target = s.hole ? sc.areas.find(a => a.id === targetOf(doc, s.id, sc)) ?? null : null;
    const items = (over.items ?? base).map(it => {
      const key = base.find(b => b.id === it.id)?.auto ?? null;
      const done = key === 'holeFilled' ? auto.holeFilled(s.id) : key ? !!auto[key] : !!prog.checks?.[s.id]?.[it.id];
      const detail = key === 'holeFilled' ? (target ? `${target.name}: ${target.rating ?? 'not rated'}` : 'No hole left') : null;
      return { id: it.id, label: it.label, auto: !!key, key, done, detail };
    });
    const k = i + 1;
    return { ...s, n: k, name: over.name ?? s.name, placeholder: !!s.placeholder, items, target, done: items.length > 0 && items.every(it => it.done),
      status: k <= count ? 'done' : k === n ? 'current' : 'next' };
  });
}
// Once session 3 is done (ended, or its checklist met), Home tracks the areas Strong or OK instead of the Picture %.
export const afterIntake = (doc, sessions) => (sessionOf(doc).count || 0) >= 3 || !!sessions[2]?.done;
// Holes filled: each area OK or Strong now that a saved snapshot still had as a Hole, with the FI days it was worth.
export function filledHoles(doc, sc) {
  const snaps = [...(doc.snapshots || [])].filter(s => s.metrics?.scorecard).reverse();
  return sc.areas.filter(a => FILLED.has(a.rating)).map(a => {
    const was = snaps.find(s => s.metrics.scorecard[a.id]?.rating === 'Hole');
    return was ? { id: a.id, name: a.name, from: 'Hole', to: a.rating, fiDays: was.metrics.scorecard[a.id].fiDays ?? null, payoff: was.metrics.scorecard[a.id].payoff ?? null, since: was.label, at: was.at } : null;
  }).filter(Boolean);
}

// Everything Home shows about the program, worked out once.
export function programOf(doc, ref, { now = new Date(), flags = [] } = {}) {
  const m = metrics(doc, ref, { now });
  const picture = pictureOf(doc, ref, { now });
  const sc = scorecardOf(doc, ref, { now, flags });
  const sessions = sessionsOf(doc, ref, { now, flags, picture, m, sc });
  const n = sessionNo(doc);
  const day0 = day0Of(doc);
  return { m, picture, sessions, n, current: sessions[n - 1], pace: paceOf(picture.pct, n), next: nextSmallThings(picture), day0, inSession: inSession(doc), graduated: graduated(doc),
    scorecard: sc, afterIntake: afterIntake(doc, sessions), filled: filledHoles(doc, sc), day0Ok: day0?.metrics?.scoreOk ?? null };
}

// The numbers a snapshot keeps: the key numbers, the Picture %, and the scorecard (each area's rating and what its
// hole was worth), so Day 0 vs now and Holes filled can look back.
export function snapshotNumbers(doc, ref, { now = new Date(), flags = [] } = {}) {
  const sc = scorecardOf(doc, ref, { now, flags });
  return { ...keyNumbers(metrics(doc, ref, { now })), picturePct: pictureOf(doc, ref, { now }).pct, scoreOk: sc.okCount, scoreOf: sc.of,
    scorecard: Object.fromEntries(sc.areas.map(a => [a.id, { rating: a.rating, payoff: a.payoff?.value ?? null, fiDays: a.fiDays }])) };
}

// Start: the session is on, Guide me is on, focus mode is on (answer 90). A hole session pulls the top hole.
export function startSession(store, ref = null, { now = new Date(), flags = [] } = {}) {
  const at = now.toISOString();
  const sid = SESSIONS[sessionNo(store.doc) - 1].id;
  const pull = SESSIONS[sessionNo(store.doc) - 1].hole && ref && !store.doc.program?.targets?.[sid];
  const top = pull ? scorecardOf(store.doc, ref, { now, flags }).holes[0]?.id ?? null : null;
  store.transaction('Start session', () => {
    store.setIn('session', ['startedAt'], at);
    store.setIn('session', ['guide'], true);
    store.setIn('session', ['allFields'], false);
    if (top) store.setIn('program', ['targets', sid], top);
  });
  return { sid, target: top };
}
// End (R181): homework set, next session booked, the count moves on, and a snapshot is saved: Day 0 the first time,
// End of session N after. The snapshot stays in the client file, so it exports and imports with everything else.
export function endSession(store, ref, { homework = [], next = null, now = new Date(), flags = [] } = {}) {
  const at = now.toISOString();
  const s = sessionOf(store.doc);
  const n = (s.count || 0) + 1;
  const first = !day0Of(store.doc);
  store.transaction('End session', () => {
    store.setIn('session', ['homework'], homework);
    store.setIn('session', ['homeworkAt'], at);
    store.setIn('session', ['onePagerAt'], at);
    if (next) store.setIn('session', ['next'], next);
    store.setIn('session', ['endedAt'], at);
    store.setIn('session', ['guide'], false);
    store.setIn('session', ['count'], n);
  });
  const snap = store.snapshot(first ? 'Day 0' : `End of session ${n}`, snapshotNumbers(store.doc, ref, { now, flags }), first ? { day0: true, session: n } : { session: n });
  return { n, snap, first };
}

// Day 0 against now, for the Revisit session (S9) and the strip: each key number then and now.
export function day0Report(doc, ref, { now = new Date() } = {}) {
  const d0 = day0Of(doc);
  if (!d0) return null;
  const then = d0.metrics || {};
  const nowNumbers = snapshotNumbers(doc, ref, { now });
  const rows = [['Net worth', 'netWorth', 'money'], ['Total debt', 'debtTotal', 'money'], ['Monthly surplus', 'surplus', 'money'], ['Savings rate', 'savingsRate', 'pct'], ['Picture', 'picturePct', 'pct'], ['Areas Strong or OK', 'scoreOk', 'count']]
    .map(([label, key, unit]) => ({ label, key, unit, then: then[key] ?? null, now: nowNumbers[key] ?? null, change: then[key] == null || nowNumbers[key] == null ? null : nowNumbers[key] - then[key] }));
  return { at: d0.at, rows };
}
