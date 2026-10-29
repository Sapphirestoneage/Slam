// The time view (R152 to R155): every amount as hours of work or FI days.
import { realHourlyWage } from './income.js';
import { money, hours, fiDays, EMPTY } from '../format.js';
import { isBlank } from './result.js';

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
