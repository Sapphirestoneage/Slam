// SPDX-License-Identifier: AGPL-3.0-only
// The card plan: what a welcome offer is worth, whether a card fits a person today, and the next two moves.
// Reads data/library/card-offers.json (the dated offers layer; data/library/cards.json leaves bonuses out on purpose).
// Every function takes the offers, units and rules as arguments: the math never loads a file and holds no rates.

import { cardRewards } from './cards.js';

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

// An airline or hotel program's own points: not cash, and not points that can move elsewhere.
export const isProgram = (offer, units = {}) => { const u = units[offer?.bonus?.unit]; return !!u && offer.bonus.unit !== 'cash' && !u.transferable; };

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
  const fee = Math.max(0, (offer.annualFee ?? 0) - (opts.creditsUsedOf ? opts.creditsUsedOf(idOf(offer)) : opts.creditsUsed ?? 0));
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
    // airline and hotel points only count for someone who says they would use that program, and one card per program
    if (isProgram(o, opts.units) && (!(opts.programs || []).includes(o.bonus.unit) || (opts.skipUnits || []).includes(o.bonus.unit))) continue;
    const fit = cardFit(o, { ...me, opened, monthlySpend }, { ...opts, rule, held });
    const months = monthsToEarn(o, monthlySpend ?? Infinity);
    if (fit.level === 'later' || months == null) continue;
    const after = [...held, idOf(o)];
    const net = firstYearNet(o, { ...opts, held: after });
    const then = depth > 1 ? nextMoves(offers, { held: after, opened: opened + (o.business && rule.businessCardsCount === false ? 0 : 1), monthlySpend, me }, isProgram(o, opts.units) ? { ...opts, skipUnits: [...(opts.skipUnits || []), o.bonus.unit] } : opts, depth - 1).moves
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

// ---- Dates: exact slots from the months cards were opened, and the dates worth knowing ----
const ym = s => { const [y, m] = String(s).split('-').map(Number); return y * 12 + (m - 1); };
const ymOf = d => d.getFullYear() * 12 + d.getMonth();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthWords = n => `${MONTHS[((n % 12) + 12) % 12]} ${Math.floor(n / 12)}`;

// Slots from the opening months ('2025-03'): how many count today, how many are left, and the month the next one frees.
export function slotsFromDates(opened = [], now = new Date(), rule = { slots: 5, months: 24 }) {
  const at = ymOf(now), live = opened.map(ym).filter(n => n <= at && at - n < rule.months).sort((a, b) => a - b);
  const left = Math.max(0, rule.slots - live.length);
  // a slot frees the month the oldest counted card passes the window; when over the limit, enough must pass to get under it
  const need = live.length - rule.slots + 1, key = need > 0 ? live[need - 1] : live[0];
  return { used: live.length, left, frees: key == null ? null : monthWords(key + rule.months), freesIn: key == null ? null : key + rule.months - at };
}

// The dates worth knowing for cards in hand, soonest first: an offer's deadline, the next fee, a slot coming back.
// cards: [{ name, opened: '2026-09', fee, offerMonths }]
export function cardDates(cards = [], now = new Date(), rule = { slots: 5, months: 24 }) {
  const at = ymOf(now), out = [];
  for (const c of cards) {
    if (!c.opened) continue;
    const o = ym(c.opened);
    if (c.offerMonths && o + c.offerMonths >= at) out.push({ kind: 'offer', n: o + c.offerMonths, when: monthWords(o + c.offerMonths), text: `${c.name}: finish the welcome offer spending` });
    if (c.fee > 0) { let n = o + 12; while (n < at) n += 12; out.push({ kind: 'fee', n, when: monthWords(n), text: `${c.name}: the $${c.fee} yearly fee posts. Look at whether it earned its keep the month before` }); }
    if (o + rule.months > at) out.push({ kind: 'slot', n: o + rule.months, when: monthWords(o + rule.months), text: `${c.name} stops counting toward the ${rule.slots} card limit` });
  }
  return out.sort((a, b) => a.n - b.n);
}

// ---- A year with a card: did it give back its fee? ----
// back: dollars a year in rewards and credits used (js/math/cards.js feeCheck gives it). small: what counts as even.
export function yearCheck({ fee = 0, back = 0, small = 25, noFeeSibling = null } = {}) {
  if (!(fee > 0)) return { kind: 'free', line: 'No yearly fee. Keeping it open costs nothing and helps the age of your credit.' };
  const net = back - fee;
  if (Math.abs(net) < small) return { kind: 'even', net, line: `About even with its $${fee} fee.` };
  if (net > 0) return { kind: 'earns', net, line: `Gave back about $${round(net).toLocaleString('en-US')} more than its $${fee} fee.` };
  return { kind: 'costs', net, line: `Gave back about $${round(-net).toLocaleString('en-US')} less than its $${fee} fee.`,
    option: noFeeSibling ? `Ask the bank to switch it to ${noFeeSibling} before the fee posts: same account, no fee, no new application.` : 'Ask the bank for a no-fee version before the fee posts, or close it once any points are moved out.' };
}

// ---- Against a plain card ----
// cards: [{ card (a library card), name, fee (after credits used) }]; spend: dollars a year by category.
// The best 1, 2 and 3 card setups. Each category goes to one card, and every card is then scored by the library's own
// rewards math on the categories it was given (so a pick-one-category rate or a cap is never counted twice). The
// split starts with each category on the card that pays most for it alone, then moves categories while the total grows.
export function bestSetups(cards = [], spend = {}, plain = 0, { sizes = [1, 2, 3], keep = 8, perCat = 2 } = {}) {
  const cats = Object.keys(spend).filter(c => spend[c] > 0);
  const earn = (x, mine) => (mine.length ? cardRewards(x.card, Object.fromEntries(mine.map(c => [c, spend[c]]))).value ?? 0 : 0);
  const alone = new Map(cards.map(x => [x, Object.fromEntries(cats.map(c => [c, cardRewards(x.card, { [c]: spend[c] }).value ?? 0]))]));
  const total = (set, give) => set.reduce((t, x, i) => t + earn(x, cats.filter(c => give[c] === i)) - Math.max(0, x.fee ?? 0), 0);
  const split = set => {
    const give = Object.fromEntries(cats.map(c => [c, set.reduce((b, x, i) => (alone.get(x)[c] > alone.get(set[b])[c] ? i : b), 0)]));
    let best = total(set, give);
    for (let pass = 0, moved = true; moved && pass < 4; pass++) {
      moved = false;
      for (const c of cats) for (let i = 0; i < set.length; i++) {
        if (give[c] === i) continue;
        const was = give[c]; give[c] = i; const v = total(set, give);
        if (v > best + 1e-9) { best = v; moved = true; } else give[c] = was;
      }
    }
    return { value: best, give };
  };
  const single = new Map(cards.map(x => [x, earn(x, cats) - Math.max(0, x.fee ?? 0)]));
  const pool = new Set([...cards].sort((a, b) => single.get(b) - single.get(a)).slice(0, keep));
  for (const c of cats) [...cards].sort((a, b) => alone.get(b)[c] - alone.get(a)[c]).slice(0, perCat).forEach(x => pool.add(x));
  const P = [...pool], out = [];
  const pick = (set, start, size) => {
    if (set.length === size) { const r = split(set), cur = out.find(o => o.size === size); if (!cur) out.push({ size, cards: [...set], ...r }); else if (r.value > cur.value) Object.assign(cur, { cards: [...set], ...r }); return; }
    for (let i = start; i < P.length; i++) { set.push(P[i]); pick(set, i + 1, size); set.pop(); }
  };
  for (const n of sizes) if (P.length >= n) pick([], 0, n);
  return out.map(o => ({ size: o.size, cards: o.cards, value: o.value, gain: o.value - plain, use: Object.fromEntries(cats.map(c => [c, o.cards[o.give[c]].name])) }));
}

// ---- What a card opens and what it uses, in short labels, from the library card and its offer ----
export function opensAndUses(card, offer, { unlockIds = [], benefitKinds = {}, rule = { slots: 5 } } = {}) {
  const opens = [], uses = [];
  if (unlockIds.includes(offer?.cardId ?? offer?.name)) opens.push('Moving points to airlines and hotels', 'More value from Chase points you already hold');
  if (card?.intro?.purchases) opens.push(`0% on purchases for ${card.intro.purchases} months`);
  if (card && card.foreignFee === 0) opens.push('No fee on purchases abroad');
  for (const k of Object.keys(card?.benefits || {})) if (benefitKinds[k]) opens.push(benefitKinds[k]);
  if (card && !(card.annualFee > 0)) opens.push('A no-fee card to keep open for good');
  uses.push(offer?.business && rule.businessCardsCount === false ? `No slot of the ${rule.slots}, though you must be under the limit to get it` : `One slot of the ${rule.slots}`);
  const fee = offer?.annualFee ?? card?.annualFee ?? 0;
  if (fee > 0) uses.push(`$${fee} a year`);
  return { opens, uses };
}

// ---- The one answer ----
// A score as a band, from the bands in the offers file. Null when there is no score.
export const scoreBand = (score, bands = {}) => (score == null || score === '' || !Number.isFinite(Number(score)) ? null : Number(score) >= bands.excellent ? 'excellent' : Number(score) >= bands.good ? 'good' : 'fair');

// The card plan from its inputs: the slots, the moves, and the one sentence every screen shows.
export function cardPlan({ offers = [], units = {}, rule = { slots: 5, months: 24 }, unlockIds = [], held = [], openedMonths = [], score = null, monthlySpend = null, heavyDebt = false, business = false,
  programs = [], transferValue = null, creditsUsedOf = null, now = new Date() } = {}) {
  const slots = slotsFromDates(openedMonths, now, rule);
  const opts = { units, rule, unlockIds, transferValue, creditsUsedOf, programs };
  const me = { score, heavyDebt, business };
  const R = nextMoves(offers, { held, opened: slots.used, monthlySpend, me }, opts);
  const usd = v => `$${round(v).toLocaleString('en-US')}`;
  let kind, line;
  if (heavyDebt) { kind = 'debt'; line = 'Pay down the debt first. No new card pays more than that interest costs.'; }
  else if (slots.left <= 0) { kind = 'wait'; line = `Wait. Chase opens up again in ${slots.frees}.`; }
  else if (R.moves.length) { const m = R.moves[0]; kind = 'open'; line = `${m.offer.name}, worth ${usd(m.net)} in its first year after the fee${monthlySpend != null ? `, from about ${m.months} ${m.months === 1 ? 'month' : 'months'} of spending you already do` : ''}.`; }
  else { kind = 'hold'; line = 'Hold. Nothing here beats what you have.'; }
  const why = kind === 'debt' ? 'Card interest runs far above anything a welcome offer pays.'
    : kind === 'wait' ? `You have opened ${slots.used} cards in two years, and Chase usually turns down anyone at ${rule.slots} or more.`
    : kind === 'open' ? `It is the biggest offer you can reach${monthlySpend != null ? ' on your usual spending' : ''}, after its fee.`
    : 'No offer here clears its fee for you right now.';
  return { kind, line, why, slots, moves: R.moves, opts, me };
}

// The steps that sharpen the answer, in order. One is next at a time; the count ticks up as each is done.
export function cardSteps({ hasCards = false, noCards = false, spendKnown = false, scoreKnown = false, monthsLeft = 0, canOpen = true, seenMove = false, seenPlain = false } = {}) {
  const steps = [
    { id: 'cards', label: 'Add the cards you hold', done: hasCards || noCards },
    { id: 'spend', label: 'Say what you put on cards in a month', done: spendKnown },
    { id: 'score', label: 'Tap your credit score', done: scoreKnown },
    { id: 'months', label: 'Say when you opened each card', done: monthsLeft === 0 },
    { id: 'move', label: 'Open your next move and see what it opens', done: seenMove || !canOpen },
    { id: 'plain', label: 'Check it against one plain card', done: seenPlain },
  ];
  const done = steps.filter(x => x.done).length, next = steps.find(x => !x.done) ?? null;
  return { steps, next, done, total: steps.length, count: next ? `Step ${steps.indexOf(next) + 1} of ${steps.length}` : `All ${steps.length} done`, line: next ? next.label : 'Your answer is as sharp as this page can make it.' };
}
