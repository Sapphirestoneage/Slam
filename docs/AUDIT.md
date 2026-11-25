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
left in closed form, each year's position with every payment carried to the end by itself, and the breakeven year; and the money sins read, `js/math/sins.js`, run Money sins Part 1: each source's scores with every piece faded by its own
age on a calendar and the quiz weighted by its share of the plus points, and the month of a defense, the pattern
added up in the month before and the month from its start).

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
