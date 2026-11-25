# Progress

A few lines per run, newest at the bottom. What each run is for is in `ROADMAP.md`.

Everything up to Nov 6 2026 (the phases, batches 1 to 63) is in `docs/archive/PROGRESS-to-2026-11-06.md`. The work of
Nov 12 to 14 (the self-serve journey, the standalone modules, sign-in, the papers readers, the card plan) is in the
git log and in `QUESTIONS.md`.

## Nov 14 2026: the roadmap replaced, the logs archived

`ROADMAP.md` is now the suite roadmap: eight runs, a status per tool, and how a run works. The Nov 6 roadmap and the
old parts of this file and of `QUESTIONS.md` moved to `docs/archive/`. Nothing in the app changed.

## Nov 14 2026: Run 1, trust the base

- The second engine: SLAM's money math worked out again in Python and compared to the dollar (`node tools/audit/run.mjs`,
  `docs/AUDIT.md`). 22 kinds of calculation, about 10,000 cases a run, 23 figures checked against the IRS's own print.
- It found three things, now fixed: the lifetime plan's yearly tax did not always settle, a required withdrawal and a
  conversion were counted twice, and Start at the finish line grew money faster than the plan. Four smaller things
  are questions (QUESTIONS 548).
- The kit for a standalone tool: `docs/KIT.md` (one page) and a template in `tools/template`, opened in Chrome at 390
  and 1280 wide with no errors.
- `node --test`: 1,185 pass, 0 fail. The layout check did not finish in this session (the chart library's address is
  blocked here); no screen changed in this run.

## Nov 15 2026: the four answers to the second engine's questions

- Loan interest shows what is really paid. The health credit at a line is left out and the plan says which years and
  why. Early Roth growth counts as income. Money taken out in a working year is taxed. Saving goes in month by month
  in the lifetime plan. Each change was made in both engines and they agree to the dollar; three new tests work the
  numbers by hand.

## Nov 15 2026: Run 2, one engine and the measured collapse

- One engine: every screen already reads the lifetime engine; a test now holds that, and holds one growth pace.
- Quantum Collapse, measured (`docs/COLLAPSE.md`): spending and pay do 87% of the work on the FI date; what is owed and
  cash decide the next step. The first questions are asked in the measured order, and every answer says what it moved.
- The second engine also covers 0% offers. Links already carried a format number, so nothing was needed there.

## Nov 15 2026: Run 3, first-timer walks

- Eight pages walked on a phone width two ways (follow the pulse; type like a person). Five things found and fixed:
  the word "null" printed on three pages, the runway answer not showing while typing, no way to go on after typing on
  the finish line page, a "null" sentence for people who owe nothing, and a builder's word on the front door.
  `docs/KRUG-2026-11-15.md`.

## Nov 15 2026: Run 4, the trip page and the handoff

- New tool from the template: `trip.html`, What does this trip really cost? Math in `js/solo.js` with a hand-worked
  test and a second-engine check. Opened in Chrome at 390 and 1280.
- The handoff walked end to end in practice mode (person, invite, coach, the coach's list). Fixed: a shared plan can
  start from a copy of the answers already given.
- Walks at laptop width and of every plan tab: clean. The pulse moves on while typing. Card page chips are 40px.
- Not done: Read my papers (needs real documents), the FIRE journey map.

## Nov 15 2026: Run 5, the canon replicated

- `docs/CANON.md`: the savings-rate table holds as printed and bends against SLAM's 7%; the 4% rule holds for 30 years
  (97%) and bends for 50 (84%); $100 a month is $30,000 holds; 752 and 173 bend by 1%; Coast FI holds. SLAM's own
  lifetime engine reproduces the classic 4% study.
- New tool from the template: `habit.html`. The answer card now redraws while typing on every templated tool.
- Not done: eight of the ten calculators, and Can I afford it as its own page.

## Nov 15 2026: Run 6, fire drills and a loan page

- `drills.html`: Money fire drills on their own page, for the Nov 30 talk. `loan.html`: What does this loan really
  cost? Both from the template, walked at 390 and 1280 by pulse and by typing, loan math in the second engine.
- The bill drill's wording now matches how its interest is counted.
- Not done: the 50-state cliff map (not started), the household true cost of debt as its own page.

## Nov 15 2026: Runs 7 and 8, as far as they could go

- `ladder.html`: If the pay stopped, what would I use first? The Life Transitions ladder as one page, on a copy of the
  plan. Walked at 390 and 1280; in the second engine.
- Blocked on data, nothing guessed: the career atlas, the city atlas, Aliyah Math. The files needed are named in
  `ROADMAP.md`.

## Nov 15 2026: Test Drive (outside the numbered runs)

- `start.html?dev=1`: eight made-up people as answer scripts (`js/testdrive.js`), saved through the journey's own
  functions. Walk one step at a time (what happened, what changed, why, a check), load instantly, jump to a level,
  flag a step in two taps, export the issue list as a CSV or one fix prompt, snapshots. How it works:
  `docs/TESTDRIVE.md`.
- The same scripts run headless in `node --test` (51 new tests, 2 of them kept as todo for TD-1) and in a browser
  (`tools/e2e/testdrive.cjs`: all eight walked at 1280 and 390).
- The layout checker's journey walk was repaired (it had timed out since the question order changed). Journey:
  column 36 (6 distinct, the home card on What if), every other check 0.
- QA on the Test Drive bar and card (tester-only): Works 5, Right 5, One answer 5, Looks right 4, Obvious 4,
  Findable 4 (only by the dev link, on purpose), Easy 5 (no typing), Plain words 4, Tells you 5, Fits everywhere 4
  (on a phone the card takes half the screen), Fast 5, Coachable not judged. Nothing above cosmetic open.
- Eight findings and four questions: `QUESTIONS.md` 557.

## Nov 19 2026: Runs 5 and 6 finished

- Canon pack: eight small calculators, one page each (`years`, `coast`, `dollar`, `car`, `home`, `worth`, `wage`,
  `split` `.html`). One renderer (`js/solo/calc.js`), eight specs (`js/solo/canon.js`), math in `js/solo.js` with
  eight hand-checked tests. Whose idea each one is, is in its fold. Take-home, spending and invested are the plan's
  own answers, so they are typed once.
- Three pages that answer from the whole plan (`js/solo/plans.js`): `afford.html` (Can I afford it?), `cost.html`
  (What is my debt really costing me?), `student.html` (Which student loan plan costs least?). They show what
  `js/math/afford.js`, `truecost.js` and `studentloan.js` return; no math was added for them.
- The front door links all eleven: the three plan pages in the row, the eight calculators under one fold.
- Second engine: the eight new functions re-derived in `tools/audit/engine2.py`. The two engines agree on all
  204,938 numbers in 15,950 cases.
- Layout check: a new walk (`LAYOUT_ROUTES=calc`) opens all eleven empty and on a made-up plan with every fold open,
  at 1440, 1280 and 390 in both themes. Every check 0.
- `node --test`: 1,222 pass, 0 fail, 43 skipped, 2 todo.
- Not done: Run 7 (both atlases) and the other 49 states of the cliff map are still waiting on data files. No
  numbers were guessed. Sign-in still needs the project keys.

## Nov 22 2026: SLAM the Game, the code made ready for review

The goal: two software developers can read and review the code of the game. The player sees no change.

- Layers merged (`game/KNOWN-WEAK.md`, A1). Before: 61 functions were replaced by later files, in 113 places (`home` had
  12 layers). Now: 0. Each screen function calls its parts by name, and each part is a named function in its feature
  file. `game/README.md`, section 6, shows the pattern.
- Hidden errors (A3): 115 empty `catch` places now call `report(e, where)` (`game/core/report.js`). `ERRLOG` in the
  browser console shows the last 100 records.
- Code with no caller (D): five functions moved to `game/unused/`. Four stay, each with a written reason.
- Folders: the 61 scripts are in `game/core`, `data`, `account`, `screens` and `features`. The address
  `game/index.html` and the load order did not change.
- Headers: each script starts with PURPOSE, INPUT, OUTPUT and DEPENDS ON, in Simplified Technical English.
- Version stamps (C2): each script address ends with a stamp from the content of the file (`tools/game_stamp.cjs`).
- Tests: 32 test files, each with the name of its feature (`game/tests/README.md`). B1 and B2 were defects of the
  tests, not of the game, and are corrected. `npm run test:game`: 703 checks ok, 0 failed, exit code 0.
- Proof that the player sees no change: `tools/game_walk` (new) ran 120 walks with random taps in Chromium on the old
  and the new code, and the records are the same. 337 of 342 screenshots at 390, 1280 and 1440 wide are the same byte
  for byte; the 5 others are a coin that moves all the time. `node --test`: 1,259 pass, 0 fail, 6 skipped, 2 todo,
  the same as before.
- Not proven: the private add-ons (their source is not in the repository) and the real database.
  `game/KNOWN-WEAK.md`, section E, has the details.
- Found and not repaired, because the repair changes what the player sees: the menu row "Our household" opens the
  sheet "Put SLAM on your home screen" (A8), and the sheet "Share" shows the address of the retired copy (C6).
- Questions for the owner: `QUESTIONS.md`, 561.

## Nov 24 2026: the overnight build

- `STATUS.md` has the list: what was there, what the run added, what was skipped and why, and the click counts.
- Game, new: the character reveal with the money element, five gear slot states, the product X-ray, Break in case of
  emergency (a layoff), Kids mode, the spreadsheet's way back, how long each fire drill lasts with a small real dose.
- Game, changed: Next Steps opens on Today, plain words on the board, the log opens on the first open question, one
  list of amounts, no red in Safe to spend.
- Web app: `aliyah.html` (US vs Israel), and the card plan's balance on each card and spending that can move.
- `USABILITY.md` (three personas, two rounds), a math audit of four core numbers, `tools/game_clicks.cjs`.
- `npm run test:game`: 1,566 checks ok. `node --test`: 1,240 pass, 0 fail.
- Questions: `QUESTIONS.md` 572 and 573. Decisions: `DECISIONS.md`. What to try first: `MORNING.md`.

## Nov 25 2026: RUN: Finish everything partly built (Nov 25 2026)

Run name: **Finish everything partly built (Nov 25 2026)**. 21 parts, in the order of the prompt. Each part is
committed and pushed to main when it is done, so a stop midway keeps the finished parts. The state of each part is in
`STATUS.md` (the section of this run). A line is added here for each part as it lands.

- Started. Baseline: `node --test` 1,240 pass, 0 fail. `npm run test:game` 71 files, 1,764 checks ok, 0 failed.
- Part 1, FI number variants: done. Web app: five destination views on Plan › Goals (Lean, Barista, Regular, Chubby, Fat) with the Fat list and the Barista gap, the FI date stress test (4 withdrawal rates x 3 returns), the pod FI number for two or more adults, the FOO order by destination on Plan › FOO, and the one-time card "You can stop sprinting" on Home. Game: the FI ratio on Key numbers and the same card on Home (`features/coast.js`). New math M9G, M9X, M9Y (`js/math/fi.js`, `js/math/destinations.js`), in the second engine too. Questions: `QUESTIONS.md` 580.
- Part 1, follow-up (Eli's answers to QUESTIONS 580): done. The FOO by destination keeps the oxygen mask steps in place and moves only the late steps (Lean adds the taxable bridge after the tax-free step, Barista puts the HSA and the health-cover bridge first of the late steps, Fat fills every tax-advantaged account after the tax-free step). The Barista number adds health insurance unless a tap says the part-time job covers it (M52, with the part Math_M52_health in the workbook). The pod view has one collapsed line for each person living apart (a range). The Fat list says what help at home and giving mean. Back under Coast: one quiet Recalculating card on Home, web app and game, from one function (rcCoast in js/math/recalc.js). The game's FI ratio has an "i" for how it differs from While you slept. Second engine: the Barista number and the months back to Coast (closed form).
- Part 2, Home buying and renting: done. One engine for the web app and the game (`js/math/homebuy.js`, M9O; `tools/game_homebuy_build.mjs` writes the game's copy). `home.html` gained four answers under the lender's lines: the bank's payment (principal and interest) first, the true cost of owning line by line, the true cost of renting, and the year owning comes out ahead (or "Renting is cheaper the whole time"), with the price-to-rent ratio and the 5% rule beside it, a year-by-year table and the math. The game's simulator Rent or buy now calls the same functions: the six lines of owning in a closed group, lines with no typical number count as nothing until tapped, PMI only under 20% down, the breakeven year, the two rules of thumb, an "i" for each term (two of them had no words before). Typical ranges only where Eli gave them (maintenance 1 to 2%, rent growth 3 to 4%). Second engine: 104 checks a case in closed form. `tools/e2e/layout.cjs` not run (no local server in this session).
- Part 3, Career and education: done. One engine for the web app and the game (`js/math/career.js`, M9Z; `tools/game_career_build.mjs` writes `game/core/career.js`, a test fails when the copy is stale). It is the one engine of Career ROI and the Skills calculator (the older `engines/credential.js` and `engines/degree.js` of Personalfinance, reused). Web app: new page `career.html` "Does this course or degree pay back?" (on the hub's More to explore): presets (a 4-year degree, trade school, a certificate, one skill; each a sample of the time only), the whole price with the pay given up and the loan's interest, the raise after tax, payback years, lifetime value, the FI date change in days (M53 run again, `fi.fiMoveOf`); trade school and a 4-year degree side by side; the credential stack with its overlaps; the match that stays with the job before it vests (right away, 3-year cliff, 6-year graded from the IRS, or the plan's own percent); the launch window (a job hop less the match that stays with the job, traditional next to Roth, a house hack), each as days on the FI date. Game: Menu "Career and education" with five tabs in the new look, the freedom date from `goalSim` (new option `flows`), a link from Two job offers, spreadsheet rows, What's built row, What's new entry. Second engine: four new case kinds, all agree.

## Nov 25 2026: RUN: Not built, groups 1 to 5 (Nov 25 2026)

Run name: **Not built, groups 1 to 5 (Nov 25 2026)**. 11 parts, in the order of the prompt. It runs next to the run
"Finish everything partly built" (above), in its own working copy, and each part is committed and pushed to main when
it is done. The state of each part is in `STATUS.md` (the section of this run). A line is added here for each part.

- Started. The tone rule of this run is for the whole app: "Recalculating", not mistakes.
- Part 1, Recalculating and the audit: done. One math file, `js/math/recalc.js`, with no imports; `node tools/game_recalc_build.mjs` copies it to `game/core/recalc.js`, so the web app and the game work every number out with the same function (a test fails when the copy is old). (1) The route: the plan as it was last kept (web: the last snapshot; game: kept on the first look, then by a tap) next to today's numbers, one card with the old date, the new date and the one next turn, on Home, Budget, Debt and Debt payoff, and in the game on Home, the Money tab and the debt plan. The next turn is the smallest extra a month that brings the old date back, from the app's own debt plan. (2) From where you are: the new date always starts from today's balances. (3) When it won't all get paid: the income goes down the order (housing, utilities, food, transport, minimums, the rest) on the same total The gap shows, with what to say on the phone to each kind of creditor (no phone numbers). (4) Emergency fund refill: after a recorded dip (web) or a drop in cash (game), what to put back, the months and the month it is whole. (5) Done for this month: one card, and it stops. (6) Safe-to-fail line: one fun line that can run out; the plan counts it either way. (7) Letter from your calm self: built as one self-contained exercise (`js/exercises/calm-letter.js`, `js/ui/exercise-letter-ui.js`, `game/features/exletter.js`), taps, typing or voice-to-text, "Who sees this: Me only", shown in a hard month. (8) Mistake audit: opt-in and closed, under Year in review (web) and at the end of the Yearly Review and in the menu (game): tag past events mistake or unavoidable, the cost then and over time, FI days, hours of work, repeats, the mistake tax. The blame-word sweep changed 37 strings; `test/tone.test.js` fails when mistake, failed, behind or off track comes back in copy outside the audit. Second engine: five new functions. QA on the touched screens: Works 5, Right 5, One answer 4 (the triage and The gap now share one total; the web app compares to the last snapshot while the game keeps its own kept plan), Looks right 4, Obvious 4, Findable 4 (the audit is closed on purpose), Easy 4, Plain words 5, Tells you 4, Fits everywhere 4, Fast 5, Coachable 4. No blocker, no major.
- Part 1, follow-up (Eli's four answers to QUESTIONS 581): the triage pays health insurance and medicine, then childcare "if it lets you keep working", right after housing, utilities and food. The phone scripts are behind one switch that is off (`RC_SCRIPTS_REVIEWED`), with a calm "Coming soon" card in both apps and tests that no script text reaches a screen. A date that moves sooner reads "New route: 3 months sooner" and is kept as a win (web: a Win on the calendar; game: the celebration). In the Mistake audit, hours of work stand in for FI days when a day of saving is zero or less, and FI days and the mistake tax each have their own Show the math. The second engine checks the new order and the guard; it found one edge (a total of 0 FI days with no tagged event and no saving), now empty. New questions: QUESTIONS.md 585.
- Part 11, Quiz frameworks: done, and built out of order (before Parts 2 to 10), because the run "Money sins system" and the quiz styles of quiz.html both wait for the engine. (1) One engine: `js/math/quizcore.js`, pure functions with no imports. A quiz is a definition in plain data: questions with tap answers, each answer adding points to named traits; the scoring takes scores from outside as an input; a result carries the top two, ties, a top two for each family of traits, and a level in the words Early read, Close read, Confirmed by you; one card (a title, two or three lines, the light side, one next step) that routes to real skill, tree and reading ids. `node tools/game_quiz_build.mjs` copies the engine to `game/core/quizcore.js` and the skins to `game/data/quizskins.js`, and writes `data/quiz/routes.json`; a test in each suite fails when a copy is old. (2) Eight skins, one data file each in `js/quiz/skins/`, 7 to 12 taps: Money Letters (Eli's own four letters and 16 names), the FI Address as taps (Eli's own characters), the Four Money Houses, Pick Your Money Avatar, Roll Your Money Sheet (six stats, six classes), the Money Pyramid, the FI Pathway as a ski mountain, the Money Sky (playful, and labeled so). All new words are original. The sins skin is a placeholder: in the list, "Coming soon". (3) Each skin says in its file how it maps to the five elements or to a line of the character sheet; the card says "Your element stays Fire." or asks "keep Fire or switch?", and nothing changes without that tap. (4) One renderer in the web app (`js/quiz/page.js`, on `quiz.html` under "More quizzes") and one sheet in the game (`game/features/quizzes.js`: Me › Quizzes, and the Menu). (5) Private by default: the web app leaves a result out of every shared copy until the person shows it; in the game a coach or admin sees no result until the player turns "Show it on my character sheet" on. (6) The quizzes that were there moved onto the engine with the same results, each held by a digest of its old results: the Money Chart in both apps, Quantum Collapse (5,250 answer sets), the Money Letters (531,441 answer sets). (7) `docs/QUIZ-ENGINE.md`: add a skin in five steps, the outside scores, a new question style. Not built: the money weather (6 taps) stays on its own small scoring; the game's Money Chart keeps its own screens; no row for quiz results in the plan spreadsheet (they are not money numbers).

## Nov 25 2026: RUN: Launch ready for the Nov 30 soft launch (Nov 25 2026)

Run name: **Launch ready for the Nov 30 soft launch (Nov 25 2026)**. 6 parts: a stable public site (the branch
`release` and `tools/promote.sh`), Report a bug or idea, Founding Testers and sharing, Trust, Email, the front door.
It starts when each of the two other runs has finished the part it is on. The two runs wait until this one is done.
A line is added here for each part.

- Logged. Waiting for Part 1 of each of the two other runs to land.
- **Part 1, a stable public site: done.** The branch `release` exists (made at `41441f3`, the last `main` commit where both suites pass, tested on that exact commit). `tools/promote.sh` (one command: `bash tools/promote.sh`) tests the exact `main` commit of GitHub in a temporary folder and fast-forwards `release` only when `node --test` and `npm run test:game` both pass; it never forces or merges (`test/promote.test.js`, 8 tests with a local remote). `docs/RELEASE.md` has the clicks for GitHub Pages and the rule "promote at the end of every run"; `CONTRIBUTING.md` has the short form. "Coming soon": one shared piece in each app (`game/core/soon.js`, `js/ui/soon.js`). A tap with no action, an action or a screen that throws, a Menu row with no action and a route with no screen all show one calm card; the error is still recorded and still reaches the console (`game/tests/coming-soon.js`, 40 checks; `test/soon.test.js`, 6 tests). Found and repaired on the way: in a browser, each Menu row of the game closed again at once, and a Menu row that goes to a tab went back (`uxPop` in `game/screens/ux.js`). Not done here: the switch of GitHub Pages (Eli), the stand-alone calculator pages, `admin.html` and `coach.html`.
- Part 5, Email: done. `docs/EMAIL-SETUP.md` has the click-by-click steps for Eli: a free Resend account, proving a domain, one key that goes straight into Supabase (Authentication, Emails, SMTP Settings) and nowhere else, the email limit to raise, "Confirm email", a test, and where to look when an email does not arrive. It ends with a five-line checklist, a "Check on the screen" list of what could not be read from an official page, and the sources with the date. No key is in the repository. One line in `docs/CLOUD-SETUP.md` points to it. Nothing in the app changed.
- Part 2, Report a bug or idea: done in both apps; the database file waits for Eli. One core, `js/report/core.js` (`node tools/game_report_build.mjs` copies it to `game/core/reportcore.js`; a test fails when the copy is old): the sheet (Bug, Idea or Confusing, a note, a picture the person chooses, made small in the browser), the list on the device, the sending, the rows of the inbox. A report carries the screen name, the last 3 taps (names of buttons, never a value), the device, the width, the browser and the app version (the game: one code from the script stamps; the web app: the day the page was published), and no money number. The game (`features/fbreport.js`): the button "Report" in the top bar of each tab, at the end of each sheet, on the welcome screen and the sign-in screen; it replaces "Flag this screen" (old flags stay under Me, "Your reports"); Home shows "You reported this. It's fixed." one time after the admin marks it. The web app: "Report a bug or idea" in the top bar of the shell (and the More menu opens the same sheet), a "Report" row on each of the 29 other pages. The admin page: the section "Reports inbox" (newest first, filter by type, Open their game at this screen with `?as=` and `?at=`, Mark Fixed, undo). The database: `supabase/migrations/20261125190000_reports.sql`, NOT APPLIED, tried two times on a local PostgreSQL 16 with each role; a visitor who is not signed in can add and cannot read. Until Eli runs it, a report says "Saved on this device" and sends itself after. Tests: `test/report.test.js` (9), `game/tests/report-a-bug-or-idea.js` (81 checks).
- **Part 3, Founding Testers and sharing: done in the code; the database part waits for Eli.** (1) Founding Testers: `supabase/migrations/20261125190000_founding_and_referrals.sql` (NOT APPLIED, safe to run twice) adds one table (`account_setup`: when setup was finished, the founding number 1 to 50, the share code, the code the person arrived with), `setup_finished(ref)` (the game calls it one time; a lock means two people who finish at the same moment cannot both get number 50; the admin account takes no number) and `admin_founding()` (the live count and who joined through whom, admin only). After the file runs: the mark "Founding Tester" on Me, on People and on the character sheet, and one card on Home, one time ("You're one of the first 50. Want a free 20-minute walkthrough with Eli?", Email Eli opens a draft to stresslessaboutmoney@gmail.com, Not now closes it for good). Before the file runs: no mark and no card, never from a guess on the device. (2) Share SLAM in the Menu: one link for each account (`?ref=code`; the code is the first 8 letters of the SHA-256 of the account id, the same in the game and in the database), Copy my link, the share sheet of the phone where it exists, one line "No rewards yet". The code a person arrives with is kept from the first page load through the sign-up and sent at the end of setup. (3) What's new in the Menu of the game and in the More menu of the web app: one data file, `game/data/patchnotes.js`, 9 entries, the newest first; `CONTRIBUTING.md` tells each run to add one entry. (4) Admin page: the section "Founding Testers: N of 50" with "Who joined through whom", collapsed; before the file runs it says that it waits. Tests: `game/tests/founding-share-whats-new.js` (the game, the admin section, the SQL read as text), `test/whatsnew.test.js`. Questions: QUESTIONS.md 587.
- Part 4, Trust: done, with two steps that wait for Eli (one database file, one switch). The privacy page `game/privacy.html` (linked from sign-up, the Menu, My account, the foot of each main screen and each footer of the web app) says what is stored, where, who can see it, and has "Delete my account" (asks two times; removes the saved game and the copy on the device today, the sign-in too after `supabase/migrations/20261125200000_delete_my_account.sql`, NOT APPLIED). One line everywhere: "Education and tools, not financial advice." (`TRUST_LINE`). Eli's decision built: "Share with my coach" starts off for a public link and on for a coach's invite link (`?coach=1`). Sign-up: "Check your email" with what to do if nothing arrives, calm words when the email cannot be sent or the sender is over its limit, never a raw error; `EMAIL_READY = false` shows "Forgot your password? Contact Eli." until email works. Add-ons: checked in the code, in the database rules (read only, on the live database) and in a browser with a stand-in database; the sealed-files test now covers a new account. New code: `game/account/trust.js`, `js/trust.js`. Tests: `game/tests/trust-and-privacy.js`, `test/trust.test.js`, more checks in `addon-sealed-files.js`. QUESTIONS 589.
- **Part 6, the front door: done.** The link for the slide is https://sapphirestoneage.github.io/Slam/game/ (`docs/LAUNCH-LINK.md`). A new visitor with no account on the device sees a landing screen (`game/account/door.js`): the line "Find out if you're okay with money in 2 minutes, no typing, free.", one big Start, "I have an account. Sign in", "What is this?" (closed; three plain lines, the advice line, the shared blank FIRE sheet button `fireBlankButton()` of the Export run), and Report. A signed-in person, and a visitor who already has a game on the device, go straight to the game. Start needs no account: it opens the existing setup by taps under the question "Am I okay?" (no fast finish on this path), and the last tap opens the answer (`game/features/okay.js`, `okCalc`): the cushion, a $1,000 surprise, the money left from each paycheck, debt, investing, the era and the one next step, all numbers that the profile and `derive()` already have, each marked Guess, with no grade. Then "Save my answer: make a free account" opens the sign-up screen (it now has a Back button and scrolls on a short phone); Home keeps a row "Keep this game" until there is an account. `?ref=` and `?as=` stay in the address. `docs/qr-slam.png` comes from `python3 tools/qr_slam.py --check` (1025 pixels, read back to the exact link with OpenCV). Walked in Chromium at 390 x 640 (`node tools/e2e/door_walk.cjs`): 21 taps from Start to the answer, everything of the landing on the first screen. Tests: `game/tests/front-door.js` (65 checks), `test/launch-link.test.js` (3). Not promoted (the coordinator promotes at the end of the run).
- **END, done (Nov 25 2026).** Counts on the merged main: `node --test` 1401 tests, 1352 pass, 0 fail, 47 skipped, 2 todo (the two known ones); `npm run test:game` 80 files, 2303 checks ok, 0 failed. The promote line is in the run summary. **The walk** (`node tools/e2e/launch_walk.cjs`, new, Chromium at 390 x 640 and 390 x 844, with a stand-in for the sign-in library): the slide link with `?ref=abc123`, the landing, What is this? open and closed, Start, the 7 setup pages (20 taps), the answer, Report (Confusing, a note, Send: "Saved on this device. It sends itself when the report inbox is ready."), the sign-up screen (sharing starts off), Sign in ("Forgot your password? Contact Eli."), a new account, Home, the Menu rows What's new, Share SLAM, Privacy, Export, Am I okay?, then a coach's invite link (sharing starts on). At each step: no console or page error, no sideways scroll, no "undefined", "NaN", "null" or "[object", no blame word, no em dash, each main button 44 high or more. **Repaired, each with a test:** (1) right after a visitor made an account, the open answer still said "Save my answer: make a free account" and Home still had the row "Keep this game" until some other tap; now both redraw at once and the answer says "Your account is made, and this game is now kept in it." (`doorSigned`, `game/tests/front-door.js`); (2) the choice chips of the game were 43 pixels high, now 44; (3) the privacy page said "lines of failed saves" after a delete, now "saves that did not go through", and after a delete it has a button back to the game; (4) the long file name in the "waits" line of the Reports inbox wraps on a phone; (5) the one button of the web app's Coming soon card is 44 high; (6) `staples.html` (the builder's gallery; nothing links to it) threw an error and drew nothing, because its spending list was asked for with no month (`test/staples-page.test.js`); (7) the QR code inside the game (Me, Share the game) pointed at the retired copy and spoke of a locked page: `tools/qr_slam.py` now makes it from the slide link together with `docs/qr-slam.png` and reads both back, and `test/launch-link.test.js` holds the link in this fourth place too. **Settled:** the 42 layout failures (clipped placeholders on credit cards, income, taxes, scenarios, assets; the chip columns of `start.html#/tune`) are the same 42, item for item, at commit `0c585e7` (the main before these runs): they predate this run and are not repaired here. `staples.html` still scrolls sideways at 390: it was never made for a phone. What's new has three more entries (Compare the ways, Export, Privacy), 13 in all. **For Eli:** `docs/LAUNCH-CHECKLIST.md`. Questions: QUESTIONS.md 591.

  QA.md scorecard of the screens this run touched (pass, or the finding with its severity; "stand-in" means the screen was drawn with a stand-in for the database, never with the real one):

  | Screen | Works | Right | One answer | Looks | Obvious | Findable | Easy | Words | Tells | Fits | Fast | Coachable |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | Landing (the slide link) | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
  | Am I okay? (setup by taps) | pass | pass | pass | pass | minor: four counters at once (step of 4, questions left, question of 4, page of 7) | pass | minor: 20 taps; the 2 minutes are not timed with a person | pass | pass | minor: Back and Close of each sheet are 36 high | pass | pass |
  | Am I okay? (the answer) | pass | pass | pass | pass | pass | pass | minor: at 390 the offer to save is one scroll down | minor: the era name (for example Digging Out) is not explained here | pass (after the repair) | pass | pass | pass |
  | Report sheet (game and web app) | pass (stand-in) | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
  | Sign-up and sign-in | pass (stand-in; the real service not tried) | pass | pass | pass | minor: a person with an invite link has to tap "I have an account" or Start to reach "Create your account" | pass | pass | pass | pass | pass | pass | pass |
  | Admin: Reports inbox | pass (stand-in, both states) | pass | pass | pass | pass | pass | pass | pass | pass | pass (after the repair) | pass | pass |
  | Admin: Founding Testers | pass (stand-in; its database file was never run) | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
  | What's new | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
  | Share SLAM | pass | pass | pass | pass | pass | minor: two ways to share (Menu, Share SLAM; Me, Share the game) | pass | pass | pass | pass | pass | pass |
  | Privacy page, Delete my account | pass (stand-in, each state) | pass | pass | pass | pass | pass | pass | pass (after the repair) | pass | pass | pass | pass |
  | Export | pass (the .xlsx with the real library not tried here) | pass | pass | pass | minor: the Menu row says Export, the screen says "My plan as a spreadsheet" | pass | pass | pass | pass | pass | pass | pass |
  | Coming soon card (game and web app) | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass (after the repair) | pass | pass |

## Nov 25 2026: RUN: 4% rule vs guardrails and every way to take money out, side by side (Nov 25 2026)

Run name: **4% rule vs guardrails and every way to take money out, side by side (Nov 25 2026)**. One screen,
"Compare the ways", in the game (Taking money out) and in the web app lifetime plan: the same plan through each way
of taking money out, as families with variants. It is built in its own working copy, next to the other runs.

- Started.
- Built. One file holds every rule (`js/math/withdraw.js`): 34 ways in 8 families. The lifetime plan (`js/math/lifetime.js`) and the game's replay (`game/features/odds.js`) both call it; the game loads a generated copy (`game/core/withdraw.js`, `tools/game_withdraw_build.mjs`), and a test in each suite fails when the copy is stale. Both engines take the money out on the first day, in twelve monthly steps, or on the last day. The market history gained the CAPE and two yields from the same Shiller file (`tools/history_extra.py` checks every return on file first). Screens: the game's Taking money out has the tab "Compare the ways" (`game/features/ways.js`); the web app's Lifetime plan has the card "Compare the ways" (`js/start/ways-ui.js`, `js/lifetime/compare.js`), which works one row out at a time so the page stays live, and downloads its table as a spreadsheet file. Each row: year one a month and a year, random markets and real start years that work, the hardest start year, the deepest cut, years with a cut, what is left, the age work can stop, with its math. Sort by any column, three quick picks, three pins, one chart from the start year 1966, one line of plain words. Second engine: four new kinds of case; 554,910 numbers agree in the full run. Switched off with a note: VPW, and the RMD method before 73. Game only: keep the odds in a band. Tests: `test/withdraw.test.js` (20), `game/tests/compare-the-ways.js` (64). Questions: 584.

## Nov 25 2026: RUN: Export for the FIRE spreadsheet crowd (Nov 25 2026)

Run name: **Export for the FIRE spreadsheet crowd (Nov 25 2026)**. An .xlsx download in the game with live formulas
and the round trip back in, a "FIRE sheet" tab first in the workbook, a clean open in Google Sheets, one "Export"
entry in the menu of both apps, and a button to Eli's blank FIRE sheet. It is built in its own working copy, next
to the other runs.

- Started.
- Part 1, done (all five items; see what was not verified at the end of this line). (1) The game: Menu, Export has "Download for Excel or Google Sheets (.xlsx)" next to the CSV. One export engine: the game has no writer of its own; its button loads `js/sheet/planbook.js` of the web app with `import()` and that module writes the file with `js/sheet/excel.js` (`js/sheet/fmt.js` was split out so the writer loads without the registries). The file has the FIRE sheet, the tab "My plan" (every number, the formulas live) and the three tables of the retirement engine. It comes back in through the same module: choose the .xlsx (or a CSV), see each change, tap one to leave it out, then use them. (2) The FIRE sheet is the first tab in both apps (`js/sheet/fire.js`, math in `js/math/firesheet.js`, M9I): the inputs in a marked box at the top in blue, then one row a year with year, age, stage (the stop age says "Stop work" and its row is shaded), income, spending, savings, savings rate, what goes in by account type, the invested balance, the FI number, % to FI, the withdrawals by the chosen way and the balance. Every year cell is a formula on the inputs. The chosen way comes from the plan (the web app: `assumptions.lifeStrategy` through `lifetime()`; the game: its odds method): steady, a share, floor and ceiling, and guardrails are live formulas; any other way, also one added later, keeps the live column on "the same amount each year", says so, and carries the app's own values in two columns. The replay of history and the random markets are carried as values with a note. (3) Google Sheets: `test/firesheet.test.js` holds the list of allowed functions (all 42 the two workbooks use), LibreOffice recalculates every FIRE sheet cell for 8 cases, a changed input, and the game's whole workbook with no error cell; a help line "Open in Google Sheets" with the steps is beside the button in both apps. (4) One Export entry: the game's menu row "Export" (was "My plan as a spreadsheet"); the web app's More menu, "Export" (a panel with the download, the way back and the blank sheet). (5) "Start from a blank FIRE sheet" in both Export entries, one function for both apps: `fireBlankButton()` in `game/features/firelink.js`. Also fixed on the way: in the game a row of the menu that opens a sheet closed it again a moment later in the browser (the step back in the browser history arrived after the new sheet opened; `screens/ux.js`). Second engine: `tools/audit` works every FIRE sheet row out again. Not verified: the real import into Google Sheets, Excel itself, and the .xlsx button with the real CDN (the build machine cannot reach it; the browser walk used the same ExcelJS file from `node_modules`). Tests: `node --test` and `npm run test:game` green (the counts are in the commit).

## Nov 25 2026: RUN: Money sins system and the Rings theme (Nov 25 2026)

Run name: **Money sins system and the Rings theme (Nov 25 2026)**. 3 parts: the read (a main pull from the 7 sins and
a main way of refusing change from 12, from four sources of evidence), results and growth, and the Rings theme. It
reuses the quiz engine of Part 11 of the run "Not built, groups 1 to 5", so that part is built first, right after the
launch run. A line is added here for each part.

- Logged. It starts when the launch run is done and the quiz engine is on main.
- Part 1, the read: Done. The sins quiz is real (15 taps, 7 sins and 12 ways of refusing change, a top two in each, the light side). `js/math/sins.js` (copied to the game by `tools/game_sins_build.mjs`) reads four sources on the one quiz engine: the quiz, the ledger (after payday, after a stressed tap, how often, over the plan), one-tap check-ins (over the line or a pattern, 3 a week, skippable) and the reactions to the app; evidence fades with a 30 day half-life; a label only when two sources agree over 30 days; Why we think this, Is this really it?, Test the fix. Web: under the sins quiz on quiz.html. Game: Me > Your money read, and a check-in after Money out. Private by default in both. Signals with no data behind them are in QUESTIONS 599.


## Nov 25 2026: RUN: Live Session Mode (Nov 25 2026)

Run name: **Live Session Mode (Nov 25 2026)**. 9 parts plus tests and a report: Eli runs a coaching call, presses
Start one time, and the client's game profile fills in while they talk (text only, no audio is saved). The whole
feature stays behind one switch that is off until the last part's tests pass. A line is added here for each part.

- Logged.
- Parts 1 and 2, done in the code, behind the switch `LIVE_SESSION_READY = false` (`game/account/liveflag.js`); the database file waits for Eli. Part 1: `game/session.html?invite=token` is the sign-up ("<coach> invited you to SLAM": name, email, password; the sign-up goes through `tuAuth`; the token is kept through the email confirmation; the account is tagged as that coach's client and starts with Share with my coach on); a used or expired link says so and offers "Ask your coach for a new link"; the coach page has "Start session with a new client" (the coach types only the client's name, optional), Copy the link, the list of invites (sent, signed up, in the room), and "Start session" in each client's card. Part 2: the room as rules first (`game/account/live.js`, values only), thin adapters (`liveio.js`) with a stand-in for each (`livesim.js`), and plain screens (`liveroom.js`): the consent with one OK for each side, Start off until both tapped, the microphone step, the headphones question, one Start, the pill with two lights, silent restart of speech recognition with a growing wait, Reconnect after a real stop, the wake lock, lines kept on the device until the database confirms them (a reload joins the same session; an id made on the device, so no line two times), You and Them by device, the echo filter (normal: 2 seconds, 3 words or more, 80% shared words; strong when a side has no headphones: 4 seconds, 2 words or more, 60%, or 80% of the shorter line inside the longer), and the side that cannot listen. No audio anywhere: the page never opens the microphone itself. Database: `supabase/migrations/20261125210000_live_sessions.sql`, NOT APPLIED. Tests: `game/tests/live-session-rules.js`, `live-session-invite.js`, `live-session-two-devices.js` (321 checks). Not tried, because it cannot be done from the build machine: real microphones, two real devices, real speech recognition, the real realtime channel, the SQL in a database. The list for a real dry run and the names for the next parts: `docs/LIVE-SESSION-BUILD.md`. QUESTIONS 592.
- Parts 3, 4 and 5, the rules, done and tested behind the switch; not joined to a real saved game yet (that is Part 6). Part 3: `game/account/livefill.js` reads spoken money, rates and the pay rhythm (and refuses phone numbers, years, times, counts), the coach's line sets the topic and only the client's words give a value; `game/account/liveland.js` lands it in the game's own row as a Guess with a record (`c.x.live`), keeps both numbers of a correction, and never changes what the person entered (the heard value is kept with the reason). Part 4: "Confirming rent 1,850" plus the client's yes in 10 seconds raises the value to Close, never Exact. Part 5: what-ifs go to a list with the quote, the speaker and the time; a type sends each one to a limit, a simulator, Break in case of emergency or the bucket list. Small changes in the game so a heard Guess keeps its amount (`alloc.js`, `engine.js`, `debts.js`, `ui.js`). Three new test files, 357 checks. Real speech recognition output was not seen: the assumed forms and the dry-run list are in `docs/LIVE-SESSION-BUILD.md`.
- Parts 6 and 7, done in the code behind the switch (the stopped worker's files finished, not started over). Part 6: the live fill is joined to the client's saved game (`game/account/livegame.js`; the session page loads the game's own engine, recalc, question words, fill, dashboard kit, cloud and coach-page files, no copies); the coach's screen (profile by area with Guess / Close, heard tag, glow, pulse; next question in the game's order and words with the "Confirming" phrase; heard list; what-if counter) and the client's calm screen (four stat tiles, a Recalculating line, Show details), Pause and End only (`game/account/livescreen.js`). Part 7: the review after End (`game/account/livereview.js`): the counts line, the groups, approve all, fix one three ways, leave it out back to before the call, sources, what-if types with links; the client's calm ended screen; Show plan on both. Walked in Chromium at 1280 and 390 with the simulated call (switch on in the test page only); fixed: groups that stayed open by themselves, groups that closed on a redraw, the next question under a long profile on a phone, stretched Guess pills, a "0 what-ifs heard" line on the client's screen. Tests: `live-game-join.js`, `live-screens.js`, `live-review.js`. QUESTIONS 597.
- Parts 8 and 9, and the tests, checks and report, done behind two switches that stay off (`LIVE_SESSION_READY`, `AI_PASS_READY`). Part 8: the Edge Function `supabase/functions/live-ai-pass` (NOT DEPLOYED; key from its own secret only) and `docs/AI-PASS-SETUP.md`; in the review, drop in the Samsung file, the speaker match, the AI's proposals in the same groups (applied only on Approve, as a Guess), draft notes and agenda saved to the coach's notes on Save, the token count of each pass, the reminder to delete the recording (`game/account/liveai.js`). Part 9: the privacy page's Live Session section, one line under the consent words, Delete this transcript for both sides (`game/account/liveforget.js`, a delete rule in the NOT APPLIED SQL file). Fix from the last walk: Start waits for the client's microphone and headphones steps, or "Start with my side only". Tests: `live-ai-pass.js`, `live-checklist.js`; the walk `tools/game_walk/live.cjs` (Chromium, 1280 and 390, coach and client). Report and Eli's dry-run checklist: `docs/LIVE-SESSION-BUILD.md`. QUESTIONS 602.

## Nov 25 2026: end of the session

A usage limit stopped the workers of three parts. Finished parts are on main and promoted to release; the two parts
that had files written (home buying and renting; Live Session Mode Parts 6 and 7) are kept on the branch
claude/upbeat-hopper-u0amw2. `STATUS.md`, section "Where the runs stopped", has the table and the order to continue.


## Nov 25 2026: RUN: JOE-1, The Job of Existing (Nov 25 2026)

Run name: **JOE-1, The Job of Existing (Nov 25 2026)**. Six features for SLAM the Game, from Eli's prompt: your
real job is the unpaid work of running your money (CFO, Accountant, Financial Planner, Insurance Coordinator, Health
Care Admin, Deals Manager), and SLAM does that job for you. Three workers, one after the other. A line is added here
for each part.

- Logged. What exists and what each feature extends: `docs/JOB-OF-EXISTING.md`.
- Features 1 to 3, done (worker 1). The six unpaid jobs from answers already given, on the character sheet and on Me, each opening its next step, its tasks and its hours (`game/features/jobs.js`, `game/data/roles.js`); the math in `js/math/jobs.js` with its game copy `game/core/jobs.js` (made by `tools/game_jobs_build.mjs`), hand tests in `test/jobs.test.js`, the second engine in `tools/audit` (jobRoles, jobLiving). Admin hours in the time ledger with Guess / Close / Exact, Running it and Living it on Home, "saves you ~X min/month" with Show the math, 16 rows in the spreadsheet of the plan. The four exits on every recurring task (the list of each job, the player's schedules, the seasonal items), each undoable; Automate it uses the schedule's automatic switch or the automation skill; Hand it off writes the household role map record `c.x.roleMap`. Test: `game/tests/your-unpaid-jobs.js`. QUESTIONS 598.
- Features 4 and 5, done (worker 2). A goal wired to an account in three taps (the account or I need one, the amount from the dial's reverse, the day with payday first), then "Set once. Check in: quarterly.", a check-in quest and the deposit with the four ways out, Unwire with Undo (`game/features/goalwire.js`). The health and insurance quests: open enrollment and the coverage review in a new November season, HSA receipts in tax season, the FSA deadline, the EOB after a doctor visit, policy renewal dates; the person taps their own dates and gets a reminder on Today (`game/features/careq.js`). Math in `js/math/jobs.js` (tests, second engine). Spreadsheet: Wired goals, Health and insurance dates. Test: `game/tests/goal-wire-and-care-quests.js`. QUESTIONS 601.
