# SLAM the Game: code map

This file is generated. Do not edit it. Run `python3 tools/game_codemap.py`.

Date: 2026-11-26. Files: 195. Lines: 115,693. Top-level functions: 2758. Replaced functions: 0, in 0 places. Functions with two declarations: 0. Hidden errors: 0.

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
| 15 | `core/engine.js` | 3,929 | 126 | 0 | 0 | The engine: the data model of one profile and all the math |
| 16 | `core/engine2.js` | 420 | 18 | 0 | 0 | The game mechanics that are also the data entry: the layers, the bonfires, the fog (how much of the picture is clear) |
| 17 | `core/homebuy.js` | 206 | 9 | 0 | 0 | Home buying and renting: the bank's payment (principal and interest), the true cost of owning line by line, the true cost of renting, the year owning ... |
| 18 | `core/career.js` | 278 | 19 | 1 | 0 | Career and education: what a course or degree costs and pays back (the payback years, the lifetime value, the move for the FI date), the presets, two ... |
| 19 | `core/invest.js` | 210 | 7 | 4 | 0 | Investing (run Finish everything partly built, Part 13): the household mix across every account (the stock share next to a target, the three-fund chec... |
| 20 | `core/family.js` | 162 | 6 | 1 | 0 | Family money: the sandwich years (money to parents and kids at once), living at home (rent saved next to the time to a moving-out goal), and kids and ... |
| 21 | `core/peers.js` | 160 | 8 | 1 | 0 | Comparing with peers (run Finish everything partly built, Part 9): net worth next to the middle household of your age, your savings rate next to the c... |
| 22 | `core/quest.js` | 363 | 20 | 1 | 0 | The math of the quest screens (run Not built, groups 1 to 5, Part 10a): the quest mode character sheet, capacity, how this plan fails, hidden costs, w... |
| 23 | `core/trip.js` | 322 | 17 | 2 | 0 | Travel: a trip line by line (flights, lodging, food a day, the card's fee on other currencies, visa fees, travel insurance), points (cash or redeem), ... |
| 24 | `core/quick.js` | 163 | 14 | 0 | 0 | The quick calculators: a HYSA switch, lump sum or a little each month, a warranty, cost per use, Return on Hassle, worth it, personal inflation, start... |
| 25 | `core/play.js` | 235 | 6 | 0 | 0 | The math of the play parts (run Not built, groups 1 to 5, Part 10b): the daily life-sim challenge, the credit score game (myFICO's five factor shares)... |
| 26 | `core/gigcore.js` | 200 | 12 | 0 | 0 | Gig and self-employed math with no tax engine: the price floor from a profit before tax and the billable hours, the set-aside so far, retirement room ... |
| 27 | `core/hardcore.js` | 134 | 6 | 1 | 0 | The math and the words of Hard moments (run Not built, groups 1 to 5, Part 7): the split of the rent, a roommate leaving, untangling after a breakup, ... |
| 28 | `core/safetynet.js` | 183 | 8 | 1 | 0 | Safety nets: medical leave, a move, a breakup and a new baby as money flows over months, the run of the cash month by month, the tripwires, Plan B, th... |
| 29 | `core/estate.js` | 182 | 4 | 1 | 0 | The math and the rules of Estate and marriage (run Finish everything partly built, Part 11): who gets what you leave, the step-up in basis, the 10 yea... |
| 30 | `core/recalc.js` | 480 | 18 | 0 | 0 | The math of Recalculating: the route (old date, new date), the triage when the bills are more than the income, the emergency fund refill, the safe-to-... |
| 31 | `core/jobs.js` | 354 | 18 | 0 | 0 | The math of the Job of Existing (run JOE-1): which of the six unpaid jobs a player holds, from answers already given; the hours a month of running the... |
| 32 | `core/hhold.js` | 320 | 8 | 0 | 0 | The math of Households (run Finish everything partly built, Part 12): the same question for everyone and its talk points, the answer code for two phon... |
| 33 | `core/enough.js` | 554 | 11 | 0 | 0 | The math of Lifestyle creep and enough (run Not built, groups 1 to 5, Part 3): spending growth next to income growth per category, year over year, the... |
| 34 | `core/benefitsplan.js` | 214 | 14 | 1 | 0 | The math of Benefits and health (run Finish everything partly built, Part 10): the benefits optimizer (HSA, dependent care FSA, ESPP, commuter), the h... |
| 35 | `core/exercises.js` | 286 | 4 | 0 | 0 | The list of the Exercises screen (run Finish everything partly built, Part 7, Money psychology): ten money exercises and three prompts for life after ... |
| 36 | `core/ratios.js` | 705 | 26 | 0 | 0 | The math of Ratios on Key numbers (run Not built, groups 1 to 5, Part 9): one function for each ratio, the groups, the formula and the plain sentence ... |
| 37 | `data/roles.js` | 412 | 0 | 0 | 0 | Data only. The six unpaid jobs of the Job of Existing (run JOE-1): the name, the line of the "i", the regions and trees of each job, and the recurring... |
| 38 | `core/reportcore.js` | 592 | 28 | 2 | 0 | Report a bug or idea: one report with the screen name, the last 3 taps, the device, the width and the app version; the list on the device; the sending... |
| 39 | `core/quizcore.js` | 560 | 21 | 0 | 0 | The one quiz engine: the questions a set of answers leads to, the scoring (with scores from outside as an input), ties, the top two, the confidence le... |
| 40 | `core/sins.js` | 1,075 | 51 | 0 | 0 | The money sins read: the evidence of four sources (the quiz, the ledger, the one-tap check-ins, the reactions to the app) as weighted pieces that fade... |
| 41 | `core/frameworks.js` | 383 | 24 | 3 | 0 | The math of Eli's frameworks and the canon: the SWAN number, the Second Mouse checklist, the Trust Framework, the Advice translator, the Baby Steps, t... |
| 42 | `data/quizskins.js` | 9,032 | 0 | 0 | 0 | Data only. The quiz skins of the one quiz engine (letters, address, houses, avatars, sheet, pyramid, mountain, stars, sins, scripts, enneagram, fire, ... |
| 43 | `account/gate.js` | 83 | 8 | 0 | 0 | Add-ons, part 1 of 2. Some parts of the game are not in these files |
| 44 | `screens/ui.js` | 6,696 | 217 | 136 | 0 | The main screens and the core of the interface: the Home, Check-in, Money and Me tabs, the sheets, render(), save(), and the click handler that calls ... |
| 45 | `screens/dash.js` | 426 | 29 | 4 | 0 | The one kit of view pieces for the dashboard look (DESIGN.md, "Reference: Tally"): a card, stat tiles, a sparkline, grouped bars, an area chart, a don... |
| 46 | `features/games.js` | 674 | 25 | 13 | 0 | The screens of the games that are the data entry (layer 1) |
| 47 | `features/games2.js` | 1,431 | 39 | 18 | 0 | The games of layer 2 (sort), layer 3 (make exact) and layer 4 (come back) |
| 48 | `features/goalrank.js` | 225 | 8 | 5 | 0 | Goals you keep, then rank (UX pass, item 29) |
| 49 | `features/year.js` | 783 | 24 | 13 | 0 | The year: calendars, funds for true expenses, the months ahead, the Yearly Review, rest windows, and the chance test |
| 50 | `features/chart.js` | 1,307 | 13 | 6 | 0 | The Money Chart: ten statements, five elements, and the result for one person or two persons |
| 51 | `screens/profiles.js` | 137 | 6 | 4 | 0 | More than one person in one game: a household (the money is combined) or the persons that a coach helps (the money is apart) |
| 52 | `screens/smart.js` | 810 | 21 | 5 | 0 | The setup questions change with each answer |
| 53 | `screens/planner.js` | 1,447 | 61 | 19 | 0 | The navigation (a tab bar at the bottom, and a menu for all other screens), the plan (a calendar of money tasks, the tab "Next Steps"), the check-in b... |
| 54 | `account/cloud.js` | 568 | 23 | 0 | 0 | The game saves itself to the account of the player |
| 55 | `screens/ux.js` | 910 | 42 | 7 | 0 | The interface rules for a new player: five plain tabs, one clear title on each screen, Guess / Close / Exact, a Back button that works, and Undo in th... |
| 56 | `core/metrics.js` | 1,860 | 27 | 8 | 0 | Key numbers. Each ratio that this game can calculate, in plain words: the value, the rule of thumb and its source, what moves the value, and if the pl... |
| 57 | `features/debts.js` | 448 | 18 | 3 | 0 | The debt picture by taps (rate, monthly payment, card limit, how much the debt troubles the player), then three payoff plans side by side |
| 58 | `features/import.js` | 274 | 7 | 9 | 0 | Fill in the spending from a bank or card statement file |
| 59 | `features/compare.js` | 200 | 11 | 4 | 0 | Side by side. Screen 1: the plan as it is, next to one or two moves, with the same month-by-month simulation (goalSim) as the other screens |
| 60 | `features/quick.js` | 467 | 13 | 1 | 0 | Quick math. Small what-if questions: does this car fit, how much home fits, what one dollar becomes, and (run Not built, Part 2) a HYSA switch, all at... |
| 61 | `features/reveal.js` | 269 | 8 | 1 | 0 | Meet your character. Six cards, one tap each, change the numbers into a person: chapter, era, who the player is with money, the strongest number, and ... |
| 62 | `features/moneylog.js` | 255 | 11 | 4 | 0 | Two tools. (1) The money log: all logged entries by month, read-only, with a copy as plain text |
| 63 | `features/drills.js` | 525 | 15 | 9 | 0 | Four tools for hard days. (1) Money fire drills: a money fear, calculated on the numbers of the player, then one small action |
| 64 | `features/gig.js` | 605 | 32 | 13 | 0 | Work for yourself. For income with no tax taken out |
| 65 | `features/know.js` | 204 | 10 | 4 | 0 | What you already know. Five letters, D.A.I.T.E |
| 66 | `features/fair.js` | 299 | 13 | 5 | 0 | Share costs fairly. For two or more persons: five ways to divide the shared costs, side by side |
| 67 | `features/values.js` | 391 | 15 | 4 | 0 | Is my money going where I want? Three steps, all taps (UX pass, item 28): rank what matters (tap in order, or drag), a "Not important to me" pile and ... |
| 68 | `features/missions.js` | 361 | 12 | 3 | 0 | The mission board. The same next steps, shown as missions: why now, how long, the reward, and what it opens |
| 69 | `features/connect.js` | 396 | 19 | 9 | 0 | How it all connects. (1) Links between the 25 skill tracks: what a track works best after, and what it opens, each with the reason |
| 70 | `features/house.js` | 496 | 15 | 8 | 0 | Our household. For a household that is not one person or one married couple |
| 71 | `features/back.js` | 283 | 14 | 2 | 0 | The welcome-back card. On the first look of a new day, one slim row on Home shows what the player did last time, what moved, and where to continue |
| 72 | `features/lever.js` | 565 | 15 | 6 | 0 | Which lever matters most. Six levers (Earn, Spend, Protect, Grow, Stretch, Keep), each with a price in dollars a year on the numbers of the player |
| 73 | `features/mult.js` | 426 | 13 | 8 | 0 | The multipliers board. Each multiplier (a match at work, card rewards, bank bonuses, buying ahead, a tax-favored account, a health savings account) ha... |
| 74 | `data/askwords.js` | 97 | 0 | 0 | 0 | The words of "one small question at a time": for each money area, the question, what it means, why the game asks, and where to look (ASK); and the pla... |
| 75 | `features/ask.js` | 377 | 9 | 4 | 0 | One small question at a time, for "Make your numbers real" |
| 76 | `features/alloc.js` | 236 | 9 | 2 | 0 | Keep the first guess for each money area, and show how much of the guess is placed in real lines and how much is not placed yet |
| 77 | `features/session.js` | 167 | 3 | 3 | 0 | Make a first coaching session fast |
| 78 | `features/ask2.js` | 389 | 9 | 4 | 0 | The same pattern as ask.js for three more places: the details of one debt, the questions of Key numbers, and the questions about the job match and the... |
| 79 | `features/sign.js` | 250 | 5 | 2 | 0 | Before you sign. The true cost of a new loan, asked one small question at a time, then shown in the terms of the player |
| 80 | `features/owed.js` | 128 | 4 | 2 | 0 | What each debt costs you: the interest in dollars, and the same amount as months of living costs |
| 81 | `features/study.js` | 721 | 19 | 4 | 0 | Student loan plans, side by side |
| 82 | `features/together.js` | 215 | 7 | 3 | 0 | The Money Chart for more than two persons: the player, their person, up to four more persons who answer the same 10 statements on this phone, and othe... |
| 83 | `features/people.js` | 319 | 7 | 3 | 0 | Your people, one layer at a time |
| 84 | `features/fold.js` | 65 | 4 | 1 | 0 | One list on Next Steps. The mission board and the older card "Ready to plan" showed the same steps |
| 85 | `screens/nav.js` | 486 | 13 | 1 | 0 | The same four things on each sheet: Back (one screen back), Forward, Close, and an "i" with two sentences about the screen |
| 86 | `features/home.js` | 140 | 4 | 0 | 0 | Put the game on the home screen of the phone or the laptop (website only) |
| 87 | `screens/tidy.js` | 188 | 10 | 2 | 0 | Repairs from the usability audit, for all screens at one time |
| 88 | `account/addon.js` | 634 | 31 | 5 | 0 | Add-ons, part 2 of 2. At sign-in the game asks the account which add-ons are on |
| 89 | `features/fork.js` | 603 | 20 | 12 | 0 | Fork Theory. A fork is a thing that troubles the player now |
| 90 | `features/csp.js` | 731 | 25 | 12 | 0 | Two views of one month of money |
| 91 | `features/ideas.js` | 1,120 | 21 | 5 | 0 | Famous money ideas, the frame and ideas 1 to 8 |
| 92 | `features/ideas2.js` | 778 | 2 | 2 | 0 | Famous money ideas 9 to 16. The same frame and rules as ideas.js |
| 93 | `features/ideas3.js` | 1,107 | 1 | 1 | 0 | Famous money ideas 17 to 33: retirement, investing, earning |
| 94 | `features/ideas4.js` | 974 | 2 | 3 | 0 | Famous money ideas 34 to 45: spending, deals, real estate |
| 95 | `features/ideas5.js` | 1,305 | 2 | 0 | 0 | Famous money ideas 46 to 63: mindset, time, family and giving |
| 96 | `features/roof.js` | 273 | 7 | 1 | 0 | One list of the famous money ideas that are built in this game |
| 97 | `features/ideasz.js` | 338 | 7 | 3 | 0 | The last file of the famous money ideas: the glossary of each idea, which ideas fit the player now, and the block on Next Steps |
| 98 | `features/dep.js` | 254 | 11 | 2 | 0 | What depends on what. Some short chains show how one number feeds the next number |
| 99 | `features/eras.js` | 1,071 | 25 | 6 | 0 | Steps for the later eras, and the account recommendation |
| 100 | `features/testkit.js` | 323 | 9 | 7 | 0 | Test with a friend. A think-aloud usability test: one person tries five tasks, and the coach records how each task went with one tap |
| 101 | `features/kit.js` | 284 | 24 | 7 | 0 | The shared parts of the plan screens (the two paths, the odds, the simulators and the other screens of the Plan batch) |
| 102 | `features/retire.js` | 574 | 24 | 0 | 0 | The one adapter to the retirement engine of Zack Williams (vendor/retire-engine.js, MIT license) |
| 103 | `features/taxview.js` | 328 | 6 | 2 | 0 | The tax view. From pay before taxes, the filing status, the state and the pre-tax contributions: the top federal bracket, the average rate (federal pl... |
| 104 | `features/odds.js` | 418 | 11 | 3 | 0 | Retirement odds. Two answers in plain words: "X out of 100 random markets work" (the Monte Carlo of the retirement engine of Zack Williams, through fe... |
| 105 | `features/cover.js` | 448 | 7 | 1 | 0 | Insurance needs. In place of the yes / no checks, each kind of cover gets a needs calculation, the gap in dollars, and one next step: disability (abou... |
| 106 | `features/mix.js` | 655 | 10 | 0 | 0 | Investment mix and fees, by taps for each investment account: what is inside, and a fee preset, plus an advisor fee |
| 107 | `features/slept.js` | 117 | 5 | 0 | 0 | While you slept. What the invested money of the player earned per hour, per day, per month and per year, at the return of the plan, next to the real h... |
| 108 | `features/coast.js` | 202 | 6 | 3 | 0 | Two things about freedom. (1) The FI ratio on Key numbers: what the investments can pay each month, next to what the player spends each month |
| 109 | `features/sim.js` | 447 | 20 | 0 | 0 | The simulator engine. One decision with 2 to 4 options |
| 110 | `features/sims/rentbuy.js` | 398 | 5 | 0 | 0 | Simulator 1: rent or buy. The bank's payment first (principal and interest) |
| 111 | `features/sims/mortgage.js` | 143 | 2 | 0 | 0 | Simulator 2: pay off the mortgage early, or invest the same money |
| 112 | `features/sims/debt.js` | 107 | 1 | 0 | 0 | Simulator 3: pay extra on a debt, or invest the extra, by the rate of the debt |
| 113 | `features/sims/car.js` | 166 | 1 | 0 | 0 | Simulator 4: the car. Keep the car you have, buy a used car, buy a new car, or lease |
| 114 | `features/sims/roth.js` | 120 | 1 | 0 | 0 | Simulator 5: pre-tax or Roth for this year's money |
| 115 | `features/sims/job.js` | 128 | 1 | 0 | 0 | Simulator 6: a new job or a raise, or staying |
| 116 | `features/sims/break.js` | 120 | 1 | 0 | 0 | Simulator 7: take a break (a sabbatical or a mini-retirement) |
| 117 | `features/sims/side.js` | 125 | 2 | 0 | 0 | Simulator 8: side income. Hours a week, the rate, and the tax to set aside (the same set-aside idea as "Work for yourself", gig.js) |
| 118 | `features/sims/kid.js` | 117 | 1 | 0 | 0 | Simulator 9: have a kid or add a dependent |
| 119 | `features/sims/city.js` | 128 | 2 | 0 | 0 | Simulator 10: move to a cheaper or a pricier city |
| 120 | `features/sims/spend.js` | 102 | 2 | 0 | 0 | Simulator 11: a big one-time spend (a wedding, a trip, a gift) |
| 121 | `features/sims/stop.js` | 171 | 2 | 0 | 0 | Simulator 12: stop working earlier or later, by year, and when to claim Social Security (62, 67 or 70) |
| 122 | `features/paths.js` | 668 | 14 | 2 | 0 | Two paths. Two full plans from the same profile, side by side, and a third that blends them |
| 123 | `features/plan.js` | 341 | 6 | 4 | 0 | The plan summary. One screen with the 7 steps of the CFP Board's financial planning process as rows (your situation, your goals, where you are headed,... |
| 124 | `features/ask3.js` | 357 | 12 | 3 | 0 | The Ask front door. One row on Home under the top numbers with four big buttons |
| 125 | `features/okay.js` | 191 | 9 | 4 | 0 | The question "Am I okay?" and its first answer |
| 126 | `features/quota.js` | 234 | 11 | 4 | 0 | Extras for people who love spreadsheets |
| 127 | `data/takeout2026.js` | 122 | 0 | 0 | 0 | Data only. The reference numbers for "Taking money out" (features/takeout.js): the rules for reaching retirement money before age 59 and a half, and t... |
| 128 | `features/takeout.js` | 1,006 | 21 | 0 | 0 | Taking money out. Four answers on one sheet, each from the numbers the game already has, and a fifth tab, "Compare the ways" (features/ways.js) |
| 129 | `features/ways.js` | 536 | 21 | 2 | 0 | Compare the ways. The same plan (the money, the spending, the stop age, Social Security) through each way to take money out: the 4% rule and its setti... |
| 130 | `features/ages.js` | 187 | 7 | 0 | 0 | Two ages, for each person. (1) Work optional: the age when the invested money is enough to live on (the freedom date of the plan) |
| 131 | `features/stress.js` | 282 | 6 | 1 | 0 | The stress test. One result from two tests of the same plan: the replay of each real start year of US market history, and the 1,000 random markets of ... |
| 132 | `features/blocks.js` | 319 | 7 | 1 | 0 | Life event blocks that the player stacks: a home, a car, a child, a job change, a sabbatical, a move |
| 133 | `features/windfall.js` | 431 | 7 | 2 | 0 | The windfall. What to do with a bonus, a gift, a tax refund or other extra money |
| 134 | `data/health2026.js` | 25 | 0 | 0 | 0 | Data only. What health cover costs in 2026 with no job, for the quit fund countdown (features/countdown.js) |
| 135 | `features/countdown.js` | 433 | 13 | 1 | 0 | Countdowns. One countdown type for each goal on My Goals: a target amount, what is saved for it, and a monthly amount or a date |
| 136 | `features/offers.js` | 265 | 5 | 1 | 0 | Two job offers side by side. For each offer: the take-home pay from the tax tables, the match, the stock, less the health premiums and the commute |
| 137 | `features/career.js` | 542 | 11 | 1 | 0 | Career and education. Five tabs on one screen: (1) Pays back: what a course or a degree costs with the time it takes, the raise after tax, the payback... |
| 138 | `features/trip.js` | 483 | 9 | 2 | 0 | Trips and the journey. Four tabs on one screen: (1) The trip: flights, lodging a night, the days away, food a day, the card's fee on other currencies,... |
| 139 | `features/family.js` | 516 | 11 | 0 | 0 | Family money (run Not built, groups 1 to 5, Part 8) |
| 140 | `features/nextacct.js` | 280 | 4 | 1 | 0 | Which account next, up to each limit |
| 141 | `features/ledger.js` | 377 | 8 | 1 | 0 | The giant ledger and the three statements |
| 142 | `data/cardtemplate.js` | 307 | 8 | 0 | 0 | The template of one card of the card library |
| 143 | `data/cards2026.js` | 6,547 | 0 | 24 | 0 | Data only. The card library of the card vault (features/vault.js): 93 cards at 12 US banks |
| 144 | `features/vault.js` | 1,479 | 43 | 11 | 0 | The card vault ("Is this card right for me?" of the Slam web app, in the game) |
| 145 | `features/element.js` | 346 | 9 | 4 | 0 | The character reveal after setup, in place of the card "Your character is ready" |
| 146 | `features/xray.js` | 281 | 4 | 2 | 0 | The product X-ray. One money product that the player pays into each month (insurance that also saves, or an investment with fees), next to the common ... |
| 147 | `features/invest.js` | 265 | 8 | 2 | 0 | Investing, two sheets (run Finish everything partly built, Part 13) |
| 148 | `features/transit.js` | 397 | 8 | 6 | 0 | Life Transitions: "Break in case of emergency", on My Goals |
| 149 | `features/nets.js` | 252 | 9 | 3 | 0 | Safety nets (run Finish everything partly built, Part 15) |
| 150 | `data/kidlessons.js` | 345 | 0 | 0 | 0 | Data only. The lessons of Kids mode (features/kids.js): 20 short lessons for a student in a high school personal finance class, and 12 daily lessons f... |
| 151 | `features/kids.js` | 264 | 11 | 5 | 0 | Kids mode: "Help your kid stress less about money" |
| 152 | `data/metros.js` | 327 | 0 | 0 | 0 | Data only. Rough housing numbers for 29 US areas and one typical US metro, for the moves that need an area (features/strat.js) |
| 153 | `data/strategies.js` | 1,137 | 5 | 4 | 0 | The strategies of "Moves to try" (features/strat.js) |
| 154 | `features/strat.js` | 911 | 39 | 11 | 0 | The Strategy Engine: "Moves to try" |
| 155 | `account/roles.js` | 128 | 9 | 0 | 0 | Roles and hats. One login has up to three hats: Player (the game), Coach (coach.html) and Admin (admin.html) |
| 156 | `features/stars.js` | 755 | 35 | 3 | 0 | The Galaxy. A second view of the 25 skill tracks: 25 spiral arms (constellations) from "You" in the middle out to the FI ring, 625 stars, one star for... |
| 157 | `features/exletter.js` | 162 | 5 | 0 | 0 | One exercise: Letter from your calm self |
| 158 | `features/recalc.js` | 398 | 13 | 8 | 0 | Recalculating. When the real numbers move a date of the plan, one calm card shows the old date, the new date and the one next turn |
| 159 | `features/audit.js` | 257 | 5 | 3 | 0 | The Mistake audit. It is optional |
| 160 | `features/quizzes.js` | 438 | 20 | 5 | 0 | Quizzes. One sheet draws each quiz skin from its definition: the first screen, one question for each tap, and one result card (a title, two or three l... |
| 161 | `features/sins.js` | 601 | 30 | 8 | 0 | The money sins read. The quiz (the sins skin of Quizzes) is the first of four sources |
| 162 | `features/rings.js` | 130 | 8 | 1 | 0 | The Rings theme (run "Money sins", Part 3): dark comedy in a cheeky hell with seven rings, one original ruler for each money sin |
| 163 | `features/quest.js` | 784 | 29 | 8 | 0 | Quest mode (run Not built, groups 1 to 5, Part 10a) |
| 164 | `features/peers.js` | 206 | 6 | 0 | 0 | You and people like you (run Finish everything partly built, Part 9) |
| 165 | `data/patchnotes.js` | 512 | 0 | 0 | 0 | The patch notes: what changed, in plain words, for the person who plays |
| 166 | `features/founding.js` | 380 | 20 | 1 | 0 | Three small things for the soft launch |
| 167 | `features/mycards.js` | 788 | 30 | 4 | 0 | Credit cards as a list of cards, not one balance |
| 168 | `features/tally.js` | 175 | 8 | 1 | 0 | The dashboard of My Money in the Tally look (UX pass, items 24 to 27): the four key tiles at the top, the big three and where the money goes as the tw... |
| 169 | `features/look.js` | 578 | 26 | 2 | 0 | The showcase screens of the dashboard look (DESIGN.md, "Reference: Tally"), built from the kit in screens/dash.js: the stat row of Home; the stat row,... |
| 170 | `features/spiral.js` | 700 | 33 | 6 | 0 | Setup as a spiral of five rounds, in the order of the letters D, A, I, T, E (features/know.js: Debts, Assets, Income, Taxes, Expenses) |
| 171 | `features/amounts.js` | 1,175 | 27 | 5 | 0 | The amounts inside the setup rounds (UX pass, phase 4) |
| 172 | `features/jobs.js` | 557 | 25 | 8 | 0 | The Job of Existing (run JOE-1) |
| 173 | `features/goalwire.js` | 588 | 16 | 2 | 0 | The Job of Existing, feature 4: a goal, its account and its automatic deposit, in one move of three taps |
| 174 | `features/careq.js` | 384 | 14 | 2 | 0 | The Job of Existing, feature 5: the quests of the Health Care Admin and the Insurance Coordinator |
| 175 | `features/rolemap.js` | 385 | 13 | 3 | 0 | The Job of Existing (run JOE-1), feature 6: the household role map, "Who carries what" |
| 176 | `features/canon.js` | 967 | 13 | 4 | 0 | Eli's frameworks and the canon (run "Not built, groups 1 to 5", Part 4) |
| 177 | `features/enough.js` | 351 | 10 | 1 | 0 | Lifestyle creep and enough (run Not built, groups 1 to 5, Part 3) |
| 178 | `features/exercises.js` | 216 | 6 | 0 | 0 | Money exercises (run Finish everything partly built, Part 7, Money psychology) |
| 179 | `features/joy.js` | 489 | 8 | 2 | 0 | Joy and enough (run Finish everything partly built, Part 8) |
| 180 | `features/benefits.js` | 613 | 11 | 3 | 0 | Benefits and health (run Finish everything partly built, Part 10) |
| 181 | `features/ratios.js` | 278 | 6 | 2 | 0 | Ratios on Key numbers (run Not built, groups 1 to 5, Part 9) |
| 182 | `features/hard.js` | 541 | 15 | 5 | 0 | Hard moments (run Not built, groups 1 to 5, Part 7) |
| 183 | `features/estate.js` | 495 | 8 | 5 | 0 | Estate and marriage (run Finish everything partly built, Part 11) |
| 184 | `features/life.js` | 549 | 25 | 5 | 0 | Five play parts (run Not built, groups 1 to 5, Part 10b) |
| 185 | `features/hunt.js` | 331 | 8 | 4 | 0 | Two games on real rules (run Not built, groups 1 to 5, Part 10b) |
| 186 | `features/guild.js` | 264 | 12 | 4 | 0 | People, inside the profiles of this game (run Not built, groups 1 to 5, Part 10b) |
| 187 | `features/hhold.js` | 822 | 27 | 7 | 0 | Households together (run Finish everything partly built, Part 12) |
| 188 | `features/lockset.js` | 153 | 1 | 2 | 0 | The settings sheet of App lock and passkeys (run Not built, groups 1 to 5, Part 10b): set a PIN by taps (twice, to be sure), add this device's own loc... |
| 189 | `features/results.js` | 533 | 21 | 5 | 0 | Results first (run Results-first Home, items 1 and 2, from Eli's playtest: "I'm giving a ton of data but getting nothing back") |
| 190 | `features/receipt.js` | 245 | 11 | 1 | 0 | Action receipts and cliffhangers (run Results-first Home, item 3) |
| 191 | `features/lifemap.js` | 249 | 9 | 5 | 0 | The life tech tree (run Results-first Home, item 4) |
| 192 | `features/book.js` | 625 | 20 | 4 | 0 | The spreadsheet of the plan. Each number of the Plan batch, with its formula, in one table that the player can copy into Google Sheets or Excel, or sa... |
| 193 | `features/questlog.js` | 547 | 30 | 7 | 0 | The Quest Log ("Where am I"). One button, on every tab and on every sheet, opens one sheet that shows where the player is: a Continue card (back to wh... |
| 194 | `features/fbreport.js` | 262 | 18 | 1 | 0 | Report a bug or idea, from each screen |
| 195 | `features/built.js` | 1,759 | 4 | 20 | 0 | What's built. One list of all features of this game: built, partly built, or not built |

"Hidden errors" is the number of `catch` blocks that are empty. An empty block drops the error with no record.

## 2. Replaced functions

A replaced function is a function that a later file puts a new function in the place of. Before 2026-11-22 the game had 61 of these, in 113 places. Now each base function calls its parts by name. The target for this table is: no rows.

No rows: no function is replaced.

### Functions with two declarations

When two top-level functions have the same name, the one that the browser loads last wins, and the other one never runs. This is a defect each time. The target is: no rows.

No rows.

### Actions (ACT) that are set in more than one place

`ACT[name]` runs when the player taps a button with `data-a="name"`. 36 of 994 actions are set in more than one place. The last place wins. Most later places keep the earlier action, call it, and add to it. To read one action, read all places in its row, in order.

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
