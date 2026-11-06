// SPDX-License-Identifier: AGPL-3.0-only
// The bank fire drill and stranded money (batch 44, Phase 4 Track 2 wave 1, M9F). Pure: no DOM.
//
// The drill: pick a bank account (by default the one the paycheck lands in). If it froze today, with no notice:
//   - which paychecks land in it and which bills draw from it in the next RULES.fireDrillDays days (from the calendar,
//     js/month.js instances, so every date and amount is the one Cash flow › Calendar shows);
//   - the cash that is out of reach: its balance, any account at the same bank, and the paychecks that would land
//     there in the window. An account or card with no bank set counts as at the same bank until someone answers it
//     (QUESTIONS 367, 389: banks often freeze every account and card a person has there); a payment app is never a bank's.
//     Until each one is answered there are two readings (QUESTIONS 388): the drill as it stands (all at this bank) and
//     readings.elsewhere (every unanswered one at another bank). One whose name suggests an online bank (ref.fireDrill.
//     onlineBanks) carries likely: 'other', a hint for the tap only: it still counts as unanswered;
//   - what can still be reached: cash at other banks, cash at home, and the room on a card that is not at that bank
//     (a card with no limit typed has no room counted). Money set aside for taxes is listed apart and not counted,
//     as the runway and the layers do;
//   - how many days that covers the must-pay bills: housing, utilities and phone, food, getting to work and
//     childcare (the childcare line only, QUESTIONS 390), health (the DRAFTT needs), and the minimum on every other debt. With only a gut number, the whole gut number
//     counts (the must-pay part is not split out yet). A card cannot pay rent or another debt, so the days with the
//     card are the fewer of (cash + card room) / every must-pay a day and cash / (housing and minimums) a day;
//   - the order to pay in when not all can be paid (ref.fireDrill.order: housing, utilities, food, getting to work
//     and childcare, health, then minimums; CFPB and NFCC, js/registry/assumptions.js; childcare QUESTIONS 365): every outflow in the window, in that order,
//     paid from what can be reached until it runs out (what the card can take goes on it after the cash).
// Stranded money: what a platform holds back (the net a day x the hold days), payment app balances, workplace plans
// marked Old job, and those with nothing going in that are not marked Current job (QUESTIONS 368), the DOL's Retirement Savings Lost and Found and unclaimed property
// (missingmoney.com, run with NAUPA). Each is a row the coach ticks as checked (program.fireDrill.stranded).
// The backup plan: a second bank at a different institution, a backup card, a direct deposit split, where the payroll
// change form lives, and (for platform, cash and self-employed work) a month of must-pay money outside the main bank.
import { ok, needs, fmt } from './result.js';
import { inputsOf } from './metrics.js';
import { instances, ymOf, addMonths } from '../month.js';
import { myShare, inFat } from './spending.js';
import { cardMinimum } from './debt.js';
import { platformOf } from './earnings.js';
import { institutionOf } from '../institutions.js';
import { bankKeyOf } from '../privacy.js';
import { RULES } from '../registry/assumptions.js';

const DAY = 86400000;
const isoOf = t => new Date(t).toISOString().slice(0, 10);
const round2 = x => Math.round(x * 100) / 100;
const sum = (list, f = x => x) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
export const BANK_TYPES = ['Checking', 'Savings or HYSA', 'Money market', 'CD', 'Payment app']; // where a bank or an app holds the money (Cash on hand is in hand)
export const WORKPLACE = ['401(k)', '403(b)', '457', 'TSP'];
const MUST = ['housing', 'utilities', 'food', 'transport', 'health', 'minimums'];

export const fireDrillState = doc => doc?.program?.fireDrill || {};
export function setFireDrill(store, patch, label = 'Fire drill') { store.setIn('program', ['fireDrill'], { ...fireDrillState(store.doc), ...patch }, label); }

// The bank accounts that could be frozen, each with its bank and owner.
export function bankAccounts(doc) {
  return (doc.records || []).filter(r => r.kind === 'account' && r.values?.group === 'cash' && BANK_TYPES.includes(r.type) && r.status !== 'Not for me')
    .map(r => ({ id: r.id, name: r.name || r.type, type: r.type, owner: r.owner ?? null, balance: r.values.balance ?? null, forTaxes: r.values.purpose === 'Taxes',
      bank: institutionOf(doc, r) ? bankKeyOf(institutionOf(doc, r).id) : r.values?.bankKey ?? null, bankName: institutionOf(doc, r)?.name ?? null })); // a row kept private keeps only its bank key (js/privacy.js)
}
// The everyday account for a row's owner: their first checking (else a joint one, else any), else the first bank
// account not set aside for taxes.
export function mainAccount(accounts, owner = null) {
  const usable = accounts.filter(a => !a.forTaxes && a.type !== 'CD');
  const checking = usable.filter(a => a.type === 'Checking');
  const pick = list => (owner && list.find(a => a.owner === owner)) || list.find(a => !a.owner || a.owner === 'Joint') || list[0] || null;
  return pick(checking) ?? pick(usable);
}
// Where a paycheck lands: its Lands in account, else its owner's everyday account. Cash tips are in hand.
export function landsInOf(r, accounts) {
  const id = r?.values?.landsIn;
  return accounts.find(a => a.id === id) ?? mainAccount(accounts, r?.owner === 'Partner' ? 'Partner' : r?.owner === 'Me' ? 'Me' : null);
}
// Where a bill or debt payment draws from: Paid with (an account's id, or checking / savings), else its owner's
// everyday account. A bill on a card is on the card.
export function drawsFromOf(r, accounts, cards = []) {
  const p = r?.paidWith ?? null;
  if (p && cards.some(c => c.id === p)) return { card: p };
  const byId = accounts.find(a => a.id === p);
  if (byId) return byId;
  const owner = r?.owner === 'Partner' ? 'Partner' : r?.owner === 'Me' ? 'Me' : null;
  if (p === 'savings') return accounts.find(a => /saving/i.test(a.type) && !a.forTaxes && (!owner || a.owner === owner || !a.owner)) ?? mainAccount(accounts, owner);
  return mainAccount(accounts, owner);
}
// Two rows at the same bank: both banks known and equal, or the coach said so on the drill (program.fireDrill.sameBank,
// keyed 'a:b'; true same, false another bank). known: whether it is known either way. Not known: assume says which
// way it counts (QUESTIONS 367, 389: a bank account or a card counts as the same bank until someone answers it).
export function sameBankOf(a, b, said = {}, { assume = false } = {}) {
  if (!a || !b) return { same: false, known: false };
  if (a.id === b.id) return { same: true, known: true };
  if (a.bank && b.bank) return { same: a.bank === b.bank, known: true, from: 'institutions' };
  const v = said[`${a.id}:${b.id}`] ?? said[`${b.id}:${a.id}`];
  return typeof v === 'boolean' ? { same: v, known: true, from: 'said' } : assume ? { same: true, known: false, assumed: true } : { same: false, known: false };
}
// Two bank accounts with no bank said: the same bank. A payment app is never a bank's, so that one is known.
const isApp = a => a?.type === 'Payment app';
export const sameBankAcct = (a, b, said = {}) => (a && b && a.id !== b.id && (isApp(a) || isApp(b)) ? { same: false, known: true, from: 'app' } : sameBankOf(a, b, said, { assume: true }));

// QUESTIONS 388: does a row's name (or its bank's name) suggest an online bank? words: ref.fireDrill.onlineBanks.words.
// The type "Savings or HYSA" is every savings account's type, so the type alone does not count.
const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function onlineWordsOf(row, words = []) {
  const text = [row?.name, row?.bankName].filter(Boolean).join(' ');
  return words.filter(w => new RegExp(`(^|[^a-z0-9])${esc(w)}($|[^a-z0-9])`, 'i').test(text)).map(w => w.toLowerCase());
}
// Likely another bank: either row looks like an online bank, unless both name the same one (Ally checking, Ally savings).
export function likelyOtherOf(a, b, words = [], generic = []) {
  const wa = onlineWordsOf(a, words), wb = onlineWordsOf(b, words);
  if (!wa.length && !wb.length) return false;
  const brand = w => !generic.map(g => g.toLowerCase()).includes(w);
  return !wa.filter(brand).some(w => wb.includes(w));
}

// Which tier of the order a calendar entry (or a Budget line) belongs to. order: ref.fireDrill.order.
export function tierOf(item, order) {
  const t = order.find(o => (o.kinds || []).includes(item.kind)
    || (item.debtType && (o.debtTypes || []).includes(item.debtType))
    || (item.category && item.line && (o.lines?.[item.category] || []).some(w => String(item.line).toLowerCase().includes(w.toLowerCase()))) // QUESTIONS 390: one line of a category
    || (item.category && (o.categories || []).includes(item.category))
    || (item.gut && o.gut)
    || (item.draftt && (o.draftt || []).includes(item.draftt)));
  if (t) return t;
  if (item.debtType) return order.find(o => o.debts) ?? order.at(-1);
  return order.at(-1);
}

// The minimum a debt must get this month: a card's minimum (M30), else its payment.
export function minimumOf(d) {
  if (d.inFull || !(d.balance > 0)) return 0;
  if (d.type === 'Credit card') return cardMinimum({ balance: d.balance, apr: d.apr }).value ?? d.payment ?? 0;
  return d.payment ?? 0;
}

// The must-pay bills a month, from the lines (DRAFTT needs) or the gut number, and how much of it a card can take.
export function mustPayOf(x, order) {
  const mine = l => myShare(l, { roommates: x.roommates ?? 0 }).value ?? 0;
  const minimums = sum(x.debts.filter(d => !['Mortgage', 'Car loan'].includes(d.type)), minimumOf);
  const housingDebt = sum(x.debts.filter(d => d.type === 'Mortgage'), d => (d.inFull ? 0 : d.payment ?? 0));
  const carDebt = sum(x.debts.filter(d => d.type === 'Car loan'), d => (d.inFull ? 0 : d.payment ?? 0));
  const typed = (x.typedLines || []).filter(l => l.amount != null && !x.dupOf?.[l.id] && l.status !== 'Not for me');
  const tierLine = l => tierOf({ category: l.category, draftt: l.draftt, line: l.name }, order).id;
  const housingLines = sum(typed.filter(l => tierLine(l) === 'housing'), mine);
  if (x.spendingSource === 'lines') {
    const must = typed.filter(l => MUST.includes(tierLine(l)) || inFat(l));
    const lines = sum(must, mine);
    const monthly = lines + minimums + housingDebt + carDebt;
    const housing = housingLines + housingDebt;
    return { source: 'lines', monthly, housing, minimums, cardable: Math.max(0, monthly - housing - minimums), lines: must.length,
      text: `${must.length} must-pay Budget ${must.length === 1 ? 'line' : 'lines'} (housing, utilities and phone, food, getting to work and childcare, health) ${fmt.money(lines)}${housingDebt + carDebt ? ` + ${fmt.money(housingDebt + carDebt)} of mortgage and car payments` : ''} + ${fmt.money(minimums)} of minimum payments = ${fmt.money(monthly)} a month.` };
  }
  if (x.gutTotal == null) return null;
  // A gut number that holds the debt payments keeps the mortgage and car payments as they are; every other debt's
  // payment comes out and its minimum goes back in. One that does not hold them gets them added.
  const holds = x.debtPaymentsOutsideSpending === 0 && x.debts.some(d => !d.inFull && d.payment);
  const otherPay = holds ? sum(x.debts.filter(d => !['Mortgage', 'Car loan'].includes(d.type)), d => (d.inFull ? 0 : d.payment ?? 0)) : 0;
  const added = holds ? 0 : housingDebt + carDebt;
  const monthly = Math.max(0, x.gutTotal - otherPay) + added + minimums;
  const housing = housingLines + housingDebt;
  const parts = [`Your spending number ${fmt.money(x.gutTotal)}`, otherPay ? `less ${fmt.money(otherPay)} of debt payments in it` : null,
    added ? `+ ${fmt.money(added)} of mortgage and car payments` : null, minimums || otherPay ? `+ ${fmt.money(minimums)} of minimum payments` : null].filter(Boolean);
  return { source: 'gut', monthly, housing, minimums, cardable: Math.max(0, monthly - housing - minimums), lines: 0,
    text: `${parts.join(' ')} = ${fmt.money(monthly)} a month: all your spending, since the needs are not split out yet (Budget lines split them).` };
}

// Days a pot covers. Whole days, rounded down: the day it runs short is not covered.
export function daysCovered({ cash, card = 0, mustMonthly, housing = 0, minimums = 0 }) {
  if (!(mustMonthly > 0)) return { cash: null, withCard: null };
  const perDay = m => m * 12 / 365;
  const c = Math.floor(cash / perDay(mustMonthly));
  const fixed = housing + minimums;
  const both = (cash + card) / perDay(mustMonthly);
  const w = Math.floor(fixed > 0 ? Math.min(both, cash / perDay(fixed)) : both);
  return { cash: Math.max(0, c), withCard: Math.max(0, w) };
}

// The order to pay in: rows sorted by tier, then date; cash first, then card room for a tier a card can take.
export function payOrder(rows, { cash, card = 0 }, order) {
  let left = Math.max(0, cash), room = Math.max(0, card);
  const rank = id => order.findIndex(o => o.id === id);
  return [...rows].sort((a, b) => rank(a.tier) - rank(b.tier) || a.date.localeCompare(b.date)).map(r => {
    const fromCash = Math.min(left, r.amount); left -= fromCash;
    const can = order.find(o => o.id === r.tier)?.card;
    const fromCard = can ? Math.min(room, r.amount - fromCash) : 0; room -= fromCard;
    const short = round2(r.amount - fromCash - fromCard);
    return { ...r, fromCash: round2(fromCash), fromCard: round2(fromCard), short: short > 0.005 ? short : 0 };
  });
}

// Everything on the calendar from today for the window, with the account each lands in or draws from.
function windowOf(doc, ref, now, days) {
  const from = isoOf(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = isoOf(new Date(`${from}T00:00:00Z`).getTime() + (days - 1) * DAY);
  const yms = [ymOf(now)];
  while (yms.at(-1) < to.slice(0, 7)) yms.push(addMonths(yms.at(-1), 1));
  const list = yms.flatMap(ym => instances(doc, ref, ym, { now })).filter(i => i.date >= from && i.date <= to && i.kind !== 'win' && i.status !== "Didn't happen" && !(i.maybe && !i.counted));
  return { from, to, list };
}

// The drill for one account. opts.account: its id (default: where the paycheck lands). opts.other: ids of rows to read
// as at another bank (the second reading, QUESTIONS 388).
export function fireDrillOf(doc, ref, { now = new Date(), account = undefined, other = null } = {}) {
  const fd = fireDrillState(doc);
  const order = ref.fireDrill?.order || [];
  const days = RULES.fireDrillDays;
  const accounts = bankAccounts(doc);
  const x = inputsOf(doc, ref, now);
  const recs = new Map((doc.records || []).map(r => [r.id, r]));
  const cards = (doc.records || []).filter(r => r.kind === 'debt' && r.type === 'Credit card' && r.status !== 'Not for me');
  const incomes = x.income.filter(i => i.r.kind === 'income');
  const biggest = [...incomes].sort((a, b) => (b.takeHome?.value ?? 0) - (a.takeHome?.value ?? 0))[0];
  const defaultAcct = (biggest ? landsInOf(biggest.r, accounts) : null) ?? mainAccount(accounts);
  const pickId = account === undefined ? fd.account ?? null : account;
  const acct = accounts.find(a => a.id === pickId) ?? defaultAcct;
  const base = { accounts, account: acct, defaultId: defaultAcct?.id ?? null, days, order };
  if (!acct) return { ...base, result: needs('M9F', ['a checking or savings account'], { unit: 'days' }) };
  const said = { ...(fd.sameBank || {}) };
  for (const id of other || []) said[`${acct.id}:${id}`] = false;

  // The calendar's next days, each entry with where its money goes.
  const W = windowOf(doc, ref, now, days);
  const debtsById = new Map(x.debts.map(d => [d.id, d]));
  const cardOf = id => cards.find(c => c.id === id) ?? null;
  const bankOfRow = r => (institutionOf(doc, r) ? bankKeyOf(institutionOf(doc, r).id) : r.values?.bankKey ?? null);
  const frozenCard = c => sameBankOf(acct, { id: c.id, bank: bankOfRow(c) }, said, { assume: true }).same; // QUESTIONS 389
  const entries = W.list.map(i => {
    const r = recs.get(i.recId) ?? null;
    if (i.kind === 'income') {
      const where = i.cash ? null : landsInOf(r, accounts);
      return { ...i, dir: 'in', amount: round2(i.planned), where: where?.id ?? null, inHand: !!i.cash };
    }
    const amount = round2(-i.planned);
    const card = i.onCard ? cards.find(c => c.name === i.onCard) ?? null : null;
    const src = card ? { card: card.id } : r && (r.kind === 'bill' || r.kind === 'debt') ? drawsFromOf(r, accounts, cards) : mainAccount(accounts);
    const d = r?.kind === 'debt' ? debtsById.get(r.id) : null;
    const line = r?.kind === 'bill' ? { category: r.values?.category, draftt: r.values?.draftt, line: r.name ?? null } : {};
    return { ...i, dir: 'out', amount, where: src?.card ? null : src?.id ?? null, card: src?.card ?? null, debtType: d?.type ?? null, debt: d, ...line, gut: !!i.gut };
  });
  const atFrozen = id => { const a = accounts.find(y => y.id === id); return !!a && sameBankAcct(acct, a, said).same; };
  const group = list => { // one row per thing (a paycheck's dates together, a weekly line's weeks together)
    const m = new Map();
    for (const e of list) {
      const k = `${e.recId ?? e.key.split('@')[0]}|${e.name}`;
      const g = m.get(k) ?? { name: e.name, kind: e.kind, recId: e.recId, dates: [], total: 0, hold: e.hold ?? 0, spread: !!e.spread, guessDate: !!e.guessDate };
      g.dates.push(e.date); g.total = round2(g.total + e.amount); m.set(k, g);
    }
    return [...m.values()];
  };
  const inFrozen = entries.filter(e => e.dir === 'in' && e.where && atFrozen(e.where));
  const outFrozen = entries.filter(e => e.dir === 'out' && ((e.where && atFrozen(e.where)) || (e.card && frozenCard(cardOf(e.card)))));
  const inElsewhere = entries.filter(e => e.dir === 'in' && !(e.where && atFrozen(e.where)));

  // Out of reach and still reachable.
  const rel = a => sameBankAcct(acct, a, said);
  const sameBank = accounts.filter(a => a.id !== acct.id && rel(a).same).map(a => ({ ...a, known: rel(a).known, assumed: !!rel(a).assumed, from: rel(a).from ?? null }));
  const others = accounts.filter(a => a.id !== acct.id && !rel(a).same).map(a => ({ ...a, known: rel(a).known, from: rel(a).from ?? null }));
  const inHand = (doc.records || []).filter(r => r.kind === 'account' && r.values?.group === 'cash' && r.type === 'Cash on hand' && r.status !== 'Not for me')
    .map(r => ({ id: r.id, name: r.name || r.type, type: r.type, balance: r.values.balance ?? null, inHand: true }));
  const reachAccts = [...others.filter(a => !a.forTaxes), ...inHand];
  const cardRows = cards.map(c => {
    const bank = bankOfRow(c), sb = sameBankOf(acct, { id: c.id, bank }, said, { assume: true }); // QUESTIONS 389
    const limit = c.values?.limit ?? null, balance = c.values?.balance ?? 0;
    return { id: c.id, name: c.name || 'Credit card', limit, balance, room: limit == null || sb.same ? null : Math.max(0, round2(limit - balance)), same: sb.same, known: sb.known, assumed: !!sb.assumed, from: sb.from ?? null, bankName: institutionOf(doc, c)?.name ?? null };
  });
  const reachCash = round2(sum(reachAccts, a => a.balance));
  const cardRoom = round2(sum(cardRows, c => c.room));
  const taxes = round2(sum(others.filter(a => a.forTaxes), a => a.balance));
  const paychecksThere = round2(sum(inFrozen, e => e.amount));
  const unreachable = { balance: acct.balance ?? 0, sameBank, sameBankTotal: round2(sum(sameBank, a => a.balance)), paychecks: paychecksThere };
  unreachable.total = round2(unreachable.balance + unreachable.sameBankTotal + paychecksThere);

  // Days of must-pay bills the reachable money covers.
  const must = mustPayOf({ ...x, roommates: doc.profile?.roommates ?? 0 }, order);
  const cover = must ? daysCovered({ cash: reachCash, card: cardRoom, mustMonthly: must.monthly, housing: must.housing, minimums: must.minimums }) : { cash: null, withCard: null };

  // The order: every outflow in the window not on a card that still works, debts split into the minimum and the rest.
  const rows = [];
  for (const e of entries.filter(y => y.dir === 'out' && !(y.card && !frozenCard(cardOf(y.card))))) {
    const t = tierOf(e, order);
    if (e.debt && t.debts) {
      const min = Math.min(e.amount, minimumOf(e.debt));
      rows.push({ name: e.debt.type === 'Credit card' ? `${e.debt.name}: the minimum` : e.name, date: e.date, amount: round2(min), tier: t.id, recId: e.recId, guessDate: !!e.guessDate });
      if (e.amount - min > 0.005) rows.push({ name: `${e.debt.name}: above the minimum`, date: e.date, amount: round2(e.amount - min), tier: order.at(-1).id, recId: e.recId, guessDate: !!e.guessDate });
    } else rows.push({ name: e.name, date: e.date, amount: e.amount, tier: t.id, recId: e.recId, spread: !!e.spread, guessDate: !!e.guessDate });
  }
  const merged = new Map(); // a weekly line's weeks are one row, dated its first week
  for (const r of rows) {
    const k = `${r.recId ?? r.name}|${r.name}|${r.tier}`, g = merged.get(k);
    if (g) { g.amount = round2(g.amount + r.amount); g.times += 1; if (r.date < g.date) g.date = r.date; } else merged.set(k, { ...r, times: 1 });
  }
  const pool = round2(reachCash + sum(inElsewhere, e => e.amount));
  const walk = payOrder([...merged.values()], { cash: pool, card: cardRoom }, order);
  const shortTiers = [...new Set(walk.filter(r => r.short > 0).map(r => r.tier))];

  const next = inFrozen[0] ?? null;
  const text = must == null ? null
    : `Cash you can still reach ${fmt.money(reachCash)} / (${fmt.money(must.monthly)} of must-pay bills a month x 12 / 365 = ${fmt.money(must.monthly * 12 / 365)} a day) = ${cover.cash} days.${cardRoom ? ` With ${fmt.money(cardRoom)} of card room (a card cannot pay rent or another debt): ${cover.withCard} days.` : ''}`;
  const result = must == null ? needs('M9F', ['spending (a gut number or Budget lines)'], { unit: 'days' }) : ok('M9F', cover.cash, text, { unit: 'days' });

  // QUESTIONS 388, 389: every account and card whose bank is not known yet, and the second reading with all of them at
  // another bank. names: the ones whose answer moves the money (a balance, pay landing there, a card's room).
  // asks: every account and card whose bank Institutions does not settle, answered (answer 'same' or 'other', tapped on
  // the drill) or not (null); pending: the ones not answered yet.
  const ob = ref.fireDrill?.onlineBanks || {};
  const answerOf = r => (r.from === 'said' ? (r.same ? 'same' : 'other') : null);
  const asks = [
    ...accounts.filter(a => a.id !== acct.id && (!rel(a).known || rel(a).from === 'said')).map(a => ({ id: a.id, kind: 'account', name: a.name, balance: a.balance, forTaxes: a.forTaxes, answer: answerOf(rel(a)), likely: likelyOtherOf(acct, a, ob.words, ob.generic) ? 'other' : null })),
    ...cardRows.filter(c => !c.known || c.from === 'said').map(c => ({ id: c.id, kind: 'card', name: c.name, balance: c.balance, limit: c.limit, answer: answerOf(c), likely: likelyOtherOf(acct, c, ob.words, ob.generic) ? 'other' : null })),
  ];
  const pending = asks.filter(x => x.answer == null);
  let readings = null;
  if (pending.length && !other) {
    const B = fireDrillOf(doc, ref, { now, account: acct.id, other: pending.map(p => p.id) });
    const moves = p => (p.kind === 'card' ? (B.reachable.cards.find(c => c.id === p.id)?.room ?? 0) > 0
      : !p.forTaxes && ((p.balance ?? 0) > 0 || entries.some(e => e.dir === 'in' && e.where === p.id)));
    const names = pending.filter(moves).map(p => p.name);
    const differ = B.cover.cash !== cover.cash || B.cover.withCard !== cover.withCard;
    const elsewhere = { days: B.cover.cash, withCard: B.cover.withCard, reach: B.reachable.cash, cardRoom: B.reachable.cardRoom, outOfReach: B.unreachable.total,
      result: B.result.value == null ? B.result : { ...B.result, text: `${B.result.text} This reads ${names.length ? names.join(', ') : 'each one not answered yet'} as at another bank.` } };
    readings = { pending, names: names.length ? names : pending.map(p => p.name), differ, at: { days: cover.cash, withCard: cover.withCard, reach: reachCash }, elsewhere };
    if (result.value != null) result.text = `${result.text} This reads ${pending.map(p => p.name).join(', ')} as at the same bank, out of reach, until each is answered.`;
  }

  return { ...base, window: { from: W.from, to: W.to }, isDefault: acct.id === defaultAcct?.id,
    incoming: group(inFrozen), outgoing: group(outFrozen), nextPaycheck: next ? { name: next.name, date: next.date, amount: next.amount } : null,
    unreachable, reachable: { accounts: reachAccts, cards: cardRows, cash: reachCash, cardRoom, taxes, comingIn: round2(sum(inElsewhere, e => e.amount)) },
    others, must, cover, order: walk, pool, shortTiers, result, asks, pending, readings };
}

// Platform payouts held back: the net a day times the hold days.
export function platformHeld(p) {
  if (!p || p.net == null || !p.holdDays) return null;
  return round2(p.net * 12 / 365 * p.holdDays);
}
// Work that banks and payment apps close accounts over more often: platform payouts, cash tips, self-employment.
export function closureRiskOf(x) {
  return x.income.some(i => i.platform || (i.extra ?? 0) > 0 || i.taxType === '1099' || ['Self-employed', 'Platform', 'Tips'].includes(i.r?.type));
}

// The backup plan and stranded money, each item with whether the data already shows it and the coach's tick.
export function backupPlanOf(doc, ref, D, { now = new Date() } = {}) {
  const fd = fireDrillState(doc), ticks = fd.checks || {};
  const x = inputsOf(doc, ref, now);
  const acct = D.account;
  const second = acct ? D.others.find(a => a.known && !a.forTaxes && a.type !== 'Payment app') : null;
  const card = acct ? D.reachable.cards.find(c => c.known && !c.same) : null;
  const w2 = x.income.some(i => i.taxType === 'W-2' || (!i.taxType && i.r?.type === 'Job'));
  const platform = x.income.some(i => i.platform);
  const formPicks = [...(w2 ? ['Payroll app or HR portal', 'Ask HR or a manager'] : []), ...(platform ? ['Payout settings on each platform'] : []),
    ...(x.income.some(i => i.taxType === '1099' && !i.platform) ? ["Each payer's direct deposit form"] : [])];
  const items = [
    { id: 'secondBank', label: 'A second bank at a different institution', auto: second ? `${second.name}${second.bankName ? ` at ${second.bankName}` : ''}` : null,
      how: 'An account at another bank or credit union, so one closure never reaches all of the money. Open it before it is needed.' },
    { id: 'backupCard', label: 'A backup card from another bank', auto: card ? `${card.name}${card.room != null ? `, ${fmt.money(card.room)} of room` : ''}` : null,
      how: 'A card that does not belong to the main bank pays for food and gas while a frozen account is sorted out.' },
    { id: 'split', label: 'Direct deposit split between the two', auto: null,
      how: 'Part of each paycheck lands in the second account (most payroll systems take a dollar amount or a percent).' },
    { id: 'payrollForm', label: 'Where the payroll change form lives', auto: null, picks: formPicks.length ? formPicks : ['Payroll app or HR portal', 'Ask HR or a manager'],
      how: 'Changing where pay lands can take a pay cycle or two, so knowing where to do it saves days.' },
  ];
  if (closureRiskOf(x)) items.push({ id: 'month', label: 'A month of must-pay money outside the main bank', auto: D.must && D.reachable.cash >= D.must.monthly ? `${fmt.money(D.reachable.cash)} you can still reach` : null,
    how: 'Cash at home, or a second bank. A month covers the time a closed account takes to send its balance back.' });
  for (const it of items) { const t = ticks[it.id]; it.done = !!it.auto || (it.id === 'payrollForm' ? !!t?.pick : !!t); it.pick = t?.pick ?? null; it.at = t?.at ?? null; }

  const stranded = [];
  for (const i of x.income.filter(y => y.platform)) {
    const held = platformHeld(i.platform);
    stranded.push({ id: `platform:${i.r.id}`, kind: 'platform', label: `${i.r.name || i.platform.name}: payouts held back`, amount: held, // the row's name (a neutral one when kept private)
      how: held ? `About ${fmt.money(held)} sits there at any time (${fmt.money(i.platform.net)} a month x 12 / 365 x ${i.platform.holdDays} days held). If the platform closes the account, ask in writing for the held balance to be paid out.` : 'Ask what it holds back and for how long.' });
  }
  for (const a of D.accounts.filter(y => y.type === 'Payment app')) stranded.push({ id: `app:${a.id}`, kind: 'app', label: `${a.name}: a payment app balance`, amount: a.balance,
    how: 'A payment app balance is not a bank account. Move what is not needed this week to the bank you keep.' });
  // QUESTIONS 368: a plan marked Old job is listed; one with nothing going in is listed unless it is marked Current job.
  const idle = r => r.values?.contribution == null && r.values?.salaryPct == null && !x.income.some(i => (i.r.values?.contributionPct ?? 0) > 0 && (r.owner ?? 'Me') === (i.r.owner ?? 'Me'));
  const plans = (doc.records || []).filter(r => r.kind === 'account' && WORKPLACE.includes(r.type) && r.status !== 'Not for me'
    && (r.values?.planJob === 'Old job' || (r.values?.planJob !== 'Current job' && idle(r))));
  const choices = 'Four choices: leave it, roll it to an IRA, roll it into the new job\'s plan, or cash it out (taxed, plus a 10% penalty before 59 and a half). Ask for a direct transfer, never a check.';
  for (const r of plans) {
    const old = r.values?.planJob === 'Old job';
    stranded.push({ id: `plan:${r.id}`, kind: 'plan', recId: r.id, job: r.values?.planJob ?? null, label: `${r.name || r.type}: ${old ? 'from an old job' : 'nothing going in'}`, amount: r.values?.balance ?? null,
      how: old ? choices : `From a job before this one? ${choices}` });
  }
  const links = ref.fireDrill?.links || {};
  stranded.push({ id: 'oldPlans', kind: 'search', label: 'Plans from old jobs', amount: null, url: links.plans?.url ?? null, site: links.plans?.site ?? null,
    how: links.plans?.how ?? 'Search the Department of Labor\'s Retirement Savings Lost and Found for a plan from any past job.' });
  stranded.push({ id: 'unclaimed', kind: 'search', label: 'Unclaimed property in every state lived in', amount: null, url: links.unclaimed?.url ?? null, site: links.unclaimed?.site ?? null,
    how: links.unclaimed?.how ?? 'Old deposits, refunds and final paychecks go to the state when a business cannot find you.' });
  const sticks = fd.stranded || {};
  for (const s of stranded) { s.done = !!sticks[s.id]; s.at = sticks[s.id]?.at ?? null; }
  return { items, ready: items.filter(i => i.done).length, stranded, checked: stranded.filter(s => s.done).length, risk: closureRiskOf(x) };
}
