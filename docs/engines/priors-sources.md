# Priors: draft source table

Status: research draft, Batch 17 (searched and read 2026-11-05); priors check, Batch 24 (2026-11-06): each Secondary
row tried against its primary table (the SCF 2025 report, the Fed SHED tables, Census CPS and ACS), and moved to
Primary with the exact table and page where it matched. Batch 31 (2026-11-06) entered the Primary rows, and only those, as `data/priors-2026.json` (registered in
`REFERENCE_FILES`; test/priors.test.js checks every figure there against a Primary row here). Batch 39 (2026-11-06, the data pass) read the CE
by age for 35 and over and by size of consumer unit (one person), ACS median gross rent for the US and New York State
(QuickFacts), BEA price parities for the NY metro and NJ, the SCF report's all-families retirement row and net worth
percentiles, and the BLS New York metro CE release; the by-age SCF tables and the NY metro rent stayed out of reach
(the exact URLs are under "Could not reach"). Batch 54 (2026-11-06, the second data pass) read the CE 2024 all consumer
units table (the BLS release's Table A), and tried every other gap again (what was reached and what was not is under
"Batch 54" at the end). No Secondary or Not
found figure is in app code, and none should be until it is verified and entered with its source and date
(docs/engines/priors.md). Figures are paraphrased
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

## Spending by category (BLS Consumer Expenditure Survey 2024, by age of reference person and by size of consumer unit, annual means)

All rows: [FRED release tables for the CE by age of reference person](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198191),
which mirror the BLS CE calendar-year tables. Expenditures tables: [under 25](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198193),
[25 to 34](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198346), [35 to 44](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198499),
[45 to 54](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198652), [55 to 64](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198805),
[65 to 74](https://fred.stlouisfed.org/release/tables?rid=479&eid=1199111), [75 and over](https://fred.stlouisfed.org/release/tables?rid=479&eid=1199264)
(batch 39 read 35 and over). All ages (batch 54): [BLS, Consumer Expenditures in 2024, Table A, all consumer units](https://www.bls.gov/news.release/archives/cesan_12192025.htm)
(released Dec 19 2025, read Nov 6 2026; the total matches [FRED CXUTOTALEXPLB0101M](https://fred.stlouisfed.org/series/CXUTOTALEXPLB0101M), 2024: 78,535; Table A has no
shelter or utilities line, so those two use the totals for the age ratio). Totals also from the FRED series [under 25](https://fred.stlouisfed.org/series/CXUTOTALEXPLB0402M),
[25 to 34](https://fred.stlouisfed.org/series/CXUTOTALEXPLB0403M) and [35 to 44](https://fred.stlouisfed.org/series/CXUTOTALEXPLB0404M). One person:
[FRED, CE by size of consumer unit, one person, expenditures](https://fred.stlouisfed.org/release/tables?rid=479&eid=1215380) (its total is also the
series [CXUTOTALEXPLB0502M](https://fred.stlouisfed.org/data/CXUTOTALEXPLB0502M), 2024: $48,794). Check: Primary (FRED mirror).

| Category (a year) | Under 25 | 25 to 34 | 35 to 44 | 45 to 54 | 55 to 64 | 65 to 74 | 75 and over | One person, all ages | All ages (batch 54) |
|---|---|---|---|---|---|---|---|---|---|
| Total expenditures | $47,283 | $74,475 (2023: $71,867) | $91,229 (2023: $90,939) | $100,327 | $84,946 | $65,354 | $55,834 | $48,794 | $78,535 |
| Food | $7,215 | $9,630 | $12,460 | $12,772 | $10,214 | $8,483 | $7,168 | $5,644 | $10,169 |
| Food at home | $4,189 | $5,712 | $7,411 | $7,703 | $6,174 | $5,642 | $4,696 | $3,395 | $6,224 |
| Food away from home | $3,025 | $3,918 | $5,049 | $5,069 | $4,040 | $2,841 | $2,472 | $2,249 | $3,945 |
| Housing | $16,853 | $26,380 | $30,369 | $30,747 | $27,019 | $22,329 | $21,999 | $19,052 | $26,266 |
| Shelter | $12,050 | $17,656 | $18,728 | $19,283 | $16,507 | $12,749 | $13,346 | $12,954 | not in Table A |
| Rented dwellings | $10,119 | $9,927 | $7,036 | $5,001 | $3,619 | $2,681 | $4,435 | $6,986 | $5,660 |
| Utilities, fuels, public services | $2,181 | $4,076 | $5,053 | $5,779 | $5,138 | $4,653 | $4,234 | $2,978 | not in Table A |
| Transportation | $9,243 | $12,802 | $15,581 | $17,184 | $15,085 | $11,414 | $6,855 | $6,953 | $13,318 |
| Vehicle purchases (net outlay) | $4,312 | $5,266 | $6,560 | $6,448 | $6,344 | $4,539 | $2,039 | $2,490 | $5,337 |
| Health care | $1,485 | $3,825 | $5,949 | $6,748 | $6,711 | $7,715 | $7,918 | $4,026 | $6,197 |
| Entertainment | $1,835 | $3,224 | $4,128 | $4,803 | $3,706 | $3,122 | $2,888 | $2,187 | $3,609 |
| Apparel and services | $1,541 | $2,220 | $2,649 | $2,547 | $2,032 | $1,377 | $942 | $1,113 | $2,001 |
| Personal insurance and pensions | $4,428 | $10,701 | $13,465 | $14,948 | $12,172 | $4,579 | $1,908 | $4,329 | $9,797 |
| Cash contributions | $345 | $1,004 | $1,595 | $3,315 | $2,300 | $2,921 | $3,497 | $2,152 | $2,292 |

Who these households are (CE 2024 consumer unit characteristics, same FRED tables, Primary): 25 to 34 average 2.6
people, reference person 29.9, 56% renters ([table](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198449)); 35 to 44 average 3.3 people,
40% renters ([table](https://fred.stlouisfed.org/release/tables?rid=479&eid=1198602)); one person: 40.8 million consumer units, average age 56.3,
0.6 earners, 51% renters ([table](https://fred.stlouisfed.org/release/tables?rid=479&eid=1215483)). The one-person row is all ages: the CE
publishes no one-person table by age, so a 28-year-old living alone is compared with every one-person household,
retirees included, and the tip says so.

**How these become a range.** CE publishes means per consumer unit, not percentiles. Likely = the mean divided by 12;
spending all in is total expenditures less personal insurance and pensions (payroll taxes and retirement
contributions, taken out before take-home). A person living alone (About you: Solo) reads the one-person column; a
couple reads the age band's column (households of every size). Low and high = a stated spread (0.6 and 1.5 of likely)
until percentiles are computed from the CE public-use microdata. A NY client's spending is scaled by the NY metro's
price parity (Place, below). Rent for a renter uses the ACS rent row instead of "rented dwellings" (which averages
renters and owners). Once take-home is known, switch to the CE rows by income quintile
([FRED table](https://fred.stlouisfed.org/release/tables?rid=479&eid=1213094), not read yet).

## Place (cost of living and the New York metro)

| Figure | Area | Year | Value | Source | Check | How it is used |
|---|---|---|---|---|---|---|
| Regional price parity, all items (US = 100) | New York-Newark-Jersey City metro (MSA 35620) | 2024 | 112.563 (2023: 112.645) | [FRED RPPALL35620, from BEA](https://fred.stlouisfed.org/data/RPPALL35620) | Primary (FRED mirror of BEA) | Spending for a NY client times 1.12563 (QUESTIONS 210: the NY metro for NY clients) |
| same | New York State | 2024 | 107.921 | [FRED NYRPPALL, from BEA](https://fred.stlouisfed.org/data/NYRPPALL) | Primary (FRED mirror of BEA) | Not used (210 picked the metro); here for a later upstate switch |
| same | New Jersey | 2024 | 108.805 | [FRED NJRPPALL, from BEA](https://fred.stlouisfed.org/data/NJRPPALL) | Primary (FRED mirror of BEA) | Spending for a NJ client times 1.08805 |
| Regional price parity, housing services (US = 100) | New York-Newark-Jersey City metro | 2024 | 148.616 | [FRED RPPSERVERENT35620, from BEA](https://fred.stlouisfed.org/data/RPPSERVERENT35620) | Primary (FRED mirror of BEA) | Not used for rent: it prices a like-for-like unit, so the national median times 1.486 (about $2,100) overstates what NY renters pay (Secondary pages put the metro median near $1,830 to $1,890) |
| CE average annual expenditures, NY metro against the US | New York metro | 2022 to 2023 | $90,291 against $75,172 (1.20); housing $33,626 (37.2%); 2.6 people per unit; income before taxes $122,473 | [BLS, Consumer Expenditures in the New York Metropolitan Area: 2022-23, Table 1](https://www.bls.gov/regions/northeast/news-release/2024/consumerexpenditures_newyork_20241118.htm) | Primary | A cross-check on the price parity: NY metro households spend about 20% more, partly from higher incomes, which is why the price parity (12%) is the scale. The 2023-24 release (Jan 6 2026) is only on FRASER as a PDF, not reachable. Batch 46 used the US figure ($75,172) as the all-ages total in the age band's ratio to all ages; batch 54 replaced it with the 2024 all consumer units table above (QUESTIONS 336, 380). Batch 54: the 2023-24 release is still only the FRASER PDF |

## Rent

| Figure | Area | Year | Value | Source | Check | How it becomes a range |
|---|---|---|---|---|---|---|
| Median gross rent (ACS 5-year, B25064, as QuickFacts gives it) | United States | 2020 to 2024 | $1,413 a month | [Census QuickFacts, United States, Median gross rent 2020-2024](https://www.census.gov/quickfacts/fact/table/US/HSG860223) | Primary (batch 39) | Likely = the median; low and high the stated spread (no gross rent quartile is published); a renter's share divides it by the people the rent is split among |
| same | New York State | 2020 to 2024 | $1,621 a month | [Census QuickFacts, New York, Median gross rent 2020-2024](https://www.census.gov/quickfacts/fact/table/NY/HSG860224) | Primary (batch 39) | The row a NY renter reads until the metro figure is read (the basis line says New York State) |
| same | Rockland County, NY | 2020 to 2024 | $1,901 a month | [Census QuickFacts, Rockland County](https://www.census.gov/quickfacts/rocklandcountynewyork) | Primary (batch 39) | Not used: SLAM knows the state, not the county |
| same | United States, 2015 to 2019 against 2020 to 2024 | 2020 to 2024 | $1,413 against $1,309 | [Census, Renters in 20% of U.S. Counties Paid More in 2020-2024 (Jan 2026)](https://www.census.gov/library/stories/2026/01/housing-costs.html) | Primary (matches QuickFacts) | Context |
| Median gross rent (ACS 1-year, B25064) | United States | 2024 | $1,487 a month | [gousa.kr summary of ACS 2024 B25064](https://gousa.kr/board/housing/4213) | Secondary, still unverified: the Census API and data.census.gov refused again in batch 39 and batch 54 (the query URL needs an approval no one could give; data.census.gov's table page is JavaScript only; Census Reporter's metro profile has no rent) | Would replace the 5-year figure once read |
| same | New York State | 2024 | $1,720 | same | Secondary | same |
| same | New Jersey | 2024 | $1,798 | same | Secondary (QuickFacts NJ failed at the site in batch 39) | same |
| same | New York-Newark-Jersey City metro | 2024 | $1,890 | same | Secondary | The row SLAM wants for NY clients (QUESTIONS 210) |
| Median gross rent (ACS 5-year) | New York metro | 2020 to 2024 | about $1,830 | [USAFacts, New York metro rent](https://usafacts.org/answers/how-much-do-households-spend-on-rent/metro-area/new-york-ny) | Secondary (cites the ACS, no table number) | same |
| Rent quartiles | any | | | ACS B25057 and B25059 are contract rent quartiles (rent without utilities), not gross; the 2024 variables exist on [api.census.gov](https://api.census.gov/data/2024/acs/acs1/variables/B25059_001MA.html) but no data query was reachable | Not found | A gross rent range would need B25063 (the rent distribution) or PUMS |
| Rent by age of householder | any | | | ACS PUMS (age by gross rent); no published table | Not found | Needed to make rent an age prior, not only a place prior |

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
| Net worth percentiles | all | 25th $27,900; median $215,900; 75th $812,800; 90th $2,539,200 | [SCF 2025 report, scf26.pdf](https://www.federalreserve.gov/publications/files/scf26.pdf), Table A.2 (p. 48); the median from the press release | Primary (batch 39) | The one row with real percentiles: low = 25th, high = 75th. Used only with no age (the age rows have medians only) |
| Has a retirement account; median among holders | all | 54.9%; $106,000 | [SCF 2025 report, scf26.pdf](https://www.federalreserve.gov/publications/files/scf26.pdf), Table 3 (p. 15), retirement accounts | Primary (batch 39) | Two parts: the chance of any, then the range if any. All ages only |
| Has a vehicle loan; median among holders | all | 32.1%; $17,000 | same, Table 4 (p. 25), vehicle loans | Primary (batch 39) | Not in the data file yet (no typical note for car loans) |
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
| Card, vehicle and education debt by age; transaction accounts and retirement by age | each band | not read | Batch 39 confirmed the report gives Tables 3 and 4 for all families only (age groups only in Tables 1 and 2) and found the tables' home: the [SCF index](https://federalreserve.gov/econres/scfindex.htm) links the historical tables (scf2025_tables_public_real_historical.xlsx), the Data Interactive and its CSV (dataviz/download/zips/scf.zip) and the summary extract (scfp2025excel.zip) | Not reachable: the xlsx, the Data Interactive table page and the zips were refused (WebFetch permission step; the shell proxy refuses federalreserve.gov), and the chart page renders only with JavaScript. Batch 54: the table page now opens but is JavaScript only ("Table is loading"); the report's HTML page holds only the PDF link; no FRED series carries the SCF by age | The main gap: one look at the historical tables' age rows, or SLAM's own run of the summary extract |
| Transaction accounts by age: median among holders and percentiles | under 35 | median $5,000; 25th $800; 75th $16,200 | [Richify, from the SCF 2025 public data](https://www.richify.ai/us/data/average-savings-by-age) (the page's own run of the percentiles) | Secondary, computed by a third party | Would replace the all-ages cash row once a Fed table confirms it |

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
| Federal student loans: average balance per borrower | 24 and younger | $14,315 (7.3 million borrowers) | [Student Loan Planner, citing the Federal Student Aid portfolio by age](https://www.studentloanplanner.com/student-loan-debt-by-generation/) | Secondary, quarter not stated; batch 54: the primary exists only as an xls ([portfolio-by-age.xls on data.ed.gov](https://data.ed.gov/dataset/fb615e1a-f95f-478d-bf7b-350fdf21133e/resource/a6eb7b27-4393-410d-8db0-fec02e70203f/download/portfolio-by-age.xls), listed on catalog.data.gov, whose page has no preview); not read | A mean among borrowers; the chance of any from the SCF (20% of families); range 0.5 to 1.5 of the mean until FSA balance bands are read |
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

Batch 24 read the 2025 SCF report (scf26.pdf) and the SHED emergency savings table. Batch 39 tried each gap again; the
shell's proxy refuses census.gov, api.census.gov, federalreserve.gov, bls.gov and fred.stlouisfed.org, so everything
was read with the web reader, which refuses a page it was not linked to unless someone approves it (no one could
tonight). The exact URLs that were tried and refused, or gave no figures:

- NY metro rent: `https://api.census.gov/data/2024/acs/acs1?get=NAME,B25064_001E,B25057_001E,B25058_001E,B25059_001E&for=state:36`
  (refused), `https://data.census.gov/table/ACSDT1Y2024.B25064?g=310XX00US35620` (refused),
  `https://censusreporter.org/profiles/31000US35620-new-york-newark-jersey-city-ny-nj-metro-area/` (read: ACS 2024 1-year,
  median household income $99,852, but no rent on the page), QuickFacts for New Jersey, New York city and the US csv
  (`https://www.census.gov/quickfacts/fact/table/NJ/POP010220`, `https://census.gov/quickfacts/fact/table/newyorkcitynewyork/PST120223`,
  `https://www.census.gov/quickfacts/fact/csv/US/HSG860224`: failed at the site). QuickFacts has no metro areas.
- SCF by age: `https://www.federalreserve.gov/econres/files/scf2025_tables_public_real_historical.xlsx` (refused),
  `https://www.federalreserve.gov/econres/scf/dataviz/scf/table/` (refused),
  `https://federalreserve.gov/econres/scf/dataviz/scf/chart/` (read: JavaScript only, no figures), the CSV
  `https://www.federalreserve.gov/econres/scf/dataviz/download/zips/scf.zip` and `scfp2025excel.zip` (shell refused).
- CE New York metro 2023-24: `https://fraser.stlouisfed.org//docs/releases/regNE/regNE_20260106_26-12-BOS.pdf` (refused);
  the 2022-23 release on bls.gov was read.
- Student loans by age (FSA portfolio by age): `https://studentaid.gov/data-center/student/portfolio` (refused); the
  xls is listed on [catalog.data.gov](https://catalog.data.gov/dataset/federal-student-loan-portfolio) (portfolio-by-age.xls), not read.
- Still from batch 24: www2.census.gov (P60-289 table1.xlsx, HINC-01 2026) for income by age.
- Batch 46: the CE 2024 all consumer units table: the permission step was not answered. Batch 54 read it (above).

## Batch 54 (2026-11-06, the second data pass)

The web reader opens a page that a web search returned; a link built by hand or followed from a page it read needs an
approval, and no one could give one tonight (each such URL below is marked "needs approval"). The shell's proxy still
refuses census.gov, federalreserve.gov, bls.gov and data.ed.gov.

| Target | Reached | Value | Source | What moved |
|---|---|---|---|---|
| NY metro median gross rent, ACS 1-year 2024 (B25064, CBSA 35620), and B25063 or B25057 | No | | `https://api.census.gov/data/2024/acs/acs1?get=NAME,B25064_001E&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:35620` (needs approval); [data.census.gov B25064](https://data.census.gov/table/ACSDT1Y2024.B25064) (JavaScript only); `http://api.census.gov/data/2024/acs/acs1/examples.json` (needs approval) | Nothing: a NY renter still reads New York State (QUESTIONS 335 stands) |
| SCF 2025 by age: transaction accounts, card balances, education loans, retirement accounts | No | | [SCF Data Interactive table](https://www.federalreserve.gov/econres/scf/dataviz/scf/table/) (JavaScript only); the historical tables `https://www.federalreserve.gov/econres/files/scf2025_tables_public_real_historical.xlsx` and the CSV `https://www.federalreserve.gov/econres/scf/dataviz/download/zips/scf.zip` (files only) | Nothing: the Secondary rows above stay out of the data |
| CE 2024, all consumer units | Yes | total $78,535 (2023: $77,158); the categories in the CE table above | [BLS, Consumer Expenditures in 2024, Table A](https://www.bls.gov/news.release/archives/cesan_12192025.htm); [FRED CXUTOTALEXPLB0101M](https://fred.stlouisfed.org/series/CXUTOTALEXPLB0101M) | Primary. Every age ratio (QUESTIONS 336, 380): 25 to 34 is 0.948 of all ages (was 0.991); a 28 year old living alone $3,461.92 a month (was $3,671.06) |
| CE New York metro 2023-24 | No | | [FRASER listing](https://fraser.stlouisfed.org/title/northeast-regional-news-releases-9694/consumer-expenditures-new-york-metropolitan-area-2023-24-718971) (released Jan 6 2026; the PDF `https://fraser.stlouisfed.org//docs/releases/regNE/regNE_20260106_26-12-BOS.pdf` needs approval) | Nothing (a cross-check only) |
| Federal student loans by age (FSA portfolio by age) | No | | the xls above (file only) | Nothing |

Tax and benefits (the source lines on Assumptions; data/reference-2026.json values):

| Target | Reached | Value | Source | What moved |
|---|---|---|---|---|
| New York EITC share | Yes | 30% | [Form IT-215 (2025), line 11](https://www.tax.ny.gov/pdf/2025/inc/it215_2025_fill_in.pdf): "New York State earned income credit (NYS EIC) rate 30% (.30)" | Source only (value already 30%) |
| NY OTDA SNAP standards for FFY 2027 (the 150% and 200% lines, utility allowances) | No | | [OTDA GIS list](https://otda.ny.gov/policy/gis) shows 2026 GIS to Feb 2026 only; [USDA FNS SUA page](https://www.fna.usda.gov/snap/eligibility/deduction/standard-utility-allowances) has only the FY 2026 xlsx | Nothing: the FFY 2026 GIS stands |
| New York Medicaid lines (138%, 154%, 223%) | Yes | 138% parents and caretakers, 154% children 1 to 18, 223% under 1 and pregnancy | [NY DOH GIS 26 MA/05 attachment 1](https://healthweb-back.health.ny.gov/health_care/medicaid/publications/docs/gis/26ma05_att1.pdf) (Rev. 02.05.2026, effective Jan 1 2026) | Source only |
| Child Health Plus (free to 222%; $15, $30, $45, $60 a child to 250%, 300%, 350%, 400%) | Yes | the same | [NYSOH Child Health Plus At a Glance, 2026](https://info.nystateofhealth.ny.gov/sites/default/files/Child%20Health%20Plus%20At%20a%20Glance%20-%202026%20English.pdf) (9/2025, on 2025 poverty lines: one person $34,743, $39,125, $46,950, $54,775, $62,600, which are 222%, 250%, 300%, 350%, 400% of $15,650) | Source only. The NYSOH "2026 Income Levels" PDF itself was not found |
| Fannie Mae student loan at 1% | Yes | 1% of the balance when the credit report shows no payment (deferred or in forbearance; or a fully amortizing payment) | [Selling Guide B3-6-05 (08/05/2026)](https://selling-guide.fanniemae.com/sel/b3-6-05/monthly-debt-obligations) | Source only |
| Fannie Mae three-year continuance | Yes | at least three years from the application date | [Selling Guide B3-3.1-01 (10/07/2026)](https://guide-selling.fanniemae.com/sel/b3-3.1-01/general-income-information) | Source only |
| HUD 4000.1 self-employment decline | No | | [HUD 4000.1 page](https://www.hud.gov/hud-partners/single-family-handbook-4000-1); the attachment read (2020-31, the defect taxonomy) has no decline rule | Nothing (still the lender summaries) |
| Marketplace benchmark, 2027 (QUESTIONS 395) | Yes | US $703 a month (2026: $625); New York $1,041 (2026: $817) | [KFF, Marketplace Average Benchmark Premiums, 2027](https://www.kff.org/affordable-care-act/state-indicator/marketplace-average-benchmark-premiums/) | Every state's benchmark; Lena and Marco's help $16,399.20 (was $11,023.20) |

## Next steps

Batch 54 left these for one approved look (each URL is in the table above).

1. One approved look at the SCF historical tables (or a run of the summary extract): the by-age rows for transaction
   accounts, cards, student loans and retirement, with their percentiles; then cash, cards and loans read by age.
2. One approved look at ACS B25064 for CBSA 35620 (data.census.gov or the Census API): the NY metro rent row, then a
   NY renter reads the metro, not the state; B25063 for a gross rent range.
3. Verify the rows still Secondary (the Census age medians, ACS 1-year rent) once www2.census.gov can be read; replace
   the CE spreads with microdata percentiles.
4. Add the CE rows by income quintile (conditioning on take-home).
5. Write each as a `data/priors/*.json` file with its source, year and asOf, registered in `REFERENCE_FILES`.
