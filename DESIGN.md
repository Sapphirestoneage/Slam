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
