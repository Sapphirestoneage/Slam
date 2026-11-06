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
    debtFreeMonths: { value: 3, unit: 'months', note: '$90 + $750 = $840 a month on $1,800 at 27%: 2.2, so 3 months.' },
    monthsToFi: { value: 345, unit: 'months', note: 'Batch 12, freed money follows the FOO: 3 months on heavy debt, then FI number $2,600 x 12 / 4% = $780,000. 3 months adding nothing ($3,000 grows to $3,051), then $750 + $90 = $840 a month: 324.4, so 325 months.7,550 of big e left / $840 a month = 21 months, so 24 months with nothing going in ($3,000 grows to $3,435). Then $840 a month at 7% real to the $780,000 FI number: 24 + ln(($780,000 (g-1) + $840) / ($3,435 (g-1) + $840)) / ln g = 345.0, so 345 months.' },
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
