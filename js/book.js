// SPDX-License-Identifier: AGPL-3.0-only
// The books (start.html): what you owe, what you have, what comes in and what goes out, each as a short list sorted by
// kind. A section has its own Add button; a row asks the few things the plan needs first and keeps the rest behind
// More. No math here: every field is one the coach app already keeps on the same record (js/registry/fields.js), so
// both apps read one file and nothing is asked twice.
import { applyFastTrack } from './fasttrack.js';

const has = v => v !== null && v !== undefined && v !== '';
const num = v => (has(v) && Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : null);
const ymAt = (months, now = new Date()) => { const d = new Date(now.getFullYear(), now.getMonth() + months, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthsTo = (ym, now = new Date()) => { const [y, m] = String(ym).slice(0, 7).split('-').map(Number); return (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()); };
const yn = [['Yes', 'Yes'], ['No', 'No']];
const pickOf = list => list.map(x => (Array.isArray(x) ? x : [x, String(x)]));

// A field: { id (the record's own value), label, type: money | pct | pick | count, picks (tap amounts), options
// ([value, label]), unsure (a "Not sure" tap that lets a typical figure stand in), get/set (when it is not one value) }.
const balance = (picks = null, label = 'What you owe') => ({ id: 'balance', label, type: 'money', picks });
const apr = options => ({ id: 'apr', label: 'Interest rate', type: 'pct', options, unsure: true });
const payment = picks => ({ id: 'payment', label: 'What you pay a month', type: 'money', picks });
const promo = { id: 'promo', label: 'A 0% offer on it?', type: 'pick', options: [[0, 'No'], [3, '3 more months'], [6, '6 more months'], [12, '12 more months'], [18, '18 more months']],
  get: (r, now) => (r.values.promoEnd ? Math.max(0, monthsTo(r.values.promoEnd, now)) : has(r.values.apr) ? 0 : null),
  set: (store, r, v, now) => store.update(r.id, num(v) > 0 ? { promoApr: 0, promoEnd: ymAt(Math.round(num(v)), now) } : { promoApr: null, promoEnd: null }) };
const DAYS = [1, 5, 10, 15, 20, 25, 28];

const CARD_MORE = [promo,
  { id: 'payChoice', label: 'Each month you pay', type: 'pick', options: [['In full', 'All of it'], ['Custom', 'A set amount'], ['Minimum', 'The minimum']] },
  { id: 'limit', label: 'Credit limit', type: 'money', picks: [1000, 3000, 5000, 10000, 20000] },
  { id: 'minimum', label: 'Minimum payment', type: 'money', picks: [25, 35, 50, 100] },
  { id: 'dueDay', label: 'Due on day', type: 'pick', options: pickOf(DAYS) },
  { id: 'autopay', label: 'Autopay', type: 'pick', options: [['Full', 'Yes, in full'], ['Minimum', 'Yes, the minimum'], ['No', 'No']] },
  { id: 'annualFee', label: 'Yearly fee', type: 'money', picks: [0, 95, 250, 550] },
  { id: 'use', label: 'Personal or business', type: 'pick', options: pickOf(['Personal', 'Business']) }];
const LOAN_MORE = [
  { id: 'federal', label: 'Federal or private', type: 'pick', options: pickOf(['Federal', 'Private']) },
  { id: 'plan', label: 'Repayment plan', type: 'pick', options: pickOf(['Standard', 'IBR', 'RAP', 'PAYE', 'ICR', 'Graduated', 'Extended']), when: r => r.values.federal !== 'Private' },
  { id: 'pslf', label: 'Working toward Public Service Loan Forgiveness?', type: 'pick', options: pickOf(['Yes', 'No', 'Not sure']), when: r => r.values.federal !== 'Private' },
  { id: 'firstBorrowed', label: 'When you first borrowed', type: 'pick', options: pickOf(['Before July 2014', 'July 2014 to June 2026', 'July 2026 or later']), when: r => r.values.federal !== 'Private' },
  { id: 'forbearance', label: 'Paused right now?', type: 'pick', options: [['None', 'No, paying'], ['Forbearance', 'Forbearance'], ['Deferment', 'Deferment']] },
  { id: 'yearsLeft', label: 'Years left', type: 'pick', options: pickOf([2, 5, 8, 10, 15, 20, 25]) },
  { id: 'rateType', label: 'Fixed or adjustable rate', type: 'pick', options: pickOf(['Fixed', 'Adjustable']), when: r => r.values.federal === 'Private' }];
const TERM_MORE = years => [
  { id: 'yearsLeft', label: 'Years left', type: 'pick', options: pickOf(years) },
  { id: 'rateType', label: 'Fixed or adjustable rate', type: 'pick', options: pickOf(['Fixed', 'Adjustable']) },
  { id: 'dueDay', label: 'Due on day', type: 'pick', options: pickOf(DAYS) },
  { id: 'autopay', label: 'Autopay', type: 'pick', options: yn }];
const OTHER_TYPES = ['Personal loan', 'Medical', 'Family or friend', 'Buy now, pay later', 'Payday or cash advance', 'Tax debt', '401(k) loan', 'Business'];
const OTHER_MORE = [
  { id: 'monthsLeft', label: 'Months left', type: 'pick', options: pickOf([3, 6, 12, 24, 36, 60]) },
  { id: 'collections', label: 'In collections?', type: 'pick', options: [[true, 'Yes'], [false, 'No']] },
  { id: 'taxPlan', label: 'A payment plan in place?', type: 'pick', options: [[true, 'Yes'], [false, 'No']], when: r => r.type === 'Tax debt' },
  { id: 'dueDay', label: 'Due on day', type: 'pick', options: pickOf(DAYS) },
  { id: 'autopay', label: 'Autopay', type: 'pick', options: yn }];

export const DEBT_BOOK = {
  id: 'debt', kind: 'debt', title: 'What you owe', main: 'balance', empty: 'Nothing here.',
  sections: [
    { id: 'cards', title: 'Credit cards', one: 'Card', add: 'Add a credit card', types: ['Credit card'], names: ['Chase', 'Amex', 'Capital One', 'Citi', 'Discover', 'Bank of America', 'Wells Fargo', 'Store card'],
      front: [balance([500, 1000, 2500, 5000, 10000]), apr([0.17, 0.2, 0.22, 0.25, 0.29]), payment([50, 100, 200, 300, 500])], more: CARD_MORE },
    { id: 'student', title: 'Student loans', one: 'Student loan', add: 'Add a student loan', types: ['Student loan'], names: ['Federal', 'Nelnet', 'MOHELA', 'Aidvantage', 'EdFinancial', 'Sallie Mae', 'Private'],
      front: [balance([5000, 10000, 20000, 30000, 50000]), apr([0.03, 0.045, 0.055, 0.065, 0.08]), payment([100, 200, 300, 400, 600])], more: LOAN_MORE },
    { id: 'car', title: 'Car loans', one: 'Car loan', add: 'Add a car loan', types: ['Car loan'], names: [],
      front: [balance([5000, 10000, 15000, 20000, 30000]), apr([0.03, 0.05, 0.07, 0.09, 0.12]), payment([200, 300, 400, 500, 600])], more: TERM_MORE([1, 2, 3, 4, 5, 6]) },
    { id: 'home', title: 'Home loans', one: 'Mortgage', add: 'Add a mortgage', types: ['Mortgage'], names: [],
      front: [balance([100000, 200000, 300000, 400000, 600000]), apr([0.03, 0.04, 0.05, 0.06, 0.07]), payment([1200, 1800, 2400, 3000, 4000])], more: TERM_MORE([5, 10, 15, 20, 25, 30]) },
    { id: 'other', title: 'Other debts', one: 'Debt', add: 'Add another debt', types: OTHER_TYPES, names: [],
      front: [{ id: 'type', label: 'What kind', type: 'pick', options: pickOf(OTHER_TYPES), top: true }, balance([500, 1000, 2500, 5000, 10000]), apr([0, 0.05, 0.1, 0.15, 0.25]), payment([50, 100, 200, 300, 500])], more: OTHER_MORE },
  ],
};

// ---------- What you have: accounts by kind ----------
const bal = picks => ({ id: 'balance', label: 'What is in it', type: 'money', picks });
const kindOf = types => ({ id: 'type', label: 'What kind', type: 'pick', options: pickOf(types), top: true });
const BANKS = ['Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One', 'Ally', 'Marcus', 'SoFi', 'A credit union'];
const BROKERS = ['Fidelity', 'Vanguard', 'Schwab', 'Empower', 'Robinhood', 'E*Trade', 'Betterment', 'Wealthfront'];
const where = names => ({ id: 'institution', label: 'Where it is', type: 'pick', options: pickOf(names) });
const feePick = { id: 'fees', label: 'What the funds cost a year', type: 'pct', options: [0.0003, 0.001, 0.0025, 0.005, 0.01] };
const named = { id: 'beneficiary', label: 'A beneficiary named on it?', type: 'pick', options: yn };
const putIn = { id: 'contribution', label: 'What you put in a month', type: 'money', picks: [50, 100, 250, 500, 583],
  set: (store, r, v) => store.update(r.id, { contribution: num(v), contributionPer: num(v) == null ? null : 'Month' }) };
const CASH_TYPES = ['Checking', 'Savings', 'High-yield savings (often online)', 'Money market', 'CD', 'Cash on hand', 'Payment app'];
const WORK_TYPES = ['401(k)', '403(b)', '457', 'TSP'], IRA_TYPES = ['Roth IRA', 'Traditional IRA', 'Rollover IRA', 'SEP', 'Solo 401(k)'], OPEN_TYPES = ['Brokerage', 'Crypto', '529', 'Other', 'All investments'];
export const HAVE_BOOK = {
  id: 'have', kind: 'account', title: 'What you have', main: 'balance',
  sections: [
    { id: 'cash', title: 'Checking and savings', one: 'Account', add: 'Add an account', types: CASH_TYPES, group: 'cash', names: [],
      front: [kindOf(CASH_TYPES.map(t => (t === 'High-yield savings (often online)' ? [t, 'High-yield savings'] : t))), bal([500, 1000, 2500, 5000, 10000])],
      more: [where(BANKS), { id: 'apy', label: 'What it pays a year', type: 'pct', options: [0.0001, 0.005, 0.03, 0.04, 0.045] },
        { id: 'purpose', label: 'What it is for', type: 'pick', options: [['Emergency', 'Emergencies'], ['Sinking fund', 'Bills coming up'], ['Goal', 'A goal'], ['Taxes', 'Taxes I owe'], ['General', 'Everyday']] },
        { id: 'ownership', label: 'Yours or shared', type: 'pick', options: [['Individual', 'Mine'], ['Joint', 'Shared']] }] },
    { id: 'work', title: 'Plans at work', one: 'Work plan', add: 'Add a work plan', types: WORK_TYPES, group: 'investment', names: [],
      front: [kindOf(WORK_TYPES), bal([5000, 10000, 25000, 50000, 100000])],
      more: [{ id: 'planJob', label: 'From this job or an old one', type: 'pick', options: [['Current job', 'This job'], ['Old job', 'An old job']] },
        { id: 'taxType', label: 'Taxed later, Roth, or both', type: 'pick', options: [['Pretax', 'Taxed later'], ['Roth', 'Roth'], ['Both', 'Both']] },
        { id: 'unvested', label: 'Not yours yet (unvested)', type: 'money', picks: [0, 1000, 5000, 10000] }, where(BROKERS), feePick, named] },
    { id: 'ira', title: 'IRAs', one: 'IRA', add: 'Add an IRA', types: IRA_TYPES, group: 'investment', names: [],
      front: [kindOf(IRA_TYPES), bal([1000, 5000, 10000, 25000, 50000])],
      more: [putIn, { id: 'contributionsYtd', label: 'Put in so far this year', type: 'money', picks: [0, 1000, 3500, 7000] },
        { id: 'rothBasis', label: 'What you have put in over the years (not growth)', type: 'money', picks: null, when: r => r.type === 'Roth IRA' }, where(BROKERS), feePick, named] },
    { id: 'open', title: 'Brokerage and other investing', one: 'Account', add: 'Add an account', types: OPEN_TYPES, group: 'investment', names: [],
      front: [kindOf(OPEN_TYPES.filter(t => t !== 'All investments')), bal([1000, 5000, 10000, 25000, 50000])],
      more: [putIn, { id: 'costBasis', label: 'What you paid for what is in it', type: 'money', picks: null }, { id: 'autoInvest', label: 'Invests on its own each month?', type: 'pick', options: [[true, 'Yes'], [false, 'No']] }, where(BROKERS), feePick,
        { id: 'ownership', label: 'Yours or shared', type: 'pick', options: [['Individual', 'Mine'], ['Joint', 'Shared']] }] },
    { id: 'hsa', title: 'Health savings (HSA)', one: 'HSA', add: 'Add an HSA', types: ['HSA'], group: 'investment', names: [],
      front: [bal([500, 1000, 2500, 5000, 10000])],
      more: [{ id: 'hsaInvested', label: 'How much of it is invested', type: 'money', picks: null }, { id: 'hsaYtd', label: 'Put in so far this year', type: 'money', picks: [0, 1000, 2000, 4400] }, where(['Fidelity', 'HealthEquity', 'Optum', 'HSA Bank', 'Lively']), feePick] },
  ],
};

// ---------- What comes in ----------
const PAY_LABEL = r => (r.per === 'week' ? 'A week' : r.per === 'paycheck' ? 'A paycheck, after taxes' : r.values?.basis === 'Gross' ? 'A year, before taxes' : 'A month, after taxes');
const amount = (picks, label = 'A month') => ({ id: 'amount', label, type: 'money', picks, top: true });
const pay = picks => ({ ...amount(picks), labelOf: PAY_LABEL });
const JOB_MORE = [
  { id: 'payFrequency', label: 'How often you get paid', type: 'pick', options: [['week', 'Every week'], ['2 weeks', 'Every 2 weeks'], ['twice a month', 'Twice a month'], ['month', 'Once a month']] },
  { id: 'incomeType', label: 'How it is taxed', type: 'pick', options: [['W-2', 'A paycheck with taxes taken out (W-2)'], ['1099', 'No taxes taken out (1099)']] },
  { id: 'contributionPct', label: 'Share of pay going into a 401(k)', type: 'pct', options: [0, 0.03, 0.05, 0.06, 0.1, 0.15] },
  { id: 'hasMatch', label: 'Does the job match it?', type: 'pick', options: [['Yes', 'Yes'], ['No', 'No'], ["Don't know", 'Not sure']] },
  { id: 'bonus', label: 'A yearly bonus', type: 'money', picks: [0, 1000, 5000, 10000] },
  { id: 'bonusMonth', label: 'The month it lands', type: 'pick', options: pickOf(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']), when: r => num(r.values.bonus) > 0 },
  { id: 'raisePct', label: 'A usual raise each year', type: 'pct', options: [0, 0.02, 0.03, 0.05] },
  { id: 'premium', label: 'Health insurance out of each paycheck', type: 'money', picks: [0, 50, 100, 200] },
  { id: 'hsaFsa', label: 'HSA or FSA out of each paycheck', type: 'money', picks: [0, 25, 50, 100] }];
const SIDE_MORE = [
  { id: 'incomeType', label: 'How it is taxed', type: 'pick', options: [['1099', 'No taxes taken out (1099)'], ['Business', 'My own business'], ['W-2', 'A paycheck (W-2)']] },
  { id: 'platform', label: 'A platform it comes through', type: 'pick', options: pickOf(['OnlyFans', 'Fansly', 'Patreon', 'Etsy', 'Uber', 'DoorDash', 'Upwork', 'Other']) },
  { id: 'feePct', label: 'The cut the platform takes', type: 'pct', options: [0.05, 0.1, 0.2, 0.25], when: r => has(r.values.platform) },
  { id: 'chargebacks', label: 'Refunds and chargebacks a month', type: 'money', picks: [0, 25, 50, 100], when: r => has(r.values.platform) }];
const SIDE_TYPES = ['Side hustle', 'Self-employed', 'Platform'], OTHER_IN = ['Rental', 'Money from family', 'Benefits', 'Unemployment', 'From partner'];
const takeHome = { per: 'month', values: { basis: 'Take-home' } };
export const IN_BOOK = {
  id: 'in', kind: 'income', title: 'What comes in', main: 'amount', mainTop: true, per: r => (r.per === 'paycheck' ? 'a paycheck' : r.per === 'week' ? 'a week' : r.values?.basis === 'Gross' ? 'a year' : 'a month'),
  sections: [
    { id: 'jobs', title: 'Jobs', one: 'Job', add: 'Add a job', types: ['Job', 'Partner job'], names: [], blank: takeHome, front: [pay([2000, 3000, 4000, 5000, 6500])], more: JOB_MORE },
    { id: 'side', title: 'Side work', one: 'Side work', add: 'Add side work', types: SIDE_TYPES, names: ['Freelance', 'Tutoring', 'Driving', 'Selling online', 'Babysitting', 'Content'], blank: takeHome,
      front: [pay([100, 250, 500, 1000, 2000])], more: [kindOf(SIDE_TYPES), ...SIDE_MORE] },
    { id: 'other', title: 'Other money in', one: 'Money in', add: 'Add other money in', types: OTHER_IN, names: [], blank: takeHome, front: [kindOf(OTHER_IN), pay([100, 250, 500, 1000, 2000])], more: [] },
  ],
};

// ---------- What goes out: lines beside the rough number ----------
const lineMore = [
  { id: 'amountType', label: 'The same every month?', type: 'pick', options: [['Fixed', 'Yes, the same'], ['Variable', 'It moves around']] },
  { id: 'dueDay', label: 'Due on day', type: 'pick', options: pickOf(DAYS) },
  { id: 'whoPays', label: 'Who pays it', type: 'pick', options: [['Me', 'Me'], ['Split', 'Split with someone'], ['Covered by someone', 'Someone covers it']] }];
const outSec = (id, letter, title, names, picks) => ({ id, title, one: 'Line', add: 'Add a line', types: [], letter, match: r => (letter === 'Other' ? !['Accommodation', 'Food', 'Transportation', 'Bills', 'Wants', 'Debt', 'Retirement'].includes(r.values?.draftt) : r.values?.draftt === letter),
  names, nameFirst: true, plainNames: true, blank: { per: 'month', status: 'Roughly', values: { draftt: letter } }, front: [amount(picks)], more: lineMore });
export const OUT_BOOK = {
  id: 'out', kind: 'bill', title: 'What goes out', main: 'amount', mainTop: true, keep: r => !['Debt', 'Retirement'].includes(r.values?.draftt),
  sections: [
    outSec('housing', 'Accommodation', 'Home', ['Rent', 'Mortgage', 'Electric and gas', 'Internet', 'Renters insurance', 'Water'], [50, 100, 800, 1200, 1600, 2000]),
    outSec('food', 'Food', 'Food', ['Groceries', 'Eating out', 'Coffee', 'Delivery'], [50, 100, 200, 400, 600]),
    outSec('transport', 'Transportation', 'Getting around', ['Transit', 'Gas', 'Car insurance', 'Rides', 'Parking'], [50, 100, 150, 250, 400]),
    outSec('bills', 'Bills', 'Bills and subscriptions', ['Phone', 'Streaming', 'Gym', 'Apps', 'Health insurance'], [10, 20, 50, 100, 200]),
    outSec('wants', 'Wants', 'Fun', ['Going out', 'Travel', 'Shopping', 'Hobbies', 'Gifts'], [50, 100, 200, 400]),
    outSec('other', 'Other', 'Everything else', ['Therapy', 'Childcare', 'Pets', 'Giving', 'Medical', 'Something else'], [50, 100, 200, 400]),
  ],
};
export const BOOKS = { debt: DEBT_BOOK, have: HAVE_BOOK, in: IN_BOOK, out: OUT_BOOK };

// ---------- reading ----------
const sectionOf = (book, r) => book.sections.find(s => (s.match ? s.match(r) : s.types.includes(r.type))) ?? (book.kind === 'debt' ? book.sections.find(s => s.id === 'other') : book.kind === 'account' ? book.sections.find(s => s.group === r.values?.group) : null) ?? null;
const rowsIn = (doc, book, sec) => (doc.records || []).filter(r => r.kind === book.kind && sectionOf(book, r) === sec && (book.keep ? book.keep(r) : true));
export const fieldValue = (r, f, now = new Date()) => (f.get ? f.get(r, now) : f.top ? (f.id === 'type' && !f.options.some(([v]) => v === r.type) ? null : r[f.id] ?? null) : f.id === 'apr' && r.fieldStatus?.apr === 'Not sure' ? null : r.values?.[f.id] ?? null);
const unsureOn = (r, f) => !!f.unsure && r.fieldStatus?.[f.id] === 'Not sure';
const shown = (r, f) => !f.when || f.when(r);
// One row as the screen shows it: what is answered, what the plan still wants (todo), and how many extras are filled.
export function rowOf(r, sec, book, now = new Date()) {
  const front = sec.front.filter(f => shown(r, f)), more = sec.more.filter(f => shown(r, f));
  const todo = front.filter(f => fieldValue(r, f, now) == null && !unsureOn(r, f)).map(f => f.id);
  return { id: r.id, name: r.name, type: r.type, linked: !!r.linkedTo, main: num(book.mainTop ? r[book.main] : r.values?.[book.main]), per: book.per ? book.per(r) : null, todo, ready: todo.length === 0, guessed: front.filter(f => unsureOn(r, f)).map(f => f.id),
    extras: more.filter(f => fieldValue(r, f, now) != null).length, of: more.length, rec: r };
}
// The whole book: [{ ...section, rows, total }], and totals across it.
export function bookOf(doc, book, { now = new Date() } = {}) {
  const sections = book.sections.map(sec => { const rows = rowsIn(doc, book, sec).map(r => rowOf(r, sec, book, now)); return { ...sec, rows, total: rows.reduce((s, r) => s + (r.main ?? 0), 0) }; });
  const rows = sections.flatMap(s => s.rows);
  return { sections, count: rows.length, total: rows.reduce((s, r) => s + (r.main ?? 0), 0), todo: rows.filter(r => !r.ready).length, next: rows.find(r => !r.ready)?.id ?? null };
}

// ---------- writing ----------
const totalName = name => /\(total\)$/.test(name ?? '');
// Add one row to a section. A total typed earlier ("Credit cards (total)") becomes the first of them, so a second card
// sits beside it. A car loan or a mortgage is kept on the car or the home, as the coach app keeps it.
export function addRow(store, book, sectionId, { name = null } = {}) {
  const sec = book.sections.find(s => s.id === sectionId);
  return store.transaction(`Add: ${sec.one}`, () => {
    const rows = rowsIn(store.doc, book, sec);
    const first = rows.find(r => totalName(r.name)); if (first) store.update(first.id, { name: `${sec.one} 1` });
    const label = name ?? (sec.nameFirst ? null : book.kind === 'account' ? sec.types[0] : `${sec.one}${rows.length || sec.id === 'cards' || sec.id === 'student' ? ` ${rows.length + 1}` : ''}`);
    if (book.kind === 'debt' && (sec.id === 'car' || sec.id === 'home') && !rows.some(r => r.linkedTo)) {
      applyFastTrack(store, sec.id === 'car' ? { hasCar: true, carLoanBalance: 0 } : { housing: 'Own', homeLoan: 'Mortgage' });
      const asset = store.doc.records.find(r => r.kind === 'asset' && r.type === (sec.id === 'car' ? 'Car' : 'Home'));
      const made = store.doc.records.find(r => r.kind === 'debt' && r.linkedTo === asset?.id);
      if (made) { store.update(made.id, { balance: null }); return made; }
    }
    const blank = sec.blank ?? {};
    const made = store.add(book.kind, { name: label, ...blank, values: { ...(blank.values || {}), ...(sec.group ? { group: sec.group } : {}) } }, { type: sec.types[0] ?? null });
    if (book.kind === 'account') store.setDoc('profile', { areas: { ...(store.doc.profile.areas || {}), [sec.group === 'cash' ? 'cash' : 'investments']: true } });
    if (book.kind === 'debt') { store.setDoc('profile', { areas: { ...(store.doc.profile.areas || {}), debt: true } }); }
    return made;
  });
}
// One answer on one row. A rate that is typed is known; a card with a set payment is carried, not paid in full.
export function setField(store, id, f, value, { now = new Date() } = {}) {
  const r = store.doc.records.find(x => x.id === id); if (!r) return;
  store.transaction('Edit', () => {
    if (f.set) return f.set(store, r, value, now);
    const v = f.type === 'money' || f.type === 'pct' || f.type === 'count' ? num(value) : value;
    if (f.top) { store.update(id, { [f.id]: v, ...(f.id === 'type' && (!has(r.name) || r.name === r.type || r.type === 'All investments') ? { name: v } : {}) }); return; }
    // A total typed earlier ("Investments, all accounts") shrinks as the accounts inside it are listed, so nothing counts twice.
    if (r.kind === 'account' && r.values.group === 'investment' && r.type !== 'All investments' && f.id === 'balance') {
      const rest = store.doc.records.find(x => x.kind === 'account' && x.type === 'All investments');
      if (rest) { const left = Math.max(0, (rest.values.balance ?? 0) - ((v ?? 0) - (r.values.balance ?? 0))); if (left > 0) store.update(rest.id, { balance: left, name: 'Not listed yet' }); else store.remove(rest.id); }
    }
    store.update(id, { [f.id]: v });
    if (f.unsure) store.setFieldStatus(id, f.id, v == null ? null : 'Know it');
    if (r.kind === 'debt' && r.type === 'Credit card' && f.id === 'payment' && v != null && r.values.payChoice == null) store.update(id, { payChoice: 'Custom' });
  });
}
// "Not sure": a typical figure stands in, marked as a guess, until the real one is known.
export function setUnsure(store, id, f) { store.transaction('Not sure', () => { store.update(id, { [f.id]: null }); store.setFieldStatus(id, f.id, 'Not sure'); }); }
export function renameRow(store, id, name) { const r = store.doc.records.find(x => x.id === id); if (has(name) && r) store.update(id, { name, ...(r.kind === 'bill' ? { category: name } : {}) }); }
// Take a row off. A loan on a home or car comes off with the home or car marked paid off.
export function removeRow(store, id) {
  const r = store.doc.records.find(x => x.id === id); if (!r) return;
  store.transaction('Deleted', () => { if (r.linkedTo) store.update(r.linkedTo, { financed: 'Paid off' }); store.remove(id); });
}

// ---------- How sure, and where a number lives ----------
// The coach app's levels, in plain words: a guess (Gut), roughly (Rough), known (Know it). A statement makes it solid.
export const SURE = [['Not sure', 'A guess'], ['Roughly', 'Roughly'], ['Know it', 'I know it']];
export const sureOf = r => r.status ?? null;
export function setSure(store, id, status) { store.transaction('How sure', () => { store.setStatus(id, status); if (status === 'Know it') { const r = store.doc.records.find(x => x.id === id); for (const k of Object.keys(r?.fieldStatus || {})) if (r.fieldStatus[k] === 'Not sure' && has(r.values?.[k])) store.setFieldStatus(id, k, null); } }); }
const BOOK_OF_KIND = { income: 'in', bill: 'out', account: 'have', debt: 'owe' };
// Where one piece of the whole picture (js/math/picture.js) is answered in the self-serve app:
// { stage, q } for one of the five questions, { stage: 'books', book, row } for a line, { stage: 'you' } for the age.
export function whereOf(doc, it) {
  if (it.id === 'age' || it.id === 'areas') return { stage: 'you' };
  const r = it.recId ? (doc.records || []).find(x => x.id === it.recId) : null;
  if (r?.kind === 'spending' || it.group === 'spending' && !r) return it.kind === 'category' ? { stage: 'books', book: 'out', row: null } : { stage: 'numbers', q: 'spending' };
  if (r && BOOK_OF_KIND[r.kind]) return { stage: 'books', book: BOOK_OF_KIND[r.kind], row: r.id };
  if (r?.kind === 'asset') return { stage: 'sharpen', flash: 'own' };
  return { stage: 'numbers', q: it.group === 'income' ? 'income' : it.group === 'debt' ? 'card' : it.sub === 'invested' ? 'invested' : it.group === 'account' ? 'cash' : 'spending' };
}
