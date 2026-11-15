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

