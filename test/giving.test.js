// SPDX-License-Identifier: AGPL-3.0-only
// Giving (run Finish everything partly built, Part 16; M8V): each function of js/math/giving.js checked by hand on
// made-up numbers and the 2026 federal rows of data/reference-2026.json, the maaser of the community presets and the
// FOO's giving step on the same functions, the game's copy current, and the page on the layout check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as G from '../js/math/giving.js';
import { maaserOf } from '../js/community.js';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const T = { std: ref.tax.standardDeduction, brackets: ref.tax.brackets, charity: ref.tax.charity };

test('the base is your own tap, and empty is not zero', () => {
  assert.deepEqual(G.gvBase({ base: 'gross', gross: 6000 }), { ready: true, base: 'gross', value: 6000, needs: [] });
  assert.equal(G.gvBase({ base: 'net', takeHome: 4000 }).value, 4000);
  assert.equal(G.gvBase({ base: 'after', takeHome: 4000, costs: 1000 }).value, 3000);
  assert.deepEqual(G.gvBase({ base: 'after', takeHome: 4000 }).needs, ['work costs a month']);
  assert.equal(G.gvBase({ base: 'after', takeHome: 4000, costs: 0 }).value, 4000, 'a typed $0 of costs is an answer');
  assert.deepEqual(G.gvBase({ base: 'gross', takeHome: 4000 }).needs, ['gross pay']);
});

test('the giving rate and the target a share comes to', () => {
  assert.equal(G.gvRate({ given: 300, base: 'net', takeHome: 4000 }).rate, 0.075);
  assert.equal(G.gvRate({ given: 300, base: 'after', takeHome: 4000, costs: 1000 }).rate, 0.1);
  assert.deepEqual(G.gvRate({ given: null, base: 'net', takeHome: 4000 }).needs, ['what you give a month']);
  assert.equal(G.gvRate({ given: 0, base: 'net', takeHome: 4000 }).rate, 0, 'giving $0 is an answer');
  const t = G.gvTarget({ base: 'gross', gross: 6000, given: 300 });
  assert.equal(t.share, 0.1, 'maaser: 10% until a share is tapped'); assert.equal(t.value, 600); assert.equal(t.gap, 300); assert.equal(t.own, false);
  assert.equal(G.gvTarget({ base: 'net', takeHome: 4000, pct: 0.2 }).value, 800);
  assert.equal(G.gvTarget({ base: 'net' }).ready, false);
});

test('the community maaser and the FOO giving step use the same functions', () => {
  const m = maaserOf({ basis: 'Gross', grossAnnual: 72000 });
  assert.equal(m.value, 600); assert.equal(m.text, '10% of gross pay a month');
  assert.equal(maaserOf({ basis: 'Take-home', takeHome: 4000, pct: 0.05 }).value, 200);
  assert.equal(maaserOf({ basis: 'Gross' }).needs, 'gross pay');
  for (const s of ['Giving', 'Maaser', 'Tzedakah', 'Charity', 'Donations', 'Tithe', 'Zakat']) assert.ok(G.gvIsGiving(s), s);
  assert.ok(!G.gvIsGiving('Groceries'));
  assert.match(read('js/math/foo.js'), /gvIsGiving\(/);
});

test('one gift: hours at your wage, the days passed in, what it would have grown to', () => {
  const g = G.gvGift({ amount: 1000, wage: 25, days: 11.6, realReturn: 0.05, years: 10 });
  assert.equal(g.hours, 40); assert.equal(g.days, 12); assert.equal(Math.round(g.grown * 100) / 100, 1628.89);
  const m = G.gvGift({ amount: 100, monthly: true, wage: 20, realReturn: 0, years: 1 });
  assert.equal(m.grown, 1200); assert.equal(m.hoursYear, 60); assert.equal(m.year, 1200);
  assert.equal(G.gvGift({ amount: 100 }).hours, null, 'no wage, no hours');
  assert.equal(G.gvGift({}).ready, false);
});

test('bunching: two years of giving in one, on the 2026 rules (worked by hand)', () => {
  // single, $100,000 of income, $8,000 of other deductions, $6,000 a year to charity in cash
  const B = G.gvBunch({ give: 6000, agi: 100000, other: 8000, filing: 'single', years: 2, cash: true }, T);
  assert.equal(B.ready, true);
  assert.equal(B.every[0].way, 'standard'); assert.equal(B.every[0].deduction, 17100, '$16,100 + the $1,000 for people who do not itemize');
  assert.equal(B.bunched[0].way, 'itemize'); assert.equal(B.bunched[0].deduction, 19500, '$8,000 + $12,000 less the floor of $500');
  assert.equal(B.bunched[1].deduction, 16100);
  assert.equal(Math.round(B.taxEvery), 25900); assert.equal(Math.round(B.taxBunched), 25592); assert.equal(Math.round(B.saved), 308);
  assert.equal(B.better, 'bunch'); assert.equal(Math.round(B.savedEachYear), 220); assert.equal(B.floor, 500);
  const D = G.gvBunch({ give: 6000, agi: 100000, other: 8000, filing: 'single', years: 2, cash: false }, T);
  assert.equal(D.every[0].deduction, 16100, 'a donor-advised fund: no deduction without itemizing');
  assert.deepEqual(G.gvBunch({ give: 6000, agi: 100000 }, T).needs, ['other deductions a year']);
  assert.equal(G.gvBunch({ give: 6000, agi: 100000, other: 0, years: 3 }, T).bunched.length, 3);
});

test('envelopes inside one account: fill, then empty as you use it', () => {
  const E = G.gvEnvelopes({ balance: 1000, list: [{ id: 'a', name: 'Maaser', put: 300, used: 100 }, { id: 'b', name: 'Fun money', put: 200, used: 250 }, { id: 'c', name: 'A trip', put: null }] });
  assert.equal(E.rows[0].left, 200); assert.equal(Math.round(E.rows[0].full * 1000), 667);
  assert.equal(E.rows[1].full, 0); assert.equal(E.rows[1].past, 50); assert.equal(E.rows[1].empty, true);
  assert.equal(E.rows[2].open, true);
  assert.equal(E.held, 200); assert.equal(E.free, 800); assert.equal(E.more, 0);
  assert.equal(G.gvEnvelopes({ balance: 100, list: [{ id: 'a', name: 'x', put: 300 }] }).more, 200);
  assert.equal(G.gvEnvelopes({ list: [{ id: 'a', name: 'x', put: 30 }] }).free, null);
});

test('maaser credit: giving ahead counts toward later months, by your own rule', () => {
  const months = [{ m: '2026-08', owed: 100, given: 150 }, { m: '2026-09', owed: 100, given: null }, { m: '2026-10', owed: 100, given: 0 }, { m: '2026-11', owed: 100, given: 200 }, { m: '2026-12', owed: null, given: 50 }];
  const A = G.gvCredit({ months, ahead: true });
  assert.deepEqual(A.rows.map(r => r.after), [50, -50, -150, -50]);
  assert.equal(A.rows[1].fromCredit, 50); assert.equal(A.rows[1].logged, false);
  assert.equal(A.toGive, 50); assert.equal(A.credit, 0);
  const B = G.gvCredit({ months, ahead: false });
  assert.deepEqual(B.rows.map(r => r.after), [0, -100, -200, -100]);
  assert.equal(G.gvCredit({ months: [{ m: '2026-11', owed: 100, given: 400 }] }).credit, 300);
});

test('the game\'s copy is current, and the page is on the hub and the layout check', () => {
  execFileSync(process.execPath, [new URL('../tools/game_giving_build.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
  assert.match(read('giving.html'), /js\/solo\/giving\.js/);
  assert.match(read('tools/e2e/layout.cjs'), /'giving'/);
  assert.match(read('js/solo/hub.js'), /giving\.html/);
  assert.match(read('.prettierignore'), /game\/core\/giving\.js/);
});
