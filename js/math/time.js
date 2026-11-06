// SPDX-License-Identifier: AGPL-3.0-only
// The time view (R152 to R155): every amount as hours of work or FI days.
import { realHourlyWage } from './income.js';
import { money, hours, fiDays, EMPTY } from '../format.js';
import { isBlank, ok, fmt } from './result.js';
import { RULES } from '../registry/assumptions.js';

// The hourly rate behind the toggle. Real hours when entered; otherwise take-home / 173 as a Guess (R153).
export function hourlyRate({ takeHome, workCosts, paidHours, commuteHours, prepHours }, ref) {
  const real = realHourlyWage({ takeHome, workCosts, paidHours, commuteHours, prepHours });
  if (real.value !== null) return { value: real.value, guess: false, text: real.text };
  if (isBlank(takeHome)) return { value: null, guess: false, needs: ['take-home pay'], text: 'Hours of work needs your take-home pay.' };
  const h = ref.hoursPerMonthFallback;
  const v = takeHome / h;
  return { value: v, guess: true, text: `No work hours entered yet, so ${money(takeHome)} take-home is divided by ${h} hours (40 a week): ${money(v, { cents: true })} an hour. A guess until real hours are in.` };
}

// One amount in the current view. mode: '$' | 'Hours' | 'FI days'.
export function inView(amount, mode, { rate, annualSpending }) {
  if (isBlank(amount)) return { text: EMPTY, missing: null };
  if (mode === 'Hours') {
    if (!rate?.value) return { text: EMPTY, missing: 'take-home pay' };
    return { text: hours(amount / rate.value), guess: rate.guess };
  }
  if (mode === 'FI days') {
    if (!annualSpending) return { text: EMPTY, missing: 'monthly spending' };
    return { text: fiDays(amount / (annualSpending / 365)) };
  }
  return { text: money(amount) };
}

// R155: on $, big amounts (over $50) still carry a small grey hours chip.
export function timeChip(amount, { rate }) {
  if (isBlank(amount) || Math.abs(amount) <= 50 || !rate?.value) return null;
  return hours(Math.abs(amount) / rate.value);
}

// Batch 15, item 4 (R073): is a task worth the time? It is when its dollars a year beat the hours it takes
// (RULES.materialHours) at the real hourly wage (M17), and never under RULES.materialFloor.
// Each client can set their own hours and floor (Eli, Nov 6: "customizable like materiality"): assumptions.materialHours
// and assumptions.materialFloor, picked from taps on Plan › Goals; blank uses the RULES defaults.
export function materialityOf(rate, a = {}) {
  const wage = rate?.value ?? null;
  const hours = a?.materialHours ?? RULES.materialHours, floor = a?.materialFloor ?? RULES.materialFloor;
  const v = Math.max(floor, wage == null ? 0 : wage * hours);
  return { ...ok('M17', v, wage == null ? `No hourly wage yet, so the floor: ${fmt.money(v)} a year.` : `${hours} ${hours === 1 ? 'hour' : 'hours'} at ${fmt.money(wage, { cents: true })} an hour${rate.guess ? ' (a guess until work hours are in)' : ''} = ${fmt.money(wage * hours)}${wage * hours < floor ? `, under the ${fmt.money(floor)} floor, so ${fmt.money(v)}` : ''}: a number worth less than ${fmt.money(v)} a year goes to small wins.`), wage, hours, floor };
}

// Batch 15, item 12: is a paid service worth it? Its cost a month against the hours it saves at the real hourly wage.
export function outsourceCheck({ cost, hoursSaved }, rate) {
  if (isBlank(cost) || isBlank(hoursSaved) || !rate?.value) return { value: null, needs: [isBlank(cost) ? 'what it costs' : isBlank(hoursSaved) ? 'hours it saves' : 'take-home pay'] };
  const worth = hoursSaved * rate.value, v = worth - cost;
  return { ...ok('M17', v, `${hours(hoursSaved)} saved a month at ${money(rate.value, { cents: true })} an hour is worth ${money(worth)}; it costs ${money(cost)}, so ${v >= 0 ? `it frees ${money(v)} of your time` : `it costs ${money(-v)} more than your time is worth`} a month.`), worth, perHour: cost / hoursSaved };
}
