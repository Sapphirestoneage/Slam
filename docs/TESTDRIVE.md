# Test Drive

A way to test the self-serve journey without typing. Made-up people are kept as answer scripts: the answers a person
would tap, in order. Every answer is saved through the journey's own functions, so a script exercises the same code a
real person does. One script does three jobs.

## Turn it on

Open `start.html?dev=1` once. A slim Test Drive bar docks at the bottom and stays on that device until it is turned
off (the bar's own button, or `start.html?dev=0`). Nobody else sees it.

## What it does

- **Walk me through.** One step at a time. The thing that changed pulses, and a card says what happened, what
  changed (before and after), why (plain words, plus the rule's name in Tester wording), and a check where there is
  one. Back, Next and Flag this stay in reach. Step, Auto or Instant speed.
- **Load instantly, Start blank, Jump to a level.** Jump answers everything before that level and lands on it.
- **Flag this.** Two taps (what it is, how much it matters) and an optional note. The person, level, step, screen,
  numbers and screen width are filled in for you.
- **Issues.** The list, most serious first. Export as a spreadsheet (CSV), or copy one fix prompt made of the items
  marked "Breaks the task".
- **Snapshots.** Keeps the plan as it stands; opening one always opens a copy.
- Your own plan is never touched: a made-up person lives in a file of their own, removed by "Back to my own plan".

## The checks

- **By hand.** Net worth, what is left each month and what is owed, worked out by plain arithmetic in the script
  (`hand`, with the arithmetic in words), after the five questions and at the end.
- **Signed off.** The next step and the age work becomes optional, as the app said when the script was last signed
  off (`fixtures/testdrive-pins.json`). A change in the math shows as a difference. After agreeing with a change:
  `node tools/testdrive/pin.mjs`.

## The same scripts as tests

- `node --test` plays every person headless (`test/testdrive.test.js`) and fails on an unsaved answer, a level left
  open by mistake, a number that differs, or a level, skip, none button or the between-jobs path that no script
  reaches.
- `node tools/e2e/testdrive.cjs` (serve on 8830 first) walks every person in a browser at 1280 and 390: one thing
  pulses, it is in view above the dock, no sideways scroll, a clean console, nothing left behind.

## Adding a person

Add an entry to `PERSONAS` in `js/testdrive.js`: `about` starts with "Made up.", the steps in the order a person
answers, and the `hand` numbers with their arithmetic. Then `node tools/testdrive/pin.mjs` and `node --test`. Never a
real person's numbers: this file is public.
