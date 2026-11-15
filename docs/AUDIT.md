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
every conversion line, one or two people), and the earliest age work can stop.

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

Left as they are, with a question for Eli in `QUESTIONS.md`:

- Loan interest shows the formula's number (months times payment, less the balance). Stepping every month, with a
  smaller last payment, gives what is really paid: 95 cents less on average, up to $18.80.
- At a line where the premium credit stops, taking the credit can move income across the line, and nothing settles.
  The plan counts no credit that year (14 of 10,339 years).
- Roth growth taken before 59 and a half pays the penalty but is not also counted as income, and money taken from the
  buckets in a working year pays no income tax.

## How independent it is

The tax tables, the debt math, the FI math and the single-year pieces were written from the rules and checked against
printed figures and textbook formulas. For the lifetime run, the second engine was written after reading SLAM's code,
so agreeing there proves the code does what it means to, and the year-by-year tax check is what caught the errors
above. Two planted mistakes (a wrong Social Security share, a wrong month of debt interest) were both caught. A
rebuild by someone who never sees the code is the stronger test and is still to do.
