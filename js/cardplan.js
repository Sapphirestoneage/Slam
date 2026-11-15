// SPDX-License-Identifier: AGPL-3.0-only
// The card plan read from the household plan: one set of inputs, one answer. Spending comes from the Budget's lines,
// the cards held (with their Use it taps and the month each was opened) from the Credit cards list, heavy debt from the
// debts, the score from the Profile, the growth and withdrawal rates from the plan's own settings. Only what the plan
// has no place for (programs you would use, what a point is worth, cards opened that are not on the list) is kept with
// the journey's choices (settings.start.cardPlan). cards.html and Net worth > Credit cards both call cardPlanOf, so
// they can never disagree. The math is js/math/cardplan.js and js/math/cards.js.
import { metrics } from './math/metrics.js';
import { categorySpend, feeCheck, issuerName } from './math/cards.js';
import { materialityOf } from './math/time.js';
import { RULES } from './registry/assumptions.js';
import * as P from './math/cardplan.js';
import { institutionsOf, addInstitution } from './institutions.js';

const month = v => (v ? String(v).slice(0, 7) : null);
export const cardRowsOf = doc => (doc?.records || []).filter(r => r.kind === 'debt' && r.type === 'Credit card' && r.status !== 'Not for me');

export function cardPlanOf(doc, ref, lib, off, { now = new Date() } = {}) {
  const m = metrics(doc, ref, { now }), x = m.inputs, mine = doc.settings?.start?.cardPlan || {};
  const rows = cardRowsOf(doc), cardOf = id => lib.cards.find(c => c.id === id) ?? null;
  const heldRows = rows.filter(r => cardOf(r.values?.cardId)), unpicked = rows.filter(r => !cardOf(r.values?.cardId));
  // spending: the Budget's lines by reward category; stand-in amounts only while the Budget has none
  const fromBudget = categorySpend(x.lines || [], lib.categories, x.payFrequency), hasBudget = Object.keys(fromBudget).length > 0;
  const typical = Object.fromEntries(Object.entries(off.typicalSpend.monthly).map(([k, v]) => [k, v * 12]));
  const byCat = hasBudget ? fromBudget : typical;
  const monthly = hasBudget ? Object.values(fromBudget).reduce((a, b) => a + b, 0) / 12 : mine.spend ?? null;
  const number = doc.profile?.credit?.score ?? null, band = P.scoreBand(number, off.scoreBands) ?? mine.score ?? null;
  // heavy debt: the debts list decides; a card someone says they carry a balance on counts until its balance is on the list
  const heavyListed = (x.debts || []).some(d => !d.inFull && (d.balance ?? 0) > 0 && d.apr != null && d.apr >= RULES.heavyApr), heavy = heavyListed || mine.carry === true;
  const useOf = id => heldRows.find(r => r.values.cardId === id)?.values.cardUse ?? mine.uses?.[id] ?? {};
  const creditsUsedOf = id => (cardOf(id)?.credits || []).reduce((t, c) => t + (useOf(id)[c.id] === 'Use' ? c.value ?? 0 : 0), 0);
  const openedMonths = [...rows.map(r => month(r.values?.opened)), ...(mine.opened || [])].filter(Boolean);
  const plan = P.cardPlan({ offers: off.offers, units: off.units, rule: off.rules.chase524, unlockIds: off.unlocksTransfers, held: heldRows.map(r => r.values.cardId), openedMonths,
    score: band, monthlySpend: monthly, heavyDebt: heavy, business: mine.business === true, programs: mine.programs || [], transferValue: mine.tv ?? null, creditsUsedOf, now });
  const small = materialityOf(m.hourly ?? null, doc.assumptions || {}).value;
  const held = heldRows.map(r => {
    const card = cardOf(r.values.cardId), check = feeCheck(card, { fee: r.values.annualFee, uses: r.values.cardUse || {}, spend: byCat, rate: m.hourly ?? null, assumptions: doc.assumptions || {} });
    const sib = lib.cards.find(o => o.issuer === card.issuer && !(o.annualFee > 0) && o.id !== card.id && o.rewards?.kind === card.rewards?.kind);
    return { row: r, card, label: `${issuerName(card)} ${card.name}`, opened: month(r.values.opened), check, year: P.yearCheck({ fee: check.fee ?? 0, back: check.back ?? 0, small, noFeeSibling: sib?.name ?? null }) };
  });
  const dates = P.cardDates(held.map(hd => ({ name: hd.card.name, opened: hd.opened, fee: hd.check.fee ?? 0, offerMonths: (o => (o?.spend ? o.months : null))(off.offers.find(f => f.cardId === hd.card.id)) })), now, off.rules.chase524);
  let setups = null;
  return { ...plan, held, unpicked, dates, small, creditsUsedOf, useOf,
    rr: x.realReturn ?? ref.presets.realReturn.default, wr: x.withdrawalRate ?? ref.presets.withdrawalRate.default,
    inputs: { spend: { byCat, monthly, fromBudget: hasBudget }, heavyListed, carryTap: mine.carry === true, score: { band, number, fromProfile: number != null }, heavy, business: mine.business ?? null, programs: mine.programs || [], tv: mine.tv ?? null, openedOther: mine.opened || [], spendTap: mine.spend ?? null },
    // the best 1, 2 and 3 cards against one plain card on this spending (worked out once, on first ask)
    setups: () => {
      if (!setups) {
        const total = Object.values(byCat).reduce((a, b) => a + b, 0), flat = total * RULES.plainCardRate;
        const per = lib.cards.filter(c => c.rewards && !c.secured && !c.store).map(c => ({ card: c, name: `${issuerName(c)} ${c.name}`, fee: (c.annualFee ?? 0) - creditsUsedOf(c.id) }));
        setups = { flat, list: P.bestSetups(per, byCat, flat) };
      }
      return setups;
    } };
}

// A card someone holds, added from the card plan: the same row Net worth > Credit cards makes when a card is picked
// (the library card, its fee and rewards kind, the issuer as the institution). "I pay it in full" is recorded on the
// row; a balance is never invented.
const KIND = { 'Cash back': 'Cash back', Points: 'Points', Miles: 'Miles', None: 'None' };
export function addHeldCard(store, card, { inFull = false } = {}) {
  let row = null;
  store.transaction(`Card: ${card.name}`, () => {
    const issuer = issuerName(card);
    const inst = issuer ? institutionsOf(store.doc).find(i => i.name.toLowerCase() === issuer.toLowerCase()) ?? addInstitution(store, { name: issuer, kind: 'Bank' }) : null;
    row = store.add('debt', { name: card.name, values: { cardId: card.id, annualFee: card.annualFee ?? 0, rewards: KIND[card.rewards?.kind] ?? null, ...(inst ? { institutionId: inst.id } : {}), ...(inFull ? { payChoice: 'In full' } : {}) } }, { type: 'Credit card' });
  });
  return row;
}
