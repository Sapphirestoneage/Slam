// SPDX-License-Identifier: AGPL-3.0-only
// The next check date for rough or aged numbers (R061, spec F244), and today's or future dollars (spec F220).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { nextCheck, checksOf, dueChecks } from '../js/checks.js';
import { futureDollars } from '../js/math/fi.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const at = iso => () => `${iso}T12:00:00.000Z`;

test('a Roughly number is checked 30 days after it changed; any number at 90; Not sure at once', () => {
  const s = new Store(newHousehold({ name: 'Checks' }), { now: at('2026-11-03') });
  const rough = s.add('debt', { name: 'Card', status: 'Roughly', values: { balance: 4000 } }, { type: 'Credit card' });
  const known = s.add('account', { name: 'Savings', values: { group: 'cash', balance: 5000 } }, { type: 'Savings or HYSA' });
  const unsure = s.add('debt', { name: 'Loan', status: 'Not sure', values: {} }, { type: 'Personal loan' });
  const now = new Date('2026-11-03T12:00:00Z');
  assert.equal(nextCheck(rough, { now }).next, '2026-12-03');
  assert.equal(nextCheck(known, { now }).next, '2027-02-01');
  assert.equal(nextCheck(unsure, { now }).next, '2026-11-03');
  assert.deepEqual(checksOf(s.doc, ref, { now }).map(c => [c.label, c.next, c.due]), [['Loan', '2026-11-03', true], ['Card', '2026-12-03', false]], 'a known number not yet old is not on the list');
  assert.deepEqual(dueChecks(s.doc, ref, { now: new Date('2027-02-02T12:00:00Z') }).map(c => c.label), ['Loan', 'Card', 'Savings']);
});

test('Check again on sets the date, sooner or later', () => {
  const s = new Store(newHousehold({ name: 'Checks' }), { now: at('2026-11-03') });
  const r = s.add('debt', { name: 'Card', status: 'Roughly', values: { balance: 4000, checkOn: '2026-11-10' } }, { type: 'Credit card' });
  const c = nextCheck(r, { now: new Date('2026-11-03T12:00:00Z') });
  assert.deepEqual([c.next, c.set], ['2026-11-10', true]);
});

test('future dollars add inflation for the years until the money is reached', () => {
  assert.equal(Math.round(futureDollars(1000000, 24, 0.02)), 1040400);
  assert.equal(futureDollars(500, 0, 0.03), 500);
  assert.equal(futureDollars(null, 12, 0.02), null);
});
