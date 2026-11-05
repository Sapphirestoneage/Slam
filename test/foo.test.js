// Phase 3.5 section 4: the SLAM FOO (M69 to M71). Fake households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { foo, quietQuittingFi, coastFiNumber } from '../js/math/foo.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const flags = JSON.parse(readFileSync(new URL('../data/flags.json', import.meta.url)));
const now = new Date('2026-11-03T12:00:00Z');
const home = (setup) => {
  const s = new Store(newHousehold({ name: 'Fake', now: '2026-10-01T09:00:00.000Z' }));
  s.setDoc('profile', { age: 30 });
  s.add('income', { name: 'Job', amount: 5000, per: 'month', values: { payFrequency: 'month' } }, { type: 'Job' });
  s.add('bill', { name: 'Rent', amount: 1800, values: { draftt: 'Accommodation', amountType: 'Fixed', dueDay: 1 } });
  setup(s);
  return foo(s.doc, ref, { now, flags });
};
const step = (f, id) => f.steps.find(s => s.id === id);

test('(e) Quiet Quitting FI vs Coast FI: age 24, $1.5M, 7%, FI age 60, $7,000 a year', () => {
  const qq = quietQuittingFi({ fiNumber: 1500000, realReturn: 0.07, age: 24, fiAge: 60, yearlyMinimum: 7000 });
  const coast = coastFiNumber({ fiNumber: 1500000, realReturn: 0.07, age: 24, fiAge: 60 });
  assert.ok(Math.abs(qq.value - 40057) < 50, `about $40k, got ${Math.round(qq.value)}`);
  assert.ok(Math.abs(coast - 131304) < 50, `about $131k, got ${Math.round(coast)}`);
  const g = 1.07 ** 36; // the formula, written out
  assert.ok(Math.abs(qq.value - (1500000 - 7000 * (g - 1) / 0.07) / g) < 0.01);
});

test('(a) a payday loan and negative net worth land on step 1', () => {
  const f = home(s => {
    s.add('debt', { name: 'Payday', values: { balance: 900, apr: 3.9, payment: 300 } }, { type: 'Payday or cash advance' });
    s.add('debt', { name: 'Card', values: { balance: 6000, apr: 0.25, payment: 200 } }, { type: 'Credit card' });
    s.add('account', { name: 'Checking', values: { group: 'cash', balance: 200 } }, { type: 'Checking' });
  });
  assert.equal(f.here, '1');
  assert.notEqual(step(f, '1').status, 'Done');
  assert.ok(step(f, '1').parts.find(p => /Payday/.test(p.name)).done === false);
});

test('(b) a PSLF borrower with cards: step 3 skips the loan', () => {
  const f = home(s => {
    s.add('account', { name: 'Savings', values: { group: 'cash', balance: 20000 } }, { type: 'Savings or HYSA' });
    s.add('debt', { name: 'Federal loans', values: { balance: 60000, apr: 0.065, payment: 400, federal: 'Federal', pslf: 'Yes' } }, { type: 'Student loan' });
    s.add('debt', { name: 'Visa', values: { balance: 3000, apr: 0.24, payment: 150 } }, { type: 'Credit card' });
  });
  const s3 = step(f, '3');
  assert.deepEqual(s3.parts.map(p => p.name), ['Visa']);
  assert.equal(s3.left, 3000);
  assert.match(s3.note, /PSLF or forgiveness skips/);
  assert.ok(!step(f, '9').parts.some(p => p.name === 'Federal loans'), 'and it is not low-rate debt to pay down either');
});

test('(c) Coast FI reached: step 7 opens', () => {
  const f = home(s => {
    s.setDoc('assumptions', { fiAge: 60 });
    s.add('account', { name: 'Savings', values: { group: 'cash', balance: 40000 } }, { type: 'Savings or HYSA' });
    s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 400000 } }, { type: 'Brokerage' });
  });
  assert.equal(step(f, '6').status, 'Done');
  assert.notEqual(step(f, '7').status, 'Later', 'the launch window is open');
  assert.match(step(f, '7').note, /pick a launch move/);
});

test('(d) giving: off by default; on, it sits at the Roth IRA step (5b) and stays locked until that step is reached (batch 3)', () => {
  const off = home(() => {});
  assert.equal(step(off, '5b').status, 'Off', 'off for everyone by default');
  assert.ok(off.steps.findIndex(s => s.id === '5b') > off.steps.findIndex(s => s.id === '5'), 'after Roth and HSA, never first');
  const on = home(s => s.setDoc('profile', { giving: { on: true, mode: 'pct', pct: 0.1, base: 'net' } }));
  assert.equal(step(on, '5b').status, 'Locked');
  assert.match(step(on, '5b').prereq.text, /Giving unlocks at the Roth IRA step/);
  assert.equal(Math.round(step(on, '5b').left), 500);
});

test('steps 2 and 3 can be in progress together; 6 and 7 never overlap', () => {
  const f = home(s => {
    s.add('account', { name: 'Savings', values: { group: 'cash', balance: 1500 } }, { type: 'Savings or HYSA' });
    s.add('debt', { name: 'Visa', values: { balance: 3000, apr: 0.24, payment: 150 } }, { type: 'Credit card' });
    s.update(s.find(r => r.kind === 'income')[0].id, { contributionPct: 0.02, matchPct: 1, matchCapPct: 0.05 });
  });
  const two = step(f, '2'), three = step(f, '3');
  assert.ok(['In progress', 'Next'].includes(two.status) && ['In progress', 'Next'].includes(three.status), `${two.status} / ${three.status}`);
  for (const h of [f]) assert.ok(!(step(h, '6').status !== 'Done' && step(h, '7').status !== 'Locked'), 'the launch window is locked until Coast FI (step 6 done)');
});

test('efficiency flags come from data/flags.json and land on their stop', () => {
  const f = home(s => {
    s.add('account', { name: 'Savings', values: { group: 'cash', balance: 90000 } }, { type: 'Savings or HYSA' });
  });
  assert.ok(f.flags.some(x => x.id === 'cash-above-layers'));
  assert.ok(step(f, '4').flags.some(x => x.id === 'cash-above-layers'));
  for (const fl of flags) assert.doesNotMatch(fl.text, /\u2014|wrong|bad|mistake|should have/i, fl.id);
});
