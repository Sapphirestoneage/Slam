// A tipped W-2 bartender: a small paycheck, cash tips after tip-out, a slow January and February.
export default {
  id: 'bartender', order: 8, name: 'Riley Bartender',
  about: 'Made up. Tipped W-2: a paycheck of $900 every 2 weeks (wage plus card tips, after tax), about $1,400 a month in cash tips after tipping out 3% of sales, slow season January to February, a card.',
  profile: {
    firstName: 'Riley', lastName: 'Bartender', birthYear: 1999, birthMonth: 9, state: 'FL', household: 'Solo', mode: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Rent', roommates: 2, hasCar: true, hasPets: false, incomeStability: 'Varies', healthCoverage: 'ACA',
    variable: { typical: 3350, lowest: 2100, setAside: 0.1 },
    incomeGaps: [{ id: 'slow', name: 'Slow season (Jan to Feb), about one month short', start: '2027-01', months: 1 }],
    areas: { cash: true, investments: true, real: true, debt: true },
  },
  records: [
    { kind: 'income', type: 'Job', name: 'Paycheck (wage and card tips)', amount: 900, per: '2 weeks', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'income', type: 'Job', name: 'Cash tips, after tip-out', amount: 1400, per: 'month', status: 'Roughly', values: { basis: 'Take-home', incomeType: 'W-2' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 2600, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 1100 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Savings', values: { group: 'cash', balance: 600 } },
    { kind: 'account', type: 'Roth IRA', name: 'Roth IRA', values: { group: 'investment', balance: 3000 } },
    { kind: 'asset', type: 'Car', name: 'Car (paid off)', values: { value: 7000, financed: 'Paid off' } },
    { kind: 'debt', type: 'Credit card', name: 'Card', values: { balance: 1800, apr: 0.27, payment: 90, payChoice: 'Custom' } },
  ],
  expected: {
    takeHome: { value: 3350, unit: 'money', note: '$900 x 26 / 12 = $1,950 + $1,400 cash tips = $3,350.' },
    netWorth: { value: 9900, unit: 'money', note: '$1,100 + $600 + $3,000 + $7,000 - $1,800 = $9,900.' },
    surplus: { value: 750, unit: 'money', note: '$3,350 - $2,600 = $750 in a typical month (the slow months are about $2,100).' },
    savingsRate: { value: 0.2239, unit: 'pct', note: '$750 / $3,350.' },
    fooStep: { value: '1', unit: 'step', note: 'Buffer $2,600 x 24 / 52 = $1,200 and little e $1,000 need $2,200, and the slow season (within 12 months) needs one month, $2,600, all in step 1. Cash is $1,700.' },
    debtFreeMonths: { value: 7, unit: 'months', note: 'Step 1 first (question 217): $3,100 short in step 1 / $750 = 5 months while the card gets its $90: $1,800 x 1.0225^5 - $90 x 5.230 = $1,541. Then $840 a month: -ln(1 - 0.0225 x 1,541 / 840) / ln 1.0225 = 1.9, so 2 more: 7 months.' },
    monthsToFi: { value: 349, unit: 'months', note: 'Freed money follows the FOO with step 1 first: 5 months on the buffer, little e and slow-season gap, 2 on the card, 21 on big e, so 28 months with nothing new invested ($3,000 grows to $3,513 at 7% real). Then $840 a month to the $780,000 FI number: ln(($780,000 (g-1) + $840) / ($3,513 (g-1) + $840)) / ln g = 320.9, so 321: 349 months.' },
    runwayMonths: { value: 0.654, unit: 'months', tol: 0.01, note: '$1,700 / $2,600.' },
    bigETarget: { value: 17550, unit: 'money', note: 'Age 27 / 5 = 5.4 x 1.25 (income varies) = 6.75 months x $2,600 = $17,550.' },
    littleEFull: { value: false, unit: 'bool', note: '$1,700 fills the $1,200 buffer, then $500 of little e.' },
  },
  cannot: [
    'Tips: no cash tips versus card tips, no tip-out on sales; cash tips are a second Job row typed by hand.',
    'Variable income for a W-2 worker: the typical and lowest month boxes only show for Self-employed or Mixed, so a tipped W-2 worker cannot use them without calling the work Mixed.',
    'A slow season is a dip, not a gap: an income gap assumes no income for its months, so the season is typed as one month short.',
  ],
};
