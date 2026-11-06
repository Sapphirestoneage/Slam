// A married couple who keep money separate, where one partner earns on a fan site the other partner and the family do
// not know about (batch 28, who sees this). Remy's platform income and the account its payouts land in are marked Me
// and my coach (the income shows as Self-employment in anything shared); Dana's store card is Dana's own private row;
// the coach keeps a coach-only note on the platform row and one coach-only Budget line. Every total in every view is
// the coach's total; only the names change (test/privacy.test.js, tools/e2e/privacy.cjs).
export default {
  id: 'discreet-couple', order: 15, name: 'Remy and Dana', view: 'all',
  about: 'Made up. Married, money kept separate. Remy: a cafe job ($1,350 every 2 weeks) and a fan page on OnlyFans (about $2,975 a month gross, $115 chargebacks, weekly payouts) kept between Remy and the coach, its payouts in a separate account; Dana: a W-2 job ($4,200 a month), a 401(k) and a store card Dana keeps private.',
  profile: {
    firstName: 'Remy', lastName: 'Persona', partnerName: 'Dana', birthYear: 1997, birthMonth: 4, partnerBirthYear: 1994, state: 'IL',
    household: 'Couple', mode: 'Married separate', moneyStyle: 'Separate', splitMethod: 'By income',
    workSituation: 'Mixed', housing: 'Rent', hasCar: false, hasPets: false, incomeStability: 'Varies', healthCoverage: 'Employer',
    shared: { rent: true, utilities: false, internet: false, renters: false, groceries: false, household: false },
    sharedAs: { rent: 'The whole bill' },
    areas: { cash: true, investments: true, real: false, debt: true },
  },
  client: { couple: true },
  records: [
    { kind: 'income', type: 'Job', name: "Remy's cafe job", owner: 'Me', amount: 1350, per: '2 weeks', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } },
    { kind: 'income', type: 'Platform', name: 'Velvet Room fan page', owner: 'Me', amount: 2975, per: 'month', status: 'Roughly',
      notes: 'Payouts every Friday to the Wise account',
      privateNote: 'Remy has not told family about the page; nothing printed should name it.',
      values: { platform: 'OnlyFans', chargebacks: 115, payFrequency: 'week', nextPayday: '2026-11-13', seen: 'Me and my coach', notesSeen: 'Coach only', shareName: 'Self-employment', landsIn: '@wise' } },
    { kind: 'income', type: 'Partner job', name: "Dana's paycheck", owner: 'Partner', amount: 4200, per: 'month', values: { basis: 'Take-home', payFrequency: 'twice a month', incomeType: 'W-2' } },
    { kind: 'spending', type: 'All in', name: "Remy's spending, all in", owner: 'Me', amount: 2400, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'spending', type: 'All in', name: "Dana's spending, all in", owner: 'Partner', amount: 2100, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } },
    { kind: 'bill', name: 'Rent', amount: 2300, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } },
    { kind: 'bill', name: 'Discreet PO box', owner: 'Me', amount: 37, values: { category: 'Bills and subscriptions', amountType: 'Fixed', seen: 'Coach only' } },
    // Batch 55 (the money-control map): Remy and Dana share the login and the mailbox for Remy's checking; the Wise
    // account is Remy's alone (nobody else on it, its own login, statements to Remy's own email); Dana is an authorized
    // user on Remy's card.
    { kind: 'account', type: 'Checking', name: "Remy's checking", owner: 'Me', values: { group: 'cash', balance: 2140, ctlLogin: 'Shared', ctlMail: 'Shared' } },
    { ref: 'wise', kind: 'account', type: 'Savings', name: 'Wise payout account', owner: 'Me', values: { group: 'cash', balance: 3871, purpose: 'Taxes', last4: '7781', seen: 'Me and my coach', ctlOn: {}, ctlLogin: 'Me', ctlMail: 'Me' } },
    { kind: 'account', type: 'Checking', name: "Dana's checking", owner: 'Partner', values: { group: 'cash', balance: 5200 } },
    { kind: 'account', type: '401(k)', name: "Dana's 401(k)", owner: 'Partner', values: { group: 'investment', balance: 18400 } },
    { kind: 'debt', type: 'Credit card', name: "Remy's card", owner: 'Me', values: { balance: 2000, apr: 0.24, payment: 80, payChoice: 'Custom', ctlOn: { Partner: 'Authorized user' } } },
    { kind: 'debt', type: 'Credit card', name: 'Lantern store card', owner: 'Partner', values: { balance: 1373, apr: 0.29, payment: 60, payChoice: 'Custom', seen: 'Me and my coach' } },
  ],
  expected: {
    netWorth: { value: 26238, unit: 'money', note: 'The household, every row counted whoever sees it: $2,140 + $3,871 (set aside for taxes, still owned) + $5,200 + $18,400 - $2,000 - $1,373 = $26,238.' },
    runwayMonths: { value: 1.6311, unit: 'months', tol: 0.01, note: 'Cash that is not set aside for taxes: $2,140 + $5,200 = $7,340, over the $4,500 the two spend a month ($2,400 + $2,100, all in) = 1.631 months. The coach-only PO box line ($37) is a Budget line, read only when the lines are used, so this reads the gut numbers.' },
  },
  // Batch 47 (the benefits cliff, M9B): Plan › Raise and benefits says it is nowhere near a line.
  // Batch 55 (the money-control map): Remy's own map (Dana's rows are Dana's; Remy is on none of them). Remy's checking:
  // a shared login and a shared mailbox, so Dana sees it and can move it: "Dana can move all of this too." The Wise
  // payout account: nobody else on it, Remy's own login and email: all Remy's, no line. Remy's card: Dana is an
  // authorized user, so Dana can charge on it and the balance is Remy's. The cafe pay lands in Remy's checking (Dana can
  // move it there); the fan page pays out to the Wise account, so its line is the platform's: it can close the account
  // and hold what it owes. Checklist: all four ready from the answers (the Wise account, its login and statements, and
  // Remy's card in Remy's name). In Dana's view, and in the household's Client view, none of this exists.
  control: {
    rows: ["Remy's checking", 'Wise payout account', "Remy's card", "Remy's cafe job", 'Velvet Room fan page'], answered: 3,
    lines: { "Remy's checking": 'Dana can move all of this too.', "Remy's card": 'Dana can charge on this card, and the balance is yours.', "Remy's cafe job": 'Dana can move this pay once it lands.', 'Velvet Room fan page': 'The platform can close the account and hold what it owes you.' },
    cols: { 'Wise payout account': { sees: ['Me'], moves: ['Me'], stops: ['Me', 'Bank'] }, "Remy's card": { sees: ['Me', 'Partner'], moves: ['Me', 'Partner'], stops: ['Me', 'Bank'] } },
    checklist: [['own', 'ready', 'Wise payout account'], ['login', 'ready', 'Wise payout account'], ['email', 'ready', 'Wise payout account'], ['card', 'ready', "Remy's card"]],
  },
  cliff: {
    near: { value: false, note: '$123,200 a year for two in IL with work coverage.' },
    says: ['Nowhere near a benefit line'],
  },
  cannot: [
  ],
};
