# The modules of the game

A module is one thing a player can do or see that could be turned on or off by itself.
There are 50 modules. Every one of the 712 fields in fields.json belongs to one module.
This list is made from `modules.json`. No game file reads it. It changes nothing in the game.

What the status words mean:

- **working**: it is built and has a test that passes.
- **partial**: it is built, but a part is missing or wrong (see REQUESTS.md or AUDIT.md).
- **unfinished**: it is built, but it is switched off or waits on a database file.
- **dead**: it is in the code, but no one sees it.
- **unsure**: no one checked it by hand yet.
- **broken**: it fails. None today.

Count by status: working 18, partial 22, dead 1, unsure 7, unfinished 2.

## All modules

| # | Module | Status | Where | Fields |
|---|--------|--------|-------|--------|
| 1 | [Opening quiz](#opening_quiz) | working | Opening, What it is / What it could be | 9 |
| 2 | [Opening: five ways to grow](#opening_ways) | partial | Opening, What it is / What it could be | 8 |
| 3 | [Opening reveal and first move](#opening_reveal) | partial | Opening, What it is / What it could be | 2 |
| 4 | [Setup: About you](#setup_about_you) | working | Setup, About you | 2 |
| 5 | [Setup debts round (D)](#setup_debts) | partial | Setup, Round D: Debts | 8 |
| 6 | [Setup assets round (A)](#setup_assets) | partial | Setup, Round A: Assets | 6 |
| 7 | [Setup income round (I)](#setup_income) | partial | Setup, Round I: Income | 5 |
| 8 | [Setup taxes round (T)](#setup_taxes) | partial | Setup, Round T: Taxes | 3 |
| 9 | [Setup expenses round (E)](#setup_expenses) | partial | Setup, Round E: Expenses | 11 |
| 10 | [Old setup list](#setup_old) | dead | Setup, Old version | 9 |
| 11 | [Account and sign-in](#account) | partial | Sign-in, Create your account / Sign in | 4 |
| 12 | [Home cards](#home_cards) | partial | Home, Results cards | 12 |
| 13 | [Payday and daily check-in](#checkin) | partial | Home, Check in | 9 |
| 14 | [Your path and eras](#your_path) | working | Home, Your path | 4 |
| 15 | [Ask buttons and Safe to spend](#ask_buttons) | working | Home, The four Ask buttons | 8 |
| 16 | [Make your dates exact](#make_it_exact) | partial | Home, Make your dates exact | 17 |
| 17 | [Log money (+ Log)](#log_money) | unsure | Every tab, + Log (Log money) | 11 |
| 18 | [My Money lists](#money_lists) | working | My Money, Cash | 30 |
| 19 | [My Money overview](#money_overview) | working | My Money, Four tiles at the top | 21 |
| 20 | [Debt plan](#debt_plan) | working | My Money, What you owe | 15 |
| 21 | [Card plan and vault](#card_plan) | partial | Menu, My money | 7 |
| 22 | [Key numbers](#key_numbers) | partial | My Money, Key numbers | 56 |
| 23 | [Next Steps](#next_steps) | working | Next Steps, View switch | 7 |
| 24 | [Moves to try and What if](#moves) | partial | Next Steps, Moves to try | 9 |
| 25 | [My Goals](#my_goals) | working | My Goals, Add a goal | 4 |
| 26 | [Me and settings](#me_settings) | partial | Me, Top of the tab | 17 |
| 27 | [Save and export](#save_export) | partial | Menu, Settings and account | 4 |
| 28 | [Bars, menu and first week](#navigation) | partial | Every tab, Bottom bar | 2 |
| 29 | [People and household](#people_home) | partial | Menu, People and home | 41 |
| 30 | [Kids mode](#kids_mode) | partial | Menu, People and home | 3 |
| 31 | [Health, benefits and insurance](#health_insurance) | working | Menu, Tools and calculators | 8 |
| 32 | [Quest mode](#quest_mode) | unsure | Menu, Games and quizzes | 19 |
| 33 | [Quizzes, games and challenges](#games_challenges) | unsure | Menu, Games and quizzes | 22 |
| 34 | [Learn and exercises](#learn_library) | partial | Menu, Learn | 48 |
| 35 | [Retirement tools](#retirement) | partial | Menu, Plans and what-ifs | 19 |
| 36 | [Life choices and events](#life_plans) | working | Menu, Plans and what-ifs | 23 |
| 37 | [Hard times](#hard_times) | unsure | Menu, Plans and what-ifs | 14 |
| 38 | [Investing and taxes](#investing_taxes) | working | Menu, Tools and calculators | 30 |
| 39 | [Working for yourself](#gig_work) | working | Menu, Tools and calculators | 22 |
| 40 | [Student loan plans](#student_loans) | working | Menu, Tools and calculators | 11 |
| 41 | [Family money and estate](#family_estate) | working | Menu, Tools and calculators | 20 |
| 42 | [Quick math and before you buy](#quick_math) | unsure | Menu, Tools and calculators | 45 |
| 43 | [Money insights](#money_insights) | unsure | Menu, Tools and calculators | 24 |
| 44 | [Spending and values](#spending_values) | working | Menu, My money | 19 |
| 45 | [Admin page](#admin_page) | working | Admin page, Accounts | 15 |
| 46 | [Testing and feedback](#testing_feedback) | working | Menu, Admin | 8 |
| 47 | [Founding testers, sharing and demo](#growth) | unfinished | Menu, Settings and account | 1 |
| 48 | [Coach page](#coach_page) | partial | Coach page, Roster | 7 |
| 49 | [Live Session mode](#live_session) | unfinished | Live Session, Session page: invite and sign-up | 12 |
| 50 | [Add-ons](#addons) | unsure | Home, A row on Home | 1 |

<a id="opening_quiz"></a>
## Opening quiz

Id: `opening_quiz`. Status: **working**.

A new player says what they want and taps four answers to see their first number.

Where it lives: Opening, What it is / What it could be. Who uses it: player.

Why this status: R-023; R-031; R-032; R-033; R-010 (partial: the percent is not on the new Home); game/features/couldbe.js; game/tests/what-you-want.js (test file); game/tests/what-it-could-be.js (test file); game/tests/front-door.js (test file).

Steps:

1. Tap all the things you want (or add your own). (2 fields)
2. Tap your age range. (1 field)
3. Tap about how much you spend a month. (1 field)
4. Tap about how much you have invested. (1 field)
5. Tap how much you put away. (1 field)
6. Look at the chart of what it is and what it could be. (1 field)
7. Watch the two numbers at the top move as you tap. (2 fields)

Parts:

- What you want, picks become goals: working
- Four range questions: working
- No idea, use typical chip: working
- Two numbers pinned at the top: working
- Chart with layers: working

Needs: nothing. Feeds: Opening: five ways to grow, My Goals.

How to open it: Flow: What it is / What it could be; Page: Front door; Menu > Tools and calculators > What it is / What it could be; Front door: Start button (game/account/door.js).

<a id="opening_ways"></a>
## Opening: five ways to grow

Id: `opening_ways`. Status: **partial**.

Five short screens show ways the could-be number grows, then a Yes, but card.

Where it lives: Opening, What it is / What it could be. Who uses it: player.

Why this status: R-060 (missing: moves do not move the top numbers); R-051 (missing: no question on where invested money is); game/features/cbtax.js; game/tests/what-it-could-be-steps.js (test file); game/tests/what-it-could-be-taxes.js (test file); game/tests/what-it-could-be-flex-later.js (test file); game/tests/what-it-could-be-yes-but.js (test file).

Steps:

1. Way 1: pick the shape of your money. (1 field)
2. Way 2: pick how to count Social Security. (1 field)
3. Way 3: pick a tax plan, filing and state. (3 fields)
4. Way 4: pick how flexible you can be. (1 field)
5. Way 5: pick what comes later (pension, home). (1 field)
6. Answer the Yes, but card. (1 field)

Parts:

- Five way screens: working
- Yes, but card: partial
- Moves counted before FI move the top numbers: unfinished

Needs: Opening quiz. Feeds: Opening reveal and first move.

How to open it: Flow: What it is / What it could be.

<a id="opening_reveal"></a>
## Opening reveal and first move

Id: `opening_reveal`. Status: **partial**.

The last screen of the opening shows the answer and one first move, then a tile on Home.

Where it lives: Opening, What it is / What it could be. Who uses it: player.

Why this status: R-034; R-050 (missing: top moves are not added by themselves); R-035 (missing: in-debt version); game/features/cbreveal.js; game/tests/what-it-could-be-reveal.js (test file); game/tests/onboarding-handoff-and-home.js (test file).

Steps:

1. See the reveal and the first move. (1 field)
2. Tap Add to my steps, or save by making an account.
3. See the first tile on Home: what changed. (1 field)

Parts:

- Reveal: working
- First move with steps and minutes: working
- Home first tile: working
- In-debt version (debt-free date first): unfinished
- Top 3 moves added with no tap: unfinished

Needs: Opening: five ways to grow. Feeds: Account and sign-in, Next Steps, Setup: About you.

How to open it: Flow: What it is / What it could be; Bottom bar tab: Home.

<a id="setup_about_you"></a>
## Setup: About you

Id: `setup_about_you`. Status: **working**.

The first page of the rest of setup asks your age.

Where it lives: Setup, About you. Who uses it: player.

Why this status: AUDIT.md Duplicates: Age (also asked in the opening); game/screens/smart.js; game/tests/setup-order-and-account.js (test file); game/tests/spiral-onboarding.js (test file).

Steps:

1. Tap your decade, then your exact age. (2 fields)

Parts:

- Age by decade then year: working

Needs: Opening reveal and first move. Feeds: Setup debts round (D).

How to open it: Flow: The rest of setup (five rounds: D, A, I, T, E); Opening last screen: Keep going.

<a id="setup_debts"></a>
## Setup debts round (D)

Id: `setup_debts`. Status: **partial**.

Round D asks what you owe, card by card and debt by debt.

Where it lives: Setup, Round D: Debts. Who uses it: player.

Why this status: R-011; AUDIT.md problem 2 (setup.debt_rate offers I don't know); AUDIT.md Order breaks (debt_kinds ordered by home, asked later); game/tests/credit-cards.js (test file); game/tests/setup-order-and-account.js (test file).

Steps:

1. Tap how many cards and how many carry a balance. (2 fields)
2. Tap the kinds of debt you have. (1 field)
3. For each debt: bank, amount, rate, 0% end date. (5 fields)

Parts:

- Card count and carry: working
- Kinds of debt: partial
- Each debt one at a time: partial

Needs: Setup: About you. Feeds: Setup assets round (A), Debt plan, Key numbers.

How to open it: Flow: The rest of setup (five rounds: D, A, I, T, E).

<a id="setup_assets"></a>
## Setup assets round (A)

Id: `setup_assets`. Status: **partial**.

Round A asks where your money lives and your cushion.

Where it lives: Setup, Round A: Assets. Who uses it: player.

Why this status: AUDIT.md Order breaks (setup.accts ordered by work, which is asked later); AUDIT.md Duplicates (setup.invest already set by open.save); game/tests/setup-order-and-account.js (test file).

Steps:

1. Tap where your money lives. (1 field)
2. For each account: about how much, and any old job plan. (2 fields)
3. Answer three cushion questions. (3 fields)

Parts:

- Kinds of account: partial
- Each account amount: working
- Cushion questions: partial

Needs: Setup debts round (D). Feeds: Setup income round (I), Key numbers, My Money lists.

How to open it: Flow: The rest of setup (five rounds: D, A, I, T, E).

<a id="setup_income"></a>
## Setup income round (I)

Id: `setup_income`. Status: **partial**.

Round I asks about your work and each source of money.

Where it lives: Setup, Round I: Income. Who uses it: player.

Why this status: R-013 (no Daily choice in setup); AUDIT.md Order breaks (setup.steady depends on payFreq, no longer asked); game/tests/setup-order-and-account.js (test file).

Steps:

1. Tap your work and the kinds of income. (3 fields)
2. For each source: how often and about how much. (2 fields)

Parts:

- Work and income kinds: partial
- Each source with its own rhythm: working

Needs: Setup assets round (A). Feeds: Setup taxes round (T), Key numbers.

How to open it: Flow: The rest of setup (five rounds: D, A, I, T, E).

<a id="setup_taxes"></a>
## Setup taxes round (T)

Id: `setup_taxes`. Status: **partial**.

Round T asks what comes off the top of your pay.

Where it lives: Setup, Round T: Taxes. Who uses it: player.

Why this status: R-001 (taxQ, matchQ, taxAcctQ offer I don't know); AUDIT.md Duplicates: Taxes off the top, Job match; game/tests/taxes-and-self-employed.js (test file).

Steps:

1. Tap your tax share, job match and tax-friendly accounts. (3 fields)

Parts:

- Tax share, match, tax-friendly accounts: partial

Needs: Setup income round (I). Feeds: Setup expenses round (E), Key numbers, Investing and taxes.

How to open it: Flow: The rest of setup (five rounds: D, A, I, T, E).

<a id="setup_expenses"></a>
## Setup expenses round (E)

Id: `setup_expenses`. Status: **partial**.

Round E asks about home, people, spending, and a last two.

Where it lives: Setup, Round E: Expenses. Who uses it: player.

Why this status: R-012 (just me with a roommate is cant_tell); R-053 (no subscription split); AUDIT.md Duplicates: Kids, Who you combine money with; game/tests/setup-order-and-account.js (test file); game/tests/results-first.js (test file).

Steps:

1. Tap where you live and who lives with you. (4 fields)
2. Tap your relationship, who relies on you, and who you share money with. (3 fields)
3. Tap spending, group by group. (1 field)
4. Social Security, a feeling, and a name for your character. (3 fields)

Parts:

- Your home: partial
- Your people: partial
- Spending by group: working
- A last two: working

Needs: Setup taxes round (T). Feeds: Home cards, Key numbers, My Money lists, People and household.

How to open it: Flow: The rest of setup (five rounds: D, A, I, T, E).

<a id="setup_old"></a>
## Old setup list

Id: `setup_old`. Status: **dead**.

Nine setup questions from the first version that are still in the code but never shown.

Where it lives: Setup, Old version. Who uses it: player.

Why this status: AUDIT.md Old code that is never shown (dead.setup_v1.*); game/screens/ui.js:1598.

Steps:

1. Not shown to anyone. (9 fields)

Parts:

- First SETUP list: dead

Needs: nothing. Feeds: nothing.

How to open it: None (never shown).

<a id="account"></a>
## Account and sign-in

Id: `account`. Status: **partial**.

Make an account, sign in, set a new password, see privacy, and sync your game.

Where it lives: Sign-in, Create your account / Sign in. Who uses it: player, coach, admin.

Why this status: R-022 (sign-in buttons still say Create my account and I'm new); R-019; game/account/supa.js:369; game/tests/setup-order-and-account.js (test file); game/tests/trust-and-privacy.js (test file); game/tests/sync-no-change-lost.js (test file).

Steps:

1. Type email and password, then create or sign in. (2 fields)
2. Set a new password from the email link. (1 field)
3. Open My account and privacy in the menu. (1 field)

Parts:

- Create account / sign in: partial
- Set a new password: working
- My account in the menu: working
- Cloud sync across devices: working

Needs: nothing. Feeds: Coach page, Admin page, Save and export.

How to open it: Page: Create your account / Sign in; Menu > Settings and account > Privacy; Page: Privacy page; Opening reveal: save by making an account.

<a id="home_cards"></a>
## Home cards

Id: `home_cards`. Status: **partial**.

Home shows four cards: your next win, the month end, where you are, and your numbers.

Where it lives: Home, Results cards. Who uses it: player.

Why this status: R-037; R-009 (the four always-on numbers are hidden for a placed player); home.stat.* and home.quad.* are hidden; game/tests/results-first.js (test file); game/tests/look-screens.js (test file).

Steps:

1. Read the four cards and tap one to open it. (4 fields)
2. Old top of Home (hidden now). (8 fields)

Parts:

- Four Results cards: working
- Old stat row: dead
- Old four boxes: dead

Needs: Setup expenses round (E), Key numbers. Feeds: Next Steps.

How to open it: Bottom bar tab: Home; Bottom bar: Home; Home button in the top bar.

<a id="checkin"></a>
## Payday and daily check-in

Id: `checkin`. Status: **partial**.

Check in each day, each payday and each month, and see what changed since last time.

Where it lives: Home, Check in. Who uses it: player.

Why this status: R-017; R-018 (no don't show this again); R-054 (payday presets cant_tell); R-025; game/tests/welcome-back-card.js (test file); game/tests/recalculating.js (test file); game/tests/play-and-people.js (test file).

Steps:

1. See Welcome back and what changed since last time. (1 field)
2. Daily check: how money felt and what happened. (3 fields)
3. Payday round: did you move the money. (1 field)
4. Monthly session: did you look at real balances. (1 field)
5. Recalculating: see the new date and the next turn. (3 fields)
6. Look at the money calendar.

Parts:

- Welcome back / Since then: partial
- Daily check: working
- Payday round: unsure
- Monthly session: working
- Recalculating month check: working
- Money calendar: unsure

Needs: My Money lists, Key numbers. Feeds: Your path and eras, Next Steps.

How to open it: Tab button: Check in; Menu > My money > Check in; Menu > My money > Since last time; Menu > My money > Recalculating: month check; Menu > My money > Money calendar.

<a id="your_path"></a>
## Your path and eras

Id: `your_path`. Status: **working**.

See your path, cross into a new era, log a win, and see where you are.

Where it lives: Home, Your path. Who uses it: player.

Why this status: R-003; R-039; game/features/lifemap.js; game/features/questlog.js; game/tests/receipts-lifemap.js (test file); game/tests/questlog.js (test file); game/tests/later-eras-and-account-line.js (test file).

Steps:

1. Open a step on Your path: already done or not yet. (1 field)
2. Log a win: did it put money in your pocket. (1 field)
3. Era crossing: are you happy, and your path from here. (2 fields)
4. Look at the big picture life map.
5. Open Where am I.

Parts:

- Your path steps: working
- Log a win: working
- Era crossing: working
- Life map of ten eras: working

Needs: Payday and daily check-in, Key numbers. Feeds: Next Steps.

How to open it: Tab button: The big picture; Menu > My money > Where am I; Next Steps: See the big picture.

<a id="ask_buttons"></a>
## Ask buttons and Safe to spend

Id: `ask_buttons`. Status: **working**.

Four Ask buttons on Home answer: is it safe, how much can I spend, what do I do, my goals.

Where it lives: Home, The four Ask buttons. Who uses it: player.

Why this status: R-027; game/features/ask3.js; game/tests/ask-front-door.js (test file).

Steps:

1. Tap one of the four Ask buttons. (4 fields)
2. How much can I spend: today, week, month, year. (4 fields)
3. Safe to spend: type an amount and see the trade.

Parts:

- Four Ask buttons: working
- How much can I spend tiles: working
- Safe to spend meter: working

Needs: Key numbers, My Money lists. Feeds: Next Steps.

How to open it: Bottom bar tab: Home; Menu > My money > Safe to spend?.

<a id="make_it_exact"></a>
## Make your dates exact

Id: `make_it_exact`. Status: **partial**.

A list of questions on Home that turn guessed dates into exact ones.

Where it lives: Home, Make your dates exact. Who uses it: player.

Why this status: AUDIT.md Duplicates (life.taxwhen, life.kids, life.ss, life.pension ask again what setup asked); AUDIT.md Missing i (no i on the life.* list); game/tests/what-you-already-know.js (test file).

Steps:

1. Answer one question at a time to make a date exact. (17 fields)

Parts:

- Life questions list: partial

Needs: Setup expenses round (E). Feeds: Key numbers, Retirement tools.

How to open it: Bottom bar tab: Home.

<a id="log_money"></a>
## Log money (+ Log)

Id: `log_money`. Status: **unsure**.

The + Log button on every tab records money in, money out, a payment or a move.

Where it lives: Every tab, + Log (Log money). Who uses it: player.

Why this status: R-014 (read in code, not run); R-038; 8 of 11 fields are cant_tell controls (low confidence); game/tests/receipts-lifemap.js (test file).

Steps:

1. Tap + Log, then pick where it came from, where it landed, what it was for. (8 fields)
2. Shifts or gigs: which one, how many, how much each. (3 fields)
3. See a receipt with what moved and the next action.

Parts:

- Log money in or out: unsure
- Shifts or gigs: unsure
- Receipt after logging: working

Needs: My Money lists. Feeds: My Money lists, Key numbers, Payday and daily check-in.

How to open it: Bottom bar; Bottom bar: + Log.

<a id="money_lists"></a>
## My Money lists

Id: `money_lists`. Status: **working**.

Lists of your cash, investments, debts, income, spending and schedules, each row editable.

Where it lives: My Money, Cash. Who uses it: player.

Why this status: R-015 (remove not checked everywhere); R-026 (schedules); game/screens/ui.js:2591; game/tests/one-question-at-a-time.js (test file); game/tests/rocket-money-import.js (test file); game/tests/ledger-and-statements.js (test file).

Steps:

1. Open a list: cash, investments, what you owe, coming in, going out. (5 fields)
2. Edit a row: name, amount, how often. (4 fields)
3. Fill in spending from a statement file. (1 field)
4. Make your numbers real: one small question at a time. (9 fields)
5. Add a schedule that repeats. (8 fields)
6. Ledger and statements. (3 fields)

Parts:

- Five money lists: working
- Row editor: working
- Statement import: working
- Make your numbers real: working
- Schedules: working
- Ledger and statements: working

Needs: Setup assets round (A), Setup income round (I), Setup expenses round (E). Feeds: Key numbers, My Money overview, Debt plan, Payday and daily check-in.

How to open it: Bottom bar tab: My Money; Menu > My money > Ledger and statements; Bottom bar: My Money.

<a id="money_overview"></a>
## My Money overview

Id: `money_overview`. Status: **working**.

Tiles and charts that sum up your money: the big three, where it goes, what it earns, work benefits.

Where it lives: My Money, Four tiles at the top. Who uses it: player.

Why this status: R-010 (How complete is your picture); game/features/tally.js; game/features/slept.js; game/tests/while-you-slept.js (test file); game/tests/money-chart-group.js (test file).

Steps:

1. Read the four tiles and how complete your picture is. (5 fields)
2. See the big three, where it goes and your money machine. (3 fields)
3. What your money earns: while you slept, make my wage real. (6 fields)
4. Watch a monthly amount grow. (2 fields)
5. Work benefits and protection. (5 fields)

Parts:

- Four tiles: working
- How complete is your picture: working
- Big three, where it goes, money machine: working
- While you slept and wage real: working
- Watch it grow: working
- Work benefits and protection: unsure

Needs: My Money lists, Key numbers. Feeds: Home cards.

How to open it: Bottom bar tab: My Money; Bottom bar: My Money.

<a id="debt_plan"></a>
## Debt plan

Id: `debt_plan`. Status: **working**.

Pick an order to pay debts, see the debt-free date, and what each debt costs.

Where it lives: My Money, What you owe. Who uses it: player.

Why this status: R-014; game/features/debts.js; game/screens/dash.js:449; game/tests/what-each-debt-costs.js (test file); game/tests/one-question-debts-and-key-numbers.js (test file).

Steps:

1. Open What you owe and the debt plan. (5 fields)
2. Turn the Time-Money dial: done in, extra each month. (2 fields)
3. Open one debt and answer its questions. (8 fields)
4. See what each debt costs you.

Parts:

- Debt plan order: working
- Time-Money dial: working
- One debt detail: working
- What each debt costs: working

Needs: Setup debts round (D), My Money lists. Feeds: Key numbers, Next Steps.

How to open it: Bottom bar tab: My Money; Menu > Tools and calculators > What each debt costs you.

<a id="card_plan"></a>
## Card plan and vault

Id: `card_plan`. Status: **partial**.

Keep your credit cards in a vault, add a card, and plan which card to use.

Where it lives: Menu, My money. Who uses it: player.

Why this status: AUDIT.md problem 1 (credit score kept in three places: c.x.vault.score, c.caught.score, stg.score); game/features/vault.js; game/tests/card-vault.js (test file); game/tests/credit-cards.js (test file).

Steps:

1. Add a card from What you owe. (1 field)
2. Open the card vault and set each card. (6 fields)

Parts:

- Add a card: working
- Card vault: partial

Needs: Setup debts round (D). Feeds: Debt plan.

How to open it: Menu > My money > Card vault.

<a id="key_numbers"></a>
## Key numbers

Id: `key_numbers`. Status: **partial**.

A sheet of 38 key numbers in groups, each with its math, unlocked one small question at a time.

Where it lives: My Money, Key numbers. Who uses it: player.

Why this status: R-028; R-052 (still says Freedom number); AUDIT.md Duplicates (knask.tax, knask.limit, knask.debtPay); game/tests/ratios-on-key-numbers.js (test file); game/tests/math-audit-core-numbers.js (test file); game/tests/fi-ratio-and-coast-card.js (test file).

Steps:

1. Open Key numbers and pick a group. (38 fields)
2. Tap to unlock: answer one question. (18 fields)
3. Tap a number to see the math.

Parts:

- Six groups of numbers: working
- One question to unlock: partial
- Show the math: working

Needs: My Money lists, Setup expenses round (E). Feeds: Home cards, My Money overview, Retirement tools, Next Steps.

How to open it: Sheet: Key numbers (on My Money); My Money: Key numbers row.

<a id="next_steps"></a>
## Next Steps

Id: `next_steps`. Status: **working**.

Your to-do list in order: today, this week, this month, this year.

Where it lives: Next Steps, View switch. Who uses it: player.

Why this status: R-026; R-003; game/screens/planner.js:482; game/tests/next-steps-one-list.js (test file); game/tests/plan-summary.js (test file).

Steps:

1. Pick a view: today, this week, month, year. (1 field)
2. Set minutes for this week and see this pay period. (2 fields)
3. Open one task: done, working on it, waiting, doesn't apply. (4 fields)

Parts:

- Four views: working
- Minutes planned and pay period: working
- Task states: working

Needs: Opening reveal and first move, Moves to try and What if. Feeds: Payday and daily check-in.

How to open it: Bottom bar tab: Next Steps; Bottom bar: Next Steps.

<a id="moves"></a>
## Moves to try and What if

Id: `moves`. Status: **partial**.

A library of money moves, each with one question first, and a side by side What if.

Where it lives: Next Steps, Moves to try. Who uses it: player.

Why this status: AUDIT.md problem 2 (stg.score offers I don't know it); AUDIT.md Duplicates: Where you live (stg.home); game/data/strategies.js; game/tests/strategy-engine.js (test file); game/tests/side-by-side.js (test file); game/tests/move-facts.js (test file).

Steps:

1. Moves to try: answer one question first. (6 fields)
2. Browse the moves library. (2 fields)
3. What if: compare two choices side by side. (1 field)

Parts:

- One question first: partial
- Moves library: working
- What if side by side: working

Needs: Key numbers. Feeds: Next Steps.

How to open it: Menu > Plans and what-ifs > Moves library; Menu > Plans and what-ifs > What if.

<a id="my_goals"></a>
## My Goals

Id: `my_goals`. Status: **working**.

Pick, rank and track your goals; the top 3 are what you work on now.

Where it lives: My Goals, Add a goal. Who uses it: player.

Why this status: R-016; R-032; game/features/goalrank.js; game/features/goalwire.js; game/tests/goal-wire-and-care-quests.js (test file); game/tests/dashboard-values-goals.js (test file).

Steps:

1. Pick my first goals from the empty list. (1 field)
2. Add a goal and give it a name. (1 field)
3. Wire a goal to an account and see a month and next check-in. (2 fields)

Parts:

- Pick first goals: working
- Add a goal: working
- Goal wired to an account: working
- Rank and top 3: working

Needs: Opening quiz. Feeds: Next Steps, Home cards.

How to open it: Bottom bar tab: My Goals; Bottom bar: My Goals; Home: Ask button My goals.

<a id="me_settings"></a>
## Me and settings

Id: `me_settings`. Status: **partial**.

The Me tab: how the game looks and talks to you, about you, app lock and Rearrange Home.

Where it lives: Me, Top of the tab. Who uses it: player.

Why this status: R-029 (muted text is pale blue; other themes can be picked); R-059; game/features/lockset.js; game/tests/rings-theme.js (test file); game/tests/game-feel.js (test file).

Steps:

1. Top of the tab: expert mode and a color. (2 fields)
2. Theme: looks like, talks like. (3 fields)
3. How the game talks to you: gentle or tough. (2 fields)
4. More about you and a role model or rival. (8 fields)
5. Turn on App lock. (2 fields)

Parts:

- Top of the tab: working
- Theme: partial
- Tone: working
- More about you: working
- Role model and rival: working
- App lock and passkeys: working
- Rearrange Home: unsure

Needs: nothing. Feeds: Home cards.

How to open it: Bottom bar tab: Me; Menu > Settings and account > Theme; Menu > Settings and account > Rearrange Home; Menu > Settings and account > App lock; Bottom bar: Me.

<a id="save_export"></a>
## Save and export

Id: `save_export`. Status: **partial**.

Copy your game as text, bring it back, or export your plan to a spreadsheet.

Where it lives: Menu, Settings and account. Who uses it: player.

Why this status: R-055 (a file, not a live Google Sheets link); R-019 (Save my game is a backup); game/features/book.js; game/tests/plan-spreadsheet.js (test file); game/tests/spreadsheet-round-trip.js (test file); game/tests/plan-xlsx.js (test file); game/tests/save-status.js (test file).

Steps:

1. Copy your game as text or paste it back. (2 fields)
2. Export the plan, or bring a file back. (2 fields)
3. See my plan on one page.

Parts:

- Save my game (text): working
- Export spreadsheet round trip: partial
- Plan on one page: working

Needs: Account and sign-in. Feeds: nothing.

How to open it: Menu > Settings and account > Backup copy; Menu > My money > Export; Menu > My money > My plan on one page; Menu > My money > One page for a planner.

<a id="navigation"></a>
## Bars, menu and first week

Id: `navigation`. Status: **partial**.

The bottom bar, top bar, the menu with search and the tool library, and the calmer first week.

Where it lives: Every tab, Bottom bar. Who uses it: player, coach, admin.

Why this status: R-005; R-006 (My money group still scrolls); R-036; R-047; R-049 (missing: no last day); bar.bottom_old is dead; game/tests/first-week.js (test file); game/tests/sheet-navigation.js (test file); game/tests/roles-and-navigation.js (test file).

Steps:

1. Tap a tab in the bottom bar.
2. Open the menu and type in Find a tool. (1 field)
3. Open the tool library. (1 field)

Parts:

- Bottom bar: working
- Top bar and sheet row: working
- Menu search: working
- Tool library: working
- Calmer first week: partial
- Old bottom bar: dead

Needs: Account and sign-in. Feeds: nothing.

How to open it: Bottom bar; Top bar; Top row of each sheet; Menu > Learn > Glossary; Always visible.

<a id="people_home"></a>
## People and household

Id: `people_home`. Status: **partial**.

Switch person, add a person, your household, households together, sharing costs, who carries what, your guild.

Where it lives: Menu, People and home. Who uses it: player.

Why this status: AUDIT.md Duplicates: Who you combine money with (c.share and G.house.share); R-022; game/screens/profiles.js; game/tests/our-household.js (test file); game/tests/households-together.js (test file); game/tests/sharing-costs-fairly.js (test file); game/tests/household-role-map.js (test file); game/tests/your-unpaid-jobs.js (test file); game/tests/money-log-and-give-a-game.js (test file).

Steps:

1. Switch person or add one. (6 fields)
2. Set up our household. (3 fields)
3. Households together: answer the same question. (16 fields)
4. Share costs fairly. (6 fields)
5. Who carries what, and your unpaid jobs. (9 fields)
6. Name your guild. (1 field)

Parts:

- Profiles and switch person: working
- Send or add a person: working
- Our household: working
- Households together: unsure
- Sharing costs fairly: working
- Who carries what and unpaid jobs: working
- Guild: unsure

Needs: Setup expenses round (E). Feeds: Key numbers.

How to open it: Menu > People and home > Switch person; Menu > People and home > Our household; Menu > Tools and calculators > Households together; Menu > People and home > Sharing costs fairly; Menu > People and home > Who carries what; Menu > People and home > Your unpaid jobs; Menu > People and home > Your guild; Top bar: the name button.

<a id="kids_mode"></a>
## Kids mode

Id: `kids_mode`. Status: **partial**.

A separate kid profile with short daily lessons.

Where it lives: Menu, People and home. Who uses it: player.

Why this status: R-041 (open to every player, with no add-on switch); game/features/kids.js; game/tests/kids-mode.js (test file).

Steps:

1. Add a kid and open their profile. (3 fields)
2. Do a short daily lesson.

Parts:

- Kid profiles: working
- Daily lessons: working

Needs: nothing. Feeds: nothing.

How to open it: Menu > People and home > Kids mode; Menu > Tools and calculators > Daily lessons.

<a id="health_insurance"></a>
## Health, benefits and insurance

Id: `health_insurance`. Status: **working**.

Health and insurance quests, work benefits, and how much insurance you need.

Where it lives: Menu, Tools and calculators. Who uses it: player.

Why this status: game/tests/benefits-and-health.js; game/tests/insurance-needs.js; Not checked by hand in AUDIT.md; game/tests/benefits-and-health.js (test file); game/tests/insurance-needs.js (test file); game/tests/goal-wire-and-care-quests.js (test file).

Steps:

1. Pick a health or insurance quest. (2 fields)
2. Answer the benefits and health questions. (5 fields)
3. See how much insurance you need. (1 field)

Parts:

- Care quests: working
- Benefits and health: working
- Insurance needs: working

Needs: My Money overview. Feeds: Next Steps.

How to open it: Menu > People and home > Health and insurance quests; Menu > Tools and calculators > Benefits and health; Menu > Tools and calculators > Insurance needs.

<a id="quest_mode"></a>
## Quest mode

Id: `quest_mode`. Status: **unsure**.

Play the money plan as a quest with levels.

Where it lives: Menu, Games and quizzes. Who uses it: player.

Why this status: game/features/quest.js; game/tests/the-quest.js; 19 fields found by scan, low confidence; game/tests/the-quest.js (test file).

Steps:

1. Start a quest and answer its questions. (19 fields)

Parts:

- Quest questions: unsure

Needs: Key numbers. Feeds: Your path and eras.

How to open it: Menu > Games and quizzes > Quest mode.

<a id="games_challenges"></a>
## Quizzes, games and challenges

Id: `games_challenges`. Status: **unsure**.

Quizzes, the daily challenge, the credit score game, the bonus hunt, galaxy and small games on Home.

Where it lives: Menu, Games and quizzes. Who uses it: player.

Why this status: game/features/hunt.js; game/features/quizzes.js; game/features/life.js; Not checked by hand in AUDIT.md; game/tests/quizzes.js (test file); game/tests/quiz-styles-and-daily-path.js (test file); game/tests/stars.js (test file); game/tests/your-people.js (test file).

Steps:

1. Take a quiz. (2 fields)
2. Do the daily challenge. (6 fields)
3. Play the credit score game or the bonus hunt. (12 fields)
4. Home games: subscriptions and your people. (2 fields)
5. Look at your galaxy.

Parts:

- Quizzes: working
- Daily challenge: unsure
- Credit score game and bonus hunt: unsure
- Home games: unsure
- Galaxy: unsure

Needs: nothing. Feeds: Your path and eras.

How to open it: Menu > Games and quizzes > Quizzes; Menu > Games and quizzes > Daily challenge; Menu > Games and quizzes > The credit score game; Menu > Games and quizzes > The first $1,000 bonus hunt; Menu > Games and quizzes > Galaxy.

<a id="learn_library"></a>
## Learn and exercises

Id: `learn_library`. Status: **partial**.

Famous money ideas, the glossary, how it connects, books, exercises, and the opt-in Mistake audit.

Where it lives: Menu, Learn. Who uses it: player.

Why this status: R-004 (most labels have no i); R-030; R-052 (glossary says Freedom number); game/tests/canon-meters.js (test file); game/tests/famous-money-ideas.js (test file); game/tests/frameworks-and-canon.js (test file); game/tests/money-exercises.js (test file); game/tests/how-it-connects.js (test file); game/tests/what-depends-on-what.js (test file).

Steps:

1. Read famous money ideas and set the meters. (25 fields)
2. Work through Your Money or Your Life. (17 fields)
3. Do a money exercise in your own words. (4 fields)
4. Opt in to the Mistake audit. (2 fields)
5. Look up a word.

Parts:

- Famous ideas meters: working
- Your Money or Your Life: working
- Money exercises: working
- Mistake audit: working
- Glossary: partial
- How it connects, what depends on what, books: working

Needs: nothing. Feeds: nothing.

How to open it: Menu > Learn > Famous money ideas; Menu > Learn > Glossary; Menu > Learn > How it all connects; Menu > Learn > What depends on what; Menu > Learn > Books for your next step; Menu > Learn > Mistake audit (opt-in); Menu > Tools and calculators > Your Money or Your Life; Menu > Tools and calculators > Quick wins; Menu > Tools and calculators > Money exercises; Tab head: Glossary button.

<a id="retirement"></a>
## Retirement tools

Id: `retirement`. Status: **partial**.

Retirement odds, taking money out, stress test, your two ages, simulators and fire drills.

Where it lives: Menu, Plans and what-ifs. Who uses it: player.

Why this status: R-024 (FI kinds are markers, not a switch); R-040 (missing: Barista, Chubby, Fat have no number); game/features/takeout.js; game/tests/retirement-odds.js (test file); game/tests/taking-money-out.js (test file); game/tests/compare-the-ways.js (test file); game/tests/simulators.js (test file); game/tests/stress-testing.js (test file); game/tests/two-ages.js (test file); game/tests/fire-drills.js (test file); game/tests/fire-statuses.js (test file); game/tests/retirement-engine.js (test file).

Steps:

1. See your retirement odds. (3 fields)
2. Plan taking money out and compare the ways. (15 fields)
3. Run a simulator. (1 field)
4. Run a stress test, your two ages, fire drills.

Parts:

- Retirement odds: working
- Taking money out: working
- Compare the ways: working
- Simulators: working
- Stress test, two ages, fire drills: working
- Lean / Regular / Chubby / Fat FI switch: unfinished

Needs: Key numbers, Make your dates exact. Feeds: Next Steps.

How to open it: Menu > Plans and what-ifs > Retirement odds; Menu > Plans and what-ifs > Taking money out; Menu > Plans and what-ifs > Stress test; Menu > Plans and what-ifs > Your two ages; Menu > Plans and what-ifs > Simulators; Menu > Plans and what-ifs > Fire drills.

<a id="life_plans"></a>
## Life choices and events

Id: `life_plans`. Status: **working**.

Two paths, two job offers, career and school, trips, countdowns and life event blocks.

Where it lives: Menu, Plans and what-ifs. Who uses it: player.

Why this status: game/tests/two-paths.js; game/tests/two-job-offers.js; game/tests/life-event-blocks.js; Not checked by hand in AUDIT.md; game/tests/two-paths.js (test file); game/tests/two-job-offers.js (test file); game/tests/career-and-education.js (test file); game/tests/trips-and-the-journey.js (test file); game/tests/countdowns.js (test file); game/tests/life-event-blocks.js (test file).

Steps:

1. Compare two paths. (7 fields)
2. Compare two job offers. (1 field)
3. Plan career and education. (5 fields)
4. Plan a trip. (5 fields)
5. Set a countdown. (3 fields)
6. Drop in a life event block. (2 fields)

Parts:

- Two paths: working
- Two job offers: working
- Career and education: working
- Trips: working
- Countdowns: working
- Life event blocks: working

Needs: Key numbers. Feeds: My Goals, Next Steps.

How to open it: Menu > Plans and what-ifs > Two paths; Menu > Plans and what-ifs > Two job offers; Menu > Plans and what-ifs > Career and education; Menu > Plans and what-ifs > Trips and the journey; Menu > Plans and what-ifs > Countdowns; Menu > Plans and what-ifs > Life event blocks.

<a id="hard_times"></a>
## Hard times

Id: `hard_times`. Status: **unsure**.

Break in case of emergency, safety nets, and hard moments.

Where it lives: Menu, Plans and what-ifs. Who uses it: player.

Why this status: R-056 (cant_tell: more transitions than a layoff); game/features/nets.js; game/features/hard.js; game/tests/life-transitions.js (test file); game/tests/safety-nets.js (test file); game/tests/hard-moments.js (test file).

Steps:

1. Pick what happened and see your safety nets. (7 fields)
2. Work through a hard moment. (7 fields)

Parts:

- Break in case of emergency: unsure
- Safety nets: working
- Hard moments: working

Needs: My Money lists. Feeds: Next Steps.

How to open it: Menu > Plans and what-ifs > Break in case of emergency; Menu > Tools and calculators > Hard moments.

<a id="investing_taxes"></a>
## Investing and taxes

Id: `investing_taxes`. Status: **working**.

Invest or pay debt, Roth or traditional, investment mix and fees, which account next, extra money, your tax view.

Where it lives: Menu, Tools and calculators. Who uses it: player.

Why this status: game/tests/investing.js; game/tests/tax-view.js; game/tests/windfall.js; Not checked by hand in AUDIT.md; game/tests/investing.js (test file); game/tests/investment-mix-and-fees.js (test file); game/tests/which-account-next.js (test file); game/tests/windfall.js (test file); game/tests/tax-view.js (test file).

Steps:

1. Invest or pay debt, and Roth or traditional. (8 fields)
2. Check your investment mix and fees. (8 fields)
3. Which account first and next. (2 fields)
4. Got extra money: where it goes. (4 fields)
5. See your tax view. (8 fields)

Parts:

- Invest or pay debt: working
- Mix and fees: working
- Which account next: working
- Windfall: working
- Tax view: working

Needs: Setup taxes round (T), My Money lists. Feeds: Next Steps.

How to open it: Menu > Tools and calculators > Invest or pay debt; Menu > Tools and calculators > Roth or traditional, by account; Menu > Tools and calculators > Investment mix and fees; Menu > Tools and calculators > Which account first; Menu > Tools and calculators > Which account next; Menu > Plans and what-ifs > Got extra money?; Menu > Tools and calculators > Your tax view.

<a id="gig_work"></a>
## Working for yourself

Id: `gig_work`. Status: **working**.

Tools for gig and self-employed work: invoices, set-asides and taxes.

Where it lives: Menu, Tools and calculators. Who uses it: player.

Why this status: game/tests/working-for-yourself.js; 22 fields found by scan, low confidence; game/tests/working-for-yourself.js (test file); game/tests/taxes-and-self-employed.js (test file).

Steps:

1. Answer questions about your own work. (22 fields)

Parts:

- Self-employed tools: working

Needs: Setup income round (I). Feeds: Key numbers.

How to open it: Menu > Tools and calculators > Working for yourself.

<a id="student_loans"></a>
## Student loan plans

Id: `student_loans`. Status: **working**.

Compare student loan plans and payments.

Where it lives: Menu, Tools and calculators. Who uses it: player.

Why this status: game/tests/student-loan-plans.js; game/tests/student-loan-plans.js (test file).

Steps:

1. Answer loan questions and compare plans. (11 fields)

Parts:

- Loan plans: working

Needs: Setup debts round (D). Feeds: Debt plan.

How to open it: Menu > Tools and calculators > Student loan plans.

<a id="family_estate"></a>
## Family money and estate

Id: `family_estate`. Status: **working**.

Family money tools, and estate and marriage.

Where it lives: Menu, Tools and calculators. Who uses it: player.

Why this status: game/tests/family-money.js; game/tests/estate-and-marriage.js; game/tests/family-money.js (test file); game/tests/estate-and-marriage.js (test file).

Steps:

1. Family money questions. (12 fields)
2. Estate and marriage questions. (8 fields)

Parts:

- Family money: working
- Estate and marriage: working

Needs: People and household. Feeds: Next Steps.

How to open it: Menu > Tools and calculators > Family money; Menu > Tools and calculators > Estate and marriage.

<a id="quick_math"></a>
## Quick math and before you buy

Id: `quick_math`. Status: **unsure**.

Small calculators, Before you sign a loan, and Product X-ray.

Where it lives: Menu, Tools and calculators. Who uses it: player.

Why this status: 42 Quick math fields found by scan, controls not read (low confidence); game/tests/quick-math.js; game/tests/quick-math.js (test file); game/tests/before-you-sign.js (test file); game/tests/product-xray.js (test file).

Steps:

1. Pick a quick math card and answer it. (42 fields)
2. Check a loan before you sign. (2 fields)
3. X-ray a product. (1 field)

Parts:

- Quick math cards: unsure
- Before you sign a loan: working
- Product X-ray: working

Needs: nothing. Feeds: nothing.

How to open it: Menu > Tools and calculators > Quick math; Menu > Tools and calculators > Before you sign a loan; Menu > Tools and calculators > Product X-ray.

<a id="money_insights"></a>
## Money insights

Id: `money_insights`. Status: **unsure**.

Start at the finish line, what's in the way, levers, multipliers, people like you, your money read.

Where it lives: Menu, Tools and calculators. Who uses it: player.

Why this status: game/features/feel.js; game/features/sins.js; Not checked by hand in AUDIT.md; game/tests/which-lever-matters-most.js (test file); game/tests/multipliers-board.js (test file); game/tests/people-like-you.js (test file); game/tests/money-sins-read.js (test file); game/tests/money-sins-results.js (test file); game/tests/character-reveal-and-element.js (test file).

Steps:

1. Start at the finish line and see what's in the way. (10 fields)
2. See which lever matters most. (3 fields)
3. Look at the multipliers board. (4 fields)
4. Compare with people like you. (4 fields)
5. Get your money read. (3 fields)
6. Am I okay, strengths, roots, proofs.

Parts:

- Finish line: unsure
- Levers: working
- Multipliers: working
- People like you: working
- Money read: working
- Am I okay, element, roots, proofs: unsure

Needs: Key numbers. Feeds: Next Steps.

How to open it: Menu > Tools and calculators > Start at the finish line; Menu > Tools and calculators > What's in the way; Menu > Tools and calculators > Which lever matters most; Menu > Tools and calculators > The multipliers board; Menu > My money > You and people like you; Menu > My money > Your money read; Menu > My money > Strengths and your element; Menu > My money > Am I okay?; Menu > My money > Roots and branches; Menu > My money > Proof you kept.

<a id="spending_values"></a>
## Spending and values

Id: `spending_values`. Status: **working**.

Joy and enough, lifestyle creep, is my money going where I want, the spending plan, fork check, giving.

Where it lives: Menu, My money. Who uses it: player.

Why this status: game/tests/joy-and-enough.js; game/tests/giving.js; game/tests/money-and-values.js; game/tests/joy-and-enough.js (test file); game/tests/lifestyle-creep-and-enough.js (test file); game/tests/money-and-values.js (test file); game/tests/giving.js (test file); game/tests/spending-plan-and-audit-score.js (test file); game/tests/fork-theory.js (test file).

Steps:

1. Pick and rank what matters to you. (1 field)
2. Joy and enough. (5 fields)
3. Lifestyle creep and enough. (4 fields)
4. Plan your giving. (9 fields)
5. Conscious spending plan, money audit score, fork check.

Parts:

- Values: working
- Joy and enough: working
- Lifestyle creep: working
- Giving: working
- Spending plan, audit score, fork check: working

Needs: My Money lists. Feeds: My Goals.

How to open it: Menu > Tools and calculators > Joy and enough; Menu > Tools and calculators > Lifestyle creep and enough; Menu > My money > Is my money going where I want?; Menu > My money > Conscious Spending Plan; Menu > My money > Money audit score; Menu > My money > Fork check; Menu > My money > Giving.

<a id="admin_page"></a>
## Admin page

Id: `admin_page`. Status: **working**.

The admin sees each account, opens their game, uses account tools, card library, audit log, health and backup.

Where it lives: Admin page, Accounts. Who uses it: admin.

Why this status: R-021 (not tried against the live database); R-007; R-008; game/admin.html:56; game/tests/roles-coach-admin.js (test file); game/tests/card-library-admin.js (test file).

Steps:

1. Look at accounts: open their game, coach switch, add-ons, account tools. (8 fields)
2. Add a card to the card library. (4 fields)
3. Read the audit log and health. (2 fields)
4. Download everything as a backup. (1 field)

Parts:

- Accounts and tools: working
- Card library: working
- Audit log and health: working
- Backup: working

Needs: Account and sign-in. Feeds: Add-ons, Coach page, Card plan and vault.

How to open it: Page: Admin page; Switch hat: Admin.

<a id="testing_feedback"></a>
## Testing and feedback

Id: `testing_feedback`. Status: **working**.

Report a bug or idea, the reports inbox, test with a friend, tester drives, and What's built.

Where it lives: Menu, Admin. Who uses it: player, admin.

Why this status: R-044; R-045; game/features/fbreport.js; game/tests/report-a-bug-or-idea.js (test file); game/tests/think-aloud-tester-drives.js (test file); game/tests/with-a-friend-three-tasks.js (test file); game/tests/whats-built.js (test file).

Steps:

1. A player reports a bug or idea.
2. The admin reads the reports inbox. (1 field)
3. Test with a friend. (2 fields)
4. Tester drives: say what you are thinking. (5 fields)

Parts:

- Report a bug or idea: working
- Reports inbox: working
- Test with a friend: working
- Tester drives: working
- What's built: working

Needs: Account and sign-in. Feeds: Admin page.

How to open it: Menu > Settings and account > Report a bug or idea; Menu > Admin > Test with a friend; Menu > Admin > Tester drives; Menu > Admin > What's built.

<a id="growth"></a>
## Founding testers, sharing and demo

Id: `growth`. Status: **unfinished**.

Founding Testers, Share SLAM, What's new, and the 60-second Find your era demo.

Where it lives: Menu, Settings and account. Who uses it: player, admin.

Why this status: R-043 (database file not applied); R-046; game/features/founding.js; game/tests/founding-share-whats-new.js (test file); game/tests/find-your-era-demo.js (test file).

Steps:

1. A visitor plays the 60-second demo.
2. A player shares SLAM with a link.
3. A player reads what's new.
4. The admin sees Founding Testers: N of 50. (1 field)

Parts:

- Find your era demo: working
- Share SLAM: unfinished
- What's new: working
- Founding Testers count: unfinished

Needs: Account and sign-in. Feeds: Opening quiz.

How to open it: Menu > Settings and account > Share SLAM; Menu > Learn > What's new; Page: Find your era (60-second demo); Web address /game/era/.

<a id="coach_page"></a>
## Coach page

Id: `coach_page`. Status: **partial**.

A coach sees a roster of clients who share, writes notes, invites clients, and runs a coaching session.

Where it lives: Coach page, Roster. Who uses it: coach, admin.

Why this status: R-020 (sharing starts off unless invited); R-007; game/account/coachpage.js; game/tests/roles-coach-admin.js (test file); game/tests/coaching-session.js (test file); game/tests/coach-demo-and-results.js (test file).

Steps:

1. Find, sort and move clients through the pipeline. (3 fields)
2. Open a client card, add a note, invite by email, export. (4 fields)
3. Run a coaching session from the game menu.

Parts:

- Roster and client cards: working
- Search, sort and pipeline: working
- Coaching session: working
- Share with my coach on by default: partial

Needs: Account and sign-in. Feeds: Live Session mode.

How to open it: Page: Coach page; Menu > Coach > Coaching session; Switch hat: Coach.

<a id="live_session"></a>
## Live Session mode

Id: `live_session`. Status: **unfinished**.

A coaching call that fills the client's profile live, then a review and an AI pass after the call.

Where it lives: Live Session, Session page: invite and sign-up. Who uses it: coach, player. Turned on by: LIVE_SESSION_READY switch (game/account/liveflag.js).

Why this status: R-042 (LIVE_SESSION_READY is false; page says Coming soon; database file not applied); game/account/liveflag.js:18; game/tests/live-screens.js (test file); game/tests/live-session-invite.js (test file); game/tests/live-review.js (test file); game/tests/live-ai-pass.js (test file); game/tests/live-session-rules.js (test file).

Steps:

1. The coach starts a live session card. (2 fields)
2. The client opens the invite and signs up. (5 fields)
3. Review the numbers heard on the call. (3 fields)
4. After the call: drop in the recording text. (2 fields)

Parts:

- Live Session card: unfinished
- Invite and sign-up: unfinished
- Review: unfinished
- After the call AI pass: unfinished

Needs: Coach page, Account and sign-in. Feeds: My Money lists, Key numbers.

How to open it: Page: Live Session page; game/session.html.

<a id="addons"></a>
## Add-ons

Id: `addons`. Status: **unsure**.

Sealed add-on packs that the admin turns on for one person; Demo mode hides them.

Where it lives: Home, A row on Home. Who uses it: player, admin. Turned on by: addon:x1, addon:x2 (admin switch per account).

Why this status: R-008 (cannot be run here: the add-ons are sealed); R-057; game/account/gate.js:18; game/tests/addon-sealed-files.js (test file).

Steps:

1. The admin turns an add-on on for one account.
2. The player sees a one-time row on Home and says yes. (1 field)

Parts:

- One-time yes row: unsure
- Demo mode hides add-ons: working

Needs: Admin page, Account and sign-in. Feeds: nothing.

How to open it: Admin page: add-on switch on an account.

## Fields with no module

None. Every field has a module.
