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

The command runs 25 test files (701 checks) in Node.js. It needs no browser. Two failures are known. They are listed in `tests/known-failures.json`, and the runner shows them on each run.

`node --test` runs the tests of the main SLAM app (1,259 checks). It does not run the game tests.

## 4. Where things are

| Subject | Files |
|---------|-------|
| Math and data model | `engine.js`, `engine2.js`, `metrics.js` |
| Main screens and click actions | `ui.js`, `ux.js`, `home.js`, `nav.js`, `planner.js` |
| Setup questions | `smart.js`, `tidy.js` |
| Account, sign-in and database | `supa.js`, `admin.html` |
| Add-on system (locked content) | `gate.js`, `addon.js`, `x1.json`, `x2.json` |
| Famous money ideas | `roof.js`, `ideas.js` to `ideas5.js`, `ideasz.js` |
| Later eras and the account recommendation | `eras.js`, `dep.js` |
| Fork Theory, spending plan, audit score | `fork.js`, `csp.js` |
| Skill tree data | `skills.js`, `skillthemes.js` |
| List of built features, shown in the game | `built.js` |
| Tests | `tests/` |
| Generated map of all files and layers | `CODE-MAP.md` |
| Known weak code | `KNOWN-WEAK.md` |

`sw.js` is the service worker. The browser loads it separately.

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

## 8. Format

Prettier formats the scripts. The settings are in `.prettierrc.json`.

```
npx prettier --write "game/*.js"
```
