// SPDX-License-Identifier: AGPL-3.0-only
// Skin: Money Scripts. The four script names (money avoidance, money worship, money status, money vigilance) come from
// the research of Brad Klontz and colleagues (the Klontz Money Script Inventory, Journal of Financial Therapy, 2011).
// The questions, the answers and every word of the cards are SLAM's own, written for this quiz. A game lens, never a
// diagnosis: the card names a belief that speaks loudly, with its light side.
//
// HOW IT MAPS TO THE FIVE ELEMENTS (each point of a script counts as below; the highest total is the lean):
//   Money avoidance  (money kept at arm's length)      -> Water 1
//   Money worship    (more money would fix it)          -> Fire 1
//   Money status     (money as a score of how far)      -> Air 1
//   Money vigilance  (watchful, a cushion first)        -> Earth 1
// ON THE CHARACTER SHEET: one line, "Money script", with the script.
// ON THE CARD: a percent for each script (qzBars), since most people carry some of all four.
const o = (id, label, add) => ({ id, label, add });
const q = (id, ask, a, w, s, v) => ({ id, ask, options: [o('a', a, { avoid: 2 }), o('w', w, { worship: 2 }), o('s', s, { status: 2 }), o('v', v, { vigil: 2 })] });
export const SCRIPTS = {
  id: 'scripts', name: 'Money Scripts', blurb: 'Twelve taps. Which of four money beliefs speaks loudest in you.',
  note: 'A game lens, not a test and not a diagnosis. The four script names come from the research of Brad Klontz and colleagues (2011); these questions and words are SLAM\'s own.',
  intro: ['Twelve everyday money moments. Tap the answer closest to you, not the one you think is best.', 'You see all four scripts as percents, and the one that speaks loudest gets the card.'],
  scoring: 'sum', bars: true,
  traits: [{ id: 'avoid', name: 'Money avoidance' }, { id: 'worship', name: 'Money worship' }, { id: 'status', name: 'Money status' }, { id: 'vigil', name: 'Money vigilance' }],
  questions: [
    q('m1', 'A bank statement arrives. What happens next?', 'It sits unopened for a while.', 'I check how close I am to having enough to be free.', 'I compare it with where I hoped to be by now.', 'I read every line the same day.'),
    q('m2', 'Which sentence feels most true?', 'People with a lot of money often got it by stepping on someone.', 'A bit more money would sort out most of my problems.', 'What you earn says a lot about how far you have come.', 'You never know when the money will be needed.'),
    q('m3', 'A friend asks what you earn.', 'I change the subject. Money talk feels off.', 'I tell them, and add that it never feels like enough.', 'I round it up a little.', 'I keep it to myself. That is private.'),
    q('m4', 'A surprise bonus lands.', 'I spend or give it fast, so it stops sitting there.', 'I picture what it could grow into.', 'Something people will notice: a nicer phone, dinner for everyone.', 'Straight to savings, and nobody hears about it.'),
    q('m5', 'You picture having a lot of money one day.', 'I am not sure I would like the person it turns me into.', 'Then I could finally relax.', 'People would see me differently.', 'I would still keep a close eye on every dollar.'),
    q('m6', 'Your strongest money habit:', 'Not looking until I have to.', 'Chasing the next raise or side income.', 'Buying the better version.', 'Saving first, then a little worry.'),
    q('m7', 'Which would sting the most?', 'Being seen as someone who cares a lot about money.', 'Staying at this income for good.', 'Looking like I am struggling.', 'Being caught without a cushion.'),
    q('m8', 'A money talk at home. Where are you?', 'Happy to let someone else handle it.', 'Talking about how much better life gets with more.', 'Thinking about how our life looks to others.', 'The one asking where it all went.'),
    q('m9', 'A friend gets a big raise.', 'Good for them. I would rather not think about mine.', 'I wonder how I could get one, and what it would fix.', 'I feel a pull to keep up.', 'I hope they put some of it aside.'),
    q('m10', 'What did your family teach you about money, without saying it?', 'That money was a touchy subject, best left alone.', 'That more of it would make life easier.', 'That how you looked mattered.', 'That you save for a rainy day and keep quiet about it.'),
    q('m11', 'Right after a big buy, you feel:', 'A little guilty, whatever it was.', 'A lift that fades sooner than I hoped.', 'Good when people notice it.', 'Uneasy until I see the savings are still there.'),
    q('m12', 'What would help you most this year?', 'Looking at my money with calm.', 'Knowing what enough is for me.', 'Spending on what I like, not on what shows.', 'Letting myself enjoy some of what I saved.'),
  ],
  cards: {
    avoid: { title: 'Money avoidance', lines: ['Money can feel like something good people keep at arm\'s length.', 'Looking away keeps the feeling quiet for a while, and the questions wait.'],
      light: 'You are rarely ruled by money, and you put people ahead of things.', next: { label: 'Look at your money for five minutes, no judging', skill: 'money-psychology-track-without-judging' },
      skills: ['money-psychology-name-your-money-scripts', 'money-psychology-make-money-discussable'], readings: ['save-a-thousand-first'] },
    worship: { title: 'Money worship', lines: ['Part of you believes more money would fix most things.', 'Each raise helps for a while, and then the finish line moves.'],
      light: 'You believe life can get better, and you work for it.', next: { label: 'Write down what enough looks like', skill: 'money-psychology-write-down-enough' },
      skills: ['money-psychology-renegotiate-enough-honestly', 'money-psychology-route-raises-past-identity'], readings: ['stay-until-the-number'] },
    status: { title: 'Money status', lines: ['Money can feel like a score of how far you have come.', 'What shows on the outside matters to you.'],
      light: 'You are driven, and you want your life to show the work you put in.', next: { label: 'Spend loudly on what you value, quietly on the rest', skill: 'money-psychology-spend-loudly-on-values' },
      skills: ['money-psychology-practice-comparison-hygiene', 'pre-retirement-design-detox-from-status'], readings: ['frugal-is-freedom'] },
    vigil: { title: 'Money vigilance', lines: ['You watch money closely and keep a cushion.', 'Spending can feel uneasy even when the plan says it is fine.'],
      light: 'You are the person who is ready when something breaks.', next: { label: 'Unlock some spending on purpose', skill: 'money-psychology-unlock-the-spending-muscle' },
      skills: ['money-psychology-close-the-security-gap', 'money-psychology-practice-deliberate-gratitude'], readings: ['die-with-zero', 'six-months-first'] },
  },
  core: {
    elements: { avoid: { Water: 1 }, worship: { Fire: 1 }, status: { Air: 1 }, vigil: { Earth: 1 } },
    sheet: 'Money script', how: 'Money avoidance leans to Water, money worship to Fire, money status to Air, and money vigilance to Earth.',
  },
};
