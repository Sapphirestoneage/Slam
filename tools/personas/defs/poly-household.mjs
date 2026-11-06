// Three adults sharing a home: Ana and Ben (married, the nesting pair) and Cam (Ana's partner, not married).
// SLAM holds two people (Me, Partner, Joint), so Cam can only be a roommate who pays a share: Cam's own money is missing.
export default {
  id: 'poly-household', order: 7, name: 'Ana, Ben and Cam',
  about: 'Made up. Three adults in one owned home: Ana and Ben married with combined money, Cam a partner who is not married. Custom splits: the mortgage 40/40/20, utilities in thirds, groceries 50/25/25.',
  profile: {
    firstName: 'Ana', lastName: 'Persona', partnerName: 'Ben', birthYear: 1990, birthMonth: 5, partnerBirthYear: 1988, state: 'OR',
    household: 'Couple', mode: 'Married merged', moneyStyle: 'Joint', roommates: 1,
    shared: { rent: false, utilities: true, internet: true, renters: false, groceries: true, household: true },
    sharedAs: { utilities: 'The whole bill', internet: 'The whole bill', groceries: 'The whole bill', household: 'The whole bill' },
    workSituation: 'Employed (W-2)', housing: 'Own', hasCar: true, hasPets: true, incomeStability: 'Steady', healthCoverage: 'Employer',
    areas: { cash: true, investments: true, real: true, debt: true },
  },
  client: { couple: true },
  records: [
    { kind: 'income', type: 'Job', name: "Ana's paycheck", owner: 'Me', amount: 5800, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'income', type: 'Partner job', name: "Ben's paycheck", owner: 'Partner', amount: 4200, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'income', type: 'Rental', name: "Cam's share of the house (20% mortgage, 1/3 utilities, 1/4 groceries)", owner: 'Joint', amount: 870, per: 'month', values: { incomeType: 'Other' } },
    { kind: 'spending', type: 'All in', name: 'Household spending, all in (whole bills)', amount: 7400, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Joint checking', owner: 'Joint', values: { group: 'cash', balance: 9000 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Joint HYSA', owner: 'Joint', values: { group: 'cash', balance: 20000 } },
    { kind: 'account', type: '401(k)', name: "Ana's 401(k)", owner: 'Me', values: { group: 'investment', balance: 60000 } },
    { kind: 'account', type: '403(b)', name: "Ben's 403(b)", owner: 'Partner', values: { group: 'investment', balance: 45000 } },
    { ref: 'home', kind: 'asset', type: 'Home', name: 'Home (Ana and Ben on the deed)', owner: 'Joint', values: { value: 550000, financed: 'Financed' } },
    { kind: 'debt', type: 'Mortgage', name: 'Mortgage', owner: 'Joint', linkedTo: '@home', values: { balance: 400000, apr: 0.055, payment: 2600 } },
    { kind: 'bill', name: 'Electric, gas, water', amount: 300, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable', whoPays: 'Split', myShare: 200 } },
    { kind: 'bill', name: 'Groceries', amount: 1000, values: { category: 'Groceries', draftt: 'Food', amountType: 'Variable', whoPays: 'Split', myShare: 750 } },
  ],
  expected: {
    takeHome: { value: 10870, unit: 'money', note: "$5,800 + $4,200 + Cam's $870 (20% of $2,600 = $520, 1/3 of $300 = $100, 1/4 of $1,000 = $250)." },
    netWorth: { value: 284000, unit: 'money', note: '$9,000 + $20,000 + $60,000 + $45,000 + $550,000 - $400,000 = $284,000 (Ana and Ben only; Cam has nowhere to go).' },
    surplus: { value: 3470, unit: 'money', note: '$10,870 - $7,400 whole bills = $3,470.' },
    savingsRate: { value: 0.3192, unit: 'pct', note: '$3,470 / $10,870.' },
    fooStep: { value: '4', unit: 'step', note: 'Step 1 done ($29,000), no match on file, no heavy debt. big e: Ana 36 / 5 = 7.2 x $7,400 = $53,280.' },
    debtFreeMonths: { value: 268, unit: 'months', note: 'n = -ln(1 - 0.055/12 x 400,000 / 2,600) / ln(1 + 0.055/12) = 267.1, so 268.' },
    monthsToFi: { value: 244, unit: 'months', note: 'FI number $7,400 x 12 / 4% = $2,220,000, $3,470 a month from $105,000: 243.3, so 244 months.' },
    runwayMonths: { value: 3.919, unit: 'months', tol: 0.01, note: '$29,000 / $7,400.' },
  },
  cannot: [
    'Three adults: the household holds Me, Partner and Joint only. Cam has no rows, no accounts, no debts, no tag; Cam can only appear as money coming in.',
    'Custom splits per person: a bill has Your share or a My share amount; there is no 40/40/20 or 50/25/25 split across three people, so each split is worked out by hand.',
    'Married plus a third partner: filing status and Joint halving assume exactly two people.',
  ],
};
