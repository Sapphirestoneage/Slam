# SLAM (Stress Less About Money)

Coach-operated financial planning. A coach runs it live on a call with one client
household at a time, on a laptop. Static site for GitHub Pages: plain HTML, CSS and
JavaScript modules, no build step.

`spec/SLAM Build Spec.xlsx` is the only source of truth. Every tab is also in
`spec/csv/` (rebuild with `python3 tools/xlsx_to_csv.py`); read the CSVs.

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
| `js/benefits.js`, `js/year.js`, `js/lifeadmin.js`, `js/community.js`, `js/timer.js` | Benefits and withholding flag; your year, sinking funds, taking over; life admin; community presets; onboarding timer |
| `js/payday.js`, `js/glossary.js`, `js/ui/tips.js`, `js/ui/report-this.js` | Payday card; plain-language tooltips; Report this |
| `js/math/statements.js`, `js/ui/statements-ui.js` | Report › Statements: net worth, income and spending, cash flow, and the tie-out (M62 to M67) |
| `js/math/layers.js`, `js/ui/layers-ui.js` | Cash layers: little e, income gaps, big e, backups of the backups (M68) |
| `js/math/foo.js`, `js/ui/foo-ui.js`, `data/flags.json` | Plan › FOO: the SLAM order of operations, Quiet Quitting FI, the path, efficiency flags as data (M69 to M71) |
| `js/math/markers.js`, `js/math/simple.js` | Calendar FOO and close markers; Shockingly Simple Math (M72) and Pay yourself first |
| `js/registry/fields.js`, `js/registry/math.js`, `js/registry/assumptions.js`, `js/registry/reports.js` | The registries: every field, every formula (M00 to M72), every assumption, and the Statements, FOO and Projections tabs |
| `js/sheet/workbook.js`, `js/sheet/excel.js`, `js/sheet/format.js`, `js/import-sheet.js`, `js/ui/sheet-ui.js` | Open the books: the workbook built from the registries, written and read with ExcelJS, and the review on the way back in |
| `fixtures/households.js` | Made-up households for the spreadsheet tests (every field filled; most of the math in use) |
| `docs/backlog-brandon.md` | The Nov 2 beta feedback, tagged NOW or LATER |
| `data/reference-2026.json` | Presets, limits, rates, lists from the Reference data tab |
| `PROGRESS.md`, `QUESTIONS.md`, `BACKLOG.md` | Where the build stands, open questions, later phases |

## License

SLAM is open source under the GNU Affero General Public License v3.0 only (`LICENSE`). Anyone can use, change and
share SLAM. Anyone who runs a changed version for others must share their changes under the same license.
See `CONTRIBUTING.md` to help.
