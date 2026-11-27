# What it is / What it could be (run A, Nov 27 2026)

The first thing a new player of SLAM the Game sees: one number and one chart. This page is the record of what was
there before, what the flow replaced as the opening, and how the flow is built. Steps 0 to 4, the last screen and the
Krug self-check are built.

## Step 0. What a new player saw before (walked Nov 27 2026, Chromium, 390 wide)

A brand-new visitor, from the landing screen and Start with no account, to Home. 25 screens, 35 taps to the payoff
reveal, 36 to Home. The first number of any kind came at tap 5 (the Debts round's "What you owe"). The FI number was
not on the way: it first showed on the reveal's cards (tap 35) and on Home (tap 36).

| # | Screen | Where in the code | Now |
|--:|--------|-------------------|-----|
| 1 | The landing: one line, Start, Sign in, What is this? | `doorHtml`, `doorShow` in `game/account/door.js` | Stays. Its second line now says "First: four taps, then your freedom number." |
| 2 | "Am I okay?" page 1, About you (the decade, then the age) | `setupSheet` in `game/screens/ui.js`, `setupSheetDoor` in `game/features/okay.js`, the age in `game/screens/smart.js` | Replaced as the entry. It is the first page of the rest of setup, with the age already in |
| 3 to 5 | Round 1, Debts: how many cards, the kinds of debt, then the round's number "What you owe" and the level change "Debts, now Assets" | pages 10 and 5 of `SETUP` (`game/features/amounts.js`), `spSetupSheet` in `game/features/spiral.js` | Replaced as the entry. The rest of setup |
| 6 to 10 | Round 2, Assets: the accounts, the amount of each, the three gut checks, the round's number, the level change | pages 6, 12 and 8; `spSetupSheet` | Replaced as the entry. The rest of setup |
| 11 to 15 | Round 3, Income: work, the kinds of income, steady or not, how much each time, the round's number, the level change | pages 2 and 13; `spSetupSheet` | Replaced as the entry. The rest of setup |
| 16 to 18 | Round 4, Taxes: the page, the round's number, the level change | page 9; `spSetupSheet` | Replaced as the entry. The rest of setup |
| 19 to 24 | Round 5, Expenses: home and who you live with, your people, the spending groups, the last page, the round's number, the level change "your first plan is next" | pages 3, 4, 14 and 7; `spSetupSheet` | Replaced as the entry. The rest of setup |
| 25 | The payoff reveal "Here's where you stand" | `spPlanSheet` in `game/features/spiral.js` with `rsRevealBody` in `game/features/results.js`; opened by `finishSetupOkay` in `game/features/okay.js` | Replaced as the entry. It is the end of the rest of setup |
| 26 | Home, results first | `homeResults` in `game/features/results.js` | Stays |

Nothing was deleted. The rounds and the reveal are "the rest of setup": the last screen of the flow and Next Steps
open them ("Finish setup: five short rounds"), with the age, the amounts and the accounts of the four answers kept.

## What a new player sees now

| Tap | Screen |
|----:|--------|
| 1 | Start on the landing |
| 2 to 5 | Four questions, one at a time, by range chips: age, spending a month, invested, saved a month ("I know it" opens a number box; an exact amount is optional) |
| after tap 5 | "What it is": the FI number (25 times a year of spending) and the age at today's pace, with "What it could be" beside it. They start equal. Under it: "The rest of your life costs about $X" (Batch B, phase 1) |
| 6 | The layer chart |
| 7 | Way 1 of 2, "Spending eases as you age": Count this, Already doing it, Not for me |
| 8 | Way 2 of 2, "Social Security pays part of it": Not counting on it, Count part of it, Count all of it |
| 9 | Way 3 of 3, "Pay less tax on the way out" (Batch B, phase 2a): two taps (how you file, your state), then Count this, Already doing it, Not for me when a plan applies |
| 10 | The last screen: both numbers, the chart, every way of the flow with where it stands, Finish setup, Next Steps, Home |

(Changed in Batch B, phases 2b to 2f: after the chart comes the stack, one list of every way. See the last section.)

Taps from the landing to the first number: 35 before (to the reveal's FI card), 5 now.

A returning player with a profile lands on Home as before. The flow is in the Menu (What it is / What it could be)
and on Next Steps, and it skips the four questions when the profile has the answers.

## How it is built

- Math, one copy for both apps: `js/math/paylayers.js` (M91), copied to `game/core/paylayers.js` by
  `node tools/game_paylayers_build.mjs`. `lyNumbers` gives the two numbers, `lyYears` the year-by-year rows from today
  to 95, `lyBars` the 5-year bars, `lyNeedsAge` the age from which steady income meets the needs, `lyReceipt` the
  receipt of a change. The one year on one pile is `wayPay` of `js/math/withdraw.js`. The second engine
  (`tools/audit`) works every year and both numbers out again.
- The game's adapter and screens: `game/features/couldbe.js`. `cbParams(c)` turns the profile into plain numbers
  (spending from `derive()`, the FAT needs share from the spending rows, the accounts from `txSplit`, Social Security
  from `passives` / `ssEst`, the tax from `retireTax`, health insurance before 65 from the player's tap or the dated
  KFF benchmark plan). `cbNumbers(c)` and `cbChart(c)` are what the screens show.
- The chart is the kit's `dkBars` with the new option `stack` (`game/screens/dash.js`). No second chart helper.
- The four answers go to the rows setup writes (`c.incs`, `c.spends`, `c.invs`) as a Guess; a typed amount is known.
  The profile is made by `finishSetup()`, the same function setup uses. The only new key is `c.x.cb` (the answers,
  what is counted, what is off, the health price, whether the rest of setup is done).
- The routes: `cbStart()` is called by name from `doorBegin` (door.js), `ACT.start` (ui.js) and `clFirstGame`
  (cloud.js). `finishSetupCb` (in `finishSetupBase`), `openSetupCb` (in `openSetup`), `drawSheetCb` (in
  `drawSheetOnce`) and `planTabCb` (in `planTab`) are named parts. No function of another file is replaced.

## Step 4. The two strategy steps

Each screen has: a plain headline, one line of why, the two pinned numbers, a row "What has to go right" (the "i":
what has to go right, and the backup if it doesn't), the tap presets, "The drop for you" (dollars off the target and
months sooner, before anything is counted), three buttons (Count this, Already doing it, Not for me), the receipt
after an answer, the chart, Show the math with the source, Next and Back, and the one advice line.

| Step | Presets | Where the default comes from |
|------|---------|------------------------------|
| Spending eases as you age | The typical shape: 100% of today's spending to 75, 85% from 75, 75% from 85. Half as much easing: 92.5% from 75, 87.5% from 85 | `retirementPhases` in `data/reference-2026.json` (the web app's lifetime plan and projection use the same row). BLS Consumer Expenditure Survey 2024: households 75 and over spent $55,834 a year against $65,354 at 65 to 74 (85.4%), read Nov 6 2026 and again Nov 27 2026. The 75% from 85 is a stated convention: the survey has no row for 85 and over. The names are from Michael Stein, The Prosperous Retirement |
| Social Security pays part of it | Not counting on it; Count part of it (83%, or the part share the player chose in setup); Count all of it (Batch B, phase 1: three presets) | The estimate is the game's own (`ssEst`, from pay today), always marked Guess: the game has no box for a player's own figure yet. 83% is `socialSecurity.trustFund.payable` (the 2026 OASDI Trustees Report, June 9 2026). 75% is the careful choice of setup: a player who chose it there keeps it as the part |

- The answers: Count this counts it. Already doing it counts it too (it is true of the player) and says "Already
  yours, and counted". Not for me takes it out. The answer is kept in `c.x.cb.how`.
- The share of Social Security has one home: `c.x.ss`, the key that setup and the odds already use. The step writes
  it; "Not counting on it" writes 0.
- The receipt compares the number with this one step against the number without it (`cbPreview`), so a change of
  preset never shows a minus.
- New math: `lyShapeBands(rp, scale)` in `js/math/paylayers.js` turns the shares of the reference data into the bands
  that `lyShapeAt` already read. The build tool puts `LY_SHAPE_REF` and `LY_SS_REF` (the two reference rows) into the
  game's copy. The second engine works the bands out again (`tools/audit`).
- When a year is "Not covered yet" and health insurance before 65 or tax on traditional withdrawals is on the chart
  and not in the number, the gap line says so and has a button to count each one.
- Run B adds a step with `cbStepAdd("id", view)`: it goes before the last screen. `cbCount(id, opts)` counts,
  `cbCount(id, false)` takes out, `cbReceiptWords(receipt)` gives the words, `cbChartCard(K, title, cap)` the chart.

## The Krug self-check (Nov 27 2026, Chromium, a new visitor from the landing)

Three made-up players, by the chips a person like that would tap. Taps are counted from the landing screen (Start is
tap 1) to the first number on the screen.

| Persona | The four taps | Taps to the first number at 390 | at 1280 | at 1440 |
|---------|---------------|--------------------------------:|--------:|--------:|
| 27, renting, $60K invested, no kids | 25 to 29; $3k to $4k; $50k to $100k; $500 to $1k | 5 | 5 | 5 |
| 38, a couple, a 401(k) match and a mortgage | 35 to 39; $7k to $10k; $250k to $500k; $1k to $2k | 5 | 5 | 5 |
| 31, self-employed, uneven income | 30 to 34; $3k to $4k; $10k to $50k; $250 to $500 | 5 | 5 | 5 |

- One opening: Start goes to question 1 of the flow. No setup round and no payoff reveal comes first (tested in both
  walks and in `game/tests/what-it-could-be.js`).
- Each screen of the flow at each width: no sideways scroll, nothing past the right edge, no "undefined" or "NaN", no
  console error. The sheet has Back, Home and Close on its top row on every screen.
- The chart at 390 wide: up to 14 bars of 5 years, the labels readable, the hatched gap with its dollars on the widest gap.
- What the check changed: (1) the colors. In the one-hue themes (forest, ocean) Work and Social Security were two
  near greens. The layers now differ by how light they are: Other darkest, then Investments, Work, and Social
  Security palest; a name is beside each color. (2) After both steps were counted, late years showed "Not covered
  yet" with no reason given. The line now names the cause (the two costs that are on the chart and not in the number)
  and has the button to count each. (3) The "i" of a step was a 26px target; the whole row is the button now.
- The uneven income of the third persona has no place in the four taps: the entry asks one rough saving amount. The
  rest of setup asks "steady or not".

## What is assumed (all in Show the math)

- Growth (the owner's answer, Nov 27 2026): investments grow 7% a year for the whole chart, while you work and after
  (the game's `R`). The 4% (the game's `SWR`) is what is taken out: it sizes the two numbers (25 times a year of
  spending). It is not a growth rate. So the pile is expected to end higher than it started. That is the cushion for
  years the market goes down, and the last screen and Show the math say so. Today's dollars. In the math: `grow` is the
  one growth rate, `take` the withdrawal rate; a caller can still give a lower `draw` rate, and none does.
- Social Security: the game's own estimate from today's pay, from 67. Counted only when the player counts it, at the
  share the player chose.
- The spending shape, when counted: the same spending to 75, then the shares above. Total spending only: late health
  costs can differ.
- Health insurance of your own from the year work stops until 65: the player's tap, else the typical benchmark plan
  (KFF, plan year 2027, a 40-year-old, before any help with the price), marked a Guess.
- (Changed in Batch B, phase 2a: the state's income tax is counted when a state is picked, and the target takes each
  year's tax from the same run as the chart. See the last section.)
- Tax on traditional withdrawals: the federal tax on that year's traditional money alone (`retireTax`). No state tax,
  no tax on Social Security, no early-withdrawal charge.
- Until the accounts are listed, the invested amount counts as one traditional plan at work.

## Batch B, phase 1: top-ups (Nov 27 2026)

- The lifetime spending total. `lyLifetime(p)` in `js/math/paylayers.js`: today's spending a year for each year from
  today's age to 95, times the spending shape when `p.shape` is given (the screen gives none: the standard way). Today's
  dollars, no growth, no health insurance, no tax. `cbLife(c)` in the game adds the round figure, a month of spending,
  the Guess / Close / Exact state and whether the total is more than the FI number. The second engine adds it up in
  closed form (`tools/audit`).
- Social Security has three presets: Not counting on it, Count part of it, Count all of it. The part is
  `cbPartShare(c)`: a part share the profile already holds in `c.x.ss` (setup offers 75%), else
  `socialSecurity.trustFund.payable` (83%). Before any tap the drop is shown for all of it.
- The last screen lists the ways from the flow's own list. `cbWays()` gives `[{ id, title, n, of }]`; `cbWayNo(id)` gives
  "Way 2 of 5". A later phase adds a way with `cbStepAdd(id, view, { title })`: it is numbered with the others and is a
  row of "What you counted", which reads `cbWayState(c, id)` (what `cbCount(id, opts)` counted, and the answer in
  `c.x.cb.how[id]`). A step added with no title is a screen between the ways (a card, a reveal) and is not listed.
- The words under the chips of a strategy step come from `cbPreview` (`shown`, `ssMonth`, `ssCount`): the screen does
  no multiplication.
- One opening: `game/tests/what-it-could-be-top-ups.js` walks Start and the four taps and checks that every screen on
  the way is the flow's own, and that the landing, Start and a first game from the cloud all call `cbStart`.

## Batch B, phase 2a: back-end taxes (Nov 27 2026)

The way "Pay less tax on the way out", Way 3 of 3. File: `game/features/cbtax.js`. Math: `js/math/paylayers.js`.

- The idea. The 25 times rule counts no tax. Money in a traditional account is taxed when it comes out. The usual
  order (taxable, then traditional, then Roth: the order of the chart) leaves years with no taxed income and years
  with a lot of it. The plan levels that: each year after work, traditional money first up to a fill line (bracket
  filling); what the year does not need of that line moves from traditional to Roth (a Roth conversion); the rest
  comes from the taxable account (the plan keeps taxable income low, which is where long-term gains are taxed at 0%)
  and then from Roth.
- The math. `lyYears` takes `p.plan = { fill }` and gives `conv` (moved to Roth) and `ord` (the year's ordinary income
  from traditional money) on each row. `lyTarget` with a tax now runs the same year-by-year run from the day work
  stops: the target is split over the accounts in the shares of `lyShares`, and the target and the taxes are found by
  going round until the target settles. Before this phase it taxed a fixed share of each year. For a player whose
  money is all traditional the number is the same as before; for a mix it follows the chart's order now.
  `lyTaxPlan(p, counted, lines)` tries each fill line on the day work stops and keeps the one with the lowest target;
  a line that does not beat the usual order by a dollar is no plan. It returns the two numbers the usual way and
  with the plan, the receipt of the plan, and what the tax itself adds.
- The fill lines come from the game's tax engine (`retireTax`): the standard deduction, and the deduction plus the
  top of the 10%, 12% and 22% brackets, for the filing status. `cbTaxLines(c)`.
- Counting. The plan is a plan for a cost, so "Count this" counts the tax itself (`count.wtax`) and the plan
  (`count.taxplan`). "What it could be" is then above the number with no tax, and the top of the screen says why. The
  receipt is the plan against the usual order, both with the tax counted. "Not for me" takes the plan out, and the tax
  too when this way brought it in. Taking the tax out on the chart takes the plan out. The profile holds no dollars
  of the plan: `cbCounted(c)` finds the fill line again (`cbTaxFill`).
- Two taps. The filing status and the state are asked with the kit's `kitAsk` and go to the tax view's own answers
  (`c.x.taxv`), their one home. `cbFiling(c)` reads them for the whole flow. Until a tap, the filing status is the
  game's guess and no state is counted.
- When no plan applies (`cbTaxPlan(c).applies` is false, `why` is one of none, nopre, onekind, nogain): the screen
  shows "No drop yet", the reason in plain words, what the tax adds the usual way, and no button that counts nothing.
  The four taps of the entry make one traditional plan at work, so every new player sees this until the accounts are
  listed (QUESTIONS 648).
- The chart: `cbChart(c, zoom, { split, plan })`. The screen shows it split by account, with the plan. Below it a
  collapsed table, 5 years a row: traditional, moved to Roth, taxable, Roth, the tax, the highest federal bracket.
- Tax figures, one dated file: `data/reference-2026.json`, `tax` (the standard deduction, the brackets, and from this
  phase `capitalGains`: the 0% and 15% lines), each with its source and date in `js/registry/assumptions.js`. The
  build tool puts them into the game's copy as `LY_TAX_REF`. The game's tax engine has its own tables;
  `game/tests/what-it-could-be-taxes.js` fails when they differ from the file.
- Not counted: tax on Social Security, tax on gains in a taxable account (the game has no gains yet), required
  withdrawals from 73, the early-withdrawal charge, a state's own rules for retirement income, the extra deduction
  at 65 for a player who is younger today, and changes of the law.

### The pattern for the next phase (2b to 2f)

- One file for a way: `game/features/cb<name>.js`, a script tag after `features/cbtax.js`, the file header, and at
  the end `cbStepAdd("id", () => view(), { title })`. The order of the script tags is the order of the ways.
- The view: `head(cbWayNo(id), title) + cbTop(C()) + why + the "i" row (term with "What has to go right" and "Backup
  if it doesn't") + the drop tile (`data-fid="cb:drop"`) + three buttons + the receipt (`data-fid="cb:receipt"`) +
  `cbChartCard(K, title, cap)` + `mathBox([...])` + Next + Back + `cbFoot()`.
- A count the math must read: add the key to `lyCounted` and `lyNumbers` in `js/math/paylayers.js`, then
  `node tools/game_paylayers_build.mjs`, the second engine (`tools/audit/cases.mjs`, `engine2.py`), `node --test`.
  If the count needs a number that changes with the player, keep no dollars on the profile: resolve it in
  `cbCounted(c)` as `taxplan` does.
- Use `cbLy(p, counted)` for the two numbers (it keeps the answer for the same input). Put a new field of
  `cbParams` that a function stands on into `taxKey` or a plain value, so two inputs are told apart.
- The tests of the flow count ways from `cbWays()`, not from a fixed number, so a new way breaks none of them.
- For 2e (hide what cannot apply, say why): each way gives `applies` and `why`; `cbTaxPlan(c)` is the example.

## Batch B, phases 2b to 2f: the rest of the stack (Nov 27 2026)

What a new player sees now, after the four taps and "What it is":

| Tap | Screen |
|----:|--------|
| 6 | The layer chart |
| 7 | The stack: every way in two groups, sorted, with a counter and the backups meter. One tap on "Count this" beside a way counts it; a tap on the way opens its screen |
| 8 | The last screen (11 when three ways are counted from the list) |

- **The stack** (`game/features/cbstack.js`, W.step `stack`, not in `CB_STEPS`). `cbStack(c)` gives the two groups.
  "After work: ways to shrink the number" is the ways of `cbWays()` that can apply, the most months sooner first, then
  the most dollars off. "Before FI: ways to get there sooner" is `cbMoves(c)`, the most months first. What cannot apply
  is under a closed "i" with its reason, and each reason opens the way's own screen.
- **Each way gives two things with `cbStepAdd`**: `info(c)` returns `{ applies, why, receipt, st, backup: { words,
  auto } }` and `set(how)` takes count, did or no. The stack sorts, hides and counts with them. `cbStepNear` makes Next
  and Back pass over a way that cannot apply. The last screen lists only the ways that can apply.
- **2b, flexible withdrawals** (`game/features/cbflex.js`). `cbFlexFind(stop, stock)` runs each real start year from
  the stop age to 95 (`cmpReal` of ways.js, the rules of `core/withdraw.js`): the fixed 4% rule, then guardrails at
  4.1%, 4.2% and so on, and keeps the highest rate at which guardrails held in at least as many start years. Social
  Security and other income are left out, so both rules get the same test. `lyFlex` in `js/math/paylayers.js` reads
  the rate only when it is above the standard rate, so the way can never raise the number. The profile holds no rate.
- **2c, money that shows up later** (`game/features/cblater.js`). The three questions are the game's own (`LIFE`:
  pension, homepmt, homeyrs) and `lifeSet` writes them. A pension is the count `other`. A payment that ends is the new
  count `ends`: `lyEndsAt(p, age)` takes it off the year's spending from the age it ends, the needs first. The list of
  payments is the game's own `endsOf(c)`.
- **2d, the accumulation stack** (`game/features/cbmoves.js`). No new card. Each row is a move of the Strategy Engine
  (`stgRank`), or a lever or multiplier that no move covers (`lvLevers`, `muAll`). Months sooner is `stgImpact` of
  strat.js for all of them: the game's month-by-month goal run. A counted move does not change the two pinned numbers,
  because they come from `core/paylayers.js`; the stack shows the months of the counted moves together.
  "Already doing it" writes the move's own answer (`c.x.stg[id].already`); a counted multiplier is switched on on its
  board (`c.x.mu.on`).
- **2f, the counter and the backups.** `cbStackLine` shows "3 of 14 stacked" and "Backups in place: N of M" on the
  stack and on the last screen. `cbBackupRow` shows the backup of a way on its screen. A backup is in place by the
  choice where the game can read it (half as much easing; part of Social Security; needs that fit inside the deepest
  cut; the tax plan, which is a choice made again each year), and by one tap where it cannot (`c.x.cb.bk`). No backup
  changes a number. "What it is" is never moved by anything in the flow.
- **No new outside figure.** The guardrails rule (20% bands, 10% steps, never under 70%) and its source are in
  `js/math/withdraw.js` since the withdrawal ways were built. The market history is `game/data/market.js` (Robert
  Shiller's data, fetched Nov 12 2026). The search step of 0.1% is a setting of the search, not a rate.

### The pattern for the next phase (3 to 7)

- A screen between the ways (the "Yes, but" cards of phase 3): `cbStepAdd("id", view)` with no title. It is a step of
  the flow and not a way: not numbered, not on the stack. To put it between the two groups of the stack, add a row or
  a button to `cbStackView` (it is the screen that decides the order of its parts), or open it with
  `data-a="cbgo" data-v="id"`.
- A new way to shrink the number: one file `game/features/cb<name>.js`, a script tag after `features/cblater.js` and
  before `features/cbmoves.js`, and `cbStepAdd(id, view, { title, info, set })`. Use `cbWhyRow(id, term)` for the "i"
  and the backup, and `cbWayNav(done)` for Next, Back and All the ways.
- A count the math must read: `lyCounted` and `lyNumbers` in `js/math/paylayers.js`, the build tool, both audit files.
  If two ways resolve a number for each other (`taxplan` and `flex` do), one of them must stand on the profile alone:
  `cbFlexTake` does, so there is no loop.
- The reveal of phase 4 can read everything from `cbStack(c)`: what is counted, the counter, the backups, and
  `movesSum` (the months of the counted moves).
- The code map takes about 6 minutes. Change all scripts first.


## Batch B, phase 3: the "Yes, but" card (Nov 27 2026)

File: `game/features/cbyesbut.js`. Test: `game/tests/what-it-could-be-yes-but.js`.

- **Where.** A step of the flow with no title (W.step `yesbut`): not a way, not numbered, not in the counter. The
  stack has a row for it between its two groups (`cbYbStackRow`, called from `cbStackView`). Next from the last way
  that applies goes to it, then to the last screen.
- **The halves.** Yes: each spending line of the player (`c.spends` with an amount) is a toggle; three chips set how
  big the cut is (a tenth, a quarter, half). But: the same lines; three chips (keep as it is, a tenth more, a quarter
  more). A line is in one half only. `CBY_SIZE` holds the chips: they are choices of the player, not rates from
  outside.
- **The math.** `cbYbStep` is `vlStep` of values.js (to the $10, at least $10; a cut is never more than the line).
  `cbYbImp(c, monthly)` is `stgImpact(c, { save: monthly })`: the game's month-by-month goal run, the same engine as
  the moves of the stack. It fits a monthly change of spending because the run both saves more each month and sizes
  the FI number on the lower spending. The engine of the two pinned numbers (`core/paylayers.js`) is not used here,
  so the card moves neither of them. The net is one more run with the cuts less the upgrades, not the two prices
  subtracted. `cbYbPick(c)` returns the two halves and the net; `cbYb(c)` adds each line with its price and the pairs.
- **The pairs.** `cbYbOrder`: with ranked values and at least one line that has its values (`vlGet`, `vlServes`), the
  first cut is the line whose best value is ranked lowest (a line that serves none comes first), and the first keep
  is the line that serves the top value. Without them: the biggest line as the cut, the smallest as the keep, and the
  screen says so, with the reason behind an "i" and a button to the ranking.
- **The image.** `cbYbCard(P)` gives the words (line names, the size in words, the months of each half, the net, the
  advice line); `cbYbPaint(card)` draws them on a 1080 by 1350 canvas with the colors of the page root, so a look that
  is switched on does not change it. Save is a download; Send uses the share sheet of the device when it takes files.
  No dollar amount is on the image.
- **Stored.** `c.x.cb.yb { yes, but, ys, bs }`: names of lines and two sizes. No dollars.
- **The credit.** The idea `yesbut` in `game/features/ideas4.js` (Famous money ideas, group spending). Its `by` line
  says that the name of the source is to be added (QUESTIONS 650).
- **Not built.** A card does not change What it could be, the counter, or the months of the counted moves. Typical
  prices of named cuts (a streaming plan, a gym) are not used: every price is the player's own line.

### The pattern for the next phase (4 to 7)

- The reveal can read the card from `cbYbPick(c)`: `n` (lines on the card), `yes.names`, `but.names`, `net.words`,
  `net.months`. "Share my card" can use `cbYbCard` and `cbYbPaint` as they are, or draw its own card with the same
  painter pattern (words first as plain data, then one function that draws).
- A row on the stack from another file: a named part (`cbYbStackRow`) called from `cbStackView` behind a typeof test.
- A test that walks Next through the flow must pass a step that is not a way (see `what-it-could-be-top-ups.js`).
- A test player with costly debt belongs in every new test of the flow: phase 2d broke for one and no test saw it.
- In Chromium wait about a second after a tap that opens a screen: the sheet scrolls to its top first.


## Batch B, phase 4: the reveal, the card to share, Home, the day after (Nov 27 2026)

File: `game/features/cbreveal.js`. Test: `game/tests/what-it-could-be-reveal.js`.

| Tap | Screen |
|----:|--------|
| 5 | What it is (the first number) |
| 6 | The layer chart |
| 7 | The stack |
| 8 | The reveal (11 with three things counted on the stack) |
| 9 | The last screen: Save my plan, Share my card, Tell Eli what broke |

- **The reveal** (W.step `reveal`, added with `cbStepAdd`; `cbStepAdd` puts every later step before it). `cbReveal(c)`
  returns the chart, the two numbers, the stack, `diff` (`off` to the $1,000, `months`, `years`, the words) and `items`
  (each counted way, cost, move and the Yes, but card, with `deep`: the action that opens its deeper feature). The
  difference is `lyReceipt` of the two numbers and nothing else. The months of the counted moves and the net of the
  Yes, but card are on their own line (`cb:revmoves`) with the "i" `cbtwo`: two engines, not added.
- **Every switch** is on the reveal: the layers and the split (`cbLayerToggles`, a part of the chart screen now), the
  ways as chips in the order of the flow (`cbquick`), the two costs (`cbcount`).
- **Deeper features** (`CBR_DEEP`): shape and ss open Retirement odds; taxplan and the tax cost open Your tax view;
  flex opens Taking money out, Guardrails; later opens Make it exact; health opens Taking money out, Health cover; a
  move carries its own (`cbMoves`: `open`); the card opens Is my money going where I want.
- **The last screen** (`cbEndView` in couldbe.js): the two numbers, one line, three buttons. `cbsave`: a visitor goes
  to the account door (`doorsave`), anyone else reads where the plan is kept (`cbSaveState`). `cbshare`:
  `cbYbImage("send", cbPlanCard(cbReveal(c)))`, the one painter. The card has ages, names and time, no dollars. The
  rest of setup is on the tile of Home and on Next Steps.
- **Next Steps** (`cbTopRows`, called from `planTabCb`): `cbTopMoves(c)` gives 3 at most, counted first, then the most
  days sooner. "Add to my steps" is `stgAddSteps(c, id)` of strat.js. They show after the reveal was seen once
  (`c.x.cb.rev`).
- **Home** (`homeCbTile`, called from `homeQuadTop` in ux.js before the four cards): the two numbers, the small chart
  (`cbChartHtml(K, { small: true })`: no taps inside), "Pick up where you left off" (`c.x.cb.at`, kept by `cbAt` on each
  move in the flow; `ACT.cbback`). Only for a player with `c.x.cb`. The class `cbq` on `.rstop` stills every pulse on
  Home but the button of Your next win.
- **The day after.** `cbSeenKeep()` writes `c.x.cb.seen = { day, n }` when the page is put away, at the reveal and on
  the last screen; a snapshot of an earlier day moves to `was`. `cbSince(c)` compares the last earlier day with now:
  `rcpDiff` of receipt.js, and one line for each of the two numbers that moved ("Recalculating route" when one went
  up).

### The pattern for the next phase (5 to 7)

- "After the reveal" for phase 5 is `c.x.cb.rev` (the ISO day the reveal was first seen). The first day of a player is
  `c.x.cb.seen` or the day the profile was made.
- A new step of the flow goes before the reveal by itself (`cbStepAdd`). Do not add a button to the last screen: it has
  three. Put a new way on in the stack, the reveal lists it from `cbStack(c)`, and give it a row in `CBR_DEEP`.
- A row or a tile on Home: a named part called from `homeQuadTop` (ux.js) inside `.rstop`, before or after the cards.
  A new pulse on Home breaks 4e: the test reads the CSS rule, and the walk counts what pulses in Chromium.
- Phase 6 (the in-debt version) can reuse the reveal's shape: a function that returns `{ N, diff, items }` and the
  same views. The card to share is `cbYbPaint` with `{ brand, title, yes, mid, net, but, foot, file }`.
- Tests that open the last screen must not look for `cbrest` there: it is on Home (`cb:homerest`) and Next Steps.
- The browser walks `tools/e2e/door_walk.cjs` and `launch_walk.cjs` now tap stack, reveal, end, Home. Run them after a
  change of the flow's order (serve the repository first; `SLAM_URL`).


## Batch B, phase 5: a calmer first week (Nov 27 2026)

File: `game/features/firstweek.js`. Data: `game/data/toollib.js`. Test: `game/tests/first-week.js`. Walk:
`tools/e2e/firstweek_walk.cjs`.

- **The rule** is one function: `fwRule(first, rev, today, inFlow)` returns `{ known, calm, day, back }`. Calm until
  `back`: the later of the first day plus 7 and the day the reveal was first seen. With no reveal a player of the flow
  stays calm (`back` is null). A player who did not come through the flow (no `c.x.cb`) has no reveal to wait for: 7
  days. With no first day: never calm.
- **The first day** is not a new field. `fwFirst(G)` is the earliest first snapshot of the profiles of the game
  (`hist[0].d`, written when setup ends). One profile with no such day makes it null: an existing game.
- **Who is never calmed.** The sample game, an account with the role coach or admin (`roCan("coach", ROLES)`), a game
  older than 7 days with the reveal seen or no flow, a game with no first day.
- **The bar** (`fwBar`, a part of `uxTabs`): Home, Next Steps, My Money, and a button "My number" (`cbback`: the flow
  where the player left off). My Goals, Me and + Log are not drawn. The top bar and the header of a sheet leave out
  Safe to spend and Where am I (`fwCalm` in `topbarHTML` and in `nvRowBase`). A hidden tab is still a tab: `go("goals")`,
  the address `#/goals` and a menu row open it; the bar stays the bar of the first week.
- **The menu** (`fwMenu`, a part of `menuSheetBase`; one group is drawn by `menuGroupHtml`). First week: "Back in the
  bar after your first week" (My Goals, Me, Log money), "Everything else" (My money, People and home, Plans and
  what-ifs, Tools and calculators, Learn, Games and quizzes, each a group inside it with the name `mng2` so it does not
  close its parent), "Tool library", Settings and account. After: the groups as before, with the Tool library before
  Settings. Find a tool also finds the three rows that left the bar and the pages of the library.
- **The "i"** (`fwMenuInfo`, the term `fwwhere`): one line on the menu with an "i" that says where everything went.
  It shows in the first week, and afterwards for a game that had the calmer week.
- **The Tool library.** `tools/game_toollib_build.mjs` reads the front door of the web app (`js/solo/hub.js`: its
  folds and link names) and `SOLO` of `js/solo.js`, and writes `TOOL_LIB_GROUPS`, `TOOL_LIB` and `TOOL_LIB_SKIP`. It
  stops when a page at the top of the repository has no place and no reason. Each page is a link `../page.html` in a
  new tab. Nothing is carried between the game and a page.
- **New for you** (`homeFwNote`, a part of `homeQuadTop`, inside `.rstop` before the tile of the two numbers): one
  line and "Got it" (`fwok`). No pulse. It shows only to a game that had the calmer week: `fwKeep` (a part of
  `renderUxEnd`) writes `G.fw = { on }` the first time the calm bar is drawn, and "Got it" writes `G.fw.ok`.
- **Not built.** Home itself is not thinned. A last day for a player who never sees the reveal (QUESTIONS 652).

### The pattern for the next phase (6 and 7)

- A test player made with the four taps is in the first week: its bar has four places. A test about another feature
  that needs every tab sets an older first day: `G.chars.forEach(c => (c.hist[0].d = addDays(todayISO(), -40)))`.
  Tests that call `X("tab", "goals")` or `go("me")` need nothing: a hidden tab still opens.
- A browser walk of a new player must not tap My Goals, Me, + Log, Safe to spend or Where am I in the bars: open the
  menu, the group `later` or `more`, then the row. `tools/e2e/firstweek_walk.cjs` shows how to move a player to day 8
  in the page (`page.evaluate`).
- A new menu row: `MENU.push` as before. It is in "Everything else" in the first week by itself; `first-week.js`
  walks the registry and fails when a row is in one menu only.
- Phase 6 (the in-debt version) lives inside the flow, so the button "My number" already opens it. Phase 7 ("Test
  with a friend", task 3: get back Home and find your next move) runs for a first-week player: Home and Next Steps are
  in the bar.
- A new page at the top of the repository: add it to the web app's front door, then run
  `node tools/game_toollib_build.mjs` and the game steps.

## Batch B, the end of the run (Nov 27 2026)

- **Done:** phases 1, 2a to 2f, 3, 4, 5 and 7. **Skipped, not built:** phase 6, the in-debt version (Eli: "skip and
  report if the run is already long").
- **Taps from the landing:** 5 to the first number, 8 to the reveal, 11 with three ways counted.
- **Phase 7a.** Test with a friend (admin menu, `features/testkit.js`) has three tasks: find out what your number
  could be; switch Social Security off and say what changed; get back Home and find your next move. While a task runs
  the game counts the taps and keeps the names of the screens (`tkTapAdd`, `tkAt`); "done or stuck" notes the screen
  where the person stopped (`tkStop`). The button "done or stuck" now shows over a sheet too, at the bottom (the flow
  is a sheet). No sound, no picture, no field value. The record is in the saved game
  (`G.tests`, the last 20). Tester drives (`features/thinkaloud.js`) reads the same three tasks.
- **Phase 7b.** The list "Waiting on Eli: yes or no" is at the top of QUESTIONS.md.
- **Finish setup** comes back to the page the player left (`cbRestSpot` in `features/couldbe.js`, from the copy that
  `questlog.js` keeps, for 7 days).
- **The add-on rule (Eli, Nov 27 2026).** The LGBTQ+ money tools are an add-on: off for standard players. The tool
  that makes the Tool library holds the fold and the page one.html out of the game (`HELD_FOLDS`, `HELD_DOORS`;
  `--held` prints them). The library has 72 pages in 9 groups. A What's new entry with `ao: true` does not show in the
  game. Excluded, not yet switchable.
- **Not wired:** counted moves and the Yes, but card do not move the two numbers on top (two calculations, QUESTIONS
  649); a new player sees "No drop yet" on the tax way; state rules for retirement income; a pension's own start age;
  a last day for the calmer bar; Where am I does not point back to an unfinished "Finish setup"; the add-on switch for
  the held pages; the web app still shows those pages to everyone.


## Run SLAM-ONBOARD-1, worker 1 (Nov 27 2026)

- **The order of the first screens.** `cbOpen()` sets `W.step` to `wants` for a new player, and `cbSheet()` draws `wnView()` for it (`features/wants.js`). "Next: four quick taps" and "Skip for now" set `W.step` to `entry`. Then the steps of `CB_STEPS`. The wants screen is not in `CB_STEPS`: `cbStepAdd` puts a step after the entry, before the reveal.
- **The picks.** Before the player is made: `W.wp` (ids of `WN_LIST`), `W.own` (names from Add my own), then `W.o.wants` (`[{ k, n }]`). After: goals in `c.goals` with the name of the chip (`g.n`), Someday (`era` null), no rank. During the rest of setup they are in `W.o.goals`. No new key on a profile.
- **Read a pick.** `wnMatch(c, tags)` gives the first want that is about one of the tags, or null: a lever (`interest`, `income`, `spending`, `taxes`), a round (`D`, `A`, `I`, `T`, `E`) or `fi`. In a setup round pass `W.o` as the profile. Change the tags in `WN_LIST`.
- **A typical answer.** `c.x.cb.a[q].typ` is true. `cbTypUsed(c)` lists them until the rest of setup is done. Sources: spend, BLS Consumer Expenditure Survey 2024 by age (total less personal insurance and pensions); invested, the Fed's Survey of Consumer Finances 2025 (read through a web search, not yet checked on the Fed's page); saved, the BEA personal saving rate on the typical spending of the age.
- **The strip.** `cbSlim(step)` is false for `is`, `chart` and `layer`, true for every other step. A new step of the flow gets the strip by itself.
- **Taps.** 6 to the first number, 9 to the reveal, 10 to the last screen (one more than before: the new screen).
- **A test player.** `X("start"); X("wnskip");` then the four taps. A tap on a range chip does nothing while What you want is open.

## Run SLAM-ONBOARD-1, worker 2 (Nov 27 2026)

- **The order of the rounds.** `SM_ORDER` in `screens/smart.js` and `SP_ROUNDS` in `features/spiral.js`: About you (pages 0, 1, 2, 3), D (4, 9, 10), A (5, 11, 7), I (12), T (8), E (13, 6). `tests/setup-order-and-account.js` fails when the two lists differ from this.
- **The age.** In the rest of setup the age page is passed over. The first page shows the age with "Change" (`smAgeRow`, `ACT.smage`). A changed age is written to `c.x.cb.a.age` when setup ends.
- **How money feels.** The last question of page 3. "I'd rather not look" sets `W.o.gentle` at once. The rounds then read `c.gentle`: `spEraName`, the fold of the D number, the D summary. The gentle words are in `GENTLE_ERA` (`ui.js`).
- **Social Security.** `smSsDone(w)` is true when the way `ss` of the flow has an answer. Page 6 then has no question, only the name.
- **Why a round asks.** `spWhy(w, R)`. To change which want is about which round, change the tags in `WN_LIST`.
- **The resume point.** `W.ord` is the number of the page order (`SM_ORDER_V`). When you change `SM_ORDER` again, raise `SM_ORDER_V` and extend `smSpotFix`.
- **A new page that a later answer can bring in:** give it `maybe: w => ...` next to `skip`, so that "page X of N" counts it while it is ahead.
- **Create account.** `suGateTop`, `suPwBox` and `homeConfirmRow` in `account/supa.js`. The row shows while `su_wait` holds an address and nobody is signed in.
- **Taps.** 10 to the last screen of the flow, 44 to "Here's where you stand" with the simplest answers.
- **Not built.** The cards page is still asked when the player did not tap "Credit card balance" (it also counts cards paid in full). The confirm row has no "I confirmed" button: the player signs in from "Keep this game" on Home.

## Run 16, audit fixes batch 1, worker 1 (Nov 27 2026): sections A and B

- **The last screen is the result.** `cbEndView()` shows what `cbResult(c)` returns (`features/cbreveal.js`): the era (`eraName`, `eraOne`), the first move, where the answers are kept. One primary button, `data-a="cbfirst"`, and one Back (`cbgo`, `prev`). The frame of the sheet is hidden on this one screen by a style line (`.sheet:has(.cbresgo)`).
- **The three old buttons.** Keep my plan, Share my card and Tell Eli what broke are on the reveal, in the closed row "Keep it, share it, or tell Eli" (`data-fid="cb:end3"`). The actions did not change (`cbsave`, `cbshare`, `flag`).
- **The first move.** `cbFirstPick(c, d, src)` is the one picker for the result and for Home. `src` "cb": `cbFirstMove(c)`. `src` "era", or no move: the key step of the next era (`erNext`). `c.x.cb.first` ("cb" or "era") is set by the tap on "Start my first move" and removed by "Start this move" on Home (`ACT.cbfirstgo`).
- **Home.** `homeQuadTop()` in `screens/ux.js` sets the order: `homeStatRow` (four tiles, `features/look.js`), then ONE card (`homeFirstCard`, else `homeResults`: Your next win), then `.rsmore` (the tile of the two numbers, `homeResultsMore`). A new card for Home goes in `.rsmore` or under `<!--homerows-->`, never above the card.
- **One pulse.** The next-step card has it. The style line `.hq.rs .rsmore .pulse ...` stills the rest. Do not add `pulse` or `go` to a card of `.rsmore`.
- **A tile with an "i".** `dkTile(label, value, { info: "<glossary key>", act, v, move: { k, to } })`. With `info` the number is the button and the "i" sits next to the label.
- **A number that moves.** Put `data-cbn="<key>"` and `data-to="<number>"` on the element, and call `cbNumsMove(elements, lastValues, format)` after the draw. `homeNumsMove()` does this for Home. It respects "less motion".
- **From the demo.** `erIn()` makes the profile and Home opens (`W.erHome`, `finishSetupCb`). `c.x.cb.era` names the setup answers that the demo gave (`cush`, `debts`, `tax`). `openSetupCb()` copies only those into the rounds. The landing is passed over (`doorFromDemo` in `account/door.js`).
- **Not asked twice.** The amount invested: `amCarryInv(base)` fills the account question with an answer that is not applied (`v: null`, `kept: true`), so the row stays a Guess. Spending: `amGroupGuess(o, i)` gives the share of the quick answer for a group. To carry one more answer, add it to `openSetupCb()`.
- **The look of the demo page.** `game/era/gamelook.css` is a copy of style lines of `game/index.html`. Add a line to `LOOK` in `tools/game_era_build.mjs`, then run the tool.
- **Taps.** 6 to the first number, 10 to the result, 11 to Home. From the demo: 8 or 9 taps to its result, one more to Home.
- **A test player from the demo.** `box[ER_KEY] = erPack(A); X("start");` with a stand-in for `localStorage` (see `tests/onboarding-handoff-and-home.js`).
- **Not built.** The demo cannot show the first move of the flow (it needs the whole game), so a demo player's first move is the key step of the next era. Income is still asked in the rounds: the opening never asked it.


## Run 16, audit fixes batch 1, worker 2 (Nov 27 2026): sections C and D

- **A new question.** Give it the choice `NOT_SURE` and the line `TAP_ONE` (both in `core/engine.js`). In setup, a question of `SM_Q` gets both from `smChips()`; a step of `amSteps()` gets both from `amStepHtml()`; a way screen calls `cbWayUnsure()`; a range question gets both from `cbChips()`. The table `docs/question-rewrites.md` gets one row.
- **What "I'm not sure" keeps.** A typical value marked Guess where the game has one (`cbTypical`, or the most likely choice: `smUnsureFill`). Else nothing. Never a number made up for the tap. The names of such setup answers are in `c.x.unsure`.
- **New words for a choice.** Do not change the kept value. Put the new words in `lab` of the question (`smLab`). `SM_OWN` names the old choices that now read "I'm not sure".
- **The demo.** `ER_TYP` ("typ") is the answer of a range question for "I'm not sure". The page loads `core/peers.js`, `core/withdraw.js` and `core/paylayers.js` for the typical values, and `cbTypical` is in the generated copy.
- **The sheet "People".** It only switches people. A new row about people goes to `meTabPeople()` in `screens/profiles.js` (a part named `mePeople...` in the feature file), not to the sheet. Its header (`nvRow` in `screens/nav.js`, the class `nvtwo`) has Back and Close only.
- **Arrows.** Write `<i class=chev aria-hidden=true></i>` (forward) or `<i class=chevl aria-hidden=true></i>` (back). Do not type an arrow character: `tests/not-sure-and-profile-sheet.js` scans every screen file.

## Run 14, the usability pass, worker 1 (Nov 27 2026): items 1 to 7

### The Krug self-check, BEFORE (for worker 2: run it again and report before and after)

The script is `tools/e2e/krug_flow.cjs` (serve the repository, then `SLAM_URL=http://localhost:<port> node tools/e2e/krug_flow.cjs`; `KRUG_OUT=<file>` keeps the numbers of each screen). Four made-up players, a new visitor each, at 390, 1280 and 1440 wide. Each one taps what such a person wants on What you want, then Next, the four range chips, and then the one main button of each screen. Taps are counted from the landing (Start is tap 1). The tree was `ad7a849`, before any change of this run.

| Player | What you want | The four chips | To the first number | To the result | To Home |
|--------|---------------|----------------|--------------------:|--------------:|--------:|
| 27, renting, $60K invested | Retire early | 25 to 29; $3k to $4k; $50k to $100k; $500 to $1k | 7 | 11 | 12 |
| 38, a couple, a 401(k) match and a mortgage | Retire on time; Have or raise kids | 35 to 39; $7k to $10k; $250k to $500k; $1k to $2k | 8 | 12 | 13 |
| 31, self-employed, uneven income | Build a cushion; Start a business | 30 to 34; $3k to $4k; $10k to $50k; $250 to $500 | 8 | 12 | 13 |
| 29, with $18K of card debt | Get out of debt | 25 to 29; $3k to $4k; under $10k; under $250 | 7 | 11 | 12 |

- The counts were the same at the three widths. With "I'm not sure" on What you want (no pick) each count is 6, 10 and 11.
- Before, on the same walk: the four questions had no control that pulsed (every other screen had one); the stack and the reveal opened at the top after the tap; no sideways scroll. How tall each screen was, in windows (390 x 844): What it is 1.1, the chart 2.2, the stack 2.2, the reveal 2.6. At 1280 and 1440 (900 high): 0.9, 2.0, 1.8, 2.3.
- After items 1 to 7 (worker 1, the same walk; worker 2 runs it again at the end): the tap counts did not change; each screen has one pulse; no screen opens at the top after a tap; at 390 What it is 0.9, the chart 1.5, the stack 2.3, the reveal 1.9.
- The script prints the same four facts after a change, so before and after can be read side by side.

### What changed, and the pattern for the next change

- **One pulse (item 1).** The class `cbnext` marks the next tap of a screen. A view writes it on one control. `cbSheet()` passes each screen through `cbOne()` (`features/cbguide.js`): the first mark stays, any other is taken off, and a screen with no mark gets it on its first main button. The style lines are in `game/index.html` under "run 14": `.cbnext` has the pulse of the game, each other pulse of a flow screen is still, each other button is a little paler (0.8; a pale range chip 0.7). A flow screen is a sheet that holds `.cbfoot`. Do not add `pulse` to a control of the flow: write `cbnext`.
- **Folds (item 2).** `cbFold(key, label, html)` puts content behind one tap, closed. The open folds of a screen are in `W.fo`, so a tap inside a fold does not close it. Folded now: what the number means (What it is); the chart in words, and the switches of the layers with the costs (the chart, the reveal); how the list works (the stack); what has to go right and the backup, and the plan for your numbers (each way); the two lists of the Yes, but card; the list of what you counted (the reveal).
- **Back and Forward (item 3).** `cbNav({ back, next })` is the one row. `back` is the attributes of the Back button (`data-a="cbgo" data-v="prev"`), or null on a first screen. A Back tap keeps the screen in `CB.fwd` (`cbFwdKeep`), `ACT.cbfwd` returns to it, and any other move calls `cbFwdDrop`. A button that cannot be used is off and one line under the row says why. The result has no row: one main button and a small Back (run 16).
- **No jump to the top (item 4).** No file of the flow calls `spUpSoon`. A sheet keeps its place (`drawSheetBase`). After a move to another screen `cbStaySoon()` moves the sheet only when the player was down the screen and the next tap is out of view.
- **Keep, not save (item 5).** The labels were already in place. Two buttons and three messages of the card image said "save": they say "Get this card as an image", "Done." and "Kept." now.
- **The most likely answer (item 6).** `cbLikely(q, age)` is the range chip that holds the typical value of the age (`cbTypical`); -1 when the reference data has none (the age itself, the health price). The rules are given to `screens/smart.js` (`SM.cb_spend` and so on) and `cbChips()` orders and fades the chips with `smOrder()`, as setup does. "I know it" and "I'm not sure" stay last. `cbOptWords(q, answer)` is the one line about the tapped choice; it shows on the screen that follows the tap (`cbSaid()`), because a tap on a chip answers and moves on.
- **The "i" (item 7).** `cbI("key")` is the button and `CB_GUIDE` has the two lines of each key (what it is, what it is for) and, where one exists, the word of the glossary with the longer text. A new card, chart, number, meter or group of buttons of the flow gets one line in `CB_GUIDE` and one `cbI()`. On a card: `dkCard(title, body, { right: cbI("key") })`.
- **Not built.** The result has no Forward and no "i" (the newer prompt asks for one button and a small Back). The age question has no "most likely" answer: the game has no dated figure for it, so the whole group of chips is the one pulse there.
