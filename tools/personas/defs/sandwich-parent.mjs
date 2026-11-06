// A single parent who supports a parent too (batch 49, households of any size): Nadia, her son Theo (6) and her mother
// Rosa (71), who lives with them. One adult in the plan, two dependents, head of household. Her one view is Everyone.
const E = { view: 'all' };
export default {
  id: 'sandwich-parent', order: 19, name: 'Nadia Persona', view: 'Me',
  about: 'Made up. Single mom in Pennsylvania with her son Theo (6) and her mother Rosa (71) living with her: $4,200 a month take-home, head of household. Rent $1,700, utilities $140, groceries $700, after-school care $600, Rosa\'s prescriptions $120 and $300 a month to Rosa. Checking $2,500, savings $5,000, a card with $3,000 on it.',
  profile: {
    firstName: 'Nadia', lastName: 'Persona', birthYear: 1987, birthMonth: 9, state: 'PA', household: 'Solo', mode: 'Solo', filingStatus: 'Head of household',
    people: [{ id: 'D1', kind: 'Dependent', name: 'Theo', role: 'Child', age: 6 }, { id: 'D2', kind: 'Dependent', name: 'Rosa', role: 'Parent I support', age: 71 }],
    dependents: 2, kidAges: [6],
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: false, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Employer',
    areas: { cash: true, investments: false, real: false, debt: true },
  },
  records: [
    { kind: 'income', type: 'Job', name: 'Clinic paycheck', amount: 4200, per: 'month', values: { basis: 'Take-home', payFrequency: 'twice a month', incomeType: 'W-2' } },
    { kind: 'bill', name: 'Rent', amount: 1700, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date', dueDay: 1 } },
    { kind: 'bill', name: 'Electric, gas, water', amount: 140, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable' } },
    { kind: 'bill', name: 'Groceries', amount: 700, values: { category: 'Groceries', draftt: 'Food', amountType: 'Variable' } },
    { kind: 'bill', name: 'After-school care', amount: 600, values: { category: 'Kids', draftt: 'Other', amountType: 'Fixed' } },
    { kind: 'bill', name: "Rosa's prescriptions", amount: 120, values: { category: 'Prescriptions', draftt: 'Therapy', amountType: 'Variable' } },
    { kind: 'bill', name: 'To Rosa', amount: 300, values: { category: 'Family support', draftt: 'Other', amountType: 'Fixed' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 2500 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Savings', values: { group: 'cash', balance: 5000 } },
    { kind: 'debt', type: 'Credit card', name: 'Card', values: { balance: 3000, apr: 0.22, payment: 100, payChoice: 'Custom' } },
  ],
  expected: {
    takeHome: { value: 4200, unit: 'money', note: 'Her take-home.' },
    surplus: { value: 540, unit: 'money', note: '$4,200 - ($1,700 + $140 + $700 + $600 + $120 + $300 + the $100 card payment) = $4,200 - $3,660 = $540.' },
    netWorth: { value: 4500, unit: 'money', note: '$2,500 + $5,000 - $3,000.' },
    savingsRate: { value: 0.1286, unit: 'pct', note: '$540 / $4,200.' },
    housingPct: { value: 0.4381, unit: 'pct', note: '($1,700 + $140) / $4,200.' },
    'surplus:Everyone': { value: 540, unit: 'money', ...E, note: 'One adult in the plan: Everyone is her view.' },
    'netWorth:Everyone': { value: 4500, unit: 'money', ...E, note: 'One adult in the plan: Everyone is her view.' },
  },
  // Batch 47's benefits cliff (M9B), read with batch 49's household: Nadia, Theo and Rosa are a household of 3 (Rosa is a
  // dependent, not a child: one child for the EITC). Her $4,200 take-home is about $60,000 a year before tax, past the
  // one-child EITC's end ($51,593), SNAP's 130% line ($35,520) and Medicaid's 138% ($37,702).
  cliff: {
    near: { value: false, note: 'About $60,000 a year with work coverage: past every line for 3.' },
    size: { value: 3, note: 'Nadia, her son Theo and her mother Rosa.' },
    says: ['Nowhere near a benefit line'],
  },
  cannot: [],
};
