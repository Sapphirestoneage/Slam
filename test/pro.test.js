import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newAccount } from '../js/accounts.js';
import { newHousehold } from '../js/records.js';
import { safeLink, cardOf, setCard, addClient, stampCard, cardIn, rosterOf, practiceOf, summaryOf, markOf, addMark, marksIn, movedOf, sinceOf } from '../js/pro.js';
import { debtFreeOf } from '../js/solo.js';
const ref = JSON.parse(fs.readFileSync(new URL('../data/reference-2026.json', import.meta.url)));

test('a booking link is kept only when it is https', () => {
  assert.equal(safeLink('https://cal.example/eli'), 'https://cal.example/eli');
  for (const bad of ['javascript:alert(1)', 'http://cal.example', 'cal.example', '', null]) assert.equal(safeLink(bad), '');
});
test('a card needs a name; setting an empty one takes it off', () => {
  assert.equal(cardOf({ firm: 'X' }), null);
  const a = setCard(newAccount('Pro'), { name: '  Sam   Coach ', firm: 'SLAM', link: 'javascript:1' });
  assert.deepEqual(a.pro, { name: 'Sam Coach', firm: 'SLAM', link: '' });
  assert.equal('pro' in setCard(a, { name: '' }), false);
});
test('a client plan is a shared space with the pro and the client in it', () => {
  let a = addClient(newAccount('Pro'), 'Jordan'); a = addClient(a, '');
  const shared = a.spaces.filter(s => s.kind === 'shared');
  assert.deepEqual(shared.map(s => s.name), ['Jordan', 'Client 2']);
  assert.deepEqual(shared[0].members, ['Pro', 'Jordan']);
  assert.equal(a.spaces[0].kind, 'mine');
});
test('the card rides in the plan and reads back', () => {
  const doc = stampCard(newHousehold({ name: 'J' }), { name: 'Sam', link: 'https://x.example/b' });
  assert.deepEqual(cardIn(doc), { name: 'Sam', firm: '', link: 'https://x.example/b' });
  assert.equal(cardIn(newHousehold({ name: 'J' })), null);
});
test('the list: changed plans first, an untouched plan says so, my own plan is not a client', () => {
  let a = addClient(newAccount('Pro'), 'Bea'); a = addClient(a, 'Al');
  const [bea, al] = a.spaces.filter(s => s.kind === 'shared'), d = newHousehold({ name: 'Al' });
  d.settings = { ...d.settings, start: { collapse: { work: 'steady', press: 'fine', cushion: '3', match: 'full', want: 'grow' } } };
  const rows = rosterOf(a, { [al.id]: d }, ref, { stamps: { [al.id]: 20, [bea.id]: 5 }, seen: { [bea.id]: 9 } });
  assert.deepEqual(rows.map(r => r.name), ['Al', 'Bea']);
  assert.equal(rows[0].changed, true); assert.equal(rows[1].changed, false); assert.equal(rows[1].empty, true); assert.equal(rows[1].of, 0);
  assert.equal(rows[0].of, 7); assert.ok(rows[0].next);
  assert.deepEqual(practiceOf(rows), { clients: 2, changed: 1, notStarted: rows.filter(r => r.empty).length, finished: 0 });
});
test('the summary uses the same debt date as the debt page and names what is still open', () => {
  const doc = newHousehold({ name: 'Jordan' }), now = new Date(2026, 10, 14);
  doc.records.push({ id: 'd1', kind: 'debt', type: 'Credit card', name: 'Card', values: { balance: 3000, apr: 0.24, payment: 200 } });
  const S = summaryOf(doc, ref, { now }), line = id => S.lines.find(l => l.id === id);
  assert.equal(line('debt').value, debtFreeOf(doc, ref, { now }).date);
  assert.equal(line('debt').amount, 3000);
  assert.deepEqual(S.open, ['First move', 'If the pay stopped', 'Finish line']);
  assert.equal(S.on, now.toISOString().slice(0, 10)); assert.equal(S.card, null);
});

test('what moved: a mark is the day\'s numbers, and the debt-free month is compared as a calendar month', () => {
  let doc = newHousehold({ name: 'Jordan' }); const t0 = new Date(2026, 10, 14), t1 = new Date(2027, 1, 14);
  doc.records.push({ id: 'd1', kind: 'debt', type: 'Credit card', name: 'Card', values: { balance: 3000, apr: 0.24, payment: 200 } });
  const m0 = markOf(doc, ref, { now: t0 }), D0 = debtFreeOf(doc, ref, { now: t0 });
  assert.equal(m0.owed, 3000); assert.equal(m0.debtAt, 2026 * 12 + 10 + D0.months); assert.equal(m0.cash, null);
  doc = addMark(doc, m0); doc = addMark(doc, { ...m0, done: 99 });
  assert.equal(marksIn(doc).length, 1, 'one mark a day'); assert.equal(marksIn(doc)[0].done, 99);
  doc = addMark(doc, m0);
  // three months on: $600 paid down and the payment raised to $400
  doc.records[0].values = { balance: 2400, apr: 0.24, payment: 400 };
  const S = sinceOf(doc, ref, { now: t1 }), D1 = debtFreeOf(doc, ref, { now: t1 }), line = id => S.sinceStart.find(l => l.id === id);
  assert.equal(S.start, '2026-11-14'); assert.equal(line('owed').by, -600);
  assert.equal(line('debtAt').by, (2027 * 12 + 1 + D1.months) - (2026 * 12 + 10 + D0.months));
  assert.ok(line('debtAt').by < 0, 'a bigger payment brings the month closer');
  assert.equal(S.sinceStart.some(l => l.id === 'cash' || l.id === 'runway'), false, 'nothing is said about numbers not known at both ends');
  assert.deepEqual(movedOf(m0, m0), []); assert.deepEqual(movedOf(null, m0), []);
  assert.deepEqual(sinceOf(newHousehold({ name: 'x' }), ref, { now: t0 }).sinceStart, []);
  let many = newHousehold({ name: 'x' }); for (let i = 0; i < 30; i++) many = addMark(many, { ...m0, on: `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}` });
  assert.ok(marksIn(many).length <= 24);
});
