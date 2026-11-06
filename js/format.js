// SPDX-License-Identifier: AGPL-3.0-only
// Display formats from the Look and feel tab. Empty is a dash, never $0.
export const EMPTY = '–'; // en dash
const MINUS = '−';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const blank = v => v === null || v === undefined || Number.isNaN(v);

// Batch 41: one formatter each, made once (toLocaleString with options builds a new one on every call, which was most of
// the time the math took; the ranges run the math many times). The same text as before.
const WHOLE = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const CENTS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DIGITS = new Map();
const digitsFmt = d => DIGITS.get(d) ?? DIGITS.set(d, new Intl.NumberFormat('en-US', { maximumFractionDigits: d })).get(d);
// $1,240 in summaries; $15.99 in entry fields (cents: true); negative as −$240.
export function money(v, { cents = false } = {}) {
  if (blank(v)) return EMPTY;
  const n = cents ? Math.round(v * 100) / 100 : Math.round(v);
  const s = (cents ? CENTS : WHOLE).format(Math.abs(n));
  return `${n < 0 ? MINUS : ''}$${s}`;
}

// One decimal: 22.4%. Input is a decimal (0.224).
export function pct(v) {
  if (blank(v)) return EMPTY;
  const n = Math.round(v * 1000) / 10;
  return `${n < 0 ? MINUS : ''}${Math.abs(n).toFixed(1)}%`;
}

export const number = (v, digits = 0) => (blank(v) ? EMPTY : digitsFmt(digits).format(v));

// Nov 12, 2026
export function date(d) {
  if (blank(d)) return EMPTY;
  const x = typeof d === 'string' ? new Date(`${d.slice(0, 10)}T12:00:00`) : d;
  return `${MONTHS[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`;
}
// Nov 2026
export function month(d) {
  if (blank(d)) return EMPTY;
  const x = typeof d === 'string' ? new Date(`${d.slice(0, 10)}T12:00:00`) : d;
  return `${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}
export function addMonths(d, n) {
  const x = typeof d === 'string' ? new Date(`${d.slice(0, 10)}T12:00:00`) : new Date(d);
  return new Date(x.getFullYear(), x.getMonth() + n, 1, 12);
}

// 26 months (Jan 2029). Never rounded to years (R185).
export function duration(months, from = new Date()) {
  if (blank(months)) return EMPTY;
  const n = Math.ceil(months);
  return `${n} ${n === 1 ? 'month' : 'months'} (${month(addMonths(from, n))})`;
}

// 14 hrs · 3 FI days
export function hours(h) {
  if (blank(h)) return EMPTY;
  const n = h < 10 ? Math.round(h * 10) / 10 : Math.round(h);
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'hr' : 'hrs'}`;
}
export function fiDays(d) {
  if (blank(d)) return EMPTY;
  const n = d < 10 ? Math.round(d * 10) / 10 : Math.round(d);
  return `${n.toLocaleString('en-US')} FI ${n === 1 ? 'day' : 'days'}`;
}
