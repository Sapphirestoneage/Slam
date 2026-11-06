# QA: how a screen is judged

Every batch report scores the screens it touched against this rubric. An area is done when every screen in it passes all 12 categories with no blocker or major failures, and Eli has signed off on categories 5 and 12.

## The breakdown

Area (Net worth) > Screen (Credit cards) > Section (Credit health) > Row or card (one card) > Control (a field, button, toggle, link) > Words (label, placeholder, tooltip, message).

A failure is filed at the smallest level it lives at: a missing due day box is a Control failure, "Fixed feeds the floor" is a Words failure, a calendar showing a balance built on guesses is a Screen failure.

## The 12 categories

Each criterion is a yes or no. A component passes a category only when every criterion is yes.

### 1. Works (functionality)
- Every button does what its label says, every time.
- Every field saves, and the saved value shows everywhere it should.
- Nothing asks for something without a box to fill (DESIGN.md rule 5).
- Undo works on anything that changes data.
- Nothing needed for this step is missing: a field, a choice, an Add button.

### 2. Right (correctness)
- The math matches a hand calculation or the spreadsheet export.
- Zero, blank, negative and very large numbers all behave sensibly; a typed 0 is an answer, only blank is missing.
- Guesses and faded starter amounts never count as real numbers.
- The same input gives the same answer everywhere.

### 3. One answer (consistency of data)
- Each fact has one value across every screen (one payoff date per debt, one surplus).
- Each thing has one name everywhere (FOO steps, accounts, categories).
- When two screens assume different things, each says so in one line.

### 4. Looks right (visual)
- Boxes and labels in a row sit level; helper text sits below a box (DESIGN.md rule 1).
- Nothing is clipped, overlapping or off the edge (rules 2 to 4).
- Spacing, sizes and colors follow DESIGN.md; no red, no verdict styling.
- One primary button per area of the screen.

### 5. Obvious (intuitiveness)
- A first-timer can say what the screen is for within 5 seconds.
- Clickable things look clickable, and nothing else does.
- The next step is visible without hunting.
- It behaves the way the reference apps do (docs/BENCHMARK.md), or the report says why not.

### 6. Findable (navigation)
- Find reaches it in one search, using everyday words (401k, emergency fund, life insurance).
- It lives where a coach would look first.
- Back always returns to where you were; nothing strands you.

### 7. Easy (effort)
- If it can be a tap, it is a tap (DESIGN.md rule 11).
- Typical answers are one click (Use, quick picks).
- Clicks and keystrokes for the task are counted against the target (see Effort below).

### 8. Plain words (language)
- Labels say what the thing is, from the client's side.
- No jargon in plain view; explanations live in hover tips.
- Messages say what happened and what to do next.
- No em dashes, no verdict words ("strong", "at risk").

### 9. Tells you (feedback and states)
- Every action shows it worked (saved, added, moved).
- Empty screens say what to do next.
- Guess, Rough and Know it are visible on every number that has them.
- A lock says exactly what unlocks it, and that thing is one click away.

### 10. Fits everywhere (responsive and accessible)
- Works at 1440, 1280 and 390, light and dark.
- The keyboard works and the tab order makes sense.
- Text has enough contrast; tap targets are at least 32px.

### 11. Fast (performance)
- Screens open with no visible wait.
- Typing never lags; the page never jumps.

### 12. Coachable (fit for a live session)
- The coach can answer a client's question from this screen in under 10 seconds.
- Client view hides everything coach-only.
- A client looking at it would understand it and believe it.
- It moves the client toward a decision or a next step.

## Severity

- **Blocker**: a wrong number, lost data, or the task cannot be finished.
- **Major**: it works, but confuses or slows a real session.
- **Minor**: it looks off or reads oddly; nobody is stuck.

## Who checks what

| Checked by | Categories |
|---|---|
| Automated: `node --test`, `tools/e2e/layout.cjs`, the findability and effort scripts | 1 (partly), 2, 4, 6, 7, 10 |
| Claude, by eye, every batch | 3, 5, 8, 9, 11 |
| Eli, at sign-off | 5 and 12 (the feel), plus anything flagged |

## Status of a feature

Not built, Built (code exists, not proven), Verified (a test or browser run shows it working and it passes the layout check), Signed off (Eli tried it and it felt right). Only Signed off counts toward Phase 4.

## Effort targets (Alexis and Tom)

| Metric | Nov 5 2026 | Nov 6 2026, measured (batch 14) | Nov 6 2026, before batch 18 (main at batch 13, new count) | Nov 6 2026, after batch 18 | Target |
|---|---|---|---|---|---|
| Actions to a rough picture | about 50 | 97 / 98 | 58 / 56 | 35 / 38 | 40 or fewer |
| Picture after the rough pass | 70 to 74% | 71% / 64%; core 89% / 90% | 71% / 73%; core 89% / 90% | 77% / 86%; core 100% / 100% | 85% or more, core at 100% |
| Certainty after the rough pass (FI or debt-free range) | 7 years, or locked | Alexis: debt free in 64 months; Tom: FI 2037 to 2044, 6.5 years wide | the same | Alexis: debt free in 64 months, honestly 37 to 85 months (about 4 years: the guessed card APR and the gut spending); Tom: FI 2039 to 2042, 2.2 years wide | 2 years or less |
| Actions to 99% | about 150 to 250 (estimate) | about 159 / 164 | about 105 / 112 | about 71 / 70 | 100 or fewer |

`node tools/e2e/effort.cjs` (Alexis / Tom): New client, Create and start session 1 (Fast Track) and Walk me through, the
walk answering what each client knows and pressing Will get it for the rest. Since batch 18 (QUESTIONS 232) a tap, a pick
or a typed number is one action and keystrokes are reported apart (Alexis 47, Tom 63); the batch 14 column counted every
keystroke. The script prints every action in order with what it was for, a sensitivity table (each rough input moved on
its own: how wide it makes the FI or debt-free date), what still raises the Picture most, and every box still open.
Actions to 99% is every box still open on the X of Y filled counters times the actions one walk box took (at least 1.5:
a tap, or a typed number that moves on by itself, and sometimes a picker).

The two clients as the script answers them: the build notes, plus two batch 18 readings (QUESTIONS 240). Tom's $6,500
is read off his statements (the notes call Alexis's and Maya's numbers gut, not Tom's), and he types his home and car
values (about $650,000 and $22,000). Where the targets are not met, the input that would meet them:
- Alexis's Picture (77%): her spending is a gut number, 25% of her Picture weight, and a gut stays at Gut by rule (answer
  127). The one input that moves her past 85%: her spending read off her bank app (Statements, Estimate: about 90%).
  Use typical on the three categories is not knowledge of her, so it does not raise the Picture (by design).
- Alexis's debt-free range: the card APR (a guess at 25%; 20% to 30% moves the date from 53 to 85 months) and the gut
  spending (15% lower brings it to 37 months). The walk asks the APR in session 1 (it moves the date most); her card app
  has it.
- Tom's FI range (2.2 years): spending from statements is Medium confidence, 5% either way, worth 2.3 years at his
  horizon. Under 2 years needs spending known better than 5% (a month or more of actuals, session 3's Actual pass) and
  the invested total at Know it; then the date is one month (High).

A change that makes any of these worse does not ship without a stated reason.

## The scorecard in a batch report

One row per screen touched, one column per category, each cell a pass or the failure with its severity, for example:

| Credit cards | Works | Right | One answer | Looks | Obvious | Findable | Easy | Words | Tells | Fits | Fast | Coachable |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Screen | pass | pass | major: two payoff dates | minor: clipped name | pass | pass | pass | pass | pass | pass | pass | pass |

## Personas

Seventeen made-up households (README, Personas) prove each batch works for real people, from someone below zero to a
multimillionaire, including the ones SLAM cannot fully hold yet (three adults, house fees, platform payouts, transition
costs, business income, estates, college).

- `node --test` includes `test/personas.test.js`: every persona's hand-worked numbers (net worth, surplus or gap,
  savings rate, FOO step, debt-free month, FI month, emergency fund) against the app. A todo there is a known finding,
  named in the persona's def; a failure is new.
- `node tools/e2e/personas.cjs` opens each persona through Import and visits every screen at 1280: console errors,
  What's missing, the layout checks, and the story checks (one answer per number, no lock that asks for what the
  household cannot have, no "no debt" with debts on file).
- **Every batch report includes the persona result**: the test counts (pass, todo, fail) and the browser run's table
  (per persona: console errors, What's missing, layout findings, story blockers and majors), with anything the batch
  made better or worse. A batch that adds a new failure or a new story blocker says why or fixes it.
- When a batch fixes a finding, it removes the finding id from the def (the todo then has to pass).



- **Safe**: client data stays where it should, backups work, nothing real reaches the repo.
- **Resilient**: couples, irregular income, deficits, a client with 30 accounts.
- **Changes well**: new features do not break old ones.
