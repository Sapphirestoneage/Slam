# Contributing to SLAM

Thanks for helping. SLAM is a static site with no build step: plain HTML, CSS and JavaScript modules.

## How the repo is laid out

| Where | What |
|---|---|
| `index.html`, `css/`, `js/app.js`, `js/ui/` | The app and its screens. Views only show what the math returns; they never calculate. |
| `js/math/` | Every formula, as pure functions with tests. |
| `js/registry/` | The registries: every field (`fields.js`), every formula (`math.js`), every assumption and rule (`assumptions.js`), the report tabs (`reports.js`). |
| `js/sheet/`, `js/import-sheet.js` | Open the books: the workbook built from the registries, and bringing an edited one back. |
| `data/` | Reference data (presets, limits, brackets), the field list for Find, the efficiency flags. |
| `spec/` | The build spec (`SLAM Build Spec.xlsx`) and every tab as CSV in `spec/csv/`. |
| `test/` | `node --test` runs everything here. |
| `fixtures/` | Made-up households for tests. Real client files stay on your machine (`*.local.json`, git-ignored). |

## The registries and the coverage test

Every field the app stores is declared once in `js/registry/fields.js`, with its sheet info: a column, or a skip
with the reason. Every formula in `js/math` maps to a row on the spec's Math tab and to a row on the exported
workbook's Math tab: its entry in `js/registry/math.js` has a sheet formula, or `fromApp` with a one-line reason.
Every rate, limit and rule is in `js/registry/assumptions.js` with its source and date.

`test/coverage.test.js` fails the run when any of this is missing, and says what to add. The spec is linked to the
code row by row: each row on the spec's Fields tab names what it is in code in its SLAM id column, and every field
is on a spec row, so nothing drifts; the run fails if anything does, and `SPEC-DRIFT.md` says what. When you add a
field, `node tools/registry_fields.mjs > /tmp/fields.json` and `python3 tools/spec_link.py /tmp/fields.json` add its
spec row; re-export the CSVs with `python3 tools/xlsx_to_csv.py`.

## Run the tests

```
npm install      # optional: ExcelJS, for the spreadsheet tests
node --test
```

Node 20 or newer. With LibreOffice installed, the spreadsheet checks also recalculate the workbook and compare
every formula with the app (docs/WORKBOOK.md; `node tools/workbook-check.mjs` lists any row that differs). Without
ExcelJS or LibreOffice those few tests skip and say which is missing.

## The public site: promote at the end of every run

The public site is served from the branch `release`, not from `main`. `release` only moves when this passes:

```
bash tools/promote.sh
```

It tests the exact commit of `main` on GitHub in a temporary folder (`node --test` and `npm run test:game`) and,
only when both pass, fast-forwards `release` to it. It never forces or merges. Run it at the end of every run,
after the last push to `main`, and put its last line in the run's summary ("release is now ...", or "not promoted:
..." with the reason). A part that is not finished must show the card "Coming soon", never a broken screen. The
details, and the steps for GitHub Pages, are in `docs/RELEASE.md`.

## House rules

Math in `js/math` with tests; views never calculate; no red and no verdict words; no em dashes; copy from the
user's side; buttons look like buttons; visible input borders; slim or collapsed by default; works at 1440, 1280
and 390 wide. See `CLAUDE.md`.

## Never commit real client data

Only made-up numbers go in the repo. A real client's file stays on your machine.

## License

SLAM is licensed under the GNU Affero General Public License v3.0 only (`LICENSE`). By contributing, you agree
your contribution is licensed under AGPL-3.0-only too.
