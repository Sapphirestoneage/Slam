# SLAM the Game: start here

SLAM the Game is a money game for one household. It runs in a browser. It has no build step.

Live site: https://sapphirestoneage.github.io/Slam/game/

Retirement engine by Zack, MIT license (section 11).

This page tells a new developer how the game is made, how to run it, and where its weak points are.

This folder is the only copy of the game. An older copy inside Claude is retired.

| Document | Contents |
|----------|----------|
| `README.md` | This page. |
| `CODE-MAP.md` | A generated map: each file with its purpose and size, and the counts of the weak patterns. |
| `KNOWN-WEAK.md` | Each known weak point, with the recommended repair. |
| `tests/README.md` | How the tests work, and the list of test files. |
| `unused/README.md` | The code that nothing calls. |

## 1. The six facts you must know first

1. **The game uses classic scripts.** `index.html` loads 151 script files in a fixed order (150 of the game and one bundle from outside, in `vendor/`). All functions and constants are in one global scope. There are no modules.
2. **Each file starts with a header.** The header gives PURPOSE, INPUT, OUTPUT and DEPENDS ON. Read the header before you read the code.
3. **The screens are HTML text.** Each screen function returns one HTML string. `render()` puts the string in the page. One click handler reads the `data-a` attribute and calls `ACT[name]`.
4. **A screen function calls its parts by name.** A feature file can add a row to a screen of a different file, for example to Home. It does this with a named function (a part), and the screen function calls that part. No file replaces a function of a different file. Section 6 shows the pattern.
5. **All data is one object, `G`.** `G.chars` is the list of player profiles. `save()` writes `G` to the browser storage. On the website, `account/supa.js` and `account/cloud.js` also write `G` to the Supabase database for the account.
6. **`derive(c)` does the math.** It takes one profile and returns all computed numbers (net worth, savings rate, era, and more). The screens show these numbers. They do not calculate.

## 2. Run it

```
python3 -m http.server 8000
```

Open http://localhost:8000/game/. Without an internet connection the game runs in demo mode, and the data stays in the browser.

## 3. Test it

```
npm run test:game
```

The command runs 87 test files (3,046 checks) in Node.js. It needs no browser. Each test file has the name of its feature. `tests/README.md` has the list and tells how a test file works.

All checks pass, and the command ends with exit code 0. One file (`addon-sealed-files.js`) has a part that needs the private add-on source. In this repository that part prints `SKIP`.

The last line of the output shows if the version stamps are correct (section 10).

GitHub runs `node --test` and `npm run test:game` on each push (`.github/workflows/test.yml`). A failure shows as a red X next to the commit.

`node --test` runs the tests of the main SLAM app (about 1,260 checks). It does not run the game tests.

## 4. Where things are

The scripts are in five folders. The folder shows the role of a file. It does not change the load order: `index.html` is the only place that sets the load order.

| Folder | Role | Files |
|--------|------|-------|
| `core/` | The math, the data model, the error record and the card "Coming soon". Each screen depends on these files. | `report.js`, `soon.js`, `engine.js`, `engine2.js`, `homebuy.js` (home buying and renting, a copy of `js/math/homebuy.js`), `career.js` (career and education, a copy of `js/math/career.js`, made by `tools/game_career_build.mjs`; do not edit it), `trip.js` (travel and the FIRE journey, a copy of `js/math/household.js` and `js/math/trip.js`, made by `tools/game_trip_build.mjs`; do not edit it), `recalc.js` (the math of Recalculating: a copy of `js/math/recalc.js` of the main app, made by `tools/game_recalc_build.mjs`; do not edit it), `reportcore.js` (Report a bug or idea: a copy of `js/report/core.js` of the main app, made by `tools/game_report_build.mjs`; do not edit it), `quizcore.js` (the one quiz engine: a copy of `js/math/quizcore.js` of the main app, made by `tools/game_quiz_build.mjs`; do not edit it), `metrics.js`, `jobs.js` (the math of the six unpaid jobs: a copy of `js/math/jobs.js` of the main app, made by `tools/game_jobs_build.mjs`; do not edit it), `withdraw.js` (the ways to take money out: a generated copy of `js/math/withdraw.js` of the main app; do not edit it, run `node tools/game_withdraw_build.mjs`) |
| `data/` | Data only. No functions. | `skills.js`, `skillthemes.js` (the skill tree), `quizskins.js` (the quiz skins and the skills they route to; `tools/game_quiz_build.mjs` makes it from `js/quiz/skins/` of the main app; do not edit it), `qr.js` (one QR code picture), `market.js` (US market history by year, from Shiller), `limits2026.js` (the 2026 account limits, from the IRS), `takeout2026.js` (the early-access rules and the health-plan credit table), `cardtemplate.js` (the template of one card: fields, switches, categories; the admin page loads it too), `cards2026.js` (93 cards as full template records; `tools/game_cards_build.mjs` makes it), `health2026.js` (average 2026 health premiums, from KFF), `roles.js` (the six unpaid jobs and their recurring tasks), `patchnotes.js` (the patch notes of "What's new"; each run adds one entry at the end; the web app reads it too), `retire-*.json` (the tax tables of the retirement engine, changed from YAML) |
| `account/` | Sign-in, the database, the save to the cloud, the roles, and the add-on system. | `door.js` (the front door: the landing screen of a new visitor, before `supa.js`), `supa.js`, `trust.js` (the line "Education and tools, not financial advice.", calm words for the sign-in emails, Delete my account; `privacy.html` loads it too), `cloud.js`, `gate.js`, `addon.js`, `coachplus.js` (the demo with made-up clients, results, the pipeline; only `coach.html` loads it), `liveflag.js` (the one switch of Live Session Mode, off; the game loads this file only), `live.js`, `liveio.js`, `livesim.js`, `liveroom.js`, `livecoach.js`, `livefill.js`, `liveland.js` (Live Session Mode: the rules, the adapters, the stand-ins, the session page, the coach's card, what a line of the call means, and how it lands on the profile; only `session.html` and `coach.html` load them), `roles.js` (the hats Player, Coach and Admin, and the audit lines; all three pages load it), `cardadmin.js`, `adminmore.js` and `foundadmin.js` (only `admin.html` loads them), `coachpage.js` (only `coach.html` loads it) |
| `screens/` | The main screens, the click actions, the navigation and the setup questions. | `ui.js`, `ux.js`, `planner.js`, `nav.js`, `tidy.js`, `smart.js`, `profiles.js`, `dash.js` (the kit of the dashboard look: stat tiles, charts, the Time-Money dial; DESIGN.md "Reference: Tally") |
| `features/` | One file for each feature. Each file adds its sheets and its actions. | 92 files, and 12 simulators in `features/sims/`. `CODE-MAP.md` gives the purpose of each one. |
| `vendor/` | Code from outside the game. Do not edit it. The game loads `retire-engine.js` before `core/engine.js`. | `retire-engine.js` (the retirement engine, one bundle), `retire-worker.js` (its Web Worker), `RETIRE-ENGINE-LICENSE.txt` |
| `unused/` | Code that nothing calls. The game does not load it. | `no-caller.js` |
| `tests/` | The tests. | `run.cjs`, `harness.cjs`, one file for each feature |

These files stay in `game/` because the browser or the tools look for them there: `index.html`, `admin.html` (the administrator page), `coach.html` (the coach page), `session.html` (the session page of Live Session Mode; it shows "Coming soon" while the switch is off), `privacy.html` (the privacy page, with Delete my account), `sw.js` (the service worker), `manifest.json`, the two icons, and `x1.json` and `x2.json` (the add-ons, see section 7).

| Subject | Files |
|---------|-------|
| Famous money ideas | `features/roof.js`, `features/ideas.js` to `features/ideas5.js`, `features/ideasz.js` |
| Later eras and the account recommendation | `features/eras.js`, `features/dep.js` |
| Fork Theory, spending plan, audit score | `features/fork.js`, `features/csp.js` |
| The Plan batch: shared parts (chips, Guess / Close / Exact, columns, the flip chart) | `features/kit.js` |
| The two paths, retirement odds, the tax view | `features/paths.js`, `features/odds.js`, `features/taxview.js` |
| Insurance needs, investment mix and fees, while you slept | `features/cover.js`, `features/mix.js`, `features/slept.js` |
| The FI ratio on Key numbers, and the card "You can stop sprinting" on Home | `features/coast.js` |
| The simulators: the engine, and one file for each | `features/sim.js`, `features/sims/*.js` |
| The front door (the landing screen, Start with no account) and the answer to "Am I okay?" | `account/door.js`, `features/okay.js`, `docs/LAUNCH-LINK.md`, `tools/qr_slam.py`, `tools/e2e/door_walk.cjs` |
| My plan on one page, the Ask front door, quotas and the savings rate by month | `features/plan.js`, `features/ask3.js`, `features/quota.js` |
| The spreadsheet of the plan (each number with its formula), and Export: the .xlsx file, written by `js/sheet/` of the web app | `features/book.js`, `features/firelink.js` |
| Where am I (the Quest Log): Continue, the trail, Journey, Areas, Questions, Time | `features/questlog.js` |
| The Galaxy: the 625 skills as stars on one canvas, with lanes and gateway stars | `features/stars.js` |
| Port batch 1, taking money out and the two ages | `features/takeout.js`, `features/ages.js` |
| Compare the ways: the same plan through each way to take money out | `features/ways.js`, `core/withdraw.js` (the rules), `features/odds.js` (the run) |
| Port batch 1, the stress test, the life event blocks, the windfall | `features/stress.js`, `features/blocks.js`, `features/windfall.js` |
| Port batch 1, countdowns on My Goals, two job offers, which account next | `features/countdown.js`, `features/offers.js`, `features/nextacct.js` |
| Port batch 1, the ledger with three statements, the card vault | `features/ledger.js`, `features/vault.js` |
| Recalculating (the new date and the next turn, the short month, the cushion refill, the safe-to-fail line), the letter exercise, the optional Mistake audit | `features/recalc.js`, `features/exletter.js`, `features/audit.js`, `core/recalc.js` |
| Quizzes: one engine, one sheet, a skin for each quiz (to add one: `docs/QUIZ-ENGINE.md`); the Money Chart is scored by the same engine | `features/quizzes.js`, `core/quizcore.js`, `data/quizskins.js`, `features/chart.js` |
| The money sins read (Menu > "Your money read") and the Rings theme (a theme in THEMES; the ruler of the main pull in the boss fights) | `features/sins.js`, `features/rings.js`, `core/sins.js` (a copy of `js/math/sins.js` of the main app, made by `tools/game_sins_build.mjs`; do not edit it), the words in `js/quiz/skins/sins.js` (copied to `data/quizskins.js`) |
| Report a bug or idea: the button on each screen, the list on the device, the note "It's fixed"; the admin Reports inbox | `features/fbreport.js`, `core/reportcore.js`, `account/adminmore.js` |
| Founding Testers (the first 50 accounts that finish setup), Share SLAM (the personal link `?ref=code`), What's new (the patch notes) | `features/founding.js`, `data/patchnotes.js`, `account/foundadmin.js`, `supabase/migrations/20261125190000_founding_and_referrals.sql` (not applied) |
| Live Session Mode (behind the switch `LIVE_SESSION_READY` in `account/liveflag.js`): the invite link that is the sign-up, the session room, the live fill with the spoken confirmation and the what-ifs (rules, not joined to a saved game yet) | `account/liveflag.js`, `account/live.js` (rules, values only), `account/livefill.js` (what one line means), `account/liveland.js` (how it lands on the profile; `docs/LIVE-SESSION-BUILD.md`), `account/liveio.js` (adapters and the room controller), `account/livesim.js` (stand-ins), `account/liveroom.js` and `session.html` (the session page), `account/livecoach.js` (the coach's card), `supabase/migrations/20261125210000_live_sessions.sql` (not applied) |
| Career and education: a course or degree, side by side, the credential stack, the match that stays with the job, the launch window | `features/career.js`, `core/career.js` (the one engine with `career.html` of the web app) |
| A goal wired to an account and its automatic deposit, in three taps; the health and insurance quests (run JOE-1, features 4 and 5) | `features/goalwire.js`, `features/careq.js`, `data/roles.js` (`WIRE_OPTIONS`, `CARE_QUESTS`) |
| Trips and the journey: a trip line by line, points or cash, a group split by share or by item, the FIRE journey map | `features/trip.js`, `core/trip.js` (the one engine with `trip.html` of the web app) |
| Your unpaid jobs (the six jobs of running your money), admin hours (Running it and Living it), the four ways out of each task (run JOE-1) | `features/jobs.js`, `data/roles.js`, `core/jobs.js` (a copy of `js/math/jobs.js` of the main app, made by `tools/game_jobs_build.mjs`; do not edit it), `docs/JOB-OF-EXISTING.md` |
| List of built features, shown in the game | `features/built.js` |
| Generated map of all files | `CODE-MAP.md` |
| Known weak code | `KNOWN-WEAK.md` |

## 5. How one screen is drawn

1. The player taps a button that has `data-a="roof"`.
2. The click handler calls `ACT.roof(button)`.
3. `ACT.roof` sets `W` (the state of the open sheet) and calls `sheet(rfSheet)`.
4. `rfSheet()` returns the HTML for the sheet.
5. A tap inside the sheet calls a second action. That action changes `W` or the profile, calls `save()`, and draws the sheet again.

## 6. How a feature adds to a screen of a different file

Example: Fork Theory adds one row to Home.

`features/fork.js` has the part. The comment above it names the function that calls it:

```js
/* Part of home() in ui.js. Adds the row for the fork check. */
function homeForkRow(h) {
  ...
  return h; // the HTML of Home, with the new row
}
```

`screens/ui.js` has the screen function. It calls each part by name, in the load order of the files:

```js
function home() {
  let h = homeTop();
  ...
  if (typeof homeForkRow === "function") h = homeForkRow(h); /* fork.js: the row for the fork check */
  ...
  return h;
}
```

The rules of this pattern:

- The screen function is the only place that decides the order of the parts.
- The call has the test `typeof part === "function"`, because the page draws the first time before all files are loaded. Do not remove the test (`KNOWN-WEAK.md`, A10).
- Do not write `const old = home; home = function () { ... old() ... };`. Before 2026-11-22 the game had 61 functions with such layers, in 113 places. `CODE-MAP.md`, section 2, counts them. The count must stay 0.
- The actions (`ACT`) still have layers in 36 places (`KNOWN-WEAK.md`, A9). Do not add more.

## 7. Add-ons (locked content)

Two add-ons contain content for specific players. Only the administrator can turn them on, for each player. Their source code is not in this repository. The files `x1.json` and `x2.json` contain the content in encrypted form. The keys are in the database, and the database rules release a key only to a player with permission. `docs/game-addons.sql` contains the database tables and rules.

The code of an add-on runs in the same global scope as the game, and it can call each function of the game. Thus:

- Do not change the name or the arguments of a function until you know that no add-on uses it.
- This repository cannot run the add-ons. After a change of the structure, run the private add-on tests (`tests/README.md`, "Private tests").
- Put no add-on words in this repository.

## 8. Errors

A `catch` block must not drop its error. It calls `report(e, "file.js: function")` (`core/report.js`). `report()` shows nothing to the player. It keeps the last 100 records.

A part that is not ready must not show as a broken screen. Each tap goes through `soonTap(name, button)` (`core/soon.js`), each sheet through `soonDraw`, and each full draw through `soonRun`. A tap with no action, an action that throws, and a screen that throws while it draws all show one card, "Coming soon". The error is recorded with `report()` first, and it is thrown again after the card is on the screen, so the console still shows it. In the tests the card is off (`SOON_AFTER = "now"` in `tests/harness.cjs`): the error is thrown at once, so a test fails on a real defect. `docs/RELEASE.md` tells how the public site is promoted.

- To read the records, type `ERRLOG` in the browser console.
- To print each record when it occurs, type `SLAM_DEBUG = true` in the browser console.

## 9. Rules for the code

For the player:

- No red in the interface. Amber means "needs attention".
- A number that comes from a guess gets no verdict. Each number has one of three states: Guess, Close, Exact.
- The player taps. The player does not type sentences.
- Each technical term on a screen has an "i" button with an explanation.
- No em dashes in text.
- The words never blame the player. When real numbers move the plan, the game says "Recalculating" and shows the new date and the next turn. It does not say mistake, failed, behind or off track. The one exception is the optional Mistake audit (`features/audit.js`). `test/tone.test.js` of the main app examines the game too.

For the code:

- The math is in the math functions of a feature, or in `derive()`. A screen function only shows what they return (`KNOWN-WEAK.md`, A7).
- Each new number and each new formula also goes into the spreadsheet of the plan: a `...Book(c)` function in the feature file, listed in `BOOK_PARTS` in `features/book.js`. `tests/plan-spreadsheet.js` works out each formula and compares it with the game.
- No file replaces a function of a different file (section 6).
- Two functions must not have the same name. `CODE-MAP.md`, section 2, shows each name with two declarations.
- A new file goes in the folder for its role (section 4), gets a script tag in `index.html`, and starts with the header.
- A function with no caller needs a comment with the reason, or it goes to `unused/` (`CODE-MAP.md`, section 3).
- Write new comments and documents in Simplified Technical English: short sentences, active voice, one meaning for each word.
- Never commit real client data.

## 10. After each change of a script

```
npx prettier --write "game/**/*.{js,cjs}"
node tools/game_stamp.cjs
python3 tools/game_codemap.py
npm run test:game
```

1. Prettier formats the scripts and the tests. The settings are in `.prettierrc.json`.
2. `game_stamp.cjs` writes the version stamps. Each script address in `index.html` and `admin.html` ends with a stamp, for example `core/engine.js?v=1a2b3c4d`. The stamp comes from the content of the file. When a script changes, its address changes, and the browser gets the new file. `npm run test:game` fails when a stamp is old.
3. `game_codemap.py` writes `CODE-MAP.md` again. Make sure that these counts did not go up: replaced functions (0), functions with two declarations (0), hidden errors (0), functions with no caller and no reason (0).
4. `npm run test:game` runs the tests.

For a change of the structure that must not change what the player sees, also compare the old and the new code in a browser: `tools/game_walk/README.md`.

## 11. The retirement engine

Retirement engine by Zack, MIT license. The random markets of the retirement odds, the solver ("When can I stop at 90 out of 100?"), the spending smile, the Social Security claiming ages, the withdrawal methods, the glide path and the 2026 tax tables come from Zack Williams' RetirementPlanner (https://github.com/boatbomber/RetirementPlanner). Only its `src/engine/` folder is in the bundle. Its license and copyright line are at the top of `vendor/retire-engine.js` and in `vendor/RETIRE-ENGINE-LICENSE.txt`.

- `features/retire.js` is the one adapter. It turns a profile into his Scenario type and his results into SLAM numbers in today's dollars. No other file calls `RetireEngine`. `tests/retirement-engine.js` checks this.
- On the website the engine runs in a Web Worker (`vendor/retire-worker.js`), so the screen does not stop. With no Worker (Node.js, or a page opened from a file) it runs on the page.
- To get a new version of his engine: `node tools/retire_engine_build.mjs` (or give it the path of a clone). Then run the steps of section 10.
