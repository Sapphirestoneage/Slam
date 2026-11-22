# SLAM the Game: known weak code

This list is for reviewers. It shows each weak point, why it is weak, and the recommended repair. The numbers are from 2026-11-22. `CODE-MAP.md` has the full tables.

## A. Structure

| # | Weak point | Why it is a problem | Recommended repair |
|---|-----------|---------------------|--------------------|
| A1 | 61 functions are replaced by later files, in 113 places. `home` has 12 layers, `moneyTab` has 7. | A reader cannot find one screen in one place. A change in one layer can break another layer. The load order is critical. | Merge the layers into the base function, one screen at a time. Run the tests after each merge. Start with `home`, `moneyTab`, `planTab`. |
| A2 | 898 functions and all constants are in one global scope. | Two files can use the same name by accident. This happened one time on 2026-11-21 (`cpSheet`) and broke a screen until a test found it. | Change the files to ES modules, or put each feature in one object. Do this after A1. |
| A3 | 111 `catch (e) {}` blocks drop the error. | A defect can stay hidden. | Replace each block with a call to one `report(e, where)` function that records the error. |
| A4 | 442 lines are longer than 300 characters. The longest has 7,765 characters. | These lines are HTML inside template text. They are hard to read and to compare. | Divide each long template into small functions that return one part of the screen. |
| A5 | The names are short (`igAdd`, `cspCalc`, `fkX`, `W`, `G`, `D`). | A new reader cannot guess the meaning. | Keep a prefix for each feature, but use full words after the prefix. Add the prefix list to the README. |
| A6 | The screens are made from text. There are no components. | The same row or button markup occurs in many files. | Make a small set of shared functions for rows, tiles, chips and buttons. Some exist (`head`, `mathBox`, `igRows`). Use them in all files. |
| A7 | Some screen code calculates numbers. | The rule is that only `derive()` and the feature math functions calculate. | Move the calculations out of the screen functions. `csp.js` and `eras.js` are examples to correct. |

## B. Tests

| # | Weak point | Recommended repair |
|---|-----------|--------------------|
| B1 | `t_built.js`: 1 check fails. The check counts the rows of the built-features list. It was written for a different copy of the game. | Correct the expected count, or remove the check. |
| B2 | `t_missions.js`: 1 check fails. The reward of one mission type does not agree with the change in its letter score. | Examine the mission reward math in `missions.js`. This can be a real defect. |
| B3 | `tests/retired/t_house.js` tests features that are not in this copy. | Remove the file, or add the features. |
| B4 | The add-on tests and one large older suite are not in the repository, because they contain add-on text. | Keep them private. Divide the older suite and move the parts without add-on text into `tests/`. |
| B5 | The tests examine HTML text. They do not run in a browser. | Add a small browser test set (Playwright) for sign-in, save and one full flow. |
| B6 | The test files have short names (`t_ask2.js`, `t_batchd.js`). | Give each file the name of its feature. |

## C. Product and operation

| # | Weak point | Recommended repair |
|---|-----------|--------------------|
| C1 | No game is saved in the database (2 accounts, 0 saved games on 2026-11-22). The save path is not proven on the live site. | Sign in, change one value, and examine the `games` table. |
| C2 | The script files have no version in their address. A browser can show an old file for 10 minutes. | Add a version number to each script address in `index.html`. |
| C3 | The game has two copies: this folder, and an older copy inside Claude. The older copy does not have the newest features. | Use this folder as the only copy. Remove the other copy when the owner agrees. |
| C4 | Some features use invented market data to show an idea (guardrails, the bond tent, the order of returns). | Use the real return history from the main app (`data/`). |
| C5 | The account recommendation uses federal tax only. | Add state and city tax from `data/reference-2026.json`. |

## D. Code with no caller

`CODE-MAP.md`, section 3, lists 9 functions that have no caller in the game source. Examine each one. Move the ones that are not necessary to a folder with the name `unused`, or remove them.
