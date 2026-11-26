# The quiz engine: one engine, many skins

One file scores every quiz of the web app and of the game: `js/math/quizcore.js`. It has pure functions and no
imports. A quiz is a **skin**: one data file with its questions, traits, result cards and its mapping onto the five
elements. A quiz is a game lens, never a diagnosis.

## The files

| File | What it is |
|------|------------|
| `js/math/quizcore.js` | THE engine. The shape of a definition and of a result is written at its top. |
| `js/quiz/skins/<id>.js` | One skin each. `js/quiz/skins/index.js` is the list, in the order shown. |
| `js/quiz/page.js` | The one renderer of the web app (`quiz.html`): list, first screen, question, card. |
| `js/quiz/store.js` | What the web app keeps (`settings.start.lenses`), and what a shared copy leaves out. |
| `js/solo/quiz.js` | The page `quiz.html`: the Money Chart first, then "More quizzes". |
| `tools/game_quiz_build.mjs` | Copies the engine and the skins to the game, and writes the routes. |
| `game/core/quizcore.js`, `game/data/quizskins.js` | The copies. Do not edit them. |
| `game/features/quizzes.js` | The one sheet of the game: Me > Quizzes. |
| `data/quiz/routes.json` | The names of the skills, skill trees and readings the cards route to. Made by the tool. |
| `test/quizcore.test.js`, `game/tests/quizzes.js` | The tests. Both fail when a copy is old. |
| `js/math/sins.js`, `tools/game_sins_build.mjs` | The money sins read on the engine, and its copy for the game (`test/sins.test.js`, `game/tests/money-sins-read.js`). |

## Add a skin in five steps

1. Copy `js/quiz/skins/houses.js` to `js/quiz/skins/<id>.js`. Change the id, the name, the note, the traits, the
   questions (about 8 to 15 taps; each answer adds points to traits) and one card for each trait: a title, two or
   three plain lines, the light side, one next step.
2. Route each card to real ids: `next.skill` and `skills` are skill ids of `data/library/skills.json`, `next.tree` and
   `trees` are its tree ids, `readings` are ids of `data/library/unlearn.json`. A wrong id stops the build and fails
   the test.
3. Say how it maps, in the skin file: `core.elements` gives each trait its share of the five elements (Water, Earth,
   Air, Fire, Spirit), `core.sheet` names its line on the character sheet, `core.how` says the mapping in one plain
   sentence. Write the same mapping in the comment at the top, under `HOW IT MAPS`.
4. Add the skin to the list in `js/quiz/skins/index.js`.
5. Run `node tools/game_quiz_build.mjs`, then the game steps (`npx prettier --write "game/**/*.{js,cjs}"`,
   `node tools/game_stamp.cjs`, `python3 tools/game_codemap.py`), then `node --test` and `npm run test:game`.
   The new quiz is then in both apps. No screen code changes.

`qzCheck(def)` lists what is not right in a definition (a trait with no card, an answer that adds to a trait that
does not exist, a card with no next step). The tests run it on every skin.

## The functions

| Function | What it gives |
|----------|---------------|
| `qzFlow(def, answers)` | The questions these answers lead to, the next one, and `done`. |
| `qzScore(def, answers, outside)` | THE scoring: each trait's score, the ranking, the top two, ties, each group. |
| `qzResult(def, answers, outside, opts)` | The result: `ready`, `id` (the key of the card), `top`, `second`, `topTwo`, `tie`, `margin`, `byGroup`, `confidence`, `sources`, and `code` and `axes` for a code quiz. |
| `qzCard(def, result)` | The card: `title`, `lines`, `light`, `next`, `skills`, `readings`, `trees`, `also` (the second), `note`. |
| `qzRoute(def, result)` | Where the result routes: the next step and the ids. |
| `qzFeed(def, result, currentElement)` | What it changes: `line` ("Your element stays Fire." or "This leans you toward Water: keep Fire or switch?"), `ask`, `keep`, `to`, and `sheet` (the line for the character sheet). |
| `qzCheck(def)`, `qzIds(def)`, `qzTaps(def)`, `qzLast(def, answers)`, `qzHolds(cond, answers)` | Helpers. |

Three kinds of result (`def.result.by`):

- `top` (the default): the trait with the most points names the card. The second is on the card too.
- `axes`: a code. Each axis picks one pole (the Money Letters: four letters; the FI Address: four characters). A card
  is either written for each code (`cards`) or put together from the words of each pole (`poles` and `compose`).
- `rules`: the first rule whose condition holds names the card (Quantum Collapse). A rule marked `early` ends the quiz
  before every question is asked.

Two kinds of scoring (`def.scoring`): `sum` (points add up) and `average` (statements on a scale, each trait the
average of its statements, each group the average of its traits: the Money Chart).

A condition (`when` on a question or a rule) is data: `{ press: 'behind' }`, `{ work: ['job', 'both'] }`,
`{ press: { not: 'behind' } }`, `{ any: [ ... ] }`.

## The confidence level

Every result has one of the three levels SLAM uses for every number, in the words of a read:

| Level | Word on the card | When |
|-------|------------------|------|
| Guess | Early read | Two answers sit close together, or there are fewer sources than the skin asks for. |
| Close | Close read | Every question is answered and one answer stands out (`def.confidence.margin`, 0.1 unless the skin says). |
| Exact | Confirmed by you | Only when the person taps "That is me" (`opts.confirmed`). A quiz alone is never Exact. |

## Scores from outside

`qzScore` and `qzResult` take scores from other sources of evidence as an input: `{ traitId: points }`, or a list
`[{ source: 'spending', scores: { traitId: points } }]`. The engine adds them in and names the sources in
`result.sources`. It keeps nothing: the caller works out the weights and the fading over time, and passes the numbers
in each time. A result can come from outside scores alone, with no answer. `def.confidence.sources` says how many
sources a skin needs before a result is a Close read.

## The sins quiz and the read (run Money sins, Part 1)

`js/quiz/skins/sins.js` is a real skin now (15 taps, two families: `sin` with 7 traits, `change` with 12; pride is in
both as `pride` and `proud`). `confidence.sources` is 2, so the quiz alone is always an Early read. Its `read` block
holds the words of the read: the two kinds of pride and one defense for each trait (`read.fix`).

The other three sources and the rules are in `js/math/sins.js` (pure, no import; the game runs a copy made by
`node tools/game_sins_build.mjs`, `game/core/sins.js`). `snRead({ qzResult, QZ_LEVELS }, def, state, data, today)`
turns every piece of evidence into faded scores (half-life 30 days; the quiz shares out as the others come in), hands
them to `qzResult` as scores from outside, and adds what the engine does not decide: a label only when two sources
agree over about 30 days of data, the top two of each family, Why we think this, the push-back and Test the fix.
Web app: `js/quiz/sinsdata.js` (the ledger), `js/quiz/read.js` (the card). Game: `game/features/sins.js`.

## The styles added in Part 6 of the run Finish everything partly built (Nov 25 2026)

Six more skins, each a data file in `js/quiz/skins/`, all on the same engine:

| Skin | Style | What is new in the engine or the renderer |
|------|-------|-------------------------------------------|
| `scripts` Money Scripts | 12 taps, four answers each | `bars: true`: a percent for each script on the card (`qzBars`) |
| `enneagram` Money Enneagram (solo) | 12 taps, five or six answers each, nine types | `bars: true` |
| `fire` The FIRE Community Quiz | 14 statements on a five-point agree scale (Likert) | `result.group: 'flavor'` (the card is the top flavor, not a preference); `bars: 'flavor'`; `spectrums` (`qzSpectrums`: a mark between two words) |
| `snack` Build a Snack Plate | 7 picture taps, playful | the question style `cards` (a grid of picture tiles; each answer has an `icon`) |
| `traits` Money Trait Percents | 24 quick statements, eight traits | `many: true` (24 taps are allowed); each trait its own percent, 0 to 100 |
| `collapse` Quantum Collapse | 2 to 5 taps | `where: 'game'` (the web app asks it on its own first screen); the meter `qzPaths` (collapseOf uses it too); `measured`: the order of the five numbers from `tools/collapse/measure.mjs` |

- `qzBars(def, answers, group)`: a percent for each trait on its own, its points out of the most it could get on the
  path taken (a statement quiz: its average, already 0 to 100). Two traits can be high at once.
- `qzSpectrums(def, answers)`: for each `def.spectrums` entry (`{ id, name, trait, left, right }`), where the person
  sits from 0 (left) to 100 (right), and the word for it (the left word, the right word, or In the middle).
- `qzPaths(def, answers)`: the paths still possible (the product of the choices not yet made), and the share settled.
- The web app (`js/quiz/store.js` lensNow) and the game (`qzNow`) pass `bars` and `spectrums` to the card. The game
  draws them with the dashboard kit (`dkCard`, `dkProgress`, `dkStatRow`).
- Duolingo mode (game): the daily question, once answered, routes to the skill and the short read of the latest quiz
  result (`qzLatest`, `qzDailyPart`), and Daily lessons is Kids mode's path for the player (`ADULT_LESSONS` in
  `game/data/kidlessons.js`, kept in `c.x.lp`), with the lessons whose tree fits the latest result first.

## A new question style (for quiz.html)

A question is drawn by a style: one function in `QUIZ_STYLES` in `js/quiz/page.js`, `(def, q, answer, pick)`, that
returns the element with the taps. `rows` (one wide button for each answer) and `scale` (the taps of a statement side
by side) are there. Add a function, then name it in a question: `{ id, ask, style: 'cards', options: [...] }`. In
the game the part that draws a question is `qzAskPart` in `game/features/quizzes.js`.

## Where a result is kept, and who sees it

- Web app: `settings.start.lenses[skinId] = { ans, go, at, seen, ok, kept }`. `seen` is "Me only" unless the person
  taps "Show it in shared copies". `js/privacy.js` takes a Me only result out of every shared copy.
- Game: `c.x.qz[skinId] = { ans, go, at, show, ok, kept }`. A result shows on the character sheet, and to a coach or
  an admin who opens the game, only after the player turns "Show it on my character sheet" on.
- The element changes only by the tap "Switch". Web app: `settings.start.element`. Game: `c.x.el.pick` with
  `c.x.el.over` (the id of the quiz), which `elOf` reads first.

## The quizzes that were there before

Their scoring moved onto the engine and their results did not change. `test/quizcore.test.js` and
`game/tests/quizzes.js` hold each one to a digest of its old results.

- The Money Chart: `MONEY_CHART` in `js/quiz.js` (web app) and `MC_QUIZ` in `game/features/chart.js` (game).
- Quantum Collapse: `COLLAPSE_QUIZ` in `js/collapse.js`.
- The Money Letters of Coach tools > Discovery: the skin `letters`, read by `js/math/identity.js`.
