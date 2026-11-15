# The kit for a standalone tool

One page. Read it before building a new tool, with `DESIGN.md` for the look and `CLAUDE.md` for the house rules.
A standalone tool answers one question on one page. It opens with whatever the person already answered elsewhere,
and hands its answers to the next tool in the link.

## The shape of every tool

Top to bottom, always in this order:

1. **The question.** A hero card: the eyebrow "One thing, done right", the question as the `h1`, one sentence on why
   looking at it is worth a minute.
2. **The few inputs.** One card. Two or three boxes at most before an answer shows. Each box has amounts to tap
   under it (`numBox`), so nobody has to type. Choices are chips. No sentences to type, ever.
3. **The answer.** One hero card with `id="answer"` and `aria-live="polite"`: a soft lead-in, the answer in `st-big`,
   one bold sentence that says it in words with the numbers that made it. Before the inputs are in, the same card
   says "Your answer shows here".
4. **What changes it.** Inside the answer card: one or two rows of chips that move the answer (a trim, an extra
   payment). Each tap redraws the answer in place.
5. **More, folded.** `details.st-fold` for anything longer: the steps, the assumptions, where a rule comes from.
6. **Take it with you.** `carryCard(api)`: the button to the next tool, Copy my link, All the steps.

## The rules that keep tools the same

- **Math lives in `js/math` (or `js/solo.js` for a tool's own small function), with a test.** The page only shows what
  the math returns. Register a new formula in `js/registry/math.js`.
- **The second engine checks it.** Add the function to `tools/audit/cases.mjs` and work it out a second way in
  `tools/audit/engine2.py`. `node tools/audit/run.mjs` must end with "The two engines agree".
- **One pace.** Money grows by `(1 + realReturn) ** (1 / 12)` a month, the same as the plan (M53). Never `rate / 12`
  for investments. Debt interest is `apr / 12`, as lenders charge it.
- **Answers are the plan's answers.** Read with `onFile(doc, key)` and write with `answer(store, key, values)` from
  `js/journey.js`, so the number typed here is the number the whole plan uses. A choice that only matters on this page
  goes in `api.remember({ ... })`.
- **The address is the save.** `boot(id, draw)` from `js/solo/shell.js` opens the answers in the link and keeps the
  link up to date. Nothing else stores anything.
- **While typing, only the headline moves.** Redraw the whole card when the box is left, so the keyboard never jumps.
- **The next thing to do pulses** (`st-pulse`): the first empty box, then the Next button. One pulse on a page.
- **Words.** From the person's side. No verdict words, no red, no em dashes. A date beats a number of months; a
  sentence beats a table.
- **Fits at 390, 1280 and 1440.** Boxes in a row sit level. Run `node tools/e2e/layout.cjs`.
- **Credit the idea.** Where a tool comes from a book, a show or a person, say whose it is in the fold.

## Adding one

1. Copy `tools/template/tool.html` to `<name>.html` in the repo's top folder and `tools/template/tool.js` to
   `js/solo/<name>.js`. Change the three places marked `CHANGE`.
2. Write the math function and its test first. Then the page.
3. Add the tool to `SOLO` in `js/solo.js` (its place in the chain, its `next`), and to `USES` (which of the plan's
   answers it reads).
4. Add it to the layout check's screens, to the second engine, and to its run in `ROADMAP.md`.
5. A Krug walk before it ships: three real tasks, said out loud, on a phone width. Fix what trips.
