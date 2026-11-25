// SPDX-License-Identifier: AGPL-3.0-only
// Skin: Pick Your Money Avatar. Five characters made up for SLAM, each with a role in a team game. All names and
// words are SLAM's own.
//
// HOW IT MAPS TO THE FIVE ELEMENTS:
//   Oda, the Bulwark (protects)      -> Earth 1       Sol, the Striker (pushes ahead)   -> Fire 1
//   Tavi, the Tactician (plans)      -> Air 1         Mira, the Mender (looks after)    -> Water 0.5, Spirit 0.5
//   Wren, the Pathfinder (explores)  -> Air 0.5, Water 0.5
// ON THE CHARACTER SHEET: one line, "Money avatar", with the character.
const o = (id, label, add) => ({ id, label, add });
export const AVATARS = {
  id: 'avatars', name: 'Pick Your Money Avatar', blurb: 'Eight taps. Meet the character who plays money the way you do.',
  note: 'A game lens, not a test and not a diagnosis. A team needs every role.',
  intro: ['Eight taps. Each one is a moment in a team game, played with money.', 'You end on one of five made-up characters, and the role you play second.'],
  scoring: 'sum',
  traits: [{ id: 'bulwark', name: 'Oda, the Bulwark' }, { id: 'striker', name: 'Sol, the Striker' }, { id: 'tactician', name: 'Tavi, the Tactician' }, { id: 'mender', name: 'Mira, the Mender' }, { id: 'pathfinder', name: 'Wren, the Pathfinder' }],
  questions: [
    { id: 'a1', ask: 'The match starts. Where do you stand?', options: [
      o('a', 'In front, taking the hits.', { bulwark: 2 }), o('b', 'Wherever the goal is closest.', { striker: 2 }), o('c', 'Up high, reading the whole field.', { tactician: 2 }),
      o('d', 'Next to whoever needs help.', { mender: 2 }), o('e', 'Off the map, looking for a shortcut.', { pathfinder: 2 })] },
    { id: 'a2', ask: 'Your team gets a windfall of gold. You vote to:', options: [
      o('a', 'Bank it for the hard round.', { bulwark: 2 }), o('b', 'Spend it on the fastest upgrade.', { striker: 2 }), o('c', 'Split it by a plan we agreed before.', { tactician: 2 }),
      o('d', 'Cover the teammate who is short.', { mender: 2 }), o('e', 'Try the thing nobody has tried.', { pathfinder: 2 })] },
    { id: 'a3', ask: 'Which gear do you buy first?', options: [
      o('a', 'Armor.', { bulwark: 2 }), o('b', 'Boots.', { striker: 2 }), o('c', 'A map.', { tactician: 2 }), o('d', 'A healing kit.', { mender: 2 }), o('e', 'A spyglass.', { pathfinder: 2 })] },
    { id: 'a4', ask: 'In real life, that first piece of gear is closest to:', options: [
      o('a', 'An emergency fund.', { bulwark: 2 }), o('b', 'An extra debt payment.', { striker: 2 }), o('c', 'A budget I trust.', { tactician: 2 }),
      o('d', 'Insurance for the people who count on me.', { mender: 2 }), o('e', 'A side project that might pay.', { pathfinder: 2 })] },
    { id: 'a5', ask: 'A round goes against your team. You:', options: [
      o('a', 'Hold the line until it passes.', { bulwark: 2 }), o('b', 'Queue the next round right away.', { striker: 2 }), o('c', 'Watch the replay to see what changed.', { tactician: 2 }),
      o('d', 'Check on how everyone is doing.', { mender: 2 }), o('e', 'Switch to a new route.', { pathfinder: 2 })] },
    { id: 'a6', ask: 'Teammates would say you are the one who:', options: [
      o('a', 'Never runs out.', { bulwark: 2 }), o('b', 'Gets it done.', { striker: 2 }), o('c', 'Always has the plan.', { tactician: 2 }), o('d', 'Remembers everybody.', { mender: 2 }), o('e', 'Finds the odd good deal.', { pathfinder: 2 })] },
    { id: 'a7', ask: 'What would you rather not do?', options: [
      o('a', 'Spend the reserve.', { bulwark: 2 }), o('b', 'Sit through a slow season.', { striker: 2 }), o('c', 'Move with no plan.', { tactician: 2 }), o('d', 'Put myself first.', { mender: 2 }), o('e', 'Do it the usual way.', { pathfinder: 2 })] },
    { id: 'a8', ask: 'The season ends. The best prize is:', options: [
      o('a', 'Nobody on my team was ever in trouble.', { bulwark: 2 }), o('b', 'We finished early.', { striker: 2 }), o('c', 'The plan worked as drawn.', { tactician: 2 }),
      o('d', 'Everyone got looked after.', { mender: 2 }), o('e', 'We found a way nobody knew.', { pathfinder: 2 })] },
  ],
  cards: {
    bulwark: { title: 'Oda, the Bulwark', lines: ['You stand between your household and the hard round.', 'Reserves first. Everything else can wait a turn.'],
      light: 'Because of you, a surprise is an errand, not a scramble.', next: { label: 'Get one month ahead', skill: 'cash-safety-net-get-one-month-ahead' }, skills: ['main-path-buy-your-first-share'], readings: ['one-thousand-is-enough'] },
    striker: { title: 'Sol, the Striker', lines: ['You go straight at the goal with the date on it.', 'Momentum is your favorite number.'],
      light: 'You finish things, and finished things change a life.', next: { label: 'Pick how you pay debt down', skill: 'debt-leverage-pick-a-payoff-engine' }, skills: ['the-long-game-celebrate-on-purpose'], readings: ['cut-every-treat'] },
    tactician: { title: 'Tavi, the Tactician', lines: ['You see the whole field and the next three moves.', 'A plan on paper is how you play.'],
      light: 'Your plans let other people stop worrying.', next: { label: 'Budget your calendar like money', skill: 'time-capital-budget-the-calendar-like-money' }, skills: ['portfolio-design-build-the-three-fund-portfolio'], readings: ['pay-off-the-mortgage-first'] },
    mender: { title: 'Mira, the Mender', lines: ['You keep the team standing.', 'Your money goes where your people are.'],
      light: 'People are safer and braver with you on the team.', next: { label: 'Check who your accounts would go to', skill: 'insurance-protection-audit-every-beneficiary' }, skills: ['family-generational-wealth-design-yours-mine-ours'], readings: ['give-when-rich'] },
    pathfinder: { title: 'Wren, the Pathfinder', lines: ['You look for the route nobody marked.', 'A new idea is worth a detour to you.'],
      light: 'You find chances that a straight path walks past.', next: { label: 'Earn a first dollar outside your job', skill: 'side-hustles-earn-a-first-outside-dollar' }, skills: ['entrepreneurship-validate-before-building'], readings: ['stay-until-the-number'] },
  },
  core: {
    elements: { bulwark: { Earth: 1 }, striker: { Fire: 1 }, tactician: { Air: 1 }, mender: { Water: 0.5, Spirit: 0.5 }, pathfinder: { Air: 0.5, Water: 0.5 } },
    sheet: 'Money avatar', how: 'The Bulwark leans to Earth, the Striker to Fire, the Tactician to Air, the Mender half to Water and half to Spirit, the Pathfinder half to Air and half to Water.',
  },
};
