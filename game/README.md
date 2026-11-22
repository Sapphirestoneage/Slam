# SLAM the Game: start here

SLAM the Game is a money game for one household. It runs in a browser. It has no build step.

Live site: https://sapphirestoneage.github.io/Slam/game/

This page tells a new developer how the game is made, how to run it, and where its weak points are.

This folder is the only copy of the game. An older copy inside Claude is retired.

## 1. The five facts you must know first

1. **The game uses classic scripts.** `index.html` loads 60 script files in a fixed order. All functions and constants are in one global scope. There are no modules.
2. **A later file can replace a function from an earlier file.** The later file keeps the earlier function, calls it, and adds to its result. 61 functions are replaced, in 113 places. `CODE-MAP.md` lists each one. This is the largest weak point in the code.
3. **The screens are HTML text.** Each screen function returns one HTML string. `render()` puts the string in the page. One click handler reads the `data-a` attribute and calls `ACT[name]`.
4. **All data is one object, `G`.** `G.chars` is the list of player profiles. `save()` writes `G` to the browser storage. On the website, `supa.js` also writes `G` to the Supabase database for the account.
5. **`derive(c)` does the math.** It takes one profile and returns all computed numbers (net worth, savings rate, era, and more). The screens show these numbers. They do not calculate.

## 2. Run it

```
python3 -m http.server 8000
```

Open http://localhost:8000/game/. Without an internet connection the game runs in demo mode, and the data stays in the browser.

## 3. Test it

```
npm run test:game
```

The command runs 32 test files (701 checks) in Node.js. It needs no browser. Each test file has the name of its feature. `tests/README.md` has the list and tells how a test file works.

Two failures are known. They are listed in `tests/known-failures.json`, and the runner shows them on each run. One more file (`addon-sealed-files.js`) needs private files and stops with an error in this repository.

`node --test` runs the tests of the main SLAM app (1,259 checks). It does not run the game tests.

## 4. Where things are

The scripts are in five folders. The folder shows the role of a file. It does not change the load order: `index.html` is the only place that sets the load order.

| Folder | Role | Files |
|--------|------|-------|
| `core/` | The math, the data model and the error record. Each screen depends on these files. | `report.js`, `engine.js`, `engine2.js`, `metrics.js` |
| `data/` | Data only. No functions. | `skills.js`, `skillthemes.js` (the skill tree), `qr.js` (one QR code picture) |
| `account/` | Sign-in, the database, the save to the cloud, and the add-on system. | `supa.js`, `cloud.js`, `gate.js`, `addon.js` |
| `screens/` | The main screens, the click actions, the navigation and the setup questions. | `ui.js`, `ux.js`, `planner.js`, `nav.js`, `tidy.js`, `smart.js`, `profiles.js` |
| `features/` | One file for each feature. Each file adds its sheets and its actions. | 43 files. `CODE-MAP.md` gives the purpose of each one. |
| `unused/` | Code that nothing calls. The game does not load it. | `no-caller.js` |
| `tests/` | The tests. | `run.cjs`, `harness.cjs`, one file for each feature |

These files stay in `game/` because the browser or the tools look for them there: `index.html`, `admin.html` (the administrator page), `sw.js` (the service worker), `manifest.json`, the two icons, and `x1.json` and `x2.json` (the add-ons, see section 6).

| Subject | Files |
|---------|-------|
| Famous money ideas | `features/roof.js`, `features/ideas.js` to `features/ideas5.js`, `features/ideasz.js` |
| Later eras and the account recommendation | `features/eras.js`, `features/dep.js` |
| Fork Theory, spending plan, audit score | `features/fork.js`, `features/csp.js` |
| List of built features, shown in the game | `features/built.js` |
| Generated map of all files | `CODE-MAP.md` |
| Known weak code | `KNOWN-WEAK.md` |

## 5. How one screen is drawn

1. The player taps a button that has `data-a="roof"`.
2. The click handler calls `ACT.roof(button)`.
3. `ACT.roof` sets `W` (the state of the open sheet) and calls `sheet(rfSheet)`.
4. `rfSheet()` returns the HTML for the sheet.
5. A tap inside the sheet calls a second action. That action changes `W` or the profile, calls `save()`, and draws the sheet again.

## 6. Add-ons (locked content)

Two add-ons contain content for specific players. Only the administrator can turn them on, for each player. Their source code is not in this repository. The files `x1.json` and `x2.json` contain the content in encrypted form. The keys are in the database, and the database rules release a key only to a player with permission. `docs/game-addons.sql` contains the database tables and rules.

## 7. Rules for the code

- No red in the interface. Amber means "needs attention".
- A number that comes from a guess gets no verdict. Each number has one of three states: Guess, Close, Exact.
- The player taps. The player does not type sentences.
- Each technical term on a screen has an "i" button with an explanation.
- No em dashes in text.
- Never commit real client data.

## 8. Version stamps

Each script address in `index.html` and `admin.html` ends with a version stamp, for example `core/engine.js?v=1a2b3c4d`. The stamp comes from the content of the file. When a script changes, its address changes, and the browser gets the new file.

After each change of a script, run:

```
node tools/game_stamp.cjs
```

`npm run test:game` examines the stamps. It fails when a stamp is old.

## 9. Format

Prettier formats the scripts. The settings are in `.prettierrc.json`.

```
npx prettier --write "game/{core,data,account,screens,features,unused}/*.js"
```
