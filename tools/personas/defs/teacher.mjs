// Dana: a public school teacher on PSLF (batch 29). Federal loans on IBR, 48 qualifying payments made, so the plan
// must never tell her to pay the loan off fast: PSLF forgives what is left after 72 more payments.
export default {
  id: 'teacher', order: 14, name: 'Dana Persona',
  about: 'Made up. Public school teacher in Pennsylvania, $58,000 gross, $3,900 a month take-home, gut $2,900 not including debt, checking $1,500, savings $6,000, 403(b) $12,000, federal student loans $48,000 at 5.5% on IBR paying $263, PSLF with 48 of 120 qualifying payments made, rents, born 1994.',
  profile: {
    firstName: 'Dana', lastName: 'Persona', birthYear: 1994, birthMonth: 5, state: 'PA', household: 'Solo', mode: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: false, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Employer',
    areas: { cash: true, investments: true, real: false, debt: true },
  },
  records: [
    { kind: 'income', type: 'Job', name: 'School district salary', amount: 3900, per: 'month', values: { basis: 'Both', gross: 58000, payFrequency: 'month', incomeType: 'W-2' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 2900, status: 'Roughly', values: { includesDebtPayments: false, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 1500 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Savings', values: { group: 'cash', balance: 6000 } },
    { kind: 'account', type: '403(b)', name: '403(b)', values: { group: 'investment', balance: 12000, taxType: 'Pretax' } },
    { kind: 'debt', type: 'Student loan', name: 'Federal student loans', values: { balance: 48000, apr: 0.055, payment: 263, federal: 'Federal', plan: 'IBR', pslf: 'Yes', paymentsLeft: 72, firstBorrowed: 'July 2014 to June 2026' } },
    { kind: 'bill', name: 'Rent', amount: 1200, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } },
  ],
  expected: {
    takeHome: { value: 3900, unit: 'money', note: '$3,900 a month take-home, as typed.' },
    netWorth: { value: -28500, unit: 'money', note: '$1,500 + $6,000 + $12,000 - $48,000 = -$28,500.' },
    surplus: { value: 737, unit: 'money', note: '$3,900 - $2,900 - $263 loan payment (outside the gut) = $737.' },
    fooStep: { value: '4', unit: 'step', note: 'Step 1 done ($7,500 of cash covers the buffer and $1,000 little e), no match on file, and the PSLF loan is never heavy debt, so step 3 is done. big e is not full.' },
    debtFreeMonths: { value: 72, unit: 'months', note: 'The loan keeps its own $263 payment (a PSLF loan takes no extra) and PSLF forgives what is left after the 72 payments still to make: debt free in 72 months.' },
    bigETarget: { value: 18560, unit: 'money', note: 'Age 32 / 5 = 6.4 months x $2,900 = $18,560.' },
  },
  // Batch 42 (the lender's-eye view, M9W): a plain W-2 household, what Report › Lender's view should say.
  lender: {
    earned: { value: 4833.33, note: '$58,000 / 12.' },
    mortgageIncome: { value: 4833.33, note: 'A W-2 salary counts in full.' },
    landlordIncome: { value: 4833.33, note: 'The same.' },
    dti: { value: 0.0544, tol: 0.0005, note: 'The IBR payment $263 / $4,833.33 = 5.4%.' },
    gap: { value: 0, note: 'Nothing earned is out of sight.' },
    loan: { value: 149830, tol: 50, note: 'min(28% x $4,833.33 = $1,353.33, 36% x $4,833.33 - $263 = $1,477) = $1,353.33; 75% = $1,015 at 7.18% for 30 years x 147.616 = $149,830.' },
    says: ['4 times', 'At or over the 3 times line', 'No cards on file', 'Everything you earn'],
  },
  // Batch 47 (the benefits cliff, M9B): Plan › Raise and benefits says it is nowhere near a line.
  cliff: {
    near: { value: false, note: '$58,000 a year in PA with work coverage: SNAP $20,748 and the EITC $19,540 are below her.' },
    says: ['Nowhere near a benefit line'],
  },
  cannot: [
    'PSLF employer certification and the count of qualifying payments are typed by hand (Payments left); SLAM does not read them from the servicer.',
  ],
};
