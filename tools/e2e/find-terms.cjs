// The everyday terms Find must understand (39 from batch 14, item 1; more from batches 20, 22 and 23) and where each must land: the screens it may land on
// (the second is where the client has none of that thing yet, e.g. no HSA: About you says whether the plan allows one)
// and the box, as a pattern on the box's data-focus. Read by tools/e2e/findability.cjs and test/findability.test.js.
const A = '#/net-worth/assets', D = '#/net-worth/debt', C = '#/net-worth/credit-cards', P = '#/net-worth/protection', I = '#/cash-flow/income', B = '#/cash-flow/budget',
  T = '#/cash-flow/taxes', G = '#/plan/goals', Y = '#/home/profile';
const TERMS = [
  { term: 'rent', routes: [B], box: /:amount$|^cat:Accommodation:amount$/ },
  { term: 'paycheck', routes: [I], box: /:amount$|^add:income$/ },
  { term: 'salary', routes: [I], box: /:amount$|^add:income$/ },
  { term: 'bonus', routes: [I], box: /:bonus$|^add:income$/ },
  { term: 'side income', routes: [I], box: /:amount$|^add:income$/ },
  { term: '401k', routes: [A], box: /:balance$|^add:asset$/ },
  { term: '401(k) match', routes: [I, A], box: /^seg:Employer match:Yes$|:balance$|^add:income$/ },
  { term: 'employer match', routes: [I, A], box: /^seg:Employer match:Yes$|:balance$|^add:income$/ },
  { term: 'Roth IRA', routes: [A], box: /:balance$|^add:asset$/ },
  { term: 'HSA', routes: [A, Y], box: /:balance$|^seg:HSA-eligible:true$/ },
  { term: 'checking', routes: [A], box: /:balance$|^add:asset$/ },
  { term: 'savings', routes: [A], box: /:balance$|^add:asset$/ },
  { term: 'emergency fund', routes: [A], box: /^sec:assets:layers$|:balance$|^add:asset$/ }, // batch 18: the Cash layers card first, the savings balance second
  { term: 'credit card', routes: [C], box: /:balance$|^add:card$/ },
  { term: 'APR', routes: [D, C], box: /:apr$/ },
  { term: 'credit score', routes: [C], box: /^credit:score$/ },
  { term: 'student loan', routes: [D], box: /:balance$|^add:debt$/ },
  { term: 'car loan', routes: [D, A], box: /:balance$|:loanBal$|^add:debt$/ },
  { term: 'car', routes: [A, Y], box: /:balance$|^seg:Has a car:true$/ },
  { term: 'mortgage', routes: [D, Y], box: /:balance$|^seg:Housing:Own$/ },
  { term: 'home value', routes: [A, Y], box: /:balance$|^seg:Housing:Own$/ },
  { term: 'groceries', routes: [B], box: /:amount$|^cat:Food:amount$/ },
  { term: 'phone', routes: [B], box: /:amount$|^cat:Bills:amount$/ },
  { term: 'subscriptions', routes: [B], box: /^cat:Bills:amount$/ },
  { term: 'insurance', routes: [P], box: /:have$|^add:coverage$/ },
  { term: 'life insurance', routes: [P], box: /:have$|^add:coverage$/ },
  { term: 'renters insurance', routes: [P], box: /:have$|^add:coverage$/ },
  { term: 'taxes', routes: [T], box: /^tax:filing$/ },
  { term: 'filing status', routes: [T], box: /^tax:filing$/ },
  { term: 'goal', routes: [G], box: /:name$|^add:milestone$/ },
  { term: 'FI age', routes: [G], box: /^g:fiAge$/ },
  { term: 'retirement spending', routes: [G], box: /^g:retSpend$/ },
  { term: 'due date', routes: [B, C], box: /:dueDay$/ },
  { term: 'payday', routes: [I], box: /:payFrequency$|^add:income$/ },
  { term: 'kids', routes: [Y], box: /^seg:Has kids:true$/ },
  { term: 'partner', routes: [Y], box: /^p:mode$/ },
  { term: 'giving', routes: ['#/plan/foo', B], box: /^seg:Giving:true$|:amount$/ },
  { term: 'net worth', routes: [A], box: /^metric:netWorth$/ },
  { term: 'budget', routes: [B], box: /^gut$/ },
  // Batch 22: a month of transactions from the client's app or bank comes in on Month end.
  ...['import', 'csv', 'rocket money', 'monarch', 'transactions'].map(term => ({ term, routes: ['#/cash-flow/close'], box: /^import-tx$/ })),
  // Batch 23: Can I afford it? on Plan › Goals, by the words a client says.
  { term: 'can I afford', routes: [G], box: /^sec:goals:afford$/ },
  { term: 'afford', routes: [G], box: /^sec:goals:afford$/ },
  { term: 'trip', routes: [G], box: /^sec:goals:afford$/ },
  { term: 'buy', routes: [G], box: /^sec:goals:afford$/ },
  // Batch 20 (Rocket Surgery): words coaches typed that found nothing or the wrong place.
  { term: 'raise', routes: [I], box: /:amount$|^add:income$/ },
  { term: 'close the month', routes: ['#/cash-flow/close'], box: /^sec:close:months$/ },
  // Batch 29: the true cost of debt on Plan › Debt payoff.
  { term: 'true cost', routes: ['#/plan/debt-payoff'], box: /^sec:payoff:truecost$/ },
  { term: 'borrow', routes: ['#/plan/debt-payoff'], box: /^sec:payoff:borrow$/ },
  { term: 'refinance', routes: ['#/plan/debt-payoff'], box: /^sec:payoff:borrow$/ },
];
module.exports = { TERMS };
