// SPDX-License-Identifier: AGPL-3.0-only
// Comparing with peers (run Finish everything partly built, Part 9; M8N): each function of js/math/peers.js checked by
// hand on made-up numbers and the dated rows of data/priors-2026.json, the game's copy current, Quest mode's rank on
// the same function, and the private page on the layout check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as P from '../js/math/peers.js';
import { qsRank } from '../js/math/quest.js';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const PRI = JSON.parse(read('data/priors-2026.json'));
const M = v => `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;

test('the row for an age: the band where the table has one, else everyone; empty is not zero', () => {
  assert.equal(P.peRow(PRI.rows, 'netWorth', 30).row.median, 33000);
  assert.equal(P.peRow(PRI.rows, 'netWorth', 30).byAge, true);
  assert.equal(P.peRow(PRI.rows, 'netWorth', null).row.median, 215900, 'no age: all households');
  assert.equal(P.peRow(PRI.rows, 'cover400', 70).row.share, 0.78);
  assert.equal(P.peRow(PRI.rows, 'nothing', 30), null);
  assert.equal(P.peWhere(100, 0), null); assert.equal(P.peWhere(null, 100), null);
  assert.equal(P.peWhere(95, 100), 'near'); assert.equal(P.peWhere(89, 100), 'below'); assert.equal(P.peWhere(111, 100), 'above');
});

test('net worth at your age: the SCF middle, the quarter of all households, the math', () => {
  const N = P.peNetWorth({ nw: 23500, age: 30, rows: PRI.rows }, M);
  assert.equal(N.ready, true); assert.equal(N.median, 33000); assert.equal(N.where, 'below'); assert.equal(N.quarter, 1);
  assert.equal(N.line, 'The middle of households under 35 has $33,000 of net worth. Yours is $23,500: below the middle.');
  assert.match(N.math[0], /average \$135,400/);
  assert.equal(P.peNetWorth({ nw: 3000000, age: 50, rows: PRI.rows }).top10, true);
  assert.equal(P.peNetWorth({ nw: 300000, age: 50, rows: PRI.rows }).quarter, 3);
  assert.equal(P.peNetWorth({ nw: -5000, age: 80, rows: PRI.rows }).where, 'below');
  const E = P.peNetWorth({ age: 30, rows: PRI.rows });
  assert.equal(E.ready, false); assert.deepEqual(E.needs, ['your net worth'], 'empty is not zero');
  assert.deepEqual(P.peNetWorth({ nw: 0, rows: PRI.rows }).needs, ['your age']);
});

test('Quest mode\'s rank is the same function (merged, not copied)', () => {
  for (const [nw, age] of [[23500, 30], [160000, 40], [900000, 50], [-2000, 70]]) {
    const R = qsRank({ guess: 'near', nw, age, rows: PRI.rows }, M), N = P.peNetWorth({ nw, age, rows: PRI.rows }, M);
    assert.equal(R.where, N.where); assert.equal(R.median, N.median); assert.equal(R.quarter, N.quarter); assert.equal(R.line, N.line);
  }
  assert.match(read('js/math/quest.js'), /peNetWorth\(/);
});

test('savings rate: yours next to the country\'s dated rate, by age not yet', () => {
  const S = P.peSaving({ rate: 0.2, data: PRI });
  assert.equal(S.ready, true); assert.equal(S.country, 0.038); assert.equal(S.period, 'September 2026');
  assert.equal(S.line, 'You keep 20% of what comes in. Across the country, people kept 3.8% of their income after taxes in September 2026.');
  assert.match(S.source.line, /Bureau of Economic Analysis.*released 2026-10-29/);
  assert.match(S.notYet, /not yet/);
  assert.match(P.peSaving({ rate: -0.1, data: PRI }).line, /more goes out than comes in/);
  assert.equal(P.peSaving({ data: PRI }).ready, false);
  assert.equal(P.peSaving({ rate: 0.2, data: { rows: [] } }).ready, false, 'no row: nothing made up');
});

test('household pay: next to the Census middle, by age not yet', () => {
  const I = P.peIncome({ gross: 100000, data: PRI }, M);
  assert.equal(I.middle, 87460); assert.equal(I.where, 'above');
  assert.equal(I.line, 'The middle household in the U.S. had $87,460 a year before taxes in 2025. Yours is $100,000: above the middle.');
  assert.equal(P.peIncome({ gross: 90000, data: PRI }).where, 'near');
  const E = P.peIncome({ data: PRI });
  assert.equal(E.ready, false); assert.equal(E.middle, 87460);
  assert.match(E.notYet, /not yet/);
});

test('people like you: shares at your age where the table has them, each with its source, no verdict', () => {
  const L = P.pePatterns({ age: 30, data: PRI }, M);
  const by = Object.fromEntries(L.map(x => [x.id, x]));
  assert.equal(by.cover400.text, 'About 57% of 30 to 44 year olds would cover a $400 surprise with cash or its equal.');
  assert.equal(by.cover400.byAge, true);
  assert.match(by.average.text, /about 4\.1 times the middle \(\$33,000\)/);
  assert.equal(by.retirement.text, 'About 55% of households have a retirement account. Among them, the middle holds $106,000.');
  assert.equal(by.card.byAge, false);
  for (const x of L) { assert.ok(x.source.name && x.source.year, x.id); assert.doesNotMatch(x.text, /should|behind|bad|good|—/i); }
  assert.ok(!P.pePatterns({ data: PRI }, M).some(x => x.id === 'average'), 'no age: no age line');
});

test('the next milestone: the journey\'s stage you are at', () => {
  const J = { here: 2, unknown: [], stages: [{ id: 'dig', name: 'Digging out', what: 'x', done: true }, { id: 'k1', name: 'First $1k', what: 'x', done: true },
    { id: 'debt', name: 'Debt free', what: 'No card or other costly debt left', measure: 'debt', left: 1500, months: 2, est: false, pct: null, done: false }] };
  const N = P.peNext(J, M);
  assert.equal(N.line, 'Next: Debt free (no card or other costly debt left). $1,500 of costly debt to go, about 2 months on your plan.');
  assert.deepEqual(N.done, ['Digging out', 'First $1k']);
  assert.equal(P.peNext({ here: 3, stages: J.stages }).past, true);
  assert.equal(P.peNext({ here: null, stages: J.stages, unknown: ['FI'] }).ready, false);
});

test('the game\'s copy is current, and the page is private and on the layout check', () => {
  execFileSync(process.execPath, [new URL('../tools/game_peers_build.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
  execFileSync(process.execPath, [new URL('../tools/game_quest_build.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
  const page = read('peers.html'), js = read('js/solo/peers.js');
  assert.match(page, /js\/solo\/peers\.js/);
  assert.match(js, /boot\('peers', draw, \{ private: true \}\)/);
  assert.match(js, /keepCard\(api\)/);
  assert.match(read('tools/e2e/layout.cjs'), /'peers'/);
  assert.match(read('js/solo/hub.js'), /peers\.html/);
  const idx = read('game/index.html');
  assert.ok(idx.indexOf('core/peers.js') < idx.indexOf('core/quest.js'), 'the game loads the rank before Quest mode');
});
