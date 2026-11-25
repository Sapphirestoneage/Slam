# Spec drift

Written by `node --test` (test/coverage.test.js). Every spec row names what it is in code (the SLAM id column on the Fields tab), and every field is on a spec row. Any drift fails the run.

## Drift (0)

None.

## In the spec, not built yet (5)

Known gaps, named on their spec rows (notyet: why).

- F039 Taxes › Itemizing or standard: itemized deductions (the standard deduction is used)
- F099 Needs › Happiness rating: a happiness rating per line (Bedazzle marks joy lines)
- F115 Debt › Card from library (benefits prefill): a card library to prefill benefits
- F172 Debt › Due in full if you leave job: the note that a 401(k) loan is due if you leave the job
- F222 Goals › Social Security: Social Security (parked, the answer on Plan is kept and no math uses it yet)

## In the spec as Later or Parked (13)

- F018 Profile › Money Mirror or personality quiz result (Later)
- F042 Taxes › Paystub or 1040 reader (Parked)
- F100 Needs › Need or want tag (Later)
- F101 Needs › Unavoidable or mistake tag (Later)
- F102 Needs › Whose value is this (Later)
- F103 Needs › Priority it serves (Later)
- F209 Assets › Pension (Later)
- F210 Assets › Expected inheritance (Later)
- F224 Goals › Go-go, slow-go, no-go phases (Later)
- F229 Goals › True FI (after tax) (Later)
- F233 Goals › Scenario blocks (home, car, kid, job change, sabbatical, move, marriage, side hustle, inheritance) (Later)
- F234 Goals › Ranked priorities (fund and remove) (Later)
- F235 Goals › Best case / dream life (Parked)
