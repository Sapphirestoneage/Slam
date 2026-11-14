// The other papers: a W-2, a pay stub and a New York return, each laid out like the real thing and checked by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readW2, readStub, readNY, readPaper } from '../js/import/papers.js';
import { w2Picture, stubPicture, nyPicture, paperGaps } from '../js/math/taxreturn.js';
const t = (str, x, y, w = 60) => ({ str, x, y, w });
// a W-2 with each amount under its label, two boxes to a row
const w2Under = [t('Form W-2 Wage and Tax Statement 2025', 40, 60, 300), t('1 Wages, tips, other compensation', 300, 700, 130), t('2 Federal income tax withheld', 450, 700, 120), t('85,000.00', 305, 686), t('9,400.00', 455, 686),
  t('3 Social security wages', 300, 660, 100), t('4 Social security tax withheld', 450, 660, 120), t('91,000.00', 305, 646), t('5,642.00', 455, 646), t('5 Medicare wages and tips', 300, 620, 100), t('6 Medicare tax withheld', 450, 620, 100), t('91,000.00', 305, 606), t('1,319.50', 455, 606),
  t('12a', 300, 580, 14), t('D', 320, 566, 8), t('6,000.00', 340, 566), t('12b', 300, 550, 14), t('W', 320, 536, 8), t('1,200.00', 340, 536), t('12c', 300, 520, 14), t('DD', 320, 506, 12), t('7,300.00', 340, 506),
  t('16 State wages, tips, etc.', 200, 470, 100), t('17 State income tax', 330, 470, 80), t('85,000.00', 205, 456), t('4,100.00', 335, 456)];
const w2Inline = [t('W-2 Wage and Tax Statement 2024', 40, 760, 300), t('1 Wages, tips, other compensation 52,300.00 2 Federal income tax withheld 4,290.00', 40, 700, 520), t('16 State wages, tips, etc. 52,300.00 17 State income tax 2,010.00', 40, 680, 520)];
const stub = [t('Earnings Statement', 40, 760, 120), t('Pay Period 10/26/2026 to 11/08/2026', 40, 745, 250), t('Earnings Rate Hours This Period Year to Date', 40, 700, 400),
  t('Regular', 40, 686), t('40.00', 150, 686), t('80.00', 220, 686), t('3,200.00', 300, 686), t('70,400.00', 400, 686), t('Gross Pay', 40, 670), t('3,200.00', 300, 670), t('70,400.00', 400, 670),
  t('Federal Income Tax', 40, 640, 100), t('352.00', 300, 640), t('7,744.00', 400, 640), t('Social Security Tax', 40, 626, 100), t('198.40', 300, 626), t('4,364.80', 400, 626), t('Medicare Tax', 40, 612, 80), t('46.40', 300, 612), t('1,020.80', 400, 612),
  t('NY State Income Tax', 40, 598, 100), t('150.00', 300, 598), t('3,300.00', 400, 598), t('401(k)', 40, 570), t('192.00', 300, 570), t('4,224.00', 400, 570), t('Medical Pre-Tax', 40, 556, 80), t('95.00', 300, 556), t('2,090.00', 400, 556), t('Dental', 40, 542), t('12.00', 300, 542), t('264.00', 400, 542),
  t('Net Pay', 40, 500), t('2,154.20', 300, 500)];
const ny = [t('IT-201 Resident Income Tax Return New York State 2025', 40, 760, 400), t('33', 40, 600, 10), t('New York adjusted gross income (subtract line 32 from line 24)', 60, 600, 380), t('33', 470, 600, 10), t('93,610', 510, 600),
  t('37', 40, 580, 10), t('Taxable income (subtract line 36 from line 35)', 60, 580, 380), t('37', 470, 580, 10), t('85,610', 510, 580), t('39', 40, 560, 10), t('NYS tax on line 37 amount', 60, 560, 380), t('39', 470, 560, 10), t('4,620', 510, 560),
  t('47a', 40, 540, 14), t('New York City resident tax on line 47 amount', 60, 540, 380), t('47a', 470, 540, 14), t('2,870', 510, 540), t('62', 40, 520, 10), t('Total New York State, New York City, Yonkers, and sales or use taxes', 60, 520, 380), t('62', 470, 520, 10), t('7,490', 510, 520),
  t('72', 40, 500, 10), t('Total New York State tax withheld', 60, 500, 380), t('72', 470, 500, 10), t('4,900', 510, 500), t('78', 40, 480, 10), t('Amount of line 77 to be refunded', 60, 480, 380), t('78', 470, 480, 10), t('310', 510, 480), t('80', 40, 460, 10), t('Amount you owe', 60, 460, 380), t('80', 470, 460, 10)];

test('a W-2 with amounts under their labels: each box takes the amount in its own column, and box 12 by its code', () => {
  const R = readW2([w2Under]);
  assert.equal(R.ok, true); assert.equal(R.year, 2025);
  assert.deepEqual(R.lines, { wages: 85000, fedTax: 9400, ssWages: 91000, ssTax: 5642, medWages: 91000, medTax: 1319.5, stateWages: 85000, stateTax: 4100, k401: 6000, hsa: 1200, healthCost: 7300 });
  const P = w2Picture(R.lines);
  assert.ok(Math.abs(P.withheldShare - 9400 / 85000) < 1e-12); assert.equal(P.saved, 6000); assert.ok(Math.abs(P.savedShare - 6000 / 91000) < 1e-12); assert.equal(P.hsa, 1200); assert.equal(P.stateTax, 4100);
});
test('a W-2 printed with each amount right after its label reads the same way', () => {
  const R = readW2([w2Inline]);
  assert.deepEqual(R.lines, { wages: 52300, fedTax: 4290, stateWages: 52300, stateTax: 2010 }); assert.equal(R.year, 2024);
});
test('a pay stub: this period and the year so far, by the words on each row', () => {
  const R = readStub([stub]);
  assert.equal(R.ok, true);
  assert.deepEqual(R.lines, { gross: 3200, net: 2154.2, fedTax: 352, ssTax: 198.4, medTax: 46.4, stateTax: 150, k401: 192, health: 107 });
  assert.equal(R.ytd.gross, 70400); assert.equal(R.ytd.health, 2354);
  near(3200 - 352 - 198.4 - 46.4 - 150 - 192 - 107, 2154.2);
  const P = stubPicture(R.lines, 26);
  near(P.netMonth, 2154.2 * 26 / 12); near(P.grossYear, 83200); near(P.taxShare, (352 + 198.4 + 46.4 + 150) / 3200); near(P.savedShare, 0.06); near(P.keptShare, 2154.2 / 3200); near(P.other, 0);
  assert.equal(stubPicture(R.lines, null).netMonth, null);
});
function near(a, b) { assert.ok(Math.abs(a - b) < 0.005, `${a} against ${b}`); }
test('a New York return: state and city tax, the share of New York income, the refund; an empty line stays blank', () => {
  const R = readNY([ny]);
  assert.equal(R.ok, true); assert.equal(R.year, 2025);
  assert.deepEqual(R.lines, { agi: 93610, taxable: 85610, stateTax: 4620, cityTax: 2870, total: 7490, withheld: 4900, refund: 310 });
  const P = nyPicture(R.lines);
  assert.equal(P.tax, 7490); near(P.effective, 7490 / 93610); assert.equal(P.city, 2870); assert.deepEqual(P.refund, { amount: 310, perMonth: 310 / 12 }); assert.equal(P.owe, null);
});
test('which paper is it: the form\'s own name decides, and a stub is whatever has gross and net pay', () => {
  assert.equal(readPaper([w2Under]).kind, 'w2'); assert.equal(readPaper([ny]).kind, 'ny'); assert.equal(readPaper([stub]).kind, 'stub');
  const ret = readPaper([[t('Form 1040 U.S. Individual Income Tax Return 2025', 40, 760, 300), t('11 This is your adjusted gross income 11 52,300', 40, 500, 500), t('15 This is your taxable income 15 37,700', 40, 480, 500), t('24 This is your total tax 24 4,290', 40, 460, 500)]]);
  assert.equal(ret.kind, 'return'); assert.equal(ret.lines.agi, 52300);
  assert.equal(readPaper([[t('A grocery list', 10, 10)]]).kind, null);
});
test('gaps: only the ones wider than their tolerance, each as paper minus plan', () => {
  const stubLines = readStub([stub]).lines;
  const G = paperGaps({ ret: { wages: 85000 }, w2: { wages: 85000 }, stub: stubLines, perYear: 26 }, { planGross: 62000, takeHome: 4200 });
  assert.deepEqual(G.map(g => g.id), ['takeHome', 'wagesPlan']);
  near(G[0].paper, 2154.2 * 26 / 12); assert.equal(G[0].plan, 4200); near(G[0].by, 2154.2 * 26 / 12 - 4200);
  assert.equal(G[1].by, 23000); near(G[1].share, 23000 / 85000);
  assert.deepEqual(paperGaps({ w2: { wages: 85000 }, ret: { wages: 85500 } }, {}), [], 'half a percent apart is the same number');
  assert.deepEqual(paperGaps({ w2: { wages: 60000 }, ret: { wages: 85000 } }, {}).map(g => g.id), ['w2Return']);
  assert.deepEqual(paperGaps({ stub: stubLines, perYear: 26 }, { takeHome: 4000 }).map(g => g.id), ['takeHome'], '14% apart');
  assert.deepEqual(paperGaps({ stub: stubLines, perYear: 26 }, { takeHome: 4600 }), [], '1.4% apart is close enough');
  assert.deepEqual(paperGaps({ stub: stubLines, perYear: 26 }, { takeHome: 4667 }), []);
  assert.deepEqual(paperGaps({}, { planGross: 1, takeHome: 1 }), []);
  assert.deepEqual(paperGaps({ ret: { wages: 85000 }, stub: stubLines, perYear: 26 }, { planGross: 62000, takeHome: 4667 }), [], 'a stub that agrees with the plan settles it');
});
