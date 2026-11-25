// SPDX-License-Identifier: AGPL-3.0-only
// Gig and self-employed (run Not built, groups 1 to 5, Part 5; M8G): the parts that need no tax engine, so the game can
// load the same code (tools/game_gig_build.mjs writes game/core/gig.js from this file). No imports, numbers in and out.
// The parts that need the tax engine (the rate's tax, the set-aside rate, half the self-employment tax for the
// retirement base) are in js/math/gigplan.js, which calls js/math/income.js and then the functions here.
//
//   the price floor     what the work must leave after tax (the life, health cover, retirement), the business costs,
//                       and the hours that can be billed (downtime and weeks off taken out): gigNeedOf, gigHoursOf,
//                       gigFloorFrom. The profit before tax comes from the caller: the tax engine on the web app
//                       (gigRate in gigplan.js), the player's own set-aside share in the game (gigProfitFlat).
//   the set-aside       what is owed so far on what came in, next to what was set aside: gigSoFarFrom
//   retirement          what a Solo 401(k), a SEP and an IRA each let you put in on your profit, and which to open
//                       first: gigRetireOf (the limits come from data/reference-2026.json, with their IRS sources)
//   invoices            each invoice's state and days past its due date, the totals, how fast each client pays:
//                       gigInvoiceOf, gigInvoicesOf, gigNudgeOf
//   apps and tips       what each app says you earned, its fee, and what landed in the bank, added up with cash
//                       tips: gigAppsOf (the base of a platform P&L: fees and payout timing are built on it later)
//   Profit First        a split of each payment into profit, pay to you, tax and running costs: gigProfitFirstOf
//
// Empty is not zero: a box not filled gives { ready: false }, never a number made from 0.

const has = x => x !== null && x !== undefined && x !== '' && !Number.isNaN(Number(x));
const n0 = x => (has(x) ? Number(x) : 0);

// ---- The price floor ----
// What the work has to leave you in a year after tax: the month's life (takeHome, a month), health cover a month, and
// retirement a year. Health and retirement are counted as paid from money after tax, so the floor runs a little high
// (both can lower income tax for the self-employed); a floor that is a little high is the safe side.
export function gigNeedOf({ takeHome = null, health = 0, retire = 0 } = {}) {
  if (!(n0(takeHome) > 0)) return { ready: false };
  const life = takeHome * 12, care = n0(health) * 12, later = n0(retire);
  return { ready: true, life, health: care, retire: later, year: life + care + later };
}

// The hours that can be billed in a year: hours a week, the share of them that is paid work (the rest is downtime:
// finding work, admin, messages, travel), and weeks with no work (time off, holidays, sick days, slow weeks).
export function gigHoursOf({ hoursWeek = null, billable = null, weeksOff = 0 } = {}) {
  if (!(n0(hoursWeek) > 0) || !(n0(billable) > 0)) return { ready: false };
  const share = Math.min(1, Number(billable)), off = Math.min(51, Math.max(0, n0(weeksOff))), weeks = 52 - off;
  const billableWeek = hoursWeek * share;
  return { ready: true, hoursWeek: Number(hoursWeek), share, weeksOff: off, weeks, billableWeek, year: billableWeek * weeks, allHours: hoursWeek * 52 };
}

// The floor: the profit before tax plus the business costs, over the billable hours. unitHours: the billable hours of
// one unit of work (a session, a job, a project), for a floor a unit; day: 8 billable hours.
export function gigFloorFrom({ profit = null, costs = 0, hours = null, unitHours = null } = {}) {
  if (!has(profit) || !hours?.ready || !(hours.year > 0)) return { ready: false };
  const costsYear = n0(costs) * 12, revenue = Number(profit) + costsYear, hourly = revenue / hours.year;
  return { ready: true, profit: Number(profit), costsYear, revenue, hourly, day: hourly * 8, unit: n0(unitHours) > 0 ? hourly * unitHours : null, unitHours: n0(unitHours) > 0 ? Number(unitHours) : null,
    month: revenue / 12, ifEveryHour: revenue / hours.allHours, downtimeShare: 1 - hours.year / hours.allHours };
}

// The game's way to the profit before tax: the need over what is left after the player's own set-aside share.
export function gigProfitFlat(needYear, share) {
  if (!(needYear >= 0) || !(share >= 0 && share < 1)) return null;
  return needYear / (1 - share);
}

// ---- The set-aside so far ----
// rate: the share of each dollar of profit to set aside (gigSetAside in gigplan.js, or the player's own share).
// earned: profit so far this year; set: what is already set aside (or paid in estimates).
export function gigSoFarFrom({ rate = null, earned = null, set = 0 } = {}) {
  if (!has(rate) || !has(earned)) return { ready: false };
  const owed = Number(earned) * rate, s = n0(set), gap = owed - s;
  return { ready: true, rate, earned: Number(earned), owed, set: s, toMove: Math.max(0, gap), ahead: Math.max(0, -gap), even: Math.abs(gap) < 1 };
}

// ---- Retirement for the self-employed ----
// profit: net profit a year (Schedule C). seHalf: the deductible half of the self-employment tax (from the tax engine
// or a typed number). L: the 2026 limits (gigLimitsOf). age: for catch-up. deferredAtJob: what you already put in a
// 401(k) or 403(b) at a job this year (the deferral limit is one per person across plans). want: what you would like
// to put in this year, or null.
// The base for the self-employed is net earnings: profit less half the self-employment tax (IRS Publication 560). A
// plan whose rate is 25% of pay works out to 20% of that base for the owner (Publication 560's rate for the
// self-employed: 0.25 / 1.25). A Solo 401(k) adds your own deferral, up to 100% of the base, on top of that 20%.
export const GIG_OWNER_RATE = 0.25 / 1.25;
export function gigLimitsOf(limits) {
  const L = limits || {};
  if (!L['401k'] || !L.ira || !L.total415c) return null;
  return { deferral: L['401k'].base, catchUp50: L['401k'].catchUp50, catchUp60to63: L['401k'].catchUp60to63, total: L.total415c, ira: L.ira.base, iraCatchUp50: L.ira.catchUp50, compCap: L.compCap401a17 ?? null, filing5500: L.oneParticipant5500 ?? null };
}
export function gigRetireOf({ profit = null, seHalf = null, age = null, deferredAtJob = 0, want = null, limits = null } = {}) {
  const L = limits;
  if (!L || !has(profit) || !has(seHalf)) return { ready: false };
  const base = Math.max(0, profit - seHalf), comp = L.compCap ? Math.min(base, L.compCap) : base;
  const a = n0(age), catchUp = a >= 60 && a <= 63 ? L.catchUp60to63 : a >= 50 ? L.catchUp50 : 0;
  const employer = GIG_OWNER_RATE * comp;
  const deferRoom = Math.max(0, L.deferral - n0(deferredAtJob));
  const defer = Math.min(deferRoom, base);
  const soloMain = Math.min(defer + employer, L.total, base);
  const soloCatch = Math.min(catchUp, Math.max(0, base - soloMain));
  const solo = { defer, employer: soloMain - defer, catchUp: soloCatch, total: soloMain + soloCatch };
  const sep = Math.min(employer, L.total);
  const ira = Math.min(L.ira + (a >= 50 ? L.iraCatchUp50 : 0), base);
  // Which first (SLAM's rule, not the IRS's): the one with the least paperwork that holds what you want to put in. An
  // IRA is opened in minutes and has no plan to run; a SEP is one form; a Solo 401(k) is a plan document, and a yearly
  // filing (Form 5500-EZ) once it holds more than L.filing5500. An IRA has its own limit, so it sits on top of either.
  const w = has(want) ? Number(want) : null;
  const first = base <= 0 ? null : w == null ? (solo.total > sep ? 'solo' : 'sep') : w <= ira ? 'ira' : w <= sep ? 'sep' : 'solo';
  const most = { solo: solo.total, sep, ira }, withIra = first && first !== 'ira' ? most[first] + ira : ira;
  return { ready: true, profit: Number(profit), seHalf: Number(seHalf), base, comp, catchUp, employer, deferRoom, solo, sep, ira, want: w, first,
    fits: w == null || !first ? null : w <= (first === 'ira' ? ira : most[first]), withIra, short: w != null && first ? Math.max(0, w - withIra) : null,
    soloOverSep: solo.total - sep, limits: L };
}

// ---- Invoices ----
// An invoice: { id, client, amount, sent (YYYY-MM-DD), terms (days, 0 = on receipt) or due (YYYY-MM-DD), paid
// (YYYY-MM-DD or null), paidAmount (null = in full) }. today: YYYY-MM-DD. Dates are counted in whole days, in UTC.
const dayOf = iso => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5 : null);
const isoOf = d => new Date(d * 864e5).toISOString().slice(0, 10);
export const GIG_TERMS = [0, 15, 30, 45, 60];
export const GIG_AGES = [['1 to 30 days', 1, 30], ['31 to 60 days', 31, 60], ['61 to 90 days', 61, 90], ['More than 90 days', 91, Infinity]];
export function gigInvoiceOf(inv, today) {
  const t = dayOf(today), sent = dayOf(inv?.sent);
  if (!inv || !(n0(inv.amount) > 0) || sent == null || t == null) return null;
  const due = dayOf(inv.due) ?? sent + n0(inv.terms ?? 30), paid = dayOf(inv.paid);
  const got = paid != null ? (has(inv.paidAmount) ? Number(inv.paidAmount) : Number(inv.amount)) : 0;
  const status = paid != null ? 'paid' : t > due ? 'past' : 'open';
  return { ...inv, amount: Number(inv.amount), dueDate: isoOf(due), status, daysPast: status === 'past' ? t - due : 0, daysToDue: status === 'open' ? due - t : 0,
    daysToPay: paid != null ? paid - sent : null, paidLate: paid != null ? Math.max(0, paid - due) : null, got, short: paid != null ? Math.max(0, Number(inv.amount) - got) : 0, waiting: paid == null ? Number(inv.amount) : 0 };
}
export function gigInvoicesOf(list = [], today) {
  const rows = (list || []).map(i => gigInvoiceOf(i, today)).filter(Boolean);
  if (!rows.length) return { ready: false, rows: [] };
  const sum = (xs, k) => xs.reduce((s, r) => s + r[k], 0);
  const open = rows.filter(r => r.status === 'open'), past = rows.filter(r => r.status === 'past'), paid = rows.filter(r => r.status === 'paid');
  const ages = GIG_AGES.map(([label, lo, hi]) => { const xs = past.filter(r => r.daysPast >= lo && r.daysPast <= hi); return { label, count: xs.length, total: sum(xs, 'amount') }; });
  const t = dayOf(today), soon = open.filter(r => dayOf(r.dueDate) - t <= 30);
  const clients = [...new Set(rows.map(r => r.client || 'No name'))].map(name => {
    const mine = rows.filter(r => (r.client || 'No name') === name), done = mine.filter(r => r.status === 'paid');
    return { client: name, count: mine.length, waiting: sum(mine, 'waiting'), past: sum(mine.filter(r => r.status === 'past'), 'amount'),
      avgDaysToPay: done.length ? sum(done, 'daysToPay') / done.length : null, avgDaysLate: done.length ? sum(done, 'paidLate') / done.length : null };
  }).sort((a, b) => b.waiting - a.waiting || a.client.localeCompare(b.client));
  const order = { past: 0, open: 1, paid: 2 };
  rows.sort((a, b) => order[a.status] - order[b.status] || b.daysPast - a.daysPast || a.dueDate.localeCompare(b.dueDate));
  return { ready: true, rows, waiting: sum(open, 'amount') + sum(past, 'amount'), notDue: sum(open, 'amount'), past: sum(past, 'amount'), pastCount: past.length,
    got: sum(paid, 'got'), paidCount: paid.length, ages, next30: sum(soon, 'amount'), clients,
    avgDaysToPay: paid.length ? sum(paid, 'daysToPay') / paid.length : null, oldest: past.length ? Math.max(...past.map(r => r.daysPast)) : 0 };
}
// A calm rhythm of reminders (SLAM's own, not a rule): the step for an invoice this many days past its due date.
export const GIG_NUDGES = [{ id: 'note', from: 1 }, { id: 'second', from: 14 }, { id: 'call', from: 30 }, { id: 'pause', from: 60 }];
export function gigNudgeOf(daysPast) {
  if (!(daysPast >= 1)) return null;
  return [...GIG_NUDGES].reverse().find(s => daysPast >= s.from);
}

// ---- Apps and tips ----
// apps: [{ name, earned (what the app shows you earned, tips in), tips (the tips inside it), fee (what the app kept,
// when it shows one; 0 when its earnings are already after its cut), landed (what reached the bank) }], all for the
// same stretch of time. cash: cash tips in that stretch. An app with nothing earned is left out.
export function gigAppsOf({ apps = [], cash = 0 } = {}) {
  const rows = (apps || []).filter(a => a && has(a.earned) && Number(a.earned) > 0).map(a => {
    const earned = Number(a.earned), fee = n0(a.fee), tips = Math.min(earned, n0(a.tips)), expected = Math.max(0, earned - fee);
    const landed = has(a.landed) ? Number(a.landed) : null, gap = landed == null ? null : expected - landed;
    return { name: a.name || 'An app', earned, tips, fee, feeShare: fee / earned, expected, landed, gap,
      state: gap == null ? 'waiting' : Math.abs(gap) < 1 ? 'matches' : gap > 0 ? 'short' : 'over' };
  });
  if (!rows.length) return { ready: false, rows: [] };
  const sum = k => rows.reduce((s, r) => s + (r[k] ?? 0), 0), c = n0(cash);
  const earned = sum('earned'), all = earned + c;
  rows.forEach(r => { r.share = r.earned / all; });
  rows.sort((a, b) => b.earned - a.earned);
  const checked = rows.filter(r => r.landed != null);
  return { ready: true, rows, earned, cash: c, all, tips: sum('tips') + c, appTips: sum('tips'), fee: sum('fee'), expected: sum('expected'),
    landed: checked.length ? checked.reduce((s, r) => s + r.landed, 0) : null, gap: checked.length ? checked.reduce((s, r) => s + r.gap, 0) : null,
    toCheck: rows.filter(r => r.state === 'short' || r.state === 'over').length, top: rows[0] };
}

// ---- Profit First ----
// income: real revenue in a stretch (what came in less what was passed straight through: materials, subcontractors).
// pcts: { profit, owner, tax, opex } as shares. What is left when the shares add to less than 1 shows as `left`.
export const GIG_PF_KEYS = ['profit', 'owner', 'tax', 'opex'];
// The book's sample for a business under $250,000 of real revenue (Profit First, Mike Michalowicz): 5% profit, 50%
// pay to the owner, 15% tax, 30% running costs. A sample to start from, not a rule.
export const GIG_PF_SAMPLE = { profit: 0.05, owner: 0.5, tax: 0.15, opex: 0.3 };
export function gigProfitFirstOf({ income = null, pcts = GIG_PF_SAMPLE } = {}) {
  if (!(n0(income) > 0) || !pcts) return { ready: false };
  const p = Object.fromEntries(GIG_PF_KEYS.map(k => [k, Math.max(0, n0(pcts[k]))]));
  const total = GIG_PF_KEYS.reduce((s, k) => s + p[k], 0);
  if (total > 1 + 1e-9) return { ready: false, over: total };
  const parts = GIG_PF_KEYS.map(k => ({ key: k, pct: p[k], amount: income * p[k] }));
  return { ready: true, income: Number(income), parts, left: income * (1 - total), total, of: Object.fromEntries(parts.map(x => [x.key, x.amount])) };
}
