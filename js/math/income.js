// M01, M10 to M17: periods, taxes, take-home, match, variable income, real hourly wage.
import { ok, needs, missing, fmt } from './result.js';

// M01: any period to monthly.
const PER_MONTH = { week: 52 / 12, '2 weeks': 26 / 12, 'twice a month': 2, month: 1, year: 1 / 12 };
export function monthlyFrom(amount, per, payFrequency = null) {
  if (amount === null || amount === undefined) return needs('M01', ['amount']);
  let p = per;
  if (p === 'paycheck') p = payFrequency;
  if (!p || !(p in PER_MONTH)) {
    return { ...ok('M01', amount, `${fmt.money(amount, { cents: true })} with no period given, treated as monthly.`), roughly: true };
  }
  const v = amount * PER_MONTH[p];
  return ok('M01', v, p === 'month' ? `${fmt.money(amount, { cents: true })} a month.`
    : `${fmt.money(amount, { cents: true })} per ${per === 'paycheck' ? `paycheck (${p})` : p} is ${fmt.money(v, { cents: true })} a month.`);
}

const filingKey = s => (s === 'Married jointly' || s === 'joint' ? 'joint' : 'single');
export function defaultFilingStatus(couple) { return couple ? 'Married jointly' : 'Single'; } // R041

// M10: federal income tax on annual numbers.
export function federalTax({ gross, pretax = 0, filingStatus = 'Single', selfEmployedHalf = 0 }, ref) {
  if (gross === null || gross === undefined) return needs('M10', ['gross pay']);
  const key = filingKey(filingStatus);
  const std = ref.tax.standardDeduction[key];
  const taxable = Math.max(0, gross - pretax - selfEmployedHalf - std);
  const brackets = ref.tax.brackets[key];
  let tax = 0, marginal = brackets[0][1];
  for (let i = 0; i < brackets.length; i++) {
    const [floor, rate] = brackets[i];
    const ceil = brackets[i + 1]?.[0] ?? Infinity;
    if (taxable > floor) { tax += (Math.min(taxable, ceil) - floor) * rate; marginal = rate; }
  }
  return { ...ok('M10', tax, `Taxable income is ${fmt.money(gross)} gross minus ${fmt.money(pretax)} before-tax deductions minus the ${fmt.money(std)} standard deduction = ${fmt.money(taxable)}. Federal tax on that is ${fmt.money(tax)} a year.`), taxable, marginal };
}

// M11: FICA, annual.
export function fica({ gross, filingStatus = 'Single', selfEmployed = false }, ref) {
  if (gross === null || gross === undefined) return needs('M11', ['gross pay']);
  const t = ref.tax;
  const base = selfEmployed ? gross * t.selfEmployedBase : gross;
  const ssRate = selfEmployed ? t.socialSecurityRate * 2 : t.socialSecurityRate;
  const medRate = selfEmployed ? t.medicareRate * 2 : t.medicareRate;
  const ss = Math.min(base, t.socialSecurityWageBase) * ssRate;
  const over = Math.max(0, base - t.additionalMedicareOver[filingKey(filingStatus)]);
  const medicare = base * medRate + over * t.additionalMedicareRate;
  const total = ss + medicare;
  return { ...ok('M11', total, selfEmployed
    ? `Self-employed: 15.3% on 92.35% of ${fmt.money(gross)} (Social Security up to ${fmt.money(t.socialSecurityWageBase)}) = ${fmt.money(total)} a year; half of it is deductible.`
    : `Social Security 6.2% of ${fmt.money(Math.min(base, t.socialSecurityWageBase))} plus Medicare 1.45% of ${fmt.money(base)}${over > 0 ? ` plus 0.9% of the ${fmt.money(over)} over the limit` : ''} = ${fmt.money(total)} a year.`),
  socialSecurity: ss, medicare, deductibleHalf: selfEmployed ? total / 2 : 0 };
}

// M12: annual take-home from annual gross.
export function takeHomeFromGross({ gross, pretax = 0, filingStatus = 'Single', selfEmployed = false }, ref) {
  if (gross === null || gross === undefined) return needs('M12', ['gross pay']);
  const f = fica({ gross, filingStatus, selfEmployed }, ref);
  const fed = federalTax({ gross, pretax, filingStatus, selfEmployedHalf: f.deductibleHalf }, ref);
  const v = gross - fed.value - f.value - pretax;
  return { ...ok('M12', v, `${fmt.money(gross)} gross minus ${fmt.money(fed.value)} federal tax minus ${fmt.money(f.value)} FICA minus ${fmt.money(pretax)} before-tax deductions = ${fmt.money(v)} a year take-home (${fmt.money(v / 12)} a month). State tax is not included yet.`), federal: fed, fica: f };
}

// M13: gross from take-home, by bisection to the nearest $1. Marked Computed.
export function grossFromTakeHome({ takeHome, pretax = 0, filingStatus = 'Single', selfEmployed = false }, ref) {
  if (takeHome === null || takeHome === undefined) return needs('M13', ['take-home pay']);
  let lo = takeHome, hi = takeHome * 3 + 100000;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (takeHomeFromGross({ gross: mid, pretax, filingStatus, selfEmployed }, ref).value < takeHome) lo = mid; else hi = mid;
  }
  const gross = Math.round(hi);
  return { ...ok('M13', gross, `Worked backwards from ${fmt.money(takeHome)} a year take-home: the gross that leaves exactly that after federal tax, FICA and before-tax deductions is ${fmt.money(gross)}.`), status: 'Computed' };
}

// M14: effective and marginal rates.
export function taxRates({ gross, pretax = 0, filingStatus = 'Single', selfEmployed = false }, ref) {
  if (!gross) return needs('M14', ['gross pay'], { unit: 'pct' });
  const r = takeHomeFromGross({ gross, pretax, filingStatus, selfEmployed }, ref);
  const effective = (r.federal.value + r.fica.value) / gross;
  const ficaMarginal = gross < ref.tax.socialSecurityWageBase ? ref.tax.socialSecurityRate + ref.tax.medicareRate : ref.tax.medicareRate;
  const marginal = r.federal.marginal + ficaMarginal;
  return { ...ok('M14', effective, `Federal tax plus FICA (${fmt.money(r.federal.value + r.fica.value)}) divided by gross (${fmt.money(gross)}) = ${fmt.pct(effective)}. The last dollar is taxed at ${fmt.pct(marginal)}.`, { unit: 'pct' }), effective, marginal };
}

// M15: employer match, dollars a year.
export function employerMatch({ contributionPct, matchPct, matchCapPct, gross }) {
  const m = missing({ 'your 401(k) %': contributionPct, 'the match %': matchPct, 'the match limit': matchCapPct, 'gross pay': gross });
  if (m.length) return needs('M15', m);
  const v = Math.min(contributionPct, matchCapPct) * matchPct * gross;
  return ok('M15', v, `The employer matches ${fmt.pct(matchPct)} of what you put in, up to ${fmt.pct(matchCapPct)} of pay. You put in ${fmt.pct(contributionPct)}, so the match is ${fmt.pct(Math.min(contributionPct, matchCapPct))} x ${fmt.pct(matchPct)} x ${fmt.money(gross)} = ${fmt.money(v)} a year.`);
}

// M16: safe monthly budget on variable income.
export function variableSafeBudget({ lowestMonth, typicalMonth, setAside }, ref) {
  const rate = setAside ?? ref.defaults.taxSetAside; // R038
  if (lowestMonth !== null && lowestMonth !== undefined) {
    const v = lowestMonth * (1 - rate);
    return ok('M16', v, `Lowest month ${fmt.money(lowestMonth)} minus ${fmt.pct(rate)} set aside for taxes = ${fmt.money(v)} a month you can count on.`);
  }
  if (typicalMonth === null || typicalMonth === undefined) return needs('M16', ['the lowest month']);
  const v = typicalMonth * 0.75 * (1 - rate);
  return ok('M16', v, `No lowest month yet, so 75% of a typical month (${fmt.money(typicalMonth)}) is used as a guess, minus ${fmt.pct(rate)} for taxes = ${fmt.money(v)} a month.`, { guess: true });
}

// M17: real hourly wage (life energy), monthly numbers. Missing hours: 'needs hours'.
export function realHourlyWage({ takeHome, workCosts = 0, paidHours, commuteHours = 0, prepHours = 0 }) {
  if (takeHome === null || takeHome === undefined) return needs('M17', ['take-home pay']);
  if (!paidHours) return needs('M17', ['hours']);
  const allHours = paidHours + commuteHours + prepHours;
  const v = (takeHome - workCosts) / allHours;
  return ok('M17', v, `${fmt.money(takeHome)} take-home minus ${fmt.money(workCosts)} work costs, divided by ${fmt.number(allHours)} hours (paid, commute and getting ready) = ${fmt.money(v, { cents: true })} an hour.`);
}

// R046: a paycheck row typed as take-home or as gross. The other is solved and marked Computed.
// Jobs pay tax; benefits, unemployment and money from family are counted as they land. Each job is worked out
// on its own (a second job is taxed as if it were the only one), and state tax is not in yet.
const TAXED = { Job: 'W-2', 'Partner job': 'W-2', 'Side hustle': '1099', 'Self-employed': '1099' };
export const taxTypeOf = r => r.values?.incomeType ?? TAXED[r.type] ?? null;
const PAYCHECKS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
export function incomeRow(r, { filingStatus = 'Single', ref }) {
  const v = r.values || {};
  const taxType = taxTypeOf(r);
  const perYear = PAYCHECKS[v.payFrequency] ?? 26;
  const yearly = (x, per) => (x == null ? null : monthlyFrom(x, per, v.payFrequency).value * 12);
  const typedGross = v.basis === 'Gross' ? yearly(r.amount, r.per) : v.gross ?? null;
  const salary = typedGross ?? null;
  const pretax = (salary ?? 0) * (v.contributionPct ?? 0) + ((v.premium ?? 0) + (v.hsaFsa ?? 0) + (v.otherPretax ?? 0)) * perYear;
  const selfEmployed = taxType === '1099';
  if (taxType && salary !== null && (v.basis === 'Gross' || r.amount == null)) { // gross only: take-home is solved
    const t = takeHomeFromGross({ gross: salary, pretax, filingStatus, selfEmployed }, ref);
    return { takeHome: { ...t, value: t.value / 12, text: t.text, status: 'Computed' }, gross: salary, pretax, taxType, computed: 'takeHome' };
  }
  const th = r.amount == null ? needs('M01', ['take-home']) : monthlyFrom(r.amount, r.per, v.payFrequency);
  if (!taxType || th.value === null) return { takeHome: th, gross: salary, pretax, taxType, computed: null };
  if (salary !== null) return { takeHome: th, gross: salary, pretax, taxType, computed: null }; // both typed: kept as typed (R046)
  const g = grossFromTakeHome({ takeHome: th.value * 12, pretax, filingStatus, selfEmployed }, ref);
  return { takeHome: th, gross: g.value, grossResult: g, pretax, taxType, computed: 'gross' };
}
