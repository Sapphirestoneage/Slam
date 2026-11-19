# SLAM roadmap

Updated Nov 14 2026. This file replaces the Nov 6 roadmap (kept in `docs/archive/ROADMAP-2026-11-06.md`).

## What SLAM is now

A suite of standalone tools. Each does one easy thing right, and the answers travel to the next tool in a link the
person carries. A person uses it alone first. Then a coach can be brought into that same plan and coach from there.

## How a run works

1. Read this file. Pick the lowest-numbered run with rows that are not Done.
2. Scope is frozen for the run. A new idea goes in the Parking lot at the bottom, and Eli re-ranks between runs.
3. Follow `CLAUDE.md`. Every run ends with `node --test`, the layout check, a Krug walk on what it touched, and the
   panel's read.
4. Update the Status column here, add a few lines to `PROGRESS.md`, put questions in `QUESTIONS.md`, push to `main`.
5. End with one summary for Eli and a short list of questions.

Size: S is a small part of a run, M about a quarter, L about half. The run sizes are estimates, to be corrected
after Run 1.

## The runs


### Run 1: Trust the base: roadmap, logs, kit, second engine

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| Roadmap file in the repo | Done | ROADMAP.md | This file. | S |
| Trim the run logs | Done | PROGRESS.md, QUESTIONS.md | Old entries are in docs/archive. | S |
| Design kit rulebook for standalone tools | Done | js/solo/shell.js, DESIGN.md | docs/KIT.md and tools/template. A new calc starts from the template. | S |
| Second engine that audits the math | Done | tools/audit, docs/AUDIT.md | tools/audit and docs/AUDIT.md. Found and fixed three errors. Still to add: the coach app projection, 0% offers, household tax, the Child Tax Credit, the cliff (Run 2). A rebuild by someone who never sees the code is the stronger test. | L |

### Run 2: One engine, measured collapse, the link and sign-in

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| One engine for every tool | Done | js/math/lifetime.js, test/audit.test.js | Every screen already reads the lifetime engine: the coach projection (js/math/projection.js) is math no screen shows. A test now fails if a screen reads it, or if money grows at any pace but the plan's. Still to do if the projection is ever shown: bring it into the second engine first. | L |
| The link you carry | Done | js/start/link.js | Links already carry the file format number and old ones are migrated on opening (js/records.js importFile). Nothing to build. | S |
| Sign-in, sync, shared plans for any number of people | Partly on main | js/cloud.js, js/sync.js, docs/CLOUD-SETUP.md | Built and tested against a stand-in server. Waiting on your project keys (decision 3). | S |
| Quantum Collapse, measured | Done | tools/collapse, docs/COLLAPSE.md | tools/collapse/measure.mjs and docs/COLLAPSE.md. The five first questions are now asked in the measured order: spending, pay, owed, cash, invested. Not yet measured: the sharpening levels, and people between jobs. | M |

### Run 3: Audit the seven modules: Krug walks and the panel

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| What is my first move? | Done | first.html | Walked at phone and laptop width, fixes in (docs/KRUG-2026-11-15.md). | S |
| Start at the finish line (begin with the end in mind) | Done | end.html | Walked at phone and laptop width, fixes in (docs/KRUG-2026-11-15.md). | S |
| How do I handle money? (quiz, couples pass, share with friends) | Done | quiz.html | Walked at phone and laptop width, fixes in (docs/KRUG-2026-11-15.md). | S |
| When am I debt free? | Done | debt.html | Walked at phone and laptop width, fixes in (docs/KRUG-2026-11-15.md). | S |
| How long would my money last? | Done | runway.html | Walked at phone and laptop width, fixes in (docs/KRUG-2026-11-15.md). | S |
| Where am I on the skill tree? (625 skills) | Done | skills.html | Walked at phone and laptop width, fixes in (docs/KRUG-2026-11-15.md). | S |
| Your whole plan (levels, what-ifs, lifetime, fire drills) | Walked | start.html | Five questions and every tab walked at both widths. Not walked: each of the 20 levels answered through, each what-if tool, the lifetime screens with every setting. | M |

### Run 4: Card vault and the FIRE journey

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| Read my papers (1040, W-2, pay stub, NY, NJ, CT) | On main | return.html | Not walked: it needs real documents, which only Eli can supply (kept out of the repo). | S |
| Is this card right for me? (the card vault) | On main | cards.html, data/library/cards.json (67 cards), card-offers.json (43 Chase offers) | Walked at both widths; chips are 40px. Left: offers confirmed on application pages instead of review sites. | M |
| The handoff: a person on their own brings a coach into the same plan | Done | one.html, pro.html | Walked end to end in practice mode. A shared plan can now start from the answers a person already gave. Left: the real server (needs keys), and a client plan shows as "Ours" on the coach's list until renamed. | S |
| FIRE journey map and the retreat scenario | Partly on main | trip.html, js/solo/trip.js | The retreat scenario is built: trip.html, What does this trip really cost? (the price grown to 65, the same trip by age, how far it moves the date). The journey map is not built. | M |

### Run 5: Canon: replication and the first calculator pack

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| FIRE canon replication | Done | tools/canon, docs/CANON.md | tools/canon/replicate.mjs and docs/CANON.md: the savings-rate table, the 4% rule over 30 to 60 years, $100 a month, the rules of 752 and 173, Coast FI. Still to replicate: Big ERN's safe withdrawal series, the wealth multiplier, the crossover point. | L |
| Canon calculators, pack 1 | On main | trip.html, habit.html, years.html, coast.html, dollar.html, car.html, home.html, worth.html, wage.html, split.html | Ten of ten. The eight added Nov 19 are specs in js/solo/canon.js drawn by one renderer (js/solo/calc.js): working years in a savings rate (MMM), Coast FI, a dollar later (the wealth multiplier), 20/3/8 for a car (Money Guy), 28/36 for a home, expected net worth (The Millionaire Next Door), the real hourly wage (Your Money or Your Life), 50/30/20 (All Your Worth). Math in js/solo.js with tests, all eight in the second engine, walked at 1440, 1280 and 390 in both themes. Left: a person using them while someone watches. | M |
| Can I afford it? | On main | afford.html, js/solo/plans.js, js/math/afford.js | afford.html: pick the thing, what it costs and when; three numbers about your month; the answer is where the money comes from and what it pushes back. No yes or no. In the layout check. Left: "Make it a goal" still happens in the whole plan, and the FOO step names (Tax-Free Growth) are shown without a tap-to-explain. | S |

### Run 6: Cliff map, fire drills, true cost of debt

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| 50-state benefits cliff map | Partly on main | js/math/cliff.js | Not started. The cliff math covers New York and the federal lines. Each other state needs its own SNAP and Medicaid rules found and dated, one at a time; none were guessed. | L |
| Money Fire Drills as its own tool | Done | drills.html, js/solo/drill.js | drills.html: the plan's own drills, each shown the moment its numbers are in, with a rep to tick. Left: the page is long on a phone before the first drill; the lost-job drill names unemployment pay only for New York. | M |
| True cost of debt and the student loan decision | On main | loan.html, cost.html, student.html, js/solo/plans.js | Three pages. loan.html prices one loan before you sign. cost.html (Nov 19) prices every debt you have: interest still to come, the after-tax rate, and the months of freedom each holds back. student.html (Nov 19) prices each federal repayment plan on your loan and pay: the payment, the total, what is forgiven. Both read js/math and write nothing new. Left: PSLF and household size are only in the coach app's fields; refinancing is not on the page. | M |

### Run 7: The two atlases

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| Career atlas | Blocked on data | new | Not built: no numbers were guessed. Nov 19 2026: the build machine cannot reach bls.gov, huduser.gov or taxfoundation.org, so the files have to be dropped in by hand. Needs one file from Eli in data/sources/: the BLS OEWS May 2025 national table (national_M2025_dl.xlsx from bls.gov/oes/tables.htm; columns OCC_CODE, OCC_TITLE, TOT_EMP, A_PCT10, A_PCT25, A_MEDIAN, A_PCT75, A_PCT90). It has pay by percentile, not by age, so one decision is also needed: how pay moves over a career (default offered: start at the 25th percentile, reach the median in 10 years, the 75th in 20). | L |
| City atlas | Blocked on data | new | Not built: no numbers were guessed. Needs three files from Eli in data/sources/: BLS OEWS May 2025 metro table (MSA_M2025_dl.xlsx: AREA, AREA_TITLE, OCC_CODE, A_MEDIAN), HUD Fair Market Rents for the year (FMR by metro: areaname, fmr_0 to fmr_4), and state income tax brackets for 2026 with their source (state, filing status, floor, rate, standard deduction). Only New York and New York City tax are in SLAM today. | L |

### Run 8: Later layer: planners, transitions, Aliyah Math

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| For coaches and planners (client plans, one page, tax depth) | On main | pro.html | Walked in practice mode with the handoff (Run 4). Blocked on a person: a real planner using it while someone watches. | M |
| Life Transitions (turn panic into a number) | Partly on main | ladder.html, js/math/transitions.js | ladder.html, If the pay stopped, what would I use first? is built: the ladder in order, what each rung costs, the month it runs out. Not on the page yet: unemployment, family help, side income, a card, tripwires and Plan B (they are in the coach app). | M |
| Aliyah Math (US vs Israel) | Data gathered, not built | data/sources/israel-2026.json | Researched Nov 19 2026, each figure with its source and how sure it is: 2026 income tax bands (the 20% and 31% bands widened in March), credit points and the olim schedule, the 0% rate for 2026 arrivals and its yearly ceilings, the 10-year foreign income exemption, National Insurance and health rates. Marked "confirm" where only secondary sites were read: the top band, the surtax rate, the 0% ceilings and end date. Still needed before any math: the US side (exclusion against credit, totalization), Eli's cost-of-living figures, and an exchange rate rule. The spec is in Eli's artifacts ("Aliyah Math: calculator spec"). | M |

### Alongside the runs: testing

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| Test Drive: made-up people as scripts, the walk, the issue list | Done | js/testdrive.js, js/start/testdrive-ui.js, docs/TESTDRIVE.md | Open start.html?dev=1. Left: scripts for line by line and the statement reader; a person with several people in the plan (waits on QUESTIONS 557, 3). | M |
| The walk as the client tutorial | Not started | | Waits on Eli (QUESTIONS 557, 4). | M |

## Decisions on file (Eli, Nov 14 2026)

- The main user is a person on their own. A coach is brought into that person's plan afterwards.
- Sign-in stays in practice mode for now (`one.html?practice`). Real keys later (`docs/CLOUD-SETUP.md`).
- The second engine, the canon replication, the 50-state cliff map, the two atlases and the FIRE retreat scenario
  were asked for and not built anywhere (checked main, the other branches and Eli's artifacts). They are fresh builds.

## Still true from the older roadmap

The phase plan of Nov 6 (Quantum Collapse, real lives, the projection engine, the multimillionaire stage, clients in
the app) is in the archive copy. Much of it was built in batches 20 to 63 and the Nov 12 to 14 self-serve work.
`BACKLOG.md` still lists the spec's later features; the canon calculator packs draw from it.

## Parking lot

- FOO tournament (Eli passed on it for now, Nov 14)
- Kanban of priorities with a moved-from log
- Hamilton / Treasury theming
- Bank connection instead of statement upload
