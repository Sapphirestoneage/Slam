// SPDX-License-Identifier: AGPL-3.0-only
// Eli's frameworks and the canon (run "Not built, groups 1 to 5", Part 4, Nov 25 2026). One file of math for the
// web app and the game: the SWAN number, the Second Mouse checklist, the Trust Framework, the Advice translator,
// the Baby Steps next to the SLAM FOO, the wealth stages, Die With Zero's time buckets and the designed week, the
// net worth peak, 0% tax in early retirement, the steps of Your Money or Your Life that were not built yet (1a, 4, 5,
// 6, 7, 9) and the nine as one path, the one line of the next dollar, and the stackable quick wins.
// Pure. The two imports are the app's own rules (one way to work each number out): the spend-down payment of the ways
// to take money out, and the $100k stage of the FIRE journey. tools/game_frameworks_build.mjs copies this file into
// game/core/frameworks.js without the imports (the game has both names as globals: core/withdraw.js, core/trip.js).
// Every name starts with fw or FW_ because the game has one global scope.
// Empty is not zero: a missing input gives null or ready: false, never a number made from a guess of 0.
// The named frameworks from books are described in SLAM's own words, with the source named. No long quotes.
import { spendDownPayment } from './withdraw.js';
import { TP_RULES } from './trip.js';

const fwHas = v => typeof v === 'number' && Number.isFinite(v);
const fwR = v => Math.round(v);

// ---------- the SWAN number (sleep well at night) ----------
// Eli's: the cash that lets you sleep at night, said as months of what you must spend, plus the one big bill you
// worry about. It is your own line, not a rule: the web app keeps it on Cash layers (profile.sleepAtNight).
export const FW_SWAN_MONTHS = [1, 2, 3, 6, 9, 12];
export function fwSwan({ monthly = null, months = null, worry = 0, cash = null } = {}) {
  if (!fwHas(monthly) || monthly <= 0 || !fwHas(months) || months <= 0) return { ready: false };
  const w = fwHas(worry) && worry > 0 ? worry : 0, number = fwR(monthly * months + w);
  if (!fwHas(cash)) return { ready: true, number, monthly, months, worry: w, have: null, gap: null, share: null, monthsHave: null };
  return { ready: true, number, monthly, months, worry: w, have: cash, gap: Math.max(0, number - cash), share: number > 0 ? Math.min(1, Math.max(0, cash) / number) : 1, monthsHave: Math.max(0, cash - w) / monthly };
}

// ---------- the Second Mouse checklist ----------
// Eli's name for the informed player: the second mouse gets the cheese. Let others find the trap in a bank bonus or
// a card offer, read what they report, then go in knowing the terms. [id, the step, why]
export const FW_MOUSE = [
  ['reports', 'Read what others reported first', 'Did the bonus post, what counted as a direct deposit, how long it took.'],
  ['terms', 'Read the terms yourself', 'The deadline, the amount to move, who cannot get it, how long to keep it open.'],
  ['credit', 'Know if it checks your credit', 'Skip it in a year you need a loan or a new lease.'],
  ['fees', 'Know every fee and how to avoid it', 'A monthly fee can eat the bonus.'],
  ['idle', 'Use money that sits anyway', 'Never money you need this month.'],
  ['dates', 'Put the dates in your calendar', 'Opened, requirement done, bonus due, safe to close.'],
  ['one', 'One at a time until it feels routine', 'Two at once is how a step gets missed.'],
  ['tax', 'Set aside the tax', 'A bonus counts as income.'],
  ['exit', 'Know the way out', 'How to close it and move the money home.'],
];
// How far a tick list is. ticked: { id: true }. list: [[id, ...]].
export function fwTicks(list = [], ticked = {}) {
  const done = list.filter(r => ticked && ticked[r[0]]).length, next = list.find(r => !(ticked && ticked[r[0]])) || null;
  return { done, total: list.length, all: list.length > 0 && done === list.length, next: next ? next[0] : null };
}

// ---------- the Trust Framework ----------
// Eli's three questions before you follow any money advice: has the person done it, what do they gain, does it fit
// you. Each answer is a tap. ask: what to ask when the answer is not clear yet. ok: the answers that check out.
export const FW_TRUST = [
  { id: 'done', q: 'Has the person giving the advice done it themselves?', opts: [['yes', 'Yes, and they show it'], ['unsure', 'Not sure'], ['no', 'No']], ok: ['yes'], ask: 'Have you done this yourself? What happened?' },
  { id: 'gain', q: 'What do they gain if you follow it?', opts: [['nothing', 'Nothing, or a flat fee I pay'], ['unsure', 'Not sure'], ['paid', 'A commission or a share of my money']], ok: ['nothing'], ask: 'How are you paid if I do this, and if I do not?' },
  { id: 'fit', q: 'Does it fit you: your stage, your numbers, your values?', opts: [['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'Not for me now']], ok: ['yes'], ask: 'What would have to be true about me for this to be right?' },
];
export function fwTrust(ans = {}) {
  const rows = FW_TRUST.map(t => ({ id: t.id, a: ans[t.id] ?? null, ok: ans[t.id] != null && t.ok.includes(ans[t.id]), ask: t.ask }));
  const answered = rows.filter(r => r.a != null).length, ok = rows.filter(r => r.ok).length;
  const open = rows.filter(r => !r.ok);
  return { answered, ok, total: rows.length, ready: answered === rows.length, open: open.map(r => r.id), asks: open.map(r => r.ask), rows };
}
export function fwTrustWords(T) {
  if (!T.ready) return `${T.answered} of ${T.total} answered. Tap the rest to see where this advice stands.`;
  if (T.ok === T.total) return 'All three check out. It still helps to try it small first.';
  return `${T.ok} of ${T.total} check out. Before you follow it, ask: ${T.asks[0]}`;
}

// ---------- the Advice translator ----------
// One list with the FOO's Learn and unlearn (data/library/unlearn.json): each piece of popular advice is right at
// some steps and not at others. At your step: what applies now, what applied before, what comes later, and the one
// to unlearn now. order: the FOO order (js/registry/foo.js ORDER).
export function fwTranslate(step, entries = [], order = []) {
  const at = order.indexOf(String(step));
  if (at < 0) return { ready: false };
  const now = [], before = [], later = [];
  for (const e of entries) {
    const idx = (e.rightAt || []).map(s => order.indexOf(String(s))).filter(i => i >= 0);
    if (!idx.length) continue;
    if (idx.includes(at)) now.push(e);
    else if (idx.every(i => i < at)) before.push(e);
    else later.push(e);
  }
  const unlearn = entries.find(e => (e.showAt || []).includes(String(step))) || null;
  return { ready: true, step: String(step), now, before, later, unlearn };
}
// The game's next row (features/nextacct.js) as a FOO step, so the translator reads the same list in both apps.
export const FW_NEXT_STEP = { cushion1: '1', match: '2', debt: '3', cushion2: '4', hsa: '5', roth: '5', k401: '6', taxable: '9' };

// ---------- the Baby Steps, next to the SLAM FOO ----------
// Dave Ramsey's seven Baby Steps (The Total Money Makeover), in SLAM's words. foo: the SLAM FOO step that covers the
// same ground (js/registry/foo.js), and how SLAM's order differs.
export const FW_BABY = [
  { n: 1, name: 'Save $1,000 for a starter emergency fund', foo: '1', slam: 'SLAM: little e is $1,000 or your highest deductible, whichever is smaller, with a buffer first.' },
  { n: 2, name: 'Pay off every debt but the house, smallest balance first', foo: '3', slam: 'SLAM takes the full match first, pays debt at 8% or more next, and leaves low-rate debt for later.' },
  { n: 3, name: 'Save 3 to 6 months of expenses', foo: '4', slam: 'SLAM: big e is your age divided by 5 months of spending.' },
  { n: 4, name: 'Invest 15% of household income for retirement', foo: '5', slam: 'SLAM fills the Roth IRA and HSA, then invests toward Coast FI.' },
  { n: 5, name: "Save for your children's college", foo: '8', slam: 'SLAM funds big goals after Coast FI, as sinking funds.' },
  { n: 6, name: 'Pay off the home early', foo: '9', slam: 'SLAM pays low-rate debt at the end, next to FI.' },
  { n: 7, name: 'Build wealth and give', foo: '5b', slam: 'SLAM opens giving once heavy debt is gone.' },
];
export const FW_BABY_RULES = { starter: 1000, monthsLow: 3, retireShare: 0.15 };
export const FW_BABY_SOURCE = 'Dave Ramsey, The Total Money Makeover (the seven Baby Steps), as he publishes them at Ramsey Solutions';
// x: { cash, debt (everything owed but the home), monthly (spending a month), retireShare (of pay before taxes going
// to retirement), kids (true, false), college (true when it is on track), mortgage (balance; 0 or none: no home loan) }
export function fwBabySteps(x = {}) {
  const has = k => fwHas(x[k]);
  const done = [
    has('cash') ? x.cash >= FW_BABY_RULES.starter : null,
    has('debt') ? x.debt <= 0 : null,
    has('cash') && has('monthly') && x.monthly > 0 ? x.cash >= x.monthly * FW_BABY_RULES.monthsLow : null,
    has('retireShare') ? x.retireShare >= FW_BABY_RULES.retireShare - 0.0005 : null,
    x.kids === false ? true : x.kids === true ? (x.college === true ? true : x.college === false ? false : null) : null,
    has('mortgage') ? x.mortgage <= 0 : null,
  ];
  const steps = FW_BABY.map((b, i) => ({ ...b, done: i < 6 ? done[i] : null, skip: i === 4 && x.kids === false }));
  const first = steps.findIndex((s, i) => i < 6 && s.done !== true);
  const here = first < 0 ? 6 : steps[first].done === null ? null : first;
  steps[6].done = first < 0 ? true : false;
  return { steps, here, unknown: steps.filter((s, i) => i < 6 && s.done === null).map(s => s.n) };
}

// ---------- the wealth stages ----------
// Scott Trench, Set for Life: the first $25,000, then $25,000 to $100,000, then past $100,000, with the moves that
// matter most at each. The $100k line is the FIRE journey's own stage (TP_RULES.k100), so there is one list of lines.
export const FW_K25 = 25000;
export const FW_K25_SOURCE = 'Scott Trench, Set for Life (BiggerPockets, 2017): the stages of the first $25,000 and $100,000';
export const FW_WEALTH = [
  { id: 'start', name: 'The first $25,000', moves: ['Lower the three biggest costs: housing, getting around, food.', 'Know where each dollar goes, one month at a time.', 'Keep this money where you can reach it.'] },
  { id: 'build', name: '$25,000 to $100,000', moves: ['Raise your income: it is the biggest lever now.', 'Keep your spending flat when your pay goes up.', 'Look at a house hack or a move that lowers housing for years.'] },
  { id: 'grow', name: 'Past $100,000', moves: ['Put the money in things that pay you: index funds, a rental, a business.', 'Keep the share of pay you save high.', 'Your money now adds more each year than a raise does.'] },
];
export function fwWealthStage({ worth = null, monthly = null } = {}) {
  if (!fwHas(worth)) return { ready: false };
  const lines = [FW_K25, TP_RULES.k100], i = worth < lines[0] ? 0 : worth < lines[1] ? 1 : 2;
  const to = i < 2 ? lines[i] : null, left = to == null ? null : Math.max(0, to - worth);
  const months = left != null && fwHas(monthly) && monthly > 0 ? Math.ceil(left / monthly) : null;
  return { ready: true, i, stage: FW_WEALTH[i], worth, to, left, months, share: to ? Math.max(0, Math.min(1, worth / to)) : 1 };
}

// ---------- Die With Zero: time buckets and the designed week ----------
// Bill Perkins, Die With Zero (2020): put the experiences you want into the years of your life they fit best, since
// some have a window (health, energy, the ages of your kids). A bucket is a span of years; an item is { b (the first
// age of its bucket), k (what it is), cost (the person's own tap) }.
export const FW_BUCKET_YEARS = 10;
export const FW_BUCKET_KINDS = [['trip', 'A big trip'], ['adventure', 'Something that takes a strong body'], ['family', 'Time with family'], ['learn', 'Learn or make something'], ['break', 'A long break from work'], ['give', 'Give while you can see it']];
export function fwBuckets({ age = null, endAge = 90, items = [] } = {}) {
  if (!fwHas(age)) return { ready: false };
  const first = Math.floor(age / FW_BUCKET_YEARS) * FW_BUCKET_YEARS, out = [];
  for (let b = first; b < endAge; b += FW_BUCKET_YEARS) {
    const its = items.filter(t => t.b === b);
    const priced = its.filter(t => fwHas(t.cost));
    out.push({ from: Math.max(age, b), to: Math.min(endAge, b + FW_BUCKET_YEARS) - 1, b, items: its, total: priced.reduce((s, t) => s + t.cost, 0), unpriced: its.length - priced.length });
  }
  const total = out.reduce((s, x) => s + x.total, 0), full = out.filter(x => x.items.length).length;
  return { ready: true, buckets: out, total, full, empty: out.length - full };
}
// The designed week: the 168 hours as you would like them, next to the week you have. have, want: { id: hours a week }.
export const FW_WEEK = [['sleep', 'Sleep'], ['work', 'Work and getting there'], ['care', 'Chores and caring for people'], ['people', 'Time with people you love'], ['body', 'Moving your body'], ['make', 'Making, learning, play']];
export function fwWeek({ have = {}, want = {} } = {}) {
  const rows = FW_WEEK.map(([id, n]) => ({ id, n, have: fwHas(have[id]) ? have[id] : null, want: fwHas(want[id]) ? want[id] : null }));
  const sumOf = k => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  const wanted = sumOf('want');
  return { rows, wanted, left: 168 - wanted, fits: wanted <= 168, moves: rows.filter(r => r.have != null && r.want != null && r.want !== r.have).map(r => ({ id: r.id, n: r.n, by: r.want - r.have })) };
}

// ---------- the net worth peak ----------
// Bill Perkins, Die With Zero: net worth should peak, then go down on purpose. The peak is the first age at which
// what you have, growing at the plan's return after inflation, can pay your yearly spending until the last age and
// leave what you choose to leave. From that age, spending down is the plan. The yearly payment is the spend-down
// rule of the ways to take money out (spendDownPayment, js/math/withdraw.js).
export function fwPeak({ age = null, worth = null, saveYear = null, growth = null, spendYear = null, endAge = 90, leave = 0 } = {}) {
  if (![age, worth, saveYear, growth, spendYear].every(fwHas) || spendYear <= 0 || age >= endAge) return { ready: false };
  let b = worth;
  const path = [];
  for (let a = age; a < endAge; a++) {
    const pay = spendDownPayment(Math.max(0, b), leave, endAge - a, growth);
    path.push({ age: a, worth: b });
    if (b > 0 && pay >= spendYear) return { ready: true, peakAge: a, peak: b, now: a === age, years: a - age, canSpend: pay, path };
    b = b * (1 + growth) + saveYear;
  }
  return { ready: true, peakAge: null, peak: null, now: false, years: null, canSpend: null, path };
}

// ---------- 0% tax in early retirement ----------
// Jeremy Jacobson (Go Curry Cracker): shape the income of each year so the federal tax is $0. Ordinary income (a
// part-time job, a Roth conversion, interest) up to the standard deduction pays 0%; long-term gains and qualified
// dividends on top pay 0% while taxable income stays inside the 0% band. Only the gain part of a sale counts, so the
// cash a sale gives can be more. std and gainTop come from the app's own tax tables (data/reference-2026.json and the
// gains bands of js/math/lifetime.js, IRS Rev. Proc. 2025-32); gainShare is the share of a sale that is gain.
export function fwZeroTax({ std = null, gainTop = null, ordinary = 0, gainShare = 1, spend = null } = {}) {
  if (!fwHas(std) || !fwHas(gainTop)) return { ready: false };
  const ord = fwHas(ordinary) && ordinary > 0 ? ordinary : 0, share = fwHas(gainShare) && gainShare > 0 ? Math.min(1, gainShare) : 1;
  const ordinaryFree = Math.max(0, std - ord), over = Math.max(0, ord - std);
  const gainRoom = over > 0 ? Math.max(0, gainTop - over) : gainTop + ordinaryFree;
  const saleCash = gainRoom / share, reach = Math.min(ord, std) + saleCash;
  return { ready: true, std, gainTop, ordinary: ord, ordinaryFree, over, gainRoom, gainShare: share, saleCash, reach, incomeAtZero: std + gainTop,
    spend: fwHas(spend) ? spend : null, fits: fwHas(spend) ? spend <= reach + 0.5 : null, short: fwHas(spend) ? Math.max(0, spend - reach) : null };
}

// ---------- Your Money or Your Life: the steps not built before, and the nine as one path ----------
// Vicki Robin and Joe Dominguez, Your Money or Your Life. Each step in SLAM's words. act: the screen of the game
// that holds the step (the game draws a row only when that screen is there; a missing one says it comes soon).
export const FW_YMOYL = [
  { id: '1a', n: 'Every dollar you have earned', what: 'Add up what you have earned since your first job.', act: 'ym1a' },
  { id: '1b', n: 'What you have to show for it', what: 'Your net worth today: what you own minus what you owe.', act: 'ym1b' },
  { id: '2', n: 'Your real hourly wage', what: 'What an hour of your life really trades for.', act: 'hrs' },
  { id: '3', n: 'Where it all goes', what: 'Each month, every category of spending, in hours of your life.', act: 'ym3' },
  { id: '4', n: 'Three questions for each category', what: 'Did it bring joy for the life it cost? Does it fit your values? Would it change if you did not work?', act: 'ym4' },
  { id: '5', n: 'The wall chart', what: 'Income and spending, month by month, on one chart.', act: 'ym5' },
  { id: '6', n: 'Lower your spending', what: 'Ideas for each category that got a minus.', act: 'ym6' },
  { id: '7', n: 'Raise your income', what: 'Value your hours, then trade them for more.', act: 'ym7' },
  { id: '8', n: 'The crossover point', what: 'The month your money earns what your life costs.', act: 'slept' },
  { id: '9', n: 'Managing your money', what: 'A steady income from capital, a cushion, and cash for what wears out.', act: 'ym9' },
];
// done: { step id: true }, built: { step id: true when its screen exists }. The first open step that is built is next.
export function fwYmoylPath(done = {}, built = {}) {
  const steps = FW_YMOYL.map(s => ({ ...s, done: !!done[s.id], built: built[s.id] !== false }));
  const next = steps.find(s => !s.done && s.built) || null;
  return { steps, done: steps.filter(s => s.done).length, total: steps.length, next: next ? next.id : null };
}
// Step 1a: lifetime earnings. spans: [{ years, pay (a year, before taxes), hours (a week) }]
export function fwLifetime(spans = []) {
  const ok = spans.filter(s => fwHas(s.years) && s.years > 0 && fwHas(s.pay));
  if (!ok.length) return { ready: false };
  const total = ok.reduce((t, s) => t + s.years * s.pay, 0), years = ok.reduce((t, s) => t + s.years, 0);
  const timed = ok.filter(s => fwHas(s.hours) && s.hours > 0), hours = timed.reduce((t, s) => t + s.years * s.hours * 52, 0);
  return { ready: true, total, years, hours: timed.length === ok.length ? hours : null, perYear: total / years, perHour: timed.length === ok.length && hours > 0 ? total / hours : null };
}
// Step 4: the three questions. cats: [{ k, amt (a month), a: [q1, q2, q3] each '+', '-', '0' or null }]. wage: the
// real hourly wage (step 2), for the hours.
export const FW_MARKS = [['+', 'Plus'], ['-', 'Minus'], ['0', 'Even']];
export function fwThreeQ(cats = [], wage = null) {
  const rows = cats.map(c => {
    const a = c.a || [], marked = a.filter(v => v === '+' || v === '-' || v === '0').length;
    return { k: c.k, amt: c.amt, marked, minus: a.includes('-'), plus: a.filter(v => v === '+').length, hours: fwHas(c.amt) && fwHas(wage) && wage > 0 ? c.amt / wage : null };
  });
  const minus = rows.filter(r => r.minus), all = rows.length > 0 && rows.every(r => r.marked === 3);
  return { rows, all, marked: rows.filter(r => r.marked === 3).length, minus: minus.map(r => r.k), minusAmt: minus.reduce((s, r) => s + (fwHas(r.amt) ? r.amt : 0), 0) };
}
// Step 5: the wall chart. snaps: [{ d: 'YYYY-MM-DD', take, spend }]. The last snapshot of each month, in order.
export function fwWall(snaps = []) {
  const by = {};
  for (const s of snaps) if (s && s.d && fwHas(s.take) && fwHas(s.spend)) by[s.d.slice(0, 7)] = s;
  const months = Object.keys(by).sort().map(m => ({ m, take: by[m].take, spend: by[m].spend, kept: by[m].take - by[m].spend }));
  return { months, ready: months.length >= 2, gapNow: months.length ? months[months.length - 1].kept : null };
}
// Step 6: lower spending. The ideas per kind of spending, in SLAM's words, and the hours a cut frees.
export const FW_LOWER = {
  home: ['Ask for a lower rent at renewal, with what nearby places ask.', 'A roommate or a smaller place when the lease ends.', 'Call to lower the internet and the phone plan.'],
  food: ['Plan the week, shop once, cook double.', 'Pick the two meals out you love and drop the rest.', 'Bring lunch three days a week.'],
  move: ['Shop the car insurance every year.', 'Walk, bike or take transit one day a week.', 'Keep the car you have longer.'],
  bills: ['Cancel what you did not use last month.', 'Share a plan with people you live with.', 'Ask each company for a lower price, once a year.'],
  fun: ['Keep the fun that got a plus; drop the rest.', 'Swap a paid night for a free one twice a month.', 'Wait 48 hours before a want.'],
  other: ['Buy used or borrow first.', 'Sell what you do not use.', 'Use the library.'],
};
export function fwLowerKind(name = '') {
  const s = String(name).toLowerCase();
  if (/home|rent|mortgage|housing|utilit/.test(s)) return 'home';
  if (/food|grocer|eat|dining|restaurant/.test(s)) return 'food';
  if (/getting around|car|gas|transit|transport|auto/.test(s)) return 'move';
  if (/bill|subscri|phone|internet|insur/.test(s)) return 'bills';
  if (/fun|entertain|hobby|travel|shopping/.test(s)) return 'fun';
  return 'other';
}
export function fwFreed(cut = null, wage = null) {
  if (!fwHas(cut) || cut <= 0) return null;
  return { month: cut, year: cut * 12, hours: fwHas(wage) && wage > 0 ? cut / wage : null };
}
// Step 7: raise income. wage: the real hourly wage now; hoursMonth: hours a month the job takes; up: dollars more an hour.
export const FW_RAISE_UPS = [1, 2, 5, 10];
export const FW_RAISE_IDEAS = ['Ask for a raise, with what the role pays elsewhere.', 'Learn the skill the next job up asks for.', 'Charge for the thing people already ask you to do.', 'Cut the hours the job takes but does not pay: the commute, the extra meetings.', 'Change jobs: a new job often pays more than a raise.'];
export function fwRaise({ wage = null, hoursMonth = null, up = null } = {}) {
  if (!fwHas(wage) || !fwHas(hoursMonth) || hoursMonth <= 0 || !fwHas(up)) return { ready: false };
  return { ready: true, wage, newWage: wage + up, month: up * hoursMonth, year: up * hoursMonth * 12 };
}
// Step 9: capital, cushion, cache. The income your capital can pay a month at the plan's withdrawal rate, next to
// what life costs; a cushion of months of spending; the cash that is left for what wears out.
export const FW_CUSHION_MONTHS = 6;
export function fwStep9({ invested = null, cash = null, monthly = null, rate = null, cushionMonths = FW_CUSHION_MONTHS } = {}) {
  if (!fwHas(invested) || !fwHas(monthly) || monthly <= 0 || !fwHas(rate) || rate <= 0) return { ready: false };
  const income = invested * rate / 12, cushion = monthly * cushionMonths;
  return { ready: true, income, monthly, share: income / monthly, crossed: income >= monthly, cushion, cash: fwHas(cash) ? cash : null,
    cushionLeft: fwHas(cash) ? Math.max(0, cushion - cash) : null, cache: fwHas(cash) ? Math.max(0, cash - cushion) : null };
}

// ---------- the one line of the next dollar ----------
// kind: the step the next dollar goes to (the vocabulary of the game's next row, features/nextacct.js; the web app
// maps its FOO step to it). left: what is still needed (dollars) or the room left a month (cap). matchLeft: dollars a
// year of the match not taken yet, said whenever it is not the step itself. Match included, always.
export const FW_FOO_KIND = { '1': 'cushion1', '2': 'match', '3': 'debt', '4': 'cushion2', '5': 'taxfree', '5b': 'give', '6': 'k401', '7': 'k401', '8': 'goals', '9': 'fi' };
const FW_NEXT_WORDS = {
  cushion1: 'the small cushion', match: 'the full match at work', debt: 'high-interest debt', cushion2: 'the full cushion',
  hsa: 'your HSA', roth: 'your Roth IRA', taxfree: 'your Roth IRA and HSA', k401: 'your plan at work', taxable: 'a regular investing account',
  give: 'your giving', goals: 'your next big goal', fi: 'what is left on the way to FI',
};
export function fwNextDollar({ kind = null, left = null, perMonth = false, matchLeft = null, money = v => `$${Math.round(v).toLocaleString('en-US')}` } = {}) {
  if (!kind || !FW_NEXT_WORDS[kind]) return null;
  const amt = fwHas(left) && left > 0.5 ? (perMonth ? `, room for ${money(left)} a month` : `, ${money(left)} to go`) : '';
  const match = kind !== 'match' && fwHas(matchLeft) && matchLeft > 0.5 ? ` Then the full match: ${money(matchLeft)} a year is still free.` : '';
  return `Your next dollar: ${FW_NEXT_WORDS[kind]}${amt}.${match}`;
}

// ---------- stackable quick wins ----------
// Small fixes that each save a little and stack up (Brad Barrett, ChooseFI, calls them quick wins). Each one is a
// tick; what it saved is the person's own tap, so no win carries a made-up amount.
export const FW_WINS = [
  ['insure', 'Shop your car and renters insurance'], ['phone', 'Move to a cheaper phone plan'], ['net', 'Ask for a lower internet price'],
  ['subs', 'Cancel one subscription you did not use'], ['hysa', 'Move savings to a high-yield account'], ['apr', 'Ask your card for a lower rate'],
  ['auto', 'Set up an automatic transfer on payday'], ['match', 'Check you get the full match'], ['w4', 'Check your W-4 withholding'],
  ['fees', 'Find and drop one fee'], ['sell', 'Sell one thing you do not use'], ['library', 'Get a library card'],
];
export const FW_WIN_SAVES = [0, 5, 10, 25, 50, 100];
// wins: { id: { done: true, save: dollars a month or null } }; yearSpend: what a year of life costs, for FI days.
export function fwWins(wins = {}, yearSpend = null) {
  const done = FW_WINS.filter(([id]) => wins[id] && wins[id].done);
  const priced = done.filter(([id]) => fwHas(wins[id].save));
  const month = priced.reduce((s, [id]) => s + wins[id].save, 0);
  return { done: done.length, total: FW_WINS.length, unpriced: done.length - priced.length, month, year: month * 12,
    fiDays: fwHas(yearSpend) && yearSpend > 0 ? month * 12 / (yearSpend / 365) : null };
}
