/* ============================================================================
   SLAM the Game: data/askwords.js
   PURPOSE     The words of "one small question at a time": for each money area, the question, what it
               means, why the game asks, and where to look (ASK); and the plain first question for an
               area that can be empty (ASK_NONE). The order of the keys of ASK is the order of the
               file. The order in which the game asks is sharpList() in core/engine.js.
   INPUT       None. Values only.
   OUTPUT      ASK, ASK_NONE.
   DEPENDS ON  Nothing.
   USED BY     features/ask.js (the screens of the questions). account/livescreen.js (session.html):
               the card "Next question to ask" of Live Session Mode says the same words out loud.
   RULES       One list of questions for the game and for a live session. Change a question here, and
               both change. These two lists moved here from features/ask.js on Nov 25 2026, word for
               word.
   ========================================================================= */
const ASK = {
  take: {
    rows: "incs",
    p: "n",
    rk: "take",
    q: x => "How much money do you get from this in one month?",
    what: "Count what lands in your bank. That is after taxes come out.",
    why: "So the game knows how much money you have to work with each month.",
    find: "Open your bank app. Find the deposits from this last month. Add them up.",
  },
  spend: {
    rows: "spends",
    p: "s",
    rk: "cat",
    q: x => "How much do you spend on this in one month?",
    what: null,
    why: "So the game can show where your money goes, and how much is left over.",
    find: "Open your bank app. Look at last month. A close number is fine.",
  },
  cash: {
    rows: "cashes",
    p: "c",
    rk: "cash",
    q: x => "How much money is in this right now?",
    what: "Only money you could use this week.",
    why: "This is the money that keeps you safe when something goes wrong.",
    find: "Open your bank app. Look at the balance.",
  },
  inv: {
    rows: "invs",
    p: "v",
    rk: "inv",
    q: x => "How much is this worth today?",
    what: "Investing means money you put away to grow for later.",
    why: "So the game can show how close you are to not needing a paycheck.",
    find: "Open this account's app. Look for Total value or Balance.",
  },
  debt: {
    rows: "debts",
    p: "d",
    rk: "debt",
    q: x => "How much do you still owe on this?",
    what: "The whole amount left to pay back. Not the monthly payment.",
    why: "So the game can show which debt costs you the most, and which one to pay first.",
    find: "Open the lender's app or your last bill. Look for Current balance.",
  },
};
const ASK_NONE = {
  debt: {
    q: "Do you owe money to anyone right now?",
    like: [
      "A credit card you did not pay all the way off",
      "A car loan or a student loan",
      "A medical bill",
      "Money a friend or family member lent you",
      "Something you bought on a pay-later plan",
    ],
    no: "No, I owe nothing",
    yes: "Yes, I owe something",
    done: "You owe nothing. That is a real answer, and it counts.",
    why: "Debt changes what to do first. If you have none, the game skips all of those steps.",
    look: [
      "Your wallet: any credit card with a balance on it",
      "Your email: search for the words payment due",
      "Your bank app: any payment that repeats every month to a lender",
    ],
  },
  inv: {
    q: "Do you have any money invested?",
    like: ["A retirement plan at work, like a 401(k)", "An IRA or a Roth IRA", "Stocks or funds in an app", "Crypto"],
    no: "No, nothing yet",
    yes: "Yes, I have some",
    done: "Nothing invested yet. That is a real answer, and it counts.",
    why: "Invested money grows on its own. The game needs to know if that has started yet.",
    look: [
      "Your pay stub: a line that says 401(k) or retirement",
      "Your email: search for the words account statement",
      "Your phone: any investing app",
    ],
  },
};
