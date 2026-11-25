# game/tests: the tests of SLAM the Game

```
npm run test:game                          Run all test files.
node game/tests/run.cjs fork-theory.js     Run one file.
```

The tests need Node.js only. They need no browser and no package from npm.

## How a test file works

1. `run.cjs` runs each `.js` file of this folder in its own process.
2. `harness.cjs` makes a small stand-in for the browser. Then it loads all game scripts in the order of `index.html`. The line with the totals prints when nothing is left to run, so a check inside a promise (the retirement engine) counts too. Such a test puts its last steps, and the reset of the profile, inside its last callback.
3. The test file runs in the same global scope as the game. It makes a sample profile, sends taps, and reads the HTML of the screen.
4. At its end, the test file puts the game state back.

| Helper | What it does |
|--------|--------------|
| `X(action, v, k, extra)` | Sends one tap to `ACT[action]`. `v` and `k` are the `data-v` and `data-k` values of the button. |
| `app()` | Returns the HTML of the main screen. |
| `ov()` | Returns the HTML of the open sheet. |
| `chk(name, condition, info)` | Records one check. A failed check prints its name and `info`. |
| `clean(html)` | Returns false if the HTML shows `undefined`, `NaN` or `null`. |
| `junk(html)` | Returns the text near the first such defect. |
| `skip(why)` | Says that the file cannot run here. The runner shows the reason. |

The harness sets `SOON_AFTER = "now"` (`core/soon.js`). In the game, an error in a tap or in a screen shows the card "Coming soon". In the tests the same error is thrown at once, so a check fails on a real defect.

## The test files

Each file has the name of its feature.

| Test file | Feature | Script that it examines |
|-----------|---------|-------------------------|
| `addon-sealed-files.js` | The sealed add-on files (needs private files) | `account/addon.js`, `x1.json`, `x2.json` |
| `coming-soon.js` | The card "Coming soon": a tap with no action, an action or a screen that throws, a Menu row with no action, a failed probe in What's built; and a Menu row stays open | `core/soon.js`, `screens/ui.js`, `screens/planner.js`, `screens/ux.js` (uxPop), `features/built.js` |
| `founding-share-whats-new.js` | Founding Testers (the mark and the one-time card come only from the answer of the database), the personal share link (`?ref=code`), the patch notes "What's new", the admin section, and the database file read as text (the grants, the row rules, the limit of 50) | `features/founding.js`, `data/patchnotes.js`, `account/supa.js` (suRef, suRefKeep), `account/foundadmin.js`, `admin.html` |
| `ask-front-door.js` | The Ask front door on Home | `features/ask3.js` |
| `front-door.js` | The front door: a new visitor sees the landing screen, a signed-in person does not, Start opens "Am I okay?" first with no account, the taps end on the answer (a Guess, no verdict word), the offer to save by making an account, the link marks stay, the built list row | `account/door.js`, `features/okay.js`, and their calls in `account/supa.js`, `screens/ui.js`, `screens/ux.js`, `screens/planner.js`, `account/cloud.js` |
| `insurance-needs.js` | Insurance needs | `features/cover.js` |
| `investment-mix-and-fees.js` | Investment mix and fees, and the key number Stock share | `features/mix.js` |
| `plan-spreadsheet.js` | The spreadsheet of the plan: each formula worked out and compared with the game | `features/book.js` |
| `plan-summary.js` | My plan on one page | `features/plan.js` |
| `ledger-and-statements.js` | The giant ledger and the three statements: each total against derive() | `features/ledger.js` |
| `card-library-admin.js` | The card template, and Add a card on the admin page | `data/cardtemplate.js`, `account/cardadmin.js` |
| `card-vault.js` | The card vault: the 5/24 count, the credit band, offers against the budget | `features/vault.js`, `data/cards2026.js` |
| `retirement-engine.js` | The retirement engine and its adapter: same seed, same result | `vendor/retire-engine.js`, `features/retire.js` |
| `retirement-odds.js` | Retirement odds | `features/odds.js`, `data/market.js` (some checks wait for the engine) |
| `life-event-blocks.js` | Life event blocks: the stack on top of the simulators | `features/blocks.js` |
| `home-buying-and-renting.js` | Rent or buy on the shared engine: the copy of the rules, the bank's payment, the true cost of owning and renting, lines not counted until tapped, PMI, the breakeven year, the two rules of thumb, the closed group, the terms, the spreadsheet rows | `core/homebuy.js`, `features/sims/rentbuy.js`, `features/sim.js` |
| `career-and-education.js` | Career and education on the shared engine: the copy of the engine, a course priced (payback, lifetime value, the freedom date), a preset that is a sample, empty answers that wait, two paths side by side, the credential stack with an overlap, the match that stays with the job on each schedule, the launch window in days, the link from Two job offers, the spreadsheet rows | `core/career.js`, `features/career.js`, `core/engine.js` |
| `trips-and-the-journey.js` | Trips and the journey on the shared engine: the copy of the engine (with the household split engine), a trip line by line with the card fee, a line not tapped that waits, points taken off the trip, a group split by share and by item that adds up, the journey with where you are and the trip in days on the freedom date, a trip in another currency kept out of the plan, the spreadsheet rows, the What's built row. |
| `simulators.js` | The simulator engine and the 12 simulators, with each flip point | `features/sim.js`, `features/sims/*.js` |
| `spreadsheet-extras.js` | The savings rate by month, the quotas, next year's budget | `features/quota.js` |
| `tax-view.js` | The tax view | `features/taxview.js`, `features/retire.js` (retireTax) |
| `two-paths.js` | The two paths | `features/paths.js` |
| `windfall.js` | The windfall: extra money down the order of the two paths | `features/windfall.js` |
| `compare-the-ways.js` | Compare the ways: the copy of the rules, the run with a way against a calculation by hand, each row, the sort, the filter, the pins, the custom way, the chart, the spreadsheet rows | `features/ways.js`, `core/withdraw.js`, `features/odds.js` |
| `taking-money-out.js` | Taking money out: the order, guardrails, the years before 59 and a half, health cover | `features/takeout.js`, `data/takeout2026.js` |
| `two-ages.js` | Two ages: work optional and money reachable, for each person | `features/ages.js` |
| `while-you-slept.js` | While you slept | `features/slept.js` |
| `fi-ratio-and-coast-card.js` | The FI ratio on Key numbers with its "i", the card "You can stop sprinting", and the quiet Recalculating card under Coast | `features/coast.js` |
| `before-you-sign.js` | Before you sign | `features/sign.js` |
| `famous-money-ideas.js` | Famous money ideas | `features/ideas.js` to `ideas5.js`, `ideasz.js`, `roof.js` |
| `fire-drills.js` | Money fire drills, the ladder, one-way doors, the tour | `features/drills.js` |
| `fork-theory.js` | Fork Theory | `features/fork.js` |
| `how-it-connects.js` | How it all connects | `features/connect.js` |
| `later-eras-and-account-line.js` | The later eras and the account line | `features/eras.js` |
| `meet-your-character.js` | Meet your character | `features/reveal.js` |
| `your-unpaid-jobs.js` | Your unpaid jobs (run JOE-1, features 1 to 3): the six jobs from the answers of three made-up profiles (a solo renter, a couple with kids, a household of three), the block on the character sheet and on Me, the next step of a job, the admin hours by hand (Guess, Close, Exact), Running it and Living it ("1% better", never 0%), the four ways out and Undo (a schedule, a skill, a hand-off), the household role map record, the Home card, the time ledger tile, the spreadsheet rows, the built list row | `core/jobs.js`, `data/roles.js`, `features/jobs.js` |
| `household-role-map.js` | The Job of Existing, feature 6 (run JOE-1): Who carries what for three made-up homes (a renter alone, the renter with a parent, three partners): each job tapped to one or more people by name, pets left out, a task handed to a person, each person's minutes adding up to the household (Running it plus the tasks handed to people), the value at hours x the time price, no dollars with no rate, tap off, Give every job back to you and Undo, the spreadsheet rows and formulas, Labor counts in Sharing costs fairly with the admin hours and the same rate, the row on the jobs sheet, the menu, the built list row | `core/jobs.js`, `features/rolemap.js`, `features/fair.js` |
| `goal-wire-and-care-quests.js` | The Job of Existing, features 4 and 5 (run JOE-1): a goal wired in three taps (the account, the amount, the day), the amounts equal to the reverse of the Time-Money dial (`goalExtraFor`), payday first as the default, Set once. Check in: quarterly. on the goal and its card, the check-in quest with the four ways out, I set it up as Automate it (the Financial Planner's count), a hand-off, a due check-in on Today, unwire and Undo, a typed amount, I need one (the fixed order, no default, no fee number, the Fee X-ray one tap away), the spreadsheet rows; the November season, HSA receipts in tax season, each quest a task of its job with the four ways out, every term in the glossary, the dates the person taps and their reminders, the policy renewal tasks, the doctor visit, the yearly reset rows, the menu, the built list rows | `core/jobs.js`, `data/roles.js`, `features/goalwire.js`, `features/careq.js` |
| `mission-board.js` | The mission board | `features/missions.js` |
| `money-and-values.js` | Is my money going where I want? | `features/values.js` |
| `money-chart-group.js` | The Money Chart for more than two | `features/together.js` |
| `money-log-and-give-a-game.js` | The money log, and "give a person their game" | `features/moneylog.js` |
| `multipliers-board.js` | The multipliers board | `features/mult.js` |
| `next-steps-one-list.js` | One list on Next Steps | `features/fold.js` |
| `our-household.js` | Our household | `features/house.js` |
| `one-question-at-a-time.js` | Make your numbers real, one question on each screen | `features/ask.js` |
| `one-question-debts-and-key-numbers.js` | The same pattern for debts, Key numbers, the match and the tax accounts | `features/ask2.js` |
| `questlog.js` | Where am I (the Quest Log), with a walk for three players | `features/questlog.js` |
| `countdowns.js` | Countdowns on My Goals: any goal, a down payment, a quit fund, a wedding | `features/countdown.js` |
| `two-job-offers.js` | Two job offers side by side | `features/offers.js` |
| `which-account-next.js` | Which account next, up to each limit | `features/nextacct.js` |
| `quick-math.js` | Quick math, and the six cards of the run Not built, Part 2 (HYSA, all at once or spread, cost per use, the hassle, waiting, a warranty) on the same code as the web app (`tools/game_quick_build.mjs --check`) | `features/quick.js`, `core/quick.js` |
| `recalculating.js` | Recalculating: the kept plan and the new date, the short month, the cushion refill, the safe-to-fail line, the letter exercise, the optional Mistake audit | `core/recalc.js`, `features/recalc.js`, `features/exletter.js`, `features/audit.js` |
| `quizzes.js` | Quizzes: the copies of the engine and of the skins are current, the Money Chart gives its old results, each skin ends on one card on each path, the routes to real skills, the element changes only by a tap, a result is private until shown, the placeholder Coming soon, the built list row | `core/quizcore.js`, `data/quizskins.js`, `features/quizzes.js`, `features/chart.js`, `features/element.js` |
| `money-sins-read.js` | The money sins read: the copy of `core/sins.js` is current, the read of a made-up ledger (right after payday, fun buys in a month, fun past its plan), two sources over 40 days give a Close read, the check-in after a logged buy over the line (rent never, 3 a week at most, Skip), the tap kept with its time, Is this really it? kept for the judge, Test the fix, the sheet in the new look with no cost on it, privacy for a coach, the built list row | `core/sins.js`, `features/sins.js`, `features/quizzes.js`, `screens/ui.js` |
| `money-sins-results.js` | The money sins, Part 2: the result card with its archetype on the read and on the quiz row, the share card with no numbers (and never an add-on), the add-on hook with and without a stand-in add-on, the framing line on Home (Home minus the line is Home without a read) and on the crash drill, no line for an Early read, couples only when both turn sharing on and the money date, the retake each quarter (Quest Log reminder, Not this quarter, the history kept by Retake and by Take it again), the read on the character sheet, the part for the graduation story, privacy for a coach, the built row | `core/sins.js`, `features/sins.js`, `features/quizzes.js`, `features/recalc.js`, `features/drills.js`, `features/reveal.js`, `features/questlog.js` |
| `rings-theme.js` | The Rings theme (money sins, Part 3): the theme entry (look and voice), off until picked, the climb out ring by ring on the read, the ruler of the main pull as the boss of the boss fights (one boss game), the fine print, the ward and the escape route with the plain words next to them, the add-on voice hook with and without a stand-in add-on, an add-on that turns the theme off by default (a stand-in) and Show it, Leave the Rings, privacy for a coach, no blame word, the built row, What's new. |
| `save-status.js` | The save status | `account/cloud.js` |
| `sharing-costs-fairly.js` | Sharing costs fairly | `features/fair.js` |
| `sheet-navigation.js` | Back, Forward, Close and "i" on each sheet | `screens/nav.js` |
| `side-by-side.js` | Side by side, and the fee screen | `features/compare.js` |
| `spending-plan-and-audit-score.js` | The Conscious Spending Plan and the money audit score | `features/csp.js` |
| `stars.js` | The Galaxy: star states, lanes from real links, gateway stars, Do this | `features/stars.js` |
| `stress-testing.js` | The stress test: real history and random markets as one result (one check waits for the engine) | `features/stress.js` |
| `student-loan-plans.js` | Student loan plans | `features/study.js` |
| `spiral-onboarding.js` | Setup as a spiral: the rounds D, A, I, T, E, one number each, the chain, the route strip, the level change, the 50/30/20 summary, the first plan and what it depends on | `features/spiral.js`, `screens/smart.js` |
| `usability-repairs.js` | The repairs from the usability audit | `screens/tidy.js` |
| `welcome-back-card.js` | The welcome-back card | `features/back.js` |
| `what-depends-on-what.js` | What depends on what | `features/dep.js` |
| `what-each-debt-costs.js` | What each debt costs you | `features/owed.js` |
| `what-you-already-know.js` | What you already know (D.A.I.T.E.) | `features/know.js` |
| `whats-built.js` | The list "What's built" | `features/built.js` |
| `which-lever-matters-most.js` | Which lever matters most | `features/lever.js` |
| `working-for-yourself.js` | Working for yourself | `features/gig.js` |
| `your-people.js` | Your people | `features/people.js` |

These scripts have no test file of their own: `core/engine.js`, `core/engine2.js`, `core/metrics.js`, `account/supa.js`, `account/gate.js`, `screens/ui.js`, `screens/ux.js`, `screens/planner.js`, `screens/smart.js`, `screens/profiles.js`, `features/games.js`, `features/games2.js`, `features/year.js`, `features/chart.js`, `features/debts.js`, `features/import.js`, `features/house.js`, `features/home.js`, `features/testkit.js`. The test files of other features use many of their functions, but no file examines them directly. `KNOWN-WEAK.md`, section B, lists the weak points of the tests.

## Rules for a new test file

- Make one file for each feature. Give the file the name of the feature, in small letters, with hyphens between the words.
- Do not end a name with `.test.js`, `-test.js` or `_test.js`. Do not start a name with `test-`. The command `node --test` at the top of the repository runs the tests of the main app, and it would run a file with such a name.
- Start the file with the header: PURPOSE, INPUT, OUTPUT, DEPENDS ON.
- Put the code in one block (`{ ... }`), so that its names do not stay in the global scope.
- At the end, put the game state back: `G.chars.length`, `G.active`, `G.demo`.
- Format the file with Prettier.

## Known failures

`known-failures.json` lists each failure that is known, with the reason. The runner shows these failures on each run, and they do not make the run fail. A new failure makes the run fail.

On 2026-11-22 the list is empty: all checks pass. Add a failure to the list only when it cannot be repaired now, and write the reason. The format of one entry is:

```
"mission-board.js": { "count": 1, "why": "one sentence with the reason" }
```

## Private tests

The add-on source is not in this repository. Thus the tests of the add-on content are not here.

- `addon-sealed-files.js` has two parts. Part 1 runs in each copy: a sealed file shows no readable word and opens to nothing with a made-up key, no file that a new account loads names a sealed file, the database rules (read as text) give a key only to an account with permission or to the admin, and a new account with a stand-in database gets no add-on in the menu, the glossary, the themes or the built list. Part 2 needs the private folder with the add-on source (the environment variable `SLAM_PACKS_DIR` gives its path). With no such folder, part 2 prints `SKIP`.
- To load the add-ons for the other tests, set the environment variable `SLAM_PACKS_BOOT` (see the header of `harness.cjs`).
| `character-reveal-and-element.js` | The character reveal after setup: strengths, weak spots, the money element, two questions | `features/element.js` |
| `gear-slots.js` | The states of a gear slot: want, need, not interested, can't have, inactive | `core/engine2.js`, `features/games.js` |
| `product-xray.js` | The product X-ray: the path you are on next to the alternative | `features/xray.js` |
| `life-transitions.js` | Break in case of emergency: a layoff as a number, tripwires, family help, quick income, slots | `features/transit.js` |
| `kids-mode.js` | Kids mode: a kid profile, 20 lessons, the run that forgives one missed day | `features/kids.js`, `data/kidlessons.js` |
| `spreadsheet-round-trip.js` | The spreadsheet comes back in: one list of fields for the export and the import, and each change can be left out | `features/book.js` |
| `plan-xlsx.js` | The .xlsx export: the data for the one export engine of the web app, the FIRE sheet tab, the functions the formulas use, the way back from an .xlsx file, the menu row Export, the blank FIRE sheet button | `features/book.js`, `features/firelink.js` |
| `math-audit-core-numbers.js` | The math audit: the FI number, Coast FI, debt payoff and runway, each worked out a second way | `core/engine.js`, `features/debts.js`, `features/drills.js` |
| `strategy-engine.js` | The Strategy Engine ("Moves to try"): the template, the loop of each strategy, the house hack and the balance transfer by hand, the ranking | `features/strat.js`, `data/strategies.js`, `data/metros.js` |
| `coach-demo-and-results.js` | The coach page: the demo with made-up clients, milestones and days to a first win, before and after, the pipeline, search and sort | `account/coachplus.js` |
| `roles-and-navigation.js` | The UX pass, phase 2: no coach or admin row for a player, the route guard of the coach page and the admin page, the menu in groups with a search and Recently used, the menu button on each sheet, the exact spot of a round, the coach rules file read as text | `account/roles.js`, `screens/planner.js`, `screens/nav.js`, `features/questlog.js`, `admin.html`, `supabase/migrations/20261125230000_ux_roles_rls.sql` |
| `roles-coach-admin.js` | The hats (Player, Coach, Admin), the coach page, the admin sections, the sign-up line, and the database file read as text | `account/roles.js`, `account/coachpage.js`, `account/adminmore.js`, `coach.html`, `admin.html` |
| `report-a-bug-or-idea.js` | Report a bug or idea: the button on each screen, what a report carries, the list on the device, the sending, the note "It's fixed", the admin Reports inbox, and the database file read as text | `core/reportcore.js`, `features/fbreport.js`, `account/adminmore.js`, `admin.html` |
| `trust-and-privacy.js` | Trust: the one line, the privacy page and its links, calm words for each answer of the sign-in service (a stand-in), the switch EMAIL_READY, how sharing starts for a public link and for an invite, Delete my account (a stand-in database), and the database file read as text | `account/trust.js`, `account/supa.js`, `account/coachpage.js`, `privacy.html` |
| `live-session-rules.js` | Live Session Mode, the rules as values: the room and its one Start, the consent of both sides, the pill, the listening status and the restart, the lines kept on the device, You and Them, the echo filter with both settings, the side that cannot listen | `account/live.js` |
| `live-session-invite.js` | Live Session Mode: the switch off shows "Coming soon" and nothing runs, the invite rules (one time, 7 days) through a stand-in database, the invite screen, the sign-up in calm words, the coach's card, the room as HTML, what each screen says before the database file has run, the adapters, no audio in any new file, and the database file read as text | `account/liveflag.js`, `account/liveroom.js`, `account/livecoach.js`, `account/liveio.js`, `session.html`, `coach.html` |
| `live-session-two-devices.js` | Live Session Mode: whole sessions of two simulated devices with scripted lines, from the invite to End; a crash and a reload lose no line and send no line two times; the echo filter in a call; a phone with Safari that cannot listen | `account/liveio.js`, `account/livesim.js`, `account/live.js` |
| `live-fill-number-reader.js` | Live Session Mode, Part 3, the number reader: each assumed form of spoken money and rates, rough numbers and ranges (the middle, marked rough), the pay rhythm, how often an amount comes, and what it refuses (a phone number, a year, a time of day, a date, an age, a count, "one" as a pronoun) | `account/livefill.js` |
| `live-fill-rules.js` | Live Session Mode, Parts 3 to 5 on a real profile: the coach's topic and the client's value (a coach's number never fills), a value lands in the game's own row as a Guess with a record, corrections (the last one stays, both kept), values the person entered or an Exact one are never changed, the spoken confirmation (yes, no, the time limit, an echo of the coach's word, Confirming from the client's side, a protected field, never Exact), the what-ifs (each cue word, the false hits, the five types and where each goes), the heard list and its counts, and the lines of the game that keep a heard Guess as it is | `account/livefill.js`, `account/liveland.js`, `features/alloc.js`, `core/engine.js` (applyTypical), `features/debts.js` (dbRate, dbset), `screens/ui.js` |
| `live-fill-two-devices.js` | Live Session Mode, Parts 3 to 5 with two simulated devices: one scripted call fills a new profile and the final profile is compared field by field; the coach's device shows the same list, counter and events; a line the echo filter takes back is taken back on the profile; a Confirming with no answer ends by the room's timer; a client that cannot listen fills nothing; a reload keeps the list | `account/liveland.js` (lfAttach), `account/liveio.js`, `account/livesim.js` |
| `live-game-join.js` | Live Session Mode, Part 6, the join to the saved game: the first game of a new client (the shape of fresh(), the typed name, Share with my coach on); a scripted two-device call ends with the values in the saved game; the coach's device reads the same profile; a reload in the middle loses nothing and the heard list is whole again; a save that does not go through waits on the device; the normal game shows the values as Guess with the heard tag; a client's own typed number stays; the stamp | `account/livegame.js`, `account/coachpage.js` (cpSaveGame), `account/cloud.js`, `account/liveflag.js` (ledRowHeard), `session.html` |
| `live-screens.js` | Live Session Mode, Part 6, the two screens: the next question follows the game's intake order and words and skips the known; the "Confirming" phrase; the coach's profile by area with marks, tag, glow, pulse, one open group; the heard list (last 3 and a count); the calm client screen with only the four numbers and a Recalculating line; only Pause and End to press; the styles (no red, reduced motion, columns that stack) | `account/livescreen.js`, `account/liveroom.js`, `session.html` |
| `live-review.js` | Live Session Mode, Part 7, the review: the counts; the groups (closed, not sure first, sources); approve all in a group; fix one item three ways; leave it out restores the row and keeps the quote; approve never raises a level; protected values stay protected; what-if types and links; each tap saves through cpSaveGame; the calm client screen; Show plan on both; a phone that cannot listen reaches the review with the coach's lines only; the switch off | `account/livereview.js`, `account/livescreen.js` (lsPlan), `account/livegame.js` |
| `live-ai-pass.js` | Live Session Mode, Parts 8 and 9: the switch of the AI pass off (no AI button, the review works); the recorder's text file with and without Speaker labels, named speakers, times, the size cap; the speaker match (labels in order, swapped, none, a file of another call, the coach's tap); the parser of the answer; the proposals in the same review (not sure first, applied only on Approve as a Guess, a value the person entered stays, Approve all leaves the not-sure ones, what-if types on Approve); a whole pass with a stand-in for the Edge Function (what is sent, the token count, the reminder, the notes saved only on Save); Delete this transcript for the coach and the client (the database rule, the quotes, the values stay, the date line); no API key pattern in the repository; the Edge Function's own rules; the privacy page and the consent line | `account/liveai.js`, `account/liveforget.js`, `account/livereview.js`, `account/livegame.js`, `account/liveio.js`, `supabase/functions/live-ai-pass/index.ts`, `privacy.html` |
| `live-checklist.js` | Live Session Mode, "Tests and checks" of the build as one list, one direct check each: a rough number, a correction, a hypothetical, the handshake (yes, no, timeout), the echo filter, a confirmed and a hand-entered value never overwritten, grouped approve-all with no level change, Start that waits for the client's microphone step, and a phone that cannot listen | `account/liveland.js`, `account/live.js`, `account/livereview.js`, `account/livesim.js` |
| `sync-no-change-lost.js` | The sync of two devices and a coach: a stamp for each person, the later copy wins, no open task is lost, a failed save is sent again | `account/cloud.js`, `account/coachpage.js` |
