// SPDX-License-Identifier: AGPL-3.0-only
// Batch 25 (Phase 4): who they are with money. SLAM's own versions of three tools Eli built in chats (July and Aug
// 2026; named-tools.md, "Earlier standalone tools" and "Everything else built in chats"): the FI Address, the FI
// Personality letters and the Money Mirror's weather and couples overlay. The original files are not available, so
// every word here is SLAM's own, written from the descriptions; nothing is copied from any published personality or
// Enneagram inventory. The wording lives here; the scoring is js/math/identity.js (M95).
// Never a gate, never a verdict: the letters only change which skills and which words lead.

export const DISCLAIMER = 'Not therapy and not a diagnosis. A few of these questions are not really about money, and any of them can be skipped.';

// ---------- The FI Address: four characters, a motion flag, lowercase modifiers ----------
// 1 Familiarity, read from what is invested and what they said they want (Why now, the goal chips).
export const FAMILIARITY = {
  N: { word: 'New to this', from: 'nothing invested yet and no FI goal named' },
  L: { word: 'Learning', from: 'some money invested, or an FI or investing goal named' },
  F: { word: 'Fluent', from: 'a year or more of spending already invested' },
};
// 2 Route and target, read from the work situation and the goal (and, with no goal named, from the state).
export const ROUTE = {
  J: { word: 'A job, steady ground first', route: 'job', target: 'steady' },
  W: { word: 'A job, aiming at work optional', route: 'job', target: 'optional' },
  B: { word: 'Own business, steady ground first', route: 'business', target: 'steady' },
  O: { word: 'Own business, aiming at work optional', route: 'business', target: 'optional' },
  P: { word: 'Between incomes, the next one first', route: 'paused', target: 'next' },
  R: { word: 'Retired, making it last', route: 'retired', target: 'last' },
};
// 3 State and feeling: where the numbers are, and how they say it feels (one tap, or the Confidence measure).
export const STATE = {
  U: { word: 'Below zero, and feeling it', state: 'under', calm: false },
  Z: { word: 'Below zero, calm about it', state: 'under', calm: true },
  G: { word: 'Building, and feeling the pressure', state: 'building', calm: false },
  K: { word: 'Building, keeping calm', state: 'building', calm: true },
  A: { word: 'Ahead, and still uneasy', state: 'ahead', calm: false },
  C: { word: 'Ahead, and comfortable', state: 'ahead', calm: true },
};
// 4 The ceiling: which lever still moves.
export const CEILING = {
  '↕': { word: 'Can earn more and spend less', lever: 'Both levers move: start with the one that feels lighter.' },
  '↑': { word: 'Can earn more', lever: 'The lever that moves it most is income.' },
  '↓': { word: 'Can spend less', lever: 'The lever that moves it most is spending.' },
  '=': { word: 'Near the ceiling both ways', lever: 'Both levers are near their limit, so time and the plan do the work.' },
};
// The motion flag, only when something is changing (Why now, the work situation, a Life Transitions plan).
export const MOTION = {
  '*': { word: 'A change they chose' },
  '~': { word: 'A change that is some of both' },
  '!': { word: 'A change that happened to them' },
};
// Lowercase modifiers: optional taps, never asked. Equity pay is read from About you.
export const MODIFIERS = [
  { id: 'm', word: 'Military' }, { id: 'c', word: 'Clergy' }, { id: 'e', word: 'Educator' },
  { id: 'h', word: 'Medicine' }, { id: 'q', word: 'Equity pay' }, { id: 'x', word: 'Cross-border' },
];
// The at most four taps (each is asked only when SLAM cannot read the answer).
export const ADDRESS_QUESTIONS = [
  { key: 'feel', ask: 'How does money feel right now?', options: [['calm', 'Calm'], ['uneasy', 'Uneasy'], ['stressed', 'Stressed']] },
  { key: 'earnMore', ask: 'Could they earn more in the next year?', options: [[true, 'Yes'], [false, 'Not really']] },
  { key: 'spendLess', ask: 'Could they spend less without real pain?', options: [[true, 'Yes'], [false, 'Not really']] },
  { key: 'motion', ask: 'The change: chosen or not?', options: [['*', 'Chosen'], ['~', 'Some of both'], ['!', 'Imposed']], only: 'transition' },
];
// The route each address implies, in one or two plain lines.
export const ROUTE_LINES = {
  under: 'Steady ground first: stop going backwards, clear the heavy debt, then a job-loss fund.',
  building: 'Build the floor: a job-loss fund and the match, then Tax-Free Growth.',
  aheadOptional: 'Toward work optional: Tax-Free Growth, then investing, with a date to aim at.',
  aheadSteady: 'Ahead already: name what the money is for, then point the surplus at it.',
  optionalLater: 'Work optional comes after, and it is on the map.',
  business: 'Taxes set aside from every payment, before anything else.',
  paused: 'Make the cash last until the next income (Plan › Transitions).',
  retired: 'Make it last: what to draw from first, and how much a year.',
};

// ---------- The personality letters: 12 statements, 4 axes, 16 types ----------
// Each axis has two poles; a statement leans toward one pole when agreed with and toward the other when disagreed with.
export const AXES = [
  { id: 'ek', name: 'Where the power comes from', poles: [{ id: 'E', word: 'Earner', means: 'grows what comes in' }, { id: 'K', word: 'Keeper', means: 'guards what stays' }] },
  { id: 'po', name: 'How they move', poles: [{ id: 'P', word: 'Paper', means: 'plans it on paper first' }, { id: 'O', word: 'Operator', means: 'learns by doing' }] },
  { id: 'gv', name: 'How they hold risk', poles: [{ id: 'G', word: 'Guardian', means: 'protects the downside' }, { id: 'V', word: 'Venturer', means: 'reaches for the upside' }] },
  { id: 'xs', name: 'What it is for', poles: [{ id: 'X', word: 'Exiter', means: 'wants work to be optional' }, { id: 'S', word: 'Savorer', means: 'enjoys the ride on the way' }] },
];
// toward: the pole an Agree leans to. Order mixes the axes so no two in a row are about the same thing.
export const STATEMENTS = [
  { id: 's1', axis: 'ek', toward: 'E', text: 'When money is tight, my first thought is how to bring more in.' },
  { id: 's2', axis: 'po', toward: 'P', text: 'I like to see the whole plan written down before I move any money.' },
  { id: 's3', axis: 'gv', toward: 'G', text: 'I would rather miss a gain than take a loss.' },
  { id: 's4', axis: 'xs', toward: 'X', text: 'The point of my money is to make work optional someday.' },
  { id: 's5', axis: 'ek', toward: 'K', text: 'Spending less than I planned feels good, even by a little.' },
  { id: 's6', axis: 'po', toward: 'O', text: 'I learn money things best by trying them, then fixing what did not work.' },
  { id: 's7', axis: 'gv', toward: 'V', text: 'A good bet with some risk excites me more than a sure thing.' },
  { id: 's8', axis: 'xs', toward: 'S', text: 'I would rather enjoy my money now than wait decades for it.' },
  { id: 's9', axis: 'ek', toward: 'E', text: 'Asking for a raise, a higher rate or a new client feels normal to me.' },
  { id: 's10', axis: 'po', toward: 'P', text: 'I read or watch a lot about money before I make a choice.' },
  { id: 's11', axis: 'gv', toward: 'G', text: 'I keep extra cash around even when people say it should be invested.' },
  { id: 's12', axis: 'xs', toward: 'S', text: 'I like my work, or want to, and do not picture stopping completely.' },
];
export const ANSWERS = [[1, 'Agree'], [0, 'Neutral'], [-1, 'Disagree']];

// The 16 types: a name, a superpower, a shadow (what the strength costs when overdone), and the three skill trees
// (data/library/skills.json tree ids) it points to: one that feeds the superpower and the others that cover the shadow.
export const TYPES = {
  EPGX: { name: 'the Steady Climber', superpower: 'Grows income on a plan and protects every gain.', shadow: 'Can plan the climb so long that investing starts late.', trees: ['income-career', 'main-path', 'cash-safety-net'] },
  EPGS: { name: 'the Careful Provider', superpower: 'Earns well and turns it into a safe, comfortable life.', shadow: 'Comfort can quietly cap what gets saved.', trees: ['income-career', 'insurance-protection', 'time-capital'] },
  EPVX: { name: 'the Strategist', superpower: 'Researches bold moves and makes them count.', shadow: 'Research can turn into waiting for the perfect bet.', trees: ['entrepreneurship', 'tax-strategy', 'main-path'] },
  EPVS: { name: 'the Architect', superpower: 'Designs big plans that also feel good to live.', shadow: 'Big plans can run ahead of the cash.', trees: ['entrepreneurship', 'knowledge', 'cash-safety-net'] },
  EOGX: { name: 'the Grinder', superpower: 'Works hard and stacks safe progress, month after month.', shadow: 'Can trade every hour for money and lose sight of the finish line.', trees: ['side-hustles', 'main-path', 'time-capital'] },
  EOGS: { name: 'the Provider', superpower: 'Shows up, earns, and takes care of people.', shadow: 'The money can go to everyone else before it is saved.', trees: ['income-career', 'social-capital', 'insurance-protection'] },
  EOVX: { name: 'the Hustler', superpower: 'Spots chances and acts fast to get free sooner.', shadow: 'Too many bets at once, and no buffer when one misses.', trees: ['entrepreneurship', 'side-hustles', 'cash-safety-net'] },
  EOVS: { name: 'the Adventurer', superpower: 'Makes money and makes memories.', shadow: 'The next adventure can eat the savings.', trees: ['side-hustles', 'deals-smart-buying', 'cash-safety-net'] },
  KPGX: { name: 'the Quiet Builder', superpower: 'Spends less than comes in, every month, on a written plan.', shadow: 'So careful that the money never gets to work.', trees: ['main-path', 'cash-safety-net', 'portfolio-design'] },
  KPGS: { name: 'the Keeper', superpower: 'Knows where every dollar is, and sleeps fine.', shadow: 'Can say no to joy the plan could easily pay for.', trees: ['financial-ops-tooling', 'insurance-protection', 'money-psychology'] },
  KPVX: { name: 'the Optimizer', superpower: 'Gets the most out of every account and rule on the way to work optional.', shadow: 'Can chase the last 1% and miss the bigger lever, income.', trees: ['tax-strategy', 'portfolio-design', 'income-career'] },
  KPVS: { name: 'the Curator', superpower: 'Spends little on most things and boldly on a few.', shadow: 'The bold picks can skip the safety net.', trees: ['deals-smart-buying', 'portfolio-design', 'cash-safety-net'] },
  KOGX: { name: 'the Frugal Doer', superpower: 'Cuts costs by doing it now, not by reading about it.', shadow: 'Can skip the plan and miss the bigger accounts.', trees: ['deals-smart-buying', 'main-path', 'knowledge'] },
  KOGS: { name: 'the Homesteader', superpower: 'Makes a good life on a little, by hand.', shadow: 'The savings may never be put to work.', trees: ['deals-smart-buying', 'cash-safety-net', 'main-path'] },
  KOVX: { name: 'the Scrapper', superpower: 'Lean living plus quick moves, to get out early.', shadow: 'Quick moves with money that should stay safe.', trees: ['real-estate', 'deals-smart-buying', 'insurance-protection'] },
  KOVS: { name: 'the Free Spirit', superpower: 'Lives light and says yes to life.', shadow: 'No plan yet for the lean years.', trees: ['geo-arbitrage-location', 'time-capital', 'cash-safety-net'] },
};
// The trees each pole leans toward, for the full ranked tilt after a type's own three.
export const POLE_TREES = {
  E: ['income-career', 'side-hustles', 'entrepreneurship'], K: ['deals-smart-buying', 'cash-safety-net', 'financial-ops-tooling'],
  P: ['knowledge', 'tax-strategy', 'portfolio-design'], O: ['financial-ops-tooling', 'side-hustles', 'real-estate'],
  G: ['cash-safety-net', 'insurance-protection', 'debt-leverage'], V: ['alternatives-speculation', 'entrepreneurship', 'real-estate'],
  X: ['main-path', 'pre-retirement-design', 'withdrawal-decumulation'], S: ['time-capital', 'money-psychology', 'social-capital'],
};
// The 25 trees in library order, with names (test/identity.test.js checks them against data/library/skills.json).
export const TREES = [
  ['main-path', 'Main Path'], ['portfolio-design', 'Portfolio Design'], ['tax-strategy', 'Tax Strategy'], ['real-estate', 'Real Estate'],
  ['income-career', 'Income and Career'], ['side-hustles', 'Side Hustles'], ['entrepreneurship', 'Entrepreneurship'], ['credit-cards', 'Credit and Cards'],
  ['deals-smart-buying', 'Deals and Smart Buying'], ['cash-safety-net', 'Cash and Safety Net'], ['debt-leverage', 'Debt and Leverage'],
  ['alternatives-speculation', 'Alternatives and Speculation'], ['insurance-protection', 'Insurance and Protection'], ['geo-arbitrage-location', 'Geo-Arbitrage and Location'],
  ['health-longevity', 'Health and Longevity'], ['family-generational-wealth', 'Family and Generational Wealth'], ['withdrawal-decumulation', 'Withdrawal and Decumulation'],
  ['knowledge', 'Knowledge'], ['financial-ops-tooling', 'Financial Ops and Tooling'], ['money-psychology', 'Money Psychology'], ['time-capital', 'Time Capital'],
  ['social-capital', 'Social Capital'], ['pre-retirement-design', 'Pre-Retirement Design'], ['storms-windfalls', 'Storms and Windfalls'], ['the-long-game', 'The Long Game'],
];
// The one line the one-pager leads with: by what it is for (X, S, or a couple that differs) and how they hold risk.
export const LEADS = {
  'X:G': 'This plan leads with what stays safe, then the day work turns optional.',
  'X:V': 'This plan leads with the fastest honest path to work being optional.',
  'X:both': 'This plan leads with the day work turns optional, with a floor under it.',
  'S:G': 'This plan leads with a safe floor, then room to enjoy the money.',
  'S:V': 'This plan leads with the life the money pays for, on a floor that holds.',
  'S:both': 'This plan leads with the life the money pays for, and what keeps it safe.',
  'both:G': 'This plan leads with what stays safe, then both freedom later and joy now.',
  'both:V': 'This plan leads with what the money makes possible: freedom later and joy now.',
  'both:both': 'This plan leads with what you share: a safe floor, joy now and freedom later.',
};
// Couples: one concrete ask per partner, from the axis where the two differ most (each gets the ask for their pole).
export const ASKS = {
  E: 'Share one spending number each week, so the earning lands somewhere on purpose.',
  K: 'Ask for one thing that costs money and is just for joy, without explaining it.',
  P: 'Pick a date to act on the plan, even if it is not perfect yet.',
  O: 'Write the plan in one line before moving money, and show it to your partner.',
  G: 'Say yes to one move you would usually wait on, inside a limit you set together.',
  V: 'Before any bet over $500, wait two days and talk it through first.',
  X: 'Name one thing to enjoy this month that the plan already pays for.',
  S: 'Pick the year you would like work to be optional, and say it out loud together.',
};

// ---------- The Money Weather: 6 taps, Clear to Storm ----------
export const WEATHER_WINDOW = 'Over the last two weeks';
// up: true when "A lot" means calmer (the answer is turned around before it counts).
export const WEATHER_QUESTIONS = [
  { id: 'w1', text: 'Money has kept me up at night.' },
  { id: 'w2', text: 'I have put off opening a bill, a statement or a money app.' },
  { id: 'w3', text: 'I feel a knot when money comes up.' },
  { id: 'w4', text: 'I can think clearly about a money choice.', up: true },
  { id: 'w5', text: 'Money came up in a tense moment with someone close.' },
  { id: 'w6', text: 'I feel I have a handle on what is coming this month.', up: true },
];
export const WEATHER_ANSWERS = [[0, 'Not lately'], [1, 'Sometimes'], [2, 'A lot']];
// Levels by the score out of 12 (each answer 0 to 2): the most each level allows.
export const WEATHER_LEVELS = [
  { id: 'Clear', upTo: 2, word: 'Clear skies' },
  { id: 'Fair', upTo: 5, word: 'A few clouds' },
  { id: 'Overcast', upTo: 8, word: 'Clouds that stay a while' },
  { id: 'Storm', upTo: 12, word: 'Rough weather today' },
];
export const WEATHER_MIN = 4; // a weather shows once at least 4 of the 6 are answered (the rest can be skipped)
export const STORM_LINE = 'Storm today. It may help to slow the session down: one small step, and more time to talk.';
