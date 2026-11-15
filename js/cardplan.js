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

// Two people: each has their own five slots. A plan with a Partner on any row can show either person's card plan; a
// Joint card counts for the first person. The debts, the Budget and what a point is worth are the household's.
export const cardPeopleOf = doc => ((doc?.records || []).some(r => r.owner === 'Partner') ? ['Me', 'Partner'] : ['Me']);
let MEMO = { key: null, val: null };

export function cardPlanOf(doc, ref, lib, off, { now = new Date(), person = null } = {}) {
  const m = metrics(doc, ref, { now }), x = m.inputs, all = doc.settings?.start?.cardPlan || {};
  const people = cardPeopleOf(doc), who = people.includes(person ?? all.who) ? (person ?? all.who) : 'Me';
  const mine = who === 'Me' ? all : { ...(all.by?.[who] || {}), carry: all.carry, tv: all.tv };
  const rows = cardRowsOf(doc).filter(r => (who === 'Me' ? !r.owner || r.owner === 'Me' || r.owner === 'Joint' : r.owner === who)), cardOf = id => lib.cards.find(c => c.id === id) ?? null;
  const heldRows = rows.filter(r => cardOf(r.values?.cardId)), unpicked = rows.filter(r => !cardOf(r.values?.cardId));
  // spending: the Budget's lines by reward category; stand-in amounts only while the Budget has none
  const fromBudget = categorySpend(x.lines || [], lib.categories, x.payFrequency), hasBudget = Object.keys(fromBudget).length > 0;
  const typical = Object.fromEntries(Object.entries(off.typicalSpend.monthly).map(([k, v]) => [k, v * 12]));
  const byCat = hasBudget ? fromBudget : typical;
  const monthly = hasBudget ? Object.values(fromBudget).reduce((a, b) => a + b, 0) / 12 : mine.spend ?? null;
  const number = who === 'Me' ? doc.profile?.credit?.score ?? null : null, band = P.scoreBand(number, off.scoreBands) ?? mine.score ?? null;
  // heavy debt: the debts list decides; a card someone says they carry a balance on counts until its balance is on the list
  const heavyListed = (x.debts || []).some(d => !d.inFull && (d.balance ?? 0) > 0 && d.apr != null && d.apr >= RULES.heavyApr), heavy = heavyListed || mine.carry === true;
  const useOf = id => heldRows.find(r => r.values.cardId === id)?.values.cardUse ?? mine.uses?.[id] ?? {};
  const creditsUsedOf = id => (cardOf(id)?.credits || []).reduce((t, c) => t + (useOf(id)[c.id] === 'Use' ? c.value ?? 0 : 0), 0);
  const openedMonths = [...rows.map(r => month(r.values?.opened)), ...(mine.opened || [])].filter(Boolean);
  const plan = P.cardPlan({ offers: off.offers, units: off.units, rule: off.rules.chase524, unlockIds: off.unlocksTransfers, held: heldRows.map(r => r.values.cardId), openedMonths,
    score: band, monthlySpend: monthly, heavyDebt: heavy, business: mine.business === true, programs: mine.programs || [], transferValue: mine.tv ?? null, creditsUsedOf, now,
    // until the plan knows whether anything is owed on cards, the answer says what it assumes
    debtKnown: (x.debts || []).length > 0 || cardRowsOf(doc).length > 0 || mine.noCards === true || all.carry != null });
  const small = materialityOf(m.hourly ?? null, doc.assumptions || {}).value;
  const held = heldRows.map(r => {
    const card = cardOf(r.values.cardId), check = feeCheck(card, { fee: r.values.annualFee, uses: r.values.cardUse || {}, spend: byCat, rate: m.hourly ?? null, assumptions: doc.assumptions || {} });
    // a no-fee card in the same points family (the offers file knows the family): the one a bank will switch this account to
    const unitOf = id => off.offers.find(f => f.cardId === id)?.bonus.unit, unit = unitOf(card.id);
    const sib = unit && off.units[unit]?.transferable ? lib.cards.find(o => o.id !== card.id && !(o.annualFee > 0) && unitOf(o.id) === unit) : null;
    return { row: r, card, label: `${issuerName(card)} ${card.name}`, opened: month(r.values.opened), check, year: P.yearCheck({ fee: check.fee ?? 0, back: check.back ?? 0, small, noFeeSibling: sib?.name ?? null }) };
  });
  const dates = P.cardDates(held.map(hd => ({ name: hd.card.name, opened: hd.opened, fee: hd.check.fee ?? 0, offerMonths: (o => (o?.spend ? o.months : null))(off.offers.find(f => f.cardId === hd.card.id)) })), now, off.rules.chase524);
  const guide = P.cardSteps({ hasCards: rows.length > 0, noCards: mine.noCards === true, spendKnown: hasBudget || mine.spend != null, scoreKnown: number != null || mine.score != null,
    monthsLeft: held.filter(hd => !hd.opened && !mine.old?.[hd.row.id]).length, canOpen: plan.kind === 'open', heavyDebt: plan.kind === 'debt', seenMove: mine.seen?.move === true, seenPlain: mine.seen?.plain === true });
  const rr = x.realReturn ?? ref.presets.realReturn.default;
  const total = Object.values(byCat).reduce((a, b) => a + b, 0), flat = total * RULES.plainCardRate;
  // the best 1, 2 and 3 cards against one plain card on this spending: worked out once, kept while nothing it reads changes
  const setups = () => { const key = JSON.stringify([byCat, all.uses, all.by, cardRowsOf(doc).map(r => [r.values.cardId, r.values.cardUse])]);
    if (MEMO.key !== key) MEMO = { key, val: { flat, list: P.bestSetups(lib.cards.filter(c => c.rewards && !c.secured && !c.store).map(c => ({ card: c, name: `${issuerName(c)} ${c.name}`, fee: (c.annualFee ?? 0) - creditsUsedOf(c.id) })), byCat, flat) } };
    return MEMO.val; };
  return { ...plan, held, unpicked, dates, small, creditsUsedOf, useOf, guide, monthsOld: mine.old || {}, who, people, mine, all,
    changes: who === 'Me' ? P.visitChanges(all.prev, { line: plan.line, left: plan.slots.left }, off.offers, now) : [], since: all.prev?.at ?? null,
    whyNot: () => P.whyNot(off.offers, { held: heldRows.map(r => r.values.cardId), opened: plan.slots.used, monthlySpend: monthly, me: plan.me }, plan.opts),
    // how much of what the best cards would give, the held cards already give (the same number of cards, up to three)
    share: () => { const n = Math.min(3, held.length); if (!n) return null;
      const have = P.bestSetups(held.map(hd => ({ card: hd.card, name: hd.label, fee: (hd.check.fee ?? 0) - creditsUsedOf(hd.card.id) })), byCat, flat, { sizes: [n] })[0], best = setups().list.find(r => r.size === n);
      return have && best ? P.cardsShare(have.value, Math.max(best.value, have.value), { enough: off.enoughShare.value, cards: n }) : null; },
    // left invested until the plan's own target age (the FI age if set, else Retire by, else 65), from the plan's age
    toward: value => P.offerToward(value, { littleE: RULES.littleE, iraLimit: ref.limits.ira.base, realReturn: rr, years: x.age == null ? null : Math.max(0, Math.round(x.retireAge - x.age)), until: `age ${x.retireAge}` }),
    // each bank's rule on getting a welcome offer twice, for one card
    again: id => (off.rules.again || []).find(r => r.cards.includes(id))?.words ?? null,
    // a card someone carries a balance on, until its balance is on the plan: the page asks for it there (the rate is the
    // plan's typical card rate until theirs is in)
    typicalApr: ref.typicalRates['Credit card'],
    rr, wr: x.withdrawalRate ?? ref.presets.withdrawalRate.default,
    inputs: { spend: { byCat, monthly, fromBudget: hasBudget, typicalMonthly: Object.values(typical).reduce((a, b) => a + b, 0) / 12 }, heavyListed, carryTap: mine.carry === true, score: { band, number, fromProfile: number != null }, heavy, business: mine.business ?? null, programs: mine.programs || [], tv: mine.tv ?? null, openedOther: mine.opened || [], spendTap: mine.spend ?? null },
    setups };
}

// A card someone holds, added from the card plan: the same row Net worth > Credit cards makes when a card is picked
// (the library card, its fee and rewards kind, the issuer as the institution). "I pay it in full" is recorded on the
// row; a balance is never invented.
const KIND = { 'Cash back': 'Cash back', Points: 'Points', Miles: 'Miles', None: 'None' };
export function addHeldCard(store, card, { inFull = false, owner = null } = {}) {
  let row = null;
  store.transaction(`Card: ${card.name}`, () => {
    const issuer = issuerName(card);
    const inst = issuer ? institutionsOf(store.doc).find(i => i.name.toLowerCase() === issuer.toLowerCase()) ?? addInstitution(store, { name: issuer, kind: 'Bank' }) : null;
    row = store.add('debt', { name: card.name, ...(owner && owner !== 'Me' ? { owner } : {}), values: { cardId: card.id, annualFee: card.annualFee ?? 0, rewards: KIND[card.rewards?.kind] ?? null, ...(inst ? { institutionId: inst.id } : {}), ...(inFull ? { payChoice: 'In full' } : {}) } }, { type: 'Credit card' });
  });
  return row;
}
