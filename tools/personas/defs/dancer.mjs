// A 1099 dancer: cash nights, house fees per shift, quarterly taxes set aside, no employer benefits, and banks that
// can close an account without warning, so money is spread across two banks and some cash at home.
export default {
  id: 'dancer', order: 9, name: 'Nova Dancer',
  about: 'Made up. 1099 dancer: about $7,500 a month gross in cash and card, house fees of $80 a shift (14 shifts, $1,120), 28% set aside for quarterly taxes, no employer benefits, accounts at two banks and cash at home in case a bank closes one.',
  profile: {
    firstName: 'Nova', lastName: 'Dancer', birthYear: 1997, birthMonth: 4, state: 'NV', household: 'Solo', mode: 'Solo',
    workSituation: 'Self-employed', housing: 'Rent', hasCar: true, hasPets: true, incomeStability: 'Unpredictable', healthCoverage: 'ACA',
    variable: { typical: 4600, lowest: 2800, setAside: 0.28, business: 1120 },
    areas: { cash: true, investments: false, real: true, debt: false },
  },
  records: [
    { kind: 'income', type: 'Self-employed', name: 'Dancing, after house fees and the tax set-aside', amount: 4600, per: 'month', status: 'Roughly', values: { basis: 'Take-home', incomeType: '1099' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 3300, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Cash on hand', name: 'Cash at home', values: { group: 'cash', balance: 2500 } },
    { kind: 'account', type: 'Checking', name: 'Checking (bank A)', values: { group: 'cash', balance: 1800 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Savings (online bank B)', values: { group: 'cash', balance: 4000, purpose: 'Emergency' } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Quarterly tax set-aside', values: { group: 'cash', balance: 3500, purpose: 'Sinking fund' } },
    { kind: 'asset', type: 'Car', name: 'Car (paid off)', values: { value: 12000, financed: 'Paid off' } },
    { kind: 'coverage', type: 'Health', name: 'ACA plan', amount: 280, per: 'month', values: { have: 'Have it', deductible: 5000, paidFrom: 'Budget' } },
  ],
  expected: {
    netWorth: { value: 23800, unit: 'money', note: '$2,500 + $1,800 + $4,000 + $3,500 + $12,000 car = $23,800 (the $3,500 is owed in January, so a coach would say $20,300).' },
    surplus: { value: 1300, unit: 'money', note: '$4,600 - $3,300 = $1,300.' },
    savingsRate: { value: 0.2826, unit: 'pct', note: '$1,300 / $4,600.' },
    fooStep: { value: '4', unit: 'step', note: 'Step 1 done, no match, no debt. big e: 29 / 5 = 5.8 x 1.5 (unpredictable) = 8.7 months x $3,300 = $28,710.' },
    debtFreeMonths: { value: 'none', unit: 'months', note: 'No debt.' },
    monthsToFi: { value: 296, unit: 'months', note: 'FI number $3,300 x 12 / 4% = $990,000; nothing invested; $1,300 a month: 296 months (about 24.7 years).' },
    runwayMonths: { value: 3.576, unit: 'months', tol: 0.01, note: '$11,800 / $3,300 (it counts the tax money; without it, 2.5 months).' },
    bigETarget: { value: 28710, unit: 'money', note: '8.7 x $3,300.' },
  },
  cannot: [
    'House fees per shift: no shift count or fee per shift; the coach nets them out by hand (Variable income has one business expenses box).',
    'Cash income: no cash versus deposited split, no place to say how much stays as cash.',
    'Quarterly taxes owed but not due: the set-aside counts as cash in the runway and the emergency fund; a Tax debt row would make it heavy debt.',
    'Bank-closure risk: no flag for an industry banks close accounts for, no second-bank plan.',
    'No employer benefits: nothing suggests a SEP IRA or Solo 401(k) for a 1099 earner with no investments.',
  ],
};
