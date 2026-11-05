// SPDX-License-Identifier: AGPL-3.0-only
// The ladder registry (overnight, Nov 5): milestones of two kinds, one list each. STEPS are actions in a fixed order
// that follows SLAM's own FOO; MARKERS are reached whenever the math gets there and slot in by date. Net worth zero is
// a marker, not a starting point. js/math/ladder.js reads this; Home shows the next step and the next marker.
export const STEPS = [
  { id: 'littleE', name: 'little e', what: 'Plumbing emergencies covered: $1,000 or the highest deductible, whichever is smaller', foo: '1' },
  { id: 'match', name: '401(k) match captured', what: 'Putting in enough to get the full employer match', foo: '2', applies: 'matchOffered' },
  { id: 'heavy25', name: '25% of heavy debt paid', what: 'A quarter of the heavy debt (APR at or over the heavy line) gone since Day 0', foo: '3', share: 0.25, applies: 'heavyDebt' },
  { id: 'heavy50', name: '50% of heavy debt paid', what: 'Half of it gone', foo: '3', share: 0.5, applies: 'heavyDebt' },
  { id: 'heavy75', name: '75% of heavy debt paid', what: 'Three quarters gone', foo: '3', share: 0.75, applies: 'heavyDebt' },
  { id: 'heavyFree', name: 'Heavy debt free', what: 'No debt at or over the heavy-debt APR', foo: '3', share: 1, applies: 'heavyDebt' },
  { id: 'bigE', name: 'big e', what: 'Losing-a-job emergencies covered: the Rule of 5, five months of spending', foo: '4' },
];
export const MARKERS = [
  { id: 'nwZero', name: 'Net worth positive', what: 'What you own is more than what you owe', kind: 'netWorth', target: 0 },
  { id: 'consumerFree', name: 'All consumer debt free', what: 'Cards, personal, BNPL, payday, medical and family loans at $0', kind: 'consumerFree' },
  { id: 'nw100k', name: '$100k net worth', what: 'Six figures of net worth', kind: 'netWorth', target: 100000 },
  { id: 'qq', name: 'Quiet Quitting FI', what: 'Invested enough that the yearly minimum alone reaches FI', kind: 'invested', target: 'qq' },
  { id: 'coast', name: 'Coast FI', what: 'Invested enough to stop adding and still reach FI at the FI age', kind: 'invested', target: 'coast' },
  { id: 'lean', name: 'Lean FI', what: '25 times needs-only spending (food, accommodation, transportation)', kind: 'invested', target: 'lean' },
  { id: 'fi', name: 'FI', what: '25 times current spending', kind: 'invested', target: 'fi' },
  { id: 'fat', name: 'Fat FI', what: '25 times spending, times the Fat multiplier (1.5; the label can be renamed per client)', kind: 'invested', target: 'fat', editable: true },
];
export const LADDER = { nw100k: 100000, heavyShares: [0.25, 0.5, 0.75, 1] };
