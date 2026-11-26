// SPDX-License-Identifier: AGPL-3.0-only
// The game, first half (run "Not built, groups 1 to 5", Part 10a, Nov 26 2026; M8Z). ONE engine for the game's quest
// screens: pure, with one import only (js/math/peers.js, the rank), so tools/game_quest_build.mjs copies it word for word into
// game/core/quest.js. Every name starts with qs or QS_ because the game has one global scope. Empty is not zero: a
// missing input gives null (or ready: false), never a number from a guess of 0.
//
// The caller reads every number from its own engines (the game's derive(), tpJourney, the money read, the priors
// rows of data/priors-2026.json) and hands plain numbers in. Nothing here makes a money number of its own.
//   qsStats        the quest mode character sheet: health (the cushion), armor (the protections), six stats
//   qsCapacity     how much you can take on right now (0 to 3 new steps), from the margin, the cushion and your plate
//   qsFails        how this plan fails: the weak spots, each with its breaking point, and the three moves that stop it
//   qsHidden       hidden costs your life charges you: a year, a month, in days of your spending (qsInterest,
//                  qsCashDrag, qsTimeCost work out the pieces)
//   qsRank         where you think you rank next to where you are (the SCF 2025 rows, by age)
//   qsDuel         opponents that test your values (QS_OPPONENTS), and qsCost (a price in days and months)
//   qsJudge        the judge that keeps a record of the game's calls about you, and a challenge (qsJudgeAdd, qsFromPush)
//   qsAsk, qsLearn ask the game a question: answered from the plan's own numbers and the library text
//   qsPack         path packs: guided routes through the skills (QS_PACKS), and qsPackFit (the one that fits now)
//   qsGraduate     the win state (your finish line among the journey's stages), and qsStory (your story from the
//                  history of snapshots; the money read only when you turned on "Show my read")

import { PE_RULES, PE_WORDS, peNetWorth } from './peers.js'; // the game loads core/peers.js before core/quest.js

// SLAM's own rules (Eli to confirm, QUESTIONS): the cushion counts full at 6 months and steady at 3, the margin full at
// 50% saved and thin under 10%, rhythm full at 12 check-ins in a row, capacity steps at a 5% and a 15% margin,
// "about the middle" within 10% of the median, three moves, and a judge's record of the last 60 entries.
export const QS_RULES = { cushionFull: 6, cushionOk: 3, marginFull: 0.5, marginLow: 0.1, rhythmFull: 12, capLow: 0.05, capMid: 0.15, capMax: 3, nearShare: PE_RULES.near, moves: 3, judgeKeep: 60 };
export const QS_SOURCES = {
  rules: "SLAM's own rules of the quest screens (run Not built, groups 1 to 5, Part 10a, Nov 26 2026); Eli to confirm",
  rank: 'Federal Reserve Board, Survey of Consumer Finances 2025 (released Oct 9 2026): family net worth by age of head, Table 2, and the net worth percentiles, Table A.2 (data/priors-2026.json)',
  premortem: 'The pre-mortem: imagine the plan did not work out, and ask why (Gary Klein, Performing a Project Premortem, Harvard Business Review, Sept 2007)',
};

const qsHas = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const qsNum = v => (qsHas(v) ? Number(v) : null);
const qsClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const qsRound = (v, dp = 0) => (v == null ? null : Math.round(v * 10 ** dp) / 10 ** dp);
const qsMoney0 = v => `$${Math.round(v).toLocaleString('en-US')}`;
const qsPct = v => `${Math.round(v * 100)}%`;
const qsMos = m => `${qsRound(m, 1)} ${qsRound(m, 1) === 1 ? 'month' : 'months'}`;
const QS_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const qsMonth = iso => (typeof iso === 'string' && /^\d{4}-\d{2}/.test(iso) ? `${QS_MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : null);

// A score of 0 to 100 from what you have against the mark that counts as full. null when either side is missing.
export function qsScore(have, full) {
  const h = qsNum(have), f = qsNum(full);
  if (h === null || f === null || f <= 0) return null;
  return Math.round(qsClamp((h / f) * 100, 0, 100));
}

// ---------- the quest mode character sheet ----------
// x: { take, spend, cash, hiDebt, inv, nw, fi, coast, target (the cushion's target in months), protDone, protMax,
// sharp, sharpOf (how many of the main numbers are real), streak (check-ins in a row), real: { take, spend, cash,
// debt, inv } (true when that number is real, not a guess) }. money: the caller's formatter.
export function qsStats(x = {}, money = qsMoney0) {
  const R = QS_RULES, n = k => qsNum(x[k]), real = x.real || {};
  const lvl = keys => (keys.every(k => real[k] === true) ? 'Close' : 'Guess');
  const take = n('take'), spend = n('spend'), cash = n('cash'), hi = n('hiDebt'), inv = n('inv'), nw = n('nw'), fi = n('fi'), coast = n('coast');
  const target = n('target') ?? R.cushionFull, months = cash !== null && spend > 0 ? cash / spend : null;
  const health = { id: 'health', name: 'Health', short: 'HP', what: 'Your cushion: months of spending in cash', value: months, shown: months === null ? null : qsMos(months), score: qsScore(months, target), level: lvl(['cash', 'spend']),
    math: months === null ? 'Needs your cash and your spending a month' : `${money(cash)} in cash / ${money(spend)} a month = ${qsMos(months)}, of a target of ${qsMos(target)}` };
  const pd = n('protDone'), pm = n('protMax');
  const armor = { id: 'armor', name: 'Armor', short: 'AC', what: 'The protections in place, of the ones that fit your life', value: pd, shown: pm ? `${pd} of ${pm}` : null, score: pm ? qsScore(pd, pm) : null, level: 'Close',
    math: pm ? `${pd} of the ${pm} protections that fit you are in place` : 'No protection fits these answers yet' };
  const rate = take > 0 && spend !== null ? (take - spend) / take : null;
  const reach = fi > 0 && nw !== null ? nw / fi : null, coastPct = coast > 0 && inv !== null ? inv / coast : null;
  const load = take > 0 && hi !== null ? hi / (take * 12) : null;
  const sp = n('sharp'), so = n('sharpOf'), streak = n('streak');
  const stats = [
    { id: 'margin', name: 'Margin', what: 'The share of what comes in that you keep', value: rate, shown: rate === null ? null : qsPct(rate), score: rate === null ? null : qsScore(Math.max(0, rate), R.marginFull), level: lvl(['take', 'spend']),
      math: rate === null ? 'Needs what comes in and what goes out a month' : `(${money(take)} - ${money(spend)}) / ${money(take)} = ${qsPct(rate)} kept; full at ${qsPct(R.marginFull)}` },
    { id: 'reach', name: 'Reach', what: 'Your net worth, of your FI number', value: reach, shown: reach === null ? null : qsPct(Math.max(0, reach)), score: reach === null ? null : qsScore(Math.max(0, reach), 1), level: lvl(['cash', 'inv', 'debt', 'spend']),
      math: reach === null ? 'Needs your FI number and your net worth' : `${money(nw)} / ${money(fi)} = ${qsPct(Math.max(0, reach))} of the way to FI` },
    { id: 'light', name: 'Lightness', what: 'Costly debt, next to a year of what comes in', value: hi, shown: hi === null ? null : money(hi), score: load === null ? null : Math.round(100 * (1 - Math.min(1, load))), level: lvl(['debt', 'take']),
      math: load === null ? 'Needs what you owe and what comes in' : `100 x (1 - ${money(hi)} / ${money(take * 12)} a year) = ${Math.round(100 * (1 - Math.min(1, load)))}` },
    { id: 'coast', name: 'Coast', what: 'Invested, of the amount that reaches FI on its own', value: coastPct, shown: coastPct === null ? null : qsPct(coastPct), score: coastPct === null ? null : qsScore(coastPct, 1), level: lvl(['inv', 'spend']),
      math: coastPct === null ? 'Needs what you have invested and your Coast number' : `${money(inv)} / ${money(coast)} = ${qsPct(coastPct)} of your Coast number` },
    { id: 'clarity', name: 'Clarity', what: 'Your main numbers that are real, not a guess', value: so ? sp / so : null, shown: so ? `${sp} of ${so}` : null, score: so ? qsScore(sp, so) : null, level: 'Exact',
      math: so ? `${sp} of your ${so} main numbers are real` : 'No main numbers yet' },
    { id: 'rhythm', name: 'Rhythm', what: 'Check-ins in a row', value: streak, shown: streak === null ? null : `${streak} in a row`, score: qsScore(streak, R.rhythmFull), level: 'Exact',
      math: streak === null ? 'No check-in yet' : `${streak} of ${R.rhythmFull} check-ins in a row` },
  ];
  const scored = stats.filter(s => s.score !== null);
  const best = scored.length ? scored.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const train = scored.length > 1 ? scored.reduce((a, b) => (b.score < a.score ? b : a)) : null;
  return { ready: scored.length > 0, health, armor, stats, best: best && best.id, train: train && train !== best ? train.id : null };
}

// ---------- capacity: how much you can take on right now ----------
// x: { take, spend, cushionMonths, plate: 'light' | 'normal' | 'full' (your own tap), felt: null | 'less' | 'more'
// (a challenge to the judge: your own evidence moves the call one step) }.
export function qsCapacity(x = {}, money = qsMoney0) {
  const R = QS_RULES, take = qsNum(x.take), spend = qsNum(x.spend), cm = qsNum(x.cushionMonths);
  if (take === null || spend === null) return { ready: false, slots: null, why: ['Needs what comes in and what goes out a month'] };
  const free = take - spend, share = take > 0 ? free / take : 0, why = [];
  let slots = free <= 0 ? 0 : share < R.capLow ? 1 : share < R.capMid ? 2 : R.capMax;
  why.push(free <= 0 ? `Nothing is left at the end of the month (${money(free)})` : `${money(free)} a month is free after spending, ${qsPct(share)} of what comes in`);
  if (slots > 1 && cm !== null && cm < 1) { slots = 1; why.push(`The cushion covers ${qsMos(cm)}, so the one step is the cushion`); }
  if (x.plate === 'full' && slots > 0) { slots -= 1; why.push('You said your plate is full: one step less'); }
  if (x.felt === 'less' && slots > 0) { slots -= 1; why.push('You told the judge you have less room than this: one step less'); }
  if (x.felt === 'more' && free > 0 && slots < R.capMax) { slots += 1; why.push('You told the judge you have more room than this: one step more'); }
  slots = qsClamp(slots, 0, R.capMax);
  const words = slots === 0 ? 'Hold for now: finish what is open, or free some money first, before you add a step.'
    : slots === 1 ? 'Room for one new step this month.' : `Room for ${slots} new steps this month.`;
  return { ready: true, slots, free, share, perStep: slots > 0 ? free / slots : null, words, why };
}

// ---------- how this plan fails, and the three moves that stop it ----------
// x: { take, spend, cash, hiDebt, interest (costly debt's interest a month), incomes (how many sources), protDone,
// protMax, protNext (the name of the next protection), lowGap (short in a low month) }. Each weak spot has room: how
// far it is from breaking (1 or more is steady). The spots are sorted by room, the closest to breaking first. A missing
// protection counts half (room 0.5 with none in place): a cushion under half its mark comes before it.
export function qsFails(x = {}, money = qsMoney0) {
  const R = QS_RULES, take = qsNum(x.take), spend = qsNum(x.spend), cash = qsNum(x.cash);
  if (take === null || spend === null || cash === null || spend <= 0) return { ready: false, spots: [], steady: [], moves: [] };
  const months = cash / spend, all = [];
  const need = m => Math.max(0, m * spend - cash);
  all.push({ id: 'paycheck', name: 'A month with no pay', room: months / R.cushionOk, breakAt: months,
    line: `With no pay coming in, the cushion covers ${qsMos(months)}.`, move: `Build the cushion to ${R.cushionOk} months: ${money(need(R.cushionOk))} more.` });
  const rate = take > 0 ? (take - spend) / take : 0;
  all.push({ id: 'margin', name: 'Prices go up', room: rate <= 0 ? 0 : rate / R.marginLow, breakAt: rate,
    line: rate > 0 ? `Spending can rise ${qsPct((take - spend) / spend)} before the month runs short.` : `This month spends ${money(spend - take)} more than comes in.`,
    move: `Free ${money(Math.max(0, take * R.marginLow - (take - spend)))} a month for a ${qsPct(R.marginLow)} margin.` });
  const hi = qsNum(x.hiDebt);
  if (hi > 0) all.push({ id: 'debt', name: 'Costly debt', room: take > 0 ? 1 - Math.min(1, hi / (take * 12)) : 0, breakAt: hi,
    line: `Costly debt of ${money(hi)}${qsHas(x.interest) ? ` charges about ${money(x.interest)} a month` : ''}.`, move: 'Put the next free dollar on the highest rate first.' });
  if (qsNum(x.incomes) === 1 && months >= R.cushionOk && months < R.cushionFull)
    all.push({ id: 'oneIncome', name: 'One paycheck carries it all', room: months / R.cushionFull, breakAt: months,
      line: 'One source of pay carries the whole plan.', move: `Grow the cushion toward ${R.cushionFull} months while one paycheck carries it: ${money(need(R.cushionFull))} more.` });
  const pd = qsNum(x.protDone), pm = qsNum(x.protMax);
  if (pm > 0 && pd < pm) all.push({ id: 'cover', name: 'A big surprise bill', room: (1 + pd / pm) / 2, breakAt: pm - pd,
    line: `${pd} of the ${pm} protections that fit you are in place.`, move: x.protNext ? `Add the next protection: ${x.protNext}.` : 'Add the next protection.' });
  const gap = qsNum(x.lowGap);
  if (gap > 0) all.push({ id: 'bumpy', name: 'A low month', room: cash / (gap * R.cushionOk), breakAt: cash / gap,
    line: `In a low month you are short ${money(gap)}; the cash covers ${qsMos(cash / gap)} like that.`, move: `Keep ${money(gap * R.cushionOk)} for ${R.cushionOk} low months.` });
  const spots = all.filter(s => s.room < 1).sort((a, b) => a.room - b.room);
  return { ready: true, spots, steady: all.filter(s => s.room >= 1).map(s => s.name), moves: spots.slice(0, R.moves).map(s => ({ id: s.id, t: s.move })) };
}

// ---------- hidden costs your life charges you ----------
// Interest a year on a list of debts [{ amt, apr (a percent) }]; a rate that is missing counts the debt out (null when none).
export function qsInterest(debts = []) {
  const D = debts.filter(d => qsNum(d.amt) > 0 && qsHas(d.apr));
  return D.length ? D.reduce((s, d) => s + (Number(d.amt) * Number(d.apr)) / 100, 0) : null;
}
// What prices take a year from cash above the cushion you keep, when it earns `earns` (a rate; 0 when it earns nothing).
export function qsCashDrag(cash, keep, inflation, earns = 0) {
  const c = qsNum(cash), k = qsNum(keep), i = qsNum(inflation);
  if (c === null || k === null || i === null) return null;
  return Math.max(0, c - k) * Math.max(0, i - (qsNum(earns) ?? 0));
}
// The hours a month of running your money, at a rate an hour, as a year.
export function qsTimeCost(minutesMonth, rate) {
  const m = qsNum(minutesMonth), r = qsNum(rate);
  return m === null || r === null ? null : (m / 60) * r * 12;
}
// items: [{ id, name, year (a year, or null when it cannot be worked out), why, needs }]. spend: a month.
export function qsHidden(items = [], spend = null) {
  const day = qsNum(spend) > 0 ? (Number(spend) * 12) / 365 : null;
  const rows = items.map(i => {
    const y = qsNum(i.year);
    return { ...i, year: y, month: y === null ? null : y / 12, days: y === null || day === null ? null : y / day };
  });
  const known = rows.filter(r => r.year !== null && r.year > 0).sort((a, b) => b.year - a.year);
  const total = known.reduce((s, r) => s + r.year, 0);
  return { rows: known, open: rows.filter(r => r.year === null), total: known.length ? total : null, days: known.length && day ? total / day : null };
}

// ---------- where you think you rank, next to where you are ----------
export const QS_RANK_GUESS = [['below', 'Below the middle'], ['near', 'About the middle'], ['above', 'Above the middle']];
// x: { guess, nw, age, rows (the netWorth rows of the priors data) }. The rank itself is peNetWorth (js/math/peers.js),
// the one function the peers screen of both apps reads too (run Finish everything partly built, Part 9).
export function qsRank(x = {}, money = qsMoney0) {
  const P = peNetWorth({ nw: x.nw, age: x.age, rows: x.rows, near: QS_RULES.nearShare }, money);
  const guess = QS_RANK_GUESS.some(g => g[0] === x.guess) ? x.guess : null;
  if (!P.ready) return { ready: false, guess: x.guess || null, band: P.band || null };
  const vs = guess === null ? null : guess === P.where ? 'Your guess matches.' : `You guessed ${PE_WORDS[guess]}; the numbers say ${PE_WORDS[P.where]}.`;
  return { ready: true, guess, where: P.where, match: guess === null ? null : guess === P.where, band: P.band, median: P.median, all: P.all, quarter: P.quarter, line: P.line, vs, math: P.math.slice(0, 3) };
}

// ---------- opponents that test your values ----------
// Original opponents. pull: the value the spending serves; test: the value it costs. The names of values are the
// game's own list (features/values.js, VL_ALL). prices: the amounts to tap (the price is yours, never a guess of ours).
export const QS_OPPONENTS = [
  { id: 'upgrade', name: 'The Shiny Upgrade', tempt: 'Your phone works, but the new one is out today.', pull: 'Fun', test: 'Freedom and time', prices: [300, 600, 1000, 1500] },
  { id: 'groupTrip', name: 'The Group Chat Trip', tempt: 'Friends are booking a long weekend away and want you in by Friday.', pull: 'Friends and community', test: 'Security', prices: [400, 800, 1500, 2500] },
  { id: 'lift', name: 'The Lifestyle Lift', tempt: 'A raise came through, and a nicer place is open a month from now.', pull: 'Home', test: 'Freedom and time', prices: [200, 400, 700, 1000] },
  { id: 'rescue', name: 'The Rescue Request', tempt: 'Someone in the family asks to borrow money, again.', pull: 'Family', test: 'Security', prices: [250, 500, 1000, 3000] },
  { id: 'hotTip', name: 'The Hot Tip', tempt: 'A coworker swears this one stock can only go up.', pull: 'Adventure and travel', test: 'Security', prices: [500, 1000, 2500, 5000] },
  { id: 'flash', name: 'The Flash Sale', tempt: 'Forty percent off, today only, on something you did not need this morning.', pull: 'Fun', test: 'Freedom and time', prices: [50, 150, 300, 600] },
  { id: 'cause', name: 'The Good Cause', tempt: 'A cause you care about asks for a gift every month.', pull: 'Giving', test: 'Freedom and time', prices: [20, 50, 100, 250] },
  { id: 'course', name: 'The Shortcut Course', tempt: 'A course promises a new career in eight weeks.', pull: 'Learning', test: 'Security', prices: [500, 1500, 3000, 6000] },
];
export const QS_CHOICES = [['yes', 'Spend it'], ['half', 'A smaller version'], ['no', 'Pass']];
// What a price costs in days of your spending and in months of what you keep.
export function qsCost(price, spend, free) {
  const p = qsNum(price), s = qsNum(spend), f = qsNum(free);
  if (p === null) return null;
  return { price: p, days: s > 0 ? p / ((s * 12) / 365) : null, months: f > 0 ? p / f : null };
}
// A choice against your values. Beaten: the choice fits what you said matters. Both values yours: any choice is a real
// tie and fits; neither yours: this one does not test you, so any choice fits.
export function qsDuel(opp, choice, values = []) {
  if (!opp || !QS_CHOICES.some(c => c[0] === choice)) return null;
  const P = values.includes(opp.pull), T = values.includes(opp.test);
  const kind = P && !T ? 'pull' : !P && T ? 'test' : P && T ? 'tie' : 'none';
  const fits = kind === 'pull' ? choice !== 'no' : kind === 'test' ? choice !== 'yes' : true;
  const line = kind === 'pull' ? (fits ? `${opp.pull} is one of yours, and you spent on it on purpose.` : `${opp.pull} is one of yours. Passing is fine; next time it may be worth it.`)
    : kind === 'test' ? (fits ? `You kept ${opp.test}, one of yours, ahead of ${opp.pull}.` : `${opp.test} is one of yours, and this took from it. Recalculating: the next one is a fresh round.`)
    : kind === 'tie' ? `${opp.pull} and ${opp.test} are both yours. Any answer is a real choice.` : 'This one does not pull on your values. Any answer is fine.';
  return { id: opp.id, choice, kind, beaten: fits, line };
}

// ---------- the judge that keeps a record ----------
// calls: [{ id, label, said (the call now, in words), evidence: [lines], change (how a challenge can change it) }].
// log: [{ id, at, said (the call as it was), tap: 'fits' | 'not', why }]. Each call gets its entries, the first call on
// record, whether it changed since, and whether the last tap was a challenge.
export function qsJudge(calls = [], log = []) {
  return calls.map(c => {
    const E = log.filter(e => e.id === c.id);
    const first = E.length ? E[0].said : null, last = E.length ? E[E.length - 1] : null;
    return { ...c, entries: E, first, changed: first !== null && first !== c.said, challenged: !!last && last.tap === 'not', since: E.length ? E[0].at : null };
  });
}
// A new entry; the record keeps the newest QS_RULES.judgeKeep.
export function qsJudgeAdd(log = [], call, tap, why, at) {
  if (!call || !['fits', 'not'].includes(tap)) return log;
  return [...log, { id: call.id, at, said: call.said, tap, why: why || null }].slice(-QS_RULES.judgeKeep);
}
// The push-backs of the money read ("Is this really it?", the sins engine's snJudgeLog) as entries of the record.
export function qsFromPush(rows = []) {
  return rows.map(p => ({ id: 'read', at: p.at, said: p.name, tap: p.said === 'yes' ? 'fits' : 'not',
    why: p.said === 'yes' ? `You said ${p.name} fits` : p.said === 'no' ? `You said ${p.name} does not fit` : `You said ${p.toName} fits better than ${p.name}` }));
}

// ---------- ask the game a question ----------
export const QS_ASK = [
  ['when', 'When could work be optional?'], ['last', 'How long would my cash last?'], ['keep', 'How much do I keep each month?'],
  ['next', 'What is my next move?'], ['learn', 'What does the library say about...'],
];
// f: { age, freeMonths (months to FI from the game's own run, null when no date), cash, spend, take, moves (the
// three moves of qsFails), nextStep (the game's next step, a name) }.
export function qsAsk(kind, f = {}, money = qsMoney0) {
  const q = (QS_ASK.find(a => a[0] === kind) || [])[1];
  if (!q || kind === 'learn') return null;
  const spend = qsNum(f.spend), take = qsNum(f.take), cash = qsNum(f.cash);
  if (kind === 'when') {
    const m = qsNum(f.freeMonths), age = qsNum(f.age);
    return { q, lines: m === null ? ['There is no date on this path yet: nothing is left over to invest each month.', 'Recalculating: a wider margin brings a date. "What is my next move?" shows one.']
      : m <= 0 ? ['Work is optional now on these numbers.'] : [`In about ${qsRound(m / 12, 1)} years${age !== null ? `, at about ${Math.round(age + m / 12)}` : ''}.`, 'From your plan: what you have invested, what you keep each month and your spending.'] };
  }
  if (kind === 'last') {
    if (cash === null || !(spend > 0)) return { q, lines: ['Needs your cash and your spending a month.'] };
    return { q, lines: [`About ${qsMos(cash / spend)} with no pay coming in.`, `${money(cash)} in cash / ${money(spend)} a month.`] };
  }
  if (kind === 'keep') {
    if (take === null || spend === null) return { q, lines: ['Needs what comes in and what goes out a month.'] };
    return { q, lines: [`${money(take - spend)} a month, ${take > 0 ? qsPct((take - spend) / take) : '0%'} of what comes in.`, `${money(take)} in, ${money(spend)} out.`] };
  }
  const M = (f.moves || []).map(m => m.t);
  return { q, lines: M.length ? [M[0], ...M.slice(1).map(t => `Then: ${t}`)] : f.nextStep ? [`Your next step: ${f.nextStep}.`] : ['No weak spot shows in these numbers. Keep the rhythm going.'] };
}
// The library: topics with the words they match.
export const QS_TOPICS = [
  ['cushion', 'A cash cushion', ['cushion', 'emergency', 'savings', 'cash', 'ahead']],
  ['debt', 'Paying off debt', ['debt', 'interest', 'loan', 'minimum', 'pay off']],
  ['invest', 'Investing', ['invest', 'fund', 'index', 'stock', 'portfolio']],
  ['tax', 'Taxes', ['tax', 'roth', 'deduct', 'ira']],
  ['retire', 'Retiring', ['retire', 'withdraw', 'social security', 'pension']],
  ['insure', 'Insurance', ['insur', 'deductible', 'coverage', 'will']],
  ['earn', 'Earning more', ['raise', 'salary', 'negotiat', 'income', 'pay']],
  ['mind', 'Money and feelings', ['feel', 'enough', 'compar', 'belief', 'habit']],
];
// skills: [{ id, name, text }] (the caller flattens its library). The three skills that match the topic best: two points
// for a word in the name, one for a word in the text; ties keep the library's order.
export function qsLearn(topic, skills = [], n = 3) {
  const T = QS_TOPICS.find(t => t[0] === topic);
  if (!T) return [];
  const hits = (s, w) => String(s || '').toLowerCase().split(w).length - 1;
  return skills.map((s, i) => ({ ...s, i, score: T[2].reduce((a, w) => a + 2 * hits(s.name, w) + hits(s.text, w), 0) }))
    .filter(s => s.score > 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, n).map(({ i, ...s }) => s);
}

// ---------- path packs ----------
// Guided routes through the skills: the ids are the game's skill ids (tree:index in data/skills.js).
export const QS_PACKS = [
  { id: 'cushion', name: 'Build the cushion', why: 'A cushion turns a surprise into a bill, not a crisis.', steps: ['cash-safety-net:0', 'cash-safety-net:1', 'cash-safety-net:2', 'cash-safety-net:4', 'cash-safety-net:3', 'financial-ops-tooling:1'] },
  { id: 'debt', name: 'Out of costly debt', why: 'Every dollar of interest you stop paying is a dollar that works for you.', steps: ['debt-leverage:0', 'debt-leverage:1', 'debt-leverage:2', 'debt-leverage:3', 'debt-leverage:4', 'debt-leverage:5', 'credit-cards:0', 'debt-leverage:9'] },
  { id: 'invest', name: 'Start investing', why: 'Money that grows on its own does the long work for you.', steps: ['main-path:2', 'main-path:0', 'main-path:1', 'main-path:3', 'main-path:4', 'main-path:5'] },
  { id: 'protect', name: 'Cover the big risks', why: 'One bad day should not undo years of work.', steps: ['insurance-protection:0', 'insurance-protection:1', 'insurance-protection:3', 'insurance-protection:4', 'insurance-protection:5', 'insurance-protection:10'] },
  { id: 'calm', name: 'Money without the knot', why: 'How you feel about money steers what you do with it.', steps: ['money-psychology:0', 'money-psychology:2', 'money-psychology:3', 'money-psychology:5', 'money-psychology:7', 'money-psychology:12'] },
  { id: 'long', name: 'The long game', why: 'Milestones keep the boring middle moving.', steps: ['the-long-game:0', 'the-long-game:2', 'the-long-game:3', 'the-long-game:5', 'the-long-game:6', 'the-long-game:8'] },
];
// done: the ids done (an array). The pack's count, its percent and the next step.
export function qsPack(pack, done = []) {
  if (!pack) return null;
  const D = new Set(done), n = pack.steps.filter(s => D.has(s)).length;
  return { id: pack.id, done: n, total: pack.steps.length, pct: Math.round((n / pack.steps.length) * 100), next: pack.steps.find(s => !D.has(s)) || null, finished: n === pack.steps.length };
}
// The pack that fits now: the cushion under a month, then costly debt, then the cushion under the steady mark, then
// a missing protection, then investing.
export function qsPackFit(x = {}) {
  const cm = qsNum(x.cushionMonths);
  if (cm !== null && cm < 1) return 'cushion';
  if (qsNum(x.hiDebt) > 0) return 'debt';
  if (cm !== null && cm < QS_RULES.cushionOk) return 'cushion';
  if (qsNum(x.protMax) > 0 && qsNum(x.protDone) < qsNum(x.protMax)) return 'protect';
  return 'invest';
}

// ---------- graduating: the win state and your story ----------
export const QS_FINISH = ['debt', 'k100', 'coast', 'fi'];
// stages: the journey's stages as tpJourney returns them ({ id, name, done, pct }). finish: the stage you call your
// finish line (FI when none is tapped).
export function qsGraduate(stages = [], finish = 'fi') {
  const id = QS_FINISH.includes(finish) ? finish : 'fi', S = stages.find(s => s.id === id);
  if (!S) return { ready: false, finish: id };
  return { ready: S.done !== null, finish: id, name: S.name, done: S.done === true, pct: S.pct == null ? null : Math.round(Math.min(1, S.pct) * 100), left: S.left ?? null };
}
// hist: the game's snapshots [{ d, nw, cash, debt, inv }], oldest first. stages: TP_STAGES with their targets in today's
// numbers (x.targets: { coast, fi }). x.read: the money read's part (snGradStory), shown only when x.showRead.
export function qsStory(hist = [], stages = [], x = {}, money = qsMoney0) {
  const H = hist.filter(h => h && h.d), T = x.targets || {}, out = [];
  if (!H.length) return { chapters: [], read: [], readHidden: false };
  const first = H[0];
  out.push({ d: first.d, t: `You started in ${qsMonth(first.d)} with ${money(first.nw)} of net worth.` });
  const meets = (s, h) => {
    const t = s.target === 'coast' ? qsNum(T.coast) : s.target === 'fi' ? qsNum(T.fi) : s.target;
    if (t === null) return null;
    const v = { worth: h.nw, cash: h.cash, debt: h.debt, invested: h.inv }[s.measure];
    if (!qsHas(v)) return null;
    return s.measure === 'debt' ? v <= 0 : v >= t;
  };
  for (const s of stages) {
    if (meets(s, first) === true) { out.push({ d: first.d, t: `You had already passed ${s.name} at the start.` }); continue; }
    const at = H.find(h => meets(s, h) === true);
    if (at) out.push({ d: at.d, t: `${qsMonth(at.d)}: ${s.name}. ${s.what}.` });
  }
  const last = H[H.length - 1];
  if (last !== first) out.push({ d: last.d, t: `${qsMonth(last.d)}: ${money(last.nw)} of net worth, ${money(last.nw - first.nw)} more than at the start.` });
  if (qsNum(x.recalc) > 0) out.push({ d: null, t: `The plan recalculated ${x.recalc} ${x.recalc === 1 ? 'time' : 'times'}, and you kept going.` });
  const R = Array.isArray(x.read) ? x.read : [];
  return { chapters: out, read: x.showRead ? R : [], readHidden: !x.showRead && R.length > 0 };
}
