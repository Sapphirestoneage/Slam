# Rocket Surgery, Nov 6 2026 (Batch 20)

Steve Krug's Rocket Surgery Made Easy, adapted: real tasks, watched for where a person hesitates, misclicks, backs up
or gives up, then the most serious problems fixed with the least change ("tweak, don't redesign").

Two users, each thinking aloud through all eight tasks:

- **Eli**, the coach, driving a live 60 minute session: fluent in finance, hates typing, wants things level and obvious.
- **A first-time coach** who has never seen SLAM: types the client's words into Find, reads every label.

How it was run: each task is a strategy script (Playwright, on top of `tools/e2e/drive.cjs`) that reacts to what the
screen shows, so the same script measured the app before (main at 02883d5) and after this batch. Each run records
every action (a tap, a pick or a typed number is one, as in `effort.cjs`), back presses, wrong clicks, Find searches
that found nothing, dead ends, every hesitation with its reason and every unclear word, plus the batch 14 usage log
(`js/usage.js`) for the same run. The scripts and their raw output stayed outside the repo (the build notes).

Time: machine time is how long the script took; it says little about a person. "About" is an estimate of a person's
time from the run: 3 s a tap, 5 s a typed number, 8 s a hesitation, 6 s a wrong click, 3 s a back press, 10 s a dead
end, 15 s giving up, 5 s an unclear word.

## The tasks and what success means

| # | Task | Household | Success means |
|---|---|---|---|
| 1 | A brand-new client to a first picture, using Start session 1 | Alexis (build notes numbers) | Net worth, the monthly surplus and a debt-free date on screen after session 1, nothing that reads as a surprise on the way |
| 2 | Homework call: the real card APR (22.99%), the 401(k) match (50% of the first 6%) and rent's due day (the 1st); see what changed | Maya | All three saved; the FI date still there; the coach can say what the three answers moved |
| 3 | Month end: close November, estimate vs actual, no CSV import | Maya | November closed, every line with an actual, and the screen says what the close compared and what it left out |
| 4 | A couple keeping money separate: Jordan's own plan, then the household | couple-separate (Living together) | Home shows Jordan's own numbers, the same as Cash flow and Plan; Sam one tap away; the household (see the finding: there is none in Living together) |
| 5 | Short every month: find the gap and make a plan to close it | deficit | The gap found and a plan that closes it made the plan (surplus 0 or more) |
| 6 | "Can I afford a $2,000 trip in March?" | Tom | A yes or no in words with what it costs the plan (no screen at the start of this batch; Batch 23 built it) |
| 7 | A 10% raise: update it and show what it moves | Tom | The new pay saved and the coach can say how much sooner FI is |
| 8 | A job loss: Plan › Transitions and the share view | job-loss (Riley) | The share view open: the situation, the plan in order, decided ahead, the worst case |

## What each user did, before the fixes

**1. Alexis to a first picture (both users, 35 actions).** Fast Track said "Step 1 of 7", then "Step 2 of 6" (a
renter with no car has no Home and car step): a pause. The end screen said "Almost: a lens still needs a number" and
"the gap is tracked on Coach tools"; neither user knew what a lens was. "Fast Track saved. Undo" sat over a button on
Taxes as the walk opened. The first-time coach stopped at the walk bar: Skip, Will get it and Next side by side.
Success: yes.

**2. Maya's homework (18 actions, not done).** Find "card apr" landed on the box (good). Find "401k match" landed on
Employer match: Yes, which then said "Add how much on the 401(k)". The only way on was "Add your 401(k) for the
details": it added an empty 401(k), the toast said Go there, then the 401(k)'s Details, then "Contribution, match and
vesting", then Add the match, then two typed percents: 7 actions for one fact. Back on Home the Picture had gone from
88% to 77% and Money in one line said "The FI date unlocks when an invested balance is in (1 of 2 there)": the
homework made the FI date disappear. Find "rent due" landed on the 1st, 15th chips (good), but Find's "Due day lives
on Cash flow › Budget" toast sat over Add line. Nothing said what the three answers moved; Home opened 418px down the
page (the Budget's scroll), Open items had no What changed. Both users gave up on "what changed".

**3. Maya's Month end (6 and 7 actions, not done).** The first-time coach typed "close the month" into Find: only "Make
a note for later". Confirm actuals listed Rent alone ($1,750 typed by hand, though it was paid as planned); step 2 said
"Everything landed on plan" while Food, Transportation and the rest of her $3,500 gut number were never asked.

**4. Jordan and Sam (2 and 5 actions, not done).** Home said "Debt free Oct 2031" and "Your $2,200 a month goes to heavy
debt first"; Cash flow said Jordan has $1,300 free and Plan › Debt payoff said January 2036. Home was showing the
household while every other screen showed Jordan. No "whose numbers" switch on Home; the first-time coach typed "sam"
into Find and landed on Sam's car (a wrong click, then Back). No household view exists in Living together (by design).

**5. The deficit (2 and 4 actions, done).** The gap card owns Home; Use the gap made a Proposed plan in one tap. Its toast
sat over Make Proposed the plan for 10 seconds. The first-time coach's Find "deficit" found nothing.

**6. Tom's trip (9 actions, not done).** Find "afford": nothing. Find "trip": the Calendar, nothing lit (a dead end).
Plan › Next 12 months › Add event opened its picker at the top left of the window, over the top bar, 658px from the
button. Trip, $2,000, March: "Set aside $500 a month". Nothing said whether it fits. See "Task 6" below.

**7. Tom's raise (5 and 8 actions, not done).** The first-time coach's Find "raise" went to Last raise on About you
(wrong, Back). With Given as Both, the gross is typed and the new take-home has to be guessed after tax. Nothing said
what moved; Home's "FI around 2036 to 2038" became "2036 to 2037", so neither user could say "11 months sooner".

**8. Riley's job loss (3 actions, done).** Home said "Runway (between jobs) 3.7 months"; Transitions said "The money
lasts 24.0 months": which number do the parents hear? The share view, meant for parents, said "little e" and "big e".

## Findings, ranked

Score is severity (blocker 3, major 2, minor 1) times how many of the 16 runs (8 tasks, 2 users) hit it. QA.md
severity: a blocker is a wrong number, lost data or a task that cannot finish; a major works but confuses or slows a
session; a minor reads oddly.

| Rank | Finding | Screen (level) | Category | Severity | Runs | Score | Status |
|---|---|---|---|---|---|---|---|
| 1 | The running balance took out bills dated before today again (today's checking already paid them): Home warned "Cash dips below the low line on Sun, Nov 1: −$1,100" for Maya (−$1,698 for the deficit persona), a wrong number about a day already gone | Home, Calendar (Screen) | Right | blocker | 6 | 18 | Fixed |
| 2 | Toasts sat over controls: Find's "X lives on Y" over Add line, Use the gap's over Make Proposed the plan, Fast Track saved over a button | every screen (Control) | Looks | major | 6 | 12 | Fixed |
| 3 | Find missed everyday words: close the month, deficit, afford; trip landed on the Calendar with no box; raise went to About you; sam went to Sam's car | Find (Words) | Findable | major | 6 | 12 | Fixed (afford and trip by Batch 23's words) |
| 4 | The "Move to next session" hover tip ran off the left edge (the layout checker's leftover clipped item, and one per persona) | Home (Words) | Looks | minor | 8 | 8 | Fixed |
| 5 | Nothing said what an edit moved: the coach could not answer "what changed" after the homework or "how much sooner" after the raise | every edit (Screen) | Tells | major | 4 | 8 | Fixed |
| 6 | A tab or sub-tab opened at the old screen's scroll (Home 418px down after the Budget) | every screen (Screen) | Findable | major | 4 | 8 | Fixed |
| 7 | A couple with no combined totals: Home showed the household (debt free Oct 2031, $2,200 a month) while Cash flow and Plan showed Jordan (Jan 2036, $1,300); Current vs Proposed and the one-pager too | Home (Screen) | One answer | blocker | 2 | 6 | Fixed |
| 8 | Employer match: "Add how much on the 401(k)" led to a button that added an empty 401(k): Picture 88% to 77%, the FI date locked, 7 more actions | Income (Control) | Works | blocker | 2 | 6 | Fixed |
| 9 | An empty list's Add picker opened at the top left of the window, over the top bar (Next 12 months, and every empty list with a picker) | Next 12 months (Control) | Looks | major | 2 | 4 | Fixed |
| 10 | Two runways for one job loss: Home 3.7 months, Transitions 24.0 months, neither saying what it counts | Home (Section) | One answer | major | 2 | 4 | Fixed |
| 11 | No "whose numbers" switch on Home or Plan for a couple with no combined totals | Home, Goals, Debt payoff (Control) | Obvious | major | 2 | 4 | Fixed |
| 12 | Month end for a gut-only client compared Rent alone and said "Everything landed on plan" | Month end (Section) | One answer | major | 2 | 4 | Fixed (one line and Add their lines); batch 33: each gut-only category closes against its gut split |
| 13 | Month end: a bill paid as planned had to be typed | Month end (Control) | Easy | major | 2 | 4 | Fixed |
| 14 | Living together has no household view, so "then the household" cannot be shown | Home, Net worth, Cash flow (Screen) | Coachable | major | 2 | 4 | Fixed by batch 33: Both (preview), read-only, on Home, Goals and Debt payoff (question 287) |
| 15 | No screen answers "Can I afford it?" | Plan (Screen) | Works | major | 2 | 4 | Not this batch: Batch 23 landed it on main during this run (input below) |
| 16 | A raise with Given as Both: the gross is typed and the take-home guessed after tax; no raise tap | Income (Control) | Easy | major | 2 | 4 | Fixed by batch 33: raise taps +3%, +5%, +10% and a %, the take-home from the tax math (question 288) |
| 17 | The Budget line's side panel covers the right of the lines table at 1280 (Status and Will get it cut to "Wi") | Budget (Section) | Looks | major | 2 | 4 | Fixed by batch 33: the list fit runs again when the panel opens or closes, and a list inside an open row no longer takes its padding |
| 18 | Current vs Proposed: a Current with a $400 monthly shortfall shows the same 5-year net worth as the Proposed that closes it ($1,952 both) | Current vs Proposed (Row) | Right | major | 2 | 4 | Fixed by batch 33: the shortfall is card borrowing at the highest card APR (question 289) |
| 19 | Fast Track's count changed between steps: "Step 1 of 7" then "Step 2 of 6" | Fast Track (Words) | One answer | minor | 2 | 2 | Fixed |
| 20 | Fast Track's end screen: "a lens still needs a number", "the gap is tracked on Coach tools" | Fast Track (Words) | Words | minor | 2 | 2 | Fixed |
| 21 | The share view, for parents, says "little e" and "big e" | Transitions share view (Words) | Words | minor | 2 | 2 | Fixed |
| 22 | The Budget's Plan and Actual passes show different groups and different typical totals for the same category (Food: Use typical $310; "would add up to $990") | Budget (Section) | One answer | major | 1 | 2 | Fixed by batch 33: the same scaled typical on both passes (question 290) |
| 23 | A Living together couple's FOO step, Scorecard and Transitions still count both people (the one-pager's cards date comes from the household FOO) | Plan › FOO, Scorecard, Transitions (Screen) | One answer | major | 1 | 2 | Fixed by batch 33: foo(), factsOf(), transitionOf() and layersOf() read the switched person; the switch shows on FOO, Scorecard, Transitions and Current vs Proposed |
| 24 | The walk bar's Skip and Next both move on when the box is empty | Walk me through (Control) | Obvious | minor | 1 | 1 | Not fixed: batch 18 decided Next keeps what is there; the hover tips say it |
| 25 | The Budget sub-tab's "1/3" (core) and the screen's "1 of 4 filled" (full) read as two answers | Budget (Words) | One answer | minor | 1 | 1 | Fixed by batch 33: the counter reads "1 of 4 filled · core 1 of 3" |
| 26 | Find's "apr" lists debt types the client does not have (Mortgage, Tax debt, 401(k) loan) | Find (Words) | Findable | minor | 1 | 1 | Fixed by batch 33: the field list leaves out debt types once a word lands on the client's own debts |
| 27 | Given as Both: "Per month" sits beside the yearly gross box, so $203,500 reads as a month | Income (Words) | Words | minor | 1 | 1 | Fixed by batch 33: the gross box says /yr |
| 28 | The calendar grid still marks days before today with the low-line sign (Home no longer warns) | Calendar (Row) | Tells | minor | 1 | 1 | Fixed by batch 33 |
| 29 | "Add your 401(k) for the details" (still under The rest on Income) adds an empty 401(k) that locks the FI date until its balance is in | Income (Control) | Works | major | 0 after | 0 | Fixed by batch 33: "Is part of this a 401(k)? Split it out" (question 291) |

## What was fixed, and how small

1. **The running balance** (js/month.js, MATH.md 13): when the start is today's checking (not typed on the calendar),
   entries dated before today come off once, not twice, and only days from today on are flagged. Batch 23's
   affordability test moves with it (Maya's tightest day in March: $3,350 to $5,650, the $2,300 already paid on Nov 1).
2. **Toasts move aside** (js/ui/staples.js toast): bottom left first; if that covers a button or a box, bottom right; a
   toast that outlives its screen checks the next one. On a phone they span the width as before.
3. **Find**: a word that lands on its box no longer shows a "lives on" toast (the result already said where, the box
   lights up). New words in data/reference-2026.json findWords: raise and new pay (the job row's amount), what if and
   compare (Current vs Proposed), close the month and actuals (Month end), short and deficit (the gap card). Batch 23
   added afford and trip. tools/e2e/find-terms.cjs keeps raise and close the month.
4. **The hover tip** under Move to next session is short enough to stay on screen.
5. **What moved** (js/sowhat.js movedWords, js/app.js): an edit that moves the FI date, the debt-free date, what is
   free a month or the FOO step says so in one toast with Undo: "That moved the plan: FI 11 months sooner (Sep 2036) ·
   $850 a month more free." Edits in a row add up while it shows; it goes when the screen changes; not during Fast
   Track or the walk; never after an undo.
6. **A new screen opens at its top**; Back and Forward return to where that screen was left (js/app.js render).
7. **Couples with no combined totals** (Dating, Living together): Home's program, the ladder, Current vs Proposed and
   the one-pager's next moves use the same person's plan as Cash flow and Plan (js/program.js, js/math/ladder.js,
   js/math/proposed.js, js/math/moves.js). The step-3 move says "the cards paid off" when other debt remains, and
   "debt free" only when the heavy debt is all of it.
8. **The match is one tap** (js/ui/money-lists.js, data/reference-2026.json lists.matchPicks): under Employer match: Yes,
   the usual formulas (50% of the first 6%, 100% of the first 3%, 4% or 6%) set the job row's first tier, which the FOO
   and the savings rate already read. Other formulas stay on the 401(k).
9. **An empty list's Add picker** opens at its own button (js/ui/staples.js recordList).
10. **Two runways, each named** (js/ui/home-ui.js): Home's strip says "Runway on cash alone" and, when a transition is
    planned, "With the plan (Transitions)" with the same 24.0 months, a link to Transitions, and what each counts in
    its tip.
11. **The whose-numbers switch** on Home, Goals and Debt payoff for a couple with no combined totals (js/app.js).
12. **Month end for a gut-only client** (js/ui/spending-ui.js): one line says which categories have only the gut number
    and how much of it the close leaves out, with Add their lines (the Budget's Actual pass); step 2 says "Every line
    with an actual landed on plan. The gut-only categories are not in this close." The empty Month end gives Find a box.
13. **Same as plan** (js/ui/spending-ui.js, css/phases.css): a bill paid as planned is one tap, in its own column before
    the Actual box (under it on a phone).
14. **Fast Track's count** follows the answers on About you as they are tapped (js/ui/fasttrack-ui.js).
15. **Fast Track's end screen**: "The first picture" (and how many numbers still need an answer; a date not on this path
    is an answer), "Rough totals for now. Walk me through asks what is left, one box at a time."
16. **The share view** uses plain names for parents: "The cushion kept in checking", "A small emergency fund", "The
    emergency fund and other savings" (js/math/transitions.js RUNGS plain).

Nothing added typing; every fix is a tap, a word or a place.

## Before and after, per task

| Task | User | Before: actions (taps, typed) | back | wrong | hesitations | dead ends | about | done | After: actions (taps, typed) | back | wrong | hesitations | dead ends | about | done |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Eli | 35 (26, 9) | 0 | 0 | 2 | 0 | 149 s | yes | 35 (26, 9) | 0 | 0 | 0 | 0 | 123 s | yes |
| 1 | first-time | 35 (26, 9) | 0 | 0 | 2 | 0 | 154 s | yes | 35 (26, 9) | 0 | 0 | 0 | 0 | 128 s | yes |
| 2 | Eli | 18 (12, 6) | 0 | 0 | 5 | 0 | 121 s | no | 10 (6, 4) | 0 | 0 | 0 | 0 | 38 s | yes |
| 2 | first-time | 18 (12, 6) | 0 | 0 | 5 | 0 | 121 s | no | 10 (6, 4) | 0 | 0 | 0 | 0 | 38 s | yes |
| 3 | Eli | 6 (5, 1) | 0 | 0 | 0 | 0 | 25 s | no | 6 (6, 0) | 0 | 0 | 0 | 0 | 18 s | yes |
| 3 | first-time | 7 (5, 2) | 0 | 0 | 0 | 1 | 40 s | no | 6 (5, 1) | 0 | 0 | 0 | 0 | 20 s | yes |
| 4 | Eli | 2 (2, 0) | 0 | 0 | 2 | 0 | 37 s | no | 1 (1, 0) | 0 | 0 | 0 | 0 | 18 s | partly (no household view) |
| 4 | first-time | 5 (4, 1) | 1 | 1 | 2 | 0 | 57 s | no | 1 (1, 0) | 0 | 0 | 0 | 0 | 18 s | partly (no household view) |
| 5 | Eli | 2 (2, 0) | 0 | 0 | 1 | 0 | 14 s | yes | 2 (2, 0) | 0 | 0 | 0 | 0 | 6 s | yes |
| 5 | first-time | 4 (3, 1) | 0 | 0 | 1 | 1 | 32 s | yes | 4 (3, 1) | 0 | 0 | 0 | 0 | 14 s | yes |
| 6 | Eli | 9 (6, 3) | 0 | 0 | 1 | 2 | 76 s | no | 7 (5, 2) | 0 | 0 | 0 | 0 | 25 s | yes (Batch 23) |
| 6 | first-time | 9 (6, 3) | 0 | 0 | 1 | 2 | 76 s | no | 7 (5, 2) | 0 | 0 | 0 | 0 | 25 s | yes (Batch 23) |
| 7 | Eli | 5 (3, 2) | 0 | 0 | 2 | 0 | 50 s | no | 4 (2, 2) | 0 | 0 | 1 | 0 | 24 s | yes |
| 7 | first-time | 8 (5, 3) | 1 | 1 | 2 | 0 | 70 s | no | 4 (1, 3) | 0 | 0 | 1 | 0 | 26 s | yes |
| 8 | Eli | 3 (3, 0) | 0 | 0 | 1 | 0 | 22 s | yes | 3 (3, 0) | 0 | 0 | 0 | 0 | 9 s | yes |
| 8 | first-time | 3 (2, 1) | 0 | 0 | 1 | 0 | 24 s | yes | 3 (2, 1) | 0 | 0 | 0 | 0 | 11 s | yes |
| All | | 169 actions | 2 | 2 | 28 | 6 | about 1,068 s | 6 of 16 | 138 actions | 0 | 0 | 2 | 0 | about 541 s | 16 of 16 (2 partly) |

Machine time per run went from 2.0 to 17.0 s before to 1.6 to 15.7 s after (task 2: 12.7 s to 7.1 s). The usage log
for the same runs: before, 2 back presses, 4 Find searches that found nothing, 41 screen visits and 91 counted clicks;
after, 0, 0, 24 and 49. The effort scoreboard (`effort.cjs`) is unchanged: Alexis 35 actions to a rough picture (77%),
Tom 38 (86%). The one hesitation left in task 7 is finding 16 (a raise with Given as Both).

## Task 6: what the coach looked for and wanted (input to Batch 23)

How both users tried, on main at 02883d5 (no such screen): Find "afford" (only a note for later); Find "trip" (the
Calendar, nothing lit); Plan › Next 12 months › Add event (the picker opened at the top left); Trip, $2,000, Mar 2027;
"Set aside $500 a month". Then nothing: no word on whether it fits.

What they wanted, in the order they asked for it:

1. One place that takes the client's words: afford, can I afford, trip, vacation, a purchase.
2. Taps, not typing: what it is (one-time, a monthly cost, a big goal), what for (trip and the usual few), how much
   ($500, $1k, $2k, $5k, or a box), when (the next twelve months as taps).
3. The answer in a sentence, no verdict words: where the money comes from (this month's free money first, then
   savings), and what it moves: the FI date, the current FOO step's end date (big e here), and the tightest day in that
   month against the low-balance line.
4. One tap to keep it: make it a goal or an event, put it on the calendar, start the set-aside.
5. For Tom, whether to pay cash or save toward it; for a couple, whose money it is (not asked here).

Batch 23 landed on main while this batch ran. After the rebase, the same strategy takes 7 actions and no hesitations:
Find "trip" lands on Plan › Goals › Can I afford it?, then Trip, $2k, Mar 2027: "Save $500 a month from now and the
trip is paid for by March 2027. big e stays on May 2027." with the tightest day in March (Mar 8, above the $3,000
line), big e and the FI date (no change), where the money comes from, and Make it a goal and Add to the calendar. It
covers wants 1 to 4. Left for its next pass: want 5 (cash vs saving toward it, whose money for a couple). This
batch's calendar fix changed its tightest-day number for Maya ($3,350 to $5,650, the Nov 1 bills no longer taken out
twice); test/afford.test.js says why.

## Scorecard

Every screen visited, scored after the fixes against QA.md's 12 categories, is in
`docs/usability/scorecard-2026-11-06.json` (route, and each category's pass or failure with severity and a one-line
reason), ready for a sign-off page. Categories 5 (Obvious) and 12 (Coachable) wait for Eli's sign-off either way.

## Batch 34: the screens Batch 20 did not score

The same method as above, on the twelve screens left out of the first scorecard: Net worth › Debt and Protection,
Plan › FOO (scored only: its code is Batch 26's tonight), Scorecard and Timeline, Report › Overview, Statements and
History, and Coach tools › Lists, Session, Data and Discovery. Each screen got two or three real coach tasks, played by
Eli (fluent, hates typing, wants things level: he goes straight to the tab) and by a first-time coach (types the
client's words into Find first; a miss is a dead end and then a hunt through the tabs). The households are the personas
in fixtures/personas, opened through Import. The strategy scripts react to what the screen shows, so the same scripts
measured main at 4d2bf2f and this batch; they and their raw output stayed outside the repo. Time is estimated as above.

### The tasks and what success means

| # | Screen | Task | Household | Success means |
|---|---|---|---|---|
| D1 | Debt | When is she debt free, and what does Snowball change? | Maya | The debt-free date read, Snowball tapped, the date read again |
| D2 | Debt | Add the car loan she just mentioned: $12,000 at 6.9%, $350 a month | Maya | The loan saved with all three numbers |
| P1 | Protection | Mark what she has: health and renters yes, life and disability no | Maya | Four answers in; Gaps to fill says 2 |
| P2 | Protection | What protection gaps does Tom have? | Tom | The gaps read off the screen |
| F1 | FOO | What step is she on, and when is her emergency fund done? | Maya | The step and the job-loss fund's month |
| F2 | FOO | What comes after the cards? | Alexis | The next step named |
| S1 | Scorecard | What does the Scorecard say is the biggest hole? | Maya | The #1 hole named |
| S2 | Scorecard | Put the top two holes in the plan | Maya | In the plan 2 of 3 |
| T1 | Timeline | If she saves $500 more a month, how much sooner is FI? | Maya | "How much sooner" said from the screen |
| T2 | Timeline | When is Tom FI on the pessimistic pace? | Tom | The date read |
| O1 | Overview | If her pay stopped, how long would her cash last? | Alexis | The runway read |
| O2 | Overview | The one number the client hears first, and where the surplus goes | Maya | The surplus and its words |
| St1 | Statements | How much was left over last month? | Alexis | A surplus the client can believe (the same as Overview) |
| St2 | Statements | Does her cash tie out this month? If not, find it | Maya | Tied out, or a gap Find it explains |
| H1 | History | Show the client what changed since last month | Maya, with an October snapshot, then $600 off the card and $450 more in checking | Today's change against the October snapshot on screen |
| H2 | History | Save a snapshot before the big change | Alexis | A snapshot saved |
| L1 | Lists | Which numbers are still guesses? Fix the card APR (22.99%) | Maya | The APR typed where Fix now lands |
| L2 | Lists | What homework does the client still owe? | Maya | The answer read |
| Se1 | Session | Set a 45 minute session and hide coach-only items | Maya | Both saved |
| Da1 | Data | Export the spreadsheet | Maya | The .xlsx downloaded |
| Da2 | Data | Back up the client file before trying a reset | Tom | The .json backup downloaded |
| Di1 | Discovery | Sales call: Jordan Lee, $4,000 take-home, $1,500 rent, $8,000 debt, $500 saved; debt feels out of control, wants to be debt free | (new) | Jordan's file made with every number and the goal |

### What each user did, before the fixes

**Statements (St1, St2): neither user could finish.** Alexis's statement said $1,510 left over; Overview said she is $200
short. The income statement left out the gut number's spending money (the part no Budget line covers) and the sinking
funds, so it showed a surplus for 13 of the 14 personas that no other screen had (the persona run flagged every one).
October, before the file existed, showed $0 for every balance and a "+$14,200 change"; Starting cash was $0 though
checking held $5,200, and the tie-out called the whole balance "Unexplained cash" with a Find it that listed paydays.

**History (H1): a dead end for both.** "Net worth change" compared the first snapshot with the last, so with one
snapshot it read $0, and the $600 paid off the card today was nowhere; the table had the October row and no row for
now.

**Find (every first-time run).** Twelve searches found nothing: biggest hole, fi date, when fi, how long would my cash
last, last month, tie out, what changed, snapshot, guesses, session length, spreadsheet, sales call. "foo" went to
Groceries and "backup" to the Cash layers (two wrong clicks, two Back presses).

**Timeline (T1).** The slider moves in $50 steps (the keyboard moved it one step at a time) and the screen said the new
date only: both users worked out 22.8 minus 19.8 years in their heads.

**Discovery (Di1).** Goal and Why now were sentences to type while the client talks (9 typed boxes in all). Below the
form, "Who they are with money" was open for Maya, the client already open, not for the prospect on the call.

**Lists (L1).** Fix now went to Credit cards and focused the row's select box; both users hunted for the APR.

**Session (Se1).** Session length was a typed box; On and Off swapped sides from switch to switch (Off On, On Off).

**Data (Da1, Da2).** The primary button said Export: the first-time coach pressed it for the spreadsheet and got a
backup file; for the backup, "Export" beside four other import and export buttons was unclear.

**Protection (P1).** "Renters insuranc" was cut off in its box; with one row still unanswered the foot said "4 items, 4
of 4 done" while there were five rows; and an unanswered usual-list row disappeared when focus left it (checked in the
browser: 5 rows, then 4).

**Debt (D1), Scorecard (S1, S2), Overview, FOO.** Debt said "If only each debt's own payment is paid: Nov 2030" twice
(on Debt-free and on Interest left). Each hole said Hole twice (a pill, then the Strong / OK / Hole switch beside it),
and "Re-scored today" was a button that read like a status. Overview put "Accommodation" (the Budget group) next to
"Housing %" for the same rent. FOO says "big e" in plain view.

### Findings, ranked

Score is severity (blocker 3, major 2, minor 1) times how many of the 44 runs (22 tasks, 2 users) hit it. A finding
seen only by eye, by the layout checker or by the persona run counts as one run (its counts are in the Runs column).

| Rank | Finding | Screen (level) | Category | Severity | Runs | Score | Status |
|---|---|---|---|---|---|---|---|
| 1 | Find missed the everyday words for these screens (12 dead ends); "foo" went to Groceries, "backup" to Cash layers | Find (Words) | Findable | major | 14 | 28 | Fixed |
| 2 | The income statement left out the gut's spending money and the sinking funds: Alexis $1,510 left over vs −$200 on Overview; 13 of 14 personas differed | Statements (Row) | Right | blocker | 2 + persona 13 | 6 | Fixed |
| 3 | "What changed since last month" compared the first snapshot with the last ($0 with one snapshot); today's edits not in it; no row for now | History (Section) | Works | blocker | 2 | 6 | Fixed |
| 4 | A month before the file began showed $0 balances and a "+$14,200 change"; the month it began called the whole balance "Unexplained cash" | Statements (Screen) | Right | major | 2 | 4 | Fixed |
| 5 | No "sooner" words on the Timeline; the slider's $50 steps made +$500 a hunt | Timeline (Control) | Tells | major | 2 | 4 | Fixed |
| 6 | Discovery's Goal and Why now were sentences to type during the call | Discovery (Control) | Easy | major | 2 | 4 | Fixed |
| 7 | Lists' Fix now focused the row's select box, not the number to fix | Lists (Control) | Works | major | 2 | 4 | Fixed |
| 8 | The primary "Export" read as the spreadsheet; which button is the backup was unclear | Data (Words) | Obvious | major | 2 | 4 | Fixed |
| 9 | An unanswered usual-list coverage row vanished when focus left it | Protection (Row) | Works | major | by eye, checked in the browser | 2 | Fixed |
| 10 | Session length typed; On and Off swapped sides from switch to switch | Session (Control) | Easy | minor | 2 | 2 | Fixed |
| 11 | "Renters insuranc" cut off; the foot left the unanswered row out of its count | Protection (Control) | Looks | minor | 2 | 2 | Fixed |
| 12 | "If only each debt's own payment is paid" twice on Debt | Debt (Words) | Words | minor | 2 | 2 | Fixed |
| 13 | Hole said twice on every hole; "Re-scored today" a button that reads like a status | Scorecard (Control) | Obvious | minor | 2 | 2 | Fixed |
| 14 | "Who they are with money" under the prospect's form answers for the client already open | Discovery (Section) | Obvious | minor | 2 | 2 | Fixed (its line names that client) |
| 15 | The Debt APR box's name was its faded typical ("7.14") | Debt (Control) | Fits | minor | by eye | 1 | Fixed |
| 16 | The Statements group buttons were different widths (12 column failures) and rows had 1px between them (50 cramped) | Statements (Row) | Looks | minor | layout 62 | 1 | Fixed |
| 17 | A Living together couple: Statements count both people while Home, Cash flow and Overview show one (couple-separate $3,500 vs $1,300) | Statements (Screen) | One answer | major | persona 1 | 2 | Fixed in batch 40: the statements follow the whose-numbers switch (question 332) |
| 18 | Biggest share and Housing % stay locked for a gut-only client and a homeowner with no mortgage | Overview (Row) | Tells | major | persona 2 | 2 | Fixed in batch 40: hidden with one line why; the dancer's FI date and Goals lock were her shift income read as missing (question 330) |
| 19 | Protection's "4 of 13 filled" (the whole screen) and "5 items, 4 of 5 done" (the rows) count different things without saying so | Protection (Words) | One answer | minor | 2 | 2 | Not fixed |
| 20 | "Accommodation" next to "Housing %" on Overview | Overview (Words) | Words | minor | 2 | 2 | Not fixed: Accommodation is the Budget's own group name (one name everywhere) |
| 21 | "big e" in plain view on FOO | FOO (Words) | Words | minor | 2 | 2 | Not fixed: Batch 26's code tonight |
| 22 | Find "debt free" lands on Plan › Goals; "emergency fund" on Cash layers, not the FOO step | Find (Words) | Findable | minor | 2 | 2 | Not fixed: both are the decided homes (batches 14 and 18) |
| 23 | Strong, OK and Hole are verdict-like words in plain view (QA.md names "strong") | Scorecard (Words) | Words | minor | by eye | 1 | Not fixed: question 331 |
| 24 | Scorecard's Effort, hours is a typed box | Scorecard (Control) | Easy | minor | by eye | 1 | Not fixed |

### What was fixed, and how small

1. **Find** (data/reference-2026.json findWords, js/find.js place names): biggest hole and holes (the #1 hole on the
   Scorecard), fi date and when can I retire (Timeline), how long would my cash last (Overview's Runway card), last month,
   tie out and balance sheet (Statements), what changed and snapshot (History's strip), guesses and defaults (Lists),
   client view, session length, notes and dark mode (Session), spreadsheet and excel (Open in a spreadsheet), export and
   back up (Export a backup), sales call and prospect (Discovery), foo and next step (FOO). Each lands on its box.
2. **The income statement's surplus is the monthly surplus** (js/math/statements.js, MATH.md 13): the gut's spending
   money is a variable line (and leaves checking on the cash flow statement), and money into sinking funds is its own
   line out of the surplus (answer 62) and back in the net worth bridge. 13 of the 14 personas now match Overview to the
   dollar; the fourteenth is the couple in finding 17.
3. **History compares the last snapshot with today**: "Net worth since Oct 6" and "Debt paid down since Oct 6" (the tip
   adds since the first snapshot), and a Now row on top of the table.
4. **Before the file began** (js/math/statements.js fileBegan): last month shows – and "(nothing on file)", a period
   before the file says so in one line, and the month it began has no starting balance: "Cash ties out from December
   2026. This file began Nov 5, so there is no starting balance for November 2026."
5. **Timeline**: +$100, +$250, +$500 and +$1,000 as one tap beside the slider, and the line says "36 months sooner than
   now" (the same words as Batch 20's moved toast).
6. **Discovery**: Goal and Why now are the About you chips (tap several); they land on About you as the same chips.
7. **Lists**: Fix now lights and focuses the number itself (the APR, the balance), the way Find does.
8. **Data**: the primary button says Export a backup.
9. **Protection**: unanswered usual-list rows stay (they are questions) and the foot counts them; the type box shows
   Renters insurance in full.
10. **Statements**: every group button one width, 6px between rows.
11. **Session**: 30, 45, 60 and 90 min as taps (a length typed before stays one of them); every switch reads Off, On.
12. **Debt**: the "only its own payment" date once, on Debt-free; the APR box is named "APR, typical 7.14%".
13. **Scorecard**: one rating control per hole (the pressed switch); the button says Mark re-scored today; on a phone
    the switch starts its own line on every card.
14. **Discovery**: "Who they are with money" names the client it answers for ("For Maya, open now").
15. **Statements for a couple with no combined totals**: one line says these count both people and the other screens
    show one person's plan.

Nothing added typing: Discovery lost two typed sentences and Session one typed number.

### Before and after, per task

| Task | Screen | User | Before: actions (taps, typed) | back | wrong | hesitations | dead ends | unclear | about | done | After: actions (taps, typed) | back | wrong | hesitations | dead ends | unclear | about | done |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 | Debt | Eli | 3 (3, 0) | 0 | 0 | 0 | 0 | 1 | 14 s | yes | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes |
| D1 | Debt | first-time | 5 (4, 1) | 1 | 1 | 0 | 0 | 1 | 31 s | yes | 5 (4, 1) | 1 | 1 | 0 | 0 | 0 | 26 s | yes |
| D2 | Debt | Eli | 7 (4, 3) | 0 | 0 | 0 | 0 | 0 | 27 s | yes | 7 (4, 3) | 0 | 0 | 0 | 0 | 0 | 27 s | yes |
| D2 | Debt | first-time | 7 (3, 4) | 0 | 0 | 0 | 0 | 0 | 29 s | yes | 7 (3, 4) | 0 | 0 | 0 | 0 | 0 | 29 s | yes |
| P1 | Protection | Eli | 7 (7, 0) | 0 | 0 | 1 | 0 | 1 | 34 s | yes | 7 (7, 0) | 0 | 0 | 1 | 0 | 0 | 29 s | yes |
| P1 | Protection | first-time | 7 (6, 1) | 0 | 0 | 1 | 0 | 1 | 36 s | yes | 7 (6, 1) | 0 | 0 | 1 | 0 | 0 | 31 s | yes |
| P2 | Protection | Eli | 2 (2, 0) | 0 | 0 | 0 | 0 | 0 | 6 s | yes | 2 (2, 0) | 0 | 0 | 0 | 0 | 0 | 6 s | yes |
| P2 | Protection | first-time | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes |
| F1 | FOO | Eli | 2 (2, 0) | 0 | 0 | 0 | 0 | 1 | 11 s | yes | 2 (2, 0) | 0 | 0 | 0 | 0 | 1 | 11 s | yes |
| F1 | FOO | first-time | 4 (3, 1) | 1 | 1 | 0 | 0 | 1 | 28 s | yes | 4 (3, 1) | 1 | 1 | 0 | 0 | 1 | 28 s | yes |
| F2 | FOO | Eli | 2 (2, 0) | 0 | 0 | 0 | 0 | 0 | 6 s | yes | 2 (2, 0) | 0 | 0 | 0 | 0 | 0 | 6 s | yes |
| F2 | FOO | first-time | 4 (3, 1) | 1 | 1 | 0 | 0 | 0 | 23 s | yes | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes |
| S1 | Scorecard | Eli | 2 (2, 0) | 0 | 0 | 0 | 0 | 0 | 6 s | yes | 2 (2, 0) | 0 | 0 | 0 | 0 | 0 | 6 s | yes |
| S1 | Scorecard | first-time | 3 (2, 1) | 0 | 0 | 1 | 1 | 0 | 29 s | yes | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes |
| S2 | Scorecard | Eli | 4 (4, 0) | 0 | 0 | 0 | 0 | 1 | 17 s | yes | 4 (4, 0) | 0 | 0 | 0 | 0 | 0 | 12 s | yes |
| S2 | Scorecard | first-time | 4 (3, 1) | 0 | 0 | 0 | 0 | 1 | 19 s | yes | 4 (3, 1) | 0 | 0 | 0 | 0 | 0 | 14 s | yes |
| T1 | Timeline | Eli | 3 (3, 0) | 0 | 0 | 2 | 0 | 0 | 25 s | yes | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes |
| T1 | Timeline | first-time | 4 (3, 1) | 0 | 0 | 3 | 1 | 0 | 48 s | yes | 3 (2, 1) | 0 | 0 | 0 | 0 | 0 | 11 s | yes |
| T2 | Timeline | Eli | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes |
| T2 | Timeline | first-time | 4 (3, 1) | 0 | 0 | 1 | 1 | 0 | 32 s | yes | 3 (2, 1) | 0 | 0 | 0 | 0 | 0 | 11 s | yes |
| O1 | Overview | Eli | 1 (1, 0) | 0 | 0 | 0 | 0 | 0 | 3 s | yes | 1 (1, 0) | 0 | 0 | 0 | 0 | 0 | 3 s | yes |
| O1 | Overview | first-time | 2 (1, 1) | 0 | 0 | 1 | 1 | 0 | 26 s | yes | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes |
| O2 | Overview | Eli | 1 (1, 0) | 0 | 0 | 0 | 0 | 1 | 8 s | yes | 1 (1, 0) | 0 | 0 | 0 | 0 | 1 | 8 s | yes |
| O2 | Overview | first-time | 2 (1, 1) | 0 | 0 | 0 | 0 | 1 | 13 s | yes | 2 (1, 1) | 0 | 0 | 0 | 0 | 1 | 13 s | yes |
| St1 | Statements | Eli | 3 (3, 0) | 0 | 0 | 1 | 0 | 0 | 32 s | no | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes |
| St1 | Statements | first-time | 4 (3, 1) | 0 | 0 | 2 | 1 | 0 | 55 s | no | 3 (2, 1) | 0 | 0 | 0 | 0 | 0 | 11 s | yes |
| St2 | Statements | Eli | 3 (3, 0) | 0 | 0 | 3 | 0 | 0 | 48 s | no | 2 (2, 0) | 0 | 0 | 0 | 0 | 0 | 6 s | yes |
| St2 | Statements | first-time | 4 (3, 1) | 0 | 0 | 4 | 1 | 0 | 71 s | no | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes |
| H1 | History | Eli | 2 (2, 0) | 0 | 0 | 1 | 1 | 0 | 39 s | no | 2 (2, 0) | 0 | 0 | 0 | 0 | 0 | 6 s | yes |
| H1 | History | first-time | 3 (2, 1) | 0 | 0 | 2 | 2 | 0 | 62 s | no | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes |
| H2 | History | Eli | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes |
| H2 | History | first-time | 4 (3, 1) | 0 | 0 | 1 | 1 | 0 | 32 s | yes | 3 (2, 1) | 0 | 0 | 0 | 0 | 0 | 11 s | yes |
| L1 | Lists | Eli | 4 (3, 1) | 0 | 0 | 1 | 0 | 0 | 22 s | yes | 3 (2, 1) | 0 | 0 | 0 | 0 | 0 | 11 s | yes |
| L1 | Lists | first-time | 5 (3, 2) | 0 | 0 | 2 | 1 | 0 | 45 s | yes | 4 (2, 2) | 0 | 0 | 0 | 0 | 0 | 16 s | yes |
| L2 | Lists | Eli | 1 (1, 0) | 0 | 0 | 0 | 0 | 0 | 3 s | yes | 1 (1, 0) | 0 | 0 | 0 | 0 | 0 | 3 s | yes |
| L2 | Lists | first-time | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes |
| Se1 | Session | Eli | 4 (3, 1) | 0 | 0 | 2 | 0 | 0 | 30 s | yes | 4 (4, 0) | 0 | 0 | 0 | 0 | 0 | 12 s | yes |
| Se1 | Session | first-time | 5 (3, 2) | 0 | 0 | 3 | 1 | 0 | 53 s | yes | 4 (3, 1) | 0 | 0 | 0 | 0 | 0 | 14 s | yes |
| Da1 | Data | Eli | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes |
| Da1 | Data | first-time | 5 (4, 1) | 0 | 1 | 1 | 1 | 0 | 41 s | yes | 3 (2, 1) | 0 | 0 | 0 | 0 | 0 | 11 s | yes |
| Da2 | Data | Eli | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes | 3 (3, 0) | 0 | 0 | 0 | 0 | 0 | 9 s | yes |
| Da2 | Data | first-time | 5 (4, 1) | 1 | 1 | 0 | 0 | 1 | 31 s | yes | 3 (2, 1) | 0 | 0 | 0 | 0 | 0 | 11 s | yes |
| Di1 | Discovery | Eli | 10 (3, 7) | 0 | 0 | 3 | 0 | 0 | 68 s | yes | 10 (5, 5) | 0 | 0 | 0 | 0 | 0 | 40 s | yes |
| Di1 | Discovery | first-time | 11 (3, 8) | 0 | 0 | 4 | 1 | 0 | 91 s | yes | 10 (4, 6) | 0 | 0 | 0 | 0 | 0 | 42 s | yes |
| All | | | 169 actions | 4 | 5 | 40 | 14 | 11 | about 1246 s | 38 of 44 | 150 actions | 2 | 2 | 2 | 0 | 4 | about 584 s | 44 of 44 |

Machine time per run was 0.7 to 32.2 s before and 0.7 to 31.8 s after (most of it the Import of the persona). The
two wrong clicks left are finding 22; the two hesitations are finding 19 (P1); the four unclear words are findings 20
and 21.

Layout checker on these twelve screens (1440, 1280 and 390, light and dark, Demo and a new client), all checks: 62
failures before (Statements: 12 column, 50 cramped), 0 after. The one failure the run still lists is Budget's
just-after-loading-the-Demo toast, not on these screens. The checker and the persona run now also visit Statements,
Data and Discovery (tools/e2e/walkthrough.cjs ROUTES).

Persona run (14 personas, 27 screens at 1280): console errors 0 before and after; story blockers 14 to 2 (the two left
are finding 17, couple-separate on Statements); story majors 3 to 3 (finding 18); layout findings 49 to 0.

### Scorecard

The twelve screens are appended to `docs/usability/scorecard-2026-11-06.json` (route, area, tasks, and each category's
pass or failure with severity and a one-line reason), with their own summary under `batch34`: 0 blockers, 2 majors
(findings 17 and 18, both fixed in batch 40, so 0 now), 11 minors; Timeline, History and Coach tools › Lists pass all 12. Categories 5 and 12 wait for
Eli's sign-off.
## Batch 37: the Phase 4 and new screens (Nov 6 2026)

The same method on the screens built tonight: real tasks, each played by Eli (fluent, hates typing, wants things level)
and a first-time coach (reads every label, types the client's words into Find), each as a strategy script that reacts
to the screen, run on main at e3c8ce9 (before) and on this batch (after). Hesitations, dead ends and unclear words were
counted by the scripts; what the screenshots showed was added by eye and is marked so.

### The tasks and what success means

| # | Task | Household | Success means |
|---|---|---|---|
| 9 | Plan › Transitions from scratch for a layoff: Start over, the template, a tripwire, Plan B, the share view | job-loss (Riley) | The share view open with the situation, the plan in order, decided ahead (the new tripwire in it) and the worst case; Plan B drawn |
| 10 | Coach tools › Discovery, Who they are with money: the address, the letters and the weather; then find the result on the one-pager | Alexis; couple-separate (Jordan and Sam), answers cleared first | The letters and the weather showing for each person, and the one-pager's "Who you are with money" line |
| 11 | Plan › Goals › Can I afford it?: a $2,000 trip in March, a $400 car payment, a $20,000 wedding next year | Maya, Tom, deficit | An answer in words for each, with what it moves, every number readable without a tip |
| 12 | Net worth › Credit cards: pick a card from the library, check its fee, find a benefit paid for twice | Demo, Maya | The card filled from the library, the fee answer read, and an answer on paying twice (a note, or a line saying none) |
| 13 | Plan › Debt payoff: two car offers and paying cash side by side; the student loan drill-down | Maya, Tom, the PSLF teacher | Offer 1, Offer 2 and Pay cash compared; Standard, IBR and RAP (with PSLF) for the teacher |
| 14 | Cash flow › Month end: import Rocket Money's November file, place the Not matched rows, save, see plan vs actual | Maya, fixtures/import/rocket-money-nov.csv | The month saved with the matched rows in it (10 rows or more) and plan vs actual By category |
| 15 | Report › Overview: Your Shockingly Simple Math | Maya | The table open with Maya's row |

### What each user did, before the fixes

**9. Riley's layoff (13 actions each, done).** Start over said "Cleared. Pick what is changing to start again." with
Undo, and that toast stayed up through the next taps: it sat over the tripwire popover's Then chips and Add button and
over the share view (by eye). The burn, the ladder and the headline said DRAFTT, FAT, little e and big e with nothing
saying what they are; the share view, meant for parents, said "If I reach little e" under Decided ahead.

**10. Discovery (26 and 25 actions for Alexis, 45 and 44 for the couple, done).** No hesitation: each block opens by
itself once the one before is answered, and Find "money personality" and "one-pager" land. The taps are the questions
(3 for the address, 12 letters and 6 weather taps a person). Nothing to fix.

**11. Can I afford it? (12 and 13 actions, done).** Every answer said "big e and little e are not touched" with nothing
saying what they are. The wedding ($1,667 a month against Maya's $1,500 of free money) showed "Heavy Debt done: Waits
for the gap" and "FI date: Waits for the gap": both users stopped on it (by eye; Maya has no gap). The deficit
persona's gap card on Goals had "$ $ a month" in the extra income box (by eye).

**12. The card library (6 and 9 actions, not done).** "Which card is it?", sapph, one tap: good. The Credit cards
totals row said Payment / mo $780 for one card paying $250 (it summed every debt in the household; by eye, a wrong
number). The pick's toast sat over the closed line that carries the fee answer. Neither the Demo nor Maya has a line
that doubles a card benefit, and nothing said so: Eli looked under each benefit; the first-time coach's Find "paying
twice" found only Make a note.

**13. Borrowing and the student loan (8 to 10 actions, done).** Clean; the comparison table's last row said "big e"
with nothing saying what it is.

**14. Month end import (10 and 9 actions; the first-time coach not done).** Eli tapped Accept all matched first. The
first-time coach placed the 2 Not matched rows (two taps each) and pressed Save: 2 rows of 22 saved, rent and the
groceries left out, plan vs actual mostly empty (a wrong turn: Undo, accept, Save again).

**15. Simple Math (3 actions each).** It sits 962px down Overview at 1280 (both hesitated); the first-time coach's
Find "simple math" found only Make a note.

### Findings, ranked

Score is severity (blocker 3, major 2, minor 1) times the runs (of 26) that hit it.

| Rank | Finding | Screen (level) | Category | Severity | Runs | Score | Status |
|---|---|---|---|---|---|---|---|
| 30 | Eli's terms in plain view with no plain meaning: big e, little e, DRAFTT, FAT, Picture (Batch 33's minors) | Transitions, Goals, Debt payoff, Home (Words) | Words | minor | 18 | 18 | Fixed: paired the first time on a screen |
| 31 | Credit cards' totals row summed every debt's payment ($780 against one card's $250) | Credit cards (Row) | Right | blocker | 4 | 12 | Fixed |
| 32 | No answer when no benefit is paid for twice; Find "paying twice" found nothing | Credit cards (Section) | Tells | major | 4 | 8 | Fixed: one line says none was found and what was checked; Find words |
| 33 | Transitions' Cleared toast outlived its job and sat over the tripwire popover and the share view | Transitions (Control) | Looks | major | 2 | 4 | Fixed |
| 34 | Can I afford it?: "Waits for the gap" on a cost bigger than the free money | Goals (Words) | Words | major | 2 | 4 | Fixed: "On hold, while the wedding is saved for; was Mar 2027" |
| 35 | Import: Save saved only the rows tapped Accept; a first-time coach saved 2 of 22 | Month end (Control) | Works | major | 1 | 2 | Fixed: the footer says what stays out, "Accept the 14 matched too" beside Save (question 346) |
| 36 | Find "simple math" found nothing; the section is under the fold | Overview (Words) | Findable | minor | 2 | 2 | Fixed (Find); the place stays |
| 37 | Current vs Proposed borrowed a short month without limit (−$265,580 in 10 years, a number nobody could reach) | Current vs Proposed (Row) | Right | major | owed | | Fixed (question 320) |
| 38 | The share view's Decided ahead said "If I reach little e" | Transitions share view (Words) | Words | minor | 2 | 2 | Fixed: the plain rung names |
| 39 | A toast covered the closed line with the fee answer; with Details open both bottom corners cover a control | Credit cards (Control) | Looks | minor | 2 | 2 | Better: the toast avoids closed lines and popovers and tries the top right; it can still sit over Open all for 10 s |
| 40 | The gap card's extra income box read "$ $ a month" | Goals, Home (Words) | Looks | minor | 1 | 1 | Fixed |
| 41 | These are big deals: the option buttons did not line up down the rows (the layout checker's column check, 6 on main) | Goals (Section) | Looks | minor | | | Fixed |

### What was fixed, and how small

1. **Plain meanings** (js/glossary.js PLAIN, js/ui/tips.js pairTerms): on Home, Goals, Transitions (and the share view)
   and Debt payoff, the first time big e, little e, DRAFTT, FAT or Picture shows in plain view it reads "big e (job-loss
   fund)", "little e (small emergency fund)", "DRAFTT needs (rent, food, transport, debt, taxes)", "FAT (food, rent,
   transport)", "Picture (how much is filled in)"; the term keeps its hover tip; chips and buttons keep the short name.
2. **The totals row** (js/ui/lists.js): Payment / mo sums the list's own debts.
3. **Paying twice** (js/math/cards.js checked, js/ui/cards-ui.js): "Paying twice: nothing found. No Budget line or
   Protection row pays for rental car damage, longer warranties on things you buy too." Find: paying twice, doubling up,
   double coverage, phone insurance, rental car insurance, extended warranty; simple math, shockingly simple, years to fi.
4. **Toasts** (js/ui/staples.js): a toast avoids open popovers and sections' closed lines; when both bottom corners
   cover a control it tries the top right under the bars; it moves when a popover opens under it; Transitions clears the
   Cleared toast once a template is picked.
5. **On hold** (js/math/afford.js): the FOO step and FI tiles say On hold and for how long, instead of Waits for the gap.
6. **The import footer** (js/ui/import-ui.js): "2 of 22 accepted; the other 20 stay out until accepted." and Accept the
   14 matched too, beside Save.
7. **The card room** (js/math/proposed.js, question 320): see PROGRESS, Batch 37.
8. Small: the share view's plain tripwire words, the gap box hint, the big deals options on one track width.

### Before and after, per task

| Task | User | Before: actions (taps, typed) | back | wrong | hesitations | dead ends | unclear | about | done | After: actions (taps, typed) | back | wrong | hesitations | dead ends | unclear | about | done |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 9 | Eli | 13 (13, 0) | 0 | 0 | 1 | 0 | 6 | 77 s | yes | 13 (13, 0) | 0 | 0 | 0 | 0 | 0 | 39 s | yes |
| 9 | first-time | 13 (12, 1) | 0 | 0 | 1 | 0 | 6 | 79 s | yes | 13 (12, 1) | 0 | 0 | 0 | 0 | 0 | 41 s | yes |
| 10 (Alexis) | Eli | 26 (26, 0) | 0 | 0 | 0 | 0 | 0 | 78 s | yes | 26 (26, 0) | 0 | 0 | 0 | 0 | 0 | 78 s | yes |
| 10 (Alexis) | first-time | 25 (23, 2) | 0 | 0 | 0 | 0 | 0 | 79 s | yes | 25 (23, 2) | 0 | 0 | 0 | 0 | 0 | 79 s | yes |
| 10 (couple) | Eli | 45 (45, 0) | 0 | 0 | 0 | 0 | 0 | 135 s | yes | 45 (45, 0) | 0 | 0 | 0 | 0 | 0 | 135 s | yes |
| 10 (couple) | first-time | 44 (42, 2) | 0 | 0 | 0 | 0 | 0 | 136 s | yes | 44 (42, 2) | 0 | 0 | 0 | 0 | 0 | 136 s | yes |
| 11 (Maya) | Eli | 12 (12, 0) | 0 | 0 | 0 | 0 | 6 | 66 s | yes | 12 (12, 0) | 0 | 0 | 0 | 0 | 0 | 36 s | yes |
| 11 (Maya) | first-time | 13 (12, 1) | 0 | 0 | 0 | 0 | 6 | 71 s | yes | 13 (12, 1) | 0 | 0 | 0 | 0 | 0 | 41 s | yes |
| 11 (Tom) | Eli | 12 (12, 0) | 0 | 0 | 0 | 0 | 6 | 66 s | yes | 12 (12, 0) | 0 | 0 | 0 | 0 | 0 | 36 s | yes |
| 11 (Tom) | first-time | 13 (12, 1) | 0 | 0 | 0 | 0 | 6 | 71 s | yes | 13 (12, 1) | 0 | 0 | 0 | 0 | 0 | 41 s | yes |
| 11 (deficit) | Eli | 12 (12, 0) | 0 | 0 | 0 | 0 | 0 | 36 s | yes | 12 (12, 0) | 0 | 0 | 0 | 0 | 0 | 36 s | yes |
| 11 (deficit) | first-time | 13 (12, 1) | 0 | 0 | 0 | 0 | 0 | 41 s | yes | 13 (12, 1) | 0 | 0 | 0 | 0 | 0 | 41 s | yes |
| 12 (Demo) | Eli | 6 (5, 1) | 0 | 0 | 1 | 0 | 0 | 43 s | no | 6 (5, 1) | 0 | 0 | 0 | 0 | 0 | 20 s | yes |
| 12 (Demo) | first-time | 9 (5, 4) | 0 | 0 | 2 | 1 | 0 | 76 s | no | 6 (4, 2) | 0 | 0 | 1 | 0 | 0 | 30 s | yes |
| 12 (Maya) | Eli | 6 (5, 1) | 0 | 0 | 1 | 0 | 0 | 43 s | no | 6 (5, 1) | 0 | 0 | 0 | 0 | 0 | 20 s | yes |
| 12 (Maya) | first-time | 9 (5, 4) | 0 | 0 | 2 | 1 | 0 | 76 s | no | 6 (4, 2) | 0 | 0 | 1 | 0 | 0 | 30 s | yes |
| 13 (Maya) | Eli | 9 (9, 0) | 0 | 0 | 0 | 0 | 1 | 32 s | yes | 9 (9, 0) | 0 | 0 | 0 | 0 | 0 | 27 s | yes |
| 13 (Maya) | first-time | 8 (7, 1) | 0 | 0 | 0 | 0 | 1 | 31 s | yes | 8 (7, 1) | 0 | 0 | 0 | 0 | 0 | 26 s | yes |
| 13 (Tom) | Eli | 9 (9, 0) | 0 | 0 | 0 | 0 | 1 | 32 s | yes | 9 (9, 0) | 0 | 0 | 0 | 0 | 0 | 27 s | yes |
| 13 (Tom) | first-time | 8 (7, 1) | 0 | 0 | 0 | 0 | 1 | 31 s | yes | 8 (7, 1) | 0 | 0 | 0 | 0 | 0 | 26 s | yes |
| 13 (teacher) | Eli | 10 (10, 0) | 0 | 0 | 0 | 0 | 1 | 35 s | yes | 10 (10, 0) | 0 | 0 | 0 | 0 | 0 | 30 s | yes |
| 13 (teacher) | first-time | 9 (8, 1) | 0 | 0 | 0 | 0 | 1 | 34 s | yes | 9 (8, 1) | 0 | 0 | 0 | 0 | 0 | 29 s | yes |
| 14 | Eli | 10 (10, 0) | 0 | 0 | 0 | 0 | 0 | 30 s | yes | 10 (10, 0) | 0 | 0 | 0 | 0 | 0 | 30 s | yes |
| 14 | first-time | 9 (8, 1) | 0 | 1 | 0 | 0 | 0 | 50 s | no | 10 (9, 1) | 0 | 0 | 0 | 0 | 0 | 32 s | yes |
| 15 | Eli | 3 (3, 0) | 0 | 0 | 1 | 0 | 0 | 17 s | yes | 3 (3, 0) | 0 | 0 | 1 | 0 | 0 | 17 s | yes |
| 15 | first-time | 3 (1, 2) | 0 | 0 | 1 | 1 | 0 | 46 s | no | 2 (1, 1) | 0 | 0 | 0 | 0 | 0 | 8 s | yes |
| All | | 349 actions | | 1 | 10 | 3 | 42 | about 1511 s | 20 of 26 | 343 actions | | 0 | 3 | 0 | 0 | about 1091 s | 26 of 26 |

"About" is the Batch 20 estimate (3 s a tap, 5 s a typed number, 8 s a hesitation, 6 s a wrong click, 10 s a dead end, 5 s an
unclear word, 15 s for a task not done). The scripts do not see a wrong number on screen, so three by-eye findings are
not in the counts: Credit cards' $780 (finding 31), Waits for the gap (34) and the toast over the tripwire popover (33,
counted once as a hesitation on "Sell the car"). Left after: the Simple Math section still sits under the fold at 1280
(Eli scrolls, one hesitation), and with Details open on a card the pick's toast sits over Open all at the top right for
its 10 seconds (one hesitation for the first-time coach). Task 10 needed nothing: its taps are the questions.

The scripts and their raw output stayed outside the repo (the build notes). Each screen, scored after the fixes, is
appended to `docs/usability/scorecard-2026-11-06.json` with "batch": 37 (the Batch 20 and 33 rows above it are as they
were).
