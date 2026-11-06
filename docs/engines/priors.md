# Engine spec: priors (a plan from an age)

Status: design, Batch 17. Phase 4, Track 1 (ROADMAP.md). Batch 31 built the groundwork: `data/priors-2026.json` (the
Primary rows only), `js/math/priors.js` (M9E: the range by age band, the far-outside check, the shares), the faded
typical range in a blank core box (coach view) and the one-line note under a typed total far outside typical
(`js/ui/typical-ui.js`, one hook in moneyInput). No row publishes percentiles yet, so every range is the stated
spread (RULES typicalLow 0.6, typicalHigh 1.5) around the median (SCF) or mean (CE). Batch 39 (the data pass) added
the closest-row pick (a place row, then the household type, then the age band): a person living alone reads the CE
one-person row, NY spending scales by the NY metro's BEA price parity (QUESTIONS 210), rent is the ACS median gross
rent (New York State for NY renters until the metro figure is read, a share divided by the people splitting it), and
a row that gives its 25th and 75th percentiles uses them (only net worth for all ages so far). Conditioning on
income and category sums are not built. Batch 46 built the age-only start (`js/math/agestart.js`, M9A; see "The
age-only start" below).

## Purpose

Give every number a household has not answered a typical range for someone like them, so the plan exists from the
first answer (an age) and every later answer narrows it. A prior is never the client's number: it is a Gut answer
with a source, shown faded, and it never counts toward the certainty meter as known.

## Inputs

| Input | Where it comes from | Effect on the prior |
|---|---|---|
| Age (or birth year) | Home › About you | Picks the age band. The one input every prior needs |
| Household type | About you: just me, couple, roommates, with family, kids count | Picks the household row where a table has it (CE by composition, SCF by family type) or scales by household size |
| Place | State on About you, later ZIP | Scales spending and rent by a cost-of-living index (NY first) |
| Work situation | About you: a job, self-employed, between jobs, student, mixed | Picks income shape and stability (wider range for self-employed or mixed) |
| Housing | Rent, own, roommates, with family | Picks rent or mortgage row; with family drops housing to near zero |
| Any answered number | Every field with a level | Conditions the other priors (see "How a range narrows") |

## Outputs

For each prior-able field: `{ field, low, likely, high, band, householdRow, source, year, level: 'Gut', basis }`, in the
field's own unit (monthly dollars for spending and take-home, a balance for accounts and debts, a rate for APRs, a
share for "has any"). `basis` says in one line what the range is ("typical for 25 to 34, one person, NY, renting").
A prior with no row for the case says so and is left blank (empty is not zero).

## Reference tables needed

One file per source, under `data/priors/`, each with its source, year, link and how the range was made
(`docs/engines/priors-sources.md` has the draft numbers). Each table is keyed by age band and, where it has it,
household type:

1. **Income** (CPS ASEC household income by age of householder: 25th, median, 75th): take-home is derived by SLAM's
   own tax math (M12) from the gross range, not looked up.
2. **Spending by category** (BLS Consumer Expenditure Survey by age of reference person, and by composition of
   consumer unit): food at home, food away, shelter, rent, utilities, transportation, health care, entertainment,
   apparel, insurance and pensions. CE publishes means, so the range is made with a stated spread (below).
3. **Rent** (ACS median gross rent, national and by state or metro).
4. **Has any and how much** for debts and balances (Federal Reserve SCF by age of head: share holding, median among
   holders, percentiles where computed): transaction accounts, retirement accounts, credit card balances, education
   loans, vehicle loans, total debt, net worth.
5. **Emergency savings** (Fed SHED by age: could cover $400 with cash, has three months saved).
6. **Credit card APR** (Fed G.19, already in reference-2026.json as typicalRates).
7. **Student loans** (Federal Student Aid portfolio by age: borrowers and balance per borrower).
8. **Cost of living** (a published index by state and metro, or the older suite's 40-city index once verified).

## How ranges by age work, in plain words

1. **Pick the row.** Age band first (under 25, 25 to 34, 35 to 44, 45 to 54, 55 to 64, 65 to 74, 75 and over; the
   tables' own bands, mapped once). Household type second when the table has it. A table with no row for the case
   falls back to all ages with a wider range and says so.
2. **Make the range.** Where the source publishes percentiles, low is the 25th and high the 75th. Where it publishes a
   mean only (CE), likely is the mean scaled to a median by a stated factor and low and high are a stated spread
   (start at 0.6 and 1.5 of likely, to be replaced by microdata percentiles when computed). Where the source gives a
   share holding (SCF), the prior has two parts: the chance of having any, and the range if you do. For a share under
   50% the likely value is 0 with the range shown as "if you have one".
3. **Scale for place.** Spending and rent multiply by the cost-of-living index for the state (later the metro); income
   multiplies by the state's median income ratio. Both scales are their own table with a source.
4. **Scale for household size.** Where the table has no household split, scale by the square root of household size
   (the OECD equivalence convention), stated in the basis line.
5. **Express it in SLAM's units.** Annual figures become monthly with M01; a balance stays a balance.

## How a range narrows as fields are filled

A prior is replaced, never averaged, once the client answers that field. Other priors narrow in three ways:

1. **The field itself.** A typed number replaces the prior at its level: Gut (a range the client gives, or a tap on
   "about typical"), Rough (a number, plus or minus the Rough width from ranges.md), Know it (the number).
2. **Conditioning on what is known.** Some priors depend on others. Spending is conditioned on take-home: once
   take-home is in, the spending prior becomes the CE row for that income band (CE by income quintile), not the age
   row. Debts are conditioned on "has any" taps: a "no card debt" tap sets the card prior to 0, Know it. Retirement
   balance is conditioned on years worked and income once those are in (a simple stated rule: share of income saved
   times years, bounded by the SCF range).
3. **Category sums.** Once a gut total for spending is in, category priors are rescaled so they add to it (the shape
   from CE, the total from the client), each still Gut.

## Confidence levels and SLAM's Gut, Rough, Know it

| Source of the value | SLAM level | Points (program.js LEVELS) | Range width (ranges.md) |
|---|---|---|---|
| Prior (typical for age) | Gut, faded, "Typical at your age" | 0 toward the meter (Missing) until the client taps Use, then Gut 25 | The table's 25th to 75th |
| Client's gut range or "about typical" tap | Gut | 25 | The client's range, or the prior's |
| A rough number (Roughly) | Rough | 50 | Plus or minus 20% (from the older suite's weights, to be tuned) |
| Computed from known parts | Estimate | 75 | Propagated from its parts |
| Know it (a statement, a paystub, Lock it) | Actual | 100 | Plus or minus 2% (balances move), 0 for fixed facts |

A prior never raises the certainty meter by itself. The meter rises when the client answers, because the answer
narrows the range.

## How it plugs into SLAM

- **Faded starter amounts** already exist (batch 10: faded typical amounts with a Use button). Priors become their
  source: the faded number is the prior's likely value, the hover tip shows the range and the basis line.
- **Fast Track** opens on age; every Fast Track box shows its prior faded.
- **The Picture % and its next small things** keep working; the certainty meter (ranges.md) sits above it.
- **Registry.** Each table is reference data with a source and a date (`REFERENCE_FILES` in
  `js/registry/assumptions.js`); each prior-able field names its table in `js/registry/fields.js` (a new `prior` key).
  The math lives in `js/math/priors.js` and is registered in `js/registry/math.js` with `fromApp` and a reason.

## Test households

1. **Age only, 27, single, NY, renting** (Alexis before any number): every key output has a range, all labeled.
2. **Maya** with age and take-home only: spending prior switches from the age row to the income row.
3. **Tom** with everything known: no prior shows anywhere; the meter is unchanged by the priors code.
4. **A couple, 31 and 34, one income**: household row used where the table has it, scaled where not.
5. **A 23-year-old student living with family**: housing near zero, income range wide, card prior conditioned on
   "has a card".
6. **A 52-year-old self-employed homeowner** (outside the main client age): the 45 to 54 row, a wider income range.

## Build order

1. The tables as data files with sources (from priors-sources.md, each figure verified or marked).
2. `js/math/priors.js`: row pick, range make, place and size scaling, with tests on the tables alone.
3. Conditioning rules (spending on income, debts on has-any, category sums), with tests.
4. The faded starter amounts read the priors; Fast Track starts from age.
5. ranges.md's propagation consumes the priors; the certainty meter.

## The age-only start (Batch 46, M9A)

What a brand-new client with only an age sees, on Home and at the top of Fast Track: the FI date, the debt-free date,
emergency fund months and the monthly surplus, each a range, labeled "Typical for 25 to 34 year olds living alone in
New York" (the CE age band, living alone for Solo, and the place where a Primary row scales it, else "the US"), with
one line saying these are not their numbers yet and the next Fast Track question. Coach view always; client view only
with Typical at your age on (QUESTIONS 208), otherwise the client sees the questions.

1. **One rule for an all-ages row read at an age: the age band's ratio to all ages** (QUESTIONS 336). The CE
   one-person row is scaled by the band's CE figure over the all-ages figure (per category where both tables have it;
   shelter and utilities, not in the all-ages Table A, use the totals). Batch 54: the all-ages rows are the BLS 2024
   all consumer units table ($78,535 total), so the ratio is the same year as the age bands (QUESTIONS 380 closed; it
   was the 2022-23 $75,172, about 4% high). `data.shapes` names what shapes the rows with no age split: income and cash like CE
   spending (by age, and by living alone), retirement like SCF net worth by age.
2. **Pay.** The Census median household income ($87,460, 2025, all households) shaped like spending, gross, through
   SLAM's tax math (M12). A place scales it by the same price parity as spending until a Primary place income row is
   read (QUESTIONS 381).
3. **All households' range when only a share has any** (`priorFill`). An SCF row is among holders (44.7% carry a
   card balance, 54.9% hold a retirement account). A household's place p among all households is the holders' place
   1 - (1 - p) / share, $0 below it. So cards are $0 at the 25th and the middle and about $2,800 at the 75th; student
   loans (20%) are $0 throughout and stay out; retirement is $0 at the 25th. This replaces "for a share under 50% the
   likely value is 0" above with the same idea made exact.
4. **Pay and spending move together** while both are typical (people who earn more spend more): one knob moves both
   from low to high, and the share of pay spent moves PriorSpendShare (25%) either way. Once one is answered the
   other stays at its typical amount and moves PriorSpendShare: never wider than before, and wider than a gut
   spending number (15%), so a gut answer still narrows the plan.
5. **The run.** The typical amounts fill a copy of the household that is never saved and never counts toward the
   Picture %; each is a knob at its own low and high, and the ranges method (M9R) combines them. A likely FI date
   that never comes on typical numbers still shows its soonest end ("2053 or later").

What narrows: for Maya (28, living alone in New York) the surplus range goes from $2,100 wide (age only) to $2,070
(take-home), $1,060 (a gut spending number); the emergency fund from 1.9 months wide to 0.5 once checking and savings
are in; the FI date gets both ends once pay and spending are answered (2044 to 2056). An answer can move a range
rather than narrow it when it is far from typical (a take-home well under typical spending pushes the debt-free date
out); test/batch46.test.js checks the narrowing for Maya and Tom.

Not built yet: spending by income (CE by income quintile), rent as its own prior on Home (CE spending already holds
shelter), housing with family near zero, the self-employed's wider income range.
