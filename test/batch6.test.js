// Batch 6: usability. The pure parts: what a screen counts as left (counters, What's missing, arrive-and-highlight).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { createCtx } from '../js/ui/staples.js';
import { listCompletion, missingFor, routeKey, MISSING } from '../js/completion.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const demoCtx = () => { const store = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() }); return createCtx({ store, ref, now: () => now }); };

test('items 2 and 3: a screen\'s missing fields come as items with a focus key, core first, one per field; nothing left means an empty list', () => {
  const ctx = demoCtx();
  assert.deepEqual(Object.keys(MISSING), ['cash-flow/income', 'net-worth/debt', 'net-worth/credit-cards', 'net-worth/assets', 'net-worth/protection', 'cash-flow/budget']);
  assert.equal(routeKey('#/net-worth/debt'), 'net-worth/debt');
  const before = missingFor(ctx, '#/net-worth/debt').filter(i => i.level === 'Core');
  assert.equal(before.length, 0, 'the Demo client has every debt balance and APR');
  const car = ctx.store.find(r => r.kind === 'debt' && r.type === 'Car loan')[0];
  ctx.store.update(car.id, { apr: null });
  const items = missingFor(ctx, '#/net-worth/debt');
  const core = items.filter(i => i.level === 'Core');
  assert.equal(core.length, 1);
  assert.deepEqual([core[0].id, core[0].field, core[0].focus, core[0].route, core[0].name], [car.id, 'apr', `${car.id}:apr`, '#/net-worth/debt', 'Car loan: APR']);
  assert.ok(core[0].word, 'a word for the status (missing, Roughly, Not sure)');
  const c = listCompletion(ctx, r => r.kind === 'debt', ['balance', 'apr']);
  assert.equal(c.core.done, c.core.of - 1);
  assert.equal(c.core.items.length, 1); assert.ok(c.full.items.length >= 1, 'full detail lists more');
  assert.equal(c.core.missing[0], 'Car loan: APR', 'the words stay for What\'s missing');
  assert.equal(missingFor(ctx, '#/home/session').length, 0, 'a screen with no completion has nothing to light up');
});

import { institutionsOf, addInstitution, institutionOf, rowLabel, atInstitution, migrateInstitutions, removeInstitution, INSTITUTION_KINDS } from '../js/institutions.js';
import { exportFile, importInto, newHousehold } from '../js/records.js';

test('items 13 to 15: institutions are one list; rows point at one and read Institution · Kind or · Nickname; an old file\'s typed names migrate, deduped', () => {
  const ctx = demoCtx(); const s = ctx.store;
  assert.deepEqual(INSTITUTION_KINDS, ['Bank', 'Credit union', 'Brokerage', 'Workplace plan', 'Lender', 'Insurer', 'Other']);
  const chase = addInstitution(s, { name: 'Chase', kind: 'Bank' });
  assert.equal(addInstitution(s, { name: ' chase ' }).id, chase.id, 'deduped by name, case blind');
  const checking = s.find(r => r.kind === 'account' && r.values.group === 'cash')[0];
  s.update(checking.id, { institutionId: chase.id, name: null });
  assert.equal(rowLabel(s.doc, s.get(checking.id)), `Chase · ${checking.type}`);
  s.update(checking.id, { name: 'Everyday' });
  assert.equal(rowLabel(s.doc, s.get(checking.id)), 'Chase · Everyday');
  const card = s.find(r => r.kind === 'debt' && r.type === 'Credit card')[0];
  s.update(card.id, { institutionId: chase.id });
  const at = atInstitution(s.doc, chase.id);
  assert.equal(at.rows.length, 2); assert.equal(at.total, (checking.values.balance ?? 0) - (card.values.balance ?? 0));
  // An older file with typed names: rows appear, deduped, and the records point at them.
  const old = JSON.parse(JSON.stringify(exportFile(s.doc)));
  delete old.household.profile.institutions;
  for (const r of old.household.records) { delete r.values.institutionId; }
  const a = old.household.records.filter(r => r.kind === 'account');
  a[0].values.institution = 'Ally'; a[1].values.institution = 'ALLY '; old.household.records.filter(r => r.kind === 'debt')[0].values.institution = 'Nelnet';
  const t = new Store(newHousehold({ name: 'T', now: now.toISOString() }));
  importInto(t, old);
  const names = institutionsOf(t.doc).map(i => i.name).sort();
  assert.deepEqual(names, ['Ally', 'Nelnet']);
  assert.equal(institutionOf(t.doc, t.doc.records.find(r => r.id === a[1].id)).name, 'Ally');
  assert.equal(institutionsOf(t.doc).find(i => i.name === 'Nelnet').kind, 'Lender');
  assert.equal(migrateInstitutions(t.doc).profile.institutions.length, 2, 'idempotent');
  removeInstitution(s, chase.id);
  assert.equal(s.get(checking.id).values.institutionId, null, 'its rows keep their nicknames and lose the pointer');
  s.undo(); assert.equal(institutionsOf(s.doc).length, 1, 'undoable');
});

import { instances, collapseSpread, dayTotals } from '../js/month.js';

test('items 28 to 30: an undated variable line spreads week by week and folds into one Spending money bar a week; a dated bill keeps its day; a fixed line with no day is a guessed day; day totals by type', () => {
  const ctx = demoCtx(); const s = ctx.store;
  s.setDoc('spending', { source: 'lines' });
  s.add('bill', { name: 'Fun money', amount: 500, values: { category: 'Fun', draftt: 'Other', amountType: 'Variable' } });
  s.add('bill', { name: 'Gym', amount: 60, values: { category: 'Gym or fitness', draftt: 'Therapy', amountType: 'Fixed' } });
  s.add('bill', { name: 'Water', amount: 40, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Fixed', dueDay: 12 } });
  const list = instances(s.doc, ref, '2026-11', { now });
  const fun = list.filter(i => i.name === 'Fun money');
  assert.equal(fun.length, 5, 'spread over 1, 8, 15, 22, 29');
  assert.ok(fun.every(i => i.spread) && Math.abs(fun.reduce((t, i) => t + i.planned, 0) + 500) < 0.01);
  const gym = list.find(i => i.name === 'Gym');
  assert.ok(gym.guessDate && gym.date === '2026-11-01', 'a fixed line with no due day sits on day 1 as a guessed day');
  assert.equal(list.find(i => i.name === 'Water').date, '2026-11-12');
  const folded = collapseSpread(list);
  const bars = folded.filter(i => i.kind === 'spread');
  assert.equal(bars.length, 5); assert.ok(bars.every(b => b.weekly && b.name === 'Spending money' && b.parts.length >= 1));
  assert.ok(!folded.some(i => i.spread), 'the spread lines are inside the bars');
  const t = dayTotals(folded.filter(i => i.date === '2026-11-01'));
  assert.ok(t.out < 0, 'spending shows as money out');
  assert.ok(Object.keys(t).every(k => ['in', 'out', 'debt', 'save', 'maybe'].includes(k)));
});

import { scorecardOf } from '../js/math/scorecard.js';
import { foo } from '../js/math/foo.js';
import { STEP_CARDS } from '../js/registry/foo.js';

test('items 33 to 35: step 8 with nothing to fund is not Done and every step has a progress share; Credit, Taxes and Income rate from their new inputs', () => {
  const ctx = demoCtx(); const s = ctx.store;
  const flags = JSON.parse(readFileSync(new URL('../data/flags.json', import.meta.url)));
  const F = foo(s.doc, ref, { now, flags });
  const s8 = F.steps.find(x => x.id === '8');
  assert.notEqual(s8.status, 'Done', 'item 33: nothing to fund is not done');
  assert.equal(s8.status, 'Optional'); assert.match(s8.note, /Nothing to fund yet/);
  assert.ok(F.steps.every(x => x.progress >= 0 && x.progress <= 1) && F.steps.find(x => x.id === '1').progress === 1 && F.steps.find(x => x.id === '4').progress > 0 && F.steps.find(x => x.id === '4').progress < 1);
  assert.ok(Object.keys(STEP_CARDS).length === 11 && STEP_CARDS['4'].short === 'big e' && /age divided by 5/.test(STEP_CARDS['4'].why));
  const area = id => scorecardOf(s.doc, ref, { now, flags }).areas.find(a => a.id === id);
  assert.equal(area('taxes').rating, null);
  s.setDoc('profile', { taxes: { lastYear: 2400 } });
  assert.equal(area('taxes').rating, 'Hole'); assert.match(area('taxes').reason, /refund/);
  s.setDoc('profile', { taxes: { lastYear: 2400, withholdingChanged: true } });
  assert.equal(area('taxes').rating, 'OK');
  s.setDoc('profile', { taxes: { lastYear: -300 } });
  assert.equal(area('taxes').rating, 'Strong');
  s.setDoc('profile', { incomeStability: 'Steady', incomeFacts: { marketRate: 'No' } });
  assert.equal(area('income').rating, 'Hole');
  s.setDoc('profile', { incomeFacts: { marketRate: 'Unsure' } });
  assert.equal(area('income').rating, 'OK');
  s.setDoc('profile', { incomeFacts: { marketRate: 'Yes', lastRaiseDate: '2026-03', lastRaiseAmount: 4000 } });
  assert.equal(area('income').rating, 'Strong');
  // Credit: the lower of the two scores, late payments, inquiries.
  s.setDoc('profile', { credit: { score: 760, scorePartner: 650 } });
  assert.equal(area('credit').rating, 'Hole', 'the partner\'s 650 is under 670');
  s.setDoc('profile', { credit: { score: 760, scorePartner: 745, inquiries: 4 } });
  assert.equal(area('credit').rating, 'OK'); assert.match(area('credit').reason, /4 hard inquiries/);
  s.setDoc('profile', { credit: { score: 760, inquiries: 1, oldestAccountYears: 12 } });
  assert.equal(area('credit').rating, 'Strong');
  s.setDoc('profile', { credit: { score: 760, latePayments: true, lateCount: 2 } });
  assert.equal(area('credit').rating, 'Hole'); assert.match(area('credit').reason, /2 late payments/);
});
