// SPDX-License-Identifier: AGPL-3.0-only
// The program (Phase 3): twelve sessions, each with a checklist that ticks itself from the data where it can, the
// current session, the Picture % and its pace, Day 0 and the end of a session. Pure: reads a household and its
// metrics, never the DOM. The sessions, levels, weights and pace are in js/registry/program.js.
import { metrics, keyNumbers } from './math/metrics.js';
import { pictureOf, paceOf, nextSmallThings } from './math/picture.js';
import { foo } from './math/foo.js';
import { gatesOf, visible } from './gates.js';
import { SESSIONS, PACE, LEVELS, REVIEW, AGENDA, HOMEWORK_STATUSES, levelWord } from './registry/program.js';
import { homeworkList } from './homework.js';
import { MODES, modeOf, DISCLOSURE } from './registry/couples.js';
import { layerSnapshot } from './math/layers.js';
import { JOY } from './registry/joy.js';
import { fmt } from './math/result.js';
import { scorecardOf, ratingOf } from './math/scorecard.js';
import { THRESHOLDS } from './registry/scorecard.js';

export const sessionOf = doc => doc.session || {};
export const inSession = doc => { const s = sessionOf(doc); return !!s.startedAt && !(s.endedAt && s.endedAt >= s.startedAt); };
// The session being prepared or run: one past the sessions ended, up to the last.
export const sessionNo = doc => Math.min(SESSIONS.length, (sessionOf(doc).count || 0) + 1);
export const graduated = doc => (sessionOf(doc).count || 0) >= SESSIONS.length;
// Day 0: the first end-of-session snapshot (marked when it is saved).
export const day0Of = doc => (doc.snapshots || []).find(s => s.day0) || null;

const FILLED = new Set(['OK', 'Strong']);
// The hole a session works on: the top hole when it started (doc.program.targets), else the top hole now.
export const targetOf = (doc, sid, sc) => doc.program?.targets?.[sid] ?? sc.open[0]?.id ?? null; // parked holes wait

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
  const key = picture.items.filter(it => ['income', 'account', 'debt'].includes(it.group)); // answer 129: debts too
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
    holeFilled: sid => { const t = targetOf(doc, sid, sc); return t ? FILLED.has(ratingOf(sc, t)) : sc.open.length === 0; },
    day0Compared: !!day0Of(doc) && doc.snapshots.length >= 2,
    rescored: !!doc.scorecard?.reviewedAt && doc.scorecard.reviewedAt >= (doc.snapshots.filter(s => s.session === 8).at(-1)?.at ?? ''),
    nextChapter: !!(doc.scorecard?.nextChapter?.text && doc.scorecard.nextChapter.amount != null && doc.scorecard.nextChapter.date),
    planNotes: !!doc.program?.plan?.notes,
    reviewDate: !!doc.program?.plan?.reviewDate,
    moneyDate: !!doc.program?.plan?.moneyDate,
    graduationReport: !!doc.program?.graduation?.at,
    finalSnapshot: (doc.snapshots || []).some(s => s.graduation),
  };
}
// Where each auto item is worked on (the checklist's Open link, the tracker's jump).
const ITEM_ROUTE = { accountsSetUp: '#/net-worth/assets', moneyInOneLine: '#/cash-flow/income', bigCategories: '#/cash-flow/budget', goalsNamed: '#/plan/goals', fooStep: '#/plan/foo',
  monthOfActuals: '#/cash-flow/close', shortGoals: '#/plan/goals', longGoals: '#/plan/goals', allRated: '#/plan/scorecard', holesRanked: '#/plan/scorecard', fooConfirmed: '#/plan/scorecard',
  top3Chosen: '#/plan/scorecard', rescored: '#/plan/scorecard', nextChapter: '#/home/session', planNotes: '#/home/session', reviewDate: '#/home/session', moneyDate: '#/home/session',
  graduationReport: '#/home/session', finalSnapshot: '#/home/session' };

// The twelve sessions with their names, checklists and where each stands. doc.program holds the coach's own ticks
// (checks[session][item]) and any renamed placeholder session or edited checklist (sessions[session]).
export function sessionsOf(doc, ref, opts = {}) {
  const now = opts.now ?? new Date();
  const picture = opts.picture ?? pictureOf(doc, ref, { now });
  const sc = opts.sc ?? scorecardOf(doc, ref, { now, flags: opts.flags });
  const auto = autoChecks(doc, ref, { ...opts, now, picture, sc });
  const prog = doc.program || {};
  const count = sessionOf(doc).count || 0;
  const n = sessionNo(doc);
  const clear = sc.open.length === 0; // answer 137: only a hole blocks the next chapter (unrated areas get a nudge; parked holes wait)
  const nextRoute = nextSmallThings(picture, 1)[0]?.route ?? null;
  const areasOpen = picture.items.find(it => it.id === 'areas')?.level === 0;
  const routeOf = (key, target) => (key === 'holeFilled' ? target?.route ?? '#/plan/scorecard' : key === 'accountsSetUp' && areasOpen ? '#/home/profile'
    : ['topLine', 'keyNumbersLocked', 'picture90'].includes(key) ? nextRoute : ITEM_ROUTE[key] ?? null);
  const targetFor = sid => (SESSIONS.find(x => x.id === sid)?.hole ? sc.areas.find(a => a.id === targetOf(doc, sid, sc)) ?? null : null);
  return SESSIONS.map((s, i) => {
    const over = prog.sessions?.[s.id] || {};
    const base = s.itemsWhenClear && clear ? s.itemsWhenClear : s.items;
    const target = targetFor(s.id);
    const own = (over.items ?? base).map(it => {
      const key = base.find(b => b.id === it.id)?.auto ?? null;
      const done = key === 'holeFilled' ? auto.holeFilled(s.id) : key ? !!auto[key] : !!prog.checks?.[s.id]?.[it.id];
      const detail = key === 'holeFilled' ? (target ? `${target.name}: ${target.rating ?? 'not rated'}` : 'No hole left') : null;
      return { id: it.id, label: it.label, auto: !!key, key, done, detail, from: s.id, carried: false, route: routeOf(key, target) };
    });
    // A Must do item carried over from the session before (answer 141) ticks the same way, from its own session.
    const carried = (prog.carried?.[s.id] || []).filter(c => c.must).map(c => {
      const key = c.key ?? null, t = targetFor(c.from);
      const done = key === 'holeFilled' ? auto.holeFilled(c.from) : key ? !!auto[key] : !!prog.checks?.[s.id]?.[`${c.from}:${c.id}`];
      return { id: `${c.from}:${c.id}`, label: c.label, auto: !!key, key, done, from: c.from, carried: true, route: routeOf(key, t), detail: `carried over from session ${Number(c.from.slice(1))}` };
    });
    const items = [...own, ...carried];
    const k = i + 1;
    return { ...s, n: k, name: over.name ?? s.name, placeholder: !!s.placeholder, items, target, done: items.length > 0 && items.every(it => it.done),
      status: k <= count ? 'done' : k === n ? 'current' : 'next' };
  });
}
// The Must do items of a session still open (ending the session itself settles Day 0 and the final snapshot).
const SETTLED_BY_ENDING = new Set(['day0', 'finalSnapshot']);
export const unfinishedOf = session => session.items.filter(i => !i.done && !SETTLED_BY_ENDING.has(i.key)).map(i => ({ from: i.from, id: i.id, label: i.label, key: i.key ?? null, route: i.route ?? null }));

// ---------- The agenda: Must do, Going over, notes, links, and what is suggested for today ----------
const ym = (d = new Date()) => d;
export const homeworkAll = (doc, records) => homeworkList(doc, records);
export function setHomeworkStatus(store, key, status, { by = 'coach' } = {}) {
  if (!HOMEWORK_STATUSES.includes(status)) throw new Error(`Unknown homework status ${status}`);
  const hw = (store.doc.program?.homework || []).find(h => `hw:${h.id}` === key);
  if (hw) store.setIn('program', ['homework'], store.doc.program.homework.map(h => (h === hw ? { ...h, status, statusBy: by, statusAt: store.now() } : h)), 'Homework');
  else store.setIn('program', ['homeworkStatus', key], status === 'To do' ? undefined : { status, by, at: store.now() }, 'Homework');
}
// F2: whose homework it is (Me, Partner or Joint) on homework the coach made.
export function setHomeworkPerson(store, key, person) {
  store.setIn('program', ['homework'], (store.doc.program?.homework || []).map(h => (`hw:${h.id}` === key ? { ...h, person: person ?? undefined } : h)), 'Homework person');
}
export function makeHomework(store, sid, label, { link = null, due = null, person = null } = {}) {
  const hw = { id: store.makeId(), label, from: sid, at: store.now(), status: 'To do', statusBy: null, ...(link ? { link } : {}), ...(due ? { due } : {}), ...(person ? { person } : {}) }; // person (F2): Me, Partner or Joint
  store.setIn('program', ['homework'], [...(store.doc.program?.homework || []), hw], 'Make homework');
  return hw;
}
const agendaDoc = (doc, sid) => doc.program?.agenda?.[sid] || {};
export function addAgendaItem(store, sid, { label, link = null, key = null, from = null }) {
  const it = { id: store.makeId(), label, ...(link ? { link } : {}), ...(key ? { key } : {}), ...(from ? { from } : {}), done: false };
  store.setIn('program', ['agenda', sid, 'going'], [...(agendaDoc(store.doc, sid).going || []), it], 'Agenda');
  return it;
}
export function removeAgendaItem(store, sid, id) { store.setIn('program', ['agenda', sid, 'going'], (agendaDoc(store.doc, sid).going || []).filter(x => x.id !== id), 'Agenda'); }
export function tickAgendaItem(store, sid, id, v) { store.setIn('program', ['agenda', sid, 'going'], (agendaDoc(store.doc, sid).going || []).map(x => (x.id === id ? { ...x, done: !!v } : x)), 'Agenda'); }
export function setAgendaNote(store, sid, itemId, text) { store.setIn('program', ['agenda', sid, 'notes', itemId], text && text.trim() ? text.trim() : undefined, 'Agenda note'); }

// The session's agenda: Must do (the checklist, ticking from the numbers), Going over (the coach's items, ticking
// from the numbers when they carry a key, else by hand), per-item notes, and Suggested for today.
export function agendaOf(doc, ref, { now = new Date(), flags = [], P = programOf(doc, ref, { now, flags }) } = {}) {
  const sid = P.current.id, a = agendaDoc(doc, sid), notes = a.notes || {};
  const auto = autoChecks(doc, ref, { now, flags, picture: P.picture, m: P.m, sc: P.scorecard });
  const must = P.current.items.map(i => ({ ...i, section: 'must', note: notes[i.id] ?? null }));
  const going = (a.going || []).map(g => {
    const key = g.key ?? null, t = key === 'holeFilled' && g.from ? P.scorecard.areas.find(x => x.id === targetOf(doc, g.from, P.scorecard)) ?? null : null;
    const done = key === 'holeFilled' ? auto.holeFilled(g.from ?? sid) : key ? !!auto[key] : !!g.done;
    return { ...g, section: 'going', auto: !!key, done, note: g.note ?? notes[g.id] ?? null, link: g.link ?? (t ? { kind: 'hole', areaId: t.id, route: t.route } : null) };
  });
  const have = new Set(going.map(g => JSON.stringify(g.link ?? g.label)));
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const suggestions = [];
  const suggest = s => { if (!have.has(JSON.stringify(s.link ?? s.label))) suggestions.push(s); };
  for (const c of (doc.program?.carried?.[sid] || []).filter(c => !c.must)) suggest({ kind: 'carried', label: c.label, key: c.key ?? null, from: c.from, link: c.link ?? (c.route ? { kind: 'route', route: c.route } : null), why: `carried over from session ${Number(c.from.slice(1))}` });
  for (const hw of homeworkAll(doc, live)) if (hw.status === 'Client says done') suggest({ kind: 'homework', label: `Confirm homework: ${hw.label}`, link: { kind: 'homework', key: hw.key, route: '#/tools/lists' }, why: 'the client says it is done' });
  for (const n of (doc.parking || []).filter(n => !n.filedTo)) suggest({ kind: 'parking', label: n.text, link: { kind: 'parking', noteId: n.id }, why: 'an open parking-lot question' });
  // Parked holes that are due back (overnight answer 1): a + and a one-click Make homework.
  for (const a of P.scorecard.parkedHoles) { const b = parkedBack(a.parked, { n: P.n, now }); if (b.due) suggest({ kind: 'parked', label: `Back from parking: ${a.name}`, key: 'holeFilled', from: sid, link: { kind: 'hole', areaId: a.id, route: '#/plan/scorecard' }, why: `parked ${new Date(a.parked.at).toLocaleDateString()}${a.parked.note ? `: ${a.parked.note}` : ''}; due ${b.when}` }); }
  const top = P.scorecard.open[0];
  if (top) suggest({ kind: 'hole', label: `Top hole: ${top.name}`, key: 'holeFilled', from: sid, link: { kind: 'hole', areaId: top.id, route: '#/plan/scorecard' }, why: top.payoff ? `${Math.round(top.fiDays ?? 0)} FI days a year` : 'the top of the Scorecard' });
  // F2: what the household mode suggests (Engaged: the disclosure checklist, a money talk, a wedding goal).
  const mode = modeOf(doc.profile);
  for (const what of MODES[mode]?.suggest || []) {
    if (what === 'disclosure') for (const d of DISCLOSURE) suggest({ kind: 'mode', label: `Disclosure: ${d}`, link: { kind: 'route', route: d.startsWith('Debts') ? '#/net-worth/debt' : d.startsWith('Accounts') ? '#/net-worth/assets' : d.startsWith('Income') ? '#/cash-flow/income' : '#/net-worth/credit-cards' }, why: 'engaged: everything on the table' });
    if (what === 'moneyTalk') suggest({ kind: 'mode', label: 'Money talk: how we will run money once married', link: { kind: 'route', route: '#/home/profile' }, why: 'engaged: the mode after the wedding' });
    if (what === 'wedding' && !live.some(r => r.kind === 'milestone' && /wedding/i.test(r.name || ''))) suggest({ kind: 'mode', label: 'Add a wedding goal', link: { kind: 'route', route: '#/plan/goals' }, why: 'engaged: a date and an amount' });
  }
  const old = now.getTime() - AGENDA.staleDays * 86400000;
  for (const r of live.filter(r => ['income', 'debt', 'account', 'asset', 'bill'].includes(r.kind) && r.updatedAt && Date.parse(r.updatedAt) < old).slice(0, 5)) {
    const days = Math.floor((now.getTime() - Date.parse(r.updatedAt)) / 86400000);
    suggest({ kind: 'stale', label: `${r.name || r.type}: ${days} days old`, link: { kind: 'record', recId: r.id, route: { income: '#/cash-flow/income', debt: '#/net-worth/debt', account: '#/net-worth/assets', asset: '#/net-worth/assets', bill: '#/cash-flow/budget' }[r.kind] }, why: `older than ${AGENDA.staleDays} days` });
  }
  const all = [...must, ...going];
  return { sid, n: P.n, name: P.current.name, must, going, suggestions, notes, done: all.filter(i => i.done).length, of: all.length, open: all.filter(i => !i.done && !SETTLED_BY_ENDING.has(i.key)) };
}
export function addSuggestion(store, sid, s) { return addAgendaItem(store, sid, { label: s.label, link: s.link, key: s.key ?? null, from: s.from ?? null }); }
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
export const sessionCount = doc => sessionNo(doc); // the session being prepared or run, for callers without a ref
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
  const joy = joyOf(doc);
  return { ...keyNumbers(metrics(doc, ref, { now })), picturePct: pictureOf(doc, ref, { now }).pct, scoreOk: sc.okCount, scoreOf: sc.of, joy: joy.value, joyPartner: joy.partner, // F4: the Joy number rides in every snapshot
    scorecard: Object.fromEntries(sc.areas.map(a => [a.id, { rating: a.rating, payoff: a.payoff?.value ?? null, fiDays: a.fiDays }])) };
}

// ---------- The Joy number (F4): asked at the start of each session, one per person in a couple ----------
// Stored in doc.session.joy[n] = { at, Me, Partner }. joyOf: the latest answer (this client's, and the partner's).
export function setJoy(store, n, value, { person = 'Me', now = store.now() } = {}) {
  if (value != null && (value < JOY.min || value > JOY.max)) throw new Error(`Joy is ${JOY.min} to ${JOY.max}`);
  const cur = store.doc.session?.joy?.[String(n)] || {};
  store.setIn('session', ['joy', String(n)], { ...cur, at: now, [person]: value ?? undefined }, 'Joy');
}
export function joyOf(doc, n = null) {
  const all = Object.entries(doc.session?.joy || {}).map(([k, v]) => ({ n: Number(k), ...v })).filter(j => j.Me != null || j.Partner != null).sort((a, b) => a.n - b.n);
  const pick = n == null ? all.at(-1) : all.find(j => j.n === n);
  return { value: pick?.Me ?? null, partner: pick?.Partner ?? null, n: pick?.n ?? null, at: pick?.at ?? null, asked: n == null ? all.length > 0 : !!pick };
}
// Day 0 to now: one point per snapshot that carries a joy, plus the latest answer when it is newer than the last snapshot.
export function joyHistory(doc) {
  const pts = (doc.snapshots || []).filter(s => s.metrics && (s.metrics.joy != null || s.metrics.joyPartner != null)).map(s => ({ at: s.at, label: s.label, session: s.session ?? null, value: s.metrics.joy ?? null, partner: s.metrics.joyPartner ?? null }));
  const latest = joyOf(doc);
  if (latest.n != null && (!pts.length || latest.n > (pts.at(-1).session ?? -1))) pts.push({ at: latest.at, label: `Session ${latest.n}`, session: latest.n, value: latest.value, partner: latest.partner }); // answered this session, no snapshot yet
  const day0 = pts.find(p => /Day 0/.test(p.label)) ?? pts[0] ?? null;
  return { points: pts, day0: day0 ? day0.value : null, latest: latest.value, latestPartner: latest.partner, change: day0 && latest.value != null && day0.value != null ? latest.value - day0.value : null };
}

// Start: the session is on, Guide me is on, focus mode is on (answer 90). A hole session pulls the top hole.
export function startSession(store, ref = null, { now = new Date(), flags = [] } = {}) {
  const at = now.toISOString();
  const sid = SESSIONS[sessionNo(store.doc) - 1].id;
  const pull = SESSIONS[sessionNo(store.doc) - 1].hole && ref && !store.doc.program?.targets?.[sid];
  const top = pull ? scorecardOf(store.doc, ref, { now, flags }).open[0]?.id ?? null : null;
  store.transaction('Start session', () => {
    store.setIn('session', ['startedAt'], at);
    store.setIn('session', ['endedAt'], undefined); // a session that starts is not ended, whatever the clock says
    store.setIn('session', ['guide'], true);
    store.setIn('session', ['allFields'], false);
    if (top) store.setIn('program', ['targets', sid], top);
  });
  return { sid, target: top };
}
// End (R181), after the review gate: homework set, next session booked, the count moves on, the session's open items
// carry over to the next one, the review (confirmed numbers, Move on anyway, a note) is kept on the session record,
// and a snapshot is saved: Day 0 the first time, End of session N after, Graduation at the end. The snapshot stays
// in the client file, so it exports and imports with everything else.
export function endSession(store, ref, { homework = [], next = null, now = new Date(), flags = [], note = null, confirmed = [], decisions = {} } = {}) {
  const at = now.toISOString();
  const s = sessionOf(store.doc);
  const n = (s.count || 0) + 1;
  const first = !day0Of(store.doc);
  const A = agendaOf(store.doc, ref, { now, flags });
  const cur = A.must.length || A.going.length ? { id: A.sid, items: A.must } : sessionsOf(store.doc, ref, { now, flags })[n - 1];
  // Each open item carries over (the default) or becomes homework (decisions[id] = 'homework').
  const open = A.open.map(i => ({ from: i.from ?? A.sid, id: i.carried ? i.id.slice(i.from.length + 1) : i.id, label: i.label, key: i.key ?? null, route: i.route ?? i.link?.route ?? null, link: i.link ?? null, must: i.section === 'must' }));
  const toHomework = open.filter(i => decisions[i.id] === 'homework');
  const carry = open.filter(i => decisions[i.id] !== 'homework');
  const nextSid = SESSIONS[n]?.id ?? null;
  store.transaction('End session', () => {
    store.setIn('session', ['homework'], homework);
    store.setIn('session', ['homeworkAt'], at);
    store.setIn('session', ['onePagerAt'], at);
    if (next) store.setIn('session', ['next'], next);
    store.setIn('session', ['endedAt'], at);
    store.setIn('session', ['guide'], false);
    store.setIn('session', ['count'], n);
    if (nextSid) store.setIn('program', ['carried', nextSid], carry.length ? carry : undefined);
    for (const i of toHomework) makeHomework(store, A.sid, i.label, { link: i.link });
    store.setIn('program', ['reviews', cur.id], { at, movedOnAnyway: open.length > 0, carried: carry.map(o => o.label), homework: toHomework.map(o => o.label), confirmed, ...(note ? { note } : {}) });
    // The recap: the agenda and its notes as they stood when the session ended.
    store.setIn('program', ['recaps', cur.id], { at, n, name: A.name, must: A.must.map(i => ({ label: i.label, done: i.done, note: i.note })), going: A.going.map(i => ({ label: i.label, done: i.done, note: i.note })),
      carried: carry.map(o => o.label), homework: toHomework.map(o => o.label), ...(note ? { note } : {}) });
  });
  const graduation = n >= SESSIONS.length;
  const snap = store.snapshot(first ? 'Day 0' : graduation ? 'Graduation' : `End of session ${n}`, snapshotNumbers(store.doc, ref, { now, flags }),
    { session: n, layers: layerSnapshot(store.doc, ref, now), ...(first ? { day0: true } : {}), ...(graduation ? { graduation: true } : {}) });
  return { n, snap, first, carried: carry, homework: toHomework, graduation };
}

// The review gate: the key numbers this session looks at before it ends (REVIEW in js/registry/program.js), each
// with its value and level; Looks right locks a row to Actual, Edit opens the field. The open checklist items are
// listed as what will carry over.
export function reviewOf(doc, ref, { now = new Date(), flags = [], since = null } = {}) {
  const picture = pictureOf(doc, ref, { now });
  const sessions = sessionsOf(doc, ref, { now, flags, picture });
  const n = sessionNo(doc), cur = sessions[n - 1];
  const groups = REVIEW.groups[cur.id] ?? REVIEW.fallback;
  const rec = id => doc.records.find(r => r.id === id) ?? null;
  // since (the Revisit session's end, answer 143): only the numbers touched during the session.
  const touched = it => !since || (it.recId && Date.parse(rec(it.recId)?.updatedAt ?? 0) >= Date.parse(since)) || (it.lines || []).some(l => Date.parse(rec(l.id)?.updatedAt ?? 0) >= Date.parse(since));
  const rows = picture.items.filter(it => groups.includes(it.group) && touched(it)).map(it => {
    const r = it.recId ? rec(it.recId) : null;
    let value;
    if (it.kind === 'category') value = `${it.lines.length} ${it.lines.length === 1 ? 'line' : 'lines'}, ${fmt.money(it.lines.reduce((s, l) => s + (l.amount ?? 0), 0))} a month`;
    else if (it.kind === 'gut' || (r && it.field)) { const v = r ? (it.field in r && it.field !== 'values' ? r[it.field] : r.values?.[it.field]) : null; value = v == null ? 'Not entered' : it.field === 'apr' ? fmt.pct(v) : fmt.money(v); }
    else value = it.level > 0 ? 'In' : 'Not entered';
    const lockIds = it.kind === 'category' ? it.lines.map(l => l.id) : it.recId ? [it.recId] : [];
    return { id: it.id, label: it.label, group: it.group, level: it.level, word: levelWord(it.level), value, recId: it.recId ?? null, field: it.field ?? null, route: it.route, focus: it.focus ?? null,
      lockIds, canLock: lockIds.length > 0 && it.level > LEVELS.Missing && it.level < LEVELS.Actual, locked: it.level >= LEVELS.Actual };
  });
  const A = agendaOf(doc, ref, { now, flags });
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const saidDone = homeworkAll(doc, live).filter(h => h.status === 'Client says done');
  return { sid: cur.id, n, name: cur.name, session: cur, rows, unfinished: A.open, agenda: A, saidDone, nextSid: SESSIONS[n]?.id ?? null, nextName: SESSIONS[n]?.name ?? null, groups };
}
// Looks right: the row's numbers are confirmed, so they count as Actual from now on.
export function confirmRow(store, row) {
  store.transaction('Looks right', () => { for (const id of row.lockIds) store.update(id, { locked: true }); });
}

// The session tracker (every tab while a session runs): the session, how many items are done, and each item with
// where it is worked on.
export function trackerOf(doc, ref, { now = new Date(), flags = [] } = {}) {
  if (!inSession(doc)) return null;
  const P = programOf(doc, ref, { now, flags });
  const s = P.current;
  return { n: P.n, name: s.name, done: s.items.filter(i => i.done).length, of: s.items.length, items: s.items, picture: P.picture };
}
// The Revisit session (S9) re-scores through the review gate: done there marks the scorecard re-scored.
export function markRescored(store, { now = new Date() } = {}) { store.setIn('scorecard', ['reviewedAt'], now.toISOString(), 'Re-scored'); }
// A hole parked by the coach (answer 136; overnight answer 1): not now, and when we come back. back: { kind: 'next' }
// (next session), { kind: 'sessions', n } (in n sessions) or { kind: 'date', date }; a note is optional. When it is
// due it shows in Suggested for today with a + and a one-click Make homework. Unparked the same way.
export function parkHole(store, id, opts = null) {
  const o = typeof opts === 'string' ? { note: opts } : (opts || {});
  const back = o.back && ['next', 'sessions', 'date'].includes(o.back.kind) ? o.back : { kind: 'next' };
  const n = sessionCount(store.doc);
  store.setIn('scorecard', ['areas', id, 'parked'], { at: store.now(), atSession: n, back, ...(o.note ? { note: o.note } : {}) }, 'Park it');
}
// When a parked hole comes back: due or not, and the words for it (Next session; In 2 sessions (session 7); Mar 3, 2027).
export function parkedBack(parked, { n, now = new Date() }) {
  const b = parked?.back || { kind: 'next' }, from = parked?.atSession ?? n - 1; // parked before bring-backs existed: due now
  if (b.kind === 'date') { const due = b.date ? Date.parse(`${b.date}T12:00:00`) <= now.getTime() : false; return { due, when: b.date ? new Date(`${b.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'a date', at: b.date ?? null }; }
  const target = from + (b.kind === 'sessions' ? Math.max(1, b.n ?? 1) : 1);
  return { due: n >= target, when: target === from + 1 ? `Next session (session ${target})` : `In ${target - from} sessions (session ${target})`, at: `S${target}` };
}
export function unparkHole(store, id) { store.setIn('scorecard', ['areas', id, 'parked'], undefined, 'Unpark'); }
// A locked FOO step unlocked anyway by the coach, with a required note kept on the session record.
export function overrideStep(store, stepId, note) {
  if (!note || !String(note).trim()) throw new Error('An unlock needs a note.');
  store.setIn('program', ['overrides', stepId], { at: store.now(), note: String(note).trim(), session: sessionNo(store.doc) }, 'Unlock anyway');
}
export function clearOverride(store, stepId) { store.setIn('program', ['overrides', stepId], undefined, 'Lock again'); }

// The Day 0 vs graduation report (S12): the key numbers then and now, the areas, the holes filled; kept on the file.
export function graduationReport(doc, ref, { now = new Date(), flags = [] } = {}) {
  const rep = day0Report(doc, ref, { now });
  const sc = scorecardOf(doc, ref, { now, flags });
  return { at: now.toISOString(), day0At: rep?.at ?? null, rows: rep?.rows ?? [], okCount: sc.okCount, of: sc.of, day0Ok: day0Of(doc)?.metrics?.scoreOk ?? null, filled: filledHoles(doc, sc).map(f => ({ id: f.id, name: f.name, to: f.to, fiDays: f.fiDays })) };
}

// Day 0 against now, for the Revisit session (S9) and the strip: each key number then and now.
export function day0Report(doc, ref, { now = new Date() } = {}) {
  const d0 = day0Of(doc);
  if (!d0) return null;
  const then = d0.metrics || {};
  const nowNumbers = snapshotNumbers(doc, ref, { now });
  const rows = [['Net worth', 'netWorth', 'money'], ['Total debt', 'debtTotal', 'money'], ['Monthly surplus', 'surplus', 'money'], ['Savings rate', 'savingsRate', 'pct'], ['Picture', 'picturePct', 'pct'], ['Areas Strong or OK', 'scoreOk', 'count'], [JOY.label, 'joy', 'count']]
    .map(([label, key, unit]) => ({ label, key, unit, then: then[key] ?? null, now: nowNumbers[key] ?? null, change: then[key] == null || nowNumbers[key] == null ? null : nowNumbers[key] - then[key] }));
  return { at: d0.at, rows };
}
