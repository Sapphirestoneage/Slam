# Questions

Each one has the default used so the build could keep going. Answer here or in the spec.

## Missing from the spec

1. **spec/SLAM Look Preview.html is not in the repo.** Only the two spreadsheets were provided. Default: the Look and feel tab's values are used exactly; please add the preview so the staples page can be checked against it.

## Proposed values used as written

2. **Font (Look and feel, Proposed):** Inter from Google Fonts, fallback system sans-serif. Used as written.
3. **Words and states, Proposed rows:** used word for word: Home (no client), My Money nothing entered, a list with no rows, a chart missing inputs, Calendar nothing planned, Before reset section, Save failed, Payment too small, Backup reminder.

## Rules that disagree (the later date wins)

4. **APR 'Not sure' (R035 vs R055).** R035 (screen review, undated) says the typical rate is marked Roughly; R055 (accepted Oct 28) says the app's typical value is labeled Guess. R055 wins: Guess.
5. **Typical rates (R035 example vs Reference data).** R035's example says credit card 24%, personal loan 12%, car 7% "to confirm in the Math pass"; Reference data (Fed G.19 Q2 2026, released Aug 7 2026) gives 22.15%, 11.86%, 7.14%. Reference data wins.
6. **Top bar tool count.** Navigation says "right = 7 tools"; the Mockup says "Same 8 tools" and lists Find, Add anything, parking lot, undo, redo, the $ / Hours / FI days toggle, Client view and the gear (8 once the toggle counts as one). Default: the Mockup's list, in its order.
7. **Icon button size.** Look and feel says small icon buttons are 32px with a bold 17px icon, and also "Icon: 28px square" under Buttons; R156 says icons are 18px with a 2.25 stroke. Default: 32px buttons (row actions, top bar), 28px only for the tiny fold and close buttons, icons 18px at 2.25 stroke.
8. **Total interest: formula or simulation (M32).** M32 says "n x P - B, or a month-by-month simulation; simulation is the source of truth", but the Demo and Test client expected values use the formula, and the simulation is $1.25 higher on the Test client card (outside the $1 bar). Default: the formula is the number shown; Show the math gives the month-by-month figure beside it.
9. **Real hourly wage with no hours (M17 vs R153).** M17 says missing hours shows 'needs hours'; R153 (audit) says the time toggle uses take-home / 173 labeled Guess. Default: M17 itself still says 'needs hours'; the time toggle uses the 173-hour Guess.

## Defaults the spec leaves open

10. **Retirement age for Coast FI (M54).** No field or default gives one; the Demo client expects 60. Default: 60, in data/reference-2026.json, until Plan asks for it.
11. **Monthly investing for the FI date (M53).** M53 says surplus to investing + pretax + match; nothing says how much of the surplus goes to investing. Default: all of it ("surplus fully invested", as in the Demo client).
12. **"Monthly spending, all in" and debt payments (M27).** Default: an all-in total includes debt payments (the Test client note says so), so they are not taken off again. A spending total built from lines takes debt payments off unless a line is tagged Debt.
13. **All-in total and budget lines together.** The Demo client has an all-in total and also rent and utilities. Default: the all-in total is the spending number; the lines feed housing %, support received and the fixed floor.
14. **FICA and before-tax deductions (M11, M12).** Default: FICA is on gross (401(k) deferrals do not lower it). Health premiums, which do lower FICA, are not split out yet.
15. **Inflation in 'These are big deals' (M56).** The engine is in today's dollars, so the inflation presets do not move the FI date. Default: the inflation row shows the same date under both presets (spread 0), so it never ranks as the biggest mover.
16. **Test client open question 6** (monthly take-home for the new job, and all-in monthly spending) is still blank in the private file. Those outputs show 'Needs take-home' and 'Needs spending', which is what the file expects today.
17. **Dark mode values the tab leaves open.** Changed Oct 29 at Eli's ask (the first dark felt bright and babyish): near-black page #0B0D12, cards #14171E, text #E4E7EC, primary #4A78D6; calmer area hues Income #4FAE7C, Debt #B97CBA, Assets #48A6AD, Taxes #8F8AD9, Needs #6E93D8, Goals #CF86AE. Warnings #2A3140; the calm destructive outline #0A2A66 light, #E39A9A dark. All in css/tokens.css.
18. **Status 'Know it' on a row.** DMMT says status tags only show when a number is not Know it. Default: the row's status button reads 'Know it' in plain text and turns into the colored tag otherwise.
19. **Visuals panel placement.** Side at 1600px and wider, Below under that: at 1440px a full debt row (name, balance, APR, payment, payoff, status, actions) does not fit beside a chart.
20. **Screens the Words tab has no empty state for** (Home Live and Wrap-up, Month-end close, Next 12 months, Scenarios, History, the gear's lists). Default: the 'A list with no rows' pattern ('No closed months yet' + the add button), or one plain sentence and the screen's one main button.
21. **Never backed up.** Words gives 'Last backup 9 days ago.'; with no backup at all the banner says 'No backup yet.' + 'Back up now'. It is coach-only, so client view hides it.
22. **Start Fast Track before phase 5.** It is the My Money empty state's main button, but Fast Track is built in phase 5. Default: shown, disabled, and it says why.
23. **Top bar room at 1280px.** Left, five tabs and eight tools do not fit at 1280px with every label. Defaults: Saved is a green tick (the word is its tooltip; 'Unsaved' always shows in words); below 1400px Find shows its icon and '/' without the word, and the quick add box is narrower. At 1280px a long breadcrumb shortens with an ellipsis (full text on hover); the filled sub-tab under it still names the page.
24. **Income and Assets lists before phase 5.** Built from the same staples as Debt so the shell has real rows to show; phase 5 replaces their columns with the Mockup's.

## Build phase 5 (My Money)

25. **Fast Track has a debt step.** No debt field is tagged Fast Track, but R068 says Fast Track turns on every lens, and net worth needs debts. Default: one step with totals by type (credit cards, student loans, other) plus the car loan and mortgage with their asset (R132: totals by area). APRs fill in as a typical Guess.
26. **A gate jumps there with a click, not on its own.** R015 says changing a gate jumps to its section. Default: the change happens at once and a toast says where it went with 'Go there', so several gates can be answered in a row without being pulled away.
27. **Unanswered gates.** A gate nobody has asked yet shows everything; only a 'no' takes things away. HSA and FSA are the exception (R012, R013): they show only once confirmed. The accounts checkboxes answer all four areas at once.
28. **Two jobs and tax.** Each paycheck row is worked out as if it were the only job (federal and FICA, no state tax yet), so a second job's take-home or gross is a little off. Benefits, unemployment and money from family count as they land.
29. **One page.** The Express form is every My Money section stacked on one page (each with its own heading); the sub-tabs scroll to their part.
30. **Paid off with a loan that still has a balance.** Asks before removing the loan (it is the same row as on Debt), and can be undone.
31. **Gas and tolls.** Reference data had the car gate only on the old combined category; 'Gas or charging' and 'Tolls and parking' now carry it too (R009).

## Build phases 6 to 11 (Spending, Plan, Report, Home, Coach tools, dry run)

32. **Which spending the math uses.** The Gut number (the All in record) is used for surplus and FI until Budget is switched to "The lines" (Budget › Settings for this budget). A client with no gut number uses the lines. When the lines include starter guesses not yet reviewed, Home says so beside Money in one line. Change the default?
33. **Starter guesses and the lists.** The ~40 preset lines start as Guess. They each get Keep (the guess is right), Not for me and Delete on Budget. They are left off the Revisit list (one summary row points to Budget instead), and Next 3 ranks them by dollars at stake, so the biggest guess is asked first.
34. **Days nobody typed.** A paycheck with no payday, or a bill or debt with no due day, sits on a guessed day (paychecks every 2 weeks from Fri Jan 2 2026; everything else the 1st), drawn dotted, with "set its day" in its box. Variable-date lines are spread across the weeks of the month (R140).
35. **Gaps at close.** Closing a month with lines that have no actual asks first, then counts them as $0 so the miss shows (R094). Close carries each variable line's actual to next month's estimate when next month has none yet; Carry → does it for one line any time.
36. **Moved to another month.** Moving an entry to a day in another month keeps it on its original month's list (faint) and leaves it out of both balances. Drag and drop on the calendar is not built; Moved is in the entry's box.
37. **Fat FI.** No spec number, so Fat FI is 1.5 times regular spending (FAT_FACTOR in js/plan.js). Lean FI uses the Food, Accommodation and Transportation lines.
38. **Real or nominal.** Returns are after inflation, so everything stays in today's dollars; Nominal only adds a line saying what the FI number is in future dollars.
39. **Next 3 effect.** Each open number is measured by how far the FI date moves if it were $0 instead of its current or guessed value; core numbers (take-home, spending, invested, age, cash) always rank first; under $100 a year goes to small wins (R073).
40. **End session.** Does all four checklist items at once: homework list from Will email, snapshot, one-pager marked ready, next session booked (a date two weeks out unless one is typed), then downloads a backup (R151). Send summary copies an email-ready text with the disclaimer; the app cannot send email itself.
41. **Export PDF.** Uses the browser's print to PDF. It is hidden inside SLAM for Eli (an artifact cannot print); the public site shows it.
42. **Pre-call form.** Needs a server to receive a client's answers from a link, so it is a later phase. The discovery table works now (Coach tools › Discovery, or New client › From a discovery call).
43. **Card bills and payoff (R104).** A card's More shows the bills charged to it. Paid in full, they are spending. Carrying a balance, the payoff projection does not yet add them to the balance; the card's payment amount is used as typed.

## Brandon batch (Nov 2 2026)

44. **The request was cut off.** It stops in section 3 at "HSA: cash vs invested, self-directed vs managed with a fee comparison, per-pay". Default: "per-pay" read as the HSA contribution per paycheck (already there, now counted with the real paychecks a year). Anything after it, and any LATER list, was not received. Please resend the rest.
45. **Where the batch lives.** The spec is a spreadsheet, so the items went to `docs/backlog-brandon.md` (B1.1 to B3.8, tagged NOW or LATER) instead of the xlsx. Move them into the spec on your next refresh, or say so and the rows can be added to the Feature list tab.
46. **"Will email" is now shown as "I'll find it later".** Same status underneath (R053), so old files and the math are unchanged; only the words on screen moved to the user's side. Profile answers park in their own list. A typed answer comes off the list by itself.
47. **Two places for the employer match.** Income › More still has the simple "% up to %" that the math (M15) uses; the 401(k) now has tiers (100% of the first 3%, 50% of the next 1%). Default: the tiers show on the 401(k) only and do not change the FI math yet. Which should be the one source? (Backlog BL.5.)
48. **Uninvested cash threshold.** Flagged when a retirement account or HSA has $500 or more in cash and, outside an HSA, that is at least 10% of the account. HSAs often require a cash floor; is $500 right?
49. **"A set %" for one holding or theme.** Default 25% of the account, one value for everyone. Should the coach set it per client?
50. **"Held in stocks" for a short goal.** Flagged when the account's mix has any stocks, or it is an investment account with no mix typed yet. Should a small stock share (say under 20%) pass?
51. **Overlap.** Found by name, ticker or "what it tracks" matching S&P 500, NASDAQ, Dow or total US market; two or more such funds are flagged. There is no fund lookup yet (BL.2).
52. **Stocks % field removed.** The new allocation replaces it; nothing in the math read it.
53. **Stale balance.** Uses "Balance as of", set to today whenever a balance is typed; older rows fall back to the row's last edit date.
54. **Owner twice for couples.** Every account now has Individual / Joint under Details; couples also keep the Me / Partner / Joint column. Fold them into one?
55. **Next on the Profile.** Shows once every core answer is in or parked with I'll find it later, and goes to Income. Before that, it says how many are left and names the first three.

## Missed-ideas batch (Nov 2 2026)

56. **Credit cards as "their own account type".** Kept as the Debt type they already were (one record for each thing, R049, R115), grouped under Credit cards on Debt. Want them on Assets as well, or a sub-tab of their own?
57. **Commuter limit.** $340 a month (IRS 2026, transit and parking each) was added to data/reference-2026.json; it is not in the spec's Reference data tab yet. The nudge uses transit lines (Transit; Transit, Uber; Tolls and parking) and the federal + FICA marginal rate; state and NYC tax are not in yet, so the saving reads low for NY.
58. **Benefits and take-home.** The answers do not change take-home or tax yet; the Income row's before-tax boxes (health premium, HSA or FSA, other before-tax) still drive that. Should a commuter or FSA yes fill those boxes?
59. **"Large" refund.** $1,000 or more. Owing any amount flags "check withholding".
60. **Year view placement.** Built into Plan › Next 12 months (Your year, Sinking funds, Taking over above the events list) instead of a new tab. The tab name is unchanged.
61. **Insurance renewals and lease renewal months.** Added with no month, since only you know them; card annual fees use the card's Opened month.
62. **Sinking funds and Budget.** A sinking fund's monthly amount shows on Next 12 months only; it is not added to spending or the surplus yet (yearly costs already are, as their set-aside).
63. **Taking over and the math.** Covered bills still count as $0 to you until the date; the list shows what each date adds, but the FI date does not move on those dates yet.
64. **Life admin: one freeze or three.** Shown as three rows, one per bureau, so each can be done on its own.
65. **Community presets.** Stored per client. Yom tov and Pesach come in as yearly costs with blank amounts and no month (the dates move each year). The kosher note is one line on the Budget, not a change to the grocery guess.
66. **Onboarding timer for the demo client.** "First computed number" is the first time any of net worth, surplus, savings rate or runway has a value; with example numbers that is immediately.
67. **"I don't have this".** Saved as the field's Not for me status (counts as answered, as $0 in the math), on every field added in this batch. Earlier fields still have I'll find it later only.

## Brandon batch, full copy (Nov 3 2026)

68. **"Fill each other in" (your answer to 47).** Read as: Income and the 401(k) each show the other's 401(k) % and employer match when their own box is blank, marked "From Income" or "From your 401(k)"; typing on either side keeps that side's own answer. A multi-tier match from the 401(k) shows on Income as text, since Income only has one "% up to %". Right reading?
69. **NY and NYC rates.** Typed in from the 2026 rates as I know them (the five lowest NY brackets cut 0.1 point for 2026). Please check them against the NY tax department's 2026 tables. The high-income recapture and Yonkers are not modeled; other states are still federal only.
70. **Savings rate and before-tax saving.** The headline stays M28 (surplus over take-home). 401(k) and HSA money from the paycheck shows as a second number ("X% with your 401(k) and HSA"). Should that become the headline?
71. **Premiums as cash flow.** Each coverage row says Paid from: Paycheck (already out of take-home) or Budget line (one tap adds a linked fixed line). Health premiums typed on Income stay separate from the Health coverage row. Merge them?
72. **"Personal care and hygiene".** Display only: the DRAFTT T letter is still Therapy in the math and the charts, and actual therapy shows as its own section. Rename the letter in the spec too?
73. **Dates and Other wants.** Added to the usual list with starter guesses ($100, $50) marked Guess like the other 43 lines. Blank instead?
74. **Who covers it.** Rarer answers (Included in rent, N/A, Need it, don't have yet) moved behind "Other". OK to drop any of them?
75. **Payday card.** "Fixed bills" is your share of lines marked Fixed plus debt payments that are not lines. Savings goals and sinking funds are not taken out of "free to spend" yet.
76. **Paychecks left to max the HSA.** Counted from today's date and the pay frequency, not the typed paydays.
77. **Report this without a client.** It asks you to open a client first, because the note lives in the client file.

## Answers logged (Nov 3 2026)

- 68 Multi-tier match: no change; the text on Income stays, the tiers live on the 401(k) row.
- 69 NY rates: the 2026 single brackets match NY Tax Law 601(c)(1)(vii). The 2027 to 2032 schedule and the recapture over about $107k AGI are logged LATER (docs/backlog-brandon.md BL.22, BL.23). Joint brackets and NYC rates say "not yet confirmed against the law" on Taxes and in the reference data (BL.24).
- 70 Savings rate: built. The headline counts 401(k) and HSA money from the paycheck plus the employer match; surplus over take-home is the second line under it. The spec's Math tab M28 row says so.
- 71 Health premium: built. The Health coverage row owns it; Income shows it "From Health" and it leaves take-home once, never as a Budget line too.
- 73 Dates and Other wants: no change; the starter guesses stay.
- 75 Payday card: built. Savings goals and sinking funds come out as "Free after savings", per paycheck and per month.

## Reorganize pass (Nov 3 2026)

78. **The reorganize pass and PR #4.** It was built while PR #4 was still open, so it first sat on that branch; it was reverted there before #4 merged, and comes back here on a fresh branch from main, in its own PR. Nothing else changed.
79. **"Close" or "Month-end close".** The Cash flow sub-tab reads "Month-end close"; "Close" alone looked like a button that closes something. Shorten it?
80. **About you as Home's first sub-tab.** #/home (and a bare Home click) now lands on About you; SLAM in the top bar still opens Prep. Should Home's tab click open Prep during a session?
81. **Which typed lines count as the same payment.** A line in the Debt letter, or a line whose name says payment, loan or mortgage and shares a word or the amount with a debt; for premiums, a line that says insurance or premium and names the coverage or matches its amount. A "Rent" line under "Rent or mortgage" is flagged against a mortgage. Too eager, or not eager enough?
82. **Roth 401(k).** It sits in before-tax savings with the traditional 401(k), since both come from the paycheck. Split it out as savings?
83. **Sinking funds on a yearly cost.** A sinking fund on a Budget yearly cost is not taken out of Free after savings, since the cost is already in spending as its set-aside; sinking funds on events and other costs are. Right?
84. **Health from the paycheck with two jobs.** The premium is borrowed by the first job (the one the 401(k) links to); other jobs show "From Health, on your main job". OK?
85. **fields.json and the Fields tab.** data/fields.json was already out of step with spec/csv/Fields.csv before this pass (some field names and groups differ). Only the Lives on column was updated in both. Regenerate fields.json from the spec with tools/fields.py?
86. **The phone branch (claude/youthful-darwin-qjerhn).** Not merged: it was built on the Phase 11 code and fights the fix pass (the breadcrumb comes back, the backup reminder becomes a floating toast with dots on Tools and the gear instead of the dot on Saved, its phone Find opens the old Find overlay, its Tools sheet uses the old quick add and time toggle). Rebuild the phone layout on the new chrome (one slim row, bottom tabs named Home, Net worth, Cash flow, Plan, Report, Tools sheet with Find or add)?

## Polish pass (Nov 3 2026)

87. **Sub-tab order: Nov 2 or Nov 3.** This request lists Net worth as Profile, Debt, Assets, Protection and Cash flow as Income, Budget, Calendar, Month-end close, Taxes (decided Nov 2). The reorganize pass on Nov 3 put About you first in Home and Taxes right after Income, so Cash flow reads in waterfall order, and that is what is built. Switch to the Nov 2 order? It is a few lines in js/nav.js.

88. **Not sure and Will email under Missing.** The request lists Missing as Not sure, Not now, Will email and I'll find it later. In the stored data Not sure is the Guess status (a typical value is used, so it sits under Rough) and Will email is the value behind "I'll find it later", so Missing shows two choices: Not now and I'll find it later. Add a separate "Not sure, no guess" status (a data change)?
89. **Plan pass columns.** Plan shows each line's usual Amount and this month's Plan side by side (a blank Plan uses the usual number). Hide the Plan column unless someone picks a different month?
90. **Focus mode trigger.** Focus mode is on while a session runs with Guide me on (Start session turns both on). Should the coach be able to turn it off mid-session from Live?
91. **"A month in" on Assets.** In focus mode the contribution is typed per month and stored as a yearly amount (contributionPer Year), replacing a per-paycheck entry if one was there. OK, or keep per paycheck when it was typed that way?

## Answered (Phase 3.5, Nov 3 2026)

- 79 to 86: answered and built in the answers commits (Month end; Home opens Prep or Live; stricter payment matching with Yes / No; Roth 401(k) in Saved from paycheck; yearly-cost fund note; Paid from on Health; fields.json from the spec with the old-name map; new names on the phone tabs).
- 87 Keep the Nov 3 sub-tab order. 88 No new status. Both as built.
- 89 to 91: answered and built (see PROGRESS).

- 70 Savings rate headline: answered. The headline counts 401(k) and HSA money from the paycheck plus the employer match (built in the reorganize pass; the old M28 is the second line).
- The employer match: answered. It is its own income line (it shows as its own line on the income and spending statement, M63, above taxes).

## Phase 3.5 (Nov 3 2026)

92. **Big e months for less steady income.** The Rule of 5 (age / 5) is multiplied by 1, 1.25 or 1.5 for steady, varying or unpredictable income. Are those the multipliers you want?
93. **True FI.** Shown as the FI number grossed up for about 15% tax on withdrawals, a rough rate until retirement taxes are in. Keep 15%, or another rate?
94. **Step statuses beyond the three.** Done, In progress and Next as asked, plus Later (steps after the next one) and Optional (Bedazzle before any joy line is picked, so it never blocks). OK?
95. **A late bill.** For step 1, a bill or debt payment still Planned more than 5 days after its day this month. Is 5 days the right grace?
96. **Roth IRA income limit.** data/reference-2026.json uses $153,000 single and $242,000 joint (where the phase-out starts) for the backdoor note. Confirm the 2026 values. Answered Nov 4 2026: confirmed. The phase-out runs $153,000 to $168,000 single and $242,000 to $252,000 joint (IRS Notice 2025-67, through tax sites that cite it).
97. **Projected dates.** Steps 1 to 5 and 8 are dated by spending the surplus on them in order; Coast FI and FI use the growth path; a debt payoff on the path uses today's payment. So "Clear the heavy debt" can land before "Credit card paid off at today's payment". Keep both, or date payoffs by the FOO order?
98. **Launch moves.** The step 7 list is Quit and take time off, Go part-time, Take a sabbatical, Start something of my own, Move somewhere cheaper. Add or rename?
99. **The bridge rows.** The net worth bridge (M66) needs Saved from paycheck and Debt paid down rows beside surplus, market and other to tie out; the spec formula lists fewer. OK?
100. **Pay yourself first.** Shown as a line above the income statement (401(k), HSA, match and after-tax contributions, a month and a paycheck) rather than a new row, so the surplus and the bridge keep tying out. OK?
101. **Markers on the calendar.** FOO dates are months, so they sit on the first of their month; the close marker sits on the last day, or the day the month was closed.
102. **Drag on a phone.** Phones use the item's Move button with a day picker; drag is desktop only.

## Open the books (Nov 3 2026)

103. **Housing % and roommates.** The app's Housing % (M2A) divides a Split rent only by Split by, not by your roommates, while My share (M21) divides it by roommates + 1. The sheet copies the app so the Check matches. Should Housing % split by roommates too (it would change the number on Report)?
104. **The rest of the brief.** Answered: the full brief came in the next run and is built (debt payoff month by month in Projections, _meta, the review as asked, coverage, checks, the license).
105. **Formulas from the app.** These are "From the app" with the reason on the Math tab: M26 gut accuracy, M2B prepaid, M34 payoff order (a month-by-month simulation), M44 limit used, M56 big deals, M57 solvers, M60 running balance, M61 bonus months, M64, M66 and M67 (calendar marks and dated history), M68 cash layers (little e is a formula), M71 flags; and the gross worked back from take-home (M13) is the app's number inside its formula. OK, or should any become a sheet formula?
106. **Statuses in the sheet.** The Status column offers Know it, Roughly, Guess, Not for me, I'll find it later and Not now (the six a row can have). The brief named four. Keep six, or show only four and leave the other two as they are?
107. **Rows taken out of the spreadsheet.** A row deleted in the spreadsheet shows in the review as a removal, not ticked, so nothing is deleted by accident. Tick them by default instead?
108. **A 6 in a % cell.** A percent cell that comes back as 6 (typed without the % sign in a sheet that does not convert it) is read as 6% and says so in the review. OK?
109. **Fields that stay in the app.** A few things are not columns and say why in js/registry/fields.js: holdings, allocation and the match tiers inside an account, the Roth IRA log, links between rows (Paid with, Linked to, a sinking fund's account), employer benefits answers, life admin, refund history, homework flags, and calendar marks. Should any of them get a tab of their own?
110. **Google Sheets and Excel.** The file was checked by recalculating it in LibreOffice, not in Google Sheets or Excel (no access from the build container). Please open one in each once and say if anything looks off.

## Open the books, full brief (Nov 3 2026)

111. **Spec drift is long.** SPEC-DRIFT.md lists 183 registry fields not in the spec and 201 spec fields not in code: only 50 of 265 spec field names match a registry label (or start the same way). Most are the same field with different words (spec "Birth month and year", app "Birth year" and "Birth month"). Map them with spec: 'F003' on each registry field (a one-time pass), or rename the spec rows to the app's labels?
112. **The new-row rule on Spending lines.** "A row with no ID is new if its type column is filled." Budget lines have no types, so on Spending lines (and Income gaps, Backups, Budget months) any filled row is new. Debt, Assets, Income, Protection, Calendar entries and Goals need the Type. OK?
113. **Conflicts are per record.** When a record changed in SLAM after the export, every spreadsheet edit to it needs a pick, even a field SLAM did not touch. Narrow it to the fields SLAM changed?
114. **The format version.** It is 1 now. It goes up by one line in js/sheet/format.js each time a field, formula, column or tab is added or renamed (the coverage test says the line to add), so it will move often. OK, or only on removals and renames?
115. **The GitHub check.** .github/workflows/test.yml installs ExcelJS but not LibreOffice, so on GitHub the recalculation checks skip. Add LibreOffice to the workflow (about a minute more per run)?
116. **Start a new client from a file.** It makes the client with the name in _meta and brings every row in as new, with no starter Budget lines. OK?
## Answers logged (Nov 3 2026, second round)

- 1 Look Preview: resolved; spec/SLAM Look Preview.html came with the Oct 28 spec refresh. It is the approved look sample the staples page is checked against.
- 32 Gut spending: no change; the gut number is used until the Budget is switched to The lines.
- 4 / 5 APR: a blank APR is a Guess until it is typed, and a credit card guesses 25% (a scary picture first). Personal and car loans keep the Reference data rates.
- 45 Spec: done. The backlog rows are on the Feature list tab under FROM THE BETA (added by the Phase 3.5 spec sync).
- 48 Cash flag: any cash in a retirement account or HSA is flagged; each account can turn it off (Cash here is on purpose).
- 49 Concentration: 25% for everyone; Coach tools › Session turns it off for a client.
- 50 Short goal in stocks: no change; any stocks flag it.
- 54 Owner: one field, Me / Partner / Joint (solo: Me / Joint). Individual / Joint is gone.
- 56 Credit cards: standard debt with their own sub-tab, Net worth › Credit cards.
- 58 Paycheck: built. Income › Comes out of your paycheck lists everything taken before the money lands; Benefits at work answers now come out of the paycheck (commuter and FSAs before tax, ESPP and after-tax 401(k) after tax).
- 59 Large refund: over $10,000.
- 62 Sinking funds: money going into a sinking fund (on an event) comes out of the surplus.
- 69 Joint and NYC rates: still not confirmed. tax.ny.gov is blocked by this session's network settings; allow it and they can be checked against Form IT-2105-I.
- 70 Savings rate headline: built in PR #5 (counts 401(k), HSA and the match).
- 74 Who covers it: four answers, I'm covering it / We're splitting it / Someone else is / Not for me, each with its own details; the Budget can group by it. Included in rent and N/A now count as zero.
- 75 Payday card: no change; savings goals and sinking funds stay separate from free to spend (Free after savings).
- 401(k) in two passes: Income asks dollars a paycheck and Employer match? Yes / No / Don't know; the 401(k) has the detail (PR #7).

## Still open (Nov 3 2026)

117. **The Therapy section's new name.** You said rename it for most people. Proposed: "Health and self-care" (therapy, health insurance, copays, prescriptions, gym, haircuts). The T in DRAFTT would no longer stand for it. OK, or another name?
118. **Starter estimate ranges.** The usual list's starter guesses now say Accept estimate. Show a range under each (e.g. "most people $X to $Y")? That needs a source for the ranges; there is none in the spec.
119. **63 Taking over.** It is the list of bills someone else pays today (parents, a partner, an employer) that you will start paying on a date you set, e.g. a phone plan from June 2027. Should those dates move the FI date and the surplus once they arrive?
120. **Rates from the website.** A static site cannot fetch the NY tax tables when it runs (no server, and the tax site does not allow it). Rates stay in data/reference-2026.json, checked by hand each year. OK?

## All closed (Nov 3 2026)

Every question from 1 to 102 and 117 to 120 is closed; 103 to 116 (Open the books) arrived after and are still open. "Kept" means the default described in the question stays, by your call to close them all out.
Sessions numbered new questions at the same time: Phase 3.5's are 92 to 102, Open the books' are 103 to 116, this one's are 117 to 120.

| # | Closed as |
|---|---|
| 1 | Resolved: the Look Preview came with the Oct 28 spec refresh |
| 2, 3 | Kept: Inter; the Words and states rows word for word |
| 4, 5 | Answered: a blank APR is a Guess until typed; a credit card guesses 25% (Reference data notes the Fed's 22.15%); other loans use Reference data |
| 6 to 9 | Kept: the Mockup's 8 tools; 32px icon buttons; total interest by formula; real hourly wage with the 173-hour Guess |
| 10 | Answered: Coast FI retires at 65 (built) |
| 11 | Answered: the surplus stays surplus until Invest my surplus (built) |
| 12 to 14 | Kept: an all-in total includes debt payments; the all-in total is the spending number; FICA on gross |
| 15 | Answered: inflation is covered in the FI date (returns are after inflation; the FI date says so) |
| 16 | Kept: the private Test client fills in when its file does |
| 17 to 24 | Kept: dark mode values, Know it in plain text, visuals panel placement, empty states, backup banner, Fast Track button, top bar at 1280px, list columns |
| 25 to 31 | Kept: Fast Track debt step, gates toast with Go there, unanswered gates show everything, each job taxed on its own, One page, loan removal asks, gas and tolls gated |
| 32 | Answered: the gut number until the Budget is switched to the lines |
| 33 to 43 | Kept: starter guesses (now Accept estimate), guessed days, gaps at close, moved entries, Fat FI 1.5x, real dollars, Next 3, End session, Export PDF, pre-call form later, card bills on payoff |
| 44, 45 | Answered: the full batch was resent and built; the backlog is in the spec's Feature list |
| 46 | Kept: Will email reads I'll find it later |
| 47 | Answered: Income and the 401(k) fill each other in (now in two passes) |
| 48 to 50 | Answered: any cash flagged with a per-account off switch; 25% concentration with a coach off switch; any stocks flag a short goal |
| 51 to 53 | Kept: overlap by name; Stocks % removed; Balance as of |
| 54 | Answered: Me / Partner / Joint |
| 55 | Kept: Next counts parked answers |
| 56 | Answered: Credit cards sub-tab under Net worth |
| 57 | Done: the commuter limit is in the spec's Reference data; the nudge uses NY and NYC tax |
| 58, 59 | Answered: Comes out of your paycheck; a large refund is over $10,000 |
| 60, 61 | Kept: the year view on Next 12 months; renewal months start blank |
| 62 | Answered: sinking funds on events come out of the surplus |
| 63, 119 | Closed: a covered bill is yours from its takeover month, so the surplus and FI date follow on that date (built) |
| 64 to 67 | Kept: three freeze rows; community presets per client; the timer for the demo client; I don't have this as Not for me |
| 68 to 75 | Answered (see the Answers logged sections) |
| 76, 77 | Kept: paychecks left from today's date; Report this needs a client |
| 78 to 91 | Answered and built in the reorganize, polish and answers passes (PROGRESS.md; "Answered (Phase 3.5)" above) |
| 92 | Kept: big e months x1, x1.25, x1.5 for steady, varying, unpredictable income |
| 93 | Kept: True FI grosses up for about 15% tax until retirement taxes are in |
| 94 | Kept: Later and Optional step statuses beside Done, In progress, Next |
| 95 | Kept: a bill is late 5 days after its day |
| 96 | Kept, to confirm with the other rates: Roth IRA phase-out starts $153,000 single, $242,000 joint |
| 97 | Kept: both dates shown (FOO order and today's payment) |
| 98 | Kept: the five launch moves as listed |
| 99, 100 | Kept: the extra bridge rows; Pay yourself first as a line above the income statement |
| 101, 102 | Kept: FOO markers on the 1st, close marker on the last day; Move button on phones |
| 103 to 116 | Open: the Open the books questions, asked after this table was made |
| 117 | Closed: the T letter reads Health and self-care (built) |
| 118 | Closed: no ranges under starter estimates (there is no source for them); Accept estimate stays |
| 120 | Closed: rates stay in data/reference-2026.json, checked by hand each year. The NY joint brackets, NYC rates and the Roth IRA limits (96) are still to be checked once tax.ny.gov and irs.gov are allowed in the session's network settings |

## Answered (Nov 3 2026, Open the books)

- 103 Rent and roommates: built. A split bill asks "The amount above is: My share / The whole bill" and shows the other side worked out (a share times the people splitting it, or the whole bill divided by them). Blank stays The whole bill, so no saved number moves. Housing % now splits with the roommates like every other number. Works on every shared bill, not only rent. In the spreadsheet: This amount is, and a Whole bill a month column.
- 106 Statuses in the sheet: keep all six.
- 116 Start a new client from a file: OK as built.
- Still open: 105 (which From the app rows could become formulas), 109 (tabs for the fields that stay in the app), 111 (map the spec fields by ID), 112 (the new-row rule), 113 (conflicts per field), 115 (LibreOffice on GitHub).
- 111 Spec drift: no drift allowed, linked row by row. The spec's Fields tab has a SLAM id column naming exactly what each row is in code; 123 rows were added for fields the spec did not have (F266 to F388); a row that names nothing real or a field with no row fails the run. 24 rows say not built yet, with why (SPEC-DRIFT.md).
- 112 New rows: a type when the tab has types; on Spending lines, the category (it decides the letter, Fixed or Variable and the date). Built.
- 113 Conflicts: only the same number changed on both sides, shown as What's changed with a Yes or No. Built.
- 114 Format version: stays as built (it moves with every new field; the coverage test says the line to add).
- Rent and the profile: About you › Home and shared bills (who you live with, how many split, your share or the whole bill, which bills you split) feeds every Budget line. Built.

117. **Spec rows not built yet.** 24 spec rows are named notyet in the SLAM id column: itemized deductions, Social Security, a real or nominal dollars switch, a part of a bill someone else covers, a reimbursed amount, a happiness rating per line, the 401(k) loan due-on-leaving note, a card library, a next check date, and one starter line each where the spec has several (kids, pets, car wash, money sent to family). Which do you want built, and which should come off the spec?
- 117 Spec rows not built yet: built the next check date (F244), every starter line the spec lists (kids, pets, car wash, money sent to family), a reimbursed amount on a line (F093), part of a bill someone covers (F089), and today's or future dollars (F220). Parked in the spec: itemized deductions, a happiness rating per line, a card library, the 401(k) loan due-on-leaving note, Social Security.
