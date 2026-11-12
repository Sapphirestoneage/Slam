// SPDX-License-Identifier: AGPL-3.0-only
// The self-serve journey (start.html): someone with no FIRE background answers their age, then five numbers, and has a
// plan they can tune. Nothing here is new math: it reads the same household file as the coach app and asks the engines
// already tested in js/math (the age-only plan M9A, the ranges M9R, metrics, the FOO, the ladder) for their results,
// then puts them in the order a person meets them. Pure: no DOM, never saves on its own (the store does).
//
// The promise this file keeps: a number is asked once. Every question reads what is already on file (Fast Track's own
// reader), so a number typed here shows in the coach app and a number typed there is never asked again here.
import { metrics, ageOf } from './math/metrics.js';
import { agePlanOf, answeredOf, filledOf, CORE, planWordsOf } from './math/agestart.js';
import { ladderOf } from './math/ladder.js';
import { foo } from './math/foo.js';
import { simpleMath } from './math/simple.js';
import { baristaFiNumber } from './math/fi.js';
import { fastTrackAnswers, applyFastTrack } from './fasttrack.js';
import { fmt } from './math/result.js';
import { RULES } from './registry/assumptions.js';

export const STAGES = [
  { id: 'you', label: 'You', needs: null },
  { id: 'numbers', label: 'Your numbers', needs: 'age' },
  { id: 'plan', label: 'Your plan', needs: 'age' },
  { id: 'tune', label: 'Tune it', needs: 'age' },
  { id: 'all', label: 'All your numbers', needs: 'age' },
  { id: 'credits', label: 'Credits', needs: null },
];

// The five questions, in Fast Track's order. boxes: what is typed (one box, or a few on one screen). max: the slider's
// top. none: the one-tap answer for "I have none of this".
export const QUESTIONS = [
  { key: 'income', title: 'How much lands in your bank account each month?', help: 'Your pay after taxes. A rough number is fine.', boxes: [{ id: 'takeHome', label: 'Take-home pay a month' }], max: 15000, step: 100, none: null },
  { key: 'spending', title: 'About how much do you spend in a month?', help: 'Everything: rent, food, fun, debt payments. Your gut number is fine.', boxes: [{ id: 'gut', label: 'Spending a month' }], max: 12000, step: 100, none: null },
  { key: 'cash', title: 'How much is in checking and savings?', help: 'What you could get to this week.', boxes: [{ id: 'checking', label: 'Checking' }, { id: 'savings', label: 'Savings' }], max: 50000, step: 500, none: 'Close to nothing' },
  { key: 'invested', title: 'How much do you have invested?', help: 'Every account together: 401(k), IRA, brokerage.', boxes: [{ id: 'invested', label: 'Invested, all accounts' }], max: 300000, step: 1000, none: 'Nothing yet' },
  { key: 'card', title: 'Do you owe anything?', help: 'What you owe today on each. Leave a box empty if you have none of it.', boxes: [{ id: 'Credit card', label: 'Credit cards' }, { id: 'Student loan', label: 'Student loans' }, { id: 'Personal loan', label: 'Other debts' }], max: 60000, step: 500, none: 'No debt' },
];
const has = v => v !== null && v !== undefined && v !== '';
const num = v => (has(v) && Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : null);

// Where someone is: { hasAge, age, answered: { income: bool, ... }, count, total, next (the first question not yet
// answered, or null), done }.
export function progressOf(doc, ref, { now = new Date() } = {}) {
  const age = ageOf(doc.profile || {}, now);
  const answered = answeredOf(doc, ref);
  const count = QUESTIONS.filter(q => answered[q.key]).length;
  return { hasAge: age != null, age, answered, count, total: QUESTIONS.length, next: QUESTIONS.find(q => !answered[q.key])?.key ?? null, done: age != null && count === QUESTIONS.length };
}

// What is already on file for a question's boxes, so it is shown, not asked again: { boxId: number or null }.
export function onFile(doc, key) {
  const a = fastTrackAnswers(doc);
  if (key === 'income') return { takeHome: a.takePer === 'month' || !has(a.takeHome) ? a.takeHome : null };
  if (key === 'spending') return { gut: a.gut };
  if (key === 'cash') return { checking: a.checking, savings: a.savings };
  if (key === 'invested') return { invested: a.invested };
  return Object.fromEntries(QUESTIONS.find(q => q.key === 'card').boxes.map(b => [b.id, a.debts[b.id]?.rows ? a.debts[b.id].balance : a.noDebts ? 0 : null]));
}

// Save one question's boxes through Fast Track (one undo step, the same records every screen reads). An empty box on a
// screen with several boxes counts as $0 once any box, or the none button, is answered. Returns false when nothing was
// typed (nothing is saved).
export function answer(store, key, values, { none = false } = {}) {
  const q = QUESTIONS.find(x => x.key === key);
  const v = Object.fromEntries(q.boxes.map(b => [b.id, none ? 0 : num(values?.[b.id])]));
  if (!none && q.boxes.every(b => v[b.id] === null)) return false;
  const z = id => v[id] ?? 0;
  if (key === 'income') applyFastTrack(store, { takeHome: v.takeHome, takePer: 'month' });
  else if (key === 'spending') applyFastTrack(store, { gut: v.gut });
  else if (key === 'cash') applyFastTrack(store, { checking: z('checking'), savings: z('savings') });
  else if (key === 'invested') applyFastTrack(store, { invested: z('invested') });
  else {
    const owed = q.boxes.filter(b => z(b.id) > 0);
    applyFastTrack(store, { noDebts: owed.length === 0, debts: Object.fromEntries(q.boxes.filter(b => z(b.id) > 0 || onFile(store.doc, 'card')[b.id] != null).map(b => [b.id, { balance: z(b.id) }])) });
  }
  return true;
}

// One-tap amounts for a question, from what is typical at this age (rounded so they read as amounts, not statistics).
export function quickPicks(plan, key) {
  const p = plan?.priors?.find(x => x.key === key);
  if (!p) return [];
  // The pay prior is a year of gross pay; the engine's own tax math already turned its likely into take-home a month.
  const monthly = key === 'income' ? (plan.m?.inputs?.takeHome && p.likely ? plan.m.inputs.takeHome / p.likely : 0) : 1;
  const round = v => { const s = v >= 20000 ? 5000 : v >= 5000 ? 1000 : v >= 1000 ? 500 : 100; return Math.round(v / s) * s; };
  return [...new Set([p.low, p.likely, p.high].map(v => round(v * monthly)).filter(v => v > 0))];
}

// The ladder's rows in a reader's words (the registry's own lines are written for a coach).
const PLAIN = {
  littleE: ['little e: small emergencies covered', '$1,000 set aside, or your highest deductible if that is smaller'],
  heavy25: ['A quarter of your high-interest debt paid', 'The first big dent'],
  heavy50: ['Half of your high-interest debt paid', 'Halfway there'],
  heavy75: ['Three quarters of your high-interest debt paid', 'Nearly gone'],
  heavyFree: ['High-interest debt gone', 'Nothing left at a high rate'],
  consumerFree: ['All cards and personal debt gone', 'Cards, personal loans and the like at $0'],
  bigE: ['big e: a job loss covered', 'The Rule of 5: your age divided by 5, in months of spending'],
  nwZero: ['Net worth above zero', 'You own more than you owe'],
  qq: ['Quiet Quitting FI', 'Enough invested that the yearly minimum alone gets you to FI'],
  coast: ['Coast FI', 'Enough invested that you could stop adding and still get there'],
  nw100k: ['Your first $100k', 'Six figures of net worth'],
  fi: ['FI: work becomes optional', '25 times what you spend in a year'],
  fat: ['Fat FI', 'FI with half again as much room to spend'],
  lean: ['Lean FI', 'FI on needs only: food, housing and transportation'],
};
const dateAt = (months, now) => new Date(now.getFullYear(), now.getMonth() + Math.round(months), 1);
export const monthWords = (months, now = new Date()) => (months == null || !Number.isFinite(months) ? null : months <= 0 ? 'Now' : dateAt(months, now).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
export function spanWords(months) {
  const m = Math.abs(Math.round(months)), y = Math.floor(m / 12), r = m % 12;
  return [y ? `${y} year${y === 1 ? '' : 's'}` : null, r || !y ? `${r} month${r === 1 ? '' : 's'}` : null].filter(Boolean).join(' ');
}

// Everything the plan screen shows, from the household as it stands. With blanks left, each blank is filled by what is
// typical at this age (never saved), and the plan says so. Null with no age.
export function planOf(doc, ref, priors, { flags = [], now = new Date() } = {}) {
  const P = agePlanOf(doc, ref, priors, { now });
  if (!P) return null;
  const F = filledOf(doc, ref, priors, { now });
  const m = metrics(F.doc, ref, { now });
  const basis = P.typical === 0 ? 'yours' : P.answered.length === 0 ? 'typical' : 'mixed';
  const fiMonths = m.monthsToFi.value;
  const fi = { words: P.words.fi, months: fiMonths, date: monthWords(fiMonths, now), age: fiMonths == null ? null : Math.floor(P.age + fiMonths / 12), far: fiMonths != null && fiMonths >= RULES.maxMonths, range: P.ranges.fi };
  const width = P.width.fi;
  // The next step: the FOO's "here", in its own headline words.
  const Fo = foo(F.doc, ref, { now, flags });
  const here = Fo.steps.find(s => s.id === Fo.here) ?? null;
  const next = here ? { id: here.id, name: here.name, status: here.status, date: monthWords(here.months, now), left: here.left ?? null, progress: here.progress ?? null, note: here.note ?? null } : null;
  const steps = Fo.steps.filter(s => !['Off', 'Locked', 'Optional'].includes(s.status)).map(s => ({ id: s.id, name: s.name, status: s.id === Fo.here ? 'You are here' : s.status }));
  // Milestones: the ladder's steps and markers that apply, soonest first, done ones on top.
  const L = ladderOf(F.doc, ref, { now, flags });
  const rows = [...L.steps.map(s => ({ ...s, reached: s.done })), ...L.markers].filter(r => r.applies !== false && (r.reached || r.months != null));
  // One debt marker at a time: the next quarter not yet reached, then debt free (three quarter lines in a row read as noise).
  const quarter = rows.find(r => /^heavy(25|50|75)$/.test(r.id) && !r.reached)?.id ?? null;
  const milestones = rows.filter(r => !/^heavy(25|50|75)$/.test(r.id) || r.id === quarter).map(r => ({ id: r.id, name: PLAIN[r.id]?.[0] ?? r.name, what: PLAIN[r.id]?.[1] ?? r.what, done: !!r.reached, months: r.reached ? 0 : r.months, date: r.reached ? 'Done' : monthWords(r.months, now), pct: r.pct ?? null, have: r.have ?? null, target: r.target ?? null }))
    .sort((a, b) => (a.done === b.done ? a.months - b.months : a.done ? -1 : 1));
  return { basis, label: P.label, age: P.age, answered: P.answered, typical: P.typical, priors: P.priors, next: P.next, words: P.words, fi, widthMonths: width, step: next, steps, milestones, wins: milestones.filter(x => x.done).length, m, filled: F.doc };
}

// The words for how much one answer moved the plan: "Your FI range went from 2049 or later to 2045 to 2058." Null when
// nothing a person would notice changed.
export function movedWords(before, after) {
  if (!before || !after) return null;
  const parts = [];
  const open = /^Past /.test(after.words.fi ?? ''); // one half of the picture (pay with typical spending, or the reverse) can read as never: say what comes next instead
  if (open && after.typical > 0) parts.push('Saved. The next answer fills in the other half of the picture.');
  else if (before.words.fi !== after.words.fi) parts.push(`Your FI range went from ${before.words.fi} to ${after.words.fi}.`);
  else if (before.words.debtFree !== after.words.debtFree) parts.push(`Debt free went from ${before.words.debtFree} to ${after.words.debtFree}.`);
  else if (before.words.surplus !== after.words.surplus) parts.push(`What is left each month is now ${after.words.surplus}.`);
  if (after.typical === 0 && before.typical > 0) parts.push('Every number in your plan is now yours.');
  return parts.length ? parts.join(' ') : null;
}

// Every number, grouped, each with its value in words, how it is worked out (the engine's own sentence), what it still
// needs (the question keys to answer), and the idea it comes from (js/registry/credits.js). The plan's filled household
// is read, so a number resting on a typical amount says so (typical: true).
const NEED_Q = [[/take-home|income|pay/i, 'income'], [/spending/i, 'spending'], [/cash|checking|savings/i, 'cash'], [/invested|investment/i, 'invested'], [/debt|card|loan/i, 'card']];
const askFor = list => [...new Set((list || []).map(n => NEED_Q.find(([re]) => re.test(n))?.[1]).filter(Boolean))];
export function numbersOf(plan, doc, ref, { now = new Date() } = {}) {
  const m = plan.m, x = m.inputs, answered = new Set(plan.answered);
  const rests = (...keys) => keys.some(k => !answered.has(k));
  const R = (id, group, label, r, idea, uses, show = v => fmt.money(v)) => ({ id, group, label, idea, value: r?.value == null ? null : show(r.value), text: r?.text ?? null, ask: r?.value == null ? askFor(r?.needs) : [], typical: rests(...uses) });
  const months = v => `${(Math.round(v * 10) / 10).toFixed(1)} months`;
  const when = v => `${monthWords(v, now)} (${spanWords(v)})`;
  const simple = simpleMath({ savingsRate: m.savingsRate.value, realReturn: x.realReturn, withdrawalRate: x.withdrawalRate });
  const mile = id => plan.milestones.find(r => r.id === id);
  const little = mile('littleE');
  const target = (id, label, idea, uses, row = mile(id)) => ({ id, group: 'Independence', label, idea, value: row ? row.date : null, text: row?.what ?? null, ask: [], typical: rests(...uses) });
  const debtFree = plan.milestones.find(r => r.id === 'consumerFree');
  const barista = baristaFiNumber({ annualSpending: m.annualSpending, partTimeIncome: 12000, withdrawalRate: x.withdrawalRate });
  const all = ['income', 'spending', 'cash', 'invested', 'card'];
  return [
    R('surplus', 'Each month', 'Left over each month', m.surplus, null, ['income', 'spending']),
    R('savingsRate', 'Each month', 'Savings rate', m.savingsRate, 'savingsRate', ['income', 'spending'], v => fmt.pct(v)),
    R('simpleYears', 'Each month', 'Working years left at this savings rate', simple, 'simpleMath', ['income', 'spending'], v => `${Math.round(v)} years`),
    R('hourly', 'Each month', 'What an hour of your work earns', m.hourly, 'realWage', ['income'], v => `${fmt.money(v, { cents: true })} an hour`),
    R('runway', 'Safety', 'How long your cash lasts', m.runwayMonths, null, ['cash', 'spending'], months),
    { id: 'littleE', group: 'Safety', label: 'little e (small emergencies)', idea: 'starterFund', value: little ? (little.done ? `Covered (${fmt.money(little.target ?? 0)})` : `${fmt.money(little.have ?? 0)} of ${fmt.money(little.target ?? 0)}`) : null, text: 'Covers a plumbing-size emergency: $1,000 or your highest deductible, whichever is smaller.', ask: little ? [] : ['cash'], typical: rests('cash') },
    R('ruleOf5', 'Safety', 'big e (losing a job), by the Rule of 5', m.ruleOf5, 'ruleOf5', ['spending']),
    R('netWorth', 'What you have', 'Net worth', m.netWorth, null, ['cash', 'invested', 'card']),
    R('liquid', 'What you have', 'Net worth you can reach', m.liquidNetWorth, null, ['cash', 'card']),
    { id: 'debtFree', group: 'What you have', label: 'Debt free (cards and other consumer debt)', idea: 'avalanche', value: debtFree ? debtFree.date : x.debts.length ? null : 'No debt', text: debtFree?.what ?? 'Nothing owed.', ask: [], typical: rests('card', 'income', 'spending') },
    R('fiNumber', 'Independence', 'Your FI number', m.fiNumber, 'fiNumber', ['spending']),
    R('fiDate', 'Independence', 'Work becomes optional', m.monthsToFi, 'indexReturns', all, when),
    R('coastFi', 'Independence', 'Coast FI number', m.coastFi, 'coastFi', ['spending']),
    target('coast', 'Coast FI reached', 'coastFi', all),
    target('qq', 'Quiet Quitting FI reached', 'quietQuitting', all),
    target('fat', 'Fat FI reached', 'flavors', all),
    R('barista', 'Independence', 'Barista FI number (with $1,000 a month of part-time pay)', barista, 'flavors', ['spending']),
    target('nw100k', 'Your first $100k', 'first100k', all),
  ];
}

// The toggles. Each writes a field the coach app already has (Plan, Assumptions and Debt payoff), so nothing is new on
// file. options: { value, label, note }; the first value in ref.presets marked default is the app's own default.
export function tweaksOf(doc, ref) {
  const a = doc.assumptions || {}, P = ref.presets;
  const pct = v => `${+(v * 100).toFixed(1)}%`;
  return [
    { id: 'realReturn', part: 'assumptions', label: 'How fast investments grow', help: 'A year, after inflation.', idea: 'indexReturns', value: a.realReturn ?? P.realReturn.default, base: P.realReturn.default,
      options: P.realReturn.values.map(v => ({ value: v, label: pct(v), note: P.realReturn.labels?.[String(v)] ?? null })) },
    { id: 'withdrawalRate', part: 'assumptions', label: 'How much you take out each year', help: 'Lower is safer and needs a bigger number.', idea: 'fourPercent', value: a.withdrawalRate ?? P.withdrawalRate.default, base: P.withdrawalRate.default,
      options: P.withdrawalRate.values.map(v => ({ value: v, label: pct(v), note: { 0.03: 'Extra safe, for a very long retirement', 0.04: 'The classic 4% rule', 0.047: "Bengen's update", 0.052: 'Hopeful' }[v] ?? null })) },
    { id: 'investSurplus', part: 'assumptions', label: 'What happens to money left over', help: 'Invested, or sitting in checking.', idea: 'indexReturns', value: !(a.investSurplus === false || a.investSurplus === 0), base: true,
      options: [{ value: true, label: 'Invest it', note: 'Default' }, { value: false, label: 'It sits in checking', note: null }] },
    { id: 'debtOrder', part: 'settings', show: (doc.records || []).filter(r => r.kind === 'debt' && (r.values?.balance ?? 0) > 0).length > 1, label: 'Which debt gets paid first', help: 'With more than one debt, the order changes the interest you pay.', idea: 'avalanche', value: doc.settings?.debtOrder ?? 'avalanche', base: 'avalanche',
      options: [{ value: 'avalanche', label: 'Highest rate first', note: 'Avalanche: least interest' }, { value: 'snowball', label: 'Smallest balance first', note: 'Snowball: quick wins' }] },
    { id: 'fiAge', part: 'assumptions', shows: 'coast', label: 'The latest you want work to be optional', help: 'Sets your Coast FI number.', idea: 'coastFi', value: a.fiAge ?? null, base: null,
      options: [50, 55, 60, 65].map(v => ({ value: v, label: `Age ${v}`, note: null })) },
  ];
}
export function setTweak(store, tweak, value) { store.setDoc(tweak.part, { [tweak.id]: value }); }
export function resetTweaks(store, ref) {
  store.transaction('Back to the defaults', () => {
    store.setDoc('assumptions', { realReturn: ref.presets.realReturn.default, withdrawalRate: ref.presets.withdrawalRate.default, investSurplus: true });
    store.setDoc('settings', { debtOrder: 'avalanche' });
  });
}

// What one option would do, without saving it: the FI date with that option on a copy of the household.
export function previewTweak(doc, ref, priors, tweak, value, { now = new Date() } = {}) {
  const copy = { ...doc, [tweak.part]: { ...(doc[tweak.part] || {}), [tweak.id]: value } };
  const F = filledOf(copy, ref, priors, { now });
  const m = F ? metrics(F.doc, ref, { now }) : null, mo = m?.monthsToFi.value ?? null;
  if (tweak.shows === 'coast') return { months: mo, date: m?.coastFi.value != null ? `Coast at ${fmt.money(Math.round(m.coastFi.value / 100) * 100)}` : null };
  return { months: mo, date: mo != null && mo < RULES.maxMonths ? monthWords(mo, now) : mo != null ? 'Very far off' : null };
}

// Try it: spend less or earn more each month, on a copy (never saved). { before, after, date, moved (months sooner) }.
export function whatIf(doc, ref, priors, { spendLess = 0, earnMore = 0 } = {}, { now = new Date() } = {}) {
  const F = filledOf(doc, ref, priors, { now });
  if (!F) return null;
  const m0 = metrics(F.doc, ref, { now }), x = m0.inputs;
  const sf = x.spending ? Math.max(0, x.spending - spendLess) / x.spending : 1, inf = x.takeHome ? (x.takeHome + earnMore) / x.takeHome : 1;
  const scale = r => (r.kind === 'income' && has(r.amount) ? { ...r, amount: r.amount * inf } : (r.kind === 'spending' || r.kind === 'bill') && has(r.amount) ? { ...r, amount: r.amount * sf } : r);
  const m1 = metrics({ ...F.doc, records: F.doc.records.map(scale) }, ref, { now });
  const b = m0.monthsToFi.value, a = m1.monthsToFi.value;
  return { before: b, after: a, beforeDate: monthWords(b, now), date: monthWords(a, now), moved: b != null && a != null ? b - a : null, surplus: m1.surplus.value };
}

export { CORE, planWordsOf };
