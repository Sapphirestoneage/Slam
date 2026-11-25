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
import { gigNeedOf, gigHoursOf, gigFloorFrom, gigSoFarFrom, gigRetireOf, gigLimitsOf } from './gig.js';

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
    parts: { income: g.federal, selfEmployment: g.fica, state: g.state + g.local }, soFar, place: pl, filingStatus, text: q.text };
}

// Retirement: the base (profit less half the self-employment tax, from M11) and what each account holds.
export function gigRetire({ profit = null, age = null, deferredAtJob = 0, want = null } = {}, ref) {
  if (!(profit > 0)) return { ready: false };
  const se = fica({ gross: profit, selfEmployed: true }, ref);
  return gigRetireOf({ profit, seHalf: se.deductibleHalf, age, deferredAtJob, want, limits: gigLimitsOf(ref.limits) });
}
