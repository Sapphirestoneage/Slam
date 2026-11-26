// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the Money Enneagram, solo. The nine numbered types are the Enneagram, a framework of personality shared by many
// teachers. The type names, the questions, the answers and every word of the cards are SLAM's own, written about money
// for this quiz. Solo: about you alone (a couple takes it one person at a time). A game lens, never a diagnosis.
//
// HOW IT MAPS TO THE FIVE ELEMENTS (each point of a type counts as below; the highest total is the lean):
//   One   (doing it right)          -> Earth 1
//   Two   (money for others)        -> Spirit 0.6, Water 0.4
//   Three (money as the scoreboard) -> Fire 1
//   Four  (money that means something) -> Water 1
//   Five  (knowing enough)          -> Air 1
//   Six   (ready for anything)      -> Earth 1
//   Seven (options open)            -> Fire 0.5, Air 0.5
//   Eight (in control)              -> Fire 0.5, Earth 0.5
//   Nine  (keep it calm)            -> Water 0.5, Spirit 0.5
// ON THE CHARACTER SHEET: one line, "Enneagram type", with the type.
// ON THE CARD: a percent for each type (qzBars), since a type is a lean, not a box.
const o = (id, label, t) => ({ id, label, add: { [t]: 2 } });
export const ENNEAGRAM = {
  id: 'enneagram', name: 'Money Enneagram (solo)', blurb: 'Twelve taps. Which of the nine Enneagram types your money habits lean to.',
  note: 'A game lens, not a test and not a diagnosis. The nine numbered types are the Enneagram, a framework many teachers use; the names, questions and words here are SLAM\'s own.',
  intro: ['Twelve money moments, about you alone. Tap the answer closest to you.', 'You see all nine types as percents. The one you lean to most gets the card, with the next one close by.'],
  scoring: 'sum', bars: true,
  traits: [
    { id: 't1', name: 'One: doing it right' }, { id: 't2', name: 'Two: money for others' }, { id: 't3', name: 'Three: money as the scoreboard' },
    { id: 't4', name: 'Four: money that means something' }, { id: 't5', name: 'Five: knowing enough' }, { id: 't6', name: 'Six: ready for anything' },
    { id: 't7', name: 'Seven: options open' }, { id: 't8', name: 'Eight: in control' }, { id: 't9', name: 'Nine: keep it calm' },
  ],
  questions: [
    { id: 'e1', ask: 'Payday. What do you do first?', options: [o('a', 'Pay every bill on time, in order.', 't1'), o('b', 'Think about who could use some help.', 't2'), o('c', 'Check how I am doing against my goal.', 't3'), o('d', 'Plan something fun for the weekend.', 't7'), o('e', 'Move some to the emergency fund.', 't6')] },
    { id: 'e2', ask: 'A money choice you are proud of:', options: [o('a', 'A buy that fit who I am, even though it cost more.', 't4'), o('b', 'Weeks of research, and then getting it right.', 't5'), o('c', 'Negotiating hard, and winning.', 't8'), o('d', 'Keeping things simple so money never caused a fight.', 't9'), o('e', 'Never once paying a late fee.', 't1')] },
    { id: 'e3', ask: 'What bothers you most about money?', options: [o('a', 'Sloppy records and loose ends.', 't1'), o('b', 'Not being able to help someone I love.', 't2'), o('c', 'Not being where I planned to be by now.', 't3'), o('d', 'Not knowing what is coming.', 't6'), o('e', 'Someone else deciding for me.', 't8')] },
    { id: 'e4', ask: 'A friend asks you for money advice. You:', options: [o('a', 'Send three articles and a spreadsheet.', 't5'), o('b', 'Help right away, even if it eats my evening.', 't2'), o('c', 'Make it sound exciting: look at all you could do!', 't7'), o('d', 'Keep it gentle and low-key.', 't9'), o('e', 'Walk them through the right way to do it.', 't1')] },
    { id: 'e5', ask: 'Your dream money life:', options: [o('a', 'A big number that people respect.', 't3'), o('b', 'A life that feels like mine, not a copy.', 't4'), o('c', 'Enough to think and learn without a boss.', 't5'), o('d', 'Freedom to say yes to every adventure.', 't7'), o('e', 'Nobody can tell me what to do.', 't8')] },
    { id: 'e6', ask: 'The market drops hard.', options: [o('a', 'I check the plan twice and ask someone I trust.', 't6'), o('b', 'I look away and wait for it to pass.', 't9'), o('c', 'I read up on why.', 't5'), o('d', 'I buy more, on my own terms.', 't8'), o('e', 'I feel it more than the numbers say I need to.', 't4')] },
    { id: 'e7', ask: 'How does a budget feel to you?', options: [o('a', 'I like one, and I keep it.', 't1'), o('b', 'Like a cage.', 't7'), o('c', 'Safe.', 't6'), o('d', 'Worth it if it gets me to the goal faster.', 't3'), o('e', 'I tend to stretch it for other people.', 't2')] },
    { id: 'e8', ask: 'A big purchase. What decides it?', options: [o('a', 'Whether it feels like me.', 't4'), o('b', 'The data.', 't5'), o('c', 'Whatever keeps the peace at home.', 't9'), o('d', 'Whether I get a strong deal.', 't8'), o('e', 'Whether it helps the people I love.', 't2')] },
    { id: 'e9', ask: 'Money and other people:', options: [o('a', 'I pick up the check more than I need to.', 't2'), o('b', 'I like it when people see I am doing well.', 't3'), o('c', 'I like to know my people have a cushion too.', 't6'), o('d', 'I like being the one who can handle anything.', 't8'), o('e', 'I split everything evenly so nobody feels odd.', 't9')] },
    { id: 'e10', ask: 'Which one costs you the most effort?', options: [o('a', 'Letting a small error go.', 't1'), o('b', 'Buying the plain version.', 't4'), o('c', 'Spending on something before I understand it.', 't5'), o('d', 'Waiting a month for something I want.', 't7'), o('e', 'Bringing up a money disagreement.', 't9')] },
    { id: 'e11', ask: 'A windfall arrives.', options: [o('a', 'Invest it where it grows fastest.', 't3'), o('b', 'Keep it safe until I am sure.', 't6'), o('c', 'A trip. Soon.', 't7'), o('d', 'Use it exactly as the plan says.', 't1'), o('e', 'Something meaningful, one of a kind.', 't4')] },
    { id: 'e12', ask: 'What would you like money to give you most?', options: [o('a', 'The chance to be generous.', 't2'), o('b', 'Proof that the work paid off.', 't3'), o('c', 'Room to think.', 't5'), o('d', 'Control over my own life.', 't8'), o('e', 'Peace and quiet.', 't9'), o('f', 'Safety.', 't6')] },
  ],
  cards: {
    t1: { title: 'Type One: doing it right', lines: ['You hold money to a high standard: on time, in order, done properly.', 'A loose end can bother you long after it stops mattering.'],
      light: 'People trust your numbers, and your systems hold.', next: { label: 'Grant yourself a money amnesty', skill: 'money-psychology-grant-yourself-money-amnesty' },
      skills: ['money-psychology-track-without-judging'], readings: ['cut-every-treat'] },
    t2: { title: 'Type Two: money for others', lines: ['Money, to you, is a way to care for people.', 'Your own goals can wait at the back of the line.'],
      light: 'You notice who needs something before they ask.', next: { label: 'Pay yourself on payday, before anyone else', skill: 'main-path-automate-payday-contributions' },
      skills: ['social-capital-give-first-systematically', 'social-capital-practice-asking-for-help'], readings: ['give-when-rich'] },
    t3: { title: 'Type Three: money as the scoreboard', lines: ['A goal with a number on it wakes you up.', 'Reaching it feels great for about a week, then the next one appears.'],
      light: 'You get things done, and your drive lifts the people around you.', next: { label: 'Practice comparison hygiene', skill: 'money-psychology-practice-comparison-hygiene' },
      skills: ['money-psychology-write-down-enough'], readings: ['stay-until-the-number'] },
    t4: { title: 'Type Four: money that means something', lines: ['You want money to fit who you are.', 'The plain version of anything can feel like a small loss.'],
      light: 'Your spending tells a true story, and it is yours.', next: { label: 'Spend loudly on what you value', skill: 'money-psychology-spend-loudly-on-values' },
      skills: ['money-psychology-run-a-values-inventory-refresh'], readings: ['frugal-is-freedom'] },
    t5: { title: 'Type Five: knowing enough', lines: ['You want to understand it before you spend on it.', 'Research is how you relax, and sometimes how you wait.'],
      light: 'You see what others skip, and you rarely get sold anything.', next: { label: 'A 30-day break from optimizing', skill: 'money-psychology-fast-from-optimizing-for-30-days' },
      skills: ['knowledge-study-behavioral-finance'], readings: ['max-the-401k-first'] },
    t6: { title: 'Type Six: ready for anything', lines: ['You plan for the storm before it comes, and a cushion helps you sleep.', 'Even a good plan gets checked twice.'],
      light: 'When a storm comes, you and your people are covered.', next: { label: 'Fund the true emergency fund', skill: 'cash-safety-net-fund-the-true-emergency-fund' },
      skills: ['money-psychology-hold-through-real-weather'], readings: ['six-months-first'] },
    t7: { title: 'Type Seven: options open', lines: ['You want money to keep doors open and days full.', 'Waiting for something you want takes real effort.'],
      light: 'You bring energy and joy, and you make plans fun.', next: { label: 'Wait 24 hours before a big buy', skill: 'deals-smart-buying-wait-24-hours' },
      skills: ['time-capital-plan-in-seasons'], readings: ['die-with-zero'] },
    t8: { title: 'Type Eight: in control', lines: ['You want your money on your own terms, with nobody else deciding.', 'You move fast and push hard for a strong deal.'],
      light: 'You protect your people, and you do not back down.', next: { label: 'Rebalance on rules, not on mood', skill: 'portfolio-design-rebalance-on-rules' },
      skills: ['social-capital-practice-asking-for-help'], readings: ['invest-every-spare-dollar'] },
    t9: { title: 'Type Nine: keep it calm', lines: ['You keep money simple and the peace at home.', 'A money talk that could turn tense tends to wait.'],
      light: 'People feel at ease around you, and you rarely make a rash move.', next: { label: 'Set up a payday transfer once, then let it run', skill: 'main-path-automate-payday-contributions' },
      skills: ['money-psychology-make-money-discussable'], readings: ['one-thousand-is-enough'] },
  },
  core: {
    elements: { t1: { Earth: 1 }, t2: { Spirit: 0.6, Water: 0.4 }, t3: { Fire: 1 }, t4: { Water: 1 }, t5: { Air: 1 }, t6: { Earth: 1 }, t7: { Fire: 0.5, Air: 0.5 }, t8: { Fire: 0.5, Earth: 0.5 }, t9: { Water: 0.5, Spirit: 0.5 } },
    sheet: 'Enneagram type', how: 'One and Six lean to Earth, Three to Fire, Four to Water, Five to Air; Two is mostly Spirit, Seven is Fire and Air, Eight is Fire and Earth, Nine is Water and Spirit.',
  },
};
