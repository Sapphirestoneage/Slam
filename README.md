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
| `index.html` | The app: top bar, five tabs, sub-tabs |
| `staples.html` | Every staple and Polish rule on one page |
| `js/records.js` | One record type, history, undo and redo, snapshots, export and import |
| `js/math/` | Every Math tab formula as a pure function |
| `js/gates.js` | What applies to this household: the gates (R001 to R023) |
| `js/fasttrack.js` | Fast Track's Basics pass, written into the same records |
| `js/ui/profile.js`, `js/ui/money-lists.js` | My Money: Profile and the gates hub; Income, Assets, Protection, Taxes |
| `tools/artifact.mjs` | Builds the one-file SLAM for Eli page from this repo (see the file for how) |
| `data/reference-2026.json` | Presets, limits, rates, lists from the Reference data tab |
| `PROGRESS.md`, `QUESTIONS.md`, `BACKLOG.md` | Where the build stands, open questions, later phases |
