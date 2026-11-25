# SLAM the Game: known weak code

This list is for reviewers. It shows each weak point, why it is weak, and the recommended repair. The numbers are from 2026-11-22. `CODE-MAP.md` has the full tables.

Repaired on 2026-11-22 and removed from this list: A1 (replaced functions), A3 (hidden errors), B1 and B2 (two test checks), B6 (test file names), C2 (version stamps), C3 (the older copy), D (code with no caller). Repaired on 2026-11-23: A8 (two functions with the name `hsSheet`) and B3 (the test file of "Our household" is back in `tests/`). Added on 2026-11-23 with the Plan batch: C9 to C14. Also new on 2026-11-22: GitHub runs `npm run test:game` on each push (`.github/workflows/test.yml`). The last section tells what the repair of A1 did not prove.

## A. Structure

| # | Weak point | Why it is a problem | Recommended repair |
|---|-----------|---------------------|--------------------|
| A2 | 1,241 functions and all constants are in one global scope. | Two files can use the same name by accident. This happened two times (`cpSheet` on 2026-11-21, and `hsSheet`, repaired on 2026-11-23). | Change the files to ES modules, or put each feature in one object. `tools/game_walk` can prove that the player sees no change. |
| A4 | 405 lines are longer than 300 characters. | These lines are HTML inside template text. They are hard to read and to compare. | Divide each long template into small functions that return one part of the screen. |
| A5 | The names are short (`igAdd`, `cspCalc`, `fkX`, `W`, `G`, `D`). | A new reader cannot guess the meaning. | Keep a prefix for each feature, but use full words after the prefix. Add the prefix list to the README. |
| A6 | The screens are made from text. There are no components. | The same row or button markup occurs in many files. | Make a small set of shared functions for rows, tiles, chips and buttons. Some exist (`head`, `mathBox`, `igRows`). Use them in all files. |
| A7 | Some screen code calculates numbers. | The rule is that only `derive()` and the feature math functions calculate. | Move the calculations out of the screen functions. `csp.js` and `eras.js` are examples to correct. |
| A9 | 36 of 569 actions (`ACT`) are set in more than one place. A later place keeps the earlier action, calls it, and adds to it. | This is the same layer pattern as the old A1, for actions. To read one action, a reader must read 2 to 4 places. | Merge each action in the same way as the functions: one action in the base file that calls named parts. `CODE-MAP.md`, section 2, has the list. |
| A10 | A base function calls its parts in later files behind a test (`typeof part === "function"`). There are 282 such tests. Four functions (`fogPct`, `profStrip`, `partySheet`, `peopleSheet`) also keep an early body that runs only while the page loads. | The page draws the first time before all files are loaded. Without the tests, the page stops with an error during the load. The tests and the early bodies are noise for a reader. | Draw the page one time, after the last file is loaded. Then remove the tests and the early bodies. This changes what occurs during the load, so prove it with `tools/game_walk` (the record of the load frames will differ, and that is the intent). |
| A11 | Six files use names from later files with no test (`USES LATER` in their headers). | The code is correct only because these names are used after the page has loaded all files. A change of the load order can break it with no warning. | A2 repairs this. |
| A12 | Three actions (`sharpskip`, `sharpdone`, `shuse`) stop with an error when no sheet is open (`W` is null). | The browser walk reached this state by random taps. The error changes no data, but the tap does nothing. The code from before 2026-11-22 has the same errors. | Start each such action with a test that its sheet is open. |
| A13 | The comments inside the functions are older text. Only the file headers, the comments of the parts, and the documents are in Simplified Technical English. | Two styles of comment are in one file. | Write a comment again when you change its function. |

## B. Tests

| # | Weak point | Recommended repair |
|---|-----------|--------------------|
| B4 | The tests of the add-on content and one large older suite are not in the repository, because they contain add-on text. | Keep them private. Divide the older suite and move the parts without add-on text into `tests/`. |
| B5 | The tests in `tests/` examine HTML text. They do not run in a browser. | `tools/game_walk` runs the game in a browser, but it only compares two copies. Add a small set of browser tests with fixed expected results for sign-in, save and one full flow. |
| B7 | 19 scripts have no test file of their own, for example `core/engine.js`, `core/metrics.js`, `screens/ui.js` and `features/debts.js`. `tests/README.md` has the list. | Add a test file for the math first: `core/engine.js` (`derive`) and `core/metrics.js`. |

## C. Product and operation

| # | Weak point | Recommended repair |
|---|-----------|--------------------|
| C1 | Repaired on 2026-11-22, but not proven on the live site. Cause: a new account opened on the sample game, which never saves, but the status said "Saved". Now the status says "Sample · not saved", setup opens one time for a new account, and finishing setup writes the game (proven with a stand-in database). | Prove it one time on the live site with a real account. |
| C4 | Some features use invented market data to show an idea (guardrails, the bond tent, the order of returns). Partly repaired on 2026-11-23: the retirement odds (`features/odds.js`) use the real history in `data/market.js`. The famous money ideas still use made-up years. | Use `MARKET_HISTORY` (`data/market.js`) in the ideas too. |
| C5 | The account recommendation uses federal tax only. | Add state and city tax from `data/reference-2026.json`. |
| C6 | Repaired on 2026-11-25. The sheet "Share" showed the QR code and the address of the retired copy inside Claude. Now `data/qr.js` holds the link for the slide (the public address of the game); `tools/qr_slam.py` makes it together with `docs/qr-slam.png`, and reads both back. Not checked: a real phone camera on the code inside the game. | Scan it one time with a phone. |
| C7 | The service worker (`sw.js`) asks the network first and uses the browser cache if the network fails. But no code puts a file in that cache. | The game does not open with no connection. Decide: fill the cache (then the player can open the game with no connection, and must get new versions in a safe way), or remove the cache line. |
| C8 | After a release, a browser can keep `index.html` for 10 minutes. In that time the page can ask for script addresses of the release before. | This is a limit of GitHub Pages. The version stamps make it safe for the scripts: after the browser gets the new `index.html`, each changed script has a new address. One time only, after the move of the scripts into folders on 2026-11-22: a page from before the move can fail to load until the player loads it again. |

| C9 | The simulators about loans (rent or buy, the mortgage, debt, the car) count in future dollars with a return before inflation. The other simulators and the two paths count in today's dollars at 7% after inflation. Each screen says which. | Pick one way for all simulators, or add an inflation chip to the loan simulators. |
| C10 | The old sheet "Is it safe to spend this?" (ui.js) still has a red lamp (`.lamp.red`, `#ff4d6a`) for its third state. The new Ask sheet (ask3.js) uses only green and yellow. | Change the third state to amber. This changes what the player sees. |
| C11 | Some numbers in the spreadsheet of the plan are not formulas: the replay of market history, the month-by-month runs of the two paths and the simulators. Each of these rows says "Worked out by the game". | A spreadsheet cannot replay 150 years of history in one cell. A second sheet with the yearly data could make the replay a formula too. |
| C12 | The simulator "Move to a cheaper or pricier city" uses the guesses of the player. The game has no city data ("Career and city atlases" is not built). | Add the city data, then fill the two changes from it. |

| C13 | `vendor/retire-engine.js` is a bundle of code from outside the game (Zack Williams' RetirementPlanner, MIT license, 394 KB, minified). Nobody in this repository edits it, and `CODE-MAP.md` does not examine it. Its capital market assumptions (for example 5.5% a year after inflation for large US stocks) differ from the 7% that the rest of the game uses, and the screens say which one each number uses. | To update it: `node tools/retire_engine_build.mjs` clones his repository into a temp folder, changes his YAML tax data to `data/retire-*.json`, bundles `src/engine/` with esbuild into one IIFE (the global `RetireEngine`), writes `vendor/retire-worker.js` and the license file. Then run `node tools/game_stamp.cjs`, `python3 tools/game_codemap.py` and `npm run test:game`. `tests/retirement-engine.js` fails when the adapter no longer matches his types. |
| C14 | The adapter gives his engine one person: a married player files jointly, but the spouse's own pay, accounts and Social Security are not in his Scenario yet. | Add the partner as his `spouse` profile from the household of the game. |

## D. Code with no caller

Repaired on 2026-11-22. Five functions are in `unused/no-caller.js`, and the game does not load that file. Four functions stay in the game, each with a comment that starts with `NO CALLER IN THIS REPOSITORY` and gives the reason: `offDays`, `oxyRows`, `igYears`, `igFree`. `CODE-MAP.md`, section 3, shows them. `tools/game_codemap.py` shows a function with no caller and no reason as a fault.

Open: the owner must confirm that no private add-on calls the five functions in `unused/` (`askNoneOk`, `cpAge`, `freeLine`, `moveSheet`, `payOrder`) and the two functions `igYears` and `igFree`. After that, remove them.

## E. What the work of 2026-11-22 did not prove

The work changed the structure of the code: no function is replaced now (before: 61 functions in 113 places), each `catch` block records its error, the scripts are in folders, each file has a header, and each script address has a version stamp.

The proof that the player sees no change:

- `npm run test:game` gives the same result for each check before and after (the two corrected checks and two new checks are the only differences).
- `node --test` gives the same totals before and after.
- `tools/game_walk`: 120 walks with random taps (178,000 records), for the code before and after, give the same record. 337 of 342 screenshots at 390, 1280 and 1440 wide are the same byte for byte, and the 5 others are a coin that moves all the time.

What this proof does not cover:

1. **The private add-ons.** Their source is not in this repository, so no test here runs them. The public names that an add-on can call did not change: each function has the same name and the same arguments as before. But 27 internal names no longer exist, because they held the function "before the layer" and there are no layers now: `AK_DBOLD`, `AK_KNOLD`, `ASK_OLD`, `FD_READY`, `TD_Q`, `_camp1`, `_camp2`, `_cel0`, `_close0`, `_draw0`, `_finSetup`, `_flow0`, `_games1`, `_go0`, `_home0`, `_home1`, `_ledRow`, `_me0`, `_money0`, `_nextStep0`, `_plan0`, `_play0`, `_render0`, `_safe0`, `_save0`, `_setup0`, `_sheet0`. If an add-on uses one of these names, it stops with "is not defined". Repair: examine the add-on source for these names, and run the private add-on tests one time.
2. **The real database.** The walks use a stand-in for the Supabase library. Sign in one time on the live site and make sure that the game saves and loads.
3. **Screens that a random walk did not reach.** The walks tapped 329 of the 558 actions. The tests in `tests/` examine each feature directly, but they do not run in a browser.
