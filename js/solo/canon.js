// SPDX-License-Identifier: AGPL-3.0-only
// The canon pack (Run 5): eight small calculators, each one rule the personal finance canon repeats, on the plan's own
// numbers and at the plan's own pace. One page each (years, coast, dollar, car, worth, wage, split, home .html), all
// drawn by js/solo/calc.js from the specs below. The math is in js/solo.js with tests; whose idea each one is, is in
// its fold. No verdict words: a rule of thumb is a line someone drew, shown next to your number.
import { calcPage } from './calc.js';
import { homeCostCards } from './homecost.js';
import { money } from './shell.js';
import { QUICK_SPECS } from './quick.js'; // the quick calculators (run Not built, groups 1 to 5, Part 2), drawn the same way
import { GIG_SPECS } from './gig.js'; // working for yourself (run Not built, groups 1 to 5, Part 5), drawn the same way
import { FW_SPECS } from './canonfw.js'; // Eli's frameworks and the canon (run Not built, groups 1 to 5, Part 4), drawn the same way
import { FAMILY_SPECS } from './family.js'; // family money (run Not built, groups 1 to 5, Part 8), drawn the same way
import { OWN_SPECS } from './ownpath.js'; // your own path, private pages (run Not built, groups 1 to 5, Part 6), drawn the same way
import { workYearsOf, coastOf, COAST_AGES, dollarLaterOf, carFitsOf, CAR_RATES, expectedWorthOf, realWageOf, splitOf, homeFitsOf } from '../solo.js';

const pct = (v, d = 0) => `${+(v * 100).toFixed(d)}%`, yrs = v => (v == null ? 'more than 70 years' : `${v < 10 ? v.toFixed(1) : Math.round(v)} years`), big = v => money(Math.round(v));
const x1 = v => `${+v.toFixed(1)}x`, cents = v => `$${v.toFixed(2)}`;
const AGES = [22, 25, 30, 35, 40, 45, 50, 55, 60], PAY = [3000, 4000, 5000, 6500, 8000, 10000], GROSS_MONTH = [3500, 5000, 6500, 8000, 10000, 12500], GROSS_YEAR = [40000, 60000, 80000, 100000, 150000, 200000];
const age = (label = 'Your age') => ({ key: 'age', label, options: AGES.map(a => [String(a), a]) });
const paceWords = R => `In today's dollars, at ${pct(R.realReturn, 1)} a year after inflation${R.withdrawalRate ? ` and taking out ${pct(R.withdrawalRate, 1)} a year` : ''}, the same as the whole plan.`;

const SPECS = {
  years: {
    title: 'How many working years is my savings rate?', why: 'The share of your pay you keep decides how long you have to work, more than the size of the paycheck does. Two numbers show yours.',
    fields: [{ key: 'takeHome', plan: 'takeHome', label: 'What lands in your account in a month', picks: PAY, help: 'After taxes. A rough number is enough.' }, { key: 'spending', plan: 'spending', label: 'What you spend in a month, all in', picks: [2000, 3000, 4000, 5000, 6500], help: 'Everything, debt payments included.' }],
    run: (v, ref) => workYearsOf({ ...v, ref }),
    answer: R => (R.none
      ? { lead: 'Right now you keep', big: big(R.kept), line: `${money(R.spending)} goes out and ${money(R.takeHome)} comes in, so nothing is left to grow yet. The first dollar kept each month is what starts the clock.`, rows: R.ladder.slice(0, 3).map(l => [`Keeping ${pct(l.rate)}`, null, yrs(l.years)]), small: paceWords(R) }
      : { lead: `Keeping ${pct(R.rate)} of your pay, from $0, work is optional in about`, big: yrs(R.years), line: `You keep ${money(R.kept)} of every ${money(R.takeHome)}. ${R.gain != null ? `Keeping ${money(Math.round(R.moreAMonth))} more a month (${pct(R.up)}) makes it ${yrs(R.yearsUp)}: ${R.gain.toFixed(1)} years sooner.` : ''}`,
        rows: R.ladder.map(l => [`Keeping ${pct(l.rate)}`, `At the table's 5%: ${yrs(l.printed)}`, yrs(l.years)]), small: `${paceWords(R)} Starting from $0, so anything you already have invested makes yours shorter.`,
        fold: [['Whose idea this is, and why the numbers differ from the famous table', 'Mr. Money Mustache\'s "The Shockingly Simple Math Behind Early Retirement" (2012) printed this table at 5% growth after inflation and a 4% withdrawal rate: about 51 years at 10%, 32 at 25%, 17 at 50%, 7 at 75%. The "at the table\'s 5%" line under each row is that table, worked out again from the same two numbers, so it can land a year off the printed one.', 'Jacob Lund Fisker made the same point in Early Retirement Extreme: each step up in savings rate cuts more years than the last.', 'Your column uses the plan\'s return instead of 5%, which is why it comes out shorter. Change the return in the whole plan and this follows.']] }),
  },
  coast: {
    title: 'Could I stop saving and still get there?', why: 'There is an amount that, left alone, grows into enough by itself. Past it, you only have to cover today\'s bills. Three numbers show how close you are.',
    fields: [{ key: 'invested', plan: 'invested', label: 'What you have invested today', picks: [0, 10000, 50000, 150000, 400000], help: 'Retirement accounts and brokerage, added up. $0 is an answer.' }, { key: 'spending', plan: 'spending', label: 'What you spend in a month, all in', picks: [2000, 3000, 4000, 5000, 6500] }, age()],
    picks: [{ key: 'retireAge', label: 'Get there by age', start: 65, options: COAST_AGES.map(a => [String(a), a]) }],
    run: (v, ref) => coastOf({ ...v, ref }),
    answer: R => ({ lead: R.there ? `You are past it. Left alone, what you have grows by ${R.retireAge} to` : `To stop adding and still get there by ${R.retireAge}, you would need invested today`, big: big(R.there ? R.grown : R.coast),
      line: R.there ? `Your ${money(R.invested)} is more than the ${big(R.coast)} it takes. Every dollar you add from here brings the date earlier or the life bigger.` : `You have ${money(R.invested)}, which is ${pct(Math.min(1, R.share))} of the way. ${big(R.gap)} more and the rest takes care of itself.`,
      rows: [['Your full number', `${money(R.spending)} a month for good`, big(R.fi)], [`What you have, left alone for ${R.years} years`, null, big(R.grown)]], small: paceWords(R),
      fold: [['Whose idea this is', 'Coast FI is a FIRE community idea: once growth alone will carry you, work only has to pay for today. It is very sensitive to the return, so look at it at a lower one too before you lean on it.', 'The full number is the 4% rule read backwards: a year of spending divided by the share you take out each year.']] }),
  },
  dollar: {
    title: 'What is a dollar today worth at 65?', why: 'Money you invest young has decades to grow, so it is worth far more than its face. One tap shows how much.',
    fields: [age()], picks: [{ key: 'amount', label: 'Show it for', start: 100, options: [1, 100, 1000, 10000].map(a => [money(a), a]) }],
    run: (v, ref) => dollarLaterOf({ ...v, ref }),
    answer: R => ({ lead: `${money(R.amount)} invested today, at ${R.age}, is at 65 about`, big: big(R.grown), line: `Each dollar becomes ${cents(R.times)} over ${R.years} years. The same dollar spent today costs that much of your 65-year-old self's money.`,
      rows: R.byAge.map(a => [`A dollar invested at ${a.age}`, null, cents(a.times)]), small: paceWords(R),
      fold: [['Whose idea this is, and how this differs', 'The Money Guy Show (Brian Preston and Bo Hanson) calls this the wealth multiplier. Their table uses their own return for each age, higher when you are young.', 'Here every year grows by the plan\'s one return, after inflation, so the answer is in today\'s dollars and matches the rest of your plan.']] }),
  },
  car: {
    title: 'How much car fits my pay?', why: 'A car loan is the easiest place to overspend without noticing. One rule of thumb turns your pay into a price.',
    fields: [{ key: 'grossMonthly', label: 'Your pay in a month, before taxes', picks: GROSS_MONTH, help: 'The top line of a pay stub, in a month. Yearly salary divided by 12.' }, { key: 'price', label: 'A price you are looking at', picks: [10000, 18000, 25000, 35000, 50000], help: 'Leave it empty to see the most that fits.', optional: true }],
    picks: [{ key: 'apr', label: 'Loan rate', start: 0.07, options: CAR_RATES.map(r => [pct(r), r]) }],
    run: v => carFitsOf(v),
    answer: R => ({ lead: R.price ? `A ${money(R.price)} car, with 20% down over 3 years, is a payment of` : 'By the 20/3/8 rule, the most car that fits is about', big: R.price ? `${big(R.payment)} a month` : big(R.maxPrice),
      line: R.price ? (R.fits ? `That is ${pct(R.share, 1)} of your pay before taxes, inside the 8% line (${big(R.maxPayment)}). It needs ${big(R.down)} down.` : `That is ${pct(R.share, 1)} of your pay before taxes. The 8% line is ${big(R.maxPayment)} a month, which is a car of about ${big(R.maxPrice)}, or this car on pay of ${big(R.payFor)} a month.`)
        : `8% of ${money(R.grossMonthly)} is a payment of ${big(R.maxPayment)}. Over 3 years at ${pct(R.apr)} that carries a ${big(R.maxLoan)} loan, and with 20% down (${big(R.maxDown)}) a car of ${big(R.maxPrice)}.`,
      rows: [['20% down', null, big(R.price ? R.down : R.maxDown)], ['Paid off in', null, '3 years'], ['8% of pay before taxes', null, `${big(R.maxPayment)} a month`]],
      fold: [['Whose idea this is', 'The 20/3/8 rule is The Money Guy Show\'s: put 20% down, pay it off in 3 years or less, and keep the payment at 8% of pay before taxes or less. They say paying cash is better still, and that luxury cars follow a stricter rule.', 'It is a line, not a law. A reliable car you need for work can be worth stretching it; the number is here so the choice is made with it in view.']] }),
  },
  worth: {
    title: 'Is my net worth keeping up with my pay?', why: 'A famous formula says what someone your age, on your pay, would have kept if they were steadily building. Three numbers put yours next to it.',
    fields: [age(), { key: 'grossYear', label: 'Your pay in a year, before taxes', picks: GROSS_YEAR, help: 'Everyone in the household, added up.' }, { key: 'netWorth', label: 'Everything you have, minus everything you owe', picks: [0, 25000, 100000, 250000, 500000, 1000000], help: 'If you owe more than you have, put $0: the formula only measures building.' }],
    run: v => expectedWorthOf(v),
    answer: R => ({ lead: `The book's formula puts someone ${R.age}, earning ${money(R.grossYear)}, at`, big: big(R.expected), line: `You have ${x1(R.ratio)} that. ${R.young ? `Under 40 the formula runs hard, because you have had little time: the version adjusted for your age puts the mark at ${big(R.adjusted)}, and you have ${x1(R.adjustedRatio)} that.` : `Twice the mark, ${big(R.twice)}, is what the book calls a prodigious accumulator of wealth.`}`,
      rows: [['The book: age × pay ÷ 10', null, big(R.expected)], ['Twice that', 'the book\'s "prodigious accumulator"', big(R.twice)], ...(R.young ? [[`Adjusted for ${R.age}: age × pay ÷ ${10 + R.toForty}`, null, big(R.adjusted)], ['Twice that', null, big(R.adjustedTwice)]] : [])],
      fold: [['Whose idea this is, and where it bends', 'The formula is from The Millionaire Next Door by Thomas Stanley and William Danko: multiply your age by your household\'s pay before taxes and divide by ten. Inherited money is left out.', 'It was drawn from people in mid-career, so it asks a lot of anyone in their twenties and of anyone whose pay just jumped. The Money Guy Show adjusts it for people under 40 by dividing by ten plus the years until 40, and that is the second line here.', 'It measures one thing: how much of what you earned you kept. It says nothing about whether you are happy with how you spent the rest.']] }),
  },
  wage: {
    title: 'What do I really make an hour?', why: 'A job takes more hours than it pays for, and costs money to hold. Your real wage is what every hour of your life actually trades for.',
    fields: [{ key: 'takeHome', plan: 'takeHome', label: 'What lands in your account in a month', picks: PAY, help: 'After taxes.' }, { key: 'hoursWeek', label: 'Hours you work in a normal week', options: [20, 30, 40, 45, 50, 60].map(a => [String(a), a]) }, { key: 'commuteWeek', label: 'Hours a week getting there and back, and getting ready', start: 0, options: [0, 2, 5, 8, 10, 15].map(a => [String(a), a]), help: 'Both directions, the whole week. Working from home is 0.' }, { key: 'costs', label: 'What the job costs you in a month', picks: [0, 50, 150, 300, 500], start: 0, help: 'Commuting, work clothes, lunches out, anything you only pay because of the job.', optional: true }],
    run: v => realWageOf(v),
    answer: R => ({ lead: 'Every hour your job takes pays you', big: cents(R.real), line: `On paper it is ${cents(R.stated)} an hour. Counting ${Math.round(R.hours)} hours a month and ${money(R.costs)} of costs, it is ${pct(R.share)} of that.${R.hoursPer100 ? ` Something that costs $100 costs you ${R.hoursPer100.toFixed(1)} hours.` : ''}`,
      rows: [['On paper', 'take-home over paid hours', cents(R.stated)], ['For real', 'less costs, over every hour', cents(R.real)]],
      fold: [['Whose idea this is', 'The real hourly wage is step 2 of Your Money or Your Life, by Vicki Robin and Joe Dominguez: money is something you trade your life energy for, so know the true rate of the trade.', 'A lower real wage is not a reason to quit. It is the number to hold a purchase against: this costs that many hours of my life.']] }),
  },
  split: {
    title: 'Where does each dollar go?', why: 'One simple split, half to needs, some to wants, the rest kept, is the most quoted budget there is. Three numbers show how yours compares.',
    fields: [{ key: 'takeHome', plan: 'takeHome', label: 'What lands in your account in a month', picks: PAY, help: 'After taxes.' }, { key: 'needs', label: 'Needs in a month', picks: v => (v.takeHome > 0 ? [0.4, 0.5, 0.6, 0.7, 0.8].map(s => Math.round(v.takeHome * s / 50) * 50) : [1500, 2500, 3500, 4500]), help: 'Home, food, getting around, bills, insurance, minimum debt payments.' }, { key: 'wants', label: 'Wants in a month', picks: v => (v.takeHome > 0 ? [0.1, 0.2, 0.3, 0.4].map(s => Math.round(v.takeHome * s / 50) * 50) : [300, 600, 1000, 1500]), help: 'Eating out, trips, hobbies, upgrades: what you could stop and still be fine.' }],
    run: v => splitOf(v),
    answer: R => ({ lead: 'Of every dollar that lands, needs take', big: pct(R.shares.needs), line: `Wants take ${pct(R.shares.wants)} and ${R.left >= 0 ? `${pct(R.shares.left)} is kept (${money(R.left)} a month)` : `${money(-R.left)} more goes out than comes in`}. The 50/30/20 split of ${money(R.takeHome)} would be ${big(R.marks.needs)}, ${big(R.marks.wants)} and ${big(R.marks.left)}.`,
      rows: [['Needs', `the rule's line is 50%: ${big(R.marks.needs)}`, `${money(R.needs)} · ${pct(R.shares.needs)}`], ['Wants', `the rule's line is 30%: ${big(R.marks.wants)}`, `${money(R.wants)} · ${pct(R.shares.wants)}`], ['Kept, or paying debt down faster', `the rule's line is 20%: ${big(R.marks.left)}`, `${money(R.left)} · ${pct(R.shares.left)}`]],
      fold: [['Whose idea this is, and where it bends', 'The 50/30/20 rule is from All Your Worth by Elizabeth Warren and Amelia Warren Tyagi. It works on take-home pay.', 'Where rent is high or pay is low, needs run past half for almost everyone, and that is the place you live talking, not something you did. People aiming to stop work early usually keep far more than 20%.']] }),
  },
  home: {
    title: 'How much home would a lender say fits?', why: 'Lenders start from two lines drawn on your pay before taxes. Two numbers show where they land for you, before you ever talk to one.',
    fields: [{ key: 'grossMonthly', label: 'Your pay in a month, before taxes', picks: GROSS_MONTH, help: 'Everyone on the loan, added up. Yearly salary divided by 12.' }, { key: 'otherDebt', label: 'Your other debt payments in a month', picks: [0, 200, 400, 700, 1000, 1500], start: 0, help: 'Car, student loans, card minimums. Not rent.', optional: true }],
    run: v => homeFitsOf(v),
    more: api => homeCostCards(api), // run of Nov 25 2026, Part 2: the bank's payment, the true cost of owning and renting, the breakeven year
    answer: R => ({ lead: 'The usual lines put your whole home payment at up to', big: `${big(R.payment)} a month`, line: R.payment > 0 ? `${R.by === 'front' ? `That is the 28% line. The 36% line, after your ${money(R.otherDebt)} of other payments, would allow ${big(R.back)}.` : `Your ${money(R.otherDebt)} of other payments make the 36% line the tighter one. With none, the 28% line would allow ${big(R.front)}.`} At ${pct(R.rate, 2)} over ${R.years} years it carries a loan of about ${big(R.loan)}.` : `Your other payments already take the 36% line, so on these lines there is no room for a home payment yet. Clearing ${big(Math.max(1, R.otherDebt - R.backLine * R.grossMonthly))} a month of them opens it.`,
      rows: [['28% of pay before taxes', 'the home payment by itself', `${big(R.front)} a month`], ['36% of pay, less other debts', 'every payment together', `${big(R.back)} a month`], ['The loan that payment carries', `${pct(R.taxIns)} of the payment set aside for taxes and insurance`, big(R.loan)]],
      small: 'The home payment here means the loan, property taxes and insurance together. A down payment comes on top of the loan.',
      fold: [['Whose rule this is, and what it leaves out', 'The 28/36 rule is the starting point conventional lenders use. Many approve above 36%, and some loan types draw the lines elsewhere, so a lender may offer you more.', 'What a lender will lend and what fits your life are different numbers. This one ignores what you want left over each month. The whole plan answers that one.']] }),
  },
};
const id = document.documentElement.dataset.tool, ALL = { ...SPECS, ...QUICK_SPECS, ...GIG_SPECS, ...FW_SPECS, ...FAMILY_SPECS, ...OWN_SPECS };
if (ALL[id]) calcPage(id, ALL[id]);
export { SPECS };
