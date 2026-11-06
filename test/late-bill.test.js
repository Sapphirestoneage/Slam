// Finding F-LATE (Batch 16 personas): a payment with no due day landed on the 1st and, from the 7th, counted as a late
// bill, dropping every client back to step 1. Late now needs a real due day and a month the client is tracking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { instances, mark } from '../js/month.js';
import { foo } from '../js/math/foo.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const YM = '2026-11';
const lateDone = (s, now) => foo(s.doc, ref, { now }).steps.find(st => st.id === '1').parts.find(p => p.name === 'No late bills').done;
const make = now => new Store(householdFromInputs(demo.inputs, { name: 'Late test', now: now.toISOString() }), { now: () => now.toISOString() });

test('an untracked month never shows a late bill, early or late in the month', () => {
  for (const day of ['05', '20', '28']) {
    const now = new Date(`${YM}-${day}T12:00:00Z`);
    assert.equal(lateDone(make(now), now), true, `day ${day}`);
  }
});

test('in a tracked month, a payment with a real due day 6+ days past and not marked paid is late; a guessed day never is', () => {
  const now = new Date(`${YM}-20T12:00:00Z`);
  const s = make(now);
  const rent = s.find(r => r.kind === 'bill' && /rent/i.test(r.name || ''))[0];
  s.update(rent.id, { dueDay: 3 });
  const list = instances(s.doc, ref, YM, { now }).filter(i => (i.kind === 'bill' || i.kind === 'debt') && !i.onCard);
  const dated = list.find(i => !i.guessDate && !i.spread && i.date < `${YM}-14`);
  const others = list.filter(i => i !== dated);
  for (const i of others) mark(s, i.key, { status: 'Paid', paid: i.planned });
  assert.ok(dated, 'rent now has a real due day');
  assert.ok(others.some(i => i.guessDate), 'the other payments keep guessed days');
  assert.equal(lateDone(s, now), false, `${dated.name} on ${dated.date} is unpaid`);
  mark(s, dated.key, { status: 'Paid', paid: dated.planned });
  assert.equal(lateDone(s, now), true);
});
