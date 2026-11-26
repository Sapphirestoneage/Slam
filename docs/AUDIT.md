# The second engine

SLAM's money math, worked out a second time in another language and compared to the dollar.

## Run it

```
node tools/audit/run.mjs          # about 10,000 made-up cases, about 180,000 numbers, under a minute
node tools/audit/run.mjs 400 3    # another size, another seed
```

It ends with "The two engines agree on all N numbers" or lists what differs. A short run is part of `node --test`
(`test/audit.test.js`).

## How it works

1. `tools/audit/cases.mjs` makes cases from a seed (incomes from $5,000 to $900,000, debts, portfolios, whole lives
   with two people, conversions, scenario blocks) and runs SLAM's own functions on each.
2. `tools/audit/engine2.py` works every answer out again in Python. Where SLAM steps month by month the second engine
   uses the textbook formula, and the other way round, so they only agree when both are right.
3. The law's numbers are checked against the source, not against either engine: the tax the IRS prints at the bottom
   of each 2026 bracket (Rev. Proc. 2025-32), the standard deductions, the Social Security wage base, the Medicare
   extra premium table. 23 of 23 reproduce.
4. The lifetime plan gets its own check, year by year: the tax set aside in a year must equal the tax that year's
   income owes.

## What it covers

Federal tax, payroll tax (and self-employment tax), New York and New York City tax, take-home from gross and gross
from take-home, a single debt (months, interest, the payment that is too small), a set of debts in avalanche and
snowball order, the FI number, months to FI, Coast FI, the saving that hits a date, years to FI by savings rate, the
runway, Start at the finish line, the taxed part of Social Security, tax on gains, required withdrawals, the
Marketplace premium credit, a free year's tax, the Medicare extra premium, the whole lifetime run (every strategy,
every conversion line, one or two people), the earliest age work can stop, and Recalculating (`js/math/recalc.js`, added
Nov 25 2026: the old date and the new date counted month by month on a calendar, the triage paid class by class, the
emergency fund refill put back month by month, the safe-to-fail line, and the opt-in audit's totals with the cost over
time worked out by logarithms; the same day, after Eli's answers to QUESTIONS 580: the Barista number with health
insurance added, and the months back to the Coast number in closed form, where SLAM steps month by month; and home
buying and renting, `js/math/homebuy.js`: the payment as the level amount whose discounted sum is the loan, the loan
left in closed form, each year's position with every payment carried to the end by itself, and the breakeven year; career and
education, `js/math/career.js`: the whole price and the raise from their definitions, the loan as the level amount whose
discounted sum is the loan, the move month by month, the stack's overlaps as sets of months, the vesting steps, and the
three moves of the launch window; and the money sins read, `js/math/sins.js`, run Money sins Part 1: each source's scores with every piece faded by its own
age on a calendar and the quiz weighted by its share of the plus points, and the month of a defense, the pattern
added up in the month before and the month from its start; and travel, `js/math/trip.js`, run Finish everything partly
built Part 4: each line of a trip from its definition with the card fee on the lines paid in another currency, the cents a
point and cash next to redeem, a group split in whole cents checked against each person's exact share (by shares, or each
line among the people in on it) and adding up to the whole, and the six stages of the journey with the trip taken from
cash first, then investments).

Since Nov 25 2026 (run Not built, groups 1 to 5, Part 5) it also covers gig and self-employed work (`js/math/gig.js`
and `js/math/gigplan.js`, M8G): the price floor's profit checked by giving back the need through the second engine's
own tax, and the floor an hour and a job from their definitions; the set-aside with the profit stacked on a job's pay
by hand (Social Security up to the wage base across both, Medicare, the extra 0.9%, half the self-employment tax off
income tax, New York and the city on top); the Solo 401(k), the SEP, the IRA and which first from the IRS rules;
invoice dates with Python's own date library; and the apps, tips and the Profit First split added up.

Since Nov 25 2026 (run Not built, groups 1 to 5, Part 8) it also covers family money (`js/math/family.js`, M8F): the
sandwich years checked month by month (what each month takes from the flows, the months both run at once, the total
over the years), living at home with the moving-out goal reached by stepping a balance month by month, tuition years
summed one by one with the level amount to put away found by bisection on a month-by-month balance, and the New York
529 deduction from the limit.

Since Nov 25 2026 (run Not built, groups 1 to 5, Part 2) it also covers the quick calculators (`js/math/quick.js` and
`js/math/quickplan.js`, M8Q): a HYSA balance stepped month by month where SLAM uses the closed form; lump sum or spread
with every piece carried to the end by itself; the warranty, cost per use and Return on Hassle from their definitions;
personal inflation as a weighted sum; two starting ages stepped month by month; kids, a pet and an apartment added up;
New York's weekly rate from the handbook's rule and the runway with it; consolidation on the second engine's own debt
and the loan as a sum of discounted payments; leaving a job on the second engine's own tax; roommates by share of the
space or of the pay; the W-4 check with the child tax credit typed in again; and the month at a glance.

Since Nov 25 2026 (run JOE-1) it also covers the Job of Existing (`js/math/jobs.js`): which of the six unpaid jobs
a person holds, worked out a second time from each answer that counts, and the order; the hours a month of running
the money (each job at its tap or its default, the total, Guess / Close / Exact); each task's minutes a month; and
Running it and Living it (the minutes of the tasks off the plate, at most each job's own time, and the percent
better, at least 1 once a minute is back). Features 4 and 5 of the run add three: a wired goal's deposits a year (by the day it moves)
and each deposit (the monthly amount × 12 ÷ the deposits, rounded up to a dollar); the quarterly check-in (3 months
after the last one, with the end of a month moved to its last day); and a date the person taps (its next day, the
days to go, and whether its reminder shows). Feature 6 adds who carries what (`jobCarry`), worked out a second time person by person: each person's part of
each job they hold and of each task handed to them, the household total, and the value at the value of an hour.

Since Nov 25 2026 (run Not built, groups 1 to 5, Part 3) it also covers Lifestyle creep and enough (`js/math/enough.js`,
the one engine of the web app and the game): a made-up ledger of one to four years with months missing, refunds and
income in some years only, worked out a second time month by month (each year is the months that hold spending, the
spending growth, the income growth from the ledger or the tapped guess, the alert, the gap a month, each category last
year and this year, what it grew past inflation and whether it counts as faster than prices); the Pareto (the fewest
biggest lines that reach 80%, by a running total); the enough number and the room for error; the Rough numbers range of
any amount, built as text a second way from the digits; and the game's creep check between two looks.
Since Nov 25 2026 (run Not built, groups 1 to 5, Part 4) it also covers Eli's frameworks and the canon
(`js/math/frameworks.js`, M8W), each worked out a second time from its definition: the SWAN number (months of spending
plus the worry, the gap, the months of cash), the net worth peak (a year-by-year loop with the second engine's own
spend-down payment), 0% tax in early retirement (the gains that keep taxable income inside the 0% band, the cash a sale
gives, whether the spending fits), the six Baby Steps that can be read from numbers and where the person is, the wealth
stage with the dollars and months to the next line, lifetime earnings and their hours (step 1a of Your Money or Your
Life), capital, cushion and cash (step 9), and the quick wins (the tapped amounts and the days of freedom).

Since Nov 25 2026 it also covers the ways to take money out (`js/math/withdraw.js`, the rules behind "Compare the
ways" in the web app and in the game): every way in the list, the ones that are switched off on screen too, each
through a made-up market that swings (stocks, bonds, inflation, a CAPE, the two yields). Four kinds of case: the VPW
share, the spend-down payment, one pile of money through one way the way the game's replay runs it (the rule, how the
money is held, and the money out on the first day, monthly or on the last day), the whole lifetime plan with taxes on
each way, and the summary of a set of start years. Where SLAM takes twelve monthly steps the second engine uses the
annuity formula. The year-by-year tax check runs on these too, and it caught one mistake while the work was being
built: a way that sets what leaves the accounts did not allow for a year whose tax alone is more than that amount.
One limit, said plainly: a way's own settings (the band, the step, the base share) travel in the case, so the second
engine checks the rule, not that the setting matches its source. "Keep the odds in a band" is the retirement
engine's own rule in the game and is not worked out a second time.

Added Nov 25 2026 (the FI destinations): Fat FI with and without a list of extras, Chubby FI (the midpoint), what
part-time pay closes and whether it covers health insurance, and every box of the FI date stress test (the second
engine uses the closed formula for each box, SLAM steps month by month).

Added Nov 25 2026 (the FIRE sheet, M9I): every year row of the FIRE sheet tab (the balance at year end, the
withdrawal, spending, the savings rate, % to FI) for each way to take money out that the sheet writes as a formula:
the same amount each year, a share of the balance, a floor and a ceiling, guardrails. The second engine steps a
working year month by month; SLAM and the sheet use one factor for the year.

Added Nov 25 2026 (student loans, run "Finish everything partly built", Part 5): a private refinance at the person's
own rate (`refiOf`: the payment by the annuity formula, the total as payment × months, and the difference from the
federal plan that pays least with its tax), and the stepladder (`stepladderOf`): each school year's loan at its own
rate (the table, the graduate and PLUS add-ons, or the person's own rate), the interest before payments start, the
payment on each rung and what it pays in all. For the total the second engine steps only until the waiting interest is
paid, then uses the annuity formula for the rest. The federal plans themselves (M9S, IBR and RAP) are not worked out a
second time yet.

Not covered yet: the coach app's month-by-month projection (`js/math/projection.js`), debts with a 0% offer, the
household tax across several jobs, the Child Tax Credit, the benefits cliff, Social Security benefit amounts, and the
history replay. Each is a row to add (ROADMAP.md, Run 2).

## What the first run found (Nov 14 2026)

Three things were wrong and are fixed. The numbers are from 300 made-up lifetime runs (10,339 free years) that lean on
purpose toward hard cases.

1. **The lifetime plan's tax did not always settle.** A year's tax is paid out of the same buckets, which is itself
   income, so the engine goes round until the tax stops moving. It stopped after eight rounds whether or not it had.
   In 546 of the 10,339 free years (5%) the tax set aside differed from the tax owed by more than a dollar, by up to
   $4,910 in one year. 122 of the 300 runs ended with a different balance: typically by 0.002%, at most by 2.6%. No
   run changed from lasting to running out. Fixed in `js/math/lifetime.js`: the tax now goes round until it is within
   50 cents, and the premium credit settles around it. After the fix: 0 of 10,339.
2. **A required withdrawal and a conversion were counted twice.** When a Roth conversion emptied the taxed-later
   account in a year that also had a required withdrawal, the tax was worked out as if both came out in full. Fixed
   with the same change.
3. **Start at the finish line grew money faster than the plan does.** It compounded a twelfth of the yearly return
   each month, which makes 7% a year into 7.23%. Over 30 years that is 6.6% more money, and in the made-up cases it
   understated the saving needed by up to $334 a month. Every other tool uses (1 + return) to the power 1/12. Fixed
   in `js/solo.js`, and a test now holds the finish line and the plan to the same month.

## What Eli decided (Nov 15 2026)

- **Loan interest shows what is really paid:** every payment in full and a smaller last one. The formula it replaces
  (months times the payment, less the balance) ran low, by 95 cents on average and up to $18.80.
- **The health credit at a line stays the cautious call, and the plan says so.** Where taking the credit would itself
  move income across a line where the credit stops, nothing settles, so the plan counts no credit that year and adds
  a note naming the years and the reason (10 of 10,141 made-up years, all at the bottom line).
- **Early Roth growth counts as income**, on top of its 10% penalty.
- **Money taken out in a working year is taxed** as income on top of that year's pay, with the 10% where it applies,
  and the tax comes out of the same accounts. Before, the penalty was tallied but never paid.
- **Saving goes in month by month** in the lifetime plan, the same as the FI date, so the two name the same month.
  Before, a whole year's saving went in on the first day of the year, which overstated growth.

## How independent it is

The tax tables, the debt math, the FI math and the single-year pieces were written from the rules and checked against
printed figures and textbook formulas. For the lifetime run, the second engine was written after reading SLAM's code,
so agreeing there proves the code does what it means to, and the year-by-year tax check is what caught the errors
above. Two planted mistakes (a wrong Social Security share, a wrong month of debt interest) were both caught. A
rebuild by someone who never sees the code is the stronger test and is still to do.
