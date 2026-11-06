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
