// The FI destinations (run of Nov 25 2026): Lean, Barista, Regular, Chubby and Fat as views, the stress table, the
// pod's FI number, the Coast card and the FOO by destination. Made-up households only; the arithmetic is in each comment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fatFiNumber, chubbyFiNumber, baristaGap, baristaFiNumber, fiStress, fiDate } from '../js/math/fi.js';
import { rcCoast, rcCoastWords } from '../js/math/recalc.js';
import { destinationsOf, baristaSooner, stressOf, podFiOf, coastReachedOf, fooFor, apartOf } from '../js/math/destinations.js';
import { fiTargets, setDestinations, baristaHealthOf, FAT_FACTOR } from '../js/plan.js';
import { metrics } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { Store } from '../js/records.js';
import { FOO_BY_DESTINATION, FOO_MASK, FOO_EXTRA, DESTINATIONS, FAT_TEMPLATE, FAT_NOTES } from '../js/registry/destinations.js';
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

test('the FOO by destination: the oxygen mask steps never move, only the late steps (Eli, QUESTIONS 580)', () => {
  const doc = persona('three-adults'), m = metrics(doc, ref, { now });
  doc.assumptions.partTimeIncome = 1500;
  const F = foo(doc, ref, { now }), V = destinationsOf(m, doc, { now });
  const of = k => fooFor(F, V.find(v => v.key === k));
  const ids = k => of(k).steps.map(s => s.id);
  assert.deepEqual(ids('Regular FI'), ORDER); assert.equal(of('Regular FI').changed, false);
  assert.deepEqual(ids('Chubby FI'), ORDER);
  // the three orders, step by step
  assert.deepEqual(ids('Lean FI'), ['0b', '1', '2', '3', '4', '5', '5b', 'bridge', '6', '7', '9', '8']);
  assert.deepEqual(ids('Barista FI'), ['0b', '1', '2', '3', '4', 'hsa', 'cover', '5', '5b', '6', '9', '7', '8']);
  assert.deepEqual(ids('Fat FI'), ['0b', '1', '2', '3', '4', '5', 'taxadv', '5b', '6', '8', '9', '7']);
  assert.deepEqual(FOO_MASK, ORDER.slice(0, 5), 'the oxygen mask is the first five steps of the standard order');
  for (const k of DESTINATIONS) {
    const o = FOO_BY_DESTINATION[k].order, own = o.filter(id => !FOO_EXTRA[id]);
    assert.deepEqual(o.slice(0, FOO_MASK.length), FOO_MASK, `${k}: the oxygen mask steps are first and in their order`);
    assert.deepEqual([...own].sort(), [...ORDER].sort(), `${k}: every standard step, once`);
    for (const id of Object.keys(FOO_BY_DESTINATION[k].why)) assert.ok(!FOO_MASK.includes(id) && o.includes(id), `${k}: a reason only on a late step`);
    for (const id of o.filter(x => FOO_EXTRA[x])) assert.ok(FOO_BY_DESTINATION[k].why[id], `${k}: the added step ${id} says why`);
    // nothing in the mask is marked moved
    for (const s of of(k).steps.filter(x => FOO_MASK.includes(x.id))) assert.equal(s.moved, false);
  }
  // Lean moves the taxable bridge up, Barista the HSA and the health-cover bridge, Fat every tax-advantaged account
  assert.match(FOO_EXTRA.bridge.sub, /before 59 and a half/); assert.match(FOO_EXTRA.hsa.name, /HSA/); assert.match(FOO_EXTRA.cover.name, /health-cover bridge/); assert.match(FOO_EXTRA.taxadv.name, /every tax-advantaged account/);
  // an added step is a place in the order: no date, no number, never where you are
  const bridge = of('Lean FI').steps.find(s => s.id === 'bridge');
  assert.equal(bridge.extra, true); assert.equal(bridge.date, null); assert.equal(bridge.target, null); assert.ok(bridge.why);
  // the finish line is the destination's own number and date; where you are does not change
  const lean = of('Lean FI'), nine = lean.steps.find(s => s.id === '9'), v = V.find(x => x.key === 'Lean FI');
  assert.equal(nine.target, v.value); assert.equal(nine.date, v.ym); assert.match(nine.name, /Lean number/);
  for (const k of DESTINATIONS) assert.equal(of(k).here, F.here, `${k}: where you are is the same step`);
  assert.ok(lean.steps.find(s => s.id === '8').why);
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
