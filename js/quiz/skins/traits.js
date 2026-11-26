// SPDX-License-Identifier: AGPL-3.0-only
// Skin: Money Trait Percents. The "many quick taps, a percent for each trait" style: 24 statements, three for each of
// eight money traits, each answered on a five-point scale. Each trait gets its own percent, 0 to 100 (the average of
// its three statements; qzBars), so a person can be high on two at once. The card names the highest one, but the
// list of percents is the result. Money traits only. All names and words are SLAM's own, written for this quiz.
//
// HOW IT MAPS TO THE FIVE ELEMENTS (each trait's percent counts as below; the highest total is the lean):
//   Saver -> Earth 1      Joy spender -> Water 1     Planner -> Air 1        Risk taker -> Fire 1
//   Giver -> Spirit 1     Earner -> Fire 1           Researcher -> Air 1     Freedom seeker -> Spirit 0.5, Water 0.5
// ON THE CHARACTER SHEET: one line, "Top money trait", with the trait.
const s = (id, text, trait, dir = 1) => ({ id, text, trait, dir });
export const TRAITS = {
  id: 'traits', name: 'Money Trait Percents', blurb: 'Twenty-four quick taps. A percent for each of eight money traits, not one box.',
  note: 'A game lens, not a test and not a diagnosis. Each trait has its own percent, so two can be high at once. Money traits only.',
  intro: ['Twenty-four quick statements about money. Tap how true each one is for you. About two minutes.', 'You get a percent for each of eight money traits, highest first.'],
  scoring: 'average', bars: true, many: true,
  scale: [[1, 'No'], [2, 'Not really'], [3, 'Sometimes'], [4, 'Mostly'], [5, 'Yes']],
  traits: [
    { id: 'saver', name: 'Saver' }, { id: 'joy', name: 'Joy spender' }, { id: 'planner', name: 'Planner' }, { id: 'bold', name: 'Risk taker' },
    { id: 'giver', name: 'Giver' }, { id: 'earner', name: 'Earner' }, { id: 'learner', name: 'Researcher' }, { id: 'free', name: 'Freedom seeker' },
  ],
  questions: [
    s('p1', 'I move money to savings before I spend any.', 'saver'), s('p2', 'I happily pay more for things that make me smile.', 'joy'),
    s('p3', 'I know roughly what each of my bills costs.', 'planner'), s('p4', 'I am fine watching an investment drop for a while.', 'bold'),
    s('p5', 'I set money aside to give.', 'giver'), s('p6', 'I think about earning more more often than spending less.', 'earner'),
    s('p7', 'I read or listen to money content for fun.', 'learner'), s('p8', 'I picture the day work becomes optional.', 'free'),
    s('p9', 'Seeing my savings grow makes my week.', 'saver'), s('p10', 'A treat now and then is part of my plan.', 'joy'),
    s('p11', 'I like a written plan for the year.', 'planner'), s('p12', 'I would put money into a new idea with good odds.', 'bold'),
    s('p13', 'Helping someone with money feels great.', 'giver'), s('p14', 'I have asked for a raise or a higher price.', 'earner'),
    s('p15', 'Before a big buy, I compare the options.', 'learner'), s('p16', 'I would trade a bigger salary for more free time.', 'free'),
    s('p17', 'Money left at the end of the month usually gets spent.', 'saver', -1), s('p18', 'Spending on fun makes me uneasy.', 'joy', -1),
    s('p19', 'I mostly wing it with money.', 'planner', -1), s('p20', 'I like my money where it can never go down.', 'bold', -1),
    s('p21', 'Giving can wait until I have plenty.', 'giver', -1), s('p22', 'Asking to be paid more feels out of reach.', 'earner', -1),
    s('p23', 'Money details bore me.', 'learner', -1), s('p24', 'I would keep working even with all the money I need.', 'free', -1),
  ],
  cards: {
    saver: { title: 'Highest: Saver', lines: ['Money that stays put feels good to you.', 'You pay your future self before anyone else.'],
      light: 'Your cushion turns surprises into errands.', next: { label: 'Move savings to high yield', skill: 'cash-safety-net-move-to-high-yield' },
      skills: ['money-psychology-unlock-the-spending-muscle'], readings: ['six-months-first'] },
    joy: { title: 'Highest: Joy spender', lines: ['You know what makes you smile, and you pay for it.', 'Money is for living, to you, not only for later.'],
      light: 'You get real joy out of your money, which is the point of it.', next: { label: 'Spend loudly on what you value', skill: 'money-psychology-spend-loudly-on-values' },
      skills: ['deals-smart-buying-apply-cost-per-use-math'], readings: ['cut-every-treat'] },
    planner: { title: 'Highest: Planner', lines: ['You like to know where every dollar goes.', 'A written plan makes you calm.'],
      light: 'Your plans hold, and the people around you lean on them.', next: { label: 'Build your contribution waterfall', skill: 'main-path-build-your-contribution-waterfall' },
      skills: ['time-capital-budget-the-calendar-like-money'], readings: ['every-dollar-to-retirement'] },
    bold: { title: 'Highest: Risk taker', lines: ['A drop does not scare you off.', 'You will back a good idea with real money.'],
      light: 'You can sit through the rough years that pay for the good ones.', next: { label: 'Rebalance on rules', skill: 'portfolio-design-rebalance-on-rules' },
      skills: ['money-psychology-decouple-mood-from-market'], readings: ['invest-every-spare-dollar'] },
    giver: { title: 'Highest: Giver', lines: ['Money that helps someone feels best to you.', 'Giving is in your plan, not left for later.'],
      light: 'Your generosity builds a kind of safety money alone cannot buy.', next: { label: 'Give on purpose, with a plan', skill: 'social-capital-give-first-systematically' },
      skills: ['money-psychology-close-the-security-gap'], readings: ['give-when-rich'] },
    earner: { title: 'Highest: Earner', lines: ['You look for ways to bring more in.', 'Asking to be paid well is part of your toolkit.'],
      light: 'Your income has room to grow, and that moves every date.', next: { label: 'Know your market rate', skill: 'income-career-know-your-market-rate' },
      skills: ['income-career-make-the-raise-ask'], readings: ['stay-until-the-number'] },
    learner: { title: 'Highest: Researcher', lines: ['You like to understand how money works.', 'Comparing options is part of every big buy.'],
      light: 'You rarely get sold something you do not need.', next: { label: 'Finish the gateway book', skill: 'knowledge-finish-the-gateway-book' },
      skills: ['money-psychology-fast-from-optimizing-for-30-days'], readings: ['max-the-401k-first'] },
    free: { title: 'Highest: Freedom seeker', lines: ['You picture the day work becomes a choice.', 'Free time is worth real money to you.'],
      light: 'You know what the money is for, and that keeps you going.', next: { label: 'Work out your real number', skill: 'withdrawal-decumulation-compute-your-real-number' },
      skills: ['pre-retirement-design-write-the-retire-to-vision'], readings: ['die-with-zero'] },
  },
  core: {
    elements: { saver: { Earth: 1 }, joy: { Water: 1 }, planner: { Air: 1 }, bold: { Fire: 1 }, giver: { Spirit: 1 }, earner: { Fire: 1 }, learner: { Air: 1 }, free: { Spirit: 0.5, Water: 0.5 } },
    sheet: 'Top money trait', how: 'Saver leans to Earth, Joy spender to Water, Planner and Researcher to Air, Risk taker and Earner to Fire, Giver to Spirit, and Freedom seeker to Spirit and Water.',
  },
};
