# Progress

A few lines per run, newest at the bottom. What each run is for is in `ROADMAP.md`.

Everything up to Nov 6 2026 (the phases, batches 1 to 63) is in `docs/archive/PROGRESS-to-2026-11-06.md`. The work of
Nov 12 to 14 (the self-serve journey, the standalone modules, sign-in, the papers readers, the card plan) is in the
git log and in `QUESTIONS.md`.

## Nov 14 2026: the roadmap replaced, the logs archived

`ROADMAP.md` is now the suite roadmap: eight runs, a status per tool, and how a run works. The Nov 6 roadmap and the
old parts of this file and of `QUESTIONS.md` moved to `docs/archive/`. Nothing in the app changed.

## Nov 14 2026: Run 1, trust the base

- The second engine: SLAM's money math worked out again in Python and compared to the dollar (`node tools/audit/run.mjs`,
  `docs/AUDIT.md`). 22 kinds of calculation, about 10,000 cases a run, 23 figures checked against the IRS's own print.
- It found three things, now fixed: the lifetime plan's yearly tax did not always settle, a required withdrawal and a
  conversion were counted twice, and Start at the finish line grew money faster than the plan. Four smaller things
  are questions (QUESTIONS 548).
- The kit for a standalone tool: `docs/KIT.md` (one page) and a template in `tools/template`, opened in Chrome at 390
  and 1280 wide with no errors.
- `node --test`: 1,185 pass, 0 fail. The layout check did not finish in this session (the chart library's address is
  blocked here); no screen changed in this run.

## Nov 15 2026: the four answers to the second engine's questions

- Loan interest shows what is really paid. The health credit at a line is left out and the plan says which years and
  why. Early Roth growth counts as income. Money taken out in a working year is taxed. Saving goes in month by month
  in the lifetime plan. Each change was made in both engines and they agree to the dollar; three new tests work the
  numbers by hand.

## Nov 15 2026: Run 2, one engine and the measured collapse

- One engine: every screen already reads the lifetime engine; a test now holds that, and holds one growth pace.
- Quantum Collapse, measured (`docs/COLLAPSE.md`): spending and pay do 87% of the work on the FI date; what is owed and
  cash decide the next step. The first questions are asked in the measured order, and every answer says what it moved.
- The second engine also covers 0% offers. Links already carried a format number, so nothing was needed there.

## Nov 15 2026: Run 3, first-timer walks

- Eight pages walked on a phone width two ways (follow the pulse; type like a person). Five things found and fixed:
  the word "null" printed on three pages, the runway answer not showing while typing, no way to go on after typing on
  the finish line page, a "null" sentence for people who owe nothing, and a builder's word on the front door.
  `docs/KRUG-2026-11-15.md`.

## Nov 15 2026: Run 4, the trip page and the handoff

- New tool from the template: `trip.html`, What does this trip really cost? Math in `js/solo.js` with a hand-worked
  test and a second-engine check. Opened in Chrome at 390 and 1280.
- The handoff walked end to end in practice mode (person, invite, coach, the coach's list). Fixed: a shared plan can
  start from a copy of the answers already given.
- Walks at laptop width and of every plan tab: clean. The pulse moves on while typing. Card page chips are 40px.
- Not done: Read my papers (needs real documents), the FIRE journey map.

## Nov 15 2026: Run 5, the canon replicated

- `docs/CANON.md`: the savings-rate table holds as printed and bends against SLAM's 7%; the 4% rule holds for 30 years
  (97%) and bends for 50 (84%); $100 a month is $30,000 holds; 752 and 173 bend by 1%; Coast FI holds. SLAM's own
  lifetime engine reproduces the classic 4% study.
- New tool from the template: `habit.html`. The answer card now redraws while typing on every templated tool.
- Not done: eight of the ten calculators, and Can I afford it as its own page.

## Nov 15 2026: Run 6, fire drills and a loan page

- `drills.html`: Money fire drills on their own page, for the Nov 30 talk. `loan.html`: What does this loan really
  cost? Both from the template, walked at 390 and 1280 by pulse and by typing, loan math in the second engine.
- The bill drill's wording now matches how its interest is counted.
- Not done: the 50-state cliff map (not started), the household true cost of debt as its own page.

## Nov 15 2026: Runs 7 and 8, as far as they could go

- `ladder.html`: If the pay stopped, what would I use first? The Life Transitions ladder as one page, on a copy of the
  plan. Walked at 390 and 1280; in the second engine.
- Blocked on data, nothing guessed: the career atlas, the city atlas, Aliyah Math. The files needed are named in
  `ROADMAP.md`.

## Nov 15 2026: Test Drive (outside the numbered runs)

- `start.html?dev=1`: eight made-up people as answer scripts (`js/testdrive.js`), saved through the journey's own
  functions. Walk one step at a time (what happened, what changed, why, a check), load instantly, jump to a level,
  flag a step in two taps, export the issue list as a CSV or one fix prompt, snapshots. How it works:
  `docs/TESTDRIVE.md`.
- The same scripts run headless in `node --test` (51 new tests, 2 of them kept as todo for TD-1) and in a browser
  (`tools/e2e/testdrive.cjs`: all eight walked at 1280 and 390).
- The layout checker's journey walk was repaired (it had timed out since the question order changed). Journey:
  column 36 (6 distinct, the home card on What if), every other check 0.
- QA on the Test Drive bar and card (tester-only): Works 5, Right 5, One answer 5, Looks right 4, Obvious 4,
  Findable 4 (only by the dev link, on purpose), Easy 5 (no typing), Plain words 4, Tells you 5, Fits everywhere 4
  (on a phone the card takes half the screen), Fast 5, Coachable not judged. Nothing above cosmetic open.
- Eight findings and four questions: `QUESTIONS.md` 557.

