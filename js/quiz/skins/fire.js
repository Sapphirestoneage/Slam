// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the FIRE Community Quiz. Statements on a five-point agree scale (Likert). Two kinds of trait: four FIRE flavors
// (Lean, Fat, Coast and Barista, the names the FIRE community uses for its ways of getting there) and three preference
// spectrums. The card is the top flavor (result.group: 'flavor'); the card shows a bar for each flavor (qzBars) and
// where the person sits on each spectrum (qzSpectrums). The statements and every word here are SLAM's own.
//
// HOW IT MAPS TO THE FIVE ELEMENTS (each flavor's 0 to 100 counts as below; the spectrums lean on no element):
//   Lean FIRE    (a small, simple life, sooner)   -> Earth 1
//   Fat FIRE     (room to spare, later)            -> Fire 1
//   Coast FIRE   (save early, let it grow)         -> Water 1
//   Barista FIRE (part-time work you like)         -> Spirit 1
// ON THE CHARACTER SHEET: one line, "FIRE flavor", with the flavor.
const s = (id, text, trait, dir = 1) => ({ id, text, trait, dir });
export const FIRE = {
  id: 'fire', name: 'The FIRE Community Quiz', blurb: 'Fourteen statements. Your FIRE flavor, a bar for each one, and three spectrums.',
  note: 'A game lens, not a test and not a forecast. Lean, Fat, Coast and Barista are the names the FIRE community uses; the statements and words here are SLAM\'s own.',
  intro: ['Fourteen statements about work, money and the life after. Tap how much you agree.', 'You get a bar for each of four FIRE flavors, the one you lean to most, and where you sit on three spectrums.'],
  scoring: 'average', bars: 'flavor',
  scale: [[1, 'Strongly disagree'], [2, 'Disagree'], [3, 'Neutral'], [4, 'Agree'], [5, 'Strongly agree']],
  groups: [{ id: 'flavor', name: 'FIRE flavor' }, { id: 'pref', name: 'Preferences' }],
  traits: [
    { id: 'lean', name: 'Lean FIRE', group: 'flavor' }, { id: 'fat', name: 'Fat FIRE', group: 'flavor' },
    { id: 'coast', name: 'Coast FIRE', group: 'flavor' }, { id: 'barista', name: 'Barista FIRE', group: 'flavor' },
    { id: 'earn', name: 'Earn more over spend less', group: 'pref' }, { id: 'hands', name: 'Hands on over set and forget', group: 'pref' },
    { id: 'move', name: 'Move for it over stay put', group: 'pref' },
  ],
  result: { by: 'top', group: 'flavor' },
  spectrums: [
    { id: 'earn', name: 'How you get there', trait: 'earn', left: 'Spend less', right: 'Earn more' },
    { id: 'hands', name: 'How you invest', trait: 'hands', left: 'Set and forget', right: 'Hands on' },
    { id: 'move', name: 'Where you live', trait: 'move', left: 'Stay put', right: 'Move for it' },
  ],
  questions: [
    s('f1', 'I could live happily on a small, simple budget for good.', 'lean'),
    s('f2', 'I want plenty of room after work: travel, dinners out, help for family.', 'fat'),
    s('f3', 'I like the idea of saving hard now, then letting it grow on its own.', 'coast'),
    s('f4', 'Part-time work I enjoy, after the main career, sounds good to me.', 'barista'),
    s('f5', 'I would rather grow my income than trim my spending.', 'earn'),
    s('f6', 'I enjoy tinkering with my investments and my plan.', 'hands'),
    s('f7', 'I would move somewhere cheaper to get there sooner.', 'move'),
    s('f8', 'I would rather work a few more years than cut back to the bone.', 'lean', -1),
    s('f9', 'A modest life after work sounds fine to me.', 'fat', -1),
    s('f10', 'I want to keep adding to savings right up to the day I stop.', 'coast', -1),
    s('f11', 'When I stop, I want to stop working for pay completely.', 'barista', -1),
    s('f12', 'Cutting a cost feels better to me than chasing a raise.', 'earn', -1),
    s('f13', 'I want one simple fund, and not to think about it.', 'hands', -1),
    s('f14', 'I want to stay where my people are, even if it costs more.', 'move', -1),
  ],
  cards: {
    lean: { title: 'Lean FIRE', lines: ['You would trade extras for an earlier finish line.', 'A small, simple life after work sounds like freedom to you.'],
      light: 'Your number is the smallest of the four, so it can come soonest.', next: { label: 'Work out your real number', skill: 'withdrawal-decumulation-compute-your-real-number' },
      skills: ['money-psychology-write-down-enough', 'deals-smart-buying-renegotiate-the-bills-yearly'], readings: ['frugal-is-freedom'] },
    fat: { title: 'Fat FIRE', lines: ['You want room to spare after work, not a tight squeeze.', 'A few more years of work for a fuller life sounds fair to you.'],
      light: 'Your plan has a cushion built in, so a rough year hurts less.', next: { label: 'Capture every raise', skill: 'main-path-capture-every-raise' },
      skills: ['main-path-fill-all-sheltered-space'], readings: ['every-dollar-to-retirement'] },
    coast: { title: 'Coast FIRE', lines: ['You like saving hard early, then letting time do the work.', 'After that, your pay only has to cover today.'],
      light: 'Once you reach your coast number, every day after it is lighter.', next: { label: 'Map your FI stages', skill: 'withdrawal-decumulation-map-your-fi-stages' },
      skills: ['main-path-automate-payday-contributions'], readings: ['invest-every-spare-dollar'] },
    barista: { title: 'Barista FIRE', lines: ['You picture work you enjoy, part time, after the main career.', 'A little pay keeps the savings working longer.'],
      light: 'Your number is smaller, and your days keep a shape you like.', next: { label: 'Design the glide down', skill: 'pre-retirement-design-design-the-glide-down' },
      skills: ['side-hustles-freelance-your-day-skill', 'withdrawal-decumulation-bridge-the-healthcare-gap'], readings: ['stay-until-the-number'] },
  },
  core: {
    elements: { lean: { Earth: 1 }, fat: { Fire: 1 }, coast: { Water: 1 }, barista: { Spirit: 1 } },
    sheet: 'FIRE flavor', how: 'Lean FIRE leans to Earth, Fat FIRE to Fire, Coast FIRE to Water and Barista FIRE to Spirit. The three spectrums lean on no element.',
  },
};
