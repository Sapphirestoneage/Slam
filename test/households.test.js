// Batch 49 (Phase 4 Track 2, real lives wave 1): households of any size. One to six adults and any dependents, shared
// rows split equally, by percent or by income among any of the adults, a view for each adult and Everyone. Made-up
// households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allSnapshots, BASELINE } from '../tools/personas/views.mjs';

// Every file that was already there reads exactly as before: every persona and the Demo, in the household view and
// each person's view, on every screen's numbers (the key numbers, the FOO step, the cash layers, the statements, the
// calendar, Month end) and in each audience's fold. The baseline was written from main before batch 49 changed a line.
test('every persona and the Demo: every number in every view is unchanged (fixtures/views-baseline.json)', () => {
  const was = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const now = allSnapshots();
  for (const id of Object.keys(was)) assert.deepEqual(now[id], was[id], `${id} moved`);
});

import { Store, newHousehold } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { statements, periodOf } from '../js/math/statements.js';
import { instances, monthView, ymOf } from '../js/month.js';
import { foldDoc, audienceOf, rowLeftOut } from '../js/privacy.js';
import { rowShare, amongOf } from '../js/math/household.js';
import { householdOf, adultsOf, householdSize, viewsOf, personLabels, inView, ownPlanPerson, bothLabel, setBothScreen, MAX_ADULTS } from '../js/registry/couples.js';
import { addPerson, removePerson, setPerson } from '../js/couples.js';
import { buildPersona, loadDefs, NOW } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(NOW);
const defs = await loadDefs();
const def = id => defs.find(d => d.id === id);
const three = () => buildPersona(def('three-adults'));

test('the split math: equally, by percent (the rest shared by the people with none typed) and by income, among any of the adults', () => {
  const H = { ids: ['Me', 'Partner', 'P3'], many: true, method: 'Equal', weights: { Me: 5000, Partner: 4000, P3: 3000 } };
  const row = values => ({ values });
  assert.equal(rowShare(row({}), 'P3', H), 1 / 3);
  assert.equal(rowShare(row({ splitAmong: ['Me', 'Partner'] }), 'P3', H), 0, 'not on the row');
  assert.equal(rowShare(row({ splitAmong: ['Me', 'Partner'] }), 'Me', H), 0.5);
  assert.equal(rowShare(row({ splitHow: 'Percent', splitPcts: { Me: 0.5 } }), 'Partner', H), 0.25, 'the other two share what is left');
  assert.equal(rowShare(row({ splitHow: 'By income' }), 'Me', H), 5000 / 12000);
  assert.equal(rowShare(row({ splitHow: 'By income', splitAmong: ['Partner', 'P3'] }), 'P3', H), 3000 / 7000);
  assert.equal(rowShare(row({ splitHow: 'By income' }), 'Me', { ...H, weights: {} }), 1 / 3, 'equal while no income is known');
  assert.deepEqual(amongOf(row({ splitAmong: ['P3', 'Gone'] }), H), ['P3'], 'someone no longer in the plan drops off');
});

test('three adults: each view and Everyone add up, a row shared by two is in their views only, each adult files their own return', () => {
  const doc = three();
  assert.deepEqual(adultsOf(doc).map(a => a.name), ['Riley', 'Jules', 'Dev']);
  const v = p => metrics(doc, ref, { now, person: p });
  const [r, j, d, e] = ['Me', 'Partner', 'P3', null].map(v);
  assert.equal(r.surplus.value + j.surplus.value + d.surplus.value, e.surplus.value);
  assert.equal(r.netWorth.value + j.netWorth.value + d.netWorth.value, e.netWorth.value);
  assert.ok(!d.inputs.lines.some(l => l.name === 'Internet'), 'internet is Riley and Jules only');
  assert.equal(r.inputs.lines.find(l => l.name === 'Internet').amount, 45);
  assert.equal(d.inputs.lines.find(l => l.name === 'Rent').amount, 600);
  assert.equal(e.inputs.lines.find(l => l.name === 'Rent').amount, 3000, 'the household counts the bill once, whole');
  assert.equal(d.inputs.householdTax.rows[doc.records.find(x => x.name === "Dev's paycheck").id].unit, 'P3', 'Dev files his own return');
  const H = householdOf(doc);
  assert.equal(H.many, true);
  const internet = doc.records.find(x => x.name === 'Internet');
  assert.equal(inView(internet, 'P3', null, H), false);
  assert.equal(inView(internet, 'Partner', null, H), true);
});

test('three adults: the statements, the calendar and Month end follow the view (Dev pays $600 of the rent)', () => {
  const doc = three();
  const s = statements(doc, ref, periodOf('month', now), { now, person: 'P3' });
  assert.equal(s.income.takeHome, 3000);
  assert.equal(Math.round(s.income.surplus), 1510);
  const ym = ymOf(now);
  const rent = instances(doc, ref, ym, { now, person: 'P3' }).find(i => i.name === 'Rent');
  assert.equal(rent.planned, -600, 'money out');
  assert.equal(instances(doc, ref, ym, { now, person: 'Me' }).find(i => i.name === 'Rent').planned, -1200);
  assert.equal(instances(doc, ref, ym, { now, person: 'all' }).find(i => i.name === 'Rent').planned, -3000);
  const mv = monthView(doc, ref, ym, { now, person: 'P3' });
  assert.equal(mv.rows.find(x => x.line.name === 'Rent')?.estimate, 600);
});

test('three adults: the switch lists each adult and Everyone; Living together\'s preview is Everyone (preview); a view on Dev is Dev\'s own plan', () => {
  const doc = three();
  const names = personLabels(doc);
  assert.deepEqual(viewsOf('Married separate', names, adultsOf(doc)).map(x => x[1]), ['Everyone', 'Riley', 'Jules', 'Dev']);
  assert.deepEqual(viewsOf('Living together', names, adultsOf(doc)).map(x => x[1]), ['Riley', 'Jules', 'Dev']);
  assert.equal(bothLabel(doc), 'Everyone (preview)');
  assert.equal(ownPlanPerson({ ...doc, settings: { ...doc.settings, person: 'P3' } }), 'P3');
  assert.equal(ownPlanPerson({ ...doc, settings: { ...doc.settings, person: 'P5' } }), 'Me', 'someone not in the plan reads as this client');
  setBothScreen(true);
  assert.equal(ownPlanPerson({ ...doc, settings: { ...doc.settings, person: 'all' } }), null, 'Everyone (preview) on a screen that offers it');
  setBothScreen(false);
});

test('privacy, three adults: a row private to Dev is left out of Riley\'s and Jules\'s views and folded in Everyone; its amount counts in every total', () => {
  const doc = three();
  doc.profile.mode = 'Married separate'; // a mode with a combined view (Everyone), so the fold there can be seen
  const card = doc.records.find(x => x.name === "Dev's card");
  card.values.seen = 'Me and my coach';
  const as = (person, clientView) => { const d = { ...doc, settings: { ...doc.settings, person } }; const aud = audienceOf(d, { clientView }); return { aud, f: foldDoc(d, aud, ref) }; };
  for (const p of ['Me', 'Partner']) {
    const { aud, f } = as(p, true);
    assert.equal(rowLeftOut(card, aud), true);
    assert.ok(!f.records.some(x => x.id === card.id), `left out of ${p}'s view`);
  }
  const dev = as('P3', true);
  assert.equal(dev.f.records.find(x => x.id === card.id).name, "Dev's card", 'Dev sees his own row by name');
  const all = as('all', true);
  const folded = all.f.records.find(x => x.id === card.id);
  assert.ok(folded.folded, 'folded in Everyone');
  assert.notEqual(folded.name, "Dev's card");
  assert.equal(metrics(all.f, ref, { now }).netWorth.value, metrics(doc, ref, { now }).netWorth.value, 'the household total is the coach\'s, to the cent');
});

test('the single parent who supports her mother: one adult in the plan, a household of three, Everyone is her view', () => {
  const doc = buildPersona(def('sandwich-parent'));
  assert.deepEqual(householdSize(doc), { adults: 1, dependents: 2, size: 3 });
  assert.equal(adultsOf(doc).length, 1);
  assert.deepEqual(metrics(doc, ref, { now, person: 'Me' }).surplus, metrics(doc, ref, { now }).surplus);
  assert.equal(metrics(doc, ref, { now }).inputs.filingStatus, 'Head of household');
});

const fresh = () => new Store(newHousehold({ name: 'Kai Example', now: NOW }), { now: () => NOW });
test('People: a dependent count typed before the list comes into it; the count and the kids\' ages follow the list', () => {
  const s = fresh();
  s.setDoc('profile', { firstName: 'Kai', dependents: 2, kidAges: [3, 9] });
  assert.equal(householdSize(s.doc).size, 3, 'a file from before: the count reads as it always has');
  const id = addPerson(s, 'Dependent');
  assert.equal(id, 'D3');
  assert.equal(s.doc.profile.people.length, 3);
  assert.deepEqual(s.doc.profile.people.slice(0, 2).map(x => x.age), [3, 9]);
  assert.equal(s.doc.profile.dependents, 3);
  setPerson(s, id, { role: 'Parent I support', age: 70 });
  assert.deepEqual(s.doc.profile.kidAges, [3, 9], 'a supported parent is not a kid');
  removePerson(s, 'D1');
  assert.equal(s.doc.profile.dependents, 2);
  assert.deepEqual(s.doc.profile.kidAges, [9]);
});

test('People: up to six adults; taking one out moves their rows to this client and back with Undo', () => {
  const s = fresh();
  s.setDoc('profile', { firstName: 'Kai', mode: 'Married separate', household: 'Couple', partnerName: 'Lee' });
  const ids = [];
  for (let i = 0; i < 5; i++) ids.push(addPerson(s, 'Adult'));
  assert.deepEqual(ids, ['P3', 'P4', 'P5', 'P6', null], `${MAX_ADULTS} adults is the most`);
  assert.equal(personLabels(s.doc).P3, 'Person C', 'unnamed reads Person C');
  setPerson(s, 'P3', { name: 'Mo', role: 'Sibling' });
  const job = s.add('income', { name: 'Mo job', owner: 'P3', amount: 2000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  const rent = s.add('bill', { name: 'Rent', owner: 'Joint', amount: 2000, values: { category: 'Rent or mortgage', splitAmong: ['Me', 'P3'] } });
  assert.equal(metrics(s.doc, ref, { now, person: 'P3' }).inputs.takeHome, 2000);
  assert.equal(removePerson(s, 'P3'), 1);
  assert.equal(s.get(job.id).owner, 'Me');
  assert.deepEqual(s.get(rent.id).values.splitAmong, ['Me']);
  s.undo();
  assert.equal(s.get(job.id).owner, 'P3');
  assert.deepEqual(s.get(rent.id).values.splitAmong, ['Me', 'P3']);
});

test('a couple with a split typed on one row: that row takes the split math, every other row reads as before', () => {
  const s = fresh();
  s.setDoc('profile', { firstName: 'Kai', partnerName: 'Lee', mode: 'Living together', household: 'Couple' });
  s.add('income', { name: 'Kai job', owner: 'Me', amount: 6000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  s.add('income', { name: 'Lee job', owner: 'Partner', amount: 2000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Partner job' });
  s.add('bill', { name: 'Rent', owner: 'Joint', amount: 2000, values: { category: 'Rent or mortgage', splitHow: 'By income' } });
  s.add('bill', { name: 'Electric, gas, water', owner: 'Joint', amount: 100, values: { category: 'Electric, gas, water' } });
  const m = metrics(s.doc, ref, { now, person: 'Partner' });
  assert.equal(m.inputs.lines.find(l => l.name === 'Rent').amount, 500, 'by income: $2,000 x 2,000 / 8,000');
  assert.equal(m.inputs.lines.find(l => l.name === 'Electric, gas, water').amount, 50, 'no split typed: half, as before');
});

import { cliffOf } from '../js/math/cliff.js';
test('the benefits cliff reads the household: every adult in the plan, and a supported parent counts in the size but is not a child', () => {
  const t = buildPersona(def('three-adults'));
  const T = cliffOf(t, ref, { now, m: metrics(t, ref, { now }) }).household;
  assert.equal(T.adults, 3);
  assert.equal(T.size, 3);
  const n = buildPersona(def('sandwich-parent'));
  const N = cliffOf(n, ref, { now, m: metrics(n, ref, { now }) }).household;
  assert.deepEqual([N.adults, N.kids, N.others, N.size], [1, 1, 1, 3]);
});

// ---------- Batch 58: follow-ups to batch 49 ----------
import { createCtx, viewCtx, viewPart, viewLineAmount, whoseChoices } from '../js/ui/staples.js';
import { listPersonOf } from '../js/privacy.js';
import { listsFollowView } from '../js/registry/couples.js';
const lineMonthly = r => (r.per === 'year' ? r.amount / 12 : r.amount);
// What a list's totals come to in one view: each row the view lists, at the view's part (as the list footers add it).
function listTotals(doc, person) {
  const s = new Store({ ...doc, settings: { ...doc.settings, person } }, { now: () => NOW });
  const c = viewCtx(createCtx({ store: s, ref, now: () => now }));
  const m = c.metrics();
  const bills = c.visible(r => r.kind === 'bill' && r.amount != null && r.status !== 'Not for me');
  const lines = bills.reduce((t, r) => t + (viewLineAmount(c, r) ?? lineMonthly(r)), 0) + (m.inputs.autoLines ?? []).reduce((t, a) => t + a.amount, 0);
  const val = r => (r.kind === 'asset' ? r.values.value : r.values.balance) ?? 0;
  const owned = c.visible(r => r.kind === 'account' || r.kind === 'asset').reduce((t, r) => t + val(r) * viewPart(c, r), 0);
  const owed = c.visible(r => r.kind === 'debt').reduce((t, r) => t + (r.values.balance ?? 0) * viewPart(c, r), 0);
  return { c, m, lines, owned, owed };
}

test('QUESTIONS 413: in one adult\'s view the lists hold that adult\'s rows and their part of the shared ones, and add up to their strip', () => {
  for (const id of ['three-adults', 'poly-household']) {
    const doc = buildPersona(def(id));
    for (const a of adultsOf(doc)) {
      const { c, m, lines, owned, owed } = listTotals(doc, a.id);
      assert.equal(c.listPerson, a.id, `${id}: the lists follow ${a.name}`);
      assert.equal(Math.round(lines), Math.round(m.inputs.spending), `${id} ${a.name}: the Budget lines add up to the strip's spending`);
      assert.equal(Math.round(owned - owed), Math.round(m.netWorth.value), `${id} ${a.name}: Assets less Debt is the strip's net worth`);
    }
  }
  const poly = buildPersona(def('poly-household'));
  const cam = listTotals(poly, 'P3');
  assert.ok(!cam.c.visible(r => r.kind === 'bill').some(r => r.name === 'Pet costs'), 'the pets are Ana\'s and Ben\'s');
  assert.equal(viewLineAmount(cam.c, poly.records.find(r => r.name === 'Groceries')), 250, 'Cam pays 25% of the groceries');
  assert.equal(viewPart(cam.c, poly.records.find(r => r.name === 'Mortgage')), 0.2);
});

test('QUESTIONS 413: Everyone, a couple and one adult keep every row (the household\'s books)', () => {
  const three = buildPersona(def('three-adults'));
  assert.equal(listsFollowView(three), true);
  const poly = buildPersona(def('poly-household'));
  assert.equal(listPersonOf({ ...poly, settings: { ...poly.settings, person: 'all' } }), null, 'Everyone');
  assert.equal(listPersonOf({ ...poly, settings: { ...poly.settings, person: 'P3' } }), 'P3');
  const couple = buildPersona(def('couple-separate'));
  assert.equal(listsFollowView(couple), false, 'a couple\'s lists read as before (QUESTIONS 420)');
  assert.equal(listPersonOf({ ...couple, settings: { ...couple.settings, person: 'Partner' } }), null);
  const s = new Store(couple, { now: () => NOW });
  const c = viewCtx(createCtx({ store: s, ref, now: () => now }));
  assert.equal(c.visible(r => r.kind === 'bill').length, createCtx({ store: s, ref, now: () => now }).visible(r => r.kind === 'bill').length);
  assert.equal(listPersonOf(buildPersona(def('maya'))), null, 'one adult');
});

test('QUESTIONS 415: Whose on an institution or a homework item offers every adult by name, then Joint', () => {
  assert.deepEqual(whoseChoices(buildPersona(def('poly-household'))).map(x => x[1]), ['Ana', 'Ben', 'Cam', 'Joint']);
  assert.deepEqual(whoseChoices(buildPersona(def('couple-separate'))).map(x => x[0]), ['Me', 'Partner', 'Joint']);
});

test('QUESTIONS 418: the poly household holds Cam as an adult in the plan, with Cam\'s own paycheck, card and view', () => {
  const doc = buildPersona(def('poly-household'));
  assert.deepEqual(adultsOf(doc).map(a => a.name), ['Ana', 'Ben', 'Cam']);
  const v = p => metrics(doc, ref, { now, person: p });
  const [a, b, c, e] = ['Me', 'Partner', 'P3', null].map(v);
  assert.equal(a.surplus.value + b.surplus.value + c.surplus.value, e.surplus.value);
  assert.equal(a.netWorth.value + b.netWorth.value + c.netWorth.value, e.netWorth.value);
  assert.equal(c.inputs.autoLines.find(x => x.name === 'Mortgage payment').amount, 520, 'the mortgage 40/40/20 on the row');
  assert.ok(c.inputs.debts.some(d => d.name === "Cam's card"));
  assert.ok(!doc.records.some(r => r.kind === 'income' && r.owner === 'Joint'), 'no more "Cam\'s share" as money coming in');
  // Cam files a return of their own (QUESTIONS 412): Cam's view reads Cam's return, the household's reads all of them.
  const camRate = householdRates(c.inputs.householdTax, ref, { person: 'P3' });
  const camRows = Object.values(c.inputs.householdTax.rows).filter(r => r.person === 'P3');
  assert.equal(camRate.effective, camRows.reduce((t, r) => t + r.total, 0) / camRows.reduce((t, r) => t + r.gross, 0));
  assert.notEqual(camRate.effective, householdRates(e.inputs.householdTax, ref).effective);
});
import { householdRates } from '../js/math/income.js';

test('QUESTIONS 419: each adult past the couple has a birth year on People, and it is registered', () => {
  const s = fresh();
  s.setDoc('profile', { firstName: 'Kai', mode: 'Married separate', household: 'Couple', partnerName: 'Lee' });
  const id = addPerson(s, 'Adult');
  setPerson(s, id, { name: 'Mo', birthYear: 1961 });
  assert.equal(s.doc.profile.people.find(x => x.id === id).birthYear, 1961);
  assert.equal(buildPersona(def('poly-household')).profile.people[0].birthYear, 1992);
});
