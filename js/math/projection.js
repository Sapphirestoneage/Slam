// SPDX-License-Identifier: AGPL-3.0-only
// M9P: the year-by-year projection engine, the core (Phase 5, Batch 50; docs/engines/projection.md). Math only: no
// screen reads it yet, so no number a client has seen moves.
//
// One run walks the household from this month to the end of life: the first 12 months are reported month by month,
// then year by year. Inside, every year is stepped a month at a time, so a phase that ends mid-year (heavy debt gone,
// big e full, work stopping) lands in its own month and the FI month comes out exact.
//
// It reads the household the way every screen does (metrics, M27) and reuses the existing math instead of copying it:
// the one debt plan (M34, debtFirstPlan), the FOO flow (M79, freedFlow), the FI number (M50), SLAM's tax function as
// it is today (householdTax, M10 and M14), the access rules (accessRule) and the limits in the reference data. On top
// it adds what a year-by-year engine is for: each person's age, income that grows and stops, contributions held to the
// legal limit for that person's age in that calendar year, each account's balance by tax type, withdrawals once work
// stops, and flags.
//
// Two modes:
//   'plan' (the default): the engine as designed. Work stops at the stop age (Retire by / FI age, else 65), a debt's
//     payment comes back to the month once the last debt is gone, a shortfall while working is a flag and never a loan.
//   'today': the new features off (no stop, no payment coming back, no limits, no growth), so it must give today's FI
//     date (M53), debt-free date (M31, M34) and Next 12 months to the month. test/projection.test.js checks both.
//
// Seams left for later batches, each marked SEAM below: full tax depth (a withdrawal is not taxed yet, nor is the 10%
// penalty applied; a raise is taxed by today's tax function at today's tables, which is right in real dollars because
// the brackets are indexed), Social Security, RMDs, retirement spending phases, Triple D and Monte Carlo.
import { metrics } from './metrics.js';
import { debtFirstPlan } from './debt.js';
import { freedFlow, taxFreeRoom } from './flow.js';
import { changeAt } from './fi.js';
import { householdTax, householdRates } from './income.js';
import { afterTaxContributions } from './linked.js';
import { accessRule } from './portfolio.js';
import { proposedDoc, PROPOSED_KEYS, proposedOf } from './proposed.js';
import { RULES, LISTS } from '../registry/assumptions.js';
import { gatesOf } from '../gates.js';
import { ownerOf } from '../registry/couples.js';
import { addMonths, ymOf } from '../month.js';

const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
const ymIndex = ym => { const [y, m] = ym.split('-').map(Number); return y * 12 + m - 1; };

// Income that stops when its person stops working. Everything else keeps going (rent from a rental, family help, money
// from a partner, a benefit); unemployment ends on its own date (datedChanges, already in the surplus).
export const EARNED_TYPES = ['Job', 'Partner job', 'Side hustle', 'Self-employed', 'Platform'];
const EARNED = new Set(EARNED_TYPES);
// Once work stops, a shortfall is drawn in this order (projection.md step 10). Roth basis and earnings, the Rule of 55,
// 72(t) and seasoned conversions come with the tax batch; for now a draw from pretax money before 59½ is flagged.
export const WITHDRAW_ORDER = ['cash', 'taxable', 'roth', 'hsa', 'pretax'];
const INVESTED = ['taxable', 'pretax', 'roth', 'hsa'];
const PRETAX = new Set([...LISTS.pretaxTypes, 'Rollover IRA', 'SEP', 'Pension']);

// The account's tax type for the projection: cash, taxable, pretax, Roth or HSA (a 529 or Purpose: Goal is earmarked).
export function bucketOf(type, taxType = null) {
  if (type === 'HSA') return 'hsa';
  if (type === 'Roth IRA' || type === 'Roth 401(k)' || taxType === 'Roth') return 'roth';
  if (PRETAX.has(type)) return 'pretax';
  return 'taxable';
}

// The people, read in one place (Batch 49 changes the people model: only this function reads it). Each person: who,
// the month index they were born (year x 12 + month), their age in months today, life expectancy and stop age.
export function peopleOf(doc, ref, now = new Date()) {
  const p = doc.profile || {}, a = doc.assumptions || {};
  const nowI = ymIndex(ymOf(now));
  const le = a.lifeExpectancy ?? ref.defaults.lifeExpectancy;
  const stop = a.fiAge ?? a.retireAge ?? ref.defaults.retireAge; // the same stop age as M54 and Retire by (x.retireAge)
  const born = (y, m, age) => (y != null && y !== '' ? Number(y) * 12 + (Number(m ?? 1) - 1) : age != null && age !== '' ? nowI - Number(age) * 12 : null);
  const out = [{ key: 'Me', name: p.firstName || 'You', bornIndex: born(p.birthYear, p.birthMonth, p.age), lifeExpectancy: le, stopAge: stop }];
  if (gatesOf(p, doc.client).couple) out.push({ key: 'Partner', name: p.partnerName || 'Partner', bornIndex: born(p.partnerBirthYear, p.partnerBirthMonth, null), lifeExpectancy: le, stopAge: stop });
  return out.map(x => ({ ...x, ageMonths: x.bornIndex == null ? null : nowI - x.bornIndex }));
}

// A yearly contribution limit for a person by their age at the end of that calendar year (IRS: catch-ups count from the
// year you turn 50, 55 for the HSA; ages 60 to 63 get the larger 401(k) catch-up instead). From limits in reference data.
export function contributionLimit(kind, age, ref, { family = false } = {}) {
  const L = ref.limits, k = L['401k'];
  const catch401 = age >= 60 && age <= 63 ? k.catchUp60to63 : age >= 50 ? k.catchUp50 : 0;
  if (kind === '401k') return k.base + catch401;
  if (kind === 'total') return L.total415c + catch401; // 415(c): employee and employer together; catch-ups ride on top
  if (kind === 'ira') return L.ira.base + (age >= 50 ? L.ira.catchUp50 : 0);
  if (kind === 'hsa') return L.hsa[family ? 'family' : 'self'] + (age >= 55 ? L.hsa.catchUp55 : 0);
  return null;
}

// Current vs Proposed's choices as events (projection.md: "Current vs Proposed's changes become events"). Each choice
// starts this month. Later events the engine also takes: { at, kind: 'spending' | 'income', value } (a monthly change
// from month at on) and { at, kind: 'oneOff', value } (a cost in that one month).
export function eventsFromProposed(doc) {
  const p = proposedOf(doc);
  return PROPOSED_KEYS.filter(k => p[k] != null).map(k => ({ at: 0, kind: k, value: p[k] }));
}
const eventChanges = list => list.flatMap(e => (e.kind === 'spending' ? [{ at: e.at, monthly: -e.value, name: e.name ?? 'Spending changes' }]
  : e.kind === 'income' ? [{ at: e.at, monthly: e.value, name: e.name ?? 'Income changes' }]
    : e.kind === 'oneOff' ? [{ at: e.at, monthly: -e.value, name: e.name ?? 'A one-off cost' }, { at: e.at + 1, monthly: e.value, name: e.name ?? 'A one-off cost' }] : []));

const CACHE = new WeakMap();
const keyOf = (now, o) => JSON.stringify([ymOf(now), now.toISOString().slice(0, 10), o.person, o.mode, o.events, o.incomeGrowth]);

// The engine. Returns { id: 'M9P', value (months to FI), months (the first 12), years, start, people, fiMonths, fiYm,
// fiAge, debtFreeMonths, heavyMonths, shortfallYears, lastsToAge, dualAge, flags, notIn, text }. Cached per input
// version (doc._rev, bumped by the store on every change) and options.
export function project(doc, ref, { now = new Date(), person = null, mode = 'plan', events = [], m = null, incomeGrowth = null } = {}) {
  const opts = { person, mode, events: events || [], incomeGrowth };
  const key = keyOf(now, opts), rev = doc._rev ?? 0;
  let hit = CACHE.get(doc);
  if (hit && hit.rev === rev && hit.map.has(key)) return hit.map.get(key);
  if (!hit || hit.rev !== rev) { hit = { rev, map: new Map() }; CACHE.set(doc, hit); }
  const out = run(doc, ref, { now, m, ...opts });
  hit.map.set(key, out);
  return out;
}

function run(doc, ref, { now, person, mode, events, m, incomeGrowth }) {
  const today = mode === 'today';
  const at0 = events.filter(e => !e.at), later = events.filter(e => e.at > 0);
  let d = doc, M = m;
  if (at0.length) { // a choice from today: the same copy Current vs Proposed builds (proposedDoc), then its metrics
    d = proposedDoc({ ...doc, program: { ...(doc.program || {}), proposed: Object.fromEntries(at0.map(e => [e.kind, e.value])) } }, ref, { now });
    M = null;
  }
  M = M ?? metrics(d, ref, { now, person });
  const x = M.inputs, inv = M.investing, rule = M.debtRule;
  const people = peopleOf(d, ref, now);
  const base = { id: 'M9P', mode, people, months: [], years: [], flags: [], notIn: NOT_IN };
  if (M.surplus.value == null || x.invested == null || M.fiNumber.value == null) {
    const need = [...new Set([...(M.surplus.needs || []), ...(M.fiNumber.needs || []), ...(x.invested == null ? ['invested'] : [])])];
    return { ...base, value: null, needs: need.length ? need : ['the surplus, invested and spending'], text: 'The projection needs take-home, spending and what is invested.' };
  }
  const nowYm = ymOf(now), nowI = ymIndex(nowYm), year0 = Number(nowYm.slice(0, 4));
  const goal = x.goalSaving ?? 0, contributions0 = inv.contributions ?? 0, surplus0 = M.surplus.value;
  const surplusChanges = x.changes.filter(c => c.surplus).map(c => ({ at: c.at, monthly: c.surplus, name: c.name }));
  const evCh = eventChanges(later);
  const allChanges = [...surplusChanges, ...evCh];

  // ---- The schedule: the one debt plan and the FOO flow, rerun with later events (reused, never re-implemented).
  let plan = M.debtPlan, flow = M.fooFlow;
  if (evCh.length) {
    if (rule.on) plan = debtFirstPlan(x.debts, { order: x.debtOrder, ids: x.debtCustomOrder, first: rule.first ?? [], surplus: rule.toDebt, extra: x.debtExtra, surplusFrom: M.debtPlan.surplusFrom, changes: [...(rule.changes || []), ...evCh], inflation: x.inflation });
    if (flow) flow = { ...flow, ...freedFlow({ surplus: Math.max(0, surplus0 - contributions0 - goal), heavyMonths: rule.on ? plan.heavyMonths : 0, freed: rule.on ? plan.heavyPayments : 0, bigELeft: flow.bigELeft, taxFreeLeft: flow.room.left, firstMonths: rule.on ? plan.surplusFrom : 0, firstLeft: rule.firstLeft, changes: allChanges }) };
  }
  const freed = rule.on ? plan.heavyPayments : 0;
  const F = rule.on ? plan.surplusFrom ?? 0 : 0; // FOO step 1 (the buffer and little e) fills first
  const H = rule.on ? plan.heavyMonths ?? Infinity : 0; // the surplus pays heavy debt
  const W = flow ? flow.waitMonths ?? Infinity : H; // then big e fills (in cash); after W the surplus is invested
  const dest = k => (k < F ? 'cash' : k < H ? 'debt' : k < W ? 'cash' : inv.investSurplus ? 'invest' : 'cash');
  const stepAt = k => (!flow ? (k < H ? '3' : null) : flow.steps.find(s => k >= s.from && (s.to == null || k < s.to))?.id ?? null);
  // Plan mode: once the last debt is gone, each payment the plan was still rolling comes back to the month (a heavy
  // debt's payment already came back through the FOO flow at H).
  const endedPay = (plan.debts || []).filter(q => !(rule.on && q.heavy)).reduce((s, q) => s + (q.payment ?? 0), 0) + (plan.extra ?? 0);

  // ---- Income rows, payroll saving and contributions, each with its person.
  const mode2 = x.mode;
  const rows = x.income.map(i => {
    const v = i.r.values || {}, n = PAYS[v.payFrequency] ?? 26, own = i.r === x.link.job;
    const pct = v.contributionPct ?? (own ? x.link.incomePct : null) ?? 0;
    const perPay = v.contributionPct == null && own ? x.link.incomePerPaycheck ?? 0 : 0;
    return { id: i.r.id, name: i.r.name ?? i.r.type, type: i.r.type, person: ownerOf(i.r, mode2) === 'Partner' ? 'Partner' : 'Me', earned: EARNED.has(i.r.type) && !i.benefit,
      takeHome: i.takeHome?.value ?? 0, gross: i.benefit ? i.benefit.thisYear : i.gross, pretax: i.pretax ?? 0, taxType: i.benefit ? 'Unemployment' : i.taxType, tips: i.tipsYear ?? 0,
      k401: ((i.gross ?? 0) * pct + perPay * n) / 12, hsa: (x.gates.hsa ? v.hsaFsa ?? 0 : 0) * n / 12, own };
  });
  const matchMonthly = Math.max(0, (inv.alreadyIn ?? 0) - (M.pretaxSaving ?? 0));
  const rothPayroll = x.link.acct?.values?.taxType === 'Roth';
  const payroll0 = rows.reduce((s, r) => s + r.k401 + r.hsa, 0) + (rows.some(r => r.own) ? matchMonthly : 0);
  const payrollResidual = (inv.alreadyIn ?? 0) - payroll0; // zero for every household on file; kept so the total is today's
  const recs = new Map((d.records || []).map(r => [r.id, r]));
  const acctRecs = x.accounts.map(a => recs.get(a.id)).filter(Boolean);
  const after = afterTaxContributions(acctRecs, { payFrequency: x.payFrequency, payrollHsa: x.gates.hsa && x.income.some(i => (i.r.values.hsaFsa ?? 0) > 0) });
  const earmarkedId = id => { const r = recs.get(id); return r?.type === '529' || r?.values?.purpose === 'Goal'; };
  const contribParts = after.parts.filter(p => !earmarkedId(p.id)).map(p => { const r = recs.get(p.id); return { bucket: bucketOf(r?.type, r?.values?.taxType), monthly: p.monthly }; });
  const contribResidual = contributions0 - contribParts.reduce((s, p) => s + p.monthly, 0); // Retirement lines on the Budget
  const rothPlanned = contribParts.filter(p => p.bucket === 'roth').reduce((s, p) => s + p.monthly, 0) * 12;
  const hsaPlanned = contribParts.filter(p => p.bucket === 'hsa').reduce((s, p) => s + p.monthly, 0) * 12;

  // ---- People: stop months, horizon.
  const earnedPeople = new Set(rows.filter(r => r.earned).map(r => r.person));
  const stopMonth = Object.fromEntries(people.map(p => [p.key, today || p.bornIndex == null ? Infinity : Math.max(0, p.bornIndex + 12 * p.stopAge - nowI)]));
  const toLE = people.filter(p => p.bornIndex != null).map(p => p.bornIndex + 12 * p.lifeExpectancy - nowI);
  let horizon = toLE.length ? Math.max(12, Math.ceil(Math.max(...toLE) / 12) * 12) : RULES.maxMonths;
  if (today) horizon = Math.max(horizon, Math.ceil(RULES.maxMonths / 12) * 12);
  const ageAt = (p, k) => (p.bornIndex == null ? null : (nowI + k - p.bornIndex) / 12);
  const me = people[0];

  // ---- The tax seam: take-home in a month where pay has grown or a job has stopped, by today's tax function.
  const growth = today ? 0 : incomeGrowth ?? RULES.projectionIncomeGrowth ?? 0;
  const taxRows = (list, f) => list.filter(r => r.gross != null && r.taxType).map(r => ({ id: r.id, person: r.person, gross: r.earned ? r.gross * f : r.gross, pretax: r.earned ? r.pretax * f : r.pretax, taxType: r.taxType, tips: r.tips }));
  const taxOpts = { filingStatus: x.filingStatus, place: x.place, year: year0 };
  let hh0 = null;
  const taxOf = (hh, id) => hh?.rows?.[id]?.total ?? 0;
  const thCache = new Map();
  const incomeAt = k => {
    const y = Math.floor(k / 12), f = growth ? (1 + growth) ** y : 1;
    const active = rows.map(r => !r.earned || k < stopMonth[r.person]);
    const ck = `${f}|${active.join('')}`;
    if (thCache.has(ck)) return thCache.get(ck);
    let dTH = 0;
    if (f !== 1 || active.some(a => !a)) {
      hh0 = hh0 ?? householdTax(taxRows(rows, 1), taxOpts, ref);
      const on = rows.filter((r, i) => active[i]);
      const hh = householdTax(taxRows(on, f), taxOpts, ref); // SEAM: full tax depth (later batch) replaces this call
      rows.forEach((r, i) => {
        if (!active[i]) { dTH -= r.takeHome; return; }
        if (r.gross == null || !r.taxType) { if (r.earned) dTH += r.takeHome * (f - 1); return; }
        const g1 = r.earned ? r.gross * f : r.gross, p1 = r.earned ? r.pretax * f : r.pretax;
        dTH += ((g1 - r.gross) - (p1 - r.pretax) - (taxOf(hh, r.id) - taxOf(hh0, r.id))) / 12;
      });
    }
    const v = { f, active, dTH };
    thCache.set(ck, v);
    return v;
  };
  const marginalOf = who => { hh0 = hh0 ?? householdTax(taxRows(rows, 1), taxOpts, ref); const r = householdRates(hh0, ref, { person: who }); return r.marginal ?? 0; };

  // ---- Balances.
  const B = { cash: 0, setAside: 0, taxable: 0, pretax: 0, roth: 0, hsa: 0, earmarked: 0, other: 0 };
  for (const a of x.accounts) {
    const v = a.value ?? 0, r = recs.get(a.id);
    if (a.group === 'cash') B[a.forTaxes ? 'setAside' : 'cash'] += v;
    else if (a.group === 'investment') B[earmarkedId(a.id) ? 'earmarked' : bucketOf(a.type, r?.values?.taxType)] += v;
    else B.other += v;
  }
  const things = x.things.reduce((s, t) => s + (t.value ?? 0), 0);
  const fixedDebt = x.debts.filter(q => (q.balance ?? 0) > 0 && !plan.debts.some(p => p.id === q.id)).reduce((s, q) => s + q.balance, 0); // paid in full, or no APR or payment: stays as it is
  const debtAt = k => { const row = plan.path[Math.min(k, plan.path.length - 1)] || []; return row.reduce((s, v) => s + v, 0) + fixedDebt; };
  const invested = () => INVESTED.reduce((s, b) => s + B[b], 0);
  const netWorth = k => B.cash + B.setAside + invested() + B.earmarked + B.other + things - debtAt(k);
  const snap = k => ({ cash: B.cash, setAside: B.setAside, taxable: B.taxable, pretax: B.pretax, roth: B.roth, hsa: B.hsa, earmarked: B.earmarked, invested: invested(), debt: debtAt(k), netWorth: netWorth(k) });
  const start = snap(0);

  const g = (1 + x.realReturn) ** (1 / 12), gc = (1 + (RULES.projectionCashReturn ?? 0)) ** (1 / 12);
  const target = M.fiNumber.value;
  const fiCap = today ? RULES.maxMonths : horizon;
  let fiMonths = invested() >= target ? 0 : null;
  const family = !!x.gates.couple;
  const room0 = taxFreeRoom(d, x, ref, now);
  const cum = {}; // calendar-year running totals for the limits: `${year}|${person}|${kind}`
  const tfRoom = {}; // Tax-Free Growth room by calendar year
  const roomOf = cy => {
    if (!tfRoom[cy]) {
      if (cy === year0) tfRoom[cy] = { roth: room0.rothLeft, hsa: room0.hsaLeft };
      else {
        const age = me.bornIndex == null ? 0 : cy - Math.floor(me.bornIndex / 12);
        const hsaPay = rows.reduce((s, r) => s + r.hsa, 0) * 12;
        tfRoom[cy] = { roth: Math.max(0, contributionLimit('ira', age, ref) - rothPlanned), hsa: x.gates.hsa ? Math.max(0, contributionLimit('hsa', age, ref, { family }) - hsaPay - hsaPlanned) : 0 };
      }
    }
    return tfRoom[cy];
  };
  const IS_INV = { taxable: true, pretax: true, roth: true, hsa: true };
  let monthIn = 0; // what goes into invested accounts this month
  const add = (bucket, v) => { if (!v) return; B[bucket] += v; yr.in[bucket] = (yr.in[bucket] ?? 0) + v; if (IS_INV[bucket]) { monthIn += v; yr.toInvested += v; } };
  const GROW = [...INVESTED, 'earmarked'];
  const rowWho = rows.map(r => people.find(p => p.key === r.person) ?? me);
  const bornYear = p => (p.bornIndex == null ? null : Math.floor(p.bornIndex / 12));
  const markAt = new Map(); // month -> [person, age] for the age markers
  for (const p of people) if (p.bornIndex != null) for (const a of [50, 55, 59.5, 62, 65, 67, 73]) { const k = p.bornIndex + Math.round(a * 12) - nowI; if (k >= 0 && k < horizon) markAt.set(k, [...(markAt.get(k) || []), [p.key, a]]); }

  const months = [], years = [], flags = [];
  let yr = null, firstUnmet = null;
  const newYear = y => ({ year: y + 1, startYm: addMonths(nowYm, 12 * y), takeHome: 0, payroll: 0, match: 0, contributions: 0, toEarmarked: 0, surplus: 0, toDebt: 0, interest: 0, debtPaid: 0,
    toCash: 0, toInvested: 0, growth: 0, withdrawn: 0, shortfall: 0, unmet: 0, limited: 0, k401: 0, in: {}, out: {}, start: snap(12 * y), flags: [] });
  const flag = (k, kind, extra = {}) => { const f = { kind, month: k, ym: addMonths(nowYm, k), year: Math.floor(k / 12) + 1, ...extra }; flags.push(f); if (yr) yr.flags.push(f); };
  let stopped = false;

  // Income only changes where a person stops or (with a raise) at each plan anniversary.
  const incPoints = new Set(Object.values(stopMonth).filter(Number.isFinite));
  if (growth) for (let k = 12; k < horizon; k += 12) incPoints.add(k);
  let inc = null;
  for (let k = 0; k < horizon; k++) {
    const y = Math.floor(k / 12), cy = Math.floor((nowI + k) / 12);
    if (k % 12 === 0) { yr = newYear(y); years.push(yr); }
    for (const [who, a] of markAt.get(k) || []) flag(k, 'age', { person: who, age: a });
    if (!today) for (const p of people) if (k === stopMonth[p.key] && earnedPeople.has(p.key)) flag(k, 'stop', { person: p.key, age: p.stopAge });
    if (k === 0 || incPoints.has(k)) inc = incomeAt(k);
    const retired = !today && earnedPeople.size > 0 && rows.every((r, i) => !r.earned || !inc.active[i]);
    const noEarners = earnedPeople.size === 0;
    if (retired && !stopped) stopped = true;
    // 1. Growth for the month (M53's order: grow, then this month's money goes in).
    monthIn = 0;
    for (const b of GROW) { const gr = B[b] * (g - 1); B[b] += gr; yr.growth += gr; }
    B.cash *= gc;
    // 2. Payroll saving: the 401(k), the HSA and the match, to the legal limit for that person's age that calendar year.
    let payroll = 0, back = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!inc.active[i] || (!r.k401 && !r.hsa && !r.own)) continue;
      const by = bornYear(rowWho[i]), age = by == null ? 0 : cy - by;
      const take = (kind, want, limit) => {
        if (today || limit == null || !want) return want;
        const id = `${cy}|${r.person}|${kind}`, got = Math.max(0, Math.min(want, limit - (cum[id] ?? 0)));
        cum[id] = (cum[id] ?? 0) + got;
        return got;
      };
      const k401 = take('401k', r.k401 * inc.f, contributionLimit('401k', age, ref));
      const hsa = take('hsa', r.hsa * inc.f, contributionLimit('hsa', age, ref, { family }));
      const match = r.own ? take('total', matchMonthly * inc.f, Math.max(0, contributionLimit('total', age, ref) - (cum[`${cy}|${r.person}|401k`] ?? 0))) : 0;
      const over = r.k401 * inc.f - k401 + (r.hsa * inc.f - hsa);
      if (over > 0.005) { back += over * (1 - marginalOf(r.person)); yr.limited += over; } // SEAM: pay over the limit comes back taxed at the marginal rate
      add(rothPayroll && r.own ? 'roth' : 'pretax', k401); add('hsa', hsa); add('pretax', match);
      payroll += k401 + hsa + match; yr.match += match; yr.k401 += k401;
    }
    if (payrollResidual && !retired) { add('pretax', payrollResidual * inc.f); payroll += payrollResidual * inc.f; }
    yr.payroll += payroll;
    // 3. The month's surplus: today's (M27) with the known changes ahead, then what the projection moves.
    const ended = !today && plan.months != null && k >= plan.months ? endedPay : 0;
    const dSpend = retired && (d.assumptions || {}).retirementSpending != null && x.spending != null ? x.spending - d.assumptions.retirementSpending : 0;
    const S = surplus0 + changeAt(allChanges, k) + inc.dTH + back + ended + dSpend;
    yr.takeHome += (x.takeHome ?? 0) + inc.dTH + back; yr.surplus += S;
    // 4. Contributions set on accounts and Retirement lines (out of the surplus), the goal money, then the FOO flow.
    let contrib = 0;
    if (!retired) {
      for (const p of contribParts) add(p.bucket, p.monthly);
      if (contribResidual) add('taxable', contribResidual);
      contrib = contributions0;
      if (goal) { B.earmarked += goal; yr.toEarmarked += goal; }
    }
    yr.contributions += contrib;
    const sf = S - (retired ? 0 : contrib + goal);
    const A = sf + (k >= H ? freed : 0);
    let need = 0;
    const where = dest(k);
    if (where === 'debt') { if (k >= F) yr.toDebt += Math.max(0, sf); if (sf < 0) need = -sf; }
    else if (where === 'cash') { if (A >= 0) { B.cash += A; yr.toCash += A; } else need = -A; }
    else if (A >= 0) {
      const room = roomOf(cy);
      const r1 = Math.min(A, room.roth); room.roth -= r1; add('roth', r1);
      const r2 = Math.min(A - r1, room.hsa); room.hsa -= r2; add('hsa', r2);
      add('taxable', A - r1 - r2);
    } else if (today) add('taxable', A); // today's M53: a negative month comes off what is invested
    else need = -A;
    // 5. A shortfall: cash first; once work stops (or with no pay at all), the accounts in the withdrawal order.
    if (need > 0.005) {
      yr.shortfall += need;
      const order = !today && (retired || noEarners) ? WITHDRAW_ORDER : ['cash'];
      for (const b of order) {
        if (need <= 0.005) break;
        const got = Math.min(need, Math.max(0, B[b]));
        if (got <= 0) continue;
        B[b] -= got; need -= got; yr.out[b] = (yr.out[b] ?? 0) + got; if (b !== 'cash') yr.withdrawn += got;
        if (b === 'pretax' && ageAt(me, k) != null && ageAt(me, k) < 59.5 && !yr.flags.some(f => f.kind === 'early')) flag(k, 'early', { note: 'Pretax money drawn before 59½: the 10% penalty and the tax are not in yet' }); // SEAM
      }
      if (need > 0.005) { yr.unmet += need; if (firstUnmet == null) { firstUnmet = k; flag(k, retired ? 'runsOut' : 'shortfall'); } }
    }
    // 6. Debts: the one plan's month (interest and payments from its path).
    const prev = plan.path[Math.min(k, plan.path.length - 1)] || [], next = plan.path[Math.min(k + 1, plan.path.length - 1)] || [];
    const interest = prev.reduce((s, v, i) => s + (v > 0.005 ? v * (plan.debts[i]?.apr ?? 0) / 12 : 0), 0);
    const paid = prev.reduce((s, v) => s + v, 0) - next.reduce((s, v) => s + v, 0) + interest;
    yr.interest += interest; yr.debtPaid += paid;
    // What the month set aside for debt and the plan did not need (the last payment on a debt, a surplus with nothing
    // left to pay) stays in checking, so net worth keeps it; the FI date never counted it (cash is not invested).
    if (plan.months == null || k < plan.months) {
      const budget = plan.debts.reduce((s, q) => s + (rule.on && q.heavy && k >= H ? 0 : q.payment ?? 0), 0) + (plan.extra ?? 0) + (where === 'debt' && k >= F ? Math.max(0, sf) : 0);
      const unused = budget - paid;
      if (unused > 0.005) { B.cash += unused; yr.toCash += unused; }
    }
    if (plan.months != null && k + 1 === plan.months && plan.debts.length) flag(k, 'debtFree');
    // 7. Close the month: the FI test (M50 against what is invested, earmarked money left out, like M53).
    const tot = invested();
    if (fiMonths == null && tot >= target && k + 1 <= fiCap) { fiMonths = k + 1; flag(k, 'fi'); }
    if (k < 12) months.push({ k, ym: addMonths(nowYm, k), step: stepAt(k), where, surplus: S, toDebt: where === 'debt' && k >= F ? Math.max(0, sf) : 0, toInvested: monthIn, payroll, ...snap(k + 1), shortfall: yr.unmet });
    if (k % 12 === 11 || k === horizon - 1) {
      Object.assign(yr, { end: snap(k + 1), step: stepAt(k), ages: Object.fromEntries(people.map(p => [p.key, ageAt(p, k) == null ? null : Math.floor(ageAt(p, k) + 1e-9)])), working: people.filter(p => earnedPeople.has(p.key) && k < stopMonth[p.key]).map(p => p.key) });
    }
  }
  if (plan.debts.length && plan.months == null) flags.push({ kind: 'debtNever' });
  for (const p of people) if (p.bornIndex == null) flags.push({ kind: 'needsAge', person: p.key });

  const fiYm = fiMonths == null ? null : addMonths(nowYm, fiMonths);
  const fiAge = fiMonths == null || me.bornIndex == null ? null : Math.floor(ageAt(me, fiMonths) + 1e-9);
  const shortfallYears = years.filter(q => q.unmet > 0.5).map(q => q.year);
  const runsOut = flags.find(f => f.kind === 'runsOut');
  const lastsToAge = runsOut ? (me.bornIndex == null ? null : Math.floor(ageAt(me, runsOut.month) + 1e-9)) : null;
  const plan55 = x.accounts.some(a => accessRule(a.type)?.includes('55'));
  const dualAge = people.map(p => {
    const age = p.ageMonths == null ? null : p.ageMonths / 12;
    const fiAt = fiMonths == null || age == null ? null : age + fiMonths / 12;
    const optionalAge = fiAt == null ? p.stopAge : Math.min(p.stopAge, Math.floor(fiAt));
    return { person: p.key, optionalAge, stopAge: p.stopAge, fiAge: fiAt == null ? null : Math.floor(fiAt), reachableAges: { retirementAccounts: 59.5, ...(plan55 ? { ruleOf55: 55 } : {}), medicare: 65, socialSecurity: null }, gapYears: Math.max(0, 59.5 - optionalAge), sources: null };
  });
  const money = v => `$${Math.round(v).toLocaleString('en-US')}`;
  const end = years.at(-1)?.end;
  return { ...base, value: fiMonths, needs: [], months, years, start, flags, fiMonths, fiNever: fiMonths == null, fiYm, fiAge, fiNumber: target, debtFreeMonths: plan.months, heavyMonths: plan.heavyMonths, debtFreeYm: plan.months == null ? null : addMonths(nowYm, plan.months),
    shortfallYears, lastsToAge, dualAge, coastAge: null, triple: null, horizon, schedule: { F, H, W, freed, endedPay, stopMonths: stopMonth, takeHomeAfterStop: Object.values(stopMonth).some(Number.isFinite) ? (x.takeHome ?? 0) + incomeAt(Math.max(...Object.values(stopMonth).filter(Number.isFinite))).dTH : null },
    text: `${years.length} years from ${nowYm}, a month at a time: ${fiMonths == null ? 'FI is not reached on this path' : `FI in ${fiMonths} months (${fiYm})`}${plan.debts.length ? `, ${plan.months == null ? 'the debts are never cleared' : `debt free in ${plan.months} months`}` : ''}${today ? '' : `, work stopping at ${me.stopAge}`}; net worth at the end ${end ? money(end.netWorth) : 'unknown'}${shortfallYears.length ? `; short in ${shortfallYears.length} ${shortfallYears.length === 1 ? 'year' : 'years'}` : ''}.` };
}

// What the core leaves out (projection.md Status). Also on the result as notIn.
export const NOT_IN = ['full tax depth (capital gains, state brackets by year, the ACA credit, Roth conversions)', 'tax and the 10% penalty on withdrawals', 'Social Security', 'RMDs from 73',
  'go-go, slow-go and no-go spending', 'a second stop age for a partner', 'two IRAs for a couple', 'Triple D and Monte Carlo', 'dated events beyond spending, income and one-off costs'];
