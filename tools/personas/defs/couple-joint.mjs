// A married couple with combined money: one paycheck, one partner at home with the baby, a 529.
export default {
  id: 'couple-joint', order: 6, name: 'Priya and Dev',
  about: 'Made up. Married, money combined, Dev stays home with their baby. Priya earns $120,000 (take-home $7,200 a month) with a 401(k) and a 100% match up to 4%. A home with a mortgage, a paid-off car, a 529.',
  profile: {
    firstName: 'Priya', lastName: 'Persona', partnerName: 'Dev', birthYear: 1991, birthMonth: 2, partnerBirthYear: 1990, state: 'TX',
    household: 'Couple', mode: 'Married merged', moneyStyle: 'Joint', dependents: 1, kidAges: [1],
    workSituation: 'Employed (W-2)', housing: 'Own', hasCar: true, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Employer',
    areas: { cash: true, investments: true, real: true, debt: true },
    // Batch 25: made-up answers to who they are with money. The address is the household's (FWC and both arrows); the
    // letters are each partner's: Priya EPGX, Dev KOVS.
    identity: { address: { feel: 'calm', earnMore: true, spendLess: true }, letters: { Me: [1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1], Partner: [-1, -1, -1, 0, 1, 1, 1, 1, -1, -1, 0, 1] } },
  },
  client: { couple: true },
  session: { weather: { 1: { at: '2026-11-05T12:00:00.000Z', Me: [0, 0, 1, 2, 0, 2], Partner: [1, 1, 1, 1, 1, 1] } } }, // batch 25: Priya Clear, Dev Overcast
  records: [
    { kind: 'income', type: 'Job', name: "Priya's salary", owner: 'Me', amount: 7200, per: 'month', values: { basis: 'Both', gross: 120000, payFrequency: '2 weeks', incomeType: 'W-2', contributionPct: 0.06, hasMatch: 'Yes', matchPct: 1, matchCapPct: 0.04 } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 6100, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Joint checking', owner: 'Joint', values: { group: 'cash', balance: 6000 } },
    { kind: 'account', type: 'Savings or HYSA', name: 'Joint HYSA', owner: 'Joint', values: { group: 'cash', balance: 15000, purpose: 'Emergency' } },
    { kind: 'account', type: '401(k)', name: "Priya's 401(k)", owner: 'Me', values: { group: 'investment', balance: 85000 } },
    { kind: 'account', type: 'Roth IRA', name: "Dev's Roth IRA", owner: 'Partner', values: { group: 'investment', balance: 20000 } },
    { kind: 'account', type: '529', name: "Baby's 529", owner: 'Joint', values: { group: 'investment', balance: 8000, contribution: 200, contributionPer: 'Month', purpose: 'Goal' } },
    { ref: 'home', kind: 'asset', type: 'Home', name: 'Home', owner: 'Joint', values: { value: 480000, financed: 'Financed' } },
    { kind: 'debt', type: 'Mortgage', name: 'Mortgage', owner: 'Joint', linkedTo: '@home', values: { balance: 360000, apr: 0.061, payment: 2300 } },
    { kind: 'asset', type: 'Car', name: 'Car', owner: 'Joint', values: { value: 18000, financed: 'Paid off' } },
    { kind: 'coverage', type: 'Health', name: 'Family health plan', amount: 420, per: 'month', values: { have: 'Have it', deductible: 4000, paidFrom: 'Paycheck' } },
    { kind: 'coverage', type: 'Life', name: "Priya's term life", amount: 35, per: 'month', values: { have: 'Have it' } },
    { kind: 'bill', name: 'Childcare and babysitting', amount: 300, values: { category: 'Kids', draftt: 'Other', amountType: 'Variable' } },
  ],
  expected: {
    netWorth: { value: 272000, unit: 'money', note: '$6,000 + $15,000 + $85,000 + $20,000 + $8,000 529 + $480,000 + $18,000 - $360,000 = $272,000.' },
    surplus: { value: 1100, unit: 'money', note: '$7,200 - $6,100 = $1,100.' },
    savingsRate: { value: 0.2561, unit: 'pct', note: '401(k) $120,000 x 6% / 12 = $600, match 4% x $120,000 / 12 = $400. ($1,100 + $600 + $400) / ($7,200 + $1,000) = 25.6%.' },
    fooStep: { value: '4', unit: 'step', note: 'Step 1 done ($21,000 cash), match taken (6% over the 4% cap), no heavy debt. big e: Priya 35 / 5 = 7 months x $6,100 = $42,700.' },
    debtFreeMonths: { value: 314, unit: 'months', note: 'Mortgage at $2,300: n = -ln(1 - 0.061/12 x 360,000 / 2,300) / ln(1 + 0.061/12) = 313.2, so 314.' },
    monthsToFi: { value: 293, unit: 'months', note: 'A coach leaves the 529 out of FI (question 214): invested $105,000 (not $113,000), and the $200 a month into the 529 is not retirement money. Batch 12, freed money follows the FOO: $25,515 of big e left / ($1,100 - $200 = $900 a month) = 28.4, so 29 months with only the $600 401(k) and $400 match going in; then $1,900 a month. FI number $6,100 x 12 / 4% = $1,830,000: 293 months.' },
    runwayMonths: { value: 3.443, unit: 'months', tol: 0.01, note: '$21,000 / $6,100.' },
    bigETarget: { value: 42700, unit: 'money', note: '7 x $6,100.' },
  },
  // Batch 44: Net worth › Fire drill as of Nov 5 2026 (the 30 days Nov 5 to Dec 4). test/firedrill.test.js.
  fireDrill: {
    account: 'Joint checking', outOfReach: 15969.24, reach: 15000, mustPay: 6100, days: 74, withCard: 74, stranded: 2,
    note: "Priya's pay lands in joint checking every 2 weeks: $7,200 x 12 / 26 = $3,323.08 on Nov 6, Nov 20 and Dec 4 ($9,969.24). Out of reach: $6,000 + $9,969.24 = $15,969.24. Reachable: the joint HYSA $15,000. Must-pay: the gut number $6,100, which holds the $2,300 mortgage (housing, first in the order); no other debt. $15,000 / ($6,100 x 12 / 365 = $200.55 a day) = 74.8, so 74 days. Priya's 401(k) gets her 6%, so it is not listed as stranded: 2 rows (old jobs' plans, unclaimed property).",
    says: ['$15,969', '$15,000', 'About 74 days', 'Mortgage payment', 'Housing'],
    notSays: ['close accounts tied to adult work'],
  },
  cannot: [
    'College costs: a 529 stays out of FI (batch 15), but there is no per-child goal, no college cost, no years until college.',
    'One income household: no field for the stay-at-home partner (spousal IRA eligibility, the value of the care, a return-to-work date).',
  ],
};
