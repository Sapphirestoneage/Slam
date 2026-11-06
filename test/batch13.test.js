// SPDX-License-Identifier: AGPL-3.0-only
// Batch 13: the calendar's payoff wins read the one debt plan, a homeowner's Housing % reads the mortgage payment, and
// the open-sections memory is a view setting kept outside the client file. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, exportFile } from '../js/records.js';
import { applyFastTrack } from '../js/fasttrack.js';
import { metrics } from '../js/math/metrics.js';
import { instances, addMonths, ymOf, dateOf } from '../js/month.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
function maya(over = {}) {
  const s = new Store(newHousehold({ name: 'Maya Test', now: now.toISOString() }), { now: () => now.toISOString() });
  applyFastTrack(s, { firstName: 'Maya', birthMonth: 6, birthYear: 1996, household: 'Solo', takeHome: 2400, takePer: 'paycheck', payFrequency: '2 weeks', gut: 3500, gutIncludesDebt: true,
    checking: 1200, savings: 4000, invested: 15000, housing: 'Rent', hasCar: false, debts: { 'Credit card': { balance: 6000, payment: 200 } }, ...over }, { finished: true });
  return s;
}

test('the calendar wins "Debt-free" on the same month as the one debt plan (Q221)', () => {
  const s = maya();
  const m = metrics(s.doc, ref, { now });
  assert.ok(m.debtPlan.months != null && m.debtPlan.months > 0);
  const ym = addMonths(ymOf(now), m.debtPlan.months);
  const wins = instances(s.doc, ref, ym, { now }).filter(i => i.kind === 'win' && i.name === 'Debt-free');
  assert.equal(wins.length, 1, 'the Debt-free win sits in the plan month');
  assert.equal(wins[0].date, dateOf(ym, 1));
  // and not in the month the payment alone would reach
  const alone = m.debtPlanMinimum?.months;
  if (alone != null && alone !== m.debtPlan.months) assert.equal(instances(s.doc, ref, addMonths(ymOf(now), alone), { now }).filter(i => i.name === 'Debt-free').length, 0);
});

test('Housing % for a homeowner reads the mortgage payment when there is no rent line', () => {
  const s = maya({ housing: 'Own', homeValue: 300000, mortgageBalance: 200000, mortgagePayment: 1500 });
  const m = metrics(s.doc, ref, { now });
  assert.notEqual(m.housingPct.value, null, 'not locked asking for rent');
  assert.ok(m.housingPct.value >= 1500 / m.inputs.takeHome - 1e-9);
});

test('which sections are open never enters the client file', async () => {
  const S = await import('../js/ui/sections.js');
  S.setSectionClient('abc');
  assert.equal(S.sectionOpen('budget:joy', false), false);
  S.rememberSection('budget:joy', true);
  assert.equal(S.sectionOpen('budget:joy', false), true);
  S.setSectionClient('other');
  assert.equal(S.sectionOpen('budget:joy', false), false, 'per client');
  const s = maya();
  assert.ok(!JSON.stringify(exportFile(s.doc, now.toISOString())).includes('budget:joy'));
});
