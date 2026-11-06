// Three adults in one rented home (batch 49, households of any size): Riley and Jules, partners who live together
// and are not married (each files their own return), and Riley's brother Dev, who lives with them and pays a share
// of the rent and the groceries by percent. Each has a plan of their own; Everyone is the three together.
// The split, by hand: rent $3,000 at 40% / 40% / 20% = $1,200 / $1,200 / $600; groceries $900 at 35% / 35% / 30% =
// $315 / $315 / $270; electric, gas, water $210 equally = $70 each; internet $90 shared by Riley and Jules only = $45
// each (Dev uses his phone); the joint savings is Riley's and Jules's, half each.
const R = { view: 'Me' }, J = { view: 'Partner' }, D = { view: 'P3' }, E = { view: 'all' };
export default {
  id: 'three-adults', order: 18, name: 'Riley, Jules and Dev', view: 'Me',
  about: 'Made up. Three adults renting together: Riley ($5,000 a month take-home) and Jules ($4,000), partners not married, and Riley\'s brother Dev ($3,000), who pays 20% of the rent and 30% of the groceries. Rent $3,000, groceries $900, utilities $210 split three ways, internet $90 for Riley and Jules. Jules has a student loan; Dev has a card.',
  profile: {
    firstName: 'Riley', lastName: 'Persona', partnerName: 'Jules', birthYear: 1994, birthMonth: 3, partnerBirthYear: 1995, state: 'WA',
    household: 'Couple', mode: 'Living together', moneyStyle: 'Separate',
    people: [{ id: 'P3', kind: 'Adult', name: 'Dev', role: 'Sibling' }],
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: false, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Employer',
    shared: { rent: false, utilities: false, internet: false, renters: false, groceries: false, household: false },
    areas: { cash: true, investments: true, real: false, debt: true },
  },
  client: { couple: true },
  records: [
    { kind: 'income', type: 'Job', name: "Riley's paycheck", owner: 'Me', amount: 5000, per: 'month', values: { basis: 'Take-home', payFrequency: 'twice a month', incomeType: 'W-2' } },
    { kind: 'income', type: 'Partner job', name: "Jules's paycheck", owner: 'Partner', amount: 4000, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'income', type: 'Job', name: "Dev's paycheck", owner: 'P3', amount: 3000, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'bill', name: 'Rent', owner: 'Joint', amount: 3000, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date', dueDay: 1, splitHow: 'Percent', splitPcts: { Me: 0.4, Partner: 0.4, P3: 0.2 } } },
    { kind: 'bill', name: 'Groceries', owner: 'Joint', amount: 900, values: { category: 'Groceries', draftt: 'Food', amountType: 'Variable', splitHow: 'Percent', splitPcts: { Me: 0.35, Partner: 0.35, P3: 0.3 } } },
    { kind: 'bill', name: 'Electric, gas, water', owner: 'Joint', amount: 210, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable' } },
    { kind: 'bill', name: 'Internet', owner: 'Joint', amount: 90, values: { category: 'Internet', draftt: 'Accommodation', amountType: 'Fixed', splitAmong: ['Me', 'Partner'] } },
    { kind: 'bill', name: "Riley's phone", owner: 'Me', amount: 60, values: { category: 'Phone', draftt: 'Bills', amountType: 'Fixed' } },
    { kind: 'bill', name: "Riley's dining out", owner: 'Me', amount: 300, values: { category: 'Dining out', draftt: 'Food', amountType: 'Variable' } },
    { kind: 'bill', name: "Jules's dining out", owner: 'Partner', amount: 250, values: { category: 'Dining out', draftt: 'Food', amountType: 'Variable' } },
    { kind: 'bill', name: "Dev's fun money", owner: 'P3', amount: 400, values: { category: 'Other wants', draftt: 'Other', amountType: 'Variable' } },
    { kind: 'account', type: 'Checking', name: "Riley's checking", owner: 'Me', values: { group: 'cash', balance: 4000 } },
    { kind: 'account', type: 'Checking', name: "Jules's checking", owner: 'Partner', values: { group: 'cash', balance: 3000 } },
    { kind: 'account', type: 'Checking', name: "Dev's checking", owner: 'P3', values: { group: 'cash', balance: 1500 } },
    { kind: 'account', type: 'Savings', name: 'Riley and Jules savings', owner: 'Joint', values: { group: 'cash', balance: 6000, splitAmong: ['Me', 'Partner'] } },
    { kind: 'account', type: 'Roth IRA', name: "Riley's Roth IRA", owner: 'Me', values: { group: 'investment', balance: 20000 } },
    { kind: 'debt', type: 'Student loan', name: "Jules's student loan", owner: 'Partner', values: { balance: 12000, apr: 0.05, payment: 150, federal: 'Federal' } },
    { kind: 'debt', type: 'Credit card', name: "Dev's card", owner: 'P3', values: { balance: 2400, apr: 0.24, payment: 150, payChoice: 'Custom' } },
  ],
  expected: {
    takeHome: { value: 5000, unit: 'money', ...R, note: "Riley's own take-home." },
    surplus: { value: 3010, unit: 'money', ...R, note: 'Riley: $5,000 - ($1,200 rent + $315 groceries + $70 utilities + $45 internet + $60 phone + $300 dining) = $5,000 - $1,990 = $3,010.' },
    netWorth: { value: 27000, unit: 'money', ...R, note: 'Riley: $4,000 checking + $3,000 (half the $6,000 savings) + $20,000 Roth = $27,000.' },
    savingsRate: { value: 0.602, unit: 'pct', ...R, note: '$3,010 / $5,000.' },
    housingPct: { value: 0.254, unit: 'pct', ...R, note: '($1,200 + $70) / $5,000.' },
    'takeHome:Jules': { value: 4000, unit: 'money', ...J, note: "Jules's own take-home." },
    'surplus:Jules': { value: 1970, unit: 'money', ...J, note: 'Jules: $4,000 - ($1,200 + $315 + $70 + $45 + $250 dining + $150 student loan) = $4,000 - $2,030 = $1,970.' },
    'netWorth:Jules': { value: -6000, unit: 'money', ...J, note: 'Jules: $3,000 + $3,000 (half the savings) - $12,000 = -$6,000.' },
    'savingsRate:Jules': { value: 0.4925, unit: 'pct', ...J, note: '$1,970 / $4,000.' },
    'housingPct:Jules': { value: 0.3175, unit: 'pct', ...J, note: '($1,200 + $70) / $4,000.' },
    'debtFreeMonths:Jules': { value: 98, unit: 'months', ...J, note: 'The loan (5%, not heavy) keeps its $150: n = -ln(1 - 0.05/12 x 12,000 / 150) / ln(1 + 0.05/12) = 97.5, so 98.' },
    'takeHome:Dev': { value: 3000, unit: 'money', ...D, note: "Dev's own take-home." },
    'surplus:Dev': { value: 1510, unit: 'money', ...D, note: 'Dev: $3,000 - ($600 rent + $270 groceries + $70 utilities + $400 fun + $150 card) = $3,000 - $1,490 = $1,510. No internet: it is Riley\'s and Jules\'s.' },
    'netWorth:Dev': { value: -900, unit: 'money', ...D, note: 'Dev: $1,500 - $2,400 = -$900.' },
    'savingsRate:Dev': { value: 0.5033, unit: 'pct', ...D, note: '$1,510 / $3,000.' },
    'housingPct:Dev': { value: 0.2233, unit: 'pct', ...D, note: '($600 + $70) / $3,000.' },
    'debtFreeMonths:Dev': { value: 2, unit: 'months', ...D, note: 'The card is heavy: $150 + the $1,510 surplus = $1,660 a month. $2,400 x 1.02 = $2,448 - $1,660 = $788; $788 x 1.02 = $804 < $1,660: 2 months.' },
    'takeHome:Everyone': { value: 12000, unit: 'money', ...E, note: '$5,000 + $4,000 + $3,000.' },
    'surplus:Everyone': { value: 6490, unit: 'money', ...E, note: 'Every bill once, whole: $3,000 + $900 + $210 + $90 + $60 + $300 + $250 + $400 + $150 + $150 = $5,510; $12,000 - $5,510 = $6,490 (= $3,010 + $1,970 + $1,510).' },
    'netWorth:Everyone': { value: 20100, unit: 'money', ...E, note: '$4,000 + $3,000 + $1,500 + $6,000 + $20,000 - $12,000 - $2,400 = $20,100 (= $27,000 - $6,000 - $900).' },
    'savingsRate:Everyone': { value: 0.5408, unit: 'pct', ...E, note: '$6,490 / $12,000.' },
    'housingPct:Everyone': { value: 0.2675, unit: 'pct', ...E, note: '($3,000 + $210) / $12,000.' },
  },
  // Batch 47's benefits cliff (M9B), read with batch 49's household: three adults in the plan, a household of 3; the
  // line for 3 is $15,960 + 2 x $5,680 = $27,320, and $171,900 a year (the three take-homes worked back to gross) is far past every line.
  cliff: {
    near: { value: false, note: '$171,900 a year with work coverage: every line is below them.' },
    size: { value: 3, note: 'Riley, Jules and Dev, each in the plan.' },
    says: ['Nowhere near a benefit line'],
  },
  cannot: [],
};
