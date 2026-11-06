# Engine spec: the library (the skill order beside the FOO)

Status: first slice built, Batch 26 (js/math/library.js M9K, js/ui/library-ui.js, data/library/unlearn.json): Learn and
unlearn on each Plan › FOO step and Learn next on Home. The order built is the tilt (one per tree), then band, leverage
and level, not the rank below; the Scorecard hole and the tier openings are not used yet. Phase 4 first slice (ROADMAP.md).

## Purpose

SLAM's FOO answers "what does the next dollar do". The library answers the other half: "what do I learn, or unlearn,
next". The two orders run side by side: each FOO step carries the few skills that make it work and the one belief to
let go of there. It must add depth without clutter: three skills at a time, slim, collapsed by default.

## The data model

`data/library/skills.json` (Batch 17, built by `tools/library/extract-skills.mjs`, checked by `test/library.test.js`):

| Field | Meaning |
|---|---|
| id | Stable slug, `<tree>-<name>` (from the source extractor) |
| tree, treeName | One of 25 trees (Main Path, Portfolio Design, Tax Strategy, ... The Long Game) |
| tier | The band: foundation, optimization, advanced, expert, endgame (levels 1 to 25, five each) |
| level | 1 to 25 within the tree |
| leverage | The curriculum's ranking: S (45 skills), A (241), B (263), C (76) |
| name, description, does, fits, proof | What it is, what it does for you, where it fits, the check that shows it is done |
| prerequisites | The level before in the same tree (the source is a ladder) |
| opensFrom, opens | Lanes between trees (312): finishing any one skill in `opensFrom` opens this one without its ladder |
| tags.area | The Scorecard area (cashFlow, emergency, debt, credit, retirement, investing, taxes, protection, income, goals, mindset) |
| tags.foo, tags.fooBy | The FOO step where the skill first pays to learn, and the rule that set it (a word rule, or the tree's level band) |
| tags.kind | learn (the 625); unlearn entries come from a second file (below) |
| source | The older suite's file it came from |

Counts: 625 skills in 25 trees; tags by FOO step: 0b 73, 1 70, 2 1, 3 13, 4 55, 5 35, 5b 4, 6 135, 7 56, 8 70, 9 113.
The tags are SLAM's draft reading, for Eli to correct line by line: the rules are one table in the extractor.

**Unlearn** (next file, `data/library/unlearn.json`): from the older suite's `data/unlearning.json` and
`data/advice.json`: each popular rule with who says it, the FOO steps where it applies (`steps: [min, max]`), and the
status that follows: applies, stop believing (you are past it), not yet. Example: "keep six months of expenses in cash"
(steps 4 to 4 in the older file) is replaced at big e by SLAM's Rule of 5 (age / 5 months).

**Progress** (stored per client later, not in the data): `library: { [skillId]: { status: 'done' | 'doing' | 'skip',
by: 'data' | 'coach' | 'client', on: date, note } }`. A new field area in `js/registry/fields.js` when built.

## The learn and unlearn order, paired with FOO steps and levels

1. **At each FOO step**, the candidates are skills tagged with that step whose prerequisites are done (or that a lane
   has opened), plus any untagged foundation skill in the step's Scorecard area.
2. **Rank** by leverage (S, then A, B, C), then by the Scorecard area's hole (a skill in an area rated Hole ranks
   first, the same order M74 uses), then by level.
3. **Show three** (the older Stacker's rule, and DESIGN.md's slim default): the top three, each one line: the name,
   "does" in a hover tip, the proof as the done check.
4. **One unlearn line** at the step, when the client's step makes a popular rule stop applying.
5. **Levels.** SLAM's program levels (Gut, Rough, Estimate, Actual) say how well a number is known; the library's
   tiers (foundation to endgame) say how deep a skill goes. A client at session 1 to 3 sees foundation skills only; the
   optimization band opens once the Picture reaches its session 3 pace, advanced at Coast FI (step 6), and so on, so a
   beginner never meets an endgame skill.
6. **Done by the data where possible.** A skill whose proof the household already shows is ticked by the data (the
   older suite did this for its 40 app skills: "leveled when the household shows it: marginalRate"). For the 625, a
   map from skill id to a fact is added by hand, starting with the S-tier skills of the first FOO steps (for example
   "Capture the full 401(k) match" is done when the match is fully captured; "Build the $1K shield" when little e is
   full).

## How it surfaces in SLAM without clutter

- **Home**: one slim row under the next small things, "Learn next: Triage by rate" with a caret that opens the three.
  Collapsed by default. Coach view and client view both show it; the coach can skip a skill with one tap.
- **Plan › FOO**: each step's card gets a "Skills for this step" fold (three skills and the unlearn line).
- **Homework**: a skill can be homework (Coach tools › Lists), with its proof as the done check.
- **The Scorecard**: an area's hole links to its top skill.
- **Find**: skills are searchable by name.
- No separate library screen in Phase 4. A full tree view (all 625) is a Phase 6 reading, if at all.

## Data needed

The skills file (done); the unlearn file (from the older suite, to verify); a skill-to-fact map for data-ticked skills
(new, small); the tier opening rules (new, in `js/registry/program.js`).

## Test households

1. **Maya at step 3**: three debt skills (Triage by rate, Pick a payoff engine, Kill the consumer debt or similar),
   "Save $1,000 before anything else" shown as stop believing (that file applies it at steps 0 to 1, and Maya is past
   them), nothing above the foundation band.
2. **Alexis at step 1**: Build the $1K shield, Inventory every debt, Autopay all minimums.
3. **Tom at step 6**: optimization skills in retirement and taxes; Capture the full 401(k) match ticked by the data.
4. **A household that skipped a ladder through a lane**: a lane-opened skill shows although its level before is not done.

## Known gaps in the source (for the tags pass)

- The source ladder puts "Upgrade to index funds" before "Capture the full 401(k) match" in Main Path, while the FOO
  puts the match first; the library order follows the FOO tags, not the tree's level, when they disagree.
- The older app's own 40 skills (keeper, anchor, compounder, earner, ledger, planning trees) are the second set,
  data/library/app-skills.json (batch 24, QUESTIONS 207), the same shape, made by tools/library/extract-app-skills.mjs.
  Their gates use the older app's own 0 to 9 ladder (its data/foo_rules.json), so each is read into SLAM's step by
  meaning (its step 6, the Roth IRA, is SLAM's step 5); a skill with no gate takes its tree's home step. tags.gate keeps
  the original number. They carry data proofs and could seed the first slice.
- Only 58 of 625 tags come from a word rule; the rest come from the tree's level band and need a read.

## Build order

1. The unlearn file, with sources.
2. `js/math/library.js`: candidates, rank and the three for a FOO step, with the test households above.
3. The slim row on Home and the fold on Plan › FOO.
4. The skill-to-fact map for data ticks (S-tier skills of steps 0b to 5 first).
5. Progress stored per client; homework from a skill.
