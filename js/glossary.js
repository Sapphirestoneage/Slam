// SPDX-License-Identifier: AGPL-3.0-only
// Plain-language tooltips (B8): every jargon term, in a sentence a client would use. Pure data plus one matcher.
export const GLOSSARY = {
  'Surplus': 'What is left each month after spending and debt payments. This is what can go to goals.',
  'Pace': 'How fast you save, as a share of take-home. A faster pace gets you to FI sooner.',
  'Coverage': 'Insurance that pays when something goes wrong: your health, your income, your home or your life.',
  'Buffer': 'A cushion for surprises, so one bad month does not become debt.',
  'FI': 'Financial independence: your investments can pay for your life without a paycheck.',
  'Coast FI': 'You have saved enough that, left alone to grow, it reaches your FI number by retirement. You only need to cover today\'s bills.',
  'Lean FI': 'FI on a bare-bones budget: just the fixed floor and essentials.',
  'Barista FI': 'Enough invested that part-time work covers the gap.',
  'Fat FI': 'FI with room to spare: about 1.5 times today\'s spending.',
  'Regular FI': 'FI at today\'s spending.',
  'FI number': 'How much you need invested to live off it: yearly spending divided by the withdrawal rate.',
  'Savings rate': 'The share of your take-home you keep instead of spend.',
  'Net worth': 'Everything you own minus everything you owe.',
  'Liquid net worth': 'What you could reach quickly: cash, brokerage and Roth contributions, minus consumer debt.',
  'Runway': 'How many months your cash would last if the income stopped.',
  'Rule of 5': 'An emergency fund guide: your age divided by 5 is the number of months of spending to keep in cash (at 30, six months). It sets big e.',
  'big e': 'The losing-a-job emergency fund: the Rule of 5 months of spending (your age divided by 5), built FAT first, then DRAFTT, then full spending.',
  'little e': 'The small emergency fund: $1,000 or your highest deductible, whichever is smaller.',
  'Utilization': 'How much of your credit limits you are using. Under 30% helps your score; under 10% is best.',
  'Debt-to-income': 'Debt payments as a share of gross pay. Lenders look at this.',
  'Avalanche': 'Pay extra on the highest interest rate first. Saves the most money.',
  'Snowball': 'Pay extra on the smallest balance first. Quick wins keep you going.',
  'APR': 'The yearly interest rate on a debt.',
  'Replaces this % of your pay': 'What a disability policy pays each month while you cannot work, as a share of your salary. Group plans are usually 60%, and the benefit is taxed when the employer pays the premium.',
  'Benefit period': 'How long a disability policy keeps paying: a number of weeks for short-term, or to an age (often 65) for long-term.',
  'Waiting period': 'The days between the day you cannot work and the first disability check, often 90 for long-term.',
  'Paid in full each month': 'The statement balance is paid off every month, so the card carries no debt and pays no interest. The balance still counts toward utilization.',
  'Defaults in use': 'Numbers the app filled in with a typical value because nothing was typed. Each one is a guess until the real number replaces it.',
  'APY': 'The yearly interest a savings account pays, with compounding.',
  '7-day yield': 'What a money market fund paid over the last week, as a yearly rate.',
  'Expense ratio': 'The fund\'s yearly fee, as a share of what you have in it.',
  'Cost basis': 'What you paid for an investment. Gains are measured from here.',
  'Vested': 'Employer money that is yours to keep, even if you leave.',
  'Unvested': 'Employer money that is not yours yet; you keep it once you have worked there long enough.',
  'Allocation': 'How your money is split between stocks, bonds, cash and the rest.',
  'Drift': 'How far your mix has moved from the target you set.',
  'Sinking fund': 'Saving a little each month for a known cost, so it is ready when it comes.',
  'Fixed floor': 'What you pay every month no matter what.',
  'DRAFTT': 'Spending sorted into Debt, Retirement, Accommodation, Food, Transportation, Taxes, and Health and self-care.',
  'Take-home': 'What lands in your account after taxes and deductions.',
  'Gross': 'Your pay before taxes and deductions.',
  'Effective rate': 'All your income tax divided by your gross pay: what you pay on average.',
  'Marginal bracket': 'The tax on your next dollar earned.',
  'Deductible': 'What you pay for care before insurance starts paying.',
  'Out-of-pocket max': 'The most you pay for covered care in a year. After that, insurance pays it all.',
  'Copay': 'A set fee for a visit or a prescription.',
  'Premium': 'What you pay to keep the insurance, whether you use it or not.',
  'Accrual': 'Yearly and prepaid costs spread across the months they cover.',
  'Rough': 'A quick first number for each line: close enough to start.',
  'Estimate': 'Your plan for one month.',
  'Actual': 'What really happened that month.',
  'Gut': 'Your first guess at what you spend in a month, before adding it up.',
  'Employer match': 'Money your employer adds to your 401(k) when you put money in.',
  'Withdrawal rate': 'The share of your investments you take out each year once you stop working.',
  'Real return': 'Investment growth after inflation.',
  'Maaser': 'Giving a set share of income, traditionally 10%.',
  'Taking over': 'Bills someone else pays today that will become yours.',
  'Beneficiary': 'Who gets the account if something happens to you. It skips probate.',
  'Contribution limit': 'The most the IRS lets you put in this year.',
  'Penalty': 'An extra 10% tax for taking retirement money out early.',
  'Coast': 'Coast FI: you have saved enough that it grows to your FI number on its own.',
  'FAT': 'Food, accommodation and transportation only: the smallest of the spending levels, the first layer of big e.',
  'Picture': 'How much of the money picture is filled in with real numbers; each number counts by how much it moves the plan.',
  'Certainty': 'How narrow the plan\'s ranges are: 0% when every number is a guess, near 100% when every number is known. Answering Ask next raises it most.',
};
// Batch 37 (QUESTIONS 320's batch, Batch 33's minors): Eli's own terms stay, and the first time one shows in plain view
// on a screen it carries its plain meaning in brackets (js/ui/tips.js pairTerms), with its hover tip kept.
export const PLAIN = [
  { term: 'big e', re: /\bbig e\b/, plain: 'job-loss fund' },
  { term: 'little e', re: /\blittle e\b/, plain: 'small emergency fund' },
  { term: 'DRAFTT', re: /\bDRAFTT( needs)?\b/, plain: 'rent, food, transport, debt, taxes' },
  { term: 'FAT', re: /\bFAT\b/, plain: 'food, rent, transport' },
  { term: 'Picture', re: /\bPicture\b/, plain: 'how much is filled in' },
  { term: 'Certainty', re: /\bCertainty\b/, plain: 'how sure the plan is' }, // batch 43: the certainty meter on Home
];
// The screens that pair them (Home, Goals, Transitions and its share view, Debt payoff; batch 45, QUESTIONS 345: Plan ›
// FOO and Cash flow › Budget, the screens that use the terms most).
export const PLAIN_ON = ['#/home/session', '#/plan/goals', '#/plan/transitions', '#/plan/debt-payoff', '#/plan/foo', '#/cash-flow/budget'];
const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RES = TERMS.map(t => [t, new RegExp(`(^|[^A-Za-z])${esc(t)}([^A-Za-z]|$)`, ['FI', 'APR', 'APY', 'FAT', 'Picture', 'Certainty'].includes(t) ? '' : 'i')]);

// The first (longest) term in a piece of text, with its explanation, or null.
export function termIn(text) {
  if (!text || text.length > 80) return null; // labels and headers, not sentences
  for (const [t, re] of RES) if (re.test(text)) return { term: t, tip: GLOSSARY[t] };
  return null;
}
