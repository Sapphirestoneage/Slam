// Lifestyle creep and enough (run Not built, groups 1 to 5, Part 3): the one engine (js/math/enough.js), the coach
// app's reading of the ledger (js/enough.js), the Rough numbers switch in the one money formatter, and a scan that
// keeps every screen's money going through that formatter. The game's copy is held to this file by the last tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { enYears, enCreep, enCreepWords, enStepCreep, enPareto, enEnough, enRough, enLevel, EN_RULES } from '../js/math/enough.js';
import { money, setRough, roughOn } from '../js/format.js';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { metrics } from '../js/math/metrics.js';
import { fiDate } from '../js/math/fi.js';
import { enoughOf, creepRowsOf, creepCardOf } from '../js/enough.js';

const root = new URL('..', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const NOW = new Date('2026-11-25T12:00:00Z');
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} is not ${b}`);
const month = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
// A ledger: each year, months 1..n, a category amount a month, income a month (or none).
function ledger(years) {
  const rows = [];
  for (const [y, n, cats, inc] of years) for (let m = 1; m <= n; m++) {
    for (const [cat, amt] of Object.entries(cats)) rows.push({ d: month(y, m), amt, cat, kind: 'out' });
    if (inc != null) rows.push({ d: `${month(y, m)}-15`, amt: inc, kind: 'in' });
  }
  return rows;
}

test('enYears: a year is the months that hold spending; income is null when none was logged, never 0', () => {
  const Y = enYears(ledger([[2025, 12, { Food: 400 }, 4000], [2026, 6, { Food: 500 }, null]]));
  assert.equal(Y.length, 2);
  assert.deepEqual([Y[0].months, Y[0].avgOut, Y[0].avgIn], [12, 400, 4000]);
  assert.deepEqual([Y[1].months, Y[1].avgOut, Y[1].avgIn], [6, 500, null]);
  assert.equal(enYears([{ d: 'bad', amt: 5, kind: 'out' }, { d: '2026-01', amt: NaN, kind: 'out' }]).length, 0);
  assert.deepEqual(['Guess', 'Close', 'Exact'], [enLevel(5), enLevel(6), enLevel(12)]);
});

test('enCreep: spending growth next to income growth, by category, a part year compared fairly', () => {
  const C = enCreep(ledger([[2025, 12, { Food: 400, Home: 1500, Fun: 200 }, 4000], [2026, 9, { Food: 480, Home: 1530, Fun: 300 }, 4100]]));
  assert.equal(C.ready, true);
  assert.deepEqual([C.prev.year, C.now.year], [2025, 2026]);
  near(C.spendGrowth, 2310 / 2100 - 1); // per month, so 9 months of 2026 do not look like less spending
  near(C.income.growth, 0.025); assert.equal(C.income.from, 'ledger');
  assert.equal(C.alert, true); near(C.gap, 2310 - 2100 * 1.025);
  assert.equal(C.level, 'Close');
  assert.equal(C.inflation, null); assert.equal(C.mutants.length, 0, 'no rate tapped judges no line');
  assert.deepEqual(C.turn, { cat: 'Fun', back: 100, to: 'last year' });
  assert.equal(C.cats[0].cat, 'Home', 'biggest first');
});

test('enCreep: the mutant lines grow faster than inflation, and only by a real amount', () => {
  const C = enCreep(ledger([[2025, 12, { Food: 400, Home: 1500, Tiny: 4 }, 4000], [2026, 12, { Food: 480, Home: 1530, Tiny: 8 }, 4000]]), { inflation: 0.027 });
  const by = Object.fromEntries(C.cats.map(c => [c.cat, c]));
  assert.equal(by.Food.mutant, true); near(by.Food.overInflation, 480 - 400 * 1.027);
  assert.equal(by.Home.mutant, false, '2% is under prices');
  assert.equal(by.Tiny.mutant, false, `doubled, but less than $${EN_RULES.mutantMin} a month past prices`);
  assert.equal(C.level, 'Exact');
  assert.equal(C.turn.cat, 'Food'); assert.equal(C.turn.to, 'inflation');
});

test('enCreep: no income in the ledger: no alert until a guess is tapped, and then it says so', () => {
  const rows = ledger([[2025, 12, { Food: 400 }, null], [2026, 12, { Food: 480 }, null]]);
  const A = enCreep(rows);
  assert.equal(A.income.growth, null); assert.equal(A.alert, false); assert.equal(enCreepWords(A, money), null);
  const B = enCreep(rows, { incomeGrowth: 0.03 });
  assert.equal(B.income.from, 'tapped'); assert.equal(B.incomeLevel, 'Guess'); assert.equal(B.alert, true);
  const W = enCreepWords(B, money);
  assert.equal(W.head, 'Recalculating');
  assert.match(W.line, /^Spending grew 20% from 2025 to 2026, the 3% raise you tapped\. That is about \$\d+ a month more than your income's pace\.$/);
  assert.match(W.next, /^Hold Food at last year's level: about \$80 a month back\.$/);
  for (const t of [W.head, W.line, W.next]) assert.doesNotMatch(t, /mistake|failed|behind|off track|overspen|warning|bad|too much/i);
});

test('enCreep: not ready says what it needs; three years give a yearly rate', () => {
  const one = enCreep(ledger([[2026, 12, { Food: 400 }, 4000]]));
  assert.equal(one.ready, false); assert.match(one.need, /two years/);
  assert.equal(enCreep(ledger([[2025, 2, { Food: 400 }, 4000], [2026, 12, { Food: 400 }, 4000]])).ready, false, 'a year needs 3 months');
  const C = enCreep(ledger([[2024, 12, { Food: 400 }, 4000], [2025, 12, { Food: 440 }, 4000], [2026, 12, { Food: 484 }, 4000]]));
  near(C.yearly.spend, 0.1); near(C.yearly.income, 0); assert.equal(C.series.length, 3);
});

test('enStepCreep: the game\'s check between two sessions', () => {
  assert.equal(enStepCreep({ spend: 2000, take: 4000 }, { spend: 2200, take: 4040 }), true);
  assert.equal(enStepCreep({ spend: 2000, take: 4000 }, { spend: 2050, take: 4000 }), false, 'under 5%');
  assert.equal(enStepCreep({ spend: 2000, take: 4000 }, { spend: 2200, take: 4800 }), false, 'income grew faster');
  assert.equal(enStepCreep(null, { spend: 1 }), false);
});

test('enPareto: the few lines that make 80%', () => {
  const P = enPareto([{ name: 'Rent', amt: 1500 }, { name: 'Food', amt: 500 }, { name: 'Phone', amt: 60 }, { name: 'Bus', amt: 90 }, { name: 'Fun', amt: 300 }, { name: 'Zero', amt: 0 }]);
  assert.equal(P.ready, true); assert.equal(P.of, 5, 'a $0 line is not counted');
  assert.equal(P.count, 2); assert.equal(P.topTotal, 2000); assert.equal(P.total, 2450);
  assert.deepEqual(P.rows.map(r => r.name), ['Rent', 'Food', 'Fun', 'Bus', 'Phone']);
  assert.equal(enPareto([{ name: 'A', amt: 5 }, { name: 'B', amt: 5 }]).ready, false);
});

test('enEnough: the FI number scaled to the life called enough, and room for error on top', () => {
  const E = enEnough({ fi: 1000000, share: 0.9, room: 0.2, have: 300000 });
  assert.deepEqual([E.value, E.withRoom, E.left, E.past], [900000, 1080000, 780000, false]);
  near(E.pct, 1 / 3);
  const F = enEnough({ fi: 1000000, have: 1200000 });
  assert.equal(F.sameAsFi, true); assert.equal(F.past, true); assert.equal(F.margin, 200000); assert.equal(F.withRoom, null);
  assert.deepEqual(enEnough({ fi: null }), { value: null, needs: ['an FI number'] });
});

test('enRough: a range by the leading digit, zero stays $0', () => {
  assert.equal(enRough(3450), '$3k to $4k'); assert.equal(enRough(12345), '$10k to $20k'); assert.equal(enRough(870), '$800 to $900');
  assert.equal(enRough(87), '$0 to $100'); assert.equal(enRough(0), '$0'); assert.equal(enRough(2500000), '$2M to $3M');
  assert.equal(enRough(1000), '$1k to $2k'); assert.equal(enRough(-4200, { minus: '−' }), '−$4k to −$5k');
  assert.equal(enRough(null), null); assert.equal(enRough(NaN), null);
});

test('Rough numbers: the one formatter shows ranges, an exact formatter call stays exact, and it is off by default', () => {
  assert.equal(roughOn(), false);
  assert.equal(money(3450), '$3,450');
  setRough(true);
  try {
    assert.equal(money(3450), '$3k to $4k'); assert.equal(money(15.99, { cents: true }), '$0 to $100'); assert.equal(money(-240), '−$200 to −$300');
    assert.equal(money(null), '–', 'empty stays empty');
    assert.equal(money(10, { exact: true }), '$10', 'a rule\'s own amount can ask to stay exact');
  } finally { setRough(false); }
  assert.equal(money(3450), '$3,450');
});

const fresh = () => { const s = new Store(householdFromInputs(JSON.parse(read('fixtures/demo.json')).inputs, { now: NOW.toISOString() })); s.now = () => NOW.toISOString(); return s; };

test('Rough numbers never changes a stored or worked-out number', () => {
  const s = fresh(), before = JSON.stringify(s.doc), m0 = JSON.stringify(metrics(s.doc, ref, { now: NOW }), (k, v) => (typeof v === 'string' ? undefined : v));
  setRough(true);
  try {
    const m1 = JSON.stringify(metrics(s.doc, ref, { now: NOW }), (k, v) => (typeof v === 'string' ? undefined : v));
    assert.equal(m1, m0, 'every number the math returns is the same');
    assert.equal(JSON.stringify(s.doc), before, 'nothing stored changed');
  } finally { setRough(false); }
});

test('the coach app reads the Budget\'s Actuals by month and the paychecks of the ledger', () => {
  const s = fresh();
  const food = s.add('bill', { name: 'Groceries', amount: 450, per: 'month', values: { draftt: 'Food', category: 'Groceries' } });
  const house = s.doc.records.find(r => r.kind === 'bill' && (r.draftt ?? r.values?.draftt) === 'Accommodation');
  assert.ok(food?.id && house, 'a food line and the demo\'s housing line');
  for (let m = 1; m <= 12; m++) {
    s.setIn('spending', ['months', month(2025, m), 'lines', food.id, 'actual'], 400);
    s.setIn('spending', ['months', month(2025, m), 'lines', house.id, 'actual'], 1500);
  }
  for (let m = 1; m <= 10; m++) {
    s.setIn('spending', ['months', month(2026, m), 'lines', food.id, 'actual'], 520);
    s.setIn('spending', ['months', month(2026, m), 'lines', house.id, 'actual'], 1530);
  }
  const inc = s.doc.records.find(r => r.kind === 'income');
  s.setIn('spending', ['transactions'], [
    ...Array.from({ length: 12 }, (_, i) => ({ id: `a${i}`, date: `${month(2025, i + 1)}-01`, amount: 4000, incomeId: inc.id })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, date: `${month(2026, i + 1)}-01`, amount: 4040, incomeId: inc.id })),
    { id: 'x', date: '2026-03-03', amount: -45, lineId: food.id }]); // a buy: already in the Actual, not counted twice
  const rows = creepRowsOf(s.doc);
  assert.equal(rows.filter(r => r.kind === 'in').length, 22);
  assert.equal(rows.filter(r => r.kind === 'out').length, 44);
  s.setDoc('settings', { enough: { inflation: 'cpi' } });
  const m = metrics(s.doc, ref, { now: NOW }), E = enoughOf(s.doc, ref, m, { now: NOW });
  assert.equal(E.inflation, ref.cpi.value);
  near(E.creep.spendGrowth, 2050 / 1900 - 1); near(E.creep.income.growth, 0.01);
  assert.equal(E.creep.alert, true);
  assert.equal(E.creep.cats.find(c => c.cat === 'Food').mutant, true);
  assert.equal(creepCardOf(E, money).head, 'Recalculating');
  // the few lines: the Budget's own lines
  assert.equal(E.pareto.ready, true); assert.ok(E.pareto.count >= 1 && E.pareto.count < E.pareto.of);
  // enough: the plan's own FI number and FI date
  assert.equal(E.enough.value, Math.round(m.fiNumber.value * 100) / 100);
  const at = fiDate({ invested: m.inputs.invested, monthlyInvesting: m.investing.monthly, realReturn: m.inputs.realReturn, target: E.enough.value }, { from: NOW, before: m.investing.before, changes: m.investing.changes });
  assert.equal(E.enough.at.value, at.value);
  assert.equal(E.enough.at.value, m.monthsToFi.value, 'enough at today\'s life is the FI date');
  s.setDoc('settings', { enough: { share: 0.8, room: 0.3 } });
  const E2 = enoughOf(s.doc, ref, metrics(s.doc, ref, { now: NOW }), { now: NOW });
  near(E2.enough.withRoom, Math.round(E2.enough.value * 1.3 * 100) / 100, 0.011);
  assert.equal(E2.inflation, null);
});

test('the CPI row is dated, sourced and official', () => {
  assert.equal(typeof ref.cpi.value, 'number');
  assert.match(ref.cpi.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(ref.cpi.source, /Bureau of Labor Statistics/);
});

// ---------- every screen's money goes through the one formatter ----------
// A screen file may not write a dollar amount by hand ('$' + n, `$${n}`), because Rough numbers would miss it. The
// ones that were there before Rough numbers are listed with what they are; the count may go down, never up, and a
// new screen file starts at 0. Math files (js/math, game/core) write words for Show the math and are not screens.
const HAND = /'\$' ?\+|"\$" ?\+|\$\$\{/g;
const KNOWN = {
  // chart axes and short labels ($12k, $1.2M): a scale, not a balance
  'js/ui/afford-ui.js': 1, 'js/ui/cliff-ui.js': 1, 'js/ui/destinations-ui.js': 2, 'js/ui/lists.js': 1, 'js/ui/money-lists.js': 3, 'js/ui/plan-ui.js': 3,
  'js/ui/report-ui.js': 2, 'js/ui/spending-ui.js': 1, 'js/ui/transitions-ui.js': 1, 'js/ui/truecost-ui.js': 2, 'js/start/charts-ui.js': 3, 'js/start/ways-ui.js': 1,
  'js/start/app.js': 3, 'game/features/blocks.js': 1, 'game/features/odds.js': 1, 'game/features/sim.js': 2, 'game/features/sims/side.js': 1,
  // fixed tap choices and rule amounts ($25, $50, "at least $100", a $15 travel cost): the same for everyone
  'js/ui/shiftpnl-ui.js': 2, 'game/features/ask2.js': 1, 'game/features/ideas4.js': 2, 'game/features/lever.js': 1, 'game/features/sins.js': 1, 'game/features/gig.js': 2,
  // js/solo/quick.js and gig.js (run Parts 2 and 5): cents (a cost per use, a rate an hour), and New York's own rule amounts
  'js/solo/canon.js': 1, 'js/solo/return.js': 1, 'js/solo/quick.js': 4, 'js/solo/gig.js': 1, 'game/features/dep.js': 1, 'game/features/ideas5.js': 2,
  // the formatters themselves (each one asks Rough numbers first), and the cents of the game's price tags
  'game/screens/ui.js': 4,
  // the short money of the game's new look ($10k, $1.2M), which hands over to money() while Rough numbers is on
  'game/features/look.js': 3,
  // text that leaves the screen: the pre-session intake, the test drive script, the extras' limit sentence
  'js/intake.js': 1, 'js/testdrive.js': 1, 'js/extras.js': 1, 'js/lifetime/compare.js': 1,
};
const SCREEN_DIRS = ['js', 'js/ui', 'js/solo', 'js/start', 'js/quiz', 'js/lifetime', 'js/report', 'js/exercises', 'game/screens', 'game/features', 'game/features/sims'];
test('every screen\'s money goes through the one formatter (Rough numbers reaches it)', () => {
  const over = [];
  for (const d of SCREEN_DIRS) for (const f of readdirSync(new URL(`${d}/`, root)).filter(x => x.endsWith('.js'))) {
    const p = `${d}/${f}`;
    if (p === 'js/format.js') continue;
    const n = (read(p).match(HAND) || []).length, allowed = KNOWN[p] ?? 0;
    if (n > allowed) over.push(`${p}: ${n} amounts written by hand (allowed ${allowed}). Use money() (web: js/format.js; game: screens/ui.js)`);
  }
  assert.deepEqual(over, []);
  // the formatters ask Rough numbers first: the web's money(), the game's money(), signed() and m$()
  assert.match(read('js/format.js'), /if \(ROUGH && !exact\) return enRough\(/);
  const ui = read('game/screens/ui.js'), eng = read('game/core/engine.js');
  assert.match(ui, /const money = n =>\s+roughOn\(\) \? enRough\(n\)/);
  assert.match(ui, /const signed = n =>\s+roughOn\(\)/);
  assert.match(eng, /const m\$ = n =>\s+typeof roughOn === "function" && roughOn\(\)/);
  // one switch: the web's More menu sets the pref, applyPrefs hands it to the formatter
  const app = read('js/app.js');
  assert.match(app, /setRough\(this\.prefs\.rough\)/);
  assert.match(app, /'Rough numbers: show ranges'/);
});

test('the game\'s copy is made from this file and the CPI row, and is current (node tools/game_enough_build.mjs)', () => {
  const src = read('js/math/enough.js'), cpi = { value: ref.cpi.value, period: ref.cpi.period, source: ref.cpi.source, date: ref.cpi.date };
  const hash = createHash('sha256').update(src + JSON.stringify(cpi)).digest('hex').slice(0, 16);
  assert.match(read('game/core/enough.js'), new RegExp(`SOURCE-HASH  ${hash}`), 'js/math/enough.js or the CPI row changed: run node tools/game_enough_build.mjs, then the game steps (prettier, stamp, code map)');
  assert.match(read('game/index.html'), /<script src="core\/enough\.js\?v=[0-9a-f]+"><\/script>/);
  assert.match(read('game/index.html'), /<script src="features\/enough\.js\?v=[0-9a-f]+"><\/script>/);
});
