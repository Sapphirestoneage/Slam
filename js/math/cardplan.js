// SPDX-License-Identifier: AGPL-3.0-only
// The card plan: what a welcome offer is worth, whether a card fits a person today, and the next two moves.
// Reads data/library/card-offers.json (the dated offers layer; data/library/cards.json leaves bonuses out on purpose).
// Every function takes the offers, units and rules as arguments: the math never loads a file and holds no rates.

const round = v => Math.round(v);
const idOf = o => o.cardId ?? o.name;
const SCORE = { none: 0, fair: 1, good: 2, excellent: 3 };

// Does anything in this set of cards allow point transfers (which is what lifts a Chase point above cash value)?
export const unlocksTransfers = (held = [], unlockIds = []) => held.some(id => unlockIds.includes(id));

// Dollars a welcome offer is worth. Transferable points use `transferValue` only when a card that allows transfers is
// held (or is this card); every other unit uses its floor value. Null when the offer has no agreed amount.
export function offerValue(offer, { units = {}, held = [], unlockIds = [], transferValue = null } = {}) {
  const amt = offer?.bonus?.amount;
  if (amt == null) return null;
  const u = units[offer.bonus.unit];
  if (!u) return null;
  const lifted = u.transferable && transferValue != null && unlocksTransfers([...held, idOf(offer)], unlockIds);
  return amt * (lifted ? Math.max(u.value, transferValue) : u.value);
}

// Chase slots left under the 5/24 rule, from cards opened at any bank in the window.
export const slotsLeft = (openedInWindow = 0, rule = { slots: 5 }) => Math.max(0, rule.slots - Math.max(0, openedInWindow));

// Whole months of normal card spending it takes to earn the offer; null when it cannot be reached in its window.
export function monthsToEarn(offer, monthlySpend) {
  if (!offer?.spend) return 1;
  if (!(monthlySpend > 0)) return null;
  const need = Math.ceil(offer.spend / monthlySpend);
  return need > offer.months ? null : need;
}

// The offer's value less the first year's fee, after the credits the person says they would use anyway.
export function firstYearNet(offer, opts = {}) {
  const v = offerValue(offer, opts);
  if (v == null) return null;
  const fee = Math.max(0, (offer.annualFee ?? 0) - (opts.creditsUsed ?? 0));
  return v - fee;
}

// Does this card fit the person today? level is 'fits', 'maybe' or 'later'; reasons are plain sentences.
// me: { opened, score ('none'|'fair'|'good'|'excellent'), monthlySpend, heavyDebt, business }
export function cardFit(offer, me = {}, { rule = { slots: 5, months: 24 }, units = {}, held = [], unlockIds = [], transferValue = null, creditsUsed = 0 } = {}) {
  const order = ['later', 'maybe', 'fits'];
  let level = 2;
  const reasons = [];
  const cap = (n, text) => { level = Math.min(level, n); reasons.push(text); };
  if (me.heavyDebt) cap(0, 'Interest on the debt costs more than any welcome offer pays. Clear that first.');
  if (offer.business && me.business === false) cap(0, 'A business card: it needs a business or side income.');
  if (me.opened != null) {
    const left = slotsLeft(me.opened, rule);
    if (left <= 0) cap(0, `${rule.words ?? 'The issuer usually declines'}.`);
    else if (left === 1) reasons.push('This would use your last slot, so the biggest offer you can reach goes first.');
    else reasons.push(`${left} slots left.`);
  }
  if (me.score != null && offer.minScore != null) {
    const have = SCORE[me.score] ?? 0, want = SCORE[offer.minScore] ?? 0;
    if (have < want) cap(0, `Usually needs ${offer.minScore} credit.`);
    else if (want === 0 && have >= 2) cap(1, 'A starter card: your credit likely qualifies for a card with a real offer.');
  }
  if (me.monthlySpend != null && offer.spend) {
    const n = monthsToEarn(offer, me.monthlySpend), perMonth = round(offer.spend / offer.months);
    if (n == null && me.monthlySpend < perMonth / 2) cap(0, `The offer needs about $${perMonth.toLocaleString('en-US')} a month for ${offer.months} months. Spending extra to reach it gives the offer back.`);
    else if (n == null) cap(1, `The offer needs about $${perMonth.toLocaleString('en-US')} a month for ${offer.months} months, more than your usual. It works only alongside a planned big bill.`);
    else reasons.push('Your usual spending covers the offer.');
  }
  const net = firstYearNet(offer, { units, held, unlockIds, transferValue, creditsUsed });
  if (net == null) cap(1, 'The offer is not settled between sources, so no dollar value is counted.');
  return { level: order[level], reasons, net };
}

// The moves open from here, best first by first-year net, each with the best second move after it.
// state: { held: [ids], opened, monthlySpend, me }. Returns { slots, moves: [{ offer, net, months, then: [...] }] }.
export function nextMoves(offers = [], state = {}, opts = {}, depth = 2) {
  const { held = [], opened = 0, monthlySpend = null, me = {} } = state;
  const rule = opts.rule ?? { slots: 5, months: 24 };
  const slots = slotsLeft(opened, rule);
  if (slots <= 0 || me.heavyDebt) return { slots, moves: [] };
  const moves = [];
  for (const o of offers) {
    if (held.includes(idOf(o)) || !(o.bonus?.amount > 0)) continue;
    const fit = cardFit(o, { ...me, opened, monthlySpend }, { ...opts, rule, held });
    const months = monthsToEarn(o, monthlySpend ?? Infinity);
    if (fit.level === 'later' || months == null) continue;
    const after = [...held, idOf(o)];
    const net = firstYearNet(o, { ...opts, held: after });
    const then = depth > 1 ? nextMoves(offers, { held: after, opened: opened + (o.business && rule.businessCardsCount === false ? 0 : 1), monthlySpend, me }, opts, depth - 1).moves
      .map(m => ({ offer: m.offer, months: m.months, startsMonth: months + 1, both: pathNet([o, m.offer], held, opts) })).sort((a, b) => b.both - a.both) : [];
    moves.push({ offer: o, net, months, slotsAfter: slotsLeft(opened + (o.business && rule.businessCardsCount === false ? 0 : 1), rule), then });
  }
  moves.sort((a, b) => b.net - a.net);
  return { slots, moves };
}

// What a sequence of cards is worth together, every point valued at the end of the path (a later card can lift an earlier one).
export function pathNet(seq = [], held = [], opts = {}) {
  const end = [...held, ...seq.map(idOf)];
  return seq.reduce((t, o) => t + (firstYearNet(o, { ...opts, held: end }) ?? 0), 0);
}

// A yearly cost as an addition to the FI number: the cost divided by the withdrawal rate.
export const costAsFiNumber = (yearlyCost, withdrawalRate) => (yearlyCost > 0 && withdrawalRate > 0 ? yearlyCost / withdrawalRate : 0);

// A sum invested today, left alone for `years` at a real return.
export const investedLater = (amount, years, realReturn) => amount * Math.pow(1 + realReturn, Math.max(0, years));
