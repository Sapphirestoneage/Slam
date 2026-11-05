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

- Every row on the spec's Fields tab names exactly what it is in code in its SLAM id column (a field like `debt.balance`, `type:debt:Credit card`, `line:Rent`, `math:M14`, or `notyet: why`), and every field is on a spec row. Drift fails the run.
- A new field: `node tools/registry_fields.mjs > /tmp/fields.json`, then `python3 tools/spec_link.py /tmp/fields.json` adds its spec row; then `python3 tools/xlsx_to_csv.py`. `SPEC-DRIFT.md` (written by `node --test`) lists any drift and the spec rows not built yet.
- A change to the program (`js/registry/program.js`: sessions, levels, weights, pace, unlocks): `python3 tools/program_tab.py` rewrites the spec's Program tab, then `python3 tools/xlsx_to_csv.py`. `test/program.test.js` fails when the tab and the registry differ.

## Data and questions

- Never commit real client data. Private fixtures stay in `fixtures/*.local.json` (git-ignored).
- Questions from a prompt go in `QUESTIONS.md` and in the list at the end of the run.
