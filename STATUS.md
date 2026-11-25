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
| 1 | FI number variants | Done | Follow-up to Eli's answers (QUESTIONS 580) applied: the FOO by destination moves only the late steps, the Barista number adds health insurance, living apart on the pod view, the quiet Recalculating card under Coast, the "i" on the FI ratio. Web app: Plan › Goals has "FI destinations" (Lean, Barista, Regular, Chubby, Fat, each with its number, date and what it assumes; the Fat list; the Barista gap and health insurance), "FI date stress test" and "Pod FI number" (two or more adults); Plan › FOO has "Your order by destination"; Home has the card "You can stop sprinting". Game: "FI ratio" on Key numbers (Freedom), and the same card on Home. Waiting for Eli: the Chubby midpoint, the three orders of the FOO, what counts as investment income (QUESTIONS 580). |
| 2 | Home buying and renting | Done | One engine, `js/math/homebuy.js` (copied to `game/core/homebuy.js`; a test fails when the copy is stale). Web app: `home.html`, under the lender's lines: "What the bank shows" (principal and interest) first, "The true cost of owning" (property tax, home insurance, PMI under 20% down, HOA, maintenance, big repairs), "The true cost of renting", "When owning comes out ahead" (the breakeven year or "Renting is cheaper the whole time", the price-to-rent ratio, the 5% rule, year by year, the math). Game: Menu › Simulators › Rent or buy runs on the same functions. Property tax, insurance, PMI, HOA, big repairs and renter's insurance have no typical number (no dated source): the person taps their own (QUESTIONS). Not run: `tools/e2e/layout.cjs` (a local server could not be started in this session); the screens were opened at 390 and 1280 with the files read from disk. |
| 3 | Career and education | Done | One engine, `js/math/career.js` (copied to `game/core/career.js`). Web app: `career.html` "Does this course or degree pay back?" (payback, lifetime value, FI date change, presets as samples, trade school and a 4-year degree side by side, the credential stack, the match that stays with the job, the launch window in days). Game: Menu › Career and education (five tabs, the new look). No BLS pay figures: the presets carry only the time a path takes (QUESTIONS 597). |
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
| 11 | Quiz frameworks: one engine, many skins | Done | Built out of order, before Parts 2 to 10, because the sins run and the quiz styles of quiz.html wait for it. One engine (`js/math/quizcore.js`, copied to `game/core/quizcore.js`), eight skins as data files (`js/quiz/skins/`) and the sins placeholder ("Coming soon"). Web app: `quiz.html`, "More quizzes". Game: Me › Quizzes, and the Menu. The Money Chart (both apps), Quantum Collapse and the Money Letters are scored by the engine with the same results as before. How to add a skin: `docs/QUIZ-ENGINE.md`. Questions: QUESTIONS.md 594. |

## RUN: Launch ready for the Nov 30 soft launch (Nov 25 2026)

| Part | What | State | Notes |
|------|------|-------|-------|
| 1 | A stable public site | Done | The branch `release` and `bash tools/promote.sh` (both suites on the exact `main` commit, fast-forward only). "Coming soon" card in the game and the web app. Eli: switch GitHub Pages to `release` (`docs/RELEASE.md`). **Promote at the end of every run and say so in the summary.** |
| 2 | Report a bug or idea | Done in the apps; the database file waits for Eli | One Report button on every screen of the game (top bar of each tab, end of each sheet, welcome, sign-in) and of the web app (top bar of the shell, a slim row on each page that stands alone). It replaces Flag this screen and Report this screen; the old notes stay readable. Eli runs `supabase/migrations/20261125190000_reports.sql` one time (NOT APPLIED). Until then a report says "Saved on this device" and sends itself after; the admin section "Reports inbox" says it waits. QUESTIONS 586. |
| 3 | Founding Testers and sharing | Done in the code; the database file waits for Eli | Game: Menu has "Share SLAM" (your own link, `?ref=code`, Copy my link, no rewards) and "What's new" (the patch notes, `game/data/patchnotes.js`, each run adds one entry). Web app: More menu has "What's new". Admin page: "Founding Testers: N of 50" and "Who joined through whom". **Eli: run `supabase/migrations/20261125190000_founding_and_referrals.sql` one time in the Supabase SQL Editor.** Until then the game shows no Founding Tester mark and no card (never from a guess), and keeps the code a person arrived with. After: the mark on Me, People and the character sheet, and the one-time card on Home. Questions: QUESTIONS.md 587. |
| 4 | Trust | Done, 2 steps wait for Eli | `game/privacy.html` (sign-up, Menu, My account, each footer). Delete my account: removes the saved game and the device copy now; the sign-in too after Eli runs `supabase/migrations/20261125200000_delete_my_account.sql` (NOT APPLIED). "Education and tools, not financial advice." on sign-up and in every footer. Sharing starts off for a public link, on for a coach's invite (`?coach=1`). Calm words for each sign-up email answer; `EMAIL_READY = false` in `game/account/supa.js` until email works. Add-ons checked (code, live database rules read only, browser with a stand-in database); the by-hand steps with a fresh account are in QUESTIONS 589 (h). |
| 5 | Email | Done | `docs/EMAIL-SETUP.md`. Confirmed from Resend's and Supabase's pages (through search, read 2026-11-25): host, port, username, the key as password, the free plan limits, the Supabase links. Not confirmed, so the doc says to read them on the screen: Resend's sign-up labels, the exact labels of the Supabase fields and of "Confirm email", the starting hourly limit (30 or 25). Eli has to do the steps; question 582 in QUESTIONS.md. |
| 6 | The front door | Done | The link for the slide: https://sapphirestoneage.github.io/Slam/game/ (`docs/LAUNCH-LINK.md`). A new visitor sees the landing screen (one line, Start, What is this?, Sign in); a signed-in person goes to their game. Start needs no account and no typing: the setup by taps under "Am I okay?" (21 taps in the walk), then the answer as a Guess, then the offer to make an account. `docs/qr-slam.png` (1025 pixels, read back to the exact link) from `python3 tools/qr_slam.py --check`. Walk: `node tools/e2e/door_walk.cjs`. Public after the promote at the END. QUESTIONS 590. |
| END | The whole run checked as one | **END done, Nov 25 2026** | Both suites green on the merged main (the counts are in `PROGRESS.md`). The walk of a new visitor at phone width, from the slide link to a Report and an account: `node tools/e2e/launch_walk.cjs`. Seven small repairs, each with a test (the list is in `PROGRESS.md`). Promoted to `release` with `bash tools/promote.sh`. **Eli's hand list, in order: `docs/LAUNCH-CHECKLIST.md`** (Pages to `release`, three database files, the "Confirm email" switch, one check with a fresh account, a real phone). Questions: QUESTIONS.md 591. |

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

## RUN: Live Session Mode (Nov 25 2026)

| Part | What | State | Notes |
|------|------|-------|-------|
| 1 | The invite link is the sign-up | Done in the code, switched off; the database file waits for Eli | The whole run is behind `LIVE_SESSION_READY = false` in `game/account/liveflag.js`: the coach page shows "Coming soon", `game/session.html` shows "Coming soon". With it on: `session.html?invite=token` is the sign-up (name, email, password), the coach page makes and lists the links. **Eli: run `supabase/migrations/20261125210000_live_sessions.sql` one time (NOT APPLIED).** QUESTIONS 592. |
| 2 | The session room | Done in the code, switched off; not tried with real microphones | Rules as values (`game/account/live.js`), adapters with stand-ins, plain screens for the coach and the client; Parts 6 and 7 replace the body by the named parts `livePartCoach`, `livePartClient`, `livePartEnded`. Text only: nothing records audio. Two real devices, real speech recognition and the real realtime channel were not tried; the list for a dry run is in `docs/LIVE-SESSION-BUILD.md`. |
| 3 | Live fill (rules only, no AI) | Rules done and tested, switched off; NOT joined to a real saved game yet (Part 6) | `game/account/livefill.js` (the number reader, the fields, the topic) and `liveland.js` (a value lands in the game's own row as a Guess with a record `c.x.live.marks`, corrections keep both, a value the person entered is never changed and the heard one is kept with the reason). The session page holds no game, so on the real page nothing fills until Part 6 gives `lfAttach` the client's game. Real speech recognition output was not seen by anyone: the forms are assumed (`docs/LIVE-SESSION-BUILD.md`). Tests: `live-fill-number-reader.js`, `live-fill-rules.js`, `live-fill-two-devices.js`. |
| 4 | Spoken confirmation | Rules done and tested, switched off | "Confirming <field> <number>" on the coach's line, then the client's yes in 10 seconds: the value is set and raised to Close the game's way (`s: true`), never Exact. No, a time limit, an echo of the coach's word, a "Confirming" from the client's side and a protected field change nothing and say why. One event (`confirmed`) reaches both devices; the pulse on the screen is Part 6. |
| 5 | What-ifs log | Rules done and tested, switched off | A line with a cue word is not a fact: it goes to `c.x.live.whatifs` with the quote, the speaker and the time; the counter text is ready ("3 what-ifs heard"). Types by `lfWhatifSet`: Ceiling / Floor (a limit kept with the field), Scenario (a link to a simulator), Life transition (a link to Break in case of emergency), Goal or wish (one goal on the bucket list). A field for the AI's suggested type exists. The tap for the coach is on the review screen (Part 7). |
| 6 | Screens | Not started | |
| 7 | End of call review | Not started | |
| 8 | After the call (AI pass, behind the switch) | Not started | |
| 9 | Privacy | Not started | |
| 10 | Tests, checks and report | Not started | |

## Where the runs stopped (Nov 25 2026, end of the session)

A usage limit stopped three workers in the middle of their parts. Their unfinished work is kept on the branch
`claude/upbeat-hopper-u0amw2` (commit 5569e20), NOT on main: main and release hold only finished, tested parts.

| Run | Done on main | Stopped in the middle (on the work branch) | Not started |
|-----|--------------|---------------------------------------------|-------------|
| Finish everything partly built (21 parts) | Part 1; Eli's answers to question 580 | Part 2, home buying and renting | Parts 3 to 21 |
| Not built, groups 1 to 5 (11 parts) | Part 1; Part 11 (the quiz engine, built early) | none | Parts 2 to 10 |
| Launch ready for the Nov 30 soft launch (6 parts) | All 6 parts and the END | none | none |
| Compare the ways | Done | none | none |
| Export for the FIRE spreadsheet crowd | Done | none | none |
| Money sins system and the Rings theme (3 parts) | none | none (Part 1 had started; nothing was written) | Parts 1 to 3 |
| Live Session Mode (9 parts) | Parts 1 to 5, behind the switch LIVE_SESSION_READY = false | Parts 6 and 7 (the screens, the end-of-call review) | Parts 8, 9, tests and report |

To continue: start from the work branch for the two unfinished parts (merge it with main first), then follow the
order: Live Session Mode Parts 6 to 9; the sins run (it builds on the quiz engine, docs/QUIZ-ENGINE.md); the two long
runs from where they stopped. Promote with `bash tools/promote.sh` at the end of each run.

