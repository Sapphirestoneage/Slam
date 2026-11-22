# tools/game_walk: compare two copies of the game in a browser

Use this tool when you change the structure of the game code and the player must see no change. It proves that the old copy and the new copy behave the same.

This tool gave the proof for the work of 2026-11-22 (the merge of the layers, the folders, the headers, the version stamps).

## The four files

| File | What it does |
|------|--------------|
| `walk.cjs` | Loads one copy of the game in Chromium. Taps buttons at random with a fixed seed. After each tap it records one hash of the page text, the page marks, the saved data and the address. It also records each screen that the page draws while it loads, the result of some functions, and one tap on each action. |
| `cmp.cjs` | Compares two records. It prints `SAME`, or the first record that differs in each walk. |
| `shots.cjs` | Takes a screenshot of the first screen, of each tab and of each sheet of the menu, at 390, 1280 and 1440 wide. |
| `shotcmp.cjs` | Compares two folders of screenshots, byte for byte. |

`states/` has six saved games for the start of the walks. All persons in them are invented.

## Install (one time)

The tool needs the package `playwright`. It is not in `package.json`.

```
npm install --no-save playwright
npx playwright install chromium
```

## Compare the present code with an older commit

```
git worktree add /tmp/slam-old <commit>
S=tools/game_walk

node $S/walk.cjs --dir /tmp/slam-old/game --out /tmp/old.json --seeds 1-14 --states $S/states
node $S/walk.cjs --dir game --out /tmp/new.json --seeds 1-14 --states $S/states
node $S/cmp.cjs /tmp/old.json /tmp/new.json

node $S/walk.cjs --dir /tmp/slam-old/game --out /tmp/old-s.json --variant supa --seeds 301-308 --states $S/states
node $S/walk.cjs --dir game --out /tmp/new-s.json --variant supa --seeds 301-308 --states $S/states
node $S/cmp.cjs /tmp/old-s.json /tmp/new-s.json
```

`--variant supa` puts a stand-in for the Supabase library in the page. Thus the walk goes through sign-in and the save to the cloud, with no real database.

These 22 walks take about 4 minutes. They tap about 190 of the 560 actions. For more cover, use `--seeds 1-80 --steps 250` and `--seeds 301-340 --steps 250` (about 20 minutes, about 330 actions).

## Compare the look

```
node $S/shots.cjs --dir /tmp/slam-old/game --out /tmp/shots-old
node $S/shots.cjs --dir game --out /tmp/shots-new
node $S/shotcmp.cjs /tmp/shots-old /tmp/shots-new
```

Each run makes 342 screenshots. The screenshots of the multipliers board differ from run to run, because its coin moves all the time. `shotcmp.cjs` names them and does not count them as a failure.

## How to read a difference

`cmp.cjs` prints the seed and the number of the first record that differs. To see the page at that step, run `walk.cjs` again for that seed with `--dump <seed>:<step>` for each copy, and compare the two `.dump.html` files.

When you change a screen on purpose, the records differ. That is correct. Examine the first difference and make sure that it is the change that you made.

## Limits

- The tool does not examine the add-ons. Their source is private.
- The tool does not use the real database.
- A random walk does not reach each screen. The tests in `game/tests/` examine each feature directly.
- The record is a hash. It shows that two copies differ, and where. It does not show what is correct.
