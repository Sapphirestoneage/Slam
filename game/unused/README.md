# game/unused: code that nothing calls

The game does not load the files in this folder. `index.html` has no script tag for them. The tests do not read them.

`no-caller.js` contains five functions. On 2026-11-22 no line in the game source called them, and no test examined them. They were moved here so that a reviewer does not read code that never runs.

| Function | Came from | What it did |
|----------|-----------|-------------|
| `askNoneOk` | `ask.js` | Returned true when the player answered "none" for one question key. |
| `cpAge` | `compare.js` | Changed a number of months to an age with one decimal. |
| `freeLine` | `ux.js` | Made one "Free to spend" row for the home screen. |
| `moveSheet` | `ui.js` | Made an early "Log a money move" sheet. A later sheet took its place. |
| `payOrder` | `ui.js` | Returned the order of the buckets for an open sheet. |

## The private add-ons

The add-on source is not in this repository, so this repository cannot prove that no add-on calls these functions. If an add-on screen fails with "is not defined" for one of these names, put that function back.

## How to put a function back

1. Move the function to the file that its note names.
2. Run `npm run test:game`.
3. Run `python3 tools/game_codemap.py`.

## Rule

Do not add new code here. After the owner confirms that no add-on calls a function, remove that function from this folder.
