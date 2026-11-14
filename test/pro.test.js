import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newAccount } from '../js/accounts.js';
import { newHousehold } from '../js/records.js';
import { safeLink, cardOf, setCard, addClient, stampCard, cardIn, rosterOf, practiceOf, summaryOf } from '../js/pro.js';
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
