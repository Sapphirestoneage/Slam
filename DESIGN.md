# How SLAM should look and behave

Read this before any UI work. Anything Eli has to say twice becomes a rule here plus a check in
`tools/e2e/layout.cjs`. A batch is not done until `node tools/e2e/layout.cjs` passes, or its remaining failures are
listed in the batch report.

## Reference apps

- Budgeting looks and behaves like YNAB: a clean table you can scan, an inspector side panel for editing, and timing
  said as one sentence ("monthly by the 1st").
- Bills and accounts look like Monarch.
- Planning looks like eMoney.
- Never like a bank website.
- Before a design call, check docs/BENCHMARK.md for how these apps do it.

## Reference: Tally (the north star for the look)

Eli picked the Tally personal finance app (tallyfi.app) on 2026-11-25 as the look SLAM heads toward, in SLAM's own
colors. Tally is a tracker; SLAM keeps its own brain (eras, next steps, the X-Ray) under this skin. These are rules:

- Surfaces: deep navy page, slightly lighter navy cards, thin low-contrast borders, rounded corners (about 12px), even
  padding. No gradients and no glow, except the pulse that says "tap here".
- One accent: SLAM sapphire (`--sap`) for things you can tap. Mint (`--good`) for progress and "good". Amber
  (`--warn`) for "needs attention". No red anywhere. Everything else is navy and muted text.
- Type: labels small, muted, uppercase, with letter spacing. The number is the hero: large, bold, tabular. One short
  caption under every screen title ("See where it goes", "A debt payoff plan", "Goals with progress").
- Page pattern: (1) title and caption, (2) a row of stat tiles (4 across at 1280 and wider, 2 by 2 at 390): a label,
  a big number, a small line under it, sometimes a tiny sparkline, (3) one hero card with the main chart, (4) the
  other cards in a priority grid (1 top left and biggest, 2 top right, 3 bottom left, 4 bottom right). Each card
  answers one question.
- Charts: grouped bars (income and spending by month), area or line (net worth or a balance over time), a donut with
  a legend list (where it goes, the mix), progress bars on goal cards, a day strip for the pay period, list rows with
  small due-date pills. All of them come from the kit in `game/screens/dash.js`. No chart library.
- Goal card: an icon, the name, the target date, a progress bar with the percent, the amount saved of the target, one
  line "Strategy: $X a month", and the Time-Money dial when it is open.
- Pay period: a day strip across the top, "Bills left this period" with due pills and amounts, "Money coming in".
- Sliders only for exploring a what-if, never to enter a real number. Every what-if slider is a Time-Money dial.

### The Time-Money dial

Time and money are the two linked sides of every what-if. The dial has two tracks, one over the other: "Done in"
(time) and "Extra each month" (money). Move one and the other moves: more money brings the date closer, a closer date
asks for more money. The chart and the interest (or the goal progress) change while you drag.

- Snap marks on both tracks, each one also a button: time (Current pace, 3 mo, 6 mo, 1 yr, 2 yr, 3 yr, and the
  player's own goal date if set); money (+$25, +$50, +$100, +$250, +$500, All my free-to-spend). Dragging between
  marks works; within a few pixels of a mark it snaps. At 390 wide no mark label overlaps or is cut off.
- A mark that is out of reach stays, faded, with the trade-off in one line ("needs $640 a month, $210 more than your
  free-to-spend"). Never a flat no.
- One sentence under the dial: "Pay $X more a month and you're done in [month year], N months sooner, saving $Y in
  interest."
- The math is in the math layer (the payoff run forward, and the reverse: a date to the extra a month it needs). The
  dial only shows what the math returns. It is built once, `timeMoneyDial()`, and used on Debt payoff and on goals.

## Rule zero (Eli's brief)

The rule is easy; the flexibility is depth. Every screen opens at the simplest useful level (a gut number, a category
total, Fast Track) and goes one level deeper only where this client's situation needs it. Flexibility comes from
structure (levels, About you switches that add or remove whole sections, side panels, Gut / Rough / Know it / Will get
it), never from more choices on the same screen.

Test: two standard clients. Alexis (avoids money, about $400 in checking, card debt, one W-2 job) and Tom (CPA, RSUs, a
rental, HSA, backdoor Roth). Both must get through a first session in about the same time. If Alexis sees a field she
does not need, it failed "easy". If Tom needs a workaround to enter something, it failed "flexible".

Checked by: by eye (a think-aloud run with both clients).

## The repeat offenders

1. Boxes in a row sit level. Helper text goes under a box and never pushes it out of line with its neighbors.
   Checked by: `level`
   1b. Down a column, the same kind of control lines up: in a table or a list of repeated rows, every amount box,
   dropdown, status pill and row button starts and ends at the same place on every row (within 2px). What a box reads
   from ("$1,770 from the lines", "From Debt") sits beside it in its own column, or under it on a phone, never in the
   box's cell where it shoves the box over. A one-tap Use button goes before the box, not after it. Each status pill and
   each Details button is one width.
   Checked by: `column`
   1c. Rows breathe: at least 6px between the controls of two adjacent rows.
   Checked by: `cramped`
2. No clipped text: labels, placeholders, select values and buttons show in full.
   Checked by: `clipped`
3. No sideways scroll or overflow at 1440, 1280 and 390, light and dark.
   Checked by: `overflow`
4. Nothing covers anything: popups, toasts and bars never sit over headers, buttons or content they do not belong to.
   A sticky header or footer never sits over a row's controls: a list's totals row ends the list where the list ends
   (it is not sticky), and a sticky header rides flush under the top bars.
   Checked by: `covered`, `sticky`
5. Never ask for something with no box to fill: every What's missing item, checklist item, homework line and nudge
   lands on a fillable control.
   Checked by: `askable` (What's missing, the counters and the arrive toast; homework lines and nudges by eye)
6. A guess never looks like a real number, and a check mark only counts real numbers.
   Checked by: by eye
7. One question, one answer: no two numbers or two names for the same thing.
   Checked by: by eye
8. Clickable things look clickable and nothing else does. A button with no words has a name and a hover tip, and its
   picture is one everyone reads the same way (..., the X, arrows, the gear, search, info, plus, minus, the bin, undo);
   any other picture says what it does in words ("Client view", "Clear all", "Will get it").
   Checked by: `unlabeled` (the rest by eye)
9. Slim and collapsed by default; popups close on a click elsewhere; the page does not jump.
   Checked by: by eye
10. Plain words; explanations in hover tips, not in plain view.
    Checked by: by eye (`level` catches long helper text that pushes a box down)
11. If it can be a tap, it is a tap: no typing sentences, as little typing of numbers as possible (chips, quick picks,
    faded typical amounts with one-click Use).
    Checked by: by eye
