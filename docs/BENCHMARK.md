# Financial Coaching Jobs: How Leading Software Handles Them

A benchmark of eight personal finance and planning products, built to compare against SLAM (a coach-run planning app). Each table covers one job a coach does with a client. Cells describe where the feature lives, what the user enters, the controls, and the default behavior, paraphrased from each product's own help center, product pages or blog, with reputable reviews filling gaps.

**Products:** YNAB, Monarch Money, Rocket Money, eMoney Advisor, RightCapital, Boldin (formerly NewRetirement), ProjectionLab. Copilot Money appears only in the recurring bills and budget rows.

**Rules used:** "not found" means the sources I could reach did not describe it (the feature may still exist). "Does not do this" is used only where the sources make clear the product has no such feature. Research done November 2026.

**Source caveats:** eMoney's help center sits behind an advisor login, so eMoney cells rely on eMoney's blog and press releases plus a client portal user guide hosted on simplebooklet (likely written by an advisory firm, not eMoney itself). Many Boldin help articles are video-only, so their text could not be read.

---

## 1. First-run onboarding and first data entry

| Product | How it works | Source |
|---|---|---|
| YNAB | Web: answers a few spending questions, YNAB builds starter categories and targets, then you add accounts (linked or unlinked). Mobile: add checking and active cards first, then YNAB suggests targets from linked history. Last step is assigning the checking balance until Ready to Assign hits $0. | [YNAB: Getting Started](https://support.ynab.com/en_us/getting-started-with-ynab-BJBFUjkUGg) |
| Monarch | Getting Started Guide lists five stages you can do in any order: connect accounts (checking, savings, main cards first), review categories, create a budget (Flex or Category), set a goal, personalize. Linking accounts comes first. | [Monarch: Getting Started Guide](https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-Guide) |
| Rocket Money | You must link at least one checking account. Plaid pulls transactions, then the app finds recurring bills and shows what is left to spend. | [Motley Fool review](https://www.fool.com/money/personal-finance/rocket-money-review), [Rocket Money blog](https://www.rocketmoney.com/learn/personal-finance/get-the-most-from-rocket-money) |
| eMoney | Advisor sends a portal invite. The client registers (2FA, security questions). eMoney's suggested workflow: welcome kit with a document checklist, intro meeting, help connecting accounts and uploading documents, then portal tasks such as a fact-finding worksheet. The advisor side flags missing fact fields. | [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1), [eMoney fact-finding infographic](https://emoneyadvisor.com/wp-content/uploads/2024/08/Infographic_FactFinding_Workflow.pdf), [Financial Planning review](https://www.financial-planning.com/news/tech-review-emoneys-next-generation) |
| RightCapital | Fixed six-step interview: Family, Income, Savings, Net Worth, Expenses, Goals. Some cards come pre-filled (salary, 401(k), retirement age) to fill or skip. Advisors can customize the steps with Onboarding templates. | [RightCapital: default onboarding](https://help.rightcapital.com/faq/advisor-portal/clients/client-onboarding/client-onboarding2), [RightCapital: data entry](https://help.rightcapital.com/data-entry/creating-plans-and-data-entry) |
| Boldin | A "first month" milestone guide: profile first (name, age, retirement goal, partner), then accounts (link or manual), investments, income, spending, then review the Overview (chance of success, safe spending target, net worth), then check assumptions. | [Boldin: First Month guide](https://help.boldin.com/en/articles/16963882-your-first-month-with-boldin-a-milestone-guide) |
| ProjectionLab | Choose Sandbox Mode (sample data) or the Normal Walkthrough (guided entry of age, income, assets, liabilities). No bank linking needed. Leaving the sandbox means wiping the sample data in Settings. | [ProjectionLab: account setup](https://projectionlab.com/help/account-setup) |

## 2. Adding accounts and how they are grouped

| Product | How it works | Source |
|---|---|---|
| YNAB | Sidebar groups: Cash (checking, savings, cash), Credit (card, line of credit), Loans (mortgage, auto, student, etc.), Tracking (asset or liability), Closed. Investment and retirement accounts go in Tracking and stay off-budget. Groups collapse with an arrow. No 401(k), IRA or HSA subtypes found. | [YNAB: Account Types](https://support.ynab.com/en_us/account-types-an-overview-BkmGM0qCq) |
| Monarch | "Add account" (web) or + (mobile) on the Accounts page. Search the institution, or create a manual account. Special manual types for a home (Zillow value) and company equity. How the Accounts page groups accounts, and 401(k)/IRA/HSA subtypes: not found. | [Monarch: Connect or Manually Add](https://help.monarch.com/hc/en-us/articles/360048393392-Connect-or-Manually-Add-Accounts) |
| Rocket Money | Link checking, savings, cards and investments through Plaid. Net Worth splits into Summary, Assets and Debt views. Manual assets and loans get an Update button. Retirement subtypes: not found. | [Motley Fool review](https://www.fool.com/money/personal-finance/rocket-money-review), [Rocket Money: net worth](https://help.rocketmoney.com/en/articles/5350243-how-is-net-worth-calculated), [Rocket Money: update balance](https://help.rocketmoney.com/en/articles/5350313-how-do-i-update-the-balance-of-an-asset-or-loan) |
| eMoney | Client portal: Add Account from Home or Organizer > Accounts. Search an institution, or pick "I don't have an online login" for manual entry (holdings by ticker). Home shows accounts in collapsible categories; Investments splits Taxable from Tax Advantaged. | [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1) |
| RightCapital | Accounts are added in the Net Worth step with "Add Account" and a type picker (aggregation on higher tiers). Contributions are entered separately in Savings ("Add Saving": IRA, HSA, 529), and each feeds a matching account bucket. | [RightCapital: data entry](https://help.rightcapital.com/data-entry/creating-plans-and-data-entry), [RightCapital: Savings](https://help.rightcapital.com/data-entry/savings) |
| Boldin | My Plan > Assets and Debts. 15 account types including 401(k), 403(b), 457(b), IRAs, HSA, 529. Manual entry, or linking on the paid tier. How accounts are grouped on screen: not found. | [Rob Berger Boldin review](https://robberger.com/?p=5431), [Boldin: Assets and Debts articles](https://help.boldin.com/en/collections/2491184-assets-and-debts) |
| ProjectionLab | Current Finances (pie chart icon) holds savings, investments, real assets and debts, all typed in by hand. Investments > Add Investments > Employer Retirement Accounts lists 401(k), Roth 401(k), 403(b), Roth 403(b), 457(b), Roth 457(b), 401(a), each with balance, owner and cost basis. Plugins can sync balances from YNAB or Monarch. | [ProjectionLab: employer accounts](https://projectionlab.com/help/how-do-i-add-employer-retirement-accounts), [ProjectionLab: update balances](https://projectionlab.com/help/update-account-balances) |

## 3. Income and paychecks

| Product | How it works | Source |
|---|---|---|
| YNAB | No paycheck model. One "Your Expected Income" number in Edit Plan, shown next to the month's target total. Real income lands as transactions in Ready to Assign. Gross vs net, pay frequency, match, raises: not found. | [YNAB: Edit Plan and Cost to Be Me](https://support.ynab.com/en_us/plan-and-adjust-with-edit-plan-and-cost-to-be-me-ByR7vpqPyx) |
| Monarch | The budget total starts from expected monthly income (income categories). Forecasting asks for take-home income. Gross, frequency, employer match: not found. | [Monarch: Budget](https://help.monarch.com/hc/en-us/articles/360048883631-Budget), [Monarch: Forecasting](https://help.monarch.com/hc/en-us/articles/48344305092244-Forecasting-in-Monarch) |
| Rocket Money | Budget setup step 1 estimates monthly income from detected paychecks. Adjust with a slider or +/- buttons, and review the transactions behind it. Gross, frequency, match: not found. | [Rocket Money: Creating a Budget](https://help.rocketmoney.com/en/articles/2649810-creating-a-budget) |
| eMoney | Portal Organizer has Employment, Income and Savings sections; advisor facts cover income and savings. Specific fields (gross, match, raises): not found. | [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1), [Financial Planning review](https://www.financial-planning.com/news/tech-review-emoneys-next-generation) |
| RightCapital | Salary drawer: name, owner, gross annual pre-tax amount (taxes applied for you), start and end (default "already started" to retirement), annual increase. Annual only. The 401(k) card sets contribution as fixed $, % of income or max, plus primary and secondary employer match, flat match, and a yearly increase rate. | [RightCapital: Salary](https://help.rightcapital.com/data-entry/income/salary-income), [RightCapital: 401(k)](https://help.rightcapital.com/data-entry/savings/401k/401-k-savings) |
| Boldin | Work income with growth rates. Paycheck contributions ("Income Linked") take $, %, or both, with auto-escalation, an IRS-limit cap, and a stop date that follows the work end date. Employer money goes in as a Non Elective Contribution. Help treats income as gross with pre-tax benefits subtracted. | [Boldin: contribution types](https://help.boldin.com/en/articles/6139975-what-types-of-contributions-can-i-enter), [Boldin: payroll deductions](https://help.boldin.com/en/articles/8560570-how-do-i-account-for-health-insurance-premiums-and-other-payroll-deductions) |
| ProjectionLab | Income stream: amount in today's or actual currency, frequency (yearly default; monthly, quarterly and others), start and end tied to a date or milestone, growth (inflation default, fixed %, inflation plus %, custom), withholding (automatic, fixed rate, none). Employer match: not found. | [ProjectionLab: Adding Income](https://projectionlab.com/help/add-income-to-your-plan) |

## 4. Recurring bills: amount, frequency, due date, calendar

| Product | How it works | Source |
|---|---|---|
| YNAB | Scheduled transaction from an account register (Add Transaction). Date picker sets the next occurrence; "Repeat" defaults to Never, with Daily, Weekly, Every other week, Twice a month, Every four weeks, Monthly, Every other month, Every three months, Every four months, Twice a year, Yearly, Every other year. Appears in a collapsible "Scheduled" section of the register. No bills calendar found. | [YNAB: Scheduled Transactions](https://support.ynab.com/en_us/scheduled-transactions-a-guide-BygrAIFA9) |
| Monarch | Recurring page: "Manage recurring" (web) or + (mobile). Link synced cards and loans, search a merchant, or let Monarch find patterns. Amount, frequency and date are edited in "Edit merchant details". "Twice a month" means the 1st and 15th, moved earlier on weekends. List or calendar toggle: green check paid, yellow paid a different amount, blue upcoming. Full list of frequencies: not found. | [Monarch: Recurring](https://help.monarch.com/hc/en-us/articles/4890751141908) |
| Rocket Money | Recurring tab, + (mobile only). Pick a service or type a name, use Find Transactions to attach past charges, review next due date and amount, Save. The Upcoming tab is a two-week calendar (Premium); the All tab lists everything, with an Inactive section. Frequency labels: not found. | [Rocket Money: bills and subscriptions](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions) |
| Copilot | Create from the Recurring view (+, then search a transaction) or from a transaction. Copilot guesses the frequency (for example "Every month"; weekly, bi-weekly, monthly, non-monthly) and sets match filters (name, amount range, day-of-month window). Matches get an [R] tag; the Dashboard shows an "Upcoming" strip. | [Copilot: Create Recurrings](https://help.copilot.money/en/articles/3760068-create-recurrings), [Copilot: Dashboard](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview) |
| eMoney | No bills calendar or due-date control found. Recurring charges are handled with spending rules that auto-categorize them; alerts and reminders are configurable. | [eMoney blog: Spending area](https://blog.emoneyadvisor.com/best-practices/emoneys-client-site-spending-area/), [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1) |
| RightCapital | Living expenses go in as a total on an Expenses card ("Add Expense" for extras). Extra debt payments carry amount, frequency and date. No bill due dates or calendar found. | [RightCapital: data entry](https://help.rightcapital.com/data-entry/creating-plans-and-data-entry), [RightCapital: Debt](https://help.rightcapital.com/module-overview/client-portal/more-menu/debt) |
| Boldin | Recurring expenses in My Plan. Detailed Budgeter lines are added by how often they occur (help covers annual, monthly, quarterly), in today's dollars with inflation. No due dates or calendar found. | [Boldin: Basic vs Detailed Budgeter](https://help.boldin.com/en/articles/4303030-what-is-the-difference-between-the-basic-and-the-detailed-budgeter) |
| ProjectionLab | "+ Add Expense" below the chart, 15 types, start and end by date or milestone. Plans run yearly, so no due dates or calendar found; expense frequency labels: not found. | [ProjectionLab: Adding Expenses](https://projectionlab.com/help/adding-expenses-to-your-plan) |

## 5. Budget categories: structure, totals, starter amounts

| Product | How it works | Source |
|---|---|---|
| YNAB | Category groups hold categories; Ready to Assign at top. Each category can have a target: cadence Weekly, Monthly, Yearly or Custom, behavior "Set aside another..." or "Refill up to...", and Custom adds "Have a balance of..." by a date. Starter targets come from onboarding answers or linked history. "Cost to Be Me" totals all targets. | [YNAB: Targets](https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC), [YNAB: Basics](https://support.ynab.com/en_us/getting-started-ynab-basics-and-key-terms-BJCaIHaTZe), [YNAB: Cost to Be Me](https://support.ynab.com/en_us/plan-and-adjust-with-edit-plan-and-cost-to-be-me-ByR7vpqPyx) |
| Monarch | Three tiers: type (Income, Expenses, Transfers, fixed) > group > category, about 60 starter categories. First visit pre-fills each category with its 6-month average ("Recalculate default budgets" reruns it). Flex mode (default) uses Fixed, Flexible and Non-monthly buckets. Group budgeting swaps the category lines for one group amount. | [Monarch: Budget](https://help.monarch.com/hc/en-us/articles/360048883631-Budget), [Monarch: Group Budgeting](https://help.monarch.com/hc/en-us/articles/18345219809940-Group-Budgeting) |
| Rocket Money | Three-step setup: Income, Bills (choose from detected recurring), Spending categories with a suggested monthly amount equal to average spend. Total budget and projected savings update as you edit. Free tier gets 2 custom categories, Premium unlimited. Groups: not found. | [Rocket Money: Creating a Budget](https://help.rocketmoney.com/en/articles/2649810-creating-a-budget), [Motley Fool review](https://www.fool.com/money/personal-finance/rocket-money-review) |
| Copilot | Category groups (for example Food) have their own budget plus an "unassigned" amount on top of subcategory budgets. Budgets can be the same for all months or set per month; a change cascades to later months that have no amount of their own. Rollovers optional. | [Copilot: Groups](https://help.copilot.money/en/articles/3767655-groups-of-categories), [Copilot: Editing budgets by month](https://help.copilot.money/en/articles/6206293-editing-budgets-by-month) |
| eMoney | Portal Spending tab: auto-categorized transactions, a custom budget per category, or Auto-Budget from about 6 months of spending. Transfers and card payments are neutral. "Estimate from Spending" fills the Organizer's living expenses. Groups: not found. | [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1), [eMoney blog: budgeting basics](https://blog.emoneyadvisor.com/best-practices/emoney-tip-week-client-portal-budgeting-basics/) |
| RightCapital | Dashboard > Budget: each category has a monthly field, total in the lower right, and an Avg. monthly spend column for reference (time frame dropdown). "Copy From" imports amounts from Profile expenses. Categories edited in Settings > Budget Categories or advisor templates. Groups: not found. | [RightCapital: Creating a Budget](https://help.rightcapital.com/knowledge-base/client-portal/dashboard/budget/creating-a-budget-budget-analysis) |
| Boldin | Choose Basic Budgeter (one total) or Detailed Budgeter (sections of line items). Two parallel budgets, "Must Spend" and "Like to Spend". Healthcare is its own category with a higher inflation rate. Starter amounts: not found. | [Boldin: Basic vs Detailed Budgeter](https://help.boldin.com/en/articles/4303030-what-is-the-difference-between-the-basic-and-the-detailed-budgeter), [Boldin: First Month guide](https://help.boldin.com/en/articles/16963882-your-first-month-with-boldin-a-milestone-guide) |
| ProjectionLab | No monthly budget. Expenses are typed and tagged Essential, Discretionary or Hybrid (discretionary is cut first in a shortfall). Cash flow priorities set where surplus goes. | [ProjectionLab: Adding Expenses](https://projectionlab.com/help/adding-expenses-to-your-plan), [ProjectionLab: Getting Started](https://projectionlab.com/blog/getting-started-with-projectionlab) |

## 6. Editing a line or category

| Product | How it works | Source |
|---|---|---|
| YNAB | Web: select the category row in the plan, then edit in the right-side Inspector ("Create Target", "Edit Target", "Save Target"). Mobile: the category's Details screen, or Edit Plan (pencil). | [YNAB: How to Use Targets](https://support.ynab.com/en_us/how-to-use-targets-rk5kkI9ks), [YNAB: Inspector](https://support.ynab.com/en_us/the-inspector-an-overview-ryylY7OCq) |
| Monarch | Inline: click the amount box and type; a popup shows past spending for that category. Click a red remaining amount to move money from another category. Setting $0 tucks the row to the bottom of its group. | [Monarch: Budget](https://help.monarch.com/hc/en-us/articles/360048883631-Budget) |
| Rocket Money | Tap a category to edit its amount; income and bills are changed from a filter icon. | [Rocket Money: Creating a Budget](https://help.rocketmoney.com/en/articles/2649810-creating-a-budget) |
| eMoney | Budget amounts set in the Budgets section; open a transaction to recategorize it and create a rule from Details. Inline vs modal: not found. | [eMoney blog: budgeting basics](https://blog.emoneyadvisor.com/best-practices/emoney-tip-week-client-portal-budgeting-basics/) |
| RightCapital | Data lives on cards; click a card to open an entry "drawer". Blue buttons top right add cards. | [RightCapital: data entry](https://help.rightcapital.com/data-entry/creating-plans-and-data-entry), [RightCapital: Salary](https://help.rightcapital.com/data-entry/income/salary-income) |
| Boldin | not found | [Boldin help center](https://help.boldin.com/en/) |
| ProjectionLab | Items are edited in sections below the chart on the Plan tab, and the chart updates right away. An events icon excludes an item temporarily. Side panel vs dialog: not found. | [ProjectionLab: Getting Started](https://projectionlab.com/blog/getting-started-with-projectionlab) |

## 7. Debts and payoff plans

| Product | How it works | Source |
|---|---|---|
| YNAB | Loan Planner lives inside each loan account (simulator on web only). Test extra monthly, one-time and round-up payments; a burndown chart shows time and interest saved. Avalanche/snowball: not found. | [YNAB: Loan Planner](https://ynab.com/blog/ynab-loan-planner) |
| Monarch | Goals > Pay down: every liability shows up as a goal. Uses each account's rate, minimum and planned payment. Pick Avalanche, Snowball or Planned payments; a savings calculator tests recurring or one-time extras without changing real payments. Summary cards show the debt-free date; "Save to Budget" copies the plan into the budget. | [Monarch: Pay Down Goals](https://help.monarch.com/hc/en-us/articles/44373293932052-Using-Pay-Down-Goals) |
| Rocket Money | Does not do this. Help has an educational avalanche vs snowball article but describes no in-app payoff planner. | [Rocket Money: Avalanche vs Snowball](https://help.rocketmoney.com/en/articles/5857262-accelerate-your-debt-payoff-avalanche-vs-snowball-method) |
| eMoney | not found (eMoney said debt reduction was still under development for its Needs Analysis tool) | [InvestmentNews](https://www.investmentnews.com/fintech/emoney-supports-focused-financial-planning-with-enhanced-needs-analysis/259881) |
| RightCapital | More menu > Debt, with Strategy, Payment and Details subtabs. Priority is highest interest first or smallest balance first; freed payments roll to the next debt; spare cash flow can be added. One-time or recurring extra payments (amount, loan, frequency, date) toggle on and off. Refinance modeling. Payoff shows in the chart and amortization schedules. | [RightCapital: Debt module](https://help.rightcapital.com/module-overview/client-portal/more-menu/debt) |
| Boldin | Debts sit in Assets and Debts. Extra or lump-sum payments are a Transfer: My Plan > Money Flows > "Add a Transfer +", then from account, to debt, amount, year. Avalanche/snowball and payoff date display: not found. | [Boldin: lump sum payments](https://help.boldin.com/en/articles/4312672-how-do-i-make-lump-sum-debt-payments) |
| ProjectionLab | A debt has balance, APR and monthly payment. Extra payments are a Flow ("Extra Financed Asset Payments") sized as max budget allows, % of remaining income, fixed $, or % of balance, limited to years or milestones. The plan shows the new payoff year. Avalanche/snowball: not found. | [ProjectionLab: early loan payoff](https://projectionlab.com/help/early-loan-pay-off) |

## 8. Credit cards and credit health

| Product | How it works | Source |
|---|---|---|
| YNAB | Each card account gets an automatic Credit Card Payment category that collects money as you spend from funded categories. Score, utilization, rewards: not found. | [YNAB: Handling Credit Cards](https://support.ynab.com/en_us/handling-credit-cards-overview-ry7cNub1s) |
| Monarch | Dashboard credit score widget: VantageScore 3.0 from Equifax, refreshed monthly, with factors listed. Utilization appears as a progress bar per card on Accounts, from the card limit (editable). Rewards: not found. | [Monarch: Credit Score](https://help.monarch.com/hc/en-us/articles/38550304735508-Viewing-Your-Credit-Score), [Monarch: Utilization](https://help.monarch.com/hc/en-us/articles/39587584456596-Tracking-Credit-Utilization) |
| Rocket Money | Experian FICO Score 2, refreshed monthly with a history chart; Premium adds the full report, refreshed monthly when you open it. A Credit Report Card shows five factors, with utilization under amounts owed. Rewards: not found. | [Rocket Money: FICO 101](https://help.rocketmoney.com/en/articles/8887948-fico-credit-score-101), [Rocket Money: refresh](https://help.truebill.com/en/articles/3980129-how-often-is-my-credit-score-report-refreshed) |
| eMoney | not found | [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1) |
| RightCapital | not found | [RightCapital: modules](https://help.rightcapital.com/getting-started/client-plan-overview) |
| Boldin | not found | [Boldin: Assets and Debts articles](https://help.boldin.com/en/collections/2491184-assets-and-debts) |
| ProjectionLab | not found | [ProjectionLab help](https://projectionlab.com/help) |

## 9. Goals

| Product | How it works | Source |
|---|---|---|
| YNAB | Goals are category targets: a Custom target with "Have a balance of..." by a "Due on" date asks for the remainder over time. Mobile Home lets you pin a current goal. Linking goals to accounts: not found. | [YNAB: Targets](https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC), [YNAB: mobile spaces](https://support.ynab.com/en_us/spaces-in-the-mobile-app-S1iIZQoqgg) |
| Monarch | Save Up goal: target amount, target date and planned monthly contribution (all three needed for On track, Ahead or At risk). Fund from chosen accounts fully or partly. A dotted projection line, and Monarch can recommend a monthly amount. | [Monarch: Save Up Goals](https://help.monarch.com/hc/en-us/articles/44373182867476-Using-Save-Up-Goals) |
| Rocket Money | Financial Goals (Premium, mobile only): Savings > Start Saving, pick a type, name it, enter a target amount, then Smart Savings (Comfy, Moderate, Aggressive pace) or a fixed monthly amount, and link checking. No target date field found. | [Rocket Money: Creating a Goal](https://help.rocketmoney.com/en/articles/2621011-creating-a-financial-goal) |
| eMoney | Portal My Plan shows a ribbon of goal topics; Add Goal if the advisor allows it; a View dropdown shows probability of success. Mobile marks goals green (on track) or red (shortfall). Advisor Goal Planner compares up to four scenarios. | [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1), [eMoney blog: Monte Carlo](https://blog.emoneyadvisor.com/best-practices/monte-carlo-analysis-in-emoney/) |
| RightCapital | Goals step: cards for retirement age, retirement expenses, healthcare and long-term care; "Add Goal" for education or purchases. Monthly-needed display and account linking: not found. | [RightCapital: data entry](https://help.rightcapital.com/data-entry/creating-plans-and-data-entry) |
| Boldin | Retirement goal set in the profile; a Summary and Milestones area tracks life goals. Target, date and monthly-needed fields: not found. | [Boldin: planner tour](https://www.boldin.com/retirement/video-get-started-series-1-a-tour-of-the-boldin-planner/), [Boldin: First Month guide](https://help.boldin.com/en/articles/16963882-your-first-month-with-boldin-a-milestone-guide) |
| ProjectionLab | Milestones with criteria: presets for FI, FIRE, CoastFIRE, LeanFIRE, FatFIRE, or custom (for example liquid net worth reaching a multiple of expenses). They appear on the chart with an icon and color and start or stop linked events. Monte Carlo lists when each was reached. | [ProjectionLab: Milestones](https://projectionlab.com/blog/milestones) |

## 10. Retirement / FI projection

| Product | How it works | Source |
|---|---|---|
| YNAB | not found (no projection feature in the help docs reviewed) | [YNAB: mobile spaces](https://support.ynab.com/en_us/spaces-in-the-mobile-app-S1iIZQoqgg) |
| Monarch | Forecasting: year-by-year net worth and cash flow to age 90. Shows inflation (3%), growth by account type (for example 7% investments, 2% savings), tax rates and withdrawal order. Drag retirement on the chart, add life events, save scenarios. One projected line, no ranges found; today's or future dollars toggle. | [Monarch: Forecasting](https://help.monarch.com/hc/en-us/articles/48344305092244-Forecasting-in-Monarch) |
| Rocket Money | Does not do this (no retirement or FI projection in its feature overview). | [Rocket Money blog](https://www.rocketmoney.com/learn/personal-finance/get-the-most-from-rocket-money) |
| eMoney | Monte Carlo (1,000 trials) in Decision Center, Goal Planner and Reports. Probability of success; Asset Spread shows 80/50/20 outcome bands; Confidence Age for longevity. What-ifs via a Plans/Techniques toggle, with color-coded techniques you switch on and off; stress tests such as an early death. Scoring ranges and colors are set in Settings. | [eMoney blog: Monte Carlo](https://blog.emoneyadvisor.com/best-practices/monte-carlo-analysis-in-emoney/), [eMoney blog: Decision Center](https://blog.emoneyadvisor.com/best-practices/demonstrate-your-value-to-prospects-with-decision-center/) |
| RightCapital | Retirement > Analysis puts the Current and Proposed plans side by side, each with probability of success (1,000 Monte Carlo trials) and median ending assets. Action Items below change inputs for the proposal. Tabs include Stress Test, Social Security, Health Care and Cash Flows; today's or future dollars toggle. | [RightCapital: Retirement](https://help.rightcapital.com/module-overview/client-portal/retirement/retirement), [RightCapital: Probability tab](https://help.rightcapital.com/knowledge-base/client-portal/retirement/analysis/probability-tab-retirement-analysis) |
| Boldin | Chance of success (1,000 Monte Carlo runs on the paid tier) with an optimistic, average or pessimistic assumptions switch, and a Safe Spending Target at 80% success. Up to 10 saved scenarios (compare 3), plus Explorers for market risk, Roth conversions and Social Security. | [Rob Berger Boldin review](https://robberger.com/?p=5431), [Boldin: Monte Carlo](https://www.boldin.com/retirement/sp-plp-monte-carlo/) |
| ProjectionLab | Chance of Success tab runs Monte Carlo or historical backtests, showing outcome percentiles, milestone timing and failed trials. Custom return distributions and success labels. Compare plans side by side (Premium); today's or actual currency. | [ProjectionLab: Getting Started](https://projectionlab.com/blog/getting-started-with-projectionlab), [ProjectionLab: Monte Carlo](https://projectionlab.com/monte-carlo), [Rob Berger ProjectionLab review](https://robberger.com/projectionlab-review) |

## 11. Net worth view and history

| Product | How it works | Source |
|---|---|---|
| YNAB | Reflect > Net Worth: a line graph over monthly asset and debt bars, using month-end balances (today's for the current month). Filter by date range and accounts; export from web. | [YNAB: Net Worth](https://support.ynab.com/en_us/net-worth-BkwQO5WA5) |
| Monarch | Net worth charted over time across all linked and manual accounts; dashboard widget; reports can zoom by time frame. Each account has "Hide from net worth". | [Monarch: Net Worth](https://www.monarch.com/landing/net-worth), [Monarch: Reports](https://help.monarch.com/hc/en-us/articles/21846787088916-Using-Reports) |
| Rocket Money | More > Net Worth (mobile) or the sidebar (web): Summary, Assets and Debt views; tracked over time (Premium). | [Rocket Money: net worth](https://help.rocketmoney.com/en/articles/5350243-how-is-net-worth-calculated), [Rocket Money blog](https://www.rocketmoney.com/learn/personal-finance/get-the-most-from-rocket-money) |
| eMoney | Net Worth tile on the portal Home summarizes assets and liabilities (gear icon to customize). History view: not found. | [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1) |
| RightCapital | Dashboard > Balance Sheet shows assets, liabilities and net worth; Snapshot offers a historical net worth tile. | [RightCapital: modules](https://help.rightcapital.com/getting-started/client-plan-overview), [RightCapital: Snapshot](https://help.rightcapital.com/module-overview/client-portal/dashboard/snapshot-module) |
| Boldin | Net worth is one of the first Overview metrics; paid tier adds real-time net worth analysis. History: not found. | [Boldin: First Month guide](https://help.boldin.com/en/articles/16963882-your-first-month-with-boldin-a-milestone-guide), [Rob Berger Boldin review](https://robberger.com/?p=5431) |
| ProjectionLab | Each day you change balances, a dated progress point is saved. Progress shows a net worth graph and a list of points (net worth, assets, liabilities) you can edit or delete. | [ProjectionLab: update balances](https://projectionlab.com/help/update-account-balances) |

## 12. Insurance / protection coverage entry

| Product | How it works | Source |
|---|---|---|
| YNAB | not found | [YNAB: Account Types](https://support.ynab.com/en_us/account-types-an-overview-BkmGM0qCq) |
| Monarch | not found | [Monarch: Getting Started Guide](https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-Guide) |
| Rocket Money | not found | [Rocket Money blog](https://www.rocketmoney.com/learn/personal-finance/get-the-most-from-rocket-money) |
| eMoney | Portal has a Protection tile (mobile shows the three highest-value policies). Advisor facts track insurance; Decision Center can model a new life policy (type, death benefit) to see if it closes a gap. | [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1), [eMoney blog: Decision Center](https://blog.emoneyadvisor.com/best-practices/demonstrate-your-value-to-prospects-with-decision-center/) |
| RightCapital | Current policies are entered in Net Worth. The Insurance module covers life, disability, long-term care and property. Life analysis computes the survivor's protection need; proposed coverage goes in Action Items. | [RightCapital: Life Insurance](https://help.rightcapital.com/module-overview/client-portal/insurance/life-insurance-analysis), [RightCapital: modules](https://help.rightcapital.com/getting-started/client-plan-overview) |
| Boldin | No insurance section. Enter a term policy's death benefit as a windfall at the insured's longevity age; cash value as an Other Asset or a manual account. | [Boldin: Life Insurance Policies](https://help.boldin.com/en/articles/5946765-life-insurance-policies) |
| ProjectionLab | Home and vehicle insurance are expense assumptions on the real asset. Life or disability policy entry: not found. | [ProjectionLab: Getting Started](https://projectionlab.com/blog/getting-started-with-projectionlab) |

## 13. Finding things: search, navigation, top-level tabs

| Product | How it works | Source |
|---|---|---|
| YNAB | Mobile tabs: Home, Plan, Spending, Accounts, Reflect. Search in Spending (multiple terms and filters) and inside each account. Focused Views filter the plan. | [YNAB: mobile spaces](https://support.ynab.com/en_us/spaces-in-the-mobile-app-S1iIZQoqgg), [YNAB: Inspector](https://support.ynab.com/en_us/the-inspector-an-overview-ryylY7OCq) |
| Monarch | Dashboard, Accounts, Transactions, Cash Flow, Reports, Budget, Recurring, Goals, Investments, Advice, Settings. Command K opens search and shortcuts (web). | [Monarch: Getting Started Guide](https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-Guide) |
| Rocket Money | Mobile: Dashboard, Recurring, Spending and a More tab (Net Worth lives there); web uses a left sidebar. A search icon exists; details not found. | [Rocket Money: net worth](https://help.rocketmoney.com/en/articles/5350243-how-is-net-worth-calculated), [Rocket Money: bills](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions), [Motley Fool review](https://www.fool.com/money/personal-finance/rocket-money-review) |
| eMoney | Portal top bar: Home, Organizer, My Plan, Spending, Investments, Vault, Reports, Settings, plus Tasks and Alerts icons. Search only in Vault and by ticker. | [Portal user guide](https://simplebooklet.com/emoney2025usersguidepdf?textonly=1) |
| RightCapital | Module tabs: Profile, Dashboard, Investment, Retirement, Insurance, Education, Tax, Estate, a More menu, and a Vault icon. Search: not found. | [RightCapital: modules](https://help.rightcapital.com/getting-started/client-plan-overview) |
| Boldin | Overview, My Plan, Summary and Milestones, Digital Coach, Insights Library, Explorers, Scenario Manager, Plan Reporter. Web only. Search: not found. | [Boldin: planner tour](https://www.boldin.com/retirement/video-get-started-series-1-a-tour-of-the-boldin-planner/) |
| ProjectionLab | Dashboard, Current Finances, Progress, Plans. Inside a plan: Plan, Cash Flow, Tax Analytics, Chance of Success tabs, with top-bar shortcuts for milestones and rates. Search: not found. | [ProjectionLab: Getting Started](https://projectionlab.com/blog/getting-started-with-projectionlab) |

## 14. Client-facing report or shareable summary

| Product | How it works | Source |
|---|---|---|
| YNAB | not found | [YNAB: Net Worth](https://support.ynab.com/en_us/net-worth-BkwQO5WA5) |
| Monarch | Charts download as PNG, the mobile share sheet shares chart images, and web exports report transactions as CSV. Report setups can be saved. | [Monarch: Reports](https://help.monarch.com/hc/en-us/articles/21846787088916-Using-Reports) |
| Rocket Money | not found | [Rocket Money blog](https://www.rocketmoney.com/learn/personal-finance/get-the-most-from-rocket-money) |
| eMoney | Plan Summary Report: the advisor picks a layout, metrics and visuals and saves templates. Presentation View sends a Decision Center plan to the client's My Plan page in one click (20 reports supported). Reports can also go to the client's Vault. | [eMoney: Plan Summary](https://emoneyadvisor.com/resources/news/emoney-advisor-enhances-plan-summary-report-with-customizable-features), [eMoney: Presentation View](https://emoneyadvisor.com/resources/news/emoney-advisor-advances-digital-plan-delivery-with-launch-of-presentation-view-in-decision-center/), [Financial Planning review](https://www.financial-planning.com/news/tech-review-emoneys-next-generation) |
| RightCapital | Snapshot opens by default on the Dashboard: the advisor adds and drags tiles (net worth, probability of success, budget, insurance, text, images), saves templates, and each tile's "Open Item" jumps to its module. PDF via gear > Report. A Blueprint tab gives a client-friendly summary of inputs. | [RightCapital: Snapshot](https://help.rightcapital.com/module-overview/client-portal/dashboard/snapshot-module), [RightCapital: modules](https://help.rightcapital.com/getting-started/client-plan-overview) |
| Boldin | Plan Reporter downloads reports and plan data; printing and export on the paid tier. | [Boldin: planner tour](https://www.boldin.com/retirement/video-get-started-series-1-a-tour-of-the-boldin-planner/), [Rob Berger Boldin review](https://robberger.com/?p=5431) |
| ProjectionLab | Downloadable reports (Premium). Pro advisor dashboard: invite clients by link, then set "Only You Can Edit" (client can test but not save) or "Client Can Edit". | [Rob Berger ProjectionLab review](https://robberger.com/projectionlab-review), [ProjectionLab: Pro dashboard](https://projectionlab.com/help/pro-dashboard) |

## 15. How uncertain or estimated numbers are marked

| Product | How it works | Source |
|---|---|---|
| YNAB | Progress bar colors: green funded, yellow underfunded, red overspent, grey empty. Scheduled transactions don't touch the plan until their date. A "Next Month's Targets" preview appears only when next month needs more. | [YNAB: Progress Bars](https://support.ynab.com/en_us/progress-bars-a-guide-SkDEhot09), [YNAB: Scheduled](https://support.ynab.com/en_us/scheduled-transactions-a-guide-BygrAIFA9), [YNAB: Cost to Be Me](https://support.ynab.com/en_us/plan-and-adjust-with-edit-plan-and-cost-to-be-me-ByR7vpqPyx) |
| Monarch | Goal projections are a dotted line, with status words (On track, At risk). Forecast year-one balances carry an (i) explaining the estimate, plus "hypothetical" disclaimers. Recurring calendar colors separate paid, paid-different and upcoming. | [Monarch: Save Up Goals](https://help.monarch.com/hc/en-us/articles/44373182867476-Using-Save-Up-Goals), [Monarch: Forecasting](https://help.monarch.com/hc/en-us/articles/48344305092244-Forecasting-in-Monarch), [Monarch: Recurring](https://help.monarch.com/hc/en-us/articles/4890751141908) |
| Rocket Money | Income and bill totals are presented as estimates from detected transactions, adjustable, with the source transactions viewable. Bills with no recent payment move to Inactive. | [Rocket Money: Creating a Budget](https://help.rocketmoney.com/en/articles/2649810-creating-a-budget), [Rocket Money: bills](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions) |
| eMoney | Monte Carlo bands (80/50/20) and configurable score labels and colors. Proposed techniques are color-coded (green, red, blue) to separate them from facts. | [eMoney blog: Monte Carlo](https://blog.emoneyadvisor.com/best-practices/monte-carlo-analysis-in-emoney/), [eMoney blog: Decision Center](https://blog.emoneyadvisor.com/best-practices/demonstrate-your-value-to-prospects-with-decision-center/) |
| RightCapital | Proposed vs Current columns keep what-ifs apart from facts; probability of success and median trial shown. An estimate flag on individual inputs: not found. | [RightCapital: Probability tab](https://help.rightcapital.com/knowledge-base/client-portal/retirement/analysis/probability-tab-retirement-analysis) |
| Boldin | Optimistic, average and pessimistic return sets (accounts carry optimistic and pessimistic rates); a digital coach flags possible errors. | [Boldin: Monte Carlo](https://www.boldin.com/retirement/sp-plp-monte-carlo/), [Boldin: Life Insurance Policies](https://help.boldin.com/en/articles/5946765-life-insurance-policies), [Rob Berger Boldin review](https://robberger.com/?p=5431) |
| ProjectionLab | Today's vs actual currency toggle; Monte Carlo percentiles; dated progress points (actuals) kept apart from plan projections. | [ProjectionLab: Getting Started](https://projectionlab.com/blog/getting-started-with-projectionlab), [ProjectionLab: update balances](https://projectionlab.com/help/update-account-balances) |

---

## Conventions

Patterns most of these products share, with who does each.

1. **Onboarding splits by product type.** Consumer apps lead with linking accounts (Monarch, Rocket Money, YNAB mobile, eMoney portal). Planners run a fixed interview order instead: profile, accounts, income, savings, expenses, goals (RightCapital, Boldin, ProjectionLab).
2. **Starter amounts come from trailing averages.** About 6 months of spending pre-fills the budget (Monarch, eMoney Auto-Budget, Rocket Money); RightCapital shows an Avg. monthly spend column beside the field; YNAB suggests targets from history.
3. **Three levels: group > category > line.** Groups are collapsible containers (YNAB, Monarch, Copilot). Monarch adds a fixed type tier above groups.
4. **A group total is either the sum of its lines or replaces them, never both.** Monarch's group budgeting hides the category lines; Copilot lets a group hold an explicit "unassigned" amount on top of its lines; RightCapital shows one total in the corner.
5. **One headline number answers "what's left."** Ready to Assign (YNAB), remaining from income (Monarch), projected savings (Rocket Money), budget total (RightCapital), Cost to Be Me for the total of targets (YNAB).
6. **Quick edits inline, rich edits in a panel.** Amounts are typed straight into the row (Monarch, Rocket Money); settings open in a side Inspector or drawer (YNAB, RightCapital) or in sections below a chart (ProjectionLab). Mobile uses a details screen (YNAB).
7. **Timing is a plain-English frequency plus a next date.** "Repeat: Every other week" with a next-date picker (YNAB), "Twice a month" meaning 1st and 15th with weekend shift (Monarch), next due date (Rocket Money), "Every month" (Copilot). Planners use start and end points instead (RightCapital, ProjectionLab, Boldin).
8. **Recurring items are detected from transactions, then confirmed.** Monarch, Rocket Money and Copilot find patterns and let the user accept or edit them, rather than starting from a blank form.
9. **Bills calendars use status colors.** Paid green, upcoming blue, paid-a-different-amount yellow (Monarch); a two-week Upcoming calendar (Rocket Money); an Upcoming strip (Copilot); a collapsible Scheduled section (YNAB).
10. **Planners take gross annual income plus a growth rate and compute taxes; budget apps use take-home deposits.** Gross (RightCapital, ProjectionLab, Boldin) vs detected paychecks or a single expected-income number (Rocket Money, Monarch, YNAB).
11. **Retirement contributions live on the income or savings side, not on the account.** Contribution as $, % or max, with employer match tiers and an IRS cap (RightCapital, Boldin). Accounts just hold balances (RightCapital Net Worth vs Savings, ProjectionLab Current Finances).
12. **Start and end are tied to life events, with sensible defaults.** "Already started" to retirement (RightCapital); milestone-linked start and end that move together (ProjectionLab); draggable retirement age (Monarch); work stop date drives contribution stop (Boldin).
13. **Debt payoff is a strategy toggle plus separate extra payments.** Avalanche or snowball (Monarch, RightCapital); extra payments are their own items you switch on and off, not edits to the minimum (Monarch, RightCapital, YNAB, ProjectionLab, Boldin). Output is a debt-free date or time and interest saved.
14. **Status words and color, not just numbers.** On track, Ahead, At risk (Monarch); green or red goal status (eMoney); green, yellow, red bars (YNAB).
15. **Projections show a probability from about 1,000 Monte Carlo trials, plus bands.** eMoney, RightCapital, Boldin and ProjectionLab; Monarch shows a single line with a disclaimer.
16. **What-ifs never overwrite facts.** Current vs Proposed (RightCapital), toggleable color-coded techniques (eMoney), saved scenarios or plans (Boldin, ProjectionLab, Monarch), simulators that don't change real payments (YNAB Loan Planner, Monarch savings calculator).
17. **Today's dollars vs future dollars is a visible toggle.** Monarch, RightCapital, ProjectionLab; Boldin enters budgets in today's dollars.
18. **One source of truth, with explicit copy actions between modules.** Monarch "Save to Budget" from the debt plan; RightCapital "Copy From" profile expenses into the budget; eMoney "Estimate from Spending" fills planning expenses from transactions. This avoids two answers to the same question.
19. **Net worth is a line over time, with include and exclude controls.** Month-end snapshots with asset and debt bars (YNAB), "Hide from net worth" (Monarch), dated progress points (ProjectionLab), Summary, Assets and Debt views (Rocket Money).
20. **Client summaries are tile boards that link back to the detail.** RightCapital Snapshot ("Open Item"), eMoney Plan Summary and Presentation View, both with reusable templates; advisor-set edit permissions for the client (ProjectionLab Pro, eMoney spending access None, Limited or Full).

Empty states are handled with pre-filled cards to fill or skip (RightCapital), sample or sandbox data (ProjectionLab Sandbox, eMoney sample clients), and $0 rows tucked to the bottom of a group (Monarch).

---

## Sources

**YNAB**
- https://support.ynab.com/en_us/getting-started-with-ynab-BJBFUjkUGg
- https://support.ynab.com/en_us/account-types-an-overview-BkmGM0qCq
- https://support.ynab.com/en_us/scheduled-transactions-a-guide-BygrAIFA9
- https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC
- https://support.ynab.com/en_us/how-to-use-targets-rk5kkI9ks
- https://support.ynab.com/en_us/the-inspector-an-overview-ryylY7OCq
- https://support.ynab.com/en_us/plan-and-adjust-with-edit-plan-and-cost-to-be-me-ByR7vpqPyx
- https://support.ynab.com/en_us/getting-started-ynab-basics-and-key-terms-BJCaIHaTZe
- https://support.ynab.com/en_us/progress-bars-a-guide-SkDEhot09
- https://support.ynab.com/en_us/handling-credit-cards-overview-ry7cNub1s
- https://support.ynab.com/en_us/net-worth-BkwQO5WA5
- https://support.ynab.com/en_us/spaces-in-the-mobile-app-S1iIZQoqgg
- https://ynab.com/blog/ynab-loan-planner

**Monarch Money**
- https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-Guide
- https://help.monarch.com/hc/en-us/articles/360048393392-Connect-or-Manually-Add-Accounts
- https://help.monarch.com/hc/en-us/articles/4890751141908
- https://help.monarch.com/hc/en-us/articles/360048883631-Budget
- https://help.monarch.com/hc/en-us/articles/18345219809940-Group-Budgeting
- https://help.monarch.com/hc/en-us/articles/44373182867476-Using-Save-Up-Goals
- https://help.monarch.com/hc/en-us/articles/44373293932052-Using-Pay-Down-Goals
- https://help.monarch.com/hc/en-us/articles/48344305092244-Forecasting-in-Monarch
- https://help.monarch.com/hc/en-us/articles/38550304735508-Viewing-Your-Credit-Score
- https://help.monarch.com/hc/en-us/articles/39587584456596-Tracking-Credit-Utilization
- https://help.monarch.com/hc/en-us/articles/21846787088916-Using-Reports
- https://www.monarch.com/landing/net-worth

**Rocket Money**
- https://help.rocketmoney.com/en/articles/2649810-creating-a-budget
- https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions
- https://help.rocketmoney.com/en/articles/2621011-creating-a-financial-goal
- https://help.rocketmoney.com/en/articles/5350243-how-is-net-worth-calculated
- https://help.rocketmoney.com/en/articles/5350313-how-do-i-update-the-balance-of-an-asset-or-loan
- https://help.rocketmoney.com/en/articles/8887948-fico-credit-score-101
- https://help.truebill.com/en/articles/3980129-how-often-is-my-credit-score-report-refreshed
- https://help.rocketmoney.com/en/articles/5857262-accelerate-your-debt-payoff-avalanche-vs-snowball-method
- https://www.rocketmoney.com/learn/personal-finance/get-the-most-from-rocket-money
- https://www.fool.com/money/personal-finance/rocket-money-review

**Copilot Money**
- https://help.copilot.money/en/articles/3760068-create-recurrings
- https://help.copilot.money/en/articles/6206293-editing-budgets-by-month
- https://help.copilot.money/en/articles/3767655-groups-of-categories
- https://help.copilot.money/en/articles/6045480-dashboard-tab-overview

**eMoney Advisor**
- https://simplebooklet.com/emoney2025usersguidepdf?textonly=1 (client portal user guide, third-party hosted)
- https://emoneyadvisor.com/wp-content/uploads/2024/08/Infographic_FactFinding_Workflow.pdf
- https://blog.emoneyadvisor.com/best-practices/emoney-tip-week-client-portal-budgeting-basics/
- https://blog.emoneyadvisor.com/best-practices/emoneys-client-site-spending-area/
- https://blog.emoneyadvisor.com/best-practices/monte-carlo-analysis-in-emoney/
- https://blog.emoneyadvisor.com/best-practices/demonstrate-your-value-to-prospects-with-decision-center/
- https://emoneyadvisor.com/resources/news/emoney-advisor-enhances-plan-summary-report-with-customizable-features
- https://emoneyadvisor.com/resources/news/emoney-advisor-advances-digital-plan-delivery-with-launch-of-presentation-view-in-decision-center/
- https://www.investmentnews.com/fintech/emoney-supports-focused-financial-planning-with-enhanced-needs-analysis/259881
- https://www.financial-planning.com/news/tech-review-emoneys-next-generation (2014 review, older interface)

**RightCapital**
- https://help.rightcapital.com/data-entry/creating-plans-and-data-entry
- https://help.rightcapital.com/faq/advisor-portal/clients/client-onboarding/client-onboarding2
- https://help.rightcapital.com/data-entry/income/salary-income
- https://help.rightcapital.com/data-entry/savings/401k/401-k-savings
- https://help.rightcapital.com/data-entry/savings
- https://help.rightcapital.com/getting-started/client-plan-overview
- https://help.rightcapital.com/module-overview/client-portal/retirement/retirement
- https://help.rightcapital.com/knowledge-base/client-portal/retirement/analysis/probability-tab-retirement-analysis
- https://help.rightcapital.com/module-overview/client-portal/more-menu/debt
- https://help.rightcapital.com/module-overview/client-portal/insurance/life-insurance-analysis
- https://help.rightcapital.com/knowledge-base/client-portal/dashboard/budget/creating-a-budget-budget-analysis
- https://help.rightcapital.com/module-overview/client-portal/dashboard/snapshot-module

**Boldin**
- https://help.boldin.com/en/
- https://help.boldin.com/en/articles/16963882-your-first-month-with-boldin-a-milestone-guide
- https://help.boldin.com/en/collections/2491184-assets-and-debts
- https://help.boldin.com/en/articles/6139975-what-types-of-contributions-can-i-enter
- https://help.boldin.com/en/articles/8560570-how-do-i-account-for-health-insurance-premiums-and-other-payroll-deductions
- https://help.boldin.com/en/articles/4303030-what-is-the-difference-between-the-basic-and-the-detailed-budgeter
- https://help.boldin.com/en/articles/4312672-how-do-i-make-lump-sum-debt-payments
- https://help.boldin.com/en/articles/5946765-life-insurance-policies
- https://www.boldin.com/retirement/video-get-started-series-1-a-tour-of-the-boldin-planner/
- https://www.boldin.com/retirement/sp-plp-monte-carlo/
- https://robberger.com/?p=5431 (Rob Berger, Boldin review)

**ProjectionLab**
- https://projectionlab.com/blog/getting-started-with-projectionlab
- https://projectionlab.com/help
- https://projectionlab.com/help/account-setup
- https://projectionlab.com/help/how-do-i-add-employer-retirement-accounts
- https://projectionlab.com/help/update-account-balances
- https://projectionlab.com/help/add-income-to-your-plan
- https://projectionlab.com/help/adding-expenses-to-your-plan
- https://projectionlab.com/help/early-loan-pay-off
- https://projectionlab.com/help/pro-dashboard
- https://projectionlab.com/blog/milestones
- https://projectionlab.com/monte-carlo
- https://robberger.com/projectionlab-review (Rob Berger, ProjectionLab review)
