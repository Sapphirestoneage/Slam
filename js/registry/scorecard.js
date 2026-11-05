// SPDX-License-Identifier: AGPL-3.0-only
// The scorecard registry (Phase 3, batch 2): the areas every client is scored on, the three ratings, the rules and
// thresholds that suggest a rating from the data, how each hole's payoff is worked out, the default effort, and the
// FOO step each area belongs to (holes before the client's current step rank first). One place: js/math/scorecard.js
// reads it, the spreadsheet's Assumptions tab lists the thresholds, and the spec's Program tab mirrors the words.
// Add or rename an area here; a coach can always override a rating on the Scorecard.

export const RATINGS = ['Strong', 'OK', 'Hole'];
export const FOO_ORDER = ['0a', '0b', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// id, name, the FOO step it belongs to, the default effort to fill it (hours, editable per client), where it lives.
export const AREAS = [
  { id: 'cashFlow', name: 'Cash flow', foo: '1', effort: 4, route: '#/cash-flow/budget' },
  { id: 'emergency', name: 'Emergency fund', foo: '1', effort: 2, route: '#/net-worth/assets' },
  { id: 'debt', name: 'Debt', foo: '3', effort: 3, route: '#/net-worth/debt' },
  { id: 'credit', name: 'Credit', foo: '3', effort: 2, route: '#/net-worth/credit-cards' },
  { id: 'retirement', name: 'Retirement accounts', foo: '2', effort: 1, route: '#/net-worth/assets' },
  { id: 'investing', name: 'Investing', foo: '8', effort: 2, route: '#/net-worth/assets' },
  { id: 'taxes', name: 'Taxes', foo: '5', effort: 2, route: '#/cash-flow/taxes' },
  { id: 'protection', name: 'Protection', foo: '1', effort: 2, route: '#/net-worth/protection' },
  { id: 'income', name: 'Income', foo: '1', effort: 8, route: '#/cash-flow/income' },
  { id: 'goals', name: 'Goals', foo: '7', effort: 1, route: '#/plan/goals' },
  { id: 'mindset', name: 'Mindset', foo: '0b', effort: 4, route: '#/home/session' },
];

// The rules' thresholds. Each area with a clear rule is suggested from the data; the rest (Taxes, and any area the
// data cannot see) stay unrated until the coach rates them.
export const THRESHOLDS = {
  cashFlow: { strong: 0.20, ok: 0.05 }, // the headline savings rate; a negative surplus is a hole
  emergency: { holeMonths: 1, strongMonths: 3 }, // cash over a month of spending; the Rule of 5 target met is Strong too
  debt: { dti: 0.36 }, // heavy debt (cards, payday, personal, high APR) is a hole; payments over this share of gross is OK at best
  credit: { strong: 740, ok: 670, utilizationOk: 0.30, utilizationHole: 0.50 }, // the score; card use over the limits
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
