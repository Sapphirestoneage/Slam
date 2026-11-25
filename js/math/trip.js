// SPDX-License-Identifier: AGPL-3.0-only
// M8T, travel (run of Nov 25 2026, Part 4). One engine: trip.html of the web app and the game's screen "Trips and the
// journey" both call these functions, so the two can never give two answers. Four parts:
// (1) the trip line by line: flights, lodging a night, food a day, the card's foreign transaction fee (a percent of
//     the lines paid in another currency), visa fees, travel insurance, everything else;
// (2) points: the cents a point a redemption gets, next to the person's own value of a point, cash or redeem;
// (3) a group trip split among people by share or by item, in one currency, on the household split engine
//     (rowShare of js/math/household.js: by percent for shares, equally among the people in on an item);
// (4) the FIRE journey map: digging out, the first $1k, debt free, $100k, Coast, FI; where you are; how a trip moves
//     you on it.
// The one import is the split engine. tools/game_trip_build.mjs copies js/math/household.js and this file, word for
// word, into game/core/trip.js. Every name of this file starts with tp or TP_ because the game has one global scope.
// Empty is not zero: an answer not given yet is null; a line not tapped is listed in `open`, a result that needs
// an answer lists it in `needs`. Amounts are in the trip's one currency, whole units, in today's money.
// The FI date is not worked out here: each app runs its own (the web app's M53 through fiMoveOf, the game's goalSim)
// with the trip in, and passes the months in, so there is one FI date in each app.
import { rowShare } from './household.js';

// ---------- the rules, each with where it comes from ----------
// The stage amounts are Eli's (the run's Part 4 prompt, Nov 25 2026: "the usual stages (digging out, first $1k, debt
// free, $100k, Coast, FI)"). daysPerMonth: a year of 365.25 days over 12 months.
export const TP_RULES = { firstK: 1000, k100: 100000, daysPerMonth: 365.25 / 12 };
export const TP_RULES_SOURCE = 'Eli, run of Nov 25 2026, Part 4: the stages of the FIRE journey (digging out, first $1k, debt free, $100k, Coast, FI)';

// The lines of a trip. per: what one tap is for (a night, a day); the rest are for the whole trip.
export const TP_LINES = [
  { id: 'flights', name: 'Flights', sub: 'Every ticket, there and back' },
  { id: 'lodging', name: 'Lodging', sub: 'A night', per: 'night' },
  { id: 'food', name: 'Food', sub: 'A day', per: 'day' },
  { id: 'visa', name: 'Visa fees', sub: 'For everyone who needs one' },
  { id: 'insurance', name: 'Travel insurance', sub: 'The policy, for the whole trip' },
  { id: 'other', name: 'Everything else', sub: 'Getting around, tickets, gifts' },
];
// The lines a card can be charged in another currency, and the ones that start ticked.
export const TP_FX_CAN = ['flights', 'lodging', 'food', 'other'];
export const TP_FX_START = ['lodging', 'food', 'other'];
// The amounts to tap, the same in the web app and in the game. Choices to tap, not typical prices and not anyone's
// real fee: the card's own fee is in its terms, the visa fee is on the country's own site, the policy's price is on
// its quote (TP_TAPS_NOTE).
export const TP_OPTS = {
  flights: [200, 400, 700, 1200, 2500], lodging: [50, 100, 150, 250, 400], days: [2, 3, 5, 7, 10, 14], food: [20, 40, 60, 100, 150],
  visa: [0, 25, 50, 100, 200], insurance: [0, 50, 100, 200, 400], other: [0, 100, 300, 600, 1000], fxPct: [0, 1, 2, 3],
  cash: [200, 400, 700, 1200, 2500], points: [10000, 25000, 40000, 60000, 100000], fees: [0, 10, 50, 150], cpp: [0.5, 1, 1.25, 1.5, 2],
  shares: [1, 2, 3, 4],
};
export const TP_TAPS_NOTE = 'These amounts are taps to start from, not prices: your card\'s terms show its foreign transaction fee, the country\'s own site shows the visa fee, and a quote shows the insurance.';
// [code, the name in a sentence, the name on its own]
export const TP_CURRENCIES = [['USD', 'US dollars', 'US dollars'], ['EUR', 'euros', 'Euros'], ['GBP', 'British pounds', 'British pounds'], ['CAD', 'Canadian dollars', 'Canadian dollars'], ['MXN', 'Mexican pesos', 'Mexican pesos'], ['JPY', 'Japanese yen', 'Japanese yen'], ['ILS', 'Israeli shekels', 'Israeli shekels']];
export const TP_SOURCES = [['guess', 'My best guess'], ['quote', 'A price I looked up'], ['own', 'Booked or on my statement']];

const tpHas = v => typeof v === 'number' && Number.isFinite(v);
const tpR2 = v => Math.round(v * 100) / 100;
// An amount in the trip's currency: "$1,240", "1,240 EUR" style by Intl, with cents only when there are some.
export function tpMoney(v, cur = 'USD') {
  if (!tpHas(v)) return '';
  const cents = Math.round(Math.abs(v) * 100) % 100 !== 0 && cur !== 'JPY';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(v); } catch { return `${v} ${cur}`; }
}

// ---------- (1) the trip, line by line ----------
// x: { flights, lodging (a night), nights, food (a day), days, visa, insurance, other, fxPct, fxOn (line ids paid in
// another currency; default TP_FX_START), pointsOff (cash the points cover, from tpPoints, when the person redeems) }.
// nights blank is the days less one. Returns each line with its amount (null when not tapped), the fee, the total of
// the lines tapped, the lines still open, and `ready` once any line is tapped.
export function tpCost(x = {}) {
  const days = tpHas(x.days) ? x.days : null, nights = tpHas(x.nights) ? x.nights : days != null ? Math.max(0, days - 1) : null;
  const amt = { flights: tpHas(x.flights) ? x.flights : null, lodging: tpHas(x.lodging) && nights != null ? x.lodging * nights : null, food: tpHas(x.food) && days != null ? x.food * days : null,
    visa: tpHas(x.visa) ? x.visa : null, insurance: tpHas(x.insurance) ? x.insurance : null, other: tpHas(x.other) ? x.other : null };
  const lines = TP_LINES.map(l => ({ id: l.id, name: l.name, amount: amt[l.id] }));
  const fxOn = (Array.isArray(x.fxOn) ? x.fxOn : TP_FX_START).filter(id => TP_FX_CAN.includes(id));
  const fxBase = fxOn.reduce((s, id) => s + (amt[id] ?? 0), 0);
  const fx = { pct: tpHas(x.fxPct) ? x.fxPct : null, on: fxOn, base: fxBase, amount: fxOn.length === 0 ? 0 : tpHas(x.fxPct) ? tpR2(fxBase * x.fxPct / 100) : null };
  lines.push({ id: 'fx', name: 'Card fee on other currencies', amount: fx.amount });
  const gross = tpR2(lines.reduce((s, l) => s + (l.amount ?? 0), 0));
  const pointsOff = tpHas(x.pointsOff) && x.pointsOff > 0 ? Math.min(x.pointsOff, gross) : 0;
  const open = lines.filter(l => l.amount == null).map(l => l.name);
  const ready = TP_LINES.some(l => amt[l.id] != null);
  return { ready, lines, fx, days, nights, gross, pointsOff, total: tpR2(gross - pointsOff), open, complete: ready && open.length === 0 };
}
export function tpCostWords(T, cur = 'USD') {
  if (!T.ready) return '';
  const n = T.open.length;
  return `The trip comes to ${tpMoney(T.total, cur)}${T.pointsOff ? `, with ${tpMoney(T.pointsOff, cur)} of it paid with points` : ''}${n ? `, so far: ${n} ${n === 1 ? 'line is' : 'lines are'} not tapped yet (${T.open.join(', ')}).` : '.'}`;
}
export function tpCostMath(T, x = {}, cur = 'USD') {
  if (!T.ready) return [];
  const M = v => tpMoney(v, cur), out = [];
  if (T.lines[0].amount != null) out.push(`Flights: ${M(T.lines[0].amount)}`);
  if (T.lines[1].amount != null) out.push(`Lodging: ${M(x.lodging)} a night x ${T.nights} ${T.nights === 1 ? 'night' : 'nights'}${tpHas(x.nights) ? '' : ' (the days less one)'} = ${M(T.lines[1].amount)}`);
  if (T.lines[2].amount != null) out.push(`Food: ${M(x.food)} a day x ${T.days} ${T.days === 1 ? 'day' : 'days'} = ${M(T.lines[2].amount)}`);
  for (const i of [3, 4, 5]) if (T.lines[i].amount != null) out.push(`${T.lines[i].name}: ${M(T.lines[i].amount)}`);
  if (T.fx.on.length && T.fx.amount != null) out.push(`Card fee: ${T.fx.pct}% of ${M(T.fx.base)} paid in another currency (${T.fx.on.map(id => TP_LINES.find(l => l.id === id).name.toLowerCase()).join(', ')}) = ${M(T.fx.amount)}`);
  if (T.pointsOff) out.push(`Paid with points: less ${M(T.pointsOff)}`);
  out.push(`In all: ${M(T.total)}${T.open.length ? `, not counting ${T.open.join(', ')}` : ''}`);
  return out;
}
// Guess / Close / Exact: a guess while lines are open or the source is a guess; Exact only when it is booked.
export function tpLevel(T, source) {
  if (!T.ready) return null;
  if (!T.complete || source == null || source === 'guess') return 'Guess';
  return source === 'own' ? 'Exact' : 'Close';
}

// ---------- (2) points: cash or redeem ----------
// x: { cash (the cash price), points (the points it asks for), fees (the cash still due on a redemption), cpp (the
// person's own value of a point, in cents) }. got: the cents a point this redemption gets. worth: what those points
// are worth to the person. lead: 'points' when redeeming spends less of their value than the cash price, 'cash' when
// the cash price is less, 'same' within a cent. cashOff: the cash the points cover (the price less the fees).
export function tpPoints(x = {}) {
  const needs = ['cash', 'points', 'fees', 'cpp'].filter(k => !tpHas(x[k]));
  if (!needs.length && !(x.points > 0)) needs.push('points');
  if (needs.length) return { needs };
  const got = (x.cash - x.fees) / x.points * 100, worth = x.points * x.cpp / 100, spend = worth + x.fees, keep = x.cash - spend;
  return { needs: [], cash: x.cash, fees: x.fees, got, worth, spend, keep, cashOff: Math.max(0, x.cash - x.fees), lead: Math.abs(keep) < 0.01 ? 'same' : keep > 0 ? 'points' : 'cash' };
}
export function tpPointsWords(P, cur = 'USD') {
  if (!P || P.needs?.length) return '';
  const c = v => `${Math.round(v * 100) / 100} cents`;
  return P.lead === 'same' ? `Redeeming gets ${c(P.got)} a point, the same as your own value of a point: cash or points come out even.`
    : P.lead === 'points' ? `Redeeming gets ${c(P.got)} a point, more than your own value of a point. Paying with points uses ${tpMoney(tpR2(P.spend), cur)} of your value (the points and the fees) for a ${tpMoney(P.cash, cur)} price: ${tpMoney(tpR2(P.keep), cur)} less than paying cash.`
      : `Redeeming gets ${c(P.got)} a point, less than your own value of a point. Paying cash keeps ${tpMoney(tpR2(-P.keep), cur)} more of your points' value for another trip.`;
}
export function tpPointsMath(P, x = {}, cur = 'USD') {
  if (!P || P.needs?.length) return [];
  return [`What a point gets here: (${tpMoney(x.cash, cur)} cash price less ${tpMoney(x.fees, cur)} of fees) / ${x.points.toLocaleString('en-US')} points = ${Math.round(P.got * 100) / 100} cents a point`,
    `What the points are worth to you: ${x.points.toLocaleString('en-US')} x ${x.cpp} cents = ${tpMoney(tpR2(P.worth), cur)}`,
    `Redeeming spends ${tpMoney(tpR2(P.worth), cur)} of points plus ${tpMoney(x.fees, cur)} of fees = ${tpMoney(tpR2(P.spend), cur)}, next to ${tpMoney(x.cash, cur)} in cash`,
    'Your own value of a point is yours to set: what you would usually get for one. Points count as value only for a trip you would have paid cash for.'];
}

// ---------- (3) a group trip, split ----------
// people: [{ id, name, shares }] (shares blank is one share). how: 'share' (the total by shares) or 'item' (each item
// split equally among the people in on it; among blank is everyone). items: [{ id, name, amount, among }]. total:
// the trip's total for 'share' (blank: the items added up). Every part is in whole cents and the parts add up to the
// total exactly (a leftover cent goes to the first people in the list).
// The split itself is rowShare of js/math/household.js: shares as percents, an item as an equal split among some.
export function tpSplit({ people = [], how = 'share', items = [], total = null } = {}) {
  const P = people.filter(p => p && p.id != null);
  if (P.length < 2) return { needs: ['people'] };
  const H = { ids: P.map(p => p.id), many: true, method: 'Equal', weights: {} };
  const sh = p => (tpHas(p.shares) && p.shares > 0 ? p.shares : 1), sum = P.reduce((s, p) => s + sh(p), 0);
  const cents = v => Math.round(v * 100);
  const spread = (amount, row) => { // one amount in cents to each person, adding up exactly
    const c = cents(amount), raw = P.map(p => c * rowShare(row, p.id, H)), base = raw.map(Math.floor);
    let left = c - base.reduce((s, v) => s + v, 0);
    const order = raw.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let k = 0; left > 0 && k < order.length; k++) { if (raw[order[k][1]] > 0) { base[order[k][1]]++; left--; } }
    return base;
  };
  let byPerson = P.map(() => 0), rows = [];
  if (how === 'item') {
    const list = items.filter(i => tpHas(i.amount));
    if (!list.length) return { needs: ['items'] };
    rows = list.map(i => { const among = Array.isArray(i.among) && i.among.length ? i.among.filter(id => H.ids.includes(id)) : []; const part = spread(i.amount, { values: { splitHow: 'Equal', splitAmong: among } }); byPerson = byPerson.map((v, k) => v + part[k]); return { id: i.id, name: i.name, amount: i.amount, among: among.length ? among : H.ids, parts: part.map(v => v / 100) }; });
  } else {
    const T = tpHas(total) ? total : items.filter(i => tpHas(i.amount)).reduce((s, i) => s + i.amount, 0);
    if (!tpHas(total) && !items.some(i => tpHas(i.amount))) return { needs: ['total'] };
    const pcts = Object.fromEntries(P.map(p => [p.id, sh(p) / sum]));
    byPerson = spread(T, { values: { splitHow: 'Percent', splitPcts: pcts } });
    rows = [{ id: 'total', name: 'The trip', amount: T, among: H.ids, parts: byPerson.map(v => v / 100) }];
  }
  const parts = P.map((p, k) => ({ id: p.id, name: p.name ?? p.id, shares: sh(p), amount: byPerson[k] / 100 }));
  return { needs: [], how, parts, rows, total: byPerson.reduce((s, v) => s + v, 0) / 100, shares: sum };
}
export function tpSplitWords(S, cur = 'USD') {
  if (!S || S.needs?.length) return '';
  return `${S.parts.map(p => `${p.name} ${tpMoney(p.amount, cur)}`).join(', ')}: ${tpMoney(S.total, cur)} in all, ${S.how === 'item' ? 'each line split among the people in on it' : 'split by shares'}.`;
}
export function tpSplitMath(S, cur = 'USD', names = {}) {
  if (!S || S.needs?.length) return [];
  const nm = id => names[id] ?? S.parts.find(p => p.id === id)?.name ?? id;
  if (S.how === 'item') return [...S.rows.map(r => `${r.name}: ${tpMoney(r.amount, cur)} / ${r.among.length} (${r.among.map(nm).join(', ')}) = ${tpMoney(tpR2(r.amount / r.among.length), cur)} each`),
    'Each person\'s part is their lines added up. A leftover cent goes to the first person in the list, so the parts add up to the total.'];
  return [`${S.shares} ${S.shares === 1 ? 'share' : 'shares'} in all: ${S.parts.map(p => `${p.name} ${p.shares}`).join(', ')}`,
    ...S.parts.map(p => `${p.name}: ${tpMoney(S.rows[0].amount, cur)} x ${p.shares} / ${S.shares} = ${tpMoney(p.amount, cur)}`), 'One currency for everyone, so nobody is paid back at a rate.'];
}

// ---------- (4) the FIRE journey map ----------
// measure: what the stage is read on. worth: cash and investments less debt (or the app's own net worth). cash: money
// set aside. debt: the costly debt left (cards and other consumer debt). invested: what is invested, next to the
// Coast number or the FI number of the app's own engine.
export const TP_STAGES = [
  { id: 'dig', name: 'Digging out', what: 'What you own is more than what you owe', measure: 'worth', target: 0 },
  { id: 'k1', name: 'First $1k', what: '$1,000 set aside for a surprise', measure: 'cash', target: TP_RULES.firstK },
  { id: 'debt', name: 'Debt free', what: 'No card or other costly debt left', measure: 'debt', target: 0 },
  { id: 'k100', name: '$100k', what: '$100,000 of net worth', measure: 'worth', target: TP_RULES.k100 },
  { id: 'coast', name: 'Coast', what: 'Invested enough to stop adding and still reach FI on time', measure: 'invested', target: 'coast' },
  { id: 'fi', name: 'FI', what: 'Work is optional', measure: 'invested', target: 'fi' },
];
// x: { cash, debt, invested, worth (blank: cash + invested - debt), coast, fi (the app's own numbers), monthly (what
// is left to save a month), trip (the trip's cost), when: { stage id: months from now, from the app's own projection },
// whenAfter: { stage id: months with the trip in, from the app's own projection }, fiDays (the app's own FI date
// change, in days) }. The trip is paid from cash first, then from investments. A stage with no date from the app gets
// one at what is saved a month, before growth (the ladder's own way for net worth, js/math/ladder.js), marked est.
// A stage the trip does not take back moves later by the months of saving the trip takes (est), unless the app says.
export function tpJourney(x = {}) {
  const cash = tpHas(x.cash) ? x.cash : null, debt = tpHas(x.debt) ? x.debt : null, invested = tpHas(x.invested) ? x.invested : null;
  const worth = tpHas(x.worth) ? x.worth : cash != null && debt != null && invested != null ? cash + invested - debt : null;
  const trip = tpHas(x.trip) && x.trip > 0 ? x.trip : null, monthly = tpHas(x.monthly) && x.monthly > 0 ? x.monthly : null;
  const fromCash = trip == null || cash == null ? null : Math.min(Math.max(0, cash), trip);
  const after = trip == null ? null : { cash: cash == null ? null : cash - fromCash, invested: invested == null || fromCash == null ? null : invested - (trip - fromCash), debt, worth: worth == null ? null : worth - trip };
  const now = { cash, invested, debt, worth };
  const tgt = s => (s.target === 'coast' ? (tpHas(x.coast) ? x.coast : null) : s.target === 'fi' ? (tpHas(x.fi) ? x.fi : null) : s.target);
  const read = (s, v) => {
    const have = v[s.measure], t = tgt(s);
    if (have == null || t == null) return { have, target: t, done: null, pct: null, left: null };
    if (s.measure === 'debt') return { have, target: 0, done: have <= 0, pct: have <= 0 ? 1 : null, left: Math.max(0, have) };
    const done = have >= t, pct = done ? 1 : t > 0 ? Math.max(0, have) / t : null;
    return { have, target: t, done, pct, left: Math.max(0, t - have) };
  };
  const shift = trip != null && monthly != null ? trip / monthly : null;
  const est = (s, R) => (R.done ? 0 : R.left != null && monthly != null && s.measure !== 'debt' && s.measure !== 'invested' ? Math.ceil(R.left / monthly) : null);
  const stages = TP_STAGES.map(s => {
    const R = read(s, now), A = after ? read(s, after) : null;
    const given = tpHas(x.when?.[s.id]) ? x.when[s.id] : null;
    const months = R.done ? 0 : given ?? est(s, R);
    let mAfter = null, estAfter = false;
    if (A) {
      if (tpHas(x.whenAfter?.[s.id])) mAfter = x.whenAfter[s.id];
      else if (A.done) mAfter = 0;
      else if (months != null && shift != null) { mAfter = (R.done ? 0 : months) + shift; estAfter = true; }
    }
    return { ...s, ...R, months, est: !R.done && given == null && months != null, after: A ? { ...A, months: mAfter, est: estAfter, back: R.done === true && A.done === false } : null };
  });
  const here = stages.findIndex(s => s.done === false), unknown = stages.filter(s => s.done == null).map(s => s.name);
  const back = stages.filter(s => s.after?.back).map(s => s.name);
  const hereAfter = after ? stages.findIndex(s => (s.after?.done ?? s.done) === false) : null;
  return { stages, here: here < 0 ? (unknown.length ? null : stages.length) : here, hereAfter: hereAfter == null ? null : hereAfter < 0 ? stages.length : hereAfter, unknown, trip, monthly,
    monthsOfSaving: shift, back, fiDays: tpHas(x.fiDays) ? x.fiDays : null, worth, fromCash };
}
// Days for a change of months, and the words of a change in days (negative is sooner).
export const tpDays = months => (tpHas(months) ? Math.round(months * TP_RULES.daysPerMonth) : null);
export function tpDayWords(days) {
  if (!tpHas(days)) return 'No date yet';
  const n = Math.abs(Math.round(days));
  return n < 1 ? 'No change' : `${n.toLocaleString('en-US')} ${n === 1 ? 'day' : 'days'} ${days < 0 ? 'sooner' : 'later'}`;
}
export function tpJourneyWords(J, cur = 'USD') {
  if (J.here == null) return J.unknown.length ? `Tap ${J.unknown.length === 1 ? 'one more number' : 'a few more numbers'} below to see where you are.` : '';
  const at = J.here >= J.stages.length ? 'You are past every stage: work is optional.' : `You are at ${J.stages[J.here].name}${J.here > 0 ? `, with ${J.stages.slice(0, J.here).map(s => s.name).join(', ')} done` : ''}.`;
  if (J.trip == null) return at;
  const moves = J.back.length ? ` The trip takes you back under ${J.back.join(' and ')} for a while.` : J.monthsOfSaving != null ? ` The trip is about ${Math.round(J.monthsOfSaving * 10) / 10} months of what you save, so the stages ahead move about that much later.` : '';
  return `${at}${moves}${J.fiDays != null ? ` FI: ${tpDayWords(J.fiDays).toLowerCase()}.` : ''}`;
}
export function tpJourneyMath(J, cur = 'USD') {
  const M = v => tpMoney(Math.round(v), cur), out = [];
  if (J.worth != null) out.push(`Net worth: ${M(J.worth)}`);
  for (const s of J.stages) {
    if (s.done == null) { out.push(`${s.name}: tap ${s.measure === 'invested' ? 'what you have invested and your plan' : s.measure === 'debt' ? 'what you owe' : 'your cash, investments and debt'} to place it`); continue; }
    const tail = s.done ? 'reached' : `${M(s.left)} to go${s.months != null ? `, about ${s.months} ${s.months === 1 ? 'month' : 'months'}${s.est ? ' at what you save a month, before growth' : ' on your plan'}` : ''}`;
    out.push(`${s.name}: ${s.measure === 'debt' ? `${M(s.have)} owed` : `${M(s.have)} of ${M(s.target)}`}, ${tail}`);
  }
  if (J.trip != null) {
    out.push(`The trip: ${M(J.trip)}, ${J.fromCash != null ? `${M(J.fromCash)} from cash${J.trip > J.fromCash ? ` and ${M(J.trip - J.fromCash)} from investments` : ''}` : 'from cash first, then investments'}`);
    if (J.monthsOfSaving != null) out.push(`${M(J.trip)} / ${M(J.monthly)} saved a month = ${Math.round(J.monthsOfSaving * 10) / 10} months of saving`);
    if (J.fiDays != null) out.push('FI: your plan\'s own FI date, run again with the trip in, next to the date you have now.');
  }
  return out;
}
