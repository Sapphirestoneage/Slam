# Question rewrites (run 16, section C, Nov 27 2026)

Every onboarding and quiz question of SLAM the Game, old wording next to new wording.

The test for each question: a third-grader can read it. One thing per question. No jargon, or the jargon is explained
in the line under the choices (the demo page puts that line behind its "i"). A concrete example in the question where
one helps.

Two things are the same on every question in this table:

- The last choice is **I'm not sure**. It counts as a Guess. Where the game has a typical value it uses that value,
  marked Guess. Where it has none it keeps nothing: the question stays open, or the stock number of the profile stays a
  Guess. It took the place of "No idea, use typical", "I don't know", "Not sure", "Skip", "Skip for now" and "Skip,
  keep a guess". It is one phrase in the code (`NOT_SURE` in `game/core/engine.js`).
- The helper line under the choices is **Tap one to keep going.** (`TAP_ONE` in `game/core/engine.js`).

The values that the game keeps did not change, so no saved game changes. Where a choice has new words, the old words
are still the kept value, and the screen shows the new words.

Scope: the demo "Find your era", What you want, the four range questions, the ways of What it could be, and every page
of setup (About you and the five rounds). Not in this pass: the Yearly Review, the skills quizzes, Make your numbers
real, Key numbers, and the big data files.

Count: 49 questions. 39 have new words (the question, its help line or its choices), 10 kept their words. All 49 got
"I'm not sure" and the helper line.

## The demo "Find your era" (`game/features/erain.js`, shown by `game/era/era.js`)

| # | Old | New | What "I'm not sure" does |
|---|-----|-----|--------------------------|
| 1 | How old are you? | No change | Keeps nothing. The question waits: "Your age is the one answer this needs. Your best guess is fine." |
| 2 | About how much do you spend in a month? | How much money do you spend in one month? | The typical amount for your age, a Guess |
| 3 | If money stopped coming in, how long could your cash cover your bills? | If your pay stopped today, how long could you pay your bills? | Keeps nothing |
| 4 | Do you owe on any of these? | Do you owe money on any of these? | Keeps nothing |
| 5 | About how much do you have invested? | How much money do you have in investments? | The typical amount for your age, a Guess |
| 6 | About how much do you save or invest in a month? | How much money do you put away each month? | The typical amount for your age, a Guess |
| 7 | How full are your tax-friendly accounts each year? Choices: All of them are full, I put in some, Not yet | Do you put the max into your 401(k) or IRA each year? Choices: Yes, the max, Some, Not yet, I'm not sure | Keeps nothing |

The helper line was "A rough answer is fine. One tap goes on." It is "Tap one to keep going." now.

## What you want (`game/features/wants.js`)

| # | Old | New | What "I'm not sure" does |
|---|-----|-----|--------------------------|
| 8 | What do you want? Help: "Tap all that fit. There is no order yet, and you can change them later." Button: Skip for now | What do you want? Help: "Tap each one you want. You can change them later." Button: I'm not sure | Keeps no pick, and goes on |

## The four range questions (`game/features/couldbe.js`, `CB_QS`)

The demo uses these same four, so each has one wording in both places.

| # | Old | New | What "I'm not sure" does |
|---|-----|-----|--------------------------|
| 9 | How old are you? Help: A range is fine. | How old are you? Help: Pick the group your age is in. | Keeps nothing. The question waits, with one line of help |
| 10 | About how much do you spend in a month? Help: Everything that goes out: rent, food, bills, fun. A rough range is fine. | How much money do you spend in one month? Help: Count it all: rent, food, bills and fun. Your best guess is fine. | The typical amount for your age, a Guess (was the chip "No idea, use typical") |
| 11 | About how much do you have invested? Help: Retirement accounts and other investments together. Not your checking or savings. | How much money do you have in investments? Help: Investments are money in a 401(k), an IRA, or stocks and funds. Do not count checking or savings. | The typical amount for your age, a Guess |
| 12 | About how much do you save or invest in a month? Help: What is left after spending and goes into savings or investments. | How much money do you put away each month? Help: Count money you move into savings, a 401(k), an IRA or other investments. | The typical amount for your age, a Guess |

## The ways of What it could be

Each way keeps its three choices (Count this, Already doing it, Not for me) and gets a fourth: I'm not sure. It keeps
nothing and goes to the next screen. The way stays open on the list of the ways.

| # | Old | New | File |
|---|-----|-----|------|
| 13 | Spending eases as you age. Which shape? | Spending eases as you age. How much less will you spend when you are older? | `game/features/couldbe.js` |
| 14 | Social Security pays part of it. How much of it? | Social Security pays part of it. How much of your Social Security should the plan count? | `game/features/couldbe.js` |
| 15 | Pay less tax on the way out | No change | `game/features/cbtax.js` |
| 16 | Bend your spending when markets fall | No change | `game/features/cbflex.js` |
| 17 | Money that shows up later | No change | `game/features/cblater.js` |
| 18 | One move of the stack (Count this, Already doing it, Not for me) | No change | `game/features/cbmoves.js` |
| 19 | What would a plan of your own cost a month? | No change. I'm not sure goes back to the typical plan, a Guess | `game/features/couldbe.js` |

## Setup, About you (`game/screens/smart.js`)

For these, "I'm not sure" lets the game use the most likely answer for what you said so far. The screen says so:
"Not sure is fine. For now the game uses ..., as a Guess. Tap your own answer any time." The profile keeps the names of
those answers, so "Change my answers" shows them open again.

| # | Old | New |
|---|-----|-----|
| 20 | How old are you? | No change. I'm not sure keeps nothing, and the page says why it waits |
| 21 | Exactly how old? You picked your 30s. | What is your exact age? You picked your 30s. |
| 22 | What's your work right now? | What is your work right now? |
| 23 | What money comes in? Tap all that fit. | Where does your money come from? Tap each one that fits. |
| 24 | Is your money about the same each month, or does it move around? Choices: Steady, Changes month to month | Is your pay about the same each month? Choices: Yes, about the same, No, it changes |
| 25 | Where do you live? Choices: I rent, I own, No cost | Do you rent or own your home? Choices: I rent, I own, I live for free, with family for example |
| 26 | Who lives there with you? | Who lives with you? |
| 27 | How many roommates? Last choice: Skip | How many roommates live with you? Last choice: I'm not sure |
| 28 | How many kids? Last choice: Skip | How many kids do you have? Last choice: I'm not sure |
| 29 | Relationship | Are you in a relationship? |
| 30 | Does anyone rely on you for money? Choices: None, Planning, Kids, Supporting a parent, Pets | Do you pay for anyone else, like a kid or a parent? Choices: No one, Not yet, but I plan to, Kids, A parent, Pets |
| 31 | Do you combine money with anyone? | Do you share your money with anyone, like a joint bank account? |
| 32 | When you think about your money, what's closest? Button: Skip | How do you feel when you think about money? Chip: I'm not sure (keeps nothing) |

## Setup, round D: Debts (`game/screens/smart.js`, `game/features/amounts.js`)

| # | Old | New |
|---|-----|-----|
| 33 | What you owe. "Tap every kind you have. No amounts. If you have none, just tap Next." | What you owe. "Tap each kind of debt you have. No amounts. If you have none, tap Next." Button: I'm not sure (goes on, keeps nothing more) |
| 34 | How many credit cards do you have? | No change |
| 35 | How many carry a balance month to month? | On how many cards do you still owe money after you pay each month? |
| 36 | How many student loans do you have? | No change. I'm not sure: one line for all of them |
| 37 | Which bank is it from? Last choice: Skip | Which bank gave you this card? Last choice: I'm not sure |
| 38 | About how much is left to pay back? Button: Skip, keep a guess | How much do you still owe on it? Button: I'm not sure |
| 39 | What's the interest rate (APR)? Last choice: I don't know | What interest rate does it charge each year? Help: Interest is what the lender charges you to borrow. Your app or statement shows the yearly rate as APR. Last choice: I'm not sure |
| 40 | When does the 0% end? Last choice: Not sure | In what month does the 0% deal end? Last choice: I'm not sure |

## Setup, round A: Assets

| # | Old | New |
|---|-----|-----|
| 41 | Where your money lives. "Tap every kind of account you have. If none, just tap Next." | Where your money lives. "Tap each kind of account you have. If you have none, tap Next." Button: I'm not sure |
| 42 | About how much is in it today? | How much money is in it today? |
| 43 | Where did your 401(k) or work plan go? | Where did you move the money from your 401(k) or work plan? |
| 44 | A $1,000 surprise bill lands today. Could you pay it without borrowing? | A surprise $1,000 bill comes today. Could you pay it with your own money? |
| 45 | If money stopped coming in, how long could you cover your bills? | If your pay stopped today, how long could you pay your bills? |
| 46 | Do you put money into investments? | Do you put money into investments, like a 401(k) or stocks? |

For 44 to 46, "I'm not sure" keeps nothing: the cushion of the profile stays the stock Guess.

## Setup, round I: Income

| # | Old | New |
|---|-----|-----|
| 47 | How often does it come in? | How often do you get this money? (the same words on the income row of My Money) |
| 48 | About how much lands a week? Help: What lands in your account, after taxes. | How much do you get a week? Help: Count what comes into your account, after taxes. |

## Setup, round T: Taxes

| # | Old | New |
|---|-----|-----|
| 49 | About how much of your pay goes to taxes before it lands? Last choice: I don't know | How much of your pay goes to taxes? Help: Look at a pay stub. The top number is your pay. The bottom number is what you get. Your best guess is fine. Last choice: I'm not sure |
| 50 | Does your job add money when you save for retirement (a match)? Choices: Yes, and I get all of it, Yes, but not all of it, My job has no match, I don't know | Does your job add free money to your retirement plan? Help: This is called a match: you put money in the plan at work, and your job adds some too. Choices: Yes, and I get all of it, Yes, but not all of it, No, my job does not do that, I'm not sure |
| 51 | Do you put money into a tax-friendly account, like a 401(k), an IRA or an HSA? Choices: Yes, the most I'm allowed, Yes, some, Not this year, I don't know | Do you put the max into your 401(k) or IRA each year? Choices: Yes, the max, Some, Not yet, I'm not sure (the same words as question 7 of the demo) |

## Setup, round E: Expenses

| # | Old | New |
|---|-----|-----|
| 52 | Each spending group (Home, Food, Getting around, and the rest): its lines with range chips, then "That's all for Home" | No change of the words. A second button: I'm not sure. The lines with no answer keep the typical amount, a Guess |
| 53 | Should the game count Social Security in your plan? Choices: Yes, at three quarters, to be careful, Yes, in full, No, leave it out. Button: Skip | Should your plan count on Social Security? Help: Social Security is money the government pays you each month when you are older. Choices: Yes, but only 3/4 of it, to be safe, Yes, all of it, No, leave it out, I'm not sure |
| 54 | A name for your character (optional) | No change. It is a box to type in, with no choices, so it has no "I'm not sure" |

## Notes

- The numbers 1 to 54 are rows of this table. Rows 9 to 12 are the same four questions as rows 1, 2, 5 and 6, and row
  54 is not a question with choices. That leaves the 49 questions of the count above.
- The page titles of setup ("What you owe", "Where your money lives", "Your cushion") did not change.
- `game/registry/` (the audit of Nov 27) lists these questions with their old words. It is a dated snapshot and was not
  changed.
