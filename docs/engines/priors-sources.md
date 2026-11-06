# Priors: draft source table

Status: research draft, Batch 17 (searched and read 2026-11-05); priors check, Batch 24 (2026-11-06): each Secondary
row tried against its primary table (the SCF 2025 report, the Fed SHED tables, Census CPS and ACS), and moved to
Primary with the exact table and page where it matched. **None of these numbers is in app code**, and none should be
until it is entered as reference data with its source and date (docs/engines/priors.md). Figures are paraphrased
from the cited pages and rounded as they give them.

**How to read the Check column.** *Primary*: read on the publisher's own page or its FRED mirror in this session.
*Secondary*: read on a third-party page that cites the primary table; the primary was not reachable from the build
(listed at the end), so it needs one look before use; each such row says why it is still unverified. *Not found*: the
figure is needed but no source was read.

## Income

| Figure | Age band | Year | Value | Source | Check | How it becomes a range |
|---|---|---|---|---|---|---|
| Median household income, all households | all | 2024 | $83,730 | [Census P60-286, figure 1](https://www.census.gov/content/dam/Census/library/visualizations/2025/demo/p60-286/figure1.pdf) | Primary | Anchor for scaling; the age rows below give the range |
| same | all | 2025 | $87,460 (up 2.6% from $85,210 in 2024, in 2025 dollars) | [Census P60-289, Income in the United States: 2025, highlights](https://www.census.gov/library/publications/2026/demo/p60-289.html) | Primary (batch 24) | The newer anchor: use it with the 2025 age rows |
| Median household income by age of householder (Census H-10), 25th and 75th from CPS ASEC microdata | under 25 | 2025 incomes (CPS ASEC 2026) | median $60,870; 25th $34,000; 75th $100,000 | [Eco3min, citing Census H-10 and its own CPS ASEC 2026 microdata run](https://eco3min.fr/en/household-income-percentile-by-age/) | Secondary, still unverified (batch 24): the medians by age are in P60-289 Table 1 ([table1.xlsx](https://www2.census.gov/programs-surveys/demo/tables/p60/289/table1.xlsx)) and HINC-01 2026 ([hinc01_1.xlsx](https://www2.census.gov/programs-surveys/cps/tables/hinc-01/2026/hinc01_1.xlsx)), and www2.census.gov was refused by the permission step; the 25th and 75th are the page's own microdata run, which no Census table publishes | 25th to 75th of gross household income; take-home via SLAM's M12 |
| same | 25 to 34 | same | median $94,880; 25th $54,000; 75th $151,000 | same | Secondary | same |
| same | 35 to 44 | same | median $114,100; 25th $61,000; 75th $191,000 | same | Secondary | same |
| same | 45 to 54 | same | median $120,100; 25th $62,000; 75th $208,000 | same | Secondary | same |
| same | 55 to 64 | same | median $99,320; 25th $48,000; 75th $178,000 | same | Secondary | same |
| same | 65 and over | same | median $59,680; 25th $29,000; 75th $113,000 | same | Secondary | same |
| Income before taxes per consumer unit (CE) | under 25 | 2024 | $48,514 (wages $43,360; self-employment $2,248) | [FRED, CE tables by age, under 25, income and taxes](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198321) | Primary (FRED mirror of BLS CE) | A mean: likely only; use the CPS percentiles for the range |
| Median family income (SCF) | all | 2025 | $82,200 | [Federal Reserve press release, Oct 9 2026](https://federalreserve.gov/newsevents/pressreleases/other20261009a.htm) | Primary | Cross-check for the CPS anchor. The report's Table A.2 (p. 48) gives $84,200 for the 50th percentile of usual income ($80,300 in 2022); p. 58 uses $82,200 against the CPS: say which one |
| Household income by age of householder (ACS B19049) | under 25, 25 to 44, 45 to 64, 65+ | ACS 2024 | not read (the page showed headers only) | [Census Reporter B19049](https://censusreporter.org/tables/B19049/) | Not found | For NY and metro scaling (state median against the national) |

Note: the Census age medians in P60-286 figure 1 could not be matched to their labels on the page that was read, so
the H-10 medians above are the ones to verify first. Their under-25 figure is above the CE mean for the same band,
which is expected (CE counts consumer units, including students living alone), and is why the two must not be mixed.

## Spending by category (BLS Consumer Expenditure Survey, by age of reference person, 2024, annual means)

All rows: [FRED release tables for the CE by age of reference person](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198191),
which mirror the BLS CE calendar-year tables. Under 25 from [its expenditures table](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198193);
25 to 34 from [its expenditures table](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198346); totals from the
FRED series [under 25](https://fred.stlouisfed.org/series/CXUTOTALEXPLB0402M), [25 to 34](https://fred.stlouisfed.org/series/CXUTOTALEXPLB0403M)
and [35 to 44](https://fred.stlouisfed.org/series/CXUTOTALEXPLB0404M). Check: Primary (FRED mirror).

| Category (a year) | Under 25 | 25 to 34 | 35 to 44 |
|---|---|---|---|
| Total expenditures | $47,283 | $74,475 (2023: $71,867) | $91,229 (2023: $90,939) |
| Food | $7,215 | $9,630 | not read |
| Food at home | $4,189 | $5,712 | not read |
| Food away from home | $3,025 | $3,918 | not read |
| Housing | $16,853 | $26,380 | not read |
| Shelter | $12,050 | $17,656 | not read |
| Rented dwellings | $10,119 | $9,927 | not read |
| Utilities, fuels, public services | $2,181 | $4,076 | not read |
| Transportation | $9,243 | $12,802 | not read |
| Vehicle purchases (net outlay) | $4,312 | $5,266 | not read |
| Health care | $1,485 | $3,825 | not read |
| Entertainment | $1,835 | $3,224 | not read |
| Apparel and services | $1,541 | $2,220 | not read |
| Personal insurance and pensions | $4,428 | $10,701 | not read |
| Cash contributions | $345 | $1,004 | not read |

**How these become a range.** CE publishes means per consumer unit, not percentiles. Likely = the mean divided by 12,
then by the household-size factor (CE also publishes by size of consumer unit, [FRED table](https://fred.stlouisfed.org/release/tables?rid=479&eid=1215378)),
scaled by place (cost of living). Low and high = a stated spread (start at 0.6 and 1.5 of likely) until percentiles are
computed from the CE public-use microdata. Rent for a renter uses the ACS rent row instead of "rented dwellings"
(which averages renters and owners). Once take-home is known, switch to the CE rows by income quintile
([FRED table](https://fred.stlouisfed.org/release/tables?rid=479&eid=1213094)).

## Rent

| Figure | Area | Year | Value | Source | Check | How it becomes a range |
|---|---|---|---|---|---|---|
| Median gross rent (ACS B25064, 1-year) | United States | 2024 | $1,487 a month | [gousa.kr summary of ACS 2024 B25064](https://gousa.kr/board/housing/4213) | Secondary, still unverified (batch 24): api.census.gov and data.census.gov were not reachable (the proxy refused the API; no census.gov page with the table came up in search) | The median is likely; the ACS also publishes rent quartiles (B25057, B25059) for low and high |
| same | New York State | 2024 | $1,720 | same | Secondary | same |
| same | New Jersey | 2024 | $1,798 | same | Secondary | same |
| same | New York-Newark-Jersey City metro | 2024 | $1,890 | same | Secondary | same, the default row for SLAM's NY clients |
| Rent by age of householder | any | | | ACS PUMS (age by gross rent) | Not found | Needed to make rent an age prior, not only a place prior |

## Net worth, debts and balances (Federal Reserve Survey of Consumer Finances, 2025 wave, released Oct 9 2026)

Headline figures from the [Fed's press release](https://federalreserve.gov/newsevents/pressreleases/other20261009a.htm)
(Primary): median family net worth $215,900 and mean $1.24 million (2025 dollars); 77% of families have some debt; 8.6%
pay over 40% of income on debt (6.5% in 2022); about 65% take part in a retirement plan; homeownership 66%; median
stock holdings among holders $77,400. The full report is "Changes in U.S. Family Finances from 2022 to 2025"
(federalreserve.gov/publications/files/scf26.pdf, not reachable from the build).

| Figure | Age of head | Value | Source | Check | How it becomes a range |
|---|---|---|---|---|---|
| Median net worth | under 35 | $33,000 (mean $135,400) | [SCF 2025 report, scf26.pdf](https://www.federalreserve.gov/publications/files/scf26.pdf), Table 2 (p. 12), thousands of 2025 dollars | Primary (batch 24; matches the Switchwize figures exactly) | Likely = median; low and high from the SCF percentiles (the Fed's interactive chart, or the older suite's 2022 percentile file updated) |
| same | 35 to 44 | $155,600 (mean $681,900) | same | Primary | same |
| same | 45 to 54 | $253,700 (mean $1,244,500) | same | Primary | same |
| same | 55 to 64 | $411,900 (mean $1,878,000) | same | Primary | same |
| same | 65 to 74 | $431,300 (mean $1,897,600) | same | Primary | same |
| same | 75 and over | $504,900 (mean $1,962,200) | same | Primary | same |
| Has a retirement account; median balance among holders | under 35 | 48.8%; $21,000 (mean $48,500) | [Dave Manuel, from the SCF historical tables](https://www.davemanuel.com/retirement-savings-by-age.php) | Secondary, still unverified (batch 24): the report has no by-age ownership or median table. Its Box 2 Table A (p. 18) gives the mean among IRA or DC holders: under 35 $48,400 (the page says $48,500), 35 to 44 $182,400, 45 to 54 $415,800, 55 to 64 $670,200; Box 2 (p. 17) gives plan participation (any IRA, DC or DB) of 66% at 35 to 44 and about 70% at 45 to 64. The shares and medians by age are in the SCF historical tables (an xlsx on federalreserve.gov), not found by search | Two parts: the chance of any (48.8%), and the range if any |
| same | 35 to 44 | 59.6%; $61,000 (mean $182,400) | same | Secondary, still unverified (as above) | same |
| same | 45 to 54 | 63.0%; $133,000 | same | Secondary, still unverified (as above) | same |
| same | 55 to 64 | 63.1%; $239,000 | same | Secondary, still unverified (as above) | same |
| Retirement balance percentiles, all families (no account counts as $0) | under 35 | 25th $0, median $0, 75th $19,000, 90th $75,000 | same page, the author's own run of the 2025 public data | Secondary, computed by a third party; stays so until SLAM runs the SCF public data itself (no Fed table publishes these percentiles) | Used as is for "typical at your age"; the median of $0 is why the prior must say "if you have one" |
| same | 35 to 44 | 25th $0, median $7,000, 75th $95,000, 90th $326,000 | same | Secondary | same |
| Carrying a credit card balance; median balance among carriers | all | 44.7% (45.2% in 2022); median $3,100 ($3,000 in 2022), mean $8,000 ($6,700) | [SCF 2025 report, scf26.pdf](https://www.federalreserve.gov/publications/files/scf26.pdf), Table 4 (p. 25), credit card balances | Primary (batch 24) | The chance of a balance, then a range around $3,100; by age needs the report's debt table |
| Median checking and savings balance (transaction accounts, among the 98.7% who have one) | all | $8,200 ($8,800 in 2022); mean $62,900 | [SCF 2025 report, scf26.pdf](https://www.federalreserve.gov/publications/files/scf26.pdf), Table 3 (p. 15), transaction accounts | Primary (batch 24) | A transaction-account prior; by age needs the report's asset table |
| Has education debt (student loans) | all | 20.0% (21.8% in 2022); median $25,600, mean $43,000 among holders | [SCF 2025 report, scf26.pdf](https://www.federalreserve.gov/publications/files/scf26.pdf), Table 4 (p. 25), student loans | Primary (batch 24) | The chance of any; the balance from the FSA row below |
| Late on a loan payment in the past year | all | 19.6% (12.2% in 2022); 60 days or more 8.2% (4.9%) | [SCF 2025 report, scf26.pdf](https://www.federalreserve.gov/publications/files/scf26.pdf), Table 5 (p. 30), late on payments | Primary (batch 24) | Not a prior for a field; context for the lender's-eye view |
| Card, vehicle and education debt by age; transaction accounts by age | each band | not read | the report (read in batch 24) gives Tables 3 and 4 for all families only, with no age split | Not found: in the SCF historical tables (xlsx), not found by search | The main gap: the SCF by-age debt table |

## Credit card debt (other sources)

| Figure | Age band | Year | Value | Source | Check | How it becomes a range |
|---|---|---|---|---|---|---|
| Average card balance per cardholder | Gen Z (about 13 to 28 in 2025) | 2025 | $3,493 | [Experian, average credit card debt by age](https://stg1.experian.com/blogs/ask-experian/research/credit-card-debt-by-age) | Secondary (a bureau's own data; the page's dates conflict); not checked in batch 24, outside the SCF, CE and Census pass | Means of all cardholders including those who pay in full; use only as a cross-check on the SCF median |
| same | Millennials (about 29 to 44) | 2025 | $6,961 | same | Secondary | same |
| same | Gen X (about 45 to 60) | 2025 | $9,600 | same | Secondary | same |
| Card balances by age, totals | 18 to 29; 30 to 39 | Q4 2023 | about $90 billion; $210 billion | [ConsumerAffairs, citing the NY Fed Household Debt and Credit report](https://consumeraffairs.com/finance/average-credit-card-debt-by-age.html) | Secondary and dated | Not a per-person figure; replace with the NY Fed's latest per-capita by age |

## Student loans

| Figure | Age band | Value | Source | Check | How it becomes a range |
|---|---|---|---|---|---|
| Federal student loans: average balance per borrower | 24 and younger | $14,315 (7.3 million borrowers) | [Student Loan Planner, citing the Federal Student Aid portfolio by age](https://www.studentloanplanner.com/student-loan-debt-by-generation/) | Secondary, quarter not stated; not checked in batch 24 (the FSA Data Center portfolio by age is the primary, outside this pass) | A mean among borrowers; the chance of any from the SCF (20% of families); range 0.5 to 1.5 of the mean until FSA balance bands are read |
| same | 25 to 34 | $33,173 (15.0 million) | same | Secondary | same |
| same | 35 to 49 | $43,438 (14.6 million) | same | Secondary | same |
| same | 50 to 61 | $45,138 (6.5 million) | same | Secondary | same |
| same | 62 and up | $41,269 (2.6 million) | same | Secondary | same |

## Emergency savings (Federal Reserve SHED, survey of October 2025, published May 2026)

| Figure | Age band | Value | Source | Check | How it becomes a range |
|---|---|---|---|---|---|
| Would cover a $400 emergency with cash or its equivalent | all adults | 63% | [Fed SHED data, unexpected expenses](https://www.federalreserve.gov/consumerscommunities/sheddataviz/unexpectedexpenses-table.html) | Primary | The chance little e is covered: at 18 to 29, the prior for "can cover $400" is 45% |
| same | 18 to 29 | 45% | same | Primary | same |
| same | 30 to 44 | 57% | same | Primary | same |
| same | 45 to 59 | 66% | same | Primary | same |
| same | 60 and over | 78% | same | Primary | same |
| Has three months of expenses in emergency savings | all adults | 55% | [Fed SHED data, emergency savings, 2025](https://www.federalreserve.gov/consumerscommunities/sheddataviz/emergency-savings-table.html) ("Adults who have 3 months emergency savings", among all adults) | Primary (batch 24; matches Financer.com) | The chance the Rule of 5's first layers are full; months of cash as a range needs the SCF transaction-account row by age |
| same | 18 to 29 | 37% | same | Primary | same |
| same | 30 to 44 | 49% | same | Primary | same |
| same | 45 to 59 | 55% | same | Primary | same |
| same | 60 and over | 71% | same | Primary | same |

## Already in SLAM

- Typical APR by debt type (Fed G.19, Q2 2026): `data/reference-2026.json` typicalRates (the card Guess is 25% on purpose).
- The older suite's SCF 2022 net worth percentiles by age (`data/net_worth_percentiles_scf_2022.json`, marked sourced)
  can be the shape for the 2025 file.

## Could not reach from the build (for the verify pass)

Batch 24 read the 2025 SCF report (scf26.pdf) and the SHED emergency savings table; those rows are Primary now. Still
refused by the proxy or the permission step, each needing one look before its figures are used: www2.census.gov (P60-289's
PDF and table1.xlsx, the HINC-01 2026 and HINC-03 spreadsheets), api.census.gov and data.census.gov (ACS B25064 rent),
bls.gov CE tables directly, and the SCF historical tables (the by-age shares and medians; not found by search). The
federalreserve.gov/econres/files/bulletincharts.pdf found by search is the 2016 SCF Chartbook, too old to use.

## Next steps

1. Verify the rows still Secondary (the Census age medians, ACS rent, the SCF retirement shares by age) once www2.census.gov
   and the SCF historical tables can be read; replace the CE spreads with microdata percentiles.
2. Pull the SCF 2025 by-age debt, card, education and transaction-account rows.
3. Add the CE rows for 35 to 44 and older, by composition of consumer unit, and by income quintile.
4. Add a cost-of-living table for NY, NJ and the metro, with its source.
5. Write each as a `data/priors/*.json` file with its source, year and asOf, registered in `REFERENCE_FILES`.
