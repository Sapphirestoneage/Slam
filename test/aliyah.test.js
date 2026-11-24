// Aliyah Math (aliyah.html, js/math/aliyah.js): US vs Israel, worked by hand from data/sources/israel-2026.json and
// data/reference-2026.json. Every expected number below is written out from the two files, not from the code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aliyahOf, aliyahGuesses, aliyahStart, olimPointsOf, ilIncomeTaxOf, ilNationalInsuranceOf, ALIYAH_SCENARIOS, ALIYAH_LINES } from '../js/math/aliyah.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const il = JSON.parse(readFileSync(new URL('../data/sources/israel-2026.json', import.meta.url)));
const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const same = { food: { us: 850, ilOfUs: 1 }, home: { us: 2305, ilOfUs: 1 }, move: { us: 670, ilOfUs: 1 }, health: { us: 565, ilOfUs: 1 }, rest: { us: 1195, ilOfUs: 1 } };

test('the data file still says what the hand work below assumes', () => {
  assert.deepEqual(il.incomeTax.bracketsMonthly.map(b => [b.upTo, b.rate]), [[7010, 0.10], [10060, 0.14], [19000, 0.20], [25100, 0.31], [46690, 0.35], [null, 0.47]]);
  assert.deepEqual(il.incomeTax.bracketsMonthly.slice(0, 5).map(b => b.upTo * 12), il.incomeTax.bracketsAnnual, 'the monthly bands times 12 are the yearly ones');
  assert.equal(il.creditPoints.valueAnnual, 2904); assert.equal(il.creditPoints.residentBase.man, 2.25); assert.equal(il.creditPoints.residentBase.woman, 2.75);
  assert.equal(il.nationalInsurance.reducedBandUpToMonthly, 7703); assert.equal(il.nationalInsurance.ceilingMonthly, 51910);
  assert.equal(il.nationalInsurance.employee.reduced.total, 0.0427); assert.equal(il.nationalInsurance.employee.full.total, 0.1217);
});

test('new immigrant credit points by year: 1, 3, 2.5, 1.5, 0.5, then none', () => {
  // months 1-12 at 1; 13-30 at 3; 31-42 at 2; 43-54 at 1. Year 3 is months 25-36: six at 3 and six at 2 = 30 / 12.
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(y => olimPointsOf(y, il)), [1, 3, 2.5, 1.5, 0.5, 0, 0]);
});

test('Israeli income tax on 15,000 shekels a month, by hand', () => {
  // 180,000 a year: 84,120 x 10% = 8,412; 36,600 x 14% = 5,124; 59,280 x 20% = 11,856. Total 25,392.
  // A man in his first year: 2.25 + 1 = 3.25 points x 2,904 = 9,438. Tax 15,954 a year, 1,329.50 a month.
  const t = ilIncomeTaxOf({ monthly: 15000, points: 3.25 }, il);
  assert.equal(t.whole, 25392); assert.equal(t.credit, 9438); assert.equal(t.tax, 15954); assert.equal(t.monthly, 1329.5); assert.equal(t.marginal, 0.2);
  // low pay: the credit is larger than the tax, and the tax stops at zero. 6,000 x 12 = 72,000 x 10% = 7,200 < 9,438.
  assert.equal(ilIncomeTaxOf({ monthly: 6000, points: 3.25 }, il).tax, 0);
  assert.ok(t.text.every(line => !line.includes(String.fromCharCode(8212))), 'no em dashes in the math');
});

test('the 0% rate: nothing under the ceiling, the usual bands above it', () => {
  // 15,000 a month is under every ceiling: no tax.
  assert.equal(ilIncomeTaxOf({ monthly: 15000, points: 3.25, zeroCeiling: 1000000 }, il).tax, 0);
  // 20,000 a month = 240,000 against the 2030 ceiling of 150,000: the 90,000 above it sits at 20% to 228,000 and 31%
  // after: 78,000 x 20% + 12,000 x 31% = 15,600 + 3,720 = 19,320. Less 9,438 of credit = 9,882.
  assert.equal(il.olimZeroRate.ceilingAnnual['2030'], 150000);
  near(ilIncomeTaxOf({ monthly: 20000, points: 3.25, zeroCeiling: 150000 }, il).tax, 9882);
});

test('the extra tax on high incomes, at the rate in the data', () => {
  // 70,000 a month = 840,000. Bands: 8,412 + 5,124 + 21,456 (107,280 x 20%) + 22,692 (73,200 x 31%) + 90,678 (259,080 x 35%)
  // + 131,468.40 (279,720 x 47%) = 279,830.40. No points. Extra: (840,000 - 721,560) x 3% = 3,553.20.
  const t = ilIncomeTaxOf({ monthly: 70000, points: 0 }, il);
  near(t.whole, 279830.4); near(t.surtax, 3553.2); near(t.tax, 283383.6);
});

test('National Insurance and health tax, salaried, by hand', () => {
  // 15,000: 7,703 x 4.27% = 328.9181; 7,297 x 12.17% = 888.0449. Total 1,216.963.
  near(ilNationalInsuranceOf({ monthly: 15000 }, il).total, 1216.963, 1e-6);
  // 5,000 is all in the reduced band: 213.50. Health part: 5,000 x 3.23% = 161.50.
  const low = ilNationalInsuranceOf({ monthly: 5000 }, il); near(low.total, 213.5, 1e-6); near(low.health, 161.5, 1e-6);
  // over the ceiling nothing more: 328.9181 + (51,910 - 7,703) x 12.17% = 328.9181 + 5,379.9919 = 5,708.91.
  near(ilNationalInsuranceOf({ monthly: 80000 }, il).total, 5708.91, 1e-6);
});

test('the faded US costs are the plan\'s level 1 and 2 lines, added up by group', () => {
  // Food 500 + 350. Accommodation 2,000 + 200 + 80 + 25. Transportation 200 + 200 + 60 + 130 + 80. Health 450 + 75 + 40.
  // Kids 800 + 200. The rest: 90 + 300 + 50 + 20 + 60 + 100 + 150 + 300 + 125.
  assert.deepEqual(aliyahGuesses(ref), { food: 850, home: 2305, move: 670, health: 565, kids: 1000, rest: 1195 });
  assert.deepEqual(ALIYAH_LINES.slice(0, 3).map(l => l[1]), ['Food', 'Accommodation', 'Transportation'], 'F.A.T. first');
  const s = aliyahStart({ checking: 400, savings: 9600 }, ref, il);
  assert.equal(s.savings, 10000); assert.equal(s.usGross, null, 'no pay on file, no guess'); assert.equal(s.windowFrom, 'Nov 5, 2025'); assert.equal(s.windowTo, 'Dec 31, 2026');
  assert.equal(aliyahStart({}, ref, il).savings, null);
});

test('nothing is answered until the rate, the pay and every Israel cost are in', () => {
  assert.deepEqual(aliyahOf({}, ref, il).needs.slice(0, 2), ['the exchange rate', 'your US pay']);
  const r = aliyahOf({ rate: 3.5, usGross: 100000, scenario: 'salary', spend: { ...same, food: { us: 850 } } }, ref, il);
  assert.equal(r.ready, false); assert.deepEqual(r.needs, ['the Israeli salary', 'Food in Israel']);
  assert.deepEqual(ALIYAH_SCENARIOS.map(s => s[0]), ['remote', 'salary', 'part', 'partSide', 'none']);
});

test('an Israeli salary: $100,000 single in the US against 15,000 shekels a month at 3.5, by hand', () => {
  const r = aliyahOf({ rate: 3.5, usGross: 100000, scenario: 'salary', salary: 15000, spend: same, savings: 30000, moveCost: 2075 }, ref, il);
  // US: taxable 100,000 - 16,100 = 83,900. 12,400 x 10% + 38,000 x 12% + 33,500 x 22% = 1,240 + 4,560 + 7,370 = 13,170.
  // Social Security and Medicare 7.65% = 7,650. Tax 20,820 a year = 1,735 a month. Pay 8,333.33. Costs 5,585.
  near(r.us.tax, 1735); near(r.us.left, 100000 / 12 - 1735 - 5585); // 1,013.33
  // Israel: tax 1,329.50 + 1,216.963 = 2,546.463 shekels = 727.5609 dollars. Pay 15,000 / 3.5 = 4,285.7143.
  near(r.il.taxIls, 2546.463, 1e-6); near(r.il.left, 15000 / 3.5 - 2546.463 / 3.5 - 5585); // -2,026.85
  near(r.diff, (15000 - 2546.463) / 3.5 - 5585 - (100000 / 12 - 1735 - 5585)); near(r.diffYear, r.diff * 12);
  assert.equal(Math.round(r.diff), -3040);
  // Savings: 30,000 / 5,585 = 5.37 months in the US. 27,925 after the move / 5,585 = 5 months in Israel.
  near(r.cushion.monthsUs, 30000 / 5585); assert.equal(r.cushion.monthsIl, 5); near(r.cushion.lasts, 27925 / 2026.8466, 1e-4); assert.equal(r.cushion.grows, null);
  // Pension is shown, never taken off: 6% of 15,000 = 900.
  assert.equal(r.pension, 900);
  assert.deepEqual(r.sections.map(s => s.letter).join(''), 'DAITE');
  assert.deepEqual(r.sections.at(-1).rows.map(x => x.key), ['food', 'home', 'arnona', 'move', 'health', 'rest']);
  for (const s of r.sections) for (const row of s.rows) assert.ok(row.math.length > 0, `${row.key} shows its math`);
  // What the data cannot price is said, never guessed.
  assert.deepEqual(r.notPriced.map(x => x.key), ['usTaxAbroad', 'arnona', 'healthExtra']); // health as a share of the US amount is a stand-in until shekels are typed
});

test('kosher changes the food figure on both sides, and only once a share is tapped', () => {
  const base = { rate: 4, usGross: 60000, scenario: 'none', spend: { ...same, food: { us: 1000, il: 3000 } } };
  const off = aliyahOf(base, ref, il), on = aliyahOf({ ...base, kosher: true, kosherUs: 0.2, kosherIl: 0.1 }, ref, il), blank = aliyahOf({ ...base, kosher: true }, ref, il);
  const food = r => r.sections.at(-1).rows[0];
  assert.equal(food(off).us, 1000); assert.equal(food(off).il, 750); // 3,000 shekels at 4
  near(food(on).us, 1200); near(food(on).il, 825); near(food(on).ilIls, 3300);
  assert.equal(food(blank).us, 1000, 'no share tapped: nothing added');
  assert.deepEqual(blank.notPriced.filter(x => x.key.startsWith('kosher')).map(x => x.key), ['kosherUs', 'kosherIl']);
});

test('keeping the US job: Israeli tax on the pay in shekels, or none when it is counted as foreign', () => {
  const x = { rate: 3, usGross: 72000, scenario: 'remote', spend: same };
  // 72,000 x 3 / 12 = 18,000 shekels a month = 216,000 a year: 8,412 + 5,124 + 95,280 x 20% = 32,592. Less 9,438 = 23,154.
  const r = aliyahOf(x, ref, il), tax = k => r.sections[3].rows.find(q => q.key === k);
  near(tax('ilIncome').ilIls, 23154 / 12); assert.equal(tax('ilNi').ilIls, 0, 'not priced until a tap or a number');
  assert.ok(r.notPriced.some(q => q.key === 'niOther')); assert.ok(r.notPriced.some(q => q.key === 'usTaxAbroad'));
  // salaried rates on tap: 328.9181 + (18,000 - 7,703) x 12.17% = 328.9181 + 1,253.1449 = 1,582.063.
  const s = aliyahOf({ ...x, remoteNi: 'salaried' }, ref, il); near(s.sections[3].rows.find(q => q.key === 'ilNi').ilIls, 1582.063, 1e-6); assert.ok(!s.notPriced.some(q => q.key === 'niOther'));
  const f = aliyahOf({ ...x, remoteTreat: 'foreign', niOther: 600, usTaxAbroad: 3600 }, ref, il);
  assert.equal(f.sections[3].rows.find(q => q.key === 'ilIncome').il, 0); near(f.il.tax, 600 / 3 + 300);
  // a woman in her second year: 2.75 + 3 = 5.75 points = 16,698. 32,592 - 16,698 = 15,894.
  near(aliyahOf({ ...x, resident: 2.75, year: 2 }, ref, il).sections[3].rows.find(q => q.key === 'ilIncome').ilIls, 15894 / 12);
  // landing in the window, first year: the 2026 ceiling of 1,000,000 covers all of it.
  assert.equal(aliyahOf({ ...x, window: true }, ref, il).sections[3].rows.find(q => q.key === 'ilIncome').il, 0);
});

test('part-time plus a side income, and no income for a landing period', () => {
  // 6,000 + 4,000 = 10,000 a month = 120,000: 8,412 + 35,880 x 14% = 13,435.20. Less 9,438 = 3,997.20 a year.
  // National Insurance on the 6,000 job only: 256.20. The side income's is not priced.
  const r = aliyahOf({ rate: 3.5, usGross: 80000, scenario: 'partSide', partPay: 6000, side: 4000, spend: same }, ref, il);
  near(r.il.taxIls, 3997.2 / 12 + 256.2, 1e-6); assert.ok(r.notPriced.some(q => q.key === 'niOther'));
  // No income: every month the Israel costs come out of savings. 40,000 - 6 x 5,585 = 6,490 after six months.
  const n = aliyahOf({ rate: 3.5, usGross: 80000, scenario: 'none', landing: 6, savings: 40000, spend: same }, ref, il);
  assert.equal(n.il.income, 0); assert.equal(n.il.left, -5585); near(n.cushion.afterLanding, 6490); near(n.cushion.lasts, 40000 / 5585);
});

test('children: the US credit is counted, the Israeli points are named as not priced, and the kids line joins the costs', () => {
  const spend = { ...same, kids: { us: 1000, il: 2000 } };
  const r = aliyahOf({ rate: 4, usGross: 100000, filing: 'Married jointly', kids: 2, scenario: 'none', spend }, ref, il);
  // Joint: taxable 67,800: 24,800 x 10% + 43,000 x 12% = 7,640. Credit 2 x 2,200 = 4,400. FICA 7,650. (7,640 - 4,400 + 7,650) / 12.
  near(r.us.tax, (7640 - 4400 + 7650) / 12); assert.ok(r.notPriced.some(q => q.key === 'kidPoints'));
  assert.equal(r.sections.at(-1).rows.find(q => q.key === 'kids').il, 500);
  near(aliyahOf({ rate: 4, usGross: 100000, place: 'other', stateTax: 2400, scenario: 'none', spend: same }, ref, il).us.tax, 1735 + 200);
});

test('the page is linked from the front door and reads its figures from the dated file', () => {
  const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  assert.match(read('js/solo/hub.js'), /aliyah\.html/); assert.match(read('aliyah.html'), /js\/solo\/aliyah\.js/);
  const page = read('js/solo/aliyah.js'), math = read('js/math/aliyah.js');
  assert.match(page, /data\/sources\/israel-2026\.json/);
  for (const src of [page, math, read('css/aliyah.css')]) { assert.ok(!src.includes(String.fromCharCode(8212)), 'no em dashes'); assert.doesNotMatch(src, /type="range"|#f00|\bred\b/i, 'no sliders, no red'); }
  assert.doesNotMatch(math, /0\.0427|0\.1217|7703|51910|2904|84120|7010/, 'no Israeli figure is typed into the math');
});
