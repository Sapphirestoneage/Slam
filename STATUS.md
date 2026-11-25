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
| 26 | Google Sheets round trip | Built as a file, not as a live link. Both apps download an .xlsx with live formulas (one writer, `js/sheet/excel.js`), with a FIRE sheet as the first tab, and both read an edited file back with a review of each change (Nov 25 2026). The file was checked in LibreOffice and against a list of functions Google Sheets has; nobody has opened it in Google Sheets itself yet. `LICENSE` (AGPL) is there. | `features/book.js`, `js/sheet/` |
| 27 | Money fire drills | Built (the fear on your numbers, one small action). No "how long it lasts" line and no small real doses. | `features/drills.js`, `drills.html` |
| 28 | US vs Israel calculator | Not built. The researched data is in `data/sources/israel-2026.json`. | |
| 29, 30 | Tier 7 tools | Not in this repository. See `QUESTIONS.md`, question 1 of this run. | |
| 31, 32 | Tests and math audit | A think-aloud test kit and a second engine exist for the web app. No think-aloud record for the game. | `features/testkit.js`, `tools/audit/` |

## What the run did

### Done

| # | Item | What was added | Where |
|---|------|----------------|-------|
| 1, 11 | Next Steps | Opens on Today / This week / Month / Year. The board under it uses plain words ("Do this first", "Also worth doing", "Bigger projects"). The game words show only with the gamer switch. | `screens/planner.js`, `features/missions.js` |
| 3 | Character reveal | Replaces "Your character is ready": strengths and weak spots as literal numbers, the money element (Earth, Water, Fire, Air, Spirit) with strong against and weak to, "Does this feel accurate?", "Which do you want to improve most?". | `features/element.js` |
| 4 | Gear slots | An explanation of a slot, and the states want it, need it, not interested, can't have it, inactive (a plan at work while between jobs). | `core/engine2.js`, `features/games.js` |
| 6 | Click counter | `node tools/game_clicks.cjs`. See the counts below. | `tools/game_clicks.cjs` |
| 20 | Product X-ray | The path you are on next to the alternative: insurance that also saves next to term cover and investing the rest, or an investment with fees next to a low-cost index fund. Dollars and days. | `features/xray.js` |
| 22 | Card plan | The balance and rate on each card, what a carried balance costs next to the biggest welcome offer, and the spending that can move to a new card inside the offer's window. | `js/math/cardplan.js`, `js/solo/cards.js` |
| 24 | Life Transitions | "Break in case of emergency" on My Goals: the dip of a layoff, tripwires, family help counted at its risk, quick income by time to the first dollar, four slots with one card each, advantages. | `features/transit.js` |
| 25 | Kids mode | A separate kid profile (not a player, no money numbers) with 20 short daily lessons. Under People and in the menu. | `features/kids.js`, `data/kidlessons.js` |
| 26 | Spreadsheet round trip | The plan's sheet has a section "Your numbers". Change values, bring the CSV file or the pasted rows back, see each change, then use them. One list of fields feeds the export and the import. | `features/book.js` |
| 27 | Fire drills | Each drill says how long it lasts and offers a small real dose. New drill: card interest. | `features/drills.js` |
| 28 | US vs Israel | `aliyah.html`, a page of the web app, linked from the front door. Every default is a Guess. | `js/math/aliyah.js`, `js/solo/aliyah.js` |
| 31 | Think-aloud test | Three personas, three tasks, two rounds. Three defects found and fixed. | `USABILITY.md` |
| 32 | Tests and math audit | FI number, Coast FI, debt payoff and runway each worked out a second way: 14 checks, all agree. | `game/tests/math-audit-core-numbers.js` |

### Already built before the run (checked, not changed)

Items 1 (bar, menu, back and forward), 2, 5, 7, 8, 9, 10, 12, 13, 15, 16, 17, 18, 19, 21 (93 welcome offers at 12 banks,
with the extra Chase cards) and 23 (the card plan is already one input, one answer, one pulsing step in the main plan).
These were checked by reading the code and by the walks. They were not tested again one by one.

### Partly done

- Item 2: nothing was moved out of setup. Roommates and parents are one multi-tap question, and subscription splits
  are not in setup. Setup has no question that can be answered "I don't know".
- Item 7: no migration was needed. The whole game, with each person, already saves to the account. Not tested against
  the real database here.
- Item 14: the yearly review and the limit resets are built. Extra calendars in the game come from an add-on that
  this repository cannot open, so that part was not checked. The web app's own calendar tests pass.
- Item 21: 23 cards have no welcome offer in the sources. They are blank, not guessed (the list is in `QUESTIONS.md`).
- Item 24: the first transition (a layoff) is built. Other transitions are not.
- Item 28: the US tax of a citizen who lives in Israel, National Insurance for the self-employed, and typical Israeli
  costs are not priced, because the data file has no figure for them. The page lists each one.

### Skipped, and why

- Items 29 and 30 (Tier 7): built, tested, and handed over as a zip file in the chat. Not in this repository:
  `CLAUDE.md` forbids add-on words here, the repository is public, and a push cannot be taken back. See question 1.
- The NYC FIRE event: not touched, as asked.
- No Supabase migration was written, because nothing new needs a table.
- `node tools/e2e/layout.cjs` as a full run needs a standing local server, which this session could not start. The
  two workers ran its scan on `cards.html` and `aliyah.html` from a short-lived server: 0 findings.

### Click counts (`node tools/game_clicks.cjs`, phone width)

| Persona | Clicks to the end of setup | Clicks to the first plan |
|---------|---------------------------:|-------------------------:|
| Speedrun (the simplest answers) | 17 | 22 |
| Most complex (four kinds of income, a household of four, five debts) | 28 | 33 |

The five clicks after setup are the character reveal.

### Tests at the end of the run

- `npm run test:game`: 67 files, 1,566 checks ok, 0 failed. Version stamps correct. `CODE-MAP.md`: 0 replaced
  functions, 0 functions with two declarations, 0 hidden errors.
- `node --test`: 1,240 pass, 0 fail, 43 skipped, 2 todo.
- New game screens opened at 390, 1280 and 1440 wide: no sideways scroll, no page errors, no error records.

### QA.md scores of the screens the run touched

Scale 1 to 5. Nothing above "minor" is open.

| Screen | Works | Right | One answer | Looks right | Obvious | Findable | Easy | Plain words | Tells you | Fits everywhere | Fast | Coachable |
|--------|------:|------:|-----------:|------------:|--------:|---------:|-----:|------------:|----------:|----------------:|-----:|----------:|
| Character reveal | 5 | 4 | 5 | 4 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 4 |
| Next Steps | 5 | 5 | 4 | 4 | 4 | 5 | 5 | 5 | 4 | 5 | 5 | 4 |
| Log money | 5 | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 |
| Safe to spend | 5 | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 |
| Product X-ray | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 4 | 4 | 5 | 5 | 4 |
| Break in case of emergency | 5 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 5 | 4 |
| Kids mode | 5 | 5 | 5 | 4 | 5 | 3 | 5 | 5 | 5 | 5 | 5 | 3 |
| Spreadsheet, the way back | 5 | 4 | 5 | 3 | 4 | 3 | 3 | 4 | 5 | 5 | 5 | 4 |

Minor, open: the reveal's strengths are an order of guesses until the numbers are real (it says so); the X-ray and
Kids mode are found in the menu and under People only; the way back needs one paste or one file, which is not a tap.

## RUN: Finish everything partly built (Nov 25 2026)

One row for each part of the run. "Done" means each item of the part is built, tested and pushed. "Partly" names what
is missing. The details and the questions of each part are in `PROGRESS.md` and `QUESTIONS.md`.

| Part | What | State | Notes |
|------|------|-------|-------|
| 1 | FI number variants | Done | Web app: Plan › Goals has "FI destinations" (Lean, Barista, Regular, Chubby, Fat, each with its number, date and what it assumes; the Fat list; the Barista gap and health insurance), "FI date stress test" and "Pod FI number" (two or more adults); Plan › FOO has "Your order by destination"; Home has the card "You can stop sprinting". Game: "FI ratio" on Key numbers (Freedom), and the same card on Home. Waiting for Eli: the Chubby midpoint, the three orders of the FOO, what counts as investment income (QUESTIONS 580). |
| 2 | Home buying and renting | Not started | |
| 3 | Career and education | Not started | |
| 4 | Travel | Not started | |
| 5 | Student loans | Not started | |
| 6 | Quizzes | Not started | |
| 7 | Money psychology | Not started | |
| 8 | Joy and enough | Not started | |
| 9 | Comparing with peers | Not started | |
| 10 | Benefits and health | Not started | |
| 11 | Estate and marriage | Not started | |
| 12 | Households | Not started | |
| 13 | Investing | Not started | |
| 14 | Taxes and self-employed | Not started | |
| 15 | Safety nets | Not started | |
| 16 | Giving | Not started | |
| 17 | Asking fewer questions | Not started | |
| 18 | Coach and reports | Not started | |
| 19 | Testing and math | Not started | |
| 20 | Game feel | Not started | |
| 21 | Spec rows marked Partly | Not started | |

## RUN: Not built, groups 1 to 5 (Nov 25 2026)

One row for each part of the run. "Done" means each item of the part is built, tested and pushed. "Partly" names what
is missing. The details and the questions of each part are in `PROGRESS.md` and `QUESTIONS.md`.

| Part | What | State | Notes |
|------|------|-------|-------|
| 1 | Recalculating and the audit | Done | Web app: Home, Budget, Debt, Debt payoff, and Report › History (the audit). Game: Home, the Money tab, the debt plan, the menu, the Yearly Review. One math file for both (`js/math/recalc.js`, copied to `game/core/recalc.js`). 37 strings reworded; `test/tone.test.js` keeps them out. Questions: QUESTIONS.md 581. |
| 2 | Quick calculators | Not started | |
| 3 | Lifestyle creep and enough | Not started | |
| 4 | Eli's frameworks and the canon | Not started | |
| 5 | Gig and self-employed | Not started | |
| 6 | Queer-specific tools | Not started | |
| 7 | Hard moments | Not started | |
| 8 | Family | Not started | |
| 9 | Ratios on Key numbers | Not started | |
| 10 | The game | Not started | |
| 11 | Quiz frameworks: one engine, many skins | Not started | |

## RUN: Launch ready for the Nov 30 soft launch (Nov 25 2026)

| Part | What | State | Notes |
|------|------|-------|-------|
| 1 | A stable public site | Done | The branch `release` and `bash tools/promote.sh` (both suites on the exact `main` commit, fast-forward only). "Coming soon" card in the game and the web app. Eli: switch GitHub Pages to `release` (`docs/RELEASE.md`). **Promote at the end of every run and say so in the summary.** |
| 2 | Report a bug or idea | Not started | |
| 3 | Founding Testers and sharing | Not started | |
| 4 | Trust | Not started | |
| 5 | Email | Done | `docs/EMAIL-SETUP.md`. Confirmed from Resend's and Supabase's pages (through search, read 2026-11-25): host, port, username, the key as password, the free plan limits, the Supabase links. Not confirmed, so the doc says to read them on the screen: Resend's sign-up labels, the exact labels of the Supabase fields and of "Confirm email", the starting hourly limit (30 or 25). Eli has to do the steps; question 582 in QUESTIONS.md. |
| 6 | The front door | Not started | |

## RUN: 4% rule vs guardrails and every way to take money out, side by side (Nov 25 2026)

| Part | What | State | Notes |
|------|------|-------|-------|
| 1 | Compare the ways: one screen in the game and in the web app lifetime plan | Done, with 2 ways switched off and 1 in the game only | Game: Taking money out, the tab "Compare the ways". Web app: Lifetime plan, the card "Compare the ways". 34 ways in 8 families, one file of rules for both (`js/math/withdraw.js`; the game gets a generated copy). Monthly and year-end timing are real steps in both engines and in the second engine. CAPE is on: the CAPE and the yields were added to the market history from the same Shiller source (fetched Nov 25 2026). Switched off with a note: VPW (the Bogleheads page could not be opened to check its numbers) and the RMD method for a stop before 73 (the IRS table starts at 73). "Keep the odds in a band" runs in the game only (it is the retirement engine's rule). The random markets are the real years in a random order, not the engine's Monte Carlo. The game's rows have no tax; the web app's have. QUESTIONS 584. |

## RUN: Export for the FIRE spreadsheet crowd (Nov 25 2026)

| Part | What | State | Notes |
|------|------|-------|-------|
| 1 | The .xlsx export in the game, the FIRE sheet tab, Google Sheets, the Export entry, the blank FIRE sheet button | Done, with two things said plainly | All five items are built and tested (`test/firesheet.test.js`, `game/tests/plan-xlsx.js`). Not done: the real import into Google Sheets was not tried (no way to open Google Sheets from the build machine; LibreOffice works every formula out with no error cell, and every function is on a list of ones Google Sheets has). The landing screen's "What is this?" does not exist yet, so the blank FIRE sheet button is in the Export entry of both apps only; the screen can call `fireBlankButton()` (`game/features/firelink.js`). Details and questions: `PROGRESS.md`, `QUESTIONS.md`. |

## RUN: Money sins system and the Rings theme (Nov 25 2026)

| Part | What | State | Notes |
|------|------|-------|-------|
| 1 | The read | Not started | Waits for the quiz engine (Not built, groups 1 to 5, Part 11) |
| 2 | Results and growth | Not started | |
| 3 | The Rings theme | Not started | |
