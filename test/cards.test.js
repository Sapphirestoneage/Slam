// SPDX-License-Identifier: AGPL-3.0-only
// Batch 30: the card library (data/library/cards.json) is whole and well formed, a few letters find a card, what a card
// earns on the Budget, whether a card with a fee gives back more than the fee (M9C) at the client's materiality, the
// doubled-up benefit notes, and what would move the credit score most (M9D).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchCards, cardById, issuerName, categorySpend, cardRewards, feeCheck, doubledUp, cardsPicture, creditMove } from '../js/math/cards.js';
import { RULES } from '../js/registry/assumptions.js';
import { setCardLibrary, libraryCardOf } from '../js/cardlib.js';

const lib = JSON.parse(readFileSync(new URL('../data/library/cards.json', import.meta.url), 'utf8'));
const cards = lib.cards;
setCardLibrary(lib);

test('the library: 40 to 70 current cards from the big issuers, each with the fields the screen reads', () => {
  assert.ok(cards.length >= 40 && cards.length <= 70, `${cards.length} cards`);
  assert.equal(lib.counts.cards, cards.length);
  assert.equal(new Set(cards.map(c => c.id)).size, cards.length, 'ids are unique');
  for (const want of ['Chase', 'American Express', 'Capital One', 'Citi', 'Discover (Capital One)', 'Bank of America', 'Wells Fargo', 'US Bank']) assert.ok(cards.some(c => c.issuer === want), want);
  assert.ok(cards.some(c => c.name === 'Apple Card'), 'Apple Card');
  assert.ok(cards.filter(c => c.secured).length >= 5, 'secured cards');
  assert.ok(cards.filter(c => c.store).length >= 4, 'store cards');
  for (const c of cards) {
    assert.ok(c.issuer && c.name && c.network, `${c.id}: issuer, name, network`);
    assert.equal(typeof c.annualFee, 'number', `${c.id}: annual fee`);
    if (c.apr) assert.ok(c.apr.length === 2 && c.apr[0] <= c.apr[1] && c.apr[0] > 5 && c.apr[1] < 40, `${c.id}: APR range`);
    else assert.ok(c.aprNote, `${c.id}: no APR range says why`);
    assert.ok(['Cash back', 'Points', 'Miles', 'None'].includes(c.rewards.kind), `${c.id}: rewards kind`);
    assert.ok(c.rewards.words && c.rewards.pointValue > 0 && c.rewards.pointValue < 0.03 && typeof c.rewards.base === 'number', `${c.id}: rewards words, point value, base`);
    for (const r of c.rewards.rates) {
      assert.ok(lib.categories[r.cat], `${c.id}: category ${r.cat}`);
      for (const o of r.oneOf || []) assert.ok(lib.categories[o], `${c.id}: pick category ${o}`);
      assert.ok(r.x > 0 && r.x <= 20, `${c.id}: rate ${r.x}`);
    }
    for (const x of c.credits) assert.ok(x.id && x.name && typeof x.value === 'number' && x.words, `${c.id}: credit ${x.id}`);
    for (const [k, v] of Object.entries(c.benefits)) { assert.ok(lib.benefitKinds[k], `${c.id}: benefit ${k}`); assert.ok(typeof v === 'string' || v.words, `${c.id}: benefit words`); }
    assert.ok(c.foreignFee === null || (c.foreignFee >= 0 && c.foreignFee <= 0.03), `${c.id}: foreign fee`);
    assert.equal(typeof c.secured, 'boolean');
    assert.ok(/^https:\/\//.test(c.source), `${c.id}: source link`);
    assert.equal(c.checked, lib.asOf, `${c.id}: checked date`);
    assert.ok(['issuer', 'secondary', 'unverified'].includes(c.verified), `${c.id}: how it was checked`);
    if (c.verified !== 'issuer') assert.ok(c.verified === 'secondary' || c.unverified.length, `${c.id}: says what to check`);
  }
  assert.ok(cards.filter(c => c.verified === 'issuer').length >= cards.length / 2, 'most cards checked on the issuer page');
  for (const cat of Object.values(lib.categories)) assert.ok(cat.label && Array.isArray(cat.lines));
});

test('a few letters find the card: issuer and name, word starts, initials', () => {
  assert.deepEqual(searchCards(cards, 'sapph').map(c => c.id).sort(), ['chase-sapphire-preferred', 'chase-sapphire-reserve']);
  assert.equal(searchCards(cards, 'sapph pref')[0].id, 'chase-sapphire-preferred');
  assert.equal(searchCards(cards, 'active')[0].id, 'wf-active-cash');
  assert.equal(searchCards(cards, 'amex gold').length, 0, 'amex is not a word of American Express');
  assert.equal(searchCards(cards, 'american gold')[0].id, 'amex-gold');
  assert.ok(searchCards(cards, 'csp').some(c => c.id === 'chase-sapphire-preferred'), 'initials');
  assert.ok(searchCards(cards, 'target').some(c => c.id === 'td-target-circle'), 'a store name');
  assert.deepEqual(searchCards(cards, '  '), []);
  assert.ok(searchCards(cards, 'c', { limit: 5 }).length <= 5);
  assert.equal(cardById(cards, 'apple-card').name, 'Apple Card');
  assert.equal(issuerName(cardById(cards, 'discover-it-cash-back')), 'Discover');
  assert.equal(libraryCardOf({ values: { cardId: 'wf-active-cash' } }).name, 'Active Cash');
});

// Made-up Budget lines: dining $300, groceries $600 a month, gas $150, streaming $40, a $12 phone insurance line.
const lines = [{ id: 'a', category: 'Dining out', amount: 300, per: 'month' }, { id: 'b', category: 'Groceries', amount: 600, per: 'month' },
  { id: 'c', category: 'Gas or charging', amount: 150, per: 'month' }, { id: 'd', category: 'Streaming', amount: 40, per: 'month' },
  { id: 'e', name: 'Phone insurance', category: 'Phone', amount: 12, per: 'month' }, { id: 'f', category: 'Travel', amount: null, per: 'month' }];
const spend = categorySpend(lines, lib.categories);

test('the Budget spending by reward category, a year', () => {
  assert.deepEqual(spend, { dining: 3600, groceries: 7200, gas: 1800, streaming: 480, phone: 144 });
});

test('rewards: category rates, caps and the base rate, by hand', () => {
  // Blue Cash Preferred: 6% groceries up to $6,000 (360) then 1% (12), 6% streaming (28.80), 3% gas (54), dining and phone at 1% (37.44).
  const bcp = cardRewards(cardById(cards, 'amex-blue-cash-preferred'), spend);
  assert.equal(Math.round(bcp.value * 100) / 100, 360 + 12 + 28.8 + 54 + 37.44);
  assert.equal(bcp.spend, 13224);
  assert.equal(bcp.plain, 13224 * RULES.plainCardRate);
  // Active Cash: 2% on all of it.
  assert.equal(cardRewards(cardById(cards, 'wf-active-cash'), spend).value, 13224 * 0.02);
  // Custom Cash: 5% on the biggest category (groceries, capped at $6,000), the rest at 1%.
  const cc = cardRewards(cardById(cards, 'citi-custom-cash'), spend);
  assert.equal(Math.round(cc.value * 100) / 100, 300 + (13224 - 6000) * 0.01);
  // Chrome: gas and dining share one $4,000 cap at 2%.
  const chrome = cardRewards(cardById(cards, 'discover-it-chrome'), spend);
  assert.equal(Math.round(chrome.value * 100) / 100, 4000 * 0.02 + (13224 - 4000) * 0.01);
  assert.equal(cardRewards(cardById(cards, 'capone-platinum'), spend).value, 0);
  assert.equal(cardRewards(cardById(cards, 'wf-active-cash'), {}).value, 0, 'no lines, nothing counted');
});

test('M9C: is the card worth its fee, with the client\'s materiality', () => {
  const csp = cardById(cards, 'chase-sapphire-preferred');
  // CSP on this spending: 3x dining 108, 3x gas 54, 3x streaming 14.40, groceries and phone at 1x 73.44 = 249.84.
  const base = feeCheck(csp, { spend, rate: { value: 30 } });
  assert.equal(Math.round(base.rewards.value * 100) / 100, 249.84);
  assert.equal(Math.round(base.value), Math.round(249.84 - 95));
  assert.equal(base.material, 100, '2 hours at $30 is $60, under the $100 floor');
  assert.match(base.line, /^Worth about \$155 a year more than its \$95 fee\.$/);
  assert.equal(base.asked, 2, 'two credits with a dollar value not tapped yet');
  // The hotel credit used: $100 more.
  assert.match(feeCheck(csp, { spend, uses: { hotel: 'Use' }, rate: { value: 30 } }).line, /^Worth about \$255/);
  // A typed fee overrides the library's.
  assert.equal(feeCheck(csp, { spend, fee: 0 }).noFee, true);
  // Rewards tapped Don't (the spending goes on another card): -$95, under the $100 floor: about even.
  const off = feeCheck(csp, { spend, uses: { rewards: 'Dont' }, rate: { value: 30 } });
  assert.equal(off.value, -95);
  assert.equal(off.small, true);
  assert.match(off.line, /^About even with its \$95 fee/);
  // A higher materiality bar (8 hours at $30 = $240) makes $155 a small win too.
  assert.equal(feeCheck(csp, { spend, rate: { value: 30 }, assumptions: { materialHours: 8 } }).small, true);
  // Reserve with no credits used: well under its fee, said calmly.
  const csr = feeCheck(cardById(cards, 'chase-sapphire-reserve'), { spend, rate: { value: 30 } });
  assert.match(csr.line, /^Gives back about \$\d[\d,]* a year less than its \$795 fee\.$/);
  assert.ok(!/bad|poor|waste|not worth|strong|risk/i.test(csr.line + csr.text), 'no verdict words');
  assert.ok(csr.plainLine, 'says what a no-fee 2% card would earn');
  assert.equal(feeCheck(cardById(cards, 'wf-active-cash'), { spend }).noFee, true);
  assert.deepEqual(feeCheck(null).needs, ['the card, picked from the library']);
});

test('M9C part: a card benefit a paid line may be doubling up', () => {
  const held = [{ id: 'r1', card: cardById(cards, 'wf-active-cash'), label: 'Wells Fargo Active Cash' }];
  const d = doubledUp(held, lines);
  assert.equal(d.length, 1);
  assert.equal(d[0].kind, 'cellPhone');
  assert.equal(d[0].text, 'Your Wells Fargo Active Cash already covers phone damage and theft; the $12 a month phone insurance may be doubling up.');
  assert.deepEqual(doubledUp([{ id: 'r2', card: cardById(cards, 'capone-quicksilver'), label: 'Quicksilver' }], lines), [], 'no cell phone protection, no note');
  assert.equal(doubledUp(held, [{ name: 'Renters insurance', category: 'Renters or home insurance', amount: 15 }]).length, 0, 'renters is not rental');
  const venturex = [{ id: 'r3', card: cardById(cards, 'capone-venture-x'), label: 'Capital One Venture X' }];
  assert.equal(doubledUp(venturex, [{ name: 'SquareTrade protection plan', amount: 60, per: 'year' }])[0].text, 'Your Capital One Venture X already covers longer warranties on things you buy; the $5 a month squaretrade protection plan may be doubling up.');
  assert.equal(doubledUp(venturex, [{ name: 'Home warranty', amount: 50 }]).length, 0, 'a home warranty is something else');
  // The whole picture from the rows, as the screen reads it.
  const P = cardsPicture({ cardRows: [{ id: 'r1', values: { cardId: 'wf-active-cash' } }, { id: 'r9', values: {} }], lines, coverage: [], library: lib, rate: { value: 30 } });
  assert.equal(P.held.length, 1);
  assert.equal(P.doubled.length, 1);
  assert.equal(cardsPicture({ library: null }), null);
});

test('M9D: what would move the score most, in FICO\'s order', () => {
  const c = [{ balance: 4200, limit: 6000 }];
  assert.equal(creditMove({ latePayments: true, overall: 0.7, cards: c }).key, 'onTime');
  assert.equal(creditMove({ autopayOff: 1, cards: c }).key, 'onTime');
  const u = creditMove({ score: 640, overall: 0.7, cards: c, latePayments: false });
  assert.equal(u.key, 'util');
  assert.match(u.text, /about \$2,400, to under 30%/);
  assert.match(creditMove({ overall: 0.2, cards: [{ balance: 1200, limit: 6000 }] }).text, /about \$600 more off/);
  assert.equal(creditMove({ overall: 0.05, cards: c, inquiries: 3 }).key, 'inquiries');
  assert.equal(creditMove({ overall: 0.05, cards: c, inquiries: 0, oldestMonths: 10 }).key, 'time');
  assert.equal(creditMove({}).key, 'start');
  assert.equal(creditMove({ score: 790, overall: 0.04, inquiries: 0, oldestMonths: 120 }).key, 'keep');
});
