// A tipped W-2 bartender: a small paycheck with the card tips in it, cash tips on top less a tip-out on sales, a slow
// January and February (batch 27: the tips are parts of the Job row).
export default {
  id: 'bartender', order: 8, name: 'Riley Bartender',
  about: 'Made up. Tipped W-2 bartender, 3 shifts a week: a paycheck of $900 every 2 weeks (wage plus $60 a shift in card tips, after tax), $140 a shift in cash tips (not reported yet) less a 3% tip-out on $1,000 of sales, slow season January to February at 2 shifts a week, a card.',
  profile: {
    firstName: 'Riley', lastName: 'Bartender', birthYear: 1999, birthMonth: 9, state: 'FL', household: 'Solo', mode: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Rent', roommates: 2, hasCar: true, hasPets: false, incomeStability: 'Varies', healthCoverage: 'ACA',
    variable: { typical: 3380, lowest: 2253.33, setAside: 0.1 }, // batch 27: Use your shifts (a regular month, and a slow month at 2 of 3 shifts)
    incomeGaps: [{ id: 'slow', name: 'Slow season (Jan to Feb), about one month short', start: '2027-01', months: 1 }],
    areas: { cash: true, investments: true, real: true, debt: true },
  },
  records: [
    // Batch 27: one Job row with its tips as their own parts: card tips are on the paycheck (taxed there), cash tips come
    // on top, the tip-out is 3% of the night's sales paid from the cash, and the cash tips are not reported yet.
    { kind: 'income', type: 'Job', name: 'Bar job', amount: 900, per: '2 weeks', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2',
      shiftsWeek: 3, cardTips: 60, cardTipsPer: 'shift', cashTips: 140, cashTipsPer: 'shift', tipOutBy: '% of sales', tipOutPct: 0.03, salesShift: 1000, cashReported: 'No',
      slowMonths: ['Jan', 'Feb'], slowShifts: 2 } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 2600, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 1100 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Savings', values: { group: 'cash', balance: 600 } },
    { kind: 'account', type: 'Roth IRA', name: 'Roth IRA', values: { group: 'investment', balance: 3000 } },
    { kind: 'asset', type: 'Car', name: 'Car (paid off)', values: { value: 7000, financed: 'Paid off' } },
    { kind: 'debt', type: 'Credit card', name: 'Card', values: { balance: 1800, apr: 0.27, payment: 90, payChoice: 'Custom' } },
  ],
  expected: {
    takeHome: { value: 3380, unit: 'money', note: 'Paycheck $900 x 26 / 12 = $1,950 (card tips in it). Cash: 3 shifts a week x 52 / 12 = 13 shifts; ($140 cash tips - 3% x $1,000 sales = $30 tip-out) = $110 x 13 = $1,430. $1,950 + $1,430 = $3,380 ($260 a shift).' },
    netWorth: { value: 9900, unit: 'money', note: '$1,100 + $600 + $3,000 + $7,000 - $1,800 = $9,900.' },
    surplus: { value: 780, unit: 'money', note: '$3,380 - $2,600 = $780 in a regular month (a slow month at 2 shifts a week is $3,380 x 2 / 3 = $2,253.33).' },
    savingsRate: { value: 0.2308, unit: 'pct', note: '$780 / $3,380 = 23.1%.' },
    fooStep: { value: '1', unit: 'step', note: 'Buffer $2,600 x 2 x 12 / 52 = $1,200 and little e $1,000 need $2,200, and the slow season (within 12 months) needs one month, $2,600, all in step 1: $4,800. Cash is $1,700.' },
    debtFreeMonths: { value: 6, unit: 'months', note: 'Step 1 first (question 217): $3,100 short / $780 = 3.97, so months 1 to 3 fill $2,340 and month 4 the last $760 ($20 to the card) while the card gets its $90 at 2.25% a month: $1,575.22 after month 4. Then $870 a month: $740.66 after month 5, paid off in month 6 (interest about $207).' },
    monthsToFi: { value: 343, unit: 'months', note: 'Freed money follows the FOO with step 1 first: 6 months on step 1 and the card, then big e ($17,550, nothing in it yet) at $870 a month in whole months: 20.2, so 21 months: 27 months with nothing new invested ($3,000 x 1.07^(27/12) = $3,493.29). Then $870 a month to the $780,000 FI number ($2,600 x 12 / 4%), g = 1.07^(1/12): ln(($780,000 (g-1) + $870) / ($3,493.29 (g-1) + $870)) / ln g = 315.8, so 316: 343 months.' },
    runwayMonths: { value: 0.654, unit: 'months', tol: 0.01, note: '$1,700 / $2,600.' },
    bigETarget: { value: 17550, unit: 'money', note: 'Age 27 / 5 = 5.4 x 1.25 (income varies) = 6.75 months x $2,600 = $17,550.' },
    littleEFull: { value: false, unit: 'bool', note: '$1,700 fills the $1,200 buffer, then $500 of little e.' },
  },
  cannot: [
    // Batch 27 cleared: tips (card, cash, tip-out on sales, reported or not) are parts of the Job row; and Variable income
    // shows for any client whose income varies (About you › Income stability), W-2 or not.
    'A slow season is a dip, not a gap: the cash layers still take it as an income gap of one month short. The slow months on the shift job feed the irregular income view (Use your shifts), not the layers.',
  ],
};
