// Polish pass (Nov 3 2026). Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sureOf, SURE, STATUSES } from '../js/records.js';

test('one sureness system: every status shows Know it, Rough or Missing on its face', () => {
  assert.equal(sureOf('Know it'), 'Know it');
  assert.equal(sureOf(null), 'Know it');
  assert.equal(sureOf('Computed'), 'Know it');
  assert.equal(sureOf(null, false), 'Missing', 'a blank number is Missing');
  assert.equal(sureOf('Roughly'), 'Rough');
  assert.equal(sureOf('Not sure', false), 'Rough', 'a Guess uses a typical value, so it is Rough');
  assert.equal(sureOf('Not now'), 'Missing');
  assert.equal(sureOf('Will email'), 'Missing');
  assert.equal(sureOf('Not for me'), 'Not for me', 'its own hide action');
  // Display only: every stored status still exists and sits in one place.
  const grouped = Object.values(SURE).flat();
  for (const s of grouped) assert.ok(STATUSES.includes(s), s);
  assert.equal(new Set(grouped).size, grouped.length);
});

import { soWhat } from '../js/sowhat.js';
const fake = (over = {}) => ({ netWorth: { value: 8300 }, surplus: { value: 1200 }, savingsRate: { value: 0.25 }, monthsToFi: { value: 300 }, liquidNetWorth: { value: 1800 },
  runwayMonths: { value: 5 }, housingPct: { value: 0.3 }, ruleOf5: { value: 20000 }, inputs: { spendingSource: 'gut', guessLines: 0, cash: 6000 }, ...over });
test('so what: one plain sentence, and a link only when something is off', () => {
  assert.equal(soWhat('savingsRate', fake()).action, undefined);
  const low = soWhat('savingsRate', fake({ savingsRate: { value: 0.06 } }));
  assert.match(low.text, /6%/); assert.equal(low.action.href, '#/cash-flow/budget');
  const guessed = soWhat('surplus', fake({ inputs: { spendingSource: 'lines', guessLines: 12, cash: 6000 } }));
  assert.match(guessed.text, /12 guessed lines/); assert.ok(guessed.action);
  const dip = soWhat('surplus', fake(), { lowDay: { low: 500, label: 'Fri, Nov 20' } });
  assert.match(dip.text, /below \$500 on Fri, Nov 20/); assert.equal(dip.action.href, '#/cash-flow/calendar');
  assert.ok(soWhat('ruleOf5', fake()).action, 'cash under the cushion');
  assert.equal(soWhat('netWorth', fake({ netWorth: { value: null } })), null, 'locked numbers say nothing');
  for (const k of ['netWorth', 'surplus', 'savingsRate', 'fi', 'liquid', 'runway', 'housing', 'ruleOf5']) assert.doesNotMatch(soWhat(k, fake())?.text ?? '', /\u2014|M\d\d|DRAFTT/, k);
});

// ---------- Answers to the polish questions ----------
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { incomeRow, takeHomeFromGross } from '../js/math/income.js';
const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));

test('Roth 401(k): saved from the paycheck for take-home and the savings rate, but it never lowers taxable income', () => {
  const job = taxType => {
    const s = new Store(newHousehold({ name: 'Synthetic', now: '2026-11-01T09:00:00.000Z' }));
    s.add('income', { name: 'Job', amount: 90000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', contributionPct: 0.1 } }, { type: 'Job' });
    if (taxType) s.add('account', { name: '401(k)', values: { group: 'investment', balance: 10000, taxType } }, { type: '401(k)' });
    s.add('spending', { amount: 3000, values: {} }, { type: 'All in' });
    return metrics(s.doc, ref, { now: new Date('2026-11-03') });
  };
  const trad = job('Pretax'), roth = job('Roth');
  const none = takeHomeFromGross({ gross: 90000, pretax: 0 }, ref);
  const row = roth.inputs.income[0];
  assert.equal(row.pretax, 0, 'Roth money is not a before-tax deduction');
  assert.equal(row.roth, 9000);
  // Taxes on a Roth paycheck are the taxes on the full gross: take-home is that, minus the $9,000.
  assert.ok(Math.abs(roth.inputs.takeHome * 12 - (none.value - 9000)) < 1);
  assert.ok(roth.inputs.takeHome < trad.inputs.takeHome, 'the traditional 401(k) saves tax, the Roth does not');
  assert.ok(Math.abs(roth.savingsRate.pretaxSaving - 750) < 0.01, 'still saved from the paycheck: $750 a month');
  assert.ok(Math.abs(roth.flow.beforeTax - 750) < 0.01);
  assert.ok(Math.abs(roth.flow.gross - roth.flow.taxes - roth.flow.beforeTax - roth.flow.takeHome) < 0.01, 'the waterfall still adds up');
  // Take-home typed instead of gross: the solved gross taxes the Roth dollars too.
  const typed = incomeRow({ type: 'Job', amount: roth.inputs.takeHome, per: 'month', values: { payFrequency: '2 weeks', contributionPct: 0.1, k401Roth: true } }, { ref });
  assert.ok(Math.abs(typed.gross - 90000) < 2);
  assert.equal(typed.pretax, 0);
});
