/* ============================================================================
   SLAM the Game: core/gigcore.js
   PURPOSE     Gig and self-employed math with no tax engine: the price floor from a profit before tax
               and the billable hours, the set-aside so far, retirement room for the self-employed,
               invoices and how late they are, apps and tips added up, and a Profit First split. The
               sheet "Working for yourself" (features/gig.js) uses it.
   INPUT       Numbers, dates (YYYY-MM-DD) and lists. No profile, no screen.
   OUTPUT      Constants: GIG_OWNER_RATE, GIG_TERMS, GIG_AGES, GIG_NUDGES, GIG_CYCLE_DAYS, GIG_PF_KEYS,
               GIG_PF_SAMPLE, and two from data/reference-2026.json: GIG_SAFE_HARBOR (tax.safeHarbor,
               the IRS rules with their source and date) and GIG_DUE (tax.quarterlyDue, month-day).
               Functions: gigNeedOf, gigHoursOf, gigFloorFrom, gigProfitFlat, gigSoFarFrom,
               gigLimitsOf, gigRetireOf, gigInvoiceOf, gigInvoicesOf, gigNudgeOf, gigAppsOf,
               gigPayoutsOf, gigSafeHarborOf, gigVsFloorOf, gigProfitFirstOf.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/gig.js of the main SLAM app, so
               the small pages of the web app and the game have one copy of each rule. To change a
               rule, change the source, then run: node tools/game_gig_build.mjs. The tests fail when
               this copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
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
//                       tips: gigAppsOf
//   platform P&L        fees and payout timing by platform, on top of gigAppsOf: the days a payout takes, the money
//                       that can still be on its way, from the platform's own page (dated) or the person's own taps:
//                       gigPayoutsOf (run Finish everything partly built, Part 14)
//   safe harbor         the least to pay in estimates so no underpayment penalty applies (the IRS rules, dated in
//                       data/reference-2026.json tax.safeHarbor), spread over the four dates, and what is owed by the
//                       next one: gigSafeHarborOf (Part 14, the Tax Command Center)
//   a gig next to the floor  what a gig pays an hour beside the floor an hour: gigVsFloorOf (Part 14, Pricing your power)
//   Profit First        a split of each payment into profit, pay to you, tax and running costs: gigProfitFirstOf
//
// Empty is not zero: a box not filled gives { ready: false }, never a number made from 0.

const has = x => x !== null && x !== undefined && x !== '' && !Number.isNaN(Number(x));
const n0 = x => (has(x) ? Number(x) : 0);

// ---- The price floor ----
// What the work has to leave you in a year after tax: the month's life (takeHome, a month), health cover a month, and
// retirement a year. Health and retirement are counted as paid from money after tax, so the floor runs a little high
// (both can lower income tax for the self-employed); a floor that is a little high is the safe side.
function gigNeedOf({ takeHome = null, health = 0, retire = 0 } = {}) {
  if (!(n0(takeHome) > 0)) return { ready: false };
  const life = takeHome * 12, care = n0(health) * 12, later = n0(retire);
  return { ready: true, life, health: care, retire: later, year: life + care + later };
}

// The hours that can be billed in a year: hours a week, the share of them that is paid work (the rest is downtime:
// finding work, admin, messages, travel), and weeks with no work (time off, holidays, sick days, slow weeks).
function gigHoursOf({ hoursWeek = null, billable = null, weeksOff = 0 } = {}) {
  if (!(n0(hoursWeek) > 0) || !(n0(billable) > 0)) return { ready: false };
  const share = Math.min(1, Number(billable)), off = Math.min(51, Math.max(0, n0(weeksOff))), weeks = 52 - off;
  const billableWeek = hoursWeek * share;
  return { ready: true, hoursWeek: Number(hoursWeek), share, weeksOff: off, weeks, billableWeek, year: billableWeek * weeks, allHours: hoursWeek * 52 };
}

// The floor: the profit before tax plus the business costs, over the billable hours. unitHours: the billable hours of
// one unit of work (a session, a job, a project), for a floor a unit; day: 8 billable hours.
function gigFloorFrom({ profit = null, costs = 0, hours = null, unitHours = null } = {}) {
  if (!has(profit) || !hours?.ready || !(hours.year > 0)) return { ready: false };
  const costsYear = n0(costs) * 12, revenue = Number(profit) + costsYear, hourly = revenue / hours.year;
  return { ready: true, profit: Number(profit), costsYear, revenue, hourly, day: hourly * 8, unit: n0(unitHours) > 0 ? hourly * unitHours : null, unitHours: n0(unitHours) > 0 ? Number(unitHours) : null,
    month: revenue / 12, ifEveryHour: revenue / hours.allHours, downtimeShare: 1 - hours.year / hours.allHours };
}

// The game's way to the profit before tax: the need over what is left after the player's own set-aside share.
function gigProfitFlat(needYear, share) {
  if (!(needYear >= 0) || !(share >= 0 && share < 1)) return null;
  return needYear / (1 - share);
}

// ---- The set-aside so far ----
// rate: the share of each dollar of profit to set aside (gigSetAside in gigplan.js, or the player's own share).
// earned: profit so far this year; set: what is already set aside (or paid in estimates).
function gigSoFarFrom({ rate = null, earned = null, set = 0 } = {}) {
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
const GIG_OWNER_RATE = 0.25 / 1.25;
function gigLimitsOf(limits) {
  const L = limits || {};
  if (!L['401k'] || !L.ira || !L.total415c) return null;
  return { deferral: L['401k'].base, catchUp50: L['401k'].catchUp50, catchUp60to63: L['401k'].catchUp60to63, total: L.total415c, ira: L.ira.base, iraCatchUp50: L.ira.catchUp50, compCap: L.compCap401a17 ?? null, filing5500: L.oneParticipant5500 ?? null };
}
function gigRetireOf({ profit = null, seHalf = null, age = null, deferredAtJob = 0, want = null, limits = null } = {}) {
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
const GIG_TERMS = [0, 15, 30, 45, 60];
const GIG_AGES = [['1 to 30 days', 1, 30], ['31 to 60 days', 31, 60], ['61 to 90 days', 61, 90], ['More than 90 days', 91, Infinity]];
function gigInvoiceOf(inv, today) {
  const t = dayOf(today), sent = dayOf(inv?.sent);
  if (!inv || !(n0(inv.amount) > 0) || sent == null || t == null) return null;
  const due = dayOf(inv.due) ?? sent + n0(inv.terms ?? 30), paid = dayOf(inv.paid);
  const got = paid != null ? (has(inv.paidAmount) ? Number(inv.paidAmount) : Number(inv.amount)) : 0;
  const status = paid != null ? 'paid' : t > due ? 'past' : 'open';
  return { ...inv, amount: Number(inv.amount), dueDate: isoOf(due), status, daysPast: status === 'past' ? t - due : 0, daysToDue: status === 'open' ? due - t : 0,
    daysToPay: paid != null ? paid - sent : null, paidLate: paid != null ? Math.max(0, paid - due) : null, got, short: paid != null ? Math.max(0, Number(inv.amount) - got) : 0, waiting: paid == null ? Number(inv.amount) : 0 };
}
function gigInvoicesOf(list = [], today) {
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
const GIG_NUDGES = [{ id: 'note', from: 1 }, { id: 'second', from: 14 }, { id: 'call', from: 30 }, { id: 'pause', from: 60 }];
function gigNudgeOf(daysPast) {
  if (!(daysPast >= 1)) return null;
  return [...GIG_NUDGES].reverse().find(s => daysPast >= s.from);
}

// ---- Apps and tips ----
// apps: [{ name, earned (what the app shows you earned, tips in), tips (the tips inside it), fee (what the app kept,
// when it shows one; 0 when its earnings are already after its cut), landed (what reached the bank) }], all for the
// same stretch of time. cash: cash tips in that stretch. An app with nothing earned is left out.
function gigAppsOf({ apps = [], cash = 0 } = {}) {
  const rows = (apps || []).filter(a => a && has(a.earned) && Number(a.earned) > 0).map(a => {
    const earned = Number(a.earned), fee = n0(a.fee), tips = Math.min(earned, n0(a.tips)), expected = Math.max(0, earned - fee);
    const landed = has(a.landed) ? Number(a.landed) : null, gap = landed == null ? null : expected - landed;
    return { name: a.name || 'An app', earned, tips, fee, feeShare: fee / earned, expected, landed, gap, hold: has(a.hold) ? Number(a.hold) : null, payout: a.payout || null,
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

// ---- Platform P&L: fees and payout timing (run Finish everything partly built, Part 14) ----
// The days of one payout cycle. A payout that lands each week holds up to a week of earnings, then the hold on top.
const GIG_CYCLE_DAYS = { day: 1, week: 7, month: 30 };
// apps: as gigAppsOf, each with hold (days, the person's own tap) and payout ('day', 'week' or 'month', their tap),
// both optional. stretchDays: the days of the stretch the numbers cover (7 for a week, 30 for a month). platforms:
// data/reference-2026.json platforms; a row's timing comes from the person's tap first, else from the platform's own
// help page (platforms[name].own, dated), else it waits for a tap. A typical figure from a guide is never used here.
// Money still on its way: at most the earnings of the last (cycle + hold) days of the stretch. A row that is short of
// the bank by no more than that reads 'onway' instead of 'short'.
function gigPayoutsOf({ apps = [], cash = 0, stretchDays = null } = {}, platforms = {}) {
  const A = gigAppsOf({ apps, cash });
  if (!A.ready) return A;
  const days = n0(stretchDays) > 0 ? Number(stretchDays) : null;
  const rows = A.rows.map(r => {
    const own = platforms?.[r.name]?.own ?? null;
    const holdDays = r.hold != null ? r.hold : has(own?.holdDays) ? Number(own.holdDays) : null;
    const payout = r.payout || own?.payout || null, cycle = GIG_CYCLE_DAYS[payout] ?? null;
    const from = r.hold != null || r.payout ? 'yours' : own ? 'page' : null;
    const window = holdDays != null && cycle != null ? cycle + holdDays : null;
    const onWayMax = window != null && days ? r.expected * Math.min(1, window / days) : null;
    const state = r.state === 'short' && onWayMax != null && r.gap <= onWayMax + 0.5 ? 'onway' : r.state;
    return { ...r, holdDays, payout, cycle, window, from, own: from === 'page' ? own : null, onWayMax, state };
  });
  const timed = rows.filter(r => r.onWayMax != null);
  return { ...A, rows, top: rows[0], stretchDays: days, onWayMax: timed.length ? timed.reduce((t, r) => t + r.onWayMax, 0) : null,
    untimed: rows.filter(r => r.window == null).map(r => r.name), feeShare: A.earned > 0 ? A.fee / A.earned : 0,
    toCheck: rows.filter(r => r.state === 'short' || r.state === 'over').length, onWay: rows.filter(r => r.state === 'onway').length };
}

// ---- Safe harbor (run Finish everything partly built, Part 14, the Tax Command Center) ----
// thisYear: this year's federal tax, all of it (income tax and self-employment tax). lastYear: last year's total tax
// (Form 1040, the total tax line), or null when not known. lastAgiOver: true when last year's AGI was over the line
// (rule.highAgi), false when not, null when not sure (the higher share is used then, the safe side). lastFull: last
// year's return covered 12 months. withheld: what a job withholds this year. paid: estimates paid so far this year.
// due: the four due dates (YYYY-MM-DD), today: YYYY-MM-DD. rule: data/reference-2026.json tax.safeHarbor.
// The least to pay through the year (withholding and estimates) is the smaller of rule.current of this year's tax and
// rule.prior (or rule.priorHigh) of last year's. None is needed when last year had no tax over a 12-month year, or
// when less than rule.owe is due after withholding. Each date asks for a quarter of it, so by each date the total
// paid should reach 25%, 50%, 75% and 100%.
function gigSafeHarborOf({ thisYear = null, lastYear = null, lastAgiOver = null, lastFull = true, withheld = 0, paid = 0, due = [], today = null, rule = null } = {}) {
  if (!has(thisYear) || !rule) return { ready: false };
  const T = Math.max(0, Number(thisYear)), w = n0(withheld), p = n0(paid), full = lastFull !== false;
  const current = rule.current * T, priorShare = lastAgiOver === false ? rule.prior : rule.priorHigh;
  const prior = has(lastYear) && full ? priorShare * Number(lastYear) : null;
  const none = has(lastYear) && full && Number(lastYear) === 0 ? 'zero' : T - w < rule.owe ? 'small' : null;
  const required = none === 'zero' ? 0 : prior == null ? current : Math.min(current, prior);
  const which = none === 'zero' ? 'zero' : prior != null && prior < current ? 'prior' : 'current';
  const need = none ? 0 : Math.max(0, required - w), each = need / 4;
  const dates = (due || []).map((d, i) => ({ date: d, by: need * (i + 1) / 4, passed: !!today && d < today }));
  const passed = dates.filter(d => d.passed).length, next = dates.find(d => !d.passed) ?? null;
  const byNow = need * passed / 4, byNext = next ? next.by : need;
  return { ready: true, thisYear: T, lastYear: has(lastYear) ? Number(lastYear) : null, current, prior, priorShare, agiSure: lastAgiOver != null,
    required, which, none, withheld: w, paid: p, need, each, dates, next, passed, byNow, catchUp: Math.max(0, byNow - p), byNext, toNext: Math.max(0, byNext - p),
    fullYear: Math.max(0, T - w - p), covered: p >= need - 0.5, rule };
}

// ---- A gig next to the floor (Part 14, Pricing your power) ----
// floor: the floor an hour (gigRate's hourly, or the game's). pay: what a gig or app pays an hour, after its own cut.
// month: what the work has to bring in a month (gigRate's month), for the paid hours a month at each rate.
function gigVsFloorOf({ floor = null, pay = null, month = null } = {}) {
  if (!has(floor) || !(Number(floor) > 0) || !has(pay) || !(Number(pay) > 0)) return { ready: false };
  const f = Number(floor), g = Number(pay), gap = g - f;
  return { ready: true, floor: f, pay: g, gap, share: g / f, atOrAbove: gap >= -0.005,
    hoursMonth: has(month) ? Number(month) / g : null, floorHoursMonth: has(month) ? Number(month) / f : null };
}

// ---- Profit First ----
// income: real revenue in a stretch (what came in less what was passed straight through: materials, subcontractors).
// pcts: { profit, owner, tax, opex } as shares. What is left when the shares add to less than 1 shows as `left`.
const GIG_PF_KEYS = ['profit', 'owner', 'tax', 'opex'];
// The book's sample for a business under $250,000 of real revenue (Profit First, Mike Michalowicz): 5% profit, 50%
// pay to the owner, 15% tax, 30% running costs. A sample to start from, not a rule.
const GIG_PF_SAMPLE = { profit: 0.05, owner: 0.5, tax: 0.15, opex: 0.3 };
function gigProfitFirstOf({ income = null, pcts = GIG_PF_SAMPLE } = {}) {
  if (!(n0(income) > 0) || !pcts) return { ready: false };
  const p = Object.fromEntries(GIG_PF_KEYS.map(k => [k, Math.max(0, n0(pcts[k]))]));
  const total = GIG_PF_KEYS.reduce((s, k) => s + p[k], 0);
  if (total > 1 + 1e-9) return { ready: false, over: total };
  const parts = GIG_PF_KEYS.map(k => ({ key: k, pct: p[k], amount: income * p[k] }));
  return { ready: true, income: Number(income), parts, left: income * (1 - total), total, of: Object.fromEntries(parts.map(x => [x.key, x.amount])) };
}

/* From data/reference-2026.json, written by tools/game_gig_build.mjs (run Finish everything partly built, Part 14). */
const GIG_SAFE_HARBOR = {"current":0.9,"prior":1,"priorHigh":1.1,"highAgi":150000,"highAgiSeparate":75000,"owe":1000,"source":"IRS 2026 Form 1040-ES (irs.gov/pub/irs-pdf/f1040es.pdf): pay the smaller of 90% of the 2026 tax or 100% of the 2025 tax (110% when 2025 AGI was more than $150,000, $75,000 married filing separately); the 2025 return must cover all 12 months. IRS Estimated tax FAQ (irs.gov/faqs/estimated-tax) and Publication 505 (2026, dated Mar 31 2026): no estimated tax is needed when you expect to owe less than $1,000 after withholding and refundable credits, or when the prior year had no tax liability, was a 12-month year and you were a U.S. citizen or resident all year. Read through web search Nov 26 2026 (irs.gov itself does not open from here)"};
const GIG_DUE = ["04-15","06-15","09-15","01-15"];
