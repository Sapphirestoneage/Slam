// The pre-session intake (session 1): the questions registry, the generated Google Apps Script, and the import of
// the responses CSV. Made-up data only (fixtures/intake-sample.csv: Alexis Sample and Tom Example).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SECTIONS, QUESTIONS, WHY, SCALES, pathOf, NOT_SURE, FIND_IT } from '../js/registry/intake.js';
import { readIntake, planIntake, applyIntake, meaningOf, checkedOf, keptLines, columnsOf } from '../js/intake.js';
import { buildScript, formData } from '../tools/intake/build-form.mjs';
import { Store, newHousehold, statusOf } from '../js/records.js';
import { fastTrackAnswers } from '../js/fasttrack.js';
import { homeworkList } from '../js/homework.js';
import { metrics } from '../js/math/metrics.js';
import { levelOf } from '../js/math/picture.js';
import { LEVELS } from '../js/registry/program.js';
import { MODES } from '../js/registry/couples.js';
import { WORK, HOUSING } from '../js/gates.js';
import { WHY_CHIPS, whyText } from '../js/whynow.js';

const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root)));
const CSV = readFileSync(new URL('fixtures/intake-sample.csv', root), 'utf8');
const NOW = '2026-11-05T12:00:00Z';
const imported = name => {
  const r = readIntake(CSV).responses.find(x => x.name === name);
  const store = new Store(newHousehold({ name, now: NOW }), { now: () => NOW });
  const plan = planIntake(r, store.doc);
  applyIntake(store, plan, { ref, now: NOW });
  return store;
};
const ALEXIS = { 'work.benefits': 'No', 'income.other': 'No, nothing else', 'invest.total': 'None', 'home.housing': 'Rent', 'car.value': "I don't have a car",
  'property.value': 'No', 'debt.cards': '$1,000 to $5,000', 'debt.student': "I don't have student loans", 'debt.other': 'No other debts' };
const TOM = { 'work.benefits': 'Yes, at least one', 'income.other': '$1,000 to $2,500', 'invest.total': '$250,000 to $500,000', 'home.housing': 'Own',
  'car.value': '$20,000 to $35,000', 'property.value': '$200,000 to $350,000', 'debt.cards': "I don't carry a balance", 'debt.student': '$10,000 to $20,000', 'debt.other': 'No other debts' };

test('the registry: unique ids and titles, every target is a real SLAM key, every branch goes to a section', () => {
  const ids = Object.keys(QUESTIONS), titles = Object.values(QUESTIONS).map(q => q.title.toLowerCase());
  assert.equal(new Set(titles).size, titles.length, 'titles are the CSV column headers, so they must be unique');
  assert.equal(new Set(SECTIONS.map(s => s.id)).size, SECTIONS.length);
  const sections = new Set([...SECTIONS.map(s => s.id), 'submit']);
  const ftKeys = Object.keys(fastTrackAnswers(new Store(newHousehold()).doc));
  for (const s of SECTIONS) {
    assert.ok(sections.has(s.next), `${s.id} next`);
    for (const q of s.questions) {
      assert.match(q.id, /^[a-z]+\.[A-Za-z]+$/, q.id);
      assert.ok(['Gut', 'Roughly', 'Know it'].includes(q.status), `${q.id} status`);
      if (q.to.ft) assert.ok(ftKeys.includes(q.to.ft), `${q.id}: ${q.to.ft} is a Fast Track answer`);
      for (const c of q.choices || []) { if (c.goto) assert.ok(sections.has(c.goto), `${q.id} > ${c.goto}`); if (c.kind === 'range') assert.ok(c.value > 0, `${q.id} ${c.label}`); }
    }
  }
  // Taps land on the values SLAM itself uses.
  assert.ok(QUESTIONS['about.household'].choices.every(c => MODES[c.value]));
  assert.ok(QUESTIONS['work.situation'].choices.every(c => WORK.includes(c.value)));
  assert.ok(QUESTIONS['home.housing'].choices.every(c => HOUSING.includes(c.value)));
  assert.ok(ids.length > 0);
});

test('every range is worth its midpoint (an open top: a quarter over its floor)', () => {
  for (const [name, list] of Object.entries(SCALES)) for (const c of list) {
    const want = c.hi === null ? c.lo * 1.25 : (c.lo + c.hi) / 2;
    assert.equal(c.value, want, `${name} ${c.label}`);
  }
});

test('Why now: the chips are About you\'s chips, word for word, and each question has Other and its own words box', () => {
  for (const key of Object.keys(WHY)) {
    const q = Object.values(QUESTIONS).find(x => x.to.why === key);
    assert.deepEqual([...q.choices.map(c => c.label), 'Other'], WHY_CHIPS[key]);
    assert.equal(WHY[key], WHY_CHIPS[key]);
    assert.equal(q.type, 'checkbox'); assert.equal(q.other, true);
    assert.ok(Object.values(QUESTIONS).some(x => x.to.words === key && x.type === 'paragraph'));
  }
});

test('mapping: a range to its midpoint as Gut, a typed number to Roughly, I\'ll find it to homework, Not sure to ask', () => {
  const q = QUESTIONS['spend.gut'];
  assert.deepEqual(meaningOf(q, '$2,500 to $3,500').value, 3000);
  assert.equal(meaningOf(q, '$2,500 to $3,500').status, 'Gut');
  assert.equal(meaningOf(q, 'Over $10,000').value, 12500);
  assert.equal(meaningOf(q, FIND_IT).status, 'homework');
  assert.equal(meaningOf(q, NOT_SURE).kind, 'unsure');
  assert.equal(meaningOf(q, 'something else').kind, 'unknown');
  const pay = QUESTIONS['pay.takeHome'];
  assert.deepEqual([meaningOf(pay, '$4,210.50').value, meaningOf(pay, '$4,210.50').status], [4210.5, 'Roughly']);
  assert.deepEqual([meaningOf(pay, '2400').value, meaningOf(pay, '2400').status], [2400, 'Roughly']);
  assert.equal(meaningOf(QUESTIONS['cash.checking'], '$0').value, 0);
});

test('mapping: Why now checkboxes split into chips, commas inside a chip kept, the rest is Other', () => {
  const q = QUESTIONS['why.prompted'];
  const { picked, other } = checkedOf(q, 'Big life change (engaged, married, baby, divorce, move), Windfall or raise, I got a new job offer');
  assert.deepEqual(picked.map(c => c.value), ['Big life change (engaged, married, baby, divorce, move)', 'Windfall or raise']);
  assert.equal(other, 'I got a new job offer');
  assert.deepEqual(meaningOf(q, 'Debt feels out of control').value, ['Debt feels out of control']);
});

test('mapping: gates', () => {
  const store = imported('Alexis Sample');
  const p = store.doc.profile;
  assert.deepEqual([p.mode, p.household, store.doc.client.couple, p.hasCar, p.housing, p.workSituation, p.hsaEligible, p.fsa, p.equityPay, p.dependents, p.hasPets],
    ['Solo', 'Solo', false, false, 'Rent', 'Employed (W-2)', false, false, false, 0, true]);
  assert.deepEqual(p.areas, { cash: true, real: false, debt: true, investments: false });
  const t = imported('Tom Example').doc.profile;
  assert.deepEqual([t.mode, t.household, t.hsaEligible, t.fsa, t.equityPay, t.dependents, t.state], ['Married merged', 'Couple', true, false, true, 2, 'NJ']);
});

test('the form: Alexis\'s path is short, Tom\'s branches into more, both stay within session 1', () => {
  const a = pathOf(ALEXIS), t = pathOf(TOM);
  assert.equal(a.length, 31);
  assert.equal(t.length, 41);
  assert.ok(!a.includes('benefits.which') && !a.includes('home.value') && !a.includes('car.owed') && !a.includes('invest.accounts'));
  assert.ok(t.includes('benefits.which') && t.includes('invest.accounts') && t.includes('property.owed') && t.includes('income.otherFrom'));
  assert.equal(Object.keys(QUESTIONS).length, 43);
  // The generated script carries every question, and its branches.
  const data = formData();
  assert.equal(data.sections.flatMap(s => s.questions).length, 43);
  assert.equal(data.title, 'SLAM: before our first session');
  const branching = data.sections.flatMap(s => s.questions).filter(q => q.choices?.some(c => c.length > 1));
  assert.ok(branching.every(q => q.required && q.choices.every(c => c.length === 2)), 'a branching question names every choice\'s section');
});

test('SLAMIntake.gs is current, says how to run it, and has no em dash', () => {
  const file = readFileSync(new URL('tools/intake/SLAMIntake.gs', root), 'utf8');
  assert.equal(file, buildScript(), 'Rebuild it: node tools/intake/build-form.mjs');
  assert.match(file, /^\/\/ SLAM: before our first session/);
  assert.match(file, /createSlamIntake\(\)/);
  assert.match(file, /setDestination\(FormApp\.DestinationType\.SPREADSHEET/);
  assert.ok(!file.includes(String.fromCharCode(0x2014)));
});

test('reading the CSV: every column placed, newest response first, a reworded column reported', () => {
  const res = readIntake(CSV);
  assert.deepEqual([res.problem, res.unknown], [null, []]);
  assert.deepEqual(res.responses.map(r => r.name), ['Tom Example', 'Alexis Sample']);
  assert.deepEqual(columnsOf(['Timestamp', 'Your name', 'What is your favorite color?']).unknown, ['What is your favorite color?']);
  assert.match(readIntake('a,b\n1,2\n').problem, /No column/);
});

test('round trip: Alexis\'s answers land as Fast Track numbers, with the right levels and homework', () => {
  const store = imported('Alexis Sample');
  const ft = fastTrackAnswers(store.doc);
  assert.deepEqual([ft.firstName, ft.birthYear, ft.takeHome, ft.takePer, ft.payFrequency, ft.gut, ft.checking, ft.savings, ft.invested, ft.housing, ft.hasCar],
    ['Alexis', 1996, 1450, 'paycheck', '2 weeks', 3000, 250, null, null, 'Rent', false]);
  assert.deepEqual(ft.debts['Credit card'], { balance: 7500, payment: null, rows: 1 });
  const inc = store.find(r => r.kind === 'income')[0], chk = store.find(r => r.type === 'Checking')[0], card = store.find(r => r.type === 'Credit card')[0];
  assert.deepEqual([statusOf(inc, 'amount'), levelOf(inc, 'amount')], ['Roughly', LEVELS.Rough]);
  assert.deepEqual([statusOf(chk, 'balance'), levelOf(chk, 'balance')], ['Not sure', LEVELS.Gut]);
  assert.equal(statusOf(card, 'payment'), 'Will email');
  assert.deepEqual(homeworkList(store.doc, store.doc.records).map(h => h.label), ['Find: Credit cards (total) payment']);
  assert.deepEqual(store.doc.parking.map(n => n.text), ['From the intake, not sure yet: Spending includes debt payments']);
  assert.deepEqual(store.doc.profile.chips, { whyNow: ['Debt feels out of control', 'Someone nudged me (partner, family, friend)'], worry: ['Debt', 'No idea where the money goes'], goalWords: ['Debt free', 'Stop living paycheck to paycheck'] });
  assert.equal(store.doc.profile.worry, 'I stop opening the card app.');
  assert.equal(whyText(store.doc.profile, 'worry'), 'Debt; No idea where the money goes; I stop opening the card app.');
  const m = metrics(store.doc, ref, { now: new Date(NOW) });
  assert.equal(Math.round(m.inputs.takeHome), 3142); // 1,450 every 2 weeks
  assert.equal(m.netWorth.value, -7250);
  assert.equal(inc.source, 'intake');
  assert.equal(store.doc.snapshots[0].label, 'Before intake import');
});

test('round trip: Tom\'s answers land as Fast Track numbers, his rental, accounts and paid-off car', () => {
  const store = imported('Tom Example');
  const ft = fastTrackAnswers(store.doc);
  assert.deepEqual([ft.takeHome, ft.payFrequency, ft.gut, ft.checking, ft.savings, ft.homeValue, ft.mortgageBalance, ft.mortgagePayment, ft.carValue, ft.carLoanBalance, ft.fiAge],
    [4210.5, 'twice a month', 8750, 17500, 37500, 625000, 325000, 3500, 27500, null, 55]);
  assert.deepEqual(ft.debts['Student loan'], { balance: 15000, payment: 175, rows: 1 });
  assert.equal(store.find(r => r.kind === 'asset' && r.type === 'Car')[0].values.financed, 'Paid off');
  const rental = store.find(r => r.kind === 'income' && r.type === 'Rental')[0];
  assert.deepEqual([rental.amount, statusOf(rental, 'amount')], [1750, 'Not sure']);
  const prop = store.find(r => r.kind === 'asset' && r.type === 'Other property')[0];
  const propLoan = store.find(r => r.kind === 'debt' && r.linkedTo === prop.id)[0];
  assert.deepEqual([prop.values.value, propLoan.values.balance, statusOf(propLoan, 'payment')], [275000, 175000, 'Will email']);
  assert.deepEqual(['401(k)', 'Roth IRA', 'Traditional IRA', 'HSA', 'Brokerage'].map(t => store.find(r => r.kind === 'account' && r.type === t).length), [1, 2, 1, 1, 1]);
  assert.ok(store.doc.profile.chips.whyNow.includes('Other'));
  assert.equal(store.doc.profile.chipOther.whyNow, 'Rebalancing after a vest');
  assert.equal(store.doc.profile.whyNow, 'Want a second opinion on the plan.');
  assert.ok(store.doc.parking.some(n => /RSUs vest quarterly/.test(n.text)));
});

test('the review never replaces a number SLAM has without a Yes, and Undo takes the whole import back', () => {
  const r = readIntake(CSV).responses.find(x => x.name === 'Alexis Sample');
  const store = new Store(newHousehold({ name: 'Alexis Sample', now: NOW }), { now: () => NOW });
  store.add('account', { name: 'Checking', values: { group: 'cash', balance: 412 } }, { type: 'Checking' });
  const plan = planIntake(r, store.doc);
  const chk = plan.lines.find(l => l.qid === 'cash.checking');
  assert.deepEqual([chk.was, chk.value, chk.decision], [412, 250, 'skip']);
  assert.ok(keptLines(plan).length > 10);
  applyIntake(store, plan, { ref, now: NOW });
  assert.equal(store.find(x => x.type === 'Checking')[0].values.balance, 412);
  assert.equal(fastTrackAnswers(store.doc).takeHome, 1450);
  store.undo();
  assert.equal(store.find(x => x.kind === 'income').length, 0);
  assert.equal(store.doc.profile.chips, undefined);
});
