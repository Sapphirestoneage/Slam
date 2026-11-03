# Spec drift

Written by `node --test` (test/coverage.test.js). Every spec row names what it is in code (the SLAM id column on the Fields tab), and every field is on a spec row. Any drift fails the run.

## Drift (0)

None.

## In the spec, not built yet (24)

Known gaps, named on their spec rows (notyet: why).

- F039 Taxes › Itemizing or standard: itemized deductions (the standard deduction is used)
- F059 Needs › Car wash and supplies: no starter line for car wash and supplies (one line can be added)
- F069 Needs › Money sent to family: no starter line for money sent to family
- F071 Needs › Diapers, formula, baby supplies: one Kids and childcare starter line for now
- F072 Needs › Clothes and shoes: one Kids and childcare starter line for now
- F073 Needs › School tuition and fees: one Kids and childcare starter line for now
- F074 Needs › Activities, camps, lessons: one Kids and childcare starter line for now
- F075 Needs › Kids' medical and dental: one Kids and childcare starter line for now
- F076 Needs › Toys, birthdays, school supplies: one Kids and childcare starter line for now
- F077 Needs › Allowance and phone: one Kids and childcare starter line for now
- F080 Needs › Vet visits and vaccines: one Pets starter line for now
- F081 Needs › Pet insurance: one Pets starter line for now
- F082 Needs › Medications and flea/tick: one Pets starter line for now
- F083 Needs › Grooming: one Pets starter line for now
- F084 Needs › Boarding, walker, daycare: one Pets starter line for now
- F085 Needs › Supplies, toys, litter: one Pets starter line for now
- F089 Needs › Amount they cover: a part of a bill someone else covers (today it is all of it or none)
- F093 Needs › Reimbursed amount: a reimbursed amount on a line
- F099 Needs › Happiness rating: a happiness rating per line (Bedazzle marks joy lines)
- F115 Debt › Card from library (benefits prefill): a card library to prefill benefits
- F172 Debt › Due in full if you leave job: the note that a 401(k) loan is due if you leave the job
- F220 Goals › Real or nominal dollars: a real or nominal dollars switch (inflation is kept for it)
- F222 Goals › Social Security: Social Security
- F244 Coaching › Next check date for rough or aged numbers: a next check date for rough or aged numbers

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
