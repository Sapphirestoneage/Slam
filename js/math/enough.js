// SPDX-License-Identifier: AGPL-3.0-only
// Lifestyle creep and enough (run "Not built, groups 1 to 5", Part 3, Nov 25 2026). ONE engine for both apps and for
// run 1 Part 8 ("Joy and enough", built later): pure, and with no import on purpose, so tools/game_enough_build.mjs
// copies it word for word into game/core/enough.js. Every name starts with en or EN_ because the game has one global
// scope. Empty is not zero: a year with no income rows has income null, never 0; a missing rate judges nothing.
//
// FOUR TOOLS, each a plain function on plain numbers that the caller reads from its own ledger:
//   lifestyle creep   enYears, enCreep, enCreepWords, enStepCreep: spending growth next to income growth, per category,
//                     year over year; the "mutant" lines that grow faster than inflation; one quiet Recalculating card
//                     when spending grows faster than income.
//   enough            enEnough: the enough number (the plan's own FI number scaled to the life the person calls
//                     enough) and the margin of safety on top (Housel's room for error). The dates come from each
//                     app's own FI date function; nothing here runs a second projection.
//   Pareto            enPareto: the few lines that make most of the spending.
//   rough             enRough: a range in place of an exact amount, for the one Rough numbers switch. Display only.
//
// THE ROWS a caller hands to enYears / enCreep: [{ d: 'YYYY-MM-DD' or 'YYYY-MM', amt: dollars (> 0), cat, kind }]
// with kind 'out' (spending, by category) or 'in' (income). A refund is an 'out' row with a negative amount.

// ---------- the rules (SLAM's own, written down here; QUESTIONS.md "RUN Not built, groups 1 to 5, Part 3") ----------
// minMonths: a year counts once it has 3 months with spending in it (a quarter: less is one season, not a year).
// closeMonths / exactMonths: the level of a comparison is Guess under 6 months in the shorter year, Close from 6, Exact
// at 12 (a whole year on both sides). mutantMin: a line is called a mutant only when it grew at least $10 a month more
// than inflation would have taken it, so a $2 line that doubled is not flagged. pareto: the share of spending "most"
// means (the 80 of 80/20). paretoMin: a Pareto needs at least 3 lines.
export const EN_RULES = { minMonths: 3, closeMonths: 6, exactMonths: 12, mutantMin: 10, pareto: 0.8, paretoMin: 3 };
export const EN_SOURCES = {
  housel: 'Morgan Housel, The Psychology of Money (2020): chapter 3, Never Enough, and chapter 13, Room for Error',
  pareto: 'The Pareto principle: about 80% of an effect comes from about 20% of the causes (Joseph Juran, after Vilfredo Pareto)',
  creep: 'Spending growth next to income growth, year over year, from your own ledger',
};
// The taps. Enough: the life you call enough, as a share of the spending the plan already uses. Room for error: how
// much to add on top. Income growth: a guess to tap when the ledger holds no paychecks for both years (a Guess).
export const EN_ENOUGH = [[0.8, 'A simpler life'], [0.9, 'A bit less'], [1, 'The life I have now'], [1.1, 'A bit more'], [1.2, 'More to enjoy']];
export const EN_ROOM = [[0.1, '10%'], [0.2, '20%'], [0.3, '30%']];
export const EN_INCOME_GUESS = [0, 0.02, 0.03, 0.05, 0.1];

const enBlank = v => v === null || v === undefined || v === '' || Number.isNaN(v);
export const enYm = d => (d ? String(d).slice(0, 7) : null);
const enRound = v => Math.round(v * 100) / 100;

// ---------- lifestyle creep ----------
// Each calendar year of the ledger: the months that hold spending, the spending and the income, each category, and
// the monthly averages (a part year compares fairly with a whole one). inc is null when the year has no income row.
export function enYears(rows) {
  const Y = {};
  for (const r of rows || []) {
    const ym = enYm(r && r.d);
    if (!ym || !/^\d{4}-\d{2}$/.test(ym) || typeof r.amt !== 'number' || !Number.isFinite(r.amt)) continue;
    const y = ym.slice(0, 4), o = (Y[y] = Y[y] || { year: Number(y), months: {}, out: 0, inc: null, cats: {} });
    if (r.kind === 'in') { o.inc = (o.inc || 0) + r.amt; continue; }
    o.months[ym] = true;
    o.out += r.amt;
    const cat = r.cat || 'Not sorted';
    o.cats[cat] = (o.cats[cat] || 0) + r.amt;
  }
  return Object.values(Y).sort((a, b) => a.year - b.year).map(o => {
    const months = Object.keys(o.months).length;
    const per = v => (months > 0 ? v / months : null); // not rounded: the growth is worked out on the exact months
    return { year: o.year, months, out: enRound(o.out), inc: o.inc === null ? null : enRound(o.inc), avgOut: per(o.out), avgIn: o.inc === null ? null : per(o.inc),
      cats: Object.fromEntries(Object.entries(o.cats).map(([k, v]) => [k, per(v)])) };
  });
}
export const enLevel = months => (months >= EN_RULES.exactMonths ? 'Exact' : months >= EN_RULES.closeMonths ? 'Close' : 'Guess');
const enGrowth = (now, prev) => (enBlank(now) || enBlank(prev) || !(prev > 0) ? null : now / prev - 1);

// The read: the last two years that count, side by side. inflation (a rate the person tapped, or a dated CPI figure)
// is the line a mutant crosses; null judges no line. incomeGrowth: the tapped guess, used only when the ledger has no
// income in one of the two years. ready false says what is still needed, in plain words.
export function enCreep(rows, { inflation = null, incomeGrowth = null, minMonths = EN_RULES.minMonths } = {}) {
  const years = enYears(rows), use = years.filter(y => y.months >= minMonths);
  if (use.length < 2) return { ready: false, years, need: `two years of spending with at least ${minMonths} months in each`, have: use.length };
  const prev = use[use.length - 2], now = use[use.length - 1];
  const spendGrowth = enGrowth(now.avgOut, prev.avgOut);
  const ledgerIncome = enGrowth(now.avgIn, prev.avgIn);
  const income = ledgerIncome !== null ? { growth: ledgerIncome, from: 'ledger' } : !enBlank(incomeGrowth) ? { growth: incomeGrowth, from: 'tapped' } : { growth: null, from: null };
  const level = enLevel(Math.min(now.months, prev.months));
  const infl = enBlank(inflation) ? null : inflation;
  const names = [...new Set([...Object.keys(prev.cats), ...Object.keys(now.cats)])];
  const cats = names.map(cat => {
    const was = prev.cats[cat] ?? 0, is = now.cats[cat] ?? 0, growth = enGrowth(is, was);
    const overInflation = infl === null || !(was > 0) ? null : enRound(is - was * (1 + infl));
    const mutant = overInflation !== null && growth !== null && growth > infl && overInflation >= EN_RULES.mutantMin;
    return { cat, was, is, more: enRound(is - was), growth, isNew: !(was > 0) && is > 0, overInflation, mutant };
  }).sort((a, b) => b.is - a.is || a.cat.localeCompare(b.cat));
  const alert = spendGrowth !== null && income.growth !== null && spendGrowth > 0 && spendGrowth > income.growth;
  const gap = alert ? enRound(now.avgOut - prev.avgOut * (1 + income.growth)) : null;
  // The one next turn: the mutant that went past inflation by the most; with no rate, the line that grew most in dollars.
  const pick = infl !== null ? cats.filter(c => c.mutant).sort((a, b) => b.overInflation - a.overInflation)[0] : cats.filter(c => c.was > 0 && c.more > 0).sort((a, b) => b.more - a.more)[0];
  const turn = pick ? { cat: pick.cat, back: infl !== null ? pick.overInflation : pick.more, to: infl !== null ? 'inflation' : 'last year' } : null;
  // Over all the years that count, as a yearly rate (with three or more years).
  const first = use[0], span = now.year - first.year;
  const yearly = use.length >= 3 && span > 0 ? { spend: first.avgOut > 0 ? (now.avgOut / first.avgOut) ** (1 / span) - 1 : null,
    income: first.avgIn > 0 && now.avgIn > 0 ? (now.avgIn / first.avgIn) ** (1 / span) - 1 : null, from: first.year, to: now.year } : null;
  return { ready: true, years, prev, now, spendGrowth, income, level, incomeLevel: income.from === 'tapped' ? 'Guess' : level, inflation: infl, cats,
    mutants: cats.filter(c => c.mutant), alert, gap, turn, yearly, series: use.map(y => ({ year: y.year, out: y.avgOut, in: y.avgIn })) };
}
const enPct = v => `${Math.round(v * 1000) / 10}%`;
// The quiet card, in the Recalculating tone: what grew, and the one next turn. money is the caller's own formatter
// (so the Rough numbers switch applies). null when there is nothing to say.
export function enCreepWords(read, money) {
  if (!read || !read.ready || !read.alert) return null;
  const m = typeof money === 'function' ? money : v => `$${Math.round(v)}`;
  const inc = read.income.from === 'tapped' ? `the ${enPct(read.income.growth)} raise you tapped` : `income ${enPct(read.income.growth)}`;
  const line = `Spending grew ${enPct(read.spendGrowth)} from ${read.prev.year} to ${read.now.year}, ${inc}. That is about ${m(read.gap)} a month more than your income's pace.`;
  const next = read.turn ? `Hold ${read.turn.cat} ${read.turn.to === 'inflation' ? `to ${enPct(read.inflation)} more a year` : `at last year's level`}: about ${m(read.turn.back)} a month back.` : 'Pick one line to hold at last year\'s level.';
  return { head: 'Recalculating', line, next };
}
// One step, two looks at the same household (the game's sessions): spending up by at least `line` and faster than
// take-home. The same question as enCreep, on two totals instead of a ledger.
export function enStepCreep(a, b, { line = 0.05 } = {}) {
  if (!a || !b || !(a.spend > 0) || !(b.spend > 0)) return false;
  const spend = b.spend / a.spend - 1, take = a.take > 0 ? b.take / a.take - 1 : null;
  return spend >= line && (take === null || take < spend);
}

// ---------- enough and room for error ----------
// fi: the plan's own FI number (web M50, the game's FI base); share: the life the person calls enough (EN_ENOUGH);
// room: the margin of safety on top (EN_ROOM, null until tapped); have: invested today. The number is linear in
// spending, so enough = FI number x share is the same as working the FI number out on the enough spending.
export function enEnough({ fi, share = 1, room = null, have = null }) {
  if (enBlank(fi) || !(fi > 0) || enBlank(share)) return { value: null, needs: enBlank(fi) || !(fi > 0) ? ['an FI number'] : ['what enough is'] };
  const value = enRound(fi * share), withRoom = enBlank(room) ? null : enRound(value * (1 + room));
  const target = withRoom ?? value, h = enBlank(have) ? null : have;
  return { value, share, room: enBlank(room) ? null : room, withRoom, have: h, pct: h === null ? null : Math.max(0, h / value), pctRoom: h === null || withRoom === null ? null : Math.max(0, h / withRoom),
    left: h === null ? null : enRound(Math.max(0, target - h)), past: h !== null && h >= value, margin: h === null ? null : enRound(h - value), sameAsFi: Math.abs(share - 1) < 1e-9 };
}

// ---------- Pareto of spending ----------
// lines: [{ name, amt }] (a month each). The few biggest lines that together reach `share` of the total.
export function enPareto(lines, { share = EN_RULES.pareto } = {}) {
  const L = (lines || []).filter(l => l && typeof l.amt === 'number' && l.amt > 0).map(l => ({ name: l.name || 'A line', amt: l.amt })).sort((a, b) => b.amt - a.amt || a.name.localeCompare(b.name));
  const total = enRound(L.reduce((s, l) => s + l.amt, 0));
  if (L.length < EN_RULES.paretoMin || !(total > 0)) return { ready: false, total, of: L.length, need: `at least ${EN_RULES.paretoMin} spending lines with an amount` };
  let cum = 0, count = 0;
  const rows = L.map(l => { const top = cum < share * total - 1e-9; cum += l.amt; if (top) count += 1; return { ...l, share: l.amt / total, cum: cum / total, top }; });
  const topTotal = enRound(rows.filter(r => r.top).reduce((s, r) => s + r.amt, 0));
  return { ready: true, total, of: L.length, count, topTotal, topShare: topTotal / total, linesShare: count / L.length, share, rows };
}

// ---------- Rough numbers ----------
// A range in place of an exact amount: the leading digit's band ($3,450 reads $3k to $4k, $12,345 reads $10k to
// $20k, $87 reads $0 to $100). Zero stays $0. Display only: it never changes a stored number. minus: the caller's
// minus sign.
export function enRough(v, { minus = '-' } = {}) {
  if (enBlank(v) || typeof v !== 'number' || !Number.isFinite(v)) return null;
  const a = Math.abs(v);
  if (a < 0.5) return '$0';
  const p = a < 100 ? 100 : 10 ** Math.floor(Math.log10(a) + 1e-12), lo = a < 100 ? 0 : Math.floor(a / p + 1e-12) * p, hi = lo + p;
  const s = x => (x >= 1e6 ? `$${+(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `$${+(x / 1e3).toFixed(1)}k` : `$${x}`);
  return v < 0 ? `${minus}${s(lo)} to ${minus}${s(hi)}` : `${s(lo)} to ${s(hi)}`;
}
