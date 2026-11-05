// Overnight F3: the payoff methods. Avalanche, Snowball, Return on Hassle (confirmed, answer 161), Stress, Custom; the
// suggestion from stress; what a custom order costs against Avalanche. Synthetic debts only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payoffPlan, hasslePerDollar, customOrder, orderCost } from '../js/math/debt.js';
import { METHODS, METHOD_IDS, suggestMethod } from '../js/registry/debt.js';
import { AREAS } from '../js/registry/fields.js';
import { AREAS as SCORE } from '../js/registry/scorecard.js';

const debts = [
  { id: 'a', name: 'Visa', balance: 6000, apr: 0.24, payment: 180, stress: 2, hassle: 2 },
  { id: 'b', name: 'Medical', balance: 900, apr: 0.0, payment: 50, stress: 5, hassle: 5 },
  { id: 'c', name: 'Car', balance: 12000, apr: 0.07, payment: 320, stress: 1, hassle: 1 },
];

test('five methods in one config; the settings pick and the Debt hole follow it', () => {
  assert.deepEqual(METHOD_IDS, ['avalanche', 'snowball', 'hassle', 'stress', 'custom']);
  assert.ok(!METHODS.find(m => m.id === 'hassle').placeholder, 'Return on Hassle is confirmed (answer 161)');
  const pick = AREAS.flatMap(a => a.fields).find(f => f.label === 'Debt payoff order');
  assert.deepEqual(pick.options, METHOD_IDS);
  assert.ok(AREAS.find(a => a.id === 'debt').fields.some(f => f.key === 'hassle'), 'the hassle score is a registered field');
  assert.equal(SCORE.find(a => a.id === 'debt').route, '#/plan/debt-payoff');
});

test('each order: avalanche by APR, snowball by balance, hassle per dollar highest first, stress by rating, custom as given', () => {
  const first = order => payoffPlan(debts, { order }).debts[0].name;
  assert.equal(first('avalanche'), 'Visa');
  assert.equal(first('snowball'), 'Medical');
  assert.equal(first('hassle'), 'Medical');
  assert.ok(hasslePerDollar(debts[1]) > hasslePerDollar(debts[0]) && hasslePerDollar(debts[0]) > hasslePerDollar(debts[2]));
  assert.equal(hasslePerDollar({ balance: 100 }), -1, 'unscored goes last');
  assert.equal(first('stress'), 'Medical');
  assert.deepEqual(customOrder(debts, ['c', 'a']).map(d => d.id), ['c', 'a', 'b'], 'the rest after, as they came');
});

test('a custom order costs extra interest and months against Avalanche; Avalanche against itself costs nothing', () => {
  const c = orderCost(debts, { order: 'custom', ids: ['c', 'b', 'a'], extra: 200 });
  assert.ok(c.extraInterest > 0, `car first costs ${c.extraInterest}`);
  assert.ok(c.extraMonths >= 0);
  assert.equal(c.plan.debts[0].name, 'Car');
  const same = orderCost(debts, { order: 'custom', ids: ['a', 'c', 'b'], extra: 200 });
  assert.ok(Math.abs(same.extraInterest) < 0.01, 'the avalanche order typed by hand costs nothing');
  const snow = orderCost(debts, { order: 'snowball', extra: 200 });
  assert.ok(snow.extraInterest >= 0);
});

test('the suggestion follows stress and is never forced: low feeling or a stressful debt points to Snowball (Return on Hassle once scored), high feeling to Avalanche', () => {
  assert.equal(suggestMethod({ feeling: 3, debts: debts.map(d => ({ ...d, hassle: null })) }).id, 'snowball');
  assert.equal(suggestMethod({ feeling: 3, debts }).id, 'hassle');
  assert.equal(suggestMethod({ feeling: 8, debts: debts.map(d => ({ ...d, stress: 1 })) }).id, 'avalanche');
  assert.equal(suggestMethod({ feeling: null, debts: debts.map(d => ({ ...d, hassle: null })) }).id, 'snowball', 'a debt rated 5 for stress');
  assert.equal(suggestMethod({ feeling: null, debts: debts.map(d => ({ ...d, stress: 1, hassle: null })) }).id, 'avalanche');
  assert.match(suggestMethod({ feeling: 3, debts }).why, /quick wins/);
});
