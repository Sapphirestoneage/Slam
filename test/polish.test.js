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
