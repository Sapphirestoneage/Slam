// Batch 8 (Nov 6 2026): the category-first Budget, Will get it, blank rows, the empty-list hunt, the answers to
// 177 to 181. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { createCtx } from '../js/ui/staples.js';
import { categoryTotals, CATEGORIES, isCategoryRecord } from '../js/math/spending.js';
import { metrics } from '../js/math/metrics.js';
import { pictureOf } from '../js/math/picture.js';
import { LEVELS } from '../js/registry/program.js';
import { budgetCompletion, missingFor, isBlankRow, rowsOn } from '../js/completion.js';
import { ensureCategories } from '../js/presets.js';
import { homeworkList, LATER } from '../js/homework.js';
import { agendaOf, startSession, endSession, programOf } from '../js/program.js';
import { scorecardOf } from '../js/math/scorecard.js';
import { THRESHOLDS } from '../js/registry/scorecard.js';
import { agenda as guideAgenda } from '../js/plan.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const flags = JSON.parse(readFileSync(new URL('../data/flags.json', import.meta.url)));
const now = new Date('2026-11-06T12:00:00Z');
const freshCtx = () => { const store = new Store(newHousehold({ name: 'Synthetic', now: now.toISOString() }), { now: () => now.toISOString() }); return createCtx({ store, ref, now: () => now }); };
const demoCtx = () => { const store = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() }); return createCtx({ store, ref, now: () => now }); };
const cat = (s, key, amount, status = null) => s.add('spending', { name: key, amount, per: 'month', status, values: {} }, { type: key });
const line = (s, draftt, amount, extra = {}) => s.add('bill', { name: `${draftt} line`, amount, values: { draftt, category: draftt, amountType: 'Variable', ...extra } });

test('A1, A2: a category is its typed amount; lines alone read as the category; lines above the typed amount update it; the rest is not assigned yet', () => {
  const typed = { type: 'Food', amount: 600, per: 'month', status: null };
  const lines = [{ amount: 200, draftt: 'Food' }, { amount: 150, draftt: 'Food' }, { amount: 900, draftt: 'Accommodation' }];
  const t = categoryTotals([typed], lines);
  const food = t.find(c => c.key === 'Food'), acc = t.find(c => c.key === 'Accommodation'), fun = t.find(c => c.key === 'Other');
  assert.deepEqual([food.from, food.amount, food.linesSum, food.unassigned], ['typed', 600, 350, 250], '$250 not assigned yet');
  assert.deepEqual([acc.from, acc.amount], ['lines', 900], 'no typed amount: the lines are the category');
  assert.deepEqual([fun.from, fun.amount, fun.counts], ['none', null, false]);
  const up = categoryTotals([{ type: 'Food', amount: 300, per: 'month' }], lines).find(c => c.key === 'Food');
  assert.deepEqual([up.from, up.amount, up.typed], ['updated', 350, 300], 'lines above the typed amount: updated from $300');
  assert.equal(categoryTotals([{ type: 'Food', amount: 1200, per: 'year' }], []).find(c => c.key === 'Food').amount, 100, 'a yearly category reads a month');
  assert.deepEqual(CATEGORIES.slice(0, 3), ['Accommodation', 'Food', 'Transportation']);
});

test('A1, A3: typed categories alone carry the spending in the math; an existing file with lines reads exactly as before', () => {
  const ctx = freshCtx(); const s = ctx.store;
  s.add('income', { name: 'Job', amount: 4000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  cat(s, 'Accommodation', 1500); cat(s, 'Food', 500); cat(s, 'Transportation', 200); cat(s, 'Retirement', 300);
  const m = metrics(s.doc, ref, { now });
  assert.equal(m.inputs.lineTotal, 2200, 'the categories add up; Retirement is investing, not spending');
  assert.equal(m.inputs.retirementLines, 300);
  assert.equal(m.inputs.spending, 2200, 'no gut number: the categories are used');
  assert.equal(m.surplus.value, 1800, 'Retirement is paid out of the surplus (answer 125)'); assert.equal(m.investing.contributions, 300);
  const d = demoCtx();
  const before = metrics(d.store.doc, ref, { now }).inputs.lineTotal;
  ensureCategories(d.store);
  assert.equal(ensureCategories(d.store), 0, 'made once');
  assert.equal(d.store.find(isCategoryRecord).length, CATEGORIES.length);
  assert.equal(metrics(d.store.doc, ref, { now }).inputs.lineTotal, before, 'blank category rows change nothing: category = the sum of its lines');
});

test('A3: the Picture counts categories, not lines; a typed category is one item at its own level', () => {
  const ctx = freshCtx(); const s = ctx.store;
  s.setDoc('profile', { age: 30, areas: { cash: true, investments: false, real: false, debt: false } });
  s.add('income', { name: 'Job', amount: 4000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  line(s, 'Food', 100, {}); line(s, 'Food', 50, {}); s.setStatus(s.find(r => r.kind === 'bill').map(r => r.id), 'Not sure');
  let items = pictureOf(s.doc, ref, { now }).items.filter(it => it.group === 'spending');
  assert.equal(items.length, 1); assert.equal(items[0].level, LEVELS.Gut, 'two Guess lines: the category reads Gut');
  const food = cat(s, 'Food', 600, 'Know it');
  items = pictureOf(s.doc, ref, { now }).items.filter(it => it.group === 'spending');
  assert.equal(items.length, 1, 'still one item: the category, not its lines');
  assert.equal(items[0].recId, food.id); assert.ok(items[0].level >= LEVELS.Estimate, 'the typed category counts on its own');
});

test('A3, B9, 180: the Budget counters count categories; a blank row counts nowhere; a fixed line with no due day asks for one as full detail', () => {
  const ctx = freshCtx(); const s = ctx.store;
  let c = budgetCompletion(ctx);
  assert.deepEqual([c.core.done, c.core.of], [0, 3], 'the three FAT categories always count');
  cat(s, 'Accommodation', 1500); line(s, 'Food', 400, { amountType: 'Fixed' }); cat(s, 'Taxes', null, LATER);
  s.add('bill', { name: null, amount: null, values: { draftt: 'Food', category: 'Groceries' } }); // a blank row
  c = budgetCompletion(ctx);
  assert.deepEqual([c.core.done, c.core.of, c.core.parked], [2, 4, 1], 'typed, lines, and Taxes parked as Getting it');
  assert.deepEqual(c.core.missing, ['Transportation: amount']);
  assert.equal(c.core.items[0].focus, 'cat:Transportation:amount');
  assert.deepEqual(c.full.missing, ['Set due day for Food line'], 'answer 180');
  assert.ok(missingFor(ctx, '#/cash-flow/budget').some(it => it.field === 'dueDay' && it.level === 'Full detail'));
  assert.ok(isBlankRow(s.find(r => r.kind === 'bill' && !r.name)[0]));
  assert.ok(!isBlankRow(s.find(r => r.name === 'Food line')[0]));
  assert.equal(rowsOn(freshCtx(), '#/net-worth/debt'), 0, 'an empty screen says so (C14)');
});

test('B5: Will get it reads Find: … on the homework list and lands on the next session\'s agenda when the session ends', () => {
  const ctx = demoCtx(); const s = ctx.store;
  const car = s.find(r => r.kind === 'debt' && r.type === 'Car loan')[0];
  s.setFieldStatus(car.id, 'apr', LATER);
  const hw = homeworkList(s.doc, s.records).find(x => x.field === 'apr');
  assert.match(hw.label, /^Find: .*APR$/);
  startSession(s, ref, { now, flags });
  const end = endSession(s, ref, { now, flags });
  const next = agendaOf(s.doc, ref, { now, flags });
  assert.ok(next.going.some(g => g.label === hw.label && g.link?.kind === 'homework'), `on session ${end.n + 1}'s agenda: ${next.going.map(g => g.label).join(' | ')}`);
  startSession(s, ref, { now, flags }); endSession(s, ref, { now, flags });
  assert.equal(agendaOf(s.doc, ref, { now, flags }).going.filter(g => g.label === hw.label).length, 1, 'carried once, never twice');
});

test('A4: S3 and S4 suggest breaking down the biggest typed category that is not itemized', () => {
  const ctx = demoCtx(); const s = ctx.store;
  ensureCategories(s);
  s.setIn('session', ['count'], 2, 'x'); // the next session is S3
  const acc = s.find(r => isCategoryRecord(r) && r.type === 'Accommodation')[0];
  const lines = metrics(s.doc, ref, { now }).inputs.categories.find(c => c.key === 'Accommodation').linesSum ?? 0;
  s.update(acc.id, { amount: Math.round(lines) + 900 });
  const sg = agendaOf(s.doc, ref, { now, flags }).suggestions.find(x => x.kind === 'category');
  assert.ok(sg && /Break down your biggest category: Accommodation/.test(sg.label), sg?.label);
  s.setIn('session', ['count'], 5, 'x');
  assert.ok(!agendaOf(s.doc, ref, { now, flags }).suggestions.some(x => x.kind === 'category'), 'only in S3 and S4');
});

test('C14: an empty list is not a pass: holes ranked, top 3 chosen and the Guide me debt step wait for something to check', () => {
  const ctx = freshCtx(); const s = ctx.store;
  const P = programOf(s.doc, ref, { now, flags });
  const s5 = P.sessions.find(x => x.id === 'S5'), s6 = P.sessions.find(x => x.id === 'S6');
  assert.ok(!s5.items.find(i => i.id === 'ranked').done, 'nothing rated: holes are not "ranked"');
  assert.ok(!(s6?.items.find(i => i.id === 'top3')?.done), 'nothing rated: no top 3 chosen');
  s.setDoc('profile', { areas: { cash: true, investments: false, real: false, debt: true } });
  assert.ok(!guideAgenda(s.doc, ref, { now }).steps.find(x => x.id === 'debt').done, 'the debt area on but no debt typed is not done');
});

test('179: the taxes band scales with income (about 2% of a year\'s take-home)', () => {
  const ctx = freshCtx(); const s = ctx.store;
  s.setDoc('profile', { age: 30, areas: { cash: true, investments: false, real: false, debt: false }, taxes: { lastYear: 900 } });
  s.add('income', { name: 'Job', amount: 4000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  const area = () => scorecardOf(s.doc, ref, { now }).areas.find(a => a.id === 'taxes');
  assert.equal(THRESHOLDS.taxes.closeEnoughShare, 0.02);
  assert.equal(area().rating, 'Strong', '$900 is within 2% of $48,000');
  s.setDoc('profile', { taxes: { lastYear: 1500 } });
  assert.equal(area().rating, 'Hole', '$1,500 is over the $960 band');
  s.setDoc('profile', { taxes: { lastYear: 1500 } }); s.update(s.find(r => r.kind === 'income')[0].id, { amount: 10000 });
  assert.equal(area().rating, 'Strong', 'the band grows with income: 2% of $120,000 is $2,400');
});
