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
test('step 0: a household shaped like the beta Home reproduces 45.2%, $1,433, $71,745; FI is 14.3 years with the surplus invested (the default now), Oct 2063 with it in checking', () => {
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
  // Answer 123: the surplus is invested unless turned off, so the FI date and the savings rate agree with the rough math.
  assert.equal(m.investing.monthly, 1433);
  assert.ok(Math.abs(m.monthsToFi.value / 12 - 14.3) < 0.1, `about 14.3 years: ${m.monthsToFi.value / 12}`);
  assert.equal(m.fiPaths.idle.value, 443, 'if it sits in checking: 36.9 years, Oct 2063');
  assert.match(m.fiPaths.idle.text, /Oct 2063/);
  s.setDoc('assumptions', { investSurplus: 0 });
  const off = metrics(s.doc, ref, { now });
  assert.equal(off.investing.monthly, 0);
  assert.equal(off.monthsToFi.value, 443);
});

// ---------- Answers 122 to 127 (batch 2), on the same household ----------
const brandonLike = () => {
  const s = fresh();
  s.setDoc('profile', { age: 24, state: 'NY', household: 'Solo', areas: { cash: true, investments: true, real: true, debt: false } });
  s.add('income', { name: 'Job', amount: 3170.35, per: 'month', values: { basis: 'Take-home', payFrequency: '2 weeks' } }, { type: 'Job' });
  s.add('spending', { name: 'All in', amount: 1737.35, values: { includesDebtPayments: true } }, { type: 'All in' });
  s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 43000 } }, { type: 'Brokerage' });
  s.add('account', { name: 'Checking', values: { group: 'cash', balance: 8745 } }, { type: 'Checking' });
  s.add('asset', { name: 'Car', values: { value: 20000 } }, { type: 'Car' });
  return s;
};
test('122: the gut number unlocks the FI date at Low confidence, shown as a year range; typed lines make it a year or a narrower range; a lock makes it a month', async () => {
  const { fiWordsOf } = await import('../js/math/picture.js');
  const s = brandonLike();
  let pic = pictureOf(s.doc, ref, { now });
  let u = unlockOf('fi', pic);
  assert.equal(u.unlocked, true, 'a gut number is enough');
  let c = confidenceOf('fi', pic, { now });
  assert.equal(c.word, 'Low');
  let m = metrics(s.doc, ref, { now });
  let w = fiWordsOf(m, c, { now });
  assert.equal(w.kind, 'range'); assert.match(w.text, /^20\d\d to 20\d\d$/);
  assert.ok(w.low < m.monthsToFi.value && w.high > m.monthsToFi.value, 'spending 15% lower lands sooner, 15% higher later');
  // No spending at all: locked with the plain reason.
  const empty = fresh();
  empty.add('income', { name: 'Job', amount: 3000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  assert.match(unlockOf('fi', pictureOf(empty.doc, ref, { now })).reason, /spending is in/);
  // Everything typed: Medium, a year or a narrow range; everything locked: High, a month.
  for (const r of s.find(r => ['income', 'account', 'asset'].includes(r.kind))) s.update(r.id, { locked: true });
  s.update(s.find(r => r.kind === 'spending')[0].id, { locked: true });
  pic = pictureOf(s.doc, ref, { now }); c = confidenceOf('fi', pic, { now }); m = metrics(s.doc, ref, { now });
  assert.equal(c.word, 'High');
  assert.equal(fiWordsOf(m, c, { now }).kind, 'month');
  assert.equal(fiWordsOf(m, { word: 'Medium', range: 0.05 }, { now }).kind === 'year' || fiWordsOf(m, { word: 'Medium', range: 0.05 }, { now }).kind === 'range', true);
});
test('124 and 125: after-tax contributions and Retirement lines count as investing, never twice; Retirement lines leave spending and the FI target', () => {
  const s = brandonLike();
  s.setDoc('assumptions', { investSurplus: 0 });
  const roth = s.add('account', { name: 'Roth IRA', values: { group: 'investment', balance: 5000, contribution: 500, contributionPer: 'Month' } }, { type: 'Roth IRA' });
  let m = metrics(s.doc, ref, { now });
  assert.equal(m.investing.monthly, 500, 'the Roth contribution goes in even when the surplus sits in checking');
  s.setDoc('assumptions', { investSurplus: 1 });
  m = metrics(s.doc, ref, { now });
  assert.equal(m.investing.monthly, m.surplus.value, 'with the surplus invested, the Roth money is already inside it');
  // Lines as the source with a Retirement line: it is investing, not spending.
  s.remove(roth.id);
  s.add('bill', { name: 'Rent', amount: 1200, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed' } });
  s.add('bill', { name: 'IRA', amount: 300, values: { draftt: 'Retirement', amountType: 'Fixed' } });
  s.setDoc('spending', { source: 'lines' });
  m = metrics(s.doc, ref, { now });
  assert.equal(m.inputs.spending, 1200, 'the IRA line is not spending');
  assert.equal(m.inputs.retirementLines, 300);
  assert.equal(m.fiNumber.value, 1200 * 12 / 0.04, 'and not in the FI target');
  assert.equal(m.surplus.value, Math.round((3170.35 - 1200) * 100) / 100);
  assert.equal(m.investing.monthly, m.surplus.value, 'invested: the IRA money is inside the surplus (once)');
  s.setDoc('assumptions', { investSurplus: 0 });
  m = metrics(s.doc, ref, { now });
  assert.equal(m.investing.monthly, 300, 'in checking: only the IRA line goes in');
  assert.equal(m.flow.spending, 1200); assert.equal(m.flow.savings, 300);
});
test('127: the gut number stops counting in the picture once every big category of lines is at Estimate', () => {
  const s = brandonLike();
  s.add('bill', { name: 'Rent', amount: 1200, values: { category: 'Rent or mortgage', draftt: 'Accommodation' } });
  s.add('bill', { name: 'Groceries', amount: 400, values: { category: 'Groceries', draftt: 'Food' } });
  let pic = pictureOf(s.doc, ref, { now });
  assert.ok(!pic.items.some(i => i.id === 'gut'), 'typed lines in every category: the gut steps aside even while the math still uses it');
  assert.equal(pic.items.filter(i => i.kind === 'category').length, 2);
  s.update(s.find(r => r.name === 'Groceries')[0].id, { status: 'Not sure' });
  pic = pictureOf(s.doc, ref, { now });
  assert.ok(pic.items.some(i => i.id === 'gut'), 'a guessed category: the gut counts again');
});

// ---------- Levels ----------
test('levels: missing 0, a guess 25, Roughly 50, typed and Know it 100 (confirmed, batch 6), a statement, a month of actuals or a lock 100; Not for me is out', () => {
  const s = fresh();
  const r = s.add('debt', { name: 'Card', values: {} }, { type: 'Credit card' });
  assert.equal(levelOf(r, 'balance'), LEVELS.Missing);
  s.update(r.id, { balance: 4200 });
  assert.equal(levelOf(r, 'balance'), LEVELS.Actual, 'typed is Know it, which counts as confirmed (item 11)');
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
  assert.equal(levelOf(bill, 'amount'), LEVELS.Actual, 'typed and Know it (item 11)');
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
  assert.ok(p.pct > 0.5 && p.pct <= 1, `the Demo client (typed, gut spending): ${p.pct}`);
  // The Demo client types its rent and utilities, so the big categories are at Estimate and the gut steps aside (127).
  assert.ok(!p.items.some(i => i.id === 'gut'));
  assert.ok(p.items.find(i => i.group === 'income').weight === WEIGHTS.income);
  const g = fresh();
  g.add('spending', { name: 'All in', amount: 3600 }, { type: 'All in' });
  const gut = pictureOf(g.doc, ref, { now }).items.find(i => i.id === 'gut');
  assert.equal(gut.level, LEVELS.Gut); assert.equal(gut.weight, WEIGHTS.gut);
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
test('FI date: unlocked once income, spending and an invested balance are in (a gut number is enough); locked with a plain reason before', () => {
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }));
  let u = unlockOf('fi', pictureOf(d.doc, ref, { now }));
  assert.equal(u.unlocked, true, 'the Demo client has a gut number, income and investments');
  const g = fresh();
  g.add('income', { name: 'Job', amount: 4000, per: 'month', values: { basis: 'Take-home' } }, { type: 'Job' });
  g.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 1000 } }, { type: 'Brokerage' });
  u = unlockOf('fi', pictureOf(g.doc, ref, { now }));
  assert.equal(u.unlocked, false);
  assert.match(u.reason, /^Unlocks when spending is in \(a gut number is enough\) \(0 of 1 there\)\.$/);
  assert.equal(u.route, '#/cash-flow/budget');
  // The lines as the source, every line typed: unlocked at High (typed and Know it counts as confirmed, item 11).
  d.setDoc('spending', { source: 'lines' });
  for (const r of d.find(r => r.kind === 'bill')) d.update(r.id, { status: null });
  u = unlockOf('fi', pictureOf(d.doc, ref, { now }));
  assert.equal(u.unlocked, true, JSON.stringify(u.needs));
  const c = confidenceOf('fi', pictureOf(d.doc, ref, { now }), { now });
  assert.equal(c.word, 'High', 'typed numbers, nothing confirmed');
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
  assert.match(unlockOf('fi', pictureOf(s.doc, ref, { now })).reason, /^Unlocks when income is in \(0 of 1 there\), then when spending is in \(a gut number is enough\) and an invested balance is in\.$/);
});

// ---------- Sessions ----------
test('12 sessions; session 1 ticks itself from the data; a session can be renamed and its checklist edited', () => {
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
  // A renamed session with an edited checklist (a manual item added), all in the client file.
  const s4 = list[3];
  assert.equal(s4.name, 'Goals'); assert.ok(s4.items.every(i => i.auto));
  d.setIn('program', ['checks', 'S4', 'x'], true, 'Checklist');
  d.setIn('program', ['sessions', 'S4'], { name: 'Goals and dreams', items: [{ id: 'short', label: 'Three short-term goals' }, { id: 'x', label: 'Dream named' }] }, 'Session');
  const again = sessionsOf(d.doc, ref, { now })[3];
  assert.equal(again.name, 'Goals and dreams');
  assert.deepEqual(again.items.map(i => [i.label, i.auto, i.done]), [['Three short-term goals', true, false], ['Dream named', false, true]]);
  d.undo();
  assert.equal(sessionsOf(d.doc, ref, { now })[3].name, 'Goals', 'the program undoes like everything else');
});

test('Day 0: the first end of session saves it, later ends save End of session N; it exports and imports with the file', () => {
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });
  startSession(d, ref, { now }); // the same clock as the end, so the test does not depend on today's date
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
  assert.deepEqual(rep.rows.map(r => r.key), ['netWorth', 'debtTotal', 'surplus', 'savingsRate', 'picturePct', 'scoreOk', 'confidence', 'joy']); // F4, answer 164: Confidence and Joy are rows
  assert.equal(rep.rows[0].change, 0);
});

test('programOf: one call gives Home the session, the picture, the pace and the next small things', () => {
  const d = new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }));
  const p = programOf(d.doc, ref, { now });
  assert.equal(p.n, 1); assert.equal(p.current.id, 'S1');
  assert.ok(p.picture.pct > 0); assert.ok(['Ahead', 'On track', 'Catch up'].includes(p.pace.word));
  assert.ok(p.next.length >= 1 && p.next.length <= 3, 'the few things left to sharpen'); assert.equal(p.day0, null);
});

// ---------- The spec's Program tab says what the registry says ----------
import { csvCells } from '../js/registry/drift.js';
import { UNLOCKS, CONFIDENCE } from '../js/registry/program.js';
import { AREAS as SCORE_AREAS, THRESHOLDS } from '../js/registry/scorecard.js';
test('spec: the Program tab names every session, level, weight, pace mark and unlock (tools/program_tab.py keeps it current)', () => {
  const rows = readFileSync(new URL('../spec/csv/Program.csv', import.meta.url), 'utf8').split(/\r?\n/).map(csvCells);
  const cell = (section, item) => rows.find(r => r[0] === section && r[1] === item);
  SESSIONS.forEach((s, i) => { const r = cell('Sessions', `S${i + 1} ${s.name}`); assert.ok(r, `S${i + 1} ${s.name}`); for (const it of [...s.items, ...(s.itemsWhenClear || [])]) assert.ok(r[2].includes(`${it.label} (${it.auto ? 'auto' : 'manual'})`), it.label); });
  for (const a of SCORE_AREAS) assert.ok(cell('Scorecard', a.name), a.name);
  for (const [area, t] of Object.entries(THRESHOLDS)) for (const [k, v] of Object.entries(t)) assert.equal(cell('Thresholds', `${area} ${k}`)?.[2], String(v), `${area} ${k}`);
  for (const [k, v] of Object.entries(LEVELS)) assert.equal(cell('Levels', k)?.[2], String(v), k);
  for (const [k, v] of Object.entries(WEIGHTS)) assert.equal(cell('Weights', k)?.[2], String(v), k);
  SESSIONS.forEach((s, i) => assert.equal(cell('Pace', `S${i + 1}`)?.[2], `${PACE.expected[i + 1] ?? PACE.hold}%`));
  assert.equal(cell('Pace', 'Margin')?.[2], `${PACE.margin} points`);
  for (const u of Object.values(UNLOCKS)) { const r = cell('Unlocks', u.label); assert.ok(r, u.label); for (const n of u.needs) assert.ok(r[2].includes(n.label), n.label); }
  assert.match(cell('Confidence', '')?.[2] ?? '', new RegExp(`${CONFIDENCE.high} or more, Medium at ${CONFIDENCE.medium}`));
  assert.ok(rows.some(r => r[0] === 'Home' && r[1] === 'One nav row'));
});
