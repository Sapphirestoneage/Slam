# SLAM (Stress Less About Money)

Coach-operated financial planning. A coach runs it live on a call with one client
household at a time, on a laptop. Static site for GitHub Pages: plain HTML, CSS and
JavaScript modules, no build step.

`spec/SLAM Build Spec.xlsx` is the only source of truth. Every tab is also in
`spec/csv/` (rebuild with `python3 tools/xlsx_to_csv.py`); read the CSVs.

## Run it

```
python3 -m http.server 8000
```

Open http://localhost:8000/. Everything stays in this browser (localStorage);
export a backup from the gear.

## Test it

```
node --test
```

Node 20 or newer. The math runs in Node with no browser.

## Test data

- `fixtures/demo.json` is made up and committed. Rebuild it with
  `python3 tools/fixtures.py demo`. Its expected outputs are the main math check.
- The private Test client stays on your laptop. Put `SLAM Test Client (private).xlsx`
  in `fixtures/` and run `python3 tools/fixtures.py private` to make
  `fixtures/eli.local.json`. Both are git-ignored. Tests that need it skip with a
  message when it is missing.

## Files

| Where | What |
|---|---|
| `index.html` | The app: top bar, five tabs (Home, Net worth, Cash flow, Plan, Report), sub-tabs |
| `staples.html` | Every staple and Polish rule on one page |
| `js/records.js` | One record type, history, undo and redo, snapshots, export and import |
| `js/math/` | Every Math tab formula as a pure function |
| `js/gates.js` | What applies to this household: the gates (R001 to R023) |
| `js/fasttrack.js` | Fast Track's Basics pass, written into the same records |
| `js/nav.js` | The tabs and sub-tabs, old My Money and Spending routes redirected to their new homes, Find |
| `js/ui/profile.js`, `js/ui/money-lists.js` | Home › About you and the gates hub; Income and Taxes (Cash flow); Assets and Protection (Net worth) |
| `tools/artifact.mjs` | Builds the one-file SLAM for Eli page from this repo (see the file for how) |
| `js/math/portfolio.js`, `js/ui/account-detail.js`, `js/ui/account-specific.js` | Inside each account: allocation, holdings, goals, growth, details; 401(k) and HSA |
| `js/homework.js` | I'll find it later: the Homework list and where to find each thing |
| `js/benefits.js`, `js/year.js`, `js/lifeadmin.js`, `js/community.js`, `js/timer.js` | Benefits and withholding flag; your year, sinking funds, taking over; life admin; community presets; onboarding timer |
| `js/payday.js`, `js/glossary.js`, `js/ui/tips.js`, `js/ui/report-this.js` | Payday card; plain-language tooltips; Report this |
| `docs/backlog-brandon.md` | The Nov 2 beta feedback, tagged NOW or LATER |
| `data/reference-2026.json` | Presets, limits, rates, lists from the Reference data tab |
| `PROGRESS.md`, `QUESTIONS.md`, `BACKLOG.md` | Where the build stands, open questions, later phases |
