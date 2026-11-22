# SLAM the Game: code map

This file is generated. Do not edit it. Run `python3 tools/game_codemap.py`.

Date: 2026-11-22. Files: 61. Lines: 46,967. Top-level functions: 1087. Replaced functions: 0, in 0 places. Functions with two declarations: 1. Hidden errors: 0.

## 1. Files in load order

The browser loads the files in this order. A file can use all names from the files above it.

| # | File | Lines | Functions | Lines > 300 chars | Hidden errors | Purpose |
|---|------|------:|----------:|------------------:|--------------:|---------|
| 1 | `core/report.js` | 24 | 1 | 0 | 0 | One function, report(e, where), records each error that a catch block stops |
| 2 | `account/supa.js` | 592 | 15 | 2 | 0 | accounts when the game runs on its own website (GitHub Pages) instead of inside Claude |
| 3 | `data/skills.js` | 5,156 | 0 | 0 | 0 | data only |
| 4 | `data/skillthemes.js` | 2,712 | 0 | 0 | 0 | data only |
| 5 | `data/qr.js` | 5 | 0 | 1 | 0 | a small QR code generator from a third party, kept in one line |
| 6 | `core/engine.js` | 3,841 | 123 | 0 | 0 | SLAM the Game: engine |
| 7 | `core/engine2.js` | 381 | 14 | 0 | 0 | engine2: game mechanics that ARE the data entry |
| 8 | `account/gate.js` | 52 | 7 | 1 | 0 | extras, part one |
| 9 | `screens/ui.js` | 6,416 | 209 | 135 | 0 | SLAM the Game: screens |
| 10 | `features/games.js` | 621 | 22 | 12 | 0 | the screens for the games that are the data entry |
| 11 | `features/games2.js` | 1,449 | 40 | 19 | 0 | Layer 2 (sorting), Layer 3 (sharpening), Layer 4 (coming back) |
| 12 | `features/year.js` | 766 | 24 | 13 | 0 | the year |
| 13 | `features/chart.js` | 1,291 | 13 | 6 | 0 | the Money Chart |
| 14 | `screens/profiles.js` | 122 | 6 | 4 | 0 | flip between people |
| 15 | `screens/smart.js` | 669 | 15 | 5 | 0 | every answer narrows what comes next |
| 16 | `screens/planner.js` | 1,255 | 55 | 18 | 0 | Rocket Money style navigation (a bottom bar plus a menu for everything else), a study-planner calendar for money tasks, a before and after payday chec... |
| 17 | `account/cloud.js` | 457 | 18 | 1 | 0 | the game saves to your Claude account by itself, so it follows you from phone to laptop and survives the app clearing its storage |
| 18 | `screens/ux.js` | 787 | 35 | 7 | 0 | walk-up-and-use |
| 19 | `core/metrics.js` | 1,825 | 26 | 10 | 0 | Key numbers |
| 20 | `features/debts.js` | 395 | 16 | 4 | 0 | finish the debt picture by tap (rate, monthly payment, card limit, how much it bugs you), then three payoff plans side by side |
| 21 | `features/import.js` | 263 | 7 | 9 | 0 | fill in spending from a bank or card statement file |
| 22 | `features/compare.js` | 186 | 11 | 5 | 0 | Side by side |
| 23 | `features/quick.js` | 256 | 11 | 2 | 0 | Quick math |
| 24 | `features/reveal.js` | 240 | 8 | 2 | 0 | Meet your character |
| 25 | `features/moneylog.js` | 244 | 11 | 5 | 0 | two small things about people and records |
| 26 | `features/drills.js` | 446 | 14 | 8 | 0 | four things for the hard days |
| 27 | `features/gig.js` | 377 | 23 | 9 | 0 | Working for yourself |
| 28 | `features/know.js` | 191 | 10 | 6 | 0 | What you already know |
| 29 | `features/fair.js` | 257 | 11 | 6 | 0 | Sharing costs fairly |
| 30 | `features/values.js` | 202 | 6 | 8 | 0 | Is my money going where I want? Three short steps, all taps |
| 31 | `features/missions.js` | 339 | 11 | 4 | 0 | The mission board |
| 32 | `features/connect.js` | 365 | 19 | 10 | 0 | How it all connects |
| 33 | `features/house.js` | 485 | 15 | 9 | 0 | Our household |
| 34 | `features/back.js` | 266 | 14 | 3 | 0 | The welcome-back card |
| 35 | `features/lever.js` | 550 | 15 | 7 | 0 | Which lever matters most |
| 36 | `features/mult.js` | 411 | 13 | 9 | 0 | The multipliers board |
| 37 | `features/ask.js` | 420 | 8 | 4 | 0 | one small question at a time |
| 38 | `features/ask2.js` | 376 | 9 | 5 | 0 | the same one-small-question pattern as ask.js, carried to the next three places people get asked things |
| 39 | `features/sign.js` | 238 | 5 | 3 | 0 | Before you sign |
| 40 | `features/owed.js` | 115 | 4 | 3 | 0 | What each debt costs you |
| 41 | `features/study.js` | 492 | 13 | 5 | 0 | Student loan plans, side by side |
| 42 | `features/together.js` | 200 | 7 | 4 | 0 | the Money Chart for more than two |
| 43 | `features/people.js` | 307 | 7 | 4 | 0 | Your people, one layer at a time |
| 44 | `features/fold.js` | 54 | 4 | 2 | 0 | one list on Next Steps |
| 45 | `screens/nav.js` | 470 | 13 | 2 | 0 | the same four things on every screen |
| 46 | `features/home.js` | 132 | 4 | 0 | 0 | put the game on your home screen |
| 47 | `screens/tidy.js` | 163 | 10 | 3 | 0 | the fixes from the usability audit, applied to every screen at once instead of one screen at a time |
| 48 | `account/addon.js` | 610 | 31 | 6 | 0 | extras, part two |
| 49 | `features/fork.js` | 583 | 20 | 13 | 0 | Fork Theory |
| 50 | `features/csp.js` | 715 | 25 | 12 | 0 | two ways to see a whole month of money at a glance |
| 51 | `features/ideas.js` | 1,097 | 20 | 5 | 0 | the workshop behind "Famous money ideas" |
| 52 | `features/ideas2.js` | 772 | 2 | 2 | 0 | Part 1, ideas 9 to 16 |
| 53 | `features/ideas3.js` | 1,095 | 1 | 1 | 0 | Part 2 |
| 54 | `features/ideas4.js` | 967 | 2 | 3 | 0 | Part 2 |
| 55 | `features/ideas5.js` | 1,297 | 2 | 0 | 0 | Part 2 |
| 56 | `features/roof.js` | 262 | 7 | 1 | 0 | one roof for the best-known ideas in personal finance |
| 57 | `features/ideasz.js` | 330 | 7 | 3 | 0 | loads after every ideas file |
| 58 | `features/dep.js` | 244 | 11 | 2 | 0 | "What depends on what" |
| 59 | `features/eras.js` | 1,055 | 25 | 6 | 0 | real steps for the later eras, and one account line that feeds back into the early ones |
| 60 | `features/testkit.js` | 311 | 9 | 8 | 0 | Test with a friend |
| 61 | `features/built.js` | 768 | 4 | 1 | 0 | What's built |

"Hidden errors" is the number of `catch` blocks that are empty. An empty block drops the error with no record.

## 2. Replaced functions

A replaced function is a function that a later file puts a new function in the place of. Before 2026-11-22 the game had 61 of these, in 113 places. Now each base function calls its parts by name. The target for this table is: no rows.

No rows: no function is replaced.

### Functions with two declarations

When two top-level functions have the same name, the one that the browser loads last wins, and the other one never runs. This is a defect each time. The target is: no rows.

| Function | Declared in |
|----------|-------------|
| `hsSheet` | `features/house.js`, `features/home.js` |

### Actions (ACT) that are set in more than one place

`ACT[name]` runs when the player taps a button with `data-a="name"`. 36 of 569 actions are set in more than one place. The last place wins. Most later places keep the earlier action, call it, and add to it. To read one action, read all places in its row, in order.

| Action | Set in (load order) | Places |
|--------|---------------------|-------:|
| `fsave` | `screens/ui.js`, `screens/ui.js`, `screens/ui.js`, `features/gig.js` | 4 |
| `metric` | `core/metrics.js`, `features/ask2.js`, `features/csp.js`, `features/roof.js` | 4 |
| `set` | `screens/ui.js`, `screens/ui.js`, `screens/ui.js`, `screens/smart.js` | 4 |
| `plock` | `screens/ui.js`, `screens/ui.js`, `screens/ui.js` | 3 |
| `pmoved` | `screens/ui.js`, `screens/ui.js`, `screens/ui.js` | 3 |
| `skilldone` | `screens/ui.js`, `screens/ui.js`, `features/connect.js` | 3 |
| `agedec` | `screens/ui.js`, `screens/smart.js` | 2 |
| `backup` | `screens/ui.js`, `account/cloud.js` | 2 |
| `creditsave` | `screens/ui.js`, `screens/ui.js` | 2 |
| `dbset` | `features/debts.js`, `features/ask2.js` | 2 |
| `dreveal` | `screens/ui.js`, `screens/ui.js` | 2 |
| `dsave` | `screens/ui.js`, `features/fork.js` | 2 |
| `flow` | `screens/ui.js`, `screens/ui.js` | 2 |
| `fog` | `features/games.js`, `features/know.js` | 2 |
| `fset` | `screens/ui.js`, `screens/ui.js` | 2 |
| `gplace` | `screens/ui.js`, `screens/ui.js` | 2 |
| `knans` | `core/metrics.js`, `features/ask2.js` | 2 |
| `mcans` | `features/chart.js`, `features/together.js` | 2 |
| `move` | `screens/ui.js`, `screens/ui.js` | 2 |
| `navback` | `screens/planner.js`, `screens/nav.js` | 2 |
| `navfwd` | `screens/planner.js`, `screens/nav.js` | 2 |
| `node` | `screens/ui.js`, `features/eras.js` | 2 |
| `pclear` | `screens/ui.js`, `screens/ui.js` | 2 |
| `people` | `screens/ui.js`, `account/cloud.js` | 2 |
| `prmyes` | `screens/profiles.js`, `account/cloud.js` | 2 |
| `rankup` | `screens/ui.js`, `screens/ui.js` | 2 |
| `rng` | `screens/ui.js`, `features/ask.js` | 2 |
| `rowsave` | `screens/ui.js`, `screens/ui.js` | 2 |
| `setn` | `screens/ui.js`, `screens/smart.js` | 2 |
| `sharpdone` | `screens/ui.js`, `features/ask2.js` | 2 |
| `shopen` | `screens/ui.js`, `features/ask.js` | 2 |
| `switch` | `screens/ui.js`, `screens/planner.js` | 2 |
| `tog` | `screens/ui.js`, `screens/smart.js` | 2 |
| `togb` | `screens/ui.js`, `screens/smart.js` | 2 |
| `wback` | `screens/ui.js`, `screens/smart.js` | 2 |
| `wnext` | `screens/ui.js`, `screens/smart.js` | 2 |

## 3. Functions with no caller

These names occur one time in the game source. A function can stay only when a comment above it starts with `NO CALLER IN THIS REPOSITORY` and gives the reason. Functions without that comment go to `game/unused/`. The target is: no function without a reason.

| Function | File | Reason to keep it |
|----------|------|-------------------|
| `igFree` | `features/ideas2.js` | Keep this function until the owner confirms that no add-on calls it. |
| `igYears` | `features/ideas.js` | Keep this function until the owner confirms that no add-on calls it. |
| `offDays` | `features/year.js` | Keep this function: it reads the off days from each calendar, and an add-on can call it. |
| `oxyRows` | `features/ideasz.js` | Keep this function: tests/t_ideas.js examines it, and an add-on can call it. |
