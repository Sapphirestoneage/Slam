# SLAM the Game: code map

This file is generated. Do not edit it. Run `python3 tools/game_codemap.py`.

Date: 2026-11-22. Files: 61. Lines: 47,015. Top-level functions: 1092. Replaced functions: 0, in 0 places. Functions with two declarations: 1. Hidden errors: 0.

## 1. Files in load order

The browser loads the files in this order. A file can use all names from the files above it.

| # | File | Lines | Functions | Lines > 300 chars | Hidden errors | Purpose |
|---|------|------:|----------:|------------------:|--------------:|---------|
| 1 | `report.js` | 24 | 1 | 0 | 0 | One function, report(e, where), records each error that a catch block stops |
| 2 | `supa.js` | 592 | 15 | 2 | 0 | accounts when the game runs on its own website (GitHub Pages) instead of inside Claude |
| 3 | `skills.js` | 5,156 | 0 | 0 | 0 | data only |
| 4 | `skillthemes.js` | 2,712 | 0 | 0 | 0 | data only |
| 5 | `qr.js` | 5 | 0 | 1 | 0 | a small QR code generator from a third party, kept in one line |
| 6 | `engine.js` | 3,841 | 123 | 0 | 0 | SLAM the Game: engine |
| 7 | `engine2.js` | 381 | 14 | 0 | 0 | engine2: game mechanics that ARE the data entry |
| 8 | `gate.js` | 52 | 7 | 1 | 0 | extras, part one |
| 9 | `ui.js` | 6,456 | 211 | 135 | 0 | SLAM the Game: screens |
| 10 | `games.js` | 621 | 22 | 12 | 0 | the screens for the games that are the data entry |
| 11 | `games2.js` | 1,449 | 40 | 19 | 0 | Layer 2 (sorting), Layer 3 (sharpening), Layer 4 (coming back) |
| 12 | `year.js` | 765 | 24 | 13 | 0 | the year |
| 13 | `chart.js` | 1,291 | 13 | 6 | 0 | the Money Chart |
| 14 | `profiles.js` | 122 | 6 | 4 | 0 | flip between people |
| 15 | `smart.js` | 669 | 15 | 5 | 0 | every answer narrows what comes next |
| 16 | `planner.js` | 1,255 | 55 | 18 | 0 | Rocket Money style navigation (a bottom bar plus a menu for everything else), a study-planner calendar for money tasks, a before and after payday chec... |
| 17 | `cloud.js` | 457 | 18 | 1 | 0 | the game saves to your Claude account by itself, so it follows you from phone to laptop and survives the app clearing its storage |
| 18 | `ux.js` | 793 | 36 | 8 | 0 | walk-up-and-use |
| 19 | `metrics.js` | 1,825 | 26 | 10 | 0 | Key numbers |
| 20 | `debts.js` | 395 | 16 | 4 | 0 | finish the debt picture by tap (rate, monthly payment, card limit, how much it bugs you), then three payoff plans side by side |
| 21 | `import.js` | 263 | 7 | 9 | 0 | fill in spending from a bank or card statement file |
| 22 | `compare.js` | 189 | 12 | 5 | 0 | Side by side |
| 23 | `quick.js` | 256 | 11 | 2 | 0 | Quick math |
| 24 | `reveal.js` | 240 | 8 | 2 | 0 | Meet your character |
| 25 | `moneylog.js` | 244 | 11 | 5 | 0 | two small things about people and records |
| 26 | `drills.js` | 446 | 14 | 8 | 0 | four things for the hard days |
| 27 | `gig.js` | 377 | 23 | 9 | 0 | Working for yourself |
| 28 | `know.js` | 191 | 10 | 6 | 0 | What you already know |
| 29 | `fair.js` | 257 | 11 | 6 | 0 | Sharing costs fairly |
| 30 | `values.js` | 202 | 6 | 8 | 0 | Is my money going where I want? Three short steps, all taps |
| 31 | `missions.js` | 339 | 11 | 4 | 0 | The mission board |
| 32 | `connect.js` | 365 | 19 | 10 | 0 | How it all connects |
| 33 | `house.js` | 485 | 15 | 9 | 0 | Our household |
| 34 | `back.js` | 266 | 14 | 3 | 0 | The welcome-back card |
| 35 | `lever.js` | 550 | 15 | 7 | 0 | Which lever matters most |
| 36 | `mult.js` | 411 | 13 | 9 | 0 | The multipliers board |
| 37 | `ask.js` | 423 | 9 | 4 | 0 | one small question at a time |
| 38 | `ask2.js` | 376 | 9 | 5 | 0 | the same one-small-question pattern as ask.js, carried to the next three places people get asked things |
| 39 | `sign.js` | 238 | 5 | 3 | 0 | Before you sign |
| 40 | `owed.js` | 115 | 4 | 3 | 0 | What each debt costs you |
| 41 | `study.js` | 492 | 13 | 5 | 0 | Student loan plans, side by side |
| 42 | `together.js` | 200 | 7 | 4 | 0 | the Money Chart for more than two |
| 43 | `people.js` | 307 | 7 | 4 | 0 | Your people, one layer at a time |
| 44 | `fold.js` | 54 | 4 | 2 | 0 | one list on Next Steps |
| 45 | `nav.js` | 470 | 13 | 2 | 0 | the same four things on every screen |
| 46 | `home.js` | 132 | 4 | 0 | 0 | put the game on your home screen |
| 47 | `tidy.js` | 163 | 10 | 3 | 0 | the fixes from the usability audit, applied to every screen at once instead of one screen at a time |
| 48 | `addon.js` | 610 | 31 | 6 | 0 | extras, part two |
| 49 | `fork.js` | 583 | 20 | 13 | 0 | Fork Theory |
| 50 | `csp.js` | 715 | 25 | 12 | 0 | two ways to see a whole month of money at a glance |
| 51 | `ideas.js` | 1,096 | 20 | 5 | 0 | the workshop behind "Famous money ideas" |
| 52 | `ideas2.js` | 771 | 2 | 2 | 0 | Part 1, ideas 9 to 16 |
| 53 | `ideas3.js` | 1,095 | 1 | 1 | 0 | Part 2 |
| 54 | `ideas4.js` | 967 | 2 | 3 | 0 | Part 2 |
| 55 | `ideas5.js` | 1,297 | 2 | 0 | 0 | Part 2 |
| 56 | `roof.js` | 262 | 7 | 1 | 0 | one roof for the best-known ideas in personal finance |
| 57 | `ideasz.js` | 329 | 7 | 3 | 0 | loads after every ideas file |
| 58 | `dep.js` | 244 | 11 | 2 | 0 | "What depends on what" |
| 59 | `eras.js` | 1,055 | 25 | 6 | 0 | real steps for the later eras, and one account line that feeds back into the early ones |
| 60 | `testkit.js` | 311 | 9 | 8 | 0 | Test with a friend |
| 61 | `built.js` | 768 | 4 | 1 | 0 | What's built |

"Hidden errors" is the number of `catch` blocks that are empty. An empty block drops the error with no record.

## 2. Replaced functions

A replaced function is a function that a later file puts a new function in the place of. Before 2026-11-22 the game had 61 of these, in 113 places. Now each base function calls its parts by name. The target for this table is: no rows.

No rows: no function is replaced.

### Functions with two declarations

When two top-level functions have the same name, the one that the browser loads last wins, and the other one never runs. This is a defect each time. The target is: no rows.

| Function | Declared in |
|----------|-------------|
| `hsSheet` | `house.js`, `home.js` |

### Actions (ACT) that are set in more than one place

`ACT[name]` runs when the player taps a button with `data-a="name"`. 36 of 569 actions are set in more than one place. The last place wins. Most later places keep the earlier action, call it, and add to it. To read one action, read all places in its row, in order.

| Action | Set in (load order) | Places |
|--------|---------------------|-------:|
| `fsave` | `ui.js`, `ui.js`, `ui.js`, `gig.js` | 4 |
| `metric` | `metrics.js`, `ask2.js`, `csp.js`, `roof.js` | 4 |
| `set` | `ui.js`, `ui.js`, `ui.js`, `smart.js` | 4 |
| `plock` | `ui.js`, `ui.js`, `ui.js` | 3 |
| `pmoved` | `ui.js`, `ui.js`, `ui.js` | 3 |
| `skilldone` | `ui.js`, `ui.js`, `connect.js` | 3 |
| `agedec` | `ui.js`, `smart.js` | 2 |
| `backup` | `ui.js`, `cloud.js` | 2 |
| `creditsave` | `ui.js`, `ui.js` | 2 |
| `dbset` | `debts.js`, `ask2.js` | 2 |
| `dreveal` | `ui.js`, `ui.js` | 2 |
| `dsave` | `ui.js`, `fork.js` | 2 |
| `flow` | `ui.js`, `ui.js` | 2 |
| `fog` | `games.js`, `know.js` | 2 |
| `fset` | `ui.js`, `ui.js` | 2 |
| `gplace` | `ui.js`, `ui.js` | 2 |
| `knans` | `metrics.js`, `ask2.js` | 2 |
| `mcans` | `chart.js`, `together.js` | 2 |
| `move` | `ui.js`, `ui.js` | 2 |
| `navback` | `planner.js`, `nav.js` | 2 |
| `navfwd` | `planner.js`, `nav.js` | 2 |
| `node` | `ui.js`, `eras.js` | 2 |
| `pclear` | `ui.js`, `ui.js` | 2 |
| `people` | `ui.js`, `cloud.js` | 2 |
| `prmyes` | `profiles.js`, `cloud.js` | 2 |
| `rankup` | `ui.js`, `ui.js` | 2 |
| `rng` | `ui.js`, `ask.js` | 2 |
| `rowsave` | `ui.js`, `ui.js` | 2 |
| `setn` | `ui.js`, `smart.js` | 2 |
| `sharpdone` | `ui.js`, `ask2.js` | 2 |
| `shopen` | `ui.js`, `ask.js` | 2 |
| `switch` | `ui.js`, `planner.js` | 2 |
| `tog` | `ui.js`, `smart.js` | 2 |
| `togb` | `ui.js`, `smart.js` | 2 |
| `wback` | `ui.js`, `smart.js` | 2 |
| `wnext` | `ui.js`, `smart.js` | 2 |

## 3. Functions with no caller

These names occur one time in the game source. Some are used only by the tests or by the private add-ons. Examine each one before removal.

`askNoneOk`, `cpAge`, `freeLine`, `igFree`, `igYears`, `moveSheet`, `offDays`, `oxyRows`, `payOrder`
