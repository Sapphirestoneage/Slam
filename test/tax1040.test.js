// The tax return reader: rows laid out like a Form 1040, checked line by line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { amountOf, rowsOf, amountOn, read1040, LINES } from '../js/import/tax1040.js';
import { returnPicture } from '../js/math/taxreturn.js';
import { bracketRoom } from '../js/math/lifetime.js';
const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
// one form row: the line number, the printed words, the number again in the box at the right, then the amount (if any)
const row = (y, no, words, amount) => [{ str: no, x: 40, y, w: 10 }, { str: words, x: 60, y, w: 380 }, { str: no, x: 470, y: y + 1, w: 10 }, ...(amount == null ? [] : [{ str: amount, x: 500, y: y - 1, w: 60 }])];
const page1 = [{ str: 'Form 1040 U.S. Individual Income Tax Return 2025', x: 40, y: 760, w: 400 },
  ...row(600, '1z', 'Add lines 1a through 1h', '85,000.'), ...row(586, '2b', 'Taxable interest', '310'), ...row(572, '3b', 'Ordinary dividends', null),
  ...row(558, '4b', 'IRA distributions 4a 12,000 b Taxable amount', '9,500'), ...row(544, '7', 'Capital gain or (loss). Attach Schedule D if required', '(1,200)'),
  ...row(530, '9', 'Add lines 1z, 2b, 3b, 4b, 5b, 6b, 7, and 8. This is your total income', '93,610'), ...row(516, '11', 'Subtract line 10 from line 9. This is your adjusted gross income', '93,610'),
  ...row(502, '12', 'Standard deduction or itemized deductions (from Schedule A)', '15,750'), ...row(488, '15', 'Subtract line 14 from line 11. If zero or less, enter -0-. This is your taxable income', '77,860')];
const page2 = [...row(700, '16', 'Tax (see instructions). Check if any from Form(s): 1 8814 2 4972', '12,034'), ...row(686, '24', 'Add lines 22 and 23. This is your total tax', '12,034'),
  ...row(672, '25d', 'Add lines 25a through 25c', '13,900'), ...row(658, '34', 'If line 33 is more than line 24, subtract line 24 from line 33. This is the amount you overpaid', '1,866'), ...row(644, '37', 'Subtract line 33 from line 24. This is the amount you owe', null)];

test('amounts: commas, cents, a trailing dot, parentheses and -0-', () => {
  assert.equal(amountOf('85,000.'), 85000); assert.equal(amountOf('$1,234.56'), 1234.56); assert.equal(amountOf('(1,200)'), -1200); assert.equal(amountOf('-0-'), 0);
  for (const no of ['25d', 'income', '1,23', '', null]) assert.equal(amountOf(no), null);
});
test('pieces at the same height are one row, read left to right; an empty line reads as blank, not as its line number', () => {
  const rows = rowsOf(row(500, '15', 'This is your taxable income', '77,860'));
  assert.equal(rows.length, 1); assert.equal(rows[0].words.at(-1).str, '77,860'); assert.equal(amountOn(rows[0]), 77860);
  assert.equal(amountOn(rowsOf(row(500, '15', 'This is your taxable income. If zero or less, enter -0-', null))[0]), null);
});
test('a whole return: each line by the words on the form', () => {
  const R = read1040([page1, page2]);
  assert.equal(R.is1040, true); assert.equal(R.year, 2025);
  assert.deepEqual(R.lines, { wages: 85000, interest: 310, ira: 9500, gains: -1200, total: 93610, agi: 93610, deduction: 15750, taxable: 77860, tax: 12034, totalTax: 12034, withheld: 13900, refund: 1866 });
  assert.equal(R.found, 12); assert.equal(R.of, LINES.length);
  assert.equal(read1040([[{ str: 'A bank statement for 2025', x: 10, y: 10, w: 100 }]]).is1040, false);
});
test('a typed-in form: one piece holding the number and the amount together still reads', () => {
  const R = read1040([[{ str: 'Form 1040 (2024)', x: 40, y: 760, w: 100 }, { str: '11 This is your adjusted gross income 11 52,300', x: 40, y: 500, w: 500 }, { str: '15 This is your taxable income 15 37,700', x: 40, y: 480, w: 500 }, { str: '24 This is your total tax 24 4,290', x: 40, y: 460, w: 500 }]]);
  assert.equal(R.year, 2024); assert.deepEqual(R.lines, { agi: 52300, taxable: 37700, totalTax: 4290 }); assert.equal(R.is1040, true);
});
test('the picture: effective rate, bracket room, and a refund as money a month', () => {
  const P = returnPicture(read1040([page1, page2]).lines, 'Single', ref);
  assert.ok(Math.abs(P.effective - 12034 / 93610) < 1e-12);
  assert.deepEqual(P.bracket, { taxable: 77860, ...bracketRoom(77860, 'Single', ref) });
  assert.deepEqual(P.refund, { amount: 1866, perMonth: 155.5 }); assert.equal(P.owe, null); assert.equal(P.laterMoney, 9500); assert.equal(P.kept, 93610 - 12034);
  assert.deepEqual(returnPicture({}, 'Single', ref), { effective: null, bracket: null, refund: null, owe: null, laterMoney: null, kept: null });
});
