// SPDX-License-Identifier: AGPL-3.0-only
// The ways to take money out (js/math/withdraw.js), each rule by hand, and "Compare the ways" on the lifetime plan
// (js/lifetime/compare.js). The second engine (tools/audit) works every rule out again on made-up markets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WAYS, WAY_FAMILIES, WAY_COLUMNS, WAY_CUT_LINE, WAY_CAPE, UNIFORM, wayById, wayTolerance, wayCustom, wayOff, vpwShare, spendDownPayment, waySpend, wayReturn, wayPay, wayShuffle, wayCycle, wayHistory, wayRow, wayMath, waySort, wayFilter, wayPin, wayMeaning } from '../js/math/withdraw.js';
import { lifetime, worked, STRATEGIES } from '../js/math/lifetime.js';
import { replay, mixOf } from '../js/math/stress.js';
import { compareRow, planFor, stopAgeFor, waysFor, defaultWays, worstChart, compareCsv } from '../js/lifetime/compare.js';

const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root))), hist = JSON.parse(readFileSync(new URL('data/history-returns.json', root)));
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const way = id => wayById(id);
const base = { need: 40000, start: 1000000, k: 0, age: 60, endAge: 89, last: null, infl: null, cape: 25, stock: 0.6, growth: 0.05 };

test('the list: eight families, each with a default row, every way with plain words and who it is named after', () => {
  assert.deepEqual(WAY_FAMILIES.map(f => f.id), ['steady', 'guardrails', 'floor', 'share', 'age', 'held', 'market', 'custom']);
  for (const f of WAY_FAMILIES) assert.ok(WAYS.some(w => w.family === f.id), f.id);
  assert.equal(new Set(WAYS.map(w => w.id)).size, WAYS.length, 'ids are unique');
  for (const w of WAYS) { assert.ok(w.name && w.plain && w.by, w.id); assert.ok(WAY_FAMILIES.some(f => f.id === w.family), w.id); }
  // what Eli listed, by family
  const ids = f => WAYS.filter(w => w.family === f).map(w => w.id);
  assert.deepEqual(ids('steady'), ['steady-4', 'steady-3', 'steady-3.25', 'steady-3.5', 'steady-4.7', 'steady-5', 'steady-monthly', 'steady-end', 'steady-skip', 'steady-30', 'steady-40', 'steady-50']);
  assert.deepEqual(ids('guardrails'), ['guard', 'guard-cutonly', 'guard-risk', 'guard-10', 'guard-30', 'guard-5']);
  assert.deepEqual(ids('floor'), ['floor', 'floor-90', 'floor-vanguard']);
  assert.deepEqual(ids('share'), ['share-4', 'share-3', 'share-5', 'share-smooth']);
  assert.deepEqual(ids('age'), ['age-dwz', 'age-vpw', 'age-rmd']);
  assert.deepEqual(ids('held'), ['held-bucket1', 'held-bucket2', 'held-tent', 'held-shield']);
  assert.deepEqual(ids('market'), ['market-cape']);
  assert.equal(way('steady-4.7').rate, 0.047); assert.equal(way('steady-monthly').timing, 'monthly'); assert.equal(way('steady-end').timing, 'end'); assert.equal(way('steady-50').horizon, 50);
});

test('what is switched off says why, and shows no number', () => {
  assert.match(wayOff(way('age-vpw'), { where: 'web', stopAge: 60 }), /Switched off/);
  assert.match(wayOff(way('age-rmd'), { where: 'web', stopAge: 60 }), /starts at 73/); assert.equal(wayOff(way('age-rmd'), { where: 'web', stopAge: 73 }), null);
  assert.match(wayOff(way('guard-risk'), { where: 'web', stopAge: 60 }), /only SLAM the Game/); assert.equal(wayOff(way('guard-risk'), { where: 'game', stopAge: 60 }), null);
  assert.match(wayOff(way('market-cape'), { where: 'web', hasCape: false }), /no CAPE/); assert.equal(wayOff(way('market-cape'), { where: 'web', hasCape: true }), null);
  assert.equal(wayOff(way('steady-4'), { where: 'web', stopAge: 40 }), null);
  const r = wayRow(way('age-vpw'), { off: 'why' });
  assert.equal(r.off, 'why'); assert.equal(r.first, undefined); assert.deepEqual(wayMath(r, v => `$${v}`, 'x'), ['why']);
});

test('steady spending: a share of the money on the day work stops, then the same amount whatever the market does', () => {
  const mem = {}, w = way('steady-4');
  assert.deepEqual(waySpend(w, base, mem), { spend: 40000, aim: 40000 });
  assert.deepEqual(waySpend(w, { ...base, start: 600000, k: 1, last: -0.4, infl: 0.1 }, mem), { spend: 40000, aim: 40000 }, 'a crash changes nothing');
  assert.equal(waySpend(way('steady-4.7'), base, {}).spend, 47000); assert.equal(waySpend(way('steady-3.25'), base, {}).spend, 32500);
  // the lifetime plan's own "fixed" pays what life costs
  assert.deepEqual(waySpend({ id: 'fixed' }, { ...base, need: 51000 }, {}), { spend: 51000, aim: 51000 });
});

test('no raise after a down year: the amount buys less by that year\'s inflation, and never comes back', () => {
  const mem = {}, w = way('steady-skip');
  assert.equal(waySpend(w, base, mem).spend, 40000);
  near(waySpend(w, { ...base, k: 1, last: -0.1, infl: 0.05 }, mem).spend, 40000 / 1.05); // fell 10% after inflation, 5.5% before: a down year
  near(waySpend(w, { ...base, k: 2, last: 0.08, infl: 0.03 }, mem).spend, 40000 / 1.05); // a good year: the usual raise, no catching up
  near(waySpend(w, { ...base, k: 3, last: -0.02, infl: 0.04 }, mem).spend, 40000 / 1.05); // down 2% after inflation is up 1.9% before it: not a down year
  assert.equal(waySpend(w, { ...base, k: 4 }, mem).aim, 40000, 'the aim stays the first amount');
});

test('guardrails: cut when the share taken is 20% over where it started, raise when 20% under, never under 70%', () => {
  const g = way('guard'), mem = {};
  assert.equal(waySpend(g, base, mem).spend, 40000); // 4% to start
  assert.equal(waySpend(g, { ...base, start: 800000 }, mem).spend, 36000); // 5% is over 4.8%: cut 10%
  near(waySpend(g, { ...base, start: 2000000 }, mem).spend, 39600); // 1.8% is under 3.2%: raise 10%
  const low = {}; let s = 0; for (let i = 0; i < 12; i++) s = waySpend(g, { ...base, start: i ? 100000 : 1000000 }, low).spend;
  assert.equal(s, 28000, 'a cut stops at 70% of what life costs');
  // cut only: the same cut, no raise
  const c = way('guard-cutonly'), m2 = {}; waySpend(c, base, m2);
  assert.equal(waySpend(c, { ...base, start: 5000000 }, m2).spend, 40000);
  assert.equal(waySpend(c, { ...base, start: 800000 }, m2).spend, 36000);
  // band width and step size
  const narrow = {}, wide = {}, small = {};
  waySpend(way('guard-10'), base, narrow); waySpend(way('guard-30'), base, wide); waySpend(way('guard-5'), base, small);
  assert.equal(waySpend(way('guard-10'), { ...base, start: 880000 }, narrow).spend, 36000, '4.55% is over 4.4%');
  assert.equal(waySpend(way('guard-30'), { ...base, start: 800000 }, wide).spend, 40000, '5% is not over 5.2%');
  assert.equal(waySpend(way('guard-5'), { ...base, start: 800000 }, small).spend, 38000, 'a 5% step');
  // the same numbers the lifetime plan has always used
  const old = {}; waySpend({ id: 'guardrails' }, base, old);
  assert.equal(waySpend({ id: 'guardrails' }, { ...base, start: 800000 }, old).spend, 36000);
});

test('floor and ceiling, and Vanguard-style dynamic spending', () => {
  const f = way('floor'), mem = {};
  assert.equal(waySpend(f, base, mem).spend, 40000);
  assert.equal(waySpend(f, { ...base, start: 500000 }, mem).spend, 34000, 'the floor: 85%');
  assert.equal(waySpend(f, { ...base, start: 3000000 }, mem).spend, 48000, 'the ceiling: 120%');
  assert.equal(waySpend(f, { ...base, start: 1100000 }, mem).spend, 44000, 'between them: the same share of the money');
  const t = way('floor-90'), m2 = {}; waySpend(t, base, m2);
  assert.equal(waySpend(t, { ...base, start: 500000 }, m2).spend, 36000); near(waySpend(t, { ...base, start: 3000000 }, m2).spend, 44000);
  const v = way('floor-vanguard'), m3 = {};
  assert.equal(waySpend(v, base, m3).spend, 40000);
  near(waySpend(v, { ...base, start: 500000 }, m3).spend, 40000 * 0.985); // a cut of at most 1.5%
  near(waySpend(v, { ...base, start: 3000000 }, m3).spend, 40000 * 0.985 * 1.05); // a raise of at most 5%
  assert.equal(waySpend(v, { ...base, start: 1000000 }, m3).aim, 40000, 'cuts are measured against year one');
});

test('a share of the portfolio, plain and smoothed over three year-end values', () => {
  assert.equal(waySpend(way('share-4'), { ...base, start: 750000 }, {}).spend, 30000);
  assert.equal(waySpend(way('share-3'), base, {}).spend, 30000); assert.equal(waySpend(way('share-5'), base, {}).spend, 50000);
  const s = way('share-smooth'), mem = {};
  assert.equal(waySpend(s, base, mem).spend, 40000);
  assert.equal(waySpend(s, { ...base, start: 700000 }, mem).spend, 34000); // the average of 1,000,000 and 700,000
  assert.equal(waySpend(s, { ...base, start: 1000000 }, mem).spend, 36000); // of 1,000,000, 700,000 and 1,000,000
  near(waySpend(s, { ...base, start: 1300000 }, mem).spend, 40000); // the first value has dropped out
});

test('spend by age: Die With Zero reaches the chosen amount at the chosen age; VPW and the RMD method', () => {
  // the payment that uses 1,000,000 up over 30 payments at 5%, checked by walking it
  const pay = spendDownPayment(1000000, 0, 30, 0.05); let p = 1000000; for (let i = 0; i < 30; i++) p = (p - pay) * 1.05;
  near(p, 0, 1e-4);
  const keep = spendDownPayment(1000000, 250000, 20, 0.04); p = 1000000; for (let i = 0; i < 20; i++) p = (p - keep) * 1.04;
  near(p, 250000, 1e-4);
  assert.equal(spendDownPayment(900000, 0, 30, 0), 30000);
  const d = way('age-dwz'), mem = {}; let bal = 1000000;
  for (let age = 60; age <= 89; age++) { const { spend } = waySpend(d, { ...base, start: bal, age, k: age - 60 }, mem); bal = (bal - spend) * 1.05; }
  near(bal, 0, 1e-3); // on the plan's own return the money ends at zero on the last day of the plan
  // VPW: the two numbers a search showed from the Bogleheads table on Nov 25 2026 (age 40: 3.6% at 40% stocks, 4.1% at 60%)
  assert.equal(Math.round(vpwShare(40, 0.4) * 1000) / 10, 3.6); assert.equal(Math.round(vpwShare(40, 0.6) * 1000) / 10, 4.1); near(vpwShare(99, 0.6), 1);
  // the RMD method reads the IRS table
  assert.equal(UNIFORM[75], 24.6); near(waySpend(way('age-rmd'), { ...base, age: 75, start: 246000 }, {}).spend, 10000);
});

test('the CAPE rule: a base share plus half of 1 divided by the CAPE', () => {
  assert.deepEqual(WAY_CAPE, { a: 0.0175, b: 0.5 });
  near(waySpend(way('market-cape'), { ...base, cape: 25 }, {}).spend, 37500);
  near(waySpend(way('market-cape'), { ...base, cape: 10 }, {}).spend, 67500);
  const first = hist.years.find(y => y.cape != null);
  assert.equal(first.year, 1881, 'the CAPE needs ten years of earnings'); assert.equal(hist.years.find(y => y.year === 1966).cape, 24.06); assert.equal(hist.years.at(-1).cape, 36.94);
});

test('when the money comes out: the first day, twelve monthly steps, or the last day', () => {
  near(wayPay(1000000, 40000, 0.1, 'start').p, 1056000);
  near(wayPay(1000000, 40000, 0.1, 'end').p, 1060000);
  const m = wayPay(1000000, 40000, 0.1, 'monthly').p, g = 1.1 ** (1 / 12);
  near(m, 1000000 * 1.1 - (40000 / 12) * g * (g ** 12 - 1) / (g - 1), 1e-6); // the annuity formula, where the code takes twelve steps
  assert.ok(m > 1056000 && m < 1060000, 'monthly sits between the two');
  assert.deepEqual(wayPay(30000, 40000, 0.1, 'start'), { p: 0, short: 10000 });
  assert.deepEqual(wayPay(30000, 40000, 0.1, 'end'), { p: 0, short: 7000 });
  const s = wayPay(10000, 40000, 0, 'monthly'); assert.equal(s.p, 0); near(s.short, 30000, 1e-6);
});

test('how the money is held: buckets, a bond tent, the yield shield', () => {
  const yr = { r: 0.1, s: 0.2, b: -0.05, dy: 0.03, by: 0.04 }, s = { stock: 0.6, k: 0, last: 0.05, start: 1000000, w: 40000 };
  assert.equal(wayReturn(way('steady-4'), yr, s, {}), 0.1, 'no holding rule: the portfolio\'s own return');
  // a tent: 20 points fewer stocks on day one, back to the plan's mix over ten years
  near(wayReturn(way('held-tent'), yr, s, {}), 0.4 * 0.2 + 0.6 * -0.05); near(wayReturn(way('held-tent'), yr, { ...s, k: 5 }, {}), 0.5 * 0.2 + 0.5 * -0.05); near(wayReturn(way('held-tent'), yr, { ...s, k: 12 }, {}), 0.6 * 0.2 + 0.4 * -0.05);
  // one year in cash: after the withdrawal 960,000 is left, 40,000 of it in cash at 0%
  const mem = {}; near(wayReturn(way('held-bucket1'), yr, s, mem), (920000 * 0.1) / 960000); assert.equal(mem.cash, 40000);
  // after a down year the cash is spent and not filled again: all of what is left is invested
  near(wayReturn(way('held-bucket1'), yr, { ...s, last: -0.2 }, mem), 0.1); assert.equal(mem.cash, 0);
  near(wayReturn(way('held-bucket1'), yr, s, mem), (920000 * 0.1) / 960000); // a good year fills it again
  const two = {}; wayReturn(way('held-bucket2'), yr, s, two); assert.equal(two.cash, 80000);
  // the yield shield: the yield pays 3.4% of 1,000,000 = 34,000 of the 40,000; the cushion holds five years of the 6,000 gap
  const sh = {}; wayReturn(way('held-shield'), yr, s, sh); near(sh.cash, 30000, 1e-6);
});

test('one history summed up, and all the start years of a way', () => {
  const c = wayCycle([{ spend: 40000, aim: 40000 }, { spend: 36000, aim: 40000 }, { spend: 39900, aim: 40000 }, { spend: 20000, aim: 40000 }]);
  assert.deepEqual(c, { first: 40000, lowest: 0.5, cuts: 2, years: 4 }); assert.equal(WAY_CUT_LINE, 0.995);
  const cycles = [
    { start: 1929, lasted: true, ranOutAge: null, end: 500, lowest: 0.8, cuts: 4 }, { start: 1966, lasted: false, ranOutAge: 82, end: 0, lowest: 0.3, cuts: 9 },
    { start: 1973, lasted: true, ranOutAge: null, end: 900, lowest: 0.7, cuts: 6 }, { start: 1982, lasted: true, ranOutAge: null, end: 5000, lowest: 1, cuts: 0 }];
  const H = wayHistory(cycles, 0.75);
  assert.equal(H.n, 4); assert.equal(H.ok, 2, 'lasted and never under 75%'); assert.equal(H.worst.start, 1966); assert.equal(H.deepest, 0.7, 'the deepest cut is among the starts where the money lasted');
  assert.equal(H.cutsWorst, 9); assert.equal(H.medianEnd, 500); assert.deepEqual(H.failed, [1966, 1973]);
  assert.equal(wayHistory([], 0.75).share, null);
  assert.equal(wayTolerance(way('steady-4')), 0.999); assert.equal(wayTolerance(way('guard')), 0.699); assert.equal(wayTolerance(way('floor-90')), 0.899); assert.equal(wayTolerance(way('share-4')), 0.75);
  for (const st of STRATEGIES) assert.equal(wayTolerance({ family: { fixed: 'steady', guardrails: 'guardrails', floor: 'floor', percent: 'share' }[st.id] }), st.tolerate, 'the families keep the lifetime plan\'s tolerances');
});

test('the random markets are the same every time: a fixed seed', () => {
  const a = wayShuffle(152, 30, 5), b = wayShuffle(152, 30, 5);
  assert.deepEqual(a, b); assert.equal(a.length, 5); assert.ok(a.every(l => l.length === 30 && l.every(i => i >= 0 && i < 152)));
  assert.notDeepEqual(wayShuffle(152, 30, 5, 8), a);
});

test('sort by any column, the three quick picks, and three pins at most', () => {
  const rows = [
    { id: 'a', first: 40000, random: 0.9, real: 0.95, drop: 0.3, deepest: 1, cuts: 0, end: 5, stopAge: 50 },
    { id: 'b', first: 48000, random: 1, real: 1, drop: 0.7, deepest: 0.7, cuts: 12, end: 9, stopAge: 46 },
    { id: 'c', off: 'switched off' }, { id: 'd', first: 30000, random: 1, real: 1, drop: 1, deepest: 1, cuts: 0, end: 20, stopAge: null }];
  const ids = l => l.map(r => r.id).join('');
  assert.equal(ids(waySort(rows, 'first')), 'badc'); assert.equal(ids(waySort(rows, 'first', 'other')), 'dabc', 'what is switched off stays last both ways');
  assert.equal(ids(waySort(rows, 'cuts')), 'adbc', 'fewest cuts first'); assert.equal(ids(waySort(rows, 'stopAge')), 'bacd', 'the earliest age first; no age and switched off last');
  for (const c of WAY_COLUMNS) assert.equal(waySort(rows, c.id).length, 4, c.id);
  assert.equal(ids(wayFilter(rows, 'nocut')), 'ad'); assert.equal(ids(wayFilter(rows, 'first')), 'badc'); assert.equal(ids(wayFilter(rows, 'odds')), 'bdac'); assert.equal(ids(wayFilter(rows, 'all')), 'abcd');
  assert.deepEqual(wayPin([], 'a'), ['a']); assert.deepEqual(wayPin(['a', 'b'], 'a'), ['b']); assert.deepEqual(wayPin(['a', 'b', 'c'], 'd'), ['b', 'c', 'd']);
});

test('the custom way: a family, a rate, the timing and the years', () => {
  const c = wayCustom({ kind: 'steady', rate: 0.045, timing: 'monthly', horizon: 40 });
  assert.equal(c.rule, 'fixed'); assert.equal(c.rate, 0.045); assert.equal(c.timing, 'monthly'); assert.equal(c.horizon, 40); assert.equal(c.family, 'custom'); assert.match(c.name, /4\.5%/);
  assert.equal(wayCustom({ kind: 'share', rate: 0.05 }).rule, 'percent'); assert.equal(wayCustom({ kind: 'guardrails' }).usesRate, false); assert.equal(wayCustom({ kind: 'guardrails' }).tolerate, 0.699);
  assert.equal(wayCustom({ kind: 'steady', rate: 5 }).rate, 0.1, 'a rate stays between 1% and 10%'); assert.equal(wayCustom({ kind: 'nonsense', horizon: 33 }).horizon, null);
  near(wayCustom({ kind: 'market', rate: 0.04 }).a, 0.02);
});

test('the game\'s copy of the rules is the same code (tools/game_withdraw_build.mjs)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('tools/game_withdraw_build.mjs', root)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

// ---------- on the lifetime plan ----------
const x = { age: 45, planAge: 90, retireAge: 60, realReturn: 0.05, rmdAge: 75, start: { taxable: 300000, pretax: 600000, roth: 100000, rothFree: 60000, basis: 200000 },
  work: { income: 140000, saving: { pretax: 20000, roth: 7000, taxable: 13000 }, wait: { years: 0, pretax: 0 } }, spendingAfter: 70000, eras: null, ss: { claimAge: 67, yearly: 30000 }, partTime: null, blocks: [],
  strategy: { id: 'fixed', rate: 0.04 }, tax: { filingStatus: 'Single', place: null, fill: 'none', health: 0, aca: true }, partner: null };
const life = { x, age: 60, settings: { stocks: 0.8, target: 0.95 } };

test('the lifetime plan runs the four ways it always had to the same dollar, now through the shared rules', () => {
  // each of the old strategies against the new way that is the same rule
  for (const [id, same] of [['guardrails', { rule: 'guardrails', over: 1.2, under: 0.8, cutTo: 0.9, raiseTo: 1.1 }], ['percent', { rule: 'percent', rate: 0.04 }], ['floor', { rule: 'floor', lo: 0.85, hi: 1.2, rate: 0.04 }]]) {
    const seq = mixOf(hist, 0.8).slice(95, 95 + 31), opt = { returns: k => (k < 15 ? 0.05 : seq[k - 15]) };
    const a = lifetime({ ...x, strategy: { id, rate: 0.04 } }, ref, opt), b = lifetime({ ...x, strategy: same }, ref, opt);
    assert.equal(a.end, b.end, id); assert.deepEqual(a.years.map(y => y.spend), b.years.map(y => y.spend), id);
  }
  const run = lifetime(x, ref);
  assert.equal(run.lowestPaid, 1); assert.equal(run.cutYears, 0); near(run.firstSpend, 70000);
});

test('timing in the lifetime plan: monthly sits between the start and the end of the year, and a year is twelve real steps', () => {
  const at = t => lifetime({ ...x, strategy: { ...way('steady-4'), timing: t } }, ref);
  const s = at('start'), m = at('monthly'), e = at('end');
  assert.ok(s.end < m.end && m.end < e.end, `${s.end} < ${m.end} < ${e.end}`);
  near(s.firstSpend, m.firstSpend, 1e-6); near(s.firstSpend, e.firstSpend, 1e-6); // the rule pays the same; only the day changes
  near(s.firstSpend, 0.04 * s.atRetire, 1e-6);
  // one free year by hand on untaxed money: 1,000,000 of Roth at 60, 40,000 a year out, 5% growth
  const roth = { ...x, age: 60, retireAge: 60, planAge: 60, start: { taxable: 0, pretax: 0, roth: 1000000, rothFree: 1000000 }, ss: { claimAge: 67, yearly: 0 }, spendingAfter: 40000, strategy: { ...way('steady-4'), timing: 'monthly' } };
  const g = 1.05 ** (1 / 12);
  near(lifetime(roth, ref).end, 1000000 * 1.05 - (40000 / 12) * g * (g ** 12 - 1) / (g - 1), 1e-4);
  near(lifetime({ ...roth, strategy: { ...way('steady-4'), timing: 'end' } }, ref).end, 1010000, 1e-6);
  near(lifetime({ ...roth, strategy: way('steady-4') }, ref).end, 1008000, 1e-6);
});

test('compare the ways: one row has every number, and the famous trade shows', () => {
  const four = compareRow(life, ref, hist, way('steady-4'), { stopAge: false, runs: 200 }), guard = compareRow(life, ref, hist, way('guard'), { stopAge: false, runs: 200 });
  for (const r of [four, guard]) for (const k of ['first', 'random', 'real', 'ok', 'n', 'worstYear', 'drop', 'deepest', 'cuts', 'end', 'years', 'atStop', 'need']) assert.ok(r[k] != null && !Number.isNaN(r[k]), `${r.id}.${k}`);
  near(four.first, 0.04 * four.atStop, 1e-6); near(guard.first, 70000, 1e-6);
  assert.equal(four.deepest, 1, 'the 4% rule never cuts'); assert.equal(four.cuts === 0 || four.worstRanOut != null, true);
  assert.ok(guard.deepest < 1 && guard.deepest >= 0.7 - 1e-9, 'guardrails cut, never under 70%'); assert.ok(guard.cuts > 0);
  assert.ok(guard.real >= four.real, 'guardrails hold at least as often');
  assert.equal(four.n, guard.n); assert.equal(four.years, 31); assert.equal(four.randomRuns, 200); assert.equal(four.stopAge, undefined, 'the stop age is worked out in a second pass');
  // the same count the stress test gives
  assert.equal(four.ok, replay(planFor(life, way('steady-4'), hist), ref, hist, { stocks: 0.8 }).cycles.filter(c => c.ok).length);
  // show the math: a line for each number, no undefined, no NaN
  const math = wayMath({ ...four, stopAge: 58 }, v => `$${Math.round(v).toLocaleString('en-US')}`, hist.source);
  assert.ok(math.length >= 8); for (const line of math) assert.doesNotMatch(line, /undefined|NaN|null/);
  // a horizon of its own, and a way that needs the CAPE
  const fifty = compareRow(life, ref, hist, way('steady-50'), { stopAge: false, runs: 50 }); assert.equal(fifty.years, 50); assert.equal(fifty.to, 2022 - 49);
  const cape = compareRow(life, ref, hist, way('market-cape'), { stopAge: false, runs: 50 }); assert.equal(cape.from, 1881);
  near(cape.first, cape.atStop * (0.0175 + 0.5 / 36.94), 1e-6);
  // what the game alone carries is switched off here
  assert.match(compareRow(life, ref, hist, way('guard-risk')).off, /SLAM the Game/);
});

test('compare the ways: the age work can stop, the chart, the list and the spreadsheet file', () => {
  const a4 = stopAgeFor(life, ref, hist, way('steady-4')), a3 = stopAgeFor(life, ref, hist, way('steady-3'));
  assert.ok(a4 != null && a3 != null && a3 >= a4, `3% needs a bigger pile than 4%: ${a3} against ${a4}`);
  const run = lifetime(planFor(life, way('steady-4'), hist, a4), ref);
  assert.ok(worked(run, planFor(life, way('steady-4'), hist, a4)) && run.firstSpend >= 70000 * 0.999, 'at that age year one pays what life costs');
  const C = worstChart(life, ref, hist, [way('steady-4'), way('guard'), way('age-vpw')]);
  assert.equal(C.year, 1966); assert.deepEqual(C.lines.map(l => l.id), ['steady-4', 'guard'], 'a way that is switched off draws no line');
  assert.equal(C.lines[0].pts.length, 31); assert.equal(C.lines[0].pts[0][0], 60);
  assert.equal(waysFor().length, WAYS.length); assert.deepEqual(defaultWays().map(w => w.id), ['steady-4', 'guard', 'floor', 'share-4', 'age-dwz', 'held-bucket1', 'market-cape', 'custom']);
  assert.match(waysFor({ kind: 'share', rate: 0.05 }).at(-1).name, /5%/);
  const rows = [compareRow(life, ref, hist, way('steady-4'), { stopAge: false, runs: 20 }), compareRow(life, ref, hist, way('age-vpw'))];
  const csv = compareCsv(rows, hist.source).trim().split('\n');
  assert.equal(csv.length, 3); assert.match(csv[0], /^Family,Way,/); assert.match(csv[1], /^Steady spending,The 4% rule,,/); assert.match(csv[2], /Switched off/); assert.doesNotMatch(csv.join(''), /undefined|NaN/);
  const mean = wayMeaning([compareRow(life, ref, hist, way('steady-4'), { stopAge: false, runs: 20 }), compareRow(life, ref, hist, way('guard'), { stopAge: false, runs: 20 })], [], v => `$${Math.round(v)}`);
  assert.match(mean, /^On your numbers: The 4% rule pays \$\d+ a month/); assert.doesNotMatch(mean, /should|best|worse|better|safe\b|fail|mistake/i, 'no verdict');
  assert.equal(wayMeaning([], [], String), null);
});
