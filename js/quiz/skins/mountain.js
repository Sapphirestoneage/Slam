// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the FI Pathway as a ski mountain. Everyone is going down the same mountain to the same lodge (work being
// optional). The runs differ in how steep they are. This lens asks which run fits you. It reads no numbers: the
// plan's dates come from the plan, not from here. Trail colors are the usual ones on a ski map; the words are SLAM's own.
//
// THE FIVE RUNS:
//   Green   gentle and steady: a modest share saved, for a long time
//   Blue    the main run: a solid share saved, on a written plan
//   Black   steep and fast: a big share saved for a few hard years
//   Scenic  the long way with stops: enough saved, then ease off and enjoy the view
//   Glades  off the marked trail: your own business, an unusual route
// HOW IT MAPS TO THE FIVE ELEMENTS:
//   Green -> Earth 1    Blue -> Air 1    Black -> Fire 1    Scenic -> Spirit 1    Glades -> Water 0.5, Fire 0.5
// ON THE CHARACTER SHEET: one line, "FI Pathway", with the run.
const o = (id, label, add) => ({ id, label, add });
export const MOUNTAIN = {
  id: 'mountain', name: 'The FI Pathway', blurb: 'Eight taps. One mountain, five runs down. Which one is yours?',
  note: 'A game lens, not a test and not a plan. Your dates come from your plan, not from this quiz.',
  intro: ['Picture the way to work being optional as a ski mountain. Everyone ends at the same lodge.', 'Eight taps show which run fits you: gentle, steady, steep, scenic or off the trail.'],
  scoring: 'sum',
  traits: [{ id: 'green', name: 'the Green run' }, { id: 'blue', name: 'the Blue run' }, { id: 'black', name: 'the Black run' }, { id: 'scenic', name: 'the Scenic run' }, { id: 'glades', name: 'the Glades' }],
  questions: [
    { id: 'm1', ask: 'At the top of the mountain, you look for:', options: [
      o('a', 'The wide, gentle one.', { green: 2 }), o('b', 'The main run on the map.', { blue: 2 }), o('c', 'The steepest line down.', { black: 2 }),
      o('d', 'The one with the best view.', { scenic: 2 }), o('e', 'The trees, where nobody has been.', { glades: 2 })] },
    { id: 'm2', ask: 'How much of your pay could you put away without hating your life?', options: [
      o('a', 'A little, every time.', { green: 2 }), o('b', 'A solid slice, by a plan.', { blue: 2 }), o('c', 'Half, for a few years.', { black: 2 }),
      o('d', 'A lot now, then much less later.', { scenic: 2 }), o('e', 'It changes a lot month to month.', { glades: 2 })] },
    { id: 'm3', ask: 'Arriving ten years sooner would be worth:', options: [
      o('a', 'Not much. I like my pace.', { green: 2 }), o('b', 'Some trade-offs I can plan for.', { blue: 2 }), o('c', 'Almost anything.', { black: 2 }),
      o('d', 'Nothing that costs me the good years now.', { scenic: 2 }), o('e', 'A bet on my own thing.', { glades: 2 })] },
    { id: 'm4', ask: 'Halfway down, you would like to:', options: [
      o('a', 'Keep the same easy rhythm.', { green: 2 }), o('b', 'Check the map and carry on.', { blue: 2 }), o('c', 'Not stop at all.', { black: 2 }),
      o('d', 'Stop at the hut and stay a while.', { scenic: 2 }), o('e', 'Cut across to another slope.', { glades: 2 })] },
    { id: 'm5', ask: 'Work, for you, is:', options: [
      o('a', 'Fine. A steady part of life.', { green: 2 }), o('b', 'A career I am building on purpose.', { blue: 2 }), o('c', 'Something to be free of soon.', { black: 2 }),
      o('d', 'Something I want less of, not none of.', { scenic: 2 }), o('e', 'Something I want to own.', { glades: 2 })] },
    { id: 'm6', ask: 'A patch of ice (a hard money month). You:', options: [
      o('a', 'Slow down and ride it out.', { green: 2 }), o('b', 'Adjust the plan and keep the line.', { blue: 2 }), o('c', 'Push through it.', { black: 2 }),
      o('d', 'Take a break until it softens.', { scenic: 2 }), o('e', 'Turn off the trail and find another way.', { glades: 2 })] },
    { id: 'm7', ask: 'Who are you skiing with?', options: [
      o('a', 'Family, at the pace of the slowest.', { green: 2 }), o('b', 'A group with the same plan.', { blue: 2 }), o('c', 'Alone, or with the fast ones.', { black: 2 }),
      o('d', 'Friends I stop and laugh with.', { scenic: 2 }), o('e', 'Whoever is up for something new.', { glades: 2 })] },
    { id: 'm8', ask: 'At the lodge, the story you tell is:', options: [
      o('a', 'I never fell.', { green: 2 }), o('b', 'It went the way I drew it.', { blue: 2 }), o('c', 'I got here first.', { black: 2 }),
      o('d', 'You would not believe what I saw.', { scenic: 2 }), o('e', 'I made my own trail.', { glades: 2 })] },
  ],
  cards: {
    green: { title: 'The Green run', lines: ['Gentle and steady: a modest share saved, for a long time.', 'It is the longest run, and almost nobody falls on it.'],
      light: 'You will still be doing this in twenty years. That is what makes it work.', next: { label: 'Set up money that moves on payday', skill: 'main-path-automate-payday-contributions' }, skills: ['main-path-capture-the-full-401-k-match'], readings: ['no-investing-until-debt-free'] },
    blue: { title: 'The Blue run', lines: ['The main run: a solid share saved, on a written plan.', 'Fast enough to feel progress, calm enough to live on.'],
      light: 'You hold a line. Plans made by you get finished.', next: { label: 'Name your milestones', skill: 'the-long-game-define-your-milestone-ladder' }, skills: ['main-path-open-invest-a-roth-ira'], readings: ['max-the-401k-first'] },
    black: { title: 'The Black run', lines: ['Steep and fast: a big share saved for a few hard years.', 'It is the shortest run, and the one that asks the most of your legs.'],
      light: 'You can do hard things for a reason.', next: { label: 'Write what you are retiring to', skill: 'pre-retirement-design-write-the-retire-to-vision' }, skills: ['time-capital-compute-your-real-hourly-wage'], readings: ['frugal-is-freedom'] },
    scenic: { title: 'The Scenic run', lines: ['The long way with stops: enough saved, then ease off and enjoy the view.', 'You want less work sooner, not zero work someday.'],
      light: 'You do not put your life on hold to reach the lodge.', next: { label: 'Design an ordinary Tuesday', skill: 'pre-retirement-design-design-the-actual-tuesday' }, skills: ['time-capital-audit-your-168-hours'], readings: ['stay-until-the-number'] },
    glades: { title: 'The Glades', lines: ['Off the marked trail: your own business, or a route nobody drew.', 'Some months are powder and some are rocks.'],
      light: 'You find a way where the map shows none.', next: { label: 'Test the idea before you build it', skill: 'entrepreneurship-validate-before-building' }, skills: ['cash-safety-net-get-one-month-ahead', 'side-hustles-separate-the-money'], readings: ['every-dollar-to-retirement'] },
  },
  core: {
    elements: { green: { Earth: 1 }, blue: { Air: 1 }, black: { Fire: 1 }, scenic: { Spirit: 1 }, glades: { Water: 0.5, Fire: 0.5 } },
    sheet: 'FI Pathway', how: 'The Green run leans to Earth, the Blue run to Air, the Black run to Fire, the Scenic run to Spirit, and the Glades half to Water and half to Fire.',
  },
};
