# What it is / What it could be (run A, Nov 27 2026)

The first thing a new player of SLAM the Game sees: one number and one chart. This page is the record of what was
there before, what the flow replaced as the opening, and how the flow is built. Steps 0 to 3 are built (worker 1).
Step 4 (the two strategy steps), the full last screen and the Krug self-check are the next worker's.

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
| after tap 5 | "What it is": the FI number (25 times a year of spending) and the age at today's pace, with "What it could be" beside it. They start equal |
| 6 | The layer chart |
| 7 | The last screen: both numbers, Finish setup, Next Steps, Home |

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

## For the next step (the strategy screens)

- A step registers itself: `cbStepAdd("shape", view)` puts a screen before the last one. `view()` returns the HTML:
  start with `head(small, title) + cbTop(C())`, end with `cbFoot()` (the one advice line). `data-a="cbgo"` with
  `data-v="next"` or `"prev"` moves along the steps.
- "Count this": `cbCount(id, opts)` returns `{ before, after, receipt: { off, months } }` (dollars off the target,
  months sooner). `cbCount(id, false)` takes it out. Ids the math reads today (`lyCounted`): `ss` (`{ share }`),
  `other`, `shape` (`{ bands: [{ from, f }] }`: from this age on, spending is f times today's), `health`, `wtax`.
  The chart follows what is counted (`cbChart`), and the header animates by itself after a redraw (`drawSheetCb`).
- The web app's lifetime plan already has go-go / slow-go / no-go factors (`slowGoAge`, `noGoAge` in
  `js/math/lifetime.js`): look there before writing new math for the spending shape.

## What is assumed (all in Show the math)

- Investments grow 7% a year while you work (the game's `R`) and 4% a year after prices once you draw on them (the
  game's `SWR`, the rate of the 25 times rule). Today's dollars.
- Social Security: the game's own estimate from today's pay, from 67. Counted only when the player counts it.
- Health insurance of your own from the year work stops until 65: the player's tap, else the typical benchmark plan
  (KFF, plan year 2027, a 40-year-old, before any help with the price), marked a Guess.
- Tax on traditional withdrawals: the federal tax on that year's traditional money alone (`retireTax`). No state tax,
  no tax on Social Security, no early-withdrawal charge.
- Until the accounts are listed, the invested amount counts as one traditional plan at work.
