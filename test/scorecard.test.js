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
  let sc = scorecardOf(s.doc, ref, { now });
  assert.equal(area(sc, 'emergency').rating, 'Hole'); assert.equal(THRESHOLDS.emergency.holeMonths, 1);
  assert.equal(area(sc, 'credit').rating, 'Hole');
  assert.equal(area(sc, 'mindset').rating, 'Hole');
  assert.equal(area(sc, 'debt').rating, 'Strong', 'no debt, per About you');
  s.update(s.find(r => r.kind === 'account')[0].id, { balance: 9000 });
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
  assert.ok(ret.beforeHere && !debt.beforeHere, 'retirement (step 2) is before step 3; debt is the step itself');
  assert.deepEqual(sc.holes.map(h => h.id), ['retirement', 'debt', 'goals'], 'before the step first, then best return; no payoff last');
  assert.deepEqual(sc.holes.map(h => h.rank), [1, 2, 3]);
  assert.ok(debt.math.some(t => /Best return/.test(t)) && debt.math.some(t => /FOO step 3/.test(t)));
  // Effort and a typed payoff for an area with no rule.
  d.setIn('scorecard', ['areas', 'debt'], { effort: 10 }, 'Scorecard');
  d.setIn('scorecard', ['areas', 'goals'], { payoff: 1200 }, 'Scorecard');
  const sc2 = scorecardOf(d.doc, ref, { now });
  assert.equal(area(sc2, 'debt').effort, 10); assert.equal(area(sc2, 'debt').effortSet, true);
  assert.equal(area(sc2, 'goals').payoff.value, 1200); assert.equal(area(sc2, 'goals').payoff.typed, true);
  assert.deepEqual(sc2.holes.map(h => h.id), ['retirement', 'goals', 'debt'], 'goals now out-returns debt at 10 hours');
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
  assert.equal(list[9].items[0].id, 'hole', 'S10 still a hole session until every area is rated');
  for (const id of ['credit', 'taxes', 'protection', 'income', 'mindset']) d.setIn('scorecard', ['areas', id], { rating: 'Strong', reason: 'Fine' }, 'Scorecard');
  list = sessionsOf(d.doc, ref, { now });
  assert.equal(list[9].items[0].id, 'chapter'); assert.equal(list[9].items[0].done, false);
  d.setIn('scorecard', ['nextChapter'], { text: 'A home in 2030', amount: 80000, date: '2030-06-01' }, 'Next chapter');
  list = sessionsOf(d.doc, ref, { now });
  assert.equal(list[9].items[0].done, true); assert.equal(list[10].done, true);
});

test('S9 revisit and S12 game plan tick from the data; the money date cadence comes from one list', () => {
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
  assert.deepEqual(list[11].items.map(i => i.done), [false, false, false]);
  d.setIn('program', ['plan'], { notes: 'Max the 401(k) match, then the Roth', reviewDate: '2027-11-01', moneyDate: MONEY_DATES[0] }, 'Game plan');
  list = sessionsOf(d.doc, ref, { now });
  assert.equal(list[11].done, true);
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
