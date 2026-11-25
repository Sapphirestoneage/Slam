// SPDX-License-Identifier: AGPL-3.0-only
// Eli's frameworks and the canon as small calculators (run "Not built, groups 1 to 5", Part 4), drawn by
// js/solo/calc.js like the canon pack: the SWAN number (swan.html), the Trust Framework (trust.html), the net worth
// peak (peak.html), 0% tax in early retirement (zerotax.html) and every dollar you have earned, step 1a of Your Money
// or Your Life (earned.html). The math is js/math/frameworks.js (one file with the game), with tests.
import { money } from './shell.js';
import { fwSwan, FW_SWAN_MONTHS, fwTrust, fwTrustWords, FW_TRUST, fwPeak, fwZeroTax, fwLifetime } from '../math/frameworks.js';
import { fwZeroLines, FW_FILING } from '../math/frameworks-plan.js';

const big = v => money(Math.round(v)), pct = v => `${Math.round(v * 100)}%`;
const AGES = [25, 30, 35, 40, 45, 50, 55, 60];
const SPEND = [2000, 3000, 4000, 5000, 6500];

export const FW_SPECS = {
  swan: {
    title: 'How much cash lets me sleep at night?', why: 'Some cash is not about a rule. It is the amount that lets you stop checking the balance. Two taps give your number.',
    fields: [{ key: 'spending', plan: 'spending', label: 'What you must spend in a month', picks: SPEND, help: 'Rent, food, bills, minimum payments. The must-pay part is enough.' },
      { key: 'months', label: 'Months of that which would let you sleep', options: FW_SWAN_MONTHS.map(m => [String(m), m]) },
      { key: 'worry', label: 'One big bill you worry about', picks: [0, 500, 1000, 2500, 5000], start: 0, optional: true, help: 'A car repair, a deductible, a trip home. $0 if none.' },
      { key: 'cash', label: 'Cash you have today', picks: [0, 1000, 5000, 10000, 25000], optional: true, help: 'Checking and savings. Leave it empty to see only the number.' }],
    run: v => fwSwan({ monthly: v.spending, months: v.months, worry: v.worry, cash: v.cash }),
    answer: R => ({ lead: 'Your sleep-at-night number', big: big(R.number),
      line: R.have == null ? `${R.months} ${R.months === 1 ? 'month' : 'months'} of ${money(R.monthly)}${R.worry ? `, plus ${money(R.worry)} for the bill you worry about` : ''}.` : R.gap > 0 ? `You have ${money(R.have)}, ${pct(R.share)} of it. ${big(R.gap)} more and you are there.` : `You have ${money(R.have)}: your number is covered, with ${big(R.have - R.number)} on top.`,
      rows: [[`${R.months} ${R.months === 1 ? 'month' : 'months'} of what you must spend`, null, big(R.monthly * R.months)], ['The bill you worry about', null, big(R.worry)], ['Your number', null, big(R.number)]],
      fold: [['Whose idea this is', 'SWAN stands for sleep well at night. Eli\'s SWAN number is the cash that lets you stop worrying, set by you. It can be more than a rule of thumb says, and that is fine: calm has a price, and you choose it.', 'In the whole plan it is your sleep-at-night number, on Net worth, Cash layers.']] }),
  },
  trust: {
    title: 'Should I trust this money advice?', why: 'Before you follow a tip, a post or an advisor, three questions. Tap an answer to each.',
    fields: FW_TRUST.map(t => ({ key: t.id, label: t.q, options: t.opts.map(([v, l]) => [l, v]) })),
    waiting: 'Tap an answer to each question and the read appears.',
    run: v => { const T = fwTrust(v); return { ...T, ready: T.ready }; },
    answer: R => ({ lead: 'Questions that check out', big: `${R.ok} of ${R.total}`, line: fwTrustWords(R),
      rows: R.rows.map((r, i) => [FW_TRUST[i].q, r.ok ? null : `Ask: ${r.ask}`, r.ok ? 'Checks out' : 'Ask first']),
      fold: [['Whose idea this is', 'The Trust Framework is Eli\'s: has the person done it, what do they gain, does it fit you. Advice can be true and still not be right for you now.', 'When the gain is a share of your money, the fees decide a lot. In the game, the Fee X-ray shows what a fee costs over the years.']] }),
  },
  peak: {
    title: 'When should my net worth peak?', why: 'Saving forever leaves money you never got to use. There is an age when what you have can pay for the rest of your life. From there, spending down is the plan.',
    fields: [{ key: 'age', label: 'Your age', options: AGES.map(a => [String(a), a]) },
      { key: 'worth', label: 'Everything you have, minus everything you owe', picks: [0, 50000, 150000, 400000, 800000], help: 'Leave out the home you live in if you will keep it.' },
      { key: 'save', label: 'What you add to it in a month', picks: [0, 500, 1000, 2000, 4000], help: 'Saving and investing together.' },
      { key: 'spending', plan: 'spending', label: 'What a month of life will cost then', picks: SPEND, help: 'In today\'s dollars.' }],
    picks: [{ key: 'endAge', label: 'Plan to have it last until', start: 90, options: [85, 90, 95, 100].map(a => [String(a), a]) }, { key: 'leave', label: 'Leave to others at the end', start: 0, options: [0, 100000, 250000, 500000].map(a => [a ? money(a) : 'Nothing', a]) }],
    run: (v, ref) => ({ ...fwPeak({ age: v.age, worth: v.worth, saveYear: v.save == null ? null : v.save * 12, growth: ref.presets.realReturn.default, spendYear: v.spending == null ? null : v.spending * 12, endAge: v.endAge, leave: v.leave }), growth: ref.presets.realReturn.default, endAge: v.endAge }),
    answer: R => (R.peakAge == null
      ? { lead: 'On these numbers the money does not reach a peak before', big: String(R.endAge), line: 'It never grows enough to pay the rest of your life by itself. Adding a little more a month, or a later last age, moves it in.', small: `At ${pct(R.growth)} a year after inflation, the plan's own pace.` }
      : { lead: R.now ? 'You are at the peak now: what you have can pay for the rest of your life from' : 'Your net worth peaks at about age', big: String(R.peakAge), line: R.now ? `${big(R.peak)} can pay about ${big(R.canSpend)} a year until ${R.endAge}. Spending down is the plan from here.` : `In about ${R.years} years, at about ${big(R.peak)}. From then it can pay about ${big(R.canSpend)} a year until ${R.endAge}, so saving more past that age is money you may never use.`,
        rows: R.path.filter((p, i, a) => i === 0 || i === a.length - 1 || (p.age % 5 === 0)).map(p => [`At ${p.age}`, null, big(p.worth)]), small: `At ${pct(R.growth)} a year after inflation, the plan's own pace.`,
        fold: [['Whose idea this is', 'Bill Perkins, Die With Zero (2020): money is for living, so plan the year your net worth stops growing and you start using it on purpose.', 'The yearly amount is the same spend-down rule as "Die With Zero spend-down" in Compare the ways: what brings the money to what you leave, at the last age, if the return held.']] }),
  },
  zerotax: {
    title: 'How much can I take out with $0 federal tax?', why: 'Once work is optional, you choose your income each year. Shaped well, it can owe no federal income tax at all.',
    fields: [{ key: 'filing', label: 'How you file', options: FW_FILING.map(([k, l]) => [l, k]) },
      { key: 'spending', plan: 'spending', label: 'What you will spend in a month', picks: SPEND },
      { key: 'ordinary', label: 'Other income in a year: a part-time job, a Roth move, interest', picks: [0, 10000, 20000, 30000], start: 0, optional: true },
      { key: 'gainShare', label: 'Of each dollar you sell, the share that is gain', options: [['25%', 0.25], ['50%', 0.5], ['75%', 0.75], ['All of it', 1]], help: 'A fund bought long ago is mostly gain. One bought last year is mostly what you paid.' }],
    run: (v, ref) => { const L = fwZeroLines(ref, v.filing || 'single'); return v.filing && v.gainShare ? fwZeroTax({ ...L, ordinary: v.ordinary, gainShare: v.gainShare, spend: v.spending == null ? null : v.spending * 12 }) : { ready: false }; },
    answer: R => ({ lead: 'A year you could live on with $0 federal income tax', big: big(R.reach),
      line: R.over > 0 ? `Your other income is ${big(R.over)} over the standard deduction, so that part is taxed. Below it, it is free.` : R.fits == null ? '' : R.fits ? `Your ${big(R.spend)} a year of spending fits inside it.` : `Your spending is ${big(R.short)} a year more than fits at 0%. A Roth IRA or cash covers the rest with no tax either.`,
      rows: [['The standard deduction', 'other income here pays 0%', big(R.std)], ['The 0% band for long-term gains', 'taxable income up to this', big(R.gainTop)], ['Gains you can take at 0%', null, big(R.gainRoom)], [`What you sell to get them, at ${pct(R.gainShare)} gain`, null, big(R.saleCash)]],
      small: 'Federal income tax only, 2026. Your state may tax it, and all of it counts as income for health insurance help.',
      fold: [['Whose idea this is', 'Jeremy Jacobson writes at Go Curry Cracker about early retirees who pay $0 in federal income tax by filling the brackets that charge 0% on purpose, every year.', 'The standard deduction and the band come from the plan\'s own 2026 tax tables (the IRS numbers for tax year 2026).']] }),
  },
  earned: {
    title: 'How much have I earned in my life?', why: 'Step 1 of Your Money or Your Life: add up every dollar you have earned. Most people are surprised, both by the total and by what is left of it.',
    fields: [{ key: 'years', label: 'Years you have worked', options: [1, 3, 5, 10, 15, 20, 30, 40].map(a => [String(a), a]) },
      { key: 'pay', label: 'Your pay in an average year, before taxes', picks: [20000, 35000, 50000, 75000, 100000] , help: 'Over all those years. A rough number is fine.' },
      { key: 'hours', label: 'Hours a week you worked', options: [20, 30, 40, 45, 50, 60].map(a => [String(a), a]), optional: true }],
    run: v => fwLifetime([{ years: v.years, pay: v.pay, hours: v.hours }]),
    answer: R => ({ lead: 'Every dollar you have earned, about', big: big(R.total), line: R.hours != null ? `That took about ${Math.round(R.hours).toLocaleString('en-US')} hours of your life: ${money(Math.round(R.perHour * 100) / 100)} an hour before taxes.` : `Over ${R.years} years.`,
      small: 'Next, the book asks what you have to show for it: your net worth today.',
      fold: [['Whose idea this is', 'Your Money or Your Life by Vicki Robin and Joe Dominguez, step 1: making peace with the past. The total is not a grade. It is the start of seeing money as hours of your life.']] }),
  },
};
