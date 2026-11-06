# Progress

One line per build phase.

- Phase 0 Setup: done (built locally; GitHub would not let Claude create the repo, so nothing is pushed yet). .gitignore first, spec/csv (22 tabs), Node test runner, fixtures/demo.json, private fixture script (skips when the file is missing), BACKLOG.md (phases 4 to 7: 33, 27, 9, 5 rows; none for 8). QA: spec/csv one file per tab; .gitignore lists fixtures/*.local.json; no private file tracked (tested).
- Phase 1 Records and storage: done. One record type (js/records.js), dated history on every change including undo, undo and redo over add, edit, delete, reset, status and bulk, snapshots and change since last session, versioned export and import (snapshot first), backup reminder, autosave within 1 second with Unsaved on failure (js/storage.js). QA: 16 record and storage tests pass.
- Phase 2 Math engine: done. Every Math tab formula (M01 to M61) as a pure function in js/math/, each returning the value, what it still needs, a Guess flag and the formula in plain words for Show the math; the time view with the take-home / 173 Guess. QA: Demo client 14 of 14 within $1 or 1 month; private Test client 15 of 15 when the file is present (skips with a message when not); 37 tests pass.
- Phase 3 Staples: done. staples.html shows all 25 Staples tab pieces and the Polish rules (icons, summary strip, right-aligned numbers, payoff bars, status symbols, area colors, progress, input borders, saved flash, sticky headers and totals, Show the math, change since last session, keyboard hints, density, client view, group headers, print styles) on the Demo client, light and dark. QA: every staple present; buttons look like buttons; rows share one center line; the time toggle changes every amount; no console errors. Checked against the Look and feel tab only: the Look Preview file was not provided (QUESTIONS 1).
- Phase 4 Shell and navigation: done. index.html: sticky top bar (SLAM, client switcher with New client and Try with example numbers, breadcrumb, Saved; the five tabs; Find with /, quick add, parking lot with filing to a field, undo, redo, $ / Hours / FI days, client view, gear), sub-tabs with area dots and progress, backup reminder, autosave, export, import, reset client, snapshots, density and theme. Every screen shows its empty state. QA: trunk test passes on all 23 screens light and dark (site, client, page, sections, search visible); nothing shows $0; no console errors; fits at 1440 and 1280. Fixed on the way: Enter in quick add was also pressing Add it; long breadcrumbs ran into the tabs.
- Screenshots: taken with the Playwright Chromium in the build container. The sandbox blocks the ECharts CDN, so the screenshot script served the same ECharts 5.5.1 file locally; the published page loads it from cdnjs.
- Spec refresh (Oct 28): new spec and spec/SLAM Look Preview.html added; CSVs re-exported. Top bar already had the 8 tools; "Not sure" APR already used the Federal Reserve rate as a Guess; surplus already counted as invested. Changed: total interest shows only the formula (the simulation stays for payoff order); Coast FI uses the FI target age, else Retire by, else 60; the "These are big deals" card swaps the inflation row for spending minus 10%, as is, plus 10% (inflation is display only). QA: 44 tests pass; Demo client 14 of 14 and Test client 15 of 15.
- Phase 5 My Money: done. Profile with Why now, the gates hub (car, kids, pets, housing, work, HSA, FSA, equity pay, couple), About you, Work and home, the accounts gate with a count per type that makes the rows (R001 to R003), and the couples split (js/gates.js, js/ui/profile.js). Income: take-home or gross, the other worked out and marked Computed (R046), pay frequency, employer fields gated by work situation, HSA/FSA and equity pay by the hub, variable income block for self-employed or mixed, unemployment and runway when between jobs, Other benefits. Debt: per-type detail behind More (card Minimum / Custom / In full, promo, due day, limit; student Federal or Private with plan and PSLF; car loan and mortgage linked to their asset; the fields unique to each other type, payday fee as an APR), payoff order Avalanche / Snowball / Stress. Assets: cash, investments (Pretax / Roth / Both with two balances, contributions and limit used, type-only fields) and home or car with Paid off / Financed; the loan is the same record as on Debt (R049). Protection: coverage rows, gaps, premiums, the usual list in one click. Taxes: filing status (Coach infers until picked), effective and marginal rate, last year, quarterly and SE tax for 1099. Core and full-detail bars on every sub-tab (R065). Fast Track as a mode: 8 questions, totals by area, one undo step, every lens on, its numbers kept and the gap shown on Coach tools (R068, R069, R132). One page shows every section top to bottom. Visuals panel on Income (gross to take-home, DRAFTT), Assets (by type, how fast you can reach it, Rule of 5, contribution limits), Debt and Taxes. Fixed on the way: New client could not be created with a mouse (a closed box's click-outside listener closed the next box). Also brought home the artifact's Oct 29 fixes (Paid with, toggles, dark theme, top bar, Unemployment) and added tools/artifact.mjs, which builds the SLAM for Eli page from this repo. QA: 58 tests pass (Demo client 14 of 14, Test client 15 of 15); a new client goes through Fast Track with every lens on; car No hides car lines and car Yes brings them back; Debt off removes the sub-tab and the debts from net worth; the car loan shows on Assets and Debt; no console errors and no sideways scroll on all 23 screens at 390, 900, 1000, 1100 and 1280px, light and dark.
- Phase 6 Spending: done. js/month.js is the month model: what lands on the calendar (paychecks by frequency, bills on their due day or spread by week, debts on their due day, yearly costs in their month, events, typed entries with repeats, wins from payoffs and milestones), marks (Planned, Partial, Got it / Paid, Didn't happen, Moved), the running balance chained month to month, and the five passes per month (Gut, Basics, Rough, Estimate from Rough, Actual from the calendar or typed), close with carry. Budget: pass toggle, month stepper, group by DRAFTT or category, cash or accrual, which spending the math uses, Paid with column when most spending is on cards (R102), fixed and variable totals with % of take-home and the floor (R146, R147), per paycheck, Keep / Not for me / Delete on each guess, savings suggestions by fixed or variable (R143, R144), irregular and yearly costs with Walk the list, amount and timing grid and DRAFTT charts; a card lists the bills on it (R103). Calendar: month grid (a day list on phones), filters, count maybe, starting balance and low line, bonus paycheck months (R098), low balance warning (R096, also on Home), running balance chart, entry form, wins. Month-end close: actuals and gaps per month, review with biggest misses (variable first, R145), price went up (R141), carry, estimate vs actual chart, gut accuracy. QA: 9 month tests (plan, log and close for the Demo and the private Test client).
- Phase 7 Plan: done. js/plan.js: FI targets (Lean, Coast, Barista, Regular, Fat), milestone projections, solvers, Next 3 numbers (R071 to R073) and Guide me (R076). Goals: FI age or Just show me, FI date and number, solvers, return / inflation / withdrawal / pace presets, retirement spending, real or nominal, life expectancy, Social Security; These are big deals with click-to-use options; the FI ladder; milestones with projected dates (they also land on the calendar as wins). Timeline: save-more slider, pace, three-pace band, milestone flags; savings rate to years and crossover charts. Debt payoff: order, extra slider, promo ending within 60 days goes first with a warning (R075), stacked payoff chart with flags, orders compared. Next 12 months: events with a monthly set-aside, on the calendar. Scenarios stay later. QA: the Regular FI milestone matches the FI date for the Demo and Test clients.
- Phase 8 Report: done. Overview: net worth, liquid net worth, surplus, runway; metrics shelf (savings rate, biggest DRAFTT letter, debt-to-income, housing % with the 35% line, Rule of 5, tax rate, utilization, % to FI with Coast and Lean); net worth rings (total or liquid) with Savings / Investments / Real assets / Debts / About you tabs; cash flow Sankey; fixed vs variable and support received. Every metric's label links to its home. One-pager: key stats, to-dos from Will email, goals, strengths and struggles, do more and do less, Export PDF, Send summary, disclaimer (R182). History: net worth over time, snapshot table, gut accuracy, Wrapped after 12 months (R126).
- Phase 9 Home: done. Client strip (session n of 6, next date, status). Prep: Money in one line (each number opens its home), what changed, homework, due for a check, parking lot, low balance day, editable agenda, slim completion bar with By section. Live: agenda steps that tick themselves, Next step (Guide me), minutes left, Next 3 numbers with a box to fill #1 right there. Wrap-up: the four-item checklist, End session (R181), Send summary, money feeling 1 to 10.
- Phase 10 Coach tools and discovery: done. Revisit list with next check dates and Fix now; homework list with due dates and Send to client (copies a clean list); snapshots with Compare to any past one; private and shared notes; session length, sessions planned, client view, satisfaction; Fast Track accuracy; look settings. Discovery: name, take-home, rent, total debt, savings, goal, why now; Send to client file creates the client with each number Roughly and opens Home in Prep (R180). The pre-call form waits for a server (QUESTIONS 42).
- Phase 11 Dry run: automated. A fake session 1 runs end to end in a browser: discovery, Prep, Start session, Next 3 filled on Live, Next step, Budget, calendar, Goals, Overview, End session (snapshot, backup file), Send summary (copied text includes the disclaimer), next Prep, Coach tools, History; at 1440px light and dark and 390px. All 24 screens checked empty and with the Demo client at 390, 1000 and 1440px in light and dark: no console errors, no sideways scroll. 72 tests pass. Waiting on you: one real run-through, logging every "where do I put this" in QUESTIONS.md.
- Brandon beta batch (Nov 2 2026): logged in docs/backlog-brandon.md, every NOW item built. Section 1 Profile and intake: Next: Income once core is in or parked; I'll find it later on every Profile and Income field (and the row status) puts it on the Homework list with where to find it; pay frequency with its count; paydays (7th and 22nd) on the calendar; income as take-home, gross or both. Section 2 Accounts: allocation with a live 100% total and target drift, holdings feeding the allocation with overlap and concentration flags, goals with a price tag, growth and basis, details (tax treatment, access, fees in $, auto-invest, reinvest, beneficiary, owner, last 4, stale after 30 days), cash type apart from the bank with APY or 7-day yield, uninvested-cash alert, net worth check. Section 3: 401(k) Roth or traditional, per paycheck and % of salary, match tiers, vesting, vested vs unvested; HSA cash vs invested, self-directed vs managed fees. QA: 84 tests pass; no console errors and no sideways scroll on the touched screens at 1440 and 390px. The request was cut off in section 3 (QUESTIONS 44).
- Missed-ideas batch (Nov 2 2026): logged in docs/backlog-brandon.md (M1 to M10 NOW, ML.1 to ML.5 LATER); every NOW item built, one commit per section (4 and 5 together). Cards: statement day, autopay, rewards, utilization per card and overall, credit score. Profile › Benefits at work with the commuter nudge; employer HSA dollars count toward the limit. Taxes: refund or owed, W-4 basics, one flag. Plan › Next 12 months: Your year (events, yearly costs, card fees, the usual dates), Sinking funds (linked to purpose tags), Taking over. Home: net worth over time, closed; month-end close saves a snapshot. Protection › Life admin, Not yet on Homework. Community presets and maaser, off by default. Onboarding timer behind the gear and in the export. QA: 93 tests pass; no console errors and no sideways scroll on 14 screens at 1440 and 8 at 390px, with and without a client.
- Brandon batch, full copy (Nov 3 2026): sections 3 (rest) to 9 and the LATER list logged; every NOW item built, one commit per section. Income and the 401(k) fill each other in; take-home solves gross with the 401(k) % included. HSA progress and paychecks left to max; Roth IRA log by tax year. Protection as cash flow (per paycheck or month, Paid from, health in/out-of-network, disability, life). NY state and NYC tax in take-home and rates; refund history. Spending: who covers it, hidden Not for me, quarter, ranges, add a line per section, Dates, Other wants, Therapy apart, tags, trips, before-tax rule, full width. Fixed: yearly lines totalled as monthly; Actual pass edits took about 1.5 s (now about 0.1 s). Payday card on Home. Tooltips from js/glossary.js. Report this on every screen. QA: 102 tests pass; all 24 screens with no console errors and no sideways scroll at 1440 and 390px, with and without a client.

## Fix pass (Nov 3)

- 1 Stop the jumps: js/ui/place.js adds keepPlace(fn). Around app.render (same screen), every record list redraw and the chart panel redraw it saves and restores the window scroll, the scroll of every list (each .list-scroll has a stable data-scroll-key) and the focused control (data-focus now on buttons, icon buttons, toggle segments, status pickers, More carets, row checkboxes and group folds, scoped by row). If the row you were on leaves (Not for me, Delete), focus goes to the same control in the row below, at the same spot. In place, no redraw: row select, select all, row More open and close, group fold, Hide / Side / Below on the chart panel (moreBlock carets already were). The "N selected" bar lies over the header row, so the table does not move. Chart panel placement now starts from CSS by screen width, so the first paint never shifts the page. Closing a popover returns focus to the button that opened it. The global smooth scroll is gone; only Find and the One page jumps glide. Checked in Chromium at 1440: Budget with 43 lines scrolled halfway, checkbox, More, Fixed / Variable and Not for me keep the row within 1px and focus on the control (or the row that took its place); Profile Yes / No and Taxes Refund / Owed keep the window scroll exactly. Tests: test/place.test.js.
- 2 Click away closes everything: js/ui/dismiss.js is the one mechanism (one capture click listener and one Escape listener for the page). Popovers, row More panels and every moreBlock caret (What's missing, Settings for this budget, the Profile and Taxes Mores) register when they open. A click outside or Escape closes them; a click inside, or on what opened it, keeps it; a pick inside a popover keeps the panel it was opened from; Escape closes the popover first, then the panels. One row More per list (opening another closes the first). Nothing closes while you are typing in it: that click only ends the typing (and saves the box); the next click away closes it. A panel closing above the click does not move what you clicked. Focus that was inside a closing panel goes back to its caret. Tests: test/dismiss.test.js.
- 3 The budget fits: every record list (Spending lines, Irregular costs, Income, Benefits, Debt, Assets, Protection, Milestones) now has one row pattern: [checkbox], the columns, Status, More, and one "..." menu (Reset, Duplicate, Not for me or Bring back on spending lines, then Delete below a line). The trash can and Not for me buttons left the Amount column; Keep stays inline only on a Guess (in a fixed slot so amounts line up). Amount is and Date is moved into More (narrower than chips); Who pays is a dropdown there. Checkboxes show only after the Select button above the list (Done selecting turns them off and clears the pick). Spending groups start folded with their subtotal; open or closed is kept for the session (sessionStorage). Gut vs lines reads "$1,830 under" with "Lines are $1,830 under your gut number" under it. Checked in Chromium: no sideways scroll on the page or inside any list at 1280 and 1440 (chart below) on Budget Rough, Estimate and Actual, Income, Debt, Assets, with Select on and a More open.
- 4 Affordances: every button, toggle segment and chip is at least 32px tall (small buttons, tiny icon buttons, carets, status pickers, segments, calendar chips and "+N more", the day + buttons, Big deals options, linked tags, the top bar segments); controls inside list rows are 36px. Status ("Know it" with its arrow) has the same 2px border as other buttons. Show the math numbers keep their dotted underline and get a tinted hover, a solid underline and the pointer. Clear all now uses an eraser icon (Reset keeps the turn-back arrow); Reset never sits next to Delete: the row menu has Delete alone under a line, the bulk bar puts Delete at the far end, and Coach tools puts Delete client apart from Reset client. Checked in Chromium on all 22 screens at 1280: no control under its minimum, no sideways scroll.
- 5 Slimmer chrome: the backup banner row is gone; Saved in the top bar is a button with a small amber dot (coach only) when a backup is due, and clicking it opens Back up now. "Not saved yet" stays a banner. The page head under the sub-tabs is one slim line: the subtitle and any buttons (the title stays for screen readers, since the sub-tab already names the page). Top bar: no breadcrumb; Find and quick add are one box (typing finds fields, lines and screens; the last choice is "Add ..." and Enter on it adds, with Undo; / still jumps to it); $ / Hours / FI days is one small dropdown; the client name shows in full at 1440 (30 characters checked) and 19 characters at 1280. Toast: bottom left, 5 seconds, 10 with Undo.
- 6 Clean-ups: Plan > Goals has one control for the return, Pace: Optimistic 8%, Likely 7%, Pessimistic 6%, Hopeful 12% (the Return row is gone). Inflation is plain text ("2% a year, display only"); it can still be picked under More once Nominal is on, the one place it feeds a number. Solo or couple is asked once, under What applies to me (gone from About you). Home > Live: the current step says "You're here". Home Prep: the empty Next date reads as a hint like every other empty box. The Profile sub-tab shows a core count (for example 1/13) like Income, Debt and Assets. Found on the way and fixed: on Goals the FI card did not update when an assumption changed, and on Budget the Fixed / Variable / Gut vs lines strip did not follow the lines, because screens with a list never redraw; both now refresh in place.

Manual browser checks for this pass (the automated ones ran in Chromium; worth one human look):
1. Budget, Add the usual list, open the groups, scroll the list halfway: tick Select then a checkbox, open and close More, change Amount is inside More, use "..." then Not for me. The row stays put; focus stays on the control or the row that took its place.
2. Profile: scroll down, click Yes / No on Car and Pets; Taxes: open More, click Refund / Owed. The page does not move.
3. Open Settings for this budget, What's missing and a row More; click empty space, then press Escape: each closes. Type in a box inside a More and click away: it stays open once.
4. Top bar at 1280 and 1440: Find or add ("hsa" finds; "Netflix 15 a month", Enter on Add adds with Undo); $ / Hours / FI days dropdown; the amber dot on Saved opens Back up now.
5. Dark theme: the same screens, looking for any control that lost its border.
- Merge with main (Brandon and missed-ideas batches): main had already replaced the 7-button Who pays with "Who covers it" (Covered by me / someone else / Not for me / Other); its top choice is now the dropdown, and the short "All mine / Split evenly / My share" follow-up stays a toggle. The new group "Add a line" button, group labels, the homework-aware row edit, named More blocks and the NYC question all sit inside the fix-pass structure; Solo or couple is still asked only once; live() cards redraw inside keepPlace. Re-checked in Chromium after the merge: the jumps, click-away, hit-area, fit and phone checks above all still pass; 113 tests pass.

## Reorganize pass (Nov 3): Net worth vs Cash flow

- 0 Merges: PR #4 (fix pass 1 to 6) merged into main with a merge commit once GitHub showed it clean (the reorganize commits that had sat on its branch were reverted there first and come back here). The phone branch (claude/youthful-darwin-qjerhn) is not merged: it was built on the Phase 11 code and fights the fix pass. It brings back the breadcrumb (fix pass 5 removed it), replaces the amber backup dot on Saved with a floating toast and dots on Tools and the gear, its phone Find button opens the old Find overlay (now the Find or add box, hidden on phones there), and its Tools sheet uses the old quick add and the $ / Hours / FI days toggle. Fitting it in is a redesign of the phone chrome, not a merge (QUESTIONS 86).

- 1 Reorganize: the main tabs are Home, Net worth, Cash flow, Plan, Report (the DATING spine: Debt + Assets = Net worth; Taxes + Income + Needs = Cash flow; Goals = Plan). Home: About you (the Profile, first stop; the gates hub works as before), Prep, Live, Wrap-up. Net worth: Assets, Debt, Protection, under a headline of total net worth, liquid net worth, total assets and total debt (the Assets and Debt strips dropped their copies of those). Cash flow: Income, Taxes, Budget, Calendar, Month-end close, in waterfall order, under a headline waterfall: gross, minus taxes, minus before-tax savings, = take-home, minus fixed, minus variable (or the gut number), minus savings, = free; every step is a Show the math button and the rows always add up. Old routes (#/my-money/..., #/spending/...) and old Lives on text redirect to the new homes (js/nav.js MOVED), so bookmarks, Find and every number's link keep working. Every Lives on in data/fields.json and the spec's Fields tab moved; the Navigation and Screens tabs describe the new tabs (xlsx edited, csv rebuilt with tools/xlsx_to_csv.py). Find, quick add sections, sub-tab counts (About you, Income, Debt, Assets, Budget) and One page follow: Net worth and Cash flow each have their own One page and Fast Track button. Fixed on the way: at 390px a list header with Add the usual list, Select and Clear all ran off the screen; it wraps now. Checks: nav tests for the tabs, the waterfall order and every redirect; the fix pass browser checks re-run on the new tabs (no jumps, click away closes, no sideways scroll at 1440, 1280, 390).
- 2 Enter once, show in both: js/math/linked.js. Each debt with a payment (a card paid in full is already spending) shows on Cash flow › Budget as a line in the Debt letter, marked From Debt: no box to type in, its number and its row open the debt on Net worth, and the Debt row's More has "Payment on the Budget" the other way. These lines are in spending, the Budget strip's Fixed, the waterfall and the payday card, so debt payments are no longer added on the side. Premiums keep Brandon section 4's two homes: Paid from the paycheck (already out of take-home) or their own linked Budget line, whose amount is now a "From Health" (or Renters, Car...) button that opens the coverage row. Contributions to a Roth IRA, IRA, brokerage, 529 or an HSA paid on its own are savings in the Cash flow waterfall; a 401(k) and payroll HSA stay before-tax savings from Income. A typed Budget line that repeats a debt payment (the Debt letter, or a payment-sounding name sharing a word or the amount) or a premium the paycheck or a linked line already pays gets one note under it: "Looks like the same payment: keep one", with Keep the one from Debt (removes the typed line, with Undo) or They're different. Until someone picks it counts as $0 in every total, the Budget strip, the waterfall, the month view and the calendar. Debt sections take no "Add a line" (debts are added on Net worth). Tests: test/reorganize.test.js.
- 3 Brandon answers: 1) multi-tier match and 5) dates and Other wants: no change. 2) NY: the 2026 single brackets match NY Tax Law 601(c)(1)(vii); the 2027 to 2032 schedule and the recapture over about $107k AGI are logged LATER (BL.22, BL.23); Taxes says "NY joint brackets / NYC rates: not yet confirmed against the law" when they apply (BL.24), and the reference data says the same. 3) The headline savings rate counts the 401(k) and HSA money from the paycheck and the employer match (from the match tiers on Income or the 401(k)); surplus over take-home is its second line on Home, Income and Report; the spec's Math M28 row is updated. 4) The Health coverage row owns the premium: paid from the paycheck, the main job borrows it ("From Health", a button to the row) and a premium typed on Income is set aside; Protection's Health row shows "Your paycheck borrows it" instead of a Budget line; a linked or typed Budget line for it is flagged and not counted; paid as a Budget line, nothing comes out of the paycheck. The waterfall reads "Taxes and premiums" when premiums come from the paycheck. 6) The payday card takes monthly savings-goal and sinking-fund amounts out of free to spend as "Free after savings", per paycheck and per month (js/payday.js setAsideOf); the Cash flow waterfall counts them as Savings. Tests: test/reorganize.test.js (headline savings rate, health premium once, Free after savings); math and Brandon tests moved to the new headline.

## Polish pass (Nov 3)

- 1 One sureness system: every number's status button says Know it, Rough or Missing on its face (a blank core number reads Missing). Its menu groups the finer statuses: Rough holds Roughly and Guess; Missing holds Not now and I'll find it later; Not for me (hide it) and Clear sit under a line. The bulk bar's Set status uses the same menu. Display only (records.js sureOf): stored statuses, completion bars and Next 3 are unchanged. Test: test/polish.test.js.
- 2 Budget passes down to two: the pass toggle is Plan and Actual, with the month stepper on both. Plan has the gut number as one money box at the top with "Lines are $X under (or over) your gut number" under it (now counting the debt payments From Debt, the same as the strip), the lines with their usual Amount and this month's Plan (a blank Plan uses the usual number), and the old Basics totals behind "Fast Track totals (by area)". Actual shows Plan, Actual and Difference ("As planned" fills an actual in one tap). Month-end close reads Plan vs actual. Rough is no longer a pass; Roughly lines keep their status. Stored data (passes, estimates) is unchanged, so the numbers are too.
- 3 Tab rename and regroup: the tabs are Home, Net worth, Cash flow, Plan, Report (reorganize pass). Kept the Nov 3 sub-tabs (About you first in Home; Net worth: Assets, Debt, Protection; Cash flow: Income, Taxes, Budget, Calendar, Month-end close), which came after the Nov 2 note in this request (QUESTIONS 87). Checked every route in the code: Guide me's agenda steps, Next 3, "Open where it lives", Find and quick add all point at live screens, and old #/my-money and #/spending links redirect (saved custom agenda steps too). There is no breadcrumb since fix pass 5. New test: every #/ link in js/ resolves to itself.
- 4 Session-1 focus mode: while Guide me is on in a session (Start session turns it on, End session off), Debt shows Debt, Balance, APR and Payment; Assets shows Account, Balance, Kind and "A month in" (the contribution, typed per month and kept as a yearly amount); Income shows Source, Amount, Given as, Per and Pay frequency. Every other column moves to the row's More, which reads "More detail"; each list's strip, chart, the credit score card, the benefits list and the variable income block sit under one collapsed "More detail" each. Outside a session nothing changes.
- 5 Promote the best parts: Prep shows the Next 3 numbers under Money in one line (compact cards, #1 large with its box to fill; hidden when nothing is open). The FI reveal agenda step (and Next step when it is the current one) opens Goals with the FI date, FI number and the save-more slider first, then Big deals: both end above 610px at 1280. Start session saves a snapshot labelled "Start of session N" before the session starts.
- 6 Every number says "so what": js/sowhat.js gives each card in Money in one line, the Overview strip and metrics shelf, and History's net worth change and debt paid one plain sentence from the client's side, plus one link when something is off (guessed lines inflating spending, savings rate under 10%, cash dipping below the low line, runway under 3 months, housing over 35%, cash under the Rule of 5 cushion, cards over 30% used, debt payments over 36%, net worth or debt going the wrong way). The guessed-lines banner on Home folded into the surplus card. Test: test/polish.test.js.
- 7 Collapse the extras and merge Home cards: collapsed by default (each a caret that click-away closes): Life admin on Protection, Community presets on the Budget, Wrapped and Net worth over time on History, Money feeling on Wrap-up; Group by (DRAFTT or Category) moved into Settings for this budget next to cash vs accrual; the 401(k) and HSA extra detail and Net worth over time on Prep were already behind carets. Prep's four cards (What changed, Open homework, Due for a check, Parking lot) are one "Open items" card with a total count and one line each that links to its list.
- 8 Guided month-end close: Review opens three steps with a step indicator (each step is also a button): 1 Confirm actuals (Plan and Actual, type what the calendar did not fill), 2 Review biggest misses (variable first, with the differences and the chart), 3 Carry forward (Carry per line, then Close month). One primary button per step (Next, Next, Close month); while the review is open the row's own Close month steps aside.

## Answers to the polish questions (Nov 3)

- 1 Phone bottom tabs: on phones the five tabs (Home, Net worth, Cash flow, Plan, Report) sit in a bar at the bottom; the toast and Report this sit above it. The top bar is not rebuilt and there is no Tools sheet (the phone branch stays unmerged); only the $ / Hours / FI days box got a minimum width so it is not squeezed to a sliver.
- 2 "Month-end close" is now "Month end": the sub-tab, its page, the One page part and the step list's label; the spec's Navigation and Screens tabs say the same (csv rebuilt). Old "Month-end close" Lives on text still finds the page.
- 3 Home and SLAM: the Home tab and the SLAM logo both open Prep, or Live while a session is on (js/nav.js tabRoute). A bare #/home lands on Prep; About you stays first in Home's sub-tab row but is no longer the landing page (that was the bug). Nav tests cover both.
- 4 Payment matching asks, and only on real evidence: the line's own name (payment, loan or mortgage for a debt, insurance or premium for a coverage, plus a word shared with that debt or coverage; the group name such as "Rent or mortgage" no longer counts), an exact amount match (to the cent), or sitting in the Debt group. Nothing merges silently: the line shows "Same as your Car loan payment? Yes / No". Yes counts it once everywhere (totals, waterfall, month view, calendar) and the note reads "Counted once, as your Car loan payment" with Not the same; No keeps both and stops asking. A premium's own linked Budget line, once the coverage says the paycheck pays it, is still left out by construction and says so. Tests updated (test/reorganize.test.js).
- 5 Roth 401(k): when the 401(k) row says Roth, its paycheck money comes out of take-home after tax (js/math/income.js: roth, apart from pretax), so it never lowers federal, FICA, state or city taxable income, whether gross or take-home was typed (the gross solve accounts for it) and on the Taxes screen. It still counts as savings from the paycheck for take-home and the savings rate; the waterfall bucket is renamed "Saved from paycheck". Test: test/polish.test.js (Roth taxes equal the taxes on the full gross; take-home is that minus the contribution).
- 6 Sinking funds: kept as built (a fund on a Budget yearly cost stays out of Free after savings; funds on events and other costs come out). A fund on a yearly cost now says "Already counted in spending" under its name on Plan › Next 12 months.
- 7 Health premium with two jobs: job 1 (the one the 401(k) links to) by default, as built. With two or more jobs, the Health row's Paid from lists each paycheck ("Paycheck: Day job", "Paycheck: Weekend job") and Budget line; picking job 2 takes the premium out of that paycheck instead, once. Test: test/polish.test.js.
- 8 data/fields.json rebuilt from the spec with tools/fields.py (265 fields, was 263). js/fields-map.js holds the old-to-new map; migrate() applies it once (fieldsVersion 2) to every saved client and backup file, so a filed parking-lot note (the only place a saved file names a field) stays on its field. New clients start on the new numbering. Demo client numbers unchanged (14 of 14); the private Test client was not checked here (its file is not in this container). Tests: test/polish.test.js.
  - Renamed: F215 Return (real) → F216 Return (after inflation).
  - Added by the spec: F215 Retire by (age); F217 Inflation.
  - Same name, new ID (moved up by two): F216 → F218 Withdrawal rate; F217 → F219 Pace (optimistic, likely, pessimistic); F218 → F220 Real or nominal dollars; F219 → F221 Life expectancy; F220 → F222 Social Security; F221 → F223 Spending in retirement; F222 → F224 Go-go, slow-go, no-go phases; F223 → F225 Lean FI (FAT costs only); F224 → F226 Coast FI; F225 → F227 Barista FI; F226 → F228 Regular FI; F227 → F229 True FI (after tax); F228 → F230 Debt free date; F229 → F231 Custom milestone (at a date or when a condition is true); F230 → F232 Rule of 5 target (age / 5 months); F231 → F233 Scenario blocks (home, car, kid, job change, sabbatical, move, marriage, side hustle, inheritance); F232 → F234 Ranked priorities (fund and remove); F233 → F235 Best case / dream life; F234 → F236 Discovery table numbers; F235 → F237 Session date and agenda; F236 → F238 Session notes; F237 → F239 Homework list (auto from fields marked 'will email'); F238 → F240 Key stats, things to know, to-dos, goals; F239 → F241 Strengths, struggles, do more of, do less of; F240 → F242 Monthly check-in notes and next check date; F241 → F243 Client satisfaction score; F242 → F244 Next check date for rough or aged numbers; F243 → F245 What prompted this call; F244 → F246 Biggest worry and goal in their words; F245 → F247 Money feeling 1-10; F246 → F248 Quick notes; F247 → F249 Joint, separate or mix; F248 → F250 Who pays what (% or fixed); F249 → F251 Last 12 months, typical month, lowest month; F250 → F252 Set aside for taxes %; F251 → F253 Month by month (12 boxes); F252 → F254 Benefit name, what it is, how it works, value, using it?; F253 → F255 ESPP %, discount; RSU grants and vest dates; F254 → F256 Credit score, as-of date, source; F255 → F257 Payment choice: minimum, custom, in full; F256 → F258 Type, have it or not, premium; F257 → F259 Coverage amount, through employer, deductible / out-of-pocket max; F258 → F260 Yearly cost and month due (walk-the-list prompt); F259 → F261 Upcoming event, rough cost, month; F260 → F262 Maybe money (expected, not certain); F261 → F263 Wins on a date; F262 → F264 Private notes and shared notes; F263 → F265 Session number, next date, client status.
- Follow-up answers: a 401(k) marked Both stays all traditional (pretax) unless a Roth part is set on the 401(k) row, as dollars a paycheck or as a % of what goes in; that part is taxed first, like a Roth, and never more than the contribution. An exact amount match now asks only when the line's name also has a payment word (payment, loan or mortgage for a debt; insurance or premium for a coverage); the same amount alone no longer asks. Tests: test/polish.test.js, test/reorganize.test.js.

## Phase 3.5: Close the books (Nov 3)

- Phase 3.5 Close the books: done. Three statements with a tie-out, cash layers, the SLAM FOO on Plan › FOO, calendar drag and Move with buckets and markers, pay yourself first, Shockingly Simple Math and YMOYL step 3. QA: 154 tests pass; 27 screens at 1440, 1280 and 390px, light and dark: no console errors, no sideways scroll; no jumping on the budget rows or the FOO settings.

- Spec sync: Feature list has every Brandon and missed-ideas NOW item as built (phase 3) and every LATER item as phase 4 to 7 (FOO auto-placement and the money calendar and close as 3.5), plus the 3.5 rows; Math M62 to M72; Rules R188 to R207; Roadmap 3.5 Close the books. QUESTIONS 70 and the match answered.
- Section 2, the three statements: Report › Statements (js/math/statements.js, js/ui/statements-ui.js). Month or year, this period vs last with the change; each statement collapsed to its lines, a line opens to its records, each linked to its home; tooltips carry the accounting names. M62 net worth statement as of a date, rebuilt from the dated history (assets in liquidity order, debts by type, liquid and total, unvested below the line). M63 income and spending (accrual): gross, the employer match as its own line, taxes, saved from paycheck, take-home, fixed and variable (the month's actuals once logged, else the plan; debt payments From Debt), surplus. M64 cash flow (cash basis): starting cash, Everyday (paychecks, bills, card payments, loan interest, when paid; card charges leave checking when the card is paid), Investing (contributions, withdrawals), Debt (loan principal), ending cash. Tie-out: M65 unexplained cash with Find it (days with unmarked items), M66 the net worth bridge, M67 accrual vs cash, line by line. Closing a month now makes the statements (kept with the month) and a snapshot in one click; Print the set prints only the statements. Tests: test/statements.test.js (the Demo client ties out within $1 with $0 unexplained for a closed month; the private client skips without its file; a missing $85 shows as unexplained cash).
- Section 3, cash layers (M68, js/math/layers.js, Net worth › Assets › Cash layers, collapsed): little e (the smaller of $1,000 and the highest deductible; a Guess until one is known; a higher deductible says big e covers the rest), each dated income gap (spending times its months; FOO step 1 when it starts within 12 months, else step 8, moving on its own), big e from the Rule of 5 (age / 5, times 1, 1.25 or 1.5 for steady, varying or unpredictable income) in nested FAT, DRAFTT and full layers, then sinking funds. One account with layers inside, or one account per layer with a pick of which account backs each. Backups of the backups (unemployment, disability, available credit, what you could cut, family help) add months of runway and are never a fund. Tests: test/layers.test.js.
- Section 4, the SLAM FOO (Plan › FOO, js/math/foo.js, js/ui/foo-ui.js, data/flags.json): steps placed automatically (M69) from the household file, each with Done / In progress / Next / Later, dollars left (Show the math), a projected date (the surplus works through the steps in order; Coast FI and FI on the growth path) and what is in it on tap. 0a Give (off until turned on: % of gross or take-home, or a set amount), 0b Bedazzle (joy lines picked on each budget line's More; optional until one is picked), 1 Stop the bleeding (late bills, payday debt, little e, gaps within 12 months), 2 Take the free money (unvested listed), 3 Clear the heavy debt (payoff order, PSLF and forgiveness loans skip), 4 big e, 5 Roth and HSA (backdoor note over the income limit), 6 Prepay retirement (M70 Quiet Quitting FI, then Coast FI; the yearly minimum is the Roth limit plus the match only if you keep a job after launch, asked once and fed to Barista FI too), 7 the SPARKS launch window (opens at Coast FI, or at Quiet Quitting FI on a toggle; done when a launch move and month are picked), 8 Fund the future, 9 Low-rate debt then FI and True FI. 2 and 3 run together; 6 and 7 never overlap. The path: a row of stops (a column at 390), You are here, every date on the way behind a caret. The Money Guy's original nine on a toggle beside it. Efficiency flags (M71) are data in data/flags.json and show as one calm line on their step. Tests: test/foo.test.js (payday debt holds you at step 1, PSLF skips step 3, Coast FI opens the launch window, giving comes first, the M70 worked example).
- Section 5, calendar upgrades: drag a chip to another day on desktop (dropping it on its own day puts it back as planned); on phones the item's panel has a Move button with a day picker. Moving updates the running balance and keeps undo in the toast. Each item carries its cash flow bucket (Everyday, Investing, Debt) set by type, with an override in its panel that the cash flow statement (M64) reads and that survives Back to planned. FOO dates (on the first of their month) and the month-end close day (the last day, or the day it closed) show as slim markers behind a Markers filter, on by default (js/math/markers.js). Tests: test/calendar35.test.js.
- Section 6: Pay yourself first on the income statement (what comes off the top a month and about a paycheck: 401(k) and HSA from pay, the match, after-tax contributions; js/math/simple.js payYourselfFirst). Shockingly Simple Math (M72, js/math/simple.js): Plan › Timeline › Savings rate to years now draws the curve from $0, your savings rate as a dot on it and the next 5% step, with a line under it that shows the math. YMOYL step 3: the income and spending statement switches between dollars and hours of life energy, the pay-yourself-first line included. Tests: test/simple.test.js (matches the published table: 50% about 17 years, 10% about 51).
- Answers 89 to 91 (Nov 3): 89 on Budget › Plan the Plan column is hidden unless this month's plan differs from the usual amount for at least one line, and then shows only on the lines that differ; every line has "Plan for (month)" under More to set one (js/month.js planDiffs). 90 Live has a "Show all fields" switch while a session runs with Guide me: off by default (focus mode on), it turns focus mode off and back on mid-session; each new session starts in focus mode. 91 "A month in" keeps the cadence the contribution was typed in: a per-paycheck entry shows its monthly equivalent and saves back per paycheck; only blank or yearly entries save as yearly (js/math/portfolio.js contributionFromMonthly). Tests: test/answers89.test.js. QA: 156 tests pass, Demo client numbers unchanged; Budget, Live and Assets checked at 1280 light and dark with no console errors and no sideways scroll.
- Open the books (Nov 3): spreadsheet export and import, kept current. Section 1: one source for the app and the sheet: js/registry/fields.js (every record kind and field by area, each a column or sheet: skip with why), js/registry/math.js (M00 to M72: name, inputs, the js/math functions behind it, a sheet formula or From the app with the reason; every other js/math export in SUPPORT), js/registry/assumptions.js (every Reference data value and SLAM rule with source and date; the math now reads RULES and LISTS from it, so the card minimum, Rule of 5, little e, heavy and consumer debt, housing and the period table are one number). Section 3: the workbook from the registries only (js/sheet/workbook.js, written with ExcelJS by js/sheet/excel.js): Start here, Assumptions, one Inputs tab per area with Kind, Type, Status and In the math, formula columns, named ranges and 20 blank blue rows, Math (one row per entry with the live formula, the app's value and a Check), Statements, FOO and Projections (js/registry/reports.js), and a hidden SLAM data tab. Section 4: Bring a spreadsheet back (js/sheet/import.js): every edit, new row, removed row and assumption change listed against what the file held, conflicts and bad values flagged, nothing saved until Save, a snapshot first and one undo. Section 2: the buttons on Report › One-pager next to Export PDF and on Coach tools › Data, each with its line; Include coach-only notes (coach view only); ExcelJS 4.4.0 from jsDelivr. QA: 179 tests pass; recalculated in LibreOffice with no cached values, every Check reads Matches for the Demo client and for a household using most of the math (NY and NYC tax, gross pay with a 401(k) and match, lines, split rent, cards on the minimum and in full, a 0% promo); no formula errors with every field filled; in the app (Playwright) the download, an edited file brought back, the review and Save work at 1440 and on a phone with no console errors. Not checked: opening the file in Google Sheets and in Excel themselves (no access from the build container; LibreOffice stands in, and the build refuses functions too new for either).
- Open the books, full brief (Nov 3): Section 1 field ids and the registry checks as plain sentences. Section 3 _meta (hidden, protected: client ID, export format version, export time, app version, registry shape, a fingerprint per record, the baseline), the format version tied to the registries' shape (js/sheet/format.js), Projections year by year with FV and each debt month by month as row formulas (past 600 rows: values, From the app), payoff with NPER, numbers right-aligned, a hidden record ID on every Inputs row. Section 4 js/import-sheet.js (Assumptions and Inputs only; type decides a new row, else Couldn't tell what this is with a type picker; Removed in the spreadsheet never deleted unless kept; the wrong client asks first or starts a new client; conflicts from the _meta fingerprint with a required pick; typed-over formulas; bad values with their cell; source spreadsheet in SOURCES and history, shown as From your spreadsheet; new Calendar entries rows logged on their dates) and the review grouped by area, collapsed to counts, Keep and Skip, Keep all, Save these changes. Section 5 test/coverage.test.js (fields, math, the Demo workbook, the round trip, the format version), SPEC-DRIFT.md, CLAUDE.md, .github/workflows/test.yml. Section 6 test/checks.test.js (LibreOffice recalculation for the Demo and private clients, rent +$100). Section 7 LICENSE (AGPL-3.0-only), SPDX headers, CONTRIBUTING.md, README. QA: 192 tests pass (4 skip: the private client file is not here); every Math, Statements, FOO and Projections Check matches in LibreOffice for the Demo client and the rich household; the guard fails with its sentence for a throwaway field; in the app the download, an edited file back, the collapsed review, Save and the wrong-client question work with no console errors. Not checked: Google Sheets and Excel themselves (no access from the build container).
- Built from the spec's open rows (Nov 3): the next check date for rough and aged numbers (js/checks.js: Roughly at 30 days, any number at 90, Not sure at once, or Check again on; on each row's More, the Revisit list and Open items), the spec's starter lines (8 kids lines, 7 pets lines, car wash, money sent to family; gated by kids, pets and car), a reimbursed amount on a line (off your share, a month), part of a bill someone covers (All of it or Part of it), and a Today's or Future dollars switch on Plan › Goals (the FI number and the ladder in the dollars of the year they are reached; Projections has a future-dollars column). Settings that change numbers now save and undo like everything else (they were left out of the store's change tracking). Parked: itemized deductions, happiness rating, card library, the 401(k) loan note, Social Security. QA: 213 tests pass, no spec drift, LibreOffice checks match with a covered-part and a reimbursed bill; checked in the app with no console errors.
- Phase 3, the program path and the progress tracker (Nov 5): one Home. Step 0 (reported, not changed): a synthetic household shaped like the beta Home reproduces 45.2%, $1,433, $71,745 and Oct 2063 exactly, with $0 a month going into investments: the savings rate counts the surplus as saved, the FI date adds it only when Invest my surplus is on (off by default), so the date is today's invested balance compounding alone; with the surplus invested it is 14.3 years (test/program.test.js). The program: js/registry/program.js (12 sessions and their checklists, levels Gut 25 Rough 50 Estimate 75 Actual 100, weights, pace S1 40 S2 70 S3 90, unlocks, confidence); js/math/picture.js M73 (every number's level, the Picture % as the weighted average, the next small things with +X% to the next level, Ahead / On track / Catch up, what each calculator needs to unlock, the confidence of an unlocked number); js/program.js (auto ticks from the data, manual checkboxes and edited placeholder sessions in doc.program, Start and End session, Day 0 = the first end-of-session snapshot, End of session N after, Day 0 vs now). Home (js/ui/home-ui.js): one nav row (no sub-tab bar on Home; About you is a link), the session strip with Start session (Next step and End session while it runs), the 12-node path with the open node's checklist, the Picture bar with its pace and By section, three next small things each with a button to the exact field, money in one line with the FI date locked (the plain reason) or unlocked (a confidence label instead of the Guess tag), and cards that show only when they have something to say. Prep, Live and Wrap-up are gone (old links land on Home); undo, redo, Add anything and the parking lot sit behind a labeled More button. Locks: the FI date, Timeline, Big deals, the ladder's dates and the one-pager's FI line wait for income and spending at Estimate and an invested balance; Debt payoff waits for debts at Estimate. Lock it (confirmed) on any row's status menu makes it Actual (a Locked column on each Inputs tab; export format 7). Snapshots now come back with an imported file. Spec: a Program tab (tools/program_tab.py writes it from the registry), M73 on the Math tab, F389 to F392, the Home rows on Screens and Navigation. QA: 224 tests pass (the demo workbook rebuilt and recalculated in LibreOffice); in the app (Playwright) Home, the More menu, a session started and ended with the Day 0 snapshot, a locked and an unlocked FI date, Lock it on a row, and the three widths with no sideways scroll and no console errors, light and dark. Questions 122 to 131.
- Phase 3 batch 2, the Scorecard and sessions 4 to 12 (Nov 5): js/registry/scorecard.js (eleven areas in one list: Cash flow, Emergency fund, Debt, Credit, Retirement accounts, Investing, Taxes, Protection, Income, Goals, Mindset; the three ratings; the rules' thresholds; the payoff rules; the usual effort and the FOO step per area), js/math/scorecard.js M74 (a rating and a plain reason from the data where a rule is clear, the coach's override with a reason, each hole's payoff a year with its math and in hours and FI days, the effort, best return = payoff over effort, holes ranked before the client's FOO step first then by best return), Plan › Scorecard (js/ui/scorecard-ui.js: holes ranked with a rating picker, payoff in the $ / Hours / FI days view, editable effort, a typed payoff where there is no rule, In the plan, and How we got this behind a caret; OK rows; Strong as slim rows; Confirm FOO step; Re-scored today). Sessions 4 to 12 (js/registry/program.js, js/program.js): S4 Goals (three short-term and three long-term milestones, each with an amount, a date and a need, want or wish tag: new columns on Plan › Goals), S5 Full analysis (every area rated, holes ranked, FOO step confirmed, top 3 chosen), S6 to S8 Fill a hole (the top hole is pulled when the session starts and done when it is OK or Strong), S9 Revisit (Day 0 vs now, re-scored), S10 and S11 Fill a hole or, once every area is rated and no hole is left, the next chapter (a free-text goal with an amount and a date), S12 Game plan (next-year notes, a yearly review date, the monthly money date). Home after session 3: the bar reads X of 11 areas Strong or OK with Day 0, the top holes, holes filled with before and after and the FI days gained, the next chapter when no hole is left, the game plan inputs on S12. The scorecard, goals and holes export and import with the client file and the workbook has a Scorecard tab (export format 8). Spec: the Program tab's Scorecard, Thresholds and Holes sections, M74, F393 and F394, Plan › Scorecard on Screens and Navigation. QA: 250 tests pass; in the app (Playwright) the Scorecard, the goal columns, a hole session started and filled, the after-intake Home and the three widths with no console errors. Questions 132 to 139.
- Phase 3 batch 3, the answers, the Agenda, the review gate and the FOO prerequisites (Nov 5): answers 122 to 127 built (the surplus invested unless turned off, the FI card's two lines, after-tax contributions and Retirement lines as investing with no double count, the FI date unlocked by a gut number at Low confidence and shown by confidence as a year range, a year or a month, the gut number stepping aside once the big categories are at Estimate, debts in the key numbers locked; a Month cadence on an account's contribution was read as a year: fixed). The Agenda (js/program.js agendaOf, js/ui/agenda-ui.js): Must do (the checklist, ticking from the numbers anywhere), Going over (the coach's items), a note and a link on any item (a page or field, homework, a parking-lot question, a Scorecard hole; Back to where we were), Suggested for today with + (carried-over items, homework the client says is done, open parking-lot questions, the top hole, numbers older than 60 days), on Home before the session and as a docked bar on every tab while it runs (coach only). The review gate (js/ui/review-ui.js) on End session, Move to next session and at the start of Revisit: each open agenda item carries over or becomes homework; the stage's key numbers (REVIEW in js/registry/program.js) with Looks right (locks to Actual) or Edit; homework the client says is done with Confirm or Back to To do; Move on anyway with a note on the session record; the snapshot after; the agenda kept as the session recap. Homework statuses To do, Client says done, Confirmed (Coach tools › Lists; a client's I did this can plug in by: client). FOO prerequisites (js/registry/foo.js): a step declares a step to reach first and conditions; locked steps show the lock and the plain reason and are never where you are; giving is off by default, sits at the Roth IRA step (5b) and unlocks there (Giving unlocks at the Roth IRA step. Oxygen mask on you first.), with no heavy debt; SPARKS after Coast FI on the same mechanism; Unlock anyway with a required note and the cost in FI days a year. Answers 132 to 139: little e and big e rate the emergency fund; cards over 30% used is a Hole; heavy debt is 8% or more; a hole with no payoff ranks last with Add payoff; each area mapped to SLAM's own FOO (goals and mindset at step 0; the emergency fund moves from 1 to 4, retirement from 2 to 5); Park it with a note (parked holes last, unparkable, skipped by hole sessions); only an open hole blocks the next chapter, unrated areas get a nudge; Revisit opens the gate. S12 is Graduation (the Day 0 vs graduation report, the plan notes and dates, the final snapshot). Client view hides the parking lot, confidence cues, the agenda and checklists, the Scorecard's pickers and typed reasons, parked notes and the locks' Unlock anyway. Spec: the Program tab's FOO, FOO mapping, Agenda, Homework, Review and FI date sections; M69 says giving sits at the Roth IRA step; export format 9. QA: 253 tests pass; in the app (Playwright) Home with the agenda, the docked bar on another tab, the gate with carry over and make homework, the Scorecard's Park it and Add payoff, the FOO's locks and Unlock anyway, and the three widths with no console errors. Questions 140 to 147.
- Your calendar (Nov 5 2026): About you asks which calendars apply (Jewish with Shabbat, Muslim, Christian, Orthodox Christian, US). Dates are computed in js/math/holidays.js (M78, numbered M75 before the merge: the fixed Hebrew calendar, the tabular Islamic calendar marked about, the Easter formulas, the US weekday rules), so nothing is refreshed year to year. Ticked sets show as slim markers on the Calendar (begins at sundown, the day, ends) and add starter blocks on Next 12 months with blank amounts (events with a holiday id that take their month from the holiday each year, and land on its eve). Shabbat adds a weekly Budget line (Date is: Weekly, Lands on: Thursday) that spreads over the Thursdays of the month, used Friday night and Saturday (cash vs accrual). Fields F395 to F402, export format 10. QA: test/holidays.test.js pins the published dates for 2026 to 2028; in Chromium the three checkboxes, the markers, the blocks and the Shabbat line at 1280 and 390 with no console errors. Questions 148 to 152.
- Overnight run (Nov 5 to 6): Part 1 finished (answers 140 to 147 with Park it's bring-back and giving after heavy debt only; the cash layers as one definition with dips, history and stats; the ladder M75; couples with six modes; five debt payoff methods with a stress suggestion and a custom drag order; the Joy number; capture for later with a change log that says who; the S1 to S12 walkthrough in tests and the browser). Part 2 started (statements in $/hours/FI days; the Buffer as the calendar's low line; CSV statement import; Current vs Proposed M76 with Make Proposed the plan; the month-close streak M77). MATH.md, SYNC.md and MORNING.md written. One format bump (version 10). QUESTIONS 148 to 171.
- Batch 5 (Nov 6): the Rule of 5 restored (big e = age / 5 months of spending, one definition in M43, the layers, FOO step 4, the ladder, the Scorecard and the workbook; no age locks it); answers 148 to 171 applied (no filing status from the mode, the split in Dating, Joint at half per person, Return on Hassle confirmed, Confidence beside Joy in one session-start prompt, paychecks matched on CSV import, the grace month per calendar year, override costs for the Roth and SPARKS); a safer 3.5% FI line under 45. Format 11. QUESTIONS 172 to 175.
- Batch 5 E (Nov 6): About you › Home and shared bills rebuilt. A My share / Whole bill toggle next to each checked bill (profile.sharedAs); the defaults with roommates in config (rent on as my share; electric, gas, water and internet on as the whole bill; renters, groceries and household supplies off); a bill given as my share is never divided again, a whole bill is divided by the split count, shown inline on the Budget line and beside each bill on About you; "Split N ways (you + R roommates)" replaces "Splitting with N", the count includes the client (older files: N becomes N + 1 ways; a ticked bill with no choice keeps the old whole-bill meaning); "I'll find it later" only while a field is empty. Export format 11's shape updated (still the one batch 5 bump); the spec's F090 and F091 relinked. Tests: 3 roommates split 4 ways; rent $1,500 as my share stays $1,500; electric $240 as the whole bill is $60. Question 176.
- Batch 6 (Nov 6): usability from Eli's screen walkthrough, items 1 to 36: history arrows and arrive-and-highlight, clickable counters, the agenda folded and session states, Know it as confirmed, Institutions, one unit per table and no sideways or nested scroll, the calendar's Month and Full list views with day totals, a weekly Spending money bar and a drag handle, FOO tiles with cards in config and partial bars (step 8 no longer Done with nothing to fund), credit inputs per person, inline inputs on unrated areas, honest zeros. Format 12. QUESTIONS 177 to 181.

## Batch 7 (Nov 5): Eli's walkthrough of the SLAM for Eli artifact

Twelve items from one sitting, each a screenshot and a sentence, built as one batch. The rule they add up to: nothing on
the screen may look like it does something it does not, and nothing may happen without saying why.

1. Downloads inside the artifact: the spreadsheet export and the backup go through one save helper (js/ui/save-file.js) that uses the artifact's download door when the page runs inside claude.ai and the plain link on the site. The artifact is published with `capabilities: { downloads: true }`; a declined download says so instead of claiming success.
2. "End session does all four": each line shows its real state (homework set, this session's snapshot, the one-pager has its key numbers, the next date is picked), dashed when End session will do it, solid green when done. No circle is a dead control.
3. Arrive-and-highlight: the Institutions picker counts as the institution, so picking a bank clears "institution (missing)" (the typed Institution boxes in Details are gone). Every parkable box carries a handle from its park buttons, so Show me outlines the box, opens the row's Details when it is inside, and never falls back to the row. The toast says where to look, closes when you leave the screen, looks again after every save (a filled or parked field drops off), and ends with "All set on this screen". One name per field, shared by the toast, What's missing and the Homework list.
4. "I'll find it later" is handled, not missing: the bars, counters, amber row markers and sub-tab counts treat a parked field as done and say "N on homework" beside the count. A parked field stays off the Revisit list until the client says it is done; then it comes back for the coach to confirm.
5. Pretax or Roth is asked only on Other and All investments. A Roth or Traditional IRA shows its answer; a Brokerage, Crypto or 529 is never asked (js/math/portfolio.js asksTaxType, taxTypeFor). Unvested stays on the types that can vest.
6. Next step says why: it arrives with the checklist item it is chasing, or the next small thing and its gain. When nothing is left but what End session does, it says that instead of landing on Plan › Goals, and End session takes the primary spot.
7. The ladder shows the dollars behind the share: have of target and left to go on the next step, the next marker and every rung (js/math/ladder.js steps carry have, target, left).
8. Open the list works in Client view (it goes to the one-pager's To-dos; Coach tools say "Coach tools are off in Client view" with a button instead of a silent bounce). Two accounts at one bank read "Tikva · 401(k)" and "Tikva · HSA" everywhere.
9. The parking lot can be pinned open as a column at the right edge (1280 and up; a popover below that), on every screen until unpinned. A note can be resolved without a field, deleted (undoable), or made homework for the client or for me; done notes fold under "Done (N)" with Clear done. Homework carries an owner: the client's goes out with Send to client, the coach's ("no field for it yet: make one and enter it") never does, and the Lists screen shows the two groups. Confirming homework made from a note resolves the note. Compatibility: notes without doneAt are open; homework without owner is the client's; both are what every existing one meant.
10. Details panels are a grid, not a free wrap (css/app.css .layer), on every list. The Protection panels put the money fields in one group with one pair of park buttons (parkGroup), and the disability fields say what they are: "Replaces this % of your pay" (usually 60), "Benefit period", "Waiting period", each with a plain-language tooltip.
11. A credit card's first question is "Paid in full / Carries a balance", in the row. In full: the balance box asks for the statement balance (it still counts for utilization), there is no APR and no payment, and the card needs its balance only. Carries: the debt fields follow, with the 25% APR guess until typed.
12. Defaults in use: a list on Coach tools › Lists (and a line on Home › Open items) of every number the app filled with a typical value (a card's APR, a starter spending guess, anything marked Not sure), with Fix now, so a default is never mistaken for a typed number.

QA: 316 tests pass (test/batch7.test.js covers the pure parts); the walkthrough runs every screen at 1440, 1280 and 390, light and dark, with no console errors; a batch 7 browser check drives each behaviour above on the Demo client.

## Batch 8 (Nov 6): the category-first Budget, Eli's walkthrough fixes

The category-first Budget (A): one row per category (kind spending, type the category key; made the first time the Budget opens), a single amount and status that count as done on their own; the caret opens the category's lines; lines above the typed amount update it ('updated from $X'), the rest reads '$X not assigned yet'; the Picture, the counters and the tab badges count categories; an older file reads as before (category = its lines); 'Break down your biggest category' suggested in S3 and S4. Rows (B): 'I'll find it later' is 'Will get it' everywhere (a clock 'Getting it' badge, 'Find: …' on the homework list, auto-added to the next session's agenda), 'Will get all of these (N)' and 'Use all starter estimates (N)' per section, the per-row 'Use', the period folded into the amount ('/mo', click to change), a slim always-there checkbox on every row with shift-click ranges, a section checkbox and a sticky bottom bar (Delete without a popup, Use estimates, Will get it, Move to section, Set status, Clear; the Select button is gone), blank rows count nowhere and go when left empty, a solid sticky header, names that wrap. Navigation and checks (C): every What's missing line is a link under one heading per level; Back and Forward are bordered buttons; the empty-list hunt (holes ranked, top 3 chosen, hole filled, Guide me's debt step, 'All set' on an empty screen) fixed; Export PDF inside the artifact goes through the download door as a printable one-pager; FOO steps show '$have of $target' beside the share. Answers 177 to 181. QA: 319 tests (test/batch8.test.js); the walkthrough at 1440, 1280 and 390, light and dark, with the category view, the checkboxes, the bulk bar, the links and the buttons. Questions 182 to 185.

## Batch 9 (Nov 5): fixes from a think-aloud usability test

Six small things a first-time user tripped on, fixed without touching anything else.

1. The top bar fits at 390: the tools row wraps to a second line instead of scrolling sideways, so Client view and the gear are always reachable (css/shell.css).
2. Agenda rows stack at phone width: the box and the words take the full line and the Note, Save Day 0 now and Open buttons wrap below (css/phases.css).
3. Fast Track's First name starts as the first word of the client name ("Maya Test" is "Maya"), and only when no first name is on file (js/fasttrack.js firstWord).
4. A paycheck needs How often: with Per = Paycheck and no frequency, Next says "Pick how often they're paid so we can turn the paycheck into a month" beside the box and stays put (js/fasttrack.js needsPayFrequency). Without it, M01 read the paycheck as a month (marked roughly), so an every-2-weeks $2,000 counted as $2,000 a month instead of $4,333. Month and Year need nothing.
5. Once Fast Track has been finished (Finish, not Save and close; settings.fastTrack.done), both buttons say Redo Fast Track and the big card on an empty screen is one slim line.
6. Home with no client: the Try with example numbers button hides while the New client box is open, so the box never covers it.

QA: 315 tests pass (test/batch9.test.js covers firstWord, needsPayFrequency and fastTrackDone); each fix checked in the browser at 1440, 1280 and 390 with no sideways overflow and no console errors beyond the blocked font and CDN loads.

## Batch 10 (Nov 5): one answer to "what do I spend", Bills and subscriptions, levels, Why now chips, the line's side panel

From a usability test: a new client with a gut number of $3,500 saw the Budget add 56 untouched starter lines to $8,472
next to a strip saying $3,700, a green check on Budget and "Picture 71%, Ahead" on Home. Two answers to one question.

1. Faded typical amounts. A starter line holds its typical value apart (values.typical) and no amount: the box shows it faded (dashed, italic) with "Use $X" beside it, on top of Batch 8's Use and "Use all starter estimates (N)". Use enters it as Roughly (usedTypical, so it shows in Defaults in use as "Typical amount, used" and on the Revisit list); typing enters a real Know it number. A faded line counts for nothing: Spending, Fixed, Variable, Per paycheck, % of take-home, gut vs lines, the categories (M27), the Picture % and pace, the Budget check, Money in one line, FI, Lean FI and big e, the calendar (no day-1 pile, no low-balance warnings, no timing risk), Month end gaps, Report › Overview (Biggest DRAFTT letter, Housing %), the Revisit list ("N starter guesses" is gone), Defaults in use, Next 3 and the workbook's live numbers (the typical amount is its own column, "Typical amount (for reference, not counted)"). Until a line is real the Budget strip shows only the gut number. "Typical amounts would add up to $X a month (for reference, not their number)" sits on each group header. Existing files (js/presets.js migrateBatch10, run once per file on open and on import): a starter line still Not sure, at its starter guess, with no amount typed over it becomes faded; anything edited keeps its amount; a one-time slim note says so.
2. Bills and subscriptions: a group outside DRAFTT (stored as draftt Bills, its own category row on the Budget) holding Phone, Streaming, Music, Apps and cloud storage, Amazon Prime and memberships, News and magazines. Phone left Accommodation (Internet stays). Phone was in the FAT set through Accommodation, so it stays in it (spending.inFat: Lean FI, big e FAT and DRAFTT layers, the sheet's FAT column). Existing lines move on load. Spec F064 and F065 relabeled.
3. Levels. Every starter line carries a level from Reference data (1 the big one, 2 the regulars, 3 Everything else); a line the client adds is 2. Under each category's caret Level 1 and 2 lines show; Level 3 folds into one "Everything else" group with one rough amount for the bucket (elseAmount on the category row), replaced once any piece has a real number (spending.everythingElse; no double count in M27, app and sheet). Move up / Move down in the row menu and "Shown as" in the panel. The core counts and nags read Level 1 and 2 only; the category's single typed amount still counts as done (Batch 8).
4. Why now chips: the three questions are rows of tap chips (several each, a star for the main one, Other opens a small box), the "In their words" box stays under each, optional. A chip or text answers the question (About you counts, Guide me's Why now, S4's goals). Goal chips that map to a Plan goal or FOO step show on Plan › Goals "From Why now" with Add and Not now; nothing is added on its own (js/whynow.js).
5. The spending line's side panel (YNAB's inspector, Monarch's recurring bills): Details opens a panel on the right (a bottom sheet at 760px and below; Escape, the X or a click outside closes it; one at a time); the row stays slim and the amount stays typable in the row and in the panel. Timing is one sentence ("$1,000 · every month on the 1st"), every part a tap, no typing: Every month / Every week / Every year / It varies, then day chips 1st, 15th, Last day and Other day (a 1 to 31 grid), weekday chips or month chips (js/timing.js maps onto timing, dueDay, weekday, irregular, per and monthDue: nothing migrates, the calendar is unchanged). Same amount every time / It changes. Who pays is one row (Me / Splitting / Someone else / Not for me) with Paid with beside it and "+ Someone pays me back". More (folded): Different this month, Keep / Try to cut, Joy, Range, Tags. Notes became hover tips. Group headers always name their group. What's missing's "Set due day for Rent" opens the category, then the panel, and lights the day chips; the arrive bar is docked at the top of the content instead of floating over the table.

Also: "Will get it" wording on the Homework and To-dos empty states; Report › Overview's cards wrap at 390. Fields F433 to F446, export format 14.
Layout check (tools/e2e/layout.cjs, all widths and themes, against main before this batch): level 127 to 72, clipped 396 to 285, overflow 28 to 12, askable 121 to 61; covered was 2287 with the first panel (it floated over the table) and is 4 at 1440 after the panel moved beside the page (what remains: the Report this button under the panel, and main's load toast). The rest are older failures, listed in the batch report.
QA: 325 tests pass, 12 skip (test/batch10.test.js covers every exclusion, the migration, levels, Everything else, Phone, the chips and the timing mapping; run with TZ=UTC: overnight-1a's bring-back test fails in America/New_York, before this batch too). In Chromium at 1440, 1280 and 390, light and dark, on a new client and the Demo client: no console errors, no sideways scroll.

## Intake form (session 1) (Nov 5)

A Google Form the client fills before session 1, made from SLAM's own question list, and Import intake (CSV) to bring the answers back. Session 1 depth only: About you, Why now, the What applies to me switches, take-home, the gut spending number, cash, investments, home, car, debts by type and the FI age, which is what the S1 checklist (accounts, top-line numbers, Money in one line) and its review (income, spending, accounts) need.

1. js/registry/intake.js: 18 sections, 43 questions, each with a stable id, the SLAM field or Fast Track answer it fills, the client-facing title (written to "you"), its type, choices, the section a tap goes to, and the status the answer gets. Money is ranges with "I'm not sure" and "I'll find it and tell you"; take-home is a short number with a "that is per" tap (each paycheck by frequency, a month, a year). Why now is three checkbox questions whose choices are batch 10's chips (read from js/whynow.js, so they cannot drift) plus Other, each followed by an optional "in your own words" box. Ticked chips land on profile.chips, Other's words on chipOther, the words box on the question's own words. Alexis's path is 31 questions; Tom's branches into his benefits, other income, account counts, home, car loan and rental, 41.
2. tools/intake/build-form.mjs writes tools/intake/SLAMIntake.gs: paste it into script.google.com and run createSlamIntake(). It makes the form (title, description, progress bar, sections, Go to section based on answer, a number check on take-home) and links a responses Sheet, and logs the links.
3. Question ids travel by title: a Google Form's responses CSV heads each column with the question's title (a grid adds " [row]"), and the registry is the id-to-title map, so clients see no codes. Titles are unique (tested); a title Eli rewords later goes in the question's aka, and a column nothing matches shows in the review as one SLAM could not place.
4. Coach tools > Data (and the One-pager, wherever Bring a spreadsheet back is): Import intake (CSV). Several responses: pick one by name and when it was sent. Its name differs from the open client: a new client named from the form, or into the open one. The review is the Bring a spreadsheet back pattern: sections folded to counts, Yes or No on each line, with what they said, what it becomes in SLAM and what SLAM has now (a number already in SLAM starts at No). Save takes a snapshot, applies everything as one undo step, and the toast has Undo.
5. js/intake.js maps answers (pure, tested): a range is its midpoint marked Gut (stored Not sure, a Guess on its face, Picture level Gut); a typed number is Roughly; a tap that answers a gate is Know it; "I'll find it" is Will get it on the field, so it lands on the Homework list with where to look; "I'm not sure" and the last "anything else" box become parking-lot notes for the call. Money lands through applyFastTrack, so the rows are the ones Fast Track makes; other income, other property and the account counts make their own rows. Rows it made or changed say From the intake form.

QA: 349 tests (337 pass, 12 skip without the private fixtures; rebased onto batch 10) (test/intake.test.js: the registry, midpoints, chips, gates, the Alexis and Tom paths, the .gs is current, a fixture CSV with made-up Alexis Sample and Tom Example imported into a new client gives the expected Fast Track numbers, levels, homework and notes, and Undo takes it all back). The importer checked in Chromium at 1280 and 390 (pick, review, save, undo; no console errors, no sideways scroll), and the layout checker's own scan on Data, the pick and the review at 1440, 1280 and 390, light and dark: 0 failures.

## Batch 11 (Nov 5): one answer on debt, the debt-free date on Home, FOO names, credit health

Built for clients starting from negative net worth (the test client "Maya": $5,200 take-home, $3,500 spending, $6,000 on
cards at a guessed 25% paying $200).

1. The debt rule, one answer everywhere: while any heavy debt (8% or more, or a heavy type) is carried, the monthly surplus goes to it first by default (RULES.debtFirst, js/math/metrics.js debtRuleOf; a Heavy debt first / Invest from today toggle on Plan › Goals, assumptions.debtFirst). One plan (js/math/debt.js debtFirstPlan, M34): every debt keeps its own payment, the surplus and freed heavy payments go to heavy debt in the payoff order (a promo ending soon first), low-rate debt keeps its own payment. Every debt has one payoff date on FOO, Debt, Credit cards, Debt payoff, Current vs Proposed (a new Debt free row), the ladder, Home and Report; a screen showing another assumption says it in one line ("If only the $200 payment is paid: Nov 2030"). The FI date invests what the paycheck puts in while heavy debt takes the surplus, then the surplus plus the freed payments (fiDate before; the sheet's M53, its new parts and the Projections rows do the same, checked in LibreOffice). The Scorecard ranks a hole at a later FOO step behind heavy debt. Report copy says where the surplus goes; "which is strong" is gone. The spec's Demo check keeps the surplus invested from today (fiPaths.invested). Maya: debt free Mar 2027 everywhere; Debt ranks above Retirement accounts.
2. Plan › Debt payoff unlocks once a debt has a balance and a payment; a guessed APR says so in one line with a link.
3. The debt-free card leads Home while heavy debt is carried: the date, what goes to debt a month, the next milestone with its dollars left, +$50 / +$100 / +$250 a month chips (a what-if: the new date, or the same month with less interest and a smaller last payment; Make it the plan saves settings.debtExtra), and the milestones (25% gone, 50%, first debt paid off, debt free) folded.
4. FOO names: every step is a headline, "Name · specifics" and "→ what you get", from one table (js/registry/foo.js STEP_NAMES); tiles show the number and the headline. The old names are gone from the code; the spec's Program tab regenerated.
5. Net worth: Debt shows the cards as one linked row "#1 Credit cards (1) · $6,000 › Open" in the payoff order, never "No debts yet"; a card row has one status (a blank APR marked Not sure reads Rough, as the footer counts it) and a faded 25% in the APR box with Use 25%; a Fast Track card total with a payment is Carries a balance; the Institution box is a small "+ Add bank" (Add issuer, Add lender) link that becomes a label once picked; names wrap; the account type select is wide enough for Savings or HYSA.
6. Credit health (Credit cards, slim): the score, where and when, and overall utilization on one line; folded below, each card's limit, utilization, opened month (two taps) and age, the oldest and average account age, late payments and hard inquiries in the last 2 years as tap counts, and the freeze at Equifax, Experian and TransUnion (three taps). Fields credit.freeze*, settings.debtExtra.
7. Plan fixes: the Save more slider fills from its zero mark (+$0 sits on the mark); Current vs Proposed starts Retire by from the FI age on Goals; How we got this is a small icon at the end of each row opening the same steps in a popover.
8. parkedBack reads a bring-back date as noon UTC, so it is due on the same day in every time zone.
9. A typed 0 is an answer: an area answered none (About you, or a 0 typed in Fast Track) counts as $0 for cash and invested, and Fast Track keeps the area on with a $0 row, so the FI date unlocks.

Export format 15. QA: tests in UTC and America/New_York (test/batch11.test.js covers each item); the layout checker on the touched screens; before and after screenshots of each item at 1280 for Maya.

## Batch 17 (Nov 5): the plan after Phase 3, the engine designs, the skill library as data

Docs and data only; no screen changed.

1. ROADMAP.md: Phase 3 sign-off criteria (QA.md's 12 categories with no blocker or major on every screen, the layout checker near zero, the personas green in both time zones, QA.md's effort targets, Eli's sign-off on feel), then Phase 4 (Track 1 Quantum Collapse: priors by age, ranges on every key output, Ask me next, age-only start, a certainty meter in place of Picture %; Track 2 real lives wave 1; the library's first slice), Phase 5 (one year-by-year projection engine with full tax depth, the dual-age view, decumulation and Social Security, go-go/slow-go/no-go, Triple D then Monte Carlo; wave 2), Phase 6 (the multimillionaire stage and next stages; wave 3) and Phase 7 (client portal, between-session logging, sync, PDF statements, the call copilot, intake from transcript). Each phase: goal, features, engines, done means, risks, and which older rooms port there.
2. docs/roadmap/inventory.md: every room, engine and data file of the older suite (public repo Sapphirestoneage/personalfinance), plus its coach edition, first SLAM, coach app and D&D app, one line each with what SLAM has and a call: Port 101 (P4 33, P5 31, P6 32, P7 5), Fold 59, Drop 120, in 280 rows.
3. docs/roadmap/named-tools.md: how the quantum collapse onboarding (built as situation gating, the five-input opening, the doors and the cost of not knowing; no file of that name), the tax calculator (engines/tax.js in named steps), the dual-age retirement calculator (most likely The Bridge with The Number's stop and coast ages and the trap test) and the FI Skill Tree work today, with inputs, math and outputs, and where each lands.
4. data/library/skills.json: the 625 skills (25 trees of 25 levels, leverage S, A, B, C, the 312 lanes both ways) with SLAM's draft tags (Scorecard area, FOO step and the rule that set it), built by tools/library/extract-skills.mjs from the older suite's JSON; registered in REFERENCE_FILES (js/registry/assumptions.js) with source and date; test/library.test.js checks 625, unique ids, levels 1 to 25 per tree, prerequisites and lanes resolve, no loops, tags name real areas and steps, and every data/library file is registered. No UI.
5. docs/engines/: priors.md, ranges.md, projection.md, next-best.md, library.md (purpose, inputs, outputs, formulas in plain words, data and sources, test households, build order each), and priors-sources.md (a draft table of public figures by age band: CPS income, BLS CE spending for 2024, ACS rent, SCF 2025 net worth, retirement and card figures, FSA student loans, SHED emergency savings; each marked Primary or Secondary, with what could not be reached).

QA: tests in UTC and America/New_York (test/library.test.js is new); no screen touched, so no layout or QA.md scorecard change. Questions 201 to 211.

## Batch 16 (Nov 5): personas, every avatar and user landed

Twelve made-up households that run SLAM end to end, each checked against QA.md, so every batch proves it works for real
people, from someone below zero to a multimillionaire. No app behavior changed.

1. tools/personas/defs/*.mjs: Alexis, Tom, Maya, a deficit, an unmarried couple splitting 60/40 by income, a married
   couple with one paycheck and a baby, three adults in one home, a tipped bartender, a 1099 dancer, a fan-site creator
   with a part-time job, a worker planning gender-affirming care, and a 52-year-old with $4.2M. Each def holds the
   household, 7 to 13 numbers a coach expects worked out by hand (the arithmetic in each note), and what SLAM cannot
   represent for that person yet (cannot: the Phase 4 list).
2. tools/personas/build.mjs builds each into the app's own backup file (exportFile; the usual list added as for any new
   client, then the batch 10 pass), in fixtures/personas/, so each opens through Coach tools › Data › Import. --check
   says when a file is out of date.
3. test/personas.test.js: every expected number against the app; a known gap carries a finding id and shows as a todo
   (F-GUT, F-529, F-LATE); the FOO step two weeks later; one debt-free answer and one surplus per persona.
4. tools/e2e/personas.cjs: each persona through Import in the browser, every screen at 1280: console errors, What's
   missing, the layout checker's own scan (tools/e2e/layout.cjs now exports its checks when required), and story checks
   (no "no debt" with debts, locks asking for what the household cannot have, negative or contradictory paycheck words,
   one answer per number across screens).
5. tools/artifact.mjs: a private full household at fixtures/<name>.household.local.json (git-ignored) opens the page
   straight into that whole household; otherwise as before.

QA: 512 tests in UTC and America/New_York (490 pass, 12 skip, 10 todo: the persona findings). The persona run: all 12
load through Import, 0 console errors; findings ranked in the batch 16 report.

## Nov 6 2026: F-LATE fix (late bills only when they can be late)

A payment with no due day landed on the 1st and, from the 7th, counted as a late bill, so every client dropped to FOO step 1
for the rest of the month (Batch 16 finding F-LATE, question 215). js/math/foo.js now counts a late bill only in a month the
client is tracking (at least one payment marked on the calendar), only for a real due day (not a guessed day or a spread
weekly amount), and only 6+ days past it and still Planned. test/late-bill.test.js covers both sides; the persona
"FOO step holds two weeks later" checks are real tests again and pass for all 12.

QA: 519 tests in UTC and America/New_York, 0 fail.

## Nov 6 2026: Eli's answers on the roadmap tools (questions 202 to 204)

The dual-age view does both (The Bridge's two ages and both partners'); the 625 skills stay public, credited to Eli,
built in conjunction with Jonathan Mendonsa; Quantum Collapse, the FI Address and the personality types were earlier
standalone tools, described in docs/roadmap/named-tools.md from Eli's past chats and placed in ROADMAP.md.

## Batch 12 (Nov 5): the money and plan side

Freed money now follows SLAM's own order, a month that is short gets its own card, and the one-pager opens with the
next three moves. Test client Maya ($5,200 take-home, $3,500 gut spending, $6,000 on cards paying $200).

1. Freed money follows the FOO (M79, js/math/flow.js freedFlow, RULES.freedFollowsFoo; QUESTIONS 196, Eli: "but actually
   measure the next best opportunity"). Heavy debt first (the batch 11 plan), then the surplus and the freed payments
   fill big e (the Rule of 5 target less the cash already in the layers), then Tax-Free Growth (the Roth IRA and HSA
   room this year), then the rest is invested; low-rate debt keeps its own payment. metrics runs it once
   (m.fooFlow); the FI date and its ranges invest only what the paycheck already puts in until big e is full
   (investing.before), and FOO, the ladder, Next step, Current vs Proposed, the FI card, Report and the debt-free card
   ("After that, $1,900 a month fills big e by Jan 2028, then the Roth IRA by May 2028") read it. The next best
   opportunity (M80, nextBest, RULES.nextBestMin $100): each step the money goes to is compared by yearly value with
   the match not yet taken, a debt above what the step earns, a debt before its promo ends; a winner is one line on
   the step ("Worth a look: ..."), shown once, and the order never changes. Maya: heavy debt Mar 2027, big e Jan 2028,
   Tax-Free Growth May 2028, FI Apr 2048 (257 months). The persona defs' FI months are redone by hand (8 personas).
2. The calendar spreads the gut number: while spending is the gut number, what no real line covers (less the debt
   payments when the gut number includes them) is Spending money week by week (js/math/calendar.js gutSpread); with
   some lines it reads "Spending money (not on a line yet)". Statements skip it (an estimate, not a transaction).
3. Budget: "No lines yet: your gut number is your spending number." With some lines, the comparison plus how many
   categories are still gut-only (spending.js gutVsLinesWords).
4. The debt-free card on a plan of 12 months or fewer: +5% / +10% / +25% of what goes to debt (rounded to $10,
   RULES.shortPlanMonths); every chip says the month it lands in or "same month". Maya: +$100 same month, +$190 and
   +$480 Feb 2027.
5. The gap (M81, js/math/gap.js): "Your month is $X short." on Home (in place of the debt-free card), and at the top of
   Plan › Goals and FOO, with three levers and what each closes (a quarter of the largest Level 1 or 2 line that can
   move, or a tenth of the gut number; the largest cuttable subscription; extra shifts or a side gig, a box the coach
   fills, program.gap) and Use the gap, which proposes the plan on Current vs Proposed (a new Extra income a month
   choice). FOO step 1 carries the gap as what is left and later dates wait on it; the Scorecard folds the holes the gap
   causes (emergency fund, retirement, investing) into Cash flow. Persona findings: in a short month Home no longer
   says "free to spend" or "money left over"; a client past FI reads "You are past your FI number: $X invested against
   $Y, $Z over".
6. Report › One-pager opens with Your next 3 moves (M82, js/math/moves.js), each with dollars and a month and a link;
   Send summary carries them too.
7. Why now goal chips: Emergency fund opens FOO step 4, Start investing step 5, Buy a home and Save for a big event add
   a Fund the Future goal (an event saved for each month).
8. The spec's Demo FI check is the plan the app shows: 294 months, a formula on the Demo client tab.
9. QUESTIONS 186 to 200 answered.

Export format 16. QA: tests in UTC and America/New_York (test/batch12.test.js); the layout checker; before and after
screenshots at 1280 (and 390 for Home and the one-pager).

## Nov 6 2026: step 1 before heavy debt, and the next move's dollars (batch 12 follow-up)

Question 217: the surplus now fills FOO step 1 (buffer, little e, income gaps within 12 months) before heavy debt,
so the money follows the step order (js/math/debt.js surplusFrom, js/math/flow.js step 1 phase, metrics wiring;
the Debt payoff view and the chips pass it too). Bartender persona redone by hand: debt free 7 months, FI 349.
The one-pager's first move now shows its parts ("the $200 going now plus the $1,700 left over") so it squares with
the surplus tile. QA: 525 tests in UTC and America/New_York, 0 fail, 2 todo (F-GUT, F-529).

## Nov 6 2026: Batch 15, the needs-work items from the feature audit

1. Household tax once (js/math/income.js householdTax, metrics). Income tax per return (Married jointly: one; else one per
   person), FICA per person with the Social Security wage base per person, rows stacked (jobs, 1099, unemployment), each
   row's share shown on Taxes. Two W-2 rows of $60,000 and $40,000 pay what one $100,000 row pays. A row typed as take-home
   keeps what was typed; what its paychecks hold back less its share is the "two jobs" gap on Taxes. The workbook's Income
   tab stacks the same way (SUMIFS by return and order) and matches in LibreOffice.
2. Couples keeping money apart (metrics coupleBills): a shared bill (Joint, or Split with the partner) counts once and whole
   for the household and at each person's share (By income, typed, or half) in each view; Paid to my partner and From
   partner stay in each view and leave the household; every gut number in a view adds up. Dating and Living together show
   this client's own plan everywhere, the partner's as the switch (registry/couples ownPlanPerson, question 212).
3. Quarterly estimates: the tax 1099 income adds (SE tax in) as a rate and four payments with the IRS due dates, on Taxes
   and on the calendar (1099 pay lands before tax; the tax goes out on Apr 15, Jun 15, Sep 15 and Jan 15). A blank
   variable-income set-aside uses that rate.
4. Materiality at the real hourly wage (time.materialityOf, plan.next3): 2 hours at the wage, never under $100.
5. Promo payoff on screen (debt.promoPayoffOf): the card row, its panel, and an agenda suggestion.
6. Known changes ahead (js/math/changes.js): Becomes mine in, a new Starts in on any Budget line, and benefits that end feed
   the FI date, the debt plan, the ladder, the timeline, Big deals, retirement spending and the calendar; Goals lists each
   in one line. The sheet's M53 runs in segments (four change slots).
7. The FI range: wider than 5 years shows the one step that narrows it.
8. Quiet Quitting FI said plainly once reached; a win needs real numbers (blank balances or blank debts are not known yet).
9. Bills list: Cash flow › Calendar › Bills list, every repeating charge by next date with Keep or Try to cut; Find
   reaches it with bills, subscriptions or recurring.
10. Community presets on About you › Your community and calendar, one switch with Coach tools.
11. Irregular income: base month, good month, where the extra goes, a lean-season fund.
12. Is it worth paying for? on Goals (collapsed): a service against the hours it saves at the real wage.
13. Unemployment as an income type: weekly taps (NY most $869, registered), start and end dates (26 weeks from start),
    10% withholding as a choice, taxed federal and state with no FICA, weekly on the calendar until it ends, then out of
    every projection, with the one-line Plan note.
Also: a 529 or a Goal account stays out of the FI path (question 214); the Home paycheck line uses the household's pay.

QA: 540 tests in UTC and America/New_York (547 pass after the batch 12 rebase, 0 fail, 0 todo: the F-GUT and F-529 persona todos now pass; couple-joint now 293 months); test/batch15.test.js has 21, one a LibreOffice recalculation of the tax formulas, joint and apart. Layout check (1440 light, quick): 18 level, 30 clipped, 4 overflow, 5 covered, 76 askable, the same as before the batch (no new failures).

## Batch 14 (Nov 6): Find understands people, Walk me through, Start session 1, the effort scoreboard

Eli: "Part of the problem is I don't know how to enter everything because I don't know where everything is." The aim:
about 20% of the effort for 80% of the picture, a clear way to 99%, and every release makes both easier.

1. Find understands people: a table of everyday words (data/reference-2026.json findWords, registered as a word list
   with its reason; js/find.js) sends 39 terms (rent, 401k, emergency fund, payday, credit score, life insurance ...) to
   the right screen and box as the top result, landing on the box itself (a Budget line inside its category, a field in
   a row's Details, a switch in a closed More block). Punctuation and spacing do not count ("401k" is "401(k)").
2. Add goes where it belongs: an account word adds an account on Assets, a loan a debt, insurance a coverage row, an
   income word income, a spending word (or a name with an amount) a Budget line; home value or FI age offer no Add;
   anything unsure offers "Make a note for later" (the parking lot). "401(k) match" no longer reads as $401.
3. Results say whose they are: "APR · Car loan", "APR · Credit card"; a field name shared by several groups says its
   group; identical results show once.
4. test/findability.test.js and tools/e2e/findability.cjs run the 39 terms on the Demo and a Fast Track client.
5. Walk me through (Home's session strip and the docked agenda bar): every empty or rough box in session order (the
   session 1 checklist, then About you, Income, the filing status, Budget categories, Assets, Debt, Credit cards,
   Protection, Goals), one at a time, with a slim bar "3 of 14: Rent's due day · Skip · Will get it · Next"; the box is
   outlined and focused and works as usual; Esc leaves (js/walk.js, js/ui/walk-ui.js).
6. A brand-new client's Home is one card and one button, Start session 1 (it starts the session, runs Fast Track, then
   Walk me through); the program, the path and the picture wait in a fold until there is data.
7. Fast Track's tap step (step 2 of 9, What applies): kids, pets, car, housing, HSA, FSA, equity, work, household,
   state and the Why now chips, with About you's own toggles; the last name comes from the client name. Core About you is
   100% after Fast Track.
8. X of Y filled on Budget, Taxes, Protection (with no rows: the usual list) and Goals; fillCounts lists every
   screen's core and full counts. tools/e2e/effort.cjs runs Alexis and Tom and prints the scoreboard (QA.md, README).
9. The usage log (js/usage.js, doc.usage, registered; no dollar amounts): time and clicks per screen, back presses,
   undos, Find words that found nothing, Show me dead ends, the walk's steps; Coach tools › Data exports it as CSV. End
   session asks the coach, optionally, "How easy was that session? 1 to 7" and "Where did you get stuck?" (kept on the
   session record, program.reviews).

QA: tests in UTC and America/New_York (test/findability.test.js, test/batch14.test.js); the findability and effort
scripts; the layout checker; before and after screenshots at 1280 and 390.

## Batch 13 (Nov 6): organized and obvious, the caret on every section, slim strips, nothing covering anything

Layout, visual polish and Don't Make Me Think across every screen, for a coach driving SLAM live and a first-time client watching.

1. The caret pattern, everywhere (js/ui/sections.js, css/layout.css). Every section on every screen has the same header: a bordered caret button with the section's title; closed, it shows a one-line summary ("Irregular and yearly costs · 0 costs", "Cash layers · 1 of 3 layers full", "About you · age 29 · NY"). The core section of a screen starts open (the list on Assets, Debt, Credit cards, Protection and Income; Budget by category and the gut number; Filing on Taxes; FI date and assumptions on Goals; the path and the steps on FOO; Holes on the Scorecard; the last 6 months on Month end; Why now and What applies to me on About you; Metrics on Report › Overview); the rest start closed: charts (Hide is now the caret), totals, Cash layers, Institutions, Life admin, Credit health, Comes out of your paycheck, Variable income, Benefits, Irregular and yearly costs, Fast Track totals, Joy by category, Community presets, Milestones, These are big deals, The FI ladder, the FOO settings, OK and Strong on the Scorecard, the running balance on the Calendar, the CSV import on Month end, the one-pager's four boxes, History's sections, Is it worth paying for? (batch 15) on Goals. Open all · Close all sits at the top right of any screen with two or more. Which are open is remembered per client in this browser (localStorage, wrapped in try/catch, in memory when blocked): a view setting, not the client's money, so it never enters the file, the undo stack, the change log, the export or the workbook. Show me, Fix it and Find open a closed section before they land.
2. Slim strips (Monarch's summary). Cash flow on Income, Taxes, Budget, Calendar and Month end is one line: Take-home, Spending, Savings (when there is any) and Free, each still a Show the math button; the caret opens the whole waterfall. Net worth is one line with all four (Total, Liquid, Assets, Debt); the caret opens the cards with the change since last session. The Budget's own totals (Fixed, Variable, Yearly set aside, Lines vs gut or Per paycheck) are a third slim line the same way.
3. Side panels push the page and nothing they do not own sits under them. The panel closes when you leave the screen (it belongs to a row there), switches between beside-the-page and bottom sheet when the window crosses 760px, and moves the agenda bar and the pinned parking lot over (both columns side by side at 1440 and up; the parking lot steps aside below that). Report this left its floating button: it is More › Report this screen, on every screen.
4. The layout checker: see the numbers below. Fixes: helper text and boxes level (Fast Track grid, the gut card, the 401(k) first pass, the Scorecard's needs row, Current vs Proposed); clipped placeholders (APR, months left, premiums, the Scorecard's refund box, the 401(k)'s other before-tax box), the card bonus date is a date picker (no typed YYYY-MM-DD); calendar chip names carry their full name and amount as a tip; the Income table fits 1280 for couples and long names (names wrap, the Owner column is one slim chip that opens the three choices, shorter pay-frequency and per words, tighter cell padding below 1440); the onboarding timer fits a phone. Show me lands on the real box: the income, asset and debt Details boxes now carry their handles (pay frequency, income type, 401(k) a paycheck, APY, Roth or traditional, paid off or financed, stress, federal or private, credit limit), a category's Fix it lands on its amount box (or the From Debt button), and a credit card's field asked on Debt goes to Credit cards (On this screen lists only boxes on this screen).
5. Consistent controls. Short lists are taps (S.tapPick): About you's Work and Household, Health coverage, Work situation, Fast Track's pay frequency, rewards, repayment plan, forbearance, vesting, income type, account purpose, filing status, W-4 status, Social Security, the money date, who covers a bill, the launch move; Need, want or wish and the Budget's Period are toggles. The side panel's second Amount reads "Each time". The row's status and its clock (Will get it) sit level on one line, the clock icon-only with its name in the tip.
6. Plain words on screen, the term in a hover tip: Biggest share of take-home (was Biggest DRAFTT letter), Job-loss fund target (big e) (was Rule of 5 cushion, on Overview and Assets), Tax on your next dollar (was Marginal bracket and "Last dollar"), Can stop saving and Bare-bones FI (was Coast and Lean), your low-balance line (was the Buffer, on the Calendar), Spending group (was DRAFTT in Group by), Paid no matter what (was The floor), chart names without DRAFTT or Rule of 5, Fast Track's and About you's Rule of 5 wording.
7. Home for a returning client: the debt-free card first when heavy debt is carried, then the agenda, then the whole picture (open), then everything else as closed caret sections with their one line (Money in one line shows its sentence, Next small things, The ladder, Next paycheck, Open items, Top holes, Holes filled, Next chapter, Confidence and Joy, Day 0 vs now, Net worth over time).

From the persona run (batch 16): Housing % reads the mortgage payment for a homeowner with no rent line (M2A, app and sheet); Overview shows "No cards" for utilization with no card and 0% debt-to-income with no debt; the debt-free date says "Freed payments roll into the next debt" on Debt, Debt payoff and Home.

Also: the calendar's "Paid off" and "Debt-free" wins read the one debt plan (m.debtPlan, answer to Q221), cached per change; the weekly spending bar reads "Spending" with the full name and amount as its tip.

Layout check (tools/e2e/layout.cjs, all widths and both themes, Demo and a new client): before (main at 8cc9b3b) level 87, clipped 119, overflow 12, covered 1186, askable 76; after (rebased on batches 12, 14, 15 and 16) level 0, clipped 1, overflow 1, covered 3, askable 0. What remains: the "Example numbers loaded" toast in the moment just after loading the Demo (covered 3, gone after 5 seconds); a hover tip on Move to next session where the run's last click left the mouse (clipped 1, 390 dark, a tooltip, not the button); Current vs Proposed 10px wide once at 1440 light, which did not reproduce on its own (overflow 1). Persona run at 1280 (tools/e2e/personas.cjs): the first run on this branch (mid-batch) had 53 layout items and 23 story notes; now 1 layout item (a hover tip on Move to next session, where the run's Import click left the mouse) and 7 story notes, outside layout. At 390, Next 12 months' sinking funds were wider than the phone (on main too): the rows are cards now. Debt threw for a couple filing apart (on main too): a row the plan does not hold shows a dash.
QA: 559 tests pass in UTC and America/New_York (test/batch13.test.js: the wins and the debt plan, a homeowner's Housing %, the open-sections memory stays out of the file).

## Batch 18 (Nov 6): effort, a rough picture in 35 to 38 actions

Measured with tools/e2e/effort.cjs on Alexis and Tom (QA.md, Effort targets), against main at batch 13.

1. Measure first. A tap, a pick or a typed number is one action, keystrokes apart (QUESTIONS 232). The script prints
   every action in order with what it was for, a sensitivity table (each rough input moved on its own), what raises the
   Picture most and every box still open. Before: 58 / 56 actions, 71% / 73%, core 89% / 90%, FI 6.5 years wide.
2. One-tap typicals. Every empty Budget category offers "Use typical $X" (its starter lines' typicals, marked Roughly),
   on the Budget row and as the walk's first button; the walk's filing status offers the household's typical (Single)
   first. Paycheck fills in Every 2 weeks.
3. Cut actions. New client's first button is Create and start session 1. Fast Track: About you and its switches on one
   screen, No to the rest, Cash and investments on one screen, Home and car only when there is one to value, a blank FI
   age is "just show me the date", the work answer sets the paycheck's tax type. The walk moves on when a tap or a typed
   number fills the box, stops only at empty core boxes in session 1 (plus the guessed APR on heavy debt, the input that
   moves the debt-free date most), and asks Have it? for Health and Life only (it adds the two rows itself). About you
   asks Work and Housing once (What applies to me), not again under Work and home.
4. Certainty. Fast Track and the gut box ask where the spending number is from; Statements or an app counts at Estimate,
   so Tom's FI confidence is Medium (5%) and his range is 2.2 years (was 6.5). A typed 0 invested is a known answer.
5. Picture. Alexis 77% (her gut number holds it; her bank app's total would take her to about 90%), Tom 86%; core 100%
   for both. No weights changed.
6. The walk bar and toasts stack: a toast sits above the walk bar, the walk bar above the agenda bar (and the phone tab
   bar), nothing covering another (S.dockedHeight).
7. Actions to 99%: about 71 / 70 (was 105 / 112).

Also: Find's "emergency fund" lands on the Cash layers card first and the savings balance second (QUESTIONS 230; every
caret section's button carries data-focus sec:<id>); a Find target that opens a caret section opens it (giving lands on
the Giving switch again); "payday" follows batch 13's pay frequency box. After: 35 / 38 actions, 77% / 86%, core 100%.

QA: tests pass in UTC and America/New_York (test/batch18.test.js); effort, findability (76 of 78 before, 78 of 78
after), persona and layout scripts; before and after screenshots at 1280 and 390.
## Nov 6 2026: "worth doing" per client (Eli: "customizable like materiality")

The materiality bar (a fix counts when it saves more a year than this much of your time is worth) is now per client:
taps on Plan › Goals › More for 1, 2, 4 or 8 hours at the real hourly wage and a floor of $50, $100, $250 or $500;
blank keeps the defaults (2 hours, $100). Registered as client assumptions; export format 18.

## Nov 6 2026: typicals fit the gut number (QUESTIONS 241)

"Use typical $X" no longer adds up past the client's own gut number: when the empty categories' typicals would exceed
what the gut number leaves (after debt payments it includes and the categories already set), each is scaled by the
same share and rounded to $10 (js/math/spending.js typicalScaleOf, read by the walk and the Budget). Never scaled up.
Questions 240 to 249 decided; 242 (the session pace) waits for Eli. QA: 576 tests, 0 fail.
## Batch 21 (Nov 6 2026): Life Transitions, the first Phase 4 feature

A session that turns panic into a number (Eli's Nov 5 design chat). Plan › Transitions, behind a Phase 4 switch in Coach tools › Session (settings.phase4, on for a new household in this build). Find reaches it from job loss, laid off, quit, transition and runway.

1. Here and there: a template in one tap (job loss, quitting, student to first job, getting married, a baby, divorce or breakup, kids grown and out, something else), the start and the destination as taps, a start month as taps (or another month), and which income stops (the template's default, one tap to change).
2. The burn: full spending, DRAFTT needs, FAT and food and housing only, read from the Budget (DRAFTT and FAT are the cash layers' own numbers, one answer with big e), each with how long the money lasts at that level.
3. The options ladder, cheapest first, prefilled and priced: the checking buffer, little e, big e and other cash, cut to the basics (a level and when it starts; it buys time, it adds no money), side income or selling things (quick picks, and the ways to earn quickly), unemployment (batch 15's rows and end date; one tap adds NY's most), family help (from Backups, only if real), investments, a 0% card (0% until its promo ends), a regular card ("Using $1,000 for 3 months costs about $60"), retirement money last (the 10% penalty and tax from the app's own tax math). Each rung toggles.
4. The dip: an ECharts chart of the money left on every rung, month by month from today, each rung its own band, with Today, the end of benefits, each tripwire, the floor (the month the last rung runs out) and Plan B and C as dashed lines; the lines are spelled out under it. js/math/transitions.js (M90, registered with its spec row), tests in test/transitions.test.js.
5. Tripwires: if (a rung is reached, no offer by a month, money left under 3 months) then (a list of taps), placed on the dip, in order, and in the session agenda as suggestions.
6. Plan B and C: extra income from a month, a rung first, rungs left out, a deeper cut; one line each against the plan.
7. Share view: one page for parents or a partner (the situation, the plan in order, decided ahead, the worst case, it is handled), no coach notes, one switch to hide the costly rungs' dollars, Print.
8. A thirteenth persona, Riley Between (job loss), with every runway number worked by hand (tools/personas/defs/job-loss.mjs): DRAFTT $2,840, 24.0 months to Oct 2028; full 21.8, FAT 26.1, food and housing 28.0; Plan B 48.4.

## Batch 19 (Nov 6): columns that line up, rows that breathe, nothing stuck over a row

Batch 13 took tools/e2e/layout.cjs to zero, but it only compared boxes within one row. On Budget by category the
Accommodation box sat about 160px left of Food's (its "from the lines" pill shared the cell), Debt's "$780 · From Debt"
was clipped and pushed "a month" out of line, the status pills nearly touched, and the sticky "9 categories" totals row
covered the last row on screen.

1. Four new checks in tools/e2e/layout.cjs (README, Layout check; DESIGN.md rules 1b, 1c, 4 and 8). `column`: in a
   table, or three or more same-looking rows stacked in a list, the same kind of control (box, percent box, note box,
   dropdown, status pill, Details, the ... button, Will get it) shares its left and right edges within 2px; a button
   that shows its own words or a value (Use $120, a date) lines up on one edge; a list outside a table only compares
   rows built the same way, and answer chips are left out. `sticky`: a sticky header or footer that has left its place
   never sits over a row's controls (checked at the top, the bottom, and with each long list part way up the screen).
   `unlabeled`: a button with no words has a name and a hover tip, and its picture is one everyone reads the same way.
   `cramped`: at least 6px between the controls of two adjacent rows. The persona run uses them too.
   LAYOUT_ROUTES, LAYOUT_WIDTHS, LAYOUT_THEMES and LAYOUT_CLIENTS narrow a run while fixing; the new client is made
   with the exact Create button (batch 18's "Create and start session 1" made the old match ambiguous).
2. Budget by category: what the amount reads from ("$1,770 from the lines", "From Debt", batch 18's "Use typical $X")
   has its own column right before the box (under it on a phone), so the box is in the same place on every row; Debt's
   amount is a box-shaped "$780 ›" that opens Debt; rows are 52px.
3. Every list: the totals row ends the list instead of sticking over the last row on screen; each status pill and each
   Details button is one width; 4px of air above and below every row; Will get it says so in words; a guessed APR's
   Use and a box's typical sit before the box; the guessed APR box is the same width as the others; the hours chip
   after a balance is one width; a long name grows its box instead of spilling out. A list too wide for its card at 1280
   (Debt and Credit cards for a new client, a couple's Income) first drops the row hours chips, the payoff months, the
   clock and some padding, then, still too wide, the row's Will get it (the status menu and Will get all of these keep
   it), so nothing scrolls sideways (S.fitTable).
4. Phones: Debt and Credit cards rows are two-column cards; a toggle gets its own line; Will get it waits on the
   buttons line after Details so the status stays beside the box; name boxes are the full width; Month end's "usual"
   text holds one slot.
5. Elsewhere: the Scorecard's hole cards are one grid (Payoff, Effort, Best return, In the plan and the buttons in the
   same place on each); FOO's amounts end at the same edge, dates under them on a phone; Goals assumptions have the
   label over the control; Coach tools settings put the label on its own line on a phone, and its lists keep Fix now
   at the right edge; "Client view" and "Clear all" are words, not a screen and an eraser.

Layout check (all widths, both themes, Demo and a new client), before at c3224ac with the new checker: level 0,
clipped 1, overflow 1, covered 3, askable 0, column 353 (31 distinct), sticky 80 (5), unlabeled 1183 (46), cramped 0;
after (rebased on batch 18 and 5885f92): level 0, clipped 1, overflow 1, covered 3, askable 0, column 0, sticky 0,
unlabeled 0, cramped 0. The four left are batch 13's: the Demo's load toast in its first seconds (covered 3), the Move
to next session hover tip (clipped 1) and Current vs Proposed 10px wide once at 1440 (overflow 1, not on its own).
Persona run at 1280: layout items 629 before (unlabeled 414, column 44, sticky 148, cramped 11, clipped 12), 12 after
(the same Move to next session hover tip, once per persona); console errors 0 and story notes unchanged.
QA: tests pass in UTC and America/New_York; before and after screenshots of Budget, Assets, Debt, Credit cards,
Income and Goals at 1280 and 390.
## Nov 6 2026: the session pace asks for the most a session can do

Eli: "goal is as much as possible". PACE is now 85, 95, 99 by sessions 1 to 3 (was 40, 70, 90), held at 99; the session item reads "Whole picture 95% or more". Spec Program tab regenerated.

## Batch 22 (Nov 6 2026): import the month from Rocket Money, Monarch or the bank

SLAM never syncs. The client keeps tracking in Rocket Money or Monarch; at month end the coach drops the CSV export in.
Cash flow › Month end and Coach tools › Data have one button, "Import this month from Rocket Money, Monarch or your
bank" (Find: import, csv, rocket money, monarch, transactions). It replaces the old statement import's three steps.

1. Formats. Rocket Money and Monarch are told by their header row; any other bank CSV by its date, description and
   amount (or debit and credit) columns, and an unknown header asks once which column is which (kept for that header).
   One line says what was found ("Found a Rocket Money export: 23 transactions."). Columns, sign and source links are
   in Reference data (importFormats) and at the top of js/import/apps.js. Rocket Money writes spending as positive; the
   file's Income rows confirm the direction.
2. Matching, in order: the coach's rule for the merchant (settings.merchantRules), the app's own category through a
   map (importCategories in Reference data; a client's edits in settings.importCategoryMap, editable on the review),
   refined by merchant words inside the same spending group (Bills & Utilities plus RENT is Rent), then merchant words
   alone (merchantWords, and each line's own name). Paychecks (answer 168), transfers between the client's accounts
   (by category, words, or the same amount out of one account and into another within 3 days), card and loan payments
   and rows the app ignores stay out of spending. Each row says Matched, Guessed or Not matched.
3. The review, before anything is saved: grouped by spending group with its month total, Not matched first, each row a
   tap to pick its line (chips by category, or Not spending) and "Always put this merchant here" once placed by hand.
   Accept all matched, Accept these per group. A row placed by hand stays where it is until Save.
4. Save: accepted rows are kept dated (spending.transactions), add to the line's actual for the month (a refund takes
   off), make a line for a category the client has none for, mark the calendar Paid (a fixed-date bill's day, the
   paycheck, the card payment) and land paychecks on the Income row. Rows of another month never go in; a file brought
   in twice adds nothing (each row's date, amount and text, with #2 for a second identical row). One undo step.
5. Month end step 1 shows plan vs actual By category after an import (By line to type), M25's new part.

QA: 610 tests (597 pass, 13 skipped) in UTC and America/New_York after the rebase on batch 21; export format 20; test/import-apps.test.js with made-up CSVs in
fixtures/import; Maya's November from Rocket Money and from Monarch checked in the browser at 1280 and 390; layout
check unchanged (the same 4 old failures, none on Month end).
## Batch 24 (Nov 6 2026): ranges on the debt-free date, Roth contributions, Gross as all income

1. Gross is every income (QUESTIONS 228): the Cash flow waterfall's first step is "Gross, all income" (a paycheck's
   gross, a benefit before any withholding, untaxed money as it lands), so it never reads below take-home; the same on
   Report › Statements, the Statements tab of the export (a formula from Income M13 and M01) and the Overview cash flow
   chart. grossAnnual stays jobs only for the tax rates, the match and the Roth limit (js/math/metrics.js).
2. Roth IRA contributions (QUESTIONS 252): the account's Details show "Roth IRA contributions so far" with one tap,
   Same as the balance, before the box (the field rothBasis, renamed; the log by tax year stands in when it is blank).
   Life Transitions' retirement rung takes contributions out with no tax or penalty and taxes and penalizes only the
   growth, each account's tax stacked on the one before (one return). Riley's numbers do not change (no Roth IRA);
   test/transitions.test.js works a Roth on top of her 401(k) by hand: the rung goes from $31,202 to $40,380.
3. The debt-free date as a range (QUESTIONS 244, 245): js/math/metrics.js debtRangeOf runs the one debt plan again with
   each rough input at its low and high (a guessed APR 5 points, a balance marked Roughly or Not sure 10%, spending 15%
   for a gut number or 5% from statements) and combines the swings as the root of the sum of their squares
   (docs/engines/ranges.md). js/math/picture.js debtWordsOf shows it by the FI date's rules (a year range, the 5-year
   cap saying what narrows it) with the likely month under it; a range a year wide or less names its months. Home's
   debt-free card, Debt's strip and Debt payoff (with no what-if on) show it; Money in one line says "around". Alexis
   from Fast Track: likely Mar 2032, 2029 to 2033 (37 to 85 months, the guessed APR and the gut spending), which is the
   QA table's honest range. Rough invested balances now widen the FI range too (fiRangeOf, 10% either way): Tom 155 to
   185 months, still 2039 to 2042. RULES.aprGuessSwing and roughBalanceShare; M34 rangeLow and rangeHigh; FORMATS 20.
4. The app skills (QUESTIONS 207): data/library/app-skills.json, the older app's own 40 skills in six trees, the same
   shape as skills.json with their proof text, credited the same way, registered in REFERENCE_FILES and tested in
   test/library.test.js (tools/library/extract-app-skills.mjs). Their gates use the older app's 0 to 9 ladder, read
   into SLAM's step by meaning (its step 6, the Roth IRA, is SLAM's 5); tags.gate keeps the original.
5. A home's loan in one tap (QUESTIONS 248): Fast Track's About you asks Home loan (Mortgage or Paid off) when Own is
   picked. Mortgage adds a Mortgage row on the Home for the walk to fill (its balance and APR are walk stops); Paid off
   marks the home paid off and hides the two mortgage boxes on Home and car.
6. Report › Overview's tax rate reads the household's rates (as Taxes does), so unemployment alone shows 0.0% instead of
   a lock (the batch 21 story finding on the job-loss persona, now off its def).
7. Priors check (docs only): docs/engines/priors-sources.md now reads the SCF 2025 report itself (net worth by age,
   Table 2; card balances, student loans, Table 4; transaction accounts, Table 3; late payments, Table 5) and the SHED
   emergency savings table: those rows are Primary with table and page. Still unverified, each with why: the Census age
   medians and ACS rent (www2.census.gov and the Census API refused), the SCF retirement shares by age (not in the
   report; the historical tables not found).

QA: tests pass in UTC and America/New_York; layout check on the touched screens unchanged (the four old items);
persona run: no new findings, the job-loss Overview tax-rate major gone.

## Batch 23 (Nov 6 2026): Can I afford it? and Your Shockingly Simple Math

1. Can I afford it? (M83, js/math/afford.js; js/ui/afford-ui.js). A caret section first on Plan › Goals, reached from
   a slim "Can I afford…?" button on Home and from Find ("afford", "can I", "trip", "buy"). All taps: one-time, a
   monthly cost or a big goal; what for; how much (quick picks or a box); when (month chips; a monthly cost also asks
   for how long). The answer runs the plan twice, as it is and on a copy with the cost in, and says a calm one-liner,
   then three numbers (the tightest day on the calendar against the low-balance line, or the free money a month, or
   the set-aside; the date of the FOO step you are on; the FI date), then from where (YNAB: the money has to come from
   somewhere) and whether big e or little e is touched, then Make it a goal (a Fund the Future sinking fund) or Add to
   the budget, and Add to the calendar. Maya, a $2,000 trip in March: $500 a month from now, heavy debt done Apr 2027
   instead of Mar 2027, FI one month later, the tightest day Mar 8 at $3,350. Tom, a $400 a month car payment: FI 12
   months later (3 if it ends after 5 years). The deficit persona: "Your month is $400 short today ... Closing the
   gap comes first", with See the gap.
   A sinking fund on an event now ends at its month in every projection (a known change on the FI date, the debt plan
   and freed money follows the FOO, M79), so Make it a goal moves the Goals FI date by what the answer said. The trans
   persona's FI date moves from 220 to 175 months (hand-worked in its def).
2. Your Shockingly Simple Math (simple.js simpleTable and simpleWaterfall; js/ui/simple-math-ui.js). A caret section on
   Report › Overview, closed, one line ("At your 29% savings rate: about 24 years to FI from $0; your plan says 22.8").
   Mr. Money Mustache's table at 10% to 90% plus the client's own row, highlighted, at their return and withdrawal rate
   and at the original 5%; the assumption waterfall from the original table to their FI date. Credit in a tip.

Tests: test/afford.test.js (Maya, Tom, the deficit persona, the Simple Math hand calculation) pass in UTC and
America/New_York. Layout check on Home, Goals and Overview (Demo and a new client, all widths and themes): the same 6
covered (the Demo's load toast) before and after; the open sections scanned on Maya, Tom and the deficit persona at
1440, 1280 and 390, light and dark: 0 findings (the Move to next session hover tip on Home, clipped, is batch 13's).

## Nov 6 2026: taps no longer knock you up the page

Eli, on his phone in the Claude app: "when I click on a cell it knocks me back up". Three causes fixed everywhere: (1) keepPlace (js/ui/place.js) holds the page at its old height through every redraw until charts and fitTable settle, so a host that sizes or scrolls the page from outside never sees it shrink; (2) landing on a box (js/ui/arrive.js light) scrolls only when the box is off screen; (3) the walk moves on by itself only when the change was made in its own box or bar, so a tap elsewhere on the page leaves the walk and the page where they are. Effort scoreboard unchanged (35 and 38 actions).

## Batch 30 (Nov 6 2026): the card library

Eli (Oct 2026): "a credit card library of the bigger banks' cards with benefits as prefill templates: client names the
card, he selects it and tweaks, with materiality applied", and a client's credit beyond a simple debt view.

1. Data: data/library/cards.json, 67 current consumer cards from Chase, American Express, Capital One (and Discover,
   which it now owns), Citi, Bank of America, Wells Fargo, US Bank, Apple, plus store cards (Amazon, Costco, Target,
   Kohl's, Best Buy, Lowe's) and secured cards. Each: issuer, name, network, annual fee, typical APR range, standing 0%
   intro months, rewards by category (rate, caps, a point value in dollars), credits with their dollars a year and
   conditions, benefits in words, foreign fee, secured, the source link, the date checked and how: 50 on the issuer's
   own page, 3 on a review site where the issuer page would not load, 14 not re-read (each lists what to check).
   Written once in tools/library/cards-source.mjs; registered in REFERENCE_FILES; test/cards.test.js checks its shape.
   Sign-up bonuses are left out on purpose (they change weekly). Changes found tonight: the Sapphire Preferred refresh
   (June 2026), the $795 Sapphire Reserve, the $895 Platinum, Freedom Flex losing cell phone protection on Sep 20.
2. Which card is it?: a card row with no issuer has a small "Which card is it?" link (also in Details and in What
   your cards give you). A few letters (sapph, venture, active, or initials like csp) and one tap fill the name, the
   issuer (made an Institution once, then reused), the annual fee and the rewards type. Everything stays editable; the
   APR stays the client's own (the library's range is the APR box's hover tip). Demo: 3 actions.
3. Is it worth its fee? (M9C): What your cards give you, a section closed by default whose closed line carries each
   fee card's answer. Rewards are counted on the Budget's everyday lines (dining, groceries, gas, transit, streaming,
   drugstore, phone, entertainment, home) at the card's rates and caps; each credit and benefit has Use it / Don't;
   credits tapped Use it count their dollars; benefits are words only. "Worth about $X a year more than its $Y fee",
   "Gives back about $X a year less than its $Y fee", or under the client's materiality (MaterialHours at the real
   hourly wage, never under MaterialFloor) "About even ... a small win either way". When a no-fee 2% card would earn
   more on the same spending, one line says so (rule PlainCardRate).
4. Paying twice (M9C part): a held card with cell phone protection, rental car coverage or an extended warranty and a
   Budget line or Protection row named for the same thing gives a one-line note under the cards, always in view.
5. Your credit (M9D): Credit health is now Your credit. Its closed line reads the score, the share of limits used, the
   oldest card, inquiries and on-time history, and one line under the title, in view while closed, says what would
   move the score most (on time first, then under 30% with the dollars to get there, then under 10%, then fewer
   applications, then time). Rules UtilHigh, UtilBest, InquiriesMany. On a phone each card's table stacks (it scrolled
   sideways at 390 before).

QA: tests pass in UTC and America/New_York; export format 23; spec rows for debt.cardId, debt.cardUse, M9C and M9D
(tools/library/cards-spec.py adds the Math rows); Find: annual fee, card benefits, rewards, which card. Layout check on
Credit cards: 0 before and after (Demo and New, all widths and themes), and all checks clean with two library cards
picked and every section open at 1440, 1280 and 390, light and dark (the old 390 overflow in the per-card table fixed).

## Batch 25 (Nov 6 2026): who they are with money (Phase 4)

SLAM's own versions of three tools Eli built in chats (the FI Address, the FI Personality Test, the Money Mirror's weather and couples overlay; named-tools.md), rebuilt from their descriptions in original words. Behind the Phase 4 switch (settings.phase4). Never a gate, never a verdict: the letters only tilt which skills and which words lead. Find reaches it from money personality, personality, FI address, money weather, money stress.

1. Coach tools › Discovery: a collapsed section "Who they are with money" for the client that is open, with a disclaimer line (not therapy or a diagnosis; some questions are not really about money), three caret blocks and, for a couple, Who is answering and Side by side. Each tap redraws only the block, so the discovery table's typed boxes stay.
2. The FI Address: four characters read mostly from what SLAM has (familiarity from what is invested and the goal chips; route and target from the work situation and the FI goal; state from cash, runway and heavy debt; the feeling from a tap or the Confidence measure), at most four taps (how money feels, can earn more, can spend less, and chosen or imposed only when something is changing), the motion flag (* ~ !) and optional lowercase modifiers (equity pay read from About you). Shown as four boxes with words, and the route it implies in one or two lines. Alexis: NJU and the down arrow.
3. The personality letters: 12 one-tap statements (Agree, Neutral, Disagree), four axes (Earner or Keeper, Paper or Operator, Guardian or Venturer, Exiter or Savorer), 16 types each with a superpower, a shadow and 3 skill trees from data/library/skills.json. A tie leans on what SLAM knows; the letters show after the first 8 (two per axis). Client view hides the scores.
4. The money weather: 6 taps about the last two weeks, Clear, Fair, Overcast or Storm, kept per session and person (session.weather), with this session's Confidence beside it. At Storm one calm line suggests slowing the session down.
5. Couples: each partner answers the letters and the weather; Side by side shows both and one concrete ask each, from the axis where they differ most. The address is the household's.
6. Where it shows: the tilt (all 25 tree ids ranked: the type's three first, a couple's in turn) is kept at profile.identity.tilt for the library (batch 26), and the one-pager leads with one line (the letters and the wording they lead with; the weather is coach only).
7. Fast Track's done screen offers it as an optional step (Start, or Do this later in one tap); Fast Track itself and the effort counts are unchanged (35 and 38).
8. js/math/identity.js (M95, with its spec row), the wording in js/registry/identity.js, fields profile.identity.address, letters, tilt and later (sheet skip reasons, spec rows F460 to F463) and session.weather (app data), test/identity.test.js; made-up answers on Alexis (KOGS, the Homesteader, Overcast; 21 taps) and Priya and Dev (EPGX and KOVS, Clear and Overcast; 28 taps on the short read).

## Batch 20 (Nov 6 2026): Rocket Surgery, eight real tasks and the tweaks they asked for

Steve Krug's method, adapted: eight tasks (Alexis's first session, Maya's homework call and Month end, a couple keeping money separate, a short month, Tom's trip and raise, a job loss), each played by Eli and by a first-time coach, with every action, back press, wrong click, failed Find, dead end, hesitation and unclear word recorded. The report, the ranked findings and before and after counts are in docs/usability/2026-11-06-rocket-surgery.md; every visited screen's 12-category score is in docs/usability/scorecard-2026-11-06.json (with its route, for a sign-off page).

1. The running balance no longer takes out bills dated before today again when the start is today's checking, and only days from today on are flagged ("Cash dips on Sun, Nov 1" was rent already paid). MATH.md 13.
2. Toasts move aside when they would cover a button or a box; Find no longer shows "lives on" over the screen after landing on its box; new Find words for raise, what if, close the month and a short month.
3. An edit that moves the FI date, the debt-free date, what is free or the FOO step says so in one toast with Undo ("That moved the plan: FI 11 months sooner (Sep 2036) · $850 a month more free").
4. A new screen opens at its top; Back and Forward return to the place.
5. A couple with no combined totals sees the same person's plan on Home, the ladder, Current vs Proposed and the one-pager as on Cash flow and Plan, with the whose-numbers switch on Home, Goals and Debt payoff.
6. The employer match is one tap (the usual formulas, lists.matchPicks); an empty list's Add picker opens at its button; Home names both runways for a job loss; Month end says what a gut-only close leaves out and has Same as plan; Fast Track's count follows the answers and its end screen and the share view use plain words; the clipped Move to next session tip is short.

Before and after (16 runs): 169 actions to 138, 28 hesitations to 2, 6 dead ends to 0, 2 back presses and 2 wrong clicks to 0, tasks done 6 to 16 (task 4 partly: no household view in Living together; task 6 by Batch 23's screen). Effort scoreboard unchanged (35 / 38).
## Batch 29 (Nov 6 2026): the true cost of debt, borrowing, and the student loan decision

Eli's Level 15 Borrow design (Oct 11 to 12 2026), folded into Plan › Debt payoff as four caret sections, closed until
opened, all taps, every number from the client's own plan (js/math/truecost.js, js/math/studentloan.js;
js/ui/truecost-ui.js, css/truecost.css).

1. The true cost of each debt (M9T). One line a debt: the interest still to pay on the one plan and in today's dollars,
   the months of FI it costs (the FI date as it is, against the plan run again with that debt gone today and its
   payment kept), the rate after tax where interest is deductible (the student loan interest deduction; a home loan only
   when itemizing beats the standard deduction; a rental's or a business's loan as a cost of that income), and when the
   debt is still owed at FI with its payment in spending, what it adds to the FI number. Maya's card: $300 of interest,
   $299 in today's dollars, FI 4 months later (Aug 2049 against Apr 2049). Tom's mortgage saves no tax ($12,350 of
   interest under the $16,100 standard deduction) and carries $585,000 of his FI number; his rental loan is 4.94% after tax.
2. Thinking about borrowing? (M9L). What for (car, home, school, business, stuff, other), how much, up to three offers
   (rate, years, fees), and Pay cash beside them: the payment, the total, what it costs over the amount (and in today's
   dollars), after tax where it applies, the FI date, the debt-free month when it moves, the free money a month, and big
   e. Each offer runs through the plan on a copy, never saved. A new loan under 8% gives its payment back to the surplus
   when it ends (it does not roll into the next debt, so a car loan never moves the debt-free date sooner). Tom, two car
   offers and cash in 7 taps: $482 and $401 a month, FI 3 months later either way; cash takes big e from $34,000 to $9,000.
3. What it bought (M9L). For school or business borrowing: extra pay a year (quick picks), when it starts, the year it
   is paid back (the extra take-home adds up to the loan's total) and the FI date with the loan alone and with the extra
   pay. Dana, $25,000 for school at 6.4% and $10,000 a year more: paid back by 2031. Never a verdict.
4. Student loan decision (M9S). For federal student loans, held as one: Standard (the tiered plan for loans from July
   2026), IBR, RAP, and for a PSLF borrower IBR and RAP with PSLF: the payment, the payments, the total paid, the forgiven
   amount and the federal tax on it. The 2026 rules (the 2025 law: RAP from July 1 2026, IBR without the hardship test,
   SAVE ended, PAYE and ICR closing June 30 2028, IDR forgiveness taxed again from 2026, PSLF tax-free) are in
   data/reference-2026.json (studentLoans), each registered with its source and date, unverified items marked. Taps write
   the loan's own facts: PSLF, qualifying payments made (Payments left), First borrowed (a new Debt field).
   Dana Persona (new, the fourteenth persona): a PSLF teacher, $48,000 at 5.5%, AGI $55,500: Standard $520.93 a month
   ($62,511); IBR $263 with PSLF, 72 payments, $18,936 paid, $44,342 forgiven tax-free; RAP $231.25 with PSLF, $16,650
   paid, $42,789 forgiven. All match the hand calculation in test/truecost.test.js.
5. One answer with the FOO (forgiveness() in js/math/foo.js): a PSLF loan with its payments left typed now ends on the
   one debt plan at its forgiveness month (what is left is forgiven), and a what-if extra or a freed payment never goes
   to it. Dana is debt free in 72 months on every screen. No line ever tells a forgiveness borrower to pay it off fast;
   the words say what paying more does instead (it only lowers what is forgiven).

Tests: test/truecost.test.js (Maya, Tom, Dana, the rules) pass in UTC and America/New_York. Find: "true cost",
"borrow", "refinance", "PSLF", "loan forgiveness", "earning power" land on the sections.

## Batch 27 (Nov 6 2026): income by type (tips, shifts, platform payouts, cash kept)

Phase 4 Track 2, wave 1. Math in js/math/earnings.js (folded into each row's take-home by incomeRow, M12); the screens
in js/ui/earnings-ui.js. Taps first, slim and closed until asked.

1. Tips on a Job row (Tips and shifts, a closed caret in the row's Details): card tips (on the paycheck, taxed there),
   cash tips (a shift or a month), the tip-out (% of sales with sales a shift, % of tips, or dollars a shift, with
   quick-pick chips), and Cash tips reported? (Yes / No). Cash tips kept count for the plan either way; one calm line
   says roughly what the tax on them would be, and a hover tip what reporting changes (Social Security record, the
   income a lender sees, the federal tips deduction). The tips rules are registered (tax.tips: the $25,000 deduction,
   2025 to 2028, the $150,000 / $300,000 phase-out, $100 per $1,000; Pub 531's $20 a month and the 50% penalty),
   sourced to IRS IR-2026-49 and T.D. 10044 (Federal Register Apr 13 2026). The deduction is shown, not yet taken off
   the household's tax (Phase 5 tax depth). Riley the bartender: $900 every 2 weeks ($1,950) plus ($140 cash - $30
   tip-out) x 13 shifts = $1,430: $3,380 a month, $260 a shift.
2. Shifts: shifts a week (taps), pay a shift or hourly x hours, a house or stage fee a shift, the take-home a shift.
   With no paycheck typed the row's gross comes from its shifts and is taxed on the household's return (a 1099 row
   takes the fee and tip-out off as business costs). Slow and busy months (month taps, shifts a week then) scale the
   calendar and fill batch 15's irregular income view in one tap (Use your shifts). Nova the dancer: ($575 - $80 -
   $20) x 13 = $6,175 a month before tax, $4,775.81 after it, $367.37 a shift.
3. Platform income rows (OnlyFans, Fansly, Patreon, Etsy, Uber, DoorDash, Upwork, Other as taps): gross a month, the fee
   and hold prefilled from the registered Platforms table (each row with its source), chargebacks a month, the payout
   schedule (Pay frequency). Taxed as self-employment on what is paid out; the calendar lands each payout its hold
   days after the payout date. Kai the creator: $3,125 - 20% - $150 = $2,350 paid out, $1,755.88 after tax, weekly
   payouts landing 7 days later.
4. Cash kept: Cash on hand counts as cash with a one-line loss-risk note; Purpose: Taxes keeps quarterly tax money in
   net worth but out of emergency cash, the layers (big e, little e), the runway and the Rule of 5, shown on its own on
   Assets and under the layers. Nova: cash $8,300, set aside for taxes $3,500, runway 2.5 months.
5. The bartender, dancer and creator defs use all of this, every note hand-worked again (the dancer's and creator's
   FI notes were garbled by an earlier replace and are rewritten), the fixtures rebuilt, their cannot lists cleared.

Tests: test/batch27.test.js (11) and the persona suite pass in UTC and America/New_York. Layout check on Income and
Assets (Demo and a new client, all widths and themes): 0 findings before and after; the 3 covered are the Demo's load
toast on Budget and Debt. The open Tips and shifts, Platform and Cash on hand details scanned on the three personas at
1280 and 390: 0 findings.

## Batch 26 (Nov 6 2026): the skill library's first slice (Phase 4)

Two orders of operations side by side: the FOO says what to fund next, the library says what to learn, and what to unlearn, at that stage. Skills from the FI Skill Tree (Eli with Jonathan Mendonsa) and the older app's 40; the unlearn list is SLAM's own.

1. Plan › FOO: every step gets a collapsed "Learn and unlearn" fold beside Full detail (on one line): three skills to learn and one thing to unlearn, the done ones folded into a count. The step you are on opens by default. Maya at step 3: Pay in full, always; Triage by rate; Name every debt and its rate; unlearn "You can't take it with you: spend it and die with zero" (Not yet: step 9).
2. The order (js/math/library.js, M9K): the skills tagged to the step in skills.json and app-skills.json (an app skill that only fits a job is left out for the self-employed; nine app skills stand in for their twin in the 625 and borrow its words). With a tilt (profile.identity.tilt, batch 25) the tree's place in it leads, one skill per tree first; then the band, the leverage tier and the level. Alexis (KOGS): Buy used first, Hold a starter fund, Lock the logins.
3. Level itself: the 12 app-skill proofs "leveled when the household shows it: <field>" map to SLAM facts for 10 (income, the full match, every debt with a real APR, little e, a filing status, Budget lines, a health plan's out-of-pocket max, a life policy, an FI age, a target allocation) and tick themselves ("Ticks itself"); swanTarget and rerankCut have no SLAM fact yet and get the one-tap Done. Every other skill has a one-tap Done kept in profile.library (by coach or client, with the date; one undo step; Not done yet takes it back). Tom: Capture the full match ticks itself.
4. The unlearn list (data/library/unlearn.json, 14 entries, at least one per step): popular advice that fits one stage and not another, with the step it belongs to, in plain words (Die With Zero at step 3, Mr. Money Mustache frugality at step 9, Baby Step 1's $1,000 at step 4, the 401(k) before the Roth at step 5). Registered in REFERENCE_FILES.
5. Home: the ladder card (the next step) gets one slim line, "Learn next: <skill> ›", that opens the step's fold on Plan › FOO; the ladder's closed line carries it too.
6. QUESTIONS 273: Can I afford it? starts a car payment at 5 years (RULES.carPaymentYears) and every other monthly cost at For good (Tom's $400 car payment: FI 3 months later instead of 12).
7. QUESTIONS 280: the 14 cards not rechecked on Nov 6 say "not rechecked yet" beside their name in coach view; client view leaves them out of the card search, the held card's details and the closed line.
8. Registered: profile.library (spec row F487), M9K (spec Math row), rules LearnShown and CarPaymentYears, format version 27; test/library-slice.test.js.

## Batch 31 (Nov 6 2026): typical at your age (Phase 4, Track 1 groundwork)

Eli (ROADMAP Track 1, QUESTIONS 208 and 210): the coach always sees typical-at-your-age ranges, one switch shows them
in client view; "both as a check": they fill blanks as ranges and check what was typed.

1. Data: data/priors-2026.json holds only the rows docs/engines/priors-sources.md marks Primary: SCF 2025 net worth by
   age (median and mean, Table 2), cash, card balances and student loans (all ages, Tables 3 and 4), CE 2024 spending
   by age (under 25 and 25 to 34 by category, 35 to 44 total), SHED 2025 shares by age ($400 with cash, three months
   saved). Each row names its table, link and year. Left out and listed in the file: rent and every NY or NY metro
   figure (ACS, still Secondary), retirement balances and income by age (Secondary). Registered in REFERENCE_FILES.
2. Math: js/math/priors.js (M9E). No Primary row publishes percentiles, so a typical range is the source's median (SCF)
   or mean (CE) times RULES typicalLow 0.6 and typicalHigh 1.5; far outside is one more spread beyond an edge (2.25 and
   0.36 of likely). The household total is checked (all cash accounts together, all cards, all student loans, the gut
   number a month: CE total less personal insurance and pensions, over 12). Debts and spending note only the high side.
3. One hook in moneyInput (js/ui/typical-ui.js): a typed total far outside typical gets a calm one-line note under the
   biggest of its boxes ("Below what most households have in checking and savings"), muted, the source and the spread
   in its tip, with an X that hides it for that box (settings.typicalOff; Coach tools > Session brings hidden notes
   back). The box stays level with its row (the wrap keeps equal room above); on a phone the note wraps at the box's
   width so the row's other boxes stay in their column.
4. A blank core box (a cash account's balance, a card or student loan balance, the gut number, Fast Track's gut and
   debt totals) fades in the typical range in coach view ("4.9K to 12K", the basis in the tip), counted nowhere.
5. Coach tools > Session > Typical at your age: "Show typical-at-your-age in client view" (settings.typicalInClient,
   off). Client view shows the notes only when it is on; the faded ranges stay coach-only for now.

Alexis (born 1998, $400 checking): the note under her checking box in coach view, none in client view until the switch
is on; a new blank Savings row reads 4.9K to 12K. Maya ($5,200 cash in two accounts) gets none; Tom ($38,000 cash) gets
"Above what most households have in checking and savings" under his savings. Tests: test/priors.test.js (every figure
in the file is on a Primary row of priors-sources.md; nothing Secondary is in it). Spec row M9E, format 28.
## Batch 33 (Nov 6 2026): the Rocket Surgery majors left open

Batch 20's think-aloud left four majors and a row of minors open; each is the least change that solves it (Krug: tweak, don't redesign), taps over typing.

1. Both (preview) for Living together (QUESTIONS 287): a third choice on the whose-numbers switch on Home, Goals and Debt payoff shows the two together, read-only: the store puts back any change but the switch while it is on, with one toast saying to pick a name. Elsewhere Both reads as this client, so Net worth and Cash flow stay per person.
2. A raise in one tap (Q288): +3%, +5%, +10% or a % on a job row's details work out the new gross and the take-home with the household tax math (js/math/raise.js, M12) for rows given as Gross, Take-home or Both; a worked-out take-home is Roughly. The toast says what it set, then what it moved: "Raise 10%: take-home $10,830 a month (was $9,800), gross $203,500 a year. That moved the plan: FI 12 months sooner". Find's raise lands on the taps.
3. The Budget's line side panel no longer covers the lines table at 1280: the list fit runs again when the panel opens or closes, and a list inside an open row no longer takes the open row's 16px padding.
4. Current vs Proposed carries a short month as card borrowing at the highest card APR (else the typical card APR), with one line saying so (Q289): the deficit persona's 5-year net worth is −$52,428 against $1,952 for the Proposed that closes the gap (it was $1,952 on both sides).
5. Month end for a gut-only client closes every gut-only category against its gut split (what the gut number leaves, shared by the starter lines' typicals; Maya's Food $314), the actual typed there or read from an import or the calendar. The Budget's own month view is unchanged.
6. The same scaled typical on both Budget passes (Q290): the Actual pass note says Food $310, as the Plan pass's Use typical.
7. With an all-accounts investments total, "Is part of this a 401(k)? Split it out" moves the tapped part (all, half or a box) into a new 401(k) row; invested and the FI date stay (Q291).
8. A Living together couple's FOO, Scorecard, Transitions, cash layers and Current vs Proposed read the switched person's plan, and the switch shows on those screens; the one-pager's next moves follow. tools/e2e/personas.cjs now checks one answer for the month the heavy debt is paid off: on main it found Jan 2027 on Goals and Dec 2026 on the one-pager for the couple-separate persona; now one.
9. Minors: the calendar grid no longer flags days already gone (28), Find's apr leaves out debt types the client does not have (26), the gross box under Given as Both says /yr (27), the Budget counter reads "1 of 4 filled · core 1 of 3" beside the sub-tab's 1/3 (25). Finding 24 (Skip and Next) stays as batch 18 decided.

Rocket Surgery tasks 3, 4, 5 and 7 again (both users): task 3 done (every line and five gut-only categories closed, 11 actions, from not done), task 4 done (2 taps: Sam, then Both), task 5 done with the two sides apart, task 7 in 4 and 3 actions with no hesitation (from 5 and 5, one hesitation each). docs/usability/scorecard-2026-11-06.json re-scored: 0 blockers, 0 majors, 9 minors (from 6 majors, 15 minors).

## Batch 35 (Nov 6 2026): income by type, follow-ups (QUESTIONS 300 to 306)

1. The federal tips deduction is taken off the household's income tax (QUESTIONS 300, T.D. 10044): householdTax works
   it once per return on reported tips only (card tips, and cash tips when Cash tips reported? is Yes, less the tip-out
   on them; reportedTipsYear), up to $25,000, 2025 to 2028, less 10% of income over $150,000 / $300,000 joint, none
   married filing separately; income tax only. Each tipped row takes its share. Taxes shows it as its own line
   (tipsDeductionOf) with the rule in a hover tip. Riley the bartender, hand-checked: $60 card tips x 13 shifts x 12 =
   $9,360 off a taxable $10,360, federal $1,036 to $100, $936 saved; her paycheck was typed as take-home, so about $936
   comes back when she files and the plan's $3,380 stays. Her unreported cash tips get none, and the line says so.
2. Taxes says what it does with the state (QUESTIONS 306, stateTaxLine): "CA state income tax is not counted yet: it
   comes in Phase 5"; the nine states with no tax on wages (tax.noWageTax, Tax Foundation 2026) say there is none.
3. The workbook knows tips, shifts, house fees and Platform rows (QUESTIONS 305): Income columns for shifts a month,
   pay, card and cash tips, tip-out, fees, worked out from (Paycheck or Shifts), the gross from shifts, cash on top, the
   platform fee (typed or the Platforms table) and payout; M13 and M12 read them; M10 takes off each row's share of the
   tips deduction (M10 · tips); M12 · extra and M12 · platform add up the cash on top and the payouts; Statements' Gross
   adds the cash tips kept. Recalculated in LibreOffice, every income Math row and the Statements income lines match the
   app on the bartender, dancer, creator and a household with every path (test/batch35.test.js); the projections now
   match too (they were off by the tips before).
4. Find: tips, cash tips, tip-out, shifts, house fee, stage fee land on the job row's Tips and shifts (opened first: a
   target can now name a closed block, ^income:work:{id}); OnlyFans, Fansly, Patreon, Etsy, Upwork and platform on the
   Platform row (or Add income); payout on its hold; Uber and DoorDash on the client's Platform row, else the rides or
   takeout on Budget; taxes set aside on the account with Purpose: Taxes (or Add asset). A target's {…} now also matches
   a row's platform or purpose. All in tools/e2e/find-terms.cjs.
5. Assets: the Cash group subtotal leaves out money with Purpose: Taxes, as the Cash strip does (Nova: $11,800 before,
   $8,300 now), and a slim line under the group says "Set aside for taxes: $3,500, owed, so not in the Cash total above"
   (a list can now have a groupFoot).
6. Income: a Job row with tips or shifts says them on the row ("$260 a shift after tip-out · 3 shifts a week",
   workLine), a link under the name that opens the row's Details with Tips and shifts open.

Tests: test/batch35.test.js (10, four of them LibreOffice) and the whole suite pass in UTC and America/New_York.
Findability: 138 of 138 (69 terms on the Demo and a Fast Track client), and the new terms land on the personas' boxes.
Layout check on Income, Taxes and Assets (Demo and a new client, all widths and themes): 0 findings before and after
(the 1 covered is the Demo's load toast on Budget). The three personas at 1440, 1280 and 390, light and dark, with Tips
and shifts open: 0 findings.

## Batch 36 (Nov 6 2026): library follow-ups (the Phase 4 switch, the sleep-at-night number, SLAM's rule beside a skill)

Follow-ups from Batch 26 (QUESTIONS 307, 310, 313).

1. QUESTIONS 307: Learn and unlearn on Plan › FOO and Home's "Learn next" line sit behind Phase 4 previews (settings.phase4, Coach tools › Session), like the rest of Phase 4. libraryOf is null with the switch off (libraryOn, M9K); the screens ask the switch before loading the skill files. On for a new household, so the personas keep it.
2. QUESTIONS 310: a Sleep-at-night number (profile.sleepAtNight, money, spec row F488) on Net worth › Assets › Cash layers, one row under the layers with two one-tap picks before the box (Buffer and little e; Every layer, from M68 sleepPicks). It changes no layer. Know your sleep-at-night number ticks itself once it is set (a typed 0 counts). Rerank your costs ticks itself too: every repeating charge that can be cut has a Keep or Try to cut answer (the Bills list, or Looking for savings on a fixed Budget line). UNMAPPED is now empty. Find: "sleep at night", "swan".
3. QUESTIONS 313: data/library/slam-rules.json (registered in REFERENCE_FILES), keyed by skill id: where a skill's words disagree with a SLAM rule, the card shows SLAM's rule in one line in place of the description, and the tip keeps the skill's own words ("The FI Skill Tree says: 3-6 months of expenses"). skills.json is not changed. Nine skills from a scan of all 665: Fund the true emergency fund, Size the fund to YOUR risk, Tier every dollar, Get one month ahead, Right-size downward, Triage by rate, Draw the payoff-vs-invest line, Kill the consumer debt, Build your contribution waterfall. The test checks every override is a real skill that shows, every rule it rests on is registered, and the 8% matches RULES.heavyApr.
4. Cash layers: History, Income gaps and Backups of the backups are one width (a column failure when the section is open).
5. Registered: profile.sleepAtNight, M68 sleepPicks, M9K libraryOn and slamRuleOf, format version 30; test/library-slice.test.js.

## Batch 34 (Nov 6 2026): Rocket Surgery on the screens Batch 20 did not score

The same method as Batch 20 on the twelve screens left out of the first scorecard (Net worth › Debt and Protection; Plan › FOO, Scorecard and Timeline; Report › Overview, Statements and History; Coach tools › Lists, Session, Data and Discovery): 22 real coach tasks, each played by Eli and by a first-time coach on the personas. The tasks, ranked findings, fixes and before and after counts are in docs/usability/2026-11-06-rocket-surgery.md (section Batch 34); the twelve screens' 12-category scores are appended to docs/usability/scorecard-2026-11-06.json (with route and area). FOO is scored only (its code is Batch 26's).

1. Report › Statements: the income statement's surplus is the monthly surplus. The gut number's spending money (the part no line covers) is a variable line and leaves checking on the cash flow statement; money into sinking funds is its own line out of the surplus and back in the net worth bridge (answer 62). Alexis read $1,510 left over there and −$200 on Overview; now −$200 on both, and 13 of 14 personas match to the dollar. A month before the file began shows – instead of $0 balances, and the month it began says when cash ties out instead of calling the whole balance unexplained. MATH.md 13; test/batch34.test.js.
2. Report › History: "what changed since last month" is the last snapshot against today ("Net worth since Oct 6", "Debt paid down since Oct 6") with a Now row on the table; it compared the first snapshot with the last, so one snapshot always read $0.
3. Find: the everyday words for these screens land on their box (biggest hole, fi date, when can I retire, how long would my cash last, last month, tie out, what changed, snapshot, guesses, client view, session length, spreadsheet, export, sales call, foo, next step).
4. Taps over typing: Timeline's +$100 to +$1,000 picks and "36 months sooner than now"; Discovery's Goal and Why now as the About you chips; Session length as 30, 45, 60, 90 min.
5. Smaller: Lists' Fix now lights the number itself; Data's primary button says Export a backup; Protection keeps unanswered usual-list rows (they vanished when focus left them) and counts them at the foot, and shows Renters insurance in full; Debt says the only-its-own-payment date once and names its APR box; Scorecard has one rating control per hole and Mark re-scored today; every Session switch reads Off, On; Statements' group buttons are one width with room between rows; Discovery names the client "Who they are with money" answers for.

Before and after (44 runs): 169 actions to 150, 40 hesitations to 2, 14 dead ends to 0, 4 back presses and 5 wrong clicks to 2 and 2, tasks done 38 to 44. Layout checker on these screens: 62 failures (Statements) to 0; Statements, Data and Discovery are now in the checked routes. Persona run: story blockers 14 to 2 (a Living together couple on Statements, question 332). Effort scoreboard unchanged (35 / 38). Questions 330 to 332.

## Batch 38 (Nov 6 2026): the workbook matches the app for every persona (QUESTIONS 326)

1. The check runs everywhere it can: `tools/workbook-check.mjs` builds a household's workbook, has LibreOffice
   recalculate it (a few runs side by side) and lists every Check that is not Matches, and every cached value that is
   not what its formula gives. ExcelJS (already a dev dependency) is found in this checkout or, in a git worktree,
   the main checkout's; every ExcelJS test now loads it that way, so nothing is linked by hand. Without ExcelJS or
   LibreOffice the tests skip and say which is missing. docs/WORKBOOK.md says how it works and how to run it.
2. Before: on the 14 personas, the Demo and Fast Track Alexis and Tom, 222 Checks were off on 14 of the 17 households
   (21 different Math rows, 4 statement lines, 5 FOO rows and the Projections years) (the list and causes are in docs/WORKBOOK.md), and the Demo's downloaded
   file showed 50 Checks off in LibreOffice (every Projections formula cached the year's balance).
3. Fixed in the sheet formulas: debt payments outside the gut (the Kind is "Gut number or category" now); sinking
   funds come off the surplus (M27 · sinking, a Set aside a month column on Goals and events); the lines count only
   with an amount; Has investments No (or cash No) is $0; a couple who split bills counts both shares in the household
   view (a Household part column on Spending lines); 529 and Goal contributions in Saved in the budget; the step you
   are on skips 7 and 5b; only the compared cell carries the app's cached value; the net worth bridge has batch 34's
   sinking funds line. The app was not wrong anywhere; foo()
   and layersOf() take a person (default unchanged) so the workbook's FOO is the household's, like every other number
   in it.
4. M81 (the gap) is a formula now, its levers a From the app row; M9E · netWorth looks up a new Priors_netWorth table
   on Assumptions; the From the app rows of tonight's math say why they stay in the app. M01 and M17 check to the cent.
5. test/workbook-drift.test.js recalculates all 17 households and fails on any row off, plus hand checks of each fix.

Tests: the whole suite passes in UTC and America/New_York. After: every Check Matches on all 17 households, and the
Demo's file downloaded from the browser opens in LibreOffice with 341 of 341 Checks at Matches (50 off before).

## Batch 39 (Nov 6 2026): the data pass for "typical at your age"

Batch 31 could use only a few Primary rows (QUESTIONS 314 to 318). This pass read more primary tables and wired them in.

1. Read and entered as Primary (docs/engines/priors-sources.md, data/priors-2026.json): the CE 2024 by age for 35 to 44 through 75 and over (all categories) and by size of consumer unit (one person, all ages); ACS 2020 to 2024 median gross rent from QuickFacts (United States $1,413, New York State $1,621; Rockland County $1,901 recorded, not used); BEA 2024 price parities (NY metro 112.563, New Jersey 108.805; NY State and NY metro housing recorded); the SCF report's all-families retirement row (54.9%, $106,000) and net worth percentiles (Table A.2); the BLS New York metro CE release for 2022-23 as a cross-check.
2. Still out of reach, with the exact URLs tried in priors-sources.md: the NY metro rent (Census API, data.census.gov), the SCF by-age tables (historical tables xlsx, Data Interactive, the CSV zips), the CE NY metro 2023-24 PDF, the FSA portfolio by age. Cash, cards and student loans stay all ages (QUESTIONS 315).
3. js/math/priors.js (M9E): the closest row wins (its place, then Solo or Couple, then the age band); 25th to 75th percentiles where a row gives them (QUESTIONS 314), else the stated spread; spending scaled by the place's price parity (the NY metro for NY clients, QUESTIONS 210); the one-person CE row for a person living alone (QUESTIONS 318); a rent check and faded range for a renter's rent line, divided by the people the rent is split among (QUESTIONS 316). priorsOpts reads them from About you; typicalBoxes takes the rent line unless the household owns or lives with family.
4. js/ui/typical-ui.js: the rent line's amount box gets the faded range (coach view) and the note; a line with batch 10's own faded amount keeps it. css/typical.css: the note's rules are scoped to its wrap, because Budget's group line (batch 10) shares the class and was being stacked over the list's footer.
5. Alexis: her $900 share reads against New York State's $1,621 split two ways ($811), inside typical, so no note; her $400 checking keeps its one note. Maya and Tom unchanged (Tom's cash note only). test/priors.test.js reads the persona files themselves.

## Batch 41 (Nov 6 2026): ranges on every key output (Phase 4, Track 1, M9R)

1. The math: `js/math/ranges.js` (M9R), the corner method in docs/engines/ranges.md. Likely is the plan as entered
   (the number every screen already shows, to the dollar and the month); then the plan runs again with each uncertain
   input at its low and its high, and the swings combine as the root of the sum of their squares. Outputs: the FI date,
   the debt-free date, emergency fund months (runway), the monthly surplus, net worth, and the FOO step (the earliest
   and latest step any one input reaches). Each input moves by its level and kind: 15 new rules in RULES
   (RangeBalance*, RangeSpend*, RangeIncome*, RangeVariable*, RangeAprRough, RangeMinMonths, RangeMinEfMonths) beside
   batch 24's RoughBalanceShare and AprGuessSwing; a typical amount not answered yet (a starter line still Not sure, a
   blank APR read as typical) moves TypicalLow to TypicalHigh. A number at Know it with no width (a paycheck, a bill,
   a rate) does not move; a balance at Know it moves 2% but never puts a line on screen by itself.
2. Shown slim: the likely number stays the big one, and one quiet line goes under it ("Likely Aug 2031, could be Aug
   2028 to Oct 2031") only when what is not known yet moves it more than the client's materiality (a surplus counts a
   year of it; a date at least 2 months, valued at a month of spending; emergency fund months at least 1). In coach
   view the line is a link-style button: a tap names the two inputs widening it most, each with Open the box (the
   gut box glows on Budget, the card APR on Credit cards). Client view follows the typical-at-your-age switch
   (QUESTIONS 208) and reads the line only. On Home (net worth, surplus, FI tiles, the debt-free card, runway when
   between jobs, the FOO step beside Confirm FOO step), Plan › Goals (FI date, the reveal card), Plan › Debt payoff
   and Net worth › Debt (debt-free), Report › Overview (net worth, surplus, runway, debt free) and the One-pager's FI
   tile and summary. The FI date's old year-range headline at Low and Medium confidence (answer 122) and the
   debt-free year range (batch 24) give way to the likely month plus this line, so every screen shows one range from
   one method.
3. The workbook: M9R and its parts (low, likely, high for each output, the FOO step's ends) are From the app rows (the
   whole plan rerun per input cannot be named ranges); M34's range rows now read M9R. Format 32, spec row M9R
   (`tools/library/ranges-spec.py`).
4. Speed: `js/format.js` makes its number formatters once (toLocaleString with options built a new one per call,
   most of the math's time): metrics 40 ms to 8 ms, the FOO 100 ms to 13 ms on Tom, so the ranges (two runs per
   input) cost about 40 ms per change and every screen got faster. Same text as before.
5. test/batch41.test.js: hand checks for an all Know it household (net worth 110,000 plus or minus 2,010, no line
   anywhere), Alexis (surplus -320, -740 to 100; the debt-free ends from her card APR, gut number and balance run
   one at a time), Maya (surplus, net worth 12,693 to 15,707, emergency fund months), a surplus that could be nothing
   some months, Tom, the FOO step, materiality, and the workbook rows.
