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
17. **Dark mode values the tab leaves open.** "Lighter versions in dark mode" for the area hues has no values; used Income #5CCB8F, Debt #D687D7, Assets #4FC3CC, Taxes #A49DF7, Needs #7AA6F5, Goals #EE8DC0. Warnings in dark mode use #2C4A85 (the dark primary-dark #06142F disappears on the #0E1729 page). The calm destructive outline is #0A2A66 light, #CBD6EA dark.
18. **Status 'Know it' on a row.** DMMT says status tags only show when a number is not Know it. Default: the row's status button reads 'Know it' in plain text and turns into the colored tag otherwise.
19. **Visuals panel placement.** Side at 1600px and wider, Below under that: at 1440px a full debt row (name, balance, APR, payment, payoff, status, actions) does not fit beside a chart.
20. **Screens the Words tab has no empty state for** (Home Live and Wrap-up, Month-end close, Next 12 months, Scenarios, History, the gear's lists). Default: the 'A list with no rows' pattern ('No closed months yet' + the add button), or one plain sentence and the screen's one main button.
21. **Never backed up.** Words gives 'Last backup 9 days ago.'; with no backup at all the banner says 'No backup yet.' + 'Back up now'. It is coach-only, so client view hides it.
22. **Start Fast Track before phase 5.** It is the My Money empty state's main button, but Fast Track is built in phase 5. Default: shown, disabled, and it says why.
23. **Top bar room at 1280px.** Left, five tabs and eight tools do not fit at 1280px with every label. Defaults: Saved is a green tick (the word is its tooltip; 'Unsaved' always shows in words); below 1400px Find shows its icon and '/' without the word, and the quick add box is narrower.
24. **Income and Assets lists before phase 5.** Built from the same staples as Debt so the shell has real rows to show; phase 5 replaces their columns with the Mockup's.
