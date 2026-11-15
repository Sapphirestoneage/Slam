// SPDX-License-Identifier: AGPL-3.0-only
// Test Drive (start.html, behind ?dev=1): made-up people as answer scripts. A script is the list of answers a person
// would tap, in order, and every answer is saved through the journey's own functions (answer, answerBenefit, a level's
// write), so a script exercises the same code a real person does. One script does three jobs: load in one tap, a
// step-by-step walk that says what happened and why, and the headless run in test/testdrive.test.js.
// No math here: every number shown comes from planOf (js/journey.js), the journey's own answer.
import { Store, newHousehold } from './records.js';
import { QUESTIONS, answer, answerBenefit, setSituation, planOf, progressOf, questionsFor } from './journey.js';
import { levelOf, levelsOf, levelsFor } from './sharpen.js';
import { mathById } from './registry/math.js';

const has = v => v !== null && v !== undefined && v !== '';

// ---------- The people ----------
// Each: who they are in one line (always "Made up."), their steps, and what a person works out by hand at two points
// (after the five questions, and at the end). `hand` numbers are plain arithmetic from the answers, written out in
// `note`, so they are a second opinion on the app. Pinned numbers (fixtures/testdrive-pins.json) are what the app said
// when the script was last signed off, so a change in the math shows up as a difference to look at.
// Ages are counted back from this year, so a script reads the same next year as it does today.
const age = (years, place = {}) => ({ kind: 'profile', values: { birthYear: new Date().getFullYear() - years, ...place } });
const q = (key, values) => ({ kind: 'answer', key, values });
const none = key => ({ kind: 'answer', key, values: {}, none: true });
const lv = (id, values) => ({ kind: 'level', id, values });
const NY = { state: 'NY', nyc: false }, NYC = { state: 'NY', nyc: true }, NJ = { state: 'NJ', nyc: null };

export const PERSONAS = [
  { id: 'deep-debt', name: 'Dana', short: 'Deep in debt', about: 'Made up. 32, steady job, three cards at different rates (one on a 0% offer), a payday-style loan, almost nothing in the bank.',
    steps: [age(32, NY), q('spending', { gut: 3400 }), q('income', { takeHome: 3600 }), q('card', { 'Credit card': 9400, 'Personal loan': 1800 }), q('cash', { checking: 300, savings: 0 }), none('invested'),
      lv('where', { rent: 1400, food: 500, transport: 250 }),
      lv('owe', { 'count:Credit card': 3, 'bal:Credit card:0': 5200, 'apr:Credit card:0': 0.29, 'pay:Credit card:0': 160, 'promo:Credit card:0': 0, 'bal:Credit card:1': 3000, 'apr:Credit card:1': 0.25, 'pay:Credit card:1': 90, 'promo:Credit card:1': 0,
        'bal:Credit card:2': 1200, 'apr:Credit card:2': 0.22, 'pay:Credit card:2': 40, 'promo:Credit card:2': 6, 'apr:Personal loan:0': 0.36, 'pay:Personal loan:0': 150 }),
      lv('work', { contributionPct: 0, match: 'm0' }), lv('time', { paid: 45, commute: 5, costs: 100 }),
      lv('own', { housing: 'Rent', hasCar: true, carValue: 5000, carLoanBalance: 0 }), lv('taxes', { filingStatus: 'Single' }),
      lv('safety', { incomeStability: 'Steady', healthCoverage: 'Employer' }), lv('finish', { fiAge: 65, retirementSpending: 3000, partTimeIncome: 0 })],
    hand: { level1: { netWorth: [-10900, '300 in the bank, minus 9,400 on cards, minus 1,800 on the loan'], surplus: [200, '3,600 in, 3,400 out'], owed: [11200, '9,400 plus 1,800'] },
      end: { netWorth: [-5900, 'the same, plus a car worth 5,000'], owed: [11200, 'three cards (5,200, 3,000, 1,200) plus 1,800'] } } },

  { id: 'high-earner', name: 'Marcus', short: 'High pay, no savings', about: 'Made up. 38, in New York City, big paycheck and spending that grew to match it, one card carried month to month.',
    steps: [age(38, NYC), q('spending', { gut: 11200 }), q('income', { takeHome: 11500 }), q('card', { 'Credit card': 6000 }), q('cash', { checking: 4000, savings: 1000 }), q('invested', { invested: 22000 }),
      lv('where', { rent: 4200, food: 1500, transport: 400 }), lv('owe', { 'apr:Credit card:0': 0.25, 'pay:Credit card:0': 300, 'promo:Credit card:0': 0 }),
      lv('work', { contributionPct: 0.03, match: 'm3' }), lv('accounts', { k401: 22000 }), lv('time', { paid: 60, commute: 5, costs: 400 }),
      lv('own', { housing: 'Rent', hasCar: false }), lv('taxes', { filingStatus: 'Single' }), lv('safety', { incomeStability: 'Steady', healthCoverage: 'Employer' }),
      lv('finish', { fiAge: 55, retirementSpending: 9000, partTimeIncome: 0 })],
    hand: { level1: { netWorth: [21000, '5,000 in the bank plus 22,000 invested, minus 6,000 on the card'], surplus: [300, '11,500 in, 11,200 out'], owed: [6000, 'one card'] },
      end: { netWorth: [21000, 'no home or car, so the same'], owed: [6000, 'one card'] } } },

  { id: 'freelancer', name: 'Priya', short: 'Freelancer, lumpy pay', about: 'Made up. 35, in New Jersey, works for herself, pay moves around, nothing invested yet, a car loan.',
    steps: [age(35, NJ), q('spending', { gut: 4300 }), q('income', { takeHome: 5200 }), none('card'), q('cash', { checking: 2500, savings: 6000 }), none('invested'),
      lv('where', { rent: 1600, food: 600, transport: 300 }), lv('work', { contributionPct: 0, match: 'none' }), lv('time', { paid: 50, commute: 0, costs: 200 }),
      lv('own', { housing: 'Rent', hasCar: true, carValue: 10000, carLoanBalance: 6000, carLoanApr: 0.07, carLoanPayment: 300 }), lv('taxes', { filingStatus: 'Single' }),
      lv('safety', { incomeStability: 'Unpredictable', healthCoverage: 'ACA' }), lv('finish', { fiAge: 60, retirementSpending: 4000, partTimeIncome: 1000 })],
    hand: { level1: { netWorth: [8500, '2,500 plus 6,000 in the bank, nothing owed'], surplus: [900, '5,200 in, 4,300 out'], owed: [0, 'no debt'] },
      end: { netWorth: [12500, '8,500, plus a car worth 10,000, minus 6,000 left on its loan'], owed: [6000, 'the car loan'] } } },

  { id: 'between-jobs', name: 'Sam', short: 'Between jobs', about: 'Made up. 30, laid off, on unemployment for 20 more weeks, a job expected to start in 2 months, a student loan.',
    steps: [age(30, NY), { kind: 'situation', id: 'between' }, { kind: 'benefit', values: { weekly: 504, weeks: 20 } }, q('spending', { gut: 2900 }), q('cash', { checking: 1500, savings: 4000 }), q('invested', { invested: 12000 }), q('card', { 'Student loan': 18000 }),
      lv('safety', { incomeStability: 'Unpredictable', healthCoverage: 'ACA' }), lv('ahead', { months: 2, grossYear: 70000 }), lv('where', { rent: 1300, food: 450, transport: 150 }),
      lv('owe', { 'apr:Student loan:0': 0.055, 'pay:Student loan:0': 190 }), lv('accounts', { k401: 9000, roth: 3000 }), lv('own', { housing: 'Rent', hasCar: false }),
      lv('taxes', { filingStatus: 'Single' }), lv('finish', { fiAge: 60, retirementSpending: 3000, partTimeIncome: 500 })],
    hand: { level1: { netWorth: [-500, '5,500 in the bank plus 12,000 invested, minus 18,000 on the loan'], owed: [18000, 'one student loan'] },
      end: { netWorth: [-500, 'no home or car, so the same'], owed: [18000, 'one student loan'] } } },

  { id: 'homeowner', name: 'Renee', short: 'Home, car, three accounts', about: 'Made up. 46, in New Jersey, a home with a mortgage, a car loan, investments in three kinds of account, files jointly.',
    steps: [age(46, NJ), q('spending', { gut: 6900 }), q('income', { takeHome: 8200 }), q('card', { 'Credit card': 2500 }), q('cash', { checking: 6000, savings: 14000 }), q('invested', { invested: 185000 }),
      lv('where', { rent: 2600, food: 900, transport: 500 }), lv('owe', { 'apr:Credit card:0': 0.22, 'pay:Credit card:0': 250, 'promo:Credit card:0': 0 }),
      lv('work', { contributionPct: 0.1, match: 'm2' }), lv('accounts', { k401: 140000, roth: 25000, brokerage: 20000 }), lv('time', { paid: 40, commute: 8, costs: 200 }),
      lv('own', { housing: 'Own', homeValue: 520000, mortgageBalance: 310000, mortgageApr: 0.04, mortgagePayment: 2100, hasCar: true, carValue: 20000, carLoanBalance: 9000, carLoanApr: 0.05, carLoanPayment: 400 }),
      lv('taxes', { filingStatus: 'Married jointly' }), lv('safety', { incomeStability: 'Steady', healthCoverage: 'Employer' }), lv('finish', { fiAge: 60, retirementSpending: 6000, partTimeIncome: 0 })],
    hand: { level1: { netWorth: [202500, '20,000 in the bank plus 185,000 invested, minus 2,500 on the card'], surplus: [1300, '8,200 in, 6,900 out'], owed: [2500, 'one card'] },
      end: { netWorth: [423500, '202,500, plus a 520,000 home minus 310,000 owed, plus a 20,000 car minus 9,000 owed'], owed: [321500, '2,500 card, 310,000 mortgage, 9,000 car'] } } },

  { id: 'young-roth', name: 'Jordan', short: 'Young, Roth only', about: 'Made up. 24, in New York City, no debt, no plan at work, puts money in a Roth IRA and nothing else.',
    steps: [age(24, NYC), q('spending', { gut: 2900 }), q('income', { takeHome: 3900 }), none('card'), q('cash', { checking: 2000, savings: 5000 }), q('invested', { invested: 14000 }),
      lv('where', { rent: 1300, food: 450, transport: 130 }), lv('work', { contributionPct: 0, match: 'none' }), lv('accounts', { roth: 14000 }), lv('time', { paid: 40, commute: 5, costs: 100 }),
      lv('own', { housing: 'Rent', hasCar: false }), lv('taxes', { filingStatus: 'Single' }), lv('safety', { incomeStability: 'Steady', healthCoverage: "Parent's plan" }),
      lv('finish', { fiAge: 50, retirementSpending: 2800, partTimeIncome: 1000 })],
    hand: { level1: { netWorth: [21000, '7,000 in the bank plus 14,000 invested'], surplus: [1000, '3,900 in, 2,900 out'], owed: [0, 'no debt'] },
      end: { netWorth: [21000, 'no home or car, so the same'], owed: [0, 'no debt'] } } },

  { id: 'near-coast', name: 'Alex', short: 'Close to Coast FI', about: 'Made up. 36, saves hard, a good amount invested, a student loan under 8% that is not in a hurry.',
    steps: [age(36, NY), q('spending', { gut: 4200 }), q('income', { takeHome: 6800 }), q('card', { 'Student loan': 24000 }), q('cash', { checking: 5000, savings: 20000 }), q('invested', { invested: 210000 }),
      lv('where', { rent: 1700, food: 600, transport: 300 }), lv('owe', { 'apr:Student loan:0': 0.05, 'pay:Student loan:0': 260 }), lv('work', { contributionPct: 0.15, match: 'm3' }),
      lv('accounts', { k401: 150000, roth: 40000, brokerage: 20000 }), lv('time', { paid: 45, commute: 5, costs: 150 }), lv('own', { housing: 'Rent', hasCar: true, carValue: 10000, carLoanBalance: 0 }),
      lv('taxes', { filingStatus: 'Single' }), lv('safety', { incomeStability: 'Steady', healthCoverage: 'Employer' }), lv('finish', { fiAge: 55, retirementSpending: 4000, partTimeIncome: 1000 })],
    hand: { level1: { netWorth: [211000, '25,000 in the bank plus 210,000 invested, minus 24,000 on the loan'], surplus: [2600, '6,800 in, 4,200 out'], owed: [24000, 'one student loan'] },
      end: { netWorth: [221000, '211,000 plus a car worth 10,000'], owed: [24000, 'one student loan'] } } },

  { id: 'not-sure', name: 'Casey', short: 'Does not know the numbers', about: 'Made up. 28, has never looked closely: two gut numbers, taps the none button for the rest, and stops partway through the levels.',
    steps: [age(28, { state: null, nyc: null }), q('spending', { gut: 3000 }), q('income', { takeHome: 3300 }), none('card'), none('cash'), none('invested'),
      lv('own', { housing: 'Family', hasCar: false }), lv('taxes', { filingStatus: 'Single' }), lv('safety', { incomeStability: 'Varies', healthCoverage: 'Employer' })], leavesOpen: ['where', 'work', 'time', 'finish'],
    hand: { level1: { netWorth: [0, 'nothing in the bank, nothing invested, nothing owed'], surplus: [300, '3,300 in, 3,000 out'], owed: [0, 'no debt'] },
      end: { netWorth: [0, 'the same'], owed: [0, 'no debt'] } } },
];
export const personaOf = id => PERSONAS.find(p => p.id === id) ?? null;

// ---------- Playing a script ----------
// One step through the journey's own save functions. Returns false when the journey saved nothing (a finding).
export function applyStep(store, step, ref, { now = new Date() } = {}) {
  if (step.kind === 'profile') { store.setDoc('profile', step.values); return true; }
  if (step.kind === 'situation') { setSituation(store, step.id); return true; }
  if (step.kind === 'benefit') return answerBenefit(store, step.values, { now });
  if (step.kind === 'answer') return answer(store, step.key, step.values, { none: !!step.none });
  if (step.kind === 'level') {
    const L = levelOf(step.id); if (!L) return false;
    L.write(store, { ...L.read(store.doc, ref), ...step.values }, ref); // what is on file, plus this person's answers (as the form does)
    return true;
  }
  return false;
}

// Which level of the journey a step belongs to, as this person sees it: 1 for the five questions, then the number on
// the level's own card (between jobs the order differs, so it is read from the file).
export function levelNumber(doc, step) {
  if (step.kind !== 'level') return 1;
  return levelsFor(doc).find(l => l.def.id === step.id)?.n ?? null;
}
// The screen where a step's answer shows, for the walk: { stage, q, flash, anchor }.
export function whereOf(step) {
  if (step.kind === 'profile' || step.kind === 'situation') return { stage: 'you', anchor: step.kind === 'profile' ? '.st-years, .st-card:not(.hero) .st-chips' : '[data-td="situation"], .st-card:not(.hero)' };
  if (step.kind === 'answer' || step.kind === 'benefit') return { stage: 'numbers', q: step.kind === 'benefit' ? 'income' : step.key, anchor: '.st-boxes, .st-book' };
  return { stage: 'sharpen', flash: step.id, anchor: `#level-${step.id}` };
}

// ---------- What the plan says right now ----------
// The handful of numbers the walk watches, straight from the journey's plan. Null before there is an age.
export const WATCH = [
  ['netWorth', 'Net worth', 'money', 'M40'], ['surplus', 'Left each month', 'money', 'M27'], ['owed', 'Owed in total', 'money', 'M40'],
  ['fiAge', 'Work optional at age', 'age', 'M53'], ['fi', 'Work optional', 'words', 'M53'], ['debtFree', 'Debt free', 'words', 'M34'],
  ['step', 'Next step', 'words', 'M69'], ['sharp', 'Levels done', 'words', null],
];
export function numbersNow(doc, ref, priors, { flags = [], now = new Date() } = {}) {
  const pl = planOf(doc, ref, priors, { flags, now });
  if (!pl) return null;
  const x = pl.m.inputs, p = progressOf(doc, ref, { now }), L = levelsOf(doc);
  return { netWorth: pl.m.netWorth?.value ?? null, surplus: pl.m.surplus?.value ?? null, owed: (x.debts || []).reduce((t, d) => t + (d.balance ?? 0), 0),
    fiAge: pl.fi?.age ?? null, fi: pl.words?.fi ?? null, debtFree: pl.words?.debtFree ?? null, step: pl.step?.name ?? null,
    sharp: `${L.filter(l => l.state !== 'open').length + (p.done ? 1 : 0)} of ${L.length + 1}`, basis: pl.basis, typical: pl.typical };
}
const same = (a, b, unit) => (unit === 'money' && typeof a === 'number' && typeof b === 'number' ? Math.round(a) === Math.round(b) : a === b);
// What moved between two readings: [{ key, label, unit, before, after }]. The first reading (no age yet) lists everything.
export function changesOf(before, after) {
  if (!after) return [];
  return WATCH.filter(([k, , unit]) => !before || !same(before[k], after[k], unit)).map(([key, label, unit, rule]) => ({ key, label, unit, rule, before: before ? before[key] : null, after: after[key] }));
}

// ---------- Why it happened ----------
// Plain words for each kind of step, and the rule behind it by its name in the math registry (js/registry/math.js).
const WHY = {
  profile: ['An age alone is enough for a first plan. Everything not answered yet uses what is typical for that age and place, and says so.', ['M53', 'M50']],
  situation: ['Being between jobs changes the journey itself: the pay question asks what is coming in now, and the levels about a job are left out.', ['M42']],
  benefit: ['Unemployment is counted as what comes in each month until the week it ends, so the plan shows how long the money lasts.', ['M01', 'M42']],
  'answer:spending': ['Spending sets two things at once: what is left each month, and how big the finish line is (the less a life costs, the less it takes to pay for it).', ['M27', 'M50']],
  'answer:income': ['Pay minus spending is what is left each month. That one number drives every date in the plan.', ['M27', 'M53']],
  'answer:card': ['What is owed comes off net worth, and debt at 8% or more moves to the front of the line, so the next step can change.', ['M40', 'M69', 'M34']],
  'answer:cash': ['Money in the bank adds to net worth and fills the cushion, which decides which step comes next.', ['M40', 'M68', 'M69']],
  'answer:invested': ['Money already invested has a head start: it keeps growing on its own, so the date work becomes optional moves closer.', ['M40', 'M53', 'M54']],
  'level:where': ['The three needs (housing, food, getting around) become lines of their own, so the plan knows the floor a life cannot go under.', ['M2A', 'M51']],
  'level:owe': ['Each debt gets its own rate and payment, so the payoff date and the interest are real instead of a guess, and the order to pay them in is known.', ['M31', 'M32', 'M34', 'M37']],
  'level:work': ['What goes into a plan at work, and what the job adds, is saving the paycheck never showed. It raises the true savings rate.', ['M15', 'M28']],
  'level:accounts': ['The same total, split by kind of account: taxed later, never taxed, taxed as you go. It decides what can be reached before 59 and a half.', ['M62']],
  'level:time': ['The hours a job really takes, and what it costs to do it, turn pay into a real hourly wage. Any price can then be said in hours.', ['M17', 'M58']],
  'level:own': ['A home and a car, and what is owed on them, complete net worth. A loan added here never reopens the debt level.', ['M40', 'M62']],
  'level:taxes': ['How a person files sets the tax brackets, so the rate on the next dollar is known.', ['M10', 'M14']],
  'level:safety': ['How steady pay is, and the health cover, size the big cushion: shakier pay asks for more months set aside.', ['M43', 'M68']],
  'level:finish': ['Life after work has its own price. The finish line is rebuilt on that spending, and part-time pay lowers what the investments have to carry.', ['M50', 'M52', 'M53']],
  'level:ahead': ['The job ahead is one expected pay number as a placeholder. The plan counts it from the month it starts and checks the money covers the gap.', ['M42', 'M12']],
};
export function whyOf(step) {
  const [plain, rules] = WHY[step.kind === 'answer' ? `answer:${step.key}` : step.kind === 'level' ? `level:${step.id}` : step.kind] ?? ['', []];
  return { plain, rules: rules.map(id => ({ id, name: mathById(id)?.name ?? id })) };
}
// What was entered, in plain words (the answer itself, never a number worked out).
const money = n => `$${Math.round(n).toLocaleString('en-US')}`;
export function whatOf(step, doc = null) {
  if (step.kind === 'profile') return `Born in ${step.values.birthYear}${step.values.state ? `, lives in ${step.values.nyc ? 'New York City' : step.values.state}` : ', lives somewhere else'}.`;
  if (step.kind === 'situation') return step.id === 'between' ? 'Tapped "I am between jobs".' : 'Tapped "I have a job".';
  if (step.kind === 'benefit') return `Unemployment of ${money(step.values.weekly)} a week, for ${step.values.weeks} more weeks.`;
  if (step.kind === 'answer') {
    const Q = (doc ? questionsFor(doc) : QUESTIONS).find(x => x.key === step.key) ?? QUESTIONS.find(x => x.key === step.key);
    if (step.none) return `${Q.title} Tapped "${Q.none ?? 'None'}".`;
    return `${Q.title} ${Q.boxes.filter(b => has(step.values[b.id])).map(b => `${b.label}: ${money(step.values[b.id])}`).join(', ')}.`;
  }
  const L = levelOf(step.id);
  return `${L.title}: ${Object.keys(step.values).length} ${Object.keys(step.values).length === 1 ? 'answer' : 'answers'} saved.`;
}

// ---------- Checks: by hand, and pinned ----------
// At two points (after the five questions, at the end) the app's numbers are held against the hand arithmetic, and
// against what the app said when the script was last signed off (pins). [{ key, label, kind, expected, got, ok, note }].
export const TOL = { money: 1, age: 1 };
export function checkpointOf(persona, i) {
  const steps = persona.steps, lastFirst = steps.reduce((at, s, k) => (s.kind !== 'level' ? k : at), -1);
  return i === steps.length - 1 ? 'end' : i === lastFirst ? 'level1' : null;
}
export function checksOf(persona, i, numbers, pins = null) {
  const at = checkpointOf(persona, i); if (!at || !numbers) return [];
  const out = [];
  for (const [key, [expected, note]] of Object.entries(persona.hand?.[at] ?? {})) {
    const got = numbers[key], label = WATCH.find(w => w[0] === key)[1];
    out.push({ key, label, kind: 'hand', unit: 'money', expected, got, ok: typeof got === 'number' && Math.abs(got - expected) <= TOL.money, note });
  }
  for (const [key, expected] of Object.entries(pins?.[persona.id]?.[at] ?? {})) {
    const got = numbers[key], [, label, unit] = WATCH.find(w => w[0] === key);
    const ok = unit === 'age' && typeof got === 'number' && typeof expected === 'number' ? Math.abs(got - expected) <= TOL.age : got === expected;
    out.push({ key, label, kind: 'pin', unit, expected, got, ok, note: 'What the app said when this script was last signed off.' });
  }
  return out;
}

// ---------- The whole run, headless ----------
// Plays a script from a blank file. Returns the store and a trail: one entry per step with what was entered, what
// moved, why, the checks, and which of this person's levels are still open at the end.
export function runPersona(persona, ref, priors, { flags = [], now = new Date(), upTo = null, pins = null } = {}) {
  const store = new Store(newHousehold({ name: `Test drive: ${persona.name}` }));
  store.who = 'Client';
  const trail = [];
  let before = null;
  const last = upTo == null ? persona.steps.length - 1 : Math.min(upTo, persona.steps.length - 1);
  for (let i = 0; i <= last; i++) {
    const step = persona.steps[i], saved = applyStep(store, step, ref, { now });
    const after = numbersNow(store.doc, ref, priors, { flags, now });
    trail.push({ i, step, saved, level: levelNumber(store.doc, step), what: whatOf(step, store.doc), why: whyOf(step), changes: changesOf(before, after), numbers: after, checks: checksOf(persona, i, after, pins) });
    before = after;
  }
  const levels = levelsOf(store.doc);
  return { store, trail, levels, open: levels.filter(l => l.state === 'open').map(l => l.id), progress: progressOf(store.doc, ref, { now }) };
}
// The step index that finishes everything before level n (so "Jump to level n" lands with n ready to answer).
export function stepBeforeLevel(persona, n, ref) {
  if (n <= 1) return -1;
  const store = new Store(newHousehold({ name: 'x' }));
  let at = -1;
  for (let i = 0; i < persona.steps.length; i++) {
    const s = persona.steps[i];
    if (s.kind === 'level' && (levelNumber(store.doc, s) ?? 99) >= n) break;
    applyStep(store, s, ref); at = i;
  }
  return at;
}
// The pins for one script: what the app says today at the two checkpoints (tools/testdrive/pin.mjs writes the file).
export function pinsOf(persona, ref, priors, opts = {}) {
  const { trail } = runPersona(persona, ref, priors, opts), out = {};
  for (const t of trail) { const at = checkpointOf(persona, t.i); if (at && t.numbers) out[at] = { step: t.numbers.step, fiAge: t.numbers.fiAge }; }
  return out;
}

// ---------- The issue log ----------
// One tap flags a step; chips say what kind and how much it matters. Everything else is filled in by the walk.
export const REASONS = ['Number looks off', 'Confusing wording', 'Layout', 'Missing something', 'Too slow', 'Other'];
export const SEVERITIES = ['Breaks the task', 'Annoying', 'Cosmetic'];
const cell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const ISSUE_COLUMNS = ['when', 'severity', 'reason', 'persona', 'level', 'step', 'screen', 'what', 'changed', 'checks', 'width', 'note'];
export function issuesCsv(issues) {
  return [ISSUE_COLUMNS.join(','), ...issues.map(x => ISSUE_COLUMNS.map(c => cell(x[c])).join(','))].join('\n');
}
// The fix prompt: only what breaks the task, as one batch, ready to paste.
export function fixPrompt(issues) {
  const list = issues.filter(x => x.severity === SEVERITIES[0]);
  if (!list.length) return '';
  return ['SLAM: fixes from a Test Drive walk (Slam repo, start.html)', '',
    'Read CLAUDE.md first. Fix every item below in one run, keep each fix small, run node --test and the layout check, then commit and push. Questions go in a list at the end.', '',
    ...list.map((x, i) => `${i + 1}. [${x.reason}] ${x.persona}, level ${x.level ?? 1}, step ${x.step}, screen ${x.screen} (${x.width}px wide)\n   Entered: ${x.what}\n   Moved: ${x.changed || 'nothing'}${x.checks ? `\n   Checks: ${x.checks}` : ''}${x.note ? `\n   Note: ${x.note}` : ''}`),
    '', 'To see each one: open start.html?dev=1, pick the person, and use Jump to level.'].join('\n');
}
