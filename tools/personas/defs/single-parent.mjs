// Jasmine: a single parent in upstate New York on SNAP and Medicaid (batch 47, the benefits cliff). A raise that looks
// like plenty can leave her behind: the SNAP line at 150% of the poverty line ends all of her SNAP at once, and the
// EITC fades on every dollar on the way there.
export default {
  id: 'single-parent', order: 16, name: 'Jasmine Persona',
  about: 'Made up. Single mom in Rochester, NY with two kids (4 and 8), a home health aide at $28,000 a year (W-2), head of household. On SNAP, Medicaid (her) and the kids on Medicaid, and New York\'s child care help (CCAP; care would cost $2,100 a month at full price). Rent $1,250, utilities $120, gut spending $2,500, checking $300, a card with $1,800 on it.',
  profile: {
    firstName: 'Jasmine', lastName: 'Persona', birthYear: 1994, birthMonth: 2, state: 'NY', nyc: false, household: 'Solo', mode: 'Solo',
    dependents: 2, kidAges: [4, 8], filingStatus: 'Head of household',
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: false, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Medicaid',
    areas: { cash: true, investments: false, real: false, debt: true },
    worry: 'Losing SNAP if I take more hours', goalWords: 'Take the supervisor job',
    cliff: { snap: 'Getting it', medicaid: 'Getting it', kids: 'Getting it', eitc: 'Getting it', ccap: 'Getting it', careFull: 2100 },
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
    // Batch 53: head of household on the federal tax (taxable is $28,000 - $24,150 = $3,850, all at 10%: $385), the
    // Child Tax Credit and New York's child care help (CCAP).
    ccapLine: { value: 97853, note: 'CCAP: 85% of the state median income for 3 (OCFS, June 1 2026 to May 31 2027).' },
    ccapShare: { value: 0, note: 'Family share: 1% of $28,000 - $27,320 = $6.80 a year, 13 cents a week, rounded down to the half dollar: $0.' },
    ctc: { value: 3785, note: 'Two children under 17: $4,400. Her income tax is $385, all of it taken off; the refund part is the smallest of $4,015 left, 2 x $1,700 = $3,400 and 15% of $25,500 = $3,825: $3,400. $385 + $3,400 = $3,785.' },
    raise5000: { value: 1743.23, tol: 0.05, note: 'A $5,000 raise: tax on it $500 federal (head of household: taxable $3,850 to $8,850, all at 10%) + $382.50 FICA + $253.38 New York (head of household, taxable $16,800 to $21,800: 850 x 4.4% + 3,250 x 5.15% + 900 x 5.4%) = $1,135.88, so $3,864.12 kept. SNAP: gross $2,750, less $550 and $217 = $1,983; shelter over half ($991.50) is $1,135.50, capped at $769; net $1,214, 30% = $364.20, $365; $808 - $365 = $443: $100 a month less, $1,200 a year. CCAP: 1% of $5,680 = $56.80 a year, $1.09 a week, $1.00: $52 a year. EITC: 5,000 x 21.06% = $1,053.00 less, x 1.3 with New York = $1,368.89. Child Tax Credit: tax $885 all taken off, refund $3,400 (the $1,700 a child cap), $4,285: $500 more. Still on Medicaid, the kids too (33,000 / 27,320 = 121%). Net $3,864.12 - $1,200 - $52 - $1,368.89 + $500 = $1,743.23 ahead.' },
    raise13000: { value: 430, tol: 0.05, note: 'A $13,000 raise ($41,000, over the $40,980 SNAP line): tax $1,300 federal (head of household: taxable $3,850 to $16,850, all at 10%; the single brackets Batch 47 used gave $1,550, so $250.00 less) + $994.50 FICA + $685.38 New York (850 x 4.4% + 3,250 x 5.15% + 8,900 x 5.4%) = $2,979.88, $10,020.12 kept. SNAP ends: 12 x $543 = $6,516. Medicaid ends at 150% of the line and she moves to the Essential Plan (free): $0. The kids stay on Medicaid (150% is under 154%). CCAP: 1% of $13,680 = $136.80 a year, $2.63 a week, $2.50: $130 a year. EITC: 13,000 x 21.06% x 1.3 = $3,559.12 less. Child Tax Credit: tax $1,685 all taken off, refund the smallest of $2,715, $3,400 and $5,775 = $2,715, so the full $4,400: $615 more. Net $10,020.12 - $6,516 - $130 - $3,559.12 + $615 = $430.00 ahead (Batch 47 read -$305 on the single brackets with no credit and no CCAP).' },
    zones: { value: [], note: 'With head of household and the Child Tax Credit no raise up to $50,000 leaves her behind: just past the SNAP line ($13,000) she is $430 ahead, and each $100 more keeps $77.45 (10% + 7.65% + 5.4% tax) less $27.38 of EITC.' },
    says: ['Medicaid ends at', 'Getting it', 'SNAP (food)', 'Child care help (CCAP)', 'The Child Tax Credit grows by $615 a year', 'a phase-out, not a cliff', 'No raise up to $50,000 a year leaves you behind'],
  },
  cannot: [
    'Child care paid out of pocket is a tap (it moves the New York SNAP line to 200%), but its dollars are not yet taken off her SNAP net income.',
    'The Empire State Child Credit is not in the raise math; at this income it holds as her pay rises, so the raise reads very slightly worse than it is.',
    'The Child Tax Credit is said on Taxes and counted in the raise, but not in her monthly take-home: its $3,400 refund lands when she files.',
  ],
};
