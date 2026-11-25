// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the Four Money Houses. All names and words are SLAM's own, written for this quiz.
//
// HOW IT MAPS TO THE FIVE ELEMENTS (each point of a house counts as below; the highest total is the lean):
//   Hearthstone (keeps the floor safe)       -> Earth 1
//   Farsight    (plans and compares)         -> Air 1
//   Quickfire   (pushes for sooner)          -> Fire 1
//   Openhand    (money is for people)        -> Spirit 0.6, Water 0.4
// ON THE CHARACTER SHEET: one line, "Money house", with the house.
const o = (id, label, add) => ({ id, label, add });
export const HOUSES = {
  id: 'houses', name: 'The Four Money Houses', blurb: 'Nine taps. Find the house your money habits would join.',
  note: 'A game lens, not a test and not a diagnosis. Every house has its own good and its own blind side.',
  intro: ['Nine everyday money moments. Tap the answer closest to you.', 'You end in one of four houses, with a second one close by.'],
  scoring: 'sum',
  traits: [{ id: 'hearth', name: 'Hearthstone' }, { id: 'farsight', name: 'Farsight' }, { id: 'quickfire', name: 'Quickfire' }, { id: 'openhand', name: 'Openhand' }],
  questions: [
    { id: 'h1', ask: 'Extra money lands in your account. Your first thought?', options: [
      o('a', 'Good. The cushion just got thicker.', { hearth: 2 }), o('b', 'Where does this do the most over ten years?', { farsight: 2 }),
      o('c', 'This gets me there sooner.', { quickfire: 2 }), o('d', 'Who can I share some of this with?', { openhand: 2 })] },
    { id: 'h2', ask: 'A friend asks how you choose a big purchase.', options: [
      o('a', 'I wait until it cannot hurt the savings.', { hearth: 2 }), o('b', 'I compare three options in a table.', { farsight: 2 }),
      o('c', 'I decide fast and move on.', { quickfire: 2 }), o('d', 'I ask the people who will use it with me.', { openhand: 2 })] },
    { id: 'h3', ask: 'Which sentence would you put on your wall?', options: [
      o('a', 'Sleep well first.', { hearth: 2 }), o('b', 'Know the map before the trip.', { farsight: 2 }),
      o('c', 'Sooner beats perfect.', { quickfire: 2 }), o('d', 'Money is for the people at the table.', { openhand: 2 })] },
    { id: 'h4', ask: 'A month goes sideways. What do you reach for?', options: [
      o('a', 'The cash I kept for this.', { hearth: 2 }), o('b', 'The numbers, to see what really changed.', { farsight: 2 }),
      o('c', 'A way to earn more this month.', { quickfire: 2 }), o('d', 'The phone, to talk it through with someone.', { openhand: 2 })] },
    { id: 'h5', ask: 'What feels most like winning?', options: [
      o('a', 'A year with no money surprises.', { hearth: 2 }), o('b', 'A plan that held when I checked it.', { farsight: 2 }),
      o('c', 'A goal reached early.', { quickfire: 2 }), o('d', 'Being able to help when someone needed it.', { openhand: 2 })] },
    { id: 'h6', ask: 'Your free Saturday hour for money goes to:', options: [
      o('a', 'Checking every bill is covered.', { hearth: 2 }), o('b', 'Reading about how something works.', { farsight: 2 }),
      o('c', 'Starting the next thing.', { quickfire: 2 }), o('d', 'A money talk with my person or a friend.', { openhand: 2 })] },
    { id: 'h7', ask: 'Which one costs you the most effort?', options: [
      o('a', 'Spending on fun without a twinge.', { hearth: 1, farsight: 1 }), o('b', 'Acting before I know everything.', { farsight: 2 }),
      o('c', 'Waiting.', { quickfire: 2 }), o('d', 'Saying no to someone I love.', { openhand: 2 }), o('e', 'Taking a risk with money that is safe now.', { hearth: 2 })] },
    { id: 'h8', ask: 'A raise arrives. Where does most of it go?', options: [
      o('a', 'Savings, before I see it.', { hearth: 2 }), o('b', 'Into the plan, by the percentages I set.', { farsight: 2 }),
      o('c', 'Toward the debt or the goal with a date.', { quickfire: 2 }), o('d', 'Some to my people, some to giving.', { openhand: 2 })] },
    { id: 'h9', ask: 'What do you want money to say about you?', options: [
      o('a', 'They were always ready.', { hearth: 2 }), o('b', 'They knew what they were doing.', { farsight: 2 }),
      o('c', 'They did not wait around.', { quickfire: 2 }), o('d', 'They were generous.', { openhand: 2 })] },
  ],
  cards: {
    hearth: { title: 'House Hearthstone', lines: ['You keep the floor safe before anything else.', 'A cushion is not a number to you. It is a quiet house.'],
      light: 'People around you feel steadier because you are ready.', next: { label: 'Fund the job-loss fund', skill: 'cash-safety-net-fund-the-true-emergency-fund' },
      skills: ['money-psychology-unlock-the-spending-muscle'], readings: ['frugal-is-freedom'] },
    farsight: { title: 'House Farsight', lines: ['You want to see the whole map before you move.', 'Comparing is how you relax.'],
      light: 'You catch what others skip, and your plans hold.', next: { label: 'Write your allocation on one page', skill: 'portfolio-design-write-your-allocation' },
      skills: ['money-psychology-fast-from-optimizing-for-30-days'], readings: ['max-the-401k-first'] },
    quickfire: { title: 'House Quickfire', lines: ['You would rather start today and steer on the way.', 'A date on a goal wakes you up.'],
      light: 'Your energy gets things moving that others only talk about.', next: { label: 'Send each raise to savings first', skill: 'money-psychology-route-raises-past-identity' },
      skills: ['cash-safety-net-build-the-1k-shield'], readings: ['invest-every-spare-dollar'] },
    openhand: { title: 'House Openhand', lines: ['For you, money is about the people at the table.', 'You notice who needs something before they ask.'],
      light: 'Your generosity builds the kind of safety money alone cannot buy.', next: { label: 'Hold a money date', skill: 'family-generational-wealth-hold-the-money-date' },
      skills: ['social-capital-give-first-systematically'], readings: ['give-when-rich'] },
  },
  core: {
    elements: { hearth: { Earth: 1 }, farsight: { Air: 1 }, quickfire: { Fire: 1 }, openhand: { Spirit: 0.6, Water: 0.4 } },
    sheet: 'Money house', how: 'Hearthstone leans to Earth, Farsight to Air, Quickfire to Fire, and Openhand mostly to Spirit with some Water.',
  },
};
