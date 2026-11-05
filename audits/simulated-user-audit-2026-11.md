# SLAM simulated user audit and expert panel (November 2026)

Read-only audit of SLAM as it stands at commit 442ce65 (Nov 5 2026). Twenty-three simulated personas walked the coaching flow from session 1 intake onward, their numbers were run through the real math (js/math, js/plan.js, the FOO, cash layers, the Scorecard and the Picture), and the findings were reviewed through sixteen expert lenses. This is a heuristic simulation, not user research. Every finding carries a confidence label:

- seen in code: reproduced by running the app's own math on a persona household, or read directly in the source
- likely: follows from the code and the copy, not reproduced end to end
- speculative: a judgment about how a person would feel

No real client numbers appear here. Every persona and every household is made up. Numbers quoted in the persona blocks come from running those made-up households through the app's own functions on Nov 5 2026.

How the app was learned: spec/csv (Start here, Screens, Navigation, Math, Program, Rules summary, Demo client, DMMT check, Roadmap), PROGRESS.md, QUESTIONS.md 122 to 147, SPEC-DRIFT.md, the registries (fields, math, assumptions, foo, program, scorecard), the math modules, the UI copy, the demo client in a headless Chromium (Playwright was already installed; 25 screenshots at 1280 and 390 wide), and nine persona households built with the real Store and run through metrics, foo, layersOf, scorecardOf, pictureOf and fiTargets. The test suite was run once: 239 pass, 0 fail, 12 skip (ExcelJS and LibreOffice absent).

## What exists today (the real flows)

Built and reachable:
- Discovery form (Coach tools › Discovery): name, take-home, rent, total debt, savings, goal, why now. Send to client file makes the client with each number marked Roughly.
- Session 1 intake on Home: Start session, the 12-node program path, the agenda (Must do ticks itself from the numbers), About you (why now, biggest worry, goal in their words, the gates hub: car, kids, pets, housing, work, HSA, FSA, equity, solo or couple), the Picture % with pace, Next small things, Money in one line (net worth, surplus, savings rate, FI date), the payday card.
- Fast Track: eight questions in about five minutes, totals by area, written into the same records.
- Adding accounts: Net worth › Assets (cash, investments with allocation and holdings, home or car with its loan), Debt and Credit cards (minimum, custom, in full, promo, payday fee as an APR, PSLF), Protection (coverage rows, deductibles, premiums, cash layers behind a caret).
- Cash flow: Income (take-home or gross, the other solved; 401(k) and match; variable income block with lowest and typical month and a tax set-aside), Taxes (federal, FICA, NY and NYC only; quarterly estimates paid; SE tax), Budget (two passes: Plan and Actual; starter lines as guesses; gut number vs lines; DRAFTT letters; who covers it; From Debt lines), Calendar (paychecks, bills, running balance, low line, drag to move), Month end (three-step close with statements).
- Plan: Goals (FI age, presets, Big deals, the FI ladder, milestones with dates), FOO (SLAM's own 0b to 9 with locks and Unlock anyway), Scorecard (eleven areas, holes ranked by payoff over effort), Timeline (save-more slider, Shockingly Simple Math curve), Debt payoff (avalanche, snowball, stress), Next 12 months (events, sinking funds, taking over).
- Report: Overview (rings, Sankey, metrics shelf), Statements (three statements with a tie-out), One-pager (Export PDF, Open in a spreadsheet, Bring a spreadsheet back, Send summary), History (snapshots, Day 0 vs now).
- Sessions 2 to 12: Real numbers, Lock it, Goals, Full analysis, three hole sessions, Revisit, two more hole or next-chapter sessions, Graduation; the review gate on End session; homework with To do, Client says done, Confirmed.
- The $ / Hours / FI days view on every number; Client view; export and import; undo everywhere.

Spec only, not built (SPEC-DRIFT.md and the Roadmap):
- Budget passes Gut › Basics › Rough › Estimate › Actual as five passes: collapsed to Plan and Actual in the polish pass (Rough lines keep a status; Basics totals sit behind "Fast Track totals").
- Scenarios tab (home, car, kid, job change, sabbatical, move, marriage, side hustle, inheritance): a placeholder screen. Phase 5.
- Social Security, itemized deductions, pension, expected inheritance, go-go and slow-go phases, True FI as a full model, happiness rating per line, need or want tag, Money Mirror quiz: parked or Later.
- Client-side app, pre-call link, client logging between sessions, comments: phase 6. Bank connection and paystub readers: phase 8.
- State tax outside New York: not in the math.

## 1. TL;DR: the ten most important findings

1. "Couple" means "married and pooled" everywhere in the math: unmarried partners with separate money get the partner's whole income counted against only their own share of the bills (a 62% savings rate for a household that is really at about 35%), and are taxed as Married filing jointly by default. Seen in code. Hits 5 personas.
2. Every income row is taxed as if it were the only one, each with a full standard deduction, so two-earner couples and job-plus-side-hustle people see take-home overstated by about 4 to 6% (about $8,800 a year on $210,000 joint). Seen in code and reproduced.
3. The FI number silently assumes today's spending lasts forever: tuition, childcare, a surgery fund, gender-affirming care and debt payments inside the gut number all inflate the FI number by 30 to 100%; the "Spending in retirement" override exists but is buried. Seen in code. Hits 8 personas.
4. Quiet Quitting FI computes to $0 for almost anyone under 35, so any young person with a 401(k) and no milestone gets the flag "You are putting in more than Quiet Quitting FI needs". Coast FI defaults to age 65 unless an FI age is typed. Seen in code and reproduced.
5. Giving is locked behind a maxed Roth IRA and no heavy debt with the copy "Oxygen mask on you first", and a line named Tzedakah does not count toward the Give step at all. For the Jewish personas this reads as the app overruling an obligation. Seen in code.
6. Irregular and cash income is cosmetic in the headline: the "safe monthly budget" (M16) only shows on the Income screen; surplus, savings rate and the FI date use whatever single number was typed, the tax set-aside is a flat 25%, and state tax exists only for New York. Seen in code. Hits 6 personas.
7. People in deficit get nothing to do: with a negative surplus every FOO date disappears, the Scorecard shows six or seven Holes at once (Investing: Hole with a $0 payoff), and no screen says "cut this first". Seen in code. These are the highest-stress personas and they score lowest.
8. FOO step 8 "Fund the future" shows Done for every household that has no sinking funds, and a business loan at 11% is "heavy debt" to clear before anything else. Seen in code.
9. At Low confidence the FI range is useless ("2051 to 2090, about 25 to 64 years from now" for a 23-year-old), and the Scorecard calls an emergency fund Strong at 3 months while the FOO says $24,000 is still missing. Seen in code.
10. The real edge is real: integer-honest math with Show the math on every number, the $ / Hours / FI days view, the Picture % with pace, the FOO with projected dates, the three statements that tie out, and Open in a spreadsheet. No persona's current tool does these. But the edge only shows after session 2; session 1 is still a long form.

## 2. Scoreboard (lowest score first)

| # | Persona | Segment | Now | After fixes | Single biggest issue |
|---|---|---|---|---|---|
| 10 | Keisha Monroe, 27, payday loan and cards | Negative net worth | 3 | 7 | Deficit freezes every date; seven Holes and no "cut this first" |
| 11 | Rob Delgado, 44, back taxes and cards | Negative net worth | 3 | 6 | Tax debt has no payment-plan model; FI number counts child support forever |
| 4 | Shmuel and Rivky Gold, 36, frum, 5 kids | Jewish | 3 | 7 | Giving locked with "Oxygen mask" copy; tuition inflates FI number to $3.06M |
| 7 | Sam Okafor, 30, unmarried partner, separate money | Queer | 3 | 7 | Partner income counted in full against Sam's own share of bills; taxed as married |
| 17 | Luis Herrera, 38, rideshare and delivery | Irregular income | 3 | 6 | Lumpy income typed as one number; gas and car are both income cost and spending |
| 18 | Dominique Laurent, 35, pro domme, cash | Irregular income | 3 | 6 | No neutral income type, no privacy framing, no retirement path without a W-2 |
| 22 | Alexis Gillmore, 44, drag queen and club owner | Reference user | 3 | 7 | Club loan at 11% is "heavy debt" with a 2039 date; feels like homework by minute 10 |
| 9 | Ash Nguyen, 26, trans, single, surgery fund | Queer | 4 | 7 | Surgery fund has no home except a sinking fund; FI number counts care forever |
| 12 | Jenna Park, 35, nurse, cards after a medical year | Negative net worth | 4 | 7 | Medical debt and BNPL get no APR guess; Scorecard piles on |
| 15 | Ethan Cho, 22, barista and student | Gen Z | 4 | 6 | Student status still asks for FI age, retirement, protection |
| 16 | Nova Reyes, 31, creator, 1099 | Irregular income | 4 | 7 | Safe budget is display only; 25% set-aside and no state tax |
| 19 | Aiden and Bex, dating, moving in | Couples | 4 | 7 | One client file per household forces a "couple" they are not yet |
| 1 | Priya Natarajan, 38, FIRE spreadsheet owner | FIRE | 5 | 8 | Four fixed return presets; no way to bring her own assumptions in |
| 3 | Dana Whitfield, 45, one-more-year | FIRE | 5 | 7 | No decumulation, healthcare or Social Security; FI number is a single point |
| 5 | Leah Friedman, 29, engaged, aliyah in 3 years | Jewish | 5 | 7 | No scenario for a move abroad; wedding and aliyah compete with Roth in the FOO |
| 6 | David Kaplan, 52, two weddings coming | Jewish | 5 | 7 | Simcha spending and 5% tzedakah have no place in the order |
| 13 | Malik Johnson, 23, PSLF, roommates | Gen Z | 5 | 8 | FI range 2051 to 2090; QQ FI flag |
| 20 | Noor and Chris, engaged, merging | Couples | 5 | 8 | Two incomes taxed separately; no "merge" walkthrough |
| 2 | Marcus Bell, 32, Coast FI curious | FIRE | 6 | 8 | Coast FI is to age 65 by default; Roth step assumes an account he has not opened |
| 8 | Teo Alvarez, 41, married, chosen family support | Queer | 6 | 8 | Support sent to chosen family has no category and no place in the FOO |
| 14 | Sofia Reyes, 24, living with parents | Gen Z | 6 | 8 | Housing % and runway have no meaning when rent is $0; QQ FI flag |
| 21 | Grace and Tomás, married 10 years | Couples | 6 | 8 | Two W-2s taxed as two households; childcare counted forever |
| 23 | Tom Hutchinson, 47, CPA | Reference user | 6 | 8 | Wants the state tax line and the two-earner fix before he trusts the rest |

Average now 4.4; after the five changes per persona, 7.1.

## 3. Ranked fix list (across everyone)

Rank = total score lift divided by effort (S=1, M=2, L=4). Personas hit counts a persona who stalled, guessed, or was shown a wrong number because of it.

| Rank | Finding | Personas hit | Segments | Panel backing | Total lift | Severity | Effort | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | Deficit mode: when surplus is negative, show "You spend $X more than comes in", rank the cheapest cuts (variable lines, subscriptions, the card interest), give the FOO a step 0 "Stop the deficit" with a date, and hide the Scorecard pile-up | 6 | Negative NW, Jewish, Gen Z, Irregular | Money Guy, Mindy, Evan (role), Alexis | 9 | blocker | M | seen in code |
| 2 | Unmarried or separate-money couples: ask "married for taxes?" apart from "couple"; when money is Separate, count only the client's own income against their own share, or count both incomes and whole bills | 5 | Queer, Couples | Jessica Goedtel, Lindsey Swanson, Tom | 7 | blocker | M | seen in code |
| 3 | Tax the household once, not per row: sum W-2 rows (and spouse rows) before brackets and the standard deduction; a second job gets no second deduction | 9 | FIRE, Jewish, Queer, Couples, Irregular, Reference | Tom, Daisy (role), Money Guy | 6 | blocker | M | seen in code |
| 4 | Retirement spending: when any line is tagged kids, tuition, childcare, debt payment, care or a sinking fund, show the FI number with and without it, and put "Spending in retirement" one tap from the FI card | 8 | Jewish, Queer, Couples, Negative NW, Reference | Housel, ChooseFI, Money Guy | 6 | friction | S | seen in code |
| 5 | Quiet Quitting FI: show "already past it" instead of $0, and only raise the "more than QQ needs" flag past 35 with heavy debt gone and big e full; Coast FI card says "to age 65" in its label when no FI age is set | 6 | Gen Z, Queer, FIRE | Mr. Money Mustache, ChooseFI, Tom | 5 | friction | S | seen in code |
| 6 | Variable income feeds the headline: when Income stability is Varies or Unpredictable, use the M16 safe budget as take-home for surplus, savings rate and the calendar, with the typical month as a second line | 6 | Irregular, Queer, Reference | Lindsey, Jessica, MelRose (role), Daisy (role), Alan Donegan | 6 | blocker | M | seen in code |
| 7 | Giving: let a client mark giving as an obligation (maaser, tithe, zakat, chosen-family support) that sits inside spending at step 0, never locked; detect tzedakah, maaser, zakat and tithe line names; drop "Oxygen mask on you first" | 5 | Jewish, Queer | Mindy, Housel, Gary Vee, the frum personas | 5 | friction | S | seen in code |
| 8 | FOO step 8 reads Done when it is empty; show "Nothing here yet" and never count an empty step as done | 23 | all | Tom | 2 | polish | S | seen in code |
| 9 | Business and tax debt are not consumer debt: a Business loan at 11% belongs in the income conversation, Tax debt needs an IRS plan field and goes to step 1 | 4 | Reference, Negative NW, Irregular | Hormozi, Donegan, Daisy (role) | 4 | friction | M | seen in code |
| 10 | Session 1 in under 10 minutes: Discovery plus Fast Track is the whole first session; About you's 13 core fields and the 4-item checklist wait for session 2 | 12 | Negative NW, Irregular, Gen Z, Reference | Alexis, Gary Vee, Mindy | 8 | friction | M | likely |
| 11 | Low-confidence FI range: cap the range at 10 years and say "roughly the 2050s" or hide the date until Medium | 5 | Gen Z, Irregular, Couples | Housel, Tom | 3 | polish | S | seen in code |
| 12 | Scorecard and FOO agree on the emergency fund: one target (the Rule of 5 layers), and "Not rated yet" rows collapse into one line | 7 | all | Money Guy, Tom | 3 | polish | S | seen in code |
| 13 | A Student, Between jobs or Retired work situation hides FI age, Roth step, Prepay retirement and Protection until they apply | 3 | Gen Z, Negative NW | Scott Galloway, Evan (role) | 3 | friction | S | likely |
| 14 | Privacy and neutral income: an income type "Cash or platform" with no employer fields, a "what it is called on the 1099" note, and the client view hiding income names | 3 | Irregular | Alexandra Snow (role), Mx Tomie (role), MelRose, Daisy, Lindsey, Jessica | 4 | friction | S | likely |
| 15 | Bring your own assumptions: typed real return and withdrawal rate (not only four presets), and Bring a spreadsheet back accepting their assumption cells | 3 | FIRE, Reference | Priya, Tom, Mr. Money Mustache | 3 | friction | S | seen in code |
| 16 | A scenario block for the three asks that came up most: a move abroad, a surgery or big medical cost, a baby | 6 | Jewish, Queer, Couples, FIRE | Housel, Money Guy | 5 | friction | L | spec only |
| 17 | Community presets become a visible "Your community" picker on About you (Jewish, with Shabbat weekly, yom tov, Pesach, tuition, simcha, maaser; a Muslim set with zakat; a chosen-family set), not a collapsed Budget caret | 4 | Jewish, Queer | Mindy, Housel | 3 | friction | M | likely |
| 18 | Chosen family and support: "Money sent to family" becomes "Money sent to people you support", with a who and an until; backups ask "people who could help" not "family help" | 4 | Queer, Jewish | Jessica, Lindsey | 2 | polish | S | likely |
| 19 | Two files, one couple: a dating or engaged pair can run two client files and a shared view, with merge later | 3 | Couples | Scott Trench, Money Guy | 3 | friction | L | likely |
| 20 | Decumulation basics: healthcare before Medicare and Social Security as a line on the FI card for anyone over 45 | 3 | FIRE, Reference | Money Guy, Dana | 3 | friction | L | spec only |

## 4. SLAM's unique edge

Per segment, what SLAM does that the tool they use today does not. "Nothing yet" where honest.

- FIRE: Show the math on every number and Open in a spreadsheet with a Check column beat ProjectionLab's black box; the FOO with dates, Quiet Quitting FI and the SPARKS launch window are ideas their spreadsheet does not have. No edge yet on assumptions (four presets), decumulation, Social Security or healthcare, where ProjectionLab wins.
- Jewish: nothing yet. Maaser on gross or take-home, yom tov and Pesach lines and the kosher note exist, but they are hidden under a collapsed "Community presets" caret and giving is locked. Once giving is treated as an obligation and tuition as a time-limited cost, SLAM would be the only tool with a frum household model.
- Queer: the $ / Hours / FI days view and the From Debt and "who covers it" wiring are things Monarch and Rocket Money do not do, and "Partner first name" and "Solo or couple" are already neutral. No edge yet for unmarried partners because the math treats them as married.
- Negative net worth: the calendar with a running balance and a low line, the payday card ("$2,370 is free to spend"), the payday fee as an APR, little e as the first step, Stress as a payoff order. That is a real edge over Credit Karma and a notes app. Lost today because a deficit freezes the dates and the Scorecard piles on.
- Gen Z: the Picture % with pace and Next small things (+3%), the Shockingly Simple Math dot, FI days on every purchase. Nothing in Chime, Fidelity or TikTok does this. The edge is dulled by the QQ FI flag and the 40-year FI range.
- Irregular and cash income: lowest-month safe budget, the tax set-aside line, quarterly estimates paid, Income stability widening the Rule of 5, backups of the backups. Nothing yet in the headline, because those numbers do not feed it.
- Couples: who covers it, split by, your share or the whole bill, taking over a bill on a date, a partner's own birth year. More than Splitwise or shared Monarch. No edge yet for merging (one file, married taxes assumed).
- Reference users: Alexis gets undo on everything, Fast Track, and numbers in hours of her time; Tom gets the statements that tie out and the workbook with live formulas. Nothing like that in either of their tools.

## 5. Latent needs (deduped)

- "What would I have to cut, and in what order, to get to zero?" ranked by pain per dollar (variable lines, then subscriptions, then card interest). Asked for by nobody; needed by six.
- A number that says what today's purchase costs in days of freedom, on the receipt, not only on the toggle. Four personas would use FI days daily if it were on a phone.
- "Your bills this week" as a text or a card on a phone between sessions (phase 6, but the calendar already knows).
- One "obligations" bucket that holds maaser, tithe, child support, support to chosen family and alimony, counted first and never judged.
- The payoff date on a card debt shown as "the month this stops" on the calendar, with a win marker, not only on Plan.
- "If I lost the job tomorrow" as one button: runway, backups, unemployment, the first bill at risk.
- A Day 0 photo of the numbers they can look back at in session 9; it exists, nobody would ask for it, everybody would love it.
- Taxes as a set-aside account on the calendar for 1099 people, with quarterly due dates as markers.
- For couples: "what changes if we marry" as a comparison (taxes, Roth limit, HSA, insurance).
- For families: tuition and childcare as costs with an end date, so the FI number drops on its own as kids age out.

## 6. Less is more

- Hide the Scorecard until session 5. In session 1 to 3 it shows three Holes and five "Not rated yet" rows that read as a report card for a stranger. For all 23.
- Collapse the "Not rated yet" rows into one line with a count. For all.
- Step 0b Bedazzle and step 5b Give should not take a row on the path until they are on. For 18 personas they are two grey rows that need explaining.
- Big deals, Lean FI, Barista FI, Fat FI, True FI: show only Regular FI and Coast FI until the client asks. Fat FI at 1.5x reads as a taunt to the deficit personas.
- Protection, HSA, FSA, equity pay, commuter: hide for Student, Between jobs, Self-employed and cash income until they say yes to "benefits at work".
- Big e in three nested layers (FAT, DRAFTT, full) is three numbers where one would do for everyone but Tom and Priya.
- The 12-session path with every node visible on session 1: show the next two nodes, fold the rest.
- Two FI dates on the card ("if it sits in checking: 2083 to 2085") is a sentence too many for anyone who is not asking.
- Agenda Note and Open buttons on every Must do row: fold into the row.
- For Alexis, Keisha, Luis and Dominique: no Picture %, no pace word, no "Catch up". A single "what we got done today".

## 7. "Don't ask" list

- Filing status: infer from "married" (a new yes or no), not from "couple"; never from Couple alone.
- Age: a birth year is enough; drop the month.
- Pay frequency: default to every 2 weeks and show the two paydays on the calendar; ask only if a payday lands wrong.
- Card APR: already a 25% guess; also guess 29% for store cards, 0% for a promo until a date, 390% for a $15 per $100 payday fee (feeApr exists; make it the default when the type is Payday).
- Medical and collections: default APR 0%, and never call them heavy; ask only "is it in collections?" (yes puts it in step 1 as a settle-or-ignore item).
- Rent split: "who you live with" already fills every shared line; stop asking per line.
- Deductible: pull from the Health row once; little e already does this.
- HSA limit: self-only unless family coverage is ticked on the Health row; never from "couple".
- Retirement spending: default to today's spending minus every line tagged kids, tuition, childcare, debt payment, sinking fund, with the full number one tap away.
- FI age: default from the Retire by field; say "to 65" on the Coast FI label so nobody has to find it.
- Work hours: 173 is already the fallback; keep it and never ask in session 1.
- Why now, biggest worry, goal in their words: the discovery call already has them; carry them in and do not show three empty "I'll find it later" boxes at the top of About you.
- Income stability: infer Varies when the income type is 1099, Business, Side hustle or Rental.
- Money feeling 1 to 10: keep, but ask once at the end, never on Home.

## 8. Shortcuts and fast paths worth adding

- "Five numbers" start: take-home, rent, monthly spending gut, total debt, cash. Everything else later. (The Discovery form is almost this; make it the session 1 default rather than a coach tool.)
- "Just the cards": a debt-only start that skips accounts and FI entirely and lands on the payoff chart and the calendar.
- "I get paid in cash": an income type that sets 1099, Unpredictable, a tax set-aside line, quarterly markers, and no employer fields in one tap.
- "We are a couple but not married": one toggle that sets Single filing for each, self-only HSA, two Roth limits, and Separate or Joint money in one place.
- "Kids age out": a tuition or childcare line with an end year that drops out of the FI number and the retirement spending automatically.
- "Paste from my sheet": accept a two-column paste (label, amount) into Fast Track.
- A phone card for the client between sessions: this week's bills, the low day, FI days gained since Day 0. Read only.
- One-tap "Looks right" on the review gate is good; add "Same as last month" on every Actual line.
- "Undo this session": the Start of session N snapshot already exists; surface it as one button.

## 9. Turnoffs

Judgment or verdict words:
- "Oxygen mask on you first" on the Give lock (seen in code). To a frum family, a tither, or someone supporting a chosen sibling this reads as the app overruling a value.
- "You are putting in more than Quiet Quitting FI needs, with no goal named for the extra" for a 30-year-old with $16,000 invested and a 27% card (seen in code, reproduced).
- Scorecard "Hole" six times in a row for someone in deficit, including "Investing: Hole" with a $0 payoff (seen in code, reproduced).
- Pace words "Catch up" and "Ahead" on the Picture bar (likely): fine for Sofia, a grade for Keisha.
- Fat FI at 1.5x spending shown on the same ladder as a $150 checking balance.

Assumes a straight married couple with kids:
- Couple defaults to Married filing jointly, the family HSA limit and the joint Roth limit (seen in code). Unmarried partners, same-sex or not, are mis-taxed and over-limited.
- "Family help" as a backup of the backups; "Money sent to family" as the only support line. Estranged and chosen-family personas have nowhere neutral to put support.
- Kids lines open on Dependents, which is right, but there is no line for care, surgery, fertility, adoption or a child who is not a dependent.

Assumes steady W-2 income:
- Take-home is one number per row; lowest month is decoration (seen in code).
- Protection, HSA, FSA, commuter, equity, match and 401(k) questions appear for everyone who has not said no.
- "Pay frequency" and "Next payday" assume a paycheck; cash and platform payouts have no shape.
- Taxes: federal and FICA plus New York only (seen in code). A creator in California, a dancer in Nevada and a rideshare driver in Texas all get the same state tax: none.

Ignores religious obligations:
- Giving unlocks at the Roth step (seen in code). Maaser, tithe and zakat are not optional to the people who give them.
- Shabbat, yom tov, Pesach, kosher food, tuition, simcha and mikvah or shul dues live behind an off-by-default "Community presets" caret on the Budget.
- No line, no scenario and no FI number treatment for aliyah or a move abroad.

## 10. Segment-by-segment summary

- FIRE (Priya, Marcus, Dana): they already know the formulas, so the edge is transparency, not insight. They want typed assumptions, a sensitivity table, decumulation, and no Scorecard. They will leave if a number they can check is wrong (two-earner tax) or if a label is wrong (Coast FI to 65). Score now 5.3, after 7.7.
- Jewish (the Golds, Leah, David): the household model is close (giving, yom tov lines, tuition as a kids line) but the FOO and the FI number work against them: giving locked, tuition forever, no simcha or aliyah. Fixing giving and time-limited costs lifts this segment the most per unit effort. Score now 4.3, after 7.0.
- Queer (Sam, Teo, Ash): the words are neutral and the sharing wiring is good, but Couple means married in the math. Chosen family and care costs need a home that is not "family" and not "Therapy". Score now 4.3, after 7.3.
- Negative net worth (Keisha, Rob, Jenna): the calendar, the low line and little e are exactly right, and then a negative surplus turns every date off and the Scorecard turns on. They need deficit mode, medical and collections handled gently, and session 1 to end in ten minutes. Score now 3.3, after 6.7.
- Gen Z (Malik, Sofia, Ethan): the Picture % and FI days are made for them; the QQ FI flag and the 40-year range undo it. Students and people living at home need housing % and runway to step aside. Score now 5.0, after 7.3.
- Irregular and cash income (Nova, Luis, Dominique): the right fields exist and none of them drive the headline. Add a cash or platform income type, let the safe budget be the take-home, add state tax, and treat a business loan as business. Score now 3.3, after 6.3.
- Couples (Aiden and Bex, Noor and Chris, Grace and Tomás): one file per household, married by default, two incomes taxed apart. The sharing and taking-over wiring is better than anything they use. Score now 5.0, after 7.7.
- Reference users: Alexis needs the five-number start, undo and "what we got done", nothing else in session 1. Tom needs the tax model to be right before he reads anything else, and then he will love the workbook. Score now 4.5, after 7.5.

## 11. Expert panel

Views are paraphrased "in the spirit of" each person's public work. No direct quotes are attributed to anyone. Where I am not confident who someone is, the block uses only the role given and is marked low confidence.

### Mindy Jensen (BiggerPockets Money)
- Verdict: a coach's tool with a kind heart and a long first form; the FOO and the calendar are the two things she would show a listener.
- Recommendations: 1. Session 1 is five numbers and a date for the next call, nothing more. 2. The deficit path first: her audience's lowest-net-worth listeners are the ones SLAM freezes on. 3. Make giving and family support an obligation line, not a locked step.
- Cut: the Scorecard before session 5.
- Disagrees: giving at the Roth step. She would put giving wherever the client puts it and show the cost in FI days without a lock. Fine with little e / big e and the FOO order otherwise.

### Scott Trench (BiggerPockets)
- Verdict: the FOO with dates is the best thing here; the FI model is too single-path for his audience (real estate, income growth).
- Recommendations: 1. Treat the business and the rental as assets with cash flow, not as "Other property" and a Business debt that is heavy. 2. Income as the biggest lever: an "earn more" step with its own payoff on the Scorecard, not effort 8 and no rule. 3. Scenarios before decumulation.
- Cut: Fat FI from the ladder.
- Disagrees: Coast FI before SPARKS. He would open the launch window on runway and a tested side income, not on a Coast number to age 65. Quiet Quitting FI he finds clever but a distraction under 35.

### Brad Barrett and Jonathan Mendonsa (ChooseFI)
- Verdict: this is the FI community's playbook made operational, with the right math and the wrong defaults for anyone under 35.
- Recommendations: 1. Fix the QQ FI $0 flag and label Coast FI with its age. 2. Savings rate as the hero number on Home, with the Shockingly Simple dot right under it. 3. Travel rewards and tax optimization as holes with payoffs.
- Cut: the second FI date on the card ("if it sits in checking").
- Disagrees: little e at $1,000 for a high earner is fine, but they would skip big e past one month for a dual-income household with stable jobs. They like Quiet Quitting FI as a milestone, not as a flag.

### Mr. Money Mustache
- Verdict: too many screens for a problem that is 90% spending; the hours-of-life toggle is the one feature he would keep.
- Recommendations: 1. Put the savings rate and the years-to-FI curve on Home in letters two inches tall. 2. Every spending line shows its cost in hours and in FI days by default. 3. Kill the presets: 5% real, 4% withdrawal, done.
- Cut: the 12-session program. Three sessions and a bike.
- Disagrees: the whole FOO. He would say pay off anything over 5%, keep one month cash, invest the rest in an index fund, and stop making tools. Giving he would fund from the surplus after spending drops, not at a step.

### Alan Donegan (PopUp Business School, Rebel Entrepreneur)
- Verdict: built for employees; the self-employed personas get the worst numbers and the most questions.
- Recommendations: 1. A "my income is a business" start with revenue, costs, a draw and a tax pot. 2. Business debt in the business, not in the heavy debt step. 3. The runway question as the first question for anyone without a paycheck.
- Cut: employer benefits, HSA, FSA, equity and match questions until a W-2 exists.
- Disagrees: the FOO's "Take the free money" at step 2 does not exist for a founder; he would swap in "build the income" there. Coast FI before SPARKS is backwards for him: SPARKS is the point, Coast FI is the safety net.

### Alex Hormozi
- Verdict: the product does the math; it does not change behaviour. The only number that matters is the gap between what they earn and what they could earn.
- Recommendations: 1. Income as the first Scorecard area with the biggest payoff rule, not the one with no rule. 2. One action per session, written as a sentence with a deadline, texted to the client. 3. Measure the one metric the coach promised in the sales call.
- Cut: everything on Home below Money in one line.
- Disagrees: with the premise. Cutting to get to a 20% savings rate on $45,000 is a slow way to lose; he would put "earn more" ahead of steps 3 to 9 for anyone under $75,000.

### Scott Galloway
- Verdict: honest about the math, which he likes; silent about the two things that decide young people's outcomes, income trajectory and where they live.
- Recommendations: 1. A Student and Between jobs mode that hides retirement and asks about the next job. 2. Housing % and city as a lever, not a line. 3. Show the young personas what compounding does with a real number, not a $0 QQ FI.
- Cut: Fat FI, Barista FI and True FI from anyone under 40.
- Disagrees: the Roth and HSA at step 5 for a 23-year-old: he would put the match and the Roth before big e ("time is the asset, not cash"). Low confidence on his view of giving; he writes about giving late in life.

### Morgan Housel
- Verdict: the FI date to the month is false precision dressed as confidence labels; the ranges are the right instinct and the wide ones are the honest ones.
- Recommendations: 1. Show the FI date as a decade until Medium confidence and never to the month. 2. Treat the FI number as a range from spending minus 20% to plus 20%, always. 3. One line on every projection: "assumes nothing changes, and something will".
- Cut: "Ahead" and "Catch up".
- Disagrees: Quiet Quitting FI and Coast FI as gates. He would show them as information, not as locks, because people's plans change more than their numbers.

### Young early-retirement creator (role; identity not confirmed, low confidence)
- Verdict: the FOO path with dates is content; every screen should be screenshot-able for a 24-year-old.
- Recommendations: 1. A phone-first client view before anything else in phase 6. 2. Wins on the calendar as shareable cards. 3. The savings-rate curve as the first chart, not the Sankey.
- Cut: the three statements for anyone under 30.
- Disagrees: Coast FI before SPARKS; the creator economy launches first and coasts never.

### Foundations-first financial educator (role; identity not confirmed, low confidence)
- Verdict: the order is right (bleeding, match, heavy debt, cushion); the app forgets the people who are still bleeding.
- Recommendations: 1. Deficit mode with the first three cuts. 2. Little e before anything on Home for anyone with payday or BNPL debt. 3. Collections handled as a separate, calm step.
- Cut: the Picture % for anyone at step 1.
- Disagrees: nothing on the order. Would hold giving until big e is full, which is later than SLAM's Roth step.

### The Money Guy Show (Brian Preston and Bo Hanson)
- Verdict: a faithful cousin of their FOO with one good addition (Quiet Quitting FI) and one they would argue with (SPARKS as a step).
- Recommendations: 1. Deductibles covered as step 1 exactly as SLAM has it; make the "little e is $1,000 or the deductible" rule visible on the card. 2. The 25% savings-rate goal as the Cash flow Strong line, not 20%. 3. Hyper-accumulation as its own step with a number, instead of folding it into "Prepay retirement".
- Cut: the "With the Money Guy's original" toggle as a side-by-side; show the mapping once in the glossary.
- Disagrees: giving at the Roth step (they would put it wherever the household's values put it, and model it as spending); SPARKS before step 8 (they would never put a launch ahead of prepaid future assets); Coast FI as a gate at all.

### Gary Vee
- Verdict: nobody is going to do twelve sessions; the first screen has to make someone feel like they won.
- Recommendations: 1. A first-session win: one bill moved, one subscription cut, one FI day gained, shown big. 2. Self-awareness over math: "what do you actually want" before "what do you earn". 3. Voice notes into the parking lot.
- Cut: the agenda.
- Disagrees: with the FOO as a path at all; he would let people start wherever they have energy. Giving he would put first, loudly.

### Lindsey Swanson, CFP (Stripper Financial Planning) and Jessica Goedtel, CFP (Pavilion Financial Planning)
- Verdict: closest to the right questions for cash and 1099 earners of any tool they have seen, and still wrong in the headline. (Moderate confidence on the specifics of each practice.)
- Recommendations: 1. Lowest month as the take-home for everything, typical month as the upside. 2. Tax set-aside as an account with quarterly markers and a state line, not a percent. 3. A Solo 401(k) and SEP path in the Roth and HSA step for people with no employer plan; "Take the free money" should read "no employer here" and vanish.
- Cut: Protection, HSA and FSA until asked.
- Disagrees: little e at $1,000 for someone whose income can go to zero for a month; they would start big e at 3 months before the Roth. Both would move giving and family support into the obligations bucket.

### Domme-world and sex-work business voices: Alexandra Snow (Wicked Alliance), Mx Tomie, MelRose Michaels (Sex Work CEO), Daisy Does Taxes
- Confidence: MelRose Michaels and Daisy Does Taxes as educators for creators and sex workers, moderate; Alexandra Snow and Mx Tomie, low; treated as domme-world business and tax insiders by role.
- Verdict: the privacy model (everything in the browser, export from the gear, client view) is a real strength; the income screen still assumes a boss.
- Recommendations: 1. An income type that is just "Cash or platform" with no employer fields and a note on what the 1099 will say. 2. Bank de-risking and chargebacks as a backup-of-backups risk, with a second bank as a layer. 3. Business costs (outfits, studio, platform fees, travel) as income costs before DRAFTT, so the savings rate is on net income.
- Cut: the "Pay frequency" and "Next payday" questions for this income type.
- Disagrees: the Roth step assumes earned income shows up cleanly; Daisy (role) would put "file and set aside" at step 1 ahead of little e for anyone with unfiled years. Coast FI and SPARKS mean little in a career with its own clock.

### Alexis Gillmore and Tom Hutchinson (everyday users, opposite failure modes)
- Alexis, verdict: it looks like a form and sounds like a teacher; she would stay for the payday card and the FI days and leave at the Picture %.
- Alexis, recommendations: 1. Five numbers and done. 2. One sentence per screen, hers. 3. Undo on everything, which it has, said out loud.
- Alexis, cut: the Scorecard, the agenda, the 12 nodes.
- Alexis, disagrees: with any order; she would fund the club and the joy lines first and call giving step 0.
- Tom, verdict: the math is mostly right and he can see all of it, which no tool he uses allows; the two-earner tax and the state line are wrong, and he will not trust the rest until they are fixed.
- Tom, recommendations: 1. Household tax once, with state. 2. Typed assumptions and a sensitivity table. 3. The three statements as the default Report.
- Tom, cut: the FI date range copy ("about 10 to 16 years from now"); he wants the inputs and will do the range himself.
- Tom, disagrees: little e at $1,000 ("the deductible, always"), Coast FI to 65 by default, Fat FI at 1.5x with no basis. His own fixes (eleven assumption fields on the FI card) would make it unusable for Alexis.

### Where the panel agrees
- Session 1 is too long: five numbers, one win, a date (Mindy, Gary Vee, Hormozi, Alexis, young creator role, Lindsey and Jessica).
- Deficit mode is the most important missing thing (Mindy, Money Guy, foundations role, Evan role, Alexis).
- Variable income must drive the headline, with the lowest month as the floor (Lindsey, Jessica, Donegan, MelRose role, Daisy role, Trench).
- The two-earner and unmarried-couple tax model is wrong and must be fixed first (Tom, Jessica, Money Guy, Daisy role).
- Giving should not be locked; model it as an obligation or as spending (everyone except the foundations role, who would hold it until big e).
- The FI date is over-precise at low confidence (Housel, Tom, ChooseFI).
- The Scorecard should wait (Mindy, Alexis, Gary Vee, foundations role, Galloway).
- Show the math, the hours toggle, the statements and the workbook are the keepers (Tom, MMM, Money Guy, Priya, young creator role).

### Where the panel splits
- Giving's place: step 0 and loud (Gary Vee, Mindy, Alexis, frum personas) vs inside spending with its cost shown (Money Guy, Housel, MMM) vs after big e (foundations role, Lindsey and Jessica).
- Coast FI before SPARKS: keep (Money Guy, foundations role, Tom) vs reverse or drop the gate (Donegan, Trench, Hormozi, young creator role, Alexis, Gary Vee).
- Quiet Quitting FI: a good milestone (ChooseFI, Money Guy) vs a distraction under 35 (Trench, Galloway, MMM) vs information only, never a lock (Housel).
- little e at $1,000: right (Money Guy, foundations role) vs the deductible always (Tom) vs too small for income that can stop (Lindsey, Jessica, Daisy role).
- big e before the Roth: keep (Money Guy, foundations role, Lindsey and Jessica) vs match and Roth first for the young (Galloway, ChooseFI).
- The FOO as a path at all: keep (Money Guy, Mindy, foundations role, Tom) vs income first (Hormozi, Donegan, Trench) vs no order (MMM, Gary Vee, Alexis).
- The 12-session program: keep and fold (Mindy, Money Guy) vs three sessions (MMM) vs one win and a text (Gary Vee, Hormozi).

## 12. Persona blocks

Scores are 1 to 10 for fit and joy. Lists run most to least important. Numbers in a block come from running that made-up household through the app's own math unless marked "likely".

### Segment 1: FIRE community

#### 1. Priya Natarajan, 38, solo, software engineer
Profile: $220,000 gross, maxes 401(k) and HSA, $920,000 invested, $40,000 cash, spends $5,000 a month, no debt. Net worth $960,000. Goal: lean FI at 45 on 3.5% and 5% real. Stress 2 of 10. Tech comfort high. Uses her own Google Sheet plus ProjectionLab. What tools get wrong: they will not let her type her own return and withdrawal rate per scenario.
a. Snapshot: already past most of the FOO; wants a second opinion she can audit.
b. Really hiring SLAM for: a check on her own sheet by someone else's math, and the SPARKS question (when can she leave).
c. Score now: 5. The math is right and visible (FI in 53 months, Coast $1.22M), but the knobs are four presets and the Scorecard tells her Goals is a Hole.
d. Top 10 issues: 1. Return is a Pace picker (6, 7, 8, 12); she wants 5% typed (seen in code: presets only in the UI). 2. Withdrawal rate presets stop at 3% and 4%; no 3.25%. 3. "Fund the future" shows Done with nothing in it (seen in code). 4. The cash-above-layers flag fires on $1,000 of extra cash (seen in code). 5. big e DRAFTT layer reads $0 because her "everything else" line is Other (seen in code). 6. SPARKS launch window is Locked until Coast FI even though she is 4 years from full FI; the lock copy explains the rule, not her case. 7. No Roth conversion ladder, 72(t) or healthcare before 65 (spec phase 5). 8. Scorecard: Goals Hole, five Not rated. 9. Big deals compares presets she did not pick. 10. The FI date is a year range at Medium confidence when all eight of her numbers are at Estimate.
e. Top 10 amazing: 1. Open in a spreadsheet with a Check column against her own. 2. Show the math on every number. 3. The FOO path with dates. 4. Quiet Quitting FI as a number ($1.17M) she had never computed. 5. The three statements. 6. Backdoor Roth note on step 5. 7. Day 0 vs now. 8. FI days on a purchase. 9. Lean FI from FAT lines. 10. Snapshots with compare.
f. Unique edge: the Check column workbook and the FOO with dates. ProjectionLab cannot show its formulas; her sheet has no order of operations.
g. Why not: four presets, a lock she cannot reason with, a Scorecard grading her, eleven areas when she has one question.
h. Would ask for: typed assumptions, a sensitivity grid (return by withdrawal rate), ACA and Roth ladder.
i. Latent: "what does one more year buy" in dollars and in spending; a sequence-of-returns stress line.
j. Overdone: Scorecard, the Picture %, Bedazzle, the pace word.
k. Better, ranked: typed return and withdrawal rate (+1.5); a sensitivity table on Goals (+0.5); hide the Scorecard until she asks (+0.5); healthcare and Roth ladder lines (+0.5); "one more year" on the FI card (+0.5).
l. Score after: 8.
m. Quotes: "It is the first tool that let me check its work." "Why is a seventh-grade report card on my plan?" "I typed 5% in the spreadsheet and brought it back, and it took it. That is the feature."

#### 2. Marcus Bell, 32, solo, nurse
Profile: $6,000 take-home, $150,000 in a 403(b), $15,000 cash, spends $4,000. Net worth $165,000. Goal: Coast FI so he can drop to three shifts. Stress 4. Tech medium. Uses Monarch. What tools get wrong: Coast FI is always to 65, never to the age he means.
a. Snapshot: enough invested to coast to 60; wants permission.
b. Really hiring for: "can I stop saving and still be fine", in one number he believes.
c. Score now: 6. Coast FI to 60 is $180,483 and he has $150,000; the path says Prepay retirement is $30,483 away in Oct 2027. That is the answer. Then the Roth step says $7,500 left for an account he does not have.
d. Issues: 1. Coast FI uses 65 unless he finds FI age on Goals (likely stall). 2. Step 5 Roth and HSA assumes a Roth exists (seen in code). 3. Lean FI needs lines he has not typed. 4. FI range at Low confidence spans 2040 to 2047 from a gut number. 5. Scorecard: Retirement accounts Hole because nothing new goes in, while the point is to stop. 6. "Fund the future" Done. 7. Nothing says what three shifts pays, so Barista FI stays blank. 8. The 403(b) has no match tiers so step 2 reads "No match on file" as Done. 9. Housing % is blank on the gut number. 10. The agenda's Must do items mean nothing to him.
e. Amazing: 1. Coast FI date on the path. 2. Barista FI if he types part-time income. 3. The save-more slider showing he can save less. 4. The Shockingly Simple dot. 5. FI days. 6. One-pager for his partner. 7. Runway on the Home card. 8. The payday card. 9. Hours toggle on shifts. 10. Day 0.
f. Unique edge: Coast and Barista FI with dates; Monarch has neither.
g. Why not: being told to open a Roth when the plan is to work less; the Scorecard Hole.
h. Would ask for: "Coast to what age" on the Home card; a shifts-per-week slider.
i. Latent: the cost in months of coasting at 60 vs 58.
j. Overdone: eleven areas, three big e layers.
k. Better: Coast FI label shows its age and a one-tap age change (+1); Barista FI from a shifts slider (+0.5); Roth step reads "optional, you are coasting" after Coast (+0.5); FI range capped (+0.3); Scorecard hidden until S5 (+0.2).
l. After: 8.
m. "It told me I can stop at $180k and I am at $150k. I cried a little." "Then it told me I had a hole."

#### 3. Dana Whitfield, 45, married, two incomes
Profile: $160,000 plus $100,000 gross, $1.1M invested, $90,000 cash, home with $200,000 left at 3%, spends $9,000. Net worth $1.4M. Goal: leave at 50 but afraid ("one more year"). Stress 5. Tech medium. Uses a CFP on AUM plus a spreadsheet. What tools get wrong: they never show what the extra year buys.
a. Snapshot: past Coast, scared of healthcare and sequence risk.
b. Really hiring for: a reason to stop that holds up against the CFP's "just to be safe".
c. Score now: 5. Two W-2 rows each taxed alone with a joint deduction overstate take-home by about $9,000 a year (seen in code, reproduced on a $210,000 pair). No healthcare, no Social Security, one FI number.
d. Issues: 1. Two-earner tax overstated. 2. Retirement spending defaults to today's $9,000 including the mortgage that ends. 3. No ACA or Medicare gap line. 4. No Social Security (parked). 5. No decumulation or Roth ladder. 6. FI shown to the month at High confidence. 7. SPARKS locked until Coast, which she is past, so "Locked" flips to "Open: pick a launch move" with no help picking. 8. Fat FI 1.5x on the ladder. 9. Scorecard Goals Hole. 10. Picture % pace means nothing to her.
e. Amazing: 1. Quiet Quitting FI tells her the 401(k) can stop now. 2. Statements that tie out for the CFP meeting. 3. Workbook. 4. Day 0 vs now at session 9. 5. "What the CFP's 1% costs in FI days" if she typed it as a line. 6. Mortgage end as a milestone. 7. Timeline band at three paces. 8. One-pager. 9. Hours. 10. Snapshots.
f. Unique edge: Quiet Quitting FI and statements; her CFP's software shows neither.
g. Why not: a FI number she knows is 20% too high; no healthcare answer.
h. Would ask for: healthcare before 65, Social Security, a mortgage-ends drop in spending.
i. Latent: "one more year" as dollars of spending bought per year worked.
j. Overdone: Scorecard, pace, Bedazzle.
k. Better: household tax once (+0.7); retirement spending minus ending lines (+0.5); healthcare line (+0.4); Social Security line (+0.2); one-more-year card (+0.2).
l. After: 7.
m. "The order-of-operations page is the conversation I wanted with my advisor." "It thinks my mortgage lasts forever."

### Segment 2: Jewish community

#### 4. Shmuel and Rivky Gold, 36 and 34, frum, five kids
Profile: $95,000 W-2 plus $30,000 part time, yeshiva tuition $30,000 a year, kosher groceries $1,800, maaser 10% of gross, rent $2,800, $8,000 checking, $40,000 401(k), $12,000 card at 24%. Net worth $36,000, surplus negative $1,376. Stress 8. Tech low to medium. Uses nothing beyond a mental ledger and a gemach. What tools get wrong: tuition and maaser are not discretionary.
a. Snapshot: a large family in deficit with obligations the app calls optional.
b. Really hiring for: a plan that keeps tuition and maaser and still ends the card.
c. Score now: 3. Giving is Locked: "Giving unlocks at the Roth IRA step. Oxygen mask on you first. Needs no debt at or above the heavy-debt APR" (seen in code, reproduced). FI number $3.06M because tuition is in retirement spending (seen in code). Surplus negative, so no FOO date at all; Scorecard: Cash flow Hole, Debt Hole, Credit Hole, Goals Hole.
d. Issues: 1. Giving locked with judging copy. 2. A line named Tzedakah does not count toward Give (regex giv, tithe, maaser, charit, donat; seen in code). 3. Tuition forever in the FI number. 4. Deficit: no dates, no ranked cuts. 5. Community presets off by default and hidden under a caret on Budget (seen in code). 6. Yom tov and Pesach lines arrive with blank amounts; no Shabbat weekly line. 7. Two W-2 rows taxed apart. 8. No simcha or bar mitzvah sinking fund preset. 9. "Fund the future" Done while nothing is funded. 10. "Kids" lines are eight generic lines; tuition is one of them with no end date.
e. Amazing: 1. The calendar with tuition, rent and the card on their days with a low line. 2. Maaser on gross or take-home as a number. 3. The payday card. 4. From Debt lines so the card payment is not counted twice. 5. Who covers it, for the gemach loan and parents' help. 6. Stress payoff order. 7. Kids age-out dropping the FI number (if built). 8. Hours view of a yom tov. 9. Undo. 10. One-pager for a rav or a mentor.
f. Unique edge: nothing yet. The pieces exist (maaser, yom tov lines, kosher note) and the FOO and the lock cancel them out.
g. Why not: being told to turn giving off; "Hole" four times; a $3M number for a family at zero.
h. Would ask for: an obligations bucket, tuition with an end year, Shabbat and yom tov lines on by default for them.
i. Latent: a yom tov sinking fund that fills from the paycheck, a simcha fund with a date, the card's end month on the calendar as a win.
j. Overdone: FI ladder, Big deals, Scorecard, Picture %.
k. Better: obligations bucket with giving unlocked at step 0 (+1.5); deficit mode with ranked cuts (+1); tuition with an end year out of the FI number (+0.7); community picker on About you (+0.5); household tax once (+0.3).
l. After: 7.
m. "It told us maaser waits until we max a Roth. That is not a thing." "The calendar with the low line is the first time I saw the month before it hit."

#### 5. Leah Friedman, 29, modern Orthodox, engaged
Profile: $85,000 W-2, $25,000 saved for the wedding, $15,000 Roth, $0 debt, rent split with two roommates. Net worth $40,000. Goal: wedding in a year, aliyah in three. Stress 5. Tech high. Uses YNAB. What tools get wrong: a move abroad resets every assumption.
a. Snapshot: two dated goals that are not FI.
b. Really hiring for: how much she can give the wedding and still land in Israel with a cushion.
c. Score now: 5. The Next 12 months events and sinking funds fit the wedding; nothing fits aliyah (Scenarios is a placeholder; seen in code). The FOO wants a Roth maxed before step 8 "Fund the future", so her wedding fund ranks after the Roth.
d. Issues: 1. No move-abroad scenario. 2. Wedding and aliyah funds are step 8, after Roth and big e. 3. Giving (she gives 10%) locked until Roth maxed. 4. Rent split works but "Roommates" and "partner" split logic changes the month she marries. 5. FI date computed in US dollars and US tax for a life in shekels. 6. Kids lines gated off; she wants to plan for them. 7. "Fund the future" Done while her funds are not there. 8. Yom tov lines hidden. 9. The Picture % nags for protection she does not need yet. 10. YNAB import does not exist; Fast Track retypes.
e. Amazing: 1. Sinking funds with a date on the calendar. 2. Taking over bills on a date (marriage). 3. The running balance through the wedding month. 4. FI days per wedding vendor. 5. Who covers it for parents' contributions. 6. Partner birth year and a couple file. 7. Roth log by tax year. 8. Hours. 9. Snapshot before the wedding. 10. One-pager for the two families.
f. Unique edge: sinking funds plus the calendar plus FI days; YNAB has the funds and none of the dates in FI terms.
g. Why not: the FOO ranks her life events after a Roth; giving locked.
h. Would ask for: a scenario for aliyah; a "goal before FOO" toggle on a sinking fund.
i. Latent: a "what changes when we marry" comparison (taxes, Roth limit, HSA, insurance).
j. Overdone: eleven areas, FI ladder.
k. Better: sinking funds can sit at step 0 as named goals (+0.7); move-abroad scenario (+0.7); giving unlocked (+0.4); marriage comparison (+0.2); community picker (+0.2).
l. After: 7.
m. "It is great at the wedding and blank on the move." "I did not expect to be told my tzedakah waits."

#### 6. David Kaplan, 52, Conservative, two weddings coming
Profile: $180,000, $700,000 invested, $60,000 cash, paid-off home, gives 5% to shul and causes, two children marrying in two years ($40,000 each). Net worth $1.3M with the house. Stress 4. Tech medium. Uses a CFP. What tools get wrong: a simcha is a line item, not an emergency.
a. Snapshot: comfortable, obligation-heavy, wants to know what the weddings cost his retirement date.
b. Really hiring for: permission to spend on the simchas without wrecking the plan.
c. Score now: 5. Events with a set-aside exist and work; the giving step wants 5% of gross after the Roth; the FI number includes synagogue dues and support forever.
d. Issues: 1. Giving locked at step 5b; his giving is a fixed value, not a reward. 2. Simcha as an event works, but its $80,000 shows in step 8 after Roth and big e. 3. Retirement spending includes dues and gifts he will keep but tuition-era lines he will not. 4. Catch-up limits (50 plus) appear in the registry but the Roth step's $7,500 ignores the $1,100 catch-up (seen in code: iraLimit uses base). 5. Social Security parked. 6. Fat FI meaningless. 7. Two-earner tax if his spouse works. 8. Scorecard Goals Hole. 9. Big e at 10.4 months (age/5) is $93,000, more than his CFP's three months. 10. Picture % pace.
e. Amazing: 1. Events with monthly set-aside on the calendar. 2. The cost of each wedding in FI days. 3. Quiet Quitting FI (he can stop the 401(k)). 4. Statements. 5. One-pager for the CFP. 6. Giving as a number on gross or net. 7. Snapshots per simcha. 8. Day 0 vs now. 9. Workbook. 10. Milestones with dates.
f. Unique edge: FI days on a simcha and Quiet Quitting FI; the CFP shows a Monte Carlo, not this.
g. Why not: the lock on giving; the Roth catch-up miss (Tom would catch it, David would feel it).
h. Would ask for: giving as a fixed line; catch-up limits; a simcha preset.
i. Latent: "what the weddings cost in retirement months" as one sentence.
j. Overdone: three big e layers, Bedazzle, pace.
k. Better: giving as an obligation line (+0.8); catch-up limits in step 5 (+0.4); simcha preset with a date (+0.4); Social Security line (+0.2); Scorecard hidden (+0.2).
l. After: 7.
m. "The weddings cost 14 months. Fine. Now I know." "It thinks giving is a step. For me it is rent."

### Segment 3: Queer community

#### 7. Sam Okafor (they/them), 30, unmarried partner, separate money
Profile: Sam $68,000 W-2, partner Jules $52,000, separate accounts, rent $2,400 split, gender-affirming care $400 a month out of pocket, $3,000 checking, $15,000 401(k), $6,000 card at 27%. Estranged from parents. Net worth $13,000 (Sam alone). Stress 6. Tech high. Uses Rocket Money. What tools get wrong: "couple" means married and pooled.
a. Snapshot: two separate financial lives in one household file.
b. Really hiring for: Sam's own plan, with the shared bills right and no assumption about Jules.
c. Score now: 3. With the household entered as a Couple with Separate money, take-home is $8,504 (both incomes), spending is $3,345 (Sam's half of rent and Sam's lines), so surplus reads $5,159 and savings rate 62.5% (seen in code, reproduced). Both incomes are taxed as Married filing jointly (about $2,300 a year too generous each; reproduced). HSA limit is family ($8,750) because couple (seen in code). The flag "You are putting in more than Quiet Quitting FI needs, with no goal named" fires because QQ FI computes to $0 at 30 (reproduced).
d. Issues: 1. Partner income counted in full against Sam's share of bills. 2. Married tax default. 3. Family HSA and joint Roth limits. 4. QQ FI $0 flag. 5. Care has no category except "Therapy" (renamed Health and self-care) and no end date. 6. "Family help" as a backup question. 7. FI number counts care forever. 8. Rocket Money import: none. 9. Scorecard: Debt Hole, Credit Hole, Retirement Hole, Goals Hole. 10. "Fund the future" Done.
e. Amazing: 1. Who covers it and split by, per line. 2. Taking over a bill on a date. 3. Partner first name, no gender. 4. The card's payoff on the calendar. 5. Stress payoff order. 6. FI days per care visit as information, not judgment. 7. Little e at the deductible. 8. Payday card. 9. Backups that are not family (available credit, what you could cut). 10. Undo.
f. Unique edge: nothing yet for an unmarried couple, because the math is wrong; the sharing wiring would be the edge once it is right.
g. Why not: being told they save 62% when they are at 35%; being filed as married; the QQ flag.
h. Would ask for: "married for taxes?" separate from "couple"; a self-only HSA; a care line with an end.
i. Latent: a single "what Sam owns and owes" view that leaves Jules out, with the shared bills still right.
j. Overdone: Scorecard, FI ladder, protection questions.
k. Better: Separate-money math (own income vs own share) (+1.5); married toggle for tax, HSA and Roth (+1); QQ flag fixed (+0.5); care category with an end (+0.5); support bucket for chosen family (+0.5).
l. After: 7.
m. "It gave me my partner's paycheck and half my rent and called it a 62% savings rate." "The split-the-bills part is the best I have seen. Everything after it assumed we were married."

#### 8. Teo Alvarez, 41, married, no kids, supports a chosen sibling
Profile: Teo $95,000 plus husband $55,000, $300,000 invested, $20,000 cash, rent $3,200, sends $300 a month to a chosen sibling, no debt. Net worth $320,000. Stress 3. Tech medium. Uses Monarch. What tools get wrong: support to people who are not legally family.
a. Snapshot: comfortable, generous, DINK, curious about Coast.
b. Really hiring for: a plan that keeps the $300 a month and shows what Coast FI needs.
c. Score now: 6. Coast FI to 65 is reachable; the $300 support sits under "Money sent to family" (fine) but the Give step does not see it and the two incomes are taxed apart.
d. Issues: 1. Two W-2 rows taxed apart. 2. Support line not counted as giving; Give step locked anyway. 3. "Family" wording. 4. Coast FI to 65 unless he finds FI age. 5. QQ FI at 41 is real; the flag may still fire when they add a milestone-less 401(k). 6. Fat FI noise. 7. Scorecard Goals Hole. 8. Kids lines gated off correctly, but Dependents asks a number first. 9. Protection asks about life insurance for a couple with no dependents. 10. No "what if one of us stops working" scenario.
e. Amazing: 1. Who covers it on shared bills. 2. Coast FI with a date. 3. Support shown in FI days without judgment. 4. Quiet Quitting FI. 5. Statements. 6. Hours view. 7. One-pager. 8. Day 0. 9. Save-more slider. 10. Snapshots.
f. Unique edge: Coast and QQ FI with dates and the sharing wiring; Monarch has neither.
g. Why not: the Give lock reads as "your sibling can wait"; "family" everywhere.
h. Would ask for: support bucket; "people you support" wording; household tax once.
i. Latent: a "one income" stress test with their runway.
j. Overdone: Protection and Dependents questions; FI ladder.
k. Better: household tax once (+0.7); support bucket at step 0 (+0.6); Coast label with age (+0.3); one-income scenario (+0.3); Scorecard hidden (+0.1).
l. After: 8.
m. "It calls my brother 'family or friend'. He is my family." "Coast FI in 2031. I did not know that number."

#### 9. Ash Nguyen, 26, trans man, single, surgery fund
Profile: $34,000 retail plus about $14,000 freelance (1099), $2,500 checking, $0 invested, $4,000 card at 29%, $9,000 surgery goal in 14 months, no family safety net. Net worth negative $1,500. Stress 8. Tech high. Uses a notes app. What tools get wrong: the surgery is a need with a date, not a want.
a. Snapshot: one goal with a date and a card in the way.
b. Really hiring for: a month-by-month path to the surgery that does not lose the apartment.
c. Score now: 4. The event with a set-aside and a sinking fund works; the FOO puts the card (step 3) and big e (step 4, $13,000) ahead of the fund (step 8); the freelance income is taxed as a separate row; no investments means the FI card says "Needs invested" (reproduced on a similar household).
d. Issues: 1. Surgery fund is step 8 in the FOO. 2. Big e at age/5 months before the fund. 3. 1099 row taxed apart with its own deduction. 4. The 25% tax set-aside on $14,000 is too high. 5. FI card blank ("Needs invested") rather than hidden. 6. Care and surgery under "Therapy". 7. "Family help" backup. 8. Scorecard five Holes. 9. Session 1 asks for FI age and protection. 10. No state tax.
e. Amazing: 1. The surgery on the calendar with a set-aside per paycheck. 2. Running balance to that date. 3. Card payoff vs fund side by side on the payoff chart with the extra slider. 4. Little e before anything. 5. Payday card. 6. FI days per purchase. 7. Undo. 8. Who covers it (a friend covering a month). 9. Backups that are not family. 10. Snapshot before and after.
f. Unique edge: the calendar to a dated goal with the card in view; the notes app has nothing.
g. Why not: being told the fund waits for step 8; FI math for someone who needs 14 months.
h. Would ask for: a goal that can sit at step 0; a quieter session 1; care and surgery categories.
i. Latent: "the first month you could book it" as the headline.
j. Overdone: FI ladder, Scorecard, Picture %, protection.
k. Better: dated goal at step 0 with a first-possible month (+1.2); hide FI until invested exists (+0.5); tax set-aside from income, not 25% (+0.5); care categories (+0.4); session 1 as five numbers (+0.4).
l. After: 7.
m. "It made the surgery a step 8. It is the step." "The calendar showed me the month it is possible. I screenshotted it."

### Segment 4: Starting from negative net worth

#### 10. Keisha Monroe, 27, solo, payday loan and cards
Profile: $3,200 take-home, spends $3,300, $150 checking, $800 payday loan ($120 fee every two weeks), $9,000 card at 28%, $2,500 medical in collections, no investments. Net worth negative $12,150. Stress 10. Tech medium. Uses nothing; avoids the bank app. What tools get wrong: they show the total and nothing to do today.
a. Snapshot: deficit, fees, shame.
b. Really hiring for: one thing to do this week that stops the bleeding.
c. Score now: 3. Surplus negative $100, so every FOO date is blank (reproduced); step 1 "Stop the bleeding" shows $1,650 left and no date; the Scorecard shows Cash flow, Emergency fund, Debt, Credit, Retirement, Investing ($0 payoff) and Goals as Holes (reproduced); the FI card says "Needs invested".
d. Issues: 1. Deficit freezes every date. 2. Seven Holes. 3. Payday fee becomes an APR only if fee and periods are typed (seen in code); "Not sure" has no payday guess. 4. Medical collections has no APR guess and no "settle or wait" handling. 5. No ranked cuts. 6. FI card and Coast FI ($75,692) shown. 7. Session 1 asks about HSA, FSA, equity, protection. 8. Picture % reads 60% then "Catch up". 9. The agenda's four items mean nothing. 10. No "what if I miss a payment" view.
e. Amazing: 1. The calendar with the low line and the first day under $500. 2. Payday fee as 390% in red words that are not red. 3. Little e as the first and only step. 4. Stress payoff order. 5. The payday card: what is free after bills. 6. Undo. 7. Hours view ("that fee is 9 hours"). 8. Snapshot and Day 0 for later pride. 9. The three cheapest cuts, if built. 10. One-pager with one to-do.
f. Unique edge: calendar plus low line plus the fee as an APR; Credit Karma shows a score, not a week.
g. Why not: a wall of Holes, a FI number, "Catch up".
h. Would ask for: "what do I cut first", a payment-day planner, nothing about retirement.
i. Latent: a text the day before the low day.
j. Overdone: everything past Cash flow and Debt.
k. Better: deficit mode with ranked cuts and a step 0 date (+1.5); Scorecard hidden at step 1 (+0.8); payday default fee APR and collections handling (+0.6); five-number session 1 (+0.6); FI card hidden until invested exists (+0.5).
l. After: 7.
m. "It showed me the Tuesday I go under. Nobody ever showed me that." "Then it gave me seven holes and a retirement date."

#### 11. Rob Delgado, 44, divorced, two kids part time
Profile: $4,500 take-home, child support $800, $28,000 cards at 24 to 29%, $6,000 IRS balance on a payment plan, $1,200 checking, $45,000 old 401(k). Net worth negative $30,000 without the home he lost. Stress 8. Tech low. Uses Credit Karma. What tools get wrong: support and tax debt are not negotiable lines.
a. Snapshot: paying three creditors and an ex; no slack.
b. Really hiring for: which card first and whether the IRS plan is fine.
c. Score now: 3. Tax debt is a heavy type (seen in code) with no plan fields; child support is a line that lives in the FI number forever; the Scorecard piles on; surplus is near zero so dates vanish.
d. Issues: 1. Tax debt as heavy debt with no IRS plan field or penalty rate. 2. Support counted in retirement spending. 3. Near-zero surplus kills dates. 4. Dependents gates kids lines on, but the kids are part time. 5. Five Holes. 6. The 401(k) makes the FI card compute a 2080s date. 7. Avalanche vs snowball vs stress with no explanation he would read. 8. Session 1 length. 9. "Family help" backup. 10. No "what if the plan payment is late" marker.
e. Amazing: 1. Payoff chart with the extra slider. 2. Stress order. 3. Calendar with support and plan payments on their days. 4. Little e. 5. Payday card. 6. Snapshots. 7. Hours. 8. Undo. 9. One-pager for the lawyer. 10. Day 0.
f. Unique edge: the payoff chart with orders compared, the calendar; Credit Karma offers loans.
g. Why not: Holes; a FI date; a tool that treats the IRS like a Visa.
h. Would ask for: IRS plan with its date and rate; support with an end year.
i. Latent: "the month you are card-free" on the calendar as a win.
j. Overdone: FI, Scorecard, Picture.
k. Better: tax debt plan fields and step 1 placement (+0.8); support with an end year out of FI (+0.6); deficit mode (+0.6); Scorecard hidden (+0.5); five-number session 1 (+0.5).
l. After: 6.
m. "It put the IRS next to my Discover card." "The chart with the slider is the first thing that made the cards feel finite."

#### 12. Jenna Park, 35, nurse, cards after a medical year
Profile: $70,000 W-2, $22,000 cards at 22 to 26%, $3,000 BNPL, $20,000 car loan at 7%, $40,000 401(k), $2,000 checking. Net worth negative $8,000. Stress 7. Tech medium. Uses Rocket Money. What tools get wrong: medical debt gets lumped with shopping.
a. Snapshot: one bad year, now digging out.
b. Really hiring for: a payoff order and a date she can tell her mom.
c. Score now: 4. The payoff plan works and dates show (surplus positive); BNPL and medical have no APR guess ("Not sure" defaults only for cards, personal loans and car loans; seen in code); Scorecard Debt, Credit, Retirement and Goals Holes.
d. Issues: 1. BNPL and medical APR blank, so payoff months blank. 2. Four Holes in session 1. 3. Rocket Money import none. 4. Card utilization Hole without a limit typed. 5. FI range wide. 6. Big e at 7 months ($20,000) listed before the Roth, both far off. 7. Protection asks what she already has through work. 8. "Fund the future" Done. 9. Picture % pace. 10. Session 1 length.
e. Amazing: 1. Payoff chart with orders compared. 2. Promo-ending-first rule. 3. Card payoff month on the calendar. 4. Utilization per card. 5. Stress order. 6. Little e. 7. Payday card. 8. Hours per card payment. 9. Snapshots. 10. One-pager.
f. Unique edge: payoff plan with the promo rule and the calendar; Rocket Money cancels subscriptions.
g. Why not: Holes; being asked for APRs she does not know.
h. Would ask for: BNPL and medical defaults; "same as last month" on actuals.
i. Latent: the card-free month as a shareable win.
j. Overdone: Scorecard, FI ladder, protection.
k. Better: APR defaults for every type (+0.8); Scorecard hidden until S5 (+0.7); five-number session 1 (+0.6); card-free win on the calendar (+0.5); "same as last month" (+0.4).
l. After: 7.
m. "It wanted an APR for Affirm. I do not know it." "The chart said March 2029 and I believed it."

### Segment 5: Gen Z and early career

#### 13. Malik Johnson, 23, first job, PSLF, roommates
Profile: $48,000 W-2, $3,400 take-home, two roommates, $32,000 federal loans on PSLF at $180 a month, $1,500 checking, $2,000 401(k). Net worth negative $28,500. Stress 5. Tech high. Uses Chime and TikTok. What tools get wrong: PSLF loans are not debt to attack.
a. Snapshot: a first paycheck and a plan he half trusts from TikTok.
b. Really hiring for: "am I doing this right", in a screen he can show a friend.
c. Score now: 5. PSLF correctly skips step 3 (reproduced). The FI date reads "2051 to 2090 (about 25 to 64 years from now)" at Low confidence (reproduced). Quiet Quitting FI computes to $0, so the flag fires the day he adds a milestone-less 401(k) contribution (seen in code).
d. Issues: 1. FI range useless. 2. QQ FI $0 and the flag. 3. Coast FI to 65. 4. Big e at 4.6 months ($12,840) before the Roth, 2029. 5. Rent split asks "your share or the whole bill". 6. Scorecard Retirement Hole and Goals Hole. 7. Protection, HSA, equity questions. 8. "Fund the future" Done. 9. No Chime or paste import. 10. Picture pace word.
e. Amazing: 1. Picture % and Next small things (+3%). 2. Savings rate dot on the Shockingly Simple curve. 3. FI days on a purchase. 4. PSLF handled right. 5. Payday card. 6. The 401(k) match math. 7. Hours. 8. Wins on the calendar. 9. Day 0. 10. One-pager to screenshot.
f. Unique edge: Picture % and the curve; nothing in Chime or TikTok computes his own numbers.
g. Why not: a 40-year range; being told he is over-saving at 23.
h. Would ask for: the FI date as a decade; a phone view.
i. Latent: FI days on the receipt, between sessions.
j. Overdone: FI ladder, Scorecard, protection.
k. Better: range capped or decade (+1); QQ flag fixed (+0.7); Student and early-career mode hides protection and FI ladder (+0.5); phone card (+0.5); paste import (+0.3).
l. After: 8.
m. "FI in 2051 to 2090. Thanks." "The +3% thing is a game and I played it for twenty minutes."

#### 14. Sofia Reyes, 24, lives with parents, hyperscaling
Profile: $55,000, $0 rent, $0 debt, $18,000 invested, $6,000 cash, saves 55%. Net worth $24,000. Stress 2. Tech high. Uses Fidelity and a spreadsheet. What tools get wrong: housing % and runway mean nothing at $0 rent.
a. Snapshot: the SPARKS window personified; wants to know how long to stay.
b. Really hiring for: a date to move out that does not kill the savings rate.
c. Score now: 6. Savings rate and the curve are the point and they work. Housing % blank, runway high, QQ FI $0 flag (seen in code), Coast FI to 65.
d. Issues: 1. QQ flag. 2. Coast FI to 65. 3. Taking over a bill on a date exists but lives under Next 12 months, not on the plan. 4. The move-out as a scenario does not exist. 5. Big e at 4.8 months computed on spending she does not have yet. 6. FI range Low until lines are typed. 7. Scorecard Goals Hole. 8. "Fund the future" Done. 9. Protection questions. 10. Fat FI noise.
e. Amazing: 1. Savings rate dot. 2. Taking over bills with a date. 3. FI days. 4. The timeline band. 5. Roth log by tax year. 6. Picture %. 7. Hours. 8. Big deals. 9. Snapshot. 10. One-pager.
f. Unique edge: the curve and taking-over bills; Fidelity shows balances.
g. Why not: the flag; being asked for rent she does not pay.
h. Would ask for: a move-out date with the new spending on the FI date.
i. Latent: "every month at home is worth X FI days".
j. Overdone: protection, Scorecard.
k. Better: QQ flag (+0.6); move-out scenario from taking-over bills (+0.6); Coast label (+0.3); hide housing % and runway at $0 rent (+0.3); Scorecard hidden (+0.2).
l. After: 8.
m. "I am 24 and it says I am saving too much for Quiet Quitting FI." "Taking over my phone bill in June moved my FI date three months. Cute."

#### 15. Ethan Cho, 22, barista and student
Profile: $2,100 a month, roommates, $8,000 private loans at 9%, $400 checking, no investments. Net worth negative $7,600. Stress 6. Tech high. Uses nothing. What tools get wrong: a student is not a worker with a small salary.
a. Snapshot: not yet in the game; wants to not fall behind.
b. Really hiring for: a month that balances and the loan not growing.
c. Score now: 4. Student is a work situation, but the FI age, Roth step, Prepay retirement, protection and HSA questions all show (likely); the 9% loan is heavy debt (seen in code); no investments means "Needs invested".
d. Issues: 1. Student mode hides nothing. 2. Private loan at 9% is heavy and step 3 with a decade-long date. 3. FI card blank. 4. Rent split and roommate questions. 5. Scorecard Holes. 6. Session 1 length. 7. Big e target before anything. 8. "Fund the future" Done. 9. No paste or import. 10. Picture pace.
e. Amazing: 1. Calendar and low line. 2. Little e. 3. Payday card. 4. Hours (a latte is 20 minutes). 5. Stress order. 6. Undo. 7. Snapshots. 8. Who covers it for parents' help. 9. Wins. 10. One-pager.
f. Unique edge: hours and the calendar; nothing else.
g. Why not: a tool for people with jobs.
h. Would ask for: a student mode.
i. Latent: the graduation month as Day 0.
j. Overdone: everything past the calendar.
k. Better: Student mode (+1); five-number session 1 (+0.5); FI hidden (+0.3); Scorecard hidden (+0.2).
l. After: 6.
m. "It asked me about equity pay." "The hours thing is good."

### Segment 6: Irregular or cash income

#### 16. Nova Reyes, 31, creator, 1099
Profile: lowest month $2,500, typical $6,000, $72,000 last year, $12,000 checking, no retirement account, California. Net worth $12,000. Stress 6. Tech high. Uses a spreadsheet and a tax app. What tools get wrong: they take one income number.
a. Snapshot: lumpy, taxed, nobody's employee.
b. Really hiring for: a floor she can live on and a tax pot that is right.
c. Score now: 4. Typed at $6,000 a month gross 1099, take-home shows $4,661, surplus $861, savings rate 18.5%; the safe budget (M16) says $1,875 and lives only on the Income screen (seen in code, reproduced); tax set-aside 25% flat; no California tax (seen in code); FI card "Needs invested".
d. Issues: 1. Safe budget does not drive the headline. 2. No state tax. 3. 25% set-aside. 4. No Solo 401(k) or SEP path; step 5 says Roth and HSA. 5. "Take the free money" Done as "No match on file". 6. Business costs (gear, platform fees) counted as spending, not income cost. 7. Pay frequency and next payday questions. 8. Income stability widens the Rule of 5 to 9.3 months while the Scorecard calls 3.2 months Strong (reproduced). 9. Privacy: income name on every screen and the one-pager. 10. "Fund the future" Done.
e. Amazing: 1. Lowest and typical month fields. 2. Quarterly estimates paid. 3. Runway and backups of backups. 4. Everything in the browser. 5. Client view. 6. Hours. 7. Calendar with a tax marker if built. 8. Statements for the tax app. 9. Snapshots. 10. Workbook.
f. Unique edge: nothing yet in the headline; the fields are right, the numbers ignore them.
g. Why not: a floor she typed being ignored; "Roth and HSA" as her next step.
h. Would ask for: safe budget as take-home; state tax; Solo 401(k).
i. Latent: a tax pot that fills per payout on the calendar.
j. Overdone: employer questions, protection.
k. Better: safe budget drives the headline (+1); state tax (+0.7); self-employed retirement step (+0.5); business costs before DRAFTT (+0.4); privacy mode on income names (+0.4).
l. After: 7.
m. "I typed my worst month and it used my best." "Everything stays in my browser. That matters more than they know."

#### 17. Luis Herrera, 38, rideshare and delivery
Profile: $3,800 typical month gross, $2,600 lowest, car loan $11,000 at 9.5%, gas $600, $700 checking, no retirement. Net worth negative $2,000. Stress 7. Tech low. Uses nothing. What tools get wrong: the car is the job.
a. Snapshot: one asset that is also the expense and the income.
b. Really hiring for: whether the car pays for itself and what a slow month does.
c. Score now: 3. One income number; the 9.5% car loan is heavy debt (seen in code); gas is Transportation spending, not an income cost; no Texas tax (correct) but no mileage deduction either.
d. Issues: 1. Lumpy income typed once. 2. Car loan heavy. 3. Gas and repairs as spending, not income cost. 4. 25% set-aside too high for his bracket. 5. Session 1 length and literacy of the copy. 6. Scorecard Holes. 7. FI blank. 8. "Fund the future" Done. 9. No Spanish. 10. Picture pace.
e. Amazing: 1. Calendar with the low line. 2. Payday card. 3. Hours (real hourly wage after car costs, M17 exists). 4. Backups. 5. Little e. 6. Stress order. 7. Undo. 8. Snapshots. 9. Who covers it. 10. One-pager.
f. Unique edge: real hourly wage after work costs; nothing else does it.
g. Why not: a form in English finance words; a tool that calls his car a hole.
h. Would ask for: a slow-month plan; car costs netted from income.
i. Latent: "your real hourly after the car" as the headline.
j. Overdone: nearly everything.
k. Better: safe budget as take-home (+1); work costs before DRAFTT with M17 on Home (+0.8); car loan not heavy when the car is the job (+0.5); five-number session 1 (+0.4); Scorecard hidden (+0.3).
l. After: 6.
m. "It says my car is a hole. My car is my job." "The hour number after gas was real."

#### 18. Dominique Laurent, 35, pro domme, cash heavy
Profile: $9,000 typical month, half in cash, $60,000 cash across two banks, no retirement accounts, one bank closed her account last year. Net worth $60,000. Stress 5. Tech medium. Uses QuickBooks Self-Employed. What tools get wrong: the questions assume a boss and a payroll.
a. Snapshot: cash rich, account poor, wary of every form.
b. Really hiring for: a retirement path that does not need an employer and a plan for the next bank closure.
c. Score now: 3. The income type list has Business and 1099, with employer fields behind gates; the Roth step assumes earned income shows cleanly; "Take the free money" is Done; cash above layers flag fires on $60,000; Scorecard Retirement Not rated.
d. Issues: 1. No "cash or platform" income type. 2. Bank closure risk has no home (backups list does not include a second bank). 3. Solo 401(k) and SEP absent from step 5. 4. 25% set-aside. 5. Income names on the one-pager. 6. Cash flag reads "that extra could be invested" with no path. 7. Pay frequency questions. 8. Protection asks about employer coverage. 9. "Fund the future" Done. 10. Session 1 length.
e. Amazing: 1. Everything local, export from the gear. 2. Client view. 3. Runway. 4. Statements for a lender or a landlord. 5. Hours. 6. Backups. 7. Snapshots. 8. Workbook. 9. Little e. 10. Undo.
f. Unique edge: the privacy model; QuickBooks is a cloud ledger.
g. Why not: a form built for payroll.
h. Would ask for: a cash income type; a second-bank layer; a Solo 401(k) step.
i. Latent: a "what if a bank closes me" runway line.
j. Overdone: employer and payroll questions.
k. Better: cash or platform income type (+1); self-employed retirement step (+0.7); second bank as a layer and a backup (+0.5); privacy mode (+0.4); session 1 cut (+0.4).
l. After: 6.
m. "It asked when my next paycheck lands." "It stays on my laptop. That got it a second look."

### Segment 7: Couples at different stages

#### 19. Aiden and Bex, dating a year, moving in
Profile: 27 and 29, $60,000 and $75,000, separate money, planning to split rent $2,600 and groceries. Net worth $30,000 and $55,000. Stress 3. Tech high. Use Splitwise. What tools get wrong: one household file forces a couple before they are one.
a. Snapshot: two singles who want the rent right.
b. Really hiring for: a fair split and a view of each person's own plan.
c. Score now: 4. One client file; Couple triggers married tax, family HSA and the partner-income-vs-own-share problem (seen in code). Two files mean retyping shared bills twice.
d. Issues: 1. One file per household. 2. Couple means married. 3. Partner income against own share. 4. Rent split works but "your share or the whole bill" is a question each time until About you is filled. 5. No "what if we split up" runway. 6. Scorecard. 7. FI ladder. 8. "Fund the future" Done. 9. Splitwise import none. 10. Picture pace.
e. Amazing: 1. Split by and your share. 2. Who covers it. 3. Taking over a bill. 4. Partner first name only. 5. Two paydays on the calendar. 6. Hours. 7. Snapshots. 8. One-pager each. 9. Undo. 10. FI days.
f. Unique edge: the sharing wiring with FI terms; Splitwise does not plan.
g. Why not: being married by the math.
h. Would ask for: two files with a shared bills view; "not married".
i. Latent: each person's runway if the other left.
j. Overdone: FI, Scorecard.
k. Better: married toggle and Separate-money math (+1.5); two files plus a shared view (+1); own runway (+0.3); Scorecard hidden (+0.2).
l. After: 7.
m. "It filed us jointly. We have been dating a year." "The split-the-rent part is better than Splitwise."

#### 20. Noor and Chris, engaged, merging
Profile: 31 and 33, $95,000 and $70,000, Chris has $40,000 student loans at 6%, Noor has $60,000 invested, merging accounts next year. Net worth $80,000 combined. Stress 4. Tech medium. Use shared Monarch. What tools get wrong: no walkthrough for merging.
a. Snapshot: two plans becoming one, with one debt and one nest egg.
b. Really hiring for: whether to pay the loans or invest, together.
c. Score now: 5. The FOO answers the question (6% loan is step 3, heavy at or over 8% is the line, so it is step 9 low-rate; seen in code); the two W-2 rows are taxed apart; married toggle missing; the merge itself has no steps.
d. Issues: 1. Two-earner tax. 2. Married by default now, which is right next year and wrong now. 3. No merge walkthrough (Joint, Separate, Mix exists as one picker). 4. Student loan at 6% lands in step 9 with the FI number; they expected a date. 5. Scorecard Goals Hole. 6. Wedding as an event works; honeymoon and rings as sinking funds. 7. "Fund the future" Done. 8. QQ FI $0 flag. 9. Monarch import none. 10. Picture pace.
e. Amazing: 1. Who covers it and Mix. 2. The FOO answer on loans vs invest. 3. Statements. 4. Taking over bills. 5. Milestones with dates. 6. Hours. 7. Snapshots before and after merging. 8. Day 0. 9. One-pager. 10. Workbook.
f. Unique edge: the FOO settling the loans-vs-invest argument with dates; Monarch does not.
g. Why not: tax wrong; "Fund the future Done" with a wedding unfunded.
h. Would ask for: a merge checklist; household tax once.
i. Latent: "what marriage changes" comparison.
j. Overdone: FI ladder.
k. Better: household tax once (+1); married toggle with marriage comparison (+0.8); merge checklist as an agenda template (+0.6); step 8 empty state (+0.3); Scorecard hidden (+0.3).
l. After: 8.
m. "It ended the loans-or-invest fight in one screen." "It says we have funded the future. We have not funded the wedding."

#### 21. Grace and Tomás, married ten years, two kids
Profile: 41 and 43, $150,000 and $60,000, childcare $1,800, mortgage $350,000 at 6.2%, $220,000 401(k), $25,000 checking. Net worth $415,000. Stress 5. Tech medium. A CFP once a year, nothing monthly. What tools get wrong: childcare ends; mortgages end.
a. Snapshot: comfortable, busy, no monthly rhythm.
b. Really hiring for: a monthly money date that takes 20 minutes.
c. Score now: 6. Take-home overstated about $8,800 a year by the per-row tax (reproduced); FI number $2.55M includes childcare and the mortgage forever; big e at 8.2 months ($69,700).
d. Issues: 1. Two-earner tax. 2. Childcare and mortgage in retirement spending. 3. Big e large. 4. Scorecard Goals Hole. 5. Month end takes longer than 20 minutes the first time. 6. Kids lines eight at once. 7. "Fund the future" Done. 8. Mortgage at 6.2% is step 9 low-rate when it is near the heavy line. 9. Fat FI. 10. Picture pace.
e. Amazing: 1. Month end as three steps with Looks right. 2. The monthly money date cadence on S12. 3. Statements. 4. Who covers it. 5. Calendar. 6. FI days. 7. Milestones. 8. Day 0. 9. Workbook. 10. Mortgage payoff on the chart.
f. Unique edge: the guided close with statements; nothing they use closes a month.
g. Why not: the FI number they know is high; a long first session.
h. Would ask for: childcare with an end year; "same as last month" on actuals.
i. Latent: the mortgage end as a milestone that drops spending.
j. Overdone: Scorecard, FI ladder.
k. Better: household tax (+0.8); ending lines out of FI (+0.6); "same as last month" (+0.3); kids lines fewer by default (+0.2); Scorecard hidden (+0.1).
l. After: 8.
m. "The month-end thing is the first ritual that fit in twenty minutes." "It thinks daycare lasts forever."

### Reference users

#### 22. Alexis Gillmore, 44, drag queen and club owner
Profile: Mixed income, a club draw of $4,000 and $3,000 in bookings, lumpy, $4,000 checking, club valued $150,000, $60,000 business loan at 11%, $14,000 Amex at 29%, no retirement. Net worth about $80,000. Stress 7. Tech low. Uses nothing; avoids. What tools get wrong: they feel like homework in the first minute.
a. Snapshot: will quit if it feels like a form.
b. Really hiring for: one person who makes the money feel handled, in ten minutes.
c. Score now: 3. The business loan at 11% is heavy debt, so step 3 reads "$74,000 left, Mar 2039" (reproduced); surplus $500; FI "Needs invested"; Scorecard Debt, Credit, Retirement, Goals Holes; About you has 13 core fields and three empty text boxes at the top.
d. Issues: 1. Club loan as heavy consumer debt. 2. Session 1 is a form. 3. Homework words (checklist, Must do, homework). 4. Lumpy income typed once. 5. Scorecard. 6. FI card blank. 7. Picture % "Catch up" waiting for her. 8. The club as "Business" asset with no cash flow. 9. "Fund the future" Done. 10. Twelve nodes on screen.
e. Amazing: 1. Fast Track in five minutes. 2. The payday card. 3. Undo on everything. 4. Hours: a booking is a bar tab. 5. Calendar with the Amex on its day. 6. Stress order. 7. The one sentence on Home. 8. Snapshot. 9. Who covers it. 10. Export from the gear, nothing in a cloud.
f. Unique edge: Fast Track plus undo plus hours; nothing she has tried gets to a sentence in five minutes.
g. Why not: a form, a report card, a lock, a 2039 date.
h. Would ask for: five numbers and one thing to do.
i. Latent: "what we got done today" as the only end-of-session screen.
j. Overdone: the path, the agenda, the Scorecard, the ladder.
k. Better: five-number session 1 with the agenda folded (+1.5); business loan in the business (+1); deficit and near-zero mode (+0.5); Scorecard and Picture hidden at step 1 (+0.5); safe budget as take-home (+0.5).
l. After: 7.
m. "I lasted until the thing called my club a hole." "The undo button is the only reason I touched anything."

#### 23. Tom Hutchinson, 47, CPA
Profile: $185,000 W-2, married, one kid, $600,000 401(k), $30,000 HSA, $30,000 checking, home with $280,000 left at 3.25%. Net worth $1.08M. FI age 58, 6% real, 3.5%. Stress 3. Tech high. Builds his own spreadsheet. What tools get wrong: they hide the formulas; his own fixes add eleven fields nobody uses.
a. Snapshot: trusts nothing he cannot recompute.
b. Really hiring for: a model he can audit and hand to a client without embarrassment.
c. Score now: 6. The workbook with live formulas and a Check column is exactly his thing; the per-row tax, no state line and the Roth catch-up miss are the three things he finds in ten minutes (seen in code); big e reads 9.4 months ($73,320) while the Scorecard calls his 3.8 months Strong (reproduced).
d. Issues: 1. Per-row tax. 2. No state tax outside NY. 3. Catch-up limits ignored in step 5. 4. Scorecard and FOO disagree on the emergency fund. 5. Fat FI 1.5x with no basis (QUESTIONS asks to confirm). 6. Little e at $1,000 when his deductible is $3,000. 7. FI range copy. 8. "Fund the future" Done. 9. Four return presets. 10. Spouse income types as one row.
e. Amazing: 1. Open in a spreadsheet. 2. Bring a spreadsheet back with a review. 3. Statements with a tie-out. 4. Show the math everywhere. 5. Assumptions tab with sources and dates. 6. Quiet Quitting FI. 7. Snapshots with compare. 8. Export format versioning. 9. The registries (he will read the code). 10. Day 0.
f. Unique edge: the auditable workbook and the statements; no planning tool he knows exposes its formulas.
g. Why not: a tax model he can falsify in one line.
h. Would ask for: household tax with state; typed assumptions; catch-ups; a sensitivity grid.
i. Latent: the same workbook for his clients.
j. Overdone: Picture %, Bedazzle, the pace word.
k. Better: household tax with state (+1); typed assumptions and sensitivity (+0.5); catch-ups and the deductible rule shown (+0.3); one emergency target (+0.2).
l. After: 8.
m. "It shows its work. Two of the lines are wrong, and I can say which." "If I built it, nobody would use it. Fair."

## 13. Questions for Eli

1. Couples who are not married: do you want one toggle ("married for taxes") that sets filing status, the HSA limit and the Roth limit, or should filing status stay a Taxes field the coach picks? And for Separate money, should the household headline be the client's own income against their own share, or both incomes against whole bills?
2. Taxes: is it acceptable to sum all W-2 rows (and the spouse's) before the brackets and the standard deduction, treating 1099 rows on their own schedule? That changes take-home for every two-earner client on file.
3. State tax: New York only was a Brandon answer. Which states next (California, New Jersey, Texas at zero)? Or a flat typed "state and city rate" per client until the tables exist?
4. Giving: should an obligation bucket (maaser, tithe, zakat, child support, support to chosen family) sit inside spending at step 0 with its cost in FI days, with step 5b kept only for discretionary giving? Or keep the lock and change the copy?
5. Retirement spending: should lines tagged kids, tuition, childcare, debt payment and sinking fund drop out of the FI number by default, with the full number one tap away? Which letters or categories count?
6. Quiet Quitting FI: when it computes to $0, should the step read "already past it" and the "more than QQ needs" flag wait until age 35, heavy debt gone and big e full?
7. Coast FI to 65 by default: fine, as long as the label says "to 65"? Or should session 1 ask one FI age question?
8. Deficit mode: when surplus is negative, do you want a step 0 "Stop the deficit" with ranked cuts, and the Scorecard hidden until surplus is positive? What should the ranked cuts be: variable lines by size, subscriptions, then card interest?
9. Business and tax debt: should a Business loan leave the heavy-debt step when the client has a Business asset, and should Tax debt get IRS plan fields (monthly, rate, end) and sit at step 1?
10. Variable income: when Income stability is Varies or Unpredictable, should the M16 safe budget become the take-home for surplus, savings rate and the calendar, with the typical month shown beside it?
11. A "Cash or platform" income type with no employer or payday fields, and a privacy mode that hides income names on the one-pager and in client view: yes?
12. Student and Between jobs: should those work situations hide FI age, the Roth step, Prepay retirement and Protection until the client turns them on?
13. Session 1: are you willing to make the Discovery five numbers the whole first session (About you's 13 core fields wait for session 2), and fold the agenda into one line until Start session?
14. Scorecard: hide it until session 5 for everyone, or only when the client is at step 1?
15. The FI range at Low confidence can span 40 years. Cap it at a decade, show "the 2050s", or hide the date until Medium?
16. Step 8 "Fund the future" reads Done when empty. Should an empty step read "Nothing here yet" and never count as done for the path?
17. Catch-up limits (IRA $1,100 at 50, 401(k) at 50 and 60 to 63) are in the registry but step 5 uses the base IRA limit. Add them by age?
18. Community presets: do you want a "Your community" picker on About you (Jewish with Shabbat, yom tov, Pesach, tuition, simcha and maaser; Muslim with zakat; chosen family), on by the client's choice, replacing the collapsed Budget caret?
19. Scenarios are phase 5. Would you pull three forward (a move abroad, a surgery or large medical cost, a baby) as simple spending-change-from-a-date blocks on Next 12 months?
20. Two client files for a dating or engaged couple with a shared bills view: is that a phase 6 item or never?
21. Scorecard emergency fund says Strong at 3 months while the FOO uses the Rule of 5 layers. Which one is the target?
22. Fat FI at 1.5x and little e at $1,000 are both marked "confirm" in the assumptions registry. Are they confirmed?
23. This report was committed on the designated branch with a draft pull request per the session's instructions, which conflicts with the repo's "no pull requests, push to main" rule. Which do you want for audit files?
