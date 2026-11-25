/* ============================================================================
   SLAM the Game: core/engine.js
   PURPOSE     The engine: the data model of one profile and all the math. derive(c) returns all
               computed numbers of one profile. This file has no screen code.
   INPUT       The profile: c.x.careYrs, c.x.col, c.x.done, c.x.dry, c.x.ends, c.x.fixed, c.x.forgive,
               c.x.home, c.x.kids, c.x.limit, and 5 more. The open sheet (W.kind): node, plant, skill.
   OUTPUT      123 functions.
   DEPENDS ON  Nothing.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: features/eras.js. With no typeof test, thus safe only after the page has
               loaded all files: features/eras.js (esMax, esRank, esTitle).
   RULES       A screen does not calculate. A screen shows the numbers from derive() and from the math
               functions.
   ========================================================================= */
const R = 0.07,
  SWR = 0.04,
  ROTH = 7500;

const ERAS = [
  {
    n: "Digging Out",
    p: "In debt",
    gate: "Where everyone below zero starts",
    one: "You owe more than you own. First stop the hole getting deeper, then climb.",
    is: ["Your debts are bigger than your savings", "Payments feel heavy most months", "No real cushion yet"],
  },
  {
    n: "Buffer",
    p: "A small cushion",
    gate: "Set aside $1,000",
    one: "A surprise bill no longer has to go on a card.",
    is: [
      "You have $1,000 or more set aside",
      "A flat tire would be annoying, not a crisis",
      "You know where that money is",
    ],
  },
  {
    n: "Free Money",
    p: "The full match",
    gate: "Get the full match from your job (or have no match to get)",
    one: "You take every dollar your job offers to match.",
    is: [
      "Your job matches retirement savings",
      "You put in enough to get all of it",
      "Or your job offers no match at all",
    ],
  },
  {
    n: "Debt Free",
    p: "Heavy debt gone",
    gate: "No debt charging 8% or more",
    one: "Nothing you owe charges 8% or more.",
    is: ["No card balances carried", "No payday or high-rate loans", "Any debt left is low-rate"],
  },
  {
    n: "Fortress",
    p: "A full emergency fund",
    gate: "Save your age divided by 5, in months of spending",
    one: "Losing a job would be a plan, not a panic.",
    is: [
      "Several months of spending in cash",
      "It sits apart from daily money",
      "You would not need a card in a bad month",
    ],
  },
  {
    n: "Future You",
    p: "Tax-friendly accounts filled",
    gate: "Fill your Roth IRA, HSA and workplace plan",
    one: "Future you gets paid first, with the tax breaks.",
    is: ["You fill your Roth IRA each year", "You use an HSA if you can", "Your workplace plan is at your target"],
  },
  {
    n: "Quiet Quitting FI",
    p: "On track with the bare minimum",
    gate: "Only a Roth IRA each year would still get you there",
    one: "Even doing the bare minimum from here, you would still make it.",
    is: [
      "Your investments are doing most of the work",
      "You could ease off and still retire on time",
      "You have real choices now",
    ],
  },
  {
    n: "Coast",
    p: "Enough already saved",
    gate: "Invested enough to retire on time with nothing more added",
    one: "You have already saved enough to retire on time.",
    is: [
      "You could stop saving for retirement today",
      "Your paycheck only has to cover your life",
      "Time does the rest",
    ],
  },
  {
    n: "Freedom",
    p: "Work is optional",
    gate: "Investments cover your spending",
    one: "Your investments can pay for your life.",
    is: [
      "Investments are 25 times your yearly spending",
      "You work because you want to",
      "A bad boss has no hold on you",
    ],
  },
  {
    n: "Legacy",
    p: "Beyond you",
    gate: "Freedom reached, and people or causes to build for",
    one: "You are building for people and causes beyond yourself.",
    is: ["Your own life is covered", "You are planning what you pass on", "Giving is part of the plan"],
  },
];

const NODES = [
  {
    id: "cd_list",
    t: "cd",
    tier: "Foundations",
    n: "List every debt with its rate",
    r: 1,
    e: "15 min",
    w: "See the whole map",
    why: "You can't fight what you can't see.",
  },
  {
    id: "cd_auto",
    t: "cd",
    tier: "Foundations",
    n: "Put the minimums on autopay",
    r: 1,
    e: "10 min",
    w: "No late fees, ever",
    why: "One missed payment costs more than a month of progress.",
  },
  {
    id: "cd_method",
    t: "cd",
    tier: "Strength",
    n: "Pick a payoff method",
    r: 1,
    e: "10 min",
    w: "A plan you trust",
    why: "Highest rate first saves the most. Smallest first, or least hassle first, can keep you going.",
  },
  {
    id: "cd_stop",
    t: "cd",
    tier: "Strength",
    n: "No new card charges",
    r: 3,
    rl: ["10 days", "20 days", "30 days"],
    e: "Ongoing",
    w: "The balance stops growing",
    why: "Digging out while still digging in never ends.",
  },
  {
    id: "cd_apr",
    t: "cd",
    tier: "Skill",
    n: "Call and ask for a lower rate",
    r: 1,
    e: "20 min",
    w: "Often cuts your interest",
    why: "One phone call can be worth hundreds.",
  },
  {
    id: "cd_first",
    t: "cd",
    tier: "Skill",
    n: "Pay off your first debt",
    r: 1,
    e: "Weeks",
    w: "Its payment now works for you",
    why: "Your first win frees cash for the next one.",
  },
  {
    id: "cd_gone",
    t: "cd",
    tier: "Mastery",
    n: "All 8%+ debt gone",
    r: 1,
    e: "Months",
    w: "Enter the Debt Free era",
    gate: true,
    why: "Nothing you can invest in reliably beats a guaranteed 8% or more.",
  },
  {
    id: "cd_full",
    t: "cd",
    tier: "Mastery",
    n: "Pay statements in full",
    r: 3,
    rl: ["1 month", "2 months", "3 months"],
    e: "Ongoing",
    w: "Zero interest",
    why: "Cards become tools instead of traps.",
  },
  {
    id: "cd_740",
    t: "cd",
    tier: "Elite",
    n: "Credit score 740 or higher",
    r: 1,
    e: "Months",
    w: "Best rates and best offers",
    why: "A strong score lowers the price of almost everything you borrow.",
  },
  {
    id: "sf_buffer",
    t: "sf",
    tier: "Foundations",
    n: "Keep a small buffer in checking",
    r: 1,
    e: "10 min",
    w: "Nothing bounces",
    why: "A little slack in checking stops overdraft fees.",
  },
  {
    id: "sf_little",
    t: "sf",
    tier: "Foundations",
    n: "Set aside $1,000",
    r: 1,
    e: "Weeks",
    w: "Enter the Buffer era",
    gate: true,
    why: "Covers the flat tire so it doesn't go on a card.",
  },
  {
    id: "sf_hysa",
    t: "sf",
    tier: "Strength",
    n: "Open a separate high-yield savings account",
    r: 1,
    e: "20 min",
    w: "Earns while it waits",
    why: "Out of sight from daily spending, still yours in a day.",
  },
  {
    id: "sf_deduct",
    t: "sf",
    tier: "Strength",
    n: "Know every deductible",
    r: 1,
    e: "20 min",
    w: "No surprises",
    why: "Your cushion should cover your biggest deductible.",
    prot: true,
  },
  {
    id: "sf_bige",
    t: "sf",
    tier: "Skill",
    n: "Build your full emergency fund",
    r: 4,
    rl: ["25%", "50%", "75%", "100%"],
    e: "Months",
    w: "Enter the Fortress era",
    gate: true,
    why: "Your age divided by 5 is how many months of spending to hold.",
  },
  {
    id: "sf_renters",
    t: "sf",
    tier: "Skill",
    n: "Renters or home insurance",
    r: 1,
    e: "30 min",
    w: "Your stuff is covered",
    why: "Cheap, and a fire or theft won't reset you.",
    prot: true,
  },
  {
    id: "sf_disab",
    t: "sf",
    tier: "Mastery",
    n: "Check your disability coverage",
    r: 1,
    e: "30 min",
    w: "Your income is covered",
    why: "Your ability to earn is your biggest asset.",
    prot: true,
  },
  {
    id: "sf_term",
    t: "sf",
    tier: "Mastery",
    n: "Term life, if anyone depends on you",
    r: 1,
    e: "1 hour",
    w: "They're covered",
    why: "Only needed if someone relies on your income.",
    prot: true,
    deps: true,
  },
  {
    id: "sf_benef",
    t: "sf",
    tier: "Elite",
    n: "Name beneficiaries on every account",
    r: 1,
    e: "30 min",
    w: "Money goes where you want",
    why: "Five minutes per account, and it skips a court.",
    prot: true,
  },
];
const TIERS = ["Foundations", "Strength", "Skill", "Mastery", "Elite"];
const BANDS = ["Foundation", "Optimization", "Advanced", "Expert", "Endgame"];
const BAND_PLAIN = ["The basics", "Getting better", "Advanced", "Expert", "Mastery"];

const MUSCLES = [
  "Lock a card",
  "Cancel or downgrade a card",
  "Freeze your credit",
  "Dispute a charge",
  "Buy a stock or fund",
  "Sell a stock or fund",
  "Move money between banks",
  "Find every password",
  "Read your pay stub",
  "Check your credit report",
  "Negotiate a bill",
  "Set up autopay",
  "Know where your 401(k) is",
  "Know how you file taxes",
  "Find your account numbers fast",
  "Know your checking balance",
];

/* Steps that belong to each era. The starred one is the key moment. */
const ERA_NODES = {
  1: ["cd_list", "cd_auto", "sf_buffer", "sf_little"],
  2: ["m8", "m12"],
  3: ["cd_method", "cd_stop", "cd_apr", "cd_first", "cd_gone"],
  4: ["sf_hysa", "sf_deduct", "sf_renters", "sf_bige", "cd_full"],
  5: ["sf_disab", "sf_term", "sf_benef", "cd_740"],
};

const REGIONS = [
  { id: "debt", n: "Debt", one: "What you owe, and getting rid of it.", start: "cd" },
  { id: "safety", n: "Safety", one: "Cushions and coverage, so bad luck doesn't sink you.", start: "sf" },
  { id: "cash", n: "Cash flow", one: "Money in, money out, and the systems that run it." },
  { id: "invest", n: "Investing", one: "Getting your money to earn money." },
  { id: "taxes", n: "Taxes", one: "Keeping more of what you earn, legally." },
  { id: "earn", n: "Earning", one: "Making more: raises, side income, your own business." },
  { id: "deals", n: "Deals", one: "Paying less for the same life." },
  { id: "home", n: "Home", one: "Where you live and what it costs." },
  { id: "people", n: "People", one: "Money with partners, family and your network." },
  { id: "life", n: "Life", one: "Health, time, learning, and what all this is for." },
];
const TREES = {
  "debt-leverage": { r: "debt", s: ["Debt", "payoff"], best: "Best right now if anything you owe charges 8% or more." },
  "credit-cards": {
    r: "debt",
    s: ["Credit", "and cards"],
    best: "Best once your 8%+ debt is gone. Strong credit opens bonuses, points and travel.",
  },
  "cash-safety-net": {
    r: "safety",
    s: ["Cash", "cushion"],
    best: "Best from day one. Everything else stands on this.",
  },
  "insurance-protection": {
    r: "safety",
    s: ["Insurance"],
    best: "Best as soon as you have income or people to protect.",
  },
  "storms-windfalls": {
    r: "safety",
    s: ["Storms and", "windfalls"],
    best: "Best before the storm. Write the plan while the weather is calm.",
  },
  "financial-ops-tooling": {
    r: "cash",
    s: ["Money", "systems"],
    best: "Best early. Good systems make every later step cheaper.",
  },
  "money-psychology": {
    r: "cash",
    s: ["Money", "mindset"],
    best: "Best any time money feels heavier than the numbers say it should.",
  },
  "main-path": {
    r: "invest",
    s: ["Main", "path"],
    best: "Best once your $1,000 cushion is in place. Start with the match.",
  },
  "portfolio-design": { r: "invest", s: ["Portfolio"], best: "Best once you invest every month and want it tidy." },
  "alternatives-speculation": {
    r: "invest",
    s: ["Side", "bets"],
    best: "Best after your foundation is done, with money you can lose.",
  },
  "withdrawal-decumulation": {
    r: "invest",
    s: ["Spending", "it down"],
    best: "Best as you get close to living off your investments.",
  },
  "tax-strategy": {
    r: "taxes",
    s: ["Tax", "moves"],
    best: "Best once you are investing. The savings grow with your balance.",
  },
  "income-career": { r: "earn", s: ["Career"], best: "Best any time. A raise speeds up every other region." },
  "side-hustles": {
    r: "earn",
    s: ["Side", "income"],
    best: "Best when you have spare hours and a clear target for the money.",
  },
  entrepreneurship: { r: "earn", s: ["Your own", "business"], best: "Best with a cushion behind you." },
  "deals-smart-buying": {
    r: "deals",
    s: ["Smart", "buying"],
    best: "Best while you save your emergency fund. The cash is sitting there anyway, so this is the time for bank bonuses and good deals.",
  },
  "geo-arbitrage-location": {
    r: "deals",
    s: ["Where", "you live"],
    best: "Best before a move, a lease renewal or a job change.",
  },
  "real-estate": { r: "home", s: ["Real", "estate"], best: "Best once heavy debt is gone and your cushion is full." },
  "social-capital": { r: "people", s: ["Your", "network"], best: "Best any time. People open doors money can't." },
  "family-generational-wealth": {
    r: "people",
    s: ["Family", "money"],
    best: "Best when you partner up, have kids, or help parents.",
  },
  "health-longevity": { r: "life", s: ["Health"], best: "Best always. Health is the asset everything else rides on." },
  "time-capital": { r: "life", s: ["Your", "time"], best: "Best when you feel busy but not moving." },
  knowledge: { r: "life", s: ["Learning"], best: "Best in small daily bites." },
  "pre-retirement-design": {
    r: "life",
    s: ["Designing", "what's next"],
    best: "Best at the Quiet Quitting FI and Coast crossroads.",
  },
  "the-long-game": { r: "life", s: ["The long", "game"], best: "Best once the basics run themselves." },
};
const TREE_ONE = {
  "debt-leverage": "Paying debt off in the smartest order.",
  "credit-cards": "Building strong credit and using cards well.",
  "cash-safety-net": "Cash you can reach when life happens.",
  "insurance-protection": "Coverage for the big, rare disasters.",
  "storms-windfalls": "Plans for bad surprises and good ones.",
  "financial-ops-tooling": "Accounts, autopay and the tools that run your money.",
  "money-psychology": "How you think and feel about money.",
  "main-path": "The core investing path, one step at a time.",
  "portfolio-design": "What you invest in and how it fits together.",
  "alternatives-speculation": "Riskier bets, kept small.",
  "withdrawal-decumulation": "Turning savings into a paycheck.",
  "tax-strategy": "Legal ways to pay less tax.",
  "income-career": "Earning more from your job.",
  "side-hustles": "Extra income on the side.",
  entrepreneurship: "Building something of your own.",
  "deals-smart-buying": "Getting more for every dollar.",
  "geo-arbitrage-location": "Using where you live to your advantage.",
  "real-estate": "Buying, renting out and owning property.",
  "social-capital": "Relationships that help you and others.",
  "family-generational-wealth": "Money across partners, kids and parents.",
  "health-longevity": "Staying well, and what it saves you.",
  "time-capital": "Spending hours on what matters.",
  knowledge: "The books and ideas worth knowing.",
  "pre-retirement-design": "Planning the life after full-time work.",
  "the-long-game": "Decades-long thinking.",
};

const CHAPTERS = [
  {
    n: "Starting Out on Your Own",
    one: "You just started paying your own way.",
    is: ["First real job, or still in school", "First place, or still at home", "Still figuring out bills"],
  },
  {
    n: "Getting Established",
    one: "You have steady work and your own routine.",
    is: ["Same line of work for a year or more", "Your own place", "Bills mostly on autopilot"],
  },
  {
    n: "Partnering Up",
    one: "You're building a life with someone.",
    is: ["Moving in together", "Engaged or married", "Starting to mix money"],
  },
  {
    n: "Raising a Family",
    one: "Little people depend on you.",
    is: ["Kids at home", "Or planning for them soon", "Their costs shape your budget"],
  },
  {
    n: "Peak Earning Years",
    one: "You're earning the most you likely ever will.",
    is: ["A senior role", "Income steady and high", "The big expenses are known"],
  },
  {
    n: "Between Chapters",
    one: "Something big is changing right now.",
    is: ["Changing jobs, cities or relationships", "Or recently laid off", "The next step isn't settled yet"],
  },
  {
    n: "Winding Down",
    one: "Work is taking up less of your life.",
    is: ["Late career", "Caring for a parent", "Retiring, or close to it"],
  },
];
const LAUNCH = {
  Mega: "A big salary or big family help.",
  Soft: "Some help still coming in.",
  Stabilizing: "A rough start, steadying now.",
};

const ELEMENTS = {
  Earth: "Steady. Likes a plan and sticks to it.",
  Water: "Flexible. Goes with what life brings.",
  Fire: "Driven. Wants progress fast.",
  Air: "Curious. Loves ideas and options.",
  Spirit: "Purpose first. Money is a means, not the point.",
};
const DRIVES = [
  "Doing it right",
  "Helping others",
  "Achieving",
  "Being myself",
  "Understanding",
  "Feeling secure",
  "Freedom and fun",
  "Being in control",
  "Keeping the peace",
];
const IDENT = [
  { id: "surv", n: "The Survivor", one: "Getting through each month.", crit: [] },
  {
    id: "saver",
    n: "The Steady Saver",
    one: "Keeps a gap between money in and money out.",
    crit: [
      ["Save 10% or more of what you take home", d => d.rate >= 0.1],
      ["$1,000 cushion in place", d => d.g[1]],
    ],
  },
  {
    id: "prot",
    n: "The Protector",
    one: "Nothing knocks them over.",
    crit: [
      ["Full emergency fund", d => d.g[4]],
      ["3 or more protections in place", d => d.acDone >= 3],
    ],
  },
  {
    id: "inv",
    n: "The Investor",
    one: "Money works while they sleep.",
    crit: [
      ["A year of spending invested", (d, c) => c.inv >= c.spend * 12],
      ["Using tax-friendly accounts", (d, c) => c.tax !== "no"],
    ],
  },
  {
    id: "free",
    n: "The Free Agent",
    one: "Works because they want to.",
    crit: [["Enough invested to retire on time already", d => d.g[7]]],
  },
];

const DEBT_KINDS = [
  ["Credit card balance", 6000, true],
  ["Student loans", 28000, false],
  ["Car loan", 15000, false],
  ["Medical bills", 2000, false],
  ["Personal loan", 8000, true],
  ["Payday loan or cash advance", 1000, true],
  ["Buy now, pay later", 500, true],
  ["Owed to family or friends", 3000, false],
];
const INC_KINDS = [
  "A main job",
  "A second job",
  "Side gigs",
  "My own business",
  "Unemployment or benefits",
  "Help from family",
  "Retirement income",
];
const CASH_K = ["Checking", "Savings", "Cash at home"],
  CASH_W = { Checking: 0.3, Savings: 0.65, "Cash at home": 0.05, Cash: 1 },
  INC_W = {
    "A main job": 1,
    "My own business": 1,
    "Retirement income": 1,
    "A second job": 0.3,
    "Side gigs": 0.12,
    "Unemployment or benefits": 0.4,
    "Help from family": 0.15,
  },
  INV_K = ["Retirement plan at work", "IRA or Roth IRA", "Other investments", "HSA"],
  INV_W = { "Retirement plan at work": 5, "IRA or Roth IRA": 3, "Other investments": 2, HSA: 1 };
const ACCT_KINDS = CASH_K.concat(INV_K);
/* Typical starting guesses by kind of work: [money in, money out] per month. Placeholders only, shown as rough until the player sharpens them. */
const TYP = {
  Student: [1200, 1400],
  "First job": [3600, 3100],
  "A few jobs or gigs": [1900, 2000],
  Established: [5500, 4400],
  "Between jobs": [1500, 3000],
  "Self-employed": [4200, 3600],
  Retired: [3800, 3800],
};
const COVER = { "Less than a month": 0.5, "1 to 3 months": 2, "3 to 6 months": 4.5, "Longer than 6 months": 8 };
const SHARP_Q = {
  take: "Money coming in",
  spend: "Money going out",
  cash: "Cash you can reach",
  debt: "What you owe",
  inv: "What you have invested",
  match: "Your job's match",
  tax: "Your tax-friendly accounts",
};
const SHARP_FIND = {
  take: "Your pay stub, or the deposits in your bank app.",
  spend: "Add up last month's withdrawals in your bank app. A rough number is fine.",
  cash: "Your bank app: checking plus savings.",
  debt: "Each lender's app or latest statement shows the balance and the rate (APR).",
  inv: "Each account's app or latest statement.",
  match: 'Your benefits portal, your offer letter, or ask HR: "Do we have a 401(k) match?"',
  tax: "Each account's app shows what you put in this year.",
};
const rsum = a => a.reduce((x, y) => x + y.amt, 0);
const SPEND_K = ["Home", "Food", "Getting around", "Bills and subscriptions", "Fun and everything else"];
const SPEND_ONE = {
  Home: "Rent or what you pay at home, plus utilities.",
  Food: "Groceries and eating out.",
  "Getting around": "Car payment, gas, car insurance, transit, rides.",
  "Bills and subscriptions": "Phone, internet, streaming, other insurance, memberships.",
  "Fun and everything else": "Going out, shopping, hobbies, gifts, the rest.",
};
const SPLIT = [0.4, 0.2, 0.15, 0.1, 0.15],
  SPLIT_FAM = [0.15, 0.2, 0.25, 0.15, 0.25];
const PROT_Q = {
  health: ["Health insurance", ["Through my job", "Through a parent", "On my own", "None right now"]],
  car: ["Car insurance", ["Yes", "No", "No car"]],
  renters: ["Renters or home insurance", ["Yes", "No", "Don't need it"]],
  disab: ["Disability insurance", ["Yes", "No", "I'll find out"]],
  life: ["Life insurance", ["Yes", "No", "No one depends on me"]],
};
const APR_BANDS = ["Under 8%", "8% to 15%", "15% to 25%", "Over 25%"];
function depthLevel(c) {
  const l1 = sharpPct(c) >= 100,
    l2 =
      l1 &&
      c.debts.every(x => x.amt === 0 || (x.apr && x.apr !== "?")) &&
      c.cashes.every(x => !/Savings/.test(x.k) || x.hy),
    l3 = l2 && Object.keys(PROT_Q).every(k => c.prot[k]);
  return l3 ? 3 : l2 ? 2 : l1 ? 1 : 0;
}
const PROT_HELP = {
  health: "Covers doctor and hospital bills. Many people under 26 are on a parent's plan.",
  car: "Required if you drive. It pays when there's a crash.",
  renters: "Covers your stuff if it's stolen or there's a fire. Usually about $15 a month.",
  disab:
    "This is insurance, not being on disability. It pays part of your income if you get hurt or sick and can't work. It often comes with a job.",
  life: "Pays the people who depend on you if you die. If no one depends on you, you likely don't need it.",
};
const METHODS = ["Highest rate first", "Smallest balance first", "Least hassle first"];
const SCORE_BANDS = ["Under 580", "580 to 669", "670 to 739", "740 to 799", "800 or more", "I'll find out"];
/* catches: one quick follow-up when a step is done, so the game records what actually happened */
const NODE_CATCH = {
  cd_method: { q: "Which one did you pick?", opts: METHODS, key: "method" },
  cd_apr: {
    q: "What did they say?",
    opts: ["They lowered it", "They said no", "Couldn't get through"],
    key: "aprcall",
  },
  cd_auto: {
    q: "How many of your debts are on autopay now?",
    opts: ["All of them", "Some of them", "Just one"],
    key: "autopay",
  },
  cd_stop: { q: "What are you using instead of the card?", opts: ["Debit card", "Cash", "A mix"], key: "instead" },
  sf_buffer: {
    q: "About how much do you keep in checking as a buffer?",
    opts: ["Under $100", "$100 to $300", "$300 to $500", "Over $500"],
    key: "buffer",
  },
  sf_hysa: {
    q: "Which account did you open or move?",
    opts: ["A new savings account", "One I already had"],
    key: "hysa",
  },
  sf_deduct: {
    q: "What's your biggest deductible?",
    opts: ["Under $500", "$500 to $1,000", "$1,000 to $2,500", "Over $2,500", "I'll find out"],
    key: "deduct",
    h: "A health card often lists several. Use the in-network one. On a family plan, use the family number. Not sure? Pick the biggest one you see.",
  },
  sf_renters: {
    q: "About what does it cost a month?",
    opts: ["Under $15", "$15 to $30", "Over $30"],
    key: "rentersCost",
  },
  sf_disab: { q: "Where does the coverage come from?", opts: ["My job", "I bought it myself"], key: "disabFrom" },
  sf_term: {
    q: "How long does the policy last?",
    opts: ["10 years", "20 years", "30 years", "Not sure"],
    key: "termLen",
  },
  sf_benef: {
    q: "Which accounts did you check?",
    opts: ["All of them", "Retirement accounts only", "Bank accounts only"],
    key: "benef",
  },
  cd_full: {
    q: "Is the card set to pay the full balance on its own?",
    opts: ["Yes, automatic", "No, I do it by hand"],
    key: "fullpay",
  },
  cd_740: { q: "What's your score now?", opts: SCORE_BANDS, key: "score" },
};
function eraProg(c, d) {
  const e = Math.min(9, d.era + 1),
    s = eraSteps(c, d, e),
    dn = s.filter(x => x.done).length;
  return { e, n: ERAS[e].n, done: dn, total: s.length, pct: s.length ? Math.round((dn / s.length) * 100) : 0 };
}
function better(c, d) {
  const h = c.base || c.hist[0];
  if (!h) return { pct: 0, from: Math.round(d.nw), now: Math.round(d.nw) };
  const base = Math.max(Math.abs(h.nw), c.spend * 3, 1000);
  return { pct: Math.round(((d.nw - h.nw) / base) * 100), from: h.nw, now: Math.round(d.nw) };
}
function freeToSpend(c, d) {
  const p = spendParts(c),
    goal = Math.max(0, c.take - c.spend),
    real = isSharp(c, "take") && isSharp(c, "spend"),
    free = c.take >= c.spend ? p.flex : Math.max(0, c.take - p.fixed);
  return {
    in: c.take,
    bills: p.fixed,
    goal,
    free,
    week: Math.round((free * 12) / 52),
    real,
    short: c.take < c.spend ? c.spend - c.take : 0,
  };
}
function migrate(c) {
  const n = Object.assign(newChar(), c);
  n.sharp = Object.assign({ low: false, match: false, tax: false }, c.sharp || {});
  n.prot = n.prot || {};
  n.wins = n.wins || [];
  n.caught = n.caught || {};
  n.na = n.na || {};
  n.routines = n.routines || [];
  n.season = n.season || {};
  n.goals = n.goals || [];
  n.x = n.x || {};
  if (n.led && !(n.spends && n.spends.length)) {
    const sp = n.home === "With family" ? SPLIT_FAM : SPLIT,
      was = !!(c.sharp && c.sharp.spend);
    let left = n.spend;
    n.spends = SPEND_K.map((k, i) => {
      const a = i === 4 ? Math.max(0, left) : Math.round((n.spend * sp[i]) / 10) * 10;
      left -= a;
      return { k, amt: a, s: was };
    });
  }
  return n;
}
function syncDebt(c) {
  if (typeof cardSync === "function") cardSync(c); /* mycards.js: paid-in-full cards, the 0% end, the rough total */
  c.debt = rsum(c.debts);
  c.high = c.debts.some(x => x.high && x.amt > 0) ? "yes" : "no";
  c.debts.forEach(x => {
    x.was = Math.max(x.was || 0, x.amt);
  });
}
function syncAll(c) {
  if (!c.led) return;
  if (c.incs.length) c.take = rsum(c.incs);
  if (c.spends.length) c.spend = Math.max(1, rsum(c.spends));
  c.months = c.spend > 0 ? rsum(c.cashes.filter(x => !x.hold)) / c.spend : 0;
  c.inv = rsum(c.invs);
  syncDebt(c);
}
function isEmployee(c) {
  return !["Student", "Between jobs", "Self-employed", "Retired"].includes(c.work);
}
function isSharp(c, k) {
  return k === "take"
    ? c.incs.length > 0 && c.incs.every(x => x.s)
    : k === "cash"
      ? c.cashes.length > 0 && c.cashes.every(x => x.s)
      : k === "debt"
        ? c.debts.every(x => x.s)
        : k === "spend"
          ? c.spends.length > 0 && c.spends.every(x => x.s)
          : k === "inv"
            ? c.invs.every(x => x.s)
            : !!c.sharp[k];
}
function sharpList(c) {
  const l = ["take", "spend", "cash"].concat(
    c.debts.length ? ["debt"] : [],
    c.invs.length ? ["inv"] : [],
    isEmployee(c) ? ["match"] : [],
    c.invs.length ? ["tax"] : []
  );
  return c.gentle && l.includes("debt") ? l.filter(k => k !== "debt").concat(["debt"]) : l;
}
function sharpPct(c) {
  const l = sharpList(c);
  return Math.round((l.filter(k => isSharp(c, k)).length / l.length) * 100);
}
function sharpNext(c, today) {
  return sharpList(c).find(k => !isSharp(c, k) && c.skip[k] !== today) || null;
}
function applyTypical(c) {
  const s = c.sharp,
    t = TYP[c.work] || TYP["First job"],
    fam = c.home === "With family",
    r50 = x => Math.round(x / 50) * 50;
  c.led = true;
  const ik = c.incKinds.length ? c.incKinds : ["A main job"];
  const iw = ik.reduce((a, k) => a + (INC_W[k] || 0.3), 0);
  c.incs = ik.map(k => c.incs.find(x => x.k === k) || { k, amt: r50((t[0] * (INC_W[k] || 0.3)) / iw), s: false });
  if (!s.low) c.low = Math.round((rsum(c.incs) * 0.6) / 100) * 100;
  const TS = fam ? Math.round((t[1] * 0.5) / 100) * 100 : t[1],
    sp = fam ? SPLIT_FAM : SPLIT;
  if (fam && !c.spends.some(x => x.s)) c.moveOut = t[1] - TS;
  c.spends = SPEND_K.map(
    (k, i) => c.spends.find(x => x.k === k && (x.s || x.h)) || { k, amt: r50(TS * sp[i]), s: false }
  );
  c.spend = Math.max(1, rsum(c.spends));
  let T = (c.can1k === "No" ? 0.1 : COVER[c.cover] || 0.5) * c.spend;
  if (c.can1k === "Yes") T = Math.max(T, 1000);
  else T = Math.min(T, 900);
  const ck = CASH_K.filter(k => c.accts.includes(k));
  if (!ck.length) ck.push("Cash");
  const cw = ck.reduce((a, k) => a + (CASH_W[k] || 0.3), 0);
  c.cashes = ck.map(k => c.cashes.find(x => x.k === k) || { k, amt: r50((T * (CASH_W[k] || 0.3)) / cw), s: false });
  if (c.can1k === "Yes" && c.cashes.every(x => !x.s && !x.h) && rsum(c.cashes) < 1000)
    c.cashes[c.cashes.length - 1].amt += 1000 - rsum(c.cashes);
  const vk = INV_K.filter(k => c.accts.includes(k)),
    yr = c.spend * 12,
    a = Math.max(0, c.age - 22),
    V =
      c.invest === "Every month"
        ? yr * Math.min(6, Math.max(0.3, a / 8))
        : c.invest === "Sometimes"
          ? yr * Math.min(2, Math.max(0.1, a / 25))
          : 2000,
    W = vk.reduce((x, k) => x + INV_W[k], 0);
  c.invs = vk.map(k => c.invs.find(x => x.k === k) || { k, amt: Math.round((V * INV_W[k]) / W / 500) * 500, s: false });
  /* every line of a kind stays: a player can have several credit cards (mycards.js) */
  c.debts = c.debtKinds.flatMap(k => {
    const old = c.debts.filter(x => x.k === k),
      d = DEBT_KINDS.find(x => x[0] === k);
    return old.length ? old : [{ k, amt: d[1], high: d[2], s: false, was: d[1] }];
  });
  if (!s.match)
    c.match = !isEmployee(c) ? "no match offered" : c.accts.includes("Retirement plan at work") ? "yes" : "no";
  if (!s.tax) c.tax = c.invest === "Every month" && c.accts.includes("IRA or Roth IRA") ? "some" : "no";
  syncAll(c);
}
function rowsFromNumbers(c, inc) {
  c.led = true;
  c.incs = inc || [{ k: "A main job", amt: c.take, s: true }];
  c.incKinds = c.incs.map(x => x.k);
  c.cashes = [{ k: "Checking", amt: Math.round(c.months * c.spend), s: true }];
  c.invs = c.inv > 0 ? [{ k: "Retirement plan at work", amt: c.inv, s: true }] : [];
  c.debts.forEach(x => {
    x.s = true;
    x.was = x.amt;
  });
  c.debtKinds = c.debts.map(x => x.k);
  c.sharp = { low: true, match: true, tax: true };
  const sp = c.home === "With family" ? SPLIT_FAM : SPLIT;
  let left = c.spend;
  c.spends = SPEND_K.map((k, i) => {
    const a = i === 4 ? left : Math.round((c.spend * sp[i]) / 10) * 10;
    left -= a;
    return { k, amt: a, s: true };
  });
  syncAll(c);
}
function spendParts(c) {
  const g = k => {
    const r = c.spends.find(x => x.k === k);
    return r ? r.amt : 0;
  };
  const fixed = g("Home") + g("Getting around") + g("Bills and subscriptions"),
    flex = g("Food") + g("Fun and everything else");
  return { fixed, flex };
}
function rowsOf(c, t) {
  return t === "cash" ? c.cashes : t === "inv" ? c.invs : t === "debt" ? c.debts : c.incs;
}
/* a money move changes the ledger right away. types: paid (debt down), extra (cash up), saved (cash or investments up), cost (cash down, or debt up if it went on a card) */
function applyMove(c, m) {
  const p = m.row.split(":"),
    row = rowsOf(c, p[0])[+p[1]];
  if (!row) return 0;
  const before = derive(c).nw;
  if (m.t === "paid") row.amt = Math.max(0, row.amt - m.amt);
  else if (m.t === "extra" || m.t === "saved") row.amt += m.amt;
  else if (p[0] === "debt") row.amt += m.amt;
  else row.amt = Math.max(0, row.amt - m.amt);
  syncAll(c);
  m.k = row.k;
  m.delta = Math.round(derive(c).nw - before);
  c.moves.push(m);
  return m.delta;
}
/* cash flow: money in, money spent, a debt payment, or a move between accounts. Every one updates the balances it touches. */
/* time frames for the path, and schedules for things that repeat */
const HZ = [
  ["today", "Today", "Things you can finish in minutes."],
  ["week", "This week", "An hour or two each."],
  ["month", "This month", "Takes a few weeks, or it's a habit to build."],
  ["year", "This year", "The long ones. Chip away at them."],
];
const EFF_HZ = { m: "today", h: "week", d: "week", w: "month", o: "month", M: "year" };
const EVERY = { week: "Every week", "2weeks": "Every 2 weeks", "1and15": "On the 1st and 15th", month: "Once a month" };
function nextDue(s, every) {
  if (every === "week") return addDays(s, 7);
  if (every === "2weeks") return addDays(s, 14);
  const d = parseISO(s);
  if (every === "1and15") {
    if (d.getDate() < 15) d.setDate(15);
    else {
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
    }
    return iso(d);
  }
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return iso(d);
}
function routineDue(c, today) {
  return (c.routines || []).filter(r => r.next <= today);
}
function routineLabel(c, r) {
  const to = flowRow(c, r.to),
    nm = to ? to.k : "an account";
  return r.t === "pay"
    ? (r.auto ? "Confirm the " : "Pay ") +
        "$" +
        Math.round(r.amt).toLocaleString("en-US") +
        (r.auto ? " payment to " : " to ") +
        nm
    : (r.auto ? "Confirm the " : "Move ") +
        "$" +
        Math.round(r.amt).toLocaleString("en-US") +
        (r.auto ? " transfer into " : " into ") +
        nm;
}
/* role model (someone to aim at) and rival (someone close enough to catch) */
const RIVALS = {
  easy: { n: "Coasting Casey", r: 0.03, d: "Saves a little when it's easy." },
  normal: { n: "Everyday Riley", r: 0.08, d: "Saves about what most people do." },
  hard: { n: "Steady Jordan", r: 0.15, d: "Saves 15% and never misses a month." },
  expert: { n: "Relentless Morgan", r: 0.3, d: "Saves 30% and optimizes everything." },
  nepo: {
    n: "Trust-fund Taylor",
    r: 0.05,
    head: 100000,
    d: "Started with $100,000 from family. You win this one by not caring.",
  },
};
function rivalState(c, d, today, key) {
  const R = RIVALS[key] || RIVALS.normal,
    b = c.base || c.hist[0] || { d: today, nw: d.nw },
    days = Math.max(0, daysBetween(b.d, today)),
    you = Math.round(d.nw - b.nw),
    them = Math.round((c.take * R.r * days) / 30.4) + (R.head || 0);
  return { R, days, you, them, gap: you - them };
}
function roleModel(c) {
  const yrs = Math.max(0, c.age - 22),
    nw = Math.round(futureValueMonthly(900, yrs) / 1000) * 1000;
  return { yrs, nw, cushion: Math.max(3, Math.round(c.age / 5)) };
}
/* things that only matter at certain times of year */
const SEASONS = [
  {
    k: "tax",
    from: "01-15",
    to: "04-15",
    t: "Tax season",
    items: [
      [
        "forms",
        "Gather your tax forms",
        "W-2s come from jobs. 1099s come from gigs and banks. Most arrive by mid-February.",
      ],
      ["file", "File your tax return", "Free filing exists if your income is modest. The deadline is April 15."],
      ["refund", "Decide where your refund goes", "Pick before it lands: cushion, debt or investing."],
      [
        "hsa",
        "Save your HSA receipts",
        "Keep each health receipt with your tax papers. Your HSA can pay you back for it later.",
        "health",
      ],
    ],
  },
  {
    k: "oe",
    from: "11-01",
    to: "11-30",
    t: "Open enrollment month",
    items: [
      [
        "enroll",
        "Open enrollment check",
        "Many health plans let you pick next year's plan in the fall. Your window is on your benefits page.",
        "health",
      ],
      [
        "cover",
        "Is my coverage still right?",
        "Once a year, check that your cover still fits your life, your home and your people.",
        "insurance",
      ],
    ],
  },
  {
    k: "ye",
    from: "12-01",
    to: "12-31",
    t: "Before the year ends",
    items: [
      ["fsa", "Use up your health spending account", "Some accounts lose leftover money on December 31. Check yours."],
      [
        "retire",
        "Check this year's retirement savings",
        "See how close you are to what you planned, and top up if you can.",
      ],
      [
        "give",
        "Do your giving before December 31",
        "If you plan to give this year, do it now so it counts for this year.",
      ],
    ],
  },
];
function seasonItems(c, today) {
  const md = today.slice(5),
    y = today.slice(0, 4),
    out = [];
  SEASONS.forEach(S => {
    if (md >= S.from && md <= S.to)
      S.items.forEach(it => {
        const id = y + ":" + S.k + ":" + it[0];
        if (!(c.season && c.season[id])) out.push({ id, t: it[1], d: it[2], s: S.t });
      });
  });
  return out;
}
function invDue(c, today) {
  return c.invs.length > 0 && c.placed && (!c.invUpd || daysBetween(c.invUpd, today) >= 30);
}
function flowRow(c, key) {
  if (!key) return null;
  const p = key.split(":");
  return rowsOf(c, p[0])[+p[1]] || null;
}
function applyFlow(c, f) {
  const before = derive(c).nw,
    from = flowRow(c, f.from),
    to = flowRow(c, f.to);
  let amt = Math.max(0, Math.round(f.amt));
  if (f.t === "in") {
    if (to) to.amt += amt;
  } else if (f.t === "out") {
    if (from) {
      if (f.from.startsWith("debt")) from.amt += amt;
      else from.amt = Math.max(0, from.amt - amt);
    }
  } else if (f.t === "pay") {
    if (to) {
      amt = Math.min(amt, to.amt);
      to.amt -= amt;
    }
    if (from) from.amt = Math.max(0, from.amt - amt);
  } else if (f.t === "xfer") {
    if (from) from.amt = Math.max(0, from.amt - amt);
    if (to) to.amt += amt;
  }
  syncAll(c);
  const m = {
    d: f.d,
    t: f.t,
    amt,
    cat: f.cat || null,
    src: f.src || null,
    fk: from ? from.k : null,
    k: to ? to.k : from ? from.k : "",
    delta: Math.round(derive(c).nw - before),
  };
  c.moves.push(m);
  return m;
}
function monthSpent(c, ym) {
  const o = {};
  c.moves
    .filter(m => m.t === "out" && m.d.slice(0, 7) === ym && m.cat)
    .forEach(m => {
      o[m.cat] = (o[m.cat] || 0) + m.amt;
    });
  return o;
}
function monthMoves(c, ym) {
  const o = { paid: 0, extra: 0, saved: 0, cost: 0, in: 0, out: 0, pay: 0, xfer: 0, delta: 0, n: 0 };
  c.moves
    .filter(m => m.d.slice(0, 7) === ym)
    .forEach(m => {
      o[m.t] += m.amt;
      o.delta += m.delta;
      o.n++;
    });
  return o;
}

const NODE_HOW = {
  cd_list: {
    how: [
      "Open your debts here in the game.",
      "For each one, set what you owe and whether it charges 8% or more a year.",
      'Tap "That\'s about right" and this step finishes itself.',
    ],
    go: ["Open my debts", "sharp", "debt"],
  },
  cd_auto: {
    how: [
      "Log in to each card or lender.",
      "Turn on automatic payments for at least the minimum due.",
      'Come back and tap "I did it".',
    ],
  },
  cd_stop: {
    how: [
      "Take the card out of your wallet and remove it from shopping sites.",
      "Use your debit card or cash instead.",
      "Tap the next level at 10, 20 and 30 days.",
    ],
  },
  cd_method: {
    how: [
      "Highest rate first saves the most money.",
      "Smallest balance first gives the fastest win.",
      'Pick one, stick with it, and tap "I did it".',
    ],
  },
  cd_apr: {
    how: [
      "Call the number on the back of your card.",
      'Say: "I\'ve been a customer for a while. Can you lower my interest rate?"',
      'If they say no, ask once more. Either way, tap "I did it".',
    ],
  },
  cd_first: {
    how: [
      "Send every spare dollar to the one debt your method picked.",
      "Log each payment as a money move so the game keeps count.",
      "When that debt hits zero, this step finishes itself.",
    ],
    go: ["Log a payment", "move", "paid"],
  },
  cd_gone: {
    how: [
      "Keep going, one debt at a time.",
      "Each payment you free up rolls into the next debt.",
      "This finishes itself when nothing you owe charges 8% or more.",
    ],
    go: ["Log a payment", "move", "paid"],
  },
  cd_full: {
    how: [
      "Pay the full statement balance, not the minimum.",
      'Set autopay to "statement balance" if your card allows it.',
      "Tap the next level each month you do it.",
    ],
  },
  cd_740: {
    how: [
      "Check your score for free in your bank or card app.",
      "Pay on time and keep card balances low compared to their limits.",
      'Tap "I did it" when it reads 740 or more.',
    ],
  },
  sf_buffer: {
    how: [
      "Leave an extra $100 to $200 in checking that you never plan to spend.",
      "It's there so a bill and a paycheck crossing paths can't overdraw you.",
      'Tap "I did it".',
    ],
  },
  sf_little: {
    how: [
      "Move money into savings until your cash adds up to $1,000.",
      "Log it as a money move each time.",
      "This finishes itself when your cash reaches $1,000.",
    ],
    go: ["Log money saved", "move", "saved"],
  },
  sf_hysa: {
    how: [
      "Search for a high-yield savings account at a bank you trust.",
      "Open it online. It takes about 15 minutes.",
      'Add it under Money, then tap "I did it".',
    ],
    go: ["Open my accounts", "tab", "money"],
  },
  sf_deduct: {
    how: [
      "Find your health, car and renters insurance cards or apps.",
      "Note each deductible: the amount you pay yourself before insurance starts paying. Health cards list a few. The in-network one is the one that matters.",
      'Tap "I did it".',
    ],
  },
  sf_bige: {
    how: [
      "Keep adding to savings after your first $1,000.",
      "Log each deposit as a money move.",
      "The levels fill in by themselves as your cash grows.",
    ],
    go: ["Log money saved", "move", "saved"],
  },
  sf_renters: {
    how: [
      "Get a quote online from two insurers. It's often $10 to $20 a month.",
      "Pick one and sign up.",
      'Tap "I did it".',
    ],
  },
  sf_disab: {
    how: [
      "Check your benefits portal for short-term and long-term disability.",
      "Note what share of your pay it covers and for how long.",
      'If you have none, get one quote. Tap "I did it".',
    ],
  },
  sf_term: {
    how: [
      "Get a term life quote online for 10 to 12 times your yearly income.",
      "Term life is plain coverage for a set number of years.",
      'Sign up, then tap "I did it".',
    ],
  },
  sf_benef: {
    how: [
      "Log in to each account: bank, retirement, investments.",
      'Find "beneficiaries" and name who gets the money.',
      'Tap "I did it" when every account has one.',
    ],
  },
};
const DUP = {
  cd_list: "debt-leverage:0",
  cd_auto: "debt-leverage:1",
  cd_method: "debt-leverage:3",
  cd_stop: "debt-leverage:4",
  sf_little: "cash-safety-net:0",
  sf_hysa: "cash-safety-net:1",
  sf_bige: "cash-safety-net:3",
  cd_full: "credit-cards:0",
  cd_740: "credit-cards:2",
};
const DUPREV = {};
Object.keys(DUP).forEach(k => (DUPREV[DUP[k]] = k));
const GLOSSARY = {
  Deductible: "The amount you pay out of your own pocket before your insurance starts paying.",
  "In-network": "Doctors and hospitals your insurance has a deal with. They cost you less.",
  APR: "The yearly interest rate on a loan or card, fees included.",
  "401(k)": "A retirement account you get through your job. Money goes in straight from your paycheck.",
  "403(b)": "The same idea as a 401(k), for schools and nonprofits.",
  "Roth IRA":
    "A retirement account you open yourself. You pay tax on the money now, and it grows and comes out tax-free later.",
  IRA: "A retirement account you open yourself, separate from any job.",
  HSA: "A health savings account. It comes with certain health plans, and the money is never taxed if it's spent on health care.",
  "index fund": "One fund that owns a little of every company in a market, so you don't have to pick.",
  "expense ratio": "The yearly fee a fund charges, as a percent of what you have in it.",
  match: "Free money your employer adds when you save for retirement through work.",
  brokerage: "An account for buying investments like funds and stocks.",
  deductible: "What you pay out of pocket before insurance starts paying.",
  rebalance: "Moving money between investments to get back to the mix you planned.",
  "capital gains": "The profit when you sell an investment for more than you paid.",
  diversification: "Spreading money across many investments so one bad one can't sink you.",
  "net worth": "Everything you own minus everything you owe.",
  "emergency fund": "Cash set aside for surprises, so they don't go on a card.",
  "sinking fund": "Money you set aside a little at a time for a cost you know is coming.",
  "high-yield savings": "A savings account that pays noticeably more interest than a regular one.",
  "credit score": "A number lenders use to guess how likely you are to pay back. Higher is better.",
  utilization: "How much of your card limits you're using. Lower is better for your score.",
  refinance: "Replacing a loan with a new one, usually to get a lower rate.",
  MAGI: "A version of your income the tax rules use to decide what you qualify for.",
  RMD: "Money the rules force you to take out of retirement accounts starting in your 70s.",
  bracket: "The tax rate that applies to your next dollar of income.",
  "T-bills": "Short-term loans to the US government. Very safe, pay a little interest.",
  "I-Bonds": "US savings bonds whose interest rises with inflation.",
  TIPS: "US government bonds that rise with inflation.",
  ESPP: "A plan that lets you buy your employer's stock at a discount.",
  RSU: "Company stock given to you as pay, usually over a few years.",
  FI: "Financial independence: your investments can pay for your life.",
};
function termsIn(txt) {
  const t = " " + txt.toLowerCase() + " ";
  return Object.keys(GLOSSARY).filter(k => {
    const i = t.indexOf(k.toLowerCase());
    if (i < 0) return false;
    const a = t[i - 1],
      b = t[i + k.length];
    return !/[a-z0-9]/.test(a) && !/[a-rt-z0-9]/.test(b);
  });
}

function applies(c, n) {
  if (c.na && c.na[n.id]) return false;
  if (c.work === "Retired" && n.id === "sf_disab") return false;
  const owed = c.debts.filter(x => x.amt > 0);
  if (n.id === "cd_apr" && c.led && !owed.some(x => x.high)) return false;
  if (n.id === "cd_stop" && c.led && !owed.some(x => x.high || /card/i.test(x.k))) return false;
  if (n.id === "cd_method" && c.led && owed.length < 2) return false;
  return !(n.deps && (c.deps === "None" || c.deps === "Pets")) && !(n.id === "sf_renters" && c.home === "With family");
}
function iso(dt) {
  const p = n => String(n).padStart(2, "0");
  return dt.getFullYear() + "-" + p(dt.getMonth() + 1) + "-" + p(dt.getDate());
}
function todayISO() {
  return iso(new Date());
}
function parseISO(s) {
  const a = s.split("-").map(Number);
  return new Date(a[0], a[1] - 1, a[2]);
}
function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
function daysBetween(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 864e5);
}
function periods(f) {
  return { Weekly: 52, "Every 2 weeks": 26, "Twice a month": 24, Monthly: 12, "It varies": 12, Daily: 260 }[f] || 12;
}
function nextPayAfter(s, f) {
  if (f === "Weekly") return addDays(s, 7);
  if (f === "Every 2 weeks") return addDays(s, 14);
  if (f === "Twice a month") return addDays(s, 15);
  const d = parseISO(s);
  d.setMonth(d.getMonth() + 1);
  return iso(d);
}

function grow(inv, yr, save) {
  for (let i = 0; i < yr; i++) inv = inv * (1 + R) + save;
  return inv;
}
function yearsTo(inv, save, goal) {
  if (inv >= goal) return 0;
  for (let n = 1; n <= 80; n++) {
    inv = inv * (1 + R) + save;
    if (inv >= goal) return n;
  }
  return null;
}
function futureValueMonthly(m, years) {
  return m * 12 * ((Math.pow(1 + R, years) - 1) / R);
}
const clampStat = x => Math.max(8, Math.min(20, Math.round(x)));

function newChar(over) {
  return Object.assign(
    {
      name: "You",
      demo: false,
      age: 27,
      ret: 60,
      death: 90,
      payFreq: "Every 2 weeks",
      payNext: todayISO(),
      steady: "Steady",
      take: 4200,
      low: 3000,
      spend: 3600,
      moveOut: 1200,
      months: 0.5,
      inv: 2000,
      debt: 9000,
      high: "yes",
      match: "yes",
      tax: "no",
      bonus: "no",
      rel: "Single, seeking",
      intent: "Partnered",
      samePage: "Mostly",
      work: "First job",
      home: "Renting",
      deps: "None",
      element: "Fire",
      drive: "Achieving",
      order: "Planner",
      give: "Balanced",
      want: "saver",
      adv: "None",
      chapter: null,
      launch: "Soft",
      legacy: false,
      nodes: {},
      skills: {},
      muscles: {},
      plate: [],
      garden: [],
      compost: 0,
      boost: {},
      slots: 5,
      spoons: 3,
      streak: 0,
      lastDaily: "",
      calib: [],
      diary: [],
      paydays: [],
      hist: [],
      badges: [],
      peakEra: 0,
      confEra: null,
      dark: false,
      cross6: null,
      cross7: null,
      happy: null,
      saved: [],
      viewed: 0,
      placed: false,
      led: false,
      spends: [],
      prot: {},
      incs: [],
      incKinds: ["A main job"],
      cashes: [],
      invs: [],
      debts: [],
      debtKinds: [],
      mort: false,
      accts: ["Checking"],
      live: ["On my own"],
      share: "No one",
      can1k: "No",
      cover: "Less than a month",
      invest: "No",
      payKnown: false,
      sharp: { low: false, match: false, tax: false },
      wins: [],
      caught: {},
      na: {},
      routines: [],
      season: {},
      skip: {},
      moves: [],
      park: {},
      enn: null,
      x: {},
      goals: [],
      goalShare: null,
      hrs: null,
      tp: null,
      gentle: false,
      gwin: null,
    },
    over || {}
  );
}

function nodeRankRaw(c, d, id) {
  if (typeof esHas === "function" && esHas(id)) return esRank(c, d, id); /* eras.js: a step of that file */
  if (id[0] === "m") return c.muscles[id.slice(1)] ? 1 : 0;
  const nd = NODES.find(x => x.id === id);
  let v = c.nodes[id] || 0;
  if (id === "sf_little" && d.g[1]) v = Math.max(v, 1);
  if (id === "cd_gone" && c.high === "no") v = Math.max(v, 1);
  if (id === "cd_list" && c.led && c.debts.every(x => x.s) && isSharp(c, "cash")) v = Math.max(v, 1);
  if (id === "sf_renters" && c.prot.renters === "Yes") v = Math.max(v, 1);
  if (id === "sf_disab" && c.prot.disab === "Yes") v = Math.max(v, 1);
  if (id === "sf_term" && c.prot.life === "Yes") v = Math.max(v, 1);
  if (id === "sf_hysa" && c.cashes.some(x => x.hy)) v = Math.max(v, 1);
  if (id === "cd_first" && c.debts.some(x => x.amt === 0 && x.was > 0)) v = Math.max(v, 1);
  if (id === "sf_bige") v = Math.max(v, Math.floor(Math.min(1, c.months / d.target) * 4 + 1e-9));
  return Math.min(v, nd.r);
}
function nodeMax(id) {
  if (typeof esHas === "function" && esHas(id)) return esMax(id); /* eras.js: a step of that file */
  return id[0] === "m" ? 1 : NODES.find(x => x.id === id).r;
}
function nodeTitle(id) {
  if (typeof esHas === "function" && esHas(id)) return esTitle(id); /* eras.js: a step of that file */
  return id[0] === "m" ? MUSCLES[+id.slice(1)] : NODES.find(x => x.id === id).n;
}

/* derive(c) returns all computed numbers of one profile. deriveBase(c) is the part from this file. */
function derive(c) {
  const d = deriveBase(c);
  if (typeof deriveEras === "function") deriveEras(c, d); /* eras.js: hold a later era until its key moment is done */
  return d;
}
function deriveBase(c) {
  const d = {};
  d.cash = c.led ? rsum(c.cashes.filter(x => !x.hold)) : c.months * c.spend;
  d.nw = d.cash + c.inv - c.debt;
  d.realm = d.nw < 0 ? "Underground" : "Surface";
  d.fiSpend = (c.spend + (c.home === "With family" ? c.moveOut || 0 : 0)) * 12;
  d.fiBase = d.fiSpend / SWR;
  d.fi = fiNeed(c, c.age);
  d.save = Math.max(0, (c.take - c.spend) * 12);
  d.rate = c.take > 0 ? Math.max(0, (c.take - c.spend) / c.take) : 0;
  d.pct = d.fi > 0 ? Math.max(0, Math.min(100, (d.nw / d.fi) * 100)) : 0;
  d.level = Math.floor(d.pct);
  d.yrs = yearsTo(c.inv, d.save, d.fi);
  d.etaAge = d.yrs === null ? null : c.age + d.yrs;
  const toRet = Math.max(0, c.ret - c.age);
  d.toRet = toRet;
  d.target = Math.max(1, c.age / 5);
  d.fiRet = fiNeed(c, Math.max(c.age, c.ret));
  d.coastNum = d.fiRet / Math.pow(1 + R, toRet);
  d.qq = grow(c.inv, toRet, ROTH) >= d.fiRet;
  const X = c.x || {},
    rtd = c.work === "Retired";
  const g = [
    true,
    d.cash >= Math.min(1000, X.limit > 0 ? X.limit * 0.85 : 1000),
    c.match !== "no" || rtd,
    c.high === "no",
    c.months >= d.target || (X.limit > 0 && d.cash >= X.limit * 0.85),
    c.tax === "yes" || rtd,
    d.qq,
    c.inv >= d.coastNum,
    c.inv >= d.fi,
  ];
  g[9] = g[8] && (c.legacy || c.deps === "Kids" || c.rel === "Married");
  d.g = g;
  let e = 0;
  for (let i = 1; i < 10; i++) {
    if (g[i]) e = i;
    else break;
  }
  d.rawEra = e;
  d.era = c.confEra === null || c.confEra === undefined ? e : Math.min(e, c.confEra);
  d.pending = e > d.era;
  d.ahead = 0;
  for (const i of [8, 7, 5, 4]) {
    if (i > e + 1 && g[i]) {
      d.ahead = i;
      break;
    }
  }
  d.hp = Math.min(1, c.months / d.target);
  d.prot = NODES.filter(n => n.prot && applies(c, n));
  d.acDone = d.prot.filter(n => nodeRankRaw(c, d, n.id) >= n.r).length;
  d.acMax = d.prot.length;
  d.nodesDone = NODES.filter(n => nodeRankRaw(c, d, n.id) >= n.r).length;
  d.mus = Object.values(c.muscles).filter(Boolean).length;
  d.skillsDone = Object.keys(c.skills).length;
  d.varies = c.steady !== "Steady";
  d.lowGap = d.varies ? Math.max(0, c.spend - c.low) : 0;
  d.lowCover = d.lowGap > 0 ? d.cash / d.lowGap : null;
  d.dryNeed = (X.dry || 0) * d.lowGap;
  d.dryShort = d.dryNeed > d.cash;
  d.per = periods(c.payFreq);
  d.perPay = (c.take * 12) / d.per;
  d.perSpend = (c.spend * 12) / d.per;
  d.left = d.perPay - d.perSpend;
  d.stats = [
    ["Earning", "STR", clampStat(8 + c.take / 800)],
    ["Saving", "CON", clampStat(8 + d.rate * 40)],
    ["Flexibility", "DEX", clampStat(18 - (c.debt / Math.max(1, c.take * 12)) * 20 - (c.high === "yes" ? 2 : 0))],
    ["Know-how", "INT", clampStat(8 + d.mus * 0.5 + d.skillsDone * 0.1)],
    ["Habits", "WIS", clampStat(8 + d.nodesDone * 0.5 + c.streak * 0.3)],
    ["People", "CHA", clampStat(10 + (c.samePage === "Yes" ? 2 : 0) + (c.adv === "A strong network" ? 3 : 0))],
  ];
  /* SPARKS: what starting early is worth, against the same habits started from zero at 35 */
  if (c.age < 35 && d.yrs !== null) {
    const late = yearsTo(0, d.save, d.fi);
    d.sparksGain = late === null ? null : 35 + late - d.etaAge;
  } else d.sparksGain = null;
  return d;
}

/* eraSteps(c, d, e) returns the steps of era e. eraStepsBase() is the part from this file (eras 1 to 5). */
function eraSteps(c, d, e) {
  const steps = eraStepsBase(c, d, e);
  return typeof eraStepsMore === "function"
    ? eraStepsMore(steps, c, d, e)
    : steps; /* eras.js: the steps of this file */
}
function eraStepsBase(c, d, e) {
  const ids = (ERA_NODES[e] || []).filter(
    id =>
      (id[0] === "m" ||
        applies(
          c,
          NODES.find(n => n.id === id)
        )) &&
      !(e === 2 && c.match === "no match offered") &&
      !(e === 3 && c.debt === 0 && !["cd_method", "cd_stop", "cd_apr", "cd_first"].some(k => c.nodes[k]))
  );
  return ids.map(id => ({ id, title: nodeTitle(id), done: nodeRankRaw(c, d, id) >= nodeMax(id) }));
}
function unfinished(c, d) {
  const out = [];
  let weak = false;
  /* This file has steps for eras 1 to 5. eras.js has steps for eras 6 to 9. */
  const last = typeof esLastEra === "function" ? esLastEra() : 5;
  for (let e = 1; e <= Math.min(d.era, last); e++) {
    const s = eraSteps(c, d, e);
    if (!s.length) continue;
    const dn = s.filter(x => x.done).length;
    if (dn / s.length < 0.85) weak = true;
    s.filter(x => !x.done).forEach(x => out.push({ era: e, id: x.id, title: x.title }));
  }
  return { list: out, weak };
}

function chapterOf(c) {
  if (c.chapter) return c.chapter;
  if (c.work === "Retired") return "Winding Down";
  if (c.work === "Between jobs") return "Between Chapters";
  if (c.deps === "Kids") return "Raising a Family";
  if (c.rel === "Partnered" || c.rel === "Married") return "Partnering Up";
  if (c.work === "Established" || c.work === "Self-employed")
    return c.age >= 45 ? "Peak Earning Years" : "Getting Established";
  return "Starting Out on Your Own";
}
function identityNow(c, d) {
  let cur = IDENT[0];
  IDENT.forEach(i => {
    if (i.crit.length && i.crit.every(k => k[1](d, c))) cur = i;
  });
  return cur;
}

function conditions(c, d, today) {
  const out = [],
    add = (t, n, x, fix) => out.push({ t, n, d: x, fix });
  const uf = unfinished(c, d);
  lifeConditions(c, d, add, today);
  if (c.peakEra > d.era)
    add(
      "debuff",
      "Dark Age",
      "Life knocked you back from " + ERAS[c.peakEra].n + ". It happens. Climbing back is a Heroic comeback.",
      { l: "See what broke", a: "tab", v: "map" }
    );
  if (d.realm === "Underground")
    add("info", "Underground", "You owe more than you own. Every dollar of debt you pay is a step toward the surface.");
  if (c.work === "Between jobs")
    add(
      "info",
      "Runway mode",
      "Between jobs. Your cushion covers about " +
        (c.spend > 0 && c.take < c.spend ? (d.cash / (c.spend - c.take)).toFixed(1) : "many") +
        " months at this pace. The plan is to stretch it.",
      { l: "Update my numbers", a: "month" }
    );
  if (d.varies && d.lowGap > 0)
    add(
      "warn",
      "Bumpy income",
      "In a low month you're short about $" +
        Math.round(d.lowGap).toLocaleString() +
        ". Your cash covers " +
        (d.lowCover >= 10 ? "10 or more" : d.lowCover.toFixed(1)) +
        " low months. Plan your bills around the low month.",
      { l: "Open cushion steps", a: "node", v: "sf_buffer" }
    );
  if (c.work === "Self-employed")
    add(
      "info",
      "Self-employed",
      "No employer match, and taxes aren't taken out for you. Set tax money aside from every payment."
    );
  if (d.ahead && d.rawEra < 9)
    add(
      "warn",
      "Ahead, but with a gap",
      "Your numbers already pass the test for " +
        ERAS[d.ahead].n +
        ", but " +
        ERAS[d.rawEra + 1].n +
        " is still open: " +
        ERAS[d.rawEra + 1].gate.toLowerCase() +
        ". Close that gap and you jump ahead.",
      { l: "See the path", a: "tab", v: "map" }
    );
  if (uf.weak && sharpPct(c) >= 100)
    add(
      "debuff",
      "Unfinished foundation",
      "You moved up with " +
        uf.list.length +
        " earlier step" +
        (uf.list.length === 1 ? "" : "s") +
        " still open. They're on your Unfinished list.",
      { l: "Show the list", a: "unf" }
    );
  if (c.tax !== "no" && c.months < 2 && c.inv > 0 && d.era < 4)
    add(
      "debuff",
      "Glass cannon",
      "You're investing with under 2 months of cushion. One layoff could force you to sell at a bad time.",
      { l: "Build the cushion", a: "node", v: "sf_bige" }
    );
  if (c.bonus === "yes" && c.high === "yes")
    add(
      "debuff",
      "Points chaser",
      "Chasing card or bank bonuses while carrying 8%+ debt. The interest costs more than the points earn.",
      { l: "Open debt steps", a: "node", v: "cd_gone" }
    );
  if (d.nw > 100000 && d.acDone < 2)
    add("debuff", "Paper tiger", "Strong net worth, thin protection. One bad event could take a big bite.", {
      l: "Check protection",
      a: "node",
      v: "sf_disab",
    });
  if (c.months > d.target * 2 && d.era >= 4)
    add(
      "warn",
      "Cash hoarder",
      "Your cash is well past your emergency fund. Some of it could be working for future you."
    );
  if (d.pct >= 100 && c.ret > c.age && c.work !== "Retired")
    add(
      "warn",
      "One More Year",
      "You've reached Freedom but still plan more working years. What is the extra year for?"
    );
  if (c.inv >= 10000 && !c.muscles[5])
    add(
      "warn",
      "Sell fear",
      "You've never sold an investment. Selling a tiny amount once makes it a skill instead of a fear.",
      { l: "Open Muscles", a: "tab", v: "play" }
    );
  const h = c.hist;
  if (h.length >= 2) {
    const a = h[h.length - 2],
      b = h[h.length - 1];
    if (typeof enStepCreep === "function" && enStepCreep(a, b))
      add(
        "info",
        "Recalculating: spending and income",
        "Spending grew faster than income since your last session. Lifestyle creep in the Menu shows which line and the one next turn.",
        { l: "Open Lifestyle creep", a: "enough" }
      ); /* core/enough.js: the one creep check */
  }
  if (!c.demo) {
    if (c.lastDaily && daysBetween(c.lastDaily, today) > 14)
      add("warn", "Been a while", "No daily check in over two weeks. One tiny check today is enough to restart.", {
        l: "Do today's check",
        a: "tab",
        v: "play",
      });
  }
  if (c.viewed >= 10 && d.skillsDone + d.nodesDone <= 1)
    add(
      "warn",
      "Analysis paralysis",
      "Lots of looking, not much doing. Pick the one pulsing step and ignore the rest."
    );
  if (c.plate.length > c.slots) add("debuff", "Fatigue", "More active steps than you have energy for. Pause one.");
  if (c.prot && c.prot.health === "None right now")
    add("warn", "No health insurance", "One hospital visit can undo years of progress. Worth pricing a plan.", {
      l: "Open Money",
      a: "tab",
      v: "money",
    });
  if (c.garden.length > c.slots)
    add("debuff", "Too much at once", "You're focused on more tracks than you have energy for. Pause one.", {
      l: "Open my focus",
      a: "tab",
      v: "map",
    });
  if (c.age < 35 && d.rate >= 0.3 && c.inv > 0)
    add(
      "buff",
      "SPARKS",
      "Pursuing freedom early, on purpose." +
        (d.sparksGain
          ? " Starting now instead of from zero at 35 gets you there about " +
            d.sparksGain +
            " years sooner with the same habits."
          : "")
    );
  if (c.home === "With family")
    add(
      "buff",
      "Family safety net",
      "Living with family lowers your costs and backs you up. Your freedom number already includes what life costs once you move out."
    );
  if ((c.rel === "Partnered" || c.rel === "Married") && c.samePage === "Yes")
    add("buff", "Supportive partner", "You and your partner are on the same page about money.");
  if (c.streak >= 4) add("buff", "Momentum", c.streak + " daily checks in a row.");
  if (c.adv && c.adv !== "None") add("buff", "Unfair advantage", c.adv + ". Use it on purpose.");
  return out;
}

/* efficiency: payoff, times how well it fits where you are, times a safety bonus, divided by effort. 0 to 100. */
const LEVP = { S: 1, A: 0.8, B: 0.6, C: 0.45 },
  EFFD = { m: 1, h: 1.3, d: 1.7, w: 2.2, M: 3, o: 2 },
  EFFT = { m: "Minutes", h: "An hour or two", d: "About a day", w: "A few weeks", M: "Months", o: "An ongoing habit" },
  BAND_EFF = ["h", "d", "w", "w", "M"];
const REG_ERA = {
  debt: [0, 3],
  safety: [0, 5],
  cash: [0, 5],
  invest: [2, 9],
  taxes: [4, 9],
  earn: [0, 9],
  deals: [3, 9],
  home: [3, 9],
  people: [0, 9],
  life: [5, 9],
};
function nodeEff(n) {
  const e = n.e;
  return /min/.test(e)
    ? "m"
    : /hour/.test(e)
      ? "h"
      : /day/.test(e)
        ? "d"
        : /Week/.test(e)
          ? "w"
          : /Month/.test(e)
            ? "M"
            : "o";
}
let DUPSET = new Set();
function refreshDup(c, d) {
  DUPSET = new Set(
    Object.keys(DUP)
      .filter(k => nodeRankRaw(c, d, k) >= nodeMax(k))
      .map(k => DUP[k])
  );
}
function skillDone(c, id) {
  return !!c.skills[id] || DUPSET.has(id);
}
function treeSize(t) {
  return SKILLS[t].skills.length;
}
function treeDone(c, t) {
  let n = 0;
  const z = treeSize(t);
  for (let i = 0; i < z; i++) if (skillDone(c, t + ":" + i)) n++;
  return n;
}
function nextSkill(c, t) {
  const z = treeSize(t);
  for (let i = 0; i < z; i++) if (!skillDone(c, t + ":" + i)) return i;
  return -1;
}
function candidates(c, d, today) {
  const out = [],
    era = d.era,
    nxt = ERA_NODES[era + 1] || [],
    ear = [];
  for (let e = 1; e <= era; e++) (ERA_NODES[e] || []).forEach(x => ear.push(x));
  const parked = id => (c.na && c.na[id]) || (c.park[id] && daysBetween(c.park[id], today) < 7),
    noDebt = c.debt === 0;
  NODES.forEach(n => {
    if (nodeRankRaw(c, d, n.id) >= n.r || parked(n.id)) return;
    if (!applies(c, n)) return;
    if (noDebt && ["cd_list", "cd_auto", "cd_method", "cd_stop", "cd_apr", "cd_first", "cd_gone"].includes(n.id))
      return;
    if (n.id === "cd_first" && c.high !== "yes" && nodeRankRaw(c, d, "cd_method") < 1) return;
    const P = n.gate ? 1 : 0.8,
      F = nxt.includes(n.id) || ear.includes(n.id) ? 1.5 : 0.6,
      S = era < 5 || ear.includes(n.id) ? 1.3 : 1,
      ef = nodeEff(n);
    out.push({
      kind: "node",
      tier: nxt.includes(n.id) || ear.includes(n.id) ? 0 : 1,
      id: n.id,
      title: n.n,
      why: n.why,
      eff: ef,
      score: Math.round(Math.min(100, ((P * F * S) / EFFD[ef] / 1.95) * 100)),
      tag: nxt.includes(n.id)
        ? "Moves you toward " + ERAS[era + 1].n
        : ear.includes(n.id)
          ? "Left over from an earlier era"
          : "Good to have",
    });
  });
  if (typeof SKILLS !== "undefined")
    Object.keys(TREES).forEach(t => {
      if (!SKILLS[t]) return;
      const i = nextSkill(c, t);
      if (i < 0) return;
      const id = t + ":" + i;
      if (parked(id) || DUPREV[id]) return;
      const s = SKILLS[t].skills[i],
        z = treeSize(t),
        b = Math.floor(i / (z / 5)),
        ef = s[4] || BAND_EFF[b],
        rg = REG_ERA[TREES[t].r],
        dist = era < rg[0] ? rg[0] - era : era > rg[1] ? era - rg[1] : 0;
      let F = Math.max(0.3, 1 - 0.2 * dist);
      if (era < b * 2) F *= 0.5;
      const planted = c.garden.includes(t);
      if (planted) F *= 1.3;
      const g = treeGate(c, d, t);
      if (g) F *= 0.4;
      const S = (TREES[t].r === "debt" || TREES[t].r === "safety") && era < 5 ? 1.3 : 1;
      out.push({
        kind: "skill",
        tier: planted && !g ? 1 : 2,
        id,
        title: s[0],
        why: s[3] || s[1],
        eff: ef,
        score: Math.round(Math.min(100, (((LEVP[s[5]] || 0.6) * F * S) / EFFD[ef] / 1.95) * 100)),
        tag: g
          ? "Not the best time yet"
          : planted
            ? "From your focus"
            : dist === 0
              ? "Fits where you are"
              : "A bit early for you",
      });
    });
  const cn = constraint(c, d);
  if (cn && cn.k === "income") {
    const ern = out
        .filter(x => x.kind === "skill" && /^(income-career|side-hustles):/.test(x.id))
        .sort((a, b) => b.score - a.score),
      doneToday = Object.keys(c.skills).some(id => /^(income-career|side-hustles):/.test(id) && c.skills[id] === today);
    ern.forEach((x, i) => {
      x.tier = 0;
      x.tag = "Your biggest lever right now";
      if (i === 0 && !doneToday) x.score = 101;
    });
  }
  return out.sort((a, b) => a.tier - b.tier || b.score - a.score);
}
function bestMove(c, d, today) {
  const l = candidates(c, d, today || todayISO());
  return (
    l[0] || {
      kind: "plant",
      id: null,
      title: "Pick an area to work on",
      why: "Everything on your list is done or parked.",
      score: 0,
      eff: "m",
      tag: "",
    }
  );
}
function areaLevel(c, d, r) {
  const reg = REGIONS.find(x => x.id === r),
    ts = regionTrees(r);
  let lv = 0,
    cur = null;
  for (let b = 0; b < 5; b++) {
    let dn = 0,
      tot = 0;
    ts.forEach(t => {
      const z = treeSize(t) / 5;
      for (let k = 0; k < z; k++) {
        tot++;
        if (skillDone(c, t + ":" + (b * z + k))) dn++;
      }
    });
    if (reg.start)
      NODES.filter(n => n.t === reg.start && n.tier === TIERS[b] && applies(c, n)).forEach(n => {
        tot++;
        if (nodeRankRaw(c, d, n.id) >= n.r) dn++;
      });
    if (tot && dn / tot >= 0.8) lv++;
    else {
      cur = { done: dn, total: tot };
      break;
    }
  }
  return { level: Math.min(5, lv + 1), complete: lv >= 5, done: cur ? cur.done : 0, total: cur ? cur.total : 0 };
}
function treeGate(c, d, t) {
  if (t === "alternatives-speculation" && d.era < 5)
    return { why: "Side bets work best after your foundation is built.", route: "Reach the Future You era." };
  if (t === "withdrawal-decumulation" && d.era < 6)
    return {
      why: "Spending plans matter once you're on track to live off your investments.",
      route: "Reach Quiet Quitting FI.",
    };
  if (t === "real-estate" && c.high === "yes")
    return { why: "Lenders count heavy debt against you.", route: "Clear your 8%+ debt first (the Debt Free era)." };
  if (t === "deals-smart-buying" && c.high === "yes")
    return {
      why: "Everyday deals are fine now. Card and bank bonuses wait, because 8%+ interest eats more than a bonus pays.",
      route: "Clear your 8%+ debt, then bonuses open up.",
    };
  if (t === "entrepreneurship" && c.months < 1)
    return {
      why: "Starting a business with no cushion is a gamble.",
      route: "Build your $1,000 cushion, then a month of spending.",
    };
  return null;
}
function regionTrees(r) {
  return Object.keys(TREES).filter(t => TREES[t].r === r);
}
function regionScore(c, d, r) {
  const reg = REGIONS.find(x => x.id === r),
    ts = regionTrees(r);
  let done = ts.reduce((a, t) => a + treeDone(c, t), 0),
    den = 5 * ts.length;
  if (reg.start) {
    const ns = NODES.filter(n => n.t === reg.start && !(n.deps && c.deps === "None"));
    den += ns.length;
    done += ns.filter(n => nodeRankRaw(c, d, n.id) >= n.r).length;
  }
  return Math.round((done / den) * 100);
}

function paySuggest(c, d, free) {
  if (!d.g[1]) {
    const gap = Math.max(0, 1000 - d.cash);
    if (free && gap > 0 && free > gap && c.high === "yes") {
      const p = Math.max(1, Math.min(99, Math.round((gap / free) * 100)));
      return {
        split: { Cushion: p, "Extra on debt": 100 - p },
        why: "Finish your $1,000 cushion first, then send the rest at the debt charging 8% or more.",
      };
    }
    return { split: { Cushion: 100 }, why: "Your first $1,000 comes before everything else." };
  }
  if (c.high === "yes")
    return { split: { "Extra on debt": 100 }, why: "Debt at 8% or more is the best guaranteed return you have." };
  if (!d.g[4]) return { split: { Cushion: 100 }, why: "Next gate is your full emergency fund." };
  return { split: { Invest: 100 }, why: "Your foundation is set. This is money for future you." };
}
function payScore(pick, sug) {
  let s = 0;
  Object.keys(sug).forEach(k => (s += Math.min(pick[k] || 0, sug[k])));
  return s;
}
function payImpact(c, d) {
  const L = d.left;
  if (L <= 0) return null;
  if (!d.g[1]) return { goal: "your $1,000 cushion", n: Math.max(1, Math.ceil((1000 - d.cash) / L)) };
  if (c.high === "yes") return { goal: "paying off what you owe", n: Math.max(1, Math.ceil(c.debt / L)) };
  if (!d.g[4])
    return { goal: "your full emergency fund", n: Math.max(1, Math.ceil((d.target * c.spend - d.cash) / L)) };
  return null;
}

function snapshot(c, d, today, verified) {
  return {
    d: today,
    nw: Math.round(d.nw),
    debt: c.debt,
    inv: c.inv,
    cash: Math.round(d.cash),
    take: c.take,
    spend: c.spend,
    era: d.era,
    yrs: d.yrs,
    verified: !!verified,
  };
}
function wrapped(c, today) {
  const yr = today.slice(0, 4),
    h = c.hist.filter(x => x.d.slice(0, 4) === yr),
    first = h[0],
    last = h[h.length - 1];
  const feels = {};
  c.diary
    .filter(x => x.d.slice(0, 4) === yr)
    .forEach(x => {
      feels[x.feel] = (feels[x.feel] || 0) + 1;
    });
  const top = Object.keys(feels).sort((a, b) => feels[b] - feels[a])[0] || null;
  return {
    year: yr,
    nwChange: first && last ? last.nw - first.nw : 0,
    debtPaid: first && last ? Math.max(0, first.debt - last.debt) : 0,
    eras: first && last ? last.era - first.era : 0,
    skills: Object.values(c.skills).filter(x => String(x).slice(0, 4) === yr).length,
    days: c.diary.filter(x => x.d.slice(0, 4) === yr).length,
    paydays: c.paydays.filter(x => x.d.slice(0, 4) === yr).length,
    feeling: top,
    badges: c.badges.filter(x => x.d.slice(0, 4) === yr).length,
    sessions: h.length,
  };
}

function sampleChars(today) {
  const mk = (o, months) => {
    const c = newChar(o);
    delete c.start;
    c.payKnown = true;
    c.placed = true;
    c.debts = o.debts || [];
    rowsFromNumbers(c, o.incs);
    c.demo = true;
    let d = derive(c);
    c.confEra = d.rawEra;
    c.peakEra = d.rawEra;
    const start = Object.assign({}, o.start || {});
    for (let i = months; i >= 0; i--) {
      const t = i / months,
        cc = Object.assign({}, c);
      ["debt", "inv", "months", "spend", "take"].forEach(k => {
        if (start[k] !== undefined) cc[k] = Math.round((c[k] + (start[k] - c[k]) * t) * 100) / 100;
      });
      cc.confEra = null;
      cc.led = false;
      const dd = derive(cc);
      const s = snapshot(cc, dd, addDays(today, -30 * i - 2), true);
      c.hist.push(s);
    }
    const feels = ["Okay", "Tight", "Okay", "Proud", "Stressed", "Okay", "Calm", "Okay", "Proud", "Okay"];
    for (let i = 9; i >= 1; i--)
      c.diary.push({ d: addDays(today, -i), feel: feels[i], what: ["Nothing much"], win: "Just showed up", note: "" });
    c.lastDaily = addDays(today, -1);
    c.streak = 9;
    c.calib = [72, 81, 88, 90, 93];
    for (let i = 4; i >= 1; i--)
      c.paydays.push({ d: addDays(today, -14 * i), score: i > 2 ? 50 : 100, quiz: i % 2 === 0 });
    c.badges.push({ id: "firstnode", label: "First step mastered", d: addDays(today, -60) });
    return c;
  };
  return [
    mk(
      {
        name: "Maya (sample)",
        age: 27,
        ret: 60,
        take: 4200,
        spend: 3600,
        months: 0.5,
        inv: 2000,
        debt: 9000,
        high: "yes",
        match: "yes",
        tax: "no",
        work: "First job",
        home: "Renting",
        rel: "Single, seeking",
        intent: "Partnered",
        element: "Fire",
        want: "saver",
        nodes: { cd_list: 1, cd_auto: 1, sf_buffer: 1 },
        muscles: { 8: "done", 12: "done" },
        debts: [{ k: "Credit card balance", amt: 9000, high: true }],
        accts: ["Checking", "Savings", "Retirement plan at work"],
        payNext: today,
        garden: [],
        start: { debt: 12400, months: 0.1, inv: 800 },
      },
      5
    ),
    mk(
      {
        name: "Sam (sample)",
        age: 24,
        ret: 62,
        payFreq: "It varies",
        steady: "Changes month to month",
        take: 2600,
        low: 1400,
        spend: 1700,
        moveOut: 1500,
        months: 1,
        inv: 500,
        debt: 3000,
        high: "no",
        match: "no match offered",
        tax: "no",
        work: "Self-employed",
        home: "With family",
        rel: "Single by choice",
        intent: "Single by choice",
        element: "Water",
        drive: "Freedom and fun",
        want: "saver",
        adv: "Low cost of living",
        incs: [
          { k: "Side gigs", amt: 1500, s: true },
          { k: "My own business", amt: 1100, s: true },
        ],
        debts: [{ k: "Owed to family or friends", amt: 3000, high: false }],
        live: ["Parents or family"],
        accts: ["Checking", "Savings"],
        nodes: { cd_list: 1, cd_auto: 1, sf_buffer: 1, cd_method: 1, cd_stop: 3, cd_apr: 1, cd_first: 1 },
        payNext: addDays(today, 3),
        start: { debt: 5200, months: 0.2, inv: 0 },
      },
      5
    ),
    mk(
      {
        name: "Dev (sample)",
        age: 41,
        ret: 60,
        take: 9800,
        spend: 5600,
        months: 9,
        inv: 520000,
        debt: 0,
        high: "no",
        match: "yes",
        tax: "yes",
        work: "Established",
        home: "Owning",
        rel: "Married",
        intent: "Married",
        samePage: "Yes",
        deps: "Kids",
        element: "Earth",
        drive: "Feeling secure",
        want: "free",
        live: ["A partner", "Kids"],
        share: "A partner",
        accts: ACCT_KINDS.slice(),
        nodes: {
          cd_list: 1,
          cd_auto: 1,
          cd_method: 1,
          cd_stop: 3,
          cd_apr: 1,
          cd_first: 1,
          cd_full: 3,
          cd_740: 1,
          sf_buffer: 1,
          sf_hysa: 1,
          sf_deduct: 1,
          sf_renters: 1,
          sf_disab: 1,
          sf_benef: 1,
        },
        muscles: { 0: "done", 4: "done", 8: "done", 11: "done", 12: "done" },
        garden: ["main-path", "tax-strategy"],
        skills: { "main-path:0": today, "main-path:1": today, "main-path:2": today, "tax-strategy:0": today },
        payNext: addDays(today, 6),
        start: { inv: 452000, months: 8 },
      },
      5
    ),
  ];
}

/* ===== v13: time is the currency. Every money choice moves a date. ===== */
const LASTCHECK = "November 2026";
const GOAL_K = [
  ["Trip", 3000, 4],
  ["Home", 40000, 5],
  ["Car", 12000, 4],
  ["Wedding", 20000, 4],
  ["Sabbatical", 15000, 6],
  ["Quit my job", 30000, 7],
  ["Help family", 5000, 4],
  ["Something else", 2000, 4],
];
const GOAL_ONE = {
  Trip: "A big trip.",
  Home: "A down payment on a place of your own.",
  Car: "Buying a car with cash, or most of it.",
  Wedding: "Yours, or helping with one.",
  Sabbatical: "Months off work, paid for ahead of time.",
  "Quit my job": "A year of living costs set aside, so you can leave.",
  "Help family": "Money to help someone you love.",
  "Something else": "Anything. You can name it.",
};
const BLOCKS = {
  money: ["Money", "There isn't enough left over each month yet."],
  time: ["Time", "It fits, but it takes longer than you want to wait."],
  energy: ["Energy", "You're stretched thin, and this needs more than you have right now."],
  skill: ["Skill", "You'd need to be able to do something you can't do yet."],
  knowledge: ["Knowledge", "You don't know how it works yet."],
  people: ["People or permission", "Someone else has to say yes first."],
  fear: ["Fear", "Something about it scares you."],
  rules: ["Rules", "Age, credit score or eligibility is in the way."],
};
const BLOCK_STEP = {
  money: "The fix is a bigger gap between what comes in and what goes out. Earning more usually moves it fastest.",
  time: "Place it in an earlier era, shrink the price, or send it a bigger share on payday.",
  energy: "Pick the smallest step on your path this week and nothing else. Energy comes back.",
  skill: "Find the skill under Skills and do its first step.",
  knowledge: "Ask one person who has done it, or look the words up in the Glossary.",
  people: "Have the conversation. Write down the one question you need answered.",
  fear: "Say the fear out loud to someone you trust. Naming it is the first step.",
  rules: "Find the exact rule and the date or number that unlocks it.",
};
function niceAmt(x) {
  const s = [
    500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 12000, 15000, 20000, 25000, 30000, 40000, 50000, 60000,
    75000, 100000, 150000, 200000,
  ];
  return s.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
}
function goalTypical(c, k) {
  const g = GOAL_K.find(x => x[0] === k) || GOAL_K[7];
  return k === "Quit my job" ? niceAmt(c.spend * 12) : k === "Sabbatical" ? niceAmt(c.spend * 6) : g[1];
}
function goalAmts(c, k) {
  const t = goalTypical(c, k),
    o = [];
  [0.25, 0.5, 1, 2, 4].forEach(m => {
    const v = niceAmt(t * m);
    if (!o.includes(v)) o.push(v);
  });
  return o;
}
function goalEraHint(k) {
  return (GOAL_K.find(x => x[0] === k) || GOAL_K[7])[2];
}
function hiDebt(c) {
  return c.led
    ? c.debts.filter(x => x.high && x.amt > 0).reduce((a, x) => a + x.amt, 0)
    : c.high === "yes"
      ? c.debt
      : 0;
}
/* one month at a time: goals take their share, the rest follows the eras (cushion, heavy debt, full cushion, investing) */
function fmtDur(mo) {
  const days = Math.round(mo * 30.44);
  if (days < 1) return "less than a day";
  if (days === 1) return "1 day";
  if (days < 14) return days + " days";
  if (days < 84) return Math.round(days / 7) + " weeks";
  if (mo < 23.5) return Math.round(mo) + " months";
  const y = Math.floor((mo + 0.5) / 12),
    r = Math.round(mo - y * 12);
  return y + (y === 1 ? " year" : " years") + (r > 0 ? " and " + r + (r === 1 ? " month" : " months") : "");
}
function goalFit(c, g, sim) {
  const at = sim.goalAt[g.id];
  return at != null && c.age + at / 12 <= c.death;
}
function goalBlock(c, g, sim) {
  if (g.blk) return g.blk;
  const sc = c.caught && c.caught.score;
  if (g.k === "Home" && (sc === "Under 580" || sc === "580 to 669")) return "rules";
  return sim.M <= 0 ? "money" : "time";
}
/* how far the nearest goal and the next era move when something changes */
function timeShift(c, opt) {
  const a = goalSim(c),
    b = goalSim(c, opt),
    goals = [],
    d = derive(c);
  (c.goals || []).forEach(g => {
    if (g.done || g.era == null) return;
    const x = a.goalAt[g.id],
      y = b.goalAt[g.id];
    if (x == null) return;
    if (y == null) goals.push({ n: g.n, was: x, by: null });
    else if (Math.abs(y - x) > 0.03) goals.push({ n: g.n, was: x, by: y - x });
  });
  goals.sort((p, q) => p.was - q.was);
  let era = null;
  for (let e = d.era + 1; e <= 8; e++) {
    if (a.eraAt[e] != null && a.eraAt[e] > 0) {
      const y = b.eraAt[e];
      era = { e, n: ERAS[e].n, was: a.eraAt[e], by: y == null ? null : y - a.eraAt[e] };
      break;
    }
  }
  return { goals, era, a, b };
}
function shiftLine(ts) {
  const g = ts.goals[0];
  if (g)
    return g.by == null
      ? g.n + " comes off the calendar until there's a gap again"
      : g.n + " moves " + (g.by > 0 ? "back " : "closer by ") + fmtDur(Math.abs(g.by));
  const e = ts.era;
  if (e && (e.by == null || Math.abs(e.by) > 0.03))
    return e.by == null
      ? e.n + " comes off the calendar until there's a gap again"
      : e.n + " moves " + (e.by > 0 ? "back " : "closer by ") + fmtDur(Math.abs(e.by));
  return null;
}
/* what is left of free-to-spend this month */
function flexLeft(c, d, today) {
  const fs = freeToSpend(c, d),
    sp = monthSpent(c, today.slice(0, 7)),
    used = (sp["Food"] || 0) + (sp["Fun and everything else"] || 0),
    dt = parseISO(today),
    dim = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate(),
    daysLeft = dim - dt.getDate() + 1,
    logged = Object.keys(sp).length > 0;
  return {
    free: fs.free,
    used,
    logged,
    daysLeft,
    dim,
    left: Math.max(0, Math.round(logged ? fs.free - used : (fs.free * daysLeft) / dim)),
    real: fs.real,
  };
}
const m$ = n =>
  typeof roughOn === "function" && roughOn()
    ? enRough(n) || "$0" /* Rough numbers: the same range as money() */
    : (n < 0 ? "-" : "") + "$" + Math.round(Math.abs(n)).toLocaleString("en-US");
/* "Is it safe to spend this?" Never a flat no. Always the trade. */
function safeSpend(c, d, amt, monthly, today) {
  const fl = flexLeft(c, d, today),
    M = c.take - c.spend,
    math = [],
    lines = [];
  let light = "green",
    head = "",
    alt = null;
  const hz = c.payKnown && c.payNext < "9000" && c.payNext >= today ? c.payNext : addDays(today, 14),
    up = (c.routines || []).filter(r => r.next <= hz).reduce((a, r) => a + r.amt, 0),
    chk = (c.cashes || []).find(x => x.k === "Checking");
  math.push(
    "Free to spend each month: " + m$(fl.free) + " (money in " + m$(c.take) + ", minus bills, minus your goals)."
  );
  math.push(
    fl.logged
      ? "Logged so far this month on food and fun: " + m$(fl.used) + ". Left: " + m$(fl.left) + "."
      : "Nothing logged this month, so the game counts " +
          fl.daysLeft +
          " of " +
          fl.dim +
          " days: " +
          m$(fl.left) +
          " left."
  );
  if (monthly) {
    const ts = timeShift(c, { monthly: amt }),
      sl = shiftLine(ts),
      M2 = M - amt;
    math.push("Left over each month now: " + m$(M) + ". With this added: " + m$(M2) + ".");
    math.push(
      m$(amt) +
        " a month is " +
        m$(amt * 12) +
        " a year. Covering it for good takes about " +
        m$((amt * 12) / SWR) +
        " invested (" +
        m$(amt * 12) +
        " divided by 4%)."
    );
    if (M2 < 0) {
      light = "red";
      head = "Yes, as a swap.";
      lines.push("On top of what you spend now, " + m$(-M2) + " more would go out than comes in each month.");
      lines.push("It works if " + m$(amt) + " of something else comes out to make room.");
    } else if (sl) {
      light = "yellow";
      head = "Yes, and " + sl + ".";
      lines.push("That's " + m$(amt * 12) + " a year that was headed to your goals.");
      alt = "Yes with nothing moving, if it replaces " + m$(amt) + " of what you already spend on food and fun.";
    } else {
      head = "Yes.";
      lines.push("It fits in the gap between what comes in and what goes out, and no date moves.");
    }
  } else {
    const over = amt - fl.left;
    if (over <= 0) {
      head = "Yes.";
      lines.push("It fits inside your free-to-spend. Nothing else moves.");
      lines.push(m$(fl.left - amt) + " left for food and fun until the month ends.");
    } else {
      const after = d.cash - amt,
        floor = d.g[4] ? d.target * c.spend : Math.min(1000, d.cash),
        ts = timeShift(c, { once: over }),
        sl = shiftLine(ts),
        din = Math.max(1, Math.ceil(over / 40)),
        wait =
          M > 0
            ? "Or wait about " + fmtDur(over / M) + ", and it's a clean yes."
            : fl.left > 0
              ? "Or keep it to " + m$(fl.left) + " and it's a yes today."
              : "Or find " + m$(over) + " to trim somewhere else first, and it's a yes.";
      math.push("Over your free-to-spend by " + m$(over) + ". Cash after spending it: " + m$(after) + ".");
      if (M > 0)
        math.push(
          "Left over each month: " + m$(M) + ". So " + m$(over) + " takes about " + fmtDur(over / M) + " to make back."
        );
      if (after >= floor - 0.5) {
        light = "yellow";
        head = sl ? "Yes, and " + sl + "." : "Yes, and it comes out of money you were saving.";
        lines.push(
          (fl.left > 0 ? m$(fl.left) + " comes from free-to-spend. The other " : "The ") +
            m$(over) +
            " comes from money that was headed to your goals."
        );
        alt =
          over <= 200 && over <= fl.free * 0.6
            ? "Yes with nothing moving, if you skip about " +
              din +
              " dinner" +
              (din === 1 ? "" : "s") +
              " out this month."
            : wait;
      } else if (after >= Math.max(1000, c.spend)) {
        light = "yellow";
        head = "Yes, and your cushion dips to " + m$(after) + ".";
        lines.push(
          "That's about " +
            Math.round((after / Math.max(1, c.spend)) * 10) / 10 +
            " months of bills, under your full emergency fund of " +
            m$(d.target * c.spend) +
            "."
        );
        if (sl) lines.push("And " + sl + ".");
        alt = wait;
      } else if (after >= 0) {
        light = "red";
        head = "You can, and the price is your cushion.";
        const wk = Math.round((after / Math.max(1, c.spend)) * 4.35);
        lines.push(
          "Your cash drops to " +
            m$(after) +
            ", " +
            (wk < 1 ? "less than a week" : "about " + wk + " week" + (wk === 1 ? "" : "s")) +
            " of bills."
        );
        if (sl) lines.push("And " + sl + ".");
        alt = wait;
      } else {
        const short = -after;
        light = "red";
        head = "You can, but it would go on a card or a loan.";
        lines.push(
          "Your cash covers " +
            m$(Math.max(0, d.cash)) +
            " of it. Borrowing the other " +
            m$(short) +
            " at about 22% a year costs about " +
            m$(short * 0.22 * 0.54) +
            " in interest if you take a year to pay it back."
        );
        if (sl) lines.push("And " + sl + ".");
        math.push(
          "Interest: " +
            m$(short) +
            " at 22%, paid down evenly over 12 months, is about " +
            m$(short * 0.22 * 0.54) +
            "."
        );
        alt = wait;
      }
    }
  }
  if (d.dryShort && !monthly) {
    if (light === "green") light = "yellow";
    lines.push(
      "Heads up: slow months are coming and your cushion doesn't cover them yet. You still need about " +
        m$(d.dryNeed - d.cash) +
        " set aside."
    );
  }
  if (up > 0) {
    math.push("Scheduled payments before your next payday: " + m$(up) + ".");
    if (chk && !monthly && chk.amt - up - amt < 0) {
      if (light === "green") light = "yellow";
      lines.push(
        "Heads up: " +
          m$(up) +
          " in scheduled payments comes out of checking before your next payday. Move money over first."
      );
    }
  }
  return { amt, monthly: !!monthly, light, head, lines, alt, math, left: fl.left, real: fl.real };
}
/* time ledger: what an hour is worth, to your money and to you */
const APR_MID = { "Under 8%": 5, "8% to 15%": 12, "15% to 25%": 20, "Over 25%": 28, "No interest": 0 };
function debtRate(x) {
  if (x.apr && APR_MID[x.apr] != null)
    return { r: x.rate != null && x.rate >= 0 ? x.rate : APR_MID[x.apr], real: true };
  return {
    r: /payday|cash advance/i.test(x.k || "") ? 300 : /famil|medical/i.test(x.k || "") ? 0 : x.high ? 22 : 6,
    real: false,
  };
}
function hoursOf(c) {
  const h = c.hrs || {};
  return { w: h.w == null ? 40 : h.w, cm: h.cm == null ? 4 : h.cm, s: !!h.s };
}
/* Income from work only: a job, a second job, side gigs, a business. Benefits, help from family and retirement
   income are not pay for hours, so the real hourly wage leaves them out. */
const WORK_INC = ["A main job", "A second job", "Side gigs", "My own business"];
function workTake(c) {
  if (!c.led || !(c.incs || []).length) return ownTake(c);
  return (c.incs || []).filter(x => !x.partner && WORK_INC.indexOf(x.k) >= 0).reduce((a, x) => a + (x.amt || 0), 0);
}
function timeLedger(c, d) {
  const h = hoursOf(c),
    wk = h.w + h.cm,
    pay = workTake(c),
    works = c.work !== "Retired" && h.w > 0 && pay > 0,
    wage = works && wk > 0 ? (pay * 12) / 52 / wk : 0,
    mw = (c.inv * R) / 8760;
  let dy = 0,
    dreal = true;
  if (c.led)
    c.debts.forEach(x => {
      if (x.amt > 0) {
        const r = debtRate(x);
        dy += (x.amt * r.r) / 100;
        if (!r.real || !x.s) dreal = false;
      }
    });
  else {
    dy = c.debt * (c.high === "yes" ? 0.22 : 0.06);
    dreal = false;
  }
  const dc = dy / 8760;
  return {
    h,
    wk,
    pay,
    wage,
    mw,
    dc,
    dy,
    net: mw - dc,
    minsDay: wage > 0 ? ((mw * 24) / wage) * 60 : 0,
    crossInv: wage > 0 ? (wage * 8760) / R : null,
    cross: wage > 0 && mw >= wage,
    covers: c.take > 0 ? (c.inv * R) / 12 / c.take : 0,
    rw: h.s && isSharp(c, "take"),
    rm: c.led && c.invs.every(x => x.s),
    rd: dreal,
  };
}
const TP_Q = [
  { k: "family", h: 4, t: "An extra Saturday afternoon with people you love", a: [60, 150, 400] },
  { k: "rest", h: 3, t: "A free evening with nothing you have to do", a: [30, 75, 200] },
  { k: "chores", h: 3, t: "Three hours of cleaning and errands done for you", a: [30, 75, 180] },
  { k: "commute", h: 4, t: "An hour less travel to work, every week this month", a: [40, 100, 250] },
  { k: "work", h: 4, t: "Keep your evening and skip an extra 4-hour shift", a: [60, 120, 300] },
];
const TP_N = {
  family: "Time with people",
  rest: "Rest",
  chores: "Chores",
  commute: "Getting to work",
  work: "Extra work",
};
function tpAsk(i, ans) {
  const q = TP_Q[i % 5],
    r = Math.floor(i / 5);
  return { q, amt: r === 0 ? q.a[1] : ans[i - 5] === "time" ? q.a[2] : q.a[0] };
}
function tpPrice(q, a0, a1) {
  const lo = q.a[0],
    mid = q.a[1],
    hi = q.a[2],
    v = a0 === "time" ? (a1 === "time" ? hi * 1.25 : (mid + hi) / 2) : a1 === "time" ? (lo + mid) / 2 : lo * 0.6;
  return Math.round(v / q.h);
}
function tpAll(ans) {
  const o = {};
  TP_Q.forEach((q, i) => {
    o[q.k] = tpPrice(q, ans[i], ans[i + 5]);
  });
  return o;
}
const BUYBACK = [
  { k: "chores", n: "A house cleaner", cost: 35, hrs: 6 },
  { k: "chores", n: "Grocery delivery", cost: 12, hrs: 4 },
  { k: "chores", n: "A yard or lawn service", cost: 45, hrs: 4 },
];
/* panel fixes */
function constraint(c, d) {
  if (c.work === "Retired" || c.work === "Student") return null;
  const line = leverLine(c);
  if (c.take <= c.spend && c.take >= line)
    return {
      k: "spend",
      t: "The gap is your biggest lever",
      d: "More goes out than comes in right now. Until that flips, nothing else can move.",
    };
  if (c.take < line)
    return {
      k: "income",
      t: "Earning more is your biggest lever",
      d: "Cutting can only save what you spend. Earning has no ceiling. At this income, a raise or a side income moves you faster than any budget trick.",
    };
  return null;
}
function actionsDone(c) {
  return (
    Object.keys(c.nodes).length +
    Object.keys(c.skills).length +
    c.moves.length +
    c.paydays.length +
    c.diary.length +
    (c.goals || []).length
  );
}
function newbie(c, today) {
  return !c.demo && actionsDone(c) < 3 && !(c.base && daysBetween(c.base.d, today || todayISO()) >= 3);
}
function bigThree(c) {
  const g = k => {
    const r = c.spends.find(x => x.k === k);
    return r ? r.amt : 0;
  };
  const rows = ["Home", "Getting around", "Food"].map(k => ({
    k,
    amt: g(k),
    pct: c.take > 0 ? Math.round((g(k) / c.take) * 100) : 0,
  }));
  const tot = rows.reduce((a, x) => a + x.amt, 0);
  return {
    rows,
    tot,
    pct: c.take > 0 ? Math.round((tot / c.take) * 100) : 0,
    top: rows.slice().sort((a, b) => b.amt - a.amt)[0],
  };
}
function keepRate(c) {
  const r = c.take > 0 ? (c.take - c.spend) / c.take : 0,
    fam = c.home === "With family" && c.moveOut > 0;
  return {
    pct: Math.round(Math.max(-1, r) * 100),
    own: fam ? Math.round(((c.take - c.spend - c.moveOut) / Math.max(1, c.take)) * 100) : null,
  };
}
function futureCost(x, yrs) {
  return Math.round(x * Math.pow(1 + R, yrs));
}

/* ===== v14: the whole life. Household, Social Security, home, taxes, slow months, survival, moves, mentors, drawdown ===== */
const SS_YEAR = 2026,
  SS_B1 = 1286,
  SS_B2 = 7749,
  SS_MAX = 15375,
  SSI_LIMIT = 2000;
function ownTake(c) {
  const p = (c.incs || []).filter(x => x.partner).reduce((a, x) => a + x.amt, 0);
  return Math.max(0, c.take - p);
}
function ssEst(take, stopAge) {
  if (!(take > 0)) return 0;
  const yrs = Math.max(0, Math.min(35, (stopAge || 67) - 22)),
    aime = (Math.min(SS_MAX, take / 0.8) * yrs) / 35;
  return Math.round(
    0.9 * Math.min(aime, SS_B1) + 0.32 * Math.max(0, Math.min(aime, SS_B2) - SS_B1) + 0.15 * Math.max(0, aime - SS_B2)
  );
}
function passives(c) {
  const X = c.x || {},
    sh = X.ss == null ? 0.75 : X.ss,
    ret = c.work === "Retired",
    incs = c.incs || [];
  const now = ret ? c.take : incs.filter(x => x.k === "Retirement income").reduce((a, x) => a + x.amt, 0),
    pt = incs.filter(x => x.partner).reduce((a, x) => a + x.amt, 0);
  const full = ret || c.age >= 67 ? 0 : ssEst(Math.max(0, ownTake(c) - now), Math.max(c.ret, c.age)) + ssEst(pt, 67);
  return {
    now,
    full,
    ss: sh * full,
    sh,
    pen: X.pen && X.pen.amt > 0 && !ret ? { amt: X.pen.amt, age: X.pen.age || 65 } : null,
  };
}
function endsOf(c) {
  const X = c.x || {},
    o = (X.ends || []).filter(e => e.amt > 0 && e.yrs > 0).slice();
  if (X.home && X.home.pmt > 0 && X.home.yrs > 0) o.push({ k: "Mortgage", amt: X.home.pmt, yrs: X.home.yrs });
  return o;
}
/* how much invested makes work optional at a given age: spending, minus what will pay you anyway, plus the years you must bridge */
function fiNeed(c, age, opt) {
  opt = opt || {};
  const p = passives(c),
    ends = endsOf(c),
    y = Math.max(0, age - c.age),
    base = c.spend + (opt.monthly || 0) + (c.home === "With family" ? c.moveOut || 0 : 0);
  const late = Math.max(0, base - ends.reduce((a, e) => a + e.amt, 0)),
    P = p.now + p.ss + (p.pen ? p.pen.amt : 0) + (opt.passive || 0);
  let need = (Math.max(0, late - P) * 12) / SWR;
  const pv = n => (n <= 0 ? 0 : (1 - Math.pow(1 + SWR, -n)) / SWR);
  if (p.ss > 0) need += pv(67 - age) * Math.min(p.ss, late) * 12;
  if (p.pen) need += pv(p.pen.age - age) * Math.min(p.pen.amt, late) * 12;
  ends.forEach(e => {
    need += pv(e.yrs - y) * e.amt * 12;
  });
  return need;
}
function hiRate(c) {
  if (!c.led) return 22;
  const hs = c.debts.filter(x => x.high && x.amt > 0),
    t = hs.reduce((a, x) => a + x.amt, 0);
  if (!t) return 22;
  return Math.max(8, Math.min(400, hs.reduce((a, x) => a + x.amt * debtRate(x).r, 0) / t));
}
function goalSim(c, opt) {
  opt = opt || {};
  const d = derive(c),
    X = c.x || {},
    ends = endsOf(c),
    keep = opt.keep == null ? 1 : opt.keep,
    spend0 = c.spend + (opt.monthly || 0),
    M = (c.take - spend0) * keep,
    share = opt.share != null ? opt.share : c.goalShare == null ? 0.5 : c.goalShare;
  let cash = d.cash,
    inv = c.inv,
    hi = hiDebt(c),
    owe = opt.once || 0,
    era = d.era,
    runway = null;
  const fund = opt.fund || {},
    hr = hiRate(c) / 1200,
    lim = X.limit > 0 ? X.limit * 0.9 : Infinity;
  const gs = (c.goals || [])
    .filter(g => !g.done && (g.era != null || opt.all))
    .map((g, i) => ({
      id: g.id,
      era: g.era == null ? d.era : g.era,
      need: Math.max(0, g.cost - (g.fund || 0) - (fund[g.id] || 0)),
      i,
    }))
    .sort((a, b) => a.era - b.era || a.i - b.i);
  const eraAt = {},
    goalAt = {},
    target = Math.min(d.target * spend0, lim),
    first = Math.min(1000, lim),
    toRet = d.toRet,
    needRet = fiNeed(c, Math.max(c.age, c.ret), opt),
    retd = c.work === "Retired";
  gs.forEach(g => {
    if (g.need <= 0) goalAt[g.id] = 0;
  });
  const chain = m => {
    const left = Math.max(0, toRet - m / 12),
      g = [
        true,
        cash >= first,
        true,
        hi <= 0.5,
        cash >= target - 0.5,
        true,
        grow(inv, Math.round(left), ROTH) >= needRet,
        inv >= needRet / Math.pow(1 + R, left),
        inv >= fiNeed(c, c.age + m / 12, opt),
      ];
    let e = 0;
    for (let i = 1; i < 9; i++) {
      if (g[i]) e = i;
      else break;
    }
    return e;
  };
  const e0 = chain(0);
  for (let k = era + 1; k <= e0; k++) eraAt[k] = 0;
  era = Math.max(era, e0);
  const lastEnd = ends.reduce((a, e) => Math.max(a, e.yrs * 12), 0);
  /* opt.flows: a move of core/career.js, [{ at, monthly }]: from month at (0 is this month) on, more (+) or less (-)
     money is left each month. It does not change spending, so the freedom number stays. */
  const flowAt = k => (opt.flows || []).reduce((a, f) => a + (f.at <= k ? f.monthly : 0), 0);
  for (let m = 1; m <= 600; m++) {
    let s = M + ends.reduce((a, e) => a + (m > e.yrs * 12 ? e.amt : 0), 0) * keep + flowAt(m - 1);
    if (hi > 0) hi *= 1 + hr;
    if (s < 0) {
      if (retd) {
        inv += s;
        if (inv < 0) {
          cash += inv;
          inv = 0;
        }
      } else cash += s;
      if (cash < 0) {
        hi -= cash;
        cash = 0;
      }
      if (runway === null && cash <= 0) runway = m;
      inv *= 1 + R / 12;
      if (m > lastEnd && (runway !== null || m > 240)) break;
      continue;
    }
    if (owe > 0) {
      const u = Math.min(owe, s);
      owe -= u;
      s -= u;
    }
    const act = gs.filter(g => g.need > 0 && g.era <= era);
    let pot = act.length ? s * share : 0,
      rest = s - pot,
      used = 0;
    const potT = pot;
    act.forEach(g => {
      if (pot <= 0) return;
      const u = Math.min(g.need, pot);
      if (u >= g.need - 1e-9) goalAt[g.id] = m - 1 + (used + u) / potT;
      g.need -= u;
      pot -= u;
      used += u;
    });
    rest += pot;
    let u = Math.min(Math.max(0, first - cash), rest);
    cash += u;
    rest -= u;
    u = Math.min(hi, rest);
    hi -= u;
    rest -= u;
    u = Math.min(Math.max(0, target - cash), rest);
    cash += u;
    rest -= u;
    inv = inv * (1 + R / 12) + rest;
    const e = chain(m);
    if (e > era) {
      for (let k = era + 1; k <= e; k++) eraAt[k] = m;
      era = e;
    }
    if (era >= 8 && gs.every(g => g.need <= 0)) break;
    if (s === 0 && inv <= 0 && m > lastEnd) break;
  }
  return { M, eraAt, goalAt, share, runway };
}
/* when nothing is left over */
function survival(c, d) {
  const M = c.take - c.spend;
  if (M >= 0 || c.work === "Retired") return null;
  const short = -M,
    X = c.x || {},
    rows = (c.spends || []).slice().sort((a, b) => b.amt - a.amt),
    tl = timeLedger(c, d);
  return {
    short,
    runway: d.cash / short,
    big: rows[0] || null,
    fixed: X.fixed || 0,
    hoursWk: tl.wage > 0 ? short / tl.wage / 4.33 : null,
  };
}
function debtOutlook(c, d) {
  const bal = hiDebt(c);
  if (bal <= 0) return null;
  const r = hiRate(c) / 1200,
    M = c.take - c.spend,
    int = Math.round(bal * r),
    five = Math.round((bal * r) / (1 - Math.pow(1 + r, -60)) - (bal * r + bal * 0.01));
  if (M < 0) return { bal, rate: r * 1200, grow: true, perMo: Math.round(-M), int, five: Math.max(0, five) };
  let b = bal,
    m = 0;
  while (b > 50 && m < 720) {
    b = b * (1 + r) - (b * r + Math.max(25, b * 0.01) + M);
    m++;
  }
  return { bal, rate: r * 1200, mo: m, int, slow: m > 84, extra: M, five: Math.max(0, five - M) };
}
function monthsUntil(iso, today) {
  const a = parseISO(today || todayISO()),
    b = parseISO(iso);
  return Math.max(
    0,
    (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + (b.getDate() - a.getDate()) / 30
  );
}
function goalNeed(c, g, sim, today) {
  if (!g.byDate) return null;
  const by = monthsUntil(g.byDate, today),
    left = Math.max(0, g.cost - (g.fund || 0)),
    need = by > 0 ? left / by : left,
    M = Math.max(0, sim.M),
    at = sim.goalAt[g.id];
  return {
    by,
    need,
    have: M * sim.share,
    ok: at != null && at <= by + 0.05,
    late: at == null ? null : at - by,
    shareNeed: M > 0 ? need / M : null,
  };
}
/* moves: the big choices podcast guests talk about, tried on your own numbers */
const mvClone = c => {
  const x = JSON.parse(JSON.stringify(Object.assign({}, c, { hist: [], moves: [], diary: [] })));
  return x;
};
function scaleSpend(c, ks, f) {
  const x = mvClone(c);
  if (x.led && x.spends.length) {
    x.spends.forEach(r => {
      if (ks.includes(r.k)) r.amt = Math.round(r.amt * f);
    });
    syncAll(x);
  } else {
    const sh = ks.reduce((a, k) => a + ({ Home: 0.35, "Getting around": 0.15, Food: 0.14 }[k] || 0), 0);
    x.spend = Math.round(x.spend * (1 - sh * (1 - f)));
  }
  return x;
}
function scaleAll(c, f) {
  const x = mvClone(c),
    fx = Math.min(c.spend, (c.x && c.x.fixed) || 0),
    nw = fx + (c.spend - fx) * f,
    k = nw / Math.max(1, c.spend);
  if (x.led && x.spends.length) {
    x.spends.forEach(r => (r.amt = Math.round(r.amt * k)));
    syncAll(x);
  } else x.spend = Math.round(nw);
  return x;
}
function addIncome(c, amt, pct) {
  const x = mvClone(c),
    own = ownTake(c),
    add = Math.round(own * pct + amt);
  if (x.led && x.incs.length) {
    const r = x.incs.find(i => !i.partner) || x.incs[0];
    r.amt = Math.max(0, r.amt + add);
    syncAll(x);
  } else x.take = Math.max(0, x.take + add);
  return x;
}
const WORKER = c => !["Retired", "Student"].includes(c.work);
const MOVES = [
  {
    id: "househack",
    n: "House hack",
    d: "Rent out rooms or a unit so your housing costs about 40% less.",
    fit: c => c.home !== "With family" && c.work !== "Retired",
    ap: c => scaleSpend(c, ["Home"], 0.6),
  },
  {
    id: "roommate",
    n: "Take a roommate",
    d: "Share the place. Housing drops about 20%.",
    fit: c => c.home === "Renting" && c.deps !== "Kids",
    ap: c => scaleSpend(c, ["Home"], 0.8),
  },
  {
    id: "cheaper",
    n: "Move somewhere cheaper",
    d: "Same life in a lower-cost place. Everything you can cut drops about 30%.",
    fit: c => c.home !== "With family",
    ap: c => scaleAll(c, 0.7),
  },
  {
    id: "carlite",
    n: "Go car-light",
    d: "Bike, walk, share or ride for most trips. Getting around costs half.",
    fit: c => !c.led || c.spends.some(r => r.k === "Getting around" && r.amt > 100),
    ap: c => scaleSpend(c, ["Getting around"], 0.5),
  },
  {
    id: "big3",
    n: "Trim the big three by 10%",
    d: "Home, getting around and food, each 10% lighter.",
    fit: c => true,
    ap: c => scaleSpend(c, ["Home", "Getting around", "Food"], 0.9),
  },
  {
    id: "half",
    n: "Live on half",
    d: "Spend half of what comes in and keep the rest.",
    fit: c => WORKER(c) && c.take >= 3000 && c.spend > c.take * 0.5,
    ap: c => scaleAll(c, Math.max(0.3, (c.take * 0.5) / Math.max(1, c.spend))),
  },
  {
    id: "raise",
    n: "Get a 10% raise",
    d: "Ask, or earn it. 10% more coming in.",
    fit: c => WORKER(c) && c.work !== "Between jobs",
    ap: c => addIncome(c, 0, 0.1),
  },
  {
    id: "switch",
    n: "Switch jobs for 20% more",
    d: "The biggest raises usually come from changing employers.",
    fit: c => WORKER(c) && c.age < 55,
    ap: c => addIncome(c, 0, 0.2),
  },
  {
    id: "side",
    n: "Add $500 a month on the side",
    d: "A side income, however you make it.",
    fit: c => c.work !== "Retired" && !((c.x || {}).limit > 0),
    ap: c => addIncome(c, 500, 0),
  },
  {
    id: "parttime",
    n: "Part-time freedom",
    d: "You don't need the whole number. $1,500 a month from work you like covers part of the bills, so freedom comes sooner.",
    fit: c => WORKER(c),
    ap: c => c,
    opt: { passive: 1500 },
  },
  {
    id: "mini",
    n: "Mini-retirements",
    d: "Set aside 6.5% of pay for a month off every other year. It costs time on the far end and buys it back now.",
    fit: c => WORKER(c) && c.take > c.spend,
    ap: c => addIncome(c, 0, -0.065),
    cost: true,
  },
];
function moveResult(c, mv, base) {
  base = base || goalSim(c);
  const d = derive(c),
    x = mv.ap(c),
    alt = goalSim(x, mv.opt),
    f0 = d.era >= 8 ? 0 : base.eraAt[8],
    dx = derive(x),
    f1 = dx.era >= 8 ? 0 : alt.eraAt[8];
  let nx = null;
  for (let e = d.era + 1; e <= 7; e++) {
    const a = base.eraAt[e],
      b = alt.eraAt[e];
    if (a != null && a > 0 && b != null) {
      nx = { e, by: a - b };
      break;
    }
    if (a == null && b != null) {
      nx = { e, on: b };
      break;
    }
  }
  let gl = null;
  (c.goals || []).some(g => {
    if (g.done || g.era == null) return false;
    const a = base.goalAt[g.id],
      b = alt.goalAt[g.id];
    if (a != null && b != null && Math.abs(a - b) > 0.03) {
      gl = { n: g.n, by: a - b };
      return true;
    }
    if (a == null && b != null) {
      gl = { n: g.n, on: b };
      return true;
    }
    return false;
  });
  const dm = x.take - x.spend - (c.take - c.spend);
  return {
    id: mv.id,
    free: f0 != null && f1 != null ? f0 - f1 : null,
    on: f0 == null && f1 != null ? f1 : null,
    f1,
    nx,
    gl,
    dm,
    score: f0 != null && f1 != null ? f0 - f1 : f0 == null && f1 != null ? 600 - f1 : dm / 100,
  };
}
function movesFor(c) {
  const base = goalSim(c);
  return MOVES.filter(m => m.fit(c))
    .map(m => Object.assign({ mv: m }, moveResult(c, m, base)))
    .sort((a, b) => b.score - a.score);
}
const MENTORS = [
  {
    id: "koski",
    n: "Jackie Cummings Koski",
    line: "Left work at 49 with $1.3 million, as a single mom whose salary never passed $80,000.",
    lesson: "A late start on an ordinary salary can still get there.",
    moves: ["big3", "raise", "parttime"],
  },
  {
    id: "mendonsa",
    n: "Jonathan Mendonsa",
    line: "Finished pharmacy school owing $168,000 and cleared it in about four and a half years.",
    lesson: "A hard few years on debt buys back every year after.",
    moves: ["half", "big3"],
  },
  {
    id: "barrett",
    n: "Brad Barrett",
    line: "An accountant who reached financial independence at 35.",
    lesson: "A normal career plus steady saving is enough.",
    moves: ["half", "big3"],
  },
  {
    id: "johnsrud",
    n: "Jillian Johnsrud",
    line: "Began with $55,000 of debt, got to financial independence at 32, raised six kids and has taken more than a dozen mini-retirements.",
    lesson: "You can take breaks on the way instead of waiting for the end.",
    moves: ["half", "mini"],
  },
  {
    id: "fientist",
    n: "Brandon, the Mad Fientist",
    line: "Left his software job at 34 in 2016. He has since said he wishes he had balanced saving with enjoying life along the way.",
    lesson: "Get there, but not by giving up the years in between.",
    moves: ["half", "parttime"],
  },
  {
    id: "shenleung",
    n: "Kristy Shen and Bryce Leung",
    line: "Put their house fund into investments, and left their engineering jobs in 2015 at 31 and 32 with about $1 million.",
    lesson: "Housing is the biggest choice you make. It's allowed to be a different one.",
    moves: ["cheaper", "roommate"],
  },
  {
    id: "mmm",
    n: "Mr. Money Mustache",
    line: "Stopped working around 30 and has written for years about living well on a small budget in Colorado.",
    lesson: "Spending less is the fastest lever most people have.",
    moves: ["carlite", "half"],
  },
];
/* retirees: a paycheck from savings */
function drawdown(c, d) {
  if (c.work !== "Retired") return null;
  const gap = Math.max(0, c.spend - c.take),
    rate = c.inv > 0 ? (gap * 12) / c.inv : gap > 0 ? 1 : 0;
  let inv = c.inv,
    y = 0;
  if (gap > 0)
    while (inv > 0 && y < 60) {
      inv = inv * 1.04 - gap * 12;
      y++;
    }
  else y = 60;
  return {
    gap,
    rate,
    years: y,
    toAge: y >= 60 ? null : c.age + y,
    light: rate <= 0.04 ? "green" : rate <= 0.055 ? "yellow" : "red",
    safe: Math.round((c.inv * 0.04) / 12),
  };
}
const TX_DEF = { "Retirement plan at work": "pre", "IRA or Roth IRA": "roth", "Other investments": "tax", HSA: "hsa" },
  TX_N = {
    pre: "Taxed when you take it out",
    roth: "Never taxed again (Roth)",
    tax: "Regular account",
    hsa: "Health account",
  };
function txOf(r) {
  return r.tx || TX_DEF[r.k] || "tax";
}
function txSplit(c) {
  const o = { pre: 0, roth: 0, tax: 0, hsa: 0 };
  (c.invs || []).forEach(r => {
    o[txOf(r)] += r.amt;
  });
  return o;
}
function bridge(c, d) {
  const stop = Math.max(c.age, c.ret);
  if (stop >= 59.5) return null;
  const yrs = 59.5 - stop,
    need = yrs * c.spend * 12,
    s = txSplit(c),
    reach = s.tax + Math.max(0, d.cash - d.target * c.spend);
  return { stop, yrs, need, reach, short: Math.max(0, need - reach), split: s };
}
/* questions that only show up when your earlier answers call for them. One tap each. */
const LIFE = [
  {
    id: "limit",
    when: c => (c.incKinds || []).includes("Unemployment or benefits"),
    q: "Do your benefits stop if you save too much?",
    h: "Some programs, like SSI and some Medicaid, have a savings limit.",
    o: [
      ["Yes, the limit is about $2,000", 2000],
      ["Yes, about $3,000 (a couple)", 3000],
      ["No limit", 0],
      ["Not sure", -1],
    ],
    set: (c, v) => {
      c.x.limit = v < 0 ? 2000 : v;
      c.x.limitSure = v >= 0;
    },
  },
  {
    id: "forgive",
    when: c => (c.debts || []).some(x => /student/i.test(x.k)),
    q: "Are your student loans on a forgiveness track?",
    h: "Like public service forgiveness, or an income-based plan that forgives what's left.",
    o: [
      ["Yes", "yes"],
      ["No", "no"],
      ["Not sure", "?"],
    ],
    set: (c, v) => {
      c.x.forgive = v;
    },
  },
  {
    id: "taxwhen",
    when: c => c.work === "Self-employed" || (c.incKinds || []).some(k => /business|gigs/i.test(k)),
    q: "The income you entered: is that before or after tax money is set aside?",
    h: "If nobody takes taxes out of what you earn, it's before.",
    o: [
      ["After taxes", 0],
      ["Before. I should hold back about 15%", 15],
      ["Before. About 20%", 20],
      ["Before. About 25%", 25],
      ["Before. About 30%", 30],
    ],
    set: (c, v) => {
      setTaxPct(c, v);
    },
  },
  {
    id: "taxheld",
    when: c => (c.x.taxPct || 0) > 0 && c.led,
    q: "Is some of the cash you entered really tax money you'll owe?",
    o: [
      ["No", 0],
      ["About $1,000", 1000],
      ["About $2,500", 2500],
      ["About $5,000", 5000],
      ["About $10,000", 10000],
    ],
    set: (c, v) => {
      setTaxHeld(c, v);
    },
  },
  {
    id: "dry",
    when: c => c.steady !== "Steady",
    q: "How many slow months do you get in a year?",
    h: "Months when a lot less comes in.",
    o: [
      ["None", 0],
      ["1", 1],
      ["2", 2],
      ["3", 3],
      ["4", 4],
      ["6 or more", 6],
    ],
    set: (c, v) => {
      c.x.dry = v;
    },
  },
  {
    id: "partner",
    when: c => /Married|Partnered/.test(c.rel || "") || /partner/i.test(c.share || ""),
    q: "Does a partner's income help pay for the spending you entered?",
    h: "If you only entered your own half of things, pick No.",
    o: [
      ["No, it's only my money", 0],
      ["Yes, about $1,500 a month", 1500],
      ["Yes, about $2,500", 2500],
      ["Yes, about $4,000", 4000],
      ["Yes, about $6,000", 6000],
      ["Yes, about $8,000", 8000],
    ],
    set: (c, v) => {
      c.incs = (c.incs || []).filter(x => !x.partner);
      if (v > 0) {
        if (c.led) c.incs.push({ k: "Partner's income", amt: v, s: true, partner: true });
        else c.take += v - (c.x.partner || 0);
      } else if (!c.led) c.take -= c.x.partner || 0;
      c.x.partner = v;
    },
  },
  {
    id: "kids",
    when: c => c.deps === "Kids",
    q: "How many kids?",
    o: [
      ["1", 1],
      ["2", 2],
      ["3", 3],
      ["4", 4],
      ["5 or more", 5],
    ],
    set: (c, v) => {
      c.x.kids = v;
    },
  },
  {
    id: "care",
    when: c => c.deps === "Kids",
    q: "Childcare or tuition you pay now, each month?",
    h: "This is already inside your spending. The game needs to know it ends one day.",
    o: [
      ["None", 0],
      ["About $500", 500],
      ["About $1,000", 1000],
      ["About $2,000", 2000],
      ["About $3,000", 3000],
      ["About $4,500", 4500],
    ],
    set: (c, v) => {
      c.x.ends = (c.x.ends || []).filter(e => e.k !== "Childcare or tuition");
      if (v > 0)
        c.x.ends.push({
          k: "Childcare or tuition",
          amt: Math.min(v, Math.round(c.spend * 0.6)),
          yrs: c.x.careYrs || 5,
        });
    },
  },
  {
    id: "careyrs",
    when: c => (c.x.ends || []).some(e => e.k === "Childcare or tuition"),
    q: "For about how many more years?",
    o: [
      ["2", 2],
      ["5", 5],
      ["10", 10],
      ["15", 15],
    ],
    set: (c, v) => {
      c.x.careYrs = v;
      (c.x.ends || []).forEach(e => {
        if (e.k === "Childcare or tuition") e.yrs = v;
      });
    },
  },
  {
    id: "homeval",
    when: c => c.home === "Owning",
    q: "About what is your home worth?",
    o: [
      ["$150,000", 150000],
      ["$250,000", 250000],
      ["$400,000", 400000],
      ["$600,000", 600000],
      ["$900,000", 900000],
      ["$1.5 million", 1500000],
    ],
    set: (c, v) => {
      c.x.home = Object.assign({ val: 0, bal: 0, pmt: 0, yrs: 0 }, c.x.home, { val: v });
    },
  },
  {
    id: "homebal",
    when: c => c.home === "Owning" && c.x.home && c.x.home.val > 0,
    q: "About how much is left on the mortgage?",
    o: [
      ["Nothing, it's paid off", 0],
      ["$100,000", 100000],
      ["$200,000", 200000],
      ["$300,000", 300000],
      ["$500,000", 500000],
      ["$800,000", 800000],
    ],
    set: (c, v) => {
      c.x.home.bal = v;
      if (!v) {
        c.x.home.pmt = 0;
        c.x.home.yrs = 0;
      }
    },
  },
  {
    id: "homepmt",
    when: c => c.home === "Owning" && c.x.home && c.x.home.bal > 0,
    q: "The mortgage payment each month?",
    h: "Just the loan part if you know it. It's already in your spending.",
    o: [
      ["About $1,000", 1000],
      ["About $1,500", 1500],
      ["About $2,000", 2000],
      ["About $3,000", 3000],
      ["About $4,000", 4000],
    ],
    set: (c, v) => {
      c.x.home.pmt = Math.min(v, Math.round(c.spend * 0.7));
    },
  },
  {
    id: "homeyrs",
    when: c => c.home === "Owning" && c.x.home && c.x.home.bal > 0 && c.x.home.pmt > 0,
    q: "How many years until it's paid off?",
    o: [
      ["5", 5],
      ["10", 10],
      ["15", 15],
      ["20", 20],
      ["25", 25],
      ["30", 30],
    ],
    set: (c, v) => {
      c.x.home.yrs = v;
    },
  },
  {
    id: "fixed",
    when: c => c.take - c.spend <= 0 || c.deps === "Supporting a parent" || /Family/.test(c.share || ""),
    q: "Money you send or give every month that isn't up for debate?",
    h: "Family support, giving, a parent's care. The game won't ask you to cut it.",
    o: [
      ["None", 0],
      ["About $100", 100],
      ["About $300", 300],
      ["About $500", 500],
      ["About $1,000", 1000],
      ["About $2,000", 2000],
    ],
    set: (c, v) => {
      c.x.fixed = Math.min(v, c.spend);
    },
  },
  {
    id: "pension",
    when: c => c.age >= 30 && isEmployee(c),
    q: "Will you get a pension from work one day?",
    h: "A monthly check for life, on top of anything you save yourself.",
    o: [
      ["No", 0],
      ["Yes, about $1,000 a month", 1000],
      ["Yes, about $2,000", 2000],
      ["Yes, about $3,000", 3000],
      ["Yes, about $4,000", 4000],
      ["Not sure", 0],
    ],
    set: (c, v) => {
      c.x.pen = v > 0 ? { amt: v, age: (c.x.pen && c.x.pen.age) || 65 } : null;
    },
  },
  {
    id: "col",
    when: c => true,
    q: "Where you live, things cost:",
    o: [
      ["Less than most places", "low"],
      ["About average", "mid"],
      ["More than most. A big, expensive city", "high"],
    ],
    set: (c, v) => {
      c.x.col = v;
    },
  },
  {
    id: "ss",
    when: c => c.work !== "Retired" && c.age < 67,
    q: "Count Social Security in your plan?",
    h: "The game estimates it from what you earn. Many early-retirement planners leave it out to be safe.",
    o: [
      ["Yes, at three quarters, to be careful", 0.75],
      ["Yes, in full", 1],
      ["No, leave it out", 0],
    ],
    set: (c, v) => {
      c.x.ss = v;
    },
  },
];
function setTaxPct(c, v) {
  const X = c.x,
    rows = (c.incs || []).filter(
      r => /business|gigs/i.test(r.k) || (c.work === "Self-employed" && !r.partner && r.k !== "Retirement income")
    );
  rows.forEach(r => {
    if (r.gross == null) r.gross = r.amt;
    r.amt = Math.round(r.gross * (1 - v / 100));
  });
  if (!c.led || !rows.length) {
    if (X.grossTake == null) X.grossTake = c.take;
    c.take = Math.round(X.grossTake * (1 - v / 100));
  }
  X.taxPct = v;
  if (c.led) syncAll(c);
}
function setTaxHeld(c, v) {
  c.cashes = (c.cashes || []).filter(r => {
    if (r.hold) {
      const big = c.cashes.filter(x => !x.hold).sort((a, b) => b.amt - a.amt)[0];
      if (big) big.amt += r.amt;
      return false;
    }
    return true;
  });
  if (v > 0) {
    const big = c.cashes.slice().sort((a, b) => b.amt - a.amt)[0],
      take = big ? Math.min(v, big.amt) : 0;
    if (big && take > 0) {
      big.amt -= take;
      c.cashes.push({ k: "Tax money set aside", amt: take, s: true, hold: true });
    }
  }
  if (c.led) syncAll(c);
}
function lifeQs(c) {
  const X = (c.x = c.x || {});
  X.done = X.done || {};
  X.skip = X.skip || {};
  return LIFE.filter(q => q.when(c) && !X.done[q.id] && !X.skip[q.id]);
}
function lifeAnswered(c) {
  const X = c.x || {};
  return LIFE.filter(q => X.done && X.done[q.id] != null && q.when(c));
}
function lifeSet(c, id, i) {
  const q = LIFE.find(x => x.id === id);
  if (!q) return;
  c.x = c.x || {};
  c.x.done = c.x.done || {};
  q.set(c, q.o[i][1]);
  c.x.done[id] = q.o[i][0];
  if (c.led) syncAll(c);
}
function leverLine(c) {
  const X = c.x || {},
    f = { low: 0.8, mid: 1, high: 1.5 }[X.col || "mid"];
  return Math.round((2600 + 1000 * (X.kids || 0)) * f);
}
function netWorthHome(c, d) {
  const h = (c.x || {}).home;
  return h && h.val > 0 ? { eq: h.val - (h.bal || 0), nw: d.nw + h.val - (h.bal || 0) } : null;
}
function lifeConditions(c, d, add, today) {
  const X = c.x || {};
  if (X.limit > 0)
    add(
      "warn",
      "Savings limit",
      "Your benefits can stop if your countable savings pass " +
        m$(X.limit) +
        ". Keep regular accounts under it. An ABLE account can hold more without counting, if your disability began before 46. A benefits counselor can check your case for free."
    );
  if (X.forgive === "yes")
    add(
      "info",
      "Forgiveness track",
      "Your student loans may be forgiven. Extra payments on them can be wasted money. Check your plan with your loan servicer before paying more than you must."
    );
  if (X.forgive === "?")
    add(
      "info",
      "Check for loan forgiveness",
      "Some student loans are forgiven after years of public service or income-based payments. Find out before you pay extra."
    );
  const o = debtOutlook(c, d);
  if (o && o.grow)
    add(
      "warn",
      "Debt is growing",
      "About " +
        m$(o.perMo) +
        " more goes out than comes in each month, so this debt grows. Interest alone adds about " +
        m$(o.int) +
        " a month. A nonprofit credit counselor can look at it with you for free or close to it.",
      { l: "Try a move", a: "moves" }
    );
  else if (o && o.slow)
    add(
      "warn",
      "Debt on the slow road",
      "At today's pace your high-interest debt takes about " +
        fmtDur(o.mo) +
        ". About " +
        m$(o.five) +
        " more a month clears it in five years. A nonprofit credit counselor can help if that's out of reach.",
      { l: "Try a move", a: "moves" }
    );
  if (d.dryShort)
    add(
      "warn",
      "Slow months aren't covered yet",
      "You get " +
        X.dry +
        " slow month" +
        (X.dry === 1 ? "" : "s") +
        " a year and need about " +
        m$(d.dryNeed) +
        " set aside to ride them out. You have " +
        m$(d.cash) +
        "."
    );
  const dd = drawdown(c, d);
  if (dd && dd.light === "red")
    add(
      "warn",
      "Savings are carrying a lot",
      "You're drawing about " +
        Math.round(dd.rate * 1000) / 10 +
        "% of your savings a year. At that pace they last about " +
        dd.years +
        " years.",
      { l: "Try a move", a: "moves" }
    );
  if (c.age >= 64 && c.age < 65)
    add(
      "info",
      "Medicare is coming",
      "Medicare starts at 65. Your sign-up window opens three months before your birthday month. Signing up late can cost you for life."
    );
  if (c.age >= 73 && txSplit(c).pre > 0)
    add(
      "info",
      "Required withdrawals",
      "From 73, the law makes you take money out of taxed-later accounts every year. Missing it means a penalty. Check this year's amount with whoever holds the account."
    );
  if (c.work !== "Retired" && d.era < 8) {
    const s = goalSim(c),
      f = s.eraAt[8];
    if (f != null && c.age + f / 12 > c.ret + 1)
      add(
        "info",
        "Retirement age check",
        "You picked " +
          c.ret +
          ". At today's pace, work becomes optional around " +
          Math.round(c.age + f / 12) +
          ". A move can pull that back.",
        { l: "Try a move", a: "moves" }
      );
  }
}

/* the same life, shaped four ways */
function shapes(c) {
  const d = derive(c),
    base = goalSim(c),
    age = m => (m == null ? null : Math.round(c.age + m / 12)),
    f0 = d.era >= 8 ? 0 : base.eraAt[8],
    out = [];
  out.push({
    id: "steady",
    n: "Steady",
    d: "Keep today's pace the whole way.",
    age: age(f0),
    cost: "Nothing changes, and it's the long road.",
  });
  const M2 = c.take - Math.min(c.spend, Math.max(c.take * 0.5, c.spend * 0.3)),
    hr = hiRate(c) / 1200;
  let inv = c.inv,
    hi = hiDebt(c),
    m = 0,
    ok = false;
  if (M2 > 0)
    for (m = 0; m <= 300; m++) {
      const left = Math.max(0, d.toRet - m / 12);
      if (hi <= 0 && inv >= d.fiRet / Math.pow(1 + R, left)) {
        ok = true;
        break;
      }
      let s = M2;
      if (hi > 0) {
        hi *= 1 + hr;
        const u = Math.min(hi, s);
        hi -= u;
        s -= u;
      }
      inv = inv * (1 + R / 12) + s;
    }
  out.push({
    id: "sprint",
    n: "Sprint, then ease off",
    d: "Live on half for a stretch. After that your savings grow on their own, and work only has to cover the bills.",
    yrs: ok ? m / 12 : null,
    cost: "A few lean years now, for decades of easier ones.",
  });
  const hop = goalSim(addIncome(c, 0, -1 / 6));
  out.push({
    id: "seasons",
    n: "Seasons",
    d: "Work three years, take six months off, repeat.",
    age: age(d.era >= 8 ? 0 : hop.eraAt[8]),
    cost: "A later finish, with the time off spread through your life.",
  });
  const pt = moveResult(
    c,
    MOVES.find(x => x.id === "parttime"),
    base
  );
  out.push({
    id: "flex",
    n: "Flexible work",
    d: "The goal isn't to stop. It's to choose what you do, when and where. $1,500 a month from work you'd pick anyway.",
    age: age(pt.f1),
    cost: "You keep working, on your terms.",
  });
  return out;
}

if (typeof module !== "undefined")
  module.exports = {
    shapes,
    ownTake,
    ssEst,
    passives,
    endsOf,
    fiNeed,
    hiRate,
    survival,
    debtOutlook,
    goalNeed,
    monthsUntil,
    MOVES,
    moveResult,
    movesFor,
    MENTORS,
    drawdown,
    txOf,
    txSplit,
    bridge,
    LIFE,
    lifeQs,
    lifeSet,
    lifeAnswered,
    leverLine,
    netWorthHome,
    setTaxPct,
    setTaxHeld,
    LASTCHECK,
    GOAL_K,
    BLOCKS,
    goalTypical,
    goalAmts,
    goalSim,
    fmtDur,
    goalFit,
    goalBlock,
    timeShift,
    shiftLine,
    flexLeft,
    safeSpend,
    debtRate,
    hoursOf,
    timeLedger,
    TP_Q,
    tpAsk,
    tpPrice,
    tpAll,
    BUYBACK,
    constraint,
    newbie,
    bigThree,
    keepRate,
    futureCost,
    RIVALS,
    rivalState,
    roleModel,
    SEASONS,
    seasonItems,
    invDue,
    HZ,
    EFF_HZ,
    EVERY,
    nextDue,
    routineDue,
    routineLabel,
    applyFlow,
    monthSpent,
    flowRow,
    PROT_HELP,
    METHODS,
    NODE_CATCH,
    eraProg,
    better,
    freeToSpend,
    migrate,
    depthLevel,
    spendParts,
    candidates,
    areaLevel,
    refreshDup,
    applyTypical,
    syncDebt,
    syncAll,
    isSharp,
    sharpList,
    sharpPct,
    sharpNext,
    applyMove,
    monthMoves,
    termsIn,
    DEBT_KINDS,
    R,
    SWR,
    ROTH,
    ERAS,
    NODES,
    MUSCLES,
    REGIONS,
    TREES,
    derive,
    newChar,
    conditions,
    bestMove,
    unfinished,
    eraSteps,
    chapterOf,
    identityNow,
    regionScore,
    paySuggest,
    payScore,
    payImpact,
    wrapped,
    sampleChars,
    futureValueMonthly,
    yearsTo,
    grow,
    nodeRankRaw,
    treeGate,
    todayISO,
    addDays,
    daysBetween,
    nextPayAfter,
    snapshot,
  };
