// Batch 60 (Nov 6 2026): three decided small items. QUESTIONS 422 (kinds of night on one income row), 424 (Shift P&L
// with tax set aside on unreported cash tips, Lindsey Swanson's lens) and 432 (NYC area on About you, the priors read
// the NY metro). Each check is worked by hand in its comment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { importFile, Store } from '../js/records.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { compare, applyChanges, linesOf, gridFromPlan } from '../js/import-sheet.js';
import { metrics } from '../js/math/metrics.js';
import { workOf, nightsRollUp, nightFromRow, addNight, copyNight, removeNight, setNight, hasNights, tipsTaxNote, NIGHT_KEYS, nightsStale } from '../js/math/earnings.js';
import { householdRates } from '../js/math/income.js';
import { shiftPnlsOf, nightsOf, cashTaxRateOf } from '../js/math/shiftpnl.js';
import { priorsOpts, typicalOf, placeOf, inNycArea, NYC_AREA } from '../js/math/priors.js';
import { planLabel } from '../js/math/agestart.js';
import { AREAS } from '../js/registry/fields.js';

const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root)));
const data = JSON.parse(readFileSync(new URL('data/priors-2026.json', root), 'utf8'));
const now = new Date('2026-11-05T12:00:00Z'); // the personas' moment
const ids = readdirSync(new URL('fixtures/personas/', root)).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
const persona = id => importFile(readFileSync(new URL(`fixtures/personas/${id}.json`, root), 'utf8'));
const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const rowsOf = doc => metrics(doc, ref, { now }).inputs.income.map(x => ({ name: x.r.name, th: x.takeHome?.value ?? null, gross: x.gross ?? null, extra: x.extra ?? null, tips: x.tipsYear ?? null }));
const dancing = doc => doc.records.find(r => r.name === 'Dancing');

// ---------- QUESTIONS 422: kinds of night ----------
test('Q422: no existing row changes: every persona\'s rows read the same as one night, and the dancer as her old single row', () => {
  for (const id of ids) {
    const doc = persona(id), before = rowsOf(doc), m0 = metrics(doc, ref, { now });
    // Every shift row turned into one night of itself (the row's own boxes as night 1) reads the same, to the cent.
    const one = persona(id);
    for (const r of one.records.filter(r => r.kind === 'income' && workOf(r).any && !hasNights(r.values) && r.values.shiftsWeek != null)) {
      r.values = { ...r.values, nights: [nightFromRow(r.values)], ...nightsRollUp({ ...r.values, nights: [nightFromRow(r.values)] }) };
    }
    assert.deepEqual(rowsOf(one).map(x => ({ ...x, th: x.th == null ? null : Math.round(x.th * 100) })), before.map(x => ({ ...x, th: x.th == null ? null : Math.round(x.th * 100) })), id);
    // And the household's own numbers are those its def worked by hand (test/personas.test.js), untouched here.
    const m1 = metrics(one, ref, { now });
    for (const k of ['surplus', 'netWorth', 'savingsRate', 'monthsToFi', 'runwayMonths']) assert.deepEqual(m1[k]?.value ?? null, m0[k]?.value ?? null, `${id} ${k}`);
  }
  // The dancer's two nights are her old single row: without the nights, the row's boxes (the roll-up) give the same.
  const two = persona('dancer'), flat = persona('dancer');
  delete dancing(flat).values.nights;
  assert.deepEqual(rowsOf(two), rowsOf(flat));
  near(metrics(two, ref, { now }).inputs.income[0].takeHome.value, 4775.81, 0.01);
});

test('Q422: the dancer\'s nights add up to her row\'s boxes (by hand)', () => {
  const v = dancing(persona('dancer')).values;
  // (2 x $650 + $425) / 3 = $575; (2 x $100 + $40) / 3 = $80; $20; (2 x 8 + 5) / 3 = 7 hours; 3 shifts a week.
  const u = nightsRollUp(v);
  assert.equal(u.shiftsWeek, 3); near(u.payShift, 575, 1e-9); near(u.houseFee, 80, 1e-9); near(u.tipOutAmount, 20, 1e-9); near(u.hoursShift, 7, 1e-9);
  for (const k of ['shiftsWeek', 'payShift', 'houseFee', 'tipOutAmount', 'hoursShift']) near(v[k], u[k], 1e-9);
  const w = workOf({ values: v });
  near(w.shiftsMonth, 13, 1e-9); near(w.pay.month, 7475, 1e-6); near(w.fee.month, 1040, 1e-6); near(w.tipOut.month, 260, 1e-6);
  assert.deepEqual(w.nights.map(n => [n.name, n.w.shifts]), [['Friday and Saturday', 2], ['Weeknight', 1]]);
});

test('Q422: each night\'s P&L by hand; the nights are ranked by the real hour and their take-homes add up to the row\'s', () => {
  const m = metrics(persona('dancer'), ref, { now });
  const P = shiftPnlsOf(m, { ref });
  // The row's tax set aside: $6,175 after fees less $4,775.81 = $1,399.19 a month, 22.659% of each dollar after fees.
  // Friday and Saturday: $650 - $100 - $20 = $530, tax $120.09, $409.91; less $17.40 driving and $12 outfits = $380.51
  // over 11 hours = $34.59. Weeknight: $365, tax $82.71, $282.29, $252.89 over 8 hours = $31.61 (on the clock $56.46,
  // the higher, but the drive and the hours around it are the same on a shorter night).
  assert.deepEqual(P.rows.map(r => r.name), ['Dancing, Friday and Saturday', 'Dancing, Weeknight']);
  const [a, b] = P.rows;
  near(a.tax, 120.09); near(a.takeHome, 409.91); near(a.real, 380.51); assert.equal(a.hours.total, 11); near(a.realHourly, 34.59); near(a.ownHourly, 51.24);
  near(b.tax, 82.71); near(b.takeHome, 282.29); near(b.real, 252.89); assert.equal(b.hours.total, 8); near(b.realHourly, 31.61); near(b.ownHourly, 56.46);
  assert.equal(P.best.name, 'Dancing, Friday and Saturday');
  near(a.takeHome * a.shiftsMonth + b.takeHome * b.shiftsMonth, m.inputs.income.find(x => x.r.name === 'Dancing').takeHome.value, 1e-6);
  assert.equal(a.rowId, b.rowId); assert.equal(a.nightId, 'fri-sat');
  assert.match(a.result.text, /^Friday and Saturday, 2 a week\. \$650\.00 pay, before tax minus \$100\.00 house fee minus \$20\.00 tip-out minus \$120\.09 tax set aside \(this night's part of the row's\) = \$409\.91 take-home a shift\./);
});

test('Q422: a paycheck row with nights shares the paycheck and its tax by shifts; cash tips stay each night\'s', () => {
  // The bartender: paycheck $1,950 a month (gross $26,460 a year, $2,205 a month; tax and deductions $255). Two nights:
  // Friday and Saturday 2 a week with $180 cash tips and $1,300 sales, a weeknight 1 a week with $60 and $400. Cash a
  // month: (2 x 180 + 60) x 52 / 12 = $1,820; tip-out 3% of (2 x 1,300 + 400) x 52 / 12 = $390; take-home $1,950 + 1,430
  // = $3,380, as before (the same $140 and $1,000 a shift on average). A night's paycheck share is its shifts: 2 / 3.
  const doc = persona('bartender'), r = doc.records.find(x => x.name === 'Bar job');
  const nights = [{ id: 'a', name: 'Friday and Saturday', shiftsWeek: 2, cashTips: 180, salesShift: 1300, hoursShift: 8 }, { id: 'b', name: 'Weeknight', shiftsWeek: 1, cashTips: 60, salesShift: 400, hoursShift: 6 }];
  r.values = { ...r.values, nights, ...nightsRollUp({ ...r.values, nights }) };
  near(r.values.cashTips, 140, 1e-9); near(r.values.salesShift, 1000, 1e-9);
  const m = metrics(doc, ref, { now });
  near(m.inputs.income[0].takeHome.value, 3380, 0.005);
  const P = shiftPnlsOf(m, { ref });
  const fs = P.rows.find(x => x.night === 'Friday and Saturday'), wk = P.rows.find(x => x.night === 'Weeknight');
  // Friday and Saturday a shift: paycheck before tax $2,205 x 2/3 / 8.667 = $169.62, plus $180 cash = $349.62; tip-out
  // $39; tax $255 x 2/3 / 8.667 = $19.62; take-home $291. Weeknight: $169.62 + $60, tip-out $12, tax $19.62: $198.
  near(fs.gross, 349.62); near(fs.tipOut, 39); near(fs.tax, 19.62); near(fs.takeHome, 291);
  near(wk.gross, 229.62); near(wk.tipOut, 12); near(wk.tax, 19.62); near(wk.takeHome, 198);
  near(fs.takeHome * fs.shiftsMonth + wk.takeHome * wk.shiftsMonth, 3380, 1e-6);
  assert.equal(nightsOf({ ...m.inputs.income[0], work: { ...m.inputs.income[0].work, nights: null } }), null, 'a row with no nights has none');
});

test('Q422: the taps: add turns the row into its first night plus a blank one, copy, remove down to one folds it back', () => {
  const v = { shiftsWeek: 3, payShift: 575, houseFee: 80, tipOutBy: '$ a shift', tipOutAmount: 20, hoursShift: 7, cardTips: 1300, cardTipsPer: 'month' };
  const a = addNight(v);
  assert.equal(a.nights.length, 2); assert.equal(a.nights[0].name, 'Friday and Saturday'); assert.equal(a.nights[1].name, 'Weeknight');
  near(a.nights[0].cardTips, 100, 1e-9, 'tips typed a month become a shift\'s: $1,300 / 13');
  assert.equal(a.nights[1].shiftsWeek, null); assert.equal(a.shiftsWeek, 3, 'a blank night adds nothing');
  const w0 = workOf({ values: v }), w1 = workOf({ values: { ...v, ...a } });
  for (const k of ['pay', 'card', 'fee', 'tipOut']) near(w1[k].month, w0[k].month, 1e-6);
  const v2 = { ...v, ...a }, c = copyNight(v2, 'n1');
  assert.equal(c.nights.length, 3); assert.equal(c.nights[1].payShift, 575); assert.equal(c.nights[1].name, 'Sunday'); assert.equal(c.shiftsWeek, 6);
  const s = setNight({ ...v2, ...c }, c.nights[1].id, { shiftsWeek: 1, payShift: 300 });
  assert.equal(s.shiftsWeek, 4); near(s.payShift, (3 * 575 + 300) / 4, 1e-9);
  const r1 = removeNight({ ...v2, ...s }, c.nights[1].id);
  assert.equal(r1.nights.length, 2);
  const r2 = removeNight({ ...v2, ...r1 }, 'n2');
  assert.equal(r2.nights, null, 'one night left is the row again'); assert.equal(r2.shiftsWeek, 3); near(r2.payShift, 575, 1e-9); near(r2.cardTips, 100, 1e-9);
  assert.deepEqual(NIGHT_KEYS, ['shiftsWeek', 'payShift', 'hoursShift', 'cardTips', 'cashTips', 'houseFee', 'tipOutAmount', 'salesShift']);
});

test('Q422: the round trip: the spreadsheet carries the nights added up; typing over them there makes the row one kind again', () => {
  const s = new Store(persona('dancer'), { now: () => now.toISOString() });
  const grid = gridFromPlan(buildWorkbook(s.doc, ref, { now }));
  assert.deepEqual(linesOf(compare(grid, s.doc)), [], 'no edits, no changes: the row\'s columns are the nights added up');
  assert.equal(nightsStale(dancing(s.doc).values), false);
  const c = grid.Income[0].indexOf('Shifts a week'), r = grid.Income.findIndex((x, i) => i > 0 && x[grid.Income[0].indexOf('Name')] === 'Dancing');
  grid.Income[r][c] = 4;
  const res = compare(grid, s.doc);
  for (const l of linesOf(res)) l.decision = 'keep';
  applyChanges(s, res);
  const v = dancing(s.doc).values;
  assert.equal(v.shiftsWeek, 4); assert.equal(v.nights, null, 'the typed 4 a week wins');
  // 4 shifts at the old average $575 - $80 - $20 = $475: $475 x 4 x 52 / 12 = $8,233.33 a month before tax.
  near(workOf({ values: v }).pay.month, 575 * 4 * 52 / 12, 1e-6);
});

// ---------- QUESTIONS 424: the shift with tax set aside on unreported cash tips ----------
test('Q424: the bartender\'s second line by hand; it uses the tips note\'s rate; no line without unreported cash tips', () => {
  const m = metrics(persona('bartender'), ref, { now });
  // FL, single: the next dollar is 10% federal + 7.65% FICA = 17.65% (over the 7.65% floor). $140 cash less the $30
  // tip-out = $110 a shift x 17.65% = $19.42 set aside; $229.00 - $19.42 = $209.59 over 10 hours: $20.96 a real hour.
  const rate = cashTaxRateOf(m, ref);
  near(rate, 0.1765, 1e-9);
  const x = m.inputs.income[0], t = householdRates(m.inputs.householdTax, ref);
  const note = tipsTaxNote(x.work, x.cash, { marginal: t.marginal, federalMarginal: t.federalMarginal, ref });
  near(note.exposure / note.yearly, rate, 1e-12);
  const p = shiftPnlsOf(m, { ref }).rows[0];
  near(p.ifCashTaxed.tax, 19.415, 1e-9); near(p.ifCashTaxed.real, 209.585, 1e-9); near(p.ifCashTaxed.realHourly, 20.96);
  assert.match(p.ifCashTaxed.text, /^\$110\.00 cash tips a shift after the tip-out x 17\.7%/);
  assert.equal(p.realHourly.toFixed(2), '22.90', 'the first line still follows the plan\'s take-home');
  // Reported cash tips have their tax on the paycheck already: no second line. The dancer has no cash tips: none.
  const rep = persona('bartender'); rep.records.find(r => r.name === 'Bar job').values.cashReported = 'Yes';
  assert.equal(shiftPnlsOf(metrics(rep, ref, { now }), { ref }).rows[0].ifCashTaxed, null);
  for (const r of shiftPnlsOf(metrics(persona('dancer'), ref, { now }), { ref }).rows) assert.equal(r.ifCashTaxed, null);
});

test('Q424: the line has no verdict words', () => {
  const ui = readFileSync(new URL('js/ui/shiftpnl-ui.js', root), 'utf8');
  assert.match(ui, /'If tax were set aside on the cash tips too: '/);
  assert.match(ui, /a real hour`\)\) : null/);
});

// ---------- QUESTIONS 432: NYC area ----------
test('Q432: NYC area is on with Live in NYC, a tap otherwise; the priors read the NY metro, then the state', () => {
  assert.equal(inNycArea({ state: 'NY', nyc: true }), true, 'on by default when Live in NYC is on');
  assert.equal(inNycArea({ state: 'NY', nyc: true, nycArea: false }), false, 'a tap turns it off');
  assert.equal(inNycArea({ state: 'NY', nyc: false }), false);
  assert.equal(inNycArea({ state: 'NY', nyc: false, nycArea: true }), true, 'Rockland, Westchester, Long Island');
  assert.equal(inNycArea({ state: 'NJ', nycArea: true }), true, 'nearby New Jersey');
  assert.equal(inNycArea({ state: 'CA', nycArea: true }), false, 'only asked in New York and New Jersey');
  assert.deepEqual(priorsOpts(persona('maya').profile).place, ['NY metro', 'NY']);
  assert.equal(priorsOpts(persona('alexis').profile).place, 'NY');
  assert.equal(priorsOpts(persona('tom').profile).place, 'NJ');
  assert.deepEqual(priorsOpts({ state: 'NJ', nycArea: true }).place, ['NY metro', 'NJ']);
  assert.ok(NYC_AREA.NY.includes('Rockland') && NYC_AREA.NY.includes('Orange') && NYC_AREA.NJ.length === 12 && NYC_AREA.NJ.includes('Ocean'));
});

test('Q432: spending scales by the metro\'s price parity in the NYC area and the state\'s elsewhere in New York (by hand)', () => {
  // BEA RPP 2024: New York-Newark-Jersey City MSA 112.563, New York State 107.921, New Jersey 108.805.
  assert.equal(placeOf(data, 'spending', ['NY metro', 'NY']).factor, 1.12563);
  assert.equal(placeOf(data, 'spending.food', 'NY').factor, 1.07921);
  assert.equal(placeOf(data, 'spending', ['NY metro', 'NJ']).factor, 1.12563);
  assert.equal(placeOf(data, 'spending', 'NJ').factor, 1.08805);
  const metro = typicalOf(data, 'spending', { age: 30, place: ['NY metro', 'NY'] }), state = typicalOf(data, 'spending', { age: 30, place: 'NY' });
  near(metro.likely / state.likely, 1.12563 / 1.07921, 1e-9);
  assert.match(metro.basis, /scaled for the New York metro/); assert.match(state.basis, /scaled for New York State \(Regional Price Parities: All Items, New York State, 2024: 107\.921/);
  // Rent has no metro row yet, so the NYC area reads New York State's ($1,621); a metro row would win once it is in.
  assert.equal(typicalOf(data, 'rent', { place: ['NY metro', 'NY'] }).likely, 1621);
  const withMetro = { ...data, rows: [...data.rows, { field: 'rent', place: 'NY metro', area: 'the New York metro', median: 1890, unit: 'month', table: 'test', year: 2024 }] };
  assert.equal(typicalOf(withMetro, 'rent', { place: ['NY metro', 'NY'] }).likely, 1890);
  assert.equal(typicalOf(withMetro, 'rent', { place: 'NY' }).likely, 1621);
  assert.equal(planLabel(data, { age: 30, place: ['NY metro', 'NY'] }).where, 'the New York area');
  assert.equal(planLabel(data, { age: 30, place: 'NY' }).where, 'New York');
});

test('registered: nights and NYC area are fields', () => {
  const income = AREAS.flatMap(t => t.fields).find(f => f.key === 'nights'), area = AREAS.flatMap(t => t.fields).find(f => f.key === 'nycArea');
  assert.ok(income && income.sheet.skip && /added together/.test(income.sheet.skip));
  assert.ok(area && area.sheet === true && area.type === 'yesno');
});
