// Batch 51 (Nov 6 2026): four decided small items (QUESTIONS 374, 378, 379, 387) and Shift P&L (Phase 5, real lives
// wave 2, M9H, js/math/shiftpnl.js). Each check is worked by hand in its comment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile, Store, newHousehold } from '../js/records.js';
import { addPresets, ensureCategories } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers } from '../js/fasttrack.js';
import { metrics } from '../js/math/metrics.js';
import { monthView, closeMonth, closedMonths } from '../js/month.js';
import { gutAccuracy, gutVsLinesWords } from '../js/math/spending.js';
import { rangesOf, fooRangeOf, knobsOf, runsOf, rangeFromRuns, readOut } from '../js/math/ranges.js';
import { askNextOf, spanOf } from '../js/math/nextbest.js';
import { ageOnlyRangesOf } from '../js/math/agestart.js';
import { LEVELS } from '../js/registry/program.js';
import { categoryLinesWords, PRIVATE_LINE, foldDoc } from '../js/privacy.js';
import { shiftPnlOf, shiftPnlsOf, shiftCostsOf, shiftHoursOf, isShiftRow } from '../js/math/shiftpnl.js';
import { ASSUMPTIONS } from '../js/registry/assumptions.js';
import { mathById } from '../js/registry/math.js';
import { AREAS } from '../js/registry/fields.js';
import { loadDefs } from '../tools/personas/build.mjs';

const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root)));
const data = JSON.parse(readFileSync(new URL('data/priors-2026.json', root), 'utf8'));
const pnow = new Date('2026-11-05T12:00:00Z'); // the personas' moment
const now = new Date('2026-11-06T15:00:00Z');
const persona = id => importFile(readFileSync(new URL(`fixtures/personas/${id}.json`, root), 'utf8'));
const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);

// ---------- QUESTIONS 374: a month's own gut number feeds Lines vs gut and that month's gut accuracy ----------
test('Q374: a month\'s own gut number is that month\'s Lines vs gut and its gut accuracy (Maya, by hand)', () => {
  const s = new Store(persona('maya'), { now: () => pnow.toISOString() });
  // Maya's usual gut $3,500. December's own gut $4,500 is what December's Budget compares its lines to.
  s.setIn('spending', ['months', '2026-12', 'gut'], 4500);
  assert.equal(monthView(s.doc, ref, '2026-12', { now: pnow }).gut, 4500);
  assert.equal(monthView(s.doc, ref, '2027-01', { now: pnow }).gut, 3500);
  const w = gutVsLinesWords({ gut: 4500, lineTotal: 4000, categories: [{ key: 'Accommodation', amount: 1750, counts: true }], month: 'December 2026' });
  assert.equal(w.text, 'Lines are $500 under your December 2026 gut number.');
  // November closed with actuals of $4,000 against its own gut $4,400: off by 400 / 4,000 = 10%. Typing the month's own
  // gut after it closed still counts: 4,200 makes it 200 / 4,000 = 5%.
  s.setIn('spending', ['months', '2026-11', 'gut'], 4400);
  s.setIn('spending', ['months', '2026-11', 'summary'], { gut: 4400, estimate: 4400, actual: 4000 });
  s.setIn('spending', ['months', '2026-11', 'closed'], true);
  near(gutAccuracy(closedMonths(s.doc)).value, 0.10, 1e-9);
  s.setIn('spending', ['months', '2026-11', 'gut'], 4200);
  near(gutAccuracy(closedMonths(s.doc)).value, 0.05, 1e-9);
  // A month with no gut of its own keeps the guess it closed with.
  s.setIn('spending', ['months', '2026-11', 'gut'], undefined);
  near(gutAccuracy(closedMonths(s.doc)).value, 0.10, 1e-9);
});

test('Q374: closing a month with its own gut number keeps it as that month\'s guess', () => {
  const s = new Store(persona('maya'), { now: () => pnow.toISOString() });
  s.setIn('spending', ['months', '2026-10', 'gut'], 4100);
  closeMonth(s, ref, '2026-10', { now: pnow });
  assert.equal(closedMonths(s.doc).find(m => m.ym === '2026-10').guess, 4100);
});

// ---------- QUESTIONS 378: a category whose only line is coach-only ----------
test('Q378: a Budget category whose only line is coach-only reads "Includes amounts kept private" in Client view', () => {
  assert.equal(categoryLinesWords([{ id: 'a', folded: 'Coach only' }], 23), PRIVATE_LINE);
  assert.equal(PRIVATE_LINE, 'Includes amounts kept private');
  assert.equal(categoryLinesWords([{ id: 'a' }, { id: 'b', folded: 'Coach only' }], 23), '1 line', 'a line the client sees still counts as a line');
  assert.equal(categoryLinesWords([{ id: 'a', folded: 'Me and my coach' }], 23), '1 line', 'a private (not coach-only) line shows by its neutral name');
  assert.equal(categoryLinesWords([], 23), '23 starter lines, none used yet');
  assert.equal(categoryLinesWords([], 0), 'No lines: the amount alone counts');
});

// ---------- QUESTIONS 379: the Demo load toast leaves after 4 seconds on a phone ----------
test('Q379: the Demo load toast asks for 4 seconds on a phone', () => {
  const app = readFileSync(new URL('js/app.js', root), 'utf8'), st = readFileSync(new URL('js/ui/staples.js', root), 'utf8');
  assert.match(app, /Example numbers loaded\. The Demo client is made up\.', \{ phoneMs: 4000 \}/);
  assert.match(st, /phoneMs && window\.innerWidth <= 700 \? phoneMs : 5000/);
});

// ---------- QUESTIONS 387: the meter's 0% is the wider of age-only and all-guess ----------
const client = (name, patch, debts = {}) => {
  const s = new Store(newHousehold({ name })); addPresets(s, ref); ensureCategories(s);
  const a = fastTrackAnswers(s.doc);
  Object.assign(a, { hasKids: false, hasPets: false, workSituation: 'Employed (W-2)', hsaEligible: false, fsa: false, equityPay: false, state: 'NY', household: 'Solo', chips: { whyNow: ['Just want to get organized'], worry: ['Debt'], goalWords: ['Debt free'] } }, patch);
  Object.assign(a.debts, debts);
  applyFastTrack(s, a, { finished: true, now: now.toISOString() });
  return s;
};
function meterParts(s) {
  const doc = s.doc, m = metrics(doc, ref, { now }), R = rangesOf(doc, ref, { now, m });
  const zero = ageOnlyRangesOf(doc, ref, data, { now });
  const b = readOut(m);
  const gk = knobsOf(doc, ref, { force: (id, level, prior) => (prior ? null : LEVELS.Gut) });
  const runs = runsOf(doc, ref, gk, { now }).map(({ k, low, high }) => ({ id: k.id, low, high }));
  const guess = k => spanOf(k, rangeFromRuns(k, b[k], runs));
  const A = askNextOf(doc, ref, { now, m, R, F: fooRangeOf(doc, ref, { now }), zero });
  return { R, zero, guess, A, part: k => A.meter.parts.find(p => p.key === k)?.value };
}
test('Q387: Tom\'s net worth and Alexis\'s debt-free date are measured against their own all-guess widths (by hand)', () => {
  const tom = meterParts(client('Tom', { birthYear: 1988, takeHome: 9800, takePer: 'month', gut: 6500, gutIncludesDebt: true, gutFrom: 'Statements', checking: 8000, savings: 30000, invested: 410000, housing: 'Own', hasCar: true, homeValue: 650000, carValue: 22000, fiAge: 50 }));
  // Tom's net worth after Fast Track runs $1,076,982 to $1,163,018 ($86,037 wide). A plan from his age alone is $83,744
  // wide, narrower than his own range, so it read 0%. His own numbers all read as guesses: $384,723 wide. The wider
  // zero is the all-guess one: 1 - 86,037 / 384,723 = 77.6%.
  near(tom.R.netWorth.width, 86036.72, 1);
  near(spanOf('netWorth', tom.zero.netWorth), 83744.27, 1);
  near(tom.guess('netWorth'), 384723.28, 1);
  near(tom.part('netWorth'), 1 - 86036.72 / 384723.28, 0.001);
  assert.ok(tom.part('netWorth') > 0.7, 'no longer near 0%');
  // The FI date keeps the age-only zero where it is the wider: 600 months open-ended against 124, so 1 - 32 / 600.
  near(tom.part('fi'), 1 - tom.R.fi.width / 600, 1e-9);
  const alexis = meterParts(client('Alexis', { birthYear: 1998, takeHome: 1200, takePer: 'paycheck', payFrequency: '2 weeks', gut: 2800, gutIncludesDebt: false, checking: 400, savings: 0, invested: 0, housing: 'Rent', hasCar: false }, { 'Credit card': { balance: 4200, payment: 120, rows: 0 } }));
  // Alexis's debt-free date runs 35 to 85 months (50 wide). Age-only: 55 months wide (it read 1 - 50 / 55 = 9%). All her
  // numbers read as guesses: 113 months. 1 - 50 / 113 = 55.8%.
  assert.deepEqual([alexis.R.debtFree.low, alexis.R.debtFree.high], [35, 85]);
  assert.equal(spanOf('debtFree', alexis.zero.debtFree), 55);
  assert.equal(alexis.guess('debtFree'), 113);
  near(alexis.part('debtFree'), 1 - 50 / 113, 1e-9);
  // The meter after Fast Track: Tom 87%, Alexis 69% (were 73% and 49%).
  near(tom.A.meter.value, 0.873, 0.005);
  near(alexis.A.meter.value, 0.693, 0.005);
});

// ---------- Shift P&L (M9H) ----------
const shiftRow = (values, extra = {}) => ({ r: { id: 'x', name: 'Weekend nights', type: 'Self-employed', values }, takeHome: { value: 3900 }, work: { any: true, shifts: 3, shiftsMonth: 13, pay: { shift: 400, month: 5200 }, card: null, cash: null, fee: { shift: 50, month: 650 }, tipOut: null, reported: null },
  cash: { mode: 'shifts' }, gross: 54600, ...extra });
test('Shift P&L by hand: a ride one way, a sitter, outfits, and every hour', () => {
  // $3,900 take-home over 13 shifts = $300 a shift. Gross $400 less a $50 house fee less $50 tax set aside = $300.
  // A ride home one way $22; a sitter 7 hours x $18 = $126; outfits $250 over 25 shifts = $10. $300 - 22 - 126 - 10 =
  // $142. Hours: 1 getting ready + 1 travel + 6 the shift + 0 winding down = 8, so $142 / 8 = $17.75 an hour (on the
  // clock $300 / 6 = $50). Against an hourly value of $22.54: $4.79 under.
  const v = { hoursShift: 6, prepHours: 1, travelHours: 1, travelBy: 'Ride', travelCost: 22, travelWays: 1, sitterHours: 7, sitterRate: 18, gearCost: 250, gearShifts: 25 };
  const p = shiftPnlOf(shiftRow(v), { ref, hourly: { value: 22.54, guess: true } });
  near(p.gross, 400); near(p.fee, 50); near(p.tax, 50); near(p.takeHome, 300);
  near(p.costs.travel.amount, 22); near(p.costs.childcare.amount, 126); near(p.costs.gear.amount, 10);
  near(p.real, 142); assert.equal(p.hours.total, 8); near(p.realHourly, 17.75); near(p.ownHourly, 50); near(p.vs, -4.79);
  near(p.month.real, 142 * 13);
  assert.match(p.result.text, /\$22\.00 getting there \(\$22\.00 one way\)/);
  assert.match(p.result.text, /Over 8 hours \(1 getting ready, 1 travel, 6 the shift\): \$17\.75 an hour/);
  // Driving instead: 30 miles x $0.725 = $21.75; both ways is the default for a ride ($15 x 2 = $30).
  near(shiftCostsOf({ travelBy: 'Drive', milesShift: 30 }, ref).travel.amount, 21.75);
  near(shiftCostsOf({ travelBy: 'Ride', travelCost: 15 }, ref).travel.amount, 30);
  assert.equal(shiftCostsOf({ travelBy: 'Walk' }, ref).travel.amount, 0);
  assert.equal(shiftCostsOf({ gearCost: 200 }, ref).gear, null, 'outfits need the shifts they last');
  // No hours a shift: no real hourly, and it says what it needs.
  const q = shiftPnlOf(shiftRow({}), { ref });
  assert.equal(q.realHourly, null); assert.deepEqual(q.needs, ['the hours a shift']); near(q.real, 300);
  assert.deepEqual(shiftHoursOf({ hoursShift: 5, windDownHours: 0.5 }), { shift: 5, prep: null, travel: null, windDown: 0.5, total: 5.5, around: 0.5 });
});

test('Shift P&L: the night that pays most per real hour comes first; a private row stays folded', () => {
  const a = shiftRow({ hoursShift: 6, prepHours: 1, travelHours: 1 }); // $300 / 8 = $37.50
  const b = { ...shiftRow({ hoursShift: 4, travelHours: 1 }), r: { id: 'y', name: 'Weekday days', type: 'Self-employed', values: { hoursShift: 4, travelHours: 1 } }, takeHome: { value: 2600 } }; // $200 / 5 = $40
  const m = { inputs: { income: [a, b, { r: { id: 'z', values: {} }, takeHome: { value: 1000 }, work: null }] }, hourly: { value: 20 } };
  const P = shiftPnlsOf(m, { ref });
  assert.deepEqual(P.rows.map(r => r.name), ['Weekday days', 'Weekend nights']);
  assert.equal(P.best.name, 'Weekday days'); near(P.best.realHourly, 40);
  assert.equal(P.keptPrivate, 0);
  const F = shiftPnlsOf({ ...m, inputs: { income: [{ ...a, r: { ...a.r, folded: 'Coach only' } }, b] } }, { ref });
  assert.deepEqual(F.rows.map(r => r.name), ['Weekday days']); assert.equal(F.keptPrivate, 1); assert.equal(F.best, null);
});

test('Shift P&L in the personas: the dancer and the bartender as worked by hand; a W-2 persona has no shift rows', async () => {
  const defs = await loadDefs();
  for (const def of defs.filter(d => d.shiftPnl)) {
    const P = shiftPnlsOf(metrics(persona(def.id), ref, { now: pnow }), { ref });
    assert.equal(P.rows.length, def.shiftPnl.rows.length, def.id);
    def.shiftPnl.rows.forEach((e, i) => {
      const r = P.rows[i];
      assert.equal(r.name, e.name);
      near(r.gross, e.gross); near(r.fee, e.fee); near(r.tipOut, e.tipOut); near(r.tax, e.tax); near(r.takeHome, e.takeHome);
      near(r.costs.travel?.amount ?? 0, e.travel); near(r.costs.childcare?.amount ?? 0, e.childcare); near(r.costs.gear?.amount ?? 0, e.gear);
      near(r.real, e.real); assert.equal(r.hours.total, e.hours); near(r.ownHourly, e.ownHourly); near(r.realHourly, e.realHourly); near(r.hourly, e.hourly);
    });
  }
  assert.deepEqual(defs.filter(d => d.shiftPnl).map(d => d.id).sort(), ['bartender', 'dancer']);
  for (const id of ['alexis', 'tom', 'maya', 'teacher']) assert.equal(shiftPnlsOf(metrics(persona(id), ref, { now: pnow }), { ref }).any, false, id);
});

test('Shift P&L: a private shift row in a partner\'s or shared view is not listed; its costs never change the plan', () => {
  const doc = persona('dancer');
  const row = doc.records.find(r => r.name === 'Dancing');
  row.values.seen = 'Me and my coach';
  const shared = foldDoc(doc, { who: 'share', person: 'all', couple: false }, ref);
  const P = shiftPnlsOf(metrics(shared, ref, { now: pnow }), { ref });
  assert.equal(P.rows.length, 0); assert.equal(P.keptPrivate, 1); assert.equal(P.any, true);
  // The costs are a view: the surplus is the same with them as without them ($1,475.81, the def's hand number).
  const bare = persona('dancer');
  for (const k of ['travelBy', 'milesShift', 'gearCost', 'gearShifts']) delete bare.records.find(r => r.name === 'Dancing').values[k];
  near(metrics(bare, ref, { now: pnow }).surplus.value, 1475.81, 0.01);
  near(metrics(persona('dancer'), ref, { now: pnow }).surplus.value, 1475.81, 0.01);
});

test('registered: M9H, the mileage rate with its source and date, and every new field', () => {
  const e = mathById('M9H');
  assert.ok(e && e.fromApp && e.fns.includes('shiftpnl.shiftPnlsOf'));
  const a = ASSUMPTIONS.find(x => x.id === 'mileage.rate');
  assert.ok(a && /IR-2025-128/.test(a.source) && a.date === '2026-11-06' && a.get(ref) === 0.725);
  const keys = new Set(AREAS.flatMap(t => t.fields.map(f => f.key)));
  for (const k of ['travelBy', 'travelCost', 'travelWays', 'milesShift', 'travelHours', 'prepHours', 'windDownHours', 'sitterHours', 'sitterRate', 'gearCost', 'gearShifts']) assert.ok(keys.has(k), k);
  assert.ok(isShiftRow({ work: { shiftsMonth: 13 }, takeHome: { value: 1 } }) && !isShiftRow({ work: { shiftsMonth: 0 }, takeHome: { value: 1 } }));
});
