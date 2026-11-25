// SPDX-License-Identifier: AGPL-3.0-only
// Skin: Roll Your Money Sheet, in the style of a tabletop character sheet. Six plain stats (strength, quickness,
// stamina, knowledge, wisdom, voice) and six class names made up for SLAM. No words, classes or art from any
// published game.
//
// THE SIX STATS, AS MONEY:
//   Strength  earning power           Quickness  moving fast when things change     Stamina  keeping going, month after month
//   Knowledge knowing how it works    Wisdom     knowing what is enough             Voice    asking, bargaining, talking money
// The class is the highest stat. The second stat shows on the card too.
// HOW IT MAPS TO THE FIVE ELEMENTS:
//   Strength -> Fire 1     Quickness -> Water 1     Stamina -> Earth 1
//   Knowledge -> Air 1     Wisdom -> Spirit 1       Voice -> Fire 0.5, Air 0.5
// ON THE CHARACTER SHEET: one line, "Money class", with the class.
const o = (id, label, add) => ({ id, label, add });
export const SHEET = {
  id: 'sheet', name: 'Roll Your Money Sheet', blurb: 'Nine taps. Six stats and a class, like a tabletop character.',
  note: 'A game lens, not a test and not a diagnosis. A stat is a muscle: it grows with use.',
  intro: ['Nine taps fill in six money stats: strength, quickness, stamina, knowledge, wisdom and voice.', 'Your highest stat names your class. A stat is a muscle, not a fixed trait.'],
  scoring: 'sum',
  traits: [{ id: 'str', name: 'Strength' }, { id: 'dex', name: 'Quickness' }, { id: 'con', name: 'Stamina' }, { id: 'int', name: 'Knowledge' }, { id: 'wis', name: 'Wisdom' }, { id: 'cha', name: 'Voice' }],
  questions: [
    { id: 'd1', ask: 'A door is stuck. With money, you:', options: [
      o('a', 'Push: earn enough to open it.', { str: 2 }), o('b', 'Slip around: find the side way in.', { dex: 2 }), o('c', 'Lean on it for as long as it takes.', { con: 2 }),
      o('d', 'Study the hinges.', { int: 2 }), o('e', 'Ask if this door is the one I want.', { wis: 2 }), o('f', 'Knock and talk to whoever is inside.', { cha: 2 })] },
    { id: 'd2', ask: 'Your best money move so far:', options: [
      o('a', 'I raised my income.', { str: 2 }), o('b', 'I changed course fast when I had to.', { dex: 2 }), o('c', 'I kept one habit going for years.', { con: 2 }),
      o('d', 'I learned how something really works.', { int: 2 }), o('e', 'I said no to something I did not need.', { wis: 2 }), o('f', 'I asked, and got a better deal.', { cha: 2 })] },
    { id: 'd3', ask: 'Pick a tool for the road.', options: [
      o('a', 'A big hammer.', { str: 2 }), o('b', 'Light shoes.', { dex: 2 }), o('c', 'A full pack.', { con: 2 }), o('d', 'A thick book.', { int: 2 }), o('e', 'A quiet lamp.', { wis: 2 }), o('f', 'A letter of introduction.', { cha: 2 })] },
    { id: 'd4', ask: 'A bill is higher than it was last year. You:', options: [
      o('a', 'Shrug and out-earn it.', { str: 2 }), o('b', 'Switch providers by Friday.', { dex: 2 }), o('c', 'Trim a little everywhere and absorb it.', { con: 2 }),
      o('d', 'Read the fine print to see why.', { int: 2 }), o('e', 'Ask if I still want the thing at all.', { wis: 2 }), o('f', 'Call and ask for the old price.', { cha: 2 })] },
    { id: 'd5', ask: 'Which sounds restful?', options: [
      o('a', 'A big payday.', { str: 2 }), o('b', 'Nothing tying me down.', { dex: 2 }), o('c', 'The same good month, again.', { con: 2 }),
      o('d', 'A question finally answered.', { int: 2 }), o('e', 'Wanting nothing more today.', { wis: 2 }), o('f', 'A good talk that cleared the air.', { cha: 2 })] },
    { id: 'd6', ask: 'On a long trip, your party counts on you to:', options: [
      o('a', 'Carry the most.', { str: 2 }), o('b', 'Spot trouble and step aside in time.', { dex: 2 }), o('c', 'Keep walking when others tire.', { con: 2 }),
      o('d', 'Know the rules of each town.', { int: 2 }), o('e', 'Say when to rest.', { wis: 2 }), o('f', 'Bargain at the market.', { cha: 2 })] },
    { id: 'd7', ask: 'What takes the most out of you?', options: [
      o('a', 'Asking for help.', { str: 1, con: 1 }), o('b', 'Sticking with a plan for years.', { dex: 2 }), o('c', 'Changing a habit that works.', { con: 2 }),
      o('d', 'Deciding before I understand.', { int: 2 }), o('e', 'Chasing more for its own sake.', { wis: 2 }), o('f', 'Doing money alone, in silence.', { cha: 2 })] },
    { id: 'd8', ask: 'Money training you would enjoy:', options: [
      o('a', 'Learning a skill that pays more.', { str: 2 }), o('b', 'A drill for a surprise month.', { dex: 2 }), o('c', 'A streak tracker.', { con: 2 }),
      o('d', 'A deep read on taxes or funds.', { int: 2 }), o('e', 'Writing down what enough is.', { wis: 2 }), o('f', 'Practice for a pay talk.', { cha: 2 })] },
    { id: 'd9', ask: 'At the end of the story, you want to have been:', options: [
      o('a', 'The one who provided.', { str: 2 }), o('b', 'The one who always landed on their feet.', { dex: 2 }), o('c', 'The one who never quit.', { con: 2 }),
      o('d', 'The one who understood it.', { int: 2 }), o('e', 'The one who knew what mattered.', { wis: 2 }), o('f', 'The one who brought people along.', { cha: 2 })] },
  ],
  cards: {
    str: { title: 'The Hauler (highest stat: Strength)', lines: ['Your power is earning. You solve money by bringing more in.', 'Strength grows fastest when it has a place to land.'],
      light: 'You can lift a whole household.', next: { label: 'Send each raise to savings first', skill: 'money-psychology-route-raises-past-identity' }, skills: ['income-career-negotiate-one-offer'], readings: ['cut-every-treat'] },
    dex: { title: 'The Sidestepper (highest stat: Quickness)', lines: ['Your power is moving fast when things change.', 'You bend where others break.'],
      light: 'Change does not scare you, so you can take chances others pass up.', next: { label: 'Write a plan before the weather comes', skill: 'storms-windfalls-write-playbooks-before-weather' }, skills: ['cash-safety-net-get-one-month-ahead'], readings: ['stay-until-the-number'] },
    con: { title: 'The Stayer (highest stat: Stamina)', lines: ['Your power is keeping going, month after month.', 'Small and steady is how you win.'],
      light: 'Time is on the side of people like you.', next: { label: 'Set up money that moves on payday', skill: 'main-path-automate-payday-contributions' }, skills: ['the-long-game-celebrate-on-purpose'], readings: ['frugal-is-freedom'] },
    int: { title: 'The Ledgerwright (highest stat: Knowledge)', lines: ['Your power is knowing how it works.', 'You read the rules, so the rules work for you.'],
      light: 'You turn confusing things into clear ones, for you and for others.', next: { label: 'Know what you own', skill: 'portfolio-design-know-what-you-own' }, skills: ['money-psychology-fast-from-optimizing-for-30-days'], readings: ['max-the-401k-first'] },
    wis: { title: 'The Lampkeeper (highest stat: Wisdom)', lines: ['Your power is knowing what is enough.', 'You ask what it is for before you ask how much.'],
      light: 'You are hard to sell to and easy to be around.', next: { label: 'Write down what enough is', skill: 'money-psychology-write-down-enough' }, skills: ['main-path-buy-your-first-share'], readings: ['die-with-zero'] },
    cha: { title: 'The Dealspeaker (highest stat: Voice)', lines: ['Your power is asking, bargaining and talking money out loud.', 'A good question has saved you more than a coupon ever did.'],
      light: 'You make money something people can say out loud.', next: { label: 'Bargain on one offer', skill: 'income-career-negotiate-one-offer' }, skills: ['deals-smart-buying-renegotiate-the-bills-yearly'], readings: ['renting-is-throwing-money-away'] },
  },
  core: {
    elements: { str: { Fire: 1 }, dex: { Water: 1 }, con: { Earth: 1 }, int: { Air: 1 }, wis: { Spirit: 1 }, cha: { Fire: 0.5, Air: 0.5 } },
    sheet: 'Money class', how: 'Strength leans to Fire, Quickness to Water, Stamina to Earth, Knowledge to Air, Wisdom to Spirit, and Voice half to Fire and half to Air.',
  },
};
