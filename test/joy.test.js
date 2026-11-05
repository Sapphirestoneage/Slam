// Overnight F4: the Joy number. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, exportFile, importInto } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { JOY, CONFIDENCE, MEASURES } from '../js/registry/joy.js';
import { setJoy, joyOf, joyHistory, snapshotNumbers, startSession, endSession, day0Report, setConfidence, confidenceOf, confidenceHistory } from '../js/program.js';
import { scorecardOf } from '../js/math/scorecard.js';
import { setHouseholdMode } from '../js/couples.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const later = new Date('2026-12-10T12:00:00Z');
const demoStore = () => new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });

test('the wording is config; the number is 1 to 10, per person in a couple', () => {
  assert.equal(JOY.question, 'How much joy do you get from your money?');
  assert.equal(JOY.label, 'Joy');
  const d = demoStore();
  assert.equal(joyOf(d.doc).asked, false);
  setJoy(d, 1, 6);
  assert.deepEqual([joyOf(d.doc).value, joyOf(d.doc).n], [6, 1]);
  assert.throws(() => setJoy(d, 1, 11), /1 to 10/);
  setHouseholdMode(d, 'Married merged');
  setJoy(d, 1, 8, { person: 'Partner' });
  assert.deepEqual([joyOf(d.doc).value, joyOf(d.doc).partner], [6, 8]);
  d.undo();
  assert.equal(joyOf(d.doc).partner, null, 'undoable');
});

test('every snapshot carries Joy; the history runs Day 0 to now; Day 0 vs now shows it', () => {
  const d = demoStore();
  startSession(d, ref, { now });
  setJoy(d, 1, 4, { now: now.toISOString() });
  endSession(d, ref, { now });
  assert.equal(d.lastSnapshot().metrics.joy, 4);
  assert.ok(d.lastSnapshot().day0);
  startSession(d, ref, { now: later });
  setJoy(d, 2, 7, { now: later.toISOString() });
  let H = joyHistory(d.doc);
  assert.equal(H.day0, 4);
  assert.equal(H.latest, 7);
  assert.equal(H.change, 3);
  assert.equal(H.points.length, 2, 'Day 0 and the latest answer');
  endSession(d, ref, { now: later });
  H = joyHistory(d.doc);
  assert.equal(H.points.length, 2, 'the End of session 2 snapshot replaces the loose point');
  assert.deepEqual(H.points.map(p => p.value), [4, 7]);
  const row = day0Report(d.doc, ref, { now: later }).rows.find(r => r.key === 'joy');
  assert.deepEqual([row.then, row.now, row.change], [4, 7, 3]);
  assert.equal(snapshotNumbers(d.doc, ref, { now: later }).joy, 7);
});

test('answer 164: Confidence rates Mindset, Joy does not; both are asked, kept, snapshotted and charted; an old money feeling reads and imports as Confidence', () => {
  const d = demoStore();
  const area = () => scorecardOf(d.doc, ref, { now }).areas.find(a => a.id === 'mindset');
  assert.equal(area().rating, null);
  setJoy(d, 1, 3);
  assert.equal(area().rating, null, 'Joy is the local measure, not a Mindset input');
  setConfidence(d, 1, 3);
  assert.equal(area().rating, 'Hole');
  assert.match(area().reason, /Confidence 3 of 10/);
  assert.equal(CONFIDENCE.question, 'How confident (vs afraid) do you feel about your money?');
  assert.deepEqual(MEASURES.map(m => m.label), ['Confidence', 'Joy']);
  d.setIn('session', ['feelings', '2'], 8, 'Money feeling'); // an older file's money feeling for session 2
  assert.equal(confidenceOf(d.doc).value, 8, 'the old money feeling reads as Confidence');
  assert.equal(area().rating, 'Strong');
  startSession(d, ref, { now }); endSession(d, ref, { now });
  const snap = d.lastSnapshot();
  assert.deepEqual([snap.metrics.confidence, snap.metrics.joy], [8, 3], 'both measures in the snapshot');
  assert.equal(confidenceHistory(d.doc).day0, 8);
  assert.ok(day0Report(d.doc, ref, { now }).rows.some(r => r.key === 'confidence') && day0Report(d.doc, ref, { now }).rows.some(r => r.key === 'joy'));
  // An old file with feelings only imports as Confidence.
  const t = demoStore();
  const file = JSON.parse(JSON.stringify(exportFile(d.doc)));
  delete file.household.session.confidence; file.household.session.feelings = { 1: 5 };
  importInto(t, file);
  assert.equal(t.doc.session.confidence['1'].Me, 5); assert.equal(t.doc.session.feelings, undefined);
  assert.equal(confidenceOf(t.doc, 1).value, 5);
});
