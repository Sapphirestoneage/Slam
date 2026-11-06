// Lena and Marco: a married couple in the Hudson Valley buying their own health plan, just under the 400% line
// (batch 47, the benefits cliff). With the enhanced credits gone since 2025 ended, $1 over the line ends the premium
// help altogether.
export default {
  id: 'aca-couple', order: 17, name: 'Lena and Marco',
  about: 'Made up. Married, filing jointly, in Kingston, NY, no kids. Lena $46,000 and Marco $38,000 a year, both W-2 at small employers with no health plan, so they buy a marketplace plan with the premium tax credit. Rent $1,700, gut spending $5,200, checking $4,000, savings $9,000, Roth IRAs $22,000.',
  profile: {
    firstName: 'Lena', lastName: 'Persona', partnerName: 'Marco', birthYear: 1987, birthMonth: 9, partnerBirthYear: 1986, state: 'NY', nyc: false,
    household: 'Couple', mode: 'Married merged', moneyStyle: 'Joint',
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: true, hasPets: false, incomeStability: 'Steady', healthCoverage: 'ACA',
    areas: { cash: true, investments: true, real: false, debt: false },
    worry: 'Whether the raise is worth it', goalWords: 'Know what a raise really pays',
    cliff: { aca: 'Getting it' },
  },
  client: { couple: true },
  records: [
    { kind: 'income', type: 'Job', name: "Lena's paycheck", owner: 'Me', amount: 46000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'income', type: 'Job', name: "Marco's paycheck", owner: 'Partner', amount: 38000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 5200, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Joint checking', owner: 'Joint', values: { group: 'cash', balance: 4000 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Savings', owner: 'Joint', values: { group: 'cash', balance: 9000 } },
    { kind: 'account', type: 'Roth IRA', name: 'Roth IRAs', owner: 'Joint', values: { group: 'investment', balance: 22000 } },
    { kind: 'bill', name: 'Rent', amount: 1700, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } },
  ],
  expected: {
    netWorth: { value: 35000, unit: 'money', note: '$4,000 + $9,000 + $22,000.' },
  },
  // Batch 47 (the benefits cliff, M9B). Household of 2: the 2026 poverty line is $15,960 + $5,680 = $21,640.
  cliff: {
    size: { value: 2, note: 'Lena and Marco.' },
    acaLine: { value: 86560, note: '400% x $21,640.' },
    help: { value: 11023.2, tol: 0.05, note: '$84,000 is 388% of the line, in the 300% to 400% band at 10.22% (IRS Rev. Proc. 2026-26 for 2027): they pay $8,584.80 a year. The New York benchmark is $817 a month a person (KFF, 2026), $19,608 for two; help = $19,608 - $8,584.80 = $11,023.20.' },
    next: { value: 'aca', note: 'The premium help ends at $86,560, $2,560 above them.' },
    raise1000: { value: 647.3, tol: 0.05, note: 'A $1,000 raise stays under the line (388% to 393%): tax on it 12% federal (joint, taxable $51,800, in the 12% band to $100,800) + 7.65% FICA + 5.4% New York (joint, taxable $67,950, in the 5.4% band) = $250.50, so $749.50 kept; they pay 10.22% of the $1,000 more for the plan, $102.20: $647.30 ahead.' },
    raise5000: { value: -7275.7, tol: 0.05, note: 'A $5,000 raise ($89,000, over $86,560) ends the help: $19,608 at full price less the $8,584.80 they pay now = $11,023.20 more. Kept 74.95% of $5,000 = $3,747.50. Net -$7,275.70.' },
    breakEven5000: { value: 14800, note: '74.95% of the raise has to cover $11,023.20: $14,707, so $14,800 in steps of $100 (taxable stays in the 12% band).' },
    zones: { value: [[2600, 14700]], note: '$86,560 - $84,000 = $2,560: $2,500 more stays under, $2,600 is over; $14,800 is the first raise back at or above zero.' },
    says: ['Marketplace premium help', 'behind', 'until it is'],
  },
  cannot: [
    'The benchmark plan is KFF\'s 2026 average for New York (every age the same there); 2027 rates are not on file yet, and the plan they picked may cost more or less than the benchmark.',
  ],
};
