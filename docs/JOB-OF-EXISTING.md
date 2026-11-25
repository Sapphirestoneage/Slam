# The Job of Existing (run JOE-1): what exists, and what each feature extends

Run JOE-1 (Nov 25 2026). Written before the build. Each feature extends a part of the game that exists. No feature
makes a second copy of a part.

## What exists

| Part | Where it is |
|------|-------------|
| The character reveal "Meet your character" (6 cards, then the character sheet) | `game/features/reveal.js` (`rvSheet`, the parts `rvSheetElement`, `rvSheetQuiz`, `rvSheetFounding`) |
| The Me tab | `meTab()` in `game/screens/ui.js`; the parts `meTabReveal`, `meTabQuiz`, `meTabValues`, `meTabFounding` |
| The time ledger and the money's hourly wage | `timeLedger(c, d)` in `game/core/engine.js`; the card `ledgerCard()` in `game/screens/ui.js`; `game/features/slept.js` |
| The time prices (10 either-or taps, "Tap one, or swipe toward it") | `TP_Q`, `tpAll()` in `game/core/engine.js`; the answers in `c.tp` (`family`, `rest`, `chores`, `commute`, `work`, in dollars an hour) |
| Automating it | The schedules (`c.routines`, each with `auto`: "Yes, it's automatic") in `game/screens/ui.js`; the automation skills (for example `financial-ops-tooling:6`, `debt-leverage:1`, `main-path:3`, `cash-safety-net:20`) and their level-up (`skilldone`, `celebrate()`) |
| Goals | `c.goals`, `goalsCard()`, `goalView` in `game/screens/ui.js`; the goal cards of `game/features/look.js`; `game/features/countdown.js` |
| Cost sharing, with the labor method | `game/features/fair.js` ("Share costs fairly", the method `labor`: home hours times a rate) |
| Seasonal quests and the yearly reset | `SEASONS` and `seasonItems()` in `game/core/engine.js` (tax season, before the year ends); `resets()` and the Yearly Review in `game/features/year.js`; `game/features/quota.js` |
| The fee X-Ray | `game/features/mix.js`, the fee screen of `game/features/compare.js`, `game/features/xray.js`. The built list says "partly". |
| The glossary | `GLOSS` in `game/screens/ui.js`; `kitTerms()` in `game/features/kit.js` adds words |
| The Home tiles | `home()` in `game/screens/ui.js`; `homeStatRow()` in `game/features/look.js`; the kit in `game/screens/dash.js` |
| The Quest Log | `game/features/questlog.js` |
| The regions and trees | `REGIONS`, `TREES` in `game/core/engine.js`; `nextSkill(c, tree)`; `game/features/connect.js` |
| The people of the player | `c.party` (`game/features/people.js`, "Your people") |

## What each feature extends

| Feature | Extends | New file |
|---------|---------|----------|
| 1. Your unpaid jobs | The reveal (`reveal.js`: a part on the character sheet), the Me tab (a part of `meTab`), the trees (`TREES`, `nextSkill`, the action `skill`) | `game/data/roles.js` (the six roles and their tasks), `game/features/jobs.js` (the screens), `js/math/jobs.js` (the math; the game copy is `game/core/jobs.js`) |
| 2. Admin hours | The time ledger (`ledgerCard`: a part), Home (`home()`: a part, built from `dash.js`), the spreadsheet (`BOOK_PARTS` in `book.js`) | The same files |
| 3. The four exits | The schedules (`c.routines`, `auto`), the seasonal list (`SEASONS`), the automation skills and `celebrate()`, the people (`c.party`) | The same files |
| 4. Goal to account to auto-deposit | Goals (`goalView`: the part `goalViewWire`; the goal card: `goalCardWire` in `goalCardLook`), the reverse of the Time-Money dial (`goalExtraFor`), the countdown's monthly answer, the four exits (`jobTasks`: two tasks for each wired goal), Today (`todayExtras`: the part `todayExtrasWire`), the Fee X-ray (`compare.js`, one tap from I need one) | `game/features/goalwire.js`; the kinds of account `WIRE_OPTIONS` in `game/data/roles.js`; the math `jobWireTimes`, `jobWirePer`, `jobCheckNext`, `jobAddMonths` in `js/math/jobs.js` |
| 5. Health and insurance quests | `SEASONS` (a new season `oe`, Nov 1 to 30; the item `tax:hsa`), the tasks of `roles.js` (each quest is one task; the new task `in_review`), `resets()` (the part `resetsCare`), Today (`todayExtras`: the part `todayExtrasCare`), Insurance needs (`cover.js`), the glossary (`kitTerms`) | `game/features/careq.js`; `CARE_QUESTS` in `game/data/roles.js`; the math `jobDateNext` in `js/math/jobs.js` |
| 6. Household role map | The hand-off record of feature 3 (`c.x.roleMap`), `fair.js` (the labor method), the time prices `c.tp` | Worker 3 |

## Merges and notes

- The prompt names "swipe-based time prices". They exist: the 10 time-price choices (`c.tp`) take a tap or a swipe.
  Feature 6 uses `c.tp.chores` as the value of an hour of admin work, and the real hourly wage of the time ledger
  when `c.tp` is not answered.
- "Automate it" does not make a second automation. For a schedule it is the switch `auto` of that schedule. For an
  other task it opens the automation skill of the task, which has the level-up.
- A task with an exit counts as "off your plate". The minutes of that task are "Living it". The minutes that are
  left are "Running it".

## Features 4 and 5 (worker 2)

- A wired goal keeps its wire on the goal: `g.wire = { v: 1, acct: { n, key, need }, amt, from, m, by, day, d, chk }`.
  The account is kept by name. "I need one" keeps the id of a kind of account (`need`), not an account.
- The amount has one way to be worked out: `goalExtraFor(what is left, 0, months)`, the reverse of the Time-Money
  dial. Each deposit: the amount a month x 12 / the deposits a year, rounded up (`jobWirePer`).
- SLAM moves no money. "I set it up" is the exit Automate it of the task "w:<goal id>". The check-in is the task
  "q:<goal id>", 4 times a year. Both are Financial Planner tasks, so they count in "N of M tasks off your plate".
- Unwire removes the wire, its two exits and any hand-off record, and keeps an Undo on the sheet.
- The health and insurance quests are tasks of `JOB_TASKS`. A quest that is in a season is the same task as its
  seasonal item (the `season` list of the task). A date of a plan (an open enrollment window, an FSA deadline, a
  renewal) is the person's tap, kept as "MM-DD" in `c.x.care.dates`. SLAM shows no general date.
