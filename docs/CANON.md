# The FIRE canon, replicated

The most quoted FIRE numbers, re-run on SLAM's own math and SLAM's own history file (Shiller's data, 1871 to 2022,
after inflation). Each one is first worked the way its author made it, to be sure the same thing is being tested, and
then the way SLAM counts.

```
node tools/canon/replicate.mjs
```

The verdicts: **holds** (comes out the same), **bends** (right idea, a different number once an assumption is looked
at), **breaks** (does not survive).

## 1. The savings-rate table: holds as printed, bends against SLAM's own default

Mr. Money Mustache, "The Shockingly Simple Math Behind Early Retirement" (2012):
https://www.mrmoneymustache.com/2012/01/13/the-shockingly-simple-math-behind-early-retirement/
His assumptions: 5% a year after inflation, taking out 4%, starting from nothing.

| Savings rate | Printed | Worked his way (saving added once a year) | SLAM at 5% (month by month) | SLAM at its default 7% |
|---|---|---|---|---|
| 10% | 51 | 51.4 | 51.0 | 41.3 |
| 25% | 32 | 31.9 | 31.6 | 26.8 |
| 50% | 17 | 16.6 | 16.4 | 14.7 |
| 65% | 10.5 | 10.5 | 10.4 | 9.7 |
| 75% | 7 | 7.1 | 7.1 | 6.7 |

- Every printed row reproduces within half a year. **Holds.**
- SLAM's own default return is 7%, his is 5%. At 7% a 50% saver is done in 14.7 years, not 17, and a 10% saver in 41,
  not 51. SLAM tells people a shorter road than the table everyone quotes. **Bends**, and the question is which
  return is right (see What this says about SLAM, below).
- Early Retirement Now's check of the same table (monthly saving, 60% rate, 12.2 years) matches SLAM's 12.3:
  https://earlyretirementnow.com/2017/11/01/shockingly-simple-complicated-random-math-behind-early-retirement/

## 2. The 4% rule: holds for 30 years, bends for an early retiree

Bengen (1994) and the Trinity study (Cooley, Hubbard and Walz, 1998): take 4% of the starting balance, raise it with
prices each year, for 30 years. The Trinity paper's 30-year, inflation-adjusted result for 75% stocks is usually
quoted as 95% to 98%, on 1926 to 1995 data. https://en.wikipedia.org/wiki/Trinity_study

Replayed on SLAM's history, 75% stocks and 25% bonds, spending taken on the first day of each year:

| Years it has to last | 3.25% | 3.5% | 4% | 4.5% | 5% | Highest rate that never failed |
|---|---|---|---|---|---|---|
| 30 | 100% | 100% | 97% | 92% | 75% | 3.70% |
| 40 | 100% | 99% | 93% | 74% | 67% | 3.45% |
| 50 | 100% | 96% | 84% | 70% | 54% | 3.25% |
| 60 | 100% | 100% | 86% | 74% | 53% | 3.50% |

- In the window the Trinity paper could see (stopping work 1926 to 1966): 95% for 75/25 and 93% for 50/50. The paper's
  numbers were a few points higher with a different bond series. **Holds.**
- Over all of history, 4% for 30 years failed only for people who stopped work in 1965, 1966, 1968 and 1969.
- For 50 years, which is what stopping at 40 asks for, 4% held 84% of the time, and nothing above 3.25% held every
  time. **Bends.** (The 60-year row looks better than the 50 only because the late-1960s starts have not had 60 years
  yet.)
- SLAM's own lifetime engine, asked the same question with no tax, gives the same 97%. So the History and chance
  screen is the classic study, with taxes added when a plan has them.

## 3. "$100 a month is $30,000": holds at 4%, and moves with the rate

Twenty-five times a year of it: $1,200 divided by 4% is $30,000 exactly. **Holds**, by arithmetic. At 3.5% it is
$34,286, at 3.25% it is $36,923. Whoever plans on 50 years should be using the larger number.

## 4. The rules of 752 and 173: bend by about 1%

Mr. Money Mustache, "When the Back of the Napkin can be Worth Millions" (2013): multiply a weekly cost by 752, or a
monthly one by 173, for ten years of it invested at 7%.
https://www.mrmoneymustache.com/2013/06/24/when-the-back-of-the-napkin-can-be-worth-millions/

- Worked his way they come out 752.4 and 173.1. The 7% is split into 52 or 12 equal pieces and compounded, which adds
  up to a little more than 7% a year.
- At SLAM's pace, where a year grows by 7% and no more, they are 742.8 and 171.1. **Bends**, by about 1%.
- This is the same slip the second engine found in SLAM's own finish-line page on Nov 14.
- Built from this: `habit.html`, What does this habit cost?

## 5. Coast FI: holds, and is very sensitive to the return

By definition: the FI number divided by growth over the years left. With 25 years to go it is 18% of the FI number at
7% and 30% at 5%; with 35 years, 9% and 18%. **Holds**, but a 2-point change in the return roughly doubles the
number at the long end. Anyone told they have "reached Coast FI" should see it at 5% as well.

## What this says about SLAM

1. **SLAM's 7% is above its own history.** The history file SLAM ships has US stocks at 6.7% a year after inflation
   (1871 to 2022), a 75/25 mix at 5.9% and a 50/50 mix at 4.9%. The plan grows everything at 7%. The lifetime screen's
   own default is 80% stocks, which history puts near 6%. Eli's stated default is 7%, so it is unchanged; the size of
   the choice is two to ten years on the FI date (table 1).
2. **4% is the right default for 30 years and generous for 50.** The presets already offer 3%; 3.25% is the rate that
   never failed over 50 years here.
3. **A year is a year.** Every tool now compounds at one pace (test/audit.test.js holds it).

Sources for the claims are linked above. The history data's own source is in `data/history-returns.json`.
