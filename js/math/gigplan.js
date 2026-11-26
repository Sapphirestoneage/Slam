// SPDX-License-Identifier: AGPL-3.0-only
// Gig and self-employed, the parts on the plan's own tax engine (run Not built, groups 1 to 5, Part 5; M8G). Nothing
// here works a tax out a second way: the price floor grosses up through grossFromTakeHome (M13, self-employed), the
// set-aside stacks the profit on any job's pay through householdTax and quarterlySetAside (the same function the Taxes
// screen uses), and the retirement base takes half the self-employment tax from fica (M11). The rest is js/math/gig.js.
//
// Built to be extended (run 1 Part 14, "Pricing your power" and the "Tax Command Center"): gigRate returns the floor
// an hour, a day and a unit, so a gig's own pay can be put next to it; gigSetAside returns the rate, the year's tax,
// the four due dates (tax.quarterlyDue) and the tax so far, so safe harbor and the dates can be added on top.
import { grossFromTakeHome, householdTax, quarterlySetAside, fica } from './income.js';
import { gigNeedOf, gigHoursOf, gigFloorFrom, gigSoFarFrom, gigRetireOf, gigLimitsOf, gigSafeHarborOf, gigVsFloorOf } from './gig.js';

// place: 'nyc' (New York City), 'ny' (New York State) or anything else (federal only).
export const GIG_PLACES = { nyc: { state: 'NY', nyc: true }, ny: { state: 'NY', nyc: false } };
const placeOf = p => GIG_PLACES[p] ?? null;

// The price floor: the life a month (takeHome), health cover a month, retirement a year, business costs a month, the
// hours a week, the share of them that is billable, weeks off a year, and the hours of one unit of work.
export function gigRate({ takeHome = null, health = 0, retire = 0, costs = 0, hoursWeek = null, billable = null, weeksOff = 0, unitHours = null, filingStatus = 'Single', place = null } = {}, ref) {
  const need = gigNeedOf({ takeHome, health, retire }), hours = gigHoursOf({ hoursWeek, billable, weeksOff });
  if (!need.ready || !hours.ready) return { ready: false, need, hours };
  const pl = placeOf(place), profit = grossFromTakeHome({ takeHome: need.year, selfEmployed: true, filingStatus, place: pl }, ref).value;
  const floor = gigFloorFrom({ profit, costs, hours, unitHours });
  const tax = profit - need.year;
  return { ...floor, need, hours, tax, taxShare: profit > 0 ? tax / profit : 0, place: pl, filingStatus };
}

// The set-aside: the tax this year's profit adds on top of any job's pay (income tax at your rates, the
// self-employment tax, state and city where set), as a share of each dollar, a year and a quarter; then what is owed
// so far on the profit so far, next to what is set aside. wages: a job's pay a year before tax (its own withholding
// is taken to cover it); pretax: that job's before-tax deductions.
export function gigSetAside({ profit = null, wages = 0, pretax = 0, filingStatus = 'Single', place = null, earned = null, set = 0, year = null } = {}, ref) {
  if (!(profit > 0)) return { ready: false };
  const rows = [...((wages ?? 0) > 0 ? [{ id: 'job', taxType: 'W-2', gross: wages, pretax: pretax ?? 0 }] : []), { id: 'gig', taxType: '1099', gross: profit }];
  const pl = placeOf(place), hh = householdTax(rows, { filingStatus, place: pl }, ref);
  const q = quarterlySetAside(hh, ref, { year: year ?? new Date().getFullYear() });
  const g = hh.rows.gig, soFar = gigSoFarFrom({ rate: q.rate, earned, set });
  return { ready: true, profit, wages: wages ?? 0, rate: q.rate, yearly: q.yearly, quarterly: q.quarterly, due: q.due, per100: q.rate * 100,
    parts: { income: g.federal, selfEmployment: g.fica, state: g.state + g.local }, soFar, place: pl, filingStatus, text: q.text,
    jobFederal: hh.rows.job?.federal ?? 0, federal: (hh.rows.job?.federal ?? 0) + g.federal + g.fica };
}

// The Tax Command Center (run Finish everything partly built, Part 14): the set-aside above, and on top of it the safe
// harbor on this year's federal tax (a job's income tax, the work's income tax and its self-employment tax; state tax
// has rules of its own and is not in the safe harbor), the four dates and what is owed by the next one.
// set: set aside and not paid yet; paid: estimates paid so far this year (both count toward what is owed so far).
// withheld: what a job withholds this year; left empty, the job's own income tax is taken as withheld (as above).
// lastYear, lastAgiOver, lastFull: last year's total tax, AGI over the line (true, false, or null for not sure), and
// whether last year's return covered 12 months. today: YYYY-MM-DD.
export function gigTaxCenter({ lastYear = null, lastAgiOver = null, lastFull = true, withheld = null, paid = 0, set = 0, today = null, ...rest } = {}, ref) {
  const S = gigSetAside({ ...rest, set: (set ?? 0) + (paid ?? 0) }, ref);
  if (!S.ready) return S;
  const day = today ?? new Date().toISOString().slice(0, 10), w = withheld ?? S.jobFederal;
  const harbor = gigSafeHarborOf({ thisYear: S.federal, lastYear, lastAgiOver, lastFull, withheld: w, paid, due: S.due, today: day, rule: ref.tax.safeHarbor });
  return { ...S, harbor, withheld: w, withheldGuess: withheld == null, today: day };
}

// Pricing your power (Part 14): the floor an hour (gigRate) next to what a gig or app pays an hour.
export function gigPricing({ gigPay = null, ...rest } = {}, ref) {
  const R = gigRate(rest, ref);
  if (!R.ready) return R;
  return { ...R, vs: gigVsFloorOf({ floor: R.hourly, pay: gigPay, month: R.month }) };
}

// Retirement: the base (profit less half the self-employment tax, from M11) and what each account holds.
export function gigRetire({ profit = null, age = null, deferredAtJob = 0, want = null } = {}, ref) {
  if (!(profit > 0)) return { ready: false };
  const se = fica({ gross: profit, selfEmployed: true }, ref);
  return gigRetireOf({ profit, seHalf: se.deductibleHalf, age, deferredAtJob, want, limits: gigLimitsOf(ref.limits) });
}
