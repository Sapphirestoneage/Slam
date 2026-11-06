// SPDX-License-Identifier: AGPL-3.0-only
// Batch 30: the card library (data/library/cards.json) on Net worth › Credit cards. Finding a card by a few letters,
// what a card earns on the Budget's everyday spending, whether a card with a fee gives back more than the fee (M9C),
// benefits a paid line may be doubling up (M9C part), and what would move the credit score most (M9D).
// Every function takes the library's cards as an argument: the math never loads a file.
import { ok, needs, isBlank, fmt } from './result.js';
import { monthlyFrom } from './income.js';
import { materialityOf } from './time.js';
import { RULES } from '../registry/assumptions.js';

const money = v => fmt.money(Math.round(v));
const whole = v => `${Math.round(v * 100)}%`;
const words = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9+ ]+/g, ' ').split(/\s+/).filter(Boolean);

// Type-ahead: every typed word must start a word of the issuer and name (or be their initials, "csp"); the best
// matches first (whole-word hits, then the shorter name). Blank returns nothing.
export function searchCards(cards = [], query = '', { limit = 8 } = {}) {
  const q = words(query);
  if (!q.length) return [];
  const scored = [];
  for (const c of cards) {
    const w = words(`${c.issuer} ${c.name} ${c.store ?? ''}`);
    const initials = w.map(x => x[0]).join('');
    let score = 0;
    const hit = q.every(t => {
      if (w.includes(t)) { score += 3; return true; }
      if (w.some(x => x.startsWith(t))) { score += 2; return true; }
      if (t.length >= 2 && initials.includes(t)) { score += 1; return true; }
      return false;
    });
    if (hit) scored.push({ c, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.c.name.length - b.c.name.length).slice(0, limit).map(x => x.c);
}
export const cardById = (cards = [], id) => cards.find(c => c.id === id) ?? null;
// The issuer name an institution is called by (Discover (Capital One) is Discover; Apple's issuer note drops).
export const issuerName = card => String(card?.issuer ?? '').replace(/\s*\(.*\)\s*$/, '').trim() || null;

// What each reward category spends a year, from the Budget lines (monthly amounts times 12).
export function categorySpend(lines = [], categories = {}, freq = null) {
  const out = {};
  for (const [cat, def] of Object.entries(categories)) {
    const mine = lines.filter(l => def.lines?.includes(l.category ?? l.values?.category) && l.status !== 'Not for me' && !isBlank(l.amount));
    if (!mine.length) continue;
    out[cat] = mine.reduce((s, l) => s + (monthlyFrom(Number(l.amount), l.per ?? 'month', freq).value ?? 0), 0) * 12;
  }
  return out;
}

// What a card earns a year on that spending: each category at its best rate (a pick-your-category rate takes the
// biggest of its choices), caps and shared caps applied, the rest at the base rate. Categories with no Budget lines
// (a travel site, a store) are named in skipped, never counted. plain is what a no-fee card at RULES.plainCardRate
// would earn on the same spending.
export function cardRewards(card, spend = {}) {
  if (!card?.rewards) return { value: null, parts: [], spend: 0, plain: 0, skipped: [] };
  const rw = card.rewards, pv = rw.pointValue ?? 0.01, base = rw.base ?? 0;
  const left = { ...spend };
  const caps = {};
  const parts = [];
  const take = (cat, x, rate) => {
    const amt = left[cat] ?? 0;
    if (!amt) return;
    let room = rate.capYear ?? Infinity;
    if (rate.shared) room = Math.min(room, caps[rate.shared] ?? rate.capYear ?? Infinity);
    const at = Math.min(amt, room);
    if (at <= 0) return;
    left[cat] = amt - at;
    if (rate.shared) caps[rate.shared] = (caps[rate.shared] ?? rate.capYear ?? Infinity) - at;
    parts.push({ cat, x, spend: at, value: at * x * pv });
  };
  const rates = [...(rw.rates || [])].sort((a, b) => b.x - a.x);
  const skipped = [];
  for (const rate of rates) {
    if (rate.oneOf) {
      const best = rate.oneOf.filter(c => (left[c] ?? 0) > 0).sort((a, b) => left[b] - left[a])[0];
      if (best) take(best, rate.x, rate);
      continue;
    }
    if (spend[rate.cat] == null) { skipped.push(rate.cat); continue; }
    take(rate.cat, rate.x, rate);
  }
  for (const [cat, amt] of Object.entries(left)) if (amt > 0 && base > 0) parts.push({ cat, x: base, spend: amt, value: amt * base * pv, base: true });
  const total = Object.values(spend).reduce((s, v) => s + v, 0);
  return { value: parts.reduce((s, p) => s + p.value, 0), parts, spend: total, plain: total * RULES.plainCardRate, skipped };
}

// M9C: is a card with an annual fee worth its fee? What it gives back a year (the rewards on the Budget's spending
// unless tapped Don't, plus every credit tapped Use it) against the fee. A difference smaller than the client's
// materiality (assumptions.materialHours at the real hourly wage, never under materialFloor) reads as about even.
export function feeCheck(card, { fee = null, uses = {}, spend = {}, rate = null, assumptions = {} } = {}) {
  const yearly = isBlank(fee) ? card?.annualFee ?? null : Number(fee);
  if (!card) return needs('M9C', ['the card, picked from the library']);
  if (!yearly) return { ...ok('M9C', null, 'No annual fee: nothing to earn back.'), noFee: true, rewards: uses.rewards === 'Dont' ? null : cardRewards(card, spend) };
  const rw = uses.rewards === 'Dont' ? { value: 0, parts: [], spend: 0, plain: 0, skipped: [] } : cardRewards(card, spend);
  const used = (card.credits || []).filter(c => uses[c.id] === 'Use');
  const credits = used.reduce((s, c) => s + (c.value ?? 0), 0);
  const back = (rw.value ?? 0) + credits;
  const net = back - yearly;
  const m = materialityOf(rate, assumptions);
  const small = Math.abs(net) < m.value;
  const asked = (card.credits || []).filter(c => c.value > 0 && !uses[c.id]).length;
  const line = small ? `About even with its ${money(yearly)} fee: the difference is under ${money(m.value)} a year, a small win either way.`
    : net > 0 ? `Worth about ${money(net)} a year more than its ${money(yearly)} fee.`
    : `Gives back about ${money(-net)} a year less than its ${money(yearly)} fee.`;
  const text = `${money(rw.value ?? 0)} in rewards on your Budget's everyday spending${uses.rewards === 'Dont' ? ' (not on this card)' : ''} + ${money(credits)} in credits you use (${used.map(c => c.name).join(', ') || 'none tapped yet'}) = ${money(back)} a year, against the ${money(yearly)} fee. ${m.text}`;
  return { ...ok('M9C', net, text), fee: yearly, back, rewards: rw, credits, used, small, line, asked, material: m.value,
    plainLine: rw.plain > (rw.value ?? 0) + 0.5 && (rw.spend ?? 0) > 0 ? `A no-fee ${whole(RULES.plainCardRate)} card would earn about ${money(rw.plain)} on the same spending.` : null };
}

// M9C part: benefits a paid line may be doubling up. A card that includes cell phone protection, rental car coverage
// or an extended warranty, and a Budget line or Protection row whose name says it pays for the same thing.
export const DOUBLE_WORDS = {
  cellPhone: { re: /phone (insurance|protection|protect)|applecare|asurion|device protection|handset|samsung care|protection 360|total mobile protection|phone care/i, what: 'phone damage and theft' },
  warranty: { re: /extended warranty|product protection|protection plan|squaretrade|allstate protection|electronics warranty/i, not: /home warranty/i, what: 'longer warranties on things you buy' },
  rental: { re: /rental car|car rental|collision damage waiver|\bcdw\b|\bldw\b/i, what: 'rental car damage' },
};
export function doubledUp(held = [], paid = [], freq = null) {
  const out = [];
  for (const kind of Object.keys(DOUBLE_WORDS)) {
    const rule = DOUBLE_WORDS[kind];
    const card = held.find(x => x.card?.benefits?.[kind]);
    if (!card) continue;
    for (const p of paid) {
      const name = `${p.name ?? ''} ${p.category ?? ''}`;
      if (!rule.re.test(name) || rule.not?.test(name)) continue;
      const monthly = isBlank(p.amount) ? null : monthlyFrom(Number(p.amount), p.per ?? 'month', freq).value;
      out.push({ kind, cardId: card.id, lineId: p.id ?? null, monthly,
        text: `Your ${card.label} already covers ${rule.what}; the ${monthly == null ? '' : `${money(monthly)} a month `}${(p.name || p.category || 'line').toLowerCase()} may be doubling up.` });
    }
  }
  return out;
}

// M9D: what would move the credit score most, in one line. The order follows how FICO weighs a score (payment
// history 35%, amounts owed 30%, length of history 15%, new credit 10%, mix 10%; myFICO): a missed payment risk
// first, then utilization over RULES.utilHigh, then over RULES.utilBest, then new applications, then time.
export function creditMove({ score = null, overall = null, cards = [], latePayments = null, autopayOff = 0, inquiries = null, oldestMonths = null } = {}) {
  const limit = cards.reduce((s, c) => s + (c.limit ?? 0), 0), owed = cards.reduce((s, c) => s + (c.balance ?? 0), 0);
  const down = share => Math.max(0, owed - share * limit);
  let key, text;
  if (latePayments === true || autopayOff > 0) { key = 'onTime'; text = 'Paying on time moves it most (35% of a FICO score): autopay at least the minimum on every card.'; }
  else if (overall != null && overall > RULES.utilHigh) { key = 'util'; text = `Paying the cards down by about ${money(down(RULES.utilHigh))}, to under ${whole(RULES.utilHigh)} of the limits, moves it most (30% of the score).`; }
  else if (overall != null && overall > RULES.utilBest) { key = 'utilBest'; text = `Paying about ${money(down(RULES.utilBest))} more off before the statements close, to under ${whole(RULES.utilBest)} of the limits, helps most.`; }
  else if (inquiries != null && inquiries >= RULES.inquiriesMany) { key = 'inquiries'; text = 'Holding off on new applications helps most: each hard inquiry fades over a year and drops off after 2.'; }
  else if (oldestMonths != null && oldestMonths < 24) { key = 'time'; text = 'Time moves it most now: keep the oldest card open and used a little.'; }
  else if (score == null && overall == null) { key = 'start'; text = 'Start with the score (free in the card app or Credit Karma) and each card\'s limit.'; }
  else { key = 'keep'; text = 'Keep doing what works: on time, low balances, no new applications.'; }
  return { ...ok('M9D', null, text, { unit: 'text' }), key, owed, limit };
}

// The cards a household holds that are picked from the library, each with its fee check, and the doubled-up notes.
// cardRows: the Credit card debt rows (values.cardId, annualFee, cardUse); lines: the Budget lines; coverage: the
// Protection rows. Returns null until the library is loaded.
export function cardsPicture({ cardRows = [], lines = [], coverage = [], library = null, rate = null, assumptions = {}, freq = null } = {}) {
  if (!library?.cards) return null;
  const spend = categorySpend(lines, library.categories, freq);
  const held = cardRows.map(r => {
    const card = cardById(library.cards, r.values?.cardId);
    return card ? { id: r.id, card, label: `${issuerName(card)} ${card.name}`, check: feeCheck(card, { fee: r.values.annualFee, uses: r.values.cardUse || {}, spend, rate, assumptions }) } : null;
  }).filter(Boolean);
  const paid = [...lines.filter(l => !l.auto), ...coverage.filter(c => c.values?.have !== "Don't").map(c => ({ id: c.id, name: c.name, category: c.type, amount: c.amount, per: c.per }))];
  return { spend, held, doubled: doubledUp(held, paid, freq) };
}
