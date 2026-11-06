// Batch 44: the bank fire drill and stranded money (M9F, js/math/firedrill.js). Every number hand-checked: the
// arithmetic is in each comment, and the persona numbers are in each def's fireDrill note.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { importFile } from '../js/records.js';
import { fireDrillOf, backupPlanOf, daysCovered, payOrder, tierOf, platformHeld, mustPayOf, sameBankOf, mainAccount, minimumOf, drawsFromOf } from '../js/math/firedrill.js';
import { loadDefs, OUT_DIR, NOW } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const order = ref.fireDrill.order;
const now = new Date(NOW);
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);

test('the order to pay in is housing, utilities, food, getting to work, health, minimums, taxes, the rest (CFPB, NFCC)', () => {
  assert.deepEqual(order.map(o => o.id), ['housing', 'utilities', 'food', 'transport', 'health', 'minimums', 'taxes', 'rest']);
  assert.match(ref.fireDrill.source, /CFPB/);
  assert.match(ref.fireDrill.source, /NFCC/);
  assert.equal(tierOf({ category: 'Rent or mortgage', draftt: 'Accommodation' }, order).id, 'housing');
  assert.equal(tierOf({ category: 'Household supplies', draftt: 'Accommodation' }, order).id, 'rest'); // a need, but not the roof
  assert.equal(tierOf({ category: 'Phone', draftt: 'Bills' }, order).id, 'utilities');
  assert.equal(tierOf({ kind: 'gut', gut: true }, order).id, 'food');
  assert.equal(tierOf({ debtType: 'Car loan' }, order).id, 'transport');
  assert.equal(tierOf({ debtType: 'Mortgage' }, order).id, 'housing');
  assert.equal(tierOf({ debtType: 'Credit card' }, order).id, 'minimums');
  assert.equal(tierOf({ kind: 'tax' }, order).id, 'taxes');
  assert.equal(tierOf({ category: 'Streaming', draftt: 'Bills' }, order).id, 'rest');
});

test('days covered: whole days, and a card cannot pay rent or another debt', () => {
  // $3,650 a month is $120 a day (3,650 x 12 / 365). $1,000 / $120 = 8.33, so 8 days.
  assert.deepEqual(daysCovered({ cash: 1000, mustMonthly: 3650 }), { cash: 8, withCard: 8 });
  // With $2,000 of card room: (1,000 + 2,000) / 120 = 25 days, but rent $1,825 a month is $60 a day and only cash pays
  // it: 1,000 / 60 = 16.67. The fewer: 16 days.
  assert.deepEqual(daysCovered({ cash: 1000, card: 2000, mustMonthly: 3650, housing: 1825 }), { cash: 8, withCard: 16 });
  assert.deepEqual(daysCovered({ cash: 0, card: 500, mustMonthly: 3650 }), { cash: 0, withCard: 4 }); // 500 / 120 = 4.2
  assert.deepEqual(daysCovered({ cash: 100, mustMonthly: 0 }), { cash: null, withCard: null });
});

test('the order walk pays tier by tier; what a card can take goes on it; the rest says how much is not covered', () => {
  const rows = [{ name: 'Streaming', tier: 'rest', date: '2026-11-07', amount: 15 }, { name: 'Groceries', tier: 'food', date: '2026-11-08', amount: 400 },
    { name: 'Rent', tier: 'housing', date: '2026-12-01', amount: 1200 }, { name: 'Card minimum', tier: 'minimums', date: '2026-11-20', amount: 50 }];
  const w = payOrder(rows, { cash: 1300, card: 300 }, order);
  assert.deepEqual(w.map(r => r.name), ['Rent', 'Groceries', 'Card minimum', 'Streaming']);
  // $1,300: rent $1,200 (left $100); groceries $100 cash + $300 card (room 0); the minimum: no cash, no card: $50 not covered;
  // streaming: $15 not covered.
  assert.deepEqual(w.map(r => [r.fromCash, r.fromCard, r.short]), [[1200, 0, 0], [100, 300, 0], [0, 0, 50], [0, 0, 15]]);
});

test('must-pay from Budget lines: the DRAFTT needs and each minimum; the card minimum is M30', () => {
  const x = { spendingSource: 'lines', roommates: 0, dupOf: {}, debts: [{ id: 'c', type: 'Credit card', balance: 4000, apr: 0.24, payment: 200 }, { id: 'm', type: 'Car loan', balance: 9000, payment: 310 }],
    typedLines: [{ id: '1', category: 'Rent or mortgage', draftt: 'Accommodation', amount: 1500, per: 'month' }, { id: '2', category: 'Groceries', draftt: 'Food', amount: 450, per: 'month' },
      { id: '3', category: 'Streaming', draftt: 'Bills', amount: 20, per: 'month' }, { id: '4', category: 'Phone', draftt: 'Bills', amount: 60, per: 'month' }] };
  const m = mustPayOf(x, order);
  // Card minimum: the larger of $25 and 1% of $4,000 + $4,000 x 24% / 12 = $40 + $80 = $120. Lines: rent $1,500 +
  // groceries $450 + phone $60 = $2,010 (streaming is not a must-pay). + the car payment $310 + $120 = $2,440.
  near(minimumOf(x.debts[0]), 120);
  assert.equal(m.source, 'lines');
  near(m.monthly, 2440); near(m.housing, 1500); near(m.minimums, 120); near(m.cardable, 820);
});

test('banks: the same institution, or what the coach said; the everyday account by owner', () => {
  assert.deepEqual(sameBankOf({ id: 'a', bank: 'x' }, { id: 'b', bank: 'x' }), { same: true, known: true, from: 'institutions' });
  assert.deepEqual(sameBankOf({ id: 'a', bank: null }, { id: 'b', bank: null }), { same: false, known: false });
  assert.deepEqual(sameBankOf({ id: 'a' }, { id: 'b' }, { 'b:a': true }), { same: true, known: true, from: 'said' });
  const accts = [{ id: 's', type: 'Savings or HYSA' }, { id: 'p', type: 'Checking', owner: 'Partner' }, { id: 'j', type: 'Checking', owner: 'Joint' }];
  assert.equal(mainAccount(accts, 'Partner').id, 'p');
  assert.equal(mainAccount(accts).id, 'j');
  assert.equal(drawsFromOf({ paidWith: 'savings' }, accts).id, 's');
  assert.equal(drawsFromOf({ paidWith: 'c1' }, accts, [{ id: 'c1' }]).card, 'c1');
});

test('a platform holds back the net a day times the hold days', () => {
  // $2,350 a month x 12 / 365 = $77.26 a day x 7 days = $540.82.
  near(platformHeld({ net: 2350, holdDays: 7 }), 540.82);
  assert.equal(platformHeld({ net: 2350, holdDays: 0 }), null);
});

test('picking another account, and saying it is at the same bank, moves the drill', () => {
  const path = join(OUT_DIR, 'maya.json');
  const doc = importFile(readFileSync(path, 'utf8'));
  const savings = doc.records.find(r => r.kind === 'account' && r.type === 'Savings or HYSA');
  const checking = doc.records.find(r => r.kind === 'account' && r.type === 'Checking');
  const s = fireDrillOf(doc, ref, { now, account: savings.id });
  // Savings froze: nothing lands there; checking $1,200 is reachable.
  assert.equal(s.incoming.length, 0);
  assert.equal(s.reachable.cash, 1200);
  doc.program = { fireDrill: { sameBank: { [`${checking.id}:${savings.id}`]: true } } };
  const t = fireDrillOf(doc, ref, { now });
  // Checking froze and savings is at the same bank: $1,200 + $4,000 + $7,200 of pay out of reach, nothing to reach.
  assert.equal(t.unreachable.total, 12400);
  assert.equal(t.reachable.cash, 0);
  assert.equal(t.cover.cash, 0);
  // Rent ($1,750 on Dec 1, the day guessed) comes first in the order and is not covered.
  assert.equal(t.order[0].name, 'Rent');
  near(t.order[0].short, 1750);
});

const defs = (await loadDefs()).filter(d => d.fireDrill);
test('four personas carry what the fire drill should say', () => { assert.deepEqual(defs.map(d => d.id).sort(), ['couple-joint', 'creator', 'dancer', 'maya']); });
for (const def of defs) {
  test(`persona ${def.id}: the fire drill matches the hand-worked numbers`, () => {
    const path = join(OUT_DIR, `${def.id}.json`);
    assert.ok(existsSync(path));
    const doc = importFile(readFileSync(path, 'utf8'));
    const e = def.fireDrill;
    const D = fireDrillOf(doc, ref, { now });
    const B = backupPlanOf(doc, ref, D, { now });
    assert.equal(D.account.name, e.account);
    near(D.unreachable.total, e.outOfReach);
    near(D.reachable.cash, e.reach);
    near(D.must.monthly, e.mustPay);
    assert.equal(D.cover.cash, e.days);
    assert.equal(D.cover.withCard, e.withCard);
    assert.equal(D.result.value, e.days);
    if (e.taxesNotCounted != null) near(D.reachable.taxes, e.taxesNotCounted);
    if (e.ready != null) assert.equal(B.ready, e.ready);
    if (e.items != null) assert.equal(B.items.length, e.items);
    if (e.held != null) near(B.stranded.find(s => s.kind === 'platform').amount, e.held);
    if (e.stranded != null) assert.equal(B.stranded.length, e.stranded);
  });
}

test('who sees this: an account kept from the client folds to a neutral name and the drill gives the same numbers', async () => {
  const { foldDoc } = await import('../js/privacy.js');
  const doc = importFile(readFileSync(join(OUT_DIR, 'dancer.json'), 'utf8'));
  for (const r of doc.records.filter(x => x.kind === 'account' && x.values.group === 'cash')) r.values.seen = 'Coach only';
  const f = foldDoc(doc, { who: 'client', person: 'all', couple: false }, ref);
  const a = fireDrillOf(doc, ref, { now }), b = fireDrillOf(f, ref, { now });
  assert.ok(f.records.every(r => r.kind !== 'account' || r.values.group !== 'cash' || !r.values.institutionId), 'no bank on a folded row');
  for (const k of ['total', 'balance', 'paychecks']) assert.equal(b.unreachable[k], a.unreachable[k]);
  assert.equal(b.reachable.cash, a.reachable.cash);
  assert.deepEqual(b.cover, a.cover);
  // The savings is still known to be at another bank (the key), though no bank name shows.
  assert.ok(b.others.some(o => o.known && !o.same && !o.bankName));
});
