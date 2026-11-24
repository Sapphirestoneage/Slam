# Status of the overnight build (started 2026-11-24)

This page lists what was in the repository before the run, by item of the prompt. The end of the page has what the
run added, and the click counts.

Sources: `game/features/built.js` (the game's own list of built features), `game/CODE-MAP.md`, the code, and one
set of phone-width screenshots of every tab and menu sheet.

Baseline before any change: `node --test` 1,222 pass, 0 fail. `npm run test:game` 1,454 checks ok, 0 failed.

## What was there before the run

| # | Item | Before the run | Where |
|---|------|----------------|-------|
| 1 | Bottom bar, menu, back and forward | Built. Five tabs with a one-line description, a three-line menu, Back and Forward on the top bar and on each sheet, the scroll place is kept. | `screens/ux.js`, `screens/planner.js`, `screens/nav.js` |
| 2 | Setup by demographic taps | Built. No amounts. Each answer puts the likely next answer first and fades the rest (`screens/smart.js`). "Between jobs" changes the income questions. | `screens/ui.js` SETUP, `screens/smart.js` |
| 3 | Character reveal | Half built. Six cards (chapter, era, who you are with money, strongest number, next unlock). No strengths and weaknesses, no "Does this feel accurate?", no "Which do you want to improve most?", no element with strong and weak sides. | `features/reveal.js` |
| 4 | Gear slots | Half built. "Your gear" is a tap game with three states. No explanation of a slot, no five states. | `features/games.js` |
| 5 | Three states for each step | Built. Done, Doesn't apply to me, Working on it, and "Already done". | `screens/ui.js`, `screens/planner.js`, `features/questlog.js` |
| 6 | Click counter | Half built. Setup counts taps. No measured count for two personas. | `screens/ui.js` |
| 7 | Coach profile switcher | Built. Many people in one game, "People I coach" mode, the name button on the top bar, saved to the account. | `screens/profiles.js`, `account/cloud.js` |
| 8 | Cash flow log | Built. In, out, a debt payment, a move between accounts, how it was paid, balances change everywhere, a typed exact rate, the catch question. | `screens/ui.js` (flowSheet, catchSheet, ratePad), `features/moneylog.js` |
| 9 | One ledger | Built. | `features/ledger.js` |
| 10 | Statements | Built. Net worth, cash flow, investments. | `features/ledger.js` |
| 11 | Next Steps by time | Built, but in the wrong place: Today / This week / Month / Year sits under the mission board. Recurring tasks, the seasonal list, "plan it" with a day and a time, and the roll to the next day are built. | `screens/planner.js` |
| 12 | Paycheck check-in | Built (before and after). The split has four places and typed amounts. No 25 to 100% presets, no "locked in or rough" mark. | `screens/planner.js`, `screens/ui.js` (paySheet) |
| 13 | A rhythm for each income source | Built. | `screens/smart.js` |
| 14 | Yearly reset and review | Built (limits reset, "Still true?", look back, next year). Extra calendars come from an add-on, which this repository cannot run. | `features/year.js`, `features/quota.js` |
| 15 | Time is the currency | Built for moves, goals and Safe to spend ("X days sooner / later"). | `core/engine.js` (timeShift), `features/kit.js` |
| 16 | Bucket list and eras | Built. Each goal gets an era by a tap, with its time. | `screens/ui.js` (eraPick, goalsCard), `features/countdown.js` |
| 17 | Time ledger, your money's hourly wage | Built. | `core/engine.js` (timeLedger, TP_Q), `features/slept.js` |
| 18 | Permission meter | Built ("Safe to spend?", always a trade-off). | `core/engine.js` (safeSpend) |
| 19 | Roadblock finder | Built for money and time, with "Is this really it?". Not all eight kinds. | `screens/ui.js` (goalBlock, goalView) |
| 20 | Fee and product X-ray | Half built. Fees of each account are in. A product next to its alternative is not. | `features/mix.js`, `features/compare.js` |
| 21 to 23 | Card plan (`cards.html`) | See the end of this page. | `js/cardplan.js`, `data/library/cards.json` |
| 24 | Life Transitions | Not built in the game. The pay-stopped ladder is the only piece. | `features/drills.js` (ldOf) |
| 25 | Kids mode | Not built. | |
| 26 | Google Sheets round trip | Half built. The web app has export and import. The game copies the plan out with formulas from one list (`BOOK_PARTS`). The game has no import. `LICENSE` (AGPL) is there. | `features/book.js`, `js/sheet/` |
| 27 | Money fire drills | Built (the fear on your numbers, one small action). No "how long it lasts" line and no small real doses. | `features/drills.js`, `drills.html` |
| 28 | US vs Israel calculator | Not built. The researched data is in `data/sources/israel-2026.json`. | |
| 29, 30 | Tier 7 tools | Not in this repository. See `QUESTIONS.md`, question 1 of this run. | |
| 31, 32 | Tests and math audit | A think-aloud test kit and a second engine exist for the web app. No think-aloud record for the game. | `features/testkit.js`, `tools/audit/` |

## What the run did

(Filled in at the end of the run.)
