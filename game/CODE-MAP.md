# SLAM the Game: code map

This file is generated. Do not edit it. Run `python3 tools/game_codemap.py`.

Date: 2026-11-25. Files: 126. Lines: 75,992. Top-level functions: 1709. Replaced functions: 0, in 0 places. Functions with two declarations: 0. Hidden errors: 0.

## 1. Files in load order

The browser loads the files in this order. A file can use all names from the files above it.

Bundles from outside the game, loaded first and not examined here: `vendor/retire-engine.js`. `KNOWN-WEAK.md` tells how to rebuild them.

| # | File | Lines | Functions | Lines > 300 chars | Hidden errors | Purpose |
|---|------|------:|----------:|------------------:|--------------:|---------|
| 1 | `core/report.js` | 25 | 1 | 0 | 0 | One function, report(e, where), records each error that a catch block stops |
| 2 | `core/soon.js` | 130 | 10 | 1 | 0 | A part of the game that is not ready must never show as a broken or blank screen |
| 3 | `account/trust.js` | 370 | 15 | 2 | 0 | Trust. Three things: (1) the one line "Education and tools, not financial advice." and the link to the privacy page; (2) calm words for each answer of... |
| 4 | `account/supa.js` | 693 | 19 | 6 | 0 | Accounts on the website. Each player signs in with an email address and a password, and gets a private saved game in the Supabase database |
| 5 | `data/skills.js` | 5,163 | 0 | 0 | 0 | Data only. The skills of the skill tree: name, group, effort, reward, and the text of each skill |
| 6 | `data/skillthemes.js` | 2,718 | 0 | 0 | 0 | Data only. Other names and words for the skills, one set for each theme |
| 7 | `data/qr.js` | 14 | 0 | 1 | 0 | Data only. One QR code as an SVG picture (window.QR_SVG), and the address that the code contains (window.QR_URL) |
| 8 | `data/market.js` | 179 | 0 | 0 | 0 | Data only. US market history by calendar year, for the retirement odds (features/odds.js) |
| 9 | `core/withdraw.js` | 357 | 16 | 7 | 0 | The ways to take money out: the list of families and variants, the rule of each one for a year of spending, how the money is held, when the money come... |
| 10 | `data/limits2026.js` | 19 | 0 | 0 | 0 | Data only. The 2026 limits of the tax-favored accounts, for the two paths (features/paths.js) |
| 11 | `core/engine.js` | 3,854 | 123 | 0 | 0 | The engine: the data model of one profile and all the math |
| 12 | `core/engine2.js` | 420 | 18 | 0 | 0 | The game mechanics that are also the data entry: the layers, the bonfires, the fog (how much of the picture is clear) |
| 13 | `core/recalc.js` | 434 | 16 | 0 | 0 | The math of Recalculating: the route (old date, new date), the triage when the bills are more than the income, the emergency fund refill, the safe-to-... |
| 14 | `core/reportcore.js` | 592 | 28 | 2 | 0 | Report a bug or idea: one report with the screen name, the last 3 taps, the device, the width and the app version; the list on the device; the sending... |
| 15 | `account/gate.js` | 67 | 7 | 0 | 0 | Add-ons, part 1 of 2. Some parts of the game are not in these files |
| 16 | `screens/ui.js` | 6,514 | 214 | 135 | 0 | The main screens and the core of the interface: the Home, Check-in, Money and Me tabs, the sheets, render(), save(), and the click handler that calls ... |
| 17 | `features/games.js` | 673 | 25 | 13 | 0 | The screens of the games that are the data entry (layer 1) |
| 18 | `features/games2.js` | 1,463 | 40 | 19 | 0 | The games of layer 2 (sort), layer 3 (make exact) and layer 4 (come back) |
| 19 | `features/year.js` | 782 | 24 | 13 | 0 | The year: calendars, funds for true expenses, the months ahead, the Yearly Review, rest windows, and the chance test |
| 20 | `features/chart.js` | 1,303 | 13 | 6 | 0 | The Money Chart: ten statements, five elements, and the result for one person or two persons |
| 21 | `screens/profiles.js` | 135 | 6 | 4 | 0 | More than one person in one game: a household (the money is combined) or the persons that a coach helps (the money is apart) |
| 22 | `screens/smart.js` | 679 | 15 | 5 | 0 | The setup questions change with each answer |
| 23 | `screens/planner.js` | 1,280 | 55 | 18 | 0 | The navigation (a tab bar at the bottom, and a menu for all other screens), the plan (a calendar of money tasks, the tab "Next Steps"), the check-in b... |
| 24 | `account/cloud.js` | 560 | 23 | 0 | 0 | The game saves itself to the account of the player |
| 25 | `screens/ux.js` | 837 | 37 | 7 | 0 | The interface rules for a new player: five plain tabs, one clear title on each screen, Guess / Close / Exact, a Back button that works, and Undo in th... |
| 26 | `core/metrics.js` | 1,858 | 27 | 8 | 0 | Key numbers. Each ratio that this game can calculate, in plain words: the value, the rule of thumb and its source, what moves the value, and if the pl... |
| 27 | `features/debts.js` | 412 | 16 | 3 | 0 | The debt picture by taps (rate, monthly payment, card limit, how much the debt troubles the player), then three payoff plans side by side |
| 28 | `features/import.js` | 274 | 7 | 9 | 0 | Fill in the spending from a bank or card statement file |
| 29 | `features/compare.js` | 200 | 11 | 4 | 0 | Side by side. Screen 1: the plan as it is, next to one or two moves, with the same month-by-month simulation (goalSim) as the other screens |
| 30 | `features/quick.js` | 276 | 12 | 1 | 0 | Quick math. Three small what-if questions: does this car fit, how much home fits, and what one dollar becomes |
| 31 | `features/reveal.js` | 255 | 8 | 1 | 0 | Meet your character. Six cards, one tap each, change the numbers into a person: chapter, era, who the player is with money, the strongest number, and ... |
| 32 | `features/moneylog.js` | 255 | 11 | 4 | 0 | Two tools. (1) The money log: all logged entries by month, read-only, with a copy as plain text |
| 33 | `features/drills.js` | 524 | 15 | 9 | 0 | Four tools for hard days. (1) Money fire drills: a money fear, calculated on the numbers of the player, then one small action |
| 34 | `features/gig.js` | 397 | 24 | 9 | 0 | Work for yourself. For income with no tax taken out |
| 35 | `features/know.js` | 204 | 10 | 4 | 0 | What you already know. Five letters, D.A.I.T.E |
| 36 | `features/fair.js` | 269 | 11 | 6 | 0 | Share costs fairly. For two or more persons: five ways to divide the shared costs, side by side |
| 37 | `features/values.js` | 213 | 6 | 6 | 0 | Is my money going where I want? Three steps, all taps: the three things that matter most, two taps for each place where the money goes, and the result |
| 38 | `features/missions.js` | 361 | 12 | 3 | 0 | The mission board. The same next steps, shown as missions: why now, how long, the reward, and what it opens |
| 39 | `features/connect.js` | 396 | 19 | 9 | 0 | How it all connects. (1) Links between the 25 skill tracks: what a track works best after, and what it opens, each with the reason |
| 40 | `features/house.js` | 495 | 15 | 8 | 0 | Our household. For a household that is not one person or one married couple |
| 41 | `features/back.js` | 283 | 14 | 2 | 0 | The welcome-back card. On the first look of a new day, one slim row on Home shows what the player did last time, what moved, and where to continue |
| 42 | `features/lever.js` | 565 | 15 | 6 | 0 | Which lever matters most. Six levers (Earn, Spend, Protect, Grow, Stretch, Keep), each with a price in dollars a year on the numbers of the player |
| 43 | `features/mult.js` | 426 | 13 | 8 | 0 | The multipliers board. Each multiplier (a match at work, card rewards, bank bonuses, buying ahead, a tax-favored account, a health savings account) ha... |
| 44 | `features/ask.js` | 449 | 9 | 3 | 0 | One small question at a time, for "Make your numbers real" |
| 45 | `features/alloc.js` | 171 | 6 | 1 | 0 | Keep the first guess for each money area, and show how much of the guess is placed in real lines and how much is not placed yet |
| 46 | `features/session.js` | 167 | 3 | 3 | 0 | Make a first coaching session fast |
| 47 | `features/ask2.js` | 389 | 9 | 4 | 0 | The same pattern as ask.js for three more places: the details of one debt, the questions of Key numbers, and the questions about the job match and the... |
| 48 | `features/sign.js` | 250 | 5 | 2 | 0 | Before you sign. The true cost of a new loan, asked one small question at a time, then shown in the terms of the player |
| 49 | `features/owed.js` | 128 | 4 | 2 | 0 | What each debt costs you: the interest in dollars, and the same amount as months of living costs |
| 50 | `features/study.js` | 508 | 13 | 4 | 0 | Student loan plans, side by side |
| 51 | `features/together.js` | 215 | 7 | 3 | 0 | The Money Chart for more than two persons: the player, their person, up to four more persons who answer the same 10 statements on this phone, and othe... |
| 52 | `features/people.js` | 319 | 7 | 3 | 0 | Your people, one layer at a time |
| 53 | `features/fold.js` | 65 | 4 | 1 | 0 | One list on Next Steps. The mission board and the older card "Ready to plan" showed the same steps |
| 54 | `screens/nav.js` | 486 | 13 | 1 | 0 | The same four things on each sheet: Back (one screen back), Forward, Close, and an "i" with two sentences about the screen |
| 55 | `features/home.js` | 140 | 4 | 0 | 0 | Put the game on the home screen of the phone or the laptop (website only) |
| 56 | `screens/tidy.js` | 185 | 10 | 2 | 0 | Repairs from the usability audit, for all screens at one time |
| 57 | `account/addon.js` | 634 | 31 | 5 | 0 | Add-ons, part 2 of 2. At sign-in the game asks the account which add-ons are on |
| 58 | `features/fork.js` | 603 | 20 | 12 | 0 | Fork Theory. A fork is a thing that troubles the player now |
| 59 | `features/csp.js` | 731 | 25 | 12 | 0 | Two views of one month of money |
| 60 | `features/ideas.js` | 1,120 | 21 | 5 | 0 | Famous money ideas, the frame and ideas 1 to 8 |
| 61 | `features/ideas2.js` | 778 | 2 | 2 | 0 | Famous money ideas 9 to 16. The same frame and rules as ideas.js |
| 62 | `features/ideas3.js` | 1,102 | 1 | 1 | 0 | Famous money ideas 17 to 33: retirement, investing, earning |
| 63 | `features/ideas4.js` | 974 | 2 | 3 | 0 | Famous money ideas 34 to 45: spending, deals, real estate |
| 64 | `features/ideas5.js` | 1,305 | 2 | 0 | 0 | Famous money ideas 46 to 63: mindset, time, family and giving |
| 65 | `features/roof.js` | 273 | 7 | 1 | 0 | One list of the famous money ideas that are built in this game |
| 66 | `features/ideasz.js` | 338 | 7 | 3 | 0 | The last file of the famous money ideas: the glossary of each idea, which ideas fit the player now, and the block on Next Steps |
| 67 | `features/dep.js` | 254 | 11 | 2 | 0 | What depends on what. Some short chains show how one number feeds the next number |
| 68 | `features/eras.js` | 1,071 | 25 | 6 | 0 | Steps for the later eras, and the account recommendation |
| 69 | `features/testkit.js` | 323 | 9 | 7 | 0 | Test with a friend. A think-aloud usability test: one person tries five tasks, and the coach records how each task went with one tap |
| 70 | `features/kit.js` | 233 | 22 | 7 | 0 | The shared parts of the plan screens (the two paths, the odds, the simulators and the other screens of the Plan batch) |
| 71 | `features/retire.js` | 574 | 24 | 0 | 0 | The one adapter to the retirement engine of Zack Williams (vendor/retire-engine.js, MIT license) |
| 72 | `features/taxview.js` | 328 | 6 | 2 | 0 | The tax view. From pay before taxes, the filing status, the state and the pre-tax contributions: the top federal bracket, the average rate (federal pl... |
| 73 | `features/odds.js` | 418 | 11 | 3 | 0 | Retirement odds. Two answers in plain words: "X out of 100 random markets work" (the Monte Carlo of the retirement engine of Zack Williams, through fe... |
| 74 | `features/cover.js` | 448 | 7 | 1 | 0 | Insurance needs. In place of the yes / no checks, each kind of cover gets a needs calculation, the gap in dollars, and one next step: disability (abou... |
| 75 | `features/mix.js` | 325 | 7 | 1 | 0 | Investment mix and fees, by taps for each investment account: what is inside, and a fee preset, plus an advisor fee |
| 76 | `features/slept.js` | 117 | 5 | 0 | 0 | While you slept. What the invested money of the player earned per hour, per day, per month and per year, at the return of the plan, next to the real h... |
| 77 | `features/coast.js` | 136 | 5 | 1 | 0 | Two things about freedom. (1) The FI ratio on Key numbers: what the investments can pay each month, next to what the player spends each month |
| 78 | `features/sim.js` | 437 | 20 | 0 | 0 | The simulator engine. One decision with 2 to 4 options |
| 79 | `features/sims/rentbuy.js` | 196 | 2 | 0 | 0 | Simulator 1: rent or buy. The price, the rate, the down payment, the stay, the rent and its growth, the home growth, the upkeep, the closing and selli... |
| 80 | `features/sims/mortgage.js` | 143 | 2 | 0 | 0 | Simulator 2: pay off the mortgage early, or invest the same money |
| 81 | `features/sims/debt.js` | 107 | 1 | 0 | 0 | Simulator 3: pay extra on a debt, or invest the extra, by the rate of the debt |
| 82 | `features/sims/car.js` | 166 | 1 | 0 | 0 | Simulator 4: the car. Keep the car you have, buy a used car, buy a new car, or lease |
| 83 | `features/sims/roth.js` | 120 | 1 | 0 | 0 | Simulator 5: pre-tax or Roth for this year's money |
| 84 | `features/sims/job.js` | 128 | 1 | 0 | 0 | Simulator 6: a new job or a raise, or staying |
| 85 | `features/sims/break.js` | 120 | 1 | 0 | 0 | Simulator 7: take a break (a sabbatical or a mini-retirement) |
| 86 | `features/sims/side.js` | 125 | 2 | 0 | 0 | Simulator 8: side income. Hours a week, the rate, and the tax to set aside (the same set-aside idea as "Work for yourself", gig.js) |
| 87 | `features/sims/kid.js` | 117 | 1 | 0 | 0 | Simulator 9: have a kid or add a dependent |
| 88 | `features/sims/city.js` | 128 | 2 | 0 | 0 | Simulator 10: move to a cheaper or a pricier city |
| 89 | `features/sims/spend.js` | 102 | 2 | 0 | 0 | Simulator 11: a big one-time spend (a wedding, a trip, a gift) |
| 90 | `features/sims/stop.js` | 171 | 2 | 0 | 0 | Simulator 12: stop working earlier or later, by year, and when to claim Social Security (62, 67 or 70) |
| 91 | `features/paths.js` | 668 | 14 | 2 | 0 | Two paths. Two full plans from the same profile, side by side, and a third that blends them |
| 92 | `features/plan.js` | 341 | 6 | 4 | 0 | The plan summary. One screen with the 7 steps of the CFP Board's financial planning process as rows (your situation, your goals, where you are headed,... |
| 93 | `features/ask3.js` | 357 | 12 | 3 | 0 | The Ask front door. One row on Home under the top numbers with four big buttons |
| 94 | `features/quota.js` | 234 | 11 | 4 | 0 | Extras for people who love spreadsheets |
| 95 | `data/takeout2026.js` | 122 | 0 | 0 | 0 | Data only. The reference numbers for "Taking money out" (features/takeout.js): the rules for reaching retirement money before age 59 and a half, and t... |
| 96 | `features/takeout.js` | 1,001 | 21 | 0 | 0 | Taking money out. Four answers on one sheet, each from the numbers the game already has, and a fifth tab, "Compare the ways" (features/ways.js) |
| 97 | `features/ways.js` | 536 | 21 | 2 | 0 | Compare the ways. The same plan (the money, the spending, the stop age, Social Security) through each way to take money out: the 4% rule and its setti... |
| 98 | `features/ages.js` | 187 | 7 | 0 | 0 | Two ages, for each person. (1) Work optional: the age when the invested money is enough to live on (the freedom date of the plan) |
| 99 | `features/stress.js` | 282 | 6 | 1 | 0 | The stress test. One result from two tests of the same plan: the replay of each real start year of US market history, and the 1,000 random markets of ... |
| 100 | `features/blocks.js` | 319 | 7 | 1 | 0 | Life event blocks that the player stacks: a home, a car, a child, a job change, a sabbatical, a move |
| 101 | `features/windfall.js` | 431 | 7 | 2 | 0 | The windfall. What to do with a bonus, a gift, a tax refund or other extra money |
| 102 | `data/health2026.js` | 25 | 0 | 0 | 0 | Data only. What health cover costs in 2026 with no job, for the quit fund countdown (features/countdown.js) |
| 103 | `features/countdown.js` | 433 | 13 | 1 | 0 | Countdowns. One countdown type for each goal on My Goals: a target amount, what is saved for it, and a monthly amount or a date |
| 104 | `features/offers.js` | 264 | 5 | 1 | 0 | Two job offers side by side. For each offer: the take-home pay from the tax tables, the match, the stock, less the health premiums and the commute |
| 105 | `features/nextacct.js` | 280 | 4 | 1 | 0 | Which account next, up to each limit |
| 106 | `features/ledger.js` | 377 | 8 | 1 | 0 | The giant ledger and the three statements |
| 107 | `data/cardtemplate.js` | 307 | 8 | 0 | 0 | The template of one card of the card library |
| 108 | `data/cards2026.js` | 6,547 | 0 | 24 | 0 | Data only. The card library of the card vault (features/vault.js): 93 cards at 12 US banks |
| 109 | `features/vault.js` | 1,479 | 43 | 11 | 0 | The card vault ("Is this card right for me?" of the Slam web app, in the game) |
| 110 | `features/element.js` | 319 | 9 | 3 | 0 | The character reveal after setup, in place of the card "Your character is ready" |
| 111 | `features/xray.js` | 281 | 4 | 2 | 0 | The product X-ray. One money product that the player pays into each month (insurance that also saves, or an investment with fees), next to the common ... |
| 112 | `features/transit.js` | 381 | 8 | 6 | 0 | Life Transitions: "Break in case of emergency", on My Goals |
| 113 | `data/kidlessons.js` | 194 | 0 | 0 | 0 | Data only. The lessons of Kids mode (features/kids.js): 20 short lessons for a student in a high school personal finance class |
| 114 | `features/kids.js` | 205 | 6 | 5 | 0 | Kids mode: "Help your kid stress less about money" |
| 115 | `data/metros.js` | 327 | 0 | 0 | 0 | Data only. Rough housing numbers for 29 US areas and one typical US metro, for the moves that need an area (features/strat.js) |
| 116 | `data/strategies.js` | 993 | 4 | 4 | 0 | The strategies of "Moves to try" (features/strat.js) |
| 117 | `features/strat.js` | 699 | 29 | 9 | 0 | The Strategy Engine: "Moves to try" |
| 118 | `account/roles.js` | 109 | 6 | 0 | 0 | Roles and hats. One login has up to three hats: Player (the game), Coach (coach.html) and Admin (admin.html) |
| 119 | `features/stars.js` | 755 | 35 | 3 | 0 | The Galaxy. A second view of the 25 skill tracks: 25 spiral arms (constellations) from "You" in the middle out to the FI ring, 625 stars, one star for... |
| 120 | `features/exletter.js` | 162 | 5 | 0 | 0 | One exercise: Letter from your calm self |
| 121 | `features/recalc.js` | 390 | 13 | 8 | 0 | Recalculating. When the real numbers move a date of the plan, one calm card shows the old date, the new date and the one next turn |
| 122 | `features/audit.js` | 257 | 5 | 3 | 0 | The Mistake audit. It is optional |
| 123 | `features/book.js` | 384 | 14 | 4 | 0 | The spreadsheet of the plan. Each number of the Plan batch, with its formula, in one table that the player can copy into Google Sheets or Excel, or sa... |
| 124 | `features/questlog.js` | 426 | 23 | 7 | 0 | The Quest Log ("Where am I"). One button, on every tab and on every sheet, opens one sheet that shows where the player is: a Continue card (back to wh... |
| 125 | `features/fbreport.js` | 259 | 18 | 1 | 0 | Report a bug or idea, from each screen |
| 126 | `features/built.js` | 1,120 | 4 | 2 | 0 | What's built. One list of all features of this game: built, partly built, or not built |

"Hidden errors" is the number of `catch` blocks that are empty. An empty block drops the error with no record.

## 2. Replaced functions

A replaced function is a function that a later file puts a new function in the place of. Before 2026-11-22 the game had 61 of these, in 113 places. Now each base function calls its parts by name. The target for this table is: no rows.

No rows: no function is replaced.

### Functions with two declarations

When two top-level functions have the same name, the one that the browser loads last wins, and the other one never runs. This is a defect each time. The target is: no rows.

No rows.

### Actions (ACT) that are set in more than one place

`ACT[name]` runs when the player taps a button with `data-a="name"`. 36 of 709 actions are set in more than one place. The last place wins. Most later places keep the earlier action, call it, and add to it. To read one action, read all places in its row, in order.

| Action | Set in (load order) | Places |
|--------|---------------------|-------:|
| `fsave` | `screens/ui.js`, `screens/ui.js`, `screens/ui.js`, `features/gig.js` | 4 |
| `metric` | `core/metrics.js`, `features/ask2.js`, `features/csp.js`, `features/roof.js` | 4 |
| `set` | `screens/ui.js`, `screens/ui.js`, `screens/ui.js`, `screens/smart.js` | 4 |
| `plock` | `screens/ui.js`, `screens/ui.js`, `screens/ui.js` | 3 |
| `pmoved` | `screens/ui.js`, `screens/ui.js`, `screens/ui.js` | 3 |
| `skilldone` | `screens/ui.js`, `screens/ui.js`, `features/connect.js` | 3 |
| `agedec` | `screens/ui.js`, `screens/smart.js` | 2 |
| `backup` | `screens/ui.js`, `account/cloud.js` | 2 |
| `creditsave` | `screens/ui.js`, `screens/ui.js` | 2 |
| `dbset` | `features/debts.js`, `features/ask2.js` | 2 |
| `dreveal` | `screens/ui.js`, `screens/ui.js` | 2 |
| `dsave` | `screens/ui.js`, `features/fork.js` | 2 |
| `flow` | `screens/ui.js`, `screens/ui.js` | 2 |
| `fog` | `features/games.js`, `features/know.js` | 2 |
| `fset` | `screens/ui.js`, `screens/ui.js` | 2 |
| `gplace` | `screens/ui.js`, `screens/ui.js` | 2 |
| `knans` | `core/metrics.js`, `features/ask2.js` | 2 |
| `mcans` | `features/chart.js`, `features/together.js` | 2 |
| `move` | `screens/ui.js`, `screens/ui.js` | 2 |
| `navback` | `screens/planner.js`, `screens/nav.js` | 2 |
| `navfwd` | `screens/planner.js`, `screens/nav.js` | 2 |
| `node` | `screens/ui.js`, `features/eras.js` | 2 |
| `pclear` | `screens/ui.js`, `screens/ui.js` | 2 |
| `people` | `screens/ui.js`, `account/cloud.js` | 2 |
| `prmyes` | `screens/profiles.js`, `account/cloud.js` | 2 |
| `rankup` | `screens/ui.js`, `screens/ui.js` | 2 |
| `rng` | `screens/ui.js`, `features/ask.js` | 2 |
| `rowsave` | `screens/ui.js`, `screens/ui.js` | 2 |
| `setn` | `screens/ui.js`, `screens/smart.js` | 2 |
| `sharpdone` | `screens/ui.js`, `features/ask2.js` | 2 |
| `shopen` | `screens/ui.js`, `features/ask.js` | 2 |
| `switch` | `screens/ui.js`, `screens/planner.js` | 2 |
| `tog` | `screens/ui.js`, `screens/smart.js` | 2 |
| `togb` | `screens/ui.js`, `screens/smart.js` | 2 |
| `wback` | `screens/ui.js`, `screens/smart.js` | 2 |
| `wnext` | `screens/ui.js`, `screens/smart.js` | 2 |

## 3. Functions with no caller

These names occur one time in the game source. A function can stay only when a comment above it starts with `NO CALLER IN THIS REPOSITORY` and gives the reason. Functions without that comment go to `game/unused/`. The target is: no function without a reason.

| Function | File | Reason to keep it |
|----------|------|-------------------|
| `igFree` | `features/ideas2.js` | Keep this function until the owner confirms that no add-on calls it. |
| `igYears` | `features/ideas.js` | Keep this function until the owner confirms that no add-on calls it. |
| `offDays` | `features/year.js` | Keep this function: it reads the off days from each calendar, and an add-on can call it. |
| `oxyRows` | `features/ideasz.js` | Keep this function: tests/t_ideas.js examines it, and an add-on can call it. |
