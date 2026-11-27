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
    "p",
    () => typeof PASSKEY_READY !== "undefined" && WB_FN("lkPasskeySignIn") && WB_FN("lkPasskeyAdd"),
    "Built through Supabase sign-in and switched off (PASSKEY_READY) until Eli turns passkeys on in the Supabase project (docs/PASSKEYS.md). Under Menu, App lock, the button says why it waits.",
    "lock",
  ],
  [
    "feel",
    "App lock: fingerprint or PIN each time the game opens",
    "b",
    () => WB_HAS("lock") && WB_FN("lkShow") && WB_FN("lkHash") && WB_FN("lkBioCheck"),
    "Off until you turn it on. A PIN by taps (kept only as a scrambled copy), or the device's own fingerprint, face or PIN where the browser has it. Locks each time the game opens, or after 1, 5 or 15 minutes away. On this device only. Menu, Settings, App lock.",
    "lock",
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
    () => WB_FN("askSheet") && WB_HAS("askyes") && WB_HAS("asknone") && WB_HAS("akskip") && WB_FN("fqSharpOrder"),
    "Done for setup (count first, then one at a time), pay, spending, cash, investments, what you owe, each debt's details, Key numbers, your job's match and your tax accounts, each with a screen or a line after that says what changed. Make your numbers real asks the rows that could move your money most first, says what each could move, and offers to stop when the rest move little. Goals, the money log and the gig screens still ask several questions on one screen.",
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
  [
    "in",
    "Rocket Money export, read by its own columns",
    "b",
    () => WB_FN("imAppCols") && WB_FN("csvAppRows") && typeof IM_ROCKET_COLS !== "undefined",
    "In the statement import: a Rocket Money file is known by its header row, its own categories sort the lines, card payments and transfers stay out. A Monarch file still reads as a bank file.",
    "import2",
  ],
  [
    "slam",
    "Session summary, plan report and FIRE dashboard",
    "n",
    null,
    "Not ported. In the web app: Report, One-pager (the session summary, drafted for you), the Plan report, and Plan, FIRE.",
    null,
  ],
  ["in", "Subscription hunt from a statement", "b", () => WB_HAS("subs"), "", "subs"],
  ["in", "Log money in, out, debt payments and moves", "b", () => WB_HAS("flow") && WB_FN("applyFlow"), "", null],
  [
    "in",
    "Setup tap counter",
    "b",
    () => WB_FN("finishSetup") && WB_FN("finishSetupTaps") && WB_FN("fqTapsNote"),
    'Setup counts your taps and keeps the count. The payoff reveal says it as a plain fact ("You set this up in 54 taps"), never a score.',
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
    "Here's where you stand: the payoff reveal at the end of setup",
    "b",
    () => WB_FN("rsRevealBody") && WB_FN("rsCards") && WB_FN("rsLead") && WB_HAS("rsfirst") && WB_FN("fwLead"),
    "The lead number (the debt-free date below zero, the FI date for a FIRE player, else the next stop), five result cards with a target, the time at today's pace and what each unlocks, typical numbers greyed with Put in yours, then Start my first win.",
    null,
  ],
  [
    "see",
    "Home, results first: four cards",
    "b",
    () =>
      WB_FN("homeResults") &&
      WB_FN("rsNextWin") &&
      WB_FN("rsMonthEnd") &&
      WB_FN("rsRoute") &&
      WB_FN("rsTiles") &&
      WB_FN("rsGoal") &&
      WB_HAS("gohome") &&
      WB_FN("fwMonthEnd"),
    "Your next win (your goal now, the step you are on, then how to get there faster: one move, its money a month, the days closer to FI or debt-free, what it unlocks, one pulsing button), By the end of this month (solid if the planned moves happen, dotted if not), You are here (the route strip), four metric tiles with See all metrics, and Home on every screen.",
    null,
  ],
  [
    "see",
    "A receipt after each move: what moved, the next unlock, the next action",
    "b",
    () => WB_FN("rcpData") && WB_FN("rcpDiff") && WB_FN("celebrateReceipt") && WB_FN("rcpNextRow"),
    "Each finished move and logged transaction shows the net worth change, the days closer to FI or debt-free, any key number that moved, then the steps to unlock the next era and the next action with its tap count. A later date says Recalculating route.",
    null,
  ],
  [
    "see",
    "Your life map from age 15",
    "b",
    () => WB_FN("ltMap") && WB_FN("ltHeadStart") && WB_FN("mapTabTree") && WB_HAS("ltnode"),
    "The ten eras as one map from age 15 to FI. You launch in at your age and era, with starting bonuses from your answers and the head start of money already invested. Tap an era: what, why, the money and time, its steps and Go do it.",
    null,
  ],
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
    "Quick math: a HYSA switch, all at once or a little each month, cost per use, worth the hassle, what waiting costs, cut it or invest it (the round $30k / $90k rule), a warranty",
    "b",
    () => WB_HAS("quick") && WB_FN("qcHysa") && WB_FN("qcDca") && WB_FN("qcCutInvest") && WB_FN("qcGameBody"),
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
    "plan",
    "Tax Command Center: the set-aside, the four dates, safe harbor, what is owed by the next date",
    "b",
    () => WB_FN("gigSafeHarborOf") && WB_FN("gxHarbor") && WB_FN("gxHarborBody") && WB_HAS("gxsh") && WB_FN("gxBook"),
    "Working for yourself > Taxes first. The safe harbor rules are the IRS 2026 Form 1040-ES ones (dated in the reference data). This year's tax is a Guess from your set-aside share. The web app's page setaside.html works the year out on the tax engine.",
    "gig",
  ],
  [
    "plan",
    "Pricing your power: what a gig pays an hour next to your floor",
    "b",
    () => WB_FN("gigVsFloorOf") && WB_FN("gxVsBody"),
    "Working for yourself > My floor. One engine with the web app's freelance.html.",
    "gig",
  ],
  [
    "plan",
    "Platform P&L: fees and payout timing by app",
    "n",
    null,
    "In the web app (gigapps.html): each app's fee, when it pays out and the money still on its way, from the app's own help page (Uber, DoorDash, Upwork) or your taps. The game has no list of apps yet.",
    null,
  ],
  [
    "plan",
    "Social Security replacement: the share of today's pay it would replace",
    "b",
    () => WB_FN("raSsReplace") && WB_FN("raSsGame") && WB_FN("oddsSsCard"),
    "On Retirement odds and in Ratios on Key numbers. The estimate is the game's own (from your pay, at 67).",
    "odds",
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
    "b",
    () => WB_HAS("fline") && WB_FN("flineSheet") && WB_FN("gfBackwards") && WB_FN("gflEnd"),
    "Menu, Start at the finish line, and a button on the life map: what you need once work is optional, by when, then what you have and what comes in, worked back to a month to put in, the year at today's pace and two ways to close a gap. The same engine as the web app's finish-line walk.",
    "fline",
  ],
  [
    "plan",
    "Bottleneck finder: money, time, energy, skill, knowledge, people, fear or rules, each with Is this really it?",
    "b",
    () =>
      WB_HAS("bneck") &&
      WB_HAS("bnreal") &&
      WB_FN("gfBottleneck") &&
      WB_FN("bnQuestCall") &&
      typeof GF_KINDS !== "undefined" &&
      GF_KINDS.length === 8,
    "Menu, What's in the way: eight tap checks and your numbers rank what holds the plan up. The call has its own Is this really it? test; your answer wins, and the judge in Quest mode keeps it. Money as the call offers the first bonus hunt.",
    "bneck",
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
    "Family money: parents and kids at once, living at home, kids and tuition",
    "b",
    () =>
      WB_HAS("family") &&
      WB_FN("fmSandwich") &&
      WB_FN("famSand") &&
      WB_FN("famKids") &&
      GOAL_K.some(g => g[0] === "Yeshiva tuition"),
    "One engine with the web pages (sandwich, boomerang and tuition .html): money to parents and kids at once next to the freedom date and your first goal; the rent saved living at home next to the time to a moving-out goal; childcare (New York from the State Comptroller, Feb 2025), school or yeshiva tuition, what to put away a month, the New York 529 deduction and the K-12 rule. Yeshiva tuition is a goal type; its community presets wait for Eli.",
    "family",
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
    "Eli's frameworks and the canon",
    "b",
    () =>
      WB_HAS("ymoyl") &&
      WB_HAS("fwwins") &&
      WB_FN("fwSwan") &&
      WB_FN("fwPeak") &&
      WB_FN("homeNextDollar") &&
      ["swan", "mouse", "trust", "advice", "baby", "stages", "dwz", "peak"].every(
        id => typeof IG !== "undefined" && !!IG[id]
      ),
    "The SWAN number, the Second Mouse checklist, the Trust Framework, the Advice translator, the Baby Steps next to the game's order, the wealth stages, Die With Zero time buckets and the designed week, the net worth peak, Your Money or Your Life as nine steps in order, the quick wins to tick, and the next dollar on Home. One math file with the web app.",
    "ymoyl",
  ],
  [
    "plan",
    "The canon rows finished: F-You money, the noodle budget, pay yourself first, Shockingly Simple Math, your hour, the Money Guy's nine, Your Money or Your Life steps 1b and 3",
    "b",
    () =>
      ["fyou", "noodle", "mtpay", "simplemath", "mthand", "foonine", "ym1b", "ym3"].every(WB_HAS) &&
      WB_FN("cmFyou") &&
      WB_FN("cmTabulate") &&
      WB_FN("mtBook"),
    "Famous money ideas: F-You money (the months you could walk away, with the noodle month), the noodle budget (keep or set aside each line), pay yourself first (wired goals first, a paycheck, what is left), Shockingly Simple Math (from $0, the next 5%), what an hour of your time is worth next to the help's hour, and which of the Money Guy's nine you are on. Your Money or Your Life: step 1b, the balance sheet, and step 3, each month of the money log in hours of life. One math file with the web app (js/math/canonmath.js).",
    "fyou",
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
    "b",
    () => WB_FN("mixCalc") && WB_FN("ivFees") && WB_FN("mixAcctSec") && WB_HAS("mixfadd") && WB_HAS("xray"),
    "Every fund one by one with its own fee and sales charge, account and advisor fees, all in dollars a year; a fund with no fee says so. Insurance and other products: the Product X-ray.",
    "mix",
  ],
  [
    "plan",
    "Household mix: every account, the three-fund check, one company",
    "b",
    () => WB_FN("ivMix") && WB_FN("mixCalc"),
    "The stock share of all accounts next to your target or the age guide, the drift, a three-fund check, employer stock and any one company (the FINRA 10% line).",
    "mix",
  ],
  [
    "plan",
    "Invest or pay debt: one grid of rate x return",
    "b",
    () => WB_HAS("ivheat") && WB_FN("ivHeat") && WB_FN("ivgHeat"),
    "$1,000 for five years, the debt at its rate next to the return, your own debts and return marked. No red.",
    "ivheat",
  ],
  [
    "plan",
    "Roth or traditional, account by account",
    "b",
    () => WB_HAS("ivroth") && WB_FN("ivRoth") && WB_FN("crRothTrad"),
    "Federal + state marginal rate now next to an estimate for retirement, for each account with a choice, on the launch window's rule. City tax is in the web app only.",
    "ivroth",
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
    "see",
    "Ratios on Key numbers: one line each, in groups, each with its formula",
    "b",
    () => WB_FN("knSheetRatios") && WB_FN("raGameRead") && WB_FN("raCurrent") && WB_FN("raConfidence"),
    "Twenty ratios from the numbers you already have, each with Guess, Close or Exact, one plain sentence and Show the math. Financial confidence: rate it with a tap, next to what your numbers say.",
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
    "What it is / What it could be: your FI number and the layer chart",
    "p",
    () =>
      WB_FN("lyYears") &&
      WB_FN("lyNumbers") &&
      WB_FN("cbNumbers") &&
      WB_FN("cbChart") &&
      WB_FN("cbStart") &&
      WB_FN("cbStepAdd") &&
      WB_FN("cbWayDo") &&
      WB_FN("lyShapeBands") &&
      WB_FN("lyLifetime") &&
      WB_FN("cbLife") &&
      WB_FN("cbWays") &&
      WB_HAS("cbdo") &&
      WB_HAS("cb") &&
      WB_HAS("cbcount") &&
      WB_HAS("cbrest"),
    "The first thing a new player sees: four taps (age, spending, invested, saved a month), then the FI number the standard way, its age, and what the rest of your life costs at today's spending. Two numbers stay on top: What it is and What it could be. The chart shows which layer pays for each year to 95 (work, investments, Social Security, other), what is not covered yet, and the two costs the 25 times rule leaves out. Then two ways to shrink it, each with Count this, Already doing it and Not for me: spending that eases with age (the typical shape of the BLS survey) and Social Security (Not counting on it, Count part of it, Count all of it). The last screen has both numbers, the chart, every way of the flow with where it stands, and the ways on to the rest of setup and Next Steps. Menu: What it is / What it could be.",
    "cb",
  ],
  [
    "see",
    "What it could be, way 3: pay less tax on the way out",
    "p",
    () =>
      WB_FN("lyTaxPlan") &&
      WB_FN("cbTaxPlan") &&
      WB_FN("cbTaxYears") &&
      WB_FN("cbTaxView") &&
      WB_FN("cbTaxFill") &&
      WB_HAS("cbtaxdo") &&
      typeof LY_TAX_REF === "object",
    "Batch B, phase 2a. A way of What it is / What it could be: the tax on traditional money, with a plan for the years after work (bracket filling, Roth conversions, the 0% capital gains zone), year by year, with the account each year draws from. Two taps: how you file and your state. Partly: a player whose money is all in one kind of account sees why there is no drop yet; tax on gains and on Social Security is not counted.",
    "cb",
  ],
  [
    "see",
    "What it could be, way 4: bend your spending when markets fall",
    "b",
    () =>
      WB_FN("lyFlex") &&
      WB_FN("cbFlexFind") &&
      WB_FN("cbFlexPlan") &&
      WB_FN("cbFlexTake") &&
      WB_FN("cbFlexView") &&
      WB_HAS("cbflexdo"),
    "Batch B, phase 2b. A way of What it is / What it could be: guardrails in place of a fixed 4%. The game finds the highest starting rate at which the guardrails rule held in the real start years of market history as often as the fixed 4% rule, and sizes What it could be at that rate. The screen shows the rule, the test it comes from, what the deepest cut looks like next to your needs, the drop, and the three buttons.",
    "cb",
  ],
  [
    "see",
    "What it could be, way 5: money that shows up later",
    "p",
    () =>
      WB_FN("lyEndsAt") &&
      WB_FN("cbLaterPlan") &&
      WB_FN("cbLaterSet") &&
      WB_FN("cbLaterView") &&
      WB_HAS("cblaterdo") &&
      WB_HAS("cblaterset"),
    "Batch B, phase 2c. A way of What it is / What it could be: a pension, and a home loan that is paid off. Up to three taps ask for them and write the game's own answers. A pension pays part of each year from 65; a payment that ends makes each year cost less from the age it ends. Partly: the pension starts at 65 until setup has your own age, and the value of the home itself (selling, a smaller home) is not counted.",
    "cb",
  ],
  [
    "see",
    "What it could be: the stack, the counter and the backups",
    "b",
    () =>
      WB_FN("cbStack") &&
      WB_FN("cbStackView") &&
      WB_FN("cbStackLine") &&
      WB_FN("cbBackupRow") &&
      WB_FN("cbMoves") &&
      WB_FN("cbMoveView") &&
      WB_FN("cbStepNear") &&
      WB_HAS("cbquick") &&
      WB_HAS("cbbk") &&
      WB_HAS("cbmovedo"),
    "Batch B, phases 2d, 2e and 2f. After the chart, one screen lists every way in two groups: the ways to shrink the number, and the ways to get there sooner (the moves of the Strategy Engine, the levers and the multipliers, each with months sooner from the same engine as Moves to try). Each group has the biggest effect for you first. What cannot apply sits under an i with the reason. One tap counts a way. A counter shows how many are stacked, and a meter how many backups are in place. A backup changes no number.",
    "cb",
  ],
  [
    "see",
    "What it could be: the Yes, but card",
    "b",
    () =>
      WB_FN("cbYb") &&
      WB_FN("cbYbPick") &&
      WB_FN("cbYbView") &&
      WB_FN("cbYbStackRow") &&
      WB_FN("cbYbPaint") &&
      WB_HAS("cbybtap") &&
      WB_HAS("cbybpair") &&
      WB_HAS("cbybsave") &&
      typeof IG === "object" &&
      !!IG.yesbut,
    "Batch B, phase 3. A trade in two halves, between the two groups of the stack. Yes: tap a cut you make or would make. But: tap what you keep or upgrade because of it. Each half shows its price in months and the net is in the middle, all from the same engine as Moves to try. The game suggests pairs from the values you ranked, or by size until you rank them. The card saves as an image with no dollar amount. It is a what-if: it changes no spending line and neither of the two numbers. Its credit is in Famous money ideas; the name of the source waits on Eli.",
    "cb",
  ],
  [
    "see",
    "What it could be: the reveal, the card to share, Home and the day after",
    "b",
    () =>
      WB_FN("cbReveal") &&
      WB_FN("cbRevealView") &&
      WB_FN("cbPlanCard") &&
      WB_FN("cbTopMoves") &&
      WB_FN("cbSince") &&
      WB_FN("homeCbTile") &&
      WB_FN("stgAddSteps") &&
      WB_HAS("cbsave") &&
      WB_HAS("cbshare") &&
      WB_HAS("cbaddstep") &&
      WB_HAS("cbback"),
    "Batch B, phase 4. The reveal shows What it is and What it could be side by side, the difference in dollars and in years, what you counted (each one opens its deeper feature) and the finished chart with every switch. The moves before FI and the Yes, but card keep their months on their own line, and an i says why. The last screen has three buttons: Save my plan, Share my card, Tell Eli what broke. The card is an image with ages and names and no dollar amount. Your top 3 moves are cards on Next Steps, with Add to my steps. Home starts with the two numbers and a small chart, and a tap opens the flow where you left off. On a later day the tile says what changed since last time.",
    "cb",
  ],
  [
    "feel",
    "A calmer first week: four places in the bar, the rest in the menu, the Tool library",
    "b",
    () =>
      WB_FN("fwRule") &&
      WB_FN("fwBar") &&
      WB_FN("fwMenu") &&
      WB_FN("homeFwNote") &&
      WB_HAS("fwlog") &&
      WB_HAS("fwok") &&
      typeof TOOL_LIB !== "undefined" &&
      TOOL_LIB.length > 0,
    "Batch B, phase 5. In the first 7 days the bar at the bottom shows Home, Next Steps, My Money and My number (What it is / What it could be). My Goals, Me, Log money and every other tool stay in the menu, in groups inside groups, and an i on the menu says where everything went. The standalone tool pages of the web app are one menu group, Tool library. The other tabs return after 7 days or after the reveal, whichever is later, with one line on Home: New for you. A game older than 7 days, and an account with the coach or admin role, see no change.",
    "menu",
  ],
  [
    "feel",
    "FIRE statuses: markers on your path, and the options each one opens",
    "b",
    () =>
      WB_FN("stList") &&
      WB_FN("stGame") &&
      WB_FN("stWeave") &&
      WB_FN("rsRouteStatus") &&
      WB_HAS("ltstatus") &&
      WB_HAS("stok") &&
      WB_HAS("stbelowok") &&
      stGame(C()).list.length === 6,
    "Coast, Lean and FI are statuses, not goals: markers with a number and a date on the life map, the journey and the card You are here. Reaching one shows a card with a few options to look at. Your next step stays the same. Barista, Chubby and Fat have no number in the game yet.",
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
    "A name for your read (84 of them, from your main pull and your way of dodging change), the light side and the virtue of each, and one Recalculating move for the month. A share card with no numbers, made only when you tap. Home, the month check and the crash drill add one line for your type once the read has a label. Two people in a household who both turn on sharing see how their reads collide and get a money date to tap through. A gentle retake each quarter, and the sin weakening over the retakes on the character sheet. The graduation story reads it (Quest mode, Graduating), only when you turn on Show my read.",
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
    "b",
    () => WB_HAS("rival") && WB_FN("rivalPastPart") && WB_FN("gfPastSelf") && !!RIVALS.typical && !!RIVALS.nepo,
    "Me, Role model and rival: past you from your own saved check-ins (the last 90 days next to the 90 before), a typical path on the country's saving rate, and made-up rivals at four levels plus the head-start one. Never a real person.",
    "rival",
  ],
  [
    "feel",
    "People who did it",
    "b",
    () =>
      Array.isArray(MENTORS) && WB_FN("gfStoriesPart") && typeof GF_STORIES !== "undefined" && GF_STORIES.length >= 8,
    "What if, People: made-up composite stories, one for each kind of bottleneck, labeled Made-up story on screen, the one for your bottleneck first; then the real people who told their stories in public.",
    "moves",
  ],
  [
    "feel",
    "Motion that shows what changed",
    "b",
    () => WB_FN("celebrate") && WB_FN("rcpBar") && WB_FN("rcpBarHtml") && WB_HAS("rcpreplay"),
    "Numbers flash when they change and wins get a card. Each line of a receipt has a bar that moves from before to after, with both values, and Replay what changed plays it again. Less motion when the phone asks for it.",
    null,
  ],
  [
    "feel",
    "Graduating: a win state and your story",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsGraduate"),
    "Menu, Quest mode, Graduating: pick your finish line (Debt free, $100k, Coast or FI); reached, it says You graduated. Your story from your saved snapshots: the start, the month each journey stage was first met, the change since. The money read joins the story only when you turn on Show my read.",
    "qmode",
  ],
  [
    "feel",
    "More quizzes: Money Scripts, the Enneagram solo, the FIRE Community Quiz, a picture quiz, trait percents, and the Quantum Collapse quiz",
    "b",
    () =>
      WB_HAS("qz") &&
      WB_FN("qzBars") &&
      WB_FN("qzSpectrums") &&
      WB_FN("qzPaths") &&
      WB_FN("qzBarsPart") &&
      WB_FN("qzMeterPart") &&
      typeof QZ_SKINS !== "undefined" &&
      ["scripts", "enneagram", "fire", "snack", "traits", "collapse"].every(id => QZ_SKINS.some(s => s.id === id)),
    "Skins of the one quiz engine. Each ends on one card with a skill and a read. A percent for each trait, spectrums on the FIRE quiz, picture tiles, and for Quantum Collapse the plans still possible and the measured order of the next five numbers. Under Me, Quizzes.",
    "qz",
  ],
  [
    "feel",
    "Duolingo mode: the daily question routes by your quiz, and a daily lesson path for you",
    "b",
    () =>
      WB_HAS("lp") &&
      WB_HAS("dq") &&
      WB_FN("qzDailyPart") &&
      WB_FN("lpLessons") &&
      typeof ADULT_LESSONS !== "undefined" &&
      ADULT_LESSONS.length >= 12,
    "After the daily question, a skill and a short read from your latest quiz result. Daily lessons: the Kids mode path for you, 12 lessons, the ones that fit your quiz first, each ending on its skill. In the menu.",
    "lp",
  ],
  [
    "feel",
    "Your strengths and weak spots, as plain numbers",
    "b",
    () => WB_FN("elStats"),
    "Months of cushion, dollars left each month, months of pay owed, years of spending invested, protections in place. A guess says it is a guess.",
    "elem",
  ],
  [
    "feel",
    "Proof on steps",
    "b",
    () => WB_FN("pfStepPart") && WB_FN("pfCount") && WB_HAS("pfkind") && WB_HAS("proofs"),
    "A step is still done when you say it is. On a done step you can keep a proof: a number you see, a screenshot, a statement, or someone who saw it, with the date. Menu, Proof you kept.",
    "proofs",
  ],
  [
    "feel",
    "Theme blends",
    "b",
    () => WB_FN("tbBlend") && WB_FN("tbVO") && WB_FN("tbPick") && WB_HAS("tbmix"),
    "One theme's look with another's voice, and now a second voice mixed in: praise and whispers from both, and the step names the first voice lacks from the second. Theme, Blend two themes.",
    "themes",
  ],
  [
    "feel",
    "Book curator",
    "b",
    () => WB_FN("bcFor") && WB_FN("bcStepPart") && typeof BC_BOOKS !== "undefined" && BC_BOOKS.length >= 20,
    "Books from the library of famous money ideas, matched to the track of each step: on the step, and in Menu, Books for your next step. Each opens as its idea on your numbers.",
    "books",
  ],
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
    "b",
    () => WB_FN("cxNews") && WB_FN("sheetRippleRow") && WB_FN("sheetRippleStart"),
    "Finishing a skill names the tracks it opens. An answer about your numbers puts a slim strip at the top of the sheet: what it moved (net worth, days to FI or debt-free, a key number, a new era) and a step it unlocked, from the same receipt as the Done screen.",
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
    "plan",
    "Safety nets: medical leave, a move, a breakup and a new baby, each with its tripwires and Plan B",
    "b",
    () => WB_HAS("ntkind") && WB_FN("ntEvent") && WB_FN("ntLevels"),
    "Inside Break in case of emergency, on My Goals: tap what is happening. How long the cash lasts, the lowest point, three tripwires, Plan B. The Dip tab of the layoff has How long at each level (full life, DRAFTT, FAT, food and housing only) with the Rule of 5.",
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
  [
    "who",
    "Test with a friend: three tasks, a tap counter, and the screen where the person stopped",
    "b",
    () => WB_HAS("testkit") && WB_FN("tkTapAdd") && WB_FN("tkStop") && WB_FN("tkAt"),
    "Admin menu. The three tasks: find out what your number could be, switch Social Security off and say what changed, get back Home and find your next move. The game counts the taps of each task, keeps the names of the screens and notes where the person stopped. No sound and no picture of the screen is recorded. The results stay in the saved game; Copy these results gives them as text.",
    "testkit",
  ],
  [
    "who",
    "Tester drives: a think-aloud test with a tap counter and Report this pinned open",
    "b",
    () => WB_HAS("thinkaloud") && WB_FN("taDock") && WB_FN("taNoteFor"),
    "Admin menu, or the game's address with ?think=1. Three tasks by default, a tap counter for each, Report this open on every screen with the screen name filled in; the reports go to the Report inbox.",
    "thinkaloud",
  ],
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
  [
    "who",
    "Guilds",
    "p",
    () => WB_HAS("guild") && WB_FN("gdMembers") && WB_FN("gdView"),
    "A private guild of the people in this game (a household, or the people a coach helps): each person joins and picks what the others see, never a money number. No public feed. Between accounts it needs the tables of supabase/migrations/20261126120000_guilds.sql, not applied yet.",
    "guild",
  ],
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
  [
    "slam",
    "Benefits cliff map",
    "p",
    () => WB_FN("bpHealthCliff") && WB_FN("bpCoverage"),
    "The health part is in the game: on Benefits and health, Coverage, what a raise does to your health coverage, from the web app's own chain. Food help, the EITC and child care stay in the web app (New York and federal). Other states wait for their dated rules.",
    "benefits",
  ],
  [
    "slam",
    "LGBTQ+ money tools: care costs, ID papers, the plan check, chosen family",
    "n",
    null,
    "Not ported, by choice for now. They live in the web app, where nothing is kept unless you turn on Keep this. A game profile is kept and a coach can see it.",
    null,
  ],
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
  [
    "plan",
    "The cost of not knowing: a dollar figure on each blank",
    "b",
    () => WB_FN("fqBlanks") && WB_FN("arStop") && WB_HAS("fqstop") && WB_HAS("fqaskstop"),
    "Each Guess or Close number gets what it could move your money a year from now. The blanks are ranked by it with the ranking of Ask me next, and the game stops asking once the ones asked cover 80% (the 80/20 rule): in setup's spending, in Make your numbers real, on the payoff reveal and in Close numbers.",
    null,
  ],
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
  [
    "plan",
    "Money exercises: ten pieces of writing about you and money, and three prompts for life after work",
    "b",
    () => WB_HAS("exercises") && WB_FN("exsSheet") && typeof EX_LIST !== "undefined" && EX_LIST.length === 13,
    "A letter to money, your earliest money memory, a shame inventory, finish these sentences, scarcity and abundance, your alter ego, a forgiveness letter, values and spending, the Enough exercise, your money autobiography; then Why journal, Little p purpose and who you are after work. The letter from your calm self is the first card. Typed or spoken. Me only unless you share one with your coach.",
    "exercises",
  ],
  ["see", "A dashboard you can rearrange, with modes for who you are", "n", null, "Not built.", null],
  ["see", "One number shown as a thermometer, a bucket or a bar", "n", null, "Not built.", null],
  ["see", "Money weather: how it feels, Clear to Storm", "n", null, "Not built.", null],
  ["see", "What you own next to what you owe, as a picture", "n", null, "Not built.", null],
  [
    "feel",
    "The first $1,000 bonus hunt",
    "b",
    () => WB_HAS("hunt") && WB_FN("huRead") && WB_FN("plBonus") && WB_FN("plHunt"),
    "From the bank bonus queue: a bank bonus calculator (the bonus less its tax, the HYSA interest the deposit gives up, and the fees), then bonuses one at a time, Planned, Open or Paid, toward $1,000 kept. Menu, Games and quizzes; also a quick win from What's in the way (Money) and from a gap on Start at the finish line.",
    "hunt",
  ],
  [
    "feel",
    "The credit score game",
    "b",
    () => WB_HAS("crg") && WB_FN("plFicoRound") && typeof PL_FICO !== "undefined",
    "Two tap rounds on the five groups of a FICO Score (myFICO's shares) and what everyday moves touch. No real score is fetched; your own card use from Key numbers sits next to it.",
    "crg",
  ],
  [
    "feel",
    "Quest mode character sheet: health, armor, six stats",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsStats"),
    "Menu, Quest mode (also a row on My character sheet): health is your cushion, armor your protections, and six stats (Margin, Reach, Lightness, Coast, Clarity, Rhythm), each a real number from your plan scored 0 to 100, with its math and Guess or Close.",
    "qmode",
  ],
  [
    "feel",
    "Opponents that test your values, and a collection of the ones you beat",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsDuel"),
    "Quest mode, Opponents: eight original opponents, each pulling on one value and testing another. You tap the price; it shows in days of your spending, months of what you keep and the freedom date. Your choice beats it when it fits the three values you picked. The ones you beat stay in your collection.",
    "qmode",
  ],
  [
    "feel",
    "A judge that keeps a record to come back to, and a way to challenge the game's call",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsJudge"),
    "Quest mode, The judge: the game's calls about you (your era, your strongest stat, how much you can take on, your money read, where you rank), each with its evidence, This fits and Challenge this. Each tap is kept. A challenge to the capacity call moves it one step; the money read's Is this really it? writes into the same record and moves the read.",
    "qmode",
  ],
  [
    "feel",
    "Daily life-sim challenges at your level",
    "b",
    () => WB_FN("lsDailyPart") && WB_FN("plChallenge") && WB_HAS("lsopen"),
    "After the daily question: one surprise cost a day, picked for your era and sized in days of your own spending, and three ways to meet it with the cushion and the card interest each leaves. Practice only. Also in the menu.",
    "lsopen",
  ],
  [
    "feel",
    "Path packs: guided routes through the skills",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsPack"),
    "Quest mode, Path packs: six short routes through the skills (the cushion, costly debt, investing, the big risks, money feelings, the long game), each with its progress and next step; the one that fits your numbers now is marked.",
    "qmode",
  ],
  [
    "feel",
    "Ask the game a question",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsAsk"),
    "Quest mode, Ask the game: tap a question (when work could be optional, how long cash lasts, what you keep, your next move, what the library says on a topic). The answer comes from your plan and the game's library. No outside AI, no network.",
    "qmode",
  ],
  [
    "feel",
    "Roots and branches: your past as the trunk of your futures",
    "b",
    () => WB_FN("rbData") && WB_HAS("roots"),
    "Roots: your saved check-ins, steps done, tracks finished and proof kept. The trunk: today. Branches: the years to work optional as you are, with $100 more a month, with 10% more of take-home, and after a year with no saving. Menu, My money.",
    "roots",
  ],
  ["feel", "Small wins: the under-$100 fixes, batched", "n", null, "Not built.", null],
  [
    "feel",
    "Where you think you rank, next to where you are",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsRank"),
    "Quest mode, Where you rank: you guess first, then see your net worth next to the middle household of your age (Federal Reserve SCF 2025) and the quarter of all households.",
    "qmode",
  ],
  [
    "see",
    "Comparing with peers: you and people like you",
    "p",
    () => WB_HAS("peers") && WB_FN("peNetWorth") && WB_FN("pePatterns") && typeof PE_PRIORS !== "undefined",
    "Menu, You and people like you (private): net worth next to the middle household of your age (SCF 2025), savings rate next to the country's (BEA, Sept 2026), household pay next to the middle household's (Census 2025), the next milestone of the journey, and people like you lines (SHED and SCF), each with its source. Not yet: savings rate and income percentiles by age (no dated table reachable). Quest mode's rank reads the same function. Also peers.html on the web.",
    "peers",
  ],
  [
    "see",
    "Giving: rate, a gift in time, bunching, envelopes, maaser credit",
    "b",
    () => WB_HAS("giving") && WB_FN("gvBunch") && WB_FN("gvCredit") && typeof GV_TAX !== "undefined",
    "Menu, Giving: your giving rate on the base you pick (gross, take-home, after work costs) and the share it comes to (maaser commonly 10%, your own tap), one gift in hours of work, days on your free date and what it could have grown to, bunching two or three years of giving into one on the 2026 federal rules (the $1,000 / $2,000 deduction without itemizing, the 0.5% floor), envelopes inside one account that fill and empty, and a running maaser count where giving ahead counts by your own rule. Not yet: volunteer hours toward maaser, the 35% limit in the 37% bracket. Also giving.html on the web.",
    "giving",
  ],
  [
    "feel",
    "Hidden costs your life charges you",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsHidden"),
    "Quest mode, Hidden costs: interest on what you owe, fees on your investments, prices on cash above your cushion (CPI, dated), lifestyle creep past prices, and your hours running your money, a year, a month and in days of your spending.",
    "qmode",
  ],
  [
    "feel",
    "How this plan fails, and the three moves that stop it",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsFails"),
    "Quest mode, Room and weak spots: the places this plan would bend (a month with no pay, prices going up, costly debt, one paycheck, a big surprise bill, a low month), closest first, and the three moves that stop them.",
    "qmode",
  ],
  [
    "feel",
    "Capacity: how much you can take on right now",
    "b",
    () => WB_HAS("qmode") && WB_FN("qsCapacity"),
    "Quest mode, Room and weak spots: 0 to 3 new steps this month, from what is free after spending, your cushion and how full your plate is. Tell the judge you have less or more room and the call moves one step.",
    "qmode",
  ],
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
    "b",
    () => WB_HAS("hhx") && WB_HAS("hxpick") && WB_HAS("hxmail") && WB_FN("hhDraft") && WB_FN("hxDraftFor"),
    "Households together, Share by email: tap who it is for and what they see; the draft opens in your own mail app and SLAM sends nothing. An item not picked for that person is not in their draft. The web app's one-pager has the same, on the shared view.",
    "hhx",
  ],
  [
    "who",
    "Same question: two or more people answer, and what differs becomes a talk point",
    "b",
    () => WB_HAS("hxans") && WB_HAS("hxpaste") && WB_FN("hhCompare") && WB_FN("hhReadCode") && WB_FN("hxDateStep"),
    "Pass one phone round (the answers stay hidden until everyone is done), or answer on your own phone and send a short answer code. No score. The talk points also go on the guild's monthly money date.",
    "hhx",
  ],
  [
    "who",
    "FI together: everyone's FI number and date side by side, with the gap",
    "b",
    () => WB_HAS("hxstep") && WB_HAS("hxgame") && WB_FN("hhFiTogether"),
    "Each person writes their own, or uses the game's. The gap in the number and in time.",
    "hhx",
  ],
  [
    "who",
    "A shared home for three or more, and the tax gap when only two can marry",
    "b",
    () => WB_HAS("hxfair") && WB_FN("hhEquity") && WB_FN("hhMarryGap") && WB_FN("hxBook") && WB_FN("esCompare"),
    "What each person put in and pays, their part of the equity by contributions and equally, and the federal tax for each pair married next to everyone single. Each pair is Married or partners? of Estate and marriage (esCompare), with a link to it.",
    "hhx",
  ],
  [
    "who",
    "A monthly group money date",
    "b",
    () => WB_HAS("gddate") && WB_FN("gdNext") && WB_FN("gdDateSteps"),
    "In the guild: one day of the month, five prompts to tap through together (a win each, the guild this month, a next turn each, ask the people who finished, the next date).",
    "guild",
  ],
  [
    "who",
    "People who finished come back as mentors",
    "b",
    () => WB_FN("gdMentors") && WB_FN("gdMentorPart"),
    "A guild member who finished a whole skill track can offer to be asked about it. The others see who to ask on that track's steps and in the money date.",
    "guild",
  ],
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
    "Lifestyle creep and enough: spending next to income over the years, the few lines, your enough number, Rough numbers",
    "b",
    () =>
      WB_HAS("enough") &&
      WB_HAS("enpick") &&
      WB_HAS("roughset") &&
      WB_FN("enCreep") &&
      WB_FN("enPareto") &&
      WB_FN("enEnough") &&
      WB_FN("enRough") &&
      WB_FN("roughRow") &&
      typeof EN_CPI === "object",
    "Each category of your money log, this year next to last year and next to your income, with the lines that grow faster than prices (the CPI figure or your own rate) and one quiet Recalculating card. The few lines that make 80% of your spending. Your enough number with room for error. Rough numbers shows ranges in place of exact amounts, one switch on Me.",
    "enough",
  ],
  [
    "see",
    "Joy and enough: joy per dollar, the fulfillment curve and the Enough meter, the rich-life list, subscriptions in days",
    "b",
    () =>
      WB_HAS("joy") &&
      WB_HAS("jyrate") &&
      WB_HAS("jycurve") &&
      WB_HAS("jyset") &&
      WB_FN("enJoy") &&
      WB_FN("enCurve") &&
      WB_FN("enRich") &&
      WB_FN("enSubs") &&
      WB_FN("joyHomeLine"),
    "A joy tap on each spending line, with its share of your joy, joy per dollar and joy per hour of work. Each line placed on survival, comforts, luxuries or past enough, and the Enough meter from that. Your rich-life list with prices, joy, memory dividends and a regret view. Every subscription as the days it adds to the day work becomes optional.",
    "joy",
  ],
  [
    "see",
    "Benefits and health: what your benefits are worth, your employer's numbers, the coverage you may qualify for, plans side by side",
    "b",
    () =>
      WB_HAS("benefits") &&
      WB_HAS("bhemp") &&
      WB_HAS("bhplanset") &&
      WB_FN("bpHsa") &&
      WB_FN("bpDcfsa") &&
      WB_FN("bpEspp") &&
      WB_FN("bpCommuter") &&
      WB_FN("bpEligible") &&
      WB_FN("bpPlans") &&
      WB_FN("bpEmployer") &&
      typeof BP_REF === "object",
    "Dollars a year for an HSA used as a retirement account, a dependent care FSA over the daycare years, an ESPP and commuter. Tap a large employer to fill its match, vesting and ESPP discount, each with its source. The coverage you may qualify for (Medicaid, the Essential Plan in New York, the marketplace credit) and two or three plans side by side.",
    "benefits",
  ],
  [
    "plan",
    "Estate and marriage: estate basics, what your people would receive (the step-up, the 10 years of an inherited account, the federal and New York lines), married or partners, New York first",
    "b",
    () =>
      WB_HAS("estate") &&
      WB_HAS("estab") &&
      WB_FN("esHeirs") &&
      WB_FN("esTenYear") &&
      WB_FN("esCompare") &&
      WB_FN("spousalExcess") &&
      WB_FN("estateSheet") &&
      typeof ES_REF !== "undefined" &&
      typeof ES_RULES !== "undefined",
    "One engine with the web app (heirs.html, married.html). The private summary with names for a lawyer stays in the web app (kin.html), which now has who is named on each account from Life admin.",
    "estate",
  ],
  [
    "plan",
    "Hard moments: a breakup, a roommate leaving, a death, a partner who died, medical bills, saying no to lending, a fire, a flood or an eviction, a private money plan",
    "b",
    () =>
      WB_HAS("hard") &&
      WB_HAS("hmkeep") &&
      WB_HAS("hmexit") &&
      WB_FN("hmUntangle") &&
      WB_FN("hmRoommateExit") &&
      WB_FN("hmChecklist") &&
      WB_FN("hmFill") &&
      WB_FN("hmLeave") &&
      WB_FN("trHardRow") &&
      typeof HM_REF === "object",
    "Calm steps by when they are due, words to copy with your own numbers, and a dated list of who can help for each one. Untangling shows what each of you ends up with and the debts still in both names; a roommate leaving runs on the same split as sharing costs. Nothing is kept unless you turn on Keep this, a coach sees it only if you let them, and Leave this page goes to a weather site at once (or press Shift three times).",
    "hard",
  ],
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
  [
    "in",
    "Find your era in 60 seconds: the demo page, and its answers come into the game",
    "b",
    () => WB_FN("erIn") && WB_FN("erResult") && WB_FN("erNext") && WB_FN("erBase"),
    "Run CC-1, item 7. One small page at game/era/ asks six or seven questions by taps: age, spending, cash cushion, what you owe, invested, saved a month, and tax-friendly accounts when you invest. It shows your era, one next move, and Start my full game. The era comes from the game's own rule. The answers stay on the device and come into the game, so a new player does not answer them again. A printable page with a QR code is at game/era/print.html.",
    null,
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
