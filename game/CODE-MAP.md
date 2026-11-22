# SLAM the Game: code map

This file is generated. Do not edit it. Run `python3 tools/game_codemap.py`.

Date: 2026-11-22. Files: 60. Lines: 46,729. Top-level functions: 1062. Replaced functions: 15, in 15 places.

## 1. Files in load order

The browser loads the files in this order. A file can use all names from the files above it.

| # | File | Lines | Functions | Lines > 300 chars | Hidden errors | Purpose |
|---|------|------:|----------:|------------------:|--------------:|---------|
| 1 | `supa.js` | 558 | 15 | 2 | 16 | accounts when the game runs on its own website (GitHub Pages) instead of inside Claude |
| 2 | `skills.js` | 5,156 | 0 | 0 | 0 | data only |
| 3 | `skillthemes.js` | 2,712 | 0 | 0 | 0 | data only |
| 4 | `qr.js` | 5 | 0 | 1 | 0 | a small QR code generator from a third party, kept in one line |
| 5 | `engine.js` | 3,841 | 123 | 0 | 0 | SLAM the Game: engine |
| 6 | `engine2.js` | 378 | 14 | 0 | 0 | engine2: game mechanics that ARE the data entry |
| 7 | `gate.js` | 50 | 7 | 1 | 1 | extras, part one |
| 8 | `ui.js` | 6,466 | 214 | 136 | 2 | SLAM the Game: screens |
| 9 | `games.js` | 621 | 22 | 12 | 0 | the screens for the games that are the data entry |
| 10 | `games2.js` | 1,435 | 38 | 19 | 1 | Layer 2 (sorting), Layer 3 (sharpening), Layer 4 (coming back) |
| 11 | `year.js` | 765 | 23 | 13 | 0 | the year |
| 12 | `chart.js` | 1,291 | 13 | 6 | 0 | the Money Chart |
| 13 | `profiles.js` | 115 | 6 | 4 | 1 | flip between people |
| 14 | `smart.js` | 670 | 14 | 5 | 0 | every answer narrows what comes next |
| 15 | `planner.js` | 1,241 | 53 | 18 | 3 | Rocket Money style navigation (a bottom bar plus a menu for everything else), a study-planner calendar for money tasks, a before and after payday chec... |
| 16 | `cloud.js` | 433 | 17 | 1 | 13 | the game saves to your Claude account by itself, so it follows you from phone to laptop and survives the app clearing its storage |
| 17 | `ux.js` | 773 | 35 | 8 | 7 | walk-up-and-use |
| 18 | `metrics.js` | 1,825 | 26 | 10 | 0 | Key numbers |
| 19 | `debts.js` | 389 | 15 | 4 | 0 | finish the debt picture by tap (rate, monthly payment, card limit, how much it bugs you), then three payoff plans side by side |
| 20 | `import.js` | 268 | 6 | 9 | 0 | fill in spending from a bank or card statement file |
| 21 | `compare.js` | 183 | 11 | 5 | 0 | Side by side |
| 22 | `quick.js` | 256 | 11 | 2 | 0 | Quick math |
| 23 | `reveal.js` | 236 | 8 | 2 | 2 | Meet your character |
| 24 | `moneylog.js` | 238 | 11 | 5 | 3 | two small things about people and records |
| 25 | `drills.js` | 444 | 12 | 8 | 0 | four things for the hard days |
| 26 | `gig.js` | 379 | 22 | 9 | 0 | Working for yourself |
| 27 | `know.js` | 193 | 9 | 6 | 0 | What you already know |
| 28 | `fair.js` | 255 | 11 | 6 | 1 | Sharing costs fairly |
| 29 | `values.js` | 200 | 6 | 8 | 1 | Is my money going where I want? Three short steps, all taps |
| 30 | `missions.js` | 339 | 11 | 4 | 0 | The mission board |
| 31 | `connect.js` | 366 | 18 | 10 | 0 | How it all connects |
| 32 | `house.js` | 477 | 15 | 9 | 2 | Our household |
| 33 | `back.js` | 254 | 14 | 3 | 6 | The welcome-back card |
| 34 | `lever.js` | 550 | 15 | 7 | 0 | Which lever matters most |
| 35 | `mult.js` | 411 | 13 | 9 | 0 | The multipliers board |
| 36 | `ask.js` | 421 | 9 | 4 | 1 | one small question at a time |
| 37 | `ask2.js` | 376 | 9 | 5 | 0 | the same one-small-question pattern as ask.js, carried to the next three places people get asked things |
| 38 | `sign.js` | 234 | 5 | 3 | 2 | Before you sign |
| 39 | `owed.js` | 113 | 3 | 3 | 2 | What each debt costs you |
| 40 | `study.js` | 492 | 13 | 5 | 0 | Student loan plans, side by side |
| 41 | `together.js` | 198 | 7 | 4 | 1 | the Money Chart for more than two |
| 42 | `people.js` | 307 | 7 | 4 | 0 | Your people, one layer at a time |
| 43 | `fold.js` | 52 | 3 | 2 | 1 | one list on Next Steps |
| 44 | `nav.js` | 457 | 11 | 2 | 0 | the same four things on every screen |
| 45 | `home.js` | 119 | 4 | 0 | 5 | put the game on your home screen |
| 46 | `tidy.js` | 164 | 8 | 3 | 0 | the fixes from the usability audit, applied to every screen at once instead of one screen at a time |
| 47 | `addon.js` | 578 | 31 | 6 | 15 | extras, part two |
| 48 | `fork.js` | 573 | 20 | 13 | 5 | Fork Theory |
| 49 | `csp.js` | 707 | 24 | 12 | 1 | two ways to see a whole month of money at a glance |
| 50 | `ideas.js` | 1,094 | 20 | 5 | 1 | the workshop behind "Famous money ideas" |
| 51 | `ideas2.js` | 771 | 2 | 2 | 0 | Part 1, ideas 9 to 16 |
| 52 | `ideas3.js` | 1,095 | 1 | 1 | 0 | Part 2 |
| 53 | `ideas4.js` | 967 | 2 | 3 | 0 | Part 2 |
| 54 | `ideas5.js` | 1,297 | 2 | 0 | 0 | Part 2 |
| 55 | `roof.js` | 263 | 6 | 1 | 1 | one roof for the best-known ideas in personal finance |
| 56 | `ideasz.js` | 328 | 6 | 3 | 3 | loads after every ideas file |
| 57 | `dep.js` | 234 | 11 | 2 | 5 | "What depends on what" |
| 58 | `eras.js` | 1,043 | 25 | 6 | 6 | real steps for the later eras, and one account line that feeds back into the early ones |
| 59 | `testkit.js` | 307 | 9 | 8 | 2 | Test with a friend |
| 60 | `built.js` | 766 | 4 | 1 | 1 | What's built |

"Hidden errors" is the number of `catch (e) {}` blocks that drop an error with no message.

## 2. Replaced functions

Each row shows one function, the file that defines it, and the later files that replace it. Each later file keeps the earlier function and adds to its result. To read one screen, read all files in its row, in order.

| Function | Defined in | Replaced in (load order) | Layers |
|----------|------------|--------------------------|-------:|
| `cpMoves` | `compare.js` | `drills.js` | 1 |
| `cspMoneyRows` | `csp.js` | `roof.js` | 1 |
| `dbSheet` | `debts.js` | `owed.js` | 1 |
| `fdSheet` | `drills.js` | `ideasz.js` | 1 |
| `fogPct` | `engine2.js` | `know.js` | 1 |
| `gamesSheet` | `games2.js` | `year.js` | 1 |
| `ledRow` | `ui.js` | `smart.js` | 1 |
| `lootText` | `games2.js` | `import.js` | 1 |
| `menuSheet` | `planner.js` | `cloud.js` | 1 |
| `monthsAhead` | `ux.js` | `gig.js` | 1 |
| `nvRow` | `nav.js` | `tidy.js` | 1 |
| `nvText` | `nav.js` | `tidy.js` | 1 |
| `plReady` | `planner.js` | `fold.js` | 1 |
| `profStrip` | `profiles.js` | `planner.js` | 1 |
| `skillSheet` | `ui.js` | `connect.js` | 1 |

## 3. Functions with no caller

These names occur one time in the game source. Some are used only by the tests or by the private add-ons. Examine each one before removal.

`askNoneOk`, `cpAge`, `freeLine`, `igFree`, `igYears`, `offDays`, `oxyMask`, `oxyRows`, `payOrder`
