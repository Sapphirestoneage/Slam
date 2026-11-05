// SPDX-License-Identifier: AGPL-3.0-only
// The scorecard registry (Phase 3, batch 2): the areas every client is scored on, the three ratings, the rules and
// thresholds that suggest a rating from the data, how each hole's payoff is worked out, the default effort, and the
// FOO step each area belongs to (holes before the client's current step rank first). One place: js/math/scorecard.js
// reads it, the spreadsheet's Assumptions tab lists the thresholds, and the spec's Program tab mirrors the words.
// Add or rename an area here; a coach can always override a rating on the Scorecard.

export const RATINGS = ['Strong', 'OK', 'Hole'];
export { ORDER as FOO_ORDER } from './foo.js';

// id, name, the step of SLAM's own FOO it belongs to (js/registry/foo.js; fooWhen moves it with the facts), the usual
// effort to fill it (hours, editable per client), where it lives. Answer 135: goals and mindset sit at step 0.
export const AREAS = [
  { id: 'cashFlow', name: 'Cash flow', foo: '1', fooWords: 'Stop the bleeding', effort: 4, route: '#/cash-flow/budget' },
  { id: 'emergency', name: 'Emergency fund', foo: '1', fooWhen: f => (f.littleFull ? '4' : '1'), fooWords: 'little e at step 1, then big e at step 4', effort: 2, route: '#/net-worth/assets' },
  { id: 'debt', name: 'Debt', foo: '3', fooWords: 'Clear the heavy debt', effort: 3, route: '#/plan/debt-payoff' }, // F3: the hole links to the payoff calculators
  { id: 'credit', name: 'Credit', foo: '3', fooWords: 'Clear the heavy debt (cards)', effort: 2, route: '#/net-worth/credit-cards' },
  { id: 'retirement', name: 'Retirement accounts', foo: '2', fooWhen: f => (f.matchOffered && f.matchLeft > 0 ? '2' : '5'), fooWords: 'Take the free money while match is on the table, then Roth and HSA', effort: 1, route: '#/net-worth/assets' },
  { id: 'investing', name: 'Investing', foo: '6', fooWords: 'Prepay retirement (Coast FI)', effort: 2, route: '#/net-worth/assets' },
  { id: 'taxes', name: 'Taxes', foo: '5', fooWords: 'Roth and HSA (the tax levers)', effort: 2, route: '#/cash-flow/taxes' },
  { id: 'protection', name: 'Protection', foo: '1', fooWords: 'Stop the bleeding (coverage, deductibles)', effort: 2, route: '#/net-worth/protection' },
  { id: 'income', name: 'Income', foo: '1', fooWords: 'Stop the bleeding', effort: 8, route: '#/cash-flow/income' },
  { id: 'goals', name: 'Goals', foo: '0b', fooWords: 'Step 0, with mindset', effort: 1, route: '#/plan/goals' },
  { id: 'mindset', name: 'Mindset', foo: '0b', fooWords: 'Step 0, with goals', effort: 4, route: '#/home/session' },
];

// The rules' thresholds. Each area with a clear rule is suggested from the data; the rest (Taxes, and any area the
// data cannot see) stay unrated until the coach rates them.
export const THRESHOLDS = {
  cashFlow: { strong: 0.20, ok: 0.05 }, // the headline savings rate; a negative surplus is a hole
  emergency: { strong: 'big e full (age / 5 months)' }, // Hole until little e is full; OK with little e; Strong with big e full (the Rule of 5: age / 5 months, bigEMonthsOf, five months of spending)
  debt: { dti: 0.36 }, // heavy debt (cards, payday, personal, or any APR at or over the heavy line, 8%, RULES.heavyApr) is a hole; payments over this share of gross is OK at best
  credit: { strong: 740, ok: 670, utilizationHole: 0.30 }, // the score; cards used over this share of the limits is a hole (answer 132)
  retirement: { strongPct: 0.15 }, // 401(k), HSA and after-tax retirement saving as a share of gross; match left on the table is a hole
  investing: { strongPct: 0.15 }, // what goes into investments a month as a share of take-home
  goals: { count: 3 }, // three short-term and three long-term goals, each with an amount, a date and a tag (S4)
  mindset: { strong: 7, hole: 4 }, // the money feeling, 1 to 10, asked at the end of each session
};

// How a hole's payoff (dollars a year) is worked out. Areas with no rule take a payoff typed by the coach.
export const PAYOFF = {
  emergency: { months: 3 }, // the gap to this many months of spending, carried on a card at the typical card APR
  credit: { aprPoints: 0.02 }, // a weak score costs about this much more APR on everything financed
  retirement: { targetPct: 0.06 }, // with nothing going in: the tax saved by putting this share of gross away before tax, plus any match left on the table
  investing: {}, // idle cash above the emergency target, plus a surplus not invested, grown at the real return
};
