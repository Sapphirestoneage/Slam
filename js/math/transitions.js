// SPDX-License-Identifier: AGPL-3.0-only
// Life Transitions (batch 21, M90; Phase 4, Track 2). A session that turns panic into a number: someone between two
// states (a job lost, a job quit, a first job, a marriage, a baby, a divorce, the kids gone) sees how long the money
// lasts and what they would do, in order. Pure: no DOM. Everything is read from the household; the plan only keeps
// the coach's taps (doc.program.transition).
//   The burn      what a month costs at four levels: full spending, the DRAFTT needs, FAT (food, accommodation,
//                 transportation), food and housing only (graceful degradation), each with its runway.
//   The ladder    every source of money, cheapest first, each with its amount and its cost: the buffer, little e,
//                 big e, cutting to the basics (it buys time, it adds no money), side income, benefits, family help
//                 (only if real), investments, a 0% card, a card, retirement money last (penalty and tax).
//   The dip       the money left month by month from today: the burn, income that keeps coming, benefits until
//                 their end, each rung used as it is reached, and the floor (the month the last rung runs out).
//   Tripwires     if/then rules tied to a rung or a month, each placed on the dip.
//   Plan B and C  up to two other paths (a rung first, rungs left out, extra income, a deeper cut), one line each.
import { ownPlanPerson } from '../registry/couples.js';
import { metrics } from './metrics.js';
import { layersOf } from './layers.js';
import { myShare } from './spending.js';
import { growthOf } from './portfolio.js';
import { federalTax, stateTax, isBenefitRow } from './income.js';
import { endYm } from './changes.js';
import { addMonths, ymOf, monthsBetween, monthName } from '../month.js';
import { RULES, LISTS } from '../registry/assumptions.js';
import { gatesOf, visible } from '../gates.js';
import { fmt } from './result.js';

// The ladder, cheapest first. kind: lump (dollars you draw down), cut (lowers the burn), flow (money in each month).
// plain (batch 20): the name on the share view, for parents or a partner who do not know SLAM's words.
export const RUNGS = [
  { id: 'buffer', name: 'Checking buffer', short: 'the buffer', plain: 'The cushion kept in checking', kind: 'lump' },
  { id: 'littleE', name: 'little e', short: 'little e', plain: 'A small emergency fund', kind: 'lump' },
  { id: 'bigE', name: 'big e and other savings', short: 'big e', plain: 'The emergency fund and other savings', kind: 'lump' },
  { id: 'cut', name: 'Cut to the basics', short: 'the cut', kind: 'cut' },
  { id: 'side', name: 'Side income or selling things', short: 'side income', kind: 'flow' },
  { id: 'benefits', name: 'Unemployment or other benefits', short: 'the end of benefits', kind: 'flow' },
  { id: 'family', name: 'Family help', short: 'family help', kind: 'lump' },
  { id: 'invest', name: 'Sell investments (not retirement)', short: 'the investments', kind: 'lump' },
  { id: 'card0', name: '0% card', short: 'the 0% card', kind: 'lump', card: true },
  { id: 'card', name: 'Regular card', short: 'the regular card', kind: 'lump', card: true, expensive: true },
  { id: 'retirement', name: 'Retirement money', short: 'retirement money', kind: 'lump', expensive: true },
];
export const LEVELS = [
  { id: 'full', name: 'Full spending', tip: 'Everything on the Budget, debt payments included' },
  { id: 'draftt', name: 'DRAFTT needs', tip: 'Debt payments, housing, food, transportation, taxes and health: the Budget\'s DRAFTT groups (the same number as big e: DRAFTT)' },
  { id: 'fat', name: 'FAT', tip: 'Food, accommodation and transportation only (the same number as big e: FAT and Lean FI). Debt payments and the rest wait' },
  { id: 'food', name: 'Food and housing only', tip: 'Food and accommodation only: the last level before the floor' },
];
const levelName = id => LEVELS.find(l => l.id === id)?.name ?? id;
export const phase4On = doc => doc?.settings?.phase4 === true;
const sum = (list, f = x => x) => list.reduce((s, x) => s + (f(x) ?? 0), 0);

// A card's cost in the words Eli uses: "using $1,000 for 3 months costs about $60" (simple interest at the APR).
export function cardCost(apr, { amount = RULES.cardExampleAmount, months = RULES.cardExampleMonths } = {}) {
  if (apr == null) return { amount, months, cost: null, text: `Add the APR to see what ${fmt.money(amount)} for ${months} months costs` };
  const cost = amount * apr / 12 * months;
  return { amount, months, cost, text: `Using ${fmt.money(amount)} for ${months} months costs about ${fmt.money(Math.round(cost))}` };
}

// Retirement money taken out now: the 10% additional tax before 59 and a half (none on a 457), and income tax on top
// of the year's other income (federal, and state and city when About you says NY), from the app's own tax math.
// QUESTIONS 252: a Roth IRA's contributions (contributions, the "Roth IRA contributions so far" box) come out first,
// with no tax and no penalty (IRS Pub 590-B, ordering rules); only the growth past them is taxed and penalized.
export function withdrawalCost({ gross, age = null, base = 0, filingStatus = 'Single', place = null, penaltyFree = false, contributions = 0 }, ref) {
  if (!gross) return { gross: 0, penalty: 0, tax: 0, net: 0, rate: 0, free: 0 };
  const free = Math.min(gross, Math.max(0, contributions ?? 0)), growth = gross - free;
  const penalty = penaltyFree || (age != null && age >= RULES.penaltyAge) ? 0 : growth * RULES.earlyPenalty;
  const taxAt = g => { const s = stateTax({ gross: g, filingStatus, place }, ref); return (federalTax({ gross: g, filingStatus }, ref).value ?? 0) + s.state + s.local; };
  const tax = growth ? Math.max(0, taxAt(base + growth) - taxAt(base)) : 0;
  const net = Math.max(0, gross - penalty - tax);
  return { gross, penalty, tax, net, rate: (penalty + tax) / gross, free };
}

// The levels of the burn, from the Budget. Full is what leaves each month (spending plus any debt payments outside
// it); DRAFTT and FAT are the cash layers' own numbers (one answer with big e); food and housing is Food and
// Accommodation. With no Budget lines, only full is known. Each level is never above the one before it.
export function burnLevels(m, layers) {
  const x = m.inputs;
  const full = m.flow?.spending ?? null;
  const mine = l => myShare(l, { roommates: x.roommates ?? 0 }).value ?? 0;
  const lines = (x.lines || []).filter(l => l.status !== 'Not for me');
  const typed = lines.some(l => l.amount != null && l.draftt !== 'Debt');
  const raw = { full, draftt: typed ? layers.monthly.draftt : null, fat: typed ? layers.monthly.fat : null,
    food: typed ? sum(lines.filter(l => ['Food', 'Accommodation'].includes(l.draftt ?? l.values?.draftt)), mine) : null };
  let above = full;
  return LEVELS.map(L => {
    const v = raw[L.id] == null || above == null ? raw[L.id] : Math.min(raw[L.id], above);
    if (v != null) above = v;
    return { ...L, burn: v, needs: v == null ? (L.id === 'full' ? 'monthly spending' : 'Budget lines') : null };
  });
}

// The plan with its template's defaults filled in. null until a template is picked.
export function transitionPlan(doc, ref) {
  const p = doc?.program?.transition;
  if (!p?.template) return null;
  const t = (ref.transitions?.templates || []).find(x => x.id === p.template) ?? ref.transitions?.templates?.at(-1) ?? { stops: [], cut: { when: 'reached', level: 'draftt' } };
  return { ...p, tpl: t, rungs: p.rungs || {}, stops: p.stops || {}, tripwires: p.tripwires || [], plans: (p.plans || []).slice(0, 2), share: p.share || {} };
}

// Every rung, read from the household, with the coach's taps on top. Returns the ladder and what the dip needs.
export function ladderOf(doc, ref, { now = new Date(), plan = transitionPlan(doc, ref), m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }), layers = layersOf(doc, ref, now) } = {}) {
  const x = m.inputs;
  const here = ymOf(now);
  const start = plan?.start && /^\d{4}-\d{2}$/.test(plan.start) ? plan.start : here;
  const startK = Math.max(0, monthsBetween(here, start));
  const taps = plan?.rungs || {};
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const levels = burnLevels(m, layers);
  const lv = Object.fromEntries(levels.map(l => [l.id, l.burn]));

  // Income: benefits are their own rung; a row stops at the start when the template (or the coach) says so.
  const stopTypes = new Set(plan?.tpl?.stops || []);
  const incomes = x.income.filter(i => i.takeHome?.value != null).map(i => ({ id: i.r.id, name: i.r.name || i.r.type, type: i.r.type, monthly: i.takeHome.value, gross: i.gross ?? null, benefit: isBenefitRow(i.r) ? i.benefit : null, due: i.due ?? 0 }));
  const paid = incomes.filter(i => !i.benefit).map(i => ({ ...i, stops: plan?.stops?.[i.id] ?? stopTypes.has(i.type) }));
  const keeps = paid.filter(i => !i.stops);
  const before = sum(paid, i => i.monthly), after = sum(keeps, i => i.monthly);

  // Cash, in the layers' order: what the buffer and little e hold, then everything else in cash (big e, gaps, sinking funds, extra).
  const L = id => layers.layers.find(l => l.id === id)?.filled ?? 0;
  const cash = x.cash ?? 0;
  const buffer = Math.min(cash, L('buffer')), littleE = Math.min(cash - buffer, L('little-e'));
  const bigE = Math.max(0, cash - buffer - littleE);

  // Cards: room on each (limit less balance); a card at 0% until a month at or after the start is the 0% rung.
  const cards = live.filter(r => r.kind === 'debt' && r.type === 'Credit card').map(r => {
    const d = x.debts.find(q => q.id === r.id) ?? {};
    const limit = r.values?.limit ?? null, balance = r.values?.balance ?? 0;
    const promo = r.values?.promoApr != null && r.values.promoApr <= 0.0001 && r.values?.promoEnd && r.values.promoEnd >= start ? r.values.promoEnd : null;
    return { id: r.id, name: r.name || 'Card', limit, room: limit == null ? null : Math.max(0, limit - balance), apr: d.apr ?? null, aprGuess: !!d.aprGuess, promoEnd: promo };
  });
  const roomOf = list => (list.some(c => c.room != null) ? sum(list, c => c.room ?? 0) : null);
  const aprOf = list => { const w = list.filter(c => c.room && c.apr != null); const t = sum(w, c => c.room); return t ? sum(w, c => c.room * c.apr) / t : list.find(c => c.apr != null)?.apr ?? null; };
  const zero = cards.filter(c => c.promoEnd), regular = cards.filter(c => !c.promoEnd);

  // Retirement and other investments.
  const isRet = a => LISTS.retirementTypes.includes(a.type);
  const retAccts = x.accounts.filter(a => a.group === 'investment' && isRet(a) && (a.value ?? 0) > 0);
  const investAccts = x.accounts.filter(a => a.group === 'investment' && !isRet(a) && !['529', 'HSA'].includes(a.type) && (a.value ?? 0) > 0);
  const benefitRows = incomes.filter(i => i.benefit);
  const benefitsMonthly = sum(benefitRows, i => i.monthly);
  const benefitEnd = benefitRows.map(i => (i.benefit.end ? endYm(i.benefit.end) : null)).filter(Boolean).sort().at(-1) ?? null; // the month benefits stop counting
  const benefitEndK = benefitEnd ? Math.max(0, monthsBetween(here, benefitEnd)) : null;
  const benefitMonths = benefitEndK == null ? null : Math.max(0, benefitEndK - startK);
  const taxBase = sum(keeps, i => i.gross ?? i.monthly * 12) + sum(benefitRows, i => i.benefit.monthly) * Math.min(12, benefitMonths ?? 12);
  // Each account's tax stacks on the ones before it (the same return); a Roth IRA's contributions come out free.
  let stacked = taxBase;
  const wd = retAccts.map(a => {
    const rec = live.find(r => r.id === a.id);
    const contributions = a.type === 'Roth IRA' ? growthOf(a.type, rec?.values || {}, a.value).rothBasis ?? 0 : 0;
    const w = withdrawalCost({ gross: a.value, age: x.age, base: stacked, filingStatus: x.filingStatus, place: x.place, penaltyFree: LISTS.penaltyFreeTypes.includes(a.type), contributions }, ref);
    stacked += w.gross - w.free;
    return { ...a, ...w };
  });
  const familyBackup = sum((doc.profile.backups || []).filter(b => b.kind === 'Family help'), b => b.amount ?? 0) || null;

  const typedAmount = id => (taps[id]?.amount != null ? taps[id].amount : null);
  const onOf = (id, dflt) => (taps[id]?.on == null ? dflt : !!taps[id].on);
  const cut = { level: taps.cut?.level ?? plan?.tpl?.cut?.level ?? 'draftt', when: taps.cut?.when ?? plan?.tpl?.cut?.when ?? 'reached' };
  const cutBurn = lv[cut.level] ?? null;
  const card0Room = typedAmount('card0') ?? roomOf(zero), cardRoom = typedAmount('card') ?? roomOf(regular);
  const card0Apr = aprOf(zero), cardApr = aprOf(regular) ?? ref.typicalRates?.['Credit card'] ?? null;
  const promoEnd = zero.map(c => c.promoEnd).sort()[0] ?? null;
  const fam = typedAmount('family') ?? familyBackup;
  const side = { amount: taps.side?.amount ?? null, per: taps.side?.per ?? 'month' };
  const benefitDue = sum(benefitRows, i => i.due);
  const retNet = sum(wd, a => a.net), retGross = sum(wd, a => a.gross), retPenalty = sum(wd, a => a.penalty), retTax = sum(wd, a => a.tax), retFree = sum(wd, a => a.free);

  const R = {
    buffer: { amount: buffer, from: 'household', cost: 0, costText: 'Free: this is what it is for', note: `What the buffer layer holds (${RULES.bufferWeeks} weeks of spending)` },
    littleE: { amount: littleE, from: 'household', cost: 0, costText: 'Free: this is what it is for', note: 'What little e holds' },
    bigE: { amount: bigE, from: 'household', cost: 0, costText: 'Free, then refill it after', note: 'The rest of your cash: big e, sinking funds, anything extra' },
    cut: { amount: lv.full != null && cutBurn != null ? Math.max(0, lv.full - cutBurn) : null, from: 'household', per: 'month', level: cut.level, when: cut.when, burn: cutBurn,
      costText: cutBurn == null ? 'Needs Budget lines to know the levels' : `No dollars: you go without ${fmt.money(Math.max(0, (lv.full ?? 0) - cutBurn))} a month of the rest`, note: `Spend at ${levelName(cut.level)}: it buys time, it adds no money`, needs: cutBurn == null ? 'Budget lines' : null },
    side: { amount: side.amount, per: side.per, from: side.amount != null ? 'typed' : 'none', costText: 'Your time', note: side.per === 'once' ? 'Selling things: once' : 'Side income: a month, from the start', needs: side.amount == null ? 'an amount' : null },
    benefits: { amount: benefitRows.length ? benefitsMonthly : null, per: 'month', from: benefitRows.length ? 'household' : 'none', until: benefitEnd, months: benefitMonths, rows: benefitRows.map(i => i.id),
      costText: benefitRows.length ? (benefitDue > 0.5 ? `About ${fmt.money(Math.round(benefitDue))} of income tax when you file` : 'Taxed when you file') : 'Unemployment is on Income', needs: benefitRows.length ? null : 'unemployment on Income',
      note: benefitRows.length ? (benefitEnd ? `Until ${monthName(benefitEnd, 'short')}` : 'No end date on Income yet') : null },
    family: { amount: fam, from: typedAmount('family') != null ? 'typed' : familyBackup ? 'household' : 'none', costText: 'No dollars; only if it is real', note: familyBackup && typedAmount('family') == null ? 'From Backups of the backups' : 'Only if they have said yes', real: true, needs: fam == null ? 'an amount' : null },
    invest: { amount: investAccts.length ? sum(investAccts, a => a.value) : null, from: investAccts.length ? 'household' : 'none', costText: 'Tax on any gain, and it leaves the market', note: investAccts.map(a => a.name).join(', ') || null, hidden: !investAccts.length && typedAmount('invest') == null },
    card0: { amount: card0Room, apr: card0Apr, promoEnd, from: typedAmount('card0') != null ? 'typed' : zero.length ? 'household' : 'none',
      costText: !zero.length && card0Room == null ? 'No card at 0% on file' : promoEnd ? `0% until ${monthName(promoEnd, 'short')}; then ${card0Apr == null ? 'its APR' : fmt.pct(card0Apr)}. ${cardCost(card0Apr).text} after that` : 'Free while the promo lasts',
      note: zero.length ? zero.map(c => c.name).join(', ') : null, needs: card0Room == null ? (zero.length ? 'the credit limit' : null) : null },
    card: { amount: cardRoom, apr: cardApr, aprGuess: regular.some(c => c.aprGuess), from: typedAmount('card') != null ? 'typed' : regular.length ? 'household' : 'none',
      costText: cardCost(cardApr).text, note: regular.length ? `Room on ${regular.map(c => c.name).join(', ')}` : null, needs: cardRoom == null ? (regular.length ? 'the credit limit' : 'room on a card') : null },
    retirement: { amount: retAccts.length ? retNet : null, gross: retGross, penalty: retPenalty, tax: retTax, free: retFree, from: retAccts.length ? 'household' : 'none',
      costText: retAccts.length ? `${retPenalty ? `The ${fmt.pct(RULES.earlyPenalty)} penalty (${fmt.money(Math.round(retPenalty))}) and tax (about ${fmt.money(Math.round(retTax))})` : retTax > 0.5 ? `Income tax (about ${fmt.money(Math.round(retTax))})` : 'No tax or penalty'}: you keep about ${fmt.money(Math.round(retNet))} of ${fmt.money(Math.round(retGross))}${retFree ? ` (${fmt.money(Math.round(retFree))} of Roth IRA contributions comes out free)` : ''}` : 'No retirement money on file',
      note: retAccts.map(a => a.name).join(', ') || null },
  };
  const defaults = { buffer: buffer > 0, littleE: littleE > 0, bigE: bigE > 0, cut: plan ? ['start'].includes(plan.tpl?.cut?.when) : false, side: side.amount != null, benefits: benefitRows.length > 0,
    family: fam != null && fam > 0, invest: investAccts.length > 0, card0: (card0Room ?? 0) > 0, card: (cardRoom ?? 0) > 0, retirement: retAccts.length > 0 };
  const rungs = RUNGS.map(def => {
    const r = R[def.id];
    const usable = def.kind === 'cut' ? r.burn != null : (r.amount ?? 0) > 0;
    return { ...def, ...r, on: usable && onOf(def.id, defaults[def.id]), usable };
  }).filter(r => !r.hidden);
  return { rungs, levels, start, startK, here, before, after, keeps, stops: paid.filter(i => i.stops), incomes: paid, benefits: { monthly: benefitsMonthly, endK: benefitEndK, end: benefitEnd }, cut, cards, promoK: promoEnd ? monthsBetween(here, promoEnd) : null };
}

// The dip: month by month from today, the money left on every rung that is on. Each month the burn (the cut level
// once the cut is on) less what comes in is drawn from the rungs in order; a surplus goes back into the buffer. A
// card's balance grows by its APR each month (0% while its promo lasts) and that interest is the card's cost.
// opts: order (rung ids, the ladder's by default), off (ids to leave out), level (a fixed burn level: no cut), extra
// ([{ monthly, fromK }] more income), cut ({ level, when } instead of the ladder's).
export function dipOf(lad, { order = null, off = [], level = null, extra = [], cutAs = null, max = RULES.transitionMaxMonths } = {}) {
  const ids = order ?? lad.rungs.map(r => r.id);
  const byId = Object.fromEntries(lad.rungs.map(r => [r.id, r]));
  const on = id => byId[id] && byId[id].on && !off.includes(id);
  const lv = Object.fromEntries(lad.levels.map(l => [l.id, l.burn]));
  const full = level ? lv[level] : lv.full;
  const cutR = byId.cut, cutLevel = cutAs?.level ?? cutR?.level, cutWhen = cutAs?.when ?? cutR?.when;
  const cutOn = !level && (cutAs ? lv[cutLevel] != null : on('cut'));
  const cutBurn = cutOn ? lv[cutLevel] : null;
  const lumps = ids.map(id => byId[id]).filter(r => r && (r.kind === 'lump' || (r.kind === 'flow' && r.id === 'side' && r.per === 'once')) && on(r.id))
    .map(r => ({ id: r.id, left: r.amount ?? 0, card: !!r.card, apr: r.apr ?? 0, promoK: r.id === 'card0' ? lad.promoK : null, drawn: 0, cost: 0, gross: r.gross ?? null, net: r.amount ?? 0 }));
  const cutPos = ids.indexOf('cut');
  const sideM = on('side') && byId.side.per !== 'once' ? byId.side.amount ?? 0 : 0;
  const ben = on('benefits') ? lad.benefits : null;
  if (full == null) return { path: [], floorK: null, lastsPast: false, needs: 'monthly spending', reached: {}, costs: {}, interest: 0, total: 0, runway: null };
  const leftOf = () => sum(lumps, l => l.left);
  const total = leftOf();
  const path = [{ k: 0, ym: lad.here, left: total, by: Object.fromEntries(lumps.map(l => [l.id, l.left])), burn: null, income: null }];
  const reached = {};
  let cutLive = cutOn && cutWhen === 'start', floorK = null, k = 0;
  for (; k < max; k++) {
    const after = k >= lad.startK;
    // The cut, when it waits its turn: once every rung above it is used, the burn drops from this month on.
    if (cutOn && !cutLive && cutWhen === 'reached' && after && lumps.filter(l => ids.indexOf(l.id) < cutPos).every(l => l.left <= 0.0001)) { cutLive = true; reached.cut ??= k; }
    const burn = after && cutLive ? cutBurn : after ? full : lv.full;
    const income = (after ? lad.after : lad.before) + (ben && ben.endK != null ? (k < ben.endK ? ben.monthly : 0) : ben ? ben.monthly : 0)
      + (after ? sideM : 0) + sum(extra.filter(e => k >= lad.startK + (e.fromK ?? 0)), e => e.monthly ?? 0);
    let need = burn - income;
    const need0 = need;
    if (need < 0) { const first = lumps.find(l => !l.card && l.id !== 'retirement') ?? lumps[0]; if (first) first.left -= need; need = 0; }
    for (let i = 0; i < lumps.length && need > 0.0001; i++) {
      const l = lumps[i];
      const take = Math.min(Math.max(0, l.left), need);
      if (take > 0) { reached[l.id] ??= k; l.left -= take; l.drawn += take; need -= take; }
    }
    for (const l of lumps) if (l.card && l.drawn > 0) { const apr = l.promoK != null && k <= l.promoK ? 0 : l.apr; const i = l.drawn * apr / 12; l.drawn += i; l.cost += i; l.left = Math.max(0, l.left - i); } // interest is charged to the card: it uses up what room is left
    if (need > 0.0001) { floorK = k + Math.max(0, Math.min(1, (need0 - need) / need0)); path.push({ k: k + 1, ym: addMonths(lad.here, k + 1), left: 0, by: Object.fromEntries(lumps.map(l => [l.id, 0])), burn, income }); break; }
    path.push({ k: k + 1, ym: addMonths(lad.here, k + 1), left: Math.max(0, leftOf()), by: Object.fromEntries(lumps.map(l => [l.id, Math.max(0, l.left)])), burn, income });
  }
  const costs = {};
  for (const l of lumps) {
    if (l.card) costs[l.id] = l.cost;
    if (l.id === 'retirement' && l.net > 0) costs[l.id] = (l.drawn / l.net) * ((l.gross ?? l.net) - l.net); // the penalty and tax on the part taken
  }
  if (cutOn && cutWhen === 'start') reached.cut = lad.startK;
  return { path, floorK, lastsPast: floorK == null, reached, costs, interest: sum(lumps.filter(l => l.card), l => l.cost), total, runway: floorK == null ? null : Math.max(0, floorK - lad.startK) };
}

// Where each tripwire lands on the dip: a rung's first month, a month typed, or the month the money left drops under
// some months of the burn.
export function tripwiresOf(lad, dip, plan) {
  return (plan?.tripwires || []).map(t => {
    const c = t.if || {};
    let k = null, words = '';
    if (c.kind === 'rung') { const r = lad.rungs.find(x => x.id === c.rung); k = dip.reached[c.rung] ?? null; words = `If I reach ${r?.short ?? 'that rung'}`; }
    else if (c.kind === 'date' && c.ym) { k = Math.max(0, monthsBetween(lad.here, c.ym)); words = `If no offer by ${monthName(c.ym, 'short')}`; }
    else if (c.kind === 'left') { const n = c.months ?? 3; const p = dip.path.find(q => q.burn != null && q.left < n * q.burn); k = p ? p.k : null; words = `If the money left drops under ${n} months`; }
    return { ...t, k, ym: k == null ? null : addMonths(lad.here, Math.floor(k)), words, text: `${words}, ${t.then ? t.then.charAt(0).toLowerCase() + t.then.slice(1) : 'I act'}`, never: k == null };
  }).sort((a, b) => (a.k ?? Infinity) - (b.k ?? Infinity)); // in the order they come up
}

// One line per plan: how long it lasts and what it costs, against the plan as it is.
export function plansOf(lad, base, plan) {
  return (plan?.plans || []).slice(0, 2).map((p, i) => {
    const ids = lad.rungs.map(r => r.id);
    const order = p.first && ids.includes(p.first) ? [p.first, ...ids.filter(id => id !== p.first)] : ids;
    const dip = dipOf(lad, { order, off: p.skip || [], extra: p.extra ? [{ monthly: p.extra, fromK: p.from ?? 0 }] : [], cutAs: p.level ? { level: p.level, when: 'start' } : null });
    const cost = sum(Object.values(dip.costs));
    const months = dip.runway, more = months == null || base.runway == null ? null : months - base.runway;
    const name = p.name || `Plan ${['B', 'C'][i]}`;
    const what = [p.extra ? `${fmt.money(p.extra)} a month more${p.from ? ` from month ${p.from + 1}` : ''}` : null, p.first ? `${lad.rungs.find(r => r.id === p.first)?.name ?? p.first} first` : null,
      (p.skip || []).length ? `without ${(p.skip || []).map(id => lad.rungs.find(r => r.id === id)?.short ?? id).join(', ')}` : null, p.level ? `cut to ${levelName(p.level)}` : null].filter(Boolean).join(', ') || 'the same rungs';
    const lasts = months == null ? 'the money lasts past 10 years' : `lasts ${monthsText(months)}`;
    const diff = more == null ? (base.runway == null || months == null ? '' : ', longer than the plan') : Math.abs(more) < 0.05 ? ', the same as the plan' : `, ${monthsText(Math.abs(more))} ${more > 0 ? 'more' : 'less'}`;
    // The first costly rung it reaches, against the plan's (the cost that matters is when the expensive money starts).
    const costly = ['card', 'retirement'].find(id => dip.reached[id] != null || base.reached[id] != null);
    const at = (d, id) => (d.reached[id] == null ? null : addMonths(lad.here, d.reached[id]));
    const a = costly ? at(dip, costly) : null, b = costly ? at(base, costly) : null;
    const reach = !costly || a === b ? '' : a == null ? `; never reaches ${lad.rungs.find(r => r.id === costly)?.short}` : `; reaches ${lad.rungs.find(r => r.id === costly)?.short} ${monthName(a, 'short')}${b ? ` instead of ${monthName(b, 'short')}` : ''}`;
    return { ...p, id: p.id ?? ['B', 'C'][i], name, dip, months, more, cost, what, line: `${what.charAt(0).toUpperCase()}${what.slice(1)}: ${lasts}${diff}${reach}`, text: `${name} (${what}): ${lasts}${diff}${reach}` };
  });
}
export const monthsText = mo => (mo == null ? 'past 10 years' : mo >= 36 ? `${(mo / 12).toFixed(1)} years` : `${mo.toFixed(1)} months`);

// Everything the screen, the share view and the agenda read, worked out once.
export function transitionOf(doc, ref, { now = new Date() } = {}) {
  const plan = transitionPlan(doc, ref);
  const m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }); // batch 33 (finding 23): the burn and the rungs of one person's plan in Dating and Living together
  const layers = layersOf(doc, ref, now);
  const lad = ladderOf(doc, ref, { now, plan, m, layers });
  const dip = dipOf(lad);
  const levels = lad.levels.map(l => { const d = l.burn == null ? null : dipOf(lad, { level: l.id }); return { ...l, runway: d?.runway ?? null, lasts: !!d?.lastsPast }; });
  const floorYm = dip.floorK == null ? null : addMonths(lad.here, Math.floor(dip.floorK));
  const tripwires = tripwiresOf(lad, dip, plan);
  const plans = plansOf(lad, dip, plan);
  const costs = sum(Object.values(dip.costs));
  const total = dip.total + sum(lad.rungs.filter(r => r.on && r.kind === 'flow' && r.per !== 'once'), r => (r.id === 'benefits' ? (r.amount ?? 0) * (r.months ?? 0) : 0));
  return { on: phase4On(doc), plan, ladder: lad, levels, dip, floorYm, runway: dip.runway, tripwires, plans, costs, total,
    text: dip.needs ? 'Needs monthly spending' : dip.runway == null ? 'The money lasts past 10 years at this burn' : `From ${monthName(lad.start, 'short')} the money lasts ${monthsText(dip.runway)}, to ${monthName(floorYm, 'short')}` };
}

// The coach's taps, saved on the plan (one undo step each).
export function setTransition(store, patch) { store.setIn('program', ['transition'], { ...(store.doc.program?.transition || {}), ...patch }, 'Life Transitions'); }
