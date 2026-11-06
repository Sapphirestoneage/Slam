// SPDX-License-Identifier: AGPL-3.0-only
// The pre-session intake (session 1 only): every question the Google Form asks, in order, in one place.
// tools/intake/build-form.mjs turns this into tools/intake/SLAMIntake.gs (Apps Script that makes the form), and
// js/intake.js reads the form's responses CSV back through it. Change a question here, rebuild the script
// (node tools/intake/build-form.mjs), and both sides follow; test/intake.test.js fails while they differ.
//
// How a question's answer finds its way back: the responses CSV has one column per question, headed by the
// question's title exactly (a grid adds " [row]"). So the title is the key, and this file is the id-to-title map.
// Titles are unique across the form (tested). A title Eli later edits in Google Forms can be added to aka, so older
// and newer responses both import; a column no title matches shows in the review as one SLAM could not place.
//
// A question: { id, title, help, type, required, choices, to, branch }.
//   type: text (a short answer), number (a short answer that takes a number), paragraph (optional words),
//     choice (tap one), checkbox (tap several, with Other), list (a dropdown), grid (one tap per row).
//   choices: [{ label, value, kind, goto }]. kind says what the answer is worth: range (a gut number: the range's
//     midpoint, status Gut), none (has none of it), unsure (I'm not sure: asked on the call), find (I'll find it and
//     tell you: a homework item). goto: the section a tap goes to next (Google Forms "Go to section based on answer").
//   to: where the answer lands in SLAM. ft: a Fast Track answer (js/fasttrack.js fastTrackAnswers keys); debt: a Fast
//     Track debt total [type, balance or payment]; profile: a Profile field (js/registry/fields.js); mode: the
//     household mode (js/registry/couples.js); why: Why now chips (profile.chips, chipOther); words: the question's
//     own words box (profile.whyNow, worry, goalWords); assume: a client
//     assumption; counts: blank rows by account type (the accounts gate); benefits, otherIncome, property, pay,
//     name and note are read by js/intake.js.
//   status: what the imported answer is marked. Gut (a range: Not sure in SLAM, shown as Guess), Roughly (a typed
//     number), Know it (a tap that answers a gate), homework (I'll find it: Will get it, on the Homework list).
// A section: { id, title, help, questions, next }. next: the section after it when no answer branches (or 'submit').

import { WHY_CHIPS } from '../whynow.js';

export const INTAKE = {
  title: 'SLAM: before our first session',
  description: 'A few questions before we meet, so our first call can go straight to your plan. It takes about 10 minutes. Only Eli sees your answers. Most questions are taps: a rough range is perfect, and "I\'m not sure" is a fine answer.',
  confirmation: 'Thank you! That is everything I need. See you on our call.',
  sheetName: 'SLAM intake responses',
};

// Answer kinds and the status each brings into SLAM (Gut is stored as Not sure, which shows as Guess).
export const KINDS = { range: 'Gut', exact: 'Roughly', tap: 'Know it', find: 'homework', unsure: 'ask', none: 'Know it' };
export const STATUS_IN_SLAM = { Gut: 'Not sure', Roughly: 'Roughly', homework: 'Will email' };
export const NOT_SURE = "I'm not sure";
export const FIND_IT = "I'll find it and tell you";

// A range choice: lo to hi, worth its midpoint; an open top (hi null) is worth a quarter over its floor. The values
// are written out as data so a test can check each one, and nothing here is a formula.
const r = (label, lo, hi, value) => ({ label, kind: 'range', lo, hi, value });
const unsure = (goto) => ({ label: NOT_SURE, kind: 'unsure', value: null, ...(goto ? { goto } : {}) });
const find = (goto) => ({ label: FIND_IT, kind: 'find', value: null, ...(goto ? { goto } : {}) });
const tap = (label, value, goto) => ({ label, kind: 'tap', value, ...(goto ? { goto } : {}) });
const none = (label, goto) => ({ label, kind: 'none', value: 0, ...(goto ? { goto } : {}) });
const go = (list, goto) => list.map(c => ({ ...c, goto }));
const YES_NO = [tap('Yes', true), tap('No', false)];

// The scales (a month unless the title says otherwise).
const SPEND = [r('Under $1,500', 0, 1500, 750), r('$1,500 to $2,500', 1500, 2500, 2000), r('$2,500 to $3,500', 2500, 3500, 3000), r('$3,500 to $5,000', 3500, 5000, 4250),
  r('$5,000 to $7,500', 5000, 7500, 6250), r('$7,500 to $10,000', 7500, 10000, 8750), r('Over $10,000', 10000, null, 12500)];
const CASH = [r('Under $500', 0, 500, 250), r('$500 to $1,000', 500, 1000, 750), r('$1,000 to $2,500', 1000, 2500, 1750), r('$2,500 to $5,000', 2500, 5000, 3750),
  r('$5,000 to $10,000', 5000, 10000, 7500), r('$10,000 to $25,000', 10000, 25000, 17500), r('$25,000 to $50,000', 25000, 50000, 37500),
  r('$50,000 to $100,000', 50000, 100000, 75000), r('Over $100,000', 100000, null, 125000)];
const INVESTED = [r('Under $5,000', 0, 5000, 2500), r('$5,000 to $25,000', 5000, 25000, 15000), r('$25,000 to $100,000', 25000, 100000, 62500),
  r('$100,000 to $250,000', 100000, 250000, 175000), r('$250,000 to $500,000', 250000, 500000, 375000), r('$500,000 to $1 million', 500000, 1000000, 750000),
  r('Over $1 million', 1000000, null, 1250000)];
const DEBT = [r('Under $1,000', 0, 1000, 500), r('$1,000 to $5,000', 1000, 5000, 3000), r('$5,000 to $10,000', 5000, 10000, 7500), r('$10,000 to $20,000', 10000, 20000, 15000),
  r('$20,000 to $50,000', 20000, 50000, 35000), r('$50,000 to $100,000', 50000, 100000, 75000), r('Over $100,000', 100000, null, 125000)];
const PAYMENT = [r('Under $100', 0, 100, 50), r('$100 to $250', 100, 250, 175), r('$250 to $500', 250, 500, 375), r('$500 to $1,000', 500, 1000, 750),
  r('$1,000 to $2,000', 1000, 2000, 1500), r('Over $2,000', 2000, null, 2500)];
const HOME = [r('Under $200,000', 0, 200000, 100000), r('$200,000 to $350,000', 200000, 350000, 275000), r('$350,000 to $500,000', 350000, 500000, 425000),
  r('$500,000 to $750,000', 500000, 750000, 625000), r('$750,000 to $1 million', 750000, 1000000, 875000), r('$1 million to $1.5 million', 1000000, 1500000, 1250000),
  r('Over $1.5 million', 1500000, null, 1875000)];
const MORTGAGE = [r('Under $100,000', 0, 100000, 50000), r('$100,000 to $250,000', 100000, 250000, 175000), r('$250,000 to $400,000', 250000, 400000, 325000),
  r('$400,000 to $600,000', 400000, 600000, 500000), r('$600,000 to $1 million', 600000, 1000000, 800000), r('Over $1 million', 1000000, null, 1250000)];
const HOUSE_PAY = [r('Under $1,000', 0, 1000, 500), r('$1,000 to $2,000', 1000, 2000, 1500), r('$2,000 to $3,000', 2000, 3000, 2500), r('$3,000 to $4,000', 3000, 4000, 3500),
  r('$4,000 to $6,000', 4000, 6000, 5000), r('Over $6,000', 6000, null, 7500)];
const CAR = [r('Under $5,000', 0, 5000, 2500), r('$5,000 to $10,000', 5000, 10000, 7500), r('$10,000 to $20,000', 10000, 20000, 15000), r('$20,000 to $35,000', 20000, 35000, 27500),
  r('$35,000 to $50,000', 35000, 50000, 42500), r('Over $50,000', 50000, null, 62500)];
const CAR_LOAN = [r('Under $5,000', 0, 5000, 2500), r('$5,000 to $10,000', 5000, 10000, 7500), r('$10,000 to $20,000', 10000, 20000, 15000), r('$20,000 to $35,000', 20000, 35000, 27500),
  r('Over $35,000', 35000, null, 43750)];
const CAR_PAY = [r('Under $250', 0, 250, 125), r('$250 to $400', 250, 400, 325), r('$400 to $600', 400, 600, 500), r('$600 to $800', 600, 800, 700), r('Over $800', 800, null, 1000)];
const OTHER_IN = [r('Under $500', 0, 500, 250), r('$500 to $1,000', 500, 1000, 750), r('$1,000 to $2,500', 1000, 2500, 1750), r('$2,500 to $5,000', 2500, 5000, 3750),
  r('Over $5,000', 5000, null, 6250)];
export const SCALES = { SPEND, CASH, INVESTED, DEBT, PAYMENT, HOME, MORTGAGE, HOUSE_PAY, CAR, CAR_LOAN, CAR_PAY, OTHER_IN };

// Why now: the same chips as About you › Why now (batch 10), word for word. Other takes the client's own words.
// Why now: the chips are About you's chips (js/whynow.js, batch 10), the same list, so the words can never drift.
// Other is Google Forms' own Other box; its words become the chip's Other words (profile.chipOther).
export const WHY = WHY_CHIPS;
const whyChoices = key => WHY[key].filter(c => c !== 'Other').map(c => tap(c, c)); // Other is Google Forms' own Other box

export const STATE_NAMES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
const YEARS = Array.from({ length: 2010 - 1935 + 1 }, (_, i) => 2010 - i);
// The investment account types the grid lists (Reference data's investmentTypes, in the client's words where needed).
export const ACCOUNT_ROWS = [['401(k)', '401(k)'], ['403(b)', '403(b)'], ['457', '457'], ['TSP', 'TSP'], ['Roth IRA', 'Roth IRA'], ['Traditional IRA', 'Traditional IRA'],
  ['Rollover IRA', 'Rollover IRA'], ['SEP', 'SEP IRA'], ['Solo 401(k)', 'Solo 401(k)'], ['HSA', 'HSA (health savings account)'], ['529', '529 (college savings)'],
  ['Brokerage', 'Brokerage (a regular investing account)'], ['Crypto', 'Crypto'], ['Other', 'Something else']];
export const ACCOUNT_COLUMNS = [['1', 1], ['2', 2], ['3 or more', 3]];

export const SECTIONS = [
  { id: 'about', title: 'About you', help: 'The basics.', next: 'why', questions: [
    { id: 'about.name', title: 'Your name', help: 'First and last.', type: 'text', required: true, to: { name: true }, status: 'Know it' },
    { id: 'about.born', title: 'What year were you born?', type: 'list', choices: YEARS.map(y => tap(String(y), y)), to: { profile: 'birthYear' }, status: 'Know it' },
    { id: 'about.state', title: 'Which state do you live in?', help: 'For taxes.', type: 'list', choices: Object.entries(STATE_NAMES).map(([k, v]) => tap(v, k)), to: { profile: 'state' }, status: 'Know it' },
    { id: 'about.household', title: 'Who is in your money picture?', type: 'choice', to: { mode: true }, status: 'Know it',
      choices: [tap('Just me', 'Solo'), tap('Me and someone I\'m dating', 'Dating'), tap('We live together', 'Living together'), tap('We\'re engaged', 'Engaged'),
        tap('Married, we keep money separate', 'Married separate'), tap('Married, we combine our money', 'Married merged')] },
    { id: 'about.kids', title: 'Do you have kids, or anyone else who depends on you?', type: 'choice', to: { profile: 'dependents' }, status: 'Know it',
      choices: [tap('No', 0), tap('1', 1), tap('2', 2), tap('3', 3), tap('4 or more', 4)] },
    { id: 'about.pets', title: 'Do you have pets?', type: 'choice', choices: YES_NO, to: { profile: 'hasPets' }, status: 'Know it' },
  ] },
  { id: 'why', title: 'Why now', help: 'Tap all that fit. There are no wrong answers.', next: 'work', questions: [
    { id: 'why.prompted', title: 'What made you reach out now?', type: 'checkbox', other: true, choices: whyChoices('whyNow'), to: { why: 'whyNow' }, status: 'Know it' },
    { id: 'why.promptedWords', title: 'Anything to add about why now? (in your own words)', help: 'Optional.', type: 'paragraph', to: { words: 'whyNow' }, status: 'Know it' },
    { id: 'why.worry', title: 'What worries you most about money?', type: 'checkbox', other: true, choices: whyChoices('worry'), to: { why: 'worry' }, status: 'Know it' },
    { id: 'why.worryWords', title: 'Anything to add about that worry? (in your own words)', help: 'Optional.', type: 'paragraph', to: { words: 'worry' }, status: 'Know it' },
    { id: 'why.goal', title: 'What would you love to get out of this?', type: 'checkbox', other: true, choices: whyChoices('goalWords'), to: { why: 'goalWords' }, status: 'Know it' },
    { id: 'why.goalWords', title: 'Anything to add about your goal? (in your own words)', help: 'Optional.', type: 'paragraph', to: { words: 'goalWords' }, status: 'Know it' },
  ] },
  { id: 'work', title: 'Work and pay', next: 'otherIncome', questions: [
    { id: 'work.situation', title: 'What is your work right now?', type: 'choice', to: { profile: 'workSituation' }, status: 'Know it',
      choices: [tap('A job (W-2)', 'Employed (W-2)'), tap('Self-employed or freelance', 'Self-employed'), tap('A job and self-employed', 'Mixed'), tap('Between jobs', 'Between jobs'),
        tap('Student', 'Student'), tap('Retired', 'Retired')] },
    { id: 'pay.takeHome', title: 'Your take-home pay', help: 'What lands in your account after taxes. Numbers only, like 2400. Leave it blank if you don\'t know yet.', type: 'number', to: { ft: 'takeHome' }, status: 'Roughly' },
    { id: 'pay.per', title: 'That take-home pay is', type: 'choice', to: { pay: true }, status: 'Know it',
      choices: [tap('Each paycheck, paid every week', { takePer: 'paycheck', payFrequency: 'week' }), tap('Each paycheck, paid every 2 weeks', { takePer: 'paycheck', payFrequency: '2 weeks' }),
        tap('Each paycheck, paid twice a month', { takePer: 'paycheck', payFrequency: 'twice a month' }), tap('A month, all paychecks together', { takePer: 'month' }),
        tap('A year', { takePer: 'year' }), unsure(), { label: 'I don\'t know my take-home yet, I\'ll find it and tell you', kind: 'find', value: null }] },
    { id: 'work.benefits', title: 'Through work, do you have a high-deductible health plan (with an HSA), an FSA, or stock as pay?', type: 'choice', to: { benefits: 'gate' }, status: 'Know it',
      choices: [tap('Yes, at least one', true, 'benefits'), tap('No', false, 'otherIncome'), unsure('otherIncome')] },
  ] },
  { id: 'benefits', title: 'Your benefits at work', next: 'otherIncome', questions: [
    { id: 'benefits.which', title: 'Which do you have?', help: 'Tap all that apply.', type: 'checkbox', to: { benefits: 'which' }, status: 'Know it',
      choices: [tap('A high-deductible health plan (you can use an HSA)', 'hsaEligible'), tap('An FSA (flexible spending account)', 'fsa'), tap('Stock as pay (RSUs, ESPP or options)', 'equityPay'), unsure()] },
  ] },
  { id: 'otherIncome', title: 'Other money coming in', next: 'spending', questions: [
    { id: 'income.other', title: 'Any other money coming in, besides that pay? About how much a month, all together?', type: 'choice', to: { otherIncome: 'amount' }, status: 'Gut',
      choices: [none('No, nothing else', 'spending'), ...go(OTHER_IN, 'otherIncomeFrom'), unsure('otherIncomeFrom'), find('otherIncomeFrom')] },
  ] },
  { id: 'otherIncomeFrom', title: 'Where it comes from', next: 'spending', questions: [
    { id: 'income.otherFrom', title: 'Where does that other money come from?', help: 'Tap all that apply.', type: 'checkbox', to: { otherIncome: 'type' }, status: 'Know it',
      choices: [tap('A side gig or freelance work', 'Side hustle'), tap('A rental property', 'Rental'), tap('My partner\'s pay', 'Partner job'), tap('Family', 'Money from family'), tap('Benefits (like disability or Social Security)', 'Benefits')] },
  ] },
  { id: 'spending', title: 'Spending and savings', help: 'Your gut is perfect here. We will firm it up together.', next: 'home', questions: [
    { id: 'spend.gut', title: 'About how much do you spend in a month, all in?', help: 'Rent, food, bills, fun, everything.', type: 'choice', choices: [...SPEND, unsure(), find()], to: { ft: 'gut' }, status: 'Gut' },
    { id: 'spend.includesDebt', title: 'Does that include your debt payments (like card or loan payments)?', type: 'choice', choices: [tap('Yes', true), tap('No', false), unsure()], to: { ft: 'gutIncludesDebt' }, status: 'Know it' },
    { id: 'cash.checking', title: 'About how much is in your checking account right now?', type: 'choice', choices: [none('$0'), ...CASH, unsure(), find()], to: { ft: 'checking' }, status: 'Gut' },
    { id: 'cash.savings', title: 'And in savings?', type: 'choice', choices: [none('$0, or I don\'t have a savings account'), ...CASH, unsure(), find()], to: { ft: 'savings' }, status: 'Gut' },
    { id: 'invest.total', title: 'About how much is in retirement and investment accounts, all together?', help: '401(k), IRA, HSA, brokerage, crypto.', type: 'choice', to: { ft: 'invested' }, status: 'Gut',
      choices: [none('None', 'home'), ...go(INVESTED, 'investAccounts'), unsure('investAccounts'), find('investAccounts')] },
  ] },
  { id: 'investAccounts', title: 'Your accounts', next: 'home', questions: [
    { id: 'invest.accounts', title: 'Which accounts do you have, and how many of each?', help: 'Skip any you don\'t have.', type: 'grid', rows: ACCOUNT_ROWS, columns: ACCOUNT_COLUMNS, to: { counts: true }, status: 'Know it' },
  ] },
  { id: 'home', title: 'Where you live', next: 'car', questions: [
    { id: 'home.housing', title: 'Do you rent or own where you live?', type: 'choice', to: { ft: 'housing' }, status: 'Know it',
      choices: [tap('Rent', 'Rent', 'car'), tap('Own', 'Own', 'homeOwn'), tap('I live with family', 'Family', 'car'), tap('Something else', 'Other', 'car')] },
  ] },
  { id: 'homeOwn', title: 'Your home', next: 'car', questions: [
    { id: 'home.value', title: 'About what is your home worth today?', type: 'choice', choices: [...HOME, unsure(), find()], to: { ft: 'homeValue' }, status: 'Gut' },
    { id: 'home.owed', title: 'About how much is left on the mortgage?', type: 'choice', choices: [{ label: 'Nothing, it\'s paid off', kind: 'none', value: 0, paidOff: true }, ...MORTGAGE, unsure(), find()], to: { ft: 'mortgageBalance' }, status: 'Gut' },
    { id: 'home.payment', title: 'About how much is the mortgage payment a month?', help: 'Skip it if the home is paid off.', type: 'choice', choices: [...HOUSE_PAY, unsure(), find()], to: { ft: 'mortgagePayment' }, status: 'Gut' },
  ] },
  { id: 'car', title: 'Your car', next: 'property', questions: [
    { id: 'car.value', title: 'Do you have a car? About what is it worth?', help: 'If you have more than one, all together.', type: 'choice', to: { ft: 'carValue' }, status: 'Gut',
      choices: [{ label: 'I don\'t have a car', kind: 'none', value: null, noCar: true, goto: 'property' }, ...go(CAR, 'carLoan'), unsure('carLoan'), find('carLoan')] },
  ] },
  { id: 'carLoan', title: 'Your car loan', next: 'property', questions: [
    { id: 'car.owed', title: 'About how much is left on the car loan?', type: 'choice', choices: [{ label: 'Nothing, it\'s paid off', kind: 'none', value: 0, paidOff: true }, ...CAR_LOAN, unsure(), find()], to: { ft: 'carLoanBalance' }, status: 'Gut' },
    { id: 'car.payment', title: 'About how much is the car payment a month?', help: 'Skip it if the car is paid off.', type: 'choice', choices: [...CAR_PAY, unsure(), find()], to: { ft: 'carLoanPayment' }, status: 'Gut' },
  ] },
  { id: 'property', title: 'Other property', next: 'debtCards', questions: [
    { id: 'property.value', title: 'Do you own any other property, like a rental or land? About what is it worth?', type: 'choice', to: { property: 'value' }, status: 'Gut',
      choices: [none('No', 'debtCards'), ...go(HOME, 'propertyLoan'), unsure('propertyLoan'), find('propertyLoan')] },
  ] },
  { id: 'propertyLoan', title: 'The loan on that property', next: 'debtCards', questions: [
    { id: 'property.owed', title: 'About how much is owed on that property?', type: 'choice', choices: [{ label: 'Nothing, it\'s paid off', kind: 'none', value: 0, paidOff: true }, ...MORTGAGE, unsure(), find()], to: { property: 'owed' }, status: 'Gut' },
    { id: 'property.payment', title: 'About how much is that loan payment a month?', help: 'Skip it if it\'s paid off.', type: 'choice', choices: [...HOUSE_PAY, unsure(), find()], to: { property: 'payment' }, status: 'Gut' },
  ] },
  { id: 'debtCards', title: 'Credit cards', help: 'No judgment here. A rough number helps us more than a perfect one.', next: 'debtStudent', questions: [
    { id: 'debt.cards', title: 'About how much do you owe on credit cards, all cards together?', help: 'What you carry month to month, not what you pay off in full.', type: 'choice', to: { debt: ['Credit card', 'balance'] }, status: 'Gut',
      choices: [none('I don\'t carry a balance', 'debtStudent'), ...go(DEBT, 'debtCardsPay'), unsure('debtCardsPay'), find('debtCardsPay')] },
  ] },
  { id: 'debtCardsPay', title: 'Credit card payments', next: 'debtStudent', questions: [
    { id: 'debt.cardsPay', title: 'About how much do you pay on your cards a month?', type: 'choice', choices: [...PAYMENT, unsure(), find()], to: { debt: ['Credit card', 'payment'] }, status: 'Gut' },
  ] },
  { id: 'debtStudent', title: 'Student loans', next: 'debtOther', questions: [
    { id: 'debt.student', title: 'About how much do you owe on student loans?', type: 'choice', to: { debt: ['Student loan', 'balance'] }, status: 'Gut',
      choices: [none('I don\'t have student loans', 'debtOther'), ...go(DEBT, 'debtStudentPay'), unsure('debtStudentPay'), find('debtStudentPay')] },
  ] },
  { id: 'debtStudentPay', title: 'Student loan payments', next: 'debtOther', questions: [
    { id: 'debt.studentPay', title: 'About how much do you pay on student loans a month?', help: 'Pick under $100 if they are paused.', type: 'choice', choices: [...PAYMENT, unsure(), find()], to: { debt: ['Student loan', 'payment'] }, status: 'Gut' },
  ] },
  { id: 'debtOther', title: 'Other debts', next: 'last', questions: [
    { id: 'debt.other', title: 'Any other debts, like a personal loan, medical bills, buy now pay later, or money owed to family? About how much, all together?', help: 'Not counting a mortgage or car loan.', type: 'choice', to: { debt: ['Personal loan', 'balance'] }, status: 'Gut',
      choices: [none('No other debts', 'last'), ...go(DEBT, 'debtOtherPay'), unsure('debtOtherPay'), find('debtOtherPay')] },
  ] },
  { id: 'debtOtherPay', title: 'Other debt payments', next: 'last', questions: [
    { id: 'debt.otherPay', title: 'About how much do you pay on those other debts a month?', type: 'choice', choices: [...PAYMENT, unsure(), find()], to: { debt: ['Personal loan', 'payment'] }, status: 'Gut' },
  ] },
  { id: 'last', title: 'Last one', next: 'submit', questions: [
    { id: 'fi.age', title: 'Someday, work could be optional. Around what age would you like that?', type: 'choice', to: { assume: 'fiAge' }, status: 'Gut',
      choices: [r('Before 40', null, 40, 37), r('40 to 49', 40, 49, 45), r('50 to 59', 50, 59, 55), r('60 to 64', 60, 64, 62), r('65 or later', 65, null, 67), tap('Just show me when I could', null)] },
    { id: 'anything.else', title: 'Anything else you want me to know before we meet?', help: 'Optional.', type: 'paragraph', to: { note: true }, status: 'Know it' },
  ] },
];

export const QUESTIONS = Object.fromEntries(SECTIONS.flatMap(s => s.questions.map(q => [q.id, { ...q, section: s.id }])));
export const sectionOf = id => SECTIONS.find(s => s.id === id) || null;

// The questions a client sees, given their taps (answers: { questionId: choice label }). An unanswered branching
// question follows the section's own next, the way Google Forms does.
export function pathOf(answers = {}) {
  const seen = [];
  let s = SECTIONS[0];
  const guard = new Set();
  while (s && !guard.has(s.id)) {
    guard.add(s.id);
    seen.push(...s.questions.map(q => q.id));
    const branching = s.questions.filter(q => q.choices?.some(c => c.goto)).at(-1);
    const picked = branching ? branching.choices.find(c => c.label === answers[branching.id]) : null;
    const next = picked?.goto ?? s.next;
    s = next === 'submit' ? null : sectionOf(next);
  }
  return seen;
}
