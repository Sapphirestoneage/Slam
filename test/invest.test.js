// SPDX-License-Identifier: AGPL-3.0-only
// Investing (run Finish everything partly built, Part 13; M8I): each function of js/math/invest.js checked by hand on
// made-up numbers, the Roth rule on crRothTrad of js/math/career.js, the city part of the tax engine's marginal rate,
// the game's copy current, and the page on the layout check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as I from '../js/math/invest.js';
import { crRothTrad } from '../js/math/career.js';
import { householdTax, householdRates } from '../js/math/income.js';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} is not ${b}`);

test('the household mix: every account added up by what is inside, an account with no mix left out', () => {
  const H = I.ivMix([
    { name: '401(k)', amt: 60000, parts: { us: 0.6, intl: 0.2, bonds: 0.2 } },
    { name: 'Brokerage', amt: 40000, parts: { single: 0.5, cash: 0.5 } },
    { name: 'Old IRA', amt: 10000, parts: null },
  ], { guide: I.ivGuide(35, 65) });
  assert.equal(H.total, 110000); assert.equal(H.known, 100000); assert.equal(H.unknown, 10000);
  near(H.shares.us, 0.36); near(H.shares.intl, 0.12); near(H.shares.bonds, 0.12); near(H.shares.single, 0.2); near(H.shares.cash, 0.2);
  near(H.stock, 0.68); near(H.aim.stock, 0.9); near(H.drift, -0.22); assert.equal(H.drifted, true);
  assert.match(H.math.join(' '), /\$10,000 has no mix yet/);
  const E = I.ivMix([{ name: 'A', amt: 5000, parts: null }]);
  assert.equal(E.ready, false); assert.equal(E.stock, null, 'empty is not zero');
});

test('the target: your own first, else the age guide (the Vanguard glide path)', () => {
  near(I.ivGuide(30, 60).stock, 0.9); near(I.ivGuide(60, 60).stock, 0.5); near(I.ivGuide(67, 60).stock, 0.3); near(I.ivGuide(50, 62).stock, 0.5 + 0.4 * 12 / 25);
  const H = I.ivMix([{ name: 'A', amt: 1000, parts: { us: 0.82, bonds: 0.18 } }], { target: 0.8, guide: I.ivGuide(30, 60) });
  assert.equal(H.aim.source, 'your own target'); near(H.drift, 0.02); assert.equal(H.drifted, false, 'within 5 points');
});

test('the three-fund check: inside the three, what sits outside, a broad fund as maybe', () => {
  const H = I.ivMix([{ name: 'A', amt: 1000, parts: { stocks: 0.7, bonds: 0.2, crypto: 0.1 } }]);
  near(H.inside, 0.9);
  assert.deepEqual(H.outside.map(o => o.k), ['crypto']);
  assert.equal(H.three.find(t => t.k === 'intl').maybe, true);
  assert.equal(H.three.find(t => t.k === 'bonds').held, true);
  assert.match(H.lines.join(' '), /90% sits in the three kinds a three-fund mix holds; crypto 10% sits outside them/);
  assert.doesNotMatch(H.lines.join(' '), /\b(should|bad|wrong|must)\b/i, 'a comparison, no verdict');
});

test('one company: employer stock across accounts, the biggest company, the 10% line', () => {
  const H = I.ivMix([
    { name: '401(k)', amt: 50000, parts: { us: 1 }, holdings: [{ name: 'ACME', v: 6000, kind: 'employer' }, { name: 'VTI', v: 44000, kind: 'fund' }] },
    { name: 'Brokerage', amt: 50000, parts: { single: 1 }, holdings: [{ name: 'acme', v: 6000, kind: 'stock' }, { name: 'ZZZ', v: 4000, kind: 'stock' }] },
  ]);
  near(H.conc.employerShare, 0.06);
  assert.equal(H.conc.biggest.name, 'ACME'); near(H.conc.biggest.share, 0.12, 1e-9); assert.equal(H.conc.biggest.employer, true);
  assert.equal(H.conc.over.length, 1, 'ACME counted once across accounts; a fund is not one company');
  assert.match(H.lines.join(' '), /Your employer's stock \(ACME\) is 12% of all your investments/);
  assert.equal(I.IV_RULES.oneStock, 0.1); assert.match(I.IV_SOURCES.oneStock, /FINRA.*Nov 26 2026/);
});

test('the fee X-ray: each fund in dollars, a fund with no fee named, a sales charge, account and advisor fees', () => {
  const F = I.ivFees([
    { name: 'IRA', amt: 20000, accountFee: 25, funds: [{ name: 'X', v: 10000, er: 0.005, load: 0.0575 }, { name: 'Y', v: 10000, er: null }] },
    { name: 'Brokerage', amt: 10000, funds: [{ name: 'VTI', v: 10000, er: 0.0003 }] },
  ], { advisor: 0.01 });
  near(F.year, 10000 * 0.005 + 25 + 20000 * 0.01 + 10000 * 0.0003 + 10000 * 0.01, 1e-9);
  assert.deepEqual(F.missing, ['Y (IRA)'], 'no made-up fee');
  near(F.loads[0].per1000, 57.5);
  near(F.avg, F.year / 30000);
  assert.match(F.lines.join(' '), /of each \$1,000 put in, \$58 goes to the charge/);
  assert.equal(I.ivFees([]).year, 0);
});

test('invest or pay debt: one square by hand, the grid, your own debts and return marked', () => {
  const c = I.ivHeatCell(0.24, 0.07);
  near(c.debt, 1000 * (Math.pow(1.02, 60) - 1)); near(c.invest, 1000 * (Math.pow(1.07, 5) - 1)); assert.equal(c.side, 'debt');
  assert.equal(I.ivHeatCell(0.03, 0.09).side, 'invest');
  const H = I.ivHeat({ debts: [{ name: 'Card', apr: 0.2299 }, { name: 'Car', apr: 0.05 }], ret: 0.06 });
  assert.ok(H.rates.includes(0.2299)); assert.ok(H.returns.includes(0.06));
  assert.equal(H.grid.find(g => g.apr === 0.2299).mine, true);
  assert.equal(H.grid.find(g => g.apr === 0.05).mine, true, 'a debt rate already on the axis is marked');
  assert.equal(H.yours.length, 2);
  assert.match(H.lines[0], /Paying the debt comes out ahead by .* and the saving on the debt is sure/);
  assert.ok(H.max >= Math.abs(H.grid[0].cells[0].gap));
  assert.equal(I.ivHeat().yours.length, 0, 'no return: no lines, the grid still shows');
});

test('Roth or traditional, by account: the kind of each account, the launch window\'s rule, empty is not zero', () => {
  assert.equal(I.ivTaxKind('401(k)').choice, 'plan'); assert.equal(I.ivTaxKind('Roth IRA').choice, 'ira'); assert.equal(I.ivTaxKind('HSA').choice, null);
  assert.equal(I.ivTaxKind('Brokerage').kind, 'taxable'); assert.equal(I.ivTaxKind('Other', 'Roth').kind, 'roth'); assert.equal(I.ivTaxKind('Rollover IRA').choice, null);
  const now = { fed: 0.22, state: 0.0585, local: 0.03876 }, later = { fed: 0.12, state: 0.055, local: 0 };
  const R = I.ivRoth([{ name: 'Work', type: '401(k)', yearly: 6000, now }, { name: 'Taxable', type: 'Brokerage', now }, { name: 'IRA', type: 'Roth IRA', yearly: null, now: null }], { later });
  const w = R.rows[0];
  near(w.nowRate, 0.22 + 0.0585 + 0.03876); near(w.laterRate, 0.175);
  near(w.M.monthly, crRothTrad({ yearly: 6000, nowPct: w.nowRate * 100, laterPct: w.laterRate * 100 }).monthly);
  near(w.yearGap, 6000 * (w.nowRate - w.laterRate), 1e-6); assert.equal(w.M.lead, 'trad');
  assert.equal(R.rows[1].ready, false); assert.equal(R.rows[1].choice, null);
  assert.deepEqual(R.rows[2].needs, ['your rate now']);
  const low = I.ivRoth([{ name: 'IRA', type: 'Traditional IRA', now: { fed: 0.1, state: 0, local: 0 } }], { later: { fed: 0.22, state: 0.04 } }).rows[0];
  assert.equal(low.M.lead, 'roth'); assert.equal(low.per, 1000); assert.match(low.line, /Roth keeps \$160 a year more on \$1,000 put in/);
  assert.equal(I.ivRoth([{ name: 'A', type: '401(k)', now }]).ready, false, 'no estimate for later: nothing made up');
});

test('the tax engine names the city part of the marginal rate (NYC)', () => {
  const hh = householdTax([{ id: 'j', person: 'Me', gross: 90000, pretax: 0, taxType: 'W-2' }], { filingStatus: 'Single', place: { state: 'NY', nyc: true } }, ref);
  const t = householdRates(hh, ref);
  assert.ok(t.localMarginal > 0); assert.ok(t.stateMarginal > t.localMarginal, 'stateMarginal still holds state and city');
  const up = householdRates(householdTax([{ id: 'j', person: 'Me', gross: 90000, pretax: 0, taxType: 'W-2' }], { filingStatus: 'Single', place: { state: 'NY', nyc: false } }, ref), ref);
  near(t.stateMarginal - t.localMarginal, up.stateMarginal);
});

test('the game\'s copy is current, and the page is on the layout check and the hub', () => {
  execFileSync(process.execPath, [new URL('tools/game_invest_build.mjs', root).pathname, '--check']);
  assert.match(read('tools/e2e/layout.cjs'), /'invest'/);
  assert.match(read('js/solo/hub.js'), /invest\.html/);
  assert.match(read('game/index.html'), /core\/invest\.js[^]*features\/invest\.js/);
});
