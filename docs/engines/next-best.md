# Engine spec: next best (the next dollar and the next question)

Status: design, Batch 17. Nothing here is built. Phase 4, Track 1 (ROADMAP.md).

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
