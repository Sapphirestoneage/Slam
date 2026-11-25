// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the Money Pyramid, after Maslow's pyramid of needs (an idea from 1943, used here as a loose picture, not as
// science). It asks where your money attention lives right now. The level words and every line are SLAM's own.
// A level is a place you are standing this season, not a rank. People move up and down it all their lives.
//
// HOW IT MAPS TO THE FIVE ELEMENTS:
//   Basics (this month's bills)        -> Water 0.5, Earth 0.5      Safety (a cushion, cover)   -> Earth 1
//   Belonging (your people)            -> Water 0.5, Spirit 0.5     Growth (earning, building)  -> Fire 1
//   Purpose (what it is all for)       -> Spirit 1
// ON THE CHARACTER SHEET: one line, "Money pyramid", with the level.
const o = (id, label, add) => ({ id, label, add });
export const PYRAMID = {
  id: 'pyramid', name: 'The Money Pyramid', blurb: 'Eight taps. See which level of the pyramid your money attention is on this season.',
  note: 'A game lens, not a test and not a diagnosis. A level is where you stand this season, not a rank.',
  intro: ['Maslow drew needs as a pyramid: the basics at the base, purpose at the top.', 'Eight taps show where your money attention lives right now. It moves, and that is normal.'],
  scoring: 'sum',
  traits: [{ id: 'basics', name: 'Basics' }, { id: 'safety', name: 'Safety' }, { id: 'belonging', name: 'Belonging' }, { id: 'growth', name: 'Growth' }, { id: 'purpose', name: 'Purpose' }],
  questions: [
    { id: 'p1', ask: 'When you think about money this week, you think about:', options: [
      o('a', 'Getting this month paid.', { basics: 2 }), o('b', 'What happens if something breaks.', { safety: 2 }), o('c', 'The people I share it with.', { belonging: 2 }),
      o('d', 'Earning or building more.', { growth: 2 }), o('e', 'What it is all for.', { purpose: 2 })] },
    { id: 'p2', ask: 'An extra $500 would go to:', options: [
      o('a', 'A bill that is due.', { basics: 2 }), o('b', 'The cushion.', { safety: 2 }), o('c', 'Something with or for my people.', { belonging: 2 }),
      o('d', 'A course, a tool or an investment.', { growth: 2 }), o('e', 'A cause, or a dream with my name on it.', { purpose: 2 })] },
    { id: 'p3', ask: 'The money question you ask most:', options: [
      o('a', 'Will it stretch?', { basics: 2 }), o('b', 'Am I covered?', { safety: 2 }), o('c', 'Is this fair to everyone?', { belonging: 2 }),
      o('d', 'How do I get to the next level?', { growth: 2 }), o('e', 'Is this the life I want?', { purpose: 2 })] },
    { id: 'p4', ask: 'What would let you breathe out?', options: [
      o('a', 'A month where nothing is due that I cannot pay.', { basics: 2 }), o('b', 'Six months in the bank.', { safety: 2 }), o('c', 'A calm money talk at home.', { belonging: 2 }),
      o('d', 'A raise, or my own thing taking off.', { growth: 2 }), o('e', 'Knowing I have enough.', { purpose: 2 })] },
    { id: 'p5', ask: 'Which sounds most like your last money win?', options: [
      o('a', 'I caught up on something.', { basics: 2 }), o('b', 'I set something aside.', { safety: 2 }), o('c', 'I helped someone, or we agreed on a plan.', { belonging: 2 }),
      o('d', 'I earned or invested more than before.', { growth: 2 }), o('e', 'I spent on something that truly mattered.', { purpose: 2 })] },
    { id: 'p6', ask: 'What do you compare yourself with?', options: [
      o('a', 'Last month.', { basics: 2 }), o('b', 'The worst case.', { safety: 2 }), o('c', 'What my family or friends need.', { belonging: 2 }),
      o('d', 'Where I want to be in five years.', { growth: 2 }), o('e', 'Nobody. I ask if it feels right.', { purpose: 2 })] },
    { id: 'p7', ask: 'A free afternoon for money goes to:', options: [
      o('a', 'Sorting which bill goes first.', { basics: 2 }), o('b', 'Checking insurance and the fund.', { safety: 2 }), o('c', 'Planning something with my people.', { belonging: 2 }),
      o('d', 'Working on income.', { growth: 2 }), o('e', 'Writing down what I want my life to hold.', { purpose: 2 })] },
    { id: 'p8', ask: 'Finish the sentence. Money, right now, is:', options: [
      o('a', 'A puzzle I solve each month.', { basics: 2 }), o('b', 'A wall I am building.', { safety: 2 }), o('c', 'Something we share.', { belonging: 2 }),
      o('d', 'A ladder.', { growth: 2 }), o('e', 'A tool for a good life.', { purpose: 2 })] },
  ],
  cards: {
    basics: { title: 'The base: Basics', lines: ['Your attention is on getting each month paid.', 'That is the right place for it while the month is tight. Nothing above stands without this level.'],
      light: 'You know exactly what things cost. Many people never learn that.', next: { label: 'Build the first $1,000', skill: 'cash-safety-net-build-the-1k-shield' }, skills: ['debt-leverage-autopay-all-minimums'], readings: ['six-months-first'] },
    safety: { title: 'Level two: Safety', lines: ['Your attention is on being covered if something breaks.', 'You are building the wall that lets everything above it relax.'],
      light: 'You plan for rain, so rain is only weather.', next: { label: 'Fund the job-loss fund', skill: 'cash-safety-net-fund-the-true-emergency-fund' }, skills: ['insurance-protection-cover-the-roof'], readings: ['one-thousand-is-enough'] },
    belonging: { title: 'Level three: Belonging', lines: ['Your attention is on the people you share money with.', 'Fair, kind and talked about matters more to you than the biggest number.'],
      light: 'You make money something people can talk about.', next: { label: 'Hold a money date', skill: 'family-generational-wealth-hold-the-money-date' }, skills: ['money-psychology-reconcile-two-money-stories'], readings: ['give-when-rich'] },
    growth: { title: 'Level four: Growth', lines: ['Your attention is on earning and building more.', 'The floor is in place, and you are climbing.'],
      light: 'Your ambition raises the ceiling for your whole household.', next: { label: 'Know your market rate', skill: 'income-career-know-your-market-rate' }, skills: ['main-path-open-invest-a-roth-ira'], readings: ['max-the-401k-first'] },
    purpose: { title: 'The top: Purpose', lines: ['Your attention is on what the money is for.', 'You are asking the question the whole pyramid exists to reach.'],
      light: 'You can tell enough from more. That is rare.', next: { label: 'Write down what enough is', skill: 'money-psychology-write-down-enough' }, skills: ['pre-retirement-design-write-the-retire-to-vision'], readings: ['frugal-is-freedom'] },
  },
  core: {
    elements: { basics: { Water: 0.5, Earth: 0.5 }, safety: { Earth: 1 }, belonging: { Water: 0.5, Spirit: 0.5 }, growth: { Fire: 1 }, purpose: { Spirit: 1 } },
    sheet: 'Money pyramid', how: 'Basics leans half to Water and half to Earth, Safety to Earth, Belonging half to Water and half to Spirit, Growth to Fire, Purpose to Spirit.',
  },
};
