// Batch 27 (Phase 4 Track 2, wave 1: income by type): tips as their own parts of a Job row (card tips, cash tips,
// the tip-out, reported or not), shift jobs (shifts a week, pay a shift, house fees, the take-home a shift, seasons
// feeding the irregular income view), Platform rows (gross, the registered fee, chargebacks, the hold, the payout
// schedule, landing after the hold on the calendar), cash at home, and quarterly tax money kept out of big e.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Store, newHousehold, importFile } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { layersOf, layerSnapshot } from '../js/math/layers.js';
import { incomeRow } from '../js/math/income.js';
import { workOf, workCash, perShift, tipsTaxNote, platformOf, heldDates, seasonShifts, shiftMonthsOf, PLATFORMS, SHIFTS_PER_MONTH } from '../js/math/earnings.js';
import { instances } from '../js/month.js';
import { paydayOf } from '../js/payday.js';
import { ASSUMPTIONS, TABLES } from '../js/registry/assumptions.js';
import { AREAS } from '../js/registry/fields.js';
import { OUT_DIR, loadDefs } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const persona = id => importFile(readFileSync(join(OUT_DIR, `${id}.json`), 'utf8'));
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const row = (values, extra = {}) => ({ kind: 'income', type: 'Job', amount: null, per: 'month', values, ...extra });
const solo = recs => { const s = new Store(newHousehold({ name: 'Test' })); s.setDoc('profile', { birthYear: 1996, state: 'FL', household: 'Solo', mode: 'Solo' }); for (const r of recs) s.add(r.kind, r, { type: r.type }); return s.doc; };

test('tips: card tips sit in the paycheck, cash tips come on top less a tip-out on sales (the bartender)', () => {
  const w = workOf(row({ shiftsWeek: 3, cardTips: 60, cashTips: 140, tipOutBy: '% of sales', tipOutPct: 0.03, salesShift: 1000 }));
  near(w.shiftsMonth, 13); // 3 x 52 / 12
  assert.equal(w.tipOut.shift, 30);
  const c = workCash(w, { paycheckTyped: true, taxType: 'W-2' });
  assert.equal(c.mode, 'paycheck');
  near(c.cashMonth, 1820); near(c.tipOutMonth, 390); near(c.extra, 1430);
  near(c.grossExtra, 17160); // cash kept a year, income before tax that is not in the paycheck's gross
  const doc = persona('bartender');
  const m = metrics(doc, ref, { now });
  const i = m.inputs.income[0];
  near(i.paycheck, 1950); near(i.extra, 1430); near(i.takeHome.value, 3380);
  near(perShift(i.takeHome.value, i.work), 260);
  near(m.inputs.takeHome, 3380);
  assert.match(i.takeHome.text, /card tips a shift \(in the paycheck\)/);
  assert.match(i.takeHome.text, /tip-out \(3\.0% of sales\)/);
  // The withholding is worked out on the paycheck alone: the cash tips do not read as tax held back.
  const plain = solo([{ kind: 'income', type: 'Job', amount: 900, per: '2 weeks', values: { basis: 'Take-home', payFrequency: '2 weeks', incomeType: 'W-2' } }]);
  near(metrics(plain, ref, { now }).inputs.income[0].withheld, i.withheld, 0.5);
});

test('tips: a tip-out as a share of tips or dollars a shift, and tips typed a month', () => {
  const a = workCash(workOf(row({ shiftsWeek: 4, cashTips: 2000, cashTipsPer: 'month', cardTips: 1000, cardTipsPer: 'month', tipOutBy: '% of tips', tipOutPct: 0.1 })), { paycheckTyped: true });
  near(a.tipOutMonth, 300); near(a.extra, 1700);
  const w = workOf(row({ shiftsWeek: 4, cashTips: 2000, cashTipsPer: 'month' }));
  near(w.cash.shift, 2000 / (4 * SHIFTS_PER_MONTH));
  const b = workCash(workOf(row({ shiftsWeek: 2, cashTips: 100, tipOutBy: '$ a shift', tipOutAmount: 15, houseFee: 10 })), { paycheckTyped: true });
  near(b.extra, (100 - 15 - 10) * 2 * 52 / 12);
  assert.equal(workOf(row({ basis: 'Take-home' })).any, false, 'a plain job has no tips or shifts');
});

test('shifts: no paycheck typed, the gross is worked out from the shifts; reported tips are taxed, unreported ride on top', () => {
  const v = { shiftsWeek: 3, payShift: 100, cardTips: 50, cashTips: 80, tipOutBy: '$ a shift', tipOutAmount: 20, houseFee: 10, incomeType: 'W-2' };
  const n = 13;
  const no = workCash(workOf(row({ ...v, cashReported: 'No' })), { taxType: 'W-2' });
  assert.equal(no.mode, 'shifts');
  near(no.grossYear, (100 + 50 - 20) * n * 12); // the tip-out comes off the taxed card tips first
  near(no.extra, (80 - 10) * n); // unreported cash in hand, less the W-2 house fee after tax
  const yes = workCash(workOf(row({ ...v, cashReported: 'Yes' })), { taxType: 'W-2' });
  near(yes.grossYear, (100 + 50 + 80 - 20) * n * 12);
  near(yes.extra, -10 * n);
  // 1099: the house fee and the tip-out are business costs, both off the taxed gross (the dancer).
  const se = workCash(workOf(row({ shiftsWeek: 3, payShift: 575, houseFee: 80, tipOutBy: '$ a shift', tipOutAmount: 20 })), { taxType: '1099' });
  near(se.grossYear, 74100); near(se.extra, 0);
  const m = metrics(persona('dancer'), ref, { now });
  const i = m.inputs.income[0];
  assert.equal(i.computed, 'takeHome');
  assert.equal(i.gross, 74100);
  near(i.tax.total, 16790.30); near(i.takeHome.value, 4775.81);
  near(perShift(i.takeHome.value, i.work), 367.37);
  // The row's take-home through incomeRow alone (before the household's return) is the same single-return answer.
  near(incomeRow(persona('dancer').records.find(r => r.kind === 'income'), { ref, filingStatus: 'Single' }).takeHome.value, 4775.81);
});

test('tips: the tax note is calm, names what reporting changes, and the tips deduction only in its years', () => {
  const w = workOf(row({ shiftsWeek: 3, cashTips: 140, tipOutBy: '% of sales', tipOutPct: 0.03, salesShift: 1000, cashReported: 'No' }));
  const c = workCash(w, { paycheckTyped: true });
  const n = tipsTaxNote(w, c, { marginal: 0.1765, federalMarginal: 0.1, year: 2026, ref });
  assert.equal(n.reported, false);
  near(n.yearly, 17160); near(n.exposure, 17160 * 0.1765);
  assert.match(n.text, /Social Security record/);
  assert.match(n.text, /tips deduction through 2028/);
  assert.doesNotMatch(`${n.line} ${n.text}`, /\b(bad|wrong|illegal|should|must|fail|warning)\b/i, 'no verdict words');
  assert.ok(!`${n.line} ${n.text}`.includes(String.fromCharCode(0x2014)), 'no em dashes');
  const r = tipsTaxNote(workOf(row({ shiftsWeek: 3, cashTips: 140, cashReported: 'Yes' })), c, { federalMarginal: 0.12, year: 2026, ref });
  assert.equal(r.reported, true); near(r.deduction, 17160 * 0.12);
  assert.equal(tipsTaxNote(workOf(row({ shiftsWeek: 3, cashTips: 140, cashReported: 'Yes' })), c, { federalMarginal: 0.12, year: 2029, ref }).deduction, 0, 'the deduction ends after 2028');
});

test('platforms: every platform has a registered fee, hold, payout and source; a row is net of fees and chargebacks', () => {
  for (const p of PLATFORMS) {
    const d = ref.platforms[p];
    assert.ok(d && typeof d.fee === 'number' && typeof d.holdDays === 'number' && d.payout && d.source, `${p} is registered with its source`);
  }
  assert.ok(TABLES.some(t => t.id === 'Platforms' && t.rows(ref).length === PLATFORMS.length));
  const p = platformOf({ kind: 'income', type: 'Platform', amount: 3125, per: 'month', values: { platform: 'OnlyFans', chargebacks: 150 } }, ref);
  assert.equal(p.fee, 0.2); assert.equal(p.holdDays, 7);
  near(p.feeAmount, 625); near(p.net, 2350);
  const typed = platformOf({ kind: 'income', type: 'Platform', amount: 1000, per: 'month', values: { platform: 'Etsy', feePct: 0.12, holdDays: 0 } }, ref);
  near(typed.net, 880); assert.equal(typed.holdDays, 0); assert.ok(typed.feeTyped && typed.holdTyped);
  const m = metrics(persona('creator'), ref, { now });
  const i = m.inputs.income.find(x => x.r.type === 'Platform');
  assert.equal(i.taxType, '1099');
  assert.equal(i.gross, 28200); // taxed on what is paid out: the fee is a business cost
  near(i.takeHome.value, 1755.88);
  near(m.inputs.takeHome, 4139.21);
});

test('platforms: the calendar lands each payout after the hold, before its tax (which goes out quarterly)', () => {
  const dates = heldDates('2026-11', 7, ym => (ym === '2026-10' ? ['2026-10-26'] : ym === '2026-11' ? ['2026-11-02', '2026-11-30'] : []));
  assert.deepEqual(dates.map(d => d.date), ['2026-11-02', '2026-11-09'], 'Oct 26 lands Nov 2; Nov 30 lands in December');
  const list = instances(persona('creator'), ref, '2026-11', { now }).filter(x => x.kind === 'income' && x.hold);
  assert.ok(list.length >= 4);
  for (const x of list) {
    const gap = (Date.parse(`${x.date}T00:00:00Z`) - Date.parse(`${x.earned}T00:00:00Z`)) / 86400000;
    assert.equal(gap, 7, `${x.earned} lands ${x.date}`);
    near(x.planned, 2350 * 12 / 52);
  }
  assert.ok(list.some(x => x.date === '2026-11-16' && x.earned === '2026-11-09'), 'the next payout (Nov 9) lands Nov 16');
});

test('calendar: cash tips kept land week by week apart from the paycheck, and the payday card reads the paycheck', () => {
  const doc = persona('bartender');
  const list = instances(doc, ref, '2026-11', { now }).filter(x => x.kind === 'income');
  const cash = list.filter(x => x.cash), pay = list.filter(x => !x.cash);
  assert.ok(cash.length >= 4);
  for (const x of cash) near(x.planned, 1430 * 12 / 52);
  for (const x of pay) near(x.planned, 900);
  assert.equal(new Set(list.map(x => x.key)).size, list.length, 'a paycheck and cash tips on the same day are two entries');
  const p = paydayOf(doc, ref, now);
  assert.equal(p.name, 'Bar job');
  // A slow month (January, 2 shifts a week instead of 3) lands two thirds of each.
  const jan = instances(doc, ref, '2027-01', { now }).filter(x => x.kind === 'income');
  near(jan.find(x => !x.cash).planned, 600); near(jan.find(x => x.cash).planned, 220);
});

test('seasons: the slow and busy months feed the irregular income view (self-employment before its tax)', () => {
  assert.deepEqual(seasonShifts({ shiftsWeek: 3, slowMonths: ['Jan', 'Feb'], slowShifts: 2, busyMonths: ['Dec'], busyShifts: 5 }), [2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5]);
  const b = shiftMonthsOf(metrics(persona('bartender'), ref, { now }).inputs.income);
  near(b.typical, 3380); near(b.lowest, 2253.33); assert.equal(b.months.filter(v => Math.abs(v - 2253.33) < 0.01).length, 2);
  const d = shiftMonthsOf(metrics(persona('dancer'), ref, { now }).inputs.income);
  near(d.typical, 6175); near(d.lowest, 4116.67);
  assert.equal(shiftMonthsOf(metrics(persona('creator'), ref, { now }).inputs.income), null, 'no seasons, nothing to fill');
});

test('cash kept: money set aside for taxes stays in net worth but out of emergency cash, big e and the runway', () => {
  const doc = persona('dancer');
  const m = metrics(doc, ref, { now });
  assert.equal(m.inputs.cash, 8300); assert.equal(m.inputs.taxSetAside, 3500);
  assert.equal(m.netWorth.value, 23800);
  near(m.runwayMonths.value, 8300 / 3300);
  const L = layersOf(doc, ref, now);
  const placed = L.layers.reduce((s, l) => s + l.filled, 0) + L.extra;
  near(placed, 8300);
  assert.equal(layerSnapshot(doc, ref, now).cash, 8300);
  // Cash at home is cash: in the layers like any other cash account.
  assert.ok(m.inputs.accounts.some(a => a.type === 'Cash on hand' && a.value === 2500 && !a.forTaxes));
  // The same money with Purpose: Emergency counts again.
  const back = structuredClone(doc);
  back.records.find(r => r.values?.purpose === 'Taxes').values.purpose = 'Emergency';
  assert.equal(metrics(back, ref, { now }).inputs.cash, 11800);
});

test('registered: the new fields, the Platform type, Purpose: Taxes, and the tips rules with sources and dates', () => {
  const income = AREAS.find(a => a.id === 'income');
  for (const k of ['shiftsWeek', 'payShift', 'hourly', 'hoursShift', 'houseFee', 'cardTips', 'cardTipsPer', 'cashTips', 'cashTipsPer', 'cashReported', 'tipOutBy', 'tipOutPct', 'tipOutAmount', 'salesShift', 'slowMonths', 'slowShifts', 'busyMonths', 'busyShifts', 'platform', 'feePct', 'holdDays', 'chargebacks']) assert.ok(income.fields.some(f => f.key === k), k);
  assert.ok(income.types.income.includes('Platform'));
  assert.ok(AREAS.find(a => a.id === 'assets').fields.find(f => f.key === 'purpose').options.includes('Taxes'));
  for (const id of ['deductionCap', 'phaseOutSingle', 'phaseOutJoint', 'phaseOutPer1000', 'firstYear', 'lastYear', 'reportOver', 'unreportedPenalty']) {
    const a = ASSUMPTIONS.find(x => x.id === `tax.tips.${id}`);
    assert.ok(a && a.source && a.date, id);
  }
  assert.equal(ref.tax.tips.deductionCap, 25000); assert.equal(ref.tax.tips.lastYear, 2028);
});

test('personas: what SLAM could not hold for the bartender, dancer and creator is cleared', async () => {
  const defs = Object.fromEntries((await loadDefs()).map(d => [d.id, d]));
  assert.ok(!defs.bartender.cannot.some(c => /^Tips:/.test(c)));
  assert.ok(!defs.dancer.cannot.some(c => /House fees per shift|Quarterly taxes owed|Cash income/.test(c)));
  assert.ok(!defs.creator.cannot.some(c => /^Platform payouts/.test(c)));
  assert.ok(defs.bartender.records.some(r => r.values?.cashTips != null && r.values?.tipOutBy));
  assert.ok(defs.dancer.records.some(r => r.values?.houseFee != null && r.values?.shiftsWeek != null));
  assert.ok(defs.creator.records.some(r => r.type === 'Platform'));
  assert.ok(defs.dancer.records.some(r => r.values?.purpose === 'Taxes'));
});
