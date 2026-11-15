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
  assert.ok(last.moves.length > 0 && last.moves.every(m => m.slotsAfter === 0 && m.then.every(t => t.offer.issuer !== 'Chase')), 'after the last slot, no Chase card is a second move');
  const full = P.nextMoves(personal, { opened: 5, monthlySpend: 2000 }, opts).moves;
  assert.ok(full.length > 0 && full.every(m => m.offer.issuer !== 'Chase'), 'at five cards Chase is out and the other banks are not');
  assert.deepEqual(P.nextMoves(personal.filter(o => o.issuer === 'Chase'), { opened: 5, monthlySpend: 2000 }, opts).moves, []);
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
import { cardPlanOf, cardRowsOf, addHeldCard, cardPeopleOf } from '../js/cardplan.js';
import { yearItems } from '../js/year.js';
const refDoc = read('../data/reference-2026.json');

test('one input, one answer: the Budget, the Credit cards list, the debts and the Profile feed the card plan', () => {
  const now = new Date(2026, 10, 14);
  const st = new Store(newHousehold({ name: 'Loop' }));
  const bare = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(bare.inputs.spend.fromBudget, false); assert.equal(bare.inputs.spend.monthly, null);
  assert.equal(bare.kind, 'open'); assert.match(bare.line, /^If you owe nothing on cards: Sapphire Preferred, worth \$655/, 'an empty plan says what it assumes');
  // the Budget's lines become the spending
  st.add('bill', { name: 'Dining out', amount: 400, per: 'month', values: { category: 'Dining out' } });
  st.add('bill', { name: 'Groceries', amount: 1600, per: 'month', values: { category: 'Groceries' } });
  const fed = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(fed.inputs.spend.fromBudget, true); near(fed.inputs.spend.monthly, 2000); near(fed.inputs.spend.byCat.dining, 4800);
  assert.match(fed.line, /from about 3 months of spending you already do/);
  assert.match(fed.line, /^If you owe nothing on cards/, 'Budget lines alone do not say whether cards are owed on');
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

test('adding a card on the card plan makes the same row Credit cards makes, and a carried balance turns the answer', () => {
  const now = new Date(2026, 10, 14), st = new Store(newHousehold({ name: 'Visitor' }));
  const cfu = lib.cards.find(c => c.id === 'chase-freedom-unlimited');
  addHeldCard(st, cfu, { inFull: true });
  const rows = cardRowsOf(st.doc);
  assert.equal(rows.length, 1); assert.equal(rows[0].type, 'Credit card'); assert.equal(rows[0].name, 'Freedom Unlimited');
  assert.equal(rows[0].values.cardId, cfu.id); assert.equal(rows[0].values.payChoice, 'In full'); assert.equal(rows[0].values.balance, undefined, 'no balance invented');
  assert.ok(rows[0].values.institutionId, 'the issuer became the institution');
  const R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(R.held.length, 1); assert.equal(R.kind, 'open'); assert.ok(!R.moves.some(m => m.offer.cardId === cfu.id));
  addHeldCard(st, lib.cards.find(c => c.id === 'chase-freedom-flex'));
  assert.equal(st.doc.records.filter(r => r.kind === 'institution' || r.type === 'Bank').length <= 1, true, 'the institution is reused');
  st.setDoc('settings', { start: { cardPlan: { carry: true } } });
  const C = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(C.kind, 'debt'); assert.equal(C.inputs.carryTap, true); assert.equal(C.inputs.heavyListed, false);
});

test('the steps: one is next at a time, the count ticks up, and the plan answers what it can', () => {
  const now = new Date(2026, 10, 14), st = new Store(newHousehold({ name: 'Steps' }));
  let R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(R.guide.count, 'Step 1 of 6'); assert.equal(R.guide.next.id, 'cards'); assert.match(R.why, /biggest offer/);
  const row = addHeldCard(st, lib.cards.find(c => c.id === 'chase-freedom-unlimited'), { inFull: true });
  R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(R.guide.count, 'Step 2 of 6'); assert.equal(R.guide.next.id, 'spend');
  st.add('bill', { name: 'Groceries', amount: 900, per: 'month', values: { category: 'Groceries' } }); st.setIn('profile', ['credit', 'score'], 720);
  R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(R.guide.next.id, 'months', 'the Budget and the Profile answered two steps'); assert.equal(R.guide.count, 'Step 4 of 6');
  st.setDoc('settings', { start: { cardPlan: { old: { [row.id ?? row]: true }, seen: { move: true } } } });
  R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(R.guide.next.id, 'plain');
  st.setDoc('settings', { start: { cardPlan: { old: { [row.id ?? row]: true }, seen: { move: true, plain: true } } } });
  R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(R.guide.next, null); assert.equal(R.guide.count, 'All 6 done');
  assert.equal(P.cardSteps({ noCards: true, canOpen: false }).next.id, 'spend');
  assert.match(P.cardPlan({ offers: D.offers, units: D.units, rule: D.rules.chase524, heavyDebt: true, now }).why, /interest/);
});

test('why not the others, what changed, the share your cards give, where an offer could go, and an ended offer', () => {
  const now = new Date(2026, 10, 14), opts2 = { ...opts, now };
  const W = P.whyNot(D.offers, { held: ['chase-freedom-flex'], opened: 0, monthlySpend: 1000, me: { score: 'good', business: false } }, opts2);
  const why = name => W.find(w => w.offer.name === name)?.reason;
  assert.equal(why('Freedom Flex'), 'You already hold it.');
  assert.match(why('Sapphire Reserve'), /excellent credit/); assert.match(why('Southwest Plus'), /have not picked Southwest points/);
  assert.match(why('World of Hyatt'), /free nights/); assert.match(why('Ink Business Cash'), /business/); assert.equal(why('Slate'), 'It has no welcome offer.');
  assert.equal(why('Freedom Unlimited'), undefined, 'a move is not on the why-not list');
  // an offer past its end date drops out of the moves and says so
  const later = new Date(2026, 11, 20), air = { ...opts, programs: ['southwest'] };
  assert.ok(P.nextMoves(D.offers, { monthlySpend: 3000 }, { ...air, now }).moves.some(m => m.offer.name === 'Southwest Plus'));
  assert.ok(!P.nextMoves(D.offers, { monthlySpend: 3000 }, { ...air, now: later }).moves.some(m => m.offer.name === 'Southwest Plus'));
  assert.equal(P.whyNot(D.offers, { monthlySpend: 3000 }, { ...air, now: later }).find(w => w.offer.name === 'Southwest Plus').reason, 'Its offer has ended.');
  assert.equal(P.offerLive({ ends: '2026-12-02' }, new Date(2026, 11, 2)), true); assert.equal(P.offerLive({ ends: '2026-12-02' }, new Date(2026, 11, 3)), false);
  // what changed since the last visit
  assert.deepEqual(P.visitChanges(null, { line: 'A', left: 3 }, D.offers, now), []);
  const C = P.visitChanges({ line: 'Old move.', left: 2, at: '2026-11-20' }, { line: 'New move.', left: 3 }, D.offers, later);
  assert.equal(C.length, 5); assert.match(C[0], /Last time it was: Old move\./); assert.match(C[1], /A slot came back: 3 open now, 2 then/); assert.ok(C.includes('The Southwest Premier offer ended.'));
  assert.deepEqual(P.visitChanges({ line: 'Same.', left: 3, at: '2026-11-13' }, { line: 'Same.', left: 3 }, D.offers, now), []);
  // the share
  const S9 = P.cardsShare(460, 500, { enough: 0.9, cards: 2 });
  near(S9.share, 0.92); assert.equal(S9.enough, true); assert.match(S9.line, /getting 92% of what is there\. That is close enough/);
  assert.equal(P.cardsShare(100, 500, { cards: 1 }).enough, false); assert.equal(P.cardsShare(100, 0), null);
  // where it could go
  const T = P.offerToward(655, { littleE: 1000, iraLimit: 7500, realReturn: 0.07, years: 30, until: 'age 65' });
  assert.match(P.offerToward(655, { realReturn: 0.07 }).invest, /Add your birth year/);
  assert.equal(T.cushion, '$655 is 66% of a $1,000 first cushion.'); assert.match(T.roth, /9% of this year's \$7,500 Roth IRA limit/); assert.match(T.invest, /left until age 65, 30 years from now, is about \$4,986/);
  assert.deepEqual(P.offerToward(0, { littleE: 1000 }), {});
});

test('two people, each with their own five; the fee lands on the year view; the share reads the plan', () => {
  const now = new Date(2026, 10, 14), st = new Store(newHousehold({ name: 'Two' }));
  assert.deepEqual(cardPeopleOf(st.doc), ['Me']);
  for (const mth of ['2025-01', '2025-04', '2025-08', '2026-02', '2026-06']) st.add('debt', { type: 'Credit card', name: `Mine ${mth}`, values: { payChoice: 'In full', opened: mth } });
  addHeldCard(st, lib.cards.find(c => c.id === 'chase-sapphire-preferred'), { inFull: true, owner: 'Partner' });
  assert.deepEqual(cardPeopleOf(st.doc), ['Me', 'Partner']);
  const me = cardPlanOf(st.doc, refDoc, lib, D, { now }), partner = cardPlanOf(st.doc, refDoc, lib, D, { now, person: 'Partner' });
  assert.equal(me.who, 'Me'); assert.equal(me.slots.left, 0); assert.equal(me.kind, 'open'); assert.ok(me.moves.every(mv => mv.offer.issuer !== 'Chase'), 'at five, the answer is a card at another bank');
  assert.equal(P.cardPlan({ offers: D.offers.filter(o => o.issuer === 'Chase'), units: D.units, rule: D.rules.chase524, unlockIds: D.unlocksTransfers, openedMonths: ['2025-01', '2025-04', '2025-08', '2026-02', '2026-06'], now }).kind, 'wait');
  assert.equal(partner.slots.left, 5); assert.equal(partner.kind, 'open'); assert.equal(partner.held.length, 1);
  assert.ok(!partner.moves.some(mv => mv.offer.cardId === 'chase-sapphire-preferred') && partner.unpicked.length === 0 && me.unpicked.length === 5);
  // the partner's own taps live beside the first person's
  st.setDoc('settings', { start: { cardPlan: { score: 'excellent', by: { Partner: { score: 'fair' } }, who: 'Partner' } } });
  assert.equal(cardPlanOf(st.doc, refDoc, lib, D, { now }).who, 'Partner'); assert.equal(cardPlanOf(st.doc, refDoc, lib, D, { now }).inputs.score.band, 'fair');
  assert.equal(cardPlanOf(st.doc, refDoc, lib, D, { now, person: 'Me' }).inputs.score.band, 'excellent');
  // a card added here with a fee and an opening month shows on the year view in that month
  const solo = new Store(newHousehold({ name: 'Year' })), row = addHeldCard(solo, lib.cards.find(c => c.id === 'chase-sapphire-preferred'), { inFull: true });
  solo.update(row.id ?? row, { opened: '2026-03' });
  const fee = yearItems(solo.doc.records, now).all.find(i => i.source === 'Card fee');
  assert.equal(fee.cost, 95); assert.equal(fee.ym, '2027-03');
  // the share: one held card against the best one card on the same spending
  solo.add('bill', { name: 'Groceries', amount: 800, per: 'month', values: { category: 'Groceries' } }); solo.add('bill', { name: 'Dining out', amount: 400, per: 'month', values: { category: 'Dining out' } });
  const R = cardPlanOf(solo.doc, refDoc, lib, D, { now }), sh = R.share();
  assert.ok(sh.share > 0 && sh.share <= 1); assert.match(sh.line, /^Your card gives about \$/);
  assert.equal(R.toward(655).cushion, '$655 is 66% of a $1,000 first cushion.');
  assert.ok(R.whyNot().some(w => w.reason === 'You already hold it.'));
});

test('what the think-aloud walk caught: debt is the only step, a costly card is not shown as zero, and the switch is to the same family', () => {
  const now = new Date(2026, 10, 14), st = new Store(newHousehold({ name: 'Walk' }));
  addHeldCard(st, lib.cards.find(c => c.id === 'chase-sapphire-reserve'), { inFull: true });
  let R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.doesNotMatch(R.line, /^If you owe nothing/, 'a card paid in full answers the debt question');
  assert.match(R.held[0].year.option, /switch it to Freedom (Unlimited|Flex)/, 'the no-fee card in the same points family, never a store or park card');
  assert.match(R.share().line, /^On your spending your card costs about \$\d+ a year more than it gives back\. The best one card would give \$\d+\.$/);
  st.setDoc('settings', { start: { cardPlan: { carry: true } } });
  R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(R.guide.next.id, 'debt'); assert.equal(R.guide.total, 1); assert.equal(R.guide.line, 'See when you are debt free');
  const amex = new Store(newHousehold({ name: 'Other bank' })); addHeldCard(amex, lib.cards.find(c => c.id === 'amex-gold'), { inFull: true });
  assert.match(cardPlanOf(amex.doc, refDoc, lib, D, { now }).held[0].year.option ?? 'no-fee version', /no-fee version/);
});

test('the other banks: cash-like points are never held back, the slot rule is Chase only, and an offer says when it may be lower', () => {
  const now = new Date(2026, 10, 14), o2 = { ...opts, now };
  assert.equal(D.offers.filter(o => o.cardId).length, lib.cards.length, 'every library card has an offer record');
  for (const u of ['mr', 'c1', 'ty', 'wf', 'bofa', 'ur']) assert.equal(P.isProgram({ bonus: { unit: u } }, D.units), false, `${u} can be taken as cash`);
  for (const u of ['delta', 'aa', 'hilton', 'united']) assert.equal(P.isProgram({ bonus: { unit: u } }, D.units), true);
  near(P.offerValue(by('Platinum Card'), o2), 1050); near(P.firstYearNet(by('Platinum Card'), o2), 155);
  near(P.firstYearNet(by('Blue Cash Preferred'), o2), 300, 1e-6); near(P.firstYearNet(by('United Explorer'), o2), 700, 1e-6);
  const plat = P.cardFit(by('Platinum Card'), { opened: 5, score: 'excellent' }, o2);
  assert.equal(plat.level, 'fits'); assert.match(plat.reasons.join(' '), /Chase's limit does not apply at this bank/); assert.match(plat.reasons.join(' '), /can be lower/);
  assert.match(P.cardFit(by('Venture'), { opened: 2 }, o2).reasons.join(' '), /uses one of your 3 Chase slots/);
  assert.equal(P.cardFit(by('Premium Rewards'), {}, o2).level, 'maybe');
  const W = P.whyNot(D.offers, { monthlySpend: 3000, me: { score: 'excellent' } }, o2), why = n => W.find(w => w.offer.name === n)?.reason;
  assert.match(why('Green Card'), /no longer takes new applications/); assert.match(why('Discover it Miles'), /match/); assert.match(why('World of Hyatt'), /free nights/);
  assert.match(why('Delta SkyMiles Gold'), /have not picked Delta SkyMiles/);
  assert.equal(P.opensAndUses(null, by('Venture'), { rule: D.rules.chase524 }).uses[0], 'One of your 5 Chase slots, as every new card does');
  for (const r of D.rules.again) for (const id of r.cards) assert.ok(lib.cards.some(c => c.id === id), id);
});

test('a carried balance gets a rate: the plan assigns its typical card rate until the real one is in', () => {
  const now = new Date(2026, 10, 14), st = new Store(newHousehold({ name: 'Rate' }));
  const row = addHeldCard(st, lib.cards.find(c => c.id === 'citi-double-cash'));
  st.setDoc('settings', { start: { cardPlan: { carry: true } } });
  let R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(R.kind, 'debt'); assert.equal(R.inputs.heavyListed, false); near(R.typicalApr, 0.25);
  st.update(row.id ?? row, { balance: 2500 }); st.setDoc('settings', { start: { cardPlan: {} } });
  R = cardPlanOf(st.doc, refDoc, lib, D, { now });
  assert.equal(R.inputs.heavyListed, true, 'a balance with no rate takes the typical 25%, which is heavy'); assert.equal(R.kind, 'debt');
  st.update(row.id ?? row, { apr: 0.05 });
  assert.equal(cardPlanOf(st.doc, refDoc, lib, D, { now }).kind, 'open', 'a real rate under 8% is not heavy');
  // until retirement: the plan's age and target age
  assert.match(R.toward(655).invest, /Add your birth year/);
  assert.equal(R.again('capone-venture'), 'One welcome offer in the Venture family every 48 months.'); assert.equal(R.again('chase-freedom-flex'), null);
});
