// Batch 37: the card room on Current vs Proposed (QUESTIONS 320), and Eli's terms paired with their plain meaning.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile } from '../js/records.js';
import { compareOf, shortfallPath, typicalCardLimit } from '../js/math/proposed.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-06T12:00:00Z');
const load = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));

test('Q320: the typical card limit follows the age band (Experian, June 2026)', () => {
  assert.equal(typicalCardLimit(ref, 24), 16139);
  assert.equal(typicalCardLimit(ref, 33), 32727);
  assert.equal(typicalCardLimit(ref, 50), 43481);
  assert.equal(typicalCardLimit(ref, null), 35687);
});

test('Q320: the shortfall stops at the card room; a typed limit wins over the typical one', () => {
  // $100 a month at 12%: $1,268 after a year (batch 33's check), so a $1,000 room is full in month 10.
  const p = shortfallPath({ monthly: 100, apr: 0.12, room: 1000 }, 120, 100, 120);
  assert.equal(p.full, 10);
  assert.equal(p.owed, 1000);
  assert.equal(shortfallPath({ monthly: 100, apr: 0.12, room: null }, 12, 100, 12).full, null);
  const doc = load('deficit');
  const card = doc.records.find(r => r.kind === 'debt' && r.type === 'Credit card');
  card.values.limit = 3000; // $500 of room: $400, then $410 would pass it, so full in month 2
  const c = compareOf(doc, ref, { now });
  assert.equal(c.current.shortfall.roomFrom, 'limits');
  assert.equal(c.current.shortfall.room, 500);
  assert.equal(c.current.shortfall.full, 2);
  assert.equal(c.current.shortfall.fullYm, '2027-01');
  const nw10 = c.rows.find(r => r.key === 'nw10');
  assert.equal(nw10.current, null);
  assert.equal(nw10.diff, null);
});

test('Q320: a household that is not short is not touched by the cap', () => {
  const c = compareOf(load('maya'), ref, { now });
  assert.equal(c.current.shortfall.monthly, 0);
  assert.equal(c.current.shortfall.full, null);
  assert.ok(c.rows.find(r => r.key === 'nw5').current != null);
});
