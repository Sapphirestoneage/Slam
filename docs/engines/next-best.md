# Engine spec: next best (the next dollar and the next question)

Status: design, Batch 17. The next question is built in Batch 43 (`js/math/nextbest.js`, M9Q: build order steps 1 and
3, Home only; the walk keeps its own order); `askCost` lives in RULES as three question times instead of a key per field;
the next dollar (steps 4 and 5) is next. Phase 4, Track 1 (ROADMAP.md).

As built (batch 43), where it differs from the design below:

- **The certainty meter** (ranges.md build order step 5) is defined here: for each key output (FI date, debt-free date,
  emergency fund months, monthly surplus, net worth), certainty = 1 minus its width over its **all-guess width**, clamped
  0 to 1, where the all-guess width is the same output with every input on file read at Gut (a typical amount stays
  typical). That is SLAM's stand-in for "the width at age-only" until the age-only start is built: every number a guess
  reads 0%, every number at Know it near 100%. A date that could run on and never come counts as `CertaintyOpenMonths`
  (600) wide. The meter is the weighted average by `CertaintyWeightFi` 3, `CertaintyWeightDebtFree` 3,
  `CertaintyWeightSurplus` 2, `CertaintyWeightEf` 1, `CertaintyWeightNetWorth` 1 (RULES, source this file, Nov 6 2026).
  The FOO step is a place on a list with no width, so it is left out of the meter; settling it counts in the next
  question (`CertaintyWeightFoo` 1). On Home the meter stands where the Picture % stood; the Picture % is one line under
  it and the program's pace still reads it.
- **What an answer reaches**: the gut number read off a statement or an app reaches Estimate (the Budget's "Statements
  or an app" tap, AskSecondsLookup 60); a statements total built from the lines reaches Know it (AskSecondsBuild 600); a
  typical amount not answered yet (a blank APR) reaches Know it (AskSecondsLookup 60); any other number already given
  reaches Know it (AskSecondsNumber 15).
- **Exact, not approximate**: each candidate is run again at its answered level (two runs), the rest kept as they are,
  so the score is what answering really buys (`test/batch43.test.js` checks it against answering each one on a copy).
- **The first inputs**: an item from the Picture %'s next small things with nothing in yet comes before any narrowing
  (the plan cannot run without it); These are big deals (M56) breaks a near tie (2%) toward the spending input when
  Spending is the assumption that moves the FI date most; then the next small things order.
- **The test households, as built**: Maya's first question is the spending total, not the card APR (the debt rule pays
  her card in about four months whatever its rate, so the APR barely moves a date); Alexis's is the spending total, then
  the guessed APR; Tom's is the rough invested total, then the statements total built from the lines.

## Purpose

Two rankings from one method. **The next dollar**: where the next dollar of surplus does the most for this household,
within the FOO's order. **The next question**: which answer would narrow the plan the most (Ask me next). Both are
"what moves the plan most per unit of effort", for money and for minutes of a call.

SLAM already has three pieces: **These are big deals** (M56, `js/math/fi.js` bigDeals: runs the FI date once for each
preset of return, withdrawal rate and spending, and names the assumption that moves it most); the **Picture %'s next
small things** (M73, `js/math/picture.js`: the items with the most points to the next level); and the **Scorecard's
best return** (M74: each hole's payoff a year over its effort hours, ranked after the client's FOO step). The next
best opportunity check is these three read together. This spec gives them one scale.

## Inputs

- The household and its levels (every input's `{ value, level, low, high }` from ranges.md).
- The key outputs and their ranges with `drivers` (ranges.md).
- The FOO placement and its locks (M69, `js/registry/foo.js`).
- The Scorecard holes with payoff and effort (M74).
- A question cost per field: how long it takes to answer on a call (a tap 4 seconds, a number 15, a lookup "find it"
  is homework), from the field registry (a new `askCost` per field, defaulting by type).

## Outputs

- `nextQuestion(h) -> [{ field, route, narrows: { output, from, to }, score, why }]`, top first, three shown.
- `nextDollar(h, amount) -> [{ place, step, gain: { kind, perYear }, why, locked }]`: the FOO step's place first, then
  what else would earn more, each with its reason.
- One line for Home: "Ask next: your card's APR. It narrows the debt-free date from 2027 to 2030 down to 2028."

## Formulas in plain words

**The next question.**

1. For each input that is not Know it, take its range now and the range it would have if answered at the level the
   client can reach on a call (a number they know: Rough; a statement in hand: Know it).
2. Run the key outputs (ranges.md corners) with that input narrowed, others unchanged. The narrowing is the drop in each
   key output's width.
3. Value = the sum over key outputs of (width drop / the output's age-only width) times the output's weight (FI date
   and debt-free date highest, surplus next, then emergency fund, net worth, FOO step).
4. Score = value / askCost. A big swing that takes a statement to answer can lose to a medium swing that takes a tap.
5. Skip inputs the situation has no answer to (the gates hub; the older suite's D-142 rule), parked items, and items
   marked "will get it" (they go to homework instead).
6. Ties break by the FOO step the input belongs to (earlier first), then the existing next small things order.

The shortcut while ranges are not built: `drivers` is not there, so use M56's method on inputs instead of assumptions
(run the FI date at each input's low and high, take the spread), which is what the older suite's `notknowing.js` and
the coach edition's `sensitivity.js` ask priority did.

**The next dollar.**

1. Start from the FOO step the household is on (M69). A dollar goes where the FOO says first; the ranking never jumps a
   lock without the existing Unlock anyway note.
2. For the step's place and each place after it that is open, compute the gain of $100 a month there for a year in one
   unit: interest saved (a debt at its APR), match captured (the match rate), tax saved (the marginal rate now, or later
   for Roth vs pre-tax once the projection exists), FI months gained (M53 with the extra), or risk removed (months of
   the Rule of 5 filled, valued at the cost of a heavy-debt fallback).
3. Convert each gain to FI days a year (M58 money as time) so they share one scale, as the Scorecard's payoff does.
4. Rank by gain within the FOO order; show the FOO's place first and any later place that earns more as "worth a look",
   never as the answer.
5. The older suite's `engines/next100.js` ("one list, one scale: the return each place earns or saves on the next
   $100") is the prior art for step 2.

## Data needed

- The FOO rules and locks (built), contribution limits (built), the match formula (built), marginal rates (built).
- `askCost` per field (new, a registry key with defaults by type; tuned from the effort counts in QA.md).
- Key output weights (new, beside WEIGHTS in `js/registry/program.js`).

## Test households

1. **Maya**: the next question is the card APR (Guess 25%) because it moves the debt-free date most per second; the
   next dollar is the card.
2. **Alexis**: with spending at Gut, the next question is the gut spending number's main category, not an account
   balance.
3. **Tom**: everything near Know it; the next question is the oldest number (a stale balance), and the next dollar is
   the 401(k) to the limit, with taxable as "worth a look".
4. **A couple**: the second income's steadiness narrows the FI range more than a third account balance.
5. **Brute force check**: for each test household, answering the top-ranked question narrows the plan at least as much
   as any other single answer, measured by trying each.

## Build order

1. The shortcut next question (M56's method over inputs, FI date only) on Home, three items, each a button to its box.
2. `askCost` in the field registry.
3. The full next question once ranges.md's `drivers` exist; the brute-force test.
4. The next dollar, within the FOO, in FI days a year; the "worth a look" line.
5. Phase 7: the call copilot shows the next question beside the transcript.
