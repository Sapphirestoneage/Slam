# Engine spec: ranges (a low, likely and high on every key output)

Status: design, Batch 17. Built in Batch 41 (build order steps 1 to 4: `js/math/ranges.js`, M9R); the certainty meter
(step 5) in Batch 43 (M9Q, defined in next-best.md: the width at age-only is read as the all-guess width until the
age-only start is built); the savings rate's range is next. Phase 4, Track 1 (ROADMAP.md).

As built (batch 41), where it differs from the design below: the widths are RULES (Know it: balances 2%, a paycheck, a
bill and a rate 0; Estimate 5%; Rough: balances 10%, spending 10%, steady pay 10%, pay that varies 30%, an APR 2
points; Gut: balances 25%, spending 15% (QUESTIONS 244), steady pay 20%, pay that varies 40%, a guessed APR 5 points;
a typical amount not answered yet TypicalLow to TypicalHigh), so a guess is always at least as wide as a rough
number. The line under a number always names months ("Could be Aug 2039 to Jan 2044" under the big number, which already says the likely one; the batch 41
brief), shows only when the inputs below Know it move it a material amount, and its tap names the two inputs that
widen it most. The FOO step's ends are the steps the one-at-a-time runs reach (no squares for a place on a list).

## Purpose

Every key output carries the uncertainty of its inputs: a low, a likely and a high, so the plan reads as a range that
narrows as the client answers. One method for every output, so two screens never disagree about how wide "about" is.

SLAM already has the first step: the FI date at Low or Medium confidence shows a year range from spending 15% or 5%
either way (`js/math/picture.js` confidenceOf and fiWordsOf, answer 122). This spec generalises that to every input
and every key output.

## Inputs

Each input value carries `{ value, level, low, high }`:

| Level | Where the range comes from |
|---|---|
| Missing | The prior (priors.md): 25th to 75th percentile for the age band, household and place |
| Gut | The client's own range if given (the intake form's money ranges already store one), else the prior's range centred on the client's number |
| Rough (Roughly) | Value plus or minus a width by field kind: balances 10%, monthly spending 10% (Q340: kept under the gut's 15%), income 10% (W-2) or 30% (variable), APR 5 points if guessed |
| Estimate | Propagated from its parts (it is an output of other inputs) |
| Actual (Know it) | Value plus or minus 2% for balances that move, exactly the value for fixed facts (a rate, a limit, a birth year) |

The widths are rules in `RULES` (`js/registry/assumptions.js`) with a source and date, starting from the older suite's
`money-rooms-v3/data/weights.json` (rough 20%, estimated 35%, unknown 50%) and tuned against the test households.

Assumptions (return, withdrawal rate, inflation) have their own range from the presets: return 6%, 7%, 8% real
(`presets.pace` Pessimistic, Likely, Optimistic). Input uncertainty and assumption uncertainty are shown separately:
the input range says "what we do not know about you yet", the assumption range says "what nobody knows about markets".

## Outputs

For each key output: `{ low, likely, high, width, drivers: [{ input, share }] }`, where `drivers` says how much of
the width each input causes (so Ask me next can pick the one to ask). The key outputs:

| Output | Math it runs | Unit | Display |
|---|---|---|---|
| FI date | M53 (with M50 FI number) | months from now | a month at narrow width, a year, a range of years, "or later" when the high end never reaches |
| Debt-free date | M31, M34 (payoff order with extra) | months | the same rules |
| Emergency fund status | M43 Rule of 5, M68 cash layers | months of spending held, against the target | "about 2 to 4 months of 6"; the layer it reaches at low and high |
| Monthly surplus | M27 | dollars a month | "$300 to $700 a month"; when low is below zero, the copy says "might not leave anything some months" (no red) |
| Net worth | M40, M41 | dollars | a range |
| FOO step | M69 | a step | the step at likely; when low and high land on different steps, both are named ("step 3, maybe 4") |
| Savings rate | M28 | share | a range |

## Formulas in plain words

**The propagation method: corners first, Monte Carlo never in Phase 4.** For an output with a few uncertain inputs:

1. Run the math once with every input at likely. That is the likely value.
2. For each uncertain input, run once with it at its low and once at its high, everything else at likely. The
   difference between the two runs is that input's swing on the output.
3. Combine the swings: low = likely minus the square root of the sum of the squared downward swings, high = likely
   plus the same for upward swings (inputs treated as independent, which is stated). This is the classic "one at a
   time, root sum of squares" sensitivity method; it costs two runs per uncertain input.
4. Order matters for dates: an FI date that never arrives at the high end of spending is "or later", not a number.
5. Clamp to what is possible: a balance cannot go below zero, a date cannot be before today.
6. `drivers`: each input's share of the width is its squared swing over the sum of squared swings.

Two runs per input on 10 to 20 inputs is 20 to 40 runs of M53 per change, each a few milliseconds; cache by input
version and recompute only the outputs an input reaches (the dependency graph in `js/registry/math.js` inputs).

**Correlated inputs.** Spending categories move together, so a gut total and its category lines are one uncertain
input (the total), not seven. Take-home and gross are one input. A couple's two incomes are two inputs.

**The certainty meter.** For each key output, certainty = 1 minus (width / the width at age-only), clamped 0 to 1; the
meter is the weighted average across the key outputs (FI date and debt-free date weigh most; the weights are in
`js/registry/program.js` beside WEIGHTS). Age-only is 0%; everything at Know it is near 100%. It answers "how sure is
this plan", which the Picture % ("how many boxes are filled") does not.

## Display rules

- The likely value is the headline; the range is in the same line, smaller ("Mar 2041, likely; 2039 to 2044").
- Width decides the format: under 6 months shows a month; under 2 years shows a year; wider shows a range of years.
  The FI date's existing rule (High shows a month, Medium and Low show years) becomes a special case of this.
- Every range has a one-line "what would narrow this" with the top driver and a button to its box.
- Never show a range on a number the client typed at Know it; show it on outputs only.
- Guess, Rough and Know it stay visible on inputs (QA.md category 9).
- No red, no verdict words: a wide range is "still wide", never "uncertain" or "at risk".
- Client view shows the likely value and the range; the drivers list is coach-only.
- Triple D (Phase 5) uses the same layout with the assumption range, labeled best, likely, worst.

## Data needed

- The priors tables (priors-sources.md).
- Width rules by level and field kind (RULES, sourced as SLAM's own convention with the older suite's weights as the
  starting point).
- Return presets already in `data/reference-2026.json`.

## Test households

1. **Age-only 27** (Alexis, nothing typed): every output has a range; the FI range is wide; the meter is 0%.
2. **Alexis after the rough pass**: the FI or debt-free range is 2 years or less (QA.md target).
3. **Maya**: the debt-free range narrows from years to months as the card APR moves from Guess (25%) to Know it.
4. **Tom, all Know it**: ranges collapse to the assumption range only; the meter near 100%.
5. **A deficit household** (spending above take-home at likely, below at low): the surplus range crosses zero and
   the copy says so plainly; the FI date is "not at this pace" at likely with what would change it.
6. **Hand check**: for one household, the corner method's FI range is compared with a 1,000-run random sample of the
   same input ranges; the corner range must hold the sample's 25th to 75th percentile within a stated tolerance.

## Build order

1. Width rules and `{ value, level, low, high }` on every input (a reader over the existing fields, nothing stored).
2. The corner propagation for M53 (FI date) and M27 (surplus); tests against hand runs.
3. Debt-free date, emergency fund, net worth, FOO step, savings rate.
4. `drivers` and the "what would narrow this" line.
5. The certainty meter on Home; the Picture % moves under it.
6. Triple D in Phase 5 reuses the display.
