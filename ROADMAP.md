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
| Roadmap file in the repo | Not started | ROADMAP.md (stale) | Replace the Nov 6 coach-run roadmap with this one, with a status line per tool that every run updates. | S |
| Trim the run logs | Not started | PROGRESS.md, QUESTIONS.md | Archive old entries, keep a short current file, so a run starts by reading minutes of notes instead of half a megabyte. | S |
| Design kit rulebook for standalone tools | Partly on main | js/solo/shell.js, DESIGN.md | The kit exists in code. Write the one-page rulebook (boxes, chips, carry card, level rows) and a blank template tool, so a new calc is mostly content. | S |
| Second engine that audits the math | Not on main | new | An independent rebuild of the year-by-year math that runs every test household and lists any number that differs from SLAM by more than a dollar. Done: zero unexplained differences. | L |

### Run 2: One engine, measured collapse, the link and sign-in

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| One engine for every tool | Partly on main | js/math/lifetime.js and js/math/projection.js | Two year-by-year engines exist (coach app and self-serve). Make every tool read one. Done: a test fails if any screen projects another way. | L |
| The link you carry | On main | js/start/link.js | Works. Left: a version stamp so old links keep opening as tools change. | S |
| Sign-in, sync, shared plans for any number of people | Partly on main | js/cloud.js, js/sync.js, docs/CLOUD-SETUP.md | Built and tested against a stand-in server. Waiting on your project keys (decision 3). | S |
| Quantum Collapse, measured | Partly on main | js/sharpen.js, js/math/ranges.js | Sharpen already names what blurs the plan most. Left: a measured table of how much each question shrinks the range across the test households, and the question order rebuilt from it. | M |

### Run 3: Audit the seven modules: Krug walks and the panel

| Tool or job | Status | Where it lives | What is left, and what done means | Size |
|---|---|---|---|---|
| What is my first move? | On main | first.html | Krug pass and panel audit only. | S |
| Start at the finish line (begin with the end in mind) | On main | end.html | Krug pass and panel audit only. | S |
| How do I handle money? (quiz, couples pass, share with friends) | On main | quiz.html | Krug pass and panel audit only. | S |
| When am I debt free? | On main | debt.html | Krug pass and panel audit only. | S |
| How long would my money last? | On main | runway.html | Krug pass and panel audit only. | S |
| Where am I on the skill tree? (625 skills) | On main | skills.html | Krug pass and panel audit only. | S |
| Your whole plan (levels, what-ifs, lifetime, fire drills) | On main | start.html | The biggest screen (1,246 lines in one file). Left: your "is this a real plan" doubt, answered by the second engine and the measured collapse. | M |

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
