# SLAM the Game: code map

This file is generated. Do not edit it. Run `python3 tools/game_codemap.py`.

Date: 2026-11-26. Files: 177. Lines: 108,770. Top-level functions: 2570. Replaced functions: 0, in 0 places. Functions with two declarations: 0. Hidden errors: 0.

## 1. Files in load order

The browser loads the files in this order. A file can use all names from the files above it.

Bundles from outside the game, loaded first and not examined here: `vendor/retire-engine.js`. `KNOWN-WEAK.md` tells how to rebuild them.

| # | File | Lines | Functions | Lines > 300 chars | Hidden errors | Purpose |
|---|------|------:|----------:|------------------:|--------------:|---------|
| 1 | `core/report.js` | 25 | 1 | 0 | 0 | One function, report(e, where), records each error that a catch block stops |
| 2 | `core/soon.js` | 130 | 10 | 1 | 0 | A part of the game that is not ready must never show as a broken or blank screen |
| 3 | `features/firelink.js` | 35 | 1 | 0 | 0 | The button "Start from a blank FIRE sheet": one small function for each place that shows it (the Export entry of the game, the Export entry of the web... |
| 4 | `account/trust.js` | 375 | 15 | 2 | 0 | Trust. Three things: (1) the one line "Education and tools, not financial advice." and the link to the privacy page; (2) calm words for each answer of... |
| 5 | `account/liveflag.js` | 113 | 10 | 0 | 0 | The ONE switch of Live Session Mode (a coaching call that fills the client's profile while the two talk) |
| 6 | `account/door.js` | 228 | 19 | 0 | 0 | The front door. A person who arrives from the QR code or a link, with no account on this device, sees one landing screen: one line, one big Start butt... |
| 7 | `account/lock.js` | 254 | 16 | 2 | 0 | App lock and passkeys (run Not built, groups 1 to 5, Part 10b) |
| 8 | `account/supa.js` | 737 | 22 | 6 | 0 | Accounts on the website. Each player signs in with an email address and a password, and gets a private saved game in the Supabase database |
| 9 | `data/skills.js` | 5,163 | 0 | 0 | 0 | Data only. The skills of the skill tree: name, group, effort, reward, and the text of each skill |
| 10 | `data/skillthemes.js` | 2,718 | 0 | 0 | 0 | Data only. Other names and words for the skills, one set for each theme |
| 11 | `data/qr.js` | 15 | 0 | 1 | 0 | Data only. One QR code as an SVG picture (window.QR_SVG), and the address that the code contains (window.QR_URL) |
| 12 | `data/market.js` | 179 | 0 | 0 | 0 | Data only. US market history by calendar year, for the retirement odds (features/odds.js) |
| 13 | `core/withdraw.js` | 357 | 16 | 7 | 0 | The ways to take money out: the list of families and variants, the rule of each one for a year of spending, how the money is held, when the money come... |
| 14 | `data/limits2026.js` | 19 | 0 | 0 | 0 | Data only. The 2026 limits of the tax-favored accounts, for the two paths (features/paths.js) |
| 15 | `core/engine.js` | 3,928 | 126 | 0 | 0 | The engine: the data model of one profile and all the math |
| 16 | `core/engine2.js` | 420 | 18 | 0 | 0 | The game mechanics that are also the data entry: the layers, the bonfires, the fog (how much of the picture is clear) |
| 17 | `core/homebuy.js` | 206 | 9 | 0 | 0 | Home buying and renting: the bank's payment (principal and interest), the true cost of owning line by line, the true cost of renting, the year owning ... |
| 18 | `core/career.js` | 278 | 19 | 1 | 0 | Career and education: what a course or degree costs and pays back (the payback years, the lifetime value, the move for the FI date), the presets, two ... |
| 19 | `core/family.js` | 162 | 6 | 1 | 0 | Family money: the sandwich years (money to parents and kids at once), living at home (rent saved next to the time to a moving-out goal), and kids and ... |
| 20 | `core/quest.js` | 370 | 20 | 1 | 0 | The math of the quest screens (run Not built, groups 1 to 5, Part 10a): the quest mode character sheet, capacity, how this plan fails, hidden costs, w... |
| 21 | `core/trip.js` | 322 | 17 | 2 | 0 | Travel: a trip line by line (flights, lodging, food a day, the card's fee on other currencies, visa fees, travel insurance), points (cash or redeem), ... |
| 22 | `core/quick.js` | 163 | 14 | 0 | 0 | The quick calculators: a HYSA switch, lump sum or a little each month, a warranty, cost per use, Return on Hassle, worth it, personal inflation, start... |
| 23 | `core/play.js` | 235 | 6 | 0 | 0 | The math of the play parts (run Not built, groups 1 to 5, Part 10b): the daily life-sim challenge, the credit score game (myFICO's five factor shares)... |
| 24 | `core/gigcore.js` | 200 | 12 | 0 | 0 | Gig and self-employed math with no tax engine: the price floor from a profit before tax and the billable hours, the set-aside so far, retirement room ... |
| 25 | `core/hardcore.js` | 134 | 6 | 1 | 0 | The math and the words of Hard moments (run Not built, groups 1 to 5, Part 7): the split of the rent, a roommate leaving, untangling after a breakup, ... |
| 26 | `core/recalc.js` | 480 | 18 | 0 | 0 | The math of Recalculating: the route (old date, new date), the triage when the bills are more than the income, the emergency fund refill, the safe-to-... |
| 27 | `core/jobs.js` | 354 | 18 | 0 | 0 | The math of the Job of Existing (run JOE-1): which of the six unpaid jobs a player holds, from answers already given; the hours a month of running the... |
| 28 | `core/enough.js` | 292 | 7 | 0 | 0 | The math of Lifestyle creep and enough (run Not built, groups 1 to 5, Part 3): spending growth next to income growth per category, year over year, the... |
| 29 | `core/ratios.js` | 705 | 26 | 0 | 0 | The math of Ratios on Key numbers (run Not built, groups 1 to 5, Part 9): one function for each ratio, the groups, the formula and the plain sentence ... |
| 30 | `data/roles.js` | 412 | 0 | 0 | 0 | Data only. The six unpaid jobs of the Job of Existing (run JOE-1): the name, the line of the "i", the regions and trees of each job, and the recurring... |
| 31 | `core/reportcore.js` | 592 | 28 | 2 | 0 | Report a bug or idea: one report with the screen name, the last 3 taps, the device, the width and the app version; the list on the device; the sending... |
| 32 | `core/quizcore.js` | 560 | 21 | 0 | 0 | The one quiz engine: the questions a set of answers leads to, the scoring (with scores from outside as an input), ties, the top two, the confidence le... |
| 33 | `core/sins.js` | 1,075 | 51 | 0 | 0 | The money sins read: the evidence of four sources (the quiz, the ledger, the one-tap check-ins, the reactions to the app) as weighted pieces that fade... |
| 34 | `core/frameworks.js` | 345 | 21 | 3 | 0 | The math of Eli's frameworks and the canon: the SWAN number, the Second Mouse checklist, the Trust Framework, the Advice translator, the Baby Steps, t... |
| 35 | `data/quizskins.js` | 9,032 | 0 | 0 | 0 | Data only. The quiz skins of the one quiz engine (letters, address, houses, avatars, sheet, pyramid, mountain, stars, sins, scripts, enneagram, fire, ... |
| 36 | `account/gate.js` | 83 | 8 | 0 | 0 | Add-ons, part 1 of 2. Some parts of the game are not in these files |
| 37 | `screens/ui.js` | 6,701 | 217 | 136 | 0 | The main screens and the core of the interface: the Home, Check-in, Money and Me tabs, the sheets, render(), save(), and the click handler that calls ... |
| 38 | `screens/dash.js` | 424 | 29 | 4 | 0 | The one kit of view pieces for the dashboard look (DESIGN.md, "Reference: Tally"): a card, stat tiles, a sparkline, grouped bars, an area chart, a don... |
| 39 | `features/games.js` | 673 | 25 | 13 | 0 | The screens of the games that are the data entry (layer 1) |
| 40 | `features/games2.js` | 1,431 | 39 | 18 | 0 | The games of layer 2 (sort), layer 3 (make exact) and layer 4 (come back) |
| 41 | `features/goalrank.js` | 225 | 8 | 5 | 0 | Goals you keep, then rank (UX pass, item 29) |
| 42 | `features/year.js` | 783 | 24 | 13 | 0 | The year: calendars, funds for true expenses, the months ahead, the Yearly Review, rest windows, and the chance test |
| 43 | `features/chart.js` | 1,307 | 13 | 6 | 0 | The Money Chart: ten statements, five elements, and the result for one person or two persons |
| 44 | `screens/profiles.js` | 137 | 6 | 4 | 0 | More than one person in one game: a household (the money is combined) or the persons that a coach helps (the money is apart) |
| 45 | `screens/smart.js` | 810 | 21 | 5 | 0 | The setup questions change with each answer |
| 46 | `screens/planner.js` | 1,430 | 61 | 19 | 0 | The navigation (a tab bar at the bottom, and a menu for all other screens), the plan (a calendar of money tasks, the tab "Next Steps"), the check-in b... |
| 47 | `account/cloud.js` | 568 | 23 | 0 | 0 | The game saves itself to the account of the player |
| 48 | `screens/ux.js` | 899 | 42 | 7 | 0 | The interface rules for a new player: five plain tabs, one clear title on each screen, Guess / Close / Exact, a Back button that works, and Undo in th... |
| 49 | `core/metrics.js` | 1,860 | 27 | 8 | 0 | Key numbers. Each ratio that this game can calculate, in plain words: the value, the rule of thumb and its source, what moves the value, and if the pl... |
| 50 | `features/debts.js` | 448 | 18 | 3 | 0 | The debt picture by taps (rate, monthly payment, card limit, how much the debt troubles the player), then three payoff plans side by side |
| 51 | `features/import.js` | 274 | 7 | 9 | 0 | Fill in the spending from a bank or card statement file |
| 52 | `features/compare.js` | 200 | 11 | 4 | 0 | Side by side. Screen 1: the plan as it is, next to one or two moves, with the same month-by-month simulation (goalSim) as the other screens |
| 53 | `features/quick.js` | 467 | 13 | 1 | 0 | Quick math. Small what-if questions: does this car fit, how much home fits, what one dollar becomes, and (run Not built, Part 2) a HYSA switch, all at... |
| 54 | `features/reveal.js` | 266 | 8 | 1 | 0 | Meet your character. Six cards, one tap each, change the numbers into a person: chapter, era, who the player is with money, the strongest number, and ... |
| 55 | `features/moneylog.js` | 255 | 11 | 4 | 0 | Two tools. (1) The money log: all logged entries by month, read-only, with a copy as plain text |
| 56 | `features/drills.js` | 525 | 15 | 9 | 0 | Four tools for hard days. (1) Money fire drills: a money fear, calculated on the numbers of the player, then one small action |
| 57 | `features/gig.js` | 605 | 32 | 13 | 0 | Work for yourself. For income with no tax taken out |
| 58 | `features/know.js` | 204 | 10 | 4 | 0 | What you already know. Five letters, D.A.I.T.E |
| 59 | `features/fair.js` | 299 | 13 | 5 | 0 | Share costs fairly. For two or more persons: five ways to divide the shared costs, side by side |
| 60 | `features/values.js` | 391 | 15 | 4 | 0 | Is my money going where I want? Three steps, all taps (UX pass, item 28): rank what matters (tap in order, or drag), a "Not important to me" pile and ... |
| 61 | `features/missions.js` | 361 | 12 | 3 | 0 | The mission board. The same next steps, shown as missions: why now, how long, the reward, and what it opens |
| 62 | `features/connect.js` | 396 | 19 | 9 | 0 | How it all connects. (1) Links between the 25 skill tracks: what a track works best after, and what it opens, each with the reason |
| 63 | `features/house.js` | 495 | 15 | 8 | 0 | Our household. For a household that is not one person or one married couple |
| 64 | `features/back.js` | 283 | 14 | 2 | 0 | The welcome-back card. On the first look of a new day, one slim row on Home shows what the player did last time, what moved, and where to continue |
| 65 | `features/lever.js` | 565 | 15 | 6 | 0 | Which lever matters most. Six levers (Earn, Spend, Protect, Grow, Stretch, Keep), each with a price in dollars a year on the numbers of the player |
| 66 | `features/mult.js` | 426 | 13 | 8 | 0 | The multipliers board. Each multiplier (a match at work, card rewards, bank bonuses, buying ahead, a tax-favored account, a health savings account) ha... |
| 67 | `data/askwords.js` | 97 | 0 | 0 | 0 | The words of "one small question at a time": for each money area, the question, what it means, why the game asks, and where to look (ASK); and the pla... |
| 68 | `features/ask.js` | 377 | 9 | 4 | 0 | One small question at a time, for "Make your numbers real" |
| 69 | `features/alloc.js` | 236 | 9 | 2 | 0 | Keep the first guess for each money area, and show how much of the guess is placed in real lines and how much is not placed yet |
| 70 | `features/session.js` | 167 | 3 | 3 | 0 | Make a first coaching session fast |
| 71 | `features/ask2.js` | 389 | 9 | 4 | 0 | The same pattern as ask.js for three more places: the details of one debt, the questions of Key numbers, and the questions about the job match and the... |
| 72 | `features/sign.js` | 250 | 5 | 2 | 0 | Before you sign. The true cost of a new loan, asked one small question at a time, then shown in the terms of the player |
| 73 | `features/owed.js` | 128 | 4 | 2 | 0 | What each debt costs you: the interest in dollars, and the same amount as months of living costs |
| 74 | `features/study.js` | 721 | 19 | 4 | 0 | Student loan plans, side by side |
| 75 | `features/together.js` | 215 | 7 | 3 | 0 | The Money Chart for more than two persons: the player, their person, up to four more persons who answer the same 10 statements on this phone, and othe... |
| 76 | `features/people.js` | 319 | 7 | 3 | 0 | Your people, one layer at a time |
| 77 | `features/fold.js` | 65 | 4 | 1 | 0 | One list on Next Steps. The mission board and the older card "Ready to plan" showed the same steps |
| 78 | `screens/nav.js` | 486 | 13 | 1 | 0 | The same four things on each sheet: Back (one screen back), Forward, Close, and an "i" with two sentences about the screen |
| 79 | `features/home.js` | 140 | 4 | 0 | 0 | Put the game on the home screen of the phone or the laptop (website only) |
| 80 | `screens/tidy.js` | 188 | 10 | 2 | 0 | Repairs from the usability audit, for all screens at one time |
| 81 | `account/addon.js` | 634 | 31 | 5 | 0 | Add-ons, part 2 of 2. At sign-in the game asks the account which add-ons are on |
| 82 | `features/fork.js` | 603 | 20 | 12 | 0 | Fork Theory. A fork is a thing that troubles the player now |
| 83 | `features/csp.js` | 731 | 25 | 12 | 0 | Two views of one month of money |
| 84 | `features/ideas.js` | 1,120 | 21 | 5 | 0 | Famous money ideas, the frame and ideas 1 to 8 |
| 85 | `features/ideas2.js` | 778 | 2 | 2 | 0 | Famous money ideas 9 to 16. The same frame and rules as ideas.js |
| 86 | `features/ideas3.js` | 1,102 | 1 | 1 | 0 | Famous money ideas 17 to 33: retirement, investing, earning |
| 87 | `features/ideas4.js` | 974 | 2 | 3 | 0 | Famous money ideas 34 to 45: spending, deals, real estate |
| 88 | `features/ideas5.js` | 1,305 | 2 | 0 | 0 | Famous money ideas 46 to 63: mindset, time, family and giving |
| 89 | `features/roof.js` | 273 | 7 | 1 | 0 | One list of the famous money ideas that are built in this game |
| 90 | `features/ideasz.js` | 338 | 7 | 3 | 0 | The last file of the famous money ideas: the glossary of each idea, which ideas fit the player now, and the block on Next Steps |
| 91 | `features/dep.js` | 254 | 11 | 2 | 0 | What depends on what. Some short chains show how one number feeds the next number |
| 92 | `features/eras.js` | 1,071 | 25 | 6 | 0 | Steps for the later eras, and the account recommendation |
| 93 | `features/testkit.js` | 323 | 9 | 7 | 0 | Test with a friend. A think-aloud usability test: one person tries five tasks, and the coach records how each task went with one tap |
| 94 | `features/kit.js` | 284 | 24 | 7 | 0 | The shared parts of the plan screens (the two paths, the odds, the simulators and the other screens of the Plan batch) |
| 95 | `features/retire.js` | 574 | 24 | 0 | 0 | The one adapter to the retirement engine of Zack Williams (vendor/retire-engine.js, MIT license) |
| 96 | `features/taxview.js` | 328 | 6 | 2 | 0 | The tax view. From pay before taxes, the filing status, the state and the pre-tax contributions: the top federal bracket, the average rate (federal pl... |
| 97 | `features/odds.js` | 418 | 11 | 3 | 0 | Retirement odds. Two answers in plain words: "X out of 100 random markets work" (the Monte Carlo of the retirement engine of Zack Williams, through fe... |
| 98 | `features/cover.js` | 448 | 7 | 1 | 0 | Insurance needs. In place of the yes / no checks, each kind of cover gets a needs calculation, the gap in dollars, and one next step: disability (abou... |
| 99 | `features/mix.js` | 325 | 7 | 1 | 0 | Investment mix and fees, by taps for each investment account: what is inside, and a fee preset, plus an advisor fee |
| 100 | `features/slept.js` | 117 | 5 | 0 | 0 | While you slept. What the invested money of the player earned per hour, per day, per month and per year, at the return of the plan, next to the real h... |
| 101 | `features/coast.js` | 202 | 6 | 3 | 0 | Two things about freedom. (1) The FI ratio on Key numbers: what the investments can pay each month, next to what the player spends each month |
| 102 | `features/sim.js` | 447 | 20 | 0 | 0 | The simulator engine. One decision with 2 to 4 options |
| 103 | `features/sims/rentbuy.js` | 398 | 5 | 0 | 0 | Simulator 1: rent or buy. The bank's payment first (principal and interest) |
| 104 | `features/sims/mortgage.js` | 143 | 2 | 0 | 0 | Simulator 2: pay off the mortgage early, or invest the same money |
| 105 | `features/sims/debt.js` | 107 | 1 | 0 | 0 | Simulator 3: pay extra on a debt, or invest the extra, by the rate of the debt |
| 106 | `features/sims/car.js` | 166 | 1 | 0 | 0 | Simulator 4: the car. Keep the car you have, buy a used car, buy a new car, or lease |
| 107 | `features/sims/roth.js` | 120 | 1 | 0 | 0 | Simulator 5: pre-tax or Roth for this year's money |
| 108 | `features/sims/job.js` | 128 | 1 | 0 | 0 | Simulator 6: a new job or a raise, or staying |
| 109 | `features/sims/break.js` | 120 | 1 | 0 | 0 | Simulator 7: take a break (a sabbatical or a mini-retirement) |
| 110 | `features/sims/side.js` | 125 | 2 | 0 | 0 | Simulator 8: side income. Hours a week, the rate, and the tax to set aside (the same set-aside idea as "Work for yourself", gig.js) |
| 111 | `features/sims/kid.js` | 117 | 1 | 0 | 0 | Simulator 9: have a kid or add a dependent |
| 112 | `features/sims/city.js` | 128 | 2 | 0 | 0 | Simulator 10: move to a cheaper or a pricier city |
| 113 | `features/sims/spend.js` | 102 | 2 | 0 | 0 | Simulator 11: a big one-time spend (a wedding, a trip, a gift) |
| 114 | `features/sims/stop.js` | 171 | 2 | 0 | 0 | Simulator 12: stop working earlier or later, by year, and when to claim Social Security (62, 67 or 70) |
| 115 | `features/paths.js` | 668 | 14 | 2 | 0 | Two paths. Two full plans from the same profile, side by side, and a third that blends them |
| 116 | `features/plan.js` | 341 | 6 | 4 | 0 | The plan summary. One screen with the 7 steps of the CFP Board's financial planning process as rows (your situation, your goals, where you are headed,... |
| 117 | `features/ask3.js` | 357 | 12 | 3 | 0 | The Ask front door. One row on Home under the top numbers with four big buttons |
| 118 | `features/okay.js` | 189 | 9 | 4 | 0 | The question "Am I okay?" and its first answer |
| 119 | `features/quota.js` | 234 | 11 | 4 | 0 | Extras for people who love spreadsheets |
| 120 | `data/takeout2026.js` | 122 | 0 | 0 | 0 | Data only. The reference numbers for "Taking money out" (features/takeout.js): the rules for reaching retirement money before age 59 and a half, and t... |
| 121 | `features/takeout.js` | 1,006 | 21 | 0 | 0 | Taking money out. Four answers on one sheet, each from the numbers the game already has, and a fifth tab, "Compare the ways" (features/ways.js) |
| 122 | `features/ways.js` | 536 | 21 | 2 | 0 | Compare the ways. The same plan (the money, the spending, the stop age, Social Security) through each way to take money out: the 4% rule and its setti... |
| 123 | `features/ages.js` | 187 | 7 | 0 | 0 | Two ages, for each person. (1) Work optional: the age when the invested money is enough to live on (the freedom date of the plan) |
| 124 | `features/stress.js` | 282 | 6 | 1 | 0 | The stress test. One result from two tests of the same plan: the replay of each real start year of US market history, and the 1,000 random markets of ... |
| 125 | `features/blocks.js` | 319 | 7 | 1 | 0 | Life event blocks that the player stacks: a home, a car, a child, a job change, a sabbatical, a move |
| 126 | `features/windfall.js` | 431 | 7 | 2 | 0 | The windfall. What to do with a bonus, a gift, a tax refund or other extra money |
| 127 | `data/health2026.js` | 25 | 0 | 0 | 0 | Data only. What health cover costs in 2026 with no job, for the quit fund countdown (features/countdown.js) |
| 128 | `features/countdown.js` | 433 | 13 | 1 | 0 | Countdowns. One countdown type for each goal on My Goals: a target amount, what is saved for it, and a monthly amount or a date |
| 129 | `features/offers.js` | 265 | 5 | 1 | 0 | Two job offers side by side. For each offer: the take-home pay from the tax tables, the match, the stock, less the health premiums and the commute |
| 130 | `features/career.js` | 542 | 11 | 1 | 0 | Career and education. Five tabs on one screen: (1) Pays back: what a course or a degree costs with the time it takes, the raise after tax, the payback... |
| 131 | `features/trip.js` | 483 | 9 | 2 | 0 | Trips and the journey. Four tabs on one screen: (1) The trip: flights, lodging a night, the days away, food a day, the card's fee on other currencies,... |
| 132 | `features/family.js` | 515 | 11 | 0 | 0 | Family money (run Not built, groups 1 to 5, Part 8) |
| 133 | `features/nextacct.js` | 280 | 4 | 1 | 0 | Which account next, up to each limit |
| 134 | `features/ledger.js` | 377 | 8 | 1 | 0 | The giant ledger and the three statements |
| 135 | `data/cardtemplate.js` | 307 | 8 | 0 | 0 | The template of one card of the card library |
| 136 | `data/cards2026.js` | 6,547 | 0 | 24 | 0 | Data only. The card library of the card vault (features/vault.js): 93 cards at 12 US banks |
| 137 | `features/vault.js` | 1,479 | 43 | 11 | 0 | The card vault ("Is this card right for me?" of the Slam web app, in the game) |
| 138 | `features/element.js` | 346 | 9 | 4 | 0 | The character reveal after setup, in place of the card "Your character is ready" |
| 139 | `features/xray.js` | 281 | 4 | 2 | 0 | The product X-ray. One money product that the player pays into each month (insurance that also saves, or an investment with fees), next to the common ... |
| 140 | `features/transit.js` | 383 | 8 | 6 | 0 | Life Transitions: "Break in case of emergency", on My Goals |
| 141 | `data/kidlessons.js` | 345 | 0 | 0 | 0 | Data only. The lessons of Kids mode (features/kids.js): 20 short lessons for a student in a high school personal finance class, and 12 daily lessons f... |
| 142 | `features/kids.js` | 264 | 11 | 5 | 0 | Kids mode: "Help your kid stress less about money" |
| 143 | `data/metros.js` | 327 | 0 | 0 | 0 | Data only. Rough housing numbers for 29 US areas and one typical US metro, for the moves that need an area (features/strat.js) |
| 144 | `data/strategies.js` | 1,137 | 5 | 4 | 0 | The strategies of "Moves to try" (features/strat.js) |
| 145 | `features/strat.js` | 900 | 39 | 11 | 0 | The Strategy Engine: "Moves to try" |
| 146 | `account/roles.js` | 128 | 9 | 0 | 0 | Roles and hats. One login has up to three hats: Player (the game), Coach (coach.html) and Admin (admin.html) |
| 147 | `features/stars.js` | 755 | 35 | 3 | 0 | The Galaxy. A second view of the 25 skill tracks: 25 spiral arms (constellations) from "You" in the middle out to the FI ring, 625 stars, one star for... |
| 148 | `features/exletter.js` | 162 | 5 | 0 | 0 | One exercise: Letter from your calm self |
| 149 | `features/recalc.js` | 398 | 13 | 8 | 0 | Recalculating. When the real numbers move a date of the plan, one calm card shows the old date, the new date and the one next turn |
| 150 | `features/audit.js` | 257 | 5 | 3 | 0 | The Mistake audit. It is optional |
| 151 | `features/quizzes.js` | 438 | 20 | 5 | 0 | Quizzes. One sheet draws each quiz skin from its definition: the first screen, one question for each tap, and one result card (a title, two or three l... |
| 152 | `features/sins.js` | 601 | 30 | 8 | 0 | The money sins read. The quiz (the sins skin of Quizzes) is the first of four sources |
| 153 | `features/rings.js` | 130 | 8 | 1 | 0 | The Rings theme (run "Money sins", Part 3): dark comedy in a cheeky hell with seven rings, one original ruler for each money sin |
| 154 | `features/quest.js` | 781 | 29 | 8 | 0 | Quest mode (run Not built, groups 1 to 5, Part 10a) |
| 155 | `data/patchnotes.js` | 404 | 0 | 0 | 0 | The patch notes: what changed, in plain words, for the person who plays |
| 156 | `features/founding.js` | 380 | 20 | 1 | 0 | Three small things for the soft launch |
| 157 | `features/mycards.js` | 788 | 30 | 4 | 0 | Credit cards as a list of cards, not one balance |
| 158 | `features/tally.js` | 175 | 8 | 1 | 0 | The dashboard of My Money in the Tally look (UX pass, items 24 to 27): the four key tiles at the top, the big three and where the money goes as the tw... |
| 159 | `features/look.js` | 578 | 26 | 2 | 0 | The showcase screens of the dashboard look (DESIGN.md, "Reference: Tally"), built from the kit in screens/dash.js: the stat row of Home; the stat row,... |
| 160 | `features/spiral.js` | 703 | 33 | 8 | 0 | Setup as a spiral of five rounds, in the order of the letters D, A, I, T, E (features/know.js: Debts, Assets, Income, Taxes, Expenses) |
| 161 | `features/amounts.js` | 1,175 | 27 | 5 | 0 | The amounts inside the setup rounds (UX pass, phase 4) |
| 162 | `features/jobs.js` | 557 | 25 | 7 | 0 | The Job of Existing (run JOE-1) |
| 163 | `features/goalwire.js` | 588 | 16 | 2 | 0 | The Job of Existing, feature 4: a goal, its account and its automatic deposit, in one move of three taps |
| 164 | `features/careq.js` | 384 | 14 | 2 | 0 | The Job of Existing, feature 5: the quests of the Health Care Admin and the Insurance Coordinator |
| 165 | `features/rolemap.js` | 385 | 13 | 3 | 0 | The Job of Existing (run JOE-1), feature 6: the household role map, "Who carries what" |
| 166 | `features/canon.js` | 961 | 12 | 4 | 0 | Eli's frameworks and the canon (run "Not built, groups 1 to 5", Part 4) |
| 167 | `features/enough.js` | 350 | 10 | 1 | 0 | Lifestyle creep and enough (run Not built, groups 1 to 5, Part 3) |
| 168 | `features/ratios.js` | 278 | 6 | 2 | 0 | Ratios on Key numbers (run Not built, groups 1 to 5, Part 9) |
| 169 | `features/hard.js` | 541 | 15 | 5 | 0 | Hard moments (run Not built, groups 1 to 5, Part 7) |
| 170 | `features/life.js` | 549 | 25 | 5 | 0 | Five play parts (run Not built, groups 1 to 5, Part 10b) |
| 171 | `features/hunt.js` | 331 | 8 | 4 | 0 | Two games on real rules (run Not built, groups 1 to 5, Part 10b) |
| 172 | `features/guild.js` | 262 | 12 | 3 | 0 | People, inside the profiles of this game (run Not built, groups 1 to 5, Part 10b) |
| 173 | `features/lockset.js` | 153 | 1 | 2 | 0 | The settings sheet of App lock and passkeys (run Not built, groups 1 to 5, Part 10b): set a PIN by taps (twice, to be sure), add this device's own loc... |
| 174 | `features/book.js` | 617 | 20 | 4 | 0 | The spreadsheet of the plan. Each number of the Plan batch, with its formula, in one table that the player can copy into Google Sheets or Excel, or sa... |
| 175 | `features/questlog.js` | 547 | 30 | 7 | 0 | The Quest Log ("Where am I"). One button, on every tab and on every sheet, opens one sheet that shows where the player is: a Continue card (back to wh... |
| 176 | `features/fbreport.js` | 262 | 18 | 1 | 0 | Report a bug or idea, from each screen |
| 177 | `features/built.js` | 1,588 | 4 | 16 | 0 | What's built. One list of all features of this game: built, partly built, or not built |

"Hidden errors" is the number of `catch` blocks that are empty. An empty block drops the error with no record.

## 2. Replaced functions

A replaced function is a function that a later file puts a new function in the place of. Before 2026-11-22 the game had 61 of these, in 113 places. Now each base function calls its parts by name. The target for this table is: no rows.

No rows: no function is replaced.

### Functions with two declarations

When two top-level functions have the same name, the one that the browser loads last wins, and the other one never runs. This is a defect each time. The target is: no rows.

No rows.

### Actions (ACT) that are set in more than one place

`ACT[name]` runs when the player taps a button with `data-a="name"`. 36 of 936 actions are set in more than one place. The last place wins. Most later places keep the earlier action, call it, and add to it. To read one action, read all places in its row, in order.

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
| `allocInflated` | `features/alloc.js` | tests/bugs-and-trust.js examines it, and the owner runs it on saved games. |
| `hbLevel` | `core/homebuy.js` | The game does not call it: home.html of the web app does (js/solo/homecost.js). The game takes the level from the Guess, Close or Exact of each answer (kitState). |
| `igFree` | `features/ideas2.js` | Keep this function until the owner confirms that no add-on calls it. |
| `igYears` | `features/ideas.js` | Keep this function until the owner confirms that no add-on calls it. |
| `offDays` | `features/year.js` | Keep this function: it reads the off days from each calendar, and an add-on can call it. |
| `oxyRows` | `features/ideasz.js` | Keep this function: tests/t_ideas.js examines it, and an add-on can call it. |
| `stgCredit` | `features/strat.js` | NO REASON GIVEN. Examine this function. |
