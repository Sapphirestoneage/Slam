# The workbook check

"Open in a spreadsheet" (Report › One-pager) writes a workbook with every input, every formula live, and a Check
beside each formula: Matches, or the gap to the app's number. Its tabs are the app's screens (batch 59, below). The check below makes sure every household opens
with every Check at Matches, so the file a client opens in Excel or Google Sheets gives the same numbers as SLAM.

## How it works

1. `buildWorkbook` (js/sheet/workbook.js) builds the plan from the registries; ExcelJS writes the .xlsx.
2. LibreOffice opens each file headless, recalculates every formula and saves it back (`soffice --convert-to xlsx`).
3. Every Check cell on every tab (Math, and each screen tab's results and report tables) is read back. A row is off when its Check is not
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
| Statements · Unexplained (M66) | multimillionaire, trans-transition (after rebasing on batch 34) | the net worth bridge gained a sinking funds line in the app; the sheet now has it as its own row and takes it off |
| M69, FOO · The step you are on | multimillionaire | step 7 (Go all in) is a window beside the path, never the step you are on; the sheet matched the first In progress |

## The reads as formulas (batch 62)

The Phase 4 reads are live formulas now, each on a tab of its own (js/registry/reads.js, js/registry/reads-cliff.js),
built like the report tabs: one row per step of the math with a plain label, the formula, the app's number and a
Check. A step with no number of its own in the app has no Check. The Math tab's rows for these reads point at the
read's named rows (Lender_dti, Drill_days, Shift_hourly, Credit_move, Cliff_next ...), so the two always agree.

| Read | Tab | What the coach changes there | Per-row columns |
| --- | --- | --- | --- |
| M9W What a lender sees | Lender | the rate and taxes-and-insurance share are on Assumptions (This client) | Income: Lender reads it as, pace, returns, earned, mortgage, landlord; Debt: home loan, payment counted |
| M9F Bank fire drill (both readings) | Fire drill | the account that freezes (a blue box, the app's pick in it) | Assets: name, bank, frozen, same bank (two readings), reach; Debt: the card's bank, room, minimum; Budget: the group of bills, must-pay |
| M9H Shift P&L | Shift P&L | the shift boxes on Income; each kind of night's boxes show as the app's values | Income: Shift P&L columns (a row with nights is read one night at a time on the tab) |
| M9D What would move the score | Credit score | Your credit on About you, each card on Debt | Debt: months since opened |
| M9B The benefits cliff | Benefits cliff | the raise to test (a blue box, $5,000; the app's numbers are for $5,000) | People: child, child number |
| M10 · ctc Child Tax Credit | Benefits cliff | (worked out with the tax on the raise) | |

New reference tables on Assumptions: FireDrill (which Budget lines each group of bills holds, from the fire drill
order) and Medicaid_states (the states that have not expanded Medicaid).

Still from the app, each with its reason on the Math tab: the break-even raise (a search over every $100 step), the
paychecks landing in the fire drill's window (dated on the calendar, M60), M9T, M9L and M83 (whole-plan runs that read
the month-by-month debt plan, M34), M9S (a month-by-month walk of each repayment plan), M9C (the card library) and M90
(it reads the cash layers, M68).

## Batch 63: ranges, the meter and typical at your age, live

The Ranges tab (js/sheet/ranges.js) is the corner method of docs/engines/ranges.md in the sheet: one row per input
that can widen a range (What widens it), each output at the input's low and high, and the block (Likely, Could be
from, To, Check) adding the swings as the root of the sum of their squares. Each row finds its input by SLAM id with
INDEX and MATCH on the named ranges, so it reads whatever the coach types. Taken from the app, as M53 already takes its
debt-first months: the debt-first months and freed payments at each end, and the debt-free month at each end. The
meter (M9Q) is a formula over the block and each output's width at 0% (from the app). Typical at your age (M9E) and the
plan from an age's fill-ins (M9A) are lookups on Priors_ce, Priors_value, Priors_place and Priors_netWorth
(js/sheet/typical.js). Still From the app, each with its reason on Math: the FOO step's ends, Ask me next, the plan from
an age's ranges, and each output's width at 0%.

Every function the formulas use is on Google Sheets' list (checked Nov 6 2026 at support.google.com/docs/table/25273):
INDEX, MATCH, IF, OR, AND, NOT, MIN, MAX, ABS, SQRT, SUM, SUMIFS, COUNTIFS, COUNTIF, COUNT, SUMPRODUCT, ROUND, ROUNDUP,
LN, FV, ISNUMBER, ISERROR, IFERROR, N, LEN, SUBSTITUTE, SEARCH. A formula with known changes ahead puts each change's
month, starting balance and months to FI in cells of their own, so no formula is long enough for LibreOffice to stop
reading it (one long one read #N/A).

## Tabs follow the screens

Batch 59 (Eli, Nov 6: "screens map to tabs, and round trip"). The workbook reads like the app: one tab per screen and
sub-tab, in the order of `js/nav.js`, named like the app, each with the screen's own sections in the screen's order and
the same labels. Moving between the app and Excel is the same place with the same words. The list lives in
`js/registry/tabs.js` (`SCREEN_TABS`); `test/coverage.test.js` fails when a field of About you, Taxes or a setting has no
row on a tab, when a table has no home, or when a screen has neither a tab nor a reason. Every name fits Excel's 31
characters and uses none of its banned characters (`: \ / ? * [ ]`), so no short form was needed.

| # | Screen in the app | Tab | What is on it |
| --- | --- | --- | --- |
| 1 | Home | Home | Money in one line (results), Next small things (Extra to debt a month), the program: sessions, the Picture, next small things |
| 2 | Home › About you | Home › About you | Why now, What applies to me, About you (with Age worked out), People (a table), Work and home, Home and shared bills, Couples split, Your community and calendar, Which do you have today |
| 3 | Net worth › Assets | Net worth › Assets | Assets in three bands (Cash, Investments, Home or car), what it comes to, Cash layers (sleep-at-night number, how the layers are held, little e), Income gaps, Backups (one row per backup), Institutions |
| 4 | Net worth › Debt | Net worth › Debt | Order, Debt in three bands (Credit cards, Loans, Other), what it comes to |
| 5 | Net worth › Credit cards | Net worth › Credit cards | Utilization and promo payoff, what your cards give you, Your credit (score, late payments, freezes), what would move your score |
| 6 | Net worth › Protection | Net worth › Protection | Coverage |
| 7 | Net worth › Fire drill | Net worth › Fire drill | If this account froze today (results) |
| 8 | Cash flow › Income | Cash flow › Income | Income by person and type (a band each; Other benefits last), Variable income, Work hours, what it comes to |
| 9 | Cash flow › Taxes | Cash flow › Taxes | Filing (with Filing status used and Files jointly worked out), what you pay |
| 10 | Cash flow › Budget | Cash flow › Budget | Settings for this budget, Budget by category: Your gut number, then a band per category in the app's order (Accommodation, Food, Transportation, Debt, Health and self-care, Taxes, Retirement, Bills and subscriptions, Other), each with its category row and lines, then Irregular and yearly costs; what it comes to |
| 11 | Cash flow › Calendar | Cash flow › Calendar | Money in and out, Wins, the running balance |
| 12 | Cash flow › Month end | Cash flow › Month end | The months (a band per month), what it comes to |
| 13 | Plan › Goals | Plan › Goals | FI date and assumptions (today's or future dollars), FI date (results), These are big deals and the ladder, Milestones and Upcoming events |
| 14 | Plan › FOO | Plan › FOO | Giving, launch and the job, the steps (the FOO report), what the freed money does |
| 15 | Plan › Scorecard | Plan › Scorecard | What the Income area asks (last raise, market rate), the Scorecard report |
| 16 | Plan › Timeline | Plan › Timeline | Year by year to FI (row formulas) |
| 17 | Plan › Debt payoff | Plan › Debt payoff | Debt free (results and range), the true cost of each debt, each debt month by month |
| 18 | Plan › Next 12 months | Plan › Next 12 months | Sinking funds, your year (bonus months, holiday dates) |
| 19 | Plan › Current vs Proposed | Plan › Current vs Proposed | Proposed (results), both sides and the steps |
| 20 | Plan › Transitions | Plan › Transitions | What is changing? (the runway) |
| 21 | Plan › Raise and benefits | Plan › Raise and benefits | Your benefits now (six taps, SNAP a month, child care), what a raise does |
| 22 | Report › Overview | Report › Overview | Metrics, Your Shockingly Simple Math, Where the money goes, Fixed and variable, Ranges |
| 23 | Report › Statements | Report › Statements | The three statements and the tie-out |
| 24 | Report › Lender's view | Report › Lender's view | What each one counts |
| 25 | Coach tools › Session and Discovery | Coach tools | Session (Phase 4 previews), Discovery, Ask me next |
| | (engine room) | Assumptions, Math, Captured | Every rate and limit (its own tab, as before); every formula with its Check; what is kept for a later Wrapped |
| | (hidden) | _lists, _meta | The long dropdown lists; who, when, the format and the baseline |

Screens with no tab: Report › One-pager (the page this file is opened from: its numbers are on Report › Overview and
Plan › Goals), Report › History (dated history and snapshots stay in the app and the backup file), Coach tools › Lists
(the Revisit, Homework and Defaults in use lists are worked out from the rows on the other tabs) and Coach tools › Data
(the buttons that make and read this file).

Three screens share one table, because a named range is one column on one tab and every formula reads it:

- **Credit cards** are rows of the Debt table, in its Credit cards band on Net worth › Debt. The Credit cards tab shows
  what they add up to and holds Your credit.
- **Upcoming events** (shown on Plan › Next 12 months) are rows of the Goals table on Plan › Goals, in their own band.
- **Other benefits** (from work) are rows of the Income table, in the last band of Cash flow › Income.

**The Math tab stays the engine room**, at the end beside Assumptions. Every result a screen shows is on that screen's
tab as a live formula (`=Math_M27`) with the app's value and a Check; the Math tab keeps all 200 rows in the order the
math is built, because most rows are steps of another (M27's six parts feed M28, M53 and the FOO) and folding them into
the screens would scatter one formula's inputs over several tabs. One home for every formula, many places to read it.

**How a tab is laid out.** Row 1 is the screen's name, row 2 one line saying which screen it is and what to do there.
Then the sections, in the screen's order: a form (a label and a blue box per answer) or a table (a header, then a bold
band per section, its rows, and one or two blank rows to add to it). Blue bordered boxes are inputs (unlocked); grey
cells are worked out; a tab with nothing to type (Overview, Statements, Fire drill and the like, and Math) is protected.
Input tabs are not protected so rows can be inserted and deleted. Every tap in the app is a dropdown: Know it, Roughly,
Guess, Will get it, Not now, Not for me; Who pays; Owner; a section's own types; the categories; Yes or No. A list too long
for a rule (or with a comma in it) lives on the hidden `_lists` tab. Panes freeze on the title and the first table's
header; widths fit what each column holds; money shows as `$1,650` (cents where the app shows cents), percents as `22.15%`.

**How it comes back.** Column A of every screen tab is hidden and says what each row is: `field:profile.age`,
a record's id, `#sec:kind=bill;draftt=Food` (a band, with what a new row in it is), `#new` (a blank row), `math:M27`, and a
hidden row of column keys sits above each table's header. "Bring a spreadsheet back" reads by those keys, never by
position, so inserted rows and columns, sorted rows and renamed headers all still read. A new row takes its section: a
card under Credit cards, a cash account under Cash, a line under Food (its category still decides its letter), a month
line under its month. A row deleted in the file is offered for deletion (No by default). Typing over a grey cell is
listed and never saved. A copy made Without private rows comes back too: its private rows (neutral names there) are
never read, renamed or deleted, and the review never names them. A file of format 43 or before (a tab per area: Debt,
Spending lines ...) is read by its old tab names and headers, with a note saying so.

Checked by: `node tools/workbook-check.mjs` (every Check on every tab, every household), `test/roundtrip.test.js` (every
persona, the Demo and Fast Track Alexis and Tom: untouched brings back nothing; one cell on each editable tab brings back
exactly those changes and saves them; a new row takes its section; typing over a formula; the private copy; a format 43
file), `test/coverage.test.js` (every field has a row, every screen a tab or a reason).
