// SPDX-License-Identifier: AGPL-3.0-only
// The whole-life engine: one year at a time from today to the plan's last year, in today's dollars. Working years add
// to three buckets (taxable, pretax, Roth); free years spend from them by a withdrawal strategy, pay income tax on what
// is taxed, collect Social Security from the claim age, and can fill low tax brackets by moving pretax money to Roth.
// Scenario blocks (a kid, a sabbatical, part-time years, a house) layer on top: each has a start age, an end age and
// what it changes. Pure: no DOM, no storage. It stands beside js/math (the coach app's engine) and reads its tax
// functions; it is not yet in the spreadsheet registry (QUESTIONS.md).
//
// What this version leaves out, said plainly: gains in a taxable account are not taxed when sold (for most early
// retirees they fall in the 0% band, so the tax shown is a little low for larger incomes); state rules that exclude
// retirement income are not applied (state tax is the ordinary rate); required minimum distributions; and health cost
// before 65 is the person's own guess, with no subsidy math.
import { federalTax, stateTax } from './income.js';

// Social Security counted as income: the provisional-income rule (26 U.S.C. 86). The thresholds are set in the law and
// are not indexed. [first, second] by filing status.
const SS_THRESHOLDS = { single: [25000, 34000], joint: [32000, 44000] };
export function taxableSocialSecurity(ss, other, filingStatus = 'Single') {
  if (!(ss > 0)) return 0;
  const [t1, t2] = SS_THRESHOLDS[filingStatus === 'Married jointly' ? 'joint' : 'single'];
  const prov = other + ss / 2;
  if (prov <= t1) return 0;
  if (prov <= t2) return Math.min(ss / 2, (prov - t1) / 2);
  return Math.min(ss * 0.85, (prov - t2) * 0.85 + Math.min(ss / 2, (t2 - t1) / 2));
}
// Long-term gains: the top of the 0% and 15% bands by taxable income (IRS Rev. Proc. 2025-32, tax year 2026).
const GAIN_BANDS = { single: [49450, 545500], joint: [98900, 613700], head: [66200, 579600] };
export function gainsTax(gains, ordinaryTaxable, key = 'single') {
  if (!(gains > 0)) return 0;
  const [t0, t1] = GAIN_BANDS[key] ?? GAIN_BANDS.single, lo = Math.max(0, ordinaryTaxable), hi = lo + gains;
  const at15 = Math.max(0, Math.min(hi, t1) - Math.max(lo, t0)), at20 = Math.max(0, hi - Math.max(lo, t1));
  return at15 * 0.15 + at20 * 0.20;
}
// Required withdrawals from taxed-later money: the balance divided by this number at each age (IRS Publication 590-B,
// Uniform Lifetime Table). They start at 73, or 75 for someone born in 1960 or later (SECURE 2.0).
const UNIFORM = { 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4 };
export const requiredWithdrawal = (age, pretax, startAge = 73) => (age >= startAge && pretax > 0 && UNIFORM[Math.min(100, age)] ? pretax / UNIFORM[Math.min(100, age)] : 0);
// The Marketplace premium credit for 2026 (IRS Rev. Proc. 2025-25; the 2025 HHS poverty guideline, which 2026 coverage
// uses): the benchmark premium less a share of income that rises with income, and nothing past four times the
// poverty line. Under the line there is no credit (Medicaid is the route there, and is not counted).
const POVERTY = { one: 15650, each: 5500 };
const ACA_BANDS = [[1.33, 0.0210, 0.0210], [1.5, 0.0314, 0.0419], [2, 0.0419, 0.0660], [2.5, 0.0660, 0.0844], [3, 0.0844, 0.0996], [4, 0.0996, 0.0996]];
export function premiumCredit(income, benchmark, people = 1) {
  if (!(benchmark > 0)) return 0;
  const ratio = income / (POVERTY.one + POVERTY.each * (people - 1));
  if (ratio < 1 || ratio > 4) return 0;
  let from = 1;
  for (const [to, a, b] of ACA_BANDS) { if (ratio <= to) return Math.max(0, benchmark - income * (a + (b - a) * ((ratio - from) / (to - from)))); from = to; }
  return 0;
}
const PENALTY_AGE = 60;     // 59 and a half, in whole years: pretax money and Roth growth are free of the 10% penalty from here
const PENALTY = 0.10;
const SEASON = 5;           // years a Roth conversion waits before it can come out penalty-free
// tolerate: the lowest share of what life costs a strategy may pay in any year and still count as working.
export const STRATEGIES = [
  { id: 'fixed', tolerate: 0.999, name: 'Steady spending', plain: 'Spend what your life costs every year, whatever the market does. The classic 4% rule works this way.' },
  { id: 'guardrails', tolerate: 0.699, name: 'Guardrails', plain: 'Spend what your life costs, trim 10% after a bad stretch, raise 10% after a good one.' },
  { id: 'floor', tolerate: 0.849, name: 'Floor and ceiling', plain: 'Spend a share of the portfolio each year, never less than 85% and never more than 120% of what your life costs.' },
  { id: 'percent', tolerate: 0.75, name: 'A share of the portfolio', plain: 'Spend a fixed share of whatever the portfolio is worth. It never runs out, but spending swings with the market.' },
];
export const FILLS = [
  { id: 'none', name: 'No conversions' },
  { id: 'deduction', name: 'Fill the 0% space', plain: 'Each low-income year, move pretax money to Roth up to the standard deduction: taxed at 0%.' },
  { id: '12', name: 'Fill the 12% bracket', plain: 'Move pretax money to Roth up to the top of the 12% bracket each year.' },
];

const keyOf = fs => (fs === 'Married jointly' ? 'joint' : fs === 'Head of household' ? 'head' : 'single');
// Income tax for one free year: federal plus state on ordinary income (pretax withdrawals, conversions, part-time
// pay, and the taxed part of Social Security). No payroll tax here: part-time pay is small and this is a plan.
// gains: what was earned on money sold from a taxable account this year. It stacks on top of ordinary income: any
// standard deduction ordinary income did not use shelters it first, then the 0%, 15% and 20% bands. States tax it as income.
export function yearTax({ ordinary, ss, gains = 0 }, tax, ref) {
  const taxedSs = taxableSocialSecurity(ss, ordinary + gains, tax.filingStatus);
  const gross = ordinary + taxedSs;
  if (gross + gains <= 0) return 0;
  const fed = gross > 0 ? federalTax({ gross, filingStatus: tax.filingStatus }, ref).value ?? 0 : 0;
  const st = stateTax({ gross: ordinary + gains, filingStatus: tax.filingStatus, place: tax.place ?? null }, ref);
  const k = keyOf(tax.filingStatus), std = ref.tax.standardDeduction[k] ?? 0;
  const onGains = gainsTax(Math.max(0, gains - Math.max(0, std - gross)), Math.max(0, gross - std), k);
  return fed + onGains + (st.state ?? 0) + (st.local ?? 0);
}
// How much ordinary income fits before the fill line: the standard deduction, or the top of the 12% bracket.
export function fillRoom(fill, tax, ref) {
  if (!fill || fill === 'none') return 0;
  const k = keyOf(tax.filingStatus), std = ref.tax.standardDeduction[k] ?? 0;
  return fill === 'deduction' ? std : std + (ref.tax.brackets[k].find(([, rate]) => rate > 0.12)?.[0] ?? 0);
}

// People in the plan who are under 65 at this age of the first person (health cover is bought until Medicare).
export const under65 = (age, x) => (age < 65 ? 1 : 0) + (x.partner && age - x.age + x.partner.age < 65 ? 1 : 0);
// What life costs in a free year, before any strategy: the base spending by era (go-go, slow-go, no-go), health cost
// before 65, and every block that is on at that age.
export function needAt(age, x) {
  const e = x.eras || {};
  const era = age >= (e.noGoAge ?? 200) ? e.noGo ?? 1 : age >= (e.slowGoAge ?? 200) ? e.slowGo ?? 1 : 1;
  let need = x.spendingAfter * era + under65(age, x) * (x.tax?.health ?? 0);
  for (const b of x.blocks || []) { if (age >= b.fromAge && age <= b.toAge) need += b.spending ?? 0; if (age === b.fromAge) need += b.once ?? 0; }
  return Math.max(0, need);
}
const blockIncome = (age, x) => (x.blocks || []).reduce((s, b) => s + (age >= b.fromAge && age <= b.toAge ? b.income ?? 0 : 0), 0);

// Take `amount` out of the buckets in the order that costs least. Before 59 and a half: taxable, then Roth money that
// can come out free (what was put in, and conversions that have waited five years), then pretax (10% penalty), then
// Roth growth (10% penalty). After: taxable, pretax, Roth. Returns { pretax (ordinary income), penalty, short }.
function draw(b, amount, age) {
  let left = amount, pretax = 0, penalty = 0, gains = 0;
  const take = (key, cap = Infinity) => { const v = Math.min(left, Math.max(0, Math.min(b[key], cap))); b[key] -= v; left -= v; return v; };
  // Money sold from the taxable account is part what was put in (basis, already taxed) and part gain, in proportion.
  const had = b.taxable, sold = take('taxable');
  if (sold > 0 && had > 0) { const share = Math.min(1, Math.max(0, (b.basis ?? had) / had)); gains = sold * (1 - share); b.basis = Math.max(0, (b.basis ?? had) - sold * share); }
  if (age < PENALTY_AGE) {
    const free = take('roth', b.rothFree); b.rothFree -= free;
    const p = take('pretax'); pretax += p; penalty += p * PENALTY;
    const g = take('roth'); penalty += g * PENALTY;
  } else {
    pretax += take('pretax');
    const r = take('roth'); b.rothFree = Math.max(0, b.rothFree - r);
  }
  return { pretax, penalty, gains, short: left > 0.5 ? left : 0 };
}

// The run. x:
//   age, planAge, retireAge, realReturn, start: { taxable, pretax, roth, rothFree }
//   work: { saving: { pretax, roth, taxable } a year once the plan is at full speed, wait: { years, pretax } the
//           stretch before that (debt first, emergency cash) when only the paycheck's own saving goes in }
//   spendingAfter (a year), eras, ss: { claimAge, yearly }, partTime: { yearly, untilAge }, blocks: [...]
//   strategy: { id, rate }, tax: { filingStatus, place, fill, health }
// returns(k): the real return for year k of the plan (0 = this year); defaults to x.realReturn every year.
// Out: { years: [...], ok, ranOutAge, atRetire, end, lifetimeTax, lowestSpend (as a share of need), penalties }.
export function lifetime(x, ref, { returns = null } = {}) {
  const b = { taxable: x.start.taxable ?? 0, pretax: x.start.pretax ?? 0, roth: x.start.roth ?? 0, rothFree: Math.min(x.start.rothFree ?? 0, x.start.roth ?? 0), basis: Math.min(x.start.basis ?? x.start.taxable ?? 0, x.start.taxable ?? 0) };
  const P = x.partner || null, lastAge = x.planAge + (P ? Math.max(0, x.age - P.age) : 0); // with two people, the plan runs until the younger one reaches the last year
  const pSs = P ? (typeof P.ss?.yearly === 'function' ? P.ss.yearly(x.retireAge) : P.ss?.yearly ?? 0) : 0, people = P ? 2 : 1, rmdAge = x.rmdAge ?? 73;
  const total = () => b.taxable + b.pretax + b.roth;
  const years = [], season = []; // season: [{ at: plan year, amount }] conversions waiting five years
  const tax = x.tax || { filingStatus: 'Single' }, room = fillRoom(tax.fill, tax, ref);
  const ssYearly = typeof x.ss?.yearly === 'function' ? x.ss.yearly(x.retireAge) : x.ss?.yearly ?? 0; // stopping work sooner lowers the benefit
  let atRetire = null, ranOutAge = null, lifetimeTax = 0, penalties = 0, lowest = 1, adjust = 1, wr0 = null;
  for (let k = 0, age = x.age; age <= lastAge; k++, age++) {
    const r = returns ? returns(k) : x.realReturn;
    const free = age >= x.retireAge;
    for (const s of season) if (s.at + SEASON === k) b.rothFree += s.amount; // a conversion from five years ago can now come out
    const row = { k, age, phase: free ? 'free' : 'work', need: 0, spend: 0, tax: 0, ss: 0, earned: 0, withdraw: 0, convert: 0, penalty: 0, short: 0, saved: 0 };
    if (!free) {
      const w = x.work, waiting = k < (w.wait?.years ?? 0);
      const s = waiting ? { pretax: w.wait.pretax ?? 0, roth: 0, taxable: 0 } : w.saving;
      let extra = 0; // a block in working years comes out of that year's saving, then out of the buckets
      for (const blk of x.blocks || []) { if (age >= blk.fromAge && age <= blk.toAge) extra += (blk.spending ?? 0) - (blk.income ?? 0); if (age === blk.fromAge) extra += blk.once ?? 0; }
      let put = { ...s };
      if (extra > 0) for (const key of ['taxable', 'roth']) { const cut = Math.min(put[key], extra); put[key] -= cut; extra -= cut; }
      else if (extra < 0) put.taxable += -extra;
      b.taxable += put.taxable; b.basis += put.taxable; b.roth += put.roth; b.rothFree += put.roth; b.pretax += put.pretax;
      row.saved = put.taxable + put.roth + put.pretax;
      if (extra > 0.5) { const d = draw(b, extra, age); row.withdraw = extra - d.short; row.penalty = d.penalty; row.short = d.short; penalties += d.penalty; }
    } else {
      if (atRetire === null) atRetire = total();
      const start = total(), need = needAt(age, x), st = x.strategy || { id: 'fixed' };
      if (wr0 === null) wr0 = start > 0 ? need / start : null;
      let spend = need;
      if (st.id === 'percent') spend = start * (st.rate ?? 0.04);
      else if (st.id === 'floor') spend = Math.min(need * 1.2, Math.max(need * 0.85, start * (st.rate ?? wr0 ?? 0.04)));
      else if (st.id === 'guardrails' && wr0) {
        const wr = start > 0 ? need * adjust / start : Infinity;
        if (wr > wr0 * 1.2) adjust *= 0.9; else if (wr < wr0 * 0.8 && adjust < 1.3) adjust *= 1.1;
        adjust = Math.max(0.7, adjust); // a cut never goes below 70% of what life costs
        spend = need * adjust;
      }
      const ss = (age >= (x.ss?.claimAge ?? 200) ? ssYearly : 0) + (P && age - x.age + P.age >= (P.ss?.claimAge ?? 200) ? pSs : 0);
      const rmd = requiredWithdrawal(age, b.pretax, rmdAge), benchmark = x.tax?.aca ? under65(age, x) * (tax.health ?? 0) : 0;
      const earned = (age <= (x.partTime?.untilAge ?? -1) ? x.partTime.yearly ?? 0 : 0) + blockIncome(age, x);
      // Fill the bracket first: move pretax to Roth up to the line (never more than is there).
      let convert = 0;
      if (room > 0 && b.pretax > 0) { convert = Math.min(b.pretax, Math.max(0, room - earned)); }
      // What must come out: spending less what comes in, plus this year's tax (found by going round a few times).
      // The premium credit depends on this year's income, which depends on what is taken out, so it goes round too.
      let fromPortfolio = Math.max(0, spend - ss - earned), taxDue = 0, credit = 0, got = null, snap = null;
      for (let i = 0; i < 8; i++) {
        snap = { ...b };
        got = draw(snap, Math.max(0, fromPortfolio - credit) + taxDue, age);
        const pre = Math.max(got.pretax, Math.min(rmd, b.pretax)), conv = Math.min(convert, Math.max(0, snap.pretax));
        const t = yearTax({ ordinary: pre + conv + earned, ss, gains: got.gains }, tax, ref) + got.penalty;
        const c = benchmark > 0 ? Math.min(benchmark, premiumCredit(pre + conv + earned + got.gains + ss, benchmark, people)) : 0;
        if (Math.abs(t - taxDue) < 1 && Math.abs(c - credit) < 1) { taxDue = t; credit = c; break; }
        taxDue = t; credit = (credit + c) / 2; // ease toward it: the 400% line is a cliff
      }
      fromPortfolio = Math.max(0, fromPortfolio - credit);
      const d = draw(b, fromPortfolio + taxDue, age);
      // A required withdrawal larger than what was needed still comes out: it is taxed and lands in the taxable account.
      const forced = Math.min(b.pretax, Math.max(0, rmd - d.pretax));
      if (forced > 0) { b.pretax -= forced; b.taxable += forced; b.basis += forced; }
      const conv = Math.min(convert, Math.max(0, b.pretax));
      b.pretax -= conv; b.roth += conv; if (conv > 0) season.push({ at: k, amount: conv });
      row.rmd = rmd; row.gains = d.gains; row.credit = credit;
      Object.assign(row, { need, spend: d.short ? Math.max(0, spend - d.short) : spend, tax: taxDue - d.penalty, ss, earned, withdraw: fromPortfolio + taxDue - d.short, convert: conv, penalty: d.penalty, short: d.short });
      lifetimeTax += taxDue - d.penalty; penalties += d.penalty;
      if (need > 0) lowest = Math.min(lowest, row.spend / need);
    }
    if (row.short > 0.5 && ranOutAge === null) ranOutAge = age;
    for (const key of ['taxable', 'pretax', 'roth']) b[key] *= 1 + r;
    b.rothFree = Math.min(b.rothFree, b.roth); b.basis = Math.min(b.basis, b.taxable);
    years.push({ ...row, taxable: b.taxable, pretax: b.pretax, roth: b.roth, total: total() });
  }
  return { years, ok: ranOutAge === null, ranOutAge, atRetire: atRetire ?? total(), end: total(), lifetimeTax, penalties, lowestSpend: lowest };
}

// The earliest age work can stop and the money still lasts to the plan's last year, on this strategy: the first age
// from today whose run never comes up short. { age, run } or { age: null } when no age to 80 works.
export const toleranceOf = x => STRATEGIES.find(s => s.id === (x.strategy?.id ?? 'fixed'))?.tolerate ?? 0.999;
export const worked = (run, x) => run.ok && run.lowestSpend >= toleranceOf(x);
export function earliestFreedom(x, ref, { until = 80 } = {}) {
  for (let a = x.age; a <= until; a++) {
    const run = lifetime({ ...x, retireAge: a }, ref);
    if (worked(run, x)) return { age: a, run };
  }
  return { age: null, run: null };
}
