# The workbook check

"Open in a spreadsheet" (Report › One-pager) writes a workbook with every input, every formula live, and a Check
beside each formula: Matches, or the gap to the app's number. The check below makes sure every household opens
with every Check at Matches, so the file a client opens in Excel or Google Sheets gives the same numbers as SLAM.

## How it works

1. `buildWorkbook` (js/sheet/workbook.js) builds the plan from the registries; ExcelJS writes the .xlsx.
2. LibreOffice opens each file headless, recalculates every formula and saves it back (`soffice --convert-to xlsx`).
3. Every Check cell on Math, Statements, FOO and Projections is read back. A row is off when its Check is not
   Matches; the list shows the sheet's value, the app's value and where.
4. The file the app downloads also carries each formula's expected result (a cached value), which LibreOffice shows
   until it recalculates. Each cached value must be what its formula really gives, or the cell is listed too.

A Check allows $1 or 1 month, and a cent on the rows the app shows in cents (`cents: true` on M01 and M17). Rows
marked From the app have no formula and are not checked; each says why it stays in the app (`fromApp`).

The households: the 14 personas (fixtures/personas), the Demo client, and Alexis and Tom through Fast Track only (the
build notes' numbers). The workbook is built as of today, so the sheet's `TODAY()` and the app's month agree.

## Run it

```
npm install                          # ExcelJS (a dev dependency; node_modules is never committed)
node tools/workbook-check.mjs        # every household, one line per row that differs
node tools/workbook-check.mjs maya demo ft-alexis
TZ=UTC node --test test/workbook-drift.test.js
TZ=America/New_York node --test test/workbook-drift.test.js
```

In a git worktree with no node_modules of its own, ExcelJS is taken from the main checkout's (found through
`git rev-parse --git-common-dir`), so there is nothing to link or install. LibreOffice is looked for in its usual
places, or set `SOFFICE=/path/to/soffice`. Without either, the tests skip and say which one is missing; the tool
prints the same and exits 0. A full run takes about a minute and a half (LibreOffice runs side by side, one per core).

## When a row is off

Fix the sheet formula in the registry (js/registry/math.js, js/registry/reports.js; named ranges only), or, when the
app itself is wrong, the app math with a hand-checked test. Then run the check again. `test/workbook-drift.test.js`
fails the run while any row is off.

Batch 38 fixed these (the before list):

| Row | Households | Cause |
| --- | --- | --- |
| M27 · debtOut, M27, M28, M53, M63, M72, Statements, Projections | Maya, teacher, Fast Track Alexis | the formula looked for the Kind "Gut number", renamed "Gut number or category", so debt payments outside the gut never came off |
| M27, M28, M53, M63, M72, Statements | multimillionaire, trans-transition | sinking funds (Save for it each month on a dated goal) come off the app's surplus; the sheet had no column for them |
| M27 · lines | bartender, creator, dancer, Tom, Fast Track Alexis and Tom | the lines were "there" when any Budget line row existed; the app needs one with an amount |
| M41 · invested, M53, M55 | Alexis, dancer, deficit | Has investments No (no accounts) is $0 in the app; the sheet only knew None of these |
| M21, M23, M27 · lines, M29, M2A, M51 | couple-separate | a couple who split bills: the app's household view counts both shares; the sheet counted one |
| M70 and the FOO tab | couple-separate | the FOO walked one person's plan (as the screens do) while the workbook holds both people's rows |
| Statements · Saved in the budget, Free after savings | couple-joint | the app counts 529 and Goal contributions as saved; the sheet left them out |
| Projections (every column), FOO status (cached values) | every household with a projection; the Demo's downloaded file showed 50 Checks off in LibreOffice | each row's formulas all carried the app's balance as their cached value (the age read $23,540); now only the compared cell carries it |
| M69, FOO · The step you are on | multimillionaire | step 7 (Go all in) is a window beside the path, never the step you are on; the sheet matched the first In progress |
