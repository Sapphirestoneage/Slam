# Brandon beta feedback (Nov 2 2026)

First real beta session. Tester: a 24-year-old single W-2 earner in NY. No tester numbers are in the repo;
tests use synthetic households only.

The SLAM Build Spec (`spec/SLAM Build Spec.xlsx`) is still the source of truth. This file holds the batch
because a spreadsheet can't be edited cleanly in a diff. Move the rows into the spec when you next refresh it.

Tags: **NOW** = built in this batch. **LATER** = logged, not built.

Rules for every item: Don't Make Me Think (buttons look like buttons, inputs have borders); slim by default with
detail behind a closed More caret; copy written from the user's side; never show example numbers as real (blank
boxes or a clear "Example" label, and no total uses an example value); synthetic test data only; lean changes, one
commit per section.

> The request was cut off partway through section 3 (after "HSA: cash vs invested, self-directed vs managed with
> a fee comparison, per-pay"). Everything after that point is missing, including any LATER list. See
> QUESTIONS.md, Brandon batch.

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
| B2.14 | Contribution-limit progress (uses the real pay frequency, not 26) | NOW | Details |
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
| B3.7 | HSA: "per-pay…" (cut off; read as per-paycheck contribution) | NOW, partly | HSA › More › Putting in |
| B3.8 | Anything after B3.7 | ? | Missing from the request |

## LATER found while building

| # | Item | Tag |
|---|---|---|
| BL.1 | "I'll find it later" on Debt, Protection and Spending fields (row status already has it) | LATER |
| BL.2 | Look up ticker prices and fund data (what it tracks, expense ratio) instead of typing them | LATER |
| BL.3 | Allocation and drift rolled up across every account (household mix) | LATER |
| BL.4 | Purpose tags feeding Plan › Goals, so a tagged account funds its goal there | LATER |
| BL.5 | One source for the employer match: Income › More still has the simple "% up to %"; the 401(k) tiers are the fuller version | LATER |
| BL.6 | Vesting schedule driving the unvested amount by date | LATER |
