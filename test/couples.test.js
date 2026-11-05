// Overnight F2: couples. Person tags, household modes, the per-person view. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, exportFile, importInto } from '../js/records.js';
import { MODES, MODE_NAMES, PERSONS, ownerOf, inView, personLabels, modeOf, viewsOf, DISCLOSURE } from '../js/registry/couples.js';
import { agendaOf } from '../js/program.js';
import { setHouseholdMode } from '../js/couples.js';
import { gatesOf } from '../js/gates.js';
import { metrics } from '../js/math/metrics.js';
import { makeHomework, setHomeworkPerson, homeworkAll } from '../js/program.js';
import { AREAS } from '../js/registry/fields.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const fresh = () => new Store(newHousehold({ name: 'Ada Example', now: now.toISOString() }), { now: () => now.toISOString() });

// A couple at about -$40k with mixed tags and three debts (the walkthrough household).
function couple() {
  const s = fresh();
  s.transaction('x', () => {
    s.setDoc('profile', { firstName: 'Ada', partnerName: 'Bo', age: 31, state: 'TX', incomeStability: 'Steady', areas: { debt: true } });
    s.add('income', { name: 'Ada job', amount: 4500, per: 'month', owner: 'Me', values: {} }, { type: 'Job' });
    s.add('income', { name: 'Bo job', amount: 3200, per: 'month', values: {} }, { type: 'Partner job' }); // no tag: a Partner job is the partner's
    s.add('spending', { name: 'Gut', amount: 5200, values: { includesDebtPayments: true } }, { type: 'All in' });
    s.add('account', { name: 'Ada checking', owner: 'Me', values: { group: 'cash', balance: 2000 } }, { type: 'Checking' });
    s.add('account', { name: 'Bo checking', owner: 'Partner', values: { group: 'cash', balance: 1500 } }, { type: 'Checking' });
    s.add('account', { name: 'Joint savings', owner: 'Joint', values: { group: 'cash', balance: 3000 } }, { type: 'Savings' });
    s.add('account', { name: 'Bo 401k', owner: 'Joint', values: { group: 'investment', balance: 9000 } }, { type: '401(k)' }); // tagged Joint by mistake: one person's
    s.add('debt', { name: 'Ada card', owner: 'Me', values: { balance: 9500, apr: 0.24, payment: 300, limit: 10000 } }, { type: 'Credit card' });
    s.add('debt', { name: 'Bo loan', owner: 'Partner', values: { balance: 26000, apr: 0.07, payment: 400 } }, { type: 'Student loan' });
    s.add('debt', { name: 'Car', owner: 'Joint', values: { balance: 20000, apr: 0.06, payment: 380 } }, { type: 'Car loan' });
    s.add('milestone', { name: 'Bo: debt free', owner: 'Partner', values: { mode: 'when' } }, { type: 'Debt free' });
  });
  setHouseholdMode(s, 'Dating');
  return s;
}

test('one config: six modes, three person tags, the names from About you', () => {
  assert.deepEqual(MODE_NAMES, ['Solo', 'Dating', 'Living together', 'Engaged', 'Married separate', 'Married merged']);
  assert.deepEqual(PERSONS, ['Me', 'Partner', 'Joint']);
  assert.ok(!MODES.Solo.couple && MODE_NAMES.slice(1).every(m => MODES[m].couple));
  assert.ok(Object.values(MODES).every(m => m.filing === undefined), 'answer 155: a mode never sets the filing status');
  assert.ok(MODES.Dating.split, 'answer 156: the shared-bills split is offered in Dating too');
  assert.deepEqual(personLabels(fresh().doc), { Me: 'Ada', Partner: 'Person B', Joint: 'Joint' });
  assert.deepEqual(personLabels(couple().doc), { Me: 'Ada', Partner: 'Bo', Joint: 'Joint' });
  const f = AREAS.find(a => a.id === 'profile').fields.find(x => x.key === 'mode');
  assert.ok(f && f.sheet === true && f.options.length === 6, 'the mode is a registered field with a sheet column');
});

test('the tag: a Partner job is the partner\'s, a 401(k) tagged Joint reads as one person, a person\'s view keeps theirs and the Joint rows', () => {
  const s = couple();
  const r = name => s.find(x => x.name === name)[0];
  assert.equal(ownerOf(r('Bo job')), 'Partner');
  assert.equal(ownerOf(r('Bo 401k')), 'Me', 'never Joint; it reads as this client until tagged');
  assert.equal(ownerOf(r('Joint savings')), 'Joint');
  assert.ok(inView(r('Joint savings'), 'Partner') && inView(r('Bo checking'), 'Partner') && !inView(r('Ada checking'), 'Partner'));
  assert.ok(inView(r('Ada checking'), 'all') && inView(r('Ada checking'), null));
});

test('the mode gates couple; a file from before modes reads Couple as Married merged and Solo as Solo', () => {
  assert.equal(gatesOf({ mode: 'Dating' }, {}).couple, true);
  assert.equal(gatesOf({ mode: 'Solo' }, { couple: true }).couple, false, 'the mode wins');
  assert.equal(gatesOf({ household: 'Couple' }, {}).couple, true);
  assert.equal(modeOf({ household: 'Couple' }), 'Married merged');
  assert.equal(modeOf({ household: 'Solo' }), null);
});

test('the per-person view: net worth and take-home for one person are their rows plus the Joint ones; together is everything', () => {
  const s = couple();
  const all = metrics(s.doc, ref, { now }), me = metrics(s.doc, ref, { now, person: 'Me' }), bo = metrics(s.doc, ref, { now, person: 'Partner' });
  assert.equal(all.netWorth.value, 2000 + 1500 + 3000 + 9000 - 9500 - 26000 - 20000);
  assert.ok(all.netWorth.value < -39000 && all.netWorth.value > -41000, `about -$40k: ${all.netWorth.value}`);
  assert.equal(me.netWorth.value, 2000 + 1500 + 9000 - 9500 - 10000, 'Ada: her rows, half of each Joint one (answer 157), and the 401(k) that reads as hers');
  assert.equal(bo.netWorth.value, 1500 + 1500 - 26000 - 10000);
  assert.equal(me.netWorth.value + bo.netWorth.value, all.netWorth.value, 'the two views add up to the household (answer 157)');
  assert.ok(me.inputs.takeHome < all.inputs.takeHome && bo.inputs.takeHome < all.inputs.takeHome, 'one job each');
  assert.equal(me.inputs.debts.length, 2);
  assert.equal(all.inputs.debts.length, 3);
});

test('switching Dating to Engaged to Married merged keeps every row and tag; only the defaults move (the view); the filing status never comes from the mode; the file round-trips', () => {
  const s = couple();
  const before = JSON.stringify(s.doc.records.map(r => [r.id, r.owner ?? null, r.values.balance ?? r.amount ?? null]));
  assert.equal(s.doc.settings.person, 'Me', 'Dating: this client alone by default');
  assert.equal(s.doc.profile.filingStatus, undefined, 'blank until typed (answer 155)');
  assert.equal(metrics(s.doc, ref, { now }).inputs.filingStatus, 'Single', 'answer 174: a Guess of Single until the stage is Married');
  assert.equal(metrics(s.doc, ref, { now }).inputs.filingGuess, true);
  setHouseholdMode(s, 'Engaged');
  assert.equal(s.doc.settings.person, 'Me', 'engaged: own view by default; the merged preview is a tap away');
  assert.equal(s.doc.profile.filingStatus, undefined);
  setHouseholdMode(s, 'Married merged');
  assert.equal(s.doc.profile.household, 'Couple');
  assert.equal(s.doc.client.couple, true);
  assert.equal(s.doc.profile.filingStatus, undefined, 'still blank after Married merged');
  assert.equal(metrics(s.doc, ref, { now }).inputs.filingStatus, 'Married jointly', 'answer 174: Married jointly once the stage is Married, still a Guess');
  assert.equal(JSON.stringify(s.doc.records.map(r => [r.id, r.owner ?? null, r.values.balance ?? r.amount ?? null])), before, 'nothing lost');
  s.setDoc('profile', { filingStatus: 'Married separately' });
  assert.equal(metrics(s.doc, ref, { now }).inputs.filingStatus, 'Married separately', 'a typed filing status wins over the mode');
  assert.equal(metrics(s.doc, ref, { now }).inputs.filingGuess, false);
  setHouseholdMode(s, 'Solo');
  assert.equal(gatesOf(s.doc.profile, s.doc.client).couple, false);
  assert.equal(s.doc.records.length, 11, 'Solo hides the partner rows on the screens; it deletes nothing');
  s.undo(); // back to Married merged
  assert.equal(s.doc.profile.mode, 'Married merged');
  const t = fresh(); importInto(t, JSON.parse(JSON.stringify(exportFile(s.doc))));
  assert.equal(t.doc.profile.mode, 'Married merged');
  assert.equal(t.find(r => r.name === 'Bo loan')[0].owner, 'Partner');
});

test('each mode\'s defaults: no combined totals when dating or living together, a merge preview when engaged, Ours when married separate, Joint by default when merged', () => {
  const names = { Me: 'A', Partner: 'B', Joint: 'Joint' };
  assert.deepEqual(viewsOf('Dating', names).map(v => v[0]), ['Me', 'Partner']);
  assert.deepEqual(viewsOf('Living together', names).map(v => v[0]), ['Me', 'Partner']);
  assert.equal(viewsOf('Engaged', names)[0][1], 'If we merged (preview)');
  assert.equal(viewsOf('Married separate', names)[0][1], 'Ours');
  const checking = { kind: 'account', type: 'Checking', values: {} }, k401 = { kind: 'account', type: '401(k)', values: {} };
  assert.equal(ownerOf(checking, 'Married merged'), 'Joint', 'merged: an untagged account is Joint');
  assert.equal(ownerOf(k401, 'Married merged'), 'Me', 'a 401(k) is one person\'s in every mode');
  assert.equal(ownerOf(checking, 'Dating'), 'Me');
  assert.ok(MODES['Living together'].split && MODES.Engaged.split && MODES['Married separate'].split && !MODES['Married merged'].split);
});

test('living together: shared bills split by income when chosen (this client\'s share of the two take-homes), else as typed or even', () => {
  const s = couple();
  setHouseholdMode(s, 'Living together');
  s.setDoc('profile', { shared: { rent: true }, moneyStyle: 'Separate' });
  s.add('bill', { name: 'Rent', amount: 2000, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', whoPays: 'Split', amountIs: 'The whole bill' } });
  const even = metrics(s.doc, ref, { now });
  assert.equal(even.inputs.splitShare, null);
  s.setDoc('profile', { splitMethod: 'By income' });
  const by = metrics(s.doc, ref, { now });
  assert.ok(by.inputs.splitShare > 0.5 && by.inputs.splitShare < 0.7, `Ada earns more: ${by.inputs.splitShare}`);
  const rent = by.inputs.lines.find(l => l.name === 'Rent');
  assert.ok(rent, 'the rent line is in');
  assert.ok(Math.abs(rent.sharePct - by.inputs.splitShare) < 1e-9, 'the line carries the by-income share');
  s.setDoc('profile', { splitMine: 0.4 });
  assert.equal(metrics(s.doc, ref, { now }).inputs.lines.find(l => l.name === 'Rent').sharePct, 0.4, 'a typed share wins');
});

test('engaged: the disclosure checklist, a money talk and a wedding goal are suggested for today, with a +', () => {
  const s = couple();
  setHouseholdMode(s, 'Engaged');
  const a = agendaOf(s.doc, ref, { now });
  const labels = a.suggestions.filter(x => x.kind === 'mode').map(x => x.label);
  assert.equal(labels.filter(l => l.startsWith('Disclosure')).length, DISCLOSURE.length);
  assert.ok(labels.some(l => /Money talk/.test(l)) && labels.some(l => /wedding goal/.test(l)));
  s.add('milestone', { name: 'Wedding', values: { mode: 'date', date: '2027-09-12' } }, { type: 'Custom' });
  assert.ok(!agendaOf(s.doc, ref, { now }).suggestions.some(x => /wedding goal/.test(x.label)), 'once a wedding goal exists it is not suggested');
  setHouseholdMode(s, 'Dating');
  assert.equal(agendaOf(s.doc, ref, { now }).suggestions.filter(x => x.kind === 'mode').length, 0);
});

test('goals and homework carry the tag', () => {
  const s = couple();
  assert.equal(ownerOf(s.find(r => r.name === 'Bo: debt free')[0]), 'Partner');
  const goal = AREAS.find(a => a.id === 'goals').fields.find(f => f.key === 'owner');
  assert.ok(goal && !goal.unused, 'the owner field counts on goals now');
  const hw = makeHomework(s, 'S2', 'Bring the loan statement', { person: 'Partner' });
  assert.equal(homeworkAll(s.doc, s.doc.records).find(x => x.key === `hw:${hw.id}`).person, 'Partner');
  setHomeworkPerson(s, `hw:${hw.id}`, 'Joint');
  assert.equal(homeworkAll(s.doc, s.doc.records).find(x => x.key === `hw:${hw.id}`).person, 'Joint');
});
