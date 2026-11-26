// Ratios on Key numbers (run Not built, groups 1 to 5, Part 9): one function for each ratio (js/math/ratios.js), the
// coach app's reading of the household (js/ratios.js), and the game's copy, held to this file by the last test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as R from '../js/math/ratios.js';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { metrics } from '../js/math/metrics.js';
import { ratiosOf } from '../js/ratios.js';

const root = new URL('..', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const NOW = new Date('2026-11-26T12:00:00Z');
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} is not ${b}`);

test('raLevel: the lowest level of the inputs; none given is Exact', () => {
  assert.equal(R.raLevel(['Exact', 'Close']), 'Close');
  assert.equal(R.raLevel(['Exact', 'Guess', 'Close']), 'Guess');
  assert.equal(R.raLevel([null, undefined]), 'Exact');
});

test('a missing input says what it needs, never a 0 (empty is not zero)', () => {
  for (const [fn, args] of [[R.raCurrent, { cash: null, shortDebt: 100 }], [R.raSolvency, { netWorth: 5, assets: null }], [R.raLtv, {}], [R.raHumanCapital, {}], [R.raRealWage, { growth: 0.03 }], [R.raTotalComp, { base: 50000, match: null }], [R.raWindfall, {}], [R.raConfidence, {}]]) {
    const r = fn(args);
    assert.equal(r.value, null, r.id);
    assert.ok(r.needs.length > 0, r.id);
  }
  assert.deepEqual(R.raLtv({ homeValue: 300000 }).needs, ['your mortgage balance']);
});

test('nothing to measure: no short-term debt, net worth at or under zero, no home value', () => {
  const a = R.raCurrent({ cash: 5000, shortDebt: 0 });
  assert.equal(a.value, null); assert.deepEqual(a.needs, []); assert.match(a.none, /No short-term debt/);
  assert.match(R.raInvestNw({ invested: 1000, netWorth: -500 }).none, /under \$0/);
  assert.equal(R.raLtv({ mortgage: 0, homeValue: 0 }).value, null);
});

test('the formulas', () => {
  near(R.raCurrent({ cash: 6000, shortDebt: 2000 }).value, 3);
  near(R.raHealth({ cash: 3000, hsa: 2000, oopMax: 5000 }).value, 1);
  assert.equal(R.raSelfInsure({ cash: 20000, target: 15000 }).value, 5000);
  near(R.raSolvency({ netWorth: 50000, assets: 200000 }).value, 0.25);
  near(R.raRevolving({ revolving: 2000, total: 10000 }).value, 0.2);
  assert.equal(R.raCreditMix({ kinds: ['Credit card', 'Car loan', 'Mortgage'] }).value, 3);
  assert.equal(R.raCreditMix({ kinds: [] }).value, 0);
  const ip = R.raInterestPrincipal({ debts: [{ balance: 12000, apr: 0.1, payment: 300 }] });
  near(ip.value, 100 / 200);
  assert.match(R.raInterestPrincipal({ debts: [{ balance: 12000, apr: 0.3, payment: 300 }] }).none, /only cover the interest/);
  assert.deepEqual(R.raInterestPrincipal({ debts: [{ balance: 1, apr: null, payment: 5 }] }).needs, ['each debt\'s rate']);
  const eq = R.raHomeEquity({ homeValue: 400000, mortgage: 300000, netWorth: 200000 });
  assert.equal(eq.value, 100000); near(eq.shareOfNetWorth, 0.5);
  near(R.raLtv({ mortgage: 300000, homeValue: 400000 }).value, 0.75);
  near(R.raPriceIncome({ homeValue: 400000, grossYear: 100000 }).value, 4);
  near(R.raRealEstate({ realEstate: 400000, assets: 500000 }).value, 0.8);
  assert.equal(R.raDiscretionary({ takeHome: 5000, fixed: 2000 }).value, 3000);
  near(R.raFixedShare({ fixed: 2000, variable: 1000 }).value, 2 / 3);
  near(R.raSideShare({ side: 1000, total: 5000 }).value, 0.2);
  near(R.raTotalComp({ base: 100000, bonus: 10000, match: 5000 }).value, 1.15);
  near(R.raRealWage({ growth: 0.05, inflation: 0.027 }).value, 1.05 / 1.027 - 1);
  near(R.raReplacement({ spendYear: 60000, grossYear: 100000 }).value, 0.6);
  near(R.raInvestNw({ invested: 50000, netWorth: 100000 }).value, 0.5);
  near(R.raNwIncome({ netWorth: 150000, grossYear: 100000 }).value, 1.5);
  const hc = R.raHumanCapital({ grossYear: 100000, age: 35, retireAge: 65, realReturn: 0.05, financial: 100000 });
  near(hc.future, 100000 * (1 - 1.05 ** -30) / 0.05, 1e-6); near(hc.value, hc.future / 100000);
  near(R.raHumanCapital({ grossYear: 1000, age: 60, retireAge: 62, realReturn: 0, financial: 1000 }).value, 2);
  near(R.raTaxShelter({ advantaged: 30000, invested: 40000 }).value, 0.75);
  const lg = R.raLongevity({ invested: 500000, spendYear: 50000, age: 40, retireAge: 65, planAge: 90 });
  near(lg.value, 10 / 25);
  near(R.raWindfall({ amount: 10000, toTax: 2000, toFun: 800, toCash: 1000, toDebt: 3000, invested: 3200 }).value, 7200 / 8000);
});

test('spending volatility: months with spending only, the last 12, Guess under 6, Close from 6, Exact at 12', () => {
  const rows = [1000, 1200, 800].map((amt, i) => ({ d: `2026-0${i + 1}`, amt, kind: 'out' }));
  const v = R.raVolatility({ rows: [...rows, { d: '2026-01-15', amt: 5000, kind: 'in' }] });
  const sd = Math.sqrt(((0) ** 2 + 200 ** 2 + 200 ** 2) / 3);
  near(v.value, sd / 1000); assert.equal(v.level, 'Guess'); assert.equal(v.months, 3);
  assert.equal(R.raVolatility({ rows: rows.slice(0, 2) }).value, null);
  const year = Array.from({ length: 14 }, (_, i) => ({ d: `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, amt: 1000, kind: 'out' }));
  const y = R.raVolatility({ rows: year });
  assert.equal(y.months, 12); assert.equal(y.level, 'Exact'); assert.equal(y.value, 0);
});

test('financial confidence: the rating next to the numbers, in kind words only', () => {
  const a = R.raConfidence({ rating: 3, min: 1, max: 10, good: 6, of: 7 });
  assert.equal(a.read, 'ahead'); near(a.value, 2 / 9);
  assert.equal(R.raConfidence({ rating: 9, good: 2, of: 8 }).read, 'feeling');
  assert.equal(R.raConfidence({ rating: 6, good: 4, of: 8 }).read, 'near');
  assert.equal(R.raConfidence({ rating: 6 }).read, 'numbers');
  for (const w of Object.values(R.RA_CONF_WORDS)) assert.doesNotMatch(w, /\b(bad|good|poor|wrong|mistake|behind|should)\b/i);
});

test('every line has a group, a formula and a sentence; a rule of thumb names its source and date', () => {
  assert.equal(R.RA_LINES.length, 25);
  const groups = new Set(R.RA_GROUPS.map(g => g[0]));
  for (const l of R.RA_LINES) {
    assert.ok(groups.has(l.g) && l.f && l.s, l.id);
    if (l.rule) assert.ok(l.rule.source && /^\d{4}-\d{2}-\d{2}$/.test(l.rule.date), l.id);
  }
  assert.deepEqual(R.RA_LINES.filter(l => l.rule).map(l => l.id), ['mix', 'ltv']);
  assert.ok(R.RA_LATER.some(x => x[0] === 'Tax drag'));
});

test('the coach app reads the household it already has (the demo client)', () => {
  const s = new Store(householdFromInputs(JSON.parse(read('fixtures/demo.json')).inputs, { now: NOW.toISOString() }));
  const m = metrics(s.doc, ref, { now: NOW }), A = ratiosOf(s.doc, ref, m, { now: NOW }), x = m.inputs;
  near(A.out.investnw.value, x.invested / m.netWorth.value);
  near(A.out.solvency.value, m.netWorth.value / [...x.accounts, ...x.things].reduce((t, r) => t + (r.value ?? 0), 0));
  assert.equal(A.out.selfins.value, x.cash - m.ruleOf5.value);
  assert.equal(A.out.windfall, undefined, 'the web app leaves the windfall line out');
  assert.ok(A.later.some(l => l[0] === 'Windfall allocation'));
  assert.equal(A.out.confidence.value, null);
  for (const G of A.groups) for (const l of G.lines) assert.ok(l.r.value != null || l.r.needs.length || l.r.none, l.id);
});

test('the game reads a current copy of js/math/ratios.js', () => {
  const hash = createHash('sha256').update(read('js/math/ratios.js')).digest('hex').slice(0, 16);
  assert.match(read('game/core/ratios.js'), new RegExp(`SOURCE-HASH  ${hash}`), 'js/math/ratios.js changed: run node tools/game_ratios_build.mjs, then the game steps (prettier, stamp, code map)');
});
