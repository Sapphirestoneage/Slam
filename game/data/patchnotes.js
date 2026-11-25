/* ============================================================================
   SLAM the Game: data/patchnotes.js
   PURPOSE     The patch notes: what changed, in plain words, for the person who plays. The game shows
               them in the Menu as "What's new" (features/founding.js), the newest first. The web app
               shows the same list in its More menu (js/ui/whatsnew-ui.js).
   INPUT       None. Data only.
   OUTPUT      PATCH_NOTES: a list of entries. d is the date (YYYY-MM-DD). t is the title. l is a few
               short lines.
   DEPENDS ON  Nothing.
   RULES       Each run adds ONE entry at the END of the list, from its summary (CONTRIBUTING.md). The
               screen sorts by date, and for one date it shows the later entry first.
               Write from the side of the person: what they can do now, and where it is. No file names,
               no jargon. Never "bug", "broken" or "failed" about the person. "Fixed" for the app is
               fine. No money numbers of a real person. No em dashes.
   ========================================================================= */
const PATCH_NOTES = [
  {
    d: "2026-11-23",
    t: "The Galaxy",
    l: [
      "Every skill in the game is now a star on one map. It starts in the middle and spirals outward as you learn.",
      "Tap a star to see what it teaches and what it opens next.",
      "Where am I, in the Menu, shows where you left off and every place you can go.",
    ],
  },
  {
    d: "2026-11-23",
    t: "Ten more tools",
    l: [
      "Taking money out, and the two ages that matter for it.",
      "A stress test for your plan, life event blocks, and what to do with a windfall.",
      "Countdowns on My Goals, two job offers side by side, and which account gets your next dollar.",
      "A ledger with three statements, and the card vault.",
    ],
  },
  {
    d: "2026-11-24",
    t: "The card vault and a card library that grows",
    l: [
      "The card vault looks at your spending by category and shows what each card gives back for it.",
      "It counts the credits of each card, and it asks a few questions about one airline, one hotel brand or one store.",
      "The library has 93 cards now, and new ones can be added without waiting for an update.",
    ],
  },
  {
    d: "2026-11-24",
    t: "Your character, Kids mode and Next Steps",
    l: [
      "After setup you meet your character: strengths, weak spots and your money element, in plain numbers.",
      "Next Steps opens on Today and This week.",
      "Kids mode: a separate profile for a kid, with 20 short daily lessons.",
      "A plan spreadsheet you edit can come back into the game.",
    ],
  },
  {
    d: "2026-11-25",
    t: "A page for coaches, and safer saving",
    l: [
      "If you work with a coach, they now have their own page with your shared game, their notes and your results over time.",
      "Sharing with your coach is on when you start. You can turn it off in Menu, then My account.",
      "The game keeps each change when you play on two devices. The later copy wins and nothing open is lost.",
    ],
  },
  {
    d: "2026-11-25",
    t: "FI destinations",
    l: [
      "Five places you can aim for: Lean, Barista, Regular, Chubby and Fat. Each one has its number and its date.",
      "Key numbers has a new one: your FI ratio.",
      "When you reach the point where your money can grow by itself, Home shows the card You can stop sprinting.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Recalculating",
    l: [
      "When real numbers move your plan, the game says Recalculating. It shows the new date and the one next turn.",
      "No blame, and no looking back unless you ask for it.",
      "If you do want to look back, the optional audit in the Menu shows what past choices cost in time. It stays off until you open it.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Coming soon cards",
    l: [
      "A part of the game that is not ready now shows one calm card, Coming soon, with a way back.",
      "The public site only gets a new version after every check passes, so it stays steady while we build.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Founding Testers, your own link, Report, and this page",
    l: [
      "The first 50 people who finish setup become Founding Testers, with a mark on Me and on the character sheet.",
      "Share SLAM, in the Menu, gives you your own link to send to a friend. It carries no money numbers. There are no rewards yet.",
      "The Report button, on every screen, tells Eli what is off or what you wish it did, in a few taps. Where you were goes with it.",
      "What's new, in the Menu, is this page. Each update adds a few lines here.",
    ],
  },
  {
    d: "2026-11-25",
    t: "A front door, and the question Am I okay?",
    l: [
      "A new person who opens the link sees one screen: one line, Start, What is this? and Sign in.",
      "Start needs no account and no typing. A few pages of taps end on a first answer to Am I okay?, said as a guess, with one next step.",
      "You can then keep that game by making a free account. Until you do, it stays on your device.",
      "Am I okay?, in the Menu, opens the same answer at any time. Each real number you add recalculates it.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Compare the ways to take money out",
    l: [
      "Taking money out has a new tab, Compare the ways. It runs your plan through each way side by side: a steady amount, a share of what is left, guardrails and more.",
      "Each row shows the first year by month and by year, how it held up in real past markets, the deepest cut, and what is left at the end, with its math.",
      "Sort by any column, or pin up to three ways to look at them together.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Export for Excel or Google Sheets",
    l: [
      "Export, in the Menu, downloads your whole plan as one spreadsheet file. The formulas stay live, so a change in the sheet moves the numbers under it.",
      "The first tab is the FIRE sheet: your inputs at the top, then one row for each year.",
      "You can bring an edited sheet back in. You see each change first and choose which ones to keep.",
      "Start from a blank FIRE sheet opens a simple sheet of your own in Google Sheets. It needs no SLAM account.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Privacy, in plain words",
    l: [
      "Privacy, in the Menu, says what is stored, where, and who can see it.",
      "Share with my coach now starts off for an account made from a public link. It starts on only when you arrive through a coach's invite. You can change it at any time in My account.",
      "Delete my account is on the Privacy page. It asks two times, then tells you exactly what was removed and what stays.",
      "The sign-up screen and the foot of each main screen say it: Education and tools, not financial advice.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Coast and the FI ratio, a little clearer",
    l: [
      "If your invested money dips under your Coast number after you reached it, Home shows one quiet line: Recalculating, how far under, and the new Coast date. Nothing to fix.",
      "The FI ratio in Key numbers has an i that says how it differs from While you slept.",
      "In the web app, the order of steps for a Lean, Barista or Fat goal now moves only the late steps. The first five never move.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Quizzes: eight new ways to see yourself with money",
    l: [
      "Quizzes, on Me and in the Menu, has eight short tap quizzes: a four-letter money code, your FI Address, the Four Money Houses and a money avatar.",
      "Also a character sheet with six stats, the Money Pyramid, the FI Pathway as a ski mountain, and a playful money sign.",
      "Each one ends on one card: what it found, its light side, and one next step in the skill tree.",
      "Each is a game lens, not a test. Your results stay with you unless you choose to show them on your character sheet.",
      "A result never changes your money element by itself: the card asks, keep or switch?",
    ],
  },
  {
    d: "2026-11-25",
    t: "Rent or buy, with the true cost of owning",
    l: [
      "The simulator Rent or buy now starts with the bank's payment, then shows what owning really costs each month: property tax, home insurance, PMI, HOA, maintenance and big repairs.",
      "It shows the year owning comes out ahead of renting, or says that renting is cheaper the whole time. The price-to-rent ratio and the 5% rule sit beside it.",
      "Costs that differ from home to home start empty. Tap your own number and it counts.",
      "The web page How much home fits has the same four answers, from the same math.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Your credit cards, one by one",
    l: [
      "What you owe now has Your credit cards: one line for each card, with its own balance and rate. Tap a card to open it.",
      "Add a card by taps: who issued it, whether you pay it off every month, the balance, and the rate. Exact rates like 6.66% work too.",
      "A 0% card waits until its 0% ends, and shows what to pay a month to clear it in time.",
      "Not ready to split? One total for all your cards still works. Each card you add sharpens it.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Your unpaid jobs, and the time you get back",
    l: [
      "Your character sheet and Me now show the six unpaid jobs of running your money, from CFO to Deals Manager.",
      "Your top 3 come from answers you already gave. No new questions.",
      "Tap a job to see its next step, its tasks, and about how long it takes you a month, in one tap.",
      "Each task has four ways out: Do it, Automate it, Hand it off, or Drop it. Each one can be undone.",
      "Home shows Running it next to Living it: the hours your money still takes, and the hours you got back.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Your money read: the money sins",
    l: [
      "The money sins quiz is open: fifteen taps on real money moments. It reads your main pull and your main way of dodging change, always as a top two, each with its light side.",
      "The quiz is only a first guess. Your logged buys, a one-tap \"what was this?\" on a buy over your line, and how you use the game firm it up. Until two agree, it says Early read.",
      "Push back with Is this really it?, or try one defense for a month with Test the fix. A game lens, not a diagnosis, and it stays with you unless you show it.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Career and education",
    l: [
      "Menu has Career and education: what a course or a degree costs with the time it takes, the raise after tax, when it pays back, and what it does to your freedom date.",
      "Start from a 4-year degree, trade school, a certificate or one skill. Each is a sample of the time it takes; the cost and the pay are yours to tap.",
      "Put trade school and a 4-year degree side by side, stack several credentials and see which ones overlap.",
      "Leaving a job early? See the dollars of your match that stay with the job, from your own schedule.",
      "The launch window: a job hop, Roth or traditional now, and a house hack, each as days on your freedom date.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Wire up a goal, and the health and insurance quests",
    l: [
      "Open a goal and tap Wire it up: where the money lives, how much a month, and the day it moves (payday first). Three taps.",
      "No account for it yet? Tap I need one to see some kinds side by side. Nothing is picked for you.",
      "Then the goal says Set once. Check in: quarterly. You set the transfer at your bank, and SLAM reminds you to check in.",
      "New quests for the Health Care Admin and the Insurance Coordinator: open enrollment, HSA receipts, the FSA deadline, the EOB after a visit, renewal dates, and a yearly cover check.",
      "Tap your own dates once. A reminder lands on Today before each one.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Your money read gets a name",
    l: [
      "After the money sins quiz your read gets a name, like The Someday Koala, with the light side and the virtue of each part.",
      "Each read also gets one move for this month. A share card carries the name and plain words, never a number.",
      "Once your read has a label, Home, the month check and the crash drill add one line that fits you.",
      "Two people who both turn on sharing get a money date to tap through. A gentle retake comes each quarter.",
      ],
    },
    {
      d: "2026-11-25",
    t: "Who carries what",
    l: [
      "Share your six unpaid jobs with the people in your home. Tap one or more names onto each job.",
      "See the admin time of your home, who carries which part, and what that time is worth.",
      "Sharing costs fairly counts these hours in Labor counts. Find it in Your unpaid jobs.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Trips and the journey",
    l: [
      "Menu has Trips and the journey: add up a trip line by line, with flights, lodging, food a day, your card's fee on other currencies, visa fees and travel insurance.",
      "Points or cash: see the cents a point a redemption gets next to what a point is worth to you, and take the points off the trip in one tap.",
      "Going with others? Split the trip by share or by item, in one currency, and see each person's part.",
      "The FIRE journey map: digging out, the first thousand saved, debt free, a hundred thousand, Coast and FI, where you are, and how the trip moves you, in days on your freedom date.",
      "The web page What does this trip really cost? has all of it too.",
    ],
  },
  {
    d: "2026-11-25",
    t: "A new theme: The Rings",
    l: [
      "Pick The Rings under Theme: seven rings, one ruler for each money sin, and you are the one escaping.",
      "The ruler of your main pull is your boss in the boss fights. It gets roasted, you never do.",
      "Check-ins read as the fine print, defenses as wards and Recalculating as the escape route. The plain word always sits next to it.",
      "A month of a ward that works, or a retake that shows your pull getting quieter, climbs you up a ring. Tap Leave the Rings any time.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Eighteen quick calculators",
    l: [
      "New small pages, each one question: a high-yield savings account, all at once or a little each month, starting at 22 or 32, what waiting costs, and your month at a glance.",
      "Debt consolidation with the fee in, the W-4 line to change, unemployment and how long your money lasts (New York first), and leaving a job or starting a business.",
      "A first apartment, splitting the rent by room size or income, a child year by year, a pet, your own inflation rate, cost per use, worth it, the hassle, and a warranty.",
      "In the game, Quick math has six of them as cards.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Working for yourself",
    l: [
      "The least you can charge: your floor an hour, a day and a job, with taxes, health cover, retirement, costs, downtime and weeks off in.",
      "The tax in each payment: the share to set aside, stacked on any job's pay, and what is spoken for so far.",
      "Solo 401(k), SEP or IRA: what each one holds on your profit, and which to open first.",
      "Do my apps add up: each app's earnings, tips and fee next to what reached the bank, with cash tips on top.",
      "Who still owes me: invoices with a calm next step. Profit First, with the book's sample or your own shares. In the game: Working for yourself > More, and the floor counts weeks off.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Lifestyle creep, the few lines, and your enough number",
    l: [
      "See each kind of spending this year next to last year, and next to your income. Lines that grow faster than prices get a small tag. Tap the rate of prices: the official CPI figure, or your own.",
      "When spending grows faster than income, one quiet card says Recalculating and shows the one line to hold.",
      "The few lines that make 80% of your spending, biggest first.",
      "Your enough number, with room for error on top, and about when you get there.",
      "Rough numbers: one switch shows a range in place of each exact amount, for a screen someone else can see. Your numbers stay as they are.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Hard moments",
    l: [
      "Eight calm tools: untangling after a breakup, a roommate moving out, the first 90 days after a death, when a partner has died, medical bills, saying no to lending, and a fire, flood or eviction.",
      "Each has steps by when they are due, words to copy with your own numbers, and who can help, checked on Nov 25, 2026 on each organization's own page.",
      "A money plan kept private, for when someone controls the money: hotlines, quiet steps, and Leave this page, which goes to a weather site at once (or press Shift three times).",
      "Nothing is kept unless you turn on Keep this. Kept, it stays yours: a coach sees it only if you let them.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Frameworks, and your next dollar",
    l: [
      "Home starts with one line: where your next dollar goes, with the match at work included.",
      "Famous money ideas has eight more: SWAN, Second Mouse, Trust, the Advice translator, the Baby Steps, the wealth stages, Die With Zero, and when your net worth should peak.",
      "Menu has Your Money or Your Life: the book's nine steps in order, as one path, each on your numbers.",
      "Menu has Quick wins: small fixes to tick, and what each saved adds up.",
      "On the web: five small pages (sleep-at-night cash, trust this advice, the net worth peak, 0% tax, every dollar earned), and the Baby Steps and the Advice translator on the FOO.",
    ],
  },
];
/* The web app reads this file as a module (js/ui/whatsnew-ui.js). A module keeps its names to itself, thus
   the list is also put on the global object. */
if (typeof globalThis !== "undefined") globalThis.PATCH_NOTES = PATCH_NOTES;
