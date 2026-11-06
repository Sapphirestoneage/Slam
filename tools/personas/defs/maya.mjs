// Maya: the middle case. A real surplus, a card, some savings and a little invested.
export default {
  id: 'maya', order: 3, name: 'Maya Persona',
  about: 'Made up. Take-home $5,200 a month ($2,400 every 2 weeks), gut $3,500 not including debt, checking $1,200, savings $4,000, invested $15,000, cards $6,000 paying $200 at a guessed 25%, rents, no car, born 1996.',
  profile: {
    firstName: 'Maya', lastName: 'Persona', birthYear: 1996, birthMonth: 8, state: 'NY', nyc: true, household: 'Solo', mode: 'Solo',
    workSituation: 'Employed (W-2)', housing: 'Rent', hasCar: false, hasPets: false, incomeStability: 'Steady', healthCoverage: 'Employer',
    areas: { cash: true, investments: true, real: false, debt: true },
  },
  records: [
    { kind: 'income', type: 'Job', name: 'Paycheck', amount: 2400, per: '2 weeks', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'spending', type: 'All in', name: 'Monthly spending, all in', amount: 3500, status: 'Roughly', values: { includesDebtPayments: false, pass: 'Gut' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 1200 } },
    { kind: 'account', type: 'Savings', name: 'Savings', values: { group: 'cash', balance: 4000 } },
    { kind: 'account', type: 'All investments', name: 'Investments (all accounts)', status: 'Roughly', values: { group: 'investment', balance: 15000 } },
    { kind: 'debt', type: 'Credit card', name: 'Credit cards (total)', fieldStatus: { apr: 'Not sure' }, values: { balance: 6000, payment: 200, payChoice: 'Custom' } },
    { kind: 'bill', name: 'Rent', amount: 1750, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } },
  ],
  expected: {
    takeHome: { value: 5200, unit: 'money', note: '$2,400 x 26 / 12 = $5,200.' },
    netWorth: { value: 14200, unit: 'money', note: '$1,200 + $4,000 + $15,000 - $6,000 = $14,200.' },
    surplus: { value: 1500, unit: 'money', note: '$5,200 - $3,500 - $200 card payment (outside the gut) = $1,500.' },
    savingsRate: { value: 0.2885, unit: 'pct', note: '$1,500 / $5,200 = 28.8%.' },
    fooStep: { value: '3', unit: 'step', note: 'Step 1 done: $5,200 cash covers the $1,615 buffer and $1,000 little e. No match on file. The card is heavy debt.' },
    debtFreeMonths: { value: 4, unit: 'months', note: 'The surplus goes to the card first: $200 + $1,500 = $1,700 a month at a guessed 25%: n = -ln(1 - 0.25/12 x 6,000 / 1,700) / ln(1 + 0.25/12) = 3.7, so 4 months.' },
    heavyDebtMonths: { value: 4, unit: 'months', note: 'The card is the only debt.' },
    fiNumber: { value: 1050000, unit: 'money', note: '$3,500 x 12 / 4% (the card payment ends, so it is not in retirement spending).' },
    monthsToFi: { value: 273, unit: 'months', note: 'Batch 12, freed money follows the FOO: 4 months on heavy debt, then 4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).8,415 of big e left / 4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).,700 a month = 11 months, so 15 months with nothing going in (4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).5,000 grows to 4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).6,324). Then 4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).,700 a month at 7% real to the 4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).,050,000 FI number: 15 + ln((4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).,050,000 (g-1) + 4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).,700) / (4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).6,324 (g-1) + 4 months adding nothing ($15,000 grows to $15,342), then $1,500 + the freed $200 = $1,700 a month at 7% real: 4 + ln((1,050,000 (g-1) + 1,700) / (15,342 (g-1) + 1,700)) / ln g = 261.6, so 262 months (about 21.8 years).,700)) / ln g = 272.1, so 273 months.' },
    runwayMonths: { value: 1.486, unit: 'months', tol: 0.01, note: '$5,200 / $3,500 = 1.49 months.' },
    bigETarget: { value: 21000, unit: 'money', note: 'Age 30 / 5 = 6 months x $3,500 = $21,000.' },
    littleEFull: { value: true, unit: 'bool', note: '$5,200 covers the buffer and $1,000 little e.' },
  },
  // Batch 44: Net worth › Fire drill as of Nov 5 2026 (the 30 days Nov 5 to Dec 4). test/firedrill.test.js.
  fireDrill: {
    account: 'Checking', outOfReach: 12400, reach: 0, mustPay: 3685, days: 0, withCard: 0, ready: 0, items: 4,
    elsewhere: { days: 33, reach: 4000, names: ['Savings'] }, pending: [['Savings', null], ['Credit cards (total)', null]],
    note: 'Paychecks land in checking Nov 6, Nov 20 and Dec 4, $2,400 each. Savings and the card have no bank on Institutions, so they read as at the same bank until each is answered (QUESTIONS 367, 389): $1,200 + $4,000 + $7,200 = $12,400 out of reach, $0 to reach, 0 days. Until then the days tile reads both ways (QUESTIONS 388): "0 days if they are all at this bank · 33 days if savings is elsewhere" (the card has no limit, so it moves nothing and is not named), and the card on top asks Same bank / Another bank for each; neither name sounds like an online bank, so neither tap starts highlighted. Must-pay: the gut number $3,500 (not including debt) + the card minimum, the larger of $25 and 1% of $6,000 + $6,000 x 25% / 12 = $60 + $125 = $185: $3,685, all her spending since the needs are not split out yet (QUESTIONS 366). Savings elsewhere (the second reading, or Another bank tapped): $4,000 / ($3,685 x 12 / 365 = $121.15 a day) = 33.0, so 33 days (test/firedrill.test.js). The card has no limit typed, so no room counts (the drill shows an Add limit box).',
    says: ['$12,400', '0 days if they are all at this bank', '33 days if savings is elsewhere', 'At the same bank as Checking?', 'All your spending, since the needs are not split out yet', 'Split it on Budget', 'room on the card', 'Payroll app or HR portal'],
    notSays: ['close accounts tied to adult work'],
  },
  // Batch 47 (the benefits cliff, M9B): Plan › Raise and benefits says it is nowhere near a line.
  // Batch 55 (the money-control map, js/math/control.js): one person, nothing answered, so every row reads from who owns
  // it: all hers. Sees: you; moves: you; can freeze or close it: the bank (or the firm, the card issuer, the payer) and
  // her. The checklist: Checking looks ready (read, not answered: nobody else is in the household, but "who else is on
  // it" is not tapped yet); the card in her name is ready (one person, so the owner is a fact); the login and the
  // statements are open until tapped.
  control: {
    rows: ['Checking', 'Savings', 'Investments (all accounts)', 'Credit cards (total)', 'Paycheck'], lines: {}, answered: 0,
    cols: { Checking: { sees: ['Me'], moves: ['Me'], stops: ['Me', 'Bank'] }, 'Credit cards (total)': { sees: ['Me'], moves: ['Me'], stops: ['Me', 'Bank'] }, Paycheck: { sees: ['Me'], moves: ['Me'], stops: ['Me', 'Bank'] } },
    checklist: [['own', 'likely', 'Checking'], ['login', 'open', null], ['email', 'open', null], ['card', 'ready', 'Credit cards (total)']],
  },
  cliff: {
    near: { value: false, note: '$86,000 a year in New York City with work coverage: every line is below her.' },
    says: ['Nowhere near a benefit line'],
  },
  cannot: [],
};
