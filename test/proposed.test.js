// Overnight K and L: Current vs Proposed; the month-close streak. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { compareOf, setProposed, clearProposed, makeProposedThePlan, hasProposal, netWorthIn } from '../js/math/proposed.js';
import { metrics } from '../js/math/metrics.js';
import { closeStreak, closeMonth } from '../js/month.js';
import { REPORTS } from '../js/registry/reports.js';
import { buildWorkbook } from '../js/sheet/workbook.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const demoStore = () => new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });

test('with nothing proposed both sides agree; lower spending brings FI sooner, a higher savings rate and more net worth in 5 and 10 years, each with its steps', () => {
  const d = demoStore();
  let C = compareOf(d.doc, ref, { now });
  assert.equal(C.has, false);
  assert.ok(C.rows.every(r => r.current === r.proposed || (r.diff ?? r.diffMonths) === 0 || (r.diff ?? r.diffMonths) == null));
  setProposed(d, { spending: 3000, fiAge: 55, extraDebt: 200 });
  assert.ok(hasProposal(d.doc));
  C = compareOf(d.doc, ref, { now });
  const row = k => C.rows.find(r => r.key === k);
  assert.ok(row('fiDate').diffMonths < 0, 'FI sooner');
  assert.ok(row('savingsRate').diff > 0.1);
  assert.ok(row('nw5').diff > 0 && row('nw10').diff > row('nw5').diff);
  assert.ok(row('nw5').how.proposed.some(t => /\$200 extra/.test(t)), 'the steps name the extra');
  assert.ok(row('fiDate').how.current.length >= 3 && row('nw10').how.current.length === 5);
  assert.equal(C.choices.find(c => c.key === 'spending').proposed, 3000);
  const n5 = netWorthIn(metrics(d.doc, ref, { now }), 5);
  assert.ok(Math.abs(n5.value - row('nw5').current) < 1);
});

test('Make Proposed the plan writes the choices onto the file in one step; Undo puts it back; Clear empties the copy', () => {
  const d = demoStore();
  const spendingBefore = metrics(d.doc, ref, { now }).inputs.spending;
  setProposed(d, { spending: 3000, debtOrder: 'snowball', fiAge: 55, investSurplus: false });
  makeProposedThePlan(d, ref, { now });
  const m = metrics(d.doc, ref, { now });
  assert.ok(Math.abs(m.inputs.spending - 3000) < 1, `spending ${m.inputs.spending}`);
  assert.equal(m.inputs.debtOrder, 'snowball');
  assert.equal(d.doc.assumptions.fiAge, 55);
  assert.equal(m.investing.investSurplus, false);
  assert.equal(hasProposal(d.doc), false, 'the copy is cleared once it is the plan');
  d.undo();
  assert.ok(Math.abs(metrics(d.doc, ref, { now }).inputs.spending - spendingBefore) < 1, 'one undo puts everything back');
  assert.equal(metrics(d.doc, ref, { now }).inputs.debtOrder, 'avalanche');
  setProposed(d, { spending: 2500 }); clearProposed(d);
  assert.equal(hasProposal(d.doc), false);
});

test('the Proposed tab of the workbook carries both sides and the steps', () => {
  const d = demoStore();
  setProposed(d, { spending: 3000 });
  assert.ok(REPORTS.find(r => r.tab === 'Proposed'));
  const wb = buildWorkbook(d.doc, ref, { now });
  const sheet = wb.sheets.find(s => s.name === 'Proposed');
  const text = JSON.stringify(sheet.rows);
  assert.ok(text.includes('FI date') && text.includes('Net worth in 10 years') && text.includes('grows at') && text.includes('Spending a month'));
});

test('the month-close streak counts back from last month with one grace month', () => {
  const d = demoStore();
  assert.equal(closeStreak(d.doc, now).months, 0);
  const close = ym => { d.setIn('spending', ['months', ym, 'closed'], true, 'c'); d.setIn('spending', ['months', ym, 'summary'], { gut: 3600, estimate: 3600, actual: 3500 }, 's'); };
  close('2026-10'); close('2026-09'); close('2026-08');
  let s = closeStreak(d.doc, now);
  assert.deepEqual([s.months, s.graceUsed, s.first, s.last], [3, 0, '2026-08', '2026-10']);
  close('2026-06'); // July missed: the grace month
  s = closeStreak(d.doc, now);
  assert.deepEqual([s.months, s.graceUsed], [4, 1]);
  assert.match(s.words, /4 months in a row \(one grace month used\)/);
  close('2026-03'); // April and May missed: the run stops at June
  assert.equal(closeStreak(d.doc, now).months, 4);
  close('2026-11'); // this month, once closed, counts
  assert.equal(closeStreak(d.doc, now).months, 5);
  d.setIn('spending', ['months', '2026-10', 'closed'], false, 'reopen'); // October open: November, then the grace, then September on
  assert.deepEqual([closeStreak(d.doc, now).months, closeStreak(d.doc, now).graceUsed], [3, 1], 'November, the grace, September and August; July was already missed');
});
