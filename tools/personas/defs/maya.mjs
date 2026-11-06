// Maya: the middle case. A real surplus, a card, some savings and a little invested.
export default {
  id: 'maya', order: 3, name: 'Maya Persona',
  about: 'Made up. Take-home $5,200 a month ($2,400 every 2 weeks), gut $3,500 not including debt, checking $1,200, savings $4,000, invested $15,000, cards $6,000 paying $200 at a guessed 25%, rents, no car, born 1996.',
  profile: {
    firstName: 'Maya', lastName: 'Persona', birthYear: 1996, birthMonth: 8, state: 'NY', nyc: true, household: 'Solo', mode: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: false, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Employer',
    areas: { cash: true, investments: true, real: false, debt: true },
  },
  records: [
    { kind: 'income', type: 'Job', name: 'Paycheck', amount: 2400, per: '2 weeks', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 3500, status: 'Roughly', values: { includesDebtPayments: false, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 1200 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Savings', values: { group: 'cash', balance: 4000 } },
    { kind: 'account', type: 'All investments', name: 'Investments (all accounts)', status: 'Roughly', values: { group: 'investment', balance: 15000 } },
    { kind: 'debt', type: 'Credit card', name: 'Credit cards (total)', fieldStatus: { apr: 'Not sure' }, values: { balance: 6000, payment: 200, payChoice: 'Custom' } },
    { kind: 'bill', name: 'Rent', amount: 1750, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } },
  ],
  expected: {
    takeHome: { value: 5200, unit: 'money', note: '$2,400 x 26 / 12 = $5,200.' },
    netWorth: { value: 14200, unit: 'money', note: '$1,200 + $4,000 + $15,000 - $6,000 = $14,200.' },
    surplus: { value: 1500, unit: 'money', note: '$5,200 - $3,500 - $200 card payment (outside the gut) = $1,500.' },
    savingsRate: { value: 0.2885, unit: 'pct', note: '$1,500 / $5,200 = 28.8%.' },
    fooStep: { value: '3', unit: 'step', note: 'Step 1 done: $5,200 cash covers the $1,615 buffer and $1,000 little e. No match on file. The card is heavy debt.' },
    debtFreeMonths: { value: 4, unit: 'months', note: 'The surplus goes to the card first: $200 + $1,500 = $1,700 a month at a guessed 25%: n = -ln(1 - 0.25/12 x 6,000 / 1,700) / ln(1 + 0.25/12) = 3.7, so 4 months.' },
    heavyDebtMonths: { value: 4, unit: 'months', note: 'The card is the only debt.' },
    fiNumber: { value: 1050000, unit: 'money', note: '$3,500 x 12 / 4% (the card payment ends, so it is not in retirement spending).' },
    monthsToFi: { value: 262, unit: 'months', note: '4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).' },
    runwayMonths: { value: 1.486, unit: 'months', tol: 0.01, note: '$5,200 / $3,500 = 1.49 months.' },
    bigETarget: { value: 21000, unit: 'money', note: 'Age 30 / 5 = 6 months x $3,500 = $21,000.' },
    littleEFull: { value: true, unit: 'bool', note: '$5,200 covers the buffer and $1,000 little e.' },
  },
  cannot: [],
};
