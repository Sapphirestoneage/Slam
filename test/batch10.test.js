// Batch 10 (Nov 5 2026): faded typical amounts, Bills and subscriptions, levels with Everything else, Why now chips,
// and the timing sentence of the spending line side panel. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { createCtx } from '../js/ui/staples.js';
import { addPresets, useTypical, migrateBatch10, ensureCategories } from '../js/presets.js';
import { metrics, flowOf } from '../js/math/metrics.js';
import { pictureOf } from '../js/math/picture.js';
import { categoryTotals, everythingElse, isFaded, levelOf, typicalTotal, drafttShares, inFat, categoryKeyOf, LEVEL_ELSE } from '../js/math/spending.js';
import { instances, balances, monthView } from '../js/month.js';
import { checksOf, defaultsInUse } from '../js/checks.js';
import { budgetCompletion } from '../js/completion.js';
import { fiTargets, next3 } from '../js/plan.js';
import { layersOf } from '../js/math/layers.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { profileCompletion } from '../js/profile-completion.js';
import { whyAnswered, whyText, toggleChip, starChip, goalSuggestions, WHY_CHIPS } from '../js/whynow.js';
import { timingOf, timingPatch, timingWords } from '../js/timing.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const YM = '2026-11';
// The usability test's client: gut $3,500, take-home $5,200, checking $1,200, and the usual list untouched.
function newClient() {
  const s = new Store(newHousehold({ name: 'Synthetic', now: now.toISOString() }), { now: () => now.toISOString() });
  s.add('income', { name: 'Take-home pay', amount: 5200, per: 'month', status: 'Roughly', values: { basis: 'Take-home', payFrequency: 'month' } }, { type: 'Job' });
  s.add('spending', { name: 'Monthly spending, all in', amount: 3500, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } }, { type: 'All in' });
  s.add('account', { name: 'Checking', status: null, values: { group: 'cash', balance: 1200 } }, { type: 'Checking' });
  addPresets(s, ref);
  ensureCategories(s);
  return s;
}
const ctxOf = s => createCtx({ store: s, ref, now: () => now });

test('1: a new client: every starter line is faded (a typical amount, no amount) and counts nowhere', () => {
  const s = newClient();
  const bills = s.find(r => r.kind === 'bill');
  assert.ok(bills.length >= 40 && bills.every(isFaded));
  const m = metrics(s.doc, ref, { now });
  assert.equal(m.inputs.spending, 3500, 'spending is the gut number');
  assert.equal(m.inputs.lineTotal, null, 'no line total while every line is faded');
  assert.equal(m.inputs.spendingSource, 'gut');
  // Even with the Budget switched to the lines, the gut number stays the only spending number until a line is real.
  s.setDoc('spending', { source: 'lines' });
  const m2 = metrics(s.doc, ref, { now });
  assert.equal(m2.inputs.spending, 3500);
  assert.ok(m2.inputs.categories.every(c => c.amount == null), 'no category reads a faded line');
  const f = flowOf(m2.inputs);
  assert.equal(f.fixed, null); assert.equal(f.variable, null);
  assert.equal(drafttShares(m2.inputs.lines, 5200).totals.Accommodation, 0, 'Biggest DRAFTT letter: nothing from the faded Rent');
  assert.equal(m2.housingPct.value, null, 'Housing %: the faded Rent is not rent');
  assert.equal(fiTargets(m2, s.doc)['Lean FI'].value, null, 'Lean FI reads no faded line');
  const layers = layersOf(s.doc, ref, now);
  assert.equal(layers.layers.find(l => l.id === 'big-e:fat')?.target ?? 0, 0);
  assert.ok(typicalTotal(bills) > 5000, 'the typical amounts still add up, for reference');
});

test('1: faded lines stay off the calendar, its low line and timing risk, Month end gaps, the Revisit list and Defaults in use', () => {
  const s = newClient();
  const list = instances(s.doc, ref, YM, { now });
  assert.ok(!list.some(i => i.kind === 'bill'), 'no starter line on the calendar');
  assert.ok(!list.some(i => i.risk), 'no timing risk');
  s.setIn('spending', ['calendar', 'start'], 1200);
  assert.equal(balances(s.doc, ref, YM, 1, { now, low: 500 }).firstLow ?? null, null, 'the balance never dips below the low line from faded lines');
  const v = monthView(s.doc, ref, YM, { now });
  assert.equal(v.gaps.length, 0, 'Month end: no line needs an actual');
  assert.equal(v.rows.filter(r => (r.estimate ?? 0) > 0).length, 0, 'Actuals 0 of 0');
  const checks = checksOf(s.doc, ref, { now });
  assert.ok(!checks.some(c => c.guesses), 'no "starter spending guesses to review"');
  assert.ok(!checks.some(c => c.rec?.kind === 'bill'));
  assert.equal(defaultsInUse(s.doc, ref).filter(d => d.rec.kind === 'bill').length, 0, 'faded lines are not in use');
  const n = next3(s.doc, ref, { now, limit: 99 });
  assert.ok(!n.all.some(c => c.recId && s.get(c.recId)?.kind === 'bill'), 'Next 3 never points at a faded line');
});

test('1: Use enters the typical amount as Roughly; it counts, it is in Defaults in use, and typing a number makes it Know it', () => {
  const s = newClient();
  const rent = s.find(r => r.name === 'Rent')[0];
  assert.equal(useTypical(s, rent.id), 1);
  const r = s.get(rent.id);
  assert.deepEqual([r.amount, r.status, r.values.usedTypical, isFaded(r)], [2000, 'Roughly', true, false]);
  s.setDoc('spending', { source: 'lines' });
  const m = metrics(s.doc, ref, { now });
  assert.equal(m.inputs.categories.find(c => c.key === 'Accommodation').amount, 2000);
  assert.equal(m.inputs.spending, 2000, 'only the one real line counts');
  const d = defaultsInUse(s.doc, ref).filter(x => x.rec.kind === 'bill');
  assert.deepEqual(d.map(x => [x.rec.name, x.from]), [['Rent', 'Typical amount, used']]);
  assert.ok(instances(s.doc, ref, YM, { now }).some(i => i.recId === rent.id), 'a used line is on the calendar');
  // The workbook: live numbers leave faded lines out; the typical amount is its own labeled column.
  const wb = buildWorkbook(s.doc, ref, { now });
  const tab = wb.sheets.find(x => x.name === 'Spending lines');
  const head = tab.rows[0].map(c => c.v);
  assert.ok(head.includes('Typical amount (for reference, not counted)'));
});

test('1: the migration: untouched starter amounts turn faded once; edited ones keep their amounts exactly', () => {
  const s = new Store(newHousehold({ name: 'Old', now: now.toISOString() }), { now: () => now.toISOString() });
  // An older file: the usual list as it used to be added (the guess as the amount, Not sure).
  s.transaction('Add the usual list', () => { for (const l of ref.spendingPresets.lines) s.add('bill', { name: l.name, amount: l.guess, per: 'month', status: 'Not sure', source: 'Usual list', values: { category: l.category, draftt: l.name === 'Phone' ? 'Accommodation' : ['Streaming', 'Music'].includes(l.name) ? 'Other' : l.draftt, amountType: l.amount, timing: l.timing, preset: true } }); });
  const rent = s.find(r => r.name === 'Rent')[0], gro = s.find(r => r.name === 'Groceries')[0], kept = s.find(r => r.name === 'Internet')[0];
  s.update(rent.id, { amount: 1650 }); // typed over
  s.update(gro.id, { amount: 450 }); // typed over
  s.setStatus([kept.id], 'Know it'); // accepted as is
  const doc = JSON.parse(JSON.stringify(s.doc));
  const n = migrateBatch10(doc, ref);
  const by = name => doc.records.find(r => r.name === name);
  assert.equal(by('Rent').amount, 1650); assert.equal(by('Groceries').amount, 450); assert.equal(by('Internet').amount, 80);
  assert.ok(isFaded(by('Dining out and takeout')) && by('Dining out and takeout').values.typical === 350);
  assert.equal(n, ref.spendingPresets.lines.length - 3);
  assert.equal(doc.settings.fadedNote, n, 'the one-time note');
  assert.equal(by('Phone').values.draftt, 'Bills', 'Phone moves to Bills and subscriptions');
  assert.equal(by('Streaming').values.draftt, 'Bills');
  assert.equal(by('Internet').values.draftt, 'Accommodation', 'Internet stays');
  assert.equal(levelOf(by('Coffee and snacks')), 3, 'levels from Reference data');
  assert.equal(migrateBatch10(doc, ref), 0, 'once per file');
});

test('2: Bills and subscriptions: its lines, its own category; Phone stays in FAT (Lean FI) as it was in Accommodation', () => {
  const bills = ref.spendingPresets.lines.filter(l => l.draftt === 'Bills').map(l => l.name).sort();
  assert.deepEqual(bills, ['Amazon Prime and memberships', 'Apps and cloud storage', 'Music', 'News and magazines', 'Phone', 'Streaming']);
  assert.ok(ref.spendingPresets.lines.some(l => l.name === "Kids' allowance and phone" && l.draftt === 'Other'));
  assert.equal(ref.spendingPresets.lines.find(l => l.name === 'Internet').draftt, 'Accommodation');
  const phone = { draftt: 'Bills', category: 'Phone', amount: 90 };
  assert.equal(categoryKeyOf(phone), 'Bills');
  assert.ok(inFat(phone), 'Phone stays in the FAT set');
  assert.ok(!inFat({ draftt: 'Bills', category: 'Streaming' }));
  assert.equal(categoryTotals([], [phone]).find(c => c.key === 'Bills').amount, 90);
});

test('3: levels default from Reference data, a line the client adds is Level 2, and promotion moves it out of Everything else', () => {
  const lv = n => ref.spendingPresets.lines.find(l => l.name === n).level;
  assert.deepEqual(['Rent', 'Internet', 'Laundry and dry cleaning', 'Phone', 'Music', 'Pet food', 'Pet grooming', 'Travel', 'Dates', 'Gas or charging', 'Car wash and supplies'].map(lv), [1, 2, 3, 1, 3, 2, 3, 2, 3, 1, 3]);
  assert.ok(ref.spendingPresets.lines.every(l => [1, 2, 3].includes(l.level)));
  assert.equal(levelOf({ values: {} }), 2, 'a line the client adds');
  const s = newClient();
  const coffee = s.find(r => r.name === 'Coffee and snacks')[0];
  assert.equal(levelOf(coffee), LEVEL_ELSE);
  s.update(coffee.id, { level: 2 });
  assert.equal(levelOf(s.get(coffee.id)), 2, 'Move up');
  s.update(coffee.id, { level: 3 });
  assert.equal(levelOf(s.get(coffee.id)), 3, 'and back down');
});

test('3: Everything else: the pieces win once any has a number, else one rough bucket amount; never both', () => {
  const pieces = [{ amount: null, level: 3 }, { amount: null, level: 3 }];
  assert.deepEqual([everythingElse(pieces, 150).from, everythingElse(pieces, 150).amount], ['bucket', 150]);
  const filled = [{ amount: 40, level: 3 }, { amount: null, level: 3 }];
  const e = everythingElse(filled, 150);
  assert.deepEqual([e.from, e.amount, e.replaced], ['pieces', 40, true]);
  // In a category: Level 1 and 2 lines plus Everything else, no double count.
  const lines = [{ draftt: 'Food', amount: 500, level: 1 }, { draftt: 'Food', amount: 300, level: 2 }, { draftt: 'Food', amount: null, level: 3 }];
  const rec = { type: 'Food', amount: null, values: { elseAmount: 100 } };
  assert.equal(categoryTotals([rec], lines).find(c => c.key === 'Food').amount, 900, '500 + 300 + the 100 bucket');
  const more = [...lines.slice(0, 2), { draftt: 'Food', amount: 60, level: 3 }];
  assert.equal(categoryTotals([rec], more).find(c => c.key === 'Food').amount, 860, 'the piece replaces the bucket');
  // The bucket alone makes the lines count; the progress counts Level 1 and 2 only, so a rough bucket is not nagged.
  const s = newClient();
  const food = s.find(r => r.kind === 'spending' && r.type === 'Food')[0];
  s.update(food.id, { elseAmount: 120 });
  const m = metrics(s.doc, ref, { now });
  assert.equal(m.inputs.categories.find(c => c.key === 'Food').amount, 120);
  const p = pictureOf(s.doc, ref, { now });
  assert.ok(!p.items.some(it => it.lines?.some(l => s.get(l.id)?.values.level === 3)), 'Level 3 lines never in the Picture');
});

test('1: the Picture and the pace read only real lines', () => {
  const s = newClient();
  s.setDoc('spending', { source: 'lines' });
  const p = pictureOf(s.doc, ref, { now });
  assert.ok(!p.items.some(it => it.kind === 'category'), 'no category from faded lines');
  assert.ok(p.items.some(it => it.id === 'gut'), 'the gut number stands in');
  // The Picture % is the same as with no starter lines at all: faded lines add nothing (the old file read 71%, Ahead).
  const bare = newClient();
  for (const r of bare.find(x => x.kind === 'bill')) bare.remove([r.id], { quiet: true });
  bare.setDoc('spending', { source: 'lines' });
  assert.ok(Math.abs(p.pct - pictureOf(bare.doc, ref, { now }).pct) < 1e-9);
  assert.ok(Math.round(p.pct * 100) < 71);
  const ctx = ctxOf(s);
  const c = budgetCompletion(ctx).core;
  assert.ok(c.done < c.of, 'no green check on Budget from faded lines');
});

test('4: Why now chips: several, a star, Other words; a chip or text answers the question; goal chips suggest goals, never add them', () => {
  let p = {};
  assert.equal(whyAnswered(p, 'whyNow'), false);
  p = { ...p, ...toggleChip(p, 'whyNow', 'Job change or layoff') };
  p = { ...p, ...toggleChip(p, 'whyNow', 'Windfall or raise') };
  p = { ...p, ...starChip(p, 'whyNow', 'Windfall or raise') };
  assert.ok(whyAnswered(p, 'whyNow'));
  assert.equal(whyText(p, 'whyNow'), 'Windfall or raise; Job change or layoff');
  p = { ...p, ...toggleChip(p, 'whyNow', 'Windfall or raise') };
  assert.equal(p.chipStar.whyNow, null, 'unticking the starred chip clears the star');
  assert.ok(whyAnswered({ worry: 'In their words only' }, 'worry'), 'text still answers');
  assert.equal(WHY_CHIPS.goalWords.at(-1), 'Other');
  const doc = newHousehold({ name: 'X' });
  doc.profile = { chips: { whyNow: ['Debt feels out of control'], worry: ['Debt'], goalWords: ['Debt free', 'Feel in control, less stress', 'Buy a home'] }, chipStar: { goalWords: 'Buy a home' } };
  const pc = profileCompletion(doc).core;
  assert.ok(!pc.missing.includes('What prompted this call') && !pc.missing.includes('Biggest worry') && !pc.missing.includes('Goal in their words'));
  const sug = goalSuggestions(doc.profile, []);
  assert.deepEqual(sug.map(g => g.chip), ['Buy a home', 'Debt free'], 'mapped goals only, the starred one first');
  assert.deepEqual(goalSuggestions(doc.profile, [{ kind: 'milestone', type: 'Debt free', name: 'Debt free' }]).map(g => g.chip), ['Buy a home'], 'a goal already in the plan is not suggested');
  assert.deepEqual(goalSuggestions({ ...doc.profile, goalSuggest: ['Buy a home'] }, []).map(g => g.chip), ['Debt free'], 'Not now sets one aside');
  assert.equal(doc.records.filter(r => r.kind === 'milestone').length, 0, 'nothing added on its own');
});

test('5b: the timing sentence maps onto the stored fields, both ways', () => {
  const line = { per: 'month', values: { timing: 'Fixed date', dueDay: 1 } };
  assert.deepEqual(timingOf(line), { freq: 'month', day: 1, weekday: null, month: null });
  assert.equal(timingWords(line), 'every month on the 1st');
  assert.deepEqual(timingPatch(line, { day: 15 }), { dueDay: 15 });
  assert.equal(timingWords({ values: { timing: 'Fixed date', dueDay: 31 } }), 'every month on the last day');
  assert.deepEqual(timingPatch(line, { freq: 'week' }), { timing: 'Weekly', dueDay: null, irregular: null });
  assert.equal(timingWords({ values: { timing: 'Weekly', weekday: 4 } }), 'every week on Thursday');
  assert.deepEqual(timingPatch(line, { freq: 'varies' }), { timing: 'Variable date', dueDay: null, irregular: null });
  assert.equal(timingWords({ values: { timing: 'Variable date' } }), 'it varies');
  const yearly = { ...line, values: { ...line.values, ...timingPatch(line, { freq: 'year' }) }, per: 'year' };
  assert.deepEqual(timingPatch(line, { freq: 'year' }), { irregular: true, per: 'year', timing: 'Fixed date' });
  assert.deepEqual(timingPatch(yearly, { month: 3 }), { monthDue: 3 });
  assert.equal(timingWords({ per: 'year', values: { irregular: true, monthDue: 3, dueDay: 15 } }), 'every year in Mar on the 15th');
  assert.deepEqual(timingPatch(yearly, { freq: 'month' }), { timing: 'Fixed date', irregular: null, per: 'month', monthDue: null });
  // The calendar reads the same fields: a Fixed date on the 15th lands on the 15th.
  const s = newClient();
  const rent = s.find(r => r.name === 'Rent')[0];
  useTypical(s, rent.id);
  s.update(rent.id, timingPatch(s.get(rent.id), { day: 15 }));
  assert.equal(instances(s.doc, ref, YM, { now }).find(i => i.recId === rent.id).date, '2026-11-15');
});
