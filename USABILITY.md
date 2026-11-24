# Think-aloud test of SLAM the Game (2026-11-24)

Method: Steve Krug, Rocket Surgery Made Easy. Three users, three tasks each, at phone width (390). The users are
invented personas, walked in Chromium by a script that taps what the persona would tap (`tools/game_clicks.cjs` for
task 1; the same walk plus the two other tasks for the rest). The "thoughts" are a simulation: they are what each
screen would make that persona say, written from the screens the walk recorded. A test with real people is still
worth an hour (`Test with a friend` in the menu records it).

The users:
- Brandon: simple, wants it easy. First job, steady pay, rents with roommates, one credit card.
- Jacob: lives with parents at no cost, gig income that changes, between jobs, a student loan and a card.
- A FIRE-community user: established, steady pay, owns a home with a partner, invests each month, a mortgage.

The tasks:
1. Finish setup and see a plan.
2. Log a debt payment.
3. Check if it is safe to spend $200.

## Round 1

### Task 1: finish setup and see a plan

| User | Clicks | Result | Thinking aloud |
|------|-------:|--------|----------------|
| Brandon | 23 | Done | "Age, okay, taps. 'A $1,000 surprise bill', yes. It keeps picking the answer I was going to pick, nice. Wait, it never asked how much I make? ... Oh, 'See my first plan'. 'Where you are strong: 2 months of cushion (Guess)'. I did not tell it that. Okay, it says it is a guess. Fire? Sure. 'Which do you want to improve most': cushion. Now Home says 'Play the 2-minute picture'. Play what?" |
| Jacob | 25 | Done | "Between jobs, yes. 'Where does your money come from': gigs and help from family, both there, good. 'No cost' for home, that is me. It did not ask about a retirement plan at work. Good, I do not have one. Water element: 'weak to drift, months with no plan'. Ouch, fair. Free to spend: $0, 'tight right now'. Yeah." |
| FIRE user | 23 | Done | "No numbers at all? I have the numbers. ... Fine. 'Years of spending invested: 0.1 (Guess)'. That is wrong by a lot, but it says Guess and 'Not really' gives me 'Make my numbers real'. Good. I want my savings rate and my FI date on the first screen." |

### Task 2: log a debt payment

| User | Result | Thinking aloud |
|------|--------|----------------|
| Brandon | Stuck once | "+ Log. 'I paid a debt'. It already knows which debt. $100. 'Log it' is glowing, tap. ... 'Tap an answer in each row first.' Which row? I do not see a row. Oh, there is a 'Next: Paid from' button." |
| Jacob | Stuck once | The same stop. "It told me to log it and then told me off." |
| FIRE user | Stuck once | The same stop. "The primary button should not be live before the form is complete." |

### Task 3: is it safe to spend $200?

| User | Result | Thinking aloud |
|------|--------|----------------|
| Brandon | Slow | "'Safe to spend?' is right at the top, good. $20, $50, $100, $250 ... no $200. 'Type an amount'. Fine. 2, 0, 0." |
| Jacob | Done, with a jolt | "It would go on a card or a loan. The box is red. I thought this game did not do red." |
| FIRE user | Done | "'Yes.' Good. Show the math, good." |

## Triage

Krug's rule: fix the few worst things, with the smallest change that works.

| # | Issue | Who hit it | How bad | Fix |
|---|-------|-----------|---------|-----|
| 1 | Log a debt payment: the question "Paid from" is folded shut while "Log it" pulses, so the first tap gives an error. | All three | High: a stop on a core task | Fixed. A sheet with two or more questions now opens on the first question with no answer. In the log, the first chip of the open question pulses, and "Log it" pulses only when each row has an answer. |
| 2 | Safe to spend has no $200, and the log has no $250: two lists for the same thing. | Brandon | Medium | Fixed. Safe to spend uses $20, $50, $100, $200, $500, $1,000, the same list as the log. |
| 3 | The "it costs something real" answer has a red lamp and a red border, and the "go, with a trade" answer is yellow. The house rule is no red. | Jacob | Medium | Fixed. The two states use the sapphire of the theme and white. The words carry the meaning. |
| 4 | Next Steps opened on the mission board ("Story mission", "Heists"). The list by Today and This week was far down the page. | All three | Medium | Fixed earlier in this run. The time view is first, and the board uses plain words unless the gamer switch is on. |
| 5 | After setup, the card said "Your character is ready" and nothing about the person. | All three | Medium | Fixed earlier in this run: the reveal. |
| 6 | Home's first action for a new player is "Play the 2-minute picture". "Play" does not say what happens. | Brandon | Low | Not fixed. A wording choice for the owner (QUESTIONS.md). |
| 7 | A user who knows their numbers cannot give them in setup. The first numbers on screen are guesses. | FIRE user | Low: by design, and each guess says Guess | Not fixed. The reveal's "Not really" now leads to "Make my numbers real". |
| 8 | "Where am I" shows two times on Home (top bar and the Continue block). | By eye | Low | Not fixed. |

## Round 2 (after the fixes)

| Task | Brandon | Jacob | FIRE user |
|------|---------|-------|-----------|
| 1. Setup to a plan | 22 clicks, no stop | 25 clicks, no stop | 23 clicks, no stop |
| 2. Log a debt payment | 5 taps (+ Log, I paid a debt, Checking, $100, Log it), no stop. "It showed me 'Paid from' with Checking glowing. Then the amount. Then it said I owe $100 less and my cash is $100 lower. And an Undo." | The same 5 taps | The same 5 taps |
| 3. Safe to spend $200 | 2 taps. "Yes." | 2 taps. "You can, but it would go on a card or a loan. Or keep it to $140 and it's a yes today." No red. | 2 taps. "Yes." |

Page errors in all walks: 0. Records in the game's error log: 0.

Click counts for the two extreme personas of `tools/game_clicks.cjs`: speedrun 17 clicks to the end of setup and 22
to the first plan; the most complex persona 28 and 33.
