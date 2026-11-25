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
| 6. Household role map | The hand-off record of feature 3 (`c.x.roleMap`), `fair.js` (the labor method: its hours and its rate), the time prices `c.tp`, the time ledger (the pay per hour), the jobs sheet (`jobsSheet`: the part `jobsSheetRoleMap`) | `game/features/rolemap.js`; the math `jobHourValue`, `jobCarry` in `js/math/jobs.js` |

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

## Feature 6 (worker 3): Who carries what

- Where: Me > Your unpaid jobs > Who carries what. Also in the Menu ("Who carries what").
- The household is the player and each person of "Your people". Pets are not in it. Any number of people. Each
  person shows by their own name.
- A tap on a name gives that person the job. A second tap takes it off. A job can have more than one person. A job
  that nobody tapped stays with the player.
- The record: one item in `c.x.roleMap` for each person who holds a job:
  `{ id, role, task: null, who: { k: "me" | "person", n, p }, when }`. Compatibility: the old items all have a task.
  An item with `task: null` has no exit, so the undo of the four exits does not touch it.
- The math has one function, `jobCarry` (`js/math/jobs.js`):
  1. Each job keeps its minutes a month (the tap, or the Guess).
  2. A task off the plate leaves the job, at the same limit as Living it (a job gives back at most its own time).
  3. A task handed to a person of the home goes to that person. A task handed to the coach or to a tool leaves the
     home.
  4. The time that is left of a job is split equally between the people who hold it.
  5. The household total is the sum of the people. It is Running it plus the tasks handed to people of the home.
  6. The value is the hours x the value of an hour (`jobHourValue`): the time price for chores (`c.tp.chores`), else
     the pay per hour of the time ledger. With neither, no dollar value shows. The hours still show.
- Sharing costs fairly, Labor counts: each person's admin hours a month are added to their work at home, by name.
  The rate starts at the same value of an hour. The button "Use these hours in Sharing costs fairly" adds the people
  of the map by name. There is one split engine (`frCalc` in `game/features/fair.js`).
- Words: no blame and no score. A person with no job shows "No job yet", not "$0".
- Each tap saves at once. "Give every job back to you" clears the map, and Undo puts it back.

## The spreadsheet of the plan (Menu > Export)

| Section | Rows | Where |
|---------|------|-------|
| Your unpaid jobs (admin hours) | The minutes of each job, the total, the minutes given back, Living it, Running it, the share | `jobBook` (features 1 to 3) |
| Wired goals | The account, what is left, the months, the amount a month, the deposits a year, each deposit, the day, the next check-in | `wireBook` (feature 4) |
| Health and insurance dates | Each date the person tapped, and its reminder | `careBook` (feature 5) |
| Who carries what (household role map) | The value of an hour, each person's minutes and value, the household total and value, who holds each job | `rmBook` (feature 6). Only for a home of 2 or more people. |

Each formula uses only + - * / and names of rows, so it works in Google Sheets, Excel and LibreOffice.

## The glossary (Me > Glossary, and each "i")

| Word | What it means |
|------|---------------|
| CFO, Accountant, Financial Planner, Insurance Coordinator, Health Care Admin, Deals Manager | The six unpaid jobs. Each has one line in `game/data/roles.js`. |
| Hours a month running your money | The time the six jobs take you each month. |
| Running it and Living it | The time your money still takes, and the time you got back. |
| The four ways out | Do it, Automate it, Hand it off, Drop it. Each one can be undone. |
| Wire up a goal, Automatic transfer, High-yield savings account | Feature 4. |
| EOB, Out-of-pocket max, FSA, Open enrollment, Premium, Beneficiary, Renewal date | Feature 5. HSA and Deductible were in the glossary before. |
| Who carries what, Household admin time, The value of an hour, Labor counts | Feature 6. |

## The test pass (worker 3)

A think-aloud walk in Chromium, at 390 and 1280 wide, as three made-up people: a solo renter with pay that moves who
lives with a parent, a couple with two kids, and a household of three partners. Each walk opened the six features in
order. The findings and the fixes are in STATUS.md (run JOE-1, the last row). The math checks are in
`test/jobs.test.js` (by hand), `tools/audit` (a second engine) and `game/tests/household-role-map.js`.
