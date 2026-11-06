// Batch 38: the workbook matches the app for every persona (QUESTIONS 326). Each household's workbook is
// recalculated in LibreOffice (tools/workbook-check.mjs, docs/WORKBOOK.md) and every Check cell on Math, Statements,
// FOO and Projections must say Matches: to the cent where the app shows cents (M01, M17), within $1 or 1 month
// otherwise. It runs on the 14 personas, the Demo client, and Alexis and Tom through Fast Track; without ExcelJS or
// LibreOffice it skips and says which is missing. The hand checks below the big one need neither.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { gapOf } from '../js/math/gap.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { check, lineOf, missing, HOUSEHOLDS, PERSONA_IDS, ExcelJS, soffice } from '../tools/workbook-check.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const persona = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));
const now = new Date('2026-11-05T12:00:00Z');
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);

// The workbook is built as of today, so the sheet's TODAY() and the app's month agree (sinking funds, Starts in).
test('every persona, the Demo and Fast Track Alexis and Tom: every Math row and statement line matches the app', { skip: missing, timeout: 900000 }, async () => {
  assert.equal(HOUSEHOLDS.length, PERSONA_IDS.length + 3);
  assert.ok(PERSONA_IDS.length >= 14, 'the 14 personas');
  const res = await check(HOUSEHOLDS);
  const off = Object.entries(res).flatMap(([label, list]) => list.map(o => `${label}: ${lineOf(o)}`));
  assert.deepEqual(off, [], 'rows where the sheet and the app differ');
});

// Batch 45 (QUESTIONS 334): a file made last month and opened today: the multimillionaire's sinking fund rows have a
// month less to go, so their Check cells say they moved on (not a gap); the rows with no date still match.
test('a file made last month: the dated rows say Moved on since this file was made, nothing else differs on them', { skip: missing, timeout: 300000 }, async () => {
  const made = new Date(); made.setDate(15); made.setMonth(made.getMonth() - 1);
  const res = await check(HOUSEHOLDS.filter(([l]) => l === 'multimillionaire'), { now: made });
  const r = res.multimillionaire;
  assert.ok(r.moved.includes('Math M27 · sinking'), `moved: ${r.moved.join(', ')}`);
  assert.ok(!r.some(o => o.check !== 'cached' && /M27 · sinking/.test(o.where)), 'the sinking row is not a mismatch');
});

test('the check says what is missing when it cannot run', () => {
  if (ExcelJS && soffice) assert.equal(missing, false, 'false, so node:test runs the check (a null skip skips it)');
  else assert.match(missing, /ExcelJS|LibreOffice/);
});

// ---------- Hand checks of the rows that differed before batch 38 (the app's side, worked out by hand) ----------
test('Maya: the card payment is outside the gut number, so it comes off the surplus (M27 · debtOut)', () => {
  // $2,400 every 2 weeks = $5,200 a month; gut $3,500 not including debt; the card pays $200.
  // 5,200 - 3,500 - 200 = 1,500. The sheet looked for a Kind called "Gut number" (now "Gut number or category").
  const m = metrics(persona('maya'), ref, { now });
  near(m.inputs.takeHome, 5200); near(m.inputs.spending, 3500);
  near(m.inputs.debtPaymentsOutsideSpending, 200); near(m.surplus.value, 1500);
});

test('the multimillionaire: a sinking fund comes off the surplus until its month (M27 · sinking)', () => {
  // The assisted living deposit: $25,000 in June 2027, $5,000 saved. From November 2026 that is 7 months:
  // (25,000 - 5,000) / 7 = $2,857.14 a month, the gap the sheet showed before it had the Goals column.
  const m = metrics(persona('multimillionaire'), ref, { now });
  near(m.inputs.sinkingMonthly, 20000 / 7);
  const plan = buildWorkbook(persona('multimillionaire'), ref, { now });
  const goals = plan.sheets.find(s => s.name === 'Goals and events');
  const col = goals.rows[0].findIndex(c => c.v === 'Set aside a month (sinking fund)');
  assert.ok(col > 0, 'the Goals tab has the column');
  assert.match(goals.rows.find(r => r[col]?.f && /Parents|assisted/.test(JSON.stringify(r)))?.[col].f ?? '', /MAX\(0,[A-Z]+\d+-N\([A-Z]+\d+\)\)\/MAX\(1,/);
});

test('no investment accounts and Has investments No: invested is $0, not blank (M41 · invested)', () => {
  for (const id of ['alexis', 'dancer', 'deficit']) {
    const d = persona(id);
    assert.equal(d.profile.areas.investments, false);
    assert.equal(metrics(d, ref, { now }).inputs.invested, 0, id);
  }
});

test('a Living together couple: the workbook\'s FOO is the household\'s, the app\'s screens stay one person\'s', () => {
  // Jordan and Sam split rent $2,400 and utilities $200. The household view counts both shares ($2,600 a month); the
  // FOO the app walks for Living together is Jordan's alone (batch 33), and the workbook (both people's rows) now asks
  // foo() for the household.
  const d = persona('couple-separate');
  const lines = metrics(d, ref, { now }).inputs.typedLines.filter(l => l.amount != null);
  near(lines.reduce((s, l) => s + l.amount, 0), 2600);
  const mine = foo(d, ref, { now }), both = foo(d, ref, { now, person: null });
  const nine = F => F.steps.find(s => s.id === '9').left;
  assert.ok(nine(both) > nine(mine), 'the household has more to go than Jordan alone');
  const plan = buildWorkbook(d, ref, { now });
  assert.equal(plan.context.foo().steps.find(s => s.id === '9').left, nine(both));
});

test('the step you are on skips the windows beside the path (7 and 5b)', () => {
  const F = foo(persona('multimillionaire'), ref, { now });
  assert.equal(F.steps.find(s => s.id === '7').status, 'In progress');
  assert.equal(F.here, '8');
});

test('the gap is a formula now: what the month is short (M81)', () => {
  const d = persona('deficit');
  const m = metrics(d, ref, { now });
  assert.ok(m.surplus.value < 0);
  near(gapOf(d, m).short, -m.surplus.value);
  const row = buildWorkbook(d, ref, { now }).sheets.find(s => s.name === 'Math').rows.find(r => r[0]?.v === 'M81');
  assert.equal(row[2].f, 'IF(Math_M27="","",IF(Math_M27>=-0.5,"",-Math_M27))');
});
