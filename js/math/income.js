// SPDX-License-Identifier: AGPL-3.0-only
// M01, M10 to M17: periods, taxes, take-home, match, variable income, real hourly wage.
import { ok, needs, missing, fmt } from './result.js';
import { RULES, LISTS } from '../registry/assumptions.js';
import { workOf, workCash, workText, platformOf, reportedTipsYear } from './earnings.js';

// M01: any period to monthly.
const PER_MONTH = LISTS.perMonth; // the Per table in the assumptions registry
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
// Answer 174 (replaces R041): Single, or Married jointly once the household's relationship stage is Married; a Guess until a filing status is typed.
export function defaultFilingStatus(profile) { const mode = profile?.mode ?? (profile?.household === 'Couple' ? 'Married merged' : null); return mode && /^Married/.test(mode) ? 'Married jointly' : 'Single'; }

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
  // The deductible half is half of the self-employment tax itself (Social Security and Medicare at 15.3%); the
  // Additional Medicare 0.9% is not part of it (IRS Schedule SE).
  const seHalf = selfEmployed ? (ss + base * medRate) / 2 : 0;
  return { ...ok('M11', total, selfEmployed
    ? `Self-employed: 15.3% on 92.35% of ${fmt.money(gross)} (Social Security up to ${fmt.money(t.socialSecurityWageBase)}) = ${fmt.money(total)} a year; half of it is deductible.`
    : `Social Security 6.2% of ${fmt.money(Math.min(base, t.socialSecurityWageBase))} plus Medicare 1.45% of ${fmt.money(base)}${over > 0 ? ` plus 0.9% of the ${fmt.money(over)} over the limit` : ''} = ${fmt.money(total)} a year.`),
  socialSecurity: ss, medicare, deductibleHalf: seHalf };
}

// State and city income tax (B5.1): NY brackets and NYC on NY taxable income. place = { state: 'NY', nyc: true }.
const placeKey = s => (s === 'Married jointly' || s === 'joint' ? 'joint' : s === 'Head of household' ? 'head' : 'single');
const byBrackets = (taxable, brackets) => {
  let tax = 0, marginal = brackets[0][1];
  for (let i = 0; i < brackets.length; i++) {
    const [floor, rate] = brackets[i];
    const ceil = brackets[i + 1]?.[0] ?? Infinity;
    if (taxable > floor) { tax += (Math.min(taxable, ceil) - floor) * rate; marginal = rate; }
  }
  return { tax, marginal };
};
export function stateTax({ gross, pretax = 0, filingStatus = 'Single', place = null }, ref) {
  const st = place?.state ? ref.tax.state?.[place.state] : null;
  if (!st || gross == null) return { state: 0, local: 0, marginal: 0, taxable: null, applies: false };
  const key = placeKey(filingStatus);
  const taxable = Math.max(0, gross - pretax - st.standardDeduction[key]);
  const s = byBrackets(taxable, st.brackets[key]);
  const city = place.nyc && ref.tax.local?.NYC ? byBrackets(taxable, ref.tax.local.NYC.brackets[key]) : { tax: 0, marginal: 0 };
  return { state: s.tax, local: city.tax, marginal: s.marginal + city.marginal, taxable, applies: true, nyc: !!place.nyc };
}

// Household tax (batch 15, item 1; M10 to M12). Income tax is worked out once per tax return, not once per job:
// one return for Married jointly, else one per person. FICA is per person, with the Social Security wage base per
// person (two jobs never pay Social Security past it). Rows are stacked in a fixed order (jobs, then self-employment,
// then unemployment; record order within each), and each row's share is the tax it adds on top of the rows before
// it, so the shares add up to the return's tax and a second job shows the rate it really pays.
// rows: [{ id, person: 'Me' | 'Partner', gross, pretax, taxType, tips }]. Unemployment: income tax, no FICA. tips: the
// row's reported tips a year (batch 35); year: the tax year, for the tips deduction's years (blank: always on).
export const STACK = { 'W-2': 0, '1099': 1, Unemployment: 2 };
const rankOf = t => STACK[t] ?? 0;
export const noFica = t => t === 'Unemployment';
export function householdTax(rows, { filingStatus = 'Single', place = null, year = null } = {}, ref) {
  const t = ref.tax, joint = filingKey(filingStatus) === 'joint';
  const list = rows.filter(r => r.gross != null && r.taxType).map((r, i) => ({ ...r, tips: Math.min(r.tips ?? 0, Math.max(0, r.gross)), i, unit: joint ? 'Household' : r.person === 'Partner' ? 'Partner' : 'Me', rank: rankOf(r.taxType) }))
    .sort((a, b) => a.unit.localeCompare(b.unit) || a.rank - b.rank || a.i - b.i);
  const out = {}, units = {};
  const st = place?.state ? t.state?.[place.state] : null;
  const fedTax = x => byBrackets(x, t.brackets[filingKey(filingStatus)]);
  const pk = placeKey(filingStatus);
  const stateOn = x => (st ? byBrackets(Math.max(0, x - st.standardDeduction[pk]), st.brackets[pk]).tax : 0);
  const cityOn = x => (st && place.nyc && ref.tax.local?.NYC ? byBrackets(Math.max(0, x - st.standardDeduction[pk]), ref.tax.local.NYC.brackets[pk]).tax : 0);
  const std = t.standardDeduction[filingKey(filingStatus)];
  const over = t.additionalMedicareOver[filingKey(filingStatus)];
  const ssBase = {}, uBase = {}, uFed = {}, uState = {};
  for (const r of list) {
    const se = r.taxType === '1099', none = noFica(r.taxType);
    const base = none ? 0 : se ? r.gross * t.selfEmployedBase : r.gross;
    const p = r.person === 'Partner' ? 'Partner' : 'Me';
    const before = ssBase[p] ?? 0; ssBase[p] = before + base;
    const ssRate = se ? t.socialSecurityRate * 2 : t.socialSecurityRate;
    const ss = (Math.min(ssBase[p], t.socialSecurityWageBase) - Math.min(before, t.socialSecurityWageBase)) * ssRate;
    const medicare = base * (se ? t.medicareRate * 2 : t.medicareRate);
    const ub = uBase[r.unit] ?? 0; uBase[r.unit] = ub + base;
    const addl = (Math.max(0, uBase[r.unit] - over) - Math.max(0, ub - over)) * t.additionalMedicareRate;
    const seHalf = se ? (ss + medicare) / 2 : 0;
    const own = Math.max(0, r.gross - (r.pretax ?? 0) - seHalf);
    const fb = uFed[r.unit] ?? 0; uFed[r.unit] = fb + own;
    const federal = fedTax(Math.max(0, uFed[r.unit] - std)).tax - fedTax(Math.max(0, fb - std)).tax;
    const sOwn = Math.max(0, r.gross - (r.pretax ?? 0));
    const sb = uState[r.unit] ?? 0; uState[r.unit] = sb + sOwn;
    const state = stateOn(uState[r.unit]) - stateOn(sb), local = cityOn(uState[r.unit]) - cityOn(sb);
    const fica = ss + medicare + addl;
    out[r.id] = { federal, state, local, fica, socialSecurity: ss, medicare: medicare + addl, seHalf, total: federal + state + local + fica, unit: r.unit, person: p, taxType: r.taxType, gross: r.gross };
  }
  // Batch 35 (QUESTIONS 300): the federal tips deduction, once per return, on reported tips only (rows' tips: what
  // each row reports and keeps, reportedTipsYear). T.D. 10044: up to the cap a return for tax years firstYear to
  // lastYear, then less $100 for each $1,000 of income over the line (worked as 10% of the excess, as Schedule 1-A
  // does; the return's income before the standard deduction stands in for MAGI). Married filing separately gets none.
  // It lowers federal income tax only: Social Security and Medicare are already worked out above, on every tip.
  // Each row with tips takes its share of what the return saves, by its tips.
  const tr = t.tips, sep = filingStatus === 'Married separately';
  const tipsOn = !!tr && !sep && (year == null || (year >= tr.firstYear && year <= tr.lastYear));
  const tipsUnits = {};
  for (const r of list) if ((r.tips ?? 0) > 0 && out[r.id]) tipsUnits[r.unit] = (tipsUnits[r.unit] ?? 0) + r.tips;
  const tipsDed = {};
  for (const [u, tips] of Object.entries(tipsUnits)) {
    const line = joint ? tr.phaseOutJoint : tr.phaseOutSingle;
    const deduction = tipsOn ? Math.max(0, Math.min(tr.deductionCap, tips) - Math.max(0, uFed[u] - line) * tr.phaseOutPer1000 / 1000) : 0;
    const saved = fedTax(Math.max(0, uFed[u] - std)).tax - fedTax(Math.max(0, uFed[u] - std - deduction)).tax;
    tipsDed[u] = { tips, deduction, saved, capped: tips > tr.deductionCap, phasedOut: uFed[u] > line };
  }
  for (const r of list) {
    const d = tipsDed[r.unit], x = out[r.id];
    if (!d || !x || !(r.tips > 0)) continue;
    const share = d.saved * r.tips / d.tips;
    x.tipsSaved = share; x.federal -= share; x.total -= share;
  }
  for (const [u, taxable] of Object.entries(uFed)) {
    const f = fedTax(Math.max(0, taxable - std - (tipsDed[u]?.deduction ?? 0)));
    const sTax = st ? byBrackets(Math.max(0, uState[u] - st.standardDeduction[pk]), st.brackets[pk]) : { marginal: 0 };
    const cTax = st && place.nyc && ref.tax.local?.NYC ? byBrackets(Math.max(0, uState[u] - st.standardDeduction[pk]), ref.tax.local.NYC.brackets[pk]) : { marginal: 0 };
    units[u] = { taxable: Math.max(0, taxable - std - (tipsDed[u]?.deduction ?? 0)), federalMarginal: f.marginal, stateMarginal: sTax.marginal + cTax.marginal, base: uBase[u] ?? 0, tips: tipsDed[u] ?? null };
  }
  const all = Object.values(out);
  const add = k => all.reduce((s2, x) => s2 + (x[k] ?? 0), 0);
  const total = { federal: add('federal'), state: add('state'), local: add('local'), fica: add('fica'), all: add('total'), gross: add('gross'), tipsSaved: add('tipsSaved') };
  const tipsList = Object.values(tipsDed);
  const tips = tipsList.length ? { tips: tipsList.reduce((s2, d) => s2 + d.tips, 0), deduction: tipsList.reduce((s2, d) => s2 + d.deduction, 0), saved: total.tipsSaved,
    inWindow: tipsOn, separate: sep, capped: tipsList.some(d => d.capped), phasedOut: tipsList.some(d => d.phasedOut), year } : null;
  return { rows: out, units, total, joint, tips, text: `${all.length} income ${all.length === 1 ? 'row' : 'rows'} on ${Object.keys(units).length === 1 ? 'one return' : `${Object.keys(units).length} returns`}: federal ${fmt.money(total.federal)} + FICA ${fmt.money(total.fica)}${st ? ` + ${place.state} ${fmt.money(total.state)}${place.nyc ? ` + NYC ${fmt.money(total.local)}` : ''}` : ''} = ${fmt.money(total.all)} a year.` };
}

// Batch 35: the tips deduction as Taxes says it, in one line. hh: householdTax; income: the metrics' income rows (each
// with its tax share and withholding). A job typed as take-home holds back as if there were no deduction, so what it
// saves comes back when the return is filed (or less is held back through the W-4's deductions line). Cash tips that
// are not reported get none, and the line says so. Returns null when no row has tips.
export function tipsDeductionOf(hh, income, ref) {
  const t = ref.tax.tips, d = hh?.tips;
  const rows = (income || []).filter(i => i.work?.any && (i.work.card || i.work.cash));
  if (!rows.length) return null;
  const unreported = rows.filter(i => i.work.cash && i.work.reported !== 'Yes').length > 0;
  const none = unreported ? ' Cash tips not reported get none.' : '';
  const tip = `IRS T.D. 10044 (Apr 2026): tips reported in a job on the IRS list of tipped jobs (bartenders, servers, dancers and digital creators are on it) come off federal taxable income, up to ${fmt.money(t.deductionCap)} a return, tax years ${t.firstYear} to ${t.lastYear}, less $${t.phaseOutPer1000} for each $1,000 of income over ${fmt.money(t.phaseOutSingle)} (${fmt.money(t.phaseOutJoint)} married jointly). Married filing separately gets none. Income tax only: Social Security and Medicare still apply to every tip.`;
  if (!d || !d.tips) return { saved: 0, deduction: 0, tips: 0, refund: 0, unreported, tip, text: `Tips deduction: none yet, because no tips are reported. Reported tips would come off federal taxable income (up to ${fmt.money(t.deductionCap)} a year through ${t.lastYear}).` };
  if (d.separate) return { saved: 0, deduction: 0, tips: d.tips, refund: 0, unreported, tip, text: `Tips deduction: none on a married filing separately return (it needs a joint return).${none}` };
  if (!d.inWindow) return { saved: 0, deduction: 0, tips: d.tips, refund: 0, unreported, tip, text: `Tips deduction: none for ${d.year} (it covers ${t.firstYear} to ${t.lastYear}).${none}` };
  const typed = rows.filter(i => i.computed === 'gross' && i.taxType !== '1099' && (i.tipsYear ?? 0) > 0);
  const refund = typed.reduce((s2, i) => s2 + Math.max(0, (i.withheld ?? 0) - (i.tax?.total ?? 0)), 0);
  const why = d.phasedOut ? ` (less, because income is over ${fmt.money(hh.joint ? t.phaseOutJoint : t.phaseOutSingle)})` : d.capped ? ` (the most a year is ${fmt.money(t.deductionCap)})` : '';
  return { saved: d.saved, deduction: d.deduction, tips: d.tips, refund, unreported,
    text: `Tips deduction: ${fmt.money(d.deduction)} of reported tips off federal taxable income${why}, ${fmt.money(d.saved)} less federal income tax a year.${refund > 0.5 ? ` Your paychecks do not know it yet: about ${fmt.money(refund)} comes back when you file.` : ''}${none}`,
    tip: `${tip}${refund > 0.5 ? ' Paychecks are held back as if there were no deduction; the W-4\'s deductions line (step 4b) holds back less instead.' : ''}` };
}

// Batch 35 (QUESTIONS 306): what Taxes says about state tax, in one line. NY (and NYC) is worked out; a state with no
// tax on wages has none to count; any other state is not counted yet (Phase 5). state: the profile's two letters.
export function stateTaxLine(state, ref) {
  if (!state) return 'Federal and FICA. Pick a state on About you: state tax is worked out for New York so far.';
  if (state === 'NY') return null; // the NY line says what it counts
  if ((ref.tax.noWageTax?.states || []).includes(state)) return `Federal and FICA. ${state} has no state income tax on wages, so there is none to count.`;
  return `Federal and FICA. ${state} state income tax is not counted yet: it comes in Phase 5.`;
}

// The household's rates (Taxes): effective is all tax over everything taxed; marginal is the next dollar of pay on
// this client's return: the federal bracket, state and city, and FICA (7.65% under the wage base, then 1.45%, plus
// 0.9% past the Additional Medicare line).
export function householdRates(hh, ref, { person = 'Me' } = {}) {
  const t = hh?.total;
  if (!t || !t.gross) return needs('M14', ['gross pay'], { unit: 'pct' });
  const unit = hh.joint ? 'Household' : person === 'Partner' ? 'Partner' : 'Me';
  const u = hh.units[unit] ?? Object.values(hh.units)[0];
  const mine = Object.values(hh.rows).filter(r => (hh.joint || r.person === (person === 'Partner' ? 'Partner' : 'Me')) && r.taxType !== 'Unemployment' && r.taxType !== '1099');
  const ssBase = Object.values(hh.rows).filter(r => r.person === (person === 'Partner' ? 'Partner' : 'Me') && r.taxType !== 'Unemployment').reduce((s2, r) => s2 + (r.taxType === '1099' ? r.gross * ref.tax.selfEmployedBase : r.gross), 0);
  const fica = (ssBase < ref.tax.socialSecurityWageBase ? ref.tax.socialSecurityRate : 0) + ref.tax.medicareRate + ((u?.base ?? 0) > ref.tax.additionalMedicareOver[hh.joint ? 'joint' : 'single'] ? ref.tax.additionalMedicareRate : 0);
  const ficaMarginal = mine.length || !Object.values(hh.rows).length ? fica : 0;
  const marginal = (u?.federalMarginal ?? 0) + (u?.stateMarginal ?? 0) + ficaMarginal;
  const effective = t.all / t.gross;
  return { ...ok('M14', effective, `All tax on the return${Object.keys(hh.units).length > 1 ? 's' : ''} (${fmt.money(t.all)}) over everything taxed (${fmt.money(t.gross)}) = ${fmt.pct(effective)}. The next dollar of pay is taxed at ${fmt.pct(marginal)}: federal ${fmt.pct(u?.federalMarginal ?? 0)}${u?.stateMarginal ? ` + state and city ${fmt.pct(u.stateMarginal)}` : ''} + FICA ${fmt.pct(ficaMarginal)}.`, { unit: 'pct' }),
    effective, marginal, federalMarginal: u?.federalMarginal ?? 0, stateMarginal: u?.stateMarginal ?? 0, ficaMarginal };
}

// Quarterly estimates (batch 15, item 3): the tax self-employment income adds on top of everything else (its stacked
// share, SE tax included), as a share of each dollar and split over the four due dates (IRS Form 1040-ES).
export function quarterlySetAside(hh, ref, { year = new Date().getFullYear(), paid = 0 } = {}) {
  const se = Object.values(hh?.rows || {}).filter(r => r.taxType === '1099');
  if (!se.length) return null;
  const yearly = se.reduce((s2, r) => s2 + r.total, 0), gross = se.reduce((s2, r) => s2 + r.gross, 0);
  const each = Math.max(0, yearly - (paid ?? 0)) / 4;
  const due = (ref.tax.quarterlyDue || []).map((md, i) => `${i === 3 ? year + 1 : year}-${md}`);
  const rate = gross ? yearly / gross : null;
  return { yearly, gross, rate, quarterly: yearly / 4, each, due,
    text: `Self-employment income ${fmt.money(gross)} a year adds ${fmt.money(yearly)} of tax (income tax at your rates plus self-employment tax) on top of your other income: ${rate == null ? '' : `${Math.round(rate * 100)} cents of each dollar, `}${fmt.money(yearly / 4)} each quarter.` };
}

// Unemployment benefits (batch 15, item 13): taxable for federal and state income tax, no FICA, nothing withheld
// unless the person asks for the 10% federal withholding (IRS Form W-4V). Weeks this tax year, for the tax.
export function benefitWeeksThisYear({ start = null, end = null, now = new Date(), maxWeeks = 26 } = {}) {
  const y = now.getUTCFullYear();
  const day = s => Date.parse(`${s}T00:00:00Z`);
  const jan1 = Date.UTC(y, 0, 1), dec31 = Date.UTC(y, 11, 31);
  if (!start && !end) return 52;
  const e = end ? day(end) : dec31;
  const s0 = start ? day(start) : e - maxWeeks * 7 * 86400000;
  const from = Math.max(s0, jan1), to = Math.min(e, dec31);
  return to < from ? 0 : Math.round((to - from) / (7 * 86400000));
}

// M12: annual take-home from annual gross.
// roth: Roth 401(k) money from the paycheck. It leaves take-home like a before-tax deduction but is taxed first,
// so it never lowers taxable income (answer to question 82).
export function takeHomeFromGross({ gross, pretax = 0, roth = 0, filingStatus = 'Single', selfEmployed = false, place = null }, ref) {
  if (gross === null || gross === undefined) return needs('M12', ['gross pay']);
  const f = fica({ gross, filingStatus, selfEmployed }, ref);
  const fed = federalTax({ gross, pretax, filingStatus, selfEmployedHalf: f.deductibleHalf }, ref);
  const st = stateTax({ gross, pretax, filingStatus, place }, ref);
  const v = gross - fed.value - f.value - st.state - st.local - pretax - roth;
  const where = st.applies ? ` minus ${fmt.money(st.state)} ${place.state} state tax${st.nyc ? ` minus ${fmt.money(st.local)} NYC tax` : ''}` : '';
  return { ...ok('M12', v, `${fmt.money(gross)} gross minus ${fmt.money(fed.value)} federal tax minus ${fmt.money(f.value)} FICA${where} minus ${fmt.money(pretax)} before-tax deductions${roth ? ` minus ${fmt.money(roth)} Roth 401(k), after tax` : ''} = ${fmt.money(v)} a year take-home (${fmt.money(v / 12)} a month).${st.applies ? '' : ' State tax is in only for New York so far.'}`), federal: fed, fica: f, stateTax: st };
}

// M13: gross from take-home, by bisection to the nearest $1. Marked Computed.
export function grossFromTakeHome({ takeHome, pretax = 0, roth = 0, filingStatus = 'Single', selfEmployed = false, place = null }, ref) {
  if (takeHome === null || takeHome === undefined) return needs('M13', ['take-home pay']);
  let lo = takeHome, hi = takeHome * 3 + 100000;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (takeHomeFromGross({ gross: mid, pretax, roth: typeof roth === 'function' ? roth(mid) : roth, filingStatus, selfEmployed, place }, ref).value < takeHome) lo = mid; else hi = mid;
  }
  const gross = Math.round(hi);
  return { ...ok('M13', gross, `Worked backwards from ${fmt.money(takeHome)} a year take-home: the gross that leaves exactly that after federal tax, FICA, state and city tax (where they apply) and before-tax deductions is ${fmt.money(gross)}.`), status: 'Computed' };
}

// M14: effective and marginal rates.
export function taxRates({ gross, pretax = 0, filingStatus = 'Single', selfEmployed = false, place = null }, ref) {
  if (!gross) return needs('M14', ['gross pay'], { unit: 'pct' });
  const r = takeHomeFromGross({ gross, pretax, filingStatus, selfEmployed, place }, ref);
  const st = r.stateTax;
  const total = r.federal.value + r.fica.value + st.state + st.local;
  const effective = total / gross;
  const ficaMarginal = gross < ref.tax.socialSecurityWageBase ? ref.tax.socialSecurityRate + ref.tax.medicareRate : ref.tax.medicareRate;
  const marginal = r.federal.marginal + ficaMarginal + st.marginal;
  const parts = `federal ${fmt.money(r.federal.value)} + FICA ${fmt.money(r.fica.value)}${st.applies ? ` + ${place.state} ${fmt.money(st.state)}${st.nyc ? ` + NYC ${fmt.money(st.local)}` : ''}` : ''}`;
  return { ...ok('M14', effective, `All income tax (${parts} = ${fmt.money(total)}) divided by gross (${fmt.money(gross)}) = ${fmt.pct(effective)}. The last dollar is taxed at ${fmt.pct(marginal)}: federal ${fmt.pct(r.federal.marginal)} + FICA ${fmt.pct(ficaMarginal)}${st.applies ? ` + state and city ${fmt.pct(st.marginal)}` : ''}.`, { unit: 'pct' }),
    effective, marginal, federalMarginal: r.federal.marginal, ficaMarginal, stateMarginal: st.marginal, parts: { federal: r.federal.value, fica: r.fica.value, state: st.state, local: st.local } };
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
  const v = typicalMonth * RULES.variableGuessShare * (1 - rate);
  return ok('M16', v, `No lowest month yet, so 75% of a typical month (${fmt.money(typicalMonth)}) is used as a guess, minus ${fmt.pct(rate)} for taxes = ${fmt.money(v)} a month.`, { guess: true });
}

// Batch 15, item 11 (YNAB's live on last month's income, adapted): an irregular income plan. The base month is what
// you can count on (M16, the slow month after tax); the extra is a typical month after tax less the base; the extra
// goes down the FOO order; and a lean-season fund covers the swing: with twelve months typed, every month's shortfall
// under the typical month added up, else the swing times RULES.leanSeasonMonths.
export function irregularPlan({ lowestMonth, typicalMonth, months = null, setAside = null }, ref) {
  const rate = setAside ?? ref.defaults.taxSetAside;
  const base = variableSafeBudget({ lowestMonth, typicalMonth, setAside: rate }, ref);
  if (base.value == null || typicalMonth == null) return { value: null, needs: base.value == null ? base.needs : ['a typical month'], base };
  const good = typicalMonth * (1 - rate);
  const extra = Math.max(0, good - base.value);
  const typed = (months || []).filter(v => v != null);
  const fromMonths = typed.length === 12 ? typed.reduce((s2, v) => s2 + Math.max(0, typicalMonth - v) * (1 - rate), 0) : null;
  const fund = fromMonths ?? extra * RULES.leanSeasonMonths;
  return { ...ok('M16', fund, fromMonths != null ? `Twelve months typed: every month under the typical ${fmt.money(typicalMonth)}, after ${fmt.pct(rate)} for taxes, adds up to ${fmt.money(fund)} to hold for the lean months.` : `The swing between a typical month and the base, after ${fmt.pct(rate)} for taxes, is ${fmt.money(extra)}; ${RULES.leanSeasonMonths} months of it is ${fmt.money(fund)} to hold for the lean season.`),
    base: base.value, baseGuess: !!base.guess, good, extra, fund, rate, fromMonths: fromMonths != null };
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
// Jobs pay tax; benefits and money from family are counted as they land. Each row is worked out on its own here
// (what its paychecks hold back); the household's return (householdTax, batch 15) then sets each row's share.
const TAXED = { Job: 'W-2', 'Partner job': 'W-2', 'Side hustle': '1099', 'Self-employed': '1099', Platform: '1099' }; // batch 27: platform payouts are self-employment income
export const taxTypeOf = r => r.values?.incomeType ?? TAXED[r.type] ?? null;
const PAYCHECKS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
// An Unemployment row with no tax type picked is a benefit: counted weekly as it lands, less the 10% federal
// withholding when chosen; its income tax is worked out on the household's return (householdTax).
// A tax type of Benefits is the same benefit (found on a real household: picking it fell back to a paycheck with FICA).
export const isBenefitRow = r => r?.kind === 'income' && r.type === 'Unemployment' && (!r.values?.incomeType || r.values.incomeType === 'Benefits');
export function benefitRow(r, { ref, now = new Date() } = {}) {
  const v = r.values || {};
  if (r.amount == null) return { takeHome: needs('M01', ['the weekly amount']), gross: null, pretax: 0, roth: 0, afterTax: 0, parts: null, taxType: null, computed: null, benefit: null };
  const monthly = monthlyFrom(r.amount, r.per ?? 'week', v.payFrequency).value;
  const w = v.withhold === 'Yes' ? ref.tax.unemployment.withholdRate : 0;
  const weekly = monthly * 12 / 52;
  const weeks = benefitWeeksThisYear({ start: v.benefitStart ?? null, end: v.benefitEnd ?? null, now, maxWeeks: ref.limits.unemployment.NY.weeks });
  const th = monthly * (1 - w);
  return { takeHome: ok('M12', th, `${fmt.money(weekly)} a week is ${fmt.money(monthly)} a month${w ? `, minus the ${fmt.pct(w)} federal tax you chose to have withheld` : ', with no tax withheld'} = ${fmt.money(th)} a month.${v.benefitEnd ? ` Ends ${v.benefitEnd}.` : ''}`),
    gross: null, pretax: 0, roth: 0, afterTax: 0, parts: null, taxType: null, computed: null,
    benefit: { weekly, monthly, withholdRate: w, weeks, thisYear: weekly * weeks, withheld: weekly * weeks * w, end: v.benefitEnd ?? null, start: v.benefitStart ?? null } };
}
// Batch 27 (income by type): a Platform row is taxed on its payouts net of the platform's fee and chargebacks (the fee
// is a business cost); a shift job with no paycheck typed is taxed on the gross its shifts add up to; tips and fees
// paid in cash land on top of the paycheck (js/math/earnings.js). takeHome is the whole row; paycheck is the part
// that is the paycheck (what the withholding is worked out on), extra the cash on top.
export function incomeRow(r, opts) {
  if (isBenefitRow(r)) return benefitRow(r, { ref: opts.ref, now: opts.now ?? new Date() });
  if (r.type === 'Platform') {
    const p = platformOf(r, opts.ref);
    const taxed = taxTypeOf(r);
    const row = { ...r, amount: null, per: 'month', values: { ...r.values, basis: 'Take-home', gross: p.net === null ? null : p.net * 12 } };
    const out = taxed ? rowCore(row, opts) : { takeHome: p.net === null ? needs('M01', ['the gross a month']) : ok('M12', p.net, p.text), gross: null, pretax: 0, roth: 0, afterTax: 0, parts: null, taxType: null, computed: null };
    if (out.takeHome?.value != null && taxed) out.takeHome = { ...out.takeHome, text: `${p.text} ${out.takeHome.text}` };
    return { ...out, platform: p, extra: 0, grossExtra: 0 };
  }
  const w = workOf(r);
  if (!w.any) return rowCore(r, opts);
  const taxType = taxTypeOf(r) === '1099' ? '1099' : 'W-2';
  const c = workCash(w, { paycheckTyped: r.amount != null, taxType });
  const row = c.mode === 'shifts' ? { ...r, amount: null, values: { ...r.values, basis: 'Take-home', gross: c.grossYear } } : r;
  const out = rowCore(row, opts);
  const paid = out.takeHome?.value ?? null;
  const tipsYear = reportedTipsYear(w, c); // batch 35: the reported tips the household's return deducts (householdTax)
  if (paid === null) return { ...out, work: w, cash: c, extra: c.extra, grossExtra: c.grossExtra, tipsYear };
  const total = paid + c.extra;
  return { ...out, work: w, cash: c, paycheck: paid, extra: c.extra, grossExtra: c.grossExtra, tipsYear,
    takeHome: { ...out.takeHome, value: total, text: `${out.takeHome.text} ${workText(w, c, total)}`.trim() } };
}
function rowCore(r, { filingStatus = 'Single', ref, place = null, now = new Date() }) {
  const v = r.values || {};
  const taxType = taxTypeOf(r);
  const perYear = PAYCHECKS[v.payFrequency] ?? 26;
  const yearly = (x, per) => (x == null ? null : monthlyFrom(x, per, v.payFrequency).value * 12);
  const typedGross = v.basis === 'Gross' ? yearly(r.amount, r.per) : v.gross ?? null;
  const salary = typedGross ?? null;
  // A Roth 401(k) (v.k401Roth, or the Roth part of Both, v.k401RothShare) comes out after tax: same take-home effect, no tax cut.
  const k401 = (g, pct = v.contributionPct) => (g ?? 0) * (pct ?? 0) + (v.contributionPct == null ? (v.k401Paycheck ?? 0) * perYear : 0);
  // Benefits at work (answer to 58): commuter and the FSAs come out before tax; ESPP and after-tax 401(k) after tax.
  const others = ((v.premium ?? 0) + (v.hsaFsa ?? 0) + (v.otherPretax ?? 0) + (v.benefitPretax ?? 0)) * perYear;
  const afterTax = (v.benefitAfterTax ?? 0) * perYear;
  // The Roth share of the 401(k) money: all of it (Roth), a part (Both, as a % or dollars a paycheck), or none.
  const rothOf = total => (v.k401Roth ? total : !v.k401RothShare ? 0
    : Math.min(total, v.k401RothShare.pct != null ? total * v.k401RothShare.pct : (v.k401RothShare.perPaycheck ?? 0) * perYear));
  // Each piece taken from the paycheck, a year, for the "Comes out of your paycheck" section.
  const partsAt = g => ({ k401: k401(g) - rothOf(k401(g)), k401Roth: rothOf(k401(g)), premium: (v.premium ?? 0) * perYear, hsaFsa: (v.hsaFsa ?? 0) * perYear,
    otherPretax: (v.otherPretax ?? 0) * perYear, benefitPretax: (v.benefitPretax ?? 0) * perYear, afterTax, paychecks: perYear });
  const split = g => ({ pretax: others + k401(g) - rothOf(k401(g)), roth: rothOf(k401(g)) });
  const taxArgs = g => { const x = split(g); return { pretax: x.pretax, roth: x.roth + afterTax }; }; // after-tax money: like Roth, no tax cut
  const pretax = split(salary).pretax;
  const roth = split(salary).roth;
  const selfEmployed = taxType === '1099';
  if (taxType && salary !== null && (v.basis === 'Gross' || r.amount == null)) { // gross only: take-home is solved
    const t = takeHomeFromGross({ gross: salary, ...taxArgs(salary), filingStatus, selfEmployed, place }, ref);
    return { takeHome: { ...t, value: t.value / 12, text: t.text, status: 'Computed' }, gross: salary, pretax, roth, afterTax, parts: partsAt(salary), taxType, computed: 'takeHome' };
  }
  const th = r.amount == null ? needs('M01', ['take-home']) : monthlyFrom(r.amount, r.per, v.payFrequency);
  if (!taxType || th.value === null) return { takeHome: th, gross: salary, pretax, roth, afterTax, parts: partsAt(salary), taxType, computed: null };
  if (salary !== null) return { takeHome: th, gross: salary, pretax, roth, afterTax, parts: partsAt(salary), taxType, computed: null }; // both typed: kept as typed (R046)
  // A 401(k) % is a share of the gross being solved for, so solve again with it until it settles.
  let g = grossFromTakeHome({ takeHome: th.value * 12, ...taxArgs(null), filingStatus, selfEmployed, place }, ref);
  for (let i = 0; i < 6 && v.contributionPct; i++) {
    const next = grossFromTakeHome({ takeHome: th.value * 12, ...taxArgs(g.value), filingStatus, selfEmployed, place }, ref);
    if (Math.abs(next.value - g.value) < 1) { g = next; break; }
    g = next;
  }
  const out = split(g.value);
  return { takeHome: th, gross: g.value, grossResult: g, pretax: out.pretax, roth: out.roth, afterTax, parts: partsAt(g.value), taxType, computed: 'gross' };
}
