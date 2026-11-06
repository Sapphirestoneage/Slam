# Engine spec: the year-by-year projection

Status: core built, Batch 50 (`js/math/projection.js`, M9P). Math only: no screen reads it yet, so no number a client
has seen moves. Designed in Batch 17. Phase 5 (ROADMAP.md).

## As built (Batch 50)

**In:** build order steps 1 to 3 and parts of 5 and 6. `project(doc, ref, { now, person, mode, events })` walks the
household a month at a time from this month to Plan to age (the younger person's), and reports the first 12 months
month by month and every year after (plan years: year 1 is the next 12 months). Each person's age (one accessor,
`peopleOf`, for Batch 49's people model); each income row by its person, with W-2, side work, self-employment and
platform pay stopping at the stop age (Retire by or the FI age, else 65) and rent, family help and benefits going on
(unemployment ends on its date, through the known changes ahead); a raise a year (`RULES.projectionIncomeGrowth`, 0
until asked for) and a job that stops are taxed by SLAM's tax function as it is (`householdTax`, the seam for full tax
depth); the 401(k), the HSA and the match held to the limit for that person's age in that calendar year (catch-ups
from the year they turn 50, 55 for the HSA, the larger one from 60 to 63, the 415(c) total), pay over a limit coming
back after the marginal rate; spending as today plus the known changes, and a coach's retirement spending once work
stops; the one debt plan (M34) reused month by month (never re-implemented); the FOO flow (M79) reused for the phases
(step 1 and big e to cash, heavy debt, then Tax-Free Growth room each calendar year, then taxable); each account by tax
type (cash, taxable, pretax, Roth, HSA; 529 and goal money apart) growing at the real return a month; withdrawals once
work stops in `WITHDRAW_ORDER` (cash, taxable, Roth, HSA, pretax, with a pretax draw before 59½ flagged); the flags
(the age markers, stop, FI, debt free, short while working, runs out, early); a first dual-age block per person.
Events: Current vs Proposed's choices (`eventsFromProposed`, from today, through the same copy Current vs Proposed
builds) and dated spending, income and one-off changes (the debt plan and the FOO flow are rerun with them).

**Where it differs from the design above, on purpose:**

- Every year is stepped a month at a time inside, not once a year with a mid-year convention: a phase that ends
  mid-year lands in its own month and the FI month is exact. Maya's full run (metrics included) is well under 30 ms.
- Two modes. `plan` (the default) is the engine as designed. `today` turns the new parts off (no stop, no payment
  coming back, no limits, no raise) and gives M53, M34 and Next 12 months to the month for every persona and the Demo
  (test/projection.test.js). In `plan`, four households differ, each listed with its reason in the test
  (PLAN_DIFFERS): three get an earlier FI date because their last debt sits inside the monthly numbers and is paid off
  before FI (today's math keeps paying it forever, the engine gives the payment back to the month); Lena and Marco's
  FI never comes because work stops at 65 (M53 keeps them working to 83). Debt-free dates and Next 12 months match in both.
- The FI test is today's (invested against the FI number, M50); "net of guaranteed income" waits for Social Security,
  since today the only candidates are rent and benefits, which SLAM reads as one net number.
- Money the debt plan sets aside and does not need (the last payment on a debt) stays in checking, so net worth keeps
  it; the FI date never counted it.
- A short month while working is drawn from cash and then shown as not covered, never borrowed (Current vs Proposed's
  net worth puts it on the card; the engine does not).

**Not in yet** (`NOT_IN` on the result): full tax depth (capital gains, the ACA credit, Roth conversions, state
brackets by year), tax and the 10% penalty on withdrawals, Social Security, RMDs (flagged at 73 only as an age marker),
go-go, slow-go and no-go spending, a second stop age for a partner, two IRAs for a couple, Triple D and Monte Carlo,
coast age, the sources for each gap year, and every screen moved onto the engine (build order step 9).

**The hand-built check** (ROADMAP's done means): `tools/projection/build.mjs` rebuilds Maya, Alexis, Tom and Priya and
Dev in a real xlsx with plain formulas (Inputs, Debt plan with NPER and FV per segment between payoffs, Year 1 month by
month, Years 1 to 30 in closed form), in `docs/engines/projection-check/`. The test recalculates them in LibreOffice
and the engine matches to the dollar in year 1 and within 1% at year 30 (in practice within $15). What the sheets take
from the app is labelled on Inputs: big e and FOO step 1 still to fill, and take-home once work stops.

## Purpose

One engine that walks a household forward a year at a time (months inside the first year) from today to the end of
life, and that every projecting screen reads: the FI card, Timeline, Next 12 months, Current vs Proposed, Debt payoff,
the ladder, the one-pager's FI line, the dual-age view, decumulation. One engine, so one answer (QA.md category 3).

Today SLAM's FI date (M53) compounds an invested balance with monthly investing at one real return to a target; the
debt payoff (M31, M34) runs on its own; nothing taxes later years, ages accounts, or draws down. The older suite had
the same split (`engines/projection.js`, `engines/trap.js`, `engines/decumulation.js` and the coach edition's
`money-rooms-v3/engine/projection.js`, year by year to 95, Triple D, go-go/slow-go/no-go, Social Security at 67).

## Inputs

- **People**: for each adult, birth date, the age work becomes optional or the planned stop age, Social Security claim
  age, life expectancy (default 90, `defaults.lifeExpectancy`), filing status and state per year (a move is an event).
- **Income streams**: each with a person, type (W-2, self-employment, cash, tips, platform, benefits, rental, pension,
  Social Security), amount, growth rate (real), start and end (dates or ages), tax treatment, steadiness (range width).
- **Spending**: today's monthly spending by category; retirement spending phases (go-go, slow-go, no-go multipliers
  and ages); one-off goals by year; housing that ends (a mortgage paid off).
- **Accounts**: each with owner, tax type (cash, taxable, pre-tax, Roth, HSA, 529), balance, cost basis or Roth basis,
  contributions (employee, employer match formula), access rules (`accessRule` in js/math/portfolio.js).
- **Debts**: balance, APR, minimum, payoff order and extra (the existing debt math).
- **Events**: dated changes (a job change, a move, a child, a home, a sabbatical, a windfall, a partner joining),
  each a set of changes to the inputs above from a year on (Current vs Proposed's changes become events).
- **Assumptions**: real return by asset mix (presets), inflation (for nominal display only), withdrawal rule, the FOO
  rules (debt first, the Rule of 5), the tax tables for the year.

## State per year (per person and per household)

Age of each person; income by stream; taxes (federal ordinary, capital gains, FICA, SE, state and local, ACA credit);
spending by phase; each account's start balance, contributions, growth, withdrawals, end balance and basis; each
debt's start, interest, payments, end; net worth (total and liquid); the FOO step reached; flags (an age marker
crossed: 50 catch-up, 55, 59½, 62, 65, 67, 73 RMD; FI reached; a shortfall year).

## Order of operations each year

1. **Ages and events.** Advance each person's age; apply any event that starts this year.
2. **Income.** Each stream for the year (with growth, start and end).
3. **Pre-tax money out of pay.** Workplace contributions up to the legal limit for that person's age (401(k) base and
   catch-ups, the 415(c) total, HSA self or family, from `limits` in reference data), and the employer match.
4. **Taxes.** One tax function (named-tools.md (b)): AGI, taxable income, federal ordinary and stacked gains, FICA,
   SE tax, state and local, the ACA credit on MAGI, for the filing status that year. Roth conversions planned for the
   year are ordinary income here.
5. **Take-home** = income minus pre-tax money minus taxes.
6. **Spending.** Today's spending in real terms, times the retirement phase multiplier once retired; plus one-off
   goals; minus housing that has ended.
7. **Debts.** Minimums first, then the debt rule (`RULES.debtFirst`: surplus to heavy debt first) through the existing
   payoff order.
8. **Surplus to the FOO.** What is left funds the FOO in order (little e, match is already in step 3, heavy debt, big
   e by the Rule of 5, Roth IRA and HSA to their limits, giving if on, the 401(k) to the limit, taxable, sinking funds),
   each to its legal limit and its target.
9. **Shortfall.** If spending is not covered, draw in the withdrawal order (step 10) once retired or between jobs;
   while working, a shortfall is a flag, never a silent loan.
10. **Withdrawals after work stops.** Cash, then taxable (gains taxed), then Roth basis, then pre-tax with the 10%
    penalty under 59½ unless a path applies (Rule of 55 for that employer's plan, a 72(t) schedule, seasoned Roth
    conversions), then Roth earnings; RMDs from 73 come first whether needed or not. The withdrawal order is a setting
    (the trap test's four paths are four settings).
11. **Growth.** Each account grows at its real return (mid-year convention for the year's contributions).
12. **Close the year.** Net worth, FI test (invested times the withdrawal rate covers spending net of guaranteed income),
    the FOO step, the flags.

The first 12 months run monthly (so Next 12 months and the calendar read the same engine), then yearly.

## Two ages and two people

- Each person has the **age work becomes optional** (the stop age, or the FI age the engine finds) and the **ages money
  becomes reachable** (59½ for IRAs and most plans, 55 for the plan of an employer left in or after that year, the
  Social Security claim age 62 to 70, Medicare at 65). The **dual-age view** draws, for each person, the years between
  the first age and the second as a band, and shows which source covers each year in it.
- A couple runs as one household with two people: separate accounts, contribution limits, Social Security and ages,
  joint or separate filing per year, shared spending. When one partner stops working the other's income continues;
  the gap years are those before both partners' money is reachable.
- The engine answers "can I stop at age X" by setting the stop age and reading the shortfall years; and "when can I
  stop" by searching the earliest stop age with no shortfall year at likely (and at low, for the range).

## Decumulation

The withdrawal rule is a setting: a fixed real amount (spending), a percentage (VPW, the Bogleheads table by age and
stock share), or guardrails (later). Social Security from the bend points (90%, 32%, 15% of average indexed monthly
earnings; reduction before full retirement age, credits after), estimated from the earnings history SLAM has, with a
typed statement figure taking precedence. Years until empty and the age the money lasts to are outputs.

## Outputs every screen reads

`project(household, assumptions) -> { years: [state per year], months: [first 12 months], fiAge, fiDate, coastAge,
debtFreeDate, shortfallYears, lastsToAge, dualAge: [{ person, optionalAge, reachableAges, gapYears, sources }],
flags, triple: { best, likely, worst } }`. Ranges (ranges.md) run this engine at the corners. Triple D runs it at
three returns (and later Monte Carlo runs it on sampled returns, in a worker).

## Data needed, with candidate sources

- Contribution limits, catch-ups by age, 415(c), HSA, IRA (IRS, already in `data/reference-2026.json`).
- Federal brackets, standard deduction, capital gains brackets, FICA wage base (IRS Rev. Proc. for the year; SSA for
  the wage base).
- State and local brackets (each state's tax department; the Tax Foundation's annual table as a cross-check).
- ACA: poverty guidelines (HHS), applicable percentages (IRS Rev. Proc. for the year), the cliff rule in force.
- Social Security bend points, COLA, full retirement age, early and delayed factors (SSA).
- RMD ages and the Uniform Lifetime Table (IRS Pub. 590-B); 72(t) rules and rate ceiling (IRS Notice 2022-6).
- VPW table (Bogleheads wiki).
- Retirement spending phases (published research on spending by age in retirement, for example the CE by age 65 to
  74 and 75 plus rows; the go-go multipliers are a stated convention).
- Return bands (the long-run real return record, for example the UBS Global Investment Returns Yearbook).

## Test households

1. **Maya**: card payoff inside year 1 month by month, then big e, then Roth; matches today's debt payoff and FI date
   within a month when the new features are off (a regression check).
2. **Alexis**: income growth, a deficit year flagged, no silent borrowing.
3. **Tom**: 401(k) to the limit with the age 50 catch-up in the right year, FI at 50 with the bridge to 59½ covered by
   taxable money; RMDs at 73.
4. **A couple, 31 and 34**: one stops at 45, the other at 50; the dual-age view shows both bands.
5. **A self-employed household** with SE tax and quarterly estimates and an ACA year before 65.
6. **A Roth ladder household**: conversions taxed in the year, spendable five years later, the ACA cliff checked.
7. **Hand-built spreadsheet** for households 1, 3 and 4: year 1 to the dollar, year 30 within 1%.

## Build order

1. State and the yearly loop with income, spending, one account and growth; Maya's FI date matches M53.
2. Debts through the existing payoff math, month by month in year 1.
3. Contributions to legal limits by age; the FOO surplus order.
4. The tax function (ported step by step, tested against published examples).
5. Two people; events; Current vs Proposed reads events.
6. Withdrawals, access rules, the dual-age view.
7. Social Security, RMDs, VPW, retirement phases.
8. Triple D; then Monte Carlo in a worker.
9. Every screen moved onto the engine, with a test that fails on a second projection.
