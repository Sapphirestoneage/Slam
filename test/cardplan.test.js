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
  assert.ok(R.moves.length >= 4 && R.moves.every(m => !P.isProgram(m.offer, D.units)), 'no airline or hotel card until a program is tapped');
  const air = P.nextMoves(personal, { opened: 0, monthlySpend: 3000 }, { ...opts, programs: ['southwest'] });
  const sw = air.moves.filter(m => m.offer.bonus.unit === 'southwest');
  assert.ok(sw.length >= 2 && sw.every(m => m.then.every(t => t.offer.bonus.unit !== 'southwest')), 'one card per program in a path');
  assert.ok(air.moves.every(m => m.offer.bonus.unit !== 'united'));
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

test('exact slots from the months cards were opened, and the month the next slot frees', () => {
  const now = new Date(2026, 10, 14), rule = D.rules.chase524;
  const S = P.slotsFromDates(['2024-10', '2024-12', '2025-06', '2026-01'], now, rule);
  assert.equal(S.used, 3, 'Oct 2024 is past 24 months');
  assert.equal(S.left, 2); assert.equal(S.frees, 'Dec 2026'); assert.equal(S.freesIn, 1);
  const full = P.slotsFromDates(['2025-01', '2025-03', '2025-06', '2025-09', '2026-01', '2026-05'], now, rule);
  assert.equal(full.left, 0); assert.equal(full.frees, 'Mar 2027', 'two must pass to get under five');
  assert.deepEqual(P.slotsFromDates([], now, rule), { used: 0, left: 5, frees: null, freesIn: null });
  assert.equal(P.monthWords(2026 * 12), 'Jan 2026');
});

test('dates to know: the offer deadline, the next fee, the slot coming back, soonest first', () => {
  const now = new Date(2026, 10, 14);
  const L = P.cardDates([{ name: 'Sapphire Preferred', opened: '2026-09', fee: 95, offerMonths: 3 }, { name: 'Freedom Flex', opened: '2024-12', fee: 0 }], now, D.rules.chase524);
  assert.deepEqual(L.map(x => [x.kind, x.when]), [['offer', 'Dec 2026'], ['slot', 'Dec 2026'], ['fee', 'Sep 2027'], ['slot', 'Sep 2028']]);
  assert.deepEqual(P.cardDates([{ name: 'No month', fee: 95 }], now), []);
});

test('a year with a card: free, even, earns, or costs with a way out', () => {
  assert.equal(P.yearCheck({ fee: 0 }).kind, 'free');
  assert.equal(P.yearCheck({ fee: 95, back: 100 }).kind, 'even');
  assert.equal(P.yearCheck({ fee: 95, back: 400 }).kind, 'earns');
  const c = P.yearCheck({ fee: 795, back: 300, noFeeSibling: 'Freedom Unlimited' });
  assert.equal(c.kind, 'costs'); near(c.net, -495); assert.match(c.option, /Freedom Unlimited/);
  assert.match(P.yearCheck({ fee: 795, back: 300 }).option, /no-fee version/);
});

test('the best one, two and three card setups against a plain card, with a pick-one rate counted once', () => {
  const mk = (id, base, rates = [], fee = 0) => ({ card: { id, rewards: { pointValue: 0.01, base, rates } }, name: id, fee });
  const spend = { dining: 4000, groceries: 6000, other: 12000 };
  const flat = mk('Flat', 1.5), diner = mk('Diner', 1, [{ cat: 'dining', x: 3 }]), grocer = mk('Grocer', 1, [{ cat: 'groceries', x: 6 }], 95);
  const R = P.bestSetups([flat, diner, grocer], spend, 440);
  const of = n => R.find(r => r.size === n);
  assert.deepEqual(of(1).cards.map(c => c.name), ['Grocer']); near(of(1).value, 40 + 360 + 120 - 95);
  assert.deepEqual(of(2).cards.map(c => c.name).sort(), ['Flat', 'Grocer']); near(of(2).value, 60 + 360 + 180 - 95); near(of(2).gain, 505 - 440);
  near(of(3).value, 120 + 360 + 180 - 95);
  assert.deepEqual(of(3).use, { dining: 'Diner', groceries: 'Grocer', other: 'Flat' });
  // a card that pays 5x on only its biggest category must not earn 5x on all three
  const one = mk('PickOne', 1, [{ oneOf: ['dining', 'groceries', 'other'], x: 5 }]);
  near(P.bestSetups([one], spend, 0)[0].value, 12000 * 0.05 + 10000 * 0.01);
  const pair = P.bestSetups([one, flat], spend, 0).find(r => r.size === 2);
  near(pair.value, 12000 * 0.05 + 10000 * 0.015); assert.equal(pair.use.other, 'PickOne');
  assert.deepEqual(P.bestSetups([], spend, 100), []);
  const real = P.bestSetups(lib.cards.filter(c => c.rewards && !c.secured).map(c => ({ card: c, name: c.name, fee: c.annualFee ?? 0 })), { dining: 3600, groceries: 6000, gas: 1800, other: 12000 }, 23400 * 0.02);
  assert.equal(real.length, 3); assert.ok(real[2].value >= real[1].value - 1e-6 && real[1].value >= real[0].value - 1e-6, 'more cards never pay less');
});

test('what a card opens and uses, and credits counted per card', () => {
  const csr = lib.cards.find(c => c.id === 'chase-sapphire-reserve'), cfu = lib.cards.find(c => c.id === 'chase-freedom-unlimited');
  const R = P.opensAndUses(csr, by('Sapphire Reserve'), { unlockIds: D.unlocksTransfers, benefitKinds: lib.benefitKinds, rule: D.rules.chase524 });
  assert.ok(R.opens.includes('Moving points to airlines and hotels') && R.opens.includes('No fee on purchases abroad'));
  assert.deepEqual(R.uses, ['One slot of the 5', '$795 a year']);
  const F = P.opensAndUses(cfu, by('Freedom Unlimited'), { unlockIds: D.unlocksTransfers, benefitKinds: lib.benefitKinds, rule: D.rules.chase524 });
  assert.ok(F.opens.includes('A no-fee card to keep open for good') && !F.opens.includes('Moving points to airlines and hotels'));
  assert.match(P.opensAndUses(null, by('Ink Business Cash'), { rule: D.rules.chase524 }).uses[0], /No slot/);
  near(P.firstYearNet(by('Sapphire Reserve'), { ...opts, creditsUsedOf: id => (id === 'chase-sapphire-reserve' ? 300 : 0) }), 505);
});

// ---- The loop: the card plan read from the household plan (js/cardplan.js) ----
import { Store, newHousehold } from '../js/records.js';
import { cardPlanOf, cardRowsOf } from '../js/cardplan.js';
const refDoc = read('../data/reference-2026.json');

test('one input, one answer: the Budget, the Credit cards list, the debts and the Profile feed the card plan', () => {
  const now = new Date(2026, 10, 14);
  const st = new Store(newHousehold({ name: 'Loop' }));
  const bare = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(bare.inputs.spend.fromBudget, false); assert.equal(bare.inputs.spend.monthly, null);
  assert.equal(bare.kind, 'open'); assert.match(bare.line, /^Sapphire Preferred, worth \$655/);
  // the Budget's lines become the spending
  st.add('bill', { name: 'Dining out', amount: 400, per: 'month', values: { category: 'Dining out' } });
  st.add('bill', { name: 'Groceries', amount: 1600, per: 'month', values: { category: 'Groceries' } });
  const fed = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(fed.inputs.spend.fromBudget, true); near(fed.inputs.spend.monthly, 2000); near(fed.inputs.spend.byCat.dining, 4800);
  assert.match(fed.line, /from about 3 months of spending you already do/);
  // a card on the Credit cards list is held: it leaves the moves, uses a slot, and gets its yearly check from the row's own taps
  const row = st.add('debt', { type: 'Credit card', name: 'Reserve', values: { balance: 0, apr: 0.24, payChoice: 'In full', cardId: 'chase-sapphire-reserve', opened: '2026-09', cardUse: { travel: 'Use' } } });
  const withCard = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(cardRowsOf(st.doc).length, 1); assert.equal(withCard.slots.used, 1);
  assert.ok(!withCard.moves.some(mv => mv.offer.cardId === 'chase-sapphire-reserve'));
  assert.equal(withCard.held.length, 1); assert.equal(withCard.held[0].opened, '2026-09');
  near(withCard.creditsUsedOf('chase-sapphire-reserve'), lib.cards.find(c => c.id === 'chase-sapphire-reserve').credits.find(c => c.id === 'travel').value);
  assert.ok(withCard.dates.some(d => d.kind === 'offer' && d.when === 'Dec 2026'));
  // the same row edit changes the same answer everywhere
  st.update(row.id ?? row, { cardUse: {} });
  assert.equal(cardPlanOf(st.doc, refDoc, lib, D, { now }).creditsUsedOf('chase-sapphire-reserve'), 0);
  // the Profile's score outranks a tap; heavy debt on the debts list turns the answer
  st.setIn('profile', ['credit', 'score'], 700);
  st.setDoc('settings', { start: { cardPlan: { score: 'excellent', programs: ['southwest'], tv: 0.015 } } });
  const scored = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(scored.inputs.score.band, 'good'); assert.equal(scored.inputs.score.fromProfile, true);
  assert.ok(scored.moves.some(mv => mv.offer.bonus.unit === 'southwest'), 'a tapped program brings its cards in');
  st.add('debt', { type: 'Credit card', name: 'Old card', values: { balance: 4200, apr: 0.27, payment: 120 } });
  const inDebt = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(inDebt.kind, 'debt'); assert.equal(inDebt.moves.length, 0); assert.equal(inDebt.unpicked.length, 1);
  const S3 = withCard.setups(); assert.equal(S3.list.length, 3); assert.equal(withCard.setups(), S3, 'worked out once');
  assert.equal(P.scoreBand(null, D.scoreBands), null); assert.equal(P.scoreBand(760, D.scoreBands), 'excellent'); assert.equal(P.scoreBand(640, D.scoreBands), 'fair');
});
