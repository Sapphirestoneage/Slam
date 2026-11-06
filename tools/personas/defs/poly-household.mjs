// Three adults sharing a home: Ana and Ben (married, the nesting pair, combined money) and Cam (Ana's partner, not
// married). Batch 58 (QUESTIONS 418): Cam is an adult in the plan (About you › People), with Cam's own paycheck,
// checking, card and view, where before batch 49 SLAM could only hold Cam as money coming in. Cam bought into the
// house for a fifth, so the mortgage and the home are split 40/40/20 on their rows; utilities in thirds; groceries
// 50/25/25 (Ana, Ben, Cam). Ana's and Ben's joint checking, savings, car and pet costs are the two of theirs.
// The split, by hand (each view counts its part; Everyone counts every row once, whole):
//   mortgage payment $2,600 = $1,040 / $1,040 / $520 (From Debt); utilities $300 = $100 each; groceries $1,000 =
//   $500 / $250 / $250; car $450 and pets $150 = half each for Ana and Ben ($225, $75); Ana's own $900, Ben's own
//   $700, Cam's own $800 and Cam's card payment $200.
const A = { view: 'Me' }, B = { view: 'Partner' }, C = { view: 'P3' }, E = { view: 'all' };
const AB = ['Me', 'Partner'];
export default {
  id: 'poly-household', order: 7, name: 'Ana, Ben and Cam',
  about: 'Made up. Three adults in one owned home: Ana and Ben married with combined money, and Cam, Ana\'s partner, who is not married, in the plan with a paycheck, checking and a card of their own. Cam bought in for a fifth: the mortgage and the home are split 40/40/20, utilities in thirds, groceries 50/25/25.',
  profile: {
    firstName: 'Ana', lastName: 'Persona', partnerName: 'Ben', birthYear: 1990, birthMonth: 5, partnerBirthYear: 1988, state: 'OR',
    household: 'Couple', mode: 'Married merged', moneyStyle: 'Joint',
    people: [{ id: 'P3', kind: 'Adult', name: 'Cam', role: 'Partner', birthYear: 1992 }],
    shared: { rent: false, utilities: false, internet: false, renters: false, groceries: false, household: false },
    workSituation: 'Employed (W-2)', housing: 'Own', hasCar: true, hasPets: true, incomeStability: 'Steady', healthCoverage: 'Employer',
    areas: { cash: true, investments: true, real: true, debt: true },
  },
  client: { couple: true },
  records: [
    { kind: 'income', type: 'Job', name: "Ana's paycheck", owner: 'Me', amount: 5800, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'income', type: 'Partner job', name: "Ben's paycheck", owner: 'Partner', amount: 4200, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'income', type: 'Job', name: "Cam's paycheck", owner: 'P3', amount: 3600, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'account', type: 'Checking', name: 'Joint checking', owner: 'Joint', values: { group: 'cash', balance: 9000, splitAmong: AB } },
    { kind: 'account', type: 'Savings', name: 'Joint HYSA', owner: 'Joint', values: { group: 'cash', balance: 20000, splitAmong: AB } },
    { kind: 'account', type: 'Checking', name: "Cam's checking", owner: 'P3', values: { group: 'cash', balance: 2500 } },
    { kind: 'account', type: '401(k)', name: "Ana's 401(k)", owner: 'Me', values: { group: 'investment', balance: 60000 } },
    { kind: 'account', type: '403(b)', name: "Ben's 403(b)", owner: 'Partner', values: { group: 'investment', balance: 45000 } },
    { ref: 'home', kind: 'asset', type: 'Home', name: 'Home (Ana, Ben and Cam on the deed)', owner: 'Joint', values: { value: 550000, financed: 'Financed', splitHow: 'Percent', splitPcts: { Me: 0.4, Partner: 0.4, P3: 0.2 } } },
    { kind: 'debt', type: 'Mortgage', name: 'Mortgage', owner: 'Joint', linkedTo: '@home', values: { balance: 400000, apr: 0.055, payment: 2600, splitHow: 'Percent', splitPcts: { Me: 0.4, Partner: 0.4, P3: 0.2 } } },
    { kind: 'debt', type: 'Credit card', name: "Cam's card", owner: 'P3', values: { balance: 3200, apr: 0.22, payment: 200, payChoice: 'Custom' } },
    { kind: 'bill', name: 'Electric, gas, water', owner: 'Joint', amount: 300, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable' } },
    { kind: 'bill', name: 'Groceries', owner: 'Joint', amount: 1000, values: { category: 'Groceries', draftt: 'Food', amountType: 'Variable', splitHow: 'Percent', splitPcts: { Me: 0.5, Partner: 0.25, P3: 0.25 } } },
    { kind: 'bill', name: 'Car: gas, insurance, upkeep', owner: 'Joint', amount: 450, values: { category: 'Gas', draftt: 'Transportation', amountType: 'Variable', splitAmong: AB } },
    { kind: 'bill', name: 'Pet costs', owner: 'Joint', amount: 150, values: { category: 'Pets', draftt: 'Other', amountType: 'Variable', splitAmong: AB } },
    { kind: 'bill', name: "Ana's own spending", owner: 'Me', amount: 900, values: { category: 'Other wants', draftt: 'Other', amountType: 'Variable' } },
    { kind: 'bill', name: "Ben's own spending", owner: 'Partner', amount: 700, values: { category: 'Other wants', draftt: 'Other', amountType: 'Variable' } },
    { kind: 'bill', name: "Cam's own spending", owner: 'P3', amount: 800, values: { category: 'Other wants', draftt: 'Other', amountType: 'Variable' } },
  ],
  expected: {
    takeHome: { value: 13600, unit: 'money', ...E, note: '$5,800 + $4,200 + $3,600 (Cam\'s own paycheck, where it was $870 of Cam\'s share as money coming in).' },
    surplus: { value: 6500, unit: 'money', ...E, note: 'Every row once, whole: $2,600 mortgage + $300 + $1,000 + $450 + $150 + $900 + $700 + $800 + $200 card = $7,100; $13,600 - $7,100 = $6,500 (= $2,960 + $1,810 + $1,730).' },
    netWorth: { value: 283300, unit: 'money', ...E, note: '$9,000 + $20,000 + $2,500 + $60,000 + $45,000 + $550,000 - $400,000 - $3,200 = $283,300 (= $134,500 + $119,500 + $29,300).' },
    savingsRate: { value: 0.4779, unit: 'pct', ...E, note: '$6,500 / $13,600.' },
    housingPct: { value: 0.2132, unit: 'pct', ...E, note: '($2,600 mortgage + $300 utilities) / $13,600.' },
    fooStep: { value: '3', unit: 'step', ...E, note: 'Step 1 done ($31,500 cash), no match on file, so step 3: Cam\'s card at 22% is heavy debt.' },
    debtFreeMonths: { value: 268, unit: 'months', ...E, note: 'The card is gone in month 1 ($6,500 of surplus); the mortgage keeps its own $2,600: n = -ln(1 - 0.055/12 x 400,000 / 2,600) / ln(1 + 0.055/12) = 267.1, so 268.' },
    monthsToFi: { value: 172, unit: 'months', ...E, note: 'FI number $7,100 x 12 / 4% = $2,130,000. The surplus pays the card (1 month), then fills big e ($51,120 - $31,500 = $19,620: 4 months), so $105,000 grows 5 months alone to $108,005 (7% real, g = 1.07^(1/12)). Then $6,700 a month (the surplus and the card\'s freed $200): ln((2,130,000 (g-1) + 6,700) / (108,005 (g-1) + 6,700)) / ln g = 167.0, so 5 + 167 = 172 months.' },
    runwayMonths: { value: 4.437, unit: 'months', tol: 0.01, ...E, note: '$31,500 cash / $7,100.' },
    'takeHome:Ana': { value: 5800, unit: 'money', ...A, note: "Ana's own take-home." },
    'surplus:Ana': { value: 2960, unit: 'money', ...A, note: 'Ana: $5,800 - ($1,040 mortgage + $100 utilities + $500 groceries + $225 car + $75 pets + $900 own) = $5,800 - $2,840 = $2,960.' },
    'netWorth:Ana': { value: 134500, unit: 'money', ...A, note: 'Ana: $4,500 + $10,000 (half the joint checking and HYSA) + $60,000 401(k) + $220,000 (40% of the home) - $160,000 (40% of the mortgage) = $134,500.' },
    'savingsRate:Ana': { value: 0.5103, unit: 'pct', ...A, note: '$2,960 / $5,800.' },
    'takeHome:Ben': { value: 4200, unit: 'money', ...B, note: "Ben's own take-home." },
    'surplus:Ben': { value: 1810, unit: 'money', ...B, note: 'Ben: $4,200 - ($1,040 + $100 + $250 groceries + $225 + $75 + $700 own) = $4,200 - $2,390 = $1,810.' },
    'netWorth:Ben': { value: 119500, unit: 'money', ...B, note: 'Ben: $4,500 + $10,000 + $45,000 403(b) + $220,000 - $160,000 = $119,500.' },
    'savingsRate:Ben': { value: 0.431, unit: 'pct', ...B, note: '$1,810 / $4,200.' },
    'takeHome:Cam': { value: 3600, unit: 'money', ...C, note: "Cam's own take-home." },
    'surplus:Cam': { value: 1730, unit: 'money', ...C, note: 'Cam: $3,600 - ($520 mortgage + $100 utilities + $250 groceries + $800 own + $200 card) = $3,600 - $1,870 = $1,730. No car or pets: they are Ana\'s and Ben\'s.' },
    'netWorth:Cam': { value: 29300, unit: 'money', ...C, note: 'Cam: $2,500 checking + $110,000 (20% of the home) - $80,000 (20% of the mortgage) - $3,200 card = $29,300.' },
    'savingsRate:Cam': { value: 0.4806, unit: 'pct', ...C, note: '$1,730 / $3,600.' },
    'housingPct:Cam': { value: 0.1722, unit: 'pct', ...C, note: '($520 + $100) / $3,600.' },
    'heavyDebtMonths:Cam': { value: 2, unit: 'months', ...C, note: 'The card is heavy: $200 + the $1,730 surplus = $1,930 a month. $3,200 x 1.0183 = $3,259 - $1,930 = $1,329; $1,329 x 1.0183 = $1,353 < $1,930: 2 months.' },
  },
  // Batch 47's benefits cliff (M9B), read with batch 49's household: three adults in the plan, a household of 3; the
  // three take-homes worked back to gross come to $187,044 a year, far past every line.
  cliff: {
    near: { value: false, note: '$187,044 a year with work coverage: every line is below them.' },
    size: { value: 3, note: 'Ana, Ben and Cam, each in the plan.' },
    says: ['Nowhere near a benefit line'],
  },
  cannot: [],
};
