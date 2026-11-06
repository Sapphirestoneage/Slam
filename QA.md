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

| Metric | Nov 5 2026 | Target |
|---|---|---|
| Actions to a rough picture | about 50 | 40 or fewer |
| Picture after the rough pass | 70 to 74% | 85% or more, core at 100% |
| Certainty after the rough pass (FI or debt-free range) | 7 years, or locked | 2 years or less |
| Actions to 99% | about 150 to 250 (estimate) | 100 or fewer |

A change that makes any of these worse does not ship without a stated reason.

## The scorecard in a batch report

One row per screen touched, one column per category, each cell a pass or the failure with its severity, for example:

| Credit cards | Works | Right | One answer | Looks | Obvious | Findable | Easy | Words | Tells | Fits | Fast | Coachable |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Screen | pass | pass | major: two payoff dates | minor: clipped name | pass | pass | pass | pass | pass | pass | pass | pass |

## Later categories (after Phase 3)

- **Safe**: client data stays where it should, backups work, nothing real reaches the repo.
- **Resilient**: couples, irregular income, deficits, a client with 30 accounts.
- **Changes well**: new features do not break old ones.
