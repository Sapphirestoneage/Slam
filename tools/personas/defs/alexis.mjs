// Alexis: avoids money. A few hundred in checking, a card she pays a little on, a paycheck every 2 weeks, a roommate.
// Her failure mode is avoidance: the app has to tell a simple, kind story from very few numbers.
export default {
  id: 'alexis', order: 1, name: 'Alexis Persona',
  about: 'Made up. Avoids money: $400 checking, $4,200 on a card at 22% paying $120, $1,200 every 2 weeks (W-2), rents with a roommate, gut spending $2,800.',
  profile: {
    firstName: 'Alexis', lastName: 'Persona', birthYear: 1998, birthMonth: 3, state: 'NY', household: 'Solo', mode: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Rent', roommates: 1, hasCar: false, hasPets: false, incomeStability: 'Steady',
    healthCoverage: 'Employer', areas: { cash: true, investments: false, real: false, debt: true },
    shared: { rent: true, utilities: true, internet: true, renters: false, groceries: false, household: false },
    sharedAs: { rent: 'Your share', utilities: 'The whole bill', internet: 'The whole bill' },
    whyNow: 'Friend made me come', worry: 'Opening my card statement', goalWords: 'Stop feeling sick about money',
    // Batch 25: made-up answers to who they are with money (3 address taps, 12 letters): NJU and the down arrow, KOGS.
    identity: { address: { feel: 'uneasy', earnMore: false, spendLess: true }, letters: { Me: [0, -1, 1, -1, 1, 0, -1, 1, -1, -1, 1, 1] } },
  },
  session: { weather: { 1: { at: '2026-11-05T12:00:00.000Z', Me: [2, 2, 2, 1, 0, 1] } } }, // batch 25: the money weather, session 1: Overcast
  records: [
    { kind: 'income', type: 'Job', name: 'Paycheck', amount: 1200, per: '2 weeks', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 2800, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 400 } },
    { kind: 'debt', type: 'Credit card', name: 'Visa', values: { balance: 4200, apr: 0.22, payment: 120, payChoice: 'Custom' } },
    { kind: 'bill', name: 'Rent', amount: 900, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } },
    { kind: 'bill', name: 'Electric, gas, water', amount: 140, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable' } },
  ],
  expected: {
    takeHome: { value: 2600, unit: 'money', note: '$1,200 x 26 paychecks / 12 = $2,600 a month.' },
    netWorth: { value: -3800, unit: 'money', note: '$400 checking - $4,200 card = -$3,800.' },
    surplus: { value: -200, unit: 'money', note: '$2,600 - $2,800 gut (debt payment included) = -$200 a month: she is short every month.' },
    savingsRate: { value: -0.0769, unit: 'pct', note: '-$200 / $2,600 = -7.7%.' },
    fooStep: { value: '1', unit: 'step', note: 'Stop going backwards: a 2-week buffer is $2,800 x 24 / 52 = $1,292 and she has $400.' },
    debtFreeMonths: { value: 57, unit: 'months', note: 'No surplus to add, so the card at $120: n = -ln(1 - 0.22/12 x 4,200 / 120) / ln(1 + 0.22/12) = 56.5, so 57 months.' },
    monthsToFi: { value: 'never', unit: 'months', note: 'Nothing invested and nothing left over to invest: not on this path.' },
    runwayMonths: { value: 0.143, unit: 'months', tol: 0.01, note: '$400 / $2,800 = 0.14 months.' },
    bigETarget: { value: 15680, unit: 'money', note: 'Age 28 / 5 = 5.6 months x $2,800 = $15,680.' },
    littleEFull: { value: false, unit: 'bool', note: 'Cash $400 fills the buffer first; little e gets nothing.' },
    housingPct: { value: 0.3731, unit: 'pct', note: 'Rent $900 (given as her share) + half of the $140 electric bill (the whole bill, split 2 ways) = $970 / $2,600 = 37.3%.' },
  },
  cannot: [],
};
