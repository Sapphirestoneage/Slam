/* ============================================================================
   SLAM the Game: data/patchnotes.js
   PURPOSE     The patch notes: what changed, in plain words, for the person who plays. The game shows
               them in the Menu as "What's new" (features/founding.js), the newest first. The web app
               shows the same list in its More menu (js/ui/whatsnew-ui.js).
   INPUT       None. Data only.
   OUTPUT      PATCH_NOTES: a list of entries. d is the date (YYYY-MM-DD). t is the title. l is a few
               short lines. ao: true marks an entry about an add-on: the game does not show it (add-ons
               are off for standard players).
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
  {
    d: "2026-11-25",
    t: "Student loans: PSLF, refinancing and each year's rate",
    l: [
      "Student loan plans now shows your household size, and you can tap the size on your loan papers.",
      "A PSLF card: the payments counted, the payments and years left, and what is forgiven, tax-free.",
      "Tap a rate a private lender offers you and see it next to the federal plans, with what you give up in plain words.",
      "On the web page Which student loan plan costs least?, the stepladder: each school year's loan at its own rate, and the interest it gathers before your first payment.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Family money",
    l: [
      "Menu has Family money: what goes to your parents and your kids at the same time, next to your freedom date and your first goal.",
      "Living at home: the rent you save each month, and when it reaches your moving-out goal.",
      "Kids and tuition: childcare (New York from a dated state source), school or yeshiva tuition, what to put away a month, and the New York 529 rules.",
      "Yeshiva tuition is a goal type of its own. Make it a goal from Kids and tuition in one tap.",
      "On the web: three small pages on the same math, on the shelf Family money.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Six more quizzes, and a daily lesson for you",
    l: [
      "New under Me, Quizzes: Money Scripts, the Enneagram on your own, the FIRE Community Quiz with your flavor and three spectrums, a picture quiz for fun, and Money Trait Percents.",
      "Quantum Collapse: a few taps, the plans still possible shrinking with each one, and the one first move that matters.",
      "After the daily question you get a skill and a short read that fit your latest quiz.",
      "Daily lessons in the menu: one short lesson a day for you, like Kids mode, with the lessons that fit your quiz first.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Moves to try: one question for every move",
    l: [
      "Each question about you is asked once. Your credit score band answers every move that needs a score, and the card vault reads the same answer.",
      "Next Steps and the Moves library ask one question first: the one that sorts the most moves.",
      "The library shows what would open the most: for example, a score of 670 or more, and the moves it opens.",
      "Each of those has How to get there, and one button puts the steps on Next Steps.",
      "Setup answers some checks for you: if you live on your own, no one else has to agree, and the roommate move knows where you live.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Ratios on Key numbers",
    l: [
      "Key numbers now ends with Ratios: about twenty of them in groups, one line each, closed until you open a group.",
      "Each line says what it means in one sentence, how sure it is (Guess, Close or Exact) and, under Show the math, its formula.",
      "A ratio that is missing a number says which one. It never shows a 0 in its place.",
      "Financial confidence: rate how sure you feel with one tap, and see it next to what your numbers say.",
      "In the web app the same ratios are on Report, Overview, under Ratios.",
    ],
  },
  {
    d: "2026-11-26",
    ao: true,
    t: "LGBTQ+ money tools, private by default",
    l: [
      "What care would cost you after your plan pays, and a check of what a health plan covers.",
      "A name and gender marker change step by step, New York first, each fee from the office's own page.",
      "Two jobs side by side with benefits in dollars, an emergency fund for a longer job search, and a runway without family help.",
      "What each side costs you, in your own numbers. Growing your family, care later in life, and a chosen-family summary for a lawyer.",
      "Nothing on these pages is kept unless you turn on Keep this. The tab shows a plain title, and Leave this page opens a weather page.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Quest mode",
    l: [
      "Menu has Quest mode (also on your character sheet): health, armor and six stats, each from your own numbers with its math.",
      "How much you can take on right now, the weak spots of your plan, and the three moves that stop them.",
      "Hidden costs your life charges you, and where you think you rank next to where you are.",
      "Opponents that test your values, a judge that keeps a record you can challenge, and questions answered from your plan.",
      "Path packs through the skills, and graduating: pick your finish line and read your story so far.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Results first: see where you stand",
    l: [
      "Setup now ends on Here's where you stand: your lead number and five result cards, each with its target and the time to get there.",
      "The five: debt-to-income, months of cushion, savings rate, net worth and FI progress.",
      "Below zero, the lead number is your debt-free date. Building toward FI, it is your FI date.",
      "Home is four cards: your next win, net worth by the end of this month, where you are on the route, and your numbers.",
      "A Home button sits at the top of every screen, next to Back. The money calendar is in the Menu.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Daily challenges, the bonus hunt, guilds and App lock",
    l: [
      "After the daily question: a daily challenge. One surprise cost at your level, sized in days of your own spending, and three ways to meet it. Practice only.",
      "The first thousand-dollar bonus hunt: a bank bonus calculator (the bonus less its tax, the savings interest given up, the fees). And the credit score game, with no real score fetched.",
      "Roots and branches, proof you can keep on a done step, a book for each step from the library, and a second voice to blend into your theme.",
      "Your guild: a private group of the people in your game, with mentors who finished a track and a monthly money date. Nothing shows until each person turns it on.",
      "App lock: a PIN or your device's own lock each time the game opens. On this device only.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Money exercises",
    l: [
      "Ten short pieces of writing about you and money, in one place: a letter to money, your earliest money memory, your money autobiography and more.",
      "Each one opens with a short prompt and a few lines to tap, so you never start from an empty page. Type, or speak where your browser can turn speech into words.",
      "Three prompts for life after work: a Why journal, Little p purpose and who you are after work. Ready for retirement, apart from the money opens them.",
      "Your words are yours: Me only, unless you share one with your coach. The letter from your calm self is the first card.",
      "In the Menu, under Money exercises. In the web app: About you, then Open the exercises.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Joy and enough",
    l: [
      "Menu has Joy and enough: tap how much joy each spending line brings you, and see joy per dollar and joy per hour of work.",
      "Place each line on the fulfillment curve (survival, comforts, luxuries, past enough) and read your Enough meter.",
      "A rich-life list: the things you want, with a price and a joy, the memory dividends of an experience, and a regret view.",
      "Every subscription shows the days it adds to the day work becomes optional.",
      "In the web app the same tools are on the Budget (Joy per dollar, Subscriptions in days) and on Goals.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Receipts and your life map",
    l: [
      "Each move you finish and each amount you log now shows what moved: net worth, the days closer to FI or debt-free, any number that changed.",
      "Right under it: how close you are to the next unlock, and the next thing to do, one tap away.",
      "When a date moves later, it says Recalculating route and shows the new date.",
      "Your life map: the eras from age 15 to FI. You start at your own age, with starting bonuses from the answers you gave.",
      "Tap any era for what it is, why it matters, the money and time it takes, and a Go do it button.",
    ],
  },
  {
    d: "2026-11-26",
    t: "You and people like you",
    l: [
      "Menu, My money: your net worth, savings rate and household pay next to published numbers for people your age.",
      "Your next milestone on the journey, and plain lines on what is common at your age, like how many could cover a surprise bill.",
      "Each number names its source and its date. Private: nothing leaves this device, and a coach sees it only if you let them.",
      "Quest mode's Where you rank reads the same numbers and links here. The web app has the same page.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Benefits and health",
    l: [
      "Menu has Benefits and health: what your HSA, dependent care FSA, ESPP and commuter benefit are worth to you in dollars a year.",
      "Tap your employer from a short list of large employers to fill its 401(k) match, vesting and ESPP discount, each with where it comes from.",
      "See the coverage you may qualify for at your income (Medicaid, the Essential Plan in New York, the marketplace credit) and what a raise does to it.",
      "Put two or three health plans side by side: premiums after the credit, and a light, typical and heavy year.",
      "In the web app the same tools are on About you, under Benefits at work and Health coverage and plans.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Estate and marriage",
    l: [
      "Menu has Estate and marriage: your estate papers, what your people would receive, and married or partners.",
      "What your people receive: who gets what, the gain the step-up in basis wipes out, and the 10 years of an inherited IRA, with the tax three ways.",
      "Married or partners?: two single returns or one joint one, the tax on partner health cover, the Social Security spousal and survivor benefits, and what changes in New York.",
      "In the web app the summary for a lawyer now lists who is named on each account. Nothing is kept unless you turn it on. Bring it all to a lawyer.",
      ],
    },
    {
      d: "2026-11-26",
    t: "Taxes when you work for yourself",
    l: [
      "Working for yourself, Taxes first: the safe harbor, the least to send in estimates so no underpayment penalty applies, a quarter at each date, and what is still to send by the next one.",
      "My floor: tap what an app or a gig pays an hour and see it next to your floor, with the hours a month each takes.",
      "Retirement odds and Ratios: the share of today's pay Social Security would replace.",
      "In the web app: the Tax command center, the floor next to a gig's pay, and when each app pays out, with the money still on its way.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Households together",
    l: [
      "Menu has Households together, for a couple, a polycule, housemates or a chosen family, by your own names.",
      "Same question: everyone answers the same money questions, on one phone or each on their own. Where you differ, it becomes a talk point, never a score.",
      "FI together: each person's FI number and date side by side, with the gap.",
      "A shared home: what each person put in and their part of the equity, and the tax gap for each pair when only two of you can marry.",
      "Share by email: pick what each person sees. The draft opens in your own mail app; SLAM sends nothing. The web app's one-pager has Share by email too.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Your investments, all together",
    l: [
      "Investment mix and fees now adds up every account: your stock share next to your own target or the age guide, and how far it has drifted.",
      "A three-fund check sits next to it: how much is in US stocks, international stocks and bonds, and what sits outside them. A comparison, not advice.",
      "One company: your employer's stock and any single company, as a share of all you invest.",
      "Every fund and fee: add funds one by one with their own fee and any sales charge, plus account and advisor fees, all in dollars a year.",
      "Two new tools: Invest or pay debt (one grid, your own debts marked) and Roth or traditional, by account. The web app has the same page.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Safety nets",
    l: [
      "Break in case of emergency, on My Goals, now has four more life changes next to the layoff: medical leave, a move, a breakup and a new baby.",
      "Each one shows how long your cash lasts, the lowest point, three tripwires where you decide now what you would do, and a Plan B.",
      "The layoff's Dip tab shows how long you last at each level of spending, from full life down to food and housing only, with the Rule of 5 beside it.",
      "In the web app the same changes are on If the pay stopped, and your plan gets a calm note when it counts on a tax rule with an end date.",
      "With Game words on, How long would my money last? has a zombie mode.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Giving",
    l: [
      "Menu has Giving: what you give as a share of the pay you pick (gross, take-home, or after the costs of earning it), and what your share comes to. Maaser is commonly 10%; the share is your own tap.",
      "One gift, in time: the hours of work it is, the days it moves the day work becomes optional, and what it could have grown to.",
      "Bunching: give two or three years' worth in one year and see the federal tax each way, on the 2026 rules.",
      "Envelopes inside one account you already have, like maaser and fun money, each a bar that fills and empties.",
      "A running maaser count, where giving ahead counts toward later months if that is your rule. The web app has the same page.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Session summary, plan report and FIRE",
    l: [
      "The statement import now knows a Rocket Money export: its own categories sort your spending, and card payments and transfers stay out.",
      "In the web app, the one-pager drafts a session summary: the top takeaways from what changed and the next steps, to edit before it goes out.",
      "Plan report, from the one-pager: the one-pager, your next steps, your statements and your order of operations as one printout or PDF.",
      "Plan, FIRE: every way to financial independence (Lean, Coast, Barista, FIRE, Chubby and Fat) with its number and date, a tap for a faster pace, and each type in plain words.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Testing and the math checked twice",
    l: [
      "Testers can run a think-aloud test on their own: a panel at the bottom of every screen shows one task at a time, counts the taps, and keeps Report this open with the screen name filled in.",
      "Every core number of the game (your FI number, Coast FI, the debt plan, what an hour is worth, the cash calendar, the month work becomes optional) is now worked out a second time by a separate engine.",
      "Fixed: money in the game now grows 7% a year month by month too, the same pace as a whole year. Before, the month-by-month dates grew a little faster.",
      "Fixed: a debt has one rate everywhere. The rate you typed, or the middle of the band you tapped, counts the same in the debt plan, the heavy-debt card and what your money does while you sleep.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Fewer questions",
    l: [
      "Every guess now shows what not knowing it could move your money a year from now, in dollars.",
      "Setup asks the spending that matters most first. When the rest would move your plan only a little, it says so and you can stop there with one tap.",
      "Make your numbers real asks the biggest blanks first and offers to stop when the rest move little. Close numbers sorts the same way.",
      "Here's where you stand ranks what your date depends on by dollars, and says how many taps your setup took.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Game feel",
    l: [
      "Start at the finish line, in the Menu and on the life map: say what you need once work is optional and by when, and the game works back to today.",
      "What's in the way: eight quick checks and your numbers find the bottleneck (money, time, energy, skill, knowledge, people, fear or rules). Is this really it? lets you push back.",
      "Your rival race now has past you, from your own saved check-ins, and a typical path on the country's saving rate. Never a real person.",
      "What if, People starts with made-up stories of people who got past each kind of bottleneck, labeled as made up.",
      "When an answer moves a number, the top of the sheet shows what moved. Receipt lines have a bar that moves from before to after, and Replay plays it again.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Eight famous money ideas, finished",
    l: [
      "Famous money ideas has F-You money: the months you could walk away from a job, with what stops with the job and what health cover would cost. The web app's How long would my money last has it too.",
      "The noodle budget: keep or set aside each line for the bare-bones month, and see how long your cash lasts on it.",
      "Pay yourself first, a paycheck at a time. Shockingly Simple Math: your savings rate, starting from nothing, as years until work is optional, and the next 5% step.",
      "What an hour of your time is worth, next to what the help costs an hour, to decide what to hand off. And which of the Money Guy's nine steps you are on.",
      "Your Money or Your Life: step 1b shows your balance sheet, and step 3 shows each month you log in hours of your life.",
    ],
  },
  {
    d: "2026-11-26",
    t: "Your goal, and how to get there faster",
    l: [
      "Your next win on Home now shows two things: your goal now, the step you are on, and under it the one move that gets you there faster.",
      "Tap the goal to see the whole order. The one button still starts the move.",
      "A new quick calculator, Cut it, or invest it: what a cost you cut keeps, next to what the same money grows to when you invest it. Cutting is about a third of investing.",
      "It is on the web app's shelf of quick calculators and in the game under Menu, Quick math. The exact figures are under Show the math.",
    ],
  },
  {
    d: "2026-11-27",
    t: "FIRE statuses on your path",
    l: [
      "Coast, Lean, Barista, FI, Chubby and Fat are now statuses you pass on the way, not goals. Everyone has one order of steps.",
      "Each status shows as a marker with its number and its date: on the FOO page of the web app, on your life map and on the journey map.",
      "When you reach one, a calm card on Home says what changed and lists a few options it opens. Your next step stays the same.",
      "If your balance dips back under a status, one quiet Recalculating line shows the new date.",
    ],
  },
  {
    d: "2026-11-27",
    t: "Your FI number in four taps",
    l: [
      "A new game now starts with four taps: your age, what you spend, what you have invested and what you save.",
      "Then one number: what it takes for work to be optional, and the age you get there at today's pace.",
      "A chart shows what pays for each year of your life: work, investments, Social Security. Switch a layer off and see what is not covered yet.",
      "The rest of setup is one tap away when you want your real picture. Menu: What it is / What it could be.",
    ],
  },
  {
    d: "2026-11-27",
    t: "Two ways to shrink your FI number",
    l: [
      "After the chart, two short screens show what your number could be. Each has Count this, Already doing it and Not for me.",
      "Spending eases as you age: most people spend less in their late 70s and 80s. Count it and see the dollars off your number.",
      "Social Security: count all of it, part of it or none of it. The estimate is marked Guess.",
      "The last screen has both numbers and the chart. If a year is not covered yet, it says why and what to tap.",
      "On the chart your investments grow 7% a year the whole way, and you take 4%. The rest is a cushion for years the market goes down.",
    ],
  },
  {
    d: "2026-11-27",
    t: "Every way to shrink your number, on one list",
    l: [
      "After the chart comes All the ways: every way to shrink your number, the biggest for you first. New: pay less tax on the way out, bend your spending when markets fall, money that shows up later.",
      "Yes, but: pick one thing to cut and one thing to keep, and see the price of each in months.",
      "The reveal puts both numbers side by side with the time between them. Share my card makes a picture with ages and names, no dollars.",
      "Home now starts with Your two numbers. On a later day it says what changed since last time.",
      "In your first week the bar has four places: Home, Next Steps, My Money and My number. Everything else is in the menu, with a new Tool library, and the other tabs come back after.",
    ],
  },
  {
    d: "2026-11-27",
    t: "A new start: what you want comes first",
    l: [
      "A new game starts with What you want: tap all that fit. Your picks show as tags, and later screens say when they ask because of one.",
      "Not sure about a number? Tap No idea, use typical. It fills a typical value for your age as a Guess, and Make it mine changes it.",
      "From the first way on, both numbers sit in one slim strip at the top, and the last screen shows your first move with Add to my steps.",
      "Finish setup starts with About you, all taps: work, home, your people. Your age is already filled. Then debts, what you have, income, taxes, spending.",
      "Create account is shorter, the password box has Show and Hide, and if your email needs confirming you keep playing: Home has Send again.",
    ],
  },
  {
    d: "2026-11-27",
    t: "One result, a calmer Home, and plainer questions",
    l: [
      "The opening and Find your era end on one screen: your era, why, your first move, and one button, Start my first move. Your answers come with you.",
      "Home starts with four numbers and one next step. A number that just changed moves for a moment.",
      "Every question is in plainer words and has I'm not sure. It counts as a Guess, and you can make it yours later.",
      "Tap your name: the sheet now only switches people. Our household, Sharing costs fairly and Kids mode are on Me, under Your people.",
      "Arrows are drawn as icons now, and Where am I is lit only when it is your next step.",
    ],
  },
  {
    d: "2026-11-27",
    t: "An opening that is easier to follow",
    l: [
      "On each screen of the opening one button pulses: your next tap. The screens are slimmer, and the extra parts open with one tap.",
      "Back and Forward are on every screen, and a screen keeps its place after a tap. It does not jump to the top.",
      "Everything has an i with two lines: what it is, and what it is for. Tap outside an open i to close it.",
      "No more counts that start at zero. A line shows how many taps are left, and each question says why it asks.",
      "The reveal shows your two numbers first and biggest, then the chart, your top 3 moves, and Keep it, share it, or tell Eli. Anything you count says how to undo it.",
    ],
  },
  {
    d: "2026-11-28",
    t: "A faster start, a shorter menu, and a monthly check",
    l: [
      "Start faster: four doors under Start (FIRE, In debt, Couple or household, Self-employed) and ten starting points with typical numbers you confirm.",
      "The menu starts short and grows as you use things. Show everything is one tap. Take the tour, in the menu, walks you around Home in about 90 seconds.",
      "New on Home: two taps, 1 to 10, once a month. How sure you feel about your money, and how much joy your spending brings. You see where you started and where you are now.",
      "Your year now has your money wins, your confidence and joy, and the time ledger. Your reveal has a card you can share or save as an image.",
      "Also new: Graduate, a page on when you need a CPA, an estate attorney or a fee-only planner. Bank and card bonus moves show early when you have no costly debt.",
    ],
  },
  {
    d: "2026-11-28",
    t: "Your life timeline",
    l: [
      "New in the menu, under Plans and what-ifs: Your life timeline. Your debt-free date, your cushion, your goals, your FIRE statuses, Social Security and more on one line, by age and year.",
      "Tap a milestone to see what it is, what it is for, and the math.",
      "Move the age you chose by a year to try a what-if. The other dates recalculate. Your plan changes only when you tap Keep it, and Undo puts it back.",
      "Add your own milestones by taps: a baby, a home, a career break, a big spend. One counts in a what-if after you give its simulator your own number.",
    ],
  },
];
/* The web app reads this file as a module (js/ui/whatsnew-ui.js). A module keeps its names to itself, thus
   the list is also put on the global object. */
if (typeof globalThis !== "undefined") globalThis.PATCH_NOTES = PATCH_NOTES;
