// SPDX-License-Identifier: AGPL-3.0-only
// Career and education (run of Nov 25 2026, Part 3). One engine: career.html of the web app and the game's screen
// "Career and education" both call these functions, so the two can never give two answers. It is also the one engine
// of Career ROI and the Skills calculator: a 4-year degree and a weekend course are the same sum at another size (the
// older tools engines/credential.js and engines/degree.js of the Personalfinance repository, reused here).
// Pure, and with no import on purpose: tools/game_career_build.mjs copies this file word for word into
// game/core/career.js. Every name starts with cr or CR_ because the game has one global scope.
// Empty is not zero: an answer not given yet is null, and the result lists it in `needs`.
// All amounts are dollars a year in today's money, unless the name says a month. Rates come in as percents.
// The FI date is not worked out here: each app runs its own FI date (the web app's M53, the game's goalSim) with the
// `once` and `changes` a move returns, so there is one FI date in each app and one way to describe a move.

// ---------- the rules, each with where it comes from ----------
// The vesting schedules to tap. A match must vest at least as fast as a 3-year cliff or a 2-to-6-year graded schedule;
// a plan may vest faster, right away included (CR_VEST_SOURCE). Each step is [completed years of service, % vested].
// The person's own plan can say something else: "My plan says" takes the percent from their statement.
export const CR_VEST_SOURCE = 'IRS, Issue Snapshot "Vesting schedules for matching contributions" (irs.gov), read 2026-11-25: matching contributions vest at least as fast as a 3-year cliff (100% after 3 years of service) or a 6-year graded schedule (20% after 2 years, then 20% more each year, 100% after 6); a plan may vest faster, including right away';
export const CR_VEST = [
  { id: 'now', name: 'Right away', steps: [[0, 100]] },
  { id: 'cliff3', name: '3-year cliff', steps: [[0, 0], [3, 100]] },
  { id: 'graded6', name: '6-year graded', steps: [[0, 0], [2, 20], [3, 40], [4, 60], [5, 80], [6, 100]] },
  { id: 'own', name: 'My plan says', steps: null },
];
// daysPerMonth: a year of 365.25 days over 12 months, to say a change of the FI date in days.
export const CR_RULES = { daysPerMonth: 365.25 / 12 };

// The presets. Each gives only the shape of the path (how long it takes, whether you keep working); the cost and the
// pay are always the person's own taps. No dated source for the cost or the pay of a path is in the repository, so a
// preset is a sample and says so (QUESTIONS.md, Part 3).
export const CR_PRESETS = [
  { id: 'four', name: 'A 4-year degree', sub: 'A college major, four years full time', months: 48, keepPct: 0 },
  { id: 'trade', name: 'Trade school', sub: 'A sample of a year and a half, full time', months: 18, keepPct: 0 },
  { id: 'cert', name: 'A certificate', sub: 'A sample of six months, working while you learn', months: 6, keepPct: 100 },
  { id: 'skill', name: 'One skill or course', sub: 'A sample of three months of evenings', months: 3, keepPct: 100 },
];
export const CR_SAMPLE = 'A sample: the time is a usual length for this kind of path. The cost and the pay are yours to tap.';

// The amounts to tap, the same in the web app and in the game. Choices, not typical amounts.
export const CR_OPTS = {
  cost: [500, 2000, 5000, 15000, 40000, 100000],
  help: [0, 1000, 2500, 5000],
  months: [0, 3, 6, 12, 18, 24, 48],
  keepPct: [0, 50, 100],
  pay: [30000, 40000, 50000, 65000, 80000, 100000, 130000],
  taxPct: [10, 12, 22, 24, 32, 35],
  loan: [0, 5000, 15000, 30000, 60000],
  loanRatePct: [4, 5, 6, 7, 8, 10],
  loanYears: [5, 10, 20],
  endAge: [55, 60, 65, 67, 70],
  raise: [2000, 5000, 10000, 20000, 40000],
  match: [500, 2000, 5000, 10000, 25000],
  years: [0.5, 1, 2, 3, 4, 5],
  ownPct: [0, 20, 40, 60, 80, 100],
  yearly: [2000, 5000, 10000, 23500],
  rent: [500, 800, 1200, 1600, 2400],
  costs: [0, 100, 250, 500],
  hackYears: [1, 2, 3, 5],
};
// Where the numbers are from, for Guess / Close / Exact.
export const CR_SOURCES = [['guess', 'My best guess'], ['quote', 'A school\'s price or a job posting'], ['own', 'My own bill and offer letter']];

const dollars = v => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
const yrs = v => `${Math.round(v * 10) / 10} ${Math.round(v * 10) === 10 ? 'year' : 'years'}`;

// The level payment of a loan (principal and interest), a month.
export function crLoanPayment(loan, ratePct, years) {
  if (!(loan > 0) || ratePct == null || !(years > 0)) return 0;
  const n = Math.round(years * 12), r = ratePct / 1200;
  return r ? (loan * r) / (1 - (1 + r) ** -n) : loan / n;
}

// ONE PATH (a degree, trade school, a certificate, one skill). x: { cost (tuition and fees in all), help (what a job
// pays toward it), months (in school or training), keepPct (% of pay kept while learning), payBefore, payAfter (pay
// before taxes a year), taxPct (the rate the raise is taxed at), loan, loanRatePct, loanYears, age, endAge }.
// Returns { needs, total (the whole price), gainNet (the raise after tax, a year), paybackYears (after you finish),
// evenAge, lifetime (to endAge, after the price), once and changes (the move, for the FI date), ... }.
export function crRoi(x = {}) {
  const needs = ['cost', 'payBefore', 'payAfter', 'taxPct'].filter(k => x[k] == null);
  if (x.months == null) needs.push('months');
  else if (x.months > 0 && x.keepPct == null) needs.push('keepPct');
  if (needs.length) return { needs };
  const months = Math.max(0, x.months), keep = months > 0 ? Math.max(0, Math.min(100, x.keepPct)) / 100 : 1, t = x.taxPct / 100;
  const help = Math.min(Math.max(0, x.help ?? 0), x.cost), yours = x.cost - help;
  const loan = Math.min(Math.max(0, x.loan ?? 0), yours), loanOn = loan > 0 && x.loanRatePct != null && x.loanYears > 0;
  const pmt = loanOn ? crLoanPayment(loan, x.loanRatePct, x.loanYears) : 0, interest = loanOn ? pmt * Math.round(x.loanYears * 12) - loan : 0;
  const lostGross = x.payBefore * (months / 12) * (1 - keep), lostNet = lostGross * (1 - t);
  const total = yours + lostNet + interest;
  const gain = x.payAfter - x.payBefore, gainNet = gain * (1 - t);
  const paybackYears = gainNet > 0 ? total / gainNet : null;
  const doneAge = x.age != null ? x.age + months / 12 : null;
  const evenAge = doneAge != null && paybackYears != null ? doneAge + paybackYears : null;
  const yearsAfter = doneAge != null && x.endAge != null ? Math.max(0, x.endAge - doneAge) : null;
  const lifetime = yearsAfter != null ? gainNet * yearsAfter - total : null;
  // The move, for the FI date: paid now (what the loan does not cover), the pay given up each month while learning,
  // then the raise after tax each month, and the loan payments for their years.
  const lostMonth = months > 0 ? lostNet / months : 0, changes = [];
  if (lostMonth) changes.push({ at: 0, monthly: -lostMonth }, { at: months, monthly: lostMonth });
  if (gainNet) changes.push({ at: months, monthly: gainNet / 12 });
  if (pmt) changes.push({ at: months, monthly: -pmt }, { at: months + Math.round(x.loanYears * 12), monthly: pmt });
  return { needs: [], months, keepPct: keep * 100, help, yours, loan, loanOn, pmt, interest, lostGross, lostNet, total, gain, gainNet, t,
    paybackYears, doneAge, evenAge, yearsAfter, lifetime, paysBy: evenAge != null && x.endAge != null ? evenAge <= x.endAge : null, once: yours - loan, changes };
}

// The words of one path: one sentence, no verdict.
export function crRoiWords(R, x = {}) {
  if (!R || R.needs?.length) return null;
  if (R.gainNet <= 0) return `At this pay, the path costs ${dollars(R.total)} and the pay after it is not higher, so nothing pays it back.`;
  const by = R.evenAge != null ? `, at about age ${Math.round(R.evenAge)}` : '';
  if (R.paysBy === false) return `The raise after tax is ${dollars(R.gainNet)} a year. It covers the price of ${dollars(R.total)} in ${yrs(R.paybackYears)} after you finish${by}, after the age of ${x.endAge} you picked.`;
  return `The raise after tax is ${dollars(R.gainNet)} a year. It covers the price of ${dollars(R.total)} in ${yrs(R.paybackYears)} after you finish${by}.`;
}

// The math of one path, line by line, for "Show the math".
export function crRoiMath(R, x = {}) {
  if (!R || R.needs?.length) return [];
  return [
    `What you pay: ${dollars(x.cost)} in all${R.help ? ` less ${dollars(R.help)} your job pays` : ''} = ${dollars(R.yours)}.`,
    R.lostGross ? `Pay given up: ${dollars(x.payBefore)} a year × ${R.months} months ÷ 12 × ${Math.round(100 - R.keepPct)}% not kept = ${dollars(R.lostGross)}, or ${dollars(R.lostNet)} after ${x.taxPct}% tax.` : 'Pay given up: none, you keep working.',
    R.loanOn ? `The loan: ${dollars(R.loan)} at ${x.loanRatePct}% over ${x.loanYears} years is ${dollars(R.pmt)} a month, ${dollars(R.interest)} of it interest.` : null,
    `The whole price: ${dollars(R.yours)} + ${dollars(R.lostNet)} pay given up${R.loanOn ? ` + ${dollars(R.interest)} interest` : ''} = ${dollars(R.total)}.`,
    `The raise: ${dollars(x.payAfter)} - ${dollars(x.payBefore)} = ${dollars(R.gain)} a year, ${dollars(R.gainNet)} after ${x.taxPct}% tax.`,
    R.paybackYears != null ? `Payback: ${dollars(R.total)} ÷ ${dollars(R.gainNet)} = ${yrs(R.paybackYears)} after you finish.` : null,
    R.lifetime != null ? `Lifetime value: ${dollars(R.gainNet)} × ${yrs(R.yearsAfter)} of work after you finish, to age ${x.endAge}, - ${dollars(R.total)} = ${dollars(R.lifetime)}, in today's dollars.` : null,
    'Not counted: raises after this one, how much you like the work, and what you would learn anyway.',
  ].filter(Boolean);
}

// Guess / Close / Exact of a path: from where the numbers are from; a Guess while an answer is missing. future: a
// number about the years ahead (the lifetime value, the FI date) is never more than Close.
export function crLevel(R, source, { future = false } = {}) {
  if (!R || R.needs?.length || !source || source === 'guess') return 'Guess';
  if (source === 'own' && !future) return 'Exact';
  return 'Close';
}

// Two paths side by side (trade school and a 4-year degree): each result, and which part differs the most.
export function crCompare(a, b) {
  if (!a || !b || a.needs?.length || b.needs?.length) return null;
  const parts = [['total', 'the whole price'], ['gainNet', 'the raise after tax'], ['lifetime', 'the lifetime value']].filter(([k]) => a[k] != null && b[k] != null)
    .map(([k, n]) => ({ k, n, diff: Math.abs(a[k] - b[k]) })).sort((p, q) => q.diff - p.diff);
  return { a, b, gap: a.lifetime != null && b.lifetime != null ? b.lifetime - a.lifetime : null, top: parts[0] ?? null };
}

// ---------- the credential stack ----------
const ymOk = s => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || ''));
const ymN = s => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7)) - 1;
const nYm = n => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`;
// list: [{ name, from: 'YYYY-MM', to: 'YYYY-MM' (the last month, counted), cost, raise }]. Returns the items in date
// order with their months, every pair that overlaps (and by how many months), the months from the first start to the
// last end, the months with at least one going on, and the totals of what is known.
export function crStack(list = []) {
  const items = list.map((c, i) => ({ ...c, i, ok: ymOk(c.from) && ymOk(c.to) && ymN(c.to) >= ymN(c.from) }))
    .map(c => (c.ok ? { ...c, a: ymN(c.from), b: ymN(c.to), months: ymN(c.to) - ymN(c.from) + 1 } : { ...c, months: null }));
  const dated = items.filter(c => c.ok).sort((p, q) => p.a - q.a || p.b - q.b);
  const overlaps = [];
  for (let i = 0; i < dated.length; i++) for (let j = i + 1; j < dated.length; j++) {
    const lo = Math.max(dated[i].a, dated[j].a), hi = Math.min(dated[i].b, dated[j].b);
    if (hi >= lo) overlaps.push({ a: dated[i].name, b: dated[j].name, months: hi - lo + 1, from: nYm(lo), to: nYm(hi) });
  }
  const busy = new Set(); dated.forEach(c => { for (let m = c.a; m <= c.b; m++) busy.add(m); });
  const span = dated.length ? Math.max(...dated.map(c => c.b)) - Math.min(...dated.map(c => c.a)) + 1 : 0;
  const sum = k => items.reduce((s, c) => s + (c[k] ?? 0), 0);
  return { items: [...dated, ...items.filter(c => !c.ok)], overlaps, span, busy: busy.size, cost: sum('cost'), raise: sum('raise'),
    open: items.filter(c => !c.ok || c.cost == null || c.raise == null).map(c => c.name), undated: items.filter(c => !c.ok).map(c => c.name) };
}
// The words of the stack's overlaps.
export function crStackWords(S) {
  if (!S || !S.items.length) return null;
  if (!S.busy) return 'Add the month each one starts and ends, and any overlap shows here.';
  if (!S.overlaps.length) return `No two overlap: ${S.busy} ${S.busy === 1 ? 'month' : 'months'} of learning, one at a time.`;
  return S.overlaps.map(o => `${o.a} and ${o.b} run at the same time for ${o.months} ${o.months === 1 ? 'month' : 'months'} (${o.from} to ${o.to}).`).join(' ');
}

// ---------- vesting: the dollars that stay with the job when a job ends early ----------
// The % vested after `years` of service on a schedule from CR_VEST; "own": the person's own percent.
export function crVested(schedule, years, ownPct = null) {
  const S = CR_VEST.find(v => v.id === schedule);
  if (!S || years == null) return null;
  if (!S.steps) return ownPct == null ? null : Math.max(0, Math.min(100, ownPct));
  return S.steps.reduce((p, [y, pct]) => (years + 1e-9 >= y ? pct : p), 0);
}
// x: { match (the job's match in the account now, dollars), years (completed years of service when you leave),
// schedule, ownPct }. Returns { needs, pct, kept, left, next: { years, pct, more, months } (the next step of the
// schedule: how much more is yours if you stay until then) }.
export function crVestLeft(x = {}) {
  const needs = ['match', 'years', 'schedule'].filter(k => x[k] == null);
  if (x.schedule === 'own' && x.ownPct == null) needs.push('ownPct');
  if (needs.length) return { needs };
  const pct = crVested(x.schedule, x.years, x.ownPct), kept = (x.match * pct) / 100, left = x.match - kept;
  const S = CR_VEST.find(v => v.id === x.schedule), step = S.steps ? S.steps.find(([y]) => y > x.years + 1e-9) : null;
  const next = step ? { years: step[0], pct: step[1], more: (x.match * (step[1] - pct)) / 100, months: Math.ceil((step[0] - x.years) * 12 - 1e-9) } : null;
  return { needs: [], pct, kept, left, next };
}
export function crVestWords(V) {
  if (!V || V.needs?.length) return null;
  if (V.left <= 0) return `All of the match is yours: ${dollars(V.kept)}. Leaving now, all of it goes with you.`;
  return `Leaving now, ${dollars(V.left)} of the match stays with the job. ${dollars(V.kept)} (${V.pct}%) is yours to keep.${V.next ? ` Staying ${V.next.months} more ${V.next.months === 1 ? 'month' : 'months'} makes ${dollars(V.next.more)} more of it yours.` : ''}`;
}
export function crVestMath(V, x = {}) {
  if (!V || V.needs?.length) return [];
  const S = CR_VEST.find(v => v.id === x.schedule);
  return [
    S.steps ? `${S.name}: after ${x.years} ${x.years === 1 ? 'year' : 'years'} of service, ${V.pct}% is yours (${S.steps.map(([y, p]) => `${p}% at ${y} ${y === 1 ? 'year' : 'years'}`).join(', ')}).` : `Your plan's own statement: ${V.pct}% is yours.`,
    `Yours: ${dollars(x.match)} × ${V.pct}% = ${dollars(V.kept)}. Stays with the job: ${dollars(x.match)} - ${dollars(V.kept)} = ${dollars(V.left)}.`,
    V.next ? `Next step: ${V.next.pct}% at ${V.next.years} years, ${V.next.months} months away: ${dollars(V.next.more)} more.` : null,
    'Your own contributions are always yours. Only the job\'s match can stay with the job.',
  ].filter(Boolean);
}
// Guess / Close / Exact of the dollars that stay with the job: the statement's own percent and a typed match are Exact; a tapped
// schedule is Close; a match from a chip is a Guess.
export function crVestLevel(V, { matchTyped = false, schedule = null } = {}) {
  if (!V || V.needs?.length || !matchTyped) return 'Guess';
  return schedule === 'own' ? 'Exact' : 'Close';
}

// ---------- the launch window: three moves, each as days on the FI date ----------
// Each returns { needs, once (paid now, less invested), changes: [{ at (month, 0 is this month), monthly (more (+) or
// less (-) invested each month from then on)] }, ...the numbers }. The app's own FI date runs with these.
// A job hop: a raise before taxes a year, taxed at taxPct, and what of the match stays with the job (crVestLeft).
export function crHop(x = {}) {
  const needs = ['raise', 'taxPct'].filter(k => x[k] == null);
  if (needs.length) return { needs };
  const monthly = (x.raise * (1 - x.taxPct / 100)) / 12, left = Math.max(0, x.left ?? 0);
  return { needs: [], monthly, left, once: left, changes: monthly ? [{ at: 0, monthly }] : [] };
}
// Roth or traditional now, for `yearly` dollars put in. Traditional saves nowPct of it in tax today and pays laterPct
// of it (grown) when taken out; Roth pays nowPct today. With the same take-home cost and the same growth, traditional
// leaves yearly × (nowPct - laterPct) more to invest each year, so the FI date moves by that a month (÷ 12).
export function crRothTrad(x = {}) {
  const needs = ['yearly', 'nowPct', 'laterPct'].filter(k => x[k] == null);
  if (needs.length) return { needs };
  const monthly = (x.yearly * (x.nowPct - x.laterPct)) / 100 / 12;
  return { needs: [], monthly, lead: Math.abs(monthly) < 0.005 ? 'same' : monthly > 0 ? 'trad' : 'roth', once: 0, changes: monthly ? [{ at: 0, monthly }] : [] };
}
// A house hack: rent from a roommate or a unit, less what it adds to your costs, for `years`.
export function crHack(x = {}) {
  const needs = ['rent', 'costs', 'years'].filter(k => x[k] == null);
  if (needs.length) return { needs };
  const monthly = x.rent - x.costs, months = Math.round(x.years * 12);
  return { needs: [], monthly, months, once: 0, changes: monthly ? [{ at: 0, monthly }, { at: months, monthly: -monthly }] : [] };
}
// A change of the FI date from months to days. Negative is sooner.
export function crDays(monthsBefore, monthsAfter) {
  if (monthsBefore == null || monthsAfter == null) return null;
  return Math.round((monthsAfter - monthsBefore) * CR_RULES.daysPerMonth);
}
export function crDayWords(days) {
  if (days == null) return 'No FI date yet';
  const n = Math.abs(days);
  if (n < 1) return 'No change';
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'day' : 'days'} ${days < 0 ? 'sooner' : 'later'}`;
}
export function crLaunchMath(kind, M, x = {}) {
  if (!M || M.needs?.length) return [];
  if (kind === 'hop') return [`The raise: ${dollars(x.raise)} a year × ${100 - x.taxPct}% after tax ÷ 12 = ${dollars(M.monthly)} more invested a month.`,
    M.left ? `Match that stays with the job: ${dollars(M.left)}, taken off what is invested today.` : 'Match that stays with the job: nothing.', 'The FI date runs again with both.'];
  if (kind === 'roth') return [`${dollars(x.yearly)} a year. Traditional saves ${x.nowPct}% now and pays ${x.laterPct}% when you take it out; Roth pays ${x.nowPct}% now and nothing later.`,
    `With the same growth, traditional leaves ${dollars(x.yearly)} × (${x.nowPct}% - ${x.laterPct}%) ÷ 12 = ${dollars(M.monthly)} a month more to invest${M.monthly < 0 ? ' (less: Roth leaves more)' : ''}.`, 'This counts the tax saved as invested. If it gets spent, Roth comes out ahead.'];
  return [`Rent coming in ${dollars(x.rent)} - what it adds to your costs ${dollars(x.costs)} = ${dollars(M.monthly)} a month invested, for ${x.years} ${x.years === 1 ? 'year' : 'years'}.`, 'After that, the plan goes on as it is today.'];
}
