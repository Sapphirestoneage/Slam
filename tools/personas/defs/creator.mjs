// A fan-site creator with a part-time W-2 job: platform payouts after a 20% fee, chargebacks taken back later, an HSA.
export default {
  id: 'creator', order: 10, name: 'Kai Creator',
  about: 'Made up. Fan-site creator paid by platform payouts (about $2,500 a month after the 20% platform fee, less about $150 in chargebacks and a tax set-aside: $2,000 kept), a part-time W-2 job at $1,100 every 2 weeks with $50 a paycheck into an HSA, a card.',
  profile: {
    firstName: 'Kai', lastName: 'Creator', birthYear: 2000, birthMonth: 1, state: 'CA', household: 'Solo', mode: 'Solo',
    workSituation: 'Mixed', housing: 'Rent', roommates: 1, hasCar: false, hasPets: false, incomeStability: 'Varies', healthCoverage: 'Employer',
    hsaEligible: true, variable: { typical: 2000, lowest: 900, setAside: 0.25 },
    areas: { cash: true, investments: true, real: false, debt: true },
  },
  records: [
    { kind: 'income', type: 'Job', name: 'Part-time job', amount: 1100, per: '2 weeks', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2', hsaFsa: 50 } },
    { kind: 'income', type: 'Self-employed', name: 'Platform payouts, after fees, chargebacks and the tax set-aside', amount: 2000, per: 'month', status: 'Roughly', values: { basis: 'Take-home', incomeType: '1099' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 3600, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 2200 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'HYSA', values: { group: 'cash', balance: 6000 } },
    { kind: 'account', type: 'HSA', name: 'HSA', values: { group: 'investment', balance: 3500, hsaStyle: 'Self-directed' } },
    { kind: 'account', type: 'Roth IRA', name: 'Roth IRA', values: { group: 'investment', balance: 9000 } },
    { kind: 'debt', type: 'Credit card', name: 'Card', values: { balance: 2900, apr: 0.21, payment: 300, payChoice: 'Custom' } },
    { kind: 'coverage', type: 'Health', name: 'HDHP through work', amount: 60, per: 'month', values: { have: 'Have it', deductible: 3000, paidFrom: 'Paycheck' } },
  ],
  expected: {
    takeHome: { value: 4383.33, unit: 'money', note: '$1,100 x 26 / 12 = $2,383.33 + $2,000 payouts.' },
    netWorth: { value: 17800, unit: 'money', note: '$2,200 + $6,000 + $3,500 + $9,000 - $2,900 = $17,800.' },
    surplus: { value: 783.33, unit: 'money', note: '$4,383.33 - $3,600 = $783.33.' },
    savingsRate: { value: 0.1985, unit: 'pct', note: 'HSA $50 x 26 / 12 = $108.33 from the paycheck. ($783.33 + $108.33) / ($4,383.33 + $108.33) = 19.9%.' },
    fooStep: { value: '3', unit: 'step', note: 'Step 1 done ($8,200 cash), no match, the card is heavy.' },
    debtFreeMonths: { value: 3, unit: 'months', note: '$300 + $783.33 = $1,083.33 a month on $2,900 at 21%: 2.8, so 3 months.' },
    monthsToFi: { value: 329, unit: 'months', note: 'Batch 12, freed money follows the FOO: 3 months on heavy debt, then FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.7,862 of big e left / FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.,083.33 a month = 17 months, so 20 months with FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.08.33 a month going in (FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.2,500 grows to FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.6,279). Then FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.,191.67 a month at 7% real to the FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.,080,000 FI number: 20 + ln((FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.,080,000 (g-1) + FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.,191.67) / (FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.6,279 (g-1) + FI number $3,600 x 12 / 4% = $1,080,000. 3 months at $108.33 (the HSA), then $108.33 + $783.33 + $300 = $1,191.67 a month: 313.8, so 314 months.,191.67)) / ln g = 328.2, so 329 months.' },
    runwayMonths: { value: 2.278, unit: 'months', tol: 0.01, note: '$8,200 / $3,600.' },
    bigETarget: { value: 23400, unit: 'money', note: 'Age 26 / 5 = 5.2 x 1.25 (varies) = 6.5 x $3,600 = $23,400.' },
  },
  cannot: [
    'Platform payouts: no gross, platform fee, payout schedule or hold period; only the net is typed.',
    'Chargebacks: no way to record money taken back after it was paid, or to hold some back for them.',
    'A creator business: equipment, content costs and a separate business account have no home (Variable income has one business expenses box).',
  ],
};
