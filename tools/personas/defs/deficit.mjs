// The gap case: spending more than comes in, a payday loan rolled over, a card, nothing saved.
export default {
  id: 'deficit', order: 4, name: 'Dana Deficit',
  about: 'Made up. Take-home $2,600, spending $3,000, a payday loan rolled over every 2 weeks plus a card, no savings (the gap mode case).',
  profile: {
    firstName: 'Dana', lastName: 'Deficit', birthYear: 1993, birthMonth: 11, state: 'OH', household: 'Solo', mode: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: true, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Medicaid',
    areas: { cash: true, investments: false, real: true, debt: true },
    worry: 'The payday loan', goalWords: 'Get off the payday loan',
  },
  records: [
    { kind: 'income', type: 'Job', name: 'Paycheck', amount: 2600, per: 'month', values: { basis: 'Take-home', payFrequency: 'twice a month', payDays: [15, 30], incomeType: 'W-2' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 3000, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 50 } },
    { kind: 'asset', type: 'Car', name: 'Car (paid off)', values: { value: 3500, financed: 'Paid off' } },
    { kind: 'debt', type: 'Payday or cash advance', name: 'Payday loan', values: { balance: 800, apr: 3.9, payment: 260, fee: 120, periods: 26 } },
    { kind: 'debt', type: 'Credit card', name: 'Store card', values: { balance: 2500, apr: 0.2999, payment: 75, payChoice: 'Custom' } },
    { kind: 'bill', name: 'Rent', amount: 1100, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } },
  ],
  expected: {
    takeHome: { value: 2600, unit: 'money', note: 'Typed as $2,600 a month.' },
    netWorth: { value: 250, unit: 'money', note: '$50 + $3,500 car - $800 - $2,500 = $250 (below zero without the car: -$3,250).' },
    surplus: { value: -400, unit: 'money', note: '$2,600 - $3,000 (debt payments included) = -$400: the gap.' },
    savingsRate: { value: -0.1538, unit: 'pct', note: '-$400 / $2,600.' },
    fooStep: { value: '1', unit: 'step', note: 'Payday debt is not at $0 and the buffer is empty.' },
    debtFreeMonths: { value: 78, unit: 'months', note: 'Alone the payday loan never pays off: its $260 a month is only the rollover fee ($120 x 26 / 12), and at 390% the interest is 3.9 / 12 x $800 = $260. The card alone: n = -ln(1 - 0.2999/12 x 2,500 / 75) / ln(1 + 0.2999/12) = 72.5, so 73. Then the card\'s $75 rolls to the payday loan: $335 a month clears it in 5 more, 78 months, with about $19,000 of fees paid on an $800 loan along the way.' },
    monthsToFi: { value: 'never', unit: 'months', note: 'Nothing invested, a gap every month.' },
    runwayMonths: { value: 0.0167, unit: 'months', tol: 0.005, note: '$50 / $3,000.' },
    littleEFull: { value: false, unit: 'bool', note: '$50.' },
    cardFullMonths: { value: 43, unit: 'months', note: 'Current vs Proposed borrows the $400 gap on the store card at 29.99% (QUESTIONS 320). No limit is typed, so the room is the typical limit at 33 (Experian, Millennials, $32,727) less the $2,500 owed: $30,227. Owed after n months = 400 x ((1 + 0.2999/12)^n - 1) / (0.2999/12): $29,133 at 42, $30,262 at 43, so the cards are full in month 43 (Jun 2030) and net worth in 5 and 10 years is not a number (it was -$52,428 and -$265,580 before the cap).' },
  },
  // Batch 47 (the benefits cliff, M9B): on Medicaid in Ohio (About you) with $36,100 a year before tax, already over the
  // 138% line ($22,024.80), so the screen says it may end at renewal and leaves it out of the raise.
  cliff: {
    near: { value: true, note: 'Medicaid is a Getting it (from About you).' },
    medicaidLine: { value: 22024.8, note: '138% x $15,960.' },
    past: { value: ['medicaid'], note: '$36,117 (take-home $2,600 grossed up) is over $22,024.80.' },
    raise5000: { value: 4017.5, tol: 0.05, note: 'Nothing counted to lose: $5,000 less 12% federal, 7.65% FICA (Ohio is not taxed in SLAM yet) = $4,017.50.' },
    says: ['already over the line for Medicaid'],
  },
  cannot: [
    'A payday loan is a lump due every 2 weeks with a fee, not a monthly payment against an APR; the fee fields exist (Fee per period, Periods a year) but the payoff math reads APR and Payment, so the coach has to turn the fee into both.',
  ],
};
