// A 1099 dancer: cash nights, house fees per shift, quarterly taxes set aside, no employer benefits, and banks that
// can close an account without warning, so money is spread across two banks and some cash at home.
export default {
  id: 'dancer', order: 9, name: 'Nova Dancer',
  about: 'Made up. 1099 dancer, 3 shifts a week (13 a month): about $575 a shift in cash and card ($7,475 a month), an $80 house fee and a $20 tip-out a shift, quarterly taxes set aside in their own account, no employer benefits, accounts at two banks and cash at home in case a bank closes one; slow January and February at 2 shifts a week.',
  profile: {
    firstName: 'Nova', lastName: 'Dancer', birthYear: 1997, birthMonth: 4, state: 'NV', household: 'Solo', mode: 'Solo',
    workSituation: 'Self-employed', housing: 'Rent', hasCar: true, hasPets: true, incomeStability: 'Unpredictable', healthCoverage: 'ACA',
    variable: { typical: 6175, lowest: 4116.67, setAside: 0.28 }, // batch 27: Use your shifts ($475 a shift after fees x 13, and x 2 / 3 in the slow months); fees are on the shifts now
    areas: { cash: true, investments: false, real: true, debt: false },
    // Batch 44: the two banks on Institutions, so the fire drill knows the savings is out of a freeze at bank A.
    institutions: [{ id: 'dancer-bank-a', name: 'Bank A', kind: 'Bank', website: null, notes: null, owner: null }, { id: 'dancer-bank-b', name: 'Online Bank B', kind: 'Bank', website: null, notes: null, owner: null }],
  },
  records: [
    // Batch 27: the shifts are the row: 3 a week at about $575 a shift in dances (card and cash), less an $80 house fee
    // and a $20 tip-out (DJ and house mom) a shift; the app works out the tax on the rest (1099, quarterly).
    { kind: 'income', type: 'Self-employed', name: 'Dancing', status: 'Roughly', values: { incomeType: '1099', payFrequency: 'week',
      shiftsWeek: 3, payShift: 575, houseFee: 80, tipOutBy: '$ a shift', tipOutAmount: 20, slowMonths: ['Jan', 'Feb'], slowShifts: 2,
      returnsFiled: '2 or more', returnLast: 52000, returnBefore: 41000 } }, // batch 42: her 2024 and 2025 returns (Schedule C net) showed less than she earns now
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 3300, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Cash on hand', name: 'Cash at home', values: { group: 'cash', balance: 2500 } },
    { kind: 'account', type: 'Checking', name: 'Checking (bank A)', values: { group: 'cash', balance: 1800, institutionId: 'dancer-bank-a' } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Savings (online bank B)', values: { group: 'cash', balance: 4000, purpose: 'Emergency', institutionId: 'dancer-bank-b' } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Quarterly tax set-aside', values: { group: 'cash', balance: 3500, purpose: 'Taxes', institutionId: 'dancer-bank-b' } }, // batch 27: owed, kept out of emergency cash
    { kind: 'asset', type: 'Car', name: 'Car (paid off)', values: { value: 12000, financed: 'Paid off' } },
    { kind: 'coverage', type: 'Health', name: 'ACA plan', amount: 280, per: 'month', values: { have: 'Have it', deductible: 5000, paidFrom: 'Budget' } },
  ],
  expected: {
    takeHome: { value: 4775.81, unit: 'money', note: 'Shifts: 3 a week x 52 / 12 = 13; ($575 - $80 house fee - $20 tip-out) = $475 x 13 = $6,175 a month, $74,100 a year (the fee and tip-out are business costs). SE tax 15.3% x 92.35% x $74,100 = $10,470.00; federal on $74,100 - $5,235.00 (half the SE tax) - $16,100 = $52,765: $1,240 + 12% x $38,000 + 22% x $2,365 = $6,320.30 (NV: no state income tax). ($74,100 - $16,790.30) / 12 = $4,775.81 ($367.37 a shift).' },
    netWorth: { value: 23800, unit: 'money', note: '$2,500 + $1,800 + $4,000 + $3,500 + $12,000 car = $23,800 (the $3,500 for taxes stays in net worth; it is left out of emergency cash).' },
    surplus: { value: 1475.81, unit: 'money', note: '$4,775.81 - $3,300 = $1,475.81.' },
    savingsRate: { value: 0.309, unit: 'pct', note: '$1,475.81 / $4,775.81 = 30.9%.' },
    fooStep: { value: '4', unit: 'step', note: 'Step 1 done (cash $8,300 without the tax money: buffer $3,300 x 2 x 12 / 52 = $1,523.08 and little e $1,000), no match, no debt. big e: 29 / 5 = 5.8 x 1.5 (unpredictable) = 8.7 months x $3,300 = $28,710.' },
    debtFreeMonths: { value: 'none', unit: 'months', note: 'No debt.' },
    monthsToFi: { value: 294, unit: 'months', note: 'Freed money follows the FOO: big e has $8,300 - $2,523.08 = $5,776.92, so $22,933.08 is left / $1,475.81 = 15.5, so 16 months with nothing invested. Then $1,475.81 a month at 7% real (g = 1.07^(1/12)) to the $990,000 FI number ($3,300 x 12 / 4%): ln(($990,000 (g-1) + $1,475.81) / $1,475.81) / ln g = 277.9, so 278: 294 months.' },
    runwayMonths: { value: 2.515, unit: 'months', tol: 0.01, note: '$8,300 / $3,300 (cash at home, checking and savings; the $3,500 set aside for taxes is owed, so it is not runway).' },
    bigETarget: { value: 28710, unit: 'money', note: '8.7 x $3,300.' },
  },
  // Batch 42 (the lender's-eye view, M9W): what Report › Lender's view should say, worked by hand.
  lender: {
    earned: { value: 6175, note: 'This year\'s pace: $74,100 / 12 (the shifts, net of the house fee and tip-out).' },
    mortgageIncome: { value: 3875, note: 'Returns rising ($41,000 in 2024, $52,000 in 2025), so averaged: $93,000 / 2 = $46,500 / 12 = $3,875 (never more than the latest year).' },
    landlordIncome: { value: 4333.33, note: 'A landlord reads the latest return: $52,000 / 12.' },
    dti: { value: 0, note: 'No debts: 0%.' },
    gap: { value: 2300, note: '$6,175 - $3,875 = $2,300 a month.' },
    loan: { value: 132865, tol: 50, note: 'Home payment min(28% x $3,875 = $1,085, 36% x $3,875 = $1,395) = $1,085; 75% carries the loan: $813.75 a month at 6.2% for 30 years x 163.28 = $132,865.' },
    says: ['File your 2026 return showing all of Dancing', '$63,050 a year', 'Deposit cash as it comes in'],
  },
  // Batch 44: what Net worth › Fire drill says (as of NOW, Nov 5 2026: the 30 days Nov 5 to Dec 4). test/firedrill.test.js
  // checks the numbers; the browser run checks the words show.
  fireDrill: {
    account: 'Checking (bank A)', outOfReach: 8925, reach: 6500, taxesNotCounted: 3500, mustPay: 3300, days: 59, withCard: 59, ready: 2, items: 5,
    note: 'The shifts land in checking every Friday: Nov 6, 13, 20, 27 and Dec 4, $475 x 3 shifts = $1,425 each, $7,125 in the 30 days. Out of reach: $1,800 + $7,125 = $8,925. Still reachable: savings at Online Bank B $4,000 + cash at home $2,500 = $6,500 (the $3,500 for taxes is listed, not counted). Must-pay: the gut number $3,300 (no debts). $6,500 / ($3,300 x 12 / 365 = $108.49 a day) = 59.9, so 59 days. Ready: the second bank (Online Bank B) and a month outside the main bank ($6,500 >= $3,300); 2 of 5.',
    says: ['If this account froze today', '$8,925', '$6,500', 'About 59 days', 'close accounts tied to adult work', 'set aside for taxes, not counted', 'Savings (online bank B) at Online Bank B'],
  },
  cannot: [
    // Batch 27 cleared: house fees and tip-out per shift are on the shift job; cash at home is a Cash on hand account
    // (counted as cash, with its loss-risk note); the quarterly tax money is Purpose: Taxes, outside big e and the runway.
    // Batch 44 cleared: bank-closure risk is Net worth › Fire drill (the calm note for adult and cash work, the second bank, the backup plan).
    'No employer benefits: nothing suggests a SEP IRA or Solo 401(k) for a 1099 earner with no investments.',
  ],
};
