// Batch 45 (Nov 6 2026): the decided small items owed from tonight's batches (QUESTIONS 321, 333, 334, 344, 345, 346,
// 348, 349, 353, 354, 356 and Batch 39's Budget minor). Each check is worked by hand in its comment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile, Store } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { monthView, instances, closeMonth, startBalance } from '../js/month.js';
import { buildWorkbook, movedWords } from '../js/sheet/workbook.js';
import { sharedBackup, countable, foldDoc } from '../js/privacy.js';
import { walkStops, useStopTypical } from '../js/walk.js';
import { createCtx } from '../js/ui/staples.js';
import { overviewNotFor } from '../js/gates.js';
import { PLAIN_ON } from '../js/glossary.js';
import { ICONS } from '../js/ui/dom.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z'); // the personas' moment
const persona = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));
const near = (a, b, tol = 0.02) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);

test('Q321: a month with its own gut number splits that number at Month end (Maya, by hand)', () => {
  // Maya: gut $3,500 not including debt; Accommodation holds $1,750 typed, so the gut-only categories share $1,750
  // (Food $313.75 of it). December's own gut number $4,500 leaves $2,750: Food 313.75 x 2,750 / 1,750 = $493.04.
  const s = new Store(persona('maya'), { now: () => now.toISOString() });
  const usual = monthView(s.doc, ref, '2026-12', { now, gutCats: true });
  const food = v => v.rows.find(r => r.gutCat === 'Food').estimate;
  near(food(usual), 313.75);
  near(usual.rows.filter(r => r.gutCat).reduce((t, r) => t + r.estimate, 0), 1750);
  s.setIn('spending', ['months', '2026-12', 'gut'], 4500);
  const dec = monthView(s.doc, ref, '2026-12', { now, gutCats: true });
  assert.equal(dec.gut, 4500);
  near(food(dec), 493.04);
  near(dec.rows.filter(r => r.gutCat).reduce((t, r) => t + r.estimate, 0), 2750);
  near(dec.totals.estimate, 4500);
  // Other months keep the usual split; the Budget's own view (no gutCats) is unchanged.
  near(food(monthView(s.doc, ref, '2027-01', { now, gutCats: true })), 313.75);
  assert.ok(!monthView(s.doc, ref, '2026-12', { now }).rows.some(r => r.gutCat));
});

test('Q334: a dated row reads "Moved on since this file was made" in a later month, and only a dated row', () => {
  // The multimillionaire saves for a dated goal each month (a sinking fund), so M27 · sinking counts months to it.
  const plan = buildWorkbook(persona('multimillionaire'), ref, { now });
  const math = plan.sheets.find(x => x.name === 'Math');
  const check = id => math.rows.find(r => r?.[0]?.v === id)?.find(c => c?.s === 'check');
  const words = movedWords(now);
  assert.equal(words, 'Moved on since this file was made (Nov 5)');
  for (const id of ['M27 · sinking', 'M27']) {
    assert.ok(check(id).dated, `${id} is dated`);
    assert.ok(check(id).f.startsWith('IF(TEXT(TODAY(),"yyyy-mm")<>"2026-11",') && check(id).f.includes(words), id);
  }
  assert.ok(!check('M20').dated, 'a Budget line a month does not count months');
  // A household with no dated row has no Moved on check at all (Maya: no Starts in, no sinking fund).
  const maya = buildWorkbook(persona('maya'), ref, { now });
  assert.ok(!maya.sheets.some(x => x.rows.some(r => r?.some(c => c?.dated))));
});

test('Q333 and Q353: the spreadsheet made Without private rows is the shared backup, the fan page at its net only', () => {
  const doc = persona('discreet-couple');
  const shared = sharedBackup(doc, ref);
  const fan = doc.records.find(r => r.values?.chargebacks === 115);
  const plan = buildWorkbook(shared, ref, { now, shared: true });
  const income = plan.sheets.find(x => x.area === 'income');
  const row = income.rows.find(r => r.some(c => c?.v === fan.id));
  const cell = key => row[income.layout.findIndex(l => l.key === key)]?.v ?? null;
  assert.equal(cell('name'), 'Self-employment');
  assert.equal(cell('amount'), 2265, '$2,975 less the 20% fee less $115 chargebacks');
  assert.ok(!cell('feePct'), 'no fee in the file'); assert.ok(!cell('holdDays'), 'no hold in the file'); assert.ok(!cell('platform'));
  const text = JSON.stringify(plan.sheets.map(x => x.rows));
  for (const w of ['Velvet Room', 'Lantern', 'Wise payout', '7781']) assert.ok(!text.includes(w), w);
  // The same rows as the shared backup, so the two files hold the same household; and the same totals as the coach's.
  assert.deepEqual(shared.records.map(r => r.name).sort(), foldDoc(doc, { who: 'share', person: 'all', couple: false }, ref).records.map(r => r.name).sort());
  near(metrics(shared, ref, { now }).surplus.value, metrics(doc, ref, { now }).surplus.value, 0.005);
});

test('Q344: a short month asks each card\'s limit in the walk; I don\'t know keeps the typical limit, marked a guess', () => {
  // Alexis: $2,600 take-home against $2,800 + $120 on her Visa less what the gut leaves: short $200, so her Visa's limit
  // is a stop; at 28 the typical is Experian's $16,139.
  const s = new Store(persona('alexis'), { now: () => now.toISOString() });
  const ctx = createCtx({ store: s, ref, now: () => now });
  assert.ok(ctx.metrics().surplus.value < 0);
  const stop = walkStops(ctx).find(x => x.field === 'limit');
  assert.equal(stop.name, "Visa's credit limit");
  assert.equal(stop.typical.label, "I don't know");
  assert.match(stop.typical.why, /\$16,139/);
  assert.equal(stop.focus, `${stop.id}:limit`, 'lands on the card row\'s limit box');
  useStopTypical(s, stop);
  assert.equal(s.get(stop.id).fieldStatus.limit, 'Not sure');
  assert.ok(!walkStops(createCtx({ store: s, ref, now: () => now })).some(x => x.field === 'limit'), 'answered: it drops off');
  // A month with money left (Maya) has no limit stop.
  const maya = new Store(persona('maya'));
  assert.ok(!walkStops(createCtx({ store: maya, ref, now: () => now })).some(x => x.field === 'limit'));
});

test('Q348: Calendar and Month end read one person\'s plan for a couple keeping money apart (Jordan, by hand)', () => {
  // Living together, split by income 60/40: rent $2,400 is $1,440 in Jordan's view and $960 in Sam's ($1,200 as the
  // rows are). Jordan's checking $3,000 starts his calendar.
  const s = new Store(persona('couple-separate'), { now: () => now.toISOString() });
  const rent = person => instances(s.doc, ref, '2026-11', { now, person }).find(i => i.name === 'Rent').planned;
  assert.equal(rent(null), -1200); assert.equal(rent('Me'), -1440); assert.equal(rent('Partner'), -960);
  assert.equal(startBalance(s.doc, ref, now, { person: 'Me' }).value, 3000);
  assert.equal(monthView(s.doc, ref, '2026-11', { now, person: 'Me' }).rows.find(r => r.line.name === 'Rent').estimate, 1440);
  // Month end's Same as plan in Jordan's view keeps the whole row's $2,400 (1,440 / 0.6) and shows his $1,440.
  const rentId = s.doc.records.find(r => r.name === 'Rent').id;
  s.setIn('spending', ['months', '2026-11', 'lines', rentId, 'actual'], 1440 / 0.6);
  assert.equal(monthView(s.doc, ref, '2026-11', { now, person: 'Me' }).rows.find(r => r.line.name === 'Rent').actual, 1440);
  assert.equal(monthView(s.doc, ref, '2026-11', { now, person: 'Partner' }).rows.find(r => r.line.name === 'Rent').actual, 960);
  s.setIn('spending', ['months', '2026-11', 'lines', rentId, 'actual'], undefined);
  // A Joint yearly bill shown to one person lands at the yearly share: $1,200 car insurance is $720 for Jordan, $480
  // for Sam, $1,200 as the rows are (it read $60, a month's part, before).
  s.add('bill', { name: 'Car insurance', amount: 1200, per: 'year', owner: 'Joint', values: { irregular: true, monthDue: 3, dueDay: 10, category: 'Car insurance', draftt: 'Transportation', amountType: 'Fixed' } });
  const ins = person => instances(s.doc, ref, '2027-03', { now, person }).find(i => i.name === 'Car insurance').planned;
  assert.equal(ins(null), -1200); assert.equal(ins('Me'), -720); assert.equal(ins('Partner'), -480);
  // Closing in Jordan's view carries a variable miss as the whole row's plan: a line seen at 60% that came in $100 over
  // carries (part + 100) / 0.6.
  const v = monthView(s.doc, ref, '2026-11', { now, person: 'Me' });
  const varRow = v.rows.find(r => r.variable && !r.gutCat && r.line.coupleShared && (r.estimate ?? 0) > 0);
  if (varRow) {
    const k = varRow.line.coupleShared.share;
    s.setIn('spending', ['months', '2026-11', 'lines', varRow.line.id, 'actual'], (varRow.estimate + 100) / k);
    closeMonth(s, ref, '2026-11', { now, person: 'Me' });
    near(s.getIn('spending', ['months', '2026-12', 'lines', varRow.line.id, 'estimate']), Math.round((varRow.estimate + 100) / k), 1);
  }
});

test('Q349: Biggest share is never hidden; a gut-only client keeps its lock', () => {
  const why = overviewNotFor({ takeHome: 3000, spendingSource: 'gut', debts: [], gates: {}, housing: null }, { ratios: { dti: { value: 0.1 }, util: {} }, topLetter: null });
  assert.ok(!why.some(n => n.key === 'draftt'));
});

test('Q345, Q354, Q356: plain meanings on FOO and Budget, the eye for privacy, coach-only rows out of the counts', () => {
  assert.ok(PLAIN_ON.includes('#/plan/foo') && PLAIN_ON.includes('#/cash-flow/budget'));
  assert.ok(ICONS.includes('eye-off'));
  const rows = [{ id: 'a' }, { id: 'b', folded: 'Me and my coach' }, { id: 'c', folded: 'Coach only' }];
  assert.deepEqual(countable(rows).map(r => r.id), ['a', 'b']);
});
