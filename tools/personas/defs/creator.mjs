// A fan-site creator with a part-time W-2 job: a Platform income row (gross, the 20% fee, chargebacks, the 7-day hold,
// weekly payouts; batch 27), an HSA.
export default {
  id: 'creator', order: 10, name: 'Kai Creator',
  about: 'Made up. Fan-site creator on OnlyFans: about $3,125 a month gross, the 20% platform fee ($625) and about $150 in chargebacks leave $2,350 paid out a month, weekly, each payout after the 7-day hold; a part-time W-2 job at $1,100 every 2 weeks with $50 a paycheck into an HSA, a card.',
  profile: {
    firstName: 'Kai', lastName: 'Creator', birthYear: 2000, birthMonth: 1, state: 'CA', household: 'Solo', mode: 'Solo',
    workSituation: 'Mixed', housing: 'Rent', roommates: 1, hasCar: false, hasPets: false, incomeStability: 'Varies', healthCoverage: 'Employer',
    hsaEligible: true, variable: { typical: 2350, lowest: 1200, setAside: 0.25 }, // batch 27: payouts after fees and chargebacks, before tax
    areas: { cash: true, investments: true, real: false, debt: true },
  },
  records: [
    { kind: 'income', type: 'Job', name: 'Part-time job', amount: 1100, per: '2 weeks', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2', hsaFsa: 50 } },
    // Batch 27: a Platform row: $3,125 a month gross on OnlyFans, the registered 20% fee and 7-day hold, about $150 a month
    // in chargebacks, paid out weekly from Monday Nov 9 (so each payout lands a week later, after the hold).
    { kind: 'income', type: 'Platform', name: 'OnlyFans', amount: 3125, per: 'month', status: 'Roughly', values: { platform: 'OnlyFans', chargebacks: 150, payFrequency: 'week', nextPayday: '2026-11-09', returnsFiled: '1', returnLast: 14500 } }, // batch 42: started mid-2025, one return so far
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 3600, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 2200 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'HYSA', values: { group: 'cash', balance: 6000 } },
    { kind: 'account', type: 'HSA', name: 'HSA', values: { group: 'investment', balance: 3500, hsaStyle: 'Self-directed' } },
    { kind: 'account', type: 'Roth IRA', name: 'Roth IRA', values: { group: 'investment', balance: 9000 } },
    { kind: 'debt', type: 'Credit card', name: 'Card', values: { balance: 2900, apr: 0.21, payment: 300, payChoice: 'Custom' } },
    { kind: 'coverage', type: 'Health', name: 'HDHP through work', amount: 60, per: 'month', values: { have: 'Have it', deductible: 3000, paidFrom: 'Paycheck' } },
  ],
  expected: {
    takeHome: { value: 4139.21, unit: 'money', note: 'Job: $1,100 x 26 / 12 = $2,383.33 (its gross works out to $35,094). Platform: $3,125 - 20% ($625) - $150 = $2,350 a month, $28,200 a year, stacked on the job: SE tax 15.3% x 92.35% x $28,200 = $3,984.53; federal 12% x ($28,200 - $1,992.27) = $3,144.93 (the job already used the $16,100 standard deduction; CA tax is not in the app yet). ($28,200 - $7,129.46) / 12 = $1,755.88. $2,383.33 + $1,755.88 = $4,139.21.' },
    netWorth: { value: 17800, unit: 'money', note: '$2,200 + $6,000 + $3,500 + $9,000 - $2,900 = $17,800.' },
    surplus: { value: 539.21, unit: 'money', note: '$4,139.21 - $3,600 = $539.21.' },
    savingsRate: { value: 0.1525, unit: 'pct', note: 'HSA $50 x 26 / 12 = $108.33 from the paycheck. ($539.21 + $108.33) / ($4,139.21 + $108.33) = 15.2%.' },
    fooStep: { value: '3', unit: 'step', note: 'Step 1 done ($8,200 cash), no match, the card is heavy.' },
    debtFreeMonths: { value: 4, unit: 'months', note: '$300 + $539.21 = $839.21 a month on $2,900 at 21% (1.75% a month): $2,111.54, $1,309.28, $492.98, then paid off in month 4 (about $119 of interest).' },
    monthsToFi: { value: 365, unit: 'months', note: 'Freed money follows the FOO: 4 months on the card, then big e: $23,400 - ($8,200 - buffer $1,661.54 - little e $1,000) = $17,861.54 / $839.21 = 21.3, so 22 months: 26 months with only the HSA going in ($12,500 x g^26 + $108.33 x (g^26 - 1) / (g - 1) = $17,498.59, g = 1.07^(1/12)). Then $108.33 + $539.21 + $300 = $947.54 a month to the $1,080,000 FI number ($3,600 x 12 / 4%): ln(($1,080,000 (g-1) + $947.54) / ($17,498.59 (g-1) + $947.54)) / ln g = 338.4, so 339: 365 months.' },
    runwayMonths: { value: 2.278, unit: 'months', tol: 0.01, note: '$8,200 / $3,600.' },
    bigETarget: { value: 23400, unit: 'money', note: 'Age 26 / 5 = 5.2 x 1.25 (varies) = 6.5 x $3,600 = $23,400.' },
  },
  // Batch 42 (the lender's-eye view, M9W): what Report › Lender's view should say, worked by hand.
  lender: {
    earned: { value: 5274.5, note: 'Job gross $35,094 / 12 = $2,924.50 (the app\'s M13 from $1,100 every 2 weeks) + OnlyFans $28,200 / 12 = $2,350 paid out after the fee and chargebacks.' },
    mortgageIncome: { value: 2924.5, note: 'One return with OnlyFans (2025, $14,500): most mortgage lenders wait for the second, so only the job counts.' },
    landlordIncome: { value: 4132.83, note: '$2,924.50 + the latest return $14,500 / 12 = $1,208.33.' },
    dti: { value: 0.0273, tol: 0.0005, note: 'The card at its minimum: max($25, 1% x $2,900 + $2,900 x 21% / 12) = $29 + $50.75 = $79.75; / $2,924.50 = 2.7%.' },
    gap: { value: 2350, note: '$5,274.50 - $2,924.50 = $2,350 a month (all of OnlyFans).' },
    says: ['File your 2026 return showing all of OnlyFans', 'most mortgage lenders wait for the second', 'Needs a card limit'],
  },
  // Batch 44: Net worth › Fire drill as of Nov 5 2026 (the 30 days Nov 5 to Dec 4). test/firedrill.test.js.
  fireDrill: {
    account: 'Checking', outOfReach: 13669.24, reach: 0, mustPay: 3379.75, days: 0, withCard: 0, held: 540.82,
    note: 'Opens on checking, where the larger take-home lands (the job, $2,383.33 a month). The job pays $1,100 on Nov 6, Nov 20 and Dec 4 ($3,300); OnlyFans pays $2,350 x 12 / 52 = $542.31 each Monday after the 7-day hold: Nov 9, 16, 23 and 30 ($2,169.24). The HYSA has no bank set, so it counts as at the same bank until Another bank is tapped (QUESTIONS 367). Out of reach: $2,200 + $6,000 + $3,300 + $2,169.24 = $13,669.24; nothing to reach, 0 days. With Another bank tapped on the HYSA: $6,000 reachable, 53 days (below). Must-pay: the gut number $3,600 less the $300 card payment in it, plus the card minimum ($29 + $2,900 x 21% / 12 = $79.75): $3,379.75. With the HYSA at another bank: $6,000 / ($3,379.75 x 12 / 365 = $111.11 a day) = 53.99, so 53 days. Held on OnlyFans at any time: $2,350 x 12 / 365 x 7 = $540.82.',
    says: ['$13,669', '0 days', 'counted as the same bank', 'close accounts tied to adult work', 'OnlyFans: payouts held back', '$541', 'Payout settings on each platform'],
  },
  // Batch 47 (the benefits cliff, M9B): Plan › Raise and benefits says it is nowhere near a line.
  cliff: {
    near: { value: false, note: '$63,300 a year in CA with work coverage: every line is below or does not apply.' },
    says: ['Nowhere near a benefit line'],
  },
  cannot: [
    // Batch 27 cleared: platform payouts (gross, the platform fee, chargebacks a month, the hold and the payout schedule)
    // are a Platform income row, and the calendar lands each payout after the hold.
    'Chargebacks: only a monthly amount; no way to hold back a reserve for them or to date one that lands late.',
    'A creator business: equipment, content costs and a separate business account have no home (Variable income has one business expenses box).',
    'State tax on self-employment outside New York (CA here) is not worked out yet, so the take-home reads a little high.',
  ],
};
