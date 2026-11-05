// Phase 3, batch 2: the Scorecard, the holes and sessions 4 to 12. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, exportFile, importInto } from '../js/records.js';
import { scorecardOf, goalsOf, ratingOf } from '../js/math/scorecard.js';
import { AREAS, THRESHOLDS, PAYOFF, RATINGS } from '../js/registry/scorecard.js';
import { MONEY_DATES, SESSIONS } from '../js/registry/program.js';
import { sessionsOf, programOf, startSession, endSession, snapshotNumbers, filledHoles, afterIntake, targetOf } from '../js/program.js';
import { metrics } from '../js/math/metrics.js';
import { householdFromInputs } from '../js/demo.js';
import { buildWorkbook } from '../js/sheet/workbook.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const fresh = () => new Store(newHousehold({ name: 'Synthetic', now: now.toISOString() }), { now: () => now.toISOString() });
const demoStore = () => new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });
const area = (sc, id) => sc.areas.find(a => a.id === id);

test('eleven areas in one config, three ratings; an empty client is unrated except where a rule can say', () => {
  assert.equal(AREAS.length, 11);
  assert.deepEqual(AREAS.map(a => a.name), ['Cash flow', 'Emergency fund', 'Debt', 'Credit', 'Retirement accounts', 'Investing', 'Taxes', 'Protection', 'Income', 'Goals', 'Mindset']);
  assert.deepEqual(RATINGS, ['Strong', 'OK', 'Hole']);
  const sc = scorecardOf(fresh().doc, ref, { now });
  assert.equal(sc.of, 11);
  assert.equal(area(sc, 'taxes').source, 'unrated');
  assert.equal(area(sc, 'goals').rating, 'Hole', 'no goals named is a hole the data can see');
  assert.equal(sc.okCount, 0);
});

test('rules: the Demo client (card at 22%, nothing to retirement, 1.7 months of cash, 25% saved)', () => {
  const sc = scorecardOf(demoStore().doc, ref, { now });
  assert.equal(area(sc, 'cashFlow').rating, 'Strong');
  assert.equal(area(sc, 'emergency').rating, 'OK');
  assert.match(area(sc, 'emergency').reason, /1\.7 months/);
  assert.equal(area(sc, 'debt').rating, 'Hole');
  assert.match(area(sc, 'debt').reason, /heavy debt/);
  assert.equal(area(sc, 'retirement').rating, 'Hole');
  assert.equal(area(sc, 'investing').rating, 'Strong');
  assert.equal(area(sc, 'credit').source, 'unrated', 'no score and no limits');
  assert.equal(sc.here, '3');
});

test('thresholds in config: emergency fund under a month is a Hole; a score under 670 is a Hole; the feeling rates Mindset', () => {
  const s = fresh();
  s.setDoc('profile', { age: 30, areas: { cash: true, investments: false, real: false, debt: false }, credit: { score: 650 } });
  s.add('income', { name: 'Job', amount: 4000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  s.add('spending', { name: 'All in', amount: 3000 }, { type: 'All in' });
  s.add('account', { name: 'Checking', values: { group: 'cash', balance: 2000 } }, { type: 'Checking' });
  s.setIn('session', ['feelings', '1'], 3, 'Money feeling');
  s.update(s.find(r => r.kind === 'account')[0].id, { balance: 600 }); // under little e
  let sc = scorecardOf(s.doc, ref, { now });
  assert.equal(area(sc, 'emergency').rating, 'Hole'); assert.match(THRESHOLDS.emergency.strong, /age \/ 5/);
  assert.equal(area(sc, 'credit').rating, 'Hole');
  assert.equal(area(sc, 'mindset').rating, 'Hole');
  assert.equal(area(sc, 'debt').rating, 'Strong', 'no debt, per About you');
  s.update(s.find(r => r.kind === 'account')[0].id, { balance: 21000 }); // the Buffer ($1,385), little e and big e (age 30: 6 months, $18,000) full
  s.setDoc('profile', { credit: { score: 760 } });
  s.setIn('session', ['feelings', '2'], 8, 'Money feeling');
  sc = scorecardOf(s.doc, ref, { now });
  assert.equal(area(sc, 'emergency').rating, 'Strong');
  assert.equal(area(sc, 'credit').rating, 'Strong');
  assert.equal(area(sc, 'mindset').rating, 'Strong');
});

test('the coach overrides a rating with a reason, and Auto puts the numbers back; it lives in the client file and undoes', () => {
  const d = demoStore();
  d.setIn('scorecard', ['areas', 'debt'], { rating: 'OK', reason: 'A 0% balance transfer is set up' }, 'Scorecard');
  let sc = scorecardOf(d.doc, ref, { now });
  assert.equal(area(sc, 'debt').rating, 'OK'); assert.equal(area(sc, 'debt').source, 'coach'); assert.match(area(sc, 'debt').reason, /balance transfer/);
  assert.equal(area(sc, 'debt').auto.rating, 'Hole', 'the numbers still say what they say');
  d.setIn('scorecard', ['areas', 'taxes'], { rating: 'Strong', reason: 'Withholding checked' }, 'Scorecard');
  sc = scorecardOf(d.doc, ref, { now });
  assert.equal(area(sc, 'taxes').rating, 'Strong');
  d.undo(); d.undo();
  assert.equal(scorecardOf(d.doc, ref, { now }).areas.find(a => a.id === 'debt').rating, 'Hole');
});

test('holes: payoff a year with its math, FI days and hours, effort (editable), best return, ranked before the FOO step first', () => {
  const d = demoStore();
  const sc = scorecardOf(d.doc, ref, { now });
  const debt = area(sc, 'debt'), ret = area(sc, 'retirement');
  assert.ok(Math.abs(debt.payoff.value - 4200 * 0.2215) < 1, 'interest a year on the card');
  assert.match(debt.payoff.text, /\$4,200 at 22\.2%/);
  const m = metrics(d.doc, ref, { now });
  assert.ok(Math.abs(debt.fiDays - debt.payoff.value / (m.annualSpending / 365)) < 1e-6, 'FI days from M58');
  assert.ok(debt.hours > 0);
  assert.equal(debt.effort, AREAS.find(a => a.id === 'debt').effort);
  assert.ok(Math.abs(debt.score - debt.payoff.value / debt.effort) < 1e-9);
  assert.ok(!ret.beforeHere && !debt.beforeHere, 'no match on file: retirement sits at step 5, after step 3; debt is the step itself');
  assert.ok(area(sc, 'goals').beforeHere, 'goals sit at step 0, before step 3, but with no payoff they rank last');
  assert.deepEqual(sc.holes.map(h => h.id), ['retirement', 'debt', 'goals'], 'best return first; no payoff last');
  assert.deepEqual(sc.holes.map(h => h.rank), [1, 2, 3]);
  assert.ok(debt.math.some(t => /Best return/.test(t)) && debt.math.some(t => /FOO step 3/.test(t)));
  // Effort and a typed payoff for an area with no rule.
  d.setIn('scorecard', ['areas', 'debt'], { effort: 10 }, 'Scorecard');
  d.setIn('scorecard', ['areas', 'goals'], { payoff: 1200 }, 'Scorecard');
  const sc2 = scorecardOf(d.doc, ref, { now });
  assert.equal(area(sc2, 'debt').effort, 10); assert.equal(area(sc2, 'debt').effortSet, true);
  assert.equal(area(sc2, 'goals').payoff.value, 1200); assert.equal(area(sc2, 'goals').payoff.typed, true);
  assert.deepEqual(sc2.holes.map(h => h.id), ['goals', 'retirement', 'debt'], 'goals (step 0, before step 3) ranks first once it has a payoff; debt last at 10 hours');
  assert.equal(PAYOFF.credit.aprPoints, 0.02);
});

test('goals (S4): a milestone is complete with a horizon, a tag, an amount and a date; three and three is Strong', () => {
  const d = demoStore();
  let g = goalsOf(d.doc, ref, metrics(d.doc, ref, { now }), now);
  assert.equal(g.short, 0);
  const add = (name, horizon, tag, amount, date) => d.add('milestone', { name, amount, values: { mode: 'date', date, horizon, tag } }, { type: 'Custom' });
  add('Trip', 'Short term', 'Want', 2000, '2027-06-01'); add('Laptop', 'Short term', 'Need', 1500, '2027-03-01'); add('Course', 'Short term', 'Wish', 800, '2027-09-01');
  add('House', 'Long term', 'Need', 60000, '2031-01-01'); add('Sabbatical', 'Long term', 'Wish', 20000, '2033-01-01');
  d.add('milestone', { name: 'Coast FI', values: { mode: 'when', horizon: 'Long term', tag: 'Need' } }, { type: 'Coast FI' }); // the target and the projected month count
  g = goalsOf(d.doc, ref, metrics(d.doc, ref, { now }), now);
  assert.equal(g.short, 3); assert.equal(g.long, 3);
  const sc = scorecardOf(d.doc, ref, { now });
  assert.equal(area(sc, 'goals').rating, 'Strong');
  const list = sessionsOf(d.doc, ref, { now });
  assert.deepEqual(list[3].items.map(i => i.done), [true, true]);
  assert.equal(list[3].name, 'Goals');
});

test('S5 full analysis: every area rated, holes ranked, the FOO step confirmed, the top 3 chosen', () => {
  const d = demoStore();
  let s5 = sessionsOf(d.doc, ref, { now })[4];
  assert.equal(s5.name, 'Full analysis');
  assert.deepEqual(s5.items.map(i => [i.id, i.done]), [['rated', false], ['ranked', false], ['foo', false], ['top3', false]]);
  for (const id of ['credit', 'taxes', 'protection', 'income', 'mindset']) d.setIn('scorecard', ['areas', id], { rating: 'OK', reason: 'Looked at it' }, 'Scorecard');
  d.setIn('scorecard', ['areas', 'goals'], { payoff: 500 }, 'Scorecard');
  d.setIn('program', ['fooConfirmed'], '3', 'FOO step');
  d.setIn('scorecard', ['chosen'], ['retirement', 'debt', 'goals'], 'Top holes');
  s5 = sessionsOf(d.doc, ref, { now })[4];
  assert.deepEqual(s5.items.map(i => i.done), [true, true, true, true]);
  assert.equal(s5.done, true);
});

test('S6 to S8 pull the top hole when they start and are done when it is OK or Strong; S10 and S11 switch to the next chapter', () => {
  const d = demoStore();
  d.setIn('session', ['count'], 5, 'count'); // sessions 1 to 5 ended
  const r = startSession(d, ref, { now });
  assert.equal(r.sid, 'S6'); assert.equal(r.target, 'retirement');
  assert.equal(d.doc.program.targets.S6, 'retirement');
  let s6 = sessionsOf(d.doc, ref, { now })[5];
  assert.equal(s6.target.id, 'retirement'); assert.equal(s6.items[0].done, false); assert.match(s6.items[0].detail, /Retirement accounts: Hole/);
  d.setIn('scorecard', ['areas', 'retirement'], { rating: 'OK', reason: '6% going in from next paycheck' }, 'Scorecard');
  s6 = sessionsOf(d.doc, ref, { now })[5];
  assert.equal(s6.items[0].done, true); assert.equal(s6.done, true);
  // S7 would pull the next top hole (debt) now; a hole session with no hole left is done.
  assert.equal(targetOf(d.doc, 'S7', scorecardOf(d.doc, ref, { now })), 'debt');
  for (const id of ['debt', 'goals']) d.setIn('scorecard', ['areas', id], { rating: 'OK', reason: 'Done' }, 'Scorecard');
  let list = sessionsOf(d.doc, ref, { now });
  assert.equal(list[6].items[0].done, true); assert.equal(list[6].items[0].detail, 'No hole left');
  assert.equal(list[9].items[0].id, 'chapter', 'answer 137: only a hole blocks the next chapter; unrated areas get a nudge'); assert.equal(list[9].items[0].done, false);
  parkHole(d, 'credit');
  d.setIn('scorecard', ['areas', 'credit'], { ...d.doc.scorecard.areas.credit, rating: 'Hole', reason: 'Score 600' }, 'Scorecard');
  assert.equal(sessionsOf(d.doc, ref, { now })[9].items[0].id, 'chapter', 'a parked hole waits; it does not block');
  unparkHole(d, 'credit');
  assert.equal(sessionsOf(d.doc, ref, { now })[9].items[0].id, 'hole', 'an open hole blocks');
  d.setIn('scorecard', ['areas', 'credit'], { rating: 'OK', reason: 'Fixed' }, 'Scorecard');
  list = sessionsOf(d.doc, ref, { now });
  d.setIn('scorecard', ['nextChapter'], { text: 'A home in 2030', amount: 80000, date: '2030-06-01' }, 'Next chapter');
  list = sessionsOf(d.doc, ref, { now });
  assert.equal(list[9].items[0].done, true); assert.equal(list[10].done, true);
});

test('S9 revisit and S12 graduation tick from the data; the money date cadence comes from one list', () => {
  const d = demoStore();
  let list = sessionsOf(d.doc, ref, { now });
  assert.deepEqual(list[8].items.map(i => i.done), [false, false]);
  endSession(d, ref, { now }); // Day 0
  endSession(d, ref, { now: new Date('2026-11-19T12:00:00Z') });
  list = sessionsOf(d.doc, ref, { now });
  assert.equal(list[8].items[0].done, true, 'Day 0 and a later snapshot');
  d.setIn('scorecard', ['reviewedAt'], '2026-11-20T12:00:00Z', 'Re-scored');
  list = sessionsOf(d.doc, ref, { now });
  assert.equal(list[8].items[1].done, true);
  assert.deepEqual(list[11].items.map(i => i.done), [false, false, false, false, false]);
  d.setIn('program', ['plan'], { notes: 'Max the 401(k) match, then the Roth', reviewDate: '2027-11-01', moneyDate: MONEY_DATES[0] }, 'Game plan');
  list = sessionsOf(d.doc, ref, { now });
  assert.deepEqual(list[11].items.map(i => i.done), [false, true, true, true, false], 'the report and the final snapshot come at graduation');
  assert.ok(MONEY_DATES.length >= 4);
});

test('after intake: Home counts areas Strong or OK (with Day 0), and a filled hole shows before, after and the FI days gained', () => {
  const d = demoStore();
  let P = programOf(d.doc, ref, { now });
  assert.equal(P.afterIntake, false);
  d.setIn('session', ['count'], 3, 'count');
  P = programOf(d.doc, ref, { now });
  assert.equal(P.afterIntake, true);
  assert.equal(P.scorecard.okCount, 3); assert.equal(P.scorecard.of, 11);
  assert.equal(P.day0Ok, null, 'no Day 0 yet');
  const n = snapshotNumbers(d.doc, ref, { now });
  assert.equal(n.scoreOk, 3); assert.equal(n.scoreOf, 11); assert.equal(n.scorecard.debt.rating, 'Hole'); assert.ok(n.scorecard.debt.fiDays > 0);
  d.setIn('session', ['count'], 0, 'count');
  endSession(d, ref, { now }); // Day 0 keeps the scorecard
  d.setIn('scorecard', ['areas', 'debt'], { rating: 'OK', reason: 'Card paid down' }, 'Scorecard');
  P = programOf(d.doc, ref, { now });
  assert.equal(P.day0Ok, 3);
  assert.equal(P.filled.length, 1);
  assert.equal(P.filled[0].id, 'debt'); assert.equal(P.filled[0].from, 'Hole'); assert.equal(P.filled[0].to, 'OK'); assert.ok(P.filled[0].fiDays > 7);
  assert.equal(P.filled[0].since, 'Day 0');
});

test('the scorecard, goals and holes export and import with the client file, and the workbook has a Scorecard tab', () => {
  const d = demoStore();
  d.add('milestone', { name: 'Trip', amount: 2000, values: { mode: 'date', date: '2027-06-01', horizon: 'Short term', tag: 'Want' } }, { type: 'Custom' });
  d.setIn('scorecard', ['areas', 'taxes'], { rating: 'OK', reason: 'Checked', effort: 3 }, 'Scorecard');
  d.setIn('scorecard', ['chosen'], ['retirement'], 'Top holes');
  d.setIn('scorecard', ['nextChapter'], { text: 'Kids', amount: 10000, date: '2029-01-01' }, 'Next chapter');
  const file = JSON.stringify(exportFile(d.doc, now.toISOString()));
  const e = fresh();
  importInto(e, file);
  assert.deepEqual(e.doc.scorecard.chosen, ['retirement']);
  assert.equal(e.doc.scorecard.areas.taxes.rating, 'OK');
  assert.equal(e.doc.scorecard.nextChapter.text, 'Kids');
  assert.equal(e.find(r => r.kind === 'milestone' && r.values.tag === 'Want').length, 1);
  const plan = buildWorkbook(d.doc, ref, { now });
  const tab = plan.sheets.find(s => s.name === 'Scorecard');
  assert.ok(tab, 'a Scorecard tab');
  const text = JSON.stringify(tab.rows);
  assert.match(text, /Retirement accounts/); assert.match(text, /Holes, ranked \(2\)/, "the trip makes Goals OK"); assert.match(text, /Trip/); assert.match(text, /Kids/);
  const goals = plan.sheets.find(s => s.name === 'Goals and events');
  assert.ok(goals.rows[0].some(c => c.v === 'Need, want or wish') && goals.rows[0].some(c => c.v === 'Short or long term'));
});

// ---------- Batch 3: the gate, carry-over, parking, the FOO prerequisites ----------
import { reviewOf, confirmRow, unfinishedOf, markRescored, parkHole, unparkHole, overrideStep, clearOverride, graduationReport, trackerOf, inSession, agendaOf, addAgendaItem, setAgendaNote, addSuggestion, homeworkAll, setHomeworkStatus, makeHomework } from '../js/program.js';
import { foo } from '../js/math/foo.js';
import { PREREQS } from '../js/registry/foo.js';

test('the review gate: the stage\'s key numbers with value and level; Looks right locks them to Actual; open items carry over, labeled', () => {
  const d = demoStore();
  startSession(d, ref, { now });
  const R = reviewOf(d.doc, ref, { now });
  assert.equal(R.sid, 'S1'); assert.deepEqual(R.groups, ['income', 'spending', 'account']);
  assert.ok(R.rows.length >= 3);
  const inc0 = R.rows.find(r => r.group === 'income');
  assert.equal(inc0.word, 'Actual', 'typed and Know it counts as confirmed (item 11)'); assert.match(inc0.value, /\$4,800/); assert.equal(inc0.canLock, false);
  d.setStatus([inc0.recId], 'Roughly'); // a rough number can still be confirmed with Looks right
  const inc = reviewOf(d.doc, ref, { now }).rows.find(r => r.id === inc0.id);
  assert.equal(inc.word, 'Rough'); assert.equal(inc.canLock, true);
  confirmRow(d, inc);
  assert.equal(reviewOf(d.doc, ref, { now }).rows.find(r => r.id === inc.id).word, 'Actual');
  assert.ok(R.unfinished.some(u => u.id === 'accounts'), 'Accounts set up is still open (no areas answered)');
  assert.ok(!R.unfinished.some(u => u.key === 'day0'), 'Day 0 is settled by ending');
  // The coach adds a Going over item and a note; it is open too.
  const g = addAgendaItem(d, 'S1', { label: 'Talk through the card', link: { kind: 'route', route: '#/net-worth/credit-cards' } });
  setAgendaNote(d, 'S1', g.id, 'Still nervous about it');
  let A = agendaOf(d.doc, ref, { now });
  assert.equal(A.going.length, 1); assert.equal(A.going[0].note, 'Still nervous about it'); assert.equal(A.of, A.must.length + 1);
  // End: the card talk becomes homework, Accounts set up carries over; the recap keeps the agenda and its notes.
  const r = endSession(d, ref, { now, note: 'Accounts next time', confirmed: [inc.id], decisions: { [g.id]: 'homework' } });
  assert.deepEqual(r.carried.map(c => c.id), ['accounts']); assert.deepEqual(r.homework.map(h => h.label), ['Talk through the card']);
  const rv = d.doc.program.reviews.S1;
  assert.equal(rv.movedOnAnyway, true); assert.equal(rv.note, 'Accounts next time'); assert.deepEqual(rv.confirmed, [inc.id]);
  assert.deepEqual(rv.homework, ['Talk through the card']);
  assert.equal(d.doc.program.recaps.S1.going[0].note, 'Still nervous about it');
  const hw = homeworkAll(d.doc, d.records).find(h => h.label === 'Talk through the card');
  assert.equal(hw.status, 'To do'); assert.equal(hw.from, 'S1');
  // Session 2 (answer 141): a carried Must do item goes straight onto Must do, labeled, and ticks from the numbers.
  A = agendaOf(d.doc, ref, { now });
  const carried = A.must.find(i => i.carried);
  assert.equal(carried.label, 'Accounts set up'); assert.match(carried.detail, /carried over from session 1/); assert.equal(carried.done, false);
  assert.ok(!A.suggestions.some(s => s.kind === 'carried'), 'a Must do item is not a suggestion');
  d.setDoc('profile', { areas: { cash: true, investments: true, real: true, debt: true } });
  assert.equal(agendaOf(d.doc, ref, { now }).must.find(i => i.carried).done, true, 'answering About you settles it');
  // A carried Going over item stays a suggestion with a +.
  const g2 = addAgendaItem(d, 'S2', { label: 'Talk through the car' });
  endSession(d, ref, { now });
  const sug = agendaOf(d.doc, ref, { now }).suggestions.find(s => s.kind === 'carried');
  assert.equal(sug.label, 'Talk through the car');
  addSuggestion(d, 'S3', sug);
  assert.equal(agendaOf(d.doc, ref, { now }).going[0].label, 'Talk through the car');
});

test('homework statuses: To do, Client says done (the coach for now, a client later), Confirmed in the gate; said-done homework is suggested for the agenda', () => {
  const d = demoStore();
  const r = d.find(r => r.kind === 'debt')[0];
  d.setFieldStatus(r.id, 'apr', 'Will email');
  let hw = homeworkAll(d.doc, d.records);
  const apr = hw.find(h => h.field === 'apr');
  assert.equal(apr.status, 'To do'); assert.equal(apr.key, `rec:${r.id}:apr`);
  setHomeworkStatus(d, apr.key, 'Client says done', { by: 'client' });
  hw = homeworkAll(d.doc, d.records);
  assert.equal(hw.find(h => h.key === apr.key).status, 'Client says done'); assert.equal(hw.find(h => h.key === apr.key).statusBy, 'client');
  const R = reviewOf(d.doc, ref, { now });
  assert.deepEqual(R.saidDone.map(h => h.key), [apr.key]);
  assert.ok(agendaOf(d.doc, ref, { now }).suggestions.some(s => s.kind === 'homework'));
  setHomeworkStatus(d, apr.key, 'Confirmed');
  assert.equal(homeworkAll(d.doc, d.records).find(h => h.key === apr.key).status, 'Confirmed');
  assert.throws(() => setHomeworkStatus(d, apr.key, 'Done'), /Unknown homework status/);
  const made = makeHomework(d, 'S1', 'Call the servicer');
  setHomeworkStatus(d, `hw:${made.id}`, 'Client says done');
  assert.equal(homeworkAll(d.doc, d.records).find(h => h.key === `hw:${made.id}`).status, 'Client says done');
  setHomeworkStatus(d, `hw:${made.id}`, 'Confirmed');
  assert.ok(!homeworkAll(d.doc, d.records).some(h => h.key === `hw:${made.id}`), 'confirmed homework leaves the list');
});

test('Move on anyway with nothing open leaves no carry-over; the snapshot comes after the review; S9 re-scores through the gate', () => {
  const d = demoStore();
  d.setDoc('profile', { areas: { cash: true, investments: true, real: true, debt: true } });
  const r = endSession(d, ref, { now, note: null });
  assert.equal(r.carried.length, 0, JSON.stringify(r.carried)); assert.equal(d.doc.program.reviews.S1.movedOnAnyway, false);
  assert.equal(d.doc.snapshots.at(-1).label, 'Day 0');
  d.setIn('session', ['count'], 8, 'count');
  startSession(d, ref, { now });
  assert.equal(sessionsOf(d.doc, ref, { now })[8].items[1].done, false);
  markRescored(d, { now });
  assert.equal(sessionsOf(d.doc, ref, { now })[8].items[1].done, true);
});

test('Park it: a parked hole drops to the bottom, labeled, is not pulled by a hole session, and can be unparked', () => {
  const d = demoStore();
  let sc = scorecardOf(d.doc, ref, { now });
  assert.deepEqual(sc.holes.map(h => h.id), ['retirement', 'debt', 'goals']);
  parkHole(d, 'retirement', 'Waiting on the new job');
  sc = scorecardOf(d.doc, ref, { now });
  assert.deepEqual(sc.holes.map(h => h.id), ['debt', 'goals', 'retirement']);
  assert.equal(sc.holes[2].parked.note, 'Waiting on the new job'); assert.equal(sc.holes[2].rank, 3);
  assert.ok(sc.holes[2].math.some(t => /Parked: Waiting/.test(t)));
  assert.equal(targetOf(d.doc, 'S6', sc), 'debt');
  d.setIn('session', ['count'], 5, 'count');
  assert.equal(startSession(d, ref, { now }).target, 'debt');
  unparkHole(d, 'retirement');
  assert.equal(scorecardOf(d.doc, ref, { now }).holes[0].id, 'retirement');
  d.undo();
  assert.equal(scorecardOf(d.doc, ref, { now }).holes[0].id, 'debt', 'parking undoes like the rest');
});

test('answers 132 and 133: little e and big e rate the emergency fund; cards over 30% used is a Hole; a hole with no payoff ranks last', () => {
  const s = fresh();
  s.setDoc('profile', { age: 30, areas: { cash: true, investments: false, real: false, debt: true } });
  s.add('income', { name: 'Job', amount: 4000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  s.add('spending', { name: 'All in', amount: 3000 }, { type: 'All in' });
  const cash = s.add('account', { name: 'Checking', values: { group: 'cash', balance: 600 } }, { type: 'Checking' });
  const card = s.add('debt', { name: 'Card', values: { balance: 2000, limit: 5000, apr: 0.22 } }, { type: 'Credit card' });
  let sc = scorecardOf(s.doc, ref, { now });
  assert.equal(area(sc, 'emergency').rating, 'Hole'); assert.match(area(sc, 'emergency').reason, /little e/);
  assert.equal(area(sc, 'credit').rating, 'Hole'); assert.match(area(sc, 'credit').reason, /40\.0% used/);
  s.update(cash.id, { balance: 2500 }); // the Buffer (two weeks) and little e full
  sc = scorecardOf(s.doc, ref, { now });
  assert.equal(area(sc, 'emergency').rating, 'OK');
  s.update(cash.id, { balance: 21000 });
  sc = scorecardOf(s.doc, ref, { now });
  assert.equal(area(sc, 'emergency').rating, 'Strong');
  s.update(card.id, { balance: 1000 }); s.setDoc('profile', { credit: { score: 700 } });
  sc = scorecardOf(s.doc, ref, { now });
  assert.equal(area(sc, 'credit').rating, 'OK');
  assert.equal(sc.holes.at(-1).id, 'goals', 'no payoff rule and none typed: last');
});

test('answer 135: each area sits on SLAM\'s own FOO; the emergency fund moves from step 1 to 4 once little e is full; retirement from 2 to 5 once the match is taken', () => {
  const d = demoStore();
  let sc = scorecardOf(d.doc, ref, { now });
  assert.equal(area(sc, 'emergency').foo, '4', 'the Demo client has $6,000: little e is full');
  assert.equal(area(sc, 'retirement').foo, '5', 'no match on file');
  assert.equal(area(sc, 'goals').foo, '0b'); assert.equal(area(sc, 'mindset').foo, '0b');
  assert.equal(area(sc, 'investing').foo, '6');
  d.update(d.find(r => r.kind === 'account' && r.values.group === 'cash')[0].id, { balance: 300 });
  sc = scorecardOf(d.doc, ref, { now });
  assert.equal(area(sc, 'emergency').foo, '1');
});

test('FOO prerequisites: giving is off by default, locks while heavy debt is carried (overnight answer 5), unlocks anyway only with a note, and shows its cost in FI days', () => {
  const d = demoStore();
  let F = foo(d.doc, ref, { now });
  const give = F.steps.find(s => s.id === '5b');
  assert.equal(give.status, 'Off'); assert.ok(F.steps.findIndex(s => s.id === '5b') > F.steps.findIndex(s => s.id === '5'), 'listed at the Roth IRA step, not first');
  assert.equal(F.steps.find(s => s.id === '7').status, 'Locked', 'SPARKS waits for Coast FI on the same mechanism');
  assert.match(F.steps.find(s => s.id === '7').prereq.text, /Coast FI first/);
  d.setDoc('profile', { giving: { on: true, mode: 'amount', amount: 200 } });
  F = foo(d.doc, ref, { now });
  assert.equal(F.steps.find(s => s.id === '5b').status, 'Locked');
  assert.match(F.steps.find(s => s.id === '5b').prereq.text, /^Giving unlocks once heavy debt is paid off\. Oxygen mask on you first\./);
  assert.ok(F.steps.find(s => s.id === '5b').prereq.failed.includes('no debt at or above the heavy-debt APR'));
  assert.equal(F.here, '3', 'a locked step is never where you are');
  assert.throws(() => overrideStep(d, '5b', '  '), /needs a note/);
  overrideStep(d, '5b', 'Tithes first, by choice');
  F = foo(d.doc, ref, { now });
  const g = F.steps.find(s => s.id === '5b');
  assert.notEqual(g.status, 'Locked'); assert.equal(g.override.note, 'Tithes first, by choice'); assert.equal(g.override.session, 1);
  assert.match(g.cost.text, /Giving \$200 a month while carrying 22% debt costs about \d+ FI days a year/);
  assert.ok(g.cost.fiDays > 0);
  clearOverride(d, '5b');
  assert.equal(foo(d.doc, ref, { now }).steps.find(s => s.id === '5b').status, 'Locked');
  assert.equal(PREREQS['5b'].after, undefined, 'no step comes first: heavy debt is the only prerequisite');
});

test('S12 Graduation: the report, the notes, the dates and the final snapshot tick; the tracker reads the session while it runs', () => {
  const d = demoStore();
  endSession(d, ref, { now });
  d.setIn('session', ['count'], 11, 'count');
  let s12 = sessionsOf(d.doc, ref, { now })[11];
  assert.equal(s12.name, 'Graduation');
  assert.deepEqual(s12.items.map(i => i.done), [false, false, false, false, false]);
  d.setIn('program', ['graduation'], graduationReport(d.doc, ref, { now }), 'Graduation report');
  d.setIn('program', ['plan'], { notes: 'Keep the match', reviewDate: '2027-11-01', moneyDate: MONEY_DATES[1] }, 'Game plan');
  s12 = sessionsOf(d.doc, ref, { now })[11];
  assert.deepEqual(s12.items.map(i => i.done), [true, true, true, true, false]);
  assert.equal(trackerOf(d.doc, ref, { now }), null, 'no session running');
  startSession(d, ref, { now });
  const t = trackerOf(d.doc, ref, { now });
  assert.equal(t.n, 12); assert.equal(t.done, 4); assert.equal(t.of, 5); assert.ok(t.items.every(i => 'route' in i));
  const r = endSession(d, ref, { now });
  assert.equal(r.graduation, true); assert.equal(r.snap.label, 'Graduation'); assert.equal(r.snap.graduation, true);
  assert.equal(sessionsOf(d.doc, ref, { now })[11].items[4].done, true);
  assert.equal(inSession(d.doc), false);
});
