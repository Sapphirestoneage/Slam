// SPDX-License-Identifier: AGPL-3.0-only
// The quick calculators (run Not built, groups 1 to 5, Part 2): more small pages drawn by the one renderer
// (js/solo/calc.js), from specs like the canon pack's. The math is in js/math/quick.js and js/math/quickplan.js (M8Q),
// with tests; these specs only say what to ask and how to say the answer. Amounts the app cannot source (what a child,
// a pet or an apartment costs where you live, how fast your own prices moved) are the person's own taps.
import { money } from './shell.js';
import { qcHysa, qcDca, qcNominal, qcWarranty, qcPerUse, qcHassle, qcWorth, qcInflation, qcStart, qcKids, qcPet, qcApartment, qcUiNy, qcBenefitRunway } from '../math/quick.js';
import { qcConsolidate, qcLeave, qcRoommates, qcW4, qcGlance, QC_SPLIT } from '../math/quickplan.js';

const pct = (v, d = 0) => `${+(v * 100).toFixed(d)}%`, big = v => money(Math.round(v)), cents = v => `$${v.toFixed(2)}`;
const opt = (list, f = String) => list.map(v => [f(v), v]);
const rates = list => opt(list, v => pct(v, v < 0.01 && v > 0 ? 2 : 1));
const months = v => (v == null ? 'a long time' : v >= 24 ? `${(v / 12).toFixed(1)} years` : `${v.toFixed(1)} months`);
const hrs = v => `${v} ${v === 1 ? 'hour' : 'hours'}`;
const AGES = [22, 25, 30, 35, 40, 45, 50, 55];
const PAY = [3000, 4000, 5000, 6500, 8000, 10000], SPEND = [2000, 3000, 4000, 5000, 6500];
const planReal = ref => ref.presets.realReturn.default, planInfl = ref => ref.presets.inflation.default;
const realWords = r => `Growth at the plan's ${pct(r, 1)} a year after inflation, so every amount is in today's dollars.`;
const W4_SMALL = 'Federal income tax only, with the standard deduction. State tax, other income and other credits are not in it; the IRS Tax Withholding Estimator covers those.';
const W4_FOLD = [['How the W-4 line is worked out', 'Short: the gap divided by the paychecks left goes on Step 4(c), as extra withholding each paycheck.', 'Over: payroll spreads a Step 4(b) deduction across the whole year, so the amount there is the refund times paychecks a year, over paychecks left times your top rate. A paycheck cannot hold back less than nothing, so when the refund is more than the paychecks left withhold, the rest still comes at tax time. Change it back in January, or keep it if next year looks the same.', 'Hand the new W-4 to payroll; it takes effect on the next paycheck or two.']];
const hourly = { key: 'wage', label: 'What an hour of your work pays you', picks: [15, 20, 30, 45, 60, 90], help: 'Take-home over the hours the job really takes. "What do I really make an hour?" works it out.' };

export const QUICK_SPECS = {
  hysa: {
    title: 'What would a high-yield savings account pay me?', why: 'Savings that sit at a rate near zero earn close to nothing. Two rates show what the same money earns somewhere else.',
    fields: [{ key: 'balance', label: 'What is in savings now', picks: [1000, 5000, 10000, 25000, 50000], help: 'The account you would move.' },
      { key: 'fromRate', label: 'The rate it earns now (APY)', options: rates([0.0001, 0.001, 0.005, 0.01, 0.02]), help: 'Your bank shows it on the account page or statement.' },
      { key: 'toRate', label: 'The rate the other account pays (APY)', options: rates([0.03, 0.035, 0.04, 0.045, 0.05]), help: 'Tap the one you were offered. These rates move with the Fed, so check the day you switch.' },
      { key: 'monthly', label: 'What you add a month', picks: [0, 100, 250, 500, 1000], start: 0, optional: true, help: '$0 is an answer.' }],
    run: v => qcHysa(v),
    answer: R => ({ lead: 'In a year, moving it earns about', big: `${big(R.yearGain)} more`, line: `That is ${big(R.yearTo)} of interest at ${pct(R.toRate, 2)} next to ${big(R.yearFrom)} at ${pct(R.fromRate, 2)}, about ${big(R.monthGain)} a month. Over ${R.years} years it adds up to ${big(R.gain)}.`,
      rows: [[`Where it is, after ${R.years} years`, `${pct(R.fromRate, 2)} a year, added monthly`, big(R.endFrom)], [`In the other account, after ${R.years} years`, `${pct(R.toRate, 2)} a year, added monthly`, big(R.endTo)]],
      small: 'Before tax: interest counts as income on your tax return. Rates change, so the years after the first are a sketch.',
      fold: [['What to check before you move it', 'The account is FDIC insured (or NCUA at a credit union), up to the limit for each owner and bank.', 'No monthly fee and no minimum you would fall under. A fee of a few dollars a month can eat the difference on a small balance.', 'Money for this month stays in checking. A transfer can take one to three business days.']] }),
  },
  dca: {
    title: 'All at once, or a little each month?', why: 'With a lump of money to invest, spreading it out feels safer. One comparison shows what that comfort is expected to cost, and what it buys.',
    fields: [{ key: 'amount', label: 'The amount to invest', picks: [5000, 10000, 25000, 50000, 100000], help: 'A bonus, an inheritance, savings you are ready to put to work.' },
      { key: 'months', label: 'Spread over', options: opt([3, 6, 12, 24], v => `${v} months`) },
      { key: 'cashRate', label: 'What the waiting money earns', options: rates([0, 0.02, 0.03, 0.04, 0.05]), help: 'The rate of the savings account it sits in while it waits.' }],
    run: (v, ref) => qcDca({ ...v, ret: qcNominal(planReal(ref), planInfl(ref)) }),
    answer: R => ({ lead: `Put in all at once, it is expected to end the ${R.months} months ahead by about`, big: big(R.gap), line: `All at once: ${big(R.lump)}. ${big(R.piece)} a month: ${big(R.spread)}. Spreading it keeps about ${big(R.averageWaiting)} on the side on an average month, so a drop right after you start hits less of it.`,
      rows: [['All at once', null, big(R.lump)], [`${big(R.piece)} a month for ${R.months} months`, `the rest earning ${pct(R.cashRate, 1)}`, big(R.spread)]],
      small: `Both grow at the plan's return with inflation added back (${pct(R.ret, 1)} a year). Markets do not move in a straight line, so this is the expected gap, not the one you will get.`,
      fold: [['Whose idea this is', 'Vanguard\'s research paper "Dollar-cost averaging just means taking risk later" (2012) looked at the US, UK and Australian markets and found that putting it all in at once came out ahead about two times in three, against spreading it over a year.', 'The other one time in three is the reason people spread it. If spreading it is what gets the money invested at all, it is doing its job.']] }),
  },
  warranty: {
    title: 'Is this warranty worth its price?', why: 'An extended warranty is a bet the store prices to win on average. Your own guess at the odds shows where it lands for you.',
    fields: [{ key: 'price', label: 'What the warranty costs', picks: [50, 100, 200, 400, 800] },
      { key: 'repair', label: 'What a repair or a new one would cost', picks: [200, 500, 1000, 2000, 3000], help: 'The likely repair, or replacing it if repairs are not done.' },
      { key: 'chance', label: 'Your guess: the chance it breaks while covered', options: opt([0.05, 0.1, 0.2, 0.3, 0.5], v => pct(v)), help: 'Only the years the maker\'s warranty and your card do not already cover.' }],
    run: v => qcWarranty(v),
    answer: R => ({ lead: 'On your odds, the repair it covers is worth about', big: big(R.expected), line: `${pct(R.chance)} of ${money(R.repair)} next to a price of ${money(R.price)}. The two meet at a ${pct(R.evenChance)} chance. ${R.pays ? 'Your guess is above that line.' : `Put the ${money(R.price)} in savings instead and it stays yours if nothing breaks.`}`,
      rows: [['The price', null, money(R.price)], ['Chance x the repair', `${pct(R.chance)} x ${money(R.repair)}`, big(R.expected)], ['The chance where they meet', null, pct(R.evenChance)]],
      fold: [['Where the line bends', 'Some things are worth covering anyway: a repair you could not pay for this month, or one that would stop you working. An emergency fund does the same job for everything at once.', 'Many credit cards add a year to the maker\'s warranty. Check yours before you buy one.']] }),
  },
  peruse: {
    title: 'What does it cost each time I use it?', why: 'A price looks different spread over every use, and different again if you can sell it after. This is "cost per use", done with the resale in.',
    fields: [{ key: 'price', label: 'The price', picks: [50, 150, 400, 1000, 2500] },
      { key: 'uses', label: 'How many times you will use it', unit: 'uses', picks: [5, 10, 25, 50, 100, 365], help: 'Be honest: the times you will really use it.' },
      { key: 'resale', label: 'What you could sell it for after', picks: [0, 25, 100, 300], start: 0, optional: true, help: '$0 if it will be used up.' }],
    run: v => qcPerUse(v),
    answer: R => ({ lead: 'Each use costs you about', big: cents(R.perUse), line: `${R.resale ? `${money(R.price)} less the ${money(R.resale)} you get back is ${money(R.kept)}` : money(R.price)}, over ${R.uses} ${R.uses === 1 ? 'use' : 'uses'}.${R.resale ? ` Without the resale it would be ${cents(R.plain)} a use.` : ''}`,
      rows: [['What it really costs you', 'the price less the resale', money(R.kept)], ['A use', null, cents(R.perUse)]],
      fold: [['Whose idea this is', 'Cost per use is an old shopper\'s rule, and the joke version ("girl math") leaves the resale out and counts uses that never happen. Put the uses you really expect, and the number tells the truth.']] }),
  },
  hassle: {
    title: 'Is it worth the hassle?', why: 'A coupon, a bill negotiation, a bank bonus: each one pays for the time it takes. Two numbers show what an hour of this one pays.',
    fields: [{ key: 'saved', label: 'What it saves or pays you', picks: [20, 50, 100, 300, 600] },
      { key: 'per', label: 'Is that', options: [['One time', 'once'], ['Every year', 'year']], start: 'once' },
      { key: 'hours', label: 'The hours it takes', unit: 'hours', picks: [0.5, 1, 2, 4, 8], help: 'All of it: calls, forms, the drive. If it repeats, the hours a year.' },
      { ...hourly, optional: true }],
    run: v => qcHassle(v),
    answer: R => ({ lead: R.per === 'year' ? 'Each year, an hour of this pays' : 'An hour of this pays', big: cents(R.perHour), line: R.times == null ? `${money(R.saved)} over ${hrs(R.hours)}. Add what an hour of your work pays to see the two side by side.` : `${money(R.saved)} over ${hrs(R.hours)}. An hour of your work pays ${cents(R.wage)}, so this pays ${R.times.toFixed(1)} times that.`,
      rows: [['This task, an hour', null, cents(R.perHour)], ...(R.wage ? [['Your work, an hour', null, cents(R.wage)]] : [])],
      fold: [['Whose idea this is', 'Return on Hassle is an idea of this app: it is the same one that orders debts by how much each one weighs on you. A dollar figure is half of it; how much you mind the task is the other half, and only you know that one.']] }),
  },
  worthit: {
    title: 'Is it worth it, or was it?', why: 'One tool, two directions: before you buy, the price in hours of your life and per use; after, the same numbers with the uses that really happened.',
    fields: [{ key: 'direction', label: 'Which way', options: [['Before I buy', 'before'], ['Looking back', 'after']], start: 'before' },
      { key: 'price', label: 'The price', picks: [50, 150, 400, 1000, 2500] },
      { key: 'uses', label: 'How many times you will use it, or did', unit: 'uses', picks: [1, 5, 20, 50, 100, 365] },
      hourly, { key: 'resale', label: 'What it sells for after', picks: [0, 25, 100, 300], start: 0, optional: true }],
    run: v => qcWorth(v),
    answer: R => ({ lead: R.direction === 'after' ? 'It cost you this much of your work' : 'It would cost you this much of your work', big: `${R.hours.toFixed(1)} hours`, line: `${money(R.kept)} at ${cents(R.wage)} an hour. ${R.direction === 'after' ? `Used ${R.uses} times, that was ${cents(R.perUse)} and ${(R.hoursPerUse * 60).toFixed(0)} minutes of work a use. Knowing that, would you buy it again?` : `Used ${R.uses} times, that is ${cents(R.perUse)} and ${(R.hoursPerUse * 60).toFixed(0)} minutes of work a use. Picture the last time you used something like it.`}`,
      rows: [['Hours of work', null, `${R.hours.toFixed(1)} hours`], ['A use', null, cents(R.perUse)]],
      fold: [['Whose idea this is', 'Pricing things in hours of your life is from Your Money or Your Life, by Vicki Robin and Joe Dominguez. Their question for every line of spending: did I get fulfillment in proportion to the life energy it cost?', 'There is no right answer here. The number is so the choice is made with it in view.']] }),
  },
  inflation: {
    title: 'What is my own inflation rate?', why: 'The inflation in the news is an average basket. Yours is your own mix: the parts you spend most on, at the rate their prices moved for you.',
    waiting: 'Put an amount on at least one part, and tap how its price moved. Rough numbers are fine.',
    fields: [['housing', 'Home: rent or mortgage, insurance'], ['food', 'Food, at home and out'], ['transport', 'Getting around'], ['health', 'Health and insurance'], ['other', 'Everything else']].flatMap(([k, label]) => [
      { key: `${k}Amount`, label: `${label}, a month`, picks: [100, 300, 600, 1200, 2000], optional: true },
      { key: `${k}Change`, label: `How its price moved in a year (${label.split(',')[0].split(':')[0].toLowerCase()})`, options: opt([-0.02, 0, 0.02, 0.03, 0.05, 0.08, 0.12], v => pct(v)), help: 'A bill or receipt from a year ago next to today\'s.' }]),
    run: (v, ref) => qcInflation({ planRate: planInfl(ref), parts: ['housing', 'food', 'transport', 'health', 'other'].map(k => ({ key: k, amount: v[`${k}Amount`], change: v[`${k}Change`] })) }),
    answer: R => ({ lead: 'Your own prices rose about', big: `${pct(R.rate, 1)} a year`, line: `Your biggest driver is ${R.top.key === 'other' ? 'everything else' : R.top.key}, adding ${pct(R.top.adds, 1)} of it. The plan assumes ${pct(R.planRate, 1)}; on your mix the same month costs ${big(R.yearMore)} more in a year.`,
      rows: R.rows.map(r => [r.key === 'other' ? 'Everything else' : r.key[0].toUpperCase() + r.key.slice(1), `${pct(r.share)} of your month, prices ${pct(r.change)}`, `adds ${pct(r.adds, 1)}`]),
      fold: [['How it is worked out', 'Each part\'s share of your month times how much its prices moved, added up. It is how the official index is built too, on the average household\'s basket instead of yours.', 'The plan keeps its own inflation rate. If yours runs higher year after year, that is the number to raise there.']] }),
  },
  timemachine: {
    title: 'What if I had started at 22 instead of 32?', why: 'The same amount a month, started ten years apart, ends up far apart. Compounding pays most for the earliest years.',
    fields: [{ key: 'monthly', label: 'A month, invested', picks: [50, 100, 250, 500, 1000] },
      { key: 'ageA', label: 'Starting at', options: opt([18, 22, 25, 30]), start: 22 }, { key: 'ageB', label: 'Or starting at', options: opt([27, 32, 35, 40, 45]), start: 32 }],
    run: (v, ref) => qcStart({ ...v, ret: planReal(ref) }),
    answer: R => ({ lead: `Started at ${R.early}, ${money(R.monthly)} a month is worth this much more at ${R.to}`, big: big(R.gap), line: `${big(R.a)} from ${R.early}, ${big(R.b)} from ${R.late}. The ${R.waitYears} early years put in only ${big(R.putA - R.putB)} more. To end at the same place from ${R.late}, it takes about ${big(R.catchUp)} a month.`,
      rows: [[`From ${R.early}`, `${big(R.putA)} put in`, big(R.a)], [`From ${R.late}`, `${big(R.putB)} put in`, big(R.b)]], small: realWords(R.ret),
      fold: [['Whose idea this is', 'Every personal finance book has a version of this chart; the best-known compares two savers who start ten years apart. It is not here to make anyone feel late: the best day to start is the one in front of you.']] }),
  },
  waiting: {
    title: 'What does waiting to start cost?', why: 'Putting off investing for a year or a few feels free. One number shows what the wait costs by the time you stop working.',
    fields: [{ key: 'monthly', label: 'A month, invested', picks: [50, 100, 250, 500, 1000] }, { key: 'age', label: 'Your age', options: opt(AGES) },
      { key: 'wait', label: 'Waiting', options: opt([1, 2, 3, 5, 10], v => `${v} ${v === 1 ? 'year' : 'years'}`), start: 1 }],
    run: (v, ref) => qcStart({ monthly: v.monthly, ageA: v.age, ageB: v.age == null ? null : v.age + v.wait, ret: planReal(ref) }),
    answer: R => ({ lead: `Waiting ${R.waitYears} ${R.waitYears === 1 ? 'year' : 'years'} costs about this much at ${R.to}`, big: big(R.gap), line: `Starting now ends near ${big(R.a)}; starting at ${R.late}, near ${big(R.b)}. Each year of waiting costs about ${big(R.perYearWaited)} at the end, and making it up later takes ${big(R.catchUp)} a month instead of ${money(R.monthly)}.`,
      rows: [['Starting now', null, big(R.a)], [`Starting at ${R.late}`, null, big(R.b)], ['To catch up from then', 'a month', big(R.catchUp)]], small: realWords(R.ret) }),
  },
  consolidate: {
    title: 'Would one loan for my debts cost less?', why: 'A consolidation loan swaps several debts for one payment. The fee and the years decide whether it really costs less, so both are in.',
    fields: [{ key: 'balance', label: 'What you owe, added up', picks: [3000, 8000, 15000, 25000, 40000], help: 'The debts you would pay off with the loan.' },
      { key: 'apr', label: 'Their average rate', options: rates([0.12, 0.18, 0.22, 0.25, 0.29]), help: 'Weighted by balance if you can; a rough average works.' },
      { key: 'payment', label: 'What you pay on them a month', picks: [150, 300, 500, 800, 1200] },
      { key: 'loanApr', label: 'The loan\'s rate (APR)', options: rates([0.07, 0.1, 0.13, 0.16, 0.2]) },
      { key: 'loanYears', label: 'The loan\'s years', options: opt([2, 3, 4, 5], v => `${v} years`) },
      { key: 'feePct', label: 'Its origination fee', options: opt([0, 0.01, 0.03, 0.05, 0.08], v => pct(v)), start: 0, help: 'Taken out of what the loan pays out, so you borrow a little more.' }],
    run: v => qcConsolidate(v),
    answer: R => (R.never
      ? { lead: 'At what you pay now, these debts never get paid off. The loan clears them in', big: `${R.loanYears} years`, line: `The loan's payment is ${big(R.loanPay)} a month; the debts as they are need at least ${money(R.paymentNeeded)} a month to shrink.`, rows: [['The loan, a month', null, big(R.loanPay)], ['Its interest and fee, all in', null, big(R.loanCost)]] }
      : { lead: R.saved >= 0 ? 'The loan, fee included, costs less by about' : 'Kept as they are, the debts cost less by about', big: big(Math.abs(R.saved)), line: `As they are: ${months(R.nowMonths)} and ${big(R.nowInterest)} of interest. The loan: ${big(R.principal)} borrowed${R.feeCost > 0 ? ` (${big(R.feeCost)} of it the fee)` : ''}, ${big(R.loanPay)} a month for ${R.loanYears} years, ${big(R.loanCost)} all in.${R.loanAtSame ? ` Paying your ${money(R.payment)} on the loan instead clears it in ${months(R.loanAtSame)}.` : ''}`,
        rows: [['As they are', `${money(R.payment)} a month at ${pct(R.apr, 1)}`, `${big(R.nowInterest)} interest`], ['One loan', `${big(R.loanPay)} a month at ${pct(R.loanApr, 1)}`, `${big(R.loanCost)} interest and fee`]],
        fold: [['What the numbers leave out', 'A loan only saves money if the cards stay paid off after. Many people close nothing but stop carrying a balance on them.', 'A 0% balance transfer card is the other way to do this; its fee is usually a share of what moves, and the rate jumps when the offer ends.']] }),
  },
  jobless: {
    title: 'What would unemployment pay me, and how long would my money last?', why: 'If the job ended, a weekly benefit covers part of the month for a while. New York\'s rules first; your own number works anywhere.',
    fields: [{ key: 'highQuarter', label: 'Your best three months of pay, before taxes', picks: [6000, 9000, 12000, 18000, 25000], help: 'The highest-paid quarter of the last year or so. Your letter from the state shows it.', optional: true },
      { key: 'known', label: 'Or the weekly rate on your letter', picks: [200, 400, 600, 869], optional: true, help: 'Outside New York, or if you have the letter: type it and it is used as it is.' },
      { key: 'cash', label: 'Cash you could live on', picks: [2000, 5000, 10000, 20000, 40000] },
      { key: 'spending', plan: 'spending', label: 'What you spend in a month, all in', picks: SPEND },
      { key: 'withhold', label: 'Federal tax taken out of the benefit', options: [['Yes, 10%', 'yes'], ['No', 'no']], start: 'no', help: 'You choose this when you file. It is taxed either way.' }],
    waiting: 'Fill in your best three months (or your weekly rate), your cash and your spending.',
    run: (v, ref) => { const rules = ref.limits.unemployment.NY, U = qcUiNy({ highQuarter: v.highQuarter, known: v.known, rules }); if (!U.ready) return U; const R = qcBenefitRunway({ cash: v.cash, spending: v.spending, weekly: U.weekly, weeks: U.weeks, keep: v.withhold === 'yes' ? 1 - ref.tax.unemployment.withholdRate : 1 }); return R.ready ? { ...R, U, rules } : R; },
    answer: R => ({ lead: 'With the benefit coming in, your money lasts about', big: months(R.months), line: `${R.U.fromLetter ? 'Your letter\'s rate is' : 'New York\'s rule gives'} ${money(Math.round(R.U.weekly))} a week for up to ${R.U.weeks} weeks (about ${big(R.inMonth)} a month kept). Without it, the same cash lasts ${months(R.without)}.`,
      rows: [['A week', R.U.fromLetter ? 'from your letter' : R.U.capped ? 'the most New York pays' : R.U.floored ? 'the least New York pays' : `your best quarter / ${R.U.high ? R.rules.divisorHigh : R.rules.divisorLow}`, money(Math.round(R.U.weekly))], ['All the weeks', `${R.U.weeks} weeks`, big(R.U.total)], ['The benefit adds', null, months(R.added)]],
      small: 'An estimate. The state works out the real rate from your wage records.',
      fold: [['New York\'s rule, and where it comes from', `From the NY Department of Labor's claimant handbook (TC408, Dec 2025): with pay in all four quarters, the weekly rate is your best quarter divided by 26, no less than $${R.rules.minWeekly} and no more than $${R.rules.maxWeekly}; at $${R.rules.lowLine.toLocaleString('en-US')} or less it is divided by 25. With pay in only two or three quarters, the average of the two best is used, which this page does not do: type the rate from your letter.`, 'Other states have their own rules and are not in yet. Type your state\'s weekly rate in the second box and the rest works the same.']] }),
  },
  leave: {
    title: 'Can I afford to leave my job, or start a business?', why: 'Leaving means the cash covers the month while new income grows, with health cover and self-employment tax on top. Three numbers show how long that lasts.',
    fields: [{ key: 'cash', label: 'Cash set aside for this', picks: [5000, 15000, 30000, 60000, 100000] },
      { key: 'spending', plan: 'spending', label: 'What you spend in a month, all in', picks: SPEND },
      { key: 'health', label: 'Health cover a month, after the job', picks: [0, 200, 450, 700, 1000], start: 0, help: 'Your own quote: COBRA, the marketplace, or a partner\'s plan.' },
      { key: 'profit', label: 'What the new work clears a month, before tax', picks: [0, 1000, 2500, 4000, 6000], start: 0, optional: true, help: '$0 at the start is common.' }],
    run: (v, ref) => qcLeave({ ...v, ref }),
    answer: R => (R.covered
      ? { lead: 'The new work covers the month by itself, after tax:', big: `${big(R.kept)} a month`, line: `It clears ${money(R.profit)} and about ${big(R.tax)} goes to federal and self-employment tax. Your month with health cover is ${big(R.need)}, so the cash is a cushion, not a clock.`, rows: [['Kept after tax', null, big(R.kept)], ['Your month', null, big(R.need)]] }
      : { lead: 'Your cash covers the gap for about', big: months(R.months), line: `Your month is ${big(R.need)} with health cover. ${R.profit ? `The new work keeps ${big(R.kept)} of its ${money(R.profit)} after about ${big(R.tax)} of federal and self-employment tax, so the gap is ${big(R.gap)}.` : `With nothing coming in yet, the gap is all of it.`} The work covers everything once it clears about ${big(R.breakeven)} a month before tax.`,
        rows: [['Your month', 'spending and health cover', big(R.need)], ['Kept from the new work', 'after federal and self-employment tax', big(R.kept)], ['Cash with nothing coming in', null, months(R.without)], ['The work covers it all at', 'a month, before tax', big(R.breakeven)]],
        small: 'Federal income tax and self-employment tax only; state tax is not in this one. Set aside the tax each quarter.',
        fold: [['What to line up first', 'Health cover: COBRA keeps your plan for up to 18 months at the full price; losing job cover opens a special enrollment window on the marketplace.', 'Self-employment tax is the Social Security and Medicare a job used to split with you; on your own you pay both halves.', 'A date you would go back to a job if the gap is still open: decided now, while it is calm.']] }),
  },
  kids: {
    title: 'What does a child cost, year by year?', why: 'A child\'s costs change shape as they grow: childcare first, then school years, then the teens. Your own numbers for each stage add up to the years ahead.',
    waiting: 'Tap the age and put your own yearly number on each stage. $0 is fine for a stage you have covered.',
    fields: [{ key: 'age', label: 'The child\'s age now', options: opt([0, 1, 2, 3, 5, 8, 10, 13, 15], v => (v === 0 ? 'Not born yet, or under 1' : String(v))) },
      { key: 'little', label: 'A year at ages 0 to 4', picks: [5000, 10000, 15000, 20000, 30000], help: 'Childcare is usually most of it. A daycare quote near you is the best start.' },
      { key: 'school', label: 'A year at ages 5 to 12', picks: [5000, 8000, 12000, 16000, 25000], help: 'Food, clothes, after-school care, activities, health.' },
      { key: 'teen', label: 'A year at ages 13 to 17', picks: [6000, 10000, 14000, 18000, 25000], help: 'Food runs higher; phones, driving and activities come in.' }],
    run: v => qcKids(v),
    answer: R => ({ lead: `From ${R.age === 0 ? 'birth' : `age ${R.age}`} to 18, on your numbers`, big: big(R.left), line: `This year is ${big(R.now)} (${big(R.monthNow)} a month). The biggest year ahead is ${big(R.peak.cost)}, at ${R.peak.age === 0 ? 'birth' : `age ${R.peak.age}`}.`,
      rows: R.stages.filter(s => s.years > 0).map(s => [s.label, `${s.years} ${s.years === 1 ? 'year' : 'years'} left at ${big(s.yearly)}`, big(s.yearly * s.years)]),
      small: 'In today\'s dollars. College is not in it; it is a goal of its own.',
      fold: [['Why there is no typical number here', 'The last government study of what children cost (USDA, Expenditures on Children by Families) is from 2015 and is under review, so this page asks for your own numbers instead of printing old ones.']] }),
  },
  pet: {
    title: 'What does a pet really cost?', why: 'The adoption fee is the small part. A month of food and care, a year of vet visits, and the years ahead show the whole of it.',
    fields: [{ key: 'monthly', label: 'Food, litter, supplies a month', picks: [30, 60, 100, 150, 250] },
      { key: 'vet', label: 'Vet, insurance and meds a year', picks: [0, 300, 700, 1200, 2000], start: 0, help: 'Your own vet\'s prices, or a pet insurance quote.' },
      { key: 'upfront', label: 'To bring them home', picks: [0, 150, 400, 1000, 2500], start: 0, optional: true, help: 'Adoption or purchase, the first vet visit, a crate, a bed.' },
      { key: 'years', label: 'The years you expect together', options: opt([5, 8, 10, 12, 15], v => `${v} years`) }],
    run: v => qcPet(v),
    answer: R => ({ lead: `Over ${R.years} years, on your numbers`, big: big(R.lifetime), line: `A year is about ${big(R.year)} (${big(R.monthAll)} a month with the vet spread in). The first year, with bringing them home, is ${big(R.firstYear)}.`,
      rows: [['To bring them home', null, money(R.upfront)], ['A year after', `${money(R.monthly)} a month and ${money(R.vet)} of vet`, big(R.year)], [`All ${R.years} years`, null, big(R.lifetime)]],
      small: 'In today\'s dollars. A surprise vet bill is the big one: an emergency fund or insurance covers it.' }),
  },
  apartment: {
    title: 'What does it take to move into my first apartment?', why: 'The first month is rarely the whole check. A deposit, maybe a last month or a broker fee, the move and the basics come due before the keys.',
    fields: [{ key: 'rent', label: 'The rent a month', picks: [1000, 1500, 2000, 2500, 3500] },
      { key: 'depositMonths', label: 'The security deposit', options: [['None', 0], ['One month', 1], ['Two months', 2]], start: 1 },
      { key: 'lastMonth', label: 'Last month\'s rent up front', options: [['No', 0], ['Yes', 1]], start: 0 },
      { key: 'brokerMonths', label: 'A broker fee you pay', options: [['None', 0], ['One month', 1], ['15% of a year', 1.8]], start: 0 },
      { key: 'moving', label: 'Moving', picks: [0, 200, 600, 1500], start: 0, optional: true },
      { key: 'setup', label: 'Setting up: furniture, kitchen, the basics', picks: [0, 500, 1500, 3000], start: 0, optional: true },
      { key: 'monthlyOther', label: 'Utilities, internet, renter\'s insurance a month', picks: [0, 100, 200, 300], start: 0, optional: true }],
    run: v => qcApartment(v),
    answer: R => ({ lead: 'To get the keys, have about', big: big(R.keys), line: `That is ${R.rentTimes.toFixed(1)} times the rent. ${R.back ? `The ${big(R.back)} deposit comes back when you leave, less any damage. ` : ''}After that, a month is about ${big(R.month)}.`,
      rows: R.lines.map(([label, v]) => [label, null, big(v)]),
      fold: [['Rules that cap these in New York', 'New York State caps a security deposit at one month\'s rent (Housing Stability and Tenant Protection Act, 2019).', 'In New York City, since June 2025 (the FARE Act), a broker the landlord hired is paid by the landlord; you pay a broker fee only to a broker you hired yourself.', 'Other places have their own rules. Ask before you sign, and get every fee in writing.']] }),
  },
  roommates: {
    title: 'How should we split the rent?', why: 'Equal is simple, but rooms and pay are not always equal. Split the rent by room size or by income, and the shared bills too, on the same engine the whole plan uses for a household.',
    fields: [{ key: 'rent', label: 'The whole rent a month', picks: [1800, 2500, 3200, 4000, 5000] },
      { key: 'bills', label: 'Shared bills a month', picks: [0, 100, 200, 350], start: 0, optional: true, help: 'Utilities, internet, the shared supplies.' },
      { key: 'people', label: 'How many of you', options: opt([2, 3, 4]), start: 2 },
      { key: 'how', label: 'Split the rent', options: Object.entries(QC_SPLIT).map(([k, label]) => [label, k]), start: 'size' },
      { key: 'billsHow', label: 'Split the bills', options: [['Equally', 'equal'], ['The same way as the rent', 'same']], start: 'equal' },
      ...[1, 2, 3, 4].map(n => ({ key: `size${n}`, label: n === 1 ? 'Your room' : `Room ${n}`, unit: 'sq ft', picks: [80, 100, 130, 160, 200], when: v => v.how === 'size' && n <= v.people, help: n === 1 ? 'Square feet, or count floor tiles: it only needs to be the same for every room.' : null })),
      ...[1, 2, 3, 4].map(n => ({ key: `income${n}`, label: n === 1 ? 'Your take-home a month' : `Person ${n}'s take-home a month`, picks: [2000, 3500, 5000, 7000], when: v => v.how === 'income' && n <= v.people }))],
    run: v => qcRoommates({ rent: v.rent, bills: v.bills, how: v.how, billsHow: v.billsHow, people: Array.from({ length: v.people }, (_, i) => ({ id: i === 0 ? 'Me' : `P${i + 1}`, name: i === 0 ? 'You' : `Person ${i + 1}`, size: v[`size${i + 1}`], income: v[`income${i + 1}`] })) }),
    answer: R => ({ lead: `Split ${QC_SPLIT[R.how].toLowerCase()}, your part a month is`, big: big(R.me.total), line: `${big(R.me.rent)} of the rent (${pct(R.me.rentShare)})${R.bills ? ` and ${big(R.me.bills)} of the bills` : ''}. Split equally it would be ${big(R.equal)} each.`,
      rows: R.rows.map(p => [p.name, `${pct(p.rentShare)} of the rent${R.bills ? `, ${pct(p.billShare)} of the bills` : ''}`, big(p.total)]),
      fold: [['Whose way is fair', 'There is no one fair split. By room size pays for the space each person gets; by income asks each person for the same share of their pay. Many households pick one for rent and split bills equally.', 'Whatever you choose, write it down with the date and what happens when someone moves out.']] }),
  },
  w4: {
    title: 'Will I get a refund or owe, and what do I change on my W-4?', why: 'Withholding is a guess made each paycheck. Your pay stub and the year\'s tax show where it lands, and the one W-4 line that evens it out.',
    fields: [{ key: 'gross', label: 'Your pay this year, before taxes', picks: [40000, 60000, 80000, 100000, 150000], help: 'The whole year, the paychecks still to come included.' },
      { key: 'filingStatus', label: 'You file as', options: [['Single', 'Single'], ['Married, jointly', 'Married jointly'], ['Head of household', 'Head of household']], start: 'Single' },
      { key: 'pretax', label: '401(k), HSA and other pre-tax money this year', picks: [0, 3000, 8000, 15000, 23500], start: 0, optional: true },
      { key: 'kids', label: 'Children under 17', options: opt([0, 1, 2, 3]), start: 0 },
      { key: 'withheld', label: 'Federal tax withheld so far this year', picks: [1000, 3000, 6000, 10000, 15000], help: 'On your latest pay stub: Federal income tax, the year-to-date column.' },
      { key: 'perCheck', label: 'Federal tax on one paycheck', picks: [50, 100, 200, 400, 700], help: 'The same line, this period\'s column.' },
      { key: 'checksLeft', label: 'Paychecks left this year', unit: 'paychecks', picks: [1, 3, 6, 13, 20, 26] },
      { key: 'checksYear', label: 'Paychecks in a year', options: [['Weekly', 52], ['Every 2 weeks', 26], ['Twice a month', 24], ['Monthly', 12]], start: 26 }],
    run: (v, ref) => qcW4({ ...v, ref }),
    answer: R => ({ small: W4_SMALL, fold: W4_FOLD, ...(R.even
      ? { lead: 'Your withholding lands right on it:', big: 'about $0', line: `The year's federal tax is ${big(R.owe)} and ${big(R.total)} will be withheld. Nothing to change.`, rows: [] }
      : R.owed
        ? { lead: 'At this pace, at tax time you would owe about', big: big(R.owed), line: `The year's federal tax is ${big(R.owe)}${R.credit ? ` after ${big(R.credit)} of child tax credit` : ''}; ${big(R.withheld)} is withheld so far and ${R.checksLeft} paychecks at ${money(R.perCheck)} bring it to ${big(R.total)}.`, rows: [['The line to change', 'W-4 Step 4(c), extra withholding each paycheck', big(R.extra)], ['The year\'s federal tax', null, big(R.owe)], ['Withheld by the end of the year', null, big(R.total)]] }
        : { lead: 'At this pace, your refund would be about', big: big(R.refund), line: `That is your money, lent to the government for free. The year's federal tax is ${big(R.owe)}${R.credit ? ` after ${big(R.credit)} of child tax credit` : ''}, and ${big(R.total)} will be withheld.`, rows: [R.deductions > 0 ? ['The line to change', 'W-4 Step 4(b), deductions', big(R.deductions)] : null, R.stillRefund >= 1 ? ['Still a refund at tax time', R.deductions > 0 ? 'the paychecks left cannot hold back more' : 'no W-4 line lowers it this year', big(R.stillRefund)] : null, ['The year\'s federal tax', null, big(R.owe)], ['Withheld by the end of the year', null, big(R.total)]].filter(Boolean) }) }),
  },
  glance: {
    title: 'Where does my month stand, at a glance?', why: 'Three numbers say most of it: what comes in, what goes out, and what is left. The plan uses the same ones everywhere.',
    fields: [{ key: 'takeHome', plan: 'takeHome', label: 'What lands in your account in a month', picks: PAY, help: 'After taxes.' }, { key: 'spending', plan: 'spending', label: 'What you spend in a month, all in', picks: SPEND },
      { key: 'debtOutside', label: 'Debt payments not in that spending', picks: [0, 200, 500, 1000], start: 0, optional: true, help: '$0 if your spending already counts them.' }],
    run: v => qcGlance(v),
    answer: R => ({ lead: R.left >= 0 ? 'Each month, left over' : 'Each month, more goes out than comes in by', big: big(Math.abs(R.left)), line: R.left >= 0 ? `${money(R.takeHome)} comes in and ${money(R.out)} goes out, so you keep ${pct(R.rate)} of what lands: ${big(R.keptYear)} a year. A day of your life costs about ${big(R.perDay)}.` : `${money(R.takeHome)} comes in and ${money(R.out)} goes out. Recalculating from here: the next move is the largest line that can shrink, and the plan shows its new date.`,
      rows: [['In', null, money(R.takeHome)], ['Out', null, money(R.out)], ['Left', null, big(R.left)], ['Kept', 'of take-home', pct(R.rate)]] }),
  },
};
// The quick shelf, in the order the hub shows it.
export const QUICK_SHELF = ['glance', 'hysa', 'dca', 'timemachine', 'waiting', 'consolidate', 'w4', 'jobless', 'leave', 'apartment', 'roommates', 'kids', 'pet', 'inflation', 'peruse', 'worthit', 'hassle', 'warranty'];
