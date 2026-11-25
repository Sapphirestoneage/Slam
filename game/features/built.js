/* ============================================================================
   SLAM the Game: features/built.js
   PURPOSE     What's built. One list of all features of this game: built, partly built, or not built.
               Each built row has a probe, a small check that the code of the feature exists. A row with
               a failed probe shows as "Missing from this version". A row that is not built has no
               probe.
   INPUT       The open sheet (W.kind): built. The taps of the player (the actions in OUTPUT).
   OUTPUT      4 functions. Actions (ACT): built, btf, btcopy. Menu: "What's built".
   DEPENDS ON  core/report.js, core/engine.js, account/gate.js, screens/ui.js, screens/planner.js,
               features/drills.js, features/connect.js, features/house.js.
   RULES       The browser loads this file last, thus it can see all other files.
   ========================================================================= */
const WB_HAS = n => {
    try {
      return typeof ACT[n] === "function";
    } catch (e) {
      return false;
    }
  },
  WB_FN = n => {
    try {
      return /^[A-Za-z_$][\w$]*$/.test(n) && eval("typeof " + n) === "function";
    } catch (e) {
      return false;
    }
  };
const WB_GROUPS = [
  ["in", "Getting your numbers in"],
  ["see", "Seeing your money"],
  ["plan", "Planning ahead"],
  ["feel", "Game feel"],
  ["who", "People"],
  ["slam", "From the Slam web app"],
  ["biz", "Beyond the game"],
];
const WB = [
  [
    "feel",
    "Put SLAM on your home screen",
    "b",
    () => WB_HAS("hsopen") || typeof hsInstallSheet === "function",
    "On the website: one tap where the phone allows it, otherwise 2 or 3 picture-free steps for iPhone, Android or a laptop. Opens full screen and stays signed in.",
    null,
  ],
  [
    "feel",
    "Sign in with your fingerprint or face (passkeys)",
    "n",
    null,
    "Not built. Waiting for Supabase passkeys to leave beta, so nobody gets locked out while testing.",
    null,
  ],
  [
    "feel",
    "App lock: fingerprint or PIN each time the game opens",
    "n",
    null,
    "Not built. Opt-in setting for shared phones, since this is money data.",
    null,
  ],
  [
    "feel",
    "Coming soon: a part that is not ready never shows as a broken screen",
    "b",
    () => WB_FN("soonTap") && WB_FN("soonDraw") && WB_FN("soonRun") && WB_FN("soonHTML"),
    "A tap that has no action yet, or a screen that cannot draw, shows one calm card and a way back. The error is still recorded for Eli.",
    null,
  ],
  [
    "who",
    "Founding Testers: the first 50 accounts that finish setup",
    "b",
    () => WB_FN("finishSetupFounding") && WB_FN("homeFoundingCard") && WB_FN("meTabFounding") && WB_HAS("fdmail"),
    "A mark on Me, on People and on the character sheet, and one card, one time, that offers a free 20-minute walkthrough with Eli (an email draft). Only the account's own records decide who is in the first 50: until Eli runs the database file, no mark and no card show.",
    null,
  ],
  [
    "who",
    "Share SLAM: your own link",
    "b",
    () => WB_HAS("fdshare") && WB_FN("fdCode") && WB_FN("suRefKeep"),
    "Menu, then Share SLAM. One short code for each account, Copy my link, and the share sheet of the phone. No rewards yet. The link never carries a money number.",
    "fdshare",
  ],
  [
    "feel",
    "What's new: the patch notes",
    "b",
    () => WB_HAS("whatsnew") && typeof PATCH_NOTES !== "undefined" && PATCH_NOTES.length > 0,
    "Menu, then What's new. What changed, the newest first, in plain words. Each run adds one entry.",
    "whatsnew",
  ],
  ["in", "Setup by taps, no typing", "b", () => WB_HAS("start") && WB_FN("finishSetup"), "", null],
  [
    "in",
    "The front door: a landing screen, Start with no account, and the answer to Am I okay?",
    "b",
    () => WB_FN("doorGate") && WB_FN("doorHtml") && WB_FN("okCalc") && WB_HAS("okay") && WB_HAS("doorsave"),
    "A person from the QR code or a link sees one line, Start, What is this? and Sign in. Start needs no account and no typing. The taps end on a first answer, said as a Guess, and an offer to save it by making an account.",
    "okay",
  ],
  ["in", "Make a guess real: Guess, Close, Exact", "b", () => WB_HAS("sharp"), "", "sharp"],
  [
    "feel",
    "Back, Forward, Close and an i on every screen",
    "b",
    () => WB_HAS("navback") && WB_HAS("navfwd") && WB_HAS("navclose") && WB_FN("nvRow"),
    "Back goes back one screen and keeps what you entered. The i says what the screen is and what it is for.",
    null,
  ],
  [
    "in",
    "One small question at a time, each with why we ask and where to look",
    "p",
    () => WB_FN("askSheet") && WB_HAS("askyes") && WB_HAS("asknone") && WB_HAS("akskip"),
    "Done for pay, spending, cash, investments, what you owe, each debt's details, Key numbers, your job's match and your tax accounts, each with a screen or a line after that says what changed. Setup, goals, the money log and the gig screens still ask the older way.",
    null,
  ],
  [
    "in",
    "Fill in spending from a bank statement file",
    "b",
    () => WB_HAS("import2") && WB_FN("imRead"),
    "Read on your phone. The file is never sent anywhere.",
    "import2",
  ],
  ["in", "Subscription hunt from a statement", "b", () => WB_HAS("subs"), "", "subs"],
  ["in", "Log money in, out, debt payments and moves", "b", () => WB_HAS("flow") && WB_FN("applyFlow"), "", null],
  [
    "in",
    "Setup tap counter",
    "p",
    () => WB_FN("finishSetup"),
    "Setup counts your taps. It does not show the count as a score yet.",
    null,
  ],
  [
    "in",
    "Photo of a statement or pay stub",
    "n",
    null,
    "Not built. When it is, a photo goes to Claude only after a clear yes each time, and only the numbers are kept.",
    null,
  ],
  ["in", "A three-tap tour of the tabs", "b", () => WB_HAS("tour") && WB_FN("tourSheet"), "", "tour"],
  ["in", "60-second find-your-era demo", "n", null, "Not built.", null],
  [
    "see",
    "What you already know: D.A.I.T.E., with what is done and what is next",
    "b",
    () => WB_HAS("know") && WB_FN("kwAll") && WB_FN("kwStrip"),
    "",
    "know",
  ],
  [
    "see",
    "Key numbers: every ratio the money world uses",
    "b",
    () => WB_HAS("keynums") && WB_FN("knMetrics"),
    "",
    "keynums",
  ],
  ["see", "Debt plan: three orders side by side", "b", () => WB_HAS("debtplan") && WB_FN("dbPlan"), "", "debtplan"],
  ["see", "Money log by month", "b", () => WB_HAS("mlog") && WB_FN("lgSum"), "", "mlog"],
  ["see", "Charts", "b", () => WB_HAS("chart"), "", "chart"],
  ["see", "The next few months", "b", () => WB_HAS("months") && WB_FN("monthsAhead"), "", "months"],
  [
    "see",
    "Copy your numbers out, and the plan as a spreadsheet that comes back in",
    "b",
    () =>
      WB_HAS("kncopy") &&
      WB_HAS("lgcopy") &&
      WB_HAS("bookcopy") &&
      WB_HAS("bookxlsx") &&
      WB_FN("bookWorkbookData") &&
      WB_FN("fireBlankButton"),
    "Menu, Export. The plan downloads as an .xlsx file for Excel or Google Sheets, with live formulas and a FIRE sheet as its first tab (one row for each year). It also copies out, or saves as a CSV file. An edited file comes back in, and you see each change first. The .xlsx file needs a connection; the CSV does not. The file was not opened in Google Sheets itself by the builder.",
    "book",
  ],
  [
    "see",
    "Giant ledger, cash flow and investment statements",
    "b",
    () => WB_HAS("ledger") && WB_FN("ledgWorth") && WB_FN("ledgFlow") && WB_FN("ledgInvest") && WB_FN("ledgAll"),
    "One screen that only reads: what you own and owe, money in and out (the plan and each logged month), your investments, and every line. Each line opens.",
    "ledger",
  ],
  [
    "slam",
    "Card vault: your cards, the 5/24 count, and the offers that fit your budget",
    "b",
    () => WB_HAS("vault") && WB_FN("vaultSlots") && WB_FN("vaultFit") && typeof CARDS2026 !== "undefined",
    "From the Slam web app. Your cards with their dates, new cards in 24 months, and dated welcome offers checked against your credit and the spending your budget can put on a card. Offers wait while you have high-interest debt.",
    "vault",
  ],
  ["plan", "What if: try a move", "b", () => WB_HAS("moves") && WB_FN("movesFor"), "", "moves"],
  ["plan", "Two moves side by side", "b", () => WB_HAS("compare") && WB_FN("cpCol"), "", "compare"],
  ["plan", "Fee X-ray: a fee in dollars and years", "b", () => WB_FN("cpFee"), "", "compare"],
  ["plan", "Quick math: a car, a home, a dollar later", "b", () => WB_HAS("quick") && WB_FN("qmCar"), "", "quick"],
  [
    "plan",
    "Quick math: a HYSA switch, all at once or a little each month, cost per use, worth the hassle, what waiting costs, a warranty",
    "b",
    () => WB_HAS("quick") && WB_FN("qcHysa") && WB_FN("qcDca") && WB_FN("qcGameBody"),
    "One engine with the web app's quick calculators (js/math/quick.js). The rest of that shelf (debt consolidation, the W-4 check, unemployment, leaving a job, a first apartment, roommates, kids, a pet, personal inflation, worth it, the month at a glance) is on the web app's small pages.",
    "quick",
  ],
  ["plan", "Your real hourly wage", "b", () => WB_HAS("hrs") && WB_FN("timeLedger"), "", "hrs"],
  [
    "in",
    "Working for yourself: taxes set aside from untaxed money",
    "b",
    () => WB_HAS("gig") && WB_FN("gxState") && WB_FN("gxCatchSheet"),
    "",
    "gig",
  ],
  [
    "plan",
    "Your unit: any gap in sessions, shifts or gigs",
    "b",
    () => WB_FN("unitTxt") && WB_HAS("gxuse"),
    "Shows in fire drills, the pay-stopped ladder, Quick math and taxes so far. Goals and Safe to spend do not use it yet.",
    "gig",
  ],
  ["plan", "What one gig really pays, and your floor", "b", () => WB_FN("gxPays") && WB_FN("gxFloor"), "", "gig"],
  [
    "plan",
    "Your floor with weeks off, on one formula with the web app's price floor",
    "b",
    () => WB_FN("gigFloorFrom") && WB_FN("gigHoursOf") && WB_FN("gxFloor"),
    "One engine with the web app's page freelance.html (js/math/gig.js). The web app's floor also counts health cover, retirement and the tax engine's own tax.",
    "gig",
  ],
  [
    "in",
    "Invoices: who still owes you, what is past its date, a calm next step",
    "b",
    () => WB_FN("gigInvoicesOf") && WB_FN("gxInvBody") && WB_HAS("gxinvadd") && WB_HAS("gxinvundo"),
    "Working for yourself > More. Kept on the profile (c.x.invoices). The web app's page is invoices.html.",
    "gig",
  ],
  [
    "plan",
    "Profit First on your side income",
    "b",
    () => WB_FN("gigProfitFirstOf") && WB_FN("gxPfBody") && WB_HAS("gxpf"),
    "The book's sample or your own shares; the tax share can be your set-aside.",
    "gig",
  ],
  [
    "plan",
    "Solo 401(k), SEP or IRA, the tax in each payment, do my apps add up",
    "b",
    () => WB_FN("gigRetireOf") && WB_FN("gigAppsOf") && WB_FN("gigSoFarFrom"),
    "The math is in the game (core/gigcore.js). The screens are the web app's small pages (gigretire, setaside, gigapps .html): they need the tax engine, which the game does not have.",
    null,
  ],
  ["plan", "Safe to spend: always a trade-off, never a flat no", "b", () => WB_HAS("safe"), "", "safe"],
  ["plan", "Goals with dates", "b", () => WB_HAS("goal") && WB_FN("goalSim"), "", null],
  ["plan", "Next Steps: your week, planned", "b", () => WB_FN("planTab"), "", null],
  ["plan", "Year in review", "b", () => WB_HAS("review"), "", "review"],
  ["plan", "Life shapes: part-time, sabbatical and more", "b", () => WB_FN("shapes"), "Inside What if.", "moves"],
  [
    "plan",
    "Is my money going where I want: your values next to your spending",
    "b",
    () => WB_HAS("values") && WB_FN("vlResult"),
    "",
    "values",
  ],
  [
    "plan",
    "Start at the finish line: design the end, work backwards",
    "p",
    () => WB_HAS("goal"),
    "Goals and the bucket list cover part of it. The web app's finish-line walk is not ported.",
    null,
  ],
  [
    "plan",
    "Which lever matters most: six levers in dollars a year",
    "b",
    () => WB_HAS("lever") && WB_FN("lvLevers") && WB_FN("lvRank"),
    "Earn, spend, protect, grow, stretch, keep. No call is made on a guess.",
    "lever",
  ],
  [
    "who",
    "Add-ons only the owner can switch on, one person at a time, with no trace for anyone else",
    "b",
    () => WB_FN("adApply") && WB_FN("adOpen") && WB_HAS("aoset") && WB_HAS("adplain"),
    "Under Profiles, for the owner only. Includes Demo mode, a one-time yes where an add-on asks for one, and sharing that always uses the standard look.",
    "people",
    "own",
  ],
  [
    "feel",
    "One question open at a time, Back names where it goes, and onboarding as its own full screen with a four-step tracker",
    "b",
    () => WB_FN("tdTrack") && WB_FN("tdFrom") && WB_HAS("fldgo"),
    "On every screen with two or more questions. Setup, the three quick games, making numbers real and the first answer share one tracker.",
    null,
  ],
  [
    "feel",
    "Fork Theory: a fork check, your own exchange rate, a slim meter on Home, quick pulls, and a game that backs off when you are full",
    "b",
    () => WB_FN("fkLoad") && WB_FN("fkPullList") && WB_HAS("fork") && WB_HAS("fkpick") && WB_HAS("fkpull"),
    "On Home, in the daily check-in and in the menu. It replaces the old 1-to-5 day score.",
    "fork",
  ],
  [
    "see",
    "Conscious Spending Plan: your month in four buckets next to Ramit Sethi's guide, with no verdict on a guess",
    "b",
    () => WB_FN("cspCalc") && WB_HAS("csp") && WB_HAS("cspopen") && WB_HAS("cspinv"),
    "In My Money and in the menu.",
    "csp",
  ],
  [
    "see",
    "Money audit score: one score out of 10 built only from real numbers, with every move that would raise it, biggest first",
    "b",
    () => WB_FN("mauCalc") && WB_FN("audMoves") && WB_HAS("audit") && WB_HAS("audmore"),
    "In My Money and in the menu. The formula is SLAM's own.",
    "audit",
  ],
  [
    "see",
    "Famous money ideas: one list of the best-known ideas from well-known money teachers, each opening on your own numbers",
    "b",
    () => WB_FN("rfRows") && WB_HAS("roof"),
    "In My Money and in the menu. Only ideas that are really built get a row.",
    "roof",
  ],
  [
    "see",
    "Famous money ideas, the workshop: each idea is one screen on your numbers, with typical values in grey until you tap, and the math on every number",
    "b",
    () => WB_FN("igSheet") && WB_FN("igFits") && WB_HAS("idea") && WB_HAS("igset") && WB_HAS("rfreg"),
    "Grouped by region in the list, and one that fits shows on Next Steps.",
    "roof",
  ],
  [
    "see",
    "What depends on what: short chains that show how one number feeds the next, with a one-line replay when a part fills in",
    "b",
    () => WB_FN("depSheet") && WB_FN("depCheck") && WB_HAS("dep") && WB_HAS("depoff"),
    "In the menu. The replay has an off switch.",
    "dep",
  ],
  [
    "plan",
    "Real steps for Future You and for eras 6 to 9, each with a starred key moment that opens the era",
    "b",
    () => WB_FN("esSheet") && WB_FN("esHold") && WB_HAS("esdone") && WB_HAS("esna"),
    "The gates still come from the numbers. Yearly steps start fresh each January.",
    "node",
    "fy_rothfill",
  ],
  [
    "see",
    "Which account first: one line worked out from the retirement chain, with Guess, Close or Exact and a why",
    "b",
    () => WB_FN("acRec") && WB_HAS("acwhy"),
    "On Home while Free Money or Future You is next, on the payday split, and in the menu.",
    "acwhy",
  ],
  [
    "plan",
    "Two paths: the same money into investing or into a skill",
    "b",
    () => WB_FN("lvTwo") && WB_HAS("lvset"),
    "Inside Which lever.",
    "lever",
  ],
  [
    "feel",
    "Guess which one wins: five quick guesses at your own age",
    "b",
    () => WB_HAS("lvquiz") && WB_FN("lvRounds"),
    "Start earlier, more growth, or more money. Then the age flips.",
    "lvquiz",
  ],
  [
    "plan",
    "The multipliers board: the pegs a dollar can touch",
    "b",
    () => WB_HAS("mult") && WB_FN("muAll") && WB_FN("muBoard"),
    "Match, card rewards, bank bonuses, buying ahead, tax accounts. Borrowing shows and never counts.",
    "mult",
  ],
  [
    "plan",
    "Young pegs and old pegs: where deals stop and taxes take over",
    "b",
    () => WB_FN("muCross") && WB_FN("muTop"),
    "Inside the multipliers board, with the finish line taxed and tax-free.",
    "mult",
  ],
  ["plan", "Investments scored 1 to 5 on safety, access and taxes", "n", null, "Not built.", null],
  [
    "plan",
    "One-way door notes on moves that are hard to undo",
    "b",
    () => WB_FN("doorNote") && Object.keys(DOORS).length > 0,
    "Inside What if and Side by side.",
    "moves",
  ],
  [
    "plan",
    "Seasons of life (Die With Zero)",
    "b",
    () => WB_FN("pathsLife") && WB_FN("pathsSeasons"),
    "Inside Two paths: Best life places each bucket list item in a decade of your life.",
    "paths",
  ],
  [
    "feel",
    "Where am I: the Quest Log",
    "b",
    () => WB_HAS("quest") && WB_FN("questSheet") && WB_FN("questContinue") && WB_FN("topbarQuest"),
    "One button on every tab and sheet: Continue, one pinned focus, one nudge, Journey, Areas, Questions and Time, and the last places you went. Home shows one Continue card.",
    "quest",
  ],
  [
    "feel",
    "Report a bug or idea, from any screen",
    "p",
    () =>
      WB_HAS("flag") &&
      WB_FN("fbOpen") &&
      WB_FN("topbarReport") &&
      WB_FN("sheetReportRow") &&
      WB_FN("rpMake") &&
      WB_FN("homeReportFixed"),
    'One Report button on every tab, sheet, the welcome screen and the sign-in screen: tap Bug, Idea or Confusing, add a note or a picture if you want. The screen, your last 3 taps, the device and the app version go with it, and no money numbers. It replaces Flag this screen. Until the owner runs the database file of 2026-11-25, a report stays saved on this device and sends itself after; the admin inbox and the note "You reported this. It\'s fixed." start then.',
    null,
  ],
  [
    "plan",
    "Countdowns: a down payment, a quit fund, a wedding, or any goal",
    "b",
    () => WB_HAS("cdn") && WB_FN("cdnCalc") && WB_FN("cdnMonthsTo") && WB_FN("goalViewCountdown"),
    "Each goal on My Goals has a countdown: months to go at your monthly amount, or the monthly amount that makes a date. A down payment and a quit fund work out their own target.",
    "cdn",
  ],
  [
    "plan",
    "Two job offers side by side",
    "b",
    () => WB_HAS("offers") && WB_FN("offerCalc") && WB_FN("offerPrice"),
    "Take-home pay from the tax tables, the match, stock, health premiums and the commute: what a year and an hour of each offer are worth, and what makes the gap.",
    "offers",
  ],
  [
    "plan",
    "Career and education: a course or degree, a credential stack, the match that stays with the job, the launch window",
    "b",
    () => WB_HAS("career") && WB_FN("crRoi") && WB_FN("crgPath") && WB_FN("crVestLeft") && WB_FN("crgLaunch"),
    "One engine with the web page Does this course or degree pay back?: payback years, lifetime value and the freedom date change, with presets as samples; trade school and a 4-year degree side by side; credentials with overlaps; the match that stays with the job from your own schedule; a job hop, Roth or traditional now and a house hack in days.",
    "career",
  ],
  [
    "plan",
    "Which account next, up to each limit",
    "b",
    () => WB_HAS("nxa") && WB_FN("nxaCalc") && WB_FN("nxaRows"),
    "The steps and accounts in order, each with its 2026 limit, what goes in now and the room left, and where your next dollar goes.",
    "nxa",
  ],
  [
    "plan",
    "Retirement engine by Zack (MIT license), through one adapter",
    "b",
    () => typeof RetireEngine === "object" && WB_FN("retireScenario") && WB_FN("retireSummary"),
    "His Monte Carlo, solver, spending smile, Social Security, glide path, withdrawal methods and 2026 tax tables. Runs in a Web Worker on the website. Rebuild: node tools/retire_engine_build.mjs.",
    "odds",
  ],
  [
    "plan",
    "Two paths: Most money, Best life, and a blend",
    "b",
    () => WB_HAS("paths") && WB_HAS("pathspick") && WB_FN("pathsAll"),
    "Exact monthly dollars to each place in the Financial Order of Operations, the oxygen mask rule first. Pick this path sets Next Steps.",
    "paths",
  ],
  [
    "plan",
    "Retirement odds: random markets and real history",
    "b",
    () => WB_HAS("odds") && WB_FN("oddsCalc") && WB_FN("oddsRandom") && typeof MARKET_HISTORY === "object",
    "1,000 seeded random markets from the retirement engine, each real start year since 1871, the worst start year, and the one change from the engine's solver. Guardrails by default, seven other ways behind one row.",
    "odds",
  ],
  [
    "plan",
    "Insurance needs, with the gap in dollars",
    "b",
    () => WB_HAS("cover") && WB_FN("coverCalc"),
    "Disability, life, renters or home, auto, umbrella, long-term care. Health stays a question.",
    "cover",
  ],
  [
    "plan",
    "Investment mix and fees, your path next to the low-fee path",
    "b",
    () => WB_HAS("mix") && WB_FN("mixCalc") && WB_FN("knMetricsMix"),
    "The first piece of the fee and product X-ray. Stock share is a live key number.",
    "mix",
  ],
  [
    "plan",
    "Fee and product X-ray: every fund, every fee, every product",
    "p",
    () => WB_FN("mixCalc"),
    "Partly built. Fees and what is inside each account are in. Single funds, loads and insurance products are not.",
    "mix",
  ],
  [
    "plan",
    "Tax view: your bracket, your rates, pre-tax or Roth",
    "b",
    () => WB_HAS("taxv") && WB_FN("taxvCalc") && WB_FN("retireTax"),
    "Federal, payroll and state tax from the engine's 2026 tables. The state is one tap list. It feeds the key numbers.",
    "taxv",
  ],
  [
    "plan",
    "City income tax in the tax view",
    "n",
    null,
    "Not built. State tax is in. City tax (for example New York City) is not.",
    null,
  ],
  [
    "plan",
    "Simulators with a flip point: 12 money decisions",
    "b",
    () => WB_HAS("sims") && WB_FN("simFlip") && typeof SIM_ORDER !== "undefined" && SIM_ORDER.length === 12,
    "Rent or buy, the mortgage, debt, the car, pre-tax or Roth, a new job, a break, side income, a kid, a new city (with state tax), a big spend, the stop age and when to claim Social Security.",
    "sims",
  ],
  [
    "plan",
    "Rent or buy: the bank's payment, the true cost of owning, the breakeven year",
    "b",
    () =>
      WB_FN("hbRun") &&
      WB_FN("hbBreakeven") &&
      WB_FN("rentbuyExtra") &&
      typeof SIMS !== "undefined" &&
      !!SIMS.rentbuy &&
      typeof SIMS.rentbuy.extra === "function",
    "Property tax, insurance, PMI, HOA, maintenance and big repairs, next to rent. The price-to-rent ratio and the 5% rule. The same math as the web page.",
    "sims",
  ],
  [
    "plan",
    "My plan on one page: the 7 steps and the top 5 gaps",
    "b",
    () => WB_HAS("summary") && WB_FN("summaryGaps"),
    "Prints well. The estate checklist is in it.",
    "summary",
  ],
  [
    "plan",
    "The Ask front door on Home: four questions",
    "b",
    () => WB_HAS("front") && WB_FN("homeFrontRow"),
    "Safe to spend this, how much can I spend, what should I be doing, how does this change my goals.",
    null,
  ],
  [
    "see",
    "FI ratio on Key numbers",
    "b",
    () => WB_FN("knMetricsFir") && WB_FN("firCalc") && WB_FN("knOneFir"),
    "What your investments can pay each month, next to what you spend. In the group Freedom.",
    "keynums",
  ],
  [
    "feel",
    "You can stop sprinting: the day you reach your Coast number",
    "b",
    () => WB_HAS("coastok") && WB_HAS("coastbelowok") && WB_FN("homeCoastCard") && WB_FN("rcCoast"),
    "A calm card on Home, one time. It waits until your numbers are real. If the money dips under Coast later, one quiet Recalculating line with the new Coast date.",
    null,
  ],
  [
    "see",
    "While you slept: what your money earned",
    "b",
    () => WB_HAS("slept") && WB_FN("homeSleptRow"),
    "A slim line on Home past $1,000 invested.",
    "slept",
  ],
  [
    "see",
    "Savings rate by month, monthly quotas, next year's budget",
    "b",
    () => WB_HAS("quota") && WB_FN("quotaRates") && WB_FN("quotaBudget"),
    "In the Yearly Review and on the check-in.",
    "quota",
  ],
  [
    "plan",
    "A second engine checking the math inside the game",
    "n",
    null,
    "Not built in the game. The math is checked by a second engine outside it before each release.",
    null,
  ],
  ["feel", "Ten eras, from Digging Out to Legacy", "b", () => Array.isArray(ERAS) && ERAS.length === 10, "", null],
  [
    "feel",
    "Galaxy: the skills as a star map",
    "b",
    () => WB_HAS("galaxy") && WB_FN("starsLayout") && WB_FN("starsLanes") && WB_FN("drawSheetStars"),
    "25 constellations that spiral out from you to the FI ring, 625 stars on one canvas. Bright is done, the next one pulses, gateway stars have a ring, and a tap on a star gives a button that opens its screen. The list stays the default.",
    "galaxy",
  ],
  [
    "feel",
    "Skill trees",
    "p",
    () => !!window.SKILLS && Object.keys(window.SKILLS).length > 0,
    () => Object.keys(window.SKILLS || {}).length + " trees so far. About 50 were talked about.",
    null,
  ],
  [
    "feel",
    "How it all connects: links between tracks, and from skills to screens",
    "b",
    () => WB_HAS("connect") && WB_FN("cxGraph") && WB_FN("cxLink"),
    () => {
      const k = cxCoverage();
      return (
        CX_E.length + " links between the 25 tracks. " + k.n + " of " + k.tot + " skills open a screen that helps."
      );
    },
    "connect",
  ],
  ["feel", "Themes and voices", "b", () => WB_HAS("themes") && WB_HAS("look"), "", "themes"],
  [
    "feel",
    "Meet your character, and your character sheet",
    "b",
    () => WB_HAS("reveal") && WB_FN("rvData"),
    "",
    "reveal",
  ],
  [
    "feel",
    "The mission board: story mission, side missions, heists",
    "b",
    () => WB_FN("msBoard") && WB_FN("msHeists") && WB_HAS("msgo"),
    "On Next Steps. Each one shows why, how long, the payout and what it unlocks.",
    null,
  ],
  ["feel", "Mini games", "b", () => WB_HAS("games"), "", "games"],
  ["feel", "Money Chart quiz", "b", () => WB_HAS("mcstart"), "", null],
  [
    "feel",
    "Quizzes: one engine, nine skins (a money code, the FI Address, houses, an avatar, a character sheet, the pyramid, the FI Pathway, a playful money sign, the money sins)",
    "b",
    () =>
      WB_HAS("qz") &&
      WB_FN("qzResult") &&
      WB_FN("qzCardPart") &&
      typeof QZ_SKINS !== "undefined" &&
      QZ_SKINS.length >= 9,
    "Each ends on one card with its light side and one next step. A result is private until you show it, and never changes your element without a tap.",
    "qz",
  ],
  [
    "feel",
    "The money sins read: your main pull and your main way of dodging change, from four sources",
    "b",
    () =>
      WB_HAS("sins") &&
      WB_HAS("sncheck") &&
      WB_FN("snRead") &&
      WB_FN("sngData") &&
      typeof QZ_SKINS !== "undefined" &&
      QZ_SKINS.some(s => s.id === "sins" && !s.soon),
    "The quiz, your logged spending, one-tap check-ins on a buy over your line (at most 3 a week) and how you use the game. A top two in each family with the light side, Why we think this, Is this really it?, and one defense to test for a month. A label shows only when two sources agree over about 30 days. Private unless you show it. Late night buys, the Safe to spend card and fire drills put off are not read yet: the game does not keep them.",
    "sins",
  ],
  [
    "feel",
    "Your money read: the result card, the share card, the two of you and the retake",
    "b",
    () =>
      WB_FN("snCard") &&
      WB_FN("snFrame") &&
      WB_FN("snCouple") &&
      WB_FN("sngCardPart") &&
      WB_HAS("snshare") &&
      WB_HAS("sndate") &&
      snArchetypes(qzSkin("sins")).length === 84,
    "A name for your read (84 of them, from your main pull and your way of dodging change), the light side and the virtue of each, and one Recalculating move for the month. A share card with no numbers, made only when you tap. Home, the month check and the crash drill add one line for your type once the read has a label. Two people in a household who both turn on sharing see how their reads collide and get a money date to tap through. A gentle retake each quarter, and the sin weakening over the retakes on the character sheet. The graduation story is not built yet.",
    "sins",
  ],
  [
    "feel",
    "The Rings theme: seven rings, a ruler for each money sin, and you escaping",
    "b",
    () =>
      typeof THEMES !== "undefined" &&
      !!THEMES.rings &&
      WB_FN("snRings") &&
      WB_FN("snBoss") &&
      WB_FN("rgBossPart") &&
      WB_HAS("rgleave") &&
      snRulers(qzSkin("sins")).length === 7,
    "A theme to pick under Theme (off until you pick it): a dark, warm look and a cheeky voice. Each money sin is a ring with its own ruler; the ruler of your main pull is your boss in the boss fights. Check-ins read as the fine print, defenses as wards, Recalculating as the escape route, always with the plain word next to it. A month of a ward that works, or a retake that shows your pull getting quieter, climbs you up a ring. It roasts the sin, never you.",
    "sins",
  ],
  [
    "feel",
    "A rival to race",
    "p",
    () => WB_HAS("rival"),
    "A rival exists. Difficulty levels, and the Nepo baby, are not built.",
    null,
  ],
  [
    "feel",
    "People who did it",
    "p",
    () => Array.isArray(MENTORS) && MENTORS.length > 0,
    "Real people and the moves they are known for. What each one would say about your plan is not built.",
    null,
  ],
  [
    "feel",
    "Motion that shows what changed",
    "p",
    () => WB_FN("celebrate"),
    "Numbers flash when they change and wins get a card. A full before-and-after replay is not built.",
    null,
  ],
  [
    "feel",
    "Graduating: a win state and your story",
    "n",
    null,
    "Not built. The character sheet is the first piece of it.",
    null,
  ],
  ["feel", "Quantum Collapse quiz and a deeper type test", "n", null, "Not built.", null],
  [
    "feel",
    "Your strengths and weak spots, as plain numbers",
    "b",
    () => WB_FN("elStats"),
    "Months of cushion, dollars left each month, months of pay owed, years of spending invested, protections in place. A guess says it is a guess.",
    "elem",
  ],
  ["feel", "Proof on steps", "n", null, "Not built. A step is done when you say it is.", null],
  ["feel", "Theme blends", "n", null, "Not built. One theme at a time.", null],
  ["feel", "Book curator", "n", null, "Not built.", null],
  [
    "feel",
    "A welcome-back card: what you did last time and what moved since",
    "b",
    () => WB_HAS("since") && WB_FN("bkData") && WB_FN("bkRow"),
    "One slim row on Home on the first look of a new day. It never counts days away.",
    "since",
  ],
  [
    "feel",
    "Every answer shows what it unlocked",
    "p",
    () => WB_FN("cxNews"),
    "Finishing a skill names the tracks it opens. Answers about your numbers do not show their ripple yet.",
    null,
  ],
  [
    "plan",
    "Product X-ray: the path you are on next to the alternative",
    "b",
    () => WB_HAS("xray") && WB_FN("xrCalc"),
    "Insurance that also saves next to term cover and investing the rest, or an investment with fees next to a low-cost index fund. In dollars and in days of your spending.",
    "xray",
  ],
  [
    "plan",
    "Break in case of emergency: a layoff as a number",
    "b",
    () => WB_HAS("transit") && WB_FN("trCalc"),
    "On My Goals. The dip, tripwires decided now, family help counted at its risk, quick income by time to the first dollar, four slots with one card each, and your advantages.",
    "transit",
  ],
  [
    "who",
    "Kids mode: short daily money lessons for a kid",
    "b",
    () => WB_HAS("kids") && WB_FN("kidRunNext"),
    "A separate kid profile with 20 short lessons, one a day. It holds no money numbers. Under People and in the menu.",
    "kids",
  ],
  [
    "plan",
    "Moves to try: the Strategy Engine, with a library of 13 moves",
    "b",
    () => WB_HAS("strat") && WB_FN("stgRank"),
    "On Next Steps (the top 3) and in the menu (the library). Each move: a fit check, the rough impact on your FI date, an area or a real listing, a dial, a break-even line and a verdict.",
    "stratlib",
  ],
  [
    "feel",
    "Your money type as an element, with what it is strong against and weak to",
    "b",
    () => WB_HAS("elem") && WB_FN("elOf"),
    "Earth, Water, Fire, Air or Spirit: from the Money Chart, your own pick, or a guess from setup.",
    "elem",
  ],
  ["who", "Many people in one game, and a coach view", "b", () => WB_HAS("people") && WB_HAS("coach"), "", "people"],
  [
    "who",
    "Live Session Mode: a coaching call that fills in your profile while you talk",
    "p",
    () => typeof liveOn === "function" && typeof liveTokenClean === "function" && typeof ledRowHeard === "function",
    "Partly built, and switched off until it is whole. Built so far: the invite link that is the sign-up, the session room (both tap OK, one Start, Pause and End, text only, no audio saved), the rules that turn the words of the call into numbers (a heard number lands as a Guess, a number you entered is never changed, Confirming plus your yes makes it Close, a what-if is kept apart), the join to your saved game, the two screens of the call (the coach's profile and next question; your calm four numbers) and the coach's review after the call, with Show plan, the AI pass after the call, with its own switch (the proposals come into the same review; nothing changes until the coach approves), and Delete this transcript for the coach and the client. Not yet: a real call on two devices, the database file run, and the AI pass set up (docs/AI-PASS-SETUP.md).",
    null,
  ],
  ["who", "Saved to your account, on every device", "b", () => WB_FN("clPush") && WB_FN("clPull"), "", null],
  ["who", "Hand someone their game with a code", "b", () => WB_HAS("handoff") && WB_FN("hoRead"), "", "handoff"],
  ["who", "Test with a friend", "b", () => WB_HAS("testkit"), "", "testkit"],
  [
    "who",
    "Money together as a household",
    "p",
    () => WB_HAS("pmode"),
    "A household can look at money together on Home. One plan that two people both edit from their own phones is not built.",
    null,
  ],
  [
    "who",
    "Sharing costs fairly: five ways to split, any number of people",
    "b",
    () => WB_HAS("fair") && WB_FN("frCalc"),
    "Equal, by income, labor counts, same left over, by use.",
    "fair",
  ],
  [
    "who",
    "Our household: any number of people, added up, with what happens if one income stops",
    "b",
    () => WB_HAS("house") && WB_FN("hsSum") && WB_FN("hsStop"),
    "Includes a made-up household of three to look around with.",
    "house",
  ],
  [
    "who",
    "What only marriage gives you: the paperwork checklist",
    "b",
    () => WB_HAS("hsdoc") && HS_DOCS.length >= 10,
    "Eleven items by tap. Questions for a lawyer, not legal advice.",
    "house",
  ],
  [
    "who",
    "A money agreement between partners, with five safeguards",
    "b",
    () => WB_HAS("hssafe") && WB_HAS("hsend") && HS_SAFE.length === 5,
    "It only counts as agreed when all five are true. The game records it and never enforces it.",
    "house",
  ],
  [
    "who",
    "The money quiz with your person",
    "b",
    () => WB_FN("mcPair") && WB_HAS("mcpass"),
    "Pass the phone: you guess their answers, they answer, and both charts show together.",
    "chart",
  ],
  [
    "who",
    "The Money Chart for more than two people",
    "b",
    () => WB_HAS("together") && WB_FN("tgPeople") && WB_FN("mcGroup"),
    "Up to four more people answer on this phone, and other players in this game can be tapped in. Nobody is ranked.",
    "together",
  ],
  [
    "who",
    "Your people, one layer at a time",
    "b",
    () => WB_FN("ppBody") && WB_HAS("pprm") && WB_HAS("l1back"),
    "Round one picks who, with Remove on every person. Round two asks one thing per screen. Back one on every step.",
    "party",
  ],
  ["who", "Guilds", "n", null, "Not built.", null],
  [
    "slam",
    "Rules of thumb as calculators",
    "b",
    () => WB_FN("qmCar") && WB_FN("qmHome"),
    "Eight were built for the web app. The what-ifs are in Quick math. The rest are Key numbers.",
    "quick",
  ],
  ["slam", "The 20 levels", "n", null, "Not ported. The game uses eras instead.", null],
  ["slam", "Read my papers: a tax return, a W-2, a pay stub", "n", null, "Not ported. It lives in the web app.", null],
  [
    "slam",
    "Before you sign: what a new loan really costs",
    "b",
    () => WB_HAS("sign") && WB_FN("sgCost"),
    "Four questions, then the payment, the interest as months of your life, the freedom date, and paying cash instead.",
    "sign",
  ],
  [
    "slam",
    "What each debt costs you, in interest and in months of your life",
    "b",
    () => WB_HAS("owed") && WB_FN("owRows"),
    "Costly debt also shows how many months sooner work becomes optional without it. Low-cost debt does not move the game's freedom date, and the screen says so.",
    "owed",
  ],
  [
    "slam",
    "What a habit or a trip really costs",
    "b",
    () => WB_FN("qmDollar") && WB_FN("tpgLines") && WB_FN("tpCost"),
    "A dollar later in Quick math covers a monthly habit. A trip is on Trips and the journey: line by line, points or cash, and a group split, on the one engine with the web page.",
    "trips",
  ],
  ["slam", "Benefits cliff map", "n", null, "Not ported. New York and federal only in the web app.", null],
  [
    "slam",
    "The FIRE journey map and the retreat scenario",
    "b",
    () =>
      WB_HAS("trips") &&
      WB_FN("tpgJourney") &&
      WB_FN("tpJourney") &&
      Array.isArray(TP_STAGES) &&
      TP_STAGES.length === 6,
    "Trips and the journey, tab Journey: digging out, the first $1k, debt free, $100k, Coast, FI; where you are; how the trip moves you, with the stage dates and the freedom date from the game's own run.",
    "trips",
  ],
  [
    "slam",
    "One page for a planner",
    "b",
    () => WB_HAS("onepage") && WB_FN("onePage"),
    "The month, the balance, key numbers with how sure each is, what is still a guess, the household.",
    "onepage",
  ],
  ["slam", "Money fire drills", "b", () => WB_HAS("drills") && WB_FN("fdList"), "", "drills"],
  [
    "slam",
    "If the pay stopped: what to use first",
    "p",
    () => WB_HAS("ladder") && WB_FN("ldOf"),
    "Your own money in order, and the rungs that cost extra. Unemployment pay, family help and tripwires are not in it yet.",
    "ladder",
  ],
  [
    "slam",
    "Student loan plans compared",
    "b",
    () => WB_HAS("study") && WB_FN("slPlans") && WB_FN("slPslf") && WB_FN("slRefi"),
    "Standard, IBR, RAP and the public service versions, on rules checked Nov 6, 2026. Tax on a forgiven balance is named, not priced. Since Nov 25, 2026: your household size, a PSLF card (payments counted, to go, years left, forgiven) and a private refinance rate you tap, with what it gives up. The stepladder of school-year loans is on the web page only.",
    "study",
  ],
  ["biz", "Career and city atlases", "n", null, "Not built. Waiting on public data files.", null],
  ["biz", "A way to pay for it", "n", null, "Not built, and not decided.", null],
  ["biz", "An app in the app stores", "n", null, "Not built. Today it runs as a page.", null],
  ["plan", "Catch cards: the risk behind chasing extra return", "n", null, "From the multipliers talk.", null],
  [
    "plan",
    "Tax-path chains: one move that opens the next",
    "n",
    null,
    "A home, then an exchange, then the next step, with the rule to know, follow and document.",
    null,
  ],
  ["plan", "Best case, likely, worst case on any plan", "n", null, "What if shows one line today.", null],
  [
    "plan",
    "Life event blocks you can stack: home, car, kid, job change, sabbatical, a move",
    "b",
    () => WB_HAS("blocks") && WB_HAS("blockstog") && WB_FN("blocksCalc") && WB_FN("blocksBook"),
    "Each block is one simulator with your answers. Stack them and see your plan as today next to your plan with all of them.",
    "blocks",
  ],
  [
    "plan",
    "Stress test: real market history and 1,000 random markets as one result",
    "b",
    () => WB_HAS("stress") && WB_FN("stressCalc") && WB_FN("stressNamed") && WB_FN("stressBook"),
    "One count from both tests, the worst start year, the hard stretches people name (1929, 1966, 1973, 2000, 2008), and the one change that helps most.",
    "stress",
  ],
  [
    "plan",
    "Windfall: what to do with a bonus, a gift or a refund",
    "b",
    () => WB_HAS("windfall") && WB_FN("windCalc") && WB_FN("windBook"),
    "The extra money goes down the same order as your two paths, with the dollars for each step.",
    "windfall",
  ],
  [
    "plan",
    "Compare the ways: the 4% rule, guardrails and each other way to take money out, side by side",
    "b",
    () =>
      WB_HAS("takeout") &&
      WB_FN("cmpTab") &&
      WB_FN("cmpRow") &&
      WB_FN("waySpend") &&
      WB_FN("cmpBook") &&
      typeof WAYS === "object" &&
      WAYS.length > 30,
    "The same plan through each way to take money out, in families with variants. Each row has the spending of year one, the random markets and real start years that work, the hardest start year, the cuts, the money left and the age work can stop. Sort, filter, pin 3 rows, and one chart from the start year 1966.",
    "takeout",
  ],
  [
    "plan",
    "Taking money out: withdrawal plans, guardrails, a Roth ladder, health-plan credits",
    "b",
    () => WB_HAS("takeout") && WB_FN("tkoOrder") && WB_FN("tkoGuard") && WB_FN("tkoBridge") && WB_FN("tkoAca"),
    "Which account to take from first, your guardrails, four ways to cover the years before 59 and a half (with the Roth ladder year by year), and health cover until 65 under both credit rules.",
    "takeout",
  ],
  [
    "plan",
    "Two ages: work optional, and money reachable, for each person",
    "b",
    () => WB_HAS("ages") && WB_FN("agesFor") && WB_FN("agesReach"),
    "The age when the money is enough, next to the first age when it can pay each year before 59 and a half. One column for each person of a household.",
    "ages",
  ],
  [
    "plan",
    "Tripwires: decide now what sets off plan B",
    "b",
    () => WB_HAS("transit"),
    "Inside Break in case of emergency, on My Goals.",
    "transit",
  ],
  [
    "plan",
    "Fast cash list: ways to earn quickly, sorted by time to first dollar",
    "b",
    () => WB_HAS("transit"),
    "Inside Break in case of emergency, on My Goals.",
    "transit",
  ],
  [
    "plan",
    "Family help as a safety net number",
    "b",
    () => WB_HAS("transit"),
    "Inside Break in case of emergency, on My Goals.",
    "transit",
  ],
  [
    "plan",
    "Season cards and slots: what you can run at once",
    "b",
    () => WB_HAS("transit"),
    "Inside Break in case of emergency, on My Goals.",
    "transit",
  ],
  [
    "plan",
    "Your unfair advantages",
    "b",
    () => WB_HAS("transit"),
    "Inside Break in case of emergency, on My Goals.",
    "transit",
  ],
  ["plan", "The cost of not knowing: a dollar figure on each blank", "n", null, "Not built.", null],
  [
    "plan",
    "The trade-off board: one move across money, time, stress and people",
    "n",
    null,
    "Thirteen measures were drafted.",
    null,
  ],
  [
    "plan",
    "The pro-tier strategy library",
    "n",
    null,
    "Drafted as notes. The figures need a fresh check before anything ships.",
    null,
  ],
  ["plan", "Advice that fits you now, and advice to unlearn", "n", null, "Not built.", null],
  ["plan", "Start from one worry", "n", null, "The web app has a version. Not in the game.", null],
  ["plan", "Risk guesses you write down, checked later: luck or skill", "n", null, "Not built.", null],
  [
    "plan",
    "Mistake audit (opt-in): what a past money event cost, then and over time",
    "b",
    () => WB_HAS("rcaudit") && WB_FN("mauCalc") && WB_FN("rcAudit"),
    "Opens from the Yearly Review or the menu. The game does not open it for you.",
    "rcaudit",
  ],
  [
    "plan",
    "Recalculating: the old date, the new date and the one next turn",
    "b",
    () => WB_HAS("rc") && WB_FN("homeRcRow") && WB_FN("rcRoute"),
    "Also the order to pay in when a month is short, the cushion refill, and a safe-to-fail line.",
    "rc",
  ],
  [
    "plan",
    "Letter from your calm self: written in a calm month, shown in a hard one",
    "b",
    () => WB_HAS("exletter") && WB_FN("exLetterBody"),
    "One exercise. Only you see it.",
    "exletter",
  ],
  ["see", "A dashboard you can rearrange, with modes for who you are", "n", null, "Not built.", null],
  ["see", "One number shown as a thermometer, a bucket or a bar", "n", null, "Not built.", null],
  ["see", "Money weather: how it feels, Clear to Storm", "n", null, "Not built.", null],
  ["see", "What you own next to what you owe, as a picture", "n", null, "Not built.", null],
  ["feel", "The first $1,000 bonus hunt", "n", null, "Not built. The multipliers board is the first piece.", null],
  ["feel", "The credit score game", "n", null, "Not built.", null],
  [
    "feel",
    "Quest mode character sheet: health, armor, six stats",
    "n",
    null,
    "Not built. The character sheet uses plain numbers.",
    null,
  ],
  ["feel", "Opponents that test your values, and a collection of the ones you beat", "n", null, "Not built.", null],
  [
    "feel",
    "A judge that keeps a record to come back to, and a way to challenge the game's call",
    "n",
    null,
    "Not built.",
    null,
  ],
  ["feel", "Daily life-sim challenges at your level", "n", null, "Not built. Parked until the rest is solid.", null],
  ["feel", "Path packs: guided routes through the skills", "n", null, "Not built.", null],
  ["feel", "Ask the game a question", "n", null, "Waits on sign-in.", null],
  ["feel", "Roots and branches: your past as the trunk of your futures", "n", null, "Not built.", null],
  ["feel", "Small wins: the under-$100 fixes, batched", "n", null, "Not built.", null],
  ["feel", "Where you think you rank, next to where you are", "n", null, "Not built.", null],
  ["feel", "Hidden costs your life charges you", "n", null, "Not built.", null],
  ["feel", "How this plan fails, and the three moves that stop it", "n", null, "Not built.", null],
  ["feel", "Capacity: how much you can take on right now", "n", null, "Not built.", null],
  [
    "who",
    "Privacy page, delete my account, and calm words when an email cannot be sent",
    "b",
    () => WB_HAS("tuprivacy") && WB_FN("tuDelete") && WB_FN("tuAuth") && WB_FN("suInvited"),
    "Menu, Privacy: what is stored, where, who can see it. Share with my coach starts off, or on through a coach's invite. Delete my account removes the saved game and the copy on this device; the sign-in too after one database step that waits for Eli.",
    "tuprivacy",
  ],
  ["who", "Each person signs in to their own account", "n", null, "Not built. It is the next thing planned.", null],
  [
    "who",
    "Share by email and pick what each person sees",
    "n",
    null,
    "Not built. Hand-off codes copy a whole game.",
    null,
  ],
  ["who", "A monthly group money date", "n", null, "Not built.", null],
  ["who", "People who finished come back as mentors", "n", null, "Not built. Parked for later.", null],
  ["slam", "A coach's session agenda and checklist", "n", null, "Not built. The coach view shows each person.", null],
  ["slam", "A board of cards with a limit on how many are in play", "n", null, "Not built. Parked for later.", null],
  ["slam", "Three career paths side by side", "n", null, "Built once as its own tool. Not in the game.", null],
  ["slam", "Needs first: the life pyramid lens", "n", null, "Not built.", null],
  [
    "biz",
    "A profit engine for a one-person business: leads, capacity, price",
    "n",
    null,
    "Built once as its own tool. Not in the game.",
    null,
  ],
  ["biz", "A community cost-of-living planner", "n", null, "Built once as its own tool. Not in the game.", null],
  ["biz", "A city edition, and a stand-alone lever link with a result to share", "n", null, "Not built.", null],
  [
    "see",
    "Your unpaid jobs: the six jobs of running your money, admin hours, and the four ways out",
    "b",
    () =>
      WB_HAS("jobs") &&
      WB_HAS("jbexit") &&
      WB_FN("jobRoles") &&
      WB_FN("jobLiving") &&
      WB_FN("rvSheetJobs") &&
      WB_FN("homeJobsRow") &&
      WB_FN("ledgerCardJobs") &&
      typeof JOB_ROLES === "object",
    "From answers you already gave, on your character sheet and on Me. Hours a month running your money (Guess, Close, Exact) in the time ledger, and Running it and Living it on Home. Each task: Do it, Automate it, Hand it off, Drop it, each undoable.",
    "jobs",
  ],
  [
    "see",
    "Goal to account to automatic deposit, in one move of three taps",
    "b",
    () =>
      WB_HAS("wire") &&
      WB_HAS("wday") &&
      WB_HAS("wunwire") &&
      WB_FN("wireAmts") &&
      WB_FN("goalViewWire") &&
      WB_FN("goalCardWire") &&
      WB_FN("wireBook") &&
      WB_FN("jobWirePer") &&
      Array.isArray(WIRE_OPTIONS),
    "On a goal: where the money lives (or I need one, kinds side by side, no default), the amount from the goal's own math, the day (payday first). Then Set once. Check in: quarterly., a check-in with the four ways out, and Unwire with Undo. You set the transfer at your bank.",
    "gadd",
  ],
  [
    "see",
    "Health and insurance quests: open enrollment, HSA receipts, the FSA deadline, the EOB, policy renewals, the coverage review",
    "b",
    () =>
      WB_HAS("care") &&
      WB_HAS("cqday") &&
      WB_FN("careDue") &&
      WB_FN("todayExtrasCare") &&
      WB_FN("resetsCare") &&
      WB_FN("jobDateNext") &&
      Array.isArray(CARE_QUESTS) &&
      SEASONS.some(S => S.k === "oe"),
    "In the season lists next to tax season, each naming its job, with the four ways out. Tap your own dates once; a reminder lands on Today before each one. Every term opens the glossary.",
    "care",
  ],
  [
    "see",
    "Who carries what: the household role map of the six unpaid jobs",
    "b",
    () =>
      WB_HAS("rolemap") &&
      WB_HAS("rmset") &&
      WB_FN("jobCarry") &&
      WB_FN("rmBook") &&
      WB_FN("rmFairHours") &&
      WB_FN("jobsSheetRoleMap"),
    "Tap one or more people onto each job: a couple, a poly household, roommates, family, by their own names. The admin time of the home, who carries what, and its value at your time price. Labor counts in Sharing costs fairly adds these hours.",
    "rolemap",
  ],
];
function btRows() {
  return WB.filter(r => adOk(r) && (r[6] !== "own" || ADX.own)).map(r => {
    let ok = true;
    if (r[2] !== "n") {
      try {
        ok = !!r[3]();
      } catch (e) {
        ok = false;
      }
    }
    const note =
      typeof r[4] === "function"
        ? (() => {
            try {
              return r[4]();
            } catch (e) {
              return "";
            }
          })()
        : r[4];
    return {
      g: r[0],
      n: r[1],
      st: r[2] === "n" ? "n" : ok ? r[2] : "x",
      note: r[2] !== "n" && !ok ? "Missing from this version. Flag it to Eli." : note,
      a: r[2] !== "n" && ok ? r[5] : null,
    };
  });
}
function btCount(R) {
  const c = { b: 0, p: 0, n: 0, x: 0 };
  R.forEach(r => c[r.st]++);
  return c;
}
const WB_WORD = { b: "Built", p: "Partly", n: "Not yet", x: "Missing" };
function btText() {
  const R = btRows(),
    c = btCount(R),
    L = [
      "SLAM the Game: what's built",
      "Built " + c.b + ", partly " + c.p + ", not yet " + c.n + (c.x ? ", missing " + c.x : "") + ".",
      "",
    ];
  WB_GROUPS.forEach(g => {
    L.push(g[1]);
    R.filter(r => r.g === g[0]).forEach(r =>
      L.push("  [" + WB_WORD[r.st] + "] " + r.n + (r.note && r.st !== "b" ? ": " + r.note : ""))
    );
    L.push("");
  });
  return L.join("\n");
}
function btSheet() {
  const w = W,
    R = btRows(),
    c = btCount(R),
    f = w.f || "all",
    tile = (k, l) =>
      `<button class="cpcell ${f === k ? "best" : ""}" data-a="btf" data-v="${k}" style="cursor:pointer"><b style="font-size:20px">${c[k]}</b><div class="tiny muted">${l}</div></button>`;
  return (
    head("Menu", "What's built") +
    `<div class="small muted">Everything we have talked about for this game, checked against the game you are holding. Tap a number to filter.</div>
 <div class="cpgrid" style="grid-template-columns:1fr 1fr 1fr">${tile("b", "built")}${tile("p", "partly")}${tile("n", "not yet")}</div>${f !== "all" ? `<button class="ghost wide slim" data-a="btf" data-v="all">Show everything</button>` : ""}` +
    WB_GROUPS.map(g => {
      const rs = R.filter(r => r.g === g[0] && (f === "all" || r.st === f || (f === "b" && r.st === "x")));
      if (!rs.length) return "";
      return `<b class="small" style="margin-top:6px">${g[1]}</b><div class="stack" style="gap:6px">${rs
        .map(r => {
          const pill = `<span class="pill ${r.st === "b" ? "okp" : r.st === "p" || r.st === "x" ? "warn" : ""}" style="flex:none">${r.st === "b" ? "Built ✓" : WB_WORD[r.st]}${r.a ? " ›" : ""}</span>`,
            body = `<span style="min-width:0"><b class="small">${esc(r.n)}</b>${r.note ? `<div class="tiny muted">${esc(r.note)}</div>` : ""}</span>`;
          return r.a
            ? `<button class="rowbtn" data-a="${r.a}" style="gap:8px">${body}${pill}</button>`
            : `<div class="tile row between" style="gap:8px;align-items:flex-start">${body}${pill}</div>`;
        })
        .join("")}</div>`;
    }).join("") +
    `<button class="primary wide slim" data-a="btcopy">${w.copied ? "Copied. Paste it to Claude ✓" : "Copy this list"}</button><div class="tiny muted">Rows with an arrow open that screen. Something missing from the list? Flag this screen and say what.</div>`
  );
}
Object.assign(ACT, {
  built: () => {
    W = { kind: "built", f: "all" };
    sheet(btSheet);
  },
  btf: t => {
    W.f = t.dataset.v;
    drawSheet();
  },
  btcopy: () => {
    try {
      navigator.clipboard.writeText(btText());
    } catch (e) {
      report(e, "built.js: btcopy");
    }
    W.copied = true;
    drawSheet();
  },
});
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "built")) {
  const i = MENU.findIndex(m => m[1] === "flag");
  MENU.splice(i >= 0 ? i : MENU.length, 0, [
    "What's built",
    "built",
    "act",
    "Everything we planned: built, partly, or not yet",
  ]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
