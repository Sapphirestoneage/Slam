// SPDX-License-Identifier: AGPL-3.0-only
// Shift P&L (batch 51, Phase 5 real lives wave 2, M9H): what a shift really pays after the ride, the babysitter, the
// outfits and every hour around it. Pure: reads a metrics income row (js/math/income.js incomeRow, with its Tips and
// shifts from js/math/earnings.js), never the DOM, never saves.
//
// For each shift row (a row with shifts a week), a shift:
//   gross       pay (or the paycheck before tax, which holds the wage and card tips), card tips, cash tips
//   minus       the house or stage fee, the tip-out, and the tax: whatever lies between the gross and the row's own
//               take-home a shift (tax set aside on a 1099 row, tax and payroll deductions on a paycheck), so the
//               take-home a shift here is the one Tips and shifts shows, to the cent
//   minus       getting there: a ride or transit fare each way (both ways unless one way is tapped), or the miles
//               driven at the IRS business rate (reference data, mileage), childcare for those hours (sitter hours x
//               the sitter's rate), and outfits and gear spread over the shifts they last
//   = what the shift leaves you; over every hour it takes (getting ready, travel, the shift, winding down) = the real
//     hourly, beside the shift's own hourly (take-home over the shift's hours) and the client's hourly value (M17).
// These costs are a view of one shift: the plan's spending (the gut number, the Budget lines) already holds what is
// spent on rides and sitters, so nothing here changes the surplus.
import { fmt } from './result.js';
import { workCash, unreportedTaxRate } from './earnings.js';
import { householdRates } from './income.js';

export const TRAVEL_BY = ['Ride', 'Drive', 'Transit', 'Walk'];
export const COST_KEYS = ['travelBy', 'travelCost', 'travelWays', 'milesShift', 'travelHours', 'prepHours', 'windDownHours', 'sitterHours', 'sitterRate', 'gearCost', 'gearShifts'];
const num = x => (x === null || x === undefined || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
const r2 = x => Math.round(x * 100) / 100;
const m = x => fmt.money(x, { cents: true });

// A row with shifts a week and a take-home: the rows the P&L reads.
export const isShiftRow = x => !!(x?.work?.shiftsMonth > 0 && x.takeHome?.value != null);

// The costs of one shift from the row's values: getting there, childcare, outfits and gear.
export function shiftCostsOf(v = {}, ref = {}) {
  const by = v.travelBy ?? null, cost = num(v.travelCost), ways = num(v.travelWays) ?? 2, miles = num(v.milesShift);
  const rate = ref.mileage?.rate ?? null;
  const travel = by === 'Drive' ? (miles != null && rate != null ? { amount: miles * rate, text: `${fmt.number(miles)} miles at the IRS ${fmt.number(rate * 100)} cents a mile` } : null)
    : by === 'Ride' || by === 'Transit' ? (cost != null ? { amount: cost * ways, text: ways === 1 ? `${m(cost)} one way` : `${ways} x ${m(cost)}, both ways` } : null)
      : by === 'Walk' ? { amount: 0, text: 'on foot' } : null;
  const sh = num(v.sitterHours), sr = num(v.sitterRate);
  const childcare = sh != null && sr != null ? { amount: sh * sr, text: `${fmt.number(sh)} ${sh === 1 ? 'hour' : 'hours'} x ${m(sr)}` } : null;
  const gc = num(v.gearCost), gn = num(v.gearShifts);
  const gear = gc != null && gn ? { amount: gc / gn, text: `${fmt.money(gc)} over ${fmt.number(gn)} shifts` } : null;
  return { by, travel, childcare, gear, total: (travel?.amount ?? 0) + (childcare?.amount ?? 0) + (gear?.amount ?? 0) };
}

// The hours one shift takes: getting ready, travel there and back, the shift, winding down after.
export function shiftHoursOf(v = {}) {
  const shift = num(v.hoursShift), prep = num(v.prepHours), travel = num(v.travelHours), down = num(v.windDownHours);
  const total = shift == null ? null : shift + (prep ?? 0) + (travel ?? 0) + (down ?? 0);
  return { shift, prep, travel, windDown: down, total, around: (prep ?? 0) + (travel ?? 0) + (down ?? 0) };
}

// Batch 60 (QUESTIONS 422): a row with nights (js/math/earnings.js) splits into one P&L a night. Each night's take-home
// a month is its own gross less its house fee and tip-out, less its part of the row's tax: the tax shared by what each
// night adds to the taxed gross (by its shifts on a paycheck row, where the tax is the paycheck's), so the nights' take-
// homes add up to the row's to the cent. Returns [{ id, name, n (the night's own boxes), w, share, gross, takeHome }].
export function nightsOf(x) {
  const W = x?.work;
  if (!W?.nights?.length || x.takeHome?.value == null) return null;
  const c = x.cash, v = x.r.values || {}, paycheck = c?.mode === 'paycheck';
  const month = p => p?.month ?? 0;
  const taxType = x.taxType === '1099' ? '1099' : 'W-2';
  const rows = W.nights.map((nt, i) => {
    const share = W.shiftsMonth ? (nt.w.shiftsMonth ?? 0) / W.shiftsMonth : 0;
    const gross = paycheck ? ((x.gross ?? 0) / 12) * share + month(nt.w.cash) : month(nt.w.pay) + month(nt.w.card) + month(nt.w.cash);
    const base = paycheck ? share : Math.max(0, (workCash(nt.w, { taxType })?.grossYear ?? 0) / 12);
    return { id: nt.id, name: nt.name, n: v.nights?.[i] ?? {}, w: nt.w, share, gross, net: gross - month(nt.w.fee) - month(nt.w.tipOut), base };
  });
  const net = rows.reduce((t, r) => t + r.net, 0), bases = rows.reduce((t, r) => t + r.base, 0);
  const tax = net - x.takeHome.value; // the row's tax a month: whatever lies between its gross less fees and tip-out and its take-home
  return rows.map(r => ({ ...r, takeHome: r.net - tax * (bases ? r.base / bases : r.share) }));
}

// One shift row's P&L (or one night of it: night from nightsOf). x: a metrics income row; hourly: the household's hourly
// value (metrics hourly, M17); cashRate: the share of unreported cash tips that would go to tax if it were set aside
// (QUESTIONS 424, the rate of the tips note on Tips and shifts), or null.
export function shiftPnlOf(x, { ref = {}, hourly = null, cashRate = null } = {}, night = null) {
  if (!isShiftRow(x)) return null;
  const c = x.cash, rv = x.r.values || {}, w = night ? night.w : x.work, sm = w.shiftsMonth;
  if (!sm) return null;
  const v = night ? { ...rv, hoursShift: night.n.hoursShift ?? null } : rv;
  const per = mo => (mo == null ? null : mo / sm);
  const paycheck = c?.mode === 'paycheck';
  // The gross a shift. A typed paycheck holds the wage and card tips (before tax: the row's gross a year / 12; a night
  // takes its share by its shifts).
  const lines = paycheck
    ? [{ id: 'paycheck', label: 'Paycheck, before tax (wage and card tips)', amount: per(((x.gross ?? 0) / 12) * (night ? night.share : 1)) }, w.cash ? { id: 'cash', label: 'Cash tips', amount: per(w.cash.month) } : null]
    : [w.pay ? { id: 'pay', label: 'Pay, before tax', amount: per(w.pay.month) } : null, w.card ? { id: 'card', label: 'Card tips', amount: per(w.card.month) } : null, w.cash ? { id: 'cash', label: 'Cash tips', amount: per(w.cash.month) } : null];
  const ins = lines.filter(l => l && l.amount != null);
  const gross = ins.reduce((s, l) => s + l.amount, 0);
  const fee = per(w.fee?.month ?? 0) ?? 0, tipOut = per(w.tipOut?.month ?? 0) ?? 0;
  const takeHome = (night ? night.takeHome : x.takeHome.value) / sm;
  const tax = gross - fee - tipOut - takeHome; // the row's own tax a shift, so take-home ties to Tips and shifts
  const costs = shiftCostsOf(v, ref);
  const real = takeHome - costs.total;
  const hours = shiftHoursOf(v);
  const realHourly = hours.total ? real / hours.total : null, ownHourly = hours.shift ? takeHome / hours.shift : null;
  const vs = realHourly != null && hourly?.value != null ? realHourly - hourly.value : null;
  const needs = [hours.shift == null ? 'the hours a shift' : null].filter(Boolean);
  const costText = [costs.travel?.amount ? `${m(costs.travel.amount)} getting there (${costs.travel.text})` : null, costs.childcare ? `${m(costs.childcare.amount)} childcare (${costs.childcare.text})` : null,
    costs.gear ? `${m(costs.gear.amount)} outfits and gear (${costs.gear.text})` : null].filter(Boolean);
  const hourText = hours.total ? `${fmt.number(r2(hours.total))} hours (${[hours.prep ? `${fmt.number(hours.prep)} getting ready` : null, hours.travel ? `${fmt.number(hours.travel)} travel` : null, `${fmt.number(hours.shift)} the shift`, hours.windDown ? `${fmt.number(hours.windDown)} winding down` : null].filter(Boolean).join(', ')})` : null;
  const name = night ? `${x.r.name || x.r.type}, ${night.name}` : x.r.name || x.r.type;
  const text = `${night ? `${night.name}, ${fmt.number(w.shifts)} a week. ` : ''}${ins.map(l => `${m(l.amount)} ${l.label.toLowerCase()}`).join(' plus ')}${fee ? ` minus ${m(fee)} house fee` : ''}${tipOut ? ` minus ${m(tipOut)} tip-out` : ''} minus ${m(tax)} ${paycheck ? 'tax and deductions taken from the paycheck' : 'tax set aside'}${night ? ' (this night\'s part of the row\'s)' : ''} = ${m(takeHome)} take-home a shift${night ? '' : ' (Tips and shifts)'}.`
    + (costText.length ? ` Minus ${costText.join(', ')} = ${m(real)} the shift leaves you.` : '')
    + (realHourly != null ? ` Over ${hourText}: ${m(realHourly)} an hour.` : ' The real hourly needs the hours a shift.');
  // QUESTIONS 424 (Lindsey Swanson's lens): unreported cash tips have no tax set aside above; the same shift if it were.
  // The cash it is set aside on is the tips note's (after the tip-out on a paycheck row, where the tip-out is paid from it).
  const unreportedCash = w.cash && w.reported !== 'Yes' ? per(w.cash.month) : 0;
  const cashBase = unreportedCash ? Math.max(0, unreportedCash - (paycheck ? tipOut : 0)) : 0;
  const cashTax = cashBase && cashRate != null ? cashBase * cashRate : null;
  const ifCashTaxed = cashTax != null && hours.total ? { tax: cashTax, real: real - cashTax, realHourly: (real - cashTax) / hours.total, rate: cashRate,
    text: `${m(cashBase)} cash tips a shift${paycheck && tipOut ? ' after the tip-out' : ''} x ${fmt.pct(cashRate)} (the tax on them if it came up, as Tips and shifts says) = ${m(cashTax)} set aside. ${m(real)} - ${m(cashTax)} = ${m(real - cashTax)} over ${fmt.number(r2(hours.total))} hours: ${m((real - cashTax) / hours.total)} an hour.` } : null;
  return {
    id: night ? `${x.r.id}:${night.id}` : x.r.id, rowId: x.r.id, nightId: night?.id ?? null, night: night?.name ?? null, rowName: x.r.name || x.r.type, name,
    folded: x.r.folded ?? null, mode: c?.mode ?? null, shiftsWeek: w.shifts, shiftsMonth: sm,
    lines: ins, gross, fee, tipOut, tax, taxWord: paycheck ? 'Tax and deductions from the paycheck' : 'Tax set aside', takeHome,
    costs, real, hours, ownHourly, realHourly, vs, hourly: hourly?.value ?? null, hourlyGuess: !!hourly?.guess, needs,
    month: { real: real * sm, costs: costs.total * sm, hours: hours.total == null ? null : hours.total * sm },
    unreportedCash, ifCashTaxed,
    result: realHourly == null ? { id: 'M9H', value: null, needs, unit: 'money', text } : { id: 'M9H', value: realHourly, needs: [], unit: 'money', text },
  };
}

// The rate a set-aside on unreported cash tips would take (QUESTIONS 424): the tips note's own (income tax at this
// return's next-dollar rate, or Social Security and Medicare when that is higher), so the two screens agree.
export function cashTaxRateOf(m, ref) {
  const hh = m?.inputs?.householdTax;
  const t = hh ? householdRates(hh, ref) : null;
  const marginal = t?.value != null ? t.marginal : null;
  return ref?.tax ? unreportedTaxRate(marginal, ref) : null;
}

// Every shift row (each night of a row with nights, batch 60), the one that pays most per real hour first. m: metrics (inputs.income, hourly). A row folded for
// this audience (kept private) is left out of the list, and keptPrivate says how many were.
export function shiftPnlsOf(m, { ref = {} } = {}) {
  const all = (m?.inputs?.income ?? []).filter(isShiftRow);
  const shown = all.filter(x => !x.r.folded);
  const cashRate = cashTaxRateOf(m, ref);
  const rows = shown.flatMap(x => { const ns = nightsOf(x); return ns ? ns.map(n => shiftPnlOf(x, { ref, hourly: m.hourly, cashRate }, n)) : [shiftPnlOf(x, { ref, hourly: m.hourly, cashRate })]; }).filter(Boolean)
    .sort((a, b) => (b.realHourly ?? -Infinity) - (a.realHourly ?? -Infinity));
  const ranked = rows.filter(r => r.realHourly != null);
  return { rows, keptPrivate: all.length - shown.length, best: ranked.length > 1 ? ranked[0] : null, hourly: m?.hourly ?? null, any: all.length > 0 };
}
