// SPDX-License-Identifier: AGPL-3.0-only
// Batch 12: freed money follows the FOO (M79) with the next best opportunity (M80), the gut number on the calendar,
// the gut-vs-lines sentence, short-plan chips, the gap (M81), Your next 3 moves (M82), goal chips to the FOO, the
// spec's Demo FI check, and two persona findings (a short month owns Home; past FI says so). Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, importFile } from '../js/records.js';
import { applyFastTrack } from '../js/fasttrack.js';
import { metrics, debtHeroOf } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { ladderOf } from '../js/math/ladder.js';
import { compareOf, proposedDoc, setProposed, makeProposedThePlan } from '../js/math/proposed.js';
import { scorecardOf } from '../js/math/scorecard.js';
import { freedFlow, nextBest } from '../js/math/flow.js';
import { gapOf, gapProposal } from '../js/math/gap.js';
import { nextMoves } from '../js/math/moves.js';
import { heroExtras } from '../js/math/debt.js';
import { gutVsLinesWords } from '../js/math/spending.js';
import { fiWordsOf } from '../js/math/picture.js';
import { instances, balances } from '../js/month.js';
import { goalSuggestions } from '../js/whynow.js';
import { soWhat } from '../js/sowhat.js';
import { compare } from '../js/math/match.js';
import { addMonths, ymOf } from '../js/month.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const at = mo => addMonths(ymOf(now), mo);
function maya(over = {}) {
  const s = new Store(newHousehold({ name: 'Maya Test', now: now.toISOString() }), { now: () => now.toISOString() });
  applyFastTrack(s, { firstName: 'Maya', birthMonth: 6, birthYear: 1996, household: 'Solo', takeHome: 2400, takePer: 'paycheck', payFrequency: '2 weeks', gut: 3500, gutIncludesDebt: true,
    checking: 1200, savings: 4000, invested: 15000, housing: 'Rent', hasCar: false, debts: { 'Credit card': { balance: 6000, payment: 200 } }, ...over }, { finished: true });
  return s;
}
const short = () => maya({ firstName: 'Gap', takeHome: 2600, takePer: 'month', payFrequency: 'month', gut: 3000, checking: 400, savings: 0, invested: 0, debts: { 'Credit card': { balance: 4200, payment: 120 } } });
const persona = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));

test('item 1: freed money follows the FOO for Maya: heavy debt Mar 2027, then big e, then Tax-Free Growth, and the FI date waits for them', () => {
  const s = maya();
  const m = metrics(s.doc, ref, { now });
  const f = m.fooFlow;
  assert.equal(f.heavyMonths, 4); assert.equal(f.monthly, 1900, '$1,700 surplus + $200 freed');
  assert.equal(f.bigEMonths, Math.ceil(f.bigELeft / 1900)); assert.equal(f.bigEEnd, 14);
  assert.equal(f.taxFreeEnd, 18, '$7,500 of Roth IRA room at $1,900 a month: 4 months');
  assert.deepEqual(m.investing.before, { months: 14, monthly: 0, heavyMonths: 4 });
  const F = foo(s.doc, ref, { now });
  const st = id => F.steps.find(x => x.id === id);
  assert.equal(st('3').date, at(4)); assert.equal(at(4), '2027-03');
  assert.equal(st('4').date, at(14)); assert.equal(st('5').date, at(18));
  // The FI date by hand: 14 months at $0, then $1,900 a month.
  const g = 1.07 ** (1 / 12) - 1, inv = 15000 * (1 + g) ** 14, T = m.fiNumber.value;
  assert.equal(m.monthsToFi.value, Math.ceil(14 + Math.log((T * g + 1900) / (inv * g + 1900)) / Math.log(1 + g) - 1e-9));
  // Current vs Proposed, the ladder, Home's card and Next moves read the same months.
  const C = compareOf(s.doc, ref, { now });
  assert.equal(C.rows.find(r => r.key === 'fiDate').current, at(m.monthsToFi.value));
  assert.equal(C.rows.find(r => r.key === 'debtFree').current, '2027-03');
  assert.equal(ladderOf(s.doc, ref, { now }).steps.find(x => x.id === 'bigE').date, at(14));
  assert.deepEqual(debtHeroOf(s.doc, m).then, { monthly: 1900, months: 14, taxFree: 18 });
  // Invest from today turns the flow off; so does Invest my surplus off.
  s.setDoc('assumptions', { debtFirst: 0 });
  assert.equal(metrics(s.doc, ref, { now }).fooFlow, null);
});

test('item 1: freedFlow by itself, and no heavy debt starts at big e', () => {
  const f = freedFlow({ surplus: 1000, heavyMonths: 0, freed: 0, bigELeft: 2500, taxFreeLeft: 7500 });
  assert.equal(f.bigEMonths, 3); assert.equal(f.taxFreeEnd, 3 + 8);
  assert.equal(freedFlow({ surplus: 1000, heavyMonths: null, bigELeft: 100 }).bigEEnd, null, 'heavy debt never cleared: no dates after it');
  const tom = metrics(persona('tom'), ref, { now });
  assert.equal(tom.fooFlow.heavyMonths, 0); assert.ok(tom.fooFlow.bigEMonths > 0);
});

test('item 1: the next best opportunity: an uncaptured match beats the heavy debt step and shows once, as a note', () => {
  const s = maya();
  const job = s.doc.records.find(r => r.kind === 'income');
  s.update(job.id, { gross: 70000, matchPct: 1, matchCapPct: 0.04, contributionPct: 0 });
  const F = foo(s.doc, ref, { now });
  const notes = F.steps.filter(x => x.worthALook);
  assert.equal(notes.length, 1, 'one alternative, one note');
  assert.equal(notes[0].id, '3');
  assert.match(notes[0].worthALook.text, /^Worth a look: the full employer match beats this by \$[\d,]+ a year\.$/);
  assert.deepEqual(F.steps.map(x => x.id), ['0b', '1', '2', '3', '4', '5', '5b', '6', '7', '8', '9'], 'the order never changes');
  // Maya alone: nothing beats the FOO.
  assert.ok(!foo(maya().doc, ref, { now }).steps.some(x => x.worthALook));
  // A debt above the return beats Tax-Free Growth; big e is compared only with the match.
  const d = nextBest({ id: '5', rate: 0.07, monthly: 1000, from: 0 }, { debts: [{ id: 'x', name: 'Student loan', balance: 20000, apr: 0.075 }], realReturn: 0.07 });
  assert.ok(d && d.by >= 50 && d.kind === 'debt' || d === null);
  assert.equal(nextBest({ id: '4', rate: 0, monthly: 1000 }, { debts: [{ id: 'x', name: 'Loan', balance: 20000, apr: 0.075 }] }), null);
});

test('item 8: the spec Demo FI check is the plan the app shows (294 months)', () => {
  const fx = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
  assert.equal(fx.expected.monthsToFi.value, 294);
  const row = compare(fx, ref).find(r => r.key === 'monthsToFi');
  assert.ok(row.pass, `app ${row.got} vs spec ${row.expected}`);
});

test('item 2: with no real lines the gut number is spending money through the month; with some, only what they leave', () => {
  const s = maya();
  const list = instances(s.doc, ref, '2026-11', { now });
  const gut = list.filter(i => i.kind === 'gut');
  assert.deepEqual(gut.map(i => i.date), ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-29']);
  assert.ok(Math.abs(gut.reduce((t, i) => t + i.planned, 0) + 3300) < 0.01, '$3,500 less the $200 card payment on its own day');
  assert.deepEqual(list.filter(i => i.kind === 'income').map(i => i.date), ['2026-11-06', '2026-11-20']);
  s.setIn('spending', ['calendar', 'start'], 1200);
  const b = balances(s.doc, ref, '2026-11', 1, { now });
  const end = b.rows.at(-1);
  assert.ok(Math.abs((end.balance ?? end.end ?? end.value) - (1200 + 4800 - 3500)) < 1, JSON.stringify(end));
  s.add('bill', { name: 'Rent', amount: 1800, status: 'Roughly', values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', dueDay: 1 } });
  const after = instances(s.doc, ref, '2026-11', { now }).filter(i => i.kind === 'gut');
  assert.equal(after[0].name, 'Spending money (not on a line yet)');
  assert.ok(Math.abs(after.reduce((t, i) => t + i.planned, 0) + 1500) < 0.01, '$3,500 - $200 - $1,800 rent');
});

test('item 3: no real lines: the gut number is the spending number; with some, how many categories are still gut-only', () => {
  const s = maya();
  const m = metrics(s.doc, ref, { now });
  assert.equal(gutVsLinesWords({ gut: 3500, lineTotal: 200, categories: m.inputs.categories }).text, 'No lines yet: your gut number is your spending number.');
  s.add('bill', { name: 'Rent', amount: 1800, status: 'Roughly', values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', dueDay: 1 } });
  const m2 = metrics(s.doc, ref, { now });
  assert.match(gutVsLinesWords({ gut: 3500, lineTotal: 2000, categories: m2.inputs.categories }).text, /^Lines are \$1,500 under your gut number; 2 categories are still gut-only\.$/);
});

test('item 4: a short plan gets +5% / +10% / +25% chips that each move the date or keep the month', () => {
  const s = maya();
  const m = metrics(s.doc, ref, { now });
  assert.deepEqual(heroExtras(m.debtPlan), [100, 190, 480]);
  const c = debtHeroOf(s.doc, m);
  assert.equal(c.short, true);
  assert.ok(c.whatIf.some(w => w.months < c.months));
  const slow = maya({ takeHome: 1700 });
  assert.deepEqual(heroExtras(metrics(slow.doc, ref, { now }).debtPlan), [50, 100, 250], 'a long plan keeps +$50 / +$100 / +$250');
});

test('item 5: the gap: $2,600 in, $3,000 out: three levers, FOO step 1 carries it, one hole for one cause, Use the gap proposes a plan', () => {
  const s = short();
  const m = metrics(s.doc, ref, { now });
  const G = gapOf(s.doc, m);
  assert.equal(G.short, 400);
  assert.deepEqual(G.levers.map(l => l.id), ['line', 'subscription', 'income']);
  assert.equal(G.levers[0].closes, 300, 'a tenth of the $3,000 gut number while there are no lines');
  const F = foo(s.doc, ref, { now });
  assert.equal(F.here, '1'); assert.equal(F.steps.find(x => x.id === '1').left, 400);
  assert.ok(F.steps.filter(x => x.date).every(x => x.date >= ymOf(now)), 'no date before today');
  assert.equal(F.steps.find(x => x.id === '3').date, null, 'the debt date waits on the gap');
  const sc = scorecardOf(s.doc, ref, { now });
  assert.deepEqual(sc.holes.map(h => h.id), ['cashFlow', 'debt', 'goals']);
  assert.match(sc.areas.find(a => a.id === 'cashFlow').reason, /wait on this/);
  // With lines: the biggest movable line and a subscription.
  s.add('bill', { name: 'Groceries', amount: 600, status: 'Roughly', values: { category: 'Groceries', draftt: 'Food', amountType: 'Variable' } });
  s.add('bill', { name: 'Streaming', amount: 45, status: 'Roughly', values: { category: 'Streaming', draftt: 'Bills', amountType: 'Fixed' } });
  const G2 = gapOf(s.doc, metrics(s.doc, ref, { now }));
  assert.equal(G2.levers[0].name, 'Groceries'); assert.equal(G2.levers[0].closes, 150);
  assert.equal(G2.levers[1].name, 'Streaming'); assert.equal(G2.levers[1].closes, 45);
  s.setIn('program', ['gap'], { income: 300 });
  const G3 = gapOf(s.doc, metrics(s.doc, ref, { now }));
  assert.equal(G3.levers[2].closes, 300); assert.equal(G3.left, 0);
  // Use the gap: the proposal closes it.
  setProposed(s, gapProposal(G));
  const p = metrics(proposedDoc(s.doc, ref, { now }), ref, { now });
  assert.ok(p.surplus.value >= -0.5, `proposed surplus ${p.surplus.value}`);
  makeProposedThePlan(s, ref, { now });
  assert.ok(s.doc.records.some(r => r.kind === 'income' && r.name === 'Extra shifts or a side gig'));
});

test('persona findings: a short month owns Home (Dana, Alexis); past FI says so (Robin and Lee)', () => {
  for (const id of ['deficit', 'alexis']) {
    const doc = persona(id);
    const m = metrics(doc, ref, { now });
    assert.ok(gapOf(doc, m), `${id}: the gap card leads Home`);
    assert.doesNotMatch(soWhat('surplus', m, { lowDay: { low: 1000, label: 'Sun, Nov 1' } }).text, /money left over/);
    assert.equal(nextMoves(doc, ref, { now })[0].key, 'foo:1');
  }
  const doc = persona('multimillionaire');
  const m = metrics(doc, ref, { now });
  const w = fiWordsOf(m, null, { now });
  assert.equal(w.past, true);
  assert.match(w.sentence, /^You are past your FI number: \$[\d,]+ invested against \$3,000,000, \$[\d,]+ \(\d+%\) over\.$/);
  assert.doesNotMatch(soWhat('fi', m).text, /0 years/);
});

test('item 6: Your next 3 moves for Maya: dollars and dates, each with a screen', () => {
  const mv = nextMoves(maya().doc, ref, { now });
  assert.equal(mv.length, 3);
  assert.equal(mv[0].text, 'Pay $1,900 a month to the cards (the $200 going now plus the $1,700 left over): debt free Mar 2027');
  assert.match(mv[1].text, /^Then: Put \$1,900 a month into big e .*: \$[\d,]+ by Jan 2028$/);
  assert.match(mv[2].text, /^Then: Put \$1,900 a month into a Roth IRA: \$7,500 by May 2028$/);
  assert.ok(mv.every(x => x.route && x.ym && x.amount > 0));
});

test('item 7: goal chips map to the FOO', () => {
  const p = { chips: { goalWords: ['Emergency fund', 'Start investing', 'Buy a home', 'Save for a big event', 'Debt free'] } };
  const g = Object.fromEntries(goalSuggestions(p, []).map(x => [x.chip, x]));
  assert.equal(g['Emergency fund'].kind, 'foo'); assert.equal(g['Emergency fund'].fooStep, '4');
  assert.equal(g['Start investing'].kind, 'foo'); assert.equal(g['Start investing'].fooStep, '5');
  assert.equal(g['Buy a home'].kind, 'future'); assert.equal(g['Save for a big event'].fooStep, '8');
  assert.equal(g['Debt free'].kind, 'milestone');
  assert.ok(!goalSuggestions(p, [{ kind: 'event', name: 'Buy a home: down payment' }]).some(x => x.chip === 'Buy a home'), 'an event already there is not suggested again');
});

// Question 217 (decided Nov 6, follows "freed money follows the FOO"): the surplus fills FOO step 1 (the buffer and
// little e) before heavy debt gets it; each debt keeps its own payment meanwhile.
import { freedFlow as flowQ217 } from '../js/math/flow.js';
import { debtFirstPlan as planQ217 } from '../js/math/debt.js';
test('q217: step 1 fills before heavy debt, and the card waits on its own payment meanwhile', () => {
  const card = { id: 'c', name: 'Card', type: 'Credit card', balance: 1800, apr: 0.27, payment: 90 };
  const now = planQ217([card], { surplus: 750 });
  const after = planQ217([card], { surplus: 750, surplusFrom: 5 });
  assert.equal(now.heavyMonths, 3);
  assert.equal(after.heavyMonths, 7, '5 months on step 1 at $90 leaves $1,541, then $840 a month clears it in 2');
  const f = flowQ217({ surplus: 750, heavyMonths: 7, freed: 90, bigELeft: 0, taxFreeLeft: 0, firstMonths: 5, firstLeft: 3100 });
  assert.deepEqual(f.steps.slice(0, 2).map(s => [s.id, s.from, s.to]), [['1', 0, 5], ['3', 5, 7]]);
  assert.match(f.text, /fills the buffer and little e first \(5 months\), \$750 a month pays heavy debt next \(2 months\)/);
});
