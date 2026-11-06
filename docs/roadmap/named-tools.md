# The named tools: what they are today and where they land

Four tools from the older suite (the public repo `Sapphirestoneage/personalfinance`, read on 2026-11-05) that the
roadmap names. For each: where it lives, exactly how it works (inputs, math, outputs, citing files), and where it lands
in SLAM. Paths are in that repo unless they start with `js/`, `data/library/` or `docs/` (SLAM).

## (a) The quantum collapse onboarding

**What exists.** No file or decision in that repo is named Quantum Collapse. Its ROADMAP.md lists "Quantum Collapse
(onboarding decision-tree engine)" in Tier 5 with a tick, and the same file's key says a tick means "the idea is
locked and clear, not that it exists". What was built is the idea in four pieces, each its own decision:

1. **The situation tree (D-094, D-142).** `shared/gate.js` and `Registry.applies` know which questions belong to
   which situation (employed, between jobs, self-employed, mixed, student, retired). D-142 moved the check into
   `Progress.mountHeader`, so a room never asks a question the situation has no answer to: 342 room and situation
   pairs measured, 0 wrong after. This is the "decision tree" part: one answer (the situation) removes whole
   branches of questions.
2. **The five-input opening (D-312, `engines/opening.js`, `data/opening.json`).** Inputs: age, take-home with its
   cadence, spending (or "I don't know"), invested and cash, any debts. Math, all in today's dollars:
   FI number = a year of spending / 3.5% (the drawer shows 4% and 3.25% beside it); years to the FI number at three
   real returns, 3%, 5% and 7%, which is the band (worst, likely, best); the coast date from `engines/coast.js` (a
   monthly walk: the first month the pot, left alone, reaches the FI number by age 65); the savings rate
   (take-home minus spending) / take-home; the stage (under 1 year of spending invested: "income and savings rate are
   almost all of your outcome"; over 5: "your portfolio now does real work"); the three levers that move the likely
   date most from `data/levers.json` (a pay step of $500 a month, a 10% spending cut, clear the dearest debt, save
   half of every 2% real raise, one point more return), a debt dearer than the expected return ranked first.
   Unknown spending stands in at 70% of take-home, tagged rough. Output: the band, the coast date, the rate, the
   stage, the levers. **Each day's band is written to the journal** (`kind: 'band'`, worst, likely and best months)
   so a later month can say whether the band tightened. That journal line is the closest thing in the repo to
   measuring the collapse.
3. **The first round and the doors (D-206, D-207, `shared/doors.js`).** Five questions (age, ZIP, situation, pay,
   cash) give one card: rough runway in months, built on suggested spending where none is typed and saying how many
   suggestions went in. `recommend()` names the next door by "the most expensive unknown", in a fixed order: a card
   with a guessed minimum, then whether there is any debt, the benefit between jobs, spending, what is invested, the
   tax facts, then the door with the most rows open. Inside a door, four levels (how much, where it sits, what it is
   made of, what it costs) each unlock a named insight. "You understand X%" weights each row by state
   (`data/confidence_weights.json`: sure 1, roughly 0.85, from memory 0.75, stale 0.7, suggested 0.5, not sure 0.25,
   missing 0).
4. **The cost of not knowing (D-214, `engines/notknowing.js`, `data/plausible_ranges.json`).** For every blank or
   rough row that names what it feeds, set the row to the low and the high of a plausible range on a copy of the
   household and read the insight at both ends (months to FI, runway, net worth, take-home, reachable money,
   interest a month). The swing is the size of the unknown; the doors can sort blanks by swing so the most valuable
   question is asked first. The ranges are typed from memory of BLS CE 2023, SCF 2022, CPS 2024 and G.19 and marked
   unverified.

The coach edition in the same repo (`money-rooms-v3/`) adds two pieces: `engine/guesses.js` fills every spending area
not given from national averages by household size, scaled by cost-of-living tier, shown as Guess and never counted
(MR-045); and `engine/sensitivity.js` ranks every input that reaches the FI date by **ask priority**: the change in
the FI date across the value's plausible range, where the range is a share of the value by answer state
(`data/weights.json`: verified 2%, known 5%, rough 20%, will send 30%, estimated 35%, unknown 50% around the national
default) (MR-042).

**What none of it does yet.** Nothing starts from age alone: every path needs at least take-home. No output carries a
range from the inputs' uncertainty (the bands are return scenarios, a different thing). The next question is
ranked by a fixed order (doors) or by one output (the FI date), never by how much it narrows the whole plan.

**Where it lands.** Phase 4, Track 1. `docs/engines/priors.md` (a plan from age alone, from reference tables),
`docs/engines/ranges.md` (a range on every key output from the inputs' levels), `docs/engines/next-best.md` (Ask me
next: the question that narrows the plan most), and the certainty meter replacing the Picture %. SLAM's levels (Gut,
Rough, Estimate, Actual; Not sure, Roughly, Know it on a row) already play the part of the answer states.

## (b) The tax calculator

**Where.** `rooms/tax.html` (the Tax room, two readings: what it takes, and the cliff), `engines/taxroom.js` (the
room's picture of a year), `engines/tax.js` (the computation, D-067), `engines/selfemployed.js` (SE tax),
`engines/cliff.js` (the benefits cliff, D-301), `engines/rothaca.js` (Roth conversions against the ACA cliff, D-216).

**Inputs.** Gross annual income (from Start Here), filing status (single, married jointly, married separately, head of
household), state, the employment status and income source types (to split wages from self-employment profit), the
workplace pre-tax contribution as a whole percent of wages, other pre-tax money a year, tax withheld a year (for the
refund or bill), and for the cliff a raise to test and the household size.

**Math (`engines/tax.js`), in named steps, each its own function and result.**
1. `ordinaryTax`: AGI = gross minus above-the-line money (pre-tax deferrals, the deductible half of SE tax);
   taxable = AGI minus the larger of the standard deduction and itemised; walk taxable income up the bracket ladder
   (`data/federal_brackets_2026.json`, 2026 single: 10% to $12,400, 12% to $50,400, 22% to $105,700, 24% to
   $201,775, 32% to $256,225, 35% to $640,600, then 37%; standard deduction $16,100 single, $32,200 joint, $24,150
   head of household). The marginal rate is the last slice's rate, and 0 when the deduction covers everything.
2. `capitalGainsTax`: long-term gains stacked on top of ordinary taxable income, at 0%, 15% and 20%.
3. `fica`: 6.2% Social Security up to the wage base ($184,500 in `data/se_tax_2026.json`), 1.45% Medicare, plus 0.9%
   additional Medicare over $200,000 single or $250,000 joint.
4. `selfEmploymentTax` (reused from `engines/selfemployed.js`): 92.35% of profit at 15.3% up to the wage base net of
   wages already taxed, half deductible.
5. `stateTax`: none, flat or graduated (`data/state_brackets_2026.json`, 51 rows in the shape of the Tax Foundation's
   2025 table), applied to federal taxable income as a stated stand-in; joint brackets are the single ones times 2.
6. `acaCliff`: MAGI as a multiple of the poverty level (`data/aca_2026.json`: $15,650 plus $5,500 a person), the
   expected contribution from the applicable-percentage table, and the room before the 400% cliff.
7. `estimate`: adds them, and lists what it does not model.

`engines/taxroom.js` then gives the effective rate (total tax / gross), each piece in dollars, the bracket and the
room left in it (from AGI, so pre-tax money is already off), the refund or bill (withheld minus federal income tax,
SE tax and state; FICA is never in it), take-home (gross minus tax minus pre-tax money), the shares of a dollar of pay
(take-home, federal, state, FICA, pre-tax), and beside it the blunt effective-rate lookup
(`data/effective_tax_rates_2026.json`, federal plus FICA by gross band) the rest of that app used, so the two are not
confused. `engines/cliff.js` reads the SNAP, Medicaid and ACA lines (`data/benefit_cliffs_2026.json`) and says which
ones a raise crosses. Every table except the SE mechanics is marked unverified in its own file.

**Compared with SLAM today.** SLAM's Cash flow › Taxes shows filing status, effective and marginal rate, last year,
quarterly and SE tax, from `data/reference-2026.json` (federal brackets and standard deduction checked Oct 28 2026,
and real NY and NYC schedules for single, joint and head of household, which the older file approximates). SLAM does
not yet stack capital gains, compute the ACA cliff, or tax other states.

**Where it lands.** Phase 5: one tax function the projection calls once per year per household (federal ordinary and
gains, FICA, SE, state and local, ACA), ported step by step from `engines/tax.js` onto SLAM's verified tables, with
the state table verified before use. The benefits cliff (`engines/cliff.js`) comes earlier, in Phase 4 wave 1, for
clients near the lines.

## (c) The dual-age retirement calculator

**Most likely: The Bridge (`rooms/bridge.html`) with The Number's two stored ages, run year by year by the Middle
Class Trap test (`engines/trap.js`).** No file says "dual-age". Three candidates hold two ages:

| Candidate | The two ages | Verdict |
|---|---|---|
| `rooms/bridge.html` + `engines/statement.js bridgeGap` + `engines/trap.js` | The age work becomes optional (the FI age at the current pace, or the stop age you set) and the age the retirement money becomes reachable (59½, or 55 under the Rule of 55) | Most likely: this is the calculator built around the gap between two ages |
| `rooms/fire.html` (The Number), D-070 | The stop age (`targets.retireAge`, "the age you intend to stop") and the coast age (`targets.coastAge`); a test calls it "The Number owns two ages" | The stored ages the Bridge reads; the same tool from the other side |
| `money-rooms-v3/engine/retire.js` (Retirement for two, MR-067) | Each partner's age and retirement age | The two-people reading; a growth calculator, not the bridge |

**How the Bridge works today.** Inputs: date of birth (age), monthly spending, the FI date at the current pace (from
`engines/fire.js progressToward`, the standard variant), and every account with its tax character and, for a Roth,
its contribution basis. Math (`bridgeGap`): FI age = age + years to FI; gap years = max(0, 59.5 minus FI age); need =
gap years x a year of spending; reachable before 59½ = taxable accounts + cash + Roth contributions (basis, capped at
the balance) + HSA; short = max(0, need minus reachable). Output: the gap in years, the need, what reaches, years
covered, dollars short, or "no bridge needed". The room then explains each other door from
`data/early_access_rules_2026.json`: the Rule of 55 (leave that employer in or after the year you turn 55), 72(t)
(fixed amortization at up to 5% or 120% of the federal mid-term rate), the 5-year conversion clock, and home equity
(shown, never counted). `engines/trap.js` runs four paths year by year from the stop age to the access age: bridge
(cash, taxable, Roth basis first, pre-tax only at 59½), the Roth conversion ladder (convert a year of spending each
year, taxed then, spendable after five years), 72(t) payments, and the Rule of 55; tax from the federal ladder and the
gains stack; balances at the three Triple D returns; verdicts Trapped (a shortfall year), Tight (the bridge ends near
empty), Free. Today the bridge starts from the FI date at the current pace, not from the stop age (D-070 left that
open), and nothing models two partners' ages together.

**The two ages in SLAM.** Age 1 is when work becomes optional (the FI age, or the age the client picks). Age 2 is when
the money becomes reachable without penalty (59½, 55 for an employer plan, 62 to 70 for Social Security, 65 for
Medicare). For a couple each partner has both, so the view has up to four ages on one line.

**Where it lands.** Phase 5: the dual-age view, a reading of the year-by-year engine (`docs/engines/projection.md`):
the years between the two ages drawn as a band, the sources that reach in each year in order, the shortfall years,
the four paths of `engines/trap.js`, and for a couple both people's ages. Plan › Timeline is its home.

## (d) The FI Skill Tree (625 skills)

**Where.** `rooms/skill-tree.html` (The Skill Tree, D-131, D-139, D-140, D-141, D-274), `engines/skilltree.js`
(household in, per-skill state and reason out), `engines/skills.js` (the Stacker: three at a time), `engines/exercises.js`
with `data/exercises.json`, and the data: `data/skill_tree.json` (version 3.0.0, as of 2026-09-06) and
`data/skill_links.json`. Extracted from the FI Skill Tree v6.3.1 source page by `scripts/extract-v63.mjs`.

**What it holds.** 25 trees of 25 levels each, 625 skills, each `[name, what, does, fits, check, tier]`: the name, what
it is, what it does for you, where it fits, the check that levels it (the proof), and a leverage tier S (45), A (241),
B (263) or C (76). Levels 1 to 25 land on five bands five at a time (Foundation, Optimization, Advanced, Expert,
Endgame). Within a tree each level lists the one before as its prerequisite (the extractor's reading of the source's
"Builds on L1" copy). 312 lanes link trees: finishing one skill opens a skill in another tree without walking that
tree's ladder. The same file adds 40 skills of that app's own in six trees (keeper, anchor, compounder, earner,
ledger, planning), which carry FOO gates (`fooRequires`, `fooUnlocks` in `data/skill_links.json`), proofs read from
household facts, and five "warps" that skip skills once a fact is true (8 months of cash, 12 months closed, a will and
beneficiaries, and so on).

**How the room uses it.** It reads the household, marks each skill done, open or locked with a reason, shows three to
practise at a time (the Stacker), and keeps a practice ledger (`skillsDone`, `exercisesDone`, `practiceLedger` are the
fields it owns).

**What Batch 17 did.** `data/library/skills.json` holds the 625 curriculum skills (not the 40 app skills) with id,
tree, tier (band), level, leverage, name, description, does, fits, proof, prerequisites, the lanes both ways
(`opensFrom`, `opens`), the source file, and SLAM's draft tags: the Scorecard area and the FOO step where the skill
first pays. Built by `tools/library/extract-skills.mjs`, checked by `test/library.test.js` (625, unique ids, every
link resolves, no loops, tags name real areas and steps), registered in `REFERENCE_FILES`
(`js/registry/assumptions.js`). No UI.

**Where it lands.** Phase 4 (the library's first slice: the learning order beside the FOO, three skills at a time on
Home, from `docs/engines/library.md`), deepening in Phases 5 and 6 as the trees that need the projection
(withdrawal, tax strategy) and the multimillionaire stage (real estate, entrepreneurship, family wealth) come in.

## Earlier standalone tools (Eli's answer, Nov 6 2026)

Eli: these "were previous tools, like the personality calculator kind of thing, to get letters like INFJ". They were
built in chats as single HTML files, not in the Personalfinance repo. What each one did, from those chats:

- **Quantum Collapse onboarding (Aug 2026, built to replace Money Map Pro's intake).** As few questions as possible,
  each one eliminating plans rather than collecting a picture: 4 to 7 adaptive questions by income source, with
  early exits when the answer already decides the plan (a deficit or a thin buffer skips the goal question).
  Spending is never asked: it is take-home minus what is left over. Cash, debt and invested share one screen. Its
  signature is a 44-tick collapse meter showing the possible plans shrinking from 248,832,000 to 1 by honest
  branch-factor arithmetic, and a segmented progress bar that says "shortened" when triage removes a step. It
  exported a full plan (FOO rung, next dollar, FI date). Gaps found then, which SLAM's Phase 4 version must close:
  a forgiveness-track gate (never tell a PSLF borrower to pay the loan off), a match already captured, pre-tax gross
  (take-home hides 401(k) saving), HSA eligibility, and a haircut for irregular yearly costs.
- **The FI Address (July 2026).** A four-character, MBTI-style code placing anyone in the FI universe: familiarity,
  route (employed or self-employed, and target), financial state and feeling, and the ceiling (can earn more, can
  spend less). Plus a motion flag (! or *) for transitions (chosen, hybrid, imposed, the layoff case), a bandwidth
  slider (Return on Hassle), and lowercase modifier letters (military, clergy, educator, medicine, equity pay,
  cross-border). Spend is computed, shown back, and the gap with the self-report is the finding.
- **The FI Personality Test (July 2026, in the Skill Tree).** 12 statements, 4 axes, 16 four-letter types (Earner
  or Keeper, Paper or Operator, Guardian or Venturer, Exiter or Savorer), each with a superpower, a shadow and
  prescribed trees, and a shareable card.
- **The five-element money personality quiz (Aug 2026, SPARKS).** Water, Earth, Air, Fire and Spirit as muscles,
  20 traits, a Sun, Moon and Rising stack, superpower, shadow and the floor (minimum viable competence).

Where they land in SLAM: Quantum Collapse is Phase 4 Track 1 (its meter becomes the certainty meter; its early exits
become Ask me next). The FI Address and the personality types are Phase 4 too, as one optional tap screen in
Discovery whose letters tilt which skills and which wording SLAM leads with; never a gate, never a verdict.
