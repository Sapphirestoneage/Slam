# Find your era: the 60-second demo

Run CC-1, item 7 (Nov 27 2026). Made for the event of Nov 30 2026 in New York.

## What it is

- `index.html`: one small page. A visitor taps six or seven answers and sees one result: the era, one line on why, the first move, and one button, "Start my first move" (run 16). A small Back is under it, and Home is at the top of each screen. No typing, no account. Nothing is sent: the page makes no network request after it loads. While it loads it asks for the font of the game (Google Fonts), as the game does.
- `print.html`: one US Letter page with a QR code, to print and hand out. The QR code holds `https://play.stresslessaboutmoney.com/game/era/`.
- `era.js`: the screens of the page. It shows what `../features/erain.js` returns.
- `gamecopy.js`: a generated file. Do not edit it.
- `gamelook.css`: a generated file. Do not edit it. It is the look of the game (colors, font, buttons, chips, cards, the pulse): a copy of style lines of `game/index.html`. The page adds only its own layout.

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
- With all four answers of the entry, `erIn()` makes the profile and Home opens, with the first move of the demo as its top card (run 16). The landing does not ask for a second tap on Start (`doorFromDemo` in `account/door.js`). Every answer is a Guess on the profile, and the rest of setup shows it filled. With fewer answers, the entry opens at the first open question.
- The line at the foot: "No account. Nothing is sent. Your answers stay on this device." shows only when nobody is signed in on the device (`erSigned()` reads the two marks of the account code). A signed-in visitor reads that the answers save to the account at the start: the game saves them by its own save path.
- `erRead()` gives the answers and changes nothing. A flow that asks in a different order can call it.

## When something changes

| You changed | Run |
|---|---|
| `CB_RNG`, `CB_QS`, `cbRng`, `cbRows`, `cbLab` in couldbe.js, `lkK` in look.js, `money` or `esc` in ui.js | `node tools/game_era_build.mjs` |
| A color, the font, or the style of a button, a chip or a card in `game/index.html` | `node tools/game_era_build.mjs` |
| The address of the demo | Change `LINK` in `tools/qr_era.py` and the address in words in `print.html`, then `python3 tools/qr_era.py`, then `python3 tools/qr_era.py --check` |

`test/era-demo.test.js` fails when the copy or the QR picture is old.

## The form before a first call uses these questions

`../intake/index.html` (run CC-1, item 11) loads `era.js` and `../features/erain.js` of this folder. It sets `window.ERA_PAGE` first (`../intake/intake.js`): its own name, its own last screen, the mark of a lead in the text under `slam.era` (`lead: 1`), and the address of the last button (the game, with `?coach=1` when the page had it). With no `ERA_PAGE`, `era.js` is the demo, as before. A change of a question here changes the form too.
