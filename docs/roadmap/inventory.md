# Inventory: the older suite against SLAM

Every room, tool, engine and data file in the older suite (the public repo `Sapphirestoneage/personalfinance`, read
on 2026-11-05), one line each: what it does, whether SLAM already has it, and a call. Grouped by the SLAM area it
would live in. Read-only reference: nothing in that repo is changed, and nothing here is built yet.

**The calls.** **Port Pn**: bring the idea (rarely the code) into SLAM in phase n of `ROADMAP.md`. **Fold**: it
becomes a card, a reading or a field on a SLAM screen that already exists (named). **Drop**: SLAM already covers it,
or it does not fit a coach-run session. One reason each. Engines and data files usually follow the room they serve.

**How SLAM screens are named here.** Tab › sub-tab, as in `js/nav.js`: Home › Home, Home › About you; Net worth ›
Assets, Debt, Credit cards, Protection; Cash flow › Income, Taxes, Budget, Calendar, Month end; Plan › Goals, FOO,
Scorecard, Timeline, Debt payoff, Next 12 months, Current vs Proposed; Report › Overview, Statements, One-pager,
History; Coach tools › Lists, Session, Data, Discovery.

**Counts** (rows in the tables below): **Port 101** (Phase 4: 33, Phase 5: 31, Phase 6: 32, Phase 7: 5), **Fold 59, Drop 120**, 280 rows; some rows group a few files that share a call. The older suite's 99 room files are 38 live rooms and 61 redirect stubs (each stub is now a reading of a live room and is listed under its host). Recount: the fourth column of every table row.

## 1. Home, onboarding and the first picture

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/start.html (Start Here) | One-page intake: situation chips decide which questions show, every box starts with a guess | Fast Track, Home › About you, the intake form | Fold: Fast Track | The situation gating is the idea worth keeping; SLAM's gates hub already does it |
| rooms/ledger.html (The Ledger) | Every number in one row each, six doors (DAITE), four levels per door, Round 1 opening | Coach tools › Data, the Picture % by section | Fold: Home › Home | The "which door next, with the reason" line becomes the Ask me next card (Phase 4) |
| rooms/first-round.html | Stub to Ledger Round 1: five questions to a first card | Fast Track | Drop | Fast Track is the five-question start |
| rooms/express.html | Stub to the Ledger's all-at-once door | One page toggle | Drop | SLAM's One page shows every section |
| rooms/walk.html | Stub to the Ledger's short route | The program path on Home | Drop | The 12-session path is the route |
| rooms/doors.html | Stub to twenty arrangements of the rooms | One nav | Drop | Twenty layouts was the old suite's sprawl; SLAM has one |
| rooms/comeback.html, rooms/refresh.html | Stubs to Since Last Time: what moved since the last visit | Home's Day 0 vs now, the review gate | Fold: Home › Review | "Earned vs learned" split (engines/sincelast.js) is a good line for the review gate |
| index.html (The Dashboard) | Six instruments, the next action, the date it points to | Home › Home | Drop | Home is SLAM's dashboard |
| rooms/dashboard.html | Stub to the site root | Home | Drop | A stub |
| engines/opening.js | Five inputs to an FI date band (3%, 5%, 7% real), coast date, savings rate, stage, top three levers | Plan › Goals FI card, These are big deals | Port P4 | The prior art for age-only start and the range on the FI date (docs/engines/priors.md) |
| engines/notknowing.js | The cost of not knowing: each blank's swing on the insight it feeds, across a plausible range | Picture % next small things (by level, not by swing) | Port P4 | This is Ask me next: rank questions by how much they narrow the plan (docs/engines/next-best.md) |
| shared/doors.js (shared module) | Which door to open next and why: the most expensive unknown | Picture % next small things | Port P4 | Same as above, in plain words |
| shared/suggest.js (shared module) | A suggested value is shown, never stored or counted | Faded starter amounts, Use buttons | Drop | SLAM already does this (Guess never counts) |
| engines/gap.js | The monthly gap refined level by level | Surplus on Home and Budget | Drop | One surplus already lives in js/math/metrics.js |
| engines/tier0.js | Nine core outputs: net worth, savings rate, years to FI, DTI and more | js/math/metrics.js, fi.js | Drop | SLAM's math covers each |
| engines/journey.js | The road map: where you are, routes to the finish | Home's program path | Fold: Home › Home | The four paces (data/journey_routes.json) can feed the certainty meter's what-if |
| data/opening.json | Opening's assumptions: 3.5% withdrawal, 3/5/7% real returns, stages | reference-2026.json presets | Fold: Plan › Goals | SLAM already has return and withdrawal presets; the stage thresholds are new |
| data/plausible_ranges.json | Low and high for each commonly blank row (BLS, SCF, CPS, G.19), marked unverified | none | Port P4 | Seed of the priors tables; to be replaced by sourced percentiles (docs/engines/priors-sources.md) |
| data/confidence_weights.json | How much a row counts toward "understood" by state (sure 1, roughly 0.85, suggested 0.5) | program.js LEVELS (Gut 25 to Actual 100) | Drop | SLAM's levels are the same idea, already in the Picture % |
| data/sketch_help.json | Band 1 questions in plain words with three ways out | Fast Track words | Drop | SLAM's copy covers it |
| data/levels.json | Solar System levels, card fields per level | program.js | Drop | SLAM's program replaces it |
| data/defaults.json | Global projection assumptions with levels | reference-2026.json presets | Fold: Plan › Current vs Proposed | The go-go/slow-go/no-go defaults are wanted in Phase 5 |
| data/staleness.json | How fast each figure goes stale | js/checks.js (30 and 90 days) | Drop | SLAM's checks already do it |
| data/onepager_defaults.json | Starting guesses for the one-page intake (median wage and so on), unverified | Faded typical amounts | Fold: Fast Track | Replace with the priors tables in Phase 4 |
| data/spheres.json, data/moons.json, data/moves.json, data/recipes.json, data/layouts.json | Solar System framing: nine spheres, moons, moves, readings, twenty layouts | none | Drop | Framing devices, not features a coach needs on a call |
| engines/recipes.js, engines/layouts.js | The Solar System readings and the twenty arrangements | none | Drop | As above |
| data/ledger-rows.json | Every number, its owner, path and level | js/registry/fields.js | Drop | SLAM's field registry is the same thing |
| data/features.json | Feature switches for beginners | The What applies to me switches | Drop | SLAM has gates |
| data/walk_stages.json | The order every mainstream sequence agrees on | FOO | Drop | SLAM's FOO is the order |

## 2. Income and work

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/income.html (Income) | Pay logged as it lands, taxed by type; pay-yourself salary for uneven pay; real hourly wage | Cash flow › Income (take-home or gross, variable income block) | Fold: Cash flow › Income | Income by type (cash, tips, platforms) is Real lives wave 1 |
| rooms/variable-income.html | Stub: low month, high month, average, the salary to pay yourself | Variable income block | Drop | SLAM has it |
| rooms/hassle.html | Stub: Worth the hassle, dollars saved against hours | none | Fold: Coach tools › Lists | A one-line check, not a screen |
| rooms/real-hourly-wage.html | Stub: what the job pays an hour after commute and costs | Money as time ($ / Hours / FI days) | Fold: Cash flow › Income | Real hourly wage makes the Hours view honest |
| rooms/timeline.html | Stub: What Comes Next, income with a start and an end | Income gaps, Timeline | Fold: Plan › Timeline | Future jobs with dates belong on the timeline |
| rooms/career-move.html (Work) | This offer against yours, offers side by side, a second job, going solo, a course, a break | none | Port P6 | Career decisions are a next-stages tool |
| rooms/offer-compare.html | Stub: two to four offers side by side | none | Port P6 | With Work |
| rooms/side-hustle.html | Stub: a second job's net after tax and time | none | Port P4 | Side income is common for SLAM clients; feeds income by type |
| rooms/self-employed.html | Stub: on your own, W-2 vs 1099, quarterly estimates | Taxes: quarterly and SE tax for 1099 | Drop | SLAM covers SE tax and quarterlies |
| rooms/credential.html, rooms/degree.html | Stubs: is a course or degree worth it, payback and lifetime value | none | Port P6 | Learning decisions pair with the library's skill path |
| rooms/micro-retirement.html | Stub: a break, priced | none | Port P6 | Sabbaticals are next stages |
| rooms/between-jobs.html | Stub: runway against the job search | Unemployment and runway when between jobs | Drop | SLAM has it |
| engines/income.js | How you are paid, turned into a year | js/math/income.js | Drop | Covered |
| engines/ledger.js | Tax on dated income, the month it adds up to | Income rows | Drop | Covered |
| engines/variableincome.js | Low, high, average month | Variable income block | Drop | Covered |
| engines/hourly.js | Real hourly wage, life energy | Hours view | Fold: Cash flow › Income | As above |
| engines/careermove.js, engines/offers.js | Offer against current job; offers side by side | none | Port P6 | With Work |
| engines/sidehustle.js | Side income net of tax, time and costs | none | Port P4 | With income by type |
| engines/selfemployed.js | SE tax, W-2 vs 1099, quarterlies | Taxes | Drop | Covered |
| engines/credential.js, engines/degree.js | One ROI engine for courses and degrees | none | Port P6 | With Work |
| engines/microretirement.js | A break priced | none | Port P6 | Next stages |
| engines/betweenjobs.js | Runway against the search | Runway | Drop | Covered |
| engines/hassle.js | Return on hassle | none | Fold: Coach tools › Lists | One line |
| engines/timeline.js | A life laid out in months, jobs with start and end dates, stacked | Plan › Timeline | Port P5 | The year-by-year engine reads dated income from here (docs/engines/projection.md) |
| data/variable_income_conventions.json | Pay-yourself conventions for uneven income | Variable income block | Drop | Covered |
| data/hassle_defaults.json | Chores with a time cost and a rating | none | Fold: Coach tools › Lists | With hassle |
| data/career_momentum.json | What a career gap costs in later pay (PayScale 2018), unverified | none | Port P6 | Needed by the break calculator |
| data/reentry_gap.json | Unemployment spell lengths (CPS), unverified | Runway words | Port P4 | Feeds the job-loss fund prior and the bank closure drill |
| data/ui_benefits.json | State unemployment maximum weekly benefit and weeks | Unemployment estimate | Fold: Cash flow › Income | Verify against each state and keep NY first |

## 3. Taxes

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/tax.html (Tax) | Federal, state and payroll tax, effective and marginal rate, room in the bracket, refund or bill, the cliff | Cash flow › Taxes | Port P5 | The full tax engine in named steps is Phase 5's tax depth (see named-tools.md) |
| engines/tax.js | Ordinary tax, stacked capital gains, FICA, SE tax, state, ACA cliff, estimate() | js/math (federal, NY, NYC brackets) | Port P5 | Port the step functions, not the shapes: one tax function the projection calls each year |
| engines/taxroom.js | The Tax room's year: wages vs SE split, pre-tax share, refund, shares of a dollar | Cash flow › Taxes | Fold: Cash flow › Taxes | The "shares of a dollar" bar is a good visual for Taxes |
| engines/cliff.js | Benefits cliff: which lines a raise crosses (SNAP, Medicaid, ACA) | none | Port P4 | Clients near the lines need this before a raise (Real lives wave 1) |
| engines/rothaca.js | Roth conversions against the ACA cliff, a range under two rules | none | Port P5 | Roth conversion depth |
| engines/accounts.js | Where the money should go and how much fits, shared tax machinery | FOO, contribution limits | Drop | The FOO and limits cover it |
| rooms/which-account.html | Roth, Traditional or taxable on equal pre-tax cost; the deciding bracket; Solo 401(k) | FOO step 5 notes | Port P5 | Roth vs Traditional needs the projection's later bracket |
| rooms/accounts.html | Stub to Which Account | none | Port P5 | With Which Account |
| data/federal_brackets_2026.json | 2026 brackets and standard deduction, unverified | reference-2026.json (checked Oct 28) | Drop | SLAM's copy is newer and checked |
| data/effective_tax_rates_2026.json | Blended income tax plus FICA by gross band | none | Drop | SLAM computes from brackets |
| data/state_brackets_2026.json | Every state: none, flat or graduated (2025 Tax Foundation shape), unverified | NY and NYC only | Port P5 | Clients outside NY; needs verifying |
| data/se_tax_2026.json | SE tax mechanics, wage base, safe harbor, quarterly dates | reference-2026.json | Fold: Cash flow › Taxes | Check the wage base and quarterly dates are all in |
| data/aca_2026.json | FPL, applicable percentages, the 400% cliff, unverified | none | Port P5 | ACA depth |
| data/benefit_cliffs_2026.json | SNAP, Medicaid and other lines by FPL multiple | none | Port P4 | With the cliff engine |
| data/irs_limits_2026.json | Contribution limits | reference-2026.json limits | Drop | SLAM's are checked |
| data/lane2/tax_brackets.json, data/lane2/contribution_limits.json, data/lane2/aca.json | Lane 2 working copies of the same tables | reference-2026.json | Drop | Duplicates |

## 4. Budget, spending, calendar and month end

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/expenses.html (Expenses) | What a month costs, the lean month, bring a statement in, subscriptions | Cash flow › Budget (five passes), Bills and subscriptions | Drop | SLAM's Budget covers it |
| rooms/subscriptions.html | Stub: finds repeating charges in the log | Bills and subscriptions | Drop | Covered |
| rooms/cash-flow.html (The Month) | Receipts on their dates, where it flows, paydays against bills, the low point | Cash flow › Calendar, cash layers | Drop | Covered |
| rooms/calendar.html (The Calendar) | Next 31 days with paydays, bills and your own dates | Cash flow › Calendar | Drop | Covered |
| rooms/budget.html (The Close) | Five buckets, estimated against actual, close the month, every closed month | Cash flow › Month end | Drop | Covered |
| rooms/history.html, rooms/variance.html | Stubs: snapshots over time; estimated vs actual month over month | Report › History | Fold: Report › History | Month-over-month variance by bucket is not on History yet |
| rooms/cant-pay.html | A short month: which bill to protect first, who helps for free | none | Port P4 | Clients starting below zero need this on day one (pairs with the bank closure drill) |
| rooms/statement.html (The Statement) | Net worth counting only what you are sure of, pay still to come, the liquidity ladder | Report › Statements, Assets (how fast you can reach it) | Fold: Report › Statements | Confidence-weighted net worth is one toggle |
| rooms/the-documents.html | A household's three statements and the period in sentences | Report › Statements (tie-out) | Drop | SLAM built this in Phase 3.5 |
| rooms/statements.html | Stub to The Documents | Report › Statements | Drop | Covered |
| engines/cashflow.js | Categorised income minus expenses | js/math/spending.js | Drop | Covered |
| engines/budget.js, engines/variance.js | The reflected budget and closed months read back | Month end | Drop | Covered |
| engines/calendar.js | The month's calendar | js/math/calendar.js | Drop | Covered |
| engines/subscriptions.js, engines/merchants.js | Subscription finder; unique lines and the slope | Bills and subscriptions, CSV import | Fold: Cash flow › Budget | Merchant grouping helps the CSV import |
| engines/bankcsv.js | Bank CSV import on device | CSV statement upload (overnight J) | Drop | Covered; PDF is Phase 7 |
| engines/statement.js | Balance-sheet questions: weighted net worth, the ladder, the bridge to 59½, worst year | Statements, Assets | Fold: Report › Statements | The bridge gap moves to the projection (Phase 5) |
| engines/statements.js | Three statements and the year in review | js/math/statements.js | Drop | Covered |
| engines/draftt.js | DRAFTT shares against bands | Income visuals panel (DRAFTT) | Drop | Covered |
| engines/presets.js | Savings and investment presets stacked into buckets | Budget starter lines | Drop | Covered |
| data/bands.json | DRAFTT bands by source (Eli's, Set for Life, Money Guy, 50/30/20) | DRAFTT | Fold: Cash flow › Income | Whose band is the useful part: a source picker |
| data/expense_categories.json, data/budget_templates.json, data/common_costs.json | Categories, frameworks, twenty everyday costs (BLS-shaped, unverified) | Budget categories, spending presets | Fold: Cash flow › Budget | common_costs is replaced by sourced CE priors (Phase 4) |
| data/bill_triage.json | Which bill to protect first by consequence | none | Port P4 | With Can't Pay |
| data/calendar_conventions.json | Paydays a year by cycle, billing conventions | LISTS.perYear | Drop | Covered |
| data/import_keywords.json | Words that place a pasted line | Quick add, CSV import | Fold: Cash flow › Budget | Widen quick add's matching |
| data/ledger-rows.where.json (lane2) | Where each row lives | fields.js livesOn | Drop | Covered |
| data/savings_presets.json | Emergency fund targets and presets | Rule of 5, layers | Drop | SLAM's Rule of 5 replaces the 3 to 6 months convention |
| data/liquidity_benchmarks.json | Emergency fund coverage bands | Rule of 5 | Drop | Covered |
| data/col_index.json | Cost of living for 40 cities, unverified | none | Port P4 | Priors scale by place (docs/engines/priors.md) |
| data/zip_prefixes.json, data/states.json | ZIP to state; per-state columns (benchmark premium and more) | State on About you | Port P5 | Needed for state tax and ACA premiums |

## 5. Net worth: assets, accounts and investing

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/net-worth.html | Stub to The Statement | Report › Overview | Drop | Covered |
| rooms/the-mix.html | Target stocks, bonds, cash; the drift band; the mix in dollars | Assets (allocation, drift: js/math/portfolio.js) | Drop | Covered |
| rooms/left-behind.html | An old job's plan: four futures, the paperwork trap | none | Port P4 | Stranded money (Real lives wave 1) includes old 401(k)s |
| rooms/rollover.html | Stub to Left Behind | none | Port P4 | With Left Behind |
| rooms/windfall.html | Stub: a lump sum, all at once or spread | none | Port P6 | Windfalls and exits are the multimillionaire stage |
| engines/reachable.js | What you can reach in an emergency, the order to pull it, the cost of each dollar | Assets: how fast you can reach it | Fold: Net worth › Assets | Add the cost of pulling each dollar |
| engines/windfall.js | Lump sum vs DCA | none | Port P6 | With windfalls |
| engines/benchmarks.js | Wealth multiplier, PAW, five levels of wealth, human capital | Scorecard | Fold: Plan › Scorecard | PAW/UAW is on the spec's Phase 4 list already |
| engines/rankguess.js | Guess your percentile, then see it | none | Fold: Report › Overview | A gentle Phase 4 card using the priors tables |
| engines/ownership.js | What a place costs to own | none | Port P6 | Real estate portfolios |
| data/access_rules.json | How each account type can be reached | portfolio.js accessRule | Drop | Covered |
| data/net_worth_percentiles_scf_2022.json | SCF 2022 net worth percentiles by age | none | Port P4 | Update to SCF 2025 for the priors (docs/engines/priors-sources.md) |
| data/levels_of_wealth.json, data/wealth_multiplier.json, data/retirement_milestones.json | Five levels, what a dollar becomes by 65, savings multiples by age | none | Fold: Plan › Scorecard | Benchmarks by age are priors too |
| data/match_defaults.json | The most common match formula (Vanguard How America Saves 2025) | Match fields | Fold: Net worth › Assets | A one-tap default for match |
| data/return_bands.json | Real return percentiles (p25 2%, p50 5%, p75 8%) | presets.pace (6, 7, 8%) | Fold: Plan › Goals | Triple D needs one band table (Phase 5) |
| data/rollover_options.json | Four things to do with an old plan | none | Port P4 | With Left Behind |

## 6. Debt and credit

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/debt-payoff.html (Debt) | Every debt in payoff order, what another order costs, student-loan plans, the credit file | Net worth › Debt, Plan › Debt payoff, Credit cards credit health | Drop | SLAM covers order, methods and credit health |
| rooms/student-loans.html | Stub: three repayment plans side by side | Student loan fields (plan, PSLF) | Port P5 | Plan comparison needs income growth by year |
| rooms/credit.html | Stub: the credit file | Credit health | Drop | Covered |
| engines/debt.js | Payoff engine | js/math/debt.js | Drop | Covered |
| engines/studentloans.js | Plan comparison | none | Port P5 | With the projection |
| data/debt_rules.json | Payoff strategies and minimum conventions | RULES.cardMinimum, Avalanche, Snowball, Stress | Drop | Covered |
| data/student_loan_conventions.json, data/lane2/studentloans.json | Level, income-driven and graduated shapes | none | Port P5 | Verify against current federal rules first |
| data/credit_factors.json | FICO factor weights, FCRA periods | Credit health | Drop | Covered |
| data/mortgage_rates.json | Freddie Mac PMMS rate, unverified | none | Port P6 | With real estate |

## 7. Protection, estate and family

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/protection.html (Protection) | What a bad year costs, what stands behind you, three estate facts | Net worth › Protection | Drop | Covered |
| rooms/estate.html | Stub: estate basics, where it goes | none | Port P6 | Estate and legacy |
| rooms/runway.html (The Cushion) | How long you could not earn: plainly, while job hunting, by choice, the 3am amount | Rule of 5, runway when between jobs | Drop | SLAM's layers and runway cover it |
| engines/runway.js | Runway, three exits | Layers, runway | Drop | Covered |
| rooms/sleep-at-night.html | Stub: the SWAN number | Rule of 5 layers | Drop | Covered |
| rooms/partner.html (Family) | Two incomes, the shared month split three ways, children's cost a year | Couples split, kids gate | Fold: Home › About you | The three split rules exist; children's cost is Phase 6 |
| rooms/kids.html | Stub: kids and tuition | none | Port P6 | Kids' college |
| engines/protection.js | Coverage checkup | Protection | Drop | Covered |
| engines/estate.js | Estate basics | none | Port P6 | Estate and legacy |
| engines/swan.js | The SWAN number | Layers | Drop | Covered |
| engines/partner.js | Two incomes, one month | js/couples.js | Drop | Covered |
| engines/kids.js | Kids and tuition | none | Port P6 | College |
| engines/giving.js | A share of income given | FOO 5b Give | Drop | Covered |
| data/protection_conventions.json | Disability at 60%, term life multiples | Protection's usual list | Drop | Covered |
| data/estate_basics.json | How property passes | none | Port P6 | Estate |
| data/partner_conventions.json | Three ways couples split | couples registry | Drop | Covered |
| data/child_cost.json, data/childcare_by_state.json | USDA child cost, childcare by state, unverified | none | Port P6 | Family building and college |
| data/giving_conventions.json | Common giving shares | Give step | Drop | Covered |
| data/cobra_aca_2024.json | KFF premiums, COBRA | Health coverage fields | Port P4 | Bank closure and job-loss drills need COBRA |
| data/health_score.json | Composite health score weights | Scorecard | Drop | SLAM's Scorecard replaced the invented score |
| engines/health.js | Financial health score | Scorecard | Drop | Covered |

## 8. Plan: the FOO and the next dollar

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/foo-ladder.html | The next $100, every month, a lump sum, the same order | Plan › FOO | Fold: Plan › FOO | The three amounts (next $100, monthly, lump) are one toggle |
| rooms/next-hundred.html | Stub: your next $100 ranked by return | FOO | Port P4 | The next-dollar score (docs/engines/next-best.md) |
| foo-ladder.js (root file) | The original FOO ladder script | FOO | Drop | Superseded |
| engines/foo.js | FOO placement and flags | js/math/foo.js | Drop | Covered |
| engines/next100.js | One list, one scale: the return each place earns on the next $100 | none | Port P4 | Source of the next-dollar scoring |
| data/foo_rules.json | The Money Guy FOO as specified | js/registry/foo.js | Drop | SLAM has its own FOO |
| data/levers.json | Every what-if lever with its size | These are big deals | Port P4 | Levers feed Ask me next and the certainty meter |
| engines/advicerules.js, data/advice.json | Does a popular rule apply to you now | none | Fold: Plan › FOO | One line per step: "you can let go of X now" (the unlearn half of the library) |
| engines/unlearning.js, data/unlearning.json | Advice sorted by FOO step: applies, stop believing, not yet | none | Port P4 | The unlearn order beside the FOO (docs/engines/library.md) |
| rooms/unlearning.html | Stub to The Referee's still-applies reading | none | Port P4 | As above |
| engines/advice.js, data/advice_translator.json | The advice translator | none | Fold: Plan › FOO | Same source as unlearning; one list |
| rooms/debates.html (The Referee) | Money debates, both sides, run on your numbers | none | Port P6 | Useful later, not for a first session |
| engines/debates.js, data/debates.json | Debates as data | none | Port P6 | With The Referee |
| data/lenses.json, data/benchmarks.json | Thirty-three readings of the same numbers, voices as sources | DRAFTT sources | Drop | Too many lenses for a live call |

## 9. Plan: FI, retirement and coming down

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/fire.html (The Number) | Six FI numbers, Enough, the coast date, the rungs, the lab; owns the stop age and the coast age | Plan › Goals FI card (FI number, FI date, Coast FI, Fat FI, safer rate line) | Port P5 | The two ages (stop age, coast age) are half of the dual-age view (named-tools.md) |
| rooms/fire-lab.html | Stub: every FIRE calculation drawn | FI card | Drop | SLAM's card is enough |
| rooms/coast-date.html | Stub: the coast date | Coast FI (FOO step 6) | Drop | Covered |
| rooms/enough.html | Stub: Enough as the denominator | Fat FI, joy | Fold: Plan › Goals | "The figure you would live on by choice" is one line on the FI card |
| rooms/race.html | Stub: the rungs to $100K | Ladder (M75) | Drop | Covered |
| rooms/bridge.html (The Bridge) | Years between work becoming optional and 59½, how short, every source that reaches | none | Port P5 | The dual-age retirement view (named-tools.md) |
| rooms/decumulation.html (The Back Half) | The draw and how long it lasts, what you can reach, before 59½, the price of cover | none | Port P5 | Decumulation, the trap test and Roth vs ACA |
| rooms/middle-class-trap.html, rooms/reachable.html, rooms/roth-aca.html | Stubs to The Back Half's readings | none | Port P5 | With The Back Half |
| engines/fire.js | One FIRE function by variant | js/math/fi.js | Drop | Covered |
| engines/coast.js | Coast date, a monthly walk | fi.js coastFi | Drop | Covered |
| engines/enough.js | Enough | none | Fold: Plan › Goals | One line |
| engines/race.js | Race to $100K | Ladder | Drop | Covered |
| engines/countdown.js | One goal countdown with a range across bands | Goals solvers | Fold: Plan › Goals | Its range across the bands is the ranges.md method for goals |
| engines/trap.js | Middle Class Trap: four paths from the stop age to 59½ (bridge, ladder, 72(t), Rule of 55), year by year, Triple D | none | Port P5 | The heart of the dual-age view |
| engines/decumulation.js | Draw, withdrawal rate, VPW, years until empty | none | Port P5 | Decumulation |
| engines/vpw.js, data/vpw_table.json | Variable percentage withdrawal | none | Port P5 | A flexible draw rule |
| engines/ss.js, data/ss_bend_points_2026.json | Social Security from the bend points | none | Port P5 | Social Security |
| engines/projection.js | Compound growth with contributions, years until empty | fi.js fiDate | Port P5 | Replaced by the year-by-year engine |
| data/early_access_rules_2026.json | 72(t), Rule of 55, seasoning, SEPP, life expectancy | none | Port P5 | Early access rules |
| data/fire_variants.json | FIRE flavours and factors | Fat FI, safer rate | Drop | Covered |
| data/milestones.json | Ages where retirement rules change, sourced | none | Port P5 | Age markers on the projection |
| data/triple_d.json | Dream, default, disaster bundles | presets.pace (Likely, Optimistic, Pessimistic) | Port P5 | Triple D on every projected number |

## 10. Plan: goals, events, life decisions

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/goals.html (The Decision Room) | Anything being weighed: cost, cost to you, when it lands, fit, can it be undone | Plan › Goals, Current vs Proposed | Fold: Plan › Current vs Proposed | Reversibility is one field per scenario |
| rooms/reversibility.html, rooms/worth.html, rooms/wedding.html | Stubs: can it be undone; worth it behind you; wedding countdown | Goals presets | Fold: Plan › Goals | A wedding is a goal preset; worth it is a review question |
| rooms/what-if-life.html (What If) | One life event three ways: dream, default, disaster | Current vs Proposed | Port P5 | Life events on the projection with Triple D |
| rooms/adventure.html | Stub: five years, every way | none | Drop | The scenario screen covers it |
| rooms/big-purchase.html | One thing priced in hours and FI months; the whole wish list | Money as time | Fold: Plan › Goals | A goal's cost in FI days is one line |
| rooms/dreamline.html | Stub: price the dream a month | none | Port P6 | Next-stages planning |
| rooms/week.html (The Life) | The designed week priced; the decades you plan to spend | none | Port P6 | Next stages and go-go years |
| rooms/buckets.html | Stub: Die With Zero time buckets by decade | none | Port P5 | Go-go, slow-go, no-go spending |
| rooms/housing.html | Rent vs buy, four ways into a deposit, a property priced as it runs | Home gate, mortgage linked to home | Port P6 | Real estate portfolios; rent vs buy for first homes |
| rooms/down-payment.html, rooms/property.html | Stubs: the deposit countdown; the deal | none | Port P6 | With Housing |
| rooms/car.html (Wheels) | 20/3/8, what the car loses and costs to run | Car gate, car loan | Fold: Plan › Goals | A car goal with the 20/3/8 line |
| rooms/first-car.html | Stub: first car check | none | Fold: Plan › Goals | With car |
| rooms/quit-fund.html | Stub: the quit fund | Runway | Fold: Plan › Goals | A goal preset |
| engines/goals.js | Goal costing | Goals solvers | Drop | Covered |
| engines/events.js | One event, three ways | Current vs Proposed | Port P5 | Events on the projection |
| engines/adventure.js | Five-year sandbox | none | Drop | As above |
| engines/purchase.js, engines/worth.js | Priced in life; prospective and retroactive worth | Money as time | Fold: Plan › Goals | One line |
| engines/dreamline.js, engines/week.js, engines/buckets.js | Dreamline, designed week, time buckets | none | Port P6 | Next stages |
| engines/housing.js, engines/downpayment.js | Rent vs buy; deposit countdown | none | Port P6 | Real estate |
| engines/firstcar.js, engines/quitfund.js | Car check; quit fund | none | Fold: Plan › Goals | Presets |
| engines/reversibility.js, data/reversibility.json | Cost and time to undo | none | Fold: Plan › Current vs Proposed | One field |
| data/goal_templates.json | What a goal is made of | Goals presets | Drop | Covered |
| data/events/*.json (11 files) | Life event templates: big purchase, debt sprint, freelance, house, job change, kids, move, partner merge, retire or coast, sabbatical, index | none | Port P5 | Events for the projection |
| data/blocks/*.json (9 files) | Scenario blocks: car, geo, home, hustle, inheritance, job change, kid, marriage, sabbatical | Current vs Proposed | Port P5 | Blocks become proposed changes |
| data/adventure_paths.json | Ways people describe reaching FI | none | Drop | Framing |
| data/journey_routes.json | Four paces on the same road | none | Fold: Home › Home | Feeds the certainty meter what-if |
| data/dreamline.json, data/bucket_ideas.json, data/week_blocks.json, data/travel_bands.json | Dreamline padding, experiences by decade, week blocks, travel costs | none | Port P6 | Next stages |
| data/housing_conventions.json, data/price_to_rent.json, data/down_payment.json, data/moving_cost.json | Real-estate rules of thumb, price to rent, FHA and down payment, moving bands | none | Port P6 | Real estate and moves |
| data/car_costs.json | Depreciation and running costs | none | Fold: Plan › Goals | With car |

## 11. Values, joy, mindset

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/values.html (What Matters) | Five values against where money went; the rerank; joy curve; giving | Joy number, joy lines (FOO 0b) | Fold: Plan › FOO | The rerank (cost order vs value order) is a step 0b card |
| rooms/rerank.html, rooms/fulfillment.html, rooms/giving.html | Stubs: rerank, joy curve, giving | Joy, Give | Fold: Plan › FOO | As above |
| rooms/financial-snapshot.html (The Scorecard) | Score, nine numbers, savings rate, every ratio, quick sums, rank guess | Plan › Scorecard, Report › Overview | Drop | Covered |
| rooms/health.html, rooms/ratios.html, rooms/savings-rate.html, rooms/quick-math.html, rooms/rank-guess.html | Stubs to the Scorecard's readings | Scorecard, metrics shelf | Drop | Covered, except rank guess (folded above) |
| rooms/get-help.html | What the app does not do, and who to ask | none | Fold: Coach tools › Lists | A referral list for the coach |
| engines/values.js, engines/rerank.js, engines/fulfillment.js | Values audit, rerank, joy curve | Joy | Fold: Plan › FOO | As above |
| engines/ratios.js, data/ratio_benchmarks.json, data/ratio_explainers.json | Every ratio, bands, plain explainers | metrics.js | Fold: Report › Overview | The explainers are good hover tips |
| engines/quickmath.js | One-line calculators | none | Drop | Coach does these by voice |
| data/values.json | Values vocabulary and its category mapping | Joy | Fold: Plan › FOO | With values |

## 12. The library: skills, exercises, learning

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/skill-tree.html (The Skill Tree) | 625 skills in five bands, three to practise at a time, exercises | data/library/skills.json (Batch 17, no UI) | Port P4 | The library's first slice runs beside the FOO (docs/engines/library.md) |
| rooms/stacker.html, rooms/exercises.html | Stubs: the Skill Stacker, the exercise library | none | Port P4 | Three at a time is the right amount to show |
| engines/skilltree.js | Household in, per-skill state and reason out | none | Port P4 | Its "leveled when the household shows it" proofs are the auto-tick idea |
| engines/skills.js | Stacker: three skills, did or didn't, what a day of practice is worth | none | Port P4 | As above |
| engines/exercises.js, data/exercises.json | Twelve runs on the household plus thirteen canon exercises | YMOYL step 3, Shockingly Simple Math | Fold: Home › Home | Exercises become homework items |
| data/skill_tree.json | The 625 curriculum skills plus 40 app skills | data/library/skills.json | Drop | Extracted in Batch 17 |
| data/skill_links.json | 312 lanes between trees, FOO requires and unlocks for app skills | opensFrom and opens in skills.json | Drop | Extracted in Batch 17 |
| scripts/extract-v63.mjs | Pulls the curriculum out of the source HTML | tools/library/extract-skills.mjs | Drop | SLAM extracts from the JSON |
| scripts/skill_tree_app.json, scripts/seed-exercises.mjs | The app's own 40 skills; exercise seeding | none | Port P4 | The 40 app skills are already gated by FOO step and could seed the first slice |

## 13. Report, sharing, data

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| rooms/one-pager.html (The Card) | One-pager, progress card, the year in four lines; no balances | Report › One-pager | Drop | Covered |
| rooms/progress-card.html, rooms/wrapped.html | Stubs: progress card, Money Wrapped | One-pager | Port P7 | Shareable cards come with the client portal |
| rooms/data.html (Your Data) | Files in and out, share link, pasted statement sorted into rows | Coach tools › Data, export, import, quick add | Drop | Covered |
| rooms/settings.html | Every switch on one screen | Gear menu | Drop | Covered |
| engines/onepager.js, engines/wrapped.js | One-pager; year-end card | One-pager | Port P7 | With the client portal |
| engines/history.js, engines/sincelast.js | Snapshots; earned vs learned | History | Fold: Report › History | The earned vs learned split |
| map.html, MONEY-MAP.md | The room map | Find | Drop | SLAM has one nav and Find |
| marketing/ | A separate marketing site | none | Drop | Not part of the app |

## 14. Coach mode, sessions and the other apps

| Item | What it does | In SLAM | Call | Why |
|---|---|---|---|---|
| coach/index.html (Coach Home) | Roster, new client, sheet import, backups | Client switcher, Coach tools | Drop | Covered |
| coach/session.html | A live session down a path of stops, quick entry, notes, recap | Home's session strip, the Agenda, the review gate | Drop | Covered |
| coach/client.html | The client's view: life map, goals, homework, check-in | Client view toggle | Port P7 | The client portal |
| coach/engines (session, quickentry) | Readings and shorthand entry | Quick add | Drop | Covered |
| money-rooms-v3/ui/views/quickstart.js | Four questions, rough answers, every number lit at once | Fast Track | Drop | Covered |
| money-rooms-v3/engine/guesses.js, data/defaults.json | Guesses by household size scaled by cost-of-living tier | Faded typical amounts | Port P4 | Household-size scaling is the priors' second axis |
| money-rooms-v3/engine/sensitivity.js, ui/views/levers.js | What moves the FI date: impact per standard shock and ask priority across the plausible range | These are big deals | Port P4 | Ask priority is the next-question score (next-best.md) |
| money-rooms-v3/data/weights.json | Share of a value that can move by answer state (verified 2%, rough 20%, unknown 50%) | none | Port P4 | Seed of range widths by Gut, Rough and Know it (ranges.md) |
| money-rooms-v3/engine/projection.js | Year-by-year to 95, Triple D, go-go/slow-go/no-go, Social Security at 67 | none | Port P5 | Closest prior art for the projection engine |
| money-rooms-v3/engine/retire.js, ui/views/calc.js | Retirement for two: each person's age and retirement age, combined path, potential | none | Port P5 | The two-person half of the dual-age view |
| money-rooms-v3/engine/fiLadder.js | Lean, Barista, FI, Fat, Coast rungs with the month each lands | Ladder (M75) | Drop | Covered |
| money-rooms-v3/engine/graph.js | Dependency graph from inputs to the FI date | Show the math | Fold: Plan › Goals | The graph tells Ask me next which inputs reach an output |
| money-rooms-v3/engine/home.js, house.js, car.js, ui/views/calculators.js | How much home (three answers), buy vs rent workbook, car options | none | Port P6 | Real estate and first homes |
| money-rooms-v3/engine/cashcal.js, ui/views/calendar.js | Day-by-day cash, safe to spend today | Calendar, layers | Drop | Covered |
| money-rooms-v3/engine/callpath.js, ui/views/call.js, ui/views/prep.js, ui/views/run.js | The six stops of a call, prep, run | Home's program, Agenda | Drop | Covered |
| money-rooms-v3/engine/curriculum.js, program.js, ui/views/program.js | Curricula as data, bending rules | program.js | Drop | Covered |
| money-rooms-v3/ui/views/learn.js, data/curricula.json, data/readings.json | What to learn, with readings | none | Port P4 | Readings can attach to library skills |
| money-rooms-v3/engine/discovery.js, ui/views/discovery.js | Discovery and confirm | Coach tools › Discovery | Drop | Covered |
| money-rooms-v3/engine/transactions.js, ui/views/transactions.js | Transactions from a CSV | CSV import | Drop | Covered |
| money-rooms-v3/engine/scenarios.js, ui/views/scenarios.js | Scenario blocks alone and together, never writing | Current vs Proposed | Drop | Covered |
| money-rooms-v3/engine/goals.js | Goal timeline, every goal funded from the surplus | Timeline | Drop | Covered |
| money-rooms-v3/engine/scoremetrics.js, momentum.js, ui/views/scoreboard.js | Eight Scoreboard metrics, momentum | Scorecard | Drop | Covered |
| money-rooms-v3/ui/views/moneydate.js | The monthly money date | S12 game plan | Port P7 | Between-session use |
| money-rooms-v3/engine/email.js, ics.js | Follow-up emails, calendar files | none | Port P7 | Client-facing follow-up |
| money-rooms-v3/engine/parse.js | Numbers the way people say them ("1900 every two weeks") | Quick add | Fold: Fast Track | Spoken amounts help the call copilot (Phase 7) |
| money-rooms-v3/engine/leverage.js, plates.js | What to ask next, the two plates | Picture next small things | Port P4 | With Ask me next |
| money-rooms-v3/data/conflict-library.json | Couples conflicts library | Couples | Port P6 | Every legal pairing (Real lives wave 3) |
| money-rooms-v3/data/benefits.json, unemployment-2026.json, tax-2026.json, limits-2026.json | Benefits, unemployment, tax and limits tables | reference-2026.json | Drop | Duplicates |
| money-rooms-v3/data/col-tiers.json, housing-costs.json, auto-costs.json | Cost-of-living tiers by city; housing and auto libraries | none | Port P4 | Priors by place |
| money-rooms-v3 (other views: home, ledger, measure, onepager, session, snapshot, whatsleft, map, checklist, clients, assumptions, matters) | The coach edition's other screens | Matching SLAM screens | Drop | SLAM is the rebuild of this app |
| slam/ (the first SLAM: Today, Plan, Track, Review, Insights, Setup, Clients) | The first SLAM build inside the older repo | SLAM | Drop | Rebuilt from the spec |
| slam/windfall.html, slam/engine/windfall.js | Windfall room | none | Port P6 | Windfalls |
| slam/engine/maxit.js | How much to max it (S-211) | Contribution limits | Fold: Net worth › Assets | Max-it pacing per paycheck |
| slam/engine/cashsim.js | Day-by-day simulation | Calendar | Drop | Covered |
| slam/ Future tools (dream life, Eras, Next stage) | Parked screens for what life could look like | none | Port P6 | Next stages |
| dnd/ (Dungeons and Dividends: sheet, campaign, encounter, bestiary, menagerie, descent, dm, card, profile, types) | A finance RPG: class quiz, level, hit points, campaign | none | Drop | A separate product; its skills data is not the curriculum |
| dnd/data/skills.json | Twenty-six Stacker skills tied to RPG classes | none | Drop | The 625 are the library |
| tools/rooms-json.js | Builds rooms.json from the registry | none | Drop | Build tooling |
| tools/stamp-build.js | Stamps the build into every page | none | Drop | Build tooling |
| tools/context/ | Context packs for coding sessions | none | Drop | Build tooling |

## What is not in that repo

Searched by name and by idea on 2026-11-05: **Timeline Comparator** and **Life Transitions** have no file of that name.
The nearest built pieces are `engines/timeline.js` (a life in months with dated jobs), `data/events/` (eleven life
event templates) and `data/blocks/` (nine scenario blocks), listed above. **Quantum Collapse** appears only as an idea
line in that repo's ROADMAP.md (which uses a tick to mean "idea locked", not "built"); its built pieces are described
in `docs/roadmap/named-tools.md`.
