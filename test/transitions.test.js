// Batch 21: Life Transitions (M90, js/math/transitions.js). The job-loss persona (Riley Between) against its hand-worked
// numbers (tools/personas/defs/job-loss.mjs, transition), and the rules on small made-up households.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importFile, Store, newHousehold } from '../js/records.js';
import { transitionOf, cardCost, withdrawalCost, transitionPlan, phase4On, setTransition, monthsText } from '../js/math/transitions.js';
import { agendaOf } from '../js/program.js';
import { search } from '../js/nav.js';
import { loadDefs, OUT_DIR, NOW } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(NOW);
const def = (await loadDefs()).find(d => d.id === 'job-loss');
const E = def.transition;
const riley = () => importFile(readFileSync(join(OUT_DIR, 'job-loss.json'), 'utf8'));
const near = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `expected ${b}, got ${a}`);

test('job loss: the burn at four levels, each with its runway', () => {
  const T = transitionOf(riley(), ref, { now });
  assert.ok(T.on);
  assert.deepEqual(T.levels.map(l => l.burn), [E.burn.full, E.burn.draftt, E.burn.fat, E.burn.food]);
  for (const [i, k] of ['full', 'draftt', 'fat', 'food'].entries()) near(T.levels[i].runway, E.levels[k], 0.01);
  assert.ok(T.levels[0].runway < T.levels[1].runway && T.levels[1].runway < T.levels[2].runway && T.levels[2].runway < T.levels[3].runway, 'each level down lasts longer');
});

test('job loss: the ladder is prefilled from the household and priced', () => {
  const T = transitionOf(riley(), ref, { now });
  const r = Object.fromEntries(T.ladder.rungs.map(x => [x.id, x]));
  for (const k of ['buffer', 'littleE', 'bigE', 'cut', 'benefits', 'family', 'card0', 'card', 'retirement']) near(r[k].amount, E.rungs[k], 1);
  near(r.retirement.penalty, E.rungs.retirementPenalty, 1);
  near(r.retirement.tax, E.rungs.retirementTax, 1);
  assert.deepEqual(T.ladder.rungs.map(x => x.id), ['buffer', 'littleE', 'bigE', 'cut', 'side', 'benefits', 'family', 'card0', 'card', 'retirement'], 'cheapest first; no investments rung without investments');
  assert.equal(r.side.on, false, 'side income waits for an amount');
  assert.equal(r.benefits.until, '2027-04');
  assert.equal(r.family.from, 'household');
  assert.match(r.card.costText, /Using \$1,000 for 3 months costs about \$60/);
  assert.match(r.card0.costText, /^0% until Dec 2027/);
  assert.match(r.retirement.costText, /penalty \(\$4,200\)/);
  for (const x of T.ladder.rungs) { assert.doesNotMatch(`${x.costText} ${x.note ?? ''}`, /\u2014/); assert.doesNotMatch(`${x.costText}`, /risk|danger|bad|warning/i); }
});

test('job loss: the dip runs to the floor with benefits ending and each rung reached in order', () => {
  const T = transitionOf(riley(), ref, { now });
  near(T.runway, E.runway.value, E.runway.tol);
  assert.equal(T.floorYm, E.runway.floor);
  assert.equal(T.ladder.benefits.endK, 5);
  const order = ['buffer', 'littleE', 'bigE', 'family', 'card0', 'card', 'retirement'].map(id => T.dip.reached[id]);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'the rungs are reached cheapest first');
  assert.equal(T.dip.path[0].left, 55202);
  assert.equal(T.dip.path.at(-1).left, 0);
  assert.match(T.text, /From Nov 2026 the money lasts 24\.0 months, to Oct 2028/);
});

test('job loss: two tripwires land on the dip and in the agenda', () => {
  const doc = riley();
  const T = transitionOf(doc, ref, { now });
  assert.deepEqual(T.tripwires.map(w => w.ym), [E.tripwires.date, E.tripwires.card], 'in the order they come up');
  assert.equal(T.tripwires[1].text, 'If I reach the regular card, take any job that covers the Basics');
  assert.equal(T.tripwires[0].text, 'If no offer by Feb 2027, start contract or temp work');
  const a = agendaOf(doc, ref, { now });
  const wires = a.suggestions.filter(s => s.kind === 'tripwire');
  assert.equal(wires.length, 2);
  assert.match(wires[0].why, /Feb 2027/);
  assert.match(wires[1].why, /Oct 2027/);
  doc.settings.phase4 = false;
  assert.equal(agendaOf(doc, ref, { now }).suggestions.filter(s => s.kind === 'tripwire').length, 0, 'off with the Phase 4 switch');
});

test('job loss: Plan B in one line', () => {
  const T = transitionOf(riley(), ref, { now });
  assert.equal(T.plans.length, 1);
  near(T.plans[0].months, E.planB.value, E.planB.tol);
  assert.equal(T.plans[0].text, 'Plan B ($1,500 a month more from month 3): lasts 4.0 years, 24.4 months more; reaches the regular card Aug 2028 instead of Oct 2027');
});

test('the card example and the retirement cost are the hand numbers', () => {
  assert.equal(cardCost(E.cardExample.apr).cost, E.cardExample.cost);
  assert.equal(cardCost(E.cardExample.apr).text, 'Using $1,000 for 3 months costs about $60');
  const w = withdrawalCost({ gross: 42000, age: 36, base: 13000, filingStatus: 'Single', place: { state: 'NY', nyc: false } }, ref);
  near(w.penalty, 4200, 0.01); near(w.tax, 6598, 1); near(w.net, 31202, 1);
  assert.equal(withdrawalCost({ gross: 10000, age: 60, base: 0 }, ref).penalty, 0, 'no penalty from 59 and a half');
  assert.equal(withdrawalCost({ gross: 10000, age: 40, base: 0, penaltyFree: true }, ref).penalty, 0, 'a 457 has no penalty');
});

// A small household built in code: cash only, Budget lines, an optional job.
function household({ job = 0, lines = [[2000, 'Accommodation'], [500, 'Food'], [300, 'Other']], cash = 6000, template = 'job-loss', rungs = {} } = {}) {
  const s = new Store(newHousehold({ name: 'Test', now: NOW }));
  s.setDoc('profile', { birthYear: 1990, birthMonth: 1, state: 'TX' });
  if (job) s.add('income', { name: 'Paycheck', amount: job, per: 'month', values: { basis: 'Take-home', payFrequency: 'month', incomeType: 'W-2' } }, { type: 'Job' });
  for (const [amount, draftt] of lines) s.add('bill', { name: draftt, amount, values: { draftt, category: draftt } });
  s.add('account', { name: 'Checking', values: { group: 'cash', balance: cash } }, { type: 'Checking' });
  if (template) setTransition(s, { template, from: 'Laid off', to: 'Next job', start: '2026-11', rungs });
  return s.doc;
}

test('a job stops at the start; cut when reached drops the burn once the cash above it is gone', () => {
  const doc = household({ job: 4000, rungs: { cut: { on: true, when: 'reached', level: 'food' } } });
  const T = transitionOf(doc, ref, { now });
  assert.equal(T.ladder.after, 0, 'the job stops');
  assert.deepEqual(T.levels.map(l => l.burn), [2800, 2500, 2500, 2500]);
  // $6,000 of cash: the cut waits for the buffer, little e and big e, so there is nothing left once it starts.
  near(T.runway, 6000 / 2800, 0.001);
  const T2 = transitionOf(household({ job: 4000, rungs: { cut: { on: true, when: 'start', level: 'food' } } }), ref, { now });
  near(T2.runway, 6000 / 2500, 0.001);
});

test('income that covers the burn lasts past the cap; a job kept keeps coming', () => {
  const doc = household({ job: 4000, template: 'marriage' });
  const T = transitionOf(doc, ref, { now });
  assert.equal(T.ladder.after, 4000);
  assert.equal(T.runway, null);
  assert.equal(T.text, 'The money lasts past 10 years at this burn');
  assert.equal(monthsText(null), 'past 10 years');
});

test('no Budget lines: only full spending is known; no template: no plan; the switch', () => {
  const s = new Store(newHousehold({ name: 'Gut', now: NOW }));
  s.add('spending', { name: 'All in', amount: 3000, values: { includesDebtPayments: true } }, { type: 'All in' });
  s.add('account', { name: 'Checking', values: { group: 'cash', balance: 3000 } }, { type: 'Checking' });
  assert.equal(transitionPlan(s.doc, ref), null);
  assert.equal(phase4On(s.doc), true, 'on for a new household in this build');
  setTransition(s, { template: 'job-loss', start: '2026-11' });
  const T = transitionOf(s.doc, ref, { now });
  assert.deepEqual(T.levels.map(l => l.burn), [3000, null, null, null]);
  assert.equal(T.levels[1].needs, 'Budget lines');
  near(T.runway, 1, 0.001);
  s.undo();
  assert.equal(s.doc.program.transition, undefined, 'one tap, one undo step');
});

test('Find reaches Life Transitions from everyday words', () => {
  for (const q of ['job loss', 'laid off', 'quit', 'transition', 'runway']) {
    const r = search(q, { ref, doc: riley() });
    assert.ok(r.some(x => x.route === '#/plan/transitions'), `${q} finds Plan › Transitions`);
  }
});
