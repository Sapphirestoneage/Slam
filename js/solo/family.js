// SPDX-License-Identifier: AGPL-3.0-only
// Family money (run Not built, groups 1 to 5, Part 8): three small pages drawn by the one renderer (js/solo/calc.js),
// from specs like the quick calculators'. sandwich.html (money to parents and kids at once, next to your own FI date),
// boomerang.html (living at home: the rent saved next to the time to a moving-out goal) and tuition.html (kids and
// tuition: childcare from a dated source, school or yeshiva tuition, a 529 and the New York rules). The math is in
// js/math/family.js (M8F), with tests, and the game's sheet "Family money" calls the same functions
// (game/core/family.js is its copy). These specs only say what to ask and how to say the answer. Amounts the app cannot
// source (what a parent needs, a school's tuition outside the community presets, childcare outside New York) are the
// person's own taps.
import { h, money } from './shell.js';
import { metrics } from '../math/metrics.js';
import { fiMoveOf } from '../math/fi.js';
import { crDayWords } from '../math/career.js';
import { fmSandwich, fmBoomerang, fmSchool, fmCareRow, fmPresetRows, FM_KINDS, FM_SOURCES } from '../math/family.js';
import { FM_COMMUNITY } from '../data/community-tuition.js';

const pct = v => `${Math.round(v * 100)}%`, big = v => money(Math.round(v));
const opt = (list, f = String) => list.map(v => [f(v), v]);
const yrs = v => `${v} ${v === 1 ? 'year' : 'years'}`, mos = v => (v >= 24 && v % 12 === 0 ? yrs(v / 12) : `${v} ${v === 1 ? 'month' : 'months'}`);
const HOW_LONG = [['1 year', 1], ['3 years', 3], ['5 years', 5], ['10 years', 10], ['No end in sight', 0]];
const LEVEL = { key: 'level', label: 'Where these numbers come from', options: [['A guess', 'Guess'], ['A quote or a bill', 'Close'], ['Statements', 'Exact']], start: 'Guess' };
const levelWords = V => ({ Guess: 'A guess for now: it firms up as quotes and bills come in.', Close: 'Close: from a quote or a bill.', Exact: 'Exact: from your own statements.' }[V.level] ?? '');
const rules = ref => ({ childcare: ref?.childcare, ny529: ref?.limits?.ny529 });
const presets = () => fmPresetRows(FM_COMMUNITY);

// The sandwich years, next to the plan's own FI date (M53 through fiMoveOf, the same as career.html and trip.html).
function sandwichFi(api) {
  const mem = api.mine(), get = key => mem[`sandwich_${key}`] ?? null;
  const R = fmSandwich({ parents: get('parents'), kids: get('kids'), parentsYears: get('parentsYears'), kidsYears: get('kidsYears'), inSpending: get('inSpending') ?? false });
  if (!R.ready) return [];
  let M = null; try { M = metrics(api.store.doc, api.ref, { now: new Date() }); } catch { M = null; }
  const F = R.inSpending ? null : fiMoveOf(M, { changes: R.flows }, { from: new Date() });
  const body = R.inSpending
    ? 'This money is already in your spending, so your FI date has it in already. Nothing moves.'
    : F == null
      ? 'Your FI date shows here once the whole plan has your take-home, your spending and what you have invested. "All the steps" below asks for them.'
      : F.never
        ? 'With this much going to family for these years, your investments do not reach your FI number on this path. Recalculating: a shorter stretch, a smaller amount, or a later FI age each bring a date back.'
        : `Your FI date moves ${crDayWords(F.days)}, with this money in for the years you tapped. When a stretch ends, that money goes back to your own goals.`;
  return [h('div.st-card', { id: 'sandwich-fi' }, h('h2', { style: { marginTop: 0 } }, 'Your own FI date, with them in it'), h('p', { style: { marginBottom: 0 } }, body))];
}

export const FAMILY_SPECS = {
  sandwich: {
    title: 'Money to my parents and my kids at the same time', why: 'Helping the people above you and below you at once is a lot to carry. Seeing it as one number, for as long as each part lasts, next to your own goals, makes it something you can plan.',
    waiting: 'Tap what goes to your parents and to your kids a month. $0 is an answer for either one.',
    fields: [{ key: 'parents', label: 'To your parents, a month', picks: [0, 200, 500, 1000, 2000], help: 'Cash, a bill you pay for them, their rent, care or help at home.' },
      { key: 'parentsYears', label: 'For how long', options: HOW_LONG, start: 0, when: v => v.parents > 0 },
      { key: 'kids', label: 'To your kids, a month', picks: [0, 300, 600, 1200, 2500], help: 'Childcare, tuition, help for a grown child. Kids and tuition works out school years.' },
      { key: 'kidsYears', label: 'For how long', options: HOW_LONG, start: 0, when: v => v.kids > 0 },
      { key: 'inSpending', label: 'Is it already in your monthly spending?', options: [['Already in it', true], ['On top of it', false]], start: false },
      { key: 'takeHome', plan: 'takeHome', label: 'What lands in your account in a month', picks: [3000, 4000, 5000, 6500, 8000, 10000], optional: true, help: 'After taxes. With your spending, it shows what is left for your own goals.' },
      { key: 'spending', plan: 'spending', label: 'What you spend in a month, all in', picks: [2000, 3000, 4000, 5000, 6500], optional: true }],
    picks: [LEVEL],
    run: v => fmSandwich(v),
    answer: (R, V) => ({ lead: 'To the people you care for, a month', big: big(R.peak), line: `${R.parents ? `${big(R.parents)} to your parents` : ''}${R.parents && R.kids ? ' and ' : ''}${R.kids ? `${big(R.kids)} to your kids` : ''}: ${big(R.year)} a year.${R.both ? ` Both at once for ${mos(R.both)}.` : ''}${R.leftAfter != null ? (R.leftAfter >= 0 ? ` After it, ${big(R.leftAfter)} a month is left for your own goals.` : ` It is ${big(-R.leftAfter)} a month more than is left after spending. Recalculating: the plan shows which line can give, and the date that comes with it.`) : ''}`,
      rows: [...R.sides.filter(s => s.monthly > 0).map(s => [s.id === 'parents' ? 'Your parents' : 'Your kids', s.years ? `for ${yrs(s.years)}` : 'no end in sight yet', s.total != null ? big(s.total) : `${big(s.monthly)} a month`]),
        R.all != null ? ['All of it, over the years', null, big(R.all)] : null, R.share != null ? ['Of what is left each month', null, pct(R.share)] : null].filter(Boolean),
      small: `${levelWords(V)} In today's dollars.`,
      fold: [['Things that can lighten it', 'Siblings or other family can share a parent\'s part: a written split, even a rough one, keeps it calm.', 'For a parent 60 or older, the local Area Agency on Aging says which help near them they can apply for. The Eldercare Locator, a free service of the US Administration for Community Living, finds it: eldercare.acl.gov (checked November 25, 2026).', 'Many planners keep your own retirement saving going through these years: there are loans for school, and none for retirement.']] }),
    more: api => sandwichFi(api),
  },
  boomerang: {
    title: 'Living at home: what it saves, and for how long', why: 'Living with family for a while can be the fastest way to a place of your own. The rent you do not pay, put away, has a date when it is enough.',
    waiting: 'Tap the rent of a place of your own and how long you plan to stay.',
    fields: [{ key: 'rent', label: 'A place of your own would cost, a month', picks: [1000, 1500, 2000, 2500, 3000], help: 'Rent only. "My first apartment" works out the rest of what it takes to move in.' },
      { key: 'payHome', label: 'What you pay at home, a month', picks: [0, 200, 400, 700, 1000], start: 0, help: '$0 is an answer.' },
      { key: 'savePct', label: 'Of the rent saved, what goes to savings', options: [['All of it', 1], ['Most of it', 0.75], ['Half', 0.5], ['A quarter', 0.25]], start: 1 },
      { key: 'months', label: 'How long you plan to stay', options: opt([6, 12, 18, 24, 36], mos) },
      { key: 'target', label: 'Your moving-out goal', picks: [3000, 6000, 10000, 20000, 50000], optional: true, help: 'The cash to get the keys (deposit, first month, the move), or a down payment.' },
      { key: 'have', label: 'Saved toward it already', picks: [0, 1000, 3000, 5000], start: 0, optional: true },
      { key: 'homeCost', label: 'What the household spends more with you home, a month', picks: [0, 150, 300, 500], optional: true, help: 'Food and utilities. For the talk with your family.' }],
    picks: [LEVEL],
    run: v => fmBoomerang(v),
    answer: (R, V) => ({ lead: 'Living at home puts away, a month', big: big(R.saving), line: R.target == null
      ? `${big(R.saved)} of rent not paid${R.savePct < 1 ? `, ${pct(R.savePct)} of it saved` : ''}. Over ${mos(R.months)} that is ${big(R.byPlan)} saved. Add a moving-out goal to see its date.`
      : R.never ? `Nothing goes to savings at this split, so the goal of ${big(R.target)} has no date yet. Recalculating: a bigger share saved brings one.`
        : R.reach === 0 ? `You already have the ${big(R.target)} for your goal.` : R.extra > 0 ? `Your goal of ${big(R.target)} is there in ${mos(R.reach)}, ${mos(R.extra)} after the ${mos(R.months)} you planned. ${big(R.perMonthFor)} a month gets there in the time you planned.`
          : `Your goal of ${big(R.target)} is there in ${mos(R.reach)}${R.spare ? `, ${mos(R.spare)} before the ${mos(R.months)} you planned` : ', right when you planned'}.`,
    rows: [['Rent not paid, a month', `${big(R.rent)} less the ${big(R.payHome)} you pay at home`, big(R.saved)], ['Saved by the end of the stay', mos(R.months), big(R.byPlan)],
      R.household != null ? ['The household\'s side, a month', R.household >= 0 ? 'what it spends more, less what you pay' : 'what you pay is more than it spends', big(R.household)] : null].filter(Boolean),
    small: `${levelWords(V)} In today's dollars, before any interest the savings earn.`,
    fold: [['A plan with your family', 'Write down three things with the date: what you pay a month, what you do around the house, and the month you move out. A date written down makes it a plan, not a question.', 'If the goal moves later, say so early and agree on the new month together.']] }),
  },
  tuition: {
    title: 'Kids and tuition: childcare, school, yeshiva, a 529', why: 'Childcare and school are years of the same bill. A year, times the children, times the years, shows the whole of it, and what to put away a month before it starts.',
    waiting: 'Tap what it is for, the cost of a year and how many years.',
    fields: [{ key: 'kind', label: 'What it is for', options: FM_KINDS.map(k => [k.name, k.id]) },
      { key: 'state', label: 'Where you live', options: [['New York', 'NY'], ['Another state', 'other']], start: 'NY', when: v => v.kind === 'care' },
      { key: 'careAge', label: 'The age of care', options: [['Infant', 'infant'], ['Toddler', 'toddler']], start: 'infant', when: v => v.kind === 'care' && v.state === 'NY' },
      { key: 'yearly', label: 'A year, for one child', optional: true,
        picks: (v, ref) => { const row = v.kind === 'care' ? fmCareRow(rules(ref).childcare, v.state, v.careAge) : null; const P = v.kind === 'yeshiva' ? presets().flatMap(r => [r.low, r.high]) : [];
          return row ? [row.yearly, 10000, 15000, 25000] : P.length ? [...new Set(P)] : v.kind === 'college' ? [10000, 25000, 40000, 60000, 85000] : [5000, 10000, 15000, 20000, 30000]; },
        help: (v, ref) => { if (v.kind === 'care') { const row = fmCareRow(rules(ref).childcare, v.state, v.careAge); return row ? `The first amount is the ${row.dataYear} median for a center in New York State. Left empty, the page uses it. ${FM_SOURCES.care}` : FM_SOURCES.careNone; }
          if (v.kind === 'yeshiva') return presets().length ? `The amounts are the community presets: ${presets().map(r => `${r.label} ${money(r.low)} to ${money(r.high)}`).join('; ')}. Your school's own tuition sheet is the exact number.` : 'Your school\'s tuition sheet has the number for each grade. With more than one child, a sibling discount makes the year lower: use the number after it.';
          return v.kind === 'college' ? 'Tuition, fees, room and board, after grants. The school\'s net price calculator shows it.' : 'The school\'s tuition sheet, after any discount or help.'; } },
      { key: 'kids', label: 'How many children', options: opt([1, 2, 3, 4, 5, 6]), start: 1 },
      { key: 'years', label: 'How many years', options: opt([1, 2, 3, 4, 5, 9, 13], yrs) },
      { key: 'startIn', label: 'When it starts', options: [['Now', 0], ['In 1 year', 1], ['In 3 years', 3], ['In 5 years', 5], ['In 10 years', 10], ['In 15 years', 15]], start: 0 },
      { key: 'share', label: 'Put away ahead of time', options: [['All of it', 1], ['Half', 0.5], ['None, pay as it comes', 0]], start: 0.5, when: v => v.startIn > 0 },
      { key: 'rise', label: 'How fast it goes up', options: [['With prices', 0], ['1% a year faster', 0.01], ['3% a year faster', 0.03]], start: 0, help: 'The school\'s last few tuition sheets show how fast it has moved.' },
      { key: 'have', label: 'Saved for it already', picks: [0, 5000, 10000, 25000], start: 0, optional: true },
      { key: 'plan529', label: 'A New York 529', options: [['No 529', 'none'], ['Yes, I file single', 'single'], ['Yes, we file jointly', 'joint']], start: 'none', when: v => v.kind && v.kind !== 'care' && v.startIn > 0 },
      { key: 'nyRate', label: 'Your top New York tax rate', options: [['4%', 0.04], ['5%', 0.05], ['6%', 0.06], ['7%', 0.07]], when: v => v.plan529 && v.plan529 !== 'none' && v.kind !== 'care' && v.startIn > 0, help: 'Your last New York return shows it. The deduction is worth the deducted amount times this rate.' }],
    picks: [LEVEL],
    run: (v, ref) => fmSchool({ ...v, ret: ref.presets.realReturn.default, rules: rules(ref) }),
    answer: (R, V) => ({ lead: `${R.kind.name}, ${R.kids} ${R.kids === 1 ? 'child' : 'children'}, ${yrs(R.years)}`, big: big(R.total),
      line: `The first year is ${big(R.first)} (${big(R.firstMonth)} a month).${R.fromRow ? ` That is the ${R.row.dataYear} New York median for a center; put in a quote near you to make it yours.` : ''}${R.now ? (R.have ? ` ${big(R.covered)} of it is saved; ${big(R.payGo)} a month is left to pay as it comes.` : '') : R.monthly != null && R.share > 0 ? ` Put away ${big(R.monthly)} a month from now until it starts, and ${big(R.payGo)} a month is left to pay as it comes.` : ` Paid as it comes, that is ${big(R.payGo)} a month during those years.`}`,
      rows: [['A year, for one child', null, big(R.yearly)], ['The first year, all the children', null, big(R.first)], [`All ${yrs(R.years)}`, R.rise ? `going up ${pct(R.rise)} a year faster than prices` : 'in today\'s dollars', big(R.total)],
        R.monthly != null && R.share > 0 ? ['Put away a month until it starts', `${pct(R.share)} of it, growing at the plan's return`, big(R.monthly)] : null,
        ['Left to pay as it comes, a month', 'during the years it runs', big(R.payGo)],
        R.p529 ? ['New York 529 deduction a year', R.p529.recapture ? 'New York takes it back if the money pays K-12 tuition' : R.p529.saved != null ? `${big(R.p529.deducted)} deducted at ${pct(R.p529.rate)}` : 'tap your New York rate', R.p529.saved != null ? big(R.p529.saved) : big(R.p529.deducted)] : null].filter(Boolean),
      small: `${levelWords(V)}${R.kind.id === 'college' ? '' : ' Grants, scholarships and sibling discounts make it lower: use the number after them.'}`,
      fold: [R.kind.id === 'care' ? ['Where the childcare number comes from', R.row ? FM_SOURCES.care : FM_SOURCES.careNone, 'The child and dependent care credit and a dependent care FSA at work both lower what childcare costs you.'] : null,
        R.p529 ? ['The New York 529', FM_SOURCES.ny529, ...(R.p529.over ? [`What goes in above ${big(R.p529.limit)} a year still grows tax free; only the first ${big(R.p529.limit)} comes off New York income.`] : [])] : null,
        R.kind.k12 ? ['A 529 for K-12 tuition in New York', FM_SOURCES.k12, 'So for yeshiva or day school in New York, a 529 is a place for college money, and tuition is a goal of its own.'] : null,
        R.kind.id === 'yeshiva' ? ['Make it a goal', 'In the whole plan: About you › Your community, then Plan › Goals › Yeshiva tuition, with this year\'s amount and the month it starts. In the game: Menu › Family money.'] : null].filter(Boolean) }),
  },
};
// The family shelf, in the order the hub shows it.
export const FAMILY_SHELF = [['sandwich', 'Money to my parents and kids at once'], ['boomerang', 'Living at home: what it saves'], ['tuition', 'Kids and tuition: childcare, school, a 529']];
