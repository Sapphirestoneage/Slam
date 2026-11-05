// SPDX-License-Identifier: AGPL-3.0-only
// Holiday dates (M78): the Jewish, Muslim, Christian, Orthodox Christian and US civil calendars, computed from
// arithmetic so nothing has to be refreshed year to year. Day-level only, no location and no candle-lighting times:
// for money, the day is enough. Jewish dates use the fixed Hebrew calendar (Dershowitz and Reingold); Muslim dates use
// the tabular Islamic calendar and real dates can differ by a day (set by moon sighting), so they carry approx: true.
// Easter and Orthodox Easter use the Meeus formulas. Pure: no DOM.

const floor = Math.floor, mod = (a, b) => a - b * floor(a / b);

// ---------- Fixed day numbers (R.D., days since Gregorian Jan 1 of year 1) and the Gregorian calendar ----------
const gLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const fixedFromG = (y, m, d) => 365 * (y - 1) + floor((y - 1) / 4) - floor((y - 1) / 100) + floor((y - 1) / 400)
  + floor((367 * m - 362) / 12) + (m <= 2 ? 0 : gLeap(y) ? -1 : -2) + d;
function gFromFixed(f) {
  const d0 = f - 1, n400 = floor(d0 / 146097), d1 = mod(d0, 146097), n100 = floor(d1 / 36524), d2 = mod(d1, 36524), n4 = floor(d2 / 1461), d3 = mod(d2, 1461), n1 = floor(d3 / 365);
  let y = 400 * n400 + 100 * n100 + 4 * n4 + n1;
  if (!(n100 === 4 || n1 === 4)) y += 1;
  const pd = f - fixedFromG(y, 1, 1), corr = f < fixedFromG(y, 3, 1) ? 0 : gLeap(y) ? 1 : 2;
  const m = floor((12 * (pd + corr) + 373) / 367), d = f - fixedFromG(y, m, 1) + 1;
  return [y, m, d];
}
const iso = f => { const [y, m, d] = gFromFixed(f); return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; };
const fixedFromIso = s => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return fixedFromG(y, m, d); };
const weekdayOf = f => mod(f, 7); // 0 Sunday to 6 Saturday
// The n-th weekday of a month (n from 1), or the last one when n is 'last'.
function nthWeekday(y, m, weekday, n) {
  if (n === 'last') { const lastDay = fixedFromG(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - 1; return lastDay - mod(weekdayOf(lastDay) - weekday, 7); }
  const first = fixedFromG(y, m, 1);
  return first + mod(weekday - weekdayOf(first), 7) + 7 * (n - 1);
}

// ---------- The Hebrew calendar ----------
const HEPOCH = -1373427; // R.D. of 1 Tishri, AM 1
const hLeap = y => mod(7 * y + 1, 19) < 7;
const monthsInHYear = y => (hLeap(y) ? 13 : 12);
function elapsedDays(y) {
  const months = floor((235 * y - 234) / 19), parts = 12084 + 13753 * months, day = months * 29 + floor(parts / 25920);
  return mod(3 * (day + 1), 7) < 3 ? day + 1 : day;
}
function yearLengthCorrection(y) { const ny0 = elapsedDays(y - 1), ny1 = elapsedDays(y), ny2 = elapsedDays(y + 1); return ny2 - ny1 === 356 ? 2 : ny1 - ny0 === 382 ? 1 : 0; }
const hNewYear = y => HEPOCH + elapsedDays(y) + yearLengthCorrection(y);
const daysInHYear = y => hNewYear(y + 1) - hNewYear(y);
const longMarheshvan = y => [355, 385].includes(daysInHYear(y)), shortKislev = y => [353, 383].includes(daysInHYear(y));
function lastDayOfHMonth(y, m) {
  if ([2, 4, 6, 10, 13].includes(m) || (m === 12 && !hLeap(y)) || (m === 8 && !longMarheshvan(y)) || (m === 9 && shortKislev(y))) return 29;
  return 30;
}
// Months are numbered from Nisan (1) to Adar (12, or Adar II 13); the year turns at Tishri (7).
function fixedFromHebrew(y, m, d) {
  let days = hNewYear(y) + d - 1;
  if (m < 7) { for (let k = 7; k <= monthsInHYear(y); k++) days += lastDayOfHMonth(y, k); for (let k = 1; k < m; k++) days += lastDayOfHMonth(y, k); }
  else for (let k = 7; k < m; k++) days += lastDayOfHMonth(y, k);
  return days;
}

// ---------- The tabular Islamic calendar ----------
const IEPOCH = 227015; // R.D. of 1 Muharram, AH 1
const fixedFromIslamic = (y, m, d) => d + 29 * (m - 1) + floor((6 * m - 1) / 11) + (y - 1) * 354 + floor((3 + 11 * y) / 30) + IEPOCH - 1;

// ---------- Easter ----------
function easter(y) { // Gregorian (Meeus, Jones and Butcher)
  const a = y % 19, b = floor(y / 100), c = y % 100, d = floor(b / 4), e = b % 4, f = floor((b + 8) / 25), g = floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = floor((a + 11 * h + 22 * l) / 451), mo = floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return fixedFromG(y, mo, da);
}
function orthodoxEaster(y) { // Julian (Meeus), moved to the Gregorian calendar
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7, mo = floor((d + e + 114) / 31), da = ((d + e + 114) % 31) + 1;
  return fixedFromG(y, mo, da) + (floor(y / 100) - floor(y / 400) - 2);
}

// ---------- The sets and their holidays ----------
// Each holiday: when(gy) gives the R.D. of its first day in Gregorian year gy (null when it does not fall in gy), days
// is how long it runs, and block is the starter block added when the set is ticked on About you (blank amount).
// Jewish fall holidays belong to AM gy + 3761; the spring ones to AM gy + 3760. Purim is in Adar II of a leap year.
const h = (id, name, when, days, extra = {}) => ({ id, name, when, days, ...extra });
const J = (m, d, spring = false) => gy => fixedFromHebrew(gy + (spring ? 3760 : 3761), m, d);
const I = (m, d) => gy => { for (const iy of [gy - 579, gy - 578, gy - 577]) { const f = fixedFromIslamic(iy, m, d); if (gFromFixed(f)[0] === gy) return f; } return null; };
export const HOLIDAY_SETS = [
  { id: 'jewish', label: 'Jewish holidays', holidays: [
    h('roshHashanah', 'Rosh Hashanah', J(7, 1), 2, { block: 'Rosh Hashanah and Sukkot (food, clothes, guests, travel)' }),
    h('yomKippur', 'Yom Kippur', J(7, 10), 1),
    h('sukkot', 'Sukkot', J(7, 15), 7),
    h('shminiAtzeret', 'Shemini Atzeret and Simchat Torah', J(7, 22), 2),
    h('chanukah', 'Chanukah', J(9, 25), 8, { block: 'Chanukah (gifts, food, parties)' }),
    h('purim', 'Purim', gy => fixedFromHebrew(gy + 3760, hLeap(gy + 3760) ? 13 : 12, 14), 1, { block: 'Purim (mishloach manot, seudah, costumes)' }),
    h('pesach', 'Pesach', J(1, 15, true), 8, { block: 'Pesach (food, cleaning, travel, guests)' }),
    h('shavuot', 'Shavuot', J(3, 6, true), 2, { block: 'Shavuot (food, guests)' }),
    h('tishaBav', "Tisha B'Av", J(5, 9, true), 1)] },
  { id: 'muslim', label: 'Muslim holidays', approx: true, holidays: [
    h('ramadan', 'Ramadan', I(9, 1), 30, { block: 'Ramadan (iftars, zakat al-fitr, charity)' }),
    h('eidFitr', 'Eid al-Fitr', I(10, 1), 3, { block: 'Eid al-Fitr (gifts, clothes, food)' }),
    h('eidAdha', 'Eid al-Adha', I(12, 10), 4, { block: 'Eid al-Adha (qurbani, travel, food)' })] },
  { id: 'christian', label: 'Christian holidays', holidays: [
    h('easter', 'Easter', easter, 1, { block: 'Easter (food, gifts, travel)' }),
    h('christmas', 'Christmas', gy => fixedFromG(gy, 12, 25), 1, { block: 'Christmas (gifts, food, travel, decorations)' })] },
  { id: 'orthodox', label: 'Orthodox Christian holidays', holidays: [
    h('orthodoxEaster', 'Pascha (Orthodox Easter)', orthodoxEaster, 1, { block: 'Pascha (food, church, travel)' }),
    h('orthodoxChristmas', 'Orthodox Christmas', gy => fixedFromG(gy, 1, 7), 1, { block: 'Orthodox Christmas (gifts, food, travel)' })] },
  { id: 'us', label: 'US holidays', holidays: [
    h('newYear', "New Year's Day", gy => fixedFromG(gy, 1, 1), 1),
    h('memorialDay', 'Memorial Day', gy => nthWeekday(gy, 5, 1, 'last'), 1),
    h('july4', 'Independence Day', gy => fixedFromG(gy, 7, 4), 1, { block: 'July 4th (cookout, travel)' }),
    h('laborDay', 'Labor Day', gy => nthWeekday(gy, 9, 1, 1), 1),
    h('halloween', 'Halloween', gy => fixedFromG(gy, 10, 31), 1, { block: 'Halloween (costumes, candy)' }),
    h('thanksgiving', 'Thanksgiving', gy => nthWeekday(gy, 11, 4, 4), 1, { block: 'Thanksgiving (food, travel)' })] },
];
const ALL = HOLIDAY_SETS.flatMap(s => s.holidays.map(x => ({ ...x, set: s.id, approx: !!s.approx })));
export const holidayById = id => ALL.find(x => x.id === id) ?? null;

// One holiday in one Gregorian year: start, end and eve as YYYY-MM-DD, or null when it does not fall in that year.
export function holidayDates(id, gy) {
  const x = holidayById(id);
  if (!x) return null;
  const f = x.when(gy);
  if (f == null) return null;
  return { id: x.id, name: x.name, set: x.set, start: iso(f), end: iso(f + x.days - 1), eve: iso(f - 1), days: x.days, approx: x.approx, block: x.block ?? null };
}

// Every holiday of the ticked sets in a Gregorian year, in date order. sets: { jewish: true, ... } (About you).
export function holidaysOf(sets = {}, gy) {
  const on = HOLIDAY_SETS.filter(s => sets?.[s.id] === true);
  return on.flatMap(s => s.holidays.map(x => holidayDates(x.id, gy)).filter(Boolean)).sort((a, b) => a.start.localeCompare(b.start));
}

// The next time a holiday comes round from today (today counts while it is still running).
export function nextHoliday(id, now = new Date()) {
  const today = now.toISOString().slice(0, 10), y = now.getUTCFullYear();
  for (const gy of [y - 1, y, y + 1, y + 2]) { const d = holidayDates(id, gy); if (d && d.end >= today) return d; }
  return null;
}
// The month an event tied to a holiday lands in (its start month), so it re-dates itself every year.
export const holidayYm = (id, now = new Date()) => nextHoliday(id, now)?.start.slice(0, 7) ?? null;

// Shabbat: every Friday (begins at sundown) and Saturday in a month, as YYYY-MM-DD.
export function shabbatDays(ym) {
  const out = [];
  for (const d of weekdayDays(ym, 5)) { const f = fixedFromIso(d); out.push({ friday: d, saturday: iso(f + 1) }); }
  return out;
}
// Every date in a month that falls on a weekday (0 Sunday to 6 Saturday): a weekly Budget line lands on each one.
export function weekdayDays(ym, weekday) {
  const [y, m] = ym.split('-').map(Number);
  const first = fixedFromG(y, m, 1), last = fixedFromG(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - 1;
  const out = [];
  for (let f = first + mod(weekday - weekdayOf(first), 7); f <= last; f += 7) out.push(iso(f));
  return out;
}
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SHABBAT_SPEND_DAY = 4; // Thursday: Shabbat is bought midweek and used Friday night and Saturday (cash vs accrual)

// The holidays of the ticked sets that touch a month, for the calendar markers.
export function holidaysInMonth(sets, ym) {
  const y = Number(ym.slice(0, 4));
  return [...holidaysOf(sets, y - 1), ...holidaysOf(sets, y), ...holidaysOf(sets, y + 1)].filter(d => d.eve.slice(0, 7) <= ym && d.end.slice(0, 7) >= ym);
}
// The occurrence of one holiday whose eve falls in a month (spending lands on the eve), for the month model.
export function holidayInMonth(id, ym) {
  const y = Number(ym.slice(0, 4));
  for (const gy of [y - 1, y, y + 1]) { const d = holidayDates(id, gy); if (d && d.eve.slice(0, 7) === ym) return d; }
  return null;
}
