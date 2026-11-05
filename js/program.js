// SPDX-License-Identifier: AGPL-3.0-only
// The program (Phase 3): twelve sessions, each with a checklist that ticks itself from the data where it can, the
// current session, the Picture % and its pace, Day 0 and the end of a session. Pure: reads a household and its
// metrics, never the DOM. The sessions, levels, weights and pace are in js/registry/program.js.
import { metrics, keyNumbers } from './math/metrics.js';
import { pictureOf, paceOf, nextSmallThings } from './math/picture.js';
import { foo } from './math/foo.js';
import { gatesOf, visible } from './gates.js';
import { SESSIONS, PACE, LEVELS } from './registry/program.js';

export const sessionOf = doc => doc.session || {};
export const inSession = doc => { const s = sessionOf(doc); return !!s.startedAt && !(s.endedAt > s.startedAt); };
// The session being prepared or run: one past the sessions ended, up to the last.
export const sessionNo = doc => Math.min(SESSIONS.length, (sessionOf(doc).count || 0) + 1);
export const graduated = doc => (sessionOf(doc).count || 0) >= SESSIONS.length;
// Day 0: the first end-of-session snapshot (marked when it is saved).
export const day0Of = doc => (doc.snapshots || []).find(s => s.day0) || null;

// What the data says about each auto item.
export function autoChecks(doc, ref, { now = new Date(), flags = [], picture = pictureOf(doc, ref, { now }), m = metrics(doc, ref, { now }) } = {}) {
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
  };
}

// The twelve sessions with their names, checklists and where each stands. doc.program holds the coach's own ticks
// (checks[session][item]) and any renamed placeholder session or edited checklist (sessions[session]).
export function sessionsOf(doc, ref, opts = {}) {
  const auto = autoChecks(doc, ref, opts);
  const prog = doc.program || {};
  const count = sessionOf(doc).count || 0;
  const n = sessionNo(doc);
  return SESSIONS.map((s, i) => {
    const over = prog.sessions?.[s.id] || {};
    const items = (over.items ?? s.items).map(it => {
      const base = s.items.find(b => b.id === it.id);
      const key = base?.auto ?? null;
      return { id: it.id, label: it.label, auto: !!key, done: key ? !!auto[key] : !!prog.checks?.[s.id]?.[it.id] };
    });
    const k = i + 1;
    return { ...s, n: k, name: over.name ?? s.name, placeholder: !!s.placeholder, items, done: items.length > 0 && items.every(it => it.done),
      status: k <= count ? 'done' : k === n ? 'current' : 'next' };
  });
}

// Everything Home shows about the program, worked out once.
export function programOf(doc, ref, { now = new Date(), flags = [] } = {}) {
  const m = metrics(doc, ref, { now });
  const picture = pictureOf(doc, ref, { now });
  const sessions = sessionsOf(doc, ref, { now, flags, picture, m });
  const n = sessionNo(doc);
  return { m, picture, sessions, n, current: sessions[n - 1], pace: paceOf(picture.pct, n), next: nextSmallThings(picture), day0: day0Of(doc), inSession: inSession(doc), graduated: graduated(doc) };
}

// The numbers a snapshot keeps: the key numbers plus the Picture %.
export const snapshotNumbers = (doc, ref, { now = new Date() } = {}) => ({ ...keyNumbers(metrics(doc, ref, { now })), picturePct: pictureOf(doc, ref, { now }).pct });

// Start: the session is on, Guide me is on, focus mode is on (answer 90).
export function startSession(store, { now = new Date().toISOString() } = {}) {
  store.transaction('Start session', () => {
    store.setIn('session', ['startedAt'], now);
    store.setIn('session', ['guide'], true);
    store.setIn('session', ['allFields'], false);
  });
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
  const snap = store.snapshot(first ? 'Day 0' : `End of session ${n}`, snapshotNumbers(store.doc, ref, { now }), first ? { day0: true, session: n } : { session: n });
  return { n, snap, first };
}

// Day 0 against now, for the Revisit session (S9) and the strip: each key number then and now.
export function day0Report(doc, ref, { now = new Date() } = {}) {
  const d0 = day0Of(doc);
  if (!d0) return null;
  const then = d0.metrics || {};
  const nowNumbers = snapshotNumbers(doc, ref, { now });
  const rows = [['Net worth', 'netWorth', 'money'], ['Total debt', 'debtTotal', 'money'], ['Monthly surplus', 'surplus', 'money'], ['Savings rate', 'savingsRate', 'pct'], ['Picture', 'picturePct', 'pct']]
    .map(([label, key, unit]) => ({ label, key, unit, then: then[key] ?? null, now: nowNumbers[key] ?? null, change: then[key] == null || nowNumbers[key] == null ? null : nowNumbers[key] - then[key] }));
  return { at: d0.at, rows };
}
