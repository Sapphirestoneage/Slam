// Overnight G: the full walkthrough, S1 to S12, on one synthetic client; then S1 to S5 on a couple at -$40k switching
// modes. Every piece built this week in one run. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, exportFile, importInto } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { programOf, startSession, endSession, agendaOf, addAgendaItem, addSuggestion, sessionsOf, reviewOf, confirmRow, makeHomework, setHomeworkStatus, homeworkAll,
  parkHole, parkedBack, overrideStep, clearOverride, setJoy, joyHistory, graduationReport, sessionCount, snapshotNumbers, markRescored } from '../js/program.js';
import { scorecardOf } from '../js/math/scorecard.js';
import { foo } from '../js/math/foo.js';
import { layersOf, recordDip, layerHistory, layerSnapshot } from '../js/math/layers.js';
import { ladderOf } from '../js/math/ladder.js';
import { nextCheck } from '../js/checks.js';
import { changeLog } from '../js/capture.js';
import { setHouseholdMode } from '../js/couples.js';
import { metrics } from '../js/math/metrics.js';
import { AGENDA } from '../js/registry/program.js';
import { RULES } from '../js/registry/assumptions.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const flags = JSON.parse(readFileSync(new URL('../data/flags.json', import.meta.url)));
const DAY = 86400000;
const start = new Date('2026-11-05T12:00:00Z');

// A clock the store follows: each session is a month apart.
function clock() { let t = start; return { get now() { return t; }, set(d) { t = d; }, add(days) { t = new Date(t.getTime() + days * DAY); return t; } }; }

test('S1 to S12 on the Demo client: agenda, carry-over, homework, the gate, Move on anyway, Park it, giving, staleness, the layers, the ladder, Joy, the change log, the next chapter, graduation', () => {
  const T = clock();
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Demo walkthrough', now: T.now.toISOString() }), { now: () => T.now.toISOString() });
  const opts = () => ({ now: T.now, flags });
  // ---- S1: start, Joy, the agenda, one carried Must do item, Day 0.
  startSession(d, ref, opts());
  let P = programOf(d.doc, ref, opts());
  assert.equal(P.n, 1); assert.ok(P.inSession);
  setJoy(d, 1, 4, { now: T.now.toISOString() });
  let A = agendaOf(d.doc, ref, opts());
  assert.ok(A.must.length >= 3, 'S1 has a checklist');
  addAgendaItem(d, 'S1', { label: 'Talk about the card' });
  A = agendaOf(d.doc, ref, opts());
  assert.ok(A.going.some(g => g.label === 'Talk about the card'));
  const openMust = A.open.find(i => i.section === 'must');
  const end1 = endSession(d, ref, { ...opts(), decisions: { [A.open.find(i => i.section === 'going').id]: 'homework' } });
  assert.ok(end1.first && end1.snap.day0 && end1.snap.layers, 'Day 0 with the layers');
  assert.equal(end1.snap.metrics.joy, 4);
  // ---- S2: the carried Must do item sits on S2's Must do; the Going over item became homework.
  T.add(30); startSession(d, ref, opts());
  const s2 = sessionsOf(d.doc, ref, opts())[1];
  assert.ok(s2.items.some(i => i.carried && i.label === openMust.label), 'Must do carried onto Must do');
  const hw = homeworkAll(d.doc, d.doc.records).find(h => h.label === 'Talk about the card');
  assert.ok(hw, 'Going over became homework');
  setHomeworkStatus(d, hw.key, 'Client says done', { by: 'coach' });
  let R = reviewOf(d.doc, ref, opts());
  assert.ok(R.saidDone.some(h => h.key === hw.key), 'the gate lists homework the client says is done');
  setHomeworkStatus(d, hw.key, 'Confirmed', { by: 'coach' });
  assert.ok(!homeworkAll(d.doc, d.doc.records).some(h => h.key === hw.key && h.status !== 'Confirmed'));
  const lockable = R.rows.find(r => r.canLock);
  if (lockable) { confirmRow(d, lockable); assert.ok(reviewOf(d.doc, ref, opts()).rows.find(r => r.id === lockable.id)?.locked, 'Looks right locks the row'); }
  // Move on anyway with a note.
  setJoy(d, 2, 5, { now: T.now.toISOString() });
  endSession(d, ref, { ...opts(), note: 'Ran out of time' });
  assert.equal(d.doc.program.reviews.S2.note, 'Ran out of time');
  assert.equal(d.doc.program.reviews.S2.movedOnAnyway, true);
  // ---- S3: Park it with a bring-back next session; a dip into the layers; staleness.
  T.add(30); startSession(d, ref, opts());
  const sc3 = scorecardOf(d.doc, ref, opts());
  const parkedId = sc3.holes.at(-1).id;
  parkHole(d, parkedId, { note: 'After the move', back: { kind: 'next' } });
  assert.ok(!agendaOf(d.doc, ref, opts()).suggestions.some(s => s.kind === 'parked'), 'not due yet');
  const L3 = layersOf(d.doc, ref, T.now);
  assert.ok(L3.bufferFull && L3.littleFull);
  const checking = d.find(r => r.kind === 'account' && r.values.group === 'cash')[0];
  const dip = recordDip(d, { amount: 2000, note: 'Car repair', now: T.now.toISOString(), layers: L3.layers, accountId: checking.id });
  assert.deepEqual(dip.from.map(f => f.layer), ['buffer', 'little-e'], 'Buffer first, then little e; big e untouched');
  // A Rough row is due for a check 30 days after it changed; an old number is suggested on the agenda after 60.
  const roughRow = d.find(r => r.kind === 'debt')[0];
  d.setStatus([roughRow.id], 'Roughly');
  const chk = nextCheck(d.doc.records.find(r => r.id === roughRow.id), { now: T.now });
  assert.equal(chk.next, new Date(T.now.getTime() + RULES.roughCheckDays * DAY).toISOString().slice(0, 10), `rough: ${RULES.roughCheckDays} days`);
  setJoy(d, 3, 5, { now: T.now.toISOString() });
  endSession(d, ref, opts());
  // ---- S4: the parked hole is due; the layers refill; staleness at 60 days.
  T.add(61); startSession(d, ref, opts());
  let sg = agendaOf(d.doc, ref, opts()).suggestions;
  assert.ok(sg.some(s => s.kind === 'parked'), 'back from parking, on time');
  assert.ok(sg.some(s => s.kind === 'stale'), `numbers older than ${AGENDA.staleDays} days are suggested`);
  addSuggestion(d, 'S4', sg.find(s => s.kind === 'parked'));
  d.update(checking.id, { balance: checking.values.balance });
  d.snapshot('Refilled', snapshotNumbers(d.doc, ref, opts()), { layers: layerSnapshot(d.doc, ref, T.now) });
  const H = layerHistory(d.doc, ref, T.now);
  assert.equal(H.stats.dips, 1); assert.equal(H.stats.deepest.layer, 'little-e'); assert.ok(H.stats.refillMonths >= 1 && H.stats.refillMonths <= 3, `refilled in ${H.stats.refillMonths} months`);
  assert.ok(H.points.length >= 3);
  setJoy(d, 4, 6, { now: T.now.toISOString() });
  endSession(d, ref, opts());
  // ---- S5: giving locked while heavy debt exists; unlocked after payoff; overridden in a second run.
  T.add(30); startSession(d, ref, opts());
  d.setDoc('profile', { giving: { on: true, mode: 'amount', amount: 100 } });
  let F = foo(d.doc, ref, opts());
  assert.equal(F.steps.find(s => s.id === '5b').status, 'Locked');
  overrideStep(d, '5b', 'Tithes first, by choice');
  F = foo(d.doc, ref, opts());
  assert.notEqual(F.steps.find(s => s.id === '5b').status, 'Locked');
  assert.ok(F.steps.find(s => s.id === '5b').cost.fiDays > 0, 'the override shows its cost');
  clearOverride(d, '5b');
  const ladderBefore = ladderOf(d.doc, ref, opts());
  assert.ok(ladderBefore.steps.some(s => s.share === 1 && !s.done));
  for (const r of d.find(r => r.kind === 'debt')) d.update(r.id, { balance: 0 });
  F = foo(d.doc, ref, opts());
  assert.notEqual(F.steps.find(s => s.id === '5b').status, 'Locked', 'open once heavy debt is paid off');
  const ladder = ladderOf(d.doc, ref, opts());
  assert.ok(ladder.steps.filter(s => s.share != null).every(s => s.done), 'every heavy-debt step done');
  assert.ok(ladder.markers.find(k => k.id === 'consumerFree').reached, 'the marker slots in as reached');
  assert.ok(ladder.wins > ladderBefore.wins);
  setJoy(d, 5, 7, { now: T.now.toISOString() });
  endSession(d, ref, opts());
  // ---- S6 to S8: hole sessions pull the top hole; the coach fills every hole by the end of S8.
  for (const n of [6, 7, 8]) {
    T.add(30); startSession(d, ref, opts());
    const sid = `S${n}`;
    assert.ok(d.doc.program.targets[sid] || scorecardOf(d.doc, ref, opts()).open.length === 0, `${sid} pulled a hole or none is left`);
    setJoy(d, n, 7, { now: T.now.toISOString() });
    endSession(d, ref, opts());
  }
  for (const a of scorecardOf(d.doc, ref, opts()).areas) if (a.rating !== 'Strong') d.setIn('scorecard', ['areas', a.id], { ...(d.doc.scorecard?.areas?.[a.id] || {}), rating: 'OK', reason: 'Filled during the program' }, 'Scorecard');
  // ---- S9 Revisit: the gate opens once at start; re-scored.
  T.add(30); startSession(d, ref, opts());
  markRescored(d, opts());
  setJoy(d, 9, 8, { now: T.now.toISOString() });
  endSession(d, ref, opts());
  // ---- S10 and S11: no hole left, so the next chapter is the checklist.
  T.add(30); startSession(d, ref, opts());
  P = programOf(d.doc, ref, opts());
  assert.equal(P.scorecard.open.length, 0);
  assert.equal(P.current.items[0].id, 'chapter', 'the next chapter opens');
  d.setIn('scorecard', ['nextChapter'], { text: 'A home', amount: 60000, date: '2029-06-01' }, 'Next chapter');
  assert.ok(programOf(d.doc, ref, opts()).current.items[0].done, 'named with an amount and a date');
  setJoy(d, 10, 8, { now: T.now.toISOString() });
  endSession(d, ref, opts());
  T.add(30); startSession(d, ref, opts()); setJoy(d, 11, 9, { now: T.now.toISOString() }); endSession(d, ref, opts());
  // ---- S12 Graduation.
  T.add(30); startSession(d, ref, opts());
  setJoy(d, 12, 9, { now: T.now.toISOString() });
  const g = graduationReport(d.doc, ref, opts());
  assert.ok(g.rows.find(r => r.key === 'joy').then === 4 && g.rows.find(r => r.key === 'netWorth').now > g.rows.find(r => r.key === 'netWorth').then, 'Day 0 against now');
  const last = endSession(d, ref, opts());
  assert.ok(last.graduation && last.snap.graduation, 'the final snapshot');
  assert.ok(programOf(d.doc, ref, opts()).graduated);
  // ---- Across the run: Joy charted Day 0 to now, the change log with who, the file round-trips.
  const J = joyHistory(d.doc);
  assert.equal(J.day0, 4); assert.equal(J.latest, 9); assert.ok(J.points.length >= 12);
  const log = changeLog(d.doc, { limit: 2000 });
  assert.ok(log.length > 50 && log.every(e => e.who === 'Coach' && e.at));
  const t = new Store(newHousehold({ name: 'T', now: T.now.toISOString() }));
  importInto(t, JSON.parse(JSON.stringify(exportFile(d.doc))));
  assert.equal(t.doc.snapshots.filter(x => x.label !== 'Before import').length, d.doc.snapshots.length);
  assert.equal(joyHistory(t.doc).latest, 9);
});

test('S1 to S5 on a couple at -$40k with mixed tags and three debts, switching Dating to Engaged to Married merged with no data loss', () => {
  const T = clock();
  const d = new Store(newHousehold({ name: 'Ada Example', now: T.now.toISOString() }), { now: () => T.now.toISOString() });
  const opts = () => ({ now: T.now, flags });
  d.transaction('x', () => {
    d.setDoc('profile', { firstName: 'Ada', partnerName: 'Bo', age: 31, state: 'TX', incomeStability: 'Steady', areas: { debt: true } });
    d.add('income', { name: 'Ada job', amount: 4500, per: 'month', owner: 'Me', values: {} }, { type: 'Job' });
    d.add('income', { name: 'Bo job', amount: 3200, per: 'month', values: {} }, { type: 'Partner job' });
    d.add('spending', { name: 'Gut', amount: 5200, values: { includesDebtPayments: true } }, { type: 'All in' });
    d.add('account', { name: 'Ada checking', owner: 'Me', values: { group: 'cash', balance: 2000 } }, { type: 'Checking' });
    d.add('account', { name: 'Bo checking', owner: 'Partner', values: { group: 'cash', balance: 1500 } }, { type: 'Checking' });
    d.add('account', { name: 'Joint savings', owner: 'Joint', values: { group: 'cash', balance: 3000 } }, { type: 'Savings' });
    d.add('account', { name: 'Bo 401k', owner: 'Partner', values: { group: 'investment', balance: 9000 } }, { type: '401(k)' });
    d.add('debt', { name: 'Ada card', owner: 'Me', values: { balance: 9500, apr: 0.24, payment: 300, limit: 10000, hassle: 4 } }, { type: 'Credit card' });
    d.add('debt', { name: 'Bo loan', owner: 'Partner', values: { balance: 26000, apr: 0.07, payment: 400, hassle: 2 } }, { type: 'Student loan' });
    d.add('debt', { name: 'Car', owner: 'Joint', values: { balance: 20000, apr: 0.06, payment: 380, hassle: 1 } }, { type: 'Car loan' });
  });
  setHouseholdMode(d, 'Dating');
  const nw0 = metrics(d.doc, ref, { now: T.now }).netWorth.value;
  assert.ok(nw0 < -39000 && nw0 > -41000, `start about -$40k: ${nw0}`);
  const fingerprint = () => JSON.stringify(d.doc.records.map(r => [r.id, r.owner ?? null, r.values.balance ?? r.amount ?? null, r.values.hassle ?? null]));
  const before = fingerprint();
  // S1 (Dating): own view by default; both answer Joy.
  startSession(d, ref, opts());
  setJoy(d, 1, 3, { now: T.now.toISOString() }); setJoy(d, 1, 6, { person: 'Partner', now: T.now.toISOString() });
  assert.equal(d.doc.settings.person, 'Me');
  assert.equal(metrics(d.doc, ref, { now: T.now, person: 'Me' }).netWorth.value, 2000 + 1500 - 9500 - 10000, 'Joint rows at half in one person\'s view (answer 157)');
  const ladder = ladderOf(d.doc, ref, opts());
  // Batch 20: in Dating the ladder is Ada's own plan, as Home and Plan show it (her own month is short, so no date yet).
  const nwz = ladder.markers.find(k => k.id === 'nwZero');
  assert.ok(!nwz.reached && nwz.value === 2000 + 1500 - 9500 - 10000, 'net worth positive is a marker ahead, on her own numbers');
  const e1 = endSession(d, ref, opts());
  assert.deepEqual([e1.snap.metrics.joy, e1.snap.metrics.joyPartner], [3, 6]);
  // S2 (Engaged): the merge preview, the disclosure checklist suggested.
  T.add(30); setHouseholdMode(d, 'Engaged'); startSession(d, ref, opts());
  assert.equal(fingerprint(), before, 'nothing lost on the switch');
  assert.ok(agendaOf(d.doc, ref, opts()).suggestions.filter(s => s.kind === 'mode').length >= 5);
  assert.equal(d.doc.profile.filingStatus, undefined, 'the mode never sets the filing status (answer 155)');
  setJoy(d, 2, 4, { now: T.now.toISOString() }); endSession(d, ref, opts());
  // S3 (Married merged): together by default, filing jointly, an untagged new account is Joint.
  T.add(30); setHouseholdMode(d, 'Married merged'); startSession(d, ref, opts());
  assert.equal(fingerprint(), before, 'nothing lost on the second switch');
  assert.equal(d.doc.settings.person, 'all');
  assert.equal(d.doc.profile.filingStatus, undefined);
  assert.equal(metrics(d.doc, ref, { now: T.now }).netWorth.value, nw0);
  const sc = scorecardOf(d.doc, ref, opts());
  assert.equal(sc.areas.find(a => a.id === 'debt').rating, 'Hole');
  assert.equal(sc.areas.find(a => a.id === 'debt').route, '#/plan/debt-payoff', 'the Debt hole links to the payoff methods');
  setJoy(d, 3, 5, { now: T.now.toISOString() }); endSession(d, ref, opts());
  // S4 and S5: the three debts across methods.
  T.add(30); startSession(d, ref, opts());
  const ds = metrics(d.doc, ref, { now: T.now }).inputs.debts;
  const { payoffPlan } = ladderDebtsHelper();
  assert.equal(payoffPlan(ds, { order: 'avalanche' }).debts[0].name, 'Ada card');
  assert.equal(payoffPlan(ds, { order: 'snowball' }).debts[0].name, 'Ada card');
  assert.equal(payoffPlan(ds, { order: 'hassle' }).debts[0].name, 'Ada card');
  assert.equal(payoffPlan(ds, { order: 'snowball' }).debts[1].name, 'Car');
  endSession(d, ref, opts());
  T.add(30); startSession(d, ref, opts()); endSession(d, ref, opts());
  assert.equal(sessionCount(d.doc), 6);
  assert.equal(d.doc.snapshots.filter(s => s.session).length, 5);
  assert.equal(d.doc.snapshots.find(x => x.day0).metrics.joyPartner, 6, 'the partner\'s Joy is kept on Day 0');
});
// payoffPlan without a top-level import clash.
import { payoffPlan as _pp } from '../js/math/debt.js';
function ladderDebtsHelper() { return { payoffPlan: _pp }; }
