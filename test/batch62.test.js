// Batch 62: the Phase 4 reads as live formulas (js/registry/reads.js). The workbook check (test/workbook-drift.test.js)
// recalculates every household in LibreOffice and wants every Check at Matches; these are the hand checks beside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { cliffOf } from '../js/math/cliff.js';
import { lenderOf } from '../js/math/lender.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { MATH } from '../js/registry/math.js';
import { READS } from '../js/registry/reads.js';
import { RULES } from '../js/registry/assumptions.js';
import { tabOfReport } from '../js/registry/tabs.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const persona = id => importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8'));
const now = new Date('2026-11-05T12:00:00Z');
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);

test('each read is a block of its session tab, and its Math rows are formulas off the read\'s named rows', () => {
  const plan = buildWorkbook(persona('single-parent'), ref, { now });
  const names = new Set(plan.names.map(n => n.name));
  for (const r of READS) {
    assert.ok(plan.sheets.find(s => s.name === tabOfReport(r.tab))?.rows.some(row => row?.[0]?.v === `#block:${r.tab}`), `${r.tab} on ${tabOfReport(r.tab)}`); // batch 59 (QUESTIONS 456)
    const e = MATH.find(x => x.id === r.math);
    assert.ok(e.sheet && e.sheet.startsWith(`${r.prefix}_`), `${r.math} reads ${r.prefix}`);
    assert.ok(names.has(e.sheet), `${e.sheet} is a named range`);
  }
  assert.ok(names.has('FireDrill_tier') && names.has('Medicaid_states_state'), 'the two new reference tables');
});

test('the inputs a coach changes are blue boxes holding the app\'s default', () => {
  const plan = buildWorkbook(persona('single-parent'), ref, { now });
  const cliff = plan.sheets.find(s => s.name === tabOfReport('Benefits cliff')); // batch 59: Money in (column A is the hidden keys)
  const raise = cliff.rows.find(r => /^Raise a year/.test(r?.[1]?.v ?? ''));
  assert.equal(raise[2].s, 'input'); assert.equal(raise[2].v, 5000);
  const drill = plan.sheets.find(s => s.name === tabOfReport('Fire drill'));
  assert.equal(drill.rows.find(r => /^The account \(/.test(r?.[1]?.v ?? ''))[2].s, 'input');
});

test('the single parent: what a $5,000 raise keeps after tax, by hand', () => {
  // Head of household in New York (not NYC), $28,000 of wages. Federal: the raise sits in the 10% bracket, $500.
  // Social Security and Medicare 7.65%, $382.50. New York: $253.375 on the extra $5,000 (its 4.5% to 5.25% brackets).
  const d = persona('single-parent');
  const C = cliffOf(d, ref, { now, m: metrics(d, ref, { now }), raise: 5000 });
  near(C.raise.afterTax, 5000 - 500 - 382.5 - 253.375);
  assert.deepEqual(C.raise.lost.map(l => l.id).sort(), ['ccap', 'eitc', 'snap']);
});

test('the bartender: a lender counts the paycheck and not the unreported cash tips', () => {
  // $2,205 a month on the W-2; $1,430 a month of cash tips are not reported, so no W-2 shows them.
  const d = persona('bartender');
  const L = lenderOf(d, ref, { now, m: metrics(d, ref, { now }) });
  near(L.mortgageIncome, 2205); near(L.earned, 3635); near(L.gap.month, 1430);
  // The home loan: the most payment (28% of $2,205 = $617.40, under 36% less the card's $58.50), 25% of it to taxes and
  // insurance, the rest as a loan at the week's rate over 30 years (PV, as the sheet's formula has it).
  const pi = 617.4 * (1 - RULES.lenderTaxInsShare), r = RULES.lenderMortgageRate / 12, n = RULES.lenderMortgageYears * 12;
  near(L.mortgage.maxPay, 617.4);
  near(L.mortgage.loan, pi * (1 - (1 + r) ** -n) / r);
});
