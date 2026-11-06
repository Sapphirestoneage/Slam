// SPDX-License-Identifier: AGPL-3.0-only
// M02, M50 to M58: FI numbers, FI date, Coast FI, big deals, solvers, money as time.
import { ok, needs, missing, fmt, isBlank } from './result.js';
import { duration } from '../format.js';
import { RULES } from '../registry/assumptions.js';

const MAX_MONTHS = RULES.maxMonths;

// M02: presets are already after inflation; the engine uses them as they are.
export function realReturn(preset, ref) {
  const v = isBlank(preset) ? ref.presets.realReturn.default : preset;
  return ok('M02', v, `${fmt.pct(v)} a year after inflation${isBlank(preset) ? ' (the default)' : ''}.`, { unit: 'pct' });
}

// Today's dollars or future dollars (spec F220): the engine works in today's dollars (M00, M02); future dollars add
// inflation for the months until the money is reached. A display choice, so no plan number changes.
export function futureDollars(amount, months, inflation) {
  if (isBlank(amount) || isBlank(months) || isBlank(inflation)) return null;
  return amount * (1 + inflation) ** (Math.max(0, months) / 12);
}

// M50: FI number.
export function fiNumber({ annualSpending, withdrawalRate }) {
  const m = missing({ spending: annualSpending, 'withdrawal rate': withdrawalRate });
  if (m.length) return needs('M50', m);
  const v = annualSpending / withdrawalRate;
  return ok('M50', v, `${fmt.money(annualSpending)} a year divided by a ${fmt.pct(withdrawalRate)} withdrawal rate = ${fmt.money(v)}.`);
}
// M51: Lean FI on Food, Accommodation, Transportation.
export function leanFiNumber({ annualFat, withdrawalRate }) {
  const r = fiNumber({ annualSpending: annualFat, withdrawalRate });
  return r.value === null ? { ...r, id: 'M51' } : ok('M51', r.value, `Food, housing and transportation ${fmt.money(annualFat)} a year divided by ${fmt.pct(withdrawalRate)} = ${fmt.money(r.value)}.`);
}
// M52: Barista FI.
export function baristaFiNumber({ annualSpending, partTimeIncome, withdrawalRate }) {
  const m = missing({ spending: annualSpending, 'part-time income': partTimeIncome, 'withdrawal rate': withdrawalRate });
  if (m.length) return needs('M52', m);
  const v = (annualSpending - partTimeIncome) / withdrawalRate;
  return ok('M52', v, `(${fmt.money(annualSpending)} spending ${'−'} ${fmt.money(partTimeIncome)} part-time income) divided by ${fmt.pct(withdrawalRate)} = ${fmt.money(v)}.`);
}

// M53: months until invested reaches the FI number. Monthly growth then the month's investing.
// before (batch 11, the debt rule): { months, monthly } goes in for the first months instead (while the surplus pays
// heavy debt first), then monthlyInvesting.
export function fiDate({ invested, monthlyInvesting, realReturn, target }, { from = new Date(), path = false, before = null } = {}) {
  const m = missing({ invested, 'monthly investing': monthlyInvesting, 'return': realReturn, 'FI number': target });
  if (m.length) return needs('M53', m, { unit: 'months' });
  const g = (1 + realReturn) ** (1 / 12);
  let b = invested, n = 0;
  const points = [b];
  const going = k => (before && k < before.months ? before.monthly : monthlyInvesting);
  while (b < target && n < MAX_MONTHS) { b = b * g + going(n); n += 1; if (path) points.push(b); }
  if (b < target) {
    return { id: 'M53', value: null, needs: [], never: true, unit: 'months', guess: false,
      text: 'Not on this path within 70 years. Try the solver to see what would get there.', points: path ? points : undefined };
  }
  const lead = before && before.months > 0 ? `adding ${fmt.money(before.monthly)} a month for the ${before.months} ${before.months === 1 ? 'month' : 'months'} ${waitWords(before)}, then ${fmt.money(monthlyInvesting)} a month` : `adding ${fmt.money(monthlyInvesting)} a month`;
  return { ...ok('M53', n, `Starting at ${fmt.money(invested)}, growing ${fmt.pct(realReturn)} a year after inflation and ${lead}, investments reach ${fmt.money(target)} in ${duration(n, from)}.`, { unit: 'months' }), points: path ? points : undefined };
}

// What the months before the surplus is invested are for (batch 12, M79): heavy debt first, then big e.
export function waitWords(before) {
  const H = before?.heavyMonths ?? before?.months ?? 0, all = before?.months ?? 0;
  if (H >= all) return 'the surplus pays heavy debt first';
  if (!H) return 'the surplus fills big e first';
  return `the surplus pays heavy debt first (${H}) and then fills big e (${all - H})`;
}

// The FI date as a range (answer 122): the months to FI with spending lower and higher by a share, from the metrics.
// Spending moves the FI number and, when the surplus is invested, what goes in each month.
export function fiRangeOf(m, share, { from = new Date() } = {}) {
  const x = m.inputs, spend = x.retirementSpending, going = m.investing?.monthly ?? null;
  if (isBlank(spend) || isBlank(x.invested) || going === null || isBlank(x.withdrawalRate)) return null;
  const run = k => fiDate({ invested: x.invested, monthlyInvesting: going - (m.investing.investSurplus ? spend * (k - 1) : 0), realReturn: x.realReturn, target: spend * 12 * k / x.withdrawalRate }, { from, before: m.investing.before ?? null });
  const lo = run(1 - share), hi = run(1 + share);
  return { share, low: lo.value, high: hi.value, highNever: !!hi.never, lowNever: !!lo.never, base: m.monthsToFi.value };
}

// Batch 5 C (MATH.md flag 1): when FI would come before saferUnderAge, a second line at the safer withdrawal rate
// (a longer retirement): the FI number at that rate and the months to reach it on the same path. The main line keeps
// the client's own withdrawal assumption.
export function saferFi(m, { from = new Date() } = {}) {
  const x = m.inputs, base = m.monthsToFi.value;
  if (base == null || x.age == null || isBlank(x.retirementSpending) || isBlank(x.invested)) return null;
  const fiAge = x.age + base / 12;
  if (fiAge >= RULES.saferUnderAge) return null;
  const target = x.retirementSpending * 12 / RULES.saferWithdrawal;
  const r = fiDate({ invested: x.invested, monthlyInvesting: m.investing?.monthly ?? 0, realReturn: x.realReturn, target }, { from, before: m.investing?.before ?? null });
  const monthAt = n => new Date(from.getFullYear(), from.getMonth() + n, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return { rate: RULES.saferWithdrawal, fiAge, target, months: r.value, never: !!r.never, text: r.never ? `At a safer ${(RULES.saferWithdrawal * 100).toFixed(1)}% for a longer retirement: not on this path within 70 years` : `At a safer ${(RULES.saferWithdrawal * 100).toFixed(1)}% for a longer retirement: FI ${monthAt(r.value)}`, words: `FI at ${Math.round(fiAge)} is a long retirement; ${(RULES.saferWithdrawal * 100).toFixed(1)}% needs ${Math.round(target).toLocaleString('en-US')} instead of ${Math.round(m.fiNumber.value).toLocaleString('en-US')}.` };
}

// M54: Coast FI number at today's age.
export function coastFi({ fiNumber: fi, realReturn, age, retireAge }) {
  const m = missing({ 'FI number': fi, 'return': realReturn, age, 'retirement age': retireAge });
  if (m.length) return needs('M54', m);
  const years = Math.max(0, retireAge - age);
  const v = fi / (1 + realReturn) ** years;
  return ok('M54', v, `${fmt.money(fi)} divided by (1 + ${fmt.pct(realReturn)}) for each of the ${years} years to age ${retireAge} = ${fmt.money(v)}. With that invested today you could stop adding and still reach FI at ${retireAge}.`);
}

// M55: % of the way to each FI number.
export function pctToFi(invested, targets) {
  if (isBlank(invested)) return needs('M55', ['invested'], { unit: 'pct' });
  const out = {};
  for (const [k, t] of Object.entries(targets)) out[k] = isBlank(t) || !t ? null : invested / t;
  return ok('M55', out, Object.entries(out).filter(([, v]) => v !== null).map(([k, v]) => `${k} ${fmt.pct(v)}`).join(', '), { unit: 'pct' });
}

// M56: These are big deals. One assumption at a time, the rest at default.
export function bigDeals({ invested, monthlyInvesting, annualSpending }, ref) {
  const p = ref.presets;
  const base = { r: p.realReturn.default, w: p.withdrawalRate.default };
  const run = (r, w, spend = annualSpending) => fiDate({ invested, monthlyInvesting, realReturn: r, target: isBlank(spend) ? null : spend / w }).value;
  const baseline = run(base.r, base.w);
  // Spending moves both the FI number and what is left to invest each month.
  const runSpending = k => {
    if (isBlank(annualSpending) || isBlank(monthlyInvesting)) return null;
    const delta = annualSpending * (k - 1) / 12;
    return fiDate({ invested, monthlyInvesting: monthlyInvesting - delta, realReturn: base.r, target: annualSpending * k / base.w }).value;
  };
  const rows = [
    { assumption: 'Return', presets: p.realReturn.values.map(r => ({ preset: r, months: run(r, base.w) })) },
    { assumption: 'Withdrawal rate', presets: p.withdrawalRate.values.map(w => ({ preset: w, months: run(base.r, w) })) },
    // Returns are already after inflation, so inflation is a display setting and is not on this card.
    { assumption: 'Spending', presets: [0.9, 1, 1.1].map(k => ({ preset: k, label: k === 1 ? 'As is' : `${k < 1 ? '−' : '+'}10%`, months: runSpending(k) })) },
  ];
  for (const row of rows) {
    const ms = row.presets.map(x => x.months).filter(x => x !== null);
    row.spread = ms.length ? Math.max(...ms) - Math.min(...ms) : null;
  }
  const ranked = [...rows].sort((a, b) => (b.spread ?? -1) - (a.spread ?? -1));
  return { id: 'M56', value: ranked[0].spread === null ? null : ranked[0].assumption, baseline, rows: ranked,
    text: ranked[0].spread === null ? 'Needs invested, monthly investing and spending.' : `${ranked[0].assumption} moves the FI date the most: ${ranked[0].spread} months between its options.` };
}

// M57: solvers, by bisection on M53.
function bisect(f, lo, hi, steps = 60) {
  if (f(lo) === f(hi)) return null;
  const want = f(hi);
  for (let i = 0; i < steps; i++) { const mid = (lo + hi) / 2; if (f(mid) === want) hi = mid; else lo = mid; }
  return hi;
}
export function solveMonthlySaving({ invested, realReturn, target, months }) {
  const m = missing({ invested, 'return': realReturn, 'FI number': target, 'target age': months });
  if (m.length) return needs('M57', m);
  const hits = s => (fiDate({ invested, monthlyInvesting: s, realReturn, target }).value ?? Infinity) <= months;
  if (hits(0)) return ok('M57', 0, 'Already there without adding anything.');
  const v = bisect(hits, 0, target);
  return ok('M57', Math.ceil(v), `Investing ${fmt.money(Math.ceil(v))} a month reaches ${fmt.money(target)} in ${months} months.`);
}
export function solveSpending({ invested, monthlyIncomeLeft, realReturn, withdrawalRate, months }) {
  // monthlyIncomeLeft: take-home; investing = take-home - spending.
  const m = missing({ invested, 'take-home': monthlyIncomeLeft, 'return': realReturn, 'withdrawal rate': withdrawalRate, 'target age': months });
  if (m.length) return needs('M57', m);
  const hits = s => (fiDate({ invested, monthlyInvesting: monthlyIncomeLeft - s, realReturn, target: s * 12 / withdrawalRate }).value ?? Infinity) <= months;
  if (!hits(0)) return needs('M57', ['more income: even spending nothing does not get there']);
  const v = bisect(s => hits(s), 0, monthlyIncomeLeft);
  const answer = v === null ? monthlyIncomeLeft : Math.floor(v - 0.01);
  return ok('M57', answer, `Spending up to ${fmt.money(answer)} a month reaches FI in ${months} months.`);
}

// M58: money as time.
export function moneyAsTime({ amount, hourlyWage, annualSpending }) {
  const out = { hours: null, fiDays: null };
  if (!isBlank(amount) && hourlyWage) out.hours = amount / hourlyWage;
  if (!isBlank(amount) && annualSpending) out.fiDays = amount / (annualSpending / 365);
  return { id: 'M58', value: out, needs: [], unit: 'time', text: [
    out.hours === null ? null : `${fmt.money(amount)} divided by ${fmt.money(hourlyWage, { cents: true })} an hour = ${fmt.number(out.hours, 1)} hours of work.`,
    out.fiDays === null ? null : `${fmt.money(amount)} divided by ${fmt.money(annualSpending / 365, { cents: true })} a day of spending = ${fmt.number(out.fiDays, 1)} FI days.`,
  ].filter(Boolean).join(' ') };
}
