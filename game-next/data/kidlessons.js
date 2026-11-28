/* ============================================================================
   SLAM the Game: data/kidlessons.js
   PURPOSE     Data only. The lessons of Kids mode (features/kids.js): 20 short lessons for a student in
               a high school personal finance class, and 12 daily lessons for an adult. Each lesson has one
               idea and two questions.
   INPUT       None.
   OUTPUT      KID_LESSONS: a list of { id, t (title), idea, q: [[question, [answers], index of the
               right answer, why]] }. ADULT_LESSONS: the daily lessons for an adult (Duolingo mode), in
               the same shape, plus the skill each one leads to: skill, tree, lv.
   DEPENDS ON  Nothing.
   RULES       Each number in a question can be worked out from the text of the question. A lesson
               teaches an idea. It gives no advice about one product.
   ========================================================================= */
const KID_LESSONS = [
  {
    id: "pay",
    t: "Your paycheck",
    idea: "The pay a job offers is the gross pay. Taxes come out first. What lands in your account is the net pay, also called take-home pay.",
    q: [
      ["You earn $200 and $30 goes to taxes. What is your take-home pay?", ["$230", "$200", "$170"], 2, "$200 less $30 is $170."],
      ["Which number do you plan your spending with?", ["Gross pay", "Take-home pay", "The hourly rate"], 1, "You can only spend what lands in your account."],
    ],
  },
  {
    id: "hours",
    t: "Price it in hours",
    idea: "Each thing you buy costs some hours of your work. Divide the price by what you take home for an hour.",
    q: [
      ["Shoes cost $60. You take home $12 an hour. How many hours of work is that?", ["3 hours", "5 hours", "12 hours"], 1, "$60 divided by $12 is 5 hours."],
      ["Why is this a useful way to look at a price?", ["It makes things cheaper", "It shows what you trade for it", "Stores require it"], 1, "You trade your time for money, then money for things."],
    ],
  },
  {
    id: "needs",
    t: "Needs and wants",
    idea: "A need is a thing you must have to live and work: a home, food, a way to get around. A want makes life better. Both are fine. Needs get paid first.",
    q: [
      ["Which one is a need?", ["A bus pass to get to work", "A new game", "Concert tickets"], 0, "Getting to work is how the money comes in."],
      ["Money is tight this month. What gets paid first?", ["Wants", "Needs", "Whatever is on sale"], 1, "Needs first. Wants come from what is left."],
    ],
  },
  {
    id: "plan",
    t: "A spending plan",
    idea: "A spending plan gives each dollar a job before the month starts. One common guide is 50% for needs, 30% for wants and 20% for saving. It is a guide, not a law.",
    q: [
      ["You take home $1,000 a month. With the guide, how much goes to saving?", ["$50", "$200", "$500"], 1, "20% of $1,000 is $200."],
      ["When do you make a spending plan?", ["Before the money is spent", "After the money is gone", "Only when you are rich"], 0, "A plan made first is a choice. A list made after is a record."],
    ],
  },
  {
    id: "first",
    t: "Pay yourself first",
    idea: "Move money to savings on payday, before you spend any. What you do not see, you do not miss.",
    q: [
      ["When is the best time to move money to savings?", ["At the end of the month", "On payday", "When you remember"], 1, "On payday the money is still there."],
      ["You save $25 from each of 26 paychecks in a year. How much is that?", ["$250", "$650", "$2,600"], 1, "$25 times 26 is $650."],
    ],
  },
  {
    id: "cushion",
    t: "A cushion for surprises",
    idea: "An emergency fund is money set aside for a surprise: a phone that breaks, a car repair, hours cut at work. It keeps a bad day from turning into debt.",
    q: [
      ["Which one is a job for an emergency fund?", ["A sale on shoes", "A flat tire", "A birthday gift"], 1, "A flat tire is a surprise you must fix."],
      ["Where does an emergency fund belong?", ["In a savings account", "In a game account", "In your wallet"], 0, "Safe, easy to reach, and out of sight."],
    ],
  },
  {
    id: "bank",
    t: "Checking and savings",
    idea: "A checking account is for money that moves: pay comes in, bills go out. A savings account is for money that waits, and the bank pays you a little interest on it.",
    q: [
      ["Which account do you pay bills from?", ["Checking", "Savings", "Neither"], 0, "Checking is the account that money moves through."],
      ["What does a bank pay you for money kept in savings?", ["A fee", "Interest", "A grade"], 1, "Interest is what the bank pays to use your money."],
    ],
  },
  {
    id: "interest",
    t: "Interest",
    idea: "Interest is the price of using money. When you save, you earn it. When you borrow, you pay it. It is a percent of the amount, for each year.",
    q: [
      ["You keep $100 in savings at 4% a year. About how much interest after one year?", ["$4", "$40", "$104"], 0, "4% of $100 is $4."],
      ["Who pays interest on a loan?", ["The lender", "The borrower", "Nobody"], 1, "The borrower pays to use the money."],
    ],
  },
  {
    id: "compound",
    t: "Interest on interest",
    idea: "When interest stays in the account, it earns interest too. That is compounding. The rule of 72 gives the time to double: 72 divided by the yearly rate.",
    q: [
      ["Money grows 8% a year. About how long until it doubles?", ["4 years", "9 years", "72 years"], 1, "72 divided by 8 is 9."],
      ["What does compounding need most?", ["Luck", "Time", "A big start"], 1, "The longer it runs, the more the interest earns its own interest."],
    ],
  },
  {
    id: "cards",
    t: "Debit and credit",
    idea: "A debit card spends your own money from checking. A credit card spends the bank's money, and you pay it back. Pay the full bill each month and there is no interest.",
    q: [
      ["Which card spends borrowed money?", ["Debit", "Credit", "A gift card"], 1, "A credit card is a short loan each time."],
      ["How do you use a credit card and pay no interest?", ["Pay the minimum", "Pay the full bill each month", "Skip a month"], 1, "Interest is charged on what you leave unpaid."],
    ],
  },
  {
    id: "cardcost",
    t: "What a card balance costs",
    idea: "Card interest is high, often more than 20% a year. A balance that stays costs money each month, and the minimum payment mostly covers that cost.",
    q: [
      ["A $1,000 balance at 24% a year costs about how much interest in one month?", ["$2", "$20", "$240"], 1, "24% a year is 2% a month. 2% of $1,000 is $20."],
      ["What is the fastest way out of a card balance?", ["Pay only the minimum", "Pay more than the minimum", "Open a second card"], 1, "Each extra dollar goes to the balance itself."],
    ],
  },
  {
    id: "score",
    t: "Your credit score",
    idea: "A credit score is a number that tells lenders how you have handled borrowed money. Two things matter most: paying on time, and using a small part of your limit.",
    q: [
      ["What helps a credit score the most?", ["Paying on time", "Having many cards", "A high income"], 0, "Payment history is the biggest part."],
      ["Your card limit is $1,000. Which balance is easier on your score?", ["$100", "$900", "They are the same"], 0, "Using a small share of the limit helps."],
    ],
  },
  {
    id: "loans",
    t: "Loans and APR",
    idea: "APR is the yearly cost of a loan as a percent. A lower APR and a shorter loan both mean less interest in total. A low monthly payment can hide a long, costly loan.",
    q: [
      ["Two loans are for the same amount and time. Which one costs less?", ["6% APR", "12% APR", "They cost the same"], 0, "A lower rate means less interest."],
      ["What does a longer loan usually do?", ["Lowers the payment and raises the total interest", "Lowers both", "Raises both"], 0, "You pay less each month, for more months."],
    ],
  },
  {
    id: "school",
    t: "Paying for school",
    idea: "Money for school comes in an order: grants and scholarships are free money, work pays as you go, and loans must be paid back with interest. The form called FAFSA opens the door to most of it.",
    q: [
      ["Which one do you not pay back?", ["A scholarship", "A federal loan", "A private loan"], 0, "Grants and scholarships are free money."],
      ["What does the FAFSA do?", ["It is a loan", "It checks which aid you can get", "It sets your grades"], 1, "It is the form that schools and the government use to offer aid."],
    ],
  },
  {
    id: "invest",
    t: "Stocks, bonds and funds",
    idea: "A stock is a small piece of a company. A bond is a loan to a company or a government. A fund holds many of them at one time, so one bad pick matters less.",
    q: [
      ["What do you own when you own a stock?", ["A piece of a company", "A loan", "A savings account"], 0, "A share is a share of the company."],
      ["Why is a fund less risky than one stock?", ["It is guaranteed", "It holds many things", "It never goes down"], 1, "Spreading out is called diversifying. A fund can still go down."],
    ],
  },
  {
    id: "fees",
    t: "Index funds and fees",
    idea: "An index fund buys every company on a list, like the 500 biggest in the US. It needs no stock picker, so its fee is small. Fees come out each year, and small ones add up.",
    q: [
      ["You have $1,000 in a fund with a 1% fee. What does the fee cost in a year?", ["$1", "$10", "$100"], 1, "1% of $1,000 is $10."],
      ["Why do index funds have low fees?", ["They hold bad companies", "Nobody has to pick the stocks", "They are free"], 1, "They follow a list. That costs little to run."],
    ],
  },
  {
    id: "roth",
    t: "A Roth IRA for a teen",
    idea: "A Roth IRA is an account for retirement. You put in money that was already taxed, and it grows tax-free. A teen with pay from a job can have one, up to what they earned that year or the yearly limit, whichever is less.",
    q: [
      ["What do you need to put money in a Roth IRA?", ["To be 18", "Pay from work", "A credit card"], 1, "The money must come from earned income."],
      ["You earned $2,000 at a summer job. What is the most you can put in for that year?", ["$2,000", "$20,000", "Nothing"], 0, "Up to what you earned, when that is under the yearly limit."],
    ],
  },
  {
    id: "taxes",
    t: "Taxes on your pay",
    idea: "At a new job you fill in a form called the W-4. It tells the job how much tax to hold back. After the year ends, the job sends a W-2 that shows what you earned and what was held back.",
    q: [
      ["Which form do you fill in when you start a job?", ["W-2", "W-4", "FAFSA"], 1, "The W-4 comes first. The W-2 comes after the year ends."],
      ["More tax was held back than you owed. What happens when you file?", ["You get a refund", "You pay a fine", "Nothing"], 0, "A refund is your own money coming back."],
    ],
  },
  {
    id: "insure",
    t: "Insurance",
    idea: "Insurance trades a small sure cost for cover against a big unsure one. The premium is what you pay for it. The deductible is what you pay first when something happens.",
    q: [
      ["What is a premium?", ["What you pay to have the cover", "What the insurer pays you", "A kind of tax"], 0, "The premium keeps the cover in place."],
      ["A repair costs $1,200 and your deductible is $500. About how much does insurance pay?", ["$500", "$700", "$1,200"], 1, "You pay the first $500. $1,200 less $500 is $700."],
    ],
  },
  {
    id: "scams",
    t: "Spot a scam",
    idea: "A scam pushes you to act fast, to keep a secret, or to pay in a strange way like gift cards. Real banks and real jobs do not do that. When in doubt, stop and ask an adult you trust.",
    q: [
      ["Which one is a sign of a scam?", ["You must act right now", "A written offer", "A phone number on a bank card"], 0, "Pressure to hurry is the oldest trick."],
      ["A message asks for your bank password to send you a prize. What do you do?", ["Send it", "Do not answer, and tell an adult", "Send half of it"], 1, "No real company asks for a password."],
    ],
  },
];
/* The daily lessons for an adult (Duolingo mode, features/kids.js): the same path as Kids mode, for the player.
   Each lesson also names the skill it leads to: skill (the id in data/library/skills.json of the main app), tree and
   lv (its tree and level in SKILLS). The path puts first the lessons whose tree matches the latest quiz result. */
const ADULT_LESSONS = [
  {
    id: "scripts",
    t: "Name your money script",
    tree: "money-psychology",
    lv: 2,
    skill: "money-psychology-name-your-money-scripts",
    idea: "A money script is a belief about money you picked up early, often without words. Naming yours makes it easier to choose instead of react.",
    q: [
      ["A belief like 'the money is always about to run out' is...", ["A money script", "A budget rule", "A tax law"], 0, "It is a belief you carry, not a fact about your account."],
      ["What helps most with a money script?", ["Never thinking about it", "Naming it when it shows up", "Earning more"], 1, "Once you can name it, you can decide what to do next."],
    ],
  },
  {
    id: "payday",
    t: "Pay yourself first",
    tree: "main-path",
    lv: 4,
    skill: "main-path-automate-payday-contributions",
    idea: "Pay yourself first: a transfer to savings or investing on payday, set up once, before you see the money.",
    q: [
      ["You take home $2,000 and set 10% to move on payday. How much moves?", ["$20", "$200", "$2,000"], 1, "10% of $2,000 is $200."],
      ["Why on payday, and not at the end of the month?", ["Banks require it", "What is left at the end is often nothing", "It earns more interest"], 1, "Saving first makes it happen. Saving what is left leaves it to chance."],
    ],
  },
  {
    id: "cushion",
    t: "The first cushion",
    tree: "cash-safety-net",
    lv: 1,
    skill: "cash-safety-net-build-the-1k-shield",
    idea: "A small cash cushion turns a surprise bill into an errand instead of new debt.",
    q: [
      ["A $400 car repair, with $500 in the cushion. What is left?", ["$100", "$900", "$400"], 0, "$500 less $400 is $100, and no card was needed."],
      ["Where does a cushion live best?", ["In stocks", "In a savings account you can reach this week", "In a drawer at home"], 1, "Safe and reachable, so it is there when you need it."],
    ],
  },
  {
    id: "match",
    t: "Take the free money at work",
    tree: "main-path",
    lv: 3,
    skill: "main-path-capture-the-full-401-k-match",
    idea: "Many jobs add money to your retirement plan when you do, up to a limit. Getting all of it is one of the best returns most people are ever offered.",
    q: [
      ["Your job adds 50 cents for each dollar you put in, up to 6% of pay. You put in 6% of $50,000. How much does the job add?", ["$1,500", "$3,000", "$6,000"], 0, "6% of $50,000 is $3,000, and half of that is $1,500."],
      ["You put in 3% when the limit is 6%. What happens?", ["Nothing changes", "Part of the match stays with the job", "You pay a fee"], 1, "The match only follows what you put in."],
    ],
  },
  {
    id: "hours",
    t: "Price it in hours",
    tree: "time-capital",
    lv: 2,
    skill: "time-capital-compute-your-real-hourly-wage",
    idea: "Price a buy in hours of work: the price divided by what you keep for each hour.",
    q: [
      ["You keep $25 an hour. A $150 jacket is how many hours?", ["4", "6", "15"], 1, "$150 divided by $25 is 6 hours."],
      ["What makes your real hourly pay lower than the posted rate?", ["Taxes, the commute and work costs", "A raise", "Paid time off"], 0, "They take money or time that the posted rate does not count."],
    ],
  },
  {
    id: "enough",
    t: "Write down enough",
    tree: "money-psychology",
    lv: 6,
    skill: "money-psychology-write-down-enough",
    idea: "Enough is a number and a feeling. Writing yours down keeps the finish line from moving each time you get closer.",
    q: [
      ["Why write down what enough is?", ["So the goal stays put", "To impress others", "To spend less on everything"], 0, "A written line is harder to nudge after each raise."],
      ["Enough is...", ["The same for everyone", "Your own, and it can change", "Always more than you have"], 1, "It is yours, and you can come back to it."],
    ],
  },
  {
    id: "times25",
    t: "About 25 times a year",
    tree: "withdrawal-decumulation",
    lv: 1,
    skill: "withdrawal-decumulation-know-the-4-rule-honestly",
    idea: "A common rule of thumb: about 25 times a year of spending can carry that spending for a long time. It is a starting point, not a promise.",
    q: [
      ["You spend $40,000 a year. 25 times that is...", ["$400,000", "$1,000,000", "$250,000"], 1, "$40,000 times 25 is $1,000,000."],
      ["The rule of thumb is best used as...", ["A promise", "A first guess that your plan refines", "A law"], 1, "Your own numbers refine it."],
    ],
  },
  {
    id: "fees",
    t: "The quiet cost of fees",
    tree: "portfolio-design",
    lv: 2,
    skill: "portfolio-design-hunt-expense-ratios",
    idea: "A fund's yearly fee comes out of what you have, every year. Small differences add up over decades.",
    q: [
      ["A 1% fee on $10,000 is how much a year?", ["$10", "$100", "$1,000"], 1, "1% of $10,000 is $100."],
      ["Two funds hold the same things. One charges 0.05% a year, one 1%. Which keeps more for you?", ["The 0.05% fund", "The 1% fund", "They are the same"], 0, "The lower fee leaves more of your money invested."],
    ],
  },
  {
    id: "wait",
    t: "Wait a day",
    tree: "deals-smart-buying",
    lv: 1,
    skill: "deals-smart-buying-wait-24-hours",
    idea: "For a want over a set amount, wait a day. If you still want it tomorrow, buy it gladly.",
    q: [
      ["What does a one-day wait do?", ["Bans the buy", "Lets the want settle so you can choose", "Lowers the price"], 1, "Many wants fade by tomorrow. The ones that stay are real."],
      ["Where does it help most?", ["Rent", "A late-night online cart", "A bill that is due"], 1, "Needs get paid on time. The wait is for wants."],
    ],
  },
  {
    id: "debts",
    t: "Which debt first",
    tree: "debt-leverage",
    lv: 1,
    skill: "debt-leverage-inventory-every-debt",
    idea: "Paying the highest interest rate first saves the most money. Paying the smallest balance first gives quick wins. Both beat paying only the minimums.",
    q: [
      ["Card A charges 24%, card B 8%. Extra money goes to which one first to save the most?", ["Card A", "Card B", "Split it evenly"], 0, "The higher rate costs more each month."],
      ["Paying the smallest balance first is good for...", ["Saving the most interest", "Quick wins that keep you going", "Your credit limit"], 1, "A card that reaches zero feels good, and that keeps people at it."],
    ],
  },
  {
    id: "talk",
    t: "A calm money talk",
    tree: "money-psychology",
    lv: 18,
    skill: "money-psychology-make-money-discussable",
    idea: "Money talks go better on a calm day, with one topic and a time limit.",
    q: [
      ["The best time for a money talk is...", ["Right after a big bill", "A calm time you both set", "Late at night"], 1, "Calm and planned works better than tense and sudden."],
      ["How many topics fit one talk?", ["One", "Five", "As many as come up"], 0, "One topic, settled, is a good talk."],
    ],
  },
  {
    id: "values",
    t: "Spend on what you love",
    tree: "money-psychology",
    lv: 14,
    skill: "money-psychology-spend-loudly-on-values",
    idea: "Spend freely on the few things you love, and cut hard on the things you do not care about.",
    q: [
      ["Which one fits this idea?", ["Cutting everything a little", "Cutting what you do not care about and keeping what you love", "Spending on what others notice"], 1, "The cut lands where it costs you no joy."],
      ["How do you find what you love?", ["Ask what you would miss most", "Copy a friend", "Pick the most expensive"], 0, "What you would miss most is your answer."],
    ],
  },
];
