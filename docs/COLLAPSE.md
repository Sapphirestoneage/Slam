# Quantum Collapse, measured

Eli's thesis: an age alone gives a plan, and each answer shrinks the uncertainty. This measures it.

## Run it

```
node tools/collapse/measure.mjs 300      # 300 made-up households, about two minutes
```

## How it works

Each made-up person (22 to 55, pay from $2,200 to $12,000 a month, spending from half of pay to a little over it,
savings and debts at their usual odds) answers the five first questions in all 32 combinations. For each combination
the plan is built the way the page builds it, and three things are read:

- **Years off:** how far the plan's FI date is from where it lands once all five are answered.
- **Range holds:** whether the range shown ("2046 to 2061") contains that final date.
- **Next step off:** whether the next step named is a different one from the final one.

From the 32 combinations comes each question's fair share of the work: its average effect over every order it could
be asked in.

One caution on every number here: the people are made up, and how much they save is my assumption (spread evenly
from nothing to half of pay). Real visitors will differ. The order of the findings is sturdier than the sizes.

## What each question does (282 households, seed 20261115)

| Question | Years it closes on the FI date | Points it adds to getting the next step right |
|---|---|---|
| Spending | 29.7 | 27 |
| Pay | 9.9 | 0 |
| Invested | 5.4 | 0 |
| What is owed | 0.4 | 19 |
| Cash | 0.1 | 20 |

Spending and pay together do 87% of the work on the date. What is owed and cash barely move the date, but they decide
the next step, and pay and investments do not.

## The order, before and after

Before (pay, spending, cash, invested, owed) and now (spending, pay, owed, cash, invested):

| After | Years off, before | Years off, now | Next step off, before | Next step off, now | Range holds, before | Range holds, now |
|---|---|---|---|---|---|---|
| Age only | 45.6 | 45.6 | 65% | 65% | 21% | 21% |
| 1 answer | 37.7 | 17.9 | 76% | 68% | 17% | 28% |
| 2 answers | 5.2 | 5.2 | 75% | 75% | 78% | 78% |
| 3 answers | 5.2 | 4.5 | 37% | 38% | 78% | 79% |
| 4 answers | 0.8 | 4.5 | 37% | 0% | 100% | 78% |
| 5 answers | 0.0 | 0.0 | 0% | 0% | 100% | 100% |

What changed and why:

- **Spending is first.** Asked first, pay made the plan worse on every measure: the range got wider 73% of the time
  and held the final date less often than age alone did. Spending first halves the miss on the first answer.
- **What is owed is third, not last.** Before, the next step was still a different one for 37% of people until the
  fifth answer. Now it is right after four.
- **The trade:** the last five years of precision on the date now arrive with the fifth answer (invested), not the
  fourth. The next step being right a question sooner was judged worth more, since the next step is what a person
  acts on.

The order that scores best on the numbers alone is spending, owed, cash, pay, invested. It was not chosen: it leaves
the date 17 years off until the fourth answer.

Between jobs keeps its own order (what is coming in, spending, cash, invested, owed). It has not been measured.

## Two things this found that are not fixed

1. **An age alone tells a saver the wrong story.** The typical person at every age spends a little more than they
   take home, so the age-only plan reads "2049 or later", and for the made-up savers that range held their real date
   only 21% of the time. A plan from an age is true for the typical person and wrong for most people who would use
   this.
2. **Pay and spending are one question in two halves.** Answered together they take the miss from 45.6 years to 5.2
   in one screen. Answered one at a time, the first of them leaves the plan with one real number and one typical
   number that do not fit each other. One screen with both boxes would be the largest single gain.

Both are in `QUESTIONS.md` for Eli.
