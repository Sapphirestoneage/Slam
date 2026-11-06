// The job-loss case (batch 21, Life Transitions): laid off in October, unemployment until April, some savings, two
// cards (one at 0%), an old 401(k), and parents who have said they could help with $3,000.
export default {
  id: 'job-loss', order: 13, name: 'Riley Between',
  about: 'Made up. Laid off in Oct 2026: unemployment $600 a week until Apr 18 2027, no other income. Budget lines $2,970 a month plus $150 of card payments, checking $2,500, savings $9,000, an old 401(k) of $42,000, a card at 24% ($3,000 of an $8,000 limit) and one at 0% until Dec 2027 ($500 of $5,000), family help $3,000. Rents in NY (not NYC), no car, born Mar 1990.',
  profile: {
    firstName: 'Riley', lastName: 'Between', birthYear: 1990, birthMonth: 3, state: 'NY', nyc: false, household: 'Solo', mode: 'Solo',
    workSituation: 'Between jobs', housing: 'Rent', hasCar: false, hasPets: false, incomeStability: 'Steady', healthCoverage: 'ACA',
    areas: { cash: true, investments: true, real: false, debt: true },
    worry: 'Running out before the next job', goalWords: 'Get through to the next job calmly',
    backups: [{ kind: 'Family help', amount: 3000 }],
  },
  spending: { source: 'lines' },
  program: {
    transition: {
      template: 'job-loss', from: 'Laid off', to: 'Next job', start: '2026-11',
      tripwires: [
        { id: 'tw1', if: { kind: 'rung', rung: 'card' }, then: 'Take any job that covers the Basics' },
        { id: 'tw2', if: { kind: 'date', ym: '2027-02' }, then: 'Start contract or temp work' },
      ],
      plans: [{ id: 'B', name: 'Plan B', extra: 1500, from: 2 }],
    },
  },
  records: [
    { kind: 'income', type: 'Unemployment', name: 'Unemployment benefits', amount: 600, per: 'week', values: { payFrequency: 'week', benefitStart: '2026-10-19', benefitEnd: '2027-04-18', withhold: 'No' } },
    { kind: 'account', type: 'Checking', name: 'Checking', values: { group: 'cash', balance: 2500 } },
    { kind: 'account', type: 'Savings', name: 'Savings', values: { group: 'cash', balance: 9000 } },
    { kind: 'account', type: '401(k)', name: '401(k) from the old job', values: { group: 'investment', balance: 42000, taxType: 'Pretax' } },
    { kind: 'debt', type: 'Credit card', name: 'Everyday card', values: { balance: 3000, apr: 0.24, payment: 100, payChoice: 'Custom', limit: 8000 } },
    { kind: 'debt', type: 'Credit card', name: 'Balance transfer card', values: { balance: 500, apr: 0.2299, payment: 50, payChoice: 'Custom', limit: 5000, promoApr: 0, promoEnd: '2027-12' } },
    { kind: 'bill', name: 'Rent', amount: 1600, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } },
    { kind: 'bill', name: 'Electric, gas, water', amount: 120, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable' } },
    { kind: 'bill', name: 'Internet', amount: 60, values: { category: 'Internet', draftt: 'Accommodation', amountType: 'Fixed' } },
    { kind: 'bill', name: 'Groceries', amount: 450, values: { category: 'Groceries', draftt: 'Food', amountType: 'Variable' } },
    { kind: 'bill', name: 'Dining out and takeout', amount: 200, values: { category: 'Dining out', draftt: 'Food', amountType: 'Variable' } },
    { kind: 'bill', name: 'Transit', amount: 130, values: { category: 'Transit', draftt: 'Transportation', amountType: 'Fixed' } },
    { kind: 'bill', name: 'Phone', amount: 50, values: { category: 'Phone', draftt: 'Bills', amountType: 'Fixed' } },
    { kind: 'bill', name: 'Therapy', amount: 80, values: { category: 'Therapy', draftt: 'Therapy', amountType: 'Fixed' } },
    { kind: 'bill', name: 'Streaming', amount: 30, values: { category: 'Streaming', draftt: 'Bills', amountType: 'Fixed' } },
    { kind: 'bill', name: 'Other wants', amount: 250, values: { category: 'Other wants', draftt: 'Other', amountType: 'Variable' } },
  ],
  expected: {
    takeHome: { value: 2600, unit: 'money', note: 'Unemployment $600 a week x 52 / 12 = $2,600 a month, nothing withheld.' },
    netWorth: { value: 50000, unit: 'money', note: '$2,500 + $9,000 + $42,000 - $3,000 - $500 = $50,000.' },
    surplus: { value: -520, unit: 'money', note: '$2,600 - ($2,970 of lines + $150 of card payments) = -$520: the gap.' },
    savingsRate: { value: -0.2, unit: 'pct', note: '-$520 / $2,600.' },
    fooStep: { value: '1', unit: 'step', note: 'A gap every month (spending over take-home) keeps the household on step 1.' },
    runwayMonths: { value: 3.686, unit: 'months', tol: 0.01, note: '$11,500 cash / $3,120 a month.' },
    bigETarget: { value: 22464, unit: 'money', note: 'Age 36 / 5 = 7.2 months x $3,120 = $22,464.' },
    littleEFull: { value: true, unit: 'bool', note: '$11,500 covers the $1,440 buffer and $1,000 little e.' },
    monthsToFi: { value: 'never', unit: 'months', note: 'Nothing goes in while the month is short.' },
  },
  // Life Transitions, worked by hand (test/transitions.test.js). Start Nov 2026 (as built, Nov 5 2026). Benefits $2,600
  // a month count in Nov to Mar (they end Apr 18 2027, so from Apr on they are gone, as batch 15 counts them): 5 months.
  transition: {
    burn: { full: 3120, draftt: 2840, fat: 2610, food: 2430,
      note: 'Full: $2,970 lines + $150 card payments. DRAFTT: housing $1,780 (rent, utilities, internet) + food $650 + transit $130 + phone $50 (stays with FAT) + therapy $80 + card payments $150 = $2,840 (streaming and other wants go). FAT: $1,780 + $650 + $130 + $50 = $2,610. Food and housing: $1,780 + $650 = $2,430.' },
    rungs: { buffer: 1440, littleE: 1000, bigE: 9060, cut: 280, benefits: 2600, family: 3000, card0: 4500, card: 5000, retirement: 31202, retirementPenalty: 4200, retirementTax: 6598,
      note: 'Buffer: 2 weeks of $3,120 = $1,440. little e $1,000. big e: $11,500 - $2,440 = $9,060. Cut: $3,120 - $2,840 = $280 a month. Family help from Backups. 0% card: $5,000 - $500; regular card $8,000 - $3,000. 401(k) $42,000: penalty 10% = $4,200; tax on top of $13,000 of benefits (5 x $2,600): federal on $55,000 - $16,100 = $38,900 is $1,240 + $26,500 x 12% = $4,420 (on $13,000 alone: $0); NY on $47,000 is $331.50 + $140.80 + $113.30 + $1,787.40 = $2,373 less $195 on $5,000 = $2,178; $4,420 + $2,178 = $6,598. You keep $42,000 - $4,200 - $6,598 = $31,202.' },
    runway: { value: 23.987, tol: 0.01, floor: '2028-10',
      note: 'Cut to DRAFTT from the start: $2,840 - $2,600 = $240 a month for 5 months ($1,200), then $2,840. The rungs hold $11,500 + $3,000 + $4,500 + $5,000 + $31,202 = $55,202. The regular card is reached in Oct 2027: $2,080 there in month 12 grows 2% ($41.60), then $2,840 more leaves $38.40 of room that its interest takes: $80 of room used by interest. 5 + ($55,202 - $1,200 - $80) / $2,840 = 5 + 18.987 = 23.987 months, to Oct 2028.' },
    levels: { full: 21.845, draftt: 23.987, fat: 26.081, food: 28.013,
      note: 'Full: $520 a month for 5 months, then $3,120; the card takes $46.40 of interest from its room: 5 + ($55,202 - $2,600 - $46.40) / $3,120 = 21.845. FAT: $10 a month for 5 months, then $2,610, $130.17 of card interest: 5 + 55,021.83 / 2,610 = 26.081. Food and housing: $170 a month over for 5 months goes back into the buffer, then $2,430, $130.20 of card interest: 5 + ($56,052 - $130.20) / $2,430 = 28.013.' },
    tripwires: { card: '2027-10', date: '2027-02', note: 'The regular card is first used in month 12 (Oct 2027); the date tripwire is Feb 2027.' },
    planB: { value: 48.399, tol: 0.01, card: '2028-08',
      note: '$1,500 a month more from month 3: $240 short in Nov and Dec, $1,260 over in Jan to Mar (into the buffer), then $1,340 a month. $55,202 - $480 + $3,780 = $58,502. The 0% card is reached in May 2028, after its promo, so its 23% takes $133.75 of its room; the regular card (Aug 2028) $213.53. 5 + ($58,502 - $347.28) / $1,340 = 48.399 months.' },
    cardExample: { apr: 0.24, cost: 60, note: '$1,000 x 24% / 12 x 3 months = $60.' },
  },
  // Batch 47 (the benefits cliff, M9B): New York, on the marketplace (About you) with unemployment of $31,200 a year:
  // 195.5% of the line, so the Essential Plan (free to 200%, $31,920). A new job at $1,000 a year more ends it.
  cliff: {
    near: { value: true, note: 'The Essential Plan is a Getting it (a Guess: ACA on About you, under 200%).' },
    essentialLine: { value: 31920, note: '200% x $15,960.' },
    next: { value: 'essential', note: '$720 above the $31,200.' },
    health1000: { value: 2204.4, tol: 0.5, note: 'At $32,200 (201.75% of the line, 6.78% + 3.5% of the way to 8.66% = 6.846%) they pay $2,204.40 a year for the benchmark plan instead of $0.' },
    says: ['The Essential Plan ends', 'behind'],
  },
  cannot: [], // batch 24: Report › Overview reads the benefit's taxes now (the household rates, as on Taxes)
};
