// SPDX-License-Identifier: AGPL-3.0-only
// Who each idea comes from, and where it lives in SLAM (the self-serve journey, start.html). One list of sources and
// one list of ideas; the journey's numbers, tweaks and steps point at idea ids, and the Credits screen reads both.
// "where" is a stage of the journey (js/journey.js STAGES) plus the words for the Show me button, or null when the idea
// is not in this version yet (it shows as Coming later, so the credit is still visible). Wording stays modest:
// "popularized" where the origin is shared or older than the person named.

export const SOURCES = {
  mmm: { name: 'Mr. Money Mustache', who: 'Pete Adeney', best: 'Savings rate decides how many working years you have left.', link: 'https://www.mrmoneymustache.com/2012/01/13/the-shockingly-simple-math-behind-early-retirement/' },
  bengen: { name: 'William Bengen', who: 'Financial planner', best: 'The 4% rule: how much a portfolio can pay out each year and last.', link: null },
  trinity: { name: 'The Trinity Study', who: 'Cooley, Hubbard and Walz, 1998', best: 'Tested withdrawal rates against market history.', link: null },
  ern: { name: 'Big ERN', who: 'Karsten Jeske, Early Retirement Now', best: 'Safe withdrawal rates for retirements longer than 30 years.', link: 'https://earlyretirementnow.com/safe-withdrawal-rate-series/' },
  madfi: { name: 'Mad Fientist', who: 'Brandon', best: 'Tax strategy for early retirees: Roth conversion ladders and the HSA.', link: 'https://www.madfientist.com/' },
  choosefi: { name: 'ChooseFI', who: 'Brad Barrett and Jonathan Mendonsa', best: 'Milestones of FI and small stackable wins, 1% better at a time.', link: 'https://www.choosefi.com/' },
  ymoyl: { name: 'Your Money or Your Life', who: 'Vicki Robin and Joe Dominguez', best: 'Money is life energy: what you really earn per hour, and what things cost in hours.', link: null },
  moneyguy: { name: 'The Money Guy Show', who: 'Brian Preston and Bo Hanson', best: 'The Financial Order of Operations: what your next dollar should do.', link: 'https://moneyguy.com/' },
  ramsey: { name: 'Dave Ramsey', who: 'The Baby Steps', best: 'A $1,000 starter fund and the debt snowball.', link: null },
  collins: { name: 'JL Collins', who: 'The Simple Path to Wealth', best: 'Low-cost index funds, held for decades.', link: 'https://jlcollinsnh.com/' },
  trench: { name: 'Scott Trench', who: 'Set for Life', best: 'The first $100k is the hardest and matters most.', link: null },
  perkins: { name: 'Bill Perkins', who: 'Die With Zero', best: 'Spend on experiences while you can enjoy them: memory dividends and time buckets.', link: null },
  pfc: { name: 'Personal Finance Club', who: 'Jeremy Schneider', best: 'Simple pictures of compounding: how little you put in next to how much growth adds.', link: 'https://www.personalfinanceclub.com/' },
  guyton: { name: 'Jonathan Guyton and William Klinger', who: 'Financial planners', best: 'Guardrails: spend more after good years, trim after bad ones, and a portfolio carries more.', link: null },
  cfiresim: { name: 'cFIREsim and FIRECalc', who: 'Lauren Boland; Bill Sholar', best: 'Replaying a plan through every stretch of real market history.', link: 'https://www.cfiresim.com/' },
  stein: { name: 'Michael Stein', who: 'The Prosperous Retirement', best: 'Go-go, slow-go and no-go years: spending eases as you age.', link: null },
  projectionlab: { name: 'ProjectionLab', who: 'Kyle Nolan', best: 'A quick setup that turns a few answers into a full plan you can see.', link: 'https://projectionlab.com/' },
  community: { name: 'The FIRE community', who: 'Forums, blogs and podcasts', best: 'The flavors of FI: Lean, Fat, Barista and Coast.', link: null },
  slam: { name: 'Stress Less About Money', who: 'Eli Saperstein', best: 'The Rule of 5, little e and big e, Quiet Quitting FI, and a plan from your age alone.', link: null },
};

// stage: where Show me goes (a journey stage id). at: the number, tweak or section it opens on, when there is one.
export const IDEAS = [
  { id: 'savingsRate', name: 'Savings rate', by: ['mmm'], plain: 'The share of your take-home pay you keep. It sets how long until work is optional.', where: { stage: 'all', at: 'savingsRate' } },
  { id: 'simpleMath', name: 'The shockingly simple math', by: ['mmm'], plain: 'Years to FI from your savings rate alone.', where: { stage: 'all', at: 'simpleYears' } },
  { id: 'fiNumber', name: 'Your FI number (25 times spending)', by: ['bengen', 'trinity', 'mmm'], plain: 'The amount invested that can pay for your life.', where: { stage: 'all', at: 'fiNumber' } },
  { id: 'fourPercent', name: 'The 4% rule', by: ['bengen', 'trinity'], plain: 'Take out 4% in year one, then keep pace with prices.', where: { stage: 'tune', at: 'withdrawalRate' } },
  { id: 'bengen47', name: 'The 4.7% update', by: ['bengen'], plain: 'Bengen later raised his own number to about 4.7%.', where: { stage: 'tune', at: 'withdrawalRate' } },
  { id: 'swrSeries', name: 'Lower rates for long retirements', by: ['ern'], plain: 'Retiring at 40 can mean 50 or 60 years of withdrawals, so a lower rate is safer.', where: { stage: 'tune', at: 'withdrawalRate' } },
  { id: 'indexReturns', name: 'Invest your surplus in index funds', by: ['collins'], plain: 'What is left each month is invested, and the return you pick drives the date.', where: { stage: 'tune', at: 'realReturn' } },
  { id: 'foo', name: 'An order for your next dollar', by: ['moneyguy', 'slam'], plain: 'One next step at a time. SLAM starts from the Money Guy order and changes it.', where: { stage: 'plan', at: 'next' } },
  { id: 'starterFund', name: 'A $1,000 starter fund', by: ['ramsey', 'slam'], plain: 'SLAM calls it little e: $1,000 or your highest deductible, whichever is smaller.', where: { stage: 'plan', at: 'milestones' } },
  { id: 'snowball', name: 'Debt snowball', by: ['ramsey'], plain: 'Smallest balance first, for quick wins.', where: { stage: 'tune', at: 'debtOrder' } },
  { id: 'avalanche', name: 'Debt avalanche', by: ['community'], plain: 'Highest interest rate first, for the least interest paid.', where: { stage: 'tune', at: 'debtOrder' } },
  { id: 'ruleOf5', name: 'The Rule of 5', by: ['slam'], plain: 'Your age divided by 5 is how many months of spending to hold for a job loss (big e).', where: { stage: 'all', at: 'ruleOf5' } },
  { id: 'quietQuitting', name: 'Quiet Quitting FI', by: ['slam'], plain: 'Enough invested that the yearly minimum alone still gets you to FI.', where: { stage: 'plan', at: 'milestones' } },
  { id: 'coastFi', name: 'Coast FI', by: ['community'], plain: 'Enough invested that you could stop adding and still reach FI at your FI age.', where: { stage: 'all', at: 'coastFi' } },
  { id: 'flavors', name: 'Lean, Fat and Barista FI', by: ['community'], plain: 'FI on needs only, FI with room to spare, and FI with some part-time income.', where: { stage: 'all', at: 'fatFi' } },
  { id: 'milestones', name: 'Milestones on the way to FI', by: ['choosefi', 'slam'], plain: 'FI is far away, so the path is marked with wins you reach much sooner.', where: { stage: 'plan', at: 'milestones' } },
  { id: 'first100k', name: 'The first $100k', by: ['trench'], plain: 'A milestone of its own on your path.', where: { stage: 'plan', at: 'milestones' } },
  { id: 'realWage', name: 'Your real hourly wage', by: ['ymoyl'], plain: 'What an hour of your life earns, so any price can be read in hours.', where: { stage: 'all', at: 'hourly' } },
  { id: 'quantum', name: 'A plan from your age alone', by: ['slam', 'projectionlab'], plain: 'You see a plan first, as a range typical for your age. Each answer narrows it to yours.', where: { stage: 'numbers', at: null } },
  { id: 'housing35', name: 'Housing at 35% of take-home', by: ['slam'], plain: 'A reference line for rent or a mortgage: about 35% of what lands in your account.', where: { stage: 'all', at: 'housingPct' } },
  { id: 'taxBuckets', name: 'Three tax buckets', by: ['moneyguy', 'madfi'], plain: 'Money taxed later, money never taxed again, and money you can reach any time. The mix decides how early you can use it.', where: { stage: 'all', at: 'buckets' } },
  { id: 'growthChart', name: 'What you put in vs what growth adds', by: ['pfc'], plain: 'One picture of compounding: your deposits in one color, the growth on top in another.', where: { stage: 'see', at: 'growth' } },
  { id: 'sankey', name: 'A map of where your pay goes', by: ['projectionlab'], plain: 'One flow from your paycheck to everything it pays for.', where: { stage: 'see', at: 'flow' } },
  { id: 'rothLadder', name: 'Roth conversion ladder', by: ['madfi'], plain: 'Move taxed-later money to Roth in low-income years. After five years it comes out with no penalty.', where: { stage: 'life', at: null } },
  { id: 'guardrails', name: 'Guardrails and flexible withdrawals', by: ['guyton', 'ern'], plain: 'Being willing to trim in a bad stretch means you need less to start. SLAM uses a simplified version.', where: { stage: 'life', at: null } },
  { id: 'replay', name: 'Testing a plan against real history', by: ['cfiresim', 'ern'], plain: 'Your plan run from every start year since 1871, with the markets that really followed.', where: { stage: 'life', at: 'stress' } },
  { id: 'eras', name: 'Go-go, slow-go, no-go years', by: ['stein'], plain: 'Spending eases later in life, so the plan needs less than a flat number says.', where: { stage: 'life', at: null } },
  { id: 'scenarios', name: 'Life in layers', by: ['slam', 'projectionlab'], plain: 'A kid, time off, part-time years, a home: each a block you place on your timeline and stack.', where: { stage: 'life', at: 'scenarios' } },
  { id: 'sequenceRisk', name: 'Sequence of returns risk', by: ['ern'], plain: 'A bad market early in retirement matters more than one later. The history test shows which start years hurt.', where: { stage: 'life', at: 'stress' } },
  { id: 'quickWins', name: 'Stackable quick wins', by: ['choosefi'], plain: 'Small moves that add up: travel rewards, bank bonuses, cutting a bill.', where: null },
  { id: 'memoryDividend', name: 'Memory dividends and time buckets', by: ['perkins'], plain: 'Matching spending to the years you can best enjoy it.', where: null },
];

export const ideaOf = id => IDEAS.find(i => i.id === id) ?? null;
export const ideasBy = source => IDEAS.filter(i => i.by.includes(source));
// The short credit line for an idea: "Mr. Money Mustache" or "The Money Guy Show and Stress Less About Money".
export function creditWords(id) {
  const i = ideaOf(id);
  if (!i) return null;
  const names = i.by.map(s => SOURCES[s].name);
  return names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
