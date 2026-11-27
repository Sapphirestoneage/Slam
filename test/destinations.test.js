// The FI variants (run of Nov 25 2026): Lean, Barista, Regular, Chubby and Fat as views, the stress table, the
// pod's FI number, the Coast card; and the FIRE statuses (Nov 27 2026): one FOO order, markers, the reached card. Made-up households only; the arithmetic is in each comment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fatFiNumber, chubbyFiNumber, baristaGap, baristaFiNumber, fiStress, fiDate } from '../js/math/fi.js';
import { rcCoast, rcCoastWords } from '../js/math/recalc.js';
import { destinationsOf, baristaSooner, stressOf, podFiOf, coastReachedOf, apartOf, statusesOf, statusSeenPatch, statusBelowPatch, fooWithStatuses } from '../js/math/destinations.js';
import { ST_KEYS, ST_LEVELS, stList, stMarkers, stWeave, stCard, stBelow, stLine } from '../js/math/statuses.js';
import { fiTargets, setDestinations, baristaHealthOf, FAT_FACTOR } from '../js/plan.js';
import { metrics } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { journeyInputs, journeyStatusRows } from '../js/math/ladder.js';
import { tpJourney } from '../js/math/trip.js';
import { Store } from '../js/records.js';
import { DESTINATIONS, FAT_TEMPLATE, FAT_NOTES } from '../js/registry/destinations.js';
import { ORDER } from '../js/registry/foo.js';
import { buildPersona, loadDefs, NOW } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(NOW);
const defs = await loadDefs();
const persona = id => buildPersona(defs.find(d => d.id === id));

test('Fat FI: the list of extras when one is tapped, the factor while none is', () => {
  // $60,000 a year at 4% is $1,500,000; times 1.5 is $2,250,000
  const plain = fatFiNumber({ annualSpending: 60000, factor: 1.5, withdrawalRate: 0.04 });
  assert.equal(plain.value, 2250000); assert.equal(plain.fromTemplate, false); assert.equal(plain.guess, true, 'the factor is a stand-in');
  // ($60,000 + $12,000 of extras) / 4% = $1,800,000
  const listed = fatFiNumber({ annualSpending: 60000, extrasAnnual: 12000, factor: 1.5, withdrawalRate: 0.04 });
  assert.equal(listed.value, 1800000); assert.equal(listed.fromTemplate, true); assert.equal(listed.guess, false);
  assert.equal(fatFiNumber({ annualSpending: 60000, extrasAnnual: 0, factor: 1.5, withdrawalRate: 0.04 }).value, 2250000, 'all None is the same as nothing tapped');
  assert.equal(fatFiNumber({ annualSpending: null, factor: 1.5, withdrawalRate: 0.04 }).value, null);
  assert.match(listed.text, /Fat list/);
});

test('Chubby FI is halfway between Regular and Fat', () => {
  assert.equal(chubbyFiNumber({ regular: 1500000, fat: 2250000 }).value, 1875000);
  assert.deepEqual(chubbyFiNumber({ regular: null, fat: 2250000 }).needs, ['Regular FI']);
});

test('Barista: what the pay closes, and whether it covers health insurance', () => {
  // $18,000 a year of pay at 4% closes $450,000; health insurance $6,000 leaves $12,000
  const g = baristaGap({ annualSpending: 60000, partTimeIncome: 18000, healthAnnual: 6000, withdrawalRate: 0.04 });
  assert.equal(g.value, 450000); assert.equal(g.covers, true); assert.equal(g.afterHealth, 12000); assert.equal(g.left, 42000);
  // pay under the cost of health insurance: it covers part of it
  const short = baristaGap({ annualSpending: 60000, partTimeIncome: 4800, healthAnnual: 9600, withdrawalRate: 0.04 });
  assert.equal(short.covers, false); assert.equal(short.afterHealth, -4800); assert.match(short.text, /still comes from investments/);
  // no health cost tapped yet: no claim about it
  const open = baristaGap({ annualSpending: 60000, partTimeIncome: 18000, withdrawalRate: 0.04 });
  assert.equal(open.covers, null); assert.doesNotMatch(open.text, /Health insurance/);
  // pay over spending closes the whole number, never more
  assert.equal(baristaGap({ annualSpending: 24000, partTimeIncome: 36000, withdrawalRate: 0.04 }).value, 600000);
  assert.deepEqual(baristaGap({ annualSpending: 60000, partTimeIncome: null, withdrawalRate: 0.04 }).needs, ['part-time income']);
});

test('the stress table: one FI date for each withdrawal rate and return, the same loop as the FI date', () => {
  const g = ref.fiStress;
  assert.deepEqual(g.withdrawalRates, [0.0325, 0.035, 0.04, 0.045]); assert.deepEqual(g.returns, [0.03, 0.05, 0.07]);
  assert.match(g.source, /Nov 25 2026/);
  const x = { invested: 100000, monthlyInvesting: 2000, annualSpending: 48000 };
  const s = fiStress(x, { rates: g.withdrawalRates, returns: g.returns }, { from: now });
  assert.equal(s.rows.length, 4); assert.equal(s.rows[0].cells.length, 3);
  assert.equal(s.rows[2].target, 1200000, '$48,000 / 4%');
  for (const row of s.rows) for (const c of row.cells) assert.equal(c.months, fiDate({ invested: 100000, monthlyInvesting: 2000, realReturn: c.realReturn, target: row.target }, { from: now }).value);
  // a lower rate needs more money, so it is later; a higher return is sooner
  assert.ok(s.rows[0].cells[1].months > s.rows[3].cells[1].months); assert.ok(s.rows[2].cells[0].months > s.rows[2].cells[2].months);
  assert.equal(s.soonest, s.rows[3].cells[2].months); assert.equal(s.latest, s.rows[0].cells[0].months);
  assert.deepEqual(fiStress({ invested: null, monthlyInvesting: 2000, annualSpending: 48000 }, { rates: g.withdrawalRates, returns: g.returns }).needs, ['invested']);
  // nothing going in and nothing invested: every box says never, and there is no latest date
  const never = fiStress({ invested: 0, monthlyInvesting: 0, annualSpending: 48000 }, { rates: g.withdrawalRates, returns: g.returns });
  assert.ok(never.rows.every(r => r.cells.every(c => c.never))); assert.equal(never.latest, null); assert.equal(never.soonest, null);
});

test('the five views: each with its number, its date on the plan\'s path, and what it assumes', () => {
  const doc = persona('three-adults'), m = metrics(doc, ref, { now });
  doc.assumptions.partTimeIncome = 1500; doc.assumptions.lifeHealth = 500;
  const V = destinationsOf(m, doc, { now }), by = Object.fromEntries(V.map(v => [v.key, v]));
  assert.deepEqual(V.map(v => v.key), DESTINATIONS);
  const T = fiTargets(m, doc);
  for (const v of V) { assert.equal(v.value, T[v.key].value, `${v.key}: one number with the ladder and the milestones`); assert.ok(v.assumes.length >= 3, `${v.key} says what it assumes`); assert.ok(v.months != null && v.when, `${v.key} has a date`); }
  // smaller numbers come sooner
  assert.ok(by['Barista FI'].months < by['Regular FI'].months && by['Regular FI'].months < by['Chubby FI'].months && by['Chubby FI'].months < by['Fat FI'].months);
  assert.equal(by['Chubby FI'].value, (by['Regular FI'].value + by['Fat FI'].value) / 2);
  assert.equal(by['Fat FI'].value, m.fiNumber.value * FAT_FACTOR);
  assert.equal(baristaSooner(V), by['Regular FI'].months - by['Barista FI'].months);
  assert.equal(by['Barista FI'].gap.value, 1500 * 12 / m.inputs.withdrawalRate);
  assert.equal(by['Barista FI'].gap.covers, true);
  // the Fat list: $500 of travel and $1,000 of help a month replace the factor
  const s = new Store(doc);
  setDestinations(s, { fat: { Travel: 500, 'Help at home': 1000, Giving: 0 } });
  const m2 = metrics(s.doc, ref, { now }), fat = destinationsOf(m2, s.doc, { now }).find(v => v.key === 'Fat FI');
  assert.equal(fat.value, (m2.inputs.retirementSpending + 1500) * 12 / m2.inputs.withdrawalRate);
  assert.match(fat.assumes[0], /\$1,500 a month on your Fat list/);
  assert.ok(FAT_TEMPLATE.includes('Travel'));
  s.undo(); assert.equal(s.doc.program?.destinations?.fat, undefined, 'one tap, one undo');
});

test('a view with numbers missing says what it needs, and shows no date', () => {
  const doc = persona('alexis'), m = metrics(doc, ref, { now });
  const V = destinationsOf(m, doc, { now });
  const b = V.find(v => v.key === 'Barista FI');
  assert.equal(b.value, null); assert.deepEqual(b.needs, ['part-time income']); assert.equal(b.when, null); assert.equal(b.gap, null);
});

test('the stress table reads the plan\'s own path: the box at the plan\'s rate and return is the plan\'s FI date', () => {
  const doc = persona('three-adults'); doc.assumptions.realReturn = 0.07; doc.assumptions.withdrawalRate = 0.04;
  const m = metrics(doc, ref, { now }), s = stressOf(m, ref, { now });
  const cell = s.rows.find(r => r.rate === 0.04).cells.find(c => c.realReturn === 0.07);
  assert.equal(cell.months, m.monthsToFi.value);
});

test('the pod: one FI number for people who pool costs, each shared cost counted once', () => {
  const doc = persona('three-adults'), p = podFiOf(doc, ref, { now });
  const all = metrics(doc, ref, { now, person: 'all' });
  assert.equal(p.value, all.fiNumber.value); assert.equal(p.people.length, 3);
  // each person's part of the pod's month adds up to the whole month (to the cent)
  assert.ok(Math.abs(p.people.reduce((s, q) => s + q.spending, 0) - p.spending) < 0.01);
  assert.ok(Math.abs(p.people.reduce((s, q) => s + q.share, 0) - 1) < 1e-9);
  assert.equal(p.months, all.monthsToFi.value, 'the pod\'s date is the household\'s FI date');
  assert.match(p.text, /every shared cost counted once/);
  // one adult: no pod
  const solo = podFiOf(persona('alexis'), ref, { now });
  assert.equal(solo.value, null); assert.equal(solo.people.length, 0);
});

test('the Coast card: shows the day invested reaches the Coast number, and one time only', () => {
  const doc = persona('three-adults'), m = metrics(doc, ref, { now });
  const before = coastReachedOf(m, doc);
  assert.equal(before.reached, false); assert.equal(before.show, false);
  const acct = doc.records.find(r => r.kind === 'account' && (r.values?.balance ?? 0) > 0 && metrics({ ...doc, records: doc.records.map(x => (x === r ? { ...x, values: { ...x.values, balance: x.values.balance + 1e6 } } : x)) }, ref, { now }).inputs.invested > m.inputs.invested);
  assert.ok(acct, 'an invested account');
  acct.values.balance += Math.ceil(before.coast);
  const m2 = metrics(doc, ref, { now }), after = coastReachedOf(m2, doc);
  assert.equal(after.reached, true); assert.equal(after.show, true); assert.ok(after.over >= 0); assert.match(after.text, /Coast number/);
  const s = new Store(doc); setDestinations(s, { coastSeen: '2026-11-25' });
  const seen = coastReachedOf(metrics(s.doc, ref, { now }), s.doc);
  assert.equal(seen.reached, true); assert.equal(seen.show, false, 'closed once, it stays closed');
});

// ---------- the FIRE statuses (run of Nov 27 2026): one FOO order, statuses as markers, the reached card ----------
const options = JSON.parse(readFileSync(new URL('../data/library/status-options.json', import.meta.url)));
const investedAcct = (doc, m) => doc.records.find(r => r.kind === 'account' && (r.values?.balance ?? 0) > 0 && metrics({ ...doc, records: doc.records.map(x => (x === r ? { ...x, values: { ...x.values, balance: x.values.balance + 1e6 } } : x)) }, ref, { now }).inputs.invested > m.inputs.invested);

test('one FOO order for everyone: no FIRE type moves or adds a step (Eli, Nov 27 2026)', () => {
  const doc = persona('three-adults');
  const base = foo(doc, ref, { now }).steps.map(s => s.id);
  assert.deepEqual(base, ORDER, 'the one order');
  // a stored choice of an order by FIRE type (program.destinations.foo, Nov 25 2026) is ignored
  for (const k of DESTINATIONS) {
    const s = new Store(persona('three-adults')); setDestinations(s, { foo: k, pick: k });
    const F = foo(s.doc, ref, { now });
    assert.deepEqual(F.steps.map(x => x.id), ORDER, `${k}: the same order`);
    assert.equal(F.here, foo(doc, ref, { now }).here, `${k}: the same step`);
  }
  // the code of the three orders is gone
  for (const f of ['js/math/destinations.js', 'js/registry/destinations.js', 'js/ui/destinations-ui.js', 'js/ui/foo-ui.js'])
    assert.doesNotMatch(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), /fooFor|FOO_BY_DESTINATION|FOO_EXTRA|FOO_MASK|fooDestinationSection/, f);
});

test('stList: the six statuses, each with its number, reached or its date, the level and its math', () => {
  // $100,000 invested. Coast $80,000 (reached), Lean $150,000 in 14 months, FI $400,000 in 90, Fat no date, Barista no number
  const L = stList({ invested: 100000, known: true, level: 'Close', nowYm: '2026-11', options: options.statuses, items: [
    { key: 'Coast', value: 80000, months: 0, math: ['Coast math.'] }, { key: 'Lean', value: 150000, months: 14 }, { key: 'FI', value: 400000, months: 90 },
    { key: 'Chubby', value: 500000, months: 120 }, { key: 'Fat', value: 600000, months: null, never: true }, { key: 'Barista', value: null, needs: ['part-time income'] }] });
  assert.deepEqual(L.map(s => s.key), ST_KEYS);
  const by = Object.fromEntries(L.map(s => [s.key, s]));
  assert.equal(by.Coast.reached, true); assert.equal(by.Coast.when, 'Reached'); assert.equal(by.Coast.months, 0);
  assert.equal(by.Lean.reached, false); assert.equal(by.Lean.ym, '2028-01'); assert.equal(by.Lean.when, 'Jan 2028'); assert.equal(by.Lean.gap, 50000);
  assert.equal(by.FI.ym, '2034-05');
  assert.equal(by.Fat.never, true); assert.equal(by.Fat.when, 'Not on this path yet');
  assert.equal(by.Barista.value, null); assert.deepEqual(by.Barista.needs, ['part-time income']); assert.equal(by.Barista.when, null);
  for (const s of L) { assert.equal(s.level, 'Close'); assert.ok(ST_LEVELS.includes(s.level)); if (s.value != null) assert.ok(s.math.length >= 1, `${s.key}: Show the math`); }
  assert.match(by.Lean.math.join(' '), /\$150,000 less \$100,000 invested = \$50,000 to go/);
  assert.match(by.Coast.math.join(' '), /Coast math\..*at or over \$80,000: reached/);
  // the markers: date order, reached first; a status with no number or no date is not a marker
  const M = stMarkers(L);
  assert.deepEqual(M.map(k => k.key), ['Coast', 'Lean', 'FI', 'Chubby']);
  assert.deepEqual(stMarkers(L, { skip: ['Coast', 'FI'] }).map(k => k.key), ['Lean', 'Chubby']);
  assert.match(stLine(L), /^Reached: Coast\. Next status: Lean, \$150,000, Jan 2028\.$/);
  // empty is not zero: nothing invested known, nothing reached
  assert.equal(stList({ invested: null, items: [{ key: 'Lean', value: 150000, months: 3 }] })[1].reached, false);
});

test('stWeave: markers sit between the steps in date order, and no step changes', () => {
  const steps = [{ id: 'a', t: 'done' }, { id: 'b', t: 'done' }, { id: 'c', t: 0 }, { id: 'd', t: 12 }, { id: 'e', t: null }, { id: 'f', t: 60 }];
  const frozen = JSON.stringify(steps);
  const marks = [{ key: 'Coast', reached: true, months: 0 }, { key: 'Lean', reached: false, months: 30 }, { key: 'Fat', reached: false, months: 400 }];
  const W = stWeave(steps, marks, s => s.t);
  assert.deepEqual(W.map(r => (r.step ? r.step.id : `*${r.status.key}`)), ['a', 'b', '*Coast', 'c', 'd', 'e', '*Lean', 'f', '*Fat']);
  assert.deepEqual(W.filter(r => r.step).map(r => r.step), steps, 'the steps, the same objects in the same order');
  assert.equal(JSON.stringify(steps), frozen);
  assert.deepEqual(stWeave(steps, [], s => s.t).map(r => r.step.id), ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('statusesOf: the plan\'s own numbers and dates, and the markers on the FOO timeline', () => {
  const doc = persona('three-adults'), m = metrics(doc, ref, { now });
  doc.assumptions.partTimeIncome = 1500;
  const S9 = statusesOf(m, doc, { now, level: 'Close', options });
  const V = destinationsOf(m, doc, { now }), by = Object.fromEntries(S9.list.map(s => [s.key, s]));
  // each number and date is the one Plan › Goals shows (M9G on M53); Coast is M54
  for (const [k, key] of [['Lean FI', 'Lean'], ['Barista FI', 'Barista'], ['Regular FI', 'FI'], ['Chubby FI', 'Chubby'], ['Fat FI', 'Fat']]) {
    const v = V.find(x => x.key === k);
    assert.equal(by[key].value, v.value, k); assert.equal(by[key].reached, v.reached, k); assert.equal(by[key].ym, v.ym, `${k}: the same date`);
  }
  assert.equal(by.Coast.value, m.coastFi.value);
  const k = rcCoast({ invested: m.inputs.invested, coast: m.coastFi.value, realReturn: m.inputs.realReturn, nowAt: now, monthly: m.investing.monthly, maxMonths: 840 });
  if (!m.investing.before && !(m.investing.changes || []).length && k.months != null) assert.equal(by.Coast.months, k.months);
  // markers in date order
  const months = S9.markers.map(x => x.months);
  assert.deepEqual(months, [...months].sort((a, b) => a - b));
  assert.ok(S9.markers.length >= 3, 'markers present');
  // on the FOO timeline: every step once, in the one order, and every marker once
  const F = foo(doc, ref, { now }), rows = fooWithStatuses(F, S9.markers, { now });
  assert.deepEqual(rows.filter(r => r.step).map(r => r.step.id), ORDER);
  assert.deepEqual(rows.filter(r => r.status).map(r => r.status.key).sort(), S9.markers.map(x => x.key).sort());
  assert.deepEqual(rows.filter(r => r.step).map(r => r.step), F.steps, 'no step is changed');
  // every status with a number has options to open, 2 to 4, each with a link in both apps
  for (const key of ST_KEYS) {
    const o = options.statuses[key].options;
    assert.ok(o.length >= 2 && o.length <= 4, `${key}: 2 to 4 options`);
    for (const x of o) { assert.ok(x.t && x.why && x.web && x.game, `${key} ${x.id}`); if (!x.web.startsWith('#')) assert.ok(existsSync(new URL(`../${x.web}`, import.meta.url)), `${x.web} exists`); }
    assert.deepEqual(by[key].options, o);
  }
  assert.equal(options.draft, true, 'the words are a draft until Eli edits them');
});

test('reaching a status: one calm card, one time; the next step stays the same', () => {
  const doc = persona('three-adults'), m = metrics(doc, ref, { now });
  const before = statusesOf(m, doc, { now, level: 'Close', options });
  assert.equal(before.card, null, 'nothing reached, no card');
  const F0 = foo(doc, ref, { now });
  investedAcct(doc, m).values.balance += Math.ceil(m.coastFi.value);
  const m2 = metrics(doc, ref, { now }), S9 = statusesOf(m2, doc, { now, level: 'Close', options });
  assert.equal(S9.card.key, 'Coast'); assert.equal(S9.card.title, 'You can stop sprinting');
  assert.equal(S9.card.heading, 'Options this opens'); assert.equal(S9.card.stay, 'Your next step stays the same. These are options.');
  assert.ok(S9.card.options.length >= 2 && S9.card.options.length <= 4); assert.ok(S9.card.math.length);
  assert.equal(statusesOf(m2, doc, { now, level: 'Guess', options }).card, null, 'never on a guess');
  // the next step and the next dollar do not change by themselves: the FOO reads no status
  const s = new Store(doc);
  const F1 = foo(s.doc, ref, { now });
  setDestinations(s, statusSeenPatch(s.doc, 'Coast', '2026-11-27'));
  const F2 = foo(s.doc, ref, { now });
  assert.equal(F2.here, F1.here); assert.deepEqual(F2.steps.map(x => [x.id, x.status, x.date]), F1.steps.map(x => [x.id, x.status, x.date]));
  assert.deepEqual(F1.steps.map(x => x.id), F0.steps.map(x => x.id));
  // closed once, it stays closed; the next reached status gets its own card
  const after = statusesOf(metrics(s.doc, ref, { now }), s.doc, { now, level: 'Close', options });
  assert.equal(s.doc.program.destinations.coastSeen, '2026-11-27', 'Coast keeps its own key');
  assert.notEqual(after.card?.key, 'Coast');
  if (after.card) { setDestinations(s, statusSeenPatch(s.doc, after.card.key, '2026-11-27')); assert.equal(s.doc.program.destinations.statusSeen[after.card.key], '2026-11-27'); }
});

test('back under a status: the quiet Recalculating line, never a warning', () => {
  const doc = persona('three-adults'), m0 = metrics(doc, ref, { now });
  const acct = investedAcct(doc, m0), start = acct.values.balance;
  acct.values.balance = start + Math.ceil(m0.coastFi.value);
  const s = new Store(doc); setDestinations(s, statusSeenPatch(s.doc, 'Coast', '2026-11-01'));
  assert.equal(statusesOf(metrics(s.doc, ref, { now }), s.doc, { now, level: 'Close', options }).below?.key === 'Coast', false, 'at or over Coast: no line');
  s.doc.records.find(r => r.id === acct.id).values.balance = start;
  const m2 = metrics(s.doc, ref, { now }), S9 = statusesOf(m2, s.doc, { now, level: 'Close', options });
  assert.equal(S9.below.key, 'Coast'); assert.equal(S9.below.title, 'Recalculating');
  assert.equal(S9.below.by, m2.coastFi.value - m2.inputs.invested);
  assert.match(S9.below.line, /^Below Coast by \$[\d,]+\. New Coast date: /);
  assert.doesNotMatch(`${S9.below.line} ${S9.below.next}`, /warning|behind|off track|fail|mistake/i);
  assert.equal(S9.card, null, 'the reached card does not come back');
  // the same date as the old Coast line (rcCoast on the plan's path)
  assert.equal(S9.below.ym, coastReachedOf(m2, s.doc, { now }).below.ym);
  // closed for this month
  setDestinations(s, statusBelowPatch(s.doc, 'Coast', S9.below.month));
  assert.equal(statusesOf(m2, s.doc, { now, level: 'Close', options }).below, null);
  // any status: Lean seen, then under it
  const L = stList({ invested: 90000, known: true, level: 'Exact', nowYm: '2026-11', seen: { Lean: '2026-10-01' }, items: [{ key: 'Lean', value: 100000, months: 7 }] });
  assert.equal(stBelow(L, { month: '2026-11' }).line, 'Below Lean by $10,000. New Lean date: Jun 2027.');
  assert.equal(stBelow(L, { month: '2026-11', hidden: { Lean: '2026-11' } }), null);
  assert.equal(stCard(L), null);
});

test('the journey map: the statuses between its stages, and no stage moves', () => {
  const doc = persona('three-adults');
  const J = tpJourney(journeyInputs(doc, ref, { now, debtKnown: true }));
  const rows = journeyStatusRows(J, doc, ref, { now });
  assert.deepEqual(rows.filter(r => r.step).map(r => r.step), J.stages, 'the stages, the same objects in the same order');
  const marks = rows.filter(r => r.status).map(r => r.status.key);
  assert.ok(marks.length >= 1, 'markers present'); assert.ok(!marks.includes('Coast') && !marks.includes('FI'), 'Coast and FI are stages of the journey already');
});

test('the game\'s copy of the statuses is made from js/math/statuses.js and the options file, and is current', () => {
  const src = readFileSync(new URL('../js/math/statuses.js', import.meta.url), 'utf8'), data = readFileSync(new URL('../data/library/status-options.json', import.meta.url), 'utf8');
  const hash = createHash('sha256').update(src).update(JSON.stringify(JSON.parse(data))).digest('hex').slice(0, 16);
  assert.match(readFileSync(new URL('../game/core/statuses.js', import.meta.url), 'utf8'), new RegExp(`SOURCE-HASH  ${hash}`), 'run node tools/game_statuses_build.mjs, then the game steps (stamp, code map)');
  assert.match(readFileSync(new URL('../game/index.html', import.meta.url), 'utf8'), /<script src="core\/statuses\.js\?v=[0-9a-f]+"><\/script>/);
});

test('the Barista number adds health insurance, unless a tap says the part-time job covers it', () => {
  // ($60,000 + $6,000 health - $18,000 pay) / 4% = $1,200,000; with no health cost tapped: $1,050,000
  const withHealth = baristaFiNumber({ annualSpending: 60000, partTimeIncome: 18000, healthAnnual: 6000, withdrawalRate: 0.04 });
  assert.equal(withHealth.value, 1200000); assert.equal(withHealth.health, 6000); assert.match(withHealth.text, /health insurance/);
  const open = baristaFiNumber({ annualSpending: 60000, partTimeIncome: 18000, withdrawalRate: 0.04 });
  assert.equal(open.value, 1050000); assert.equal(open.healthOpen, true); assert.doesNotMatch(open.text, /health insurance/);
  assert.equal(baristaFiNumber({ annualSpending: 60000, partTimeIncome: 18000, healthAnnual: 0, withdrawalRate: 0.04 }).healthOpen, false, 'a tapped $0 is an answer');
  // on a plan: the tapped cost goes in; the tap "the job covers it" takes it out again, in one undo step
  const doc = persona('three-adults'); doc.assumptions.partTimeIncome = 1500; doc.assumptions.lifeHealth = 500;
  const m = metrics(doc, ref, { now }), spend = m.inputs.retirementSpending, w = m.inputs.withdrawalRate;
  assert.equal(baristaHealthOf(doc), 500);
  assert.equal(fiTargets(m, doc)['Barista FI'].value, (spend + 500 - 1500) * 12 / w);
  const b = destinationsOf(m, doc, { now }).find(v => v.key === 'Barista FI');
  assert.equal(b.spending, spend + 500 - 1500); assert.ok(b.assumes.some(t => /is added to your spending/.test(t)));
  const s = new Store(doc); setDestinations(s, { jobHealth: true });
  assert.equal(baristaHealthOf(s.doc), 0);
  assert.equal(fiTargets(m, s.doc)['Barista FI'].value, (spend - 1500) * 12 / w);
  const c = destinationsOf(m, s.doc, { now }).find(v => v.key === 'Barista FI');
  assert.equal(c.jobHealth, true); assert.ok(c.assumes.some(t => /job covers health insurance/.test(t)));
  s.undo(); assert.equal(baristaHealthOf(s.doc), 500);
  // nothing tapped: nothing added, and the view says so
  delete doc.assumptions.lifeHealth;
  const n = destinationsOf(m, doc, { now }).find(v => v.key === 'Barista FI');
  assert.equal(n.healthOpen, true); assert.ok(n.assumes.some(t => /No health insurance cost is in this number yet/.test(t)));
});

test('the Fat list keeps help at home (cleaning, childcare) and giving', () => {
  assert.equal(FAT_TEMPLATE.length, 8);
  assert.ok(FAT_TEMPLATE.includes('Help at home') && FAT_TEMPLATE.includes('Giving'));
  assert.match(FAT_NOTES['Help at home'], /Cleaning, childcare/);
});

test('the pod: what each person would need living apart, as a range', () => {
  const doc = persona('three-adults'), p = podFiOf(doc, ref, { now });
  const all = metrics(doc, ref, { now, person: 'all' }), w = all.inputs.withdrawalRate;
  for (const q of p.people) {
    assert.equal(q.apart.low, q.spending * 12 / w, `${q.name}: the low end is their own month at the rate`);
    assert.ok(q.apart.high >= q.apart.low); assert.equal(q.apart.high, (q.spending + q.apart.sharedMore) * 12 / w);
    assert.ok(q.apart.high <= p.value + 1e-6, 'never more than the whole pod: the high end is the rows they are in, whole');
    assert.match(q.apart.text, /divided by/);
  }
  // Me carries $1,200 of the $3,000 rent: alone, the other $1,800 is theirs too
  const me = p.people.find(q => q.id === 'Me');
  assert.ok(me.apart.sharedMore >= 1800);
  // someone who shares nothing has one number
  const m = metrics(persona('alexis'), ref, { now }), solo = apartOf(m, m);
  assert.equal(solo.sharedMore, 0); assert.equal(solo.low, solo.high);
});

test('back under Coast: one quiet Recalculating card with the gap and the new Coast date', () => {
  // $90,000 invested, Coast number $100,000, 7% a year, $1,000 a month: the gap closes when the saving, counted back
  // to today, covers $10,000: month 11 (10 months cover $9,696, 11 months cover $10,636)
  const k = rcCoast({ invested: 90000, coast: 100000, monthly: 1000, realReturn: 0.07, nowAt: '2026-11-25' });
  assert.equal(k.below, true); assert.equal(k.by, 10000); assert.equal(k.months, 11); assert.equal(k.ym, '2027-10');
  const words = rcCoastWords(k);
  assert.equal(words.title, 'Recalculating'); assert.equal(words.line, 'Below Coast by $10,000. New Coast date: Oct 2027.');
  assert.doesNotMatch(`${words.line} ${words.next}`, /warning|behind|off track|fail|mistake/i);
  // nothing going in: no date, and no made-up one
  const none = rcCoast({ invested: 90000, coast: 100000, monthly: 0, realReturn: 0.07, nowAt: '2026-11-25' });
  assert.equal(none.months, null); assert.match(rcCoastWords(none).line, /none yet/);
  assert.equal(rcCoast({ invested: null, coast: 100000 }), null); assert.equal(rcCoastWords(rcCoast({ invested: 100000, coast: 100000 })), null);
  // a function of the month: nothing for 6 months, then $1,000
  assert.equal(rcCoast({ invested: 90000, coast: 100000, monthly: n => (n < 6 ? 0 : 1000), realReturn: 0.07, nowAt: '2026-11-25' }).months, 17);
  // on a plan: reached and closed, then the balance falls
  const doc = persona('three-adults'), m0 = metrics(doc, ref, { now });
  const acct = doc.records.find(r => r.kind === 'account' && (r.values?.balance ?? 0) > 0 && metrics({ ...doc, records: doc.records.map(x => (x === r ? { ...x, values: { ...x.values, balance: x.values.balance + 1e6 } } : x)) }, ref, { now }).inputs.invested > m0.inputs.invested);
  const start = acct.values.balance;
  acct.values.balance = start + Math.ceil(m0.coastFi.value);
  const s = new Store(doc); setDestinations(s, { coastSeen: '2026-11-01' });
  const up = coastReachedOf(metrics(s.doc, ref, { now }), s.doc, { now });
  assert.equal(up.reached, true); assert.equal(up.below, null, 'at or over Coast: no card');
  s.doc.records.find(r => r.id === acct.id).values.balance = start;
  const m2 = metrics(s.doc, ref, { now }), down = coastReachedOf(m2, s.doc, { now });
  assert.equal(down.reached, false); assert.equal(down.show, false, 'the first card does not come back');
  assert.ok(down.below && down.below.show); assert.equal(down.below.by, m2.coastFi.value - m2.inputs.invested);
  assert.match(down.below.words.line, /^Below Coast by \$[\d,]+\. New Coast date: /);
  // closed for this month; never shown before the Coast card was reached and closed
  setDestinations(s, { coastBelowSeen: down.below.month });
  assert.equal(coastReachedOf(m2, s.doc, { now }).below.show, false);
  assert.equal(coastReachedOf(metrics(persona('three-adults'), ref, { now }), persona('three-adults'), { now }).below, null);
});
