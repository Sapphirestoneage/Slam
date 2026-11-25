// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the Money Sky. A PLAYFUL lens in the style of a horoscope, and labeled as such on its first screen and on its
// card. The six signs and every word are SLAM's own. No real astrology text is used, and no birth date is asked.
//
// HOW IT MAPS TO THE FIVE ELEMENTS:
//   the Ember   -> Fire 1      the Anchor  -> Earth 1     the Kite -> Air 1
//   the Well    -> Water 1     the Compass -> Spirit 1    the Lantern -> Air 0.5, Spirit 0.5
// ON THE CHARACTER SHEET: one line, "Money sign (for fun)", with the sign.
const o = (id, label, add) => ({ id, label, add });
export const STARS = {
  id: 'stars', name: 'The Money Sky', blurb: 'Eight taps. A made-up money sign, for fun.', playful: true,
  note: 'Playful, like a horoscope: for fun. Not a forecast, not advice and not a diagnosis.',
  intro: ['This one is for fun. The six signs are made up for this game.', 'Eight taps about how a money day feels. No birthday needed.'],
  scoring: 'sum',
  traits: [{ id: 'ember', name: 'the Ember' }, { id: 'anchor', name: 'the Anchor' }, { id: 'kite', name: 'the Kite' }, { id: 'well', name: 'the Well' }, { id: 'compass', name: 'the Compass' }, { id: 'lantern', name: 'the Lantern' }],
  questions: [
    { id: 's1', ask: 'Payday morning. What is the weather inside?', options: [
      o('a', 'Sparks. Let us go.', { ember: 2 }), o('b', 'Still water. All is in place.', { anchor: 2 }), o('c', 'A breeze of ideas.', { kite: 2 }),
      o('d', 'A tide: relief, then a little worry.', { well: 2 }), o('e', 'A clear sky. I know what this is for.', { compass: 2 }), o('f', 'Curious. I want to look at it closely.', { lantern: 2 })] },
    { id: 's2', ask: 'Pick a place to keep your savings, in a story.', options: [
      o('a', 'A forge, where it turns into something.', { ember: 2 }), o('b', 'A harbor, tied down tight.', { anchor: 2 }), o('c', 'A hilltop, where I can see far.', { kite: 2 }),
      o('d', 'A deep pool nobody else knows.', { well: 2 }), o('e', 'A garden that feeds people.', { compass: 2 }), o('f', 'A library, labeled and lit.', { lantern: 2 })] },
    { id: 's3', ask: 'A surprise bill shows up. You are most likely to:', options: [
      o('a', 'Go find the money, today.', { ember: 2 }), o('b', 'Pay it from the fund and carry on.', { anchor: 2 }), o('c', 'Wonder how to never get this bill again.', { kite: 2 }),
      o('d', 'Feel it first, then deal with it.', { well: 2 }), o('e', 'Ask what matters more than this.', { compass: 2 }), o('f', 'Read every line of it.', { lantern: 2 })] },
    { id: 's4', ask: 'Your favorite money tool would be:', options: [
      o('a', 'A countdown to a goal.', { ember: 2 }), o('b', 'A big number that never goes down.', { anchor: 2 }), o('c', 'A what-if machine.', { kite: 2 }),
      o('d', 'A calm voice that says it is okay.', { well: 2 }), o('e', 'A list of what the money is for.', { compass: 2 }), o('f', 'A clear list of where every dollar went.', { lantern: 2 })] },
    { id: 's5', ask: 'A friend wins a small prize. You say:', options: [
      o('a', 'Put it to work!', { ember: 2 }), o('b', 'Keep it somewhere safe.', { anchor: 2 }), o('c', 'Oh, the things you could try.', { kite: 2 }),
      o('d', 'How do you feel about it?', { well: 2 }), o('e', 'What would make it mean something?', { compass: 2 }), o('f', 'Did you check the tax on that?', { lantern: 2 })] },
    { id: 's6', ask: 'Which hour of a money day is yours?', options: [
      o('a', 'Dawn. First one moving.', { ember: 2 }), o('b', 'Noon. Steady and on time.', { anchor: 2 }), o('c', 'Late afternoon, chasing a new idea.', { kite: 2 }),
      o('d', 'Night, when the feelings come.', { well: 2 }), o('e', 'Sunset, looking at the whole day.', { compass: 2 }), o('f', 'Any hour with good light and a quiet desk.', { lantern: 2 })] },
    { id: 's7', ask: 'What tires you out fastest?', options: [
      o('a', 'Standing still.', { ember: 2 }), o('b', 'Sudden changes.', { anchor: 2 }), o('c', 'Doing the same thing every month.', { kite: 2 }),
      o('d', 'Tension about money at home.', { well: 2 }), o('e', 'Saving with no reason.', { compass: 2 }), o('f', 'Not knowing the real number.', { lantern: 2 })] },
    { id: 's8', ask: 'One wish for your money this year:', options: [
      o('a', 'Faster.', { ember: 2 }), o('b', 'Safer.', { anchor: 2 }), o('c', 'More options.', { kite: 2 }),
      o('d', 'Lighter to carry.', { well: 2 }), o('e', 'More meaning.', { compass: 2 }), o('f', 'Clearer.', { lantern: 2 })] },
  ],
  cards: {
    ember: { title: 'The Ember', lines: ['Your sign runs warm: a goal, a date, and off you go.', 'For fun, the sky says: a small spark this month becomes a habit.'],
      light: 'You bring heat to plans that would otherwise sit.', next: { label: 'Set up money that moves on payday', skill: 'main-path-automate-payday-contributions' }, readings: ['invest-every-spare-dollar'] },
    anchor: { title: 'The Anchor', lines: ['Your sign holds: bills paid, cushion in place, no drama.', 'For fun, the sky says: you are allowed to enjoy a little of it.'],
      light: 'You are the calm in the room when money gets loud.', next: { label: 'Practice spending without a flinch', skill: 'money-psychology-unlock-the-spending-muscle' }, readings: ['frugal-is-freedom'] },
    kite: { title: 'The Kite', lines: ['Your sign rides ideas: a new account, a new angle, a what-if.', 'For fun, the sky says: tie one string to the ground.'],
      light: 'You see options other people never notice.', next: { label: 'Try a one-fund portfolio', skill: 'portfolio-design-run-a-one-fund-portfolio' }, readings: ['max-the-401k-first'] },
    well: { title: 'The Well', lines: ['Your sign feels money first and counts it second.', 'For fun, the sky says: name the feeling, then look at the number.'],
      light: 'You know how a choice will feel to live with, and that is real information.', next: { label: 'Notice the feeling before you buy', skill: 'money-psychology-catch-the-feeling-first' }, readings: ['cut-every-treat'] },
    compass: { title: 'The Compass', lines: ['Your sign asks what the money is for before it asks how much.', 'For fun, the sky says: write down what enough looks like.'],
      light: 'You keep the point of it all in view.', next: { label: 'Write down what enough is', skill: 'money-psychology-write-down-enough' }, readings: ['die-with-zero'] },
    lantern: { title: 'The Lantern', lines: ['Your sign likes things lit: every dollar seen, every line read.', 'For fun, the sky says: the picture is clear enough to take one step.'],
      light: 'You bring clarity, and clarity calms everyone.', next: { label: 'Write down your net worth', skill: 'financial-ops-tooling-write-down-net-worth' }, readings: ['six-months-first'] },
  },
  core: {
    elements: { ember: { Fire: 1 }, anchor: { Earth: 1 }, kite: { Air: 1 }, well: { Water: 1 }, compass: { Spirit: 1 }, lantern: { Air: 0.5, Spirit: 0.5 } },
    sheet: 'Money sign (for fun)', how: 'The Ember leans to Fire, the Anchor to Earth, the Kite to Air, the Well to Water, the Compass to Spirit, and the Lantern half to Air and half to Spirit.',
  },
};
