// SPDX-License-Identifier: AGPL-3.0-only
// The card plan (js/math/cardplan.js) over the dated offers layer (data/library/card-offers.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as P from '../js/math/cardplan.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const D = read('../data/library/card-offers.json'), lib = read('../data/library/cards.json');
const by = name => D.offers.find(o => o.name === name);
const opts = { units: D.units, rule: D.rules.chase524, unlockIds: D.unlocksTransfers };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('the offers file is whole: ids exist in the library, counts match, every offer says where it came from', () => {
  const ids = new Set(lib.cards.map(c => c.id));
  assert.equal(D.offers.length, D.counts.offers);
  assert.equal(D.offers.filter(o => o.cardId).length, D.counts.inLibrary);
  for (const o of D.offers) {
    if (o.cardId) assert.ok(ids.has(o.cardId), o.cardId);
    else assert.ok(o.earnWords || o.bonus.words, `${o.name} says what it earns or offers`);
    assert.ok(D.units[o.bonus.unit], `${o.name} unit`);
    assert.ok(o.sources.length && o.verified, `${o.name} source`);
        if (o.cardId) assert.equal(o.annualFee, lib.cards.find(c => c.id === o.cardId).annualFee, `${o.name} fee matches the library`);
  }
  assert.equal(new Set(D.offers.map(o => o.cardId ?? o.name)).size, D.offers.length, 'no card twice');
});

test('an offer is worth its floor value, and a Chase point is lifted only once a transfer card is in hand', () => {
  near(P.offerValue(by('Sapphire Preferred'), opts), 750);
  near(P.offerValue(by('Sapphire Preferred'), { ...opts, transferValue: 0.015 }), 1125);
  near(P.offerValue(by('Freedom Unlimited'), { ...opts, transferValue: 0.015 }), 200, 1e-6);
  near(P.offerValue(by('Freedom Unlimited'), { ...opts, transferValue: 0.015, held: ['chase-sapphire-preferred'] }), 300);
  near(P.offerValue(by('IHG One Rewards Premier'), { ...opts, transferValue: 0.02 }), 900);
  assert.equal(P.offerValue(by('World of Hyatt'), opts), null, 'sites disagree: no value');
});

test('slots, months to earn and the first-year net', () => {
  assert.equal(P.slotsLeft(3, D.rules.chase524), 2);
  assert.equal(P.slotsLeft(7, D.rules.chase524), 0);
  assert.equal(P.monthsToEarn(by('Sapphire Preferred'), 2000), 3);
  assert.equal(P.monthsToEarn(by('Sapphire Preferred'), 1000), null);
  assert.equal(P.monthsToEarn(by('Freedom Unlimited'), 1000), 1);
  assert.equal(P.monthsToEarn(by('Prime Visa'), 0), 1);
  near(P.firstYearNet(by('Sapphire Preferred'), opts), 655);
  near(P.firstYearNet(by('Sapphire Reserve'), opts), 205);
  near(P.firstYearNet(by('Sapphire Reserve'), { ...opts, creditsUsed: 300 }), 505);
  near(P.firstYearNet(by('Sapphire Reserve'), { ...opts, creditsUsed: 2000 }), 1000, 1e-6);
});

test('fit: debt first, the slot rule, the score, and spending that cannot reach the offer', () => {
  const fit = (name, me) => P.cardFit(by(name), me, opts);
  assert.equal(fit('Sapphire Preferred', { heavyDebt: true }).level, 'later');
  assert.equal(fit('Sapphire Preferred', { opened: 5 }).level, 'later');
  assert.equal(fit('Sapphire Reserve', { score: 'good' }).level, 'later');
  assert.equal(fit('Sapphire Preferred', { opened: 2, score: 'excellent', monthlySpend: 2000 }).level, 'fits');
  assert.equal(fit('Sapphire Preferred', { monthlySpend: 1000 }).level, 'maybe');
  assert.equal(fit('Sapphire Preferred', { monthlySpend: 500 }).level, 'later');
  assert.equal(fit('Freedom Rise', { score: 'excellent' }).level, 'maybe');
  assert.equal(fit('Ink Business Cash', { business: false }).level, 'later');
  assert.equal(fit('World of Hyatt', {}).level, 'maybe');
  assert.match(fit('Sapphire Preferred', { opened: 4 }).reasons.join(' '), /last slot/);
});

test('next moves rank by net after the fee, look one move further, and stop at the slot rule', () => {
  const personal = D.offers.filter(o => !o.business);
  const R = P.nextMoves(personal, { opened: 3, monthlySpend: 2000, me: { score: 'excellent' } }, { ...opts, transferValue: 0.015 });
  assert.equal(R.slots, 2);
  assert.ok(R.moves.length > 5);
  for (let i = 1; i < R.moves.length; i++) assert.ok(R.moves[i - 1].net >= R.moves[i].net, 'best first');
  const csp = R.moves.find(m => m.offer.name === 'Sapphire Preferred');
  near(csp.net, 1030); assert.equal(csp.months, 3); assert.equal(csp.slotsAfter, 1);
  assert.ok(csp.then.length > 0 && csp.then.every(t => t.startsMonth === 4));
  const cfu = R.moves.find(m => m.offer.name === 'Freedom Unlimited');
  near(cfu.then.find(t => t.offer.name === 'Sapphire Preferred').both, 300 + 1030, 1e-6);
  const last = P.nextMoves(personal, { opened: 4, monthlySpend: 2000 }, opts);
  assert.ok(last.moves.every(m => m.then.length === 0 && m.slotsAfter === 0), 'the last slot has no second move');
  assert.deepEqual(P.nextMoves(personal, { opened: 5, monthlySpend: 2000 }, opts).moves, []);
  assert.deepEqual(P.nextMoves(personal, { opened: 0, monthlySpend: 2000, me: { heavyDebt: true } }, opts).moves, []);
  assert.ok(!P.nextMoves(personal, { held: ['chase-sapphire-preferred'], opened: 1, monthlySpend: 2000 }, opts).moves.some(m => m.offer.name === 'Sapphire Preferred'), 'a held card is not offered again');
});

test('a yearly cost as FI number, and a sum left invested', () => {
  near(P.costAsFiNumber(495, 0.04), 12375);
  assert.equal(P.costAsFiNumber(-20, 0.04), 0);
  near(P.investedLater(750, 35, 0.07), 750 * Math.pow(1.07, 35));
  near(P.investedLater(750, -3, 0.07), 750);
  assert.equal(P.unlocksTransfers(['chase-freedom-flex'], D.unlocksTransfers), false);
});
