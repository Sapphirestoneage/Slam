# SLAM roadmap: after Phase 3

SLAM is coach-run planning software. A coach drives it live on a call with one household at a time. It starts with
people in their twenties and thirties, many below zero, some couples, and should keep being useful as a household
grows into a multimillionaire planning its next stages.

**The thesis.** Entering just an age already gives a financial plan. Each answer after that collapses the
uncertainty: the plan stops being a wide range and becomes this household's plan. The rule is easy; the flexibility
is depth. A fifth of the effort gets four fifths of the picture, with the option to reach 99%.

**Two orders, side by side.** The money order is SLAM's FOO: what the next dollar funds. The skill order is the
library: what to learn, or unlearn, next. They run together: each FOO step has the few skills that make it work.

This file is the plan. The spec workbook (`spec/SLAM Build Spec.xlsx`) is still the source of truth for what is
built; its Roadmap tab uses an older phase numbering (4 Coaching depth, 5 The future in depth, 6 Clients in the app,
7 Delight, 8 Connect) and is to be brought in line with this file (QUESTIONS.md). `BACKLOG.md` holds the spec's
Feature list rows for later phases; this file says which phase each lands in. Supporting docs:
`docs/roadmap/inventory.md` (every older tool, with a call), `docs/roadmap/named-tools.md` (the four named tools),
and the engine specs in `docs/engines/`.

## Phase 3 sign-off: what "done" means before anything below starts

Phase 3 is the core rebuild: records, math, staples, navigation, My Money, Spending, Plan, Report, Home with the
12-session program, coach tools. It is signed off when all of these hold:

1. **QA.md, every screen, all 12 categories, no blocker or major.** One scorecard table per screen, each cell a pass
   or a minor (Works, Right, One answer, Looks right, Obvious, Findable, Easy, Plain words, Tells you, Fits everywhere,
   Fast, Coachable).
2. **The layout checker near zero.** `node tools/e2e/layout.cjs` across every screen at 1440, 1280 and 390, light and
   dark, Demo and Fast Track clients: no failure on any screen, or a short list each with a reason.
3. **The personas suite green.** The standard test clients (Maya, Alexis, Tom, a couple, and the beta clients'
   private fixtures where present) pass their tests in both time zones (`TZ=UTC` and `TZ=America/New_York`).
4. **The effort targets in QA.md.** For Alexis and Tom: 40 or fewer actions to a rough picture; the picture at 85% or
   more after the rough pass with the core at 100%; the FI or debt-free range at 2 years or less after the rough pass;
   100 or fewer actions to 99%. A change that makes one worse ships only with a stated reason.
5. **Eli's sign-off on feel.** Categories 5 (Obvious) and 12 (Coachable) on every area, from a real run-through, with
   think-aloud tests on real tasks and the issues found triaged and fixed.

Only features at Signed off (QA.md "Status of a feature") count toward Phase 4.

## Phase 4: the plan from an age, and SLAM for real lives (two tracks together)

**Goal.** Any household gets an honest plan from the first answer, with a visible range that narrows as they answer,
and the app fits lives that do not look like a W-2 brochure.

### Track 1: Quantum Collapse

- **Priors by age.** Typical values by age band (and household type where the data has it) for take-home, spending by
  category, rent, debts, balances, retirement savings and emergency savings, from public surveys
  (`docs/engines/priors-sources.md`). Each prior is a range (25th to 75th percentile), never a single number, and it is
  a Gut answer: it never counts as the client's number.
- **Age-only start.** A new client with only an age sees a plan: an FI date range, a debt-free range, an emergency fund
  range, a surplus range, all wide and all labeled as typical for that age.
- **Range math on every key output.** FI date, debt-free date, emergency fund status, monthly surplus, net worth and
  the FOO step carry a low, likely and high from the inputs' levels (`docs/engines/ranges.md`).
- **Ask me next.** One card that names the question whose answer narrows the plan most, with one tap to its box
  (`docs/engines/next-best.md`). It uses the existing These are big deals card (M56) and the Picture %'s next small
  things as its first two inputs.
- **The certainty meter replaces Picture %.** One meter: how narrow the key ranges are, not how many boxes are filled.
  Picture % stays under it as a detail while the program pace still reads it.

### Track 2: SLAM for real lives, wave 1

**First build after Phase 3 sign-off (Eli, Nov 6 2026): Life Transitions**, its own session: the options ladder (every money source cheapest first, each priced), the dip track with its floor, tripwires, Plan B and C, a share view for parents or a partner, and templates (student to job, job loss, quitting, marriage, kids, divorce, empty nest). Graceful degradation (full, DRAFTT, FAT, food and housing) folds in. See docs/roadmap/named-tools.md.

- **Who sees this, discretion.** A per-client setting for what shows in client view, on the one-pager and in exports;
  neutral labels for any income, account or category the client wants kept quiet; a quick hide for a screen share.
- **Income by type.** Paychecks, cash, tips, platform payouts (gig apps, marketplaces, creator platforms) and irregular
  gifts, each with how it is taxed, how it arrives and how steady it is, rolled into one take-home with a range.
- **Lender's-eye view.** What a lender, landlord or card issuer sees: documented income (two years of returns for
  self-employment), DTI, utilization, history, and the gap between what is earned and what can be shown.
- **Bank closure fire drill and stranded money.** What happens if an account is closed or frozen with no notice: where
  the next paycheck lands, which bills bounce, a second bank and a backup card, money held by a platform or payment
  app, old employer plans (`rooms/left-behind.html` in the older suite), unclaimed property. Pairs with "When it won't
  all get paid" (`rooms/cant-pay.html`: which bill to protect first).
- **Households of any size.** One person, a couple, roommates, a parent, partners who do not file together,
  more than two adults: the couples split generalised to N people with per-person views.
- **The benefits cliff.** Which lines a raise crosses (SNAP, Medicaid, the ACA cliff), from `engines/cliff.js`.

### The library's first slice

The learning order that runs beside the FOO: at each FOO step, the three skills (from the 625 in
`data/library/skills.json`) that make that step work, plus one thing to unlearn (from the unlearning ladder), shown
slim on Home and on Plan › FOO, ticked off by the data where a proof can be read and by hand otherwise
(`docs/engines/library.md`). Homework can be a skill.

**Engines.** Priors (new, `docs/engines/priors.md`), ranges (new, `docs/engines/ranges.md`), next best (new,
`docs/engines/next-best.md`), the library reader (new, `docs/engines/library.md`), the cliff (port).

**Older rooms that port here** (from the inventory): the opening's band and levers, the cost of not knowing, the doors'
recommend line, sensitivity's ask priority and the uncertainty weights, guesses by household size and cost-of-living
tier, plausible ranges (replaced by sourced priors), Can't Pay and bill triage, Left Behind and rollover options, side
income, the benefits cliff, the unlearning ladder, the Skill Tree, the Stacker and the 40 app skills, curricula and
readings, and the rank guess.

**Done means.** Alexis, Maya and Tom each get an FI and debt-free range from age alone, and the range narrows on every
answer in the rough pass, ending at 2 years or less; Ask me next picks the question that narrows the most, checked
against a brute-force run on the test households; the certainty meter is on Home; the four wave 1 features each have a
test household and pass QA.md with no major; the library slice shows three skills for each FOO step; every prior has a
source, a year and a date in the registry.

**Risks.** Priors read as judgments about a person (the copy must say "typical at your age", never "you"); national
tables do not fit New York (place scaling is needed early); a range that never narrows feels like the app is stuck;
Ask me next that asks about things the client cannot answer on a call; discretion features that leak through an
export; too many new cards on Home (slim and collapsed by default).

## Phase 5: one projection engine, and the future in depth

**Goal.** One year-by-year engine that every screen reads, with full tax depth, so a plan runs from now through the
end of life and the dual-age question has an answer.

- **The year-by-year projection engine** (`docs/engines/projection.md`): state per year per person, the order of
  operations each year, contributions to legal limits, debts, events, two ages and two people, decumulation. Every
  existing screen that projects (FI card, Timeline, Next 12 months, Current vs Proposed, Debt payoff, the ladder) reads
  it instead of its own math.
- **Full tax depth.** Federal ordinary and capital gains, FICA, SE tax, state and local for every state, the ACA
  credit and cliff, Roth conversions, early access rules (59½, Rule of 55, 72(t), the five-year clock), RMDs.
- **The dual-age retirement view.** The years between work becoming optional and money becoming reachable, the
  sources that cover each year, the four paths (bridge, Roth ladder, 72(t), Rule of 55), and both partners' ages.
- **Decumulation and Social Security.** Withdrawal order, flexible rules (VPW), claiming ages, the years the money lasts.
- **Go-go, slow-go, no-go spending.** Retirement spending by phase instead of one flat number.
- **Triple D**: best, likely and worst on every projected number; **Monte Carlo** later in the phase, once the
  deterministic engine is trusted.
- **Real lives wave 2.** Default vs my wishes map (what happens by default if nothing is written, against what the
  client wants); conditional support runway (help that could stop: a parent, a partner, a benefit); shift P&L (what a
  shift really pays after travel, childcare and time); money-control map (who can see, move and stop each account).

**Engines.** Projection (new), tax (ported step by step from the older `engines/tax.js` onto SLAM's verified tables),
decumulation, Social Security, VPW, Triple D, the trap test's four paths, events.

**Older rooms that port here.** The Tax room's engine, Which Account, state brackets, ACA, The Bridge, The Back Half
(draw, reachable, before 59½, the price of cover), the trap test, decumulation, VPW, Social Security, early access
rules, retirement milestones, Triple D, What If life events, event templates and scenario blocks, time buckets,
student-loan plan comparison, the timeline engine (dated income), and Retirement for two.

**Done means.** One engine, and a test fails if any screen computes a projected number another way; the projection
matches a hand-built spreadsheet for Maya, Alexis, Tom and a couple to the dollar in year 1 and within 1% at year 30;
federal tax matches published examples for each filing status; the dual-age view answers "can I stop at 45" for a
single and a couple; Triple D on every projected number; wave 2 features pass QA.md.

**Risks.** The engine change moves every number clients have already seen (needs a migration note and a
before/after per client); state tax data quality; tax law changes mid-year; performance of a year-by-year run on every
keystroke (cache per input version); Monte Carlo read as a promise.

## Phase 6: the multimillionaire stage, and next stages

**Goal.** The same plan keeps working when the household owns a business, real estate, concentrated stock and an
estate, and is planning what comes after work.

- Equity compensation (RSUs, ISOs, NSOs, ESPP, vesting schedules, the tax at each event).
- Business owner income and exits (S-corp salary vs distributions, owner retirement plans, a sale and its proceeds).
- Real estate portfolios (each property as it runs: rent, costs, debt, depreciation, a 1031).
- Concentrated positions and tax-lot planning (which lots to sell, gains budgeting, a diversification schedule).
- Roth conversion ladders and 72(t) as plans, not just readings.
- Charitable vehicles (a donor-advised fund, charitable remainder trust basics, QCDs).
- Estate and legacy (beneficiaries, wills, trusts in plain words, step-up basis, the estate tax line).
- Aging parents, kids' college (529s) and first homes.
- "Next stages" planning: sabbaticals, second acts, the designed week, dreamline, time buckets.
- **Real lives wave 3.** A transition roadmap (money through a transition of any kind, with the costs and dates);
  family building (every route, with its costs and timing); every legal pairing (married, partnered, not partnered,
  more than two adults, separate finances) with what each means for tax, benefits and inheritance.

**Engines.** Equity comp events, business entity, property, tax lots, estate, all on the projection.

**Older rooms that port here.** Work (offers, a second job, going solo, a course, a break), credential and degree ROI,
career momentum, housing (rent vs buy, deposit, the deal), ownership, mortgage rates, estate basics, kids and tuition,
child and childcare costs, windfall and lump sum, the dreamline, the designed week, travel bands, the Referee
(debates), the first SLAM's future tools, Money Rooms v3's home, house and car calculators, its conflict library.

**Done means.** A test household with equity comp, two rentals, a business and a parent to support runs through the
projection with every tax event; each feature has a source for its rules and a test; the library's later trees
(real estate, entrepreneurship, family wealth, withdrawal) are tagged and shown at the matching FOO steps.

**Risks.** Scope: this stage is where tools multiply (the inventory keeps the drop list honest); legal and tax advice
lines (SLAM explains and models, it does not give legal advice; Get Help lists who to ask); data entry burden for
complex households (statement upload and the copilot in Phase 7 reduce it).

## Phase 7: client-facing, and less typing

**Goal.** The client uses SLAM between sessions, and the coach types less during them.

- **Client portal.** The client view as its own page: their plan, homework, the next small things, the money date.
- **Between-session logging.** The client logs spending, ticks homework, answers parked questions.
- **Sync.** One household on the coach's laptop and the client's phone, with merge rules (SYNC.md).
- **Statement upload.** CSV is built; add PDF statements and paystubs.
- **The live call copilot.** A transcript of the call becomes proposed field values (each a Keep or Skip, never
  saved on its own) and the next best question appears beside it.
- **Intake from transcript.** A discovery call's transcript fills the intake the way the intake form does.

**Engines.** Sync and merge, statement parsing, transcript to fields (proposals only), next best question (from Phase 4).

**Older rooms that port here.** The progress card and Money Wrapped, the one-pager engine, the client view of the coach
app, the money date, follow-up emails and calendar files.

**Done means.** A client logs a week between sessions and the coach sees it at the next call; a PDF statement from
each of the common NY banks parses; the copilot proposes fields on a recorded mock call with nothing saved without a
tap; privacy proved (Safe: client data stays where it should, nothing real reaches the repo).

**Risks.** Privacy and consent (transcripts, statements and logs are sensitive; the discretion settings from Phase 4
apply); sync conflicts; a copilot that is wrong confidently (every proposal shows its source sentence).

## Where each named tool lands

| Tool | Today (older suite) | Lands | How |
|---|---|---|---|
| Quantum collapse onboarding | The standalone module from Aug 2026 (4 to 7 adaptive questions, early exits, the 44-tick collapse meter), plus the repo's pieces: situation gating (D-142), the five-input opening (D-312), the doors (D-206, D-207) and the cost of not knowing (D-214) | Phase 4, Track 1 | Priors, ranges, Ask me next, certainty meter |
| FI Address and the personality types | Earlier standalone tools: the four-character FI Address and the 16 four-letter FI Personality types (named-tools.md) | Phase 4 | One optional tap screen in Discovery that tilts which skills and words lead |
| Tax calculator | `rooms/tax.html`, `engines/tax.js`, `engines/taxroom.js` | Phase 5 (the cliff in Phase 4) | One tax function inside the projection |
| Dual-age retirement calculator | Both (Eli, Nov 6): The Bridge (`rooms/bridge.html`, The Number's stop and coast ages, `engines/trap.js`) and Retirement for two (both partners' ages) | Phase 5 | The dual-age view on Plan › Timeline, both partners |
| FI Skill Tree (625 skills) | `rooms/skill-tree.html`, `data/skill_tree.json` | Data in Batch 17; first slice Phase 4; later trees Phases 5 and 6 | `data/library/skills.json`, three at a time beside the FOO |
| The learning path | The Stacker (three at a time), the unlearning ladder | Phase 4 | The learn and unlearn order per FOO step |

## How the phases fit together

| Phase | Builds on | Hands on |
|---|---|---|
| 3 sign-off | the core | a trusted base and the effort baseline |
| 4 | priors need SLAM's levels; ranges need the math in `js/math` | ranges and Ask me next for every later number |
| 5 | ranges (Triple D is the return range) | the one projection every later feature reads |
| 6 | the projection and the tax function | the full household |
| 7 | discretion (Phase 4), the next best question | clients in the app |
