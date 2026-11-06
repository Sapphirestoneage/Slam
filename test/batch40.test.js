// Batch 40: the last majors on the scorecard. The dancer's FI date unlocks once her shifts are in (the take-home is
// worked out from them, so it is not missing), Overview hides the cards a household cannot light, with one line why
// (QUESTIONS 330), and Report › Statements follow the whose-numbers switch for a couple with no combined totals (332).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { pictureOf, unlockOf, confidenceOf } from '../js/math/picture.js';
import { LEVELS } from '../js/registry/program.js';
import { overviewNotFor } from '../js/gates.js';
import { drafttShares } from '../js/math/spending.js';
import { statements, statementRows, previous } from '../js/math/statements.js';
import { ownPlanPerson } from '../js/registry/couples.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-06T12:00:00Z');
const persona = id => importFile(JSON.parse(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url))));
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const nov = { kind: 'month', ym: '2026-11' };

test('the dancer: income worked out from her shifts is in, so the FI date unlocks (hand-checked)', () => {
  // Nova types no take-home: 3 shifts a week (13 a month) at $575, less an $80 house fee and a $20 tip-out, is $475 x
  // 13 = $6,175 a month, $74,100 a year. SE tax 15.3% x 92.35% x $74,100 = $10,470.00; federal on $74,100 - $5,235.00
  // - $16,100 = $52,765 is $6,320.30 (NV has none): ($74,100 - $16,790.30) / 12 = $4,775.81 a month.
  const doc = persona('dancer');
  const m = metrics(doc, ref, { now });
  near(m.inputs.takeHome, 4775.81);
  const pic = pictureOf(doc, ref, { now });
  const inc = pic.items.filter(it => it.group === 'income');
  assert.equal(inc.length, 1);
  assert.equal(inc[0].level, LEVELS.Rough, 'the row is marked Roughly, so Rough: in, not Missing');
  const u = unlockOf('fi', pic);
  assert.equal(u.unlocked, true, u.reason);
  // Inputs: income Rough 50 (weight 3), the gut Gut 25 (weight 6); no invested area. (150 + 150) / 9 = 33: Low.
  assert.equal(confidenceOf('fi', pic, { now }).word, 'Low');
  assert.equal(m.monthsToFi.value, 294, 'the FI month the def works out by hand');
});

test('a row with nothing typed and no shifts stays Missing, and a computed take-home counts no higher than Estimate', () => {
  const base = persona('dancer');
  const row = base.records.find(r => r.kind === 'income');
  const blank = { ...base, records: base.records.map(r => (r === row ? { ...r, values: { incomeType: '1099' } } : r)) };
  assert.equal(pictureOf(blank, ref, { now }).items.find(it => it.group === 'income').level, LEVELS.Missing);
  assert.equal(unlockOf('fi', pictureOf(blank, ref, { now })).unlocked, false);
  const sure = { ...base, records: base.records.map(r => (r === row ? { ...r, status: null } : r)) };
  assert.equal(pictureOf(sure, ref, { now }).items.find(it => it.group === 'income').level, LEVELS.Estimate, 'worked out, not typed: Estimate');
});

// The Overview's own inputs, the way overviewScreen reads them (debtRatios: no debt is a real 0%, no card is "none").
const notFor = doc => {
  const m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }), x = m.inputs;
  const shares = drafttShares(x.lines, x.takeHome, { roommates: x.roommates });
  const topLetter = shares.value ? Object.entries(shares.value).sort((a, b) => b[1] - a[1]).find(([, v]) => v > 0) ?? null : null;
  const owed = x.debts.filter(d => d.balance > 0);
  const ratios = { dti: { value: owed.length ? 0.1 : x.gates.areas.debt === false || !x.debts.length ? 0 : null }, util: { none: !doc.records.some(r => r.kind === 'debt' && r.type === 'Credit card') } };
  return overviewNotFor(x, { ratios, topLetter }).map(n => n.key).sort();
};

test('Q330: Overview hides only the cards a household cannot light', () => {
  // The multimillionaire: owns outright (no mortgage, no rent line), no debt, no cards, spending one gut number whose
  // three lines are giving, family and tuition (no group letter): all four are hidden.
  assert.deepEqual(notFor(persona('multimillionaire')), ['draftt', 'dti', 'housing', 'util']);
  // The dancer rents (Housing % stays, with its one-click unlock), has no debt and no cards, and a gut number only.
  assert.deepEqual(notFor(persona('dancer')), ['draftt', 'dti', 'util']);
  // Tom owns with a mortgage and Maya has a card: their cards stay (a lock there asks for something they have).
  assert.deepEqual(notFor(persona('tom')), ['util'], 'a mortgage and a car loan: Housing %, Debt-to-income and Biggest share (the loan payments are Debt lines) stay; no card');
  assert.deepEqual(notFor(persona('maya')), [], 'her card payment is a Debt line, so Biggest share lights');
  const why = overviewNotFor({ takeHome: 1, spendingSource: 'gut', debts: [], gates: { housing: 'Own' }, housing: null }, { ratios: { dti: { value: 0 }, util: { none: true } } });
  assert.equal(why.find(n => n.key === 'housing').why, 'you own outright, so there is no rent or mortgage line');
});

test('Q332: Statements follow the whose-numbers switch (Living together, hand-checked)', () => {
  // Jordan's own plan: take-home $4,500. Rent $2,400 and utilities $200 split 60/40 by income ($4,500 of $7,500), so
  // his part is $1,440 and $120; his card ($100) and student loan ($210) payments; the rest of his $3,200 gut is
  // spending money: $3,200 - $1,440 - $120 - $310 = $1,330. Surplus $4,500 - $3,200 = $1,300. Net worth $3,000 +
  // $12,000 - $18,000 - $1,500 = -$4,500. Sam: checking, savings and car less the car loan, $1,500 + $2,000 + $9,000
  // - $6,000 = $6,500; surplus $3,000 - $2,100 = $900.
  const doc = persona('couple-separate');
  assert.equal(ownPlanPerson(doc), 'Me');
  const me = statements(doc, ref, nov, { now, person: 'Me' });
  near(me.income.takeHome, 4500);
  near(me.income.fixed.find(l => l.name === 'Rent').value, 1440);
  near(me.income.variable.find(l => l.name === 'Electric, gas, water').value, 120);
  near(me.income.variable.find(l => l.gut).value, 1330);
  near(me.income.surplus, 1300);
  near(me.netWorth.netWorth, -4500);
  assert.ok(!me.income.fixed.some(l => /Sam/.test(l.name)), "Sam's car loan payment is not in Jordan's statement");
  const sam = statements(doc, ref, nov, { now, person: 'Partner' });
  near(sam.income.surplus, 900); near(sam.netWorth.netWorth, 6500);
  // Both (preview): the two together, a shared bill once and whole: $7,500 - $3,200 - $2,100 = $2,200 (the def's
  // household surplus), net worth -$4,500 + $6,500 = $2,000.
  const both = statements(doc, ref, nov, { now, person: 'all' });
  near(both.income.surplus, 2200); near(both.netWorth.netWorth, 2000);
  near(both.income.fixed.find(l => l.name === 'Rent').value, 2400);
  // Each matches the plan the other screens show for the same view.
  for (const p of ['Me', 'Partner', 'all']) near(statements(doc, ref, nov, { now, person: p }).income.surplus, metrics(doc, ref, { now, person: p }).surplus.value, 0.5);
  assert.ok(statementRows(me, statements(doc, ref, previous(nov), { now, person: 'Me' })).income.length > 0);
});

test('Q332: a household that is not a couple reads the same statements with or without a view', () => {
  for (const id of ['maya', 'tom', 'couple-joint']) {
    const doc = persona(id);
    const a = statements(doc, ref, nov, { now }), b = statements(doc, ref, nov, { now, person: 'all' });
    near(a.income.surplus, b.income.surplus); near(a.netWorth.netWorth, b.netWorth.netWorth);
  }
});
