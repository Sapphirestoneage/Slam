# Find your era: the 60-second demo

Run CC-1, item 7 (Nov 27 2026). Made for the event of Nov 30 2026 in New York.

## What it is

- `index.html`: one small page. A visitor taps six or seven answers and sees an era, one next move and the button "Start my full game". No typing, no account. Nothing is sent: the page makes no network request after it loads.
- `print.html`: one US Letter page with a QR code, to print and hand out. The QR code holds `https://play.stresslessaboutmoney.com/game/era/`.
- `era.js`: the screens of the page. It shows what `../features/erain.js` returns.
- `gamecopy.js`: a generated file. Do not edit it.

## The questions

1. How old are you? (the range chips of the game's entry)
2. About how much do you spend in a month? (the same)
3. If money stopped coming in, how long could your cash cover your bills? (one tap gives the two setup answers of the game: "a $1,000 surprise" and "how long")
4. Do you owe on any of these? (the debt kinds of the game; tap each, then Next)
5. About how much do you have invested? (the range chips of the game's entry)
6. About how much do you save or invest in a month? (the same)
7. How full are your tax-friendly accounts each year? (only with something invested)

## One era rule

The page loads `../core/engine.js`, the engine of the game. The era comes from `derive()`. The profile is made the way the game makes a new profile from the same taps: the rows of the entry (`cbRows`), the setup answers and `applyTypical()`. So the era on the page is the era that the game shows after "Start my full game". `game/tests/find-your-era-demo.js` compares the two for 324 answer sets.

The next move is the key step of the next era (the step of the engine with `gate: true`), or the gate of that era. It is not the "next win" of Home: that one needs the whole game (218 scripts), which is too heavy for a page that must open fast on a phone.

## How the answers come into the game

The button writes one text to the device storage, under the key `slam.era`:

```json
{ "v": 1, "at": "2026-11-27", "a": { "age": 2, "spend": 2, "inv": 3, "save": 3, "cush": "1 to 3 months", "debts": ["Credit card balance"], "tax": "some" } }
```

- `age`, `spend`, `inv`, `save`: the number of the range chip in `CB_RNG` (couldbe.js). No amount of money is stored.
- `cush`: `no1k` or one name of `COVER` (engine.js). `debts`: names of `DEBT_KINDS`. `tax`: `yes`, `some` or `no`.
- The game reads it in `erIn()` (`features/erain.js`), a part of `cbStart()` in `couldbe.js`. It runs for a new player only, one time, and removes the key. A text of a different version, or older than one day, is passed over. A part that this version does not know is left out.
- With all four answers of the entry, `erIn()` makes the profile and the flow goes on at "What it is". With fewer, the entry opens at the first open question.
- `erRead()` gives the answers and changes nothing. A flow that asks in a different order can call it.

## When something changes

| You changed | Run |
|---|---|
| `CB_RNG`, `CB_QS`, `cbRng`, `cbRows`, `cbLab` in couldbe.js, `lkK` in look.js, `money` or `esc` in ui.js | `node tools/game_era_build.mjs` |
| The address of the demo | Change `LINK` in `tools/qr_era.py` and the address in words in `print.html`, then `python3 tools/qr_era.py`, then `python3 tools/qr_era.py --check` |

`test/era-demo.test.js` fails when the copy or the QR picture is old.
