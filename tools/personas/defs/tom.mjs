// Tom: a CPA. Every account, a home and a rental, FI by 50. His failure mode is technically correct but unusable:
// the app has to hold all of it without burying the answer.
export default {
  id: 'tom', order: 2, name: 'Tom Persona',
  about: 'Made up. CPA, $9,800 a month take-home, 401(k) with match, backdoor Roth, HSA, RSUs, home with a mortgage, a rental with a loan, a car, about $410,000 invested, FI age 50.',
  profile: {
    firstName: 'Tom', lastName: 'Persona', birthYear: 1988, birthMonth: 6, state: 'NJ', household: 'Solo', mode: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Own', hasCar: true, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Employer',
    hsaEligible: true, equityPay: true, areas: { cash: true, investments: true, real: true, debt: true },
    whyNow: 'Wants a second opinion on FI at 50', goalWords: 'Work optional at 50',
  },
  assumptions: { fiAge: 50 },
  records: [
    { kind: 'income', type: 'Job', name: 'Salary', amount: 9800, per: 'month', values: { basis: 'Both', gross: 185000, payFrequency: '2 weeks', incomeType: 'W-2', contributionPct: 0.10, hasMatch: 'Yes', matchPct: 0.5, matchCapPct: 0.06, hsaFsa: 160, equity: 'RSUs, about $40,000 a year, vesting quarterly' } },
    { kind: 'income', type: 'Rental', name: 'Rental, net of its loan and costs', amount: 400, per: 'month', values: { incomeType: 'Rental' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 6500, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 8000 } },
    { kind: 'account', type: 'Savings', name: 'HYSA', values: { group: 'cash', balance: 30000, purpose: 'Emergency' } },
    { kind: 'account', type: '401(k)', name: '401(k)', values: { group: 'investment', balance: 240000, taxType: 'Pretax' } },
    { kind: 'account', type: 'Roth IRA', name: 'Roth IRA (backdoor)', values: { group: 'investment', balance: 55000, contribution: 7500, contributionPer: 'Year', rothBasis: 38000 } },
    { kind: 'account', type: 'HSA', name: 'HSA', values: { group: 'investment', balance: 25000, hsaStyle: 'Self-directed' } },
    { kind: 'account', type: 'Brokerage', name: 'Brokerage (RSU shares)', values: { group: 'investment', balance: 90000, costBasis: 61000 } },
    { ref: 'home', kind: 'asset', type: 'Home', name: 'Home', values: { value: 650000, financed: 'Financed' } },
    { kind: 'debt', type: 'Mortgage', name: 'Mortgage', linkedTo: '@home', values: { balance: 380000, apr: 0.0325, payment: 1950 } },
    { ref: 'rental', kind: 'asset', type: 'Other property', name: 'Rental property', values: { value: 450000, financed: 'Financed' } },
    { kind: 'debt', type: 'Mortgage', name: 'Rental loan', linkedTo: '@rental', values: { balance: 290000, apr: 0.065, payment: 1850 } },
    { ref: 'car', kind: 'asset', type: 'Car', name: 'Car', values: { value: 28000, financed: 'Financed' } },
    { kind: 'debt', type: 'Car loan', name: 'Car loan', linkedTo: '@car', values: { balance: 15000, apr: 0.049, payment: 450 } },
    { kind: 'coverage', type: 'Health', name: 'Health (HDHP)', amount: 90, per: 'month', values: { have: 'Have it', deductible: 3000, paidFrom: 'Paycheck' } },
  ],
  expected: {
    takeHome: { value: 10200, unit: 'money', note: '$9,800 salary take-home + $400 net rental = $10,200.' },
    netWorth: { value: 891000, unit: 'money', note: 'Cash $38,000 + invested $410,000 + home $650,000 + rental $450,000 + car $28,000 = $1,576,000; minus $380,000 + $290,000 + $15,000 = $891,000.' },
    surplus: { value: 3700, unit: 'money', note: '$10,200 - $6,500 gut (all debt payments included) = $3,700.' },
    savingsRate: { value: 0.4821, unit: 'pct', note: '401(k) $185,000 x 10% / 12 = $1,541.67, HSA $160 x 26 / 12 = $346.67, match 50% of 6% x $185,000 / 12 = $462.50. ($3,700 + $1,888.33 + $462.50) / ($10,200 + $2,350.83) = 48.2%.' },
    fooStep: { value: '4', unit: 'step', note: 'Step 1 done ($38,000 covers the $3,000 buffer and $1,000 little e), match taken, no heavy debt. big e: 38 / 5 = 7.6 months x $6,500 = $49,400, and $34,000 is left for it.' },
    debtFreeMonths: { value: 254, unit: 'months', note: 'No heavy debt, so no surplus goes in; each loan pays its own payment and a paid-off loan\'s payment rolls to the next, highest rate first. Alone: car 36 months, mortgage 278, rental loan 350 (n = -ln(1 - 0.065/12 x 290,000 / 1,850) / ln(1 + 0.065/12)). Rolled, month by month: the car is gone at 36, its $450 joins the rental loan ($2,300), gone at 234, then $4,250 a month clears the mortgage at 254.' },
    fiNumber: { value: 1950000, unit: 'money', note: '$6,500 x 12 / 4% = $1,950,000.' },
    monthsToFi: { value: 129, unit: 'months', note: 'Batch 12, freed money follows the FOO: Investing $1,888.33 + $462.50 + $3,700 = $6,050.83 a month, 7% real: g = 1.07^(1/12); n = ln((1,950,000 (g-1) + 6,050.83) / (410,000 (g-1) + 6,050.83)) / ln g = 126.5, so 127 months (about 10.5 years, age 48 or 49).5,400 of big e left / $3,075 a month = 6 months, so 6 months with $2,975.83 a month going in ($410,000 grows to $442,217). Then $6,050.83 a month at 7% real to the Investing $1,888.33 + $462.50 + $3,700 = $6,050.83 a month, 7% real: g = 1.07^(1/12); n = ln((1,950,000 (g-1) + 6,050.83) / (410,000 (g-1) + 6,050.83)) / ln g = 126.5, so 127 months (about 10.5 years, age 48 or 49).,950,000 FI number: 6 + ln((Investing $1,888.33 + $462.50 + $3,700 = $6,050.83 a month, 7% real: g = 1.07^(1/12); n = ln((1,950,000 (g-1) + 6,050.83) / (410,000 (g-1) + 6,050.83)) / ln g = 126.5, so 127 months (about 10.5 years, age 48 or 49).,950,000 (g-1) + $6,050.83) / ($442,217 (g-1) + $6,050.83)) / ln g = 128.7, so 129 months.' },
    runwayMonths: { value: 5.846, unit: 'months', tol: 0.01, note: '$38,000 / $6,500 = 5.85 months.' },
    bigETarget: { value: 49400, unit: 'money', note: '7.6 x $6,500.' },
    littleEFull: { value: true, unit: 'bool', note: 'Highest deductible $3,000, so little e is $1,000, and it is full.' },
  },
  // Batch 42 (the lender's-eye view, M9W): an owner, so the home payment is the front end.
  lender: {
    earned: { value: 15816.67, note: '$185,000 / 12 + $400 net rent.' },
    mortgageIncome: { value: 15816.67, note: 'Salary and the net rent both count.' },
    dti: { value: 0.1517, tol: 0.0005, note: 'Home $1,950 + car $450 = $2,400 / $15,816.67 = 15.2% (the rental loan is netted in the $400 rent).' },
    gap: { value: 0, note: 'Nothing out of sight.' },
    says: ['$1,950 of it the home, 12.3% on its own'],
  },
  // Batch 47 (the benefits cliff, M9B): Plan › Raise and benefits says it is nowhere near a line.
  cliff: {
    near: { value: false, note: '$189,800 a year in NJ with work coverage: every line is far below.' },
    says: ['Nowhere near a benefit line'],
  },
  cannot: [
    'RSUs: only a text box (Income › ESPP and RSUs). Vests are not income, not a windfall on the calendar, and not a concentration flag on the brokerage.',
    'Rental property: no rent, vacancy, costs or depreciation. The rent is typed as one net number on Income, and the rental loan sits on Debt as a second Mortgage.',
    'Backdoor Roth: the step 5 note mentions it, but there is no traditional IRA basis or pro-rata check.',
  ],
};
