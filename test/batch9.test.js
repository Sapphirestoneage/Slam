// SPDX-License-Identifier: AGPL-3.0-only
// Batch 9: the pure parts of the usability fixes (Fast Track first name, paycheck frequency, Redo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { firstWord, needsPayFrequency, fastTrackDone, fastTrackAnswers } from '../js/fasttrack.js';
import { monthlyFrom } from '../js/math/income.js';

test('First name prefills the first word of the client name, only when empty', () => {
  assert.equal(firstWord('Maya Test'), 'Maya');
  assert.equal(firstWord('  Eli   Z. Saperstein '), 'Eli');
  assert.equal(firstWord(''), null);
  assert.equal(firstWord(null), null);
  const doc = { client: { name: 'Maya Test' }, profile: {}, records: [] };
  assert.equal(fastTrackAnswers(doc).firstName, 'Maya');
  assert.equal(fastTrackAnswers({ ...doc, profile: { firstName: 'May' } }).firstName, 'May');
});

test('A paycheck amount needs a frequency; a month or a year does not', () => {
  assert.equal(needsPayFrequency({ takeHome: 2000, takePer: 'paycheck', payFrequency: null }), true);
  assert.equal(needsPayFrequency({ takeHome: 2000, takePer: 'paycheck', payFrequency: 'biweekly' }), false);
  assert.equal(needsPayFrequency({ takeHome: 2000, takePer: 'month', payFrequency: null }), false);
  assert.equal(needsPayFrequency({ takeHome: 60000, takePer: 'year', payFrequency: null }), false);
  assert.equal(needsPayFrequency({ takeHome: null, takePer: 'paycheck', payFrequency: null }), false);
  // Why: without one, M01 reads the paycheck as a month (roughly), so a biweekly 2000 would count as 2000, not about 4333.
  const r = monthlyFrom(2000, 'paycheck', null);
  assert.equal(r.value, 2000); assert.equal(r.roughly, true);
});

test('Fast Track counts as done once finished', () => {
  assert.equal(fastTrackDone({ settings: {} }), false);
  assert.equal(fastTrackDone({ settings: { fastTrack: { at: 'x', seconds: 3 } } }), false);
  assert.equal(fastTrackDone({ settings: { fastTrack: { at: 'x', seconds: 3, done: true } } }), true);
});
