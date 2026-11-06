# MATH.md: every calculation in SLAM

**A self-review, pending a real CFP review.** Written overnight on Nov 6 2026 by the build assistant, not by a planner, and updated the same day for batch 5 (the Rule of 5 as age / 5, Confidence beside Joy, the safer FI line). Every formula below is read straight from the code (`js/math/*`, `js/plan.js`, `js/month.js`); every worked number comes from running that code on one synthetic household. Nothing here is advice. The last section flags, per calculation, where SLAM differs from a mainstream CFP-style plan and from the FIRE voices it borrows from, with a severity. A CFP should be able to read it in one sitting and mark each flag Agree, Change or Discuss.

Conventions (M00): money is dollars a month in today's dollars unless the line says otherwise; rates are yearly decimals (7% is 0.07); months are whole months from today; `null` means "not entered", never zero.

## The worked household ("Brandon", synthetic)

A made-up household shaped like the beta tester's Home screen. Nothing in it is real.

| Input | Value |
|---|---|
| Age | 24, New York, solo, no debt (per About you) |
| Take-home | $3,170.35 a month (the gut number for pay, paid every 2 weeks) |
| Spending | $1,737.35 a month (one gut number, debt payments included) |
| Checking | $8,745 |
| Brokerage | $43,000 |
| Car | $20,000 |
| Assumptions | real return 7%, withdrawal rate 4%, retire by 65, invest the surplus (on), Nov 5 2026 |

Every section ends with this household's number.

## 1. Income and take-home (M01, M10 to M17)

**Plain English.** Any amount per week, 2 weeks, twice a month, month, quarter or year becomes a month. From gross pay SLAM takes federal tax (2026 brackets and standard deduction), FICA (Social Security to the wage base, Medicare, the additional Medicare over the line), state tax where it knows the state (NY and NYC), and before-tax deductions (401(k), HSA, premiums from the paycheck); what is left is take-home. From take-home it can go the other way by search.

**Formulas.**
- Monthly = amount × (periods a year ÷ 12), with periods a year 52, 26, 24, 12, 4, 1 (M01). A "paycheck" amount uses the pay frequency.
- Take-home a month = (gross − federal − FICA − state − pretax deductions) ÷ 12 (M12). The yearly figure is computed, then divided by 12 once.
- Marginal rate (M14) = the bracket of the last dollar plus FICA.
- Employer match a year (M15) = the match tiers applied to the contribution % of gross; a month = ÷ 12.
- Variable income safe budget (M16) = lowest month × (1 − tax set-aside), else typical × 0.75 × (1 − set-aside).
- Real hourly wage (M17) = (take-home − work costs) ÷ (paid + commute + prep hours); with no hours typed, take-home ÷ 173 hours (40 a week), marked a guess.

**Assumptions and defaults.** Tax year 2026 tables in `data/reference-2026.json` (IRS Notice 2025-67, SSA 2026); state tax only for NY; the standard deduction always (no itemizing, spec F039); 0.75 variable-income guess; 173 hours a month.

**Brandon.** Pay is typed as take-home, so nothing is taxed: $3,170.35 a month. Hourly: $3,170.35 ÷ 173 = $18.33 an hour (a guess).

## 2. Spending, surplus and the savings rate (M20 to M29, M2A)

- Line a month (M20) = M01 on each Budget line; my share (M21) = the line after the household split (a Split line ÷ the people sharing, or × my share %; a Covered line minus what someone else pays; minus reimbursements). Lines marked Retirement are investing, not spending (answer 125). A bill About you marks as given as my share is never divided again; a whole bill is divided by Split N ways, the client included (batch 5, E).
- Spending a month (M27 spending) = the categories added up (batch 8: each category is the larger of its typed amount and the sum of its lines' shares; a category with no typed amount is its lines), or the gut number until the Budget switches to the categories. Retirement is left out (investing).
- Monthly surplus (M27) = take-home − spending − debt payments not already inside spending − sinking funds.
- Savings rate, headline (M28) = (surplus + after-tax savings + 401(k)/HSA from the paycheck + match) ÷ (take-home + 401(k)/HSA + match). Second line: surplus ÷ take-home. On gross: the same numerator ÷ gross.
- Housing % (M2A) = housing lines ÷ take-home, against a 35% reference line.
- Gut accuracy (M26) = average of |actual − first guess| ÷ actual across closed months.

**Defaults.** Housing line 0.35; a gut number "includes debt payments" unless told otherwise.

**Brandon.** Surplus = 3,170.35 − 1,737.35 = **$1,433 a month**. Savings rate = 1,433 ÷ 3,170.35 = **45.2%** (nothing comes off the paycheck, so headline and second line agree). Annual spending = 1,737.35 × 12 = $20,848.

## 3. Net worth, cash and the Rule of 5 (M40 to M43)

- Net worth (M40) = every account and thing − every debt balance (unvested match left out).
- Liquid net worth (M41) = cash + brokerage + Roth contributions − consumer debt.
- Runway (M42) = cash ÷ spending a month.
- Rule of 5 (M43) = (age ÷ 5) × spending a month, the months unrounded and shown to one decimal (25 is 5.0, 30 is 6.0, 40 is 8.0); one definition with big e (section 5). Keep pace: spending ÷ 60 a month. No age: no target, and big e is locked.

**Brandon.** Net worth = 43,000 + 8,745 + 20,000 = **$71,745**; liquid = 8,745 + 43,000 = $51,745; runway = 8,745 ÷ 1,737.35 = 5.0 months; Rule of 5: 24 ÷ 5 = **4.8 months × $1,737.35 = $8,339**; keep pace $29 a month.

## 4. Debt (M30 to M37)

- Card minimum (M30) = max($25, 1% of balance + a month's interest), capped at the balance; a month's interest = balance × APR ÷ 12.
- Payoff months (M31): each month adds balance × APR ÷ 12 and takes off the payment; a payment that never clears it reports the payment needed.
- Total interest (M32) = payments made − balance.
- Fee APR (M33) for payday or fee debt = fee × periods a year ÷ balance.
- Payoff order with extra (M34): a month-by-month run; the extra, and every payment freed by a cleared debt, rolls to the first debt in the order. Orders: Avalanche (highest APR), Snowball (smallest balance), Return on Hassle (hassle score ÷ balance, highest first, a placeholder), Stress (highest rating), Custom (dragged into place). The custom order's cost = its interest − Avalanche's interest with the same extra, also in months and FI days.
- Utilization (M35) = card balances ÷ limits; DTI (M36) = debt payments ÷ gross a month; promo payment (M37) = balance ÷ months left.

**Defaults.** Heavy debt: cards, payday, personal, medical, BNPL, tax debt, or any APR ≥ 8%. Typical APRs from the Fed G.19 when a rate is blank (marked a guess).

**Brandon.** No debt.

## 5. The cash layers (M68) and the emergency fund rule

Cash fills buckets in order, each with a target: Buffer = 2 weeks of spending = spending × 2 × 12 ÷ 52; little e = min($1,000, highest deductible); income gaps within 12 months; big e = the Rule of 5 = (age ÷ 5) × spending, in three nested layers (FAT: food, accommodation, transportation; DRAFTT; full). Without an age the big e layers have no target and say Add your age to set big e. A dip takes from the Buffer first, then little e, then big e; refilling runs the other way. Each dip is kept with the date, the amount, the layers and what each had left. History stats: dips, the deepest dip (lowest layer reached, % left, month), months to refill (dip to the first snapshot where its layers are full again, averaged).

Scorecard, Emergency fund: Hole until little e is full; OK with little e full; Strong with big e full.

**Brandon.** Buffer 1,737.35 × 24 ÷ 52 = **$802 (full)**; little e **$1,000 (full)**; big e FAT and DRAFTT $0 (a gut number has no lines), big e full **$8,339 target (4.8 months), $6,943 in (83%), $1,396 short**. Emergency fund: OK.

## 6. FI numbers and dates (M50 to M57, M70, M72)

- FI number (M50) = retirement spending × 12 ÷ withdrawal rate (today's spending unless typed).
- Lean FI (M51) = FAT lines × 12 ÷ withdrawal rate; Barista FI (M52) = (spending − part-time income) × 12 ÷ rate; Fat FI = FI × 1.5.
- Coast FI (M54) = FI ÷ (1 + r)^(retire age − age).
- Quiet Quitting FI (M70) = (FI − minimum × ((1+r)^n − 1) ÷ r) ÷ (1+r)^n, n = FI age − age, minimum = the IRA limit (+ the match if the job is kept).
- FI date (M53): start at invested; each month multiply by (1 + r)^(1/12) and add the month's investing; count months until the FI number; up to 840 months. Investing a month = 401(k) + HSA + match + the surplus (Invest my surplus on), or the after-tax contributions and Retirement lines (off).
- The range (answer 122): at Low confidence the date is run with spending 15% lower and 15% higher (the FI number and, with the surplus invested, the monthly investing both move); shown as a year range. Medium: narrower or a year. High: a month.
- Shockingly Simple Math (M72) = years from $0 at a savings rate s: ln(1 + (1−s)·12/w · g/s) ÷ ln(1+g), g the monthly growth.
- Money as time (M58): hours = $ ÷ hourly wage; FI days = $ ÷ (annual spending ÷ 365).
- The safer line (batch 5 C): when age + months to FI ÷ 12 is under 45, a second, smaller line runs the same path to spending × 12 ÷ 3.5% and shows that date. The main line keeps the client's own rate.

**Brandon.** FI number = 20,848 ÷ 0.04 = **$521,205**. Invested path: 43,000 growing 7% real with $1,433 a month reaches it in **171 months, Feb 2041**. Idle path ($0 a month): **443 months, Oct 2063**. Confidence Low (a gut spending number), so Home reads "Invest your surplus: FI around 2038 to 2044" (138 to 208 months) and "If it sits in checking: 2061 to 2065". Coast FI = 521,205 ÷ 1.07^41 = **$32,529**: reached. Quiet Quitting FI: $0 (the $7,500 a year IRA minimum alone gets there by 65): reached. $1,000 = 54.6 hours or 17.5 FI days. FI at 38 is under 45, so the card adds: "At a safer 3.5% for a longer retirement: FI Jun 2042" ($595,663 instead of $521,205; 187 months).

## 7. The Picture %, pace and confidence (M73)

Each number has a level: Missing 0, Gut 25, Rough 50, Estimate 75, Actual 100. Picture % = the weighted average (income rows, debt balances and account balances weigh 3; a debt APR, a thing, age and the areas 1; each DRAFTT category 2; the gut spending number 6 until the lines are the source). Pace: expected 40% by the end of S1, 70% by S2, 90% by S3 and held; within 5 points is On track. Confidence of an unlocked number: the weighted level of its inputs, High ≥ 90, Medium ≥ 75, else Low; an input older than 90 days drops it one step.

**Brandon.** Picture **61%**; the FI date's inputs read Low (the gut number).

## 8. The FOO (M69) and the cost of an override

SLAM's order: 0b Bedazzle (optional), 1 Stop the bleeding (Buffer, little e, no late bills, no payday debt), 2 the match, 3 heavy debt, 4 big e (locked until the age is in), 5 Roth IRA and HSA (locked while match is left on the table), 5b Give (off by default; its only prerequisite is no heavy debt), 6 Prepay retirement (Quiet Quitting FI, then Coast FI), 7 SPARKS launch window (after Coast FI), 8 Fund the future, 9 low-rate debt, FI, True FI. "Where you are" is the first step not done; 2 and 3 run together. Override costs (answer 150), all in FI days = dollars ÷ (annual spending ÷ 365): giving while carrying heavy debt costs the highest heavy APR on the yearly amount (else the real return); the Roth before the match costs the match left on the table a year; SPARKS before Coast FI costs the growth on the gap to Coast FI for a year at the real return.

**Brandon.** Steps 1, 2, 3 done (no match offered, no debt), **step 4 big e in progress ($1,396 left)**, 5 next ($7,500 to a Roth IRA; no match is offered, so it is not locked), 6 done (Coast FI reached), 7 locked until 6 counts as reached in order, 9 later.

## 9. The Scorecard (M74): rules, payoffs, best return

Eleven areas, each Strong, OK or Hole from a rule where the data can say, else the coach's call. Thresholds (js/registry/scorecard.js): cash flow 20% Strong, 5% OK; emergency fund by the layers; debt: heavy debt is a Hole, DTI over 36% OK; credit 740 Strong, under 670 Hole, cards over 30% used Hole; retirement 15% of gross Strong, match left on the table Hole; investing 15% of take-home Strong; goals 3 and 3 Strong; mindset: Confidence 7+ Strong, 4 or under Hole (Joy is the local measure and is not a Mindset input). Emergency fund: Strong with big e full (age ÷ 5 months).

Payoff a year per hole: cash flow = (5% × take-home − surplus) × 12; emergency = gap to 3 months × the typical card APR; debt = Σ balance × APR; credit = 2 points × all debt; retirement = match left + (with nothing going in) 6% × gross × 12 × marginal rate; investing = (idle cash above the target + a surplus not invested × 12) × real return; the rest typed by the coach. Best return = payoff ÷ effort hours. Ranking: parked holes last; no-payoff holes before them; then holes before the client's FOO step; then best return; then payoff.

**Brandon.** Cash flow Strong (45.2%), emergency OK, debt Strong, investing Strong, retirement **Hole** (nothing into a retirement account: payoff $707 a year, 12.4 FI days), goals Hole (none named); credit, taxes, protection, income, mindset unrated.

## 10. The ladder (M75): steps and markers

Steps in FOO order: little e, 401(k) match captured, 25/50/75% of the heavy debt at Day 0 paid, heavy debt free, big e. A step's projected month = its gap ÷ what goes into savings a month (the payoff path for the quarters). Markers: net worth ≥ $0, all consumer debt free, $100k net worth (gap ÷ monthly), Quiet Quitting FI, Coast FI, Lean FI, FI, Fat FI (the months-to math on invested). Markers slot between the steps by date; steps that do not apply are left out.

**Brandon.** Done or reached: net worth positive, Quiet Quitting FI, Coast FI, little e (4 wins). Next step **big e, 83% there, about Dec 2026**. Then $100k net worth about Jul 2028, FI about Feb 2041, Fat FI ($781,808) about May 2045; Lean FI has no target (no FAT lines yet).

## 11. Couples: the split and the person view

A person's view keeps their rows and the Joint ones at half (answer 157), so the two views add up to the household. Shared bills split by the typed share, else 50/50, else (Dating, Living together, Engaged, Married separate with By income chosen) by this client's share of the two take-homes: share = my take-home ÷ (mine + partner's). A retirement or health account is one person's in every mode. A mode never sets the tax filing status (answer 155); until one is typed the tax math uses the older Solo or couple rule.

## 12. Current vs Proposed (M76)

The same math run twice: on the file, and on a copy with the choices applied (a proposed spending total scales every line by the same factor or sets the gut number; the debt order; the retire-by age; whether the surplus is invested; extra to debt). Net worth in t years = invested × g^12t + monthly × (g^12t − 1) ÷ (g − 1) + (net worth − invested) + debt paid down on the payoff plan by then, g = (1 + r)^(1/12). Cash does not grow; a home or car does not appreciate.

**Brandon**, spending $1,500 instead of $1,737: FI date Feb 2041 to Aug 2038 (30 months sooner); savings rate 45.2% to 52.7%; net worth in 5 years $191,078 to $207,977; in 10 years $358,450 to $399,049; big e a month sooner; $100k net worth Apr 2028 instead of Jul 2028. The Proposed tab shows each step.

## 13. Statements, calendar and the month close (M60 to M67, M77)

Running balance: a day-by-day walk from the starting balance through every dated paycheck, bill, debt payment and entry, with paid, moved and partial marks; a day under the low line (the Buffer unless typed) is flagged. The net worth statement is M40 on the last day; the income statement is accrual (a card swipe counts when it happens); the cash flow statement counts money when it moves; the tie-out compares the two. Close streak: months closed in a row, one grace month allowed.

## Unit-error hunt (per-month vs per-year), Nov 6

Checked every `× 12`, `÷ 12`, `÷ 365`, `÷ 52` and paycheck conversion in the math (`grep` list in the overnight transcript). Findings:

1. **Fixed tonight, then superseded:** the Rule of 5 text said "Age 24 divided by 5 = 5 months" while the months were a fixed 5; batch 5 restored age ÷ 5, so the words and the number agree again (js/math/assets.js M43).
2. **Fixed tonight:** Net worth in 5 and 10 years (M76) compounded at r ÷ 12 a month while the FI date (M53) uses (1 + r)^(1/12). Both now use the FI date's growth; the gap was about 0.3% a year.
3. Verified right: FI number uses retirement spending × 12 (monthly in, yearly out); the FI range scales the yearly target and the monthly investing consistently; FI days divide by annual spending ÷ 365; take-home is computed yearly and divided by 12 once; a paycheck amount uses 26 (or the typed frequency) ÷ 12; the Buffer uses 2 × 12 ÷ 52 weeks; payoff interest is APR ÷ 12 per month; the Scorecard's retirement payoff uses gross a month × 12; the override cost uses monthly × 12 × rate.
4. **Watch (not changed):** M42 runway and the emergency reason divide cash by spending a month, while big e holds age ÷ 5 months after the Buffer and little e: a client who reads "5.0 months of cash" and "big e not full" may be confused; the layers card explains it. The savings rate headline adds pretax money to both numerator and denominator (a choice, not an error).
5. **Watch:** the hourly wage fallback (173 hours a month) is a yearly 2,080 ÷ 12; fine, but "Hours" on a paycheck basis is never shown per paycheck.

## Review: a CFP-style planner and the FIRE voices, per calculation

Severity: **high** could mislead a client into a bad decision; **medium** is a simplification worth a sentence on screen; **low** is a wording or edge case.

| Calculation | Mainstream CFP-style | FIRE voices (ChooseFI, MMM, Money Guy) | Where SLAM differs | Severity |
|---|---|---|---|---|
| FI number = 25× spending (M50) | A full retirement income analysis: taxes on withdrawals, Social Security, healthcare before 65, sequence risk, a success probability, not a single number | 25× (the 4% rule, Trinity) is the headline; MMM adds "spending is the lever"; Money Guy would use a lower withdrawal rate for a long horizon | SLAM uses 25× today's spending before tax and ignores Social Security entirely (F222 parked), healthcare and taxes on withdrawals (True FI adds a flat 15%). Batch 5 adds a second line at 3.5% whenever FI would come before 45 (QUESTIONS 173 asks whether it should be the main number) | **high**, partly answered: taxes and healthcare are still not in the number |
| FI date (M53), 7% real | Monte Carlo or at least a range of returns; real return assumptions near 4 to 5% for a balanced mix | 7% real (US stocks, historical) is the usual FIRE default; ChooseFI and Money Guy both show ranges | 7% real is high for a diversified portfolio and makes every date look sooner; the range shown comes from spending confidence, not return risk; the "Pace" paces (Optimistic, Likely, Pessimistic) exist on the Timeline only | **high**: show the FI date at 5% real beside 7%, or make Likely 5% |
| The FI range by confidence (answer 122) | Not a concept; ranges come from return risk | Not a concept | A spending range of ±15% is a data-quality cue, not a forecast; a client may read "2038 to 2044" as certainty | medium: label it "depends on how sure the spending number is" |
| Coast FI (M54), Quiet Quitting FI (M70) | Rarely framed; a planner would stress that stopping contributions early raises sequence and inflation risk | Core FIRE ideas; Money Guy warns against coasting too early | SLAM marks step 6 Done at Coast FI, which can read as permission to stop saving at 24; it relies on one return and the FI age | medium |
| Savings rate (M28) | Savings ÷ gross income, usually with a 15 to 20% target | Savings ÷ take-home (MMM, ChooseFI); the Shockingly Simple table | Headline adds 401(k), HSA and match to both sides; the gross figure is in Show the math only; the invested surplus counts as saved even if it sits in checking (Invest my surplus on by default) | medium: the default assumes behavior (investing the surplus) that has not happened |
| Surplus (M27) | Budget after taxes and all commitments, including irregular and annual costs | Same | A gut number includes everything; with lines, irregular yearly costs are set aside (M24); sinking funds reduce the surplus. OK | low |
| Rule of 5 / big e = age ÷ 5 months (M43, M68) | 3 to 6 months of essential expenses, more for variable income | ChooseFI often says less when income is stable; Money Guy 3 to 6 months by stability | Months grow with age (a 24-year-old holds 4.8, a 50-year-old 10) of full spending, whatever the income stability; a young variable-income household may be under-covered, an older steady one over-covered | medium: QUESTIONS 172 |
| Buffer = 2 weeks (M68) | A checking cushion is common advice; no standard size | MMM, Money Guy: one month of expenses in checking | 2 weeks is a default picked tonight | low: QUESTIONS 148 |
| little e = min($1,000, deductible) | Starter funds of $1,000 to $2,000 (Ramsey-style) | Money Guy: deductibles covered first (their step 1) | Matches Money Guy; "whichever is smaller" means a $5,000 deductible leaves a gap until big e | low |
| Heavy debt ≥ 8% APR | Compare the after-tax rate to expected returns; 6 to 7% is a common line | Money Guy: pay off anything over 6% in your 20s rising with age; MMM: any debt is an emergency | SLAM uses one 8% line and the pre-tax APR; deductible student loan or mortgage interest is not valued after tax (QUESTIONS 159) | medium |
| Payoff orders (M34) | Avalanche (least interest) with Snowball where behavior needs it | ChooseFI and MMM: avalanche; Ramsey: snowball; Money Guy: by rate | Return on Hassle is a placeholder rule; the stress-based suggestion is new, never forced; the custom order shows its cost | low |
| Debt payments in the FI math | Debt is a liability on the balance sheet; the payoff is modeled in cash flow | Same | The FI date ignores that payments end (freed cash after payoff is not added to investing); Net worth in 5 and 10 years adds the paydown but not the freed payments | medium: the FI date is conservative for a client with a car loan ending soon |
| Taxes (M10 to M14) | Full return: credits, itemizing, state and local for every state, capital gains, AMT | Mostly ignored; FIRE voices tell people to look up their marginal rate | Federal, FICA, NY/NYC only; standard deduction always; no credits; no capital gains or Roth conversion math; True FI uses a flat 15% on withdrawals | medium: fine for a take-home check, not for tax planning; say so |
| Real hourly wage (M17), FI days (M58) | Not a planning concept | YMOYL (Your Money or Your Life) life energy; MMM | The 173-hour fallback is a guess and labeled; FI days divide by annual spending, so a client with a low spending number sees big FI-day numbers | low |
| Scorecard payoffs (M74) | Not a standard; closest is a financial checkup | Not a standard | The payoffs are rough one-year estimates (emergency gap at a card APR assumes the gap would be borrowed; credit = 2 points on all debt; investing = the real return on idle cash); best return ÷ effort hours ranks them. They are planning heuristics, not predictions | medium: say "rough, a year" beside each |
| Picture % and confidence (M73) | Data quality is tracked but not scored | Not a concept | New; the weights are the coach's | low |
| Net worth in 5 and 10 years (M76) | Full projection: every account's growth, contributions, home appreciation, debt amortization, taxes | Simple compounding of invested | Cash and things do not grow; debt paydown is added but freed payments are not reinvested; one real return | medium |
| Couples (section 11) | Household planning with each spouse's accounts, filing status and Social Security | Mostly household-level | A Joint row counts half in each person's view (the two add up); the by-income split uses take-home; the mode never sets a filing status (batch 5); until typed, the tax math uses the Solo or couple rule | low after batch 5 (QUESTIONS 174 on the fallback) |
| Statements (M62 to M67) | Balance sheet, income statement, cash flow statement; accrual vs cash | Rare | Matches the standard shapes; the cash statement depends on calendar marks | low |
| Month close streak (M77) | Not a planning concept | Habit framing (MMM) | Behavioral; one grace month is a choice | low |

### The five flags a CFP should look at first

1. **4% at 24.** A 50-year retirement on 25× pre-tax spending with no Social Security, healthcare or withdrawal taxes (high; batch 5 adds the 3.5% line under 45, QUESTIONS 173).
2. **7% real everywhere.** Every FI date, Coast FI and Quiet Quitting FI leans on one optimistic return; the shown range comes from spending, not returns (high).
3. **Invest my surplus on by default.** The savings rate and FI date assume the surplus is invested the day it appears (medium, behavioral).
4. **Debt in the FI math.** Freed payments after payoff are not reinvested, and low-rate debt is compared at pre-tax APR (medium).
5. **Filing status by couple mode.** Resolved in batch 5: no mode sets it; the fallback rule is QUESTIONS 174 (low).

Unit errors found and fixed tonight: the Rule of 5 words; the Proposed compounding rate. No per-month-read-as-per-year error was found in the math this time.
