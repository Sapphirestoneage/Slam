# SLAM (Stress Less About Money)

Coach-operated financial planning. A coach runs it live on a call with one client
household at a time, on a laptop. Static site for GitHub Pages: plain HTML, CSS and
JavaScript modules, no build step.

`spec/SLAM Build Spec.xlsx` is the only source of truth. Every tab is also in
`spec/csv/` (rebuild with `python3 tools/xlsx_to_csv.py`); read the CSVs.

`ROADMAP.md` is the plan after Phase 3; the engine designs it names are in `docs/engines/`, and the older suite's
tools, with a call on each, in `docs/roadmap/`.

## Run it

```
python3 -m http.server 8000
```

Open http://localhost:8000/. Everything stays in this browser (localStorage);
export a backup from the gear.

## Test it

```
node --test
```

Node 20 or newer. The math runs in Node with no browser.

The spreadsheet tests (`test/workbook.test.js`, `test/import.test.js`) also write and read a real .xlsx
when ExcelJS is installed (`npm install`, or `npm install --no-save exceljs@4.4.0`), and recalculate it in
LibreOffice when that is installed, checking every formula against the app. Without them those few tests
skip with a message.

### Layout check

```
python3 -m http.server 8767 &
node tools/e2e/layout.cjs
```

Opens every screen at 1440, 1280 and 390 wide, light and dark, for the Demo client and a new client made through Fast
Track, opens Details panels, and checks the rules in `DESIGN.md`: boxes level in a row, no clipped text, no sideways
scroll, nothing covering anything, and every What's missing item landing on a box. It needs Playwright (not a SLAM
dependency). It writes `layout.json`, `report.md` and a few screenshots to `LAYOUT_OUT` (default: a `slam-layout`
folder in the system temp folder) and exits 1 when anything fails. `SLAM_URL` points it at another server;
`LAYOUT_QUICK=1` runs 1440 light only; `LAYOUT_OFFLINE=1` stands in for the CDN and fonts where they are blocked
(`ECHARTS` gives the local echarts.min.js). About 10 minutes for the full run.

### Personas

```
node tools/personas/build.mjs          # after a change to the backup format: rebuild fixtures/personas/*.json
node --test test/personas.test.js      # the numbers (part of node --test)
python3 -m http.server 8816 &
node tools/e2e/personas.cjs            # every screen, for every persona, in the browser
```

Twelve made-up households that run SLAM end to end, from below zero to a multimillionaire: Alexis (avoids money),
Tom (a CPA with every account), Maya, a deficit, an unmarried couple splitting by income, a married couple with one
paycheck and a baby, three adults in one home, a tipped bartender, a 1099 dancer, a fan-site creator with a part-time
job, a worker planning gender-affirming care, and a 52-year-old with $4.2M. Each is written readably in
`tools/personas/defs/<id>.mjs`, with the 5 to 10 numbers a coach expects worked out by hand (the arithmetic is in each
note) and a list of what SLAM cannot represent for that person yet. `tools/personas/build.mjs` turns each def into the
app's own backup file in `fixtures/personas/`, so any of them opens through Coach tools › Data › Import.

`test/personas.test.js` opens each file the way Import does and checks every expected number within its tolerance. A
number the app is known to get differently carries a finding id in its def and shows as a todo with what the app says,
so the gap stays in sight without stopping the run; anything else that differs fails. `tools/e2e/personas.cjs` opens
each persona through Import in the browser, visits every screen at 1280, and writes `report.md` and `personas.json`
(console errors, the What's missing count, the layout checker's findings, and whether each screen tells a sensible
story: no "no debt" words with debts on file, no lock asking for a number the household cannot have, no NaN, one answer
per number across screens) to `PERSONAS_OUT` (default: a `slam-personas` folder in the system temp folder). About 3
minutes. Every batch report includes its result (QA.md, Personas).
### Findability and effort (batch 14)

```
node --test test/findability.test.js        # the 39 everyday terms, Add routing, APR once per debt (no browser)
node tools/e2e/findability.cjs              # types each term into Find on the Demo and a Fast Track client
node tools/e2e/effort.cjs                   # Alexis and Tom: New client, Start session 1, Walk me through
```

Both scripts need Playwright and a server (`SLAM_URL`, default http://localhost:8767). `findability.cjs` exits 1 when a
term misses its screen and box (the terms and where each must land are in `tools/e2e/find-terms.cjs`). `effort.cjs`
counts every click and keystroke and prints the effort scoreboard; the latest run is in QA.md under Effort targets:

| Client | Actions to a rough picture | Picture after it | Core after it | Certainty after it | Actions to 99% (estimate) |
|---|---|---|---|---|---|
| Alexis | 97 (50 clicks, 47 keys; 13 walk stops) | 71% | 89% (25 of 28) | debt free in 64 months (FI not on her path yet) | about 159 |
| Tom | 98 (48 clicks, 50 keys; 14 walk stops) | 64% | 90% (27 of 30) | FI 2037 to 2044: 6.5 years wide | about 164 |

The words Find understands are a table in `data/reference-2026.json` (`findWords`): add a word there, with where it
lands and why, and add the term to `tools/e2e/find-terms.cjs` so the check keeps it.

## See the math

Every number in SLAM can be opened in a spreadsheet. On Report › One-pager (or Coach tools › Data), **Open in a
spreadsheet** downloads a workbook with every input, every formula live, and a Check beside each one against the
app. Change a blue cell and watch what moves. **Bring a spreadsheet back** shows every change for a Keep or Skip
before anything is saved.

## Open the books (the spreadsheet)

Report › One-pager and Coach tools › Data have **Open in a spreadsheet** (an .xlsx with every number and
formula, for Excel or Google Sheets) and **Bring a spreadsheet back** (every change listed for approval;
nothing is saved until Save, with a snapshot first and one undo).

The workbook is built only from the registries in `js/registry/`, so it stays complete as SLAM grows:

- A new field: declare it in `js/registry/fields.js` (its area, label, type, and a column or
  `sheet: { skip: 'why' }`). `test/coverage.test.js` scans the code for every key the app writes and
  fails, naming the file and line, until it is declared. The export and the import pick it up from there.
- A new formula in `js/math`: add its M entry to `js/registry/math.js` with a sheet formula (named
  ranges only) or `fromApp` and the reason. The test fails for any js/math export or spec M number that is
  not there, and the workbook build fails for a formula that names a range that does not exist.
- The spec and the code are linked row by row (the SLAM id column on the spec's Fields tab): a spec row that names
  nothing real, or a field with no spec row, fails the run (`SPEC-DRIFT.md` says which).
- A new rate, limit or rule: `data/reference-2026.json` or `RULES` in `js/registry/assumptions.js`, with
  its source and date. The math reads `RULES`, so the app and the sheet use the same number.

## Test data

- `fixtures/demo.json` is made up and committed. Rebuild it with
  `python3 tools/fixtures.py demo`. Its expected outputs are the main math check.
- The private Test client stays on your laptop. Put `SLAM Test Client (private).xlsx`
  in `fixtures/` and run `python3 tools/fixtures.py private` to make
  `fixtures/eli.local.json`. Both are git-ignored. Tests that need it skip with a
  message when it is missing.
- `fixtures/personas/*.json` are the made-up persona households (see Personas above), built from
  `tools/personas/defs/` by `node tools/personas/build.mjs`.
- A private full household: save a client's backup (Coach tools › Data › Export) as
  `fixtures/<name>.household.local.json` (the client name in lower case, spaces as dashes: `eli.household.local.json`).
  `node tools/artifact.mjs` then opens the page straight into that whole household instead of one built from the
  simple inputs. Git-ignored by the `fixtures/*.local.json` rule; publish that page privately only.

## Files

| Where | What |
|---|---|
| `index.html` | The app: top bar, five tabs (Home, Net worth, Cash flow, Plan, Report), sub-tabs |
| `staples.html` | Every staple and Polish rule on one page |
| `js/records.js` | One record type, history, undo and redo, snapshots, export and import |
| `js/math/` | Every Math tab formula as a pure function |
| `js/gates.js` | What applies to this household: the gates (R001 to R023) |
| `js/fasttrack.js` | Fast Track's Basics pass, written into the same records |
| `js/nav.js` | The tabs and sub-tabs, old My Money and Spending routes redirected to their new homes, Find |
| `js/ui/profile.js`, `js/ui/money-lists.js` | Home › About you and the gates hub; Income and Taxes (Cash flow); Assets and Protection (Net worth) |
| `tools/artifact.mjs` | Builds the one-file SLAM for Eli page from this repo (see the file for how) |
| `js/math/portfolio.js`, `js/ui/account-detail.js`, `js/ui/account-specific.js` | Inside each account: allocation, holdings, goals, growth, details; 401(k) and HSA |
| `js/homework.js` | I'll find it later: the Homework list and where to find each thing |
| `js/registry/program.js`, `js/math/picture.js`, `js/program.js`, `js/ui/home-ui.js` | The program (Phase 3): the 12 sessions and their checklists, every number's level and the Picture % (M73), the pace, the next small things, what unlocks when, Day 0; Home shows it |
| `js/registry/scorecard.js`, `js/math/scorecard.js`, `js/ui/scorecard-ui.js` | The Scorecard (M74): eleven areas Strong, OK or Hole from the numbers or the coach, the holes ranked by payoff for the effort, the goals, the next chapter; Plan › Scorecard and Home after session 3 |
| `js/registry/foo.js`, `js/ui/agenda-ui.js`, `js/ui/review-ui.js` | SLAM's own FOO with its prerequisites and locks; the Agenda (Must do, Going over, notes, links, Suggested for today; the docked bar in a session); the review gate before a session ends |
| `js/benefits.js`, `js/year.js`, `js/lifeadmin.js`, `js/community.js`, `js/timer.js` | Benefits and withholding flag; your year, sinking funds, taking over; life admin; community presets; onboarding timer |
| `js/payday.js`, `js/glossary.js`, `js/ui/tips.js`, `js/ui/report-this.js` | Payday card; plain-language tooltips; Report this (More › Report this screen) |
| `js/ui/sections.js`, `css/layout.css` | The caret header on every section (open or closed per client, in this browser), Open all · Close all, the slim strips, side panels that push the page |
| `js/math/statements.js`, `js/ui/statements-ui.js` | Report › Statements: net worth, income and spending, cash flow, and the tie-out (M62 to M67) |
| `js/math/layers.js`, `js/ui/layers-ui.js` | Cash layers: little e, income gaps, big e, backups of the backups (M68) |
| `js/math/foo.js`, `js/ui/foo-ui.js`, `data/flags.json` | Plan › FOO: the SLAM order of operations, Quiet Quitting FI, the path, efficiency flags as data (M69 to M71) |
| `js/math/markers.js`, `js/math/simple.js` | Calendar FOO and close markers; Shockingly Simple Math (M72) and Pay yourself first |
| `js/registry/fields.js`, `js/registry/math.js`, `js/registry/assumptions.js`, `js/registry/reports.js` | The registries: every field, every formula (M00 to M72), every assumption, and the Statements, FOO and Projections tabs |
| `js/sheet/workbook.js`, `js/sheet/excel.js`, `js/sheet/format.js`, `js/import-sheet.js`, `js/ui/sheet-ui.js` | Open the books: the workbook built from the registries, written and read with ExcelJS, and the review on the way back in |
| `fixtures/households.js` | Made-up households for the spreadsheet tests (every field filled; most of the math in use) |
| `docs/backlog-brandon.md` | The Nov 2 beta feedback, tagged NOW or LATER |
| `data/reference-2026.json` | Presets, limits, rates, lists from the Reference data tab |
| `js/registry/ladder.js`, `js/math/ladder.js` | The ladder (M75): steps in FOO order and markers slotted by date; Home's next step and next marker |
| `js/registry/couples.js`, `js/couples.js` | Couples: person tags, the six household modes and their defaults, the per-person view, the by-income split |
| `js/registry/debt.js` | Debt payoff methods (Avalanche, Snowball, Return on Hassle, Stress, Custom) and the suggestion from stress |
| `js/registry/joy.js` | The Joy number: the wording, asked at session start, in every snapshot, charted from Day 0 |
| `js/capture.js`, `js/import/csv.js` | Captured for later (category joy, Trip, income type, the change log with who); the CSV statement import |
| `js/math/proposed.js` | Current vs Proposed (M76): both sides, the differences, How we got this, Make Proposed the plan |
| `tools/personas/`, `fixtures/personas/`, `test/personas.test.js`, `tools/e2e/personas.cjs` | The twelve persona households: their defs with hand-worked numbers, the built backup files, the number check and the browser run |
| `tools/e2e/walkthrough.cjs`, `test/walkthrough.test.js` | The full walkthrough: S1 to S12 in unit tests; every screen at three widths, light and dark, in the browser |
| `MATH.md`, `SYNC.md`, `MORNING.md` | Every calculation reviewed (a self-review pending a CFP); the Google Sheets sync design; the overnight run's morning note |
| `js/find.js`, `data/reference-2026.json` (findWords) | Find understands people: everyday words to a screen and a box, Add by type, a note when unsure (batch 14) |
| `js/walk.js`, `js/ui/walk-ui.js` | Walk me through: every empty or rough box in session order, one at a time; a new client's Start session 1 |
| `js/ui/counts-ui.js`, `js/completion.js` | X of Y filled on Budget, Taxes, Protection and Goals; every screen's counts (fillCounts) |
| `js/usage.js` | The usage log (no dollar amounts) and its CSV export on Coach tools › Data; the ease answer at End session |
| `tools/e2e/findability.cjs`, `tools/e2e/effort.cjs`, `tools/e2e/drive.cjs` | The findability check and the effort scoreboard (Playwright) |
| `PROGRESS.md`, `QUESTIONS.md`, `BACKLOG.md` | Where the build stands, open questions, later phases |

## License

SLAM is open source under the GNU Affero General Public License v3.0 only (`LICENSE`). Anyone can use, change and
share SLAM. Anyone who runs a changed version for others must share their changes under the same license.
See `CONTRIBUTING.md` to help.
