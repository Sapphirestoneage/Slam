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

