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
| What is my first move? | Walked | first.html | First-timer walk done on a phone width, fixes in (docs/KRUG-2026-11-15.md). Laptop width still to walk. | S |
| Start at the finish line (begin with the end in mind) | Walked | end.html | First-timer walk done on a phone width, fixes in (docs/KRUG-2026-11-15.md). Laptop width still to walk. | S |
| How do I handle money? (quiz, couples pass, share with friends) | Walked | quiz.html | First-timer walk done on a phone width, fixes in (docs/KRUG-2026-11-15.md). Laptop width still to walk. | S |
| When am I debt free? | Walked | debt.html | First-timer walk done on a phone width, fixes in (docs/KRUG-2026-11-15.md). Laptop width still to walk. | S |
| How long would my money last? | Walked | runway.html | First-timer walk done on a phone width, fixes in (docs/KRUG-2026-11-15.md). Laptop width still to walk. | S |
| Where am I on the skill tree? (625 skills) | Walked | skills.html | First-timer walk done on a phone width, fixes in (docs/KRUG-2026-11-15.md). Laptop width still to walk. | S |
| Your whole plan (levels, what-ifs, lifetime, fire drills) | On main | start.html | The five first questions walked and reordered (docs/COLLAPSE.md). The levels, the what-ifs and the lifetime screens still to walk (Run 4). | M |

### Run 4: Card vault and the FIRE journey

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| Read my papers (1040, W-2, pay stub, NY, NJ, CT) | On main | return.html | Test on real documents you supply, kept out of the repo. | S |
| Is this card right for me? (the card vault) | On main | cards.html, data/library/cards.json (67 cards), card-offers.json (43 Chase offers) | Pushed to main Nov 14 from the other chat. Left: a Krug pass, a link from the front door, welcome offers for the other 11 banks (only Chase has them), and offers confirmed on application pages instead of review sites. | M |
| The handoff: a person on their own brings a coach into the same plan | Partly on main | one.html, pro.html | Your Nov 14 answer: self-serve first, then you coach that person from there. Walk it end to end in practice mode: finish alone, invite a coach, coach sees what changed. Fix what breaks. | S |
| FIRE journey map and the retreat scenario | Not on main | new | The stages of a FIRE person, plus what paying for a FIRE event or retreat really costs by age. | M |

### Run 5: Canon: replication and the first calculator pack

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| FIRE canon replication | Not on main | new | Re-run the famous results (the savings-rate table, the 4% studies, Big ERN) on SLAM's engine and show where they match and where they do not. Doubles as proof for ChooseFI and BiggerPockets. | L |
| Canon calculators, pack 1 | Not started | BACKLOG.md (77 rows waiting) | The first ten backlog calculators as standalone tools on the template (latte factor, wealth multiplier, crossover point and so on). You pick the ten. | M |
| Can I afford it? | Partly on main | js/math/afford.js | In the coach app. Left: a standalone page on the template. | S |

### Run 6: Cliff map, fire drills, true cost of debt

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| 50-state benefits cliff map | Partly on main | js/math/cliff.js | The cliff math exists. Left: sourced rules for every state and the map. Mostly data work, each rule with a source and date. | L |
| Money Fire Drills as its own tool | Partly on main | js/drills.js, js/math/firedrill.js | Drills live inside the plan. Left: the standalone version for your ChooseFI NY talk. | M |
| True cost of debt and the student loan decision | Partly on main | js/math/truecost.js, studentloan.js | In the coach app. Left: a standalone page on the template. | M |

### Run 7: The two atlases

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| Career atlas | Not on main | new | Scope to agree before the run: I will propose it in the summary of the run before. | L |
| City atlas | Not on main | new | Scope to agree before the run. Ties to your Longmont, NYC and aliyah comparisons. | L |

### Run 8: Later layer: planners, transitions, Aliyah Math

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| For coaches and planners (client plans, one page, tax depth) | On main | pro.html | On main. Left: a run with a real planner watching, after the handoff works. | M |
| Life Transitions (turn panic into a number) | Partly on main | js/math/transitions.js | In the coach app. Left: a standalone page on the template. | M |
| Aliyah Math (US vs Israel) | Not started | new | Not in this repo yet. Would sit well beside the city atlas. | M |

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
