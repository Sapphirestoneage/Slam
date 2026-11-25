/* ============================================================================
   SLAM the Game: data/roles.js
   PURPOSE     Data only. The six unpaid jobs of the Job of Existing (run JOE-1): the name, the line of the
               "i", the regions and trees of each job, and the recurring tasks of each job (the minutes
               each time, the times a year, the screen of Do it, the skill of Automate it, the tools of
               Hand it off, and the seasonal items that are the same task). No logic.
   INPUT       Nothing.
   OUTPUT      Constants that the other files read: JOB_ROLES, JOB_TASKS, JOB_SEASON_ROLE, JOB_TOOLS.
   DEPENDS ON  Nothing. core/jobs.js has the ids (JOB_IDS) and the math.
   RULES       The minutes of a task are SLAM's own guess for a typical person, not from a source. The
               screens show them as a guess ("saves you ~X min/month", with Show the math).
   ========================================================================= */
/* The six jobs. trees: the skill trees of the job, the first one with a next skill is the next step. */
const JOB_ROLES = {
  cfo: {
    n: "CFO",
    one: "Keeps the big picture: the plan for each paycheck, the bills, and where the money goes next.",
    regions: ["cash", "safety"],
    trees: ["financial-ops-tooling", "cash-safety-net", "money-psychology"],
  },
  accountant: {
    n: "Accountant",
    one: "Tracks what came in and went out, keeps the papers, and gets the taxes done.",
    regions: ["taxes", "cash"],
    trees: ["tax-strategy", "financial-ops-tooling"],
  },
  planner: {
    n: "Financial Planner",
    one: "Sets the goals, picks the accounts, and keeps the investing on track.",
    regions: ["invest"],
    trees: ["main-path", "portfolio-design", "withdrawal-decumulation"],
  },
  insurance: {
    n: "Insurance Coordinator",
    one: "Keeps the right cover in place: picks policies, pays them, and checks them at each renewal.",
    regions: ["safety"],
    trees: ["insurance-protection", "storms-windfalls"],
  },
  health: {
    n: "Health Care Admin",
    one: "Handles the health side of money: claims and bills, the HSA or FSA, and open enrollment.",
    regions: ["life"],
    trees: ["health-longevity"],
  },
  deals: {
    n: "Deals Manager",
    one: "Pays less for the same life: bills, subscriptions, and card and bank bonuses.",
    regions: ["deals"],
    trees: ["deals-smart-buying", "credit-cards"],
  },
};
/* The recurring tasks. per: minutes each time. times: times a year. a: the action of Do it (with v). skill: the
   automation skill (Automate it opens it, and a done skill counts the task as automated). auto: what Automate it
   means when the task has no skill. season: the items of SEASONS (core/engine.js) that are this task. */
const JOB_TASKS = [
  {
    id: "cfo_month",
    role: "cfo",
    n: "Monthly money check-in",
    per: 20,
    times: 12,
    a: "month",
    skill: "the-long-game:7",
  },
  {
    id: "cfo_pay",
    role: "cfo",
    n: "Plan each paycheck",
    per: 10,
    times: 26,
    a: "payday",
    skill: "financial-ops-tooling:6",
  },
  {
    id: "cfo_bills",
    role: "cfo",
    n: "Pay the bills on time",
    per: 30,
    times: 12,
    a: "rnew",
    skill: "debt-leverage:1",
  },
  {
    id: "cfo_review",
    role: "cfo",
    n: "The yearly money review",
    per: 120,
    times: 1,
    a: "review",
    auto: "SLAM puts it on your plan once a year.",
    season: ["ye:give"],
  },
  {
    id: "acc_track",
    role: "accountant",
    n: "Track where the money went",
    per: 5,
    times: 52,
    a: "daily",
    skill: "financial-ops-tooling:14",
  },
  {
    id: "acc_tax",
    role: "accountant",
    n: "Gather tax forms and file",
    per: 240,
    times: 1,
    a: "taxv",
    auto: "Set your forms to arrive online, in one folder.",
    season: ["tax:forms", "tax:file", "tax:refund"],
  },
  {
    id: "acc_statements",
    role: "accountant",
    n: "Check bank and card statements",
    per: 15,
    times: 12,
    a: "ledger",
    skill: "financial-ops-tooling:14",
  },
  {
    id: "pl_save",
    role: "planner",
    n: "Move money to savings and goals",
    per: 5,
    times: 12,
    a: "rnew",
    skill: "cash-safety-net:20",
  },
  {
    id: "pl_invest",
    role: "planner",
    n: "Put money into investments",
    per: 10,
    times: 12,
    a: "mix",
    skill: "main-path:3",
  },
  {
    id: "pl_check",
    role: "planner",
    n: "Check your investments",
    per: 15,
    times: 12,
    a: "invupd",
    skill: "the-long-game:7",
    season: ["ye:retire"],
  },
  {
    id: "in_renew",
    role: "insurance",
    n: "Renew policies and compare prices",
    per: 120,
    times: 1,
    a: "cover",
    auto: "Set each policy to renew by itself, and SLAM reminds you to compare.",
  },
  {
    id: "in_premium",
    role: "insurance",
    n: "Pay the premiums",
    per: 5,
    times: 12,
    skill: "financial-ops-tooling:6",
  },
  {
    id: "in_papers",
    role: "insurance",
    n: "Keep policy papers in one place",
    per: 30,
    times: 1,
    auto: "Save each policy online, in one folder.",
  },
  {
    id: "hl_bills",
    role: "health",
    n: "Check medical bills before you pay",
    per: 20,
    times: 4,
    auto: "Turn on online statements from your health plan.",
  },
  {
    id: "hl_receipts",
    role: "health",
    n: "Save health receipts",
    per: 10,
    times: 6,
    auto: "Snap each receipt into your HSA or FSA app.",
  },
  {
    id: "hl_fsa",
    role: "health",
    n: "Use up your health spending account",
    per: 30,
    times: 1,
    auto: "Set money for regular costs to go in each payday.",
    season: ["ye:fsa"],
  },
  {
    id: "hl_enroll",
    role: "health",
    n: "Pick your health plan at open enrollment",
    per: 90,
    times: 1,
    auto: "Keep last year's plan unless something changed. SLAM asks you what changed.",
  },
  {
    id: "dl_subs",
    role: "deals",
    n: "Review subscriptions",
    per: 20,
    times: 4,
    a: "swipe",
    auto: "Put each subscription on one card, so they are in one list.",
  },
  {
    id: "dl_bills",
    role: "deals",
    n: "Ask for lower bills",
    per: 45,
    times: 2,
    auto: "Set a yearly reminder to call before each bill renews.",
  },
  {
    id: "dl_cards",
    role: "deals",
    n: "Use the right card, and track bonuses",
    per: 15,
    times: 12,
    a: "vault",
    skill: "credit-cards:21",
  },
];
/* A seasonal item (SEASONS in core/engine.js) that is not in a task above is its own task, in this job. An item can
   also name its job as its fourth value: ["id", "name", "line", "health"]. */
const JOB_SEASON_ROLE = { tax: "accountant", ye: "cfo" };
/* The tools of Hand it off, by job. Kinds of tool, never one brand. */
const JOB_TOOLS = {
  cfo: ["A budgeting app", "A bookkeeper"],
  accountant: ["A tax preparer", "A tax app"],
  planner: ["A target date fund", "A robo-advisor"],
  insurance: ["An insurance broker"],
  health: ["Your health plan's app", "A medical bill advocate"],
  deals: ["A bill-lowering service", "A subscription tracker"],
};
