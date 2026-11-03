# Working on SLAM

- No pull requests. When a piece of work is done, run `node --test`, then commit and push straight to `main`. The owner does not review PRs; every change stays undoable through git history.

## House rules

- Math lives in `js/math`, with tests. Views never calculate: they show what the math returns.
- No red and no verdict words. No em dashes. Copy is written from the user's side.
- Buttons look like buttons. Inputs have visible borders. Slim or collapsed by default.
- Every screen works at 1440, 1280 and 390 wide.

## Every field and formula is registered

- A new field goes in `js/registry/fields.js` with its sheet info: a column (`sheet: true`) or `sheet: { skip: 'why' }`.
- A new formula goes in `js/registry/math.js` with a `sheet` formula (named ranges only) or `fromApp` and a one-line reason.
- A new rate, limit or rule goes in `data/reference-2026.json` or `RULES` in `js/registry/assumptions.js`, with its source and date.
- `test/coverage.test.js` enforces all of this and fails the run when something is missing. When the registries change shape it also asks for one new line in `FORMATS` (js/sheet/format.js).

## The spec

- Every new feature also adds or updates its rows in the spec (`spec/SLAM Build Spec.xlsx`, then `python3 tools/xlsx_to_csv.py` to re-export `spec/csv`) and clears its lines from `SPEC-DRIFT.md` (written by `node --test`).

## Data and questions

- Never commit real client data. Private fixtures stay in `fixtures/*.local.json` (git-ignored).
- Questions from a prompt go in `QUESTIONS.md` and in the list at the end of the run.
