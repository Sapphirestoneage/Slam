// Google Sheets first (Eli, Nov 6 2026: "sheet for me, app for clients", in Google Sheets). Every formula of every
// household's workbook uses only functions on Google Sheets' list and never leans on Excel's implicit intersection;
// every dropdown reads a range. tools/sheets-check.mjs says what and where.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { HOUSEHOLDS, NOW } from '../tools/workbook-check.mjs';
import { sheetsProblems, formulaProblems, SHEETS_FUNCTIONS } from '../tools/sheets-check.mjs';
import { everyField, richHousehold } from '../fixtures/households.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));

test('every household\'s workbook works the same in Google Sheets: its functions, its ranges, its dropdowns', () => {
  const off = [];
  for (const [label, make] of [...HOUSEHOLDS, ['every field', everyField], ['most of the math', richHousehold]]) {
    for (const p of sheetsProblems(buildWorkbook(make(), ref, { now: NOW, coach: true }))) off.push(`${label} ${p.where}: ${p.problem}`);
  }
  assert.deepEqual([...new Set(off.map(x => x.replace(/^\S+ \S+ /, '')))].slice(0, 20), []);
});

test('the check catches what Google Sheets would not take', () => {
  const multi = new Set(['Debt_balance', 'Debt_Type']);
  assert.deepEqual(formulaProblems('SUMIFS(Debt_balance,Debt_Type,"Credit card")', multi), []);
  assert.deepEqual(formulaProblems('SUMPRODUCT((Debt_Type="Credit card")*Debt_balance)', multi), []);
  assert.match(formulaProblems('IF(Debt_balance>0,1,0)', multi)[0], /range used for one value/);
  assert.match(formulaProblems('SUM(Debt_balance*2)', multi)[0], /range used for one value/);
  assert.match(formulaProblems('_xlfn.CONCAT(A1,B1)', multi)[0], /Excel-only/);
  assert.match(formulaProblems('CUBEVALUE("x")', multi)[0], /not a Google Sheets function/);
  assert.ok(SHEETS_FUNCTIONS.has('SUMIFS') && SHEETS_FUNCTIONS.has('NPER') && !SHEETS_FUNCTIONS.has('CUBEVALUE'));
});
