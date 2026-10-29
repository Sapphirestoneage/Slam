import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store, newHousehold, statusOf, countsAsDone, changeSince, exportFile, importFile, importInto, backupDue } from '../js/records.js';
import { memoryAdapter, autosave, saveClient, loadClient, listClients, createClient } from '../js/storage.js';

function clock(start = '2026-11-01T10:00:00.000Z') {
  let t = Date.parse(start);
  return () => new Date((t += 1000)).toISOString();
}
const fresh = () => new Store(newHousehold({ name: 'Test', now: '2026-11-01T09:00:00.000Z' }), { now: clock() });

test('add makes a blank record: empty is null, never 0', () => {
  const s = fresh();
  const r = s.add('debt', { type: 'Credit card' });
  assert.equal(r.amount, null);
  assert.equal(r.name, null);
  assert.deepEqual(r.values, {});
  assert.equal(r.source, 'manual');
  assert.equal(s.records.length, 1);
});

test('edit keeps the old value with its date', () => {
  const s = fresh();
  const r = s.add('debt', { type: 'Credit card', values: { balance: 4200 } });
  s.update(r.id, { balance: 4000 });
  s.update(r.id, { balance: 3800 });
  const h = s.historyOf(r.id, 'balance');
  assert.deepEqual(h.map(x => x.to), [4200, 4000, 3800]);
  assert.deepEqual(h.map(x => x.from), [null, 4200, 4000]);
  assert.ok(h[0].at < h[1].at && h[1].at < h[2].at);
  assert.equal(s.valueAt(r.id, 'balance', h[1].at), 4000);
  assert.equal(s.get(r.id).values.balance, 3800);
});

test('delete, then undo brings it back; redo deletes again', () => {
  const s = fresh();
  const a = s.add('bill', { name: 'Netflix', amount: 15.99 });
  s.add('bill', { name: 'Gym', amount: 40 });
  s.remove(a.id);
  assert.equal(s.records.length, 1);
  assert.equal(s.undo(), 'Deleted');
  assert.equal(s.records.length, 2);
  assert.equal(s.get(a.id).name, 'Netflix');
  s.redo();
  assert.equal(s.get(a.id), null);
  assert.ok(s.doc.history.some(h => h.op === 'remove' && h.id === a.id));
});

test('bulk delete is one undo step (R111)', () => {
  const s = fresh();
  const ids = [1, 2, 3, 4, 5].map(n => s.add('bill', { name: `Bill ${n}` }).id);
  s.remove(ids);
  assert.equal(s.records.length, 0);
  assert.equal(s.undoStack.at(-1).label, 'Deleted 5');
  s.undo();
  assert.equal(s.records.length, 5);
});

test('undo covers edits, resets and status changes', () => {
  const s = fresh();
  const r = s.add('debt', { type: 'Credit card', name: 'Chase', values: { balance: 4200, apr: 0.2215 } });
  s.update(r.id, { balance: 100 });
  s.undo();
  assert.equal(s.get(r.id).values.balance, 4200);
  s.reset(r.id);
  assert.equal(s.get(r.id).values.balance, undefined);
  assert.equal(s.get(r.id).name, null);
  assert.equal(s.records.length, 1, 'reset keeps the row');
  s.undo();
  assert.equal(s.get(r.id).values.balance, 4200);
  s.setStatus([r.id], 'Roughly');
  assert.equal(s.get(r.id).status, 'Roughly');
  s.undo();
  assert.equal(s.get(r.id).status, null);
  assert.ok(s.doc.history.some(h => h.op === 'undo:set' && h.field === 'balance'), 'undo is in history too');
});

test('a new change clears redo', () => {
  const s = fresh();
  const r = s.add('bill', { name: 'A' });
  s.update(r.id, { name: 'B' });
  s.undo();
  assert.ok(s.canRedo);
  s.update(r.id, { name: 'C' });
  assert.ok(!s.canRedo);
});

test('duplicate copies the row as a new record', () => {
  const s = fresh();
  const r = s.add('bill', { name: 'Rent', amount: 1650 });
  const [copy] = s.duplicate(r.id);
  assert.notEqual(copy.id, r.id);
  assert.equal(copy.amount, 1650);
  assert.equal(s.records.length, 2);
});

test('linked records: delete the loan only, or the car too (R087)', () => {
  const s = fresh();
  const car = s.add('asset', { type: 'Car', values: { value: 9500 } });
  const loan = s.add('debt', { type: 'Car loan', linkedTo: car.id, values: { balance: 7000 } });
  assert.deepEqual(s.linked(car.id).map(r => r.id), [loan.id]);
  s.remove(loan.id);
  assert.ok(s.get(car.id));
  s.undo();
  s.remove(loan.id, { withLinked: true });
  assert.equal(s.records.length, 0);
});

test('statuses: typed = Know it, row status applies to fields, done rules', () => {
  const s = fresh();
  const r = s.add('debt', { values: { balance: 100 } });
  assert.equal(statusOf(r, 'balance'), 'Know it');
  assert.equal(statusOf(r, 'apr'), null);
  s.update(r.id, { status: 'Roughly' });
  assert.equal(statusOf(s.get(r.id), 'apr'), 'Roughly');
  s.setFieldStatus(r.id, 'apr', 'Will email');
  assert.equal(statusOf(s.get(r.id), 'apr'), 'Will email');
  assert.ok(countsAsDone('Roughly') && countsAsDone('Not for me') && !countsAsDone('Will email') && !countsAsDone('Not now'));
  assert.throws(() => s.setStatus(r.id, 'Maybe'));
});

test('snapshots and change since last session', () => {
  const s = fresh();
  assert.equal(changeSince({ netWorth: 10 }, s.lastSnapshot(), 'netWorth'), null, 'no snapshot: nothing');
  s.snapshot('Session 1', { netWorth: 8300, savingsRate: 0.25 });
  const c = changeSince({ netWorth: 9000, savingsRate: null }, s.lastSnapshot(), 'netWorth');
  assert.deepEqual([c.diff, c.direction], [700, 'up']);
  assert.equal(changeSince({ savingsRate: null }, s.lastSnapshot(), 'savingsRate'), null);
});

test('export then import round-trips', () => {
  const s = fresh();
  const r = s.add('debt', { type: 'Credit card', values: { balance: 4200, apr: 0.2215 } });
  s.update(r.id, { balance: 4100 });
  s.addNote('Ask about the HSA');
  s.snapshot('Session 1');
  const file = JSON.stringify(exportFile(s.doc, '2026-11-02T00:00:00.000Z'));
  const back = importFile(file);
  assert.deepEqual(back, JSON.parse(JSON.stringify(s.doc)));
  assert.throws(() => importFile('{"app":"Other"}'), /not a SLAM backup/);
  assert.throws(() => importFile({ app: 'SLAM', format: 99, household: {} }), /newer/);
});

test('import takes a snapshot first and can be undone (R085)', () => {
  const s = fresh();
  s.add('bill', { name: 'Old' });
  const other = fresh();
  other.add('bill', { name: 'New 1' });
  other.add('bill', { name: 'New 2' });
  importInto(s, exportFile(other.doc));
  assert.equal(s.records.length, 2);
  assert.equal(s.lastSnapshot().label, 'Before import');
  assert.equal(s.lastSnapshot().records[0].name, 'Old');
  s.undo();
  assert.deepEqual(s.records.map(r => r.name), ['Old']);
});

test('backup reminder after 7 days (R149)', () => {
  const doc = newHousehold();
  assert.equal(backupDue(doc).due, true);
  doc.lastBackupAt = '2026-11-01T00:00:00.000Z';
  assert.deepEqual(backupDue(doc, '2026-11-05T00:00:00.000Z'), { due: false, days: 4 });
  assert.deepEqual(backupDue(doc, '2026-11-10T00:00:00.000Z'), { due: true, days: 9 });
});

test('parking lot notes file to a field', () => {
  const s = fresh();
  const n = s.addNote('Has a Roth from the old job');
  s.fileNote(n.id, 'F190');
  assert.equal(s.doc.parking[0].filedTo, 'F190');
  s.undo();
  assert.equal(s.doc.parking[0].filedTo, null);
});

test('storage: save, list, load', () => {
  const a = memoryAdapter();
  const doc = createClient(a, 'Demo', '2026-11-01T00:00:00.000Z');
  assert.deepEqual(listClients(a).map(c => c.name), ['Demo']);
  assert.equal(loadClient(a, doc.id).client.name, 'Demo');
});

test('autosave within a second; Unsaved when it fails (R084)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const a = memoryAdapter();
  const s = fresh();
  const states = [];
  const saver = autosave(s, a, { onState: x => states.push(x), timers: { setTimeout, clearTimeout } });
  s.add('bill', { name: 'Rent' });
  assert.equal(saver.state, 'saving');
  t.mock.timers.tick(1000);
  assert.equal(saver.state, 'saved');
  assert.equal(loadClient(a, s.doc.id).records.length, 1);
  a.set = () => { throw new Error('full'); };
  s.add('bill', { name: 'Gym' });
  t.mock.timers.tick(1000);
  assert.equal(saver.state, 'unsaved');
  assert.ok(saver.pending);
  assert.deepEqual(states, ['saving', 'saved', 'saving', 'unsaved']);
});
