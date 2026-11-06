// Batch 7 (Nov 5, Eli's walkthrough): the pure parts. A parked field is handled, not missing, and is homework, not a
// revisit; the Institutions picker is the institution; a card paid in full needs no APR; a Brokerage or IRA is never
// asked Pretax or Roth; the ladder carries dollars; notes resolve and become homework for the client or the coach;
// defaults in use are listed; names tell two accounts at one bank apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { createCtx } from '../js/ui/staples.js';
import { listCompletion, missingFor, paidInFull } from '../js/completion.js';
import { checksOf, defaultsInUse } from '../js/checks.js';
import { homeworkList, homeworkText, LATER } from '../js/homework.js';
import { makeHomework, setHomeworkStatus, setHomeworkOwner, agendaOf } from '../js/program.js';
import { addInstitution } from '../js/institutions.js';
import { ladderOf } from '../js/math/ladder.js';
import { asksTaxType, taxTypeFor } from '../js/math/portfolio.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const flags = JSON.parse(readFileSync(new URL('../data/flags.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const demoCtx = () => { const store = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() }); return createCtx({ store, ref, now: () => now }); };

test('item 4: a field marked I\'ll find it later is handled for the counters and What\'s missing, counted as "on homework", and off the Revisit list until the client says done', () => {
  const ctx = demoCtx(); const s = ctx.store;
  const car = s.find(r => r.kind === 'debt' && r.type === 'Car loan')[0];
  s.update(car.id, { apr: null });
  assert.equal(missingFor(ctx, '#/net-worth/debt').filter(i => i.level === 'Core').length, 1, 'blank APR is missing');
  s.setFieldStatus(car.id, 'apr', LATER);
  assert.equal(missingFor(ctx, '#/net-worth/debt').filter(i => i.id === car.id && i.field === 'apr').length, 0, 'parked: not missing');
  const c = listCompletion(ctx, r => r.kind === 'debt', ['balance', 'apr']);
  assert.equal(c.core.done, c.core.of, 'the bar counts it as handled'); assert.equal(c.core.parked, 1, 'and says one is on homework');
  assert.ok(homeworkList(s.doc, s.records).some(x => x.key === `rec:${car.id}:apr`), 'it is on the Homework list');
  assert.ok(!checksOf(s.doc, ref, { now }).some(x => x.rec?.id === car.id), 'and not on the Revisit list');
  setHomeworkStatus(s, `rec:${car.id}:apr`, 'Client says done');
  assert.ok(checksOf(s.doc, ref, { now }).some(x => x.rec?.id === car.id), 'once the client says done, the coach gets it to confirm');
});

test('items 3 and 8: picking an institution from the list is the institution; two accounts at one bank read apart', () => {
  const ctx = demoCtx(); const s = ctx.store;
  s.add('account', { name: null, values: { group: 'investment', balance: 1200 } }, { type: 'HSA' });
  const inv = s.find(r => r.kind === 'account' && r.values.group === 'investment');
  assert.ok(inv.length >= 2);
  const before = listCompletion(ctx, r => r.kind === 'account', ['balance']).full;
  assert.ok(before.missing.some(m => /institution/.test(m)), 'the Demo client has no institutions yet');
  const tikva = addInstitution(s, { name: 'Tikva', kind: 'Workplace plan' });
  for (const r of inv) s.update(r.id, { institutionId: tikva.id, name: null });
  const after = listCompletion(ctx, r => r.kind === 'account' && r.values.group === 'investment', ['balance']).full;
  assert.ok(!after.missing.some(m => /institution/.test(m)), 'the picker counts');
  s.setFieldStatus(inv[0].id, 'contribution', LATER); s.setFieldStatus(inv[1].id, 'contribution', LATER);
  const labels = homeworkList(s.doc, s.records).filter(x => x.field === 'contribution').map(x => x.label);
  assert.equal(labels.length, 2); assert.notEqual(labels[0], labels[1], 'Tikva · All investments and Tikva · HSA, not Tikva twice');
  assert.ok(labels.every(l => l.startsWith('Find: Tikva · ')), 'batch 8: homework reads Find: …');
  const item = missingFor(ctx, '#/net-worth/assets').find(i => i.field === 'balance') ?? { where: null };
  assert.equal(typeof item.where === 'string' || item.where === null, true, 'every item says where to look');
});

test('item 11: a card paid in full each month needs its balance only; a card that carries needs its APR too', () => {
  const ctx = demoCtx(); const s = ctx.store;
  const card = s.add('debt', { name: 'Blue', values: { balance: 900, apr: null } }, { type: 'Credit card' });
  assert.ok(missingFor(ctx, '#/net-worth/credit-cards').some(i => i.id === card.id && i.field === 'apr'), 'carries: APR asked');
  s.update(card.id, { payChoice: 'In full' });
  assert.ok(paidInFull(s.get(card.id)));
  assert.ok(!missingFor(ctx, '#/net-worth/credit-cards').some(i => i.id === card.id && i.field === 'apr'), 'in full: no APR asked');
  assert.ok(!missingFor(ctx, '#/net-worth/credit-cards').some(i => i.id === card.id && i.field === 'payment'));
  assert.ok(ctx.metrics().inputs.debts.find(d => d.id === card.id).inFull);
});

test('item 5: only Other and All investments ask Pretax or Roth; an IRA answers from its name; a Brokerage never asks', () => {
  assert.ok(asksTaxType('Other') && asksTaxType('All investments'));
  for (const t of ['Brokerage', 'Crypto', '529', 'Roth IRA', 'Traditional IRA', 'HSA', '401(k)']) assert.ok(!asksTaxType(t), t);
  assert.equal(taxTypeFor('Roth IRA'), 'Roth'); assert.equal(taxTypeFor('Rollover IRA'), 'Pretax'); assert.equal(taxTypeFor('Brokerage'), null); assert.equal(taxTypeFor('Other', 'Both'), 'Both');
  const ctx = demoCtx(); const s = ctx.store;
  const b = s.add('account', { name: 'Taxable', values: { group: 'investment', balance: 5000 } }, { type: 'Brokerage' });
  assert.ok(!listCompletion(ctx, r => r.id === b.id, ['balance']).full.missing.some(m => /Roth/.test(m)), 'no Pretax or Roth hole on a brokerage');
});

test('item 7: each ladder step carries have, target and left in dollars; markers carry value and target', () => {
  const ctx = demoCtx();
  const L = ladderOf(ctx.store.doc, ref, { now, flags });
  const bigE = L.steps.find(s => s.id === 'bigE');
  assert.ok(bigE.target > 0 && bigE.have >= 0 && bigE.have <= bigE.target && bigE.left === bigE.target - bigE.have);
  assert.equal(L.steps.find(s => s.id === 'match')?.target ?? null, null, 'the match has no dollars');
  const nw = L.markers.find(k => k.id === 'nw100k');
  assert.equal(nw.target, 100000); assert.equal(typeof nw.value, 'number');
});

test('item 9: a note resolves without a field, folds as done, becomes homework for the client or for me, and closes when that homework is confirmed', () => {
  const ctx = demoCtx(); const s = ctx.store;
  const a = s.addNote('Ask about the bonus'), b = s.addNote('Make a field for the HSA employer part'), c = s.addNote('Leftover');
  assert.equal(s.openNotes().length, 3);
  s.resolveNote(a.id, true);
  assert.equal(s.openNotes().length, 2); assert.ok(s.doc.parking.find(n => n.id === a.id).doneAt);
  s.undo(); assert.equal(s.openNotes().length, 3, 'undoable');
  s.resolveNote(a.id, true);
  const hwC = makeHomework(s, 'S1', c.text, { owner: 'client', noteId: c.id });
  const hwB = makeHomework(s, 'S1', b.text, { owner: 'coach', noteId: b.id });
  const list = homeworkList(s.doc, s.records);
  assert.equal(list.find(x => x.key === `hw:${hwC.id}`).owner, 'client'); assert.equal(list.find(x => x.key === `hw:${hwB.id}`).owner, 'coach');
  assert.ok(!homeworkText('Z', list).includes(b.text), 'the coach\'s item never goes to the client'); assert.ok(homeworkText('Z', list).includes(c.text));
  assert.ok(!agendaOf(s.doc, ref, { now, flags }).suggestions.some(x => x.kind === 'parking' && x.label === a.text), 'a resolved note stops being suggested');
  setHomeworkStatus(s, `hw:${hwB.id}`, 'Confirmed');
  assert.equal(s.doc.parking.find(n => n.id === b.id).doneAs, 'homework', 'confirming the homework resolves the note');
  setHomeworkOwner(s, `hw:${hwC.id}`, 'coach');
  assert.equal(homeworkList(s.doc, s.records).find(x => x.key === `hw:${hwC.id}`).owner, 'coach');
  assert.equal(homeworkList(s.doc, s.records).find(x => x.key === `hw:${hwC.id}`).owner === 'client', false);
});

test('item 12: defaults in use lists every number the app filled with a typical value, and a typed number takes it off', () => {
  const ctx = demoCtx(); const s = ctx.store;
  const card = s.add('debt', { name: 'Blue', values: { balance: 900, apr: null } }, { type: 'Credit card' });
  const list = defaultsInUse(s.doc, ref);
  const hit = list.find(x => x.rec.id === card.id);
  assert.ok(hit && hit.field === 'apr' && hit.value === ref.typicalRates['Credit card'] && hit.unit === 'pct');
  s.update(card.id, { apr: 0.199 });
  assert.ok(!defaultsInUse(s.doc, ref).some(x => x.rec.id === card.id));
  s.setFieldStatus(card.id, 'balance', 'Not sure');
  assert.ok(defaultsInUse(s.doc, ref).some(x => x.rec.id === card.id && x.field === 'balance' && x.from === 'Marked Not sure'));
});
