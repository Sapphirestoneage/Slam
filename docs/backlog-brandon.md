# Brandon beta feedback (Nov 2 2026)

First real beta session. Tester: a 24-year-old single W-2 earner in NY. No tester numbers are in the repo;
tests use synthetic households only.

The SLAM Build Spec (`spec/SLAM Build Spec.xlsx`) is still the source of truth. This file holds the batch
because a spreadsheet can't be edited cleanly in a diff. Move the rows into the spec when you next refresh it.

Status: every NOW row below is built (commits "Brandon section 1" to "section 3").

Tags: **NOW** = built in this batch. **LATER** = logged, not built.

Rules for every item: Don't Make Me Think (buttons look like buttons, inputs have borders); slim by default with
detail behind a closed More caret; copy written from the user's side; never show example numbers as real (blank
boxes or a clear "Example" label, and no total uses an example value); synthetic test data only; lean changes, one
commit per section.

> The first copy of this request was cut off in section 3. The full batch arrived Nov 3; sections 3 (rest) to 9
> and the LATER list below come from it.

## 1. Profile and intake

| # | Item | Tag | Where |
|---|---|---|---|
| B1.1 | Next button once core Profile fields are done ("Next: Income"); before that, a line saying what's left | NOW | Profile, bottom |
| B1.2 | Every field gets "I'll find it later". It adds the field to the Homework list | NOW | Profile, Income, Assets fields; the row status picker |
| B1.3 | Each Homework item has a "where to find this" hint (pay stub, benefits portal, insurance card) | NOW | Coach tools › Lists, Home Prep, Send to client |
| B1.4 | Pay frequency with its count: weekly 52, every 2 weeks 26, twice a month 24, monthly 12 | NOW | Income row |
| B1.5 | Specific paydays (e.g. the 7th and 22nd; a next payday for weekly and every-2-weeks) | NOW | Income › More; the calendar uses them |
| B1.6 | Income given as take-home, gross, or both. The app solves for the one that's missing | NOW | Income row "Given as" |

## 2. Accounts (every cash and investment account)

| # | Item | Tag | Where |
|---|---|---|---|
| B2.1 | Allocation: US stocks, intl stocks, bonds, cash, real estate, commodities, crypto, other. Must total 100%. Live total that flags until it hits 100. Dollars filled in from the balance | NOW | Account › More › Allocation |
| B2.2 | Optional target allocation, with a drift flag over 5 points | NOW | Account › More › Allocation |
| B2.3 | Holdings: ticker, name, shares, price, value, % of account, expense ratio, what it tracks, asset class | NOW | Account › More › Holdings |
| B2.4 | Holdings' asset classes feed the allocation | NOW | Allocation fills from holdings when holdings have values |
| B2.5 | Flag overlap (more than one S&P 500 / NASDAQ / Dow fund) and any holding or theme over a set % (default 25%) | NOW | Holdings |
| B2.6 | Purpose tags with a price tag: name, target amount, target date, % funded, monthly needed. One account can carry several tags with split dollars | NOW | Account › More › What it's for |
| B2.7 | Flag a goal under 5 years out that is held in stocks | NOW | What it's for |
| B2.8 | Growth and basis: contributions to date, cost basis, gain $ and %, unrealized vs realized, dividends | NOW | Account › More › Growth |
| B2.9 | Roth IRA: contribution basis tracked apart from earnings | NOW | Growth |
| B2.10 | Taxable: short-term vs long-term gains | NOW | Growth (brokerage and crypto) |
| B2.11 | Tax treatment; penalty-free access age or rule | NOW | Account › More › Details |
| B2.12 | Account fee plus weighted expense ratio, in $ a year | NOW | Details |
| B2.13 | Auto-invest on/off; dividend reinvest on/off | NOW | Details |
| B2.14 | Contribution-limit progress (uses the real pay frequency, not 26) | NOW | Account › More (Limit used this year) |
| B2.15 | Beneficiary named (yes/no); owner (individual/joint) | NOW | Details |
| B2.16 | Last updated, with a stale flag after 30 days | NOW | Details; the row |
| B2.17 | Institution plus last 4 digits | NOW | Details |
| B2.18 | Cash: account type apart from institution (money market vs HYSA), APY or 7-day yield, purpose tag | NOW | Cash row and More |
| B2.19 | Uninvested-cash alert for retirement accounts and HSAs sitting in cash | NOW | Account row; Assets strip |
| B2.20 | Net worth must equal the sum of entered balances; warn if it doesn't | NOW | Assets strip |

## 3. Account-specific fields

| # | Item | Tag | Where |
|---|---|---|---|
| B3.1 | 401(k): Roth or traditional | NOW | 401(k) › More (already Pretax / Roth / Both) |
| B3.2 | 401(k): contribution per paycheck and as % of salary (each worked out from the other) | NOW | 401(k) › More |
| B3.3 | 401(k): match tiers (e.g. 100% of the first 3%, 50% of the 4th) | NOW | 401(k) › More › Match |
| B3.4 | 401(k): vesting schedule; vested vs unvested shown apart | NOW | 401(k) › More › Match |
| B3.5 | HSA: cash vs invested | NOW | HSA › More (already there; now feeds the uninvested alert) |
| B3.6 | HSA: self-directed vs managed, with a fee comparison | NOW | HSA › More |
| B3.7 | HSA: per-paycheck contribution | NOW | HSA › More › Putting in |
| B3.8 | HSA: progress to the annual limit and paychecks left to max | NOW | HSA › More |
| B3.9 | Roth IRA: contribution log by tax year and date; maxed-for-year status | NOW | Roth IRA › More › Contributions |
| B3.10 | Employer match and 401(k) %: Income and the 401(k) fill each other, whichever is blank (answer to QUESTIONS 47) | NOW | Income › More; 401(k) › More |

## 4. Protection (cash flow, not net worth)

| # | Item | Tag | Where |
|---|---|---|---|
| B4.1 | Premiums per paycheck or per month | NOW | Coverage row |
| B4.2 | Health: in-network and out-of-network deductible and OOP max, copays; no generic coverage amount | NOW | Health › More |
| B4.3 | Disability: short-term vs long-term, benefit %, duration, waiting period | NOW | Disability › More |
| B4.4 | Life: coverage amount and a planned-change note (e.g. increase at marriage) | NOW | Life › More |
| B4.5 | Renters insurance line | NOW | In the usual list |

## 5. Taxes

| # | Item | Tag | Where |
|---|---|---|---|
| B5.1 | NY state brackets and NYC local tax | NOW | Take-home math; Taxes |
| B5.2 | Filing status; refund history with "don't know"; effective vs marginal rate | NOW | Taxes › Filing |

## 6. Spending

| # | Item | Tag | Where |
|---|---|---|---|
| B6.1 | Who covers it: me / someone else (with an optional date it becomes mine) / not for me | NOW | Line › More |
| B6.2 | Not for me folds the line away into a closed section at the bottom, where it can be restored | NOW | Budget |
| B6.3 | Per paycheck, month, quarter, year; low / average / high for variable bills | NOW | Line |
| B6.4 | Amount and date each fixed or variable | NOW (already there) | Line |
| B6.5 | My share vs the total bill, for roommates | NOW | Line › More |
| B6.6 | Add a line in every section; "Other" under Wants; a "Dates" line; Therapy apart from personal care, section renamed "Personal care and hygiene" | NOW | Budget |
| B6.7 | Several tags on one line (friends + dates) | NOW | Line › More |
| B6.8 | Recurring irregular costs (flights, trips) as their own type | NOW | Irregular and yearly costs |
| B6.9 | Pre-tax rule: insurance premiums are spending; HSA and 401(k) are not | NOW | Savings rate and surplus |
| B6.10 | Fix yearly-to-monthly conversion and slow recalculation after edits | NOW | Budget |
| B6.11 | Estimated vs actual with %, and a one-tap check to confirm an estimate as actual | NOW | Budget › Actual |
| B6.12 | Use the full screen width | NOW | Every screen |

## 7. Payday card

| # | Item | Tag | Where |
|---|---|---|---|
| B7.1 | "You get $X on [date]. $Y covers fixed bills. $Z is free to spend." Per pay period and per month | NOW | Home › Prep |

## 8. Plain-language tooltips

| # | Item | Tag | Where |
|---|---|---|---|
| B8.1 | Every jargon term (pace, coverage, buffer, surplus, Coast FI, …) gets a short tooltip | NOW | Everywhere |

## 9. Beta feedback

| # | Item | Tag | Where |
|---|---|---|---|
| B9.1 | A small "Report this" button on every screen; the note is saved with screen and time in the export | NOW | Every screen |

## LATER from the Brandon batch (logged, not built)

| # | Item | Tag |
|---|---|---|
| BL.7 | Virtual envelopes inside one account (maaser, fun money), fill-until-empty view, maaser credit for early giving, volunteer hours toward maaser | LATER |
| BL.8 | Safe-to-spend number and a mid-month check-in on the 15th | LATER |
| BL.9 | Goal calendar (ring, honeymoon, house, car) with monthly-needed math | LATER |
| BL.10 | Scenario toggle (now, engaged, married, house) changing bills, filing status, insurance; couples splits (joint, 50/50, proportional) | LATER |
| BL.11 | FOO auto-placement, including Life FOO step zeros (generosity, bedazzle your basic life) | LATER |
| BL.12 | Real FIRE dashboard calcs with show-the-math, pace presets, FIRE type explainer, milestones timeline | LATER |
| BL.13 | Duolingo mode (1 to 2 questions a day); money personality quiz routing to skills and reading | LATER |
| BL.14 | Rocket Money and spreadsheet import, export to Excel, private shareable app | LATER |
| BL.15 | Rich-life list with prices, joy score per expense, memory dividends, marginal-utility ranking, lifestyle inflation tool, regret view, Money Wrapped | LATER |
| BL.16 | Group several expenses into one event (a day trip) | LATER |
| BL.17 | Drag and drop needs vs wants; custom splits instead of 50/30/20 | LATER |
| BL.18 | Money calendar and month-end close (partly built: cash flow calendar, month-end close, Your year) | LATER |
| BL.19 | Auto session summary: top 10 takeaways and the client's next 5 steps | LATER |
| BL.20 | Rough / privacy mode: ranges instead of exact balances | LATER |
| BL.21 | Defined beta stages and version notes for testers | LATER |

## LATER found while building

| # | Item | Tag |
|---|---|---|
| BL.1 | "I'll find it later" on Debt, Protection and Spending fields (row status already has it) | LATER |
| BL.2 | Look up ticker prices and fund data (what it tracks, expense ratio) instead of typing them | LATER |
| BL.3 | Allocation and drift rolled up across every account (household mix) | LATER |
| BL.4 | Purpose tags feeding Plan › Goals, so a tagged account funds its goal there | LATER |
| BL.5 | One source for the employer match: now built as fill-each-other (B3.10) | Done |
| BL.6 | Vesting schedule driving the unvested amount by date | LATER |

---

# Missed-ideas batch (Nov 2 2026, follow-up)

Same rules as above, plus: every new field offers "I don't have this" and "I'll find it later" (the latter adds it
to Homework). Status: every NOW row is built (commits "Missed ideas section 1" to "section 10").

## M1. Credit cards and credit

| # | Item | Tag | Where |
|---|---|---|---|
| M1.1 | Credit cards with name, institution, limit, balance, APR, 0% promo end, annual fee, rewards type, autopay, statement date, due date | NOW | Debt › Credit cards (kept as a Debt type: one record, R049, R115) |
| M1.2 | Utilization per card and overall, computed | NOW | Card row More; a line under the Debt strip |
| M1.3 | Credit score with source and date checked | NOW | Debt, Credit score card |

## M2. Employer benefits

| # | Item | Tag | Where |
|---|---|---|---|
| M2.1 | One Benefits card: yes / no / don't know for commuter, health FSA, dependent care FSA, ESPP, tuition reimbursement, employer HSA contribution, after-tax 401(k) | NOW | Profile › Benefits at work |
| M2.2 | A yes opens only that benefit's fields (amount, per paycheck or per year, ESPP discount %) | NOW | Profile › Benefits at work |
| M2.3 | Employer HSA contribution counts toward the HSA limit | NOW | Assets › HSA, Limit used |
| M2.4 | Commuter nudge with yearly tax savings at the marginal rate | NOW | Profile › Benefits at work; Budget |

## M3. Tax withholding flag

| # | Item | Tag | Where |
|---|---|---|---|
| M3.1 | Last year's refund or owed (or don't know); W-4 filing status and extra withholding | NOW | Taxes › Filing |
| M3.2 | Flag only: large refund = may be over-withholding; owed = check withholding | NOW | Taxes › Filing |

## M4. Annual money calendar

| # | Item | Tag | Where |
|---|---|---|---|
| M4.1 | Year view of known yearly events: lease renewal with rent increase, open enrollment, IRA deadline, tax day, insurance renewals, card annual fees, your own events | NOW | Plan › Next 12 months, Your year |
| M4.2 | Each event can carry a cost that feeds a sinking fund | NOW | Plan › Next 12 months |

## M5. Sinking funds

| # | Item | Tag | Where |
|---|---|---|---|
| M5.1 | Any yearly or irregular cost (Spending or the calendar) can become a sinking fund: target, due date, monthly needed, % funded | NOW | Plan › Next 12 months, Sinking funds |
| M5.2 | A sinking fund can link to an account's purpose tag | NOW | Sinking funds; dollars come from the tag |

## M6. Net worth snapshots

| # | Item | Tag | Where |
|---|---|---|---|
| M6.1 | Save snapshot button (already there) plus an automatic one at each month-end close | NOW | Home; Spending › Month-end close |
| M6.2 | Line chart of total and liquid net worth over time, collapsed on Home | NOW | Home › Prep |

## M7. Who covers what

| # | Item | Tag | Where |
|---|---|---|---|
| M7.1 | Covered by someone: who (parents, partner, employer, other) and an optional takeover date | NOW | Spending line › Who pays |
| M7.2 | One "Taking over" list: each covered item, its cost, its date, and the monthly total added on each date | NOW | Plan › Next 12 months |

## M8. Life admin checklist

| # | Item | Tag | Where |
|---|---|---|---|
| M8.1 | Done / not yet / not for me: beneficiaries on each account, basic will, healthcare proxy, credit freeze at all three bureaus, renters insurance | NOW | Protection › Life admin |
| M8.2 | Not yet shows on the Homework list | NOW | Coach tools › Lists |

## M9. Community presets (off by default)

| # | Item | Tag | Where |
|---|---|---|---|
| M9.1 | When on: yom tov and Pesach cost lines, a kosher grocery note, future tuition as a goal type | NOW | Coach tools › Session setting; Budget; Plan › Goals |
| M9.2 | Maaser: on gross or take-home, a % (default 10%) | NOW | Budget, Maaser card |

## M10. Onboarding timer (builder only, behind the gear)

| # | Item | Tag | Where |
|---|---|---|---|
| M10.1 | Times for profile started, first computed number shown, core profile done, full profile done | NOW | Coach tools › Session |
| M10.2 | Durations in the coach view and in the export | NOW | Coach tools › Session; export file |

## LATER (logged, not built)

| # | Item | Tag |
|---|---|---|
| ML.1 | Roth vs traditional per account: federal + state + local marginal rate now vs an estimated rate in retirement | LATER |
| ML.2 | Spend-more number: how much more a month you could spend and still reach FI at the same age (Die With Zero), from the projection engine | LATER |
| ML.3 | Full W-4 withholding calculator | LATER |
| ML.4 | Credit card rewards optimizer | LATER |
| ML.5 | Think-aloud test mode: a tester-drives view with "Report this" pinned open | LATER |
