// Recalculating in the coach app (js/recalc.js): the kept plan against today's numbers, the triage on the same total
// The gap shows, the refill after a dip, the safe-to-fail line, the month, the letter as an exercise, the audit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { metrics, keyNumbers } from '../js/math/metrics.js';
import { layersOf, recordDip, layerSnapshot } from '../js/math/layers.js';
import { recalcOf, auditOf } from '../js/recalc.js';
import { CALM_LETTER, exerciseOf, keepExercise, letterText, sharedExercises } from '../js/exercises/calm-letter.js';
import { shareDoc } from '../js/privacy.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const NOW = new Date('2026-11-25T12:00:00Z'), LATER = new Date('2027-01-25T12:00:00Z');
const fresh = () => { const s = new Store(householdFromInputs(JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url))).inputs, { now: NOW.toISOString() })); s.now = () => NOW.toISOString(); return s; };
const M = (s, now = NOW) => metrics(s.doc, ref, { now });
const keep = s => s.snapshot('Snapshot', keyNumbers(M(s)));
const keep0 = s => { const at = s.now; s.now = () => '2026-11-20T12:00:00.000Z'; s.snapshot('Snapshot', keyNumbers(M(s)), { layers: layerSnapshot(s.doc, ref, NOW) }); s.now = at; };

test('no kept plan: no card, and a calm month is done', () => {
  const s = fresh(), R = recalcOf(s.doc, ref, M(s), { now: NOW });
  assert.equal(R.cards.length, 0); assert.equal(R.state.done, true); assert.equal(R.triage, null); assert.equal(R.refill, null);
});

test('on the plan: time passes, the balances follow the plan, nothing recalculates', () => {
  const s = fresh(); keep(s);
  assert.equal(recalcOf(s.doc, ref, M(s), { now: NOW }).cards.length, 0);
});

test('from where you are: two months later with the same balances, the date is later and the card says so calmly', () => {
  const s = fresh(); keep(s);
  const R = recalcOf(s.doc, ref, M(s, LATER), { now: LATER }); // nothing was paid down: the plan said two months of progress
  const debt = R.cards.find(c => c.id === 'debt');
  assert.ok(debt, 'the debt date moved');
  assert.equal(debt.route.later, true);
  assert.equal(debt.words.title, 'Recalculating');
  assert.match(debt.words.line, /^Debt free was [A-Z][a-z]{2} \d{4}\. From where you are today it is [A-Z][a-z]{2} \d{4}, \d+ months? later\.$/);
  assert.equal(R.state.hard, true); assert.equal(R.state.done, false);
  if (R.hold != null) assert.match(debt.words.next, /more a month brings/);
  for (const c of R.cards) assert.doesNotMatch(`${c.words.line} ${c.words.next}`, /mistake|failed|behind|off track/i);
});

test('triage: the same total The gap shows, the order, and scripts for what is short', () => {
  const s = fresh();
  for (const r of s.find(r => r.kind === 'income')) s.update(r.id, { amount: 900 });
  const m = M(s), R = recalcOf(s.doc, ref, m, { now: NOW });
  assert.ok(R.triage, 'the bills are more than the income');
  assert.equal(Math.round(R.triage.total), Math.round(m.inputs.takeHome - m.surplus.value), 'one total: what goes out');
  assert.equal(Math.round(R.triage.short), Math.round(-m.surplus.value));
  assert.equal(R.triage.groups[0].cls, 'housing');
  assert.ok(R.triage.scripts.length >= 1 && R.triage.scripts.every(g => g.script.say.length));
  assert.equal(R.state.hard, true);
  assert.equal(R.hold, null, 'no extra payment is asked for in a month that is short');
});

test('the refill: after a dip, what to put back and the month it is whole', () => {
  const s = fresh(); keep0(s);
  const acct = s.find(r => r.kind === 'account' && r.values?.group === 'cash')[0];
  recordDip(s, { amount: 800, layers: layersOf(s.doc, ref, NOW).layers, now: NOW.toISOString(), accountId: acct.id });
  const m = M(s), R = recalcOf(s.doc, ref, m, { now: NOW });
  assert.ok(R.refill, 'money was used and is not back');
  assert.equal(R.refill.gap, 800); assert.equal(R.refill.used, 800);
  assert.equal(R.refill.months, Math.ceil(800 / m.surplus.value));
  assert.equal(R.state.hard, true);
  // the money comes back: the card ends by itself
  s.update(acct.id, { balance: s.get(acct.id).values.balance + 800 });
  assert.equal(recalcOf(s.doc, ref, M(s), { now: NOW }).refill, null);
  // or the person says it is back
  s.update(acct.id, { balance: s.get(acct.id).values.balance - 300 });
  assert.equal(recalcOf(s.doc, ref, M(s), { now: NOW }).refill.gap, 300);
  s.setDoc('settings', { recalc: { refilled: s.doc.spending.dips.at(-1).id } });
  assert.equal(recalcOf(s.doc, ref, M(s), { now: NOW }).refill, null);
});

test('the safe-to-fail line: picked from the Wants lines, counted by the plan either way', () => {
  const s = fresh();
  const id = s.add('bill', { name: 'Fun money', amount: 100, per: 'month', values: { category: 'Other wants', draftt: 'Wants' } }).id;
  const before = M(s).surplus.value;
  s.setDoc('settings', { recalc: { safe: id } });
  const R = recalcOf(s.doc, ref, M(s), { now: NOW });
  assert.equal(R.safe.cap, 100); assert.equal(R.safe.planCost, 100); assert.equal(R.safe.ranOut, false);
  assert.ok(R.safeChoices.some(c => c.id === id));
  assert.equal(M(s).surplus.value, before, 'marking the line changes nothing in the plan');
});

test('the letter is one exercise: kept under settings.exercises, Me only, and out of anything shared', () => {
  const s = fresh();
  const text = letterText([CALM_LETTER.starts[0]], '  Breathe. ');
  assert.equal(text, `${CALM_LETTER.starts[0]} Breathe.`);
  keepExercise(s, CALM_LETTER.id, { text, own: 'Breathe.' }, NOW);
  const kept = exerciseOf(s.doc, CALM_LETTER.id);
  assert.equal(kept.seen, 'Me only'); assert.equal(kept.text, text);
  assert.equal(recalcOf(s.doc, ref, M(s), { now: NOW }).letter.text, text);
  assert.deepEqual(shareDoc(s.doc, ref).settings.exercises, {}, 'a shared copy has no Me only answer');
  assert.deepEqual(sharedExercises({ a: { text: 'x', seen: 'Everyone' }, b: { text: 'y' } }), { a: { text: 'x', seen: 'Everyone' } });
  keepExercise(s, CALM_LETTER.id, null, NOW);
  assert.equal(exerciseOf(s.doc, CALM_LETTER.id), null);
});

test('the audit is off until it is turned on, and its list stays out of shared copies', () => {
  const s = fresh();
  assert.equal(auditOf(s.doc, M(s), { now: NOW }).on, false);
  s.setDoc('settings', { recalc: { audit: { on: true, events: [{ id: 'a', kind: 'Late fee', what: 'Late fee', amount: 40, ym: '2026-09', tag: 'mistake' }, { id: 'b', kind: 'Late fee', what: 'Late fee', amount: 35, ym: '2026-10', tag: 'mistake' }, { id: 'c', kind: 'Car repair', what: 'Car repair', amount: 1200, ym: '2025-11', tag: 'unavoidable' }] } } });
  const m = M(s), A = auditOf(s.doc, m, { now: NOW });
  assert.equal(A.on, true); assert.equal(A.mistake.cost, 75); assert.equal(A.unavoidable.cost, 1200);
  assert.deepEqual(A.repeats, [{ kind: 'Late fee', count: 2, cost: 75 }]);
  assert.ok(Math.abs(A.tax - 75 / (m.inputs.takeHome * 12)) < 1e-12);
  assert.ok(Math.abs(A.rows[2].yearsAgo - 1) < 1e-9);
  assert.ok(Math.abs(A.rows[0].fiDays - 40 / (m.surplus.value * 12 / 365)) < 1e-9);
  assert.equal(shareDoc(s.doc, ref).settings.recalc.audit, null);
});
