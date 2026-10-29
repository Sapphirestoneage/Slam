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
