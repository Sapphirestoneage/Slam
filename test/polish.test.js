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
