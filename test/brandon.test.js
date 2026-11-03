// Brandon beta batch (Nov 2 2026). Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { homeworkList, homeworkText } from '../js/homework.js';
import { profileCompletion } from '../js/profile-completion.js';
import { incomeRow } from '../js/math/income.js';
import { instances } from '../js/month.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const fresh = () => new Store(newHousehold({ name: 'Synthetic', now: '2026-11-01T09:00:00.000Z' }));

test('B1.2, B1.3: parked fields land on the homework list with where to find them', () => {
  const s = fresh();
  s.setDoc('profile', { later: { healthCoverage: true } });
  const r = s.add('income', { name: 'Job', amount: 3000 }, { type: 'Job' });
  s.setFieldStatus(r.id, 'payFrequency', 'Will email');
  const hw = homeworkList(s.doc, s.records);
  assert.equal(hw.length, 2);
  assert.match(hw[0].where, /insurance card/i);
  assert.match(hw[1].label, /Job: pay frequency/);
  assert.match(hw[1].where, /pay stub/i);
  assert.match(homeworkText('Sam', hw), /look on: Pay stub/);
});

test('B1.1: Next is ready once every core answer is in or parked', () => {
  const s = fresh();
  assert.equal(profileCompletion(s.doc).core.ready, false);
  s.setDoc('profile', { whyNow: 'x', worry: 'x', goalWords: 'x', firstName: 'A', lastName: 'B', state: 'NY', household: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: false, hasPets: false, areas: { cash: true } });
  assert.equal(profileCompletion(s.doc).core.ready, false); // birth year still open
  s.setDoc('profile', { later: { birthYear: true } });
  assert.equal(profileCompletion(s.doc).core.ready, true);
});

test('B1.6: Both keeps both numbers; Both with one missing solves the other', () => {
  const both = incomeRow({ type: 'Job', amount: 4000, per: 'month', values: { basis: 'Both', gross: 70000 } }, { ref });
  assert.equal(both.computed, null);
  assert.equal(both.gross, 70000);
  const onlyTake = incomeRow({ type: 'Job', amount: 4000, per: 'month', values: { basis: 'Both' } }, { ref });
  assert.equal(onlyTake.computed, 'gross');
});

test('B1.4, B1.5: twice a month on the 7th and 22nd is 24 paychecks, on those days', () => {
  const s = fresh();
  s.add('income', { name: 'Job', amount: 4800, per: 'month', values: { basis: 'Take-home', payFrequency: 'twice a month', payDays: [7, 22] } }, { type: 'Job' });
  const pays = instances(s.doc, ref, '2026-12').filter(i => i.kind === 'income');
  assert.deepEqual(pays.map(p => p.date), ['2026-12-07', '2026-12-22']);
  assert.equal(pays[0].planned, 2400);
});
