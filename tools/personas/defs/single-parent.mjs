// Jasmine: a single parent in upstate New York on SNAP and Medicaid (batch 47, the benefits cliff). A raise that looks
// like plenty can leave her behind: the SNAP line at 150% of the poverty line ends all of her SNAP at once, and the
// EITC fades on every dollar on the way there.
export default {
  id: 'single-parent', order: 16, name: 'Jasmine Persona',
  about: 'Made up. Single mom in Rochester, NY with two kids (4 and 8), a home health aide at $28,000 a year (W-2), head of household. On SNAP, Medicaid (her) and the kids on Medicaid. Rent $1,250, utilities $120, gut spending $2,500, checking $300, a card with $1,800 on it.',
  profile: {
    firstName: 'Jasmine', lastName: 'Persona', birthYear: 1994, birthMonth: 2, state: 'NY', nyc: false, household: 'Solo', mode: 'Solo',
    dependents: 2, kidAges: [4, 8], filingStatus: 'Head of household',
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: false, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Medicaid',
    areas: { cash: true, investments: false, real: false, debt: true },
    worry: 'Losing SNAP if I take more hours', goalWords: 'Take the supervisor job',
    cliff: { snap: 'Getting it', medicaid: 'Getting it', kids: 'Getting it', eitc: 'Getting it' },
  },
  records: [
    { kind: 'income', type: 'Job', name: 'Home health aide', amount: 28000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 2500, status: 'Roughly', values: { includesDebtPayments: false, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 300 } },
    { kind: 'debt', type: 'Credit card', name: 'Card', values: { balance: 1800, apr: 0.2799, payment: 60, payChoice: 'Custom' } },
    { kind: 'bill', name: 'Rent', amount: 1250, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } },
    { kind: 'bill', name: 'Electric and gas', amount: 120, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable', timing: 'Fixed date' } },
  ],
  expected: {
    netWorth: { value: -1500, unit: 'money', note: '$300 - $1,800 = -$1,500.' },
  },
  // Batch 47 (the benefits cliff, M9B): what Plan › Raise and benefits should say, worked by hand.
  // Household of 3; the 2026 poverty line for 3 is $15,960 + 2 x $5,680 = $27,320.
  cliff: {
    size: { value: 3, note: 'Jasmine and two children.' },
    snapLine: { value: 40980, note: 'New York, a household with earnings: 150% x $27,320 = $40,980 a year ($3,415 a month).' },
    snapMonthly: { value: 543, note: 'Gross $2,333.33 a month; less 20% of earnings ($466.67) and the $217 standard deduction = $1,649.67. Shelter: rent $1,250 + the rest-of-state heating SUA $877 = $2,127, over half of $1,649.67 ($824.83) by $1,302.17, capped at $769. Net $880.67; 30% = $264.20, $265 rounded up; $808 (most for 3) - $265 = $543 a month.' },
    medicaidLine: { value: 37701.6, note: '138% x $27,320.' },
    eitc: { value: 8385.57, tol: 0.05, note: 'Two children, single or head of household: the full $7,316 less 21.06% (7,316 / 34,739) of the $4,110 over $23,890 = $865.56, so $6,450.44; New York adds 30% = $1,935.13; $8,385.57.' },
    next: { value: 'medicaid', note: 'Medicaid ends at $37,700 a year, $9,700 above her $28,000; SNAP at $40,980 is next after it.' },
    raise5000: { value: 1205.23, tol: 0.05, note: 'A $5,000 raise: tax on it $590 federal (SLAM reads head of household on the single federal brackets: taxable $11,900 to $16,900, 500 at 10% + 4,500 at 12%) + $382.50 FICA + $253.38 New York (head of household, taxable $16,800 to $21,800: 850 x 4.4% + 3,250 x 5.15% + 900 x 5.4%) = $1,225.88, so $3,774.13 kept. SNAP: gross $2,750, less $550 and $217 = $1,983; shelter over half ($991.50) is $1,135.50, capped at $769; net $1,214, 30% = $364.20, $365; $808 - $365 = $443: $100 a month less, $1,200 a year. EITC: 5,000 x 21.06% = $1,053.00 less, x 1.3 with New York = $1,368.89. Still on Medicaid, the kids too (33,000 / 27,320 = 121%). Net $3,774.13 - $1,200 - $1,368.89 = $1,205.23 ahead.' },
    raise13000: { value: -305, tol: 0.05, note: 'A $13,000 raise ($41,000, over the $40,980 SNAP line): tax $1,550 federal (500 at 10% + 12,500 at 12%) + $994.50 FICA + $685.38 New York (850 x 4.4% + 3,250 x 5.15% + 8,900 x 5.4%) = $3,229.88, $9,770.13 kept. SNAP ends: 12 x $543 = $6,516. Medicaid ends at 150% of the line and she moves to the Essential Plan (free): $0. The kids stay on Medicaid (150% is under 154%). EITC: 13,000 x 21.06% x 1.3 = $3,559.12 less. Net $9,770.13 - $6,516 - $3,559.12 = -$305.00.' },
    breakEven13000: { value: 13700, note: 'Each $100 more keeps $74.95 (12% + 7.65% + 5.4% tax) and loses $27.38 of EITC, $47.57 net: -$305 + 6 x $47.57 = -$19.58 at $13,600, +$28 at $13,700.' },
    zones: { value: [[13000, 13600]], note: 'Behind only between the SNAP line and the break-even: $12,900 more is $40,900 (under $40,980), $13,000 is over; $13,700 is the first raise back at or above zero.' },
    says: ['Medicaid ends at', 'Getting it', 'SNAP (food)'],
  },
  cannot: [
    'Child care paid out of pocket is a tap (it moves the New York SNAP line to 200%), but its dollars are not yet taken off her SNAP net income.',
    'Head of household is taxed on the single federal brackets and standard deduction (SLAM\'s federal tax knows Single and Married jointly), so the tax on a raise reads a little high.',
    'The Child Tax Credit and the Empire State Child Credit are not in the raise math; both grow or hold as her pay rises at this income, so the raise reads slightly worse than it is.',
  ],
};
