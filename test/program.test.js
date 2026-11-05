// Phase 3: the program path and the progress tracker on Home. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, exportFile, importInto } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { levelOf, pictureOf, nextSmallThings, paceOf, unlockOf, confidenceOf } from '../js/math/picture.js';
import { LEVELS, WEIGHTS, PACE, SESSIONS } from '../js/registry/program.js';
import { sessionsOf, programOf, startSession, endSession, day0Of, day0Report, sessionNo, inSession } from '../js/program.js';
import { householdFromInputs } from '../js/demo.js';
import { addPresets } from '../js/presets.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const fresh = () => new Store(newHousehold({ name: 'Synthetic', now: now.toISOString() }), { now: () => now.toISOString() });

// ---------- Step 0: the four Home numbers (reported, not changed) ----------
test('step 0: a household shaped like the beta Home reproduces 45.2%, $1,433, $71,745 and Oct 2063 with $0 a month invested', () => {
  const s = fresh();
  s.setDoc('profile', { age: 24, state: 'NY', household: 'Solo', areas: { cash: true, investments: true, real: true, debt: false } });
  s.add('income', { name: 'Job', amount: 3170.35, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks' } }, { type: 'Job' });
  s.add('spending', { name: 'All in', amount: 1737.35, values: { includesDebtPayments: true } }, { type: 'All in' });
  s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 43000 } }, { type: 'Brokerage' });
  s.add('account', { name: 'Checking', values: { group: 'cash', balance: 8745 } }, { type: 'Checking' });
  s.add('asset', { name: 'Car', values: { value: 20000 } }, { type: 'Car' });
  const m = metrics(s.doc, ref, { now });
  assert.equal(Math.round(m.savingsRate.value * 1000) / 10, 45.2);
  assert.equal(m.surplus.value, 1433);
  assert.equal(m.netWorth.value, 71745);
  assert.equal(m.monthsToFi.value, 443); // 36.9 years: Oct 2063
  assert.match(m.monthsToFi.text, /Oct 2063/);
  // The savings rate counts the surplus as saved; the FI date adds nothing a month until Invest my surplus is on.
  assert.equal(m.investing.monthly, 0);
  s.setDoc('assumptions', { investSurplus: true });
  const on = metrics(s.doc, ref, { now });
  assert.equal(on.investing.monthly, 1433);
  assert.ok(on.monthsToFi.value / 12 > 14 && on.monthsToFi.value / 12 < 15, 'with the surplus invested: about 14 years, the rough math');
});

// ---------- Levels ----------
test('levels: missing 0, a guess 25, Roughly 50, typed 75, a statement, a month of actuals or a lock 100; Not for me is out', () => {
  const s = fresh();
  const r = s.add('debt', { name: 'Card', values: {} }, { type: 'Credit card' });
  assert.equal(levelOf(r, 'balance'), LEVELS.Missing);
  s.update(r.id, { balance: 4200 });
  assert.equal(levelOf(r, 'balance'), LEVELS.Estimate, 'typed is Know it, an Estimate');
  s.setFieldStatus(r.id, 'balance', 'Roughly');
  assert.equal(levelOf(r, 'balance'), LEVELS.Rough);
  s.setFieldStatus(r.id, 'balance', 'Not sure');
  assert.equal(levelOf(r, 'balance'), LEVELS.Gut);
  s.update(r.id, { locked: true });
  assert.equal(levelOf(r, 'balance'), LEVELS.Actual, 'locked by the coach');
  s.update(r.id, { locked: false, source: 'statement' });
  assert.equal(levelOf(r, 'balance'), LEVELS.Actual, 'from a statement');
  s.setFieldStatus(r.id, 'balance', null); // the field's own status wins over the row's (R059)
  s.update(r.id, { source: 'manual', status: 'Not for me' });
  assert.equal(levelOf(r, 'balance'), null);
  const bill = s.add('bill', { name: 'Rent', amount: 1500, values: { category: 'Rent or mortgage', draftt: 'Accommodation' } });
  assert.equal(levelOf(bill, 'amount'), LEVELS.Estimate);
  s.setIn('spending', ['months', '2026-10', 'lines', bill.id, 'actual'], 1500);
  assert.equal(levelOf(bill, 'amount', { months: s.doc.spending.months }), LEVELS.Actual, 'a month of actuals');
  const gut = s.add('spending', { name: 'All in', amount: 3600 }, { type: 'All in' });
  assert.equal(levelOf(gut, 'amount'), LEVELS.Gut, 'the gut number is a gut number');
});

// ---------- Picture % ----------
test('Picture %: 0 for an empty client, weighted by the big items, the gut number stands in for the categories', () => {
  const s = fresh();
  assert.equal(pictureOf(s.doc, ref, { now }).pct, 0);
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }));
  const p = pictureOf(d.doc, ref, { now });
  assert.ok(p.pct > 0.5 && p.pct < 0.8, `the Demo client (typed, gut spending): ${p.pct}`);
  const gut = p.items.find(i => i.id === 'gut');
  assert.equal(gut.level, LEVELS.Gut); assert.equal(gut.weight, WEIGHTS.gut);
  assert.ok(p.items.find(i => i.group === 'income').weight === WEIGHTS.income);
  // The weighted average, by hand.
  const total = p.items.reduce((t, i) => t + i.weight * 100, 0);
  assert.ok(Math.abs(p.pct - p.items.reduce((t, i) => t + i.weight * i.level, 0) / total) < 1e-9);
  assert.deepEqual(p.sections.map(x => x.name), ['About you', 'Income', 'Debt', 'Assets', 'Spending']);
  // Lines as the source: one item per DRAFTT letter, the starter guesses at Gut.
  addPresets(d, ref);
  d.setDoc('spending', { source: 'lines' });
  const p2 = pictureOf(d.doc, ref, { now });
  const cats = p2.items.filter(i => i.kind === 'category');
  assert.ok(cats.length >= 4);
  assert.ok(cats.every(c => c.weight === (c.id === 'draftt:Other' ? WEIGHTS.otherLines : WEIGHTS.draftt)));
  assert.ok(p2.items.every(i => i.id !== 'gut'), 'the gut number steps aside');
});

test('next small things: three items, each with its gain and where to go; the gain is to the next level', () => {
  const s = fresh();
  s.setDoc('profile', { birthYear: 2002, areas: { cash: true, investments: true, real: false, debt: true } });
  const p = pictureOf(s.doc, ref, { now });
  const n = nextSmallThings(p);
  assert.equal(n.length, 3);
  assert.ok(n.every(x => x.gain > 0 && x.route && x.step));
  assert.ok(n[0].gain >= n[1].gain && n[1].gain >= n[2].gain);
  assert.equal(n[0].step, 'Add the number');
  const sum = p.items.reduce((t, i) => t + i.weight * 100, 0);
  assert.ok(Math.abs(n[0].gain - n[0].weight * (LEVELS.Estimate - 0) / sum) < 1e-9, 'a missing number gains up to Estimate when typed');
});

test('pace: Ahead past the target, On track within the margin of what was due, Catch up below it', () => {
  assert.equal(paceOf(0, 1).word, 'On track', 'session 1 starts at 0 with nothing due yet');
  assert.equal(paceOf(0.45, 1).word, 'Ahead');
  assert.equal(paceOf(0.36, 2).word, 'On track'); // 40 due, margin 5
  assert.equal(paceOf(0.30, 2).word, 'Catch up');
  assert.equal(paceOf(0.92, 3).word, 'Ahead');
  assert.equal(paceOf(0.88, 7).word, 'On track'); // held at 90
  assert.deepEqual([PACE.expected[1], PACE.expected[2], PACE.expected[3]], [40, 70, 90]);
  assert.match(paceOf(0.5, 2).text, /50% now; 70% expected by the end of session 2/);
});

// ---------- Unlocks and confidence ----------
test('FI date: locked with a plain reason until income and spending reach Estimate and an invested balance is in', () => {
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }));
  let u = unlockOf('fi', pictureOf(d.doc, ref, { now }));
  assert.equal(u.unlocked, false);
  assert.match(u.reason, /^Unlocks when spending reaches Estimate \(0 of 1 there\)\.$/);
  assert.equal(u.route, '#/cash-flow/budget');
  // The lines as the source, every line typed: unlocked.
  d.setDoc('spending', { source: 'lines' });
  for (const r of d.find(r => r.kind === 'bill')) d.update(r.id, { status: null });
  u = unlockOf('fi', pictureOf(d.doc, ref, { now }));
  assert.equal(u.unlocked, true, JSON.stringify(u.needs));
  const c = confidenceOf('fi', pictureOf(d.doc, ref, { now }), { now });
  assert.equal(c.word, 'Medium', 'typed numbers, nothing confirmed');
  for (const r of d.find(r => ['income', 'account', 'bill'].includes(r.kind))) d.update(r.id, { locked: true });
  assert.equal(confidenceOf('fi', pictureOf(d.doc, ref, { now }), { now }).word, 'High');
  const old = new Date('2027-04-01T12:00:00Z');
  assert.equal(confidenceOf('fi', pictureOf(d.doc, ref, { now: old }), { now: old }).word, 'Medium', 'old numbers drop a step');
  assert.equal(unlockOf('payoff', pictureOf(d.doc, ref, { now })).unlocked, true);
});

test('no debt, per About you: the payoff has nothing to wait for; an empty client locks the FI date on income first', () => {
  const s = fresh();
  s.setDoc('profile', { areas: { debt: false, cash: true, investments: true } });
  assert.equal(unlockOf('payoff', pictureOf(s.doc, ref, { now })).unlocked, true);
  assert.match(unlockOf('fi', pictureOf(s.doc, ref, { now })).reason, /^Unlocks when income reaches Estimate \(0 of 1 there\), then when spending reaches Estimate and an invested balance is in\.$/);
});

// ---------- Sessions ----------
test('12 sessions; session 1 ticks itself from the data; placeholders are manual and editable', () => {
  const s = fresh();
  assert.equal(SESSIONS.length, 12);
  let list = sessionsOf(s.doc, ref, { now });
  assert.deepEqual(list.map(x => x.name).slice(0, 3), ['First picture', 'Real numbers', 'Lock it']);
  assert.equal(list[0].status, 'current'); assert.equal(list[0].done, false);
  assert.ok(list[0].items.every(i => i.auto && !i.done));
  // Numbers in: accounts, top line and money in one line tick; Day 0 waits for the end of the session.
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });
  d.setDoc('profile', { areas: { cash: true, investments: true, real: true, debt: true } });
  list = sessionsOf(d.doc, ref, { now });
  assert.deepEqual(list[0].items.map(i => i.done), [true, true, true, false]);
  endSession(d, ref, { now });
  list = sessionsOf(d.doc, ref, { now });
  assert.deepEqual(list[0].items.map(i => i.done), [true, true, true, true]);
  assert.equal(list[0].status, 'done'); assert.equal(list[1].status, 'current');
  assert.equal(sessionNo(d.doc), 2);
  // A placeholder: manual ticks, a new name and checklist, all in the client file.
  const s4 = list[3];
  assert.equal(s4.placeholder, true); assert.ok(s4.items.every(i => !i.auto));
  d.setIn('program', ['checks', 'S4', 'goal'], true, 'Checklist');
  d.setIn('program', ['sessions', 'S4'], { name: 'Spending plan', items: [{ id: 'goal', label: 'Plan agreed' }, { id: 'x', label: 'Card frozen' }] }, 'Session');
  const again = sessionsOf(d.doc, ref, { now })[3];
  assert.equal(again.name, 'Spending plan');
  assert.deepEqual(again.items.map(i => [i.label, i.done]), [['Plan agreed', true], ['Card frozen', false]]);
  d.undo();
  assert.equal(sessionsOf(d.doc, ref, { now })[3].name, 'Goals and mindset', 'the program undoes like everything else');
});

test('Day 0: the first end of session saves it, later ends save End of session N; it exports and imports with the file', () => {
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });
  startSession(d);
  assert.equal(inSession(d.doc), true);
  const first = endSession(d, ref, { now });
  assert.equal(first.first, true); assert.equal(first.snap.label, 'Day 0'); assert.equal(first.snap.day0, true);
  assert.equal(inSession(d.doc), false);
  assert.ok(first.snap.metrics.picturePct > 0, 'the snapshot keeps the Picture %');
  const second = endSession(d, ref, { now: new Date('2026-11-19T12:00:00Z') });
  assert.equal(second.snap.label, 'End of session 2');
  assert.equal(day0Of(d.doc).id, first.snap.id);
  const file = JSON.stringify(exportFile(d.doc, now.toISOString()));
  const e = fresh();
  importInto(e, file);
  assert.equal(day0Of(e.doc)?.label, 'Day 0');
  assert.equal(e.doc.snapshots.filter(x => x.label.startsWith('End of session')).length, 1);
  assert.equal(e.doc.session.count, 2);
  const rep = day0Report(d.doc, ref, { now });
  assert.deepEqual(rep.rows.map(r => r.key), ['netWorth', 'debtTotal', 'surplus', 'savingsRate', 'picturePct']);
  assert.equal(rep.rows[0].change, 0);
});

test('programOf: one call gives Home the session, the picture, the pace and the next small things', () => {
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }));
  const p = programOf(d.doc, ref, { now });
  assert.equal(p.n, 1); assert.equal(p.current.id, 'S1');
  assert.ok(p.picture.pct > 0); assert.ok(['Ahead', 'On track', 'Catch up'].includes(p.pace.word));
  assert.equal(p.next.length, 3); assert.equal(p.day0, null);
});

// ---------- The spec's Program tab says what the registry says ----------
import { csvCells } from '../js/registry/drift.js';
import { UNLOCKS, CONFIDENCE } from '../js/registry/program.js';
test('spec: the Program tab names every session, level, weight, pace mark and unlock (tools/program_tab.py keeps it current)', () => {
  const rows = readFileSync(new URL('../spec/csv/Program.csv', import.meta.url), 'utf8').split(/\r?\n/).map(csvCells);
  const cell = (section, item) => rows.find(r => r[0] === section && r[1] === item);
  SESSIONS.forEach((s, i) => { const r = cell('Sessions', `S${i + 1} ${s.name}`); assert.ok(r, `S${i + 1} ${s.name}`); for (const it of s.items) assert.ok(r[2].includes(`${it.label} (${it.auto ? 'auto' : 'manual'})`), it.label); });
  for (const [k, v] of Object.entries(LEVELS)) assert.equal(cell('Levels', k)?.[2], String(v), k);
  for (const [k, v] of Object.entries(WEIGHTS)) assert.equal(cell('Weights', k)?.[2], String(v), k);
  SESSIONS.forEach((s, i) => assert.equal(cell('Pace', `S${i + 1}`)?.[2], `${PACE.expected[i + 1] ?? PACE.hold}%`));
  assert.equal(cell('Pace', 'Margin')?.[2], `${PACE.margin} points`);
  for (const u of Object.values(UNLOCKS)) { const r = cell('Unlocks', u.label); assert.ok(r, u.label); for (const n of u.needs) assert.ok(r[2].includes(n.label), n.label); }
  assert.match(cell('Confidence', '')?.[2] ?? '', new RegExp(`${CONFIDENCE.high} or more, Medium at ${CONFIDENCE.medium}`));
  assert.ok(rows.some(r => r[0] === 'Home' && r[1] === 'One nav row'));
});
