// SPDX-License-Identifier: AGPL-3.0-only
// Working for yourself (run Not built, groups 1 to 5, Part 5): five small pages drawn by the one renderer
// (js/solo/calc.js), from specs like the quick calculators'. The math is in js/math/gig.js and js/math/gigplan.js (M8G),
// with tests; these specs only say what to ask and how to say the answer. The invoice tracker is its own page
// (js/solo/invoices.js), because it holds a list.
import { money } from './shell.js';
import { gigRetire, gigTaxCenter, gigPricing } from '../math/gigplan.js';
import { gigPayoutsOf, gigProfitFirstOf, GIG_PF_SAMPLE, GIG_PF_KEYS } from '../math/gig.js';
import { PLATFORMS } from '../math/earnings.js';

const pct = (v, d = 0) => `${+(v * 100).toFixed(d)}%`, big = v => money(Math.round(v)), cents = v => `$${v.toFixed(2)}`;
const opt = (list, f = String) => list.map(v => [f(v), v]);
const hrs = v => `${Math.round(v).toLocaleString('en-US')} hours`;
const FILING = { key: 'filingStatus', label: 'How you file', options: [['Single', 'Single'], ['Married, together', 'Married jointly'], ['Head of household', 'Head of household']], start: 'Single' };
const PLACE = { key: 'place', label: 'Where you live', options: [['New York City', 'nyc'], ['New York, outside the city', 'ny'], ['Somewhere else', 'other']], start: 'other', help: 'State tax is in for New York so far. Elsewhere it is federal only, so set aside your state\'s share on top.' };
const PROFIT_PICKS = [15000, 30000, 50000, 75000, 100000, 150000];
const placeWords = R => (R.place ? `Federal income tax, self-employment tax, and New York${R.place.nyc ? ' state and city' : ' state'} tax.` : 'Federal income tax and self-employment tax. State tax is not in it outside New York.');
const QBI = 'Not in it: the deduction for qualified business income, which lowers income tax for many sole owners, and any credits. Both make the real bill smaller, so this number is on the safe side.';
const PF_WORDS = { profit: 'Profit', owner: 'Pay to you', tax: 'Tax', opex: 'Running costs' };
const PF_HELP = { profit: 'Kept by the work, not spent.', owner: 'What the work pays you.', tax: 'Set aside for the tax on it.', opex: 'What the work itself costs.' };
const APP_STATE = { matches: 'matches what landed', short: 'still to land, or to check', over: 'more landed than it shows', waiting: 'add what landed to check it', onway: 'still to land, and it can still be on its way' };
// Guess / Close / Exact for the numbers a page is built on (one tap, as on the family pages).
const levelOf = (close, exact) => ({ key: 'level', label: 'Where these numbers come from', options: [['A guess', 'Guess'], [close, 'Close'], [exact, 'Exact']], start: 'Guess' });
const LEVEL_WORDS = { Guess: 'A guess for now: it firms up as the real numbers come in.', Close: 'Close: from your own records so far.', Exact: 'Exact: from your own records and papers.' };
const day = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const HARBOR_WHY = { prior: R => `${pct(R.harbor.priorShare)} of last year's tax${R.harbor.agiSure ? '' : ' (the higher share, since last year\'s AGI is not known)'}`, current: R => `${pct(R.harbor.rule.current)} of this year's tax`, zero: () => 'last year had no tax, so no estimates are needed', small: R => `less than ${money(R.harbor.rule.owe)} is due after withholding, so no estimates are needed` };
const PAYOUT_WORDS = { day: 'each day', week: 'each week', month: 'each month' };
const daysWord = n => `${n} ${n === 1 ? 'day' : 'days'}`;

const appFields = i => {
  const k = s => `app${i}${s}`, show = i === 1 ? null : v => v[`app${i - 1}Earned`] > 0;
  return [
    { key: k('Name'), label: i === 1 ? 'The app' : `App ${i}`, options: opt(PLATFORMS), when: show, optional: true },
    { key: k('Earned'), label: i === 1 ? 'What it says you earned, tips in' : `App ${i}: what it says you earned, tips in`, picks: [100, 300, 600, 1200, 2500], optional: i > 1, when: show, help: i === 1 ? 'The earnings screen for the stretch you picked. Fill a second app and a third shows.' : null },
    { key: k('Tips'), label: 'The tips inside that', picks: [0, 50, 100, 250], optional: true, when: show },
    { key: k('Fee'), label: 'The fee it shows, if any', picks: [0, 25, 75, 150], start: 0, optional: true, when: show, help: 'Most driving and delivery apps show earnings after their cut, so this is $0.' },
    { key: k('Landed'), label: 'What reached your bank', picks: [100, 300, 600, 1200, 2500], optional: true, when: show, help: 'The deposits from this app for the same stretch.' },
    { key: k('Payout'), label: 'How often it pays out', options: [['Each day', 'day'], ['Each week', 'week'], ['Each month', 'month']], optional: true, when: show, help: i === 1 ? 'Leave it for Uber, DoorDash and Upwork: their own help pages say. For the others, tap what your app shows.' : null },
    { key: k('Hold'), label: 'Days from the payout to your bank', unit: 'days', picks: [0, 1, 2, 3, 5, 7], optional: true, when: show, help: i === 1 ? 'From the payout list in the app.' : null },
  ];
};

export const GIG_SPECS = {
  freelance: {
    title: 'What is the least I can charge?', why: 'A paycheck\'s hourly hides the taxes, the benefits and the hours nobody pays for. Your floor puts them all back, so you know the line to price above.',
    fields: [{ key: 'spending', plan: 'spending', label: 'What your life costs a month, all in', picks: [2000, 3000, 4000, 5000, 6500], help: 'Rent, food, bills, debt payments: everything the work has to pay for.' },
      { key: 'health', label: 'Health cover a month, on your own', picks: [0, 300, 500, 800, 1200], start: 0, optional: true, help: '$0 if a partner\'s plan covers you.' },
      { key: 'retire', label: 'Retirement you want to put in a year', picks: [0, 3000, 7500, 15000, 25000], start: 0, optional: true, help: 'A job would often add a match. Here it is all yours to fund.' },
      { key: 'costs', label: 'What the work itself costs a month', picks: [0, 100, 300, 600, 1000], start: 0, optional: true, help: 'Software, gear, insurance, a desk, the phone, fees.' },
      { key: 'hoursWeek', label: 'Hours you work in a normal week', options: opt([20, 30, 40, 45, 50]) },
      { key: 'billable', label: 'How much of that time someone pays for', options: opt([0.5, 0.6, 0.7, 0.8, 0.9, 1], v => pct(v)), help: 'The rest is downtime: finding work, admin, messages, travel between jobs.' },
      { key: 'weeksOff', label: 'Weeks a year with no paid work', options: opt([0, 2, 4, 6, 8, 12]), help: 'Time off, holidays, sick days and slow weeks. A job pays for these; here they come out of the paid weeks.' },
      { key: 'unitHours', label: 'Paid hours in one job, session or project', options: opt([1, 2, 4, 8, 20], v => `${v} ${v === 1 ? 'hour' : 'hours'}`), optional: true, help: 'For a floor a job as well as an hour.' },
      FILING, PLACE,
      { key: 'gigPay', label: 'What a gig or app pays an hour, after its cut', picks: [15, 20, 25, 35, 50, 75], optional: true, help: 'For an offer or an app you are weighing. It shows next to your floor.' }],
    picks: [levelOf('From my bills and calendar', 'From my statements and tracked hours')],
    run: (v, ref) => gigPricing({ ...v, takeHome: v.spending }, ref),
    answer: (R, V) => ({ lead: 'Your floor, for each hour someone pays for', big: cents(R.hourly), line: `That pays ${big(R.need.life / 12)} a month of life${R.need.health ? `, ${big(R.need.health / 12)} of health cover` : ''}${R.need.retire ? `, ${big(R.need.retire)} a year for later` : ''}${R.costsYear ? `, ${big(R.costsYear / 12)} a month of costs` : ''} and ${big(R.tax)} a year of tax, over ${hrs(R.hours.year)} of paid work (${R.hours.weeks} weeks of ${+R.hours.billableWeek.toFixed(1)} hours).`,
      rows: [...(R.vs.ready ? [['What the gig pays', R.vs.atOrAbove ? `${cents(R.vs.gap)} an hour over your floor, ${pct(R.vs.share)} of it` : `${cents(-R.vs.gap)} an hour under your floor, ${pct(R.vs.share)} of it`, `${cents(R.vs.pay)} an hour`],
        ['Paid hours a month at that pay', `to bring in ${big(R.month)}; at your floor it takes ${Math.round(R.vs.floorHoursMonth)}`, `${Math.round(R.vs.hoursMonth)} hours`]] : []), ['A day', '8 paid hours', big(R.day)], ...(R.unit != null ? [['One job', `${R.unitHours} paid ${R.unitHours === 1 ? 'hour' : 'hours'}`, big(R.unit)]] : []), ['What the work has to bring in', 'a month, before tax and costs', big(R.month)], ['If every hour you work were paid', `${pct(R.downtimeShare)} of the year is downtime or time off`, cents(R.ifEveryHour)], ['The tax in it', `${pct(R.taxShare)} of the profit`, `${big(R.tax)} a year`]],
      small: `${LEVEL_WORDS[V.level] ?? ''} ${placeWords(R)} Health cover and retirement are counted as paid after tax, so the floor sits a little high, on the safe side.`,
      fold: [...(R.vs.ready ? [['Show the math: the gig next to your floor', `Your floor: ${big(R.revenue)} a year (${big(R.profit)} profit before tax plus ${big(R.costsYear)} of costs) over ${hrs(R.hours.year)} = ${cents(R.hourly)} an hour.`, `The gig: ${cents(R.vs.pay)} an hour, ${R.vs.atOrAbove ? 'plus' : 'minus'} ${cents(Math.abs(R.vs.gap))} from the floor. ${big(R.month)} a month over ${cents(R.vs.pay)} = ${Math.round(R.vs.hoursMonth)} paid hours a month, next to ${Math.round(R.vs.floorHoursMonth)} at your floor.`, 'A gig\'s pay an hour is often before what the work costs you (miles, gear, the phone). Your floor already has your costs in it, so take the gig\'s own costs off its pay for a fair side by side.']] : []), ['What a floor is, and is not', 'A floor is the least that still pays for your life. It is not a price: what clients pay depends on the work and the market, and a price above the floor is what builds savings and slow months into the year.', 'The downtime line is the one that surprises people: at 60% paid time and six weeks off, only about half of the year\'s hours are billed.'], ['How it is worked out', 'The life, health cover and retirement for a year are what the work must leave after tax. The tax engine works out the profit before tax that leaves that (income tax, self-employment tax at 15.3% on 92.35% of profit, half of it deductible), the costs go on top, and the total is divided by the paid hours.']] }),
  },
  setaside: {
    title: 'Tax command center: what to set aside, and by when', why: 'Nobody takes tax out of money you earn on your own. One share of each payment, the four dates, the least that keeps the underpayment penalty away, and what is owed by the next date, all on one page.',
    fields: [{ key: 'profit', label: 'What the work clears in a year, after its costs', picks: PROFIT_PICKS, help: 'A guess at the whole year is fine. Profit, not what clients pay.' },
      { key: 'wages', label: 'A job\'s pay in a year, before tax, if you have one', picks: [0, 30000, 50000, 80000, 120000], start: 0, optional: true, help: 'Its own withholding is taken to cover it. The work\'s tax stacks on top, which is why a side gig can be taxed higher than you expect.' },
      FILING, PLACE,
      { key: 'earned', label: 'Profit so far this year', picks: [0, 5000, 15000, 30000, 60000], optional: true, help: 'For what is owed so far.' },
      { key: 'set', label: 'Set aside so far, not paid yet', picks: [0, 1000, 3000, 6000, 12000], start: 0, optional: true },
      { key: 'paid', label: 'Paid in estimates so far this year', picks: [0, 500, 1500, 3000, 6000], start: 0, optional: true, help: 'What you sent the IRS with Form 1040-ES (or IRS Direct Pay) this year.' },
      { key: 'lastYear', label: 'Last year\'s total tax', picks: [0, 2000, 5000, 10000, 20000], optional: true, help: 'The total tax line of last year\'s Form 1040 (line 24). For the safe harbor. Empty: this year\'s tax is used.' },
      { key: 'lastAgi', label: 'Last year\'s AGI over $150,000?', options: [['No', 'no'], ['Yes', 'yes'], ['Not sure', 'unsure']], start: 'unsure', when: v => v.lastYear != null, help: 'Adjusted gross income, line 11 of last year\'s Form 1040. Not sure uses the higher share, to be safe.' }],
    picks: [levelOf('From my books so far', 'From my books and last year\'s return')],
    run: (v, ref) => gigTaxCenter({ ...v, lastAgiOver: v.lastAgi === 'yes' ? true : v.lastAgi === 'no' ? false : null, today: todayIso() }, ref),
    answer: (R, V) => {
      const H = R.harbor, next = H.next ? day(H.next.date) : null;
      return { lead: 'Of each dollar the work clears, set aside about', big: pct(R.rate), line: `Out of a $100 payment that is ${cents(R.per100)}. For the year it comes to ${big(R.yearly)}, about ${big(R.quarterly)} at each of the four dates.${R.soFar.ready ? (R.soFar.toMove >= 1 ? ` On ${money(R.soFar.earned)} so far, ${big(R.soFar.owed)} is spoken for; with ${money(R.soFar.set)} set aside or paid, ${big(R.soFar.toMove)} is the next move.` : ` On ${money(R.soFar.earned)} so far, ${big(R.soFar.owed)} is spoken for, and what you set aside or paid covers it.`) : ''}`,
        rows: [['Income tax', R.wages ? 'stacked on top of the job\'s pay' : null, big(R.parts.income)], ['Self-employment tax', 'Social Security and Medicare, both halves', big(R.parts.selfEmployment)], ...(R.parts.state ? [['State and city', 'its own rules; not in the safe harbor', big(R.parts.state)]] : []),
          ['Safe harbor: the least in estimates this year', HARBOR_WHY[H.none ?? H.which](R), big(H.need)],
          ...(H.need > 0 ? [['At each date', H.dates.map(d => `${day(d.date)}${d.passed ? ' (passed)' : ''}`).join(', '), big(H.each)],
            [next ? `Owed in estimates by ${next}` : 'Owed in estimates for the year', `${money(Math.round(H.byNext))} in all by then, ${money(H.paid)} paid so far`, H.toNext >= 1 ? big(H.toNext) : 'Covered']] : []),
          ['To owe nothing in April', 'this year\'s federal tax less withholding and estimates paid', big(H.fullYear)]],
        small: `${LEVEL_WORDS[V.level] ?? ''} ${placeWords(R)} ${QBI}`,
        fold: [['Show the math: safe harbor', `This year's federal tax: ${big(R.federal)} (the job's income tax ${big(R.jobFederal)}, the work's income tax ${big(R.parts.income)}, self-employment tax ${big(R.parts.selfEmployment)}). Withheld by a job: ${big(R.withheld)}${R.withheldGuess ? ', taken as the job\'s own income tax' : ''}.`,
          H.none === 'zero' ? 'Last year\'s tax was $0 over a 12-month year, so no estimated tax is due this year (for a U.S. citizen or resident the whole year).' : `${pct(H.rule.current)} of this year's tax is ${big(H.current)}.${H.prior != null ? ` ${pct(H.priorShare)} of last year's ${big(H.lastYear)} is ${big(H.prior)}.` : ' Add last year\'s total tax to see the other test.'} The smaller, ${big(H.required)}, less ${big(H.withheld)} withheld, is ${big(H.need)} in estimates${H.none === 'small' ? `; but with less than ${money(H.rule.owe)} due after withholding, none are needed` : ''}.`,
          H.need > 0 ? `A quarter at each date: ${big(H.each)}. By each date the total paid reaches 25%, 50%, 75% and 100% of it. ${H.catchUp >= 1 ? `Recalculating: ${big(H.byNow)} was the line for the dates already passed and ${money(H.paid)} is paid, so the next date carries ${big(H.toNext)}.` : ''}` : 'No dates to plan for.',
          'Rules: IRS 2026 Form 1040-ES and Publication 505 (2026), read Nov 26 2026. The dates are the Form 1040-ES due dates; a date on a weekend or a holiday moves to the next business day.'],
          ['What safe harbor means', 'Safe harbor is the IRS rule that keeps the underpayment penalty away even when the year runs higher than planned: pay at least the smaller of 90% of this year\'s tax or 100% of last year\'s (110% when last year\'s AGI was over $150,000) through withholding and estimates. You still owe the rest in April, but with no penalty on top.', 'The set-aside above is what the whole year is likely to cost. The safe harbor is the least to send before April. Many people send the safe harbor amount and keep the rest set aside in savings until April.'],
          ['Where to keep it', 'A separate savings account just for tax makes it one transfer when a payment lands, and it earns interest until the date. It is still your money until then, just spoken for.']] };
    },
  },
  gigretire: {
    title: 'Solo 401(k), SEP or IRA: which first?', why: 'Working for yourself means picking your own retirement account. Your profit decides how much each one can hold, and that usually decides which to open first.',
    fields: [{ key: 'profit', label: 'What the work clears in a year, after its costs', picks: PROFIT_PICKS },
      { key: 'age', label: 'Your age this year', options: opt([25, 30, 35, 40, 45, 50, 55, 60, 65]), help: 'From 50, catch-up amounts are added.' },
      { key: 'deferredAtJob', label: 'Already put in a 401(k) or 403(b) at a job this year', picks: [0, 5000, 10000, 20000], start: 0, optional: true, help: 'Your own part of a 401(k) has one limit per person, across every plan.' },
      { key: 'want', label: 'What you would like to put in this year', picks: [3000, 7500, 15000, 25000, 40000], optional: true, help: 'Leave it empty to see the most each one holds.' }],
    run: (v, ref) => gigRetire(v, ref),
    answer: R => {
      const NAME = { solo: 'A Solo 401(k)', sep: 'A SEP IRA', ira: 'An IRA' };
      if (!R.first) return { lead: 'At this profit', big: 'An IRA, from other pay', line: 'The work leaves nothing after half the self-employment tax, so these plans have no room on it this year. An IRA can still take money from a job\'s pay.' };
      return { lead: R.want == null ? 'Holds the most on your profit' : `To put in ${money(R.want)}, the simplest that holds it`, big: NAME[R.first],
        line: R.want == null ? `${NAME[R.first]} holds up to ${big(R.first === 'solo' ? R.solo.total : R.sep)} this year, and an IRA adds up to ${big(R.ira)} on top.` : R.fits ? `It holds up to ${big(R.first === 'ira' ? R.ira : R.first === 'sep' ? R.sep : R.solo.total)}, so your ${money(R.want)} fits.${R.first !== 'ira' ? ` An IRA on top adds up to ${big(R.ira)}.` : ''}` : `Even with an IRA on top it holds ${big(R.withIra)}, ${big(R.short)} under what you want. That is the most these limits allow on this profit.`,
        rows: [['Solo 401(k)', `${big(R.solo.defer)} your part${R.solo.catchUp ? ` + ${big(R.solo.catchUp)} catch-up` : ''} + ${big(R.solo.employer)} the business's 20%`, big(R.solo.total)], ['SEP IRA', '20% of the base, from the business', big(R.sep)], ['IRA, Roth or traditional', 'its own limit, on top of either', big(R.ira)], ['The base', `profit less half the self-employment tax (${big(R.seHalf)})`, big(R.base)]],
        small: 'The 2026 limits from the IRS (dated in the plan\'s reference data). Your part of a 401(k) counts against one limit across all your plans.',
        fold: [['How "which first" is picked', `The rule here is the plan's own, not the IRS's: open the one with the least paperwork that holds what you want. An IRA opens in minutes and has no plan to run. A SEP is one short form. A Solo 401(k) needs a plan document, and a yearly filing once it holds more than ${money(R.limits.filing5500)}; in return it lets you put in your own part as well as the business's, which is why it holds far more on a small profit.`, 'Roth or traditional is a separate choice: Roth means tax now and none later, traditional the other way round. A Roth IRA has an income limit.'], ['Where the numbers come from', `The business's part is 25% of pay for an employee, which works out to 20% of net earnings for an owner (IRS Publication 560). The 2026 limits are from the IRS news release IR-2025-111 and Notice 2025-67: ${money(R.limits.deferral)} your own part, ${money(R.limits.total)} in all, ${money(R.limits.ira)} for an IRA, catch-up from 50, and pay counted up to ${money(R.limits.compCap)}.`, 'Deadlines for opening each plan and for putting money in differ; check them with the provider before the year ends.']] };
    },
  },
  gigapps: {
    title: 'Do my apps add up?', why: 'Several apps, tips on some, cash on top: the earnings screens and the bank rarely match line by line. One pass puts them side by side.',
    waiting: 'Fill in what one app says you earned. Use the same stretch for every app: last week, or last month.',
    fields: [{ key: 'stretch', label: 'The stretch these numbers cover', options: [['A week', 7], ['Two weeks', 14], ['A month', 30]], start: 7 },
      ...appFields(1), ...appFields(2), ...appFields(3), { key: 'cash', label: 'Cash tips in the same stretch', picks: [0, 25, 75, 150, 300], start: 0, optional: true }],
    picks: [levelOf('From the app screens', 'From the app screens and the bank')],
    run: (v, ref) => gigPayoutsOf({ apps: [1, 2, 3].map(i => ({ name: v[`app${i}Name`], earned: v[`app${i}Earned`], tips: v[`app${i}Tips`], fee: v[`app${i}Fee`], landed: v[`app${i}Landed`], payout: v[`app${i}Payout`], hold: v[`app${i}Hold`] })), cash: v.cash, stretchDays: v.stretch }, ref.platforms),
    answer: (R, V) => ({ lead: 'Everything the work brought in, tips and cash in', big: big(R.all), line: `${R.rows.length === 1 ? R.top.name : `${R.rows.length} apps`}: ${big(R.earned)}, of which ${big(R.appTips)} is tips; ${big(R.cash)} in cash tips. ${R.landed == null ? 'Add what reached the bank to check each one.' : R.toCheck ? `${R.toCheck === 1 ? 'One app does' : `${R.toCheck} apps do`} not match the bank yet, by ${big(Math.abs(R.gap))} in all.` : R.onWay ? 'The rest of what the apps show can still be on its way to the bank.' : 'What the apps show matches what reached the bank.'}`,
      rows: [...R.rows.map(r => [r.name, `${pct(r.share)} of it all${r.fee ? `, fee ${big(r.fee)} (${pct(r.feeShare, 1)})` : ''}; ${r.gap != null && Math.abs(r.gap) >= 1 ? `${big(Math.abs(r.gap))} ` : ''}${APP_STATE[r.state]}`, big(r.earned)]),
        ...R.rows.map(r => [`${r.name}: when it lands`, r.window == null ? 'Tap how often it pays out and the days to your bank, from the app\'s payout list' : `pays out ${PAYOUT_WORDS[r.payout]}, then ${daysWord(r.holdDays)} to the bank${r.from === 'page' ? ` (its own help page, read ${day(r.own.read)})` : ' (your taps)'}`, r.onWayMax == null ? 'Tap it' : `up to ${big(r.onWayMax)} on its way`])],
      small: `${LEVEL_WORDS[V.level] ?? ''} Fees in all: ${big(R.fee)} (${pct(R.feeShare, 1)} of what the apps show). Tips in all: ${big(R.tips)}. Card tips and cash tips are income, and a reported tip may count toward the federal tips deduction (the Taxes screen of the whole plan works that out).`,
      fold: [['Show the math: payout timing', 'On its way, at most: what an app shows for the stretch, after its fee, times (the days of one payout cycle + the days to the bank) over the days of the stretch, never more than all of it. A week is 7 days, a month 30. A row short of the bank by no more than that reads as still on its way.', 'Timing comes from your own taps first. For Uber, DoorDash and Upwork it can come from their own help pages (read Nov 26 2026); other apps wait for your taps, because their pages could not be read from here.'], ['When an app and the bank do not match', 'Most often a payout is still on its way: apps hold earnings for a few days before they pay out. Other usual reasons: a fee for cashing out instantly, a tip added after the trip, an adjustment or a refund. Look at the app\'s payout list, not its earnings screen, for the dates.', 'Keep each app\'s year-end tax form next to its earnings screen: the form can show a different total, because it may count what customers paid before the app\'s cut.']] }),
  },
  profitfirst: {
    title: 'Profit First for side income', why: 'Profit First turns the usual order around: take your share first, and run the work on what is left. Each payment is split the day it lands.',
    fields: [{ key: 'income', label: 'What the side work brings in a month', picks: [500, 1000, 2000, 4000, 8000], help: 'Less anything passed straight through, like materials you resell. Rough is fine.' },
      { key: 'split', label: 'The split', options: [['The book\'s sample', 'sample'], ['My own', 'mine']], start: 'sample' },
      ...GIG_PF_KEYS.map(k => ({ key: `pf_${k}`, label: `${PF_WORDS[k]} (your share)`, options: opt(k === 'owner' ? [0.3, 0.4, 0.5, 0.6, 0.7] : k === 'opex' ? [0.1, 0.2, 0.3, 0.4, 0.5] : k === 'tax' ? [0.1, 0.15, 0.2, 0.25, 0.3, 0.35] : [0.01, 0.03, 0.05, 0.1, 0.15], v => pct(v)), help: PF_HELP[k], when: v => v.split === 'mine' }))],
    run: v => gigProfitFirstOf({ income: v.income, pcts: v.split === 'mine' ? (GIG_PF_KEYS.every(k => v[`pf_${k}`] != null) ? Object.fromEntries(GIG_PF_KEYS.map(k => [k, v[`pf_${k}`]])) : null) : GIG_PF_SAMPLE }),
    waiting: 'Tap the monthly amount, and with your own split, a share for each of the four.',
    answer: (R, V) => ({ lead: 'Each month, pay to you is', big: big(R.of.owner), line: `${big(R.of.profit)} profit, ${big(R.of.tax)} for tax, ${big(R.of.opex)} to run the work${R.left >= 1 ? `, and ${big(R.left)} not given a place yet (your shares add to ${pct(R.total)})` : ''}. ${V.split === 'sample' ? 'These are the book\'s sample shares.' : 'These are your own shares.'}`,
      rows: R.parts.map(p => [PF_WORDS[p.key], `${pct(p.pct)}${V.split === 'sample' ? ', the book\'s sample' : ''}`, big(p.amount)]),
      small: 'The tax share is a placeholder: "How much of each payment is the tax?" works out yours from your own numbers.',
      fold: [['What Profit First is', 'Profit First is a cash method from the book of the same name by Mike Michalowicz. Each payment goes into an income account, and on a set rhythm it is moved out by shares into separate accounts: profit, pay to you, tax, and running costs. The work then runs on what is in the running-costs account, so profit is not just whatever happens to be left.', 'The book suggests starting from the shares you have now and moving a little toward its targets each quarter. Its sample for a business under $250,000 of real revenue is 5% profit, 50% pay to the owner, 15% tax and 30% running costs. For side income, "pay to you" can be the part that goes to your goals.']] }),
  },
};
// The shelf on one.html, in this order (invoices.html is the tracker page of its own).
export const GIG_SHELF = [['freelance', 'The least I can charge'], ['setaside', 'Tax command center'], ['invoices', 'Who still owes me?'], ['gigretire', 'Solo 401(k), SEP or IRA'], ['gigapps', 'Do my apps add up?'], ['profitfirst', 'Profit First for side income']];
