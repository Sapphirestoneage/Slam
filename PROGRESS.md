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

