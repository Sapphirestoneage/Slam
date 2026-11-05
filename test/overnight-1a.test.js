// Overnight 1A amendments (Nov 6): Park it with a bring-back time; giving after heavy debt only; the cash layers'
// history (dips with what was left, the stats, months to refill). Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { parkHole, unparkHole, parkedBack, agendaOf, startSession, endSession, sessionCount, homeworkAll, makeHomework } from '../js/program.js';
import { scorecardOf } from '../js/math/scorecard.js';
import { layersOf, recordDip, layerHistory, layerSnapshot } from '../js/math/layers.js';
import { snapshotNumbers } from '../js/program.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const at = iso => new Date(iso);
const demoStore = (t = now) => new Store(householdFromInputs(demo.inputs, { name: 'Z', now: t.toISOString() }), { now: () => t.toISOString() });

test('Park it needs a bring-back: next session by default; due when that session comes; then Suggested for today carries it with a + and Make homework', () => {
  const d = demoStore();
  const hole = scorecardOf(d.doc, ref, { now }).holes[0];
  parkHole(d, hole.id, { note: 'After the move' });
  let sc = scorecardOf(d.doc, ref, { now });
  const p = sc.parkedHoles.find(a => a.id === hole.id).parked;
  assert.deepEqual(p.back, { kind: 'next' });
  assert.equal(p.atSession, 1);
  assert.equal(p.note, 'After the move');
  let b = parkedBack(p, { n: 1, now });
  assert.equal(b.due, false);
  assert.match(b.when, /Next session \(session 2\)/);
  assert.ok(!agendaOf(d.doc, ref, { now }).suggestions.some(s => s.kind === 'parked'), 'not due in session 1');
  // Session 1 ends: session 2 is being prepared, so it is due.
  endSession(d, ref, { now });
  assert.equal(sessionCount(d.doc), 2);
  const sg = agendaOf(d.doc, ref, { now }).suggestions.find(s => s.kind === 'parked');
  assert.ok(sg, 'back from parking is suggested');
  assert.match(sg.label, new RegExp(`Back from parking: ${hole.name}`));
  assert.equal(sg.link.areaId, hole.id);
  const hw = makeHomework(d, 'S2', `Fill the ${hole.name} hole`, { link: sg.link });
  assert.ok(homeworkAll(d.doc, d.doc.records).some(x => x.key === `hw:${hw.id}`));
  unparkHole(d, hole.id);
  assert.ok(!scorecardOf(d.doc, ref, { now }).parkedHoles.length);
});

test('bring-back in N sessions and on a date', () => {
  const d = demoStore();
  const [a, b] = scorecardOf(d.doc, ref, { now }).holes;
  parkHole(d, a.id, { back: { kind: 'sessions', n: 3 } });
  parkHole(d, b.id, { back: { kind: 'date', date: '2027-01-15' } });
  const sc = scorecardOf(d.doc, ref, { now });
  const pa = sc.parkedHoles.find(x => x.id === a.id).parked, pb = sc.parkedHoles.find(x => x.id === b.id).parked;
  assert.equal(parkedBack(pa, { n: 3, now }).due, false);
  assert.match(parkedBack(pa, { n: 3, now }).when, /In 3 sessions \(session 4\)/);
  assert.equal(parkedBack(pa, { n: 4, now }).due, true);
  assert.equal(parkedBack(pb, { n: 1, now }).due, false);
  assert.match(parkedBack(pb, { n: 1, now }).when, /Jan 15, 2027/);
  assert.equal(parkedBack(pb, { n: 1, now: at('2027-01-15T13:00:00Z') }).due, true);
  const old = scorecardOf(d.doc, ref, { now }).parkedHoles[0].parked;
  assert.ok(parkedBack({ at: old.at }, { n: 2, now }).due, 'a hole parked before bring-backs existed reads as next session');
});

test('the layers history: snapshots keep the layers; a dip records what each layer had left; the stats say how many, the deepest, and months to refill', () => {
  const d = demoStore();
  const L0 = layersOf(d.doc, ref, now);
  assert.ok(L0.bufferFull && L0.littleFull && !L0.bigFull, 'Demo: Buffer and little e full, big e not');
  // Day 0 with the layers on it.
  d.snapshot('Day 0', snapshotNumbers(d.doc, ref, { now }), { day0: true, layers: layerSnapshot(d.doc, ref, now) });
  assert.ok(d.lastSnapshot().layers.layers.find(l => l.id === 'little-e').filled === 1000);
  // A $2,000 emergency a month later: the Buffer ($1,662) goes first, then $338 of little e; big e is untouched.
  const t1 = at('2026-12-05T12:00:00Z');
  const checking = d.find(r => r.kind === 'account' && r.values.group === 'cash')[0];
  const dip = recordDip(d, { amount: 2000, note: 'Car repair', now: t1.toISOString(), layers: layersOf(d.doc, ref, t1).layers, accountId: checking.id });
  assert.deepEqual(dip.from.map(f => f.layer), ['buffer', 'little-e']);
  const rec = d.doc.spending.dips[0];
  assert.equal(rec.left.find(x => x.layer === 'buffer').pctLeft, 0);
  assert.ok(Math.abs(rec.left.find(x => x.layer === 'little-e').pctLeft - 0.662) < 0.001, 'little e: $662 of $1,000 left');
  assert.ok(!rec.from.some(f => f.layer.startsWith('big-e')), 'big e untouched');
  d.snapshot('After the dip', snapshotNumbers(d.doc, ref, { now: t1 }), { layers: layerSnapshot(d.doc, ref, t1) });
  let H = layerHistory(d.doc, ref, t1);
  assert.equal(H.stats.dips, 1);
  assert.equal(H.stats.deepest.layer, 'little-e');
  assert.equal(H.stats.deepest.month, '2026-12');
  assert.equal(H.stats.refillMonths, null, 'not refilled yet');
  assert.equal(H.stats.lastDipRefilled, false);
  // Two months on, cash is back: refilled in 2 months.
  const t2 = at('2027-02-05T12:00:00Z');
  d.update(checking.id, { balance: checking.values.balance });
  d.snapshot('Refilled', snapshotNumbers(d.doc, ref, { now: t2 }), { layers: layerSnapshot(d.doc, ref, t2) });
  H = layerHistory(d.doc, ref, t2);
  assert.equal(H.stats.refillMonths, 2);
  assert.equal(H.stats.lastDipRefilled, true);
  assert.equal(H.points.length, 4, 'three snapshots and now');
  assert.ok(H.points.every(p => p.layers.length >= 5));
});
